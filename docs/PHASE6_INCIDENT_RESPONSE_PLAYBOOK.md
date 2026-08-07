# Phase 6 — Incident Response Playbook

**Audience:** the founder, and whoever is helping at the worst possible moment.

**Before the procedures, one thing.** Entopic today has **no breach detection**.
Nothing counts failed unlocks across devices, notices a bulk export, or flags an
unusual read pattern. So every procedure below begins the same way: *you found
out from a human*. That is the honest starting position, and closing it (SEC-11)
is the highest-value security work remaining.

---

## 1. Severity, and what each obliges you to do

| level | means | examples | first action | clock |
|---|---|---|---|---|
| **S1 — Confirmed breach** | PHI is known to have reached someone unauthorised | unencrypted device stolen; database exfiltrated; backup emailed to the wrong address | Contain, then **notify** | statutory — hours |
| **S2 — Suspected breach** | PHI may have been exposed; unproven | laptop missing but vault was on; unexplained admin reset in the audit log | Preserve evidence, investigate | 24 h to classify |
| **S3 — Control failure, no exposure** | a safeguard failed, nothing got out | vault found off on a clinic device; backups plaintext on a shared drive | Fix, record | days |
| **S4 — Integrity or availability** | data wrong or unreachable, not disclosed | corrupt store; failed migration; sync divergence | Recover (see the Disaster Recovery Manual) | hours |

**When unsure, classify UP.** The cost of over-classifying is a wasted
afternoon. The cost of under-classifying is a missed statutory notification.

---

## 2. First fifteen minutes — any incident

1. **Write down the time and what you were told.** Everything later depends on
   this and memory is unreliable under stress.
2. **Do not wipe, reinstall, or "clean up" anything.** Evidence and recovery
   live in the same place.
3. **Export the audit log** from every device you can still reach — this is the
   only forensic record and the local one is capped at 2,000 entries, so it is
   *losing evidence while you decide*.
4. **Do not sign out** of a device you suspect is compromised until you have
   read its audit log; signing out locks the vault and you lose access to it.
5. Classify (§1). Write the classification down with your reasoning.

---

## 3. S1 · Confirmed breach

### 3.1 Contain

