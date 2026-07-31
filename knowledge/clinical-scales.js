/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — PUBLISHED CLINICAL SCALES (data, not code)            */
/*                                                                  */
/* Every number in this file is a DIRECT TRANSCRIPTION from a named */
/* published source, recorded here with its citation so a clinician */
/* can check it against the paper. Nothing here is derived,         */
/* approximated, "simplified", or inferred.                         */
/*                                                                  */
/* WHY THIS FILE EXISTS                                             */
/*                                                                  */
/* An earlier AI session wrote js/risk-calc.js: a home-made points  */
/* score presented as the OHTS glaucoma model, with nine invented   */
/* risk percentages. It was quarantined on 2026-07-31 (see          */
/* quarantine/risk-calc.UNVERIFIED.js and                           */
/* docs/AI_CODE_REVIEW_2026-07-31.md).                              */
/*                                                                  */
/* The lesson was that clinical constants must not live in          */
/* JavaScript, where they look like implementation detail. They     */
/* live here, as data, carrying:                                    */
/*                                                                  */
/*   - `source`      the exact citation, DOI and PMID               */
/*   - `verbatim`    the sentence(s) from the source that the       */
/*                   numbers were transcribed from, so a reviewer   */
/*                   can diff the code against the paper without    */
/*                   leaving the app                                */
/*   - `review_status` provisional until a clinician signs it off,  */
/*                   exactly like every KB condition                */
/*                                                                  */
/* RULES FOR ADDING A SCALE — all four, no exceptions:              */
/*                                                                  */
/*   1. The scale must be published, named, and citable.            */
/*   2. Every constant must appear verbatim in `verbatim`.          */
/*   3. If a number cannot be quoted from the source, the scale     */
/*      does not go in. Do not interpolate. Do not "simplify" a     */
/*      regression model into points.                               */
/*   4. It ships as NEEDS_CLINICAL_REVIEW until a clinician         */
/*      verifies it in the app.                                     */
/*                                                                  */
/* A scale whose model form cannot be reproduced from published     */
/* material — a Cox proportional-hazards model whose coefficients   */
/* are not in the paper, for instance — is recorded in              */
/* UNIMPLEMENTABLE_SCALES below rather than guessed at.             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLINICAL_SCALES = [

  /* ─────────────────────────────────────────────────────────────
     AREDS SIMPLIFIED SEVERITY SCALE

     Chosen because it satisfies the clinical brief exactly: the
     numbers are fixed for every patient, the inputs are ordinary
     dilated-fundus findings a clinician records anyway, and the
     whole algorithm is stated explicitly in the published abstract.
     ───────────────────────────────────────────────────────────── */
  {
    id: "areds_simplified",
    name: "AREDS Simplified Severity Scale",
    short: "AREDS",
    domain: "retina",
    outcome: "Approximate 5-year risk of developing advanced AMD in at least one eye",
    review_status: "NEEDS_CLINICAL_REVIEW",

    source: {
      citation: "Ferris FL 3rd, Davis MD, Clemons TE, Lee LY, Chew EY, Lindblad AS, " +
                "Milton RC, Bressler SB, Klein R. A simplified severity scale for " +
                "age-related macular degeneration: AREDS Report No. 18. " +
                "Arch Ophthalmol. 2005 Nov;123(11):1570-4.",
      doi: "10.1001/archopht.123.11.1570",
      pmid: "16286620",
      retrieved: "2026-07-31",
      retrieved_via: "PubMed"
    },

    /* The sentences the scoring and risk figures below were transcribed
       from, quoted from the published abstract. A reviewer checks the
       implementation by comparing it to this — no paper access needed. */
    verbatim:
      "The scoring system developed for patients assigns to each eye 1 risk " +
      "factor for the presence of 1 or more large (>= 125 microm, width of a " +
      "large vein at disc margin) drusen and 1 risk factor for the presence of " +
      "any pigment abnormality. Risk factors are summed across both eyes, " +
      "yielding a 5-step scale (0-4) on which the approximate 5-year risk of " +
      "developing advanced AMD in at least one eye increases in this easily " +
      "remembered sequence: 0 factors, 0.5%; 1 factor, 3%; 2 factors, 12%; " +
      "3 factors, 25%; and 4 factors, 50%. For persons with no large drusen, " +
      "presence of intermediate drusen in both eyes is counted as 1 risk factor.",

    /* What the clinician must record, per eye. Every one of these is
       REQUIRED: the scale cannot be scored from partial data, because
       "not recorded" is not the same as "absent" — assuming otherwise is
       how a patient at 50% risk gets shown 0.5%. */
    inputs: [
      {
        id: "large_drusen",
        per_eye: true,
        required: true,
        question: "Large drusen present? (≥125 µm — the width of a large vein at the disc margin)",
        /* Findings already in the exam vocabulary that SUGGEST this answer.
           A suggestion pre-fills the control; it never scores on its own. */
        suggest_present: ["Drusen — large (>125μm)"]
      },
      {
        id: "pigment_abnormality",
        per_eye: true,
        required: true,
        question: "Any pigment abnormality present?",
        suggest_present: ["RPE changes"]
      },
      {
        id: "intermediate_drusen",
        per_eye: true,
        required: true,
        question: "Intermediate drusen present? (63–125 µm)",
        note: "Only used when NEITHER eye has large drusen.",
        suggest_present: ["Drusen — medium (63-125μm)"]
      }
    ],

    /* One risk factor per eye for large drusen; one per eye for any pigment
       abnormality; summed across both eyes. */
    scoring: {
      per_eye_factors: ["large_drusen", "pigment_abnormality"],
      /* "For persons with no large drusen, presence of intermediate drusen in
         both eyes is counted as 1 risk factor." — one factor total, not one
         per eye, and only when NEITHER eye has large drusen. */
      special_rules: [
        {
          id: "bilateral_intermediate_drusen",
          when: "no_large_drusen_either_eye AND intermediate_drusen_both_eyes",
          add: 1,
          from_verbatim: "For persons with no large drusen, presence of intermediate " +
                         "drusen in both eyes is counted as 1 risk factor."
        }
      ],
      min: 0,
      max: 4
    },

    /* Transcribed exactly. `risk_text` is what the clinician sees; it is a
       string, not a number, so nothing can silently reformat or interpolate it. */
    bands: [
      { score: 0, risk_text: "0.5%" },
      { score: 1, risk_text: "3%" },
      { score: 2, risk_text: "12%" },
      { score: 3, risk_text: "25%" },
      { score: 4, risk_text: "50%" }
    ],

    /* Deliberately NOT in this file: management advice, supplement
       indications, follow-up intervals. The source defines a risk
       stratification and nothing else. Anything beyond that would be an
       invented clinical claim wearing a citation. */
    advisory_note:
      "Risk stratification only. This scale does not specify management, " +
      "supplementation or review intervals — those remain the clinician's judgement."
  }

];


