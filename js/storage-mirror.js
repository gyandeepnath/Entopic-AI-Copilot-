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
/* Which stores get mirrored is NOT decided here — it is declared once in
   js/data-classification.js and derived. This list used to be maintained by
   hand alongside two others, and the three drifted: the audit trail was
   encrypted and backed up but never mirrored, and four stores added later
   (consents, research_corpus, research_salt, feedback) were mirrored by
   nothing at all.

   Two entries worth understanding, both explained in full in the table:
     vault_meta  — without the wrapped key, recovered ciphertext is
                   permanently unreadable, which would make this mirror worse
                   than useless in the exact disaster it exists for.
     kb_signoffs — a clinician's review of 394 conditions; nobody can
                   regenerate it. */
var MIRROR_KEYS = (typeof dataStoresWith === "function")
  ? dataStoresWith("mirror")
  : ["users", "patients", "visits", "settings", "vault_meta", "kb_signoffs"];
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

/* ── Snapshot namespace (automatic backup, BE-18) ──
   mirrorPutRaw refuses any key not in MIRROR_KEYS, which is right: the mirror
   holds declared clinic stores and nothing else, so a stray key cannot quietly
   consume a clinic's IndexedDB quota. Automatic backups need somewhere to live
   that is NOT a store, so they get an explicit, narrow namespace rather than a
   hole in the allowlist. Returns a promise — a snapshot's caller needs to know
   whether the bytes actually landed. */
var MIRROR_SNAPSHOT_PREFIX = "snap_";

function mirrorIsSnapshotKey(key) {
  return typeof key === "string" && key.indexOf(MIRROR_SNAPSHOT_PREFIX) === 0;
}

function mirrorPutBlob(key, rawJson) {
  if (!mirrorSupported()) return Promise.reject(new Error("IndexedDB unavailable"));
  if (!mirrorIsSnapshotKey(key)) return Promise.reject(new Error("not a snapshot key"));
  return new Promise(function (resolve, reject) {
    openMirror(function (db) {
      try {
        var tx = db.transaction(MIRROR_STORE_NAME, "readwrite");
        tx.objectStore(MIRROR_STORE_NAME).put({
          key: key, json: rawJson, updated: new Date().toISOString()
        });
        tx.oncomplete = function () { db.close(); resolve(true); };
        tx.onerror = function () { db.close(); reject(new Error("snapshot write failed")); };
      } catch (e) {
        try { db.close(); } catch (e2) {}
        reject(e);
      }
    }, function (err) { reject(err || new Error("could not open the mirror")); });
  });
}

/* Read ONE key back out. Added for the automatic-backup snapshots, which are
   large and must not require loading every mirrored store to fetch one.
   Returns a promise for the raw JSON string, or null. */
function mirrorRemoveBlob(key) {
  if (!mirrorSupported() || !mirrorIsSnapshotKey(key)) return Promise.resolve(false);
  return new Promise(function (resolve) {
    openMirror(function (db) {
      try {
        var tx = db.transaction(MIRROR_STORE_NAME, "readwrite");
        tx.objectStore(MIRROR_STORE_NAME).delete(key);
        tx.oncomplete = function () { db.close(); resolve(true); };
        tx.onerror = function () { db.close(); resolve(false); };
      } catch (e) { try { db.close(); } catch (e2) {} resolve(false); }
    }, function () { resolve(false); });
  });
}

function mirrorGetRaw(key) {
  if (!mirrorSupported()) return Promise.resolve(null);
  return new Promise(function (resolve) {
    openMirror(function (db) {
      try {
        var tx = db.transaction(MIRROR_STORE_NAME, "readonly");
        var req = tx.objectStore(MIRROR_STORE_NAME).get(key);
        req.onsuccess = function () {
          var rec = req.result;
          db.close();
          resolve(rec ? rec.json : null);   /* the field mirrorPutRaw writes */
        };
        req.onerror = function () { db.close(); resolve(null); };
      } catch (e) {
        try { db.close(); } catch (e2) {}
        resolve(null);
      }
    }, function () { resolve(null); });
  });
}

/* Seed/refresh the mirror from whatever is currently in localStorage
   (covers data written before this module existed). */
/* Seed the mirror from localStorage — but ONLY from values that are actually
   readable.

   This used to copy the raw bytes unconditionally. So a localStorage store
   damaged by a crash mid-write was faithfully mirrored over the last good
   copy, destroying the safety net at the exact moment it was needed. The
   mirror exists to survive corruption; it must never inherit it. */
function mirrorSeedFromLocalStorage() {
  for (var i = 0; i < MIRROR_KEYS.length; i++) {
    var key = MIRROR_KEYS[i];
    try {
      var raw = localStorage.getItem("entopic_" + key);
      if (raw === null) continue;
      if (!mirrorRawLooksValid(key, raw)) {
        console.error("Entopic: refusing to mirror the damaged '" + key + "' store — " +
          "the existing mirror copy is kept so the data can still be recovered.");
        continue;
      }
      mirrorPutRaw(key, raw);
    } catch (e) { /* ignore */ }
  }
}

/* Stores that must hold a list. A parsed-but-wrong-shape value is corrupt
   too, and more dangerous than unparseable bytes because it survives
   JSON.parse and reaches every caller that iterates it. Derived from the
   same declaration as everything else. */
var MIRROR_ARRAY_KEYS = (typeof dataStoresShaped === "function")
  ? dataStoresShaped("array")
  : ["users", "patients", "visits", "audit"];

/* Is this raw value safe to copy over the mirror's existing good copy?
   Deliberately conservative: when in doubt, keep what the mirror already has. */
function mirrorRawLooksValid(key, raw) {
  var parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return false; }
  if (parsed === undefined) return false;

  /* An encrypted envelope is opaque by design and always mirrorable — that
     is exactly what the vault needs the mirror to hold. */
  var isEnvelope = !!(parsed && typeof parsed === "object" && parsed.ct && parsed.iv);
  if (isEnvelope) return true;

  /* Shape comes from the classification table, which knows that research_salt
     is a bare string. The old check demanded `typeof parsed === "object"` and
     so would have silently refused to mirror the salt — and a corpus without
     its salt cannot be linked to anything captured after the restore. */
  if (typeof dataShapeOk === "function") return dataShapeOk(key, parsed);
  if (parsed === null || typeof parsed !== "object") return false;
  if (MIRROR_ARRAY_KEYS.indexOf(key) >= 0) return Array.isArray(parsed);
  return true;
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
