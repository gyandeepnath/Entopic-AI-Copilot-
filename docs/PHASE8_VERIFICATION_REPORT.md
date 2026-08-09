# Phase 8 — Verification & Validation Report

**Date:** 2026-08-08
**Scope of this document:** what has been *proven*, what has been *partially
verified*, and what remains *unknown*. Nothing here is described as tested
because a test file exists; every claim below names the evidence.

**Re-runnable:**

```
node --test                          # 1,164 tests
node tools/stress/attack.js          # 46 adversarial attacks
node tools/audit-test-quality.js     # false-confidence scan
node tools/mutation-test.js --target engine    # does the suite notice a bug?
node tools/mutation-test.js --target storage   # …and the same for the storage layer
node tools/e2e/patient-journey.js              # the full clinical journey, real browser + reload
```

---

## 1. Executive quality summary

Entopic has an unusually strong test suite for a solo-founder product, and a
specific, measurable blind spot.

**What the evidence supports.** The storage layer, the offline path, corruption
recovery, concurrent writers, the vault, archival and migration are genuinely
well covered, and covered *behaviourally* — the tests run the real modules
against real failure conditions rather than asserting that functions exist. The
adversarial harness (46 attacks) finds nothing. Two independent audits
performed for this phase — a mechanical false-confidence scan and mutation
testing — both come back better than I expected.

**The blind spot, stated precisely.** The clinical alert tests almost all ask
*"does this fire when it should?"* and almost none ask *"does it stay silent
when it should?"*. Mutation testing proved this is not theoretical: changing
one `&&` to `||` in the red-flag rules made an urgent alert fire for a patient
reporting **floaters alone**, with wording naming a symptom they never
reported — and the entire 1,126-test suite still passed. That is now fixed and
covered.

**The honest headline.** The suite is good at proving the software does what it
should. It is weaker at proving it does *not* do what it should not. In a
clinical decision-support tool those are not equally important — a false alarm
that trains a clinician to dismiss alerts is how a real red flag gets missed.

**What is NOT proven, and cannot be by any test here: that the clinical
knowledge is correct.** 394 conditions, 48 thresholds and 18 red-flag rules
remain `UNVERIFIED` pending the founder's review. Every test in this repository
holds the engine to what the knowledge base *says*. None can tell you whether
what it says is right.

---

## 2. Test inventory

93 files, 1,164 tests. Rather than reproduce a table of file names — which
would be a count, not evidence — here is the inventory by **risk covered**,
with the gaps named.

| Subsystem | Files | Coverage quality | Gap |
|---|---|---|---|
| Storage / persistence | 8 | **Strong** — behavioural, includes quota, corruption, refused writes, read isolation | — |
| Per-visit storage (new) | 1 | **Strong** — 21 tests incl. failed conversion, missing record, both restore directions, spurious-corruption guard | Long-run behaviour on a real device unverified |
| Offline / corruption recovery | 3 | **Strong** — mirror seeding, quarantine, damaged-store write refusal | Power-failure mid-write is simulated, not real |
| Concurrent writers | 1 | **Strong** — now behavioural on both storage layouts | Three-plus simultaneous tabs untested |
| Vault / encryption at rest | 1 (45 tests) | **Strong** — real crypto, asserts bytes on disk | Key rotation under load unverified |
| Migration | 2 | **Strong** — rollback, undeclared stores, snapshot restore | Only synthetic migrations; zero real ones have shipped |
| Cloud sync | 3 | **Moderate** — merge/conflict/PHI logic is unit-tested | **Network paths never execute in CI**; no live-server contract test |
| Diagnostic engine | 12 | **Moderate** — golden vignettes, scale, determinism, exclusions | **Negative cases were the gap** (§4); clinical truth unverifiable here |
| Red flags | 4 | **Strong** — firing, silence (`alert-specificity`), and per-alert exact wording (`red-flag-wording`) | Wording is `NEEDS_CLINICAL_REVIEW` |
| Security boundaries | 5 | **Moderate** — roles, PHI gate, file-store, escaping | No authz test against a live backend |
| Student / faculty | 4 | **Moderate** — competency, OSCE, simulation, quiz | Cross-role data visibility not adversarially tested |
| Performance | 2 + bench | **Measured**, not asserted | Budgets are observed, not enforced in CI |

