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

/* ── persistence of session/clinic (survives reloads) ──
   SECURITY (review S-1): the session holds a Supabase access token AND a
   long-lived refresh token. Anyone who reads them can sign in as this
   clinician and pull the entire clinic's records from the SERVER — no local
   decryption needed. Storing them in the clear therefore defeated the record
   vault for any cloud-connected practice: a stolen laptop could not read the
   disk but could still drain the cloud.

   They are now wrapped by the vault when it is on. While the vault is LOCKED
   the token is deliberately withheld, so a locked device cannot reach the
   cloud on a thief's behalf; it is restored on unlock.

   The clinic id stays in the clear: it is an opaque uuid, is not a credential,
   and the UI needs it synchronously to render "which clinic am I in". */
function cloudLoadState() {
  try {
    CLOUD.clinicId = localStorage.getItem("entopic_cloud_clinic") || null;
    var raw = localStorage.getItem("entopic_cloud_session") || "";
    if (!raw) { CLOUD.session = null; return; }
    /* Wrapped: needs the vault, so load it asynchronously. Until that
       resolves the app behaves exactly as "signed out", which is the safe
       default — it never silently proceeds with no token. */
    if (cloudBlobIsWrapped(raw)) {
      CLOUD.session = null;
      cloudRestoreSession();
      return;
    }
    CLOUD.session = JSON.parse(raw);
  } catch (e) { /* ignore */ }
}
function cloudSaveState() {
  try {
    if (CLOUD.session) {
      if (typeof vaultSecretSet === "function") vaultSecretSet("entopic_cloud_session", JSON.stringify(CLOUD.session));
      else localStorage.setItem("entopic_cloud_session", JSON.stringify(CLOUD.session));
    } else {
      localStorage.removeItem("entopic_cloud_session");
    }
    if (CLOUD.clinicId) localStorage.setItem("entopic_cloud_clinic", CLOUD.clinicId);
    else localStorage.removeItem("entopic_cloud_clinic");
  } catch (e) { /* ignore */ }
}

/* Is this stored blob a vault envelope rather than a raw session?

   SELF-CONTAINED ON PURPOSE. The first version asked local-vault.js
   (`typeof vaultIsWrappedSecret === "function"`), but cloudLoadState() runs at
   MODULE LOAD and cloud-sync.js used to load before local-vault.js — so the
   guard was always false and the envelope was JSON.parsed straight into
   CLOUD.session, leaving the client "signed in" with ciphertext as its token.
   That is the same failure mode as the escaping bug (R-1): a guard that
   depends on load order is not a guard. The script order is now fixed AND this
   check no longer depends on it. */
function cloudBlobIsWrapped(raw) {
  if (!raw || raw.charAt(0) !== "{") return false;
  try {
    var o = JSON.parse(raw);
    return !!(o && typeof o === "object" && o.__vault && o.iv && o.ct);
  } catch (e) { return false; }
}

/* Load the wrapped session once the vault is open. Called at boot and again
   after every unlock, so sync resumes without the user signing in again. */
function cloudRestoreSession() {
  if (typeof vaultSecretGet !== "function") return;
  var raw = "";
  try { raw = localStorage.getItem("entopic_cloud_session") || ""; } catch (e) {}
  if (!raw || !cloudBlobIsWrapped(raw)) return;
  vaultSecretGet("entopic_cloud_session").then(function (json) {
    if (!json) return;                          /* still locked → stay signed out */
    try { CLOUD.session = JSON.parse(json); } catch (e) { return; }
    if (typeof cloudStart === "function") cloudStart();
    if (typeof cloudRerender === "function") cloudRerender();
  }).catch(function () {});
}

/* Drop the session from MEMORY without touching the stored (wrapped) copy —
   used when the vault locks. Signing out proper is cloudSignOut(). */
function cloudForgetSessionInMemory() {
  CLOUD.session = null;
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

/* ── SIGN OUT EVERYWHERE  (security audit SEC-4) ──

   Signing out above clears THIS device. The refresh token issued to any other
   device stays valid until it expires on its own — so a stolen laptop, a
   borrowed phone, or a session left open on a shared terminal remained able to
   pull the whole clinic's records from the SERVER, with no device needed.

   Containment was: change the account password in the Supabase dashboard, and
   hope. That is not a control a clinic can be asked to operate at 9 a.m.

   Supabase's logout endpoint takes a scope. `global` revokes every refresh
   token issued to this user, on every device, immediately.

   Deliberately reports what happened rather than assuming success: a
   revocation the clinician believes worked and did not is worse than none,
   because they will stop looking for the device. */
function cloudSignOutEverywhere(cb) {
  cb = cb || function () {};
  if (!cloudSignedIn()) {
    cloudSignOut();
    cb(null, { local_only: true,
      reason: "This device was not signed in to the cloud, so there was nothing to revoke." });
    return;
  }
  cloudApi("/auth/v1/logout?scope=global", { method: "POST", _retried: true }, function (err) {
    /* Clear locally WHATEVER the server said. If the call failed we may have
       revoked nothing, but leaving this device signed in as well would be
       strictly worse. */
    var wasClinic = CLOUD.clinicId;
    cloudSignOut();
    if (typeof logAudit === "function") {
      try {
        logAudit(err ? "sessions_revoke_failed" : "sessions_revoked_everywhere",
          err ? ("A sign-out-everywhere was attempted and the server did not confirm it: " +
                 (err.message || err) + ". Other devices may still be signed in.")
              : "Every session for this account was revoked, on all devices.",
          {});
      } catch (e) {}
    }
    if (err) {
      cb(err, { local_only: true, clinic_id: wasClinic,
        reason: "This device is signed out, but the server did not confirm that other " +
                "devices were. Change the account password as well." });
      return;
    }
    cb(null, { revoked: true,
      reason: "Every device signed in to this account has been signed out." });
  });
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
  /* Before anything else: pick up deletes queued in a previous session, so a
     crash between the delete and its drain does not resurrect a record. */
  cloudTombstonesRestore();
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
