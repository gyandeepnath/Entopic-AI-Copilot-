# ADR-012 — Whether Entopic becomes managed multi-tenant SaaS

**Status:** **NOT MADE**

## Context
The stated goal is multi-tenant SaaS for optometrists and ophthalmologists.
The current model (ADR-008) is one Supabase project per clinic, onboarded by
hand. These are not the same thing, and the gap has not been costed or decided.

Three viable shapes:

1. **Stay per-clinic.** Isolation stays physical. Onboarding stays manual.
   Caps out at perhaps ten clinics. Cost: nothing.
2. **Managed multi-tenant.** One database, tenant column, RLS everywhere,
   automated onboarding, pooled research corpus. Cost: ~150 h (Top-100 item 98)
   plus ongoing operational responsibility for other people's patient data.
3. **Hybrid.** Self-serve provisioning of per-clinic projects. Keeps physical
   isolation, removes the manual step. Cost: ~40 h, unknown per-project spend.

## Decision
**None.** Option 1 is in force by default rather than by choice.

## Consequences
Every month this stays undecided, more code assumes a single clinic. The
research corpus in particular is being designed against a shape that option 2
would change.

**This is a founder decision, not an engineering one** — it commits money,
operational liability for third-party patient data, and probably the regulatory
answer in ADR-011 as well.

## Revisit when
Now, in the sense that it should be an explicit decision rather than a default.
Immediately if a second clinic asks to buy.
