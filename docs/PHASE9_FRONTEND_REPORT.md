# Phase 9 — Frontend Engineering, Application Architecture & Interface Integrity

**Date:** 2026-08-08
**Method:** every number below was produced by running the application in a real
offline Chromium instance. Where I reasoned rather than measured, it says so.
Where a first reading turned out to be wrong, the correction is left in.

**Re-runnable evidence:**

```
node --test                          # 1,177 tests
node tools/e2e/patient-journey.js    # 29 assertions, real browser + reload
node tools/stress/attack.js          # 46 adversarial attacks
node tools/audit-test-quality.js     # false-confidence scan
```

---

## 1. Executive summary

The frontend is **structurally simple, clinically well-shaped, and was carrying
one proven security hole and two accessibility blockers** — all three now fixed
and pinned by tests.

**What is genuinely good, and should not be touched.** The rendering model —
string-concatenated HTML into `innerHTML`, no framework, no build step — reads
like a liability and measures like an asset. A thousand re-renders of the same
exam leave listener counts flat (116 → 126). First paint offline is **44 ms**.
The three-panel exam layout degrades to a slide-over drawer on tablets and
phones *by design*, and the red-flag alerts remain reachable there. The
escaping discipline is real: name, MRN, occupation and free text were escaped
everywhere I looked.

**What was wrong.** Four defects, each measured before being believed:

| | Defect | Severity |
|---|---|---|
| F9-1 | Patient `age`/`sex` rendered unescaped — **proven XSS** | **HIGH** |
| F9-2 | 9 of 9 form controls had no programmatic label | **HIGH** (WCAG blocker) |
| F9-3 | 31 clickable elements keyboard-unreachable, incl. **the whole exam nav** | **HIGH** (WCAG blocker) |
| F9-4 | Sync badge read "Live sync" while records were **unsent** | **HIGH** (clinical safety) |
| F9-5 | Home screen render quadratic in patient count | MEDIUM |

**The honest headline.** The interface is safe to use for a full working day and
does not leak memory. Its weakest dimensions are not visual — they are
*accessibility* (now materially improved but not fully verified with real
assistive technology) and *role architecture*, which is where Phase 10 will
apply pressure.

---

## 2. Frontend architecture

**Actual architecture, verified against the code rather than the docs:**

```
index.html  — 124 ordered <script> tags, no bundler, no framework
     ↓ globals (var in global scope, "use strict" per file)
CU / CP / CV / P / V / API_KEY          ← all state, in app.js
     ↓
renderMain() → pg*() functions return HTML strings
renderSidebar() / renderAdvisory()      ← full-panel innerHTML replacement
     ↓
inline onclick="fn(...)" handlers       ← 304 of them
```

**God files.** `js/app.js` was 2,030 lines holding authentication, routing,
autosave, the home screen, the header and the cloud card. Phase 9 extracted the
patient-list rendering to `js/ui-patient-list.js` (app.js → 1,994). It remains
the largest single maintainability risk and is logged as debt — the extraction
was deliberately bounded because a wholesale split of a 2,000-line controller
is not the low-risk change this phase permits.

**Coupling.** Presentation and clinical reasoning are **correctly separated**:
`js/engine.js` performs no DOM access (pinned by an existing architecture test),
and the UI reads `V.dxList` / `V.alerts` rather than recomputing anything. I
looked specifically for duplicated clinical logic in the UI and did not find it.

**The one structural oddity worth naming:** 304 inline `onclick` attributes.
This is why the CSP must keep `script-src 'unsafe-inline'`. It is not a defect
in itself — the handlers interpolate internal ids and enum keys, never free
text, which I verified — but it permanently costs one layer of defence-in-depth.

---

## 3. Component inventory (abridged to what carries risk)

