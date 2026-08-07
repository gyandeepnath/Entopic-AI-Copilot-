# Phase 5 — Top 200 Backend Improvements, Ranked

Ranked by **impact on patient-data safety × likelihood of being hit × inverse
effort**. Items 1–20 are the ones I would do before selling to another clinic.

`⚠` = needs a founder decision, not engineering.
`✅` = done during this phase.

---

## Tier 1 · Data-loss paths (1–20)

| # | improvement | effort |
|---|---|---|
| 1 | ✅ Stop announcing a save that did not happen (BE-1) | done |
| 2 | ✅ Persist the delete queue so a crash cannot resurrect a record (BE-2) | done |
| 3 | ✅ Clear only the tombstones actually sent (BE-3) | done |
| 4 | ✅ Paginate the pull; an unbounded read inherits the server's row cap (BE-5) | done |
| 5 | ✅ A migration ledger, runner, snapshots and rollback (BE-4) | done |
| 6 | Automatic scheduled backup with a visible "last backup" age | 24 h |
| 7 | Device archival / year-end close before localStorage exhausts (BE-10) | 120 h |
| 8 | Server-stamped `updated_at`; stop trusting the device clock (BE-17) | 16 h |
| 9 | ⚠ Vault recovery mechanism — decision, then build (BE-11) | ⚠ + 40 h |
| 10 | Persist conflicts and keep the losing version on the record (BE-12) | 40 h |
| 11 | "Verify this backup" — restore it into a scratch context and report | 16 h |
| 12 | Warn when a device has never synced and has no backup | 8 h |
| 13 | Refuse to sign out while the outbox is non-empty, or say what is pending | 8 h |
| 14 | Surface `storageCorruptStores()` on the home screen, not only in a banner | 8 h |
| 15 | Index `patients(clinic_id, updated_at)` and `visits(clinic_id, updated_at)` (BE-6) | 4 h |
| 16 | Back up to a second location (file + IndexedDB export) in one action | 16 h |
| 17 | Detect and warn on device clock skew against the server's `Date` header | 8 h |
| 18 | Block "clear data" style actions behind the same typed-name confirmation as delete | 8 h |
| 19 | Retry the audit push instead of fire-and-forget (BE-9) | 16 h |
| 20 | Record the app version on every visit, so a record says which build wrote it | 4 h |

## Tier 2 · Observability (21–45)

| # | improvement | effort |
|---|---|---|
| 21 | Bounded sync-event ring buffer replacing the single `lastError` string (BE-16) | 24 h |
| 22 | Include the sync log in the backup export | 4 h |
| 23 | Backend health page: last sync, queue depth, storage headroom, backup age | 32 h |
| 24 | Structured client logging with levels, replacing bare `console.error` | 24 h |
| 25 | Correlation id per sync cycle, echoed in the audit log | 16 h |
| 26 | Count and expose merge outcomes (inserted / replaced / conflicted) per pull | 8 h |
| 27 | Expose pagination stats — pages fetched, rows, whether the cap was hit | 8 h |
| 28 | Track and show time-since-last-successful-drain | 8 h |
| 29 | Persist the last 20 write failures with their reasons | 8 h |
| 30 | Report storage usage per store, not just in total | 8 h |
| 31 | A "copy diagnostics" button producing a shareable, PHI-free report | 16 h |
| 32 | Log realtime socket state transitions | 8 h |
| 33 | Record every 401 / refresh cycle | 8 h |
| 34 | Alert when the outbox has been non-empty for more than an hour | 8 h |
| 35 | Alert when a conflict has been unresolved for more than a day | 8 h |
| 36 | Server-side: log RLS denials to a diagnostic table | 16 h |
| 37 | Server-side: surface `orphan_visits` count in an admin view (BE-7) | 8 h |
| 38 | Track per-request latency client-side, keep a rolling p95 | 16 h |
| 39 | Count how often the poll fallback is used instead of the socket | 4 h |
| 40 | Expose the KB version each device is running, per clinic | 8 h |
| 41 | Record decrypt failures with a count and a reason | 8 h |
| 42 | Warn when two devices report clocks more than 60 s apart | 8 h |
| 43 | Expose the migration ledger in the admin panel | 8 h |
| 44 | Show the pre-migration snapshots and let an operator restore one | 16 h |
| 45 | Uptime / reachability probe against the configured Supabase URL | 8 h |

