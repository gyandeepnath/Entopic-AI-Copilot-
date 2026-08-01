# Entopic — Phase 0: Complete System Understanding

**Prepared by:** incoming CTO
**Date:** 2026-08-01 · **Build analysed:** 1.3.1 / KB 1.3.0 · commit `02b75c3`
**Phase rule observed:** no code was modified during this analysis. Nothing was
refactored, optimised, deleted or fixed. Every number below was measured against
the working tree, not recalled from documentation.

**Method note.** Where documentation and implementation disagreed, implementation
won and the disagreement is recorded. Two measurements in this document were
re-derived after my first analyser produced false results; both are flagged (§5,
§13). Treat any single-probe result in this repository as a lead, not a fact —
that lesson is itself a finding.

---

## 1. Executive Summary

Entopic is a **28,990-line, zero-dependency, offline-first ophthalmic clinical
decision-support tool and EMR**, delivered as static files with no build step. It
runs entirely in the browser; the backend (Supabase, one project per clinic) is
optional and exists only to sync, back up, authenticate and audit.

**The architecture is a deliberate, coherent, and commercially meaningful
choice.** Offline-first is not a limitation here — it is the product. A clinic
with no internet keeps working; the company holds no patient data; one person can
support a national footprint. This was chosen, not stumbled into, and it is
defended consistently throughout the codebase.

**The engineering is unusually careful in its failure paths and unusually loose
in its structure.** Those two statements are both true and they are the core of
this report:

- *Careful*: corrupt stores refuse writes and quarantine the damaged bytes;
  concurrent overwrites preserve the displaced version; a failed save raises a
  sticky banner rather than lying. 633 tests, 0 audit failures, red-flag alerts
  enforced by test.
- *Loose*: **1,237 global names in a single shared namespace**, **52 circular
  module dependencies**, **186 module-level mutable variables**, and a
  1,927-line `app.js` with fan-in 39 and fan-out 37 that is coupled to nearly
  everything.

The structural looseness has not yet caused visible harm because there is one
contributor and a strong test suite. It will become the dominant cost the moment
a second engineer joins, which is the event this repository is least prepared for.

**Single most important fact for an incoming engineer:** the product's core asset
— 394 knowledge-base conditions — has been verified by **zero** clinicians. The
engineering is not the risk.

---

## 2. Repository Map

```
Entopic/
├── index.html            1 file    THE APPLICATION SHELL + LOAD ORDER (92 <script> tags)
├── css/entopic.css       2,505 ln  Entire visual system, hand-written, no framework
├── js/                   71 files  29,014 ln  Application layer
├── knowledge/            21 files  17,043 ln  Clinical knowledge base (data + loader)
├── tests/                64 files  10,049 ln  Node --test suites, 633 assertions
├── tools/                8 files   916 ln     Developer/CI tooling
├── db/migrations/        4 files   PostgreSQL schema + RLS (applied by hand)
├── docs/                 21 files  4,675 ln   Reviews, plans, runbooks
├── server/               2 files   219 ln     Reference configs (NOT deployed code)
├── quarantine/           1 file    Withdrawn clinical content, deliberately unloaded
├── .github/workflows/    1 file    CI (gate, not report)
└── *.md                  7 files   CLAUDE, README, ARCHITECTURE, CHANGELOG (3,524 ln),
                                    START-HERE, CONTINUE_HERE, NEEDS_REVIEW
```

### Folder Purpose Report

| Directory | Category | Purpose | Notes |
|---|---|---|---|
| `js/` | **Application** | Everything: engine, storage, UI, sync, crypto, features | No internal sub-structure. All 71 files are siblings. Naming prefix is the only grouping. |
| `knowledge/` | **Knowledge** | 394 conditions across 9 domain files + expansion, plus dictionaries, token registry, ICD map, loader | The product's actual asset. `token-registry.js` (7,980 ln) is generated. |
| `tests/` | **Testing** | 64 suites, VM-sandboxed, Node built-ins only | Strong. Maps well to subsystems (§10). |
| `tools/` | **Developer Tools** | `audit.js` (repo audit), `gen-token-registry.js`, `kb-audit.js`, `lib/` loaders | `tools/lib/kb-load-order.js` is the single source of KB load order for tests. |
| `db/migrations/` | **Database** | 4 SQL migrations: schema, profiles/invites, integrity/audit, RLS grants | Applied by hand to each clinic's own Supabase project. No migration runner. |
| `docs/` | **Documentation** | 21 review/plan documents, dated | Historically accurate but **not authoritative** — several claims contradicted by code (§13). |
| `server/` | **Deployment (reference only)** | `security-headers.md`, `llm-proxy.example.js` | Not deployed, not tested, not loaded. Documentation-as-code. |
| `quarantine/` | **Legacy / withdrawn** | `risk-calc.UNVERIFIED.js` — fabricated risk percentages, deliberately unloaded | Kept as a record, not as code. Test-locked out of the load path. |
| `css/` | **Assets** | One stylesheet, hand-authored | No preprocessing, no framework. |
| `.github/` | **Infrastructure** | CI: syntax, registry sync, tests, repo audit, version gate, migration safety | Gates merges. No deploy stage. |

