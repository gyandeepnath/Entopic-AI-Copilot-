# Entopic — Clinical Software Review (second pass)
**Date:** 31 July 2026
**Frame:** medical record and decision-support system. UI aesthetics ignored.
**Method:** vignettes through the real engine, adversarial probing of the prescription and record paths, and direct inspection. Every claim reproduced.

---

## What changed since the first pass, and what it cost to find

| Ref | Finding | Severity | State |
|---|---|---|---|
| **RX-1** | **Prescription printed "plano" for refraction never measured** | **CRITICAL** | ✅ Fixed |
| RX-3 | Printed date was the render date, not the exam date | High | ✅ Fixed |
| CL-2 | Findings recorded with no eye (OD/OS) | High | ✅ Fixed |
| CL-3 | No attribution / amendment trail | High | ✅ Fixed |
| CL-4 | No duplicate-patient detection | Medium | ✅ Fixed |
| CL-6 | Patient deletion behind one OK button | Medium | ✅ Fixed |
| CL-1 | Differential had no provenance | High | ✅ Fixed (prev. pass) |
| **CL-5** | **257 of 394 conditions clinically unverified** | **Standing** | ⚠️ Yours |

**491 tests passing · build audit 0 FAIL · all surfaces clean · determinism 25/25.**

---

# 1. The critical finding: the prescription fabricated a clinical value

**This is the most dangerous defect found in any review of this codebase.**

`pgRxP()` rendered every empty refraction field as `V.rx.od_sph || "plano"`. So an exam where refraction was **never performed** produced a print-ready, patient-named, signature-blocked **SPECTACLE PRESCRIPTION** reading *plano* for both eyes.

**Why that is not a cosmetic bug.** "Plano" is not a blank — it is a positive clinical assertion meaning *no refractive correction needed*. A dispensing optician acts on it by grinding zero-power lenses. Missing data was therefore being rendered as a **clinical instruction on a legal document**. A patient needing -3.00 receives useless glasses, and the record shows a prescription that was never clinically made.

Worse in the realistic case — an interrupted exam with OD measured and OS not — the unmeasured eye printed *plano* **beside a real value**, which reads as more authoritative, not less.

This directly breached the standing guardrail: **never fabricate clinical content**. Absence was rendered as a finding.

**Fixed:**
- an empty field prints **"not recorded"** in red — never plano
- a **genuine** plano (`0`, `0.00`, `plano`, `pl`) still prints plano, because a real zero-power Rx is valid
- a visit with **no refraction at all** produces **no prescription document**, explains why, and offers the Refraction step
- an eye missing a sphere — or carrying a cylinder without an axis — is flagged as **not dispensable as written**

Verified across four scenarios. 7 tests.

> **Method note.** My first verification probe reported the fix had failed (`osPrintsPlano: true`). It had not — the probe was matching the word "plano" inside the *new warning text*. I checked the actual table cells before reporting: OS reads "not recorded", and no cell says plano. A reviewer who trusted the first signal would have wrongly reported the fix broken.

---

# 2. Laterality — assessed before it was changed

**Assessment first**, because this touches token collection and token collection is clinical safety:

- **202** findings a clinician can click
- **85 (42%)** are inherently one-eye (cornea, iris, disc, macula, lid, hypopyon…)
- **1** label encoded laterality (`Disc edema — bilateral`)

So **84 findings could be recorded with no eye at all**.

**Fixed** as `{label, eye}`. The chip cycles **OD → OS → both → off**, one tap per state — so a finding *cannot* be recorded without an eye. Laterality can never be forgotten separately from the finding.

**Migration safety — existing records are never rewritten:**
- a bare string is still accepted and reads as *laterality not recorded*
- it prints exactly as recorded, with **no invented eye**
- a legacy chip shows **"eye?"** rather than silently assuming one
- tapping a legacy finding **starts the cycle** rather than deleting it

**Engine behaviour is unchanged.** The token comes from the label in either shape — the eye is for the note, not the engine. Verified directly that the new shape, legacy strings, and a **part-migrated mixed record** all yield identical red flags and identical scores.

