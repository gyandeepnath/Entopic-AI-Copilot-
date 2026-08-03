# Entopic — Clinical Safety Register

**Phase 2 · 2026-08-01 · against v1.4.1, KB v1.3.1, 394 conditions**

## What this document is, and the limit on its authority

A standing register of ways this software could contribute to patient harm.
Each entry states the hazard, how it arises, what already mitigates it, and
what is still open.

**A necessary declaration before anything else.** I am not a clinician. The
founder is a practising optometrist and is the clinical authority on this
product. Everything below is grounded in what the software **measurably does**
— every claim was verified by running it, and the method is stated so it can be
re-checked. Where an entry requires a clinical or medico-legal judgement, it
says so and stops there rather than pretending to make the call.

Entries marked **⚠ FOUNDER DECISION** cannot be closed by engineering.

---

## Severity scale

| | Meaning |
|---|---|
| **S1** | Could plausibly contribute to serious, irreversible harm (missed sight-threatening disease, wrong treatment) |
| **S2** | Could contribute to a wrong or delayed clinical decision |
| **S3** | Degrades documentation, trust or efficiency; harm indirect |

---

## OPEN — S1

### CS-00 · 394 of 394 conditions are clinically unverified
**Hazard.** Every differential the engine produces rests on knowledge no
clinician has signed. A wrong `req` token silently removes a condition from
every differential it should appear in; a wrong `urgent` flag removes an alert.
**Evidence.** `review_status` is `NEEDS_CLINICAL_REVIEW` on all 394 (measured
via the KB loader). `tools/audit.js` reports "0 conditions verified".
**Mitigation in place.** The differentials tab states the verification status.
The loader fails closed, so unknown review state counts as unreviewed (ADR-009).
Sign-offs survive releases and are backed up.
**Still open.** The work itself. Nothing engineering can do moves this.
**⚠ FOUNDER DECISION — and the single largest clinical risk in the product.**
At a sustainable ~20 conditions an hour this is roughly 20 hours of
concentrated clinical time. It is the highest-value 20 hours available.

### CS-01 · "Normal" quick-fill writes measurements nobody took
**Hazard.** One click on the header "✓ Normal" button writes **VA 6/6**,
**IOP 15 mmHg**, and **C:D 0.3** into the record. These are specific numeric
measurements. If the clinician clicks without performing the test — reasonable
under time pressure, since the button is one tap and the fields are many — the
record asserts a measurement that was never obtained. A later reader, or a
court, cannot distinguish it from a real one.
**Evidence.** `js/wnl-templates.js`, `WNL_TEMPLATES.va`, `.iop`, `.fundus`.
Verified by clicking it in a browser: `V.iop.od === "15"` with no measurement.
**Why this is the same class as an already-fixed defect.** The prescription
module printed "plano" for an unmeasured refraction; that was fixed on
2026-07-30 precisely because absent data must not render as a normal value.
**Partially mitigated 2026-08-01.** The rule is now written into the file and
the new binocular-vision template obeys it — categorical results only,
no invented numbers.
**⚠ FOUNDER DECISION.** Three options, and this is a documentation and
medico-legal judgement:
1. Leave as is — treat the click as the clinician attesting they examined.
2. Write categorical text instead of figures ("normal", not "15 mmHg").
3. Keep figures but mark them in the record as template-entered, so a reader
   can tell the difference.
My recommendation is **(3)**: it preserves the speed, and it makes the record
honest about its own provenance. But the call is his.

### CS-02 · Roles are not a security boundary
**Hazard.** In a teaching clinic, a student on a shared machine can reach every
patient record. Not a diagnostic hazard; a confidentiality and integrity one.
**Evidence.** Proven by browser probe in the launch review: `CU.admin = true`
in the console, persisted, followed by a full data export. See ADR-010.
**Mitigation.** None that is real. Every role check runs in the browser.
**Still open.** Requires server-enforced authorization (~80 h) while the exam
path stays offline (ADR-006 constrains the design, it does not prevent it).
**Blocker for:** any multi-user clinic, any teaching deployment.
**Not a blocker for:** a single clinician on their own device.

---

## OPEN — S2