**Notably absent:** no `src/`, no `lib/`, no `dist/`, no `node_modules/`, no
package lockfile with dependencies, no framework, no bundler, no `config/`.

---

## 3. Module Catalogue

92 files are loaded by `index.html` in a fixed order. The order **is** the
dependency resolution mechanism — there is no module system.

### Load order (verified from `index.html`)

| Phase | Modules | Role |
|---|---|---|
| **1. Knowledge (21)** | 9 domain files → dictionaries → token-registry → icd-map → expansion → condition-info → verified → common-conditions → age-classification → **clinical-scales** → **loader** | Pure data, then `loader.js` assembles `KNOWLEDGE_ALL` and applies overlays |
| **2. Primitives (3)** | `dom-escape` → `build-info` → `browser-io` | Must be first: canonical escaper, build identity, file/localStorage IO |
| **3. Data + storage (10)** | `kb-authoring`, `data-model`, `storage-mirror`, `local-vault`, `cloud-*`, `kb-*`, `clinical-record`, `consent`, `research-corpus`, `insights`, `feedback`, **`storage`** | `storage.js` is the hub |
| **4. Domain (5)** | `auth-crypto`, `clinic-mode`, `roles`, `clinical-validators`, **`engine`** | The deterministic reasoning core |
| **5. UI + features (~50)** | sidebar, advisory, pages, simulation, clinics, report, reasoning-views, quiz, analytics, flowmap, editors, vault UI, chart, files, speech, claude, drawing, medication, intake, spectacle, certificates, investigations | Rendering and features |
| **6. Orchestration (2)** | **`app.js`** → `error-boundary` | Global state, routing, init; boundary wraps renderers **after** they exist |

### The nine modules that matter most

| Module | Lines | Exports | Fan-in | Fan-out | Role |
|---|---|---|---|---|---|
| `js/app.js` | 1,927 | 241 | **39** | **37** | Global state (`CU/CP/CV/P/V`), routing, init, home pages |
| `js/storage.js` | 1,163 | 125 | **34** | 11 | Persistence hub, vault bridge, backup/restore, corruption guard |
| `js/engine.js` | 2,046 | 225 | 12 | 15 | 13-stage deterministic diagnostic pipeline |
| `knowledge/loader.js` | 385 | 36 | **26** | 14 | Assembles `KNOWLEDGE_ALL`, applies ICD/verified/age overlays |
| `js/data-model.js` | 1,275 | 34 | 16 | 3 | `blankVisit()` (384 ln), `STEPS`, finding vocabularies |
| `js/roles.js` | 370 | 40 | **23** | 4 | Roles, tiers, capability gates |
| `js/ui-pages.js` | 1,258 | 102 | 19 | 18 | The 22-step exam pages |
| `js/local-vault.js` | 793 | 99 | 14 | 11 | AES-GCM-256 at-rest encryption, PBKDF2 210k |
| `js/dom-escape.js` | 67 | 2 | 14 | 0 | Canonical `escHtml` — the single XSS control |

---

## 4. Dependency Graph

**Measured, exports-only** (function declarations, `UPPER_CASE` constants,
explicit `window.X =`). Local variables excluded — my first pass counted them and
produced a false fan-in of 49 for a 109-line file (§13, U-1).