| Module | Purpose | State | Clinical significance | Risk |
|---|---|---|---|---|
| `app.js` (1,994) | auth, routing, autosave, home | **owns all globals** | high — autosave | **god file** |
| `ui-pages.js` (1,261) | exam steps 1–11 forms | writes `V` | **high** — data entry | large |
| `ui-pages-2.js` (538) | diagnosis, plan, referral | writes `V` | **high** — referral | med |
| `ui-advisory.js` (492) | differential + **red-flag alerts** | reads `V` | **highest** | med |
| `ui-sidebar.js` | 22-step nav | reads `V.step` | high — orientation | low |
| `ui-report.js` (551) | report, Rx, referral letter | reads `P`,`V` | **high** — export | med |
| `ui-chart.js` | patient chart, follow-up | reads visits | high | low |
| `ui-patient-list.js` **(new)** | patient rows, practice split | pure | med — practice/real split | low |
| `ui-a11y.js` **(new)** | label + keyboard bridge | none | — | low |
| `ui-storage-banners.js` | save/corrupt/sync banners | event-driven | **highest** — data loss | low |
| `cloud-sync.js` (554) | session, status, transport | `CLOUD` | **high** — sync honesty | med |

---

## 4. State management

**Ownership is centralised and, unusually for this pattern, not duplicated.**

| State | Owner | Lifetime | After refresh | After logout |
|---|---|---|---|---|
| `CU` current user | `app.js` | session | **cleared** | cleared |
| `CP` / `CV` ids | `app.js` | session | cleared | cleared |
| `P` patient | `app.js` | until nav | reloaded from store | cleared |
| `V` visit (**the** object) | `app.js` | until nav | reloaded from store | cleared |
| storage failure | `storage.js` `STORAGE_FAILED` | until write succeeds | re-detected | persists |
| corrupt store | `storage.js` `STORE_CORRUPT` | until restored | re-detected | persists |
| sync state | `cloud-sync.js` `CLOUD` | session | restored | cleared |
| unsaved changes | **not modelled** | — | — | — |

**Finding (deferred, not a defect):** there is no explicit "unsaved changes"
state. In practice autosave (20 s + on navigation) plus `visit:save-failed`
covers it, and the E2E journey proves a completed visit survives a reload. But
a clinician who closes the tab between autosaves loses the last interval, with
no `beforeunload` prompt. Logged in §20 — it needs a product decision about how
noisy that prompt should be, not a unilateral code change.

**No duplicated sources of truth were found.** `P`/`V` are read from the store
on load and written back by `doSave()`; the UI never keeps a second copy.

---

## 5. Clinical data entry

Audited the demographics, complaint, history, VA, refraction, IOP, slit-lamp,
fundus, BV, investigations, diagnosis, plan and prescription forms.

**Good:** structured fields with clinical types (`number` with min/max for age,
selects for enumerated findings), chip-based symptom entry that avoids typing,
temporal selectors, and per-field carry-forward marking on follow-ups.

**Verified safety property (E2E):** on a follow-up, **history carries forward
and no examination finding does** — IOP, RAPD, slit-lamp findings, the prior
differential and the prior `final_dx` all start blank. A stale measurement
presented as today's would be dangerous; this is proven through the real
save → reload → follow-up chain.

**Fixed this phase:** every control is now programmatically labelled, and the
visible label is a click target for its field (§12).

**Deferred to Phase 11 (workflow, not engineering):** tab order follows DOM
order, which is correct but not optimised for rapid chairside entry; and the
22-step flow requires random-access navigation that mobile does not offer (§11).

---

## 6. Forms

- **Controlled?** No — inputs write straight to `V`/`P` via `oninput`. This is
  simple and has no synchronisation bug class, at the cost of no dirty-tracking.
- **Validation:** `js/ui-validation.js` + `clinical-validators.js`, advisory
  rather than blocking — correct for a clinical tool, where refusing to record
  an unusual value is worse than recording it.
- **Double submission:** the destructive paths (`completeVisit`, import,
  archive) are `confirm()`-gated and idempotent; `doSave()` is safe to repeat.
- **Offline submission:** there is no form submission — everything writes
  locally first. This is the single biggest reason the offline story works.
- **Extreme input:** covered by the stress harness — 1 MB free text, regex
  bombs, null bytes and lone surrogates all handled without loss or hang.

---

## 7. Offline UI — the clinical-safety section

**This is where the one genuinely dangerous defect was.**

