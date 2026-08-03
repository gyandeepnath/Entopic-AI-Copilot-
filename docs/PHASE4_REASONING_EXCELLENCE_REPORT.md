# Entopic — Deterministic Reasoning Excellence Report

**Phase 4 · 2026-08-02 · v1.5.0, engine 2,131 lines, KB 394 conditions**
Companions: `PHASE4_CLINICAL_VALIDATION_MANUAL.md`,
`PHASE4_RULE_GOVERNANCE_MANUAL.md`, `PHASE4_AI_INTEGRATION_STRATEGY.md`.

---

## 0. Method, and the standing caution

Every number below was produced by **running the engine**, not by reading it.
Each measurement states how it was made so it can be re-run.

The caution I have repeated in every phase applies here too, and has earned its
place: across this project **seven of my measurement scripts produced confident,
false findings before I checked them**. In this phase alone I nearly reported
that a chemical eye burn produces no warning at all. It does — "Chemical Eye
Burn · URGENT" is the leading impression. What it does *not* produce is the
dedicated alert banner, which is a real finding but a very different one. The
difference between those two sentences is the difference between a useful report
and a harmful one.

---

## 1. The engine as it actually is

Thirteen stages, one file, no network, no model.

```
  INPUT                    tokens                 KNOWLEDGE
  ─────                    ──────                 ─────────
  symptoms ─┐
  findings ─┤
  measures ─┼──▶ 1. collectTokens ──▶ 3. normalize ──▶ 4. temporal weight
  history  ─┤        (11 sources)        (aliases)        (acute/chronic)
  meds     ─┘                                   │
                                                ▼
                                        5. decision-tree gating
                                           (force-surface safety
                                            candidates)
                                                │
                                                ▼
                                        6. route selection
                                           (9 routes; urgent route
                                            self-derives from the KB)
                                                │
                                                ▼
                            ┌───────────────────┴─────────────────┐
                            ▼                                     ▼
                  7. score CORE conditions              8b. score OVERLAY
                     (req/sup/con/tests/temporal)            conditions
                            │                                     │
                            ▼                                     │
                  8. apply exclusions                             │
                            │                                     │
                            ▼                                     │
                  sort: score + bounded urgent nudge              │
                            │                                     │
                            └──────────────▶ MERGE ◀──────────────┘
                                    core first, overlays appended
                                                │
        ┌───────────────────┬───────────────────┼──────────────┬─────────────┐
        ▼                   ▼                   ▼              ▼             ▼
   9. differential    10. ALERTS          11. nudges    12. next-test   13. provenance
      (top 8 + 4)      (computed             (missing       (discriminating   (KB version,
       w/ evidence       INDEPENDENTLY)       steps)          tests)          tokens, overlays)
```

**The single most important structural property**, and it is correct: **alerts
are computed independently of scoring.** Nothing that happens to the
differential — a bad score, a user-authored condition, an exclusion — can alter
`computeAlerts(tokens)`. That is the right separation and it should never be
merged.

### Scoring, precisely

```
  base = 0.60 · (reqMatched / reqTotal)
       + 0.25 · supMatched/(supMatched + 2)      saturating
       + 0.15 · testsMatched/(testsMatched + 1)  saturating

  × 0.45  per ABSENT required token       (multiplicative — "required" means required)
  × 0.55  per matched contradiction
  × 1.08  temporal match   /  × 0.85 temporal mismatch
  × 0.50  if the whole encounter has < 2 tokens
```

All twelve constants live in one `SCORE_WEIGHTS` object with a comment on each.
That is genuinely good practice — better than most clinical scoring code — and
it is the thing that makes the engine tunable without being editable by accident.

**Sorting.** Score, plus a bounded `+0.08` nudge for urgent conditions that
have already cleared `0.15`. Ties break on KB index, so ordering is independent
of iteration order. Both are documented in the source with the reasoning for
the bounds, including the failure they were introduced to fix (a 0.21 urgent
floating above a 0.79 real match).

---

## 2. Determinism — measured, and it holds

| Test | Result |
|---|---|
| 20 identical runs, same input | **identical output**, byte for byte |
| Tie-breaking | deterministic (KB index, not iteration order) |
| Any randomness in the engine | **none** — no `Math.random`, no `Date.now` in scoring |
| Network in the diagnostic path | **none** — asserted by `tools/audit.js` |
| Model inference in scoring | **none** — asserted by `tests/architecture.test.js` |

**Score: 10/10.** This is the property everything else rests on, and it is
unqualified.

---

## 3. Explainability — measured, and it is excellent

Ran a routine case and inspected every returned differential:

| Every differential carries | Coverage |
|---|---|
| Which findings matched | **3 / 3** |
| Which findings are still missing | **3 / 3** |
| Which findings argue against | **3 / 3** |
| A human-readable reasoning string | **3 / 3** |
| An ICD-10 code | **3 / 3** |
| A confidence band | **3 / 3** |

Sample, verbatim from the engine:
> `Moderate-High — Matched: dryness, burning`

And the panel states, on every rendering:
> *Advisory only — clinical correlation required. Not a definitive diagnosis.*

