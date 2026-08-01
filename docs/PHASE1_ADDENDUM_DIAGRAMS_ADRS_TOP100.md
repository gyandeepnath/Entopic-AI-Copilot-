# Phase 1 Addendum — the parts I skipped

**Date:** 2026-08-01 · **Build:** 1.3.1
**Why this exists:** the Phase 1 report delivered steps 2–10, 12 and 14 of the
specification and skipped four things. This completes them. The omissions were:

| Spec item | What was asked | What I delivered | Status |
|---|---|---|---|
| **Step 1** | 13 diagrams | 3 | **Completed here (§1)** |
| **Step 11** | Documentation review + recommended ADRs | Nothing | **Completed here (§2, §3)** |
| **Step 13** | 10 fields per recommendation | Full format for 3, one-liners for 13 | **Completed here (§4)** |
| **Final Q** | Top 100 architectural improvements | ~16, grouped | **Completed here (§5)** |

The Top 100 I compressed on purpose, judging that a grouped list was more useful
than a padded one. That was a decision I should have surfaced rather than made
silently — an itemised list is what makes a roadmap assignable, and grouping hid
which items are independent. It is itemised below.

**No production code was changed by this addendum.**

---

## 1. The ten missing diagrams

### 1.1 Overall architecture

```
                          ┌────────────────────────┐
                          │   STATIC ORIGIN / CDN  │   (does not exist yet)
                          │   index.html + 92 js   │
                          └───────────┬────────────┘
                                      │ HTTPS, cacheable, no PHI
   ┌──────────────────────────────────▼─────────────────────────────────┐
   │                        CLINIC DEVICE (browser)                     │
   │                                                                    │
   │   ┌────────────┐   ┌────────────┐   ┌──────────────┐               │
   │   │ PRESENTATION│──▶│  APP.JS   │◀──│  DOMAIN      │               │
   │   │ ~50 modules │   │ (god layer)│   │ engine/rec/  │               │
   │   └────────────┘   └─────┬──────┘   │ consent/roles│               │
   │                          │          └──────┬───────┘               │
   │                    ┌─────▼──────────────────▼─────┐                │
   │                    │      INFRASTRUCTURE          │                │
   │                    │ storage · vault · mirror ·   │                │
   │                    │ cloud-sync · file-store      │                │
   │                    └─┬────────┬────────┬──────────┘                │
   │            localStorage   IndexedDB   (network)                    │
   │              ~9 MB         ~GB          optional                   │
   └────────────────────────────────────────┬───────────────────────────┘
                                            │  sync/auth/audit ONLY
                                            ▼
                         ┌──────────────────────────────────┐
                         │  SUPABASE (one project / clinic) │
                         │  Postgres + RLS · Auth · Storage │
                         └──────────────────────────────────┘
```

### 1.2 Subsystem diagram

```
 CLINICAL            KNOWLEDGE           RECORD              EDUCATION
 ┌──────────┐        ┌──────────┐        ┌──────────┐        ┌──────────┐
 │ engine   │◀───────│ loader   │        │ storage  │        │simulation│
 │ scales   │        │ registry │        │ vault    │        │ osce     │
 │validators│        │ icd-map  │        │ mirror   │        │assignments│
 └────┬─────┘        │ signoffs │        │ clinical-│        │ quiz     │
      │              │ kb-remote│        │  record  │        └────┬─────┘
      │              └────┬─────┘        └────┬─────┘             │
      │                   │                   │                   │
      └───────────────────┴─────────┬─────────┴───────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
        RESEARCH              SYNC/CLOUD             PRESENTATION
        ┌──────────┐          ┌──────────┐           ┌──────────┐
        │ consent  │          │cloud-sync│           │ ui-pages │
        │ corpus   │          │cloud-    │           │ advisory │
        │ insights │          │  crypto  │           │ flowmap  │
        │ analytics│          │cloud-cfg │           │ report   │
        └──────────┘          └──────────┘           └──────────┘

 CROSS-CUTTING: dom-escape · build-info · browser-io · error-boundary · roles
```

### 1.3 Module diagram — the storage cluster (the entangled one)

