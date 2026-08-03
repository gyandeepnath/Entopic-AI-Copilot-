# Changelog — Entopic

All notable changes are recorded here, newest first. Each entry says **what**
changed, **why**, and any **divergence** from `ARCHITECTURE.md` (which is a
strong hypothesis, not a contract — the code is the source of truth).

---

## 2026-08-02 — Phase 4 fixes: the alert gap closed, contradictions caught

**Every urgent condition now raises a banner — 63 of 63, up from 12.**

The gap I measured last entry is closed. Chemical Eye Burn, Open Globe Injury,
Retinal Detachment and 48 others could reach your differential with no Clinical
Alerts banner at all. They now raise one, stating the match strength so you can
triage between "this is very likely" and "this is on the list".

**The harder half was not creating alert fatigue**, and I measured that too: six
routine presentations — dry eye, refractive, allergy, asthenopia, floaters, red
eye — produce **zero** urgent banners. The easy version of this fix would have
put a red banner on every visit, which trains you to dismiss the one that
matters.

The 17 hand-written rules stay exactly as they are and keep their place at the
top. They fire on a *symptom*, before any condition is scored — earlier, and
better worded. The new derived rule is a floor beneath them, not a replacement.

**One number is yours to set.** `DERIVED_ALERT_MIN` decides how plausible an
urgent condition must be before it warns. I defaulted it to the same threshold
that decides whether a condition is shown at all — if it's confident enough to
display, it's confident enough to warn. That's an engineering default, not a
clinical finding, and the two knobs are deliberately separate so you can raise
the alert bar without hiding conditions from the differential.

**Contradictions are now caught.** The old checker looked at each value alone: is
this IOP plausible, is this axis in range. It could not see that a cylinder of
−1.25 with a blank axis is not a prescription — both halves look fine
individually.

Two classes, and the distinction is deliberate. **Errors** are definitional: a
cylinder with no axis, a prism with no base, a section recorded normal that also
carries findings, acute onset with a chronic course. **Questions** are clinical
judgement: a reading add at 14, pinhole improving with no gain in best-corrected,
both eyes identical across three fields. Each question names the legitimate
reasons, because you may well have one.

It never blocks entry, never edits a value, and never reaches the engine — a
contradiction is information for you, not a decision. And the tests that matter
most are the ones proving it stays quiet: an ordinary prescription, a plain
spherical prescription, an empty visit all raise nothing.

**The engine now says why it force-surfaced something.** "Shown because: Flashes
+ floaters → retinal tear / detachment" appears under the condition. It was
always computed — it was appended to the end of a string nobody reads. It's the
difference between "the engine listed retinal detachment" and "the engine listed
it *because of what you recorded*".

Two things caught by my own tests: a fixture I wrote was itself contradictory
(cylinders with no axis), and the checker flagged it — which is exactly its job.

812 tests pass, audit 0 FAIL.

## 2026-08-02 — Phase 4: the reasoning engine audited

Four documents. The engine is the strongest part of Entopic by a clear margin —
**8.0/10** — and one finding matters more than the rest.

**Your red-flag banner covers 12 of your 63 urgent conditions.**

Measured by feeding each urgent condition its own required findings and counting
alerts: 12 raise one, **51 do not**. The silent ones include Chemical Eye Burn,
Open Globe Injury, Retinal Detachment and Microbial Keratitis.

I want to be exact about what this does and does not mean, because the alarming
version would be wrong. For a chemical splash the panel shows **"Chemical Eye
Burn · URGENT"** as the leading impression — you are not blind to it. What never
appears is the dedicated **Clinical Alerts** banner at the top, the one designed
to be un-missable.

The cause is the same drift I have found three times now in this codebase: two
mechanisms that should agree, maintained separately. The alerts are 17
hand-written rules; the urgent flag is a field on 63 conditions. Nothing connects
them and nothing notices.

The fix is to derive a floor from the knowledge — any urgent condition scoring
above a threshold raises an alert naming itself — **in addition to** the 17
hand-written rules, which fire earlier and must stay. About 24 hours. The
threshold is your judgement.

**What is genuinely excellent**, and measured rather than asserted: the engine
is deterministic (20 identical runs, byte for byte), it explains every
differential (100% carry what matched, what is missing, what argues against),
and it **refuses to guess** — an empty visit and age alone both produce zero
differentials. That last one is the hardest behaviour to build and the easiest to
destroy, and it is written into the rule manual as something that may never
change without a recorded decision.

**Also found:** 129 hardcoded numeric thresholds live in the engine rather than
in reviewable knowledge — so signing off 394 conditions does not sign off the
numbers that decide when a measurement counts as abnormal. And nothing flags
contradictory data: a visit recording both acute onset and chronic course scores
through it silently.

**The validation manual says the thing worth repeating:** 779 automated tests
prove the arithmetic, the determinism and the safety separation. **Not one of
them establishes that a single differential is clinically correct** — that needs
a clinician, and it is not something software can assert about itself.

It also sequences the work: reviewing the **109 common conditions and the 63
urgent ones is about nine hours** and covers the overwhelming majority of real
encounters plus every red flag. The remaining 222 are the long tail.

**On AI** — the strategy is one line: keep the engine deterministic, and use AI
to check itself against it. Every serious clinical AI problem is solved by having
a deterministic core to verify against, and you already have one. The strategic
error would be treating it as the old thing AI replaces. It is the asset.

779 tests pass, audit 0 FAIL. Nothing in the engine was changed.

## 2026-08-02 — Built: your own conditions, wired into the engine (stages 1–3)

You can now write down a pattern you recognise, wire it to findings, watch it
behave, and see what it would have done to your own past visits — before saving
anything.

**The safety guarantee is structural, not a rule.** The engine ranks one list,
so simply adding your condition to it would let an "evening dryness" pattern
requiring flashes and floaters out-score retinal detachment and push it off the
screen. Instead the engine now scores your conditions in a **separate pass** and
places them **below every reviewed condition**, always. Verified in a browser: a
condition deliberately built to win, scoring 0.6, renders last — beneath a
retinal detachment scoring zero. They are never compared, so yours can never win.

**Urgent flags: you decided yes, and I built it your way.** I'd recommended
against it. You overruled me, which is your call — a clinician who recognises a
genuine local emergency should be able to act on it. It ships with the
mitigations I proposed alongside that concern: your urgent flag **adds** an
alert and never replaces one, core alerts are computed first and independently,
it appears labelled **"YOUR ALERT … not clinically reviewed"** with your name, it
requires you to say why, it auto-submits for review, and it's written to the
audit trail.

**Three things you can never do**, because each could hide a red flag: use
exclusions (the only rule that removes a condition from a differential — it's
stripped on save, not just refused), reuse the name of a shipped condition, or
edit reviewed content. Wanting to change a shipped condition is legitimate — it
becomes a proposal, not a local override.

**The preview, which is the part that prevents harm.** Beyond the wiring map and
the live test bench, there's now: *"Checked your last 200 completed visits. This
would have appeared in 34, and in 6 it would have scored higher than the
diagnosis you recorded at the time."* Then you can look at those 6. It reports
counts and never a verdict — whether 34 is too many is your judgement, not the
software's.

To make that honest, the engine now **stores the findings each visit was scored
from**. Without it the preview would have to re-derive them using today's rules,
which answers a different question and drifts as the knowledge base changes.

**Three real bugs the new tests caught in my own code:** deleting, submitting and
reviewing a condition all mutated a freshly-parsed copy and then saved a re-read
one, silently discarding every change.

779 tests pass, audit 0 FAIL.

## 2026-08-02 — Design: user-authored conditions (exploration, nothing built)

`docs/DESIGN_PERSONALISED_CONDITIONS.md`.

Your idea is the right one, and it is the most important product idea in the
project so far. It is also the most dangerous thing that could be built into
Entopic, and the whole difference is the safety model.

Worth noting: you have independently arrived at the contribution workflow I
designed in the Phase 3 Governance Manual, from the opposite direction. I got
there from "how does a knowledge base scale past one author?"; you got there
from "how does a clinician make this fit their practice?" That they converge is
a good sign it is the correct shape.

**The risk that shapes everything.** The engine ranks one list from one array.
Append a personal condition and it competes directly with core conditions — so a
clinician's own "evening dryness" pattern could out-score retinal detachment and
push it below the fold. Nobody would have done anything wrong, and a detachment
would be buried.

**The fix is structural, not disciplinary.** Run the engine twice — once over
core knowledge, once over the overlay — and merge with every core urgent
condition on top, always. A personal condition then cannot mathematically
outrank a red flag, because they are never ranked against each other. Costs
0.7 ms.

Also proposed: overlays may only ADD, never delete or exclude; users may never
set an urgent flag (that is a safety claim, and the governance manual says
safety changes are never delegated); every overlay condition is permanently
badged as unreviewed; and every visit records which knowledge produced its
differential, so a differential from two years ago can still be explained.

**The best part of your idea is the preview, and I would push it further.**
Beyond the wiring map: run the new condition against the clinician's own last
200 visits and tell them "this would have appeared in 34 differentials, and in 6
of those it would have ranked above what you actually diagnosed" — then let them
click through those 6. That is computable from data already stored, needs no new
capture, and turns an abstract edit into evidence about their own practice
before anything is saved.

~250 hours across four stages. Stage 1 (the safety foundation, no UI) is worth
doing first even if everything else waits.

**Three decisions are yours** and are listed at the end of the document: whether
to build it, whether to start personal-only, and whether a clinician may ever
set an urgent flag. **Stage 4 — publishing user-authored diagnostic logic to
other clinics — should not ship before ADR-011 has an answer**, because that
activity is precisely what determines how the product is regulated.

Nothing was built. 747/747 tests pass, audit 0 FAIL.

## 2026-08-02 — Structural gaps closed, education tier, and the knowledge audit

**Your ADR-012 decision is recorded**: hybrid self-serve provisioning now,
managed multi-tenant later. The record also lists the four things we must do
*now* so switching stays cheap — chiefly, don't hard-code single-clinic
assumptions, and keep the research corpus tenant-tagged.

**"Not assessed" is now a real clinical statement.** A blank field used to mean
three different things: examined and normal, deliberately skipped, or forgotten.
In glaucoma follow-up "gonioscopy not performed" and "gonioscopy normal" are
very different, and the record couldn't tell them apart. Four states per
section, "not done" carries a reason, and it's written to the audit trail —
choosing not to examine something is a clinical decision. The report now says
what was assessed, what was declined and why, and what has no record either way.

Two rules keep it safe: findings always outrank the flag, so a stale flag can
never hide something that's actually in the record; and the engine never reads
it, because "I didn't look" must never become "I looked and it was fine".

**Trends.** IOP, cup:disc, visual-field MD and RNFL over time, on the patient
chart. Drawn as plain SVG with no libraries, so it works offline. It shows the
numbers and stops — it does **not** tell you whether something is progressing.
That's a clinical judgement and getting it wrong in either direction is a safety
event. Missing measurements are skipped, never plotted as zero.

**A correction to my own Phase 2 review.** I reported "a follow-up starts blank".
That was wrong — it already carried history forward. The real problem was worse:
the copy was invisible, so a year-old medication list appeared as today's record.
It's now per-field and marked as carried, so you can see it and confirm it. And
examination findings never carry — not IOP, not VA, not slit lamp. Those are
measured today or not at all.

**The differential stops overstating itself.** A routine dry-eye case returns
three conditions scoring *exactly* the same; shown as a numbered list, the first
read as "most likely" when the engine was saying it can't separate them. Ties are
now shown as ties. And the number is no longer a percentage — it's a match score,
nothing has calibrated it against outcomes, and "75%" reads as a claim we haven't
earned.

**Education tier: competency framework and supervisor sign-off** — the two things
blocking a university adopting this. **It ships with an empty framework on
purpose.** I don't know the NCAHP competency list, and inventing one would be
worse than shipping none: a programme would assess students against a standard
corresponding to nothing they're accredited against. Faculty import their real
one. A student's claim is never an achievement until a supervisor signs it, and a
supervisor can agree a *different* level — that disagreement is the assessment.
The logbook carries no patient identifiers, because it travels outside the clinic.

**Phase 3 knowledge audit** — four documents. The headline: **not one of the 394
conditions carries any citation, source or reference.** Zero. The knowledge base
cannot answer "why does this rule exist?" for anything it contains. One file of
twenty-one does it properly (the AREDS scale, with DOI and the verbatim source
sentence) and that's the template everything else should follow.

The structure is otherwise genuinely clean: no duplicate conditions, no
unregistered tokens, complete ICD and narrative coverage, no contradictions
found. Nothing needs rewriting — the work is additive.

Knowledge score **5.8/10**, roughly 40% of the way to world-class. Two holes
dominate: no evidence layer, and no clinical verification.

**A caution about my own work.** Six of my measurement scripts produced
confident, entirely false findings this session before I checked them. The worst
concluded that 23 conditions — including Chemical Eye Burn and Open Globe Injury
— could never fire. I ran the engine before writing it down. They fire correctly;
my scan had simply missed a file. Had I reported it you'd have spent a day
investigating working emergency logic. Every number in these documents survived
that check, and the false finding is recorded so nobody re-derives it.

742/742 tests pass, audit 0 FAIL.

## 2026-08-01 — Phase 2: clinical review, and two more real bugs fixed

**Medication checker now understands "no".** "No steroids" counted as a steroid
history; so did "denies hydroxychloroquine" and "allergic to doxycycline". Each
pushed the differential toward a drug-induced condition the patient could not
have.

The design follows one rule: missing a real drug exposure is far worse than
reporting one that is not there. So **nothing is silently dropped** — every drug
the note mentions still appears, labelled with how it was read. If the software
misreads a note, you can see that it misread it. Only the engine token is
withheld, and only for denials and allergies.

**"Stopped" still counts.** Steroid cataract, hydroxychloroquine maculopathy and
ethambutol optic neuropathy are all consequences of *past* drugs. Treating
"stopped" as "never" would have been the most dangerous thing that file could do.

**Binocular vision got a "Normal" button.** Measured in the browser: BV is the
heaviest step in the whole exam at 68 fields, and it had no shortcut — so a
completely normal BV screen had to be left blank, which in the record is
indistinguishable from "not assessed". Related fix: the step's completion rule
only recognised numbers, so a BV recorded as orthophoric and fusing still showed
as unassessed.

**A rule that now governs those buttons, and a flag for you.** A "Normal"
template may state a normal *result*. It must not invent a *measurement*. The new
BV template writes orthophoria, comitancy and fusion — never a stereo threshold
or an NPC distance. But the older va, iop and fundus templates predate this rule
and **do** write numbers: VA 6/6, IOP 15 mmHg, C:D 0.3. One click puts those in a
patient record whether or not the test was done. That is the same class as the
"plano" prescription bug fixed last week. **I have not changed it — that is a
clinical and medico-legal judgement, and it is yours.** Logged as CS-01.

**Five Phase 2 documents**, grounded in browser measurement rather than opinion:
Clinical Excellence Report, Clinical Safety Register, Human Factors Register,
Clinical Workflow Roadmap (ranked Top 200), Clinical Innovation Roadmap.

Measured, not estimated: 33 exam steps · 408 inputs, 126 dropdowns, 72 text
areas, 633 finding chips · 394 conditions across 9 domains, 63 urgent, 0
verified · glaucoma has 23 conditions against retina's 93.

Overall clinical score **6.3/10**. The reasoning engine scores 8 and is the best
thing in the product. The gaps are longitudinal care (no IOP trend, no field
progression) and multi-user safety.

694/694 tests pass, audit 0 FAIL.

## 2026-08-01 — Independent bug hunt: nothing found (after I corrected myself three times)

Drove the real app in a browser at three screen widths — desktop, tablet, phone
— rather than testing the test doubles. Signed up through the actual form,
opened a real exam, fired all four red-flag cases, rendered all five roles, and
round-tripped a patient through the real save path.

**Result: no defects.** 394 conditions, 63 red flags, every alert renders, every
role draws, storage round-trips, no console errors beyond the expected offline
network fetch.

Worth recording *how* that result was reached, because the first run reported
eighteen serious-looking failures and **every one of them was my probe being
wrong, not the app**:

- I called `runEngine()`; the function is `runDiagnosticEngine()`.
- I looked for the advisory panel while sitting on the home page; it lives on
  the exam page, in `#advEl`.
- I set RAPD as `V.pup`; the field is `V.pupil`.

Any of those, reported without checking, would have been a false alarm sending
you to look at working code. This is the same trap as the two false criticals in
the launch review, and it is why the rule stands: **check the probe before
believing the finding.**

## 2026-08-01 — Layer violations closed, a drug-matching bug fixed, and the docs made true

Continuing from recommendations to actual fixes.

**The engine's medication check was reporting drugs the patient wasn't taking.**
`js/medication-checker.js` had no tests at all, which matters because its output
is both shown to you as a medication review *and* fed into the diagnostic engine
as risk tokens. Matching was a plain substring search, so "chloroquine" matched
inside "hydroxychloroquine" — two separate entries. A patient on
hydroxychloroquine, which is very common in lupus and rheumatoid arthritis, was
listed as taking chloroquine as well. That is fabricated clinical information in
front of a clinician.

A drug name must now start at a word boundary. It may still continue, on
purpose: clinicians write "steroids" and "SSRIs", and refusing to match the
plural would mean *missing* a real drug exposure — the more dangerous mistake.

The same bug existed in a **second, independently written copy** inside
`js/ui-advisory.js`. Fixing one would have left the other wrong. Both now call
one function. A sweep for other duplicated logic across the codebase found only
one more instance, and it was harmless.

**The layering violations are gone.** A 40-line event bus (`js/events.js`) lets
the storage and sync layers report what happened without naming the screen that
reacts. Storage no longer builds its own warning banners; sync no longer calls
the home page by name; and `knowledge/age-classification.js` is clinical data
again rather than a file that wrote to browser storage.

**A sixth unprotected store, found on the way.** Your age-bracket decisions —
which age band each condition belongs to — were being written to a raw browser
key from inside the knowledge folder. No corruption check, no mirror, no backup,
and a failed write was silently swallowed. Now protected like everything else,
and migrated automatically.

**A bug my own tests missed and a browser probe caught:** recording an
age-bracket decision saved it correctly but never applied it to the live
knowledge base — only the admin screen remembered to re-apply. Any other route
would have stored a clinical decision that did nothing. Storing and applying are
now one operation.

**The documentation is true again.** `ARCHITECTURE.md` said v1.1 and 72 files
against an actual v1.4.0 and 97; its file inventory is now generated from the
code rather than hand-written, and four tests fail if it drifts again. The
twelve architectural decisions are written down for the first time in
`docs/adr/` — including two marked **NOT MADE** (regulatory classification, and
whether Entopic becomes managed multi-tenant SaaS) because those are decisions
being avoided rather than taken, and one marked **Accepted by accident**, which
is honestly what happened to roles-as-authorization.

Also: the console said "Entopic v1.0" for four releases, which is the wrong
answer to the first question support ever asks. Versions bumped to 1.4.0 / KB
1.3.1. Added `tools/serve.sh` for the rare case a browser refuses something on a
`file://` page.

**Left alone deliberately, and flagged for you:**
- The medication checker does not understand negation — "no steroids" still
  matches. Teaching it to suppress on negation risks hiding a real drug
  exposure, which is the dangerous direction. **Your call.**
- I did not build a structured logging system. Four boot messages in the console
  is right-sized for a solo-founder product; a logging framework would be
  over-engineering.

684/684 tests pass, audit 0 FAIL. Verified in a real browser: 394 conditions, 63
red flags, every alert renders, no new errors.

## 2026-08-01 — Five stores had no protection at all. Now they do.

Moving from the audit's recommendations to actually fixing them.

**What was wrong.** Which data gets encrypted, mirrored and backed up was
decided by three separate hand-written lists in three different files, with
nothing connecting them. So each time a feature was added, whoever wrote it
updated the one list they were looking at. The result, measured:

- the **audit trail** — who opened which record, the thing a clinic would have
  to produce as evidence — was encrypted and backed up but **never mirrored**,
  so clearing the browser destroyed it outright;
- **consents**, the **research corpus**, its **salt**, and **feedback** had
  **no protection of any kind** — not mirrored, not backed up. A new laptop
  meant the consent ledger, the whole accumulating research asset and every
  clinical-concern report simply did not come across;
- `registry_queue`, a dead store, was still being mirrored.

**What changed.** There is now one file, `js/data-classification.js`, that
states what every store is and how it must be protected. The mirror and the
backup read it directly, so a new store is protected by being declared rather
than by somebody remembering three files. All five gaps are closed, and the
restore path reads back everything the backup writes.

The consent ledger is *replaced* rather than merged on restore, deliberately:
merging means guessing whether a later withdrawal or a later grant is the true
state, and guessing wrong in the permissive direction would mean processing
data a patient had withdrawn. If it has to be wrong, it must be wrong in the
direction that processes less.

**A bug this found.** The research salt is stored as a bare text string, and
the mirror's safety check accepted only objects — so the salt would have been
silently refused. A corpus restored without its salt cannot be linked to
anything recorded afterwards, so the clinic's history would have quietly
detached from its present. Caught by deriving the shape rules from the same
declaration instead of hand-listing them.

**Also.** `storage.js` had grown to 1,219 lines doing four different jobs and
tripped its own complexity budget, so backup/export/restore moved into
`js/storage-backup.js` (Top-100 item 26). Three new contracts: the backup and
the restore must agree; every `<script src>` must resolve to a real file (a
typo there 404s silently and kills one module while the app still boots); and
every protected store must state why.

Verified in a real browser, not only in tests: all five stores now appear in
IndexedDB, the backup carries them, 394 conditions and 63 red flags intact.
650/650 tests pass. **KNOWN_DIVERGENCES is now empty** — it was nine.

## 2026-08-01 — Phase 1 addendum: the four sections I had skipped

The founder asked whether I had skipped parts of the audit. He was right, and
the omission was mine, not an accident of scope. Against the Phase 1 brief I
delivered steps 2–10, 12 and 14, and quietly dropped four things:

- **Step 1** asked for thirteen diagrams. I produced three.
- **Step 11** — documentation accuracy review and recommended ADRs — I skipped
  entirely.
- **Step 13** specified ten fields per recommendation. I gave the full format
  for three items and one-liners for the other five.
- **"Top 100 architectural improvements"** — I produced about sixteen and
  grouped the rest away. That one I compressed *deliberately* and should have
  said so rather than let the shorter list stand as if it were the answer.

`docs/PHASE1_ADDENDUM_DIAGRAMS_ADRS_TOP100.md` completes all four. Documentation
only — no production file changed, 644/644 tests unchanged, audit still 0 FAIL.

Three findings worth naming outside the document:

- **`ARCHITECTURE.md` is stale.** Its header claims v1.1 / 72 files against an
  actual v1.3.1 / 92 loaded files, and six modules shipped in the last two
  sessions (`build-info`, `research-corpus`, `insights`, `feedback`,
  `kb-signoffs`, `clinical-scales`) appear in it zero times.
- **The repository contains no ADRs at all.** Every significant decision —
  no build step, globals over modules, localStorage as the record store,
  roles-as-presentation — was made implicitly and is recoverable only by
  reading code. Twelve are now written down, including two marked **NOT MADE**
  and one, "roles are presentation, not authorization," marked
  **Accepted by accident**, which is what it actually was.
- **The state lifecycle of the `V` visit object** is the single strongest
  argument in the whole review for introducing a domain model. Drawing it was
  what made that obvious; the prose review had not.

The Top 100 totals roughly 4,900 hours (~2.5 engineer-years) to enterprise
grade. A five-item subset — the KB sign-off campaign, server-enforced
authorization, and the storage/domain seams — covers the launch blockers in
about 150.

## 2026-08-01 — CTO launch review: the review worklist was 53% larger than believed

Independent re-review that deliberately did not trust earlier sessions.
Full report: `docs/CTO_LAUNCH_REVIEW_2026-08-01.md`.

**The worklist was 394, not 257.** `knowledge/loader.js` stamped
`NEEDS_CLINICAL_REVIEW` onto the expansion batch only. The nine base domain
files carry no `review_status` field at all, so **137 conditions never entered
the review queue** and sat in a bucket labelled "Curated" — which reads as
"someone checked these". Nobody had. They are the original, most commonly hit
conditions: a routine dry-eye presentation returns three results and all three
were among them. The loader now fails closed: an entry whose review state is
unknown is unreviewed.

**The clinician could not see it.** Nothing indicated how much of the knowledge
base had been verified; drafted entries looked identical to signed ones. One
line now states it at the top of the differentials.

**Not fixed, because it cannot be fixed in the client:** a student account
becomes an administrator with one line (`CU.admin = true`), persists it, and
exports every record — proven by browser probe. The role system is a UI
convenience, not a security boundary. That is a blocker for multi-user clinics
and irrelevant for a single clinician on their own device.

**Verdict:** deploy to the founder's own clinic; sell to nobody until a
clinician has signed the knowledge base and a human other than its author has
read the code. Neither blocker is an engineering problem.

## 2026-07-31 — Verified risk scale, durable sign-offs, and two critical data-loss fixes

Four pieces of work. Full reports: `docs/TEST_AUDIT_2026-07-31.md`,
`docs/AI_CODE_REVIEW_2026-07-31.md`.

**AREDS risk scale — implemented, because it is genuinely valid.** The founder
asked for the quarantined calculators back on one condition: only if
scientifically valid, with fixed published numbers and clinician-entered
inputs. Researched both via PubMed. They split. The **AREDS Simplified Severity
Scale** (Ferris FL 3rd et al., AREDS Report No. 18, *Arch Ophthalmol*
2005;123(11):1570-4; PMID 16286620) qualifies exactly — the published abstract
states the whole algorithm and every figure. Implemented as **data plus a
generic evaluator**, not another hand-written calculator: the numbers live in
`knowledge/clinical-scales.js` with the citation and the verbatim source
sentence they were transcribed from, so a reviewer can diff the code against
the paper without leaving the app. It refuses to produce a risk until every
required input has an explicit yes/no per eye — recorded findings only
pre-suggest, they never score. **OHTS does not qualify** (Cox
proportional-hazards model; coefficients not published in reachable material)
and is recorded in `UNIMPLEMENTABLE_SCALES` with the reason, so no future
session re-derives it from memory.

