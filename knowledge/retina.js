/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — RETINA DOMAIN                                  */
/* 22 conditions — DO NOT MODIFY                                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_RETINA = [

{
  "name": "Posterior Vitreous Detachment (PVD)",
  "route": "retina",
  "req": ["floaters"],
  "sup": ["flashes", "sudden_onset", "age_related"],
  "con": ["field_loss"],
  "temporal": ["acute"],
  "tests": ["vitreous_separation", "weiss_ring"],
  "exclusions": []
},

{
  "name": "Retinal Tear",
  "route": "urgent",
  "req": ["flashes"],
  "sup": ["floaters", "sudden_onset"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["retinal_break"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Retinal Detachment",
  "route": "urgent",
  "req": ["field_loss"],
  "sup": ["flashes", "floaters", "curtain_vision"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["detached_retina"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Age-related Macular Degeneration (Dry)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["gradual_progression", "difficulty_reading"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["drusen", "RPE_changes"],
  "exclusions": []
},

{
  "name": "Age-related Macular Degeneration (Wet)",
  "route": "urgent",
  "req": ["distortion"],
  "sup": ["central_blur", "rapid_change"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["CNVM", "subretinal_fluid"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Diabetic Retinopathy",
  "route": "retina",
  "req": ["blur"],
  "sup": ["diabetes_history", "gradual_progression"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["microaneurysm", "hemorrhages"],
  "exclusions": []
},

{
  "name": "Central Serous Chorioretinopathy",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "micropsia", "stress_history"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["subretinal_fluid"],
  "exclusions": []
},

{
  "name": "Central Retinal Artery Occlusion (CRAO)",
  "route": "urgent",
  "req": ["sudden_vision_loss"],
  "sup": ["painless", "severe_loss"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["cherry_red_spot"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Central Retinal Vein Occlusion (CRVO)",
  "route": "retina",
  "req": ["blur"],
  "sup": ["sudden_onset", "moderate_loss"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["dilated_veins", "hemorrhages"],
  "exclusions": []
},

{
  "name": "Macular Hole",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["distortion", "central_scotoma"],
  "con": [],
  "temporal": ["gradual"],
  "tests": ["foveal_defect"],
  "exclusions": []
},

{
  "name": "Epiretinal Membrane (ERM)",
  "route": "retina",
  "req": ["distortion"],
  "sup": ["blur", "gradual_progression", "metamorphopsia"],
  "con": ["sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["macular_pucker", "retinal_wrinkling"],
  "exclusions": []
},

{
  "name": "Cystoid Macular Edema (CME)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["post_surgery", "distortion"],
  "con": [],
  "temporal": ["subacute"],
  "tests": ["cystic_spaces", "OCT_edema"],
  "exclusions": []
},

{
  "name": "Macular Edema (General)",
  "route": "retina",
  "req": ["central_blur"],
  "sup": ["thickened_retina", "reduced_acuity"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["retinal_thickening"],
  "exclusions": []
},

{
  "name": "Vitreous Hemorrhage",
  "route": "retina",
  "req": ["sudden_floaters"],
  "sup": ["blur", "dark_spots", "vision_hazy"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["vitreous_opacity"],
  "exclusions": []
},

{
  "name": "Retinitis Pigmentosa",
  "route": "retina",
  "req": ["night_blindness"],
  "sup": ["peripheral_field_loss", "tunnel_vision", "family_history"],
  "con": ["acute_onset"],
  "temporal": ["progressive"],
  "tests": ["bone_spicules", "attenuated_vessels"],
  "exclusions": []
},

{
  "name": "Hypertensive Retinopathy",
  "route": "retina",
  "req": ["arteriolar_changes"],
  "sup": ["hypertension_history", "blur"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["AV_nicking", "cotton_wool_spots"],
  "exclusions": []
},

{
  "name": "Branch Retinal Vein Occlusion (BRVO)",
  "route": "retina",
  "req": ["sectoral_blur"],
  "sup": ["sudden_onset", "localized_vision_loss"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["sectoral_hemorrhage"],
  "exclusions": []
},

{
  "name": "Lattice Degeneration",
  "route": "retina",
  "req": ["peripheral_degeneration"],
  "sup": ["asymptomatic", "risk_detachment"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["lattice_pattern"],
  "exclusions": []
},

{
  "name": "Choroidal Nevus",
  "route": "retina",
  "req": ["pigmented_lesion"],
  "sup": ["asymptomatic"],
  "con": [],
  "temporal": ["stable"],
  "tests": ["flat_pigmented_area"],
  "exclusions": []
},

{
  "name": "Choroidal Melanoma",
  "route": "urgent",
  "req": ["elevated_mass"],
  "sup": ["blur", "visual_disturbance"],
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
  "sup": ["distortion", "gradual"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["telangiectatic_vessels"],
  "exclusions": []
},

{
  "name": "Central Retinal Artery Occlusion (Transient / Amaurosis Fugax)",
  "route": "urgent",
  "req": ["transient_vision_loss"],
  "sup": ["sudden", "recovery"],
  "con": [],
  "temporal": ["episodic"],
  "tests": ["vascular_insufficiency"],
  "urgent": true,
  "exclusions": []
}

];