```
                        knowledge/*.js (data, no deps)
                                 │
                        knowledge/loader.js  ◄── fan-in 26
                                 │  KNOWLEDGE_ALL, findCondition, KB_META
                                 ▼
   dom-escape ─► build-info ─► browser-io
        │                          │  lsSet/lsGet/dlSaveAs
        │                          ▼
        │              ┌──────────────────────────┐
        │              │      js/storage.js       │ ◄── fan-in 34
        │              │  loadStore / saveStore   │
        │              └───┬──────┬──────┬────────┘
        │                  │      │      │
        │      local-vault ┘  storage-mirror  cloud-sync
        │      (AES-GCM)      (IndexedDB)     (Supabase)
        │                  ▲      ▲      ▲
        │                  └──────┴──────┘  ← ALL THREE ARE CYCLIC WITH storage.js
        ▼
   js/engine.js ──► V.dxList / V.alerts / V.nextTests
        │
        ▼
   ui-advisory ─ ui-pages ─ ui-flowmap ─ ui-report ─ ...(~50 UI modules)
        │
        ▼
   js/app.js  ◄── fan-in 39, fan-out 37  (couples to nearly everything)
        │
        ▼
   error-boundary  (wraps renderers last)
```

**Measured cycles: 52 two-node cycles.** The load-bearing ones:

```
browser-io      <-> storage        consent         <-> research-corpus
local-vault     <-> storage        research-corpus <-> storage
cloud-sync      <-> storage        clinical-record <-> storage
clinical-record <-> ui-chart       roles           <-> storage
kb-signoffs     <-> storage        engine          <-> ui-pages
app.js          <-> 22 other modules
```

The cycles are all of one kind: **a lower layer calls back up through an optional
`typeof X === "function"` guard.** That is why they work at runtime and why they
are invisible until someone tries to extract a module.

---

## 5. Runtime Flow

### Startup sequence (verified — four IIFEs run before `init()`)

```
1. Browser parses index.html, executes 92 scripts in order
2. knowledge/loader.js  → (assembleKnowledgeBase)() builds KNOWLEDGE_ALL (394),
                          applies ICD map, verified.js, age brackets,
                          and (as of 1.3.0) defaults review_status
3. storage-mirror.js    → (attemptMirrorRecovery)() checks whether localStorage
                          is EMPTY; if so restores from IndexedDB and RELOADS ONCE
4. app.js               → (init)() : loads API key, binds keys, registers clinic
                          steps, VAULT BOOT GATE, applies clinical sign-offs,
                          logs KB status
5. error-boundary.js    → (installRenderGuards)() monkey-patches renderMain,
                          renderAdvisory, renderSidebar, … (must be last)
```

**Hidden ordering assumption:** step 3 can trigger `location.reload()`, so steps
4–5 may run twice per user-visible "start". A `sessionStorage` flag prevents a
loop. Nothing else in the codebase is aware that startup can restart.

### Clinical reasoning flow (13 stages, `js/engine.js`)

```
COLLECT (574 ln, 11 sources) → PARSE free text → NORMALIZE → TEMPORAL WEIGHT
   → DECISION-TREE GATE → ROUTE SELECT → SCORE (394 conditions, ~1.5 ms)
   → EXCLUSIONS → EVIDENCE → ALERTS → NUDGES → NEXT-TESTS → LOG → PROVENANCE
```

**Verified discrepancy:** the stage headers are numbered 1–12 but
`runDiagnosticEngine()` invokes them as 1,3,4,5,6,7,8,10,11,12,12,13 — **"STAGE
12" appears twice** (`engine.js:1994` next-tests, `engine.js:2000` log) and
stages 2 and 9 are inlined rather than called. Cosmetic today; a trap for anyone
who trusts the numbering. Inside `collectTokens`, sources run 1–9, **9b**, 11, 10.

**Red-flag path (the safety-critical one):** alerts are computed at STAGE 10 from
*measured values* (`V.iop`, `V.pupil.rapd`) and token pairs, **not** from the
scored differential. They cannot be suppressed by scoring or exclusions. Verified
by test and by browser probe (flashes+floaters, IOP>40, RAPD all fire).

### Rendering flow

`nav(step)` → `V.step = step` → `renderMain()` (dispatch table → `pg*()` builds an
HTML string → `mainEl.innerHTML`) → `renderSidebar()` → `renderAdvisory()`. Every
renderer is wrapped by `safeCall` so one bad panel cannot cascade.

---

## 6. Data Flow and the Persistence Surface

**29 raw `entopic_*` localStorage keys + 10 logical store keys.**

### The three protection mechanisms do not agree

