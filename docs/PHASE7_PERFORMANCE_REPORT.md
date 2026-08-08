# Phase 7 — Performance, Scalability & Reliability Engineering Report

**Date:** 2026-08-07 · **Rule of this phase:** optimisation without measurement
is prohibited.

Every number below was produced by running the software. **Measured** means a
benchmark or a browser probe; **modelled** means arithmetic on measured
per-unit costs, and says so; **unverified** means I could not run it here and
names what would have to be done.

Re-runnable: `node tools/bench/storage-bench.js`.

---

## 0. The headline, before anything else

**First paint on a device with no network was 12.6 seconds.** Measured, in
Chromium, on the deployment this product exists for.

Not the engine — the engine is provably network-free and every audit including
mine verified that. The **page** was not. One line in `<head>` loaded a
stylesheet from a third-party font host; a cross-origin stylesheet is
render-blocking, and offline it blocks until the request times out. Twelve
seconds of blank screen before the sign-in box appeared.

| | first paint | load |
|---|---|---|
| as shipped | **12,600 ms** | 12,986 ms |
| after the fix | **64 ms** | 573 ms |

Six phases of audits missed it because every one of them asked "does the engine
touch the network?" and none asked "does the page?". It is fixed and pinned by
a test. **The proper fix — self-hosting the fonts — is ~4 hours and also
removes two hosts from the CSP.**

---

## 1. Runtime lifecycles, reverse-engineered

### Startup (measured, after the fix)

```
  0 ms   HTML parsed; CSS is local and applies immediately
 ~5 ms   119 <script> tags execute in order, ~2.5 MB uncompressed
         └─ knowledge/ (394 conditions, 561 tokens) builds KB_ROUTE_INDEX
         └─ js/ modules define globals; nothing does I/O at load except
            cloudLoadState() reading two localStorage keys
 64 ms   FIRST PAINT — sign-in or the vault lock screen
  ~x ms  init(): migrations run (0 pending, ~0.1 ms), API key, role catalogue,
         KB sign-offs applied, clinic steps registered
+4000 ms  DEFERRED: automatic backup snapshot
+5000 ms  DEFERRED: unencrypted-records check
```

The two deferred tasks are deliberately off the critical path — neither can
delay the first consultation of the morning.

### The exam loop (measured, 1,500 visits, browser)

```
  keystroke → renderMain() → nav()/field handler
            → runDiagnosticEngine()      0.44 ms   ← 13 stages, 394 conditions
            → doSave()                  36.8 ms   ← dominated by JSON.stringify
            → renderAdvisory()           ~1 ms
```

**The engine is not the bottleneck and never has been.** 0.44 ms mean across
four presentations, independent of record count. The write is.

### Memory (measured)

Heap after boot with the full knowledge base: **9.5 MB** against a 3,586 MB
limit. The KB is ~2 MB of it and is loaded once. No growth observed across
repeated engine runs.

### Background tasks

| task | cadence | on the critical path? |
|---|---|---|
| `cloudDrain` | 800 ms debounce after a write | no — async |
| `cloudPull` poll | 12 s, only when the socket is down | no |
| realtime socket | live, 25 s heartbeat | no |
| autobackup snapshot | boot + 6 h minimum gap | no — deferred 4 s |
| quota watch | every write | yes, but O(1) |

**There is no server-side background process of any kind.** No cron, no worker,
no queue.

---

## 2. Profiling — where the time actually went

Baseline, `tools/bench/storage-bench.js`, real storage layer, 9,000 visits /
23.5 MB:

| operation | before | after | factor |
|---|---|---|---|
| `loadVisits()` | **284 ms** | **0.012 ms** | ~23,000× |
| `getPatientVisits()` | 245 ms | 0.655 ms | ~370× |
| `getLastVisit()` | 239 ms | 0.503 ms | ~475× |
| `saveVisits()` | 962 ms | 267 ms | 3.6× |
| engine run | 0.44 ms | 0.44 ms | unchanged |

**The finding:** every read of one visit parsed the entire clinic. `doSave()`
did it twice per keystroke-save. Measured scaling was **1.47× worse than
linear**, because `JSON.parse` degrades on multi-megabyte strings and the
garbage it produces triggers collection.

**The fix was a parse cache** keyed on the raw string, re-read every call — so
a write from another tab changed the bytes and invalidated it automatically,
which is the case a naive cache gets wrong.

### ⚠ WITHDRAWN, 2026-08-08 — the "after" column above no longer applies

