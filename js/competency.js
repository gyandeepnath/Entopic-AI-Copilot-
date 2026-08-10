/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — COMPETENCY FRAMEWORK AND SUPERVISOR SIGN-OFF          */
/*                                                                  */
/* The two things that stood between Entopic and a university       */
/* department adopting it, from the Phase 2 review:                 */
/*                                                                  */
/*   1. No competency framework. A student could practise but       */
/*      nothing recorded WHAT they had become competent at, so no   */
/*      programme could use it for assessment.                      */
/*   2. No supervisor sign-off. A student's encounter had no        */
/*      record of who supervised it or whether it was accepted —    */
/*      the single thing an examining body asks for.                */
/*                                                                  */
/* ── WHY THIS SHIPS WITH AN EMPTY FRAMEWORK ──                     */
/*                                                                  */
/* I do not know the NCAHP optometry competency list, or any        */
/* particular university's curriculum, and I will not invent one.   */
/* A fabricated competency framework would be worse than none: a    */
/* programme would map its teaching to it, students would be        */
/* assessed against it, and none of it would correspond to the      */
/* standard they are actually accredited against.                   */
/*                                                                  */
/* So this ships as MACHINERY, not content. It defines what a       */
/* competency IS, how evidence attaches to one, and how a           */
/* supervisor signs it off. Faculty import their own framework —    */
/* their real one — and it becomes theirs.                          */
/*                                                                  */
/* A starter STRUCTURE is provided (domains and levels) because the */
/* shape of competency frameworks is genuinely conventional; the    */
/* CONTENT is not, and is left empty.                               */
/*                                                                  */
/* Load order: after storage.js. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var COMPETENCY_STORE = "competencies";     /* the framework, faculty-defined */
var COMPETENCY_LOG_STORE = "competency_log"; /* evidence + sign-offs */

/* Miller's pyramid — the conventional four levels of clinical competence.
   This IS standard across health-professions education and is not something
   I have invented; the labels below are descriptive, not a citation. Faculty
   can rename them. */
var COMPETENCY_LEVELS = [
  { id: "knows",      label: "Knows",         hint: "Can recall the relevant knowledge" },
  { id: "knows_how",  label: "Knows how",     hint: "Can describe how it is done" },
  { id: "shows_how",  label: "Shows how",     hint: "Can perform it under supervision" },
  { id: "does",       label: "Does",          hint: "Performs it independently in practice" }
];

/* Supervision levels for a signed encounter. */
var SUPERVISION_LEVELS = [
  { id: "observed",    label: "Observed only",            independent: false },
  { id: "assisted",    label: "Performed with help",      independent: false },
  { id: "supervised",  label: "Performed under supervision", independent: false },
  { id: "independent", label: "Performed independently",  independent: true }
];

/* ── STRUCTURED FEEDBACK DIMENSIONS ──

   A sign-off used to carry one free-text `supervisor_comment`, and a single
   box is how feedback becomes "Good" and "Needs improvement" — which tells a
   student nothing they can act on and, over a year, aggregates into nothing a
   department can see.

   These seven dimensions are ordinary health-professions education practice
   (they are the axes on which clinical performance is universally discussed),
   NOT an institutional standard I have invented. Nothing here sets a pass
   mark, a weighting or a progression rule: those ARE institutional, they
   differ by university, and Phase 10 deliberately leaves them to the
   department (see the human-decision register).

   `configurable` is the point: a department can replace this list wholesale
   via competencyFeedbackDimensionsSet() without touching code. */
var COMPETENCY_FEEDBACK_DEFAULT = [
  { id: "reasoning",     label: "Clinical reasoning",   hint: "Formed and tested a sensible differential" },
  { id: "examination",   label: "Examination technique", hint: "Performed the technique correctly and safely" },
  { id: "interpretation", label: "Interpretation",      hint: "Read the findings correctly" },
  { id: "management",    label: "Patient management",   hint: "Chose a defensible plan, including referral" },
  { id: "communication", label: "Communication",        hint: "Explained clearly to the patient" },
  { id: "documentation", label: "Documentation",        hint: "Recorded the encounter accurately" },
  { id: "professional",  label: "Professional behaviour", hint: "Consent, dignity, safety, boundaries" }
];