## Tier 3 · Performance and scale (46–75)

| # | improvement | effort |
|---|---|---|
| 46 | In-memory record index so `loadVisits()` stops parsing everything (BE-15) | 40 h |
| 47 | Lazy-load visit payloads; keep only headers in memory | 60 h |
| 48 | Move the primary store to IndexedDB, keeping localStorage for small state | 120 h |
| 49 | Incremental save — write only the changed record, not the whole array | 60 h |
| 50 | Compress stored payloads | 24 h |
| 51 | Server-side: partial index `where deleted = false` | 4 h |
| 52 | Server-side: partition `visits` by clinic at scale | 40 h |
| 53 | Batch decrypt with a worker so a large pull does not block the UI | 32 h |
| 54 | Adaptive page size based on observed latency | 16 h |
| 55 | Incremental pull using a stored high-water mark, not a full scan | 24 h |
| 56 | Per-record dirty flags instead of per-kind (BE-19) | 24 h |
| 57 | Coalesce rapid saves within a step into one write | 16 h |
| 58 | Cache decrypted records for the current session | 16 h |
| 59 | Stream the backup export instead of building it in memory | 24 h |
| 60 | Chunk the restore so a large import does not freeze the tab | 24 h |
| 61 | Index the audit log by patient for fast per-record history | 8 h |
| 62 | Cap `engineLog` growth on the visit record | 4 h |
| 63 | Trim `engine_tokens` duplicates before storing | 4 h |
| 64 | Prune `_cloud_updated` from exported backups | 4 h |
| 65 | Server-side: `vacuum`/`analyze` guidance in the ops doc | 4 h |
| 66 | Connection reuse hints on the realtime socket | 8 h |
| 67 | Debounce realtime-triggered merges under a burst | 8 h |
| 68 | Skip re-render when a merge changed nothing visible | 8 h |
| 69 | Measure and publish a device-scale benchmark suite | 24 h |
| 70 | Load-test the pull path against 50k rows | 16 h |
| 71 | Benchmark encryption throughput per record | 8 h |
| 72 | Profile boot time as store count grows | 16 h |
| 73 | Defer non-critical stores until after first paint | 16 h |
| 74 | Bound `ENGINE_LOG` and the run-diff ring together | 4 h |
| 75 | Archive completed visits older than N years to a separate export | 40 h |

## Tier 4 · Integrity and correctness (76–110)

