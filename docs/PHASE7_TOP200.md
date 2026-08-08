# Phase 7 — Top 200 Performance & Reliability Improvements, Ranked

Ranked by **measured impact × likelihood of being hit × inverse effort**.
`✅` done this phase. Items 1–10 are everything a real clinic will meet this
decade.

---

## Tier 1 · The device wall (1–10)

| # | improvement | measured basis | effort |
|---|---|---|---|
| 1 | ✅ **Parse cache** — every read parsed the whole clinic | 284 ms → 0.012 ms | done |
| 2 | ✅ **Non-blocking fonts** — 12.6 s blank screen offline | first paint 12,600 → 64 ms | done |
| 3 | **Incremental save** — write only the changed record | `saveVisits` 267 ms at 9k is the last wall | 60 h |
| 4 | **Archival on by default** at ~70 % of budget | ceiling measured at ~1,900 visits, not 9,000 | 24 h |
| 5 | **Patient→visit index** maintained on write | `getPatientVisits` O(n)→O(k) | 24 h |
| 6 | **Self-host the three font families** | removes 2 CSP hosts and the last third party | 4 h |
| 7 | **Move the primary store to IndexedDB** | lifts the ~1,900-visit ceiling entirely | 120 h |
| 8 | **Lazy visit payloads** — headers in memory, bodies on demand | heap and parse both scale with headers only | 60 h |
| 9 | **Worker-based decryption on first sync** | ~10 s main-thread block modelled at 10k visits | 32 h |
| 10 | **Compress stored payloads** | 2.63 KB/visit measured; ~3× typical for JSON | 24 h |

## Tier 2 · Observability (11–35)

| # | improvement | effort |
|---|---|---|
| 11 | Bounded timing ring for the five measured operations | 24 h |
| 12 | Jitter on WebSocket reconnect — clients currently reconnect in lockstep | 4 h |
| 13 | Sync event log replacing the single `lastError` | 24 h |
| 14 | Health panel: storage headroom, queue depth, last sync, backup age | 32 h |
| 15 | Export diagnostics with the backup | 8 h |
| 16 | Per-operation p50/p95 kept client-side | 16 h |
| 17 | Slow-operation warning above a threshold | 8 h |
| 18 | Heap sampling where `performance.memory` exists | 8 h |
| 19 | Engine run-time histogram | 8 h |
| 20 | Count parse-cache hits and misses | 4 h |
| 21 | Record storage growth per week | 8 h |
| 22 | Project the exhaustion date from the growth rate | 8 h |
| 23 | Alert when a save exceeds 200 ms | 8 h |
| 24 | Alert when the outbox stays non-empty for an hour | 8 h |
| 25 | First-paint timing recorded on every boot | 8 h |
| 26 | Script-count and payload budget in CI | 4 h |
| 27 | Server-side slow-query logging | 16 h |
| 28 | `pg_stat_statements` guidance in the ops doc | 4 h |
| 29 | Index-usage report | 8 h |
| 30 | Table and index size report per clinic | 8 h |
| 31 | Realtime lag measurement | 16 h |
| 32 | Decrypt-failure counter | 4 h |
| 33 | Merge-outcome counters per pull | 8 h |
| 34 | Round-trip latency sampling | 8 h |
| 35 | Client-version telemetry, opt-in | 24 h |

## Tier 3 · Rendering and interaction (36–60)

| # | improvement | effort |
|---|---|---|
| 36 | Re-render only the changed panel, not the page | 40 h |
| 37 | Debounce the advisory re-render under fast typing | 8 h |
| 38 | Skip the engine run when no token changed | 16 h |
| 39 | Virtualise the patient list past ~500 rows | 24 h |
| 40 | Virtualise the visit history | 16 h |
| 41 | Defer the flow map until it is opened | 8 h |
| 42 | Cache rendered advisory HTML by token-set hash | 16 h |
| 43 | Avoid rebuilding the sidebar on every nav | 8 h |
| 44 | `requestAnimationFrame` for indicator flashes | 4 h |
| 45 | Passive event listeners on scroll | 4 h |
| 46 | `content-visibility` on off-screen panels | 8 h |
| 47 | Drop the 22 step templates not currently shown | 16 h |
| 48 | Lazy-load simulation and OSCE modules | 16 h |
| 49 | Lazy-load the KB editor | 8 h |
| 50 | Split the knowledge base into route bundles | 40 h |
| 51 | Defer `knowledge/expansion.js` until first use | 16 h |
| 52 | Precompute `KB_ROUTE_INDEX` at build time | 16 h |
| 53 | Measure and budget first-input delay | 16 h |
| 54 | Avoid layout thrash in the advisory panel | 8 h |
| 55 | Batch DOM writes in the exam form | 16 h |
| 56 | Reuse the thumbnail canvas | 4 h |
| 57 | Decode images off the main thread | 16 h |
| 58 | Cap attachment thumbnails per view | 4 h |
| 59 | Paginate the audit view | 8 h |
| 60 | Paginate the research corpus view | 8 h |