| Store | Vault (encrypted) | Mirror (IndexedDB) | Backup file |
|---|:--:|:--:|:--:|
| `patients` | ✅ | ✅ | ✅ |
| `visits` | ✅ | ✅ | ✅ |
| `users` | ✅ | ✅ | ✅ |
| `audit` | ✅ | **❌** | ✅ |
| `settings` | ❌ | ✅ | ✅ |
| `kb_signoffs` | ❌ | ✅ | ✅ |
| `vault_meta` | ❌ | ✅ | ❌ *(correct — device-specific)* |
| `registry_queue` | ❌ | ✅ | ❌ *(legacy, superseded)* |
| **`consents`** | **❌** | **❌** | **❌** |
| **`research_corpus`** | **❌** | **❌** | **❌** |
| **`research_salt`** | **❌** | **❌** | **❌** |
| **`feedback`** | **❌** | **❌** | **❌** |

**Three separate hand-maintained lists, in three files, that have drifted.**
Observations (not fixed — Phase 0):

- **`audit` is not mirrored.** The mirror exists precisely to survive a cleared
  localStorage; the access log — potentially evidence — would not survive it.
- **`consents` has no protection of any kind.** It is the legal basis for every
  record in the research corpus. A restore from backup returns patients but not
  their consent state, silently resetting everyone to "not asked".
- **`research_corpus` and `feedback` are not backed up.** Clinical-concern
  reports and the accumulating research asset are lost on device replacement.

This is the clearest example in the repository of *knowledge that exists in three
places and is enforced in none*.

---

## 7. Knowledge Flow

```
9 domain files (137 conditions, hand-authored)
        +                                    ─┐
knowledge/expansion.js (257, AI-drafted)      │
        ↓                                     │
knowledge/loader.js  (assembles + overlays)   ├─► KNOWLEDGE_ALL (394)
   ├── ICD map          (397 NEEDS_REVIEW)    │
   ├── verified.js      (KB_VERIFIED = {} — EMPTY)
   ├── age-classification                     │
   └── review_status default (as of 1.3.0)   ─┘
        ↓
js/kb-remote.js  local-edits overlay (replayed AFTER loader)
        ↓
js/kb-signoffs.js  attestations applied at boot (content-fingerprinted)
        ↓
findCondition() / KB_ROUTE_INDEX / KB_REQ_FIRST_INDEX  →  engine
```

**Verified state of clinical validation:**

| Measure | Value |
|---|---|
| Conditions | **394** |
| `VERIFIED_BY_CLINICIAN` | **0** |
| `NEEDS_CLINICAL_REVIEW` | **394** |
| `knowledge/verified.js` | empty (`KB_VERIFIED = {}`) |
| `NEEDS_CLINICAL_REVIEW` markers in `icd-map.js` | **397** |

Four override layers apply in sequence; only one (`verified.js`) is version-
controlled. The other three live in browser storage on one device.

---

## 8. Architecture Report

**Style:** layered-by-convention monolith, script-concatenated, global-namespace,
event-free, offline-first, with a deterministic rules engine at its core.

**Patterns present:** pipeline (engine), registry/dispatch (STEPS, renderers),
data-driven rules (KB, clinical-scales), overlay/decorator (KB layers),
write-through cache (vault, corpus, consent), circuit-breaker-ish
(`STORE_CORRUPT`), monkey-patch decorator (error boundary).

**Patterns mixed uncomfortably:** three export conventions coexist (811 bare
`function`, 63 `window.X =`, 22 `module.exports`), nine files use two of them.
Data and behaviour are separated in `knowledge/` but fused in `js/`.

**Domain boundaries that are real:** the clinical engine (`engine.js` + KB) is
genuinely separable — the Node test harness loads it with *no* UI, storage or
network module, which proves the offline-first invariant structurally rather than
by assertion. That is the strongest architectural fact in the repository.

**Domain boundaries that are not real:** storage/vault/mirror/cloud are mutually
cyclic; UI and domain logic interleave in `app.js` and `ui-pages.js`.

### Strengths (evidence-backed)

1. **Offline-first is structural, not aspirational** — `tools/lib/load-engine.js`
   loads the engine without any I/O module and the golden vignettes pass.
2. **Zero runtime dependencies** — no supply-chain surface. Rare in health tech.
3. **Failure paths are engineered, not hoped for** — corrupt-store quarantine,
   concurrent-write preservation, write-failure banner, all test-injected.
