# Phase 5 — Disaster Recovery Manual

**Audience:** the founder, and whoever is helping at 9 a.m. with a waiting room
full of patients.

Every procedure below is written to be followed by someone who is **not** a
software engineer. Where a step needs engineering help, it says so and says what
to ask for.

**The first rule, before any procedure on this page: do not clear the browser
data, do not reinstall, and do not "start fresh". Entopic refuses to overwrite
data it cannot read — that refusal is why your records are usually still there.
Clearing the browser is the one action that turns a recoverable problem into a
permanent one.**

---

## 0. Before anything goes wrong

| control | status today | what to do |
|---|---|---|
| Local backup export | Exists (Account → Data → Export all) | **Do it weekly.** Put it somewhere that is not this device. |
| Automatic backup | **Does not exist** | This is the highest-priority gap (BE-18). Until it exists, backup is a habit, not a feature. |
| IndexedDB mirror | Automatic, always on | Nothing to do |
| Cloud sync | Optional; off unless configured | Turn it on if you have a second device |
| Vault passphrase | Written down where? | **⚠ If it is only in someone's head, that is your single biggest risk.** See §6. |

**A backup you have never restored is a hypothesis.** Restore one into a spare
browser profile once a quarter. It takes five minutes and it is the only way to
know.

---

## 1. "The app says THIS VISIT IS NOT BEING SAVED"

**What has happened:** the storage layer found the record store damaged, or the
device is full, and it **refused to write** so that the damaged data could not
be overwritten. Your existing records have not been altered.

**What you will lose if you ignore it:** everything typed since the banner
appeared. Nothing before it.

1. **Do not close the tab.** What is on screen is only in memory.
2. Write down or photograph anything on screen you cannot re-enter.
3. Account → Data → **Export all**. This may also fail; try anyway.
4. If the banner says **"the device is full"**: free space, then reload.
5. If it says **"the store is damaged"**: reload the page. The IndexedDB mirror
   restores automatically if it can. If records come back, export a backup
   immediately and carry on.
6. If records do **not** come back, go to §2 before doing anything else.

---

## 2. Damaged store — recovering the quarantined copy

When Entopic finds a store it cannot read, it copies the damaged bytes to a key
named `entopic_corrupt_<store>_<timestamp>` **before** doing anything else, and
blocks writes to that store.

**Recovery, in order of preference:**

1. **Reload.** The IndexedDB mirror restores automatically if localStorage is
   found empty. Most cases end here.
2. **Restore your most recent backup file** (Account → Data → Import). The
   restore **merges** — it will not destroy sign-offs, competency evidence or
   conditions recorded since the backup was taken.
3. **Cloud pull.** If sync was on, sign in on a fresh profile; the server copy
   downloads.
4. **The quarantined bytes.** This needs engineering help. Ask for: *"read
   `entopic_corrupt_*` out of localStorage and salvage what parses."* A
   truncated JSON array usually yields all but the last record.
5. **Only when 1–4 are exhausted**, an operator may call
   `storageAcceptCorruptLoss("<store>")` to re-enable writes. **This is the
   point of no return** and nothing calls it automatically.

---

## 3. Restoring a backup

Account → Data → Import → choose the file.

**What the restore does — worth knowing before you click:**

| store | behaviour | why |
|---|---|---|
| patients, visits, users, settings, audit | **replaced** | These are the record; the backup is the record |
| kb_signoffs | **merged**, local wins on a clash | A restore must never destroy review work done since the backup |
| kb_overlays | **merged by id** | Somebody's own clinical reasoning |
| competency_log | **merged by id** | A supervisor's sign-off is irreplaceable |
| age_brackets | **merged**, local wins | The local decision is the more recent one |
| migrations | **union of applied ids** | Replacing either way corrupts data — see below |
| cloud_tombstones | **not in the backup at all** | Replaying a stale delete could destroy a record that has since been legitimately restored |

