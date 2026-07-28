# Entopic — Technical Due Diligence Report

**Reviewer stance:** Principal/Staff engineer + healthcare architect + security + CTO, reviewing for VC DD, hospital procurement, security audit, launch, and senior hiring.
**Date:** 2026-07-26 · **Build:** 72 JS/knowledge files, 394 conditions, 343 tests, ~43k LOC.
**Rule applied:** implementation wins over documentation; nothing assumed; findings verified by running the code.

---

## 0. Scope honesty (read this first)

I did **not** read all 42,768 lines "line by line," and any reviewer who claims they did is lying to you. ~13,000 of those lines are **generated data** — `token-registry.js` (7,979), `condition-info.js` (4,115), `icd-map.js` (909), `expansion.js` (937). Risk does not live in data rows; it lives in logic and boundaries. I read the **logic-bearing and security-critical files in full** (`app.js`, `engine.js`, `cloud-sync.js`, `storage.js`, `roles.js`, `auth-crypto.js`, `claude.js`, `data-export.js`, both SQL migrations, the loader, the simulation/teaching layer) and **sampled** the data files for shape and integrity. Where I make a claim below, I **verified it by executing the code** — those are marked ✅ VERIFIED with the evidence. This is how a real DD is done.

---

## 1. Verdict up front

**Entopic is a genuinely impressive clinical-reasoning prototype with a disciplined offline engine and an unusually honest test culture — sitting on top of a data layer that is not yet safe to put real patient PII into.** The engine, the knowledge-base discipline, and the anti-fabrication testing are better than most seed-stage healthcare code I review. The persistence, sync, and auth layers are prototype-grade and have **one critical patient-privacy defect** that must be fixed before a single real patient is entered with cloud sync on.

| Question | Answer |
|---|---|
| Approve for production (real PHI)? | **No — one CRITICAL blocker (PII to cloud in clear).** |
| Approve for 100 clinics? | No, not yet. ~4–6 months of backend/security work. |
| Approve for 1,000 clinics? | No. Client-only storage + LWW sync do not hold. |
| Approve for 10,000 clinics? | No. Needs a real backend tier, not a Supabase-direct client. |
| Invest on engineering quality alone? | **Qualified yes at seed** — the hard, defensible part (the engine + KB + safety testing) is real and rare. The easy-to-hire part (backend/security) is the gap, and that's the right risk profile to fund. |
| Hire this team? | The engineering *judgment* on display (evidence gates, anti-fabrication round-trips, honest "this is not real security" comments) is a strong signal. Yes to hire, with a senior backend/security lead added. |

**Overall scores (/10):** Engine & clinical logic **8** · Knowledge-base architecture **7.5** · Test culture **8** · Frontend architecture **5** · Security **3.5** · Database design **6** · Sync/consistency **4** · Maintainability **5.5** · Scalability **3** · Healthcare compliance readiness **2.5**.

---

## 2. Critical findings (deployment blockers)

### C-1 — Full patient PII is shipped to a third-party cloud in the clear  ✅ VERIFIED
**Files:** `js/cloud-sync.js:232` (`data: p`), `db/migrations/001_core_schema.sql:52` (`patients.data jsonb`).
**Evidence (executed):** reproduced the exact `cloudDrain()` row builder on a patient with name "Meera Rao", MRN "EP-999", DOB "1990-01-01", phone "555-1234". Serialized payload:
`{"containsName":true,"containsMrn":true,"containsDob":true,"containsPhone":true}`.

The cloud sync pushes the **entire patient object** — `first_name`, `last_name`, `mrn`, `dob`, `phone` — into `patients.data jsonb` on Supabase, unencrypted at the application layer. This **directly violates the project's own non-negotiable guardrail** (`CLAUDE.md`: *"Never send PII to any third-party service … without explicit consent and de-identification"*) and contradicts the schema's own claim that PII and analytics are separated (the `encounters` de-identified table exists, but the PII-bearing `patients` table is what actually syncs).

**Why it matters:** this is the finding that fails a hospital procurement review and a DPDP/HIPAA-style audit outright. It is not theoretical — it happens on every `saveP()` once cloud sync is enabled.
**Minimal fix:** gate cloud sync behind an explicit per-clinic consent flag **and** encrypt the PII fields client-side (WebCrypto AES-GCM with a clinic-held key) before they enter `data`, syncing only ciphertext + the already-separate de-identified `encounter`. **Ideal:** move to a thin server API that never receives raw PII, or field-level envelope encryption with per-tenant keys and a documented key-custody model. **Effort:** minimal gate 1–2 days; encrypted-at-rest client-side 1–2 weeks; proper key management 4–6 weeks.

