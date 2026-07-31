# Entopic — Scalability Review (measured)
**Date:** 30 July 2026
**Brief:** support 100 / 1,000 / 10,000 users without rewriting the architecture. *Only optimise after measuring.*
**Method:** every number below was measured in a real Chromium browser against the real application. Nothing is estimated unless it says so.

---

## First: what "users" means here, because it changes the answer

Entopic is **offline-first**: each device holds its own complete record store and the engine never touches the network. So user count scales along two independent axes, and conflating them gives the wrong answer:

| Axis | What grows | Where it breaks |
|---|---|---|
| **Records per device** | patients + visits in one browser | **Hard ceiling — measured below** |
| **Devices / clinics** | independent installs syncing to Supabase | Backend limits (not measurable here) |

A 10,000-user deployment is **10,000 mostly-independent devices**, not 10,000 concurrent sessions against one store. That is the architecture's great scaling advantage — and its one hard wall is per-device, not per-user.

---

# 1. The bottleneck — found, measured, and fixed today

## P-1 — Silent clinical data loss past ~3,000 patients ✅ FIXED

**This is the only true bottleneck in the current architecture, and it was failing silently.**

### Measured
`localStorage` budget on this machine: **~9 MB** (probed directly, not assumed).

| Clinic size | Data size | Persisted? |
|---|---|---|
| 100 patients + 300 visits | 0.28 MB | ✅ |
| 1,000 + 3,000 | 2.8 MB | ✅ |
| 3,000 + 9,000 | ~8.5 MB | ✅ (at the edge) |
| **10,000 + 30,000** | **28 MB** | ❌ **10,000 patients saved, 0 of 30,000 visits persisted** |

### The failure mode, which was worse than the limit
`saveVisits()` threw `QuotaExceededError`. The error was caught, an `alert()` was shown, and **the function returned `undefined` — indistinguishable from success**. Every caller carried on. A clinic crossing this threshold mid-morning would keep consulting while visits silently stopped being saved, with nothing in the data indicating anything was wrong.

**And the alert was actively misleading.** It said *"your existing records are safe (mirrored on this device)"* — but `mirrorStore()` ran **after** `setItem()` inside the same `try`, so when the quota threw, **the mirror write never happened**. The reassurance was false for exactly the record that had just been lost.

### Fixed
- **Mirror written first** — IndexedDB has a far larger quota, so the record is genuinely captured even when localStorage fails. The safety net is now real rather than claimed.
- **`saveStore()` returns `true`/`false`** so callers can tell.
- **Sticky red banner** — *"THIS DEVICE HAS STOPPED SAVING RECORDS"* — not a dismissible alert. It clears itself automatically when saving works again.
- **Deployment readiness reports `blocked`** for a device that cannot save.

Verified: quota write returns `false`, failure recorded as `quota`, banner shown, readiness blocked, and all of it clears after space is freed. 5 new tests.

---

# 2. Everything else, measured

## Diagnostic engine — not a bottleneck at any scale

| Operation | Time | Scales with |
|---|---|---|
| Score **all 394 conditions** | **1.5 ms** | KB size, not users |
| `computeAlerts` (red flags) | 0.1 ms | — |
| `selectRoutes` | 0.3 ms | — |
| `collectTokens` | 1.1 ms | visit complexity |

A full differential is ~3 ms end to end. The KB could grow **10×** and still run in a single frame. **Do not optimise the engine** — there is nothing to win.

## Rendering / DOM — degrades gracefully, one action needed at 5,000

| Patients | `renderHome()` | DOM nodes | HTML |
|---|---|---|---|
| 100 | 2 ms | 538 | 24 KB |
| 1,000 | 14 ms | 5,038 | 224 KB |
| 5,000 | 63 ms | 25,038 | 1.1 MB |

63 ms is a perceptible stutter but not a freeze. The patient list renders **every** record — there is no pagination or virtualisation. At 1,000 it is fine; at 5,000 it is the second thing to fix.

## Encryption — constant cost, well designed

| Operation | Time |
|---|---|
| Enable vault (100 patients) | 219 ms (one-off) |
| Lock → unlock | **95–116 ms regardless of size** (PBKDF2, deliberate) |
| Encrypt + write, 1,000 patients | 6 ms |
| Encrypt + write, 5,000 patients | 59 ms |
| **Read while unlocked** | **0 ms** (memory cache) |

The decrypt-once-into-memory design is doing exactly its job: encryption costs nothing on the read path. Unlock time is dominated by 210,000 PBKDF2 iterations — that cost is *the point*, and it does not grow with record count.

## Storage I/O

