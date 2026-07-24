/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DATA EXPORT                                           */
/*                                                                  */
/* Well-organised exports of what's on the device, in open formats  */
/* (CSV for spreadsheets, JSON for backup). Role-appropriate:       */
/*   • Clinician / Admin — patient records (their data).            */
/*   • Researcher / Admin — DE-IDENTIFIED aggregate only (no PII).  */
/*   • Everyone — analytics summary + the de-identified casebook.   */
/*                                                                  */
/* GUARDRAILS: the researcher/aggregate exports carry NO patient    */
/* identifiers; PII exports are the clinician's OWN records. Pure    */
/* CSV/JSON builders are DOM-free and tested; download wiring is     */
/* guarded for the browser.                                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── CSV core (RFC-4180-ish): quote fields with comma/quote/newline ── */
function csvCell(v) {
  if (v == null) return "";
  var s = String(v);
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}
function csvFrom(columns, rows) {
  var out = [columns.map(csvCell).join(",")];
  for (var i = 0; i < rows.length; i++) {
    out.push(columns.map(function (c, j) { return csvCell(rows[i][j]); }).join(","));
  }
  return out.join("\r\n");
}


/* ── Row builders (pure) ─────────────────────────────────────────── */

/* Analytics summary → flat (section, metric, value) rows. */
function exportAnalyticsRows(d) {
  var rows = [];
  function add(sec, m, v) { rows.push([sec, m, v]); }
  add("Accounts", "Total", d.accounts.total);
  add("Accounts", "Students", d.accounts.byRole.student);
  add("Accounts", "Clinicians", d.accounts.byRole.clinician);
  add("Accounts", "Faculty", d.accounts.byRole.faculty);
  add("Records", "Real patients", d.patients.real);
  add("Records", "Practice exams", d.patients.practice);
  add("Visits", "Total", d.visits.total);
  add("Visits", "Completed", d.visits.completed);
  add("Visits", "Red-flag visits", d.visits.redFlagVisits);
  add("Visits", "Red-flag rate", Math.round(d.visits.redFlagRate * 1000) / 10 + "%");
  add("Visits", "Avg steps/exam", Math.round(d.visits.avgSteps * 10) / 10);
  add("Casebook", "Cases", d.casebook.total);
  add("Casebook", "Reviewed", d.casebook.reviewed);
  add("Quiz", "Questions answered", d.quiz.asked);
  add("Quiz", "Accuracy", Math.round(d.quiz.accuracy * 1000) / 10 + "%");
  add("Knowledge base", "Conditions", d.kb.total);
  add("Knowledge base", "Verified", d.kb.verified);
  add("Knowledge base", "Provisional", d.kb.provisional);
  for (var i = 0; i < d.visits.topDx.length; i++) add("Top diagnoses", d.visits.topDx[i].key, d.visits.topDx[i].n);
  for (var j = 0; j < d.visits.byDomain.length; j++) add("By specialty area", d.visits.byDomain[j].key, d.visits.byDomain[j].n);
  return rows;
}

/* De-identified casebook → rows (no identifiers; the casebook is already
   de-identified). */
function exportCasebookRows(cases) {
  var rows = [];
  for (var i = 0; i < cases.length; i++) {
    var e = cases[i]; if (!e) continue;
    var s = e.state || {};
    var a = (s.assessment && s.assessment[0]) || {};
    var sx = (s.subjective && s.subjective.symptoms) ? s.subjective.symptoms.join("; ") : "";
    rows.push([
      e.title || "", a.domain || "", a.icd || "",
      a.urgent ? "yes" : "", e.reviewed ? "yes" : "", e.builtin ? "example" : "saved",
      (s.patient && s.patient.age) || "", (s.patient && s.patient.sex) || "",
      sx, (e.teachingNote || "").replace(/\s+/g, " ")
    ]);
  }
  return rows;
}
var EXPORT_CASEBOOK_COLS = ["condition", "domain", "icd10", "urgent", "reviewed", "kind", "age", "sex", "findings", "teaching_note"];

/* Patient records (PII — clinician's own data). REAL records only. */
function exportRecordsRows(patients, visits, leadDxFn) {
  var byPatient = {};
  for (var v = 0; v < visits.length; v++) {
    var vi = visits[v]; if (!vi) continue;
    (byPatient[vi.patient_id] = byPatient[vi.patient_id] || []).push(vi);
  }
  var rows = [];
  for (var p = 0; p < patients.length; p++) {
    var pt = patients[p]; if (!pt || pt.practice) continue;   /* real records only */
    var vs = byPatient[pt.id] || [];
    if (!vs.length) {
      rows.push([pt.mrn || "", ((pt.first_name || "") + " " + (pt.last_name || "")).trim(), pt.age || "", pt.sex || "", "", "", "", "", ""]);
      continue;
    }
    for (var k = 0; k < vs.length; k++) {
      var vv = vs[k];
      var lead = leadDxFn ? leadDxFn(vv) : (vv.data && vv.data.dxList && vv.data.dxList[0]) || null;
      var redFlag = vv.data && vv.data.alerts && vv.data.alerts.some(function (a) { return a.l === "urgent"; });
      rows.push([
        pt.mrn || "", ((pt.first_name || "") + " " + (pt.last_name || "")).trim(), pt.age || "", pt.sex || "",
        (vv.date || "").slice(0, 10), vv.status || "",
        lead ? lead.n : "", lead ? (lead.icd || "") : "", redFlag ? "yes" : ""
      ]);
    }
  }
  return rows;
}
var EXPORT_RECORDS_COLS = ["mrn", "name", "age", "sex", "visit_date", "status", "leading_impression", "icd10", "red_flag"];

