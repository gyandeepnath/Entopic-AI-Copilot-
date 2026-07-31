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

/* Brief, non-blocking confirmation of an action ("Copied AR → subjective").
   Reuses the save-indicator slot so there is one feedback surface, never a
   blocking alert() in the middle of an exam. */
function toast(msg, ms) {
  var el = document.getElementById("saveInd");
  if (!el) return;
  if (toast._t) { clearTimeout(toast._t); }
  if (toast._restore === undefined) toast._restore = el.textContent;
  el.textContent = msg;
  el.classList.add("show");
  toast._t = setTimeout(function () {
    el.classList.remove("show");
    el.textContent = toast._restore;
    toast._t = null;
  }, ms || 1800);
}

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

  /* Repeated wrong passwords are slowed down (js/clinic-mode.js). Applies to
     the admin account too — that is the one worth guessing. */
  if (typeof loginBlockedFor === "function") {
    var waitMs = loginBlockedFor(u);
    if (waitMs > 0) {
      var secs = Math.ceil(waitMs / 1000);
      errEl.textContent = "Too many failed attempts — wait " +
        (secs >= 60 ? Math.ceil(secs / 60) + " min" : secs + "s") + " before trying again.";
      errEl.style.display = "block";
      return;
    }
  }

  /* Shared by both sign-in paths so a failure is counted exactly once. */
  var noteFailure = function () {
    if (typeof loginRecordFailure === "function") loginRecordFailure(u);
  };
  var noteSuccess = function () {
    if (typeof loginClearFailures === "function") loginClearFailures(u);
  };

  /* Super-admin sign-in: verified against a salted PBKDF2 hash (H-5), async.
     The admin session is ephemeral — never stored in the users list. If the
     username is the admin username, this path owns the outcome (success or
     failure) and never falls through to the user lookup. */
  if (typeof adminVerify === "function" && u === (typeof ADMIN_USERNAME !== "undefined" ? ADMIN_USERNAME : "entopic-admin")) {
    adminVerify(u, p).then(function (ok) {
      if (!ok) {
        noteFailure();
        errEl.textContent = "Invalid credentials"; errEl.style.display = "block"; return;
      }
      noteSuccess();
      CU = adminSessionUser();
      errEl.style.display = "none";
      if (typeof roleSessionReset === "function") roleSessionReset();
      if (typeof clinicIdleReset === "function") clinicIdleReset();
      showHomePage();
    }).catch(function () {
      noteFailure();
      errEl.textContent = "Invalid credentials"; errEl.style.display = "block";
    });
    return;
  }

  /* Credential check is asynchronous now — passwords are salted and stretched
     with PBKDF2 rather than compared as plaintext (js/auth-crypto.js). The
     account is looked up by username ONLY; the password never takes part in
     finding the record, so a wrong username and a wrong password fail the same
     way and at the same speed. */
  var users = loadUsers();
  var candidate = null;
  for (var i = 0; i < users.length; i++) {
    if (users[i].username === u) { candidate = users[i]; break; }
  }

  var fail = function () {
    noteFailure();
    errEl.textContent = "Invalid credentials";
    errEl.style.display = "block";
  };

  if (!candidate || typeof authVerifyUser !== "function") { fail(); return; }

  authVerifyUser(candidate, p).then(function (res) {
    if (!res.ok) { fail(); return; }
    /* A legacy plaintext record was just upgraded in place — persist it so the
       password is erased from storage for good. */
    if (res.migrated) {
      saveUsers(users);
      if (typeof logAudit === "function") {
        logAudit("credential_upgraded", candidate.username + " — plaintext password replaced with a salted hash", {});
      }
    }
    noteSuccess();
    CU = candidate;
    errEl.style.display = "none";
    /* Fresh role state per sign-in: this account's own saved role (CU.role)
       drives the workspace, never a leftover from another account. */
    if (typeof roleSessionReset === "function") roleSessionReset();
    if (typeof clinicIdleReset === "function") clinicIdleReset();
    showHomePage();
  }).catch(function () { fail(); });
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

  /* Clinic deployment mode closes open self-signup: on a shared consulting-room
     terminal, "anyone may create an account" is a route to every patient record.
     The admin creates staff accounts instead (Admin → Staff accounts). The very
     first account is always allowed, or a fresh install would lock everyone out. */
  if (typeof signupAllowed === "function" && !signupAllowed(users.length)) {
    alert("New accounts are closed on this device.\n\n" +
          "This terminal is in clinic deployment mode. Ask the practice administrator " +
          "to create an account for you (Admin → Staff accounts).");
    return;
  }

  for (var i = 0; i < users.length; i++) {
    if (users[i].username === uname) {
      alert("Username already taken.");
      return;
    }
  }

  /* "Using Entopic as" — the mode chosen at signup; switchable any time. */
  var roleSel = document.getElementById("inp_sr");
  var role = roleSel ? roleSel.value : "clinician";

  if (String(pw).length < 6) {
    alert("Please choose a password of at least 6 characters.");
    return;
  }

  var user = {
    id: "u" + Date.now().toString(36),
    username: uname,
    name: name,
    cred: cred,
    clinic: clinic,
    role: role,
    created: new Date().toISOString()
  };

  /* The password is never stored — only a salted PBKDF2 hash of it. */
  authMakeCredentials(pw).then(function (credFields) {
    user.pw_salt = credFields.pw_salt;
    user.pw_hash = credFields.pw_hash;
    user.pw_algo = credFields.pw_algo;
    users.push(user);
    saveUsers(users);
    CU = user;
    if (typeof roleSessionReset === "function") roleSessionReset();
    if (typeof setActiveRole === "function") setActiveRole(role);
    showHomePage();
  }).catch(function () {
    alert("Could not create the account on this browser.");
  });
}

