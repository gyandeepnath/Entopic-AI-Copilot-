/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — EXPANSION BATCH (PROVISIONAL)                  */
/*                                                                  */
/* AI-drafted, textbook-derived conditions added to grow the KB      */
/* toward ~5x coverage. EVERY entry here is PROVISIONAL and marked    */
/* NEEDS_CLINICAL_REVIEW — the founder verifies tokens, urgency and   */
/* exclusions (ideally through the in-app Knowledge Base Editor)      */
/* before any of it is trusted for ranking.                          */
/*                                                                  */
/* Rules this batch obeys (enforced by tests/kb-expansion.test.js):   */
/*   • no lint ERRORS (no duplicates, no req/con contradictions, …)   */
/*   • every REQUIRED token is already produced by an exam input      */
/*     (reachable) — so each condition can actually surface           */
/*   • distinct from the curated originals                           */
/*   • required tokens are specific enough that the condition only    */
/*     fires for its own presentation (a generic hallmark like        */
/*     "high_iop" is paired with a distinguishing token) so the       */
/*     additions don't perturb the curated differentials             */
/*                                                                  */
/* ICD-10 codes are intentionally omitted here — they are a review    */
/* step (the founder codes them via the coding tool / editor); the    */
/* whole batch is NEEDS_CLINICAL_REVIEW until then.                   */
/*                                                                  */
/* Kept in a separate file on purpose: the curated original          */
/* conditions stay pristine, and this batch is easy to audit, edit,   */
/* or remove wholesale.                                               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_EXPANSION = [

/* ═══ RETINA / MEDICAL RETINA ═══ */
{ "name": "Diabetic Macular Edema", "domain": "Retina", "route": "retina",
  "req": ["distortion", "diabetes_history"], "sup": ["central_blur", "reduced_vision", "reduced_contrast"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": ["macular_screening_needed"], "exclusions": [] },
{ "name": "Proliferative Diabetic Retinopathy", "domain": "Retina", "route": "urgent",
  "req": ["floaters", "diabetes_history"], "sup": ["sudden_floaters", "reduced_vision", "vision_hazy", "retinal_ischemia"],
  "con": [], "temporal": ["progressive"], "tests": ["macular_screening_needed"], "urgent": true, "exclusions": [] },
{ "name": "Retinal Artery Macroaneurysm", "domain": "Retina", "route": "retina",
  "req": ["central_blur", "hypertension_history"], "sup": ["distortion", "older_age", "reduced_vision"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Valsalva Retinopathy", "domain": "Retina", "route": "retina",
  "req": ["central_scotoma"], "sup": ["sudden_onset", "reduced_vision", "dark_spots"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Central Serous Chorioretinopathy (Chronic)", "domain": "Retina", "route": "retina",
  "req": ["distortion", "stress_history"], "sup": ["central_blur", "micropsia", "reduced_contrast"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": ["macular_screening_needed"], "exclusions": [] },
{ "name": "Myopic Macular Degeneration", "domain": "Retina", "route": "retina",
  "req": ["central_blur", "myopia"], "sup": ["distortion", "reduced_vision", "progressive_blur"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Stargardt Disease", "domain": "Retina", "route": "retina",
  "req": ["central_scotoma", "young_age"], "sup": ["central_blur", "color_vision_loss", "family_history", "reduced_vision"],
  "con": [], "temporal": ["progressive"], "tests": [], "exclusions": [] },
{ "name": "Best Vitelliform Dystrophy", "domain": "Retina", "route": "retina",
  "req": ["central_blur", "family_history"], "sup": ["young_age", "distortion"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Cone Dystrophy", "domain": "Retina", "route": "retina",
  "req": ["color_vision_loss"], "sup": ["glare", "central_blur", "photophobia", "reduced_vision"],
  "con": [], "temporal": ["progressive"], "tests": [], "exclusions": [] },
{ "name": "Choroideremia", "domain": "Retina", "route": "retina",
  "req": ["night_blindness", "family_history"], "sup": ["peripheral_field_loss", "young_age"],
  "con": [], "temporal": ["progressive"], "tests": [], "exclusions": [] },
{ "name": "Degenerative Retinoschisis", "domain": "Retina", "route": "retina",
  "req": ["peripheral_field_loss"], "sup": ["older_age", "peripheral_degeneration"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Ocular Ischemic Syndrome", "domain": "Retina", "route": "urgent",
  "req": ["reduced_vision", "retinal_ischemia"], "sup": ["older_age", "pain", "hypertension_history"],
  "con": [], "temporal": ["progressive"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Commotio Retinae", "domain": "Retina", "route": "retina",
  "req": ["reduced_vision", "trauma_history"], "sup": ["central_scotoma"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Vitreomacular Traction", "domain": "Retina", "route": "retina",
  "req": ["distortion", "older_age"], "sup": ["central_blur", "micropsia"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": ["macular_screening_needed"], "exclusions": [] },
{ "name": "Solar (Photic) Retinopathy", "domain": "Retina", "route": "retina",
  "req": ["central_scotoma"], "sup": ["central_blur", "micropsia"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },

/* ═══ UVEITIS / INFLAMMATION ═══ */
{ "name": "Fuchs Heterochromic Uveitis", "domain": "Anterior / Uveitis", "route": "anterior",
  "req": ["blur", "chronic_irritation"], "sup": ["floaters", "young_age"],
  "con": ["pain_severe", "purulent_discharge"], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Sarcoid Uveitis", "domain": "Anterior / Uveitis", "route": "anterior",
  "req": ["pain", "recurrent_episode"], "sup": ["photophobia", "redness", "floaters", "autoimmune_history"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Toxoplasma Retinochoroiditis", "domain": "Anterior / Uveitis", "route": "retina",
  "req": ["floaters", "recurrent_episode"], "sup": ["reduced_vision", "vision_hazy"],
  "con": [], "temporal": ["acute", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Sympathetic Ophthalmia", "domain": "Anterior / Uveitis", "route": "urgent",
  "req": ["reduced_vision", "trauma_history"], "sup": ["pain", "photophobia", "post_surgery", "floaters"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Pars Planitis", "domain": "Anterior / Uveitis", "route": "anterior",
  "req": ["floaters", "young_age"], "sup": ["blur", "reduced_vision"],
  "con": ["pain_severe"], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Posterior Scleritis", "domain": "Anterior / Uveitis", "route": "urgent",
  "req": ["deep_boring_pain"], "sup": ["reduced_vision", "pain_worse_night", "autoimmune_history", "pain_eye_movement"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },

/* ═══ CORNEA / EXTERNAL ═══ */
{ "name": "Acanthamoeba Keratitis", "domain": "Cornea", "route": "urgent",
  "req": ["pain_severe", "contact_lens_use"], "sup": ["photophobia", "redness", "reduced_vision"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Fungal Keratitis", "domain": "Cornea", "route": "urgent",
  "req": ["pain_severe", "trauma_history"], "sup": ["photophobia", "redness", "reduced_vision"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Filamentary Keratitis", "domain": "Cornea", "route": "anterior",
  "req": ["foreign_body_sensation", "dryness"], "sup": ["grittiness", "photophobia_mild", "chronic_irritation"],
  "con": [], "temporal": ["chronic"], "tests": ["schirmer_low"], "exclusions": [] },
{ "name": "Map-Dot-Fingerprint Dystrophy", "domain": "Cornea", "route": "anterior",
  "req": ["pain_morning"], "sup": ["foreign_body_sensation", "fluctuating_blur", "recurrent_episode"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Lattice Corneal Dystrophy", "domain": "Cornea", "route": "anterior",
  "req": ["corneal_opacity", "family_history"], "sup": ["reduced_vision", "recurrent_episode", "pain_morning"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Granular Corneal Dystrophy", "domain": "Cornea", "route": "anterior",
  "req": ["corneal_opacity", "family_history"], "sup": ["glare", "gradual_blur"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Terrien Marginal Degeneration", "domain": "Cornea", "route": "anterior",
  "req": ["irregular_astigmatism"], "sup": ["peripheral_degeneration", "gradual_blur"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Superior Limbic Keratoconjunctivitis", "domain": "Cornea", "route": "surface",
  "req": ["foreign_body_sensation", "thyroid_history"], "sup": ["redness", "watering", "chronic_irritation"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Thygeson Superficial Punctate Keratopathy", "domain": "Cornea", "route": "anterior",
  "req": ["punctate_epithelial_lesions"], "sup": ["foreign_body_sensation", "photophobia_mild", "watering", "recurrent_episode"],
  "con": ["purulent_discharge"], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },

/* ═══ GLAUCOMA (distinguishing feature required so they don't fire on a
       generic elevated-IOP picture) ═══ */
{ "name": "Steroid-Induced Glaucoma", "domain": "Glaucoma", "route": "glaucoma",
  "req": ["high_iop", "steroid_history"], "sup": ["raised_iop_risk"],
  "con": [], "temporal": ["subacute", "chronic"], "tests": ["increased_cd"], "exclusions": [] },
{ "name": "Angle Recession Glaucoma", "domain": "Glaucoma", "route": "glaucoma",
  "req": ["high_iop", "trauma_history"], "sup": ["cd_asymmetry"],
  "con": [], "temporal": ["chronic"], "tests": ["increased_cd"], "exclusions": [] },
{ "name": "Juvenile Open Angle Glaucoma", "domain": "Glaucoma", "route": "glaucoma",
  "req": ["high_iop", "young_age"], "sup": ["family_history", "myopia"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": ["increased_cd", "nrr_thinning"], "exclusions": [] },

/* ═══ NEURO-OPHTHALMOLOGY ═══ */
{ "name": "Giant Cell Arteritis (Arteritic AION)", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["sudden_vision_loss", "older_age"], "sup": ["headache", "pain", "transient_vision_loss"],
  "con": [], "temporal": ["acute"], "tests": ["disc_edema"], "urgent": true, "exclusions": [] },
{ "name": "Idiopathic Intracranial Hypertension", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["bilateral_disc_swelling"], "sup": ["headache", "transient_vision_loss", "vomiting", "young_age"],
  "con": [], "temporal": ["subacute", "progressive"], "tests": ["disc_edema"], "urgent": true, "exclusions": [] },
{ "name": "Pituitary Adenoma (Chiasmal Compression)", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["temporal_field_loss", "headache"], "sup": ["reduced_vision", "color_vision_loss"],
  "con": [], "temporal": ["progressive"], "tests": ["visual_field_defect"], "exclusions": [] },
{ "name": "Ocular Myasthenia Gravis", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["ptosis", "worse_evening"], "sup": ["diplopia", "fatigue", "variable_blur"],
  "con": [], "temporal": ["intermittent"], "tests": [], "exclusions": [] },
{ "name": "Nutritional / Toxic Optic Neuropathy", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["central_scotoma", "toxic_optic_risk"], "sup": ["color_vision_loss", "reduced_vision", "progressive_vision_loss"],
  "con": [], "temporal": ["progressive"], "tests": ["visual_field_defect"], "exclusions": [] },
{ "name": "Leber Hereditary Optic Neuropathy", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["central_scotoma", "family_history"], "sup": ["young_age", "color_vision_loss", "reduced_vision"],
  "con": [], "temporal": ["subacute"], "tests": [], "exclusions": [] },
{ "name": "Idiopathic Orbital Inflammation (Pseudotumor)", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["proptosis", "pain_eye_movement"], "sup": ["redness", "diplopia", "restricted_motility"],
  "con": [], "temporal": ["acute", "subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Adie Tonic Pupil", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["anisocoria"], "sup": ["photophobia_mild", "difficulty_focusing", "young_age"],
  "con": ["ptosis"], "temporal": ["chronic"], "tests": [], "exclusions": [] },

/* ═══ LENS ═══ */
{ "name": "Anterior Polar Cataract", "domain": "Lens", "route": "lens",
  "req": ["gradual_blur", "family_history"], "sup": ["glare"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Phacomorphic Angle Closure", "domain": "Lens", "route": "urgent",
  "req": ["high_iop", "narrow_angle"], "sup": ["pain_severe", "halos", "reduced_vision", "older_age"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },

/* ═══ OCULOPLASTICS / SURFACE ═══ */
{ "name": "Floppy Eyelid Syndrome", "domain": "Surface & Lids", "route": "surface",
  "req": ["chronic_irritation", "morning_stickiness"], "sup": ["redness", "foreign_body_sensation"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Blepharospasm", "domain": "Surface & Lids", "route": "surface",
  "req": ["spasm"], "sup": ["photophobia", "irritation", "chronic_irritation"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Canaliculitis", "domain": "Surface & Lids", "route": "surface",
  "req": ["medial_canthus_swelling", "recurrent_episode"], "sup": ["discharge", "tearing", "redness"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Sebaceous Gland Carcinoma", "domain": "Surface & Lids", "route": "urgent",
  "req": ["painless_lid_nodule", "recurrent_episode"], "sup": ["lash_loss", "older_age", "chronic_irritation"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "urgent": true, "exclusions": [] },

/* ═══ BINOCULAR VISION / STRABISMUS ═══ */
{ "name": "Basic Exotropia", "domain": "Binocular Vision", "route": "binocular",
  "req": ["exo_distance"], "sup": ["exo_near", "intermittent_eye_out", "closing_one_eye", "asthenopia"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Sensory Strabismus", "domain": "Binocular Vision", "route": "binocular",
  "req": ["constant_deviation"], "sup": ["reduced_vision", "suppression", "unequal_vision"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Decompensated Phoria", "domain": "Binocular Vision", "route": "binocular",
  "req": ["intermittent_diplopia"], "sup": ["asthenopia", "headache_near", "eye_strain", "worse_evening"],
  "con": [], "temporal": ["intermittent"], "tests": ["reduced_vergence_ranges"], "exclusions": [] },

/* ═══════════════════════════════════════════════════════════════ */
/* BATCH 2 (2026-07-13) — same rules: reachable + specific req,      */
/* provisional / NEEDS_CLINICAL_REVIEW.                             */
/* ═══════════════════════════════════════════════════════════════ */

/* ── Binocular / accommodative / strabismus ── */
{ "name": "Amblyopia (Refractive)", "domain": "Binocular Vision", "route": "binocular",
  "req": ["unequal_vision", "unequal_refractive_error"], "sup": ["young_age", "suppression"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Consecutive Exotropia", "domain": "Binocular Vision", "route": "binocular",
  "req": ["exo_distance", "post_surgery"], "sup": ["intermittent_eye_out", "asthenopia"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Accommodative Esotropia", "domain": "Binocular Vision", "route": "binocular",
  "req": ["eso_near", "high_ACA_ratio"], "sup": ["young_age", "hyperopia", "asthenopia"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Convergence Paralysis", "domain": "Binocular Vision", "route": "binocular",
  "req": ["double_vision_near", "reduced_PFV"], "sup": ["asthenopia", "headache_near"],
  "con": [], "temporal": ["subacute"], "tests": [], "exclusions": [] },
{ "name": "Vertical Heterophoria", "domain": "Binocular Vision", "route": "binocular",
  "req": ["vertical_diplopia", "head_tilt"], "sup": ["asthenopia", "headache", "worse_evening"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },

/* ── Refractive ── */
{ "name": "Anisometropic Refractive Error", "domain": "Refractive", "route": "refractive",
  "req": ["unequal_refractive_error"], "sup": ["unequal_vision", "asthenopia", "headache"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Pseudomyopia (Accommodative Spasm)", "domain": "Refractive", "route": "refractive",
  "req": ["distance_blur", "spasm"], "sup": ["near_strain", "variable_blur", "screen_use_exacerbation"],
  "con": [], "temporal": ["intermittent"], "tests": [], "exclusions": [] },
{ "name": "Post-Refractive-Surgery Ectasia", "domain": "Refractive", "route": "refractive",
  "req": ["irregular_astigmatism", "post_surgery"], "sup": ["progressive_blur", "ghosting", "glare"],
  "con": [], "temporal": ["progressive"], "tests": [], "exclusions": [] },

/* ── Conjunctiva / sclera / surface ── */
{ "name": "Conjunctival Melanoma", "domain": "Surface & Lids", "route": "urgent",
  "req": ["pigmented_lesion", "elevated_mass"], "sup": ["redness", "older_age"],
  "con": [], "temporal": ["progressive"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Ocular Surface Squamous Neoplasia", "domain": "Surface & Lids", "route": "urgent",
  "req": ["elevated_mass", "conjunctival_growth_cornea"], "sup": ["redness", "older_age", "foreign_body_sensation"],
  "con": [], "temporal": ["progressive"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Conjunctival Nevus", "domain": "Surface & Lids", "route": "surface",
  "req": ["pigmented_lesion"], "sup": ["localized_conjunctival_elevation"],
  "con": ["elevated_mass"], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Giant Papillary Conjunctivitis", "domain": "Surface & Lids", "route": "surface",
  "req": ["contact_lens_use", "itching_dominant"], "sup": ["ropy_discharge", "foreign_body_sensation", "reduced_wear_time"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Ligneous Conjunctivitis", "domain": "Surface & Lids", "route": "surface",
  "req": ["redness", "recurrent_episode"], "sup": ["discharge", "young_age", "foreign_body_sensation"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },

/* ── Lacrimal / lids ── */
{ "name": "Punctal Stenosis", "domain": "Surface & Lids", "route": "surface",
  "req": ["excess_tearing", "older_age"], "sup": ["irritation", "chronic_irritation"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Nasolacrimal Duct Obstruction (Congenital)", "domain": "Surface & Lids", "route": "surface",
  "req": ["excess_tearing", "young_age"], "sup": ["discharge", "morning_stickiness", "recurrent_episode"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Dacryoadenitis", "domain": "Surface & Lids", "route": "surface",
  "req": ["localized_lid_swelling", "tenderness"], "sup": ["redness", "pain", "fever"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Involutional Ptosis", "domain": "Surface & Lids", "route": "surface",
  "req": ["ptosis", "older_age"], "sup": ["reading_difficulty", "fatigue"],
  "con": ["diplopia", "anisocoria"], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Eyelid Basal Cell Carcinoma", "domain": "Surface & Lids", "route": "urgent",
  "req": ["painless_lid_nodule", "older_age"], "sup": ["lash_loss", "chronic_irritation", "cracking_skin"],
  "con": [], "temporal": ["progressive"], "tests": [], "urgent": true, "exclusions": [] },

/* ── Cornea (surface/contact-lens) ── */
{ "name": "Contact Lens Corneal Warpage", "domain": "Cornea", "route": "anterior",
  "req": ["contact_lens_use", "irregular_astigmatism"], "sup": ["fluctuating_blur", "ghosting", "reduced_wear_time"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Corneal Foreign Body (Metallic)", "domain": "Cornea", "route": "anterior",
  "req": ["foreign_body_sensation", "trauma_history"], "sup": ["pain_acute", "watering", "redness", "photophobia_mild"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Vortex Keratopathy (Drug-Induced)", "domain": "Cornea", "route": "anterior",
  "req": ["glare", "corneal_opacity"], "sup": ["halos", "gradual_blur"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Iron Line (Corneal)", "domain": "Cornea", "route": "anterior",
  "req": ["corneal_opacity_band"], "sup": ["astigmatism"],
  "con": ["pain_severe", "reduced_vision"], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Limbal Stem Cell Deficiency", "domain": "Cornea", "route": "anterior",
  "req": ["new_vessels_cornea", "chronic_irritation"], "sup": ["reduced_vision", "photophobia", "recurrent_episode"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },

/* ── Retina / vascular ── */
{ "name": "Hemiretinal Vein Occlusion", "domain": "Retina", "route": "retina",
  "req": ["sectoral_blur", "hypertension_history"], "sup": ["reduced_vision", "distortion", "older_age"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Retinal Vasculitis", "domain": "Retina", "route": "retina",
  "req": ["floaters", "autoimmune_history"], "sup": ["reduced_vision", "vision_hazy", "reduced_contrast"],
  "con": [], "temporal": ["subacute"], "tests": [], "exclusions": [] },
{ "name": "Retinopathy of Prematurity (Cicatricial)", "domain": "Retina", "route": "retina",
  "req": ["reduced_vision", "young_age"], "sup": ["myopia", "peripheral_field_loss"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Choroidal Hemangioma", "domain": "Retina", "route": "retina",
  "req": ["distortion", "elevated_mass"], "sup": ["central_blur", "reduced_vision"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Gyrate Atrophy", "domain": "Retina", "route": "retina",
  "req": ["night_blindness", "myopia"], "sup": ["peripheral_field_loss", "family_history", "young_age"],
  "con": [], "temporal": ["progressive"], "tests": [], "exclusions": [] },
{ "name": "Birdshot Chorioretinopathy", "domain": "Retina", "route": "retina",
  "req": ["floaters", "night_blindness"], "sup": ["reduced_contrast", "reduced_vision", "distortion"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },

/* ── Neuro-ophthalmology / motility ── */
{ "name": "Downbeat Nystagmus", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["nystagmus_other_eye", "shadowing"], "sup": ["visual_disturbance", "reduced_vision"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Skew Deviation", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["vertical_diplopia", "head_tilt"], "sup": ["visual_disturbance", "reduced_vision"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Chronic Progressive External Ophthalmoplegia", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["ptosis", "restricted_motility"], "sup": ["family_history", "diplopia"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Convergence-Retraction Nystagmus (Dorsal Midbrain)", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["difficulty_focusing", "vertical_diplopia"], "sup": ["diplopia", "headache", "vomiting"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Hemianopic Field Loss (Occipital Stroke)", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["field_loss_half", "sudden_onset"], "sup": ["older_age", "hypertension_history"],
  "con": [], "temporal": ["acute"], "tests": ["visual_field_defect"], "urgent": true, "exclusions": [] },

/* ── Glaucoma / lens ── */
{ "name": "Neovascular Glaucoma (Diabetic)", "domain": "Glaucoma", "route": "urgent",
  "req": ["high_iop", "rubeosis_iridis"], "sup": ["diabetes_history", "pain_severe", "reduced_vision", "halos"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Aphakic Glaucoma", "domain": "Glaucoma", "route": "glaucoma",
  "req": ["high_iop", "post_surgery"], "sup": ["halos", "cd_asymmetry"],
  "con": [], "temporal": ["chronic"], "tests": ["increased_cd"], "exclusions": [] },
{ "name": "Ectopia Lentis (Marfan)", "domain": "Lens", "route": "lens",
  "req": ["lens_displacement", "young_age"], "sup": ["fluctuating_blur", "irregular_astigmatism", "family_history"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Posterior Polar Cataract", "domain": "Lens", "route": "lens",
  "req": ["gradual_blur", "glare"], "sup": ["family_history", "difficulty_near"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },

/* ═══════════════════════════════════════════════════════════════ */
/* BATCH 3 (2026-07-13) — paired with input-surface enrichment (new */
/* trauma/systemic symptom tokens + newly-wired fundus signs). Same */
/* rules; provisional / NEEDS_CLINICAL_REVIEW.                      */
/* ═══════════════════════════════════════════════════════════════ */

/* ── Ocular trauma (mostly urgent) ── */
{ "name": "Chemical Eye Burn", "domain": "Cornea", "route": "urgent",
  "req": ["chemical_splash"], "sup": ["pain_severe", "redness", "reduced_vision", "watering", "photophobia"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Open Globe Injury", "domain": "Cornea", "route": "urgent",
  "req": ["recent_eye_trauma", "reduced_vision"], "sup": ["pain_severe", "redness"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Traumatic Hyphema", "domain": "Anterior / Uveitis", "route": "urgent",
  "req": ["hyphema_visible"], "sup": ["recent_eye_trauma", "pain", "reduced_vision", "photophobia"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Intraocular Foreign Body", "domain": "Cornea", "route": "urgent",
  "req": ["high_speed_particle", "pain"], "sup": ["reduced_vision", "redness", "foreign_body_sensation"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Corneal Laceration", "domain": "Cornea", "route": "urgent",
  "req": ["recent_eye_trauma", "pain_severe"], "sup": ["watering", "redness", "reduced_vision", "photophobia"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Orbital Blowout Fracture", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["recent_eye_trauma", "vertical_diplopia"], "sup": ["restricted_motility", "reduced_vision"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Traumatic Optic Neuropathy", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["recent_eye_trauma", "color_vision_loss"], "sup": ["reduced_vision", "central_scotoma"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Traumatic Mydriasis", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["recent_eye_trauma", "anisocoria"], "sup": ["photophobia_mild", "difficulty_focusing"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Choroidal Rupture", "domain": "Retina", "route": "retina",
  "req": ["recent_eye_trauma", "central_blur"], "sup": ["reduced_vision", "distortion"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Ocular Siderosis (Retained IOFB)", "domain": "Retina", "route": "retina",
  "req": ["high_speed_particle", "gradual_blur"], "sup": ["night_blindness", "reduced_vision"],
  "con": [], "temporal": ["chronic", "progressive"], "tests": [], "exclusions": [] },
{ "name": "Thermal Eyelid Burn", "domain": "Surface & Lids", "route": "surface",
  "req": ["recent_eye_trauma", "localized_lid_swelling"], "sup": ["pain", "redness"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },

/* ── Systemic / vascular retinopathy ── */
{ "name": "Malignant Hypertensive Retinopathy", "domain": "Retina", "route": "urgent",
  "req": ["cotton_wool_spots", "hypertension_history"], "sup": ["reduced_vision", "headache", "distortion"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Purtscher Retinopathy", "domain": "Retina", "route": "retina",
  "req": ["cotton_wool_spots", "recent_eye_trauma"], "sup": ["reduced_vision", "central_scotoma"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] },
{ "name": "Giant Cell Arteritis (Occult / Systemic)", "domain": "Neuro-Ophthalmic", "route": "urgent",
  "req": ["jaw_claudication", "scalp_tenderness"], "sup": ["older_age", "headache", "transient_vision_loss"],
  "con": [], "temporal": ["subacute"], "tests": [], "urgent": true, "exclusions": [] },

/* ── Optic nerve / retina (newly-wired signs) ── */
{ "name": "Optic Pit Maculopathy", "domain": "Retina", "route": "retina",
  "req": ["optic_pit"], "sup": ["central_blur", "distortion", "reduced_vision", "micropsia"],
  "con": [], "temporal": ["chronic"], "tests": ["macular_screening_needed"], "exclusions": [] },

/* ── Neuro-ophthalmology (nystagmus / oscillopsia) ── */
{ "name": "Acquired Pendular Nystagmus", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["oscillopsia"], "sup": ["reduced_vision", "ms_history", "visual_disturbance"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Spasmus Nutans", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["oscillopsia", "young_age"], "sup": ["head_tilt", "visual_disturbance"],
  "con": [], "temporal": ["chronic"], "tests": [], "exclusions": [] },
{ "name": "Superior Oblique Myokymia", "domain": "Neuro-Ophthalmic", "route": "neuro",
  "req": ["oscillopsia", "intermittent_diplopia"], "sup": ["vertical_diplopia", "visual_disturbance"],
  "con": [], "temporal": ["intermittent"], "tests": [], "exclusions": [] },

/* ── Cornea / ocular surface (immune / surgical) ── */
{ "name": "Ocular Rosacea", "domain": "Surface & Lids", "route": "surface",
  "req": ["chronic_redness", "lid_margin_irregularity"], "sup": ["burning", "dryness", "recurrent_episode"],
  "con": [], "temporal": ["chronic", "recurrent"], "tests": [], "exclusions": [] },
{ "name": "Mooren Ulcer", "domain": "Cornea", "route": "urgent",
  "req": ["peripheral_infiltrate", "pain_severe"], "sup": ["redness", "reduced_vision", "photophobia"],
  "con": [], "temporal": ["progressive"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Peripheral Ulcerative Keratitis", "domain": "Cornea", "route": "urgent",
  "req": ["peripheral_infiltrate", "autoimmune_history"], "sup": ["pain", "redness", "reduced_vision"],
  "con": [], "temporal": ["subacute", "progressive"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Toxic Anterior Segment Syndrome", "domain": "Anterior / Uveitis", "route": "urgent",
  "req": ["post_surgery", "corneal_edema"], "sup": ["redness", "reduced_vision", "pain"],
  "con": [], "temporal": ["acute"], "tests": [], "urgent": true, "exclusions": [] },
{ "name": "Vernal Shield Ulcer", "domain": "Cornea", "route": "anterior",
  "req": ["itching_dominant", "corneal_opacity"], "sup": ["photophobia", "reduced_vision", "young_age"],
  "con": [], "temporal": ["recurrent"], "tests": [], "exclusions": [] },
{ "name": "Contact Lens Acute Red Eye (CLARE)", "domain": "Cornea", "route": "anterior",
  "req": ["contact_lens_use", "redness"], "sup": ["pain", "photophobia", "watering", "reduced_wear_time"],
  "con": [], "temporal": ["acute"], "tests": [], "exclusions": [] }

];
