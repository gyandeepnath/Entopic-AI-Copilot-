/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — FEEDBACK & ISSUE REPORTING                            */
/*                                                                  */
/* One channel from every role — clinician, student, faculty,       */
/* researcher, technician — to the administrator, and an organised  */
/* queue on the other end.                                          */
/*                                                                  */
/* WHY IT MATTERS MORE HERE THAN IN ORDINARY SOFTWARE              */
/*                                                                  */
/* Entopic runs offline on machines you cannot see. A clinician who */
/* spots something wrong with the knowledge base — a condition that */
/* should have fired and did not, an ICD code that is wrong — has   */
/* no other way to tell anyone. Without this channel that knowledge */
/* is simply lost, and the same defect persists across every        */
/* clinic. This is the main inbound signal for clinical quality.    */
/*                                                                  */
/* DESIGN DECISIONS                                                */
/*                                                                  */
/* · CLINICAL CONCERN IS ITS OWN CATEGORY, sorted above everything  */
/*   else regardless of age. A safety report queued behind twelve   */
/*   feature requests is a safety report nobody read.               */
/*                                                                  */
/* · NO PHI, ENFORCED. Reports travel — to the backend, into        */
/*   exports, onto a support desk. The submit path strips anything  */
/*   patient-shaped from the free text and never attaches a record. */
/*   Reporters are told to describe the pattern, not the patient.   */
/*                                                                  */
/* · BUILD CONTEXT IS AUTOMATIC. Version, KB version and browser    */
/*   are attached without being asked for, because a report that    */
/*   does not say which build it came from usually cannot be acted  */
/*   on (see js/build-info.js).                                     */
/*                                                                  */
/* · OFFLINE-FIRST. Reports queue locally and sync when a backend   */
/*   exists. Nothing about reporting requires a network.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var FEEDBACK_STORE = "feedback";

var FEEDBACK_CATEGORIES = [
  { id: "clinical", label: "Clinical concern", priority: 0,
    hint: "The engine missed something, flagged something wrongly, or the clinical content looks wrong. Describe the pattern, not the patient." },
  { id: "kb_correction", label: "Knowledge-base correction", priority: 1,
    hint: "A condition, finding, ICD code or summary that needs correcting." },
  { id: "bug", label: "Something is broken", priority: 2,
    hint: "It crashed, did not save, or behaved unexpectedly. What were you doing just before?" },
  { id: "usability", label: "Hard to use", priority: 3,
    hint: "Confusing, slow, or takes too many steps." },
  { id: "feature", label: "Suggestion", priority: 4,
    hint: "Something Entopic should be able to do." },
  { id: "other", label: "Something else", priority: 5, hint: "" }
];

var FEEDBACK_SEVERITIES = ["blocking", "major", "minor"];
var FEEDBACK_STATES = ["open", "acknowledged", "in_progress", "resolved", "declined"];

function feedbackCategory(id) {
  for (var i = 0; i < FEEDBACK_CATEGORIES.length; i++) {
    if (FEEDBACK_CATEGORIES[i].id === id) return FEEDBACK_CATEGORIES[i];
  }
  return null;
}


/* ── PHI guard ───────────────────────────────────────────────────
   Free text is where patient data leaks. This does not try to DETECT names
   (unreliable, as established in the error boundary) — it removes the
   structures that carry identity and caps the length. Combined with the
   UI telling reporters to describe the pattern rather than the patient,
   and with never attaching a record, that is a defensible position. */
function feedbackScrub(text) {
  var t = String(text === null || text === undefined ? "" : text);
  t = t.replace(/\b[A-Za-z]{2,}[-_]\d[\w-]*/g, "[id]");       /* MRN-4471, EP-1A2B */
  t = t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "[date]");           /* dates of birth */
  t = t.replace(/\b[\d][\d\s().+-]{7,}\d\b/g, "[number]");     /* phone numbers */
  t = t.replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, "[email]");    /* e-mail */
  return t.slice(0, 2000);
}


/* ── Store ─────────────────────────────────────────────────────── */

function feedbackLoad() {
  if (typeof loadStore !== "function") return [];
  var list = loadStore(FEEDBACK_STORE, []);
  return Array.isArray(list) ? list : [];
}

function feedbackSave(list) {
  if (typeof saveStore !== "function") return false;
  return saveStore(FEEDBACK_STORE, list || []) !== false;
}


/* ── Submit ──────────────────────────────────────────────────────
   Returns the stored report, or {error} — a report that was not persisted
   must never be reported as sent, or the reporter believes someone knows
   about a clinical concern when nobody does. */
