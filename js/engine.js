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

function collectTokens(visit, patient) {

  /* Read through the shape-safe view, never the live objects (see
     engineShape above). These locals shadow the globals for this whole
     function; with no arguments the view is built from the open visit. */
  var V = engineVisitView(visit);
  var P = enginePatientView(patient);

  var tokens = [];

  /* Helper: add token if not already present.
     Canonicalise synonyms first (see TOKEN_ALIASES) so every producer —
     chips, free-text, findings, derived measurements — converges on one
     token and the differential can't fragment on phrasing. A token is a
     non-empty string; anything else (a number or object in an imported
     symptoms array) is not evidence of anything. */
  function addToken(t) {
    if (typeof t !== "string" || !t) return;
    if (typeof canonicalToken === "function") t = canonicalToken(t);
    if (typeof t === "string" && t && tokens.indexOf(t) === -1) {
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
  /* Is `kw` present as a WORD (or the start of one) and not negated?
     Keywords are stems — "infiltrat" must match "infiltrate" and
     "infiltrates" — so the end is open, but the START must be a word
     boundary. A bare substring match read the cornea recorded as "within
     normal limits" (wi-THIN) or "nothing abnormal" (no-THIN-g) as corneal
     THINNING. Every occurrence is checked, so "no scar centrally, scar
     inferiorly" still records the second one. */
  function slKeywordAt(s, kw) {
    /* Bounded by the text length, not by indexOf alone: a loop whose only
       exit is `idx < 0` spins forever if that test is ever inverted. */
    for (var n = 0, idx = s.indexOf(kw); n <= s.length && idx >= 0; n++, idx = s.indexOf(kw, idx + 1)) {
      var atWordStart = idx === 0 || !/[a-z0-9]/.test(s.charAt(idx - 1));
      if (atWordStart && !slNegatedAt(s, idx)) return true;
    }
    return false;
  }
  /* British spellings: "oedema" used to match the "edema" stem only by
     accident (as a substring), and "haemorrhage" never matched
     "hemorrhage" at all. Normalise before matching. */
  function slNormText(v) {
    return String(v === null || v === undefined ? "" : v).toLowerCase()
      .replace(/oedem/g, "edem").replace(/haem/g, "hem");
  }
  var MOT_LIMIT_CUE = /limit|deficit|restrict|reduc|weak|poor|unable|cannot|can't|palsy|paresis|underact|lag|(^|[^a-z0-9])-\s?[1-4]\b/;
  function motDeficit(txt, stem) {
    for (var n = 0, idx = txt.indexOf(stem); n <= txt.length && idx >= 0; n++, idx = txt.indexOf(stem, idx + 1)) {
      if ((idx === 0 || !/[a-z0-9]/.test(txt.charAt(idx - 1))) && !slNegatedAt(txt, idx)) {
        /* the clause around the keyword */
        var from = Math.max(txt.lastIndexOf(",", idx), txt.lastIndexOf(";", idx), txt.lastIndexOf(".", idx)) + 1;
        var ends = [txt.indexOf(",", idx), txt.indexOf(";", idx), txt.indexOf(".", idx)].filter(function (x) { return x >= 0; });
        var to = ends.length ? Math.min.apply(null, ends) : txt.length;
        var clause = txt.slice(from, to);
        if (MOT_LIMIT_CUE.test(clause)) return true;
      }
    }
    return false;
  }
  function slParseText(vals, map, add) {
    for (var i = 0; i < vals.length; i++) {
      var s = slNormText(vals[i]);
      if (!s || s === "clear" || s === "white and quiet" || s === "wnl" || s === "normal") continue;
      /* Own keys only — an inherited one would become a slit-lamp keyword. */
      for (var kw in map) {
        if (!Object.prototype.hasOwnProperty.call(map, kw)) continue;
        if (slKeywordAt(s, kw)) add(map[kw]);
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
    /* Asymmetry needs BOTH eyes measured. With one reading blank, the old
       `parseFloat(x) || 0` made the asymmetry equal the whole of the other
       reading: a single NORMAL value of 16 mm "differed by 16 mm" from the
       blank eye and produced proptosis → Thyroid Eye Disease. */
    var exOd = engineMeasured(V.orbit.exoph_od);
    var exOs = engineMeasured(V.orbit.exoph_os);
    var _prAbs = clinThreshold("proptosis_absolute", 21);
    if ((exOd !== null && exOd >= _prAbs) || (exOs !== null && exOs >= _prAbs) ||
        (exOd !== null && exOs !== null &&
         Math.abs(exOd - exOs) >= clinThreshold("proptosis_asymmetry", 2))) addToken("proptosis");
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
    /* A FAMILY history of diabetes is not the patient's diabetes. It used to
       emit diabetes_history — the token Diabetic Macular Edema, PDR and
       Diabetic Papillopathy REQUIRE — so a patient with distortion and a
       diabetic parent was shown Diabetic Macular Edema. It stays on the
       record; it contributes no diagnostic token (see NEEDS_REVIEW.md). */
  }


  /* ── SOURCE 9: Auto-derived from measurements ── */

  /* Age-based tokens */
  /* engineAgeYears: "0" is a child under one, not a blank. */
  var age = engineAgeYears(P);
  if (age !== null) {
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
    /* vanHerickGrade: grade 0 (closed) is the most narrow, not "unrecorded". */
    var vhOd = vanHerickGrade(V.sl.od.vh);
    var vhOs = vanHerickGrade(V.sl.os.vh);
    var _vhN = clinThreshold("van_herick_narrow", 2);
    if ((vhOd !== null && vhOd <= _vhN) || (vhOs !== null && vhOs <= _vhN)) { addToken("narrow_angle"); addToken("shallow_ac"); }
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
  if (V.pupil && rapdPresent(V.pupil.rapd)) {
    addToken("RAPD_positive");
    addToken("reduced_vision");
  }

  /* NPC auto-derivation */
  if (V.bv && V.bv.npc_b) {
    var npc = parseFloat(V.bv.npc_b) || 0;
    if (npc >= clinThreshold("npc_receded", 6)) addToken("NPC_receded");
  }

  /* Cover test / phoria auto-derivation (coverTestDeviation reads the
     notations actually written: "8Δ exo", "8^ XP", "10 X(T)", "eso 6"). */
  if (V.bv) {
    var ctN = coverTestDeviation(V.bv.ct_n);
    if (ctN) {
      var _phN = clinThreshold("phoria_near_significant", 6);
      if (ctN.dir === "exo" && ctN.amount > _phN) addToken("exo_near");
      if (ctN.dir === "eso" && ctN.amount > _phN) addToken("eso_near");
    }
    var ctD = coverTestDeviation(V.bv.ct_d);
    if (ctD) {
      var _phD = clinThreshold("phoria_distance_significant", 6);
      if (ctD.dir === "exo" && ctD.amount > _phD) addToken("exo_distance");
      if (ctD.dir === "eso" && ctD.amount > _phD) addToken("eso_distance");
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

  /* Measurements below read through engineMeasured(): blank is "not
     measured", and a recorded 0 is a result — the most abnormal one. */

  /* Accommodation amplitude (0 D = no accommodation at all) */
  if (V.bv) {
    var accOd = engineMeasured(V.bv.acc_od);
    var accOs = engineMeasured(V.bv.acc_os);
    var accMin = (accOd === null) ? accOs : (accOs === null ? accOd : Math.min(accOd, accOs));
    if (accMin !== null && age !== null) {
      var hofMin = hofstetter(age).min;
      if (hofMin !== null && accMin < hofMin) {
        addToken("reduced_amplitude");
        addToken("low_amplitude");
      }
    }
  }

  /* Flipper rate (monocular accommodative facility). BOTH eyes: the left
     eye's result used to be recorded on screen and never read. */
  if (V.bv) {
    var mafOd = engineMeasured(V.bv.maf_od);
    var mafOs = engineMeasured(V.bv.maf_os);
    var _flip = clinThreshold("flipper_reduced", 8);
    if ((mafOd !== null && mafOd < _flip) || (mafOs !== null && mafOs < _flip)) addToken("reduced_flipper_rate");
  }

  /* Vergence ranges */
  if (V.bv) {
    var boNBk = engineMeasured(V.bv.bo_n_bk);
    if (boNBk !== null && boNBk < clinThreshold("pfv_reduced", 15)) addToken("reduced_PFV");

    /* Check if any vergence range is significantly reduced */
    var anyReduced = false;
    var _vgR = clinThreshold("vergence_range_reduced", 8);
    var ranges = ["bo_d_bk", "bi_d_bk", "bo_n_bk", "bi_n_bk"];
    for (var ri = 0; ri < ranges.length; ri++) {
      var rv = engineMeasured(V.bv[ranges[ri]]);
      if (rv !== null && rv < _vgR) anyReduced = true;
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

    /* Anisometropia — only when BOTH eyes were refracted. A blank eye read
       as 0, so refracting the right eye first (-3.00, left not yet done)
       produced a 3 D "anisometropia" and Anisometropic Refractive Error. */
    var rxOdDone = !!(String(V.rx.od_sph).trim() || String(V.rx.od_cyl).trim());
    var rxOsDone = !!(String(V.rx.os_sph).trim() || String(V.rx.os_cyl).trim());
    if (rxOdDone && rxOsDone &&
        Math.abs(sphOd - sphOs) >= clinThreshold("anisometropia_min", 1.0)) addToken("unequal_refractive_error");

    /* Add power — a recorded add of 0.00 is "no add", not an add. */
    var addOd = engineMeasured(V.rx.od_add), addOs = engineMeasured(V.rx.os_add);
    if ((addOd !== null && addOd > 0) || (addOs !== null && addOs > 0)) addToken("add_required");
  }

  /* VA auto-derivation — corrected acuity BETTER than unaided. This used
     to fire whenever the two strings differed, so a best-corrected 6/9 that
     was WORSE than an unaided 6/6 (or the same line typed as "20/20") was
     scored as improving with correction. */
  if (V.va) {
    if (vaBetter(V.va.od_bva, V.va.od_un, V.va.chart)) addToken("improves_with_correction");
    if (vaBetter(V.va.os_bva, V.va.os_un, V.va.chart)) addToken("improves_with_correction");
  }

  /* C/D ratio auto-derivation */
  if (V.fun) {
    var cdOd = parseFloat(V.fun.od.cd_v) || 0;
    var cdOs = parseFloat(V.fun.os.cd_v) || 0;
    var _cdHi = clinThreshold("cd_increased", 0.6);
    if (cdOd >= _cdHi || cdOs >= _cdHi) addToken("increased_cd");
    if (cdOd > 0 && cdOs > 0 && Math.abs(cdOd - cdOs) > clinThreshold("cd_asymmetry", 0.2)) addToken("cd_asymmetry");
  }

  /* NRR from fundus — through the same word-boundary, negation-aware
     parser as every other exam box. A substring match read "no thinning",
     "no notching" and "within normal limits" (wi-THIN) as rim thinning,
     which is glaucoma evidence. */
  if (V.fun) {
    slParseText([V.fun.od.nrr, V.fun.os.nrr], { thin: "nrr_thinning", notch: "nrr_thinning" }, addToken);
  }

  /* Disc assessment — same parser: "pink, no edema" is not disc edema, and
     "not pale" is not a pale disc. "pallor" is the noun of "pale" and is
     how disc colour is usually written ("temporal pallor"). */
  if (V.fun) {
    slParseText([V.fun.od.disc, V.fun.os.disc], { pale: "pale_disc", pallor: "pale_disc", edema: "disc_edema" }, addToken);
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
    var motTxt = slNormText(V.mot.notes);
    if (V.mot.versions && V.mot.versions !== "Full") addToken("restricted_motility");
    if (V.mot.ductions && V.mot.ductions !== "Full") addToken("restricted_motility");
    /* A duction DEFICIT, not a mention. "abduction full" and "no abduction
       deficit" were both read as limited abduction; and "down" + "out"
       anywhere in the note ("without restriction, looks down") was read as
       the down-and-out eye of a third-nerve palsy. Now the duction must sit
       in a clause that also states a limitation, un-negated, and down-and-
       out must be the phrase itself. */
    if (motDeficit(motTxt, "abduct")) addToken("limited_abduction");
    if (motDeficit(motTxt, "adduct")) addToken("adduction_deficit");
    if (V.mot.nystagmus && V.mot.nystagmus !== "None") addToken("nystagmus_other_eye");
    var dno = /\bdown[\s-]*(and|&)?[\s-]*out\b/.exec(motTxt);
    if (dno && !slNegatedAt(motTxt, dno.index)) addToken("eye_down_out");
  }

  /* Gonioscopy — narrow/closed angle (Shaffer grade ≤1 / Slit / closed),
     recession, pigment, neovascularization. */
  if (V.gon) {
    var gonVals = [V.gon.od.s, V.gon.od.n, V.gon.od.i, V.gon.od.t, V.gon.os.s, V.gon.os.n, V.gon.os.i, V.gon.os.t];
    var gonNarrow = false;
    for (var gi = 0; gi < gonVals.length; gi++) {
      var gv = slNormText(gonVals[gi]).trim();
      if (gv === "0" || gv === "1" || gv === "slit" ||
          slKeywordAt(gv, "closed") || slKeywordAt(gv, "narrow")) gonNarrow = true;
    }
    if (gonNarrow) { addToken("narrow_angle"); addToken("angle_closure_risk"); }
    /* Recession and angle neovascularisation are written in the NOTES box —
       its placeholder says "PAS, NVA…" — but only the four grade dropdowns
       were ever read, so "NVA 360°" typed there raised no rubeosis red flag.
       Read the notes too, negation-aware ("no NVA" is not NVA). */
    slParseText(gonVals.concat([V.gon.od.notes, V.gon.os.notes]), {
      recess: "trauma_history", nva: "rubeosis_iridis", neovasc: "rubeosis_iridis", rubeosis: "rubeosis_iridis"
    }, addToken);
    /* Pigment: the box asks for a grade "0-4", but only the strings "3+" /
       "4+" were recognised — a typed 3 or 4 did nothing. */
    [V.gon.od.pig, V.gon.os.pig].forEach(function (pg) {
      var t = slNormText(pg);
      var g = /(^|[^0-9.])([0-4])(?![0-9.])/.exec(t);
      if (/heavy|dense/.test(t) || (g && parseInt(g[2], 10) >= 3)) addToken("pigment_dispersion");
    });
  }

  /* Slit lamp specific fields */
  if (V.sl) {
    /* TBUT — emits the symptom-domain token AND the objective-test token
       (TBUT_reduced) so a measured result is scored as confirmation, not
       just a repeat of what the patient already reported. */
    var butOd = engineMeasured(V.sl.od.but);
    var butOs = engineMeasured(V.sl.os.but);
    var butMin = (butOd === null) ? butOs : (butOs === null ? butOd : Math.min(butOd, butOs));
    if (butMin !== null && butMin < clinThreshold("tbut_reduced", 10)) {
      addToken("dryness");
      addToken("TBUT_reduced");
      addToken("tear_film_instability");
    }

    /* Schirmer — same pattern: symptom token + objective-test token */
    var schOd = engineMeasured(V.sl.od.schirmer);
    var schOs = engineMeasured(V.sl.os.schirmer);
    var schMin = (schOd === null) ? schOs : (schOs === null ? schOd : Math.min(schOd, schOs));
    if (schMin !== null && schMin < clinThreshold("schirmer_low", 10)) {
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


/* STAGE 2 — PARSE FREE-TEXT COMPLAINT: stripNegatedPhrases() and
   parseComplaintText() live in js/engine-inputs.js with the other readers
   of recorded input. collectTokens() calls them. */


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
      /* "PVD" matched no condition, so PVD was never surfaced by this gate */
      conditions: ["Retinal Tear", "Retinal Detachment", "Posterior Vitreous Detachment (PVD)"]
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
      /* "Keratitis" was listed here and matched no condition (there are 14
         keratitis entries). Which, if any, this gate should surface is a
         clinical call — NEEDS_CLINICAL_REVIEW, see NEEDS_REVIEW.md. */
      conditions: ["Anterior Uveitis (Acute)", "Corneal Abrasion"]
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
/* ── THE DISPLAY FLOOR ──

   A condition scoring below this is SCORED but not shown in the differential.
   It was a local `var` inside the scoring pass, which meant the glass-box flow
   map could not consult it and instead printed the top 5 of the raw scored
   list with no marker at all. A clinician entering one symptom therefore saw
   "Hemianopic Field Loss (Occipital Stroke) 7%" in the reasoning view and
   reasonably concluded the engine was suggesting a stroke out of nowhere — it
   was not; that entry is deliberately excluded from the differential.

   Hoisted so there is exactly ONE definition. A second copy in the flow map
   would drift, and a glass box that disagrees with the engine is worse than no
   glass box. */
var DX_FLOOR = 0.15;

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

/* Own property only — an inherited one answering here would make EVERY token
   context-only at once, draining every condition's evidence (kbMap(), loader.js). */
function isContextOnlyToken(t) {
  return Object.prototype.hasOwnProperty.call(CONTEXT_ONLY_TOKENS, t) && !!CONTEXT_ONLY_TOKENS[t];
}

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
/* Lives in js/engine-exclusions.js — applyExclusions(). It is the  */
/* only stage that DELETES a clinical possibility, so it is its own */
/* file with its own tests rather than fifty lines buried here.     */
/* ═══════════════════════════════════════════════════════════════ */


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

function computeAlerts(tokens, visit) {
  var V = engineVisitView(visit);   /* shape-safe read view; see engineShape */
  tokens = Array.isArray(tokens) ? tokens : [];
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
  if (V.pupil && rapdPresent(V.pupil.rapd)) {
    alerts.push({ m: "RAPD detected (" + V.pupil.rapd + ") — neuro-ophthalmic assessment", l: "urgent" });
  }

  /* Van Herick */
  if (V.sl) {
    /* Grade 0 is a CLOSED angle — it used to read as 99 (see vanHerickGrade). */
    var vhOd = vanHerickGrade(V.sl.od.vh);
    var vhOs = vanHerickGrade(V.sl.os.vh);
    var _vhA = clinThreshold("van_herick_narrow", 2);
    if (vhOd !== null && vhOd <= _vhA) alerts.push({ m: "Van Herick ≤" + _vhA + " OD — gonioscopy before dilation", l: "warn" });
    if (vhOs !== null && vhOs <= _vhA) alerts.push({ m: "Van Herick ≤" + _vhA + " OS — gonioscopy before dilation", l: "warn" });
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

function computeNudges(results, tokens, visit, patient) {
  var V = engineVisitView(visit);
  var P = enginePatientView(patient);
  var nudges = [];
  var done = new Set(V.completed);
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
  var _age = engineAgeYears(P);
  if (_age !== null) {
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
  /* Timed — this is the number that must stay flat as the knowledge base
     grows, and the only way to know it has on a real device is to record it.
     perfTime is optional; without it this is a plain call. */
  return (typeof perfTime === "function")
    ? perfTime("engine_run", _runDiagnosticEngine)
    : _runDiagnosticEngine();
}

/* ── FAILURE CONTAINMENT ────────────────────────────────────────── */

/* Run one non-safety stage; on a throw, record it and use `fallback`. A
   failing suggestion list must not take the red flags down with it. */
function _engineStage(what, fallback, fn) {
  try { return fn(); }
  catch (e) { _engineNoteError(what, e); return fallback; }
}

function _engineNoteError(what, e) {
  ENGINE_STATE.lastError = {
    stage: what,
    message: String((e && e.message) || e).slice(0, 300),
    at: new Date().toISOString()
  };
  if (typeof console !== "undefined" && console.error) console.error("Entopic engine — " + what + ":", e);
}

function _engineRedFlagFailure(e) {
  _engineNoteError("red-flag checks", e);
  return {
    m: "Red-flag checks could not run on this record — review every finding manually before the patient leaves.",
    l: "urgent",
    engine_error: true
  };
}

/* The differential could not be built. Never leave the previous run's
   list on screen as though it were current: clear it, run the red-flag
   rules on whatever tokens were read, and say plainly what happened. */
function _engineFailSafe(tokens, what, e) {
  _engineNoteError(what, e);
  V.dxList = [];
  V.problemFoci = [];
  V.nudges = [];
  V.nextTests = [];
  var alerts;
  try {
    alerts = computeAlerts(tokens || []);
  } catch (e2) {
    alerts = [_engineRedFlagFailure(e2)];
  }
  alerts.push({
    m: "Entopic could not finish " + what + " — no differential is shown. " +
       "Red-flag checks ran on the findings it could read; review this record manually.",
    l: "warn",
    engine_error: true
  });
  V.alerts = alerts;
  ENGINE_STATE.tokens = (tokens || []).slice();
  ENGINE_STATE.results = [];
}

/* STAGES 3–9 of a run: normalise → gate → route → score → exclude → rank
   → the shown differential, written to V.dxList. Returns what the later
   stages need. Split out of _runDiagnosticEngine so a failure here can be
   caught without losing the red-flag stage. */
function _engineDifferential(tokens) {

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
  /* Object.create(null) throughout this stage — `gatedNames`, `seen` and
     `activeRoute` are data-keyed (kbMap(), loader.js). */
  var gatedNames = Object.create(null);
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
    var seen = Object.create(null);
    var activeRoute = Object.create(null);
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

  return { tokens: tokens, routes: routes, results: results,
           overlayResults: overlayResults, mergedShown: mergedShown };
}

function _runDiagnosticEngine() {

  /* No visit open — the home screen holds V = {}. This used to test for
     `V.symptoms`, and a saved visit from an older build that lacked that
     one array made the engine return early and SILENTLY: IOP 45 with an
     RAPD raised no red flag and the panel kept whatever it showed before. */
  if (!V || typeof V !== "object" || Object.keys(V).length === 0) return;

  ENGINE_STATE.runCount++;
  ENGINE_STATE.lastError = null;

  /* ── STAGE 1: Collect all tokens ── */
  var tokens;
  try {
    tokens = collectTokens();
  } catch (e) {
    _engineFailSafe([], "reading this record", e);
    return;
  }

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

  /* ── STAGES 3–9: the differential ──
     Isolated: if anything in scoring throws (a malformed knowledge-base
     entry, a clinician-authored condition), the red-flag stage below must
     still run. A throw here used to end the whole run before STAGE 10. */
  var dx;
  try {
    dx = _engineDifferential(tokens);
  } catch (e) {
    _engineFailSafe(tokens, "building the differential", e);
    return;
  }
  tokens = dx.tokens;
  var routes = dx.routes, results = dx.results;
  var overlayResults = dx.overlayResults, mergedShown = dx.mergedShown;

  /* ── Problem foci (concurrent independent problems) ──
     Core results only: a working-problem grouping built partly from
     unreviewed personal conditions would present them as established. */
  V.problemFoci = _engineStage("grouping the working problems", [], function () {
    return computeProblemFoci(V.dxList.filter(function (d) { return !d.overlay; }));
  });

  /* ── STAGE 10: Alerts ──
     CORE alerts are computed first and independently of everything above, so
     nothing an overlay does can alter, reorder or suppress them. If the
     red-flag rules themselves cannot run, the clinician is told so in an
     urgent banner — an empty alert box must never mean "the checks failed". */
  try {
    V.alerts = computeAlerts(tokens);
  } catch (e) {
    V.alerts = [_engineRedFlagFailure(e)];
  }

  /* Derived alerts (F-1): any urgent CORE condition that reached the shown
     differential and which no hand-written rule already named. Appended, so
     the 17 specific rules keep their place at the top. */
  var _derived = _engineStage("naming urgent conditions", [], function () {
    return computeDerivedAlerts(mergedShown, V.alerts);
  });
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
  V.nudges = _engineStage("suggesting next steps", [], function () {
    return computeNudges(results, tokens);
  });

  /* ── STAGE 12: Next-test recommender (diagnostic refinement loop) ──
     Uses the SHOWN differential so suggestions track exactly what the
     clinician sees; recomputed every time the engine re-runs (nav()), which
     is what makes it a live narrowing loop. */
  V.nextTests = _engineStage("suggesting discriminating tests", [], function () {
    return computeNextTests(results, tokens);
  });

  /* ── STAGE 12: Log ── */
  _engineStage("logging the run", null, function () {
    logEngineRun({
      tokens: tokens,
      routes: routes,
      results: results,
      alerts: V.alerts
    });
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

  /* STAGE 14 — WHAT CHANGED (F-6): snapshot this run so the panel can say
     "adding photophobia moved Anterior Uveitis 4th → 1st" instead of silently
     redrawing. Optional module; reads the outputs, changes nothing above. */
  if (typeof engineRecordRun === "function") { try { engineRecordRun(V, tokens); } catch (e) {} }

  ENGINE_STATE.lastRun = new Date().toISOString();
}
