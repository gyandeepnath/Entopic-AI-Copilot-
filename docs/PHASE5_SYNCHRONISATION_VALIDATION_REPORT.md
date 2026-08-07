# Phase 5 — Synchronisation Validation Report

**Question this document answers:** can synchronisation silently overwrite,
duplicate, or drop valid clinical data?

---

## 1. The model in one paragraph

The device is authoritative. The cloud is a **replica and a courier**, never a
source of truth for an in-progress exam. Writes go local first and are pushed
asynchronously; reads always come from local storage. Signed out, offline, or
with sync disabled, the app behaves exactly as the pure-local version — and the
diagnostic engine has no code path to the network in any configuration.

Since this phase, synchronisation is split across two modules with different
concerns: `cloud-sync.js` answers *"can we talk to the server?"* (session,
tokens, HTTP, backoff, realtime socket, lifecycle) and `cloud-replication.js`
answers *"which version of a record wins?"* (outbox, deltas, tombstones,
encryption envelopes, paginated pull, merge, conflicts).

---

## 2. Upload

```
saveStore(kind) → cloudEnqueue(kind) → 800 ms debounce → cloudDrain()
   │
   ├── GATE 1: cloudSignedIn()?     no → keep the dirty flag, retry next drain
   ├── GATE 2: phiArmed()?          no → HOLD. Consent recorded AND a device key
   │                                     present, or nothing leaves the device
   ├── delta: records where updated > _cloud_updated
   ├── re-entrancy: _cloudDraining[kind] serialises overlapping drains
   ├── phiEncrypt each record → { id, clinic_id, updated_at, deleted, data: ⟨cipher⟩ }
   └── POST ?on_conflict=id  Prefer: resolution=merge-duplicates
         └── success → stamp _cloud_updated under _suppress (no echo into the outbox)
             failure → dirty flag stays set; nothing is lost
```

**Validated:**

- **The PHI gate is a single chokepoint.** There is no other path in the
  codebase that POSTs `patients` or `visits`. Pinned by a test.
- **The push is a genuine delta.** It used to re-serialise and re-POST every
  record on every save — a multi-megabyte body per keystroke-save at a few
  thousand patients.
- **Idempotent by construction.** Every write is an upsert on the primary key,
  which is what makes the retry policy safe rather than duplicate-generating.
- **`_suppress` prevents the feedback loop** where marking records as synced
  would itself mark them dirty.

**Open — BE-19.** Dirty flags are per *kind*, not per record. If a drain
partially fails at the HTTP level the whole kind is retried. Correct, but
wasteful at scale.

---

## 3. Download

Keyset pagination over `updated_at`, 500 rows per page, hard stop at 200 pages.

**The defect this replaced (BE-5)** was an unbounded `select` with no limit, no
ordering and no cursor. PostgREST caps a response at the project's
`db-max-rows`; past that the server returns the first page and says nothing the
client reads. A clinic that grew past the cap **stopped receiving its own
records, permanently and silently** — no error, no banner, two devices quietly
diverging, and no way for the clinician to notice.

Three design choices, each for a specific failure:

| choice | rejected alternative | why |
|---|---|---|
| Keyset on `updated_at` | `OFFSET` | Rows are written while we read. OFFSET skips or repeats across pages, and a skipped record is a lost record. |
| `gte` + id de-duplication | `gt` | Two rows can share a millisecond. `gt` drops the rest of a tie that straddles a page boundary. |
| Stop + record a reason when a full page advances nothing | loop, or truncate | 500+ rows sharing one timestamp (a bulk import) is reachable. Looping forever and truncating silently are both wrong; saying so is right. |

A failure mid-pagination **keeps the pages already fetched**. A partial pull is
not a failed pull, and discarding fetched rows would let an unreliable network
keep a device permanently behind.

---

## 4. Conflict detection and resolution

This is the part most local-first systems get wrong, and Entopic gets right.

```
for each incoming row:
    rec = decrypted payload            (undecryptable → dropped, never stored as ciphertext)
    if kind == visits and rec.id == CV:  SKIP        ← the open exam is untouchable
    baseMs   = epoch(local._cloud_updated)           ← what we last agreed on
    localMs  = epoch(local.updated)
    remoteMs = epoch(row.updated_at)
    localModified = localMs > baseMs                 ← unpushed edits exist

    tombstone + !localModified  → delete locally
    tombstone +  localModified  → KEEP LOCAL, record conflict
    remoteNewer + !localModified → replace
    remoteNewer +  localModified → KEEP LOCAL, record conflict
    otherwise                    → keep local
```

**Validated:**

- **A clinician's unpushed edit is never overwritten.** This is the guarantee,
  and it is tested directly.
- **Three-state comparison, not two.** Comparing only local-vs-remote cannot
  distinguish *stale* from *concurrently edited*. The `_cloud_updated` baseline
  is what makes the distinction possible.
