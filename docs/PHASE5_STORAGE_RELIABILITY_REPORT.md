# Phase 5 — Storage Reliability Report

**Question this document answers:** can Entopic lose a patient record, and if
so, how?

Every row in the tables below was produced by running the software. Where a
scenario could not be executed it is marked **reasoned, not measured** and says
what would have to be done to test it properly.

---

## 1. The storage layers, and what each is for

| layer | holds | quota | survives | does not survive |
|---|---|---|---|---|
| **localStorage** | primary copy of every store | ~5 MB (measured ~9 MB Chromium) | reload, crash, power loss | "clear browsing data", storage-pressure eviction |
| **IndexedDB mirror** | copy of every store flagged `mirror` | hundreds of MB | localStorage being wiped; restores at boot | full profile deletion, a new device |
| **local vault** | AES-GCM-256 over patients / visits / audit / users | — | disk theft | a forgotten passphrase (**by design**) |
| **backup file** | everything flagged `backup` | — | device loss | not being pressed |
| **Supabase** | ciphertext envelopes, per clinic | — | total device loss | never having synced |

The classification is declared once, in `js/data-classification.js`, and three
mechanisms derive from it — encryption, mirroring, backup. They used to be three
hand-maintained lists and they had drifted: the audit trail was encrypted and
backed up but **never mirrored**, and four stores added later were protected by
nothing at all. A test now fails if the table and the code disagree.

Two stores were added this phase and both are in the table with reasons:
`migrations` (backed up — a restore without it re-runs migrations over
already-migrated data) and `cloud_tombstones` (**not** backed up — a tombstone
is a message in flight, and replaying a stale one from an old backup could
delete a record that has since been legitimately restored).

---

## 2. The write path, and every place it can refuse

`saveStore(key, data)` returns a boolean. It refuses in three cases and each
refusal is a deliberate protection:

```
saveStore(key, data)
 ├─ storageIsCorrupt(key)?  ──► REFUSE, log, return false
 │     "a store we could not READ must not be WRITTEN"
 ├─ vault on and locked?    ──► REFUSE, log, return false
 │     writing plaintext defeats the vault; writing the fallback destroys records
 ├─ mirrorStore()   ← IndexedDB FIRST
 ├─ localStorage.setItem()
 │     └─ QuotaExceededError ──► storageNoteWriteFailure(), return false
 ├─ cloudEnqueue(key)
 └─ storageQuotaWatch()  ──► warns once at 80 %
```

**The refusal is the feature.** The corrupt-store guard exists because of a
measured incident: three patients, truncate the store, reload — zero shown —
one ordinary save, and three records were gone permanently. `loadStore` now
distinguishes *corrupt* from *empty*, quarantines the damaged bytes under a
timestamped key before doing anything else, and blocks writes until an operator
explicitly accepts the loss.

**What was wrong until this phase:** the protection worked perfectly and
**nobody was told**. `doSave()` ignored the return value and emitted
`visit:saved` regardless. Measured in a browser: corrupt the visits store, type,
save — the write was refused *and the saved indicator flashed*. The records
survived; the clinician's belief that their work was captured did not deserve
to. That is BE-1, and it is now fixed: `doSave` returns a result, emits
`visit:save-failed` with a reason, a persistent banner says so, and
`completeVisit` refuses to sign off a visit whose data did not save.

---

## 3. Failure matrix — measured

| # | scenario | how it was produced | outcome | verdict |
|---|---|---|---|---|
| 1 | Ordinary save | real app, real exam | write + mirror + enqueue; `ok: true` | ✅ |
| 2 | Truncated store, then a save | `setItem("entopic_visits", '[{"id":"x"')` then `doSave()` | refused; `ok: false`; reason *"the visit store is damaged and writes are blocked"*; banner shown | ✅ **fixed this phase** |
| 3 | Complete a visit whose data will not save | as #2 then `completeVisit()` | **refused**, visit left in progress | ✅ **fixed this phase** |
| 4 | Store parses but is the wrong shape | object where a list is expected | treated as corrupt | ✅ |
| 5 | Ciphertext read while vault off | envelope in a plain store | fallback returned, never handed back as records | ✅ |
| 6 | Vault locked, then a save | `vaultUnlocked() === false` | refused, logged | ✅ |
| 7 | Quota exhausted | `storageNoteWriteFailure` path | `false` returned, failure state persists, banner | ✅ |
| 8 | Two tabs edit one visit | `recDetectConflict` with a stale stamp | version being replaced is **preserved on the record**; audit entry | ✅ |
| 9 | localStorage wiped, mirror intact | mirror restore path | restored at boot, one reload | ✅ |
| 10 | Delete, then close the tab immediately | tombstone persistence test | queued **on disk**, restored at next start | ✅ **fixed this phase** |
| 11 | Second delete during an in-flight push | stubbed `cloudApi` | second delete still queued | ✅ **fixed this phase** |
| 12 | Tombstone queue overflows | 5,010 tombstones | oldest dropped, **audit entry written** | ✅ |
| 13 | Migration fails halfway | throwing `up()` across two stores | **whole run** rolled back from the snapshot | ✅ **new this phase** |
| 14 | Migration attempted on a damaged store | corrupt store + pending migration | **held**, not guessed; ledger untouched | ✅ **new this phase** |
| 15 | Migration attempted while vault locked | locked vault | held with a reason | ✅ **new this phase** |
| 16 | Migration run twice | run three times | applied exactly once | ✅ **new this phase** |
| 17 | Restore over a device with its own migrations | union merge | union of applied ids; higher version wins | ✅ **new this phase** |
| 18 | Cloud has more rows than one page | 1,250 rows, 500/page | all 1,250 merged | ✅ **fixed this phase** |
| 19 | Rows sharing a timestamp across a page edge | 700 rows in 7 timestamps | none lost (`gte` + de-dup) | ✅ **fixed this phase** |
| 20 | 600 rows sharing one timestamp | degenerate bulk import | loop stops, `lastError` says why | ✅ **fixed this phase** |
| 21 | Network fails mid-pagination | fail after page 2 | fetched pages kept, not discarded | ✅ **fixed this phase** |

