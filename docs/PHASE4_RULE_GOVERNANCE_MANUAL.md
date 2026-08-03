# Entopic — Rule Governance Manual

**Phase 4 · 2026-08-02**

How reasoning rules are changed, by whom, with what evidence, and what may
never change. Complements the Knowledge Governance Manual (which governs
*content*); this governs *logic*.

---

## 1. Where the rules actually live — measured

A "rule" in Entopic is one of six things, and they are governed differently
because they carry different consequences.

| # | Kind | Where | Count | Reviewable by a clinician today? |
|---|---|---|---|---|
| R1 | **Condition knowledge** | `knowledge/*.js` | 394 | ✅ yes — KB editor + sign-off |
| R2 | **Scoring weights** | `SCORE_WEIGHTS`, engine.js | 12 | ❌ no |
| R3 | **Alert rules** | `computeAlerts()` | 17 | ❌ no |
| R4 | **Decision-tree gates** | `applyDecisionTree()` | ~12 | ❌ no |
| R5 | **Numeric thresholds** | scattered in engine.js | **129** | ❌ no |
| R6 | **Overlay conditions** | `kb_overlays` store | user-authored | ⚠️ marked unreviewed |

**The governance problem in one line: a clinician can sign off R1 and nothing
else.** They can verify 394 conditions and still not have seen the 17 rules that
decide whether an alert fires, the 12 weights that decide ranking, or the 129
thresholds that decide when a measurement counts as abnormal.

That is the single most important thing this manual records.

---

## 2. Change classes

| Class | Examples | Requires | May be reverted by |
|---|---|---|---|
| **Cosmetic** | reasoning wording, labels | Engineer | Engineer |
| **Structural** | refactor with no behaviour change, proven by golden tests | Engineer | Engineer |
| **Tuning** | a `SCORE_WEIGHTS` value | Engineer **+ founder**, with golden-set diff | Founder |
| **Clinical** | a condition's req/sup/con; a threshold | Domain reviewer **+ founder** | Founder |
| **Safety** | anything touching alerts, gates, or an urgent flag | **Founder only, never delegated** | Founder only |

**Safety changes are never delegated.** Removing or weakening an alert is the
most dangerous edit available in this system, and it is the one most likely to
look like a small improvement ("this fires too often").

---

## 3. What may never change without an explicit, recorded decision

These are the properties the whole product rests on. Each is asserted by a test;
each test is load-bearing and must not be deleted to make a change pass.

1. **The engine is deterministic.** No randomness, no clock, no network, no
   model in scoring. *(20-run identity test; architecture contract.)*
2. **Alerts are computed independently of scoring.** Nothing that happens to
   the differential may alter `computeAlerts()`.
3. **Red flags are un-suppressible.** No rule, exclusion, weight or user
   condition may remove an alert.
4. **The engine refuses to guess.** Empty input and demographics alone produce
   zero differentials.
5. **Every differential is explainable.** Matched, missing, contradicted.
6. **Overlays never outrank core.** Separate scoring pass, concatenated below.
7. **No LLM in the diagnostic path.** *(ADR-004.)*

**If a change requires breaking one of these, it is not a change — it is a new
product, and it needs an ADR.**

---

## 4. The procedure for changing a rule

```
   proposed change
         │
         ▼
   1. WHY, in writing            what clinical problem does this solve?
         │
         ▼
   2. GOLDEN DIFF                run the golden set. What differentials moved?
         │                        A tuning change with zero diff is either
         │                        pointless or untested.
         ▼
   3. REPLAY  (when built)       run against real historical visits.
         │                        How many real differentials change? Which?
         ▼
   4. REVIEW                     by class (§2)
         │
         ▼
   5. REGRESSION TEST            the case that motivated the change becomes
         │                        a permanent test
         ▼
   6. VERSION                    KB_VERSION or APP_VERSION, per what moved
```

**Step 2 is the one that gets skipped and the one that catches things.** A
weight change that moves no golden case has not been demonstrated to do
anything; a weight change that moves forty needs a clinician to look at them.

---

## 5. Specific governance per rule class

### R2 · Scoring weights (12 constants)
All in one documented object — good. Each carries a comment explaining what it
is for, and two carry the failure that motivated their bounds.

**Rule:** a weight change requires a golden-set diff attached to the commit, and
founder sign-off. **Never tune a weight to fix one case** — that is overfitting
to an anecdote and it will move dozens of others silently.

### R3 · Alert rules (17)
The highest-consequence code in the product.

**Rules:**
- Adding an alert: domain reviewer + founder.
- **Removing or narrowing one: founder only, with the reason recorded
  permanently.** Never in a commit that also does something else.
- Every alert rule needs a positive, a negative and a boundary test (Validation
  Manual §3).

**Open issue (Excellence Report F-1):** 51 of 63 urgent conditions raise no
alert. Each of the 63 needs a recorded statement of whether it should.

### R4 · Decision-tree gates
Deliberately over-trigger — they force-surface safety candidates regardless of
score. **That asymmetry is correct and must be preserved.** A gate that fires
too often costs attention; a gate that fails to fire costs a diagnosis.

**Rule:** narrowing a gate is a safety change.

### R5 · The 129 numeric thresholds
Currently ungoverned, which is the real gap. They are clinical assertions
("above this IOP, treat as raised") living in JavaScript where no clinician will
ever see them.

**Rule until they are externalised:** any change to a numeric comparison in
`js/engine.js` is treated as a **clinical** change.
**Target:** move the clinical ones into reviewable knowledge (~40 h) so they
enter the sign-off workflow.

### R6 · Overlay conditions
Governed by construction rather than by procedure — they cannot outrank core,
cannot use exclusions, cannot rename a shipped condition, and are permanently
marked unreviewed.

**The one procedural rule:** an overlay becomes core knowledge **only** through
the review workflow, never by promotion in place. Publishing to a clinic is not
the same as making it core.

---

## 6. Deprecating a rule

Rules are **never silently deleted**. A removed rule is recorded with what it
did, why it went, and when — because visits diagnosed while it was live still
exist, and their reasoning must remain reconstructible.

Applies with particular force to alerts: "we removed this alert in March" must
be answerable years later.

---

## 7. Who may do what

| | Cosmetic | Structural | Tuning | Clinical | Safety |
|---|---|---|---|---|---|
| Engineer | ✅ | ✅ | propose | propose | propose |
| Domain reviewer | — | — | propose | ✅ with founder | propose |
| Founder (Knowledge Owner) | ✅ | ✅ | ✅ | ✅ | ✅ **only** |
| Clinician user | — | — | — | overlay only | overlay only, marked |

---

## 8. Adopt in this order

**Now:**
1. Write the seven invariants (§3) where an engineer will read them — they are
   currently enforced by tests but not stated as policy.
2. Golden-set diff required on every tuning and clinical commit.
3. Treat every numeric-threshold change as clinical until R5 is externalised.

**Next:**
4. Deterministic replay (~40 h) — turns step 3 of §4 from aspiration into
   evidence.
5. Externalise the clinical thresholds (~40 h).
6. Resolve F-1: a recorded decision for each of the 63 urgent conditions.
