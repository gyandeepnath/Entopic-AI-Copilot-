# Test Suite Audit — Entopic

**Date:** 2026-07-31
**Brief:** treat the repository as production software; review every test;
measure coverage, meaningfulness, missing scenarios, regression protection,
boundary testing, failure injection, offline, sync, corrupted-database
recovery, large datasets, concurrency. Generate valuable tests. No redundant
tests. **Aim for confidence rather than coverage percentage.**

---

## Verdict in one paragraph

The suite was **strong where it had been hurt before and blind where it had
not**. Every dimension with an existing test was there because a specific
defect had already been found and fixed — the tests are scar tissue, and good
scar tissue. But two whole dimensions had **zero** coverage, and both were
hiding **critical, reproducible data-loss bugs** in code that has been running
the whole time. Both are now fixed and pinned. That is the finding: not a
coverage number, but that *the untested dimensions were untested because
nobody had been bitten yet* — which is exactly the wrong reason for a clinical
system, where the first bite is a patient's record.

| | before | after |
|---|---|---|
| Test files | 55 | **59** |
| Assertions run | 499 | **551** |
| Lines of test code | 7,464 | **8,713** |
| Critical bugs found by this audit | — | **2** |

---

## 1. What was found — the two real bugs

### T-1 (CRITICAL) — A damaged store was silently overwritten and destroyed

**Dimension:** corrupted database recovery — *zero tests existed.*

Reproduced in a real browser before writing a line of test code:

```
create 3 patients
truncate entopic_patients      (what a crash or disk error mid-write leaves)
reload            → the app shows 0 patients, no warning at all
one ordinary save → 1 patient stored; the other 3 gone permanently
```

The IndexedDB safety mirror did not help, and made it worse. Its recovery only
fires when the key is **absent**; a corrupt key is *present*, so recovery was
skipped — and then `mirrorSeedFromLocalStorage` copied the damaged bytes over
the last good mirror copy, destroying the safety net at the exact moment it
existed for.

**Root cause.** `loadStore` treated *"cannot read"* and *"nothing there"* as
the same thing, returning the empty fallback either way. The app then held `[]`
and saved it over records that were merely damaged. The identical reasoning was
**already implemented** for a locked vault — *"writing a fallback-derived value
would destroy real records"* — it had simply never been extended to corruption.

**Fixed at the root**, not patched:

- ABSENT and CORRUPT are now distinct states. A fresh install still works.
- Valid JSON of the *wrong shape* counts as corrupt too — it survives
  `JSON.parse` and reaches every caller that iterates the list, which makes it
  more dangerous than unreadable bytes, not less.
- `saveStore` **refuses** to write to a store it could not read.
- The damaged bytes are **quarantined** under their own key first, so even a
  later successful write cannot erase the only remaining copy.
- The mirror validates before copying, so it can no longer inherit corruption.
- A sticky red banner says plainly that *what you are looking at is not what is
  on this device*, and not to see patients on it. Reading zero patients must
  never look like a clinic with zero patients.
- `storageAcceptCorruptLoss()` lets an operator explicitly give up and resume.
  Nothing calls it automatically — discarding records is a decision a person
  makes, having been shown what is lost.

**Re-verified against the original reproduction:** the damaged bytes survive,
the quarantine copy still contains the real patients, the banner is up. Before
the fix the same script ended with one patient and three unrecoverable.

### T-2 (CRITICAL) — Two windows on one machine destroyed a measurement

**Dimension:** concurrent users — *zero tests existed.* (The only "concurrent"
in the suite referred to concurrent clinical *problems*, not concurrent
writers.)

Measured, one browser profile, two tabs on the same visit:

```
tab A records IOP 24/22 and saves
tab B, holding its own copy, records a fundus finding and saves
stored: the finding, IOP blank, and no record a measurement ever existed
```

Two windows on one clinic machine is an everyday situation — the front desk and
the consulting room, or one clinician who opened a second tab. `doSave()` writes
`visit.data = V` wholesale, so the last writer wins and the loser disappears.
The **cloud** path already had per-record stamps and surfaced conflicts; the
**local** path had nothing.

**Fixed.** Automatically merging two clinical records is not something software
should do unsupervised, so the fix does the one thing that is unambiguously
right: **the overwritten version is never destroyed.** Each tab records the
stamp it saw; `doSave` compares before replacing; the displaced version is
deep-copied onto the record with who wrote it and when; an audit entry is
written; a banner tells the clinician to check what the other window entered.

Verified: tab A's IOP of 24 is now preserved and attributed, where before it
was simply gone.

---

## 2. Coverage — measured, and deliberately not chased

**85 source files. 26 are never named by any test.** That number is not the
useful one. Broken down by what the file actually is:

| Category | Files | Verdict |
|---|---|---|
| Pure DOM renderers (`ui-pages`, `ui-flowmap`, `ui-sidebar`, `ui-chart`, `ui-modules`, `*-ui.js`…) | 16 | **Correctly untested.** Unit-testing string-building render functions asserts that the code is what the code is. These are covered by browser probes, which is the right instrument. |
| Real logic, genuinely untested | 4 | **A real gap.** `file-store.js` (312 lines, handles PDF/image attachments and quota), `error-boundary.js` (112 lines — the thing that catches crashes), `spectacle-advisor.js` (276), `speech.js` (307). |
| False positives in my first pass | 6 | `kb-authoring.js`, `investigations.js`, `drawing.js` and others *are* tested; my detector matched literal path strings and missed tests that load them differently. Corrected rather than reported. |

**Assertion quality across the whole suite:** 693 test cases, 1,420 assertions,
**71% carry an explanatory failure message.** That number matters more than
coverage: an assertion that fails with `expected true, got false` costs the next
session an hour; one that fails with *"the damaged bytes must be UNTOUCHED —
they are the only remaining copy of three real patients"* costs a minute.

**Files with the thinnest assertions per test** are the structural contract
tests (`ui-wiring`, `db-grants`, `generated-patterns`) — one strong
`deepStrictEqual([], offenders)` each. That is appropriate density for a
whole-repo invariant, not weakness.

---

## 3. Dimension-by-dimension

| Dimension | Before | Now | Note |
|---|---|---|---|
| **Regression protection** | Strong | Strong | Golden clinical vignettes, red-flag alerts, KB structure, token registry. Every past defect has a test. |
| **Boundary testing** | Partial | Partial | Engine boundaries (IOP thresholds, age brackets, empty visit) are well covered. Numeric input boundaries in the UI layer are not. |
| **Failure injection** | Thin | **Strong** | Was one quota test. Now 21: quota, truncation, wrong shape, null, write refusal, unpersisted sign-offs, junk imports. |
| **Offline** | Strong | Strong | The engine test harness deliberately loads *no* network module — the offline-first invariant is structural, not asserted. Best kind. |
| **Sync** | Good | Good | Conflict surfacing, PHI wrapping, retry/backoff, soft-delete. |
| **Corrupted DB recovery** | **None** | **Strong** (12 tests) | T-1. |
| **Large datasets** | Good | Good | Measured limits: engine 1.5 ms over 394 conditions; ~3,000 patients / 9,000 visits per device before the localStorage ceiling. |
| **Concurrency** | **None** | **Strong** (9 tests) | T-2. |
| **Meaningfulness** | Good | Good | 71% of assertions explain themselves. |

---

## 4. Tests I deliberately did NOT write

The brief said no redundant tests, so these are the ones I decided against and
why:

- **Unit tests for the 16 DOM render modules.** They would assert that a string
  template is that string template. Browser probes already cover them and catch
  real breakage.
- **A test that the KB has 394 conditions.** It changes every time the KB grows;
  it would be edited to match rather than fixing anything. The structural KB
  tests (every condition well-formed, every required token reachable) are the
  ones with teeth.
- **Coverage-percentage tooling.** It would report the 16 render modules as a
  deficit and push toward exactly the tests above.
- **A merge algorithm test for T-2.** There is no merge algorithm, deliberately.
  Testing one would mean building one, and automatic merging of two clinical
  records is not something software should do unsupervised.

---

## 5. Remaining gaps, ranked

1. **`file-store.js` (312 lines, untested).** Handles PDF and image attachments
   — the largest objects the app stores, on the code path most likely to hit
   the storage ceiling. Highest-value remaining test target.
2. **`error-boundary.js` (112 lines, untested).** It is the safety net for
   uncaught errors; nothing verifies it catches anything.
3. **UI-layer numeric boundaries.** An IOP of `-5`, `999`, or `"abc"` typed into
   the field. The engine handles these; the input layer is unproven.
4. **`spectacle-advisor.js`, `speech.js`.** Lower clinical risk.
5. **A restore-onto-a-different-device end-to-end test.** Components are tested
   individually; the whole disaster-recovery journey is not exercised in one go.

None of these is a blocker. All are worth a future session.

---

## 6. What changed in this audit

| ID | Change | Tests |
|---|---|---|
| T-1 | Corrupt store: detection, write refusal, quarantine, mirror protection, banner, explicit-loss escape hatch | 12 |
| T-2 | Concurrent writers: detection, full preservation of the displaced version, audit entry, banner | 9 |
| — | Sign-off durability (earlier this session) | 15 |
| — | AREDS scale + citation traceability (earlier this session) | 15 |

**551 tests passing. `tools/audit.js`: 0 FAIL. App verified clean end to end,
with all three red-flag alerts still firing.**

---

## 7. The honest note

Both critical bugs were in code I wrote in earlier sessions, and both were
found only because this audit went looking at *dimensions* rather than at
*files*. A file-by-file review would have read `loadStore` and seen a
try/catch that returns a sensible fallback — which is what it looks like. It
took asking *"what happens when the disk is damaged?"* and then actually
damaging it.

That is the transferable lesson for this project: **the valuable test is the
one that injects the failure, not the one that walks the happy path.** Twenty
tests that call functions with good input give less confidence than one that
truncates the patient list and checks the records survive.