---

## 3. False-confidence audit (`node tools/audit-test-quality.js`)

A mechanical scan for the specific ways a test passes whether or not the
feature works.

**Result: 2 findings that could pass while the feature is broken, out of
1,117 scanned tests.** That is a genuinely good number and I did not expect it.

| Pattern | Count | Assessment |
|---|---|---|
| No assertion at all | 1 | `token-registry.test.js:19` — relies on `execFileSync` throwing. Sound in effect, clearer with an explicit assertion. **Low.** |
| Assertion that cannot fail | 1 | `engine-golden.test.js:246` — a "does not crash" test. Legitimate as a smoke check. **Low.** |
| Timing-dependent | 2 | Both explicitly labelled PERFORMANCE with generous margins. **Accepted**, see §7. |
| Unmessaged assertions | 2 | Cosmetic — a failure reads `false !== true`. **Low.** |
| **Source-scraping** | **74** | **The structural finding.** See below. |
| Shared file-level fixture | 26 | Order-dependence risk; no order-dependent failure observed in 5 repeat runs (§7). |

### The source-scraping finding

**74 tests (6.6%) assert against the *text* of production code** rather than
its behaviour — regexes over `js/*.js` looking for an identifier or an
ordering.

This is not automatically wrong: a load-order requirement, or "the conflict
check must run *before* the data is replaced", can only be expressed that way,
because preserving *after* the replacement preserves the wrong version and
still looks correct at runtime.

But it has a real cost, and it was paid during this phase. The concurrent-writer
test scraped `doSave()`'s source for the order of two identifiers. The
per-visit storage split moved that logic into `_doSaveApply` — **the behaviour
was completely intact and the test failed anyway.** A test that fails on a
refactor and would pass on a reintroduced bug trains whoever comes next to
adjust the regex until it goes green.

**Action taken:** that test was replaced with a behavioural one that runs two
writers against the real storage layer on *both* storage layouts, plus a single
narrow source check for the ordering fact that genuinely only exists in source.

**Recommendation:** convert source scrapes to behavioural tests wherever the
behaviour is observable. Roughly 40 of the 74 are convertible. This is test
debt, not a defect — logged in §11.

---

## 4. Mutation testing — the decisive evidence

*"Could the test pass while the feature is broken?"* is the only question that
matters, and it is the only one a green build cannot answer. So the production
code was broken on purpose, one change at a time, and the tests re-run against
each broken version.

### Method, and why the raw number is a lie

A mutation score that counts **equivalent mutants** is misleading. Many changes
compile, run, and produce byte-identical output — no test could catch them and
none should.

The first engine run scored **8%** (2 killed of 24). Reporting that would have
been a false alarm. Each survivor was re-run against 12 clinical probe cases:
**21 of 22 changed no clinical output whatsoever.** Removing the zero-token
guard, removing an urgent-route `break`, and loosening the context-only lookup
all left every probe byte-identical.

| target | mutants | killed | real holes found & fixed | equivalent | score (filtered) |
|---|---|---|---|---|---|
| **engine** | 120 | 59 | **2** | 59 | **all meaningful mutants now killed** |
| **storage** | 40 | 14 | **2** | 26 | **100%** (14 of 14) once probed |

The engine figures are the wider run (§ below). Storage is now **probed too**,
and that story is the most instructive one in this whole phase — see next.

### The storage probe reported a false 100% *twice*, and I caught it by hand both times

This is worth telling plainly, because it is the same lesson three times over
and it is the reason this report keeps its confidence low.

A mutation probe classifies a survivor as "equivalent" (harmless) only if none
of its **scenarios** show a behavioural change — exactly as a test subset only
catches what it runs. When I first built the storage probe it reported **100%,
zero real holes**. I did not believe it, and hand-checked the survivors:

- **V8-13.** Flipping `if (at < 0)` — the branch that adds a *new* visit to the
  index — made `visitRecordSave` **crash on a brand-new visit**, and the probe
  had no scenario that added one. (Currently unreached in production: `doSave`
  always loads the record first. But it is public, documented, defensive code.)
