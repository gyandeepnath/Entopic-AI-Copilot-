# Entopic — Clinical Excellence Report

**Phase 2 · 2026-08-01 · v1.4.1, KB v1.3.1**
Companion documents: `PHASE2_CLINICAL_SAFETY_REGISTER.md`,
`PHASE2_HUMAN_FACTORS_REGISTER.md`, `PHASE2_CLINICAL_WORKFLOW_ROADMAP.md`,
`PHASE2_CLINICAL_INNOVATION_ROADMAP.md`.

---

## 0. The honest framing, before anything else

The brief asked me to act as a CMIO with 25 years of experience. I will do the
work of that role — walk the personas, the workflows, the specialties, the
safety, the ergonomics — but I will not pretend to the authority. **The founder
is the practising optometrist here; I am not a clinician.**

What that changes in practice:

- Every factual claim below was **measured by running the software**, and the
  method is stated so it can be re-checked.
- Where a question is clinical (is this the right normal? is this workflow how
  optometrists actually work?) I present the evidence and stop. Those are
  marked **⚠ CLINICAL JUDGEMENT**.
- I have not invented clinical facts, thresholds, guideline claims or
  competitor behaviour I could not verify. Where I do not know, it says so.

This matters because a confident-sounding clinical review written by something
that cannot examine a patient is worse than no review. During this phase my own
measurement scripts were **wrong four times** — producing confident, entirely
false findings — until I checked them. That is the calibration to keep in mind.

---

## 1. What Entopic actually is, measured

| | |
|---|---|
| Exam steps | **33** — 22 core, 11 optional/specialty |
| Data fields captured | **408 text inputs, 126 dropdowns, 72 free-text areas** |
| Clickable finding chips | **633** |
| Knowledge base | **394 conditions**, 9 domains, all with ICD-10 |
| Urgent-flagged conditions | **63** (16%) |
| Conditions clinically verified | **0** |
| Engine | deterministic, 13 stages, ~0.7 ms per run, no network |
| Steps with a "Normal" quick-fill | **9 of 33** |

**Step inventory** (Registration → History → Examination → Investigations →
Assessment → Management → Documentation, plus optional modules):
Demographics, Chief Complaint, Ocular History, Medical/Systemic, Family &
Social, Visual Acuity, Refraction, Dilation, Slit Lamp, IOP/Tonometry, Pupils,
Ocular Motility, Binocular Vision, Gonioscopy, Fundus, Neuro-Ophthalmology,
Investigations, Diagnosis/DDx, Plan, ICD-10 Coding, Report, Prescription —
then Paediatric, Low Vision, Contact Lens, Dry Eye Workup, Refractive Surgery,
Myopia Management, Oculoplasty, Ocular Prosthesis, Sports Vision, Theatre
Record, Screening.

**That is a genuinely wide clinical surface.** Wider than I expected before
measuring, and wider than most single-founder products reach. The specialty
modules are not stubs: Contact Lens has 46 fields, Refractive Surgery 47,
Oculoplasty 34.

---

## 2. Personas — who this serves, and how well

Scored on whether the software supports that person's actual day.

| Persona | Supported? | The honest verdict |
|---|---|---|
| **Optometrist (primary care)** | **Strong** | The 22-step flow is their exam. Chips for findings, engine advises live. This is the persona the product was built for and it shows. |
| **Student / Intern** | **Strong** | Simulation, OSCE, quiz, casebook, assignments all exist. Practice records are segregated from clinical ones. The best-served secondary persona. |
| **Senior optometrist** | **Moderate** | Everything the junior has, but no way to move faster. No templates, no "same as last visit", 9 of 33 steps have a Normal shortcut. Experience is not rewarded. |
| **Contact lens specialist** | **Moderate** | 46-field module exists. No lens database, no trial-lens history, no reorder path. |
| **Paediatric optometrist** | **Moderate** | Dedicated module with a Normal quick-fill (one of only 9). But no growth/refractive-trend charting, which is the core of paediatric practice. |
| **Low vision practitioner** | **Moderate** | 30-field module. No device library, no functional-goal tracking. |
| **Vision therapist** | **Weak** | Binocular vision capture is excellent (68 fields — the deepest in the product). But no therapy *plan*, no session log, no progress chart. Data goes in; nothing comes back. |
| **Ophthalmologist (general)** | **Moderate** | Can document a full exam. Theatre Record exists. No imaging viewer, no biometry, no surgical planning. |
| **Retina specialist** | **Moderate** | 93 retinal conditions — the largest domain. But OCT/FFA are file attachments, not structured data. No macular thickness trend. |
| **Glaucoma specialist** | **Weak-Moderate** | Only **23 glaucoma conditions** vs 93 retina. Gonioscopy captured. **No IOP trend chart, no visual-field progression, no target-IOP field.** Glaucoma is longitudinal care and this is a single-visit tool. |
| **Cornea specialist** | **Moderate** | 61 conditions, good slit-lamp chips. No topography integration. |
| **Neuro-ophthalmologist** | **Moderate** | 55 conditions, dedicated step, RAPD/pupils captured. No formal Parks 3-step aid beyond a notes field. |
| **Faculty / Supervisor** | **Moderate** | Faculty portal, assignments, certificates exist. Competency mapping does not. |
| **Researcher** | **Moderate-Strong** | Consent ledger, de-identified corpus, insights with denominators and a minimum cell size. Unusually principled. But single-clinic only. |
| **Receptionist** | **Weak** | No appointment book, no queue, no billing. Demographics only. |
| **Technician** | **Moderate** | Investigation-unit role exists; can enter investigations. |
| **Hospital administrator** | **Weak** | Analytics exist. No scheduling, billing, inventory, or staff management. |
| **Patient** | **Very weak** | No patient-facing anything. No portal, no printed education leaflet, no consent-to-treatment record. The report is clinician-facing. |