| # | improvement | effort |
|---|---|---|
| 76 | Checksum every store; verify on read | 24 h |
| 77 | Write-ahead marker so an interrupted write is detectable | 24 h |
| 78 | Validate a record's shape on read, not only the store's | 24 h |
| 79 | Reject a restore whose record count drops by more than X % without confirmation | 8 h |
| 80 | Detect duplicate patient records by MRN and offer a merge | 40 h |
| 81 | Detect duplicate visits for one patient on one day | 16 h |
| 82 | Enforce non-empty `patient_id` on visit tombstones (BE-8) | 4 h |
| 83 | Server-side: `check (patient_id <> '')` once BE-8 is fixed | 4 h |
| 84 | Reconciliation job comparing local and server record counts | 24 h |
| 85 | Verify that every local visit's patient exists locally | 8 h |
| 86 | Repair tool for orphaned visits | 16 h |
| 87 | Timezone-explicit storage — record the offset, not just the instant | 24 h |
| 88 | Normalise every timestamp to UTC on write | 16 h |
| 89 | Reject records dated in the future beyond a tolerance | 8 h |
| 90 | Validate `clinic_id` on every incoming row before merging | 8 h |
| 91 | Refuse to merge a row whose id is not the shape this client generates | 8 h |
| 92 | Bound record size; refuse and explain rather than silently exceeding quota | 16 h |
| 93 | Server-side: size limit on `data` | 4 h |
| 94 | Verify the decrypted payload's id matches the row id | 4 h |
| 95 | Cross-check `updated_at` against the payload's own `updated` | 8 h |
| 96 | Detect and report a record that has been edited on two devices repeatedly | 16 h |
| 97 | Preserve the losing version of every conflict, not just two-tab ones | 24 h |
| 98 | Show a conflict resolution screen | 40 h |
| 99 | Audit every automatic merge decision | 16 h |
| 100 | Make the audit log tamper-evident with a hash chain | 40 h |
| 101 | Server-side: verify the audit hash chain on read | 24 h |
| 102 | Sign backup exports so a tampered file is detectable | 24 h |
| 103 | Record who exported a backup and when | 8 h |
| 104 | Refuse to import a backup from a different clinic without confirmation | 8 h |
| 105 | Version the backup format independently of `STORE_VERSION` | 8 h |
| 106 | Migrate old backup formats on import rather than refusing | 24 h |
| 107 | Test the restore path against every historical backup format | 24 h |
| 108 | Property-test the merge function against random interleavings | 32 h |
| 109 | Fuzz `loadStore` against malformed input | 16 h |
| 110 | Chaos-test the sync path with injected failures at every step | 40 h |

## Tier 5 · Authentication and authorisation (111–140)

| # | improvement | effort |
|---|---|---|
| 111 | In-app session revocation | 24 h |
| 112 | MFA (TOTP) | 40 h |
| 113 | SSO / SAML for institutions | 80 h |
| 114 | Shorter access-token lifetime with silent refresh | 16 h |
| 115 | Bind a session to a device fingerprint | 24 h |
| 116 | Show and let a user end their active sessions | 24 h |
| 117 | Rate-limit sign-in attempts server-side | 16 h |
| 118 | Lock an account after repeated failures | 16 h |
| 119 | Email verification before clinic join | 16 h |
| 120 | Admin approval for clinic joins, not just a code | 24 h |
| 121 | Expire and rotate clinic join codes | 8 h |
| 122 | Single-use join codes | 8 h |
| 123 | Audit every membership change server-side | 8 h |
| 124 | Role change requires a second admin | 24 h |
| 125 | Prevent removal of the last admin of a clinic | 8 h |
| 126 | `organisations` tier above `clinics` | 80 h |
| 127 | Cross-clinic roles for a chain | 40 h |
| 128 | Per-clinic feature entitlements enforced server-side | 32 h |
| 129 | Server-authoritative tier, not client-declared | 24 h |
| 130 | Service accounts for integrations | 32 h |
| 131 | Scoped API tokens | 40 h |
| 132 | Break-glass emergency access with mandatory audit | 32 h |
| 133 | Session timeout on inactivity | 16 h |
| 134 | Re-authenticate before destructive actions | 16 h |
| 135 | Password strength policy, configurable per clinic | 16 h |
| 136 | Compromised-password check against a breach list | 24 h |
| 137 | Separate the vault passphrase from the account password explicitly in the UX | 8 h |
| 138 | Per-user vault keys wrapped by a clinic key | 60 h |
| 139 | Key rotation without re-encrypting everything | 60 h |
| 140 | Hardware-key support (WebAuthn) | 60 h |

## Tier 6 · API and schema maturity (141–170)

