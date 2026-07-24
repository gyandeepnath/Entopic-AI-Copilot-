/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ANALYTICS                                             */
/*                                                                  */
/* Aggregate views over the data already on the device: accounts,   */
/* visits (their engine output), the teaching casebook, quiz        */
/* progress and KB coverage. Each ROLE sees the analytics relevant   */
/* to it; the researcher view is strictly DE-IDENTIFIED aggregate    */
/* (counts and distributions — never a name, MRN or DOB).           */
/*                                                                  */
/* GUARDRAILS: read-only and display-only — nothing here feeds the  */
/* engine or changes data. No PII in any aggregate shown to a        */
/* researcher. Offline, no network, no LLM.                         */
/*                                                                  */
/* Pure core first (Node-testable); DOM rendering guarded at bottom. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── small helpers ── */
function anCount(arr, pred) { var n = 0; for (var i = 0; i < arr.length; i++) if (pred(arr[i])) n++; return n; }
function anTop(map, n) {
  var out = [];
  for (var k in map) if (map.hasOwnProperty(k)) out.push({ key: k, n: map[k] });
  out.sort(function (a, b) { return b.n - a.n || (a.key < b.key ? -1 : 1); });
  return (n ? out.slice(0, n) : out);
}

/* Leading diagnosis of a stored visit (from the engine output it saved). */
function anVisitLeadDx(v) {
  var d = v && v.data && v.data.dxList;
  if (d && d.length && d[0] && d[0].cat !== "system" && d[0].cat !== "error") return d[0];
  return null;
}
function anVisitDomain(v) {
  var d = anVisitLeadDx(v);
  return d ? (d.domain || "") : "";
}
function anVisitHadRedFlag(v) {
  var a = v && v.data && v.data.alerts;
  return !!(a && a.some(function (x) { return x.l === "urgent"; }));
}
function anVisitCompletion(v) {
  var c = v && v.data && v.data.completed;
  return c ? c.length : 0;
}


/* ── the one computation everything renders from ──
   data = { users, patients, visits, cases, quiz, kbTotal, kbProvisional } */