### C-2 — Cloud sync is enabled by config with no per-clinic consent gate
`cloudEnqueue()` fires on every save whenever `CLOUD_CONFIG.enabled && signed in`. There is no recorded, revocable patient/clinic consent before PHI leaves the device. For Indian DPDP and any hospital contract this is mandatory. **Effort:** 1–2 days (couples with C-1).

---

## 3. High-severity findings

### H-1 — Live sync silently never repaints the dashboard  ✅ VERIFIED (bug + doc mismatch)
`js/cloud-sync.js:285` — `cloudRerender()` calls `document.getElementById("page-home")`, but the element id is **`pgHome`** (`index.html:103`). The lookup always returns null, so incoming realtime/poll changes merge into local storage and then **never re-render**. The file header claims "changes merge into local storage … and re-render the dashboard" — false. A second device's edits are invisible until the user manually navigates. **Fix:** `getElementById("pgHome")` and check the active page properly. **Effort:** 15 minutes. **This is exactly the class of bug the prompt warns about — documentation describing behaviour the code does not have.**

### H-2 — Last-writer-wins by wall-clock across devices → silent clinical data loss
`js/cloud-sync.js:274` merges with `String(row.updated_at) > String(prevStamp)`. Two devices in one clinic with skewed clocks will silently overwrite each other's edits; the loser's note vanishes with no conflict surfaced. In an EMR a lost clinician note is a patient-safety event, not a UX annoyance. Lexicographic string comparison also assumes byte-identical ISO formatting (millis vs no-millis, `Z` vs offset) — mixed producers break ordering. **Fix:** monotonic per-record version counters or server-assigned `updated_at`, plus surfaced conflicts for clinical fields. **Effort:** 1–2 weeks.

### H-3 — The Anthropic API key lives in the browser  ✅ VERIFIED
`js/claude.js:41-48` sends the key with `anthropic-dangerous-direct-browser-access: true`; `API_KEY` is a global. Any user of the app can read the key from devtools/network and run up the founder's Anthropic bill or exfiltrate it. Standard for client-only apps, but a real finding: **the LLM features cannot ship to untrusted users without a server proxy.** Model is also hard-coded `claude-sonnet-5` (`claude.js:33`) with no config. **Fix:** proxy LLM calls through a minimal serverless function holding the key; never send the key to the browser. **Effort:** 2–3 days.

### H-4 — No global error boundary  ✅ VERIFIED
There is no `window.onerror` / `unhandledrejection` handler anywhere. `renderAdvisory()` throws on a null/corrupt `V` (verified), and the render model is full-panel `innerHTML` string concatenation — any single renderer exception mid-exam leaves the panel broken with no recovery and no telemetry. For a tool a clinician relies on chairside, one unhandled edge case can brick the screen. **Fix:** top-level error boundary that catches, logs, preserves `V`, and shows a recover prompt; wrap each `render*` in try/catch. **Effort:** 2–3 days.

### H-5 — Admin gate uses a non-cryptographic hash with the default baked into source
`js/roles.js:174` ships `ADMIN_PASS_HASH_DEFAULT = "h11mpz38"` and `adminHash()` is **djb2** — a 32-bit non-cryptographic hash, unsalted. My 14-word dictionary did **not** crack it, so I will not overclaim — but it is broken *by construction*: 2³² space, offline-brute-forceable, collision-prone, and the hash is client-readable. The app itself honestly comments that this is "a convenience lock, not real security," which is the right disclosure — but it must not be presented to a hospital as access control. **Fix:** same PBKDF2 path already built for user creds in `auth-crypto.js`. **Effort:** 2 hours.

### H-6 — `visits.patient_id` has no foreign key; soft-deletes still sync
`001_core_schema.sql:64` — `patient_id text not null` with **no `references public.patients(id)`**. Visits can be orphaned; there is no referential integrity between the two core clinical tables. Separately, `patients`/`visits` carry a `deleted boolean` but `cloudPull` (`cloud-sync.js:294`) selects without `&deleted=eq.false`, so soft-deleted rows sync back down (resurrection). **Fix:** add the FK (or document the offline-ID rationale and enforce in app), filter `deleted=false` on pull. **Effort:** 1 day.

### H-7 — No server-side audit trail despite the claim
`001_core_schema.sql:24` says the backend "authenticates and **audits**," but there is **no audit table** in either migration. `logAudit()` writes to local storage only — erasable by the same user, invisible to a compliance officer, lost if the store is cleared. HIPAA/DPDP require an immutable, server-side record of who accessed which PHI when. **Fix:** append-only `audit_log` table with RLS insert-only, written on PHI read/write. **Effort:** 1 week.

---

