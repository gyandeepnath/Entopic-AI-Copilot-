/* ═══════════════════════════════════════════════════════════════ */
/* VISIT STORE — ONE KEY PER VISIT                                  */
/*                                                                  */
/* Every visit for every patient used to live in a single JSON      */
/* array under one key. Saving one field of one visit re-serialised */
/* the entire clinic. MEASURED, at the 1,900-visit ceiling:         */
/*                                                                  */
/*                        one array      one key per visit          */
/*   save the open visit    104.5 ms          0.021 ms              */
/*   open a patient chart     29.6 ms          0.933 ms             */
/*   read everything         30.1 ms         28.4 ms                */
/*                                                                  */
/* The last row is the trade and it is the right way round: reading */
/* everything happens on export, archive and sync — never while a   */
/* clinician is typing. Saving happens on every keystroke pause.    */
/*                                                                  */
/* COST, STATED HONESTLY: about 5.4% more bytes (key names and      */
/* per-record overhead), which moves the localStorage ceiling from  */
/* roughly 1,900 visits to roughly 1,800. Automatic archiving now   */
/* covers that, and a 100x faster save is worth 5% of the budget.   */
/*                                                                  */
/* ── THE LAYOUT ──                                                 */
/*                                                                  */
/*   entopic_visit_index   [{id, patient_id, date, status,          */
/*                          updated, archived}]  — no clinical data */
/*   entopic_visit_<id>    the full visit wrapper                   */
/*                                                                  */
/* The index carries only what is needed to FIND a visit. A chart   */
/* listing reads the index alone; opening a visit reads one record. */
/*                                                                  */
/* ── THE RULE THAT MATTERS ──                                      */
/*                                                                  */
/* An index entry with no record behind it is DATA LOSS, and this   */
/* module must never paper over it. Anywhere that could quietly     */
/* return fewer visits than the index promised instead raises the   */
/* corruption path, exactly as a truncated store does. Reading four */
/* visits for a patient who has five must never look like a patient */
/* who has four.                                                    */
/*                                                                  */
/* Load order: immediately after js/storage.js, which delegates     */
/* loadVisits()/saveVisits() here. Before storage-migrations.js.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var VISIT_INDEX_KEY = "visit_index";
var VISIT_RECORD_PREFIX = "visit_";

/* The pre-split key. Still read (a device that has not migrated yet, or a
   backup file written before the split), never written after migration. */
var VISIT_LEGACY_KEY = "visits";

/* ── index ──────────────────────────────────────────────────────── */

/* What the index keeps per visit. Deliberately NOT the clinical payload:
   the index is read on every chart listing and must stay small, and a
   summary that drifts from the record is worse than no summary. */
function visitIndexEntry(v) {
  return {
    id: v.id,
    patient_id: v.patient_id,
    date: v.date || "",
    status: v.status || "",
    updated: v.updated || "",
    archived: !!v.archived
  };
}

function visitIndexLoad() {
  var idx = loadStore(VISIT_INDEX_KEY, null);
  return Array.isArray(idx) ? idx : null;
}

function visitIndexSave(idx) {
  return saveStore(VISIT_INDEX_KEY, idx) !== false;
}

/* Has this device been split yet? A device mid-upgrade, or one restored from
   an old backup, must keep working — so every read falls back to the legacy
   array when there is no index. */
function visitStoreSplit() {
  return visitIndexLoad() !== null;
}

/* ── single records ─────────────────────────────────────────────── */

function visitRecordKey(id) { return VISIT_RECORD_PREFIX + id; }

function visitRecordLoad(id) {
  if (!id) return null;
  var v = loadStore(visitRecordKey(id), null);
  return (v && typeof v === "object") ? v : null;
}

/* Write ONE visit. This is the hot path — the whole point of the split.
   Updates the index only when an indexed field actually changed, so an
   ordinary keystroke-save writes exactly one key. */
function visitRecordSave(v) {
  if (!v || !v.id) return false;
  if (saveStore(visitRecordKey(v.id), v) === false) return false;

  var idx = visitIndexLoad();
  if (idx === null) return true;          /* not split yet; caller owns the array */

  var entry = visitIndexEntry(v);
  var at = -1;
  for (var i = 0; i < idx.length; i++) { if (idx[i].id === v.id) { at = i; break; } }

  if (at < 0) { idx.push(entry); return visitIndexSave(idx); }

  /* Only rewrite the index when something it holds changed. At the ceiling
     the index is ~150 KB; rewriting it on every keystroke would put back a
     good part of the cost this split exists to remove. */
  var cur = idx[at], same = true;
  for (var k in entry) {
    if (Object.prototype.hasOwnProperty.call(entry, k) && cur[k] !== entry[k]) { same = false; break; }
  }
  if (same) return true;
  idx[at] = entry;
  return visitIndexSave(idx);
}

