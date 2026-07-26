/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ASSIGNMENTS (faculty → student)                        */
/*                                                                  */
/* A tutor sets work: specific conditions, or a scope (a domain, the */
/* common list, red flags), at a chosen difficulty, with a due date. */
/* Students see it on their Study tab with live progress; the tutor  */
/* sees who has done what.                                          */
/*                                                                  */
/* Storage note: assignments live in local storage today, alongside  */
/* the rest of the app's offline-first data, and are keyed by the    */
/* clinic/workspace so a cohort on one device shares them. Real      */
/* multi-device cohorts need the founder's own backend — the shape   */
/* here maps 1:1 onto a table, so it ports without a rewrite.        */
/*                                                                  */
/* Learning data only. No patient data is involved in an assignment. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ASSIGN_KEY = "entopic_assignments";
var ASSIGN_SUB_KEY = "entopic_assignment_submissions";

function assignLoad() {
  try { return JSON.parse(localStorage.getItem(ASSIGN_KEY) || "[]"); }
  catch (e) { return []; }
}
function assignSave(list) {
  try { localStorage.setItem(ASSIGN_KEY, JSON.stringify(list)); } catch (e) {}
}
function assignSubsLoad() {
  try { return JSON.parse(localStorage.getItem(ASSIGN_SUB_KEY) || "[]"); }
  catch (e) { return []; }
}
function assignSubsSave(list) {
  try { localStorage.setItem(ASSIGN_SUB_KEY, JSON.stringify(list)); } catch (e) {}
}

/* ── Create ──────────────────────────────────────────────────────── */

/* spec: { title, mode, tier, scope, domain, conditions[], count, due, note,
           assignedTo: [] (usernames; empty = whole cohort) } */
function assignCreate(spec) {
  var list = assignLoad();
  var a = {
    id: "as" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    title: spec.title || "Untitled assignment",
    mode: spec.mode || "simulation",       /* simulation | osce */
    tier: spec.tier || "standard",
    scope: spec.scope || "common",         /* common | all | urgent | domain | list */
    domain: spec.domain || "",
    conditions: spec.conditions || [],
    count: spec.count || 5,
    due: spec.due || "",
    note: spec.note || "",
    assignedTo: spec.assignedTo || [],
    created_by: (typeof CU !== "undefined" && CU) ? (CU.username || "") : "",
    created_at: new Date().toISOString(),
    active: true
  };
  list.push(a);
  assignSave(list);
  if (typeof logAudit === "function") logAudit("assignment_created", a.title, {});
  return a;
}

function assignDelete(id) {
  var list = assignLoad().filter(function (a) { return a.id !== id; });
  assignSave(list);
}

function assignFind(id) {
  var list = assignLoad();
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
  return null;
}

/* Assignments visible to a given user (empty assignedTo = everyone). */
function assignForUser(username) {
  return assignLoad().filter(function (a) {
    if (!a.active) return false;
    if (!a.assignedTo || !a.assignedTo.length) return true;
    return a.assignedTo.indexOf(username) >= 0;
  });
}

/* ── Progress ────────────────────────────────────────────────────── */

/* One attempt recorded against an assignment. */
function assignRecord(assignmentId, entry) {
  var subs = assignSubsLoad();
  subs.push({
    id: "sub" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    assignment_id: assignmentId,
    username: (typeof CU !== "undefined" && CU) ? (CU.username || "") : "",
    at: new Date().toISOString(),
    condition: entry.condition || "",
    correct: !!entry.correct,
    score: (typeof entry.score === "number") ? entry.score : null,
    tier: entry.tier || "",
    mode: entry.mode || "simulation"
  });
  assignSubsSave(subs);
}

function assignSubmissions(assignmentId, username) {
  return assignSubsLoad().filter(function (s) {
    if (s.assignment_id !== assignmentId) return false;
    if (username && s.username !== username) return false;
    return true;
  });
}

/* A student's progress against one assignment. */
function assignProgress(a, username) {
  var subs = assignSubmissions(a.id, username);
  var target = (a.scope === "list" && a.conditions.length) ? a.conditions.length : a.count;
  /* Distinct conditions attempted counts toward completion, so repeating one
     case does not finish the assignment. */
  var seen = {};
  var correct = 0;
  subs.forEach(function (s) {
    if (s.condition) seen[s.condition] = seen[s.condition] || s.correct;
    if (s.correct) correct++;
  });
  var done = Object.keys(seen).length;
  return {
    attempts: subs.length,
    done: Math.min(done, target),
    target: target,
    correct: correct,
    complete: done >= target,
    accuracy: subs.length ? Math.round(100 * correct / subs.length) : 0,
    overdue: !!(a.due && !(done >= target) && new Date(a.due) < new Date())
  };
}

/* Faculty view: every student who has touched this assignment. */
function assignCohortProgress(a) {
  var subs = assignSubmissions(a.id);
  var byUser = {};
  subs.forEach(function (s) { (byUser[s.username] = byUser[s.username] || []).push(s); });
  return Object.keys(byUser).map(function (u) {
    var p = assignProgress(a, u);
    return { username: u, done: p.done, target: p.target, correct: p.correct,
             accuracy: p.accuracy, complete: p.complete };
  }).sort(function (x, y) { return y.done - x.done; });
}

/* ── Launching an assignment ─────────────────────────────────────── */

/* Which condition should this student do next for this assignment? */
function assignNextCase(a, username) {
  var done = {};
  assignSubmissions(a.id, username).forEach(function (s) { if (s.condition) done[s.condition] = true; });

  if (a.scope === "list" && a.conditions.length) {
    var remaining = a.conditions.filter(function (c) { return !done[c]; });
    var pick = remaining.length ? remaining[0] : a.conditions[0];
    return simBuildCase(pick);
  }
  if (a.scope === "domain" && a.domain && typeof KNOWLEDGE_ALL !== "undefined") {
    var pool = KNOWLEDGE_ALL.filter(function (c) {
      return (c.domain || "Other") === a.domain && (c.req || []).length > 0 && !done[c.name];
    });
    if (pool.length) return simBuildCase(pool[Math.floor(Math.random() * pool.length)].name);
  }
  return simRandomCase(a.scope === "all" ? "" : a.scope);
}

/* Currently-running assignment, so a completed case can be credited. */
var ASSIGN_ACTIVE = null;

function assignStart(id) {
  var a = assignFind(id);
  if (!a) return;
  var u = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
  ASSIGN_ACTIVE = a;

  if (a.mode === "osce") {
    osceStart(a.scope === "all" ? "" : a.scope, a.count);
    return;
  }
  var c = assignNextCase(a, u);
  if (!c) { if (typeof toast === "function") toast("No case available for this assignment."); return; }
  simStart(c, a.tier);
}

/* Credit a finished attempt to the active assignment, if any. */
function assignCredit(score, theCase, mode) {
  if (!ASSIGN_ACTIVE || !score || !theCase) return;
  assignRecord(ASSIGN_ACTIVE.id, {
    condition: theCase.condition,
    correct: score.correct,
    score: (typeof score.efficiency === "number") ? score.efficiency : null,
    tier: score.tier || "",
    mode: mode || "simulation"
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { assignProgress: assignProgress, assignNextCase: assignNextCase };
}
