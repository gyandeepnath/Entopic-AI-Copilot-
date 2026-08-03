/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DETERMINISTIC REPLAY  (Phase 4)                       */
/*                                                                  */
/* ── THE QUESTION THIS ANSWERS ──                                 */
/*                                                                  */
/* The knowledge base is designed to be updated. So a record read   */
/* six months later says "the engine ranked Anterior Uveitis        */
/* first" — and nobody can tell whether today's engine would still  */
/* say that, or why not. Without an answer, "glass box" is a claim  */
/* rather than a property, and no retrospective audit of a clinical */
/* decision is possible.                                            */
/*                                                                  */
/* Replay re-runs a stored visit and reports, precisely, what is    */
/* different now.                                                   */
/*                                                                  */
/* ── WHAT IT HONESTLY CANNOT DO ──                                */
/*                                                                  */
/* It CANNOT run the old knowledge base. Nothing on this device     */
/* keeps historical KB versions — only the version STRING is        */
/* recorded. Any claim to "replay against the KB that produced it"  */
/* would be false whenever that KB is gone, which is most of the    */
/* time.                                                            */
/*                                                                  */
/* So it does the reverse, and says so: it runs the OLD INPUTS      */
/* against TODAY'S knowledge, and every result is labelled with     */
/* both version strings. When they match, replay is a genuine       */
/* reproduction and any difference means the record is inconsistent */
/* with the engine — a real integrity finding. When they differ,    */
/* the output is drift, not history, and is labelled `drift`.       */
/*                                                                  */
/* ── TWO PASSES, BECAUSE DRIFT HAS TWO CAUSES ──                  */
/*                                                                  */
/*   PASS A — full replay. The stored visit's own data through the  */
/*            whole pipeline. Answers: what would this consultation */
/*            look like today?                                      */
/*                                                                  */
/*   PASS B — token replay. The tokens the visit RECORDED, fed back */
/*            in as the only input. Holds derivation fixed, so any  */
/*            difference is knowledge change alone.                 */
/*                                                                  */
/* A vs recorded tokens  → DERIVATION drift (engine code, or a      */
/*                         clinical threshold moved — see           */
/*                         knowledge/clinical-thresholds.js)        */
/* B vs recorded ranking → KNOWLEDGE drift (conditions changed)     */
/*                                                                  */
/* Separating them matters: "the differential changed" is not       */
/* actionable, but "the IOP threshold moved and that is why" is.    */
/*                                                                  */
/* ── HOW IT STAYS HONEST ──                                       */
/*                                                                  */
/* Both passes run THE REAL ENGINE. There is no second scoring      */
/* implementation here and there must never be: a replay that       */
/* disagreed with the engine would be worse than no replay, because */
/* a clinician would believe it. Pass B works by feeding recorded   */
/* tokens into a blank visit's `symptoms` — the engine's own token  */
/* entry point — rather than by giving the engine a back door.      */
/*                                                                  */
/* ── SIDE EFFECTS ──                                              */
/*                                                                  */
/* None that survive the call. Replay swaps the V/P globals, runs,  */
/* and restores them along with ENGINE_STATE, the run log and the   */
/* "what changed" history, in a finally. Nothing is saved.          */
/*                                                                  */
/* Load order: after engine.js and engine-diff.js.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Deep copy without structuredClone — the app supports old browsers and the
   visit is plain JSON by construction. */
function _replayClone(o) {
  try { return JSON.parse(JSON.stringify(o)); } catch (e) { return null; }
}

/* Run fn() with V and P swapped for the given visit/patient, then put
   everything back exactly as it was — including the engine's own state, its
   log, and the "what changed" ring, none of which should learn about a replay. */
