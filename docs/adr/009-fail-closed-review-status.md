# ADR-009 — An unknown review state means unreviewed

**Status:** Accepted

## Context
Conditions carry `review_status`. The nine base domain files carried no such
field at all, so 137 conditions sat in a bucket the UI labelled "Curated" —
which reads as "someone checked these". Nobody had. They were the original,
most commonly hit conditions: a routine dry-eye presentation returned three
results and all three were among them.

## Decision
`knowledge/loader.js` stamps `NEEDS_CLINICAL_REVIEW` onto any condition whose
review state is absent. Absence of evidence of review is treated as evidence of
absence.

## Consequences
**Good.** The review worklist is honest. It went from 257 to 394 — the true
number — and the clinician can see how much of the knowledge base has actually
been verified.

**Bad.** The number is discouraging, and it should be. 394 of 394 remain
unverified; that is the single largest risk in the product and no amount of
engineering will move it. Only a clinician can.

## Revisit when
Never. Fail-closed is the only defensible default for clinical content.
