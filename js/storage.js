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
    /* Proactive quota check (DD M-4): warn BEFORE the hard wall, once. */
    storageQuotaWatch();
  } catch (e) {
    console.error("Storage write error [" + key + "]:", e);
    if (e.name === "QuotaExceededError" || e.code === 22) {
      /* The record is still safe in the IndexedDB mirror (storage-mirror.js) and,
         if signed in and consented, encrypted in the cloud — so this is "cannot
         add more here", not "data lost". Say so, and point to the fix. */
      var mirrored = (typeof mirrorStore === "function");
      alert("This device's local storage is full.\n\n" +
        (mirrored ? "Your existing records are safe (mirrored on this device" +
          (typeof cloudSignedIn === "function" && cloudSignedIn() ? " and backed up to your cloud" : "") + ").\n\n" : "") +
        "To keep saving here: export and archive older patient records (Admin → Data), " +
        "or connect cloud sync so records live in your project rather than this browser.");
      _storageWarned = true;
    }
  }
}

/* ── Local storage headroom (DD M-4) ──────────────────────────────
   localStorage is a hard 5–10 MB ceiling and is the system of record today.
   The correct long-term fix is an async IndexedDB record store (a larger
   migration — the IndexedDB MIRROR already exists in storage-mirror.js, but
   the hot read path is still synchronous localStorage). Until then this gives
   the clinic a graceful early warning instead of a wall at 100%. */
var STORAGE_BUDGET_BYTES = 5 * 1024 * 1024;   /* conservative floor across browsers */
var _storageWarned = false;

function storageUsage() {
  var chars = 0;
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      chars += k.length + (localStorage.getItem(k) || "").length;
    }
  } catch (e) {}
  var bytes = chars * 2;   /* localStorage stores UTF-16 */
  return { bytes: bytes, budget: STORAGE_BUDGET_BYTES, pct: Math.min(100, Math.round(100 * bytes / STORAGE_BUDGET_BYTES)) };
}

function storageQuotaWatch() {
  var u = storageUsage();
  if (u.pct >= 80 && !_storageWarned) {
    _storageWarned = true;
    if (typeof toast === "function") {
      toast("Local storage " + u.pct + "% full — export/archive old records or connect cloud sync soon.");
    }
    if (typeof logAudit === "function") { try { logAudit("storage_pressure", "localStorage " + u.pct + "% full", {}); } catch (e) {} }
  } else if (u.pct < 70) {
    _storageWarned = false;   /* reset after headroom is reclaimed */
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

  /* Also append to the SERVER audit log when signed in (DD H-7). Best-effort:
     async, never blocks, and carries only de-identified fields (action, detail,
     opaque record ids) — never a name/MRN/DOB. */
  if (typeof cloudAuditPush === "function") {
    try { cloudAuditPush(action, details || "", ids.patient_id, ids.visit_id); } catch (e) {}
  }
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

/* Validate a parsed backup before it is allowed to replace live records.
   Pure, so the rules are testable. Returns {ok, errors[], warnings[], counts}.

   Production-readiness audit (H-1): the old check was `data.patients &&
   data.visits` — an empty array passes that, so restoring a truncated or
   wrong-shaped file silently wiped a clinic's records with a success message.
   Version is checked too: a backup from a future STORE_VERSION may carry
   fields this build does not understand. */
/* Compare two store versions. STORE_VERSION is a semver STRING ("1.0.0"), but
   older exports may carry a plain number, so handle both: -1 / 0 / 1, or null
   when either side is unusable. (Naive Number() comparison silently yields NaN
   on "1.0.0" and would let a future backup through — pinned by a test.) */
function compareStoreVersion(a, b) {
  function parts(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!/^\d+(\.\d+)*$/.test(s)) return null;
    return s.split(".").map(function (n) { return parseInt(n, 10); });
  }
  var pa = parts(a), pb = parts(b);
  if (!pa || !pb) return null;
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function validateBackup(data) {
  var errors = [], warnings = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["The file is not an Entopic backup (not a JSON object)."], warnings: [], counts: null };
  }
  if (!Array.isArray(data.patients)) errors.push("No patient list in this file — it is not an Entopic backup.");
  if (!Array.isArray(data.visits))   errors.push("No visit list in this file — it is not an Entopic backup.");
  if (errors.length) return { ok: false, errors: errors, warnings: warnings, counts: null };

  /* Shape-check a sample rather than every record: enough to catch a wrong
     file, cheap on a large backup. */
  var sample = data.patients.slice(0, 25);
  for (var i = 0; i < sample.length; i++) {
    if (!sample[i] || typeof sample[i] !== "object" || !sample[i].id) {
      errors.push("Patient records in this file are missing their id — the file looks corrupt.");
      break;
    }
  }
  var vs = data.visits.slice(0, 25);
  for (var j = 0; j < vs.length; j++) {
    if (!vs[j] || typeof vs[j] !== "object" || !vs[j].id) {
      errors.push("Visit records in this file are missing their id — the file looks corrupt.");
      break;
    }
  }

  var here = (typeof STORE_VERSION !== "undefined") ? STORE_VERSION : null;
  if (data.version == null) {
    warnings.push("No version stamp — this backup predates version tracking.");
  } else {
    var cmp = compareStoreVersion(data.version, here);
    if (cmp === 1) {
      errors.push("This backup was written by a NEWER version of Entopic (v" + data.version +
                  " vs v" + here + "). Update Entopic before restoring it, or data could be lost.");
    } else if (cmp === null) {
      warnings.push("The version stamp in this file (\"" + data.version + "\") could not be read.");
    }
  }
  if (!data.patients.length) warnings.push("This backup contains NO patients.");
  if (!Array.isArray(data.audit)) warnings.push("No audit trail in this backup — the access history will not be restored.");

  return {
    ok: errors.length === 0,
    errors: errors,
    warnings: warnings,
    counts: { patients: data.patients.length, visits: data.visits.length,
              users: Array.isArray(data.users) ? data.users.length : 0 }
  };
}

