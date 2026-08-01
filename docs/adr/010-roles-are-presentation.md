# ADR-010 — Roles are presentation, not authorization

**Status:** **Accepted by accident** — nobody chose this; it became true

## Context
Entopic has five roles: clinician, student, faculty, researcher, technician.
They change what a user sees. They were never intended as a security boundary,
but the product is now described in ways that imply they are one.

## Decision
*(Documented after the fact.)* Role checks run entirely in the browser. There
is no server-side enforcement of what a role may do.

## Consequences
**This is a real gap, proven by browser probe.** A student account becomes an
administrator with one line in the developer console — `CU.admin = true` —
persists it, and exports every patient record. Every role check is advisory.

**Why it has not been fixed:** ADR-006 says the exam must work with no network,
so the client cannot depend on a server to decide what it may do. Real
authorization requires the server to be the gatekeeper for the operations that
matter (export, admin, cross-user reads) while the exam path stays fully local.
That is Top-100 item 5, ~80 hours.

**What it means today:**
- Single clinician on their own device: irrelevant. The threat model is a
  person who already has the records.
- Multi-user clinic, students on shared machines, anything sold: **a blocker.**

## Revisit when
Before the first paying multi-user clinic. Not before then, and not after.
