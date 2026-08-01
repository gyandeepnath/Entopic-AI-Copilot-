# ADR-005 — Clinical knowledge is data, not code

**Status:** Accepted

## Context
The knowledge base must be reviewable by a clinician who does not read code,
editable without a release, and eventually distributable as versioned content.

## Decision
`knowledge/` holds plain object literals: `{name, domain, route, req, sup, con,
temporal, tests, exclusions, urgent, icd, review_status}`. No logic. The engine
interprets; the knowledge declares.

## Consequences
**Good.** A condition can be reviewed, signed off, diffed and version-stamped.
The KB can be edited in-app by an admin. It could be lifted into a package, a
server, or a different client with no rewrite.

**Bad.** Anything the schema cannot express has to become engine code, which
puts clinical meaning back into a place clinicians cannot review. Red-flag rules
are currently in this category (Top-100 item 47).

**Enforced by:** `tests/architecture.test.js` asserts no file in `knowledge/`
depends on the application layer. This was violated by
`age-classification.js`, which read and wrote `localStorage` directly; fixed
2026-08-01 by moving persistence to `js/age-brackets.js`.

## Revisit when
The schema cannot express something clinically important — at which point
extend the schema, not the engine.