function _replayIsolated(visitData, patientData, fn) {
  /* Assign through the global object rather than by bare name. The engine
     resolves V and P off the scope chain, and this file has to work in the
     browser (globals on window), in the Node test sandbox (globals on the VM
     context) and under plain require — where a bare assignment to an
     undeclared name throws in strict mode. */
  var G = (typeof globalThis !== "undefined") ? globalThis
        : (typeof window !== "undefined") ? window : this;
  var hadV = typeof V !== "undefined", hadP = typeof P !== "undefined";
  var savedV = hadV ? V : undefined;
  var savedP = hadP ? P : undefined;
  var savedState = (typeof ENGINE_STATE !== "undefined") ? {
    tokens: ENGINE_STATE.tokens, routes: ENGINE_STATE.routes,
    results: ENGINE_STATE.results, overlayResults: ENGINE_STATE.overlayResults,
    evidence: ENGINE_STATE.evidence, lastRun: ENGINE_STATE.lastRun,
    runCount: ENGINE_STATE.runCount
  } : null;
  var savedLogLen = (typeof ENGINE_LOG !== "undefined" && ENGINE_LOG) ? ENGINE_LOG.length : -1;
  /* .slice() matters: engineRecordRun PUSHES into this array, so keeping the
     reference would restore an array the replay had already mutated. */
  var savedRuns = (typeof ENGINE_RUNS !== "undefined") ? {
    key: ENGINE_RUNS.key, list: ENGINE_RUNS.list.slice(), lastDiff: ENGINE_RUNS.lastDiff
  } : null;

  try {
    G.V = visitData;
    G.P = patientData;
    return fn();
  } finally {
    G.V = savedV;
    G.P = savedP;
    if (savedState) {
      ENGINE_STATE.tokens = savedState.tokens;
      ENGINE_STATE.routes = savedState.routes;
      ENGINE_STATE.results = savedState.results;
      ENGINE_STATE.overlayResults = savedState.overlayResults;
      ENGINE_STATE.evidence = savedState.evidence;
      ENGINE_STATE.lastRun = savedState.lastRun;
      ENGINE_STATE.runCount = savedState.runCount;
    }
    if (savedLogLen >= 0 && typeof ENGINE_LOG !== "undefined" && ENGINE_LOG.length > savedLogLen) {
      ENGINE_LOG.length = savedLogLen;
    }
    if (savedRuns) {
      ENGINE_RUNS.key = savedRuns.key;
      ENGINE_RUNS.list = savedRuns.list;
      ENGINE_RUNS.lastDiff = savedRuns.lastDiff;
    }
  }
}

/* The ranked differential in one comparable shape, whatever produced it. */
function _replayRanking(dxList) {
  return (dxList || []).map(function (d, i) {
    return {
      n: d.n, prob: (typeof d.prob === "number") ? +d.prob.toFixed(4) : 0,
      rank: i + 1, urgent: !!d.urgent, overlay: !!d.overlay
    };
  });
}

/* The stored provenance recorded only the top 5. Compare like with like, or a
   condition that was always 6th reads as newly departed. */
function _replayTruncate(list, n) {
  return (list || []).slice(0, n);
}

/* ── PASS A: the whole visit through the whole pipeline ── */
function _replayFull(visitData, patientData) {
  return _replayIsolated(visitData, patientData, function () {
    runDiagnosticEngine();
    return {
      tokens: (typeof ENGINE_STATE !== "undefined" ? ENGINE_STATE.tokens : []).slice(),
      ranking: _replayRanking(V.dxList),
      alerts: (V.alerts || []).map(function (a) { return { m: a.m, l: a.l }; })
    };
  });
}

/* ── PASS B: recorded tokens only, derivation held fixed ──
   The tokens go in through V.symptoms, which is the engine's own first token
   source. Everything else is blank, so nothing else contributes. Alerts are
   NOT comparable from this pass — computeAlerts reads raw fields (IOP, Van
   Herick, RAPD) that a blank visit does not have — so they are not returned. */
