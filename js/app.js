/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — APP INIT                                              */
/* Authentication, routing, patient/visit management, autosave     */
/* Must be loaded LAST — depends on all other modules              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* GLOBAL STATE                                                    */
/* ═══════════════════════════════════════════════════════════════ */

var CU = null;   /* Current User object */
var CP = null;   /* Current Patient ID */
var CV = null;   /* Current Visit ID */
var P  = {};     /* Current Patient object */
var V  = {};     /* Current Visit data object */
var API_KEY = ""; /* Claude API key */


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE SWITCHING                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function showPage(id) {
  var pages = document.querySelectorAll(".page");
  for (var i = 0; i < pages.length; i++) {
    pages[i].classList.remove("active");
  }
  document.getElementById(id).classList.add("active");
}

function showView(showId, hideId) {
  document.getElementById(showId).style.display = "block";
  document.getElementById(hideId).style.display = "none";
}


/* ═══════════════════════════════════════════════════════════════ */
/* MODAL HELPERS                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function openModal(id) {
  document.getElementById(id).style.display = "flex";
}

function closeModal(id) {
  document.getElementById(id).style.display = "none";
}

function saveApiKeyFromModal() {
  var inp = document.getElementById("inp_apikey");
  var key = inp ? inp.value.trim() : "";
  if (!key) {
    alert("Please paste your API key.");
    return;
  }
  saveApiKey(key);
  API_KEY = key;
  var status = document.getElementById("apiKeyStatus");
  if (status) status.textContent = "✓ API key saved successfully.";
  closeModal("modalApiKey");
  /* Re-render home if we're on home page */
  if (document.getElementById("pgHome").classList.contains("active")) {
    renderHome();
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* AUTHENTICATION                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function doLogin() {
  var u = document.getElementById("inp_lu").value.trim();
  var p = document.getElementById("inp_lp").value;
  var errEl = document.getElementById("loginErr");

  if (!u || !p) {
    errEl.textContent = "Enter username and password";
    errEl.style.display = "block";
    return;
  }

  /* Super-admin sign-in: pre-set id + password (hash-checked), everything
     unlocked at full limits. The admin session is ephemeral — never stored
     in the users list. */
  if (typeof adminCheckCredentials === "function" && adminCheckCredentials(u, p)) {
    CU = adminSessionUser();
    errEl.style.display = "none";
    if (typeof roleSessionReset === "function") roleSessionReset();
    showHomePage();
    return;
  }

  var users = loadUsers();
  var found = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === u && users[i].password === p) {
      found = users[i];
      break;
    }
  }

  if (!found) {
    errEl.textContent = "Invalid credentials";
    errEl.style.display = "block";
    return;
  }

  CU = found;
  errEl.style.display = "none";
  /* Fresh role state per sign-in: this account's own saved role (CU.role)
     drives the workspace, never a leftover from another account. */
  if (typeof roleSessionReset === "function") roleSessionReset();
  showHomePage();
}

function doSetup() {
  var name   = document.getElementById("inp_sn").value.trim();
  var cred   = document.getElementById("inp_sc").value;
  var clinic = document.getElementById("inp_scl").value.trim() || "Clinic";
  var uname  = document.getElementById("inp_su").value.trim();
  var pw     = document.getElementById("inp_sp").value;

  if (!name || !uname || !pw) {
    alert("Please fill all fields.");
    return;
  }

  var users = loadUsers();
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === uname) {
      alert("Username already taken.");
      return;
    }
  }

  /* "Using Entopic as" — the mode chosen at signup; switchable any time. */
  var roleSel = document.getElementById("inp_sr");
  var role = roleSel ? roleSel.value : "clinician";

  var user = {
    id: "u" + Date.now().toString(36),
    username: uname,
    password: pw,
    name: name,
    cred: cred,
    clinic: clinic,
    role: role,
    created: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  CU = user;
  if (typeof roleSessionReset === "function") roleSessionReset();
  if (typeof setActiveRole === "function") setActiveRole(role);
  showHomePage();
}

function doLogout() {
  CU = null;
  CP = null;
  CV = null;
  P = {};
  V = {};
  if (typeof roleSessionReset === "function") roleSessionReset();
  showPage("pgLogin");
}


/* ═══════════════════════════════════════════════════════════════ */
/* HOME PAGE                                                       */
/* ═══════════════════════════════════════════════════════════════ */

function showHomePage() {
  API_KEY = loadApiKey();
  showPage("pgHome");

  document.getElementById("homeClinic").textContent = CU.clinic;
  document.getElementById("homeUser").textContent = CU.name + ", " + CU.cred;

  renderHome();

  /* First sign-in on an account that never chose a mode → ask who's using it.
     (Checked on the ACCOUNT, not the device, so one person's choice never
     silently applies to a different account on the same machine.) */
  if (CU && !CU.role && typeof showRolePicker === "function") {
    showRolePicker();
  }
}

/* The home screen is now ROLE-AWARE: a mode switcher + a role-specific set of
   TABS + the active tab's content. Each role (Student / Clinician / Faculty)
   opens to a differently-organised workspace, switchable on one account. The
   exam flow, engine and KB are untouched — this reorganises the front door
   only. See docs/ROLES_AND_MODES.md. */
var HOME_TAB = null;

function renderHome() {
  var role = (typeof effectiveRole === "function") ? effectiveRole() : "clinician";
  var def  = (typeof roleDef === "function" && roleDef(role)) ? roleDef(role) : null;
  var tabs = (def && def.tabs) ? def.tabs
    : [{ id: "patients", label: "Patients" }, { id: "casebook", label: "Casebook" },
       { id: "kb", label: "Reference" }, { id: "account", label: "Account" }];

  /* Super admin gets an extra Admin tab on top of whatever mode is active. */
  if (typeof isAdmin === "function" && isAdmin()) {
    tabs = tabs.concat([{ id: "admin", label: "Admin" }]);
  }

  if (!HOME_TAB || !homeTabsInclude(tabs, HOME_TAB)) HOME_TAB = tabs[0].id;

  document.getElementById("homeContent").innerHTML =
    roleSwitcherStrip(role) +
    homeTabStrip(tabs, HOME_TAB) +
    '<div class="home-tabbody">' + renderHomeTab(role, HOME_TAB) + '</div>';

  /* Reveal the KB Editor button only for the build owner (async check); the
     slot only exists on the tabs that show the KB card. */
  if (typeof kbEditorAllowed === "function") {
    kbEditorAllowed(function (allowed) {
      var slot = document.getElementById("kbEditorCardSlot");
      if (slot && allowed) {
        slot.innerHTML = ' <button class="btn btn-p" onclick="openKbEditor()" style="font-size:.62rem;margin-left:6px">✎ Edit / Add conditions</button>';
      }
    });
  }
}

function homeTabsInclude(tabs, id) { for (var i = 0; i < tabs.length; i++) if (tabs[i].id === id) return true; return false; }
function setHomeTab(id) { HOME_TAB = id; renderHome(); }

/* Mode identity + one-tap switcher (always visible → habit-forming). */
function roleSwitcherStrip(role) {
  var def = (typeof roleDef === "function" && roleDef(role)) ? roleDef(role) : { label: role, icon: "" };
  var tier = (typeof tierLabel === "function") ? tierLabel() : "Free";
  return '<div class="role-strip">' +
      '<div class="role-strip-id">' +
        '<span class="role-strip-icon">' + (def.icon || "") + '</span>' +
        '<div><div class="role-strip-label">' + escH(def.label || role) + '</div>' +
        '<div class="role-strip-tier">' + escH(tier) + ' plan · learning always free</div></div>' +
      '</div>' +
      '<button class="btn btn-s role-switch-btn" onclick="showRolePicker()" style="font-size:.6rem">Switch mode ▾</button>' +
    '</div>';
}

