/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — LENS DOMAIN                                    */
/* 8 conditions.                                                    */
/*                                                                  */
/* ENRICHED 2026-07-13 (NEEDS_CLINICAL_REVIEW): each cataract/lens   */
/* condition given a deep profile — supportive glare/contrast/night  */
/* symptoms + risk factors, and contradicting red-flags (sudden      */
/* loss, pain, distortion, flashes) that argue against a slow lens   */
/* opacity and point to retinal/other pathology. Dead tokens         */
/* replaced. Required tokens unchanged. Founder to verify.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_LENS = [

{
  "name": "Nuclear Sclerotic Cataract",
  "route": "lens",
  "req": ["gradual_blur"],
  "sup": ["glare", "reduced_contrast", "older_age", "ghosting", "halos", "difficulty_reading", "night_blindness", "reduced_vision", "distance_blur", "nuclear_sclerosis_grade_2", "nuclear_sclerosis_grade_4"],
  "con": ["sudden_onset", "sudden_vision_loss", "pain", "distortion", "field_loss", "flashes"],
  "temporal": ["progressive", "chronic"],
  "tests": ["nuclear_sclerosis_grade_3", "reduced_vision"],
  "exclusions": []
},

{
  "name": "Cortical Cataract",
  "route": "lens",
  "req": ["glare"],
  "sup": ["gradual_blur", "ghosting", "older_age", "halos", "reduced_contrast", "night_blindness", "difficulty_reading", "fluctuating_blur"],
  "con": ["sudden_onset", "sudden_vision_loss", "pain", "distortion", "field_loss"],
  "temporal": ["progressive"],
  "tests": ["cortical_opacity"],
  "exclusions": []
},

{
  "name": "Posterior Subcapsular Cataract (PSC)",
  "route": "lens",
  "req": ["near_blur"],
  "sup": ["glare", "difficulty_reading", "steroid_history", "young_age", "halos", "reduced_vision", "night_blindness", "diabetes_history"],
  "con": ["sudden_onset", "sudden_vision_loss", "pain", "distortion", "field_loss"],
  "temporal": ["progressive"],
  "tests": ["psc_opacity", "near_blur"],
  "exclusions": []
},

{
  "name": "Traumatic Cataract",
  "route": "lens",
  "req": ["trauma_history"],
  "sup": ["blur", "reduced_vision", "gradual_blur", "glare", "recent_eye_trauma", "ghosting", "hyphema_visible"],
  "con": ["sudden_vision_loss", "redness", "itching_dominant"],
  "temporal": ["variable"],
  "tests": ["lens_opacity", "zonule_assessment"],
  "exclusions": []
},

{
  "name": "Congenital Cataract",
  "route": "lens",
  "req": ["leukocoria"],
  "sup": ["young_age", "family_history", "reduced_vision", "squinting"],
  "con": ["older_age", "pain", "redness", "gradual_blur"],
  "temporal": ["chronic"],
  "tests": ["white_cataract", "lens_opacity"],
  "exclusions": []
},

{
  "name": "Drug-induced Cataract (Steroid)",
  "route": "lens",
  "req": ["steroid_history"],
  "sup": ["glare", "near_blur", "gradual_blur", "reduced_vision", "difficulty_reading", "halos", "raised_iop_risk"],
  "con": ["sudden_onset", "sudden_vision_loss", "pain", "distortion", "field_loss"],
  "temporal": ["progressive"],
  "tests": ["psc_opacity"],
  "exclusions": []
},

{
  "name": "Posterior Capsular Opacification (PCO)",
  "route": "lens",
  "req": ["post_cataract_surgery_blur"],
  "sup": ["glare", "reduced_vision", "post_surgery", "gradual_blur", "halos", "ghosting", "difficulty_reading"],
  "con": ["sudden_vision_loss", "pain", "redness", "flashes", "floaters"],
  "temporal": ["progressive"],
  "tests": ["pco"],
  "exclusions": []
},

{
  "name": "Lens Subluxation / Dislocation",
  "route": "urgent",
  "req": ["lens_displacement"],
  "sup": ["ghosting", "fluctuating_blur", "family_history", "trauma_history", "recent_eye_trauma", "reduced_vision", "distance_blur", "irregular_astigmatism", "young_age"],
  "con": ["redness", "itching_dominant"],
  "temporal": ["variable"],
  "tests": ["phacodonesis", "subluxation"],
  "urgent": true,
  "exclusions": []
}

];
