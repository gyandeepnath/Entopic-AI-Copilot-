/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DIAGNOSTIC ENGINE                                     */
/*                                                                  */
/* Pipeline:                                                        */
/*   COLLECT → PARSE → NORMALIZE → TEMPORAL WEIGHT →               */
/*   INJECT FINDINGS → AUTO-DERIVE → DECISION TREE →               */
/*   ROUTE → SCORE → EXCLUDE → RANK → EVIDENCE →                  */
/*   NUDGE → ALERT → LOG                                           */
/*                                                                  */
/* Reads from: KNOWLEDGE_ALL, FINDING_TOKEN_MAP, TOKEN_DICTIONARY  */
/* Writes to:  V.dxList, V.alerts, V.nudges, V.engineLog          */
/*                                                                  */
/* This engine runs on EVERY data change across the entire exam.   */
/* It produces results ONLY when clinical evidence exists.          */
/* Zero evidence = zero diagnoses. No guessing.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── CLINICAL THRESHOLDS — FAIL-SAFE SHIM  (Phase 4 F-4) ──────────
   Every clinical number the engine compares against now lives in
   knowledge/clinical-thresholds.js, so a clinician can read and sign off
   the numbers that decide differentials without reading JavaScript. The
   engine calls clinThreshold("iop_high", 21) — the literal stays as the
   fallback, and tests/clinical-thresholds.test.js pins the two together
   so they can never become two different rules.

   If that file fails to load the exam must still work (ADR-006), so a
   missing knowledge file degrades to the fallbacks rather than crashing.
   `var` without assignment is deliberate: in the browser both files share
   global scope, and a bare re-declaration does not overwrite. */

var clinThreshold, scoreThreshold;
if (typeof clinThreshold !== "function") {
  clinThreshold = function (id, fallback) { return fallback; };
}
if (typeof scoreThreshold !== "function") {
  scoreThreshold = function (id, fallback) { return fallback; };
}


/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE STATE                                                    */
/* Persistent across the current session                           */
/* ═══════════════════════════════════════════════════════════════ */

var ENGINE_STATE = {
  tokens: [],
  routes: [],
  results: [],
  evidence: {},
  lastRun: null,
  runCount: 0
};


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 1: COLLECT TOKENS FROM ALL VISIT DATA                     */
/*                                                                  */
/* Reads every field in V (visit data) and P (patient data)        */
/* and converts clinical inputs into engine tokens.                */
/*                                                                  */
/* Sources:                                                         */
/*   1. Selected symptoms (chips)                                  */
/*   2. Free-text chief complaint (regex parser)                   */
/*   3. Temporal pattern selections                                */
/*   4. Slit lamp findings (via FINDING_TOKEN_MAP)                 */
/*   5. Fundus findings (via FINDING_TOKEN_MAP)                    */
/*   6. Medical history flags                                      */
/*   7. Ocular history flags                                       */
/*   8. Family history flags                                       */
/*   9. Auto-derived from measurements (IOP, BV, Rx, VA, etc.)    */
/* ═══════════════════════════════════════════════════════════════ */

/* Is a free-text colour-vision entry a DEFECT?
   Handles the notations clinicians actually type: "17/17" and "14/14" are
   full scores (normal); "12/17" is a defect; the words normal/full/WNL/NAD
   are normal; protan/deutan/tritan/defect/fail/abnormal are defects.
   Anything unrecognised is treated as NOT a defect — the structured
   colour-vision block is the place to assert one. */
function colorVisionTextDefective(s) {
  s = (s || "").trim();
  if (!s) return false;
  if (/^(normal|full|wnl|nad|nil|none|pass(ed)?)$/i.test(s)) return false;
  var m = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) return parseInt(m[1], 10) < parseInt(m[2], 10);
  return /defect|abnorm|fail|reduced|protan|deutan|tritan|dyschrom|colou?r\s*blind/i.test(s);
}

