# ADR-006 — The exam must work with no network, ever

**Status:** Accepted · **load-bearing**

## Context
Entopic is aimed partly at tertiary and rural Indian settings where
connectivity is unreliable. A copilot that stops working when the line drops is
worse than no copilot, because the clinic has already built it into the
workflow.

## Decision
The diagnostic path contains no network calls. The backend exists to sync, back
up, authenticate and audit — it is never a runtime dependency for running an
exam or producing a differential.

## Consequences
**Good.** The clinic keeps working through an outage. No latency in the exam
loop. No third party sees patient data by default.

**Bad.** Sync is eventually-consistent and needs conflict handling. Server-side
authorization cannot be relied on for anything the exam needs — which is
directly why ADR-010 came out the way it did.

**Enforced by:** `tools/audit.js` fails if any network call appears in the
diagnostic path.

## Revisit when
Never for the exam path. Non-exam features (analytics, KB updates, sync) may
require the network freely.
