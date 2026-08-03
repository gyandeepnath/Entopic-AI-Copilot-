# Entopic — Future AI Integration Strategy

**Phase 4 · 2026-08-02 · evaluation and strategy. No AI implemented.**

---

## 0. The position, stated once

**The deterministic engine diagnoses. AI never does.** That is ADR-004, it is
enforced by tests, and nothing in this document proposes changing it.

What this document argues is the less obvious half: **the deterministic engine
is not merely compatible with AI — it is the thing that makes AI safe to use
here at all.** Most clinical AI has no ground truth to check itself against.
Entopic has one, and that is a genuinely unusual asset.

---

## 1. Why this engine is an unusually good substrate

Measured properties, from the Excellence Report:

| Property | Measured | Why it matters for AI |
|---|---|---|
| Deterministic | 20 identical runs → identical output | A verifier that varies cannot verify |
| Fully explainable | 100% of differentials carry matched / missing / contradicted | Structured facts to ground on, not prose |
| Refuses to guess | 0 differentials from empty input or age alone | The engine's silence is itself a signal |
| Structured vocabulary | 481 tokens, one registry, machine-safe | A clean interface for extraction |
| Tokens recorded per visit | `V.engine_tokens` (added this session) | Historical reasoning is reconstructible |
| Provenance stamped | `kb_provenance` | Answers "which knowledge said this?" |
| No network in the path | asserted by audit | AI can fail without the exam failing |

**The last row is the strategic one.** Because reasoning is fully local and
deterministic, every AI use below is *optional*. The exam works with the model
absent, broken, rate-limited or switched off. Almost no clinical AI product can
say that, and it is the property to protect above all others.

---

## 2. Where AI belongs — and where it does not

```
   BEFORE the engine            THE ENGINE            AFTER the engine
   ─────────────────            ──────────            ────────────────
   speech → structured          deterministic         explain in plain words
   free text → tokens           scoring               summarise the encounter
   scanned letter → fields      NO AI HERE            draft the referral letter
                                EVER                  cross-check for omissions
        ▲                                                    ▲
        │                                                    │
   suggestions the                                    grounded ONLY in what
   clinician confirms;                                the engine already
   nothing enters the                                 produced; never adds a
   record unconfirmed                                 clinical claim
```

**The rule for everything on the right: the model may re-express engine output.
It may never add to it.** If a summary contains a condition the engine did not
produce, that is a defect, and it is mechanically detectable — which is the
whole point of having a deterministic core.

---

## 3. The eight uses, ranked by value per unit of risk

### A-1 · Verification — the model checks itself against the engine ⭐
**The most valuable and least appreciated use.** Any AI output that names a
clinical condition can be checked, automatically and deterministically, against
`V.dxList` and `KNOWLEDGE_ALL`. A named condition the engine did not produce is
flagged before the clinician ever sees it.

This is hallucination prevention that actually works, and it exists because the
engine is deterministic. **Build this before anything else that generates text.**
~40 h.

### A-2 · Better free-text and speech capture ⭐
The highest *clinical* value. Chairside typing is the biggest interruption to
the patient interaction, and `js/speech.js` already exists.

The model converts speech or prose into **candidate tokens the clinician
confirms**. Nothing enters the record unconfirmed. If the model is wrong the
clinician sees the wrong chip and does not tap it — a visible, cheap failure.
~80 h. **⚠ Cloud speech means patient voice leaving the clinic: a consent,
privacy and cost decision, not an engineering one.**

### A-3 · Explaining the engine to a patient
The engine's output is clinician-facing. A patient-readable version of *what was
found and what happens next*, grounded strictly in the engine's own output,
closes the Phase 2 gap that patients leave with nothing. ~30 h.

### A-4 · Drafting the referral letter
The engine already knows exactly which findings drove the decision and which
conditions were excluded. That is precisely what a receiving ophthalmologist
wants and rarely gets. The model formats; it does not decide. ~20 h.

### A-5 · Completeness cross-check
"You recorded flashes and floaters but no dilated fundus examination." The
engine's nudges do a structural version; a model could do a presentation-aware
one. **Advisory only, never blocking.** ~40 h.

### A-6 · Teaching dialogue
A student asks "why not uveitis?" and gets an answer grounded in the engine's
own `contradicted` list. Genuinely valuable, and safe because the answer is
already computed — the model only phrases it. ~40 h.

