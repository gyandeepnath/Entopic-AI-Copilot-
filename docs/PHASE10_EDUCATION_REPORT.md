# Phase 10 — The student / faculty / university layer

**Date:** 2026-08-10
**Scope:** the educational surface — competency recording, supervisor sign-off,
feedback, and the boundary between simulated and real clinical experience.
**Method:** read the code, then drive the real page in a browser. Every claim
below was measured, not inferred.

---

## 1. The headline finding

`js/competency.js` — 310 lines, **16 passing tests, zero call sites.**

I checked each exported function individually. `competencyClaim`,
`competencyProgress`, `competencySummary`, `competencyFramework`,
`competencyFrameworkSet`, `competencyPending`, `competencySignOff`,
`competencyLogbook` — every one returned *0 call sites outside competency.js*.

A student could not record evidence. A supervisor could not sign anything off.
The Teaching tab displayed:

> 🎓 Student logbooks — Follow trainees' reasoned cases across accounts once
> shared cloud accounts are enabled (backend Phase 2).
> `Coming with shared accounts`

This is the single most instructive defect found so far, because **the test
suite was green the entire time.** Sixteen tests asserted that the functions
behave correctly; none asserted that anything calls them. A feature can be
fully correct and completely absent at the same time, and a coverage number
cannot tell the difference.

### The stated dependency was only half true

Reviewing logbooks *across separate accounts and sites* genuinely needs a
backend. Supervising a student does not. Supervised optometry education happens
**at the chair**, with the supervisor next to the student, on the same machine
— which needs no network at all, and is the moment the judgement is freshest.

The on-device path was buildable the whole time. It is now built. The remaining
"coming soon" badge has been narrowed to the part that is actually blocked
(cross-account review) rather than covering the whole feature.

---

## 2. The second finding — and it was in my own first fix

The first wiring of the UI **also shipped broken**, and the unit tests passed.

`ui-competency.js` gated the sign-off queue on `can("supervise")`. But
`"supervise"` was **not declared in `ROLE_CAPS` at all**, and `roleShowsCap()`
returns `false` for an undeclared capability. So the sign-off queue was
invisible to every non-admin account — faculty included. The feature was, once
again, unreachable.

The unit tests did not catch it because they stub `can()`. The real browser run
did, on the first attempt.

**Fixes:**
- `supervise` is now a declared capability in `ROLE_CAPS` (faculty ✓, clinician
  ✓, student ✗, researcher ✗, technician ✗).
- `tests/competency-education.test.js` now asserts against the **real** role
  table, not a stub, with the failure history recorded in the test itself.
- `tools/e2e/competency-journey.js` was promoted from a throwaway script into a
  permanent gate, because it caught something no unit test could.

`ROLE_CAPS` and `TIER_LOCKS` are now exported so tests can assert on the real
table instead of re-describing it.

---

## 3. The safety property: simulated work must never read as real

Entopic produces **simulated cases** (`visit.sim`) and **practice patients**
(`patient.practice`). A competency logbook that could not distinguish those from
a real patient would let a student present simulated work to an examining body
as clinical experience — a misrepresentation the software itself would have
caused.

The Phase 10 brief states this outright: *"The student must not be able to
mistake simulated data for real patient data."* It applies with more force to
the examiner than to the student.

**What was built:**

| Layer | Behaviour |
|---|---|
| Claim | `simulated` is recorded **at claim time**, not looked up later — the visit may be archived or deleted, and a logbook that has forgotten an entry was simulated is worse than no logbook |
| Detection | `competencyVisitIsSimulated()` **fails towards simulated** when it cannot identify the encounter |
| Claim form | warns *before* the student fills it in, not after they submit |
| Progress | simulated evidence is always recorded and always visible, and by default does not count |
| Logbook | `encounter_type` spelled out in words (`"SIMULATED — not a real patient"`), plus a top-level `encounter_counts` split |
| Review queue | a `simulated` chip on the claim, and a bold `SIMULATED CASE` line on the sign-off form |

**Why the default is "does not count":** the failure modes are not symmetric.
Under-counting understates a student's progress — visible, annoying,
correctable. Over-counting produces a record asserting a competence nobody
assessed on a real patient. Only one of those is a safety problem.

**Why it is a switch and not a rule:** whether simulation is acceptable evidence
is an *institutional* decision — some programmes accept it for specified
competencies, others do not. Inventing either answer would be fabrication. So
`competency_sim_policy` is a stored, backed-up, faculty-controlled boolean, and
the logbook records which rule produced its numbers.

---

## 4. What was deliberately NOT built

The brief is explicit: *"Do not invent institutional competency requirements.
Where standards need domain confirmation, create configurable structures rather
than fabricated standards."*

Accordingly, Entopic contains **no**:

- competency content (the framework ships empty and stays empty)
- pass mark
- weighting between dimensions or domains
- minimum case counts
- progression or exit rule
- named accreditation body's standard

A test asserts none of these can creep in (`no pass mark, weighting or
progression rule is invented anywhere`), scanning both source files with
comments stripped.

Faculty import their department's real framework as JSON. A **blank template**
is downloadable — shape only, with `items: []`. `competencyFrameworkSet()`
rejects an empty items array, so the template *cannot be imported until a human
has filled it in*. That is intended behaviour and the template says so in its
own `_readme` field. A template pre-filled with plausible-looking competencies
is precisely how an invented standard gets adopted by accident.

---

## 5. Feedback that can accumulate

One free-text box per sign-off is how feedback becomes *"Good"* — useless to the
student and invisible to the department.

- **Seven dimensions** (`COMPETENCY_FEEDBACK_DEFAULT`), each separately rated.
  These are ordinary health-professions axes, not an institutional standard, and
  a department can replace the list wholesale via
  `competencyFeedbackDimensionsSet()` without touching code.