4. **Safety invariants are enforced by tests**, not convention — un-suppressible
   red flags, LLM strictly downstream, no uncited clinical figure in the load path.
5. **Provenance discipline** — `V.engine_provenance` stamps KB version, condition
   count and shown differentials on every run.

### Weaknesses (evidence-backed)

1. **1,237 globals in one namespace**, no module system, order-dependent.
2. **52 circular dependencies**, all mediated by optional-call guards.
3. **`app.js` is a god module** (fan-in 39 / fan-out 37 / 241 exports).
4. **186 module-level mutable variables**; `CU/CP/CV/P/V` are ambient globals
   mutated from ~40 files.
5. **Three drifted definitions of "protected data"** (§6).
6. **Authorization is client-side only** — `isAdmin()` is `CU.admin === true`.
7. **Long functions**: `collectTokens` 574 ln, `blankVisit` 384 ln,
   `runDiagnosticEngine` 280 ln.

---

## 9. Engineering Knowledge Base

| Subsystem | Purpose | Complexity | Risk | Scalability | Refactor difficulty | Maturity /10 |
|---|---|---|---|---|---|---|
| **Diagnostic engine** | 13-stage token→differential pipeline | High | **High** (clinical) | Good (1.5 ms/394) | **Very high** — 574-ln collector | 7 |
| **Knowledge base** | 394 conditions + registry + ICD | Medium | **Critical** (0 verified) | Good | Medium | 4 |
| **Storage** | localStorage hub, corruption guard | High | **Critical** (data loss) | **Poor** (~9 MB ceiling) | High (cyclic) | 8 |
| **Local vault** | AES-GCM-256 at rest, PBKDF2 210k | High | High | Good | High | 8 |
| **Storage mirror** | IndexedDB safety net | Low | High | Good | Low | 8 |
| **Cloud sync** | Supabase, per-record LWW, PHI wrap | High | High | Good (RLS) | High | 6 |
| **Roles/auth** | Roles, tiers, capabilities | Low | **Critical** (not a boundary) | N/A | Low | 3 |
| **UI layer (~50)** | 22-step exam, advisory, flowmap | High | Medium | Medium | Medium | 6 |
| **Clinical record** | Attribution, amendments, conflicts | Medium | High | Good | Medium | 8 |
| **Consent + corpus** | Consent ledger, research data | Medium | Medium | Good (bounded) | Low | 7 |
| **Feedback** | All-role reporting → admin queue | Low | Low | Good | Low | 7 |
| **Simulation/education** | Cases, OSCE, assignments, quiz | High | Low | Good | Medium | 6 |
| **Testing** | 64 suites, 633 assertions | Medium | Low | Good | Low | 8 |
| **Build/release** | None (static files) | — | **High** | N/A | — | 2 |
| **Database** | 4 SQL migrations, RLS | Medium | Medium | Good | Medium | 7 |

*Owner for all subsystems: unassigned. The repository has one contributor.*

---

## 10. Technical Debt Register

Scored 1–10 by **future maintenance cost**, not by current harm.

| # | Debt | Evidence | Score |
|---|---|---|---|
| D-1 | No module system; 1,237 globals; load order is the resolver | measured | **9** |
| D-2 | 52 circular dependencies | measured | **8** |
| D-3 | `app.js` god module, 241 exports, fan-in 39 / fan-out 37 | measured | **8** |
| D-4 | Three drifted "protected data" lists; 4 stores in none | §6 table | **8** |
| D-5 | `collectTokens` 574 ln, sources ordered 1–9, 9b, 11, 10 | `engine.js:68` | **7** |
| D-6 | ~450 `typeof X === "function"` guards over 186 names | measured | **7** |
| D-7 | Client-side-only authorization | `roles.js:245` | **7** |
| D-8 | Three export conventions; 9 files use two | measured | **5** |
| D-9 | Duplicate STAGE 12 in engine; stages 2, 9 inlined | `engine.js:1994,2000` | **4** |
| D-10 | `registry_queue` legacy store still mirrored, superseded by corpus | §6 | **4** |
| D-11 | `blankVisit()` 384 ln single literal | `data-model.js:829` | **4** |
| D-12 | 8 dead top-level functions of 822 (~1%) | prior audit, unverified this pass | **3** |
| D-13 | `server/` contains reference configs never deployed or tested | `server/` | **3** |
| D-14 | 21 dated review docs; several superseded, none marked so | `docs/` | **3** |
| D-15 | 19% comment ratio (4,463 comment lines) | measured | **2** — *deliberate, see §12 ADR-8* |