```
                         ┌──────────────┐
             ┌──────────▶│  storage.js  │◀──────────┐
             │           │  loadStore   │           │
             │           │  saveStore   │           │
             │           └───┬───┬───┬──┘           │
             │               │   │   │              │
      lsSet/dlSaveAs   vaultCacheGet │ mirrorStore  │ cloudEnqueue
             │               │   │   │              │
      ┌──────┴─────┐  ┌──────▼───┴┐  ▼        ┌─────┴──────┐
      │ browser-io │  │local-vault│ storage-  │ cloud-sync │
      │            │  │           │  mirror   │            │
      └──────┬─────┘  └─────┬─────┘     │     └─────┬──────┘
             │              │           │           │
             └──────────────┴───────────┴───────────┘
                    ALL FOUR CALL BACK INTO storage.js
                    → 4-way cycle, none extractable alone
```

### 1.4 Domain diagram (what the domain *is* — note the code models none of it)

```
   Clinic ──1:N── User ──────────┐
     │                            │ authored_by
     │ 1:N                        ▼
   Patient ──1:N── Visit ────── Amendment
     │               │
     │               ├── Findings (slit-lamp, fundus) ─── Laterality
     │               ├── Measurements (IOP, VA, refraction)
     │               ├── Differential ── Condition ── Token
     │               ├── Alerts (urgent)
     │               ├── Prescription
     │               ├── Attachments
     │               └── ClinicalScale answers
     │
     ├── Consent (per purpose, versioned)
     └── ResearchEncounter (pseudonymous, de-identified)

   REALITY: every box above is a plain object literal. No entity, no value
   object, no aggregate root, no invariant. This diagram exists only in the
   developer's head and in this document.
```

### 1.5 Application lifecycle

```
 LOAD ─────────────────────────────────────────────────────────────────┐
 │ 1. 92 <script> tags execute in order                                │
 │ 2. knowledge/loader.js IIFE  → KNOWLEDGE_ALL (394) + overlays       │
 │ 3. storage-mirror.js IIFE    → if localStorage EMPTY: restore + ────┼─▶ RELOAD
 │ 4. app.js init() IIFE        → API key, keys, clinic steps,         │   (once)
 │                                 VAULT GATE, sign-offs, KB status    │
 │ 5. error-boundary IIFE       → wrap renderers (must be last)        │
 └─────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
   VAULT LOCKED                                            VAULT OFF/OPEN
   show unlock screen                                      users.length===0 ?
   (records unreadable,                                    → setup : login
    INCLUDING account list)                                       │
        │ unlock                                                  │
        └──────────────────────┬───────────────────────────────────┘
                               ▼
                          AUTHENTICATED
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
      HOME                   EXAM                  ADMIN/KB
   (role tabs)          (22 steps, autosave)     (validation, deploy)
                               │
                        SHUTDOWN: beforeunload →
                        vaultFlush() + corpusFlush()
```

**Architectural note:** there is no shutdown *sequence*, only two independent
`beforeunload` handlers. Nothing coordinates them and nothing verifies either ran.

### 1.6 State lifecycle — `V` (the current visit)

```
  CREATE          newPatient() / openChart() → V = blankVisit() (384-line literal)
     │            setVisitSeenStamp(wrapper.updated)
     ▼
  MUTATE          ~40 modules write V directly:
     │              ui-pages inputs · togSlFind · engine (V.dxList, V.alerts)
     │              clinical-scales (V.scales) · investigations · drawing
     │            NO validation · NO ownership · NO change notification
     ▼
  DERIVE          runDiagnosticEngine() reads V → writes V.dxList, V.alerts,
     │            V.nextTests, V.nudges, V.problemFoci, V.engine_provenance
     ▼
  PERSIST         doSave() → conflict check → visits[i].data = V
     │            → recStampVisit() → saveVisits() → mirror → vault → cloud
     ▼
  DISCARD         goHome() sets CP=CV=null; V is garbage collected
                  (no explicit teardown, no dirty check)
```

**This diagram is the strongest argument in the whole review for a domain model.**
A legally defensible EMR cannot answer "who changed this and why?" from this
lifecycle.

### 1.7 Request lifecycle (there are no requests — this is what replaces one)