function _replayFromTokens(tokens) {
  if (typeof blankVisit !== "function" || typeof blankPatient !== "function") return null;
  var bv = blankVisit();
  bv.symptoms = tokens.slice();
  var bp = blankPatient("replay", "REPLAY");
  return _replayIsolated(bv, bp, function () {
    runDiagnosticEngine();
    return { tokens: (ENGINE_STATE.tokens || []).slice(), ranking: _replayRanking(V.dxList) };
  });
}

function _setMinus(a, b) {
  var s = {}; (b || []).forEach(function (x) { s[x] = 1; });
  return (a || []).filter(function (x) { return !s[x]; });
}

function _rankDiff(before, after) {
  var bm = {}, am = {};
  before.forEach(function (r) { bm[r.n] = r; });
  after.forEach(function (r) { am[r.n] = r; });
  var entered = after.filter(function (r) { return !bm[r.n]; });
  var left = before.filter(function (r) { return !am[r.n]; });
  var moved = [];
  after.forEach(function (r) {
    var was = bm[r.n];
    if (was && was.rank !== r.rank) {
      moved.push({ n: r.n, from: was.rank, to: r.rank, urgent: r.urgent });
    }
  });
  return { entered: entered, left: left, moved: moved };
}


/* ═══════════════════════════════════════════════════════════════ */
/* THE PUBLIC CALL                                                  */
/* ═══════════════════════════════════════════════════════════════ */

/* `stored` is a visit wrapper from loadVisits(): { id, patient_id, date,
   status, data }. `patient` is optional; without it, age-derived tokens
   cannot be reproduced and the result says so rather than guessing. */