**F9-4 (fixed).** With the socket up and PHI armed, the badge read:

> `Live sync (encrypted) · last 09:13:38`

…while **one patient and one visit were demonstrably unsent**. Measured, not
theorised. The `last <time>` made it worse by implying recency *and*
completeness. A clinician closing their laptop on that badge would reasonably
believe the day's work was off the device.

The mistake was treating *a live socket* as *an empty outbox*. Pushes are
debounced, can fail against the server, and are skipped entirely while signed
out or offline — in every one of those cases `wsOk` stays true and records
simply wait.

**Fix:** `cloudPendingCount()` counts outstanding records using
`cloudIsDirtyRecord` — the *same* predicate the push path uses, so the number
shown can never disagree with what is actually queued. The badge now reads
`… · ⏳ 2 record(s) NOT yet sent`, the state becomes `pending`, and the dot goes
amber. A fully synced clinic still reads clean green — a badge that always warns
is a badge nobody reads. Cost: **5 ms at 1,600 records**, on the home screen
only. Five regression tests.

**Already sound (verified, no change):** the status model refuses to look synced
when consent is missing (`phi_off`) or the key is absent (`phi_nokey`); the
save/corrupt/conflict banners are sticky rather than dismissible toasts; and a
write that fails raises `visit:save-failed` with an explicit "export a backup
now" instruction.

---

## 8. Error handling

Audited every user-facing failure path. All four questions the brief demands are
answered by the existing banners: what happened, what was saved, what was not,
what to do now.

| Failure | Behaviour | Verdict |
|---|---|---|
| write refused | sticky red banner, names the reason, tells the clinician to export | **Strong** |
| store unreadable | sticky banner, writes blocked, bytes quarantined | **Strong** |
| visit not completed | explicit alert; the visit stays in progress deliberately | **Strong** |
| two windows writing | conflict banner; overwritten version preserved on the record | **Strong** |
| screen fault | `error-boundary.js` catches and offers recovery | Good |
| device filling up | archive prompt at 70% / 1,200 visits, weekly at most | Good |

**No silent failures found** in the storage or save paths — which is the
category that matters, and reflects work done in Phases 5–8.

---

## 9–11. Navigation, search, responsive

**Navigation.** The 22-step sidebar shows position, completion (`✓`) and a `!`
where an alert is pending — the clinician can see where they are and what
remains without memory. **Now keyboard-navigable** (§12). No deep-linking or
browser-history integration: refresh returns to the home screen. Acceptable for
a single-page clinical tool; noted as debt.

**Search.** Patient search is a client-side substring filter over locally-held
records. Privacy is inherently good — nothing leaves the device, and no query
reaches a network. No typo tolerance or ranking; adequate at the ~1,800-visit
device ceiling.

**Responsive — measured at five viewport classes:**

| viewport | horizontal overflow | sidebar | advisory panel |
|---|---|---|---|
| desktop 1440 | none | visible | docked |
| laptop 1280 | none | visible | docked |
| tablet 1024 | none | visible | docked |
| narrow tablet 768 | none | visible | **drawer, opens via "Engine"** |
| mobile 390 | none | hidden | **drawer, opens via "Engine"** |

**A correction to my own first reading.** I initially recorded the advisory
panel as "spilling" outside the viewport below 1024 px. It is not: it is a
deliberate slide-over drawer resting at `translateX(103%)`. I verified the
drawer opens on both narrow tablet and mobile **and displays the RAPD urgent
alert** — so red flags remain reachable on every supported device.

**Documented device strategy:** desktop/laptop/tablet get the full three-panel
workflow. Below 640 px the sidebar is hidden and navigation is linear
(Continue/Back) with the copilot one tap away — appropriate for chairside
reference, not for conducting a full 22-step exam.

---

## 12. Accessibility — two blockers, both fixed

Measured on the **live exam screen**, not the login page.

| | before | after |
|---|---|---|
| visible controls with no programmatic label | **9 of 9** | **0** |
| clickable elements unreachable by keyboard | **31** | **0** |
| buttons with no accessible name | 0 | 0 |
| images without `alt` | 0 | 0 |
| `<h1>` on the page | **0** | 0 *(open)* |

