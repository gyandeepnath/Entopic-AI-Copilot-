/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — INDEXEDDB SAFETY MIRROR                               */
/*                                                                  */
/* localStorage is the primary store (unchanged), but it is small    */
/* (~5 MB) and fragile: "clear browsing data", storage pressure      */
/* eviction, or an aggressive cleaner can silently wipe the whole    */
/* clinic. This module mirrors every clinic-data write into          */
/* IndexedDB (hundreds of MB, separate eviction class) and, if       */
/* localStorage is found EMPTY at boot while the mirror has data,    */
/* restores everything and reloads once.                             */
/*                                                                  */
/* Properties:                                                       */
/*  - Additive: no behavior change while localStorage is healthy.    */
/*  - Fire-and-forget: mirror writes are async and never block or    */
/*    fail a save (the primary write already succeeded).             */
/*  - Offline: IndexedDB is local; no network involved, ever.        */
/*  - Loop-safe: recovery reloads at most once per tab session.      */
/*                                                                  */
/* The API key is deliberately NOT mirrored (it is not clinic data   */
/* and re-entering it is cheap).                                     */
/*                                                                  */
/* Load order: before storage.js (storage.js calls mirrorStore /     */
/* mirrorRemove if they exist).                                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var MIRROR_DB_NAME = "entopic_mirror";
var MIRROR_DB_VERSION = 1;
var MIRROR_STORE_NAME = "kv";
/* Keys (without the "entopic_" prefix) that constitute clinic data. */
/* `vault_meta` is here for a reason that is easy to miss and catastrophic to
   get wrong. With the record vault on, the mirrored copies of users/patients/
   visits are CIPHERTEXT, and the only thing that can decrypt them is the
   wrapped data key inside `entopic_vault_meta`. If localStorage were cleared —
   precisely the situation this mirror exists to survive — recovery would
   restore the ciphertext while the key wrapper stayed lost, and every patient
   record would be permanently unreadable even with the correct passphrase AND
   the recovery code. Mirroring the wrapper closes that hole.

   Storing it here is safe: the meta contains only the data key WRAPPED by the
   passphrase- and recovery-derived keys, never the key itself, so a stolen
   IndexedDB is no more useful than stolen localStorage. */
/* kb_signoffs is here because a clinician's review of 394 conditions is
   irreplaceable human work that nobody can regenerate. It used to live inside
   the KB content-edit overlay, which is not mirrored — so a cleared browser
   destroyed all of it. It is review attestations only (name, date, reviewer,
   content fingerprint): no patient data, no clinical content. */
var MIRROR_KEYS = ["users", "patients", "visits", "settings", "registry_queue", "vault_meta", "kb_signoffs"];
var MIRROR_BOOT_FLAG = "entopic_mirror_recovered";

function mirrorSupported() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/* Decision logic kept pure so it can be unit-tested in Node. */
function needsMirrorRecovery(hasLocalData, mirrorKeyCount, alreadyRecoveredThisSession) {
  if (alreadyRecoveredThisSession) return false;
  if (hasLocalData) return false;
  return mirrorKeyCount > 0;
}

function openMirror(onReady, onFail) {
  try {
    var req = indexedDB.open(MIRROR_DB_NAME, MIRROR_DB_VERSION);
    req.onupgradeneeded = function (ev) {
      var db = ev.target.result;
      if (!db.objectStoreNames.contains(MIRROR_STORE_NAME)) {
        db.createObjectStore(MIRROR_STORE_NAME, { keyPath: "key" });
      }
    };
    req.onsuccess = function (ev) { onReady(ev.target.result); };
    req.onerror = function () { if (onFail) onFail(req.error); };
  } catch (e) {
    if (onFail) onFail(e);
  }
}

/* Write one store's JSON payload into the mirror. Fire-and-forget:
   the localStorage write already succeeded; a mirror failure only
   costs redundancy, so it is logged and swallowed. */
