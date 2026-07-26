/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — HOW A SIMULATED PATIENT PRESENTS                       */
/*                                                                  */
/* The engine runs one way: what a clinician RECORDS becomes tokens. */
/* To simulate a patient we need the other direction — given a token */
/* the case carries, put something on the chart that a clinician     */
/* would actually have written down.                                 */
/*                                                                  */
/* This matters pedagogically, not cosmetically. Before this file    */
/* the simulator handed the student the token itself: they clicked   */
/* "Examine" on IOP and were told "high IOP". That is the            */
/* CONCLUSION. A student has to see 34 mmHg and decide for           */
/* themselves that it is high — the interpretive step is the skill,  */
/* and handing over the answer skipped it entirely.                  */
/*                                                                  */
/* Three routes, each of which is already the app's own vocabulary   */
/* so nothing clinical is invented:                                  */
/*                                                                  */
/*   1. SYMPTOM  — the token IS a symptom chip (SYM_CATS). Tick it,  */
/*                 exactly as a patient volunteering it would.       */
/*   2. FINDING  — a slit-lamp / fundus finding label already maps   */
/*                 to it (FINDING_TOKEN_MAP). Record the label.      */
/*   3. MEASURED — the engine derives it from a NUMBER by a rule     */
/*                 written in js/engine.js. Write a number that      */
/*                 satisfies that exact rule.                        */
/*                                                                  */
/* Route 3 is the only one that produces a value not already written */
/* somewhere in the app, so every rule below cites the engine rule   */
/* it inverts, and `tests/simulation-presentation.test.js` asserts   */
/* that the REAL engine derives the token back from the value. That  */
/* is the anti-fabrication guarantee: these are not clinical numbers */
/* I chose, they are instances of thresholds the KB already asserts. */
/*                                                                  */
/* Values are drawn from a band rather than fixed, so a student      */
/* cannot learn "34 mmHg means angle closure" instead of the point.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function simRnd() { return Math.random(); }

/* A number in [lo, hi], rounded to `dp` decimals. */
function simBand(lo, hi, dp) {
  var v = lo + simRnd() * (hi - lo);
  return dp ? v.toFixed(dp) : String(Math.round(v));
}

/* Which eye(s) to put a sign in. Most conditions in the KB are not stated as
   unilateral or bilateral, so the simulator picks — and says which, because a
   student must read laterality off the chart like any other finding. */
function simEyes() {
  var r = simRnd();
  return r < 0.4 ? ["od"] : (r < 0.8 ? ["os"] : ["od", "os"]);
}


/* ── Route 3: MEASURED — inversions of the engine's own rules ────── */

/* Each entry: apply(V) writes the chart, and returns what was written so the
   student can be told what they found. `rule` cites the engine line inverted. */
