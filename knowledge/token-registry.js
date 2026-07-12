/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN REGISTRY — GENERATED FILE, DO NOT EDIT BY HAND            */
/* Regenerate with: node tools/gen-token-registry.js               */
/*                                                                  */
/* Single source of truth for the engine token vocabulary:          */
/* every token's producers (input paths), KB usage counts, and      */
/* reachability. type_hint is mechanically inferred and PROVISIONAL */
/* — not verified clinical classification.                          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var TOKEN_REGISTRY = {
  "AV_nicking": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "CNVM": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "IOL_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "IOP_elevated": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 7
    },
    "reachable": false
  },
  "IOP_normal": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "IOP_very_high": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "LOCS_grading": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 3
    },
    "reachable": false
  },
  "MLF_lesion_sign": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "NPC_receded": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "OCT_edema": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "PSC_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "PSC_pattern": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "RAPD": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "RAPD_positive": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "RNFL_thinning": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "RPE_changes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "TBUT_reduced": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "abduction_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "acute": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 36,
      "tests": 0
    },
    "reachable": true
  },
  "acute_bias": {
    "type_hint": "temporal",
    "sources": [
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "acute_discharge": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "acute_onset": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 3,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "acute_pain": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 2,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "acute_severe_pain": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "add_required": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "adduction_deficit": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "age_over_40": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "age_related": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "alternating": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "altitudinal_field_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "angle_closure_risk": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "anterior_chamber_reaction": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "arteriolar_changes": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "asthenopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "asthma_atopy": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "astigmatism": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "asymptomatic": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "attenuated_vessels": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "autoimmune_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "back_pain_history": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "band_keratopathy": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "baseline_fields": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "better_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "bilateral": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "bilateral_disc_swelling": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "blepharitis_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "blink_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "blisters_epithelium": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text"
    ],
    "usage": {
      "req": 5,
      "sup": 10,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "blur_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "bone_spicules": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "both_eyes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "brain_origin": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "burning": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "calcium_deposition": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "capsule_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "cd_asymmetry": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cells_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 7
    },
    "reachable": false
  },
  "central_blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 6,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "central_scotoma": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cherry_red_spot": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "chiasmal_lesion_pattern": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "chorioretinal_lesion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "chronic": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 44,
      "tests": 0
    },
    "reachable": true
  },
  "chronic_bias": {
    "type_hint": "temporal",
    "sources": [
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "chronic_course": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "chronic_irritation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "chronic_redness": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ciliary_flush": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "clear_bubble": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "clear_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "clinical_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "closing_one_eye": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cobblestone_papillae": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "collarettes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "color_vision_loss": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "conjunctival_edema": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "conjunctival_growth_cornea": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "constant": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 1,
      "tests": 0
    },
    "reachable": false
  },
  "constant_deviation": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "contact_lens_discomfort": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "contact_lens_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "contact_lens_intolerance": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "contact_lens_use": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "corneal_edema": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "corneal_exposure": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "corneal_infiltrate": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "corneal_involvement": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "corneal_opacity": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "corneal_opacity_band": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "corneal_sensitivity_test": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "corneal_staining": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "corneal_thinning": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "cortical_spokes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "cotton_wool_spots": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "cracking_skin": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "curtain_vision": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cylinder_needed": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "cylindrical_dandruff": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cystic_spaces": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "dark_spots": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "dendritic_ulcer": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "dermatomal_rash": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "descemet_folds": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "detached_retina": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "diabetes_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_focus_change": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_focusing": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_near": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_reading": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_relaxing_focus": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "difficulty_sustaining_focus": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "dilated_veins": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "diplopia": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "disc_edema": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "disc_hemorrhage": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "discharge": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "discharge_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "distance_blur": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "distance_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "distance_problem": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "distance_symptoms": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "distortion": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "double_vision_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "drusen": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "dryness": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "medication",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 7,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "eczema_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "elevated_lesion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "elevated_mass": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "endothelial_loss": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "episodic": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 1,
      "tests": 0
    },
    "reachable": false
  },
  "epithelial_bullae": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "epithelial_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "epithelial_instability": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "eso_deviation_near": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "eso_distance": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "eso_distance_more": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "eso_near": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "eso_tropia": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "excess_tearing": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "exo_distance": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "exo_distance_more": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "exo_near": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "exo_tropia": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "exposure_symptoms": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "eye_down_out": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "eye_inward": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "eye_strain": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "family_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fatigue": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fb_sensation": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fever": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fibrin": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "field_defect": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 1,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "field_loss": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "field_loss_half": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "flare_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "flashes": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "flat_pigmented_area": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "floaters": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fluctuating_blur": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fluctuating_vision": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "fluorescein_branching": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "fluorescein_multiple_spots": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "fluorescein_positive": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "fluorescein_ulcer": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "follicles_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "foreign_body_sensation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text"
    ],
    "usage": {
      "req": 1,
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "foveal_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "fundal_involvement": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "fundal_lesion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "generalized_corneal_thinning": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ghosting": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "giant_papillae": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "glare": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 7,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "global_thinning": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "gonioscopy_NVA": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "gonioscopy_narrow": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "gonioscopy_pigment": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "gradual": {
    "type_hint": "temporal",
    "sources": [
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 2,
      "tests": 0
    },
    "reachable": true
  },
  "gradual_blur": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "gradual_onset": {
    "type_hint": "symptom",
    "sources": [
      "free_text"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "gradual_progression": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "grittiness": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "guttata": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "halos": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "head_tilt": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "headache": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "headache_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hemorrhages": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "high_ACA_ratio": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "high_astigmatism": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "high_iop": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 5,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "history_positive": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "history_trauma_or_infection": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "holding_far": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "horizontal_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hypermature_lens": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "hyperopia": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hypertension_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hyphema_possible": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "hypopyon_level": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "hypopyon_possible": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "hypopyon_visible": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ifis_risk": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "improves_with_correction": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "improves_with_minus": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "incomplete_blink": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "incomplete_lid_closure": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "increased_cd": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "inferior_corneal_thinning": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "inferior_staining": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "intermittent": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 3,
      "tests": 0
    },
    "reachable": true
  },
  "intermittent_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "intermittent_eye_out": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "interpalpebral_band": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "inward_lid_turning": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "iridodonesis": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "iris_transillumination": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "irregular_astigmatism": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "irregular_surface": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "irritation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "itching_dominant": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 0,
      "con": 5,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "itching_lashes": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "keratic_precipitates": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "krukenberg_spindle": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "lacrimal_regurgitation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lag_accommodation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lagophthalmos": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lash_debris": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lash_direction_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lash_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lash_loss": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lash_mite_visualization": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lateral_canthus_irritation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lattice_pattern": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lead_of_accommodation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lens_decentration": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lens_displacement": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lens_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "leukocoria": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lid_crusting": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lid_eversion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "lid_margin_changes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "lid_margin_irregularity": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lid_position_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "lid_sticking_morning": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lid_swelling_diffuse": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "limbal_nodule": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "limited_abduction": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lipid_ring": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "localized_conjunctival_elevation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "localized_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "localized_inflammation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "localized_lid_swelling": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "localized_pustule": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "localized_swelling": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "localized_vision_loss": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "losing_place_reading": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "low_amplitude": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "macular_pucker": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "macular_screening_needed": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "marfan_association": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "mature_cataract": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "medial_canthus_swelling": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "meibomian_blockage": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "meibomian_dysfunction": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "meibomian_gland_dropout": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "meibum_quality_poor": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "metamorphopsia": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "microaneurysm": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "micropsia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "mid_dilated_pupil": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "migraine_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "minimal_pain": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "minimal_redness": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "minus_acceptance": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "miosis": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "misdirected_lashes": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "moderate_loss": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "monocular_diplopia": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "morning_blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "morning_stickiness": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "motility_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "ms_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "myopia": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "myopic_shift": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "narrow_angle": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "nausea_vomiting": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "near_blur": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 1,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "near_strain": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "near_symptoms": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "neuro_imaging": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "new_vessels_cornea": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "night_blindness": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "nodular_elevation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "nodular_lesion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "non_healing_epithelium": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "normal_eye_exam": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "normal_fundus": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "normal_iop": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "normal_or_swollen_disc": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "nrr_thinning": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "nuclear_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "nystagmus": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "nystagmus_other_eye": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "older_age": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "opacity_localized": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "optic_atrophy": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "optic_disc_change": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "optic_disc_pallor": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "outward_lid_turning": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pachymetry_thin": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "pain": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 7,
      "sup": 8,
      "con": 4,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_acute": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_dominant": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "pain_eye_movement": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_moderate": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_morning": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_severe": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 4,
      "sup": 1,
      "con": 3,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "painless": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "painless_lid_nodule": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pale_disc": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "papillae_present": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "pediatric": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "peripheral_corneal_ring": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "peripheral_degeneration": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "peripheral_field_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "peripheral_infiltrate": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "peripheral_ulceration": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "phacodonesis": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "phacolytic": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "photophobia": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 13,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "photophobia_mild": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "photophobia_strong": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "pigment_dispersion": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pigmented_lesion": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "plus_acceptance": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "post_cataract_surgery_blur": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "post_surgery": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "posterior_synechiae": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "preauricular_node": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "progressive": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 18,
      "tests": 0
    },
    "reachable": true
  },
  "progressive_blur": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "progressive_vision_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "proptosis": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "protrusion": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "ptosis": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "punctate_epithelial_lesions": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "punctate_staining": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "pupil_abnormal": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "pupil_involvement": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "purulent_discharge": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 4,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pxf_material": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pxf_on_lens": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "quadrant_field_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ra_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "raised_intracranial_pressure": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "raised_iop": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "raised_iop_risk": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "rapid_change": {
    "type_hint": "sign",
    "sources": [
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "rapid_progression": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 1,
      "tests": 0
    },
    "reachable": false
  },
  "reading_difficulty": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "recent_viral_history": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "recovery": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "recurrent": {
    "type_hint": "temporal",
    "sources": [
      "dictionary",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 7,
      "tests": 0
    },
    "reachable": true
  },
  "recurrent_episode": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "recurrent_pain": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "red_patch": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "red_reflex_absent": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "redness": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 18,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_PFV": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "reduced_VA": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "reduced_acuity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "reduced_amplitude": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_color_vision": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "reduced_contrast": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_corneal_sensation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_flipper_rate": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "reduced_near_VA": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "reduced_sensation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "reduced_stamina": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_tearing": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_vergence_ranges": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "reduced_vision": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 15,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "reduced_wear_time": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "refraction_difference": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "restricted_motility": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "retinal_break": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "retinal_ischemia": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "retinal_thickening": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "retinal_wrinkling": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "risk_detachment": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ropy_discharge": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "rosette_pattern": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "rubeosis_iridis": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "same_side_both_eyes": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "schirmer_low": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "screen_use_exacerbation": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "seasonal": {
    "type_hint": "temporal",
    "sources": [
      "dictionary",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 2,
      "tests": 0
    },
    "reachable": true
  },
  "sector_iris_atrophy": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "sectoral_blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "sectoral_hemorrhage": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "severe_loss": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "severe_pain": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "severe_pain_constant": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "shadowing": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "shallow_ac": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "skin_association": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "skin_rash": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "sle_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "slitlamp_clear": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "slitlamp_general": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "slitlamp_localized": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "slitlamp_progression": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "slow_focus_shift": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "snowball_opacities": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "snowbanking": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "spasm": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "squinting": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "stable": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 1,
      "tests": 0
    },
    "reachable": false
  },
  "stellate_KPs": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "steroid_history": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "steroid_use_confirmed": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "stress_history": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "stringy_mucus": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "stromal_infiltrate": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "stromal_inflammation": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "stromal_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "stromal_swelling": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "subacute": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 2,
      "tests": 0
    },
    "reachable": true
  },
  "subepithelial_nodules": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "subretinal_fluid": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 3
    },
    "reachable": false
  },
  "sudden": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "sudden_floaters": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "sudden_onset": {
    "type_hint": "sign",
    "sources": [
      "finding_map",
      "free_text"
    ],
    "usage": {
      "req": 0,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "sudden_vision_loss": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 0,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "superior_oblique_defect": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "suppression": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "synechiae": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "syringing_block": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "tear_film_instability": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "tear_meniscus_low": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "tear_overflow": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "tearing": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "telangiectatic_vessels": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "temporal_field_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "tenderness": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "thick_meibum": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "thickened_retina": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "thin_cornea": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "thyroid_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "topography_abnormal": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "topography_pattern": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "toxic_optic_risk": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "transient_vision_blur": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "transient_vision_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "trauma_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "tunnel_vision": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "unequal_refractive_error": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "unequal_vision": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "unilateral": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "unilateral_asymmetric": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "unilateral_start": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "van_herick_narrow": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "variable": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 7,
      "tests": 0
    },
    "reachable": false
  },
  "variable_blur": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "vascular_ingrowth": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vascular_insufficiency": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vertical_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "vision_hazy": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "vision_loss": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 0,
      "con": 3,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "visual_disturbance": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "visual_field_defect": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 3
    },
    "reachable": true
  },
  "visual_field_localization": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "visual_field_test": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vitreous_cells": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": false
  },
  "vitreous_haze": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vitreous_opacity": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vitreous_separation": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "vomiting": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "watering": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 8,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "watery_discharge": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "weiss_ring": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  },
  "worse_distance": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "worse_evening": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "young_age": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "young_male": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "younger_age": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": false
  },
  "zonule_assessment": {
    "type_hint": "unknown",
    "sources": [],
    "usage": {
      "req": 0,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": false
  }
};

var TOKEN_REGISTRY_STATS = {
  "total": 490,
  "reachable": 255,
  "unreachable_required": [],
  "unreachable_supportive": [
    "IOL_present",
    "PSC_pattern",
    "acute_discharge",
    "acute_onset",
    "acute_pain",
    "acute_severe_pain",
    "alternating",
    "asymptomatic",
    "back_pain_history",
    "blisters_epithelium",
    "both_eyes",
    "brain_origin",
    "chorioretinal_lesion",
    "chronic_course",
    "ciliary_flush",
    "distance_symptoms",
    "exposure_symptoms",
    "fluctuating_vision",
    "gradual_progression",
    "high_astigmatism",
    "irregular_surface",
    "krukenberg_spindle",
    "lid_margin_changes",
    "localized_defect",
    "localized_vision_loss",
    "marfan_association",
    "mature_cataract",
    "metamorphopsia",
    "mid_dilated_pupil",
    "minimal_pain",
    "minimal_redness",
    "miosis",
    "moderate_loss",
    "monocular_diplopia",
    "myopic_shift",
    "nausea_vomiting",
    "near_symptoms",
    "non_healing_epithelium",
    "normal_eye_exam",
    "nystagmus",
    "pain_dominant",
    "painless",
    "pediatric",
    "phacolytic",
    "photophobia_strong",
    "proptosis",
    "protrusion",
    "raised_iop",
    "recovery",
    "recurrent_pain",
    "reduced_acuity",
    "reduced_sensation",
    "rosette_pattern",
    "same_side_both_eyes",
    "sector_iris_atrophy",
    "severe_loss",
    "severe_pain",
    "severe_pain_constant",
    "skin_rash",
    "snowbanking",
    "sudden",
    "synechiae",
    "tear_overflow",
    "thickened_retina",
    "transient_vision_blur",
    "unilateral",
    "unilateral_asymmetric",
    "unilateral_start",
    "young_male",
    "younger_age"
  ],
  "test_label_only": 160,
  "produced_never_consumed": 19
};
