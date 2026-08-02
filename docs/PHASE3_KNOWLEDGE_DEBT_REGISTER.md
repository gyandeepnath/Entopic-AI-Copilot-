# Entopic — Knowledge Debt Register

**Phase 3 · 2026-08-02 · v1.5.0, KB v1.3.1**

Standing register of debt in the clinical knowledge itself — not the code.
Each entry: what it is, how it was measured, what it costs, what closes it.

**K1** = blocks trustworthy clinical use · **K2** = limits research, teaching or
future AI · **K3** = hygiene.

---

## K1 — blocks trustworthy clinical use

### KD-01 · No evidence layer. At all.
**Measured.** 0 of 394 conditions carry `source`, `citation`, `reference`,
`evidence`, `guideline` or `grade`. The field set is fixed and contains none.
**Cost.** The knowledge base cannot answer "why does this rule exist?" for any
condition. It cannot be challenged, audited, defended to a regulator, or used
to ground an AI system. It also makes clinical sign-off harder than it needs to
be: a clinician verifying condition #200 has nothing to verify *against*.
**The template already exists in the repository.** `knowledge/clinical-scales.js`
carries `source` (citation + DOI/PMID) and `verbatim` (the exact source
sentence). One file of 21 does this properly.
**Closes with.** Add optional `evidence: [{claim, source, verbatim, grade}]` to
the schema; backfill the ~50 highest-impact conditions first. ~120 h plus
clinical time. **Top recommendation of Phase 3.**

### KD-02 · 394 of 394 conditions clinically unverified
**Measured.** `review_status` is `NEEDS_CLINICAL_REVIEW` on every condition.
**Cost.** Every differential rests on content no clinician has signed.
**Closes with.** ~20 hours of the founder's time at a sustainable ~20/hour. The
machinery is built, durable, and hash-bound. **⚠ FOUNDER — the single
highest-value input available anywhere in this project.**

### KD-03 · No severity or staging model
**Measured.** No `severity`, `stage` or `grade` field. 89 of 394 condition
names contain parentheses and 5 use a dash separator — sub-typing encoded in
strings ("Dry Eye Disease - Evaporative (MGD)").
**Cost.** "Cataract" cannot express NS2 versus NS4. Management differs
enormously; the knowledge base cannot represent the difference. Blocks any
grading scale (DR, AMD, dry eye, keratoconus) from being modelled properly.
**Closes with.** `severity: {scale, level, source}`, referencing a named,
cited scale. ~80 h. **⚠ Every scale needs a real citation — none may be
invented.**

---

## K2 — limits research, teaching and future AI

### KD-04 · No condition-to-condition relationships
No `is_a`, `variant_of`, `leads_to`, `differential_of` or `precedes`. Every
condition is an island. Blocks hierarchical differentials, complication
prediction, teaching pathways, and any graph representation. ~120 h.

### KD-05 · 144 of 394 conditions offer no discriminating test
**Measured.** `tests[]` empty on 144.
**Cost.** The "check next" refinement loop — the best clinical idea in the
product — is silent for 37% of the knowledge base.
**Closes with.** Clinical authoring, ~40 h of clinical time. **⚠ FOUNDER.**

### KD-06 · The exclusion mechanism is almost unused
**Measured.** 382 of 394 have no `exclusions`. The mechanism works; 12
conditions use it.
**Cost.** Unclear whether exclusion is rarely appropriate or 370 conditions are
missing it. **⚠ CLINICAL JUDGEMENT — this is a question, not yet a finding.**

### KD-07 · 56 ICD codes are shared across conditions
**Measured.** e.g. `H01.009` on three conditions, `H02.889` on two.
Legitimate ICD practice ("unspecified" codes), but it means **ICD cannot be
used as a condition identifier**. Any registry or research export keyed on ICD
will silently merge distinct conditions. ~20 h to introduce a stable internal
id and treat ICD as an attribute.

### KD-08 · No international terminology binding
No SNOMED CT, LOINC or UMLS mapping. ICD-10 is complete (394/394) but is a
billing classification, not a clinical ontology, and cannot carry the
relationships KD-04 needs. Blocks interoperability and multi-site research.
~200 h.

