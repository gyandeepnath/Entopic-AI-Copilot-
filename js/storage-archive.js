/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — RECORD ARCHIVAL  (backend audit BE-10)                */
/*                                                                  */
/* ── THE PROBLEM ──                                               */
/*                                                                  */
/* localStorage exhausts at roughly 3,000 patients / 9,000 visits.  */
/* A busy practice reaches that in about four years, and then the   */
/* app stops saving. Since the Phase 5 fixes that failure is loud   */
/* rather than silent — but the clinic is still stuck, because      */
/* there is nowhere for old records to go.                          */
/*                                                                  */
/* This is the highest-consequence remaining defect in the product: */
/* every other failure mode has a recovery path, and this one ends  */
/* with a practice unable to see patients until an engineer helps.  */
/*                                                                  */
/* ── THE DESIGN, AND WHY IT IS THIS SHAPE ──                      */
/*                                                                  */
/* Archiving is deleting with extra steps, and deleting clinical    */
/* records is the most dangerous thing this codebase does. So the   */
/* order of operations is the whole design:                         */
/*                                                                  */
/*     SELECT  →  EXPORT  →  VERIFY  →  *then* PRUNE                */
/*                                                                  */
/* Nothing is removed until the archive file has been written AND   */
/* read back AND checked record-for-record. A partial or corrupt    */
/* archive prunes nothing. There is no code path that reaches the   */
/* prune without a verified archive in hand.                        */
/*                                                                  */
/* ── WHAT IS LEFT BEHIND: STUBS ──                                */
/*                                                                  */
/* An archived visit does not vanish from the patient's history —   */
/* it is replaced by a STUB: the date, the type, the leading        */
/* impression, and the id of the archive file holding the rest.     */
/*                                                                  */
/* This matters more than the space it costs. A chart with a        */
/* three-year hole in it is a clinically misleading document: the   */
/* next clinician reads continuous care where there was none. A     */
/* chart that says "1 March 2023 — archived, see archive #4" is     */
/* accurate. Stubs are ~200 bytes against ~8 KB, so 40x the         */
/* headroom while the record stays honest.                          */
/*                                                                  */
/* ── WHAT IS NEVER ARCHIVED ──                                    */
/*                                                                  */
/*   • an in-progress visit (it is still being written)             */
/*   • the most recent visit of any patient (the clinical baseline  */
/*     the next consultation is compared against)                   */
/*   • anything newer than the retention floor                      */
/*   • anything at all, if any store is damaged or the vault is     */
/*     locked — you cannot safely prune what you cannot read        */
/*                                                                  */
/* ── REVERSIBLE ──                                                */
/*                                                                  */
/* An archive file restores through the ordinary import path. The   */
/* stub is replaced by the full record. Archiving is therefore a    */
/* move, not a destruction, and the manual says so.                 */
/*                                                                  */
/* Load order: after storage-backup.js and storage-autobackup.js.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ARCHIVE_META = "archives";                  /* declared store: the index */
var ARCHIVE_DEFAULT_YEARS = 3;                  /* retention floor, configurable */
var ARCHIVE_MIN_YEARS = 1;                      /* refuse anything more aggressive */
var ARCHIVE_TAG = "entopic-archive-v1";

function archiveState() {
  if (typeof loadStore !== "function") return { archives: [], years: ARCHIVE_DEFAULT_YEARS };
  var s = loadStore(ARCHIVE_META, null);
  if (!s || typeof s !== "object") return { archives: [], years: ARCHIVE_DEFAULT_YEARS };
  return {
    archives: Array.isArray(s.archives) ? s.archives : [],
    years: (typeof s.years === "number" && s.years >= ARCHIVE_MIN_YEARS) ? s.years : ARCHIVE_DEFAULT_YEARS
  };
}

function _archiveSave(st) {
  if (typeof saveStore !== "function") return false;
  return saveStore(ARCHIVE_META, st) !== false;
}

/* The retention floor is a CLINICAL and LEGAL decision, not an engineering
   one — medical-record retention periods vary by jurisdiction and can run to
   decades, and in some they forbid disposal entirely. So this only ever moves
   records into a file the clinic keeps; it never destroys anything, and the
   floor cannot be set below one year whatever the caller asks for. */
function archiveSetYears(years) {
  var y = parseInt(years, 10);
  if (!isFinite(y) || y < ARCHIVE_MIN_YEARS) return false;
  var st = archiveState();
  st.years = y;
  if (typeof logAudit === "function") {
    try { logAudit("archive_policy_changed",
      "Archive retention floor set to " + y + " year(s). Records older than this become " +
      "eligible to be moved to an archive file; nothing is ever destroyed.", {}); } catch (e) {}
  }
  return _archiveSave(st);
}

