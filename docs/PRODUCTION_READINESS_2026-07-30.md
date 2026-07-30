# Entopic — Production Readiness Audit
**Date:** 30 July 2026
**Question asked:** *"Entopic must be deployed in a real optometry clinic tomorrow. What prevents that?"*
**Scope:** authentication, authorization, encryption, audit logging, offline recovery, sync conflicts, backup, disaster recovery, monitoring, error handling, logging, API stability, database consistency, migration safety, data validation, security headers, rate limiting, session handling.

Everything below was **verified against the running code or a real database**, not inferred. Where I could not verify something, it says so.

---

## Verdict

**Do not put this in front of patients tomorrow morning as it stood at the start of this audit.** The backend was non-functional on a fresh project (blocker B-1 — proven, not suspected), and the terminal itself had no clinic-grade access control.

After the fixes in this session: **every deployment blocker is cleared and verified, including encryption at rest** — patient records on the device are now AES-GCM-256 ciphertext with a recovery code so a forgotten passphrase can never destroy them. What remains is a **backup routine that has to be a human habit (H-3)** and keeping **full-disk encryption on** as a second layer. Those are operational, not code.

| | Count | Status |
|---|---|---|
| **1. Deployment blockers** | 5 | **all 5 fixed in code** |
| **2. High risk** | 7 | 2 fixed · 5 scoped |
| **3. Medium risk** | 7 | scoped |
| **4. Low risk** | 4 | noted |

Test suite: **417 passing, 0 failing** (was 376 — 41 new tests cover these fixes, 21 of them exercising real encryption). Build audit: **0 FAIL**.

---

## 1. Deployment blockers

### B-1 — The backend was dead on arrival ✅ FIXED
**Severity: critical. This was the single biggest finding.**

Building a Supabase project from `001` + `002` + `003` produced a backend where **every request from a signed-in clinician failed**:

```
ERROR:  permission denied for function is_clinic_member
```

**Why.** `001` creates the tenant-isolation helpers in the `private` schema, then locks them down with `revoke all on schema private from anon, authenticated` and `revoke all on function ... from public, anon`. The `authenticated` role only ever held EXECUTE *via PUBLIC* — the revoke removed it, and nothing granted it back. Every row-level-security policy on `patients`, `visits`, `clinics`, `clinic_members`, `encounters` and the KB tables calls one of those helpers, and a policy is evaluated with the *querying* role's privileges. So sync, multi-device and cloud backup were not degraded — they were completely non-functional.

**How I verified it.** Applied 001–003 to a clean PostgreSQL 16 (the version Supabase runs), created two clinics and two users, and queried as the `authenticated` role. Reproduced exactly. This is why it went unnoticed: the *reference* project it was reconstructed from already carried the grants, so the live install worked while the SQL files could not reproduce it.

**Fix.** `db/migrations/004_rls_function_grants.sql` — grants `authenticated` USAGE on the schema and EXECUTE on the four helpers, and re-asserts the lockout for `anon`.

**Re-verified after the fix, on a database built from scratch with 001→004:**

| Test | Result |
|---|---|
| Clinician of Clinic B lists patients | sees **only** Clinic B's — Clinic A's are invisible |
| Clinician of B inserts into Clinic A | **refused** by RLS |
| Clinician of B updates A's record | **0 rows** — A's record intact |
| Signed-out (`anon`) reads patients | **denied** |

Pinned by `tests/db-grants.test.js` (5 tests). I confirmed the test **fails** when 004 is removed, so it genuinely guards.

### B-2 — Backend credentials and "replace all data" were exposed to every user ✅ FIXED
The Supabase URL + anon key fields, the Disconnect button, and **Restore-from-backup (which replaces every patient record)** all sat in the **Account** tab, visible to any signed-in account — including a student or a self-created one. Any user could repoint the clinic's data at their own project, or wipe the records.

**Fix.** All three moved into a new admin-only **Deployment** panel (`js/ui-deployment.js`). Non-admins now see sync *status* only — verified in-browser that a non-admin's card contains no key field.

### B-3 — Anyone could create an account; sessions never locked ✅ FIXED
On a shared consulting-room terminal, the sign-in screen offered **"Create new account"** to anybody who walked up — and that account could open every patient record. There was also **no idle lock** (a session lasted until the tab closed) and **no limit on password guessing**.

**Fix.** One switch — **Clinic deployment mode** — that closes self-signup (the administrator creates staff accounts) and auto-locks the screen after an idle period, *saving any exam in progress first* so nothing is lost. Login throttling is always on, independent of the switch, because slowing repeated wrong passwords has no downside anywhere. Default idle lock 15 min, configurable 1–240.

