/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL THRESHOLDS  (Phase 4 finding F-4)            */
/*                                                                  */
/* ── THE DEFECT THIS CLOSES ──                                    */
/*                                                                  */
/* js/engine.js contained 129 numeric comparisons. Most are         */
/* structural — array bounds, loop limits, sentinel values. But a   */
/* sizeable minority are CLINICAL DECISIONS written as JavaScript   */
/* literals:                                                        */
/*                                                                  */
/*     if (iopMax > 21) addToken("high_iop");                       */
/*     if (cctMin < 520) addToken("thin_cornea");                   */
/*     if (mdOd < -6) addToken("visual_field_defect");              */
/*                                                                  */
/* Each of those numbers changes which conditions appear in a       */
/* differential. A clinician signing off 394 conditions was NOT     */
/* signing these off, and had no way to see them. They were the     */
/* least reviewed and most load-bearing numbers in the product.     */
/*                                                                  */
/* ── WHAT THIS FILE DOES AND DOES NOT DO ──                       */
/*                                                                  */
/* It does NOT introduce a single new number. Every `v` below is a  */
/* verbatim transcription of the literal that was already in        */
/* js/engine.js on 2026-08-03. Behaviour is unchanged by design,    */
/* and tests/clinical-thresholds.test.js pins each value to the     */
/* fallback literal still present at the engine call site, so the   */
/* two can never drift apart.                                       */
/*                                                                  */
/* Moving them here does not make them right. It makes them         */
/* VISIBLE, so that they can be made right.                         */
/*                                                                  */
/* ── SOURCES ARE DELIBERATELY EMPTY ──                            */
/*                                                                  */
/* Every entry carries `src: ""` and `status: "UNVERIFIED"`.        */
/*                                                                  */
/* Several of these numbers are ones a clinician would recognise    */
/* instantly, and it would be easy to attach a plausible-sounding   */
/* guideline name to each. That is precisely the failure mode this  */
/* project has already had once (invented trial percentages in      */
/* js/risk-calc.js, since quarantined). A citation nobody read is   */
/* worse than no citation, because it stops the reader checking.    */
/*                                                                  */
/* So: no source is written here until the founder reads the source */
/* and writes it. `status` moves to "VERIFIED" in the same edit.    */
/*                                                                  */
/* ── HOW TO CHANGE A VALUE ──                                     */
/*                                                                  */
/*   1. Change `v` here.                                            */
/*   2. Change the matching fallback literal in js/engine.js — the  */
/*      test will tell you exactly which line if you forget.        */
/*   3. Fill in `src` and set `status: "VERIFIED"`.                 */
/*   4. Run `node tests/engine-golden.test.js` and read what moved. */
/*                                                                  */
/* Load order: before knowledge/loader.js and js/engine.js.         */
/* Pure data — no DOM, no storage, no dependencies.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Field meanings:
     v       the number itself
     unit    what it is measured in ("" for unitless ratios and grades)
     op      how the engine compares against it, as written in the code
     what    one line a clinician can judge without reading JavaScript
     emits   the token(s) produced when the comparison is true
     where   which part of the engine applies it
     src     the citation — EMPTY until a human reads one (see header)
     status  UNVERIFIED until the founder signs the row off
     note    anything a reviewer needs to know before changing it        */