/* How a supervisor rates one dimension. Three points, deliberately: a five- or
   seven-point scale invites false precision on a judgement made in thirty
   seconds at the chair, and the middle of a long scale is where everything
   quietly collects. */
var COMPETENCY_FEEDBACK_RATINGS = [
  { id: "concern",    label: "Needs attention", rank: 1 },
  { id: "developing", label: "Developing",      rank: 2 },
  { id: "secure",     label: "Secure",          rank: 3 }
];

var COMPETENCY_FEEDBACK_STORE = "competency_feedback_dims";

/* ── SIMULATED ENCOUNTERS ──

   Entopic has two kinds of non-real encounter: a `practice` patient and a
   `sim` visit. Both are learning artifacts. A logbook that cannot tell them
   apart from a real patient is not merely untidy — it would let a student
   present simulated work to an examining body as clinical experience, which
   is a misrepresentation the software would have caused.

   So every claim records whether its encounter was simulated, the logbook
   labels each entry and counts the two separately, and the UI says which is
   which everywhere it shows a number.

   Whether simulated evidence may COUNT towards a competency is an
   institutional decision — some programmes accept simulation for specified
   competencies, others do not — so this does not decide it. It ships with the
   conservative default (does not count) because the failure modes are not
   symmetric: under-counting understates a student's progress and is visible
   and correctable, whereas over-counting produces a record asserting a
   competence nobody assessed on a real patient. A department turns it on. */
var COMPETENCY_SIM_STORE = "competency_sim_policy";

function competencySimulationCounts() {
  if (typeof loadStore !== "function") return false;
  return loadStore(COMPETENCY_SIM_STORE, false) === true;
}

function competencySimulationCountsSet(on) {
  if (typeof saveStore !== "function") return false;
  var ok = saveStore(COMPETENCY_SIM_STORE, !!on) !== false;
  if (ok && typeof logAudit === "function") {
    try {
      logAudit("competency_sim_policy",
        "Simulated encounters " + (on ? "now count" : "no longer count") +
        " towards competency progress", {});
    } catch (e) {}
  }
  return ok;
}

function competencyFeedbackDimensions() {
  if (typeof loadStore !== "function") return COMPETENCY_FEEDBACK_DEFAULT.slice();
  var d = loadStore(COMPETENCY_FEEDBACK_STORE, null);
  if (!Array.isArray(d) || !d.length) return COMPETENCY_FEEDBACK_DEFAULT.slice();
  return d;
}

/* A department replaces the axes entirely. Returns false rather than storing
   an empty list — a feedback form with no dimensions is worse than the
   default, because it silently reverts a supervisor to free text. */
function competencyFeedbackDimensionsSet(dims) {
  if (!Array.isArray(dims) || !dims.length) return false;
  var clean = [];
  for (var i = 0; i < dims.length; i++) {
    var d = dims[i];
    if (!d || !d.id || !d.label) continue;
    clean.push({ id: String(d.id), label: String(d.label), hint: String(d.hint || "") });
  }
  if (!clean.length) return false;
  return typeof saveStore === "function" && saveStore(COMPETENCY_FEEDBACK_STORE, clean) !== false;
}

function _feedbackRatingRank(id) {
  for (var i = 0; i < COMPETENCY_FEEDBACK_RATINGS.length; i++) {
    if (COMPETENCY_FEEDBACK_RATINGS[i].id === id) return COMPETENCY_FEEDBACK_RATINGS[i].rank;
  }
  return 0;
}

/* Keep only ratings against dimensions that actually exist, so a renamed or
   removed dimension cannot leave orphaned scores that later read as real. */
