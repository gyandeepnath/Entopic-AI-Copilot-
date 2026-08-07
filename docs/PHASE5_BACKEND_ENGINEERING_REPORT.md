# Phase 5 — Backend Engineering Report

**Role:** Chief Backend Architect
**Date:** 2026-08-07
**Scope:** every backend component, storage mechanism, synchronisation pathway,
persistence layer, API, background process, migration and database interaction.
Frontend, styling and UI excluded except where they are the only place a
backend failure becomes visible.

---

## 0. Method, and the standing caution

Every claim marked **measured** was produced by running the software — in a
headless browser against the real app, or in a sandbox running the real
modules. Claims marked **read** come from the source and are labelled as such.
Claims about the *server* are marked **unverified against a live database**,
because this session has no Supabase project to run against; where that matters
I say what would have to be checked and how.

This distinction has earned its keep repeatedly in this project. During earlier
phases my own measurement scripts were wrong seven separate times, each
producing confident and entirely false findings. The rule: **a finding is not a
finding until the probe that produced it has itself been checked.**

Four of the five defects below were found by measurement after reading the same
code and missing them.

---

## 1. Backend architecture, reverse-engineered

### 1.1 The shape of it

Entopic is **local-first with a cloud behind it**, not a client-server app. The
distinction is the whole architecture:

```
┌──────────────────────── THE DEVICE (authoritative) ─────────────────────────┐
│                                                                             │
│   exam UI ──► data-model (V, P) ──► engine (deterministic, offline)         │
│                    │                                                        │
│                    ▼                                                        │
│            storage.js  ── the ONLY write path ──────────────┐               │
│              │   │  │                                       │               │
│              │   │  └──► storage-migrations.js (ledger, runner, snapshots)  │
│              │   │                                          │               │
│              │   └──► local-vault.js  (AES-GCM-256, PBKDF2 210k)            │
│              │            └─ patients, visits, audit, users → ciphertext    │
│              │                                                              │
│              ├──► storage-mirror.js  → IndexedDB  (safety net, ~100s of MB) │
│              └──► localStorage       (primary, ~5 MB)                       │
│                       │                                                     │
│                       ▼                                                     │
│               cloudEnqueue(kind)  ── debounced 800 ms ──┐                   │
└─────────────────────────────────────────────────────────┼───────────────────┘
                                                          │
┌──────────────── cloud-replication.js (which version wins?) ─────────────────┐
│  outbox: dirty-by-timestamp delta      tombstones: durable, bounded         │
│  encrypt: phiEncrypt per record        merge: local-edit-wins + conflicts   │
│  pull: keyset-paginated, 500/page                                           │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
┌──────────────── cloud-sync.js (can we talk to the server?) ─────────────────┐
│  session (vault-wrapped)   cloudApi + bounded backoff   realtime WebSocket  │
│  token refresh on 401      12 s polling fallback        KB push, audit push │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │  HTTPS / WSS, ciphertext payloads
┌─────────────────────────── SUPABASE (PostgreSQL 16) ────────────────────────┐
│  clinics, clinic_members, profiles      patients, visits  (data = jsonb     │
│  kb_conditions, kb_versions, kb_editors               ciphertext envelope)  │
│  encounters (de-identified)             audit_log (append-only)             │
│  RLS on every table via private.is_clinic_member/_admin  (SECURITY DEFINER) │
│  realtime publication on patients + visits                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The property that matters:** the arrow from the engine to the network does not
exist. There is no code path in which producing a differential waits on, or
fails because of, anything to the right of the device boundary. Verified by the
Node engine loader, which deliberately loads *only* knowledge → data-model →
engine and runs the full golden suite: no storage module, no network module.

### 1.2 Persistence flow (a single write)

```
doSave()
  ├─ loadVisits()                     ← may return the FALLBACK if unreadable
  ├─ recDetectConflict(...)           ← another tab wrote since we last looked?
  │    └─ recPreserveOverwritten()    ← keep the version we are replacing
  ├─ recStampVisit()                  ← who, when, amendment trail
  ├─ saveVisits()  ──► saveStore("visits", …)
  │       ├─ REFUSE if store is corrupt          ← cannot overwrite what we cannot read
  │       ├─ REFUSE if vault on and locked
  │       ├─ mirrorStore()  ← IndexedDB FIRST, deliberately
  │       ├─ localStorage.setItem()
  │       ├─ cloudEnqueue("visits")
  │       └─ storageQuotaWatch()
  ├─ savePatients()  (same path; `updated` stamped only if content changed)
  └─ evEmit("visit:saved" | "visit:save-failed")   ← now reflects what happened
