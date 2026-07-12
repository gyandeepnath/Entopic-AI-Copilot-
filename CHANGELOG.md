# Changelog — Entopic

All notable changes are recorded here, newest first. Each entry says **what**
changed, **why**, and any **divergence** from `ARCHITECTURE.md` (which is a
strong hypothesis, not a contract — the code is the source of truth).

---

## 2026-07-12 — Session 3 (increment P): Full-build critical audit — 4 real bugs found and fixed

A deliberate verification pass over every module (engine, KB loader, storage,
mirror, cloud sync, UI renderers, LLM wrapper) plus an end-to-end headless-
browser audit of the whole app. Four genuine defects found; all fixed, all
pinned by new tests.

**1. Flow map crash (stack overflow) — `js/engine.js`**
The scale optimization (increment K) left a broken fallback in
`scoreCondition`/`generateEvidence`: when called *without* a shared token Set,
the membership helper recursed into itself infinitely. The glass-box flow
map's exclusion layer calls exactly that shape — opening it crashed with a
RangeError. Fallback now does the intended linear scan. New test
(`tests/engine-noset.test.js`) pins both call shapes to identical results
across the whole KB.

**2. Flow map could misreport urgent conditions as excluded — `js/ui-flowmap.js`**
The exclusion layer re-runs scoring for display but dropped the `urgent` flag,
so the engine's "urgent conditions are never suppressed" protection didn't
apply to the *display* — the map could show an urgent condition struck
through as excluded when the engine actually kept it. The re-run now carries
`urgent`, matching the real pass. (Display-only; the actual differential and
alerts were never affected.)

**3. Multi-device data-loss race in cloud sync — `js/cloud-sync.js` + `js/storage.js` + `js/app.js`**
`cloudDrain` stamped **every** patient with "now" on **every** push, so any
save on device A made all A's records look newest; device B's LWW merge would
then overwrite B's own not-yet-pushed edits with stale data — silent data
loss. Now: patients/visits carry a per-record `updated` stamp (set at
creation and, in `doSave`, only when the record actually changed), and drain
pushes each record's own stamp — never "now". Stampless legacy records push
the epoch so they can never claim to be newest. Pinned by new drain and
doSave stamping tests (`tests/cloud-sync.test.js`, `tests/storage-stamp.test.js`).

**4. Stale clinical exclusion rules after runtime KB growth — `knowledge/loader.js`**
`KB_EXCLUSION_MAP` (used by the engine's exclusion stage), `KB_ROUTES`, and
`KB_TOKEN_STATS` were built once at load and NOT refreshed by
`rebuildKbIndexes()` — a cloud-loaded/grown KB would run with outdated
exclusion rules. All derived registries now rebuild together. (The first
attempt exposed a var-hoisting wipe — initializers running after the build
erased it — so the initial build call now lives at the end of the file, with
a comment explaining why. Verified: growth + rebuild refreshes everything.)

**Also in this pass**
- `js/claude.js` — the interpretive-remarks prompt sent the **patient's full
  name** to the LLM API, violating the PII guardrail. The summary is now
  de-identified (age + sex only). Pinned by `tests/llm-privacy.test.js`.
- `index.html` — removed the prefilled default password ("12345") from the
  account-setup form.

**Verified:** 89/89 unit tests pass. End-to-end headless-Chromium audit of the
real app: boots with zero console errors; signup → login → new patient →
urgent presentation (flashes+floaters+sudden vision loss, IOP 45) → all three
red-flag alerts fire, differential ranks Retinal Tear (urgent) first; flow map
+ exclusion layer render without crashing; XSS payload stays inert;
persistence round-trips across reload with the new per-record stamps. Supabase
security advisors: clean (0 findings).

**Known limitations documented (not silently fixed):** LWW compares timestamp
strings lexically (server `+00:00` vs local `Z` formats can misorder within
the same millisecond — negligible in practice); the server upsert itself is
last-push-wins (client-side LWW mitigates; a server-side guard is future
work); the Realtime socket doesn't refresh its JWT mid-connection (after
token expiry the 12 s polling fallback covers liveness). Local app login
remains a device-local convenience gate (plaintext in localStorage) — see
NEEDS_REVIEW.

---

## 2026-07-11 — Session 3 (increment O): Update Claude API model to current release

**What**

