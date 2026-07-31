# AI-Generated Engineering Review — Entopic

**Date:** 2026-07-31
**Scope:** the whole repository, reviewed specifically for the failure modes that
AI-assisted programming produces.
**Reviewer's conflict of interest:** I wrote most of this code. Every finding
below is a criticism of my own output across ~11 prior sessions. That is worth
stating plainly, because it is also the single best argument in this document for
having a human engineer read the codebase independently at some point.

---

## How to read this

For the founder: **section 0** is the one that matters. Everything after it is
for an engineer.

Every claim is measured, not estimated. Where a number appears, the command that
produced it is reproducible against this commit. Where I previously reported a
number that turned out to be a tooling artefact, I say so rather than quietly
dropping it (§11).

**Scale of the thing being reviewed:** 82 loaded scripts, 26,263 lines of JS,
2,197 global names, 822 top-level functions, 55 test files / 499 tests / 7,464
lines of test code.

---

## 0. The finding that actually matters

### AI-1 — A file of invented clinical numbers, loaded on every page

`js/risk-calc.js`: **369 lines, loaded by `index.html` on every single page
load, called by nothing.** It contained:

- a **home-made points score** presented as the OHTS glaucoma-conversion model
  (`Age ≥65: +3`, `C/D ≥0.5: +2`, `PSD ≥2.0: +2`). The real OHTS predictor is a
  Cox proportional-hazards model over continuous variables. It is not a points
  score. Those weights were invented.
- **nine invented risk percentages** rendered as if authoritative:
  `~4%`, `~10%`, `~20%`, `>30%` for glaucoma conversion; `~45% fellow eye`,
  `~30-50%`, `~18-25%`, `~1-5%`, `<1%` for AMD progression.
- a header comment reading *"Simplified scoring based on published OHTS model"* —
  a sentence that **reads like a citation and cites nothing.** That sentence is
  the tell, and it is the most dangerous single line in the file.

This violates the hardest guardrail in `CLAUDE.md`: *never invent
sensitivity/specificity, likelihood ratios, guideline claims, or thresholds.*

**Why AI produces this.** Asked for "clinical risk calculators", a language model
will almost always produce something *shaped* like the real thing rather than
say "I do not have the model coefficients." It has seen thousands of papers
*about* OHTS and AREDS2, so it reproduces the vocabulary — the right risk
factors, plausible cut-points, confident-sounding percentages — without the
coefficients, which live in tables it has no reliable access to. The output is
fluent, internally consistent, and wrong. Fluency is exactly what makes it
survive review.

**Why it survived here specifically.** It was unreachable. Nobody reads code that
never renders. Worse, a *later* AI session noticed it was unwired and wrote a
test comment **excusing** it — *"renderRiskCalculators / renderMedicationReview
are intentionally NOT here yet — pending founder clinical verification"* — which
converted a patient-safety problem into a to-do item and then forgot it. An AI
ratifying an earlier AI's mistake is a distinct and under-appreciated failure
mode of long-running AI-assisted projects.

**Fixed this session.** Moved to `quarantine/risk-calc.UNVERIFIED.js`, removed
from the load path, and every fabricated number labelled in a header that states
exactly what is wrong with it and what a clinician must supply to restore it.
`tests/unverified-clinical-content.test.js` now fails if: the quarantine directory
enters the load path; `js/risk-calc.js` reappears; `index.html` references a file
that isn't on disk; or **any loaded module assigns a hard-coded percentage to a
risk/probability/sensitivity/specificity-shaped field.** That last assertion was
verified to go red against the original file (it caught all nine percentages) and
green after quarantine.

**Best long-term implementation.** Clinical constants do not belong in
JavaScript at all. They belong in the knowledge base, in the same
`review_status` / evidence-graded structure every condition already uses, so that
a risk calculator is *data a clinician signs off*, not *code an AI wrote*. When
the founder wants these calculators back, the right shape is a KB entry per
calculator carrying the model form, the coefficients, and the citation, rendered
by a generic component — subject to the same "provisional until verified"
workflow as the 247 conditions still awaiting sign-off. That makes fabrication
structurally impossible rather than merely discouraged.

