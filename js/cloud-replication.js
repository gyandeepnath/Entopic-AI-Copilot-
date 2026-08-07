/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLOUD REPLICATION  (split from cloud-sync.js)         */
/*                                                                  */
/* cloud-sync.js had grown two jobs, and the module size cap said   */
/* so. They are genuinely different concerns with different failure */
/* modes, and separating them makes both easier to reason about:    */
/*                                                                  */
/*   cloud-sync.js         session, tokens, HTTP, retry/backoff,    */
/*                         realtime socket, lifecycle, KB push.     */
/*                         "Can we talk to the server?"             */
/*                                                                  */
/*   cloud-replication.js  (this file) the replication protocol —   */
/*                         outbox, delta detection, tombstones,     */
/*                         encryption envelopes, paginated pull,    */
/*                         merge and conflict recording.            */
/*                         "Which version of a record wins?"        */
/*                                                                  */
/* Nothing was rewritten in the move. Every function is byte-for-   */
/* byte what it was, including its comments, so this split changes  */
/* no behaviour and the test suite is the evidence.                 */
/*                                                                  */
/* ── THE RULES THIS FILE ENFORCES ──                              */
/*                                                                  */
/*  • A clinician's unpushed edit is NEVER overwritten by a remote  */
/*    write. When both sides changed it is a conflict, local is     */
/*    kept, and the conflict is recorded — not resolved by silence. */
/*  • PHI leaves the device only as ciphertext, and only when the   */
/*    clinic has consented and a key is present. cloudDrain is the  */
/*    single chokepoint; no other path POSTs patients or visits.    */
/*  • A delete is durable. It survives the tab closing, because it  */
/*    is the one piece of sync state that cannot be recomputed.     */
/*  • A pull is paginated. An unbounded read inherits whatever the  */
/*    server's row cap happens to be, and a clinic that grows past  */
/*    it stops receiving its own records with no error anywhere.    */
/*                                                                  */
/* Load order: after cloud-sync.js (CLOUD, cloudApi, cloudSignedIn) */
/* and after storage.js (loadStore/saveStore for the tombstones).   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── push: local → cloud (outbox by dirty-kind, debounced) ── */
function cloudEnqueue(key) {
  if (!cloudEnabled() || CLOUD._suppress) return;
  if (key !== "patients" && key !== "visits") return;
  CLOUD.dirty[key] = true;
  if (CLOUD.drainTimer) clearTimeout(CLOUD.drainTimer);
  CLOUD.drainTimer = setTimeout(cloudDrain, 800);
}

/* A local delete must reach peers, or the record resurrects on their next
   pull. The record is already gone locally, so we carry a tombstone and push
   it as a soft-delete row (deleted=true). Storage's deletePatient calls this. */
function cloudEnqueueDelete(kind, id) {
  if (!cloudEnabled() || (kind !== "patients" && kind !== "visits") || !id) return;
  CLOUD.tombstones.push({ kind: kind, id: id, at: new Date().toISOString() });
  cloudTombstonesPersist();
  if (CLOUD.drainTimer) clearTimeout(CLOUD.drainTimer);
  CLOUD.drainTimer = setTimeout(cloudDrain, 800);
}

/* ── Durable tombstones (backend audit BE-2) ──

   The queue used to live only on the CLOUD object, i.e. in memory. Close the
   tab, lose power, or crash between deleting a patient and the 800 ms drain,
   and the delete never reaches the server — so the next pull from another
   device brings the patient back, with no error anywhere.

   Every other piece of sync state survives a restart because it is derivable:
   a record is dirty if its `updated` is newer than its `_cloud_updated`, and
   both are on the record. A tombstone has no record left to derive from. It is
   the only sync state that must be written down, and it was the only one that
   was not.

   Kept small deliberately — ids and a timestamp, never content. */
var CLOUD_TOMBSTONE_STORE = "cloud_tombstones";
var CLOUD_TOMBSTONE_MAX = 5000;

