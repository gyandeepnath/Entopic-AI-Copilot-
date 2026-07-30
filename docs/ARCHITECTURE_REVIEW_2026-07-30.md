# Entopic — Architecture Review for Long-Term Maintenance
**Date:** 30 July 2026
**Brief:** *"Treat this repository as if it will be maintained by 30 engineers over the next decade."*
**Scope:** 25,000 lines of application JavaScript across 58 modules, 26,000 lines of knowledge base, 438 tests.

---

## How this was measured, and where the measurement lies

Every number below came from a script run over the actual source, not an impression. Two of those scripts produced **false positives that I caught and corrected**, and you should know about them because they bound how much to trust the rest:

- A brace-counting function-length tool reported `fsIsImage` at **258 lines**. It is a **one-liner** — the counter was fooled by the `{` inside a regex literal. Function lengths below were re-checked by eye for the top offenders.
- An identifier-based dependency tool reported `dom-escape.js → app.js`. That is impossible; `dom-escape.js` has no dependencies at all. It matched a word inside a *comment*. So the "162 backward dependencies" that tool produced is **inflated and I am not reporting it as fact**. The specific couplings below were each verified by reading the actual call sites.

Where I could not verify a claim, it says so.

---

## Verdict

For a codebase built by one non-engineer's AI collaborator, this is **in better structural shape than the brief implies**. The things that usually rot a decade-old repo are largely absent:

| Signal | Measured | Assessment |
|---|---|---|
| Dead code | **8 unused functions of 865** (0.9%) | Excellent |
| Naming consistency | Clear module prefixes (`sim`, `cloud`, `kb`, `vault`, `phi`, `pg`); camelCase throughout; `_` for private; **zero** snake_case/PascalCase outliers | Excellent |
| Long functions | 19 over 100 lines, 90 over 50, of 865 | Acceptable, one real outlier |
| Test coverage | 438 tests; 24 UI files unit-untested | Good core, thin UI edge |
| Duplicate logic | One serious instance (below), otherwise low | One real problem, now fixed |

**The single most important finding was a live security bug, and duplication caused it.** That is issue R-1, and it is the only thing I refactored.

---

# R-1 — Duplicated escaping helpers → latent stored XSS ✅ FIXED

**Severity: high (security). This is the flagship finding of the review.**

### Current implementation (before)
Seven UI modules — `analytics`, `kb-review`, `reasoning-views`, `ui-deployment`, `ui-quiz`, `ui-validation`, `ui-vault` — each opened with a defensive alias:

```js
var _e = (typeof escH === "function") ? escH : function (s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
```

### Problem
`escH` is defined in `app.js`, which `index.html` loads **last** (everything depends on it, so it sits at the bottom). Those alias lines execute at **module load time** — before `app.js` exists. The `typeof` check was therefore *always false*, and **all seven modules permanently bound the inline fallback**.

The fallback escapes `&`, `<`, `>` — but **not the double quote**. Those same modules interpolate knowledge-base names into HTML **attributes**:

```js
'<div data-name="' + _ve(it.name) + '" onclick="valSelect(\'' + … + '\')">'
```

**Verified exploitable in a real browser.** A condition named `Name" onmouseover="steal()" x="` produced a live `onmouseover` handler on the rendered element (`attributeActuallyInjected: true`). Condition names arrive from the KB editor **and from published cloud KB bundles**, so the input is not purely local — a malicious or compromised KB publisher could reach every installation that pulls an update.

The deeper lesson for a 30-engineer repo: **this duplication did not merely repeat an abstraction — it silently substituted a weaker one.** A defensive fallback that never yields to the real implementation is worse than no fallback, because it looks careful.

### Recommended architecture
One implementation, in a module with **no dependencies**, loaded **first**, with **no fallback that can drift**.

### What was done
- `js/dom-escape.js` — canonical `escHtml()` (escapes `& < > "`), loaded as the **first** script.
- `escAttrJs()` added for the `onclick="fn('…')"` pattern, which is easy to get subtly wrong by hand (escape order matters: backslash, then quote, then HTML).
- `esc()` and `escH()` in `app.js` now delegate to it.
- All seven fallbacks deleted.

**Deliberate decision: `'` is still NOT escaped.** Many call sites build `onclick="fn('…')"` and do their own `.replace(/'/g,"\\'")` for the JavaScript string. Emitting `&#39;` would be decoded by the HTML parser *before* JS saw it — converting a defence into a new injection. Attribute-safety for single quotes belongs to the call site (better still, to removing inline handlers entirely — see T-2).

### Backward compatibility
**Total.** `esc()` and `escH()` keep their names, signatures and output; no call site changed. One behaviour change, and it is a fix: `escH` previously returned `""` for any falsy input, so `escH(0)` silently rendered nothing. It now renders `"0"`.