var SIM_MEASURED = {

  /* engine.js — IOP: >21 high, >30 very high, 1..21 normal */
  high_iop: { rule: "IOP > 21", step: "iop", apply: function (V) {
    var a = simBand(23, 29), b = simBand(22, 28);
    V.iop.od = a; V.iop.os = b;
    return "IOP " + a + " / " + b + " mmHg (GAT)";
  }},
  very_high_iop: { rule: "IOP > 30", step: "iop", subsumes: ["high_iop"], apply: function (V) {
    var eyes = simEyes(), a = simBand(34, 54), b = simBand(14, 19);
    if (eyes.length === 2) { V.iop.od = a; V.iop.os = simBand(32, 48); }
    else if (eyes[0] === "od") { V.iop.od = a; V.iop.os = b; }
    else { V.iop.os = a; V.iop.od = b; }
    return "IOP " + V.iop.od + " / " + V.iop.os + " mmHg (GAT)";
  }},
  normal_iop: { rule: "0 < IOP <= 21", step: "iop", apply: function (V) {
    V.iop.od = simBand(12, 18); V.iop.os = simBand(12, 18);
    return "IOP " + V.iop.od + " / " + V.iop.os + " mmHg (GAT)";
  }},

  /* engine.js — CCT < 520 */
  thin_cornea: { rule: "CCT < 520", step: "iop", apply: function (V) {
    V.iop.od_cct = simBand(478, 514); V.iop.os_cct = simBand(478, 514);
    return "CCT " + V.iop.od_cct + " / " + V.iop.os_cct + " µm";
  }},

  /* engine.js — van Herick grade <= 2 */
  narrow_angle: { rule: "van Herick <= 2", step: "gonioscopy", apply: function (V) {
    var g = simRnd() < 0.5 ? "1" : "2";
    V.sl.od.vh = g; V.sl.os.vh = g;
    return "van Herick grade " + g + " both eyes";
  }},
  shallow_ac: { rule: "van Herick <= 2", step: "gonioscopy", apply: function (V) {
    var g = simRnd() < 0.5 ? "1" : "2";
    V.sl.od.vh = g; V.sl.os.vh = g;
    return "van Herick grade " + g + " both eyes";
  }},

  /* engine.js — C:D >= 0.6, and asymmetry > 0.2 */
  increased_cd: { rule: "C:D >= 0.6", step: "fundus", apply: function (V) {
    V.fun.od.cd_v = simBand(0.62, 0.85, 2); V.fun.os.cd_v = simBand(0.6, 0.8, 2);
    return "C:D " + V.fun.od.cd_v + " / " + V.fun.os.cd_v;
  }},
  cd_asymmetry: { rule: "|C:D od - os| > 0.2", step: "fundus", subsumes: ["increased_cd"], apply: function (V) {
    V.fun.od.cd_v = simBand(0.7, 0.85, 2);
    V.fun.os.cd_v = (parseFloat(V.fun.od.cd_v) - (0.25 + simRnd() * 0.15)).toFixed(2);
    return "C:D " + V.fun.od.cd_v + " / " + V.fun.os.cd_v + " (asymmetric)";
  }},

  /* engine.js — NRR text contains "thin" or "notch" */
  nrr_thinning: { rule: "NRR text: thin / notch", step: "fundus", apply: function (V) {
    var t = simRnd() < 0.5 ? "Inferior rim thinning" : "Superior notch";
    V.fun.od.nrr = t; return "Neuroretinal rim — " + t.toLowerCase();
  }},
  /* engine.js — disc text contains "pale" / "edema" */
  pale_disc: { rule: "disc text: pale", step: "fundus", apply: function (V) {
    V.fun.od.disc = "Pale"; return "Optic disc pale";
  }},
  disc_edema: { rule: "disc text: edema", step: "fundus", apply: function (V) {
    V.fun.od.disc = "Swollen with edema"; V.fun.os.disc = "Swollen with edema";
    return "Optic discs swollen — edema both eyes";
  }},

  /* engine.js — RAPD field not "None" */
  RAPD_positive: { rule: "pupil.rapd != None", step: "pupil", apply: function (V) {
    var side = simRnd() < 0.5 ? "OD" : "OS";
    V.pupil.rapd = side; V.pupil.rapd_grade = String(1 + Math.floor(simRnd() * 3));
    return "RAPD present " + side + " (grade " + V.pupil.rapd_grade + ")";
  }},

  /* engine.js — versions / ductions not "Full" */
  restricted_motility: { rule: "versions != Full", step: "motility", apply: function (V) {
    V.mot.versions = "Restricted"; V.mot.ductions = "Restricted";
    return "Ocular movements restricted";
  }},

  /* engine.js — refraction thresholds */
  myopia: { rule: "sphere < -0.50", step: "refraction", apply: function (V) {
    V.rx.od_sph = "-" + simBand(1, 6, 2); V.rx.os_sph = "-" + simBand(1, 6, 2);
    return "Subjective " + V.rx.od_sph + " / " + V.rx.os_sph + " DS";
  }},
  hyperopia: { rule: "sphere > +0.75", step: "refraction", apply: function (V) {
    V.rx.od_sph = "+" + simBand(1, 4, 2); V.rx.os_sph = "+" + simBand(1, 4, 2);
    return "Subjective " + V.rx.od_sph + " / " + V.rx.os_sph + " DS";
  }},
  astigmatism: { rule: "|cylinder| >= 0.75", step: "refraction", apply: function (V) {
    V.rx.od_cyl = "-" + simBand(1, 3.5, 2); V.rx.od_ax = simBand(1, 180);
    V.rx.os_cyl = "-" + simBand(1, 3.5, 2); V.rx.os_ax = simBand(1, 180);
    return "Cyl " + V.rx.od_cyl + " x " + V.rx.od_ax + " / " + V.rx.os_cyl + " x " + V.rx.os_ax;
  }},
  unequal_refractive_error: { rule: "|sph od - os| >= 1.00", step: "refraction", apply: function (V) {
    V.rx.od_sph = "-" + simBand(0.5, 1.5, 2);
    V.rx.os_sph = "-" + (parseFloat(V.rx.od_sph.slice(1)) + 1.5 + simRnd() * 2).toFixed(2);
    return "Subjective -" + V.rx.od_sph.slice(1) + " / " + V.rx.os_sph + " DS (anisometropic)";
  }},

  /* engine.js — TBUT < 10 s, Schirmer < 10 mm */
  TBUT_reduced: { rule: "TBUT < 10 s", step: "slit_lamp", subsumes: ["tear_film_instability", "dryness"], apply: function (V) {
    V.sl.od.but = simBand(2, 8); V.sl.os.but = simBand(2, 8);
    return "TBUT " + V.sl.od.but + " / " + V.sl.os.but + " s";
  }},
  tear_film_instability: { rule: "TBUT < 10 s", step: "slit_lamp", apply: function (V) {
    V.sl.od.but = simBand(2, 8); V.sl.os.but = simBand(2, 8);
    return "TBUT " + V.sl.od.but + " / " + V.sl.os.but + " s";
  }},
  schirmer_low: { rule: "Schirmer < 10 mm", step: "slit_lamp", apply: function (V) {
    V.sl.od.schirmer = simBand(1, 8); V.sl.os.schirmer = simBand(1, 8);
    return "Schirmer I " + V.sl.od.schirmer + " / " + V.sl.os.schirmer + " mm/5 min";
  }},

  /* engine.js — OCT RNFL < 80 µm, visual-field MD < -6 dB */
  RNFL_thinning: { rule: "OCT RNFL < 80 µm", step: "investigations", apply: function (V) {
    V.inv.oct_rnfl_od = simBand(58, 78); V.inv.oct_rnfl_os = simBand(58, 78);
    return "OCT RNFL " + V.inv.oct_rnfl_od + " / " + V.inv.oct_rnfl_os + " µm";
  }},
  visual_field_defect: { rule: "VF MD < -6 dB", step: "investigations", subsumes: ["field_defect"], apply: function (V) {
    V.inv.vf_md_od = "-" + simBand(7, 16, 2); V.inv.vf_md_os = "-" + simBand(7, 16, 2);
    return "VF MD " + V.inv.vf_md_od + " / " + V.inv.vf_md_os + " dB";
  }},
  field_defect: { rule: "VF MD < -3 dB", step: "investigations", apply: function (V) {
    V.inv.vf_md_od = "-" + simBand(4, 9, 2); V.inv.vf_md_os = "-" + simBand(4, 9, 2);
    return "VF MD " + V.inv.vf_md_od + " / " + V.inv.vf_md_os + " dB";
  }},

  /* engine.js — LOCS nuclear grade >= 2 */
  nuclear_sclerosis_grade_2: { rule: "LOCS NS >= 2", step: "slit_lamp", apply: function (V) {
    V.sl.od.ns = "2"; V.sl.os.ns = "2"; return "Nuclear sclerosis LOCS 2 both eyes";
  }},
  nuclear_sclerosis_grade_3: { rule: "LOCS NS >= 3", step: "slit_lamp", apply: function (V) {
    V.sl.od.ns = "3"; V.sl.os.ns = "3"; return "Nuclear sclerosis LOCS 3 both eyes";
  }},
  cortical_opacity: { rule: "LOCS cortical >= 2", step: "slit_lamp", apply: function (V) {
    V.sl.od.c = "3"; V.sl.os.c = "2"; return "Cortical spokes LOCS 3 / 2";
  }},
  psc_opacity: { rule: "LOCS PSC >= 2", step: "slit_lamp", apply: function (V) {
    V.sl.od.psc = "3"; V.sl.os.psc = "2"; return "Posterior subcapsular LOCS 3 / 2";
  }},

  /* engine.js — SUN cells / flare grading */
  cells_present: { rule: "SUN cells > 0", step: "slit_lamp", apply: function (V) {
    var g = ["1+", "2+", "3+"][Math.floor(simRnd() * 3)];
    V.sl.od.cells = g; return "AC cells " + g + " OD";
  }},
  flare_present: { rule: "SUN flare > 0", step: "slit_lamp", apply: function (V) {
    var g = ["1+", "2+"][Math.floor(simRnd() * 2)];
    V.sl.od.flare = g; return "AC flare " + g + " OD";
  }},

  /* ── Context, from where a clinician records it ── */
  family_history: { rule: "family history flags", step: "family_social", apply: function (V) {
    V.hxF.glaucoma = true; return "Family history — glaucoma";
  }},
  diabetes_history: { rule: "hxM.dm", step: "medical_history", apply: function (V) {
    V.hxM.dm = true; return "Systemic — diabetes";
  }},
  hypertension_history: { rule: "hxM.htn", step: "medical_history", apply: function (V) {
    V.hxM.htn = true; return "Systemic — hypertension";
  }},
  autoimmune_history: { rule: "hxM.autoimmune", step: "medical_history", apply: function (V) {
    V.hxM.autoimmune = true; return "Systemic — autoimmune disease";
  }},
  thyroid_history: { rule: "hxM.thyroid", step: "medical_history", apply: function (V) {
    V.hxM.thyroid = true; return "Systemic — thyroid disease";
  }},
  ms_history: { rule: "hxM.ms", step: "medical_history", apply: function (V) {
    V.hxM.ms = true; return "Systemic — multiple sclerosis";
  }},
  /* engine.js SOURCE 7 reads V.hxO.flags, not the free-text lens type. */
  contact_lens_use: { rule: "hxO.flags contains cl_*", step: "ocular_history", apply: function (V) {
    if (!V.hxO.flags) V.hxO.flags = [];
    if (V.hxO.flags.indexOf("cl_soft") < 0) V.hxO.flags.push("cl_soft");
    V.hxO.cl_type = "Soft monthly, daily wear";
    return "Contact lens wearer — soft monthly";
  }},
  trauma_history: { rule: "hxO.flags contains trauma", step: "ocular_history", apply: function (V) {
    if (!V.hxO.flags) V.hxO.flags = [];
    if (V.hxO.flags.indexOf("trauma") < 0) V.hxO.flags.push("trauma");
    return "Past ocular trauma";
  }},
  post_surgery: { rule: "hxO.flags contains surgery", step: "ocular_history", apply: function (V) {
    if (!V.hxO.flags) V.hxO.flags = [];
    if (V.hxO.flags.indexOf("surgery") < 0) V.hxO.flags.push("surgery");
    return "Previous intraocular surgery";
  }}
};

