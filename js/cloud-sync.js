/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLOUD SYNC (local-first, cloud-behind)                */
/*                                                                  */
/* Optional backup + multi-user sync against Supabase. Design       */
/* rules (non-negotiable):                                          */
/*   1. The exam and diagnostic engine NEVER wait on the network.    */
/*      All reads come from local storage; pushes are async and      */
/*      fire-and-forget; failures only mean "not backed up yet".     */
/*   2. Signed out / offline / disabled → the app behaves exactly    */
/*      as the pure-local version.                                   */
/*   3. Tenant isolation is enforced by the server (RLS), never      */
/*      trusted to this client.                                      */
/*                                                                  */
/* Live updates: a minimal Phoenix-protocol WebSocket subscribes to  */
/* postgres_changes on patients/visits; a polling fallback (12 s)    */
/* covers environments where the socket can't connect. Incoming      */
/* changes merge into local storage last-writer-wins and re-render   */
/* the dashboard. The visit currently OPEN in an exam is never       */
/* clobbered by a remote write (local editing wins; it re-syncs on   */
/* the next save).                                                   */
/*                                                                  */
/* No SDK, no CDN: plain fetch + WebSocket, same zero-build style    */
/* as the rest of the app.                                           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLOUD = {
  session: null,      /* { access_token, refresh_token, user_id, email } */
  clinicId: null,
  ws: null,
  wsOk: false,
  pollTimer: null,
  drainTimer: null,
  dirty: {},          /* kind → true (patients/visits pending push) */
  tombstones: [],     /* { kind, id } deletes waiting to propagate to peers */
  conflicts: [],      /* "kind:id" strings surfaced for the user, never swallowed */
  lastSync: null,
  lastError: null,
  _suppress: false    /* true while applying remote changes locally */
};

/* ── persistence of session/clinic (survives reloads) ── */
function cloudLoadState() {
  try {
    CLOUD.session = JSON.parse(localStorage.getItem("entopic_cloud_session") || "null");
    CLOUD.clinicId = localStorage.getItem("entopic_cloud_clinic") || null;
  } catch (e) { /* ignore */ }
}
function cloudSaveState() {
  try {
    if (CLOUD.session) localStorage.setItem("entopic_cloud_session", JSON.stringify(CLOUD.session));
    else localStorage.removeItem("entopic_cloud_session");
    if (CLOUD.clinicId) localStorage.setItem("entopic_cloud_clinic", CLOUD.clinicId);
    else localStorage.removeItem("entopic_cloud_clinic");
  } catch (e) { /* ignore */ }
}

function cloudEnabled() {
  return typeof CLOUD_CONFIG !== "undefined" && CLOUD_CONFIG.enabled &&
         typeof fetch === "function";
}
function cloudSignedIn() {
  return cloudEnabled() && CLOUD.session && CLOUD.session.access_token && CLOUD.clinicId;
}

/* ── throttling / transient-failure policy (production-readiness audit H-2) ──
   Supabase answers 429 when a project exceeds its rate limit, and 5xx during a
   restart or a brief outage. The old client treated both as a hard failure, so
   a busy clinic (or a free-tier limit hit mid-morning) would drop writes and
   keep hammering. Retry a bounded number of times with exponential backoff,
   honouring Retry-After when the server sends it. Pure so the policy is
   testable without a network. */
var CLOUD_MAX_RETRIES = 3;
function cloudRetryDelayMs(status, attempt, retryAfterHeader) {
  if (status !== 429 && !(status >= 500 && status <= 599) && status !== 0) return -1;  /* not retryable */
  if (attempt >= CLOUD_MAX_RETRIES) return -1;                                          /* give up */
  var ra = parseInt(retryAfterHeader, 10);
  if (!isNaN(ra) && ra > 0) return Math.min(ra * 1000, 60000);
  return Math.min(1000 * Math.pow(2, attempt), 30000);   /* 1s, 2s, 4s… capped */
}

