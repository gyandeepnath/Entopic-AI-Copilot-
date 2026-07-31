/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — PATIENT CHART                                          */
/*                                                                  */
/* Opening a patient no longer jumps straight into a blank exam. It  */
/* lands on the CHART: prior visits summarised first (so the         */
/* clinician sees the whole story), then a button to continue an     */
/* in-progress visit or start a follow-up. A follow-up carries the   */
/* patient's history forward automatically. Every access/change is   */
/* recorded in the audit trail shown at the foot of the chart.       */
/*                                                                  */
/* Reads/writes via storage.js (loadVisits/saveVisits, logAudit).    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Open a patient's chart (called from the dashboard). */
function openChart(pid) {
  var patients = loadPatients();
  var pt = null;
  for (var i = 0; i < patients.length; i++) if (patients[i].id === pid) { pt = patients[i]; break; }
  if (!pt) return;
  P = pt; CP = pid;
  if (typeof logAudit === "function") logAudit("chart_opened", "Opened patient chart", { patient_id: pid, visit_id: null });
  showPage("pgChart");
  renderChart();
}

/* Most recent completed visit for the current patient (the "previous visit"). */
function _lastCompletedVisit() {
  var vs = getPatientVisits(CP).filter(function (v) { return v.status === "completed"; });
  return vs[0] || null;
}
function _inProgressVisit() {
  var vs = getPatientVisits(CP).filter(function (v) { return v.status === "in_progress"; });
  return vs[0] || null;
}

/* Leading diagnosis recorded on a visit (from its saved differential). */
function _leadingDx(visit) {
  var dl = (visit.data && visit.data.dxList) || [];
  return dl.length ? dl[0].n + " (" + Math.round((dl[0].prob || 0) * 100) + "%)" : "—";
}

/* Which exam areas hold data — a compact "what was done" summary. */
function _filledSections(v) {
  var d = v.data || {}, out = [];
  if (d.cc || (d.symptoms && d.symptoms.length)) out.push("complaint");
  if (d.va && (d.va.od_un || d.va.od_bva)) out.push("VA");
  if (d.rx && d.rx.od_sph) out.push("refraction");
  if (d.sl && d.sl.findings && d.sl.findings.length) out.push("slit-lamp");
  if (d.iop && d.iop.od) out.push("IOP");
  if (d.fun && ((d.fun.od && d.fun.od.cd_v) || (d.fun.findings && d.fun.findings.length))) out.push("fundus");
  if (d.dxList && d.dxList.length) out.push("diagnosis");
  if (d.plan && (d.plan.mgmt || d.plan.ref_to)) out.push("plan");
  return out;
}

/* Compact digest of one visit (used in the timeline + the "previous visit"
   highlight). `full` adds plan/Rx detail. */
function visitDigest(v, full) {
  var d = v.data || {};
  var when = (v.date || "").slice(0, 10);
  var kind = v.visit_type === "follow_up" ? "Follow-up" : (v.visit_type === "initial" ? "Initial" : "Visit");
  var statusBadge = v.status === "completed"
    ? '<span style="color:var(--sl);font-weight:600">✓ completed</span>'
    : '<span style="color:var(--md)">● in progress</span>';

  var h = '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px">' +
    '<b>' + kind + '</b>' +
    '<span style="font-family:var(--mono);font-size:.62rem;color:var(--sv)">' + esc(when) + '</span>' +
    statusBadge +
    (v._carried_from ? '<span style="font-size:.55rem;color:var(--sv)">· history carried forward</span>' : '') +
    '</div>';

  if (d.cc) h += '<div style="font-size:.68rem;margin-bottom:2px"><b>C/O:</b> ' + esc(d.cc) + '</div>';
  else if (d.symptoms && d.symptoms.length) h += '<div style="font-size:.68rem;margin-bottom:2px"><b>Symptoms:</b> ' + esc(d.symptoms.slice(0, 6).join(", ").replace(/_/g, " ")) + '</div>';

  h += '<div style="font-size:.68rem;margin-bottom:2px"><b>Leading impression:</b> ' + esc(_leadingDx(v)) + '</div>';

  var secs = _filledSections(v);
  if (secs.length) h += '<div style="font-size:.58rem;color:var(--sv)">Recorded: ' + esc(secs.join(" · ")) + '</div>';

  if (full) {
    if (d.rx && d.rx.od_sph) h += '<div style="font-size:.62rem;margin-top:3px"><b>Rx OD:</b> ' + esc(d.rx.od_sph) + '/' + esc(d.rx.od_cyl || "") + 'x' + esc(d.rx.od_ax || "") + (d.rx.od_add ? ' add ' + esc(d.rx.od_add) : '') + '</div>';
    if (d.plan && d.plan.mgmt) h += '<div style="font-size:.62rem"><b>Plan:</b> ' + esc(d.plan.mgmt) + '</div>';
    if (d.plan && d.plan.ref_to) h += '<div style="font-size:.62rem;color:var(--md)"><b>Referral:</b> ' + esc(d.plan.ref_to) + (d.plan.ref_urgency ? ' (' + esc(d.plan.ref_urgency) + ')' : '') + '</div>';
  }
  return h;
}