### A-7 · Knowledge authoring assistance
Drafting a *proposal* for a new condition — never publishing one. Enters the
same review queue as any human proposal, marked as machine-drafted. ~40 h.
**⚠ Every clinical claim still needs a human source. This is where fabricated
citations would enter, and this project has already had one such incident
(`js/risk-calc.js`).**

### A-8 · Retrieval over the knowledge base
"Which conditions present with RAPD and pain on eye movement?" is answerable
today by traversal, without a model. **Do not add AI to a query the engine can
already answer exactly.**

---

## 4. What must never be done

| | Why |
|---|---|
| A model producing or ranking a differential | ADR-004. Not inspectable, not reproducible, not signable, not defensible. |
| A model setting or clearing an urgent flag | The most safety-critical decision in the product. |
| A model writing to the record unconfirmed | Manufactures documentation of an examination that may not have happened. |
| A model as a fallback when the engine is silent | The engine's silence is a *finding*: not enough evidence. Filling it destroys the most valuable safety property in the product. |
| Patient identifiers in a prompt | Already enforced — `tests/llm-privacy.test.js` pins that the summary carries age and sex only. |
| Any AI on the offline path | Breaks ADR-006. The exam must work with no network, always. |

**The fourth row deserves emphasis.** The single most likely future mistake is
someone looking at an empty differential and thinking "we could at least suggest
*something*". That empty differential is the engine correctly saying there is
not enough evidence. It is the hardest behaviour to build and the easiest to
destroy.

---

## 5. The verification loop, concretely

Because reasoning is deterministic, every AI output can be checked before it is
shown:

```
   model output
        │
        ▼
   extract condition names, drug names, numeric claims
        │
        ▼
   ┌──────────────────────────────────────────────┐
   │  Is every condition in V.dxList?              │
   │  Is every drug in the medication review?      │
   │  Is every number one the engine produced?     │
   │  Is any urgent claim backed by V.alerts?      │
   └──────────────────────────────────────────────┘
        │                          │
      all pass                  any fail
        ▼                          ▼
      show                   withhold + log
                            (and count it — a
                             rising rate is a
                             regression signal)
```

Cheap, deterministic, and it turns "we hope the model behaves" into a measured
property. **This is the single highest-value AI investment available and it
should precede every generative feature.**

---

## 6. Sequence

| | Item | Effort | Gate |
|---|---|---|---|
| 1 | **A-1 verification harness** | 40 h | — |
| 2 | A-4 referral letter | 20 h | after 1 |
| 3 | A-3 patient summary | 30 h | after 1 |
| 4 | A-6 teaching dialogue | 40 h | after 1 |
| 5 | A-2 speech/free-text capture | 80 h | ⚠️ privacy + cost decision |
| 6 | A-5 completeness cross-check | 40 h | after 1 |
| 7 | A-7 authoring assistance | 40 h | ⚠️ after evidence layer (KD-01) |

**~290 h. Item 1 is a prerequisite for all of it**, and it is the item that
would be skipped by default because it ships no visible feature.

---

## 7. Readiness scorecard

| Dimension | Score | Why |
|---|---|---|
| **Grounding substrate** | **9** | Structured, deterministic, explainable, token-recorded |
| **Verification capability** | **9** | Any claim is checkable against exact engine output |
| **Hallucination prevention** | **8** | Mechanically possible; harness not yet built |
| **Privacy posture** | **9** | Pinned by test — age and sex only leave the device |
| **Failure isolation** | **10** | Reasoning is local; AI can fail entirely and the exam continues |
| **Evidence retrieval** | **3** | 0 of 394 conditions carry a citation — nothing to retrieve |
| **Agent collaboration** | **6** | Clean tool surface; no stable condition identifier yet (KD-07) |
| **Multimodal readiness** | **4** | Imaging is attachments, not structured data |

**Overall: 7.3 / 10 — and higher than it looks**, because the two weakest rows
(evidence retrieval, multimodal) are knowledge and data gaps already recorded in
Phase 3, not engine problems.

---

## 8. The one-line strategy

**Keep the engine deterministic, and use AI to check itself against it.**

Every serious clinical AI problem — hallucination, irreproducibility,
unexplainability, undefendability — is solved by having a deterministic core to
verify against. Entopic already has one. That is a stronger position than most
clinical AI companies will ever reach, and it was arrived at by insisting on
something unfashionable: that the reasoning must be inspectable.

The strategic error would be to treat the deterministic engine as the old thing
that AI eventually replaces. It is the asset.