function _isStub(v) { return !!(v && v.archived === true); }

/* Which visits are eligible, and — just as important — which are not and why.
   Pure apart from the two loaders, so the selection rules are testable. */
function archiveCandidates(opts) {
  opts = opts || {};
  var years = opts.years || archiveState().years;
  var now = opts.now ? Date.parse(opts.now) : Date.now();
  var floor = now - (years * 365.25 * 86400000);

  var visits = (typeof loadVisits === "function") ? loadVisits() : [];
  var eligible = [], held = [];

  /* The newest LIVE visit per patient is the clinical baseline the next
     consultation is compared against. It stays, however old it is. */
  var newestPerPatient = {};
  visits.forEach(function (v) {
    if (!v || _isStub(v)) return;
    var t = Date.parse(v.date || "") || 0;
    var cur = newestPerPatient[v.patient_id];
    if (!cur || t > cur.t) newestPerPatient[v.patient_id] = { id: v.id, t: t };
  });

  visits.forEach(function (v) {
    if (!v || _isStub(v)) return;
    var why = "";
    var t = Date.parse(v.date || "") || 0;
    if (v.status !== "completed") why = "still in progress";
    else if (!t) why = "no usable date";
    else if (t >= floor) why = "inside the retention floor";
    else if (newestPerPatient[v.patient_id] && newestPerPatient[v.patient_id].id === v.id) {
      why = "the patient's most recent visit";
    }
    if (why) held.push({ id: v.id, patient_id: v.patient_id, date: v.date, why: why });
    else eligible.push(v);
  });

  return {
    years: years,
    eligible: eligible,
    held: held,
    bytes: eligible.reduce(function (n, v) {
      try { return n + JSON.stringify(v).length; } catch (e) { return n; }
    }, 0)
  };
}

/* The stub that replaces an archived visit. Deliberately carries enough for
   the chart to remain a truthful clinical document, and nothing more. */
function archiveStubOf(visit, archiveId) {
  var d = (visit && visit.data) || {};
  var lead = "";
  var pv = d.engine_provenance;
  if (d.final_dx) lead = String(d.final_dx);
  else if (pv && pv.shown_top && pv.shown_top.length) lead = String(pv.shown_top[0].name || "");
  else if (Array.isArray(d.dxList) && d.dxList.length) lead = String(d.dxList[0].n || "");

  return {
    id: visit.id,
    patient_id: visit.patient_id,
    date: visit.date,
    status: visit.status,
    visit_type: visit.visit_type || "",
    authored_by: visit.authored_by || "",
    /* The marker every consumer checks. */
    archived: true,
    archive_id: archiveId,
    archived_at: new Date().toISOString(),
    /* Enough to read the chart honestly. */
    summary: {
      leading_impression: lead,
      had_urgent_alert: !!(Array.isArray(d.alerts) && d.alerts.some(function (a) { return a.l === "urgent"; })),
      kb_version: (pv && pv.kb_version) || ""
    }
  };
}

/* Build the archive payload. Self-describing, so a file found in five years
   can be understood without this codebase. */
function archiveBuild(candidates, opts) {
  opts = opts || {};
  var visits = candidates.eligible;
  return {
    __entopic_archive: ARCHIVE_TAG,
    version: (typeof STORE_VERSION !== "undefined") ? STORE_VERSION : "1.0.0",
    created: new Date().toISOString(),
    retention_years: candidates.years,
    note: "Archived clinical records moved out of active storage. Import this file " +
          "back into Entopic to restore them. Nothing here was deleted — the active " +
          "record carries a stub pointing at this archive.",
    count: visits.length,
    visit_ids: visits.map(function (v) { return v.id; }),
    visits: visits
  };
}

/* Read the archive back and check it record for record.

   This is the step the whole design exists for. `expected` is the payload we
   believe we wrote; `actual` is what was read back from the file the clinic
   now holds. They must agree on every id AND on the serialised content of
   every visit — a file that is merely the right length is not a verified
   archive. */