function renderChart() {
  var el = document.getElementById("chartContent");
  if (!el || !P) return;

  var nm = (P.first_name || "New") + " " + (P.last_name || "Patient");
  var visits = getPatientVisits(CP);
  var completed = visits.filter(function (v) { return v.status === "completed"; });
  var inProg = _inProgressVisit();
  var prev = _lastCompletedVisit();

  var h = '';

  /* — Patient header — */
  h += '<div class="home-hd"><h1>' + escH(nm) + '</h1>' +
    '<div style="display:flex;gap:6px">' +
    (inProg
      ? '<button class="btn btn-p" onclick="continueInProgress()">Continue visit →</button>'
      : '<button class="btn btn-p" onclick="startFollowUpVisit()">' + (completed.length ? 'Start follow-up visit +' : 'Start visit +') + '</button>') +
    '</div></div>';
  h += '<div style="font-size:.7rem;color:var(--sv);margin:-6px 0 14px">' +
    'MRN ' + escH(P.mrn || "") + (P.age ? ' · ' + escH(String(P.age)) + 'y' : '') + (P.sex ? ' · ' + escH(P.sex) : '') +
    ' · ' + completed.length + ' completed visit' + (completed.length === 1 ? '' : 's') + '</div>';

  /* — PREVIOUS VISIT (shown first, prominently) — */
  if (prev) {
    h += '<div class="adv-sec" style="font-size:.7rem">Previous visit — summary</div>';
    h += '<div style="border:1px solid var(--fg);border-left:3px solid var(--bk,#333);border-radius:var(--r);padding:12px;margin-bottom:14px;background:var(--card,transparent)">' +
      visitDigest(prev, true) +
      '<div style="margin-top:6px"><button class="btn btn-s" style="font-size:.58rem" onclick="viewPastVisit(\'' + prev.id + '\')">View full previous visit</button></div>' +
      '</div>';
    if (!inProg && completed.length) {
      h += '<div style="font-size:.62rem;color:var(--sv);margin:-6px 0 14px">Starting a follow-up carries this patient\'s history (ocular, medical, family, social) forward automatically — you record only what\'s new.</div>';
    }
  }

  /* — VISIT TIMELINE — */
  h += '<div class="adv-sec" style="font-size:.7rem">Visit history <span style="color:var(--sv);font-weight:400">· ' + visits.length + ' total</span></div>';
  if (!visits.length) {
    h += '<div style="font-size:.66rem;color:var(--sv);padding:8px">No visits yet.</div>';
  } else {
    h += '<div style="border:1px solid var(--fg);border-radius:var(--r);overflow:hidden;margin-bottom:16px">';
    for (var i = 0; i < visits.length; i++) {
      var v = visits[i];
      h += '<div style="padding:10px 12px;' + (i < visits.length - 1 ? 'border-bottom:1px solid var(--fg);' : '') + 'display:flex;gap:8px;align-items:flex-start">' +
        '<div style="flex:1">' + visitDigest(v, false) + '</div>' +
        '<button class="btn btn-s" style="font-size:.55rem;white-space:nowrap" onclick="' +
        (v.status === "in_progress" ? "continueInProgress()" : "viewPastVisit('" + v.id + "')") + '">' +
        (v.status === "in_progress" ? "Continue" : "View") + '</button>' +
        '</div>';
    }
    h += '</div>';
  }

  /* — PATIENT DOCUMENTS (digitised prior reports, kept across visits) — */
  h += '<div class="adv-sec" style="font-size:.7rem">Documents &amp; prior reports</div>';
  h += '<div style="margin-bottom:16px">' +
    (typeof attachBlock === "function" ? attachBlock("patient") : "") +
    '</div>';

  /* — CONTINUOUS CLINICAL RECORD (clinical review CL-3) — */
  h += renderContinuousRecord();

  /* — AUDIT / ACCESS LOG — */
  h += renderPatientAudit();

  el.innerHTML = h;
}

