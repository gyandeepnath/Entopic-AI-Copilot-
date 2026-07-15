/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — NEURO-OPHTHALMIC DOMAIN                        */
/* 16 conditions.                                                   */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): supportive and       */
/* contradicting tokens expanded for differentiation; dead tokens    */
/* (e.g. "painless", "same_side_both_eyes", "brain_origin") replaced */
/* with reachable equivalents. Required tokens unchanged. Founder to  */
/* verify. The 2026-07-12 additions (TED, Horner, Migraine) are also  */
/* still marked for review.                                          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_NEURO = [

{
  "name": "Optic Neuritis",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["pain_eye_movement", "color_vision_loss", "young_age", "reduced_contrast", "central_scotoma"],
  "con": ["pain_severe", "older_age"],
  "temporal": ["acute"],
  "tests": ["RAPD_positive", "color_vision_loss", "normal_or_swollen_disc"],
  "exclusions": []
},

{
  "name": "Ischemic Optic Neuropathy (AION)",
  "route": "urgent",
  "req": ["sudden_vision_loss"],
  "sup": ["older_age", "field_defect", "color_vision_loss"],
  "con": ["pain_severe", "young_age"],
  "temporal": ["acute"],
  "tests": ["disc_edema", "altitudinal_field_defect"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Compressive Optic Neuropathy",
  "route": "urgent",
  "req": ["progressive_vision_loss"],
  "sup": ["field_defect", "color_vision_loss", "reduced_contrast", "proptosis"],
  "con": ["sudden_onset"],
  "temporal": ["progressive"],
  "tests": ["pale_disc", "visual_field_defect"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Papilledema",
  "route": "urgent",
  "req": ["bilateral_disc_swelling"],
  "sup": ["headache", "vomiting", "transient_vision_loss"],
  "con": ["sudden_vision_loss"],
  "temporal": ["progressive"],
  "tests": ["disc_edema", "raised_intracranial_pressure"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Third Cranial Nerve Palsy",
  "route": "urgent",
  "req": ["ptosis"],
  "sup": ["diplopia", "eye_down_out", "pupil_involvement", "headache"],
  "con": ["worse_evening"],
  "temporal": ["acute"],
  "tests": ["restricted_motility", "pupil_abnormal"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Sixth Cranial Nerve Palsy",
  "route": "neuro",
  "req": ["horizontal_diplopia"],
  "sup": ["limited_abduction", "worse_distance", "diplopia"],
  "con": ["vertical_diplopia"],
  "temporal": ["acute"],
  "tests": ["limited_abduction"],
  "exclusions": []
},

{
  "name": "Fourth Cranial Nerve Palsy",
  "route": "neuro",
  "req": ["vertical_diplopia"],
  "sup": ["head_tilt", "reading_difficulty", "diplopia"],
  "con": ["horizontal_diplopia"],
  "temporal": ["chronic"],
  "tests": ["superior_oblique_defect"],
  "exclusions": []
},

{
  "name": "Internuclear Ophthalmoplegia (INO)",
  "route": "neuro",
  "req": ["adduction_deficit"],
  "sup": ["nystagmus_other_eye", "diplopia", "ms_history"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["MLF_lesion_sign"],
  "exclusions": []
},

{
  "name": "Homonymous Hemianopia",
  "route": "neuro",
  "req": ["field_loss_half"],
  "sup": ["sudden_onset", "older_age", "hypertension_history"],
  "con": ["temporal_field_loss"],
  "temporal": ["acute"],
  "tests": ["visual_field_test"],
  "exclusions": []
},

{
  "name": "Bitemporal Hemianopia",
  "route": "neuro",
  "req": ["temporal_field_loss"],
  "sup": ["headache", "reduced_vision", "color_vision_loss"],
  "con": ["field_loss_half"],
  "temporal": ["progressive"],
  "tests": ["chiasmal_lesion_pattern"],
  "exclusions": []
},

{
  "name": "Quadrantanopia",
  "route": "neuro",
  "req": ["quadrant_field_loss"],
  "sup": ["sudden_onset", "headache"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["visual_field_localization"],
  "exclusions": []
},

{
  "name": "Optic Atrophy",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["pale_disc", "reduced_contrast", "color_vision_loss", "field_defect"],
  "con": ["redness"],
  "temporal": ["chronic"],
  "tests": ["pale_disc"],
  "exclusions": []
},

{
  "name": "Cortical Visual Impairment",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["young_age", "field_defect", "visual_disturbance"],
  "con": ["redness", "pain"],
  "temporal": ["variable"],
  "tests": ["normal_fundus", "neuro_imaging"],
  "exclusions": []
},

/* NEEDS_CLINICAL_REVIEW (2026-07-12 additions) */
{
  "name": "Thyroid Eye Disease",
  "route": "neuro",
  "req": ["proptosis"],
  "sup": ["thyroid_history", "lid_retraction", "diplopia", "restricted_motility", "vertical_diplopia", "grittiness", "dryness", "redness"],
  "con": ["sudden_vision_loss"],
  "temporal": ["chronic", "progressive"],
  "tests": ["proptosis", "thyroid_function_tests"],
  "urgent": false,
  "exclusions": []
},

{
  "name": "Horner Syndrome",
  "route": "neuro",
  "req": ["ptosis", "anisocoria"],
  "sup": ["headache", "pain"],
  /* CN III palsy causes ptosis WITH diplopia; Horner does not — founder to
     confirm this discriminator */
  "con": ["diplopia"],
  "temporal": [],
  "tests": ["apraclonidine_test", "anisocoria_dark_greater"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Migraine with Visual Aura",
  "route": "neuro",
  "req": ["scintillating_scotoma"],
  "sup": ["headache", "transient_vision_loss", "vomiting", "photophobia"],
  "con": ["redness", "field_loss"],
  "temporal": ["intermittent"],
  "tests": [],
  "urgent": false,
  "exclusions": []
}

];
