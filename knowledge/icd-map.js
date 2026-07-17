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
    { icd10: "A51.43", label: "Secondary syphilitic oculopathy", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "stage-dependent; late syphilitic oculopathy is A52.71", verified: "2026-07-17 ICD-10-CM 2026" }

};
