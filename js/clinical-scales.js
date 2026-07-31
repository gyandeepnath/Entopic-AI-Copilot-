/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL SCALE EVALUATOR                              */
/*                                                                  */
/* A generic evaluator over knowledge/clinical-scales.js. It holds  */
/* NO clinical constants of its own — every threshold, factor and   */
/* risk figure comes from the data file, which carries the citation */
/* the number was transcribed from.                                 */
/*                                                                  */
/* Adding a published scale should mean adding DATA, never adding   */
/* scoring code. If a new scale cannot be expressed in the data     */
/* shape, that is a signal to extend this evaluator deliberately —  */
/* not to hand-write a second scoring function beside it (which is  */
/* how four download helpers and one fabricated risk calculator got */
/* into this repo).                                                 */
/*                                                                  */
/* THE SAFETY RULE THIS FILE ENFORCES                               */
/*                                                                  */
/* A required input that has not been recorded is NOT "absent".     */
/* scaleEvaluate() refuses to return a risk until every required    */
/* input has an explicit yes/no from the clinician, and names what  */
/* is missing. Treating unrecorded as normal is how a patient at    */
/* 50% risk gets shown 0.5% — the same defect class as a            */
/* prescription printing "plano" for an eye that was never          */
/* refracted (RX-1).                                                */
/*                                                                  */
/* Answers live in V.scales[scaleId] = { od: {...}, os: {...} }     */
/* where each value is true (present), false (absent), or undefined */
/* (not yet answered). Findings only ever SUGGEST an answer; the    */
/* clinician's explicit response is what scores.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var SCALE_EYES = ["od", "os"];


/* ── Lookup ──────────────────────────────────────────────────── */

function scaleById(id) {
  if (typeof CLINICAL_SCALES === "undefined") return null;
  for (var i = 0; i < CLINICAL_SCALES.length; i++) {
    if (CLINICAL_SCALES[i].id === id) return CLINICAL_SCALES[i];
  }
  return null;
}

function scaleInputById(scale, inputId) {
  var list = (scale && scale.inputs) || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === inputId) return list[i];
  return null;
}


/* ── Suggestions from recorded findings ──────────────────────────
   Reads the visit's fundus findings and reports what they IMPLY for
   each input, per eye. A suggestion is a starting point for the
   clinician, never an answer:

     "present"       a finding positively indicating this is recorded
     "not_suggested" no such finding recorded — which means only that:
                     absence of a record, not a record of absence.

   Findings carry laterality (CL-2): {label, eye} with eye OD/OS/OU.
   Older visits stored a bare string; those are treated as OU so that
   historical records still surface a suggestion rather than vanish. */

function scaleSuggestions(scale, visit) {
  var out = {};
  var findings = (visit && visit.fun && visit.fun.findings) || [];

  function hasFinding(label, eye) {
    for (var i = 0; i < findings.length; i++) {
      var f = findings[i];
      var fLabel = (f && f.label) ? f.label : f;
      if (fLabel !== label) continue;
      var fEye = (f && f.eye) ? String(f.eye).toLowerCase() : "ou";
      if (fEye === "ou" || fEye === eye) return true;
    }
    return false;
  }

  var inputs = (scale && scale.inputs) || [];
  for (var e = 0; e < SCALE_EYES.length; e++) {
    var eye = SCALE_EYES[e];
    out[eye] = {};
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      var labels = inp.suggest_present || [];
      var found = false;
      for (var L = 0; L < labels.length; L++) {
        if (hasFinding(labels[L], eye)) { found = true; break; }
      }
      out[eye][inp.id] = found ? "present" : "not_suggested";
    }
  }
  return out;
}


/* ── Answers ─────────────────────────────────────────────────── */

function scaleAnswers(visit, scaleId) {
  if (!visit) return { od: {}, os: {} };
  visit.scales = visit.scales || {};
  var a = visit.scales[scaleId] || {};
  return { od: a.od || {}, os: a.os || {} };
}

/* value must be true, false, or null/undefined to clear it. */
function scaleSetAnswer(visit, scaleId, eye, inputId, value) {
  if (!visit) return false;
  eye = String(eye || "").toLowerCase();
  if (SCALE_EYES.indexOf(eye) === -1) return false;
  visit.scales = visit.scales || {};
  visit.scales[scaleId] = visit.scales[scaleId] || {};
  visit.scales[scaleId][eye] = visit.scales[scaleId][eye] || {};
  if (value === null || value === undefined) delete visit.scales[scaleId][eye][inputId];
  else visit.scales[scaleId][eye][inputId] = !!value;
  return true;
}

/* Which required answers are still outstanding, in plain language. */
function scaleMissing(scale, answers) {
  var missing = [];
  var inputs = (scale && scale.inputs) || [];
  for (var e = 0; e < SCALE_EYES.length; e++) {
    var eye = SCALE_EYES[e];
    for (var i = 0; i < inputs.length; i++) {
      var inp = inputs[i];
      if (!inp.required) continue;
      var v = (answers[eye] || {})[inp.id];
      if (v !== true && v !== false) {
        missing.push({ eye: eye.toUpperCase(), input: inp.id, question: inp.question });
      }
    }
  }
  return missing;
}


