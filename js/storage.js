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

/* ── Local vault bridge (js/local-vault.js) ───────────────────────
   When the record vault is ON, the protected stores are CIPHERTEXT on
   disk. Reads here must stay synchronous (the whole app depends on it),
   so an unlocked vault serves them from its in-memory plaintext cache.

   The dangerous case is "vault on but LOCKED". Returning the fallback
   (an empty array) would let a later save write that empty array over a
   clinic's real records. So a locked vault refuses reads AND writes on
   protected stores rather than pretending the store is empty. */
function _vaultOnFor(key) {
  return typeof vaultEnabled === "function" && vaultEnabled() &&
         typeof vaultIsProtected === "function" && vaultIsProtected(key);
}

/* ── WHY THERE IS NO PARSE CACHE HERE ANY MORE ──
   (Removed deliberately. Read this before adding one back.)

   A cache keyed on the raw string, handing back the SHARED parsed object,
   lived here briefly and was measured at 284 ms -> 0.012 ms on loadVisits().
   The adversarial harness (tools/stress/attack.js, attack A1) then showed
   what it cost:

       save a visit -> the write fails on quota -> loadVisits() STILL
       RETURNS IT, because the caller's array is the cache's array.

   That is the one moment this product must not be wrong. The clinician is
   being told "this device has stopped saving"; every check of what actually
   persisted was reading the unsaved value instead. The same aliasing meant
   an edit that was never saved read back as though it were stored (A2, A3),
   and one reader could see another reader's uncommitted mutation (A7).

   The safe version was measured too, and it is not safe AND fast — it is
   just slow: returning a copy costs structuredClone 753 ms vs JSON.parse
   645 ms at 9,000 visits. Copying is SLOWER than re-parsing.

   And the size it was optimising cannot occur. localStorage exhausts at
   ~1,900 visits (measured, tools/bench/storage-bench.js); at 4.96 MB an
   uncached parse is ~30 ms. The cache was buying nothing at any store size
   this product can actually hold, in exchange for the storage layer being
   able to lie about what is on disk.

   The real fixes for save cost at scale are an incremental save (write only
   the record that changed) and per-patient visit keys. Both are sound
   because neither hands out a shared mutable view of the store.

   loadStore() therefore returns a FRESH parse on every call, and the whole
   codebase may go on assuming that reading tells you what is on disk. */