/* ── low-level API helpers ── */
function cloudApi(path, opts, cb) {
  opts = opts || {};
  opts._attempt = opts._attempt || 0;
  var headers = {
    "apikey": CLOUD_CONFIG.anonKey,
    "Content-Type": "application/json"
  };
  headers["Authorization"] = "Bearer " +
    (CLOUD.session && CLOUD.session.access_token ? CLOUD.session.access_token : CLOUD_CONFIG.anonKey);
  if (opts.prefer) headers["Prefer"] = opts.prefer;

  /* Retry the same call after a delay, preserving the caller's callback. */
  function scheduleRetry(delay) {
    CLOUD.lastError = "busy — retrying in " + Math.round(delay / 1000) + "s";
    opts._attempt++;
    setTimeout(function () { cloudApi(path, opts, cb); }, delay);
  }

  fetch(CLOUD_CONFIG.url + path, {
    method: opts.method || "GET",
    headers: headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(function (res) {
    if (res.status === 401 && CLOUD.session && CLOUD.session.refresh_token && !opts._retried) {
      /* access token expired → refresh once, then retry */
      cloudRefreshToken(function (ok) {
        if (ok) { opts._retried = true; cloudApi(path, opts, cb); }
        else cb && cb(new Error("auth expired"), null, res.status);
      });
      return;
    }
    /* Rate-limited or a transient server fault → back off rather than fail.
       The record stays queued locally, so nothing is lost while we wait. */
    var wait = cloudRetryDelayMs(res.status, opts._attempt,
      (res.headers && res.headers.get) ? res.headers.get("Retry-After") : null);
    if (wait >= 0) { scheduleRetry(wait); return; }

    var ct = res.headers.get("content-type") || "";
    (ct.indexOf("json") >= 0 ? res.json() : res.text()).then(function (data) {
      if (!res.ok) {
        CLOUD.lastError = (data && data.message) || ("HTTP " + res.status);
        cb && cb(new Error(CLOUD.lastError), data, res.status);
      } else {
        cb && cb(null, data, res.status);
      }
    });
  }).catch(function (err) {
    /* Network-level failure (offline, DNS, TLS). Same bounded backoff — a
       clinic's wifi dropping for 10s should not lose a queued write. */
    var wait = cloudRetryDelayMs(0, opts._attempt, null);
    if (wait >= 0) { scheduleRetry(wait); return; }
    CLOUD.lastError = String(err && err.message || err);
    cb && cb(err, null, 0);
  });
}

function cloudRefreshToken(cb) {
  cloudApi("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: { refresh_token: CLOUD.session.refresh_token },
    _retried: true
  }, function (err, data) {
    if (!err && data && data.access_token) {
      CLOUD.session.access_token = data.access_token;
      if (data.refresh_token) CLOUD.session.refresh_token = data.refresh_token;
      cloudSaveState();
      cb(true);
    } else {
      cb(false);
    }
  });
}

/* ── auth ── */
function cloudHandleAuth(err, data, cb) {
  if (err || !data || !data.access_token) {
    cb && cb(err || new Error((data && data.msg) || "sign-in failed"));
    return;
  }
  CLOUD.session = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || "",
    user_id: (data.user && data.user.id) || "",
    email: (data.user && data.user.email) || ""
  };
  cloudSaveState();
  cloudResolveClinic(function () {
    cloudSyncProfile(function () {
      cloudStart();
      cb && cb(null);
    });
  });
}

/* ── per-user profile (app role + entitlement tier) ──
   Upserts THIS user's app role to the server-side profile and reads the
   tier back (the server is the authority on tier once licensing exists).
   Best-effort: offline / signed-out, this is a no-op and the app is
   unaffected. See db/migrations/002_profiles_and_invites.sql. */
function cloudSyncProfile(cb) {
  if (!CLOUD.session || !CLOUD.session.access_token || !CLOUD.session.user_id) { cb && cb(); return; }
  var role = (typeof effectiveRole === "function") ? effectiveRole()
    : ((typeof CU !== "undefined" && CU && CU.role) ? CU.role : "clinician");
  cloudApi("/rest/v1/profiles?on_conflict=user_id", {
    method: "POST",
    body: { user_id: CLOUD.session.user_id, app_role: role },
    prefer: "resolution=merge-duplicates,return=representation"
  }, function (err, rows) {
    var prof = (!err && rows && rows[0]) ? rows[0] : null;
    if (prof && typeof CU !== "undefined" && CU) {
      if (prof.app_role) CU.role = prof.app_role;
      if (prof.tier) CU.tier = prof.tier;
    }
    cb && cb(prof || null);
  });
}

