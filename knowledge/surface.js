/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — SURFACE & LIDS DOMAIN                          */
/* 30 conditions.                                                   */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): each condition given */
/* a deeper profile — relevant supportive symptoms/signs, and (for   */
/* the benign lid/conjunctival lesions) contradicting red-flags      */
/* (reduced vision, severe pain, distortion, proptosis) that argue   */
/* against a benign surface diagnosis. Dead tokens replaced.         */
/* Required tokens and exclusions unchanged. Founder to verify.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_SURFACE = [

{
  "name": "Dry Eye Disease - Evaporative (MGD)",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["burning", "fluctuating_blur", "worse_evening", "screen_use_exacerbation", "contact_lens_intolerance", "lid_margin_irregularity", "grittiness", "foreign_body_sensation", "redness"],
  "con": ["itching_dominant", "pain_severe", "purulent_discharge", "sudden_vision_loss", "reduced_vision"],
  "temporal": ["chronic", "progressive"],
  "tests": ["TBUT_reduced", "meibomian_gland_dropout", "thick_meibum", "tear_film_instability"],
  /* NEEDS_CLINICAL_REVIEW: "acute_keratitis" matches no condition in the KB. */
  "exclusions": ["allergic_conjunctivitis", "bacterial_conjunctivitis", "acute_keratitis"]
},