**A clinician can always answer "why did it say that?"** — which findings drove
it, which are absent, which argue against, and how strong the match is. Very few
clinical decision support systems can do this, and none that use a model can do
it honestly.

**Score: 9/10.** The one point withheld is §5 below.

---

## 4. Stress testing — measured

Nine adversarial cases. **None threw. None produced junk.**

| Case | Differentials | Alerts | Behaviour |
|---|---|---|---|
| Empty visit | **0** | 0 | ✅ refuses to guess |
| Age only (78) | **0** | 0 | ✅ demographics alone are not evidence |
| One symptom | 3 | 0 | reasonable, low confidence |
| Contradictory acute+chronic | 3 | 0 | scores through it — see §5 |
| Paediatric (4y) | 4 | 0 | age-appropriate |
| Elderly + sudden vision loss | 3 | **1** | ✅ CRAO leads, alert fires |
| Chemical splash | 1 | **0** | ⚠️ see §5 |
| Screening, no findings | **0** | 0 | ✅ |
| Six symptoms at once | 8 | 1 | Acute Angle Closure leads |

"Refuses to guess" is worth pausing on. **Zero differentials from an empty
visit, and zero from age alone.** Most systems would offer something. Offering
nothing is the correct and harder behaviour.

---

## 5. The findings

### F-1 · The alert banner covers 12 of 63 urgent conditions — **the headline**

**Measured** by feeding each of the 63 urgent conditions exactly its own
required tokens and counting alerts:

- **63** conditions carry `urgent: true`
- **12** raise at least one alert
- **51** raise **none**

Silent ones include Chemical Eye Burn, Open Globe Injury, Retinal Detachment,
Microbial Keratitis, Acute Retinal Necrosis, Corneal Graft Rejection.

**What the clinician actually sees — verified in a browser.** For a chemical
splash the advisory panel shows:

> LEADING IMPRESSION
> **Chemical Eye Burn · URGENT**

So they are **not blind**, and it would be wrong to say the engine misses it.
What does not appear is the **Clinical Alerts section** — the dedicated,
top-of-panel, un-missable red-flag banner.

**The cause is drift, and it is the same shape as three defects already found in
this codebase** (three protection lists, two drug-matching copies, the WNL
templates): two mechanisms that should agree, maintained separately.
`computeAlerts()` is **17 hand-written rules**; the urgent flag is a KB field on
63 conditions. Nothing connects them and nothing notices.

**Recommendation.** Derive a floor from the knowledge: any urgent condition
appearing in the differential above a threshold raises an alert naming itself,
*in addition to* the 17 hand-written symptom-level rules — which are more
specific and must stay. **Do not replace the hand-written rules with a derived
rule**; they fire on the symptom before any condition scores, which is earlier
and therefore better. ~24 h. **⚠ The threshold is a clinical judgement.**

### F-2 · No contradiction detection
A visit recording acute onset *and* chronic course produces a differential with
no comment. Ten years of clinical software says the most valuable thing a system
can do with contradictory data is say so. The engine currently scores through it
via `temporal_mismatch × 0.85` and moves on. ~30 h.

### F-3 · Confidence bands are unvalidated
`interpretConfidence(score)` maps a score to "Moderate-High". Nothing has
calibrated those bands against outcomes. This is already partly mitigated — the
number is now labelled "match strength, not a probability" — but the *words*
still carry more authority than the evidence supports. **⚠ Founder: the band
boundaries are a clinical judgement.**

### F-4 · 129 hardcoded numeric comparisons in the engine
Measured by grepping for numeric conditionals. Some are structural (array
bounds); many are clinical thresholds — IOP cut-offs, MD values, age bands —
living in JavaScript rather than in reviewable knowledge. A clinician signing
off 394 conditions is **not** signing these off, and cannot see them. Same
finding as the Phase 3 note on red-flag rules (KD/CS-04). ~40 h to externalise
the clinical ones.

