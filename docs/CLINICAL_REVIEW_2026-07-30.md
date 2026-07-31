# Entopic — Review as Clinical Software
**Date:** 30 July 2026
**Frame:** this is a medical record and decision-support system. UI aesthetics ignored entirely.
**Method:** 14 clinical vignettes run through the real engine, plus determinism and negative-control testing. Every claim below is from an observed run.

---

## Simulation results — what the engine actually did

| # | Vignette | Red flag | Differential | Verdict |
|---|---|---|---|---|
| C1 | 52F, severe pain, halos, **IOP 52**, VH 1 | ✅ urgent (IOP >40) + gonioscopy warning | **Acute Angle Closure Crisis 0.94** | Correct |
| C2 | 61M, flashes + floaters + curtain | ✅ 2 urgent (tear/detachment, curtain) | PVD 0.81, **Retinal Tear 0.78** | Correct |
| C3 | 74F, sudden vision loss, **RAPD OD 2+**, swollen disc | ✅ 2 urgent | CRAO 0.78, **GCA (Arteritic AION) 0.78** | Correct |
| C4 | 34F, screens, worse evening, TBUT 4 | quiet (correct) | **Dry Eye Evaporative 0.84** | Correct |
| C5 | 28M CL wearer, **hypopyon** | ✅ urgent referral | **Hypopyon Uveitis 0.84**, Microbial Keratitis 0.75 | Correct |
| C6 | 58M, IOP 28, **C:D 0.75**, asymptomatic | warn (workup indicated) | **Glaucoma Suspect / OHT 0.67** | Correct |
| C7 | **Empty visit** | none | **none** | Correct — refuses to guess |
| C8 | **Age 78 only, no findings** | none | **none** | Correct — no diagnosis from demographics |
| C9 | 3y, **leukocoria** | ✅ urgent (retinoblastoma) | Congenital Cataract 0.68, Coats 0.60, **Retinoblastoma 0.60** | Correct |
| C10 | 29F, **bilateral disc oedema** | ✅ urgent (raised ICP) | **Papilledema 0.68, IIH 0.68** | Correct |
| C11 | 66M, **rubeosis iridis** | ✅ urgent (NVG risk) | **Neovascular Glaucoma 0.68** | Correct |

**Determinism: 25 identical runs → 1 identical differential**, to 6 decimal places. This is the product's central claim and it holds.

**Negative controls pass** — the two that matter most clinically:
- Zero findings → **zero output**. No speculative differential.
- Age + sex alone → **zero output**. The engine will not diagnose from demographics.

> **A note on my own testing.** My first simulation run reported three red flags "missing" (hypopyon, leukocoria, disc oedema). That was **my test error** — I wrote findings to `V.sl.od.findings` when the engine reads `V.sl.findings`. Re-run correctly, all three fire. I am recording this because a reviewer who had not checked would have filed three false patient-safety defects, and because the mistake itself exposed a genuine finding (CL-2 below).

---

# Findings

## CL-1 — A differential had no provenance ✅ FIXED

**Current implementation (before).** A visit stored `dxList` — the ranked conditions — but nothing about *what produced it*.

**Why this matters clinically.** The knowledge base is *designed* to be updated and re-published; that pipeline exists. So a record reviewed six months later shows a list of conditions that today's engine may rank differently, with **no way to reconstruct what the clinician was actually shown**. That defeats the "glass box" defensibility the product is built on, and it defeats retrospective audit of a decision — the exact circumstance in which a record is scrutinised.

**Fixed.** Every engine run now stamps the visit with the KB version, condition count, timestamp, token count, urgent-alert count, and the **top 5 exactly as presented** — including each ICD code *and whether it was clinician-verified at the time*:

```json
{ "kb_version": "1.1.0", "kb_conditions": 394, "token_count": 8, "urgent_alerts": 1,
  "shown_top": [{ "name": "Acute Angle Closure Crisis", "prob": 0.864,
                  "icd": "H40.219", "icd_status": "NEEDS_CLINICAL_REVIEW", "urgent": true }] }
```