/* De-identified research dataset — aggregate distributions only, no rows
   that could identify a patient. */
function exportResearchRows(d) {
  var rows = [["metric", "key", "value"]];
  rows.push(["encounters", "total", d.visits.total]);
  rows.push(["encounters", "completed", d.visits.completed]);
  rows.push(["safety", "red_flag_rate", Math.round(d.visits.redFlagRate * 1000) / 10 + "%"]);
  rows.push(["safety", "avg_steps_per_exam", Math.round(d.visits.avgSteps * 10) / 10]);
  for (var i = 0; i < d.visits.topDx.length; i++) rows.push(["diagnosis", d.visits.topDx[i].key, d.visits.topDx[i].n]);
  for (var j = 0; j < d.visits.byDomain.length; j++) rows.push(["specialty_area", d.visits.byDomain[j].key, d.visits.byDomain[j].n]);
  rows.push(["corpus", "deidentified_cases", d.casebook.total]);
  rows.push(["corpus", "peer_reviewed", d.casebook.reviewed]);
  return rows;   /* first row IS the header here */
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM DOWNLOAD WIRING (browser)                                   */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  function _dlDownload(name, text, mime) {
    var blob = new Blob([text], { type: (mime || "text/plain") + ";charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    if (typeof logAudit === "function") { try { logAudit("data_exported", "Exported " + name, {}); } catch (e) {} }
  }
  function _stamp() { return new Date().toISOString().slice(0, 10); }
  function _analytics() {
    if (typeof analyticsCompute !== "function") return null;
    return analyticsCompute({
      users: (typeof loadUsers === "function") ? loadUsers() : [],
      patients: (typeof loadPatients === "function") ? loadPatients() : [],
      visits: (typeof loadVisits === "function") ? loadVisits() : [],
      cases: (typeof casebookLoad === "function") ? casebookLoad() : [],
      quiz: (typeof quizLoadStats === "function") ? quizLoadStats() : null,
      kbTotal: (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) ? KNOWLEDGE_ALL.length : 0,
      kbProvisional: (typeof kbReviewItems === "function") ? kbReviewItems().length : 0
    });
  }

  window.exportAnalyticsCSV = function () {
    var d = _analytics(); if (!d) return;
    _dlDownload("entopic-analytics-" + _stamp() + ".csv",
      csvFrom(["section", "metric", "value"], exportAnalyticsRows(d)), "text/csv");
  };

  window.exportCasebookCSV = function () {
    var cases = (typeof casebookLoad === "function") ? casebookLoad() : [];
    _dlDownload("entopic-casebook-" + _stamp() + ".csv",
      csvFrom(EXPORT_CASEBOOK_COLS, exportCasebookRows(cases)), "text/csv");
  };
  window.exportCasebookJSON = function () {
    var cases = (typeof casebookLoad === "function") ? casebookLoad() : [];
    _dlDownload("entopic-casebook-" + _stamp() + ".json", JSON.stringify(cases, null, 2), "application/json");
  };

  window.exportRecordsCSV = function () {
    var patients = (typeof loadPatients === "function") ? loadPatients() : [];
    var visits = (typeof loadVisits === "function") ? loadVisits() : [];
    _dlDownload("entopic-records-" + _stamp() + ".csv",
      csvFrom(EXPORT_RECORDS_COLS, exportRecordsRows(patients, visits)), "text/csv");
  };

  window.exportResearchCSV = function () {
    var d = _analytics(); if (!d) return;
    var rows = exportResearchRows(d);
    _dlDownload("entopic-research-deidentified-" + _stamp() + ".csv",
      rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n"), "text/csv");
  };

  /* Role-appropriate export card for a home tab. */
  window.dataExportCard = function () {
    var role = (typeof effectiveRole === "function") ? effectiveRole() : "clinician";
    var admin = (typeof isAdmin === "function") && isAdmin();
    var btns = '<button class="btn btn-s" onclick="exportAnalyticsCSV()" style="font-size:.6rem">Analytics CSV</button> ' +
               '<button class="btn btn-s" onclick="exportCasebookCSV()" style="font-size:.6rem">Casebook CSV</button>';
    if (admin || role === "clinician") btns += ' <button class="btn btn-s" onclick="exportRecordsCSV()" style="font-size:.6rem">Records CSV</button>';
    if (admin || role === "researcher") btns += ' <button class="btn btn-s" onclick="exportResearchCSV()" style="font-size:.6rem">Research CSV (de-identified)</button>';
    if (admin) btns += ' <button class="btn btn-s" onclick="exportAllData()" style="font-size:.6rem">Full backup JSON</button>';
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">⭳ Data export</div>' +
      '<div class="home-settings-desc">Open formats for spreadsheets and analysis.' +
        ((admin || role === "researcher") ? ' Research exports are de-identified (no patient identifiers).' : '') + '</div>' +
      '<div class="btn-g" style="gap:6px">' + btns + '</div>' +
    '</div>';
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    csvFrom: csvFrom, csvCell: csvCell,
    exportAnalyticsRows: exportAnalyticsRows, exportCasebookRows: exportCasebookRows,
    exportRecordsRows: exportRecordsRows, exportResearchRows: exportResearchRows,
    EXPORT_CASEBOOK_COLS: EXPORT_CASEBOOK_COLS, EXPORT_RECORDS_COLS: EXPORT_RECORDS_COLS
  };
}
