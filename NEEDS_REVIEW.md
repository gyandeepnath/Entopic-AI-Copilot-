# NEEDS_REVIEW — items awaiting the founder's decision

This is the running list of things the engineering work **deliberately did
not decide**, because they depend on clinical judgment, product direction, or
spend. Nothing here was silently guessed. Clear an item by confirming or
correcting it; then it can be removed.

Legend: 🟥 clinical-safety-adjacent · 🟧 clinical accuracy · 🟦 product/architecture

---

## Clinical content to verify

### 🟧 ICD-10 code mappings — ALL 130 conditions now coded
Every code in `knowledge/icd-map.js` was looked up and validated as a real,
billable ICD-10-CM 2026 code via the ICD-10 tool — but a *valid* code is not
necessarily the *right* code for the intended clinical entity, and defaults use
the **unspecified eye/stage** variant. Please confirm each mapping. The entries
marked `caution` in the file are the judgment calls that most need your eye:
- **Diabetic Retinopathy** → `E11.319` — **assumes type-2 DM and no macular
  edema.** Type-1 is `E10.319`; severity/ME change the code. This is the most
  important one to confirm.
- **CRVO / BRVO / CME / PVD** → these default to a specific eye ("right") or a
  stability/edema status because ICD requires it. Refine per patient.
- **Microbial Keratitis** → `H16.9` (unspecified keratitis) — organism-specific
  or corneal-ulcer code instead?
- **Compressive Optic Neuropathy** → `H47.099`; **Cortical Visual Impairment**
  → `H47.619` (cortical blindness); **Quadrantanopia** → `H53.459`;
  **Divergence Insufficiency/Excess**, **Accommodative Infacility**, **Fusional
  Vergence Dysfunction** — all mapped to non-specific buckets (no dedicated
  code exists).
- **Choroidal Melanoma** → `C69.30` (site code, not melanoma-specific).
- **Keratoglobus** and **Pellucid Marginal Degeneration** share `H18.719`
  (corneal ectasia).
- **HLA-B27 Uveitis / Traumatic Iritis** → generic iridocyclitis codes; the
  systemic association / external cause should be coded separately.

Laterality/stage capture in the UI is still a product decision (the coding
page currently shows a laterality dropdown but doesn't yet drive the code).

### 🟥 Leukocoria alert wording
`js/engine.js` now fires an urgent alert on the `leukocoria` token:
> "Leukocoria — URGENT referral: rule out retinoblastoma / congenital cataract"

Engineering added this phrasing. Please confirm the wording and the referral
urgency are what you want a clinician to see.

### 🟧 Unresolvable exclusion targets (2 remaining)
Two exclusion rules point at conditions that don't exist in the KB, so they
can never fire (flagged inline with `NEEDS_CLINICAL_REVIEW`):
- **Dry Eye (Evaporative/MGD)** excludes `acute_keratitis` — no such condition.
  Which keratitis (if any) should this suppress?
- **Preseptal Cellulitis** excludes `orbital_cellulitis` — no such condition,
  and the intent looks inverted (it would suppress the sight-threatening one).
  Recommendation: **add Orbital Cellulitis as an urgent condition** rather than
  excluding it. Your call.

---

## Scoring / methodology (affects diagnostic ranking — your call)

### 🟧 Sparse-definition score inflation
The engine normalizes each condition's score against *its own* maximum
possible score. A side effect: a condition with **fewer supportive tokens**
scores higher than a richer one on identical evidence, because its denominator
is smaller. Concrete, reproducible example — classic chronic dry-eye
presentation (`dryness, burning, worse_evening, grittiness`, TBUT 4/5s):

| Condition | Supportive tokens defined | Score |
|---|---|---|
| Exposure Keratopathy (Surface Related) | 3 | **0.67** |
| Dry Eye Disease – Aqueous Deficient | 4 | 0.64 |
| Dry Eye Disease – Evaporative (MGD) | 6 | 0.61 |

Exposure keratopathy leads a textbook dry-eye picture purely because its KB
entry is leaner. This is the "universal scoring constants" weakness
(ARCHITECTURE.md gap 5) showing through the **normalization method**, not the
weight values. It affects rankings across the whole KB.

**Why engineering did not just "fix" it:** any change to the scoring formula
reorders every differential — a clinical-output change — and the doc
sequences this as Phase 3 (per-domain weights, then likelihood-ratio scoring)
which needs your calibration data to do defensibly. Recommendation: tackle it
as part of that planned scoring rework, with the golden-vignette suite as the
regression guard. Flagging here so it's a decision, not a silent default.

---

## For later (architecture — needs a decision + possibly spend)

### 🟦 Backend / persistence provider (ARCHITECTURE.md Part II.C)
Moving off `localStorage` (5 MB ceiling) to IndexedDB (local) and a synced
backend (the doc recommends Supabase) is a provider + spend decision. Not
started — awaiting your go-ahead per the "check in before money/provider"
guardrail.

### 🟦 Offline-first: fonts load from a CDN
`index.html` pulls web fonts from Google Fonts. Cosmetic (system-font
fallback works), but it's a network dependency in an offline-first app.
Low-priority: self-host the fonts to make the app fully self-contained.