**Sign-offs made durable, honest and portable.** Verification could be
destroyed: it lived in the KB content overlay, which is neither mirrored nor
backed up, so a cleared browser or a new laptop lost all of it. Verifying also
*froze* the condition's content, shadowing later KB improvements. And a
signature stayed attached even after the text changed. Sign-offs now live in
their own mirrored, backed-up store as attestations only, each carrying a
fingerprint of the content signed: matching fingerprint re-applies silently
(the admin is never asked twice); a changed one returns the condition to a
new **"Re-review (content changed)"** bucket showing who approved it before.
The workspace gained Save/Load/Bake buttons so the founder can move his own
work between machines without an engineer.

**T-1 (critical): a damaged store was silently overwritten.** Found by the test
audit. Truncating `entopic_patients` — what a crash mid-write leaves — made the
app show zero patients with no warning, and the next ordinary save destroyed
three real patients permanently. The IndexedDB mirror made it worse: its
recovery only fires when the key is *absent*, and it then copied the damaged
bytes over the last good copy. Root cause was `loadStore` treating "cannot
read" and "nothing there" as the same state. Now distinct: corrupt stores
refuse writes, the damaged bytes are quarantined, the mirror validates before
copying, and a red banner says what you are looking at is not what is on the
device.

**T-2 (critical): two windows destroyed a measurement.** Also found by the
audit. Two tabs on one machine, same visit: tab A's IOP reading vanished when
tab B saved, with no trace. The overwritten version is now preserved in full on
the record, attributed and audited, and the clinician is told. Merging is
deliberately not attempted — that is not something software should do to a
clinical record unsupervised.

551 tests passing (was 495), audit 0 FAIL.

---

## 2026-07-31 — AI-generated-code review: a file of invented clinical numbers, removed

A review of the repository specifically for the failure modes that AI-assisted
programming produces. Full report: `docs/AI_CODE_REVIEW_2026-07-31.md`.

**AI-1 (patient safety).** `risk-calc.js` (then in `js/`) — 369 lines, loaded on
every page, **called by nothing** — contained a home-made points score presented as the OHTS
glaucoma model and **nine invented risk percentages** (`~4%`, `~10%`, `~20%`,
`>30%` for glaucoma conversion; `~45% fellow eye`, `~30-50%`, `~18-25%`, `~1-5%`,
`<1%` for AMD progression). The real OHTS predictor is a Cox proportional-hazards
model, not a points score; those weights and percentages came from nowhere. Its
header read *"Simplified scoring based on published OHTS model"* — a sentence
that reads like a citation and cites nothing.