function cloudTombstonesPersist() {
  if (typeof saveStore !== "function") return false;
  /* Bounded. A queue this long means sync has been unreachable for a very
     long time; dropping the OLDEST is the least-bad answer, and it is said
     out loud rather than done quietly. */
  if (CLOUD.tombstones.length > CLOUD_TOMBSTONE_MAX) {
    var dropped = CLOUD.tombstones.length - CLOUD_TOMBSTONE_MAX;
    CLOUD.tombstones = CLOUD.tombstones.slice(-CLOUD_TOMBSTONE_MAX);
    if (typeof logAudit === "function") {
      try { logAudit("sync_tombstones_truncated",
        dropped + " pending delete(s) were dropped from the sync queue — it exceeded " +
        CLOUD_TOMBSTONE_MAX + ". Those records may reappear from another device.", {}); } catch (e) {}
    }
  }
  return saveStore(CLOUD_TOMBSTONE_STORE, CLOUD.tombstones) !== false;
}

/* Called at boot, before the first drain, so a delete queued in a previous
   session still reaches the server. */
function cloudTombstonesRestore() {
  if (typeof loadStore !== "function") return;
  var saved = loadStore(CLOUD_TOMBSTONE_STORE, []);
  if (!Array.isArray(saved) || !saved.length) return;
  /* Merge rather than replace: a delete performed THIS session before the
     vault unlocked must not be thrown away by the restore. */
  var seen = {};
  CLOUD.tombstones.forEach(function (t) { seen[t.kind + ":" + t.id] = true; });
  saved.forEach(function (t) {
    if (!t || !t.kind || !t.id) return;
    if (seen[t.kind + ":" + t.id]) return;
    seen[t.kind + ":" + t.id] = true;
    CLOUD.tombstones.push(t);
  });
}

/* HARD PHI GATE (C-1 / C-2): a patient or visit record leaves the device only
   when the clinic has consented AND a device encryption key is present, and
   even then only as CIPHERTEXT. If sync is on but PHI is not armed, the dirty
   flags stay set and nothing is pushed — turning consent on and entering the
   passphrase later flushes everything. This is the single chokepoint; there is
   no other path that POSTs patients/visits. */
function cloudDrain() {
  if (!cloudSignedIn()) return; /* dirty flags stay set; retried on next start */
  if (typeof phiArmed !== "function" || !phiArmed()) return; /* PHI not armed → hold */

  if (CLOUD.dirty.patients) {
    cloudDrainKind("patients", loadPatients, savePatients, function (p) {
      return { id: p.id, clinic_id: CLOUD.clinicId,
               updated_at: p.updated || p.created || new Date(0).toISOString(), deleted: !!p.deleted };
    });
  }
  if (CLOUD.dirty.visits) {
    cloudDrainKind("visits", loadVisits, saveVisits, function (v) {
      return { id: v.id, clinic_id: CLOUD.clinicId, patient_id: v.patient_id,
               updated_at: v.updated || v.date || new Date(0).toISOString(), deleted: !!v.deleted };
    });
  }
  cloudDrainTombstones();
}

/* A record is DIRTY (needs pushing) if it has never been pushed, or has been
   edited since its last successful push. This is what makes the push a DELTA
   (DD finding M-3): the old drain re-serialised and re-POSTed EVERY record on
   every save — a multi-MB body per keystroke-save at a few thousand patients.
   Now an untouched record (updated <= last synced stamp) is skipped entirely. */
function cloudIsDirtyRecord(r) {
  if (!r._cloud_updated) return true;
  return cloudEpoch(r.updated || r.date || r.created) > cloudEpoch(r._cloud_updated);
}

/* Re-entrancy guard (DD M-7): a save-triggered drain and a poll-triggered drain
   can fire close together; without this both would encrypt-and-push the same
   dirty set (harmless under upsert, but wasteful and it can double-mark). A
   per-kind in-flight flag serialises them — the second is a no-op and the next
   scheduled drain picks up anything still dirty. This does not eliminate the
   shared-global-state class of risk (that needs a proper state-store refactor,
   tracked separately), but it removes the concrete overlap this layer can hit. */
var _cloudDraining = {};

