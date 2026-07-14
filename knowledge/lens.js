/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — LENS DOMAIN                                    */
/* 8 conditions — Added by system                                  */
/* ═══════════════════════════════════════════════════════════════ */

var KB_LENS = [

{
  "name": "Nuclear Sclerotic Cataract",
  "route": "lens",
  "req": ["gradual_blur"],
  "sup": ["glare", "reduced_contrast", "gradual_blur", "older_age", "ghosting"],
  "con": ["sudden_onset"],
  "temporal": ["progressive"],
  "tests": ["nuclear_opacity", "LOCS_grading", "reduced_vision"],
  "exclusions": []
},

{
  "name": "Cortical Cataract",
  "route": "lens",
  "req": ["glare"],
  "sup": ["gradual_blur", "ghosting", "older_age"],
  "con": ["sudden_onset"],
  "temporal": ["progressive"],
  "tests": ["cortical_spokes", "LOCS_grading"],
  "exclusions": []
},

{
  "name": "Posterior Subcapsular Cataract (PSC)",
  "route": "lens",
  "req": ["near_blur"],
  "sup": ["glare", "difficulty_reading", "steroid_history", "young_age"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["PSC_opacity", "LOCS_grading", "near_blur"],
  "exclusions": []
},

{
  "name": "Traumatic Cataract",
  "route": "lens",
  "req": ["trauma_history"],
  "sup": ["blur", "reduced_vision", "reduced_vision"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["lens_opacity", "zonule_assessment"],
  "exclusions": []
},

{
  "name": "Congenital Cataract",
  "route": "lens",
  "req": ["leukocoria"],
  "sup": ["young_age", "family_history", "leukocoria"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["leukocoria", "lens_opacity"],
  "exclusions": []
},

{
  "name": "Drug-induced Cataract (Steroid)",
  "route": "lens",
  "req": ["steroid_history"],
  "sup": ["glare", "near_blur", "glare"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["PSC_opacity", "steroid_use_confirmed"],
  "exclusions": []
},

{
  "name": "Posterior Capsular Opacification (PCO)",
  "route": "lens",
  "req": ["post_cataract_surgery_blur"],
  "sup": ["glare", "reduced_vision", "post_surgery"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["capsule_opacity", "reduced_vision"],
  "exclusions": []
},

{
  "name": "Lens Subluxation / Dislocation",
  "route": "urgent",
  "req": ["lens_displacement"],
  "sup": ["ghosting", "fluctuating_blur", "family_history", "trauma_history"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["lens_decentration", "phacodonesis", "iridodonesis"],
  "urgent": true,
  "exclusions": []
}

];