function importData(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      alert("Failed to parse backup file: " + err.message);
      return;
    }

    var check = validateBackup(data);
    if (!check.ok) {
      alert("This file was NOT restored:\n\n• " + check.errors.join("\n• ") +
            "\n\nYour current records are untouched.");
      return;
    }

    var current = { patients: loadPatients().length, visits: loadVisits().length };
    var msg =
      "RESTORE FROM BACKUP\n\n" +
      "Replacing:  " + current.patients + " patients, " + current.visits + " visits (on this device now)\n" +
      "With:       " + check.counts.patients + " patients, " + check.counts.visits + " visits (from the file)\n" +
      (check.warnings.length ? "\nNote:\n• " + check.warnings.join("\n• ") + "\n" : "") +
      "\nA safety copy of the CURRENT data will be downloaded first so this can be undone.\n\nContinue?";
    if (!confirm(msg)) return;

    /* Safety snapshot before anything is overwritten (audit H-1). If the
       snapshot cannot be produced, stop — an un-undoable replace is exactly
       the failure this guards against. */
    try {
      if (typeof exportAllData === "function") exportAllData();
    } catch (err2) {
      alert("Could not download a safety copy of the current data, so nothing was replaced.\n\n(" +
            (err2 && err2.message) + ")");
      return;
    }

    if (data.users) saveUsers(data.users);
    savePatients(data.patients);
    saveVisits(data.visits);
    if (data.settings) saveSettings(data.settings);
    /* Restore the audit trail too — losing the access history on restore
       would break the record the clinic may have to produce. */
    if (Array.isArray(data.audit) && typeof saveAudit === "function") saveAudit(data.audit);

    if (typeof logAudit === "function") {
      try {
        logAudit("data_restored",
          "Restored backup: " + check.counts.patients + " patients, " + check.counts.visits +
          " visits (replaced " + current.patients + "/" + current.visits + ")", {});
      } catch (e3) {}
    }

    alert("Restored " + check.counts.patients + " patients and " + check.counts.visits + " visits.\n\n" +
          "The safety copy of your previous data was downloaded to this device.");
    location.reload();
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