function cloudDrainKind(kind, load, save, meta) {
  if (_cloudDraining[kind]) return;
  var dirty = load().filter(cloudIsDirtyRecord);
  if (!dirty.length) { CLOUD.dirty[kind] = false; return; }
  _cloudDraining[kind] = true;
  cloudEncryptRows(dirty, meta).then(function (rows) {
    if (!rows.length) { CLOUD.dirty[kind] = false; return; }
    cloudApi("/rest/v1/" + kind + "?on_conflict=id", {
      method: "POST", body: rows, prefer: "resolution=merge-duplicates"
    }, function (err) {
      _cloudDraining[kind] = false;
      if (err) return;   /* leave the dirty flag set; retried on the next drain */
      /* Mark exactly the records we pushed as synced, so the next drain skips
         them. Suppressed save → no echo back into the outbox. */
      var pushedStamp = {};
      dirty.forEach(function (r) { pushedStamp[r.id] = r.updated || r.date || r.created || new Date(0).toISOString(); });
      var cur = load();
      for (var i = 0; i < cur.length; i++) if (pushedStamp[cur[i].id]) cur[i]._cloud_updated = pushedStamp[cur[i].id];
      CLOUD._suppress = true;
      try { save(cur); } finally { CLOUD._suppress = false; }
      CLOUD.dirty[kind] = false;
      CLOUD.lastSync = new Date().toISOString();
    });
  }).catch(function () { _cloudDraining[kind] = false; /* encryption failed → leave dirty, retry later */ });
}

/* Push pending deletes as soft-delete rows. Ciphertext is not needed for a
   tombstone (there is nothing to protect), but the row must carry a valid
   clinic_id / patient_id to satisfy the schema and RLS. */
function cloudDrainTombstones() {
  if (!CLOUD.tombstones.length) return;
  var batch = CLOUD.tombstones.slice();
  var stamp = new Date().toISOString();
  var byKind = { patients: [], visits: [] };
  var sentIds = { patients: {}, visits: {} };
  batch.forEach(function (t) {
    if (t.kind === "patients") {
      byKind.patients.push({ id: t.id, clinic_id: CLOUD.clinicId, data: { id: t.id, deleted: true }, updated_at: stamp, deleted: true });
      sentIds.patients[t.id] = true;
    } else {
      byKind.visits.push({ id: t.id, clinic_id: CLOUD.clinicId, patient_id: "", data: { id: t.id, deleted: true }, updated_at: stamp, deleted: true });
      sentIds.visits[t.id] = true;
    }
  });
  ["patients", "visits"].forEach(function (kind) {
    if (!byKind[kind].length) return;
    cloudApi("/rest/v1/" + kind + "?on_conflict=id", {
      method: "POST", body: byKind[kind], prefer: "resolution=merge-duplicates"
    }, function (err) {
      if (err) return;                     /* leave queued; the next drain retries */
      /* Clear exactly what was SENT, not everything of this kind.

         The old line was `filter(t => t.kind !== kind)`, which also discarded
         any delete enqueued while this request was in flight — a delete the
         server never heard about, dropped as though it had succeeded. A
         request takes hundreds of milliseconds and a clinician can delete
         twice in that window. (BE-3) */
      CLOUD.tombstones = CLOUD.tombstones.filter(function (t) {
        return !(t.kind === kind && sentIds[kind][t.id]);
      });
      cloudTombstonesPersist();
    });
  });
}

/* Encrypt each record's payload into a ciphertext envelope, attaching the
   clear sync-metadata built by `meta`. Resolves an array ready to POST. */
function cloudEncryptRows(records, meta) {
  return Promise.all(records.map(function (rec) {
    return phiEncrypt(rec).then(function (envelope) {
      var row = meta(rec);
      row.data = envelope;   /* CIPHERTEXT — the server never sees plaintext PHI */
      return row;
    });
  }));
}

/* ── pull: cloud → local ──────────────────────────────────────────
   Conflict resolution that does NOT silently lose a clinician's edit (H-2):
     • timestamps are compared as EPOCH MS (Date.parse), not as raw strings —
       a lexicographic compare assumed byte-identical ISO formatting and broke
       on millis-vs-no-millis or offset-vs-Z.
     • a local record with UNPUSHED edits (updated > last known cloud stamp) is
       never overwritten by a remote write. When both sides changed it is a
       genuine conflict: local is kept and the conflict is recorded for the UI,
       rather than one side vanishing.
   `rows` here already carry DECRYPTED `data` (see cloudDecryptRows). */