function loadStore(key, fallback) {
  if (_vaultOnFor(key)) {
    if (!vaultUnlocked()) {
      /* Locked: say "nothing available" rather than "empty". Callers get the
         fallback, but saveStore below will refuse to persist over the real
         data, so nothing can be lost. */
      return fallback;
    }
    var cached = vaultCacheGet(key);
    return (cached === undefined) ? fallback : cached;
  }
  try {
    var raw = localStorage.getItem(STORE_PREFIX + key);
    if (raw === null) { storageNoteReadOk(key); return fallback; }

    var parsed = JSON.parse(raw);
    /* Ciphertext found while the vault is off/unavailable — do NOT hand back
       an envelope object as if it were records. */
    if (typeof vaultIsEnvelope === "function" && vaultIsEnvelope(parsed)) return fallback;
    /* A store that should be a list but isn't is corrupt, even though it
       parsed. Handing back a string or an object would crash every caller
       that iterates it. */
    if (STORE_EXPECTED_ARRAY.indexOf(key) >= 0 && !Array.isArray(parsed)) {
      storageNoteCorrupt(key, raw, "expected a list, found " + (parsed === null ? "null" : typeof parsed));
      return fallback;
    }
    storageNoteReadOk(key);
    return parsed;
  } catch (e) {
    /* CORRUPT, not empty. This distinction is the whole point:
       a truncated store (what a crash or a disk error mid-write produces)
       used to read back as [] and the very next save wrote [] over it,
       destroying every record with no warning and nothing to recover from.
       Proven in a browser: 3 patients -> truncate -> reload -> 0 shown ->
       one ordinary save -> 1 patient stored, the other 3 gone forever. */
    storageNoteCorrupt(key, raw, (e && e.message) || "unreadable");
    return fallback;
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* CORRUPT-STORE PROTECTION                                        */
/*                                                                  */
/* Three rules, in order of importance:                            */
/*                                                                  */
/*   1. NEVER overwrite a store we could not read. An unreadable    */
/*      store may still be recoverable — by hand, from the mirror,  */
/*      or from a backup — but only while it still exists.          */
/*   2. Keep a copy of the damaged bytes before doing anything.     */
/*   3. Say so, loudly. Reading zero patients must never look like  */
/*      a clinic with zero patients.                                */
/* ═══════════════════════════════════════════════════════════════ */

/* Stores whose contents must be a list. A parsed-but-wrong-shape value is
   just as corrupt as unparseable bytes, and more dangerous because it
   survives JSON.parse. Declared once in js/data-classification.js. */
var STORE_EXPECTED_ARRAY = (typeof dataStoresShaped === "function")
  ? dataStoresShaped("array")
  : ["users", "patients", "visits", "audit"];

var STORE_CORRUPT = {};   /* key -> {at, reason, bytes, quarantine} while unreadable */

function storageNoteCorrupt(key, raw, reason) {
  if (STORE_CORRUPT[key]) return STORE_CORRUPT[key];

  /* Quarantine the damaged bytes under a separate key so that even a
     later successful write cannot erase the only remaining copy. */
  var qKey = STORE_PREFIX + "corrupt_" + key + "_" + Date.now();
  var quarantined = false;
  if (typeof raw === "string" && raw.length) {
    quarantined = (typeof lsSet === "function") ? lsSet(qKey, raw) : false;
  }

  STORE_CORRUPT[key] = {
    at: new Date().toISOString(),
    reason: reason || "unreadable",
    bytes: (typeof raw === "string") ? raw.length : 0,
    quarantine: quarantined ? qKey : null
  };

  console.error("Entopic: the '" + key + "' store is damaged (" + STORE_CORRUPT[key].reason +
    "). Writes to it are now BLOCKED so the damaged data cannot be overwritten." +
    (quarantined ? " A copy was kept at " + qKey + "." : ""));

  if (typeof logAudit === "function") {
    try { logAudit("storage_corrupt", "The '" + key + "' store could not be read: " +
      STORE_CORRUPT[key].reason, {}); } catch (e) {}
  }
  if (typeof evEmit === "function") evEmit("storage:corrupt", { key: key, info: STORE_CORRUPT[key] });
  return STORE_CORRUPT[key];
}

function storageNoteReadOk(key) {
  if (STORE_CORRUPT[key]) delete STORE_CORRUPT[key];
}

/* Which stores are currently unreadable. Surfaced by the deployment
   readiness panel and the banner. */
function storageCorruptStores() {
  return Object.keys(STORE_CORRUPT).map(function (k) {
    return { key: k, at: STORE_CORRUPT[k].at, reason: STORE_CORRUPT[k].reason,
             quarantine: STORE_CORRUPT[k].quarantine };
  });
}

function storageIsCorrupt(key) { return !!STORE_CORRUPT[key]; }

/* Deliberate operator action: accept that the damaged store is unrecoverable
   and allow writes again. Requires the caller to have shown the user what is
   being given up — nothing calls this automatically. */
function storageAcceptCorruptLoss(key) {
  if (!STORE_CORRUPT[key]) return false;
  if (typeof logAudit === "function") {
    try { logAudit("storage_corrupt_accepted",
      "Operator accepted the loss of the damaged '" + key + "' store; writes re-enabled.", {}); } catch (e) {}
  }
  delete STORE_CORRUPT[key];
  return true;
}

function saveStore(key, data) {
  /* A store we could not READ must not be WRITTEN. Otherwise the app,
     holding the empty fallback it was handed, cheerfully saves that empty
     value over records that were merely damaged — turning a recoverable
     problem into permanent loss. This is the same reasoning as the
     vault-locked refusal below; it was simply never applied to corruption. */
  if (storageIsCorrupt(key)) {
    console.error("Storage write refused [" + key + "]: the stored data is damaged and " +
      "would be overwritten. Restore from a backup, or accept the loss explicitly.");
    return false;
  }

  if (_vaultOnFor(key)) {
    if (!vaultUnlocked()) {
      /* Refusing is the safe answer: writing plaintext would defeat the vault,
         and writing a fallback-derived value would destroy real records. */
      console.error("Storage write refused [" + key + "]: the record vault is locked.");
      return false;
    }
    vaultCacheSet(key, data);                       /* memory now, ciphertext shortly */
    if (typeof cloudEnqueue === "function") cloudEnqueue(key);
    storageQuotaWatch();
    /* `true`, not a bare return. saveStore's contract is a boolean; this path
       used to return undefined, which is why every caller in the codebase is
       written `saveStore(...) !== false` rather than the obvious
       `if (saveStore(...))`. A write function whose success value is falsy is
       an invitation to a silent-failure bug, and one of those is fixed
       immediately below in doSave(). */
    return true;
  }
  /* Mirror FIRST, deliberately.

     MEASURED FAILURE (scalability review P-1): at ~3,000 patients / 9,000
     visits this device's localStorage budget (~9 MB in Chromium) is exhausted.
     The old code wrote localStorage, and only then the IndexedDB mirror — both
     inside one try. So when the quota threw, the mirror write was SKIPPED, and
     the alert nevertheless told the clinician "your existing records are safe
     (mirrored on this device)". That reassurance was false for the very record
     that had just failed to save.

     IndexedDB has a far larger quota than localStorage, so writing it first
     makes it a genuine safety net: even when the main write fails, the record
     is captured and recoverable. */
  if (typeof mirrorStore === "function") {
    try { mirrorStore(key, data); } catch (e) { /* mirror is best-effort */ }
  }
  try {
    var json = JSON.stringify(data);
    localStorage.setItem(STORE_PREFIX + key, json);
    /* Queue for cloud backup/sync when signed in (async, never blocks;
       see cloud-sync.js). No-op when offline/signed out/disabled. */
    if (typeof cloudEnqueue === "function") cloudEnqueue(key);
    /* Proactive quota check (DD M-4): warn BEFORE the hard wall, once. */
    storageQuotaWatch();
    storageNoteWriteOk(key);
    return true;
  } catch (e) {
    console.error("Storage write error [" + key + "]:", e);
    var quota = (e.name === "QuotaExceededError" || e.code === 22 ||
                 e.name === "NS_ERROR_DOM_QUOTA_REACHED");
    storageNoteWriteFailure(key, quota ? "quota" : (e.name || "error"));
    return false;
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* WRITE-FAILURE STATE (scalability review P-1)                    */
/*                                                                  */
/* A failed save used to be a dismissible alert and nothing else:   */
/* saveStore returned undefined, so every caller carried on as if   */
/* the record had persisted. A clinic crossing the storage ceiling  */
/* mid-morning would keep working while visits silently stopped     */
/* being saved — the worst possible failure for clinical records,   */
/* because nothing in the data says anything is wrong.              */
/*                                                                  */
/* Now: saveStore returns a boolean, failures are recorded and stay */
/* recorded until writes succeed again, and the state is surfaced   */
/* in the UI rather than shown once and forgotten.                  */
/* ═══════════════════════════════════════════════════════════════ */
var STORAGE_FAILED = null;   /* {key, reason, at, count} while writes are failing */

function storageNoteWriteFailure(key, reason) {
  if (STORAGE_FAILED && STORAGE_FAILED.key === key) STORAGE_FAILED.count++;
  else STORAGE_FAILED = { key: key, reason: reason, at: new Date().toISOString(), count: 1 };
  _storageWarned = true;
  if (typeof evEmit === "function") evEmit("storage:write-failed", STORAGE_FAILED);
}

function storageNoteWriteOk(key) {
  if (STORAGE_FAILED && STORAGE_FAILED.key === key) {
    STORAGE_FAILED = null;
    if (typeof evEmit === "function") evEmit("storage:write-ok", null);
  }
}

/* Is this device currently failing to persist records? Surfaced by the
   deployment readiness panel and the banner. */
function storageWriteFailure() { return STORAGE_FAILED; }

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

/* These four return saveStore's boolean. They used to swallow it, so a caller
   could not tell a completed write from a refused one — see doSave(). */
function saveUsers(users) {
  return saveStore("users", users) !== false;
}

/* Patients */
function loadPatients() {
  return loadStore("patients", []);
}

function savePatients(patients) {
  return saveStore("patients", patients) !== false;
}

/* Visits */
function loadVisits() {
  return loadStore("visits", []);
}

function saveVisits(visits) {
  return saveStore("visits", visits) !== false;
}

/* API Key — a billable credential, so it is vault-wrapped like the cloud
   session (security review S-1). The read stays SYNCHRONOUS because the whole
   app calls loadApiKey() inline; when the key is wrapped it is served from a
   memory cache that loadApiKeyAsync() fills after unlock. A locked device
   returns "" — no key, so no spend on a thief's behalf. */
var _apiKeyCache = null;

function loadApiKey() {
  var raw = "";
  try { raw = localStorage.getItem(STORE_PREFIX + "apikey") || ""; } catch (e) {}
  if (!raw) return "";
  if (typeof vaultIsWrappedSecret === "function" && vaultIsWrappedSecret(raw)) {
    return _apiKeyCache || "";     /* available only once unlocked + hydrated */
  }
  return raw;
}

/* Fill the cache after the vault opens. Returns a promise for callers that
   need to wait; safe to call when the vault is off (resolves immediately). */
function loadApiKeyAsync() {
  if (typeof vaultSecretGet !== "function") return Promise.resolve(loadApiKey());
  return vaultSecretGet(STORE_PREFIX + "apikey").then(function (k) {
    if (k) _apiKeyCache = k;
    return k || "";
  });
}

function saveApiKey(key) {
  _apiKeyCache = key || null;
  if (typeof vaultSecretSet === "function") { vaultSecretSet(STORE_PREFIX + "apikey", key); return; }
  try { localStorage.setItem(STORE_PREFIX + "apikey", key); } catch (e) {}
}

/* Clearing the in-memory copy is part of locking the device. */
function clearApiKeyCache() { _apiKeyCache = null; }

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

var AUDIT_MAX_LOCAL = 2000;

function loadAudit() { return loadStore("audit", []); }
function saveAudit(entries) { saveStore("audit", entries); }

/* Describe a truncation in words a reader of the trail can act on. Pure. */
function auditNoteTruncation(dropped) {
  var n = dropped.length;
  var first = (dropped[0] && dropped[0].ts) || "";
  var last = (dropped[n - 1] && dropped[n - 1].ts) || "";
  return n + " earlier audit event(s) were removed to stay within this device's " +
    "storage limit" +
    (first ? ", covering " + String(first).slice(0, 10) + " to " + String(last).slice(0, 10) : "") +
    ". History before this point is NOT available locally. The server audit log " +
    "(when the backend is connected) is append-only and keeps the full record.";
}

/* Has the local trail lost history? Surfaced in the Admin health card so the
   gap is visible rather than discovered later. */
function auditTruncationNotice() {
  var entries = loadAudit();
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].action === "audit_truncated") {
      return { truncated: true, at: entries[i].ts, details: entries[i].details };
    }
  }
  return { truncated: false };
}

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
  /* Cap the local trail so localStorage stays bounded — but NEVER silently.
     For a records system the access log can be the evidence, and quietly
     discarding the oldest entries leaves an invisible hole in it (audit H-7).
     When we drop events we (a) record how many and which period were lost,
     (b) leave a marker IN the trail itself so the gap is self-evident to
     anyone reading it, and (c) surface it to the admin. The server-side
     audit log is append-only and immutable, so a connected clinic keeps the
     full history regardless — which is the real fix, and what the marker
     tells the reader to do. */
  if (entries.length > AUDIT_MAX_LOCAL) {
    var dropCount = entries.length - AUDIT_MAX_LOCAL;
    var dropped = entries.slice(0, dropCount);
    entries = entries.slice(dropCount);
    var note = auditNoteTruncation(dropped);
    entries.unshift({
      ts: new Date().toISOString(),
      user: "system", user_name: "",
      action: "audit_truncated",
      patient_id: null, visit_id: null,
      details: note
    });
    if (typeof toast === "function") {
      try { toast("Local audit trail reached its limit — " + dropCount + " oldest events archived out. Connect the backend to keep full history."); } catch (e) {}
    }
  }
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

/* The `updated` stamp of the visit as this tab last saw it. doSave() compares
   it against what is on disk to notice another window (or another clinician on
   the same machine) having written the same visit in between. Reset whenever a
   visit is opened or created. */
var VISIT_SEEN_STAMP = null;

function setVisitSeenStamp(stamp) { VISIT_SEEN_STAMP = stamp || null; }

/* Save the open exam.

   RETURNS a result object, and the return value matters:
   { ok, visit_written, patient_written, visit_found, reason }

   ── THE DEFECT THIS CLOSES (backend audit BE-1) ──

   doSave() used to ignore what the storage layer told it and emit
   "visit:saved" unconditionally. Measured in a browser: corrupt the visits
   store (what a truncated write leaves behind), keep typing, save — the
   write is correctly REFUSED by the corrupt-store guard, and the app still
   announced the save. The clinician sees the saved indicator and carries on
   for the rest of the consultation believing their work is captured.

   The records were never destroyed — that protection held, and it is why
   this is a reporting failure rather than a loss. But a clinician who is
   told their work is safe when it is not will not act, and the distinction
   is invisible to them. Silence would have been better than a false
   reassurance; the truth is better than both.

   The same applied to a locked vault, a quota-exhausted device, and a
   visit whose id is no longer in the store at all. */
function doSave() {
  if (!CV) return { ok: false, visit_written: false, patient_written: false,
                    visit_found: false, reason: "no visit is open" };

  /* Save visit data */
  var visits = loadVisits();
  var visitFound = false;
  for (var i = 0; i < visits.length; i++) {
    if (visits[i].id === CV) {
      visitFound = true;
      /* Did another window write this visit since we last saw it? If so, keep
         the version we are about to replace — a clinician's measurement must
         never vanish because a second tab happened to save later. */
      if (typeof recDetectConflict === "function") {
        var conflict = recDetectConflict(visits[i], VISIT_SEEN_STAMP);
        if (conflict) {
          recPreserveOverwritten(visits[i], conflict);
          if (typeof logAudit === "function") {
            try { logAudit("visit_conflict",
              "Another window had saved this visit (" + conflict.by + "). That version was " +
              "preserved on the record rather than discarded.", { visit_id: CV }); } catch (e) {}
          }
          if (typeof evEmit === "function") evEmit("visit:conflict", conflict);
        }
      }
      /* Material-change audit (security audit SEC-9). Captured BEFORE the
         payload is replaced, because afterwards the previous version is gone
         from this array. Only the prescription, the plan and the recorded
         diagnosis — and only which FIELD changed, never the values, which
         already live on the record itself under the correct access controls. */
      if (typeof auditMaterialChange === "function") {
        try {
          auditMaterialChange(visits[i].data, V, { patient_id: CP, visit_id: CV },
            visits[i].status === "completed");
        } catch (e) {}
      }
      visits[i].data = V;
      /* Attribution + amendment trail (clinical review CL-3): stamp WHO saved
         this and WHEN. A save by another clinician, or on a later day, is
         recorded as an amendment rather than silently replacing the original. */
      if (typeof recStampVisit === "function") {
        recStampVisit(visits[i], (typeof CU !== "undefined" ? CU : null));
      } else {
        visits[i].updated = new Date().toISOString();
      }
      /* This tab has now seen the visit at this stamp; the next save compares
         against it to notice another window writing in between. */
      VISIT_SEEN_STAMP = visits[i].updated;
      break;
    }
  }
  var visitWritten = saveVisits(visits);

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
  var patientWritten = savePatients(patients);

  /* A visit whose id is not in the store cannot have been written, however
     well the write itself went. This happens when the store was unreadable
     and handed back the empty fallback, or when another device's delete
     tombstone removed the record while it was open here. The loop above
     simply found nothing and the array went back untouched — silently. */
  /* Order matters: a damaged store EXPLAINS a missing visit, so say that
     first. "The visit is no longer in the record store" is alarming and
     unactionable; "the store is damaged and writes are blocked" tells the
     clinician what to do and that their records were not destroyed. */
  var reason = "";
  if (storageIsCorrupt("visits")) {
    reason = "the visit store is damaged and writes are blocked";
  } else if (!visitFound) {
    reason = "the open visit is no longer in the record store";
  } else if (!visitWritten) {
    reason = STORAGE_FAILED ? "the last write failed (" + STORAGE_FAILED.reason + ")"
                            : "the visit store refused the write";
  } else if (!patientWritten) {
    reason = storageIsCorrupt("patients") ? "the patient store is damaged and writes are blocked"
           : "the patient store refused the write";
  }

  var res = {
    ok: visitFound && visitWritten && patientWritten,
    visit_written: visitWritten, patient_written: patientWritten,
    visit_found: visitFound, reason: reason
  };

  /* Announce what ACTUALLY happened. Whether that shows as a flashing
     indicator, a banner, or nothing at all is not this layer's business —
     but this layer must not claim a save it did not make. */
  if (typeof evEmit === "function") {
    var payload = { patient_id: P && P.id, visit_id: V && V.id };
    if (res.ok) {
      evEmit("visit:saved", payload);
    } else {
      payload.reason = reason;
      payload.result = res;
      evEmit("visit:save-failed", payload);
      if (typeof logAudit === "function") {
        try { logAudit("visit_save_failed", "A save of the open visit did not complete: " +
          reason, { visit_id: CV }); } catch (e) {}
      }
      console.error("Entopic: the open visit was NOT saved — " + reason);
    }
  }
  return res;
}


/* ═══════════════════════════════════════════════════════════════ */
/* COMPLETE VISIT                                                  */
/* Changes status from in_progress → completed                    */
/* ═══════════════════════════════════════════════════════════════ */

function completeVisit() {
  /* If the exam could not be SAVED, it must not be marked COMPLETED. Signing
     off a consultation whose data did not persist produces the worst artefact
     this system can make: a record that says the visit is finished, missing
     everything recorded after the write started failing, with an audit entry
     asserting completion. Refuse, say why, and leave the visit in progress so
     the clinician can fix the device and complete it properly. (BE-1) */
  var saved = doSave();
  if (saved && saved.ok === false) {
    if (typeof logAudit === "function") {
      try { logAudit("visit_complete_refused",
        "Completion refused because the visit could not be saved: " + saved.reason,
        { patient_id: CP, visit_id: CV }); } catch (e) {}
    }
    if (typeof evEmit === "function") {
      evEmit("visit:complete-failed", { visit_id: CV, patient_id: CP, reason: saved.reason });
    }
    return { ok: false, reason: saved.reason };
  }

  var visits = loadVisits();
  var found = false;
  for (var i = 0; i < visits.length; i++) {
    if (visits[i].id === CV) {
      visits[i].status = "completed";
      visits[i].completed_at = new Date().toISOString();
      visits[i].data = V;
      found = true;
      break;
    }
  }
  var completeWritten = saveVisits(visits) && found;
  if (!completeWritten) {
    if (typeof evEmit === "function") {
      evEmit("visit:complete-failed", { visit_id: CV, patient_id: CP,
        reason: found ? "the record store refused the write" : "the visit is no longer in the record store" });
    }
    return { ok: false, reason: found ? "the record store refused the write"
                                      : "the visit is no longer in the record store" };
  }

  if (typeof logAudit === "function") {
    var lead = (V.dxList && V.dxList.length) ? V.dxList[0].n : "no diagnosis";
    logAudit("visit_completed", "Visit completed — leading impression: " + lead, { patient_id: CP, visit_id: CV });
  }

  /* Contribute to the research corpus.

     Gated on the PATIENT's explicit consent, not on a practice-wide setting.
     The old code captured every completed visit whenever a clinic-level
     `registry_optin` flag was on — a practice cannot consent on a patient's
     behalf to secondary use of their data, so that flag was collecting
     liability rather than a usable corpus. corpusCapture() refuses, with a
     reason, unless this patient has granted research consent against the
     current wording (js/consent.js). */
  if (typeof corpusCapture === "function" && typeof P !== "undefined" && P) {
    try {
      /* Pass the stored visit's date: it lives on the wrapper, not on V. */
      var _cvRec = null, _cvList = loadVisits();
      for (var _ci = 0; _ci < _cvList.length; _ci++) {
        if (_cvList[_ci].id === CV) { _cvRec = _cvList[_ci]; break; }
      }
      corpusCapture(V, P, { visitDate: _cvRec && (_cvRec.date || _cvRec.created) });
    } catch (e) {}
  }

  alert("Visit marked as completed.");
  goHome();
  return { ok: true, reason: "" };
}


/* ═══════════════════════════════════════════════════════════════ */
/* DELETE PATIENT (with confirmation)                              */
/* ═══════════════════════════════════════════════════════════════ */

/* Delete a patient and their whole clinical history.

   CLINICAL RECORD SAFETY (review CL-6): this destroys a medical record
   irreversibly, and the only thing standing between a mis-click and permanent
   loss of a patient's entire history was a single OK button. Two guards now:

     1. A snapshot of the patient AND every visit is downloaded FIRST, so the
        record can be reconstructed if the deletion was a mistake. If the
        snapshot cannot be produced, the deletion does not proceed.
     2. The clinician must type the patient's name. "Are you sure?" is answered
        reflexively; typing a name is not.

   Retention rules for clinical records vary by jurisdiction and may forbid
   deletion outright — that is a policy question for the practice, and the
   snapshot at least means the data still exists to comply with. */
function deletePatient(patientId) {
  var pts = loadPatients();
  var pt = null;
  for (var pi = 0; pi < pts.length; pi++) if (pts[pi].id === patientId) { pt = pts[pi]; break; }
  if (!pt) return;

  var allVisits = loadVisits();
  var theirs = allVisits.filter(function (v) { return v.patient_id === patientId; });
  var label = ((pt.first_name || "") + " " + (pt.last_name || "")).trim() || pt.mrn || "this patient";

  var typed = (typeof prompt === "function") ? prompt(
    "PERMANENTLY DELETE a patient record\n\n" +
    label + (pt.mrn ? "  [" + pt.mrn + "]" : "") + "\n" +
    theirs.length + " visit(s) will be destroyed. This CANNOT be undone.\n\n" +
    "A snapshot of this record will be downloaded first so it can be restored if this is a mistake.\n\n" +
    "Type the patient's name exactly to confirm:", "") : null;

  if (typed === null) return;
  if (String(typed).trim().toLowerCase() !== label.toLowerCase()) {
    if (typeof alert === "function") alert("That did not match \"" + label + "\" — nothing was deleted.");
    return;
  }

  /* Snapshot before destroying. If this fails, stop: an unrecoverable delete
     is exactly what this guards against. */
  try {
    downloadBackupFile({
      __entopic_deleted_record: true,
      note: "Snapshot taken immediately before this patient record was deleted. " +
            "Restore by re-importing, or reconcile manually.",
      deleted_at: new Date().toISOString(),
      deleted_by: (typeof CU !== "undefined" && CU) ? (CU.name || CU.username || "") : "",
      patient: pt,
      visits: theirs
    }, "-deleted-" + String(patientId));
  } catch (e) {
    if (typeof alert === "function") {
      alert("Could not save a snapshot of this record, so NOTHING was deleted.\n\n(" +
            ((e && e.message) || "unknown error") + ")");
    }
    return;
  }

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
  if (typeof logAudit === "function") logAudit("patient_deleted", "Patient \"" + label + "\" and " + goneVisits.length + " visit(s) deleted (snapshot downloaded first)", { patient_id: patientId });
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


/* The banners these conditions raise are NOT built here any more.
   js/ui-storage-banners.js subscribes to storage:write-failed,
   storage:write-ok, storage:corrupt and visit:conflict and decides how to
   tell the clinician. This layer states the fact; it does not own the copy,
   the colours, or the DOM. */