It never reached a clinician only because it was unreachable. Worse, a later
session noticed it was unwired and wrote a **test comment excusing it** ("pending
founder clinical verification"), turning a safety problem into a forgotten to-do.

Moved to `quarantine/risk-calc.UNVERIFIED.js` with a header stating exactly what
is wrong and what a clinician must supply to restore it; removed from the load
path. `tests/unverified-clinical-content.test.js` now fails if the quarantine
enters the load path, if the file returns to `js/`, if `index.html` points at a
file that isn't on disk, or if **any loaded module assigns a hard-coded
percentage to a risk/sensitivity/specificity-shaped field**. Verified red against
the original (it caught all nine), green after. **Nothing is deleted** — the
three calculators (OHTS, AREDS2, and a categorical ETDRS grading that contains no
invented numbers) are parked pending the founder's decision.

**AI-2 — one file-download, one localStorage write.** Four near-identical
download helpers had drifted across four sessions: one revoked its object URL
synchronously (can race the download), one never attached the anchor to the
document (historically fails in Firefox), only one logged the audit entry. And 18
of 31 `localStorage.setItem` calls swallowed their failure. Two of those were
real silent-loss paths: a clinician's **KB edit** could vanish while the editor
reported success, and `vaultSecretSet` resolved `true` unconditionally — directly
beneath a comment reading *"Never silently drop a secret we were asked to keep."*

New `js/browser-io.js` holds one `dlSaveAs()` and `lsSet/lsGet/lsRemove`. Reads
still never throw; **writes now return a boolean and raise the same
write-failure banner the patient-record store uses**. Browser-verified: a forced
`QuotaExceededError` returns `false` and shows "This device's local storage is
full."

**AI-3 — the 450 defensive guards, made checkable.** `typeof X === "function"`
appears 450 times over 186 names. Two proven defects came from guards that were
silently false (R-1 stored XSS; S-2 session token read as ciphertext). Rather
than delete 450 guards — a large, risky, low-value refactor —
`tests/generated-patterns.test.js` now asserts every guarded name resolves to
something real (global, `window.` export, injected parameter, or genuine host
global), plus one escaper, one downloader, and a pinned load order. All four
assertions were verified to go red against their specific defect and green after
restore.

**Divergence from the review's own recommendations.** Three larger refactors were
identified and deliberately **not** done: splitting `collectTokens()` (574 lines,
whose "SOURCE" comments literally run 1–9, 9b, 11, 10 — pure session drift),
breaking the `storage.js ↔ local-vault.js` cycle, and converging the three
competing export conventions. Each is real; each touches either the diagnostic
path or the record-encryption path; none has a behavioural benefit. They deserve
dedicated sessions with before/after golden-output proofs, not a bolt-on at the
end of a long one.

499 tests passing (was 495), `tools/audit.js` 0 FAIL, app boots clean with all
394 conditions loaded.

---

## 2026-07-30 — Session 11z: Refinement rounds across the storage/security layers

Five focused passes over the layers touched by the vault work, each verified
before moving on. The most important finding was a bug I had introduced:

**V-1 (critical, silent data loss).** The IndexedDB safety mirror backed up the
encrypted records but NOT the vault key wrapper. If localStorage were cleared —
exactly what the mirror exists to survive — recovery would restore ciphertext
while the wrapped data key stayed lost, making every patient record permanently
unreadable *even with the correct passphrase and the recovery code*. The wrapper
is now mirrored (wrapped key material only, so no new exposure). The regression
test reads the real `MIRROR_KEYS` out of `storage-mirror.js` instead of copying
it, so it genuinely fails if the wrapper is dropped again — confirmed by
removing it and watching the test go red.

**H-4 — encrypted backups.** Backup files were plaintext PHI: the weakest link
once the device itself was encrypted, and the copy most likely to travel. Admin
now offers an encrypted backup (AES-GCM-256, PBKDF2 from a backup passphrase),
deliberately **self-contained** rather than tied to the device vault — a backup
must restore onto a replacement machine that has no vault, which is the disaster
it exists for. The restore safety snapshot no longer writes plaintext PHI either.

**Cloud key gap closed.** With records encrypted locally, a stolen device gave up
nothing on disk — but the cached cloud-sync key sat beside them in the clear, so
the cloud copy was still decryptable. That key is now wrapped by the vault, and a
key cached before the vault existed is re-wrapped the first time the vault opens
(awaited, so the key is never reported ready while a plaintext copy remains).

**H-7 — audit truncation made visible.** The trail dropped its oldest 2000+
events silently. It now writes a marker into itself naming how many events went
and the period covered, warns the admin, and shows in the readiness panel.

**Safety property pinned:** a locked vault disarms cloud sync, so a locked device
can never push its (empty) reads over the clinic's cloud copy.

**Stability sweep:** every home tab × every role × encryption ON and OFF renders
clean with no page or console errors. 430 tests passing (was 376), build audit
0 FAIL. No engine, scoring, red-flag or offline-path change in any of it.

## 2026-07-30 — Session 11y: Encryption at rest, and the production-readiness fixes

Audited the build against "this must run in a real clinic tomorrow" across 18
areas, then fixed what blocked it. Full report: `docs/PRODUCTION_READINESS_2026-07-30.md`.

**The backend was dead on arrival (B-1).** A Supabase project built from
001–003 rejected *every* request from a signed-in clinician: the RLS helper
functions were revoked from PUBLIC (where `authenticated` inherited EXECUTE) and
never granted back, so every policy evaluation failed with "permission denied for
function is_clinic_member". Reproduced on real PostgreSQL 16, fixed in `004`, and
re-verified on a database built from scratch — clinic B now sees only clinic B's
patients, cannot write into clinic A, and `anon` is denied. `tests/db-grants.test.js`
guards it (confirmed the test fails without 004).

**Records are now encrypted at rest (B-4)** — `js/local-vault.js` + `js/ui-vault.js`.
Patients, visits, the audit trail and accounts are AES-GCM-256 ciphertext on disk.
Two design constraints drove it:

- *Sync reads vs async crypto.* The app reads records synchronously in hundreds of
  places. Rather than rewrite every call site, the vault decrypts once on unlock
  into an in-memory cache; reads stay synchronous, writes encrypt asynchronously
  and flush before the page can close.
- *A forgotten passphrase must not destroy records.* A random data key is wrapped
  twice — by the passphrase and by a 125-bit recovery code — so there are two
  independent ways back to the same data. Changing the passphrase re-wraps the key
  and never touches the records.

Migration verifies each store by decrypting it back before continuing, and rolls
back to plaintext if anything fails. A locked vault refuses reads *and* writes, so
it can never overwrite real records with an empty list. Disabling writes records
back in the clear — nothing here is a one-way door. 21 tests, real Web Crypto.

**Two real bugs surfaced while building it:** `vaultLock()` cleared the cache while
an encrypt-and-write was still in flight (losing the pending write), and — with
accounts encrypted — a locked device read zero users and would have offered
"create the first account" on a clinic terminal. Both fixed and pinned.

**Also fixed:** Supabase credentials and restore-from-backup were reachable by any
signed-in user (now admin-only, in a new Deployment panel with a live connection
test); open self-signup and no idle lock (one "clinic deployment mode" switch, plus
always-on login throttling); restore could silently wipe a clinic (now validated,
with before/after counts and an automatic safety snapshot); and the cloud client
dropped writes on 429/5xx instead of backing off.

**Divergence from the earlier audit:** I had recorded B-4 as "cannot be fixed in
the app — use full-disk encryption". That was too pessimistic; the envelope-key
design makes it safe to do properly. Disk encryption is still recommended as a
second layer, and the known limits (one shared clinic passphrase, the cached
cloud key still outside the vault) are documented rather than glossed.

No engine, scoring, red-flag or offline-path change — verified all red flags still
fire and scoring is byte-identical with encryption on. 417 tests passing (was 376).

## 2026-07-28 — Session 11w: Clinical Validation workspace (one discoverable place to verify the engine's logic)

**Why.** The founder (clinical authority) asked for a single, easy-to-follow
page where he can open any condition, *see the engine logic wired behind it*,
verify it, and edit/alter its tokens — the front door for the coming KB
expansion and the online push of verified updates. Two pieces already existed
but were **buried and shallow**: a rapid verify queue (`js/kb-review.js`, which
showed only required tokens + ICD + a Verify button) and the full token editor
(`js/ui-kb-editor.js`, reachable only via small buttons deep in the Admin tab).
Neither showed *what a token means in plain words* or *which exam input actually
produces it* — the exact "connected logic" the founder couldn't find before.

**What.** New bounded module `js/ui-validation.js` + page `pgValidation`
(consolidation, not a parallel system):

- **Master–detail workspace.** Left: all 394 conditions, searchable, filterable
  by status (Needs review / Verified / Curated) and by domain, each with a
  status badge and urgent flag; **provisional sorts first**. A progress header
  reads "*N of 394 clinically verified (%)*".
- **The missing wiring view.** Selecting a condition shows its plain-English
  summary, urgency, ICD — then every token grouped (Required / Supportive /
  Contradicting / Temporal / Tests) with, for each: the human name, its meaning
  in plain words (first alias from `TOKEN_DICTIONARY`), and **"Comes from:"** the
  exact exam input that produces it (mapped from `TOKEN_REGISTRY.sources`).
  A **required token that nothing produces** is flagged in red and summarised as
  a top-of-panel warning ("*this condition can never surface until wired*") —
  turning a silent dead-end into something the clinician can see and fix.
- **Verify + edit in one place.** "Verify ✓" reuses the *exact same*
  attestation path as the rapid queue (`kbRapidVerify`), so it feeds the
  existing sign-off → export (`knowledge/verified.js`) → publish pipeline
  unchanged. "Edit logic / tokens…" hands off to the existing KB editor for
  add/delete/modify (which re-stamps entries provisional, as it must).
- **Discoverable.** The Admin "Clinical validation" card now leads with **Open
  validation workspace** (rapid queue kept as a secondary quick-pass).

**Deliberately NOT done (flagged for the founder).** "Alternative / substitute
tokens" in the sense of true **OR-groups** ("any *one* of these findings
satisfies the requirement") is an **engine-semantics change** — today `req` is
AND (all required tokens must be present). That is architecture-committing, so
it is *not* bundled here; the panel says so plainly and points to the two safe
options that exist now (add a synonym in the token dictionary, or split the
condition). Recommend scoping OR-groups as its own phase-2 with a dedicated
design + tests before touching the engine. **No engine/scoring/alert logic was
changed in this session; offline path and red-flag firing untouched.**

**Verification.** 6 new pure-core tests (`tests/validation-workspace.test.js`):
plain-English meaning fallback, the producer/reachability lookup, the
unfireable-required-token detection, status bucketing, and the verified-first
sort — full suite **376/376 green** (was 371). Browser-verified on `file://`:
workspace opens, all 394 conditions list with correct counts (0 verified / 257
provisional / 137 curated), a selected condition renders its token wiring rows
and Verify + Edit actions, no feature console errors.

---

## 2026-07-26 — Session 11v: Fix the due-diligence Medium findings

Worked the remaining DD register. Where the correct fix needs the backend or a
large async rewrite, I did the real bounded mitigation and named what's left —
not a fake "done".

**M-5 — clinical numeric plausibility validation** (highest clinical value).
New `js/clinical-validators.js`: a fat-fingered IOP of 444, a cup:disc of 8, an
axis of 900 used to flow silently into the differential and the record. Now a
"Data check" section in the advisory panel flags physically impossible values
(error) and unusual-but-possible ones (soft warning) — **advisory, never
blocking**, so a real IOP of 58 is untouched. Bounds are physical/definitional,
not diagnostic thresholds, but still flagged `NEEDS_CLINICAL_REVIEW`. 9 tests.

**M-3 — delta push, not full-collection.** The old drain re-serialised and
re-POSTed *every* patient/visit on every save — a multi-MB body per
keystroke-save at a few thousand records. Now only records changed since their
last successful push are sent (tracked by `_cloud_updated` vs `updated`), and
pushed records are marked synced so the next drain skips them. Test-locked.

**M-2 — one KB load order.** The two Node loaders (`load-kb.js`,
`load-engine.js`) each carried their own file list and had drifted once. Both
now derive from a single `tools/lib/kb-load-order.js`; they can no longer
diverge (the existing guard test still holds).

**M-1 — Content-Security-Policy (defence in depth).** The full fix for tokens-
in-localStorage is httpOnly cookies via the backend; until then a CSP restricts
where anything can be exfiltrated to — `connect-src` limits network egress to
the app, the clinic's own Supabase, and Anthropic, and `object-src 'none'` /
`base-uri 'self'` close two more vectors. `script-src` keeps `'unsafe-inline'`
because the UI is built on inline handlers (the verified escaping discipline
guards that gap). **Verified the CSP does not break the offline `file://` app:**
engine runs, no violations, no console errors.

**M-4 — storage headroom, gracefully.** localStorage is a hard ceiling and the
old code hit it with a bare `alert()` at 100%. Now a proactive check warns at
80%, a storage meter shows headroom in the Admin panel, and the quota-exceeded
message is honest that records are safe in the IndexedDB mirror / cloud. The
full fix (async IndexedDB as the record store) is a larger migration, flagged.

**M-6 — contract tests for untested modules.** New `tests/module-contracts.test.js`
structurally pins `clinics.js` (every pack/step/field well-formed),
`certificates.js` (templates startable), `drawing-guide.js` (legend + rules),
`cloud-config.js` (the connect validator rejects junk) and `auth-crypto.js`
(salted, deterministic-per-salt, length-safe compare). Untested-file count
29 → 24 (the rest are pure-render UI, covered by browser E2E).

**M-7 — sync re-entrancy guard.** A save-drain and a poll-drain firing together
could both push the same dirty set; a per-kind in-flight flag serialises them.
The broader shared-global-state class of risk needs a proper state-store
refactor — named, not pretended-fixed.

**Verification:** suite **371/371** (25 new across M-3/M-5/M-6). Audit **0 FAIL**.
Browser-verified together: CSP clean on `file://`, data-check flags an impossible
IOP, the Admin storage meter + app-health render, no console errors.

---

## 2026-07-26 — Session 11u: Fix the due-diligence Critical + High findings

Worked the DD report's blockers in priority order. All fixes verified by running
the code (browser + Node + a throwaway Postgres), not by trusting the change.

### C-1 / C-2 — patient PII no longer leaves the device in the clear
New `js/cloud-crypto.js`. Records are encrypted with **AES-GCM-256** before sync;
the key is derived from a **clinic passphrase via PBKDF2** and never leaves the
device — the cloud is zero-knowledge with respect to PHI. An explicit **consent
gate** (default OFF) means no patient/visit row is pushed until the clinic turns
encrypted sync on *and* sets the passphrase. A consent + passphrase panel is in
the Cloud card; status shows `phi_off` / `phi_nokey` rather than looking synced
while withholding. **Browser-verified:** the pushed row contains no plaintext
name/MRN/DOB — ciphertext only — and round-trips back; a peer device with the
same passphrase decrypts; a wrong passphrase cannot. `tests/cloud-phi.test.js`.

### H-1 — live sync repaints again
`cloudRerender` targeted `page-home` (never existed); the element is `pgHome`.
Merged remote changes were invisible until manual navigation. Fixed.

### H-2 — no more silent clinical data loss
The merge compares timestamps as **epoch ms** (not lexicographically, which
broke on millis-vs-no-millis) and **never overwrites a locally-edited unpushed
record** — when both sides changed it records a surfaced conflict and keeps the
local edit. Locked by tests.

### H-3 — the LLM key need not be in the browser
`js/claude.js` now prefers a **server proxy** (`entopic_llm_proxy`) that holds
the key server-side; the browser calls it with no key at all. Direct-from-
browser is a fallback that warns loudly. Model is no longer hard-coded.
`server/llm-proxy.example.js` is a drop-in Cloudflare Worker / Vercel function
(with a PII tripwire as defence in depth).

### H-4 — global error boundary
`js/error-boundary.js` installs `error`/`unhandledrejection` handlers and wraps
the top-level renderers, so one thrown render is caught, logged, and shown as a
non-blocking recovery banner instead of a blank panel. `V`/`P` are never
discarded. Recent faults surface in the Admin panel. Browser-verified: a
throwing `renderAdvisory` no longer escapes.

### H-5 — admin gate off djb2
The super-admin credential moved to the same salted **PBKDF2-SHA-256** path as
user passwords, migrating the legacy djb2 default on next sign-in and erasing
it. The old synchronous check is now a hard denial. The Admin panel warns while
the built-in default is still in place. Browser-verified end to end.

### H-6 — referential integrity, offline-safe
`db/migrations/003`: a trigger **cascades a patient's soft-delete to its
visits** and an `orphan_visits` view surfaces any stragglers. A hard FK was
**deliberately not** added — offline records sync as independent rows and a FK
would reject a visit that races ahead of its patient; the trigger + view give
integrity without breaking sync. Client-side, deletes now propagate as
**tombstones** (a delete used to resurrect on the next pull) and the pull
honours them, sparing locally-edited rows.

### H-7 — immutable server audit trail
`db/migrations/003`: an **append-only `audit_log`** — insert + admin-select
policies only, no update/delete policy, so rows cannot be altered through the
API (verified: 0 update/delete policies on a live Postgres). `logAudit` now
also appends to it when signed in, best-effort and de-identified (action +
opaque ids, never a name/MRN/DOB).

**Verification:** all three migrations applied cleanly and idempotently on a
throwaway PostgreSQL 16, audit-log immutability and the cascade trigger + orphan
view confirmed. Suite **355/355** (16 new). Audit **0 FAIL**. No console errors.

**Remaining from the DD (Medium and below):** tokens-in-localStorage (needs the
backend session model), full-collection push instead of per-record delta,
localStorage as system-of-record, clinical numeric range validation, and the 29
untested UI modules. These are the next tranche, none of them a launch blocker.

---

## 2026-07-26 — Session 11s: Age brackets split, sidebar organised, whole-build audit

### 1. `young_age` split into paediatric and young adult ⚠ clinical
The KB had one token for "young" and the engine defined it as **under 18**. A
lot of conditions used it where a young ADULT is meant — which is why a
simulated optic-neuritis patient could be five years old.

| token | rule |
|---|---|
| `paediatric_age` | under 18 |
| `young_adult_age` | 18 – 39 |
| `young_age` | under 18 — **deprecated, rule unchanged** |

`young_age` keeps its exact old rule, so **not one differential moves** for a
condition that has not been reclassified. Only **15** conditions are pre-set:
the ones whose *name* literally states infancy or childhood (congenital,
infantile, neonatorum, of prematurity, juvenile, amblyopia). Even those carry
`NEEDS_CLINICAL_REVIEW`.

**83 conditions still need the founder's judgement** — Keratoconus, Optic
Neuritis, IIH and the rest are epidemiological calls, not text-matching, so
they are not mine to make. A new **Age brackets review screen** in the Admin
panel classifies each in one click and exports the decisions as a source file
to bake into the build.

Traps recorded rather than papered over: my first pass classified on a regex
and matched `ROP` inside "dyst**rop**hy", "hyd**rop**s", "at**rop**hy",
"exot**rop**ia" and "hype**rop**ia. And *Congenital* Hypertrophy of the RPE is
congenital by name but found at any age, so it is deliberately **not**
auto-classified.

### 2. The step list reads as stages, not one long list
Each stage of the exam (Registration, History, Examination, Investigations,
Assessment, Management, Documentation, plus any modules and clinics) is now its
own band: a clickable header that folds the group away, a **done/total count**,
and a hairline accent colour so the eye finds "Examination" without reading.
Folded state is remembered per user across visits — a clinician who never runs
Investigations should not have to fold it every exam. A group holding the step
being worked on always opens regardless, and a folded group with unexamined
sections shows a dot so nothing hides silently. The accents are a thin left
rule only: the panel stays monochrome, and no colour carries clinical meaning.

### 3. Whole-build audit — `node tools/audit.js`
One command that inspects the real build rather than the documentation: load
order, syntax and hygiene, handler wiring, KB structure, token registry, red
flags, the evidence gate, determinism, the offline invariant, engine speed,
security, privacy, escaping, backup/restore, test coverage and doc accuracy.
Non-zero exit on any FAIL, so it can gate a release. Full write-up in
`docs/AUDIT_2026-07-26.md`.

**Result: 0 FAIL · 1 WARN · 19 info.** What it caught:

- ⚠ **Passwords were stored in plaintext.** `doSetup()` wrote `password: pw`
  into local storage; `doLogin()` compared with `===`. A copied device, an
  exported backup or a synced file handed over every user's actual password —
  which matters well beyond Entopic, because people reuse passwords.
  **Fixed** (`js/auth-crypto.js`): random 16-byte salt, **PBKDF2-SHA-256 at
  120,000 iterations** via Web Crypto (which works on `file://`, so it stays
  fully offline), constant-time comparison, and username-only lookup so a wrong
  username and a wrong password fail identically. Legacy accounts upgrade
  automatically on next sign-in — verified in a browser: plaintext count went
  1 → 0 and the old password no longer appears in the store.
  **Still honest:** this is not authentication. Anyone with the device can
  bypass the sign-in screen. What it buys is that a leaked store no longer
  reveals a password. The Admin panel now shows the plaintext count.
- **Signing out landed you on the wrong form.** After creating an account, the
  sign-in fields stayed hidden and logout dropped you on "Create new account".
  `doLogout()` now restores the sign-in view and clears the fields.
- **Two KB loaders had drifted.** `tools/lib/load-kb.js` was missing three
  knowledge files that `load-engine.js` loads, so half the suite reasoned about
  a differently-assembled knowledge base. Aligned, with a test that fails if
  they diverge again.
- **A NUL byte in `js/auth-crypto.js`** made grep treat it as binary. Fixed,
  and the audit now fails on any NUL byte in source.
- **`ARCHITECTURE.md` claimed 130 conditions; the build has 394** — every count
  was ~3× stale, and it still listed "ICD codes never populated" as open when
  all 394 now carry one. Corrected, and the audit fails if it drifts again.

The audit also had to be made honest about itself: its first run produced 12
false wiring failures by matching `.replace(`, `JSON.stringify(` and `if (`,
and flagged `js/claude.js` for privacy because of a **comment** saying PII must
never be sent. Both fixed — an audit that cries wolf teaches people to ignore it.

### Packaging
`START-HERE.md` plus a zip of the whole build. Verified by unpacking it
somewhere else and running `npm test` (343/343) and the audit (0 FAIL) from
the extracted copy.

**Verification:** suite **343/343** (12 new). Browser-verified: signup stores no
plaintext, wrong passwords rejected, legacy migration works, sidebar groups fold
and persist, active step forces its group open, and age tokens fire correctly at
8 / 25 / 55. No console errors.

---

## 2026-07-26 — Session 11r: Stress test, integrity fixes, and the simulator starts showing values

### Stress test — what an adversarial pass found
Not a feature session. I attacked the teaching layer instead of describing it,
and it did not survive contact.

- **Domain was empty for 137 of 394 conditions.** The nine curated KB files
  carry their domain as the loader's registry key, never as a property; only
  the expansion batch carried `domain` inline. So everything reading
  `cond.domain` bucketed 35% of the KB as "Other" — including dry eye, every
  conjunctivitis, blepharitis, stye, chalazion, pterygium. That silently broke
  domain-scoped assignments, the "your weakest area" recommendation, OSCE
  station labels and analytics-by-domain. Picking "Surface & Lids" returned 42
  of the 72 that belong to it. **Fixed in the loader**, so every reader — and
  every future one — is corrected at once. The Other bucket is now empty.
- **A "Glaucoma block, 20 cases" served 5 cases from other domains and marked
  the student complete.** `assignNextCase()` fell through to a whole-KB random
  pick once the domain ran dry, so the record asserted something untrue about
  what was practised. It now repeats within the domain, and `assignPoolSize()`
  clamps the target to what a scope can actually supply.
- **The engine ignored a pure astigmat's refraction entirely.** The whole
  refraction block was gated on `V.rx.od_sph`, so "plano / -2.50 x 90" produced
  no astigmatism token and skipped the anisometropia check. Gate widened to any
  refraction value; no threshold changed.

### The simulator was handing students the answer
Measured across all 394 conditions: with a case fully examined, **the truth
ranked 1st or 2nd every single time — 132 of 132, never absent.** It cannot be
otherwise, because cases were built from the same tokens the engine ranks with.
A simulator whose engine is never wrong teaches automation bias, which is the
opposite of what an advisory-only product exists to teach.

Worse, `simExamine` pushed the TOKEN onto the record: a student clicked Examine
on IOP and was told **"high IOP"** — the conclusion, not the measurement. The
interpretive step is the skill, and it was being skipped.

### First fix: simulated patients now present like patients
New `js/simulation-presentation.js` runs the engine backwards. Given a finding
a case carries, it writes onto the chart what a clinician would actually have
recorded, and lets the **engine derive the token from it** exactly as in a live
exam. Three routes, all of them already the app's own vocabulary:
**symptom chip** (SYM_CATS) · **finding label** (FINDING_TOKEN_MAP) ·
**measured value** (a number satisfying the engine's own published rule).

A student now sees:

> *Patient aged 42 — halos around lights · IOP 25 / 25 mmHg (GAT) ·
> subjective +1.59 / +2.83 DS · van Herick grade 2 both eyes*

instead of `high_iop, narrow_angle, halos, hyperopia`.

**The anti-fabrication guarantee is a round-trip test.** Every measured rule
cites the engine rule it inverts, and `tests/simulation-presentation.test.js`
applies the rule to a blank visit, runs the **real engine**, and requires the
token back — 25 draws per rule, since values come from a band rather than a
fixed number (so nobody learns "34 mmHg means angle closure"). A rule that does
not round-trip is a fabricated number and fails the build. Two did, and both
turned out to be real bugs: the astigmatism gate above, and a contact-lens rule
writing the wrong field.

Also fixed while wiring it:
- **Procedure names were being revealed as findings.** The KB's `tests` arrays
  mix real results (`RNFL_thinning`) with the name of the procedure
  (`lid_position_exam`, `blink_exam`, `clinical_exam`). Cases now only contain
  findings that can actually be put on a chart; `req` is never filtered.
- **Measured findings were routed by symptom, not by test.** TBUT and Schirmer
  landed under Chief Complaint, making dry-eye cases answerable from one
  screen. Each rule now declares its own step. Cases spanning 3+ sections rose
  from 100 to 144; single-section cases fell from 92 to 66.
- **One measurement, written twice.** Van Herick and C:D were each written by
  two tokens, the second overwriting numbers the student had already been
  shown. Rules now declare what they subsume.

⚠ **For the founder:** the KB's `young_age` means *under 18* (the engine's
rule), and several conditions use it where *young adult* looks intended — the
simulator was generating optic neuritis in a five-year-old. It now draws from
the upper part of the bracket as a stopgap, changing no clinical claim.
**Whether `young_age` should be split into paediatric vs young-adult is a
clinical decision and is yours.**

**Verification:** suite **318/318** (14 new).

### Second fix: the engine can now be wrong in front of a student
New `js/simulation-realism.js`. Cases stop being textbooks and start behaving
like patients, three ways:

- **Incomplete** (99% of conditions) — supporting features missing, as patients
  usually are. Defining findings are never dropped.
- **Two problems** (96%) — a second, genuinely separate condition, chosen from
  a different domain, never urgent, non-contradictory in both directions.
  **Either diagnosis is accepted**, because marking a student wrong for
  spotting the second problem teaches them not to look. This is the product's
  own multiple-independent-problems idea used for teaching.
- **Engine misled** (27%) — the copilot's top answer is deliberately not the
  truth. This is the case the whole rebuild exists for.

Tiers decide what a student meets: **Guided is textbook only** (learn the
pattern first); **Challenge never shows a textbook case**.

**Why this is safe.** Nothing is invented: every finding added or removed
already belongs to a real KB condition, and a confuser must **already share
≥2 findings with the truth** in the KB. Every candidate case is then **run
through the real engine and discarded if it does not behave as claimed** — a
case is not shown on the hope that it misleads, it is shown because it was
verified to. Fenced by 12 tests.

**Two hard rules on the discordant cases:**
1. **A red flag is never muted.** Misleading the ranking is allowed;
   suppressing an urgent alert is not. A discordant case built on an urgent
   condition is only accepted if the engine still raises its alert — which
   makes the strongest point in the product: *the ranking was wrong and the
   safety alert was still there, which is exactly why alerts are never ranked.*
2. **There must be something that separates them, and the student must have
   been shown it.** Without a discriminator on the chart the case is unfair,
   not hard. This rule cut discordant buildability from 38% to 27% and was
   worth it.

The debrief now names the miss: *"It ranked Angular Blepharitis first. The case
was Viral Conjunctivitis. What pulled it: lateral canthus irritation, burning,
cracking skin — findings this patient genuinely had, which Angular Blepharitis
also produces. What should have held you: watery discharge — required by Viral
Conjunctivitis, and not by Angular Blepharitis."*

### Third fix: the score stopped rewarding anchoring
`efficiency` is **removed**. It measured productive sections against sections
opened, which gave a **complete systematic examination 16%** and
knowing-where-to-look **100%** — it scored anchoring and premature closure, the
two commonest serious diagnostic errors, as skill. Examining a section that
turns out normal is a negative finding, not waste.

Replaced by **Evidence** — did you have every defining finding when you
committed — plus an explicit **premature-closure** callout when a student is
right on incomplete evidence: *"On this patient it worked; on the next one it
is how a diagnosis gets missed."* Thoroughness is reported as a plain fact, not
scored. The OSCE **gathering** mark had the same flaw and was corrected the
same way. XP now rewards committing with the evidence and working a
non-textbook case, rather than speed.

**Verification:** suite **331/331** (13 more). Browser-verified end to end with
no console errors: values landing on the chart (IOP 23/23 in the real field,
`high_iop` never handed over), a discordant case worked to a debrief that names
what misled the engine, premature closure flagged, and a comorbid case
accepting the second diagnosis. Screenshots 50–54.

---

## 2026-07-26 — Session 11q: Laterality confirmed, modules interconnected, simulation → a real teaching system

### 1. Chart laterality — confirmed and documented
Founder asked me to confirm it. Web search was unavailable (monthly spend cap),
so it was settled from anatomy and the reasoning written into the constant:
the disc sits **nasal** to the fovea; a fundus chart is drawn as the examiner
views it, un-mirrored; facing the patient, their **right** eye is on the
examiner's **left**, so the nose — and with it the nasal retina and the disc —
falls to the examiner's **right**. Cross-checked against the macula being
temporal. `DRAW_DISC_SIDE_OD` changed `"left"` → `"right"`.

### 2. Optional modules are now wired into the rest of the build
They were standalone forms. Now:
- **Into the engine** (`js/engine.js` SOURCE 11) — a white red reflex emits
  `leukocoria`, a manifest squint emits `manifest_squint`, suspected amblyopia
  emits `reduced_vision`, poor contact-lens comfort emits
  `contact_lens_intolerance`. Verified: white red reflex fires the urgent
  leukocoria alert and yields congenital cataract / retinoblastoma / Coats;
  a normal red reflex yields nothing. No new clinical claims — every token
  already existed in the registry.
- **Across sections** (`js/module-links.js`) — each module shows a read-only
  "already recorded" strip of the relevant core findings with an edit-jump, so
  the same value is never asked twice, and contact lens pulls the habitual Rx
  straight from Refraction.
- **Into the report** — module findings appear in their own report sections.

### 3. Simulation rebuilt as a progression system, not a one-off drill
The product question was *"why would a student open this again tomorrow?"*
Three answers, each in its own inspectable file:
- **Difficulty that teaches** (`js/simulation-progress.js`). Four tiers, and
  the lever is not case difficulty — it is **switching the copilot off**.
  Guided (differentials + next-test hints) → Standard (engine, no hints) →
  Challenge (**engine hidden**, no shortlist, search the whole KB) → OSCE.
  The advisory panel, the reasoning map and the header confidence badge all
  obey the same gate, so nothing leaks the answer; committing reveals the
  engine again so the student can compare it against their own reasoning.
  The gate is driven by `simEngineHidden()`, which is false whenever a
  simulation is not running — **a real exam can never lose its advisory panel**,
  and a test locks that.
- **Honest scoring.** Examining every section used to be free. Now **accuracy,
  efficiency and calibration are scored and shown separately**, so a student
  sees *which* skill is weak: efficiency penalises brute-forcing (productive
  sections ÷ sections with findings, times productive ÷ total opened), and
  calibration compares stated confidence — asked **before** the reveal — with
  the outcome, calling out confident-and-wrong as over-confident.
- **A reason to explore.** Recommendations point at the conditions they got
  wrong, domains never touched, their weakest domain, and stepping up a tier —
  each with the reason shown. Plus XP weighted toward the harder tiers, levels,
  mastery (repeat success, not one lucky guess) and a daily streak.

### 4. OSCE circuit (`js/osce.js`, `js/osce-ui.js`)
Built as an actual circuit, not a harder quiz: fixed station time with a bell
that **closes the station whether or not you are finished** (recorded, not
forgiven), engine hidden throughout, no going back, and **marks withheld until
the circuit ends** so station 1's feedback cannot coach station 2.
The marking schedule scores four domains **separately** — data gathering,
finding the decisive sign, the diagnosis, and **safety** — so a student can
pass on diagnosis and still be told they missed the red flag. Safety is only
assessed on stations that actually carry an urgent finding.
⚠ **NEEDS_CLINICAL_REVIEW** — station time (5 min), weights (25/25/35/15) and
the pass mark (60%) are engineering teaching defaults, **not** a published
examination standard. All in `OSCE_CONFIG` for the founder to set. Every screen
says it is practice and certifies nothing.

### 5. Assignments (`js/assignments.js`, `js/assignments-ui.js`)
Faculty set work from the Teaching tab: title, format (cases or OSCE),
difficulty, scope (common / anything / red flags / one domain), how many, due
date, note, and either named students or the whole cohort. Cases are generated
**at launch time from the KB**, so an assignment is a small rule that never
goes stale rather than a frozen list of questions.
Completion counts **distinct conditions**, so repeating one case does not
finish the work; the next case served is one the student has not done. Students
see assigned work on Study with live progress and stay inside the assignment
between cases. Faculty see per-student cohort progress. A station closed by the
bell is credited exactly like one the student finished.
Learning telemetry only — namespaced per user, kept out of patient storage, and
a test asserts one student's progress cannot leak into another's.

### Fixed along the way
- The simulation banner and the "copilot off" panel stayed on screen behind the
  debrief after a session ended — `simEnd()` now repaints.
- Free practice no longer gets silently credited to an assignment the student
  was working on earlier.
- "End" inside a circuit now marks the stations already completed instead of
  discarding them.
- The Study "Suggested next → Go" button launched a freshly re-rolled
  suggestion rather than the one shown; recommendations are now cached.

**Verification:** suite **304/304** (23 new in `tests/simulation-osce.test.js`
covering anti-fabrication, the engine gate, efficiency/calibration/XP, OSCE
marking and assignment progress). Browser-verified end to end with no console
errors: engine hidden at Challenge without leaking a differential, full OSCE
circuit through station break to circuit debrief, assignment created by faculty
→ visible to the student → cohort progress, and all three modules plus the
clinic packs rendering. Screenshots 30–49.

**Divergence from ARCHITECTURE.md:** none — the doc does not yet cover the
teaching layer. Updated there.

---

## 2026-07-25 — Session 11p: Evidence gate, sourced colour guide, clinic packs, simulation

### 1. Engine — context can no longer create a differential ⚠ safety
Founder: *"just entering age should not relate to a disease being fired."*
**Reproduced:** age 6 and nothing else put **Retinoblastoma** in the
differential — matched on `young_age`, with its required `leukocoria` still
**missing**. The existing hard rule only demanded ≥1 `req` token match, and
`young_age` satisfied it.
**Fixed** with `CONTEXT_ONLY_TOKENS` — demographics and background risk
(family history, diabetes/hypertension/thyroid/autoimmune/RA/SLE/MS/migraine/
eczema, blepharitis, contact-lens wear, trauma, steroid, stress, recent viral).
A condition now needs ≥1 **substantive** match across req+sup+tests, or it
scores 0. Context still *sharpens* a differential real findings raised; it can
no longer create one.
**And what an age SHOULD do** — a child now prompts *documentation*: add the
Paediatric section (birth history, fixation, squint, amblyopia), assess
binocular status, consider cycloplegic refraction ≤8. Suggestions, never a
diagnosis. `tests/evidence-gate.test.js` locks all of it; red flags unaffected.

### 2. Drawing — colour guide compiled from sources, and a toggleable guide
The colour code is now compiled and cross-checked from **six published teaching
sources** (linked in-app) in `js/drawing-guide.js`, each entry marked
**agreed** or **varies** so firm convention is distinguishable from local
practice. It covers both charts plus the composite rules the sources teach:
a retinal break is **outlined blue, filled red**; detachment shaded blue
against red attached retina; **all** pre-retinal/media lesions green; cornea
drawn **frontal + cross-section**; record lesion size in mm; scar (black
outline) drawn differently from active infiltrate (yellow).
Toggled by a **Guide** button in the drawing toolbar. The palette *is* the
guide, so swatches and documentation can never drift apart.

### 3. Anterior segment documentation templates (were missing)
A template selector now offers: anterior segment frontal · **cornea frontal +
cross-section** (epithelium/stroma/endothelium guides, size prompt) ·
**corneal ulcer / infiltrate chart** (measurement grid + prompts for infiltrate
and defect size, depth, hypopyon, vessels, thinning, perforation) · **lids &
adnexa** (MRD1/MRD2, aperture, levator function, lid position, lagophthalmos) ·
**gonioscopy** in four quadrants.

### 4. Specialty clinic packs (8) + the missing test areas
Clinic packs cluster extra sections for a kind of session — **Dry Eye,
Refractive Surgery, Myopia, Oculoplasty, Ocular Prosthesis, Sports Vision,
Operation Theatre, Screening/Camp** (community, school, workplace, diabetic,
quick triage) — **185 fields**. The core 22-step flow is untouched (22 default,
sections appear/disappear with the pack).
This closes the called-out gaps: **keratometry** now appears where it is used
(refractive surgery, myopia, contact lens), and **LASIK / PRK / SMILE /
enhancement** get a full pre-op→post-op record (stability, CL holiday,
topography + ectasia indices, pachymetry, scotopic pupil, WTW, ACD,
endothelium, flap/ablation, residual stromal bed, haze, counselling).
Packs are pure **data** rendered by one generic renderer — a new clinic is a
data edit, not new UI code.
Also: role renamed **"Technician / Investigations" → "Investigation unit"**.

### 5. Clinical simulation for students (new)
The quiz asks *"what is this?"*. Simulation asks **"how would you find out?"** —
the student works a virtual patient through the real 22-step interface with
every finding **hidden until they examine that section**. The live engine sees
only what has been revealed, so the differential visibly narrows as they work.
- Cases are **derived from the knowledge base**, never invented — ground truth
  is the condition's own req/sup/**tests** tokens, so a case can contain no
  clinical claim the KB does not already make, and inherits its review status.
- Objective signs spread a case across the exam (angle closure → chief
  complaint, IOP, gonioscopy, slit lamp), so the student must actually work
  the examination rather than read a symptom list.
- Debrief reports: sections examined, **defining findings uncovered vs missed**,
  sections with findings never examined, what the engine had on their evidence,
  time taken, and the About note.
- Simulated patients are flagged and excluded from real records, analytics and
  export, exactly like practice records.
- Launcher on the student's Study tab: common / any / urgent-red-flag scope.

**Verification:** suite **281/281**; browser-verified throughout (age-gate
behaviour, guide + all five anterior templates, all clinic packs toggling and
persisting, and a full simulation run from launch to debrief). No console errors.

---

## 2026-07-25 — Session 11o: Drawing upgrade, full BV evaluation, three new sections

### Drawing — colour-coded charts and real tools
Was a plain grey circle with a pen and six unlabelled colours; saved drawings
were **never displayed anywhere**. Now:
- The conventional ophthalmic **colour code**, every swatch labelled with what
  it marks, the selected colour's meaning shown live, and the whole key
  **saved with the drawing** so the meaning travels into the record.
- Proper templates: fundus is a **concentric chart** (posterior pole / equator
  / ora serrata) with **12 clock hours**, radial spokes, disc + macula, N/T
  labels — the layout used to chart breaks and detachments. Anterior segment
  gets limbus / iris / pupil, a locating grid and clock hours.
- Tools: pen, straight line, ellipse with live preview, **hatch** (for lattice /
  thinning), eraser, **undo + redo**, and per-eye OD/OS charts. Canvas 500² → 760×560.
- Saved drawings render as a gallery on the slit-lamp and fundus pages,
  clickable to open full size with the colour key, and deletable.
- ⚠ Colour meanings vary by school/region and chart laterality is a single
  constant (`DRAW_DISC_SIDE_OD`) — **founder to confirm**.

### Binocular vision — full evaluation
From ~10 fields to a complete orthoptic work-up in five collapsible sections
(**72 fields**): alignment (cover test with deviation type + laterality,
comitancy, Hirschberg, Krimsky, Maddox, von Graefe H+V dist+near, modified
Thorington, 4Δ BO, Park's 3-step, nine-positions), sensory fusion (Worth 4-dot
with structured outcomes, Bagolini, stereo + test used, suppression, NRC/ARC,
visuoscopy fixation), vergence (NPC + target, full BI/BO ranges, vergence
facility + failing direction, fixation disparity, associated phoria, AC/A
calculated + gradient, CA/C), accommodation (amplitude OD/OS/OU + method,
monocular + binocular facility + failing lens, NRA/PRA, MEM/Nott lag), and
analysis (Sheard's / Percival's, impression, management).
Engine-facing field names unchanged. **No new norms invented** — only the
values already stored in `MORGANS` / `hofstetter()` are shown.

### Three new sections, as optional modules
Paediatric, Low Vision and Contact Lens were "almost negligible". Built as
**optional modules** so the **core 22-step flow is unchanged** for a routine
adult exam — switch one on from Demographics and its section appears in the
sidebar (verified: 22 steps by default, 25 with all three on, and the step
disappears again when switched off).
- **Paediatric**: birth/developmental history, fix-and-follow + CSM per eye,
  objection to occlusion, preferential-looking acuity, red reflex (leukocoria
  recorded as a finding), cycloplegia, squint type/onset/constancy, amblyopia
  type/density/occlusion history/compliance, referral source.
- **Low Vision**: patient's own goals first, distance+near VA, near chart and
  working distance, contrast, reading speed, functional field, glare/lighting/
  tint, magnification that worked and how it was arrived at, aids trialled and
  outcome, eccentric viewing, training, mobility, registration and support
  referral, driving.
- **Contact Lens**: indication, wearing history, K readings / HVID / TBUT,
  lens type/material/modality, full OD+OS parameter table (BC, dia, power, cyl,
  axis, add), centration, movement, fluorescein pattern, over-refraction, VA,
  comfort, handling taught, care system, hygiene advice, aftercare interval,
  complications.

### Investigations
- Role renamed **"Technician / Investigations" → "Investigation unit"**.
- Catalogue broadened **26 → 45 tests across 12 categories**: gonioscopy/angle
  imaging, diurnal IOP phasing, corneal hysteresis, ultra-widefield, fundus
  autofluorescence, microperimetry, dark adaptometry, meibography/interferometry,
  confocal microscopy, corneal scrape + microbiology, exophthalmometry, lacrimal
  syringing, dacryocystography/scintigraphy, cycloplegic refraction, axial-length
  myopia monitoring, preferential-looking acuity, contact lens fit assessment,
  keratometry, low-vision assessment.

⚠ All of the above records **fields and descriptive categories only** — no
thresholds, normal ranges, eligibility criteria or interpretation. Magnification,
amblyopia management, lens selection and registration remain clinical decisions.
Nothing in these modules is fed to the diagnostic engine.

**Verification:** suite **275/275**; browser-verified drawing (template, colours,
shapes, undo/redo, save + gallery), module on/off with step counts, each module
page rendering and persisting data, and the BV page at 72 fields. No console errors.

---

## 2026-07-25 — Session 11n: Refraction rebuild, colour vision, file storage, investigation hand-off

Founder review of the clinical depth of the build. Four of the eight items he
raised are done and shipped; the rest are listed at the end as still open.

### 1. Refraction — rebuilt to the real clinical sequence
Staged: **current correction → objective → subjective → final Rx**.
- Habitual: spectacles or CL, powers + VA through them, CL base curve /
  diameter / modality / material, age of the current Rx.
- Objective: structured autorefractor, and retinoscopy with a **Dry /
  Cycloplegic** state and working distance. Choosing Cycloplegic opens an
  agent / drops / instilled-at / hold block with a live **"holding — X of N min"**
  timer and a *separate* post-cycloplegic table, so the wait is explicit and
  wet values never overwrite dry ones.
- Subjective (engine-facing; `od_sph` etc. deliberately unchanged) with BCVA
  and binocular balance. Final prescription with lens type and wearing advice.
- Copy-forward buttons move powers between stages; only non-empty values move,
  so a copy never blanks existing work.
- VA page gained pinhole interpretation + a remarks field.
- Spectacle advisor now reads the **issued** Rx (final if written, else subjective).

### 2. Colour vision — and a real engine bug fixed
The engine fired `color_vision_loss` for **any** value other than the literal
string `"14/14"` — so a normal `17/17`, or the word `Normal`, was scored as a
defect — and `color_os` was **never read at all**. 15 KB conditions consume that
token, so false positives quietly inflated optic-neuropathy differentials.
Now: explicit one-tap result (Normal / Defective / Not tested), then detail
(test used, plates, per-eye scores, nature, axis, severity, D-15). A defect
marked **known congenital** is documented but not scored as acquired disease.
Legacy free text is parsed as a fraction and understands the usual words.
`tests/colour-vision.test.js` locks both directions.

### 3. File storage — IndexedDB + compression
Attachments were base64 data URLs in localStorage (~5 MB for the whole app), so
files over ~1.5 MB were **rejected outright**. Now blobs go to **IndexedDB**
(hundreds of MB) with only a small record + thumbnail kept inline, and images
are downscaled/re-encoded with three clinician-selectable profiles. Measured on
an 8.77 MB photo: Diagnostic 1.1 MB (−87.5%), Standard 439 KB (−95.1%), Compact
156 KB (−98.3%). Compression is lossy and the UI says so; PDFs are never
re-encoded; a "compressed" result is discarded if it is not actually smaller.
`fsCloudUpload()` copies to the user's **own** Supabase Storage bucket — a no-op
unless they connected their own project.

### 4. Investigation ordering, hand-off and review (new)
The missing multi-person workflow, now built end-to-end:
clinician **orders** (with urgency + clinical question) → order appears in a
shared **Investigations queue** → a **technician / other clinician** opens it,
records structured values, uploads the report, marks it done → the ordering
clinician sees **"results ready"**, reviews and **signs off**.
- Orders live on the *patient* so they survive the hand-off, but carry the visit
  they were raised from.
- New **Technician / Investigations** role with the queue as its landing tab;
  Investigations tab added for clinicians.
- A 26-test catalogue supplies both the order picker and the structured result
  fields, covering the gaps called out: **A-scan biometry** (AL/K1/K2/ACD/LT/
  formula/IOL/target), **B-scan**, **UBM**, **visual field analysis** (strategy,
  MD/PSD/VFI, GHT, reliability indices, pattern), **contrast sensitivity**
  (Pelli-Robson / CSV-1000 / Mars), **ROP screening** (ICROP zone / stage /
  extent / plus / A-ROP with GA, birth weight, PMA), electrophysiology
  (ERG / mfERG / PERG, VEP, EOG), specular microscopy, tear-film work-up,
  topography, orthoptic assessment, bloods and neuroimaging.
- ⚠ The catalogue records **fields and internationally-used descriptive
  categories only** — no thresholds, normal ranges or interpretation. Nothing
  in it diagnoses. Flagged `NEEDS_CLINICAL_REVIEW` for founder sign-off.

**Verification:** suite **275/275**. Browser-verified end-to-end: staged
refraction copy chain + cycloplegic timer; colour-vision scoring in both
directions; 8.77 MB image compressed and read back out of IndexedDB; and the
full order → perform → upload → review → sign-off hand-off across two different
signed-in users with no console errors.

### 5. Certificates
Five **modifiable** templates (colour vision, low vision / visual impairment,
visual fitness, spectacle prescription, contact-lens specification), each
pre-filled from the exam as editable label/value rows with an editable
statement and signature block, printed without app chrome and audit-logged.
⚠ **No eligibility thresholds or pass/fail logic** are encoded — those vary by
country, employer and licensing authority. Entopic formats the document and
fills in the measured findings; the opinion and signature are the clinician's.

### Still open from this review (not yet built)
- **Low-vision, paediatric, binocular-vision and contact-lens sections.** The
  `bv` data model is already reasonably complete (cover test, NPC, vergence
  ranges, AC/A, accommodation, MAF/BAF, NRA/PRA, stereo, Worth 4-dot) but the
  UI is thin; low vision, paediatric and contact lens have no dedicated section
  at all beyond what the refraction rebuild added (habitual CL parameters).
- **Anterior/posterior segment drawing upgrade** (colour-coded, standard
  ophthalmic notation) — flagged by the founder as important for documentation.

---

## 2026-07-25 — Session 11m: Whole-build UI/UX wiring audit + refinements

**Founder asked: is everything connected and wired? Then refine the UX.**

**Audit (objective, over the real source):**
- **No dead buttons.** All 105 inline event handlers across every JS + HTML file
  resolve to a defined function. Now enforced permanently by
  `tests/ui-wiring.test.js`.
- **All 8 modals** have working close buttons; **all 22 exam steps** render real
  pages (no "under development" fallback); the **mobile engine drawer**
  (`toggleEngineView` → `body.engine-open`) works at ≤1000px.
- **Found 5 built-but-ORPHANED features** — real, working panels with NO entry
  point a user could reach: `renderSpectacleAdvisor`, `renderOSDI` /
  `renderSmartIntake`, `renderRiskCalculators`, `renderMedicationReview`.

**Refinements this pass (the clinically-safe wirings):**
- **Spectacle Lens Guidance** wired into the **Refraction** step — standard
  optical practice (lens index/material, design, coatings) derived from the
  entered Rx; self-gates until an Rx is present. Verified rendering with a real
  Rx.
- **Dry-Eye Score (OSDI)** wired into **Chief Complaint** as a collapsed-by-
  default optional tool with a running score badge. OSDI is a validated public
  instrument (Schiffman 2000); scoring is the standard `sum × 25 / answered`
  with the published severity bands. Screening only — it never auto-adds tokens
  (the clinician decides). Verified: 3 answers → 58.3 "Severe", correct formula.
- New guard test asserts these stay reachable so they can't silently orphan again.

**Deliberately NOT wired — flagged for founder's decision** (guardrails: no
unverified clinical stats, product-placement is the founder's call):
- `renderRiskCalculators` (OHTS 5-yr conversion %, ETDRS DR grading) and
  `renderMedicationReview` (drug ocular-effect claims) emit specific clinical
  figures from a "simplified" model I can't verify against the published
  sources — surfacing them unverified would breach the no-fabricated-stats
  guardrail. They need his clinical sign-off (or a cited source) first.
- `renderSmartIntake` overlaps the existing rich chief-complaint chips — likely
  redundant; left for a product call on whether it's a distinct quick-entry mode.

**Verification:** full suite **268/268** (266 + 2 UI-wiring guards); no page
errors at 1440 / 820 / 400 px; offline path and red flags untouched (this is
presentation + wiring only, no engine/KB logic changed).

---

## 2026-07-25 — Session 11l: Token synonym integrity — one concept, one token

**Founder caught a real integrity risk.** He noticed `high_iop` and
`IOP_very_high` looked like "the same thing mapped differently" and suspected
more cases that would fragment the diagnostic engine. He was right that the
class of bug exists — though the specific pair he saw turned out to be fine.

**Findings:**
- **`high_iop` vs `IOP_very_high` is NOT a duplicate** — they're graded tiers
  (`high_iop` > 21, `very_high_iop` > 30) and BOTH fire above 30, so a condition
  keyed on the milder token still matches at very high pressure. Cumulative, not
  competing. But the *name* `IOP_very_high` broke the `high_iop`/`normal_iop`
  convention, which is exactly what made it look like a bug — renamed to
  `very_high_iop`.
- **Real synonym-splits found and fixed** — clinically identical inputs that
  produced DIFFERENT tokens, so the differential depended on which phrasing the
  clinician happened to click:
  - "Watery eyes" / "Excess tearing" / "Overflowing tears" → three tokens
    (`watering` / `tearing` / `excess_tearing`) → now all `watering`.
  - "Blurred near vision" / "Difficulty focusing near" (`near_blur` / `blur_near`)
    → now `near_blur`.
  - "Difficulty reading" / "Trouble reading" (`difficulty_reading` /
    `reading_difficulty`) → now `difficulty_reading`.
  - "Reduced overall vision" / "General vision loss" (`reduced_vision` /
    `vision_loss`) → now `reduced_vision`.

**The fix (bounded, one mechanism):** a single `TOKEN_ALIASES` map in
`js/data-model.js` is the source of truth. The engine's `addToken` canonicalises
EVERY producer through it — chips, free-text, findings, derived measurements —
so synonyms converge on one token; the KB (all 10 domain files) was migrated to
the canonical tokens; the registry generator applies the same map. All chips are
kept (no UI removed) — they just converge internally.

**Safety net added** (`tests/token-synonyms.test.js`): fails if any alias token
is ever consumed by the KB, if the alias map has chains/self-maps, or if a NEW
word-order/plural synonym pair appears in the matching vocabulary un-aliased —
so the next "high_iop vs IOP_high" is caught before it ships.

**Verification:** registry 564→559 tokens; full suite **266/266** (263 + 3 new
guards) including golden vignettes and the un-suppressible red flags. Confirmed
all three tearing chips now emit `watering`, and IOP 35 still yields both
`high_iop` + `very_high_iop`.

**Flagged for founder's clinical call:** consolidating vision-loss surfaced a
genuine near-tie — **Optic Neuritis vs Stargardt / Cone Dystrophy** for painless
central/colour vision loss in a young patient (they legitimately share
reduced_vision, colour-vision loss, central scotoma, reduced contrast). Left as
a real differential; you may want to sharpen it with a discriminator (RAPD /
family history). Also: a broader chip-vocabulary review found a few *possible*
(nuanced) synonym clusters I did NOT auto-merge — asthenopia/eye_strain/fatigue,
head_tilt/abnormal_head_posture — left for your judgement.

---

## 2026-07-24 — Session 11k (cont.): Portable core schema + backend recommendation

**Fixed a real gap in "set up your own backend".** `BACKEND_OWNERSHIP.md` told
the founder to run `001` then `002`, but **`001` never existed as a file** — the
core schema (clinics, patients, visits, encounters, KB tables, RLS, the private
membership helpers) had only ever been applied directly to the not-founder-owned
project via tooling. So the founder literally could not reproduce the full
backend on a project they own. Now fixed:

- **`db/migrations/001_core_schema.sql`** — the complete core schema, reconstructed
  faithfully by introspecting the reference project's live structure (tables,
  columns, constraints, RLS policies, `private.*` SECURITY DEFINER helpers,
  indexes, realtime). Idempotent.