function homeTabStrip(tabs, active) {
  var h = '<div class="home-tabs">';
  for (var i = 0; i < tabs.length; i++) {
    h += '<button class="home-tab' + (tabs[i].id === active ? ' home-tab-on' : '') +
      '" onclick="setHomeTab(\'' + tabs[i].id + '\')">' + escH(tabs[i].label) + '</button>';
  }
  return h + '</div>';
}

function renderHomeTab(role, tab) {
  switch (tab) {
    case "study":    return homeSecStudy();
    case "teaching": return homeSecTeaching();
    case "casebook": return homeSecCasebook();
    case "kb":       return homeSecKB();
    case "account":  return homeSecAccount();
    case "admin":    return homeSecAdmin();
    case "research": return homeSecResearch();
    case "patients": /* fall through */
    default:         return homeSecPatients();
  }
}

/* Researcher portal — de-identified aggregate analytics + the teaching corpus. */
function homeSecResearch() {
  var visits = (typeof loadVisits === "function") ? loadVisits().length : 0;
  var cases  = (typeof casebookLoad === "function") ? casebookLoad().length : 0;
  return '<div class="home-hd"><h1>Research</h1></div>' +
    '<div class="study-hero">De-identified aggregate research view — diagnosis distributions, red-flag rates and the reviewed teaching corpus. No patient identifiers anywhere.</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📊 Aggregate analytics</div>' +
      '<div class="home-settings-desc">' + visits + ' encounters · ' + cases + ' de-identified cases on this device.</div>' +
      '<button class="btn btn-p" onclick="showAnalytics(\'researcher\')" style="font-size:.62rem">Open research analytics</button>' +
    '</div>' +
    homeCardCasebook() +
    homeCardKB();
}

/* ── Practice vs real record segregation ──────────────────────────
   Student "practice exams" are learning artifacts. They must NEVER show
   in the Clinician Patients tab or count in clinical stats — only in the
   student's own Study workspace. These helpers are the single source of
   that split. */
function realPatients()     { return loadPatients().filter(function (p) { return !p.practice; }); }
function practicePatients() { return loadPatients().filter(function (p) { return !!p.practice; }); }
function realVisitIds() {
  var real = {}; var ps = realPatients();
  for (var i = 0; i < ps.length; i++) real[ps[i].id] = true;
  return real;
}

/* One patient row (shared by the Patients tab and the Study tab's practice
   list). Practice records carry a visible chip everywhere. */
function patientRowHtml(pt) {
  var nm = (pt.first_name || "New") + " " + (pt.last_name || "Patient");
  var lastV = getLastVisit(pt.id);
  var status = lastV && lastV.status === "completed"
    ? '<span style="color:var(--sl);font-size:.54rem;font-weight:600"> ✓</span>'
    : '<span style="color:var(--md);font-size:.54rem"> ●</span>';
  return '<div class="p-row" onclick="openPatient(\'' + pt.id + '\')">' +
    '<div><b>' + escH(nm) + '</b>' + (pt.practice ? ' <span class="practice-chip">practice</span>' : '') + status + '</div>' +
    '<span style="font-family:var(--mono);color:var(--sv);font-size:.6rem">' + escH(pt.mrn || "") + '</span>' +
  '</div>';
}

/* ── Reusable cards ── */
function homeCardCasebook() {
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">📚 Teaching Casebook</div>' +
    '<div class="home-settings-desc">' + (typeof casebookHomeSummary === "function" ? casebookHomeSummary() : "De-identified teaching cases.") + '</div>' +
    '<button class="btn btn-s" onclick="showCasebook()" style="font-size:.62rem">Open casebook</button>' +
  '</div>';
}
function homeCardKB() {
  var n = (typeof KNOWLEDGE_ALL !== "undefined" && Array.isArray(KNOWLEDGE_ALL)) ? KNOWLEDGE_ALL.length : 0;
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">📋 Knowledge Base</div>' +
    '<div class="home-settings-desc">' + n + ' conditions across ' + (typeof KNOWLEDGE_DOMAINS !== "undefined" ? Object.keys(KNOWLEDGE_DOMAINS).length : "—") + ' domains</div>' +
    '<button class="btn btn-s" onclick="showKBInfo()" style="font-size:.62rem">Browse conditions</button>' +
    '<span id="kbEditorCardSlot"></span>' +
  '</div>';
}
function homeCardTier() {
  var tier = (typeof tierLabel === "function") ? tierLabel() : "Free";
  var isFree = (tier === "Free");
  var pcap = (typeof saveCap === "function") ? saveCap("patients") : Infinity;
  var ccap = (typeof saveCap === "function") ? saveCap("cases") : Infinity;
  var line = isFree
    ? ('Learning is always free and unrestricted — the engine, reasoning, knowledge base and casebook are fully open. The Free plan saves up to ' + pcap + ' patient records and ' + ccap + ' teaching cases.')
    : 'Unlimited saving on your plan.';
  return '<div class="home-settings">' +
    '<div class="home-settings-title">🪪 Plan — ' + escH(tier) + '</div>' +
    '<div class="home-settings-desc">' + line + '</div>' +
    (isFree ? '<span class="soon-badge">Pro / Institutional upgrade — coming soon</span>' : '') +
  '</div>';
}

/* ── Sections (tabs) ── */
function homeSecPatients() {
  /* REAL patients only — practice exams live in the student Study tab. */
  var patients = realPatients();
  var realIds  = realVisitIds();
  var visits   = loadVisits().filter(function (v) { return realIds[v.patient_id]; });
  var today    = new Date().toISOString().slice(0, 10);
  var todayV = visits.filter(function (v) { return v.date && v.date.startsWith(today); });
  var inProg = visits.filter(function (v) { return v.status === "in_progress"; });

  var rows = "";
  if (patients.length === 0) {
    rows = '<div class="p-empty">No patients yet. Click "New Patient" to begin.</div>';
  } else {
    var sorted = patients.slice().reverse();
    for (var i = 0; i < sorted.length; i++) {
      rows += patientRowHtml(sorted[i]);
    }
  }

  var cap = (typeof saveCap === "function") ? saveCap("patients") : Infinity;
  var capNote = (cap !== Infinity)
    ? '<span style="font-size:.58rem;color:var(--sv)">' + patients.length + ' / ' + cap + ' saved (Free)</span>'
    : '<span style="font-size:.58rem;color:var(--sv)">' + getStorageStats().kb + ' KB used</span>';

  return '<div class="home-hd"><h1>Patients</h1>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-p" onclick="newPatient()">+ New Patient</button>' +
        '<button class="btn btn-s" onclick="exportAllData()" style="font-size:.6rem">Export</button>' +
      '</div></div>' +
    '<div class="stats">' +
      '<div class="stat"><div class="v">' + patients.length + '</div><div class="l">Total Patients</div></div>' +
      '<div class="stat"><div class="v">' + todayV.length + '</div><div class="l">Today</div></div>' +
      '<div class="stat"><div class="v">' + inProg.length + '</div><div class="l">In Progress</div></div>' +
    '</div>' +
    '<div class="p-list"><div class="p-list-h"><span>Patients</span>' + capNote + '</div>' + rows + '</div>' +
    (typeof analyticsRoleCard === "function" ? analyticsRoleCard() : "");
}

