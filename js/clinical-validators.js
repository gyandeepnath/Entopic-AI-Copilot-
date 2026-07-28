/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL NUMERIC VALIDATION (DD finding M-5)           */
/*                                                                  */
/* The engine parseFloat's clinical numerics straight into scoring:  */
/* a fat-fingered IOP of 444, a C:D of 8, or an axis of 900 used to  */
/* flow silently into the differential and the record. This adds a   */
/* PLAUSIBILITY check at the boundary.                              */
/*                                                                  */
/* IMPORTANT — this is advisory, never blocking. A real IOP of 60 is */
/* valid and must not be stopped; only physically impossible or      */
/* almost-certainly-mistyped values are flagged, and even then the   */
/* clinician may keep the value. That preserves the human-in-the-    */
/* loop principle: warn, do not override.                           */
/*                                                                  */
/* The bounds below are PHYSICAL / DEFINITIONAL, not diagnostic:      */
/*   • an axis is 0–180 by definition;                              */
/*   • a cup:disc ratio is 0–1 by definition;                       */
/*   • IOP, CCT, dioptric power etc. have physiological envelopes    */
/*     no living eye exceeds.                                       */
/* They carry no sensitivity/specificity or threshold-for-diagnosis  */
/* meaning, which makes them far safer to assert than the KB's       */
/* clinical values — but they are still clinical judgement, so the    */
/* set is flagged for the founder to confirm.                        */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — plausibility envelopes, founder to      */
/* confirm the exact numbers for the local population.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLIN_VALIDATION_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Each rule: { label, unit, hardMin/hardMax (physically impossible outside),
   softMin/softMax (rare — likely a typo, still allowed), path getter(s). }
   `hard` produces an error-level warning, `soft` an advisory one. */
var CLIN_RANGES = {
  iop:    { label: "IOP",            unit: "mmHg", hardMin: 0,    hardMax: 90,  softMin: 3,   softMax: 60 },
  cct:    { label: "Central corneal thickness", unit: "µm", hardMin: 200, hardMax: 900, softMin: 400, softMax: 700 },
  cd:     { label: "Cup:disc ratio", unit: "",     hardMin: 0,    hardMax: 1,   softMin: 0,   softMax: 0.95 },
  sphere: { label: "Sphere",         unit: "D",     hardMin: -40,  hardMax: 40,  softMin: -25, softMax: 20 },
  cyl:    { label: "Cylinder",       unit: "D",     hardMin: -20,  hardMax: 20,  softMin: -12, softMax: 12 },
  axis:   { label: "Axis",           unit: "°",     hardMin: 0,    hardMax: 180, softMin: 0,   softMax: 180 },
  add:    { label: "Add",            unit: "D",     hardMin: 0,    hardMax: 5,   softMin: 0.5, softMax: 4 },
  rnfl:   { label: "OCT RNFL",       unit: "µm",    hardMin: 20,   hardMax: 250, softMin: 40,  softMax: 140 },
  vf_md:  { label: "Visual field MD", unit: "dB",   hardMin: -40,  hardMax: 10,  softMin: -35, softMax: 5 },
  age:    { label: "Age",            unit: "yr",    hardMin: 0,    hardMax: 130, softMin: 0,   softMax: 120 }
};

/* Validate one numeric against its rule. Returns null (fine / blank), or
   { level:"error"|"warn", field, value, message }. A blank or non-numeric
   field is NOT flagged — that is "not recorded", not "wrong". */
function clinCheck(ruleKey, rawValue, whichEye) {
  var rule = CLIN_RANGES[ruleKey];
  if (!rule) return null;
  if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return null;
  var v = parseFloat(rawValue);
  if (isNaN(v)) return null;   /* free-text like "CF" / "HM" is not a numeric error */

  var where = whichEye ? (" (" + whichEye.toUpperCase() + ")") : "";
  var val = v + (rule.unit ? " " + rule.unit : "");
  if (v < rule.hardMin || v > rule.hardMax) {
    return { level: "error", field: ruleKey, value: v,
      message: rule.label + where + " " + val + " is outside the possible range (" +
        rule.hardMin + "–" + rule.hardMax + (rule.unit ? " " + rule.unit : "") + ") — check the entry." };
  }
  if (v < rule.softMin || v > rule.softMax) {
    return { level: "warn", field: ruleKey, value: v,
      message: rule.label + where + " " + val + " is unusually " + (v < rule.softMin ? "low" : "high") +
        " — confirm it is not a typo." };
  }
  return null;
}

/* Walk a visit + patient and collect all plausibility issues. Pure — reads
   V/P, never mutates. Deduplicated and ordered errors-first. */
function clinValidateVisit(V, P) {
  var out = [];
  var push = function (r) { if (r) out.push(r); };

  if (P) push(clinCheck("age", P.age));

  if (V && V.iop) {
    push(clinCheck("iop", V.iop.od, "od"));
    push(clinCheck("iop", V.iop.os, "os"));
    push(clinCheck("cct", V.iop.od_cct, "od"));
    push(clinCheck("cct", V.iop.os_cct, "os"));
  }
  if (V && V.fun) {
    if (V.fun.od) push(clinCheck("cd", V.fun.od.cd_v, "od"));
    if (V.fun.os) push(clinCheck("cd", V.fun.os.cd_v, "os"));
  }
  if (V && V.rx) {
    push(clinCheck("sphere", V.rx.od_sph, "od")); push(clinCheck("sphere", V.rx.os_sph, "os"));
    push(clinCheck("cyl", V.rx.od_cyl, "od"));    push(clinCheck("cyl", V.rx.os_cyl, "os"));
    push(clinCheck("axis", V.rx.od_ax, "od"));    push(clinCheck("axis", V.rx.os_ax, "os"));
    push(clinCheck("add", V.rx.od_add, "od"));    push(clinCheck("add", V.rx.os_add, "os"));
  }
  if (V && V.inv) {
    push(clinCheck("rnfl", V.inv.oct_rnfl_od, "od")); push(clinCheck("rnfl", V.inv.oct_rnfl_os, "os"));
    push(clinCheck("vf_md", V.inv.vf_md_od, "od"));   push(clinCheck("vf_md", V.inv.vf_md_os, "os"));
  }

  out.sort(function (a, b) { return (a.level === "error" ? 0 : 1) - (b.level === "error" ? 0 : 1); });
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { CLIN_RANGES: CLIN_RANGES, clinCheck: clinCheck, clinValidateVisit: clinValidateVisit };
}