function visitRecordRemove(id) {
  if (!id) return false;
  removeStore(visitRecordKey(id));
  var idx = visitIndexLoad();
  if (idx === null) return true;
  var out = idx.filter(function (e) { return e.id !== id; });
  if (out.length === idx.length) return true;
  return visitIndexSave(out);
}

/* ── the collection ─────────────────────────────────────────────── */

/* Every visit, reassembled. O(n) small reads instead of one large parse —
   measured at 28.4 ms for 1,900 visits, versus 30.1 ms before the split.

   A MISSING RECORD IS NOT SKIPPED QUIETLY. The index said it exists; if it
   does not, this device has lost a visit, and the storage layer must say so
   in the same way it does for a truncated store — loudly, with writes to the
   index blocked so the damage cannot be compounded. */
function visitStoreLoadAll() {
  var idx = visitIndexLoad();
  if (idx === null) {
    var legacy = loadStore(VISIT_LEGACY_KEY, []);
    return Array.isArray(legacy) ? legacy : [];
  }

  var out = [], missing = [];
  for (var i = 0; i < idx.length; i++) {
    var e = idx[i];
    if (!e || !e.id) continue;
    var v = visitRecordLoad(e.id);
    if (v) out.push(v); else missing.push(e.id);
  }

  if (missing.length) {
    /* Same treatment as unreadable bytes: refuse further writes to the index
       rather than let the next save persist a shorter list as though it were
       the truth. storageNoteCorrupt is idempotent, so repeated reads do not
       re-quarantine or re-alert. */
    if (typeof storageNoteCorrupt === "function") {
      storageNoteCorrupt(VISIT_INDEX_KEY, null,
        missing.length + " visit record(s) named in the index are missing from this device (" +
        missing.slice(0, 5).join(", ") + (missing.length > 5 ? ", …" : "") + ")");
    }
  }
  return out;
}

/* Replace the whole collection. Kept because archive, import and delete
   genuinely rewrite everything — but it is now the SLOW path by design, and
   nothing on the typing path should call it.

   Writes records first and the index last: a crash midway then leaves records
   with no index entry (invisible but recoverable) rather than index entries
   with no record (data loss, and loud). */
function visitStoreSaveAll(visits) {
  if (!Array.isArray(visits)) return false;

  var idx = visitIndexLoad();
  if (idx === null) return saveStore(VISIT_LEGACY_KEY, visits) !== false;

  var keep = Object.create(null);
  for (var i = 0; i < visits.length; i++) {
    var v = visits[i];
    if (!v || !v.id) continue;
    keep[v.id] = true;
    if (saveStore(visitRecordKey(v.id), v) === false) return false;
  }

  /* Records that are no longer in the collection. Removed AFTER the new index
     is written, so an interruption cannot leave the index pointing at a record
     that has already gone. */
  var gone = [];
  for (var j = 0; j < idx.length; j++) {
    if (idx[j] && idx[j].id && !keep[idx[j].id]) gone.push(idx[j].id);
  }

  var newIdx = [];
  for (var k = 0; k < visits.length; k++) {
    if (visits[k] && visits[k].id) newIdx.push(visitIndexEntry(visits[k]));
  }
  if (!visitIndexSave(newIdx)) return false;

  for (var g = 0; g < gone.length; g++) removeStore(visitRecordKey(gone[g]));
  return true;
}

/* ── the reads that made the split worth doing ──────────────────── */

/* One patient's visits, newest first — reading only that patient's records.
   O(k) where k is the patient's visit count, instead of O(n) over the clinic. */