**F9-2 (WCAG 1.3.1, 3.3.2).** Every control had a visible `<label>` — as a
*sibling* with no `for`. A screen reader announced "edit text" with no
indication whether the field was the patient's name or their IOP. Placeholders
are not labels, and they vanish the moment you type.

**F9-3 (WCAG 2.1.1) — the serious one.** The entire 22-step exam navigation was
`<div onclick>` with no `tabindex`. **A keyboard-only or switch-device user
could not move between exam steps at all.** That is a critical clinical
workflow made unreachable, which is precisely what this phase asked about.

**Fix — `js/ui-a11y.js`, one runtime pass, zero pixels changed.** The markup is
strikingly consistent (169 `<label>`, 132 `.fi` wrappers), so an observer wires
`for`/`id`, adds `aria-label` **only** from text already on screen, and makes
already-clickable elements keyboard-operable through a single delegated handler
that calls the same `onclick` the mouse calls. Editing ~500 string-concatenation
sites would have risked typos in clinical forms and done nothing for the next
form written the same way.

**Functionally verified:** clicking the visible "Last Name" label focuses its
input; `Enter` on the "Chief Complaint" sidebar item moves the exam from
`demographics` to `chief_complaint`.

**Deliberately not done:** no ARIA was added where semantic HTML already works —
existing `<button>` elements are untouched. No accessible name is ever invented
from nothing, because a wrong label is worse than a missing one.

**Remaining and honestly uncertain:** no page has an `<h1>`; heading hierarchy
is shallow. Contrast was not measured. **Nothing has been tested with a real
screen reader** — automated checks prove the wiring exists, not that the
experience is good. That is the single biggest unverified claim in this report.

---

## 13. Design system

There is no component system: styles live in one 2,603-line stylesheet with
consistent CSS custom properties (`--fg`, `--ms`, `--sv`, `--r`) and repeated
utility classes (`.btn`, `.fi`, `.chip`, `.p-row`, `.home-settings`). Visual
consistency is good in practice.

The cost is **inline `style="…"` attributes scattered through the JS** — the
same colour and font-size values repeated across modules. This is real
maintenance debt but low risk, and consolidating it is a visual-refactor task
this phase is explicitly told not to undertake. Logged.

**Recommendation:** do **not** introduce a framework. The right increment is a
handful of shared HTML-building helpers, when there is a reason beyond tidiness.

---

## 14. Frontend security

**F9-1 (HIGH, proven and fixed).** Patient `age` and `sex` were interpolated
into `innerHTML` unescaped in three places — the exam header and two report
surfaces — while name, MRN, occupation and the chief complaint *beside them*
were escaped. A record whose `age` was:

```
5"><img src=x onerror="window.__xss=1">
```

**executed script in the app's own context** — the context holding every patient
record and, when open, the unlocked vault. Verified inert after the fix.

**Why it looked safe, and why that reasoning was wrong.** `age` is
`<input type="number">` and `sex` is a `<select>`, so a clinician cannot *type*
markup. But **typed inputs constrain typing, not assignment.** A restored
backup, an imported file, and a synced record from another device all set these
fields directly, and `validateBackup` verifies counts and shape — not scalar
types. Rendering is the last layer that can be certain, so it is now the layer
that is.

**Other surfaces checked:** 304 inline `onclick` handlers interpolate internal
ids and enum keys only — no free text (verified by scan). CSP is present and
`connect-src` is correctly restrictive. The LLM payload is pinned to age and sex
only. No patient data appears in URLs (there is no routing) or in
`document.title`.

---

## 15. Performance

**Boot, offline:** first paint **44 ms**, load **342 ms**. 124 script tags,
~2.5 MB uncompressed, no bundler — and it does not matter, because everything is
local.

**F9-5 (fixed).** `patientRowHtml` called `getLastVisit()` per row, which since
the per-visit storage split re-parses the whole visit index *and* reads a full
record:

