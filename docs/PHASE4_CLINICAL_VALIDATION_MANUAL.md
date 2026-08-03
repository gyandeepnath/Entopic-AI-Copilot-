# Entopic — Clinical Validation Manual

**Phase 4 · 2026-08-02**

How to establish, and keep establishing, that the reasoning engine is
clinically correct. Written to be started now at solo scale and to survive
becoming a multi-site obligation later.

---

## 0. The distinction this manual exists to enforce

**Verification** asks: does the engine do what we said it does?
**Validation** asks: is what we said it does clinically right?

Entopic is strong on the first and has done none of the second. 780 automated
tests prove the arithmetic, the determinism, the ordering and the safety
properties. **Not one of them establishes that a single differential is
clinically correct**, because that is not a thing software can assert about
itself. It needs a clinician.

That is not a criticism of the tests. It is the reason this manual is separate.

---

## 1. The five levels

Each level answers a different question. A level cannot substitute for the one
below it.

| Level | Question | Who | State today |
|---|---|---|---|
| **L1 Unit** | Does the arithmetic do what it claims? | automated | ✅ 780 tests |
| **L2 Rule** | Does each rule fire when it should, and only then? | automated + clinician | ⚠️ partial |
| **L3 Condition** | Is this condition's knowledge clinically right? | clinician | ❌ 0 / 394 |
| **L4 Case** | On a real presentation, is the differential right? | clinician | ❌ none |
| **L5 Outcome** | Did the patient turn out to have it? | prospective | ❌ none |

**L3 is the bottleneck and always will be.** L4 and L5 are worthless without it,
because a case review against unverified knowledge only tells you the engine
faithfully applied rules nobody checked.

---

## 2. L1 — Unit validation (in place)

780 automated tests. What they genuinely establish:

- **Determinism** — 20 identical runs produce identical output
- **Refusal to guess** — empty visit and age-alone both yield zero differentials
- **Scoring arithmetic** — weights, saturation, multiplicative penalties
- **Ordering** — score plus a bounded urgent nudge, deterministic tie-breaks
- **Safety separation** — alerts computed independently of scoring
- **Overlay containment** — a user condition cannot outrank a core red flag
- **No model, no network** in the diagnostic path

**Keep.** Every one of these is a property that could regress silently.

---

## 3. L2 — Rule validation

**For each rule, three cases are required:**

1. **Positive** — the exact evidence the rule needs. It must fire.
2. **Negative** — evidence that should NOT trigger it. It must not fire.
3. **Boundary** — one token short of the requirement. It must not fire, or must
   fire measurably weaker.

The negative case is the one usually skipped and the one that matters: a rule
that fires on everything passes every positive test ever written.

**Priority order:**
1. The 17 hand-written alert rules — highest consequence, smallest set
2. The decision-tree gates
3. The 63 urgent conditions
4. The 129 hardcoded numeric thresholds (F-4)
5. Everything else

**Concrete gap, measured:** 51 of 63 urgent conditions raise no alert banner
(Excellence Report F-1). Whatever the fix, each of the 63 needs an explicit
statement of whether it is *supposed* to raise one.

---

## 4. L3 — Condition validation (the bottleneck)

The eight assertions a reviewer makes are already defined in the Knowledge
Governance Manual §4 and are not repeated here. What this manual adds is **how
to make 394 of them survivable**:

**Batch by domain, not by list order.** Reviewing 30 corneal conditions in one
sitting is far faster than 30 unrelated ones — the reviewer stays in one mental
model.

**Start with the 109 common conditions.** They are already identified in
`knowledge/common-conditions.js` and they carry almost all the clinical weight.
A routine dry-eye presentation returns three results, all of them common.

**Then the 63 urgent ones.** Highest consequence per condition.

**Then the remaining 222** — the long tail, lowest value per hour.

**Sequencing matters more than it looks.** ~109 + 63 = 172 conditions, roughly
9 hours, covers the overwhelming majority of real encounters and every red flag.
The last 222 are the ones nobody sees this month.

