# Entopic — Clinical Workflow Improvement Roadmap

**Phase 2 · 2026-08-01 · the ranked Top 200**

Ordered by clinical value per hour. **h** = estimated engineering hours.
**⚠** = needs the founder's clinical judgement before it can be built.
Items 1–40 are where almost all the value is.

---

## Tier 1 — Before he uses it on his own patients (1–12)

| # | Improvement | h |
|---|---|---|
| 1 | ⚠ **Clinician signs the knowledge base** — 394 conditions, ~20 h of *his* time | 0 |
| 2 | ⚠ Resolve CS-01 — templates writing unmeasured VA/IOP/CD figures | 8 |
| 3 | Explicit **"not assessed"** tri-state per section | 30 |
| 4 | Show ties in the differential as ties, not a ranking | 16 |
| 5 | ⚠ Relabel `prob` — "match strength", not a percentage | 4 |
| 6 | Separate **engine suggestion** from **clinician's diagnosis** in the record | 40 |
| 7 | ⚠ Confirm the medication negation cue lists | 4 |
| 8 | Structured **allergy** list, distinct from medications | 16 |
| 9 | State plainly in the UI that no drug–drug interaction checking exists | 2 |
| 10 | Require laterality on every finding that has an eye | 12 |
| 11 | Red-flag rules as reviewable **data**, not engine code | 40 |
| 12 | Print "advisory — clinical correlation required" on every exported report | 4 |

## Tier 2 — The daily-workflow wins (13–40)

| # | Improvement | h |
|---|---|---|
| 13 | **Carry forward** history/meds/habitual Rx, marked as carried, needing confirmation | 40 |
| 14 | Previous-Rx prefill on refraction | 12 |
| 15 | **IOP trend chart** across visits | 16 |
| 16 | **Visual-field progression** view | 30 |
| 17 | ⚠ **Target IOP** field + variance alert | 12 |
| 18 | Disc photo / C:D comparison across visits | 24 |
| 19 | ⚠ Normal templates for the remaining 24 steps | 24 |
| 20 | "Same as last visit" per section | 20 |
| 21 | Keyboard-first entry path + tab discipline | 40 |
| 22 | Chip prioritisation by frequency / presentation | 16 |
| 23 | Field-level undo | 24 |
| 24 | Always-visible engine summary strip on tablet | 20 |
| 25 | Presentation-driven completeness prompts ("red eye → fluorescein?") | 30 |
| 26 | Contradiction detection across the record | 30 |
| 27 | Visit-duration analytics per step | 12 |
| 28 | "Last saved at HH:MM" indicator | 4 |
| 29 | Patient-facing visit summary / education leaflet | 24 |
| 30 | Referral letter generator with urgency and reason prefilled | 20 |
| 31 | ⚠ Recall/follow-up interval suggestion by condition | 16 |
| 32 | Follow-up due list on the home page | 12 |
| 33 | Quick-search across a patient's own history | 12 |
| 34 | Compare any two visits side by side | 20 |
| 35 | ⚠ Dry-eye severity grading (needs a named, cited scale) | 16 |
| 36 | ⚠ Diabetic retinopathy grading (needs a named, cited scale) | 20 |
| 37 | ⚠ Cataract grading (LOCS-style; needs the source) | 16 |
| 38 | Structured OCT values (CMT, RNFL) rather than attachments only | 30 |
| 39 | Axial length / myopia progression chart | 20 |
| 40 | Amblyopia therapy tracking | 24 |

## Tier 3 — Specialty depth (41–90)

**Glaucoma (41–50)** — the thinnest domain relative to its stakes (23 conditions):
41 gonioscopy diagram capture · 42 ⚠ pachymetry-adjusted IOP display ·
43 disc haemorrhage tracking · 44 ⚠ progression-rate calculation ·
45 medication adherence log · 46 laser/surgery history ·
47 ⚠ risk-stratified recall · 48 diurnal IOP curve · 49 family-history weighting ·
50 ⚠ glaucoma KB expansion (23 → ~50 conditions). *~180 h.*

**Retina (51–58)** — 51 macular thickness trend · 52 injection log with counts ·
53 ⚠ AMD staging beyond AREDS · 54 FFA phase structuring · 55 laser record ·
56 retinal drawing with standard colours · 57 ⚠ DR screening pathway ·
58 peripheral lesion mapping. *~150 h.*

**Cornea (59–65)** — 59 topography values · 60 ⚠ keratoconus staging ·
61 endothelial cell count · 62 graft record · 63 staining grid (Oxford/NEI —
⚠ needs the source) · 64 ulcer measurement + photo · 65 culture results. *~110 h.*

**Neuro (66–72)** — 66 formal Parks 3-step aid · 67 Hess/Lees chart capture ·
68 pupil measurement in light/dark · 69 ⚠ VF pattern classification ·
70 cranial nerve template · 71 ⚠ headache red-flag checklist ·
72 ptosis measurements (MRD1/2, levator). *~100 h.*