/* ── join an existing clinic by its share code (multi-user) ──
   Calls the join_clinic_by_code RPC (inserts the caller's own membership,
   defaulting to the least-privileged role). On success, resolves the
   clinic and starts live sync. */
function cloudJoinClinic(code, cb) {
  if (!CLOUD.session || !CLOUD.session.access_token) { cb && cb(new Error("sign in first")); return; }
  var c = String(code || "").trim().toUpperCase();
  if (!c) { cb && cb(new Error("enter a join code")); return; }
  cloudApi("/rest/v1/rpc/join_clinic_by_code", { method: "POST", body: { p_code: c } },
    function (err, data) {
      if (err) { cb && cb(err); return; }
      cloudResolveClinic(function () { cloudStart(); cb && cb(null, data); });
    });
}
function cloudSignUp(email, password, cb) {
  cloudApi("/auth/v1/signup", { method: "POST", body: { email: email, password: password } },
    function (err, data) { cloudHandleAuth(err, data, cb); });
}
function cloudSignIn(email, password, cb) {
  cloudApi("/auth/v1/token?grant_type=password", { method: "POST", body: { email: email, password: password } },
    function (err, data) { cloudHandleAuth(err, data, cb); });
}
function cloudSignOut() {
  CLOUD.session = null; CLOUD.clinicId = null;
  cloudSaveState();
  cloudStop();
}