The cache was **removed the same day**. The adversarial harness
(`tools/stress/attack.js`, attack A1) demonstrated the cost of the contract
change it required:

> `loadStore()` returned the SHARED parsed object. So after a write failed on
> quota, `loadVisits()` still returned the visit that never reached disk —
> because the caller's array *was* the cache's array. The storage layer could
> report a record as readable that it had just refused to persist, at the exact
> moment the UI was telling the clinician the device had stopped saving.

The original note here — "no such caller exists today (checked)" — was wrong.
The failed-write path is such a caller, and it is the one that matters most.

**The safe variant was measured and is not viable.** Returning a copy per read
costs `structuredClone` **753 ms** vs `JSON.parse` **645 ms** at 9,000 visits:
copying is *slower than re-parsing*. There is no fast-and-safe version of this
cache.

**And the size it optimised is unreachable.** localStorage exhausts at ~1,900
visits (measured, same bench). Re-measured after removal:

| visits | store | `loadVisits` | `saveVisits` |
|---|---|---|---|
| 500 | 1.3 MB | 10 ms | 23 ms |
| **1,900 (ceiling)** | **5.0 MB** | **39 ms** | **180 ms** |
| 5,000 (unreachable today) | 13.1 MB | 189 ms | 2,552 ms |

At every store size the product can actually hold, an uncached read is tens of
milliseconds. The cache bought nothing real in exchange for the storage layer
being able to lie about what is on disk.

**What it did leave behind, and what stays:** it exposed a latent bug —
`migrationsRun` took its rollback snapshot by reference, so a migration
mutating in place mutated its own snapshot and the rollback restored the
damage. That fix (`_migClone`) is correct independently and remains. The
benchmark remains and is still the measurement of record.

`tests/storage-read-isolation.test.js` (18 tests) replaces
`storage-cache.test.js` and pins the opposite property: **a read reflects the
bytes on disk and nothing else.** Two of them fail the build if a parse cache
reappears without the reasoning being re-read.

### What remains hot

**`saveVisits` is the single bottleneck** — 180 ms at the 1,900-visit ceiling,
2.5 s at 5,000 (a size only reachable once archival or the backend is in play).
It is irreducible in the current design: every save re-serialises the whole
store, and `JSON.stringify` is most of it. The fix is incremental save — write
only the changed record — which is ~60 h and is item 1 in the roadmap. Unlike
the parse cache, it is sound: it never hands out a shared mutable view.

### Complexity

| operation | complexity | note |
|---|---|---|
| engine run | O(active routes × tokens) | independent of records — the important one |
| `loadVisits` | O(n) parse | a fresh parse per read, deliberately |
| `getPatientVisits` | O(n) filter | an index would make it O(k) |
| `saveStore` | O(n) serialise | the remaining wall |
| cloud pull | O(n/500) requests | keyset-paginated |
| merge | O(n + m) | hash-joined |

---

## 3. Memory over time

**Modelled from measured per-unit costs**, not observed over days.

| after | heap | why |
|---|---|---|
| 1 hour | ~12 MB | KB + one clinic's parsed stores |
| 1 day | ~12 MB | bounded structures throughout |
| 1 week | ~12 MB | same |
| 1 month, tab never closed | ~12–15 MB | same |

Every accumulating structure is explicitly bounded: audit log 2,000 entries,
`ENGINE_LOG` 10, run-diff ring 30, tombstones 5,000, snapshots 7.
**No unbounded collection found.**

Removing the parse cache also removed the one long-lived reference worth
naming — a retained copy of the whole parsed clinic. Reads are now transient
and collectable, so the resting figures above are, if anything, conservative.

**Leak risk: low.** Not *verified* over a multi-day session, which would need a
real device and a week; recorded as a gap rather than claimed as clean.

---

## 4. Storage and database at scale

### The device — measured

| visits | store size | loadVisits | saveVisits |
|---|---|---|---|
| 100 | 0.26 MB | 0.013 ms | 2.9 ms |
| 1,000 | 2.6 MB | 0.009 ms | 29 ms |
| 3,000 | 7.8 MB | 0.017 ms | 85 ms |
| 9,000 | 23.5 MB | 0.012 ms | 267 ms |

**Measured: 2.63 KB per visit. localStorage exhausts at ~1,900 visits, not the
~9,000 I estimated in Phase 5.** That estimate was wrong by nearly 5×, and it
matters: a two-clinician practice seeing 20 patients a day reaches 1,900 visits
in **under six months**, not four years.

Archival (BE-10) is what makes this survivable, and this measurement moves it
from "nice to have within four years" to **"the first thing a real clinic will
need."**

