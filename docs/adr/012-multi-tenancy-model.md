# ADR-012 — Whether Entopic becomes managed multi-tenant SaaS

**Status:** **DECIDED 2026-08-02** — Option 3 (hybrid) now, Option 2 (managed
multi-tenant) as the stated destination.
**Decided by:** the founder.
**Supersedes:** the "NOT MADE" status recorded 2026-08-01.

## Context

The stated goal is multi-tenant SaaS for optometrists and ophthalmologists.
The model in force (ADR-008) is one Supabase project per clinic, onboarded by
hand. Those are not the same thing, and the gap had not been decided.

Three shapes were on the table:

1. **Stay per-clinic, manual.** Physical isolation. Caps at ~10 clinics.
2. **Managed multi-tenant.** One database, tenant column, RLS everywhere,
   automated onboarding, poolable research corpus. ~150 h plus permanent
   operational responsibility for other clinics' patient data.
3. **Hybrid.** Self-serve provisioning of per-clinic projects. Keeps physical
   isolation; removes the manual step. ~40 h.

## Decision

**Take option 3 now. Treat option 2 as the destination, not as a rejected
alternative.**

The reasoning is about sequencing risk, not about preference. Physical
isolation is the strongest tenant boundary that exists, and it is worth keeping
while the product is young, the knowledge base is unverified (ADR-009) and the
regulatory position is unresolved (ADR-011). Automating provisioning removes
the thing that actually blocks growth — the manual step — without taking on
custody of other clinics' data before the product has earned it.

## Consequences

**Good.** Onboarding stops being a bottleneck at roughly the cost of a week's
work. Tenant isolation stays physical, so a defect in tenancy code cannot leak
one clinic's records into another's — because there is no tenancy code.
Neither ADR-011 nor the KB sign-off is forced early.

**Bad, and it must be planned for rather than discovered.** Option 3 does not
pool anything: no cross-clinic research corpus, no benchmarking, no
multi-site studies. Per-project cost grows linearly. And every month spent on
option 3 is a month of code written against a single-clinic assumption.

**What this decision obliges us to do now, so option 2 stays cheap:**

1. **Do not hard-code single-clinic assumptions.** New stores get a clinic
   identifier from the start even though nothing reads it yet.
2. **Keep the research corpus tenant-tagged** so pooling later is a migration,
   not a rewrite.
3. **Server-enforced authorization (ADR-010) is a prerequisite for option 2**,
   not a parallel task. Multi-tenant with client-side roles would be
   indefensible.
4. **Revisit ADR-011 before option 2.** Holding many clinics' records changes
   the regulatory and data-protection position.

## Revisit when

Any of: more than ~10 clinics provisioned; a research question needs data from
more than one site; a customer asks for centralised administration; or
server-enforced authorization lands and removes the main blocker.
