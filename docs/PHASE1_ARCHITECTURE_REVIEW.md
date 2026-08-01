# Entopic — Phase 1: Architecture Review for the Next Decade

**Prepared by:** Chief Software Architect
**Date:** 2026-08-01 · **Build:** 1.3.1 / KB 1.3.0
**Question asked:** can this architecture carry Entopic for ten years across EMR,
CDSS, education, research, multi-clinic SaaS and enterprise healthcare?

**Answer: yes for the core, no for the shell — and the distinction is precise
enough to act on.** The clinical core (engine + knowledge base) is one of the
better-designed pieces of clinical software I have reviewed and should be
preserved almost unchanged for a decade. Everything wrapping it is a
single-namespace script monolith that will not survive its second engineer.

**Implemented this phase:** one thing only — `tests/architecture.test.js`, which
makes the architecture's invariants executable. No behaviour changed, no clinical
logic touched, no production file modified (`git status` shows one added test
file). Everything else is a recommendation.

---

## 1. The architecture as it actually is

### Layer diagram (inferred from implementation, not documentation)

```
┌───────────────────────────────────────────────────────────────┐
│ L5  ORCHESTRATION      app.js (1,927 ln, 241 exports)         │  ← god layer
│                        global state: CU, CP, CV, P, V         │
├───────────────────────────────────────────────────────────────┤
│ L4  PRESENTATION       ~50 modules: ui-pages, advisory,       │
│                        flowmap, report, chart, quiz, sim      │
├───────────────────────────────────────────────────────────────┤
│ L3  DOMAIN             engine.js · clinical-record · consent  │
│                        research-corpus · insights · roles     │
├───────────────────────────────────────────────────────────────┤
│ L2  INFRASTRUCTURE     storage · local-vault · storage-mirror │
│                        cloud-sync · file-store · browser-io   │
├───────────────────────────────────────────────────────────────┤
│ L1  KNOWLEDGE          394 conditions · registry · loader     │
├───────────────────────────────────────────────────────────────┤
│ L0  PRIMITIVES         dom-escape · build-info                │
└───────────────────────────────────────────────────────────────┘

Intended flow:   L5 → L4 → L3 → L2 → L1 → L0
Actual flow:     every arrow above, PLUS 52 upward/lateral edges
                 mediated by `typeof X === "function"` guards
```

### The one boundary that is real and load-bearing

```
       ┌──────────────────────────────────────────┐
       │   THE CLINICAL CORE                      │
       │   knowledge/*.js  +  js/engine.js        │
       │                                          │
       │   ZERO references to:                    │
       │     localStorage · indexedDB · fetch     │
       │     XMLHttpRequest · document · window   │
       │     navigator · any LLM                  │
       │                                          │
       │   Verified, not asserted:                │
       │   tools/lib/load-engine.js loads this    │
       │   with NO I/O module and the golden      │
       │   vignettes pass.                        │
       └──────────────────────────────────────────┘
```

**This is the single most valuable architectural fact in the repository.** The
offline-first guarantee is not a promise in a document — it is structurally
impossible to violate without adding an import that does not currently exist.
Most "offline-first" systems I have reviewed cannot make that claim.

