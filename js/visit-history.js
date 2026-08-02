/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — VISIT HISTORY: CARRY-FORWARD AND TRENDS               */
/*                                                                  */
/* Entopic was excellent at one patient, one encounter, one moment, */
/* and weak across TIME.                                            */
/*                                                                  */
/* ── A CORRECTION TO THE PHASE 2 REVIEW ──                         */
/* That review recorded HF-01 as "a follow-up starts blank". That   */
/* was WRONG. startFollowUpVisit() in js/ui-chart.js already        */
/* carried history forward — it deep-copied hxO, hxM, hxF and hxS   */
/* wholesale from the last completed visit.                         */
/*                                                                  */
/* The real problem was worse than the one I reported, and the      */
/* opposite shape: the copy was INVISIBLE AND UNCONFIRMED. Last     */
/* visit's history appeared as this visit's record with nothing to  */
/* say it had been copied, so a year-old medication list read as    */
/* today's. That is a documentation hazard, not a missing feature.  */
/*                                                                  */
/* This module replaces the blanket copy with a marked, per-field   */
/* one, so the clinician can see what was carried and confirm it.   */
/*                                                                  */
/*   Nothing could be seen over time. No IOP trend, no refraction    */
/*   trend, no C:D trend. Glaucoma, myopia control and AMD are       */
/*   managed by comparing today with last year, and none of that     */
/*   was possible.                                                   */
/*                                                                  */
/* ── THE SAFETY RULE FOR CARRY-FORWARD ──                          */
/*                                                                  */
/* Copying last visit's data into this visit is a documentation      */
/* hazard if done silently: it manufactures a record of an           */
/* examination that did not happen. So:                              */
/*                                                                  */
/*   1. ONLY history-type fields carry — past ocular history,        */
/*      systemic history, family history, habitual spectacle Rx.     */
/*      These are statements about the patient that remain true      */
/*      until changed.                                               */
/*                                                                  */
/*   2. NO EXAMINATION FINDING EVER CARRIES. Not VA, not IOP, not    */
/*      slit lamp, not fundus, not fields. Those are measurements    */
/*      taken today or not taken at all. This is the same rule that  */
/*      governs the "Normal" templates.                              */
/*                                                                  */
/*   3. Everything carried is marked in `V.carried` and shown as     */
/*      carried in the UI, and it does NOT count as assessed until   */
/*      the clinician confirms it.                                   */
/*                                                                  */
/* Load order: after storage.js (needs getPatientVisits).           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Fields that describe the patient rather than today's examination.
   Each entry is [section, field]. Reviewed against the safety rule above:
   nothing here is a measurement of the eye taken at a visit. */
var CARRY_FIELDS = [
  ["hxO", "conditions"], ["hxO", "surgeries"], ["hxO", "glasses_rx"],
  ["hxO", "cl_type"], ["hxO", "medications"], ["hxO", "last_exam"],
  ["hxM", "conditions"], ["hxM", "medications"], ["hxM", "allergies"],
  ["hxF", "details"],
  ["hxS", "smoking"], ["hxS", "vdu"], ["hxS", "occupation"]
];

/* Boolean history flags. Same reasoning: a patient who had diabetes last year
   still has it. */
var CARRY_FLAGS = [
  ["hxM", "dm"], ["hxM", "htn"], ["hxM", "autoimmune"], ["hxM", "thyroid"],
  ["hxM", "asthma"], ["hxM", "eczema"], ["hxM", "ra"], ["hxM", "sle"],
  ["hxM", "ms"], ["hxM", "migraine"],
  ["hxF", "glaucoma"], ["hxF", "amd"], ["hxF", "rd"], ["hxF", "strabismus"],
  ["hxF", "dm"], ["hxF", "keratoconus"], ["hxF", "myopia_high"]
];

/* Array-valued history. */
var CARRY_ARRAYS = [["hxO", "flags"], ["hxM", "drug_list"]];

/* Seed a new visit from the patient's last one.
   Returns a count of what was carried, so the UI can say so. */
function carryForward(visit, prev) {
  if (!visit || !prev) return 0;
  var n = 0;
  visit.carried = visit.carried || {};

  function mark(sec, field) {
    visit.carried[sec + "." + field] = true;
    n++;
  }

  CARRY_FIELDS.forEach(function (pair) {
    var sec = pair[0], f = pair[1];
    if (!visit[sec] || !prev[sec]) return;
    if (visit[sec][f]) return;                  /* never overwrite today's entry */
    if (!prev[sec][f]) return;
    visit[sec][f] = prev[sec][f];
    mark(sec, f);
  });

  CARRY_FLAGS.forEach(function (pair) {
    var sec = pair[0], f = pair[1];
    if (!visit[sec] || !prev[sec]) return;
    if (visit[sec][f]) return;
    if (prev[sec][f] !== true) return;
    visit[sec][f] = true;
    mark(sec, f);
  });

  CARRY_ARRAYS.forEach(function (pair) {
    var sec = pair[0], f = pair[1];
    if (!visit[sec] || !prev[sec]) return;
    if (visit[sec][f] && visit[sec][f].length) return;
    if (!Array.isArray(prev[sec][f]) || !prev[sec][f].length) return;
    visit[sec][f] = prev[sec][f].slice();
    mark(sec, f);
  });

  if (n) {
    visit.carried_from = prev.id || null;
    visit.carried_at = new Date().toISOString();
  }
  return n;
}

