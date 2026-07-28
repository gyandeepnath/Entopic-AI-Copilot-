/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — STORAGE LAYER                                         */
/* localStorage CRUD for users, patients, visits                   */
/* Import/export, versioning, anonymized encounter builder         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── STORAGE PREFIX ── */
var STORE_PREFIX = "entopic_";
var STORE_VERSION = "1.0.0";


/* ═══════════════════════════════════════════════════════════════ */
/* CORE READ / WRITE                                               */
/* ═══════════════════════════════════════════════════════════════ */

function loadStore(key, fallback) {
  try {
    var raw = localStorage.getItem(STORE_PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.error("Storage read error [" + key + "]:", e);
    return fallback;
  }
}

function saveStore(key, data) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(data));
    /* Redundant copy into the IndexedDB safety mirror (async, never blocks;
       see storage-mirror.js). Enables auto-recovery if localStorage is wiped. */
    if (typeof mirrorStore === "function") mirrorStore(key, data);
    /* Queue for cloud backup/sync when signed in (async, never blocks;
       see cloud-sync.js). No-op when offline/signed out/disabled. */
    if (typeof cloudEnqueue === "function") cloudEnqueue(key);
  } catch (e) {
    console.error("Storage write error [" + key + "]:", e);
    /* If quota exceeded, warn user */
    if (e.name === "QuotaExceededError" || e.code === 22) {
      alert("Storage is full. Consider exporting and clearing old patient data.");
    }
  }
}