- **Three rating points**, deliberately. A five- or seven-point scale invites
  false precision on a judgement made in thirty seconds at the chair, and the
  middle of a long scale is where everything quietly collects.
- **`competencyFeedbackTrend()`** reports a direction only from **four or more**
  ratings, and calls a concern *recurring* only at **two or more**. One bad
  afternoon is not a persistent gap; a label applied that loosely gets ignored.
- **`competencyActions()`** answers "what was I asked to work on?" without the
  student re-reading every sign-off.

The free-text `supervisor_comment` was **kept**, not replaced — a supervisor in
a hurry can still write a sentence, and no existing sign-off lost meaning.

A supervisor may agree a **lower** level than the student claimed. Both values
are stored, and the UI says plainly that this is the assessment rather than a
rejection. That gap is the substance of supervised education.

---

## 6. Defects found and fixed in this phase

| # | Defect | Severity | Status |
|---|---|---|---|
| 1 | `competency.js` had zero call sites — the entire feature was unreachable | High | Fixed |
| 2 | `can("supervise")` referenced an undeclared capability → queue invisible to everyone | High | Fixed |
| 3 | No simulated/real distinction in claims, progress or the logbook | High (misrepresentation risk) | Fixed |
| 4 | `competencyActions()` ordering was non-deterministic — `signed_at` is millisecond-resolution, so ties fell back to arbitrary order while the UI promised newest-first | Medium | Fixed (append-only log index as tie-break) |
| 5 | An empty `if (!can("supervise")) { }` in `competencySignOff` read like a guard and enforced nothing | Medium (misleading) | Replaced with an explicit comment stating the honest position |
| 6 | `shape: "boolean"` would have passed `dataShapeOk()` silently — declared but unimplemented | Medium | Implemented, plus a test that every declared shape is actually enforced |

Defects 4 and 6 were found by writing the tests, not by reading the code.

### Two of my own mistakes, recorded

- **The escaping test could not fail.** `!html.includes("');alert(1)")` passes on
  both the escaped and unescaped output, because the escaped form contains that
  substring too (it differs by one backslash). Rewritten to assert the exact
  handler text, then **verified by removing the escaping and confirming the test
  goes red.**
- **`deepStrictEqual` across the VM realm boundary.** An object built inside the
  sandbox has a different prototype and fails identity comparison even when
  every value matches. Compared field-by-field instead.

---

## 7. Verification performed

| Gate | Result |
|---|---|
| `node --test` | 1,214 pass / 0 fail |
| `tools/e2e/competency-journey.js` (new) | 35 held / 0 broke |
| `tools/e2e/patient-journey.js` | 29 held / 0 failed |
| `tools/stress/attack.js` | 46 held / 0 broke |
| `tools/audit.js` | 0 FAIL, 1 WARN (pre-existing) |
| `tools/audit-test-quality.js` | 2 unmessaged (pre-existing; none added) |

The browser journey drives the **real page**: it clicks the real buttons, reads
the real DOM, and reloads to prove persistence. Specifically verified end to
end: framework import survives a reload → student claims evidence by clicking →
student is denied the sign-off queue → supervisor opens the form and rates seven
dimensions → student sees the improvement action → simulated work is signed off
and does **not** mark the competency met → the exported logbook labels both
entries correctly and leaks no visit id → every control in the claim form has a
real label.

---

## 8. What this does NOT claim

- **No competency content is clinically verified**, because none exists. The
  emptiness is the feature.
- **Authorization is not enforced.** ADR-010 stands: the role check hides a
  control, it does not prevent an action. A signed competency is currently
  trustworthy because a supervisor was standing there, not because the software
  stopped anyone. Server-side enforcement remains outstanding.
- **No real student or faculty user has used this.** It is verified against its
  specification, not against a teaching clinic.
- **Cross-account and multi-site review does not work** and is not claimed to.
- The seven feedback dimensions are **ordinary practice, not a cited standard.**
  They are configurable precisely because I will not assert they are anyone's
  published axes.

---

## 9. Decisions for the founder

These need a practising optometrist and, in two cases, a university. I have
implemented a defensible default for each and made every one configurable, so
nothing is blocked — but each should be confirmed.

| # | Decision | What I did | Why it needs you |
|---|---|---|---|
| D1 | May a **clinician** (not just faculty) sign off competencies? | Yes — both roles | On a practice-based placement the supervisor is a registered optometrist, not university staff. Restricting to faculty would hide the control from the people who actually supervise. Confirm this matches how placements run where Entopic will be used. |
| D2 | Should **simulated** work count towards competencies? | No, by default; a faculty switch turns it on | Genuinely institutional. Some programmes accept simulation for specified competencies. |
| D3 | Are the **seven feedback dimensions** the right axes? | Shipped as a replaceable default | They are conventional, not authoritative. A department may have its own. |
| D4 | Is **three rating points** right, or does your programme use a longer scale? | Three | Longer scales invite false precision and collect in the middle — but if your assessment forms use five, matching them matters more than my preference. |
| D5 | Should `recurring` require **two** flags, or more? | Two | This is a judgement about fairness to the student, not a measurement. |

**Nothing here is urgent and nothing is blocked.** Every one of these is a
stored setting or a replaceable list; changing your mind later costs a click,
not a migration.

---

## 10. What I would do next

1. **Server-enforced authorization** (ADR-010). Until this lands, sign-off
   integrity rests on physical presence. This is the largest remaining gap in
   the educational layer and it is a backend task, not a UI one.
2. **Cross-account logbook review** — the part the "coming soon" badge now
   honestly covers.
3. **A real teaching clinic trying it.** Every claim in this report is verified
   against the specification. None is verified against a student and a
   supervisor in a room, and that is a different kind of evidence.