function _cleanFeedback(fb) {
  if (!fb || typeof fb !== "object") return null;
  var dims = competencyFeedbackDimensions();
  var out = { ratings: {}, strengths: String(fb.strengths || ""), actions: [] };
  for (var i = 0; i < dims.length; i++) {
    var v = fb.ratings && fb.ratings[dims[i].id];
    if (v && _feedbackRatingRank(v)) out.ratings[dims[i].id] = v;
  }
  var acts = Array.isArray(fb.actions) ? fb.actions : [];
  for (var a = 0; a < acts.length && out.actions.length < 5; a++) {
    var t = String(acts[a] || "").trim();
    if (t) out.actions.push(t);
  }
  var any = Object.keys(out.ratings).length || out.strengths || out.actions.length;
  return any ? out : null;
}

/* ── LONGITUDINAL FEEDBACK ──

   The reason structured feedback is worth the extra clicks. One sign-off is an
   opinion; twenty sign-offs over a placement are a pattern, and a pattern is
   what actually changes how a student practises.

   Reports, per dimension: how often it was rated, the trend between the
   earlier and later halves of the record, and whether it is a RECURRING
   concern. `recurring` deliberately requires more than one flag — a single bad
   afternoon is not a persistent gap, and labelling it as one would be both
   unfair and, over time, ignored. */
function competencyFeedbackTrend(student) {
  var dims = competencyFeedbackDimensions();
  var signed = competencyLog()
    .filter(function (c) {
      return (!student || c.student === student) && c.status === "accepted" && c.feedback;
    })
    .sort(function (a, b) { return String(a.signed_at).localeCompare(String(b.signed_at)); });

  var out = [];
  for (var i = 0; i < dims.length; i++) {
    var id = dims[i].id;
    var rated = signed.filter(function (c) { return c.feedback.ratings && c.feedback.ratings[id]; });
    if (!rated.length) {
      out.push({ id: id, label: dims[i].label, rated: 0, concerns: 0,
                 recurring: false, trend: "no evidence", latest: "" });
      continue;
    }
    var ranks = rated.map(function (c) { return _feedbackRatingRank(c.feedback.ratings[id]); });
    var concerns = ranks.filter(function (r) { return r === 1; }).length;
    var half = Math.floor(ranks.length / 2);
    var trend = "steady";
    if (ranks.length >= 4) {
      var early = ranks.slice(0, half).reduce(function (a, b) { return a + b; }, 0) / half;
      var late = ranks.slice(half).reduce(function (a, b) { return a + b; }, 0) / (ranks.length - half);
      if (late - early >= 0.5) trend = "improving";
      else if (early - late >= 0.5) trend = "declining";
    } else {
      trend = "too few to say";
    }
    out.push({
      id: id, label: dims[i].label,
      rated: rated.length, concerns: concerns,
      recurring: concerns >= 2,
      trend: trend,
      latest: rated[rated.length - 1].feedback.ratings[id]
    });
  }
  return out;
}

/* Every improvement action a supervisor has asked for, newest first. A student
   should be able to answer "what was I asked to work on?" without re-reading
   every sign-off. */
function competencyActions(student) {
  var out = [];
  /* `signed_at` is an ISO timestamp with millisecond resolution, so two
     sign-offs made in quick succession can carry the SAME value and the sort
     then leaves them in whatever order they happened to be in — which is not
     necessarily newest-first, and the UI promises newest-first. The log is
     append-only, so its index is a monotonic creation order; using it as the
     tie-break makes the ordering total and deterministic. */
  competencyLog().forEach(function (c, idx) {
    if (student && c.student !== student) return;
    if (c.status !== "accepted" || !c.feedback || !c.feedback.actions) return;
    c.feedback.actions.forEach(function (a) {
      out.push({ action: a, competency_id: c.competency_id,
                 by: c.signed_by_name || c.signed_by, at: c.signed_at, _seq: idx });
    });
  });
  return out.sort(function (a, b) {
    var t = String(b.at).localeCompare(String(a.at));
    return t !== 0 ? t : b._seq - a._seq;
  });
}


/* ── The framework ── */

function competencyFramework() {
  if (typeof loadStore !== "function") return { name: "", version: "", items: [] };
  var f = loadStore(COMPETENCY_STORE, null);
  if (!f || typeof f !== "object") return { name: "", version: "", items: [] };
  if (!Array.isArray(f.items)) f.items = [];
  return f;
}