- **Epoch milliseconds, never string compare.** A lexicographic compare assumed
  byte-identical ISO formatting and broke on millis-vs-no-millis or offset-vs-Z.
- **The open visit is immune.** A remote write cannot clobber the exam on
  screen.
- **Undecryptable rows are dropped, never stored.** A device without the key
  never writes ciphertext into a record slot.

**Open — BE-12.** `CLOUD.conflicts` is an in-memory array of `"kind:id"`
strings. It does not survive a reload, and the losing remote version is simply
not applied — it is lost on the next push. For a clinical record, "the other
device's version was discarded and nobody can see what it said" is a real gap.
`recPreserveOverwritten` already does exactly the right thing for two tabs on
one device; the same mechanism should carry the losing remote version.

**Open — BE-17, and the most likely remaining silent-loss path.**
`updated_at` is stamped **client-side**, and the merge trusts it. A clinic
laptop whose clock is an hour slow produces records that lose every conflict to
an older remote version, with no error anywhere. The server has `now()` and does
not use it. Fixing this is a database default plus a trigger and is small.

---

## 5. Deletes

Deletes are the hardest part of any replication system, because the evidence is
gone locally.

| property | status |
|---|---|
| A local delete propagates as a soft-delete row | ✅ |
| The queue survives the tab closing | ✅ **fixed this phase (BE-2)** |
| Restore merges rather than replaces | ✅ — a delete made this session is not thrown away by the restore |
| A successful push clears only what was sent | ✅ **fixed this phase (BE-3)** |
| A failed push leaves the queue intact | ✅ |
| The queue is bounded, and says so when it truncates | ✅ (5,000; audit entry) |
| A patient's delete cascades to their visits | ✅ server-side trigger, belt-and-braces to client tombstones |
| A tombstone for a record we never had is ignored | ✅ |
| A remote delete cannot destroy unpushed local edits | ✅ becomes a conflict |

**Open — BE-8.** Visit tombstones are written with `patient_id: ""`, which will
show up in the `orphan_visits` reconciliation view as a false positive the first
time anyone uses it.

---

## 6. Retry, queueing and recovery

| mechanism | policy | assessment |
|---|---|---|
| HTTP retry | 429 / 5xx / network → 1s, 2s, 4s, capped 30s, max 3; `Retry-After` honoured | Sound. Pure function, tested without a network. |
| 401 | refresh token once, retry once, then surface | Correct. |
| Outbox | dirty flags in memory, **recomputed from record timestamps** | Correctly designed — nothing to lose. |
| Tombstones | **persisted** | Fixed this phase. |
| WebSocket | reconnect at 8 s, heartbeat 25 s | Fixed interval, no jitter — **BE-20**: every client of a clinic reconnects in lockstep after an outage. |
| Polling fallback | 12 s, only when the socket is down | Good. |
| Partial sync | pages kept; dirty flags kept | Good. |

---

## 7. Multi-device readiness

| capability | today |
|---|---|
| Two devices, same clinic | **Works.** RLS scopes both to the clinic; realtime pushes changes live. |
| Two devices editing different records | **Works.** |
| Two devices editing the same record, both online | **Works** — last writer wins, with the baseline check protecting unpushed work. |
| Two devices editing the same record, both offline | **Diverges.** Each keeps its own version and records a conflict; **neither can see the other's**. BE-12. |
| Three or more devices | Untested. No reason to expect failure; no evidence either. |
| Field-level merge | **Not supported.** A visit is one blob; the whole record wins or loses. |
| Presence / "who else is in this record" | Not supported. |

**Verdict: sound for two devices, honest about its limits, not yet a
collaborative EMR.** For an exam room and a front desk — the actual use case —
this is the right amount of machinery. For two clinicians editing one visit
simultaneously it would need field-level merge, which is a much larger project
and should not be started until somebody asks for it.

---

## 8. Reliability verdict

| dimension | rating | note |
|---|---|---|
| Will it lose an uploaded record? | **No** | Idempotent upserts; dirty flags survive failure |
| Will it lose a downloaded record? | **No, now** | Was yes past the server's page cap (BE-5) |
| Will it silently overwrite a clinician's edit? | **No** | The baseline comparison is the guarantee, and it is tested |
| Will it lose a delete? | **No, now** | Was yes on a crash (BE-2) and on an in-flight race (BE-3) |
| Will it duplicate a record? | **No** | Upsert on the primary key |
| Will it recover from a network outage? | **Yes** | Bounded backoff; queues survive |
| Will it tell you when it is broken? | **Barely** | One overwritten error string (BE-16) |
| Is the failure mode safe? | **Yes** | Every gate holds the data locally rather than sending or discarding it |

**Synchronisation reliability: 7 / 10.** Up from 5 before this phase. The
remaining three points are BE-12 (persisted, inspectable conflicts), BE-17
(server-stamped timestamps) and BE-16 (observability) — roughly 80 hours
together, and the highest-value sync work available.