> **Founder decision needed.** The three calculators (OHTS, AREDS2, and an
> ETDRS *severity grading* which is categorical and contains no invented numbers,
> so may be salvageable separately) are parked, not deleted. To bring any of them
> back you need to supply the real model and its source. Until then nothing is
> lost and nothing can fire.

---

## 1. Repeated generated patterns

### 1a. The 450 defensive guards

```
450  occurrences of  typeof X === "function"
186  distinct guarded names
```

This is *the* signature of AI-assisted work on a no-build-step, script-tag
codebase, and it is the largest single pattern in the repo.

**Why AI produces it.** Each session sees a subset of the code. A missing global
is an immediate `ReferenceError` that breaks the page, so the model's
loss-minimising move is to wrap every cross-module call in a existence check. It
is locally correct every time and globally corrosive: it converts *"this
dependency is missing"* from a loud crash into a silent no-op that logs nothing
and fails no test.

**It is not theoretical here — it caused two real defects.** R-1 (stored XSS)
was an escaping helper that silently fell through to identity. S-2 was a session
token read back as ciphertext because the unwrapping helper wasn't there yet.
Both were guards that were quietly false.

**Fixed this session — without deleting 450 guards.** Removing them wholesale
would be a large, risky, low-value refactor. Instead
`tests/generated-patterns.test.js` asserts that **every guarded name resolves to
something in the load path** — a global definition, a `window.` assignment, an
injected parameter, or a genuine host global (`alert`, `fetch`, `atob`…, which
legitimately vary). A rename, a deletion, or a wrong `<script>` order now turns a
silent no-op into a red test. Verified by renaming `recStampVisit` and watching
it fail, naming both call sites.

**Best long-term implementation.** The guard is a symptom of having no module
system. If this codebase ever gets a build step, ES modules with real `import`
statements delete all 450 at a stroke and make the dependency graph checkable by
a compiler. That is a big, architecture-committing change and **should not be
done now** — the app is shippable and a build step adds a failure mode the
founder cannot debug. The contract test buys most of the safety at none of the
cost. Revisit if and when a second engineer joins.

Note the one module that already does this correctly:
`knowledge/condition-info.js` takes its collaborators as **parameters**
(`buildConditionProfile(cond, prettify)`, `resolveConditionInfo(name, findCond,
prettify)`) rather than reaching for globals. That is dependency injection, it is
the right pattern, and it is the exception. It is also why the contract test has
to understand parameters — my first draft flagged `findCond` and `prettify` as
orphans, which would have been a false accusation against the best-written file
in the repo.

### 1b. Four copies of "save a file"

Four near-identical download helpers, written in four different sessions, in
`data-export.js`, `kb-review.js`, `storage.js`, and `ui-age-brackets.js`. Each
was ~8 lines. Each looked right. **They had drifted:**

| | attaches anchor to DOM | revokes object URL | audits the export |
|---|---|---|---|
| `data-export.js` | yes | after 2000 ms | yes |
| `kb-review.js` | yes | after 2000 ms | no |
| `storage.js` | yes | **synchronously** (can race the download) | no |
| `ui-age-brackets.js` | **no** (historically fails in Firefox) | after 1000 ms | no |

**Why AI produces it.** A model with a fresh context does not know a helper
already exists three files away, and searching for one is a cost it will not pay
unprompted. Writing eight obvious lines is cheaper than discovering the eight
lines that already exist. Do that eleven times and you get eleven dialects of the
same primitive, each subtly worse than the best one.

**Fixed.** One `dlSaveAs(filename, content, mime)` in the new
`js/browser-io.js`, which does the strictly-safest version of all four (attach,
click, detach, revoke on a timer) and returns a boolean. All four call sites now
delegate; `data-export.js` keeps its audit entry, which is a real requirement (an
export of patient-derived data is a disclosure event), not drift. The contract
test fails if any module builds its own download anchor again — verified red.