- **Verified by actually running it:** spun up a throwaway PostgreSQL 16, stubbed
  the Supabase `auth` schema, and applied `001` → `002` on a fresh database. Both
  apply cleanly and are **re-runnable without error**; the result reproduces the
  reference exactly — **9 tables, 20 RLS policies, 7 functions**.
- **Bug found + fixed in `002` while testing:** its `profiles_insert_own` policy
  was preceded by a `drop policy if exists "profiles_upsert_own"` (wrong name),
  so a second apply errored. Corrected the drop to match — `002` is now
  idempotent too. (No effect on any live DB; first-apply was always fine.)

**`docs/BACKEND_RECOMMENDATION.md`** — the plain-language decision doc the founder
asked for: bottom-line recommendation (**Supabase, own account**; free to start,
~$25/mo Pro when real patient data arrives), an honest comparison vs Firebase /
custom server / raw cloud, real cost numbers, a **compliance flag** (HIPAA/GDPR
BAA needed before real PHI goes cloud-side — a founder spend/legal decision), a
scaling roadmap, and the exact **~15-minute step list the founder does from their
side** (create project → copy URL+anon key → run 001+002 in the SQL editor →
Connect in-app → two-device test). Reaffirms I won't spend their money or send
data to a backend they don't own.

**Guardrail note:** no diagnostic logic in the database; PII (`patients`) stays
separate from de-identified analytics (`encounters`); backend remains OFF by
default and never a runtime dependency for an exam.

---

## 2026-07-24 — Session 11k: KB batch 19 + onset tokens now feed the engine properly