/* ═══════════════════════════════════════════════════════════════ */
/* SCALES THAT CANNOT BE IMPLEMENTED FROM PUBLISHED MATERIAL       */
/*                                                                  */
/* Recorded so that no future session re-derives them from memory   */
/* and no reviewer wonders whether they were simply forgotten.      */
/* ═══════════════════════════════════════════════════════════════ */
var UNIMPLEMENTABLE_SCALES = [
  {
    id: "ohts_egps_poag_5yr",
    name: "OHTS/EGPS 5-year POAG risk",
    source: {
      citation: "Gordon MO, Torri V, Miglior S, Beiser JA, Floriani I, Miller JP, " +
                "Gao F, Adamsons I, Poli D, D'Agostino RB, Kass MA. Validated " +
                "prediction model for the development of primary open-angle glaucoma " +
                "in individuals with ocular hypertension. Ophthalmology. 2007 Jan;114(1):10-9.",
      doi: "10.1016/j.ophtha.2006.08.031",
      pmid: "17095090",
      retrieved: "2026-07-31",
      retrieved_via: "PubMed"
    },
    predictors: ["baseline age", "IOP", "central corneal thickness",
                 "vertical cup/disc ratio", "Humphrey VF pattern standard deviation"],
    reason:
      "This is a Cox proportional-hazards model over continuous predictors, not a " +
      "points score. Reproducing it requires the regression coefficients and the " +
      "baseline survival function. Those are not in the published abstract, the " +
      "PubMed Central full text returned no body text, and no verifiable published " +
      "points-based translation was found. A points score invented to approximate it " +
      "would be fabricated clinical content — which is exactly the defect that got " +
      "the previous version of this calculator quarantined.",
    to_implement:
      "Obtain the model coefficients and baseline survival from the paper (Table 5 / " +
      "the published risk calculator documentation), or adopt a named, citable " +
      "points-based instrument and transcribe it verbatim. Until then this stays out."
  }
];


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CLINICAL_SCALES: CLINICAL_SCALES,
    UNIMPLEMENTABLE_SCALES: UNIMPLEMENTABLE_SCALES
  };
}