function homeSecStudy() {
  /* My practice exams — resumable, uncapped (learning is unrestricted). */
  var practice = loadPatients().filter(function (p) { return p.practice; }).reverse();
  var practiceHtml = "";
  if (practice.length) {
    practiceHtml = '<div class="p-list" style="margin-top:8px">' +
      '<div class="p-list-h"><span>My practice exams</span>' +
      '<span style="font-size:.58rem;color:var(--sv)">' + practice.length + ' · never counted against your plan</span></div>';
    for (var i = 0; i < Math.min(practice.length, 8); i++) practiceHtml += patientRowHtml(practice[i]);
    practiceHtml += '</div>';
  }

  var quizLine = (typeof quizStatsSummary === "function") ? quizStatsSummary()
    : "Guess-the-diagnosis practice drawn from the knowledge base and your casebook.";

  return '<div class="home-hd"><h1>Study</h1></div>' +
    '<div class="study-hero">Learn by reasoning. The full diagnostic engine, glass-box "why", knowledge base and casebook are open and free — no restrictions on learning.</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🧠 Quiz — guess the diagnosis</div>' +
      '<div class="home-settings-desc">' + escH(quizLine) + '</div>' +
      '<button class="btn btn-p" onclick="startQuiz()" style="font-size:.62rem">Start quiz</button>' +
    '</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🩺 Practice exam</div>' +
      '<div class="home-settings-desc">Run a full mock exam through the live engine and watch the reasoning build. Practice records are labelled and never count against a save limit.</div>' +
      '<button class="btn btn-s" onclick="newPatient()" style="font-size:.62rem">Start a practice exam</button>' +
    '</div>' +
    practiceHtml +
    (typeof analyticsRoleCard === "function" ? analyticsRoleCard() : "") +
    homeCardCasebook() +
    homeCardKB();
}

function homeSecTeaching() {
  var cases = (typeof casebookLoad === "function") ? casebookLoad() : [];
  var reviewed = cases.filter(function (e) { return e.reviewed; }).length;
  var conds = (typeof casebookGroupByCondition === "function") ? casebookGroupByCondition(cases).length : 0;

  return '<div class="home-hd"><h1>Teaching</h1></div>' +
    '<div class="study-hero">Your educator workspace — build and curate a casebook, sign off cases, refine the knowledge base your students learn from, and track teaching coverage.</div>' +

    /* teaching snapshot */
    '<div class="stats">' +
      '<div class="stat"><div class="v">' + cases.length + '</div><div class="l">Teaching cases</div></div>' +
      '<div class="stat"><div class="v">' + reviewed + '</div><div class="l">Reviewed ✓</div></div>' +
      '<div class="stat"><div class="v">' + conds + '</div><div class="l">Conditions covered</div></div>' +
    '</div>' +

    /* build the casebook */
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📚 Build the casebook</div>' +
      '<div class="home-settings-desc">Run an exemplar exam through the engine and save it as a de-identified teaching case (annotate it with the learning point). Or curate what\'s there.</div>' +
      '<button class="btn btn-p" onclick="newTeachingExam()" style="font-size:.62rem">New exemplar case</button> ' +
      '<button class="btn btn-s" onclick="showCasebook()" style="font-size:.62rem">Open &amp; curate casebook</button>' +
    '</div>' +

    reviewQueueCard() +

    /* KB authoring */
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">✎ Knowledge base</div>' +
      '<div class="home-settings-desc">Browse conditions students study; editors can refine evidence and About notes, and publish updates to all devices.</div>' +
      '<button class="btn btn-s" onclick="showKBInfo()" style="font-size:.62rem">Browse conditions</button>' +
      '<span id="kbEditorCardSlot"></span>' +
    '</div>' +

    /* teaching analytics */
    (typeof analyticsRoleCard === "function" ? analyticsRoleCard() : "") +

    /* student logbooks — honest about the dependency */
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🎓 Student logbooks</div>' +
      '<div class="home-settings-desc">Follow trainees\' reasoned cases across accounts once shared cloud accounts are enabled (backend Phase 2).</div>' +
      '<span class="soon-badge">Coming with shared accounts</span>' +
    '</div>';
}

/* Faculty: start an exemplar exam intended for the casebook (a normal exam;
   the faculty saves it as a teaching case from the report). Not a practice
   record — faculty build real reasoned exemplars. */
function newTeachingExam() { newPatient(); }

/* Faculty review queue: how many saved cases still lack a reviewed sign-off. */
function reviewQueueCard() {
  var list = (typeof casebookLoad === "function") ? casebookLoad() : [];
  var pending = list.filter(function (e) { return !e.reviewed; }).length;
  var desc = list.length === 0
    ? "No cases saved yet. Cases you or trainees save appear here for annotation and sign-off."
    : (pending === 0
        ? "All " + list.length + " cases reviewed ✓"
        : pending + " of " + list.length + " case" + (list.length === 1 ? "" : "s") + " awaiting your review — open the casebook to annotate and sign off.");
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🗂 Case review</div>' +
    '<div class="home-settings-desc">' + escH(desc) + '</div>' +
    '<button class="btn btn-s" onclick="showCasebook()" style="font-size:.62rem">Review cases</button>' +
  '</div>';
}

function homeSecCasebook() { return '<div class="home-hd"><h1>Casebook</h1></div>' + homeCardCasebook(); }
function homeSecKB()       { return '<div class="home-hd"><h1>Reference</h1></div>' + homeCardKB(); }

function homeSecAccount() {
  var apiStatus = API_KEY
    ? '<div class="home-settings-status">✓ API key configured — interpretive remarks active</div>'
    : '<div class="home-settings-status" style="color:var(--md)">⚠ No key — diagnostic engine works offline, interpretive remarks disabled</div>';
  return '<div class="home-hd"><h1>Account</h1></div>' +
    homeCardTier() +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🔑 AI Interpretive Engine (Claude API)</div>' +
      '<div class="home-settings-desc">Optional. Provides clinical remarks and speech parsing. The diagnostic engine runs fully offline without this.</div>' +
      '<button class="btn btn-s" onclick="openModal(\'modalApiKey\')" style="font-size:.62rem">' + (API_KEY ? "Update API Key" : "Configure API Key") + '</button>' +
      apiStatus +
    '</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📁 Data Management</div>' +
      '<div class="home-settings-desc">Import a previous Entopic backup file</div>' +
      '<input type="file" accept=".json" onchange="if(this.files[0])importData(this.files[0])" style="font-size:.62rem">' +
    '</div>' +
    renderCloudCard();
}

/* ── Super-admin panel ──────────────────────────────────────────── */
function homeSecAdmin() {
  if (typeof isAdmin !== "function" || !isAdmin()) return homeSecPatients();

  var stats = getStorageStats();
  var cases = (typeof casebookLoad === "function") ? casebookLoad() : [];
  var users = loadUsers();

  return '<div class="home-hd"><h1>Admin</h1></div>' +
    '<div class="study-hero">Super admin — every feature unlocked, unlimited saving, all modes available. This gate is a convenience lock on a local offline app; real authentication arrives with the backend.</div>' +

    '<div class="stats">' +
      '<div class="stat"><div class="v">' + users.length + '</div><div class="l">Accounts</div></div>' +
      '<div class="stat"><div class="v">' + realPatients().length + '</div><div class="l">Real Records</div></div>' +
      '<div class="stat"><div class="v">' + practicePatients().length + '</div><div class="l">Practice Exams</div></div>' +
      '<div class="stat"><div class="v">' + cases.length + '</div><div class="l">Teaching Cases</div></div>' +
    '</div>' +

    adminUsersByRoleHtml(users) +

    (typeof adminAnalyticsCard === "function" ? adminAnalyticsCard() : "") +

    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🔐 Change admin password</div>' +
      '<div class="home-settings-desc">Stored locally as a hash (never plaintext). Minimum 8 characters.</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<input id="admNewPass" type="password" placeholder="new password" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
        '<input id="admNewPass2" type="password" placeholder="repeat" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
        '<button class="btn btn-p" style="font-size:.6rem" onclick="adminChangePassword()">Update</button>' +
        '<span id="admPassMsg" style="font-size:.58rem;color:var(--sv)"></span>' +
      '</div>' +
    '</div>' +

    reviewQueueAdminCard() +

    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">✎ Knowledge Base Editor</div>' +
      '<div class="home-settings-desc">Full authoring access — add or refine conditions, evidence and About notes.</div>' +
      '<button class="btn btn-s" onclick="openKbEditor()" style="font-size:.62rem">Open KB Editor</button>' +
    '</div>' +

    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📁 Data Management</div>' +
      '<div class="home-settings-desc">Full export / import of everything on this device.</div>' +
      '<button class="btn btn-s" onclick="exportAllData()" style="font-size:.62rem">Export all</button> ' +
      '<input type="file" accept=".json" onchange="if(this.files[0])importData(this.files[0])" style="font-size:.62rem">' +
    '</div>';
}