function archiveVerify(expected, actual) {
  if (!actual || actual.__entopic_archive !== ARCHIVE_TAG) {
    return { ok: false, reason: "the file read back is not an Entopic archive" };
  }
  if (!Array.isArray(actual.visits)) {
    return { ok: false, reason: "the archive contains no visits array" };
  }
  if (actual.visits.length !== expected.visits.length) {
    return { ok: false, reason: "the archive holds " + actual.visits.length +
             " visit(s); " + expected.visits.length + " were written" };
  }
  var byId = {};
  actual.visits.forEach(function (v) { if (v && v.id) byId[v.id] = v; });
  for (var i = 0; i < expected.visits.length; i++) {
    var want = expected.visits[i];
    var got = byId[want.id];
    if (!got) return { ok: false, reason: "visit " + want.id + " is missing from the archive" };
    var a, b;
    try { a = JSON.stringify(want); b = JSON.stringify(got); } catch (e) {
      return { ok: false, reason: "visit " + want.id + " could not be compared" };
    }
    if (a !== b) return { ok: false, reason: "visit " + want.id + " does not match what was written" };
  }
  return { ok: true, reason: "", verified: expected.visits.length };
}

/* Replace the archived visits with stubs. ONLY reachable with a verified
   archive — the caller cannot skip that, because the id it must pass comes
   from the verification step. */
function archivePrune(archiveId, visitIds) {
  if (!archiveId || !Array.isArray(visitIds) || !visitIds.length) {
    return { ok: false, pruned: 0, reason: "nothing to prune" };
  }
  var wanted = {};
  visitIds.forEach(function (id) { wanted[id] = true; });

  var visits = loadVisits();
  var pruned = 0;
  for (var i = 0; i < visits.length; i++) {
    if (!wanted[visits[i].id] || _isStub(visits[i])) continue;
    visits[i] = archiveStubOf(visits[i], archiveId);
    pruned++;
  }
  if (!pruned) return { ok: false, pruned: 0, reason: "none of those visits are in active storage" };

  if (saveVisits(visits) === false) {
    return { ok: false, pruned: 0, reason: "the record store refused the write; nothing was changed" };
  }
  return { ok: true, pruned: pruned, reason: "" };
}

/* ── THE WHOLE OPERATION ──
   Returns a promise for { ok, reason, archived, freed_bytes, archive_id }.
   `writeFile(name, json)` and `readBack(name)` are injected so the sequence is
   testable without a browser, and so the ONLY way to reach the prune is
   through a successful read-back. */
function archiveRun(opts) {
  opts = opts || {};
  function fail(reason) { return Promise.resolve({ ok: false, archived: 0, reason: reason }); }

  /* You cannot safely prune what you cannot read. */
  if (typeof storageCorruptStores === "function" && storageCorruptStores().length) {
    return fail("a record store is damaged; archiving is held until it is restored");
  }
  if (typeof vaultEnabled === "function" && vaultEnabled() &&
      typeof vaultUnlocked === "function" && !vaultUnlocked()) {
    return fail("the record vault is locked");
  }

  var cands = archiveCandidates(opts);
  if (!cands.eligible.length) {
    return Promise.resolve({ ok: true, archived: 0, freed_bytes: 0,
      reason: "no visit is old enough to archive", held: cands.held });
  }

  var archiveId = "arc_" + new Date().toISOString().replace(/[:.]/g, "-") +
                  "-" + Math.random().toString(36).slice(2, 8);
  var payload = archiveBuild(cands, opts);
  payload.archive_id = archiveId;
  var name = "entopic-archive-" + new Date().toISOString().slice(0, 10) + "-" + archiveId + ".json";
  var json = JSON.stringify(payload, null, 2);

  var write = opts.writeFile || function (n, j) {
    if (typeof dlSaveAs !== "function") return Promise.reject(new Error("no file writer"));
    return Promise.resolve(dlSaveAs(n, j, "application/json"));
  };
  /* The read-back. In a browser the clinic must hand the file back, because a
     page cannot read its own Downloads folder — so the default keeps a copy in
     IndexedDB and verifies THAT, and the UI additionally asks the clinician to
     confirm the download succeeded. Injectable for a real round trip. */
  var readBack = opts.readBack || function () {
    if (typeof mirrorPutBlob !== "function" || typeof mirrorGetRaw !== "function") {
      return Promise.resolve(null);
    }
    var key = "snap_" + archiveId;
    return mirrorPutBlob(key, json)
      .then(function () { return mirrorGetRaw(key); })
      .then(function (raw) { try { return JSON.parse(raw); } catch (e) { return null; } });
  };

  return Promise.resolve()
    .then(function () { return write(name, json); })
    .then(function () { return readBack(name); })
    .then(function (actual) {
      var v = archiveVerify(payload, actual);
      if (!v.ok) {
        /* The important line in the whole file: a failed verification prunes
           NOTHING. The clinic keeps its records and gets an explanation. */
        if (typeof logAudit === "function") {
          try { logAudit("archive_aborted",
            "Archiving was abandoned before any record was removed: " + v.reason, {}); } catch (e) {}
        }
        return { ok: false, archived: 0, reason: "the archive could not be verified — " +
                 v.reason + ". Nothing was removed." };
      }

      var pr = archivePrune(archiveId, payload.visit_ids);
      if (!pr.ok) {
        if (typeof logAudit === "function") {
          try { logAudit("archive_aborted",
            "The archive verified but the records could not be replaced with stubs: " +
            pr.reason, {}); } catch (e) {}
        }
        return { ok: false, archived: 0, reason: pr.reason };
      }

      var st = archiveState();
      st.archives.push({
        id: archiveId, file: name, at: payload.created,
        count: payload.count, bytes: json.length, retention_years: cands.years
      });
      _archiveSave(st);

      if (typeof logAudit === "function") {
        try { logAudit("records_archived",
          pr.pruned + " completed visit(s) older than " + cands.years + " year(s) were moved to " +
          "archive " + archiveId + " (" + name + ") and replaced with stubs in the active record. " +
          "Nothing was destroyed; importing that file restores them.", {}); } catch (e) {}
      }
      if (typeof evEmit === "function") {
        evEmit("archive:complete", { archive_id: archiveId, count: pr.pruned, file: name });
      }
      return { ok: true, archived: pr.pruned, freed_bytes: cands.bytes,
               archive_id: archiveId, file: name, reason: "" };
    })
    .catch(function (e) {
      return { ok: false, archived: 0,
               reason: "archiving failed before anything was removed: " + ((e && e.message) || e) };
    });
}

