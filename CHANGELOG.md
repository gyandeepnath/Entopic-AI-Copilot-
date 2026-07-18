# Changelog — Entopic

All notable changes are recorded here, newest first. Each entry says **what**
changed, **why**, and any **divergence** from `ARCHITECTURE.md` (which is a
strong hypothesis, not a contract — the code is the source of truth).

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