function collectTokens() {

  var tokens = [];

  /* Helper: add token if not already present.
     Canonicalise synonyms first (see TOKEN_ALIASES) so every producer —
     chips, free-text, findings, derived measurements — converges on one
     token and the differential can't fragment on phrasing. */
  function addToken(t) {
    if (typeof canonicalToken === "function") t = canonicalToken(t);
    if (t && tokens.indexOf(t) === -1) {
      tokens.push(t);
    }
  }

  /* Helper: add array of tokens */
  function addTokens(arr) {
    if (!arr) return;
    for (var i = 0; i < arr.length; i++) {
      addToken(arr[i]);
    }
  }

  /* Helpers for structured slit-lamp fields. */
  function slGrade(v) { /* "0", "0.5+", "1+" … "4+" → integer grade */
    if (!v) return 0;
    var m = String(v).match(/(\d+(?:\.\d+)?)/);
    return m ? Math.round(parseFloat(m[1])) : 0;
  }
  function slNum(v) { var n = parseFloat(v); return (isNaN(n) || n <= 0) ? 999 : n; }
  /* Free-text keyword tokenizer for exam boxes. NEGATION-AWARE: a clinician (and
     our own default placeholders like "Flat, no breaks") routinely records the
     ABSENCE of a sign — "no breaks", "without exudates", "denies floaters". A
     naive substring match would read "no breaks" as a retinal break and fabricate
     an urgent finding. So before emitting a token we confirm the keyword is not
     immediately preceded by a negation cue. This keeps the free-text path from
     manufacturing junk (a hard guardrail: no invented findings). */
  var SL_NEG_CUES = ["no ", "no-", "not ", "non-", "without", "w/o", "neg ", "negative", "denies", "absent", "free of", "-free", "resolved", "r/o", "rule out", "ruled out", "unremarkable"];
  function slNegatedAt(s, idx) {
    /* Clause-scoped negation: find the clause the keyword sits in (bounded by a
       clause separator or an adversative like "but"), then negate only if a cue
       appears earlier in THAT clause. So "no hard exudates" negates exudates, but
       "no injection but exudates present" does not. "and"/"with" do NOT break the
       clause, so "no exudates and hemorrhage" negates both. */
    var pre = s.slice(0, idx);
    var seps = [",", ";", ".", " but ", " however ", "+"];
    var start = 0;
    for (var k = 0; k < seps.length; k++) {
      var p = pre.lastIndexOf(seps[k]);
      if (p >= 0 && p + seps[k].length > start) start = p + seps[k].length;
    }
    var clause = pre.slice(start);
    for (var n = 0; n < SL_NEG_CUES.length; n++) if (clause.indexOf(SL_NEG_CUES[n]) >= 0) return true;
    return false;
  }
  function slParseText(vals, map, add) {
    for (var i = 0; i < vals.length; i++) {
      var s = (vals[i] || "").toLowerCase();
      if (!s || s === "clear" || s === "white and quiet" || s === "wnl" || s === "normal") continue;
      for (var kw in map) {
        var idx = s.indexOf(kw);
        if (idx >= 0 && !slNegatedAt(s, idx)) add(map[kw]);
      }
    }
  }


  /* ── SOURCE 1: Selected symptoms (direct — these ARE tokens) ── */
  if (V.symptoms && V.symptoms.length > 0) {
    addTokens(V.symptoms);
  }


  /* ── SOURCE 2: Free-text CC (parsed via regex) ── */
  if (V.cc && V.cc.length > 3) {
    var ccTokens = parseComplaintText(V.cc.toLowerCase());
    addTokens(ccTokens);
  }


  /* ── SOURCE 3: Temporal pattern ── */
  if (V.temporal) {
    if (V.temporal.onset) {
      addToken(V.temporal.onset);
      /* The onset selector uses the temporal-field vocabulary (acute/gradual/…),
         but many conditions carry the onset signal in their req/sup/con lists
         under sudden_onset / gradual_onset. Bridge the two so that explicitly
         recording onset from the UI actually feeds those matches — otherwise the
         signal is only reachable via free text. */
      if (V.temporal.onset === "acute")   addToken("sudden_onset");
      if (V.temporal.onset === "gradual") addToken("gradual_onset");
    }
    if (V.temporal.duration) {
      /* Map duration to temporal categories */
      if (V.temporal.duration === "hours" || V.temporal.duration === "days") addToken("acute");
      if (V.temporal.duration === "weeks") addToken("subacute");
      if (V.temporal.duration === "months" || V.temporal.duration === "years") addToken("chronic");
    }
    if (V.temporal.course) {
      if (V.temporal.course === "worsening") addToken("progressive");
      if (V.temporal.course === "variable") addToken("intermittent");
    }
  }


  /* ── SOURCE 4: Slit lamp findings → tokens via map ── */
  if (V.sl && V.sl.findings && V.sl.findings.length > 0) {
    for (var si = 0; si < V.sl.findings.length; si++) {
      /* A finding is {label, eye} since CL-2, but a bare string (legacy
         records, and the simulator) is still accepted. The TOKEN comes from
         the label either way, so scoring and red flags are unchanged — the
         eye is recorded for the note, not for the engine. */
      var slFind = V.sl.findings[si];
      var slLabel = (slFind && typeof slFind === "object") ? slFind.label : slFind;
      if (typeof FINDING_TOKEN_MAP !== "undefined" && FINDING_TOKEN_MAP[slLabel]) {
        addTokens(FINDING_TOKEN_MAP[slLabel]);
      }
    }
  }


  /* ── SOURCE 5: Fundus findings → tokens via map ── */
  if (V.fun && V.fun.findings && V.fun.findings.length > 0) {
    for (var fi = 0; fi < V.fun.findings.length; fi++) {
      var funFind = V.fun.findings[fi];
      var funLabel = (funFind && typeof funFind === "object") ? funFind.label : funFind;
      if (typeof FINDING_TOKEN_MAP !== "undefined" && FINDING_TOKEN_MAP[funLabel]) {
        addTokens(FINDING_TOKEN_MAP[funLabel]);
      }
    }
  }


  /* ── SOURCE 6: Medical history flags ── */
  if (V.hxM) {
    if (V.hxM.dm)         addToken("diabetes_history");
    if (V.hxM.htn)        addToken("hypertension_history");
    if (V.hxM.autoimmune) addToken("autoimmune_history");
    if (V.hxM.thyroid)    addToken("thyroid_history");
    if (V.hxM.asthma)     addToken("asthma_atopy");
    if (V.hxM.eczema)     addToken("eczema_history");
    if (V.hxM.ra)         addToken("ra_history");
    if (V.hxM.sle)        addToken("sle_history");
    if (V.hxM.ms)         addToken("ms_history");
    if (V.hxM.migraine)   addToken("migraine_history");
  }


  /* Autoimmune history → token used by Scleritis and others */
  if (V.hxM && V.hxM.autoimmune) addToken("autoimmune_history");

  /* Pupils: anisocoria + which-is-larger (Horner vs CN III discriminator).
     od_l / os_l are the light-reaction pupil sizes (mm). */
  if (V.pupil) {
    var pod = parseFloat(V.pupil.od_l) || 0;
    var pos = parseFloat(V.pupil.os_l) || 0;
    if (pod > 0 && pos > 0 && Math.abs(pod - pos) >= clinThreshold("anisocoria_min", 1)) addToken("anisocoria");
  }

  /* Proptosis / lid retraction from the exophthalmometry fields, when present. */
  if (V.orbit) {
    var exOd = parseFloat(V.orbit.exoph_od) || 0;
    var exOs = parseFloat(V.orbit.exoph_os) || 0;
    var _prAbs = clinThreshold("proptosis_absolute", 21);
    if (exOd >= _prAbs || exOs >= _prAbs ||
        Math.abs(exOd - exOs) >= clinThreshold("proptosis_asymmetry", 2)) addToken("proptosis");
    if (V.orbit.lid_retraction) addToken("lid_retraction");
  }


  /* ── SOURCE 7: Ocular history flags ── */
  if (V.hxO && V.hxO.flags) {
    for (var oi = 0; oi < V.hxO.flags.length; oi++) {
      var flag = V.hxO.flags[oi];
      if (flag === "cl_wear" || flag === "cl_soft" || flag === "cl_rgp" || flag === "cl_scleral") {
        addToken("contact_lens_use");
        addToken("contact_lens_history");
      }
      if (flag === "trauma")      addToken("trauma_history");
      if (flag === "surgery")     addToken("post_surgery");
      if (flag === "blepharitis") addToken("blepharitis_history");
      if (flag === "uveitis")     addToken("recurrent_episode");
      if (flag === "herpes")      addToken("recurrent_episode");
      if (flag === "amblyopia")   addToken("suppression");
    }
  }


  /* ── SOURCE 8: Family history ── */
  if (V.hxF) {
    if (V.hxF.glaucoma)    addToken("family_history");
    if (V.hxF.amd)         addToken("family_history");
    if (V.hxF.rd)          { addToken("family_history"); addToken("risk_detachment"); }
    if (V.hxF.keratoconus) addToken("family_history");
    if (V.hxF.myopia_high) addToken("family_history");
    if (V.hxF.dm)          addToken("diabetes_history");
  }


  /* ── SOURCE 9: Auto-derived from measurements ── */

  /* Age-based tokens */
  var age = parseInt(P.age) || 0;
  if (age > 0) {
    /* Three brackets. `young_age` is DEPRECATED and keeps its original rule
       (under 18) so that conditions not yet reclassified behave exactly as
       before — see knowledge/age-classification.js. `paediatric_age` is its
       replacement with the same meaning; `young_adult_age` is the bracket that
       was missing, and whose absence had the KB tagging young-adult
       presentations as paediatric. */
    var _agePaed = clinThreshold("age_paediatric_max", 18);
    var _ageYA   = clinThreshold("age_young_adult_max", 40);
    var _age40   = clinThreshold("age_over_40", 40);
    var _ageOld  = clinThreshold("age_older", 60);
    if (age < _agePaed)                     { addToken("young_age"); addToken("paediatric_age"); }
    if (age >= _agePaed && age < _ageYA)    addToken("young_adult_age");
    if (age >= _age40) addToken("age_over_40");
    if (age >= _ageOld) addToken("older_age");
    if (age >= _age40) addToken("age_related");
  }

  /* IOP auto-derivation */
  if (V.iop) {
    var iopOd = parseFloat(V.iop.od) || 0;
    var iopOs = parseFloat(V.iop.os) || 0;
    var iopMax = Math.max(iopOd, iopOs);
    var _iopHigh = clinThreshold("iop_high", 21);
    if (iopMax > _iopHigh) addToken("high_iop");
    if (iopMax > clinThreshold("iop_very_high", 30)) addToken("very_high_iop");
    if (iopMax > 0 && iopMax <= _iopHigh) addToken("normal_iop");
  }

  /* CCT / Pachymetry */
  if (V.iop) {
    var cctOd = parseFloat(V.iop.od_cct) || 0;
    var cctOs = parseFloat(V.iop.os_cct) || 0;
    var cctMin = 0;
    if (cctOd > 0 && cctOs > 0) cctMin = Math.min(cctOd, cctOs);
    else if (cctOd > 0) cctMin = cctOd;
    else if (cctOs > 0) cctMin = cctOs;
    if (cctMin > 0 && cctMin < clinThreshold("cct_thin", 520)) addToken("thin_cornea");
  }

  /* Van Herick */
  if (V.sl) {
    var vhOd = parseInt(V.sl.od.vh) || 99;
    var vhOs = parseInt(V.sl.os.vh) || 99;
    var _vhN = clinThreshold("van_herick_narrow", 2);
    if (vhOd <= _vhN || vhOs <= _vhN) { addToken("narrow_angle"); addToken("shallow_ac"); }
  }

  /* ── SOURCE 9b: STRUCTURED SLIT-LAMP GRADES + FREE-TEXT SIGNS ──
     The per-eye slit-lamp dropdowns and free-text fields are clickable but fed
     the engine nothing (AC cells only emitted a pain/photophobia proxy). Now
     each graded value and typed sign emits the matching finding token so
     recording it drives the differential live. (TBUT/Schirmer/LOCS→gradual_blur
     are handled in the measurement block below; here we add what was missing.) */
  if (V.sl) {
    /* AC cells (SUN 0 / 0.5+ / 1+ … 4+) → cells_present + severity grade */
    var cellsN = Math.max(slGrade(V.sl.od.cells), slGrade(V.sl.os.cells));
    if (cellsN > 0) {
      addToken("cells_present");
      if (cellsN >= clinThreshold("ac_cells_graded", 2)) addToken("cells_" + Math.min(cellsN, 4));
    }
    /* AC flare (SUN) → flare_present + grade */
    var flareN = Math.max(slGrade(V.sl.od.flare), slGrade(V.sl.os.flare));
    if (flareN > 0) {
      addToken("flare_present");
      if (flareN >= clinThreshold("ac_flare_graded", 2)) addToken("flare_" + Math.min(flareN, 4));
    }
    /* Lens LOCS graded tokens (nuclear grade / cortical / PSC opacities) */
    var nsN = Math.max(parseInt(V.sl.od.ns) || 0, parseInt(V.sl.os.ns) || 0);
    if (nsN >= clinThreshold("locs_ns_graded", 2)) addToken("nuclear_sclerosis_grade_" + Math.min(nsN, 4));
    var _locsC = clinThreshold("locs_cortical_opacity", 2);
    var _locsP = clinThreshold("locs_psc_opacity", 2);
    if ((parseInt(V.sl.od.c) || 0) >= _locsC || (parseInt(V.sl.os.c) || 0) >= _locsC) addToken("cortical_opacity");
    if ((parseInt(V.sl.od.psc) || 0) >= _locsP || (parseInt(V.sl.os.psc) || 0) >= _locsP) addToken("psc_opacity");
    /* Free-text lids / conjunctiva / cornea → keyword-parsed sign tokens */
    slParseText([V.sl.od.cornea, V.sl.os.cornea], {
      edema: "corneal_edema", scar: "corneal_scar", opacit: "corneal_opacity",
      infiltrat: "stromal_infiltrate", ulcer: "epithelial_defect", dendri: "dendritic_ulcer",
      guttat: "guttata", neovasc: "corneal_neovascularization", thin: "corneal_thinning", pannus: "pannus"
    }, addToken);
    slParseText([V.sl.od.conj, V.sl.os.conj], {
      inject: "redness", follicl: "follicles", papill: "papillae",
      chemosis: "chemosis", pterygium: "pterygium", hemorrhage: "red_patch", discharge: "discharge"
    }, addToken);
    slParseText([V.sl.od.lids, V.sl.os.lids], {
      blephar: "blepharitis_anterior", chalazion: "painless_lid_nodule", stye: "hordeolum_stye",
      ptosis: "ptosis", entropion: "entropion", ectropion: "ectropion", crust: "lid_crusting",
      mgd: "meibomian_dysfunction", swelling: "localized_lid_swelling"
    }, addToken);
  }

  /* RAPD */
  if (V.pupil && V.pupil.rapd !== "None") {
    addToken("RAPD_positive");
    addToken("reduced_vision");
  }

  /* NPC auto-derivation */
  if (V.bv && V.bv.npc_b) {
    var npc = parseFloat(V.bv.npc_b) || 0;
    if (npc >= clinThreshold("npc_receded", 6)) addToken("NPC_receded");
  }

  /* Cover test / phoria auto-derivation */
  if (V.bv && V.bv.ct_n) {
    var ctNear = V.bv.ct_n.toLowerCase();
    var phoriaMatch = ctNear.match(/(\d+\.?\d*)\s*(exo|eso)/);
    if (phoriaMatch) {
      var phoriaVal = parseFloat(phoriaMatch[1]);
      var phoriaDir = phoriaMatch[2];
      var _phN = clinThreshold("phoria_near_significant", 6);
      if (phoriaDir === "exo" && phoriaVal > _phN) addToken("exo_near");
      if (phoriaDir === "eso" && phoriaVal > _phN) addToken("eso_near");
    }
  }
  if (V.bv && V.bv.ct_d) {
    var ctDist = V.bv.ct_d.toLowerCase();
    var distMatch = ctDist.match(/(\d+\.?\d*)\s*(exo|eso)/);
    if (distMatch) {
      var distVal = parseFloat(distMatch[1]);
      var distDir = distMatch[2];
      var _phD = clinThreshold("phoria_distance_significant", 6);
      if (distDir === "exo" && distVal > _phD) addToken("exo_distance");
      if (distDir === "eso" && distVal > _phD) addToken("eso_distance");
    }
  }

  /* AC/A ratio */
  if (V.bv && V.bv.aca) {
    var acaMatch = V.bv.aca.match(/(\d+\.?\d*)/);
    if (acaMatch) {
      var acaVal = parseFloat(acaMatch[1]);
      if (acaVal > clinThreshold("aca_high", 6)) addToken("high_ACA_ratio");
    }
  }

  /* Accommodation amplitude */
  if (V.bv && (V.bv.acc_od || V.bv.acc_os)) {
    var accOd = parseFloat(V.bv.acc_od) || 999;
    var accOs = parseFloat(V.bv.acc_os) || 999;
    var accMin = Math.min(accOd, accOs);
    if (accMin < 999 && age > 0) {
      var hofMin = hofstetter(age).min;
      if (hofMin !== null && accMin < hofMin) {
        addToken("reduced_amplitude");
        addToken("low_amplitude");
      }
    }
  }

  /* Flipper rate (MAF / BAF) */
  if (V.bv && V.bv.maf_od) {
    var maf = parseFloat(V.bv.maf_od) || 999;
    if (maf < clinThreshold("flipper_reduced", 8) && maf < 999) addToken("reduced_flipper_rate");
  }

  /* Vergence ranges */
  if (V.bv) {
    var boNBk = parseFloat(V.bv.bo_n_bk) || 999;
    if (boNBk < clinThreshold("pfv_reduced", 15) && boNBk < 999) addToken("reduced_PFV");

    /* Check if any vergence range is significantly reduced */
    var anyReduced = false;
    var _vgR = clinThreshold("vergence_range_reduced", 8);
    var ranges = ["bo_d_bk", "bi_d_bk", "bo_n_bk", "bi_n_bk"];
    for (var ri = 0; ri < ranges.length; ri++) {
      var rv = parseFloat(V.bv[ranges[ri]]) || 0;
      if (rv > 0 && rv < _vgR) anyReduced = true;
    }
    if (anyReduced) addToken("reduced_vergence_ranges");
  }

  /* Refraction auto-derivation.
     Gated on ANY refraction value, not on od_sph alone: a pure astigmat
     recorded as "plano / -2.50 x 90" leaves od_sph empty, and the old gate
     threw away their whole refraction — no astigmatism token, no
     anisometropia check. Thresholds below are unchanged. */
  if (V.rx && (V.rx.od_sph || V.rx.os_sph || V.rx.od_cyl || V.rx.os_cyl)) {
    var sphOd = parseFloat(V.rx.od_sph) || 0;
    var sphOs = parseFloat(V.rx.os_sph) || 0;
    var _myo = clinThreshold("myopia_min", -0.50);
    var _hyp = clinThreshold("hyperopia_min", 0.75);
    if (sphOd < _myo || sphOs < _myo) addToken("myopia");
    if (sphOd > _hyp || sphOs > _hyp) addToken("hyperopia");

    var cylOd = parseFloat(V.rx.od_cyl) || 0;
    var cylOs = parseFloat(V.rx.os_cyl) || 0;
    var _ast = clinThreshold("astigmatism_min", 0.75);
    if (Math.abs(cylOd) >= _ast || Math.abs(cylOs) >= _ast) addToken("astigmatism");

    /* Anisometropia */
    if (Math.abs(sphOd - sphOs) >= clinThreshold("anisometropia_min", 1.0)) addToken("unequal_refractive_error");

    /* Add power */
    if (V.rx.od_add || V.rx.os_add) addToken("add_required");
  }

  /* VA auto-derivation */
  if (V.va) {
    /* Check if VA improves with correction */
    if (V.va.od_bva && V.va.od_un && V.va.od_bva !== V.va.od_un) {
      addToken("improves_with_correction");
    }
    if (V.va.os_bva && V.va.os_un && V.va.os_bva !== V.va.os_un) {
      addToken("improves_with_correction");
    }
  }

  /* C/D ratio auto-derivation */
  if (V.fun) {
    var cdOd = parseFloat(V.fun.od.cd_v) || 0;
    var cdOs = parseFloat(V.fun.os.cd_v) || 0;
    var _cdHi = clinThreshold("cd_increased", 0.6);
    if (cdOd >= _cdHi || cdOs >= _cdHi) addToken("increased_cd");
    if (cdOd > 0 && cdOs > 0 && Math.abs(cdOd - cdOs) > clinThreshold("cd_asymmetry", 0.2)) addToken("cd_asymmetry");
  }

  /* NRR from fundus */
  if (V.fun) {
    var nrrOd = (V.fun.od.nrr || "").toLowerCase();
    var nrrOs = (V.fun.os.nrr || "").toLowerCase();
    if (nrrOd.indexOf("thin") >= 0 || nrrOs.indexOf("thin") >= 0) addToken("nrr_thinning");
    if (nrrOd.indexOf("notch") >= 0 || nrrOs.indexOf("notch") >= 0) addToken("nrr_thinning");
  }

  /* Disc assessment */
  if (V.fun) {
    var discOd = (V.fun.od.disc || "").toLowerCase();
    var discOs = (V.fun.os.disc || "").toLowerCase();
    if (discOd.indexOf("pale") >= 0 || discOs.indexOf("pale") >= 0) addToken("pale_disc");
    if (discOd.indexOf("edema") >= 0 || discOs.indexOf("edema") >= 0) addToken("disc_edema");
  }

  /* Fundus macula / vessels / periphery / vitreous free-text → sign tokens */
  if (V.fun) {
    slParseText([V.fun.od.mac, V.fun.os.mac], {
      drusen: "drusen_medium_63_125_m", edema: "macular_edema_clinical", hole: "macular_hole",
      cnv: "subretinal_hemorrhage_cnv", cherry: "cherry_red_spot", pucker: "erm_macular_pucker",
      erm: "erm_macular_pucker", atrophy: "geographic_atrophy", star: "macular_star"
    }, addToken);
    slParseText([V.fun.od.vessels, V.fun.os.vessels], {
      cotton: "cotton_wool_spots", exudate: "hard_exudates", microaneurysm: "microaneurysms",
      hemorrhage: "dot_blot_hemorrhages", flame: "flame_hemorrhages", neovasc: "nve_neovascularization_elsewhere",
      nick: "av_nicking", narrow: "arteriolar_narrowing", beading: "venous_beading",
      occlus: "retinal_ischemia", tortuo: "dilated_tortuous_veins"
    }, addToken);
    slParseText([V.fun.od.periph, V.fun.os.periph], {
      lattice: "lattice_degeneration", tear: "retinal_break", break: "retinal_break",
      detach: "retinal_detachment_partial", hole: "retinal_break", schisis: "retinoschisis"
    }, addToken);
    slParseText([V.fun.od.vit, V.fun.os.vit], {
      hemorrhage: "vitreous_hemorrhage", weiss: "pvd_weiss_ring", pvd: "pvd_weiss_ring",
      cells: "vitreous_cells", tobacco: "shafer_sign_tobacco_dust", asteroid: "asteroid_hyalosis"
    }, addToken);
  }

  /* Motility — restriction, gaze deficits, nystagmus */
  if (V.mot) {
    var motTxt = ((V.mot.notes || "") + " " + (V.mot.versions || "") + " " + (V.mot.ductions || "")).toLowerCase();
    if (V.mot.versions && V.mot.versions !== "Full") addToken("restricted_motility");
    if (V.mot.ductions && V.mot.ductions !== "Full") addToken("restricted_motility");
    if (motTxt.indexOf("abduct") >= 0) addToken("limited_abduction");
    if (motTxt.indexOf("adduct") >= 0) addToken("adduction_deficit");
    if (V.mot.nystagmus && V.mot.nystagmus !== "None") addToken("nystagmus_other_eye");
    if (motTxt.indexOf("down") >= 0 && motTxt.indexOf("out") >= 0) addToken("eye_down_out");
  }

  /* Gonioscopy — narrow/closed angle (Shaffer grade ≤1 / Slit / closed),
     recession, pigment, neovascularization. */
  if (V.gon) {
    var gonVals = [V.gon.od.s, V.gon.od.n, V.gon.od.i, V.gon.od.t, V.gon.os.s, V.gon.os.n, V.gon.os.i, V.gon.os.t];
    var gonTxt = gonVals.join(" ").toLowerCase();
    var gonNarrow = false;
    for (var gi = 0; gi < gonVals.length; gi++) {
      var gv = String(gonVals[gi] || "").toLowerCase().trim();
      if (gv === "0" || gv === "1" || gv === "slit" || gv.indexOf("closed") >= 0 || gv.indexOf("narrow") >= 0) gonNarrow = true;
    }
    if (gonNarrow) { addToken("narrow_angle"); addToken("angle_closure_risk"); }
    if (gonTxt.indexOf("recess") >= 0) addToken("trauma_history");
    if (/nva|neovasc|rubeosis/.test(gonTxt)) addToken("rubeosis_iridis");
    if (/heavy|dense|3\+|4\+/.test(((V.gon.od.pig || "") + " " + (V.gon.os.pig || "")).toLowerCase())) addToken("pigment_dispersion");
  }

  /* Slit lamp specific fields */
  if (V.sl) {
    /* TBUT — emits the symptom-domain token AND the objective-test token
       (TBUT_reduced) so a measured result is scored as confirmation, not
       just a repeat of what the patient already reported. */
    var butOd = parseFloat(V.sl.od.but) || 999;
    var butOs = parseFloat(V.sl.os.but) || 999;
    var butMin = Math.min(butOd, butOs);
    if (butMin < clinThreshold("tbut_reduced", 10) && butMin < 999) {
      addToken("dryness");
      addToken("TBUT_reduced");
      addToken("tear_film_instability");
    }

    /* Schirmer — same pattern: symptom token + objective-test token */
    var schOd = parseFloat(V.sl.od.schirmer) || 999;
    var schOs = parseFloat(V.sl.os.schirmer) || 999;
    var schMin = Math.min(schOd, schOs);
    if (schMin < clinThreshold("schirmer_low", 10) && schMin < 999) {
      addToken("reduced_tearing");
      addToken("schirmer_low");
    }

    /* LOCS grading */
    var nsOd = parseInt(V.sl.od.ns) || 0;
    var nsOs = parseInt(V.sl.os.ns) || 0;
    var _nsBlur = clinThreshold("locs_ns_symptomatic", 2);
    var _nsGlare = clinThreshold("locs_ns_glare", 3);
    if (nsOd >= _nsBlur || nsOs >= _nsBlur) addToken("gradual_blur");
    if (nsOd >= _nsGlare || nsOs >= _nsGlare) addToken("glare");

    var pscOd = parseInt(V.sl.od.psc) || 0;
    var pscOs = parseInt(V.sl.os.psc) || 0;
    var _pscSym = clinThreshold("locs_psc_symptomatic", 1);
    if (pscOd >= _pscSym || pscOs >= _pscSym) { addToken("near_blur"); addToken("glare"); }
  }

  /* Neuro fields */
  if (V.neuro) {
    /* ── Colour vision ──────────────────────────────────────────────
       Previously ANY value other than the literal string "14/14" fired
       color_vision_loss — so a normal "17/17", or the word "Normal", was
       scored as a defect, and the OS score was never read at all. Now the
       clinician's explicit result drives it:
         • Normal / Not tested      → no token
         • Defective                → color_vision_loss
       A defect the clinician marks KNOWN CONGENITAL is documented but does
       not fire the token: a lifelong red-green defect is not evidence of an
       acquired optic neuropathy, and 15 KB conditions read this token.
       "Uncertain" still fires (safer default). Visits recorded before the
       structured block fall back to parsing the legacy free-text fields. */
    var _cv = V.neuro.cv || {};
    if (_cv.status === "Defective") {
      if (_cv.nature !== "Known congenital") addToken("color_vision_loss");
    } else if (!_cv.status) {
      if (colorVisionTextDefective(V.neuro.color_od) ||
          colorVisionTextDefective(V.neuro.color_os)) {
        addToken("color_vision_loss");
      }
    }
    if (V.neuro.cvf_od && V.neuro.cvf_od.toLowerCase().indexOf("defect") >= 0) {
      addToken("field_defect");
    }
    if (V.neuro.cvf_os && V.neuro.cvf_os.toLowerCase().indexOf("defect") >= 0) {
      addToken("field_defect");
    }
    if (V.neuro.amsler === "Distortion") addToken("distortion");
    if (V.neuro.amsler === "Scotoma") addToken("central_scotoma");
  }

  /* ── SOURCE 11: Optional modules ─────────────────────────────────
     Modules are mostly documentation, but a few of their fields ARE
     clinical findings and must reach the engine like any other — most
     importantly a white red reflex, which is the paediatric red flag.
     Only unambiguous, structured selections are wired; free text is not. */
  if (V.paed) {
    if (V.paed.red_reflex_od === "White (leukocoria)" ||
        V.paed.red_reflex_os === "White (leukocoria)") {
      addToken("leukocoria");
    }
    if (V.paed.squint_present === "Yes") addToken("manifest_squint");
    if (V.paed.amblyopia_suspected === "Present") addToken("reduced_vision");
  }
  if (V.cl && V.cl.comfort === "Poor") addToken("contact_lens_intolerance");

  /* Investigation fields */
  if (V.inv) {
    /* OCT RNFL */
    var rnflOd = parseFloat(V.inv.oct_rnfl_od) || 0;
    var rnflOs = parseFloat(V.inv.oct_rnfl_os) || 0;
    var _rnflT = clinThreshold("rnfl_thin", 80);
    if ((rnflOd > 0 && rnflOd < _rnflT) || (rnflOs > 0 && rnflOs < _rnflT)) {
      addToken("RNFL_thinning");
      addToken("field_defect");
    }

    /* Visual field MD */
    var mdOd = parseFloat(V.inv.vf_md_od) || 0;
    var mdOs = parseFloat(V.inv.vf_md_os) || 0;
    var _mdDef = clinThreshold("vf_md_defect", -3);
    var _mdSig = clinThreshold("vf_md_significant", -6);
    if (mdOd < _mdDef || mdOs < _mdDef) addToken("field_defect");
    if (mdOd < _mdSig || mdOs < _mdSig) addToken("visual_field_defect");
  }

  /* ── SOURCE 10: Systemic medication effects ──
     getMedicationTokens (medication-checker.js) maps the patient's drug
     list to risk tokens (steroid_history, raised_iop_risk, dryness, ...).
     It existed but was never invoked, so conditions requiring these
     tokens (e.g. Steroid-Induced Cataract) could never fire. Guarded so
     the engine still runs if the feature module isn't loaded. */
  if (typeof getMedicationTokens === "function") {
    addTokens(getMedicationTokens());
  }

  return tokens;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 2: PARSE FREE-TEXT COMPLAINT                              */
/* Regex-based token extraction from natural language               */
/* ═══════════════════════════════════════════════════════════════ */

/* Remove negated phrases before token extraction, so "denies pain" or
   "no flashes" do not emit pain/flashes tokens.
   Strategy: split into clauses at punctuation and contrast conjunctions;
   inside each clause, drop everything from a negation marker to the end
   of the clause. Deliberately conservative — only the negated clause tail
   is dropped, so "no flashes, floaters since Monday" still emits floaters
   (over-alerting is safer than under-alerting for red flags). */
function stripNegatedPhrases(text) {
  var clauses = String(text).split(/[,;.!?]|\bbut\b|\bexcept\b|\bhowever\b/i);
  var NEG = /\b(no|not|denies|denied|denying|deny|without|never|nil)\b/i;
  var kept = [];
  for (var i = 0; i < clauses.length; i++) {
    var clause = clauses[i];
    var m = clause.match(NEG);
    if (m) {
      /* keep any text before the negation marker, drop the rest */
      kept.push(clause.slice(0, m.index));
    } else {
      kept.push(clause);
    }
  }
  return kept.join(", ");
}

function parseComplaintText(text) {
  var t = [];

  /* Negation handling: strip "no X" / "denies X" phrases up front */
  text = stripNegatedPhrases(text);

  /* Vision */
  if (/blur|blurr|fuzzy|hazy/i.test(text))          t.push("blur");
  if (/distance|far away|board|driving/i.test(text)) t.push("distance_blur");
  if (/near|reading|close|phone|book/i.test(text))   t.push("near_blur");
  if (/double|two of/i.test(text))                    t.push("diplopia");
  if (/strain|fatigue|tired eye/i.test(text))         t.push("asthenopia");
  if (/fluctuat|comes and goes|variable/i.test(text)) t.push("fluctuating_blur");

  /* Pain */
  /* (?!less) keeps "painless" from emitting pain */
  if (/pain(?!less)|sore|ache|hurt/i.test(text))     t.push("pain");
  if (/burn|sting/i.test(text))                       t.push("burning");
  if (/dry|dried/i.test(text))                        t.push("dryness");
  if (/itch/i.test(text))                             t.push("itching_dominant");
  /* \bred\b avoids matching "reduced" */
  if (/\bred\b|redness|red eye|bloodshot|pink/i.test(text)) t.push("redness");
  if (/grit|sand|scratch/i.test(text))                t.push("grittiness");
  if (/foreign body|something in/i.test(text))        t.push("foreign_body_sensation");

  /* Light */
  if (/light sensitiv|photophob|bright light/i.test(text)) t.push("photophobia");

  /* Retinal */
  if (/flash/i.test(text))                            t.push("flashes");
  if (/floater|spots|cobweb|thread/i.test(text))     t.push("floaters");
  if (/shadow|curtain|veil/i.test(text))              t.push("field_loss");
  if (/missing.*vision|part.*gone/i.test(text))       t.push("field_loss");

  /* Neuro */
  if (/colo[u]?r.*change|faded|dull colo/i.test(text)) t.push("color_vision_loss");
  if (/pain.*mov|hurt.*look|move.*pain/i.test(text))    t.push("pain_eye_movement");

  /* Distortion */
  if (/distort|wavy|bent line|metamorphop/i.test(text)) t.push("distortion");
  if (/ghost|shadow image/i.test(text))                  t.push("ghosting");

  /* Temporal */
  if (/sudden/i.test(text))                           t.push("sudden_onset");
  if (/gradual|slowly/i.test(text))                   t.push("gradual_onset");
  if (/morning/i.test(text))                          t.push("morning_blur");
  if (/evening|end of day|night/i.test(text))         t.push("worse_evening");
  if (/worse.*screen|computer|laptop|phone/i.test(text)) t.push("screen_use_exacerbation");

  /* Additional */
  if (/glare|dazzle/i.test(text))                     t.push("glare");
  if (/halo|ring.*light/i.test(text))                 t.push("halos");
  if (/headache|head.*pain/i.test(text))              t.push("headache");
  if (/water|tear|lacrim/i.test(text))                t.push("watering");
  if (/discharg|matter|pus|gunk/i.test(text))         t.push("purulent_discharge");
  if (/crust|stuck.*morning|glued/i.test(text))       t.push("lid_crusting");
  if (/droop|ptosis/i.test(text))                     t.push("ptosis");
  if (/night.*vision|dark.*see|night blind/i.test(text)) t.push("night_blindness");

  return t;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 3: NORMALIZE TOKENS                                       */
/* Remove duplicates                                               */
/* ═══════════════════════════════════════════════════════════════ */

function normalizeTokens(tokens) {
  var seen = {};
  var result = [];
  for (var i = 0; i < tokens.length; i++) {
    if (!seen[tokens[i]]) {
      seen[tokens[i]] = true;
      result.push(tokens[i]);
    }
  }
  return result;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 4: APPLY TEMPORAL WEIGHT                                  */
/* Injects bias tokens based on temporal patterns                  */
/* ═══════════════════════════════════════════════════════════════ */

function applyTemporalWeight(tokens) {
  var t = tokens.slice(); /* don't mutate original */

  if (t.indexOf("sudden_onset") >= 0 || t.indexOf("acute") >= 0) {
    if (t.indexOf("acute_bias") === -1) t.push("acute_bias");
  }

  if (t.indexOf("gradual_onset") >= 0 || t.indexOf("chronic") >= 0) {
    if (t.indexOf("chronic_bias") === -1) t.push("chronic_bias");
  }

  if (t.indexOf("progressive") >= 0) {
    if (t.indexOf("chronic_bias") === -1) t.push("chronic_bias");
  }

  return t;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 5: DECISION TREE GATING                                   */
/* Hard-coded clinical rules that override normal routing           */
/* These represent "if you see X+Y, IMMEDIATELY consider Z"        */
/* ═══════════════════════════════════════════════════════════════ */

function applyDecisionTree(tokens) {
  var gates = [];

  /* Flashes + Floaters = retinal emergency pathway */
  if (tokens.indexOf("flashes") >= 0 && tokens.indexOf("floaters") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Flashes + floaters → retinal tear / detachment",
      conditions: ["Retinal Tear", "Retinal Detachment", "PVD"]
    });
  }

  /* Field loss = urgent */
  if (tokens.indexOf("field_loss") >= 0 || tokens.indexOf("curtain_vision") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Field loss → possible retinal detachment",
      conditions: ["Retinal Detachment"]
    });
  }

  /* Pain + Photophobia = anterior inflammation */
  if (tokens.indexOf("pain") >= 0 && tokens.indexOf("photophobia") >= 0) {
    gates.push({
      route: "anterior",
      reason: "Pain + photophobia → anterior segment inflammation",
      conditions: ["Anterior Uveitis (Acute)", "Keratitis", "Corneal Abrasion"]
    });
  }

  /* Sudden total vision loss = vascular emergency */
  if (tokens.indexOf("sudden_vision_loss") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Sudden vision loss → vascular emergency",
      conditions: ["Central Retinal Artery Occlusion (CRAO)", "Ischemic Optic Neuropathy (AION)"]
    });
  }

  /* Severe pain + halos + nausea = acute angle closure */
  if (tokens.indexOf("pain_severe") >= 0 && tokens.indexOf("halos") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Severe pain + halos → acute angle closure",
      conditions: ["Acute Angle Closure Crisis"]
    });
  }

  /* Bilateral disc swelling = papilledema (urgent) */
  if (tokens.indexOf("bilateral_disc_swelling") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Bilateral disc edema → papilledema / raised ICP",
      conditions: ["Papilledema"]
    });
  }

  /* Ptosis + diplopia = CN3 palsy (urgent) */
  if (tokens.indexOf("ptosis") >= 0 && tokens.indexOf("diplopia") >= 0) {
    gates.push({
      route: "urgent",
      reason: "Ptosis + diplopia → third nerve palsy",
      conditions: ["Third Cranial Nerve Palsy"]
    });
  }

  return gates;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 6: ROUTE SELECTION                                        */