### CS-03 · Free-text medication parsing is a heuristic
**Hazard.** The medication field is read by pattern matching, and drives both a
displayed review and engine risk tokens.
**Fixed 2026-08-01 (two real defects).**
- Substring matching reported drugs the patient was not taking:
  "chloroquine" matched inside "hydroxychloroquine". A patient on one common
  drug was shown as taking two. Now requires a word boundary at the start.
- Negation was not understood: "no steroids" counted as a steroid history.
  Now classified as current / past / negated / allergy.
**Residual risk, and it is real.** The cue vocabulary
(`MED_NEG_CUES`, `MED_PAST_CUES`, `MED_ALLERGY_CUES`) is my construction, not a
validated clinical lexicon. Phrasings it does not know are read as current use.
**Design decision that limits the damage.** Nothing is ever silently dropped —
every mention still appears, labelled with how it was read, so a misreading is
visible rather than invisible. And past use still counts as exposure, because
steroid cataract, hydroxychloroquine maculopathy and ethambutol optic
neuropathy are consequences of *past* drugs.
**⚠ FOUNDER DECISION.** Confirm the cue lists match how clinicians in his
setting actually write. Marked `NEEDS_CLINICAL_REVIEW` in the source.

### CS-04 · Red-flag rules live in engine code, not in reviewable knowledge
**Hazard.** The knowledge base is reviewable by a clinician; the red-flag rules
are not. They are `if` statements in `js/engine.js` (e.g. RAPD at line 1363,
IOP thresholds). A clinician signing off the knowledge base is not signing off
the alerts, and cannot see them without reading code.
**Evidence.** 63 conditions carry `urgent`, but the alert rules themselves are
code. Verified: all four probed red flags fire (flashes+floaters, IOP >40,
RAPD, sudden vision loss).
**Mitigation.** Tests pin the behaviour; the audit probes three red flags on
every run.

**CLOSED 2026-08-03 — and the original recommendation was deliberately NOT
followed.** That recommendation was "move red-flag rules into data". It is the
wrong fix. Red flags are un-suppressible; making them data creates a path by
which a corrupt, missing, stale or mistakenly edited file removes one, and that
path did not exist before. Reviewability is worth a great deal; it is not worth
inventing a way to lose an alert.

What was built instead is `knowledge/red-flags.js`: a register that declares
all 18 alert rules — the 16 hand-written ones, the derived-urgent rule (F-1)
and the clinician-authored rule — in clinical language, with the exact wording
the clinician sees, the level, and the threshold ids each one compares against.
The rules themselves stay in `js/engine.js`, where nothing can unload them, and
the engine never reads the register. `tests/red-flags.test.js` fails if the
engine gains an alert the register does not declare, or loses one it does, or
emits a different level than the register claims — so the two cannot drift
while remaining separate. Visible in the Admin panel under "🚩 Red flags".

The hazard as stated — "the alerts are trustworthy but *unreviewable*" — is
closed. Every rule now carries `status: "UNVERIFIED"` and awaits the founder's
sign-off, which is the point: they are reviewable, and not yet reviewed.

### CS-05 · No explicit "not assessed" state
**Hazard.** An empty field means both "normal and I did not write it down" and
"I did not look". A later clinician cannot tell which. In glaucoma follow-up or
a neuro case, "gonioscopy not performed" and "gonioscopy normal" carry very
different weight.
**Evidence.** `blankVisit()` initialises fields to `""`. Completion rules infer
"done" from the presence of data, so absence is ambiguous by construction.
**Partially improved 2026-08-01.** The binocular-vision completion rule now
recognises categorical results, so a normal BV screen no longer reads as
unassessed. That fixes one instance of a general problem.
**Recommendation.** A tri-state per section — assessed-normal / assessed-abnormal
/ not-assessed — surfaced in the record and the report. This is the single
highest-value documentation change available. ~30 h.

### CS-06 · Alert fatigue is unmeasured
**Hazard.** 63 of 394 conditions are urgent (16%). If a routine clinic
generates alerts frequently, clinicians learn to dismiss them, and the one that
matters is dismissed with the rest.
**Evidence.** Not measured — no telemetry exists on how often alerts fire in
real use, and no clinic has generated enough real encounters to measure.
**Recommendation.** Once real usage exists, measure alert frequency per 100
encounters and the dismissal rate. Do not tune thresholds before measuring.
**Explicitly NOT actioned:** suppressing any alert would violate the standing
guardrail that red flags are un-suppressible.

