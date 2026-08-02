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
  if (typeof can === "function" && !can("supervise")) {
    /* Client-side only — this is a UI convenience, NOT a security boundary.
       See ADR-010. Server-enforced authorization is required before this can
       be relied on in a real teaching clinic. */
  }

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
  var out = [];

  for (var i = 0; i < f.items.length; i++) {
    var item = f.items[i];
    var mine = log.filter(function (c) { return c.competency_id === item.id; });
    var accepted = mine.filter(function (c) { return c.status === "accepted"; });
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
      independent_count: independent.length
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
  return {
    generated: new Date().toISOString(),
    framework: { name: f.name, version: f.version, source: f.source },
    student: student || "",
    entries: log.map(function (c) {
      var item = competencyById(c.competency_id);
      return {
        competency: c.competency_id,
        competency_label: item ? item.label : c.competency_id,
        domain: item ? item.domain : "",
        level_agreed: c.level_agreed || c.level_claimed,
        supervision: c.supervision,
        date: String(c.claimed_at).slice(0, 10),
        signed_by: c.signed_by_name,
        signed_at: String(c.signed_at).slice(0, 10),
        supervisor_comment: c.supervisor_comment,
        reflection: c.reflection
        /* No visit_id, no patient_ref, no clinical detail. */
      };
    }),
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
    competencyLogbook: competencyLogbook, levelRank: levelRank
  };
}