- `js/claude.js` — the interpretive-remarks call now uses the current Sonnet
  model (`claude-sonnet-5`) instead of `claude-sonnet-4-20250514`, which is a
  deprecated/dated identifier and would eventually stop being served.

**Why**

The Claude API path is downstream-only (interpretive remarks + speech parsing;
never diagnosis — that stays deterministic in the engine offline), and it is
optional and spend-sensitive for the founder. A like-for-like move to the
current Sonnet line keeps that lightweight, low-cost behaviour while removing a
stale, soon-to-break model string. No request shape, headers, or firewall
around the LLM changed — the engine still runs fully without the API.

**Verified:** No behavioural change to test — the request body only swaps the
model string; the existing suite still passes (no code path depends on the
model ID). The offline diagnostic path is untouched.

---

## 2026-07-05 — Session 3 (increment N): Fix stored-XSS in free-text fields

**What**

- `js/app.js` — `esc()` now fully HTML-escapes (`&`, `<`, `>`, `"`) instead of
  escaping quotes only. It is used at 115 render sites, including **16 clinical
  free-text `<textarea>` bodies** (chief complaint, history, medications,
  allergies, every "notes" field, the plan). A quotes-only escape let input
  like `</textarea><img src=x onerror=…>` break out of the textarea and execute
  — a stored-XSS hole.
- `tests/escaping.test.js` (5 tests) pins full-escaping, correct `&`-first
  ordering, and null/number handling.

**Why**

Real vulnerability, and its blast radius just grew: with cloud sync, another
clinician's free text (or a pasted patient complaint) now renders on your
screen, so unescaped markup is executable stored XSS across a clinic. Full
escaping is safe in both attribute and element-body contexts (these are always
raw user strings), so upgrading the one helper closes every site at once.

**Verified:** 83/83 unit tests pass. Headless-Chromium test: a malicious chief
complaint / medication / plan payload is entity-encoded in the rendered
textareas — the injected `onerror`/`<script>` handlers do **not** fire and no
`</textarea>` breakout survives.

---

## 2026-07-05 — Session 3 (increment M): Backend security hardening (RLS helpers, advisor clean)

**What**

- Moved the three `SECURITY DEFINER` RLS helper functions
  (`is_clinic_member`, `is_clinic_admin`, `clinic_member_count`) out of the
  API-exposed `public` schema into a `private` schema, so PostgREST no longer
  exposes them as `/rest/v1/rpc/*` endpoints. Granted `EXECUTE` back to
  `authenticated` (RLS policy evaluation requires it) and `USAGE` on the
  `private` schema; revoked from `anon`/`public`.
- Verified RLS still enforces correctly after the move, and the 6
  security-definer advisor warnings are now cleared.

**Why**

The Supabase security advisor flagged the helpers as publicly callable via RPC
(a minor information-disclosure surface). The `private`-schema pattern is
Supabase's recommended fix and removes the exposure without weakening RLS.

**Verified (looping):** re-ran the tenant-isolation proof with a fresh user
after the change — the signed-in user saw exactly their own clinic's patients
(RLS evaluates the moved helpers correctly). Advisor re-run: the 6 warnings are
gone; only a low-priority Auth toggle (leaked-password protection) remains,
noted in NEEDS_REVIEW. Test fixtures cleaned up; KB sample intact.

---

## 2026-07-05 — Session 3 (increment L): Supabase backend — multi-tenant sync, auth, live dashboard, cloud KB

**What**

- **Supabase project `entopic`** created (free tier, $0/mo, confirmed before
  proceeding). Schema via migrations: `clinics`, `clinic_members` (roles),
  `patients`, `visits`, de-identified `encounters`, and `kb_conditions` /
  `kb_versions` (the KB authoring/growth platform). **RLS on every table**;
  Realtime enabled on patients/visits with `REPLICA IDENTITY FULL` so change
  events are RLS-filtered per clinic. Security-definer helpers revoked from
  `anon` (advisor clean).
- **Client** (`js/cloud-config.js`, `js/cloud-sync.js`) — plain fetch +
  WebSocket, no SDK/CDN. Email/password auth, clinic create/join, an
  offline-first outbox (push patients/visits when online), pull + Realtime
  merge (last-writer-wins), token refresh, polling fallback, status surface.
  Wired into `storage.js` (one guarded line, like the IndexedDB mirror) and a
  new dashboard **"Cloud Sync & Multi-User"** card (`js/app.js`).
