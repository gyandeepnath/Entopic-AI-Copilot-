/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — NEURO-OPHTHALMIC DOMAIN                        */
/* 16 conditions — DO NOT MODIFY                                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_NEURO = [

{
  "name": "Optic Neuritis",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["pain_eye_movement", "color_vision_loss", "young_age"],
  "con": ["severe_pain_constant"],
  "temporal": ["acute"],
  "tests": ["RAPD", "reduced_color_vision", "normal_or_swollen_disc"],
  "exclusions": []
},

{
  "name": "Ischemic Optic Neuropathy (AION)",
  "route": "urgent",
  "req": ["sudden_vision_loss"],
  "sup": ["painless", "older_age"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["disc_edema", "altitudinal_field_defect"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Compressive Optic Neuropathy",
  "route": "urgent",
  "req": ["progressive_vision_loss"],
  "sup": ["field_defect", "color_vision_loss"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["optic_atrophy", "visual_field_defect"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Papilledema",
  "route": "urgent",
  "req": ["bilateral_disc_swelling"],
  "sup": ["headache", "vomiting", "transient_vision_blur"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["disc_edema", "raised_intracranial_pressure"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Third Cranial Nerve Palsy",
  "route": "urgent",
  "req": ["ptosis"],
  "sup": ["diplopia", "eye_down_out", "pupil_involvement"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["motility_defect", "pupil_abnormal"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Sixth Cranial Nerve Palsy",
  "route": "neuro",
  "req": ["horizontal_diplopia"],
  "sup": ["limited_abduction", "worse_distance"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["abduction_defect"],
  "exclusions": []
},

{
  "name": "Fourth Cranial Nerve Palsy",
  "route": "neuro",
  "req": ["vertical_diplopia"],
  "sup": ["head_tilt", "reading_difficulty"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["superior_oblique_defect"],
  "exclusions": []
},

{
  "name": "Internuclear Ophthalmoplegia (INO)",
  "route": "neuro",
  "req": ["adduction_deficit"],
  "sup": ["nystagmus_other_eye", "diplopia"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["MLF_lesion_sign"],
  "exclusions": []
},

{
  "name": "Homonymous Hemianopia",
  "route": "neuro",
  "req": ["field_loss_half"],
  "sup": ["same_side_both_eyes"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["visual_field_test"],
  "exclusions": []
},

{
  "name": "Bitemporal Hemianopia",
  "route": "neuro",
  "req": ["temporal_field_loss"],
  "sup": ["both_eyes"],
  "con": [],
  "temporal": ["progressive"],
  "tests": ["chiasmal_lesion_pattern"],
  "exclusions": []
},

{
  "name": "Quadrantanopia",
  "route": "neuro",
  "req": ["quadrant_field_loss"],
  "sup": ["localized_defect"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["visual_field_localization"],
  "exclusions": []
},

{
  "name": "Optic Atrophy",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["pale_disc", "reduced_contrast"],
  "con": [],
  "temporal": ["chronic"],
  "tests": ["optic_disc_pallor"],
  "exclusions": []
},

{
  "name": "Cortical Visual Impairment",
  "route": "neuro",
  "req": ["vision_loss"],
  "sup": ["normal_eye_exam", "brain_origin"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["normal_fundus", "neuro_imaging"],
  "exclusions": []
},

/* NEEDS_CLINICAL_REVIEW (added 2026-07-12, founder-requested expansion):
   the next three entries are AI-authored textbook feature sets — verify
   tokens, urgency flags and the Horner con:diplopia discriminator. */
{
  "name": "Thyroid Eye Disease",
  "route": "neuro",
  "req": ["proptosis"],
  "sup": ["thyroid_history", "lid_retraction", "diplopia", "restricted_motility", "vertical_diplopia", "grittiness", "dryness", "redness"],
  "con": [],
  "temporal": ["chronic", "progressive"],
  "tests": ["exophthalmometry", "thyroid_function_tests"],
  "urgent": false,
  "exclusions": []
},

{
  "name": "Horner Syndrome",
  "route": "neuro",
  "req": ["ptosis", "anisocoria"],
  "sup": ["headache"],
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