- **V8-14.** Flipping `&&`→`||` in the corruption guard made a **healthy chart
  read spuriously flag the visit index as corrupt** — which blocks writes and
  shows the clinician a red "cannot read records" banner on a device where
  nothing is wrong. The probe missed it because its round-trip ended with a
  clean `loadVisits()`, and `storageNoteReadOk` *clears* the flag on the next
  clean read — so the probe masked the very bug it was meant to find. The
  observable consequence is a **save refused immediately after opening a
  chart**, and the test now checks exactly that ordering.

Both are fixed, both with a test proven to kill the mutant, and **the probe was
strengthened both times** (a new-record scenario; a corruption check with no
masking read). The re-run after each fix is honest only because the probe was
made honest first.

The takeaway, stated for whoever runs this next: **a mutation score of 100% is
evidence the probe's scenarios are complete, not proof the code is.** Treat a
clean survivor list as a prompt to hand-check the survivors, not a certificate.

### The real hole, and its clinical meaning

```js
// js/engine.js:1348
if (tokens.indexOf("flashes") >= 0 && tokens.indexOf("floaters") >= 0) {
    alerts.push({ m: "Flashes + floaters — rule out retinal tear / detachment", l: "urgent" });
```

Changed to `||`, **the whole suite still passed.** With that defect in
production, a patient reporting **floaters alone** receives an urgent banner
reading *"Flashes + floaters"* — naming a symptom they do not have.

Why nothing caught it: every alert test asked whether the alert fires. None
asked whether it stays silent.

**Fixed and covered.** `tests/alert-specificity.test.js` (15 tests) asserts the
conjunction, the general property that *no alert may name a finding the record
does not contain*, and silence on six routine presentations — with the red-flag
firing tests alongside, so the file cannot be satisfied by making the engine
quieter. **Verified by re-applying the mutant: three tests fail, and pass again
when it is reverted.**

### The wider run, and two more real holes

The 24-mutant sample above was widened to **120 mutants** across `engine.js` and
`engine-exclusions.js`. Progression, all against the equivalent-mutant filter:

| run | subset | filtered score | real holes |
|---|---|---|---|
| initial 120 | 8 files (incomplete) | 94% | 3 — one of which was **false** (§ limitations) |
| after fixes | 15 files | 98% (59 of 60) | 1 — family history, uncovered at that moment |
| after `engine-history` added to the subset | 15 files | **all 60 meaningful mutants killed** | 0 |

The two genuine holes — both fixed, both with a test **proven to kill its
mutant** (apply → the new test fails; revert → it passes):

- **V8-10 (hypopyon wording).** The hand-written *"Hypopyon present — URGENT
  referral"* alert could be deleted and only a generic **derived** alert
  (*"Hypopyon Uveitis — urgent condition in the differential, match 76"*) would
  remain. An urgent alert still fired, so this is a **specificity** hole, not a
  missed red flag — but the golden test matched `/hypopyon/i` and a different,
  generic, probabilistic alert satisfied it while the deterministic safety
  wording was gone. `red-flag-wording.test.js` now pins all **10** hand-written
  urgent alerts by their exact, **non-derived** wording.
- **V8-11 (family history).** The entire family-history block could be disabled
  and the full suite passed — a device could ignore every recorded family
  history with a green build. `engine-history.test.js` now asserts each flag's
  token and a measurable differential change.

### Two limitations of the tool, both found by self-review and fixed

An analysis tool that is confidently wrong is worse than none, so both are on
the record:

1. **Precedence.** The `removed-condition` operator prefixes `false && `, which
   does not disable a condition with a top-level `||` (JavaScript binds `&&`
   tighter). Two `visit-store.js` survivors were equivalent by construction;
   the operator now skips such lines.
2. **Incomplete subset (V8-12).** The engine subset first omitted
   `engine-reachability.test.js`, so disabling the route-activation loop was
   reported as a **false hole** — that file catches it decisively. A mutation
   run against an incomplete subset manufactures holes that do not exist. The
   subset is now the full clinical-engine surface (15 files), and the two real
   holes above survived even *that*.

