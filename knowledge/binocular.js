/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — BINOCULAR VISION DOMAIN                        */
/* 10 conditions — DO NOT MODIFY                                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_BINOCULAR = [

{
  "name": "Convergence Insufficiency",
  "route": "binocular",
  "req": ["near_strain"],
  "sup": ["headache_near", "difficulty_reading", "double_vision_near", "fatigue", "losing_place_reading"],
  "con": ["distance_diplopia", "constant_deviation"],
  "temporal": ["chronic"],
  "tests": ["NPC_receded", "exo_near", "reduced_PFV"],
  "exclusions": ["cranial_nerve_palsy"]
},

{
  "name": "Convergence Excess",
  "route": "binocular",
  "req": ["eso_near"],
  "sup": ["blur_near", "headache", "eye_strain"],
  "con": ["distance_symptoms"],
  "temporal": ["chronic"],
  "tests": ["eso_deviation_near", "high_ACA_ratio"],
  "exclusions": []
},

{
  "name": "Divergence Insufficiency",
  "route": "binocular",
  "req": ["distance_diplopia"],
  "sup": ["eso_distance", "worse_distance"],
  "con": ["near_symptoms"],
  "temporal": ["chronic"],
  "tests": ["eso_distance_more"],
  "exclusions": ["sixth_cranial_nerve_palsy"]
},

{
  "name": "Divergence Excess",
  "route": "binocular",
  "req": ["exo_distance"],
  "sup": ["intermittent_diplopia", "closing_one_eye"],
  "con": [],
  "temporal": ["intermittent"],
  "tests": ["exo_distance_more"],
  "exclusions": []
},

{
  "name": "Accommodative Insufficiency",
  "route": "binocular",
  "req": ["blur_near"],
  "sup": ["difficulty_focusing", "fatigue", "reduced_amplitude", "reading_difficulty"],
  "con": ["distance_blur"],
  "temporal": ["chronic"],
  "tests": ["low_amplitude", "lag_accommodation"],
  "exclusions": []
},

{
  "name": "Accommodative Excess",
  "route": "binocular",
  "req": ["difficulty_relaxing_focus"],
  "sup": ["variable_blur", "headache", "spasm"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["lead_of_accommodation"],
  "exclusions": []
},

{
  "name": "Accommodative Infacility",
  "route": "binocular",
  "req": ["difficulty_focus_change"],
  "sup": ["slow_focus_shift", "fatigue"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["reduced_flipper_rate"],
  "exclusions": []
},

{
  "name": "Fusional Vergence Dysfunction",
  "route": "binocular",
  "req": ["eye_strain"],
  "sup": ["difficulty_sustaining_focus", "headache", "reduced_stamina"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["reduced_vergence_ranges"],
  "exclusions": []
},

{
  "name": "Intermittent Exotropia",
  "route": "binocular",
  "req": ["intermittent_eye_out"],
  "sup": ["closing_one_eye", "distance_problem"],
  "con": [],
  "temporal": ["intermittent"],
  "tests": ["exo_tropia"],
  "exclusions": []
},

{
  "name": "Esotropia",
  "route": "binocular",
  "req": ["eye_inward"],
  "sup": ["constant_deviation", "diplopia"],
  "con": [],
  "temporal": ["constant"],
  "tests": ["eso_tropia"],
  "exclusions": []
}

];