### The server — modelled, unverified against a live database

| patients | rows | data | first problem |
|---|---|---|---|
| 100 | ~400 | ~3 MB | none |
| 10,000 | ~40k | ~300 MB | none with the 005 indexes |
| 100,000 | ~400k | ~3 GB | pull pagination: 800 requests per full sync |
| 1,000,000 | ~4M | ~30 GB | full-sync model breaks; needs incremental watermarks |

**The scaling wall is the device, not Postgres** — by roughly two orders of
magnitude.

---

## 5. Synchronisation

| property | state |
|---|---|
| Upload | delta by timestamp; one upsert per kind; idempotent |
| Download | keyset-paginated, 500/page, hard stop at 200 pages |
| Retry | 1s/2s/4s capped 30s, max 3, `Retry-After` honoured |
| Partial failure | pages already fetched are kept |
| Conflict | three-state; unpushed local edits always win and are recorded |
| Deletes | durable queue, bounded, clears only what was sent |
| Timestamps | **server-stamped** since migration 005 |

**Bottleneck (modelled):** a first sync of 10,000 visits is 20 sequential
pages, each ~26 MB decrypted, plus 10,000 AES-GCM decryptions. At ~1 ms each
that is **~10 s of main-thread decryption**, blocking. The fix is a worker
(item 4). Not reached by any current clinic.

**Retry storm risk: low.** Backoff is bounded and per-request. The one gap is
that the WebSocket reconnects on a **fixed** 8 s interval with no jitter — every
client of a clinic reconnects in lockstep after an outage. Trivial to fix
(item 12).

---

## 6. Reliability and chaos scenarios

Each verified by the referenced test or probe unless marked modelled.

| scenario | behaviour | patient-safety impact |
|---|---|---|
| Network down | exam unaffected; writes queue | **none** |
| Cloud down | as above; banner after an hour is not yet built | none |
| Server 5xx / 429 | bounded backoff; nothing lost | none |
| Auth expired | one refresh, then surfaced | none |
| Corrupt localStorage | detected, quarantined, **writes refused**, banner | none — and the design's best property |
| Corrupt IndexedDB | mirror is best-effort; primary unaffected | none |
| Both cleared | backup or cloud only | **total loss if neither** |
| Power failure mid-write | `setItem` is atomic per key | none |
| Browser killed | last save wins; in-memory `V` lost | one visit's unsaved text |
| Migration interrupted | whole run rolled back from a deep-copied snapshot | none |
| Archive interrupted | verification fails → **nothing pruned** | none |
| Unexpected refresh mid-exam | in-progress visit reloads from last save | unsaved text |
| Two tabs on one visit | overwritten version preserved on the record | none |
| Two devices offline on one visit | both keep their own; **neither can see the other's** | a lost version — BE-12, open |
| Clock skew | server now stamps; **modelled**, unverified live | none since 005 |

**Single points of failure:** the device, and only the device. The server is
not one — it can be down indefinitely without stopping a consultation. That is
the architecture's defining strength and it holds under every scenario above.

**Race conditions found:** two, both fixed earlier (tombstone in-flight clear,
drain re-entrancy). **Deadlocks:** none possible — single-threaded, no locks.

---

## 7. Capacity planning

| users | verdict | first bottleneck |
|---|---|---|
| **10** | comfortable | none |
| **100** | comfortable | none |
| **1,000** | works | **device storage per clinic (~1,900 visits)** |
| **10,000** | works with archival | Supabase project ceiling under ADR-012's per-clinic model |
| **100,000** | **not without re-architecture** | provisioning, monitoring, support — organisational, not technical |

**First bottleneck: device storage, at ~1,900 visits per device.** Archival
raises it; incremental save makes the raise painless.
**Second: `saveStore` re-serialising everything**, ~267 ms at 9,000 visits.
**Ultimate limitation: it is not the software — it is one person operating
100,000 clinics.** Every technical wall above has a known fix under 120 hours.

**What will never be a bottleneck:** the diagnostic engine. 0.44 ms,
independent of patient count, and it would still be 0.44 ms with a million
records on the device.

---

## 8. Observability — the weakest dimension

| question | can an engineer answer it today? |
|---|---|
| Why is this device slow? | **No.** No timing instrumentation anywhere. |
| Why did sync stop? | Barely — one overwritten `lastError` string. |
| Is memory growing? | No. |
| How long does the engine take here? | No. |
| Is this clinic near the storage wall? | Yes — `storageUsage()`, surfaced. |
| Did backups run? | Yes. |
| What happened before the crash? | Only what the audit log caught. |