### Migration strategy
Done in one commit — the change is strictly *more* escaping in seven modules, and `&quot;` renders as `"` in body context, so no visible output changed anywhere.

### Risk assessment
**Low, and verified.** 438 tests pass; all surfaces × all roles × encryption on/off render with no errors; the XSS probe now reports `attributeActuallyInjected: false`.

**Guarded against recurrence** by `tests/dom-escape.test.js`, which fails if any module defines a private escaping fallback again, and asserts `dom-escape.js` is the first script loaded.

> **Side finding.** Two scanners (`tests/ui-wiring.test.js`, `tools/audit.js`) matched the `onclick="fn(…)"` pattern *inside my documentation comment* and reported a phantom dead button. Both now strip comments before scanning. Documentation must not be punished by the linter that reads it — otherwise engineers learn to stop documenting conventions.

---

# T-1 — `collectTokens()` is 568 lines ⚠️ RECOMMENDED, NOT DONE

### Current implementation
`js/engine.js:68` — a single function that walks the entire visit object (`V`) and emits the engine's token vocabulary. It is the widest function in the codebase by a factor of 1.5 (next is `blankVisit` at 374).

### Problem
It is the **highest-traffic merge point in the repo**. Every new exam field, every new token, every clinical refinement edits this one function. With 30 engineers it becomes a permanent merge-conflict hotspot, and its length makes review superficial exactly where correctness is clinical.

### Recommended architecture
Split by **exam station**, mirroring the 22-step flow the product is already organised around:

```
engine/tokens/index.js        collectTokens() — composes the below
engine/tokens/symptoms.js     symptom chips + temporal
engine/tokens/refraction.js   rx, VA
engine/tokens/anterior.js     slit lamp, IOP, gonio
engine/tokens/posterior.js    fundus, OCT, fields
engine/tokens/systemic.js     history, medications
```

Each contributor is a pure `(V) → string[]`, so each becomes independently testable — which it is not today.

### Migration strategy
Strangler pattern, one station at a time. Extract a station's block into a pure function; have `collectTokens` call it; assert **token-for-token identical output** on a corpus of saved visits before deleting the old block. Repeat. No step changes behaviour.

### Backward compatibility
Total, if done as described — `collectTokens()` keeps its name and contract. Nothing outside the engine knows the difference.

### Risk assessment
**Medium — and this is why I did not do it.** This function is the input side of the diagnostic engine; a dropped token silently changes a differential, which is a patient-safety event, and it would not necessarily fail a test. It needs a **golden corpus** of real visits and their expected token sets built *first*. That corpus is the prerequisite deliverable, not the refactor.

**Do this when:** a second engineer joins, or before the next large KB expansion. **Not** as a cosmetic tidy-up.

---

# T-2 — Global mutable state + inline handlers ⚠️ ACCEPT, WITH GUARDRAILS

### Current implementation
Six mutable globals carry all application state: `CU` (user), `CP` (patient id), `CV` (visit id), `P` (patient), `V` (visit), `API_KEY`. Measured: **187 top-level `var`s, of which 164 are ALL_CAPS constants** — so ~23 are genuinely mutable module state, most of them `_`-prefixed and module-private. The UI is built from `innerHTML` strings with inline `onclick` handlers.

### Problem
- `V` is mutated from dozens of call sites with no change notification; correctness depends on every mutation being followed by a re-render.
- Inline handlers force `script-src 'unsafe-inline'` in the CSP, which is the main remaining weakness in that policy.
- No module system means load order in `index.html` is load-bearing and silent when wrong — **exactly the failure that caused R-1**.

### Recommended architecture (target, not now)
A minimal store: `getVisit()` / `updateVisit(patch)` with subscribers, replacing direct `V.x = y`. Event delegation replacing inline handlers, which then permits dropping `'unsafe-inline'`.

### Migration strategy
Additive. Introduce `updateVisit()` alongside direct mutation; migrate call sites opportunistically as files are touched; only remove direct access once a lint rule can enforce it. Handlers: delegate per page container, one page at a time.

### Backward compatibility
Full during migration — both paths coexist. The final `'unsafe-inline'` removal is the only breaking step and is verifiable in one browser run.

### Risk assessment
**High effort, low immediate return.** This is the classic rewrite that eats a quarter and delivers no clinical value. **Recommendation: do not undertake it as a project.** Take the two cheap guardrails instead:

1. ✅ **Done:** `dom-escape.js` first, with a test asserting it — removes the specific load-order trap that bit us.
2. **Suggested:** a test asserting the `index.html` script order matches a declared dependency list, so a reordering fails CI instead of failing silently in a clinic.

---

# T-3 — `storage.js` ↔ `local-vault.js` circular dependency ⚠️ RECOMMENDED, NOT DONE