**Storage is now probed** (six scenarios: round-trip, do-save, new-record,
corrupt-index, missing-record, quota, corrupt-patients) — see the storage
subsection above for the two real holes it surfaced and the false 100% it
reported twice before it was strong enough to trust.

---

## 5. Clinical verification — what can and cannot be proven

This is the section where confidence must be withheld.

**Provable here, and proven:**

- The engine is **deterministic**: the same record produces byte-identical
  output across 20 consecutive runs, and across a knowledge base inflated 100×.
- Red flags fire on their triggers; alone, buried under reassuring normal
  findings, with the record full of garbage, against a hostile
  clinician-authored condition built to suppress them, and inside a 50× KB.
- Red flags **stay silent** on six routine presentations (new).
- No input produces a non-finite probability or leaks `NaN`/`undefined` into
  clinician-facing text — verified against `Infinity`, `NaN`, `1e400`, dates in
  the year 275760, a megabyte of free text and regex bombs.
- The differential is ordered, with the urgent sort nudge bounded to its
  declared 0.08 and applying only across the urgent boundary.

**Not provable here, and not claimed:**

- **Whether any condition, threshold or alert is clinically correct.** 394 of
  394 conditions, 48 thresholds and 18 red-flag rules are `UNVERIFIED`. The
  tests hold the engine to what the knowledge base says; they cannot judge it.
- **Sensitivity and specificity are unmeasured**, because there is no labelled
  dataset. Phase 8 asks for false-positive and false-negative analysis; without
  ground truth, the honest answer is that the false-positive *direction* is now
  tested structurally (§4) and the *rates* are unknown.
- **The boundary matrix in §7 of the brief is partially built.** Threshold,
  just-below and just-above cases exist for IOP, C/D and Van Herick via
  `clinical-thresholds.test.js`; they do not exist for every pathway, and
  inventing the missing expectations would be fabricating clinical content.
  Logged as test debt, marked as requiring the founder.

---

## 6. Data integrity, offline, sync, migration, security

| Area | Evidence | Verdict |
|---|---|---|
| Create/read/update/delete | Behavioural tests on the real storage layer | **Proven** |
| Corrupted record | Truncated, wrong-shape, mid-store damage → reads as corrupt, writes blocked, bytes quarantined | **Proven** |
| Interrupted write | Quota failure mid-clinic → reported, not swallowed; unsaved data not readable | **Proven** |
| Concurrent modification | Two writers on both layouts; overwritten version preserved, clinician told, audited | **Proven** |
| Large datasets | 5,000 visits benchmarked; 10,000 findings and every registered token at once | **Proven** |
| Migration + rollback | Undeclared-store refusal, snapshot restore incl. ledger, throwing migration | **Proven** for synthetic migrations |
| Offline operation | Full exam verified in a real offline browser; engine loads no network module | **Proven** |
| Sync failure paths | Merge, conflict, tombstones, PHI gate, pagination — unit level | **Partial** — see below |
| Encryption at rest | Real crypto; asserts the actual bytes on disk contain no clinical text | **Proven** |
| Secret handling | API key vault-wrapped; LLM payload pinned to age + sex only | **Proven** |

**The synchronisation gap is the significant one.** Every sync test is a unit
test against stubbed `fetch`. **No test has ever executed against a live
server.** Authorization (row-level security), tenant isolation, and API contract
conformance are asserted in SQL and in documentation — they have never been
*executed*. Phase 8 §12 asks for contract testing; there is none.

That is the largest untested surface in the product, and it is untested because
it needs infrastructure that does not exist yet, not because it was overlooked.

---

## 7. Flaky-test audit

The suite was run **5 times consecutively**, and the two timing-dependent tests
plus the randomness-using test were run individually 10 times each.

**Result: zero flaky tests observed.** 1,164 tests passed on every run.

- The two `PERFORMANCE:` tests carry generous margins (engine work bounded well
  below its measured cost). They are retained, not quarantined: they are the
  only automated guard against a scaling regression.
- The reconnect-jitter test uses `Math.random()` deliberately — it asserts a
  *statistical* property (40 samples, fewer than 8 collisions) with a margin
  wide enough that a genuine failure means the jitter is gone, not that the
  dice were unkind.
