/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SECTION STATUS ("not assessed" is a clinical statement) */
/*                                                                  */
/* THE PROBLEM THIS SOLVES                                          */
/* ──────────────────────                                           */
/* An empty field used to mean three different things:              */
/*                                                                  */
/*   "I examined this and it was normal, I just didn't type it"     */
/*   "I deliberately chose not to examine this"                     */
/*   "I forgot"                                                     */
/*                                                                  */
/* Nobody reading the record later — the same clinician at the next */
/* visit, a colleague, a supervisor, or a court — can tell which.   */
/* In glaucoma follow-up, "gonioscopy not performed" and            */
/* "gonioscopy normal" carry completely different weight, and the   */
/* record could not distinguish them.                               */
/*                                                                  */
/* THE MODEL                                                        */
/* ─────────                                                        */
/* Four states per exam section:                                    */
/*                                                                  */
/*   ""            untouched — nothing said either way (the default) */
/*   "normal"      assessed, nothing abnormal found                 */
/*   "abnormal"    assessed, findings recorded                      */
/*   "not_done"    DELIBERATELY not assessed, with a reason         */
/*                                                                  */
/* `abnormal` is DERIVED, never asserted: if a section holds data,  */
/* it is abnormal-or-recorded regardless of what any flag says.     */
/* Data always outranks a status flag, so a stale flag can never    */
/* hide a finding that is actually in the record.                   */
/*                                                                  */
/* WHY not_done CARRIES A REASON                                    */
/* ────────────────────────────                                     */
/* "Not done" without a reason is barely better than blank. The     */
/* reason is what makes it a clinical decision rather than an       */
/* omission: patient declined, unable to cooperate, not indicated,  */
/* equipment unavailable, deferred to next visit.                   */
/*                                                                  */
/* WHAT THIS DELIBERATELY DOES NOT DO                               */
/* ─────────────────────────────────                                */
/* It does not feed the diagnostic engine. A section marked         */
/* "not_done" must NOT become a pertinent negative — that would     */
/* turn "I didn't look" into "I looked and it was fine", which is   */
/* the exact confusion this module exists to remove. The engine     */
/* sees findings, not statuses.                                     */
/*                                                                  */
/* BACKWARD COMPATIBLE: visits saved before this module have no     */
/* `sectionStatus` map. They read as "" (untouched), which is       */
/* exactly what they were.                                          */
/*                                                                  */
/* Load order: after data-model.js, before app.js.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var SECTION_STATES = ["", "normal", "abnormal", "not_done"];

/* Why a clinician might deliberately not assess something. Ordered by how
   often they occur in practice, commonest first. */
var NOT_DONE_REASONS = [
  "Patient declined",
  "Unable to cooperate",
  "Not clinically indicated",
  "Equipment unavailable",
  "Deferred to next visit",
  "Time constraint",
  "Contraindicated"
];

/* Sections this applies to. Documentation and history steps are excluded:
   "not assessed" is not a meaningful statement about a report or an ICD code. */
var STATUS_SECTIONS = [
  "va", "refraction", "dilation", "slit_lamp", "iop", "pupil", "motility",
  "bv", "gonioscopy", "fundus", "neuro", "investigations"
];

function sectionStatusApplies(step) {
  return STATUS_SECTIONS.indexOf(step) >= 0;
}

/* Read the stored flag. Absent on older visits — that is not an error. */
function sectionStatusRaw(visit, step) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v || !v.sectionStatus) return "";
  var s = v.sectionStatus[step];
  return (s && s.state) || "";
}

function sectionStatusReason(visit, step) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v || !v.sectionStatus) return "";
  var s = v.sectionStatus[step];
  return (s && s.reason) || "";
}

/* The EFFECTIVE state, which is what everything should read.

   Data wins over flags, always. If a section holds findings it reports
   "abnormal" even if somebody left it flagged "not_done" — a stale flag must
   never be able to hide a finding that is genuinely in the record. */
