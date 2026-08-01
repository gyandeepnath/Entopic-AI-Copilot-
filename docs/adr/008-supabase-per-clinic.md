# ADR-008 — One Supabase project per clinic

**Status:** Accepted, **provisional** — see ADR-012

## Context
Sync and backup need a server. A solo founder cannot operate multi-tenant
infrastructure, and mixing clinics' patient data in one database without
mature tenant isolation is an unacceptable risk.

## Decision
Each clinic gets its own Supabase project, with row-level security inside it.
Credentials are entered in the admin panel. Migrations in `db/migrations/` are
applied by hand.

## Consequences
**Good.** Tenant isolation is physical, which is the strongest form. One
clinic's breach cannot reach another's. No tenancy code to get wrong.

**Bad.** Onboarding is manual and does not scale past a handful of clinics.
There is no cross-clinic view for research or analytics. Migrations must be
applied per project by hand — an error-prone step that grows linearly.

## Revisit when
More than ~10 clinics, or the research corpus needs pooling. That is ADR-012.