function isCarried(visit, section, field) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  return !!(v && v.carried && v.carried[section + "." + field]);
}

/* The clinician has looked at a carried value and accepted or changed it.
   Either way it stops being "carried" and becomes this visit's own record. */
function confirmCarried(section, field) {
  if (typeof V === "undefined" || !V || !V.carried) return;
  delete V.carried[section + "." + field];
}

function carriedCount(visit) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v || !v.carried) return 0;
  return Object.keys(v.carried).length;
}


/* ═══════════════════════════════════════════════════════════════ */
/* TRENDS                                                          */
/*                                                                  */
/* Read-only derivation over stored visits. No clinical             */
/* interpretation whatsoever: this returns the numbers that were    */
/* recorded, in date order, and nothing else. It does NOT say       */
/* whether a trend is worsening, does not compute a rate of         */
/* progression, and does not raise an alert — every one of those    */
/* would be a clinical claim requiring evidence this product does   */
/* not yet have.                                                    */
/* ═══════════════════════════════════════════════════════════════ */

/* What can be plotted. `get` pulls the value out of a stored visit wrapper.
   NOTE the wrapper: the visit date lives on the stored record, not on the
   visit data object. */
var TREND_METRICS = {
  iop_od:  { label: "IOP — right", unit: "mmHg", get: function (d) { return num(d.iop && d.iop.od); } },
  iop_os:  { label: "IOP — left",  unit: "mmHg", get: function (d) { return num(d.iop && d.iop.os); } },
  cd_od:   { label: "C:D ratio — right", unit: "", get: function (d) { return num(d.fun && d.fun.od && d.fun.od.cd_v); } },
  cd_os:   { label: "C:D ratio — left",  unit: "", get: function (d) { return num(d.fun && d.fun.os && d.fun.os.cd_v); } },
  md_od:   { label: "Visual field MD — right", unit: "dB", get: function (d) { return num(d.inv && d.inv.vf_md_od); } },
  md_os:   { label: "Visual field MD — left",  unit: "dB", get: function (d) { return num(d.inv && d.inv.vf_md_os); } },
  rnfl_od: { label: "RNFL — right", unit: "µm", get: function (d) { return num(d.inv && d.inv.oct_rnfl_od); } },
  rnfl_os: { label: "RNFL — left",  unit: "µm", get: function (d) { return num(d.inv && d.inv.oct_rnfl_os); } }
};

function num(x) {
  if (x === undefined || x === null || x === "") return null;
  var n = parseFloat(x);
  return isFinite(n) ? n : null;
}

/* Points for one metric, oldest first. Visits with no value are skipped
   rather than plotted as zero — a missing measurement is not a measurement
   of zero, and drawing it as one would be a fabricated data point. */
function trendSeries(patientId, metric) {
  var spec = TREND_METRICS[metric];
  if (!spec || typeof getPatientVisits !== "function") return [];
  var visits = getPatientVisits(patientId) || [];
  var out = [];
  for (var i = 0; i < visits.length; i++) {
    var w = visits[i];
    var d = w.data || w;
    var val = spec.get(d);
    if (val === null) continue;
    out.push({ date: w.date || "", value: val, visit_id: w.id || null });
  }
  return out.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
}

/* Every metric that has at least two points — i.e. everything there is
   actually a trend for. Two is the minimum that means anything. */
function trendsAvailable(patientId) {
  var out = [];
  for (var k in TREND_METRICS) {
    if (!Object.prototype.hasOwnProperty.call(TREND_METRICS, k)) continue;
    var s = trendSeries(patientId, k);
    if (s.length >= 2) out.push({ metric: k, label: TREND_METRICS[k].label,
                                  unit: TREND_METRICS[k].unit, points: s });
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CARRY_FIELDS: CARRY_FIELDS, CARRY_FLAGS: CARRY_FLAGS, CARRY_ARRAYS: CARRY_ARRAYS,
    TREND_METRICS: TREND_METRICS,
    carryForward: carryForward, isCarried: isCarried,
    confirmCarried: confirmCarried, carriedCount: carriedCount,
    trendSeries: trendSeries, trendsAvailable: trendsAvailable
  };
}