/* Determines which clinical pathways to evaluate                  */
/* ═══════════════════════════════════════════════════════════════ */

function selectRoutes(tokens) {
  var routes = [];

  function addRoute(r) {
    if (routes.indexOf(r) === -1) routes.push(r);
  }

  /* Urgent */
  if (tokens.indexOf("flashes") >= 0 || tokens.indexOf("field_loss") >= 0 ||
      tokens.indexOf("sudden_vision_loss") >= 0 || tokens.indexOf("curtain_vision") >= 0) {
    addRoute("urgent");
  }

  /* Urgent — data-driven: if the hallmark (required) token of ANY
     urgent-route condition is present, the urgent route must activate.
     Without this, conditions like Hypopyon Uveitis (req: hypopyon_visible),
     Neovascular Glaucoma (req: rubeosis_iridis) or Wet AMD (req: distortion)
     could carry their defining evidence yet never be scored, because the
     hard-coded trigger list above only covered four retinal symptoms.
     Self-maintains as the KB grows. */
  if (routes.indexOf("urgent") === -1 && typeof KNOWLEDGE_ALL !== "undefined") {
    for (var uci = 0; uci < KNOWLEDGE_ALL.length; uci++) {
      var ucond = KNOWLEDGE_ALL[uci];
      if (ucond.route !== "urgent") continue;
      for (var uti = 0; uti < ucond.req.length; uti++) {
        if (tokens.indexOf(ucond.req[uti]) >= 0) { addRoute("urgent"); break; }
      }
      if (routes.indexOf("urgent") >= 0) break;
    }
  }

  /* Neuro */
  if (tokens.indexOf("pain_eye_movement") >= 0 || tokens.indexOf("color_vision_loss") >= 0 ||
      tokens.indexOf("ptosis") >= 0 || tokens.indexOf("horizontal_diplopia") >= 0 ||
      tokens.indexOf("vertical_diplopia") >= 0 || tokens.indexOf("field_loss_half") >= 0 ||
      tokens.indexOf("temporal_field_loss") >= 0 || tokens.indexOf("adduction_deficit") >= 0 ||
      tokens.indexOf("RAPD_positive") >= 0) {
    addRoute("neuro");
  }

  /* Retina */
  if (tokens.indexOf("distortion") >= 0 || tokens.indexOf("central_blur") >= 0 ||
      tokens.indexOf("floaters") >= 0 || tokens.indexOf("night_blindness") >= 0) {
    addRoute("retina");
  }

  /* Anterior */
  if (tokens.indexOf("pain") >= 0 && tokens.indexOf("photophobia") >= 0) {
    addRoute("anterior");
  }
  /* Hypopyon is definitionally anterior-segment disease; without this the
     token fires the safety alert but no condition is ever scored. */
  if (tokens.indexOf("hypopyon_visible") >= 0) {
    addRoute("anterior");
  }

  /* Surface */
  if (tokens.indexOf("dryness") >= 0 || tokens.indexOf("itching_dominant") >= 0 ||
      tokens.indexOf("burning") >= 0 || tokens.indexOf("lid_crusting") >= 0 ||
      tokens.indexOf("purulent_discharge") >= 0 || tokens.indexOf("watery_discharge") >= 0 ||
      tokens.indexOf("foreign_body_sensation") >= 0 || tokens.indexOf("grittiness") >= 0) {
    addRoute("surface");
  }

  /* Binocular */
  if (tokens.indexOf("diplopia") >= 0 || tokens.indexOf("near_strain") >= 0 ||
      tokens.indexOf("NPC_receded") >= 0 || tokens.indexOf("exo_near") >= 0 ||
      tokens.indexOf("eso_near") >= 0 || tokens.indexOf("eye_strain") >= 0 ||
      tokens.indexOf("difficulty_focus_change") >= 0 || tokens.indexOf("intermittent_eye_out") >= 0 ||
      tokens.indexOf("eye_inward") >= 0) {
    addRoute("binocular");
  }

  /* Refractive */
  if (tokens.indexOf("blur") >= 0 || tokens.indexOf("distance_blur") >= 0 ||
      tokens.indexOf("near_blur") >= 0 || tokens.indexOf("variable_blur") >= 0 ||
      tokens.indexOf("squinting") >= 0) {
    addRoute("refractive");
  }

  /* Glaucoma */
  if (tokens.indexOf("high_iop") >= 0 || tokens.indexOf("field_defect") >= 0 ||
      tokens.indexOf("increased_cd") >= 0 || tokens.indexOf("nrr_thinning") >= 0 ||
      tokens.indexOf("shallow_ac") >= 0 || tokens.indexOf("halos") >= 0 ||
      tokens.indexOf("rubeosis_iridis") >= 0) {
    addRoute("glaucoma");
  }

  /* Lens */
  if (tokens.indexOf("gradual_blur") >= 0 || tokens.indexOf("glare") >= 0 ||
      tokens.indexOf("myopic_shift") >= 0 || tokens.indexOf("post_cataract_surgery_blur") >= 0 ||
      tokens.indexOf("lens_displacement") >= 0 || tokens.indexOf("leukocoria") >= 0) {
    addRoute("lens");
  }

  /* Data-driven route activation (general).
     The symptom triggers above are a fast path, but they only cover a
     subset of presenting tokens — many conditions' hallmark (required)
     evidence is a sign/measurement not in those lists, so their route
     never turned on and they could never be scored (audit: 50/130
     conditions were self-unreachable). Here: if ALL of a condition's
     required tokens are present, its route must be active so it can be
     scored. Self-maintains as the KB grows; scoring still gates ranking.

     Scaling: rather than scanning the whole KB every run, use
     KB_REQ_FIRST_INDEX to consider only conditions whose FIRST required
     token is actually present (a tiny candidate set), then confirm the rest.
     Falls back to a full scan if the index is unavailable. */
  var routeTokSet = new Set(tokens);
  if (typeof KB_REQ_FIRST_INDEX !== "undefined") {
    for (var pti = 0; pti < tokens.length; pti++) {
      var candidates = KB_REQ_FIRST_INDEX[tokens[pti]];
      if (!candidates) continue;
      for (var pci = 0; pci < candidates.length; pci++) {
        var cand = candidates[pci];
        if (routes.indexOf(cand.route) >= 0) continue;
        var allReq = true;
        for (var pri = 0; pri < cand.req.length; pri++) {
          if (!routeTokSet.has(cand.req[pri])) { allReq = false; break; }
        }
        if (allReq) addRoute(cand.route);
      }
    }
  } else if (typeof KNOWLEDGE_ALL !== "undefined") {
    for (var ci = 0; ci < KNOWLEDGE_ALL.length; ci++) {
      var cond = KNOWLEDGE_ALL[ci];
      if (routes.indexOf(cond.route) >= 0) continue;
      if (!cond.req || cond.req.length === 0) continue;
      var allReqPresent = true;
      for (var ri = 0; ri < cond.req.length; ri++) {
        if (tokens.indexOf(cond.req[ri]) === -1) { allReqPresent = false; break; }
      }
      if (allReqPresent) addRoute(cond.route);
    }
  }

  /* Default */
  if (routes.length === 0) {
    addRoute("general");
  }

  return routes;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 7: PROBABILISTIC SCORING                                  */
/* Scores each condition against the current token set             */
/* ═══════════════════════════════════════════════════════════════ */

/* ── Scoring constants ──
   These are STRUCTURAL engineering constants (how evidence classes are
   mixed), not clinical statistics — no sensitivity/LR values are claimed.
   Shares say how much each evidence class can contribute to the score;
   saturation (n/(n+k)) gives diminishing returns on matched counts so a
   condition's score depends on how much evidence MATCHED, never on how
   many tokens its definition happens to list (the old normalize-by-own-
   maximum method let leaner definitions outscore richer ones on identical
   evidence). Calibration against real outcome data is future work. */
var SCORE_WEIGHTS = {
  req_share:  0.60,   /* fraction of required criteria matched (dominant) */
  sup_share:  0.25,   /* saturating credit for matched supportive tokens */
  test_share: 0.15,   /* saturating credit for matched objective tests */
  sup_k:  2,          /* sup saturation half-point: 2 matches → half credit */
  test_k: 1,          /* test saturation half-point: 1 match → half credit */
  /* conditions with no required tokens can never exceed ~0.70 on
     supportive/test evidence alone */
  noreq_sup_share: 0.45,
  noreq_test_share: 0.25,
  contra_factor: 0.55,     /* multiplied in once per matched contradiction */
  req_missing_factor: 0.45, /* multiplied in once per ABSENT required token */
  temporal_match: 1.08,
  temporal_mismatch: 0.85,
  sparse_evidence: 0.5     /* fewer than 2 tokens in the whole encounter */
};

/* ═══════════════════════════════════════════════════════════════ */
/* CONTEXT-ONLY TOKENS                                              */
/*                                                                  */
/* These describe WHO the patient is, or their background risk —    */
/* not what is wrong with the eye. They legitimately sharpen a       */
/* differential that real findings have already raised, but a        */
/* condition must NEVER enter the differential on them alone.        */
/* Typing an age, or ticking "diabetic", is not a clinical finding:  */
/* before this rule, entering age 6 and nothing else put             */
/* Retinoblastoma in the differential on `young_age` with its        */
/* required `leukocoria` still missing.                              */
/*                                                                  */
/* Temporal descriptors (acute/chronic/…) are deliberately absent —  */
/* they are handled separately and never count as evidence either.   */
/* ═══════════════════════════════════════════════════════════════ */
var CONTEXT_ONLY_TOKENS = {
  /* demographics */
  young_age: 1, older_age: 1, age_related: 1, age_over_40: 1,
  /* background / risk history */
  family_history: 1,
  diabetes_history: 1, hypertension_history: 1, autoimmune_history: 1,
  thyroid_history: 1, eczema_history: 1, ra_history: 1, sle_history: 1,
  ms_history: 1, migraine_history: 1,
  blepharitis_history: 1, contact_lens_history: 1, trauma_history: 1,
  steroid_history: 1, stress_history: 1,
  recent_viral_history: 1, history_trauma_or_infection: 1
};

function isContextOnlyToken(t) { return !!CONTEXT_ONLY_TOKENS[t]; }

function scoreCondition(condition, tokens, tokenSet) {

  /* O(1) membership when the caller passes a shared Set (the hot loop
     does); otherwise fall back to a linear scan of the token list. */
  var has = tokenSet
    ? function (t) { return tokenSet.has(t); }
    : function (t) { return tokens.indexOf(t) >= 0; };

  var reqMatched = 0;
  var reqMissing = 0;
  var supMatched = 0;
  var conMatched = 0;
  var testsMatched = 0;
  var tempMatch = false;
  /* Matches that are actual clinical findings (see CONTEXT_ONLY_TOKENS). */
  var substantiveMatched = 0;

  /* Required tokens */
  for (var ri = 0; ri < condition.req.length; ri++) {
    if (has(condition.req[ri])) {
      reqMatched++;
      if (!isContextOnlyToken(condition.req[ri])) substantiveMatched++;
    } else reqMissing++;
  }

  /* Supportive tokens */
  for (var si = 0; si < condition.sup.length; si++) {
    if (has(condition.sup[si])) {
      supMatched++;
      if (!isContextOnlyToken(condition.sup[si])) substantiveMatched++;
    }
  }

  /* Contradicting tokens */
  for (var ci = 0; ci < condition.con.length; ci++) {
    if (has(condition.con[ci])) conMatched++;
  }

  /* Objective test/sign tokens (condition.tests). When the tokenizer has
     emitted one (e.g. TBUT_reduced from a measured TBUT), it counts as
     confirmatory evidence — so the score sharpens as the exam proceeds
     from symptoms to objective findings. */
  var testList = condition.tests || [];
  for (var xi = 0; xi < testList.length; xi++) {
    if (has(testList[xi])) {
      testsMatched++;
      if (!isContextOnlyToken(testList[xi])) substantiveMatched++;
    }
  }

  /* Temporal matching (same detection as before, applied multiplicatively) */
  var tempMismatch = false;
  if (condition.temporal && condition.temporal.length > 0) {
    for (var ti = 0; ti < condition.temporal.length; ti++) {
      if (has(condition.temporal[ti])) { tempMatch = true; break; }
    }
    if (!tempMatch) {
      var hasAcute = has("acute") || has("acute_bias");
      var hasChronic = has("chronic") || has("chronic_bias");
      var condAcute = condition.temporal.indexOf("acute") >= 0;
      var condChronic = condition.temporal.indexOf("chronic") >= 0;
      if (hasAcute && condChronic && !condAcute) tempMismatch = true;
      if (hasChronic && condAcute && !condChronic) tempMismatch = true;
    }
  }

  /* ── Combine ──
     Required criteria dominate; supportive and objective-test evidence
     add saturating credit that depends only on how many MATCHED. */
  var base;
  var supSat = supMatched / (supMatched + SCORE_WEIGHTS.sup_k);
  var testSat = testsMatched / (testsMatched + SCORE_WEIGHTS.test_k);
  if (condition.req.length > 0) {
    base = SCORE_WEIGHTS.req_share * (reqMatched / condition.req.length) +
           SCORE_WEIGHTS.sup_share * supSat +
           SCORE_WEIGHTS.test_share * testSat;
  } else {
    base = SCORE_WEIGHTS.noreq_sup_share * supSat +
           SCORE_WEIGHTS.noreq_test_share * testSat;
  }

  /* Missing REQUIRED tokens penalize hard — "required" means required. A
     condition that lists two hallmarks but only has one present is a much
     weaker call than the linear req-fraction alone implies, and (if urgent)
     must not float to the top on a single shared token. Multiplicative per
     missing required token. Conditions whose full req set is present are
     untouched. */
  if (reqMissing > 0 && condition.req.length > 0) {
    base *= Math.pow(SCORE_WEIGHTS.req_missing_factor, reqMissing);
  }

  /* Contradictions: multiplicative, once per matched contradiction —
     two contradictions hurt much more than one. */
  if (conMatched > 0) base *= Math.pow(SCORE_WEIGHTS.contra_factor, conMatched);

  /* Temporal fit nudges the score; it never dominates. */
  if (tempMatch) base *= SCORE_WEIGHTS.temporal_match;
  else if (tempMismatch) base *= SCORE_WEIGHTS.temporal_mismatch;

  /* Very sparse encounters can't produce confident calls. */
  if (tokens.length < 2) base *= SCORE_WEIGHTS.sparse_evidence;

  /* All required tokens missing = zero (hard rule, unchanged) */
  if (reqMatched === 0 && condition.req.length > 0) base = 0;

  /* A condition needs at least one REAL clinical finding. Age, family history
     and background risk factors modify a differential — they never create
     one. Without this, entering only a patient's age surfaced conditions
     whose required findings were entirely absent. */
  if (substantiveMatched === 0) base = 0;

  base = Math.max(0, Math.min(1, base));

  return {
    score: base,
    reqMatched: reqMatched,
    reqMissing: reqMissing,
    substantiveMatched: substantiveMatched,
    supMatched: supMatched,
    conMatched: conMatched,
    testsMatched: testsMatched,
    tempMatch: tempMatch,
    /* kept for display compatibility: score is already normalized 0..1 */
    maxPossible: 1,
    rawScore: base
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 8: EXCLUSION RULES                                        */
/* Remove conditions that are clinically incompatible with the     */
/* current presentation                                            */
/* ═══════════════════════════════════════════════════════════════ */

function applyExclusions(results, tokens) {
  /* Build a set of high-scoring condition names */
  var highScorers = {};
  for (var i = 0; i < results.length; i++) {
    if (results[i].score >= scoreThreshold("exclusion_high_scorer", 0.5)) {
      highScorers[results[i].name] = true;
    }
  }

  /* Exclusion strings are snake_case (e.g. "acute_angle_closure") while
     condition names are display strings ("Acute Angle Closure Crisis").
     Normalize both sides to snake_case before comparing — raw substring
     comparison between the two formats never matches. */
  function normName(name) {
    return String(name).toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  /* Filter out excluded conditions */
  return results.filter(function(r) {
    /* SAFETY: urgent conditions are never suppressed by exclusion logic.
       A high-scoring chronic condition must not hide an emergency from
       the differential. Red flags stay visible; the clinician decides. */
    if (r.urgent) return true;

    var rNorm = normName(r.name);

    /* Check if any high-scoring condition excludes this one */
    for (var condName in highScorers) {
      if (condName === r.name) continue; /* a condition never excludes itself */
      if (typeof KB_EXCLUSION_MAP !== "undefined" && KB_EXCLUSION_MAP[condName]) {
        var exclusions = KB_EXCLUSION_MAP[condName];
        /* Normalized substring match: "acute_angle_closure" matches
           "acute_angle_closure_crisis" */
        for (var ei = 0; ei < exclusions.length; ei++) {
          if (rNorm.indexOf(normName(exclusions[ei])) >= 0) {
            r._excludedBy = condName;
            return false;
          }
        }
      }
    }
    return true;
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 9: GENERATE EVIDENCE                                      */
/* For each scored condition, produce a human-readable evidence     */
/* trail showing what matched, what's missing, and what to check   */
/* ═══════════════════════════════════════════════════════════════ */

function generateEvidence(condition, tokens, scoreResult, tokenSet) {
  var has = tokenSet
    ? function (t) { return tokenSet.has(t); }
    : function (t) { return tokens.indexOf(t) >= 0; };

  var matched = [];
  var missing = [];
  var contradicted = [];

  /* Required */
  for (var ri = 0; ri < condition.req.length; ri++) {
    if (has(condition.req[ri])) {
      matched.push(condition.req[ri]);
    } else {
      missing.push(condition.req[ri]);
    }
  }

  /* Supportive */
  for (var si = 0; si < condition.sup.length; si++) {
    if (has(condition.sup[si])) {
      matched.push(condition.sup[si]);
    }
  }

  /* Contradicting */
  for (var ci = 0; ci < condition.con.length; ci++) {
    if (has(condition.con[ci])) {
      contradicted.push(condition.con[ci]);
    }
  }

  /* Objective tests: a matched test token is confirmatory evidence (show
     it in `matched`); only tests NOT yet matched are suggested — so the
     "what to check next" list shrinks as the workup proceeds. */
  var suggestedTests = [];
  if (condition.tests) {
    for (var ti = 0; ti < condition.tests.length; ti++) {
      if (has(condition.tests[ti])) matched.push(condition.tests[ti]);
      else suggestedTests.push(condition.tests[ti]);
    }
  }

  return {
    matched: matched,
    missing: missing,
    contradicted: contradicted,
    suggestedTests: suggestedTests,
    confidence: interpretConfidence(scoreResult.score),
    temporal: scoreResult.tempMatch ? "matches" : "unknown"
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* CONFIDENCE INTERPRETATION                                       */
/* ═══════════════════════════════════════════════════════════════ */

function interpretConfidence(score) {
  if (score >= scoreThreshold("confidence_high", 0.80)) return "High";
  if (score >= scoreThreshold("confidence_moderate_high", 0.60)) return "Moderate-High";
  if (score >= scoreThreshold("confidence_moderate", 0.40)) return "Moderate";
  if (score >= scoreThreshold("confidence_low_moderate", 0.20)) return "Low-Moderate";
  return "Low";
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 10: COMPUTE ALERTS                                        */
/* Clinical safety alerts from exam data                           */
/* These are separate from the diagnostic engine — they fire       */
/* based on hard clinical rules regardless of diagnosis             */
/* ═══════════════════════════════════════════════════════════════ */

function computeAlerts(tokens) {
  var alerts = [];

  /* Symptom-based alerts */
  var s = new Set(V.symptoms || []);

  if (s.has("sudden_vision_loss") || tokens.indexOf("sudden_vision_loss") >= 0) {
    alerts.push({ m: "Sudden vision loss — URGENT referral required", l: "urgent" });
  }
  if (tokens.indexOf("flashes") >= 0 && tokens.indexOf("floaters") >= 0) {
    alerts.push({ m: "Flashes + floaters — rule out retinal tear / detachment", l: "urgent" });
  }
  if (s.has("curtain_vision") || tokens.indexOf("curtain_vision") >= 0) {
    alerts.push({ m: "Curtain / shadow in vision — possible retinal detachment", l: "urgent" });
  }
  if (tokens.indexOf("pain_eye_movement") >= 0) {
    alerts.push({ m: "Pain on eye movement — consider optic neuritis workup", l: "warn" });
  }
  if (tokens.indexOf("distortion") >= 0) {
    alerts.push({ m: "Metamorphopsia — OCT macula to rule out wet AMD / ERM", l: "warn" });
  }

  /* IOP alerts */
  if (V.iop) {
    var iopOd = parseFloat(V.iop.od) || 0;
    var iopOs = parseFloat(V.iop.os) || 0;
    /* Bands come from knowledge/clinical-thresholds.js — the SAME numbers the
       token derivation uses, so an alert can never disagree with a token. The
       message quotes the threshold rather than hardcoding it in prose. */
    var _aCrit = clinThreshold("iop_critical", 40);
    var _aUrg  = clinThreshold("iop_very_high", 30);
    var _aWarn = clinThreshold("iop_high", 21);
    if (iopOd > _aCrit || iopOs > _aCrit) {
      alerts.push({ m: "IOP critically elevated (>" + _aCrit + " mmHg) — acute angle closure?", l: "urgent" });
    } else if (iopOd > _aUrg || iopOs > _aUrg) {
      alerts.push({ m: "IOP significantly elevated (>" + _aUrg + " mmHg) — urgent assessment", l: "urgent" });
    } else if (iopOd > _aWarn || iopOs > _aWarn) {
      alerts.push({ m: "IOP elevated — glaucoma workup indicated", l: "warn" });
    }
  }

  /* RAPD */
  if (V.pupil && V.pupil.rapd !== "None") {
    alerts.push({ m: "RAPD detected (" + V.pupil.rapd + ") — neuro-ophthalmic assessment", l: "urgent" });
  }

  /* Van Herick */
  if (V.sl) {
    var vhOd = parseInt(V.sl.od.vh) || 99;
    var vhOs = parseInt(V.sl.os.vh) || 99;
    var _vhA = clinThreshold("van_herick_narrow", 2);
    if (vhOd <= _vhA) alerts.push({ m: "Van Herick ≤" + _vhA + " OD — gonioscopy before dilation", l: "warn" });
    if (vhOs <= _vhA) alerts.push({ m: "Van Herick ≤" + _vhA + " OS — gonioscopy before dilation", l: "warn" });
  }

  /* Diabetes + no fundus */
  if (V.hxM && V.hxM.dm && V.completed && V.completed.indexOf("fundus") === -1) {
    alerts.push({ m: "Diabetic patient — dilated fundus examination indicated", l: "warn" });
  }

  /* Bilateral disc edema */
  if (tokens.indexOf("bilateral_disc_swelling") >= 0) {
    alerts.push({ m: "Bilateral disc edema — URGENT: rule out raised ICP", l: "urgent" });
  }

  /* Hypopyon */
  if (tokens.indexOf("hypopyon_visible") >= 0) {
    alerts.push({ m: "Hypopyon present — URGENT referral", l: "urgent" });
  }

  /* Rubeosis */
  if (tokens.indexOf("rubeosis_iridis") >= 0) {
    alerts.push({ m: "Rubeosis iridis — URGENT: neovascular glaucoma risk", l: "urgent" });
  }

  /* Leukocoria — classic pediatric red flag (retinoblastoma / congenital
     cataract until proven otherwise). NEEDS_CLINICAL_REVIEW: alert wording
     added by engineering; founder to verify phrasing and referral urgency. */
  if (tokens.indexOf("leukocoria") >= 0) {
    alerts.push({ m: "Leukocoria — URGENT referral: rule out retinoblastoma / congenital cataract", l: "urgent" });
  }

  return alerts;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 10b: DERIVED ALERTS  (Phase 4 finding F-1)                */
/*                                                                  */
/* THE DEFECT THIS CLOSES                                          */
/* ──────────────────────                                          */
/* 63 conditions in the knowledge base carry `urgent: true`.       */
/* computeAlerts() above is 17 hand-written rules. Nothing         */
/* connected them, so — measured by feeding each urgent condition  */
/* its own required tokens — only 12 raised an alert and 51 did    */
/* not, including Chemical Eye Burn, Open Globe Injury, Retinal    */
/* Detachment and Microbial Keratitis.                             */
/*                                                                  */
/* The clinician was not blind: those conditions still appeared in */
/* the differential marked URGENT. What never appeared was the     */
/* Clinical Alerts banner — the top-of-panel notice designed to be */
/* un-missable. Two mechanisms that should agree, maintained       */
/* separately, drifting. The same shape as three other defects     */
/* already fixed in this codebase.                                 */
/*                                                                  */
/* WHY THIS IS ADDITIONAL, NOT A REPLACEMENT                       */
/* ────────────────────────────────────────                        */
/* The 17 hand-written rules fire on a SYMPTOM, before any         */
/* condition has been scored. That is earlier, and earlier is      */
/* better: "flashes + floaters" warns before the engine has        */
/* decided anything. They stay exactly as they are. This adds a    */
/* floor beneath them so that no urgent condition can reach the    */
/* differential with no banner at all.                             */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — THE THRESHOLD IS A CLINICAL CALL      */
/* ────────────────────────────────────────────────────────        */
/* DERIVED_ALERT_MIN decides how plausible an urgent condition     */
/* must be before it raises a banner. It trades two real harms     */
/* against each other:                                             */
/*                                                                  */
/*   too LOW  → a banner on every routine visit → alert fatigue    */
/*              → the one that matters gets dismissed with the     */
/*                rest (Phase 2, CS-06)                            */
/*   too HIGH → a genuinely urgent condition reaches the           */
/*              differential with no banner — the defect this      */
/*              exists to close                                    */
/*                                                                  */
/* The default below deliberately matches DX_FLOOR: if a condition */
/* is confident enough to SHOW, it is confident enough to WARN.    */
/* That is a defensible engineering default, not a clinical        */
/* finding. The founder should set it, and the two knobs are       */
/* separated so he can raise the alert bar without hiding          */
/* conditions from the differential.                               */
/* ═══════════════════════════════════════════════════════════════ */

/* Declared in knowledge/clinical-thresholds.js (SCORING_THRESHOLDS) so the
   founder can find and change it without reading the engine — Phase 4 F-4. */
var DERIVED_ALERT_MIN = scoreThreshold("derived_alert_min", 0.15);

/* Urgent conditions in the shown differential that no hand-written rule has
   already named. Returns alerts to APPEND — never to replace. */
function computeDerivedAlerts(shownResults, existingAlerts) {
  var out = [];
  if (!shownResults || !shownResults.length) return out;

  /* Don't say the same thing twice. A hand-written rule that already mentions
     the condition by name is more specific and better worded, so it wins. */
  var alreadySaid = (existingAlerts || []).map(function (a) {
    return String(a.m || "").toLowerCase();
  }).join(" | ");

  for (var i = 0; i < shownResults.length; i++) {
    var r = shownResults[i];
    if (!r.urgent) continue;
    if (r._overlay) continue;          /* user conditions alert via their own path */
    if (r.score < DERIVED_ALERT_MIN) continue;

    var nm = String(r.name || "");
    if (!nm) continue;
    if (alreadySaid.indexOf(nm.toLowerCase()) >= 0) continue;

    /* The match strength travels with the alert so the clinician can triage
       between "this is very likely" and "this is on the list". An alert that
       states its own strength is far less fatiguing than one that does not. */
    out.push({
      m: nm + " — urgent condition in the differential (match " +
         Math.round(r.score * 100) + "). Consider referral urgency.",
      l: "urgent",
      derived: true,
      condition: nm,
      score: r.score
    });
  }
  return out;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 11: COMPUTE NUDGES                                        */
/* Suggest next exam steps based on incomplete data and active     */
/* diagnostic pathways                                             */
/* ═══════════════════════════════════════════════════════════════ */

function computeNudges(results, tokens) {
  var nudges = [];
  var done = new Set(V.completed || []);
  var added = {};

  function addNudge(msg, target) {
    if (!added[target]) {
      nudges.push({ m: msg, t: target });
      added[target] = true;
    }
  }

  /* ── Age-appropriate DOCUMENTATION prompts ──────────────────────
     Demographics no longer produce a differential (see
     CONTEXT_ONLY_TOKENS). What an age SHOULD do is prompt the right
     paperwork: for a child, the birth / developmental history and the
     paediatric section that a paediatric assessment is incomplete
     without. These are documentation suggestions, never diagnoses. */
  var _age = parseInt((typeof P !== "undefined" && P) ? P.age : "", 10);
  if (!isNaN(_age)) {
    if (_age <= clinThreshold("age_paediatric_workup", 16)) {
      var paedOn = !!(V.modules && V.modules.paediatric);
      if (!paedOn) {
        addNudge("Paediatric patient — add the Paediatric section (birth history, fixation, squint, amblyopia)", "demographics");
      } else if (!done.has("paediatric")) {
        addNudge("Complete the paediatric assessment (birth history, fixation, red reflex)", "paediatric");
      }
      if (!done.has("bv")) addNudge("Assess binocular status (cover test, stereo)", "bv");
    }
    if (_age <= clinThreshold("age_cycloplegic_refraction", 8) && !done.has("refraction")) {
      addNudge("Consider cycloplegic refraction at this age", "refraction");
    }
  }

  /* Based on top conditions' required tests */
  for (var i = 0; i < Math.min(results.length, 4); i++) {
    var cond = findCondition(results[i].name);
    if (!cond) continue;

    var route = cond.route;

    /* Route-based nudges */
    if (route === "glaucoma" && !done.has("iop"))        addNudge("Measure IOP", "iop");
    if (route === "glaucoma" && !done.has("gonioscopy")) addNudge("Perform gonioscopy", "gonioscopy");
    if (route === "glaucoma" && !done.has("fundus"))      addNudge("Assess optic disc", "fundus");
    if (route === "retina" && !done.has("fundus"))        addNudge("Dilated fundus exam", "fundus");
    if (route === "binocular" && !done.has("bv"))         addNudge("BV assessment", "bv");
    if (route === "anterior" && !done.has("slit_lamp"))   addNudge("Slit lamp exam", "slit_lamp");
    if (route === "neuro" && !done.has("neuro"))          addNudge("Neuro-ophthalmic assessment", "neuro");
    if (route === "neuro" && !done.has("pupil"))          addNudge("Check pupils / RAPD", "pupil");
    if (route === "refractive" && !done.has("refraction")) addNudge("Complete refraction", "refraction");
    if (route === "lens" && !done.has("slit_lamp"))       addNudge("Lens assessment (slit lamp)", "slit_lamp");
    if (route === "surface" && !done.has("slit_lamp"))    addNudge("Slit lamp / tear film assessment", "slit_lamp");
  }

  /* Based on missing evidence from top conditions */
  for (var j = 0; j < Math.min(results.length, 3); j++) {
    var evidence = results[j]._evidence;
    if (!evidence) continue;

    for (var mi = 0; mi < evidence.missing.length; mi++) {
      var missingToken = evidence.missing[mi];
      /* Suggest relevant exam step for the missing token */
      if (missingToken.indexOf("NPC") >= 0 && !done.has("bv"))       addNudge("Perform NPC", "bv");
      if (missingToken.indexOf("phoria") >= 0 && !done.has("bv"))    addNudge("Cover test", "bv");
      if (missingToken.indexOf("amplitude") >= 0 && !done.has("bv")) addNudge("Check accommodation", "bv");
      if (missingToken.indexOf("field") >= 0 && !done.has("neuro"))  addNudge("Confrontation visual fields", "neuro");
    }
  }

  return nudges.slice(0, 6);
}


/* ═══════════════════════════════════════════════════════════════ */
/* NEXT-TEST RECOMMENDER — the diagnostic refinement loop           */
/*                                                                  */
/* Entopic does not hand back a single probabilistic "answer": it    */
/* ranks a differential and then tells the clinician what to CHECK    */
/* NEXT to narrow it. Given the current ranked list, this picks the   */
/* findings that would best DISCRIMINATE between the leading          */
/* candidates — confirm the leader, or rule out a close rival. As     */
/* each finding is entered the engine re-runs (nav() re-scores) and   */
/* the suggestions refine: a transparent, glass-box loop. The logic   */
/* is fully deterministic and inspectable — no probabilistic guessing */
/* and no LLM in the diagnostic path.                                 */
/* ═══════════════════════════════════════════════════════════════ */

/* Which exam step a given finding/measurement is entered on. */
var NEXT_TEST_ROUTE_STEP = {
  glaucoma: "iop", retina: "fundus", anterior: "slit_lamp", binocular: "bv",
  neuro: "neuro", refractive: "refraction", lens: "slit_lamp",
  surface: "slit_lamp", urgent: "slit_lamp"
};
var NEXT_TEST_TOKEN_STEP = {
  very_high_iop: "iop", high_iop: "iop", normal_iop: "iop", raised_iop_risk: "iop",
  angle_closure_risk: "gonioscopy", narrow_angle: "gonioscopy", shallow_ac: "gonioscopy",
  pigment_dispersion: "gonioscopy", pxf_material: "gonioscopy", transillumination_defects: "gonioscopy",
  RAPD_positive: "pupil", anisocoria: "pupil", pupil_involvement: "pupil", heterochromia: "pupil",
  macular_screening_needed: "investigations", RNFL_thinning: "investigations",
  cd_asymmetry: "fundus", increased_cd: "fundus", nrr_thinning: "fundus", disc_hemorrhage: "fundus"
};

/* Reverse the finding→token map once: token → human-readable finding name.
   A finding's own canonical token is its LAST entry — map ONLY that, so a
   generic shared token (e.g. sudden_onset, which several findings list as a
   secondary token) is never mislabeled as one specific finding. Tokens with
   no canonical finding fall back to a prettified name. */
var NEXT_TEST_LABELS = null;
function buildNextTestLabels() {
  if (NEXT_TEST_LABELS) return NEXT_TEST_LABELS;
  NEXT_TEST_LABELS = {};
  if (typeof FINDING_TOKEN_MAP === "undefined") return NEXT_TEST_LABELS;
  for (var name in FINDING_TOKEN_MAP) {
    var toks = FINDING_TOKEN_MAP[name];
    if (!toks.length) continue;
    var own = toks[toks.length - 1];
    if (!NEXT_TEST_LABELS[own]) NEXT_TEST_LABELS[own] = name;
  }
  return NEXT_TEST_LABELS;
}

function prettyToken(t) {
  return t.replace(/_/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

/* Onset / course tokens are captured at intake, not "checked next" — they add
   noise to a next-test list, so they never qualify as discriminators. */
var NEXT_TEST_SKIP = {
  sudden_onset: 1, gradual_onset: 1, acute: 1, chronic: 1, subacute: 1,
  acute_bias: 1, chronic_bias: 1, recurrent: 1, progressive: 1, variable: 1,
  intermittent: 1, subacute_onset: 1
};

/* A finding is only worth suggesting if the clinician can actually enter it —
   i.e. it is reachable (has a producing input source) in the token registry. */
function isEnterableToken(t) {
  if (NEXT_TEST_SKIP[t]) return false;
  if (typeof TOKEN_REGISTRY === "undefined") return true;
  var e = TOKEN_REGISTRY[t];
  return !!(e && e.reachable !== false);
}

/* Where to send the clinician to record this finding: an explicit override,
   else an exam finding → the related condition's route step, else a
   symptom/history token → chief complaint. */
function nextTestTarget(token, relCond) {
  if (NEXT_TEST_TOKEN_STEP[token]) return NEXT_TEST_TOKEN_STEP[token];
  var reg = (typeof TOKEN_REGISTRY !== "undefined") ? TOKEN_REGISTRY[token] : null;
  var src = (reg && reg.sources) ? reg.sources : [];
  if (src.indexOf("finding_map") >= 0) return (relCond && NEXT_TEST_ROUTE_STEP[relCond.route]) || "slit_lamp";
  if (src.indexOf("symptom_chip") >= 0 || src.indexOf("dictionary") >= 0) return "chief_complaint";
  return (relCond && NEXT_TEST_ROUTE_STEP[relCond.route]) || "slit_lamp";
}

function computeNextTests(results, tokens) {
  if (!results || results.length < 2) return [];
  var present = {};
  for (var pi = 0; pi < tokens.length; pi++) present[tokens[pi]] = true;

  /* Focus = the leader plus close rivals actually in contention. Only worth
     suggesting a discriminating finding when ≥2 candidates compete. */
  var leader = results[0];
  if (!leader || leader.score <= 0) return [];
  var focus = [];
  for (var i = 0; i < results.length && focus.length < 5; i++) {
    var r = results[i];
    if (r.score <= 0) continue;
    if (i === 0 || r.score >= leader.score - 0.30) focus.push(r);
  }
  if (focus.length < 2) return [];

  /* Candidate discriminators = the focus conditions' objective tests +
     supportive + contradicting features, not already present and enterable.
     Track, per token, which focus conditions it would CONFIRM vs argue
     AGAINST (by focus index). */
  var cand = {};
  for (var f = 0; f < focus.length; f++) {
    var c = findCondition(focus[f].name);
    if (!c) continue;
    var lists = [
      { arr: c.tests || [], kind: "confirm", isTest: true },
      { arr: c.sup || [], kind: "confirm", isTest: false },
      { arr: c.con || [], kind: "exclude", isTest: false }
    ];
    for (var li = 0; li < lists.length; li++) {
      var arr = lists[li].arr;
      for (var ai = 0; ai < arr.length; ai++) {
        var tok = arr[ai];
        if (present[tok] || !isEnterableToken(tok)) continue;
        if (!cand[tok]) cand[tok] = { confirm: [], exclude: [], isTest: false };
        if (lists[li].kind === "confirm") {
          if (cand[tok].confirm.indexOf(f) < 0) cand[tok].confirm.push(f);
          if (lists[li].isTest) cand[tok].isTest = true;
        } else {
          if (cand[tok].exclude.indexOf(f) < 0) cand[tok].exclude.push(f);
        }
      }
    }
  }

  /* Score by DISCRIMINATION power. A finding shared by every focus condition
     (and ruling none out) tells you nothing — skip it. A finding that lifts
     the leader above some rivals, or clears a competitor, is most useful. */
  var scored = [];
  for (var tok in cand) {
    var info = cand[tok];
    var affected = {};
    for (var x = 0; x < info.confirm.length; x++) affected[info.confirm[x]] = true;
    for (var y = 0; y < info.exclude.length; y++) affected[info.exclude[y]] = true;
    if (Object.keys(affected).length === 0) continue;
    if (info.confirm.length === focus.length && info.exclude.length === 0) continue;

    var value = info.confirm.length * 1.0 + info.exclude.length * 1.2;
    var confirmsLeader = info.confirm.indexOf(0) >= 0;
    var excludesLeader = info.exclude.indexOf(0) >= 0;
    if (confirmsLeader && info.confirm.length < focus.length) value += 1.5;
    if (info.exclude.length > 0 && !excludesLeader) value += 1.5; /* clears a rival */
    if (info.isTest) value += 0.4;                                /* objective > subjective */

    scored.push({ token: tok, value: value, info: info });
  }
  if (!scored.length) return [];
  scored.sort(function (a, b) {
    if (b.value !== a.value) return b.value - a.value;
    return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
  });

  var labels = buildNextTestLabels();
  var out = [];
  for (var s = 0; s < scored.length && out.length < 4; s++) {
    var it = scored[s], nfo = it.info;
    var confirmNames = [], excludeNames = [];
    for (var ci = 0; ci < nfo.confirm.length; ci++) confirmNames.push(focus[nfo.confirm[ci]].name);
    for (var ei = 0; ei < nfo.exclude.length; ei++) excludeNames.push(focus[nfo.exclude[ei]].name);
    var relIdx = nfo.confirm.length ? nfo.confirm[0] : nfo.exclude[0];
    var relCond = findCondition(focus[relIdx].name);
    var target = nextTestTarget(it.token, relCond);
    out.push({
      token: it.token,
      label: labels[it.token] || prettyToken(it.token),
      confirms: confirmNames,
      excludes: excludeNames,
      isTest: nfo.isTest,
      target: target
    });
  }
  return out;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PROBLEM FOCI — concurrent independent problems                  */
/*                                                                  */
/* Deterministic PRESENTATION layer over the already-scored          */
/* differential. Groups the single ranked list into independent      */
/* clinical problems by domain so that co-existing conditions        */
/* (e.g. dry eye + glaucoma-suspect + convergence insufficiency)     */
/* stop competing for one top slot. Scoring is unchanged — each      */
/* focus simply carries its own lead candidate, confidence, and      */
/* alternates. This is the inspectable, multi-problem view; it does  */
/* NOT alter V.dxList.                                               */
/* ═══════════════════════════════════════════════════════════════ */

function computeProblemFoci(dxList) {
  if (!dxList || dxList.length === 0) return [];

  /* Group by clinical domain (fallback to route). */
  var groups = {};
  var order = [];
  for (var i = 0; i < dxList.length; i++) {
    var d = dxList[i];
    var key = d.domain || d.cat || "Other";
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(d);
  }

  var foci = [];
  for (var k = 0; k < order.length; k++) {
    var name = order[k];
    var members = groups[name];

    /* members inherit dxList's global sort (score desc), but sort defensively */
    members.sort(function(a, b) { return b.prob - a.prob; });

    var lead = members[0];
    /* A focus is only surfaced if its lead carries real evidence. Mirrors
       "zero evidence = zero output": don't manufacture a problem from noise. */
    if (!lead || lead.prob < scoreThreshold("focus_lead_min", 0.15)) continue;

    foci.push({
      focus: name,
      lead: lead.n,
      icd: lead.icd || "",
      confidence: lead.prob,
      band: interpretConfidence(lead.prob),
      urgent: !!lead.urgent,
      candidates: members.slice(0, 4).map(function(m) {
        return { n: m.n, prob: m.prob, urgent: !!m.urgent };
      }),
      /* the single most useful next check for THIS problem, if any */
      needs: (lead.evidence && lead.evidence.missing && lead.evidence.missing.length > 0)
        ? lead.evidence.missing.slice(0, 2)
        : []
    });
  }

  /* Order foci: urgent first, then by lead confidence. */
  foci.sort(function(a, b) {
    if (a.urgent && !b.urgent) return -1;
    if (b.urgent && !a.urgent) return 1;
    return b.confidence - a.confidence;
  });

  return foci;
}


/* ═══════════════════════════════════════════════════════════════ */
/* STAGE 12: ENGINE LOG                                            */
/* Records each engine run for debugging and audit                 */
/* ═══════════════════════════════════════════════════════════════ */

var ENGINE_LOG = [];

function logEngineRun(data) {
  ENGINE_LOG.push({
    time: new Date().toISOString(),
    tokenCount: data.tokens.length,
    routeCount: data.routes.length,
    resultCount: data.results.length,
    topDx: data.results.length > 0 ? data.results[0].name : "none",
    topScore: data.results.length > 0 ? data.results[0].score : 0,
    alertCount: data.alerts.length
  });

  /* Keep only last 50 runs */
  if (ENGINE_LOG.length > 50) {
    ENGINE_LOG = ENGINE_LOG.slice(-50);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* MAIN ENTRY POINT: runDiagnosticEngine()                         */
/*                                                                  */
/* Called on EVERY data change. Runs the full pipeline.             */
/* Writes results to V.dxList, V.alerts, V.nudges                  */
/* ═══════════════════════════════════════════════════════════════ */

function runDiagnosticEngine() {

  /* Guard: check if visit data exists */
  if (!V || !V.symptoms) return;

  ENGINE_STATE.runCount++;

  /* ── STAGE 1: Collect all tokens ── */
  var tokens = collectTokens();

  /* ── Empty check ── */
  if (tokens.length === 0) {
    V.dxList = [];
    V.problemFoci = [];
    V.alerts = [];
    V.nudges = [];
    V.nextTests = [];
    ENGINE_STATE.tokens = [];
    ENGINE_STATE.results = [];
    return;
  }

  /* ── STAGE 3: Normalize ── */
  tokens = normalizeTokens(tokens);

  /* ── STAGE 4: Temporal weighting ── */
  tokens = applyTemporalWeight(tokens);

  /* Store tokens */
  ENGINE_STATE.tokens = tokens;

  /* ── STAGE 5: Decision tree gating ── */
  var gates = applyDecisionTree(tokens);

  /* ── STAGE 6: Route selection ── */
  var routes = selectRoutes(tokens);
  ENGINE_STATE.routes = routes;

  /* ── STAGE 7: Score all conditions ── */
  var results = [];

  /* If decision tree gates fired, prioritize gated conditions */
  var gatedNames = {};
  for (var gi = 0; gi < gates.length; gi++) {
    for (var gci = 0; gci < gates[gi].conditions.length; gci++) {
      gatedNames[gates[gi].conditions[gci]] = gates[gi].reason;
    }
  }

  /* Build the candidate set to score:
       - all conditions on the active routes (via KB_ROUTE_INDEX — O(active)
         instead of scanning the whole KB), plus
       - any gated conditions not already covered by an active route.
     A shared token Set makes each scoreCondition/generateEvidence O(tokens)
     instead of O(tokens × list). This is what keeps the engine responsive at
     thousands of conditions. Falls back to a full KB scan if the index is
     absent (behaviour-preserving). */
  var scoreTokenSet = new Set(tokens);

  function scoreOne(cond, isGated) {
    var scoreResult = scoreCondition(cond, tokens, scoreTokenSet);
    if (scoreResult.score <= 0 && !isGated) return;
    /* Gating confers VISIBILITY, not inflated confidence. A gated condition is
       force-surfaced for the clinician's consideration (its _gateReason lets it
       bypass the DX_FLOOR display filter, and if urgent it gets the bounded
       sort nudge) — but its probability must reflect the ACTUAL evidence match.
       The old 1.3× score boost distorted ranking (e.g. floated a partially-
       matched Anterior Uveitis above the better-matched keratitis on a
       pain+photophobia presentation) and overstated displayed confidence.
       Removing it keeps the differential honest; safety is unaffected because
       red-flag ALERTS are computed separately and are un-suppressible. */
    var evidence = generateEvidence(cond, tokens, scoreResult, scoreTokenSet);
    results.push({
      name: cond.name,
      score: scoreResult.score,
      icd: cond.icd || "",
      icd_label: cond.icd_label || "",
      icd_status: cond.icd_status || "",
      route: cond.route,
      domain: cond._domain || "",
      urgent: cond.urgent || false,
      _index: cond._index,
      _scoreDetail: scoreResult,
      _evidence: evidence,
      _gateReason: gatedNames[cond.name] || null
    });
  }

  if (typeof KB_REQ_TOKEN_INDEX !== "undefined") {
    var seen = {};
    var activeRoute = {};
    for (var ar = 0; ar < routes.length; ar++) activeRoute[routes[ar]] = true;

    /* Candidates = conditions that require at least one PRESENT token and
       sit on an active route. Because scoreCondition forces score 0 unless a
       required token matched, this yields exactly the same results as
       scanning every on-route condition — but touches only the handful of
       conditions the current evidence can actually support, so cost scales
       with the evidence, not the KB size. */
    for (var pt = 0; pt < tokens.length; pt++) {
      var reqConds = KB_REQ_TOKEN_INDEX[tokens[pt]];
      if (!reqConds) continue;
      for (var rq = 0; rq < reqConds.length; rq++) {
        var cc = reqConds[rq];
        if (seen[cc.name]) continue;
        if (!activeRoute[cc.route] && gatedNames[cc.name] === undefined) continue;
        seen[cc.name] = true;
        scoreOne(cc, gatedNames[cc.name] !== undefined);
      }
    }
    /* Conditions with no required token (rare) — consider on active routes. */
    if (typeof KB_NOREQ_CONDS !== "undefined") {
      for (var nq = 0; nq < KB_NOREQ_CONDS.length; nq++) {
        var nc = KB_NOREQ_CONDS[nq];
        if (seen[nc.name]) continue;
        if (!activeRoute[nc.route] && gatedNames[nc.name] === undefined) continue;
        seen[nc.name] = true;
        scoreOne(nc, gatedNames[nc.name] !== undefined);
      }
    }
    /* Gated conditions not otherwise covered (e.g. urgent gates). */
    for (var gname in gatedNames) {
      if (seen[gname]) continue;
      var gc = findCondition(gname);
      if (gc) { seen[gname] = true; scoreOne(gc, true); }
    }
  } else if (typeof KNOWLEDGE_ALL !== "undefined") {
    for (var ki = 0; ki < KNOWLEDGE_ALL.length; ki++) {
      var cond = KNOWLEDGE_ALL[ki];
      var onRoute = routes.indexOf(cond.route) >= 0;
      var isGated = gatedNames[cond.name] !== undefined;
      if (!onRoute && !isGated) continue;
      scoreOne(cond, isGated);
    }
  }

  /* ── STAGE 8: Apply exclusions ── */
  results = applyExclusions(results, tokens);

  /* ── Sort by score descending, with a BOUNDED urgent nudge ──
     Urgent conditions get a small sort-only bonus so that, when two
     candidates are genuinely close, the safety-relevant one is shown
     first. It must NOT let a barely-scoring urgent condition bury a
     confident non-urgent diagnosis (that produced junk differentials —
     a 0.21 urgent floating above a 0.79 real match). So the nudge is a
     small additive bonus (not absolute priority), only applies once the
     urgent condition has cleared a minimum plausibility, and is capped
     well below the gap that separates a strong match from a weak one.
     Patient safety does not rely on this ordering: urgent RED-FLAG
     ALERTS are computed separately and are un-suppressible regardless of
     where a condition lands in the differential list. */
  var URGENT_SORT_BONUS = 0.08;
  var URGENT_SORT_MIN = 0.15;
  function sortKey(x) {
    return x.score + (x.urgent && x.score >= URGENT_SORT_MIN ? URGENT_SORT_BONUS : 0);
  }
  results.sort(function(a, b) {
    var ka = sortKey(a), kb = sortKey(b);
    if (kb !== ka) return kb - ka;
    /* Deterministic tie-break by KB index — makes the differential order
       independent of how conditions were iterated/indexed. */
    return (a._index || 0) - (b._index || 0);
  });

  /* ── STAGE 8b: OVERLAY PASS (clinician-authored conditions) ──
     A SEPARATE scoring pass, deliberately. Overlay conditions are never
     ranked against core conditions, so a clinician's own condition cannot
     mathematically outrank a red flag — the two are never compared.

     Appending them to `results` above and re-sorting would have been three
     lines and would have reintroduced exactly the hazard the overlay design
     exists to remove: a personal "evening dryness" pattern requiring
     flashes+floaters out-scoring Retinal Detachment and pushing it below the
     fold. See docs/DESIGN_PERSONALISED_CONDITIONS.md §3.2. */
  var overlayResults = [];
  if (typeof overlayConditions === "function") {
    var overlays = overlayConditions();
    for (var ov = 0; ov < overlays.length; ov++) {
      var oc = overlays[ov];
      var os = scoreCondition(oc, tokens, scoreTokenSet);
      if (!os || !os.score) continue;
      var orec = {
        name: oc.name, icd: oc.icd, icd_label: "", icd_status: "",
        domain: oc.domain, route: oc.route, urgent: !!oc.urgent,
        score: os.score, _index: oc._index, _overlay: oc._overlay,
        review_status: oc.review_status
      };
      orec._evidence = generateEvidence(oc, tokens, os, scoreTokenSet);
      overlayResults.push(orec);
    }
    overlayResults.sort(function (a, b) { return b.score - a.score; });
  }

  /* Store results */
  ENGINE_STATE.results = results;
  ENGINE_STATE.overlayResults = overlayResults;

  /* ── Build the shown differential ──
     Filter out marginal partial matches before taking the top 8. A condition
     that only partially matched its REQUIRED tokens scores low-but-nonzero;
     as the KB grows, many such "has one shared symptom" entries would
     otherwise crowd out the real candidates (and bury safety-gated ones).
     Keep anything that (a) clears a small confidence floor, or (b) was
     surfaced by the decision-tree safety gate (e.g. Retinal Detachment on
     flashes+floaters) — those must always be shown regardless of score. */
  var DX_FLOOR = 0.15;
  var shownResults = results.filter(function (r) {
    return r.score >= DX_FLOOR || r._gateReason;
  });
  /* never return empty-handed when there WAS signal: if the floor removed
     everything, fall back to the single best-scoring result. */
  if (shownResults.length === 0 && results.length > 0 && results[0].score > 0) {
    shownResults = [results[0]];
  }

  /* ── MERGE: core first, always, then overlays beneath ──
     Core keeps its own ordering (urgent-nudged, then by score). Overlay
     conditions are APPENDED, never interleaved. So the worst an overlay can
     do is occupy space below the core differential; it can never displace a
     core condition, urgent or otherwise. */
  var mergedShown = shownResults.slice(0, 8);
  if (overlayResults.length) {
    var OVERLAY_FLOOR = scoreThreshold("overlay_floor", 0.15);
    var shownOverlay = overlayResults.filter(function (r) { return r.score >= OVERLAY_FLOOR; });
    mergedShown = mergedShown.concat(shownOverlay.slice(0, 4));
  }

  /* ── Convert to V.dxList format ── */
  V.dxList = mergedShown.map(function(r) {
    var ev = r._evidence || { matched: [], missing: [], contradicted: [], suggestedTests: [] };
    var conf = interpretConfidence(r.score);

    /* Build reasoning string */
    var reasoning = conf;
    if (ev.matched.length > 0) {
      reasoning += " — Matched: " + ev.matched.join(", ");
    }
    if (ev.missing.length > 0) {
      reasoning += " | Missing: " + ev.missing.join(", ");
    }
    if (ev.contradicted.length > 0) {
      reasoning += " | Against: " + ev.contradicted.join(", ");
    }
    if (r._gateReason) {
      reasoning += " | GATED: " + r._gateReason;
    }

    return {
      n: r.name,
      icd: r.icd,
      icd_label: r.icd_label,
      icd_status: r.icd_status,
      prob: r.score,
      cat: r.route,
      domain: r.domain,
      urgent: r.urgent,
      reasoning: reasoning,
      evidence: ev,
      /* WHY this condition was force-surfaced, as its own field rather than
         buried in the reasoning string (Phase 4 F-5). This is the single most
         explanatory thing the engine produces: it is the difference between
         "the engine listed retinal detachment" and "the engine listed retinal
         detachment BECAUSE you recorded flashes and floaters". */
      gatedBecause: r._gateReason || null,
      /* Present ONLY on clinician-authored conditions. Every consumer uses
         this to render them distinctly — they are never reviewed content. */
      overlay: r._overlay || null
    };
  });

  /* The tokens this differential was actually built from.

     Stored on the visit, not just in ENGINE_STATE, because ENGINE_STATE is
     memory and dies with the tab. Without this, anything asking "what would
     this rule have done at that visit?" — the impact preview, a future
     regression harness, a deterministic replay against an older KB — has to
     RE-DERIVE the tokens using today's rules, which answers a different
     question and drifts as the knowledge base changes.

     Cost: a few hundred short strings per visit. */
  V.engine_tokens = tokens.slice();

  /* Which knowledge produced this differential. Once knowledge varies per
     user, "the engine said X" is meaningless without it. */
  if (typeof overlayProvenance === "function") {
    try { V.kb_provenance = overlayProvenance(); } catch (e) {}
  }

  /* ── Problem foci (concurrent independent problems) ──
     Core results only: a working-problem grouping built partly from
     unreviewed personal conditions would present them as established. */
  V.problemFoci = computeProblemFoci(V.dxList.filter(function (d) { return !d.overlay; }));

  /* ── STAGE 10: Alerts ──
     CORE alerts are computed first and independently of everything above, so
     nothing an overlay does can alter, reorder or suppress them. */
  V.alerts = computeAlerts(tokens);

  /* Derived alerts (F-1): any urgent CORE condition that reached the shown
     differential and which no hand-written rule already named. Appended, so
     the 17 specific rules keep their place at the top. */
  var _derived = computeDerivedAlerts(mergedShown, V.alerts);
  for (var dv = 0; dv < _derived.length; dv++) V.alerts.push(_derived[dv]);

  /* User-authored urgent conditions ADD an alert; they never replace one.
     The founder decided (2026-08-02) that clinicians may mark their own
     conditions urgent. Appending after the core alerts — rather than merging
     into them — is what keeps that decision safe: a mistaken personal urgent
     costs an extra line on screen, never a missing red flag. Attribution is
     mandatory so it can never read as reviewed content. */
  for (var oa = 0; oa < overlayResults.length; oa++) {
    var oal = overlayResults[oa];
    if (!oal.urgent || oal.score < 0.15) continue;
    var who = (oal._overlay && oal._overlay.author_name) || "you";
    var why = (oal._overlay && oal._overlay.urgent_reason) || "";
    V.alerts.push({
      m: "YOUR ALERT — " + oal.name + (why ? ": " + why : "") +
         " (added by " + who + ", not clinically reviewed)",
      l: "urgent",
      overlay: oal._overlay || null
    });
  }

  /* ── STAGE 11: Nudges ── */
  V.nudges = computeNudges(results, tokens);

  /* ── STAGE 12: Next-test recommender (diagnostic refinement loop) ──
     Uses the SHOWN differential so suggestions track exactly what the
     clinician sees; recomputed every time the engine re-runs (nav()), which
     is what makes it a live narrowing loop. */
  V.nextTests = computeNextTests(results, tokens);

  /* ── STAGE 12: Log ── */
  logEngineRun({
    tokens: tokens,
    routes: routes,
    results: results,
    alerts: V.alerts
  });

  /* Store in visit for persistence */
  V.engineLog = ENGINE_LOG.slice(-10);

  /* ── STAGE 13: PROVENANCE (clinical review CL-1) ──
     Record WHICH knowledge base produced this differential, on the visit
     itself. Without it, a record reviewed months later shows a list of
     conditions with no way to know what the engine actually saw at the time —
     and because the KB is designed to be updated and re-published, today's
     engine may rank the same findings differently. That gap defeats both
     "glass box" defensibility and any retrospective audit of a decision.

     Deliberately data-only: this changes no scoring, no ranking, no alert. It
     records what already happened. */
  V.engine_provenance = {
    kb_version: (typeof KB_META !== "undefined" && KB_META.version) ? KB_META.version : "unknown",
    kb_conditions: (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) ? KNOWLEDGE_ALL.length : 0,
    store_version: (typeof STORE_VERSION !== "undefined") ? STORE_VERSION : "",
    run_at: new Date().toISOString(),
    token_count: tokens.length,
    /* The exact ranked output the clinician was shown, so a later reviewer can
       see the differential as PRESENTED rather than as recomputed today.
       Field names follow the dxList shape (`n` / `prob`), not the raw scorer's. */
    shown_top: (V.dxList || []).slice(0, 5).map(function (d) {
      return {
        name: d.n,
        prob: (typeof d.prob === "number") ? +d.prob.toFixed(4) : null,
        icd: d.icd || "",
        /* whether that code was clinician-verified AT THE TIME — a code shown
           as provisional must not later look as though it had been signed off */
        icd_status: d.icd_status || "",
        urgent: !!d.urgent
      };
    }),
    urgent_alerts: (V.alerts || []).filter(function (a) { return a.l === "urgent"; }).length
  };

  ENGINE_STATE.lastRun = new Date().toISOString();
}
