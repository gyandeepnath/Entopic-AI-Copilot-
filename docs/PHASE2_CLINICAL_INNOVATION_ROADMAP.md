# Entopic — Clinical Innovation Roadmap

**Phase 2 · 2026-08-01**

The brief said: no gimmicks. Every item must reduce time, reduce cognitive
effort, improve safety, improve quality, improve education, improve research, or
improve the patient's experience — and preferably several at once.

I have deliberately kept this short. Nine ideas, each earned. Anything that
failed the test is listed at the end with the reason, because knowing what was
rejected is more useful than a longer list.

---

## I-1 · The exam that knows what it does not know

**What.** Replace "the clinician fills 33 steps" with "the engine names the
three things that would most change the answer, and the clinician does those."

**Why it is not a gimmick.** The mechanism already exists — `V.nextTests`
computes discriminating tests, with confirms/excludes per condition, clickable
straight to the field. It is currently a suggestion in a side panel. Promote it
to the primary navigation for the exam and the software stops being a form and
starts being a colleague.

**Wins:** time (fewer irrelevant fields), cognition (three decisions instead of
606), quality (the *discriminating* test gets done), education (a student sees
what an expert would ask next).

**Risk to manage:** it must never *prevent* a full examination, and must never
imply the un-suggested steps are unnecessary. Advisory, like everything else.
**~60 h.**

---

## I-2 · "Not assessed" as a first-class clinical statement

**What.** Three states per section: assessed-normal, assessed-abnormal,
not-assessed — the last with an optional reason.

**Why.** Today a blank field means "normal", "skipped", or "forgot", and nobody
can tell which. This single change improves documentation quality, medico-legal
defensibility, engine accuracy (a real "not assessed" should not be treated as a
pertinent negative), research quality (missing data becomes measurable), and
teaching (a supervisor can see what the student did not do).

Six benefits from one change. That is the definition of a good one. **~30 h.**

---

## I-3 · The follow-up that starts where the last visit ended

**What.** Open a follow-up and the previous record is *there*, visibly marked as
carried forward, requiring a tap to confirm or change.

**Why.** Most of a follow-up is unchanged. Re-typing it is the largest single
waste in the product. Confirming is faster than entering and produces a better
record — because a confirmed carry-forward is an explicit clinical statement,
where a re-typed value is just typing.

**The safety design matters more than the feature:** carried values must be
visually distinct and must not count as assessed until confirmed. Silently
copying last visit's findings into this visit would be a documentation hazard,
not a convenience. **~40 h.**

---

## I-4 · Longitudinal view as the default for chronic disease

**What.** For glaucoma, diabetic retinopathy, AMD and myopia control, the
default view is the *trend*, not the visit: IOP over time, field over time,
axial length over time, with today's value in context.

**Why.** These diseases *are* their trajectory. A single IOP is nearly
meaningless; six across two years is the clinical picture. This is the biggest
single gap between Entopic and how chronic eye disease is actually managed, and
it is the reason a glaucoma specialist would not use it today. **~80 h.**

---

## I-5 · One knowledge base, two audiences

**What.** The student's teaching content and the clinician's reference are the
same knowledge base, differently rendered. Already half-true — extend so a
condition's page shows the clinician the evidence and the student the reasoning,
from one source.

**Why.** Nobody else can do this. Teaching platforms have no engine; EMRs have no
teaching layer. It costs almost nothing because the content already exists, and
it means the knowledge base gets reviewed by more eyes — students notice
inconsistencies that experts read past. **~40 h.**

---

## I-6 · The referral letter that writes itself

**What.** On referral, generate a letter containing the findings that drove the
decision, the differential with its evidence, the urgency, and what has already
been excluded — editable before sending.

