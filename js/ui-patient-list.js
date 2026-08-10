/* ═══════════════════════════════════════════════════════════════ */
/* PATIENT LIST — rows, and the practice/real split                 */
/*                                                                  */
/* Split out of js/app.js (Phase 9). app.js is the acknowledged god */
/* module: it holds authentication, routing, autosave, the home     */
/* screen, the header and more, and Phase 9's own brief asks for    */
/* god files and component boundaries to be identified and, where   */
/* safe, corrected.                                                 */
/*                                                                  */
/* This is the safest possible piece to lift out: four small pure   */
/* functions that read the stores and return an HTML string. They   */
/* hold no state, register no listeners, and are called only from   */
/* the home screen's two lists. Nothing else changes.               */
/*                                                                  */
/* ── THE ONE RULE IN HERE THAT IS CLINICAL, NOT COSMETIC ──         */
/*                                                                  */
/* A student's "practice exam" is a learning artifact and must      */
/* NEVER appear in the clinician Patients tab or count toward       */
/* clinical statistics. realPatients()/practicePatients() are the   */
/* single source of that split, and every practice record carries a */
/* visible chip wherever it is shown, so the two can never be       */
/* confused on screen either.                                       */
/*                                                                  */
/* Load order: after js/storage.js and js/visit-store.js (reads     */
/* their accessors), before js/app.js (which calls these).          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function realPatients()     { return loadPatients().filter(function (p) { return !p.practice; }); }
function practicePatients() { return loadPatients().filter(function (p) { return !!p.practice; }); }

function realVisitIds() {
  var real = {}; var ps = realPatients();
  for (var i = 0; i < ps.length; i++) real[ps[i].id] = true;
  return real;
}

/* One patient row, shared by the Patients tab and the Study tab's practice list.

   `lastByPatient` is a precomputed {patient_id: newest visit index entry} map
   from visitStoreLastIndexByPatient(). It exists for a measured reason: calling
   getLastVisit() once per row re-parsed the entire visit index and read a full
   visit record every time, which was 95% of a 254 ms home render at 500
   patients — quadratic on the screen a clinician returns to all day.

   The row needs only `status`, which the index already carries, so the record
   reads disappear rather than merely being batched.

   When no map is supplied it falls back to the original per-row lookup, so any
   caller that has not been updated still renders correctly — just slower. */
function patientRowHtml(pt, lastByPatient) {
  var nm = (pt.first_name || "New") + " " + (pt.last_name || "Patient");
  var lastV = lastByPatient ? lastByPatient[pt.id] : getLastVisit(pt.id);
  var status = lastV && lastV.status === "completed"
    ? '<span style="color:var(--sl);font-size:.54rem;font-weight:600"> ✓</span>'
    : '<span style="color:var(--md);font-size:.54rem"> ●</span>';
  return '<div class="p-row" onclick="openPatient(\'' + pt.id + '\')">' +
    '<div><b>' + escH(nm) + '</b>' + (pt.practice ? ' <span class="practice-chip">practice</span>' : '') + status + '</div>' +
    '<span style="font-family:var(--mono);color:var(--sv);font-size:.6rem">' + escH(pt.mrn || "") + '</span>' +
  '</div>';
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    realPatients: realPatients, practicePatients: practicePatients,
    realVisitIds: realVisitIds, patientRowHtml: patientRowHtml
  };
}