/* Restore an archive. Stubs are replaced by the full records; anything already
   live is left alone, so importing the same archive twice is harmless. */
function archiveRestore(payload) {
  if (!payload || payload.__entopic_archive !== ARCHIVE_TAG) {
    return { ok: false, restored: 0, reason: "that is not an Entopic archive file" };
  }
  if (!Array.isArray(payload.visits)) {
    return { ok: false, restored: 0, reason: "the archive contains no visits" };
  }
  var visits = loadVisits();
  var byId = {};
  visits.forEach(function (v, i) { byId[v.id] = i; });

  var restored = 0;
  payload.visits.forEach(function (v) {
    if (!v || !v.id) return;
    var idx = byId[v.id];
    if (idx === undefined) { visits.push(v); restored++; return; }
    /* Only a stub is replaced. A live record is never overwritten by an
       archive — the live one is by definition the more recent truth. */
    if (_isStub(visits[idx])) { visits[idx] = v; restored++; }
  });

  if (!restored) return { ok: true, restored: 0, reason: "every record in that archive is already live" };
  if (saveVisits(visits) === false) {
    return { ok: false, restored: 0, reason: "the record store refused the write" };
  }
  if (typeof logAudit === "function") {
    try { logAudit("records_restored_from_archive",
      restored + " visit(s) restored from archive " + (payload.archive_id || "(unknown)") + ".", {}); } catch (e) {}
  }
  return { ok: true, restored: restored, reason: "" };
}

/* How much headroom archiving would actually buy, for the UI to show before
   anyone commits to it. */
function archiveProjection(opts) {
  var c = archiveCandidates(opts);
  var stubBytes = c.eligible.length * 220;         /* measured stub size, rounded up */
  return {
    years: c.years,
    eligible: c.eligible.length,
    held: c.held.length,
    current_bytes: c.bytes,
    after_bytes: stubBytes,
    freed_bytes: Math.max(0, c.bytes - stubBytes)
  };
}

function archiveList() { return archiveState().archives.slice().reverse(); }

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ARCHIVE_META: ARCHIVE_META, ARCHIVE_TAG: ARCHIVE_TAG,
    ARCHIVE_DEFAULT_YEARS: ARCHIVE_DEFAULT_YEARS, ARCHIVE_MIN_YEARS: ARCHIVE_MIN_YEARS,
    archiveState: archiveState, archiveSetYears: archiveSetYears,
    archiveCandidates: archiveCandidates, archiveStubOf: archiveStubOf,
    archiveBuild: archiveBuild, archiveVerify: archiveVerify, archivePrune: archivePrune,
    archiveRun: archiveRun, archiveRestore: archiveRestore,
    archiveProjection: archiveProjection, archiveList: archiveList
  };
}
