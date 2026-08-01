# Entopic — CTO Review for Commercial Launch

**Date:** 2026-08-01 · **Build:** 1.3.1 / KB 1.3.0
**Basis:** independent re-derivation from the repository. Prior review documents
were treated as claims to test, not findings to accept. Two of this review's
findings contradict earlier sessions' summaries.
**Method:** static analysis, adversarial browser probes against a running build,
and the test suite. Every number below is reproducible against this commit.

---

## 0. The six questions, answered directly

| Question | Answer |
|---|---|
| **Would you deploy this?** | **Yes — to one clinic, the founder's own, with him as the only clinician.** No further. |
| **Would you allow paying clinics to use it?** | **No.** Not until the knowledge base is clinician-verified and multi-user access control is server-enforced. |
| **Would you invest based solely on engineering quality?** | **Qualified yes** at seed stage — with the explicit caveat that engineering is not this company's risk. The clinical content is. |
| **Would you hire the engineering team?** | **Yes for the discipline; no as a complete team.** It is one AI-assisted contributor with no independent human review. That is a hiring gap, not a competence verdict. |
| **Would you approve handling real patient records?** | **Yes for a single-clinician device with encryption on. No for shared devices or multi-user clinics.** |

None of these are close calls, and none of the blockers are engineering
blockers. That is the single most important sentence in this report.

---

## 1. What the repository actually is

| Measure | Value |
|---|---|
| Application JavaScript | 28,990 lines across 71 files |
| Knowledge base | 17,023 lines, **394 conditions** |
| Tests | 10,049 lines, 64 files, **633 assertions passing** |
| Runtime dependencies | **zero** |
| Repository audit | **0 FAIL**, 1 warning |
| Engine performance | 394 conditions scored in **~1.5 ms** |
| Device capacity | ~3,000 patients / 9,000 visits before the localStorage ceiling |

Architecturally it is a browser-only, offline-first clinical tool: ordered
`<script>` tags, no build step, no framework, no server required to see a
patient. The backend (Supabase, per-clinic) exists only to sync, back up,
authenticate and audit.

**That architecture is a genuine and defensible commercial asset.** It is why a
clinic with no internet keeps working, why the company holds no patient data
under the current tenancy model, and why one person can support a national
footprint. It is not an accident and it should not be traded away lightly.

---

## 2. Findings from this review (not inherited from prior sessions)

### F-1 (CRITICAL, fixed this session) — 137 conditions were invisible to review

`knowledge/loader.js` stamped `NEEDS_CLINICAL_REVIEW` onto the **expansion
batch only**. The nine base domain files carry no `review_status` field at all,
so **137 conditions fell into a "curated" bucket and never entered the review
queue**.

Those 137 are the original, most commonly hit conditions. Verified in a running
browser: a routine dry-eye presentation returns three results — *Dry Eye Disease
(Evaporative)*, *Dry Eye Disease (Aqueous Deficient)*, *Exposure Keratopathy* —
and **all three were among the unflagged**.

The workspace displayed "257 needs review · 137 curated", which invites the
reading that the 137 had been checked. Nobody had checked them; they lacked a
field. **The honest worklist is 394, not 257** — 53% larger than the founder
believed.

Fixed: the loader now fails closed. Any condition without a review status is
unreviewed. The "curated" bucket is now empty, because it was never real.

### F-2 (HIGH, fixed this session) — the clinician could not see this

Nothing in the advisory panel indicated how much of the knowledge base had been
verified. Drafted, unreviewed entries were presented identically to
clinician-signed ones. One line now states it at the top of the differentials:
*"0 of 394 knowledge-base entries have been verified by a clinician."*

Deliberately one line, not a badge per row: at 394/394 unverified, per-row
marking is uniform noise that gets tuned out within a day, and alert fatigue on
a safety marker is worse than no marker.

### F-3 (CRITICAL, not fixed — cannot be fixed client-side) — total privilege escalation