**Deterministic behaviour preserved — this is a recording change, not a clinical one.** A test asserts that identical input still yields identical scores, ranks and alerts with the stamp in place. 6 new tests.

> A bug in my own first version: I wrote `d.name`/`d.score` when `dxList` uses `n`/`prob`, so the record captured `undefined`. The test caught it.

## CL-2 — Findings are recorded without laterality ⚠️ HIGH — recommended, not rushed

**Current implementation.** Structured fields are per-eye (`V.sl.od.cornea`, `V.fun.od.cd`). But the *finding lists* are visit-level bare labels: `V.sl.findings.push("Hypopyon")` — **no eye**.

**Why this matters.** Ophthalmology is a bilateral speciality where laterality is the difference between two clinical pictures. A record saying "Hypopyon" without OD/OS is **incomplete as a medical record**: it weakens the referral letter, it prevents follow-up comparison ("has the OD hypopyon resolved?"), and it is precisely the kind of ambiguity that damages a record's standing if it is ever examined.

**Engine safety is not affected** — the red flag fires either way, which is the correct conservative behaviour. This is a *record integrity* defect, not a *safety* one.

**Recommended architecture.** Move findings to `{label, eye}` objects:
```js
V.sl.findings = [{ label: "Hypopyon", eye: "OD" }]
```
**Migration:** accept both shapes on read (a bare string = legacy, laterality unknown); write the new shape only. `FINDING_TOKEN_MAP` lookups take `f.label || f`. Existing records keep working and are never rewritten — a record must not gain laterality it never had.
**Risk:** medium — it touches token collection, so it needs the golden-vignette suite green before and after. **Do not bundle it with anything else.**

## CL-3 — A visit is never finalised; the record stays editable forever ⚠️ HIGH

**Current implementation.** There is no sign-off, no lock, no amendment concept. Any visit can be edited at any time, and the edit is indistinguishable from original documentation.

**Why this matters.** This is the single biggest gap in **legal defensibility**. A clinical record's value rests on being contemporaneous. Every real EMR has: *sign → immutable*; later changes become an **addendum** with its own author and timestamp. Without that, a record edited a year later looks exactly like one written at the time — which is bad for the clinician even when nothing improper happened, because they cannot *demonstrate* it didn't.

The audit trail records *that* a visit was updated, but the record itself carries no signed state and no before/after.

**Recommended architecture (preserving determinism).**
1. `V.signed = { by, at, kb_version }` set by an explicit **Sign** action.
2. After signing, the exam fields become read-only.
3. Editing a signed visit creates an **addendum**: `V.addenda[] = { by, at, reason, changes }` — the original stays intact.
4. The engine may still re-run on a signed visit, but its output is shown as *"recomputed today, not what was signed"* — never overwriting `engine_provenance`.

**Backward compatibility:** unsigned visits behave exactly as now; `signed` is simply absent. Nothing existing breaks.
**Risk:** medium, mostly workflow. **This needs your decision on when a visit is "done"** — that is a clinical-practice question, not an engineering one.

## CL-4 — No duplicate-patient detection ⚠️ MEDIUM (patient identity)

**Current implementation.** `doSetup`-style registration creates a patient with no check against existing records.

**Why this matters.** Two records for the same person is the classic EMR identity failure: half the history sits in each, and the clinician sees an incomplete picture while believing it complete. In a family practice, "Meera Nair, 52" may legitimately appear twice — or be one person entered twice.

**Recommendation.** On registration, search existing patients on (name + DOB) and (phone) and (MRN); show near-matches with *"Is this the same person?"*, defaulting to **creating a new record** — never auto-merging. Merge, if ever built, must be reversible and audited.
**Risk:** low. Purely additive, no engine impact.

## CL-5 — 257 of 394 conditions are still clinically unverified ⚠️ THE STANDING RISK

