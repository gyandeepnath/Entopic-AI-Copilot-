/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — SURFACE DOMAIN                                 */
/* 30 conditions — DO NOT MODIFY                                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_SURFACE = [

{
  "name": "Dry Eye Disease - Evaporative (MGD)",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["burning", "fluctuating_blur", "worse_evening", "screen_use_exacerbation", "contact_lens_intolerance", "lid_margin_irregularity"],
  "con": ["itching_dominant", "acute_severe_pain", "purulent_discharge"],
  "temporal": ["chronic", "progressive"],
  "severity_modifiers": ["mild_irritation", "moderate_discomfort"],
  "tests": ["TBUT_reduced", "meibomian_gland_dropout", "thick_meibum", "tear_film_instability"],
  /* NEEDS_CLINICAL_REVIEW: "acute_keratitis" matches no condition in the KB.
     Several keratitis entries exist (microbial, herpetic, marginal, ...) —
     founder to confirm which, if any, this exclusion should target. */
  "exclusions": ["allergic_conjunctivitis", "bacterial_conjunctivitis", "acute_keratitis"]
},

{
  "name": "Dry Eye Disease - Aqueous Deficient",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["foreign_body_sensation", "stringy_mucus", "grittiness", "reduced_tearing"],
  "con": ["itching_dominant", "acute_discharge"],
  "temporal": ["chronic"],
  "tests": ["schirmer_low", "tear_meniscus_low"],
  "exclusions": ["allergic_conjunctivitis"]
},

{
  "name": "Allergic Conjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["redness", "watering", "bilateral", "seasonal", "recurrent"],
  "con": ["severe_pain", "photophobia_strong"],
  "temporal": ["intermittent", "seasonal"],
  "tests": ["papillae_present", "conjunctival_edema"],
  "exclusions": ["uveitis", "keratitis"]
},

{
  "name": "Bacterial Conjunctivitis",
  "route": "surface",
  "req": ["purulent_discharge"],
  "sup": ["redness", "lid_sticking_morning", "unilateral_start"],
  "con": ["itching_dominant"],
  "temporal": ["acute"],
  "tests": ["discharge_present"],
  "exclusions": ["allergic_conjunctivitis"]
},

{
  "name": "Viral Conjunctivitis",
  "route": "surface",
  "req": ["watery_discharge"],
  "sup": ["redness", "preauricular_node", "recent_viral_history"],
  "con": ["purulent_discharge"],
  "temporal": ["acute"],
  "tests": ["follicles_present"],
  "exclusions": []
},