Proven by browser probe. A **student** account:

```
role: "student"          isAdmin(): false        can("research_export"): false
CU.admin = true                                  ← one line
isAdmin(): true          admin panel renders     can("research_export"): true
users[0].admin = true; saveUsers(users)          ← persists across reload
loadPatients()  → every patient    exportAllData()  → reachable
```

`isAdmin()` is `CU.admin === true` (`js/roles.js:245`). The entire role system —
clinician / student / faculty / researcher / technician — is a **UI convenience,
not a security boundary**, and nothing in the product says so.

This is not a coding error; you cannot enforce authorization in code the
attacker controls. It is an **architecture consequence** that becomes a blocker
the moment a second person uses the same install. For a solo clinician on their
own machine it is irrelevant — they own the data anyway.

### F-4 (MEDIUM) — misleading precision in the differential

The same dry-eye probe returned three conditions at **identical probability
(0.6833)**, displayed as a ranked list with "68%" against each. The engine
cannot discriminate between them; the presentation implies it can. The printed
report handles this better (qualitative bands: "Moderate-High"), so the defect
is confined to the advisory panel.

### F-5 — two findings I probed wrongly and nearly reported as critical

I recorded that the printed report renders nothing and carries no advisory
framing. Both were false: my probe read `#mainContent`; the element is
`#mainEl`. The report renders (1,056 characters) and does carry advisory
framing.

Included because a false critical finding in a launch review costs more than a
missed one, and because it is the third time in this project that a probe
targeting the wrong field produced a fake defect. **Treat any single-probe
finding in this codebase as a lead, not a conclusion.**

---

## 3. Blockers, by decision

### Blocking a *paid multi-clinic* launch

| # | Blocker | Evidence | Effort |
|---|---|---|---|
| **B1** | **0 of 394 conditions clinically verified** | `review_status` audit, this build | 100–200 h **founder time**, not engineering |
| **B2** | Roles are not a security boundary | F-3, proven | 60–100 h (server-side enforcement) |
| **B3** | No independent human code review, ever | 100% of commits AI-authored | 40–80 h external |
| **B4** | No penetration test | absent from repo and docs | £8–15k external |
| **B5** | No regulatory determination | no classification, no clinical-safety file | legal/regulatory, not engineering |
| **B6** | No release infrastructure | no CDN, no versioned paths, no monitoring | 40–60 h |

### Blocking *single-clinician* production use

**None that are unmitigated.** The readiness panel blocks deployment on the real
ones (default admin password, encryption off, clinic mode off), and the failure
paths — corrupt store, storage full, concurrent windows — now preserve data and
say so.

### Explicitly NOT blockers

Code quality, test coverage, performance, offline behaviour, data-loss safety.
All measured and adequate. **Do not spend engineering money here.**

---

## 4. Investment view

**Would I invest on engineering quality alone? Qualified yes — while noting the
question is slightly wrong.**

What is genuinely good, with evidence:

- **Failure handling is better than most funded startups.** A corrupt store
  blocks writes and quarantines the damaged bytes rather than overwriting them
  (`js/storage.js`); a concurrent overwrite preserves the displaced version
  (`js/clinical-record.js`); a failed save raises a sticky banner rather than
  lying. Each was found by deliberate failure injection, not by hope.
- **The safety architecture is right.** Red-flag alerts fire from measured
  values and are un-gated by scoring. The LLM is strictly downstream of
  diagnosis. Both are enforced by tests, not by convention.
- **Zero runtime dependencies.** No supply-chain surface. Rare and valuable in
  health tech; worth saying out loud in diligence.
- **Fabricated clinical content was caught and removed.** A previous session
  invented OHTS/AREDS2 risk percentages; they were quarantined and a test now
  fails the build if any risk figure cannot be traced to a cited source
  (`tests/clinical-scales.test.js`).

What a diligence process would mark down:

- **394 conditions, 0 verified.** The product's core asset is unvalidated.
- **A single AI-assisted contributor and no independent review.** Two of the
  critical bugs fixed in the last 48 hours were introduced by earlier sessions
  of the same author. Self-review found them; that is fortunate, not systematic.
- **Roles presented as access control that is not access control** (F-3).
- **No regulatory position.** In most jurisdictions this is plausibly a Class I
  medical device. Nobody has determined that.

The honest framing for an investor: **the engineering is not the risk. The
clinical validation and the regulatory position are.** A term sheet should be
contingent on B1 and B5, not on code.

---

## 5. Would I hire the team?

**Yes for the working discipline; the team is not a team.**

Evidence of discipline worth hiring: bugs are reproduced before being fixed and
re-verified after; measurements replace guesses (a 96× performance fix came from
profiling *after* a wrong hypothesis about the cause); false positives from the
project's own tooling are caught and reported rather than passed off as
findings; failing-closed is chosen consistently on clinical paths.

The gap is structural, not personal: **every line was written by one
AI-assisted contributor with no second pair of eyes.** For clinical software
that is a governance failure regardless of output quality. First hire should be
a senior engineer with healthcare experience whose first month is spent
reviewing, not writing.

---

## 6. Top improvements by business impact

Grouped, because a flat list of 100 items is a worse planning artefact than a
ranked set of tiers. Effort in engineering hours unless marked.

### Tier 1 — Blocks revenue (1–8)

| # | Item | Effort |
|---|---|---|
| 1 | Verify the 394 conditions (founder clinical time) | 100–200 h founder |
| 2 | Server-enforced authorization; stop presenting roles as security | 60–100 h |
| 3 | Regulatory classification + clinical safety case | legal |
| 4 | Independent human code review of engine, storage, vault | 40–80 h external |
| 5 | Penetration test | £8–15k |
| 6 | Immutable versioned releases + rollback | 20–30 h |
| 7 | Onboarding that *blocks* on backup being demonstrated once | 15 h |
| 8 | Professional-indemnity position for advisory output | legal |

### Tier 2 — Blocks scale (9–24)

Browser tests in CI (20 h) · authenticated synthetic health check (10 h) ·
opt-in de-identified health beacon (30 h) · automated release job (20 h) ·
archival for practices past ~3,000 patients (40 h) · IndexedDB record store to
lift the 9 MB ceiling (80 h) · staged rollout to 5% first (15 h) · status page
(10 h) · restore drill automation (10 h) · sync conflict UI (25 h) · multi-device
sign-off sync (20 h) · KB update distribution UX (20 h) · per-clinic
configuration (30 h) · audit-log export for inspection (15 h) · session
management across devices (25 h) · support-facing diagnostics bundle (15 h).

### Tier 3 — Increases clinical trust (25–48)

Fix tied-probability presentation (F-4, 8 h) · calibration study of engine
probabilities against outcomes (founder + 40 h) · per-condition evidence grading
surfaced in the UI (30 h) · "why this ranked here" explanations on every
differential (25 h) · retrospective validation against 50 real records (founder
+ 20 h) · red-flag sensitivity study (40 h) · structured referral letters (30 h) ·
recall/follow-up scheduling (40 h) · image annotation on attachments (40 h) ·
visual acuity trend charts (20 h) · IOP trend with target-pressure tracking
(25 h) · medication interaction surfacing in-flow (20 h) · patient-facing
summary sheet (25 h) · consent audit export (10 h) · KB citation coverage
reporting (15 h) · condition-info completeness pass (30 h) · ICD verification
against a licensed source (25 h) · duplicate-merge workflow (30 h) · amendment
reason capture (10 h) · visit templates per clinic type (25 h) · configurable
exam step order (20 h) · offline print reliability (15 h) · report branding
(10 h) · multi-language support (60 h).

### Tier 4 — Efficiency and margin (49–72)