Unchanged from previous reviews, and it remains the **single largest clinical risk in the product**. The engine is deterministic and its reasoning is inspectable — but it is reasoning over content that has not been signed off, including **ICD-10 codes marked `NEEDS_CLINICAL_REVIEW` that now appear in the provenance record and can reach a referral or a claim**.

The Clinical Validation workspace exists for exactly this. It is the highest-value use of your time, ahead of any feature.

---

# Where clinician trust could be lost

Ranked by how quickly a working optometrist would stop trusting the tool:

1. **A red flag that does not fire.** Fastest possible loss of trust, and unrecoverable. Currently **all 7 fire correctly** across 11 vignettes — this is the thing to protect above all else. Every KB or engine change must re-run the vignette suite.
2. **A differential that changes between visits for the same findings.** Verified stable today (25/25 identical). But a KB update *will* change rankings — and until CL-1 the record couldn't show that. Now it can.
3. **A confidently-ranked condition built on unverified content (CL-5).** A clinician who spots one wrong ICD code will rationally distrust the other 393.
4. **A record that says "Hypopyon" without an eye (CL-2).** Reads as software that does not understand ophthalmology.
5. **Being unable to show what the record said at the time (CL-3).** Trust lost not day-to-day, but at the worst possible moment.
6. **Silent data loss.** Fixed earlier today (P-1) — a device past the storage ceiling now says so loudly instead of quietly dropping visits.

---

# Workflow weaknesses

| Weakness | Clinical consequence |
|---|---|
| **No "done" state for a visit** | A clinician cannot tell a finished record from an abandoned half-entered one — and neither can a colleague picking it up |
| **Findings not lateralised (CL-2)** | Referral letters and follow-up comparisons are ambiguous |
| **No duplicate check (CL-4)** | Split histories |
| **Advisory panel hidden ≤1000px** | On a tablet at the chair — the realistic position — decision support may be absent unless the drawer is opened |
| **No "reason for visit type"** | Routine screening and acute presentation get the same 22-step flow; an acute red-eye consult carries steps that are noise |

---

# What is clinically sound — protect these

1. **Zero evidence → zero output**, verified. The engine refuses to speculate. Rare and correct.
2. **No diagnosis from demographics alone**, verified.
3. **Red flags are un-suppressible** and fire from measured values as well as tokens (IOP >40 and RAPD fire from the *number*, not a chip).
4. **Determinism**, verified to 6 decimal places over 25 runs.
5. **Every ranking carries its evidence trail** — matched, contradicted, missing.
6. **The LLM never diagnoses.** Structurally firewalled; the diagnostic path never touches the network.
7. **Offline reliability**, verified repeatedly this session: the whole clinical path runs with no network.
8. **Advisory framing is preserved** throughout.

---

# Recommendations, in clinical priority order

1. **Verify the knowledge base (CL-5).** Yours to do; nothing I build substitutes for it.
2. **Visit sign-off + addenda (CL-3).** Needs your definition of "done" first.
3. **Laterality on findings (CL-2).** Contained, but re-run the vignettes.
4. **Duplicate-patient check (CL-4).** Cheap, purely additive.
5. **Make the vignette suite a release gate** — the 11 cases above should run in CI on every KB change, asserting red flags and expected top-8. That is what protects trust item #1 permanently.

**All of the above preserve deterministic clinical behaviour.** None adds probabilistic reasoning, none routes diagnosis through an LLM, none gates a red flag behind scoring.

---

## Verification
457 tests passing (was 451) · build audit 0 FAIL · all surfaces clean with encryption on and off · 11 clinical vignettes correct · determinism 25/25.

## Limits of this review
Vignettes are constructed by me from textbook presentations — they are not real de-identified cases, and real presentations are messier. The correct next step is a **retrospective audit against real records**: run 50 past cases through the engine and have you compare its differential to what was actually diagnosed. That is the only test that measures clinical usefulness rather than internal consistency, and I cannot run it — it needs your records and your judgement.
