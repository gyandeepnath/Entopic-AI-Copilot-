/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — CORNEAL DOMAIN                                 */
/* 25 conditions.                                                   */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): supportive/          */
/* contradicting tokens expanded for differentiation; dead tokens    */
/* (e.g. "skin_rash", "recurrent_pain", "non_healing_epithelium",    */
/* "blisters_epithelium", "protrusion") replaced with reachable       */
/* equivalents. Required tokens unchanged. Founder to verify.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_CORNEAL = [

{
  "name": "Corneal Abrasion",
  "route": "anterior",
  "req": ["pain_acute"],
  "sup": ["foreign_body_sensation", "watering", "photophobia_mild", "trauma_history", "recent_eye_trauma"],
  "con": ["gradual_onset", "itching_dominant"],
  "temporal": ["acute"],
  "tests": ["fluorescein_positive", "epithelial_defect"],
  "exclusions": ["dry_eye", "allergic_conjunctivitis"]
},

{
  "name": "Microbial Keratitis",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["photophobia", "redness", "reduced_vision", "contact_lens_use"],
  "con": ["itching_dominant", "gradual_onset"],
  "temporal": ["acute"],
  "tests": ["stromal_infiltrate", "epithelial_defect", "anterior_chamber_reaction"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Herpes Simplex Keratitis",
  "route": "anterior",
  "req": ["pain_moderate"],
  "sup": ["photophobia", "watering", "recurrent_episode", "reduced_corneal_sensation"],
  "con": ["purulent_discharge", "itching_dominant"],
  "temporal": ["recurrent"],
  "tests": ["dendritic_ulcer"],
  "exclusions": []
},

{
  "name": "Herpes Zoster Ophthalmicus (Corneal)",
  "route": "anterior",
  "req": ["pain_severe"],
  "sup": ["photophobia", "reduced_corneal_sensation", "older_age", "redness"],
  "con": ["itching_dominant"],
  "temporal": ["acute"],
  "tests": ["dermatomal_rash", "corneal_involvement"],
  "exclusions": []
},

{
  "name": "Corneal Ulcer",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["photophobia", "reduced_vision", "redness", "contact_lens_use"],
  "con": ["itching_dominant"],
  "temporal": ["acute"],
  "tests": ["epithelial_defect", "stromal_infiltrate", "fluorescein_positive"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Corneal Edema",
  "route": "anterior",
  "req": ["blur"],
  "sup": ["halos", "morning_blur", "glare", "reduced_vision"],
  "con": ["itching_dominant", "night_blindness"],
  "temporal": ["gradual"],
  "tests": ["stromal_swelling", "descemet_folds"],
  "exclusions": []
},

{
  "name": "Recurrent Corneal Erosion",
  "route": "anterior",
  "req": ["pain_morning"],
  "sup": ["recurrent_episode", "watering", "foreign_body_sensation", "photophobia_mild"],
  "con": ["gradual_blur"],
  "temporal": ["recurrent"],
  "tests": ["epithelial_instability"],
  "exclusions": []
},

{
  "name": "Keratoconus",
  "route": "anterior",
  "req": ["irregular_astigmatism"],
  "sup": ["progressive_blur", "glare", "ghosting", "young_age"],
  "con": ["pain_severe", "redness"],
  "temporal": ["progressive"],
  "tests": ["topography_abnormal", "corneal_thinning"],
  "exclusions": []
},

{
  "name": "Fuchs Endothelial Dystrophy",
  "route": "anterior",
  "req": ["morning_blur"],
  "sup": ["glare", "halos", "older_age", "reduced_vision"],
  "con": ["pain_severe", "redness"],
  "temporal": ["progressive"],
  "tests": ["guttata"],
  "exclusions": []
},

{
  "name": "Contact Lens Related Keratitis",
  "route": "anterior",
  "req": ["contact_lens_use"],
  "sup": ["pain", "redness", "photophobia", "reduced_wear_time"],
  "con": ["itching_dominant"],
  "temporal": ["acute"],
  "tests": ["corneal_staining"],
  "exclusions": []
},

{
  "name": "Band Keratopathy",
  "route": "anterior",
  "req": ["corneal_opacity_band"],
  "sup": ["chronic_irritation", "reduced_vision", "foreign_body_sensation"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["calcium_deposition", "interpalpebral_band"],
  "exclusions": []
},

{
  "name": "Arcus Senilis",
  "route": "anterior",
  "req": ["peripheral_corneal_ring"],
  "sup": ["age_related", "older_age"],
  "con": ["pain", "reduced_vision"],
  "temporal": ["chronic"],
  "tests": ["lipid_ring"],
  "exclusions": []
},

{
  "name": "Corneal Scar",
  "route": "anterior",
  "req": ["corneal_opacity"],
  "sup": ["reduced_vision", "history_trauma_or_infection", "glare"],
  "con": ["pain_acute", "redness"],
  "temporal": ["chronic"],
  "tests": ["opacity_localized"],
  "exclusions": []
},

{
  "name": "Marginal Keratitis",
  "route": "anterior",
  "req": ["peripheral_infiltrate"],
  "sup": ["pain", "redness", "blepharitis_history", "foreign_body_sensation"],
  "con": ["reduced_vision"],
  "temporal": ["subacute"],
  "tests": ["peripheral_ulceration"],
  "exclusions": []
},

{
  "name": "Phlyctenular Keratoconjunctivitis",
  "route": "anterior",
  "req": ["limbal_nodule"],
  "sup": ["photophobia", "watering", "pain", "young_age"],
  "con": ["purulent_discharge"],
  "temporal": ["recurrent"],
  "tests": ["nodular_lesion"],
  "exclusions": []
},

{
  "name": "Interstitial Keratitis",
  "route": "anterior",
  "req": ["stromal_inflammation"],
  "sup": ["pain", "photophobia", "reduced_vision", "redness"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["stromal_opacity"],
  "exclusions": []
},

{
  "name": "Neurotrophic Keratitis",
  "route": "anterior",
  "req": ["reduced_corneal_sensation"],
  "sup": ["reduced_vision", "chronic_irritation", "redness"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["corneal_sensitivity_test"],
  "exclusions": []
},

{
  "name": "Bullous Keratopathy",
  "route": "anterior",
  "req": ["corneal_edema"],
  "sup": ["pain", "reduced_vision", "morning_blur", "glare"],
  "con": ["itching_dominant"],
  "temporal": ["chronic"],
  "tests": ["epithelial_bullae"],
  "exclusions": []
},

{
  "name": "Corneal Neovascularization",
  "route": "anterior",
  "req": ["new_vessels_cornea"],
  "sup": ["chronic_irritation", "contact_lens_history", "reduced_vision"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["vascular_ingrowth"],
  "exclusions": []
},

{
  "name": "Pellucid Marginal Degeneration",
  "route": "anterior",
  "req": ["inferior_corneal_thinning"],
  "sup": ["irregular_astigmatism", "blur", "progressive_blur"],
  "con": ["pain_severe", "redness"],
  "temporal": ["progressive"],
  "tests": ["topography_pattern"],
  "exclusions": []
},

{
  "name": "Keratoglobus",
  "route": "anterior",
  "req": ["generalized_corneal_thinning"],
  "sup": ["blur", "irregular_astigmatism", "progressive_blur"],
  "con": ["pain_severe", "redness"],
  "temporal": ["chronic"],
  "tests": ["global_thinning"],
  "exclusions": []
},

{
  "name": "Salzmann Nodular Degeneration",
  "route": "anterior",
  "req": ["subepithelial_nodules"],
  "sup": ["blur", "foreign_body_sensation", "glare"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["nodular_elevation"],
  "exclusions": []
},

{
  "name": "Thygeson Superficial Punctate Keratitis",
  "route": "anterior",
  "req": ["punctate_epithelial_lesions"],
  "sup": ["photophobia", "foreign_body_sensation", "watering", "recurrent_episode", "burning", "irritation"],
  "con": ["purulent_discharge", "reduced_vision", "pain_severe", "redness"],
  "temporal": ["recurrent", "chronic"],
  "tests": ["punctate_staining"],
  "exclusions": []
},

{
  "name": "Superficial Punctate Keratitis",
  "route": "anterior",
  "req": ["punctate_staining"],
  "sup": ["dryness", "irritation", "foreign_body_sensation", "photophobia_mild"],
  "con": ["purulent_discharge"],
  "temporal": ["acute"],
  "tests": ["fluorescein_multiple_spots"],
  "exclusions": []
},

{
  "name": "Exposure Keratitis",
  "route": "anterior",
  "req": ["corneal_exposure"],
  "sup": ["dryness", "irritation", "incomplete_blink", "foreign_body_sensation"],
  "con": ["itching_dominant"],
  "temporal": ["chronic"],
  "tests": ["inferior_staining"],
  "exclusions": []
}

];
