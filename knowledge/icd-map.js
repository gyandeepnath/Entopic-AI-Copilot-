/* ═══════════════════════════════════════════════════════════════ */
/* ICD-10-CM CODE MAP                                              */
/*                                                                  */
/* Maps condition display names → a DEFAULT ICD-10-CM code.         */
/* Loaded before loader.js, which backfills each condition's `icd`  */
/* field from here (engine + coding page already read `cond.icd`).  */
/*                                                                  */
/* PROVENANCE & SAFETY                                              */
/* - Every code here was looked up and validated against the        */
/*   ICD-10-CM 2026 code set (via the connected ICD-10 MCP tool).    */
/*   Codes are real and billable (valid_for_hipaa_transactions);     */
/*   none were invented.                                            */
/* - Defaults use the "unspecified eye / unspecified stage" variant, */
/*   because the app does not yet capture laterality/stage at coding */
/*   time. The clinician must refine laterality/stage/etiology.     */
/* - `status: "NEEDS_CLINICAL_REVIEW"` on every entry: the founder    */
/*   must confirm each mapping is the correct code for the intended  */
/*   clinical entity before it is treated as authoritative. A valid  */
/*   code is not necessarily the RIGHT code for a given condition.   */
/* - Entries flagged `caution` are known judgment calls (ambiguous   */
/*   mapping, a non-specific "unspecified/other" bucket, or an       */
/*   assumption such as diabetes type / laterality).                 */
/*                                                                  */
/* Coverage: all 130 conditions. Regenerate/extend by hand, one      */
/* verified code at a time. Conditions with no sensible single code  */
/* are deliberately left uncoded (`icd: ""`, handled gracefully) and */
/* listed in NEEDS_REVIEW.md.                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ICD_MAP = {

  /* ═══ Expansion 2026-07-12 (founder-requested) — all codes verified real
     and billable via ICD-10 tool; default to unspecified eye/laterality.
     Every entry NEEDS_CLINICAL_REVIEW like the rest of the map. ═══ */
  "Orbital Cellulitis":
    { icd10: "H05.019", label: "Cellulitis of unspecified orbit", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "sight/life-threatening; laterality per patient (H05.011 R / H05.012 L)", verified: "2026-07-12 ICD-10-CM 2026" },
  "Endophthalmitis":
    { icd10: "H44.009", label: "Unspecified purulent endophthalmitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "purulent bucket; post-op vs endogenous vs parasitic differ (H44.1-)", verified: "2026-07-12 ICD-10-CM 2026" },
  "Scleritis":
    { icd10: "H15.009", label: "Unspecified scleritis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "anterior H15.01- is more specific; code systemic association separately", verified: "2026-07-12 ICD-10-CM 2026" },
  "Episcleritis":
    { icd10: "H15.109", label: "Unspecified episcleritis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "nodular H15.12- if nodular", verified: "2026-07-12 ICD-10-CM 2026" },
  "Thyroid Eye Disease":
    { icd10: "H05.20", label: "Unspecified exophthalmos", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "site code only; code Graves/thyroid dysfunction (E05.-) and any optic neuropathy separately; H06.2- for dysthyroid exophthalmos may be preferable", verified: "2026-07-12 ICD-10-CM 2026" },
  "Horner Syndrome":
    { icd10: "G90.2", label: "Horner's syndrome", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "neurologic code; underlying cause must be sought and coded", verified: "2026-07-12 ICD-10-CM 2026" },
  "Migraine with Visual Aura":
    { icd10: "G43.109", label: "Migraine with aura, not intractable, without status migrainosus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "neurologic code; ophthalmic exam typically normal", verified: "2026-07-12 ICD-10-CM 2026" },

  /* ═══ Glaucoma ═══ */
  "Primary Open Angle Glaucoma (POAG)":
    { icd10: "H40.1190", label: "Primary open-angle glaucoma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Primary Angle Closure Glaucoma (PACG)":
    { icd10: "H40.2290", label: "Chronic angle-closure glaucoma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Acute Angle Closure Crisis":
    { icd10: "H40.219", label: "Acute angle-closure glaucoma, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Normal Tension Glaucoma (NTG)":
    { icd10: "H40.1290", label: "Low-tension glaucoma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Glaucoma Suspect / Ocular Hypertension":
    { icd10: "H40.059", label: "Ocular hypertension, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "true glaucoma-suspect (H40.00-) differs from ocular hypertension; confirm intent", verified: "2026-07-04 ICD-10-CM 2026" },
  "Pigmentary Glaucoma":
    { icd10: "H40.1390", label: "Pigmentary glaucoma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Pseudoexfoliation Glaucoma":
    { icd10: "H40.1490", label: "Capsular glaucoma with pseudoexfoliation of lens, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Neovascular Glaucoma":
    { icd10: "H40.849", label: "Neovascular secondary angle closure glaucoma, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Refractive ═══ */
  "Myopia":
    { icd10: "H52.10", label: "Myopia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Hyperopia":
    { icd10: "H52.00", label: "Hypermetropia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Astigmatism":
    { icd10: "H52.209", label: "Unspecified astigmatism, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Presbyopia":
    { icd10: "H52.4", label: "Presbyopia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Anisometropia":
    { icd10: "H52.31", label: "Anisometropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Binocular Vision ═══ */
  "Convergence Insufficiency":
    { icd10: "H51.11", label: "Convergence insufficiency", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Convergence Excess":
    { icd10: "H51.12", label: "Convergence excess", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Divergence Insufficiency":
    { icd10: "H51.8", label: "Other specified disorders of binocular movement", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no specific divergence-insufficiency code; non-specific bucket", verified: "2026-07-04 ICD-10-CM 2026" },
  "Divergence Excess":
    { icd10: "H51.8", label: "Other specified disorders of binocular movement", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no specific divergence-excess code; non-specific bucket", verified: "2026-07-04 ICD-10-CM 2026" },
  "Accommodative Insufficiency":
    { icd10: "H52.529", label: "Paresis of accommodation, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "paresis code used as nearest match for accommodative insufficiency", verified: "2026-07-04 ICD-10-CM 2026" },
  "Accommodative Excess":
    { icd10: "H52.539", label: "Spasm of accommodation, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Accommodative Infacility":
    { icd10: "H53.30", label: "Unspecified disorder of binocular vision", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no specific accommodative-infacility code; generic binocular-vision bucket", verified: "2026-07-04 ICD-10-CM 2026" },
  "Fusional Vergence Dysfunction":
    { icd10: "H53.30", label: "Unspecified disorder of binocular vision", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no specific fusional-vergence code; generic binocular-vision bucket", verified: "2026-07-04 ICD-10-CM 2026" },
  "Intermittent Exotropia":
    { icd10: "H50.30", label: "Unspecified intermittent heterotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "H50.33-/H50.34 specify monocular vs alternating — refine", verified: "2026-07-04 ICD-10-CM 2026" },
  "Esotropia":
    { icd10: "H50.00", label: "Unspecified esotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Retina ═══ */
  "Posterior Vitreous Detachment (PVD)":
    { icd10: "H43.811", label: "Vitreous degeneration, right eye", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "no dedicated PVD code; vitreous-degeneration used and defaults to right eye — refine laterality (H43.812/813)", verified: "2026-07-04 ICD-10-CM 2026" },
  "Retinal Tear":
    { icd10: "H33.319", label: "Horseshoe tear of retina without detachment, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "operculated/atrophic tears use different codes", verified: "2026-07-04 ICD-10-CM 2026" },
  "Retinal Detachment":
    { icd10: "H33.009", label: "Unspecified retinal detachment with retinal break, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "tractional/serous RD use H33.4-/H33.2-", verified: "2026-07-04 ICD-10-CM 2026" },
  "Age-related Macular Degeneration (Dry)":
    { icd10: "H35.3190", label: "Nonexudative age-related macular degeneration, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Age-related Macular Degeneration (Wet)":
    { icd10: "H35.3290", label: "Exudative age-related macular degeneration, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Diabetic Retinopathy":
    { icd10: "E11.319", label: "Type 2 diabetes mellitus with unspecified diabetic retinopathy without macular edema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "ASSUMES type-2 DM and no macular edema; type-1 uses E10.319, and severity/ME change the code — confirm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Serous Chorioretinopathy":
    { icd10: "H35.719", label: "Central serous chorioretinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Retinal Artery Occlusion (CRAO)":
    { icd10: "H34.10", label: "Central retinal artery occlusion, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Retinal Vein Occlusion (CRVO)":
    { icd10: "H34.8112", label: "Central retinal vein occlusion, right eye, stable", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "CRVO codes require eye + stability + macular-edema status; defaults to right/stable — refine", verified: "2026-07-04 ICD-10-CM 2026" },
  "Macular Hole":
    { icd10: "H35.349", label: "Macular cyst, hole, or pseudohole, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Epiretinal Membrane (ERM)":
    { icd10: "H35.379", label: "Puckering of macula, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "code inferred (H35.37- puckering of macula); confirm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Cystoid Macular Edema (CME)":
    { icd10: "H35.351", label: "Cystoid macular degeneration, right eye", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "H35.35- (cystoid macular degeneration) inferred and defaults to right; post-surgical CME is H59.03-", verified: "2026-07-04 ICD-10-CM 2026" },
  "Macular Edema (General)":
    { icd10: "H35.81", label: "Retinal edema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "generic retinal-edema bucket; underlying cause should be coded", verified: "2026-07-04 ICD-10-CM 2026" },
  "Vitreous Hemorrhage":
    { icd10: "H43.10", label: "Vitreous hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Retinitis Pigmentosa":
    { icd10: "H35.52", label: "Pigmentary retinal dystrophy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Hypertensive Retinopathy":
    { icd10: "H35.039", label: "Hypertensive retinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Branch Retinal Vein Occlusion (BRVO)":
    { icd10: "H34.8312", label: "Tributary (branch) retinal vein occlusion, right eye, stable", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "BRVO codes require eye + stability + macular-edema status; defaults to right/stable — refine", verified: "2026-07-04 ICD-10-CM 2026" },
  "Lattice Degeneration":
    { icd10: "H35.419", label: "Lattice degeneration of retina, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Choroidal Nevus":
    { icd10: "D31.30", label: "Benign neoplasm of unspecified choroid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign choroidal neoplasm site code", verified: "2026-07-04 ICD-10-CM 2026" },
  "Choroidal Melanoma":
    { icd10: "C69.30", label: "Malignant neoplasm of unspecified choroid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "site code for malignant choroidal neoplasm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Macular Telangiectasia":
    { icd10: "H35.079", label: "Retinal telangiectasis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "retinal-telangiectasis code used for macular telangiectasia — confirm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Retinal Artery Occlusion (Transient / Amaurosis Fugax)":
    { icd10: "G45.3", label: "Amaurosis fugax", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Neuro-Ophthalmic ═══ */
  "Optic Neuritis":
    { icd10: "H46.9", label: "Unspecified optic neuritis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Ischemic Optic Neuropathy (AION)":
    { icd10: "H47.019", label: "Ischemic optic neuropathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Compressive Optic Neuropathy":
    { icd10: "H47.099", label: "Other disorders of optic nerve, not elsewhere classified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no specific compressive code; non-specific bucket — verify", verified: "2026-07-04 ICD-10-CM 2026" },
  "Papilledema":
    { icd10: "H47.10", label: "Unspecified papilledema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "H47.11 if raised ICP confirmed", verified: "2026-07-04 ICD-10-CM 2026" },
  "Third Cranial Nerve Palsy":
    { icd10: "H49.00", label: "Third [oculomotor] nerve palsy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Sixth Cranial Nerve Palsy":
    { icd10: "H49.20", label: "Sixth [abducent] nerve palsy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Fourth Cranial Nerve Palsy":
    { icd10: "H49.10", label: "Fourth [trochlear] nerve palsy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Internuclear Ophthalmoplegia (INO)":
    { icd10: "H51.20", label: "Internuclear ophthalmoplegia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Homonymous Hemianopia":
    { icd10: "H53.469", label: "Homonymous bilateral field defects, unspecified side", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Bitemporal Hemianopia":
    { icd10: "H53.47", label: "Heteronymous bilateral field defects", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Quadrantanopia":
    { icd10: "H53.459", label: "Other localized visual field defect, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no dedicated quadrantanopia code; localized-defect bucket inferred", verified: "2026-07-04 ICD-10-CM 2026" },
  "Optic Atrophy":
    { icd10: "H47.20", label: "Unspecified optic atrophy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Cortical Visual Impairment":
    { icd10: "H47.619", label: "Cortical blindness, unspecified side of brain", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "cortical blindness code used for cortical visual impairment — confirm severity/wording", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Surface & Lids ═══ */
  "Dry Eye Disease - Evaporative (MGD)":
    { icd10: "H02.889", label: "Meibomian gland dysfunction of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "MGD coded; associated dry eye (H16.229) may be coded additionally", verified: "2026-07-04 ICD-10-CM 2026" },
  "Dry Eye Disease - Aqueous Deficient":
    { icd10: "H16.229", label: "Keratoconjunctivitis sicca, not specified as Sjogren's, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Allergic Conjunctivitis":
    { icd10: "H10.45", label: "Other chronic allergic conjunctivitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "H10.1- for acute atopic; verify acuity", verified: "2026-07-04 ICD-10-CM 2026" },
  "Bacterial Conjunctivitis":
    { icd10: "H10.029", label: "Other mucopurulent conjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "mucopurulent conjunctivitis used for bacterial; organism-specific codes exist", verified: "2026-07-04 ICD-10-CM 2026" },
  "Viral Conjunctivitis":
    { icd10: "B30.9", label: "Viral conjunctivitis, unspecified", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Blepharitis - Anterior":
    { icd10: "H01.009", label: "Unspecified blepharitis, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Blepharitis - Posterior (MGD)":
    { icd10: "H02.889", label: "Meibomian gland dysfunction of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Demodex Blepharitis":
    { icd10: "H01.009", label: "Unspecified blepharitis, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no Demodex-specific code; unspecified blepharitis used (B88.0 infestation may be added)", verified: "2026-07-04 ICD-10-CM 2026" },
  "Vernal Keratoconjunctivitis":
    { icd10: "H10.44", label: "Vernal conjunctivitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "H16.26- if limbal/corneal involvement", verified: "2026-07-04 ICD-10-CM 2026" },
  "Atopic Keratoconjunctivitis":
    { icd10: "H10.10", label: "Acute atopic conjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Pinguecula":
    { icd10: "H11.159", label: "Pinguecula, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Pterygium":
    { icd10: "H11.009", label: "Unspecified pterygium of unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Subconjunctival Hemorrhage":
    { icd10: "H11.30", label: "Conjunctival hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Conjunctival Cyst":
    { icd10: "H11.449", label: "Conjunctival cysts, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Contact Lens Intolerance":
    { icd10: "H18.829", label: "Corneal disorder due to contact lens, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "corneal-disorder-due-to-CL used; Z46.0 (device fitting) may fit better for pure intolerance", verified: "2026-07-04 ICD-10-CM 2026" },
  "Angular Blepharitis":
    { icd10: "H01.009", label: "Unspecified blepharitis, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no angular-specific code; unspecified blepharitis used", verified: "2026-07-04 ICD-10-CM 2026" },
  "Hordeolum (Stye)":
    { icd10: "H00.019", label: "Hordeolum externum, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Chalazion":
    { icd10: "H00.19", label: "Chalazion, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Preseptal Cellulitis":
    { icd10: "L03.213", label: "Periorbital cellulitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Dacryocystitis":
    { icd10: "H04.309", label: "Unspecified dacryocystitis of unspecified lacrimal passage", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "H04.30- acute vs H04.41- chronic — confirm acuity", verified: "2026-07-04 ICD-10-CM 2026" },
  "Epiphora (Lacrimal Obstruction)":
    { icd10: "H04.209", label: "Unspecified epiphora, unspecified side", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Conjunctival Foreign Body":
    { icd10: "T15.10XA", label: "Foreign body in conjunctival sac, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char (A/D/S) is encounter type — set per visit", verified: "2026-07-04 ICD-10-CM 2026" },
  "Exposure Keratopathy (Surface Related)":
    { icd10: "H16.219", label: "Exposure keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Lagophthalmos":
    { icd10: "H02.209", label: "Unspecified lagophthalmos, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Madarosis":
    { icd10: "H02.729", label: "Madarosis of unspecified eye, unspecified eyelid and periocular area", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Trichiasis":
    { icd10: "H02.059", label: "Trichiasis without entropion, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Entropion":
    { icd10: "H02.009", label: "Unspecified entropion of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Ectropion":
    { icd10: "H02.109", label: "Unspecified ectropion of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Conjunctival Hyperemia (Non-specific)":
    { icd10: "H11.439", label: "Conjunctival hyperemia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Cornea ═══ */
  "Corneal Abrasion":
    { icd10: "S05.00XA", label: "Injury of conjunctiva and corneal abrasion without foreign body, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char (A/D/S) is encounter type — set per visit", verified: "2026-07-04 ICD-10-CM 2026" },
  "Microbial Keratitis":
    { icd10: "H16.9", label: "Unspecified keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code organism-specific keratitis/ulcer where known", verified: "2026-07-04 ICD-10-CM 2026" },
  "Herpes Simplex Keratitis":
    { icd10: "B00.52", label: "Herpesviral keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Herpes Zoster Ophthalmicus (Corneal)":
    { icd10: "B02.33", label: "Zoster keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Corneal Ulcer":
    { icd10: "H16.009", label: "Unspecified corneal ulcer, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Corneal Edema":
    { icd10: "H18.20", label: "Unspecified corneal edema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Recurrent Corneal Erosion":
    { icd10: "H18.839", label: "Recurrent erosion of cornea, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Keratoconus":
    { icd10: "H18.609", label: "Keratoconus, unspecified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Fuchs Endothelial Dystrophy":
    { icd10: "H18.519", label: "Endothelial corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Contact Lens Related Keratitis":
    { icd10: "H16.149", label: "Punctate keratitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "CL-related keratitis mapped to punctate keratitis; H18.82- (corneal disorder due to CL) may be added", verified: "2026-07-04 ICD-10-CM 2026" },
  "Band Keratopathy":
    { icd10: "H18.429", label: "Band keratopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Arcus Senilis":
    { icd10: "H18.419", label: "Arcus senilis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Corneal Scar":
    { icd10: "H17.9", label: "Unspecified corneal scar and opacity", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Marginal Keratitis":
    { icd10: "H16.049", label: "Marginal corneal ulcer, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "marginal keratitis mapped to marginal corneal ulcer; confirm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Phlyctenular Keratoconjunctivitis":
    { icd10: "H16.259", label: "Phlyctenular keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Interstitial Keratitis":
    { icd10: "H16.309", label: "Unspecified interstitial keratitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Neurotrophic Keratitis":
    { icd10: "H16.239", label: "Neurotrophic keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Bullous Keratopathy":
    { icd10: "H18.10", label: "Bullous keratopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Corneal Neovascularization":
    { icd10: "H16.409", label: "Unspecified corneal neovascularization, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Pellucid Marginal Degeneration":
    { icd10: "H18.719", label: "Corneal ectasia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "corneal-ectasia bucket (shared with keratoglobus)", verified: "2026-07-04 ICD-10-CM 2026" },
  "Keratoglobus":
    { icd10: "H18.719", label: "Corneal ectasia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "corneal-ectasia bucket (shared with pellucid marginal degeneration)", verified: "2026-07-04 ICD-10-CM 2026" },
  "Salzmann Nodular Degeneration":
    { icd10: "H18.459", label: "Nodular corneal degeneration, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Thygeson Superficial Punctate Keratitis":
    { icd10: "H16.149", label: "Punctate keratitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Superficial Punctate Keratitis":
    { icd10: "H16.109", label: "Unspecified superficial keratitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Exposure Keratitis":
    { icd10: "H16.219", label: "Exposure keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Anterior / Uveitis ═══ */
  "Anterior Uveitis (Acute)":
    { icd10: "H20.00", label: "Unspecified acute and subacute iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Anterior Uveitis (Chronic / Recurrent)":
    { icd10: "H20.10", label: "Chronic iridocyclitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Intermediate Uveitis":
    { icd10: "H30.20", label: "Posterior cyclitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "pars planitis/intermediate uveitis mapped to posterior cyclitis — confirm", verified: "2026-07-04 ICD-10-CM 2026" },
  "Posterior Uveitis":
    { icd10: "H30.90", label: "Unspecified chorioretinal inflammation, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Panuveitis":
    { icd10: "H44.119", label: "Panuveitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "HLA-B27 Associated Uveitis":
    { icd10: "H20.00", label: "Unspecified acute and subacute iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no HLA-B27-specific code; acute iridocyclitis used — underlying systemic association coded separately", verified: "2026-07-04 ICD-10-CM 2026" },
  "Herpetic Anterior Uveitis":
    { icd10: "B00.51", label: "Herpesviral iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Traumatic Iritis":
    { icd10: "H20.9", label: "Unspecified iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no traumatic-iritis-specific code; unspecified iridocyclitis + external-cause code", verified: "2026-07-04 ICD-10-CM 2026" },
  "Lens-induced Uveitis":
    { icd10: "H20.20", label: "Lens-induced iridocyclitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Hypopyon Uveitis":
    { icd10: "H20.059", label: "Hypopyon, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ═══ Lens ═══ */
  "Nuclear Sclerotic Cataract":
    { icd10: "H25.10", label: "Age-related nuclear cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Cortical Cataract":
    { icd10: "H25.019", label: "Cortical age-related cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Posterior Subcapsular Cataract (PSC)":
    { icd10: "H25.049", label: "Posterior subcapsular polar age-related cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Traumatic Cataract":
    { icd10: "H26.109", label: "Unspecified traumatic cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Congenital Cataract":
    { icd10: "Q12.0", label: "Congenital cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Drug-induced Cataract (Steroid)":
    { icd10: "H26.30", label: "Drug-induced cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "add the causative-drug (T-code) per coding rules", verified: "2026-07-04 ICD-10-CM 2026" },
  "Posterior Capsular Opacification (PCO)":
    { icd10: "H26.499", label: "Other secondary cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "after-cataract / secondary cataract bucket", verified: "2026-07-04 ICD-10-CM 2026" },
  "Lens Subluxation / Dislocation":
    { icd10: "H27.10", label: "Unspecified dislocation of lens", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },


  /* ═══════════════════════════════════════════════════════════════ */
  /* EXPANSION CODING 2026-07-17 (founder-requested — fill the 197     */
  /* provisional expansion conditions that shipped without a code).    */
  /* Every icd10 below was validated real + HIPAA-billable against     */
  /* ICD-10-CM 2026 via the ICD-10 tool before entry; defaults use the */
  /* unspecified-eye / unspecified-stage leaf. NEEDS_CLINICAL_REVIEW   */
  /* on all — a valid code is not proof it is the RIGHT code for the   */
  /* entity; the founder confirms the mapping. Done in domain batches. */
  /* ═══════════════════════════════════════════════════════════════ */

  /* ─ Refractive ─ */
  "Anisometropic Refractive Error":
    { icd10: "H52.31", label: "Anisometropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Pseudomyopia (Accommodative Spasm)":
    { icd10: "H52.539", label: "Spasm of accommodation, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Post-Refractive-Surgery Ectasia":
    { icd10: "H18.719", label: "Corneal ectasia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "post-surgical ectasia coded under corneal ectasia; no procedure-specific code", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Lens ─ */
  "Anterior Polar Cataract":
    { icd10: "Q12.0", label: "Congenital cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "anterior polar is classically congenital; if age-related use H25.03-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Posterior Polar Cataract":
    { icd10: "H26.8", label: "Other specified cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct posterior-polar code; if congenital use Q12.0", verified: "2026-07-17 ICD-10-CM 2026" },
  "Phacomorphic Angle Closure":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "lens-mechanism (intumescent lens); no distinct phacomorphic code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ectopia Lentis (Marfan)":
    { icd10: "Q12.1", label: "Congenital displaced lens", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the Marfan syndrome (Q87.40-) alongside per coding rules", verified: "2026-07-17 ICD-10-CM 2026" },
  "Microspherophakia":
    { icd10: "Q12.8", label: "Other congenital lens malformations", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Binocular Vision ─ */
  "Basic Exotropia":
    { icd10: "H50.10", label: "Unspecified exotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "unspecified exotropia bucket; intermittent/constant subtypes differ (H50.11-/H50.12-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Consecutive Exotropia":
    { icd10: "H50.10", label: "Unspecified exotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct consecutive-XT code; unspecified exotropia bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sensory Strabismus":
    { icd10: "H50.9", label: "Unspecified strabismus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "sensory strabismus has no distinct code; refine by deviation direction", verified: "2026-07-17 ICD-10-CM 2026" },
  "Decompensated Phoria":
    { icd10: "H50.50", label: "Unspecified heterophoria", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Vertical Heterophoria":
    { icd10: "H50.53", label: "Vertical heterophoria", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Amblyopia (Refractive)":
    { icd10: "H53.029", label: "Refractive amblyopia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Accommodative Esotropia":
    { icd10: "H50.43", label: "Accommodative component in esotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Convergence Paralysis":
    { icd10: "H51.8", label: "Other specified disorders of binocular movement", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "convergence paralysis has no distinct code; convergence insufficiency is H51.11", verified: "2026-07-17 ICD-10-CM 2026" },
  "Duane Retraction Syndrome":
    { icd10: "H50.811", label: "Duane's syndrome, right eye", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "no unspecified-eye code; set laterality per patient (H50.812 left)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Brown Syndrome":
    { icd10: "H50.611", label: "Brown's sheath syndrome, right eye", laterality: "right (default)", status: "NEEDS_CLINICAL_REVIEW", caution: "no unspecified-eye code; set laterality per patient (H50.612 left)", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Glaucoma (secondary/mechanism codes; ICD-10 lacks distinct codes for
       most named secondary glaucomas → the H40.x0X0 secondary buckets) ─ */
  "Steroid-Induced Glaucoma":
    { icd10: "H40.60X0", label: "Glaucoma secondary to drugs, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "add the causative-drug T-code per coding rules", verified: "2026-07-17 ICD-10-CM 2026" },
  "Angle Recession Glaucoma":
    { icd10: "H40.30X0", label: "Glaucoma secondary to eye trauma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "add the prior-trauma code per coding rules", verified: "2026-07-17 ICD-10-CM 2026" },
  "Juvenile Open Angle Glaucoma":
    { icd10: "H40.89", label: "Other specified glaucoma", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct juvenile-OAG code; some code as POAG (H40.11-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Neovascular Glaucoma (Diabetic)":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "code the diabetic retinopathy etiology (E1x.39-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Aphakic Glaucoma":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "aphakia-related secondary glaucoma; code aphakia (H27.0-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Uveitis-Glaucoma-Hyphema (UGH) Syndrome":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "IOL-related; no distinct UGH code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Posner-Schlossman Syndrome (Glaucomatocyclitic Crisis)":
    { icd10: "H40.40X0", label: "Glaucoma secondary to eye inflammation, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct Posner-Schlossman code; inflammatory secondary glaucoma", verified: "2026-07-17 ICD-10-CM 2026" },
  "Iridocorneal Endothelial (ICE) Syndrome":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "ICE spectrum; corneal/iris component coded separately (H18.-/H21.-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Malignant Glaucoma (Aqueous Misdirection)":
    { icd10: "H40.839", label: "Aqueous misdirection, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Phacolytic Glaucoma":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "lens-protein mechanism; code the hypermature cataract alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Plateau Iris Syndrome":
    { icd10: "H40.89", label: "Other specified glaucoma", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "plateau-iris angle-closure configuration; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Primary Congenital Glaucoma":
    { icd10: "Q15.0", label: "Congenital glaucoma", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ghost Cell Glaucoma":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "degenerated-RBC mechanism after vitreous hemorrhage; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Schwartz-Matsuo Syndrome":
    { icd10: "H40.50X0", label: "Glaucoma secondary to other eye disorders, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "rhegmatogenous-RD-associated raised IOP; code the detachment alongside", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Anterior / Uveitis ─ */
  "Fuchs Heterochromic Uveitis":
    { icd10: "H20.819", label: "Fuchs' heterochromic cyclitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sarcoid Uveitis":
    { icd10: "D86.83", label: "Sarcoid iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the underlying sarcoidosis (D86.-) as principal per coding rules", verified: "2026-07-17 ICD-10-CM 2026" },
  "Toxoplasma Retinochoroiditis":
    { icd10: "B58.01", label: "Toxoplasma chorioretinitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sympathetic Ophthalmia":
    { icd10: "H44.139", label: "Sympathetic uveitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Pars Planitis":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "intermediate uveitis / pars planitis; posterior-cyclitis family is H30.2-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Posterior Scleritis":
    { icd10: "H15.039", label: "Posterior scleritis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Traumatic Hyphema":
    { icd10: "H21.00", label: "Hyphema, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "code the causative trauma (S05.-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Toxic Anterior Segment Syndrome":
    { icd10: "H21.89", label: "Other specified disorders of iris and ciliary body", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "TASS has no distinct code; post-procedural sterile inflammation", verified: "2026-07-17 ICD-10-CM 2026" },
  "Vogt-Koyanagi-Harada Disease":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "VKH has no distinct code; panuveitis with systemic features", verified: "2026-07-17 ICD-10-CM 2026" },
  "Behcet Disease (Ocular)":
    { icd10: "M35.2", label: "Behcet's disease", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "systemic code; add the ocular manifestation (H20.-/H30.-) per coding rules", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Toxocariasis":
    { icd10: "B83.0", label: "Visceral larva migrans", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "ocular larva migrans; add chorioretinitis (H30.-) as needed", verified: "2026-07-17 ICD-10-CM 2026" },
  "Aniridia":
    { icd10: "Q13.1", label: "Absence of iris", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Juvenile Idiopathic Arthritis (JIA) Uveitis":
    { icd10: "H20.9", label: "Unspecified iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the JIA (M08.-) alongside; typically chronic anterior uveitis (H20.1-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Tubulointerstitial Nephritis & Uveitis (TINU)":
    { icd10: "H20.9", label: "Unspecified iridocyclitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the tubulointerstitial nephritis (N10-N12) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Syphilitic Uveitis":
    { icd10: "A51.43", label: "Secondary syphilitic oculopathy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "stage-dependent; late syphilitic oculopathy is A52.71", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Retina (batch A) ─ */
  "Diabetic Macular Edema":
    { icd10: "E11.311", label: "Type 2 diabetes mellitus with unspecified diabetic retinopathy with macular edema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "assumes type 2; DM1 is E10.311; specify retinopathy severity per patient", verified: "2026-07-17 ICD-10-CM 2026" },
  "Proliferative Diabetic Retinopathy":
    { icd10: "E11.3599", label: "Type 2 diabetes with proliferative diabetic retinopathy without macular edema, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "assumes type 2 without ME; with-ME variant is E11.351-; DM1 is E10.35-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinal Artery Macroaneurysm":
    { icd10: "H35.09", label: "Other intraretinal microvascular abnormalities", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct macroaneurysm code; retinal vascular changes bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Valsalva Retinopathy":
    { icd10: "H35.60", label: "Retinal hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "pre-/sub-hyaloid hemorrhage; retinal hemorrhage bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Central Serous Chorioretinopathy (Chronic)":
    { icd10: "H35.719", label: "Central serous chorioretinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Myopic Macular Degeneration":
    { icd10: "H44.2A9", label: "Degenerative myopia with choroidal neovascularization, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "CNV variant shown; other myopic-maculopathy variants are H44.2B/2C/2D/2E", verified: "2026-07-17 ICD-10-CM 2026" },
  "Stargardt Disease":
    { icd10: "H35.53", label: "Other dystrophies primarily involving the sensory retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "hereditary macular dystrophy bucket; no Stargardt-specific code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Best Vitelliform Dystrophy":
    { icd10: "H35.53", label: "Other dystrophies primarily involving the sensory retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "hereditary macular dystrophy bucket; no Best-specific code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Cone Dystrophy":
    { icd10: "H35.53", label: "Other dystrophies primarily involving the sensory retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "hereditary retinal dystrophy bucket; no cone-dystrophy-specific code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Choroideremia":
    { icd10: "H31.21", label: "Choroideremia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Degenerative Retinoschisis":
    { icd10: "H33.109", label: "Unspecified retinoschisis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "retinoschisis bucket; senile/degenerative not separately coded", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Ischemic Syndrome":
    { icd10: "H35.82", label: "Retinal ischemia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the carotid occlusive disease (I65.2-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Commotio Retinae":
    { icd10: "H35.81", label: "Retinal edema", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "traumatic (Berlin) edema; code the ocular trauma (S05.-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Retina (batch B) ─ */
  "Vitreomacular Traction":
    { icd10: "H43.89", label: "Other disorders of vitreous body", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no distinct VMT code; vitreous-disorder bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Solar (Photic) Retinopathy":
    { icd10: "H35.89", label: "Other specified retinal disorders", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "photic/solar maculopathy; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Hemiretinal Vein Occlusion":
    { icd10: "H34.8390", label: "Tributary (branch) retinal vein occlusion, unspecified eye, with macular edema", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "hemi-RVO coded under branch RVO; without-macular-edema variant is H34.8391-type", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinal Vasculitis":
    { icd10: "H35.069", label: "Retinal vasculitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinopathy of Prematurity (Cicatricial)":
    { icd10: "H35.179", label: "Retrolental fibroplasia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "cicatricial ROP (retrolental fibroplasia); active-stage ROP is H35.10-H35.16", verified: "2026-07-17 ICD-10-CM 2026" },
  "Choroidal Hemangioma":
    { icd10: "D31.30", label: "Benign neoplasm of unspecified choroid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "circumscribed vs diffuse (Sturge-Weber) not distinguished in code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Gyrate Atrophy":
    { icd10: "H31.23", label: "Gyrate atrophy, choroid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Birdshot Chorioretinopathy":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "no birdshot-specific code; posterior chorioretinal inflammation bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Choroidal Rupture":
    { icd10: "H31.309", label: "Unspecified choroidal hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "traumatic choroidal rupture; code the ocular trauma (S05.-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Siderosis (Retained IOFB)":
    { icd10: "H44.329", label: "Siderosis of eye, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "iron IOFB; code the retained intraocular foreign body alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Malignant Hypertensive Retinopathy":
    { icd10: "H35.039", label: "Hypertensive retinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "code the systemic hypertension (I10-I16) alongside; 'malignant' is a severity descriptor", verified: "2026-07-17 ICD-10-CM 2026" },
  "Purtscher Retinopathy":
    { icd10: "H35.89", label: "Other specified retinal disorders", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "Purtscher/Purtscher-like; no distinct code; code the precipitant (trauma/pancreatitis)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Optic Pit Maculopathy":
    { icd10: "Q14.2", label: "Congenital malformation of optic disc", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "the pit is congenital (Q14.2); the serous maculopathy component is coded separately (H35.-)", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Retina (batch C) ─ */
  "Coats Disease":
    { icd10: "H35.029", label: "Exudative retinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "Coats' telangiectatic exudative retinopathy; no eponymous code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sickle Cell Retinopathy":
    { icd10: "H35.89", label: "Other specified retinal disorders", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the sickle-cell disease (D57.-) alongside; no distinct sickle-retinopathy code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Angioid Streaks":
    { icd10: "H35.33", label: "Angioid streaks of macula", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "consider systemic association (pseudoxanthoma elasticum, Paget, sickle) and code it", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Histoplasmosis Syndrome (POHS)":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "presumed ocular histoplasmosis; no distinct code; CNV component coded separately", verified: "2026-07-17 ICD-10-CM 2026" },
  "Multiple Evanescent White Dot Syndrome (MEWDS)":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "white-dot syndrome; no distinct MEWDS code", verified: "2026-07-17 ICD-10-CM 2026" },
  "APMPPE (Acute Posterior Multifocal Placoid Pigment Epitheliopathy)":
    { icd10: "H30.149", label: "Acute posterior multifocal placoid pigment epitheliopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Punctate Inner Choroidopathy (PIC)":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "white-dot/inner-choroidopathy syndrome; no distinct PIC code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Asteroid Hyalosis":
    { icd10: "H43.819", label: "Vitreous degeneration, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "asteroid hyalosis sits in the vitreous-degeneration bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Vitreous Amyloidosis":
    { icd10: "H43.89", label: "Other disorders of vitreous body", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the underlying amyloidosis (E85.-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Familial Exudative Vitreoretinopathy (FEVR)":
    { icd10: "H35.029", label: "Exudative retinopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "familial exudative vitreoretinopathy; exudative-retinopathy bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinoblastoma":
    { icd10: "C69.20", label: "Malignant neoplasm of unspecified retina", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "sight/life-threatening malignancy; set laterality (C69.21 R / C69.22 L); bilateral in hereditary form", verified: "2026-07-17 ICD-10-CM 2026" },
  "Acute Retinal Necrosis (ARN)":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "usually herpetic (VZV/HSV) necrotizing retinitis; code the viral cause (B00.-/B02.-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Cytomegalovirus (CMV) Retinitis":
    { icd10: "B25.9", label: "Cytomegaloviral disease, unspecified", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "CMV retinitis; typically in immunocompromise; code the immune status alongside", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Retina (batch D — completes the domain) ─ */
  "Chorioretinal Coloboma":
    { icd10: "Q14.3", label: "Congenital malformation of choroid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "chorioretinal coloboma; iris/lens/disc colobomas coded separately (Q13.0/Q12.2/Q14.2)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Albinism":
    { icd10: "E70.319", label: "Ocular albinism, unspecified", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "X-linked (Nettleship-Falls) is E70.310; distinguish oculocutaneous forms (E70.3-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Achromatopsia":
    { icd10: "H53.51", label: "Achromatopsia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Terson Syndrome":
    { icd10: "H43.10", label: "Vitreous hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "vitreous/intraretinal hemorrhage with intracranial hemorrhage — code the CNS bleed (I60.-) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Serpiginous Choroiditis":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "serpiginous (geographic) choroiditis; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Leber Congenital Amaurosis":
    { icd10: "H35.50", label: "Unspecified hereditary retinal dystrophy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "severe infantile hereditary retinal dystrophy; no LCA-specific code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Uveal Effusion Syndrome":
    { icd10: "H31.409", label: "Unspecified choroidal detachment, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "idiopathic uveal effusion; serous choroidal/ciliary detachment", verified: "2026-07-17 ICD-10-CM 2026" },
  "Choroidal Effusion (Post-operative)":
    { icd10: "H31.409", label: "Unspecified choroidal detachment, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "post-operative serous choroidal effusion; serous variant is H31.41-, hemorrhagic H31.42-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Multifocal Choroiditis & Panuveitis":
    { icd10: "H30.899", label: "Other chorioretinal inflammations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "multifocal choroiditis with panuveitis; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Acute Zonal Occult Outer Retinopathy (AZOOR)":
    { icd10: "H35.89", label: "Other specified retinal disorders", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "AZOOR outer-retinopathy spectrum; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Cancer-Associated Retinopathy (CAR)":
    { icd10: "H35.89", label: "Other specified retinal disorders", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "paraneoplastic retinopathy; code the underlying malignancy alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Eales Disease":
    { icd10: "H35.069", label: "Retinal vasculitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "Eales' idiopathic peripheral periphlebitis; retinal-vasculitis bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Hypotony Maculopathy":
    { icd10: "H44.40", label: "Unspecified hypotony of eye", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "maculopathy secondary to ocular hypotony; code the cause (over-filtration, leak, cyclitis)", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Cornea (batch A) ─ */
  "Acanthamoeba Keratitis":
    { icd10: "B60.13", label: "Keratoconjunctivitis due to Acanthamoeba", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "sight-threatening; strongly linked to contact-lens wear/water exposure", verified: "2026-07-17 ICD-10-CM 2026" },
  "Fungal Keratitis":
    { icd10: "H16.8", label: "Other keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "no fungal-specific keratitis code; code the organism (B35-B49) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Filamentary Keratitis":
    { icd10: "H16.129", label: "Filamentary keratitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Map-Dot-Fingerprint Dystrophy":
    { icd10: "H18.599", label: "Other hereditary corneal dystrophies, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "epithelial basement membrane dystrophy; hereditary-dystrophy bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Lattice Corneal Dystrophy":
    { icd10: "H18.549", label: "Lattice corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Granular Corneal Dystrophy":
    { icd10: "H18.539", label: "Granular corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Terrien Marginal Degeneration":
    { icd10: "H18.49", label: "Other corneal degeneration", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "Terrien marginal degeneration; other-corneal-degeneration bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Superior Limbic Keratoconjunctivitis":
    { icd10: "H16.299", label: "Other keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "SLK; no distinct code; consider thyroid association", verified: "2026-07-17 ICD-10-CM 2026" },
  "Contact Lens Corneal Warpage":
    { icd10: "H18.899", label: "Other specified disorders of cornea, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "contact-lens-induced warpage; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Foreign Body (Metallic)":
    { icd10: "T15.00XA", label: "Foreign body in cornea, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial encounter; set laterality (T15.01/02) and encounter type per visit", verified: "2026-07-17 ICD-10-CM 2026" },
  "Vortex Keratopathy (Drug-Induced)":
    { icd10: "H18.899", label: "Other specified disorders of cornea, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "cornea verticillata; code the causative drug (T-code) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Iron Line (Corneal)":
    { icd10: "H18.069", label: "Stromal corneal pigmentations, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "corneal iron line (Hudson-Stahli/Fleischer); pigmentation/deposit family, layer not captured in code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Limbal Stem Cell Deficiency":
    { icd10: "H18.899", label: "Other specified disorders of cornea, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "LSCD; no distinct code; code the cause (chemical burn, aniridia, CL) alongside", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Cornea (batch B) ─ */
  "Chemical Eye Burn":
    { icd10: "T26.60XA", label: "Corrosion of cornea and conjunctival sac, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "emergency; 7th char A = initial; alkali vs acid and severity/agent (X-code) coded separately; burn (thermal) is T26.1-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Open Globe Injury":
    { icd10: "S05.60XA", label: "Penetrating wound without foreign body of unspecified eyeball, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "surgical emergency; 7th char A = initial; set laterality; with-foreign-body is S05.5-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Intraocular Foreign Body":
    { icd10: "S05.50XA", label: "Penetrating wound with foreign body of unspecified eyeball, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "surgical emergency; 7th char A = initial; also code the retained-foreign-body (Z18.-) at follow-up", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Laceration":
    { icd10: "S05.30XA", label: "Ocular laceration without prolapse or loss of intraocular tissue, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial; with-prolapse is S05.2-; a full-thickness laceration is an open globe", verified: "2026-07-17 ICD-10-CM 2026" },
  "Mooren Ulcer":
    { icd10: "H16.059", label: "Mooren's corneal ulcer, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "painful idiopathic peripheral ulcerative keratitis; sight-threatening", verified: "2026-07-17 ICD-10-CM 2026" },
  "Peripheral Ulcerative Keratitis":
    { icd10: "H16.049", label: "Marginal corneal ulcer, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "PUK; code the systemic association (RA, GPA, etc.) alongside; can perforate", verified: "2026-07-17 ICD-10-CM 2026" },
  "Vernal Shield Ulcer":
    { icd10: "H16.8", label: "Other keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "sterile shield ulcer complicating vernal keratoconjunctivitis (H10.44)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Contact Lens Acute Red Eye (CLARE)":
    { icd10: "H16.8", label: "Other keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "contact-lens acute red eye — sterile inflammatory reaction; exclude microbial keratitis first", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Graft Rejection":
    { icd10: "T86.8409", label: "Corneal transplant rejection, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "graft emergency; set laterality; transplant FAILURE is T86.841-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Dermoid":
    { icd10: "Q13.4", label: "Other congenital corneal malformations", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "limbal dermoid (choristoma); may be part of Goldenhar spectrum", verified: "2026-07-17 ICD-10-CM 2026" },
  "Descemetocele":
    { icd10: "H18.739", label: "Descemetocele, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "impending perforation — emergency", verified: "2026-07-17 ICD-10-CM 2026" },
  "Peters Anomaly":
    { icd10: "Q13.4", label: "Other congenital corneal malformations", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "Peters anomaly; congenital anterior-segment dysgenesis with central corneal opacity", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Hydrops (Acute)":
    { icd10: "H18.629", label: "Keratoconus, unstable, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "acute hydrops usually complicates keratoconus/ectasia (Descemet break with stromal oedema)", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Cornea (batch C — completes the domain) ─ */
  "Posterior Polymorphous Corneal Dystrophy":
    { icd10: "H18.519", label: "Endothelial corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "PPMD (endothelial dystrophy family); shares the code with Fuchs", verified: "2026-07-17 ICD-10-CM 2026" },
  "Schnyder Corneal Dystrophy":
    { icd10: "H18.599", label: "Other hereditary corneal dystrophies, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "Schnyder crystalline dystrophy; check lipid profile", verified: "2026-07-17 ICD-10-CM 2026" },
  "Meesmann Corneal Dystrophy":
    { icd10: "H18.529", label: "Epithelial (juvenile) corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Macular Corneal Dystrophy":
    { icd10: "H18.559", label: "Macular corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Congenital Hereditary Endothelial Dystrophy (CHED)":
    { icd10: "H18.519", label: "Endothelial corneal dystrophy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "CHED (congenital endothelial dystrophy); endothelial-dystrophy family", verified: "2026-07-17 ICD-10-CM 2026" },
  "Corneal Dellen":
    { icd10: "H18.49", label: "Other corneal degeneration", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "focal thinning from adjacent surface elevation/drying; degeneration bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Gelatinous Drop-like Corneal Dystrophy":
    { icd10: "H18.599", label: "Other hereditary corneal dystrophies, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "amyloid subepithelial deposits; hereditary-dystrophy bucket", verified: "2026-07-17 ICD-10-CM 2026" },
  "Spheroidal Degeneration (Climatic Droplet Keratopathy)":
    { icd10: "H18.49", label: "Other corneal degeneration", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "climatic droplet/Labrador keratopathy; other-corneal-degeneration bucket", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Neuro-Ophthalmic (batch A) ─ */
  "Giant Cell Arteritis (Arteritic AION)":
    { icd10: "M31.6", label: "Other giant cell arteritis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "sight/life-threatening; code the arteritic ischemic optic neuropathy (H47.01-) alongside; start steroids before biopsy", verified: "2026-07-17 ICD-10-CM 2026" },
  "Idiopathic Intracranial Hypertension":
    { icd10: "G93.2", label: "Benign intracranial hypertension", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "papilloedema threatens vision; code the papilloedema (H47.1-) if documented", verified: "2026-07-17 ICD-10-CM 2026" },
  "Pituitary Adenoma (Chiasmal Compression)":
    { icd10: "D35.2", label: "Benign neoplasm of pituitary gland", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the chiasmal field defect (H47.-) / bitemporal hemianopia as documented", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Myasthenia Gravis":
    { icd10: "G70.00", label: "Myasthenia gravis without (acute) exacerbation", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "ocular MG (ptosis/diplopia); with-exacerbation is G70.01", verified: "2026-07-17 ICD-10-CM 2026" },
  "Nutritional / Toxic Optic Neuropathy":
    { icd10: "H47.099", label: "Other disorders of optic nerve, not elsewhere classified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "identify and code the toxin/nutritional deficiency (e.g. B12, alcohol/tobacco, drugs)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Leber Hereditary Optic Neuropathy":
    { icd10: "H47.22", label: "Hereditary optic atrophy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "LHON; mitochondrial inheritance — relevant for family counselling", verified: "2026-07-17 ICD-10-CM 2026" },
  "Idiopathic Orbital Inflammation (Pseudotumor)":
    { icd10: "H05.119", label: "Granuloma of unspecified orbit", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "orbital pseudotumor / idiopathic orbital inflammation; exclude specific causes", verified: "2026-07-17 ICD-10-CM 2026" },
  "Adie Tonic Pupil":
    { icd10: "H57.059", label: "Tonic pupil, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Downbeat Nystagmus":
    { icd10: "H55.09", label: "Other forms of nystagmus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "downbeat nystagmus; suggests cranio-cervical junction pathology — image accordingly", verified: "2026-07-17 ICD-10-CM 2026" },
  "Skew Deviation":
    { icd10: "H51.8", label: "Other specified disorders of binocular movement", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "vertical misalignment localising to brainstem/cerebellum; part of the ocular tilt reaction", verified: "2026-07-17 ICD-10-CM 2026" },
  "Chronic Progressive External Ophthalmoplegia":
    { icd10: "H49.40", label: "Progressive external ophthalmoplegia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "CPEO; mitochondrial — consider Kearns-Sayre (retinopathy, cardiac block)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Convergence-Retraction Nystagmus (Dorsal Midbrain)":
    { icd10: "H55.09", label: "Other forms of nystagmus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "dorsal midbrain (Parinaud) syndrome; image the midbrain/pineal region", verified: "2026-07-17 ICD-10-CM 2026" },
  "Hemianopic Field Loss (Occipital Stroke)":
    { icd10: "H53.469", label: "Homonymous bilateral field defects, unspecified side", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the underlying occipital stroke (I63.-) as principal", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Neuro-Ophthalmic (batch B) ─ */
  "Orbital Blowout Fracture":
    { icd10: "S02.30XA", label: "Fracture of orbital floor, unspecified side, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial; set laterality; assess for muscle entrapment / diplopia / enophthalmos", verified: "2026-07-17 ICD-10-CM 2026" },
  "Traumatic Optic Neuropathy":
    { icd10: "S04.019A", label: "Injury of optic nerve, unspecified eye, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial; set laterality; an RAPD after head/orbital trauma is the key sign", verified: "2026-07-17 ICD-10-CM 2026" },
  "Traumatic Mydriasis":
    { icd10: "H57.04", label: "Mydriasis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "traumatic iris sphincter tear; also code the ocular injury (S05.-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Giant Cell Arteritis (Occult / Systemic)":
    { icd10: "M31.6", label: "Other giant cell arteritis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "occult/systemic GCA (may threaten the eye without prior visual symptoms); PMR variant is M31.5", verified: "2026-07-17 ICD-10-CM 2026" },
  "Acquired Pendular Nystagmus":
    { icd10: "H55.09", label: "Other forms of nystagmus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "acquired pendular nystagmus; often demyelinating/brainstem — image and look for oscillopsia", verified: "2026-07-17 ICD-10-CM 2026" },
  "Spasmus Nutans":
    { icd10: "H55.09", label: "Other forms of nystagmus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "spasmus nutans triad (nystagmus, head nodding, torticollis); exclude chiasmal/optic glioma with imaging", verified: "2026-07-17 ICD-10-CM 2026" },
  "Superior Oblique Myokymia":
    { icd10: "H55.89", label: "Other irregular eye movements", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "superior oblique myokymia; monocular torsional oscillopsia", verified: "2026-07-17 ICD-10-CM 2026" },
  "Carotid-Cavernous Fistula":
    { icd10: "I77.0", label: "Arteriovenous fistula, acquired", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "CCF; code the ocular manifestations (raised IOP, dilated episcleral veins, proptosis); direct vs dural", verified: "2026-07-17 ICD-10-CM 2026" },
  "Neuroretinitis":
    { icd10: "H46.9", label: "Unspecified optic neuritis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "neuroretinitis (disc swelling + macular star); often infectious (e.g. Bartonella cat-scratch)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Papillophlebitis":
    { icd10: "H47.099", label: "Other disorders of optic nerve, not elsewhere classified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "papillophlebitis / optic-disc vasculitis in the young (incipient non-ischaemic CRVO variant)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Tolosa-Hunt Syndrome":
    { icd10: "H05.119", label: "Granuloma of unspecified orbit", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "Tolosa-Hunt: granulomatous cavernous-sinus / superior-orbital-fissure inflammation; no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Cavernous Sinus Thrombosis":
    { icd10: "G08", label: "Intracranial and intraspinal phlebitis and thrombophlebitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "life-threatening; septic (often sinus/facial infection) vs aseptic — code the source", verified: "2026-07-17 ICD-10-CM 2026" },
  "Infantile (Congenital) Nystagmus":
    { icd10: "H55.01", label: "Congenital nystagmus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Neuro-Ophthalmic (batch C — completes the domain) ─ */
  "Optic Nerve Hypoplasia":
    { icd10: "H47.039", label: "Optic nerve hypoplasia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "consider septo-optic dysplasia / midline CNS and endocrine associations", verified: "2026-07-17 ICD-10-CM 2026" },
  "Diabetic Papillopathy":
    { icd10: "H47.099", label: "Other disorders of optic nerve, not elsewhere classified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "diabetic papillopathy; code the diabetes (E1x.39-) alongside; a diagnosis of exclusion vs AION", verified: "2026-07-17 ICD-10-CM 2026" },
  "Foster Kennedy Syndrome":
    { icd10: "H47.099", label: "Other disorders of optic nerve, not elsewhere classified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "optic atrophy one eye + papilloedema fellow eye from a frontal mass — code the causative tumour", verified: "2026-07-17 ICD-10-CM 2026" },
  "Tilted Disc Syndrome":
    { icd10: "Q14.2", label: "Congenital malformation of optic disc", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "tilted-disc congenital anomaly; can cause a non-neurological field defect", verified: "2026-07-17 ICD-10-CM 2026" },
  "Susac Syndrome":
    { icd10: "H35.069", label: "Retinal vasculitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "Susac triad (branch retinal artery occlusions + sensorineural hearing loss + encephalopathy); no distinct code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Orbital Rhabdomyosarcoma":
    { icd10: "C69.60", label: "Malignant neoplasm of unspecified orbit", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "commonest primary orbital malignancy of childhood; life-threatening — urgent; set laterality", verified: "2026-07-17 ICD-10-CM 2026" },
  "Orbital Lymphoma":
    { icd10: "C69.60", label: "Malignant neoplasm of unspecified orbit", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "orbital/adnexal lymphoma; also code the lymphoma subtype (C82-C88; commonly MALT)", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Surface & Lids (batch A) ─ */
  "Floppy Eyelid Syndrome":
    { icd10: "H02.89", label: "Other specified disorders of eyelid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "FES; no distinct code; strong association with obstructive sleep apnoea — screen for it", verified: "2026-07-17 ICD-10-CM 2026" },
  "Blepharospasm":
    { icd10: "G24.5", label: "Blepharospasm", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Canaliculitis":
    { icd10: "H04.339", label: "Acute lacrimal canaliculitis of unspecified lacrimal passage", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "often Actinomyces with concretions; set laterality", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sebaceous Gland Carcinoma":
    { icd10: "C44.1391", label: "Sebaceous cell carcinoma of skin of eyelid, including canthus", laterality: "SET per patient", status: "NEEDS_CLINICAL_REVIEW", caution: "aggressive lid malignancy that masquerades as chalazion/blepharitis — URGENT; the C44.139x codes are eyelid+side specific, SET the correct one (shown value is a placeholder)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctival Melanoma":
    { icd10: "C69.00", label: "Malignant neoplasm of unspecified conjunctiva", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "URGENT; set laterality (C69.01/02); arises from PAM/nevus or de novo", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Surface Squamous Neoplasia":
    { icd10: "C69.00", label: "Malignant neoplasm of unspecified conjunctiva", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "OSSN spectrum (conjunctival/corneal intraepithelial neoplasia to invasive SCC); in-situ disease may be coded D09.2-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctival Nevus":
    { icd10: "D31.00", label: "Benign neoplasm of unspecified conjunctiva", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "document to monitor for growth/change (melanoma risk)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Giant Papillary Conjunctivitis":
    { icd10: "H10.419", label: "Chronic giant papillary conjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "usually contact-lens/prosthesis/suture-associated", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ligneous Conjunctivitis":
    { icd10: "H10.519", label: "Ligneous conjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "associated with plasminogen deficiency", verified: "2026-07-17 ICD-10-CM 2026" },
  "Punctal Stenosis":
    { icd10: "H04.569", label: "Stenosis of unspecified lacrimal punctum", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Nasolacrimal Duct Obstruction (Congenital)":
    { icd10: "Q10.5", label: "Congenital stenosis and stricture of lacrimal duct", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "congenital NLDO; most resolve in the first year", verified: "2026-07-17 ICD-10-CM 2026" },
  "Dacryoadenitis":
    { icd10: "H04.009", label: "Unspecified dacryoadenitis, unspecified lacrimal gland", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "set acute (H04.01-) vs chronic (H04.02-) and laterality", verified: "2026-07-17 ICD-10-CM 2026" },
  "Involutional Ptosis":
    { icd10: "H02.409", label: "Unspecified ptosis of unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "aponeurotic/involutional; set laterality (H02.40x); exclude neurogenic/myogenic causes", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Surface & Lids (batch B — completes the domain & the expansion set) ─ */
  "Eyelid Basal Cell Carcinoma":
    { icd10: "C44.1191", label: "Basal cell carcinoma of skin of eyelid, including canthus", laterality: "SET per patient", status: "NEEDS_CLINICAL_REVIEW", caution: "commonest lid malignancy (esp. lower lid/medial canthus) — URGENT referral; the C44.119x codes are eyelid+side specific, SET the correct one (shown value is a placeholder)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Thermal Eyelid Burn":
    { icd10: "T26.00XA", label: "Burn of unspecified eyelid and periocular area, initial encounter", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial; set laterality; assess cornea for exposure; chemical corrosion is T26.5-/T26.6-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Rosacea":
    { icd10: "L71.8", label: "Other rosacea", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code the ocular manifestation (blepharitis/MGD, keratitis) alongside", verified: "2026-07-17 ICD-10-CM 2026" },
  "Chlamydial (Adult Inclusion) Conjunctivitis":
    { icd10: "A74.0", label: "Chlamydial conjunctivitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "consider concurrent genital chlamydial infection and partner/STI management", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ocular Cicatricial Pemphigoid":
    { icd10: "L12.1", label: "Cicatricial pemphigoid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "mucous membrane pemphigoid with progressive conjunctival cicatrisation/symblepharon; systemic immunosuppression", verified: "2026-07-17 ICD-10-CM 2026" },
  "Toxic Keratoconjunctivitis (Medicamentosa)":
    { icd10: "H16.299", label: "Other keratoconjunctivitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "toxic/medicamentosa — code the offending drug/preservative (T-code); stop the culprit", verified: "2026-07-17 ICD-10-CM 2026" },
  "Molluscum Contagiosum (Lid)":
    { icd10: "B08.1", label: "Molluscum contagiosum", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "lid-margin lesions cause a secondary follicular conjunctivitis; extensive disease suggests immunocompromise", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctivochalasis":
    { icd10: "H11.829", label: "Conjunctivochalasis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Xerophthalmia (Vitamin A Deficiency)":
    { icd10: "E50.7", label: "Other ocular manifestations of vitamin A deficiency", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "nutritional emergency (esp. children) — night blindness/Bitot spots/keratomalacia; specific stages are E50.0-E50.6", verified: "2026-07-17 ICD-10-CM 2026" },
  "Giant Fornix Syndrome":
    { icd10: "H10.89", label: "Other conjunctivitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "chronic relapsing purulent conjunctivitis from a protein/biofilm reservoir in a deep superior fornix (elderly)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Blepharochalasis":
    { icd10: "H02.30", label: "Blepharochalasis, unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "recurrent painless lid oedema leaving lax, thinned skin (young patients); distinct from age-related dermatochalasis", verified: "2026-07-17 ICD-10-CM 2026" },
  "Eyelid Capillary Hemangioma":
    { icd10: "D18.01", label: "Hemangioma of skin and subcutaneous tissue", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "infantile periocular hemangioma; monitor for amblyopia from ptosis/astigmatism/occlusion", verified: "2026-07-17 ICD-10-CM 2026" },
  "Stevens-Johnson Syndrome (Ocular)":
    { icd10: "L51.1", label: "Stevens-Johnson syndrome", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "systemic emergency (usually drug-induced); acute ocular surface involvement is sight-threatening; late cicatricial sequelae coded separately", verified: "2026-07-17 ICD-10-CM 2026" },
  "Trachoma":
    { icd10: "A71.1", label: "Active stage of trachoma", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "leading infectious cause of blindness worldwide; scarring sequelae (entropion/trichiasis) fall under later A71.- stages", verified: "2026-07-17 ICD-10-CM 2026" },
  "Ophthalmia Neonatorum":
    { icd10: "P39.1", label: "Neonatal conjunctivitis and dacryocystitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "identify the pathogen — gonococcal (A54.31) is a sight-threatening emergency; chlamydial is A74.0", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctival Lymphoma":
    { icd10: "C69.00", label: "Malignant neoplasm of unspecified conjunctiva", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "conjunctival (often MALT) lymphoma — salmon-pink patch; also code the lymphoma subtype (C82-C88) and stage systemically", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctival Pyogenic Granuloma":
    { icd10: "H11.89", label: "Other specified disorders of conjunctiva", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "lobular capillary haemangioma; typically follows a chalazion, surgery or trauma", verified: "2026-07-17 ICD-10-CM 2026" },
  "Dacryolithiasis":
    { icd10: "H04.519", label: "Dacryolith of unspecified lacrimal passage", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "lacrimal stone; causes intermittent epiphora and can precipitate acute dacryocystitis", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 10 (posterior-segment tumours & vasculitis) ─ */
  "Choroidal Osteoma":
    { icd10: "D31.30", label: "Benign neoplasm of unspecified choroid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "ossifying benign choroidal tumour; no osteoma-specific code", verified: "2026-07-17 ICD-10-CM 2026" },
  "Sclerochoroidal Calcification":
    { icd10: "H31.8", label: "Other specified disorders of choroid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "benign calcium deposits; exclude metabolic (calcium/phosphate) causes", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinal Cavernous Hemangioma":
    { icd10: "D31.20", label: "Benign neoplasm of unspecified retina", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign vascular hamartoma; may be part of a neuro-oculo-cutaneous syndrome", verified: "2026-07-17 ICD-10-CM 2026" },
  "Frosted Branch Angiitis":
    { icd10: "H35.069", label: "Retinal vasculitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "fulminant retinal vasculitis; often viral/immune-mediated — code the cause where known", verified: "2026-07-17 ICD-10-CM 2026" },
  "Bietti Crystalline Dystrophy":
    { icd10: "H35.50", label: "Unspecified hereditary retinal dystrophy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "crystalline retinopathy; no Bietti-specific code", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 11 (intraocular tumours & disc anomalies) ─ */
  "Iris Melanoma":
    { icd10: "C69.40", label: "Malignant neoplasm of unspecified ciliary body", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "iris/ciliary-body melanoma; set laterality; urgent ocular-oncology referral", verified: "2026-07-17 ICD-10-CM 2026" },
  "Optic Disc Melanocytoma":
    { icd10: "D31.90", label: "Benign neoplasm of unspecified part of unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign melanocytic tumour of the disc; no specific code — monitor for rare malignant transformation", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinal Astrocytic Hamartoma":
    { icd10: "D31.20", label: "Benign neoplasm of unspecified retina", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "consider tuberous sclerosis / neurofibromatosis association", verified: "2026-07-17 ICD-10-CM 2026" },
  "Optic Disc Coloboma":
    { icd10: "Q14.2", label: "Congenital malformation of optic disc", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "congenital disc coloboma; may be part of CHARGE or other syndromes", verified: "2026-07-17 ICD-10-CM 2026" },
  "Choroidal Metastasis":
    { icd10: "C79.89", label: "Secondary malignant neoplasm of other specified sites", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "choroidal metastasis; code the primary tumour (commonly breast/lung) as well", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 12 (common Lens conditions) ─ */
  "Mature Cataract":
    { icd10: "H25.9", label: "Unspecified age-related cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "mature (fully opaque) age-related lens; specify morphology/eye where possible", verified: "2026-07-17 ICD-10-CM 2026" },
  "Hypermature (Morgagnian) Cataract":
    { icd10: "H25.89", label: "Other age-related cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "hypermature/Morgagnian (liquefied cortex); risk of phacolytic glaucoma", verified: "2026-07-17 ICD-10-CM 2026" },
  "Intumescent Cataract":
    { icd10: "H26.9", label: "Unspecified cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "swollen (intumescent) lens shallowing the AC; risk of phacomorphic angle closure", verified: "2026-07-17 ICD-10-CM 2026" },
  "Anterior Subcapsular Cataract":
    { icd10: "H25.039", label: "Anterior subcapsular polar age-related cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-17 ICD-10-CM 2026" },
  "Pseudoexfoliation (Lens Deposition)":
    { icd10: "H26.8", label: "Other specified cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "pseudoexfoliation material on lens/capsule; if glaucoma present code H40.14-; weak zonules raise surgical risk", verified: "2026-07-17 ICD-10-CM 2026" },
  "Anterior Lenticonus":
    { icd10: "Q12.8", label: "Other congenital lens malformations", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "anterior lenticonus; classic Alport syndrome association", verified: "2026-07-17 ICD-10-CM 2026" },
  "Christmas-Tree Cataract":
    { icd10: "H26.8", label: "Other specified cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "polychromatic (Christmas-tree) crystalline deposits; can accompany myotonic dystrophy", verified: "2026-07-17 ICD-10-CM 2026" },
  "Diabetic Snowflake Cataract":
    { icd10: "E11.36", label: "Type 2 diabetes mellitus with diabetic cataract", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "true diabetic (snowflake) cataract of the young; assumes type 2 (DM1 is E10.36)", verified: "2026-07-17 ICD-10-CM 2026" },
  "IOL Dislocation":
    { icd10: "T85.22XA", label: "Displacement of intraocular lens, initial encounter", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "7th char A = initial; dislocated/subluxed IOL after cataract surgery", verified: "2026-07-17 ICD-10-CM 2026" },
  "Aphakia":
    { icd10: "H27.00", label: "Aphakia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "absence of the lens (surgical or, rarely, congenital); set laterality", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 13 (common Refractive & Binocular conditions) ─ */
  "High (Pathological) Myopia":
    { icd10: "H44.20", label: "Degenerative myopia, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "pathological/degenerative myopia; simple high myopia without degeneration is H52.1-; watch for RD/CNV/glaucoma", verified: "2026-07-17 ICD-10-CM 2026" },
  "Aniseikonia":
    { icd10: "H52.32", label: "Aniseikonia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "unequal retinal image size, usually from anisometropia; contact lenses often help", verified: "2026-07-17 ICD-10-CM 2026" },
  "Irregular Astigmatism":
    { icd10: "H52.219", label: "Irregular astigmatism, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "exclude a corneal cause (keratoconus, scar, ectasia); rigid/scleral lenses often needed", verified: "2026-07-17 ICD-10-CM 2026" },
  "Infantile (Congenital) Esotropia":
    { icd10: "H50.00", label: "Unspecified esotropia", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "large-angle early-onset esotropia; specify monocular/alternating and constancy (H50.01-/H50.05-)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Dissociated Vertical Deviation (DVD)":
    { icd10: "H50.9", label: "Unspecified strabismus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "DVD has no distinct code; a slow upward drift of the non-fixing eye, usually with infantile strabismus", verified: "2026-07-17 ICD-10-CM 2026" },
  "Pseudostrabismus":
    { icd10: "H50.9", label: "Unspecified strabismus", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "APPARENT turn from facial features (epicanthus/wide bridge) — NOT a true deviation; confirm with cover test / symmetric corneal reflexes before coding", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 14 (common Retina conditions) ─ */
  "Retinal Arterial Embolus (Hollenhorst Plaque)":
    { icd10: "H34.9", label: "Unspecified retinal vascular occlusion", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "cholesterol embolus (Hollenhorst); a marker of carotid/cardiac disease — investigate the source (retinal-TIA)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Branch Retinal Artery Occlusion (BRAO)":
    { icd10: "H34.239", label: "Retinal artery branch occlusion, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "treat as an acute retinal stroke; find the embolic source (carotid/cardiac; GCA in the elderly)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Roth Spots":
    { icd10: "H35.60", label: "Retinal hemorrhage, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "white-centred haemorrhages — a sign, not a diagnosis; investigate for endocarditis, leukaemia, anaemia, diabetes", verified: "2026-07-17 ICD-10-CM 2026" },
  "Hydroxychloroquine (Plaquenil) Retinopathy":
    { icd10: "H35.389", label: "Toxic maculopathy, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "drug-induced (antimalarial) bull's-eye maculopathy; also code the drug adverse effect (T37.2X5-); screening is key", verified: "2026-07-17 ICD-10-CM 2026" },
  "Congenital Hypertrophy of the RPE (CHRPE)":
    { icd10: "D31.20", label: "Benign neoplasm of unspecified retina", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign flat RPE lesion; multiple/atypical (pisciform) CHRPE can signal familial adenomatous polyposis", verified: "2026-07-17 ICD-10-CM 2026" },
  "Grouped Pigmentation (Bear Tracks)":
    { icd10: "Q14.1", label: "Congenital malformation of retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "benign congenital grouped RPE pigmentation ('bear tracks'); typically asymptomatic", verified: "2026-07-17 ICD-10-CM 2026" },
  "Torpedo Maculopathy":
    { icd10: "Q14.1", label: "Congenital malformation of retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "congenital torpedo-shaped RPE defect temporal to the fovea; usually asymptomatic", verified: "2026-07-17 ICD-10-CM 2026" },
  "Myelinated Nerve Fibres":
    { icd10: "Q14.1", label: "Congenital malformation of retina", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "congenital myelinated retinal nerve-fibre patch; benign but can give a corresponding scotoma", verified: "2026-07-17 ICD-10-CM 2026" },
  "Retinal Pigment Epithelial Detachment (PED)":
    { icd10: "H35.729", label: "Serous detachment of retinal pigment epithelium, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "serous PED — search for the cause (AMD/CNV, CSCR, polypoidal vasculopathy); haemorrhagic PED is H35.73-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Snail-track Degeneration":
    { icd10: "H35.40", label: "Unspecified peripheral retinal degeneration", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "snail-track (glistening) peripheral degeneration; a retinal-break/detachment risk factor akin to lattice", verified: "2026-07-17 ICD-10-CM 2026" },
  "Peripheral Cystoid Degeneration":
    { icd10: "H35.429", label: "Microcystoid degeneration of retina, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign peripheral (typically ora) microcystoid change; rarely of clinical consequence", verified: "2026-07-17 ICD-10-CM 2026" },

  /* ─ Batch 15 (common Surface & Lids / adnexal conditions) ─ */
  "Dermatochalasis":
    { icd10: "H02.839", label: "Dermatochalasis of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "redundant lid skin; upper-lid excess can obscure the superior field (functional vs cosmetic)", verified: "2026-07-17 ICD-10-CM 2026" },
  "Xanthelasma":
    { icd10: "H02.60", label: "Xanthelasma of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "yellow lipid lid plaques; check a fasting lipid profile, especially if young", verified: "2026-07-17 ICD-10-CM 2026" },
  "Eyelid Papilloma":
    { icd10: "D23.10", label: "Other benign neoplasm of skin of unspecified eyelid, including canthus", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign squamous/viral papilloma; biopsy anything atypical or rapidly growing to exclude malignancy", verified: "2026-07-17 ICD-10-CM 2026" },
  "Eyelid Epidermoid / Sebaceous Cyst":
    { icd10: "H02.829", label: "Cysts of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "benign lid cyst (epidermoid, cyst of Moll/Zeis); simple excision if symptomatic", verified: "2026-07-17 ICD-10-CM 2026" },
  "Distichiasis":
    { icd10: "Q10.3", label: "Other congenital malformations of eyelid", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "extra (aberrant) lash row from meibomian orifices; congenital here — acquired cicatricial distichiasis codes differently", verified: "2026-07-17 ICD-10-CM 2026" },
  "Eyelid Contact Dermatitis":
    { icd10: "H01.119", label: "Allergic dermatitis of unspecified eye, unspecified eyelid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "identify and remove the allergen (cosmetics, drops/preservatives, nickel); irritant type is H01.12-", verified: "2026-07-17 ICD-10-CM 2026" },
  "Phthiriasis Palpebrarum (Lice)":
    { icd10: "B85.3", label: "Phthiriasis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "pubic-louse infestation of the lashes; a sexually transmitted/close-contact association — screen and treat contacts", verified: "2026-07-17 ICD-10-CM 2026" },
  "Congenital Ptosis":
    { icd10: "Q10.0", label: "Congenital ptosis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "watch for amblyopia (occlusion / induced astigmatism); a lid covering the axis needs earlier surgery", verified: "2026-07-17 ICD-10-CM 2026" },
  "Symblepharon":
    { icd10: "H11.239", label: "Symblepharon, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "conjunctival adhesion — find the cicatrising cause (chemical burn, SJS, pemphigoid, trachoma) and treat it", verified: "2026-07-17 ICD-10-CM 2026" },
  "Conjunctival Concretions":
    { icd10: "H11.129", label: "Conjunctival concretions, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "hard yellow tarsal deposits; only remove if eroding/symptomatic", verified: "2026-07-17 ICD-10-CM 2026" },
  "Chemosis (Conjunctival Edema)":
    { icd10: "H11.89", label: "Other specified disorders of conjunctiva", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "conjunctival oedema is a sign — find the cause (allergy, infection/orbital cellulitis, thyroid eye disease, venous congestion)", verified: "2026-07-17 ICD-10-CM 2026" }

};