{
  "name": "Dry Eye Disease - Aqueous Deficient",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["foreign_body_sensation", "stringy_mucus", "grittiness", "reduced_tearing", "burning", "worse_evening", "fluctuating_blur", "screen_use_exacerbation", "older_age", "autoimmune_history"],
  "con": ["itching_dominant", "purulent_discharge", "pain_severe", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["schirmer_low", "tear_meniscus_low"],
  "exclusions": ["allergic_conjunctivitis"]
},

{
  "name": "Allergic Conjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["redness", "watering", "bilateral", "seasonal", "recurrent", "itching_lashes", "chemosis", "eczema_history", "asthma_atopy"],
  "con": ["pain_severe", "photophobia", "purulent_discharge", "reduced_vision"],
  "temporal": ["intermittent", "seasonal"],
  "tests": ["papillae_present", "conjunctival_edema"],
  "exclusions": ["uveitis", "keratitis"]
},

{
  "name": "Bacterial Conjunctivitis",
  "route": "surface",
  "req": ["purulent_discharge"],
  "sup": ["redness", "lid_sticking_morning", "morning_stickiness", "discharge", "irritation", "foreign_body_sensation"],
  "con": ["itching_dominant", "pain_severe", "reduced_vision", "photophobia"],
  "temporal": ["acute"],
  "tests": ["discharge_present"],
  "exclusions": ["allergic_conjunctivitis"]
},

{
  "name": "Viral Conjunctivitis",
  "route": "surface",
  "req": ["watery_discharge"],
  "sup": ["redness", "preauricular_node", "recent_viral_history", "watering", "bilateral", "foreign_body_sensation", "follicles"],
  "con": ["purulent_discharge", "pain_severe", "reduced_vision", "itching_dominant"],
  "temporal": ["acute"],
  "tests": ["follicles_present"],
  "exclusions": []
},

{
  "name": "Blepharitis - Anterior",
  "route": "surface",
  "req": ["lid_crusting"],
  "sup": ["burning", "redness", "morning_stickiness", "chronic_irritation", "foreign_body_sensation", "itching_lashes", "dryness", "lid_margin_irregularity"],
  "con": ["pain_severe", "reduced_vision", "sudden_vision_loss", "proptosis"],
  "temporal": ["chronic"],
  "tests": ["lash_debris", "collarettes"],
  "exclusions": []
},

{
  "name": "Blepharitis - Posterior (MGD)",
  "route": "surface",
  "req": ["meibomian_dysfunction"],
  "sup": ["dryness", "burning", "fluctuating_blur", "redness", "chronic_irritation", "worse_evening", "foreign_body_sensation", "lid_margin_irregularity"],
  "con": ["pain_severe", "reduced_vision", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["meibum_quality_poor"],
  "exclusions": []
},

{
  "name": "Demodex Blepharitis",
  "route": "surface",
  "req": ["cylindrical_dandruff"],
  "sup": ["itching_lashes", "chronic_irritation", "burning", "redness", "lid_crusting", "foreign_body_sensation", "madarosis"],
  "con": ["pain_severe", "reduced_vision", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["lash_mite_visualization"],
  "exclusions": []
},

{
  "name": "Vernal Keratoconjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["photophobia", "giant_papillae", "ropy_discharge", "young_age", "watering", "foreign_body_sensation", "seasonal", "asthma_atopy", "redness"],
  "con": ["purulent_discharge", "older_age", "reduced_vision"],
  "temporal": ["chronic", "seasonal"],
  "tests": ["cobblestone_papillae"],
  "exclusions": ["dry_eye"]
},

{
  "name": "Atopic Keratoconjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["chronic_redness", "eczema_history", "watering", "photophobia", "foreign_body_sensation", "asthma_atopy", "redness", "burning"],
  "con": ["purulent_discharge", "pain_severe", "seasonal"],
  "temporal": ["chronic"],
  "tests": ["skin_association"],
  "exclusions": []
},

{
  "name": "Pinguecula",
  "route": "surface",
  "req": ["localized_conjunctival_elevation"],
  "sup": ["dryness", "foreign_body_sensation", "redness", "irritation", "older_age"],
  "con": ["reduced_vision", "pain_severe", "distortion", "field_loss", "sudden_vision_loss", "photophobia"],
  "temporal": ["chronic"],
  "tests": ["slitlamp_localized"],
  "exclusions": []
},

{
  "name": "Pterygium",
  "route": "surface",
  "req": ["conjunctival_growth_cornea"],
  "sup": ["astigmatism", "irritation", "redness", "dryness", "foreign_body_sensation", "reduced_vision", "older_age"],
  "con": ["pain_severe", "sudden_vision_loss", "field_loss", "floaters"],
  "temporal": ["chronic"],
  "tests": ["slitlamp_progression"],
  "exclusions": []
},

{
  "name": "Subconjunctival Hemorrhage",
  "route": "surface",
  "req": ["red_patch"],
  "sup": ["sudden_onset", "trauma_history", "recent_eye_trauma", "hypertension_history", "older_age", "painless_lid_nodule"],
  "con": ["pain_severe", "reduced_vision", "distortion", "field_loss", "purulent_discharge", "photophobia"],
  "temporal": ["acute"],
  "tests": ["slitlamp_clear"],
  "exclusions": []
},

{
  "name": "Conjunctival Cyst",
  "route": "surface",
  "req": ["clear_bubble"],
  "sup": ["localized_conjunctival_elevation", "foreign_body_sensation", "irritation", "watering"],
  "con": ["reduced_vision", "pain_severe", "distortion", "field_loss", "sudden_vision_loss", "redness", "photophobia"],
  "temporal": ["chronic"],
  "tests": ["slitlamp_clear"],
  "exclusions": []
},

{
  "name": "Contact Lens Intolerance",
  "route": "surface",
  "req": ["contact_lens_discomfort"],
  "sup": ["dryness", "burning", "reduced_wear_time", "redness", "foreign_body_sensation", "contact_lens_use", "fluctuating_blur", "grittiness"],
  "con": ["pain_severe", "reduced_vision", "photophobia", "purulent_discharge"],
  "temporal": ["chronic"],
  "tests": ["history_positive"],
  "exclusions": []
},

{
  "name": "Angular Blepharitis",
  "route": "surface",
  "req": ["lateral_canthus_irritation"],
  "sup": ["redness", "burning", "cracking_skin", "chronic_irritation", "foreign_body_sensation", "watering", "itching_lashes"],
  "con": ["pain_severe", "reduced_vision", "proptosis", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["localized_inflammation"],
  "exclusions": []
},

{
  "name": "Hordeolum (Stye)",
  "route": "surface",
  "req": ["localized_lid_swelling"],
  "sup": ["pain", "tenderness", "redness", "localized_swelling", "chronic_irritation"],
  "con": ["proptosis", "restricted_motility", "reduced_vision", "diplopia", "pain_eye_movement", "fever"],
  "temporal": ["acute"],
  "tests": ["localized_pustule"],
  "exclusions": []
},

{
  "name": "Chalazion",
  "route": "surface",
  "req": ["painless_lid_nodule"],
  "sup": ["localized_swelling", "chronic_irritation", "meibomian_dysfunction", "redness"],
  "con": ["pain", "proptosis", "restricted_motility", "reduced_vision", "fever", "diplopia"],
  "temporal": ["chronic"],
  "tests": ["meibomian_blockage"],
  "exclusions": []
},

{
  "name": "Preseptal Cellulitis",
  "route": "surface",
  "req": ["lid_swelling_diffuse"],
  "sup": ["redness", "tenderness", "fever", "pain", "recent_eye_trauma", "localized_lid_swelling"],
  "con": ["proptosis", "restricted_motility", "pain_eye_movement", "diplopia", "reduced_vision"],
  "temporal": ["acute"],
  "tests": ["clinical_exam"],
  /* Resolved 2026-07-12: Orbital Cellulitis carries the correct-direction
     exclusion; preseptal con-tags orbital signs so they push its score down. */
  "exclusions": []
},

{
  "name": "Dacryocystitis",
  "route": "surface",
  "req": ["medial_canthus_swelling"],
  "sup": ["pain", "discharge", "watering", "redness", "tenderness", "watering", "recurrent_episode", "fever"],
  "con": ["proptosis", "restricted_motility", "reduced_vision", "diplopia"],
  "temporal": ["acute"],
  "tests": ["lacrimal_regurgitation"],
  "exclusions": []
},

{
  "name": "Epiphora (Lacrimal Obstruction)",
  "route": "surface",
  "req": ["watering"],
  "sup": ["blur", "watering", "watering", "irritation", "chronic_irritation", "older_age", "medial_canthus_swelling"],
  "con": ["reduced_vision", "pain_severe", "purulent_discharge", "photophobia"],
  "temporal": ["chronic"],
  "tests": ["syringing_block"],
  "exclusions": []
},

{
  "name": "Conjunctival Foreign Body",
  "route": "surface",
  "req": ["foreign_body_sensation"],
  "sup": ["watering", "redness", "sudden_onset", "pain_acute", "photophobia_mild", "irritation", "recent_eye_trauma"],
  "con": ["reduced_vision", "gradual_onset", "itching_dominant", "purulent_discharge"],
  "temporal": ["acute"],
  "tests": ["lid_eversion"],
  "exclusions": []
},

{
  "name": "Exposure Keratopathy (Surface Related)",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["incomplete_blink", "lagophthalmos", "burning", "foreign_body_sensation", "redness", "grittiness", "worse_evening"],
  "con": ["itching_dominant", "purulent_discharge", "pain_severe"],
  "temporal": ["chronic"],
  "tests": ["corneal_exposure"],
  "exclusions": []
},

{
  "name": "Lagophthalmos",
  "route": "surface",
  "req": ["incomplete_lid_closure"],
  "sup": ["dryness", "incomplete_blink", "foreign_body_sensation", "burning", "redness", "morning_blur", "corneal_exposure"],
  "con": ["itching_dominant", "purulent_discharge", "pain_severe"],
  "temporal": ["chronic"],
  "tests": ["blink_exam"],
  "exclusions": []
},

{
  "name": "Madarosis",
  "route": "surface",
  "req": ["lash_loss"],
  "sup": ["lid_margin_irregularity", "chronic_irritation", "lid_crusting", "redness", "cylindrical_dandruff"],
  "con": ["pain_severe", "reduced_vision", "proptosis", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["lash_exam"],
  "exclusions": []
},

{
  "name": "Trichiasis",
  "route": "surface",
  "req": ["misdirected_lashes"],
  "sup": ["foreign_body_sensation", "watering", "redness", "irritation", "chronic_irritation", "photophobia_mild", "watering"],
  "con": ["reduced_vision", "pain_severe", "sudden_vision_loss", "purulent_discharge"],
  "temporal": ["chronic"],
  "tests": ["lash_direction_exam"],
  "exclusions": []
},

{
  "name": "Entropion",
  "route": "surface",
  "req": ["inward_lid_turning"],
  "sup": ["irritation", "watering", "foreign_body_sensation", "redness", "misdirected_lashes", "older_age", "chronic_irritation"],
  "con": ["reduced_vision", "pain_severe", "proptosis", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["lid_position_exam"],
  "exclusions": []
},

{
  "name": "Ectropion",
  "route": "surface",
  "req": ["outward_lid_turning"],
  "sup": ["watering", "dryness", "irritation", "redness", "watering", "older_age", "foreign_body_sensation", "chronic_irritation"],
  "con": ["reduced_vision", "pain_severe", "proptosis", "sudden_vision_loss"],
  "temporal": ["chronic"],
  "tests": ["lid_position_exam"],
  "exclusions": []
},

{
  "name": "Conjunctival Hyperemia (Non-specific)",
  "route": "surface",
  "req": ["redness"],
  "sup": ["irritation", "burning", "foreign_body_sensation", "dryness", "watering"],
  "con": ["pain_severe", "reduced_vision", "distortion", "field_loss", "sudden_vision_loss", "photophobia", "purulent_discharge"],
  "tests": ["slitlamp_general"],
  "exclusions": []
},

/* NEEDS_CLINICAL_REVIEW (2026-07-12) — sight/life-threatening. */
{
  "name": "Orbital Cellulitis",
  "route": "urgent",
  "req": ["lid_swelling_diffuse", "pain_eye_movement"],
  "sup": ["proptosis", "restricted_motility", "fever", "redness", "reduced_vision", "diplopia", "tenderness", "recent_eye_trauma", "headache"],
  "con": ["itching_dominant", "gradual_onset"],
  "temporal": ["acute"],
  "tests": ["CT_orbits_imaging", "RAPD_positive"],
  "urgent": true,
  "exclusions": ["preseptal_cellulitis"]
}

];
