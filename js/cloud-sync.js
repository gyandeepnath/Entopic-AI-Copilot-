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

/* ── low-level API helpers ── */
function cloudApi(path, opts, cb) {
  opts = opts || {};
  var headers = {
    "apikey": CLOUD_CONFIG.anonKey,
    "Content-Type": "application/json"
  };
  headers["Authorization"] = "Bearer " +
    (CLOUD.session && CLOUD.session.access_token ? CLOUD.session.access_token : CLOUD_CONFIG.anonKey);
  if (opts.prefer) headers["Prefer"] = opts.prefer;
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

function cloudDrain() {
  if (!cloudSignedIn()) return; /* dirty flags stay set; retried on next start */
  if (CLOUD.dirty.patients) {
    /* Per-record stamps: a record that wasn't touched keeps its old
       updated_at, so peers' LWW merge won't see it as "newer" and
       overwrite their own unpushed edits. Never stamp "now" here. */
    var patients = loadPatients().map(function (p) {
      return { id: p.id, clinic_id: CLOUD.clinicId, data: p,
               updated_at: p.updated || p.created || new Date(0).toISOString() };
    });
    if (patients.length) {
      cloudApi("/rest/v1/patients?on_conflict=id", {
        method: "POST", body: patients, prefer: "resolution=merge-duplicates"
      }, function (err) { if (!err) { CLOUD.dirty.patients = false; CLOUD.lastSync = new Date().toISOString(); } });
    } else { CLOUD.dirty.patients = false; }
  }
  if (CLOUD.dirty.visits) {
    var visits = loadVisits().map(function (v) {
      return { id: v.id, clinic_id: CLOUD.clinicId, patient_id: v.patient_id, data: v,
               updated_at: v.updated || v.date || new Date(0).toISOString() };
    });
    if (visits.length) {
      cloudApi("/rest/v1/visits?on_conflict=id", {
        method: "POST", body: visits, prefer: "resolution=merge-duplicates"
      }, function (err) { if (!err) { CLOUD.dirty.visits = false; CLOUD.lastSync = new Date().toISOString(); } });
    } else { CLOUD.dirty.visits = false; }
  }
}

/* ── pull: cloud → local (merge, LWW, never clobber the open visit) ── */
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
    var rec = row.data || {};
    rec._cloud_updated = row.updated_at;
    /* never clobber the visit that is open in this exam right now */
    if (kind === "visits" && typeof CV !== "undefined" && CV && rec.id === CV) continue;
    var idx = byId[row.id];
    if (idx === undefined) { local.push(rec); changed++; continue; }
    var prev = local[idx];
    var prevStamp = prev._cloud_updated || prev.updated || "";
    if (String(row.updated_at) > String(prevStamp)) { local[idx] = rec; changed++; }
  }
  if (changed > 0) {
    CLOUD._suppress = true;
    try { save(local); } finally { CLOUD._suppress = false; }
  }
  return changed;
}

function cloudRerender() {
  try {
    var home = document.getElementById("page-home");
    if (home && home.style.display !== "none" && typeof renderHome === "function") renderHome();
  } catch (e) { /* rendering must never break sync */ }
}

function cloudPull(cb) {
  if (!cloudSignedIn()) { cb && cb(); return; }
  var pending = 2, changed = 0;
  function done(n) { changed += n; if (--pending === 0) { if (changed) cloudRerender(); CLOUD.lastSync = new Date().toISOString(); cb && cb(changed); } }
  cloudApi("/rest/v1/patients?select=id,data,updated_at", {}, function (err, rows) { done(err ? 0 : cloudMergeRows("patients", rows)); });
  cloudApi("/rest/v1/visits?select=id,data,updated_at", {}, function (err, rows) { done(err ? 0 : cloudMergeRows("visits", rows)); });
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
      var changed = cloudMergeRows(table === "patients" ? "patients" : "visits",
        [{ id: record.id, data: record.data, updated_at: record.updated_at }]);
      if (changed) cloudRerender();
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

/* ── status for the UI ── */
function cloudStatus() {
  if (!cloudEnabled()) return { state: "disabled", label: "Cloud sync off — local only" };
  if (!CLOUD.session) return { state: "signedout", label: "Local only — not signed in" };
  if (!CLOUD.clinicId) return { state: "noclinic", label: "Signed in — no clinic yet" };
  return {
    state: CLOUD.wsOk ? "live" : "polling",
    label: (CLOUD.wsOk ? "Live sync" : "Sync (polling)") +
      (CLOUD.lastSync ? " · last " + CLOUD.lastSync.slice(11, 19) : ""),
    email: CLOUD.session.email
  };
}

/* boot: restore session and start quietly (never blocks the app) */
cloudLoadState();
if (typeof window !== "undefined") {
  try { window.addEventListener("online", function () { if (cloudSignedIn()) cloudStart(); }); } catch (e) {}
  if (cloudSignedIn()) setTimeout(cloudStart, 1500);
}