**Pattern.** Entopic is excellent at **one clinician, one patient, one
encounter, one moment**. It weakens in exactly two directions: **across time**
(follow-up, trends, progression) and **across people** (roles, teams,
scheduling, patients).

---

## 3. Clinical workflows — where effort is forced

Measured field counts per step. The interesting numbers:

| Step | Fields | Comment |
|---|---|---|
| Binocular Vision | **68** | Heaviest in the product. Now has a Normal quick-fill (added this phase). |
| Refraction | **48** | No "same as last visit", no auto-carry from previous Rx. |
| Contact Lens | 46 | |
| Slit Lamp | 23 + **136 chips** | Chip-driven — the best-designed step in the product. |
| Fundus | 23 + **87 chips** | Same pattern, works well. |
| Chief Complaint | 2 + **189 chips** | Very rich symptom capture. |
| IOP | 6 | Fast. Good. |
| Pupils | 10 | Fast. Good. |

**What works, and deserves protecting.** The chip-based steps (slit lamp,
fundus, chief complaint) are genuinely well-designed: recognition over recall,
one tap per finding, engine updates live. That pattern is the product's
strongest clinical idea and it should be extended, not diluted.

**Where unnecessary effort is forced.**

1. **No carry-forward from the previous visit.** `getPreviousVisit()` exists,
   but a follow-up starts blank. In real follow-up practice most of the record
   is unchanged. This is the single largest wasted-effort item in the product.
2. **Refraction is 48 fields with no previous-Rx prefill.** Habitual Rx is
   almost always the starting point for subjective refraction.
3. **24 of 33 steps have no Normal shortcut** — including refraction,
   dilation, and the three history steps.
4. **No "not assessed" state** (Safety Register CS-05) — so skipping is
   indistinguishable from finding-nothing.

**⚠ CLINICAL JUDGEMENT for the founder:** which of the 24 steps *should* have
a Normal template, and what "normal" means for each. I have deliberately not
guessed. The one I added (binocular vision) uses categorical results only and
invents no measurement — that rule is now written into
`js/wnl-templates.js` and should govern any he adds.

---

## 4. Clinical reasoning — the strongest part of the product

Measured on a routine case (58F, gritty eyes worse in the evening, MGD on slit
lamp):

- 3 differentials returned, each with supporting/contradicting evidence
- 4 discriminating "check next" suggestions, each clickable to the exact field
- 1 nudge (examine slit lamp)
- 0 alerts (correct — nothing urgent here)

**What is genuinely excellent:**
- **The reasoning is inspectable.** Every condition shows what matched, what
  contradicted, what is missing. This is the "glass box" and it is rare.
- **It refuses to guess.** Age alone yields no differential — verified.
- **It is reproducible.** Same inputs, same output, forever. Deterministic and
  offline (ADR-004, ADR-006). A clinician can be held to it; an LLM output
  cannot.
- **It suggests the discriminating next test**, not just a list. That is real
  decision support rather than a lookup.

**Where reasoning falls short:**
- **Ties are displayed as a ranking.** All three dry-eye differentials returned
  `prob: 0.75`. Shown as an ordered list, that reads as "the first one is most
  likely". It is not. (CS-07)
- **No contradiction detection across the record.** Nothing notices if IOP 45
  is recorded alongside "IOP normal" in a free-text note.
- **No completeness prompting by presentation.** A red-eye case does not prompt
  "you have not recorded fluorescein staining". The nudges are step-based, not
  presentation-based.