It is now enforced by test (`architecture.test.js` #4, #5).

---

## 2. Architectural style: what it is, and what it should be

**What it is: a hybrid, and not a deliberate one.**

| Style | Present? | Where |
|---|---|---|
| **Layered** | Partially | Load order approximates layers; 52 cycles violate them |
| **Modular monolith** | Aspirationally | Modules exist; module *boundaries* do not — 1,237 shared globals |
| **Feature-first** | Yes, by filename | `ui-quiz`, `simulation-*`, `investigations-*` cluster by feature |
| **Component-first** | No | No component model; renderers are string builders |
| **MVC** | Vestigial | `data-model.js` / `ui-*.js` / `app.js` roughly map to M/V/C, unenforced |
| **Hexagonal** | **In the core only** | The engine is a genuine hexagon: pure domain, no adapters inside |
| **Clean / DDD** | No | Anemic model; no aggregates, repositories, or domain events |
| **Microservices** | No, correctly | Would be architectural malpractice for an offline-first client |

**Drift diagnosis:** the codebase began as a layered script monolith and grew
feature-first. Neither discipline was enforced, so it became **a modular monolith
with no module system** — the specific hybrid that looks organised (71 named
files, clear prefixes) while behaving as one 29,000-line unit.

### Recommended target architecture

**A modular monolith with enforced boundaries — not microservices, not a
framework rewrite.** Concretely, four rings:

```
   ┌─ ring 3: ADAPTERS ────────────────────────────────┐
   │  browser DOM · localStorage · IndexedDB · Supabase │
   │  ┌─ ring 2: APPLICATION ───────────────────────┐   │
   │  │  workflows: conduct exam, sign off KB,      │   │
   │  │  sync clinic, capture research              │   │
   │  │  ┌─ ring 1: DOMAIN ─────────────────────┐   │   │
   │  │  │  Patient · Visit · Finding · Consent  │   │   │
   │  │  │  Differential · SignOff · Encounter   │   │   │
   │  │  │  ┌─ ring 0: CLINICAL CORE ────────┐   │   │   │
   │  │  │  │  engine + knowledge (PURE)     │   │   │   │
   │  │  │  └────────────────────────────────┘   │   │   │
   │  │  └───────────────────────────────────────┘   │   │
   │  └─────────────────────────────────────────────┘   │
   └────────────────────────────────────────────────────┘
              dependencies point INWARD only
```

Ring 0 already exists and is correct. Ring 3 mostly exists. **Rings 1 and 2 do
not exist at all** — that is the architectural gap, and it is why `app.js` is
1,927 lines: it *is* rings 1 and 2, undifferentiated.

---

## 3. Boundary violations (measured)

| Boundary | Verdict | Evidence |
|---|---|---|
| Knowledge ⊥ Engine | **Clean** | Engine reads KB via `findCondition`; KB knows nothing of the engine |
| Engine ⊥ everything else | **Clean** | 0 I/O references. The best boundary in the system. |
| Storage ⊥ UI | **Violated** | `storage.js` contains 5 DOM/render references (banners) |
| Infrastructure ⊥ UI | **Violated (1)** | `cloud-sync.js:532` calls `renderHome()` |
| Knowledge ⊥ Application | **Violated (1)** | `age-classification.js` reads/writes `localStorage` |
| Storage ⊥ Vault ⊥ Mirror ⊥ Cloud | **Fully entangled** | Mutually cyclic; none extractable alone |
| Domain ⊥ Presentation | **Absent** | No domain layer exists to separate |
| Auth ⊥ everything | **Absent as a boundary** | `isAdmin()` is `CU.admin === true`, client-side |

The two single-instance violations are now **grandfathered with reasons** in
`architecture.test.js`; any *new* one fails the build. That is a ratchet, not an
amnesty — the excuse list can only shrink, enforced by its own test.

---

## 4. Coupling, ranked

| # | Coupling problem | Measure | Severity |
|---|---|---|---|
| **C-1** | Single global namespace | **1,237 exported names** | **Critical** |
| **C-2** | Ambient mutable state `CU/CP/CV/P/V` | mutated from ~40 files | **Critical** |
| **C-3** | Circular module dependencies | **52 two-node cycles** | **Critical** |
| **C-4** | `app.js` god module | fan-in 39, fan-out 37, 241 exports | **High** |
| **C-5** | Storage cluster entanglement | 4 modules, mutually cyclic | **High** |
| **C-6** | Guard-mediated hidden dependencies | ~450 `typeof` guards over 186 names | **High** |
| **C-7** | Load-order coupling | 92 ordered tags; order *is* resolution | **High** |
| **C-8** | Data classification in 3 places | 3 lists, drifted (§6 Phase 0) | **Medium** — now test-locked |
| **C-9** | Storage → UI | 5 render/DOM refs in `storage.js` | **Medium** |
| **C-10** | Knowledge → localStorage | 1 file | **Low** — now ratcheted |

**C-2 deserves elaboration.** `V` (the current visit) is a mutable global read
and written by roughly forty modules with no ownership, no change notification
and no validation. Every renderer reads it; every input handler mutates it; the
engine consumes it; storage serialises it. **There is no point at which one can
ask "who changed `V` and why?"** For an EMR that must be legally defensible, this
is the deepest architectural problem in the system — deeper than the cycles,
because the cycles are visible and this is not.

---

## 5. Cohesion violations, ranked

| Module | Lines | Reasons to change | Verdict |
|---|---|---|---|
| `app.js` | 1,927 | auth · routing · global state · home pages for 5 roles · init · keyboard · patient lifecycle | **God module.** ≥7 reasons. |
| `engine.js` | 2,046 | token collection · scoring · alerts · nudges · next-tests · provenance | **Justified pipeline**, but `collectTokens` (574 ln) is itself a god function |
| `storage.js` | 1,163 | CRUD · vault bridge · corruption · backup/restore · audit · anonymisation · banners | **Mixed.** ≥5 reasons. |
| `data-model.js` | 1,275 | schema · vocabularies · step definitions · VA tables | **Mixed**, but low churn |
| `ui-pages.js` | 1,258 | 12 unrelated exam pages | **Feature envy** — each page reaches into `V` deeply |
| `reasoning-views.js` | 895 | state building · note generation · rendering | **Mixed** |

The complexity budget test now grandfathers each of these **with its current line
count as the cap** — they cannot grow, which stops compounding without demanding
a risky refactor today.

---

## 6. Domain-Driven Design assessment

**Entopic has a rich domain and no domain model.** This is the largest gap
between what the product *is* and what the code *expresses*.

| DDD concept | Present? | Reality |
|---|---|---|
| **Entities** | ❌ | `Patient` and `Visit` are plain object literals from `blankPatient()` / `blankVisit()`. No identity logic, no invariants, no behaviour. |
| **Value Objects** | ❌ | IOP, visual acuity, refraction, laterality are raw strings/numbers. **Primitive obsession throughout.** `V.iop.od = "46"` — a string, unvalidated, unitless. |
| **Aggregates** | ❌ | No aggregate root. `Visit` should be one — it has clear boundaries and invariants — but nothing enforces them. |
| **Repositories** | ⚠️ Partial | `loadPatients()` / `savePatients()` are repository-shaped but leak storage semantics upward. |
| **Domain Services** | ⚠️ Partial | The engine is a genuine domain service. `clinical-record.js` and `consent.js` are close. |
| **Factories** | ⚠️ | `blankVisit()` is a factory that returns an unvalidated 384-line literal. |
| **Bounded Contexts** | ❌ | Clinical, Educational and Research share one model with no translation layer. |
| **Domain Events** | ❌ | **None.** This is why `cloud-sync` calls `renderHome()` directly — with no event bus, the only way to notify is to call. |
| **Ubiquitous Language** | ⚠️ | Strong in the KB (`req/sup/con/exclusions`), inconsistent in code (`dxList` entries use `n`/`prob`, not `name`/`score` — a naming trap that has caused real bugs). |

**The missing domain events are the root cause of several other problems.** Add
one small event bus and C-9, the `cloud-sync → renderHome` violation, and much of
`app.js`'s orchestration burden all become solvable. It is the highest
leverage-to-risk change available.

---

## 7. Patterns and anti-patterns

**Correctly used:** pipeline (engine), data-driven rules (KB, clinical-scales),
overlay (KB layers), write-through cache (vault/corpus/consent), circuit breaker
(`STORE_CORRUPT`), decorator (error boundary), ratchet (new: architecture tests).

**Anti-patterns present, with evidence:**

| Anti-pattern | Evidence | Severity |
|---|---|---|
| **Anemic Domain Model** | Patient/Visit are data bags; all behaviour in free functions | **High** |
| **God Object** | `app.js` (241 exports) | **High** |
| **Primitive Obsession** | IOP/VA/laterality as raw strings | **High** |
| **Shotgun Surgery** | Adding a visit field touches `data-model`, `ui-pages`, `engine`, `storage`, `research-corpus`, tests | **High** |
| **Temporal Coupling** | 92-tag load order; startup can `location.reload()` mid-sequence | **High** |
| **Feature Envy** | Every `pg*()` reaches deep into `V` | **Medium** |
| **Big Ball of Mud** | *Localised* — the storage cluster, not the whole system | **Medium** |
| **AI-generated repetition** | ~450 defensive guards over 186 names | **Medium** |
| **Magic values** | `SCORE_WEIGHTS` uncalibrated; `0.6833` shown as "68%" | **Medium** |
| **Premature abstraction** | Rare. Notable *absence* — a genuine strength. | — |
| **Over-engineering** | Rare. The codebase is right-sized for its stage. | — |

Two of these are worth flagging as *positive* findings: there is almost no
speculative abstraction and almost no over-engineering. That is unusual and it
means the debt here is **structural**, not **decorative** — harder to fix but far
more worth fixing.

---

## 8. Scalability: can the architecture reach 100,000 users?

**Yes — for a reason that is unusual and worth stating plainly.** In a
client-side, offline-first architecture, "users" do not consume shared compute.
100,000 clinics is 100,000 independent instances plus a CDN. There is no
application server to saturate.

The bottlenecks are therefore **not where a SaaS architect would look**:

| Scale | Real bottleneck | Architectural? |
|---|---|---|
| 100 | Human support capacity | ❌ Organisational |
| 1,000 | Version fragmentation — no way to know what anyone runs | ⚠️ Partly (fixed: `build-info.js`) |
| 10,000 | **Per-device localStorage ceiling (~9 MB, ~3,000 patients)** | ✅ **Yes — the one hard architectural limit** |
| 100,000 | Per-clinic Supabase project provisioning; KB update distribution | ✅ Yes |

**The synchronous localStorage record store is the single architectural
bottleneck that requires redesign rather than tuning.** IndexedDB already exists
as a mirror; promoting it to the primary store means making the hot read path
async, which touches every module that calls `loadStore()` — currently 34. That
is the largest justified refactor in the system, and it is unavoidable before
enterprise deployment.

Everything else scales: engine 1.5 ms/394 conditions, CDN unbounded, Postgres
untroubled, rendering string-based and fast.

---

## 9. Extensibility: nine futures, honestly costed

| Extension | Supported? | Effort | Blocker |
|---|---|---|---|
| **Clinical AI (downstream)** | ✅ Yes | 40–80 h | None — the firewall is already correct |
| **Voice dictation** | ✅ Yes | 80 h | `speech.js` exists; needs de-identification |
| **Research engine** | ✅ Yes | Done | Already built this cycle |
| **University edition** | ✅ Yes | 60 h | Roles exist; needs tenancy |
| **OCT / autorefractor** | ⚠️ Awkward | 120–200 h ea. | **No device-integration seam.** Would land in `investigations.js` by default — wrong place. |
| **FHIR / HL7** | ❌ **Hard** | **250–400 h** | **No domain model to map from.** FHIR requires typed resources; Entopic has object literals. This is where the anemic model bites hardest. |
| **Graph database** | ⚠️ Partial | 150 h | The KB is *already* a graph (tokens↔conditions) but stored as arrays. A graph backend needs the domain model first. |
| **Hospital deployment** | ❌ Blocked | 400 h+ | Client-side auth; no SSO seam; no audit export |
| **Enterprise multi-clinic** | ❌ Blocked | 300 h+ | Authorization is not a boundary |

**The pattern is unmistakable: everything blocked is blocked by the same two
gaps — no domain model, and no authorization boundary.** Fix those two and seven
of nine futures open up. That is an unusually clean architectural diagnosis.

---

## 10. Maintainability over time

| Horizon | Assessment |
|---|---|
| **Today, 1 engineer** | **Good.** Strong tests, dense rationale comments, consistent idiom. |
| **New engineer, month 1** | **Poor.** 1,237 globals, no module map, order-dependent loading, must read `app.js` (1,927 ln) to do anything. Estimated ramp: **3–4 weeks** vs. 1 week for a comparable modular codebase. |
| **5 years, 3–5 engineers** | **Bad without intervention.** With no module boundaries, parallel work collides in `app.js` and `ui-pages.js`. Merge conflicts become the dominant cost. |
| **1M lines** | **Not reachable.** The global namespace fails long before that — name collisions become probabilistic around a few thousand globals. |

**Would debt compound rapidly?** Yes, and the mechanism is specific: **every new
feature currently adds globals, adds guards, and adds a line to `app.js`.** The
marginal cost of feature *n* rises with *n*. That is the definition of compounding
debt, and the architecture tests added this phase are the first thing in the
repository that resists it.

---

## 11. The Engineering Constitution

*Mandatory for all future development. Amendable only by written ADR.*

**Article I — Clinical safety outranks every other consideration.**
Red-flag alerts fire from measured values and are never gated by scoring,
exclusion, probability or configuration. No exception, no flag, no setting.

**Article II — The clinical core stays pure.**
`js/engine.js` and `knowledge/` perform no I/O: no storage, no network, no DOM,
no LLM. Diagnosis must remain runnable, deterministic and reproducible with
nothing but its inputs. *Enforced by `architecture.test.js`.*

**Article III — The LLM is downstream, always.**
AI may interpret, transcribe or draft. It may never diagnose, score, rank, or
generate a differential. The reasoning stays inspectable.

**Article IV — Unknown means unreviewed. Fail closed.**
Clinical content without a review status is unreviewed. A store that cannot be
read is not empty. A measurement that was not taken is not normal. Never let
absence of evidence render as evidence of absence.

**Article V — Never fabricate clinical content.**
No invented citation, code, threshold, statistic or guideline claim. Every
clinical number must be traceable to a named source, in-repo. *Enforced by
`clinical-scales.test.js` and `unverified-clinical-content.test.js`.*

**Article VI — Offline is the product, not a mode.**
No feature on the clinical path may require a network. The backend syncs, backs
up, authenticates and audits — it never gates care.

**Article VII — Dependencies point inward.**
UI → application → domain → clinical core. Infrastructure never calls the UI;
`knowledge/` never calls the application. Notify by event, not by reaching up.
*Enforced, with existing violations ratcheted.*

**Article VIII — Data is classified once.**
Every store has exactly one declaration of what it is and how it must be
protected. Any divergence between declaration and code is written down with a
reason, and the list of divergences may only shrink. *Enforced.*

**Article IX — A failure that is not visible is a defect.**
Silent failure is prohibited on any path that persists, transmits or displays
clinical data. Report it, or explain in one sentence why losing it is acceptable.

**Article X — The safety net is built from injected failures.**
A test that only exercises the happy path proves nothing about a clinical system.
Every protective mechanism must be verified by causing the failure it guards
against, and verified to go red without the fix.

**Article XI — One file, one reason to change.**
New modules stay under 800 lines. Existing offenders are capped at their current
size and may not grow. *Enforced.*

**Article XII — The version is part of the product.**
Any change to shipped code changes the version. A build that cannot say what it
is cannot be supported. *Enforced by CI.*

**Article XIII — Write down why, not what.**
Comments record decisions, incidents and rejected alternatives. A comment
asserting a safety property must be verified or deleted — a false reassurance is
worse than silence.

**Article XIV — Ratchet, never amnesty.**
Known debt is declared, dated and reasoned. New instances of declared debt fail
the build. Excuse lists may only shrink.

**Article XV — The founder is the clinical authority.**
Clinical correctness, product direction and spend are his decisions. Engineering
presents options and a recommendation; it does not decide.

---

## 12. Refactoring roadmap (recommendations only — nothing performed)

### CRITICAL

**R-1 · Introduce a domain model.**
*Problem:* anemic model blocks FHIR, graph, typed validation, and any real
invariant. *Current:* `blankVisit()` returns a 384-line unvalidated literal.
*Recommended:* `Visit` as an aggregate root with typed value objects (IOP,
Acuity, Laterality, Refraction) and enforced invariants. *Migration:* wrap, do
not replace — construct from the existing literal, keep serialisation identical,
adopt module by module. *Backward compatible:* yes, if serialisation is
unchanged. *Cost:* 200–300 h. *Business:* unblocks FHIR/HL7/graph/enterprise.
*Clinical:* enables validation at the boundary instead of at render time.

**R-2 · Make authorization a boundary.**
*Problem:* `CU.admin = true` grants everything. *Recommended:* server-enforced
via existing RLS; client roles become presentation only, and say so. *Migration:*
additive — server checks first, client hints second. *Cost:* 60–100 h.
*Business:* unblocks every multi-user sale.

**R-3 · Promote IndexedDB to primary store.**
*Problem:* ~9 MB / ~3,000-patient hard ceiling. *Recommended:* async record
store; localStorage becomes a small-key store only. *Migration:* introduce an
async repository interface, migrate the 34 `loadStore()` call sites in waves.
*Risk:* **high** — this is the patient-record path. *Cost:* 150–250 h.

### HIGH

**R-4 · Add a domain event bus (~100 lines).** Removes the `cloud-sync →
renderHome` violation, decouples ~40 render-after-mutate call sites, and is the
prerequisite for R-5. *Cost:* 40 h. **Highest leverage-to-risk ratio in this
document.**

**R-5 · Decompose `app.js`.** Extract session, routing, patient lifecycle and
per-role home pages into four modules; leave a thin composition root. *Cost:*
80 h. *Do after R-4.*

**R-6 · Unify the storage cluster behind one repository interface.** Breaks the
four-way cycle. *Cost:* 100 h. *Do with R-3.*

**R-7 · Split `collectTokens` into a collector registry.** 574 lines, sources
numbered 1–9, 9b, 11, 10. Output must be byte-identical against the golden
vignettes. *Cost:* 40 h.

### MEDIUM

**R-8** Bounded contexts: separate Clinical / Educational / Research models
(60 h) · **R-9** Device-integration seam for OCT/autorefractor before the first
one is built (30 h) · **R-10** Retire `registry_queue` (8 h) · **R-11** Converge
the three export conventions, new code only (0 h ongoing) · **R-12** Introduce a
build step **only when engineer #2 arrives** (40 h).

### LOW

**R-13** Tied-probability presentation · **R-14** Mark superseded docs ·
**R-15** Consolidate the four KB overlay layers · **R-16** Type annotations via
JSDoc before considering TypeScript.

---

## 13. Architecture Scorecard

| Dimension | Score | Justification |
|---|:--:|---|
| **Architecture** | **6/10** | Coherent, defensible core decisions; no enforced boundaries around them |
| **Modularity** | **3/10** | 71 files, 0 modules. 1,237 globals in one namespace. |
| **Boundaries** | **4/10** | One excellent boundary (engine); most others absent or violated |
| **Coupling** | **3/10** | 52 cycles, ambient global state, 450 hidden guard dependencies |
| **Cohesion** | **5/10** | Most files single-purpose; the four biggest are not |
| **Scalability** | **6/10** | Excellent everywhere except the one hard localStorage ceiling |
| **Extensibility** | **4/10** | 7 of 9 futures blocked by the same two gaps |
| **Reliability** | **8/10** | Best dimension. Failure paths engineered from injected failures. |
| **Developer experience** | **5/10** | Zero-install tests are excellent; 3–4 week ramp is not |
| **Maintainability** | **4/10** | Good locally, poor globally; debt compounds with each feature |
| **Future AI readiness** | **8/10** | The downstream-only firewall is exactly right and already enforced |
| **Future graph readiness** | **4/10** | The KB *is* a graph; nothing models it as one |
| **Healthcare readiness** | **4/10** | Safety instincts excellent; no FHIR, no domain model, no auth boundary |
| **Enterprise readiness** | **3/10** | No SSO seam, no server authz, no audit export, no tenancy |
| **Commercial SaaS readiness** | **3/10** | Blocked on authorization and clinical validation |
| **Offline-first readiness** | **9/10** | **Structurally guaranteed and now test-enforced.** Best in class. |
| **Weighted overall** | **5.0/10** | A superb clinical core inside a shell that will not scale to a team |

---

## 14. Final CTO answers

**Would I approve this architecture?** **For the current stage, yes. For the
ten-year mission, no — and it does not need to be rejected, it needs rings 1
and 2 built.** The core is right. The shell is a prototype that succeeded.

**Would I redesign it?** **No.** A rewrite would destroy the two things that are
genuinely hard and genuinely done: the pure clinical core and the offline
guarantee. Everything wrong here is addable, not replaceable.

**Would I rewrite any subsystem before launch?** **Before *this* launch (one
clinic): none.** Before a paid multi-clinic launch: **authorization only** (R-2).
Before enterprise: **the record store** (R-3).

**If given six months, what would I build?** Not a new architecture — the missing
half of this one:
- Month 1: domain event bus (R-4) + `app.js` decomposition (R-5)
- Months 2–3: domain model, wrapping not replacing (R-1)
- Month 4: authorization boundary (R-2)
- Months 5–6: async repository + IndexedDB primary (R-3, R-6)

That sequence never breaks the app, never touches clinical logic, and ends with
FHIR, graph, enterprise and hospital deployment all unblocked.

**What would Epic / Oracle Health / Google Health / Microsoft admire?**
1. **A structurally pure clinical core** — verifiable, not claimed.
2. **A genuine offline guarantee** — most "offline-capable" EMRs cannot survive a
   week without a server. This one can.
3. **Zero runtime dependencies** — no supply chain to audit.
4. **Deterministic, inspectable reasoning with an enforced AI firewall** — the
   exact posture regulators are converging on.
5. **Failure engineering** — corruption quarantine and concurrent-write
   preservation are better than in most funded health-tech products.
6. **Provenance stamping** on every diagnostic run.

**What would concern them, immediately and loudly?**
1. **Client-side authorization.** A five-minute finding in any diligence.
2. **No domain model** — the FHIR conversation ends in the first meeting.
3. **1,237 globals, 52 cycles** — "how many engineers can work here at once?"
4. **0 of 394 conditions clinically verified** — the one that ends the meeting.
5. **Single contributor, no independent review** — a governance finding, not a
   code finding.
6. **~9 MB per-device ceiling** — incompatible with hospital-scale records.

---

## 15. What was implemented this phase

`tests/architecture.test.js` — 11 contracts, all passing, **zero production
files changed**:

| # | Contract | Why it matters for ten years |
|---|---|---|
| 1–3 | Data classification declared once; divergences named; excuse list can only shrink | Three drifted lists become one source of truth |
| 4 | Engine performs no I/O | The offline guarantee stops being a promise |
| 5 | No LLM in engine or KB | The safety firewall becomes structural |
| 6–8 | Layer direction, with existing violations ratcheted | Decay stops without a risky refactor |
| 9–10 | Load order is a contract; no duplicate loads | The implicit becomes explicit |
| 11 | Complexity budget, offenders capped at current size | Cohesion cannot get worse |

This satisfies the implementation rule exactly: no behaviour change, no clinical
change, no breaking change, low risk, high long-term benefit. **644 tests
passing, audit 0 FAIL.**

---

## 16. Phase 1 exit

| Criterion | Status |
|---|---|
| Architecture challenged, not described | ✅ 52 cycles, 1,237 globals, anemic model, missing rings 1–2 |
| Every subsystem evaluated | ✅ §3–§5, §9 |
| Every weakness documented | ✅ §4, §5, §7, §13 |
| Engineering Constitution written | ✅ §11, fifteen articles, five already enforced by test |
| Successor can maintain from this report | ✅ §12 roadmap + §11 constitution + executable contracts |

**The sentence that matters:** *Entopic's clinical core is worth preserving for
ten years unchanged; its shell is worth investing six months to complete — and
the two must not be confused, because every instinct to "clean up the codebase"
will otherwise be aimed at the one part that is already right.*
