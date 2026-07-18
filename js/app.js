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

  var user = {
    id: "u" + Date.now().toString(36),
    username: uname,
    password: pw,
    name: name,
    cred: cred,
    clinic: clinic,
    created: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  CU = user;
  showHomePage();
}

function doLogout() {
  CU = null;
  CP = null;
  CV = null;
  P = {};
  V = {};
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
}

function renderHome() {
  var patients = loadPatients();
  var visits   = loadVisits();
  var today    = new Date().toISOString().slice(0, 10);

  var todayV = visits.filter(function(v) {
    return v.date && v.date.startsWith(today);
  });

  var inProg = visits.filter(function(v) {
    return v.status === "in_progress";
  });

  /* Patient rows */
  var rows = "";
  if (patients.length === 0) {
    rows = '<div class="p-empty">No patients yet. Click "New Patient" to begin.</div>';
  } else {
    var sorted = patients.slice().reverse();
    for (var i = 0; i < sorted.length; i++) {
      var pt = sorted[i];
      var nm = (pt.first_name || "New") + " " + (pt.last_name || "Patient");
      var lastV = getLastVisit(pt.id);
      var status = lastV && lastV.status === "completed"
        ? '<span style="color:var(--sl);font-size:.54rem;font-weight:600"> ✓</span>'
        : '<span style="color:var(--md);font-size:.54rem"> ●</span>';

      rows += '<div class="p-row" onclick="openPatient(\'' + pt.id + '\')">' +
        '<div><b>' + escH(nm) + '</b>' + status + '</div>' +
        '<span style="font-family:var(--mono);color:var(--sv);font-size:.6rem">' + escH(pt.mrn || "") + '</span>' +
        '</div>';
    }
  }

  /* API Key status */
  var apiStatus = API_KEY
    ? '<div class="home-settings-status">✓ API key configured — interpretive remarks active</div>'
    : '<div class="home-settings-status" style="color:var(--md)">⚠ No key — diagnostic engine works offline, interpretive remarks disabled</div>';

  /* KB info */
  var kbCondCount = 0;
  if (typeof KNOWLEDGE_ALL !== "undefined" && Array.isArray(KNOWLEDGE_ALL)) {
    kbCondCount = KNOWLEDGE_ALL.length;
  }

  /* Storage stats */
  var stats = getStorageStats();

  /* Render */
  document.getElementById("homeContent").innerHTML =

    /* Header */
    '<div class="home-hd">' +
      '<h1>Dashboard</h1>' +
      '<div style="display:flex;gap:6px">' +
        '<button class="btn btn-p" onclick="newPatient()">+ New Patient</button>' +
        '<button class="btn btn-s" onclick="exportAllData()" style="font-size:.6rem">Export</button>' +
      '</div>' +
    '</div>' +

    /* Stats */
    '<div class="stats">' +
      '<div class="stat"><div class="v">' + patients.length + '</div><div class="l">Total Patients</div></div>' +
      '<div class="stat"><div class="v">' + todayV.length + '</div><div class="l">Today</div></div>' +
      '<div class="stat"><div class="v">' + inProg.length + '</div><div class="l">In Progress</div></div>' +
    '</div>' +

    /* Patient list */
    '<div class="p-list">' +
      '<div class="p-list-h"><span>Patients</span><span style="font-size:.58rem;color:var(--sv)">' + stats.kb + ' KB used</span></div>' +
      rows +
    '</div>' +

    /* Settings — API Key */
    '<div class="home-settings">' +
      '<div class="home-settings-title">🔑 AI Interpretive Engine (Claude API)</div>' +
      '<div class="home-settings-desc">Optional. Provides clinical remarks and speech parsing. The diagnostic engine runs fully offline without this.</div>' +
      '<div style="display:flex;gap:6px;align-items:center">' +
        '<button class="btn btn-s" onclick="openModal(\'modalApiKey\')" style="font-size:.62rem">' + (API_KEY ? "Update API Key" : "Configure API Key") + '</button>' +
      '</div>' +
      apiStatus +
    '</div>' +

    /* Settings — Knowledge Base */
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📋 Knowledge Base</div>' +
      '<div class="home-settings-desc">' + kbCondCount + ' conditions across ' + (typeof KNOWLEDGE_DOMAINS !== "undefined" ? Object.keys(KNOWLEDGE_DOMAINS).length : "—") + ' domains</div>' +
      '<button class="btn btn-s" onclick="showKBInfo()" style="font-size:.62rem">View Details</button>' +
      '<span id="kbEditorCardSlot"></span>' +
    '</div>' +

    /* Settings — Import */
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📁 Data Management</div>' +
      '<div class="home-settings-desc">Import a previous Entopic backup file</div>' +
      '<input type="file" accept=".json" onchange="if(this.files[0])importData(this.files[0])" style="font-size:.62rem">' +
    '</div>' +

    /* Settings — Cloud Sync */
    renderCloudCard();

  /* Reveal the KB Editor button only for the build owner (async check). */
  if (typeof kbEditorAllowed === "function") {
    kbEditorAllowed(function (allowed) {
      var slot = document.getElementById("kbEditorCardSlot");
      if (slot && allowed) {
        slot.innerHTML = ' <button class="btn btn-p" onclick="openKbEditor()" style="font-size:.62rem;margin-left:6px">✎ Edit / Add conditions</button>';
      }
    });
  }
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
  var pid = "p" + Date.now().toString(36);
  var vid = "v" + (Date.now() + 1).toString(36);
  var mrn = "EP-" + Date.now().toString(36).toUpperCase();

  P = blankPatient(pid, mrn);
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