- `tools/seed-cloud-kb.js` — generates idempotent upsert SQL to push the full
  local KB (and a published `kb_versions` bundle) into the cloud.
- `docs/CLOUD_SETUP.md` — what's built, the verification table, and the manual
  two-browser live-sync runbook.
- `tests/cloud-sync.test.js` (9 tests): LWW merge, open-exam-visit protection,
  no echo loop, enqueue/gating, disabled-dormant, status states.

**Why**

The founder greenlit the full arc: multi-user, live dashboard updates, and a
KB built to grow 100x. This delivers the backend foundation while keeping the
offline-first exam untouched.

**Verified**

- **Tenant isolation proven server-side** by impersonating two users in two
  clinics via JWT claims: Dr A saw only Clinic A's patient, Dr B only Clinic
  B's, and Dr A's cross-tenant **insert was blocked** (0 intruder rows).
- Realtime publication + replica identity confirmed; KB round-trip proven
  (sample seeded, incl. a VERIFIED review-status row).
- 78/78 unit tests pass; browser smoke + cloud-card render clean; app fully
  functional offline (signed-out card, nothing queued).

**Honest limitation:** the live browser↔Supabase WebSocket round-trip could
not be exercised from this build sandbox (its egress proxy blocks the project
domain). It is covered by the `docs/CLOUD_SETUP.md` runbook — run once on a
normal network. The security-critical half (RLS isolation) IS proven here.

**Guardrails:** no server-side diagnosis; PII/registry separated; engine never
a network dependency; free tier only.

---

## 2026-07-05 — Session 3 (increment K): Engine indexed for 100x knowledge-base scale

**What**

- `knowledge/loader.js` — precomputed KB indexes rebuilt by
  `rebuildKbIndexes()` (so a cloud-grown KB can refresh them):
  `KB_ROUTE_INDEX` (route→conditions), `KB_REQ_TOKEN_INDEX` (any required
  token→conditions), `KB_REQ_FIRST_INDEX`, `KB_NAME_INDEX` (O(1)
  `findCondition`), `KB_NOREQ_CONDS`.
- `js/engine.js` — the two hot paths no longer scan the whole KB every run:
  - **Scoring** now iterates only conditions that require a *present* token
    (via `KB_REQ_TOKEN_INDEX`) and sit on an active route. Since the engine
    already forces score 0 unless a required token matched, this yields
    *identical* results — but cost scales with the evidence, not the KB.
  - **Data-driven route activation** uses `KB_REQ_FIRST_INDEX` instead of a
    full scan.
  - `scoreCondition` / `generateEvidence` take a shared token `Set` for O(1)
    membership instead of `Array.indexOf`.
  - A deterministic tie-break by `_index` makes ordering independent of
    iteration/indexing. Full-scan fallbacks retained if indexes are absent.
- `tests/engine-scale.test.js` (3 tests): results **identical** at 1x vs 100x
  (13k conditions), red-flags still fire inside a 100x KB, and a perf ceiling
  (100x run < 40 ms) to prevent regressions.

**Why**

The founder wants the KB to grow ~100x. Measured before: a 13,000-condition
KB took **~144 ms per keystroke** — unusable. The engine ran O(N) scans on
every data change.

**Verified (looping benchmark):** realistic large-KB benchmark (distinct
conditions, so a given encounter matches a small slice):

| KB size | before | after |
|---|---|---|
| 130 (1x) | 0.77 ms | 0.32 ms |
| 13,000 (100x) | 143.8 ms | **3.97 ms** (~37x faster) |
| 65,000 (500x) | — | 26 ms |
| 130,000 (1000x) | — | 56 ms |

Top diagnosis and problem foci identical across all sizes. 70/70 tests pass;
browser smoke clean; token registry in sync.

---

## 2026-07-05 — Session 3 (increment J): IndexedDB safety mirror — clinic data survives a wiped browser store

**What**

- `js/storage-mirror.js` (new) — every clinic-data write (users, patients,
  visits, settings, registry queue) is now also mirrored into **IndexedDB**
  (hundreds of MB, a different browser-eviction class than localStorage).
  At boot, if localStorage is found empty while the mirror has data, the app
  **restores everything automatically and reloads once** (session-flag
  loop guard). Mirror writes are async fire-and-forget — they can never
  block or fail a save. The API key is deliberately not mirrored.
- `js/storage.js` — two guarded hook lines in `saveStore`/`removeStore`
  (works unchanged if the mirror script is absent). localStorage remains the
  primary store; no API or behavior change on the happy path.