### CS-07 · Automation bias toward the top-ranked differential
**Hazard.** A ranked list with a leading percentage invites anchoring. The
first item is read as "the answer".
**Evidence.** A routine dry-eye case returns three conditions all at `prob:
0.75` — a three-way tie displayed as an ordered list. Order among equals is
arbitrary but reads as ranking.
**Mitigation.** Advisory framing is present throughout; the flow map shows
supporting and contradicting evidence per condition.
**Recommendation.** Display ties as ties (Top-100 item 42, ~16 h). This is a
small change with a real cognitive effect.

---

## OPEN — S3

### CS-08 · The differential does not distinguish engine suggestion from clinician diagnosis
The record stores `dxList` (engine output). What the clinician actually
concluded is not separately modelled. For audit, research and medico-legal
defence these must be distinct. Top-100 items 44–45, ~70 h.

### CS-09 · No allergy field distinct from medications
Allergies are inferred from the medications free text (`allergic to X`). A
structured allergy list is standard in every EMR and absent here.
**⚠ FOUNDER DECISION** on scope; low engineering risk.

### CS-10 · No drug–drug or drug–condition interaction checking
The medication module maps drugs to *ocular effects* only. It does not check
interactions, and must not be assumed to.

**Mitigated 2026-08-03.** The limit is now stated in the advisory panel,
directly beneath the medication alerts: "Ocular effects of individual drugs
only. **Drug–drug and drug–condition interactions are not checked** — use your
usual prescribing reference." Stating the limit *is* the safety feature: a
clinician who watches a drug list produce alerts will reasonably infer that the
drugs which produced none were checked and cleared. An invisible absence reads
as a green light.

The underlying gap is unchanged and is a **⚠ FOUNDER DECISION** on scope —
interaction checking means either licensing a drug database or building one,
and building one would mean inventing clinical facts, which is forbidden.

### CS-11 · Laterality is per-finding, not enforced
Findings carry `{label, eye}`, but nothing requires an eye to be specified.
A finding recorded without laterality is clinically incomplete — on screen it
looks complete; in the record and the referral letter it is not, and the reader
cannot recover which eye it was.

**Mitigated 2026-08-03.** `clinContradictions` now raises `finding_no_eye`, per
section, naming the findings and counting them, surfaced in the advisory
panel's Contradictions block. Deliberately a *question* and not an *error*: a
few findings genuinely are not lateralised, and it is not the checker's place
to decide which. Entry is never blocked. Four tests.

Still open: nothing *enforces* laterality at entry. That is a UI change to the
finding pickers rather than a validation change, and enforcing it would block
entry — which this project's data-checking layer has never done.

---

## CLOSED this phase

| ID | Was | Closed by |
|---|---|---|
| CS-03a | "chloroquine" matched inside "hydroxychloroquine"; patient shown as taking two drugs | Word-boundary matching, 16 tests |
| CS-03b | Same bug duplicated in `ui-advisory.js` | Both callers now use one function |
| CS-03c | "no steroids" counted as steroid history | Negation/past/allergy classification, 11 tests |
| CS-12 | Age-bracket clinical decisions stored but never applied to the live knowledge base | `ageBracketSet` now stores and applies as one operation |
| CS-13 | BV recorded as orthophoric/fusing read back as "not assessed" | Completion rule recognises categorical results |
| CS-04 | 18 red-flag rules existed only as `if` statements no clinician could see | `knowledge/red-flags.js` register + `tests/red-flags.test.js` pinning it to the code; rules stay in code so nothing can suppress them |

---

## Method, and why some of this should be re-checked

Every claim here was verified by running the software in a headless browser,
not by reading code alone. That distinction earned its keep: during this phase
my measurement scripts were **wrong four separate times** — I called the engine
by a name it does not have, looked for the advisory panel on the wrong page,
used `V.pup` instead of `V.pupil`, and tried to open an exam without creating a
visit. Each produced confident, serious-looking findings that were entirely
false.

The rule that follows: **a finding is not a finding until the probe that
produced it has been checked.** Where an entry above says "verified", it means
the reproduction was run and re-run after the fix.