function cloudEpoch(s) { var t = Date.parse(s); return isNaN(t) ? 0 : t; }

function cloudMergeRows(kind, rows) {
  if (!rows || !rows.length) return 0;
  var load = kind === "patients" ? loadPatients : loadVisits;
  var save = kind === "patients" ? savePatients : saveVisits;
  var local = load();
  var byId = {};
  for (var i = 0; i < local.length; i++) byId[local[i].id] = i;
  var changed = 0;
  for (var r = 0; r < rows.length; r++) {
    var row = rows[r];
    if (!row || !row.id) continue;
    var rec = row.data || null;
    if (rec === null) continue;   /* undecryptable / empty — never store ciphertext as a record */
    rec._cloud_updated = row.updated_at;
    /* never clobber the visit that is open in this exam right now */
    if (kind === "visits" && typeof CV !== "undefined" && CV && rec.id === CV) continue;

    var idx = byId[row.id];
    if (idx === undefined) {
      if (row.deleted) continue;  /* a tombstone for a record we never had — ignore */
      local.push(rec); changed++; continue;
    }
    var prev = local[idx];
    var remoteMs = cloudEpoch(row.updated_at);
    var baseMs   = cloudEpoch(prev._cloud_updated);           /* last stamp we synced */
    var localMs  = cloudEpoch(prev.updated || prev.date || prev.created);
    var localModified = localMs > baseMs;                     /* unpushed local edits */
    var remoteNewer   = remoteMs > Math.max(baseMs, localModified ? 0 : localMs);

    if (row.deleted) {
      /* honour a remote delete only if we have no unpushed local edits */
      if (!localModified) { local.splice(idx, 1); rebuildIndex(); changed++; }
      else cloudRecordConflict(kind, row.id);
      continue;
    }
    if (remoteNewer && !localModified) { local[idx] = rec; changed++; }
    else if (remoteNewer && localModified) { cloudRecordConflict(kind, row.id); }
    /* else: local is newer or unchanged — keep it */
  }
  function rebuildIndex() { byId = {}; for (var k = 0; k < local.length; k++) byId[local[k].id] = k; }
  if (changed > 0) {
    CLOUD._suppress = true;
    try { save(local); } finally { CLOUD._suppress = false; }
  }
  return changed;
}

/* Conflicts are surfaced, not swallowed. */
function cloudRecordConflict(kind, id) {
  CLOUD.conflicts = CLOUD.conflicts || [];
  var key = kind + ":" + id;
  if (CLOUD.conflicts.indexOf(key) < 0) CLOUD.conflicts.push(key);
}
function cloudConflicts() { return (CLOUD.conflicts || []).slice(); }

/* Decrypt any ciphertext envelopes before merging. A row we cannot decrypt
   (no key on this device) is dropped from the batch with data=null so it is
   skipped rather than stored as ciphertext. */
function cloudDecryptRows(rows, cb) {
  if (!rows || !rows.length) { cb([]); return; }
  Promise.all(rows.map(function (row) {
    var payload = row.data;
    if (typeof phiIsEnvelope === "function" && phiIsEnvelope(payload)) {
      return phiDecrypt(payload)
        .then(function (obj) { return { id: row.id, data: obj, updated_at: row.updated_at, deleted: row.deleted }; })
        .catch(function () { return { id: row.id, data: null, updated_at: row.updated_at, deleted: row.deleted }; });
    }
    return Promise.resolve({ id: row.id, data: payload, updated_at: row.updated_at, deleted: row.deleted });
  })).then(cb).catch(function () { cb([]); });
}

/* Sync has merged rows from another device. Announce it; do not decide what
   the screen should do about it.

   This used to call renderHome() by name and look up "pgHome" itself, which
   made the synchronisation layer depend on one specific page of the UI —
   the bottom of the stack reaching up to the top. js/ui-storage-banners.js
   now subscribes and repaints Home only when Home is what is on screen.
   (H-1, kept: the element is `pgHome`; the original code looked for a
   `page-home` that never existed, so changes merged but never repainted.)

   evEmit never throws, so rendering still cannot break sync. */