### B-4 — Patient records were not encrypted at rest ✅ FIXED (record vault)
Every patient record lived in browser `localStorage` **in the clear**. Data leaving for the cloud *was* encrypted, but on the device itself, **anyone with the machine — or a copied browser profile — could read every record.** A stolen laptop was a full records breach.

**Now fixed properly**, in `js/local-vault.js` + `js/ui-vault.js`. Admin → **Record encryption** turns it on; patients, visits, the audit trail and user accounts become AES-GCM-256 ciphertext on disk.

**The two hard problems, and how each is solved:**

**1. "The app reads records synchronously everywhere; Web Crypto is async."**
Rewriting every call site to async would have touched the whole codebase and put the clinical path at risk. Instead the vault decrypts **once on unlock** into an in-memory cache: reads stay synchronous and untouched, writes update the cache immediately and encrypt to disk asynchronously, flushed before the page can close.

**2. "A forgotten passphrase must not destroy a clinic's records."**
This is why encrypting clinical data badly is worse than not encrypting it. The layout is a standard envelope:

```
random data key ──wrapped by──> passphrase-derived key   (daily use)
                └─wrapped by──> recovery-code key        (the way back)
```

Two independent routes to the same key. The recovery code is 25 symbols (~125 bits) from an alphabet with no ambiguous glyphs, shown once, and the UI **refuses to move on until you confirm you have written it down**. Changing the passphrase re-wraps the key — records are never re-encrypted, so it is instant and cannot half-fail.

**Safety properties, each pinned by a test (21 tests, real Web Crypto — no mocks):**

| Property | Verified |
|---|---|
| Records survive the round trip byte-for-byte | ✅ |
| Nothing readable on disk — no name, MRN or DOB | ✅ |
| The raw key is never written to disk (only wrapped copies) | ✅ |
| A forgotten passphrase is recoverable via the code | ✅ |
| A failed migration rolls back — records exactly as they were | ✅ |
| **A locked vault cannot overwrite real records with an empty list** | ✅ |
| Ciphertext is never handed to the app as if it were records | ✅ |
| Wrong passphrase / wrong recovery code refused cleanly | ✅ |
| Turning it off writes records back in the clear (no one-way door) | ✅ |

**Two real bugs this work surfaced and fixed:**
- `vaultLock()` cleared the in-memory cache while an encrypt-and-write was still in flight, so **a pending write was lost on lock**. Fixed by capturing the key and cache synchronously so a started flush always completes.
- With accounts encrypted, a locked device read **zero users** and would have shown the "create the first account" screen — i.e. a stranger could have made themselves an account on a locked clinic terminal. Boot now hands the screen to the vault unlock before any account logic runs, and `signupAllowed()` refuses outright while locked.

**Verified end-to-end in a real browser**, including the case that actually matters — reload the page (the "next morning / stolen laptop" test): the device comes up **locked**, sign-in and sign-up are both hidden, records and accounts read as nothing, a destructive write is refused, and both the passphrase and the recovery code bring everything back intact.

**Still keep full-disk encryption on** (BitLocker / FileVault). The vault protects a powered-off, locked or stolen device; it cannot protect a machine left switched on, unlocked and unattended. That is what the idle auto-lock is for — and the idle lock now closes the vault too, not just the session.

### B-5 — The default administrator password ✅ NOW SURFACED AS A BLOCKER
The admin account could still be on its built-in default. It is now the second item in the readiness checklist, shown in red as a blocker until changed.

---

## 2. High-risk issues

### H-1 — Restore could silently destroy a clinic's records ✅ FIXED
The old import checked only `data.patients && data.visits` — **an empty array passes that.** A truncated, wrong, or half-downloaded file would replace every record and report *"Data imported successfully"*. It also discarded the audit trail and never checked the version.

**Fix.** `validateBackup()` — rejects non-backups, corrupt records (missing ids), and backups from a **newer** Entopic; warns on an empty backup or a missing audit trail; shows a before/after count ("replacing 412 patients with 0") and **downloads a safety snapshot of current data before overwriting anything**. The audit trail is now restored too.

> A bug my own test caught: `STORE_VERSION` is the semver string `"1.0.0"`, so my first version check did `Number("1.0.0")` → `NaN` and never fired. Fixed with a proper version comparator.

### H-2 — No handling of rate limits or transient backend failures ✅ FIXED
`cloudApi` treated **429 (rate limited)** and **5xx (server restarting)** as permanent failures. A busy clinic — or a free-tier limit hit mid-morning — would drop writes.

**Fix.** Bounded exponential backoff (1s → 2s → 4s, max 3 retries, capped), honouring the server's `Retry-After`. `4xx` is never retried (retrying a bad request is pointless). Network failures get the same treatment, so a 10-second wifi drop no longer loses a queued write.