function mirrorPutRaw(key, rawJson) {
  if (!mirrorSupported()) return;
  if (MIRROR_KEYS.indexOf(key) === -1) return; /* only clinic data */
  openMirror(function (db) {
    try {
      var tx = db.transaction(MIRROR_STORE_NAME, "readwrite");
      tx.objectStore(MIRROR_STORE_NAME).put({
        key: key,
        json: rawJson,
        updated: new Date().toISOString()
      });
      tx.oncomplete = function () { db.close(); };
      tx.onerror = function () { db.close(); };
    } catch (e) {
      console.error("Mirror write error [" + key + "]:", e);
      try { db.close(); } catch (e2) {}
    }
  }, function (err) {
    console.error("Mirror open error:", err);
  });
}

/* Called by storage.js saveStore with the already-serialized data. */
function mirrorStore(key, data) {
  try {
    mirrorPutRaw(key, JSON.stringify(data));
  } catch (e) {
    console.error("Mirror serialize error [" + key + "]:", e);
  }
}

/* Called by storage.js removeStore. */
function mirrorRemove(key) {
  if (!mirrorSupported()) return;
  if (MIRROR_KEYS.indexOf(key) === -1) return;
  openMirror(function (db) {
    try {
      var tx = db.transaction(MIRROR_STORE_NAME, "readwrite");
      tx.objectStore(MIRROR_STORE_NAME).delete(key);
      tx.oncomplete = function () { db.close(); };
      tx.onerror = function () { db.close(); };
    } catch (e) {
      try { db.close(); } catch (e2) {}
    }
  });
}

/* Read the entire mirror: cb(objectMappingKeyToRecord). */
function mirrorReadAll(cb) {
  if (!mirrorSupported()) { cb({}); return; }
  openMirror(function (db) {
    try {
      var tx = db.transaction(MIRROR_STORE_NAME, "readonly");
      var req = tx.objectStore(MIRROR_STORE_NAME).getAll();
      req.onsuccess = function () {
        var out = {};
        (req.result || []).forEach(function (rec) { out[rec.key] = rec; });
        db.close();
        cb(out);
      };
      req.onerror = function () { db.close(); cb({}); };
    } catch (e) {
      try { db.close(); } catch (e2) {}
      cb({});
    }
  }, function () { cb({}); });
}

/* Seed/refresh the mirror from whatever is currently in localStorage
   (covers data written before this module existed). */
function mirrorSeedFromLocalStorage() {
  for (var i = 0; i < MIRROR_KEYS.length; i++) {
    var key = MIRROR_KEYS[i];
    try {
      var raw = localStorage.getItem("entopic_" + key);
      if (raw !== null) mirrorPutRaw(key, raw);
    } catch (e) { /* ignore */ }
  }
}

/* ── Boot-time recovery ──
   If localStorage holds no clinic data but the mirror does, restore and
   reload once. Runs immediately at script load (before app.js init reads
   users), but recovery itself is async — hence the one-shot reload. */
(function attemptMirrorRecovery() {
  if (!mirrorSupported()) return;
  if (typeof localStorage === "undefined") return;

  var alreadyRecovered = false;
  try {
    alreadyRecovered = sessionStorage.getItem(MIRROR_BOOT_FLAG) === "1";
  } catch (e) { /* sessionStorage unavailable → skip loop guard, still safe */ }

  var hasLocalData = false;
  try {
    hasLocalData =
      localStorage.getItem("entopic_users") !== null ||
      localStorage.getItem("entopic_patients") !== null;
  } catch (e) { return; }

  if (hasLocalData || alreadyRecovered) {
    /* Normal boot: make sure the mirror reflects current data. */
    mirrorSeedFromLocalStorage();
    return;
  }

  mirrorReadAll(function (mirrorData) {
    var keys = Object.keys(mirrorData);
    if (!needsMirrorRecovery(hasLocalData, keys.length, alreadyRecovered)) return;
    try {
      for (var i = 0; i < keys.length; i++) {
        localStorage.setItem("entopic_" + keys[i], mirrorData[keys[i]].json);
      }
      try { sessionStorage.setItem(MIRROR_BOOT_FLAG, "1"); } catch (e2) {}
      console.warn("Entopic: localStorage was empty — restored " + keys.length +
        " store(s) from the IndexedDB safety mirror. Reloading.");
      location.reload();
    } catch (e) {
      console.error("Mirror recovery failed:", e);
    }
  });
})();