### F-5 · Gating reasons are computed but under-surfaced
`_gateReason` records *why* a condition was force-surfaced ("safety gate:
flashes+floaters") and reaches `reasoning`, but is not given the prominence it
deserves in the UI. It is the single most explanatory field the engine produces
and it is buried in a string. ~8 h.

### F-6 · No "what changed?" between engine runs
The engine re-runs on every input, but nothing tells the clinician *what the new
finding did*. "Adding photophobia moved Anterior Uveitis from 4th to 1st" is
computable from two consecutive `ENGINE_STATE.results` and would make the
reasoning visible as it happens. ~24 h.

---

## 6. False positives and false negatives

Assessed per pathway. **These are structural risks, not measured error rates** —
measuring those needs outcome data the product does not yet have (KD-09).

| Pathway | FP risk | FN risk | The controlling factor |
|---|---|---|---|
| Symptom-driven differential | Moderate | Low | Requires all `req` tokens; `0.45×` per missing one |
| Decision-tree gating | **Higher by design** | Low | Force-surfaces safety candidates — deliberate over-triggering |
| Urgent alerts (12 covered) | Low | **F-1** | Hand-written, specific |
| Urgent conditions (51 uncovered) | Low | **Moderate — F-1** | Shown in the differential, no banner |
| Medication risk tokens | Low | Low | Word-boundary matched, negation-aware (fixed this project) |
| Exclusions | Low | Low | Used by only 12 of 394 — barely exercised |
| Overlay conditions | **User-determined** | Low | Cannot outrank core; cannot suppress |

**The most dangerous residual pattern is not in the engine.** It is that 394 of
394 conditions are clinically unverified, so every score rests on unreviewed
inputs. The arithmetic is sound; the numbers going in have not been checked.

---

## 7. Clinical trust

**Can the engine explain itself when a clinician disagrees?** Yes — matched,
missing, contradicted, and the gate reason. Better than most.

**Can a clinician challenge it?** Now, yes: they can author their own condition
and see it behave against their own past visits (shipped this session). What
they still cannot do is **disagree with a specific core condition and have that
recorded**. A "this is wrong, because…" button feeding the review queue is
missing and would be the highest-value trust feature remaining. ~30 h.

**Can reasoning evolve without becoming inconsistent?** Partly. `KB_VERSION` is
separate from `APP_VERSION`, sign-offs are hash-bound, visits now record
`engine_tokens` and `kb_provenance`. What is missing is **deterministic replay** —
re-running a historical visit against the KB version that produced it. Now
achievable because the tokens are stored. ~40 h.

---

## 8. Scorecard

| Dimension | Score | Justification |
|---|---|---|
| **Determinism** | **10** | 20 identical runs, no randomness, no clock, no network, no model. Asserted by tests. |
| **Explainability** | **9** | Every differential carries matched / missing / contradicted / reasoning / ICD. Gate reasons under-surfaced (F-5). |
| **Transparency** | **9** | All 12 scoring weights in one documented object; sort rules stated with their reasoning. |
| **Safety** | **6** | Alerts computed independently — the right architecture. Held down by F-1: 51 of 63 urgent conditions raise no banner. |
| **Clinical correctness** | **unscored** | 0 of 394 conditions verified. Cannot be scored, only measured. Scoring it would be dishonest. |
| **Maintainability** | **7** | Data-driven, weights centralised, 780 tests. 129 hardcoded thresholds and a 2,131-line file work against it. |
| **Educational value** | **9** | Full evidence trail powers quiz, OSCE, simulation, casebook from one engine. Rare. |
| **Research value** | **6** | Deterministic and now token-recorded, so replay is achievable. No outcomes to calibrate against. |
| **Future AI readiness** | **9** | Structured, deterministic, inspectable — near-ideal grounding and verification substrate. |
| **Future graph readiness** | **7** | Token↔condition edges are already traversed; condition-condition relations absent. |
| **Clinical trust** | **7** | Explains itself well; cannot yet be formally disagreed with. |
| **Scalability** | **9** | 0.7 ms over 394 conditions; cost scales with evidence, not KB size. |

**Overall: 8.0 / 10** — the strongest component in the product by a clear margin.

---

## 9. The final questions

**Would I trust this engine in private practice?** As an advisory second opinion
beside a clinician who knows the subject — **yes, today**. Its reasoning is more
inspectable than most commercial CDSS.

**In eye hospitals?** For triage and documentation support, yes. Not for
specialist decisions — the specialty depth is not there (Phase 2, glaucoma
23 conditions vs retina 93).

**In teaching hospitals and universities?** **This is its best fit.** The
evidence trail is a teaching instrument. Gated on server-enforced roles.

**In community screening?** Yes, with F-1 closed. Offline-first and refusing to
guess are exactly right for screening.

**Would I let clinicians rely on it?** Rely, no. Consult, yes. That distinction
is already the product's stated position and the UI holds it consistently.

**Would I let students learn from it?** Yes — and they should learn *from the
evidence trail*, not the ranking. It teaches how to reason, which is the harder
and more valuable thing.

---

## 10. Effort to world-class

| | Item | Effort |
|---|---|---|
| 1 | **F-1** — derive an alert floor from urgent conditions | 24 h ⚠️ |
| 2 | Verify the 394 conditions | ~20 h founder |
| 3 | **F-4** — clinical thresholds out of code into knowledge | 40 h |
| 4 | **F-2** — contradiction detection | 30 h |
| 5 | Deterministic replay against a historical KB version | 40 h |
| 6 | "I disagree, because…" into the review queue | 30 h |
| 7 | **F-6** — what-changed between runs | 24 h |
| 8 | **F-5** — surface gate reasons properly | 8 h |
| 9 | **F-3** — calibrate or re-word confidence bands | 16 h ⚠️ |
| 10 | Red-flag rules as data (Phase 3 CS-04) | 40 h |
| | **Sub-total — the ten that matter** | **~272 h + 20 h clinical** |
| | Full Top-200 (validation, specialty depth, graph, calibration) | ~1,600 h |

**The engine is already good. It is roughly 270 engineering hours and 20
clinical hours from being genuinely excellent** — and the clinical hours matter
more than the engineering ones, because a perfectly reasoning engine over
unverified knowledge is a perfectly reasoning engine you cannot trust.
