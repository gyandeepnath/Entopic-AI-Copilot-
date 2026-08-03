/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — OVERLAY IMPACT PREVIEW  (design doc stage 3)          */
/*                                                                  */
/* "Run this against your last 200 visits: it would have appeared   */
/*  in 34 differentials, and in 6 of those it would have ranked      */
/*  above the condition you actually diagnosed."                     */
/*                                                                  */
/* This is the safety feature of the whole authoring flow. Wiring    */
/* a condition is abstract; being shown what it would have done to   */
/* your own past consultations is evidence. It is also the impact    */
/* preview recorded as missing in the Knowledge Debt Register        */
/* (KD-12): nothing else in Entopic can tell an author the blast     */
/* radius of a knowledge change.                                     */
/*                                                                  */
/* ── WHAT IT DOES NOT DO ──                                        */
/*                                                                  */
/* It reports counts and lists visits. It does NOT say the           */
/* condition is good, bad, over-triggering or safe. "This fired 34   */
/* times" is a fact; "this fires too often" is a clinical judgement  */
/* and belongs to the clinician looking at the 34.                   */
/*                                                                  */
/* ── COST ──                                                       */
/*                                                                  */
/* Scoring one condition against one visit's tokens is the same      */
/* work the engine does 394 times in 0.7 ms. Over 200 visits that    */
/* is ~200 scoreCondition calls — well under a frame. It is capped   */
/* anyway, because a clinic with 3,000 visits should not stall the   */
/* UI to answer a preview question.                                  */
/*                                                                  */
/* Load order: after engine.js (needs scoreCondition + collectTokens */
/* semantics) and kb-overlay.js.                                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var IMPACT_MAX_VISITS = 200;

/* The tokens a stored visit produced.

   Preferring the RECORDED tokens matters: re-deriving them today would use
   today's knowledge and today's token maps, so the answer would drift as the
   KB changes and would not describe what actually happened at that visit.
   Only fall back to re-deriving when a visit predates token recording. */
function impactTokensOf(storedVisit) {
  var d = (storedVisit && storedVisit.data) || storedVisit || {};
  if (Array.isArray(d.engine_tokens) && d.engine_tokens.length) return d.engine_tokens.slice();

  /* Fallback: the visit was saved before tokens were recorded. Reconstruct the
     directly-observable ones only — symptoms and findings — rather than
     running the full derivation, which would import today's rules into a
     historical answer. */
  var toks = [];
  (d.symptoms || []).forEach(function (t) { toks.push(t); });
  ["sl", "fun"].forEach(function (sec) {
    var f = d[sec] && d[sec].findings;
    if (!Array.isArray(f)) return;
    f.forEach(function (x) {
      var label = (x && x.label) || x;
      if (!label) return;
      if (typeof FINDING_TOKEN_MAP !== "undefined" && FINDING_TOKEN_MAP[label]) {
        var m = FINDING_TOKEN_MAP[label];
        (Array.isArray(m) ? m : [m]).forEach(function (t) { toks.push(t); });
      }
    });
  });
  return toks;
}

/* What the clinician actually concluded at that visit, if anything.
   The engine's own top result is NOT the answer — that is what the engine
   thought, not what the clinician decided. Prefer a recorded diagnosis. */
function impactActualDx(storedVisit) {
  var d = (storedVisit && storedVisit.data) || storedVisit || {};
  if (d.final_dx) return String(d.final_dx);
  if (d.plan && d.plan.diagnosis) return String(d.plan.diagnosis);
  if (Array.isArray(d.dxList) && d.dxList.length) {
    return String(d.dxList[0].n || "");   /* engine's leader — weaker evidence */
  }
  return "";
}

function impactActualDxIsClinicianRecorded(storedVisit) {
  var d = (storedVisit && storedVisit.data) || storedVisit || {};
  return !!(d.final_dx || (d.plan && d.plan.diagnosis));
}

/* Run a draft condition against this clinician's own past visits.

   `draft` is an overlay-shaped condition (name, req, sup, con, temporal,
   tests). Nothing is saved and nothing is changed. */
function overlayImpact(draft, opts) {
  opts = opts || {};
  var limit = opts.limit || IMPACT_MAX_VISITS;

  if (typeof loadVisits !== "function" || typeof scoreCondition !== "function") {
    return { available: false, reason: "Past visits or the scoring engine are unavailable." };
  }

  var cond = {
    name: draft.name || "(unnamed)",
    req: draft.req || [], sup: draft.sup || [], con: draft.con || [],
    temporal: draft.temporal || [], tests: draft.tests || [],
    exclusions: [], route: draft.route || "surface", urgent: !!draft.urgent
  };
  if (!cond.req.length) {
    return { available: false, reason: "Add a required finding first — without one it can never fire." };
  }

  var visits = loadVisits().filter(function (v) {
    return v && v.status === "completed";
  }).sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });

  var total = visits.length;
  visits = visits.slice(0, limit);

  var fired = [];
  var outranked = [];
  var FIRE_FLOOR = 0.15;

  for (var i = 0; i < visits.length; i++) {
    var w = visits[i];
    var tokens = impactTokensOf(w);
    if (!tokens.length) continue;

    var res;
    try { res = scoreCondition(cond, tokens, new Set(tokens)); } catch (e) { continue; }
    if (!res || res.score < FIRE_FLOOR) continue;

    var actual = impactActualDx(w);
    var d = w.data || w;
    var actualScore = null;
    if (Array.isArray(d.dxList)) {
      for (var j = 0; j < d.dxList.length; j++) {
        if (d.dxList[j].n === actual) { actualScore = d.dxList[j].prob; break; }
      }
    }

    var entry = {
      visit_id: w.id,
      date: String(w.date || "").slice(0, 10),
      patient_id: w.patient_id,
      score: res.score,
      actual_dx: actual,
      actual_score: actualScore,
      actual_is_recorded: impactActualDxIsClinicianRecorded(w)
    };
    fired.push(entry);
    if (actualScore !== null && res.score > actualScore) outranked.push(entry);
  }

  return {
    available: true,
    visits_examined: visits.length,
    visits_total: total,
    capped: total > visits.length,
    fired_count: fired.length,
    outranked_count: outranked.length,
    fired: fired.sort(function (a, b) { return b.score - a.score; }),
    outranked: outranked.sort(function (a, b) { return b.score - a.score; })
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    IMPACT_MAX_VISITS: IMPACT_MAX_VISITS,
    impactTokensOf: impactTokensOf,
    impactActualDx: impactActualDx,
    overlayImpact: overlayImpact
  };
}