- `index.html` — one script tag (mirror loads before storage.js).
- `tests/storage-mirror.test.js` (4 tests): pure recovery-decision logic
  (never fires with local data present / on fresh installs / twice per
  session), safe no-op loading without a browser, hook wiring, script order.

**Why**

The founder confirmed everything stays stored locally — so local storage
must stop being a single point of failure. Today "clear browsing data"
destroys the entire clinic. This is the biggest data-loss risk in the app,
fixed additively, fully offline, with zero UI or workflow change. It also
de-risks the future full IndexedDB migration (Phase 4) and any later cloud
backup: both now have a local redundancy layer beneath them.

**Verified:** 67/67 unit tests pass; browser smoke clean; and a full
end-to-end disaster drill in headless Chromium — seed data through the real
save path → confirm mirror contents → wipe localStorage completely → reload
→ **all patients/visits/users restored automatically**, second reload does
not loop.

---

## 2026-07-05 — Session 3: Supabase integration exploration (ideas document, no build)

**What**

- `docs/SUPABASE_EXPLORATION.md` — a founder-requested exploration of what a
  Supabase backend could provide *around* the local-first app: automatic
  backup via an outbox sync, real auth + clinic/roles/RLS multi-tenancy,
  multi-device clinic flow (technician pre-testing → doctor's lane via
  Realtime), PII/clinical separation at the database, the anonymized-registry
  → calibration/validation flywheel, signed KB-version distribution with a
  founder review page, an Edge-Function LLM proxy (moves the API key
  server-side and *enforces* de-identification), Storage for
  drawings/OCT/fundus images, clinic analytics, and (much later)
  patient-facing intake. Includes a "what Supabase must NEVER become"
  section (no diagnostic-path dependency, no PII/analytics mixing, no
  server-side scoring) and a sequenced, independently-shippable roadmap
  with cost notes (steps 0–5 fit the free tier).

**Why**

The founder confirmed everything stays stored locally but asked for the full
range of ideas a Supabase integration could provide. This records the
exploration durably so the eventual go/no-go is an informed decision.

**Deliberately NOT done (guardrail):** no Supabase org/project created, no
tier chosen, no spend, no architecture committed. Awaiting the founder's
call on the recommended first arc (IndexedDB → Auth/RLS → outbox sync).

---

## 2026-07-04 — Session 2 (increment I): ICD-10 coverage completed — all 130 conditions

**What**

- `knowledge/icd-map.js` — expanded from 23 to **all 130 conditions coded**
  (100% ICD-10-CM coverage; was 0/130 at session start). Every code was
  looked up AND validated as real + billable against ICD-10-CM 2026 via the
  connected tool — none invented. Defaults use the "unspecified eye/stage"
  variant; every entry is `NEEDS_CLINICAL_REVIEW` with provenance, official
  label, and a `caution` note wherever the mapping is a judgment call
  (no dedicated code, an assumption like diabetes type, or a forced
  laterality for combination codes such as CRVO/BRVO/CME).
- `tests/icd-map.test.js` — added a guard that **every** condition carries a
  code (not just urgent ones), so coverage can't silently regress.
- `NEEDS_REVIEW.md` — updated the ICD section with the full list of
  judgment-call mappings for the founder (Diabetic Retinopathy type/ME
  assumption highlighted as most important to confirm).

**Why**

Finishing gap 3. The coding page is now fully populated for every possible
differential, while keeping the "provisional / verify / advisory only"
framing intact (the ⚠ verify flags and disclaimer from increment E apply to
all of them).

**Verified:** 63/63 tests pass; audit shows 130/130 coded (100%); browser
smoke clean. A handful of codes (ERM, CME, macular edema, MacTel,
quadrantanopia, diabetic retinopathy) were explicitly re-validated against the
tool before commit to keep the "verified" provenance honest.

---

## 2026-07-04 — Session 2 (increment H): Data-driven routing — fixes 50 silently-undiagnosable conditions

**What**

- `js/engine.js` — `selectRoutes` now has a general **data-driven pass**: if
  ALL of a condition's required tokens are present, its route is activated so
  the condition can be scored. The hardcoded symptom triggers remain as a
  fast path.
- `tests/engine-reachability.test.js` — permanent guard: **every** condition
  must be self-reachable (appear in the differential when all its own
  evidence is present).

