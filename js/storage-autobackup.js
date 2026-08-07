/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — AUTOMATIC BACKUP  (backend audit BE-18)               */
/*                                                                  */
/* ── THE GAP THIS CLOSES ──                                       */
/*                                                                  */
/* Backups were complete, and the restore was careful and           */
/* merge-aware. They were also entirely manual. A device that dies  */
/* having never been backed up and never synced takes the           */
/* practice's whole clinical record with it, and the only thing     */
/* standing in the way was somebody remembering to press a button   */
/* every week for several years.                                    */
/*                                                                  */
/* That is the single most likely total-loss path in the product,   */
/* and it is not an engineering problem — it is a human one, which  */
/* is exactly why it has to be solved in software.                  */
/*                                                                  */
/* ── WHAT IT DOES ──                                              */
/*                                                                  */
/* Keeps a rolling set of dated snapshots in IndexedDB — a          */
/* different storage class from localStorage, with a far larger     */
/* quota and a different eviction policy — and tells the clinician  */
/* how old their newest OFF-DEVICE copy is, because an on-device    */
/* backup does not survive the device.                              */
/*                                                                  */
/* ── WHAT IT DELIBERATELY DOES NOT DO ──                          */
/*                                                                  */
/* It does not write to the file system by itself. A browser cannot */
/* without a user gesture, and pretending otherwise would be the    */
/* worst kind of safety feature: one that reports success while     */
/* protecting nothing. So the on-device snapshot is automatic, the  */
/* off-device export stays a deliberate act, and the age of the     */
/* last real export is shown plainly rather than buried.            */
/*                                                                  */
/* It also does not silently replace cloud sync. A snapshot on the  */
/* same device is protection against a bad write, a failed          */
/* migration or a mistaken deletion — NOT against the device being  */
/* lost, stolen or dropped. The UI says which is which.             */
/*                                                                  */
/* Load order: after storage-backup.js (buildBackupPayload) and     */
/* storage-mirror.js (the IndexedDB handle).                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var AUTOBACKUP_META = "autobackup";        /* declared store: state, not data */
var AUTOBACKUP_KEEP = 7;                   /* rolling snapshots retained */
var AUTOBACKUP_MIN_GAP_MS = 6 * 60 * 60 * 1000;   /* at most one per 6 hours */
var AUTOBACKUP_STALE_DAYS = 7;             /* when to start nagging about an export */

function autobackupState() {
  if (typeof loadStore !== "function") return { snapshots: [], last_export: null };
  var s = loadStore(AUTOBACKUP_META, null);
  if (!s || typeof s !== "object") return { snapshots: [], last_export: null };
  return { snapshots: Array.isArray(s.snapshots) ? s.snapshots : [], last_export: s.last_export || null };
}

function _autobackupSave(state) {
  if (typeof saveStore !== "function") return false;
  return saveStore(AUTOBACKUP_META, state) !== false;
}

/* Age in whole days of the newest OFF-DEVICE copy. The number that matters:
   an on-device snapshot is worth a great deal against a bad write and nothing
   at all against a stolen laptop. */
function autobackupExportAgeDays() {
  var st = autobackupState();
  if (!st.last_export) return null;
  var t = Date.parse(st.last_export);
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400000);
}

function autobackupExportIsStale() {
  var age = autobackupExportAgeDays();
  return age === null || age >= AUTOBACKUP_STALE_DAYS;
}

/* Record that the clinician actually downloaded a backup file. Called by the
   export path — not by the snapshot path, deliberately, because conflating the
   two is how a clinic ends up believing it is protected when it is not. */
function autobackupNoteExport() {
  var st = autobackupState();
  st.last_export = new Date().toISOString();
  _autobackupSave(st);
  if (typeof logAudit === "function") {
    try { logAudit("backup_exported", "A full backup file was exported from this device.", {}); } catch (e) {}
  }
  return st.last_export;
}

/* Take an on-device snapshot into IndexedDB.

   Returns a promise for { ok, reason, id, bytes }. Never throws and never
   blocks: a failed snapshot must not be able to interfere with clinical work,
   which is the whole reason the primary write path does not depend on it. */