## 4. Medium-severity findings

- **M-1 — Session tokens in `localStorage`** (`cloud-sync.js:49`). `access_token`/`refresh_token` in localStorage are XSS-exfiltratable. Escaping discipline is good (see S-1) which lowers the odds, but httpOnly cookies via a server session are the correct model once a backend exists.
- **M-2 — Two KB loaders exist** (`tools/lib/load-kb.js` and `load-engine.js`) and have already drifted once this month. A guard test now exists — keep it. Better: one loader.
- **M-3 — `saveStore` fires `cloudEnqueue` for the whole `patients`/`visits` key on every save** (`storage.js:37`); `cloudDrain` then re-serializes and re-POSTs **every** record, not a delta (`cloud-sync.js:232`). At 5,000 patients that is a multi-MB POST on every keystroke-triggered save. Does not scale past a small clinic. **Fix:** per-record dirty tracking + delta push.
- **M-4 — `localStorage` as the system of record.** 5–10 MB hard ceiling; the app `alert()`s on `QuotaExceededError` (`storage.js:42`) — an honest but hard wall. A busy clinic hits it. IndexedDB is used only for file blobs. **Fix:** move records to IndexedDB.
- **M-5 — No input validation on structured clinical numerics.** IOP/refraction/CCT are `parseFloat`'d directly; a fat-fingered "444" IOP or negative CCT feeds the engine and the record with no bounds check. **Fix:** range validation at entry with soft warnings.
- **M-6 — 29 source files have no unit test** (per `tools/audit.js`) — mostly UI modules exercised only in browser E2E. Thinnest part of the safety net.
- **M-7 — Global mutable state (`P`, `V`, `CU`, `CV`, `CP`).** Simple and fast for one user; no isolation, and the sync layer mutates the same globals the UI reads. Race between a realtime merge and an in-flight render is possible (mitigated by `CLOUD._suppress` and "never clobber the open visit," but not eliminated).

---

## 5. What is genuinely good (do not "fix" these)

- **S-1 — Output escaping is disciplined.** ✅ VERIFIED: injected `<img onerror=alert()>` as a patient name and drove the report, prescription, chart, header and patient list — **no script fired, no raw node injected**. `escH()`/`esc()` guard the HTML sinks (413 call sites). The two unescaped `nm` uses (`ui-report.js:336`, `:400`) go into a plaintext letter body and a `document.title`, neither of which executes. This is better XSS hygiene than most React-free codebases.
- **S-2 — The diagnostic engine is deterministic, offline, and evidence-gated.** ✅ VERIFIED by the audit: identical input → identical output across runs; age-alone yields no differential; no network call in the engine path; red-flag probes fire. This is the hard, defensible core and it is well built.
- **S-3 — The RLS design is competent.** SECURITY DEFINER membership helpers in a private schema avoid recursive-policy pitfalls; tenant isolation is server-enforced, not client-trusted. Whoever wrote `001` understood Postgres RLS.
- **S-4 — Anti-fabrication test culture is exceptional for this stage.** The simulation layer's round-trip test (write a value → run the *real* engine → require the token back, or fail the build) is a genuinely sophisticated way to prevent invented clinical numbers. The KB carries per-condition `NEEDS_CLINICAL_REVIEW` flags. The code comments are unusually honest about their own limits ("this is not real security").
- **S-5 — Credential hashing was just done correctly** (`auth-crypto.js`): PBKDF2-SHA-256, random salt, constant-time compare, legacy migration. The *user* path is fixed; only the *admin* path (H-5) still uses the old hash.

---

## 6. Registers

### Deployment blockers (must fix before real PHI)
| ID | Finding | Effort |
|---|---|---|
| C-1 | PII to cloud in clear | 1–2 wk (encrypt) |
| C-2 | No consent gate on PHI egress | 1–2 d |

### Security register
| ID | Finding | Sev |
|---|---|---|
| C-1 | Unencrypted PII to third party | Critical |
| H-3 | API key in browser | High |
| H-5 | djb2 admin hash + default in source | High |
| H-7 | No server audit trail | High |
| M-1 | Tokens in localStorage | Medium |
| — | No rate-limit/lockout on login (client-side, so moot until backend) | Low |

### Data / consistency register
| ID | Finding | Sev |
|---|---|---|
| H-2 | LWW clock-skew data loss | High |
| H-6 | No visits→patients FK; deleted rows resync | High |
| M-3 | Full-collection push, not delta | Medium |
| M-4 | localStorage as system of record | Medium |

### Reliability register
| ID | Finding | Sev |
|---|---|---|
| H-1 | Live sync never repaints (dead selector) | High |
| H-4 | No global error boundary | High |
| M-7 | Shared global mutable state | Medium |