**Contact lens (73–80)** — 73 lens parameter database · 74 trial history ·
75 fit assessment diagram · 76 wear schedule + compliance · 77 reorder path ·
78 ⚠ CLDEQ-style comfort scoring · 79 ortho-K topography tracking ·
80 solution/allergy record. *~120 h.*

**Paediatric / BV / VT (81–90)** — 81 growth & refractive trend chart ·
82 ⚠ age-normed values by bracket · 83 vision therapy plan · 84 session log ·
85 home-exercise compliance · 86 progress charting · 87 ⚠ developmental
milestones · 88 school-vision screening export · 89 cycloplegic vs manifest
comparison · 90 ⚠ myopia-control decision aid. *~180 h.*

## Tier 4 — Education (91–120)

91 ⚠ competency framework mapping (**needs the NCAHP list from faculty — I will
not invent it**) · 92 supervisor sign-off on student encounters · 93 logbook
export in an examinable format · 94 reflective-practice capture · 95 case
discussion threads · 96 peer review · 97 structured OSCE marksheets ·
98 examiner calibration · 99 student portfolio export · 100 progression
dashboard · 101 remediation flagging · 102 cohort comparison · 103 teaching-case
library with difficulty tags · 104 case-of-the-week · 105 spaced repetition on
missed conditions · 106 clinical-reasoning scoring · 107 time-to-diagnosis
metric · 108 differential-quality feedback · 109 red-flag recognition drill ·
110 simulated emergency scenarios · 111 supervisor caseload view · 112 rotation
scheduling · 113 attendance · 114 certificate templates · 115 external examiner
access · 116 curriculum mapping report · 117 learning-outcome analytics ·
118 student self-assessment · 119 faculty feedback templates · 120 anonymous
student feedback. *~700 h.*

## Tier 5 — Research (121–145)

121 longitudinal linkage in the corpus · 122 ⚠ study protocol structure ·
123 cohort builder · 124 inclusion/exclusion criteria · 125 export to a standard
statistical format · 126 REDCap-compatible export · 127 audit trail for research
access · 128 ⚠ ethics approval record · 129 data dictionary export ·
130 missing-data reporting · 131 inter-rater reliability tooling · 132 case-report
form generation · 133 adverse event capture · 134 registry submission format ·
135 quality-improvement dashboards · 136 clinical audit templates ·
137 benchmarking against published rates · 138 outcome measure library ·
139 PROM capture · 140 follow-up compliance tracking · 141 loss-to-follow-up ·
142 statistical power estimation · 143 pre-registration record · 144 publication
export pack · 145 ⚠ multi-site pooling (needs ADR-012 decided). *~600 h.*

## Tier 6 — Platform and operations (146–200)

146–160 **Multi-user**: server-enforced roles, SSO, team caseload, handover,
concurrent editing, per-user audit, session management, delegation, locum access,
supervision hierarchy, on-call, task assignment, internal messaging, shift
handover, escalation. *~400 h.*

161–175 **Practice management**: appointments, queue display, recall automation,
SMS/email reminders, no-show tracking, billing, insurance, inventory, spectacle
order tracking, lab interface, dispensing record, stock alerts, purchase orders,
staff rota, room allocation. *~500 h.*

176–190 **Interoperability & devices**: FHIR resources, HL7 v2, DICOM viewing,
autorefractor import, tonometer import, OCT import, VF import, topographer
import, fundus camera, biometry, lensmeter, phoropter, EMR import/export,
national health ID, referral network. *~700 h.*

191–200 **Patient-facing**: portal, appointment self-booking, results access,
education library, consent-to-treatment capture, pre-visit questionnaire,
symptom diary, medication reminders, satisfaction survey, accessibility (screen
reader, large print, ⚠ local languages). *~300 h.*

---

## Totals

| Tier | Focus | Hours |
|---|---|---|
| 1 | Safe for his own practice | ~180 (+20 h clinical) |
| 2 | Daily workflow | ~560 |
| 3 | Specialty depth | ~840 |
| 4 | Education | ~700 |
| 5 | Research | ~600 |
| 6 | Platform | ~1,900 |
| | **All 200** | **~4,800 h ≈ 2.5 engineer-years** |

## If he does only ten things

**Items 1, 2, 3, 4, 5, 13, 14, 15, 17, 30.**
About **150 engineering hours plus 20 hours of his own clinical time**, and it
buys: a signed knowledge base, honest documentation of what was and was not
assessed, a differential that stops overstating its own confidence, follow-up
visits that do not start from nothing, IOP you can see a trend in, and a
referral letter that writes itself.

That is the difference between a promising prototype and something he would
genuinely rather use than not.
