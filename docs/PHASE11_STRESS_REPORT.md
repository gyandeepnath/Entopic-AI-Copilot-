# Phase 11 — Maximum-level stress testing

**Date:** 2026-08-21
**Brief:** *"What is missing. I need each and everything that needs improvement
to be stress tested (max level) and improved."*
**Method:** attack the real modules, in a real browser where the question is
about pixels; measure before claiming; correct my own errors in writing.

---

## 1. The short version

**22 real defects found and fixed**, across eight areas that had **no
adversarial coverage at all** before this phase. Four of them could have harmed
a patient or published one; three were security holes; one was a 76× performance
loss hiding behind a benchmark that was measuring itself.

Two areas were stressed hard and found **sound** — that is a result too, and it
is recorded as one rather than quietly skipped.

| Gate | Before | After |
|---|---|---|
| Unit tests (`node --test`) | 1,241 | **1,301** |
| Adversarial attacks | 46 | **208** |
| Browser-driven checks | 77 | **171** |
| Stress harnesses | 1 | **10** |

---

## 2. What was missing, and why it was missing

Before this phase the adversarial harness covered storage, migrations, the
engine and the red flags. It did not touch:

- what leaves the device (de-identification, consent, exports)
- who gets in (credentials, the vault, the envelope)
- the clinical instruments beside the engine (scales, medications, OSDI)
- what a record turns into when it arrives from somewhere else (sync merge)
- what a knowledge-base value does when it reaches the screen (injection)
- what the clinician actually sees (red flags to painted pixels)

The pattern in the misses is worth naming: **each untested area was one the
tests could not reach without a browser, a hostile input, or a second device.**
Everything reachable by an ordinary unit test was already well covered.

---

## 3. The defects, worst first

### 3.1 A de-identified export could carry free text (6 defects)

The research corpus's defence was a whitelist of **fields**. It controlled which
keys were copied and said nothing about their **values**, while the module
header claimed the kept content was "tokens and labels only, never free text".

Symptom entries, slit-lamp finding labels and the referral destination were
copied verbatim. A string that never passed through a dropdown — from a restored
backup, a synced record, or a future free-text field — travelled intact into the
corpus and **out through `corpusExport()`**. Proven with a planted marker.

**Fixed:** values are checked against the same vocabularies the UI offers, and
anything unrecognised is **withheld**, with the count kept on the record so
denominators stay honest. The gate **fails closed** if a vocabulary is missing.

Also in the same path: `corpusCapture` **threw** on a malformed visit — and it
runs inside `doSave()`, so secondary analytics could fail the **clinical
record**. `sex` was republished free-form. A non-finite probability could reach
the corpus. An ICD field accepted any 12 alphanumerics, which a 12-letter marker
sailed through.

### 3.2 A polluted prototype fabricated a published risk figure (4 defects)

`scaleAnswers` returned plain `{}` objects. A polluted prototype answered every
required input as `true`: the incomplete guard was skipped and the evaluator
produced a **confident published risk figure for a patient whose scale had never
been filled in** — precisely the failure that module exists to prevent.

Same class, same day: a student could be granted `supervise` (the competency
sign-off gate) and `kb_authoring`; any signed-in account could be made an
**administrator** (`CU.admin === true` was satisfied by an inherited property);
and a **healthy store could be declared corrupt**, which blocks every save in the
clinic and looks exactly like data loss.

**Why it was missed for so long — the root cause is a lesson, not a footnote.**
The stress sandbox injected the *host realm's* `Object` into the VM context. An
object literal built inside the sandbox inherits the *sandbox realm's*
`Object.prototype`, so polluting the injected one left `{}` untouched:

```
injected host Object : ({}).PWN === 1  ->  false   (every attack vacuous)
native realm         : ({}).PWN === 1  ->  true    (attack is real)
```

Every prototype-pollution attack in the repo had been passing without reaching
the code. Fixing the sandbox exposed all four defects in one run. A test pins
the root cause so re-injecting them cannot silently disarm the class again.

### 3.3 Script injection on the clinical surfaces (6 sites)