```
  USER INPUT (inline onclick / oninput)
        │
        ▼
  HANDLER mutates V directly            ← no command, no validation, no dispatch
        │
        ▼
  runDiagnosticEngine()                 ← synchronous, ~1.5 ms
        │
        ▼
  renderAdvisory() + renderSidebar() + renderMain()   ← full re-render, innerHTML
        │
        ▼
  doSave() (debounced)                  ← read-modify-write of the whole array
        │
        ▼
  mirror → vault → cloudEnqueue         ← fire-and-forget
```

No request/response, no middleware, no interception point. **There is nowhere to
put cross-cutting concerns** — which is why validation, audit and authorization
are scattered rather than layered.

### 1.8 Clinical workflow lifecycle

```
 Patient arrives
   → REGISTRATION (demographics + duplicate check + consent capture)
   → CHIEF COMPLAINT (free text → tokens; symptom chips)
   → HISTORY (ocular · medical · family)   ─┐
   → VA · REFRACTION · DILATION             │  each step:
   → SLIT LAMP · IOP · PUPIL · MOTILITY     ├─ mutate V
   → BV · GONIOSCOPY · FUNDUS · NEURO       ├─ re-run engine
   → INVESTIGATIONS                         ├─ re-render advisory
   → DIAGNOSIS (engine differential)       ─┘
   → PLAN → CODING → REPORT → PRESCRIPTION
   → SAVE (attribution stamp; amendment trail if later/other clinician)
   → [optional] research capture, IF consent

 SAFETY OVERLAY, active at every step:
   red-flag alerts fire from measured values, un-suppressible by scoring
```

### 1.9 Synchronisation flow

```
  LOCAL WRITE ──▶ cloudEnqueue(kind) ──▶ CLOUD.dirty{}
                                            │
                              (online, signed in, configured)
                                            ▼
                          ┌── PUSH ────────────────────────┐
                          │ patients/visits → PHI-encrypt  │
                          │ (cloud-crypto, key wrapped by  │
                          │  vault) → POST /rest/v1        │
                          └────────────┬───────────────────┘
                                       │ 429 → exponential backoff
                          ┌── PULL ────▼───────────────────┐
                          │ GET since last stamp           │
                          │ per-record last-writer-wins    │
                          │ conflicts → CLOUD.conflicts[]  │
                          └────────────┬───────────────────┘
                                       ▼
                          cloudRerender() → renderHome()  ← LAYER VIOLATION
```

### 1.10 Data persistence flow

```
                          saveStore(key, data)
                                  │
                  ┌───────────────┼────────────────┐
          corrupt?│          vault on?             │
             YES  │              YES               │ NO
              ▼   │               ▼                ▼
          REFUSE  │        vaultCacheSet      mirrorStore FIRST
          (return │        (memory now,       (IndexedDB, larger quota)
           false, │         ciphertext         then localStorage.setItem
           keep   │         on flush)          → quota? storageNoteWriteFailure
           bytes) │               │                     │
                  └───────────────┴─────────────────────┘
                                  ▼
                          cloudEnqueue(key)

  READ: loadStore → vault? cache : localStorage
        → JSON.parse fail OR wrong shape → CORRUPT (quarantine + block writes)
        → absent → fallback (legitimately empty)
```

### 1.11 AI interaction flow

```
   ┌──────────────────────────────────────────────────────────┐
   │  THE FIREWALL — enforced by architecture.test.js #5      │
   │                                                          │
   │  engine.js + knowledge/  ──  ZERO LLM references         │
   └──────────────────────────────────────────────────────────┘
                              │
              engine produces V.dxList (deterministic)
                              │
        ┌─────────────────────┴──────────────────────┐
        ▼                                            ▼
  buildClinicalSummary()                      speech.js
  (age + sex only, no PII)                    (voice → text)
        │                                            │
        ▼                                            ▼
  callClaudeAPI ──▶ api.anthropic.com          parse to tokens
        │            (CSP-allowlisted)                │
        ▼                                            ▼
  3–5 sentences of INTERPRETATION            fills V fields
  rendered with "advisory only"              → re-runs engine
        │
        └──▶ NEVER writes V.dxList, never scores, never ranks
```