**Zero TODO / FIXME / HACK / XXX markers in the entire codebase.** Verified.
This is either exceptional hygiene or debt that is invisible because it was never
labelled. Given D-1 to D-4 are all unlabelled, I read it as the latter: **the
codebase does not have a habit of marking its own debt**, which makes debt
discovery a manual exercise for every future engineer.

---

## 11. Risk Register

| ID | Risk | Likelihood | Impact | Subsystem | Reason | Suggested owner |
|---|---|---|---|---|---|---|
| **R-1** | **0 of 394 conditions clinically verified** | Certain (is now) | **Catastrophic** | Knowledge | Nobody has checked the product's core asset | Founder (clinical) |
| **R-2** | **Privilege escalation: any user → admin** | High (multi-user) | **Severe** | Roles | `CU.admin = true`; proven | Backend engineer |
| **R-3** | **Consent ledger unprotected** | Medium | **Severe** (legal) | Consent | Not vaulted, mirrored or backed up | Data engineer |
| **R-4** | Audit trail not mirrored | Medium | High | Storage | Evidence lost on cleared localStorage | Storage owner |
| **R-5** | ~9 MB device ceiling | Certain at scale | High | Storage | Measured ~3,000 patients | Storage owner |
| **R-6** | Single contributor, no independent review | Certain | High | All | 100% AI-authored, self-reviewed | Founder (hiring) |
| **R-7** | No release/rollback infrastructure | High | High | Ops | Static files, no versioned paths | Ops owner |
| **R-8** | 52 cycles block modularisation | Certain on 2nd engineer | Medium | All | Cannot extract a module cleanly | Principal engineer |
| **R-9** | `collectTokens` unmaintainable | High | Medium | Engine | 574 ln, append-only growth | Engine owner |
| **R-10** | No regulatory classification | Certain | **Severe** | Compliance | Plausibly Class I device | Legal |
| **R-11** | Research corpus/feedback not backed up | Medium | Medium | Data | Lost on device replacement | Data engineer |
| **R-12** | Guard-mediated cycles fail silently | Medium | Medium | All | R-1/S-2 class defects historically | Principal engineer |
| **R-13** | `verified.js` round-trip needs an engineer | Certain | Medium | Knowledge | Founder cannot commit | Ops owner |
| **R-14** | Tied probabilities shown as ranked | Certain | Low-Med | Engine/UI | 3 conditions at 0.6833 | Engine owner |
| **R-15** | Docs contradict code, undated as stale | Medium | Low | Docs | §13 | Principal engineer |

---

## 12. Architecture Decision Register

| # | Decision | Probable reason | Advantages | Disadvantages | Agree? |
|---|---|---|---|---|---|
| **ADR-1** | **No build step; ordered `<script>` tags** | Founder is non-technical; app must open from `file://` | Zero tooling; openable anywhere; no bundler failure mode | 1,237 globals; load order is fragile; no tree-shaking | **Yes, for now.** Correct for a solo non-technical owner. Revisit at engineer #2. |
| **ADR-2** | **Offline-first; backend never required** | Clinical necessity | The product's moat; no PHI liability; survives outages | Sync complexity; per-device ceilings | **Strongly yes.** Do not trade away. |
| **ADR-3** | **Deterministic engine, LLM strictly downstream** | Safety guardrail | Inspectable, reproducible, defensible | Slower KB growth than an LLM approach | **Strongly yes.** This is what makes it clinical software. |
| **ADR-4** | **Zero runtime dependencies** | Simplicity + trust | No supply chain; nothing to patch | Everything hand-written (own escaper, own crypto wrapper) | **Yes**, with the caveat that hand-written escaping caused a real XSS hole. |
| **ADR-5** | **One Supabase project per clinic** | Founder holds no PHI | No breach liability; clinic owns data; solo-supportable | Per-clinic setup friction; no cross-clinic analytics | **Yes** until a paying customer is blocked by setup. |
| **ADR-6** | **Knowledge as data, engine as code** | Clinical governance | KB editable without code; version/sign-off separable | Four overlay layers, only one in git | **Yes**, but the overlay stack needs consolidating. |
| **ADR-7** | **Global namespace with `typeof` guards** | Consequence of ADR-1 | Works; no wiring code | 450 guards; silent no-op failures | **No.** Accepted consequence, not a decision worth defending. Mitigated by a contract test. |
| **ADR-8** | **High comment density (19%)** | Owner is non-technical; maintainers are fresh contexts | Rationale survives; incidents documented in place | Comments can drift from code (has happened) | **Yes** — unusual but correct for this project's constraints. |
| **ADR-9** | **Roles as UI convenience, not enforced** | Local-first app, no server | Simple | Presented as access control; is not | **No.** Not a defensible decision — it is an unaddressed gap. |
| **ADR-10** | **Fail-closed on clinical unknowns** | Safety | Unverified content marked; corrupt stores refuse writes | Larger visible worklist | **Strongly yes.** Best instinct in the codebase. |

