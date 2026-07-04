/* ═══════════════════════════════════════════════════════════════ */
/* ICD-10-CM CODE MAP                                              */
/*                                                                  */
/* Maps condition display names → a DEFAULT ICD-10-CM code.         */
/* Loaded before loader.js, which backfills each condition's `icd`  */
/* field from here (engine + coding page already read `cond.icd`).  */
/*                                                                  */
/* PROVENANCE & SAFETY                                              */
/* - Every code here was looked up and validated against the        */
/*   ICD-10-CM 2026 code set (via the connected ICD-10 MCP tool) on  */
/*   the date in `verified`. Codes are real and billable            */
/*   (valid_for_hipaa_transactions = true); none were invented.     */
/* - Defaults use the "unspecified eye / unspecified stage" variant, */
/*   because the app does not yet capture laterality/stage at coding */
/*   time. The clinician must refine laterality/stage/etiology.     */
/* - `status: "NEEDS_CLINICAL_REVIEW"` on every entry: the founder    */
/*   must confirm each mapping is the correct code for the intended  */
/*   clinical entity before it is treated as authoritative. A valid  */
/*   code is not necessarily the RIGHT code for a given condition.   */
/* - Entries flagged `caution` are known judgment calls (ambiguous   */
/*   mapping or a non-specific "unspecified/other" bucket).          */
/*                                                                  */
/* Extend with tools/gen scripts or by hand, one verified code at a  */
/* time. Conditions absent here keep `icd: ""` (handled gracefully). */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ICD_MAP = {

  /* ── Glaucoma ── */
  "Primary Open Angle Glaucoma (POAG)":
    { icd10: "H40.1190", label: "Primary open-angle glaucoma, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Acute Angle Closure Crisis":
    { icd10: "H40.219", label: "Acute angle-closure glaucoma, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Neovascular Glaucoma":
    { icd10: "H40.849", label: "Neovascular secondary angle closure glaucoma, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ── Retina ── */
  "Retinal Tear":
    { icd10: "H33.319", label: "Horseshoe tear of retina without detachment, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "operculated/atrophic tears use different codes", verified: "2026-07-04 ICD-10-CM 2026" },
  "Retinal Detachment":
    { icd10: "H33.009", label: "Unspecified retinal detachment with retinal break, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "tractional/serous RD use H33.4-/H33.2-", verified: "2026-07-04 ICD-10-CM 2026" },
  "Age-related Macular Degeneration (Wet)":
    { icd10: "H35.3290", label: "Exudative age-related macular degeneration, unspecified eye, stage unspecified", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Retinal Artery Occlusion (CRAO)":
    { icd10: "H34.10", label: "Central retinal artery occlusion, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Central Retinal Artery Occlusion (Transient / Amaurosis Fugax)":
    { icd10: "G45.3", label: "Amaurosis fugax", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Choroidal Melanoma":
    { icd10: "C69.30", label: "Malignant neoplasm of unspecified choroid", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", caution: "site code for malignant choroidal neoplasm", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ── Neuro-ophthalmic ── */
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

  /* ── Cornea ── */
  "Microbial Keratitis":
    { icd10: "H16.9", label: "Unspecified keratitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "code organism-specific keratitis/ulcer where known", verified: "2026-07-04 ICD-10-CM 2026" },
  "Corneal Ulcer":
    { icd10: "H16.009", label: "Unspecified corneal ulcer, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Keratoconus":
    { icd10: "H18.609", label: "Keratoconus, unspecified, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ── Anterior / Uveitis ── */
  "Panuveitis":
    { icd10: "H44.119", label: "Panuveitis, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Hypopyon Uveitis":
    { icd10: "H20.059", label: "Hypopyon, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ── Lens ── */
  "Nuclear Sclerotic Cataract":
    { icd10: "H25.10", label: "Age-related nuclear cataract, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Lens Subluxation / Dislocation":
    { icd10: "H27.10", label: "Unspecified dislocation of lens", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },

  /* ── Surface & Lids ── */
  "Dry Eye Disease - Aqueous Deficient":
    { icd10: "H16.229", label: "Keratoconjunctivitis sicca, not specified as Sjogren's, unspecified eye", laterality: "unspecified", status: "NEEDS_CLINICAL_REVIEW", verified: "2026-07-04 ICD-10-CM 2026" },
  "Allergic Conjunctivitis":
    { icd10: "H10.45", label: "Other chronic allergic conjunctivitis", laterality: "n/a", status: "NEEDS_CLINICAL_REVIEW", caution: "H10.1- for acute atopic; verify acuity", verified: "2026-07-04 ICD-10-CM 2026" }

};
