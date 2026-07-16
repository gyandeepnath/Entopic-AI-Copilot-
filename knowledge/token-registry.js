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
  "B_scan_ultrasound": {
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
  "CT_orbits_imaging": {
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
      "tests": 8
    },
    "reachable": true
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
  "RAPD_positive": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 2
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
      "temporal": 80,
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
      "con": 1,
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
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "anisocoria": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
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
  "anisocoria_dark_greater": {
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
  "anterior_synechiae": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "aphakia": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "apraclonidine_test": {
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
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "arteriolar_narrowing": {
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
  "asteroid_hyalosis": {
    "type_hint": "sign",
    "sources": [
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
  "asthenopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 16,
      "con": 1,
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
      "sup": 3,
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
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "autoimmune_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 2,
      "sup": 7,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "av_nicking": {
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
      "sup": 7,
      "con": 3,
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
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "blepharitis_anterior": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "blepharitis_posterior": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text"
    ],
    "usage": {
      "req": 6,
      "sup": 22,
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
      "sup": 4,
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
  "bullae_blisters": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "sup": 17,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "busacca_nodules": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "c_d_asymmetry_0_2": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cd_asymmetry": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
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
  "cells_0_5": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cells_1": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cells_2": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cells_3": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cells_4": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cells_present": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 17
    },
    "reachable": true
  },
  "central_blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 10,
      "sup": 17,
      "con": 2,
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
      "req": 7,
      "sup": 18,
      "con": 3,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "chalazion": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "chemical_splash": {
    "type_hint": "symptom",
    "sources": [
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
  "chemosis": {
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
  "cherry_red_spot": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
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
  "choroidal_folds": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "choroidal_lesion_elevated": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "choroidal_nevus_flat": {
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
  "choroidal_rupture": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "temporal": 138,
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
  "chronic_irritation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 28,
      "con": 9,
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
      "req": 4,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ciliary_flush": {
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
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cobblestone_papillae": {
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
  "collarettes": {
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
  "color_vision_loss": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 10,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "conjunctival_cyst": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "conjunctival_edema": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "conjunctival_foreign_body": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "conjunctival_growth_cornea": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 2,
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
      "req": 1,
      "sup": 1,
      "con": 12,
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
      "req": 5,
      "sup": 3,
      "con": 2,
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
      "req": 4,
      "sup": 7,
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
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "corneal_foreign_body": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "corneal_neovascularization": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "corneal_opacity": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 5,
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
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "corneal_opacity_central": {
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
  "corneal_opacity_peripheral": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "corneal_scar": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "corneal_thinning_central": {
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
  "corneal_thinning_generalized": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "corneal_thinning_inferior": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cortical_opacity": {
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
  "cotton_wool_spots": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "cracking_skin": {
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
      "con": 1,
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
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "cylindrical_dandruff_demodex": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "cystoid_macular_edema_cme": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "dark_spots": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 12,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "deep_boring_pain": {
    "type_hint": "symptom",
    "sources": [
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "dendritic_ulcer": {
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
  "diabetes_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 10,
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
      "req": 1,
      "sup": 4,
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
      "sup": 2,
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
      "sup": 15,
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
  "diffuse_injection": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "dilated_tortuous_veins": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
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
      "req": 2,
      "sup": 19,
      "con": 12,
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
      "req": 2,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 6
    },
    "reachable": true
  },
  "disc_edema_bilateral": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "disc_edema_unilateral": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "disc_hemorrhage": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "disc_pallor_partial": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "disc_pallor_total": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "discharge": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
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
      "req": 2,
      "sup": 4,
      "con": 2,
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
      "con": 3,
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
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "req": 7,
      "sup": 23,
      "con": 23,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "dot_blot_hemorrhages": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "double_vision_near": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
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
  "drusen_large_125_m": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "drusen_medium_63_125_m": {
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
  "drusen_small_63_m": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "req": 5,
      "sup": 15,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ectropion": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "eczema_history": {
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
      "req": 4,
      "sup": 0,
      "con": 2,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "entropion": {
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
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "erm_macular_pucker": {
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
      "con": 1,
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
      "req": 2,
      "sup": 0,
      "con": 1,
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
      "req": 5,
      "sup": 3,
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
      "req": 3,
      "sup": 0,
      "con": 3,
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
      "sup": 1,
      "con": 1,
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
  "eye_down_out": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
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
  "eye_inward": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 4,
      "con": 3,
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
      "sup": 7,
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
      "req": 7,
      "sup": 28,
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
      "sup": 9,
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
      "sup": 5,
      "con": 2,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fibrin": {
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
  "field_defect": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 3,
      "sup": 15,
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
      "req": 2,
      "sup": 7,
      "con": 33,
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
      "req": 2,
      "sup": 0,
      "con": 4,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "flame_hemorrhages": {
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
  "flare_1": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "flare_2": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "flare_3": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "flare_4": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "flare_present": {
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
  "flashes": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 3,
      "con": 7,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "fleischer_ring": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "floaters": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 12,
      "sup": 17,
      "con": 7,
      "temporal": 0,
      "tests": 1
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
      "sup": 11,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
  "follicles": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
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
  "foreign_body_high_speed": {
    "type_hint": "symptom",
    "sources": [
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
  "foreign_body_sensation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text"
    ],
    "usage": {
      "req": 5,
      "sup": 49,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "foveal_reflex_absent": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "geographic_atrophy": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "ghosting": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 13,
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
      "sup": 3,
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
      "req": 4,
      "sup": 21,
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
      "req": 4,
      "sup": 15,
      "con": 4,
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
      "con": 56,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "guttata": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "sup": 21,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hard_exudates": {
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
  "head_tilt": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 2,
      "sup": 6,
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
      "req": 2,
      "sup": 28,
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
      "sup": 7,
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
  "heterochromia": {
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
  "high_ACA_ratio": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
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
  "high_iop": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 10,
      "sup": 14,
      "con": 1,
      "temporal": 0,
      "tests": 7
    },
    "reachable": true
  },
  "high_speed_particle": {
    "type_hint": "symptom",
    "sources": [
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 3,
      "con": 0,
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
      "sup": 2,
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
  "hordeolum_stye": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "horizontal_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 2,
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
      "sup": 7,
      "con": 2,
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
      "req": 3,
      "sup": 10,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "hyphema": {
    "type_hint": "sign",
    "sources": [
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
  "hyphema_visible": {
    "type_hint": "sign",
    "sources": [
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
  "hypopyon": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "hypopyon_visible": {
    "type_hint": "sign",
    "sources": [
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
      "sup": 6,
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
      "sup": 3,
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
  "increased_c_d_ratio": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "increased_cd": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 10,
      "con": 0,
      "temporal": 0,
      "tests": 4
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
      "sup": 1,
      "con": 0,
      "temporal": 10,
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
      "req": 2,
      "sup": 6,
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
      "sup": 2,
      "con": 2,
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
  "iol_decentered": {
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
  "iol_in_bag": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "iol_sulcus": {
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
  "iris_atrophy": {
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
  "irma": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "irregular_astigmatism": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 4,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "irregular_corneal_surface": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "irritation": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 17,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "isnt_rule_violation": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "itching_dominant": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 5,
      "sup": 0,
      "con": 113,
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
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "jaw_claudication": {
    "type_hint": "symptom",
    "sources": [
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
  "koeppe_nodules": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "krukenberg_spindle": {
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
      "sup": 3,
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
  "lateral_canthus_inflammation": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "lattice_degeneration": {
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
  "lens_displacement": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
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
      "req": 3,
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "leukocoria_white_pupillary_reflex": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "lid_edema_diffuse": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "lid_edema_localized": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "lid_margin_irregularity": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 8,
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
  "lid_retraction": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
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
      "req": 2,
      "sup": 1,
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
      "req": 2,
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
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
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
      "sup": 3,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "req": 3,
      "sup": 1,
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
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
  "macular_edema_clinical": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "macular_hole": {
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
      "tests": 11
    },
    "reachable": true
  },
  "macular_star": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "madarosis": {
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
  "madarosis_lash_loss": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "medial_canthus_swelling": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 2,
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
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "meibomian_gland_dropout": {
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
  "meibomian_gland_plugging": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "meibum_quality_poor_granular": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "meibum_quality_poor_thick_paste": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "microaneurysms": {
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
  "micropsia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 9,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "migraine_history": {
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
  "misdirected_lashes": {
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
      "sup": 3,
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
      "req": 1,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "ms_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
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
  "myopia": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 3,
      "sup": 4,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "narrow_angle": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 2,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
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
      "tests": 1
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
      "sup": 7,
      "con": 2,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "req": 2,
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
      "req": 4,
      "sup": 6,
      "con": 16,
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
      "con": 8,
      "temporal": 0,
      "tests": 1
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
  "nrr_notching": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "nrr_thinning": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 3,
      "con": 1,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "nuclear_sclerosis_grade_1": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "nuclear_sclerosis_grade_2": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "nuclear_sclerosis_grade_3": {
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
  "nuclear_sclerosis_grade_4": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "nvd_neovascularization_disc": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "nve_neovascularization_elsewhere": {
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
  "nystagmus_other_eye": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
    ],
    "usage": {
      "req": 4,
      "sup": 5,
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
      "req": 5,
      "sup": 49,
      "con": 39,
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
  "optic_pit": {
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
  "oscillopsia": {
    "type_hint": "symptom",
    "sources": [
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "req": 10,
      "sup": 30,
      "con": 58,
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
      "sup": 2,
      "con": 3,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_eye_movement": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 3,
      "con": 3,
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
      "req": 2,
      "sup": 1,
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
      "req": 9,
      "sup": 5,
      "con": 86,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pain_worse_night": {
    "type_hint": "symptom",
    "sources": [
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
  "painless_lid_nodule": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 4,
      "sup": 1,
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
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 3
    },
    "reachable": true
  },
  "pannus": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "papillae": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "pavingstone_degeneration": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "pco": {
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
  "peripapillary_atrophy_alpha_zone": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "peripapillary_atrophy_beta_zone": {
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
  "peripheral_corneal_ring_arcus": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "peripheral_degeneration": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map"
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
  "peripheral_field_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 9,
      "con": 1,
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
      "req": 3,
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
  "phenylephrine_blanch": {
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
  "phenylephrine_no_blanch": {
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
      "req": 6,
      "sup": 42,
      "con": 8,
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
      "sup": 17,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pigment_dispersion": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 2,
      "temporal": 0,
      "tests": 1
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
      "req": 3,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pinguecula": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "req": 7,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "posterior_synechiae": {
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
  "preauricular_lymph_node": {
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
  "preauricular_node": {
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
      "temporal": 58,
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
      "sup": 5,
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
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "proptosis": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "symptom_chip"
    ],
    "usage": {
      "req": 4,
      "sup": 3,
      "con": 15,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "psc_opacity": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "pterygium": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "ptosis": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 5,
      "sup": 2,
      "con": 2,
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
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "punctate_staining_spk": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "con": 66,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "pvd_weiss_ring": {
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
  "pxf_material": {
    "type_hint": "sign",
    "sources": [
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
  "raised_iop_risk": {
    "type_hint": "risk_factor",
    "sources": [
      "medication"
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
  "reading_difficulty": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
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
  "recent_eye_trauma": {
    "type_hint": "symptom",
    "sources": [
      "symptom_chip"
    ],
    "usage": {
      "req": 8,
      "sup": 14,
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
      "req": 1,
      "sup": 5,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "temporal": 22,
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
      "req": 7,
      "sup": 22,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "red_patch": {
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
  "redness": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 3,
      "sup": 79,
      "con": 99,
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
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
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
  "reduced_contrast": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 28,
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
      "sup": 3,
      "con": 1,
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
  "reduced_stamina": {
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
      "sup": 3,
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
      "tests": 2
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
      "req": 9,
      "sup": 134,
      "con": 80,
      "temporal": 0,
      "tests": 1
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
      "sup": 5,
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
      "tests": 2
    },
    "reachable": false
  },
  "restricted_motility": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 2,
      "sup": 8,
      "con": 6,
      "temporal": 0,
      "tests": 6
    },
    "reachable": true
  },
  "retinal_break": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "retinal_detachment_partial": {
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
  "retinal_detachment_total": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "retinal_ischemia": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 6,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "retinal_tear_horseshoe": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "retinal_tear_operculated": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "retinoschisis": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "risk_detachment": {
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
  "ropy_discharge": {
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
  "rpe_changes": {
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
  "rubeosis_iridis": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "scalp_tenderness": {
    "type_hint": "symptom",
    "sources": [
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
      "tests": 2
    },
    "reachable": true
  },
  "schirmer_reduced_10mm": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "schirmer_severely_reduced_5mm": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "scintillating_scotoma": {
    "type_hint": "symptom",
    "sources": [
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
  "scleral_edema": {
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
  "screen_use_exacerbation": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
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
  "seasonal": {
    "type_hint": "temporal",
    "sources": [
      "dictionary",
      "temporal"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 1,
      "temporal": 2,
      "tests": 0
    },
    "reachable": true
  },
  "sectoral_blur": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "sectoral_hemorrhage": {
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
  "sectoral_injection": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "sectoral_redness": {
    "type_hint": "symptom",
    "sources": [
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
  "shadowing": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
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
  "shafer_sign_tobacco_dust": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "shallow_ac": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived",
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 1,
      "temporal": 0,
      "tests": 3
    },
    "reachable": true
  },
  "silver_copper_wiring": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "spasm": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 2,
      "sup": 2,
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
      "sup": 7,
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
      "req": 2,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "stress_history": {
    "type_hint": "lexical",
    "sources": [
      "dictionary"
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
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 4
    },
    "reachable": true
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
      "temporal": 27,
      "tests": 0
    },
    "reachable": true
  },
  "subconjunctival_hemorrhage": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "subluxation": {
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
  "subretinal_fluid": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 3
    },
    "reachable": true
  },
  "subretinal_hemorrhage_cnv": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 2,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "sup": 3,
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
      "req": 1,
      "sup": 17,
      "con": 22,
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
      "req": 3,
      "sup": 0,
      "con": 55,
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
      "sup": 8,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "synechiae": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
  "tbut_reduced_10s": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "tbut_severely_reduced_5s": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "tear_film_debris": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "tear_film_foamy": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "tear_meniscus_absent": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "tear_meniscus_low": {
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
  "tearing": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 9,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "temporal_field_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
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
  "tenderness": {
    "type_hint": "sign",
    "sources": [
      "dictionary",
      "finding_map",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 8,
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
  "thin_cornea": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 1
    },
    "reachable": true
  },
  "thyroid_function_tests": {
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
  "thyroid_history": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "engine_derived"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 1,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "tilted_disc": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
      "req": 1,
      "sup": 0,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "transient_vision_loss": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
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
  "transillumination_defects": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 1
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
      "req": 6,
      "sup": 11,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "trichiasis": {
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
  "tunnel_vision": {
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
  "unequal_refractive_error": {
    "type_hint": "derived_measurement_or_history",
    "sources": [
      "dictionary",
      "engine_derived"
    ],
    "usage": {
      "req": 3,
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
      "req": 1,
      "sup": 4,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
      "sup": 3,
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
  "venous_beading": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "venous_looping": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "vertical_diplopia": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "symptom_chip"
    ],
    "usage": {
      "req": 6,
      "sup": 3,
      "con": 1,
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
      "sup": 7,
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
      "con": 0,
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
      "sup": 8,
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
      "tests": 6
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
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 0,
      "sup": 2,
      "con": 0,
      "temporal": 0,
      "tests": 4
    },
    "reachable": true
  },
  "vitreous_hemorrhage": {
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
  "vitreous_opacity": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
    ],
    "usage": {
      "req": 1,
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 2
    },
    "reachable": true
  },
  "vogt_striae": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "vomiting": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
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
  "watering": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 0,
      "sup": 36,
      "con": 1,
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
      "sup": 1,
      "con": 0,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
  },
  "white_cataract": {
    "type_hint": "sign",
    "sources": [
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
  "white_without_pressure": {
    "type_hint": "sign",
    "sources": [
      "finding_map"
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
  "worse_distance": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
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
  "worse_evening": {
    "type_hint": "symptom",
    "sources": [
      "dictionary",
      "free_text",
      "symptom_chip"
    ],
    "usage": {
      "req": 1,
      "sup": 18,
      "con": 1,
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
      "req": 17,
      "sup": 46,
      "con": 14,
      "temporal": 0,
      "tests": 0
    },
    "reachable": true
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
  "total": 529,
  "reachable": 428,
  "unreachable_required": [],
  "unreachable_supportive": [
    "madarosis"
  ],
  "test_label_only": 96,
  "produced_never_consumed": 98
};