function replayVisit(stored, patient) {
  var d = (stored && stored.data) || stored;
  if (!d) return { available: false, reason: "No visit data." };
  if (typeof runDiagnosticEngine !== "function") {
    return { available: false, reason: "The diagnostic engine is not loaded." };
  }

  var pv = d.engine_provenance || null;
  var recordedTokens = Array.isArray(d.engine_tokens) ? d.engine_tokens.slice() : null;
  var recordedRanking = _replayRanking(d.dxList);
  var recordedAlerts = (d.alerts || []).map(function (a) { return { m: a.m, l: a.l }; });

  if (!recordedTokens && !recordedRanking.length) {
    return {
      available: false,
      reason: "This visit predates token recording, so there is nothing to replay against. " +
              "Visits saved from v1.5.0 onward carry the tokens the engine actually saw."
    };
  }

  var nowVersion = (typeof KB_META !== "undefined" && KB_META.version) ? KB_META.version : "unknown";
  var thenVersion = (pv && pv.kb_version) ? pv.kb_version : "unknown";

  var visitCopy = _replayClone(d);
  var patientCopy = patient ? _replayClone(patient) : (typeof blankPatient === "function"
    ? blankPatient(d.patient_id || "unknown", "") : null);

  var full = null, byTokens = null, err = "";
  try { full = _replayFull(visitCopy, patientCopy); } catch (e) { err = String(e && e.message || e); }
  if (recordedTokens && recordedTokens.length) {
    try { byTokens = _replayFromTokens(recordedTokens); } catch (e) { /* pass B is optional */ }
  }
  if (!full) return { available: false, reason: "Replay failed: " + (err || "unknown error") };

  /* DERIVATION drift — did the same visit data produce the same tokens? */
  var derivation = recordedTokens ? {
    comparable: true,
    added: _setMinus(full.tokens, recordedTokens),
    removed: _setMinus(recordedTokens, full.tokens)
  } : {
    comparable: false,
    reason: "This visit did not record its tokens, so derivation cannot be compared.",
    added: [], removed: []
  };

  /* KNOWLEDGE drift — same tokens, different knowledge? Compared against the
     recorded top-5 the clinician was shown, truncated to match. */
  var shownThen = (pv && Array.isArray(pv.shown_top) && pv.shown_top.length)
    ? pv.shown_top.map(function (s, i) {
        return { n: s.name, prob: s.prob, rank: i + 1, urgent: !!s.urgent, overlay: false };
      })
    : _replayTruncate(recordedRanking, 5);

  var knowledge = byTokens
    ? _rankDiff(shownThen, _replayTruncate(byTokens.ranking, shownThen.length))
    : { entered: [], left: [], moved: [], comparable: false };
  knowledge.comparable = !!byTokens;

  /* END TO END — what a reader of this record would actually see differently. */
  var endToEnd = _rankDiff(shownThen, _replayTruncate(full.ranking, shownThen.length));

  var alertsNow = full.alerts.map(function (a) { return a.m; });
  var alertsThen = recordedAlerts.map(function (a) { return a.m; });
  var alertsGained = full.alerts.filter(function (a) { return alertsThen.indexOf(a.m) < 0; });
  var alertsLost = recordedAlerts.filter(function (a) { return alertsNow.indexOf(a.m) < 0; });

  var derivationChanged = !!(derivation.added.length || derivation.removed.length);
  var knowledgeChanged = !!(knowledge.entered.length || knowledge.left.length || knowledge.moved.length);
  var anythingChanged = !!(derivationChanged || knowledgeChanged ||
    endToEnd.entered.length || endToEnd.left.length || endToEnd.moved.length ||
    alertsGained.length || alertsLost.length);

  return {
    available: true,
    visit_id: stored && stored.id,
    date: String((stored && stored.date) || "").slice(0, 10),

    kb_then: thenVersion,
    kb_now: nowVersion,
    /* The distinction the header insists on: same version = reproduction,
       different version = drift. A caller must never present them alike. */
    same_kb: thenVersion !== "unknown" && thenVersion === nowVersion,

    recorded: {
      tokens: recordedTokens || [],
      token_count: recordedTokens ? recordedTokens.length : (pv ? pv.token_count : null),
      shown: shownThen,
      alerts: recordedAlerts,
      run_at: pv ? pv.run_at : null
    },
    now: {
      tokens: full.tokens,
      shown: _replayTruncate(full.ranking, Math.max(shownThen.length, 5)),
      alerts: full.alerts
    },
    from_recorded_tokens: byTokens ? {
      shown: _replayTruncate(byTokens.ranking, Math.max(shownThen.length, 5))
    } : null,

    drift: {
      any: anythingChanged,
      derivation: derivation,
      derivation_changed: derivationChanged,
      knowledge: knowledge,
      knowledge_changed: knowledgeChanged,
      end_to_end: endToEnd,
      alerts_gained: alertsGained,
      alerts_lost: alertsLost
    },

    /* True only when the record reproduces exactly against the SAME KB. That
       is the integrity claim; anything else is drift and must not be dressed
       up as one. */
    faithful: !anythingChanged && thenVersion !== "unknown" && thenVersion === nowVersion
  };
}


/* Plain sentences. Safety-relevant first, and never phrased as a clinical
   recommendation — this describes software behaviour, not a patient. */