**Why — this was the biggest correctness gap found this session.**

A mechanical probe (inject each condition's own req+sup tokens, check it
surfaces) found **50 of 130 conditions were silently un-diagnosable**: their
route was never in `selectRoutes`' hardcoded trigger list, so they were never
scored even with a textbook-complete picture. Examples: Conjunctival
Hyperemia (req: redness), Corneal Abrasion (pain_acute), Diabetic Retinopathy
(blur), Divergence Insufficiency (distance_diplopia), Traumatic Cataract
(trauma_history), and most of the cornea domain. After the fix: **0/130
unreachable**.

Scoring is unchanged, so ranking of the known golden cases is preserved
(verified) and simple presentations don't gain noise — broader routing only
lets a condition be *considered*; the req-gated scoring still decides whether
it ranks. Self-maintains as the KB grows.

**Verified:** 62/62 tests pass (incl. all prior golden vignettes unchanged);
0/130 self-unreachable; browser smoke clean; simple cases (dry eye, POAG)
unchanged, isolated "redness" now correctly surfaces Conjunctival Hyperemia.

---

## 2026-07-04 — Session 2 (increment G): Concurrent problem foci (multi-problem view)

**What**

- `js/engine.js` — new `computeProblemFoci(dxList)`: a deterministic
  presentation layer that partitions the scored differential into
  **independent clinical problems by domain**, each with its own lead
  condition, confidence band, within-focus alternates, and a per-problem
  "next check" (the lead's top missing evidence). Written to `V.problemFoci`;
  urgent problems sort first. **Scoring is unchanged and `V.dxList` is
  untouched** — zero regression risk.
- `js/ui-advisory.js` — new **"Working Problems"** section renders the foci
  (grouped, urgent-flagged) above the retained flat differential. The panel
  evolves; nothing is torn down.
- `js/data-model.js` — `blankVisit()` carries `problemFoci: []`.
- `tests/engine-problem-foci.test.js` (6 tests): multi-problem separation,
  per-focus shape, urgent ordering, foci-are-a-view-over-dxList, evidence
  floor. `ARCHITECTURE.md` §B.1 updated to record this as the first bounded
  version (the per-focus state machine B.3 remains the next step).

**Why**

Gap 4 — the central conceptual limitation: one ranked list forces
co-existing problems (dry eye + glaucoma-suspect + convergence insufficiency)
to compete for one slot. This surfaces them as **N independent problems**,
which is how real multi-morbid patients present. Doing it as a view over the
existing engine keeps determinism, safety, and every golden test intact while
delivering the product's headline differentiator.

**Verified:** 60/60 tests pass. Confirmed in headless Chromium: a 3-problem
patient (POAG 72% / Exposure Keratopathy 67% / Convergence Insufficiency 44%)
renders as three separate Working Problems with no console errors.

---

## 2026-07-04 — Session 2 (increment F): CI pipeline + dev harness docs

**What**

- `.github/workflows/ci.yml` — GitHub Actions CI running on every push/PR:
  syntax-checks all app JS, verifies the token registry is in sync
  (`registry:check`), runs the full test suite (`npm test`), and prints the
  KB audit. No dependencies, secrets, or network — the harness uses only Node
  built-ins. This operationalizes the continuous-feedback loop: every future
  change is now regression-tested automatically.
- `tools/README.md` — plain developer guide to the harness (commands, files,
  the token registry, the browser smoke test).

**Why**

The safety net only protects the project if it runs on every change. CI makes
the golden vignettes, registry sync, and KB invariants a gate, not a habit.

**Verified:** all four CI steps pass locally (test/registry/audit exit 0;
syntax check clean).

---

## 2026-07-04 — Session 2 (increment E): ICD-10 codes (authoritative, provisional) + coding page

**What**

- **`knowledge/icd-map.js`** — new condition→ICD-10-CM map. 23 conditions
  coded, covering **all 17 urgent conditions** plus common ones (POAG, dry
  eye, nuclear cataract, allergic conjunctivitis, keratoconus, optic
  neuritis). Every code was looked up AND validated against the **ICD-10-CM
  2026** code set via the connected ICD-10 tool — real, billable
  (HIPAA-valid) leaf codes, none invented. Defaults use the
  "unspecified eye/stage" variant (app doesn't capture laterality at coding
  time). Every entry carries `status: NEEDS_CLINICAL_REVIEW`, provenance
  (`verified`), the official label, and a `caution` note where the mapping
  is a judgment call.
- `knowledge/loader.js` backfills `cond.icd` (+ `icd_label`, `icd_status`)
  from the map during assembly — engine and coding page already read
  `cond.icd`, so this lights up gap 3 with no engine rewrite.
- `js/engine.js` threads `icd_label`/`icd_status` through `dxList`.
- `js/ui-pages-2.js` (coding page) now shows the code with its official
  label on hover, a **"⚠ verify" flag** on every provisional code, a
  placeholder for unmapped conditions, and a footer disclaimer ("provisional
  defaults… advisory only — not a billing decision"). Keeps the
  never-authoritative framing.
- `tests/icd-map.test.js` (6 tests): well-formed billable-shape codes (no
  bare category headers), names exist in KB, every entry review-flagged with
  provenance, all urgent conditions coded, codes propagate to `dxList`.

**Why**

Gap 3 — ICD codes referenced but never populated; the coding page had
nothing to render. Sourcing real codes from the authoritative tool (rather
than inventing them) respects the "never fabricate clinical content"
guardrail; flagging every one for review respects "AI-authored clinical
content is provisional until the founder verifies."

**Founder action needed:** confirm the 23 mappings (esp. the `caution`
ones: Microbial Keratitis, Compressive Optic Neuropathy, Choroidal Melanoma,
Retinal Tear/Detachment) and decide laterality/stage capture. Remaining 107
conditions still need codes — same verified process.

**Verified:** 54/54 tests pass; browser smoke test clean; coding page
renders codes + verify flags (confirmed via headless Chromium).

---

## 2026-07-04 — Session 2 (increment D2): Token registry + reachability fixes + browser smoke test

**What**

- **Token registry (Phase 1 foundation, ARCHITECTURE.md §A.1).**
  `tools/gen-token-registry.js` generates `knowledge/token-registry.js`
  (`TOKEN_REGISTRY` + `TOKEN_REGISTRY_STATS`) by MEASURING every token's
  producers (symptom chips, dictionary, finding-map, free-text parser,
  engine derivation, temporal, medication bridge), KB usage counts, and
  reachability. Nothing invented; `type_hint` is mechanically inferred and
  marked provisional. Loaded in both the browser (`index.html`) and Node.
  `npm run registry` / `registry:check`.
- **Reachability fixes surfaced by the registry** (were: hallmark evidence
  present but condition never scored):
  - `leukocoria` — added as a selectable slit-lamp finding + dictionary
    aliases + finding-map entry, so Congenital Cataract (req: leukocoria)
    is now reachable. Added an **urgent leukocoria alert** (retinoblastoma /
    congenital cataract), flagged `NEEDS_CLINICAL_REVIEW` for founder to
    verify wording/urgency. Zero unreachable required tokens now.
  - **Data-driven urgent routing.** `selectRoutes` now activates the urgent
    route whenever the *required* token of any urgent-route condition is
    present. Fixes silent non-scoring of Hypopyon Uveitis (hypopyon_visible),
    Neovascular Glaucoma (rubeosis_iridis), and Wet AMD (distortion) — each
    previously fired a safety alert but produced an empty differential.
    Self-maintains as the KB grows.
  - Added `RAPD_positive`→neuro, `hypopyon_visible`→anterior,
    `rubeosis_iridis`→glaucoma, `leukocoria`→lens route triggers.
- **Real browser smoke test** (Chromium/Playwright, kept in scratchpad):
  confirms the app loads with no console/page errors, KB (130) + registry
  (490 tokens) load, login renders, engine is callable. Observed the app
  pulls fonts from Google Fonts CDN — cosmetic, but a minor offline-first
  wrinkle worth self-hosting later.
- `tests/token-registry.test.js` (5 tests): registry-in-sync guard, every
  required token reachable, unreachable sup/con frozen at ≤70, no undeclared
  KB tokens. Plus 5 new golden vignettes for the routing fixes.

**Why**

The registry is the root-cause fix for gap 1 and the recon that made the
reachability bugs visible and provable. Enforcing "every required token is
reachable" as a test means a condition can never again be silently
un-diagnosable.

**Verified:** 48/48 unit tests pass; browser smoke test passes; registry
`--check` clean. Divergence from doc: built the registry as a *generated*
file with a sync-check test (rather than a hand-maintained one) so it can
never drift from the sources — recorded here per the brief.

---

## 2026-07-04 — Session 2 (increment D1): Medication tokens actually reach the engine

**What**

- `js/engine.js` — `collectTokens` now calls `getMedicationTokens()` as
  source 10 (guarded with `typeof` so the engine runs without the module).
  The medication-checker's engine bridge existed but was **never invoked**:
  drug-derived tokens (`steroid_history`, `raised_iop_risk`, `dryness`)
  never reached scoring. Concretely, "Drug-induced Cataract (Steroid)"
  *requires* `steroid_history` — it was mathematically impossible for it to
  ever appear. Now a steroid user with PSC signs ranks it first (0.83).
- `tools/lib/load-engine.js` — harness loads `medication-checker.js`.
- 2 new golden vignettes (steroid-cataract reachable; engine safe without
  medication data).

**Why**

Found while building the token registry's producer inventory: mechanical
source-tracing showed `getMedicationTokens` had zero call sites. This is
exactly the class of dead-wiring bug the registry is meant to surface.

**Verified:** 38/38 tests pass.

---

## 2026-07-04 — Session 2 (increment C): Free-text negation handling

**What**

- `js/engine.js` — `parseComplaintText` now strips negated phrases before
  token extraction (`stripNegatedPhrases`): "no pain", "denies flashes",
  "without discharge" no longer emit the negated tokens. The splitter is
  deliberately conservative — only the negated clause tail is dropped, so
  "no flashes, floaters since Monday" still emits `floaters` (over-alerting
  is safer than under-alerting for red flags).
- Two false-positive regex fixes: "reduced vision" no longer emits `redness`
  (\bred\b), "painless" no longer emits `pain` (pain(?!less)).
- `tests/engine-freetext.test.js` — 10 new tests: negation cases, the two
  false-positive fixes, positive-phrasing sensitivity controls, and two
  end-to-end checks that negated red flags don't fire the retinal alert
  while positive phrasing still does.

**Why**

Gap 6 in ARCHITECTURE.md: the regex parser had no negation handling, so a
recorded "denies pain" actively pushed the differential toward painful
conditions. This was the smallest bounded fix with real clinical impact.

**Verified:** 36/36 tests pass; golden vignettes unchanged.

---

## 2026-07-04 — Session 2 (increment B): Exclusion matcher fixed, urgent conditions un-suppressible

**What**

- `js/engine.js` — rewrote the matching inside `applyExclusions` (the only
  engine change):
  - Condition names are normalized to snake_case before comparison, so
    exclusion strings like `"acute_angle_closure"` now actually match
    "Acute Angle Closure Crisis". Before this fix, 16 declared exclusion
    rules essentially never fired (2 fired by accident).
  - **Safety guard: urgent-flagged conditions are never removed by exclusion
    logic.** A high-scoring chronic condition (e.g. POAG) can no longer hide
    an emergency (e.g. Acute Angle Closure Crisis) from the differential.
    This is a deliberate divergence from the raw KB intent, in line with the
    "red flags are un-suppressible" guardrail.
  - A condition can no longer exclude itself.
- `knowledge/binocular.js` — exclusion target `sixth_nerve_palsy` renamed to
  `sixth_cranial_nerve_palsy` (unambiguous naming fix: the condition "Sixth
  Cranial Nerve Palsy" exists; the old string could never match it).
- `knowledge/surface.js` — flagged the two genuinely unresolvable exclusion
  targets inline with `NEEDS_CLINICAL_REVIEW` comments (`acute_keratitis`
  from evaporative dry eye; `orbital_cellulitis` from preseptal cellulitis —
  the latter's intent also looks inverted and needs the founder's call).
- `tests/engine-exclusions.test.js` — 6 new tests pinning the fixed matcher:
  normalized matching fires, low scorers suppress nothing, no self-exclusion,
  urgent survival (unit + full-pipeline end-to-end where POAG ≥ 0.5 coexists
  with an acute angle-closure presentation and AACC stays in the list).
- `tools/kb-audit.js` — exclusion section now models the fixed engine matcher
  (resolvable / suppressible / unresolvable) instead of simulating the old bug.

**Why**

Gap 2 in ARCHITECTURE.md — comorbidity suppression silently no-oped. Fixing
it without the urgent guard would have been dangerous (several exclusion
targets are urgent conditions); the guard makes the feature safe to enable.

**Verified:** 26/26 tests pass (golden vignettes unchanged — no regression);
audit shows 14/16 rules resolving. All app files pass `node --check`.

---

## 2026-07-03 — Session 1: Repo bootstrap + KB audit/validation harness

**What**

- Imported the Entopic v1.0.0 codebase (33 files, browser-only app) into the
  repository as the working baseline. No app source was modified.
- Added `ARCHITECTURE.md` and `CLAUDE.md` to the repo root so every future
  session can orient from version control.
- Added a Node-based dev/test harness (the app itself stays browser-only and
  offline-first — this tooling never ships to the client or runs in the
  diagnostic path):
  - `tools/lib/load-kb.js` — loads the browser-global knowledge base + token
    layers into a sandboxed Node context (mirrors the `<script>` load order),
    so tooling and tests can inspect the KB without a browser.
  - `tools/kb-audit.js` — read-only ground-truth report on the KB and token
    vocabulary. `npm run audit`. Supports `--json` and `--strict` (exit
    non-zero on hard-invariant violations; not yet wired into CI because the
    current KB knowingly violates some invariants — that's what it measures).
  - `tests/kb-structure.test.js` — regression net that freezes current counts
    and structural invariants. `npm test` (Node's built-in test runner; no new
    dependencies).
  - `package.json` — scripts only (`audit`, `audit:strict`, `test`).

**Why**

Per the working brief, foundations first. Before touching the diagnostic engine
or the KB, we need (a) the code under version control and (b) an automated way
to measure the KB and catch regressions. This harness is the seed of the
Phase 1 token-registry validator and the Phase 0 golden-case safety net. It is
the safest possible first change: it adds tooling and tests, and modifies zero
app behavior.

**Verified findings (measured, not assumed) — with divergence from the doc**

Confirmed against `ARCHITECTURE.md`:
- 130 conditions across 9 domains; 17 urgent. ✓ (matches doc exactly)
- Per-domain counts match the doc exactly.
- **0 / 130 conditions carry an ICD code.** ✓ (confirms gap 3)
- **Exclusions are effectively broken.** 16 exclusion rules are declared but
  only **2** actually fire under the current `applyExclusions` matcher, which
  substring-compares snake_case tokens (`"acute_angle_closure"`) against
  space-separated display names (`"Acute Angle Closure Crisis"`). ✓ (confirms
  gap 2 — comorbidity suppression is essentially not running)

Divergences from the doc's Appendix B (code is newer / doc was approximate):
- Distinct tokens referenced by KB conditions: **471** (req/sup/con/temporal/
  tests), not 512. Core req/sup/con: 285.
- Tokens defined in `token-dictionary.js`: **184**, not 183 (no duplicate keys).
- Tokens emitted by `finding-token-map.js`: 98 distinct (across 171 entries).

New findings worth the founder's attention:
- **3 exclusion rules point at conditions that don't exist in the KB** by any
  name match: `acute_keratitis`, `orbital_cellulitis`, `sixth_nerve_palsy`.
  These may be naming mismatches (the target exists under a different name) or
  genuine content gaps. Flagged for clinical review, not auto-changed.
- **`leukocoria` is a *required* token that no input source can currently
  produce** (not in the dictionary, not emitted by any finding). Any condition
  that requires it (e.g. retinoblastoma) can therefore never surface. This is
  the kind of unreachable-required-token bug the Phase 1 registry is meant to
  make impossible. Flagged for review. (Other no-lexical-producer required
  tokens — `high_iop`, `eso_near`, `exo_distance`, `steroid_history` — are
  legitimately produced by the engine's measurement/medication derivation,
  which a KB-only audit can't see.)

**Divergence from the doc's plan:** none in substance. The doc's Phase 0 says
"instrument and freeze." This session does exactly that, and folds in the token
audit (Phase 1 reconnaissance) since it's read-only and cheap. No engine, KB, or
UI logic changed.

**Still working / next candidates**

- App is unchanged and runs exactly as before (open `index.html`).
- Next highest-value increments (for founder input):
  1. **Golden clinical vignettes** — load the engine in Node and assert
     input → expected active problems + red-flag alerts. Biggest safety net.
  2. **Fix the exclusion matcher** (gap 2) — bounded, testable, and the audit
     already proves the before/after. Best done together with condition `id`s.
  3. **Token registry** (Phase 1) — the root-cause fix; the audit is its recon.
- Clinical review needed from the founder on the 3 unresolvable exclusion
  targets and the `leukocoria` reachability gap above.