var CLINICAL_THRESHOLDS = {

  /* ── AGE BRACKETS ────────────────────────────────────────────── */

  age_paediatric_max: {
    v: 18, unit: "years", op: "<",
    what: "Age below which a patient is treated as paediatric",
    emits: ["paediatric_age", "young_age"],
    where: "token derivation — age brackets",
    src: "", status: "UNVERIFIED",
    note: "Also the rule for the DEPRECATED `young_age` token. Changing this " +
          "moves every condition still tagged young_age. See knowledge/age-classification.js."
  },
  age_young_adult_max: {
    v: 40, unit: "years", op: "<",
    what: "Upper edge of the young-adult bracket (lower edge is age_paediatric_max)",
    emits: ["young_adult_age"],
    where: "token derivation — age brackets",
    src: "", status: "UNVERIFIED"
  },
  age_over_40: {
    v: 40, unit: "years", op: ">=",
    what: "Age at which presbyopic / age-related conditions become plausible",
    emits: ["age_over_40", "age_related"],
    where: "token derivation — age brackets",
    src: "", status: "UNVERIFIED",
    note: "Deliberately the same number as age_young_adult_max — the brackets " +
          "abut. If one moves and the other does not, an age falls in a gap."
  },
  age_older: {
    v: 60, unit: "years", op: ">=",
    what: "Age at which the engine treats the patient as older",
    emits: ["older_age"],
    where: "token derivation — age brackets",
    src: "", status: "UNVERIFIED"
  },
  age_paediatric_workup: {
    v: 16, unit: "years", op: "<=",
    what: "Age at or below which the paediatric section and binocular status are suggested",
    emits: [],
    where: "next-test suggestions — documentation nudges only",
    src: "", status: "UNVERIFIED",
    note: "Suggests paperwork. Produces no token and no differential."
  },
  age_cycloplegic_refraction: {
    v: 8, unit: "years", op: "<=",
    what: "Age at or below which cycloplegic refraction is suggested",
    emits: [],
    where: "next-test suggestions — documentation nudges only",
    src: "", status: "UNVERIFIED"
  },

  /* ── INTRAOCULAR PRESSURE ────────────────────────────────────── */

  iop_high: {
    v: 21, unit: "mmHg", op: ">",
    what: "IOP above which the engine treats pressure as raised",
    emits: ["high_iop"],
    where: "token derivation; also the 'IOP elevated' warn alert",
    src: "", status: "UNVERIFIED",
    note: "At or below this value the engine emits `normal_iop` instead. " +
          "One number therefore decides both tokens — they cannot overlap or gap."
  },
  iop_very_high: {
    v: 30, unit: "mmHg", op: ">",
    what: "IOP above which the engine treats pressure as markedly raised",
    emits: ["very_high_iop"],
    where: "token derivation; also the 'urgent assessment' alert band",
    src: "", status: "UNVERIFIED"
  },
  iop_critical: {
    v: 40, unit: "mmHg", op: ">",
    what: "IOP above which an acute angle-closure alert is raised",
    emits: [],
    where: "computeAlerts — urgent alert band only",
    src: "", status: "UNVERIFIED",
    note: "Alert wording only; emits no token. Raising an alert never removes one."
  },

  /* ── ANTERIOR SEGMENT ────────────────────────────────────────── */

  cct_thin: {
    v: 520, unit: "µm", op: "<",
    what: "Central corneal thickness below which the cornea is treated as thin",
    emits: ["thin_cornea"],
    where: "token derivation — pachymetry",
    src: "", status: "UNVERIFIED",
    note: "Applied to the THINNER of the two eyes."
  },
  van_herick_narrow: {
    v: 2, unit: "grade", op: "<=",
    what: "Van Herick grade at or below which the angle is treated as narrow",
    emits: ["narrow_angle", "shallow_ac"],
    where: "token derivation; also the 'gonioscopy before dilation' warn alert",
    src: "", status: "UNVERIFIED"
  },
  ac_cells_graded: {
    v: 2, unit: "SUN grade", op: ">=",
    what: "Anterior chamber cell grade at or above which a graded severity token is emitted",
    emits: ["cells_2", "cells_3", "cells_4"],
    where: "token derivation — slit lamp grades",
    src: "", status: "UNVERIFIED",
    note: "Any cell grade above zero already emits `cells_present`. This is the " +
          "extra threshold for the graded token; lowering it does not hide anything."
  },
  ac_flare_graded: {
    v: 2, unit: "SUN grade", op: ">=",
    what: "Anterior chamber flare grade at or above which a graded severity token is emitted",
    emits: ["flare_2", "flare_3", "flare_4"],
    where: "token derivation — slit lamp grades",
    src: "", status: "UNVERIFIED"
  },
  tbut_reduced: {
    v: 10, unit: "seconds", op: "<",
    what: "Tear break-up time below which the tear film is treated as unstable",
    emits: ["dryness", "TBUT_reduced", "tear_film_instability"],
    where: "token derivation — slit lamp",
    src: "", status: "UNVERIFIED",
    note: "Applied to the LOWER of the two eyes."
  },
  schirmer_low: {
    v: 10, unit: "mm/5min", op: "<",
    what: "Schirmer result below which tear production is treated as reduced",
    emits: ["reduced_tearing", "schirmer_low"],
    where: "token derivation — slit lamp",
    src: "", status: "UNVERIFIED",
    note: "Applied to the LOWER of the two eyes. The engine does not currently " +
          "distinguish anaesthetised from unanaesthetised Schirmer — a reviewer " +
          "should decide whether it must."
  },

  /* ── LENS (LOCS-style grading) ───────────────────────────────── */

  locs_ns_graded: {
    v: 2, unit: "grade", op: ">=",
    what: "Nuclear sclerosis grade at or above which a graded lens token is emitted",
    emits: ["nuclear_sclerosis_grade_2", "nuclear_sclerosis_grade_3", "nuclear_sclerosis_grade_4"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED"
  },
  locs_cortical_opacity: {
    v: 2, unit: "grade", op: ">=",
    what: "Cortical grade at or above which a cortical opacity is recorded",
    emits: ["cortical_opacity"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED"
  },
  locs_psc_opacity: {
    v: 2, unit: "grade", op: ">=",
    what: "Posterior subcapsular grade at or above which a PSC opacity is recorded",
    emits: ["psc_opacity"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED"
  },
  locs_ns_symptomatic: {
    v: 2, unit: "grade", op: ">=",
    what: "Nuclear sclerosis grade at or above which gradual blur is inferred",
    emits: ["gradual_blur"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED",
    note: "⚠ This infers a SYMPTOM from a SIGN. The patient may not have " +
          "reported blur. A reviewer should decide whether that inference is " +
          "acceptable or whether it should require the patient to say so."
  },
  locs_ns_glare: {
    v: 3, unit: "grade", op: ">=",
    what: "Nuclear sclerosis grade at or above which glare is inferred",
    emits: ["glare"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED",
    note: "Same sign-to-symptom inference as locs_ns_symptomatic."
  },
  locs_psc_symptomatic: {
    v: 1, unit: "grade", op: ">=",
    what: "Posterior subcapsular grade at or above which near blur and glare are inferred",
    emits: ["near_blur", "glare"],
    where: "token derivation — lens grades",
    src: "", status: "UNVERIFIED",
    note: "The lowest inference threshold in the table. Same caveat as above."
  },

  /* ── REFRACTION ──────────────────────────────────────────────── */

  myopia_min: {
    v: -0.50, unit: "D (sphere)", op: "<",
    what: "Spherical power below which the eye is treated as myopic",
    emits: ["myopia"],
    where: "token derivation — refraction",
    src: "", status: "UNVERIFIED",
    note: "Applied per eye; either eye triggers it."
  },
  hyperopia_min: {
    v: 0.75, unit: "D (sphere)", op: ">",
    what: "Spherical power above which the eye is treated as hyperopic",
    emits: ["hyperopia"],
    where: "token derivation — refraction",
    src: "", status: "UNVERIFIED",
    note: "Not symmetrical with myopia_min. That asymmetry was in the original " +
          "code and is preserved deliberately — a reviewer should confirm it is intended."
  },
  astigmatism_min: {
    v: 0.75, unit: "D (cylinder)", op: ">= (absolute)",
    what: "Cylinder magnitude at or above which astigmatism is recorded",
    emits: ["astigmatism"],
    where: "token derivation — refraction",
    src: "", status: "UNVERIFIED"
  },
  anisometropia_min: {
    v: 1.0, unit: "D (difference)", op: ">= (absolute)",
    what: "Inter-eye spherical difference at or above which anisometropia is recorded",
    emits: ["unequal_refractive_error"],
    where: "token derivation — refraction",
    src: "", status: "UNVERIFIED",
    note: "Spherical difference only — cylinder difference is not considered. " +
          "A reviewer should decide whether it should be."
  },

  /* ── BINOCULAR VISION & ACCOMMODATION ────────────────────────── */

  npc_receded: {
    v: 6, unit: "cm", op: ">=",
    what: "Near point of convergence at or beyond which convergence is treated as receded",
    emits: ["NPC_receded"],
    where: "token derivation — binocular vision",
    src: "", status: "UNVERIFIED",
    note: "Reads the BREAK value (V.bv.npc_b), not recovery."
  },
  phoria_near_significant: {
    v: 6, unit: "Δ", op: ">",
    what: "Near phoria magnitude above which exo/eso at near is recorded",
    emits: ["exo_near", "eso_near"],
    where: "token derivation — cover test at near",
    src: "", status: "UNVERIFIED",
    note: "One number for both directions. Exophoria and esophoria at near are " +
          "not clinically equivalent — a reviewer may want two numbers here."
  },
  phoria_distance_significant: {
    v: 6, unit: "Δ", op: ">",
    what: "Distance phoria magnitude above which exo/eso at distance is recorded",
    emits: ["exo_distance", "eso_distance"],
    where: "token derivation — cover test at distance",
    src: "", status: "UNVERIFIED",
    note: "Same single-number caveat as phoria_near_significant, and the same " +
          "value as the near threshold, which a reviewer may not intend."
  },
  aca_high: {
    v: 6, unit: "Δ/D", op: ">",
    what: "AC/A ratio above which the ratio is treated as high",
    emits: ["high_ACA_ratio"],
    where: "token derivation — binocular vision",
    src: "", status: "UNVERIFIED",
    note: "There is no matching LOW threshold — a low AC/A ratio currently " +
          "produces no token at all."
  },
  flipper_reduced: {
    v: 8, unit: "cpm", op: "<",
    what: "Accommodative facility below which the flipper rate is treated as reduced",
    emits: ["reduced_flipper_rate"],
    where: "token derivation — binocular vision",
    src: "", status: "UNVERIFIED",
    note: "Reads the monocular OD field only (V.bv.maf_od). OS and binocular " +
          "facility are recorded but not scored."
  },
  pfv_reduced: {
    v: 15, unit: "Δ", op: "<",
    what: "Base-out break at near below which positive fusional vergence is treated as reduced",
    emits: ["reduced_PFV"],
    where: "token derivation — binocular vision",
    src: "", status: "UNVERIFIED"
  },
  vergence_range_reduced: {
    v: 8, unit: "Δ", op: "<",
    what: "Any vergence break value below which the ranges are treated as reduced",
    emits: ["reduced_vergence_ranges"],
    where: "token derivation — binocular vision",
    src: "", status: "UNVERIFIED",
    note: "Applied to BO/BI at distance and near alike, with one number. Those " +
          "four ranges have different normal values — a reviewer may want four."
  },

  /* ── PUPILS & ORBIT ──────────────────────────────────────────── */

  anisocoria_min: {
    v: 1, unit: "mm", op: ">= (difference)",
    what: "Inter-pupil size difference at or above which anisocoria is recorded",
    emits: ["anisocoria"],
    where: "token derivation — pupils",
    src: "", status: "UNVERIFIED",
    note: "Measured on the light-reaction sizes. The engine does not compare " +
          "light and dark measurements, which is how Horner is distinguished."
  },
  proptosis_absolute: {
    v: 21, unit: "mm", op: ">=",
    what: "Exophthalmometry reading at or above which proptosis is recorded",
    emits: ["proptosis"],
    where: "token derivation — orbit",
    src: "", status: "UNVERIFIED",
    note: "Exophthalmometry normals vary by population and by instrument base " +
          "setting; neither is currently recorded."
  },
  proptosis_asymmetry: {
    v: 2, unit: "mm", op: ">= (difference)",
    what: "Inter-eye exophthalmometry difference at or above which proptosis is recorded",
    emits: ["proptosis"],
    where: "token derivation — orbit",
    src: "", status: "UNVERIFIED"
  },

  /* ── POSTERIOR SEGMENT & INVESTIGATIONS ──────────────────────── */

  cd_increased: {
    v: 0.6, unit: "ratio", op: ">=",
    what: "Vertical cup-to-disc ratio at or above which the cup is treated as enlarged",
    emits: ["increased_cd"],
    where: "token derivation — fundus",
    src: "", status: "UNVERIFIED",
    note: "Disc size is not recorded, so a large physiological cup in a large " +
          "disc scores identically to a pathological one."
  },
  cd_asymmetry: {
    v: 0.2, unit: "ratio (difference)", op: "> (absolute)",
    what: "Inter-eye cup-to-disc difference above which asymmetry is recorded",
    emits: ["cd_asymmetry"],
    where: "token derivation — fundus",
    src: "", status: "UNVERIFIED"
  },
  rnfl_thin: {
    v: 80, unit: "µm", op: "<",
    what: "OCT average RNFL thickness below which thinning is recorded",
    emits: ["RNFL_thinning", "field_defect"],
    where: "token derivation — investigations",
    src: "", status: "UNVERIFIED",
    note: "⚠ This also emits `field_defect`, i.e. a structural measurement is " +
          "asserting a FUNCTIONAL finding that was never tested. A reviewer " +
          "should decide whether that second token belongs here."
  },
  vf_md_defect: {
    v: -3, unit: "dB", op: "<",
    what: "Visual field mean deviation below which a field defect is recorded",
    emits: ["field_defect"],
    where: "token derivation — investigations",
    src: "", status: "UNVERIFIED",
    note: "Reliability indices are not recorded, so an unreliable field scores " +
          "the same as a reliable one."
  },
  vf_md_significant: {
    v: -6, unit: "dB", op: "<",
    what: "Visual field mean deviation below which a significant field defect is recorded",
    emits: ["visual_field_defect"],
    where: "token derivation — investigations",
    src: "", status: "UNVERIFIED"
  }
};


/* ═══════════════════════════════════════════════════════════════ */
/* SCORING THRESHOLDS                                              */
/*                                                                  */
/* Kept SEPARATE from the clinical table above, deliberately.       */
/*                                                                  */
/* The numbers above are statements about eyes: 21 mmHg is a claim  */
/* about intraocular pressure. The numbers below are statements     */
/* about the engine's own arithmetic — where it draws the line      */
/* between "worth showing" and "noise". A clinician can judge the   */
/* first from experience; the second only makes sense alongside the */
/* scoring model in js/engine.js.                                   */
/*                                                                  */
/* Mixing them would invite a reviewer to sign off a scoring        */
/* constant as though it were a clinical fact.                      */
/* ═══════════════════════════════════════════════════════════════ */

var SCORING_THRESHOLDS = {
  confidence_high: {
    v: 0.80, what: "Score at or above which confidence reads 'High'",
    where: "interpretConfidence", src: "", status: "UNVERIFIED"
  },
  confidence_moderate_high: {
    v: 0.60, what: "Score at or above which confidence reads 'Moderate-High'",
    where: "interpretConfidence", src: "", status: "UNVERIFIED"
  },
  confidence_moderate: {
    v: 0.40, what: "Score at or above which confidence reads 'Moderate'",
    where: "interpretConfidence", src: "", status: "UNVERIFIED"
  },
  confidence_low_moderate: {
    v: 0.20, what: "Score at or above which confidence reads 'Low-Moderate'",
    where: "interpretConfidence", src: "", status: "UNVERIFIED",
    note: "Phase 4 finding F-3: these four boundaries are evenly spaced and " +
          "were never calibrated against outcomes. The WORDS are the problem — " +
          "'High' reads as diagnostic certainty when it means 'matched most of " +
          "the tokens we happened to ask for'. Band boundaries and wording are " +
          "the founder's call."
  },
  derived_alert_min: {
    v: 0.15, what: "Score at or above which an urgent condition also raises an alert banner",
    where: "computeDerivedAlerts", src: "", status: "UNVERIFIED",
    note: "Phase 4 finding F-1. Lowering it raises more banners; raising it " +
          "raises fewer. It can never suppress the condition itself, which " +
          "appears in the differential marked URGENT regardless."
  },
  overlay_floor: {
    v: 0.15, what: "Score at or above which a clinician-authored condition is shown",
    where: "stage 8b overlay merge", src: "", status: "UNVERIFIED"
  },
  focus_lead_min: {
    v: 0.15, what: "Score a problem focus's leader must reach for the focus to be shown",
    where: "problem foci", src: "", status: "UNVERIFIED"
  },
  exclusion_high_scorer: {
    v: 0.5, what: "Score at or above which a condition can exclude a rival",
    where: "stage 8 exclusions", src: "", status: "UNVERIFIED",
    note: "⚠ This is the one scoring number that can REMOVE a condition from " +
          "view. Red flags are exempt by separate rule; see the exclusion stage."
  }
};


/* Read a threshold. `fallback` is the literal still present at the call site,
   so the engine keeps working if this file fails to load — the exam must run
   with no network and no surprises (ADR-006).

   tests/clinical-thresholds.test.js asserts every fallback equals its table
   value, so the fallback can never silently become a second, different rule. */
function clinThreshold(id, fallback) {
  var t = (typeof CLINICAL_THRESHOLDS !== "undefined") ? CLINICAL_THRESHOLDS[id] : null;
  return (t && typeof t.v === "number") ? t.v : fallback;
}

function scoreThreshold(id, fallback) {
  var t = (typeof SCORING_THRESHOLDS !== "undefined") ? SCORING_THRESHOLDS[id] : null;
  return (t && typeof t.v === "number") ? t.v : fallback;
}

/* Every row a reviewer still has to sign off. */
function thresholdsUnverified() {
  var out = [];
  [["clinical", CLINICAL_THRESHOLDS], ["scoring", SCORING_THRESHOLDS]].forEach(function (pair) {
    Object.keys(pair[1]).forEach(function (id) {
      if (pair[1][id].status !== "VERIFIED") out.push({ table: pair[0], id: id, row: pair[1][id] });
    });
  });
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CLINICAL_THRESHOLDS: CLINICAL_THRESHOLDS,
    SCORING_THRESHOLDS: SCORING_THRESHOLDS,
    clinThreshold: clinThreshold,
    scoreThreshold: scoreThreshold,
    thresholdsUnverified: thresholdsUnverified
  };
}
