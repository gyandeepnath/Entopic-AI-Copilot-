/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — GLAUCOMA DOMAIN                                */
/* 8 conditions.                                                    */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): each condition given */
/* a deep, differentiating profile (~20 firing tokens) — supportive  */
/* risk-factors/signs/symptoms AND contradicting features that rule  */
/* it out. Required tokens unchanged. Founder to verify.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_GLAUCOMA = [

{
  "name": "Primary Open Angle Glaucoma (POAG)",
  "route": "glaucoma",
  "req": ["field_defect"],
  "sup": ["high_iop", "increased_cd", "cd_asymmetry", "nrr_thinning", "disc_hemorrhage", "family_history", "older_age", "thin_cornea", "peripheral_field_loss", "diabetes_history", "peripapillary_atrophy_alpha_zone", "peripapillary_atrophy_beta_zone"],
  "con": ["pain_acute", "shallow_ac", "redness", "sudden_vision_loss", "halos", "normal_iop"],
  "temporal": ["chronic", "progressive"],
  "tests": ["visual_field_defect", "RNFL_thinning", "optic_disc_change", "high_iop"],
  "exclusions": ["acute_angle_closure"]
},

{
  "name": "Primary Angle Closure Glaucoma (PACG)",
  "route": "glaucoma",
  "req": ["shallow_ac"],
  "sup": ["high_iop", "narrow_angle", "hyperopia", "halos", "older_age", "family_history", "increased_cd", "field_defect", "intermittent_diplopia"],
  "con": ["pigment_dispersion", "myopia", "normal_iop"],
  "temporal": ["chronic"],
  "tests": ["narrow_angle", "high_iop"],
  "exclusions": []
},

{
  "name": "Acute Angle Closure Crisis",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["halos", "redness", "vomiting", "reduced_vision", "photophobia", "headache", "narrow_angle", "hyperopia", "older_age", "corneal_edema"],
  "con": ["itching_dominant", "purulent_discharge", "gradual_onset", "normal_iop"],
  "temporal": ["acute"],
  "tests": ["IOP_very_high", "shallow_ac", "corneal_edema"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Normal Tension Glaucoma (NTG)",
  "route": "glaucoma",
  "req": ["field_defect"],
  "sup": ["nrr_thinning", "disc_hemorrhage", "normal_iop", "cd_asymmetry", "family_history", "older_age", "migraine_history", "peripheral_field_loss", "increased_cd"],
  "con": ["high_iop", "pain_acute", "redness"],
  "temporal": ["chronic", "progressive"],
  "tests": ["visual_field_defect", "RNFL_thinning", "normal_iop"],
  "exclusions": []
},

{
  "name": "Glaucoma Suspect / Ocular Hypertension",
  "route": "glaucoma",
  "req": ["high_iop"],
  "sup": ["family_history", "thin_cornea", "increased_cd", "older_age", "cd_asymmetry", "diabetes_history"],
  "con": ["field_defect", "nrr_thinning", "disc_hemorrhage", "reduced_vision", "pain_severe", "normal_iop"],
  "temporal": ["chronic"],
  "tests": ["high_iop", "thin_cornea", "baseline_fields"],
  "exclusions": []
},

{
  "name": "Pigmentary Glaucoma",
  "route": "glaucoma",
  "req": ["pigment_dispersion"],
  "sup": ["high_iop", "krukenberg_spindle", "myopia", "young_age", "increased_cd", "field_defect", "halos", "blur", "transillumination_defects"],
  "con": ["hyperopia", "older_age", "pxf_material", "normal_iop"],
  "temporal": ["chronic"],
  "tests": ["pigment_dispersion", "high_iop"],
  "exclusions": []
},

{
  "name": "Pseudoexfoliation Glaucoma",
  "route": "glaucoma",
  "req": ["pxf_material"],
  "sup": ["high_iop", "older_age", "reduced_vision", "increased_cd", "field_defect", "cd_asymmetry", "gradual_blur"],
  "con": ["young_age", "pigment_dispersion", "normal_iop"],
  "temporal": ["chronic"],
  "tests": ["high_iop", "pxf_material"],
  "exclusions": []
},

{
  "name": "Neovascular Glaucoma",
  "route": "urgent",
  "req": ["rubeosis_iridis"],
  "sup": ["high_iop", "pain", "redness", "diabetes_history", "retinal_ischemia", "reduced_vision", "halos", "hypertension_history", "older_age", "corneal_edema"],
  "con": ["itching_dominant", "normal_iop"],
  "temporal": ["acute", "progressive"],
  "tests": ["gonioscopy_NVA", "IOP_very_high"],
  "urgent": true,
  "exclusions": []
}

];