function autobackupSnapshot(opts) {
  opts = opts || {};
  function fail(reason) { return Promise.resolve({ ok: false, reason: reason }); }

  if (typeof buildBackupPayload !== "function") return fail("the backup builder is unavailable");
  if (typeof mirrorPutBlob !== "function") return fail("IndexedDB is unavailable on this device");

  /* Never snapshot data we could not read. A snapshot of the empty fallback
     would look like a valid backup of an empty clinic — a worse artefact than
     no snapshot at all, because it would be restored with confidence. */
  if (typeof storageCorruptStores === "function") {
    var bad = storageCorruptStores();
    if (bad.length) return fail("a store is damaged (" + bad[0].key + "); a snapshot now would " +
      "capture the fallback rather than the records");
  }
  if (typeof vaultEnabled === "function" && vaultEnabled() &&
      typeof vaultUnlocked === "function" && !vaultUnlocked()) {
    return fail("the record vault is locked");
  }

  var st = autobackupState();
  if (!opts.force && st.snapshots.length) {
    var newest = Date.parse(st.snapshots[st.snapshots.length - 1].at);
    if (!isNaN(newest) && (Date.now() - newest) < AUTOBACKUP_MIN_GAP_MS) {
      return Promise.resolve({ ok: true, skipped: true, reason: "a recent snapshot already exists" });
    }
  }

  var payload;
  try { payload = buildBackupPayload(); } catch (e) { return fail("could not build the payload"); }
  var json;
  try { json = JSON.stringify(payload); } catch (e) { return fail("could not serialise the payload"); }

  /* A random suffix, not just the timestamp. Two snapshots taken in the same
     millisecond — a forced one during a restore, or a test loop — produced the
     same key and the second silently overwrote the first, so the rolling
     window quietly held fewer copies than it reported. Found by a test. */
  var id = MIRROR_SNAPSHOT_PREFIX + new Date().toISOString().replace(/[:.]/g, "-") +
           "-" + Math.random().toString(36).slice(2, 8);
  return Promise.resolve()
    .then(function () { return mirrorPutBlob(id, json); })
    .then(function () {
      st = autobackupState();
      st.snapshots.push({ id: id, at: new Date().toISOString(), bytes: json.length });
      /* Rolling window. Prune oldest first, and prune the DATA before the
         index entry, so a crash between the two leaves an orphaned index row
         (harmless, visible) rather than an index that promises a snapshot
         which is no longer there (silently useless). */
      var drop = [];
      while (st.snapshots.length > AUTOBACKUP_KEEP) drop.push(st.snapshots.shift());
      var chain = Promise.resolve();
      drop.forEach(function (d) {
        chain = chain.then(function () {
          if (typeof mirrorRemoveBlob === "function") { try { return mirrorRemoveBlob(d.id); } catch (e) {} }
        });
      });
      return chain.then(function () {
        _autobackupSave(st);
        return { ok: true, id: id, bytes: json.length, kept: st.snapshots.length };
      });
    })
    .catch(function (e) { return { ok: false, reason: (e && e.message) || "the snapshot write failed" }; });
}

/* The snapshots available to restore from, newest first. */
function autobackupSnapshots() {
  return autobackupState().snapshots.slice().reverse();
}

/* Read one back. Returns a promise for the parsed payload, or null.
   Restoring it is the ordinary import path — this only fetches. */
function autobackupRead(id) {
  if (typeof mirrorGetRaw !== "function") return Promise.resolve(null);
  return Promise.resolve(mirrorGetRaw(id))
    .then(function (json) {
      if (!json) return null;
      try { return JSON.parse(json); } catch (e) { return null; }
    })
    .catch(function () { return null; });
}

/* Boot hook. Deferred, so it can never be on the critical path of the first
   paint or of a clinician opening a record. */
function autobackupStart() {
  if (typeof setTimeout !== "function") return;
  setTimeout(function () {
    autobackupSnapshot().then(function (r) {
      if (r && r.ok && !r.skipped && typeof evEmit === "function") {
        evEmit("backup:snapshot", { id: r.id, bytes: r.bytes });
      }
      if (r && !r.ok && typeof console !== "undefined") {
        console.warn("Entopic: automatic snapshot skipped — " + r.reason);
      }
    });
    /* Nag about the OFF-DEVICE copy, once per session, and only when it is
       genuinely stale. A prompt that appears every day is one that gets
       dismissed every day. */
    if (autobackupExportIsStale() && typeof evEmit === "function") {
      evEmit("backup:export-stale", { days: autobackupExportAgeDays() });
    }
  }, 4000);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AUTOBACKUP_META: AUTOBACKUP_META, AUTOBACKUP_KEEP: AUTOBACKUP_KEEP,
    AUTOBACKUP_STALE_DAYS: AUTOBACKUP_STALE_DAYS,
    autobackupState: autobackupState, autobackupSnapshot: autobackupSnapshot,
    autobackupSnapshots: autobackupSnapshots, autobackupRead: autobackupRead,
    autobackupNoteExport: autobackupNoteExport,
    autobackupExportAgeDays: autobackupExportAgeDays,
    autobackupExportIsStale: autobackupExportIsStale,
    autobackupStart: autobackupStart
  };
}
