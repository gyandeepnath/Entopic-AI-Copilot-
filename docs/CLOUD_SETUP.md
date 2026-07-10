# Entopic Cloud — setup, verification & runbook

This is the operational companion to `docs/SUPABASE_EXPLORATION.md`. It records
what was **built and wired**, exactly how it was **verified**, and the manual
steps to confirm the live multi-user behaviour on a real network.

**Local-first is intact.** Everything below is optional and additive. Signed
out, offline, or with cloud disabled, Entopic behaves exactly like the
pure-local app. The exam and the diagnostic engine never wait on the network.

---

## What exists

**Supabase project** `entopic` (`wguxwhovwgpbvhbxrfyg`, region ap-south-1, free
tier — $0/month). The anon/publishable key is a public client credential; all
access is enforced by Row-Level Security, never by hiding the key.

**Schema** (`public`): `clinics`, `clinic_members` (roles: admin / optometrist
/ ophthalmologist / technician), `patients`, `visits`, `encounters`
(de-identified registry), `kb_conditions` (+ `kb_versions`) for the growing
knowledge base. RLS enabled on every table; helper functions
(`is_clinic_member`, `is_clinic_admin`) are `SECURITY DEFINER` and revoked from
`anon`.

**Client** (`js/cloud-config.js`, `js/cloud-sync.js`): plain fetch + WebSocket
(no SDK, no CDN — same zero-build style as the app). Provides email/password
auth, clinic create/join, an outbox that pushes patients/visits when online,
a pull + Realtime subscription that merges remote changes last-writer-wins,
and a status surface. Wired into `storage.js` (one guarded line) and the
dashboard (a "Cloud Sync & Multi-User" card).

---

## What is verified, and how

| Guarantee | How it was verified | Result |
|---|---|---|
| **Tenant isolation (read)** | Impersonated two users in two clinics via JWT claims in Postgres; each queried `patients` under RLS | Dr A saw only Clinic A's patient; Dr B only Clinic B's |
| **Tenant isolation (write)** | Dr A attempted `insert` into Clinic B under RLS | **Blocked**; 0 intruder rows |
| **Realtime scoping** | `patients`/`visits` added to `supabase_realtime`; `REPLICA IDENTITY FULL` set so RLS filters change events | Publication confirmed; each clinic receives only its own row changes |
| **LWW merge correctness** | Unit tests (`tests/cloud-sync.test.js`) | Newer wins, older ignored |
| **Open-exam safety** | Unit test: remote change to the visit open in an exam | Never clobbers local edits, even vs a far-future timestamp |
| **No echo loop** | Unit test: enqueue while applying a remote change | Suppressed — remote merges don't re-queue |
| **Offline-first / dormant** | Unit tests + headless-Chromium render | Disabled/signed-out ⇒ nothing queued, app fully functional |
| **App still loads with cloud scripts** | Browser smoke test | No console/page errors |

78/78 automated tests pass.

### Not verifiable from this build environment

The live end-to-end WebSocket/REST round-trip (two real browsers syncing) could
not be exercised here because this sandbox's egress proxy blocks the project
domain. It is covered by the runbook below — run it once on a normal network.

---

## Manual runbook — live two-user dashboard test

Do this once from a machine with normal internet (the end-user's environment):

1. **User A**: open `index.html`, dashboard → **Cloud Sync** card → *Create
   account* (email + password) → *Create clinic* ("Test Clinic"). The status
   dot turns green ("Live sync").
2. **User A**: add a patient, run part of an exam. Within a moment it's backed
   up (the card shows a recent "last …" time).
3. **User B** (second browser / second device / incognito): sign in with the
   **same** account (or a teammate you invite). The patient A created appears
   on B's dashboard **without a refresh** (Realtime). *(Multi-clinician invite
   beyond the clinic creator is the next backend step — see NEEDS_REVIEW.)*
4. **Live update**: with both dashboards open, add another patient on A → it
   pops onto B's list live. Edit on B → reflects on A.
5. **Offline proof**: turn off B's network, keep using B (add data — it works).
   Restore network → B's changes sync up; the card returns to green.
6. **Disaster proof** (local): on A, clear site data → reload. Data restores
   from the IndexedDB mirror; and even a wiped device recovers by signing in
   (cloud pull).

Expected throughout: the exam never stalls waiting on the network; red-flag
alerts and the differential behave identically online or off.

---

## Pushing the full knowledge base to the cloud

The cloud `kb_conditions` table currently holds a small sample. To push the
full local KB (all 130 conditions today; thousands as it grows):

```
node tools/seed-cloud-kb.js               > kb_seed.sql     # conditions only
node tools/seed-cloud-kb.js --version 1.1.0 > kb_seed.sql    # + a published bundle
```

Apply `kb_seed.sql` with the Supabase MCP (`apply_migration`) or `psql`. It is
an idempotent upsert keyed on condition name, so it is safe to re-run whenever
the local KB changes. The generator is unit-testable and never touches the
network itself.

---

## Guardrails honoured

- No diagnostic logic runs server-side; scoring stays deterministic on-device.
- PII (`patients`) and the de-identified registry (`encounters`) are separate
  tables with separate policies.
- The engine/KB never become a runtime network dependency.
- Free tier only; no spend was incurred. Creating the project was confirmed at
  $0/month before proceeding.