---

## 2. Documentation accuracy review (Step 11)

**Measured against code, not read.**

| Document | Accuracy | Evidence |
|---|---|---|
| `ARCHITECTURE.md` | **Stale — materially** | Header says "**v1.1** (72 js/knowledge files)". Actual: **v1.3.1, 92 loaded files**. Six modules absent entirely: `build-info`, `research-corpus`, `insights`, `feedback`, `kb-signoffs`, `clinical-scales`. Last touched 2026-07-31; code 2026-08-01. |
| `CLAUDE.md` | **Accurate** | Guardrails match enforced behaviour. The only doc that has never contradicted code. |
| `CHANGELOG.md` | **Accurate, unusable as reference** | 3,524 lines, newest-first, no index. Excellent forensics, poor orientation. |
| `README.md` / `START-HERE.md` / `CONTINUE_HERE.md` | **Overlapping, undated** | Three onboarding docs; unclear which is canonical. |
| `NEEDS_REVIEW.md` | **Superseded** | Predates the review-status work; the authoritative count is now in-app (394). |
| 21 `docs/*.md` reviews | **Historically accurate, not marked superseded** | e.g. `ARCHITECTURE.md` described `risk-calc.js` as "literature-based"; it was fabricated and is quarantined. Corrected only after the AI review found it. |
| `docs/CLOUD_SETUP.md`, `BACKEND_*` | **Accurate** | Match `db/migrations/` and `cloud-*.js`. |
| **ADRs** | **DO NOT EXIST** | Zero ADR files. Ten decisions were *inferred* in Phase 1; none were ever written down at the time. |

**The core documentation problem is not inaccuracy — it is that no document
declares itself authoritative or superseded.** A new engineer faces 28 markdown
files with no precedence order, several contradicting the code, and no way to
tell which. That is worse than having fewer documents.

**Missing entirely:** ADRs · module ownership map · a diagram of any kind in-repo
(all diagrams to date live in review documents, not alongside the code) · API/
contract documentation for the ~1,237 globals · data dictionary for `blankVisit()`'s
~200 fields · runbook index.

---

## 3. Recommended Architecture Decision Records (Step 11)

Twelve ADRs that should exist. The first ten retro-document decisions already
made — writing them down is how they stop being re-litigated by every new
engineer. The last two are decisions **not yet made** that are being made by
default.

| ADR | Title | Status | Why it must be written |
|---|---|---|---|
| **ADR-001** | No build step; ordered `<script>` tags | Accepted (retro) | Every new engineer will propose a bundler in week one. The reasoning (non-technical owner, `file://` operation) must pre-empt that. |
| **ADR-002** | Offline-first; the backend never gates care | Accepted (retro) | The product's moat. Must be un-erodable by any future feature. |
| **ADR-003** | Deterministic engine; LLM strictly downstream | Accepted (retro) | Regulatory posture depends on it. Now test-enforced. |
| **ADR-004** | Zero runtime dependencies | Accepted (retro) | Trades supply-chain risk for hand-written primitives — including a hand-written escaper that once caused an XSS hole. The trade must be explicit. |
| **ADR-005** | One Supabase project per clinic | Accepted (retro) | Determines liability posture. Reversing it makes the company a data processor. |
| **ADR-006** | Knowledge as data, engine as code | Accepted (retro) | Enables clinical governance separate from code review. |
| **ADR-007** | Fail closed on clinical unknowns | Accepted (retro) | The principle behind the 137-condition fix. Must be a rule, not an instinct. |
| **ADR-008** | Ratchet, never amnesty, for declared debt | Accepted (new) | Introduced by `architecture.test.js`. Needs stating so it is not deleted as "noise". |
| **ADR-009** | localStorage as primary record store | Accepted (retro) | **The one decision with a hard expiry.** ~9 MB / ~3,000 patients. Must be documented *with its expiry condition*. |
| **ADR-010** | Roles are presentation, not authorization | **Accepted by accident** | Currently undocumented and presented to users as though false. Writing it forces the choice: fix it, or say it. |
| **ADR-011** | Domain model: adopt or continue without | **NOT MADE** | Being decided by default every day. Blocks FHIR/HL7/graph/enterprise. |
| **ADR-012** | Event bus vs. direct render calls | **NOT MADE** | The absence is why infrastructure calls the UI. ~100 lines decides it. |