**Why the migration ledger unions.** If the restore replaced it with an older
backup's ledger, the device would forget it had already applied a shape change
and re-run it over already-migrated records. If it kept only the local one, a
restored device would re-run migrations that the backed-up data had already had.
An id on either side means "this data has been through that change", which is
the only safe reading.

**Version check.** A backup from a *newer* `STORE_VERSION` than this build is
refused, not merged. Update the app first.

---

## 4. Migration failure

The runner (`js/storage-migrations.js`) is built so this is not an emergency.

**What it does automatically:**

- Snapshots every store any pending migration touches, **before** running one.
- Runs migrations in order, once each, ever.
- **Rolls the whole run back** from that snapshot if any step throws or any
  write is refused. A half-migrated record store is not reachable.
- **Refuses to start** if a store is damaged or the vault is locked, and says
  which — migrating what you cannot read means writing the empty fallback over
  real data.
- Records each success immediately, so a crash mid-run resumes correctly.

**If the console says migrations were held:** fix the named cause (restore the
damaged store, or unlock the vault) and reload. Nothing was changed.

**If a migration succeeded but was wrong** — worse, because the data is now in
the new shape:

1. `migrationsRollback()` runs each declared inverse in reverse order. It
   **refuses**, naming the migration, if any step is one-way — that is the right
   answer, not a half-undo.
2. If it refuses, restore from the pre-migration snapshot.
   `migrationSnapshots()` lists them newest first; each holds the exact
   pre-migration contents of every store that migration touched.
3. If neither works, restore a backup file.

---

## 5. Device lost, stolen, or dead

| you had | recovery |
|---|---|
| Cloud sync on | Sign in on a new device. Records download. **You need the vault passphrase** to read them — the server only ever held ciphertext. |
| Backup file, no sync | Install, import the backup. You are as current as the file. |
| Neither | **The records are gone.** There is no other copy. This is why §0 exists. |

**On a stolen device:** if the vault was on and the device was locked, the disk
is unreadable and the stored session token is wrapped — a thief cannot reach
your cloud either. Still, sign out that session server-side (Supabase dashboard
→ Auth → the user) and change the password. **There is no in-app session
revocation.** That is a real gap and is on the enterprise list.

---

## 6. Forgotten vault passphrase

**Correction.** An earlier draft of this manual said there was no recovery at
all. That was wrong — please re-read this section.

There are up to **three** ways into a vault, and they all open the same data
key:

1. **The passphrase.** Day to day.
2. **The printed recovery code**, issued once when the vault is turned on. If
   you wrote it down, a forgotten passphrase is an inconvenience, not a
   disaster. Enter it on the lock screen under "Forgotten the passphrase?".
3. **An administrator reset** — *only if an administrator was enrolled while
   the vault was open*. On the lock screen, "Administrator reset with the
   clinic master password". Enter the master password and a new passphrase.
   Nothing is unlocked by the reset itself; sign in with the new passphrase as
   normal, and the user is then required to replace it with their own.

**If all three are unavailable, the records on that device are unrecoverable**
— by anyone, including Entopic. The remaining mitigations are procedural:

- Write it down and store it the way you store the practice's other critical
  secrets — a sealed envelope in the safe, or a password manager the practice
  owns rather than an individual.
- **More than one person must have it.** A single-person dependency here is a
  business-continuity risk, not an IT one.
- Keep unencrypted backups only somewhere physically secure, and know that they
  are unencrypted.

**Decided 2026-08-07: administrator reset is available, opt-in.** Enrolling one
means whoever holds the clinic master password can decrypt every record on that
device. That is a real reduction in the confidentiality promise and the app says
so in those words before you enrol. In exchange, a forgotten passphrase stops
being able to end a practice. Enrolment needs the user's own passphrase (so it
cannot be imposed), every use is audited, and it can be withdrawn at any time.