## 4. Failure matrix — reasoned, not measured

These need a real device or a real server and are listed so nobody mistakes
their absence for a passing result.

| scenario | expected | how to test it properly |
|---|---|---|
| Power loss during `localStorage.setItem` | Safe — the write is atomic per key at the browser level | pull power on a real machine mid-write, 100 trials |
| Power loss during an IndexedDB mirror write | Safe — transactional; the primary already succeeded | same |
| Disk full at the OS level | Browser raises quota error; handled | fill a VM's disk |
| Browser killed by the OS | Last save wins; unsaved in-memory `V` is lost | task-kill the tab |
| Clock moved backwards on one device | **Suspect.** The merge compares epoch ms; a device whose clock is behind produces records that lose to older remote ones | two devices, one clock skewed −1 h |
| Two devices offline editing the same visit, both reconnect | Conflict recorded, local kept on each — **so they diverge and neither knows** | two browsers, network toggled |
| Supabase outage during a drain | Bounded backoff, records stay dirty, retried | block the host in DNS |

**The clock row is the one to take seriously.** `cloudEpoch(Date.parse(...))`
trusts the device clock, and `updated_at` is stamped client-side. A clinic
laptop whose clock is an hour slow will produce records that lose every conflict
to an older remote version. The server has `now()` and does not use it for this.
That is **BE-17**, and it is the most likely remaining silent-loss path.

---

## 5. Where a record can still be lost

Ranked by likelihood, honestly.

1. **Device storage ceiling, no archival (BE-10).** ~3,000 patients / 9,000
   visits exhausts localStorage. The failure is now loud rather than silent, but
   the clinic is stuck: there is no archive, no year-end close, no partial load.
   **A busy practice reaches this in roughly four years.**
2. **Nobody ever pressed the backup button.** Backups are complete and the
   restore is merge-aware. They are also entirely manual. Device lost, never
   synced, never backed up → everything is gone. **BE-18.**
3. **Vault passphrase AND printed recovery code both lost, with no
   administrator enrolled.** Then it is unrecoverable. Two of the three doors
   now exist by default (passphrase, printed code) and the third
   (administrator master password) is opt-in — **my earlier claim that there
   was no recovery at all was wrong**; see the correction in the backend
   report.
4. **Clock skew across devices (BE-17).** Silent, plausible, and the merge has
   no defence.
5. **Conflicts are not persisted (BE-12).** The losing version is discarded and
   cannot be inspected. Not loss of the record, but loss of one version of it.
6. **Both localStorage and IndexedDB cleared together.** A determined "clear
   everything" or a new device. Only a backup or the cloud survives.

Everything else in the matrix is handled.

---

## 6. Recommendations, in the order I would do them

| # | work | effort | why this order |
|---|---|---|---|
| 1 | **Automatic backup** — a scheduled export to the file system with a visible "last backup" age | ~24 h | Turns risk #2 from certain to negligible, and does not depend on anything else |
| 2 | **Archival / year-end close (BE-10)** | ~120 h | Removes the four-year fuse |
| 3 | **Server-stamped `updated_at` (BE-17)** | ~16 h | Small; closes the most likely silent-loss path |
| 4 | **Persist conflicts on the record (BE-12)** | ~40 h | Reuses `recPreserveOverwritten`, which already exists |
| 5 | **Sync event ring buffer (BE-16)** | ~24 h | Makes every future incident diagnosable rather than guessed at |
| 6 | ✅ **Administrator vault reset (BE-11)** | done | Was a founder decision; decided and built 2026-08-07 |

Items 1, 3 and 5 total ~64 hours and remove two of the six loss paths. They are
the best-value backend work available.