---

## 4. Refactoring roadmap — full 10-field format (Step 13)

Phase 1 gave this format for R-1..R-3 only. Here are R-4 through R-8 in full;
R-1..R-3 remain as published.

### R-4 · Domain event bus — CRITICAL PRIORITY, LOW RISK

- **Problem.** No notification mechanism exists, so any module needing to signal
  a change must *call* the thing it wants to update. This is the direct cause of
  the `cloud-sync.js:532 → renderHome()` layer violation and of ~40 scattered
  `renderMain()` calls after mutations.
- **Current design.** Direct invocation, guarded by `typeof X === "function"`.
- **Recommended design.** ~100-line synchronous event bus:
  `emit(name, payload)` / `on(name, fn)`. Infrastructure emits
  `records:changed`, `sync:completed`, `vault:unlocked`; the UI subscribes.
- **Benefits.** Removes upward calls; makes cross-cutting concerns (audit,
  telemetry, re-render) attachable in one place; prerequisite for R-5.
- **Risks.** Low. Synchronous dispatch keeps ordering identical to a direct call.
  Main risk is over-adoption — event soup. Mitigate by fixing the event catalogue
  in one file and requiring an ADR to extend it.
- **Migration.** Additive. Add the bus; convert one caller (`cloud-sync`) as the
  reference; convert others opportunistically. Old calls keep working throughout.
- **Backward compatibility.** Total — nothing is removed.
- **Engineering cost.** 40 h (8 h bus + tests, 32 h incremental adoption).
- **Business impact.** None directly; unblocks R-5, which unblocks parallel work.
- **Clinical impact.** None. No clinical path changes.

### R-5 · Decompose `app.js` — HIGH

- **Problem.** 1,927 lines, 241 exports, fan-in 39, fan-out 37, ≥7 reasons to
  change. It is the merge-conflict epicentre for any second engineer.
- **Current design.** One file holding global state, auth, routing, patient
  lifecycle, five role home pages, init, keyboard handling.
- **Recommended design.** Five modules — `session.js`, `router.js`,
  `patient-lifecycle.js`, `home-<role>.js` ×5, and a thin `app.js` composition
  root that only wires them.
- **Benefits.** Parallel work becomes possible; ramp time drops; each piece
  becomes testable in isolation.
- **Risks.** Medium. `CU/CP/CV/P/V` are read by ~40 modules; moving their
  declaration changes nothing at runtime but any mistake is broad. Mitigate by
  moving *functions* first and leaving globals in place until R-1.
- **Migration.** Extract one concern per PR, in order: home pages (leaf, zero
  risk) → keyboard → routing → patient lifecycle → session. Globals last.
- **Backward compatibility.** Total if globals stay declared where they are.
- **Engineering cost.** 80 h.
- **Business impact.** High — this is the change that makes hiring worthwhile.
- **Clinical impact.** None.

### R-6 · Unify the storage cluster behind one repository interface — HIGH

- **Problem.** `storage` ↔ `local-vault` ↔ `storage-mirror` ↔ `cloud-sync` are
  mutually cyclic. None can be tested, replaced or reasoned about alone.
- **Current design.** `storage.js` calls into all three; all three call back.
- **Recommended design.** A `RecordRepository` interface
  (`get/put/remove/list`) with the vault, mirror and cloud as *decorators* around
  a base localStorage implementation. Dependencies point one way.
- **Benefits.** Breaks the 4-way cycle; makes R-3 (IndexedDB) a new
  implementation rather than a rewrite; enables a true in-memory test double.
- **Risks.** **High.** This is the patient-record path. Every existing test must
  pass unchanged, and the 12 corruption/concurrency tests are the acceptance gate.
- **Migration.** Introduce the interface alongside; route one store (`settings`,
  lowest risk) through it; then `kb_signoffs`; patients/visits last.
- **Backward compatibility.** Total — on-disk format unchanged throughout.
- **Engineering cost.** 100 h.
- **Business impact.** Medium now, high later — prerequisite for enterprise scale.
- **Clinical impact.** None if serialisation is unchanged; catastrophic if not.
  **Requires the full test suite green plus a manual restore drill before merge.**

