# ADR-004 — Diagnosis is deterministic; the LLM is strictly downstream

**Status:** Accepted · **load-bearing — do not revisit casually**

## Context
Entopic advises clinicians on eye disease. An LLM that generates a differential
cannot be inspected, cannot be reproduced, cannot be signed off by a clinician,
and cannot be defended to a regulator or a court.

## Decision
The differential is produced by a deterministic 13-stage token-matching engine
over a curated knowledge base. Any AI use is **downstream only**: summarising
what the engine already produced, or parsing speech and free text into tokens
*before* the engine runs. No scoring, no ranking, no differential generation
ever passes through a model.

## Consequences
**Good.** The same inputs give the same output, every time, forever. A
clinician can read exactly why a condition ranked where it did. The exam works
with no network. The knowledge base can be reviewed and signed off condition by
condition — which is the actual path to trustworthiness.

**Bad.** The engine only knows what the knowledge base contains, so coverage is
a manual authoring cost. It cannot handle a presentation nobody wrote a rule
for.

**Enforced by:** `tests/llm-privacy.test.js` and a contract in
`tests/architecture.test.js` asserting no LLM call appears in `js/engine.js` or
`knowledge/`.

## Revisit when
Never, on current evidence. If it is ever revisited, that is a clinical-safety
and regulatory decision, not an engineering one.