/* Access + change log for this patient (who did what, when). */
/* The continuous clinical record: one scrollable chronological narrative of
   every visit — normal AND abnormal findings — with the clinician, timestamp
   and interval between consecutive visits. This is what someone continuing a
   patient needs to read, rather than a set of separate visit cards. */
function renderContinuousRecord() {
  if (typeof recContinuousHtml !== "function" || !CP) return '';
  return '<div class="home-settings" style="margin-top:10px">' +
    '<div class="home-settings-title">📋 Continuous clinical record</div>' +
    '<div class="home-settings-desc">Every visit in order, as recorded. Entries amended after the day they were written are marked.</div>' +
    '<div style="max-height:60vh;overflow-y:auto;margin-top:6px">' + recContinuousHtml(CP) + '</div>' +
  '</div>';
}

function renderPatientAudit() {
  var events = (typeof getPatientAudit === "function") ? getPatientAudit(CP) : [];
  var h = '<details style="margin-bottom:20px"><summary style="cursor:pointer;font-size:.62rem;color:var(--sv);text-transform:uppercase;letter-spacing:.6px">Access &amp; change log (' + events.length + ')</summary>';
  if (!events.length) {
    h += '<div style="font-size:.62rem;color:var(--sv);padding:8px">No recorded activity.</div>';
  } else {
    h += '<div style="border:1px solid var(--fg);border-radius:var(--r);overflow:hidden;margin-top:6px">';
    for (var i = 0; i < Math.min(events.length, 200); i++) {
      var e = events[i];
      h += '<div style="padding:5px 10px;' + (i < events.length - 1 ? 'border-bottom:1px solid var(--fg);' : '') + 'display:flex;gap:8px;font-size:.58rem">' +
        '<span style="font-family:var(--mono);color:var(--sv);white-space:nowrap">' + esc((e.ts || "").replace("T", " ").slice(0, 16)) + '</span>' +
        '<span style="font-weight:600;white-space:nowrap">' + esc(e.user_name || e.user || "—") + '</span>' +
        '<span style="flex:1">' + esc(_auditLabel(e.action)) + (e.details ? ' — ' + esc(e.details) : '') + '</span>' +
        '</div>';
    }
    h += '</div>';
  }
  return h + '</details>';
}

function _auditLabel(action) {
  var map = {
    patient_created: "Patient created",
    chart_opened: "Opened chart",
    visit_started: "Started visit",
    visit_continued: "Continued visit",
    visit_viewed: "Viewed past visit",
    visit_completed: "Completed visit",
    data_exported: "Exported data"
  };
  return map[action] || action;
}

/* Start a new visit. If prior completed visits exist, carry the patient's
   relatively-static history forward so the clinician only records what's new. */
function startFollowUpVisit() {
  var visits = loadVisits();
  var prior = _lastCompletedVisit();
  var nv = blankVisit();
  var carried = false;
  if (prior && prior.data) {
    ["hxO", "hxM", "hxF", "hxS"].forEach(function (k) {
      if (prior.data[k]) { try { nv[k] = JSON.parse(JSON.stringify(prior.data[k])); carried = true; } catch (e) {} }
    });
    if (carried) nv._carried_from = prior.id;
  }
  var vid = "v" + Date.now().toString(36);
  CV = vid; V = nv;
  visits.push({
    id: vid, patient_id: CP, data: V,
    status: "in_progress",
    visit_type: prior ? "follow_up" : "initial",
    date: new Date().toISOString(), updated: new Date().toISOString()
  });
  saveVisits(visits);
  if (typeof logAudit === "function") logAudit("visit_started",
    (prior ? "Follow-up visit started" : "Initial visit started") + (carried ? " (history carried forward)" : ""),
    { patient_id: CP, visit_id: vid });
  openExam();
}

