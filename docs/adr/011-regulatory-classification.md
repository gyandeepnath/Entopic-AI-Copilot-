# ADR-011 — Regulatory classification of the product

**Status:** **DECIDED 2026-08-07** — adopt device-grade discipline; defer the
classification claim; never foreclose the lower-risk answer.
**Decided by:** the founder, on the recommendation recorded below.
**Supersedes:** the "NOT MADE" status recorded 2026-08-01.

---

## Context

Entopic produces a ranked differential diagnosis and urgent-referral alerts
from patient data. In several jurisdictions that description falls within the
definition of a medical device, regardless of the "advisory only" framing
carried throughout the UI.

This sat open for eight phases because it looked like a question only a lawyer
could answer, and therefore like a question that could wait. **That framing was
wrong, and recognising why is the substance of this decision.**

There are two questions here, not one:

1. **"Is Entopic a regulated medical device in jurisdiction X?"**
   A legal determination. **I cannot make it, the founder cannot make it, and
   nobody should act on an engineer's opinion about it.** It requires a
   regulatory consultant in each target jurisdiction.

2. **"How should Entopic be built, given that we do not yet know the answer
   to (1)?"**
   An engineering decision. It can be made today, it must be made today, and
   deferring it has been quietly accruing cost the whole time.

Only question 2 is in scope for an ADR.

### What made this urgent

The expensive part of medical-device regulation is not the paperwork at the
end. It is the **lifecycle evidence you can only create as you go**: design
history, risk management, traceability from requirement to test, change
control, validation records, post-market surveillance.

If a product is built without that evidence and later turns out to be a
regulated device, the evidence **cannot be retrofitted**. It has to be
manufactured retrospectively — which is expensive, of doubtful value, and in
some regimes not acceptable at all. The work gets redone.

So "wait until we know" is not a neutral position. It is a bet that the answer
will be favourable, priced at the cost of redoing several years of work if it
is not.

---

## Decision

**Build to device-grade discipline now. Make no classification claim. Never
ship a feature that would foreclose the lower-risk classification.**

Three parts, in order of how binding they are.

### 1. No classification is claimed, anywhere

Entopic does not state, in its UI, its marketing, its documentation or its
code, that it is or is not a medical device, nor that it is exempt from any
regime. **This document does not make that claim either.** Any such statement
must come from a named, qualified person in a named jurisdiction, on a date,
and be recorded here.

Until then, the honest description is what the UI already says: *a decision
support tool for a qualified clinician, advisory only, clinical correlation
required.*

### 2. The properties that keep the lower-risk answer available are now
**invariants**, not habits

Across the regimes that matter, the recurring pivot is whether the software
**replaces** a clinician's judgement or **informs** it — and specifically
whether a clinician can independently review the basis for what they are being
told, rather than having to rely on it.

Entopic already has those properties. They arose from clinical-safety
reasoning, not regulatory reasoning, which is why they are genuine rather than
decorative. **This ADR converts them from properties the product happens to
have into properties it is not permitted to lose.**

Each is now pinned by a test in `tests/regulatory-invariants.test.js`. A change
that breaks one fails the build.

| # | invariant | why it is load-bearing |
|---|---|---|
| **R1** | **The reasoning is always inspectable.** Every shown condition carries its matched evidence, what is missing, what contradicts it, and — when force-surfaced — why. | This is the "independently review the basis" property. It is the single most important one. |
| **R2** | **The engine is deterministic and reproducible.** Same findings, same knowledge base, same output — provable by replay. | A system whose output cannot be reproduced cannot be validated, audited, or defended. |
| **R3** | **No AI in the diagnostic path.** LLM use is strictly downstream of the engine (ADR-004). | An unexplainable, non-reproducible component in the diagnostic path defeats R1 and R2 together. |
| **R4** | **No autonomous action, ever.** Entopic never prescribes, never refers, never orders, never books, never notifies a third party. It writes to the record and to the screen. | Autonomous action is the clearest line into higher-risk territory in every regime. |
| **R5** | **Advisory framing is present wherever a differential is shown**, including printed and exported output. | The framing must survive the document leaving the building. |
| **R6** | **Red flags are un-suppressible** (existing guardrail). | A safety system with an off switch is a different risk class. |
| **R7** | **No patient-facing diagnostic output.** Every output is addressed to a clinician. | Direct-to-patient diagnostic software is regulated far more strictly, near-universally. |
| **R8** | **Unverified clinical content is visibly unverified** (ADR-009). | Provisional knowledge presented as settled is a misrepresentation independent of any regime. |