- 26 files build one fixture at module level. No order-dependent failure was
  observed, but the risk is real and is logged as test debt.

---

## 8. Quality scorecard

Scored against *what a clinical record system needs before it holds real
patients*, not against what a solo-founder product usually achieves.

| Dimension | Score | Justification |
|---|---|---|
| Unit testing | **8** | Broad, behavioural, meaningful assertions. 2 weak tests in 1,117. |
| Integration testing | **7** | Real modules composed in sandboxes; no live backend. |
| End-to-end testing | **7** | Was 5. `tools/e2e/patient-journey.js` now drives the FULL journey — register → examine → reason → save → complete → **reload** → retrieve → follow-up — in a real offline browser, 29 assertions across two journeys (adult + paediatric referral) incl. the carry-forward invariants. Not in the `node --test` gate (browserless), so run before release. |
| **Clinical validation** | **3** | Engine behaviour is well pinned; **clinical truth is entirely unverified** — 394/394 conditions unreviewed. This score cannot rise without the founder. |
| Security testing | **6** | Encryption, PHI gate, roles and escaping tested; authorization never executed against a server. |
| Data integrity | **9** | The strongest dimension. Corruption, quota, concurrency, migration, archival all behaviourally proven. |
| Offline testing | **9** | Verified in a real offline browser, including a 300-visit storage conversion. |
| Synchronization | **5** | Logic unit-tested; **no live path ever executed**. |
| Migration testing | **7** | Rollback and snapshot restore proven — on synthetic migrations only. |
| Failure injection | **8** | 46 adversarial attacks; quota, corruption, hostile input, forged files. |
| Performance validation | **6** | Measured and re-runnable; budgets not enforced by CI. |
| Regression protection | **7** | Every defect found this phase has a test. Source scrapes weaken it. |
| Test maintainability | **6** | 74 source-scraping tests are the drag. |
| Test reliability | **9** | Zero flakes in 5 full runs. |
| **Release confidence** | **5** | Adequate for a supervised pilot; not for unsupervised commercial use. |
| **Overall verification maturity** | **6.5** | Strong engineering verification; clinical validation barely started. |

---

## 9. Release gates

A release **must not proceed** if any of the following fails.

| Severity | Definition | Blocks release? |
|---|---|---|
| **BLOCKER** | Patient data can be lost, corrupted or silently altered; a red flag fails to fire; PHI leaves the device without consent | **Yes — always** |
| **CRITICAL** | A clinical output is wrong or misleading; encryption, authorization or audit is defeated; a migration is not reversible | **Yes** |
| **HIGH** | A workflow cannot be completed; a failure is silent; a recovery path does not work | **Yes** |
| **MEDIUM** | Degraded behaviour with a working manual route | No — fix within one release |
| **LOW** | Cosmetic, wording, non-clinical | No |
| **INFORMATIONAL** | Test debt, documentation | No |

**Mandatory gate, every release:**

```
node --test                       must be 0 failures
node tools/stress/attack.js       must be 0 broken
node tools/audit.js               must be 0 FAIL
node tools/audit-test-quality.js  serious findings must not increase
node tools/e2e/patient-journey.js must be 0 FAILED   (needs the bundled browser)
```

**Before any release that touches the engine or the knowledge base:**
`node tools/mutation-test.js --target engine` — every **real hole** (equivalent
mutants excluded) must be closed or explicitly accepted in writing. Likewise
`--target storage` before a release that touches persistence.

**Never gated on:** total test count, or coverage percentage. Both are
trivially inflatable and neither is evidence.

---

## 10. Critical defect register

Defects found **during this phase**, all fixed unless stated.