**Treat the master password as the most sensitive secret the practice holds.**
It is not a convenience credential — it is a key to every encrypted record on
every enrolled device.

---

## 7. Server-side recovery

**Unverified against a live project** — the procedures below are correct for the
schema as written, but this session had no Supabase project to run them against.
Do a dry run on a scratch project before you need them.

### 7.1 Rebuild a backend from scratch

Run in order on a fresh Supabase project:

```
db/migrations/001_core_schema.sql
db/migrations/002_profiles_and_invites.sql
db/migrations/003_integrity_and_audit.sql
db/migrations/004_rls_function_grants.sql
```

All four are idempotent, so re-running is safe.

**Do not skip 004.** Without it every RLS policy calls a function the
`authenticated` role may not execute, and a signed-in clinician's very first
request fails with `permission denied for function is_clinic_member`. Sync,
multi-device and backup are dead on arrival — not degraded, non-functional.

**After running them, verify tenant isolation before letting anyone in:**

1. Create two clinics with two users.
2. As user B, select from `patients`. You must see only Clinic B's rows.
3. As user B, insert a row with Clinic A's `clinic_id`. It must be refused.
4. As `anon`, select from `patients`. It must be refused.

If any of those four behaves differently, stop and get help. This is the check
that a mistake in the policies has to get past.

### 7.2 Point-in-time restore

Supabase's own PITR (paid tiers). Restore to just before the incident.

**After any server restore, on every device:** the local copy may now be
*newer* than the server. Do **not** let a stale server overwrite a current
device — the merge protects unpushed edits, but a device that had already
stamped `_cloud_updated` will accept the restored (older) rows as authoritative.
Export a local backup on each device *before* reconnecting.

### 7.3 Failed deployment

The client is static files. Roll back by redeploying the previous commit;
there is no build step and no server-side state to unwind.

Schema changes are the risk: **there are no `down` scripts** and no
`schema_migrations` table, so "which migrations has this project had?" is
answered by a human reading four files. That is on the enterprise list, and
until then, snapshot the database before applying any new SQL.

### 7.4 Server outage

**Nothing stops.** Every exam runs from local storage, and the diagnostic engine
has no network path in any configuration. Writes queue; the outbox is
recomputed from record timestamps, and the delete queue is now on disk. When the
server returns, `cloudStart()` restores tombstones, pulls, and drains.

**What you lose during an outage:** multi-device live updates, and off-device
backup. Not the ability to see patients.

---

## 8. Recovery objectives — what is actually true today

| objective | with cloud sync | local only |
|---|---|---|
| **RPO** (how much work can be lost) | seconds — 800 ms debounce plus the request | **since your last manual backup** |
| **RTO** (how long to be working again) | minutes — sign in on any device | minutes if a backup exists; **never** if not |
| Records survive device loss | ✅ | ❌ unless a backup exists |
| Records survive a server loss | ✅ the device is authoritative | ✅ |
| Records survive both | ❌ | ❌ |

**The honest summary: with cloud sync on, this is a well-protected system. With
local-only and manual backups, the practice's entire clinical record depends on
somebody remembering to press a button.** That is the gap to close first, and it
is about 24 hours of work.

---

## 9. What to fix, in order

| # | work | effort | removes |
|---|---|---|---|
| 1 | Automatic scheduled backup with a visible "last backup" age | ~24 h | The single most likely total-loss path |
| 2 | Restore-drill checklist and a "verify this backup" button | ~16 h | Backups that turn out not to restore |
| 3 | Server-side `schema_migrations` table + `down` scripts | ~40 h | "Which migrations has this database had?" |
| 4 | In-app session revocation | ~24 h | Stolen-device exposure |
| 5 | ✅ Administrator vault reset | done | The unrecoverable-passphrase path |
| 6 | Backend health page (last sync, queue depth, storage headroom, backup age) | ~32 h | Diagnosing anything by guesswork |