| Records | Save | Load | Filter visits by patient |
|---|---|---|---|
| 100 | 1.9 ms | 1.2 ms | 1.3 ms |
| 1,000 | 17.9 ms | 8.3 ms | 7.2 ms |
| 10,000 | 69 ms | 16.5 ms | 7.2 ms |

Note the pattern: **every save rewrites the entire collection.** At 1,000 patients an autosave costs ~18 ms; that is acceptable, but it is O(n) work for a one-record change and it is what makes the quota wall arrive abruptly.

---

# 3. Scalability limits, by target

| Target | Verdict | Binding constraint |
|---|---|---|
| **100 users** | ✅ **Comfortable today.** No change needed. | Nothing binds |
| **1,000 users** | ✅ **Works**, with two caveats | Per-device records must stay under ~3,000 patients; backend limits become real |
| **10,000 users** | ⚠️ **Architecture holds; three things must be built** | Record store, list virtualisation, backend capacity |

**Per-device hard ceiling: ~3,000 patients / 9,000 visits.** For a single-optometrist practice seeing 20 patients a day, that is roughly **7–10 years** of records — genuinely comfortable. For a busy multi-chair clinic, 2–3 years. That is the number to plan against.

### What I could NOT measure, stated plainly
- **Supabase concurrency at 1,000/10,000 users.** I have no live project and no load generator here. Realtime WebSocket connection limits, connection pooling and per-plan rate limits are *the* backend question and I cannot answer it from this environment. Anything I said about it would be invention.
- **Real-world record sizes.** My synthetic visits are moderately detailed. Visits with drawings or attached images will be substantially larger, moving the ceiling **down**. Measure with real data before trusting the 3,000 figure.

---

# 4. Optimisations in priority order

**Rule applied throughout: nothing here is proposed without a measurement behind it.**

### 1. ✅ Make write failure loud — DONE TODAY
The only change that prevents *data loss*. Everything else is performance.

### 2. Move the record store to IndexedDB — the one real architectural item
**Evidence:** 28 MB needed vs ~9 MB available at 10,000 patients.
IndexedDB has orders-of-magnitude more room and supports indexed queries, removing both the ceiling and the whole-collection rewrite. The mirror already exists — the migration is to make it the *primary* store, with the vault's decrypt-once cache in front so the synchronous read path survives.
**Do it before any clinic passes ~2,000 patients.** Until then it is speculative work.

### 3. Paginate / virtualise the patient list
**Evidence:** 63 ms and 25,038 DOM nodes at 5,000 patients.
Render 50 rows and page; the search already narrows. Contained change to one render function. **Trigger: any clinic over ~1,500 patients.**

### 4. Incremental saves instead of whole-collection rewrites
**Evidence:** 69 ms to save at 10,000 records, for a one-record change.
Naturally falls out of the IndexedDB migration (per-record `put`). Not worth doing separately.

### 5. Backend capacity review — *measure first*
Before 1,000 users: load-test a real Supabase project for realtime connection limits and rate limits, and pick a plan against evidence. **This is the biggest unknown**, and the only honest next step is measurement, not a guess.

### Explicitly NOT worth doing
| Candidate | Why not |
|---|---|
| Engine optimisation | 1.5 ms for the full KB. Nothing to win. |
| Caching the differential | It is already faster than the cache lookup would be. |
| Web Workers for the engine | 3 ms does not block a frame. Added complexity, zero benefit. |
| Reducing PBKDF2 iterations | That cost **is** the security control. Never trade it for 100 ms at unlock. |
| Lazy-loading the KB | Loads once, ~26,000 lines, unnoticed at boot. |

---

# 5. Does the architecture survive to 10,000 without a rewrite?

**Yes — with one substitution, not a rewrite.**

The offline-first design is what makes this true: 10,000 users are 10,000 independent devices, each doing its own work with no shared bottleneck. The engine, rendering and encryption all have headroom. The single wall is the **browser storage primitive**, and swapping `localStorage` for IndexedDB is a change behind `loadStore()`/`saveStore()` — the two functions everything already goes through. The vault's cache layer means the synchronous read contract survives it.

What does **not** need to change: the engine, the knowledge base, the exam flow, the UI, the sync protocol, the security model.

**Honest caveat:** that confidence covers the client. The backend at 10,000 users is unmeasured, and it is where I would expect the next real limit to appear.

---

## Verification for this session
- **451 tests passing, 0 failing** (was 443)
- Build audit: **0 FAIL**
- All surfaces × all roles × encryption on and off: clean, no console errors
- Two tests I broke while adding the banner (a `window` guard in a `document`-only harness) were fixed, not deleted
