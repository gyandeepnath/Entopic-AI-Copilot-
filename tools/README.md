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

## Adversarial stress harnesses (`tools/stress/`)

Run separately from `node --test`, which is browserless and asks "does it do
the right thing". These ask the opposite: *what does it take to make it do the
wrong thing quietly?*

```
node tools/stress/attack.js           46  storage, migrations, engine, red flags
node tools/stress/privacy.js          43  what LEAVES the device
node tools/stress/crypto.js           24  who GETS IN
node tools/stress/clinical.js         37  scales, medications, OSDI, dispensing
node tools/stress/pollution.js        16  prototype pollution, as a class
node tools/stress/sync.js             18  records arriving from another device
node tools/stress/xss.js              24  script injection (real browser)
node tools/stress/output.js           26  what gets printed (real browser)
node tools/stress/redflag-screen.js   44  red flags to painted pixels (real browser)
```

Add `--only=X1` to any of them to run a single attack.

The last three drive a real Chromium, because the question is about pixels and
execution, not about strings.

**If you change the shared sandbox (`tools/stress/lib.js`), read its header
first.** It deliberately does not inject the host realm's `Object`/`JSON`/
`Array`; injecting them makes every prototype-pollution attack in the repo pass
without reaching the code. `tests/prototype-pollution.test.js` guards that.

### Measurement

```
node tools/bench/storage-bench.js     storage at 100 -> 9,000 visits
node tools/audit-escaping.js          unescaped interpolations (advisory)
node tools/audit-test-quality.js      tests that may pass while broken
```

The benchmark's fake `localStorage` keeps an O(1) key index on purpose. It used
to rebuild the key array on every `key(i)` call, which is O(n) where a browser
is O(1) — that alone made a 667 ms operation measure as 7.4 minutes.