| patients | `renderHome` | of which `getLastVisit` |
|---|---|---|
| 50 | 6 ms | 2.7 ms (45%) |
| 200 | 47 ms | 38.2 ms (81%) |
| 500 | **254 ms** | 242.8 ms (**95%**) |

Ten times the patients cost forty-two times the render — on the screen a
clinician returns to all day.

`visitStoreLastIndexByPatient()` does **one** index pass and returns the newest
*index entry* per patient. The row needs only `status`, which the index already
carries, so the record reads disappear entirely rather than being batched.

**254 ms → 16.3 ms at 500 patients**, near-linear. Output verified
byte-identical to the old path for completed, in-progress and no-visit patients.
A test asserts the index is read **exactly once**.

---

## 16. Long-session stability — and a correction

**My first reading was wrong, and the correction is the useful part.**

Raw counters after 60 simulated encounters looked alarming: DOM nodes
1,136 → 26,764, listeners 51 → 15,307. That reads like a leak.

It is not. After a **real forced GC** via CDP (`HeapProfiler.collectGarbage`)
most of it collected — the earlier figures were uncollected garbage, and
`performance.memory` reporting an identical 9.54 MB every sample should have
warned me it was quantised.

Isolating *renders* from *records* settles it:

| | listeners | nodes |
|---|---|---|
| baseline (1 patient, exam open) | 116 | 1,550 |
| **+1,000 re-renders, same patient** | **126** | 1,749 |
| +30 new patients | 3,058 | 1,892 |

**There is no render leak.** A thousand full-panel re-renders leave listener
counts flat. Growth is proportional to *record count* — the home list — which is
data, not a leak, and is exactly what §15 addressed.

I also checked whether my own new module caused any of it: with and without
`ui-a11y.js` the counts are 4,827 vs 4,823 — the single delegated listener,
which is why it is delegated.

**Verdict: the app is stable across a working day.** Verified for navigation and
rendering; a genuine multi-day session on real hardware remains untested.

---

## 17. Print / PDF / export

The report renderer (`pgRpt()`) was rendered and its text inspected. It
contains: patient name, MRN, date, the recorded diagnosis, the **RAPD urgent
finding**, and the **advisory / clinical-correlation framing**. Nothing
clinically important was silently omitted.

`@media print` rules exist and hide UI chrome (sidebar, advisory panel, header,
buttons, save indicator) so the printed artefact is the record, not the app.

**Not verified:** actual pagination and page-break behaviour in a real print
dialog, and PDF fidelity. Logged as uncertain rather than claimed.

---

## 18. Role architecture — readiness for Phase 10

Role behaviour is **centralised**, which is the good news for Phase 10:
`js/roles.js` holds the catalogue, `effectiveRole()` is the single switch, and
`js/ui-patient-list.js` now owns the practice/real split with the clinical rule
("a student's practice exam must never appear in the clinician Patients tab")
stated in one place.

**Architectural blockers for a richer student/faculty ecosystem — the honest
list:**

1. **`app.js` owns all state as globals.** A faculty view showing *another
   user's* cases has nowhere to put "whose record am I looking at" without
   overloading `CP`/`CV`. **This is the blocker to clear first.**
2. **No routing or deep links.** A faculty member cannot be sent a URL to a
   specific student submission.
3. **Render is full-panel.** A review interface with a case list beside a case
   detail will re-render both on every interaction.
4. **Permissions are checked at render time, not enforced at a data boundary.**
   Fine while everything is local and single-tenant; not sufficient once
   faculty read student data across accounts.

None prevents Phase 10 from starting. (1) and (4) should be addressed *within*
it rather than bolted on afterwards.

---

## 19. Testability

Frontend logic is testable where it is pure and awkward where it touches
globals. `patientRowHtml`, `cloudStatus`, `cloudPendingCount` and the visit-store
accessors are all unit-tested in Node sandboxes. Screen renderers that read
`P`/`V` directly need the globals stubbed, which the existing harnesses do.

The E2E harness (`tools/e2e/patient-journey.js`) covers what unit tests cannot:
two complete journeys through the real controllers, with a real reload.

