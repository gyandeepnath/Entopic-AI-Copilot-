/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — RETINA DOMAIN                                  */
/* 22 conditions.                                                   */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): supportive and       */
/* contradicting tokens were expanded to give each condition a       */
/* meaningful, DIFFERENTIATING evidence profile, and dead tokens     */
/* (ones no exam input produces, e.g. "gradual_progression",         */
/* "painless", "asymptomatic") were replaced with reachable          */
/* equivalents. Required tokens are unchanged (routing/behaviour      */
/* preserved). Founder to verify the added tokens clinically.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_RETINA = [

{
  "name": "Posterior Vitreous Detachment (PVD)",
  "route": "retina",
  "req": ["floaters"],
  "sup": ["flashes", "sudden_onset", "age_related", "dark_spots"],
  "con": ["field_loss", "sudden_vision_loss", "reduced_vision"],
  "temporal": ["acute"],
  "tests": ["pvd_weiss_ring"],
  "exclusions": []
},

{
  "name": "Retinal Tear",
  "route": "urgent",
  "req": ["flashes"],
  "sup": ["floaters", "sudden_onset", "dark_spots", "sudden_floaters"],
  "con": ["gradual_onset"],
  "temporal": ["acute"],
  "tests": ["retinal_break"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Retinal Detachment",
  "route": "urgent",
  "req": ["field_loss"],
  "sup": ["flashes", "floaters", "curtain_vision", "sudden_onset", "peripheral_field_loss", "reduced_vision"],
  "con": ["gradual_onset"],
  "temporal": ["acute"],
  "tests": ["retinal_detachment_partial"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Age-related Macular Degeneration (Dry)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["difficulty_reading", "older_age", "reduced_contrast", "night_blindness", "central_scotoma"],
  "con": ["sudden_vision_loss", "distortion", "young_age"],
  "temporal": ["chronic"],
  "tests": ["drusen_medium_63_125_m", "rpe_changes"],
  "exclusions": []
},

{
  "name": "Age-related Macular Degeneration (Wet)",
  "route": "urgent",
  "req": ["distortion"],
  "sup": ["central_blur", "rapid_change", "reduced_vision", "central_scotoma", "older_age"],
  "con": ["gradual_onset", "young_age"],
  "temporal": ["acute"],
  "tests": ["CNVM", "subretinal_fluid"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Diabetic Retinopathy",
  "route": "retina",
  "req": ["blur"],
  "sup": ["diabetes_history", "floaters", "distortion", "reduced_vision"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["microaneurysms", "hemorrhages"],
  "exclusions": []
},

{
  "name": "Central Serous Chorioretinopathy",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "micropsia", "stress_history", "reduced_contrast"],
  "con": ["older_age", "night_blindness"],
  "temporal": ["acute"],
  "tests": ["subretinal_fluid"],
  "exclusions": []
},

{
  "name": "Central Retinal Artery Occlusion (CRAO)",
  "route": "urgent",
  "req": ["sudden_vision_loss"],
  "sup": ["reduced_vision", "older_age", "hypertension_history", "cherry_red_spot"],
  "con": ["pain_severe", "gradual_onset"],
  "temporal": ["acute"],
  "tests": ["cherry_red_spot"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Central Retinal Vein Occlusion (CRVO)",
  "route": "retina",
  "req": ["blur"],
  "sup": ["sudden_onset", "reduced_vision", "distortion", "older_age", "hypertension_history"],
  "con": ["pain"],
  "temporal": ["acute"],
  "tests": ["dilated_tortuous_veins", "hemorrhages"],
  "exclusions": []
},

{
  "name": "Macular Hole",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "central_scotoma", "micropsia", "older_age"],
  "con": ["sudden_vision_loss", "peripheral_field_loss"],
  "temporal": ["gradual"],
  "tests": ["macular_hole"],
  "exclusions": []
},

{
  "name": "Epiretinal Membrane (ERM)",
  "route": "retina",
  "req": ["distortion"],
  "sup": ["blur", "reduced_vision", "micropsia", "central_blur"],
  "con": ["sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["erm_macular_pucker"],
  "exclusions": []
},

{
  "name": "Cystoid Macular Edema (CME)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["post_surgery", "distortion", "reduced_vision"],
  "con": [],
  "temporal": ["subacute"],
  "tests": ["cystic_spaces", "OCT_edema"],
  "exclusions": []
},

{
  "name": "Macular Edema (General)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "reduced_vision", "diabetes_history"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["retinal_thickening"],
  "exclusions": []
},

{
  "name": "Vitreous Hemorrhage",
  "route": "retina",
  "req": ["sudden_floaters"],
  "sup": ["blur", "dark_spots", "vision_hazy", "reduced_vision", "diabetes_history"],
  "con": ["pain"],
  "temporal": ["acute"],
  "tests": ["floaters"],
  "exclusions": []
},

{
  "name": "Retinitis Pigmentosa",
  "route": "retina",
  "req": ["night_blindness"],
  "sup": ["peripheral_field_loss", "tunnel_vision", "family_history", "reduced_contrast"],
  "con": ["sudden_onset", "central_scotoma"],
  "temporal": ["progressive"],
  "tests": ["bone_spicules", "arteriolar_narrowing"],
  "exclusions": []
},

{
  "name": "Hypertensive Retinopathy",
  "route": "retina",
  "req": ["arteriolar_changes"],
  "sup": ["hypertension_history", "blur", "cotton_wool_spots", "distortion"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["av_nicking", "cotton_wool_spots"],
  "exclusions": []
},

{
  "name": "Branch Retinal Vein Occlusion (BRVO)",
  "route": "retina",
  "req": ["sectoral_blur"],
  "sup": ["sudden_onset", "reduced_vision", "hypertension_history", "distortion"],
  "con": ["pain"],
  "temporal": ["acute"],
  "tests": ["sectoral_hemorrhage"],
  "exclusions": []
},

{
  "name": "Lattice Degeneration",
  "route": "retina",
  "req": ["peripheral_degeneration"],
  "sup": ["risk_detachment", "myopia", "floaters"],
  "con": ["reduced_vision", "central_blur"],
  "temporal": ["chronic"],
  "tests": ["lattice_degeneration"],
  "exclusions": []
},

{
  "name": "Choroidal Nevus",
  "route": "retina",
  "req": ["pigmented_lesion"],
  "sup": ["older_age"],
  "con": ["elevated_mass", "reduced_vision", "field_loss"],
  "temporal": ["stable"],
  "tests": ["choroidal_nevus_flat"],
  "exclusions": []
},

{
  "name": "Choroidal Melanoma",
  "route": "urgent",
  "req": ["elevated_mass"],
  "sup": ["blur", "visual_disturbance", "pigmented_lesion", "reduced_vision", "field_loss"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["elevated_lesion", "subretinal_fluid"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Macular Telangiectasia",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "gradual", "reduced_contrast", "central_scotoma"],
  "con": ["sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["dilated_tortuous_veins"],
  "exclusions": []
},

{
  "name": "Central Retinal Artery Occlusion (Transient / Amaurosis Fugax)",
  "route": "urgent",
  "req": ["transient_vision_loss"],
  "sup": ["older_age", "hypertension_history", "sudden_onset"],
  "con": ["reduced_vision"],
  "temporal": ["episodic"],
  "tests": ["vascular_insufficiency"],
  "urgent": true,
  "exclusions": []
}

];