### R-7 · Split `collectTokens` into a collector registry — HIGH

- **Problem.** 574 lines; 11 sources numbered 1–9, **9b**, 11, 10 — pure
  session-by-session accretion. The single most important function in the product
  and the least reviewable.
- **Current design.** One function, appended to by every session.
- **Recommended design.** `TOKEN_COLLECTORS = [{id, collect(V, P)}]`;
  `collectTokens` reduces to iterate-and-merge.
- **Benefits.** Each collector independently testable; new sources become data;
  the ordering bug class disappears.
- **Risks.** Medium-high — clinical output must not move by one token.
- **Migration.** Extract collectors one at a time, asserting **byte-identical**
  engine output across the full golden vignette suite after each.
- **Backward compatibility.** Total — output must be provably unchanged.
- **Engineering cost.** 40 h.
- **Business impact.** Low direct; high on KB velocity.
- **Clinical impact.** **Zero tolerance.** Any diff in vignette output aborts.

### R-8 · Bounded contexts: Clinical / Educational / Research — MEDIUM

- **Problem.** One `Visit` model serves real patients, simulated teaching cases
  and de-identified research. The `practice: true` flag is the only separator, and
  it is checked in ~6 places by convention.
- **Current design.** Shared model, boolean discrimination.
- **Recommended design.** Three contexts with explicit translation at the
  boundary: `ClinicalVisit`, `TrainingCase`, `ResearchEncounter`.
- **Benefits.** Makes "training data must never pollute research data" structural
  rather than a check that could be forgotten; lets education evolve freely.
- **Risks.** Medium — touches simulation, casebook, analytics and corpus.
- **Migration.** After R-1 (needs a domain model to translate between).
- **Backward compatibility.** Requires a data migration for existing practice
  records — the only recommendation here that does.
- **Engineering cost.** 60 h (plus R-1 as prerequisite).
- **Business impact.** Enables the University edition as a separable product.
- **Clinical impact.** Positive — removes a class of contamination risk.

---

## 5. Top 100 architectural improvements, itemised

Ordered by architectural leverage. **A** = agreed cost estimate in hours.
Items marked **⚑** are prerequisites for others.

**Foundational (1–12)**
1. ⚑ Domain event bus (R-4) — 40
2. ⚑ Domain model: entities + value objects (R-1) — 250
3. ⚑ Repository interface over storage (R-6) — 100
4. Decompose `app.js` into 5 modules (R-5) — 80
5. Server-enforced authorization (R-2) — 80
6. Async record store, IndexedDB primary (R-3) — 200
7. Split `collectTokens` into collectors (R-7) — 40
8. Bounded contexts (R-8) — 60
9. Extract `session.js` from `app.js` — 16
10. Extract `router.js` from `app.js` — 12
11. Extract patient lifecycle from `app.js` — 20
12. Composition root pattern for `app.js` — 8

**Boundaries and layering (13–26)**
13. Replace `cloud-sync → renderHome()` with an event — 4
14. Move `age-classification` persistence out of `knowledge/` — 6
15. Move storage's 5 DOM references behind an event — 8
16. Formal port/adapter split for the engine — 24
17. Extract `knowledge/` as a versioned package boundary — 30
18. One-way dependency lint in CI (extend architecture tests) — 12
19. Explicit public API per module (`__exports` convention) — 40
20. Namespace globals under `Entopic.*` — 60
21. Retire `registry_queue` — 8
22. Separate read models from write models for reporting — 40
23. Anti-corruption layer for future FHIR mapping — 30
24. Device-integration seam (OCT/autorefractor) before first integration — 30
25. Split `ui-pages.js` (1,258 ln) into one file per exam step — 40
26. Split `storage.js` responsibilities (CRUD / backup / anonymisation) — 40