function competencyFrameworkSet(framework) {
  if (typeof saveStore !== "function") return false;
  if (!framework || typeof framework !== "object") return false;
  var clean = {
    name: String(framework.name || ""),
    version: String(framework.version || ""),
    source: String(framework.source || ""),
    imported_at: new Date().toISOString(),
    imported_by: (typeof CU !== "undefined" && CU) ? (CU.name || CU.username || "") : "",
    items: []
  };
  var items = Array.isArray(framework.items) ? framework.items : [];
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    if (!it || !it.id || !it.label) continue;
    clean.items.push({
      id: String(it.id),
      label: String(it.label),
      domain: String(it.domain || ""),
      level: (COMPETENCY_LEVELS.some(function (l) { return l.id === it.level; })) ? it.level : "shows_how",
      description: String(it.description || "")
    });
  }
  if (!clean.items.length) return false;
  var ok = saveStore(COMPETENCY_STORE, clean) !== false;
  if (ok && typeof logAudit === "function") {
    try {
      logAudit("competency_framework_imported",
        "Imported competency framework \"" + clean.name + "\" v" + clean.version +
        " (" + clean.items.length + " competencies)", {});
    } catch (e) {}
  }
  return ok;
}

function competencyById(id) {
  var f = competencyFramework();
  for (var i = 0; i < f.items.length; i++) if (f.items[i].id === id) return f.items[i];
  return null;
}

function competencyDomains() {
  var f = competencyFramework();
  var seen = {}, out = [];
  for (var i = 0; i < f.items.length; i++) {
    var d = f.items[i].domain || "Uncategorised";
    if (!seen[d]) { seen[d] = true; out.push(d); }
  }
  return out;
}


/* ── Evidence and sign-off ──
   One entry per claim: a student says "this encounter demonstrates competency
   X at level Y". It is UNSIGNED until a supervisor accepts it. An unsigned
   claim is a claim, not an achievement, and the two are never merged. */

function competencyLog() {
  if (typeof loadStore !== "function") return [];
  var l = loadStore(COMPETENCY_LOG_STORE, []);
  return Array.isArray(l) ? l : [];
}

function competencyLogSave(list) {
  if (typeof saveStore !== "function") return false;
  return saveStore(COMPETENCY_LOG_STORE, list || []) !== false;
}

/* A student claims an encounter as evidence. */
function competencyClaim(competencyId, opts) {
  opts = opts || {};
  if (!competencyById(competencyId)) return null;

  var entry = {
    id: "cl" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    competency_id: competencyId,
    student: (typeof CU !== "undefined" && CU) ? (CU.username || CU.name || "") : "",
    student_name: (typeof CU !== "undefined" && CU) ? (CU.name || "") : "",
    /* Reference only — never a copy of the record. The logbook must not become
       a second, unprotected store of patient data. */
    visit_id: opts.visit_id || null,
    patient_ref: opts.patient_ref || null,
    /* Practice patient or simulated case. Recorded at claim time because the
       visit it points at may later be archived or deleted, and a logbook that
       has forgotten an entry was simulated is worse than no logbook. */
    simulated: !!opts.simulated,
    supervision: (SUPERVISION_LEVELS.some(function (s) { return s.id === opts.supervision; }))
      ? opts.supervision : "supervised",
    level_claimed: (COMPETENCY_LEVELS.some(function (l) { return l.id === opts.level; }))
      ? opts.level : "shows_how",
    reflection: String(opts.reflection || ""),
    claimed_at: new Date().toISOString(),
    /* Sign-off, filled in by a supervisor. */
    status: "pending",
    signed_by: "", signed_by_name: "", signed_at: "",
    supervisor_comment: "", level_agreed: ""
  };

  var list = competencyLog();
  list.push(entry);
  if (!competencyLogSave(list)) return null;
  return entry;
}

/* A supervisor accepts, or declines, a claim.

   The supervisor may agree a DIFFERENT level from the one claimed — that is
   the substance of the judgement, not a rejection, and both are kept so the
   student can see the gap between their self-assessment and the assessor's. */