{
  "name": "Blepharitis - Anterior",
  "route": "surface",
  "req": ["lid_crusting"],
  "sup": ["burning", "redness", "morning_stickiness"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["lash_debris", "collarettes"],
  "exclusions": []
},

{
  "name": "Blepharitis - Posterior (MGD)",
  "route": "surface",
  "req": ["meibomian_dysfunction"],
  "sup": ["dryness", "burning", "fluctuating_blur"],
  "con": [],
  "tests": ["meibum_quality_poor"],
  "exclusions": []
},

{
  "name": "Demodex Blepharitis",
  "route": "surface",
  "req": ["cylindrical_dandruff"],
  "sup": ["itching_lashes", "chronic_irritation"],
  "con": [],
  "tests": ["lash_mite_visualization"],
  "exclusions": []
},

{
  "name": "Vernal Keratoconjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["photophobia", "giant_papillae", "ropy_discharge", "young_age"],
  "con": ["pain_dominant"],
  "temporal": ["chronic", "seasonal"],
  "tests": ["cobblestone_papillae"],
  "exclusions": ["dry_eye"]
},

{
  "name": "Atopic Keratoconjunctivitis",
  "route": "surface",
  "req": ["itching_dominant"],
  "sup": ["chronic_redness", "eczema_history"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["skin_association"],
  "exclusions": []
},

{
  "name": "Pinguecula",
  "route": "surface",
  "req": ["localized_conjunctival_elevation"],
  "sup": ["dryness", "foreign_body_sensation"],
  "con": [],
  "tests": ["slitlamp_localized"],
  "exclusions": []
},

{
  "name": "Pterygium",
  "route": "surface",
  "req": ["conjunctival_growth_cornea"],
  "sup": ["astigmatism", "irritation"],
  "con": [],
  "tests": ["slitlamp_progression"],
  "exclusions": []
},

{
  "name": "Subconjunctival Hemorrhage",
  "route": "surface",
  "req": ["red_patch"],
  "sup": ["sudden_onset"],
  "con": ["pain", "vision_loss"],
  "tests": ["slitlamp_clear"],
  "exclusions": []
},

{
  "name": "Conjunctival Cyst",
  "route": "surface",
  "req": ["clear_bubble"],
  "sup": [],
  "con": [],
  "tests": ["slitlamp_clear"],
  "exclusions": []
},

{
  "name": "Contact Lens Intolerance",
  "route": "surface",
  "req": ["contact_lens_discomfort"],
  "sup": ["dryness", "burning", "reduced_wear_time"],
  "con": [],
  "tests": ["history_positive"],
  "exclusions": []
},

{
  "name": "Angular Blepharitis",
  "route": "surface",
  "req": ["lateral_canthus_irritation"],
  "sup": ["redness", "burning", "cracking_skin"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["localized_inflammation"],
  "exclusions": []
},

{
  "name": "Hordeolum (Stye)",
  "route": "surface",
  "req": ["localized_lid_swelling"],
  "sup": ["pain", "tenderness", "redness"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["localized_pustule"],
  "exclusions": []
},

{
  "name": "Chalazion",
  "route": "surface",
  "req": ["painless_lid_nodule"],
  "sup": ["localized_swelling"],
  "con": ["pain"],
  "temporal": ["chronic"],
  "tests": ["meibomian_blockage"],
  "exclusions": []
},

{
  "name": "Preseptal Cellulitis",
  "route": "surface",
  "req": ["lid_swelling_diffuse"],
  "sup": ["redness", "tenderness", "fever"],
  "con": ["proptosis", "restricted_motility"],
  "temporal": ["acute"],
  "tests": ["clinical_exam"],
  /* Resolved 2026-07-12: Orbital Cellulitis now exists as an urgent condition
     and carries the correct-direction exclusion (orbital supersedes preseptal).
     The old inverted exclusion here is removed. Preseptal also `con`-tags
     proptosis/restricted_motility so orbital signs push its own score down. */
  "exclusions": []
},

{
  "name": "Dacryocystitis",
  "route": "surface",
  "req": ["medial_canthus_swelling"],
  "sup": ["pain", "discharge", "tearing"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["lacrimal_regurgitation"],
  "exclusions": []
},

{
  "name": "Epiphora (Lacrimal Obstruction)",
  "route": "surface",
  "req": ["excess_tearing"],
  "sup": ["blur", "tear_overflow"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["syringing_block"],
  "exclusions": []
},

{
  "name": "Conjunctival Foreign Body",
  "route": "surface",
  "req": ["foreign_body_sensation"],
  "sup": ["watering", "redness", "acute_onset"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["lid_eversion"],
  "exclusions": []
},

{
  "name": "Exposure Keratopathy (Surface Related)",
  "route": "surface",
  "req": ["dryness"],
  "sup": ["incomplete_blink", "lagophthalmos", "burning"],
  "con": [],
  "tests": ["corneal_exposure"],
  "exclusions": []
},

{
  "name": "Lagophthalmos",
  "route": "surface",
  "req": ["incomplete_lid_closure"],
  "sup": ["dryness", "exposure_symptoms"],
  "con": [],
  "tests": ["blink_exam"],
  "exclusions": []
},

{
  "name": "Madarosis",
  "route": "surface",
  "req": ["lash_loss"],
  "sup": ["lid_margin_changes"],
  "con": [],
  "tests": ["lash_exam"],
  "exclusions": []
},

{
  "name": "Trichiasis",
  "route": "surface",
  "req": ["misdirected_lashes"],
  "sup": ["foreign_body_sensation", "watering"],
  "con": [],
  "tests": ["lash_direction_exam"],
  "exclusions": []
},

{
  "name": "Entropion",
  "route": "surface",
  "req": ["inward_lid_turning"],
  "sup": ["irritation", "watering"],
  "con": [],
  "tests": ["lid_position_exam"],
  "exclusions": []
},

{
  "name": "Ectropion",
  "route": "surface",
  "req": ["outward_lid_turning"],
  "sup": ["tearing", "dryness"],
  "con": [],
  "tests": ["lid_position_exam"],
  "exclusions": []
},

{
  "name": "Conjunctival Hyperemia (Non-specific)",
  "route": "surface",
  "req": ["redness"],
  "sup": ["irritation"],
  "con": ["pain", "vision_loss"],
  "tests": ["slitlamp_general"],
  "exclusions": []
},

/* NEEDS_CLINICAL_REVIEW (added 2026-07-12, founder-requested expansion):
   textbook feature set, AI-authored — verify tokens, urgency and the
   exclusion of preseptal cellulitis before trusting rankings. Resolves the
   NEEDS_REVIEW dead-end (preseptal's exclusion pointed at a condition that
   didn't exist). Orbital cellulitis is sight/life-threatening. */
{
  "name": "Orbital Cellulitis",
  "route": "urgent",
  "req": ["lid_swelling_diffuse", "pain_eye_movement"],
  "sup": ["proptosis", "restricted_motility", "fever", "redness", "reduced_vision", "diplopia", "tenderness"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["CT_orbits_imaging", "RAPD_check"],
  "urgent": true,
  /* orbital findings supersede a preseptal picture; preseptal is not urgent
     so this exclusion CAN suppress it when orbital scores high — founder to
     confirm that is the wanted behaviour */
  "exclusions": ["preseptal_cellulitis"]
}

];