/* Tokens the patient's DEMOGRAPHICS already carry. simStart() writes the age
   onto the record before the student examines anything, so these are on the
   chart from the first screen — they need no presentation rule, and must not
   be counted as gaps. */
var SIM_FROM_DEMOGRAPHICS = {
  young_age: 1, older_age: 1, age_over_40: 1, age_related: 1
};


/* ── Route 2: FINDING — reverse of FINDING_TOKEN_MAP ─────────────── */

var _SIM_FINDING_REV = null;
function simFindingLabelFor(tok) {
  if (typeof FINDING_TOKEN_MAP === "undefined") return null;
  if (!_SIM_FINDING_REV) {
    _SIM_FINDING_REV = {};
    for (var label in FINDING_TOKEN_MAP) {
      if (!FINDING_TOKEN_MAP.hasOwnProperty(label)) continue;
      var list = FINDING_TOKEN_MAP[label];
      for (var i = 0; i < list.length; i++) {
        /* Prefer the label that maps to FEWEST tokens — the most specific way
           of recording this sign, rather than one that drags in others. */
        var cur = _SIM_FINDING_REV[list[i]];
        if (!cur || FINDING_TOKEN_MAP[cur].length > list.length) _SIM_FINDING_REV[list[i]] = label;
      }
    }
  }
  return _SIM_FINDING_REV[tok] || null;
}

