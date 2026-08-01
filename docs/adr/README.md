# Architecture Decision Records

Until 2026-08-01 this repository contained **no record of any architectural
decision**. Every significant choice — no build step, globals instead of
modules, `localStorage` as the record store, roles as a display convenience —
had been made implicitly and could only be recovered by reading code and
inferring intent. That is fine while one person holds it all in their head. It
stops being fine the moment a second engineer, an auditor, or a regulator asks
"why is it like this?"

These twelve records are written **retrospectively**. They document decisions
already in force, so their value is not in choosing — it is in stating what was
chosen, what it costs, and what would have to be true to revisit it.

Two are marked **NOT MADE**: they are decisions the project has been avoiding
rather than taking, and writing them down is the point.
One is marked **Accepted by accident**, because that is honestly what happened.

## Format

Each record states: Status · Context · Decision · Consequences · Revisit when.
Short on purpose. An ADR nobody reads protects nobody.

## Index

| # | Decision | Status |
|---|---|---|
| [001](001-no-build-step.md) | No build step; the browser loads source directly | Accepted |
| [002](002-globals-not-modules.md) | Global scripts instead of ES modules | Accepted |
| [003](003-localstorage-primary.md) | `localStorage` is the primary record store | Accepted, under strain |
| [004](004-deterministic-engine.md) | Diagnosis is deterministic; the LLM is downstream only | Accepted — load-bearing |
| [005](005-knowledge-as-data.md) | Clinical knowledge is data, not code | Accepted |
| [006](006-offline-first.md) | The exam must work with no network, ever | Accepted — load-bearing |
| [007](007-client-side-vault.md) | Records encrypted client-side with a clinic passphrase | Accepted |
| [008](008-supabase-per-clinic.md) | One Supabase project per clinic | Accepted, provisional |
| [009](009-fail-closed-review-status.md) | Unknown review state means unreviewed | Accepted |
| [010](010-roles-are-presentation.md) | Roles are presentation, not authorization | **Accepted by accident** |
| [011](011-regulatory-classification.md) | Regulatory classification of the product | **NOT MADE** |
| [012](012-multi-tenancy-model.md) | Whether Entopic becomes managed multi-tenant SaaS | **NOT MADE** |