/* Resume the in-progress visit for this patient. */
function continueInProgress() {
  var ip = _inProgressVisit();
  if (!ip) { startFollowUpVisit(); return; }
  CV = ip.id; V = ip.data || blankVisit();
  if (typeof logAudit === "function") logAudit("visit_continued", "Resumed in-progress visit", { patient_id: CP, visit_id: ip.id });
  openExam();
}

/* View a completed visit read-only (as a printable-style summary modal). */
function viewPastVisit(vid) {
  var visits = loadVisits();
  var v = null;
  for (var i = 0; i < visits.length; i++) if (visits[i].id === vid) { v = visits[i]; break; }
  if (!v) return;
  if (typeof logAudit === "function") logAudit("visit_viewed", "Viewed past visit (read-only)", { patient_id: CP, visit_id: vid });

  var host = document.getElementById("pastVisitOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "pastVisitOverlay";
    host.className = "engine-map-overlay";
    host.addEventListener("click", function (e) { if (e.target === host) host.style.display = "none"; });
    document.body.appendChild(host);
  }
  host.innerHTML = '<div class="engine-map-box" style="max-width:720px">' +
    '<div class="engine-map-head"><b>Past visit — read only</b>' +
    '<span style="font-size:.6rem;color:var(--sv);margin-left:8px">' + esc((v.date || "").slice(0, 10)) + ' · ' + (v.visit_type === "follow_up" ? "Follow-up" : "Initial") + '</span>' +
    '<span style="flex:1"></span>' +
    '<button class="engine-map-x" onclick="document.getElementById(\'pastVisitOverlay\').style.display=\'none\'">✕</button></div>' +
    '<div style="padding:16px;overflow:auto">' + fullVisitHTML(v) + '</div></div>';
  host.style.display = "flex";
}

