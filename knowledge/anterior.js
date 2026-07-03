/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — ANTERIOR / UVEITIS DOMAIN                     */
/* 10 conditions — Added by system                                 */
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
  "sup": ["photophobia", "reduced_corneal_sensation", "raised_iop", "sector_iris_atrophy"],
  "con": [],
  "temporal": ["recurrent"],
  "tests": ["stellate_KPs", "iris_transillumination", "IOP_elevated"],
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
  "tests": ["cells_present", "hypermature_lens", "IOP_elevated"],
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
}

];