/* Admin: accounts organised BY ROLE (Student / Clinician / Faculty / other),
   each with its counts, so the admin manages every cohort independently. */
function adminUsersByRoleHtml(users) {
  var ORDER = [
    { id: "student",  label: "🎓 Students / Trainees" },
    { id: "clinician", label: "🩺 Clinicians / Doctors" },
    { id: "faculty",  label: "📚 Faculty / Educators" },
    { id: "__other",  label: "• Other / unset" }
  ];
  var buckets = { student: [], clinician: [], faculty: [], __other: [] };
  for (var i = 0; i < users.length; i++) {
    var r = users[i].role;
    (buckets[r] ? buckets[r] : buckets.__other).push(users[i]);
  }

  var h = "";
  for (var g = 0; g < ORDER.length; g++) {
    var grp = ORDER[g], list = buckets[grp.id];
    if (!list.length) continue;
    var rows = "";
    for (var j = 0; j < list.length; j++) {
      var u = list[j];
      rows += '<div class="p-row" style="cursor:default">' +
        '<div><b>' + escH(u.name || u.username) + '</b>' +
          ' <span style="font-size:.56rem;color:var(--sv)">@' + escH(u.username) + (u.cred ? ' · ' + escH(u.cred) : '') +
          (u.created ? ' · joined ' + escH(String(u.created).slice(0, 10)) : '') + '</span></div>' +
        '<div style="display:flex;gap:4px">' +
          '<button class="btn btn-s" style="font-size:.54rem;padding:2px 7px" onclick="adminSetUserRole(\'' + u.id + '\')">Change mode</button>' +
          '<button class="btn btn-s" style="font-size:.54rem;padding:2px 7px" onclick="adminDeleteUser(\'' + u.id + '\')">Delete</button>' +
        '</div>' +
      '</div>';
    }
    h += '<div class="p-list" style="margin-top:8px">' +
      '<div class="p-list-h"><span>' + grp.label + '</span>' +
      '<span style="font-size:.58rem;color:var(--sv)">' + list.length + ' account' + (list.length === 1 ? '' : 's') + '</span></div>' +
      rows + '</div>';
  }
  if (!h) h = '<div class="p-list" style="margin-top:8px"><div class="p-empty">No local accounts yet.</div></div>';
  return h +
    '<div style="font-size:.56rem;color:var(--sv);padding:4px 2px 2px">Deleting an account removes the sign-in only — patient data on this device is shared and stays until exported/cleared.</div>';
}

/* Admin: reassign an account's mode. */
function adminSetUserRole(uid) {
  if (typeof isAdmin !== "function" || !isAdmin()) return;
  var choice = prompt("Set mode for this account (student / clinician / faculty):", "");
  if (choice === null) return;
  choice = String(choice).trim().toLowerCase();
  if (["student", "clinician", "faculty"].indexOf(choice) === -1) { alert("Enter one of: student, clinician, faculty."); return; }
  var users = loadUsers();
  for (var i = 0; i < users.length; i++) if (users[i].id === uid) { users[i].role = choice; break; }
  saveUsers(users);
  renderHome();
}

/* Clinical review queue card (Admin tab): live count of provisional entries. */
function reviewQueueAdminCard() {
  var n = (typeof kbReviewItems === "function") ? kbReviewItems().length : 0;
  var total = (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) ? KNOWLEDGE_ALL.length : 0;
  var desc = n === 0
    ? "All " + total + " conditions carry a clinical sign-off or curated status. ✓"
    : n + " of " + total + " conditions are provisional (AI-drafted ICD codes, summaries or urgency flags) awaiting YOUR clinical verification.";
  var verified = (typeof kbBuildVerifiedExport === "function") ? kbBuildVerifiedExport().count : 0;
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🩺 Clinical review queue</div>' +
    '<div class="home-settings-desc">' + escH(desc) + '</div>' +
    (n > 0 ? '<button class="btn btn-p" onclick="showReviewQueue()" style="font-size:.62rem">Review &amp; verify</button>'
           : '<button class="btn btn-s" onclick="showReviewQueue()" style="font-size:.62rem">Open queue</button>') +
    (verified > 0 ? ' <button class="btn btn-s" onclick="exportSignoffs()" style="font-size:.62rem">Export ' + verified + ' sign-off' + (verified === 1 ? '' : 's') + ' (bake into source)</button>' : '') +
  '</div>';
}

function adminDeleteUser(uid) {
  if (typeof isAdmin !== "function" || !isAdmin()) return;
  var users = loadUsers();
  var name = "";
  for (var i = 0; i < users.length; i++) if (users[i].id === uid) { name = users[i].username; break; }
  if (!confirm("Delete the account @" + name + "? (Sign-in only — shared patient data stays.)")) return;
  saveUsers(users.filter(function (u) { return u.id !== uid; }));
  renderHome();
}

function adminChangePassword() {
  var a = (document.getElementById("admNewPass") || {}).value || "";
  var b = (document.getElementById("admNewPass2") || {}).value || "";
  var msg = document.getElementById("admPassMsg");
  if (a !== b) { if (msg) msg.textContent = "Passwords don't match."; return; }
  if (typeof adminSetPassword !== "function" || !adminSetPassword(a)) {
    if (msg) msg.textContent = "Too short (min 8 characters).";
    return;
  }
  if (msg) msg.textContent = "✓ Updated — use it from the next sign-in.";
}


/* ── Role picker (startup "who are you here as?" + switch any time) ── */
function showRolePicker() {
  var cur = (typeof getActiveRole === "function") ? getActiveRole() : null;
  var live = (typeof activeRoleCatalogue === "function") ? activeRoleCatalogue() : [];
  var h = '<div class="role-pick-grid">';
  for (var i = 0; i < live.length; i++) {
    var r = live[i];
    h += '<div class="role-card' + (r.id === cur ? ' role-card-on' : '') + '" onclick="pickRole(\'' + r.id + '\')">' +
      '<div class="role-card-icon">' + (r.icon || "") + '</div>' +
      '<div class="role-card-label">' + escH(r.label) + '</div>' +
      '<div class="role-card-blurb">' + escH(r.blurb || "") + '</div>' +
    '</div>';
  }
  h += '</div>';
  var soon = (typeof ENTOPIC_ROLES !== "undefined") ? ENTOPIC_ROLES.filter(function (r) { return r.soon; }) : [];
  if (soon.length) {
    h += '<div class="role-soon-title">More modes coming</div><div class="role-soon-row">';
    for (var s = 0; s < soon.length; s++) {
      h += '<span class="role-soon-chip">' + (soon[s].icon || "") + ' ' + escH(soon[s].label) + '</span>';
    }
    h += '</div>';
  }
  var box = document.getElementById("rolePickerContent");
  if (box) box.innerHTML = h;
  openModal("modalRolePicker");
}

function pickRole(id) {
  if (typeof setActiveRole === "function") setActiveRole(id);
  closeModal("modalRolePicker");
  HOME_TAB = null;   /* reset to the new role's landing tab */
  renderHome();
}


/* ═══════════════════════════════════════════════════════════════ */
/* CLOUD SYNC CARD (optional backup + multi-user)                  */
/* Local-first: the app runs identically without any of this.       */
/* ═══════════════════════════════════════════════════════════════ */