**⚠ Do this after adding the evidence field (Phase 3 KD-01).** A reviewer with
a stated source to agree or disagree with works faster and produces a more
defensible result than one working from recall.

---

## 5. L4 — Case validation

**Design.** 100 real, de-identified encounters. For each: the clinician's own
diagnosis, and the engine's differential.

**Measure:**
| Metric | Definition |
|---|---|
| Top-1 agreement | Engine's leader = clinician's diagnosis |
| Top-3 containment | Clinician's diagnosis anywhere in the top 3 |
| **Miss rate** | Clinician's diagnosis absent entirely |
| **Dangerous miss** | An urgent condition the clinician diagnosed and the engine did not surface |
| Noise rate | Differentials the clinician considers implausible |

**Top-3 containment is the honest headline for an advisory tool, not top-1.**
The engine's job is to make sure the right answer is *in front of you*, not to
be right first.

**Dangerous misses are the only metric with a hard threshold: zero.** Any
dangerous miss halts the release and becomes a rule fix plus a regression test.

**⚠ Do not run L4 before L3.** Agreement against unverified knowledge measures
nothing.

**Now feasible, and it was not before:** visits record `engine_tokens`, so a
historical case can be re-scored exactly as it was, rather than re-derived
through today's rules.

---

## 6. L5 — Outcome validation

The real question — did the patient have it? — needs follow-up data, a confirmed
diagnosis field, and time. Not achievable yet, and the honest position is to say
so rather than to approximate it.

**Prerequisites:** a structured confirmed-diagnosis field distinct from the
engine's suggestion (Phase 2 CS-08); follow-up linkage; and enough volume.

**Only after L5 may the score legitimately be called a probability.** Until
then it is a match strength, which is what it now says.

---

## 7. Regression validation

**The rule: every clinical defect becomes a permanent test.**

Already followed, and it is one of the better habits in this codebase — the
hydroxychloroquine/chloroquine bug, the "no steroids" negation bug, the
unmeasured-refraction "plano" bug and the overlay containment guarantee all have
tests that fail if they return.

**The golden set.** `tests/engine-golden.test.js` pins known-good differentials.
It must grow with every L4 case and every clinical fix. A change to the KB or
the weights that alters a golden case must fail loudly — that is not an
inconvenience, it is the point.

**⚠ Missing: deterministic replay.** Re-running a historical visit against the
KB version that produced it is now *achievable* (tokens are recorded) but not
built. It is what turns "we think this change is safe" into "we ran it against
2,000 real historical visits and 3 differentials changed, here they are". ~40 h,
and it is the highest-value validation tooling remaining.

---

## 8. Multi-site validation (later, and gated)

Not now. When it comes, it needs: consent covering it (the ledger exists), a
stable condition identifier (Phase 3 KD-07 — ICD is shared across 56 conditions
and cannot serve), a site identifier on every record (ADR-012's obligation), and
ethics approval.

**⚠ Blocked on ADR-011.** Multi-site clinical validation of a diagnostic aid is
close to the definition of a clinical investigation.

---

## 9. Roadmap

| | Stage | Effort | Gate |
|---|---|---|---|
| 1 | Evidence field on the schema | 120 h | — |
| 2 | **L3 on the 109 common conditions** | ~6 h clinical | ⚠️ founder |
| 3 | **L3 on the 63 urgent conditions** | ~3 h clinical | ⚠️ founder |
| 4 | L2 on the 17 alert rules + gates | 40 h | after 3 |
| 5 | Deterministic replay harness | 40 h | — |
| 6 | L3 on the remaining 222 | ~11 h clinical | — |
| 7 | L4 on 100 real cases | 60 h + clinical | after 6 |
| 8 | L5 outcome linkage | 200 h | data volume |
| 9 | Multi-site | 300 h | ⚠️ ADR-011 |

**Stages 2 and 3 are nine hours of the founder's time and they unlock
everything below them.** Nothing else in this manual can honestly begin first.