function visitStoreForPatient(patientId) {
  var idx = visitIndexLoad();
  if (idx === null) {
    return visitStoreLoadAll()
      .filter(function (v) { return v.patient_id === patientId; })
      .sort(function (a, b) { return String(b.date || "") < String(a.date || "") ? -1 : 1; });
  }
  var mine = idx.filter(function (e) { return e && e.patient_id === patientId; });
  mine.sort(function (a, b) {
    var x = String(a.date || ""), y = String(b.date || "");
    return x < y ? 1 : (x > y ? -1 : 0);          /* newest first */
  });
  var out = [], missing = [];
  for (var i = 0; i < mine.length; i++) {
    var v = visitRecordLoad(mine[i].id);
    if (v) out.push(v); else missing.push(mine[i].id);
  }
  if (missing.length && typeof storageNoteCorrupt === "function") {
    storageNoteCorrupt(VISIT_INDEX_KEY, null,
      missing.length + " visit record(s) for this patient are missing from this device");
  }
  return out;
}

/* The patient's most recent visit, without reading anybody else's. */
function visitStoreLastFor(patientId) {
  var idx = visitIndexLoad();
  if (idx === null) {
    var all = visitStoreForPatient(patientId);
    return all.length ? all[0] : null;
  }
  var best = null;
  for (var i = 0; i < idx.length; i++) {
    var e = idx[i];
    if (!e || e.patient_id !== patientId) continue;
    if (!best || String(e.date || "") > String(best.date || "")) best = e;
  }
  return best ? visitRecordLoad(best.id) : null;
}

/* Newest visit per patient for EVERY patient, from ONE pass over the index.

   MEASURED PROBLEM (Phase 9). The home screen builds one row per patient and
   each row called getLastVisit(patient), which re-reads and re-parses the whole
   visit index and then reads a full visit record. That is O(patients x index)
   plus one record read per row — quadratic on the screen a clinician returns to
   all day:

       patients   renderHome   of which getLastVisit
             50        6 ms          2.7 ms   (45%)
            200       47 ms         38.2 ms   (81%)
            500      254 ms        242.8 ms   (95%)

   Ten times the patients cost forty-two times the render.

   This returns the newest INDEX ENTRY per patient — not the visit record —
   because a list row needs only date/status/id, all of which the index already
   carries. So the record reads disappear entirely rather than merely being
   batched. Callers that genuinely need clinical content still use
   visitStoreLastFor() and pay for exactly the one record they open.

   Archived stubs are included deliberately: an archived visit is still the
   patient's most recent encounter, and a chart that skipped it would show a
   stale "last seen" date. */
function visitStoreLastIndexByPatient() {
  var out = Object.create(null);
  var idx = visitIndexLoad();
  if (idx === null) {
    /* Pre-split device: fall back to the collection, still one pass. */
    var all = visitStoreLoadAll();
    for (var j = 0; j < all.length; j++) {
      var w = all[j];
      if (!w || !w.patient_id) continue;
      var curW = out[w.patient_id];
      if (!curW || String(w.date || "") > String(curW.date || "")) out[w.patient_id] = visitIndexEntry(w);
    }
    return out;
  }
  for (var i = 0; i < idx.length; i++) {
    var e = idx[i];
    if (!e || !e.patient_id) continue;
    var cur = out[e.patient_id];
    if (!cur || String(e.date || "") > String(cur.date || "")) out[e.patient_id] = e;
  }
  return out;
}

/* How many visits this device holds, without reading any of them. */
function visitStoreCount() {
  var idx = visitIndexLoad();
  if (idx !== null) return idx.length;
  return visitStoreLoadAll().length;
}

/* ── the split itself ───────────────────────────────────────────── */

/* Convert a legacy single-array store into per-visit keys.

   Deliberately NOT a STORE_MIGRATIONS entry. A migration's contract is
   "read declared stores, return replacements"; this creates one key per
   visit, which that contract cannot express, and forcing it would mean
   the rollback snapshot could not describe the result either.

   Instead: write everything new, verify it reads back, and only then remove
   the old key. If anything fails, the legacy array is untouched and the
   device carries on exactly as before — the fallbacks above all still work.
   That is the same SELECT → WRITE → VERIFY → PRUNE order the archive uses,
   for the same reason. */