function replayNarrate(r) {
  if (!r || !r.available) return [{ level: "info", text: (r && r.reason) || "Replay unavailable." }];
  var out = [];

  if (r.faithful) {
    out.push({ level: "ok", text: "Reproduced exactly. Today's engine and knowledge base (" +
      r.kb_now + ") give this visit the same differential and the same alerts it was given at the time." });
    return out;
  }

  if (!r.same_kb) {
    out.push({ level: "info", text: "Knowledge base has changed since this visit: " +
      r.kb_then + " → " + r.kb_now + ". What follows is how today's knowledge reads the same " +
      "findings — it is not what the clinician saw." });
  } else if (r.drift.any) {
    out.push({ level: "warn", text: "The knowledge base version is unchanged (" + r.kb_now +
      ") but the result is not identical. Either the engine's own rules changed, or this record " +
      "is inconsistent with them." });
  }

  /* An alert that would no longer fire is the single most important line. */
  r.drift.alerts_lost.forEach(function (a) {
    out.push({ level: a.l === "urgent" ? "urgent" : "warn",
      text: "Would NO LONGER raise: " + a.m });
  });
  r.drift.alerts_gained.forEach(function (a) {
    out.push({ level: a.l === "urgent" ? "urgent" : "warn",
      text: "Would NOW raise: " + a.m });
  });

  var dv = r.drift.derivation;
  if (dv.comparable && (dv.added.length || dv.removed.length)) {
    var bits = [];
    if (dv.added.length) bits.push("now also derives " + dv.added.slice(0, 5).join(", "));
    if (dv.removed.length) bits.push("no longer derives " + dv.removed.slice(0, 5).join(", "));
    out.push({ level: "warn", text: "The same recorded findings produce different tokens: " +
      bits.join("; ") + ". That is a change in the engine's derivation rules or a clinical " +
      "threshold, not in the knowledge base." });
  }

  var kn = r.drift.knowledge;
  if (kn.comparable && (kn.entered.length || kn.left.length || kn.moved.length)) {
    kn.entered.forEach(function (e) {
      out.push({ level: e.urgent ? "warn" : "info",
        text: "Knowledge change: " + e.n + " would now appear at " + e.rank +
              (e.urgent ? " (urgent)" : "") });
    });
    kn.left.forEach(function (l) {
      out.push({ level: l.urgent ? "warn" : "info",
        text: "Knowledge change: " + l.n + " would no longer appear (was " + l.rank + ")" +
              (l.urgent ? " — it was marked urgent" : "") });
    });
    kn.moved.forEach(function (m) {
      out.push({ level: "info",
        text: "Knowledge change: " + m.n + " " + m.from + " → " + m.to });
    });
  }

  if (out.length <= 1) {
    out.push({ level: "info", text: "The ranked differential is unchanged." });
  }
  return out;
}


/* Replay a run of visits — the question "did this KB update change anything
   for my patients?", which is otherwise unanswerable. Bounded, because a
   clinic with thousands of visits must not stall the page. */
var REPLAY_MAX_VISITS = 100;

function replayRecent(opts) {
  opts = opts || {};
  if (typeof loadVisits !== "function") {
    return { available: false, reason: "Past visits are unavailable." };
  }
  var limit = opts.limit || REPLAY_MAX_VISITS;
  var visits = loadVisits()
    .filter(function (v) { return v && v.status === "completed"; })
    .sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
  var total = visits.length;
  visits = visits.slice(0, limit);

  var patients = (typeof loadPatients === "function") ? loadPatients() : [];
  var byId = {};
  patients.forEach(function (p) { byId[p.id] = p; });

  var rows = [], drifted = 0, alertsLost = 0, notReplayable = 0;
  visits.forEach(function (v) {
    var r;
    try { r = replayVisit(v, byId[v.patient_id]); } catch (e) { r = { available: false, reason: String(e) }; }
    if (!r.available) { notReplayable++; return; }
    if (r.drift.any) drifted++;
    alertsLost += r.drift.alerts_lost.length;
    rows.push({
      visit_id: v.id, patient_id: v.patient_id, date: r.date,
      drifted: r.drift.any, faithful: r.faithful,
      alerts_lost: r.drift.alerts_lost.length,
      alerts_gained: r.drift.alerts_gained.length,
      derivation_changed: r.drift.derivation_changed,
      knowledge_changed: r.drift.knowledge_changed
    });
  });

  return {
    available: true,
    examined: visits.length, total: total, capped: total > visits.length,
    not_replayable: notReplayable,
    drifted: drifted,
    alerts_lost_total: alertsLost,
    rows: rows
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    REPLAY_MAX_VISITS: REPLAY_MAX_VISITS,
    replayVisit: replayVisit,
    replayNarrate: replayNarrate,
    replayRecent: replayRecent
  };
}