**Proven, not theorised:** a crafted condition name set `window.__xss` from the
advisory panel — code running where every patient record and the unlocked vault
live.

Six sites, including **the clinical alert box**: the message was raw and the
*level* was interpolated straight into a `class` attribute, where an unescaped
quote breaks out into a new attribute. Alerts are the one surface this product
may never suppress, which makes them the highest-value place to inject.

Condition names, alert text and drug effects all come from the knowledge base,
which **user-authored overlays and published bundles both extend**.

### 3.4 A correct password was rejected after moving to a better browser

`authVerifyUser` always re-hashed with the strongest algorithm the *current*
browser offers. An account created on a device without WebCrypto is stored under
`fallback-v1`; open the same records in Chrome and the digests could not match.
**The clinician was locked out of their own patient records while typing the
correct password.** `adminVerify` had the identical defect.

**Fixed** so both directions hold at once: a weak stored hash still verifies on a
strong browser (portability), and a weak hash **never** satisfies a strong stored
credential (suppressing WebCrypto must not become a downgrade attack).

### 3.5 One patient's data could land under another patient's id (3 defects)

In `cloudMergeRows`, the envelope id says what a row is addressed to and
`rec.id` says what the payload claims to be. When they disagreed the row was
applied anyway. A hostile record id (`__proto__`, `constructor`, `toString`)
**crashed the whole batch**, so one bad id stopped every legitimate record in it
from syncing. A non-object payload threw the same way.

### 3.6 Garbage produced a confident "Severe Dry Eye" (5 defects)

`js/smart-intake.js` had **no test coverage at all**. The only check on a stored
OSDI answer was "not null and not undefined":

| input | old result |
|---|---|
| `"4","3","2"` (strings) | score **3600** |
| a `NaN` anywhere | **"Severe Dry Eye"** |
| an object | **"Severe Dry Eye"** |
| `1e9` in one item | score 2,083,333,333 → **"Severe"** |
| `-100` in one item | score −208.3 → **"Normal"** |

Every `<=` comparison against `NaN` is false, so a NaN fell through the entire
severity ladder to its final `else`. The negative case is worse in direction: it
**understated**, and understating is what sends a patient home.

### 3.7 "Penicillin allergy" read as a current prescription (2 defects)

Medication cues were only ever sought **before** the drug name, so the ordinary
way an allergy is written down was read as a current prescription — the app both
invented a drug exposure and lost the allergy. Separately, `h/o prednisolone`
read as current because the clause splitter breaks on `/`, destroying the `h/o`
past-use cue with the very split meant to protect it.

### 3.8 The benchmark was measuring itself (3 problems, one 76× win)

The benchmark never loaded `js/visit-store.js`, so **every figure it has ever
printed described the pre-Phase-8 path**. Its own `localStorage.key(i)` was
`Object.keys(mem)[i]` — O(n) where a browser is O(1) — which turned the whole
benchmark into O(n³):

```
O(n) key()  ->  visit-store split  443,971 ms   (7.4 minutes)
O(1) key()  ->  visit-store split       667 ms
```

**I nearly reported the first as a startup defect the founder would hit on his
first boot after upgrading.**

With the measurement honest, a real quadratic became visible: `saveStore` calls
`storageQuotaWatch()` → `storageUsage()`, which reads **all** of localStorage —
cheap once, expensive per record on every bulk write.

| `saveVisits` | before | after |
|---|---|---|
| 1,000 visits | 350 ms | **38 ms** |
| 3,000 visits | 2,933 ms | **119 ms** |
| 9,000 visits | 29,775 ms | **392 ms** |

And the honest numbers finally show the per-visit store doing its job, which the
old bench was hiding: `getPatientVisits` went from 170 ms to **5.3 ms** at 9,000
visits.

---

## 4. Two areas stressed hard and found sound

Recorded as results, not skipped.

**Red flags reach painted pixels.** 44 checks: for all nine reachable rules the
engine raises an alert *at the level the rule declares*, the alert is painted
into the advisory panel, and the painted element is genuinely visible. RAPD
still reaches the screen with the reasoning map hidden, the knowledge base
emptied, a store corrupt, an empty differential, the record full of control
characters, and buried under eight contradicting symptoms. The urgent box
renders **above** the differential.