function removeStore(key) {
  try {
    localStorage.removeItem(STORE_PREFIX + key);
    if (typeof mirrorRemove === "function") mirrorRemove(key);
  } catch (e) {
    console.error("Storage remove error [" + key + "]:", e);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* ENTITY HELPERS                                                  */
/* ═══════════════════════════════════════════════════════════════ */

/* Users */
function loadUsers() {
  return loadStore("users", []);
}

function saveUsers(users) {
  saveStore("users", users);
}

/* Patients */
function loadPatients() {
  return loadStore("patients", []);
}

function savePatients(patients) {
  saveStore("patients", patients);
}

/* Visits */
function loadVisits() {
  return loadStore("visits", []);
}

function saveVisits(visits) {
  saveStore("visits", visits);
}

/* API Key */
function loadApiKey() {
  var key = localStorage.getItem(STORE_PREFIX + "apikey") || "";
  return key;
}

function saveApiKey(key) {
  localStorage.setItem(STORE_PREFIX + "apikey", key);
}

/* Settings */
function loadSettings() {
  return loadStore("settings", {
    registry_optin: false,
    auto_save_interval: 20000,
    theme: "light",
    language: "en"
  });
}

function saveSettings(settings) {
  saveStore("settings", settings);
}

/* ═══════════════════════════════════════════════════════════════ */
/* AUDIT LOG — append-only trail of who accessed/changed what       */
/* Every record-touching action is logged with the acting user and  */
/* a timestamp, so a completed chart shows a defensible access +     */
/* change history. Stored locally (mirrored like other stores) and   */
/* capped so localStorage stays bounded.                            */
/* ═══════════════════════════════════════════════════════════════ */

function loadAudit() { return loadStore("audit", []); }
function saveAudit(entries) { saveStore("audit", entries); }

/* Record one event. `ids` may override the current patient/visit context. */
function logAudit(action, details, ids) {
  ids = ids || {};
  var user = (typeof CU !== "undefined" && CU) ? CU : null;
  var entries = loadAudit();
  entries.push({
    ts: new Date().toISOString(),
    user: user ? (user.username || "unknown") : "unknown",
    user_name: user ? (user.name || "") : "",
    action: action,
    patient_id: ids.patient_id !== undefined ? ids.patient_id : (typeof CP !== "undefined" ? CP : null),
    visit_id: ids.visit_id !== undefined ? ids.visit_id : (typeof CV !== "undefined" ? CV : null),
    details: details || ""
  });
  /* keep only the most recent 2000 events */
  if (entries.length > 2000) entries = entries.slice(entries.length - 2000);
  saveAudit(entries);
}

function getPatientAudit(patientId) {
  return loadAudit()
    .filter(function (e) { return e.patient_id === patientId; })
    .sort(function (a, b) { return (b.ts || "").localeCompare(a.ts || ""); });
}


/* ═══════════════════════════════════════════════════════════════ */
/* VISIT OPERATIONS                                                */
/* ═══════════════════════════════════════════════════════════════ */

/**
 * Get all visits for a specific patient, sorted newest first
 */
function getPatientVisits(patientId) {
  var visits = loadVisits();
  return visits
    .filter(function(v) { return v.patient_id === patientId; })
    .sort(function(a, b) { return (b.date || "").localeCompare(a.date || ""); });
}

/**
 * Get the most recent visit for a patient
 */
function getLastVisit(patientId) {
  var pv = getPatientVisits(patientId);
  return pv.length > 0 ? pv[0] : null;
}

/**
 * Get the previous completed visit (for comparison view)
 */
function getPreviousVisit(patientId, currentVisitId) {
  var pv = getPatientVisits(patientId);
  var found = false;
  for (var i = 0; i < pv.length; i++) {
    if (pv[i].id === currentVisitId) {
      found = true;
      continue;
    }
    if (found && pv[i].status === "completed") {
      return pv[i];
    }
  }
  return null;
}


/* ═══════════════════════════════════════════════════════════════ */
/* SAVE CURRENT SESSION                                            */
/* Called by autosave timer and on navigation                      */
/* ═══════════════════════════════════════════════════════════════ */

function doSave() {
  if (!CV) return;

  /* Save visit data */
  var visits = loadVisits();
  for (var i = 0; i < visits.length; i++) {
    if (visits[i].id === CV) {
      visits[i].data = V;
      visits[i].updated = new Date().toISOString();
      break;
    }
  }
  saveVisits(visits);

  /* Save patient data */
  var patients = loadPatients();
  for (var j = 0; j < patients.length; j++) {
    if (patients[j].id === CP) {
      /* Update patient fields without replacing the whole object.
         Stamp `updated` only when the record actually changed — cloud sync
         uses this per-record stamp for last-writer-wins, so an untouched
         patient must keep its old stamp (a fresh stamp on every save would
         let this device silently overwrite another device's newer edit). */
      var before = JSON.stringify(patients[j]);
      for (var k in P) {
        if (P.hasOwnProperty(k)) {
          patients[j][k] = P[k];
        }
      }
      if (JSON.stringify(patients[j]) !== before) {
        P.updated = new Date().toISOString();
        patients[j].updated = P.updated;
      }
      break;
    }
  }
  savePatients(patients);

  /* Flash save indicator */
  var el = document.getElementById("saveInd");
  if (el) {
    el.classList.add("show");
    setTimeout(function() { el.classList.remove("show"); }, 1200);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* COMPLETE VISIT                                                  */
/* Changes status from in_progress → completed                    */
/* ═══════════════════════════════════════════════════════════════ */

function completeVisit() {
  doSave();

  var visits = loadVisits();
  for (var i = 0; i < visits.length; i++) {
    if (visits[i].id === CV) {
      visits[i].status = "completed";
      visits[i].completed_at = new Date().toISOString();
      visits[i].data = V;
      break;
    }
  }
  saveVisits(visits);

  if (typeof logAudit === "function") {
    var lead = (V.dxList && V.dxList.length) ? V.dxList[0].n : "no diagnosis";
    logAudit("visit_completed", "Visit completed — leading impression: " + lead, { patient_id: CP, visit_id: CV });
  }

  /* Build anonymized encounter if registry opt-in */
  var settings = loadSettings();
  if (settings.registry_optin) {
    buildAnonymizedEncounter();
  }

  alert("Visit marked as completed.");
  goHome();
}


/* ═══════════════════════════════════════════════════════════════ */
/* DELETE PATIENT (with confirmation)                              */
/* ═══════════════════════════════════════════════════════════════ */

function deletePatient(patientId) {
  if (!confirm("Delete this patient and all their visits? This cannot be undone.")) return;

  /* Remove all visits for this patient (capture ids so peers can be told). */
  var visits = loadVisits();
  var goneVisits = visits.filter(function (v) { return v.patient_id === patientId; }).map(function (v) { return v.id; });
  visits = visits.filter(function(v) { return v.patient_id !== patientId; });
  saveVisits(visits);

  /* Remove patient */
  var patients = loadPatients();
  patients = patients.filter(function(p) { return p.id !== patientId; });
  savePatients(patients);

  /* Propagate the deletes to peers as tombstones — without this the record
     resurrects on the next cloud pull (DD finding H-6). No-op when offline. */
  if (typeof cloudEnqueueDelete === "function") {
    cloudEnqueueDelete("patients", patientId);
    goneVisits.forEach(function (vid) { cloudEnqueueDelete("visits", vid); });
  }
  if (typeof logAudit === "function") logAudit("patient_deleted", "Patient and " + goneVisits.length + " visit(s) deleted", { patient_id: patientId });
}


/* ═══════════════════════════════════════════════════════════════ */
/* DATA EXPORT                                                     */
/* Exports all data as a downloadable JSON file                    */
/* ═══════════════════════════════════════════════════════════════ */

function exportAllData() {
  var data = {
    version: STORE_VERSION,
    exported: new Date().toISOString(),
    users: loadUsers(),
    patients: loadPatients(),
    visits: loadVisits(),
    settings: loadSettings(),
    audit: loadAudit()
  };
  if (typeof logAudit === "function") logAudit("data_exported", "Exported all data (JSON backup)", { patient_id: null, visit_id: null });

  var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "entopic-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


/* ═══════════════════════════════════════════════════════════════ */
/* DATA IMPORT                                                     */
/* Imports from a JSON backup file                                 */
/* ═══════════════════════════════════════════════════════════════ */

function importData(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);

      if (!data.patients || !data.visits) {
        alert("Invalid backup file — missing patient or visit data.");
        return;
      }

      if (!confirm("This will REPLACE all current data. Continue?")) return;

      if (data.users) saveUsers(data.users);
      if (data.patients) savePatients(data.patients);
      if (data.visits) saveVisits(data.visits);
      if (data.settings) saveSettings(data.settings);

      alert("Data imported successfully. " + data.patients.length + " patients, " + data.visits.length + " visits.");
      location.reload();

    } catch (err) {
      alert("Failed to parse backup file: " + err.message);
    }
  };
  reader.readAsText(file);
}


/* ═══════════════════════════════════════════════════════════════ */
/* ANONYMIZED ENCOUNTER BUILDER                                    */
/* Strips all PII, retains only clinical tokens for registry       */
/* ═══════════════════════════════════════════════════════════════ */

function buildAnonymizedEncounter() {
  if (!V || !P) return null;

  var enc = {
    timestamp: new Date().toISOString(),
    age_bracket: getAgeBracket(P.age),
    sex: P.sex || "Unknown",

    /* Symptom tokens (from selected symptoms) */
    symptom_tokens: (V.symptoms || []).slice(),

    /* Temporal pattern */
    temporal: V.temporal || {},

    /* Finding tokens (from slit lamp + fundus selections) */
    finding_tokens: []
      .concat(V.sl ? V.sl.findings : [])
      .concat(V.fun ? V.fun.findings : []),

    /* Diagnosis results */
    diagnosis_tokens: (V.dxList || []).map(function(d) {
      return { name: d.n, confidence: d.prob, route: d.cat };
    }),

    /* Treatment category */
    treatment_category: categorizeTreatment(V.plan),

    /* Referral */
    referral_type: V.plan ? V.plan.ref_to : "",
    referral_urgency: V.plan ? V.plan.ref_urgency : "",

    /* Exam completeness */
    steps_completed: (V.completed || []).length,
    total_steps: STEPS.length
  };

  /* Store in local registry queue */
  var queue = loadStore("registry_queue", []);
  queue.push(enc);
  saveStore("registry_queue", queue);

  return enc;
}

/**
 * Categorize the treatment plan into broad categories
 * (for anonymized data — no specific drug names)
 */
function categorizeTreatment(plan) {
  if (!plan || !plan.mgmt) return "none";
  var m = plan.mgmt.toLowerCase();
  if (/tear|lubric|artificial/.test(m)) return "lubricants";
  if (/warm compress|lid hygiene/.test(m)) return "lid_care";
  if (/vision therapy|exercises/.test(m)) return "vision_therapy";
  if (/refer/.test(m)) return "referral";
  if (/spectacle|glasses|lens/.test(m)) return "optical_correction";
  if (/monitor|review|follow/.test(m)) return "monitoring";
  return "other";
}


/* ═══════════════════════════════════════════════════════════════ */
/* STORAGE STATS                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function getStorageStats() {
  var total = 0;
  for (var key in localStorage) {
    if (key.startsWith(STORE_PREFIX)) {
      total += localStorage.getItem(key).length;
    }
  }
  return {
    bytes: total,
    kb: (total / 1024).toFixed(1),
    mb: (total / (1024 * 1024)).toFixed(2),
    patients: loadPatients().length,
    visits: loadVisits().length,
    users: loadUsers().length
  };
}
