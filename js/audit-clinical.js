/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — MATERIAL-CHANGE AUDIT  (security audit SEC-9)         */
/*                                                                  */
/* ── THE GAP THIS CLOSES ──                                       */
/*                                                                  */
/* 65 kinds of event were audited, including who OPENED a chart and */
/* who VIEWED a past visit. What was not audited was anybody        */
/* CHANGING the clinical content: not the prescription, not the     */
/* recorded diagnosis, not the management plan, not the referral.   */
/*                                                                  */
/* Measured: `logAudit("patient_edited"` and                        */
/* `logAudit("prescription_changed"` appear zero times in the       */
/* codebase. `doSave()` wrote patient and visit data with no audit  */
/* entry at all.                                                    */
/*                                                                  */
/* For a clinical record that is the wrong way round. Reading a     */
/* record is a privacy event; changing one is an accountability     */
/* event, and it is the one a complaint, a coroner or a regulator   */
/* actually asks about: who altered this prescription, when, and    */
/* what did it say before.                                          */
/*                                                                  */
/* ── WHAT IT RECORDS, AND WHAT IT DELIBERATELY DOES NOT ──        */
/*                                                                  */
/* Only MATERIAL fields — the ones that change what happens to the  */
/* patient: the prescription, the recorded diagnosis, the           */
/* management plan, the referral and its urgency.                   */
/*                                                                  */
/* Not every keystroke. The engine re-runs and the visit re-saves   */
/* constantly during an exam; auditing all of it would produce      */
/* thousands of entries per consultation, push the real ones out of */
/* the 2,000-entry local log, and make the trail useless exactly    */
/* when somebody needs to read it. An audit log nobody can read is  */
/* not evidence.                                                    */
/*                                                                  */
/* ── PRIVACY: WHAT GOES IN THE ENTRY ──                           */
/*                                                                  */
/* Which FIELD changed, never the values. "OD sphere changed" is    */
/* accountability; "OD sphere changed from -2.00 to -6.00" is a     */
/* second copy of the clinical record living in a store with        */
/* different access rules and a different retention period. The     */
/* previous values are already preserved on the record itself by    */
/* recPreserveOverwritten / the amendment trail, which is where a   */
/* reader should go and where the access controls are correct.      */
/*                                                                  */
/* ONE exception, and it is deliberate: a change made to a visit    */
/* that was already COMPLETED is recorded as an amendment and says  */
/* so, because altering a signed-off record after the fact is the   */
/* single event most likely to matter later.                        */
/*                                                                  */
/* Load order: after storage.js. Pure apart from logAudit.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* The fields whose change is worth a permanent record. Each entry says WHY it
   is here, because the temptation with an audit list is always to add more,
   and every addition dilutes the ones that matter. */
var AUDIT_MATERIAL_FIELDS = [
  { path: "rx",   label: "prescription",
    why: "What the patient will be dispensed. The most common source of a real-world harm claim." },
  { path: "plan", label: "management plan",
    why: "What was decided, including the referral and its urgency." },
  { path: "final_dx", label: "recorded diagnosis",
    why: "What the CLINICIAN concluded, as distinct from what the engine suggested." }
];

/* Compare two visit payloads and return the material fields that differ.
   Pure — no globals, no storage, no DOM. */
function auditMaterialDiff(before, after) {
  var out = [];
  if (!after) return out;
  before = before || {};
  AUDIT_MATERIAL_FIELDS.forEach(function (f) {
    var a, b;
    try {
      a = JSON.stringify(before[f.path] === undefined ? null : before[f.path]);
      b = JSON.stringify(after[f.path] === undefined ? null : after[f.path]);
    } catch (e) { return; }
    if (a === b) return;
    /* Going from nothing to nothing-shaped (e.g. {} vs undefined) is not a
       change a human made; do not manufacture an entry for it. */
    if (_auditEmptyish(a) && _auditEmptyish(b)) return;
    out.push({ field: f.path, label: f.label, first: _auditEmptyish(a) });
  });
  return out;
}

function _auditEmptyish(json) {
  if (json === undefined || json === null) return true;
  var s = String(json);
  if (s === "null" || s === '""' || s === "{}" || s === "[]") return true;
  /* An object whose every value is empty — what a blank form serialises to. */
  if (s.charAt(0) === "{") {
    try {
      var o = JSON.parse(s);
      return Object.keys(o).every(function (k) {
        var v = o[k];
        return v === null || v === undefined || v === "" ||
               (Array.isArray(v) && !v.length) ||
               (typeof v === "object" && !Object.keys(v).length);
      });
    } catch (e) { return false; }
  }
  return false;
}

/* Record the change. Called by doSave with the stored visit as it was and the
   in-memory visit as it now is.

   Returns the number of entries written, so a caller (and a test) can tell the
   difference between "nothing material changed" and "the audit failed". */
function auditMaterialChange(beforeData, afterData, ids, wasCompleted) {
  if (typeof logAudit !== "function") return 0;
  var changes = auditMaterialDiff(beforeData, afterData);
  if (!changes.length) return 0;

  /* One entry per save, listing the fields — not one entry per field. A save
     that alters the prescription and the plan together is one clinical act. */
  var names = changes.map(function (c) { return c.label; });
  var allFirst = changes.every(function (c) { return c.first; });

  var msg;
  if (wasCompleted) {
    /* The entry that matters most. A completed visit has been signed off, may
       have been referred from, and may already have been relied upon. */
    msg = "AMENDED AFTER COMPLETION — " + names.join(", ") +
          " changed on a visit that was already marked complete";
  } else if (allFirst) {
    msg = names.join(", ") + " recorded";
  } else {
    msg = names.join(", ") + " changed";
  }

  try {
    logAudit(wasCompleted ? "record_amended" : "record_changed", msg, ids || {});
  } catch (e) { return 0; }
  return 1;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AUDIT_MATERIAL_FIELDS: AUDIT_MATERIAL_FIELDS,
    auditMaterialDiff: auditMaterialDiff,
    auditMaterialChange: auditMaterialChange
  };
}