```

The mirror-first ordering is not stylistic. It was a measured fix: when the
localStorage quota threw, the mirror write inside the same `try` was skipped,
and the alert nevertheless told the clinician their existing records were
"safe (mirrored on this device)". IndexedDB has a far larger quota, so writing
it first makes it a genuine net for exactly the write that failed.

### 1.3 Synchronisation flow

**Up.** `cloudEnqueue(kind)` sets a dirty flag and debounces 800 ms →
`cloudDrain()` → **hard PHI gate** (`phiArmed()`: consent recorded AND a device
key present, else hold and keep the flag) → per-kind delta
(`_cloud_updated` < `updated`) → `phiEncrypt` each record → one upsert with
`resolution=merge-duplicates` → on success stamp `_cloud_updated` under a
`_suppress` flag so the write does not echo back into the outbox.

**Down.** `cloudPull()` → keyset pagination over `updated_at` (500/page) →
`cloudDecryptRows` (undecryptable → `data: null`, dropped, never stored as
ciphertext) → `cloudMergeRows`.

**The merge rule, which is the heart of the system:**

| local state | remote state | outcome |
|---|---|---|
| absent | present | inserted |
| clean (`updated <= _cloud_updated`) | newer | replaced |
| **edited since last push** | newer | **local kept, conflict recorded** |
| edited since last push | tombstone | **local kept, conflict recorded** |
| clean | tombstone | deleted locally |
| open in the current exam | anything | **untouched** |

Timestamps are compared as epoch milliseconds, never lexicographically — a
string compare assumed byte-identical ISO formatting and broke on
millis-vs-no-millis.

### 1.4 Authentication flow

```
cloudSignIn(email, pw) → POST /auth/v1/token?grant_type=password
   └─ CLOUD.session {access_token, refresh_token, user_id, email}
        └─ vaultSecretSet("entopic_cloud_session")   ← wrapped when the vault is on
   └─ cloudResolveClinic()  → GET /rest/v1/clinic_members
   └─ cloudSyncProfile()    → upsert profiles(role); read tier back
   └─ cloudStart()          → restore tombstones, pull, drain, open socket