---

# 3. Record integrity — your model, implemented

Attribution + amendment trail, as you described it:

- every save records the clinician and timestamp; a visit is attributed at **creation**, so an abandoned visit is not authorless
- **40 saves in one sitting = 1 entry** — one consultation, one entry
- a save on a **later day**, or by **another clinician**, becomes an **amendment**; the original author is never overwritten
- the continuous record **declares amendments in a banner**, so a later edit can never read as contemporaneous

**Honest limit, stated in the module:** this gives attribution and chronology, **not cryptographic immutability**. It shows *that* a record was amended and by whom; it does not prove earlier text was never altered. That needs the append-only server log or per-save hashing.

**Duplicate detection** is deterministic, explained, and **never merges** — it always defaults to creating the new record, because a wrongly-merged pair of patients cannot be safely undone. Order- and punctuation-insensitive on names, format-insensitive on phones; a shared family phone reports *"family member?"* rather than a duplicate.

**Deletion** now downloads a snapshot **first** (aborting if that fails) and requires the patient's name typed. *"Are you sure?"* is answered reflexively; typing a name is not.

---

# 4. Where clinician trust could still be lost

Ranked by speed of loss:

1. **A red flag that does not fire.** All 7 fire across 11 vignettes. Protect this above everything — every KB or engine change must re-run the vignettes.
2. **A confidently-ranked condition built on unverified content (CL-5).** *This is now the largest remaining clinical risk.* A clinician who finds one wrong ICD code will rationally distrust the other 393.
3. **A prescription that misstates what was measured.** Was live until today. Now structurally prevented.
4. **A record that cannot show what was said at the time.** Closed by provenance + amendment trail.
5. **Silent data loss.** Closed — a device past the storage ceiling says so loudly.

---

# 5. Workflow weaknesses that remain

| Weakness | Consequence |
|---|---|
| **Lens specifications are not saved** (RX-2) | The lens type / material / coating dropdowns are unbound: selecting *Polycarbonate* for a child records **nothing** and prints nothing. Recommended: bind to `V.rx.lens_*` and print them, or remove the controls — a control that silently discards a clinical choice is worse than no control. |
| **"Valid for 12 months" is hard-coded** | Not always right (children, post-op, keratoconus). Should be clinician-set. |
| **No visit-type triage** | An acute red-eye consult walks the same 22 steps as a routine screen. |
| Advisory panel hidden ≤1000px | On a tablet at the chair, decision support may be absent unless the drawer is opened. |

---

# 6. What is clinically sound — protect these

1. **Zero evidence → zero output.** Verified. Refuses to speculate.
2. **No diagnosis from demographics alone.** Verified.
3. **Red flags fire from measured values as well as tokens** (IOP >40 and RAPD fire from the *number*).
4. **Determinism** — 25 identical runs, 1 identical differential, to 6 decimals.
5. **Every ranking carries its evidence trail** (matched / contradicted / missing).
6. **The LLM never diagnoses.** Structurally firewalled.
7. **Offline reliability** — the whole clinical path runs with no network.
8. **Provenance** — each differential records the KB that produced it, with ICD verification status *as it was at the time*.

---

# 7. Recommendations, in clinical priority order

1. **Verify the knowledge base (CL-5).** Yours; nothing I build substitutes for it. It is now the top clinical risk.
2. **Fix or remove the lens-specification dropdowns (RX-2).** Small, and it currently discards a clinical decision.
3. **Make the 11 vignettes a CI release gate** — assert red flags and expected top-8 on every KB change. This is what permanently protects trust item #1.
4. **Retrospective audit against real records** — 50 past cases through the engine, your differential vs its. The only test that measures clinical usefulness rather than internal consistency, and it needs your records.

All preserve deterministic clinical behaviour: no probabilistic reasoning, no LLM in the diagnostic path, no red flag gated behind scoring.

---

## Limits of this review
Vignettes are textbook constructions, not real de-identified cases. I wrote the code I am reviewing — I have now found serious defects in my own recent work three times, which suggests a fourth pass would find more. For clinical deployment at scale, get an independent review.