- **`prob` is not a calibrated probability.** It is a match score displayed as
  a percentage. Nothing has validated it against outcomes. **⚠ This should be
  relabelled** — "match strength" would be honest; "75%" implies a
  frequency claim nobody has earned.

---

## 5. Specialty coverage, measured

| Domain | Conditions | Verdict |
|---|---|---|
| Retina | 93 | Deepest coverage |
| Surface & Lids | 72 | Strong — matches primary-care caseload |
| Cornea | 61 | Strong |
| Neuro-Ophthalmic | 55 | Strong for a primary-care tool |
| Anterior / Uveitis | 29 | Adequate |
| Binocular Vision | 26 | Adequate; capture is far deeper than the KB |
| Lens | 24 | Adequate |
| **Glaucoma** | **23** | **Under-weighted for its clinical importance** |
| Refractive | 11 | Thin |

**The glaucoma gap is the notable one.** Glaucoma is among the highest-stakes
conditions in optometric practice — irreversible, slowly progressive, and the
whole clinical task is *longitudinal comparison*. Entopic has 23 glaucoma
conditions, no IOP trend, no visual-field progression, no target IOP, and no
disc-photo comparison. **⚠ CLINICAL JUDGEMENT:** whether this matters depends
on his intended caseload, but on the face of it this is the largest clinical
gap in the product.

Missing workflows across specialties: myopia-control progression tracking
(module exists, no axial-length trend), amblyopia therapy tracking, diabetic
retinopathy grading scale, dry-eye severity grading (DEWS-style), and any
structured imaging data.

---

## 6. Education — the second-strongest area

Present and working: simulation, OSCE, quiz, casebook, assignments,
certificates, faculty portal, student/practice-record segregation, analytics.

**This is a genuinely differentiated offering.** Most ophthalmic EMRs have no
teaching layer at all; most teaching platforms have no real clinical engine.
Entopic has both, sharing one knowledge base — so a student practises against
the same reasoning their supervisor uses. That is a real and defensible idea.

**Gaps for university adoption:**
- No competency framework mapping (NCAHP or otherwise). **⚠ I do not know the
  NCAHP competency list and will not invent one** — this needs the founder or
  a faculty member to supply it.
- No structured reflective-practice capture.
- No supervisor sign-off workflow on a student's clinical encounter.
- No logbook export in a format an examining body would accept.
- Learning analytics exist but are not tied to competencies.

---

## 7. Research readiness

Unusually strong for this stage, and unusually principled:

- Versioned, revocable consent, checked before every capture
- De-identified corpus with two-pass pseudonymisation and an explicit
  allow-list (not a deny-list — the safer direction)
- Insights carry denominators and enforce a minimum cell size of 5
- Every figure carries a caveat

**Gaps:** single-clinic only (ADR-012 undecided), no longitudinal linkage
across visits in the corpus, no export in a standard research format, no
audit-ready study protocol structure.

---

## 8. Cognitive ergonomics and human factors

Detailed in `PHASE2_HUMAN_FACTORS_REGISTER.md`. Summary:

**Strong:** recognition over recall (633 chips), live engine feedback, glass-box
reasoning, sticky non-dismissible warnings for data loss, one-click navigation
from a suggestion to the exact field.

**Weak:** 606 total data fields with limited prioritisation; no carry-forward;
no keyboard-first entry path; ties presented as rankings; the engine panel
competes with the exam for attention on smaller screens.

---

## 9. Competitive positioning — workflow, not features

I will be careful here: **I have not used Epic Ophthalmology, eyeSmart, Netra or
iClinic, and I will not fabricate comparative claims about them.** What I can
say is structural.

Where Entopic could be genuinely superior, and where the opportunity is real:

1. **Transparent reasoning.** Large EMRs document; they rarely *reason*, and
   where they do it is opaque. Entopic shows its work. A clinician can disagree
   with it specifically rather than generally. That is a real differentiator.
2. **Offline-first.** For rural and tertiary Indian settings this is not a
   feature, it is the difference between usable and not.
3. **One knowledge base for teaching and practice.** Students learn on the same
   engine that advises their supervisor. Nobody else is doing this that I am
   aware of.
4. **Reviewable clinical content.** A knowledge base a clinician can read, sign
   and version is a foundation for regulatory defensibility that most
   ML-based CDSS cannot offer.

Where Entopic is behind, structurally: scheduling, billing, imaging, device
integration, interoperability (no FHIR/HL7), and multi-user anything.

**The strategic read:** do not try to become Epic. Become the thing Epic
cannot be — the transparent, offline, teaching-integrated clinical reasoning
layer — and interoperate later.

---

## 10. Clinical Scorecard

Scored 1–10 against "what a demanding eye-care professional would need".