function sectionStatus(visit, step) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v) return "";
  var hasData = (typeof stepHasData === "function") ? stepHasData(step, v) : false;
  var flag = sectionStatusRaw(v, step);

  if (hasData) return "abnormal";
  if (flag === "abnormal") return "";       /* claimed abnormal but empty — say nothing */
  return flag;                              /* "", "normal" or "not_done" */
}

/* Record a deliberate clinical statement about a section. */
function sectionStatusSet(step, state, reason) {
  if (typeof V === "undefined" || !V) return false;
  if (SECTION_STATES.indexOf(state) < 0) return false;
  if (!V.sectionStatus) V.sectionStatus = {};

  if (!state) {
    delete V.sectionStatus[step];
  } else {
    V.sectionStatus[step] = {
      state: state,
      reason: (state === "not_done") ? (reason || "") : "",
      by: (typeof CU !== "undefined" && CU) ? (CU.name || CU.username || "") : "",
      at: new Date().toISOString()
    };
  }

  /* Deliberately NOT assessing something is a clinical decision and belongs in
     the audit trail alongside the rest of the encounter. */
  if (state === "not_done" && typeof logAudit === "function") {
    try {
      logAudit("section_not_assessed",
        step + " recorded as not assessed" + (reason ? " (" + reason + ")" : ""),
        { patient_id: (typeof P !== "undefined" && P) ? P.id : null,
          visit_id: V.id || null });
    } catch (e) {}
  }
  return true;
}

/* Everything the clinician has explicitly declined to assess this visit.
   Surfaced on the report so it travels with the record rather than being
   discoverable only by clicking through every step. */
function sectionStatusNotDone(visit) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v || !v.sectionStatus) return [];
  var out = [];
  for (var i = 0; i < STATUS_SECTIONS.length; i++) {
    var step = STATUS_SECTIONS[i];
    if (sectionStatus(v, step) !== "not_done") continue;
    out.push({ step: step, label: sectionLabel(step), reason: sectionStatusReason(v, step) });
  }
  return out;
}

/* Sections nobody has said anything about at all — neither examined nor
   explicitly declined. This is the honest "incomplete examination" list. */
function sectionStatusUntouched(visit) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v) return [];
  var out = [];
  for (var i = 0; i < STATUS_SECTIONS.length; i++) {
    if (sectionStatus(v, STATUS_SECTIONS[i]) === "") {
      out.push({ step: STATUS_SECTIONS[i], label: sectionLabel(STATUS_SECTIONS[i]) });
    }
  }
  return out;
}

function sectionLabel(step) {
  if (typeof STEPS !== "undefined" && STEPS) {
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === step) return STEPS[i].l;
  }
  return step;
}

/* A one-line completeness summary for the report and the advisory panel. */
function sectionStatusSummary(visit) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  var counts = { assessed: 0, normal: 0, not_done: 0, untouched: 0 };
  if (!v) return counts;
  for (var i = 0; i < STATUS_SECTIONS.length; i++) {
    var s = sectionStatus(v, STATUS_SECTIONS[i]);
    if (s === "abnormal") counts.assessed++;
    else if (s === "normal") counts.normal++;
    else if (s === "not_done") counts.not_done++;
    else counts.untouched++;
  }
  return counts;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SECTION_STATES: SECTION_STATES,
    NOT_DONE_REASONS: NOT_DONE_REASONS,
    STATUS_SECTIONS: STATUS_SECTIONS,
    sectionStatusApplies: sectionStatusApplies,
    sectionStatus: sectionStatus,
    sectionStatusRaw: sectionStatusRaw,
    sectionStatusReason: sectionStatusReason,
    sectionStatusSet: sectionStatusSet,
    sectionStatusNotDone: sectionStatusNotDone,
    sectionStatusUntouched: sectionStatusUntouched,
    sectionStatusSummary: sectionStatusSummary,
    sectionLabel: sectionLabel
  };
}