401 on any call → cloudRefreshToken() once → retry → else "auth expired"
Vault locks     → cloudForgetSessionInMemory()   ← stored copy untouched
Vault unlocks   → cloudRestoreSession() → cloudStart()
```

A **locked device holds no usable token**, deliberately: without that, a stolen
laptop that could not read its own disk could still drain the clinic's cloud.

Authorisation is two orthogonal axes (`js/roles.js`): **role** decides what is
*shown*, **tier** decides what is *unlocked*, and `can(cap)` requires both. On
the server it is RLS: `private.is_clinic_member(clinic_id)` /
`is_clinic_admin`, `SECURITY DEFINER` with a pinned `search_path`, granted to
`authenticated` only (migration 004 — without which every signed-in request
failed outright).

### 1.5 Background processes

There are four, all client-side. **There is no server-side background process
of any kind** — no cron, no queue worker, no scheduled job.

| process | cadence | failure behaviour |
|---|---|---|
| `cloudDrain` debounce | 800 ms after a write | flags persist; retried |
| `cloudStart` poll | 12 s (pull only if the socket is down) | silent |
| realtime WebSocket | live; heartbeat 25 s | reconnects at 8 s |
| `storageQuotaWatch` | every write | warns once at 80 % |

This is a finding in itself: **orphan reconciliation, backup verification,
retention enforcement and audit export all have to be somebody's manual job**,
because there is nowhere for them to run. See BE-13.

---

## 2. Database audit

### 2.1 Schema (read; not verified against a live database)

Eleven tables across four migrations. `patients` and `visits` carry
**client-generated `text` primary keys** because records are created offline and
synced up — a server-generated uuid is impossible when the row must exist before
it has ever seen a server.

`data` is `jsonb` holding a **ciphertext envelope**. This is the single most
consequential schema decision in the system, and it is correct for the threat
model (the server operator cannot read patient data) while being the source of
most of the scalability findings below: nothing inside a record is queryable,
indexable, or constrainable server-side.

### 2.2 Normalisation

Deliberately not normalised. `patients.data` and `visits.data` are opaque blobs;
`clinics`, `clinic_members`, `profiles`, `kb_conditions` are properly relational.

This is the right call and should not be "fixed". Normalising the clinical
payload would require the server to read it, which would end end-to-end
encryption. The cost is stated honestly in §2.9.

### 2.3 Indexes

| table | indexes | assessment |
|---|---|---|
| patients | pk(id), clinic_idx | **missing `(clinic_id, updated_at)`** — see BE-6 |
| visits | pk(id), clinic_idx, patient_idx | same |
| audit_log | pk, (clinic_id, at desc), patient_id | good |
| kb_conditions | domain, route, review_status | good |
| encounters | clinic_idx | adequate |

**BE-6 (open).** The paginated pull now issues
`?order=updated_at.asc&limit=500&updated_at=gte.X` against `patients` and
`visits`, filtered by RLS on `clinic_id`. There is no index on
`(clinic_id, updated_at)`, so every page is a sort of the clinic's whole
partition. Invisible at 500 visits, a full-table sort per page at 50,000. The
index is one line and is written out in the Disaster Recovery manual as
migration 005; it is **not applied here** because applying an untested DDL
change to a live clinical database is not something to do from an audit.

### 2.4 Relationships and foreign keys

`clinic_members`, `profiles`, `audit_log`, `encounters` all have proper FKs with
`on delete cascade`.

**`visits.patient_id` has no FK, on purpose**, and the reasoning in migration
003 is correct: a visit can reach the server before its patient in a sync race,
and a hard FK would reject it and break offline sync permanently. The
compensations are a soft-delete cascade trigger and an `orphan_visits` view.

**BE-7 (open).** `orphan_visits` is a view nobody queries. It was built for "a
periodic orphan check" and there is no periodic anything. An unqueried
reconciliation view is a comment with a query plan attached. Needs either a
scheduled job (§1.5: there is nowhere to run one) or a surfaced admin count.

### 2.5 Constraints

Present: role enum, `review_status` enum, `kb_conditions.name` unique,
`kb_versions.version` unique.

Absent, and correctly so: anything about the contents of `data`. The server
cannot read it.

**BE-8 (open).** `visits.patient_id` is `not null` but not non-empty, and
`cloudDrainTombstones` deliberately writes `patient_id: ""` for a visit
tombstone. That is a real row with an empty foreign key, and it is exactly what
`orphan_visits` will report on. Harmless today; it will confuse whoever first
uses the reconciliation view.

### 2.6 Soft delete

Consistent and well designed. `deleted boolean` on `patients` and `visits`;
client sends tombstones; server cascades patient→visits; pull requests live
rows only so a soft-deleted row is never resurrected.

**Resolved this phase (BE-2/BE-3).** The tombstone queue was memory-only and
cleared by kind rather than by batch. Both fixed and tested.

### 2.7 Audit trail

`audit_log` is genuinely append-only: RLS grants INSERT to members and SELECT to
admins, and **no UPDATE or DELETE policy exists**, so with RLS on, those
commands are denied for everyone through the API. That is the right mechanism —
not a trigger that can be dropped, but the absence of a permission.

Client-side, `logAudit` keeps 2,000 entries locally with an explicit truncation
notice.

**BE-9 (open).** `cloudAuditPush` is best-effort and fire-and-forget. A failed
audit push is not queued and not retried. The local log is the only complete
one, and it is capped at 2,000. For an artefact whose entire purpose is to be
demanded as evidence, "best effort" is the wrong service level.

### 2.8 Versioning and migration

**Server:** four ordered SQL files, idempotent, each explaining itself. Good
practice. But **no `schema_migrations` table** — nothing records which have been
applied to a given project, so "is this database up to date?" is answered by a
human reading four files. And **no `down` scripts**: the stated first principle
("every migration must be reversible") is not met server-side.

**Client:** was *nothing*. Measured: `entopic_store_version` was null on a fully
working install; three ad-hoc migrations existed scattered across
`age-brackets.js`, `auth-crypto.js` and `roles.js`. Closed this phase (BE-4) —
see §5.

### 2.9 Scalability estimates

Per-record sizes are **measured** from real records (a completed visit
serialises to ~4–12 KB; a patient ~1–2 KB).

| scale | device localStorage | device IndexedDB | server | verdict |
|---|---|---|---|---|
| **100 users** (solo clinic, ~3k visits) | ~25 MB — **over the ~5 MB budget** | fine | trivial | **the device is the ceiling, not the server** |
| **1,000 users** | far over | fine | ~2 GB, fine | needs device-side archival |
| **10,000 users** | impossible | strained | ~20 GB; unindexed sorts hurt | needs BE-6 + archival + read-your-own-clinic partitioning |
| **100,000 users** | impossible | impossible | ~200 GB | needs a different device story entirely |

**The finding that matters: the scaling wall is on the device, not in
Postgres.** localStorage exhausts at roughly 3,000 patients / 9,000 visits — a
single busy practice over a few years, not a chain. The quota watch warns at
80 % and the write-failure state is now honest about it, but there is no
archival, no "close this year", and no partial-load. A four-year-old clinic
will hit this. It is BE-10, and it is the single highest-value backend work
remaining.

---

## 3. Offline-first audit

### 3.1 What is genuinely excellent

The corrupt-store protection is the best code in the backend. `loadStore`
distinguishes *corrupt* from *empty*; `saveStore` refuses to write a store it
could not read; the damaged bytes are quarantined under a timestamped key before
anything else happens; and the operator must explicitly accept the loss. This
was built after a measured incident (3 patients → truncate → reload → 0 shown →
one ordinary save → 3 records gone). It is exactly right.

The IndexedDB mirror is the correct second line: bigger quota, different
eviction class, restores automatically if localStorage is found empty at boot,
reloads at most once per tab session.

### 3.2 Can data be lost? — the honest answer

| scenario | verdict |
|---|---|
| Power failure mid-write | **No.** localStorage `setItem` is atomic per key. Worst case the write did not happen. |
| Truncated / corrupted store | **No — and this is now proven.** Detected, quarantined, writes blocked, operator must accept the loss. |
| localStorage cleared by the browser | **No.** IndexedDB mirror restores at boot. |
| Both cleared | **Yes.** Only a backup file or the cloud survives. Backups are manual. |
| Quota exhausted mid-clinic | **Was: silently, from the clinician's point of view.** Fixed this phase (BE-1). |
| Two tabs editing one visit | **No.** `recDetectConflict` preserves the version being replaced on the record itself. |
| Delete lost before it syncs | **Was: yes** (BE-2). Fixed. |
| Cloud row beyond the server's page cap | **Was: yes, silently** (BE-5). Fixed. |
| Vault passphrase forgotten | **Yes, permanently, by design.** No recovery key exists. See BE-11. |

**BE-11 (open, ⚠ FOUNDER DECISION).** The vault has no recovery mechanism. A
forgotten passphrase destroys every patient record on that device beyond any
recovery. That is the correct cryptographic property and a catastrophic
operational one. The options — printed recovery code, escrowed key, a second
admin's key — are a real trade between "we cannot read your data" and "a clinic
can survive its own staff turnover". This is not an engineering call.

### 3.3 Conflict resolution

Sound, and better than most local-first systems: it distinguishes *stale* from
*concurrently edited*, keeps the clinician's work in the ambiguous case, and
records the conflict rather than resolving it silently.

**BE-12 (open).** `CLOUD.conflicts` is an in-memory array of `"kind:id"`
strings. It does not survive a reload, and nothing merges the two versions —
the remote version is simply not applied and is lost on the next push. For a
clinical record, "the other device's version was discarded and nobody can see
what it said" is a gap. The right fix is to preserve the losing version on the
record the way `recPreserveOverwritten` already does for two tabs.

---

## 4. API review

There is no Entopic API. There is **PostgREST over the schema**, consumed by one
client. Judged as what it is:

| dimension | assessment |
|---|---|
| Consistency | Good — every call goes through `cloudApi`. |
| Validation | **Server-side: none beyond column types and RLS.** The client is the only validator. A malicious client with a valid token can write any JSON into `data`. Contained by encryption (garbage in one record) and RLS (own clinic only). |
| Error handling | Good — bounded exponential backoff, `Retry-After` honoured, 401 refresh-once. |
| Versioning | **None.** No `/v1`, no schema version negotiation. An old client against a new schema is undefined. **BE-14.** |
| Idempotency | Good — every write is an upsert on the primary key. Replaying a drain is safe, which is what makes the retry policy sound. |
| Pagination | **Fixed this phase** (BE-5). |
| Filtering / sorting | Only what PostgREST gives; nothing inside `data` is filterable, by design. |
| Backward compatibility | Untested. No client-version header, so the server cannot even detect an old client. |

**API maturity: 2 / 5** — "a working single-consumer data plane". Adequate for
one first-party client; not an API anyone else could build against, and not
versioned enough to evolve safely.

---

## 5. What was fixed this phase

Five defects, four found by measurement after reading the same code and missing
them. All are committed with tests.

| id | defect | how found | status |
|---|---|---|---|
| **BE-1** | `doSave()` announced `visit:saved` regardless of what storage said. Corrupt the store, keep typing — write correctly refused, saved indicator still flashed. | browser probe | **fixed** |
| **BE-2** | Delete queue was memory-only. Tab closed before the 800 ms drain → delete never sent → record resurrected from another device. | browser probe | **fixed** |
| **BE-3** | A successful tombstone push cleared every pending delete of that kind, including ones enqueued while the request was in flight. | code read + test | **fixed** |
| **BE-4** | No client migration mechanism at all; nothing recorded the data's shape. | browser probe | **fixed** |
| **BE-5** | Unbounded pull inherited the server's row cap. A clinic past it silently stopped receiving its own records. | code read + test | **fixed** |

Detail on each is in the commit messages and in
`docs/PHASE5_STORAGE_RELIABILITY_REPORT.md`.

Two decisions worth stating explicitly:

- **`completeVisit` now refuses** when the data did not save. A record asserting
  the consultation is finished, missing everything typed after writes began
  failing, with an audit entry claiming completion, is a worse artefact than an
  unfinished visit.
- **The migration runner ships with zero migrations.** Inventing one to
  exercise the mechanism would change live clinical records to test code, which
  is the trade the file exists to refuse.

---

## 6. Performance

Estimates, marked. Nothing here was benchmarked against a live Supabase project.

| operation | now | at 10k visits | note |
|---|---|---|---|
| `loadVisits()` | ~2 ms (measured, 100 visits) | ~200 ms, **synchronous, blocks the UI** | JSON.parse of the whole store on every call, and `doSave` calls it twice |
| `saveStore` | ~3 ms | ~250 ms | full re-serialise per keystroke-save |
| engine run | **0.7 ms (measured)** | unchanged | independent of record count |
| pull page | — | ~200–600 ms/page, 20 pages | unindexed sort (BE-6) |
| drain | delta only | proportional to edits | good |

**BE-15.** `loadVisits()` parses and returns *every* visit for operations that
need one. At scale this is the dominant cost and it is on the interactive path.
The fix is an in-memory index maintained across calls — not a rewrite.

**Do not optimise yet.** Every number above is comfortable at the scale any
current user operates at, and the device storage ceiling (BE-10) will bite
first. Optimising before that is solved would be work on a system that has
already stopped functioning for a different reason.

---

## 7. Operational maintainability

| question | answer |
|---|---|
| How hard is debugging? | **Hard.** No structured logging, no correlation ids, no way to reconstruct a session. |
| How observable? | **Poor.** `cloudStatus()` and `CLOUD.lastError` are the whole story: one string, overwritten by the next error. |
| Can failures be diagnosed quickly? | Only if reproducible. There is no record of what happened on the clinician's device. |
| Are logs meaningful? | The **audit log** is excellent and is the closest thing to a system log. `console.error` is otherwise the mechanism, and nobody reads a clinician's console. |
| Can a support engineer understand a failure? | Not without a screen share. |

**BE-16.** `CLOUD.lastError` being a single overwritten string is the specific
weakness. A clinic reporting "sync stopped this morning" leaves nothing to look
at. A bounded ring of the last ~50 sync events with timestamps, exportable with
the backup, would change support from guesswork to reading — and it is small.

---

## 8. Future scalability

| target | verdict |
|---|---|
| University edition | **Ready.** Roles, competencies, simulation and OSCE all exist. Device ceiling is the only risk, and student devices hold few records. |
| Solo clinic | **Ready**, with BE-10 as a four-year fuse. |
| Multi-clinic | **Ready.** RLS tenant isolation is correct and was verified against a real database when 004 was written. |
| Hospital chains | **Not ready.** No org-above-clinic level, no cross-clinic roles, no SSO. |
| National deployment | **Not ready.** No data residency controls, no regional sharding, no BAA/DPA framework. |
| Cloud deployment | Ready (this is the current model). |
| Hybrid / self-hosted | **Ready-ish.** The schema is portable and idempotent; needs a documented install path. |
| Fully offline deployment | **Ready.** This is the default. |
| Future AI | Ready — the firewall (ADR-004) means AI is downstream and additive. |
| Device integration | **Not ready.** No ingest path, no device identity, no HL7/FHIR/DICOM. |
| Analytics | Partly. `encounters` is the right idea; nothing populates it at scale. |
| Graph database | **Not ready and not needed.** See the Phase 3 graph-readiness report. |

**The architectural change that matters most for the next tier** is an
`organisations` level above `clinics`, because retrofitting a tenant hierarchy
after clinics have data is materially harder than adding it before. That is a
one-table, one-column change today and a migration project in two years.

---

## 9. Backend scorecard

Scores are out of 10 and are **against what a production healthcare SaaS
needs**, not against what a solo-founder project usually achieves. By the
second standard almost everything here would be two points higher.

| dimension | score | why |
|---|---|---|
| **Storage architecture** | **8** | Three layers with clear roles; corrupt-store protection is genuinely excellent; classification declared in one place and enforced by tests. Loses points for `loadStore` returning everything (BE-15) and no archival (BE-10). |
| **Database design** | **7** | Correct offline-first key strategy, well-reasoned FK omission, real RLS. Missing `(clinic_id, updated_at)` index (BE-6); no `schema_migrations`; no `down` scripts. |
| **Synchronisation** | **7** | The merge rule is better than most local-first systems — it keeps the clinician's edit and records the conflict. Now paginated and with durable tombstones. Loses points because conflicts are not persisted or resolvable (BE-12). |
| **Offline reliability** | **9** | The best-served first principle. Engine provably network-free; corrupt-store refusal; IndexedDB mirror; quota watch. Only the vault-recovery gap (BE-11) holds it from 10. |
| **Data integrity** | **8** | Was 6 before this phase. Idempotent upserts, epoch-ms comparison, two-tab conflict preservation, append-only audit, migration snapshots. Loses points for no server-side validation of `data` and no periodic reconciliation. |
| **API design** | **4** | Consistent and idempotent, but unversioned, unvalidated server-side, and single-consumer. Adequate for what it is; not an API. |
| **Authentication** | **6** | Supabase auth is sound; RLS is correct; the vault-wrapped session is a genuinely good decision. No MFA, no SSO, no session revocation, refresh tokens are long-lived. |
| **Maintainability** | **8** | Every module explains *why*, not just what. 921 tests. Ratchets that fail when a rule is broken. Zero build step is a real asset for a ten-year horizon. |
| **Scalability** | **5** | Server scales fine. **The device does not**, and the device is authoritative. This is the score that most needs to move. |
| **Observability** | **3** | One overwritten error string. The audit log is excellent but is not telemetry. The weakest dimension. |
| **Recoverability** | **6** | Backups are complete and restore is merge-aware; migration snapshots; quarantined corrupt bytes. But backups are **manual**, and a forgotten vault passphrase is unrecoverable by design. |
| **Enterprise readiness** | **4** | No org hierarchy, no SSO, no MFA, no data residency, no SLA instrumentation. |
| **Commercial SaaS readiness** | **6** | Multi-tenant, isolated, entitlement tiers exist. Missing: billing hooks, usage metering, provisioning automation, status page. |
| **Healthcare readiness** | **6** | End-to-end encryption, append-only audit, PHI consent gate, de-identified analytics separated from PII — all real and well done. Missing: retention/disposal policy, breach detection, formal DPIA, and the regulatory classification (ADR-011) that is **still not made**. |

**Overall: 6.3 / 10 — a well-engineered offline-first clinical tool with a
serviceable cloud behind it, not yet an enterprise healthcare platform.**

The gap is not carelessness. It is that the things missing (observability,
archival, org hierarchy, SSO) are the things you build when you have customers
telling you which of them hurts first.

---

## 10. The final questions, answered plainly

**Would you trust this backend to store real patient records?**
**Yes, with two conditions.** The local layer is better than most commercial
EMRs at exactly the thing that matters — it refuses to overwrite data it cannot
read, which is the failure that destroys records. The conditions: automated
backup must exist (today it is a button someone must remember to press), and
the vault-recovery question (BE-11) must have an answer, because "the clinic
forgot the passphrase" is a support ticket that currently ends the practice.

**Would you deploy it for paying clinics?**
**Yes — for solo and small group practices, today.** With BE-10 on the roadmap
with a date, because a busy practice will hit the device ceiling within about
four years and it should be fixed before a customer finds it.

**Would you trust it for university hospitals?**
**For the teaching function, yes.** For the hospital's clinical records, **no**
— not for want of quality, but for want of SSO, MFA, org hierarchy, retention
policy and an answer to ADR-011. Those are procurement requirements, not
opinions, and a university hospital will ask for all five in the first meeting.

**Would you trust it for nationwide deployment?**
**No, and it should not try.** Nationwide needs data residency, regional
sharding, an availability SLA with instrumentation to prove it, formal
regulatory classification, and an operations team. That is a different company,
not a different sprint. Aiming there now would damage what is already good.

---

## 11. Effort remaining to enterprise quality

Estimates in engineering-hours, assuming the current one-developer-equivalent
cadence.

| tranche | contents | hours |
|---|---|---|
| **A · Must-fix before scale** | BE-10 archival, BE-6 index, BE-15 load path, automated backup, BE-16 sync event log | **~320** |
| **B · Operational** | structured logging, health endpoint, reconciliation job, backup verification, restore drill | **~240** |
| **C · Enterprise** | organisations tier, SSO/SAML, MFA, session revocation, audit export, retention policy | **~480** |
| **D · Healthcare compliance** | DPIA, breach detection, BAA/DPA, ADR-011 classification, penetration test, validation package | **~400** |
| **E · Multi-device maturity** | persistent conflict store, three-way merge, per-field CRDT for the exam payload | **~280** |

**Total: ~1,720 hours (~10–11 months at one full-time engineer)** to reach a
backend a hospital procurement office would accept. **Tranche A alone (~320 h,
~2 months) is what stands between today and confidently selling to paying
private practices** — and tranche A is mostly device-side work that does not
touch the server at all.