### Current implementation
Verified by reading both files:
- `storage.js` calls `vaultEnabled()`, `vaultIsProtected()`, `vaultUnlocked()`, `vaultCacheGet()`, `vaultCacheSet()`, `vaultIsEnvelope()` (8 sites)
- `local-vault.js` reads `STORE_PREFIX` and calls `mirrorPutRaw()` / `mirrorStore()` (8 sites)

### Problem
A true cycle. It works only because every call is guarded by `typeof … === "function"` and all calls happen at runtime, never at load. That is fragile in the same way R-1 was fragile: **the guards hide the ordering problem rather than solving it.**

**I introduced this cycle** when adding encryption at rest. It is my debt, not inherited.

### Recommended architecture
Break it with a third, dependency-free module:

```
store-keys.js   STORE_PREFIX, the protected-store list  (no deps)
     ↑                    ↑
storage.js  ──────→  local-vault.js
```

`local-vault.js` should also stop touching `localStorage` directly, receiving a raw accessor instead — that is what makes it independently testable without a storage stand-in.

### Migration strategy
1. Extract `store-keys.js`; both modules import from it. Mechanical, no behaviour change.
2. Give the vault an injected `{getRaw, setRaw, mirror}` adapter, defaulting to today's behaviour.
3. Delete the `typeof` guards once the direction is one-way.

### Backward compatibility
Total — internal restructuring only, no exported name changes.

### Risk assessment
**Medium, and deliberately deferred.** This is the code path that encrypts patient records. It is correct, it is covered by 31 tests including real-crypto round trips and a rollback test, and restructuring it buys a **tidier dependency graph and zero behavioural improvement**. Touching working encryption for aesthetics is the wrong trade today.

**Do this when** a second engineer needs to work in the storage layer — the cycle is a comprehension tax, and that is when it starts being paid.

---

# T-4 — Dead code ℹ️ MINIMAL

### Current implementation
8 functions of 865 are referenced nowhere in `js/`, `index.html`, `tests/` or `tools/`:

`authHexToBytes`, `requestInterpretiveRemarks`, `slNum`, `parseDrugList`, `simRealism`, `renderSmartIntake`, `getPreviousVisit`, `engineMapNav`

### Problem
Minor. Each is a small reader-confusion cost ("is this the entry point?").

### Recommendation
**Do not bulk-delete.** Some are plausibly intended entry points for parked features (`renderSmartIntake`, `simRealism`). Deleting them could remove work the founder has not yet wired.

**Instead:** annotate each with `/* UNUSED as of 2026-07-30 — kept for <reason> */` or delete individually with the founder's sign-off. Risk of the annotation approach: **zero**. Risk of bulk deletion: low but non-zero, and the benefit is close to nil.

---

# T-5 — 24 UI modules have no unit tests ℹ️ KNOWN, REPORTED HONESTLY

`assignments-ui`, `certificates-ui`, `clinics-ui`, `error-boundary`, `file-store`, `investigations-ui`, `medication-checker`, `module-links` and 16 others are exercised only by browser checks.

**Recommendation:** do not chase coverage as a number. Add tests **when a file is next modified** (the "boy scout" rule), prioritising `error-boundary.js` and `file-store.js` because a fault there is silent. The build audit already reports this count, so it cannot quietly grow.

---

## What I deliberately did NOT refactor, and why

The brief said *"only refactor when the improvement is objectively beneficial."* Applying that honestly:

| Candidate | Why not |
|---|---|
| `collectTokens` split | Needs a golden token corpus first; a dropped token is a silent clinical change |
| `storage`/`vault` cycle | Would restructure working encryption for graph aesthetics; 31 tests currently pin its behaviour |
| Global state → store | A quarter of work, no clinical value, high regression surface |
| Inline handlers → delegation | Same; unlocks a CSP improvement that is real but not urgent |
| Bulk dead-code deletion | Some entries are parked features; needs founder sign-off, saves nothing |

Refactoring one of these because a review named it would be **motion, not progress** — and each carries more risk than the debt it removes.

## Recommended order when engineers arrive

1. **Golden token corpus** — the prerequisite for T-1, and valuable on its own as engine regression protection.
2. **Script-order assertion test** — cheap, closes the class of bug behind R-1.
3. **T-3 store-keys extraction** — when someone next works in storage.
4. **T-1 collectTokens split** — one station at a time, once the corpus exists.
5. **T-2** — only if a concrete need (CSP hardening, or a UI framework decision) forces it.

## Standing strengths worth protecting

Say these out loud so a future team does not "improve" them away:

- **The engine is deterministic and offline.** No network, no LLM, in the diagnostic path.
- **Module prefixes are consistent** and make ownership obvious without a directory tree.
- **The test suite pins behaviour, not implementation** — which is why a 7-module escaping change touched zero test assertions.
- **`tools/audit.js` fails the build** on structural regressions and is the closest thing to an architecture guard. Extend it rather than replacing it.