function feedbackSubmit(input, user, nowIso) {
  input = input || {};
  var cat = feedbackCategory(input.category);
  if (!cat) return { error: "Choose what kind of report this is." };

  var body = feedbackScrub(input.body);
  if (body.trim().length < 10) {
    return { error: "Please describe the problem in a sentence or two so it can be acted on." };
  }
  var severity = FEEDBACK_SEVERITIES.indexOf(input.severity) >= 0 ? input.severity : "minor";

  var rec = {
    id: "fb" + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36),
    at: nowIso || new Date().toISOString(),
    category: cat.id,
    severity: severity,
    subject: feedbackScrub(input.subject).slice(0, 120),
    body: body,

    /* Who reported it — role and display name only. Enough to follow up
       inside the practice, and nothing that identifies a patient. */
    by: (user && (user.name || user.username)) || "",
    by_role: (user && user.role) || (typeof effectiveRole === "function" ? effectiveRole() : "") || "",

    /* Build context, attached automatically (see js/build-info.js). */
    build: (typeof buildInfo === "function") ? (function () {
      var b = buildInfo();
      return { app_version: b.app_version, kb_version: b.kb_version,
               commit: b.commit, ua: b.ua };
    })() : null,

    /* What the reporter was looking at — a step id or page name, never a
       patient or visit id. */
    context: feedbackScrub(input.context).slice(0, 120),

    status: "open",
    notes: [],
    synced: false
  };

  var list = feedbackLoad();
  list.push(rec);
  if (!feedbackSave(list)) {
    return { error: "This device could not save the report — its storage is full or damaged. " +
                    "Nothing was sent. Tell the administrator directly." };
  }

  if (typeof logAudit === "function") {
    try { logAudit("feedback_submitted", cat.label + " (" + severity + "): " + rec.subject, {}); } catch (e) {}
  }
  return { ok: true, report: rec };
}


/* ── Triage ─────────────────────────────────────────────────────── */

function feedbackSetStatus(id, status, by, note, nowIso) {
  if (FEEDBACK_STATES.indexOf(status) === -1) return null;
  var list = feedbackLoad();
  for (var i = 0; i < list.length; i++) {
    if (list[i].id !== id) continue;
    list[i].status = status;
    list[i].notes = list[i].notes || [];
    list[i].notes.push({
      at: nowIso || new Date().toISOString(),
      by: by || "",
      status: status,
      note: feedbackScrub(note).slice(0, 500)
    });
    if (!feedbackSave(list)) return null;
    if (typeof logAudit === "function") {
      try { logAudit("feedback_" + status, "Report " + id + " → " + status, {}); } catch (e) {}
    }
    return list[i];
  }
  return null;
}


/* ── The admin queue ─────────────────────────────────────────────
   Ordering is the whole value of this function: a clinical concern must
   never sit below a feature request, and an open report must never sit
   below a resolved one, however old. */
function feedbackQueue(filter) {
  filter = filter || {};
  var list = feedbackLoad().slice();

  var out = list.filter(function (r) {
    if (filter.status && r.status !== filter.status) return false;
    if (filter.category && r.category !== filter.category) return false;
    if (filter.severity && r.severity !== filter.severity) return false;
    if (filter.role && r.by_role !== filter.role) return false;
    if (filter.open_only && (r.status === "resolved" || r.status === "declined")) return false;
    return true;
  });

  var sevRank = { blocking: 0, major: 1, minor: 2 };
  var openRank = function (s) { return (s === "resolved" || s === "declined") ? 1 : 0; };

  out.sort(function (a, b) {
    var ao = openRank(a.status), bo = openRank(b.status);
    if (ao !== bo) return ao - bo;                                  /* open first */
    var ap = (feedbackCategory(a.category) || {}).priority;
    var bp = (feedbackCategory(b.category) || {}).priority;
    if (ap !== bp) return ap - bp;                                  /* clinical first */
    var as = sevRank[a.severity], bs = sevRank[b.severity];
    if (as !== bs) return as - bs;
    return String(b.at).localeCompare(String(a.at));                /* newest first */
  });
  return out;
}

/* Counts for the admin dashboard badge and the filter chips. */
function feedbackCounts() {
  var list = feedbackLoad();
  var c = { total: list.length, open: 0, clinical_open: 0, blocking_open: 0, by_status: {}, by_category: {} };
  for (var i = 0; i < list.length; i++) {
    var r = list[i];
    c.by_status[r.status] = (c.by_status[r.status] || 0) + 1;
    c.by_category[r.category] = (c.by_category[r.category] || 0) + 1;
    var isOpen = r.status !== "resolved" && r.status !== "declined";
    if (isOpen) {
      c.open++;
      if (r.category === "clinical") c.clinical_open++;
      if (r.severity === "blocking") c.blocking_open++;
    }
  }
  return c;
}

/* Reports not yet pushed to a backend, for the sync layer. */
function feedbackUnsynced() {
  return feedbackLoad().filter(function (r) { return !r.synced; });
}

function feedbackMarkSynced(ids) {
  var set = {};
  for (var i = 0; i < (ids || []).length; i++) set[ids[i]] = true;
  var list = feedbackLoad();
  var n = 0;
  for (var j = 0; j < list.length; j++) {
    if (set[list[j].id] && !list[j].synced) { list[j].synced = true; n++; }
  }
  return feedbackSave(list) ? n : 0;
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    FEEDBACK_STORE: FEEDBACK_STORE, FEEDBACK_CATEGORIES: FEEDBACK_CATEGORIES,
    FEEDBACK_SEVERITIES: FEEDBACK_SEVERITIES, FEEDBACK_STATES: FEEDBACK_STATES,
    feedbackCategory: feedbackCategory, feedbackScrub: feedbackScrub,
    feedbackSubmit: feedbackSubmit, feedbackSetStatus: feedbackSetStatus,
    feedbackQueue: feedbackQueue, feedbackCounts: feedbackCounts,
    feedbackLoad: feedbackLoad, feedbackUnsynced: feedbackUnsynced,
    feedbackMarkSynced: feedbackMarkSynced
  };
}