function competencySignOff(claimId, decision, opts) {
  opts = opts || {};
  if (["accepted", "declined"].indexOf(decision) < 0) return false;

  /* There is deliberately NO can("supervise") check here. An empty `if` used
     to sit at this spot, which read like a guard and enforced nothing — the
     worst of both. The honest position (ADR-010): the role check lives in the
     UI, where it hides a control from someone who should not use it; it is not
     a security boundary and pretending otherwise here would be worse than its
     absence. Server-enforced authorization is still outstanding, and until it
     lands a signed competency is trustworthy because a supervisor was standing
     there, not because this function stopped anyone. */

  var list = competencyLog();
  var found = null;
  for (var i = 0; i < list.length; i++) if (list[i].id === claimId) { found = list[i]; break; }
  if (!found) return false;
  if (found.status !== "pending") return false;   /* never re-sign silently */

  found.status = decision;
  found.signed_by = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
  found.signed_by_name = (typeof CU !== "undefined" && CU) ? (CU.name || "") : "";
  found.signed_at = new Date().toISOString();
  found.supervisor_comment = String(opts.comment || "");
  /* Structured feedback rides alongside the free-text comment rather than
     replacing it — a supervisor in a hurry can still write a sentence, and no
     existing sign-off loses meaning. */
  var fb = _cleanFeedback(opts.feedback);
  if (fb) found.feedback = fb;
  found.level_agreed = (decision === "accepted")
    ? ((COMPETENCY_LEVELS.some(function (l) { return l.id === opts.level; })) ? opts.level : found.level_claimed)
    : "";

  if (!competencyLogSave(list)) return false;
  if (typeof logAudit === "function") {
    try {
      logAudit("competency_signed",
        decision + " competency claim " + found.competency_id + " for " + found.student, {});
    } catch (e) {}
  }
  return true;
}

/* Everything awaiting a supervisor, oldest first — a supervisor's work queue. */
function competencyPending(student) {
  return competencyLog()
    .filter(function (c) { return c.status === "pending" && (!student || c.student === student); })
    .sort(function (a, b) { return String(a.claimed_at).localeCompare(String(b.claimed_at)); });
}

/* A student's progress across the whole framework.
   Counts ACCEPTED evidence only: an unsigned claim is not an achievement. */
function competencyProgress(student) {
  var f = competencyFramework();
  var log = competencyLog().filter(function (c) { return !student || c.student === student; });
  var simCounts = competencySimulationCounts();
  var out = [];

  for (var i = 0; i < f.items.length; i++) {
    var item = f.items[i];
    var mine = log.filter(function (c) { return c.competency_id === item.id; });
    var acceptedAll = mine.filter(function (c) { return c.status === "accepted"; });
    /* Simulated evidence is always RECORDED and always shown; whether it
       counts is the department's call (see competencySimulationCounts). */
    var accepted = simCounts ? acceptedAll
                             : acceptedAll.filter(function (c) { return !c.simulated; });
    var independent = accepted.filter(function (c) {
      return SUPERVISION_LEVELS.some(function (s) { return s.id === c.supervision && s.independent; });
    });

    /* Highest level a supervisor has actually agreed. */
    var best = "";
    for (var a = 0; a < accepted.length; a++) {
      var lvl = accepted[a].level_agreed || accepted[a].level_claimed;
      if (levelRank(lvl) > levelRank(best)) best = lvl;
    }

    out.push({
      id: item.id, label: item.label, domain: item.domain,
      target_level: item.level,
      achieved_level: best,
      met: levelRank(best) >= levelRank(item.level),
      evidence_total: mine.length,
      evidence_accepted: accepted.length,
      evidence_pending: mine.filter(function (c) { return c.status === "pending"; }).length,
      independent_count: independent.length,
      /* Always visible, whether or not it counts — a student should be able to
         see the simulated work they did, and see that it is not counting. */
      evidence_simulated: acceptedAll.filter(function (c) { return !!c.simulated; }).length,
      simulated_counts: simCounts
    });
  }
  return out;
}