### 1c. Escaping (fixed in a prior session, now pinned)

432 escaping call sites across the codebase, previously served by more than one
implementation — the R-1 hole. Now one canonical `escHtml` in `dom-escape.js`
with one-line delegates. `tests/generated-patterns.test.js` now fails if any
`esc*` helper appears that does **not** delegate to it — verified by adding a
fake `escSneaky()` that returns its input unchanged and watching it fail.

---

## 2. Silent failure as a house style

```
146  catch blocks
 82  of them completely empty:  catch (e) {}          (56%)
 31  localStorage.setItem calls
 18  of them with the failure swallowed
```

**Why AI produces it.** `try { … } catch (e) {}` makes the immediate demo work
and can never throw. A model optimising for "the code I just wrote does not
crash" reaches for it constantly. It is the error-handling equivalent of the
`typeof` guard: locally safe, globally blinding.

Roughly a dozen of these are legitimate — a failed *read* of `localStorage`
genuinely means "not there", and a failed optional `logAudit` should not break a
save. The dangerous ones are **writes**.

Two were real silent-data-loss paths and are fixed:

- **`kbLocalEditsSave` (`kb-remote.js`)** — a clinician edits a condition in the
  KB editor; if the write fails the edit vanishes on the next reload while the
  editor reports success. This is the same defect class as P-1, which was already
  fixed for patient records but not for clinical *knowledge*.
- **`vaultSecretSet` (`local-vault.js`)** — resolved `true` unconditionally.
  The comment directly above the swallowing line read
  *"Never silently drop a secret we were asked to keep."*
  The next line silently dropped it.

That last one deserves its own note. **AI-written comments describe intent;
AI-written code describes behaviour; nothing keeps them in sync.** A comment that
confidently asserts a safety property is *weaker* evidence than no comment at
all, because it stops a reader looking. When auditing AI-generated code, treat
every reassuring comment as a hypothesis to test, not a fact.

**Fixed.** `lsSet` / `lsGet` / `lsRemove` in `js/browser-io.js`. Reads still
never throw. **Writes return a boolean and route failures into the same
write-failure banner the patient-record store already uses**, so one storage
ceiling produces one visible warning instead of several invisible ones. Verified
in a real browser: forcing `QuotaExceededError` makes `lsSet` return `false` and
raises the banner with the correct key and the message *"This device's local
storage is full."*

