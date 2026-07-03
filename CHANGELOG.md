# Changelog — Entopic

All notable changes are recorded here, newest first. Each entry says **what**
changed, **why**, and any **divergence** from `ARCHITECTURE.md` (which is a
strong hypothesis, not a contract — the code is the source of truth).

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