function renderCloudCard() {
  if (typeof cloudStatus !== "function") return "";
  var s = cloudStatus();
  var dot = { live: "#2e7d32", polling: "#b8860b", signedout: "#888",
              noclinic: "#b8860b", disabled: "#888" }[s.state] || "#888";
  var body = "";

  if (s.state === "disabled") {
    body = '<div class="home-settings-status">Cloud sync is turned off. All data stays on this device.</div>';
  } else if (s.state === "signedout") {
    body =
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<input id="cloudEmail" type="email" placeholder="email" style="font-size:.62rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px">' +
        '<input id="cloudPass" type="password" placeholder="password" style="font-size:.62rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px">' +
        '<button class="btn btn-p" style="font-size:.6rem" onclick="cloudUiSignIn()">Sign in</button>' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiSignUp()">Create account</button>' +
      '</div>' +
      '<div id="cloudMsg" class="home-settings-status" style="color:var(--md)">Sign in to back up and sync across devices. Your exam works offline regardless.</div>';
  } else if (s.state === "noclinic") {
    body =
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
        '<input id="cloudClinicName" placeholder="Clinic name" style="font-size:.62rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px">' +
        '<button class="btn btn-p" style="font-size:.6rem" onclick="cloudUiCreateClinic()">Create clinic</button>' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiSignOut()">Sign out</button>' +
      '</div>' +
      '<div id="cloudMsg" class="home-settings-status">Signed in as ' + escH(s.email || "") + '. Create your clinic to start syncing.</div>';
  } else {
    body =
      '<div class="home-settings-status">Signed in as ' + escH(s.email || "") + ' · ' + escH(s.label) + '</div>' +
      '<div style="display:flex;gap:6px;margin-top:4px">' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiSyncNow()">Sync now</button>' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiSignOut()">Sign out</button>' +
      '</div>';
  }

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">' +
      '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + dot + ';margin-right:5px"></span>' +
      '☁ Cloud Sync &amp; Multi-User</div>' +
    '<div class="home-settings-desc">Optional backup and live sync across devices/clinicians. Offline-first: the exam never waits on the network.</div>' +
    body +
  '</div>';
}

function cloudUiMsg(text, ok) {
  var el = document.getElementById("cloudMsg");
  if (el) { el.textContent = text; el.style.color = ok ? "var(--sl)" : "var(--md)"; }
}
function cloudUiSignIn() {
  var e = (document.getElementById("cloudEmail") || {}).value || "";
  var p = (document.getElementById("cloudPass") || {}).value || "";
  if (!e || !p) { cloudUiMsg("Enter email and password.", false); return; }
  cloudUiMsg("Signing in…", true);
  cloudSignIn(e, p, function (err) { if (err) cloudUiMsg("Sign-in failed: " + err.message, false); else renderHome(); });
}
function cloudUiSignUp() {
  var e = (document.getElementById("cloudEmail") || {}).value || "";
  var p = (document.getElementById("cloudPass") || {}).value || "";
  if (!e || !p) { cloudUiMsg("Enter email and password.", false); return; }
  cloudUiMsg("Creating account…", true);
  cloudSignUp(e, p, function (err) { if (err) cloudUiMsg("Sign-up failed: " + err.message, false); else renderHome(); });
}
function cloudUiCreateClinic() {
  var n = (document.getElementById("cloudClinicName") || {}).value || "";
  if (!n) { cloudUiMsg("Enter a clinic name.", false); return; }
  cloudUiMsg("Creating clinic…", true);
  cloudCreateClinic(n, function (err) { if (err) cloudUiMsg("Failed: " + err.message, false); else renderHome(); });
}
function cloudUiSignOut() { cloudSignOut(); renderHome(); }
function cloudUiSyncNow() { if (typeof cloudPull === "function") cloudPull(function () { renderHome(); }); }


/* ═══════════════════════════════════════════════════════════════ */
/* KB INFO MODAL                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function showKBInfo() {
  var h = "";
  /* Version + remote-update status (kb-remote.js) */
  if (typeof kbRemoteStatus === "function") {
    var ks = kbRemoteStatus();
    h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--fg)">' +
      '<span style="font-size:.6rem;color:var(--sl)">v' + escH(ks.version) + ' · ' + escH(ks.source) +
      ' · ' + ks.conditions + ' conditions' +
      (ks.pending ? ' · <b>update ' + escH(ks.pending) + ' ready — applies on next restart</b>' : '') +
      '</span>' +
      '<button class="btn btn-s" style="font-size:.55rem;padding:2px 6px" onclick="kbUiCheckUpdates()">Check for updates</button>' +
      '<span id="kbUpdMsg" style="font-size:.55rem;color:var(--md)"></span>' +
      '</div>';
  }
  if (typeof KNOWLEDGE_DOMAINS !== "undefined") {
    /* search box + scrollable list (so the modal never outgrows the screen) */
    h += '<input class="search-box" placeholder="Search conditions…" oninput="kbInfoFilter(this.value)" style="margin-bottom:8px">';
    h += '<div id="kbInfoList" style="max-height:58vh;overflow-y:auto;padding-right:4px">';
    for (var domain in KNOWLEDGE_DOMAINS) {
      var conds = KNOWLEDGE_DOMAINS[domain];
      h += '<div class="kbinfo-domain" style="margin-bottom:8px">' +
        '<div style="font-weight:600;font-size:.72rem;margin-bottom:2px">' + escH(domain) + ' (' + conds.length + ')</div>';
      for (var i = 0; i < conds.length; i++) {
        var c = conds[i];
        /* human-readable "what to enter" = its required findings */
        var needs = (c.req || []).map(kbPrettyToken).join(", ");
        h += '<div class="kbinfo-row" data-name="' + escH((c.name || "").toLowerCase()) + '" data-keywords="' + escH(kbSearchKeywords(c)) + '" style="font-size:.62rem;color:var(--sl);padding:2px 0 2px 10px">' +
          '<b style="color:var(--ink,#222);font-weight:500">' + escH(c.name) + '</b>' +
          (c.urgent ? ' <span style="color:var(--md);font-weight:600">URGENT</span>' : '') +
          (c.review_status === "NEEDS_CLINICAL_REVIEW" ? ' <span style="color:var(--wa,#e67e22);font-size:.52rem">· provisional</span>' : '') +
          (needs ? '<div style="color:var(--sv);font-size:.54rem">enter: ' + escH(needs) + '</div>' : '') +
          '</div>';
      }
      h += '</div>';
    }
    h += '</div>';
  } else {
    h = '<div style="color:var(--sv)">Knowledge base not loaded.</div>';
  }
  document.getElementById("kbInfoContent").innerHTML = h;
  openModal("modalKBInfo");
}

/* Prettify a token into a clinician-readable finding name (prefers the
   canonical finding label from the finding→token map). */
function kbPrettyToken(t) {
  if (typeof NEXT_TEST_LABELS !== "undefined" || typeof buildNextTestLabels === "function") {
    var labels = (typeof buildNextTestLabels === "function") ? buildNextTestLabels() : NEXT_TEST_LABELS;
    if (labels && labels[t]) return labels[t];
  }
  return String(t).replace(/_/g, " ");
}

/* Common lay terms / signs / eponyms → extra search keywords, so a clinician
   searching by a SIGN or SYNONYM ("bitot", "stye", "papillae", "seidel",
   "wart", "pink eye"…) still finds the condition even though the sign is not in
   the condition's formal name. Keyed by a substring of the condition name. */