### H-3 — No backup schedule, and no restore has ever been rehearsed ⚠️ NEEDS A ROUTINE
Backup is a **manual button someone has to remember to press**. That is not a backup strategy for clinical records. There is also no evidence a restore has ever been tested end to end.

**Do before go-live:** connect the Supabase project (continuous encrypted backup), *and* set a weekly calendar reminder to export a local backup to separate storage. **Then actually restore one onto a spare machine and confirm the records come back.** An untested backup is a hope, not a plan.

### H-4 — Backups are unencrypted plaintext PHI
`entopic-backup-YYYY-MM-DD.json` contains every patient name, DOB and record **in the clear**, plus the user accounts. On a USB stick or in a Downloads folder it is a breach waiting to happen. *Scoped, not fixed:* an encrypted-export option reusing the existing PBKDF2/AES-GCM primitives — a contained next change. Until then: store backups only on encrypted media.

### H-5 — No monitoring; failures are invisible off-device
Errors go to a **local in-memory ring buffer** shown in the Admin panel. If the terminal starts failing, nobody finds out unless someone looks. There is no alerting and no remote error reporting. *Scoped:* push caught errors (de-identified — no PHI) to the existing `audit_log` table so failures are visible centrally.

### H-6 — No migration runner or applied-version tracking
Migrations are `.sql` files pasted into the Supabase console by hand. Nothing records **which have been applied** to a given project. With four files this is manageable; it will cause a mistake as the count grows. *Scoped:* a `schema_migrations` table and a documented apply order. **Good news:** all four files are genuinely idempotent — I verified by applying each **twice** to a real database with zero errors.

### H-7 — The local audit trail silently drops history
`logAudit` keeps only the **most recent 2000 events**, then discards the oldest with no warning. For a records system where the access log may be the evidence, silent truncation is the wrong default. The *server* audit log is append-only and immutable (verified: `audit_log` has INSERT and SELECT policies only — no UPDATE, no DELETE), so connecting the backend mitigates this. Un-connected, history is lost.

---

## 3. Medium-risk issues

| # | Issue | Detail |
|---|---|---|
| **M-1** | No HTTP security headers | CSP exists as a `<meta>` tag, which covers the main risks, but `HSTS`, `X-Frame-Options`, `Referrer-Policy` and `X-Content-Type-Options` can only be set by a web server. Irrelevant if opened from a local file; **required** if ever served over a network. |
| **M-2** | CSP needs `'unsafe-inline'` | The UI is built on inline `onclick` handlers, so script-injection protection is weaker than it could be. Fixing means an event-delegation refactor — deliberately deferred; not worth destabilising a working UI. |
| **M-3** | Rate limiting is client-side only | Login throttling lives in `localStorage`, so it stops someone at the keyboard, not someone with the filesystem. Server-side limits are whatever Supabase's defaults are. |
| **M-4** | `localStorage` will run out | Hard ~5 MB ceiling; it is the system of record. A busy clinic **will** hit it. There is a graceful 80% warning and an IndexedDB mirror, but the real fix is moving the record store to IndexedDB. |
| **M-5** | No server-side data validation | The database accepts any JSON blob into `patients.data` / `visits.data`. Clinical plausibility checks (`clinical-validators.js`) run only in the browser, so a buggy or old client could write malformed records. |
| **M-6** | 24 UI files have no unit tests | Covered by browser checks only — the thinnest part of the safety net. Reported honestly by `tools/audit.js` rather than hidden. |
| **M-7** | Unsynced work is not visible | A clinician cannot see "12 records not yet backed up". If the device died, they would not know what was lost. |

---

## 4. Low-risk issues

| # | Issue |
|---|---|
| **L-1** | No build/version stamp in the UI — makes supporting "which version are you on?" harder. |
| **L-2** | 25 `console.*` calls remain. **I checked every one: none logs patient data.** Noise, not a leak. |
| **L-3** | Password minimum is 6 characters; 8+ with a strength hint would be better. (Admin already requires 8.) |
| **L-4** | The cloud session JWT sits in `localStorage`. Standard for Supabase, and mitigated by CSP and zero third-party scripts, but a successful XSS could steal a session. No session-revocation path exists. |

---

## What I checked and found *sound*

Stating these matters as much as the failures — several are things that are commonly wrong and are right here:

