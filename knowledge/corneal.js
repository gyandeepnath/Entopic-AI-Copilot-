/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — CORNEAL DOMAIN                                 */
/* 25 conditions — DO NOT MODIFY                                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_CORNEAL = [

{
  "name": "Corneal Abrasion",
  "route": "anterior",
  "req": ["pain_acute"],
  "sup": ["foreign_body_sensation", "watering", "photophobia_mild", "trauma_history"],
  "con": ["chronic_course"],
  "temporal": ["acute"],
  "tests": ["fluorescein_positive", "epithelial_defect"],
  "exclusions": ["dry_eye", "allergic_conjunctivitis"]
},

{
  "name": "Microbial Keratitis",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["photophobia", "redness", "reduced_vision", "contact_lens_use"],
  "con": [],
  "temporal": ["acute", "rapid_progression"],
  "tests": ["corneal_infiltrate", "fluorescein_ulcer", "anterior_chamber_reaction"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Herpes Simplex Keratitis",
  "route": "anterior",
  "req": ["pain_moderate"],
  "sup": ["photophobia", "watering", "recurrent_episode"],
  "con": ["purulent_discharge"],
  "temporal": ["recurrent"],
  "tests": ["dendritic_ulcer", "fluorescein_branching"],
  "exclusions": []
},

{
  "name": "Herpes Zoster Ophthalmicus (Corneal)",
  "route": "anterior",
  "req": ["pain_severe"],
  "sup": ["skin_rash", "photophobia", "reduced_sensation"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["dermatomal_rash", "corneal_involvement"],
  "exclusions": []
},

{
  "name": "Corneal Ulcer",
  "route": "urgent",
  "req": ["pain_severe"],
  "sup": ["photophobia", "reduced_vision", "redness"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["epithelial_defect", "stromal_infiltrate", "fluorescein_positive"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Corneal Edema",
  "route": "anterior",
  "req": ["blur"],
  "sup": ["halos", "morning_blur", "glare"],
  "con": ["itching_dominant"],
  "temporal": ["gradual"],
  "tests": ["stromal_swelling", "descemet_folds"],
  "exclusions": []
},

{
  "name": "Recurrent Corneal Erosion",
  "route": "anterior",
  "req": ["pain_morning"],
  "sup": ["recurrent_pain", "watering", "foreign_body_sensation"],
  "con": [],
  "temporal": ["recurrent"],
  "tests": ["epithelial_instability"],
  "exclusions": []
},

{
  "name": "Keratoconus",
  "route": "anterior",
  "req": ["irregular_astigmatism"],
  "sup": ["progressive_blur", "glare", "ghosting"],
  "con": ["pain_severe"],
  "temporal": ["progressive"],
  "tests": ["topography_abnormal", "corneal_thinning"],
  "exclusions": []
},

{
  "name": "Fuchs Endothelial Dystrophy",
  "route": "anterior",
  "req": ["morning_blur"],
  "sup": ["glare", "halos"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["guttata", "endothelial_loss"],
  "exclusions": []
},

{
  "name": "Contact Lens Related Keratitis",
  "route": "anterior",
  "req": ["contact_lens_use"],
  "sup": ["pain", "redness", "photophobia"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["corneal_staining"],
  "exclusions": []
},

{
  "name": "Band Keratopathy",
  "route": "anterior",
  "req": ["corneal_opacity_band"],
  "sup": ["chronic_irritation", "reduced_vision"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["calcium_deposition", "interpalpebral_band"],
  "exclusions": []
},

{
  "name": "Arcus Senilis",
  "route": "anterior",
  "req": ["peripheral_corneal_ring"],
  "sup": ["age_related"],
  "con": ["pain", "vision_loss"],
  "temporal": ["chronic"],
  "tests": ["lipid_ring"],
  "exclusions": []
},

{
  "name": "Corneal Scar",
  "route": "anterior",
  "req": ["corneal_opacity"],
  "sup": ["reduced_vision", "history_trauma_or_infection"],
  "con": ["pain_acute"],
  "temporal": ["chronic"],
  "tests": ["opacity_localized"],
  "exclusions": []
},

{
  "name": "Marginal Keratitis",
  "route": "anterior",
  "req": ["peripheral_infiltrate"],
  "sup": ["pain", "redness", "blepharitis_history"],
  "con": [],
  "temporal": ["subacute"],
  "tests": ["peripheral_ulceration"],
  "exclusions": []
},

{
  "name": "Phlyctenular Keratoconjunctivitis",
  "route": "anterior",
  "req": ["limbal_nodule"],
  "sup": ["photophobia", "watering", "pain"],
  "con": [],
  "temporal": ["recurrent"],
  "tests": ["nodular_lesion"],
  "exclusions": []
},

{
  "name": "Interstitial Keratitis",
  "route": "anterior",
  "req": ["stromal_inflammation"],
  "sup": ["pain", "photophobia", "reduced_vision"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["stromal_opacity"],
  "exclusions": []
},

{
  "name": "Neurotrophic Keratitis",
  "route": "anterior",
  "req": ["reduced_corneal_sensation"],
  "sup": ["non_healing_epithelium", "minimal_pain"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["corneal_sensitivity_test"],
  "exclusions": []
},

{
  "name": "Bullous Keratopathy",
  "route": "anterior",
  "req": ["corneal_edema"],
  "sup": ["pain", "blisters_epithelium", "reduced_vision"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["epithelial_bullae"],
  "exclusions": []
},

{
  "name": "Corneal Neovascularization",
  "route": "anterior",
  "req": ["new_vessels_cornea"],
  "sup": ["chronic_irritation", "contact_lens_history"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["vascular_ingrowth"],
  "exclusions": []
},

{
  "name": "Pellucid Marginal Degeneration",
  "route": "anterior",
  "req": ["inferior_corneal_thinning"],
  "sup": ["high_astigmatism", "blur"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["topography_pattern"],
  "exclusions": []
},

{
  "name": "Keratoglobus",
  "route": "anterior",
  "req": ["generalized_corneal_thinning"],
  "sup": ["protrusion", "blur"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["global_thinning"],
  "exclusions": []
},

{
  "name": "Salzmann Nodular Degeneration",
  "route": "anterior",
  "req": ["subepithelial_nodules"],
  "sup": ["irregular_surface", "blur"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["nodular_elevation"],
  "exclusions": []
},

{
  "name": "Thygeson Superficial Punctate Keratitis",
  "route": "anterior",
  "req": ["punctate_epithelial_lesions"],
  "sup": ["photophobia", "foreign_body_sensation", "minimal_redness"],
  "con": [],
  "temporal": ["recurrent"],
  "tests": ["punctate_staining"],
  "exclusions": []
},

{
  "name": "Superficial Punctate Keratitis",
  "route": "anterior",
  "req": ["punctate_staining"],
  "sup": ["dryness", "irritation"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["fluorescein_multiple_spots"],
  "exclusions": []
},

{
  "name": "Exposure Keratitis",
  "route": "anterior",
  "req": ["corneal_exposure"],
  "sup": ["dryness", "irritation", "incomplete_blink"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["inferior_staining"],
  "exclusions": []
}

];