/* Is this finding label a fundus one or a slit-lamp one? */
function simFindingIsFundus(label) {
  if (typeof FUN_FINDINGS === "undefined") return false;
  for (var sec in FUN_FINDINGS) {
    if (FUN_FINDINGS.hasOwnProperty(sec) && FUN_FINDINGS[sec].indexOf(label) >= 0) return true;
  }
  return false;
}


/* ── Route 1: SYMPTOM — the token is a chip the patient ticks ────── */

function simIsSymptomToken(tok) {
  if (typeof SYM_CATS === "undefined") return false;
  for (var cat in SYM_CATS) {
    if (SYM_CATS.hasOwnProperty(cat) && SYM_CATS[cat][tok]) return true;
  }
  return false;
}

function simSymptomLabel(tok) {
  if (typeof SYM_CATS !== "undefined") {
    for (var cat in SYM_CATS) {
      if (SYM_CATS.hasOwnProperty(cat) && SYM_CATS[cat][tok]) return SYM_CATS[cat][tok];
    }
  }
  return String(tok).replace(/_/g, " ");
}


/* ── The one entry point ─────────────────────────────────────────── */

/* Record this token on the chart the way a patient carrying it would present.
   Returns a short description of what was written, so the student can be shown
   the actual entry; "" when the finding is already on the chart and needs no
   second entry; and null when we have no faithful route — the caller then
   falls back to the old behaviour rather than inventing something. */
