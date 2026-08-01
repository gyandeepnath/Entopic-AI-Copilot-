# Entopic — Human Factors Register

**Phase 2 · 2026-08-01 · v1.4.1**

Cognitive ergonomics and usability, measured. Each entry: the observation, how
it was measured, its cost to the clinician, and what to do.

Graded **H1** (interferes with clinical work), **H2** (adds avoidable effort),
**H3** (polish).

---

## The measurements everything below rests on

Counted by rendering every step in a headless browser and querying the DOM:

| | |
|---|---|
| Exam steps | 33 |
| Text inputs | 408 |
| Dropdowns | 126 |
| Free-text areas | 72 |
| Clickable chips/controls | 633 |
| **Total data entry points** | **606 fields + 633 chips** |
| Steps with a "Normal" quick-fill | 9 of 33 |
| Heaviest step | Binocular Vision, 68 fields |
| Most chip-driven step | Chief Complaint, 189 chips |

---

## H1 — interferes with clinical work

### HF-01 · A follow-up visit starts blank
**Measured.** `getPreviousVisit()` exists and is used for comparison views, but
`blankVisit()` returns empty; no field is seeded from the last encounter.
**Cost.** In follow-up practice most of the record is unchanged from last time.
The clinician re-enters demographics context, habitual Rx, medications, systemic
history — every visit. For a clinic running 60% follow-ups this is the largest
single time cost in the product.
**Fix.** Carry forward history, medications and habitual Rx, each visibly marked
as carried and requiring confirmation rather than silently copied. ~40 h.
**Care needed:** silently copying a previous finding into a new encounter would
be a documentation hazard. Carried values must be visually distinct and must not
count as "assessed" until confirmed. Ties to Safety Register CS-05.

### HF-02 · No "not assessed" state
**Measured.** Fields initialise to `""`; completion is inferred from data
presence.
**Cost.** The clinician cannot record "I chose not to do gonioscopy" as distinct
from "I did gonioscopy and it was normal" or "I forgot". On review — their own,
a colleague's, or a court's — these are not the same.
**Fix.** Tri-state per section. ~30 h. Highest-value documentation change
available.

### HF-03 · Ties in the differential are shown as a ranking
**Measured.** Routine dry-eye case returns three conditions all at `prob: 0.75`,
rendered as an ordered list.
**Cost.** Anchoring. The first item reads as "most likely" when the engine is
saying "I cannot distinguish these three". That is *worse* than no ranking,
because it manufactures confidence the engine does not have.
**Fix.** Render equal scores as an explicit tie group. ~16 h. Small change,
real cognitive effect.

### HF-04 · `prob` is displayed as a percentage but is not a probability
**Measured.** `prob: 0.75` is a normalised match score, rendered as "75%".
Nothing calibrates it against outcomes.
**Cost.** "75%" is read by clinicians as a frequency claim. It is not one.
**Fix.** Relabel to "match strength" or a qualitative band until calibration
exists. Low engineering cost; **⚠ founder's call on wording** since it changes
what clinicians are told.

---

## H2 — avoidable effort

### HF-05 · 24 of 33 steps have no "Normal" path
**Measured.** `WNL_TEMPLATES` covers va, iop, slit_lamp, pupil, motility,
gonioscopy, fundus, neuro, bv (bv added this phase).
**Missing and worth having:** refraction (48 fields), dilation, and the three
history steps.
**⚠ CLINICAL JUDGEMENT** on what "normal" means per step. The governing rule is
now written in `js/wnl-templates.js`: a template may assert a normal *result*,
never invent a *measurement*.

### HF-06 · Refraction has 48 fields and no previous-Rx prefill
Habitual Rx is the starting point for subjective refraction in almost every
case. Entering it from scratch every visit is pure waste. ~12 h.

### HF-07 · No keyboard-first path
**Measured.** Entry is mouse/touch-driven; no evidence of a tab-order
discipline or keyboard shortcuts for the chip grids.
**Cost.** Fast typists — which most experienced clinicians are — cannot go
faster than pointing. Chairside, a keyboard path is often quicker than reaching
for a mouse.
**Fix.** Tab order per step plus type-ahead on chip grids. ~40 h.

### HF-08 · The engine panel competes with the exam below 1000px
Fixed earlier (a drawer plus a header button), but on a tablet the clinician
still chooses between seeing the exam and seeing the reasoning. A compact
always-visible summary strip (leading condition + red-flag count) would remove
the choice. ~20 h.

### HF-09 · 189 chips on Chief Complaint with no prioritisation
Rich, and rich is right for symptom capture — but an undifferentiated grid of
189 makes finding the intended one a scan rather than a recognition. Frequency
ordering, or grouping by presentation, would cut the scan. ~16 h.

### HF-10 · No undo
**Measured.** No undo path found for exam data entry. A mistyped IOP or a
mis-tapped chip is corrected by hand.
**Note.** Destructive *record* operations are well guarded — restore takes a
safety snapshot first and aborts if it cannot. It is field-level undo that is
missing. ~24 h.

---

## H3 — polish

### HF-11 · No indication of how long a step usually takes
A junior cannot tell whether they are slow. Faculty cannot see where students
struggle. Cheap to add given analytics already exist.

### HF-12 · Report is clinician-facing only
No patient-readable summary or education leaflet. Patients leave with nothing.

### HF-13 · No visible autosave confidence
Autosave runs every 20 s and flashes an indicator. There is no "last saved
14:32" state a nervous clinician can check.

### HF-14 · Chip grids do not show which chips are engine-relevant
Every chip feeds the engine, but nothing signals which findings would most
change the differential right now. The "check next" suggestions do this in the
advisory panel; the exam surface does not.

---

## What is genuinely well done, and should be protected

Listing this is not padding — these are the things a redesign could easily
destroy.

1. **Recognition over recall.** 633 chips instead of free text. This is the
   single best clinical-UX decision in the product.
2. **Live reasoning.** The engine re-runs on every input and the map updates.
   The clinician sees their thinking reflected as they work.
3. **Glass-box evidence.** Every differential shows what matched, what
   contradicted, what is missing. Rare, and clinically respectful.
4. **Sticky, non-dismissible data-loss warnings.** "This device has stopped
   saving" cannot be waved away, deliberately, because an alert dismissed
   reflexively mid-consultation is worse than none.
5. **Suggestion → exact field navigation.** Clicking a "check next" suggestion
   lands on the precise input, with a hint. Excellent.
6. **Corrupt data is never overwritten.** Reading zero patients never looks
   like a clinic with zero patients.
7. **Advisory framing throughout.** Consistent, and never buried.

---

## Priority order

| | Item | Effort |
|---|---|---|
| 1 | HF-02 "not assessed" state | 30 h |
| 2 | HF-01 carry-forward | 40 h |
| 3 | HF-03 tie handling | 16 h |
| 4 | HF-04 relabel `prob` | 4 h + decision |
| 5 | HF-06 previous-Rx prefill | 12 h |
| 6 | HF-05 remaining Normal templates | 24 h + clinical input |
| 7 | HF-07 keyboard path | 40 h |
| 8 | HF-09 chip prioritisation | 16 h |

**~182 hours** covers every H1 and the worst H2s.