function doLogout() {
  CU = null;
  CP = null;
  CV = null;
  P = {};
  V = {};
  if (typeof roleSessionReset === "function") roleSessionReset();
  /* Show the SIGN-IN form, not whichever view happened to be open. After
     creating an account the setup form is the visible one, so signing out
     used to drop the user back onto "Create new account" with the sign-in
     fields hidden. */
  if (typeof showView === "function") showView("loginView", "setupView");
  /* Never leave the previous person's credentials in the fields. */
  ["inp_lu", "inp_lp"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.value = "";
  });
  var err = document.getElementById("loginErr");
  if (err) { err.textContent = ""; err.style.display = "none"; }
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
    case "investigations": return homeSecInvestigations();
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
    (typeof dataExportCard === "function" ? dataExportCard() : "") +
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
  /* My practice exams — resumable, uncapped, manageable (learning is free). */
  var practice = practicePatients().reverse();
  var pvisits = loadVisits();
  function pStatus(pid) {
    var v = pvisits.filter(function (x) { return x.patient_id === pid; })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })[0];
    return v && v.status === "completed" ? "completed" : "in progress";
  }
  var practiceHtml = "";
  if (practice.length) {
    practiceHtml = '<div class="p-list" style="margin-top:8px">' +
      '<div class="p-list-h"><span>My practice exams</span>' +
      '<span style="font-size:.58rem;color:var(--sv)">' + practice.length + ' · uncounted · <a href="#" onclick="clearPracticeExams();return false" style="color:var(--md)">clear all</a></span></div>';
    for (var i = 0; i < Math.min(practice.length, 12); i++) {
      var pt = practice[i];
      practiceHtml += '<div class="p-row" onclick="openPatient(\'' + pt.id + '\')">' +
        '<div><b>' + escH((pt.first_name || "Practice") + " " + (pt.last_name || "case")) + '</b> ' +
          '<span class="practice-chip">' + pStatus(pt.id) + '</span></div>' +
        '<span style="font-family:var(--mono);color:var(--sv);font-size:.6rem">' + escH(pt.mrn || "") + '</span>' +
      '</div>';
    }
    practiceHtml += '</div>';
  }

  var quizLine = (typeof quizStatsSummary === "function") ? quizStatsSummary()
    : "Guess-the-diagnosis practice drawn from the knowledge base and your casebook.";

  var caseCount = (typeof casebookLoad === "function") ? casebookLoad().length : 0;

  return '<div class="home-hd"><h1>Study</h1></div>' +
    '<div class="study-hero">Learn by reasoning. The full diagnostic engine, glass-box "why", knowledge base and casebook are open and free — no restrictions on learning.</div>' +
    /* Simulation: work a virtual patient with findings hidden until examined. */
    ((typeof simLauncherCard === "function") ? simLauncherCard() : "") +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🧠 Quiz — guess the diagnosis</div>' +
      '<div class="home-settings-desc">' + escH(quizLine) + ' A continuous session — answer with 1–4, Enter for the next.</div>' +
      '<button class="btn btn-p" onclick="startQuiz()" style="font-size:.62rem">Start quiz session</button>' +
    '</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🩺 Practice exam</div>' +
      '<div class="home-settings-desc">Run a full mock exam through the live engine and watch the reasoning build. Practice records are labelled and never count against a save limit.</div>' +
      '<button class="btn btn-s" onclick="newPatient()" style="font-size:.62rem">Start a practice exam</button>' +
    '</div>' +
    practiceHtml +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📚 Study casebook</div>' +
      '<div class="home-settings-desc">' + (caseCount ? caseCount + ' cases to study — grouped by condition, filterable by sign.' : 'Load a ready-made library of example cases (one per common condition) to study, or save your own.') + '</div>' +
      '<button class="btn btn-p" onclick="seedExampleCases()" style="font-size:.62rem">Load example cases</button> ' +
      '<button class="btn btn-s" onclick="showCasebook()" style="font-size:.62rem">Open casebook</button>' +
    '</div>' +
    (typeof analyticsRoleCard === "function" ? analyticsRoleCard() : "") +
    homeCardKB();
}

