/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — REFRACTIVE DOMAIN                              */
/* 5 conditions.                                                    */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): refractive errors    */
/* are defined as much by what they are NOT — normal corrected       */
/* acuity and the ABSENCE of pathology — so each carries a rich set  */
/* of contradicting red-flags (reduced BCVA, distortion, field loss, */
/* pain, floaters) that correctly downrank a "just needs glasses"    */
/* call the moment real pathology appears. Required tokens unchanged.*/
/* Founder to verify.                                                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_REFRACTIVE = [

{
  "name": "Myopia",
  "route": "refractive",
  "req": ["distance_blur"],
  "sup": ["clear_near", "squinting", "better_near", "young_age", "family_history", "worse_distance", "improves_with_correction", "headache", "night_blindness"],
  "con": ["near_blur", "reduced_vision", "distortion", "field_loss", "floaters", "pain", "redness"],
  "temporal": ["chronic", "progressive"],
  "tests": ["minus_acceptance", "improves_with_minus"],
  "exclusions": []
},

{
  "name": "Hyperopia",
  "route": "refractive",
  "req": ["near_blur"],
  "sup": ["eye_strain", "headache", "difficulty_near", "asthenopia", "worse_evening", "improves_with_correction", "young_age", "headache_near"],
  "con": ["reduced_vision", "distortion", "field_loss", "floaters", "pain", "redness", "night_blindness"],
  "temporal": ["chronic"],
  "tests": ["plus_acceptance"],
  "exclusions": []
},

{
  "name": "Astigmatism",
  "route": "refractive",
  "req": ["variable_blur"],
  "sup": ["distortion", "shadowing", "ghosting", "squinting", "headache", "eye_strain", "asthenopia", "improves_with_correction"],
  "con": ["reduced_vision", "field_loss", "floaters", "pain", "redness", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["cylinder_needed"],
  "exclusions": []
},

{
  "name": "Presbyopia",
  "route": "refractive",
  "req": ["near_blur"],
  "sup": ["age_over_40", "holding_far", "difficulty_reading", "headache_near", "difficulty_reading", "worse_evening", "improves_with_correction", "older_age"],
  "con": ["distance_blur", "reduced_vision", "distortion", "field_loss", "young_age", "floaters"],
  "temporal": ["progressive"],
  "tests": ["add_required"],
  "exclusions": []
},

{
  "name": "Anisometropia",
  "route": "refractive",
  "req": ["unequal_refractive_error"],
  "sup": ["unequal_vision", "suppression", "asthenopia", "headache", "family_history", "young_age", "difficulty_reading"],
  "con": ["reduced_vision", "distortion", "field_loss", "pain", "redness"],
  "temporal": ["chronic"],
  "tests": ["refraction_difference"],
  "exclusions": []
}

];