function simPresentToken(tok, step) {
  if (typeof V === "undefined" || !V) return null;

  /* Demographics are already on the record before the exam starts. */
  if (SIM_FROM_DEMOGRAPHICS[tok]) return "";

  /* 1. A measured value, inverted from the engine's own rule. */
  var m = SIM_MEASURED[tok];
  if (m) {
    /* One measurement often yields several tokens — a van Herick grade gives
       both narrow_angle and shallow_ac, a short TBUT gives three. Writing the
       second one would silently change the number the student has already been
       shown, so if the chart already implies this token, leave it alone. */
    if (typeof collectTokens === "function") {
      try { if (collectTokens().indexOf(tok) >= 0) return ""; } catch (e) {}
    }
    try { return m.apply(V); } catch (e) { return null; }
  }

  /* 2. A finding the clinician observes and records by label. */
  var label = simFindingLabelFor(tok);
  var wantsFinding = (step === "slit_lamp" || step === "fundus" || !simIsSymptomToken(tok));
  if (label && wantsFinding) {
    if (simFindingIsFundus(label)) {
      if (!V.fun.findings) V.fun.findings = [];
      if (V.fun.findings.indexOf(label) < 0) V.fun.findings.push(label);
    } else {
      if (!V.sl.findings) V.sl.findings = [];
      if (V.sl.findings.indexOf(label) < 0) V.sl.findings.push(label);
    }
    return label;
  }

  /* 3. A symptom the patient volunteers. */
  if (simIsSymptomToken(tok)) {
    if (!V.symptoms) V.symptoms = [];
    if (V.symptoms.indexOf(tok) < 0) V.symptoms.push(tok);
    return simSymptomLabel(tok);
  }

  /* 4. A finding label even if the step did not suggest one. */
  if (label) {
    if (!V.sl.findings) V.sl.findings = [];
    if (V.sl.findings.indexOf(label) < 0) V.sl.findings.push(label);
    return label;
  }

  return null;
}

/* Coverage report — used by the test suite and by the KB linter so a new
   condition cannot quietly introduce findings the simulator can only express
   as a raw token. */
function simPresentationCoverage(tokens) {
  var out = { measured: [], finding: [], symptom: [], demographic: [], none: [] };
  (tokens || []).forEach(function (t) {
    if (SIM_FROM_DEMOGRAPHICS[t]) out.demographic.push(t);
    else if (SIM_MEASURED[t]) out.measured.push(t);
    else if (simIsSymptomToken(t)) out.symptom.push(t);
    else if (simFindingLabelFor(t)) out.finding.push(t);
    else out.none.push(t);
  });
  return out;
}

/* Can this token be shown to a student as something on a chart at all?
   Used by case construction to keep PROCESS tokens out of a case's findings:
   the KB's `tests` arrays mix real results (RNFL_thinning, schirmer_low) with
   the NAME of the procedure (lid_position_exam, blink_exam, clinical_exam,
   CT_orbits_imaging). A procedure name is not a finding — revealing one as
   "you examined and found: clinical exam" is meaningless, and it inflated the
   apparent size of a case. Those belong to the next-test machinery instead. */
function simIsPresentable(tok) {
  return !!(SIM_FROM_DEMOGRAPHICS[tok] || SIM_MEASURED[tok] ||
            simIsSymptomToken(tok) || simFindingLabelFor(tok));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SIM_MEASURED: SIM_MEASURED };
}