/* Full read-only clinical summary of a visit — every recorded section. */
function fullVisitHTML(v) {
  var d = v.data || {};
  var out = "";
  function sec(title, inner) { if (inner) out += '<div style="margin-bottom:10px"><div style="font-size:.56rem;text-transform:uppercase;letter-spacing:.6px;color:var(--sv);border-bottom:1px solid var(--fg);margin-bottom:3px">' + title + '</div>' + inner + '</div>'; }
  function row(label, val) { return val ? '<div style="font-size:.66rem"><b>' + esc(label) + ':</b> ' + esc(String(val)) + '</div>' : ''; }
  function eyes(label, od, os) { return (od || os) ? '<div style="font-size:.66rem"><b>' + esc(label) + ':</b> OD ' + esc(od || "—") + ' · OS ' + esc(os || "—") + '</div>' : ''; }

  /* Complaint */
  var comp = row("Chief complaint", d.cc);
  if (d.symptoms && d.symptoms.length) comp += '<div style="font-size:.62rem;color:var(--sl)">Symptoms: ' + esc(d.symptoms.join(", ").replace(/_/g, " ")) + '</div>';
  if (d.temporal && (d.temporal.onset || d.temporal.duration || d.temporal.course)) comp += '<div style="font-size:.62rem;color:var(--sl)">Onset ' + esc(d.temporal.onset || "—") + ' · ' + esc(d.temporal.duration || "—") + ' · ' + esc(d.temporal.course || "—") + '</div>';
  sec("Presenting complaint", comp);

  /* History */
  var hx = "";
  if (d.hxO) hx += row("Ocular history", d.hxO.conditions) + row("Ocular surgery", d.hxO.surgeries) + row("CL wear", d.hxO.cl_type);
  if (d.hxM) { hx += row("Medical history", d.hxM.conditions) + row("Medications", d.hxM.medications) + row("Allergies", d.hxM.allergies);
    var flags = []; ["dm", "htn", "thyroid", "autoimmune", "asthma"].forEach(function (k) { if (d.hxM[k]) flags.push(k.toUpperCase()); });
    if (flags.length) hx += row("Systemic flags", flags.join(", ")); }
  if (d.hxF && d.hxF.details) hx += row("Family history", d.hxF.details);
  sec("History", hx);

  /* Vision & refraction */
  var vis = "";
  if (d.va) { vis += eyes("VA unaided", d.va.od_un, d.va.os_un) + eyes("VA aided", d.va.od_aid, d.va.os_aid) + eyes("Best VA", d.va.od_bva, d.va.os_bva) + eyes("Near", d.va.od_near, d.va.os_near); }
  if (d.rx && (d.rx.od_sph || d.rx.os_sph)) {
    vis += '<div style="font-size:.66rem"><b>Rx OD:</b> ' + esc(d.rx.od_sph || "") + ' / ' + esc(d.rx.od_cyl || "") + ' x ' + esc(d.rx.od_ax || "") + (d.rx.od_add ? ' add ' + esc(d.rx.od_add) : '') + '</div>';
    vis += '<div style="font-size:.66rem"><b>Rx OS:</b> ' + esc(d.rx.os_sph || "") + ' / ' + esc(d.rx.os_cyl || "") + ' x ' + esc(d.rx.os_ax || "") + (d.rx.os_add ? ' add ' + esc(d.rx.os_add) : '') + '</div>';
  }
  sec("Vision & refraction", vis);

  /* Anterior segment / IOP */
  var ant = "";
  if (d.iop && (d.iop.od || d.iop.os)) ant += eyes("IOP", d.iop.od, d.iop.os);
  if (d.sl && d.sl.od) ant += row("Cornea", (d.sl.od.cornea || "") + " / " + (d.sl.os ? d.sl.os.cornea || "" : "")) + row("AC cells", (d.sl.od.cells || "0"));
  if (d.sl && d.sl.findings && d.sl.findings.length) ant += '<div style="font-size:.62rem;color:var(--sl)">SL findings: ' + esc(d.sl.findings.join(", ")) + '</div>';
  if (d.gon && (d.gon.od && d.gon.od.s)) ant += row("Gonioscopy OD", d.gon.od.s);
  sec("Anterior segment & IOP", ant);

  /* Posterior / neuro */
  var post = "";
  if (d.fun && d.fun.od && d.fun.od.cd_v) post += eyes("C/D ratio", d.fun.od.cd_v, d.fun.os ? d.fun.os.cd_v : "");
  if (d.fun && d.fun.findings && d.fun.findings.length) post += '<div style="font-size:.62rem;color:var(--sl)">Fundus findings: ' + esc(d.fun.findings.join(", ")) + '</div>';
  if (d.pupil && d.pupil.rapd && d.pupil.rapd !== "None") post += row("RAPD", d.pupil.rapd);
  if (d.neuro && d.neuro.notes) post += row("Neuro", d.neuro.notes);
  if (d.inv && (d.inv.oct_rnfl_od || d.inv.vf_md_od || d.inv.notes)) post += row("Investigations", (d.inv.notes || "") + (d.inv.oct_rnfl_od ? " RNFL OD " + d.inv.oct_rnfl_od : ""));
  sec("Posterior segment & neuro", post);

  /* Assessment & plan */
  var asmt = "";
  if (d.dxList && d.dxList.length) {
    asmt += '<div style="font-size:.66rem;margin-bottom:2px"><b>Differential (recorded):</b></div>';
    for (var i = 0; i < Math.min(d.dxList.length, 6); i++) asmt += '<div style="font-size:.62rem;color:var(--sl);padding-left:8px">' + (i + 1) + '. ' + esc(d.dxList[i].n) + ' — ' + Math.round((d.dxList[i].prob || 0) * 100) + '%' + (d.dxList[i].urgent ? ' ⚠' : '') + '</div>';
  }
  if (d.plan) asmt += row("Management", d.plan.mgmt) + row("Follow-up", d.plan.followup) + row("Referral", d.plan.ref_to ? d.plan.ref_to + (d.plan.ref_urgency ? " (" + d.plan.ref_urgency + ")" : "") : "") + row("Patient education", d.plan.education);
  sec("Assessment & plan", asmt);

  if (!out) out = '<div style="color:var(--sv);font-size:.66rem">No recorded details for this visit.</div>';
  return out;
}