**R1–R8 are not a compliance strategy. They are the product.** If a future
feature requires breaking one, that feature changes what Entopic *is*, and the
decision belongs in a new ADR — not in a pull request.

### 3. Lifecycle evidence accumulates from now, not from the point of need

The following are produced continuously, because they cannot be produced
retrospectively:

| evidence | where it lives today | status |
|---|---|---|
| Design history and rationale | ADRs + `CHANGELOG.md` (what/why/divergence) | ✅ already the practice |
| Risk management | Phase 2 clinical safety register, Phase 6 threat model | ◐ exists; not in a recognised format |
| Requirement → test traceability | golden vignettes, red-flag register pinned to code, threshold ratchet | ◐ strong in parts, not indexed |
| Change control on clinical logic | KB sign-off workflow, `review_status`, overlay provenance | ✅ |
| Validation records | 971 automated tests; **no clinical validation against outcomes** | ◐ **the real gap** |
| Post-market surveillance | feedback channel, audit trail, deterministic replay | ◐ mechanism exists, no process |
| Software item identification | KB version stamped on every visit; `store_version`; migration ledger | ✅ |

**The one genuine gap is clinical validation.** No amount of engineering
discipline substitutes for evidence that the differential is *right*, and 394
of 394 conditions remain clinically unverified. That is tracked separately and
is the founder's work, not mine.

---

## What was rejected, and why

**"Declare it exempt and move on."**
Rejected. It is the cheapest option today and the most expensive if wrong, and
neither the founder nor I are qualified to make the declaration. Writing an
exemption claim into the product would also create a *false* record — the same
failure class as an invented citation, which this project has already had once.

**"Assume it is a Class II device and start a QMS now."**
Rejected as premature. ISO 13485 and IEC 62304 in full are a heavier commitment
than a solo-founder product can carry, and adopting them before the product has
a customer would consume the runway that is supposed to produce one. The
discipline that matters (evidence you cannot retrofit) is adopted; the
certification apparatus is not.

**"Wait for a lawyer before deciding anything."**
Rejected — this is the status quo that was costing money silently. The legal
question still waits for a lawyer. The engineering question does not, and
conflating them is what kept this open for eight phases.

---

## Consequences

**Immediately:**
- R1–R8 are enforced by tests. Breaking one is a build failure with a message
  pointing here.
- No feature may add autonomous action, hide the engine's reasoning, put an
  LLM in the diagnostic path, or address diagnostic output to a patient,
  without superseding this ADR.
- The regulatory-readiness position is written down and reviewable, so a
  consultant can be briefed in an hour rather than a month.

**Accepted costs:**
- Some features become harder. Auto-referral, patient-facing summaries with a
  differential in them, and an LLM-generated impression are all now
  ADR-level decisions rather than product decisions. **That is the intended
  effect**, not a side effect.
- Continuous documentation overhead. Already the practice; now it is load-
  bearing.

**Explicitly NOT resolved by this ADR:**
- Whether Entopic is a medical device in India, the EU, the UK or the US.
- Whether a QMS is required.
- What may lawfully be claimed in marketing.

**These still require a regulatory consultant, and this ADR is what should be
put in front of them.** It is a description of what the product does and what
it refuses to do — which is the input a classification opinion actually needs,
and is the thing that did not exist before today.

---

## Revisit when

- **Before the first sale outside the founder's own practice** — with a
  consultant, in the target jurisdiction. Unchanged from the original entry,
  and now much cheaper to do.
- Immediately, if any feature is proposed that would break R1–R8.
- On entering a new jurisdiction.
- If the product is ever offered directly to patients (R7) — that is a
  different product and needs a different answer.

**Record the outcome here when a qualified person gives one**, with their name,
their jurisdiction, the date, and what they saw. Until that line exists in this
file, Entopic has an engineering posture and no legal opinion, and it should
say so to anyone who asks.