Rapid-capture mode for routine exams (60 h) · voice capture (80 h + API spend) ·
keyboard-first navigation (20 h) · bulk patient import (30 h) · optical-shop
integration (40 h) · appointment integration (40 h) · billing codes export
(25 h) · practice dashboard (30 h) · staff productivity view (20 h) · equipment
integration, autorefractor/tonometer (80 h) · OCT import (60 h) · tablet
optimisation (30 h) · dark mode (15 h) · print stylesheet refinement (10 h) ·
data export scheduling (15 h) · KB diff viewer for updates (25 h) · condition
search improvements (15 h) · quick-add from previous visit (20 h) · smart
defaults from clinic patterns (30 h) · exam completeness scoring (20 h) ·
teaching mode improvements (30 h) · OSCE expansion (40 h) · student progress
analytics (25 h) · faculty cohort management (30 h).

### Tier 5 — Long horizon (73–100)

Multi-tenant managed backend (150 h) · real-time collaboration (100 h) · mobile
app (200 h) · patient portal (150 h) · referral network (120 h) · research
collaboration tooling (80 h) · anonymised benchmarking across clinics (60 h) ·
prevalence publication pipeline (40 h) · KB contribution from clinicians (60 h) ·
peer review workflow for KB (50 h) · clinical trial recruitment support (60 h) ·
population health reporting (50 h) · payer integration (100 h) · teleophthalmology
(120 h) · AI image analysis, separately regulated (200 h+) · predictive recall
(60 h) · outcome tracking (60 h) · quality registries (50 h) · CPD integration
(40 h) · white-label (60 h) · API for third parties (80 h) · marketplace (100 h) ·
international regulatory (200 h+) · certification (ISO 13485 / IEC 62304, 300 h+) ·
formal verification of red-flag paths (80 h) · adversarial clinical testing
programme (60 h) · post-market surveillance (ongoing) · continuous KB currency
process (ongoing).

---

## 7. Effort to enterprise quality

| Destination | Engineering | Founder clinical | External | Calendar |
|---|---|---|---|---|
| **Single-clinician production** | ~40 h | ~20 h | — | **2–4 weeks** |
| **Paid multi-clinic SaaS** | 300–400 h | 100–200 h | £15–25k | **4–6 months** |
| **Enterprise / hospital** | 900–1,300 h | 250 h | £60–120k | **12–18 months** |
| **Regulated medical device** | +1,500 h | ongoing | £150k+ | **24–36 months** |

Two assumptions that dominate these numbers, stated so they can be challenged:
one full-time senior engineer plus the founder part-time; and the knowledge-base
verification is the **critical path** to paid launch, not the engineering. If
the founder can verify 20 conditions a week, B1 alone is five months and
everything else fits inside it.

---

## 8. What I would do in the first 30 days as CTO

1. **Stop calling roles access control.** Ship the honest statement this week.
   Cheapest, highest-integrity change available.
2. **Put the founder on KB verification, 10 hours a week, starting now.** It is
   the critical path and only he can do it.
3. **Hire the reviewing engineer.** Not to add features — to read.
4. **Get the regulatory determination.** It may change the roadmap entirely, and
   finding that out late is the most expensive possible outcome.
5. **Ship immutable releases + rollback.** Two weeks, and it makes every
   subsequent mistake survivable.
6. **Do not build features.** The product is more complete than it is validated.

---

## 9. The one-paragraph verdict

Entopic is a well-built, unusually careful piece of offline-first clinical
software with a genuine architectural advantage and a test suite that has
repeatedly caught real, patient-affecting defects — including two found and
fixed during this review. It is also a product whose central clinical asset,
394 knowledge-base conditions, has been verified by exactly nobody, and whose
role system is presented as access control while providing none. Neither of
those is an engineering problem, which is why more engineering will not fix
them. **Deploy it to the founder's own clinic now; sell it to no one until a
clinician has signed the knowledge base and a human other than its author has
read the code.**