| what happened | do this |
|---|---|
| Device stolen, **vault ON, was locked** | Change the Supabase account password (this rotates refresh tokens). Note in the incident log that the disk is unreadable and the stored token was wrapped. Likely **S2, not S1** — say why. |
| Device stolen, **vault OFF** | **S1.** Every record on it is readable. Assume full disclosure of that device's records. |
| Cloud credentials leaked | Change the password immediately; rotate the Supabase anon key; **read `audit_log` for what was accessed and when**. |
| Backup file misdirected | If plaintext, **S1**. If encrypted, S2 — the passphrase is the remaining question. |
| Admin master password compromised | **S1 for every enrolled device.** Withdraw enrolment on each (needs the user's passphrase), then re-enrol with a new master password. |

### 3.2 Assess the scope — the four questions a regulator asks

1. **Whose data?** Which clinic, which patients, over what period.
2. **What data?** Identity, clinical content, or both.
3. **Was it protected?** Encrypted at rest is the difference between a breach
   and an incident in most regimes — say which, and how you know.
4. **How do you know?** Point at the audit log entries.

### 3.3 Notify

**Get legal advice on the deadline before you write anything.** Under DPDP the
Data Protection Board and affected individuals must be told; under GDPR it is
72 hours to the supervisory authority. Entopic cannot tell you which applies —
that is what ADR-011 and a lawyer are for.

Notification should state: what happened, when, whose data, what was exposed,
what protection was in place, what you have done, what the person should do,
and who to contact.

**Do not speculate and do not minimise.** "We believe no records were readable
because the device was encrypted and locked" is a defensible statement if it is
true and you can show it. Anything softer than the truth will be discovered.

### 3.4 Record

Incident id, timeline, classification and reasoning, scope, actions with
timestamps, who was told and when, root cause, what changed afterwards. Keep it
even if the incident turns out to be nothing.

---

## 4. S2 · Compromised account

1. Change that user's password. If cloud, change the Supabase password —
   **there is no in-app session revocation (SEC-4)**, so this is the only lever
   you have, and it is slower than it should be.
2. Read the audit log for that user: `chart_opened`, `visit_viewed`,
   `record_changed`, `record_amended`, `data_exported`, `vault_admin_reset`.
3. **`data_exported` is the entry that turns S2 into S1.** A read is bad; a
   bulk export leaves the building.
4. Check `vault_admin_reset_failed` — repeated entries mean somebody was
   guessing the master password.
5. If the account is a clinic admin, treat every enrolled vault as exposed.

---

## 5. S3 · Control failure

| finding | action |
|---|---|
| Vault off on a clinic device | Turn it on. Records are re-encrypted with per-store read-back verification. Record why it was off. |
| Backups plaintext in a shared folder | Switch to encrypted export. Destroy the plaintext copies and record that you did. |
| Admin enrolled without the user knowing | Impossible by construction — enrolment requires their passphrase. If it appears to have happened, **the passphrase is compromised**: escalate to S2. |
| No backup for weeks | The banner exists for this. Export, then find out why nobody acted. |
| Shared account in use | Attribution is now worthless for that period. Say so in any subsequent investigation. |

---

## 6. S4 · Integrity and availability

Follow `docs/PHASE5_DISASTER_RECOVERY_MANUAL.md`. Three things belong here
rather than there:

- **A corrupt store is not automatically an incident.** It is a control
  working. It becomes S2 only if the corruption pattern suggests tampering.
- **A failed migration rolls the whole run back** and does not need an
  incident — but record it, because a migration that failed once will be
  attempted again on other devices.
- **Sync divergence** (two devices disagreeing) is S4 unless the difference
  is a record one of them should never have had, which is S1.

---

## 7. Forensic sources, and what each can tell you

| source | contains | limits |
|---|---|---|
| Local audit log | 66 event kinds including reads, changes, amendments, vault operations | **capped at 2,000 entries**; a device holder could edit it (no tamper evidence) |
| Server `audit_log` | append-only, admin-readable | **best-effort push (SEC-8)** — absence proves nothing |
| `engine_provenance` on each visit | KB version, tokens, what was shown | not security data, but establishes what the clinician saw |
| Amendment trail on a visit | who changed it and when | on the record itself |
| Quarantined corrupt bytes | the damaged store as it was | timestamped keys |
| Pre-migration snapshots | data before a shape change | rolling |
| **Automatic snapshots (new)** | full clinic state, up to 7 points | on-device only |
| Supabase logs | connection and query metadata | retention depends on plan |

**The gap to close first: the local log is complete and truncatable; the server
log is durable and incomplete.** That is exactly backwards for evidence.

---

## 8. What to build so the next incident is survivable

| # | capability | why | effort |
|---|---|---|---|
| 1 | **Durable audit push** (queue + retry, like tombstones) | absence of a server entry currently proves nothing | 24 h |
| 2 | **Failed-unlock and failed-reset counters, visible to an admin** | the cheapest breach detection there is | 16 h |
| 3 | **Bulk-export alerting** | `data_exported` is the S1 tripwire | 16 h |
| 4 | **Session revocation** | today, containment means changing a password and waiting | 24 h |
| 5 | **Hash-chained audit log** | makes local tampering detectable | 40 h |
| 6 | **Read-volume anomaly detection** | the classic insider signature | 60 h |
| 7 | **Incident log in-product** | so the record exists before it is needed | 16 h |

**Items 1–4, about 80 hours, take incident response from "ask around" to
"read the evidence".** Nothing else on the security roadmap changes outcomes as
much per hour.

---

## 9. Drill

Run once a quarter, with a timer:

1. Restore last week's backup into a spare browser profile. **Did it work?**
2. Export an audit log and answer: who opened patient X's chart last month?
3. Simulate a lost passphrase and recover with the printed code.
4. Simulate a lost passphrase *and* a lost code, and recover with the
   administrator master password.
5. Corrupt a store deliberately and follow §2 of the Disaster Recovery Manual.
6. Time yourself. **If any step takes more than fifteen minutes, the procedure
   is wrong, not you.**

A playbook nobody has ever executed is a document, not a capability.
