/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — ANTERIOR / UVEITIS DOMAIN                     */
/* 13 conditions — Added by system                                 */
/* ═══════════════════════════════════════════════════════════════ */

var KB_ANTERIOR = [

{
  "name": "Anterior Uveitis (Acute)",
  "route": "anterior",
  "req": ["pain", "photophobia"],
  "sup": ["redness", "ciliary_flush", "reduced_vision", "miosis"],
  "con": ["itching_dominant", "purulent_discharge"],
  "temporal": ["acute"],
  "tests": ["cells_present", "flare_present", "keratic_precipitates"],
  "exclusions": ["allergic_conjunctivitis", "bacterial_conjunctivitis"]
},

{
  "name": "Anterior Uveitis (Chronic / Recurrent)",
  "route": "anterior",
  "req": ["pain", "photophobia"],
  "sup": ["recurrent_episode", "synechiae", "reduced_vision"],
  "con": [],
  "temporal": ["recurrent", "chronic"],
  "tests": ["cells_present", "posterior_synechiae", "band_keratopathy"],
  "exclusions": []
},

{
  "name": "Intermediate Uveitis",
  "route": "anterior",
  "req": ["floaters"],
  "sup": ["blur", "snowbanking", "young_age"],
  "con": ["pain_severe"],
  "temporal": ["chronic"],
  "tests": ["vitreous_cells", "snowball_opacities"],
  "exclusions": []
},

{
  "name": "Posterior Uveitis",
  "route": "retina",
  "req": ["blur"],
  "sup": ["floaters", "reduced_vision", "chorioretinal_lesion"],
  "con": [],
  "temporal": ["variable"],
  "tests": ["fundal_lesion", "vitreous_haze"],
  "exclusions": []
},

{
  "name": "Panuveitis",
  "route": "urgent",
  "req": ["pain", "blur"],
  "sup": ["photophobia", "redness", "floaters", "reduced_vision"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["cells_present", "vitreous_cells", "fundal_involvement"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "HLA-B27 Associated Uveitis",
  "route": "anterior",
  "req": ["pain", "photophobia"],
  "sup": ["unilateral", "alternating", "young_male", "back_pain_history"],
  "con": [],
  "temporal": ["acute", "recurrent"],
  "tests": ["cells_present", "fibrin", "hypopyon_possible"],
  "exclusions": []
},

{
  "name": "Herpetic Anterior Uveitis",
  "route": "anterior",
  "req": ["pain"],
  "sup": ["photophobia", "reduced_corneal_sensation", "high_iop", "sector_iris_atrophy"],
  "con": [],
  "temporal": ["recurrent"],
  "tests": ["stellate_KPs", "iris_transillumination", "high_iop"],
  "exclusions": []
},

{
  "name": "Traumatic Iritis",
  "route": "anterior",
  "req": ["pain"],
  "sup": ["trauma_history", "photophobia", "redness"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["cells_present", "hyphema_possible"],
  "exclusions": []
},

{
  "name": "Lens-induced Uveitis",
  "route": "anterior",
  "req": ["pain"],
  "sup": ["mature_cataract", "phacolytic", "reduced_vision"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["cells_present", "hypermature_lens", "high_iop"],
  "exclusions": []
},

{
  "name": "Hypopyon Uveitis",
  "route": "urgent",
  "req": ["hypopyon_visible"],
  "sup": ["pain_severe", "photophobia", "redness", "reduced_vision"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["hypopyon_level", "cells_present"],
  "urgent": true,
  "exclusions": []
},

/* NEEDS_CLINICAL_REVIEW (added 2026-07-12, founder-requested expansion):
   the next three entries are AI-authored textbook feature sets — verify
   tokens, urgency flags and the scleritis→episcleritis exclusion. */
{
  "name": "Endophthalmitis",
  "route": "urgent",
  "req": ["pain_severe", "reduced_vision"],
  "sup": ["post_surgery", "hypopyon_visible", "redness", "photophobia", "lid_swelling_diffuse", "vision_hazy"],
  "con": [],
  "temporal": ["acute"],
  "tests": ["B_scan_ultrasound", "AC_cells_flare"],
  "urgent": true,
  "exclusions": []
},

{
  "name": "Scleritis",
  "route": "anterior",
  "req": ["deep_boring_pain"],
  "sup": ["pain_worse_night", "redness", "sectoral_redness", "tenderness", "photophobia", "watering", "autoimmune_history"],
  "con": ["itching_dominant", "purulent_discharge"],
  "temporal": ["progressive"],
  "tests": ["phenylephrine_no_blanch", "scleral_edema"],
  "urgent": true,
  /* a high-scoring scleritis picture supersedes episcleritis — founder to
     confirm (episcleritis is benign; scleritis is the sight-threatening one) */
  "exclusions": ["episcleritis"]
},

{
  "name": "Episcleritis",
  "route": "anterior",
  "req": ["sectoral_redness"],
  "sup": ["redness", "watering", "photophobia_mild"],
  "con": ["pain_severe", "purulent_discharge", "reduced_vision"],
  "temporal": ["acute", "intermittent"],
  "tests": ["phenylephrine_blanch"],
  "urgent": false,
  "exclusions": []
}

];