var KB_SYNONYMS = {
  "Xerophthalmia": "bitot spot bitot's spots night blindness nyctalopia keratomalacia vitamin a deficiency dry",
  "Hordeolum": "stye sty lid lump lid bump acute lid swelling",
  "Chalazion": "meibomian cyst lid lump lid bump granuloma",
  "Giant Papillary": "papillae papillary gpc contact lens bumps",
  "Vernal Keratoconjunctivitis": "papillae cobblestone shield ulcer spring catarrh allergy",
  "Atopic Keratoconjunctivitis": "papillae atopic eczema allergy",
  "Corneal Laceration": "seidel seidel test aqueous leak cut cornea",
  "Open Globe": "seidel seidel test ruptured globe rupture penetrating injury",
  "Eyelid Papilloma": "wart verruca skin tag squamous papilloma lid growth",
  "Phthiriasis": "lice crab louse pubic louse nits pediculosis itchy lashes",
  "Pterygium": "surfers eye wing growth on cornea",
  "Pinguecula": "yellow bump conjunctival degeneration",
  "Conjunctival Concretions": "concretion lithiasis yellow deposits",
  "Bacterial Conjunctivitis": "pink eye red eye purulent discharge sticky",
  "Viral Conjunctivitis": "pink eye adenovirus watery follicles",
  "Allergic Conjunctivitis": "itchy eyes hay fever papillae allergy",
  "Blepharitis": "lid margin crusting flaky lashes dandruff",
  "Keratoconus": "cone cornea irregular astigmatism fleischer ring ectasia",
  "Retinitis Pigmentosa": "night blindness tunnel vision bone spicule rp",
  "Nuclear Sclerotic Cataract": "cataract age related lens opacity cloudy lens",
  "Posterior Capsular Opacification": "pco after cataract secondary cataract yag posterior capsule",
  "Trichiasis": "ingrown lashes misdirected lashes",
  "Madarosis": "lash loss eyelash loss thinning brows",
  "Hypopyon": "pus anterior chamber layered white cells",
  "Subconjunctival Hemorrhage": "red patch blood in eye bloodshot",
  "Dacryocystitis": "watering tearing lacrimal sac infection",
  "Dermatochalasis": "droopy skin baggy lids excess skin hooding",
  "Xanthelasma": "yellow lid plaque cholesterol lipid deposit",
  "Distichiasis": "extra lashes double row lashes",
  "Symblepharon": "adhesion scarring conjunctiva",
  "Chemosis": "conjunctival swelling boggy oedema edema",
  "Roth Spots": "white centred hemorrhage endocarditis leukemia",
  "Hollenhorst": "cholesterol embolus plaque amaurosis fugax carotid",
  "Hydroxychloroquine": "plaquenil bulls eye maculopathy antimalarial toxicity",
  "Central Retinal Artery Occlusion (CRAO)": "retinal stroke sudden vision loss cherry red spot",
  "Central Retinal Vein Occlusion (CRVO)": "blood and thunder vein occlusion",
  "Age-related Macular Degeneration (Dry)": "amd drusen macular degeneration",
  "Age-related Macular Degeneration (Wet)": "amd cnv wet macular degeneration distortion",
  "Diabetic Retinopathy": "diabetes retinopathy microaneurysm",
  "Primary Open Angle Glaucoma": "glaucoma raised pressure cupping poag",
  "Acute Angle Closure": "angle closure red painful eye high pressure haloes emergency"
};

/* Build the searchable keyword blob for a condition: its name, domain, the
   plain-language findings it uses, plus any matching synonyms above. */
function kbSearchKeywords(cond) {
  var parts = [(cond.name || ""), (cond._domain || "")];
  var toks = [].concat(cond.req || [], cond.sup || [], cond.tests || []);
  for (var i = 0; i < toks.length; i++) parts.push(kbPrettyToken(toks[i]));
  for (var key in KB_SYNONYMS) {
    if ((cond.name || "").indexOf(key) >= 0) { parts.push(KB_SYNONYMS[key]); }
  }
  return parts.join(" ").toLowerCase().replace(/_/g, " ");
}

/* Filter the KB info list as the owner types — matches name, domain, findings
   and synonyms so a search by SIGN or lay term still finds the condition. */
function kbInfoFilter(q) {
  q = (q || "").toLowerCase().trim();
  var rows = document.querySelectorAll("#kbInfoList .kbinfo-row");
  for (var i = 0; i < rows.length; i++) {
    var hay = rows[i].getAttribute("data-keywords") || rows[i].getAttribute("data-name") || "";
    rows[i].style.display = (!q || hay.indexOf(q) >= 0) ? "" : "none";
  }
  /* hide empty domain groups */
  var groups = document.querySelectorAll("#kbInfoList .kbinfo-domain");
  for (var g = 0; g < groups.length; g++) {
    var any = groups[g].querySelectorAll('.kbinfo-row:not([style*="display: none"])').length;
    groups[g].style.display = any ? "" : "none";
  }
}