**Why.** Referral letters are written at the end of a long clinic, under time
pressure, and are frequently thin. The engine already knows precisely which
findings mattered and which conditions were considered and excluded. That is
exactly the content a receiving ophthalmologist wants and rarely gets. Improves
patient care at the receiving end, saves the referrer real time, and produces a
defensible record of the reasoning. **~20 h.**

---

## I-7 · Red flags as reviewable clinical content

**What.** Move urgent-alert rules out of engine code and into the same signed,
versioned knowledge the conditions live in.

**Why.** A clinician can currently sign off 394 conditions but cannot see or
sign the alert rules, which are `if` statements in JavaScript. The alerts are the
most safety-critical logic in the product and the only part a clinician cannot
review. Fixing this brings them into the sign-off workflow and makes the safety
case documentable. **~40 h.**

---

## I-8 · Ambient capture, kept honest

**What.** Voice capture during the exam, parsed into structured findings that
the clinician confirms — never accepts silently.

**Why.** Chairside typing is the largest interruption to the clinician–patient
interaction. Speech infrastructure already exists (`js/speech.js`).

**The conditions that make this acceptable rather than dangerous:**
- Parsing is a *suggestion*; nothing enters the record unconfirmed.
- The audio never leaves the device, or the founder decides explicitly otherwise.
- It works offline, or degrades to nothing — never becomes a dependency.
- **⚠ FOUNDER DECISION:** any cloud speech service means patient voice leaving
  the clinic. That is a consent, privacy and cost decision, not an engineering
  one. **~80 h**, gated on that decision.

---

## I-9 · Prevalence that is actually local

**What.** Once enough consented encounters exist, show the clinician how often a
condition actually presents *in this clinic*, alongside the engine's ranking.

**Why.** Published prevalence is from other populations. A clinic in one district
sees a different mix. The consented corpus, minimum cell size, and denominators
already exist and were built carefully. This turns the research asset into
something that helps the clinician who generated it — which is also the fairest
answer to "why am I contributing data?"

**Gate:** needs a real denominator. Showing local prevalence from 30 encounters
would be worse than showing nothing. Enforce the existing minimum cell size and
state the denominator on every figure. **~40 h**, gated on data volume.

---

## Rejected, and why

Keeping this list is the point of the exercise.

| Idea | Why not |
|---|---|
| AI-generated differential diagnosis | Violates the founding guardrail. Not inspectable, not reproducible, not signable, not defensible. The deterministic engine is the product's main clinical asset. |
| Automatic image diagnosis (fundus/OCT) | Would need a validated model, regulatory clearance, and clinical trials. Not a feature — a different product with a different risk class. |
| Gamified student leaderboards | Optimises for engagement, not competence. Encourages speed over care. |
| Automatic prescribing suggestions | Requires a validated formulary, interaction checking, and local prescribing rights. Dangerous at this maturity. |
| A chatbot interface to the record | Adds a translation layer between the clinician and their data. Slower and less certain than the chips already there. |
| Wearable / continuous monitoring | No validated ophthalmic use case that Entopic is positioned to serve. |
| Blockchain records | No problem here that it solves. |
| Automatic ICD coding from free text | The structured path already gives codes. Free-text coding introduces error where accuracy is billable and auditable. |

---

## Sequence

| | | h | Gate |
|---|---|---|---|
| 1 | I-2 "not assessed" | 30 | — |
| 2 | I-6 referral letter | 20 | — |
| 3 | I-3 follow-up carry-forward | 40 | — |
| 4 | I-7 red flags as data | 40 | — |
| 5 | I-5 one KB, two audiences | 40 | — |
| 6 | I-1 engine-led exam | 60 | after I-2 |
| 7 | I-4 longitudinal default | 80 | — |
| 8 | I-9 local prevalence | 40 | real data volume |
| 9 | I-8 ambient capture | 80 | ⚠ founder decision on privacy + spend |

**First five: ~170 hours**, no founder gate beyond ordinary review, and they
address the four highest-priority items in both the Safety Register and the
Human Factors Register.
