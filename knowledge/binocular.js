/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — BINOCULAR VISION DOMAIN                        */
/* 10 conditions.                                                   */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): each functional      */
/* binocular/accommodative condition given more supportive symptoms  */
/* and contradicting features — rival BV patterns and pathology      */
/* red-flags (reduced acuity, constant deviation) that argue against */
/* a benign functional diagnosis. Dead tokens replaced. Required     */
/* tokens unchanged. Founder to verify.                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_BINOCULAR = [

{
  "name": "Convergence Insufficiency",
  "route": "binocular",
  "req": ["near_strain"],
  "sup": ["headache_near", "difficulty_reading", "double_vision_near", "fatigue", "losing_place_reading", "worse_evening", "asthenopia", "eye_strain", "blur_near"],
  "con": ["distance_diplopia", "constant_deviation", "reduced_vision", "eso_near"],
  "temporal": ["chronic"],
  "tests": ["NPC_receded", "exo_near", "reduced_PFV"],
  "exclusions": ["cranial_nerve_palsy"]
},

{
  "name": "Convergence Excess",
  "route": "binocular",
  "req": ["eso_near"],
  "sup": ["blur_near", "headache", "eye_strain", "near_strain", "asthenopia", "worse_evening", "difficulty_reading", "hyperopia"],
  "con": ["exo_near", "distance_diplopia", "reduced_vision", "constant_deviation"],
  "temporal": ["chronic"],
  "tests": ["eso_deviation_near", "high_ACA_ratio"],
  "exclusions": []
},

{
  "name": "Divergence Insufficiency",
  "route": "binocular",
  "req": ["distance_diplopia"],
  "sup": ["eso_distance", "worse_distance", "horizontal_diplopia", "headache", "older_age", "intermittent_diplopia"],
  "con": ["exo_distance", "reduced_vision", "near_strain", "constant_deviation"],
  "temporal": ["chronic"],
  "tests": ["eso_distance_more"],
  "exclusions": ["sixth_cranial_nerve_palsy"]
},

{
  "name": "Divergence Excess",
  "route": "binocular",
  "req": ["exo_distance"],
  "sup": ["intermittent_diplopia", "closing_one_eye", "worse_distance", "asthenopia", "headache", "distance_problem", "squinting"],
  "con": ["eso_distance", "reduced_vision", "constant_deviation", "near_strain"],
  "temporal": ["intermittent"],
  "tests": ["exo_distance_more"],
  "exclusions": []
},

{
  "name": "Accommodative Insufficiency",
  "route": "binocular",
  "req": ["blur_near"],
  "sup": ["difficulty_focusing", "fatigue", "reduced_amplitude", "reading_difficulty", "headache_near", "asthenopia", "worse_evening", "near_strain"],
  "con": ["distance_blur", "reduced_vision", "distortion", "age_over_40"],
  "temporal": ["chronic"],
  "tests": ["low_amplitude", "lag_accommodation"],
  "exclusions": []
},

{
  "name": "Accommodative Excess",
  "route": "binocular",
  "req": ["difficulty_relaxing_focus"],
  "sup": ["variable_blur", "headache", "spasm", "near_strain", "fatigue", "worse_evening", "distance_blur", "eye_strain"],
  "con": ["reduced_vision", "distortion", "older_age", "field_loss"],
  "temporal": ["variable"],
  "tests": ["lead_of_accommodation"],
  "exclusions": []
},

{
  "name": "Accommodative Infacility",
  "route": "binocular",
  "req": ["difficulty_focus_change"],
  "sup": ["slow_focus_shift", "fatigue", "difficulty_focusing", "headache", "eye_strain", "near_strain", "worse_evening"],
  "con": ["reduced_vision", "constant_deviation", "distortion"],
  "temporal": ["variable"],
  "tests": ["reduced_flipper_rate"],
  "exclusions": []
},

{
  "name": "Fusional Vergence Dysfunction",
  "route": "binocular",
  "req": ["eye_strain"],
  "sup": ["difficulty_sustaining_focus", "headache", "reduced_stamina", "asthenopia", "fatigue", "worse_evening", "double_vision_near"],
  "con": ["reduced_vision", "constant_deviation", "distortion"],
  "temporal": ["chronic"],
  "tests": ["reduced_vergence_ranges"],
  "exclusions": []
},

{
  "name": "Intermittent Exotropia",
  "route": "binocular",
  "req": ["intermittent_eye_out"],
  "sup": ["closing_one_eye", "distance_problem", "worse_distance", "squinting", "suppression", "young_age", "asthenopia"],
  "con": ["constant_deviation", "reduced_vision", "eye_inward"],
  "temporal": ["intermittent"],
  "tests": ["exo_tropia"],
  "exclusions": []
},

{
  "name": "Esotropia",
  "route": "binocular",
  "req": ["eye_inward"],
  "sup": ["constant_deviation", "diplopia", "suppression", "young_age", "hyperopia", "closing_one_eye", "unequal_vision"],
  "con": ["intermittent_eye_out", "exo_distance", "reduced_vision"],
  "temporal": ["constant"],
  "tests": ["eso_tropia"],
  "exclusions": []
}

];