## Tier 4 · Storage and memory (61–100)

| # | improvement | effort |
|---|---|---|
| 61 | Per-record write instead of whole-store | 60 h |
| 62 | Structural sharing on visit updates | 32 h |
| 63 | Drop `engineLog` from stored visits | 4 h |
| 64 | De-duplicate `engine_tokens` before storing | 4 h |
| 65 | Store the differential top-8 only, not the full scorer output | 8 h |
| 66 | Strip `_cloud_updated` from exports | 4 h |
| 67 | Stream the backup export | 24 h |
| 68 | Chunk the restore | 24 h |
| 69 | Stream the archive write | 16 h |
| 70 | Bound the parse cache by total bytes as well as key count | 8 h |
| 71 | Evict the parse cache on memory pressure | 8 h |
| 72 | Release the KB after boot where possible | 16 h |
| 73 | Weak references for thumbnails | 8 h |
| 74 | Explicit teardown on sign-out | 8 h |
| 75 | Clear the DEK on tab hide | 8 h |
| 76 | Measure heap across a simulated week | 16 h |
| 77 | Detect a detached-node leak in the exam | 16 h |
| 78 | Bound `STORE_CORRUPT` quarantine copies | 4 h |
| 79 | Prune old pre-migration snapshots | 8 h |
| 80 | Prune old archive index rows | 4 h |
| 81 | Compact the audit log rather than truncating | 16 h |
| 82 | Compress the audit log | 8 h |
| 83 | Store attachments outside the visit payload | 24 h |
| 84 | Deduplicate identical attachments by hash | 16 h |
| 85 | Progressive image loading | 16 h |
| 86 | Cap total attachment bytes per patient | 8 h |
| 87 | Report attachment usage per clinic | 8 h |
| 88 | Move file blobs to their own IndexedDB store | 16 h |
| 89 | Vacuum the file store on delete | 8 h |
| 90 | Measure IndexedDB quota headroom | 8 h |
| 91 | Warn before IndexedDB fills | 8 h |
| 92 | Mirror only changed stores, not all | 8 h |
| 93 | Batch mirror writes | 8 h |
| 94 | Skip the mirror when the payload is unchanged | 4 h |
| 95 | Persist the parse cache across reloads (session storage) | 16 h |
| 96 | Precompute per-patient visit counts | 8 h |
| 97 | Index visits by date for trend queries | 16 h |
| 98 | Cache trend series | 8 h |
| 99 | Cache the problem-foci grouping | 8 h |
| 100 | Memoise `interpretConfidence` | 2 h |

## Tier 5 · Synchronisation at scale (101–135)

| # | improvement | effort |
|---|---|---|
| 101 | Incremental pull using a stored high-water mark | 24 h |
| 102 | Per-record dirty flags instead of per-kind | 24 h |
| 103 | Adaptive page size from observed latency | 16 h |
| 104 | Parallel page fetching with a bounded pool | 24 h |
| 105 | Resume an interrupted pull from its cursor | 16 h |
| 106 | Compress request bodies | 8 h |
| 107 | Batch tombstones with record pushes | 8 h |
| 108 | Coalesce rapid saves into one push | 16 h |
| 109 | Backpressure when the queue grows | 16 h |
| 110 | Priority queue — the open visit first | 24 h |
| 111 | Delta encoding for record updates | 40 h |
| 112 | Conditional requests / ETags | 24 h |
| 113 | Server-side change feed | 40 h |
| 114 | Realtime for the audit log too | 16 h |
| 115 | Reconnect with exponential backoff plus jitter | 8 h |
| 116 | Detect and report a stalled socket | 8 h |
| 117 | Fall back to polling faster after repeated socket failures | 8 h |
| 118 | Measure sync throughput | 8 h |
| 119 | Test sync under 3 % packet loss | 16 h |
| 120 | Test sync at 500 ms RTT | 16 h |
| 121 | Test a first sync of 50k rows | 16 h |
| 122 | Cap concurrent decryptions | 8 h |
| 123 | Cache derived keys per session | 8 h |
| 124 | Move encryption to a worker | 32 h |
| 125 | Measure crypto throughput per device class | 8 h |
| 126 | Skip re-encrypting unchanged records | 16 h |
| 127 | Verify a sample of round-trips continuously | 16 h |
| 128 | Persist conflicts so they survive a reload | 40 h |
| 129 | Show a conflict resolution screen | 40 h |
| 130 | Field-level merge for the exam payload | 120 h |
| 131 | Presence — who else is in this record | 40 h |
| 132 | Multi-device test harness | 32 h |
| 133 | Sync soak test over 24 hours | 16 h |
| 134 | Bandwidth budget per sync | 8 h |
| 135 | Metered-connection awareness | 8 h |