| Dimension | Score | Why |
|---|---|---|
| Clinical Workflow | **6** | 33 steps, wide coverage, chip-based capture is excellent. Loses points for no carry-forward and 24 steps without a Normal path. |
| Documentation | **5** | Structured and rich, but no "not assessed" state, no engine-vs-clinician distinction, and templates that write unmeasured numbers. |
| Patient Safety | **5** | Red flags fire and are un-suppressible; corrupt-data and write-failure protection are genuinely good. Held down by 0/394 verified and CS-01. |
| Decision Support | **8** | The strongest area. Inspectable, deterministic, suggests discriminating tests, refuses to guess. |
| Educational Value | **8** | Simulation, OSCE, quiz, casebook, faculty portal, shared KB. Genuinely differentiated. |
| Research Value | **7** | Principled consent and de-identification, honest statistics. Single-clinic limits it. |
| Clinical Reasoning | **7** | Excellent mechanism; uncalibrated `prob`, no tie handling, no contradiction detection. |
| Human Factors | **6** | Strong recognition-over-recall and feedback; heavy field counts, no keyboard path. |
| Cognitive Ergonomics | **5** | 606 fields, limited prioritisation, no carry-forward. Improved this phase but structurally heavy. |
| Specialty Coverage | **6** | Wide (33 modules) but uneven — glaucoma notably thin relative to its stakes. |
| Optometry Excellence | **7** | Clearly built by an optometrist for optometrists. BV depth is exceptional. |
| Ophthalmology Excellence | **4** | No imaging, no biometry, no surgical planning, no theatre workflow beyond a record. |
| Teaching Readiness | **7** | Ready to pilot with students today. |
| University Readiness | **5** | Needs competency mapping, supervisor sign-off, and multi-user auth before a department could adopt it. |
| Community Eye Care Readiness | **7** | Offline-first, screening module, low hardware needs. Genuinely well-suited. |
| Future Clinical AI Readiness | **8** | Structured tokens, deterministic core, consented de-identified corpus, clean LLM firewall. Very well positioned. |

**Overall: 6.3 / 10** — a clinically thoughtful, unusually transparent
single-clinician tool with an outstanding reasoning core, held back by
longitudinal care, multi-user capability, and the unverified knowledge base.

---

## 11. The final questions, answered plainly

**As a practising optometrist, would I voluntarily switch to Entopic?**
For the reasoning and the teaching, yes — as a *second* system alongside
whatever holds my appointments and billing. Not as my only system, because it
cannot book a patient, cannot show me last visit's IOP next to today's, and
cannot bill. The reasoning engine alone is worth opening it for.

**As an ophthalmologist, would this improve my day?**
Marginally today. Without imaging, biometry or surgical planning it does not
touch the parts of the day that are hardest. The neuro and retina knowledge is
good enough to be a useful second opinion.

**As a university dean, would I adopt it?**
For teaching, yes — pilot it next term. It is better than most teaching
platforms because the engine is real. But **not until roles are enforced
server-side** (CS-02): I cannot put students on shared machines with unrestricted
access to patient records. That is a hard gate.

**As a hospital director, would I purchase it?**
Not yet. No scheduling, no billing, no multi-user, no interoperability. Come
back when it can be the clinical layer on top of an existing HIS.

**What must change?** In order:
1. A clinician signs the knowledge base (~20 h of his time — the highest-value
   hours available anywhere in this project).
2. Server-enforced roles (~80 h) — gates every multi-user and teaching sale.
3. Carry-forward and longitudinal trends (~80 h) — the biggest daily-workflow win.
4. An explicit "not assessed" state (~30 h) — the biggest documentation-quality win.
5. Resolve CS-01 (template-written measurements) — a decision, not engineering.

---

## 12. Estimate to "preferred clinical workspace"

| Milestone | Effort | What it unlocks |
|---|---|---|
| **Safe for his own practice** | ~20 h clinical + ~30 h eng | KB signed, CS-01 resolved, "not assessed" state |
| **Sellable to a single-clinician clinic** | +~120 h | Carry-forward, trends, glaucoma longitudinal, report quality |
| **Deployable in a teaching institution** | +~200 h | Server-enforced roles, competency mapping, supervisor sign-off |
| **Adoptable by a hospital department** | +~600 h | Scheduling, imaging, interoperability, multi-user |
| **Preferred workspace for eye-care professionals** | **~1,400–1,800 h total** | The above plus specialty depth, device integration, patient-facing layer |

Roughly **9–12 months of one focused engineer**, and about **20 hours of the
founder's clinical time** — which is, by a wide margin, the highest-leverage
input available to this project.

The full ranked list is in `PHASE2_CLINICAL_WORKFLOW_ROADMAP.md`.