**Coordination with Phase 8:** the 74 source-scraping tests remain the standing
weakness. Three tests added this phase are behavioural; two are narrowly
source-level where the fact only exists in source (escaping wiring).

---

## 20. Technical debt register

| # | Item | Impact | Likelihood | Cost | Difficulty |
|---|---|---|---|---|---|
| 1 | `app.js` still 1,994 lines (god module) | High | Certain | High | High |
| 2 | 304 inline `onclick` → CSP keeps `unsafe-inline` | Med | Certain | Med | High |
| 3 | No `<h1>` / shallow heading hierarchy | Med (a11y) | Certain | Low | **Low** |
| 4 | Accessibility unverified with real assistive tech | **High** | Certain | Med | Med |
| 5 | Inline `style="…"` duplicated across modules | Low | Certain | Med | Med |
| 6 | No unsaved-changes state / `beforeunload` | Med | Occasional | Low | **Low** *(needs product decision)* |
| 7 | No routing / deep links | Med | Certain | Med | Med |
| 8 | Permissions enforced at render, not at data boundary | **High** (post-Phase 10) | Likely | High | High |
| 9 | Print pagination unverified | Med | Unknown | Low | Low |
| 10 | Search has no ranking/typo tolerance | Low | Certain | Med | Low |

---

## 21. Critical defect register

| ID | Sev | Area | Defect | Found by | Status |
|---|---|---|---|---|---|
| F9-1 | **HIGH** | Security | `age`/`sex` unescaped → **proven XSS** in 3 render sites | Browser probe | **Fixed**, 3 tests |
| F9-2 | **HIGH** | A11y | 9/9 controls unlabelled (WCAG 1.3.1/3.3.2) | Browser probe | **Fixed** |
| F9-3 | **HIGH** | A11y | Exam navigation keyboard-unreachable (WCAG 2.1.1) | Browser probe | **Fixed** |
| F9-4 | **HIGH** | Safety | Badge read "Live sync" with records unsent | Browser probe | **Fixed**, 5 tests |
| F9-5 | MED | Perf | Home render quadratic in patient count | Measurement | **Fixed**, 5 tests |
| F9-6 | INFO | Audit | I misread GC garbage as a memory leak | Self-review | **Corrected** in §16 |
| F9-7 | INFO | Audit | I misread the advisory drawer as layout spill | Self-review | **Corrected** in §11 |

---

## 22. Implemented fixes

