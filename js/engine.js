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

function collectTokens() {

  var tokens = [];

  /* Helper: add token if not already present */
  function addToken(t) {
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
    if (V.temporal.onset) addToken(V.temporal.onset);
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
      var slFind = V.sl.findings[si];
      if (typeof FINDING_TOKEN_MAP !== "undefined" && FINDING_TOKEN_MAP[slFind]) {
        addTokens(FINDING_TOKEN_MAP[slFind]);
      }
    }
  }


  /* ── SOURCE 5: Fundus findings → tokens via map ── */
  if (V.fun && V.fun.findings && V.fun.findings.length > 0) {
    for (var fi = 0; fi < V.fun.findings.length; fi++) {
      var funFind = V.fun.findings[fi];
      if (typeof FINDING_TOKEN_MAP !== "undefined" && FINDING_TOKEN_MAP[funFind]) {
        addTokens(FINDING_TOKEN_MAP[funFind]);
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
    if (age < 18)  addToken("young_age");
    if (age >= 40) addToken("age_over_40");
    if (age >= 60) addToken("older_age");
    if (age >= 40) addToken("age_related");
  }

  /* IOP auto-derivation */
  if (V.iop) {
    var iopOd = parseFloat(V.iop.od) || 0;
    var iopOs = parseFloat(V.iop.os) || 0;
    var iopMax = Math.max(iopOd, iopOs);
    if (iopMax > 21) addToken("high_iop");
    if (iopMax > 30) addToken("IOP_very_high");
    if (iopMax > 0 && iopMax <= 21) addToken("normal_iop");
  }

  /* CCT / Pachymetry */
  if (V.iop) {
    var cctOd = parseFloat(V.iop.od_cct) || 0;
    var cctOs = parseFloat(V.iop.os_cct) || 0;
    var cctMin = 0;
    if (cctOd > 0 && cctOs > 0) cctMin = Math.min(cctOd, cctOs);
    else if (cctOd > 0) cctMin = cctOd;
    else if (cctOs > 0) cctMin = cctOs;
    if (cctMin > 0 && cctMin < 520) addToken("thin_cornea");
  }

  /* Van Herick */
  if (V.sl) {
    var vhOd = parseInt(V.sl.od.vh) || 99;
    var vhOs = parseInt(V.sl.os.vh) || 99;
    if (vhOd <= 2 || vhOs <= 2) { addToken("narrow_angle"); addToken("shallow_ac"); }
  }

  /* AC Cells */
  if (V.sl) {
    var cellsOd = V.sl.od.cells || "0";
    var cellsOs = V.sl.os.cells || "0";
    if (cellsOd !== "0" || cellsOs !== "0") {
      addToken("pain");
      addToken("photophobia");
    }
  }

  /* RAPD */
  if (V.pupil && V.pupil.rapd !== "None") {
    addToken("RAPD_positive");
    addToken("vision_loss");
  }

  /* NPC auto-derivation */
  if (V.bv && V.bv.npc_b) {
    var npc = parseFloat(V.bv.npc_b) || 0;
    if (npc >= 6) addToken("NPC_receded");
  }

  /* Cover test / phoria auto-derivation */
  if (V.bv && V.bv.ct_n) {
    var ctNear = V.bv.ct_n.toLowerCase();
    var phoriaMatch = ctNear.match(/(\d+\.?\d*)\s*(exo|eso)/);
    if (phoriaMatch) {
      var phoriaVal = parseFloat(phoriaMatch[1]);
      var phoriaDir = phoriaMatch[2];
      if (phoriaDir === "exo" && phoriaVal > 6) addToken("exo_near");
      if (phoriaDir === "eso" && phoriaVal > 6) addToken("eso_near");
    }
  }
  if (V.bv && V.bv.ct_d) {
    var ctDist = V.bv.ct_d.toLowerCase();
    var distMatch = ctDist.match(/(\d+\.?\d*)\s*(exo|eso)/);
    if (distMatch) {
      var distVal = parseFloat(distMatch[1]);
      var distDir = distMatch[2];
      if (distDir === "exo" && distVal > 6) addToken("exo_distance");
      if (distDir === "eso" && distVal > 6) addToken("eso_distance");
    }
  }

  /* AC/A ratio */
  if (V.bv && V.bv.aca) {
    var acaMatch = V.bv.aca.match(/(\d+\.?\d*)/);
    if (acaMatch) {
      var acaVal = parseFloat(acaMatch[1]);
      if (acaVal > 6) addToken("high_ACA_ratio");
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
    if (maf < 8 && maf < 999) addToken("reduced_flipper_rate");
  }

  /* Vergence ranges */
  if (V.bv) {
    var boNBk = parseFloat(V.bv.bo_n_bk) || 999;
    if (boNBk < 15 && boNBk < 999) addToken("reduced_PFV");

    /* Check if any vergence range is significantly reduced */
    var anyReduced = false;
    var ranges = ["bo_d_bk", "bi_d_bk", "bo_n_bk", "bi_n_bk"];
    for (var ri = 0; ri < ranges.length; ri++) {
      var rv = parseFloat(V.bv[ranges[ri]]) || 0;
      if (rv > 0 && rv < 8) anyReduced = true;
    }
    if (anyReduced) addToken("reduced_vergence_ranges");
  }

  /* Refraction auto-derivation */
  if (V.rx && V.rx.od_sph) {
    var sphOd = parseFloat(V.rx.od_sph) || 0;
    var sphOs = parseFloat(V.rx.os_sph) || 0;
    if (sphOd < -0.50 || sphOs < -0.50) addToken("myopia");
    if (sphOd > +0.75 || sphOs > +0.75) addToken("hyperopia");

    var cylOd = parseFloat(V.rx.od_cyl) || 0;
    var cylOs = parseFloat(V.rx.os_cyl) || 0;
    if (Math.abs(cylOd) >= 0.75 || Math.abs(cylOs) >= 0.75) addToken("astigmatism");

    /* Anisometropia */
    if (Math.abs(sphOd - sphOs) >= 1.0) addToken("unequal_refractive_error");

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
    if (cdOd >= 0.6 || cdOs >= 0.6) addToken("increased_cd");
    if (cdOd > 0 && cdOs > 0 && Math.abs(cdOd - cdOs) > 0.2) addToken("cd_asymmetry");
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

  /* Motility */
  if (V.mot) {
    if (V.mot.versions === "Limited") addToken("restricted_motility");
    if (V.mot.ductions === "Limited") addToken("restricted_motility");
  }

  /* Slit lamp specific fields */
  if (V.sl) {
    /* TBUT */
    var butOd = parseFloat(V.sl.od.but) || 999;
    var butOs = parseFloat(V.sl.os.but) || 999;
    var butMin = Math.min(butOd, butOs);
    if (butMin < 10 && butMin < 999) addToken("dryness");
    if (butMin < 5 && butMin < 999) addToken("dryness");

    /* Schirmer */
    var schOd = parseFloat(V.sl.od.schirmer) || 999;
    var schOs = parseFloat(V.sl.os.schirmer) || 999;
    var schMin = Math.min(schOd, schOs);
    if (schMin < 10 && schMin < 999) addToken("reduced_tearing");
    if (schMin < 5 && schMin < 999) addToken("reduced_tearing");

    /* LOCS grading */
    var nsOd = parseInt(V.sl.od.ns) || 0;
    var nsOs = parseInt(V.sl.os.ns) || 0;
    if (nsOd >= 2 || nsOs >= 2) addToken("gradual_blur");
    if (nsOd >= 3 || nsOs >= 3) addToken("glare");

    var pscOd = parseInt(V.sl.od.psc) || 0;
    var pscOs = parseInt(V.sl.os.psc) || 0;
    if (pscOd >= 1 || pscOs >= 1) { addToken("near_blur"); addToken("glare"); }
  }

  /* Neuro fields */
  if (V.neuro) {
    if (V.neuro.color_od && V.neuro.color_od !== "14/14" && V.neuro.color_od !== "") {
      addToken("color_vision_loss");
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

  /* Investigation fields */
  if (V.inv) {
    /* OCT RNFL */
    var rnflOd = parseFloat(V.inv.oct_rnfl_od) || 0;
    var rnflOs = parseFloat(V.inv.oct_rnfl_os) || 0;
    if ((rnflOd > 0 && rnflOd < 80) || (rnflOs > 0 && rnflOs < 80)) {
      addToken("RNFL_thinning");
      addToken("field_defect");
    }

    /* Visual field MD */
    var mdOd = parseFloat(V.inv.vf_md_od) || 0;
    var mdOs = parseFloat(V.inv.vf_md_os) || 0;
    if (mdOd < -3 || mdOs < -3) addToken("field_defect");
    if (mdOd < -6 || mdOs < -6) addToken("visual_field_defect");
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
     scored. Self-maintains as the KB grows; scoring still gates ranking. */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
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

var SCORE_WEIGHTS = {
  required:  3,
  supportive: 1,
  contra:    -3,
  temporal_match: 0.5,
  temporal_mismatch: -0.5
};

function scoreCondition(condition, tokens) {

  var score = 0;
  var maxPossible = 0;
  var reqMatched = 0;
  var reqMissing = 0;
  var supMatched = 0;
  var conMatched = 0;
  var tempMatch = false;

  /* Required tokens */
  for (var ri = 0; ri < condition.req.length; ri++) {
    maxPossible += SCORE_WEIGHTS.required;
    if (tokens.indexOf(condition.req[ri]) >= 0) {
      score += SCORE_WEIGHTS.required;
      reqMatched++;
    } else {
      reqMissing++;
    }
  }

  /* Supportive tokens */
  for (var si = 0; si < condition.sup.length; si++) {
    maxPossible += SCORE_WEIGHTS.supportive;
    if (tokens.indexOf(condition.sup[si]) >= 0) {
      score += SCORE_WEIGHTS.supportive;
      supMatched++;
    }
  }

  /* Contradicting tokens */
  for (var ci = 0; ci < condition.con.length; ci++) {
    if (tokens.indexOf(condition.con[ci]) >= 0) {
      score += SCORE_WEIGHTS.contra;
      conMatched++;
    }
  }

  /* Temporal matching */
  if (condition.temporal && condition.temporal.length > 0) {
    for (var ti = 0; ti < condition.temporal.length; ti++) {
      if (tokens.indexOf(condition.temporal[ti]) >= 0) {
        score += SCORE_WEIGHTS.temporal_match;
        tempMatch = true;
        break;
      }
    }
    /* Temporal mismatch penalty */
    if (!tempMatch) {
      var hasAcute = tokens.indexOf("acute") >= 0 || tokens.indexOf("acute_bias") >= 0;
      var hasChronic = tokens.indexOf("chronic") >= 0 || tokens.indexOf("chronic_bias") >= 0;
      var condAcute = condition.temporal.indexOf("acute") >= 0;
      var condChronic = condition.temporal.indexOf("chronic") >= 0;

      if (hasAcute && condChronic && !condAcute) {
        score += SCORE_WEIGHTS.temporal_mismatch;
      }
      if (hasChronic && condAcute && !condChronic) {
        score += SCORE_WEIGHTS.temporal_mismatch;
      }
    }
  }

  /* Calculate normalized score */
  var normalized = maxPossible > 0 ? score / maxPossible : 0;

  /* Penalties */
  if (reqMissing > 0) normalized *= 0.7;
  if (reqMissing > 1) normalized *= 0.5;
  if (conMatched > 0) normalized *= 0.6;
  if (tokens.length < 2) normalized *= 0.5;

  /* Cap */
  normalized = Math.max(0, Math.min(1, normalized));

  /* All required tokens missing = zero */
  if (reqMatched === 0 && condition.req.length > 0) {
    normalized = 0;
  }

  return {
    score: normalized,
    reqMatched: reqMatched,
    reqMissing: reqMissing,
    supMatched: supMatched,
    conMatched: conMatched,
    tempMatch: tempMatch,
    maxPossible: maxPossible,
    rawScore: score
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
    if (results[i].score >= 0.5) {
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

function generateEvidence(condition, tokens, scoreResult) {
  var matched = [];
  var missing = [];
  var contradicted = [];

  /* Required */
  for (var ri = 0; ri < condition.req.length; ri++) {
    if (tokens.indexOf(condition.req[ri]) >= 0) {
      matched.push(condition.req[ri]);
    } else {
      missing.push(condition.req[ri]);
    }
  }

  /* Supportive */
  for (var si = 0; si < condition.sup.length; si++) {
    if (tokens.indexOf(condition.sup[si]) >= 0) {
      matched.push(condition.sup[si]);
    }
  }

  /* Contradicting */
  for (var ci = 0; ci < condition.con.length; ci++) {
    if (tokens.indexOf(condition.con[ci]) >= 0) {
      contradicted.push(condition.con[ci]);
    }
  }

  /* Suggested tests */
  var suggestedTests = [];
  if (condition.tests) {
    for (var ti = 0; ti < condition.tests.length; ti++) {
      suggestedTests.push(condition.tests[ti]);
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
  if (score >= 0.80) return "High";
  if (score >= 0.60) return "Moderate-High";
  if (score >= 0.40) return "Moderate";
  if (score >= 0.20) return "Low-Moderate";
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
    if (iopOd > 40 || iopOs > 40) {
      alerts.push({ m: "IOP critically elevated (>40 mmHg) — acute angle closure?", l: "urgent" });
    } else if (iopOd > 30 || iopOs > 30) {
      alerts.push({ m: "IOP significantly elevated (>30 mmHg) — urgent assessment", l: "urgent" });
    } else if (iopOd > 21 || iopOs > 21) {
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
    if (vhOd <= 2) alerts.push({ m: "Van Herick ≤2 OD — gonioscopy before dilation", l: "warn" });
    if (vhOs <= 2) alerts.push({ m: "Van Herick ≤2 OS — gonioscopy before dilation", l: "warn" });
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
    if (!lead || lead.prob < 0.15) continue;

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

  /* Score every condition in the knowledge base */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    for (var ki = 0; ki < KNOWLEDGE_ALL.length; ki++) {
      var cond = KNOWLEDGE_ALL[ki];

      /* Only score conditions on active routes (or gated conditions) */
      var onRoute = routes.indexOf(cond.route) >= 0;
      var isGated = gatedNames[cond.name] !== undefined;

      if (!onRoute && !isGated) continue;

      var scoreResult = scoreCondition(cond, tokens);

      /* Skip zero scores unless gated */
      if (scoreResult.score <= 0 && !isGated) continue;

      /* Boost gated conditions */
      if (isGated && scoreResult.score > 0) {
        scoreResult.score = Math.min(1, scoreResult.score * 1.3);
      }

      /* Generate evidence */
      var evidence = generateEvidence(cond, tokens, scoreResult);

      results.push({
        name: cond.name,
        score: scoreResult.score,
        icd: cond.icd || "",
        icd_label: cond.icd_label || "",
        icd_status: cond.icd_status || "",
        route: cond.route,
        domain: cond._domain || "",
        urgent: cond.urgent || false,
        _scoreDetail: scoreResult,
        _evidence: evidence,
        _gateReason: gatedNames[cond.name] || null
      });
    }
  }

  /* ── STAGE 8: Apply exclusions ── */
  results = applyExclusions(results, tokens);

  /* ── Sort by score descending ── */
  results.sort(function(a, b) {
    /* Urgent conditions get priority if score is close */
    if (a.urgent && !b.urgent && a.score > 0.2) return -1;
    if (b.urgent && !a.urgent && b.score > 0.2) return 1;
    return b.score - a.score;
  });

  /* Store results */
  ENGINE_STATE.results = results;

  /* ── Convert to V.dxList format ── */
  V.dxList = results.slice(0, 8).map(function(r) {
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
      evidence: ev
    };
  });

  /* ── Problem foci (concurrent independent problems) ── */
  V.problemFoci = computeProblemFoci(V.dxList);

  /* ── STAGE 10: Alerts ── */
  V.alerts = computeAlerts(tokens);

  /* ── STAGE 11: Nudges ── */
  V.nudges = computeNudges(results, tokens);

  /* ── STAGE 12: Log ── */
  logEngineRun({
    tokens: tokens,
    routes: routes,
    results: results,
    alerts: V.alerts
  });

  /* Store in visit for persistence */
  V.engineLog = ENGINE_LOG.slice(-10);

  ENGINE_STATE.lastRun = new Date().toISOString();
}