/* ── clinic membership ── */
function cloudResolveClinic(cb) {
  cloudApi("/rest/v1/clinic_members?select=clinic_id,role&limit=1", {}, function (err, rows) {
    if (!err && rows && rows.length > 0) CLOUD.clinicId = rows[0].clinic_id;
    cloudSaveState();
    cb && cb();
  });
}
function cloudCreateClinic(name, cb) {
  cloudApi("/rest/v1/clinics?select=id", { method: "POST", body: { name: name }, prefer: "return=representation" },
    function (err, rows) {
      if (err || !rows || !rows[0]) { cb && cb(err || new Error("clinic create failed")); return; }
      var clinicId = rows[0].id;
      cloudApi("/rest/v1/clinic_members", {
        method: "POST",
        body: { clinic_id: clinicId, user_id: CLOUD.session.user_id, role: "admin" }
      }, function (err2) {
        if (err2) { cb && cb(err2); return; }
        CLOUD.clinicId = clinicId;
        cloudSaveState();
        cloudStart();
        cb && cb(null, clinicId);
      });
    });
}

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
  CLOUD.tombstones.push({ kind: kind, id: id });
  if (CLOUD.drainTimer) clearTimeout(CLOUD.drainTimer);
  CLOUD.drainTimer = setTimeout(cloudDrain, 800);
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
  batch.forEach(function (t) {
    if (t.kind === "patients") byKind.patients.push({ id: t.id, clinic_id: CLOUD.clinicId, data: { id: t.id, deleted: true }, updated_at: stamp, deleted: true });
    else byKind.visits.push({ id: t.id, clinic_id: CLOUD.clinicId, patient_id: "", data: { id: t.id, deleted: true }, updated_at: stamp, deleted: true });
  });
  ["patients", "visits"].forEach(function (kind) {
    if (!byKind[kind].length) return;
    cloudApi("/rest/v1/" + kind + "?on_conflict=id", {
      method: "POST", body: byKind[kind], prefer: "resolution=merge-duplicates"
    }, function (err) {
      if (!err) CLOUD.tombstones = CLOUD.tombstones.filter(function (t) { return t.kind !== kind; });
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

/* H-1: the home page element is `pgHome` (the old `page-home` never existed,
   so live changes merged but never repainted). Repaint only when Home is the
   active page. */
function cloudRerender() {
  try {
    var home = document.getElementById("pgHome");
    if (home && home.classList.contains("active") && typeof renderHome === "function") renderHome();
  } catch (e) { /* rendering must never break sync */ }
}

function cloudPull(cb) {
  if (!cloudSignedIn()) { cb && cb(); return; }
  var pending = 2, changed = 0;
  function done(n) { changed += n; if (--pending === 0) { if (changed) cloudRerender(); CLOUD.lastSync = new Date().toISOString(); cb && cb(changed); } }
  function pull(kind) {
    /* H-6: only live rows; a soft-deleted row is handled by its tombstone, not
       resurrected. */
    cloudApi("/rest/v1/" + kind + "?select=id,data,updated_at,deleted", {}, function (err, rows) {
      if (err) { done(0); return; }
      cloudDecryptRows(rows, function (dec) { done(cloudMergeRows(kind, dec)); });
    });
  }
  pull("patients");
  pull("visits");
}

/* ── realtime: minimal Phoenix-protocol client ── */
function cloudConnectRealtime() {
  if (!cloudSignedIn() || typeof WebSocket === "undefined") return;
  var wsUrl = CLOUD_CONFIG.url.replace(/^http/, "ws") +
    "/realtime/v1/websocket?apikey=" + encodeURIComponent(CLOUD_CONFIG.anonKey) + "&vsn=1.0.0";
  try { CLOUD.ws = new WebSocket(wsUrl); } catch (e) { CLOUD.wsOk = false; return; }
  var hb = null, refN = 1;

  CLOUD.ws.onopen = function () {
    CLOUD.ws.send(JSON.stringify({
      topic: "realtime:entopic", event: "phx_join", ref: String(refN++), join_ref: "1",
      payload: {
        access_token: CLOUD.session.access_token,
        config: { postgres_changes: [
          { event: "*", schema: "public", table: "patients" },
          { event: "*", schema: "public", table: "visits" }
        ] }
      }
    }));
    hb = setInterval(function () {
      try { CLOUD.ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(refN++) })); }
      catch (e) { /* socket died; onclose handles it */ }
    }, 25000);
  };

  CLOUD.ws.onmessage = function (ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (e) { return; }
    if (msg.event === "phx_reply" && msg.payload && msg.payload.status === "ok") { CLOUD.wsOk = true; return; }
    if (msg.event === "postgres_changes" || msg.event === "postgres_change") {
      var data = (msg.payload && (msg.payload.data || msg.payload)) || {};
      var table = data.table;
      var record = data.record || data.new;
      if (!table || !record) return;
      var kind = table === "patients" ? "patients" : "visits";
      /* decrypt the pushed row before merging (it arrives as ciphertext) */
      cloudDecryptRows([{ id: record.id, data: record.data, updated_at: record.updated_at, deleted: record.deleted }],
        function (dec) { if (cloudMergeRows(kind, dec)) cloudRerender(); });
    }
  };

  CLOUD.ws.onclose = function () {
    CLOUD.wsOk = false;
    if (hb) clearInterval(hb);
    /* reconnect with a gentle backoff while signed in */
    if (cloudSignedIn()) setTimeout(cloudConnectRealtime, 8000);
  };
  CLOUD.ws.onerror = function () { CLOUD.wsOk = false; };
}

/* ── lifecycle ── */
function cloudStart() {
  if (!cloudSignedIn()) return;
  cloudPull();
  cloudDrain();
  cloudConnectRealtime();
  if (CLOUD.pollTimer) clearInterval(CLOUD.pollTimer);
  /* polling fallback keeps the dashboard live even without the socket */
  CLOUD.pollTimer = setInterval(function () {
    if (!CLOUD.wsOk) cloudPull();
    cloudDrain();
  }, 12000);
}
function cloudStop() {
  if (CLOUD.pollTimer) { clearInterval(CLOUD.pollTimer); CLOUD.pollTimer = null; }
  if (CLOUD.ws) { try { CLOUD.ws.close(); } catch (e) {} CLOUD.ws = null; }
  CLOUD.wsOk = false;
}

/* ── KB authoring (owner-only; the server's RLS allowlist is the real gate,
   this client path just surfaces it). Writes go to the same kb_conditions /
   kb_versions tables the remote-update pipeline reads. ── */
function cloudKbIsEditor(cb) {
  if (!cloudSignedIn()) { cb && cb(false); return; }
  /* kb_editors RLS returns the caller's own row only if they're an editor. */
  cloudApi("/rest/v1/kb_editors?select=user_id&limit=1", {}, function (err, rows) {
    cb && cb(!err && rows && rows.length > 0);
  });
}
function cloudKbUpsertCondition(row, cb) {
  if (!cloudSignedIn()) { cb && cb(new Error("sign in required")); return; }
  cloudApi("/rest/v1/kb_conditions?on_conflict=name", {
    method: "POST", body: [row], prefer: "resolution=merge-duplicates,return=minimal"
  }, function (err) { cb && cb(err || null); });
}
function cloudKbPublishVersion(version, notes, bundle, cb) {
  if (!cloudSignedIn()) { cb && cb(new Error("sign in required")); return; }
  cloudApi("/rest/v1/kb_versions?on_conflict=version", {
    method: "POST",
    body: [{ version: version, notes: notes || "", bundle: bundle, published: true }],
    prefer: "resolution=merge-duplicates,return=minimal"
  }, function (err) { cb && cb(err || null); });
}

/* ── append to the server audit log (DD H-7) ──────────────────────
   Immutable, append-only on the server (see 003_integrity_and_audit.sql).
   De-identified by contract: action + detail + opaque record ids only, never
   a name/MRN/DOB. Best-effort and fire-and-forget — a failed audit push must
   never block or break the app, and the local audit trail is kept regardless. */
function cloudAuditPush(action, detail, patientId, visitId) {
  if (!cloudSignedIn()) return;
  cloudApi("/rest/v1/audit_log", {
    method: "POST",
    body: [{
      clinic_id: CLOUD.clinicId,
      user_id: CLOUD.session.user_id || null,
      action: String(action || "").slice(0, 120),
      detail: String(detail || "").slice(0, 500),
      patient_id: patientId || null,
      visit_id: visitId || null
    }],
    prefer: "return=minimal"
  }, function () { /* best-effort; ignore result */ });
}

/* ── status for the UI ── */
function cloudStatus() {
  if (!cloudEnabled()) return { state: "disabled", label: "Cloud sync off — local only" };
  if (!CLOUD.session) return { state: "signedout", label: "Local only — not signed in" };
  if (!CLOUD.clinicId) return { state: "noclinic", label: "Signed in — no clinic yet" };
  /* PHI gate state — the app must never look "synced" while patient records
     are actually being withheld for lack of consent or a key. */
  if (typeof phiConsentGiven === "function" && !phiConsentGiven()) {
    return { state: "phi_off", label: "Signed in — patient sync OFF (no consent)", email: CLOUD.session.email };
  }
  if (typeof phiKeyReady === "function" && !phiKeyReady()) {
    return { state: "phi_nokey", label: "Signed in — enter clinic passphrase to sync patient data", email: CLOUD.session.email };
  }
  var conflicts = (CLOUD.conflicts || []).length;
  return {
    state: CLOUD.wsOk ? "live" : "polling",
    label: (CLOUD.wsOk ? "Live sync (encrypted)" : "Sync (polling, encrypted)") +
      (CLOUD.lastSync ? " · last " + CLOUD.lastSync.slice(11, 19) : "") +
      (conflicts ? " · ⚠ " + conflicts + " conflict(s)" : ""),
    email: CLOUD.session.email,
    conflicts: conflicts
  };
}

/* boot: restore session and start quietly (never blocks the app) */
cloudLoadState();
if (typeof window !== "undefined") {
  try { window.addEventListener("online", function () { if (cloudSignedIn()) cloudStart(); }); } catch (e) {}
  if (cloudSignedIn()) setTimeout(cloudStart, 1500);
}