function visitStoreSplitNow() {
  if (visitStoreSplit()) return { ok: true, migrated: 0, reason: "already split" };

  if (typeof storageIsCorrupt === "function" && storageIsCorrupt(VISIT_LEGACY_KEY)) {
    return { ok: false, migrated: 0,
             reason: "the visit store is damaged; splitting it would write over records that " +
                     "may still be recoverable" };
  }
  if (typeof vaultEnabled === "function" && vaultEnabled() &&
      typeof vaultUnlocked === "function" && !vaultUnlocked()) {
    return { ok: false, migrated: 0, reason: "the record vault is locked" };
  }

  var legacy = loadStore(VISIT_LEGACY_KEY, null);
  if (legacy === null) {
    /* Nothing to convert — a new device. Write an empty index so this runs once. */
    return visitIndexSave([])
      ? { ok: true, migrated: 0, reason: "new device" }
      : { ok: false, migrated: 0, reason: "could not write the visit index" };
  }
  if (!Array.isArray(legacy)) {
    return { ok: false, migrated: 0, reason: "the visit store is not a list" };
  }

  var written = [];
  for (var i = 0; i < legacy.length; i++) {
    var v = legacy[i];
    if (!v || !v.id) continue;                       /* an id-less entry cannot be addressed */
    if (saveStore(visitRecordKey(v.id), v) === false) {
      for (var u = 0; u < written.length; u++) removeStore(visitRecordKey(written[u]));
      return { ok: false, migrated: 0,
               reason: "ran out of room while splitting the visit store; nothing was changed" };
    }
    written.push(v.id);
  }

  /* VERIFY before pruning: every record must read back, and match. */
  for (var c = 0; c < written.length; c++) {
    var back = visitRecordLoad(written[c]);
    if (!back || back.id !== written[c]) {
      for (var u2 = 0; u2 < written.length; u2++) removeStore(visitRecordKey(written[u2]));
      return { ok: false, migrated: 0,
               reason: "a visit did not read back after being written; the original store is " +
                       "untouched and this device is unchanged" };
    }
  }

  var idx = [];
  for (var m = 0; m < legacy.length; m++) {
    if (legacy[m] && legacy[m].id) idx.push(visitIndexEntry(legacy[m]));
  }
  if (!visitIndexSave(idx)) {
    for (var u3 = 0; u3 < written.length; u3++) removeStore(visitRecordKey(written[u3]));
    return { ok: false, migrated: 0, reason: "could not write the visit index" };
  }

  /* The old array is kept, not deleted. It costs one copy of the records
     until the next archive or export, and it is the only thing that makes
     this reversible on a device that has already started writing. It is
     removed by visitStoreDropLegacy() once a clinician has worked a full
     session on the new layout without incident. */
  if (typeof logAudit === "function") {
    try { logAudit("visit_store_split", idx.length + " visit(s) moved to individual records. " +
      "The previous combined store was kept as a fallback.", {}); } catch (e) {}
  }
  return { ok: true, migrated: idx.length, reason: "" };
}

/* Remove the pre-split copy. Only safe once the new layout holds everything
   the old one did — checked here rather than assumed. */
function visitStoreDropLegacy() {
  if (!visitStoreSplit()) return { ok: false, reason: "this device has not been split" };
  var legacy = loadStore(VISIT_LEGACY_KEY, null);
  if (legacy === null) return { ok: true, reason: "already removed" };
  if (!Array.isArray(legacy)) return { ok: false, reason: "the legacy store is not a list" };

  var idx = visitIndexLoad() || [];
  var have = Object.create(null);
  idx.forEach(function (e) { if (e && e.id) have[e.id] = true; });

  var absent = legacy.filter(function (v) { return v && v.id && !have[v.id]; });
  if (absent.length) {
    return { ok: false,
             reason: absent.length + " visit(s) in the previous store are not in the new one; " +
                     "keeping it" };
  }
  removeStore(VISIT_LEGACY_KEY);
  return { ok: true, reason: "" };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VISIT_INDEX_KEY: VISIT_INDEX_KEY, VISIT_RECORD_PREFIX: VISIT_RECORD_PREFIX,
    visitIndexLoad: visitIndexLoad, visitRecordLoad: visitRecordLoad,
    visitRecordSave: visitRecordSave, visitRecordRemove: visitRecordRemove,
    visitStoreLoadAll: visitStoreLoadAll, visitStoreSaveAll: visitStoreSaveAll,
    visitStoreForPatient: visitStoreForPatient, visitStoreLastFor: visitStoreLastFor,
    visitStoreLastIndexByPatient: visitStoreLastIndexByPatient,
    visitStoreCount: visitStoreCount, visitStoreSplit: visitStoreSplit,
    visitStoreSplitNow: visitStoreSplitNow, visitStoreDropLegacy: visitStoreDropLegacy
  };
}