### KD-09 · No outcomes, so nothing can be calibrated
Nothing records what the condition turned out to be. `prob` therefore cannot be
calibrated — which is exactly why it is now labelled "match strength" rather
than a percentage. ~200 h and requires real data volume.

### KD-10 · No follow-up or recall interval in the knowledge
Recall is entered per visit as free text. The knowledge base knows a condition
is urgent but not that it needs review in 4 weeks. ~40 h. **⚠ Every interval
needs a source.**

### KD-11 · No contribution path for anyone but the founder
Only the founder's admin account can change content. A cornea specialist, a
university department, or a resident who spots an error has no route in.
Addressed in the Governance Manual. ~150 h.

### KD-12 · No impact preview on edit
A clinician editing `req` on a common condition cannot see that it would change
40 differentials. Nothing measures the blast radius of a knowledge change.
~40 h.

---

## K3 — hygiene

### KD-13 · 13 tokens break the naming convention, undocumented
**Measured.** 468 of 481 tokens are `lower_snake_case`. Thirteen preserve a
clinical abbreviation: `TBUT_reduced`, `RAPD_positive`, `CNVM`, `OCT_edema`,
`MLF_lesion_sign`, `NPC_receded`, `reduced_PFV`, `high_ACA_ratio`,
`RNFL_thinning`, `gonioscopy_NVA`, `stellate_KPs`, `B_scan_ultrasound`,
`CT_orbits_imaging`.
**Verdict: do not rename.** `RAPD` is not `rapd` to a clinician, and renaming
is a behaviour change for no clinical gain. **Write the convention down** so
the next author knows which form to use. ~4 h. Closed below.

### KD-14 · 94 registry entries used by no condition
Partly schema keys leaking into the count (`req`, `sup`, `type_hint`), partly
orphaned vocabulary. Harmless; inflates the apparent vocabulary by ~20%. ~8 h.

### KD-15 · Two conditions urgent-flagged but not urgent-routed
`Horner Syndrome` (route=neuro) and `Scleritis` (route=anterior) carry
`urgent: true`. 61 of 63 urgent conditions have both.
**Probably correct** — `route` is a clinical category, `urgent` a safety flag,
and they are orthogonal. But nothing says so. **⚠ FOUNDER: confirm they are
orthogonal, or these two are mis-routed.** ~2 h either way.

### KD-16 · Risk factors are conflated with clinical signs
Both live in `sup` and score identically. "Family history of glaucoma" and
"cupped disc" are not the same kind of evidence. ~30 h.

---

## Closed this phase

| ID | Was | Closed by |
|---|---|---|
| KD-13a | The token naming convention existed but was nowhere written | Documented in `knowledge/token-registry.js` header |

---

## What was checked and found CLEAN

Worth recording, because it is genuinely good and a future change could break it:

- **0 duplicate condition names** across 394
- **0 KB tokens missing from the registry** (575 entries)
- **0 conditions without a domain, an ICD code, or narrative text**
- **0 tokens with spaces or hyphens** — the vocabulary is machine-safe
- **No contradictory rules detected**
- **No unreachable conditions.** I initially measured 23 conditions as unable to
  fire, including Chemical Eye Burn and Open Globe Injury. **That was wrong** —
  my scan omitted `js/data-model.js`. Running the engine confirmed they fire
  correctly. Recorded here so nobody re-derives the false finding.

---

## Priority

| | Item | Effort | Gate |
|---|---|---|---|
| 1 | KD-02 verify the knowledge base | ~20 h clinical | ⚠ founder only |
| 2 | KD-01 evidence layer | ~120 h + clinical | — |
| 3 | KD-05 discriminating tests for 144 conditions | ~40 h clinical | ⚠ founder |
| 4 | KD-03 severity/staging | ~80 h | ⚠ cited scales |
| 5 | KD-15 confirm urgent/route orthogonality | ~2 h | ⚠ founder |
| 6 | KD-07 stable condition id | ~20 h | — |
| 7 | KD-04 relationships | ~120 h | — |
| 8 | KD-11 contribution workflow | ~150 h | — |

**Items 1, 3 and 5 together are about 62 hours, most of it the founder's own
clinical time, and they move the knowledge base further than the other 500
hours combined.**