| # | improvement | effort |
|---|---|---|
| 141 | `schema_migrations` table server-side | 16 h |
| 142 | `down` script for every migration | 40 h |
| 143 | Client sends a version header; server can detect an old client | 8 h |
| 144 | Schema version negotiation | 24 h |
| 145 | Deprecation policy and a window for old clients | 16 h |
| 146 | Server-side validation of the envelope shape | 16 h |
| 147 | Reject a `data` blob that is not an envelope when PHI is expected | 8 h |
| 148 | Server-side `updated_at` trigger (see BE-17) | 8 h |
| 149 | `created_at` on `patients` and `visits` | 8 h |
| 150 | `deleted_at`, not just `deleted` | 8 h |
| 151 | `deleted_by` for accountability | 8 h |
| 152 | Restore-from-soft-delete endpoint | 16 h |
| 153 | Hard-delete job honouring the retention policy | 32 h |
| 154 | Retention policy per clinic, configurable | 32 h |
| 155 | Legal-hold flag that blocks deletion | 16 h |
| 156 | Export a patient's whole record on request (data-subject access) | 32 h |
| 157 | Erase a patient on request, with an audited exception list | 40 h |
| 158 | Server-side pagination helpers rather than raw PostgREST | 24 h |
| 159 | A stable cursor format the client does not have to construct | 16 h |
| 160 | Bulk endpoints for import | 24 h |
| 161 | ETag / conditional requests to avoid re-downloading unchanged rows | 24 h |
| 162 | `If-Match` on updates for true optimistic concurrency | 32 h |
| 163 | Idempotency keys on writes | 24 h |
| 164 | Consistent error envelope across every endpoint | 16 h |
| 165 | Machine-readable error codes | 16 h |
| 166 | OpenAPI document generated from the schema | 24 h |
| 167 | Contract tests against the live schema | 32 h |
| 168 | Staging project mirroring production | 16 h |
| 169 | Migration dry-run against a snapshot | 24 h |
| 170 | Automated migration application in CI | 32 h |

## Tier 7 · Operations (171–200)

| # | improvement | effort |
|---|---|---|
| 171 | Runbook per failure mode, linked from the health page | 24 h |
| 172 | Status page | 24 h |
| 173 | Uptime monitoring with alerting | 16 h |
| 174 | Backup verification job | 24 h |
| 175 | Quarterly restore drill, documented | 8 h |
| 176 | PITR enabled and tested | 8 h |
| 177 | Documented RTO / RPO per deployment tier | 8 h |
| 178 | Incident log template | 4 h |
| 179 | On-call definition, even if it is one person | 4 h |
| 180 | Support-diagnostics bundle a clinician can send | 16 h |
| 181 | Remote read-only support access with audited consent | 40 h |
| 182 | Per-clinic usage metering | 32 h |
| 183 | Billing hooks | 40 h |
| 184 | Automated clinic provisioning | 32 h |
| 185 | Self-serve clinic deletion with export | 24 h |
| 186 | Data-residency selection per clinic | 60 h |
| 187 | Regional deployment | 80 h |
| 188 | Self-hosted install guide and script | 40 h |
| 189 | Air-gapped deployment package | 40 h |
| 190 | Version-pinned KB distribution per clinic | 32 h |
| 191 | Staged KB rollout with per-clinic opt-in | 40 h |
| 192 | KB rollback per clinic | 24 h |
| 193 | Replay the drift report automatically after a KB update | 24 h |
| 194 | Encounter analytics pipeline that is actually populated | 40 h |
| 195 | De-identification verification on the analytics path | 32 h |
| 196 | DPIA and records of processing | ⚠ + 40 h |
| 197 | BAA / DPA templates | ⚠ + 24 h |
| 198 | Penetration test | ⚠ + 40 h |
| 199 | ADR-011 regulatory classification | ⚠ |
| 200 | Formal software validation package for hospital procurement | ⚠ + 80 h |

---

## The shortest path to "safe to sell"

Items **6, 7, 8, 10, 15, 21, 46** — automatic backup, archival, server
timestamps, persistent conflicts, the index, the sync log, and the record index.
**~290 hours, about two months.** Everything above 200 is a bigger company's
problem and should stay that way until a customer asks.