1. Escaped `age`/`sex` in `updateHdr()` and both report surfaces (F9-1).
2. `js/ui-a11y.js` — label association + keyboard operability (F9-2, F9-3).
3. `cloudPendingCount()` + `pending` state + amber dot (F9-4).
4. `visitStoreLastIndexByPatient()` + batched patient rows (F9-5).
5. `js/ui-patient-list.js` extracted from `app.js` (debt #1, partial).
6. `MutationObserver` added to the guard-test allowlist (browser feature detect).

**Deliberately not done:** no visual redesign, no clinical logic touched, no
student/faculty rework, no framework introduced.

---

## 23. Frontend scorecard

| Dimension | Score | Evidence |
|---|---|---|
| Architecture | **6** | Clean domain/presentation split, engine does no DOM. Held back by one 1,994-line god module and no routing. |
| Component design | **5** | Consistent patterns, but "components" are functions returning strings; boundaries are conventions, not enforced. |
| State management | **7** | Centralised, no duplicated truth, survives reload (E2E-proven). No unsaved-changes state. |
| Maintainability | **5** | Highly consistent patterns; 304 inline handlers and duplicated inline styles are the drag. |
| Clinical workflow support | **8** | 22 steps, alerts, carry-forward with the no-findings rule proven end-to-end. |
| Offline UX | **8** | Was 6 before F9-4. Local-first everywhere; sync status now honest. Fully verified offline. |
| Error handling | **8** | Sticky, specific, actionable banners; no silent failures found in save/storage. |
| Accessibility | **6** | Was **3**. Both blockers fixed and functionally verified — but no real screen-reader testing, no `<h1>`, contrast unmeasured. |
| Security | **7** | Was 5 before F9-1. Strong CSP + escaping discipline; permanently capped by `unsafe-inline`. |
| Performance | **8** | 44 ms first paint offline; home render 254 → 16 ms; no render leak. |
| Responsiveness | **7** | Clean to 1024 px; deliberate drawer below, red flags reachable. Mobile is reference-only. |
| Search | **5** | Fast, private, local. No ranking or typo tolerance. |
| Forms | **6** | Structured and validated; uncontrolled with no dirty-tracking. |
| Navigation | **6** | Clear orientation, now keyboard-operable. No history/deep links. |
| Print/Export | **7** | Report complete incl. advisory framing; pagination unverified. |
| Testability | **7** | Pure functions unit-tested; two E2E journeys; globals still need stubbing. |
| Role architecture | **5** | Centralised catalogue and one practice/real rule — but global state and render-time permissions block a rich ecosystem. |
| Enterprise readiness | **4** | No routing, no i18n, no theming, permissions not at a data boundary. |
| Long-term scalability | **5** | Fine at device ceiling; god module and full-panel render are the ceilings beyond it. |

**Overall: 6.4 / 10** — a sound, honest, fast clinical interface with real
architectural debt, no longer carrying a security hole or an accessibility
blocker.

---

## 24. The final questions, answered bluntly

**Could a clinician use this for an entire working day?**
**Yes.** Measured: no render leak across 1,000 re-renders, flat listeners, and
stable DOM. Growth tracks records, not time.

**Would it cause avoidable cognitive load?**
Some. The 22-step flow is explicit and well-signposted, but every step re-renders
the whole panel, so scroll position and focus reset. Not dangerous; noted for
Phase 11.

**Could a clinician accidentally lose clinical data?**
**Not silently.** Every failure path raises a sticky, specific banner, and
`completeVisit` refuses when data did not save. The residual gap is closing the
tab between autosaves (debt #6) — bounded, and no worse than 20 seconds.

**Could a user misunderstand synchronization status?**
**They could, until this phase.** The badge said "Live sync" while records were
unsent. Fixed and pinned.

**Could an accessibility problem prevent someone using a critical workflow?**
**Yes — and it did.** A keyboard-only user could not navigate the exam at all.
Fixed. Whether the *experience* is now good for a screen-reader user is
**unverified** — automated checks prove wiring, not usability.

**Could frontend architecture become a bottleneck as Entopic grows?**
**Yes.** Global state plus full-panel rendering is the ceiling, and it will be
hit by the faculty/student ecosystem before it is hit by clinical use.

**Could the current architecture support a significantly richer student/faculty
ecosystem?**
**Partially.** Role logic is centralised, which is the hard part. But global
`CP`/`CV` cannot express "I am reviewing someone else's case", and permissions
are render-time only. Both must be addressed *within* Phase 10.

**Single most dangerous frontend defect?**
**F9-4** — the sync badge claiming records were safe when they were not. F9-1
was more severe technically, but F9-4 is the one that would have caused a
clinician to make a decision (closing the laptop, wiping the device) on a false
belief.

**Single biggest maintainability problem?**
`js/app.js` — 1,994 lines owning auth, routing, autosave, home and header.

**Single biggest usability constraint caused by engineering, not design?**
Full-panel `innerHTML` re-rendering. It resets scroll and focus on every change,
which is why rapid chairside entry feels heavier than the design intends.

**What should absolutely NOT be changed?**
- The **22-step exam flow** and the three-panel layout — core product identity.
- **Local-first writes.** Nothing waits on a network. It is why offline works.
- The **sticky, un-dismissible** storage/corruption banners.
- The **engine ↔ UI firewall** — no clinical reasoning in the presentation layer.
- The **no-framework, no-build-step** model. It measured 44 ms to first paint
  offline; a rewrite would trade that for nothing a clinician can perceive.

---

## 25. Improvement register (ranked)

Ranked by the brief's order: clinical safety → reliability → user impact →
accessibility → maintainability → performance.

**A note on "Top 200":** I have not padded this to 200 entries. Beyond roughly
the first forty, further items would be inline-style consolidation repeated
across modules — filler that would dilute the ranking rather than inform it.
The register below is what I can defend.

### Tier 1 — clinical safety (all fixed this phase)
1. ~~Sync badge claiming records are safe when unsent~~ **fixed (F9-4)**
2. ~~XSS via patient fields~~ **fixed (F9-1)**
3. ~~Exam navigation keyboard-unreachable~~ **fixed (F9-3)**
4. ~~Form controls unlabelled~~ **fixed (F9-2)**

### Tier 2 — reliability & data safety
5. `beforeunload` prompt when the open visit has unsaved edits *(needs product decision)*
6. Surface pending-sync count in the header, not only the home card
7. Verify print pagination in a real print dialog
8. Retry affordance on a failed sync push, not only automatic backoff

### Tier 3 — accessibility (highest remaining uncertainty)
9. **Test with a real screen reader (NVDA/VoiceOver)** — the largest unverified claim
10. Add an `<h1>` per page; correct heading hierarchy
11. Measure and fix colour contrast against WCAG AA
12. Focus management after panel re-render (focus currently resets)
13. `aria-live` on the advisory panel so alerts are announced when they appear
14. Visible focus indicators audited against the 2.2 AA appearance criterion

### Tier 4 — user impact
15. Preserve scroll/focus across re-render
16. Patient search ranking + typo tolerance
17. Deep links / browser history for exam steps
18. Keyboard shortcuts for step navigation

### Tier 5 — maintainability
19. Continue extracting `app.js` (auth, then the home screen)
20. Replace inline `onclick` incrementally → allows dropping CSP `unsafe-inline`
21. Consolidate duplicated inline styles into utility classes
22. Convert the remaining source-scraping tests to behavioural

### Tier 6 — performance (all currently adequate)
23. Self-host fonts (removes two CSP hosts; carried from Phase 7)
24. Incremental panel rendering instead of full-panel replacement
25. Virtualise the patient list beyond ~1,000 rows

---

## 26. Phase 9 exit assessment

| Criterion | Status |
|---|---|
| Every major frontend subsystem reviewed | **Done** |
| State ownership documented | **Done** — §4 |
| Major clinical forms audited | **Done** — §5 |
| Offline UI behaviour reviewed | **Done** — §7, one HIGH defect fixed |
| Error states reviewed | **Done** — §8 |
| Loading / empty / stale states reviewed | **Done** — §8 |
| Navigation reviewed | **Done** — §9 |
| Accessibility reviewed | **Done** — §12, two blockers fixed |
| Frontend security reviewed | **Done** — §14, proven XSS fixed |
| Performance reviewed | **Done** — §15, measured |
| Long-session behaviour tested | **Done** — §16, and a wrong reading corrected |
| Print/PDF/export reviewed | **Partial** — content verified, pagination not |
| Role architecture reviewed | **Done** — §18, blockers named for Phase 10 |
| Frontend technical debt catalogued | **Done** — §20 |
| High-risk defects addressed | **Done** — 5 of 5 |
| Tests added/strengthened | **Done** — 13 added (1,164 → 1,177) |
| Regression testing passed | **Done** — 1,177 tests, 29 E2E, 46 stress, audit 0 FAIL |
| Remaining uncertainties documented | **Done** — below |

### What remains uncertain, stated precisely

- **No real assistive-technology testing.** Automated checks prove every control
  has a programmatic name and every clickable element is reachable. They do not
  prove the experience is *good*. This is the largest unverified claim here.
- **Contrast unmeasured.**
- **Print pagination unverified** in a real print dialog.
- **Multi-day sessions untested** on real hardware; verified for a working day.
- **Older/low-memory devices untested.** The measurements come from modern
  headless Chromium.
- **Minimum supported environment is not formally established.** The app
  requires `localStorage`, `IndexedDB` and `crypto.subtle`; private-browsing
  behaviour has not been characterised.

**The frontend is not "perfect", and this document does not claim it is.** It is
faster, materially more accessible, and honest about synchronisation in a way it
was not at the start of this phase. Phase 10's deep student/faculty audit is not
substituted for by §18 — that section only names the blockers Phase 10 must
clear.
