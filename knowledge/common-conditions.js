/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — "COMMON IN PRACTICE" CONDITION LIST                   */
/*                                                                  */
/* A curated set of the bread-and-butter conditions an optometrist  */
/* / general ophthalmologist encounters regularly — used to offer a */
/* "Common" scope in the study quiz (vs "All").                    */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — commonness is a clinical/epidemiological*/
/* judgement. This list is a DEFAULT drafted from general practice   */
/* patterns; it is NOT verified prevalence data and must be reviewed */
/* and adjusted by the founder. It carries NO thresholds, statistics */
/* or diagnostic weight — it only decides which conditions the quiz  */
/* draws from in "Common" mode. Every name here must match a real KB */
/* condition (a test enforces this).                                */
/*                                                                  */
/* This does NOT touch the diagnostic engine, scoring, or the KB     */
/* itself in any way. It is a study-mode convenience only.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_COMMON_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Names must exactly match entries in KNOWLEDGE_ALL. */
var KB_COMMON_CONDITIONS = [
  /* Refractive & accommodative */
  "Myopia", "Hyperopia", "Astigmatism", "Presbyopia", "Anisometropia",
  "Amblyopia (Refractive)", "High (Pathological) Myopia", "Pseudomyopia (Accommodative Spasm)",

  /* Binocular vision & strabismus (common) */
  "Convergence Insufficiency", "Convergence Excess", "Accommodative Insufficiency",
  "Accommodative Esotropia", "Intermittent Exotropia", "Esotropia",
  "Decompensated Phoria", "Vertical Heterophoria",
  "Computer Vision Syndrome (Digital Eye Strain)", "Strabismic Amblyopia",
  "Anisometropic Amblyopia",

  /* Ocular surface, lids & lacrimal */
  "Dry Eye Disease - Aqueous Deficient", "Dry Eye Disease - Evaporative (MGD)",
  "Blepharitis - Anterior", "Blepharitis - Posterior (MGD)",
  "Chalazion", "Hordeolum (Stye)",
  "Bacterial Conjunctivitis", "Viral Conjunctivitis", "Allergic Conjunctivitis",
  "Subconjunctival Hemorrhage", "Pinguecula", "Pterygium", "Episcleritis",
  "Ectropion", "Entropion", "Trichiasis", "Dermatochalasis", "Xanthelasma",
  "Involutional Ptosis", "Dacryocystitis", "Nasolacrimal Duct Obstruction (Congenital)",
  "Ocular Rosacea", "Chemosis (Conjunctival Edema)", "Conjunctival Concretions",

  /* Cornea (common) */
  "Corneal Abrasion", "Corneal Foreign Body (Metallic)", "Recurrent Corneal Erosion",
  "Herpes Simplex Keratitis", "Microbial Keratitis", "Corneal Ulcer",
  "Contact Lens Related Keratitis", "Marginal Keratitis",
  "Herpes Zoster Ophthalmicus (Corneal)", "Keratoconus", "Photokeratitis",
  "Contact Lens Overwear (Corneal Hypoxia)",

  /* Lens */
  "Nuclear Sclerotic Cataract", "Cortical Cataract", "Posterior Subcapsular Cataract (PSC)",
  "Mature Cataract", "Posterior Capsular Opacification (PCO)", "Pseudophakia",

  /* Glaucoma (common) */
  "Primary Open Angle Glaucoma (POAG)", "Normal Tension Glaucoma (NTG)",
  "Glaucoma Suspect / Ocular Hypertension", "Primary Angle Closure Glaucoma (PACG)",
  "Acute Angle Closure Crisis", "Pseudoexfoliation Glaucoma", "Pigmentary Glaucoma",
  "Uveitic Glaucoma",

  /* Retina & posterior segment (common) */
  "Diabetic Retinopathy", "Diabetic Macular Edema", "Proliferative Diabetic Retinopathy",
  "Hypertensive Retinopathy", "Age-related Macular Degeneration (Dry)",
  "Age-related Macular Degeneration (Wet)", "Posterior Vitreous Detachment (PVD)",
  "Retinal Detachment", "Retinal Tear", "Branch Retinal Vein Occlusion (BRVO)",
  "Central Retinal Vein Occlusion (CRVO)", "Central Retinal Artery Occlusion (CRAO)",
  "Epiretinal Membrane (ERM)", "Macular Hole", "Central Serous Chorioretinopathy",
  "Vitreous Hemorrhage", "Retinitis Pigmentosa", "Vitreous Floaters (Benign)",

  /* Uvea / inflammation (common) */
  "Anterior Uveitis (Acute)",

  /* Neuro-ophthalmic (common enough to see) */
  "Third Cranial Nerve Palsy", "Sixth Cranial Nerve Palsy", "Optic Neuritis",
  "Papilledema", "Giant Cell Arteritis (Arteritic AION)", "Ischemic Optic Neuropathy (AION)",
  "Migraine with Visual Aura", "Thyroid Eye Disease", "Horner Syndrome",
  "Facial Nerve Palsy (Bell's) — Ocular",

  /* Orbit / trauma / emergencies (common presentations) */
  "Preseptal Cellulitis", "Orbital Cellulitis", "Chemical Eye Burn",
  "Traumatic Hyphema"
];

/* Fast membership set (browser + Node). */
var KB_COMMON_SET = (function () {
  var s = {};
  for (var i = 0; i < KB_COMMON_CONDITIONS.length; i++) s[KB_COMMON_CONDITIONS[i]] = true;
  return s;
})();

function isCommonCondition(name) { return !!KB_COMMON_SET[name]; }

if (typeof module !== "undefined" && module.exports) {
  module.exports = { KB_COMMON_CONDITIONS: KB_COMMON_CONDITIONS, KB_COMMON_SET: KB_COMMON_SET, isCommonCondition: isCommonCondition };
}