**State and data (27–40)**
27. Ownership rule for `V` — single writer per field — 40
28. Change notification on `V` mutation — 20
29. Validation at the boundary, not at render — 40
30. Value objects: IOP, Acuity, Refraction, Laterality — 60
31. `Visit` as an aggregate root with invariants — 50
32. Immutable visit snapshots for audit — 30
33. Data dictionary for `blankVisit()`'s ~200 fields — 20
34. Schema versioning + forward migration for visits — 40
35. Unify the three data-classification lists in code — 20
36. Mirror the audit trail — 8
37. Protect `consents` (mirror + backup) — 12
38. Protect `research_corpus` + `research_salt` — 12
39. Protect `feedback` — 6
40. Explicit retention policy per store — 16

**Clinical architecture (41–54)**
41. Calibrate engine probabilities against outcomes — 60
42. Confidence intervals / tie handling in the differential — 16
43. Evidence grading surfaced per condition — 30
44. Separate "engine suggestion" from "clinician diagnosis" in the model — 40
45. Structured `Diagnosis` entity distinct from `Differential` — 30
46. Clinical rule versioning independent of KB version — 24
47. Red-flag rules as data, not code — 40
48. Formal verification harness for red-flag paths — 60
49. Deterministic replay: re-run any historical visit against any KB version — 40
50. Clinical safety case document structure — 30
51. Per-condition provenance chain (source → author → reviewer) — 30
52. KB peer-review workflow (two-clinician sign-off) — 40
53. Separate ICD mapping from clinical content — 20
54. Contraindication/interaction model as first-class — 40

**Persistence and scale (55–66)**
55. Pagination / virtualisation for large patient lists — 24
56. Archival tier for practices past 3,000 patients — 40
57. Blob storage abstraction (files vs records) — 20
58. Incremental sync instead of full-array read-modify-write — 40
59. Conflict resolution UI — 25
60. Multi-device sign-off sync — 20
61. Compression for the research corpus — 16
62. Streaming export for large datasets — 20
63. Index structures for patient search — 20
64. Background flush via `requestIdleCallback` — 12
65. Storage quota forecasting — 12
66. Per-store size telemetry — 10

**Observability and operations (67–78)**
67. Immutable versioned release paths — 25
68. Automated release + rollback job — 20
69. Browser stage in CI — 20
70. Authenticated synthetic health check — 10
71. Opt-in de-identified health beacon — 30
72. Structured client-side logging (levels, not `console.error`) — 16
73. Performance budget assertions in CI — 12
74. Error-rate telemetry per build — 20
75. Scheduled restore drill — 10
76. Status page — 10
77. Diagnostics bundle export for support — 15
78. Feature flags for staged rollout — 20

**Security (79–86)**
79. SSO/OIDC seam for hospital deployment — 60
80. Server-side audit log, append-only — 40
81. Session management across devices — 25
82. Key rotation procedure for the vault — 24
83. Signed KB bundles (tamper evidence) — 30
84. CSP tightening: remove `unsafe-inline` (needs handler rewrite) — 80
85. Rate limiting on auth at the backend — 12
86. Penetration test remediation budget — 40

**Developer experience (87–94)**
87. JSDoc type annotations on public APIs — 60
88. Module ownership map — 8
89. In-repo architecture diagrams (not only in reviews) — 16
90. Precedence order + supersede markers for the 28 docs — 12
91. ADR directory + the 12 ADRs above — 20
92. Onboarding path: one canonical START doc — 8
93. Local dev server script — 4
94. Formatter + linter with the existing style codified — 16

**Long horizon (95–100)**
95. FHIR resource mapping layer — 300
96. HL7 v2 interface — 150
97. Graph store for the token↔condition network — 150
98. Multi-tenant managed backend — 150
99. Plugin architecture for clinic-specific modules — 100
100. IEC 62304 / ISO 13485 process alignment — 300+

**Totals.** Items 1–12: ~900 h. Items 1–54 (through clinical architecture):
~2,300 h. All 100: ~4,900 h ≈ 2.5 engineer-years.

**If you only do five: 1, 4, 5, 36–39 (the unprotected stores), and 13.**
That is ~150 hours and it removes the event-coupling, the god module, the
authorization gap, and the four unprotected data stores.

---

## 6. What this addendum did not change

No production code. `git status` shows two added documents and no modified
source. 644 tests passing, audit 0 FAIL — unchanged from the Phase 1 commit.