- **Tenant isolation logic is correctly designed.** Once B-1 is fixed, cross-clinic reads and writes are properly refused (proven above on a real database).
- **All four migrations are genuinely idempotent** — verified by double-application, not by reading the header comment that claimed it.
- **The server audit log is truly immutable** — no UPDATE or DELETE policy exists.
- **RLS is enabled on all seven tables** holding clinical or account data.
- **PHI is encrypted before egress** (AES-GCM-256, key derived by PBKDF2 and never uploaded), and sync is gated on explicit consent.
- **No PHI in logs** — checked all 25 logging calls.
- **Sync conflicts are handled conservatively** — a locally-edited, unpushed record is never silently overwritten by a remote copy; conflicts are recorded.
- **Offline recovery works** — an IndexedDB mirror restores `localStorage` if it is cleared.
- **The offline diagnostic path is intact.** I booted the app from a clean extract and confirmed all seven red-flag alerts still fire and scoring works with no network. **Nothing in this audit touched engine logic.**

---

## 5. Step-by-step remediation plan

### Already done this session (verified)
1. ✅ **`004_rls_function_grants.sql`** — makes the backend actually work. *Apply this to your Supabase project before anything else.*
2. ✅ **Deployment panel** (Admin tab) — readiness checklist, backend credentials with a live connection test, clinic mode, restore.
3. ✅ **Clinic deployment mode** — closes self-signup, idle auto-lock (saves first), login throttling.
4. ✅ **Safe restore** — validation, before/after counts, automatic safety snapshot, audit trail preserved.
5. ✅ **Sync backoff** — 429/5xx/offline retried instead of dropped.
6. ✅ **20 new tests** (396 total, all passing).

### Before the clinic opens — your steps, in order
1. **Apply the migrations** to your Supabase project in order: `001 → 002 → 003 → 004`. (Paste each into the SQL editor. Re-running is safe.)
2. **Open Admin → Deployment readiness.** Work the list until no red items remain.
3. **Change the administrator password** (it flags itself until you do).
4. **Turn ON clinic deployment mode.**
5. **Connect the backend** — paste the project URL and the **anon** key (never the `service_role` key), press *Connect & test*, and confirm it answers green.
6. **Give consent and set the clinic passphrase** so patient records actually sync encrypted.
7. **Create staff accounts** for each person who will use the terminal.
8. **Turn on record encryption** (Admin → Record encryption). **Write the recovery code down and store it off the device** — it is the only way back if the passphrase is forgotten.
9. **Turn on BitLocker / FileVault** too. The vault protects a locked or stolen device; disk encryption is the second layer.
10. **Do a restore drill:** export a backup, restore it on a spare machine, confirm the records appear. Only then is the backup real.
11. **Rehearse the recovery code once**, on a spare device, so you know it works before you ever need it.

### Next engineering block (in value order)
1. **H-4 — encrypted backup export** (contained; reuses existing crypto).
2. **M-7 + H-5 — "N records not yet backed up" indicator, and push caught errors to the server audit log.** Together these end the "silent failure" class of problem.
3. **H-6 — `schema_migrations` tracking.**
4. **M-4 — move the record store to IndexedDB.** The largest item; do it before any clinic accumulates a year of records.
5. **Vault follow-ups:** per-user unlock (today one clinic passphrase unlocks the device) and moving the cached cloud-PHI key inside the vault — see "Known limits" below.

---

## Known limits of the record vault (stated, not glossed)

These are real and worth knowing before you rely on it:

1. **One clinic passphrase unlocks the device, not one per person.** Everyone using that terminal shares it. That suits a small practice; it means you cannot tell *who* unlocked the device from the passphrase alone (the audit trail still records who signed in afterwards). Per-user unlock is a sensible later step.
2. **The cached cloud-sync key is still stored outside the vault.** If you use cloud sync, the key that decrypts the *cloud* copy sits in local storage in the clear. Someone who steals the device therefore still can't read the local records (those are encrypted) but could decrypt the cloud copy. Moving that key inside the vault is a contained follow-up — listed in the plan.
3. **An unlocked, unattended machine is readable.** By design: while you are working, the records are decrypted in memory. That is what the idle auto-lock is for, and it now closes the vault as well as the session.
4. **Encryption is off until you turn it on.** The readiness panel reports the truth for *that* device and marks unencrypted records as a blocker — it never claims protection you have not enabled.
5. **A browser without Web Crypto cannot encrypt.** Old browsers are reported as blocked rather than silently storing records in the clear.

---

## Honest limits of this audit

- I tested the database against **local PostgreSQL 16**, not against your live Supabase project. Supabase adds its own defaults (notably table grants for `authenticated`), which I simulated. **Apply 004 and confirm sign-in works before relying on it.**
- I did **not** test with real patient volumes; the `localStorage` ceiling (M-4) is a calculation, not a measurement.
- I have **not** assessed regulatory obligations (DPDP Act, NABH, or any local requirement for clinical records). That needs a professional who knows Indian health-data law, and it may change what is required here. **Do not treat this audit as a compliance sign-off.**
- The fixes are verified by automated tests and browser checks. They have not been through a real clinic day.
