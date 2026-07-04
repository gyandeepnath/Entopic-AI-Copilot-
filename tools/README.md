# Entopic dev/test harness

The Entopic **app** is browser-only and offline-first: open `index.html`, no
build step, no server. This `tools/` directory is **developer tooling only** —
it never ships to the browser and never runs in the diagnostic path.

Everything here uses Node's built-ins (no `npm install` needed).

## Commands

| Command | What it does |
|---|---|
| `npm test` | Runs the full test suite (Node's built-in runner): golden clinical vignettes against the real engine, KB structure, token-registry, exclusion, free-text, and ICD-map tests. |
| `npm run audit` | Prints a ground-truth report on the knowledge base — condition/domain counts, token vocabulary, ICD coverage, exclusion resolution. Read-only. |
| `npm run audit:strict` | Same, but exits non-zero on hard-invariant violations (for gating). |
| `npm run registry` | Regenerates `knowledge/token-registry.js` from the sources. Run this after changing symptoms, the dictionary, the finding-map, or engine token production. |
| `npm run registry:check` | Fails if `token-registry.js` is out of date (CI guard). |

## Files

- `lib/load-kb.js` — loads the browser-global knowledge base + token layers
  into a sandboxed Node context (mirrors the `<script>` order in
  `index.html`), so tooling/tests can inspect the KB without a browser.
- `lib/load-engine.js` — loads the full diagnostic pipeline (knowledge →
  loader → data-model → medication-checker → engine) into a sandbox.
  `runCase(visitOverrides, patientOverrides)` runs the real
  `runDiagnosticEngine()` on a `blankVisit()`/`blankPatient()` and returns
  `{ dxList, alerts, nudges, tokens, routes }`. This is what the golden
  vignettes drive.
- `kb-audit.js` — the audit report.
- `gen-token-registry.js` — the token-registry generator.

## Token registry

`knowledge/token-registry.js` is a **generated** single source of truth for
the engine's token vocabulary: every token's producers (which input path can
emit it), KB usage counts, and reachability. It is measured from the real
sources — never hand-edited. The `registry:check` CI step keeps it honest, and
a test asserts every *required* token is reachable (so a condition can never be
silently un-diagnosable).

## Browser smoke test

A headless-Chromium smoke test (load the app, assert no console/page errors,
KB + registry present, engine callable) is run manually during development via
Playwright; it is intentionally kept out of CI to avoid a browser-download
dependency.
