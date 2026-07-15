# Entopic — Offline-First Ophthalmic Clinical Decision Support & EMR

**Entopic** is a browser-based clinical copilot for optometrists and
ophthalmologists. It documents the full eye exam, runs a **deterministic,
inspectable diagnostic engine** over a **282-condition knowledge base**, tells
the clinician **what to check next** to narrow the differential, and produces
print-ready reports and prescriptions — all **offline, with no server and no
build step**.

> ⚕️ **Advisory only.** Entopic supports a clinician's judgment; it never
> replaces it. Every suggestion is a ranked possibility requiring clinical
> correlation — not a definitive diagnosis. Urgent safety alerts (red flags)
> are un-suppressible and always fire.

---

## Table of contents

1. [What Entopic is (and is not)](#what-entopic-is-and-is-not)
2. [Quick start (2 minutes)](#quick-start-2-minutes)
3. [The exam workflow](#the-exam-workflow)
4. [How the diagnostic engine works](#how-the-diagnostic-engine-works)
5. [The diagnostic refinement loop](#the-diagnostic-refinement-loop)
6. [Safety model (red flags & guardrails)](#safety-model-red-flags--guardrails)
7. [Knowledge base & the founder review flow](#knowledge-base--the-founder-review-flow)
8. [Optional: Claude API and cloud sync](#optional-claude-api-and-cloud-sync)
9. [Data, privacy & backup](#data-privacy--backup)
10. [Project layout](#project-layout)
11. [Development & testing](#development--testing)
12. [Troubleshooting](#troubleshooting)
13. [Build facts](#build-facts)

---

## What Entopic is (and is not)

**It is:**

- An **offline-first EMR** for the ophthalmic exam — a 22-step flow covering
  history, refraction, slit lamp, IOP, gonioscopy, fundus, binocular vision,
  neuro, investigations, diagnosis, plan, coding, report and prescription.
- A **transparent (glass-box) diagnostic engine**. It converts what you enter
  into *tokens*, scores every condition on matched required / supportive /
  contradicting / test evidence, and shows the full evidence trail for each
  differential. Nothing is a black box — you can see exactly why a condition
  ranked where it did.
- A **clinical safety net**. A separate, un-suppressible red-flag layer fires
  urgent alerts (sudden vision loss, flashes + floaters, IOP > 40, RAPD, etc.)
  regardless of the differential.

**It is not:**

- **Not an autonomous diagnostician.** It ranks possibilities; the clinician
  decides. It never presents an output as a definitive diagnosis.
- **Not dependent on an LLM for diagnosis.** Any AI use is strictly
  *downstream* — drafting interpretive prose or parsing dictated free text. The
  diagnostic reasoning is 100% deterministic and reproducible in code.
- **Not dependent on the network.** The engine runs with the network fully off.
  The optional backend only syncs, backs up and authenticates.

---

## Quick start (2 minutes)

Entopic is a static web app — there is nothing to install or compile.

1. Keep the folder structure intact (see [Project layout](#project-layout)).
2. Open **`index.html`** in **Google Chrome** (recommended) or any modern
   Chromium/Firefox/Safari browser.
3. On first launch, choose **Create new account** and enter your name,
   credentials, clinic name, and a username/password. This account lives in
   your browser only.
4. You land on the Dashboard. Click **+ New Patient** to start an exam.

That's it — no server, no internet, no dependencies. To run it from a simple
local server instead of `file://` (optional, avoids some browser file-URL
restrictions):

```bash
# from the project root, any one of:
python3 -m http.server 8080      # then open http://localhost:8080
npx serve .                      # or any static file server
```

---

## The exam workflow

The exam is a **22-step flow** shown in the left sidebar; the center panel is
the current step, and the right **Advisory panel** updates live as you enter
data. Steps:

| # | Step | Highlights |
|---|------|-----------|
| 01 | Demographics | Patient registration |
| 02 | Chief Complaint | Free text + voice input + temporal selectors + 150+ symptom chips |
| 03 | Ocular History | Structured flags (CL wear, trauma, surgery…) |
| 04 | Medical History | Systemic flags + medication entry (auto-checks ocular side effects) |
| 05 | Family History | Glaucoma, AMD, and other heritable-risk flags |
| 06 | Visual Acuity | Click-to-select VA, age-adaptive chart recommendations |
| 07 | Refraction | Full Rx table with PD options |
| 08 | Dilation | Drug, time, eye, drops |
| 09 | Slit Lamp | Per-eye grading (SUN cells/flare, LOCS III, Van Herick, TBUT, Schirmer) + selectable findings + drawing tool |
| 10 | IOP | With method + CCT; auto-alerts for elevated values |
| 11 | Pupils | Size, reactions, RAPD with grading |
| 12 | Motility | Versions, ductions, saccades, pursuits, Hirschberg |
| 13 | Binocular Vision | Cover test, NPC, vergence ranges, AC/A, accommodation (Hofstetter), MAF/BAF, NRA/PRA, MEM, stereo, W4D |
| 14 | Gonioscopy | Shaffer grading per quadrant |
| 15 | Fundus | Per-eye disc/macula/vessels/periphery + selectable findings + drawing tool |
| 16 | Neuro | Colour vision, confrontation VF, Amsler grid |
| 17 | Investigations | OCT (RNFL, CST, GCC), visual field (MD, PSD), topography, pachymetry |
| 18 | Diagnosis | Full differential with evidence trails, risk calculators, next-test suggestions |
| 19 | Plan | Management with quick-add chips, referral with urgency |
| 20 | ICD-10 Coding | Auto-suggested from the differential |
| 21 | Report | Print-ready clinical report + referral letter generator |
| 22 | Prescription | Print-ready Rx with lens specifications + Complete Visit |

**Drawing tool** (Slit Lamp & Fundus): anterior-segment and fundus templates,
6 colours, 3 line widths, pen/eraser; saved to the visit record.

**Printing**: Report and Prescription pages render print-optimised layouts with
clinic header and signature blocks (UI chrome auto-hidden).

---

## How the diagnostic engine works

The engine re-runs automatically every time you change the exam. Its pipeline:

1. **Tokenize** — symptoms, history, measurements and exam findings become a set
   of canonical *tokens* (via a symptom dictionary and a
   finding→token map). Measurements derive tokens (e.g. IOP 48 →
   `IOP_very_high`).
2. **Normalize & weight** — temporal context (acute/chronic) is applied.
3. **Gate & route** — decision-tree gates surface conditions for consideration
   (e.g. "pain + photophobia → consider anterior inflammation"); routing limits
   scoring to relevant domains for speed.
4. **Score every candidate** — each condition is scored on the mix of matched
   evidence:
   - **Required** tokens dominate (a missing required token penalises hard).
   - **Supportive** and **objective test** tokens add saturating credit.
   - **Contradicting** tokens multiplicatively reduce the score.
   - Scores are normalised to 0–1 and are **deterministic** — identical input
     always yields identical output.
5. **Rank** — sorted by score, with a small **bounded urgent nudge** so a
   genuinely close safety-relevant condition surfaces first, but a barely
   scoring urgent condition can never bury a confident diagnosis.
6. **Present** — the Advisory panel shows a **Leading Impression** (top-ranked,
   with confidence and the advisory-only caveat), the ranked **Differentials**
   with evidence trails (*matched* / *need*), independent **Working Problems**
   when several unrelated problems co-exist, and a **flow map** ("Show
   Diagnostic Reasoning") visualising exactly how the engine reached its list.

Because scoring is transparent and reproducible, you can always inspect and
defend the reasoning — the design deliberately prefers calibrated,
inspectable logic over "model magic."

---

## The diagnostic refinement loop

Entopic does **not** hand back a single probabilistic verdict. It ranks a
differential and then tells you **what to check next** to narrow it — closing
the diagnostic loop:

- When two or more candidates genuinely compete, the engine computes the
  findings that would best **discriminate** them: confirm the leader, or rule
  out a close rival.
- The **"Narrow the Diagnosis"** section lists these, each showing what it
  *supports* / *argues against* and linking to the exam step where it's
  recorded (e.g. AC cells → slit lamp; purulent discharge → chief complaint).
- Clicking a suggestion jumps you there; entering the finding **re-runs the
  engine and the list refines**. Repeat, and the differential sharpens with
  each observation.

The recommender is fully deterministic and only suggests findings you can
actually enter. It stays quiet when one diagnosis already dominates (nothing to
discriminate), and never overstates confidence.

---

## Safety model (red flags & guardrails)

- **Red flags are un-suppressible.** Urgent alerts — sudden vision loss,
  flashes + floaters, curtain/field loss, IOP > 40/30, RAPD, bilateral disc
  swelling, hypopyon, rubeosis, leukocoria — are computed by a **separate**
  hard-rule layer that never depends on probabilistic scoring, gating, or
  differential order. They always fire.
- **Advisory only, human in the loop.** The "advisory only / clinical
  correlation required" framing is preserved throughout the UI and every
  generated report.
- **The LLM never diagnoses.** Diagnostic reasoning stays deterministic and
  inspectable in the engine + knowledge base. AI is only used downstream.
- **No fabricated clinical content.** AI-authored knowledge never invents
  citations, ICD-10 codes, statistics or thresholds; anything unverified is
  flagged `NEEDS_CLINICAL_REVIEW` for the clinician to confirm.

These invariants are enforced by the automated test suite (red-flag
un-suppressibility under heavy noise, determinism, LLM-privacy, etc.).

---

## Knowledge base & the founder review flow

The KB holds **282 conditions across 9 domains** (58 flagged urgent):

| Domain | Conditions |
|--------|-----------:|
| Retina | 58 |
| Surface & Lids | 51 |
| Cornea | 49 |
| Neuro-Ophthalmic | 42 |
| Anterior / Uveitis | 23 |
| Binocular Vision | 20 |
| Glaucoma | 19 |
| Lens | 12 |
| Refractive | 8 |

Curated conditions live in `knowledge/<domain>.js`; the AI-drafted expansion
lives separately in `knowledge/expansion.js` so it's easy to audit.

**Every AI-authored or edited condition is provisional** (`review_status =
NEEDS_CLINICAL_REVIEW`) until a clinician verifies it. The in-app **KB Editor**
(owner-only) provides the full review flow:

- A **Review Queue** lists everything awaiting verification, **urgent entries
  first** (their urgency flags are the riskiest thing to leave unreviewed).
- Clicking an entry opens it with live validation (dead tokens, contradictions,
  near-duplicates) and a preview of exactly what the engine will store.
- **"Mark clinically verified"** records the clinician's attestation (date +
  `VERIFIED_BY_CLINICIAN`) and persists it. Any later edit re-flags the
  condition provisional, so changed content is always re-reviewed.
- Verifications persist on-device and (when signed in as owner) sync to the
  cloud; **Publish** snapshots the whole KB as a new version other devices pick
  up.

`NEEDS_REVIEW.md` tracks the provisional backlog outside the app.

---

## Optional: Claude API and cloud sync

Both are **optional** — the engine and EMR work fully without them.

**Claude API** adds two downstream conveniences:
- *Interpretive remarks* — plain-language prose explaining the engine's output.
- *Speech parsing* — turning a dictated chief complaint into structured
  symptoms.

Enable via **Dashboard → Configure API Key** (key from
`console.anthropic.com`). Without a key, dictation still captures raw text and
the engine runs normally.

**Cloud sync (Supabase)** is an optional multi-device backend for KB
publishing, backup and owner authentication. It is **never** a runtime
dependency for running an exam. Setup and the security model (public read of
the KB, RLS-gated editor writes, tenant isolation) are documented in
`docs/CLOUD_SETUP.md` and `docs/SUPABASE_EXPLORATION.md`.

---

## Data, privacy & backup

- **Local by default.** Patient and visit data live in your browser's
  `localStorage`; nothing leaves the device unless you export it or explicitly
  enable cloud sync.
- **PII is kept separate** from clinical/analytics data, and **PII is never
  sent to any LLM** without explicit de-identification.
- **Backup:** Dashboard → **Export** downloads a JSON backup. **Import**
  restores it. Export regularly — `localStorage` is finite (~5 MB per origin).

---

## Project layout

```
entopic/
├── index.html                 ← open this
├── css/
│   └── entopic.css
├── js/                        ← app + engine (23 files)
│   ├── app.js                 ← boot, navigation, exam flow
│   ├── engine.js              ← the diagnostic engine (12-stage pipeline)
│   ├── data-model.js          ← visit/patient models, symptom chips
│   ├── storage.js, storage-mirror.js
│   ├── ui-pages.js, ui-pages-2.js, ui-sidebar.js
│   ├── ui-advisory.js         ← differentials + leading impression + next-tests
│   ├── ui-flowmap.js          ← glass-box reasoning map
│   ├── ui-report.js
│   ├── ui-kb-editor.js        ← owner KB editor + review queue
│   ├── kb-authoring.js        ← shared compiler + linter
│   ├── kb-remote.js           ← remote KB updates, local edits, bundles
│   ├── cloud-config.js, cloud-sync.js   ← optional Supabase
│   ├── claude.js, speech.js   ← optional downstream AI
│   ├── risk-calc.js, medication-checker.js,
│   ├── smart-intake.js, spectacle-advisor.js, drawing.js
├── knowledge/                 ← the knowledge base (16 files)
│   ├── surface.js corneal.js retina.js neuro.js binocular.js
│   ├── refractive.js glaucoma.js anterior.js lens.js
│   ├── expansion.js           ← provisional AI-drafted conditions
│   ├── medications.js icd-map.js
│   ├── token-dictionary.js    ← symptom → token map (185 entries)
│   ├── finding-token-map.js   ← exam finding → token map (172 entries)
│   ├── token-registry.js      ← generated token registry (529 tokens)
│   └── loader.js              ← assembles the KB (load LAST)
├── tests/                     ← Node test suite (23 files, 155 tests)
├── tools/                     ← dev tools (token-registry generator, KB audit, cloud seeder)
├── docs/                      ← CLOUD_SETUP.md, SUPABASE_EXPLORATION.md
├── README.md ARCHITECTURE.md CHANGELOG.md NEEDS_REVIEW.md CLAUDE.md
└── package.json
```

Scripts are loaded in dependency order by `index.html`; the knowledge domain
files load before `knowledge/loader.js`, which assembles `KNOWLEDGE_ALL`.

---

## Development & testing

Requires **Node.js 18+** (only for tests/tooling — the app itself needs no
Node).

```bash
npm test                       # run the full suite (155 tests)
node --test tests/*.test.js    # same, directly

node tools/gen-token-registry.js        # regenerate knowledge/token-registry.js
node tools/gen-token-registry.js --check # CI check: registry is up to date
node tools/kb-audit.js                  # KB health report
```

**Always regenerate the token registry after editing any KB tokens**, then run
the suite. The tests are the safety net and encode the guardrails:

- **Golden clinical vignettes** — input → expected differential + red flags.
- **Red-flag un-suppressibility** under heavy random noise.
- **Determinism**, **KB-wide reachability**, **cross-condition conflict**
  (no "junk" differentials), **token health**, **next-test recommender**,
  **LLM-privacy**, **escaping/XSS**, **storage round-trips**, and a
  **fuzz/stress** suite (thousands of random visits).

CI runs on every push (`.github/workflows/ci.yml`).

---

## Troubleshooting

**Blank page / nothing loads** — verify the folder structure is intact and all
files are present; open DevTools (F12) → Console for a missing-file error. If
opening via `file://` misbehaves, serve locally (see [Quick start](#quick-start-2-minutes)).

**No diagnostic suggestions** — enter at least one symptom on Chief Complaint;
the engine needs evidence to score.

**Voice button does nothing** — use Chrome and allow microphone access; Web
Speech support varies by browser.

**API key error** — keys start with `sk-ant-`; the engine works without one.

**Storage full** — export your data, then remove old patients; `localStorage`
is ~5 MB per origin.

---

## Build facts

- **282 conditions**, 9 domains, **58 urgent**; deterministic **12-stage**
  engine.
- **529 registry tokens** (428 reachable), **185** symptom-dictionary entries,
  **172** finding→token mappings.
- **155 automated tests** across 23 files; ~26k lines across app, KB, tests and
  tooling.
- **Zero runtime dependencies**, no build step, works fully offline.
- Browser: Chrome recommended; any modern browser supported.

---

**Version:** Entopic v1.1.0 · Knowledge Base v1.1.0

*Advisory clinical decision support. All diagnoses require clinical
correlation. Red-flag alerts are un-suppressible.*