**KB batch 19 — 2 genuinely-missing conditions** (both ICD validated real +
billable via the ICD-10 MCP, both `NEEDS_CLINICAL_REVIEW`): Facial Nerve Palsy
(Bell's) — Ocular (**G51.0**), Ophthalmoplegic Migraine (**G43.B0**). Each ships
matching tokens (req/sup/con), a validated ICD with a clinical caution, and a
hand-written "About" note. Bell's added to the "Common in practice" quiz list;
Ophthalmoplegic Migraine left out (genuinely rare). KB now **394 conditions**.

**Token-mapping fix the founder asked for ("make sure the tokens are mapped
properly for each and every condition").** Found a real dual-vocabulary gap:
- The onset selector ("Sudden" / "Gradual") emits the *temporal-field*
  vocabulary (`acute` / `gradual`), which 98+ conditions use in their
  `temporal` list — that part worked.
- But **53 conditions** carry the onset signal in their `req`/`sup`/`con`
  matching lists under `sudden_onset` / `gradual_onset` (e.g. `sudden_onset`:
  2 req + 17 sup + 34 con; `gradual_onset`: 75 con). Those tokens were **only
  reachable via free text** — so a clinician *clicking* "Sudden onset" did not
  actually feed the match. Bell's Palsy (which requires `sudden_onset`) exposed
  it: it would not surface from the dropdown, only from typed notes.
- **Fix (2 lines in `js/engine.js` SOURCE 3):** selecting onset "Sudden" now
  also emits `sudden_onset`; "Gradual" also emits `gradual_onset`. The clickable
  onset field now feeds the same tokens the KB matches on. This strengthens
  contradiction logic across the whole KB when onset is explicitly recorded —
  which is the correct clinical use of that field.

**Verification:** token registry regenerated (no unreachable required tokens);
full suite **263/263 green** including the golden clinical vignettes, KB
cross-conflict, UI-reachability, and the un-suppressible red-flag alerts
(flashes+floaters, IOP>40, RAPD). Confirmed Bell's now leads its own
presentation via the realistic clickable path (lagophthalmos chip + "Sudden"
onset), and Ophthalmoplegic Migraine surfaces alongside Third-Nerve Palsy
(correctly ranked below it — the dangerous mimic stays on top).

**No engine scoring/alert logic changed** beyond the input-mapping bridge above;
offline path intact; UI unchanged.

---

## 2026-07-18 — Session 11j: Backend ownership fix (cloud OFF by default, connect-your-own) + honesty doc

**Founder raised a legitimate concern:** the app was wired to a Supabase project
they never set up. Investigated: the project lived under an org ("UniOrg", free
tier) attached to the *development environment's* Supabase connector, created in
an earlier build session — **not an account the founder owns**, yet its URL +
anon key were hard-coded in `js/cloud-config.js`, so a signed-in user's data
would have gone there.

**Fixed — safe by default:**
- Removed the hard-coded "UniOrg" project. `CLOUD_CONFIG` now defaults to
  **enabled:false, url:"", anonKey:""** — the cloud is fully OFF; nothing syncs
  anywhere.
- Added `configureCloud(url, anonKey)` / `cloudConfigured()` / `disconnectCloud()`
  — the user connects **their own** Supabase project (validated URL + key), stored
  only on their device. The Cloud card now shows a **Connect-your-own-project**
  form when unconfigured, and a Disconnect path.
- `docs/BACKEND_OWNERSHIP.md`: straight explanation of what happened, why the
  backend still needs the founder's own account to be robust, and the one-time
  setup steps. The staged migrations in `db/migrations/` port to any project.

No patient data has a destination now unless the founder deliberately points the
app at a project they control. Offline-first is unchanged. Tests green; browser
smoke confirms cloud-off default, connect validation, and disconnect.

---

## 2026-07-18 — Session 11i: KB batch 17, stress-test + robustness fixes, data export, backend multi-user wiring

**KB batch 17 — 4 genuinely-missing common conditions** (all ICD validated
real+billable via the ICD-10 MCP, all `NEEDS_CLINICAL_REVIEW`): Computer Vision
Syndrome / Digital Eye Strain (**H53.149**), Strabismic Amblyopia (**H53.039**),
Photokeratitis (**H16.139**), Vitreous Floaters / Benign (**H43.399**). One new
`uv_exposure` symptom chip; all other tokens reuse existing reachable ones. About
notes written; all four added to the common-conditions study list. All four
surface correctly in the engine. **KB now 387 conditions.**

**Stress-tested the unique features** (`tests/stress-features.test.js`, +13) with
adversarial input — and it caught **2 real robustness bugs**, now fixed:
- `analyticsCompute` crashed on null/malformed users, visits or cases → guarded.
- `casebookGroupByCondition` crashed on a null casebook entry → guarded.
Also verified: seeded-RNG quiz determinism, near-zero immediate repeats over a
40-question run, well-formedness across 60 questions, de-identification of
regex-special/empty names, and role/save-cap edge cases.

**Well-organized data export** (`js/data-export.js`, +6 tests). Open-format
exports with a tested pure core (RFC-4180 CSV): **Analytics CSV**, **Casebook
CSV/JSON**, **Records CSV** (real records only — practice excluded, tested), and
a **de-identified Research CSV** (aggregate distributions only — no PII, tested).
Role-appropriate export card: everyone gets analytics + casebook; clinician/admin
get records; researcher/admin get the de-identified research export; admin gets
the full JSON backup. On the Account and Research tabs.

**Backend multi-user client wiring** (uses the applied migration). `cloudSyncProfile`
upserts the user's app role to `public.profiles` on sign-in and reads the tier
back (server-authoritative); `cloudJoinClinic` calls the `join_clinic_by_code`
RPC so a second person can **join** a clinic — with a join-code input on the
Cloud card. All best-effort and offline-tolerant (signed-out/offline unchanged).

**274/274 tests pass.** Browser smoke: export cards per role, no console errors.

---

## 2026-07-18 — Session 11h: Big polish pass — segregation fix, continuous quiz, KB detail, faculty portal, analytics, student study

Founder-reported issues + requested build-outs, worked through in tested phases.

**BUG — practice records leaked into the clinician view.** A student's practice
exams were showing in the Clinician Patients tab. Fixed with `realPatients()` /
`practicePatients()` helpers: the Patients tab and clinical stats now count REAL
records only; practice lives solely in the student Study workspace.

**BUG — admin didn't segregate users.** The admin console now groups accounts
by role (🎓 Students · 🩺 Clinicians · 📚 Faculty · Other) with per-cohort
counts, plus change-mode and delete per account.

**Analytics (new `js/analytics.js`).** Pure aggregation core (accounts by role,
real/practice split, completion, red-flag rate, diagnosis & domain
distributions, casebook, quiz, KB coverage) + a role-tailored modal with CSS
bar charts: student progress, clinician caseload, faculty teaching metrics,
admin overview with a "view as" switcher. **Researcher promoted to a live role**
with its own Research portal; its analytics are strictly de-identified aggregate
(no PII). Analytics cards on every role home.

**Continuous MCQ quiz.** Rebuilt as a running session — persistent header
(question #, running score, streak, best), questions swap in place one after
another, no immediate repeats, keyboard 1–4 to answer + Enter/N to advance,
numbered options. Vastly more variety (KB + casebook, hundreds of vignettes).

**KB — every condition clickable.** Each row opens a full detail card (About
summary + facts, ICD-10 code/label, urgency, verified/provisional, and the
required/supportive/against/test findings the engine uses) with a Back button;
admins get inline Verify + Edit. **Check-for-updates** now applies live
(re-renders on apply, offers Apply-now reload when deferred) with honest
offline/disabled/error messages.

**Faculty portal built out.** Teaching workspace with a coverage snapshot,
casebook build (exemplar exams) + curation, live review queue, KB authoring, and
teaching analytics.

**Student study built up.** Practice exams get status + a "clear all" control
(uncounted, resumable). New **example casebook**: `casebookSeedExamples` loads a
ready-made, de-identified study case per common condition (findings from the
condition's own tokens — anti-fabrication tested; About note as the teaching
point; pre-reviewed so they never hit the faculty queue).

Tests **+17** (analytics 7, example cases 3, plus updates); **256/256 pass**.
Four browser smokes green: segregation + admin grouping + analytics; continuous
quiz + KB detail; student study + faculty portal.

---

## 2026-07-18 — Session 11g: Sign-off export, common/rare quiz, KB-saturation finding, backend Phase-2 prep

Batch of the founder's requested follow-ups.

**Export sign-offs → source** (`knowledge/verified.js` + loader + Admin button).
The Admin panel now exports a ready-to-commit `verified.js` built from the
device's founder verifications; the loader applies `KB_VERIFIED` at boot so a
committed file makes sign-offs permanent on every install. Round-trip tested
(verify → export → bake → fresh boot shows verified). Review flags only.

**Common/All quiz scope** (`knowledge/common-conditions.js` + quiz selector). A
curated ~90-condition "common in practice" list — **flagged
NEEDS_CLINICAL_REVIEW** because commonness is a clinical judgement, NOT invented
prevalence data. The quiz gains a Common/All scope toggle (Common draws only
from the list). A test enforces every listed name matches a real KB condition.

**KB "+20 per area" — VERIFIED already saturated, did NOT fabricate.** The
CONTINUE_HERE note said Glaucoma/Anterior-Uveitis/Cornea/Neuro still owed +20
each. Checked the live counts: **Cornea 59, Neuro-Ophthalmic 51,
Anterior/Uveitis 29, Glaucoma 22** — the note was stale (later batches already
grew them). Forcing 20 more marginal entries each would risk fabricating
low-value conditions (guardrail). Recorded the finding; a *targeted* gap-fill of
genuinely-missing common conditions (e.g. Computer Vision Syndrome, Strabismic
Amblyopia, Photokeratitis, benign Vitreous Floaters) is proposed for a future
batch instead.

**Backend Phase-2 prep** (`docs/BACKEND_PHASE2.md` + `db/migrations/
002_profiles_and_invites.sql`). Surveyed the live `entopic` Supabase project:
ACTIVE_HEALTHY, all 8 tables RLS-enabled, 7 migrations applied, **security
advisors clean**. Identified the three gaps for multi-user / multi-individual /
cloud-push and **staged** (not auto-applied — live-DB changes are founder-gated)
an additive, RLS-enabled migration: `public.profiles` (per-user app role +
tier, so identity persists server-side) and `clinics.join_code` +
`join_clinic_by_code()` RPC (so a second individual can JOIN a clinic, today
only creatable). Verified the existing `tools/seed-cloud-kb.js` still emits
valid SQL for the full 384-condition KB (the cloud-push path). Client wiring +
KB seed documented as ready next steps.

Tests **+13** (export round-trip, common-list validation, quiz scope);
**235/235 pass**. Browser smoke: scope/level selectors, new KB files load, no
errors.

---

## 2026-07-18 — Session 11f: Rapid Clinical Review Queue (founder verifies the 246 provisional entries)

Long-standing backlog item (CONTINUE_HERE #2), now unblocked by the Admin
panel. The KB editor already had one-at-a-time verification buried inside it;
this adds the **fast batch path** the founder actually needs.

New **`js/kb-review.js`** + `#modalReview`:
- **The queue** (`kbReviewItems`): every `NEEDS_CLINICAL_REVIEW` condition as a
  compact row showing exactly what the attestation covers — required findings,
  URGENT flag, ICD-10 code + label, About summary. Urgent entries first (their
  flags are the riskiest to leave unreviewed), then by specialty area;
  searchable + area-filter chips.
- **One-click Verify** (`kbRapidVerify`): flips `review_status` AND
  `icd_status` to `VERIFIED_BY_CLINICIAN` on the LIVE condition, stamped with
  who/when. **Review flags only — clinical content (tokens, codes, urgency) is
  untouched**, enforced by test; content edits stay in the KB editor (which
  re-stamps provisional, as it must).
- **Persistence**: reuses the existing local-edits overlay (`kb-remote.js`), so
  sign-offs survive reloads and remote KB bundle loads — verified in the smoke
  by reloading the app.
- **Ripples through the UI**: the "· provisional" chip in the KB browser clears;
  the About panel's provisional warning becomes "✓ Clinically verified on
  DATE by NAME"; the Admin tab carries a live "N of M provisional" card.
- **Admin-gated** — clinical verification is the founder's authority
  (`isAdmin()`); a normal account cannot open the queue.

Tests **+5** (`tests/kb-review.test.js`, incl. the content-untouched
invariant); **227/227 pass**. Browser smoke: non-admin blocked, queue opens
with ICD rows, verify shrinks 246→245, live flip + attribution, local-edits
persistence, KB-browser chip cleared, and the sign-off survives a reload.

---

## 2026-07-18 — Session 11e: Super admin + reviewed-only filter + quiz difficulty

**Founder:** both proposed features, plus a super-admin sign-in with pre-set
credentials that gets everything at full limits; the full clinician app stays
the paid offering for others but free via admin.

- **Super admin** (`roles.js` + `app.js`). Signing in with the pre-set id
  (`entopic-admin`) + password unlocks **everything**: tier forced to
  Institutional (unlimited saving — the free cap never fires), every role
  capability and tier lock returns unlocked, KB Editor always accessible, and
  an extra **Admin tab** appears with: device stats, the list of local accounts
  (with delete — sign-in only, shared patient data untouched), **change admin
  password**, KB editor and full export/import. The password lives as a
  **hash** (djb2), never plaintext, changeable from the panel (stored locally);
  the admin session is ephemeral and never written to the users store.
  **Honesty note (also in-code):** Entopic is fully client-side today, so this
  gate is a convenience lock, not security — real auth/entitlement enforcement
  is the Phase-2 backend. The clinician workspace itself is unchanged and
  complete (all 22 exam steps, engine, advisory, flow map, chart, reports, Rx,
  referral, coding, import/export, cloud card): free users have it with the
  save cap; the cap/locks become the real paid boundary when licensing lands;
  admin bypasses it all now.
- **Casebook: "✓ Reviewed only" filter.** A sign-off facet chip (appears once
  any case is faculty-reviewed) narrows the casebook to signed-off cases;
  composes with search/area/token filters; students see exactly the
  faculty-approved set.
- **Quiz difficulty tiers: Easy / Standard / Hard.** Difficulty = **fewer
  clues + closer look-alikes** (easy: required + 4 supportive findings;
  standard: +2; hard: required only, distractors drawn strictly from the same
  clinical route). Selector in the quiz, persisted. **Divergence:** the
  proposal said "common vs rare" tiers, but the KB holds no prevalence data and
  inventing a commonness list would fabricate clinical facts (hard guardrail) —
  clue-based difficulty delivers the gradient honestly. A true common/rare tier
  can be added later from a founder-verified list (NEEDS_CLINICAL_REVIEW flow).

Tests **+9** (admin 4, difficulty 4, reviewed filter 1); **222/222 pass**.
Browser smoke: admin login → Institutional·Admin, uncapped saving past the free
limit, every capability unlocked, panel lists/deletes accounts, password change
(old rejected, new accepted), reviewed chip narrows to the signed-off group,
difficulty buttons + hard<easy clue counts. All prior smokes still green.

---

## 2026-07-18 — Session 11d: Phase-1 refinement — real features for every role, deeply integrated

**Founder:** "work on the relevant steps of phase 1. Refine. Add relevant
features for all. Make it well Integrated." Both "coming soon" stubs are now
real, and the role system is woven through signup, the exam, and the casebook:

- **Student — Quiz / self-test is live** (`js/ui-quiz.js` + `#modalQuiz`).
  "Guess the diagnosis": vignettes are built ONLY from existing content — a KB
  condition's own required/supportive findings (anti-fabrication enforced by
  test) or the user's de-identified casebook cases; distractors are real KB
  conditions from the same route/domain; the explanation is the hand-authored
  About note; urgent conditions carry a "sight-threatening" flag. Local
  streak/best stats make the habit loop; the Study tab shows the live stat line.
- **Student — practice exams are never capped.** Student-mode `newPatient()`
  creates records flagged `practice: true`: exempt from the free save limit
  (learning is unrestricted — `SAVE_LIMITS.*.practice = Infinity`), labelled
  with a "practice" chip in every patient list and a PRACTICE tag in the exam
  header, and listed under "My practice exams" on the Study tab. The free cap
  now counts **real records only**.
- **Faculty — case review is live.** In the casebook, faculty get **✎ Annotate**
  (edit the teaching note; timestamped) and **✓ Mark reviewed** (toggle,
  timestamped); the reviewed badge shows to every role so students can spot
  faculty-approved cases. The Teaching tab now has a **review-queue card**
  ("N of M cases awaiting your review"). Student logbooks across accounts stay
  "coming soon" (needs shared accounts).
- **Integration: role is chosen at signup.** The account-creation form asks
  "Using Entopic as" (Clinician / Student / Faculty), so new users land straight
  in their workspace — the picker now only appears for legacy accounts with no
  saved role. `roleSessionReset()` on login/logout/setup prevents one account's
  role leaking into another on the same device (first-run check is now
  per-ACCOUNT, `CU.role`, not per-device).

Guardrails: quiz is educational-only (never touches a live exam, never feeds
the engine, offline, no LLM, no invented content); practice/real split keeps
"free limits saving, never learning" exact.

Tests **+11** (quiz 6, roles 2, casebook curation 3); **213/213 pass**. Browser
smoke end-to-end: role-at-signup (no picker) + legacy picker, quiz answer flow
with stats, uncapped labelled practice exams, faculty annotate/review with
badge, cap blocking real records while practice stays open.

---

## 2026-07-18 — Session 11c: Roles & modes — per-persona workspaces on one switchable account (Phase 1)

**Founder:** ship Student / Clinician / Faculty; each gets **different tabs +
a differently organised UI/UX**; **real accounts** for everyone; **free tier
limits saving, not learning**; habit-forming and **switchable** on the same
account (Student ⇄ Clinician ⇄ Faculty …).

New module **`js/roles.js`** — the two-axis model from `docs/ROLES_AND_MODES.md`:
- **Role** (persona/mode) and **Tier** (entitlement) are separate. `ENTOPIC_ROLES`
  catalogue (student/clinician/faculty live; demonstrator/multi-user/hospital/
  researcher flagged `soon` — open for scope). `getActiveRole/setActiveRole/
  effectiveRole` persist the active role **on the account** (`CU.role`) and
  locally, so one account switches modes freely.
- **Free tier limits SAVING, never LEARNING.** `canSave(kind,count)` +
  `SAVE_LIMITS` (free: 15 patient records, 40 cases; pro/institutional
  unlimited). The engine, red-flag safety, glass-box reasoning, KB and casebook
  are `ALWAYS_ON` — unlocked for every role and tier. `can()` combines role
  visibility × tier locks (billing/rx/authoring by role; cloud-sync/publishing/
  multiuser by tier).

UI:
- **Startup "Who are you here as?" picker** (`#modalRolePicker`) on first run,
  and a persistent **"Switch mode ▾"** — habit-forming, one tap, any time.
- **`renderHome` is now role-aware**: a mode strip + **per-role tabs** + the
  active tab's workspace. Student → **Study** (casebook, reference, practice
  exam, quiz-soon); Clinician → **Patients** (today's dashboard); Faculty →
  **Teaching** (casebook, KB, student-review-soon). Shared Casebook / Reference /
  Account tabs. The exam flow, engine and KB are untouched — this reorganises the
  front door only.
- **Free-tier save cap enforced** at `newPatient()` and "Save as teaching case"
  with an honest message (no paywall; export/delete frees space). An Account tab
  shows the plan + "Pro upgrade — coming soon". **No pricing/payment built** —
  that and real licence enforcement stay founder-gated (Phase 2).

**Divergence from the plan doc:** founder chose **real accounts for students**
(not sandbox-only) and **saving-limited free tier** — implemented as written.

Tests **+8** (`tests/roles.test.js`); **202/202 pass**. Browser smoke: picker on
first run, per-role tabs/landings, mode switch on one account, save cap blocks at
the limit — no page errors.

---

## 2026-07-18 — Session 11b: Casebook on the homepage — grouped by condition, filterable by sign/token

**Founder:** "continue with the casebook shortcut in the main homepage
navigation and cases should be organised according to conditions and then is
filterable acc to various tokens/sub conditions."

- **Homepage shortcut.** A **📚 Teaching Casebook** card now sits on the
  dashboard (`renderHome`) with a live summary ("N de-identified cases across M
  conditions") and a **Study casebook** button — reachable without opening a
  patient, so it works as a standalone study tool.
- **Organised by condition.** The casebook modal now groups cases under their
  leading condition (biggest groups first), each with a case count.
- **Filterable by facet.** A search box (matches condition, sign, token or
  teaching note) plus one-click **Area** (specialty domain) and **Sign / token**
  chips derived from the stored cases. Chips toggle; "Clear filters" resets.
- Each case card now leads with de-identified metadata (age/sex/date, URGENT
  flag) and a short presentation cue, so cases within one condition are
  distinguishable at a glance.

New pure, tested helpers in `reasoning-views.js`: `casebookEntryTokens`,
`casebookFacets`, `casebookFilter`, `casebookGroupByCondition`,
`casebookHomeSummary`; `buildExamState` assessment now carries `domain` for
grouping/filtering. Still de-identified, offline, display-only.

Tests **+6** (13 view tests total in the file); **194/194 pass**. Browser smoke
check confirms the homepage card, grouping, facet chips, search-narrowing, and
**no PII leak** in the rendered casebook.

---

## 2026-07-18 — Session 11: Reasoning-views layer — SOAP note + de-identified casebook (Vision Moves 1 + 4)

**Founder chose the direction** (from `docs/VISION_THINKTANK.md`): **Move 1
(documentation-as-exhaust) + Move 4 (diagnosis and education are one act)**.
These share one foundation, so they're built as a single layer, not two.

**The idea in one line:** *one exam → one reasoning state → many rendered views.*
The clinician examines; the note and the teaching case both fall out of what the
deterministic engine already computed. No new charting work.

New module **`js/reasoning-views.js`** (display-only; the engine is untouched):
- `buildExamState()` — a canonical, DOM-free snapshot of the current encounter's
  reasoning: captured findings + the engine's ranked differential **with its
  evidence trail** (`matched / missing / contradicted`) + red-flag alerts + the
  next discriminating tests. Every view renders from this one object.
- **Move 1 — `stateToNoteText()`** renders a **SOAP clinical note**: a faithful
  projection of the reasoning (the Assessment shows *why* each impression, not
  just the label), with safety alerts pinned above the assessment and the
  advisory banner stamped on. Surfaced via a **📝 SOAP Note** button on the
  report page (`#modalNote`, copy/close).
- **Move 4 — the Casebook**: `deidentifyState()` strips PII (name/MRN removed,
  age capped 90+, patient's own name scrubbed from free text), then
  `casebookAdd()` stores a **de-identified** teaching case locally (via
  `storage.js`). **🎓 Save as teaching case** + **📚 Open casebook** buttons on
  the report page (`#modalCasebook`) — each case is the same reasoning state
  viewed for learning, with a faculty/clinician teaching note.

**Anti-fabrication guarantee (patient safety):** a field that was never entered
is **omitted**, never rendered as an assumed "normal" — the blankVisit defaults
(WNL / White-and-quiet / ISNT / foveal reflex) never appear unless actually
recorded. Enforced by a dedicated test.

**Guardrails honoured:** diagnosis stays in `engine.js` (these are views, nothing
feeds back — firewall verified by test); no LLM, no network, fully offline;
advisory-only framing on every artifact; casebook is de-identified before storage.

**Divergence from the doc:** the think-tank recommended Move 1 + Move 3; the
founder preferred **Move 1 + Move 4**, which is a tighter pairing because both are
views of the *same* state (one renderer serves paperwork *and* teaching). LLM
prose-polish / ambient voice capture is deliberately **out of this slice**
(spend + PII gate — founder-decided later).

Tests: **+10** (`tests/reasoning-views.test.js`), plus a headless-browser smoke
check of both views. **188/188 pass** (was 178). App boots clean; offline path
intact.

---

## 2026-07-17 — Session 10p: KB search by sign/synonym + Pseudophakia (the "missing conditions" fix)

**Founder reported** many common conditions (ptosis, blepharitis, the
conjunctivitides, hypopyon, chalazion, stye, Bitot spot, pterygium, blepharospasm,
PCO, retinitis pigmentosa, chemical injury, trichiasis, madarosis, keratoconus,
concretions, papillae…) as "missing totally from the build."

**Root cause: they were NOT missing — 20 of the 21 listed were already present.**
Verified the KB browser renders all conditions; the problem was the *search*
matched only the exact condition NAME, so searching by a **sign, synonym or
eponym** ("bitot", "seidel", "papillae", "stye"-vs-"hordeolum", "pink eye")
returned nothing and looked like an absent condition.

Fixes:
1. **KB search now matches signs, synonyms, findings and domain**, not just the
   name (`kbSearchKeywords` + a `KB_SYNONYMS` lay-term/eponym map). Now "bitot"
   → Xerophthalmia, "seidel" → Open Globe/Corneal Laceration, "papillae" → the
   four papillary conditions, "pco" → Posterior Capsular Opacification, etc.
2. **Added the one genuinely-missing entry: Pseudophakia** (with ICD Z96.1 and a
   note). (Seidel is a *test*, not a diagnosis; "low vision" isn't a discrete
   condition.)

KB now **383 conditions**, all coded + noted (0 missing). 178/178 tests pass.

---

## 2026-07-17 — Session 10o: sign-rich common-conditions drive — Surface & Lids (+11)

Added 9 new clickable lid/conjunctival findings and 11 common adnexal/surface
conditions: **Dermatochalasis, Xanthelasma, Eyelid Papilloma, Eyelid Epidermoid/
Sebaceous Cyst, Distichiasis, Eyelid Contact Dermatitis, Phthiriasis (lice),
Congenital Ptosis, Symblepharon, Conjunctival Concretions, Chemosis** (Surface &
Lids 61 → 72). Each with reachable inputs, a validated ICD-10 code and a
hand-written note. KB now **382 conditions**, all coded + noted (0 missing).
178/178 tests pass; cross-conflict at baseline.

---

## 2026-07-17 — Session 10n: sign-rich common-conditions drive — Retina (+11)

Started the sign-rich areas. Added 11 new clickable fundus findings (Hollenhorst
plaque, sectoral infarct, Roth spot, bull's-eye maculopathy, PED, torpedo lesion,
myelinated fibres, snail-track, peripheral cystoid, CHRPE, bear-tracks) and 11
common Retina conditions on them: **Retinal Arterial Embolus, Branch Retinal
Artery Occlusion, Roth Spots, Hydroxychloroquine Retinopathy, CHRPE, Grouped
Pigmentation, Torpedo Maculopathy, Myelinated Nerve Fibres, RPE Detachment,
Snail-track & Peripheral Cystoid Degeneration** (Retina 81 → 92). Each with
reachable inputs, a validated ICD-10 code and a hand-written note. KB now **371
conditions**, all coded + noted (0 missing). 178/178 tests pass; cross-conflict
at baseline.

---

## 2026-07-17 — Session 10m: common-conditions drive — Refractive & Binocular (+6)

Continued the +20-per-area drive. Added 5 new symptom chips (high myopia, image-
size difference, visible squint, upward eye drift, abnormal head posture) and 6
common conditions: **High (Pathological) Myopia, Aniseikonia, Irregular
Astigmatism** (Refractive 8 → 11) and **Infantile Esotropia, Dissociated Vertical
Deviation, Pseudostrabismus** (Binocular 20 → 23) — each with reachable inputs,
a validated ICD-10 code and a hand-written note. KB now **360 conditions**, all
coded + noted (0 missing). 178/178 tests pass; cross-conflict at baseline.

Note: Refractive and Binocular are inherently token-overlap-limited (most present
as blur/strain/deviation), so they take the genuinely-distinct common additions
rather than a forced 20; the sign-rich areas (Glaucoma, Anterior, Retina, Cornea,
Surface, Neuro) will take 20+ next.

---

## 2026-07-17 — Session 10l: common-conditions drive — Lens batch (+10)

Founder asked for ~20 common, regularly-seen conditions per area. Starting with
the thinnest area, **Lens (13 → 23)**. Added 5 new clickable lens findings
(Hypermature/Morgagnian, anterior subcapsular opacity, lenticonus, Christmas-tree,
snowflake) → new tokens, then 10 common conditions on distinct anchors: **Mature,
Hypermature/Morgagnian, Intumescent, Anterior Subcapsular, Pseudoexfoliation
(lens), Anterior Lenticonus, Christmas-Tree, Diabetic Snowflake cataracts, IOL
Dislocation, Aphakia** — each with reachable inputs, a validated ICD-10 code and a
hand-written note. KB now **354 conditions**, all coded + noted (0 missing).
178/178 tests pass; cross-conflict at baseline. Other areas to follow, batch by
batch, toward the +20-per-area goal (richer areas can take 20+; a few thin areas
like Lens/Refractive have fewer than 20 genuinely-common additions).

---

## 2026-07-17 — Session 10k(2): KB expansion batch 11 + new tokens (intraocular tumours)

Expanded on all three fronts the founder asked for — **conditions, About notes,
and tokens**. Added **4 new clickable exam findings** (each wired end-to-end:
finding → token → condition, surfacing from a single click):
- "Iris mass / pigmented lesion" → `iris_mass_lesion`
- "Disc melanocytoma (dark lesion)" → `dark_disc_lesion`
- "Disc coloboma / excavation" → `disc_coloboma`
- "Astrocytic hamartoma (mulberry)" → `retinal_astrocytic_lesion`

And **5 new conditions** on those tokens: **Iris Melanoma, Optic Disc
Melanocytoma, Retinal Astrocytic Hamartoma, Optic Disc Coloboma, Choroidal
Metastasis** — each complete with reachable engine inputs, a validated ICD-10
code, and a hand-written note. Token registry regenerated; the new findings
appear in the slit-lamp/fundus finding lists so a clinician can click them.

KB now **344 conditions**, all ICD-coded and all with authored notes (0 missing).
178/178 tests pass; boots clean; cross-conflict at baseline.

---

## 2026-07-17 — Session 10k: KB expansion batch 10 (posterior-segment tumours & vasculitis)

Continued the knowledge base, following the full authoring standard (engine
inputs + ICD + hand-written note, all in lock-step). Added 5 new conditions:
**Choroidal Osteoma, Sclerochoroidal Calcification, Retinal Cavernous Hemangioma,
Frosted Branch Angiitis, Bietti Crystalline Dystrophy** — each anchored on
distinct, reachable exam tokens so it surfaces on its own evidence without
cross-conflict.

Each shipped complete: reachable req tokens + rule-out power (kb-expansion +
cross-conflict gates green), a validated real+billable ICD-10 code, and a
hand-written qualitative note (review-flagged). KB now **339 conditions**, all
coded and all with authored notes (0 missing). 178/178 tests pass; boots clean;
cross-conflict at baseline.

---

## 2026-07-17 — Session 10j: EVERY condition now has a hand-written note (334/334)

**Founder ask:** "each and every condition must have that [note/paragraph] and
feed to the engine — no condition should be left out."

Wrote hand-authored `CONDITION_INFO` notes for the remaining 153 conditions that
had only the auto-derived profile — across Lens, Refractive, Glaucoma, Retina,
Neuro-Ophthalmic, Anterior/Uveitis, Binocular Vision, Cornea and Surface & Lids.

### 🏁 Milestone: 100% authored coverage
- **All 334 conditions now carry a hand-written qualitative note** (summary + key
  facts), up from 31 at the start of this arc. No invented statistics, doses or
  citations; every one `review: true` pending founder verification.
- **How it feeds the engine (guardrail intact):** each note is surfaced by the
  engine's advisory panel via the "About this condition" toggle, which also
  appends the live **"In this patient"** block (the engine's own matched / missing
  / contradicting evidence for the current exam). The connection is
  engine→display only — reference prose still never feeds scoring, so diagnosis
  stays deterministic and inspectable.
- **Locked in:** new test `condition-info` → "EVERY KB condition has a
  hand-authored note (none left on the derived fallback)" fails the build if any
  future condition ships without one. The derived profile remains only as a
  safety net (still unit-tested via a synthetic condition). `KB_AUTHORING_CHECKLIST`
  updated to require a hand-written note for every new condition.

178/178 tests pass; app boots clean (334 notes loaded); red-flag alerts intact.

---

## 2026-07-17 — Session 10i: Surface & Lids COMPLETE — expansion fully coded + summarised

Finished the last domain. All 31 Surface & Lids expansion conditions done on both
fronts (batches A+B) — the oculoplastic/lacrimal set (floppy eyelid, blepharospasm,
canaliculitis, ptosis, blepharochalasis, punctal stenosis, congenital NLDO,
dacryoadenitis, dacryolithiasis), the ocular-surface/adnexal tumours (sebaceous &
basal cell carcinoma, conjunctival melanoma, OSSN, conjunctival nevus/lymphoma/
pyogenic granuloma, capillary haemangioma), the cicatrising/inflammatory group
(ocular cicatricial pemphigoid, Stevens-Johnson, trachoma, ocular rosacea,
medicamentosa), and the conjunctivitides (chlamydial, ophthalmia neonatorum,
giant papillary, ligneous, giant fornix, molluscum, conjunctivochalasis,
xerophthalmia).

### 🏁 Milestone: the whole expansion is now coded and summarised
- **ICD-10: 334/334 conditions coded (0 missing)** — the 197 provisional expansion
  conditions all now carry a code validated real + HIPAA-billable against ICD-10-CM
  2026 via the ICD-10 tool, defaulting to the unspecified-eye leaf, every one
  NEEDS_CLINICAL_REVIEW with caution notes where the mapping is a judgment call.
  Nothing fabricated.
- **Richer About summaries: 181** (up from 31) — every expansion condition across
  Retina, Cornea, Neuro-Ophthalmic and Surface & Lids now has a hand-written
  qualitative summary (no invented figures), review-flagged, in addition to the
  engine-derived profile that already covered all 334.

176/176 tests pass; app boots clean; red-flag alerts intact. Remaining follow-up:
founder verification of the provisional codes/summaries, and (optional) tightening
lid-carcinoma codes to exact eyelid+laterality per patient.

---

## 2026-07-17 — Session 10h: Neuro-Ophthalmic domain COMPLETE — ICD + richer About

All 33 Neuro-Ophthalmic expansion conditions done on both fronts (batches A+B+C).
Covers the optic neuropathies (arteritic/occult GCA, nutritional-toxic, LHON,
traumatic, diabetic papillopathy, Foster-Kennedy), the nystagmus set (downbeat,
pendular, spasmus nutans, convergence-retraction, congenital), the orbital/
compressive emergencies (pseudotumor, blowout fracture, carotid-cavernous fistula,
cavernous sinus thrombosis, orbital rhabdomyosarcoma/lymphoma, pituitary/chiasmal
compression), pupil/motility disorders (Adie, traumatic mydriasis, skew, CPEO,
ocular MG, superior oblique myokymia), IIH, neuroretinitis, papillophlebitis,
Tolosa-Hunt, Susac, tilted/hypoplastic disc, and occipital hemianopia. Every code
validated; every summary qualitative + review-flagged. Also allowlisted the one
verified dotless 3-char billable code (G08) in the icd-map test.

Running totals: **ICD 166/197 coded; authored About 150** (was 31). Retina,
Cornea & Neuro: 0 uncoded. 176/176 tests pass. **Only Surface & Lids (31) left.**

---

## 2026-07-17 — Session 10g: Cornea domain COMPLETE — ICD + richer About (plan B)

All 34 Cornea expansion conditions done on both fronts (batches A+B+C). Includes
the infective keratitides (Acanthamoeba, fungal, filamentary), the corneal
dystrophies (map-dot-fingerprint, lattice, granular, macular, Meesmann, PPMD,
Schnyder, CHED, gelatinous drop-like), degenerations (Terrien, spheroidal,
dellen, iron line, vortex), the ocular-trauma/emergency set (chemical burn, open
globe, IOFB, corneal laceration, descemetocele, graft rejection, acute hydrops),
and the peripheral ulcerative group (Mooren, PUK, vernal shield ulcer). Every
ICD-10 code validated real + billable (trauma codes flagged for 7th-char/
laterality); every About summary qualitative + review-flagged.

Running totals: **ICD 133/197 coded; authored About 117** (was 31). Cornea &
Retina: 0 uncoded. 176/176 tests pass. Remaining: Neuro-Ophthalmic (33),
Surface & Lids (31).

---

## 2026-07-17 — Session 10f: Retina domain COMPLETE — ICD + richer About (plan B)

Finished all 52 Retina expansion conditions on both fronts (batches C+D added 26:
Coats, sickle-cell, angioid streaks, POHS, MEWDS, APMPPE, PIC, asteroid hyalosis,
vitreous amyloidosis, FEVR, retinoblastoma, ARN, CMV retinitis, chorioretinal
coloboma, ocular albinism, achromatopsia, Terson, serpiginous choroiditis, LCA,
uveal effusion, post-op choroidal effusion, multifocal choroiditis/panuveitis,
AZOOR, CAR, Eales, hypotony maculopathy). Every ICD-10 code validated real +
billable; every About summary qualitative + review-flagged.

Running totals: **ICD 99/197 coded; authored About 83** (was 31). Retina: 0
uncoded. 176/176 tests pass. Next domains: Cornea, Neuro-Ophthalmic, Surface.

---

## 2026-07-17 — Session 10e: Retina batches A+B — ICD codes + richer About (plan B)

Working domain-by-domain (founder chose plan B): each body-area gets both its
verified ICD-10 codes AND richer hand-written About summaries before moving on.

**Retina batch A — 13 conditions** (Diabetic Macular Edema, Proliferative
Diabetic Retinopathy, Retinal Artery Macroaneurysm, Valsalva Retinopathy, chronic
CSCR, Myopic Macular Degeneration, Stargardt, Best, Cone Dystrophy, Choroideremia,
Degenerative Retinoschisis, Ocular Ischemic Syndrome, Commotio Retinae):
- ICD-10 codes added to ICD_MAP — all validated real + billable via the ICD-10
  tool; unspecified-eye default; NEEDS_CLINICAL_REVIEW + caution notes.
- Richer qualitative About summaries added to CONDITION_INFO (review:true).

**Retina batch B — 13 more** (Vitreomacular Traction, Solar Retinopathy,
Hemiretinal Vein Occlusion, Retinal Vasculitis, cicatricial ROP, Choroidal
Hemangioma, Gyrate Atrophy, Birdshot, Choroidal Rupture, Ocular Siderosis,
Malignant Hypertensive Retinopathy, Purtscher, Optic Pit Maculopathy) — same
treatment (validated ICD + richer About). Verified catches during lookup:
H44.319 is *chalcosis* (copper) not siderosis → used H44.329 (siderosis); H30.149
is APMPPE not birdshot → birdshot uses the posterior-inflammation bucket.

Running totals: **ICD 73/197 coded; authored About 57** (was 31). 176/176 tests pass.


---

## 2026-07-17 — Session 10d: KB-expansion standard — About + engine inputs required

**Founder ask:** "why only 31/334 have About content, what about the rest? And
make upcoming KB expansions include the About content along with engine inputs."

**Clarification of state:** all **334** conditions already have About content — 31
hand-authored rich summaries + **303 auto-derived** from each condition's own
definition; **zero are blank**. The "31" are simply the ones with the richer
written prose. (Also surfaced a real backlog: **197 conditions still lack an
ICD-10 code** — to be filled with *verified* codes over time, never fabricated.)

**Standard, now enforced:**
1. **`docs/KB_AUTHORING_CHECKLIST.md`** — the definition-of-done for every new
   condition: it must ship **engine inputs** (reachable `req` token, rule-out
   power, surfaces on its own evidence, no cross-conflict, review-flagged, ICD
   when verifiable) **and** **About content** (auto-derived from those same
   tokens, or a hand-authored entry for common conditions).
2. **New `kb-expansion` gate test** — "every expansion condition ships About
   content tied to its engine inputs": each new condition must resolve to About
   content, and a derived profile must surface the condition's own required
   token — proving the About text is generated from the engine inputs, keeping
   the two in lock-step as the KB grows.
3. **`ARCHITECTURE.md`** now points at the checklist from the KB section.

176/176 tests pass.

---

## 2026-07-17 — Session 10c: full "About" coverage + engine-connected info

**Founder ask:** "the About toggle needs fulfillment — more than 50% of the
conditions have no information. Also, try connecting that information to the
engine."

1. **100% coverage without fabrication (derived profiles).** Hand-writing prose
   for 300+ conditions would be slow and fabrication-prone. Instead the toggle
   now falls back to a **profile derived from each condition's OWN definition**
   already in the KB — its domain, ICD-10 code/label, and the required /
   supportive / contradicting findings the deterministic engine scores on,
   prettified into plain phrases. This is a faithful restatement of existing
   data, not invented content, so **every one of the 334 conditions now shows
   real information**. The 31 curated conditions still show their richer written
   summary; the rest show the derived profile, labelled *"auto-generated from
   this condition's definition"* (and flagging when the ICD code itself is
   pending review). New helpers: `buildConditionProfile`, `resolveConditionInfo`.
2. **Connected to the engine — "In this patient".** Each About card now appends a
   live block built from the engine's own evidence trail for that differential:
   which of the condition's findings are **observed** (matched), which are
   **missing** (would support), which **argue against** it — plus the current
   probability. So the reference card explains the engine's ranking for the
   actual exam in front of the clinician. **Guardrail preserved:** this is
   engine→display only; reference prose still never feeds scoring, and diagnosis
   stays deterministic. Because the derived profile is generated from the very
   tokens the engine reads, the definition-level content and the engine can never
   drift apart.
3. **Tests (condition-info now 9 cases):** assert every KB condition resolves to
   non-empty content, that the curated set stays "authored" and the rest are
   "derived", that a derived profile faithfully surfaces the condition's own
   required token, and that no quantitative figure is fabricated in either path.
   175/175 tests pass; app boots clean; red-flag alerts intact.

---

## 2026-07-17 — Session 10b: reference-library / living-research plan (explore only)

**Founder ask:** "Explore a plan of adding UI/UX optimised for acting like a
reference textbook, regularly updating research and studies, articles etc."

Wrote **`docs/REFERENCE_LIBRARY_PLAN.md`** — a proposal (nothing built). Core
idea: separate **curation** (central, periodic, source-linked, founder-reviewed)
from **use** (offline, in-app), so "living research" never becomes a runtime
network/PII dependency. The Session-10 ⓘ toggle is the UI shell it fills. Every
reference item must carry a real citation (PMID+DOI / named guideline); any LLM
use is *extractive summary of a fetched source*, labelled + provisional; content
is display-only and never re-enters scoring. Phased so Phases 1–2 (real cited
packs + offline viewer) cost **nothing new**; automated refresh (Phase 3) and
on-demand lookup (Phase 4) are founder-gated spend. Verified the research tooling
returns real citable material (PubMed). **Four decisions escalated to the founder**
(spend appetite, which guideline bodies to trust, scope/depth, whether to include
an online lookup). Awaiting his call before any build.

---

## 2026-07-17 — Session 10: "About this condition" reference toggle

**Founder ask:** "final suggestion diagnosis have a toggle button to provide a
brief paragraph of the scientific condition and other important facts the
clinician would find useful if required."

1. **New `ⓘ About this condition` disclosure** on the leading impression and on
   every ranked differential. Tapping it expands a plain-language summary +
   a few key clinical facts for that condition, then collapses again.
2. **Kept safe by design (no-fabrication guardrail):**
   - Reference prose lives in a **separate module** (`knowledge/condition-info.js`),
     deliberately OUTSIDE the diagnostic KB, so it can **never** influence the
     engine — scoring/routing/alerts still read only the structured req/sup/con
     tokens.
   - Content is intentionally **qualitative** — no invented statistics,
     likelihood ratios, numeric thresholds, drug doses, ICD codes, or citations.
     Just what the condition is, how it typically presents, and why it matters.
   - Every entry is **flagged provisional** and renders a visible *"pending
     clinician verification"* badge until the founder verifies it.
   - Conditions **without** an entry show a neutral *"no verified summary yet —
     add one in the KB editor"* state. Nothing is ever generated on the fly.
3. **Seeded ~31 common conditions** (uveitis, the cataract types, POAG/angle
   closure, dry eye/MGD, the conjunctivitides, blepharitis, diabetic retinopathy,
   dry/wet AMD, PVD/retinal tear/detachment, CRAO/CRVO, optic neuritis, corneal
   abrasion/microbial keratitis, keratoconus, scleritis/episcleritis, etc.).
   **All are `NEEDS_CLINICAL_REVIEW`** — please skim and correct any wording;
   I'll flip each to verified as you confirm it.
4. **New integrity tests** (`condition-info`, 5 cases): every key matches a real
   condition name, every entry is well-formed, all are flagged provisional, and
   a guard rejects any numeric/statistic/ratio/dose figure sneaking into the
   prose. 171/171 tests pass.

---

## 2026-07-16 — Session 9b: negation-safe free-text parsing (junk-finding fix)

**Caught during verification of Session 9.** The new free-text tokenizer read
the *default* fundus placeholder `"Flat, no breaks"` as a positive **retinal
break** — so **every blank/normal exam** silently carried a `retinal_break`
token (a would-be urgent finding fabricated from nothing). Root cause: naive
substring matching ignores negation.

- `slParseText` is now **negation-aware** (`slNegatedAt`): a keyword only emits
  a token if it isn't negated earlier in its clause. "no breaks", "without
  exudates", "denies floaters", "free of NVE" no longer fire; negation carries
  across "and" ("no exudates and hemorrhage" → neither) but an adversative
  "but"/"however" or a clause break resets it ("no injection but exudates
  present" → exudates). Real findings ("superior horseshoe tear") still fire.
- New guard test asserts a blank visit and the default placeholders emit **zero**
  tokens, that adjective-separated and "and"-joined negations are suppressed, and
  that a genuine positive still fires. 166/166 tests pass; cross-conflict at
  baseline.

**Why it matters:** this is exactly the "junk diagnosis" class the founder
flagged — a fabricated finding on a normal eye. It is now impossible via the
free-text path.

*Verification note for the founder:* an **isolated** sign entered as free text
only surfaces a condition when the knowledge base has a condition that
*requires* that sign (e.g. LOCS grades → cataract works, because a high grade
also implies gradual blur; gonio narrow angle → angle conditions work). A
free-text "retinal tear" with no symptoms currently surfaces nothing because no
KB condition lists `retinal_break` as a required finding — a **KB content gap**,
not an engine fault, and a candidate for a future batch (a dedicated "Retinal
Break / Tear" entry, clinically reviewed).

---

## 2026-07-16 — Session 9: structured exam fields now drive the engine live

**Founder ask:** "more than 50% of clickable options in the slit lamp and other
pages don't even do anything on clicking, and no output is fed to the engine."

**Root cause:** the engine only read the *chip-list* findings
(`V.sl.findings`/`V.fun.findings` via `FINDING_TOKEN_MAP`). It never read the
**structured per-eye fields** — the AC cells/flare dropdowns, the LOCS lens
grades (NS/C/PSC), or the free-text cornea/conjunctiva/lids/macula/vessels/
periphery/vitreous boxes, gonioscopy Shaffer grades, and motility notes. Those
were fully clickable/typeable but emitted **nothing**, so recording them changed
no differential.

1. **Engine reads every structured field (SOURCE 9b + fundus/motility/gonio).**
   Added `slGrade`/`slNum`/`slParseText` helpers and a keyword-map tokenizer so:
   - **AC cells/flare dropdowns** → `cells_present`/`flare_present` **plus the
     graded token** (`cells_2/3/4`, `flare_2/3/4`) that Session 8 wired into
     uveitis/endophthalmitis severity.
   - **LOCS grades** → `nuclear_sclerosis_grade_N` / `cortical_opacity` /
     `psc_opacity` (only at grade ≥2, so a normal lens stays silent).
   - **Free-text cornea/conj/lids/macula/vessels/periphery/vitreous** →
     keyword-parsed into signs (`corneal_edema`, `follicles`,
     `blepharitis_anterior`, `cotton_wool_spots`, `retinal_break`,
     `vitreous_hemorrhage`, drusen, etc.).
   - **Gonioscopy** Shaffer grade ≤1 → `narrow_angle`/`angle_closure_risk`;
     recess/rubeosis/pigment parsed. **Motility** notes → `limited_abduction`,
     `nystagmus_other_eye`, gaze deficits.
2. **Every previously-inert handler now re-runs the engine.** Wired
   `runDiagnosticEngine()`+`renderAdvisory()` into the slit-lamp
   (lids/conj/cornea/flare/cells), fundus (macula/vessels/periphery/vitreous)
   and gonioscopy/motility handlers so typing/selecting updates the live
   differential immediately.
3. **No false positives.** Normal values (`WNL`, `White and quiet`, `Clear`,
   grade 0) emit no sign tokens — asserted by a new guard test.
4. **New guard test** (`engine-structured-fields`, 6 cases) locks in that each
   structured field emits its expected token and that a normal exam stays
   silent. Token registry regenerated.

**Verified** — 165/165 unit tests (159 + 6 new); end-to-end, structured cells
3+/flare 2+ dropdowns alone now drive Anterior Uveitis (Acute) to 83%, LOCS
grades drive cataract, fundus vessel text drives diabetic signs, gonio grade 1
drives narrow-angle; cross-conflict at baseline.

---

## 2026-07-16 — Session 8: clickable-input integrity + linter guard + KB batch 9 + graded-severity engine refinement

**Founder ask:** flag findings with no clickable input; cross-check that every
clickable option feeds the engine live; keep expanding the KB and refining the
engine.

1. **Cross-checked every clickable → engine.** Audited all symptom chips and
   slit-lamp/fundus findings against engine consumption and fixed **8 dead-end
   clickables** that produced tokens no condition used: 2 chips
   (`fb_sensation`→`foreign_body_sensation`; removed the redundant
   `foreign_body_high_speed`) and 6 findings (IOL-in-bag/aphakia→`post_surgery`,
   small drusen→`age_related`, pavingstone/white-without-pressure→
   `peripheral_degeneration`, PPA alpha zone wired into POAG). Confirmed chip,
   slit-lamp and fundus toggles all re-run the engine live. New guard test
   (`kb-ui-reachability`) asserts every chip & finding emits a consumed token.
2. **KB Editor linter — "no clickable input".** `kbBuildContext` now computes a
   per-token `clickable` flag; the linter warns when an authored (incl. custom)
   condition needs a required finding that can only be typed as free-text,
   telling the founder to add a chip/finding. Info-level for sup/con.
3. **KB batch 9 — 17 conditions (334 total):** multifocal choroiditis, AZOOR,
   cancer-associated retinopathy, Eales, hypotony maculopathy, Susac, orbital
   rhabdomyosarcoma/lymphoma, Schwartz-Matsuo, gelatinous drop-like &
   spheroidal corneal degeneration, Stevens-Johnson (ocular), trachoma,
   ophthalmia neonatorum, conjunctival lymphoma, pyogenic granuloma,
   dacryolithiasis. Distinct required-token pairs; cross-conflict at baseline.
4. **Engine refinement — severity grading now counts.** Wired previously-unused
   graded tokens (`cells_2/3/4`, `flare_2/3/4`, `nuclear_sclerosis_grade_2/4`)
   into the conditions where severity matters, so recording e.g. 3+ cells/flare
   raises Anterior Uveitis confidence (76%→83%) and a 4+ reaction feeds
   endophthalmitis/hypopyon uveitis. Unused precise-token count dropped further.

**Verified** — 159/159 unit tests; click-audit clean; cross-conflict at
baseline; e2e-audit + linter/attachment/past-visit/WNL e2e pass.

---

## 2026-07-16 — Session 7: bug-fixes + WNL + file import + KB batch 8

**Founder-reported problems, all addressed:**

1. **KB page froze with no escape** — `.modal-box` had no max-height/overflow, so
   the 293-item list pushed Close off-screen. Bounded + scroll; reworked the KB
   modal into a searchable list where each condition shows "enter: <required
   findings>".
2. **"Conditions provide no input"** — the registry's reachability counts
   free-text producers, hiding that **5 conditions had no clickable path** to
   their required findings and ~25 tokens were click-orphans. Added them as
   searchable symptom chips / signs (new categories: Eye Movement & Neuro,
   Cornea & Surface Signs, History & Triggers). **Now 0 conditions are
   click-blocked**, enforced by a new guard test (kb-ui-reachability).
3. **Past visit showed only the diagnosis** — now a full read-only summary
   (complaint, history, VA/Rx, anterior seg + IOP + findings, posterior/neuro,
   assessment + plan).
4. **Hectic entry** — new header **"✓ Normal (WNL)"** button fills a section's
   normal values, marks it done, and feeds the engine; normal IOP now derives
   `normal_iop` and is wired as a soft contradictor to the IOP-elevated
   glaucomas, so marking IOP normal visibly lowers glaucoma likelihood.
5. **File import** — new js/ui-attach.js: attach PDFs/scans/images to
   Investigations (visit) and to the Patient Chart as "Documents & prior
   reports" (patient, across visits). Offline data-URL storage (~1.5 MB/file
   cap), view/remove, audit-logged.
6. **KB batch 8 — 24 conditions (317 total):** corneal dystrophies (PPCD,
   Schnyder, Meesmann, Macular, CHED), corneal hydrops, dellen, xerophthalmia,
   giant fornix, JIA/TINU/syphilitic uveitis, diabetic papillopathy, Foster
   Kennedy, tilted disc, Terson, serpiginous choroiditis, Leber congenital
   amaurosis, uveal/choroidal effusion, ghost-cell glaucoma, microspherophakia,
   blepharochalasis, eyelid capillary hemangioma. Distinct required-token pairs;
   cross-conflict audit held at baseline (one new benign dystrophy-mimic pair).

**Verified** — 158/158 unit tests; e2e for KB modal, past-visit, WNL, file
attachments, and the earlier flows all pass; cross-conflict at baseline.

---

## 2026-07-16 — Session 6: node-graph clarity + click-to-field, patient chart + audit, panel tabs, KB batch 7

**Founder requests, all delivered (presentation/data-layer only — no engine,
scoring, red-flag, or offline changes):**

1. **Clearer node-graph + click-to-field.** The inline live loop now tells a
   numbered story (① what you entered → ② most likely → ③ check next); the
   full-screen map got plain-language column headers and now bolds the LEADING
   candidate's evidence edges while rivals fade (no more hairball). A "check
   next" suggestion navigates to the step AND drops a hint banner naming the
   exact finding, expands the finding sections, and pre-searches it — you land
   on the control, not just the page.
2. **Patient chart + multi-visit follow-up + audit trail.** Opening a patient
   now lands on a chart: previous visit summarised first, full visit timeline,
   then continue/start-follow-up. A follow-up carries the patient's history
   (ocular/medical/family/social) forward automatically. New append-only audit
   log records who did what, when (created/opened/started/continued/viewed/
   completed/exported), shown on the chart.
3. **Advisory panel organised into tabs** — Alerts + Leading Impression always
   visible; Differentials | Check next | Reasoning as focused tabs. Removes the
   old everything-at-once stack and its duplication.
4. **KB batch 7 — 11 conditions (293 total):** retinoblastoma (urgent), ocular
   toxocariasis, acute retinal necrosis (urgent), CMV retinitis, primary
   congenital glaucoma, Peters anomaly, aniridia, optic nerve hypoplasia,
   chorioretinal coloboma, ocular albinism, achromatopsia — pediatric /
   leukocoria / necrotizing-retina gaps. Cross-conflict audit held at baseline.

**Verified** — 155/155 unit tests; multi-visit, click-to-field, tabs, widths,
loop, audit, and review e2e all pass; cross-conflict audit unchanged.

---

## 2026-07-15 — Session 5 (increment AD): live node-graph engine + always-reachable copilot

**Founder report:** "I don't see the AI diagnostic engine on the right anymore
— the live visual map / self-correcting loop." Two root causes found:

1. The glass-box reasoning map had been **collapsed behind a toggle**
   (`FLOWMAP_VISIBLE = false`) — the whole visual engine read as missing.
2. Deeper: the advisory panel is **`display:none` on screens ≤1000px**
   (`css/entopic.css`) — so on a tablet/narrow laptop (the chairside reality)
   the entire copilot vanished.

Both fixed; the engine view was also reworked into a live node-graph per the
founder's choice. **Presentation/layout only — no engine, scoring, red-flag, or
offline changes.**

**A — Live node-graph reasoning map** (`js/ui-flowmap.js`):
- Visible by default with a pulsing "Diagnostic Engine · live" header.
- **Inline live loop** (fits the 310px panel): INPUTS (token chips) → the
  leading match as a node with an SVG confidence ring + its supporting/
  contradicting evidence → close rivals → **CHECK NEXT** discriminators (from
  `V.nextTests`, clickable to the right exam step). Shows the loop at a glance.
- **Full-screen node-graph overlay** ("expand ⤢"): inputs → candidate
  conditions (sized/coloured by confidence, leader highlighted) with edges
  coloured green (supports) / red-dashed (contradicts) → check-next nodes,
  clickable. Inline SVG, no libraries (offline-first). Reachable at any width.
- The original 6-stage pipeline is preserved as a collapsible "Pipeline detail"
  for full provenance.

**B — Engine reachable on every screen size** (`index.html`, `css/entopic.css`,
`js/ui-flowmap.js`, `js/app.js`):
- Persistent header **"● Engine · NN%"** button with a live confidence badge
  (leading dx % + red-flag count), visible at all widths.
- ≤1000px no longer hides the panel — it becomes a **slide-over drawer** the
  button opens (dimmed backdrop; closes on navigation). On wide screens the
  button opens the full-screen map. The whole copilot is now one tap away
  chairside.

**Verified** — 155/155 unit tests; e2e at **1440/900/600px** (engine reachable,
node-graph renders, check-next navigates + re-runs engine, drawer opens/closes,
**red flags fire**); e2e-audit, loop, and review-flow all pass; no console
errors. (Rapid-capture / voice entry to reduce data-entry burden is planned as
a founder-gated follow-up.)

---

## 2026-07-15 — Session 5 (increment AC): founder review flow + expansion batch 6

**Founder review flow (verified end-to-end).** Verification found the review
contract existed only in file comments — provisional conditions had no runtime
flag, no way to be *found*, and no way to be *marked verified* (the compiler
re-stamps every save provisional). Completed it:

- `loader.js` stamps every expansion condition `review_status =
  NEEDS_CLINICAL_REVIEW` at runtime; local edits replay after the loader, so a
  recorded verification overrides the stamp.
- The KB editor now has a **Review Queue** — urgent entries first (their
  urgency flags are the riskiest thing to leave unreviewed) with a live count;
  clicking an entry opens it.
- New **"Mark clinically verified"** action records `VERIFIED_BY_CLINICIAN` +
  date on the live condition and persists it (local + cloud when owner is
  signed in). It deliberately bypasses the compiler; any later edit re-flags
  the condition provisional so changed content is always re-reviewed. A status
  line shows provisional / verified / curated state.
- Headless-browser e2e proves the whole loop: 133 provisional queued (36
  urgent first) → open → verify → persist across reload → re-flag on edit;
  engine + red flags intact.

**Expansion batch 6 — 12 more conditions** (each specific-req + real
contradictors, all surface #1–#2, no new cross-conflicts): molluscum (lid),
conjunctivochalasis, corneal dermoid, descemetocele, asteroid hyalosis,
vitreous amyloidosis, FEVR, phacolytic glaucoma, plateau iris syndrome, Duane
retraction, Brown syndrome, infantile nystagmus. **KB now 282 conditions.**

**Verified** — **155/155** tests; cross-conflict audit unchanged.

---

## 2026-07-15 — Session 5 (increment AA): diagnostic refinement loop — "what to check next"

**Founder ask:** since Entopic gives a ranked differential rather than a bare
probabilistic diagnosis, the UI should surface the most likely candidate by
ranking AND suggest the next test to run, looping to sharpen the diagnosis.

**What**

- **Leading Impression** headline in the advisory panel — states the top-RANKED
  candidate plainly (name, confidence word, %) with the un-negotiable
  "Advisory only — clinical correlation required. Not a definitive diagnosis."
  caveat right on it. Makes the ranking-based most-likely explicit without ever
  dressing it up as a probabilistic verdict.
- **Next-test recommender** (`computeNextTests`, new engine stage 12) — the
  refinement loop. When ≥2 candidates genuinely compete (within 0.30 of the
  leader), it finds the findings that best DISCRIMINATE them: confirm the
  leader, or rule out a close rival. Each suggestion shows what it supports /
  argues against and links to the exam step where it's recorded — clicking
  re-runs the engine (via existing `nav()`), so the list refines as the workup
  proceeds. Fully deterministic and inspectable; **no LLM, no probabilistic
  guessing in the diagnostic path.**
- **Trustworthy by construction:** only suggests findings that can actually be
  ENTERED (reachable tokens — a suggestion you can't act on is useless); stays
  quiet when one diagnosis already dominates; skips onset/course tokens
  (captured at intake); labels tokens from their canonical finding name only
  (no mislabeling a generic token as one specific sign).
- **"Narrow the Diagnosis"** section renders the suggestions as clickable rows.

**Verified** — 8 new dedicated tests (enterable-only, quiet-when-dominant,
fires-on-competition with a real discriminator, deterministic, valid targets,
loop-actually-refines) + full suite **153/153**; a headless-browser check
confirms the Leading Impression + Narrow-the-Diagnosis panels render and a
suggestion navigates and re-runs the engine. Offline path intact.

---

## 2026-07-15 — Session 5 (increment Z): cross-condition conflict audit — stop conditions "fighting" and producing junk differentials

**Founder ask:** "Cross check each condition and tokens — make sure all these
will work correctly and not fight/cross each other and produce a junk
diagnosis. If needed refine the logic."

**Audit built** — a new cross-condition conflict audit runs *every* condition's
own textbook presentation (its req + sup) through the real engine and reports:
(A) conditions BURIED — not in the top 3 of their own presentation; (B)
CROSS-DOMAIN JUNK — an unrelated, non-urgent condition from another domain
outscoring the target on its own presentation; (C) CONFUSABLE PAIRS — two
conditions the engine can't tell apart (near-identical req+sup). Baseline was
bad: **BURIED 14, CROSS-DOMAIN JUNK 5, plus one 100%-identical pair.**

**Two engine-logic refinements (the real fixes):**

1. **Absolute urgent priority → bounded urgent sort nudge.** The old sort gave
   *any* urgent condition scoring >0.2 absolute priority over every non-urgent
   one — so a 0.21 urgent floated above a 0.79 confident real match. That was
   the primary junk source. Replaced with a small additive sort bonus (+0.08,
   only once an urgent condition clears a 0.15 plausibility floor) so a strong
   non-urgent diagnosis stays on top while a genuinely-close urgent still wins
   near-ties. **Safety unchanged:** red-flag ALERTS are computed separately and
   remain un-suppressible regardless of list order.

2. **Gating now confers VISIBILITY, not inflated confidence.** Decision-tree
   gates (e.g. "pain + photophobia → consider anterior inflammation") were
   multiplying the gated conditions' scores by **1.3×**. That floated a
   partially-matched Anterior Uveitis (raw 0.68 → 0.88) above the better-matched
   keratitis on a corneal presentation, and overstated displayed confidence.
   Removed the boost: gated conditions are still force-surfaced for
   consideration (their gate reason bypasses the display floor, and urgent ones
   get the sort nudge) but their probability now reflects the ACTUAL evidence.

**Result:** BURIED **14 → 1**, CROSS-DOMAIN JUNK **5 → 2** — and every
remainder is a genuine clinical near-tie within 0.02–0.04 (e.g. an urgent shown
just above a 0.77 non-urgent, or Exposure Keratitis vs Exposure Keratopathy,
which are the same entity). No unrelated winners left.

**Latent test bug found & fixed:** the golden AACC vignette fed a non-existent
token `nausea_vomiting` (the real chip emits `vomiting`, js/data-model.js). The
engine silently ignored it; the test only passed because the now-removed gate
boost masked the missing match. Corrected the vignette to the real token — AACC
now clears >0.8 on genuine evidence, not on an artificial boost.

**Escalated to founder (clinical-modeling decision, not fabricated):** the one
100%-identical pair is **Microbial Keratitis ~ Corneal Ulcer** — clinically a
microbial keratitis *is* an infective corneal ulcer. Whether to merge them or
how to distinguish them (which name/ICD to keep) is a clinical call; the engine
already tie-breaks them deterministically, so they sit adjacent (both
"sight-threatening corneal ulcer") rather than flickering. Flagged for review.

**Verified** — full suite **142/142** (golden AACC-tops, flashes+floaters →
Retinal Tear, POAG-cannot-suppress-AACC, and the 3000-visit fuzz all still
hold; the fuzz well-formedness check was updated to mirror the new bounded sort
key). Diagnostic reasoning stays fully deterministic and offline.

**Then (same session): dedup + expansion batch 4.**

- **Removed an accidental duplicate.** "Thygeson Superficial Punctate
  Keratopathy" (expansion) and "Thygeson Superficial Punctate Keratitis"
  (curated) are the same disease — the name-dedup check missed it because only
  the last word differed. Folded the expansion version's richer findings into
  the canonical curated entry and deleted the duplicate. KB back to a clean
  count (no two entries for one entity here).
- **Added 10 high-yield conditions (batch 4), each with a SPECIFIC required
  token** so it surfaces cleanly and can't cross-fire into unrelated
  presentations: Vogt-Koyanagi-Harada, Behçet (ocular), Coats disease, Sickle
  cell retinopathy, Angioid streaks, Ocular histoplasmosis (POHS), MEWDS,
  Corneal graft rejection, Uveitis-Glaucoma-Hyphema (UGH) syndrome, and
  Carotid-cavernous fistula. Each carries a rich contradicting profile.
- **Confirmed no new junk:** the cross-conflict audit is UNCHANGED after the
  batch (buried 1, cross-domain junk 2 — all pre-existing benign near-ties); all
  10 new conditions rank #1–#2 on their own presentation (0.77–0.79), behind
  only genuine clinical neighbors. All remain **NEEDS_CLINICAL_REVIEW**, and
  their urgency flags in particular need founder sign-off.

**Verified again** — full suite **145/145** (adds the new cross-conflict guard);
both e2e browser audits pass.

**Then: dead-test-token remap + expansion batch 5.**

- **Remapped dead `tests` tokens to reachable equivalents.** Many `tests`
  entries were free-text labels with no input producer — unenterable, so they
  could never confirm a condition, earn test-share, or feed the new next-test
  loop. Remapped 74 usages (37 distinct) to their unambiguous reachable
  equivalents — pure synonym/typo fixes, no clinical-meaning change
  (`weiss_ring`→`pvd_weiss_ring`, `microaneurysm`→`microaneurysms`,
  `RAPD`→`RAPD_positive`, `corneal_infiltrate`→`stromal_infiltrate`, …).
  Deduped the resulting collisions and other pre-existing duplicate tokens.
  **Distinct dead test tokens 133 → 96**, capped by a new token-health guard.
- **Expansion batch 5 — 12 more conditions**, each with a specific required
  token + clinically-meaningful contradictors so they slot in without
  cross-firing: Posner-Schlossman, ICE syndrome, malignant glaucoma,
  neuroretinitis, papillophlebitis, Tolosa-Hunt, cavernous sinus thrombosis,
  chlamydial conjunctivitis, ocular cicatricial pemphigoid, toxic
  keratoconjunctivitis, APMPPE, and PIC. All rank #1–#2 on their own
  presentation (78–88%); cross-conflict audit unchanged. **KB now 270
  conditions.** All batch-5 entries are **NEEDS_CLINICAL_REVIEW** (urgency
  flags especially).

**Verified** — full suite **154/154**; both e2e browser audits pass.

---

## 2026-07-13 — Session 4 (increment Y): KB-wide richness — deep, integrated token profiles for every condition

**Founder standard:** every condition must carry a rich, fully-integrated set
of findings (supportive AND contradicting) — not a thin sketch — "the
diagnostic engine should be absolutely perfect." Baseline was poor: **0/249
conditions had ≥20 firing tokens, 200 were under 8, 191 had no contradicting
findings**, and the reachable vocabulary was only 279.

**What**

- **Vocabulary enabler** — wired all 172 selectable slit-lamp/fundus findings
  to emit their own canonical sign token (not just generic pain/blur), so every
  observable sign is a precise firing token. Reachable vocabulary **279 → 428**.
  This is the raw material for RELEVANT depth (vs padding).
- **Richness standard in the shared linter** (`js/kb-authoring.js`) — the
  editor now warns live when a condition has too few firing findings or no
  contradicting findings, and targets ~20 for a fully-integrated profile.
- **Enriched every remaining curated domain** as bounded rewrites — Glaucoma,
  Refractive, Binocular, Lens, Surface & Lids (on top of Retina/Neuro/Cornea
  from increment X). Refractive errors and benign lid/conjunctival lesions gain
  rich CONTRADICTING profiles (any pathology red-flag rules them out) — exactly
  the rule-out power the engine lacked.
- **Enriched all 112 provisional expansion conditions** — deeper supportive
  findings + real contradicting features per condition. No bulk padding: every
  added token is a genuine feature or genuine contra for that specific
  condition.
- **Folded the standard into the gate + guard** — the batch gate
  (`kb-expansion.test.js`) now REQUIRES new conditions to have contradicting
  findings and a non-thin profile; the token-health guard caps dead tokens
  (≤3), no-con conditions (≤20), thin (<8 firing, ≤50), and holds a KB mean
  firing floor (≥10). Caps ratchet down as enrichment continues.

**Result (whole KB):** dead sup/con tokens **79 → 1**; conditions with no
contradicting findings **191 → 17**; conditions under 8 firing tokens
**200 → 43** (the rest are focused urgent/trauma entries where fewer findings
is clinically appropriate); **mean firing tokens roughly doubled to ~11.3**,
with most conditions now in the 12–15 band.

**Verified** — full suite **142/142** (incl. the stress/fuzz suite —
red-flag un-suppressibility, determinism, KB-wide reachability all still hold
at the new richness) and both e2e browser audits pass. All enriched/authored
conditions remain **NEEDS_CLINICAL_REVIEW**.

**Honest status vs the ~20 target:** the KB is now dramatically richer and
almost entirely free of dead/irrelevant tokens, but the *mean* is ~11–13, not
20. Pushing every one of 249 to a literal 20 with only real, relevant tokens is
a continued, per-condition pass (and some focused conditions top out lower by
nature) — the standard is now enforced and measured so it keeps climbing
without regressing.

---

## 2026-07-13 — Session 4 (increment X): KB token-health cleanup (founder-flagged)

**Founder flagged** that a significant portion of conditions had no / very
limited / irrelevant tokens. An audit confirmed it: **58 "thin" conditions**
(≤3 total tokens) and **79 "dead" supportive/contradicting token usages** —
tokens that look like evidence but that *no exam input produces*, so they never
affect scoring (e.g. `metamorphopsia` instead of the real `distortion`,
`reduced_acuity` instead of `reduced_vision`, `IOP_elevated` instead of
`high_iop`, `nausea_vomiting` instead of `vomiting`, plus `painless`,
`asymptomatic`, …). Also **191/249 conditions had no contradicting token at
all**, limiting the engine's ability to rule diagnoses *out*.

**What**

- **Synonym remap** — replaced 35 dead sup/con/temporal tokens across the
  curated files with their correct reachable equivalents (a condition's stated
  evidence now actually fires).
- **Loader de-dupe** — token lists are de-duplicated on load, so remapping /
  editing can never create a duplicate that double-counts as evidence.
- **Enriched Retina (22), Neuro (16) and Cornea (25)** — bounded clean rewrites
  giving each condition a richer, DIFFERENTIATING profile: added reachable
  supportive tokens and, crucially, **contradicting tokens** (e.g. CRAO now
  `con: pain_severe`; Dry AMD `con: distortion` so a distortion-dominant
  picture favours Wet AMD; cranial-nerve palsies contradict each other's
  diplopia axis; keratitis entries `con: itching_dominant`). Dead tokens
  stripped. Required tokens unchanged so routing/behaviour and every golden
  vignette are preserved.
- **Wired real slit-lamp signs that produced nothing** — the "Ciliary flush",
  "Cells — n+", "Flare — n+", "Posterior/Anterior synechiae", "Fibrin"
  findings now emit their specific sign tokens (`ciliary_flush`,
  `cells_present`, `flare_present`, `synechiae`, `fibrin`), so the uveitis
  conditions' evidence finally fires. Anterior/Uveitis + Lens dead tokens then
  remapped to reachable equivalents.
- **`tests/kb-token-health.test.js` (new, 4 checks)** — makes token quality a
  permanent, measured standard: no dead REQUIRED token anywhere; dead sup/con
  usages capped (now **≤12**, was 79) and meant to keep trending down; thin
  conditions capped (now **≤32**, was 58); no stray no-required-token entries.

**Result:** thin conditions **58 → 30**; dead sup/con usages **79 → 10** (an
87% cut); no-con **191 → 163**. Wet-vs-Dry AMD and CRAO-vs-AION separate
correctly; uveitis conditions now score on AC cells/flush/synechiae.

**Verified** — full suite **139/139** (incl. stress + the new health guard);
both e2e browser audits pass (249 conditions, red flags fire, editor correct).
All enriched conditions are **NEEDS_CLINICAL_REVIEW** (AI-modified clinical
content).

**Ongoing:** the remaining domains (glaucoma, lens details, binocular,
refractive, surface) and broader contradicting-token coverage (163 conditions
still have none) are the next enrichment passes — same bounded-rewrite method,
guarded by the health test.

---

## 2026-07-13 — Session 4 (increment W): Stress/fuzz harness + input-surface enrichment + batch 3 (+24 → 249)

**Founder direction:** quality-gated trajectory + "stress test everything."

**What**

- `tests/stress.test.js` (new, 8 heavy checks) — hammers the whole diagnostic
  path and pins the invariants that must never break as the KB grows:
  **3000 random fuzz visits** (never crash, always a bounded/sorted/valid
  differential with scores in [0,1]); **determinism** (same input → same
  output); **red-flag un-suppressibility** — each of the 9 urgent alerts must
  fire buried in heavy random noise (150 iterations each) AND in an
  "everything-on" visit; **KB-wide reachability** (every one of the 249
  conditions can surface — no dead entries anywhere); **adversarial/malformed
  input** (nulls, junk tokens, 500-item arrays, NaN IOP — no crash); **2000
  validator fuzz drafts**; and a **performance** ceiling. Deterministic PRNG so
  any failure reproduces.
- **Input-surface enrichment** (the quality-gated way to add distinct
  conditions): wired 11 new producible tokens — new patient symptoms
  (`recent_eye_trauma`, `chemical_splash`, `high_speed_particle`,
  `jaw_claudication`, `scalp_tenderness`, `oscillopsia`, + a new "Trauma &
  Injury" symptom category) and gave real tokens to fundus signs that produced
  nothing or too little (`optic_pit` was **dead**; `cotton_wool_spots`,
  `cherry_red_spot`, `hyphema_visible` now emit specific signs). Reachable
  tokens 262 → 273.
- `knowledge/expansion.js` — **batch 3 adds 24 conditions** built on those new
  signals so they're genuinely distinct, not near-duplicates: ocular trauma
  (Chemical Eye Burn, Open Globe, Traumatic Hyphema, Intraocular Foreign Body,
  Corneal Laceration, Orbital Blowout, Traumatic Optic Neuropathy, Choroidal
  Rupture, Siderosis, …), systemic/vascular (Malignant Hypertensive
  Retinopathy, Purtscher, **Occult/Systemic Giant Cell Arteritis** — catches
  GCA from jaw claudication + scalp tenderness *before* vision loss), nystagmus
  syndromes, Optic Pit Maculopathy, and immune corneal disease (Mooren, PUK).
  KB now **249 conditions** (curated 137 + expansion 112).

**Verified** — full suite **135/135** incl. the new stress suite; expansion
gate green; both e2e browser audits pass (main app 249 conditions, 0 console
errors; editor still correct). Spot-checks: Chemical Eye Burn tops its
presentation (0.75, urgent); Occult GCA tops its systemic presentation (0.72,
urgent). All red-flag invariants proven un-suppressible under fuzzing.

**Status toward 5x:** 249 = **1.82x**. Batch 3 is all
NEEDS_CLINICAL_REVIEW. The trauma symptom category is now visible in the exam's
symptom picker (renders dynamically).

---

## 2026-07-13 — Session 4 (increment V): Expansion batch 2 (+38 → 225) + differential-noise floor

**What**

- `knowledge/expansion.js` — batch 2 adds **38 more provisional conditions**
  (strabismus/amblyopia, accommodative/vergence, conjunctival & scleral lesions
  incl. neoplasia, lacrimal, more cornea, retinal vascular/dystrophic, neuro
  motility, glaucoma/lens). KB is now **225 conditions** (curated 137 +
  expansion 88). All pass the batch gate.
- **Differential display floor** (`js/engine.js`): the shown differential now
  filters out marginal partial-matches (score < 0.15) BUT always keeps
  safety-gated conditions (e.g. Retinal Detachment on flashes+floaters) and
  never returns empty when there was signal. Without this, a larger KB's
  "shares one symptom" entries (a condition matching only one of its two
  required tokens scores ~0.14) crowded the list and could bury a gated
  red-flag diagnosis. Surfaced by batch 2; fixed generally.

**Why** — these two engine refinements (this floor + increment U's
missing-required penalty) are what let the KB grow without the differential
getting noisier: additions only appear when they genuinely fit.

**Verified** — full suite **127/127**; both e2e browser audits pass (main app:
225 conditions, red flags fire; editor: valid condition scored, contradiction
blocked, near-duplicate warned — and it now correctly BLOCKS re-authoring a
name already in the KB). flashes+floaters differential is clean with Retinal
Detachment still surfaced. All expansion entries remain NEEDS_CLINICAL_REVIEW.

**Status toward 5x:** 225 = 1.64x. The pipeline is proven and each batch is now
smooth; reaching 5x continues the same gated process (and, past a few hundred,
will pair with expanding the exam's input/token surface so conditions stay
distinguishable rather than becoming mutual near-duplicates — flagged for the
next sessions).

---

## 2026-07-13 — Session 4 (increment U): KB expansion infrastructure + provisional batch 1 (+50)

**Founder-authorized** ("expand at least 5x"). This lays the machine for
volume and lands the first validated batch.

**What**

- `knowledge/expansion.js` (new) — a segregated, clearly-provisional batch of
  **50 AI-drafted conditions** across retina, uveitis, cornea, glaucoma,
  neuro-ophthalmology, lens, oculoplastics and strabismus (e.g. Diabetic
  Macular Edema, Proliferative Diabetic Retinopathy, Giant Cell Arteritis,
  Idiopathic Intracranial Hypertension, Acanthamoeba/Fungal Keratitis, corneal
  dystrophies, Ocular Myasthenia, Adie pupil, Sympathetic Ophthalmia, …). Kept
  in its own file so the curated 137 stay pristine and the batch is easy to
  audit or remove. Folded into the KB by the loader. KB is now **187
  conditions**.
- `tests/kb-expansion.test.js` (new, 6 checks) — the **gate every future batch
  must pass**: zero lint errors (via the shared authoring compiler), every
  required token reachable (no dead entries), no name collisions with the
  curated set, the REAL engine surfaces each entry from its own evidence, and
  red flags still fire.
- **Scoring refinement** (`js/engine.js`): missing **required** tokens now
  penalize multiplicatively (`req_missing_factor` 0.45 per absent hallmark).
  "Required" now means required — a two-hallmark condition with only one token
  present no longer floats up (this is what kept new urgent entries like
  Phacomorphic Angle Closure from perturbing the POAG/AACC differentials).
  Every golden vignette stayed green.

**Design rules the batch obeys** (enforced by the gate): required tokens are
drawn only from the 262 already-reachable tokens (so each condition can
actually fire with no new input wiring), and a generic hallmark (e.g.
`high_iop`) is always paired with a distinguishing token (e.g.
`steroid_history`) so additions don't pollute unrelated differentials. ICD
codes are intentionally deferred to the founder's review step (whole batch is
NEEDS_CLINICAL_REVIEW).

**Verified** — full suite **127/127**; the expansion gate passes; main-app
headless audit passes (187 conditions, 0 console errors, all red flags fire).
Clinically sanity-checked: diabetic + floaters → Proliferative Diabetic
Retinopathy tops (0.72, urgent); elderly sudden vision loss → Giant Cell
Arteritis surfaces alongside AION; POAG and AACC rank correctly.

**NEEDS_CLINICAL_REVIEW** — all 50 are provisional textbook drafts; the founder
verifies tokens/urgency/ICD (via the editor). **This is 1.36x; reaching 5x is
an ongoing, gated process** — each further batch is drafted the same way and
must pass the same gate. Frozen-count guard changed to protect the *curated*
137 from silent drops while letting the expansion grow.

---

## 2026-07-13 — Session 4 (increment T): No-code KB Editor + owner-only cloud write path

**Founder-authorized.** He asked for a UI to author the knowledge base without
coding — fill fields, they become working engine conditions — with live
warnings for duplicates, contradictions, and illogical/dead entries; saving to
an owner-only cloud path. Decisions he made this session: *editor first, then a
big provisional seed*; *owner-only cloud write with one-click publish*.

**What**

- `js/kb-authoring.js` (new) — the KB **compiler + linter**, pure and
  unit-tested, shared by the editor AND the (coming) bulk seeder so they can
  never disagree. Turns filled fields → the engine's native condition object
  (the field *is* the code — no lossy codegen step). Lints for: duplicate
  name (error), **near-duplicate** (similar name *and/or* high req+sup token
  overlap → warn), **contradictions** (same token in req&con or sup&con →
  error), acute+chronic clash, urgent-without-hallmark, self/dead exclusions,
  and the founder's headline ask — **"this can never fire"**: a required token
  nothing in the exam produces is flagged loudly (reuses the token registry's
  reachability). Errors block a clean save; warnings are advisory.
- `js/ui-kb-editor.js` + `pgKbEditor` page + editor CSS — the owner-facing
  form: name/domain/route, token pickers with autocomplete from the existing
  vocabulary (so you reuse tokens instead of minting near-duplicates), urgent
  toggle, exclusions, ICD. A **live checks panel** runs the linter as you type,
  plus a preview of the exact stored object. "Save to my KB" applies to the
  running engine immediately (offline) and upserts to the cloud when you're the
  owner; "Publish to all devices" snapshots the whole KB as a new version
  through the remote-update pipeline (increment R).
- `js/kb-remote.js` — local-authoring support: authored conditions are applied
  in place, persisted to a local-edits cache, and **re-applied after any
  remote bundle load** so not-yet-published edits are never dropped;
  `kbExportCurrentBundle()` for publishing.
- **Owner-only cloud write path** (Supabase): a `kb_editors` allowlist, a
  `private.is_kb_editor()` SECURITY DEFINER check (mirrors the existing
  `private.is_clinic_*` helpers, kept off the API surface), and editor-only
  INSERT/UPDATE policies on `kb_conditions`/`kb_versions`. Public stays
  read-only; no client DELETE. The editor entry point appears only for the
  owner.

**Why** — the founder is the clinical authority and a non-engineer; he must be
able to grow/correct the KB continuously without touching code, and be warned
before shipping something contradictory or dead. This is also the safe engine
for reaching 5x volume: everything authored is flagged NEEDS_CLINICAL_REVIEW,
red-flag alerts stay in engine code (no bundle can disable them), and writes
are RLS-gated to the owner.

**Verified**
- `tests/kb-authoring.test.js` (14 tests): every lint rule, incl. duplicate,
  near-duplicate, req/con contradiction, unreachable ("can never fire")
  required token, dead/self exclusion, edit-self-not-duplicate.
- **Owner-write RLS proven server-side** by JWT impersonation: a non-editor is
  BLOCKED from inserting (0 rows); the editor can upsert a condition and
  publish a version (incl. the ON CONFLICT re-publish path, which needed an
  editor read policy so drafts are visible). Security advisors: clean.
- **Editor driven in a real browser** (headless Chromium): owner sees the
  button; a valid condition validates, saves, and is **immediately scored by
  the engine**; it persists to the local-edits cache; a req/con contradiction
  is blocked (save disabled); a near-duplicate of the richer real MGD entry is
  warned (not blocked); red flags still fire. Full suite 121/121; main-app
  audit still passes (137 conds, 0 console errors).

**Setup the founder needs to do once** (documented in CLOUD_SETUP.md): sign in
to his cloud account, then be added to `kb_editors` (one SQL line / I can do it
via MCP once he gives his auth email). Until then he can author locally with
the `entopic_kb_editor_local` override; cloud publish needs the allowlist.

**Next (increment U):** the 5x provisional content seed — drafted through this
same validated pipeline, real ICD codes, all review-flagged.

---

## 2026-07-12 — Session 3 (increment S): Knowledge-base expansion (+7 conditions, +tokens, dead-ends resolved)

**Founder-authorized** (asked to expand the KB, tokens, and scoring).

**What** — added 7 clinically important conditions the KB was missing, all
across three domains, each with a reachability test proving a plausible
presentation surfaces it:
- **Orbital Cellulitis** (urgent) — and this **resolves the NEEDS_REVIEW
  dead-end**: Preseptal Cellulitis's exclusion used to point at a
  non-existent `orbital_cellulitis` (could never fire, and was inverted).
  Now orbital exists, is urgent (so it can never be suppressed), carries the
  correct-direction `orbital → excludes → preseptal`, and preseptal
  `con`-tags proptosis/restricted_motility so orbital signs lower its score.
- **Endophthalmitis** (urgent), **Scleritis** (urgent) + **Episcleritis**
  (benign) with a scleritis→episcleritis exclusion, **Thyroid Eye Disease**,
  **Horner Syndrome** (urgent) with a `con: diplopia` discriminator vs CN III
  palsy, **Migraine with Visual Aura**.
- New presenting tokens wired end-to-end (UI symptom list → tokenizer →
  KB): `proptosis`, `lid_retraction`, `anisocoria`, `deep_boring_pain`,
  `pain_worse_night`, `sectoral_redness`, `scintillating_scotoma`. New
  tokenizer producers: autoimmune history → `autoimmune_history`; pupil
  size diff → `anisocoria`; a new optional orbit/exophthalmometry field set
  → `proptosis`/`lid_retraction`.
- All 7 ICD-10 codes looked up and verified real + billable (FY2026) via the
  ICD tool; each flagged `NEEDS_CLINICAL_REVIEW` like the rest of the map.

KB is now **137 conditions / 21 urgent / 9 domains** (was 130 / 17). Frozen
count guard and KB file headers updated.

**Why** — these are common/urgent entities a real ophthalmic tool must not
miss (orbital cellulitis, endophthalmitis, scleritis, TED). The new scoring
(increment Q) plus objective-test tokens make the additions rank sensibly.

**Verified** — new suite `tests/engine-new-conditions.test.js` (9 tests): each
condition surfaces from a plausible presentation; orbital outranks preseptal
when orbital signs present and is never suppressed; scleritis outranks
episcleritis; Horner's score drops when diplopia (CN III sign) is present;
red flags unchanged. Full suite 107/107; e2e browser audit passes (137
conditions, 0 console errors, all three red flags fire).

**NEEDS_CLINICAL_REVIEW** — the 7 new entries are AI-authored textbook feature
sets. Founder to verify tokens, urgency flags, and the two new exclusions
before trusting their rankings (flagged inline in each KB file and in
NEEDS_REVIEW).

---

## 2026-07-12 — Session 3 (increment R): Remotely-updatable knowledge base

**Founder-authorized** (asked for the KB to be remotely updatable "as many
times as possible" for expansion/correction/re-wiring).

**What** — `js/kb-remote.js` (new) lets the build owner publish KB updates to
the cloud and have every installation pick them up with no app rebuild:
- **Publish** (owner only): `node tools/seed-cloud-kb.js --version X.Y.Z` →
  apply the SQL (writes `kb_versions`, a published, world-readable bundle).
  There is **no client write path** to the KB tables — RLS is read-only.
- **Consume**: at boot the app applies the newest **cached** bundle (works
  fully offline), then checks the cloud in the background and every 12 h.
  A newer valid bundle is downloaded, cached, and applied; the KB globals
  are swapped **in place** and every index rebuilt (increment P made this
  safe), so the running engine picks it up.
- **Safety rails** (all fail-closed): a bundle is rejected unless it is
  structurally valid, has ≥100 conditions, has no duplicate names, and
  **retains every urgent condition the shipped app knows** (protects
  sight-threatening entries from accidental deletion — they can still be
  edited). A bundle downloaded while an exam is open is **deferred** to the
  next boot so the differential never shifts mid-exam. Red-flag alerts and
  the advisory-only framing live in **code, not the KB**, so no bundle can
  disable them.
- Dashboard KB-info modal shows the live version/source/count and a "Check
  for updates" button; a pending deferred update is surfaced.

**Why** — the founder is the clinical authority and will correct/expand the
KB continuously; he must be able to ship those changes to all users without
an engineer in the loop, and without ever weakening offline-first or safety.

**Verified** — `tests/kb-remote.test.js` (9 tests): validator accepts the real
KB, fails closed on malformed/gutted/urgent-dropping/duplicate bundles;
version compare + apply/defer/skip decision matrix; in-place swap rebuilds
indexes and the REAL engine runs on the updated KB; red flags survive an
update; ICD backfill applies; and a **publish/consume contract test** proves
the bundle `tools/seed-cloud-kb.js` emits is exactly what `js/kb-remote.js`
accepts (guards against the two tools drifting apart). Cloud `kb_versions`
RLS re-confirmed read-only with no client write path.

**Not verifiable from this sandbox** — the live in-app HTTP fetch from
`kb_versions` (egress to the project domain is blocked here). The founder
runs the one-command publish on a normal network; the fetch/validate/apply
logic it feeds is unit-tested above. Documented in CLOUD_SETUP.md.

---

## 2026-07-12 — Session 3 (increment Q): Scoring rework — matched-evidence scoring + objective-test confirmation

**Founder-authorized** (this was the NEEDS_REVIEW "sparse-definition score
inflation" item, deliberately parked until his go-ahead; he asked for exactly
this rework).

**What**

- `js/engine.js` `scoreCondition` — replaced normalize-by-own-maximum with a
  structural mix: required-criteria fraction (60%) + saturating credit for
  *matched* supportive evidence (25%) + saturating credit for *matched*
  objective tests (15%). A condition's score now depends only on what
  MATCHED — never on how many tokens its definition happens to list, which
  was the mechanism that let leaner definitions outscore richer ones on
  identical evidence. Contradictions are now multiplicative per-match
  (×0.55 each; two contradictions hurt far more than one). Temporal
  fit/mismatch is a small multiplier (×1.08 / ×0.85). Conditions with no
  required tokens cap at ~0.70 on sup/test evidence alone. Hard rules kept:
  all-required-missing → 0; sparse encounters halved; red-flag alerts remain
  a separate, unconditional stage.
- `js/engine.js` tokenizer — measured TBUT now emits `TBUT_reduced` +
  `tear_film_instability` (and Schirmer emits `schirmer_low`) alongside the
  symptom-domain tokens, so objective results are scored as CONFIRMATION
  instead of a no-op re-add of what the patient already said. This is the
  "accuracy improves as the exam proceeds" mechanism: `tests` tokens in the
  KB were previously never produced and never scored.
- `generateEvidence` — matched tests count as matched evidence in the glass
  box; the suggested-tests list now shows only tests NOT yet done (shrinks
  as the workup proceeds). Flow map shows a `tests:` count.

**Why** — the old method's rankings were provably distorted by definition
richness; the founder asked for scoring accuracy work and hugely expandable
KB (where inconsistent definition richness across thousands of entries would
have amplified the distortion). All constants are documented as structural
engineering values, not claimed clinical statistics; calibration against
real data remains future work (the registry flywheel).

**Verified** — before/after panel of 7 vignettes: the documented inflation
case now ranks Dry Eye (MGD) 0.89 > Aqueous 0.74 > Exposure Keratopathy 0.68
(was: Exposure Keratopathy first); AACC still tops its presentation at 1.00;
Retinal Tear still tops flashes+floaters; non-specific "Conjunctival
Hyperemia" no longer ties specific diagnoses. ALL golden clinical vignettes
passed UNCHANGED (no expectation edits needed); 89/89 tests green after
registry regeneration (TBUT_reduced/schirmer_low/tear_film_instability now
have producers).

---

## 2026-07-12 — Session 3 (increment P): Full-build critical audit — 4 real bugs found and fixed

A deliberate verification pass over every module (engine, KB loader, storage,
mirror, cloud sync, UI renderers, LLM wrapper) plus an end-to-end headless-
browser audit of the whole app. Four genuine defects found; all fixed, all
pinned by new tests.

**1. Flow map crash (stack overflow) — `js/engine.js`**
The scale optimization (increment K) left a broken fallback in
`scoreCondition`/`generateEvidence`: when called *without* a shared token Set,
the membership helper recursed into itself infinitely. The glass-box flow
map's exclusion layer calls exactly that shape — opening it crashed with a
RangeError. Fallback now does the intended linear scan. New test
(`tests/engine-noset.test.js`) pins both call shapes to identical results
across the whole KB.

**2. Flow map could misreport urgent conditions as excluded — `js/ui-flowmap.js`**
The exclusion layer re-runs scoring for display but dropped the `urgent` flag,
so the engine's "urgent conditions are never suppressed" protection didn't
apply to the *display* — the map could show an urgent condition struck
through as excluded when the engine actually kept it. The re-run now carries
`urgent`, matching the real pass. (Display-only; the actual differential and
alerts were never affected.)

**3. Multi-device data-loss race in cloud sync — `js/cloud-sync.js` + `js/storage.js` + `js/app.js`**
`cloudDrain` stamped **every** patient with "now" on **every** push, so any
save on device A made all A's records look newest; device B's LWW merge would
then overwrite B's own not-yet-pushed edits with stale data — silent data
loss. Now: patients/visits carry a per-record `updated` stamp (set at
creation and, in `doSave`, only when the record actually changed), and drain
pushes each record's own stamp — never "now". Stampless legacy records push
the epoch so they can never claim to be newest. Pinned by new drain and
doSave stamping tests (`tests/cloud-sync.test.js`, `tests/storage-stamp.test.js`).

**4. Stale clinical exclusion rules after runtime KB growth — `knowledge/loader.js`**
`KB_EXCLUSION_MAP` (used by the engine's exclusion stage), `KB_ROUTES`, and
`KB_TOKEN_STATS` were built once at load and NOT refreshed by
`rebuildKbIndexes()` — a cloud-loaded/grown KB would run with outdated
exclusion rules. All derived registries now rebuild together. (The first
attempt exposed a var-hoisting wipe — initializers running after the build
erased it — so the initial build call now lives at the end of the file, with
a comment explaining why. Verified: growth + rebuild refreshes everything.)

**Also in this pass**
- `js/claude.js` — the interpretive-remarks prompt sent the **patient's full
  name** to the LLM API, violating the PII guardrail. The summary is now
  de-identified (age + sex only). Pinned by `tests/llm-privacy.test.js`.
- `index.html` — removed the prefilled default password ("12345") from the
  account-setup form.

**Verified:** 89/89 unit tests pass. End-to-end headless-Chromium audit of the
real app: boots with zero console errors; signup → login → new patient →
urgent presentation (flashes+floaters+sudden vision loss, IOP 45) → all three
red-flag alerts fire, differential ranks Retinal Tear (urgent) first; flow map
+ exclusion layer render without crashing; XSS payload stays inert;
persistence round-trips across reload with the new per-record stamps. Supabase
security advisors: clean (0 findings).

**Known limitations documented (not silently fixed):** LWW compares timestamp
strings lexically (server `+00:00` vs local `Z` formats can misorder within
the same millisecond — negligible in practice); the server upsert itself is
last-push-wins (client-side LWW mitigates; a server-side guard is future
work); the Realtime socket doesn't refresh its JWT mid-connection (after
token expiry the 12 s polling fallback covers liveness). Local app login
remains a device-local convenience gate (plaintext in localStorage) — see
NEEDS_REVIEW.

---

## 2026-07-11 — Session 3 (increment O): Update Claude API model to current release

**What**

- `js/claude.js` — the interpretive-remarks call now uses the current Sonnet
  model (`claude-sonnet-5`) instead of `claude-sonnet-4-20250514`, which is a
  deprecated/dated identifier and would eventually stop being served.

**Why**

The Claude API path is downstream-only (interpretive remarks + speech parsing;
never diagnosis — that stays deterministic in the engine offline), and it is
optional and spend-sensitive for the founder. A like-for-like move to the
current Sonnet line keeps that lightweight, low-cost behaviour while removing a
stale, soon-to-break model string. No request shape, headers, or firewall
around the LLM changed — the engine still runs fully without the API.

**Verified:** No behavioural change to test — the request body only swaps the
model string; the existing suite still passes (no code path depends on the
model ID). The offline diagnostic path is untouched.

---

## 2026-07-05 — Session 3 (increment N): Fix stored-XSS in free-text fields

**What**

- `js/app.js` — `esc()` now fully HTML-escapes (`&`, `<`, `>`, `"`) instead of
  escaping quotes only. It is used at 115 render sites, including **16 clinical
  free-text `<textarea>` bodies** (chief complaint, history, medications,
  allergies, every "notes" field, the plan). A quotes-only escape let input
  like `</textarea><img src=x onerror=…>` break out of the textarea and execute
  — a stored-XSS hole.
- `tests/escaping.test.js` (5 tests) pins full-escaping, correct `&`-first
  ordering, and null/number handling.

**Why**

Real vulnerability, and its blast radius just grew: with cloud sync, another
clinician's free text (or a pasted patient complaint) now renders on your
screen, so unescaped markup is executable stored XSS across a clinic. Full
escaping is safe in both attribute and element-body contexts (these are always
raw user strings), so upgrading the one helper closes every site at once.

**Verified:** 83/83 unit tests pass. Headless-Chromium test: a malicious chief
complaint / medication / plan payload is entity-encoded in the rendered
textareas — the injected `onerror`/`<script>` handlers do **not** fire and no
`</textarea>` breakout survives.

---

## 2026-07-05 — Session 3 (increment M): Backend security hardening (RLS helpers, advisor clean)

**What**

- Moved the three `SECURITY DEFINER` RLS helper functions
  (`is_clinic_member`, `is_clinic_admin`, `clinic_member_count`) out of the
  API-exposed `public` schema into a `private` schema, so PostgREST no longer
  exposes them as `/rest/v1/rpc/*` endpoints. Granted `EXECUTE` back to
  `authenticated` (RLS policy evaluation requires it) and `USAGE` on the
  `private` schema; revoked from `anon`/`public`.
- Verified RLS still enforces correctly after the move, and the 6
  security-definer advisor warnings are now cleared.

**Why**

The Supabase security advisor flagged the helpers as publicly callable via RPC
(a minor information-disclosure surface). The `private`-schema pattern is
Supabase's recommended fix and removes the exposure without weakening RLS.

**Verified (looping):** re-ran the tenant-isolation proof with a fresh user
after the change — the signed-in user saw exactly their own clinic's patients
(RLS evaluates the moved helpers correctly). Advisor re-run: the 6 warnings are
gone; only a low-priority Auth toggle (leaked-password protection) remains,
noted in NEEDS_REVIEW. Test fixtures cleaned up; KB sample intact.

---

## 2026-07-05 — Session 3 (increment L): Supabase backend — multi-tenant sync, auth, live dashboard, cloud KB

**What**

- **Supabase project `entopic`** created (free tier, $0/mo, confirmed before
  proceeding). Schema via migrations: `clinics`, `clinic_members` (roles),
  `patients`, `visits`, de-identified `encounters`, and `kb_conditions` /
  `kb_versions` (the KB authoring/growth platform). **RLS on every table**;
  Realtime enabled on patients/visits with `REPLICA IDENTITY FULL` so change
  events are RLS-filtered per clinic. Security-definer helpers revoked from
  `anon` (advisor clean).
- **Client** (`js/cloud-config.js`, `js/cloud-sync.js`) — plain fetch +
  WebSocket, no SDK/CDN. Email/password auth, clinic create/join, an
  offline-first outbox (push patients/visits when online), pull + Realtime
  merge (last-writer-wins), token refresh, polling fallback, status surface.
  Wired into `storage.js` (one guarded line, like the IndexedDB mirror) and a
  new dashboard **"Cloud Sync & Multi-User"** card (`js/app.js`).
- `tools/seed-cloud-kb.js` — generates idempotent upsert SQL to push the full
  local KB (and a published `kb_versions` bundle) into the cloud.
- `docs/CLOUD_SETUP.md` — what's built, the verification table, and the manual
  two-browser live-sync runbook.
- `tests/cloud-sync.test.js` (9 tests): LWW merge, open-exam-visit protection,
  no echo loop, enqueue/gating, disabled-dormant, status states.

**Why**

The founder greenlit the full arc: multi-user, live dashboard updates, and a
KB built to grow 100x. This delivers the backend foundation while keeping the
offline-first exam untouched.

**Verified**

- **Tenant isolation proven server-side** by impersonating two users in two
  clinics via JWT claims: Dr A saw only Clinic A's patient, Dr B only Clinic
  B's, and Dr A's cross-tenant **insert was blocked** (0 intruder rows).
- Realtime publication + replica identity confirmed; KB round-trip proven
  (sample seeded, incl. a VERIFIED review-status row).
- 78/78 unit tests pass; browser smoke + cloud-card render clean; app fully
  functional offline (signed-out card, nothing queued).

**Honest limitation:** the live browser↔Supabase WebSocket round-trip could
not be exercised from this build sandbox (its egress proxy blocks the project
domain). It is covered by the `docs/CLOUD_SETUP.md` runbook — run once on a
normal network. The security-critical half (RLS isolation) IS proven here.

**Guardrails:** no server-side diagnosis; PII/registry separated; engine never
a network dependency; free tier only.

---

## 2026-07-05 — Session 3 (increment K): Engine indexed for 100x knowledge-base scale

**What**

- `knowledge/loader.js` — precomputed KB indexes rebuilt by
  `rebuildKbIndexes()` (so a cloud-grown KB can refresh them):
  `KB_ROUTE_INDEX` (route→conditions), `KB_REQ_TOKEN_INDEX` (any required
  token→conditions), `KB_REQ_FIRST_INDEX`, `KB_NAME_INDEX` (O(1)
  `findCondition`), `KB_NOREQ_CONDS`.
- `js/engine.js` — the two hot paths no longer scan the whole KB every run:
  - **Scoring** now iterates only conditions that require a *present* token
    (via `KB_REQ_TOKEN_INDEX`) and sit on an active route. Since the engine
    already forces score 0 unless a required token matched, this yields
    *identical* results — but cost scales with the evidence, not the KB.
  - **Data-driven route activation** uses `KB_REQ_FIRST_INDEX` instead of a
    full scan.
  - `scoreCondition` / `generateEvidence` take a shared token `Set` for O(1)
    membership instead of `Array.indexOf`.
  - A deterministic tie-break by `_index` makes ordering independent of
    iteration/indexing. Full-scan fallbacks retained if indexes are absent.
- `tests/engine-scale.test.js` (3 tests): results **identical** at 1x vs 100x
  (13k conditions), red-flags still fire inside a 100x KB, and a perf ceiling
  (100x run < 40 ms) to prevent regressions.

**Why**

The founder wants the KB to grow ~100x. Measured before: a 13,000-condition
KB took **~144 ms per keystroke** — unusable. The engine ran O(N) scans on
every data change.

**Verified (looping benchmark):** realistic large-KB benchmark (distinct
conditions, so a given encounter matches a small slice):

| KB size | before | after |
|---|---|---|
| 130 (1x) | 0.77 ms | 0.32 ms |
| 13,000 (100x) | 143.8 ms | **3.97 ms** (~37x faster) |
| 65,000 (500x) | — | 26 ms |
| 130,000 (1000x) | — | 56 ms |

Top diagnosis and problem foci identical across all sizes. 70/70 tests pass;
browser smoke clean; token registry in sync.

---

## 2026-07-05 — Session 3 (increment J): IndexedDB safety mirror — clinic data survives a wiped browser store

**What**

- `js/storage-mirror.js` (new) — every clinic-data write (users, patients,
  visits, settings, registry queue) is now also mirrored into **IndexedDB**
  (hundreds of MB, a different browser-eviction class than localStorage).
  At boot, if localStorage is found empty while the mirror has data, the app
  **restores everything automatically and reloads once** (session-flag
  loop guard). Mirror writes are async fire-and-forget — they can never
  block or fail a save. The API key is deliberately not mirrored.
- `js/storage.js` — two guarded hook lines in `saveStore`/`removeStore`
  (works unchanged if the mirror script is absent). localStorage remains the
  primary store; no API or behavior change on the happy path.
- `index.html` — one script tag (mirror loads before storage.js).
- `tests/storage-mirror.test.js` (4 tests): pure recovery-decision logic
  (never fires with local data present / on fresh installs / twice per
  session), safe no-op loading without a browser, hook wiring, script order.

**Why**

The founder confirmed everything stays stored locally — so local storage
must stop being a single point of failure. Today "clear browsing data"
destroys the entire clinic. This is the biggest data-loss risk in the app,
fixed additively, fully offline, with zero UI or workflow change. It also
de-risks the future full IndexedDB migration (Phase 4) and any later cloud
backup: both now have a local redundancy layer beneath them.

**Verified:** 67/67 unit tests pass; browser smoke clean; and a full
end-to-end disaster drill in headless Chromium — seed data through the real
save path → confirm mirror contents → wipe localStorage completely → reload
→ **all patients/visits/users restored automatically**, second reload does
not loop.

---

## 2026-07-05 — Session 3: Supabase integration exploration (ideas document, no build)

**What**

- `docs/SUPABASE_EXPLORATION.md` — a founder-requested exploration of what a
  Supabase backend could provide *around* the local-first app: automatic
  backup via an outbox sync, real auth + clinic/roles/RLS multi-tenancy,
  multi-device clinic flow (technician pre-testing → doctor's lane via
  Realtime), PII/clinical separation at the database, the anonymized-registry
  → calibration/validation flywheel, signed KB-version distribution with a
  founder review page, an Edge-Function LLM proxy (moves the API key
  server-side and *enforces* de-identification), Storage for
  drawings/OCT/fundus images, clinic analytics, and (much later)
  patient-facing intake. Includes a "what Supabase must NEVER become"
  section (no diagnostic-path dependency, no PII/analytics mixing, no
  server-side scoring) and a sequenced, independently-shippable roadmap
  with cost notes (steps 0–5 fit the free tier).

**Why**

The founder confirmed everything stays stored locally but asked for the full
range of ideas a Supabase integration could provide. This records the
exploration durably so the eventual go/no-go is an informed decision.

**Deliberately NOT done (guardrail):** no Supabase org/project created, no
tier chosen, no spend, no architecture committed. Awaiting the founder's
call on the recommended first arc (IndexedDB → Auth/RLS → outbox sync).

---

## 2026-07-04 — Session 2 (increment I): ICD-10 coverage completed — all 130 conditions

**What**

- `knowledge/icd-map.js` — expanded from 23 to **all 130 conditions coded**
  (100% ICD-10-CM coverage; was 0/130 at session start). Every code was
  looked up AND validated as real + billable against ICD-10-CM 2026 via the
  connected tool — none invented. Defaults use the "unspecified eye/stage"
  variant; every entry is `NEEDS_CLINICAL_REVIEW` with provenance, official
  label, and a `caution` note wherever the mapping is a judgment call
  (no dedicated code, an assumption like diabetes type, or a forced
  laterality for combination codes such as CRVO/BRVO/CME).
- `tests/icd-map.test.js` — added a guard that **every** condition carries a
  code (not just urgent ones), so coverage can't silently regress.
- `NEEDS_REVIEW.md` — updated the ICD section with the full list of
  judgment-call mappings for the founder (Diabetic Retinopathy type/ME
  assumption highlighted as most important to confirm).

**Why**

Finishing gap 3. The coding page is now fully populated for every possible
differential, while keeping the "provisional / verify / advisory only"
framing intact (the ⚠ verify flags and disclaimer from increment E apply to
all of them).

**Verified:** 63/63 tests pass; audit shows 130/130 coded (100%); browser
smoke clean. A handful of codes (ERM, CME, macular edema, MacTel,
quadrantanopia, diabetic retinopathy) were explicitly re-validated against the
tool before commit to keep the "verified" provenance honest.

---

## 2026-07-04 — Session 2 (increment H): Data-driven routing — fixes 50 silently-undiagnosable conditions

**What**

- `js/engine.js` — `selectRoutes` now has a general **data-driven pass**: if
  ALL of a condition's required tokens are present, its route is activated so
  the condition can be scored. The hardcoded symptom triggers remain as a
  fast path.
- `tests/engine-reachability.test.js` — permanent guard: **every** condition
  must be self-reachable (appear in the differential when all its own
  evidence is present).

**Why — this was the biggest correctness gap found this session.**

A mechanical probe (inject each condition's own req+sup tokens, check it
surfaces) found **50 of 130 conditions were silently un-diagnosable**: their
route was never in `selectRoutes`' hardcoded trigger list, so they were never
scored even with a textbook-complete picture. Examples: Conjunctival
Hyperemia (req: redness), Corneal Abrasion (pain_acute), Diabetic Retinopathy
(blur), Divergence Insufficiency (distance_diplopia), Traumatic Cataract
(trauma_history), and most of the cornea domain. After the fix: **0/130
unreachable**.

Scoring is unchanged, so ranking of the known golden cases is preserved
(verified) and simple presentations don't gain noise — broader routing only
lets a condition be *considered*; the req-gated scoring still decides whether
it ranks. Self-maintains as the KB grows.

**Verified:** 62/62 tests pass (incl. all prior golden vignettes unchanged);
0/130 self-unreachable; browser smoke clean; simple cases (dry eye, POAG)
unchanged, isolated "redness" now correctly surfaces Conjunctival Hyperemia.

---

## 2026-07-04 — Session 2 (increment G): Concurrent problem foci (multi-problem view)

**What**

- `js/engine.js` — new `computeProblemFoci(dxList)`: a deterministic
  presentation layer that partitions the scored differential into
  **independent clinical problems by domain**, each with its own lead
  condition, confidence band, within-focus alternates, and a per-problem
  "next check" (the lead's top missing evidence). Written to `V.problemFoci`;
  urgent problems sort first. **Scoring is unchanged and `V.dxList` is
  untouched** — zero regression risk.
- `js/ui-advisory.js` — new **"Working Problems"** section renders the foci
  (grouped, urgent-flagged) above the retained flat differential. The panel
  evolves; nothing is torn down.
- `js/data-model.js` — `blankVisit()` carries `problemFoci: []`.
- `tests/engine-problem-foci.test.js` (6 tests): multi-problem separation,
  per-focus shape, urgent ordering, foci-are-a-view-over-dxList, evidence
  floor. `ARCHITECTURE.md` §B.1 updated to record this as the first bounded
  version (the per-focus state machine B.3 remains the next step).

**Why**

Gap 4 — the central conceptual limitation: one ranked list forces
co-existing problems (dry eye + glaucoma-suspect + convergence insufficiency)
to compete for one slot. This surfaces them as **N independent problems**,
which is how real multi-morbid patients present. Doing it as a view over the
existing engine keeps determinism, safety, and every golden test intact while
delivering the product's headline differentiator.

**Verified:** 60/60 tests pass. Confirmed in headless Chromium: a 3-problem
patient (POAG 72% / Exposure Keratopathy 67% / Convergence Insufficiency 44%)
renders as three separate Working Problems with no console errors.

---

## 2026-07-04 — Session 2 (increment F): CI pipeline + dev harness docs

**What**

- `.github/workflows/ci.yml` — GitHub Actions CI running on every push/PR:
  syntax-checks all app JS, verifies the token registry is in sync
  (`registry:check`), runs the full test suite (`npm test`), and prints the
  KB audit. No dependencies, secrets, or network — the harness uses only Node
  built-ins. This operationalizes the continuous-feedback loop: every future
  change is now regression-tested automatically.
- `tools/README.md` — plain developer guide to the harness (commands, files,
  the token registry, the browser smoke test).

**Why**

The safety net only protects the project if it runs on every change. CI makes
the golden vignettes, registry sync, and KB invariants a gate, not a habit.

**Verified:** all four CI steps pass locally (test/registry/audit exit 0;
syntax check clean).

---

## 2026-07-04 — Session 2 (increment E): ICD-10 codes (authoritative, provisional) + coding page

**What**

- **`knowledge/icd-map.js`** — new condition→ICD-10-CM map. 23 conditions
  coded, covering **all 17 urgent conditions** plus common ones (POAG, dry
  eye, nuclear cataract, allergic conjunctivitis, keratoconus, optic
  neuritis). Every code was looked up AND validated against the **ICD-10-CM
  2026** code set via the connected ICD-10 tool — real, billable
  (HIPAA-valid) leaf codes, none invented. Defaults use the
  "unspecified eye/stage" variant (app doesn't capture laterality at coding
  time). Every entry carries `status: NEEDS_CLINICAL_REVIEW`, provenance
  (`verified`), the official label, and a `caution` note where the mapping
  is a judgment call.
- `knowledge/loader.js` backfills `cond.icd` (+ `icd_label`, `icd_status`)
  from the map during assembly — engine and coding page already read
  `cond.icd`, so this lights up gap 3 with no engine rewrite.
- `js/engine.js` threads `icd_label`/`icd_status` through `dxList`.
- `js/ui-pages-2.js` (coding page) now shows the code with its official
  label on hover, a **"⚠ verify" flag** on every provisional code, a
  placeholder for unmapped conditions, and a footer disclaimer ("provisional
  defaults… advisory only — not a billing decision"). Keeps the
  never-authoritative framing.
- `tests/icd-map.test.js` (6 tests): well-formed billable-shape codes (no
  bare category headers), names exist in KB, every entry review-flagged with
  provenance, all urgent conditions coded, codes propagate to `dxList`.

**Why**

Gap 3 — ICD codes referenced but never populated; the coding page had
nothing to render. Sourcing real codes from the authoritative tool (rather
than inventing them) respects the "never fabricate clinical content"
guardrail; flagging every one for review respects "AI-authored clinical
content is provisional until the founder verifies."

**Founder action needed:** confirm the 23 mappings (esp. the `caution`
ones: Microbial Keratitis, Compressive Optic Neuropathy, Choroidal Melanoma,
Retinal Tear/Detachment) and decide laterality/stage capture. Remaining 107
conditions still need codes — same verified process.

**Verified:** 54/54 tests pass; browser smoke test clean; coding page
renders codes + verify flags (confirmed via headless Chromium).

---

## 2026-07-04 — Session 2 (increment D2): Token registry + reachability fixes + browser smoke test

**What**

- **Token registry (Phase 1 foundation, ARCHITECTURE.md §A.1).**
  `tools/gen-token-registry.js` generates `knowledge/token-registry.js`
  (`TOKEN_REGISTRY` + `TOKEN_REGISTRY_STATS`) by MEASURING every token's
  producers (symptom chips, dictionary, finding-map, free-text parser,
  engine derivation, temporal, medication bridge), KB usage counts, and
  reachability. Nothing invented; `type_hint` is mechanically inferred and
  marked provisional. Loaded in both the browser (`index.html`) and Node.
  `npm run registry` / `registry:check`.
- **Reachability fixes surfaced by the registry** (were: hallmark evidence
  present but condition never scored):
  - `leukocoria` — added as a selectable slit-lamp finding + dictionary
    aliases + finding-map entry, so Congenital Cataract (req: leukocoria)
    is now reachable. Added an **urgent leukocoria alert** (retinoblastoma /
    congenital cataract), flagged `NEEDS_CLINICAL_REVIEW` for founder to
    verify wording/urgency. Zero unreachable required tokens now.
  - **Data-driven urgent routing.** `selectRoutes` now activates the urgent
    route whenever the *required* token of any urgent-route condition is
    present. Fixes silent non-scoring of Hypopyon Uveitis (hypopyon_visible),
    Neovascular Glaucoma (rubeosis_iridis), and Wet AMD (distortion) — each
    previously fired a safety alert but produced an empty differential.
    Self-maintains as the KB grows.
  - Added `RAPD_positive`→neuro, `hypopyon_visible`→anterior,
    `rubeosis_iridis`→glaucoma, `leukocoria`→lens route triggers.
- **Real browser smoke test** (Chromium/Playwright, kept in scratchpad):
  confirms the app loads with no console/page errors, KB (130) + registry
  (490 tokens) load, login renders, engine is callable. Observed the app
  pulls fonts from Google Fonts CDN — cosmetic, but a minor offline-first
  wrinkle worth self-hosting later.
- `tests/token-registry.test.js` (5 tests): registry-in-sync guard, every
  required token reachable, unreachable sup/con frozen at ≤70, no undeclared
  KB tokens. Plus 5 new golden vignettes for the routing fixes.

**Why**

The registry is the root-cause fix for gap 1 and the recon that made the
reachability bugs visible and provable. Enforcing "every required token is
reachable" as a test means a condition can never again be silently
un-diagnosable.

**Verified:** 48/48 unit tests pass; browser smoke test passes; registry
`--check` clean. Divergence from doc: built the registry as a *generated*
file with a sync-check test (rather than a hand-maintained one) so it can
never drift from the sources — recorded here per the brief.

---

## 2026-07-04 — Session 2 (increment D1): Medication tokens actually reach the engine

**What**

- `js/engine.js` — `collectTokens` now calls `getMedicationTokens()` as
  source 10 (guarded with `typeof` so the engine runs without the module).
  The medication-checker's engine bridge existed but was **never invoked**:
  drug-derived tokens (`steroid_history`, `raised_iop_risk`, `dryness`)
  never reached scoring. Concretely, "Drug-induced Cataract (Steroid)"
  *requires* `steroid_history` — it was mathematically impossible for it to
  ever appear. Now a steroid user with PSC signs ranks it first (0.83).
- `tools/lib/load-engine.js` — harness loads `medication-checker.js`.
- 2 new golden vignettes (steroid-cataract reachable; engine safe without
  medication data).

**Why**

Found while building the token registry's producer inventory: mechanical
source-tracing showed `getMedicationTokens` had zero call sites. This is
exactly the class of dead-wiring bug the registry is meant to surface.

**Verified:** 38/38 tests pass.

---

## 2026-07-04 — Session 2 (increment C): Free-text negation handling

**What**

- `js/engine.js` — `parseComplaintText` now strips negated phrases before
  token extraction (`stripNegatedPhrases`): "no pain", "denies flashes",
  "without discharge" no longer emit the negated tokens. The splitter is
  deliberately conservative — only the negated clause tail is dropped, so
  "no flashes, floaters since Monday" still emits `floaters` (over-alerting
  is safer than under-alerting for red flags).
- Two false-positive regex fixes: "reduced vision" no longer emits `redness`
  (\bred\b), "painless" no longer emits `pain` (pain(?!less)).
- `tests/engine-freetext.test.js` — 10 new tests: negation cases, the two
  false-positive fixes, positive-phrasing sensitivity controls, and two
  end-to-end checks that negated red flags don't fire the retinal alert
  while positive phrasing still does.

**Why**

Gap 6 in ARCHITECTURE.md: the regex parser had no negation handling, so a
recorded "denies pain" actively pushed the differential toward painful
conditions. This was the smallest bounded fix with real clinical impact.

**Verified:** 36/36 tests pass; golden vignettes unchanged.

---

## 2026-07-04 — Session 2 (increment B): Exclusion matcher fixed, urgent conditions un-suppressible

**What**

- `js/engine.js` — rewrote the matching inside `applyExclusions` (the only
  engine change):
  - Condition names are normalized to snake_case before comparison, so
    exclusion strings like `"acute_angle_closure"` now actually match
    "Acute Angle Closure Crisis". Before this fix, 16 declared exclusion
    rules essentially never fired (2 fired by accident).
  - **Safety guard: urgent-flagged conditions are never removed by exclusion
    logic.** A high-scoring chronic condition (e.g. POAG) can no longer hide
    an emergency (e.g. Acute Angle Closure Crisis) from the differential.
    This is a deliberate divergence from the raw KB intent, in line with the
    "red flags are un-suppressible" guardrail.
  - A condition can no longer exclude itself.
- `knowledge/binocular.js` — exclusion target `sixth_nerve_palsy` renamed to
  `sixth_cranial_nerve_palsy` (unambiguous naming fix: the condition "Sixth
  Cranial Nerve Palsy" exists; the old string could never match it).
- `knowledge/surface.js` — flagged the two genuinely unresolvable exclusion
  targets inline with `NEEDS_CLINICAL_REVIEW` comments (`acute_keratitis`
  from evaporative dry eye; `orbital_cellulitis` from preseptal cellulitis —
  the latter's intent also looks inverted and needs the founder's call).
- `tests/engine-exclusions.test.js` — 6 new tests pinning the fixed matcher:
  normalized matching fires, low scorers suppress nothing, no self-exclusion,
  urgent survival (unit + full-pipeline end-to-end where POAG ≥ 0.5 coexists
  with an acute angle-closure presentation and AACC stays in the list).
- `tools/kb-audit.js` — exclusion section now models the fixed engine matcher
  (resolvable / suppressible / unresolvable) instead of simulating the old bug.

**Why**

Gap 2 in ARCHITECTURE.md — comorbidity suppression silently no-oped. Fixing
it without the urgent guard would have been dangerous (several exclusion
targets are urgent conditions); the guard makes the feature safe to enable.

**Verified:** 26/26 tests pass (golden vignettes unchanged — no regression);
audit shows 14/16 rules resolving. All app files pass `node --check`.

---

## 2026-07-03 — Session 1: Repo bootstrap + KB audit/validation harness

**What**

- Imported the Entopic v1.0.0 codebase (33 files, browser-only app) into the
  repository as the working baseline. No app source was modified.
- Added `ARCHITECTURE.md` and `CLAUDE.md` to the repo root so every future
  session can orient from version control.
- Added a Node-based dev/test harness (the app itself stays browser-only and
  offline-first — this tooling never ships to the client or runs in the
  diagnostic path):
  - `tools/lib/load-kb.js` — loads the browser-global knowledge base + token
    layers into a sandboxed Node context (mirrors the `<script>` load order),
    so tooling and tests can inspect the KB without a browser.
  - `tools/kb-audit.js` — read-only ground-truth report on the KB and token
    vocabulary. `npm run audit`. Supports `--json` and `--strict` (exit
    non-zero on hard-invariant violations; not yet wired into CI because the
    current KB knowingly violates some invariants — that's what it measures).
  - `tests/kb-structure.test.js` — regression net that freezes current counts
    and structural invariants. `npm test` (Node's built-in test runner; no new
    dependencies).
  - `package.json` — scripts only (`audit`, `audit:strict`, `test`).

**Why**

Per the working brief, foundations first. Before touching the diagnostic engine
or the KB, we need (a) the code under version control and (b) an automated way
to measure the KB and catch regressions. This harness is the seed of the
Phase 1 token-registry validator and the Phase 0 golden-case safety net. It is
the safest possible first change: it adds tooling and tests, and modifies zero
app behavior.

**Verified findings (measured, not assumed) — with divergence from the doc**

Confirmed against `ARCHITECTURE.md`:
- 130 conditions across 9 domains; 17 urgent. ✓ (matches doc exactly)
- Per-domain counts match the doc exactly.
- **0 / 130 conditions carry an ICD code.** ✓ (confirms gap 3)
- **Exclusions are effectively broken.** 16 exclusion rules are declared but
  only **2** actually fire under the current `applyExclusions` matcher, which
  substring-compares snake_case tokens (`"acute_angle_closure"`) against
  space-separated display names (`"Acute Angle Closure Crisis"`). ✓ (confirms
  gap 2 — comorbidity suppression is essentially not running)

Divergences from the doc's Appendix B (code is newer / doc was approximate):
- Distinct tokens referenced by KB conditions: **471** (req/sup/con/temporal/
  tests), not 512. Core req/sup/con: 285.
- Tokens defined in `token-dictionary.js`: **184**, not 183 (no duplicate keys).
- Tokens emitted by `finding-token-map.js`: 98 distinct (across 171 entries).

New findings worth the founder's attention:
- **3 exclusion rules point at conditions that don't exist in the KB** by any
  name match: `acute_keratitis`, `orbital_cellulitis`, `sixth_nerve_palsy`.
  These may be naming mismatches (the target exists under a different name) or
  genuine content gaps. Flagged for clinical review, not auto-changed.
- **`leukocoria` is a *required* token that no input source can currently
  produce** (not in the dictionary, not emitted by any finding). Any condition
  that requires it (e.g. retinoblastoma) can therefore never surface. This is
  the kind of unreachable-required-token bug the Phase 1 registry is meant to
  make impossible. Flagged for review. (Other no-lexical-producer required
  tokens — `high_iop`, `eso_near`, `exo_distance`, `steroid_history` — are
  legitimately produced by the engine's measurement/medication derivation,
  which a KB-only audit can't see.)

**Divergence from the doc's plan:** none in substance. The doc's Phase 0 says
"instrument and freeze." This session does exactly that, and folds in the token
audit (Phase 1 reconnaissance) since it's read-only and cheap. No engine, KB, or
UI logic changed.

**Still working / next candidates**

- App is unchanged and runs exactly as before (open `index.html`).
- Next highest-value increments (for founder input):
  1. **Golden clinical vignettes** — load the engine in Node and assert
     input → expected active problems + red-flag alerts. Biggest safety net.
  2. **Fix the exclusion matcher** (gap 2) — bounded, testable, and the audit
     already proves the before/after. Best done together with condition `id`s.
  3. **Token registry** (Phase 1) — the root-cause fix; the audit is its recon.
- Clinical review needed from the founder on the 3 unresolvable exclusion
  targets and the `leukocoria` reachability gap above.