/* ── Evaluation ──────────────────────────────────────────────────
   Returns one of three shapes, and NEVER a risk figure alongside an
   incomplete record:

     { status: "incomplete", missing: [...] }
     { status: "scored", score, risk_text, factors[], … }
     { status: "unavailable", reason }                                */

function scaleEvaluate(scaleId, visit) {
  var scale = scaleById(scaleId);
  if (!scale) return { status: "unavailable", reason: "Unknown scale: " + scaleId };

  var answers = scaleAnswers(visit, scaleId);
  var missing = scaleMissing(scale, answers);
  if (missing.length) {
    return {
      status: "incomplete",
      scale: scale,
      missing: missing,
      suggestions: scaleSuggestions(scale, visit)
    };
  }

  var perEye = (scale.scoring && scale.scoring.per_eye_factors) || [];
  var score = 0;
  var factors = [];

  for (var e = 0; e < SCALE_EYES.length; e++) {
    var eye = SCALE_EYES[e];
    for (var i = 0; i < perEye.length; i++) {
      var id = perEye[i];
      if (answers[eye][id] === true) {
        score++;
        var inp = scaleInputById(scale, id);
        factors.push(eye.toUpperCase() + ": " + ((inp && inp.question) || id) + " — present (+1)");
      }
    }
  }

  /* Special rules, evaluated only in the states their source describes. */
  var rules = (scale.scoring && scale.scoring.special_rules) || [];
  for (var r = 0; r < rules.length; r++) {
    var rule = rules[r];
    if (rule.id === "bilateral_intermediate_drusen") {
      var noLarge = answers.od.large_drusen === false && answers.os.large_drusen === false;
      var bothIntermediate = answers.od.intermediate_drusen === true &&
                             answers.os.intermediate_drusen === true;
      if (noLarge && bothIntermediate) {
        score += rule.add;
        factors.push("No large drusen either eye, intermediate drusen both eyes (+" + rule.add + ")");
      }
    }
  }

  var min = (scale.scoring && typeof scale.scoring.min === "number") ? scale.scoring.min : 0;
  var max = (scale.scoring && typeof scale.scoring.max === "number") ? scale.scoring.max : score;
  if (score < min) score = min;
  if (score > max) score = max;

  var band = null;
  for (var b = 0; b < (scale.bands || []).length; b++) {
    if (scale.bands[b].score === score) { band = scale.bands[b]; break; }
  }
  if (!band) {
    /* A score with no band means the data file is internally inconsistent.
       Refuse rather than improvise a figure. */
    return {
      status: "unavailable",
      scale: scale,
      reason: "Score " + score + " has no published risk band in " + scale.name +
              ". This is a data error — do not estimate."
    };
  }

  return {
    status: "scored",
    scale: scale,
    score: score,
    risk_text: band.risk_text,
    outcome: scale.outcome,
    factors: factors,
    provisional: scale.review_status !== "VERIFIED_BY_CLINICIAN",
    source: scale.source
  };
}


/* Scales relevant to this visit — used to decide whether to nudge at all.
   A scale offers itself when any of its suggest_present findings are
   recorded, so a routine exam with a clear macula is never interrupted. */
