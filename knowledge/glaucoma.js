/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — GLAUCOMA DOMAIN                                */
/* 8 conditions — Added by system                                  */
/* ═══════════════════════════════════════════════════════════════ */

var KB_GLAUCOMA = [

{
  "name": "Primary Open Angle Glaucoma (POAG)",
  "route": "glaucoma",
  "req": ["field_defect"],
  "sup": ["high_iop", "increased_cd", "cd_asymmetry", "nrr_thinning", "disc_hemorrhage", "family_history"],
  "con": ["acute_pain", "shallow_ac"],
  "temporal": ["chronic", "progressive"],
  "tests": ["visual_field_defect", "RNFL_thinning", "optic_disc_change", "IOP_elevated"],
  "exclusions": ["acute_angle_closure"]
},

{
  "name": "Primary Angle Closure Glaucoma (PACG)",
  "route": "glaucoma",
  "req": ["shallow_ac"],
  "sup": ["high_iop", "narrow_angle", "hyperopia"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["gonioscopy_narrow", "IOP_elevated", "van_herick_narrow"],
  "exclusions": []
},

{
  "name": "Acute Angle Closure Crisis",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["halos", "redness", "nausea_vomiting", "reduced_vision", "mid_dilated_pupil"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["IOP_very_high", "shallow_ac", "corneal_edema"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Normal Tension Glaucoma (NTG)",
  "route": "glaucoma",
  "req": ["field_defect"],
  "sup": ["nrr_thinning", "disc_hemorrhage", "normal_iop"],
  "con": ["high_iop"],
  "temporal": ["chronic", "progressive"],
  "tests": ["visual_field_defect", "RNFL_thinning", "IOP_normal"],
  "exclusions": []
},

{
  "name": "Glaucoma Suspect / Ocular Hypertension",
  "route": "glaucoma",
  "req": ["high_iop"],
  "sup": ["family_history", "thin_cornea", "increased_cd"],
  "con": ["field_defect"],
  "temporal": ["chronic"],
  "tests": ["IOP_elevated", "pachymetry_thin", "baseline_fields"],
  "exclusions": []
},

{
  "name": "Pigmentary Glaucoma",
  "route": "glaucoma",
  "req": ["pigment_dispersion"],
  "sup": ["high_iop", "krukenberg_spindle", "myopia", "young_age"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["gonioscopy_pigment", "IOP_elevated"],
  "exclusions": []
},

{
  "name": "Pseudoexfoliation Glaucoma",
  "route": "glaucoma",
  "req": ["pxf_material"],
  "sup": ["high_iop", "older_age", "unilateral_asymmetric"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["IOP_elevated", "pxf_on_lens"],
  "exclusions": []
},

{
  "name": "Neovascular Glaucoma",
  "route": "urgent",
  "req": ["rubeosis_iridis"],
  "sup": ["high_iop", "pain", "redness", "diabetes_history", "retinal_ischemia"],
  "con": [],
  "temporal": ["acute", "progressive"],
  "tests": ["gonioscopy_NVA", "IOP_very_high"],
  "urgent": true,
  "exclusions": []
}

];