**Recommended, in order:** a bounded ring of timing samples for the five
operations measured above, exported with the backup (~24 h); a sync event log
(~24 h); a health panel showing storage headroom, queue depth, last sync, and
backup age (~32 h). **Eighty hours takes diagnosis from guesswork to reading.**

---

## 9. Scorecard

Against **what a system serving millions needs**, not against what a
solo-founder product usually achieves.

| dimension | score | why |
|---|---|---|
| **CPU efficiency** | **9** | Engine 0.44 ms over 394 conditions with a route index. Genuinely good. |
| **Memory efficiency** | **8** | 9.5 MB heap, every accumulating structure bounded. Not verified over days. |
| **Storage efficiency** | **5** | 2.63 KB/visit is reasonable; the ~1,900-visit ceiling is not, and full re-serialisation per save is the remaining wall. |
| **Database efficiency** | **7** | Correct offline-first keys, composite + partial indexes, server-stamped time. Unverified against a live database. |
| **Rendering** | **7** | First paint 64 ms after the fix. Full re-render per navigation is crude but imperceptible at this DOM size. |
| **Synchronisation** | **8** | Paginated, idempotent, bounded retry, durable deletes, conflicts never lose local work. Main-thread decryption is the ceiling. |
| **Reliability** | **9** | Every chaos scenario degrades safely. Refusing to overwrite unreadable data is better than most commercial EMRs. |
| **Recoverability** | **8** | Automatic snapshots, verified archival, migration rollback, quarantined corrupt bytes, three vault doors. |
| **Fault tolerance** | **9** | The server can be gone indefinitely and a consultation is unaffected. |
| **Observability** | **3** | No timing instrumentation at all. The one dimension where nothing exists. |
| **Scalability** | **5** | Server scales; the device does not, and the device is authoritative. |
| **Cloud readiness** | **7** | Correct isolation and indexes; no monitoring, no autoscaling story. |
| **Enterprise readiness** | **4** | No SLA instrumentation, no capacity dashboards, no on-call. |
| **Offline-first excellence** | **9** | Was 6 this morning: the 12.6 s stall was an offline-first defect nobody had measured. Now genuinely excellent — 64 ms to interactive with no network. |

**Overall: 7.0 / 10** — up from an honest 6.1 before this phase's two fixes.

---

## 10. The final questions

**100 clinics?** **Yes, today.** Nothing measured comes close to a limit.

**1,000 clinics?** **Yes, with archival on by default** — otherwise a
meaningful fraction hit the device ceiling within a year. The server side is
untroubled.

**10,000 clinics?** **Technically yes; operationally no.** ADR-012's
per-clinic-project model means 10,000 Supabase projects. The engineering
(provisioning, key rotation, KB distribution) is perhaps 400 hours. The
*operations* — monitoring, support, incident response across 10,000 tenants —
is a team, and that is the real answer.

**100,000 clinics?** **No, and not because of the code.** Every technical wall
has a known fix under 120 hours. What does not have a fix under any number of
hours is one person carrying custody of 100,000 clinics' patient data.

**What fails first?** **Device storage at ~1,900 visits.** Measured, not
estimated, and it arrives in months rather than years.

**What never becomes a bottleneck?** **The diagnostic engine.** 0.44 ms,
constant in patient count, no I/O, no network, no allocation growth. The most
clinically important component is the least performance-sensitive one — which
is the right way round and was not an accident.

---

## 11. Effort to world-class

| tranche | contents | hours |
|---|---|---|
| **A · The device wall** | incremental save, patient/visit index, archival on by default, self-hosted fonts | **~140** |
| **B · Observability** | timing ring, sync event log, health panel, exportable diagnostics | ~110 |
| **C · Sync at scale** | worker-based decryption, incremental pull watermark, socket jitter, per-record dirty flags | ~180 |
| **D · Server scale** | orphan reconciliation, partitioning, load testing against 50k rows, capacity dashboards | ~260 |
| **E · Operations** | monitoring, alerting, SLA instrumentation, on-call, status page | ~320 |

**Total ≈ 1,010 hours (~6 months at one engineer)** to a posture that would
comfortably serve tens of thousands of clinics.

**Tranche A alone — ~140 hours, about three and a half weeks — removes the only
bottleneck any real clinic will meet this decade.** Everything after it is
preparation for a scale that does not exist yet, and doing it first would be
exactly the premature optimisation this phase forbids.