## Tier 6 · Server and infrastructure (136–170)

| # | improvement | effort |
|---|---|---|
| 136 | Load-test the pull path against 50k rows | 16 h |
| 137 | `explain analyze` every query in the client | 16 h |
| 138 | Partition `visits` by clinic at scale | 40 h |
| 139 | Archive server-side rows in step with device archival | 40 h |
| 140 | Connection pooling guidance | 8 h |
| 141 | Read replicas for analytics | 40 h |
| 142 | Materialised view for encounter analytics | 24 h |
| 143 | Scheduled orphan reconciliation | 24 h |
| 144 | Autovacuum tuning guidance | 8 h |
| 145 | Table bloat monitoring | 16 h |
| 146 | Index bloat monitoring | 16 h |
| 147 | Query timeout policy | 8 h |
| 148 | Statement-level rate limiting | 16 h |
| 149 | Per-clinic quota enforcement | 24 h |
| 150 | Capacity dashboard per project | 32 h |
| 151 | Automated project provisioning | 40 h |
| 152 | Automated schema rollout across projects | 40 h |
| 153 | Schema drift detection across projects | 24 h |
| 154 | Blue/green schema changes | 40 h |
| 155 | Backup verification job | 24 h |
| 156 | PITR enabled and drilled | 8 h |
| 157 | Region selection per clinic | 60 h |
| 158 | CDN for static assets | 16 h |
| 159 | HTTP/2 or /3 for the app shell | 8 h |
| 160 | Service worker for offline asset caching | 40 h |
| 161 | Precache the knowledge base in a service worker | 16 h |
| 162 | App shell versioning and update prompt | 24 h |
| 163 | Bundle the 119 scripts for HTTP/1 deployments | 24 h |
| 164 | Subresource integrity on self-hosted assets | 8 h |
| 165 | Edge function for KB distribution | 32 h |
| 166 | Regional KB mirrors | 24 h |
| 167 | Static analysis of bundle growth in CI | 8 h |
| 168 | Performance budget enforced in CI | 16 h |
| 169 | Synthetic monitoring of first paint | 16 h |
| 170 | Real-user monitoring, opt-in | 32 h |

## Tier 7 · Reliability maturity (171–200)

| # | improvement | effort |
|---|---|---|
| 171 | Chaos test suite in CI | 40 h |
| 172 | Fault injection at every storage call | 32 h |
| 173 | Fault injection at every network call | 24 h |
| 174 | Simulated power loss during a write | 16 h |
| 175 | Simulated quota exhaustion mid-clinic | 16 h |
| 176 | Simulated clock skew across devices | 16 h |
| 177 | Property-test the merge under random interleavings | 32 h |
| 178 | Soak test — 8-hour clinic day | 24 h |
| 179 | Memory soak over a week | 16 h |
| 180 | Automated multi-day session test | 32 h |
| 181 | Graceful degradation matrix, documented | 16 h |
| 182 | Feature flags for risky paths | 24 h |
| 183 | Kill switch for cloud sync | 8 h |
| 184 | Read-only mode when storage is critical | 24 h |
| 185 | Emergency export from a broken state | 16 h |
| 186 | Recovery-mode boot | 32 h |
| 187 | Self-check on startup | 16 h |
| 188 | Integrity check of the knowledge base at boot | 8 h |
| 189 | Detect a partially-applied deployment | 16 h |
| 190 | Version-skew detection between tabs | 16 h |
| 191 | Force-reload on version change | 8 h |
| 192 | Rollback procedure documented and drilled | 8 h |
| 193 | SLO definition and error budget | 16 h |
| 194 | SLA instrumentation | 32 h |
| 195 | Availability measurement | 24 h |
| 196 | Incident dashboards | 32 h |
| 197 | On-call rotation and runbooks | 24 h |
| 198 | Post-incident review template | 4 h |
| 199 | Quarterly reliability review | 8 h |
| 200 | Annual capacity re-forecast | 8 h |

---

## The shortest path

**Items 3, 4, 5, 6, 11, 12** — incremental save, archival by default, the
patient index, self-hosted fonts, the timing ring, and socket jitter.
**~144 hours, about three and a half weeks.**

That removes the only bottleneck any real clinic will meet this decade, and
makes the next one diagnosable when it arrives. Everything below item 20 is
preparation for a scale that does not exist yet — and doing it first would be
exactly the premature optimisation this phase forbids.