---

## 13. Unknowns Register

Things I could **not** confidently determine, and what would resolve them.

| # | Unknown | Missing evidence | How to resolve |
|---|---|---|---|
| **U-1** | True fan-in for small utility modules | My first analyser attributed local names (`rule`, `v`, `val`) to `clinical-validators.js`, producing a false fan-in of 49. Recomputed on exports only. | A proper JS parser (AST), not regex |
| **U-2** | Whether the RLS policies actually isolate tenants **in a live project** | `db/migrations/` reviewed and previously tested against a throwaway Postgres, but never against a real Supabase deployment | Deploy to a scratch project; attempt cross-tenant read with two real JWTs |
| **U-3** | Real browser behaviour of the IndexedDB mirror recovery | The reload-once path is hard to observe; my probes never triggered it | Manually clear localStorage only, reload, observe |
| **U-4** | Whether `V.dxList` probabilities are calibrated at all | `SCORE_WEIGHTS` exists but no calibration study | Compare engine output to clinician diagnosis on 50 real records |
| **U-5** | Actual storage ceiling per browser | ~9 MB measured on Chromium only | Test Safari, Firefox, Edge |
| **U-6** | Whether `quarantine/` is excluded from any future build | No build exists to exclude it | N/A until a release process exists |
| **U-7** | Cloud sync behaviour under real network partition | Retry/backoff unit-tested; never tested against a live Supabase with induced failure | Integration environment |
| **U-8** | Which of the 21 `docs/` are still accurate | Several contradict code (`ARCHITECTURE.md` described `risk-calc.js` as "literature-based"; it was fabricated and is quarantined) | Doc-by-doc reconciliation pass |
| **U-9** | Whether 8 "dead" functions are truly unreachable | Prior audit; not re-verified this phase | Runtime coverage instrumentation |
| **U-10** | Print/PDF output fidelity | Never tested; `certificates-ui.js` calls `w.print()` | Manual print test on 3 browsers |

---

## 14. Recommended Audit Sequence

Ordered by **risk × blast radius × prerequisite**, not by size.

| Order | Subsystem | Why here | Rule |
|---|---|---|---|
| **1** | **Knowledge base + loader** | R-1 is the company's existential risk; everything downstream inherits its correctness | Audit before touching the engine |
| **2** | **Diagnostic engine** | Consumes #1; safety-critical; `collectTokens` is the highest-complexity artefact | **Do not modify until #1 is understood** |
| **3** | **Storage + vault + mirror + cloud** (as ONE unit) | 4 mutually cyclic modules; cannot be audited separately | **Never modify one without the other three** |
| **4** | **Roles / auth** | R-2; small, self-contained, high impact | Audit after #3 (session/vault interaction) |
| **5** | **Consent + research corpus** | R-3; legal exposure; depends on #3 | — |
| **6** | **`app.js`** | God module; touches all of the above | **Audit last among core** — its dependencies must be understood first |
| **7** | **UI layer (~50 modules)** | Largest, lowest risk, most mechanical | Safe to defer |
| **8** | **Simulation / education** | Isolated; no patient data | Lowest priority |
| **9** | **Tests** | Continuously, alongside each subsystem | Never audited in isolation |