/* Delete all practice records + their visits (student housekeeping). */
function clearPracticeExams() {
  var practice = practicePatients();
  if (!practice.length) return;
  if (!confirm("Delete all " + practice.length + " practice exams? (Your real records and casebook are untouched.)")) return;
  var ids = {}; for (var i = 0; i < practice.length; i++) ids[practice[i].id] = true;
  savePatients(loadPatients().filter(function (p) { return !p.practice; }));
  saveVisits(loadVisits().filter(function (v) { return !ids[v.patient_id]; }));
  renderHome();
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

    /* set practice work + watch the cohort's progress */
    ((typeof assignFacultyCard === "function") ? assignFacultyCard() : "") +

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
    (typeof dataExportCard === "function" ? dataExportCard() : "") +
    /* Restoring a backup REPLACES every patient record, and the Supabase
       credentials decide where this clinic's data goes. Both are practice-wide,
       destructive-if-wrong actions, so they live in the Admin panel now
       (production-readiness audit B-2). Everyone still sees sync STATUS here. */
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

    /* Deployment readiness + backend credentials + clinic mode + restore.
       Placed first: it is what an administrator putting this terminal into
       service needs to see before anything else (audit B-2/B-3). */
    (typeof deploymentCard === "function" ? deploymentCard() : "") +

    adminUsersByRoleHtml(users) +

    (typeof adminAnalyticsCard === "function" ? adminAnalyticsCard() : "") +

    '<div class="home-settings" style="margin-top:8px">' +
      /* Credential state, shown rather than assumed. */
      ((typeof authPlaintextCount === "function") ? (function () {
        var n = authPlaintextCount();
        return '<div class="home-settings" style="margin-top:8px">' +
          '<div class="home-settings-title">🔑 Stored credentials</div>' +
          '<div class="home-settings-desc">' +
            'Passwords are salted and stretched with PBKDF2-SHA-256 before they are stored — ' +
            'a copied store or backup no longer reveals anyone\'s actual password. ' +
            (n ? '<b>' + n + ' account(s) created before this change still hold a plaintext password;</b> ' +
                 'each is upgraded automatically the next time that person signs in.'
               : 'No account is holding a plaintext password.') +
            '<br><span style="color:var(--sv)">This is a local app: someone with the device and the source ' +
            'can still bypass the sign-in screen. Real authentication arrives with the cloud backend.</span>' +
          '</div></div>';
      })() : "") +
      /* App health — recent caught faults, so a broken render is visible to the
         founder instead of lost to the console (DD H-4) — plus local-storage
         headroom (DD M-4). */
      ((typeof errRecent === "function") ? (function () {
        var recent = errRecent();
        var su = (typeof storageUsage === "function") ? storageUsage() : null;
        var meter = su ? (
          '<div style="margin-top:6px;font-size:.58rem;color:var(--sv)">Local storage: <b>' + su.pct + '%</b> of this browser\'s budget' +
            (su.pct >= 80 ? ' — <span style="color:#c0392b">near the limit; export/archive old records or connect cloud sync</span>' : '') +
          '<div style="height:5px;background:var(--gr);border-radius:3px;overflow:hidden;margin-top:3px">' +
            '<div style="width:' + su.pct + '%;height:100%;background:' + (su.pct >= 80 ? "#c0392b" : (su.pct >= 60 ? "#b8860b" : "#2e7d32")) + '"></div></div></div>'
        ) : "";
        return '<div class="home-settings" style="margin-top:8px">' +
          '<div class="home-settings-title">🩹 App health</div>' +
          '<div class="home-settings-desc">' +
            (recent.length
              ? '<b>' + recent.length + ' recent screen fault(s) caught.</b> The app recovered rather than crashing. ' +
                'Most recent: <span style="color:var(--sv)">' + escH(recent[0].where + " — " + recent[0].message) + '</span>'
              : 'No screen faults recorded this session. Errors are caught and shown with a recovery prompt rather than crashing the page.') +
          '</div>' + meter + '</div>';
      })() : "") +
      ((typeof ageBracketScreen === "function") ? ageBracketScreen() : "") +
      '<div class="home-settings-title">🔐 Change admin password</div>' +
      '<div class="home-settings-desc">Salted PBKDF2-SHA-256 (never plaintext, no longer the old lightweight hash). Minimum 8 characters.' +
        ((typeof adminUsingLegacyCredential === "function" && adminUsingLegacyCredential())
          ? ' <b style="color:#c0392b">The admin password is still the built-in default — change it now.</b>' : '') +
      '</div>' +
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
    '<div class="home-settings-title">🩺 Clinical validation</div>' +
    '<div class="home-settings-desc">' + escH(desc) +
      ' Open the validation workspace to see the engine logic behind each condition in plain language, verify it, or edit its tokens.</div>' +
    '<button class="btn btn-p" onclick="openValidation()" style="font-size:.62rem">Open validation workspace</button>' +
    (n > 0 ? ' <button class="btn btn-s" onclick="showReviewQueue()" style="font-size:.62rem">Rapid verify queue</button>'
           : ' <button class="btn btn-s" onclick="showReviewQueue()" style="font-size:.62rem">Rapid queue</button>') +
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
  if (typeof adminSetPassword !== "function") { if (msg) msg.textContent = "Unavailable."; return; }
  if (msg) msg.textContent = "Updating…";
  /* Now async (PBKDF2). */
  adminSetPassword(a).then(function () {
    if (msg) msg.textContent = "✓ Updated (salted PBKDF2) — use it from the next sign-in.";
  }).catch(function (e) {
    if (msg) msg.textContent = (e && e.message) || "Too short (min 8 characters).";
  });
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
              noclinic: "#b8860b", disabled: "#888",
              phi_off: "#c0392b", phi_nokey: "#b8860b" }[s.state] || "#888";
  var body = "";

  if (s.state === "disabled") {
    /* Not connected to any backend → offer to connect the practice's OWN project.
       Entering the project URL + key decides where every patient record is sent,
       so it is an ADMIN action (audit B-2). Non-admins see the status only. */
    var mayConfigure = (typeof isAdmin === "function" && isAdmin());
    body =
      '<div class="home-settings-status">Not connected. Entopic runs fully offline; nothing syncs anywhere until the practice connects <b>its own</b> Supabase project.</div>' +
      (mayConfigure
        ? '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">' +
            '<input id="cloudCfgUrl" placeholder="https://YOUR-PROJECT.supabase.co" style="font-size:.6rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;min-width:220px">' +
            '<input id="cloudCfgKey" placeholder="anon public key" style="font-size:.6rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;min-width:180px">' +
            '<button class="btn btn-p" style="font-size:.6rem" onclick="cloudUiConnect()">Connect</button>' +
          '</div>' +
          '<div id="cloudMsg" class="home-settings-status" style="color:var(--md)">Free to set up (~10 min) — see docs/BACKEND_OWNERSHIP.md. Your patient data lives in an account you control.</div>'
        : '<div class="home-settings-status" style="color:var(--md)">Only the practice administrator can connect a backend project.</div>');
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
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:5px">' +
        '<input id="cloudJoinCode" placeholder="or join code (6 chars)" maxlength="6" style="font-size:.62rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;text-transform:uppercase">' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiJoinClinic()">Join a clinic</button>' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiSignOut()">Sign out</button>' +
      '</div>' +
      '<div id="cloudMsg" class="home-settings-status">Signed in as ' + escH(s.email || "") + '. Create a clinic, or join one with a share code from a colleague.</div>';
  } else {
    body =
      '<div class="home-settings-status">Signed in as ' + escH(s.email || "") + ' · ' + escH(s.label) + '</div>' +
      cloudPhiPanel(s) +
      '<div style="display:flex;gap:6px;margin-top:6px">' +
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

/* Patient-data (PHI) sync controls: an explicit consent gate + a clinic
   passphrase that encrypts records before they leave the device. Until BOTH
   are set, patient records stay local — the cloud only ever gets ciphertext. */
function cloudPhiPanel(s) {
  if (typeof phiConsentGiven !== "function") return "";
  var consent = phiConsentGiven();
  var keyReady = (typeof phiKeyReady === "function") && phiKeyReady();

  var h = '<div style="margin-top:8px;padding:8px;border:1px solid var(--fg);border-radius:var(--r);background:var(--sn)">' +
    '<div style="font-size:.62rem;font-weight:600">🔒 Patient-data sync</div>' +
    '<div style="font-size:.56rem;color:var(--sv);margin:3px 0 6px">' +
      'Patient records are <b>encrypted on this device</b> before they are sent — the cloud only ever ' +
      'stores ciphertext, never a name, MRN or date of birth. Nothing patient-identifying leaves this ' +
      'device until you turn this on.</div>';

  if (!consent) {
    h += '<div style="font-size:.56rem;color:var(--md);margin-bottom:5px">Patient sync is <b>OFF</b>. ' +
      'Your exams still save locally; they are simply not backed up to the cloud yet.</div>' +
      '<button class="btn btn-p" style="font-size:.58rem" onclick="cloudUiGrantConsent()">Turn on encrypted patient sync…</button>';
    return h + '</div>';
  }

  /* consent granted */
  h += '<div style="font-size:.56rem;color:#2e7d32;margin-bottom:5px">✓ Consent given — patient sync is ON, encrypted.</div>';
  if (!keyReady) {
    h += '<div style="font-size:.56rem;color:var(--md);margin-bottom:4px">Set the <b>clinic passphrase</b> to start syncing. ' +
      'Every device in your clinic uses the same passphrase; it is never sent to the cloud, so keep it safe — ' +
      'if it is lost, encrypted records cannot be recovered.</div>';
  } else {
    h += '<div style="font-size:.56rem;color:var(--sv);margin-bottom:4px">Encryption key is set on this device. ' +
      'Re-enter the passphrase on any new device to sync there.</div>';
  }
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
      '<input id="cloudPhiPass" type="password" placeholder="clinic passphrase (≥8 chars)" style="font-size:.6rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;min-width:200px">' +
      '<button class="btn btn-p" style="font-size:.58rem" onclick="cloudUiSetPassphrase()">' + (keyReady ? "Update key" : "Set key") + '</button>' +
      '<button class="btn btn-s" style="font-size:.58rem" onclick="cloudUiRevokeConsent()">Turn off</button>' +
    '</div>' +
    '<div id="cloudPhiMsg" style="font-size:.54rem;color:var(--sv);margin-top:4px"></div>';
  return h + '</div>';
}

function cloudUiGrantConsent() {
  if (!window.confirm(
    "Turn on cloud sync of PATIENT data?\n\n" +
    "Records will be ENCRYPTED on this device before being sent — the cloud never sees a name, MRN or " +
    "date of birth in the clear. You will set a clinic passphrase next; it never leaves your devices.\n\n" +
    "Only do this if you are authorised to store this clinic's patient data in your cloud project.")) return;
  phiSetConsent(true);
  renderHome();
}
function cloudUiRevokeConsent() {
  if (!window.confirm("Turn OFF patient-data sync? Existing local records are untouched; new changes stop syncing.")) return;
  phiSetConsent(false);
  renderHome();
}
function cloudUiSetPassphrase() {
  var el = document.getElementById("cloudPhiPass");
  var pass = el ? el.value : "";
  var msg = document.getElementById("cloudPhiMsg");
  var clinicId = (typeof CLOUD !== "undefined" && CLOUD) ? CLOUD.clinicId : "";
  if (msg) { msg.style.color = "var(--sv)"; msg.textContent = "Deriving key…"; }
  phiSetPassphrase(pass, clinicId).then(function () {
    if (msg) { msg.style.color = "#2e7d32"; msg.textContent = "Key set. Syncing encrypted patient data…"; }
    if (typeof cloudStart === "function") cloudStart();
    setTimeout(renderHome, 400);
  }).catch(function (e) {
    if (msg) { msg.style.color = "var(--md)"; msg.textContent = (e && e.message) || "Could not set the key on this browser."; }
  });
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
function cloudUiConnect() {
  var url = (document.getElementById("cloudCfgUrl") || {}).value || "";
  var key = (document.getElementById("cloudCfgKey") || {}).value || "";
  if (typeof configureCloud !== "function" || !configureCloud(url, key)) {
    cloudUiMsg("Enter a valid https://…​.supabase.co URL and the anon public key.", false);
    return;
  }
  cloudUiMsg("✓ Connected to your project. Sign in or create an account to sync.", true);
  renderHome();
}
function cloudUiDisconnect() {
  if (!confirm("Disconnect from your Supabase project? Data on the device stays; syncing stops.")) return;
  if (typeof cloudSignOut === "function") cloudSignOut();
  if (typeof disconnectCloud === "function") disconnectCloud();
  renderHome();
}
function cloudUiJoinClinic() {
  var code = (document.getElementById("cloudJoinCode") || {}).value || "";
  if (!code.trim()) { cloudUiMsg("Enter a 6-character join code.", false); return; }
  cloudUiMsg("Joining…", true);
  if (typeof cloudJoinClinic !== "function") { cloudUiMsg("Cloud is unavailable.", false); return; }
  cloudJoinClinic(code, function (err) {
    if (err) cloudUiMsg("Couldn't join: " + err.message, false);
    else { cloudUiMsg("Joined ✓ — syncing with the clinic.", true); renderHome(); }
  });
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
        h += '<div class="kbinfo-row" data-name="' + escH((c.name || "").toLowerCase()) + '" data-keywords="' + escH(kbSearchKeywords(c)) + '" ' +
          'onclick="showKBDetail(\'' + escH(String(c.name)).replace(/'/g, "\\'") + '\')" ' +
          'style="cursor:pointer;font-size:.62rem;color:var(--sl);padding:3px 6px 3px 10px;border-radius:4px" ' +
          'onmouseover="this.style.background=\'var(--sn)\'" onmouseout="this.style.background=\'\'">' +
          '<b style="color:var(--ink,#222);font-weight:500">' + escH(c.name) + '</b>' +
          (c.urgent ? ' <span style="color:var(--md);font-weight:600">URGENT</span>' : '') +
          (c.review_status === "VERIFIED_BY_CLINICIAN" ? ' <span style="color:var(--sl);font-size:.52rem">· verified ✓</span>' :
           c.review_status === "NEEDS_CLINICAL_REVIEW" ? ' <span style="color:var(--wa,#e67e22);font-size:.52rem">· provisional</span>' : '') +
          '<span style="float:right;color:var(--sv);font-size:.6rem">›</span>' +
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

/* Full basic info for ONE condition — opened by clicking any KB row. Shows the
   About summary, ICD-10 code, urgency, review status, and the findings the
   engine uses (required / supportive / against / tests). Read-only reference. */
function showKBDetail(name) {
  var c = (typeof findCondition === "function") ? findCondition(name) : null;
  var box = document.getElementById("kbInfoContent");
  if (!box) return;
  if (!c) { box.innerHTML = '<div style="color:var(--sv)">Condition not found.</div>'; return; }

  var findFn = (typeof findCondition === "function") ? findCondition : null;
  var info = (typeof resolveConditionInfo === "function") ? resolveConditionInfo(name, findFn, kbPrettyToken) : null;

  function chips(arr, cls) {
    if (!arr || !arr.length) return '<span style="color:var(--sv);font-size:.58rem">—</span>';
    return arr.map(function (t) { return '<span class="kbd-chip ' + (cls || "") + '">' + escH(kbPrettyToken(t)) + '</span>'; }).join(" ");
  }

  var verified = c.review_status === "VERIFIED_BY_CLINICIAN";
  var provisional = c.review_status === "NEEDS_CLINICAL_REVIEW";

  var h = '<div class="kbd">' +
    '<button class="btn btn-s" onclick="showKBInfo()" style="font-size:.6rem;margin-bottom:8px">← All conditions</button>' +
    '<div class="kbd-title">' + escH(c.name) +
      (c.urgent ? ' <span class="kr-urgent">URGENT</span>' : '') + '</div>' +
    '<div class="kbd-meta">' + escH(c._domain || c.domain || "") +
      (c.icd ? ' · ICD-10 <b>' + escH(c.icd) + '</b>' + (c.icd_label ? ' — ' + escH(c.icd_label) : '') : ' · no ICD code') + '</div>' +
    (verified ? '<div class="dx-info-verified" style="border:0;margin:6px 0">✓ Clinically verified' + (c.review_verified_on ? ' on ' + escH(c.review_verified_on) : '') + (c.review_verified_by ? ' by ' + escH(c.review_verified_by) : '') + '</div>'
     : provisional ? '<div class="dx-info-review" style="border:0;margin:6px 0">⚠ Provisional — AI-drafted, pending clinical verification. Not a source of thresholds, doses or statistics.</div>' : '') +

    (info && info.summary ? '<div class="kbd-summary">' + escH(info.summary) + '</div>' : '') +
    (info && info.facts && info.facts.length ? '<ul class="kbd-facts">' + info.facts.map(function (f) { return '<li>' + escH(f) + '</li>'; }).join("") + '</ul>' : '') +

    '<div class="kbd-sec"><div class="kbd-sec-t">Required findings</div>' + chips(c.req, "kbd-req") + '</div>' +
    (c.sup && c.sup.length ? '<div class="kbd-sec"><div class="kbd-sec-t">Supportive</div>' + chips(c.sup) + '</div>' : '') +
    (c.tests && c.tests.length ? '<div class="kbd-sec"><div class="kbd-sec-t">Confirmatory tests</div>' + chips(c.tests) + '</div>' : '') +
    (c.con && c.con.length ? '<div class="kbd-sec"><div class="kbd-sec-t">Points against</div>' + chips(c.con, "kbd-con") + '</div>' : '') +

    (typeof isAdmin === "function" && isAdmin() ?
      '<div class="btn-g" style="margin-top:10px">' +
        (provisional ? '<button class="btn btn-p" onclick="reviewVerify(\'' + escH(String(c.name)).replace(/'/g, "\\'") + '\');showKBDetail(\'' + escH(String(c.name)).replace(/'/g, "\\'") + '\')" style="font-size:.62rem">Verify ✓</button>' : '') +
        '<button class="btn btn-s" onclick="openKbEditor(\'' + escH(String(c.name)).replace(/'/g, "\\'") + '\')" style="font-size:.62rem">Edit in KB editor</button>' +
      '</div>' : '') +
  '</div>';

  box.innerHTML = h;
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
  if (msg) { msg.textContent = "Checking…"; msg.style.color = "var(--md)"; }
  if (typeof kbRemoteCheck !== "function") { if (msg) msg.textContent = "Updates unavailable in this build."; return; }
  kbRemoteCheck(function (err, outcome) {
    if (!msg) return;
    if (outcome === "applied") {
      /* The running KB was replaced in memory — re-render the list right now so
         the update is visibly live, and report the new count. */
      var n = (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) ? KNOWLEDGE_ALL.length : "";
      showKBInfo();
      var m2 = document.getElementById("kbUpdMsg");
      if (m2) { m2.style.color = "var(--sl)"; m2.textContent = "✓ Updated live — " + n + " conditions now loaded."; }
      return;
    }
    if (outcome === "deferred") {
      msg.style.color = "var(--sl)";
      msg.innerHTML = "Update downloaded — an exam is open, so it applies on restart. " +
        '<a href="#" onclick="if(confirm(\'Reload now to apply the knowledge-base update?\'))location.reload();return false" style="color:var(--ac,#c8a200)">Apply now (reload)</a>';
      return;
    }
    var text = {
      current: "✓ Already up to date.",
      none: "No published updates yet.",
      rejected: "Update rejected — it failed safety validation, so the current KB was kept.",
      disabled: "Cloud updates are off (fully offline). The KB works locally regardless.",
      error: "Couldn't reach the update server — you're offline, or it's unreachable. The app is unaffected."
    }[outcome] || String(outcome);
    msg.style.color = (outcome === "current") ? "var(--sl)" : "var(--md)";
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
  var nv = {
    id: vid,
    patient_id: pid,
    data: V,
    status: "in_progress",
    visit_type: "initial",
    date: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  /* Attribute the visit at CREATION, not at first save. Otherwise a visit
     opened and then abandoned (device locked, browser closed) exists in the
     record with no author at all. */
  if (typeof recStampVisit === "function") recStampVisit(nv, (typeof CU !== "undefined" ? CU : null));
  visits.push(nv);
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

  /* Duplicate-patient check (clinical review CL-4). Runs when the clinician
     LEAVES demographics — the first moment identity is actually known, and
     before any clinical data is attached to a possibly-duplicate record.
     Once per visit: it must never nag mid-consultation. */
  if (V.step === "demographics" && stepId !== "demographics" &&
      !V._dupChecked && typeof recCheckDuplicates === "function" &&
      P && (P.first_name || P.last_name)) {
    V._dupChecked = true;
    var _pending = stepId;
    recCheckDuplicates(P, function () { nav(_pending); });
    return;                       /* the callback continues, or we opened the other chart */
  }

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
/* Cycle: absent -> OD -> OS -> OU -> absent (CL-2). One tap per state, so a
   finding cannot be recorded without an eye. */
function togSlFind(item) {
  if (typeof recCycleFinding === "function") V.sl.findings = recCycleFinding(V.sl.findings, item);
  else { var i0 = V.sl.findings.indexOf(item); if (i0 >= 0) V.sl.findings.splice(i0, 1); else V.sl.findings.push(item); }
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  renderAdvisory();
}

/* Toggle fundus finding */
/* Cycle: absent -> OD -> OS -> OU -> absent (CL-2). */
function togFunFind(item) {
  if (typeof recCycleFinding === "function") V.fun.findings = recCycleFinding(V.fun.findings, item);
  else { var i0 = V.fun.findings.indexOf(item); if (i0 >= 0) V.fun.findings.splice(i0, 1); else V.fun.findings.push(item); }
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

/* Both names now delegate to the ONE implementation in js/dom-escape.js.
   They are kept as-is so no call site changes (hundreds of them), but there
   is no longer a second copy of the rules that can drift — which is exactly
   how the weaker fallback in seven UI modules went unnoticed. See the header
   of dom-escape.js for that bug.

   Behaviour is unchanged for esc(); escH() previously returned "" for any
   falsy input (including the number 0 and false), which silently dropped
   legitimate values — it now escapes them like esc() does. */
function escH(s) { return escHtml(s); }

/* Escape user text for BOTH attribute values and element bodies.
   Must escape < and > too: many call sites drop esc() output inside a
   <textarea>…</textarea> body, where a quotes-only escape lets
   "</textarea><img onerror=…>" break out (stored XSS — and remote
   free-text from another clinician now renders here via cloud sync).
   Full escaping is safe in every context these strings appear in. */
function esc(s) { return escHtml(s); }


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

  /* Append specialty-clinic sections to STEPS (hidden until a pack is
     switched on for the visit). Done at boot so the step list is complete
     before any sidebar render. */
  if (typeof registerClinicSteps === "function") registerClinicSteps();

  /* If the record vault is on and this device is locked, the unlock screen
     owns the start-up path. Critically, we must NOT fall through to the
     "do any users exist?" check below — with a locked vault the account list
     is unreadable, so it would read zero accounts and offer to create one. */
  if (typeof vaultUiBootGate !== "function" || !vaultUiBootGate()) {
    /* If no users exist, show setup form */
    var users = loadUsers();
    if (users.length === 0) {
      showView("setupView", "loginView");
    }
  }

  /* Log knowledge base status */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    console.log("Entopic: Knowledge base loaded — " + KNOWLEDGE_ALL.length + " conditions");
  } else {
    console.log("Entopic: Knowledge base not loaded — diagnostic engine will use fallback");
  }

  console.log("Entopic v1.0 initialized");

})();