function analyticsCompute(data) {
  data = data || {};
  var users    = data.users || [];
  var patients = data.patients || [];
  var visits   = data.visits || [];
  var cases    = data.cases || [];
  var quiz     = data.quiz || { asked: 0, correct: 0, streak: 0, best: 0 };

  /* accounts by role (tolerate null / malformed user entries) */
  var roleCounts = { student: 0, clinician: 0, faculty: 0, other: 0 };
  for (var u = 0; u < users.length; u++) {
    var r = users[u] ? users[u].role : null;
    if (roleCounts[r] === undefined) roleCounts.other++; else roleCounts[r]++;
  }

  /* patients: real vs practice (tolerate nulls) */
  var realP     = anCount(patients, function (p) { return p && !p.practice; });
  var practiceP = patients.length - realP;

  /* visits: completion, red-flags, diagnosis + domain distributions */
  var dxMap = {}, domMap = {}, redFlagVisits = 0, completedVisits = 0, stepSum = 0;
  for (var i = 0; i < visits.length; i++) {
    var v = visits[i];
    if (!v) continue;
    if (v.status === "completed") completedVisits++;
    if (anVisitHadRedFlag(v)) redFlagVisits++;
    stepSum += anVisitCompletion(v);
    var lead = anVisitLeadDx(v);
    if (lead) { dxMap[lead.n] = (dxMap[lead.n] || 0) + 1; }
    var dom = anVisitDomain(v);
    if (dom) domMap[dom] = (domMap[dom] || 0) + 1;
  }

  /* casebook: by condition, by domain, reviewed */
  var caseCondMap = {}, caseDomMap = {}, reviewed = 0;
  for (var c = 0; c < cases.length; c++) {
    var e = cases[c];
    if (!e) continue;
    if (e.reviewed) reviewed++;
    if (e.title) caseCondMap[e.title] = (caseCondMap[e.title] || 0) + 1;
    var cdom = (e.state && e.state.assessment && e.state.assessment[0] && e.state.assessment[0].domain) || "";
    if (cdom) caseDomMap[cdom] = (caseDomMap[cdom] || 0) + 1;
  }

  return {
    accounts: { total: users.length, byRole: roleCounts },
    patients: { total: patients.length, real: realP, practice: practiceP },
    visits: {
      total: visits.length,
      completed: completedVisits,
      redFlagVisits: redFlagVisits,
      redFlagRate: visits.length ? redFlagVisits / visits.length : 0,
      avgSteps: visits.length ? stepSum / visits.length : 0,
      topDx: anTop(dxMap, 8),
      byDomain: anTop(domMap, 0)
    },
    casebook: {
      total: cases.length,
      reviewed: reviewed,
      pending: cases.length - reviewed,
      byCondition: anTop(caseCondMap, 8),
      byDomain: anTop(caseDomMap, 0)
    },
    quiz: {
      asked: quiz.asked || 0,
      correct: quiz.correct || 0,
      accuracy: quiz.asked ? (quiz.correct || 0) / quiz.asked : 0,
      streak: quiz.streak || 0,
      best: quiz.best || 0
    },
    kb: { total: data.kbTotal || 0, provisional: data.kbProvisional || 0,
          verified: (data.kbTotal || 0) - (data.kbProvisional || 0) }
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM RENDERING (browser only)                                    */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  var _anEsc = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* Gather live data and compute. */
  function _anData() {
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

  /* A horizontal bar-row list (no libraries). rows = [{key,n}] */
  function _anBars(rows, opts) {
    opts = opts || {};
    if (!rows || !rows.length) return '<div class="an-empty">No data yet.</div>';
    var max = 0; for (var i = 0; i < rows.length; i++) max = Math.max(max, rows[i].n);
    var h = '<div class="an-bars">';
    for (var j = 0; j < rows.length; j++) {
      var pct = max ? Math.round(rows[j].n / max * 100) : 0;
      h += '<div class="an-bar-row">' +
        '<div class="an-bar-label" title="' + _anEsc(rows[j].key) + '">' + _anEsc(opts.pretty ? opts.pretty(rows[j].key) : rows[j].key) + '</div>' +
        '<div class="an-bar-track"><div class="an-bar-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="an-bar-n">' + rows[j].n + '</div>' +
      '</div>';
    }
    return h + '</div>';
  }

  function _anStat(v, l) { return '<div class="stat"><div class="v">' + v + '</div><div class="l">' + _anEsc(l) + '</div></div>'; }
  function _anPct(x) { return Math.round(x * 100) + "%"; }
  function _anSection(title, body) { return '<div class="an-sec"><div class="an-sec-t">' + _anEsc(title) + '</div>' + body + '</div>'; }

  /* ── Role-tailored analytics body ── */
  function _anBody(role) {
    var d = _anData();
    if (role === "student")   return _anStudent(d);
    if (role === "faculty")   return _anFaculty(d);
    if (role === "researcher") return _anResearcher(d);
    if (role === "admin")     return _anAdmin(d);
    return _anClinician(d);   /* clinician default */
  }

  function _anStudent(d) {
    return _anSection("My learning",
      '<div class="stats">' + _anStat(d.quiz.asked, "Quiz questions") + _anStat(_anPct(d.quiz.accuracy), "Accuracy") +
        _anStat(d.quiz.best, "Best streak") + '</div>') +
      _anSection("My practice exams",
        '<div class="stats">' + _anStat(d.patients.practice, "Practice exams") +
          _anStat(d.visits.completed, "Completed") + _anStat(d.visits.redFlagVisits, "Red-flag cases seen") + '</div>') +
      _anSection("Conditions I've practised (by area)", _anBars(d.visits.byDomain)) +
      _anSection("My casebook by condition", _anBars(d.casebook.byCondition));
  }

  function _anClinician(d) {
    return _anSection("Caseload",
      '<div class="stats">' + _anStat(d.patients.real, "Patients") + _anStat(d.visits.total, "Visits") +
        _anStat(d.visits.completed, "Completed") + _anStat(_anPct(d.visits.redFlagRate), "Red-flag rate") + '</div>') +
      _anSection("Most frequent impressions", _anBars(d.visits.topDx)) +
      _anSection("Caseload by specialty area", _anBars(d.visits.byDomain));
  }

  function _anFaculty(d) {
    return _anSection("Teaching casebook",
      '<div class="stats">' + _anStat(d.casebook.total, "Cases") + _anStat(d.casebook.reviewed, "Reviewed ✓") +
        _anStat(d.casebook.pending, "Awaiting review") + '</div>') +
      _anSection("Casebook coverage by area", _anBars(d.casebook.byDomain)) +
      _anSection("Cases by condition", _anBars(d.casebook.byCondition)) +
      _anSection("Knowledge base",
        '<div class="stats">' + _anStat(d.kb.total, "Conditions") + _anStat(d.kb.verified, "Verified") +
          _anStat(d.kb.provisional, "Provisional") + '</div>');
  }

  /* Researcher — de-identified aggregate ONLY (no PII anywhere). */
  function _anResearcher(d) {
    return '<div class="an-note">De-identified aggregate only — no patient identifiers. Counts and distributions across all encounters on this device.</div>' +
      _anSection("Encounter volume",
        '<div class="stats">' + _anStat(d.visits.total, "Encounters") + _anStat(d.visits.completed, "Completed") +
          _anStat(_anPct(d.visits.redFlagRate), "Red-flag rate") + _anStat((d.visits.avgSteps).toFixed(1), "Avg steps/exam") + '</div>') +
      _anSection("Diagnosis distribution", _anBars(d.visits.topDx)) +
      _anSection("Distribution by specialty area", _anBars(d.visits.byDomain)) +
      _anSection("De-identified teaching corpus",
        '<div class="stats">' + _anStat(d.casebook.total, "Cases") + _anStat(d.casebook.reviewed, "Peer-reviewed") + '</div>' +
        _anBars(d.casebook.byDomain));
  }

  function _anAdmin(d) {
    var roleRows = [
      { key: "Students", n: d.accounts.byRole.student },
      { key: "Clinicians", n: d.accounts.byRole.clinician },
      { key: "Faculty", n: d.accounts.byRole.faculty },
      { key: "Other", n: d.accounts.byRole.other }
    ].filter(function (r) { return r.n > 0; });
    return _anSection("Accounts by role", _anBars(roleRows)) +
      _anSection("Data on this device",
        '<div class="stats">' + _anStat(d.patients.real, "Real records") + _anStat(d.patients.practice, "Practice exams") +
          _anStat(d.visits.total, "Visits") + _anStat(d.casebook.total, "Teaching cases") + '</div>') +
      _anSection("Clinical safety",
        '<div class="stats">' + _anStat(d.visits.redFlagVisits, "Red-flag visits") + _anStat(_anPct(d.visits.redFlagRate), "Red-flag rate") + '</div>') +
      _anSection("Diagnosis distribution (all visits)", _anBars(d.visits.topDx)) +
      _anSection("Activity by specialty area", _anBars(d.visits.byDomain)) +
      _anSection("Knowledge base coverage",
        '<div class="stats">' + _anStat(d.kb.total, "Conditions") + _anStat(d.kb.verified, "Verified") +
          _anStat(d.kb.provisional, "Provisional") + '</div>');
  }

  /* Public: open the analytics modal for a role (defaults to current role;
     admin may pass an explicit role to inspect any cohort's view). */
  window.showAnalytics = function (role) {
    role = role || (typeof effectiveRole === "function" ? effectiveRole() : "clinician");
    if (typeof isAdmin === "function" && isAdmin() && !arguments.length) role = "admin";
    var box = document.getElementById("analyticsContent");
    if (box) {
      var switcher = "";
      if (typeof isAdmin === "function" && isAdmin()) {
        switcher = '<div class="an-switch">Viewing as: ' +
          ["admin", "clinician", "student", "faculty", "researcher"].map(function (r) {
            return '<button class="an-switch-btn' + (r === role ? ' an-switch-on' : '') + '" onclick="showAnalytics(\'' + r + '\')">' + r + '</button>';
          }).join("") + '</div>';
      }
      box.innerHTML = switcher + _anBody(role);
    }
    var m = document.getElementById("modalAnalytics");
    if (m) m.style.display = "flex";
  };

  /* Admin-tab card. */
  window.adminAnalyticsCard = function () {
    var d = _anData();
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📊 Analytics &amp; data</div>' +
      '<div class="home-settings-desc">' + d.visits.total + ' visits · ' + d.casebook.total + ' cases · ' +
        d.accounts.total + ' accounts. Diagnosis mix, red-flag rate, coverage, per-role views.</div>' +
      '<button class="btn btn-p" onclick="showAnalytics(\'admin\')" style="font-size:.62rem">Open analytics</button>' +
    '</div>';
  };

  /* A compact analytics card any role can drop on its home tab. */
  window.analyticsRoleCard = function () {
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📊 My analytics</div>' +
      '<div class="home-settings-desc">Your progress and activity, visualised.</div>' +
      '<button class="btn btn-s" onclick="showAnalytics()" style="font-size:.62rem">Open analytics</button>' +
    '</div>';
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { analyticsCompute: analyticsCompute, anTop: anTop, anVisitLeadDx: anVisitLeadDx };
}