| ID | Sev | Subsystem | Defect | Found by | Status |
|---|---|---|---|---|---|
| V8-1 | **CRITICAL** | Vault | Enabling encryption left every per-visit record in plaintext on disk while reporting the device encrypted, and made those records unreadable | Browser probe during the storage split | **Fixed**, 7 regression tests |
| V8-2 | **HIGH** | Engine | Flashes+floaters alert would fire on either symptom alone, naming a finding the patient did not report | **Mutation testing** | **Fixed**, 15 tests |
| V8-3 | HIGH | Migrations | A migration writing an undeclared store wrote outside the rollback snapshot; undo was a silent no-op | Stress harness | **Fixed** |
| V8-4 | HIGH | Migrations | The documented "restore from the pre-migration snapshot" path had no implementation | Stress harness | **Fixed** |
| V8-5 | HIGH | Storage | The parse cache made a quota-failed write readable as though persisted | Stress harness | **Fixed** (cache removed) |
| V8-6 | HIGH | Engine | Inherited object properties were read as clinical exclusion rules — 4 correct conditions became 1 unrelated one | Stress harness | **Fixed** |
| V8-7 | MEDIUM | Tests | The concurrent-writer test scraped source and broke on a refactor while behaviour was intact | This audit | **Fixed** (behavioural) |
| V8-8 | MEDIUM | Tooling | The benchmark reported a mean, so one GC pause was quoted to the founder as a measurement | Founder challenge | **Fixed** (median + p95) |
| V8-9 | LOW | UI | The archive screen stated a storage ceiling ~60% higher than measured | This audit | **Fixed** |
| V8-10 | MEDIUM | Engine | The hand-written "Hypopyon present — URGENT referral" alert could be deleted and only a *generic derived* alert ("Hypopyon Uveitis, match 76") would remain — an urgent alert still fired, so no safety failure, but the specific deterministic wording was gone and every test still passed | **Mutation testing (wider run)** | **Fixed**, `red-flag-wording.test.js` (11 tests) pins all 10 hand-written urgent alerts by exact, non-derived wording |
| V8-11 | LOW | Engine | The entire family-history block could be disabled and the full suite still passed — a device could ignore every recorded family history (glaucoma, RD, diabetes) with a green build | **Mutation testing (wider run)** | **Fixed**, `engine-history.test.js` (9 tests) |
| V8-12 | INFO | Tooling | The mutation tester's engine subset omitted `engine-reachability.test.js`, manufacturing a FALSE hole (the route-activation loop, caught decisively by that file). An incomplete subset invents holes that do not exist — the same false confidence, inverted | This audit, self-review | **Fixed** — subset is now the full clinical-engine surface |
| V8-13 | LOW | Storage | `visitRecordSave`'s "add a new visit to the index" branch was untested; a mutation crashed it and the visit was never indexed. Currently unreached in production (`doSave` always loads the record first) but public, documented, defensive code | **Storage mutation testing** | **Fixed**, `visit-store.test.js` |
| V8-14 | MEDIUM | Storage | A mutation of the corruption guard made a **healthy chart read** spuriously flag the visit index as corrupt — which would block writes and alarm the clinician (a save refused right after opening a chart). The guard's correctness was untested | **Storage mutation testing** | **Fixed**, `visit-store.test.js` — checks the flag with no masking read |
| V8-15 | INFO | Tooling | The storage mutation probe reported a false **100%** twice (no scenario added a new visit; the round-trip's trailing clean read masked the corruption flag). A probe is only as complete as its scenarios | This audit, self-review | **Fixed** — probe gained a new-record scenario and an unmasked corruption check |

---

## 11. Test debt register

Not defects. Work that should happen, ranked.

| # | Item | Why | Effort |
|---|---|---|---|
| 1 | **Live-backend contract tests** | The largest untested surface: authorization and tenant isolation have never executed | 40 h + infrastructure |
| 2 | ~~Automated end-to-end patient journey~~ | **DONE** — `tools/e2e/patient-journey.js`. Remaining: wire it into a browser-capable CI stage so it runs unattended, and the paediatric red-flag-referral journey is done too | 4 h (CI wiring only) |
| 3 | Convert ~40 source scrapes to behavioural tests | They break on refactors and can pass on real bugs | 24 h |
| 4 | Boundary matrix for every clinical pathway | §7 of the brief; **needs the founder** for expected outcomes | founder-gated |
| 5 | Widen mutation testing beyond the current samples | engine (120 mutants) and storage (40) are probed; the vault, sync-merge and archive logic are not yet — each needs its own probe scenarios | 20 h |
| 6 | Per-file fixture isolation (26 files) | Removes order-dependence risk | 12 h |
| 7 | Cross-role visibility adversarial tests | Student/faculty boundaries asserted, not attacked | 16 h |
| 8 | Performance budgets enforced in CI | Currently measured, not gated | 8 h |

---

## 12. The final questions, answered bluntly

**Can we prove Entopic is functioning correctly?**
We can prove it functions **as specified**. We cannot prove the specification is
clinically correct, because no clinician has verified it.

**Where are we relying on assumptions rather than evidence?**
Three places. Synchronization correctness against a real server. Authorization
and tenant isolation. And every clinical value in the knowledge base.

**What remains clinically unvalidated?**
All of it: 394 conditions, 48 thresholds, 18 red-flag rules, and the wording of
every alert.

**What remains technically unvalidated?**
Live sync, live authorization, multi-day sessions, real power failure, and
behaviour on a genuinely low-end clinic device.

**What could still fail despite the tests?**
A clinically wrong rule that the engine executes perfectly. The tests would all
pass.

**The single most dangerous untested pathway?**
**Cloud synchronization against a live server.** It is the only path that can
move one clinic's records to another clinic, and it has never run outside a
stub.

**The highest-risk regression?**
A change to the knowledge base or scoring that quietly alters a differential.
Golden vignettes cover a handful of presentations out of a very large space.

**Would you approve a pilot deployment?**
**Yes — supervised, with a named clinician reviewing every output, on
non-critical cases, with cloud sync off.** The offline path and the storage
layer are genuinely solid.

**Would you approve handling real patient records?**
**Yes for local, encrypted, single-device use with backups.** **No with cloud
sync on**, until §11 item 1 exists.

**Would you approve a commercial release?**
**No.** Not because the engineering is weak — it is better than most products at
this stage — but because a clinical decision-support tool whose clinical content
has never been reviewed by a clinician cannot be sold. That is a
clinical-governance blocker, not a testing one.

**What evidence would still be required?**
1. Founder sign-off on the conditions, thresholds and red-flag wording.
2. Live-backend authorization and tenant-isolation tests.
3. An automated end-to-end patient journey.
4. A validation set with known outcomes, to give sensitivity and specificity
   any meaning at all.

---

## 13. Exit criteria

| Criterion | Status |
|---|---|
| Existing tests audited | **Done** — mechanically, all 1,117; hand-checked for every finding |
| Critical uncovered behaviours identified | **Done** — §3, §4, §6 |
| Critical tests added | **Done** — 15 new tests in this phase (`alert-specificity`), on top of the 37 added with the storage change immediately before it |
| Clinical reasoning has adversarial coverage | **Done** — 46 attacks + mutation testing |
| Patient-data integrity tested | **Done** |
| Offline behaviour tested | **Done** |
| Synchronization failure tested | **Partial** — unit level only; **live paths never executed** |
| Migration safety tested | **Done** for synthetic migrations |
| Security boundaries tested | **Partial** — local proven, server-side never executed |
| Major workflows have end-to-end coverage | **DONE** — `tools/e2e/patient-journey.js`, two real-browser journeys with reloads (29 assertions: adult dry-eye/RAPD + paediatric leukocoria referral). Runs outside the browserless `node --test` gate; run before release |
| Student/faculty verification | **Partial** — functional, not adversarial |
| Weak/misleading tests identified | **Done** — 74 source scrapes, 2 serious |
| Flaky tests addressed | **Done** — zero observed in 5 full runs |
| Release gates defined | **Done** — §9 |
| Critical regression suite exists | **Done** — the four gate commands |
| All relevant tests pass | **Done** — 1,164 / 0 failures |
| Remaining uncertainty documented | **Done** — §5, §11, §12 |

**Phase 8's remaining gap is now a single criterion, named rather than glossed:**
nothing has executed against a live backend, so authorization and tenant
isolation are asserted but never run (§11 item 1). End-to-end workflow
automation — previously the other gap — is now done (`tools/e2e/patient-journey.js`).

**Entopic is not "fully tested", and this document does not claim it is.**