function levelRank(id) {
  for (var i = 0; i < COMPETENCY_LEVELS.length; i++) if (COMPETENCY_LEVELS[i].id === id) return i + 1;
  return 0;
}

function competencySummary(student) {
  var p = competencyProgress(student);
  return {
    total: p.length,
    met: p.filter(function (x) { return x.met; }).length,
    in_progress: p.filter(function (x) { return !x.met && x.evidence_accepted > 0; }).length,
    pending_signoff: p.reduce(function (n, x) { return n + x.evidence_pending; }, 0),
    not_started: p.filter(function (x) { return x.evidence_total === 0; }).length
  };
}

/* ── Logbook export ──
   What an examining body asks for. Deliberately carries NO patient
   identifiers: a logbook travels outside the clinic, and a competency record
   needs to prove what the student did, not who it was done to. */
function competencyLogbook(student) {
  var f = competencyFramework();
  var log = competencyLog().filter(function (c) {
    return (!student || c.student === student) && c.status === "accepted";
  });
  var entries = log.map(function (c) {
    var item = competencyById(c.competency_id);
    return {
      competency: c.competency_id,
      competency_label: item ? item.label : c.competency_id,
      domain: item ? item.domain : "",
      level_agreed: c.level_agreed || c.level_claimed,
      supervision: c.supervision,
      /* The single most important field in this file. An examining body
         reading a logbook is entitled to know which entries were real
         patients; `encounter_type` is spelled out in words rather than left
         as a boolean flag a reader could skim past. */
      encounter_type: c.simulated ? "SIMULATED — not a real patient" : "real patient",
      simulated: !!c.simulated,
      date: String(c.claimed_at).slice(0, 10),
      signed_by: c.signed_by_name,
      signed_at: String(c.signed_at).slice(0, 10),
      supervisor_comment: c.supervisor_comment,
      reflection: c.reflection
      /* No visit_id, no patient_ref, no clinical detail. */
    };
  });
  var sim = entries.filter(function (e) { return e.simulated; }).length;

  return {
    generated: new Date().toISOString(),
    framework: { name: f.name, version: f.version, source: f.source },
    student: student || "",
    /* Stated at the top level so it cannot be missed by anyone reading only
       the header, and so a downstream tool can assert on it. */
    encounter_counts: { real: entries.length - sim, simulated: sim },
    simulated_counts_towards_progress: competencySimulationCounts(),
    advisory: "Entopic is an advisory clinical decision-support tool. This logbook records " +
      "what a supervisor signed off on this device; it is not itself an assessment decision.",
    entries: entries,
    summary: competencySummary(student)
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    COMPETENCY_STORE: COMPETENCY_STORE, COMPETENCY_LOG_STORE: COMPETENCY_LOG_STORE,
    COMPETENCY_LEVELS: COMPETENCY_LEVELS, SUPERVISION_LEVELS: SUPERVISION_LEVELS,
    competencyFramework: competencyFramework, competencyFrameworkSet: competencyFrameworkSet,
    competencyById: competencyById, competencyDomains: competencyDomains,
    competencyLog: competencyLog, competencyClaim: competencyClaim,
    competencySignOff: competencySignOff, competencyPending: competencyPending,
    competencyProgress: competencyProgress, competencySummary: competencySummary,
    competencyLogbook: competencyLogbook, levelRank: levelRank,
    COMPETENCY_FEEDBACK_DEFAULT: COMPETENCY_FEEDBACK_DEFAULT,
    COMPETENCY_FEEDBACK_RATINGS: COMPETENCY_FEEDBACK_RATINGS,
    competencyFeedbackDimensions: competencyFeedbackDimensions,
    competencyFeedbackDimensionsSet: competencyFeedbackDimensionsSet,
    competencyFeedbackTrend: competencyFeedbackTrend,
    competencyActions: competencyActions,
    COMPETENCY_SIM_STORE: COMPETENCY_SIM_STORE,
    competencySimulationCounts: competencySimulationCounts,
    competencySimulationCountsSet: competencySimulationCountsSet
  };
}