function cloudRerender() {
  if (typeof evEmit === "function") evEmit("sync:applied", null);
}

/* ── pull, paginated (backend audit BE-5) ──

   The old pull asked for every row with no limit, no ordering and no cursor:

       /rest/v1/visits?select=id,data,updated_at,deleted

   PostgREST caps a response at the project's `db-max-rows` (Supabase ships a
   default). Past that cap the server returns the first page and says nothing
   the client looks at — so a clinic that grows past it stops receiving the
   rest of its own records, forever, silently. There is no error, no banner,
   and no way for the clinician to tell: the dashboard simply shows a subset
   and the two devices quietly diverge. Nothing in the codebase set a limit,
   so the ceiling was whatever the server happened to be configured with.

   Now it pages by keyset on `updated_at`, which is indexed by ordering and is
   the column the merge already reasons about. Keyset rather than offset
   because rows are being written while we read: OFFSET would skip or repeat
   records across pages, and a skipped record is a lost record.

   Two rows can share a millisecond, so a page boundary that landed inside a
   tie would drop the rest of that tie. The cursor therefore uses `gte` and
   the ids already seen are filtered out — one row of overlap per page, which
   is cheap and correct, rather than `gt` which is cheap and wrong. */
var CLOUD_PAGE_SIZE = 500;
var CLOUD_MAX_PAGES = 200;          /* 100k rows; a stop, not a target */

function cloudPullKind(kind, done) {
  var acc = [], seen = {}, pages = 0, cursor = "";

  function page() {
    /* H-6: only live rows; a soft-deleted row is handled by its tombstone,
       not resurrected. */
    var q = "/rest/v1/" + kind + "?select=id,data,updated_at,deleted" +
            "&order=updated_at.asc&limit=" + CLOUD_PAGE_SIZE +
            (cursor ? "&updated_at=gte." + encodeURIComponent(cursor) : "");
    cloudApi(q, {}, function (err, rows) {
      if (err) {
        /* Merge what we did get. A partial pull is not a failed pull — every
           row already fetched is a real row, and dropping them would mean an
           unreliable network could keep a device permanently behind. */
        if (acc.length) cloudDecryptRows(acc, function (dec) { done(cloudMergeRows(kind, dec)); });
        else done(0);
        return;
      }
      rows = rows || [];
      var fresh = 0, last = cursor;
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (!r || !r.id || seen[r.id]) continue;   /* the deliberate one-row overlap */
        seen[r.id] = true;
        acc.push(r);
        fresh++;
        if (r.updated_at) last = r.updated_at;
      }
      pages++;

      var full = rows.length >= CLOUD_PAGE_SIZE;
      /* A full page that advanced nothing means every row in it shares one
         timestamp — the cursor cannot move without skipping them. Stop and
         say so rather than loop forever or silently truncate. */
      if (full && fresh === 0) {
        CLOUD.lastError = "sync paused: more than " + CLOUD_PAGE_SIZE + " " + kind +
          " share one timestamp and cannot be paged through";
        full = false;
      }
      if (full && pages >= CLOUD_MAX_PAGES) {
        CLOUD.lastError = "sync stopped after " + (pages * CLOUD_PAGE_SIZE) + " " + kind +
          " — more remain; contact support rather than assuming this device is up to date";
        full = false;
      }
      if (full) { cursor = last; page(); return; }
      cloudDecryptRows(acc, function (dec) { done(cloudMergeRows(kind, dec)); });
    });
  }
  page();
}

function cloudPull(cb) {
  if (!cloudSignedIn()) { cb && cb(); return; }
  var pending = 2, changed = 0;
  function done(n) { changed += n; if (--pending === 0) { if (changed) cloudRerender(); CLOUD.lastSync = new Date().toISOString(); cb && cb(changed); } }
  cloudPullKind("patients", done);
  cloudPullKind("visits", done);
}