**What leaves the clinic on paper.** 26 checks. An empty, whitespace, null or
undefined sphere never prints as "plano" — while an explicitly entered zero
still does. A cylinder without an axis is reported unfillable. A visit with no
refraction refuses to produce a print-ready prescription. The referral letter
carries the chosen urgency and does not drop an urgent finding. The generated
report still frames the engine as advisory. Certificates start as empty fields,
not pre-filled clinical claims.

---

## 5. My own errors

Fifteen of my first-pass "findings" were wrong. Every one is recorded in the
harness that made it, because **a safety harness that lies is worse than one
that does not run.**

| What I claimed | What was actually true |
|---|---|
| 33 privacy attacks clean | The sandbox had not loaded the vocabularies, so the gate withheld **everything** and every leak assertion passed for the worst possible reason. 10 positive controls now make that impossible. |
| A 12-char ICD check was enough | A 12-letter marker passed it. Replaced with the real ICD-10-CM shape, verified against all 297 KB codes. |
| Prototype pollution defended everywhere | The sandbox made the attack vacuous. Four real defects appeared the moment it was fixed. |
| All nine red flags invisible to the clinician | `#advEl` is a child of the exam page; the harness had never navigated there. |
| Leukocoria fires from a slit-lamp finding | It is the paediatric red-reflex field. I had also invented `curtain_shadow` and a `metamorphopsia` token. |
| Every red-flag rule must be urgent | Two declare `level: "warn"` and are warnings by design. The level is now **read from the rule**. |
| The referral letter omits urgent findings | The harness was not signed in and was reading the login screen. |
| A tombstone with `data:null` must delete | This app sends `data:{id,deleted:true}`; `null` means "could not be decrypted", and refusing to act on that is correct. |
| The backup round trip loses everything | The restore finishes in a promise chain; I was reading the store before it ran. |
| The visit-store split takes 7.4 minutes | 667 ms. The rest was my sandbox's O(n) `key()`. |

---

## 6. What still needs work

### Needs the founder (clinical authority)
1. **394 of 394 knowledge-base conditions remain clinically unverified.** Unchanged.
2. **48 thresholds and 18 red-flag rules are UNVERIFIED.** The rules fire correctly; whether the numbers are right is a clinical question.
3. **Whether a partially answered OSDI should show a severity at all.** The published formula permits it; at one answer of twelve it is arithmetically valid and clinically meaningless. The count is now reported so the UI *can* say — whether it *should* refuse below some threshold is a clinical call, and I have not invented one.

### Needs the backend
4. **Server-enforced authorization (ADR-010).** Every capability gate is UI-only. The pollution fixes closed the escalation paths, but a gate that hides a control is still not a boundary.
5. **Live backend contract tests** remain the largest untested surface. `cloudMergeRows` is now stressed against synthetic rows; nothing tests it against a real server.

### Engineering, not yet done
6. **15 source files still have no test reference** — mostly `-ui.js` presentation modules (`assignments-ui`, `certificates-ui`, `investigations-ui`, `osce-ui`, `simulation-ui`, `module-links`, `ui-age-brackets`).
7. **Simulation and OSCE scoring** have unit tests but no adversarial coverage; they produce student-facing marks.
8. **Real screen-reader testing** is still the largest unverified Phase 9 claim. Labels and keyboard operability were verified functionally; no assistive technology has been used.
9. **Print pagination** is unverified.
10. **`storageUsage()` is still O(total bytes)** — now throttled rather than eliminated. An incremental running total would remove it entirely; the throttle was the low-risk fix.

---

## 7. What this phase does NOT claim

- Entopic is **not** "fully tested". 208 adversarial attacks and 1,301 unit tests are a floor, not a proof.
- No clinical content was verified. This phase tested **machinery**, not medicine.
- The two "found sound" areas were stressed against their specification, not against a real clinic.
- Every performance figure is from this machine with a synthetic clinic. `js/perf-metrics.js` records the real device; that is the number that matters.