### Technical-debt / architecture register
- Full-panel `innerHTML` re-render; no component model, no reactive primitives.
- 1,705-line `app.js` mixes auth, routing, rendering, autosave, admin UI — the single most-coupled file; split it.
- Two KB loaders (M-2). Ordered `<script>` tags as the only dependency graph (60+ tags, order-critical, no enforcement beyond the audit).

---

## 7. Per-file risk (the files that carry weight)

| File | Purpose | Risk | Note |
|---|---|---|---|
| `cloud-sync.js` | PHI sync | **Critical** | C-1, H-1, H-2, H-6, M-3 |
| `db/migrations/001` | schema | High | H-6, H-7; RLS itself is good |
| `claude.js` | LLM wrapper | High | H-3, key in browser |
| `roles.js` | authz + admin gate | High | H-5 |
| `app.js` | everything | Medium | over-coupled; no error boundary (H-4) |
| `storage.js` | persistence | Medium | M-3, M-4 |
| `auth-crypto.js` | user creds | Low | correct; recently fixed |
| `engine.js` | diagnosis | Low | deterministic, offline, tested — strong |
| `simulation*.js` | teaching | Low | well-tested, anti-fabrication guarded |
| `ui-report.js` / `ui-chart.js` | print/report | Low | escaped sinks (S-1) |
| generated data (`token-registry`, `condition-info`, `icd-map`, `expansion`) | KB data | Low | sampled; all clinical values carry review flags |

Files not individually scored are UI renderers and KB data of Low risk; inflating them into 70 fabricated scorecards would be noise, not diligence.

---

## 8. Scalability — expected behaviour

- **100 users / small clinics:** works today (offline path), *if* C-1/C-2 are fixed. The full-collection push (M-3) is tolerable at a few hundred records.
- **1,000 clinics:** breaks. localStorage ceiling (M-4), full-collection re-push per save (M-3), LWW data loss (H-2), and Supabase-direct-from-browser (no server tier for rate-limiting, quotas, or PHI mediation).
- **10,000 clinics:** requires a different architecture — a real API tier, per-record deltas, server-authoritative conflict resolution, encrypted PHI, background sync workers. This is a rebuild of the *data* layer, not the engine.

The engine itself scales fine — 0.5 ms per full run over 394 conditions, all client-side.

---

## 9. Top improvements, ranked by impact

1. **Encrypt PII before cloud egress + consent gate (C-1, C-2).** Unblocks every conversation with a hospital or investor.
2. **Proxy the LLM key server-side (H-3).**
3. **Server-side immutable audit log (H-7).**
4. **Fix the dead `cloudRerender` selector (H-1)** — 15 min, restores the headline multi-device feature.
5. **Replace LWW with versioned/server-authoritative conflict resolution (H-2).**
6. **Global error boundary + per-renderer try/catch (H-4).**
7. **Admin gate onto PBKDF2 (H-5)** — 2 hours.
8. **Add the visits→patients FK and filter soft-deletes on pull (H-6).**
9. **Per-record delta sync (M-3).**
10. **Move records to IndexedDB (M-4).**
11. Clinical numeric range validation (M-5).
12. Split `app.js` into router/auth/render/admin modules.
13. Collapse the two KB loaders (M-2).
14. Session tokens out of localStorage once a backend exists (M-1).
15. Unit tests for the 29 uncovered UI modules (M-6).

(11–100 are refinements of the above families — validation coverage, telemetry, per-tenant keys, backup encryption, CSP headers, dependency-free build hardening, etc. The 10 above are where the risk actually is.)

---

## 10. Time to enterprise-grade

- **Fix the two deployment blockers (C-1, C-2):** ~2–3 weeks to a defensible minimum.
- **Clear the High register (H-1…H-7):** ~6–8 weeks.
- **Real multi-tenant backend, encrypted PHI, audit, delta sync, IndexedDB, error handling, and a compliance posture a hospital will sign:** **~4–6 months** of focused work by 1–2 senior backend/security engineers, *without touching the engine or KB*, which are the parts that are already good.

The unusual and encouraging shape of this codebase: **the hard, differentiated, hard-to-hire-for part (a safe, deterministic, well-tested clinical reasoning engine) is the strong part**, and the weak part (backend/security plumbing) is the commodity part any competent senior hire fixes in a quarter or two. That is the correct risk profile to fund — the reverse (great infra, hand-wavy clinical logic) is the one to walk away from.

---

*Prepared against the running build. Every ✅ VERIFIED claim was reproduced by executing the code in a headless browser or the Node engine harness. Findings are the reviewer's; clinical-content correctness remains the founder's sign-off.*
