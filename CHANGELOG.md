# Changelog — Entopic

All notable changes are recorded here, newest first. Each entry says **what**
changed, **why**, and any **divergence** from `ARCHITECTURE.md` (which is a
strong hypothesis, not a contract — the code is the source of truth).

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
