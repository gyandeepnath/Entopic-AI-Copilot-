/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — REFRACTIVE DOMAIN                              */
/* 5 conditions — DO NOT MODIFY                                    */
/* ═══════════════════════════════════════════════════════════════ */

var KB_REFRACTIVE = [

{
  "name": "Myopia",
  "route": "refractive",
  "req": ["distance_blur"],
  "sup": ["clear_near", "squinting", "better_near"],
  "con": ["near_blur"],
  "temporal": ["chronic"],
  "tests": ["minus_acceptance", "improves_with_minus"],
  "exclusions": []
},

{
  "name": "Hyperopia",
  "route": "refractive",
  "req": ["near_blur"],
  "sup": ["eye_strain", "headache", "difficulty_near"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["plus_acceptance"],
  "exclusions": []
},

{
  "name": "Astigmatism",
  "route": "refractive",
  "req": ["variable_blur"],
  "sup": ["distortion", "shadowing", "ghosting"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["cylinder_needed"],
  "exclusions": []
},

{
  "name": "Presbyopia",
  "route": "refractive",
  "req": ["near_blur"],
  "sup": ["age_over_40", "holding_far", "reading_difficulty"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["add_required"],
  "exclusions": []
},

{
  "name": "Anisometropia",
  "route": "refractive",
  "req": ["unequal_refractive_error"],
  "sup": ["unequal_vision", "suppression"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["refraction_difference"],
  "exclusions": []
}

];