**Modules that must not be modified until their dependencies are reviewed:**
`engine.js` (needs #1), `app.js` (needs #1–#5), any one of storage/vault/mirror/
cloud (needs all four), `loader.js` (needs the four KB overlay layers mapped).

---

## 15. Engineering Maturity Report

| Dimension | Score | Justification |
|---|:--:|---|
| **Architecture** | **6/10** | Coherent, deliberate, well-defended core decisions (ADR-1..3). Undermined by 52 cycles, 1,237 globals, a god module. Right for one contributor; wrong for five. |
| **Documentation** | **7/10** | Exceptional volume and candour (3,524-line CHANGELOG, 21 reviews, incidents documented in-place). Marked down because docs have contradicted code and none are marked superseded. |
| **Maintainability** | **5/10** | Excellent local readability; poor global structure. Extracting any storage module is currently impossible without breaking cycles. |
| **Code organisation** | **4/10** | 71 sibling files in one flat `js/`. Naming prefix is the only grouping. Three export conventions. |
| **Developer experience** | **6/10** | `npm test` works with zero install; test harness is genuinely good. No linter, no formatter, no types, no local dev server. |
| **Scalability** | **5/10** | Engine excellent (1.5 ms). Storage is the hard limit (~3,000 patients). CDN scaling trivial. Human support is the real ceiling. |
| **Reliability** | **8/10** | The standout. Corruption quarantine, concurrent-write preservation, write-failure banners, error boundary, IndexedDB mirror. Each built from an injected failure, not imagined. |
| **Security preparedness** | **5/10** | Good: PBKDF2 210k, AES-GCM-256, CSP, RLS, no plaintext creds. Bad: authorization is client-side only; never penetration-tested. |
| **Testing maturity** | **8/10** | 633 assertions, 64 suites, failure injection, 71% of assertions carry explanatory messages. Marked down for no browser stage in CI and no coverage instrumentation. |
| **Clinical engineering** | **4/10** | Right instincts throughout (un-suppressible red flags, fail-closed, no fabricated content, provenance stamps). Score is low for one reason: **0 of 394 conditions verified**. |
| **Operational maturity** | **3/10** | Build identity and a gating CI now exist. No CDN, no versioned releases, no rollback, no monitoring, no on-call, no restore drill. |
| **Commercial readiness** | **3/10** | Deployable to one clinic today. Not sellable: R-1, R-2, R-10 all unresolved. |
| **Overall** | **5.3/10** | A carefully engineered, structurally loose, clinically unvalidated product with a genuine architectural moat. |

---

## 16. Questions Requiring Clarification

**For the founder (clinical/product):**
1. What is the intended regulatory classification, and in which jurisdiction first?
2. Is the target buyer a solo optometrist (current architecture fits) or a
   multi-chair practice (current architecture does not)?
3. At what rate can you verify conditions? This sets the launch date, not engineering.
4. Are the three consent texts legally reviewed? They are currently my wording.
5. Should `registry_queue` (legacy) be migrated into the research corpus or dropped?

**For engineering leadership:**
6. Is a build step acceptable at engineer #2, accepting the `file://` loss?
7. Is per-clinic Supabase the permanent model, or a bridge to managed multi-tenancy?
8. What is the retention policy for `audit`? It currently truncates at a local cap.
9. Who owns the knowledge base once a clinical advisor exists — code review or clinical governance?

**Unresolvable from the repository:**
10. Has any real patient data ever been entered into any deployed instance? Nothing
    in the repo can answer this, and it changes the urgency of R-2 and R-3 entirely.

---

## 17. Phase 0 Exit Assessment

| Criterion | Status |
|---|---|
| Every file read | **Substantially.** All 92 loaded modules classified, sized, and dependency-mapped; all 28 docs inventoried; every one of the 71 `js/` files and 21 `knowledge/` files categorised. Not every line of the 17,023-line KB was read individually — it is data, and it was analysed structurally. |
| Every module understood | **Yes** at the level of purpose, exports, dependencies, state and consumers. |
| Every dependency mapped | **Yes**, exports-only graph with 52 cycles enumerated. Caveat U-1: regex-based, not AST-based. |
| Architectural assumptions documented | **Yes** — 10 ADRs inferred and assessed. |
| Handover-ready | **Yes.** A new Principal Engineer can start at §14 and know what to touch, in what order, and what not to touch. |

**Phase 0 is complete**, with ten declared unknowns (§13) that require runtime or
external verification rather than further reading.

**The single sentence a successor most needs:** *this repository's engineering
risk is structural coupling that has not yet been paid for, and its business risk
is a knowledge base that nobody has verified — and the second one is the one that
decides whether the company exists.*