function scalesRelevant(visit) {
  if (typeof CLINICAL_SCALES === "undefined") return [];
  var out = [];
  for (var i = 0; i < CLINICAL_SCALES.length; i++) {
    var scale = CLINICAL_SCALES[i];
    var sugg = scaleSuggestions(scale, visit);
    var any = false;
    for (var e = 0; e < SCALE_EYES.length && !any; e++) {
      var byInput = sugg[SCALE_EYES[e]] || {};
      for (var k in byInput) {
        if (byInput.hasOwnProperty(k) && byInput[k] === "present") { any = true; break; }
      }
    }
    if (any) out.push(scale);
  }
  return out;
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM (browser only)                                              */
/*                                                                  */
/* One renderer for every scale, driven entirely by the data file.  */
/* Adding a scale must never mean adding markup.                   */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  /* Answer buttons. A suggestion from a recorded finding is shown as a hint
     on the control; it is never pre-selected, because a pre-selected answer
     is an answer the clinician did not give. */
  function _scaleAnswerCell(scaleId, eye, inputId, current, suggested) {
    function btn(val, label) {
      var on = (current === val);
      return '<button class="btn ' + (on ? 'btn-p' : 'btn-s') + '"' +
        ' style="font-size:.52rem;padding:2px 8px"' +
        ' onclick="scaleAnswer(\'' + scaleId + '\',\'' + eye + '\',\'' + inputId + '\',' + val + ')">' +
        label + '</button>';
    }
    var hint = (suggested === "present" && current === undefined)
      ? '<span style="font-size:.46rem;color:var(--sv)" title="A finding you recorded suggests this">· recorded finding suggests yes</span>'
      : '';
    return '<div style="display:flex;align-items:center;gap:4px">' +
      btn(true, "Yes") + btn(false, "No") + hint + '</div>';
  }

  function scaleCardHtml(scaleId) {
    var scale = scaleById(scaleId);
    if (!scale || typeof V === "undefined" || !V) return "";

    var res = scaleEvaluate(scaleId, V);
    var answers = scaleAnswers(V, scaleId);
    var sugg = scaleSuggestions(scale, V);
    /* escHtml directly, never a local fallback alias: a private copy that
       degrades to identity when the module is missing is exactly how R-1
       (stored XSS) happened. dom-escape.js loads first, so it is always here. */
    var e = escHtml;

    var h = '<div class="adv-sec">' + e(scale.name) + '</div>';
    h += '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:8px;background:var(--sn)">';

    h += '<div style="font-size:.54rem;color:var(--sl);margin-bottom:6px">' + e(scale.outcome) + '</div>';

    /* The questions, per eye. */
    for (var i = 0; i < scale.inputs.length; i++) {
      var inp = scale.inputs[i];
      h += '<div style="margin-bottom:6px">';
      h += '<div style="font-size:.56rem;font-weight:500">' + e(inp.question) + '</div>';
      if (inp.note) h += '<div style="font-size:.48rem;color:var(--sv)">' + e(inp.note) + '</div>';
      for (var k = 0; k < SCALE_EYES.length; k++) {
        var eye = SCALE_EYES[k];
        h += '<div style="display:flex;align-items:center;gap:8px;padding:2px 0">' +
          '<span style="font-size:.54rem;width:26px;color:var(--sl)">' + eye.toUpperCase() + '</span>' +
          _scaleAnswerCell(scaleId, eye, inp.id, answers[eye][inp.id], sugg[eye][inp.id]) +
          '</div>';
      }
      h += '</div>';
    }

    /* The result — or an explicit statement that there isn't one yet. */
    h += '<div style="border-top:1px solid var(--fg);margin-top:6px;padding-top:6px">';
    if (res.status === "scored") {
      h += '<div style="font-size:.62rem;font-weight:600">Score ' + res.score +
           ' · ' + e(res.risk_text) + '</div>';
      h += '<div style="font-size:.5rem;color:var(--sl);margin-bottom:4px">' + e(res.outcome) + '</div>';
      for (var f = 0; f < res.factors.length; f++) {
        h += '<div style="font-size:.48rem;color:var(--md)">' + e(res.factors[f]) + '</div>';
      }
      if (scale.advisory_note) {
        h += '<div style="font-size:.48rem;color:var(--sv);margin-top:4px">' + e(scale.advisory_note) + '</div>';
      }
    } else if (res.status === "incomplete") {
      h += '<div style="font-size:.54rem;color:var(--sv)">Not scored — ' + res.missing.length +
           ' answer' + (res.missing.length === 1 ? '' : 's') + ' outstanding. ' +
           'An unrecorded finding is not the same as a normal one, so no risk is shown.</div>';
    } else {
      h += '<div style="font-size:.54rem;color:var(--sv)">' + e(res.reason || "Unavailable") + '</div>';
    }
    h += '</div>';

    /* Provenance: the citation, always visible, plus the provisional stamp. */
    h += '<div style="font-size:.46rem;color:var(--sv);margin-top:6px;border-top:1px solid var(--fg);padding-top:4px">';
    if (scale.review_status !== "VERIFIED_BY_CLINICIAN") {
      h += '<div style="color:var(--md)">Provisional — not yet verified by a clinician in this build.</div>';
    }
    h += e(scale.source.citation) + ' · PMID ' + e(scale.source.pmid) + ' · doi:' + e(scale.source.doi);
    h += '<div>Advisory only — clinical correlation required.</div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  /* Record an answer and re-render. Answers are visit data, so they save and
     sync with the record like any other finding. */
  window.scaleAnswer = function (scaleId, eye, inputId, value) {
    if (typeof V === "undefined" || !V) return;
    var answers = scaleAnswers(V, scaleId);
    /* Tapping the selected answer again clears it — an answer must always be
       retractable, never sticky. */
    var current = answers[eye] && answers[eye][inputId];
    scaleSetAnswer(V, scaleId, eye, inputId, current === value ? null : value);
    if (typeof doSave === "function") doSave();
    if (typeof renderAdvisory === "function") renderAdvisory();
    if (typeof renderMain === "function") renderMain();
  };

  window.scaleCardHtml = scaleCardHtml;
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    scaleById: scaleById,
    scaleSuggestions: scaleSuggestions,
    scaleAnswers: scaleAnswers,
    scaleSetAnswer: scaleSetAnswer,
    scaleMissing: scaleMissing,
    scaleEvaluate: scaleEvaluate,
    scalesRelevant: scalesRelevant
  };
}