function kbUiCheckUpdates() {
  var msg = document.getElementById("kbUpdMsg");
  if (msg) msg.textContent = "Checking…";
  if (typeof kbRemoteCheck !== "function") { if (msg) msg.textContent = "Unavailable."; return; }
  kbRemoteCheck(function (err, outcome) {
    if (!msg) return;
    var text = {
      applied: "Updated! Reopen this window to see the new list.",
      deferred: "Update downloaded — applies after this exam / on restart.",
      current: "Already up to date.",
      none: "No published updates.",
      rejected: "Update rejected (failed safety validation) — kept current KB.",
      disabled: "Cloud is disabled.",
      error: "Couldn't reach the update server (offline?)."
    }[outcome] || outcome;
    msg.textContent = text;
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* PATIENT / VISIT MANAGEMENT                                      */
/* ═══════════════════════════════════════════════════════════════ */

function newPatient() {
  /* Student mode creates PRACTICE records: they are learning, so they are
     never capped and never count against the real-record limit. Real records
     keep the free-tier SAVE limit (honest message, no paywall; export/delete
     frees space). */
  var isPractice = (typeof effectiveRole === "function" && effectiveRole() === "student");
  if (!isPractice && typeof canSave === "function") {
    var realCount = loadPatients().filter(function (p) { return !p.practice; }).length;
    var chk = canSave("patients", realCount);
    if (!chk.ok) {
      alert("Free plan save limit reached (" + chk.cap + " patient records).\n\n" +
        "Learning stays free and unlimited — the engine, knowledge base, casebook and practice exams are fully open. " +
        "To save more real records you'll need an upgrade (coming soon). You can Export and then delete old records to free space now.");
      return;
    }
  }

  var pid = "p" + Date.now().toString(36);
  var vid = "v" + (Date.now() + 1).toString(36);
  var mrn = "EP-" + Date.now().toString(36).toUpperCase();

  P = blankPatient(pid, mrn);
  if (isPractice) P.practice = true;
  P.updated = P.created; /* per-record stamp for cloud LWW */
  V = blankVisit();
  CP = pid;
  CV = vid;

  /* Save patient */
  var patients = loadPatients();
  patients.push(P);
  savePatients(patients);

  /* Save visit */
  var visits = loadVisits();
  visits.push({
    id: vid,
    patient_id: pid,
    data: V,
    status: "in_progress",
    visit_type: "initial",
    date: new Date().toISOString(),
    updated: new Date().toISOString()
  });
  saveVisits(visits);

  if (typeof logAudit === "function") {
    logAudit("patient_created", "New patient registered", { patient_id: pid, visit_id: vid });
    logAudit("visit_started", "Initial visit started", { patient_id: pid, visit_id: vid });
  }

  openExam();
}

/* Opening a patient now lands on the CHART (prior visits summarised first),
   not straight into a blank exam. The chart's buttons continue an in-progress
   visit or start a follow-up (carrying history forward). See js/ui-chart.js. */
function openPatient(pid) {
  if (typeof openChart === "function") { openChart(pid); return; }
  /* Fallback (chart module absent): original continue/create behaviour. */
  var patients = loadPatients();
  P = null;
  for (var i = 0; i < patients.length; i++) if (patients[i].id === pid) { P = patients[i]; break; }
  if (!P) return;
  CP = pid;
  var visits = loadVisits();
  var last = visits.filter(function (v) { return v.patient_id === pid; })
    .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })[0];
  if (last && last.status === "in_progress") { CV = last.id; V = last.data || blankVisit(); }
  else {
    CV = "v" + (Date.now() + 1).toString(36); V = blankVisit();
    visits.push({ id: CV, patient_id: pid, data: V, status: "in_progress", date: new Date().toISOString(), updated: new Date().toISOString() });
    saveVisits(visits);
  }
  openExam();
}

function openExam() {
  showPage("pgExam");
  updateHdr();
  renderSidebar();
  renderMain();
  renderAdvisory();
  updateWNLButton();
  startAutoSave();
}

function goHome() {
  doSave();
  stopAutoSave();
  showHomePage();
}


/* ═══════════════════════════════════════════════════════════════ */
/* HEADER UPDATE                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function updateHdr() {
  var nm = P.first_name ? (P.first_name + " " + P.last_name) : "New Patient";
  var info = "<b>" + escH(nm) + "</b>";
  if (P.age) info += ", " + P.age + "y";
  if (P.sex) info += "/" + P.sex.charAt(0);
  info += " &nbsp; MRN: " + escH(P.mrn);
  if (P.practice) info += ' <span class="practice-chip">PRACTICE</span>';

  document.getElementById("hdrPat").innerHTML = info;
}


/* ═══════════════════════════════════════════════════════════════ */
/* AUTOSAVE                                                        */
/* ═══════════════════════════════════════════════════════════════ */

var _saveTimer = null;

function startAutoSave() {
  stopAutoSave();
  var settings = loadSettings();
  var interval = settings.auto_save_interval || 20000;
  _saveTimer = setInterval(doSave, interval);
}

function stopAutoSave() {
  if (_saveTimer) {
    clearInterval(_saveTimer);
    _saveTimer = null;
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* NAVIGATION (exam steps)                                         */
/* ═══════════════════════════════════════════════════════════════ */

function nav(stepId) {
  /* Close the engine drawer (narrow screens) so navigating to record a finding
     reveals the exam step; harmless when the drawer isn't open. */
  if (document.body) document.body.classList.remove("engine-open");

  /* Mark current step done if it has data */
  markDone(V.step);

  /* Switch step */
  V.step = stepId;

  /* Re-run diagnostic engine */
  if (typeof runDiagnosticEngine === "function") {
    runDiagnosticEngine();
  }

  /* Re-render UI */
  renderSidebar();
  renderMain();
  renderAdvisory();

  /* Scroll to top */
  var main = document.getElementById("mainEl");
  if (main) main.scrollTop = 0;

  /* If we arrived here from an engine suggestion, guide the eye to the field. */
  applyEngineHint();

  /* Toggle the "✓ Normal" quick-fill button for this step. */
  updateWNLButton();
}

/* ── "Mark this section Normal (WNL)" — one-click quick-fill ──
   Fills the current exam step with normal values, marks it done, and re-runs
   the engine so normal measurements become pertinent negatives (e.g. a normal
   IOP derives `normal_iop`, which argues against glaucoma). Speeds routine
   exams — the clinician only stops to type the ABNORMAL findings. */
var WNL_TEMPLATES = {
  va:        function () { V.va.od_un = V.va.od_un || "6/6"; V.va.os_un = V.va.os_un || "6/6"; },
  iop:       function () { V.iop.od = V.iop.od || "15"; V.iop.os = V.iop.os || "15"; V.iop.method = V.iop.method || "GAT"; },
  slit_lamp: function () {
    ["od", "os"].forEach(function (e) { if (V.sl[e]) { V.sl[e].lids = "WNL"; V.sl[e].conj = "White and quiet"; V.sl[e].cornea = "Clear"; V.sl[e].cells = "0"; V.sl[e].flare = "0"; V.sl[e].iris = "Normal"; } });
  },
  pupil:     function () { V.pupil.rapd = "None"; V.pupil.notes = V.pupil.notes || "PERRL, no RAPD"; },
  motility:  function () { V.mot.versions = "Full"; V.mot.ductions = "Full"; },
  gonioscopy: function () { ["od", "os"].forEach(function (e) { if (V.gon[e]) V.gon[e].s = V.gon[e].s || "Open (Grade 4)"; }); },
  fundus:    function () { ["od", "os"].forEach(function (e) { if (V.fun[e]) { V.fun[e].cd_v = V.fun[e].cd_v || "0.3"; } }); },
  neuro:     function () { V.neuro.color_od = V.neuro.color_od || "Normal"; V.neuro.notes = V.neuro.notes || "Colour, fields, Amsler normal"; }
};

function stepHasWNL(step) { return !!WNL_TEMPLATES[step]; }

/* Show the header "✓ Normal" button only on steps where WNL makes sense. */
function updateWNLButton() {
  var btn = document.getElementById("hdrWNL");
  if (!btn) return;
  btn.style.display = (V && stepHasWNL(V.step)) ? "" : "none";
}

function markStepWNL(step) {
  step = step || V.step;
  var tpl = WNL_TEMPLATES[step];
  if (!tpl) return;
  tpl();
  markDone(step);
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderSidebar();
  renderMain();
  renderAdvisory();
}

/* ── Engine "check next" → jump to the exact entry field ──
   The node-graph / advisory suggestions call this. It navigates to the step
   and then (applyEngineHint, after render) drops a hint banner naming the exact
   finding to record, expands the finding sections, and pre-searches it so the
   clinician lands on the control, not just the page. */
var PENDING_ENGINE_HINT = null;
function navToField(step, label, why) {
  PENDING_ENGINE_HINT = { step: step, label: label || "", why: why || "" };
  nav(step);
}

function applyEngineHint() {
  var hint = PENDING_ENGINE_HINT;
  PENDING_ENGINE_HINT = null;
  if (!hint || V.step !== hint.step) return;
  var main = document.getElementById("mainEl");
  if (!main) return;

  /* Hint banner at the top of the step. */
  var banner = document.createElement("div");
  banner.className = "engine-hint-banner";
  banner.innerHTML = '<span class="ehb-icon">🔬</span>' +
    '<span class="ehb-body">Record <b>' + escH(hint.label) + '</b>' +
    (hint.why ? ' <span class="ehb-why">— ' + escH(hint.why) + '</span>' : '') +
    '<br><span class="ehb-sub">suggested by the diagnostic engine to sharpen the differential</span></span>' +
    '<button class="ehb-x" onclick="this.parentNode.remove()" aria-label="dismiss">✕</button>';
  main.insertBefore(banner, main.firstChild);
  main.scrollTop = 0;

  /* On findings pages, expand the sections + pre-search the finding so it shows. */
  var prefix = hint.step === "slit_lamp" ? "slf_" : hint.step === "fundus" ? "fdf_" : null;
  if (prefix && hint.label) {
    var secs = document.querySelectorAll('[id^="' + prefix + '"]');
    for (var i = 0; i < secs.length; i++) secs[i].classList.add("open");
    var box = main.querySelector(".search-box");
    if (box) {
      var q = hint.label.split(/\s+/)[0]; /* first word matches best via indexOf */
      box.value = q;
      if (typeof filterFinds === "function") filterFinds(q, prefix);
      /* keep the banner in view (scrollTop stays 0); the pre-filtered finding is
         just below — the banner tells the clinician exactly what to tap. */
    }
  } else if (hint.step === "chief_complaint" && hint.label) {
    var sbox = main.querySelector(".search-box");
    if (sbox && typeof filterSymptoms === "function") {
      var qq = hint.label.split(/\s+/)[0];
      sbox.value = qq; filterSymptoms(qq);
    }
  }

  setTimeout(function () { if (banner && banner.parentNode) banner.classList.add("ehb-fade"); }, 6000);
}

function goNext(currentStep, nextStep) {
  markDone(currentStep);
  nav(nextStep);
}

function markDone(sid) {
  if (!sid || !V || !V.completed) return;

  var has = false;

  switch (sid) {
    case "demographics":
      has = !!(P.first_name || P.age);
      break;
    case "chief_complaint":
      has = !!(V.cc || (V.symptoms && V.symptoms.length > 0));
      break;
    case "hx_ocular":
      has = !!(V.hxO.conditions || V.hxO.medications || (V.hxO.flags && V.hxO.flags.length > 0));
      break;
    case "hx_medical":
      has = !!(V.hxM.conditions || V.hxM.dm || V.hxM.htn || (V.hxM.drug_list && V.hxM.drug_list.length > 0));
      break;
    case "hx_family":
      has = !!(V.hxF.details || V.hxF.glaucoma || V.hxF.amd);
      break;
    case "va":
      has = !!(V.va.od_un || V.va.od_bva);
      break;
    case "refraction":
      has = !!V.rx.od_sph;
      break;
    case "dilation":
      has = !!V.dil.drug;
      break;
    case "slit_lamp":
      has = V.sl.findings.length > 0;
      break;
    case "iop":
      has = !!V.iop.od;
      break;
    case "pupil":
      has = V.pupil.rapd !== "None" || !!V.pupil.notes;
      break;
    case "motility":
      has = !!V.mot.notes || V.mot.versions !== "Full";
      break;
    case "bv":
      has = !!(V.bv.npc_b || V.bv.ct_n || V.bv.acc_od);
      break;
    case "gonioscopy":
      has = !!(V.gon.od.s || V.gon.os.s);
      break;
    case "fundus":
      has = !!(V.fun.od.cd_v || V.fun.findings.length > 0);
      break;
    case "neuro":
      has = !!(V.neuro.color_od || V.neuro.notes);
      break;
    case "investigations":
      has = !!(V.inv.oct_rnfl_od || V.inv.vf_md_od || V.inv.notes);
      break;
    case "diagnosis":
      has = V.dxList.length > 0;
      break;
    case "plan":
      has = !!(V.plan.mgmt || V.plan.ref_to);
      break;
    default:
      has = false;
  }

  if (has && V.completed.indexOf(sid) === -1) {
    V.completed.push(sid);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* TOGGLE HELPERS                                                  */
/* ═══════════════════════════════════════════════════════════════ */

/* Toggle symptom selection */
function togSym(key) {
  var idx = V.symptoms.indexOf(key);
  if (idx >= 0) {
    V.symptoms.splice(idx, 1);
  } else {
    V.symptoms.push(key);
  }
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
  renderSidebar();
}

/* Toggle medical history flag */
function togMedFlag(key) {
  V.hxM[key] = !V.hxM[key];
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle family history flag */
function togFamFlag(key) {
  V.hxF[key] = !V.hxF[key];
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle ocular history flag */
function togOcFlag(key) {
  if (!V.hxO.flags) V.hxO.flags = [];
  var idx = V.hxO.flags.indexOf(key);
  if (idx >= 0) V.hxO.flags.splice(idx, 1);
  else V.hxO.flags.push(key);
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle slit lamp finding */
function togSlFind(item) {
  var idx = V.sl.findings.indexOf(item);
  if (idx >= 0) V.sl.findings.splice(idx, 1);
  else V.sl.findings.push(item);
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle fundus finding */
function togFunFind(item) {
  var idx = V.fun.findings.indexOf(item);
  if (idx >= 0) V.fun.findings.splice(idx, 1);
  else V.fun.findings.push(item);
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle collapsible section */
function togCollapse(id) {
  var el = document.getElementById(id);
  if (el) el.classList.toggle("open");
}

/* Toggle temporal pattern */
function togTemporal(category, key) {
  if (!V.temporal) V.temporal = { onset: "", duration: "", course: "" };
  if (V.temporal[category] === key) {
    V.temporal[category] = "";
  } else {
    V.temporal[category] = key;
  }
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}


/* ═══════════════════════════════════════════════════════════════ */
/* VA DROPDOWN                                                     */
/* ═══════════════════════════════════════════════════════════════ */

function showVA(inputId, format) {
  /* Remove any existing dropdowns */
  var existing = document.querySelectorAll(".va-dd");
  for (var e = 0; e < existing.length; e++) existing[e].remove();

  var inp = document.getElementById(inputId);
  if (!inp) return;

  var vals = format === "near" ? VA_N : VA_M;
  var imps = VA_I;
  var showImp = format !== "near";

  var rect = inp.getBoundingClientRect();
  var dd = document.createElement("div");
  dd.className = "va-dd";
  dd.style.position = "fixed";
  dd.style.top = (rect.bottom + 2) + "px";
  dd.style.left = rect.left + "px";
  dd.style.minWidth = rect.width + "px";

  for (var i = 0; i < vals.length; i++) {
    (function(val, imp) {
      var di = document.createElement("div");
      di.innerHTML = '<span>' + val + '</span>' +
        (showImp && imp ? '<span class="imp">' + imp + '</span>' : '');
      di.addEventListener("click", function() {
        inp.value = val;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        dd.remove();
      });
      dd.appendChild(di);
    })(vals[i], imps[i]);
  }

  document.body.appendChild(dd);

  /* Close on outside click */
  setTimeout(function() {
    document.addEventListener("click", function handler(e) {
      if (!dd.contains(e.target) && e.target !== inp) {
        dd.remove();
        document.removeEventListener("click", handler);
      }
    });
  }, 10);
}


/* ═══════════════════════════════════════════════════════════════ */
/* FILTER FINDINGS (search within collapsible panels)              */
/* ═══════════════════════════════════════════════════════════════ */

function filterFinds(query, prefix) {
  var lq = query.toLowerCase();
  var items = document.querySelectorAll('[id^="' + prefix + '"] .fn');
  for (var i = 0; i < items.length; i++) {
    var text = items[i].textContent.toLowerCase();
    items[i].style.display = text.indexOf(lq) >= 0 ? "" : "none";
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* HTML ESCAPE HELPER                                              */
/* ═══════════════════════════════════════════════════════════════ */

function escH(s) {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* Escape user text for BOTH attribute values and element bodies.
   Must escape < and > too: many call sites drop esc() output inside a
   <textarea>…</textarea> body, where a quotes-only escape lets
   "</textarea><img onerror=…>" break out (stored XSS — and remote
   free-text from another clinician now renders here via cloud sync).
   Full escaping is safe in every context these strings appear in. */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


/* ═══════════════════════════════════════════════════════════════ */
/* INITIALIZATION                                                  */
/* Runs on page load — sets up event listeners, checks auth state  */
/* ═══════════════════════════════════════════════════════════════ */

(function init() {

  /* Load API key */
  API_KEY = loadApiKey();

  /* Enter key on login password field */
  var loginPw = document.getElementById("inp_lp");
  if (loginPw) {
    loginPw.addEventListener("keydown", function(e) {
      if (e.key === "Enter") doLogin();
    });
  }

  /* Enter key on login username field */
  var loginUser = document.getElementById("inp_lu");
  if (loginUser) {
    loginUser.addEventListener("keydown", function(e) {
      if (e.key === "Enter") doLogin();
    });
  }

  /* Keyboard step navigation — Alt+→ / Alt+← move between exam steps for a
     faster, hands-on-keyboard workflow. Ignored while typing in a field. */
  document.addEventListener("keydown", function (e) {
    if (!e.altKey || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    if (!document.getElementById("pgExam") || !document.getElementById("pgExam").classList.contains("active")) return;
    if (typeof STEPS === "undefined" || !V) return;
    var idx = -1;
    for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === V.step) { idx = i; break; }
    if (idx < 0) return;
    var next = e.key === "ArrowRight" ? Math.min(idx + 1, STEPS.length - 1) : Math.max(idx - 1, 0);
    if (next !== idx) { e.preventDefault(); nav(STEPS[next].id); }
  });

  /* If no users exist, show setup form */
  var users = loadUsers();
  if (users.length === 0) {
    showView("setupView", "loginView");
  }

  /* Log knowledge base status */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    console.log("Entopic: Knowledge base loaded — " + KNOWLEDGE_ALL.length + " conditions");
  } else {
    console.log("Entopic: Knowledge base not loaded — diagnostic engine will use fallback");
  }

  console.log("Entopic v1.0 initialized");

})();