**Best long-term implementation.** The remaining ~14 swallowed writes
(`assignments.js`, `roles.js`, `clinic-mode.js`, `cloud-crypto.js`, and the
vault's enable/disable/rollback paths) should migrate to `lsSet` opportunistically
— when a session is already editing that file, not as a sweep. A sweep across
five modules to fix a low-frequency failure is not worth the regression risk
today. The rule going forward: **a `catch` block that swallows a write must
explain in one sentence why losing the data is acceptable, or it is a bug.**

---

## 3. Context drift

Context drift is what happens when a long-lived function is edited by a series of
sessions that can each see the function but not its history.

**`collectTokens()` in `js/engine.js`: 574 lines.** It is the single most
important function in the product — it converts everything a clinician entered
into the tokens the diagnostic engine reasons over. It is organised as numbered
"sources", and the numbering tells the whole story:

```
SOURCE 1 … 9      lines 135–310    (in order)
SOURCE 9b         line  311        ← 256 lines long, appended rather than numbered
SOURCE 11         line  598
SOURCE 10         line  630        ← after 11
```

Nine sources in order, then a `9b` that is bigger than sources 1–9 combined, then
11, then 10. Each session opened the file, saw a numbered list, and appended.
Nobody renumbered because renumbering touches lines you did not come to change.

Similar: `blankVisit()` at 384 lines (`data-model.js`), `runDiagnosticEngine()`
at 280 lines (`engine.js`, though that one is legitimately a 13-stage pipeline
with clear stage markers).

**Why AI produces it.** A model editing a 500-line function is strongly biased
toward *additive* change — appending a block is safe and reviewable; restructuring
is a large diff that risks breaking behaviour the model cannot fully see. Across
many sessions, "always append" is a ratchet. Human engineers feel the pain of a
574-line function and eventually reorganise it; a fresh model context feels no
pain, because it has never read the file before.

**Recommended, but NOT done this session.** `collectTokens` should become a
registry of small, independently-testable collectors:

```js
var TOKEN_COLLECTORS = [
  { id: "symptoms",       collect: function (V, P) { … } },
  { id: "slit_lamp",      collect: function (V, P) { … } },
  …
];
```

`collectTokens` then reduces to iterate-and-merge, each collector gets its own
golden test, and the next session appends a *collector* rather than 256 more
lines. The engine's output must be **byte-identical** before and after —
verifiable, because the golden clinical vignette suite already exists.

**Why I did not do it now.** This is the diagnostic path. A refactor with no
behavioural benefit, performed at the end of a long session, on the one function
whose regressions are patient-safety regressions, is a bad trade. It deserves a
session of its own, starting from a snapshot of engine output across the full
vignette suite and diffing after. Flagged as the highest-value engine refactor
outstanding.

---

## 4. Hallucinated abstractions and dead code

**8 genuinely dead top-level functions** out of 822 (verified individually, not
by grep count — several initially-suspicious names turned out to be reachable via
inline `onclick` handlers built by string concatenation):

`authHexToBytes`, `requestInterpretiveRemarks`, `parseDrugList`, `simRealism`,
`renderSmartIntake`, `getPreviousVisit`, `engineMapNav`, `renderMedicationReview`.

That is a ~1% dead-code rate, which is *good* — better than most hand-written
codebases of this age. The problem is not the count, it is the **shape**: whole
modules built, loaded, and never wired.

- `js/smart-intake.js` — 427 lines, one function referenced externally.
- `js/simulation-realism.js` — 313 lines, 2 of 11 functions referenced externally.
- `js/risk-calc.js` — 369 lines, **zero** (see §0).
- `js/medication-checker.js` — 162 lines, 1 of 4.

**Why AI produces it.** Asked to "add X", a model builds a complete, plausible
module for X — and building it *feels* like completing the task, so the wiring
step (one line in a render function, somewhere else entirely) gets dropped. The
module then passes every check that looks at files in isolation. It only fails a
check that asks *"is this reachable from a user action?"*

`engineMapNav` is mine, from this session's node-graph work. Same mistake, same
week.

**Best long-term implementation.** The repo already has the right instrument —
`tests/ui-wiring.test.js` asserts named panels stay reachable — but it works from
a hand-maintained allowlist, which is how `renderRiskCalculators` got *excused*
instead of *caught*. Invert it: **a `render*`/`pg*` function that no handler,
router, or test reaches should fail by default**, with an explicit, dated,
justified exemption list. Default-deny catches the thing nobody thought to add to
a default-allow list. I have not built this yet — it needs a careful sweep of the
8 dead functions first (each is a small product decision: wire it, or delete it)
and that is founder-facing work, not a mechanical change.

**Two functions are tested but not wired** (`cloudConflicts`,
`simPresentationCoverage`) — a milder version of the same thing, and a reminder
that a passing test is not evidence a feature is reachable.

---

## 5. Over-engineering, boilerplate, and comment inflation

```
4,463  comment lines / 18,989 code lines  =  19% of non-blank lines
  460  lines of ═══ banner boxes across 62 of 82 files
```

19% is high. Every file opens with a decorated banner; many functions carry a
multi-paragraph rationale.

**Why AI produces it.** Models are trained toward explanation, and a session that
has just made a subtle change wants to justify it. Nobody prunes, because pruning
a comment is a diff with no visible benefit.

**But I am going to argue against the obvious recommendation.** The normal advice
is "delete the noise." That advice assumes a reader who can reconstruct intent
from code. **This project's owner cannot read the code at all**, and its
maintainers are fresh AI sessions with no memory. In that specific situation, a
comment explaining *why* — especially "this looks wrong but is deliberate, here
is the incident that caused it" — is doing real load-bearing work. The V-1 vault
comment and the P-1 storage comment are two of the most valuable artefacts in the
repo.

The right distinction is not volume, it is kind:

- **Keep and expand:** comments recording *why*, decisions, incidents, guardrail
  rationale, "do not do the obvious thing because…".
- **Delete on sight:** comments restating *what* the next line does
  (`/* Age scoring */` above code that scores age), and decorative banners on
  files small enough not to need navigation aids.
- **Distrust actively:** comments asserting a safety property (see
  `vaultSecretSet`, §2). Verify or delete — never leave a reassuring claim
  standing next to code that does not honour it.

**Genuine over-engineering is rare here**, which is worth saying. No premature
microservices, no dependency-injection container, no abstraction layer over
`localStorage` written before it was needed. Where the codebase over-built, it
over-built *features* (§4), not *architecture*.

---

## 6. Boilerplate that should collapse

- **102 hard-coded `<option>` tags across 10 UI modules.** Each dropdown builds
  its markup by hand. `rxSpecSelect()` (added this session for the lens
  specification dropdowns) is the shape the rest should converge on:
  `select(label, field, options, current)` → one string. This is a mechanical,
  low-risk consolidation, best done opportunistically per module rather than as a
  sweep.
- **~50 `.map(function(){…}).join("")` HTML builders**, 15 of them in
  `ui-pages.js` alone. These are fine; string-building is the right call in a
  no-framework app. No change recommended.
- **18 `document.getElementById(x) || {}` idioms.** A three-line
  `elValue(id, fallback)` helper would remove all of them. Small, safe, do it
  next time someone is in the file.

**Explicitly NOT recommended:** a component framework. The three-panel exam
layout, the 22-step flow, and the glass-box map are the product's identity and
are protected by guardrail. String-building UI is unfashionable and completely
appropriate for an offline-first, no-build-step clinical tool that has to run
from a `file://` URL on a clinic laptop.

---

## 7. Inconsistent naming

**Three competing export conventions, all live:**

```
811  bare  function foo()        (implicit global)
 63  window.foo = function       (explicit global)
 22  module.exports = { … }      (for the Node test sandbox)
```

Nine files use **both** of the first two — `ui-validation.js` (7 bare, 10
`window.`), `reasoning-views.js` (19 / 12), `data-export.js` (6 / 6). There is no
rule distinguishing them; the choice tracks which session wrote which function.

**Over 40 distinct function-name prefixes**, some meaningful (`vault*`, `cloud*`,
`kb*`, `rec*`, `sim*`), some overlapping: `pg*` and `render*` **both** mean
"build a page" (26 and 30 functions respectively), with no principle separating
them.

**Why AI produces it.** A model matches the local style of the code it can see.
If it opens `ui-validation.js` and sees `window.valVerify = function`, it writes
`window.valNext = function`; if it opens `storage.js` and sees `function
loadStore`, it writes `function saveStore`. Local consistency, global incoherence
— and no single session ever sees enough of the codebase to notice.

**Best long-term implementation.** Write the rule down in `ARCHITECTURE.md` and
let it apply to new code only:

- `function foo()` for module-internal and cross-module functions.
- `window.foo =` **only** for functions referenced from inline `onclick`
  attributes in HTML strings — which makes the export list a precise, greppable
  inventory of the UI's entry points, and gives the wiring test a real contract to
  check.
- `module.exports` guarded, at the bottom, only where a Node test needs it.
- `pg*` for a full page; `render*` for a region inside one.

**A mass rename is the wrong move** — 874 call sites, zero behavioural benefit,
and every renamed function is a chance to break an `onclick` string that no
compiler checks. Converge going forward; leave the past alone.

---

## 8. Architecture drift

**`storage.js` ↔ `local-vault.js` is circular.** `storage.js` calls 11 vault
functions on its read/write path; `local-vault.js` calls back into `mirrorStore`,
`logAudit`, `clearApiKeyCache`, `cloudForgetSessionInMemory`. It works only
because the `<script>` order in `index.html` is exactly right, and that order is
pinned by a test **only because I broke it once and added the test afterwards**.
This cycle is mine, introduced when the vault was added.

**Why AI produces it.** Adding encryption to an existing storage layer, a model
takes the shortest path: call the vault from storage, call storage's helpers back
from the vault. Neither call looks wrong in isolation. The cycle is only visible
from above, and no session is ever above it.

**Best long-term implementation.** One direction only: `local-vault.js` should
know nothing about storage, mirroring, or audit. It should expose pure
`wrap(value) / unwrap(value)` plus lock-state, and *emit events*; `storage.js`
should own persistence, mirroring, and audit and subscribe to those events. That
is a genuine improvement and a genuine risk — this is the code path that decides
whether patient records are readable. It should be its own session with the
38-test vault suite green before and after, not a bolt-on.

**Interim mitigation, done:** `js/browser-io.js` sits *below* both, giving them a
shared dependency that depends on neither, and the load-order contract is now
asserted (`browser-io.js` must precede every module that calls its helpers —
verified red by moving it after `app.js`).

---

## 9. Incorrect reuse

Less common here than expected, but two patterns worth naming:

- **Reusing a guard as a fallback.** `if (typeof escH === "function") escH(s)` —
  the *guard* was for load order; the *effect* was "silently render unescaped
  text." Reusing a defensive idiom in a security-critical position turns a
  robustness pattern into a vulnerability. Fixed (R-1) and now pinned.
- **Reusing `try/catch` as control flow.** Several sites use an empty catch to
  mean "this key might not exist" — fine for reads, wrong for writes (§2).

**The general lesson:** an idiom that is safe in one context is not safe in
another, and AI reuses idioms by *shape*, not by *consequence*. Anywhere a
pattern crosses into a security or data-integrity path, it needs a test that
proves the failing branch behaves correctly — not just that the happy path works.

---

## 10. Code that should be rewritten by hand

In priority order, with the honest reason for each:

| # | Target | Why a human, not a model | Risk if done badly |
|---|---|---|---|
| 1 | The **247 unverified KB conditions** | Clinical truth cannot be generated. This is not a coding task. | Patient harm |
| 2 | `collectTokens()` (574 lines) | Needs whole-history judgement about what belongs together — exactly what a fresh context lacks | Silent diagnostic regression |
| 3 | `storage.js` ↔ `local-vault.js` cycle | Requires holding both modules and the whole failure surface in mind at once | Unreadable patient records |
| 4 | The 8 dead functions | Each is a small product decision (wire it or cut it), not a mechanical change | Low |
| 5 | Export-convention convergence | Mechanical, but 874 sites and an `onclick` layer no compiler checks | Broken buttons |

Items 4 and 5 are safe for an AI session with tests. Items 1–3 are where a human
should spend their time, and item 1 is not optional.

---

## 11. Where my own tooling lied to me

Included because a review of AI-generated code that trusted AI-generated
measuring tools would be worth very little.

- A function-length scanner reported `fsIsImage` as **258 lines**. It is one
  line. Its comment-stripper ate the `//` inside the regex literal
  `/^image\//i`, swallowing the closing brace and everything after.
- A dependency scanner reported `dom-escape.js → app.js` and "162 backward
  dependencies" by matching a function name **inside a comment**. Both scanners
  now strip comments first. I did not report the 162 figure as fact.
- A documentation comment I wrote containing `onclick="fn(…)"` was read as a dead
  button by two different checkers.
- A clinical simulation reported **3 red flags missing**. The simulation was
  writing findings to `V.sl.od.findings`; the engine reads `V.sl.findings`. Had I
  reported that as-is, it would have been three fabricated patient-safety defects.
- **And again, while verifying this very session.** My browser probe wrote
  symptoms to `V.cc.symptoms` and reported that the flashes+floaters red flag did
  not fire. `V.symptoms` is the token array; `V.cc` is a free-text *string*;
  `V.cc.symptoms` is neither. Corrected, all three red flags fire (retinal tear,
  IOP >40, RAPD). Twice in one project, the same mistake — which is why a red-flag
  claim is never made in this repo from a probe alone, only from the golden
  vignette suite, which uses the engine's real input shape.
- My first draft of this session's guard-contract test flagged `findCond` and
  `prettify` as orphans. They are injected parameters in the best-designed file in
  the repo.

**The pattern:** AI-generated analysis tools produce confident, well-formatted,
specific wrong answers — the same failure mode as AI-generated clinical numbers
(§0), one level up. Every number in this document was re-derived after checking
the tool that produced it. **Anything reported by tooling and not reproduced by
hand should be treated as a lead, not a finding.**

---

## 12. What was changed this session

| ID | Change | Verification |
|---|---|---|
| AI-1 | `js/risk-calc.js` → `quarantine/risk-calc.UNVERIFIED.js`, out of the load path, every invented number labelled | New test goes red with the file restored (catches all 9 percentages), green after; browser confirms `calculateOHTSRisk` is `undefined` at runtime |
| AI-2 | One `dlSaveAs()` replaces 4 drifted download copies | Browser: anchor attached, blob URL created, returns `true`; contract test red when a hand-rolled anchor is reintroduced |
| AI-2 | `lsSet/lsGet/lsRemove`; `kbLocalEditsSave` and `vaultSecretSet` now report write failure instead of swallowing it | Browser: forced `QuotaExceededError` → `lsSet` returns `false`, banner raised with correct key and message |
| AI-3 | Contract test: every `typeof`-function guard must name something real; one escaper; one downloader; load-order pinned | All four assertions verified red against their specific defect, green after restore |
| — | Stale test comment excusing `renderRiskCalculators` corrected | — |

**499 tests passing** (up from 495). **`tools/audit.js`: 0 FAIL.** App boots
clean in a real browser with all 394 conditions loaded; the only console error is
the Google Fonts request failing on `file://`, which is expected offline and
pre-existing.

---

## 13. Recommended order of work

1. **Founder, clinical:** decide the fate of the three quarantined calculators.
   Continue KB verification — 247 of 394 conditions remain provisional, and that
   is still the largest clinical risk in the product by a wide margin.
2. **Engineering, next session:** `collectTokens` → collector registry, with
   byte-identical engine output proved against the golden vignettes.
3. **Engineering, own session:** break the `storage ↔ vault` cycle, vault suite
   green either side.
4. **Opportunistic:** `lsSet` migration, `<option>` consolidation, `elValue`
   helper, export-convention convergence — only in files a session is already
   editing.
5. **Standing:** default-deny reachability for `render*`/`pg*`; independent human
   code review; independent penetration test.

---

## 14. The meta-finding

Every category in this review has the same root cause: **AI sessions optimise for
locally-correct, individually-reviewable changes, and this codebase's problems
are all global.** The `typeof` guard is correct in each of its 450 places. Each
download helper is correct. Each appended token source is correct. Each
`catch (e) {}` is correct. The 369 lines of invented risk percentages were
*fluent*.

The defence is not better prompting. It is **making global properties
mechanically checkable** — which is what this session added: one escaper, one
downloader, one load order, no unreachable clinical numbers, no guard that names
nothing. Each is a small test that a future session cannot talk its way past,
because a red test does not accept an explanation.

That principle is the one worth carrying forward: when you find an AI-generated
defect, ask *"what global property would have made this impossible?"* and encode
that, rather than fixing the instance and moving on.
