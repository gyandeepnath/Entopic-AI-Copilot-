# Entopic — Backend Phase 2: multi-user, multi-individual, cloud push

*Prepared 2026-07-18. Companion to `docs/CLOUD_SETUP.md` (what's live) and
`docs/SUPABASE_EXPLORATION.md` (how it was built). This records the **verified
current state** of the backend and the **prepared, ready-to-apply** next steps
for the goals: multi-user live usage, multi-individual support, and pushing KB
updates to all users. Applying to the live database is a founder-gated step —
the SQL is staged in `db/migrations/`, not auto-applied.*

---

## Verified current state (live, surveyed 2026-07-18)

Project **`entopic`** (`wguxwhovwgpbvhbxrfyg`, ap-south-1) — **ACTIVE_HEALTHY**,
Postgres 17, free tier. Security advisors: **clean (0 lints).**

| Table | RLS | Rows | Purpose |
|---|---|---|---|
| `clinics` | ✓ | 0 | tenant |
| `clinic_members` | ✓ | 0 | membership + role (admin/optometrist/ophthalmologist/technician) |
| `patients` | ✓ | 0 | PII (tenant-scoped) |
| `visits` | ✓ | 0 | exam data (tenant-scoped) |
| `encounters` | ✓ | 0 | de-identified registry (separate from PII) |
| `kb_conditions` | ✓ | **5** | cloud knowledge base (authoring/growth) |
| `kb_versions` | ✓ | 0 | published KB bundles (the push mechanism) |
| `kb_editors` | ✓ | 0 | owner allowlist for KB writes |

7 migrations applied (core schema → RLS tightening → realtime replica identity
→ private helper schema → KB editor write path). RLS helpers are `SECURITY
DEFINER` in a `private` schema, revoked from `anon`. Realtime is scoped so each
clinic receives only its own row changes. **Tenant isolation (read + write) was
verified** by impersonation tests (see CLOUD_SETUP.md).

**Client** (`js/cloud-sync.js`, no SDK/CDN): email-password auth, `create
clinic`, resolve-my-clinic, an offline outbox that pushes patients/visits, a
pull + Realtime subscription with last-writer-wins merge. Offline-first is
intact — the exam never waits on the network.

---

## The three gaps for the stated goals

1. **Multi-individual support (roles/tiers server-side).** The app's role
   (student/clinician/faculty) and tier (free/pro/institutional) live only in
   the browser (`CU.role`, localStorage). For real accounts that carry identity
   across devices, they must persist server-side, per user.
   → **`public.profiles`** (in the staged migration).

2. **Multi-user live usage (join a clinic).** The client can only **create** a
   clinic; there's no way for a second individual to **join** one. The runbook
   already flagged this as "the next backend step".
   → **`clinics.join_code` + `join_clinic_by_code()` RPC** (staged migration).

3. **Push KB updates to all users.** The mechanism exists (`kb_versions` +
   `kb_editors` + the in-app "Publish to all devices" flow with fail-closed
   validation). But cloud `kb_conditions` holds only **5** of the local **384**
   conditions, so there's nothing real to publish yet.
   → **Seed the full KB** (existing tool, below).

---

## Prepared step 1 — apply the migration (founder-gated)

`db/migrations/002_profiles_and_invites.sql` is additive, RLS-enabled, and
non-destructive (verified against the established patterns). It adds `profiles`
(own-row RLS), `clinics.join_code`, and the `join_clinic_by_code` RPC
(authenticated-only, defaults joiners to the least-privileged role).

Apply when ready via the Supabase MCP `apply_migration` (name:
`profiles_and_invites`) or `psql`. Re-run the security advisor afterward — it
should stay clean.

## Prepared step 2 — client wiring (small, additive; after the migration)

- **On sign-in:** `GET /rest/v1/profiles?user_id=eq.<uid>`; if none, `POST` a
  default `{app_role: <local role>, tier:'free'}`. Then set `CU.role`/`CU.tier`
  from the profile — `roles.js#getActiveRole` already prefers `CU.role`, so the
  synced role "just works".
- **On mode switch:** `PATCH` the profile's `app_role` (best-effort; local stays
  the source of truth offline).
- **Join a clinic:** a "Join clinic" input on the Cloud card → `POST
  /rest/v1/rpc/join_clinic_by_code {p_code}`; on success, resolve + start sync.
- All best-effort and offline-tolerant: signed-out/offline, the app is unchanged.

## Prepared step 3 — push the full KB to the cloud

```
node tools/seed-cloud-kb.js --version 1.0.0 > kb_seed.sql   # 384 conditions + a bundle
```
Apply `kb_seed.sql` (idempotent upsert keyed on name). Then the in-app KB editor
"Publish to all devices" cuts new `kb_versions`; every install downloads and
applies on next open (never mid-exam; red flags always preserved).

---

## Guardrails (all honoured)

- **Offline-first sacred:** every step is additive to a sync/backup layer the
  exam never depends on. Signed-out/offline behaviour is unchanged.
- **PII separation:** `profiles` holds no patient data; PII stays in
  `patients`, de-identified data in `encounters`, each with its own policies.
- **No diagnosis server-side:** the engine stays deterministic on-device; the
  cloud only stores/sync/publishes.
- **Tenant isolation:** new objects are own-row (`profiles`) or
  authenticated-only RPC (`join_clinic_by_code`); no cross-tenant read/write.
- **Tier can't self-escalate:** when licensing lands, `UPDATE(tier)` gets
  revoked from users and set only via a billing `SECURITY DEFINER` function;
  today it's free-only and the client also enforces free limits locally.
- **Spend / architecture:** free tier, no new paid resources. Applying to the
  live DB is a hard-to-reverse move → **staged, not auto-applied**; awaits the
  founder's go.
