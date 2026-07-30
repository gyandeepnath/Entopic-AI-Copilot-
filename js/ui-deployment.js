/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DEPLOYMENT PANEL (admin only)                          */
/*                                                                  */
/* The one screen a practice uses to put Entopic into service and    */
/* keep it there. It gathers the three things that were previously   */
/* scattered or exposed to every user (production-readiness audit,   */
/* 2026-07-30):                                                      */
/*                                                                  */
/*   1. BACKEND CONNECTION — the Supabase project URL + anon key.    */
/*      These decide where this clinic's patient data is sent, so    */
/*      they belong to the administrator, not to every signed-in     */
/*      user (audit B-2). Shown with the connection state and a      */
/*      reachability check that proves the credentials work BEFORE   */
/*      the practice relies on them.                                 */
/*                                                                  */
/*   2. CLINIC DEPLOYMENT MODE — the single switch that closes open  */
/*      self-signup and turns on the idle auto-lock (audit B-3).     */
/*                                                                  */
/*   3. RESTORE FROM BACKUP — replaces every record, so it is an     */
/*      administrator action with a safety snapshot taken first.     */
/*                                                                  */
/* A readiness checklist at the top states plainly what is and is    */
/* not ready, including the things this panel CANNOT fix (local      */
/* records are not encrypted at rest). Telling the founder the truth */
/* about residual risk matters more than a green tick.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── Readiness checks (pure — Node-testable) ─────────────────────
   Each returns {id, label, state:"ok"|"warn"|"blocked", detail}. */
function deployChecks(env) {
  env = env || {};
  function pick(name, fallback) {
    if (Object.prototype.hasOwnProperty.call(env, name)) return env[name];
    return fallback;
  }
  var out = [];

  var clinicMode = pick("clinicMode",
    (typeof clinicModeOn === "function") ? clinicModeOn() : false);
  out.push({
    id: "clinic_mode",
    label: "Clinic deployment mode",
    state: clinicMode ? "ok" : "blocked",
    detail: clinicMode
      ? "On — new accounts are closed and the screen locks after " +
        ((typeof clinicLockMinutes === "function") ? clinicLockMinutes() : 15) + " min idle."
      : "Off — anyone at this terminal can create an account and reach every patient record, and the session never locks. Turn this on before seeing patients."
  });

  var adminDefault = pick("adminLegacy",
    (typeof adminUsingLegacyCredential === "function") ? adminUsingLegacyCredential() : false);
  out.push({
    id: "admin_password",
    label: "Administrator password",
    state: adminDefault ? "blocked" : "ok",
    detail: adminDefault
      ? "Still the built-in default. Change it below before this terminal is used."
      : "Changed from the default and stored as a salted PBKDF2 hash."
  });

  var plaintext = pick("plaintextCount",
    (typeof authPlaintextCount === "function") ? authPlaintextCount() : 0);
  out.push({
    id: "credentials",
    label: "Staff passwords",
    state: plaintext > 0 ? "warn" : "ok",
    detail: plaintext > 0
      ? plaintext + " account(s) predate password hashing and still hold a plaintext password; each upgrades on next sign-in."
      : "All hashed (PBKDF2-SHA-256). No plaintext password is stored."
  });

  var configured = pick("cloudConfigured",
    (typeof cloudConfigured === "function") ? cloudConfigured() : false);
  out.push({
    id: "backend",
    label: "Backup / sync backend",
    state: configured ? "ok" : "warn",
    detail: configured
      ? "A Supabase project is connected. Records are encrypted on this device before they are sent."
      : "Not connected. Everything works offline, but this device's records exist in ONE place — losing or wiping it loses the records. Connect a project, or export a backup on a schedule."
  });

  var phi = pick("phiArmed",
    (typeof phiArmed === "function") ? phiArmed() : false);
  if (configured) {
    out.push({
      id: "phi",
      label: "Patient-data encryption key",
      state: phi ? "ok" : "warn",
      detail: phi
        ? "Consent given and the clinic key is set — names/MRNs are encrypted before leaving the device."
        : "Patient records are NOT syncing yet: cloud sync of identifiable data needs consent plus a clinic passphrase."
    });
  }

  /* Encryption at rest. Entopic can now do this itself (js/local-vault.js),
     but it is OFF until an admin turns it on — so report what is actually
     true on THIS device, never what is merely possible. */
  var vault = pick("vaultState", (typeof vaultState === "function") ? vaultState() : "off");
  out.push({
    id: "at_rest",
    label: "Records at rest on this device",
    state: (vault === "off" || vault === "unavailable") ? "blocked" : "ok",
    detail: vault === "unlocked" || vault === "locked"
      ? "Encrypted (AES-GCM-256). Patients, visits, the audit trail and accounts are unreadable without the clinic passphrase or the recovery code. " +
        "Keep full-disk encryption on as well — this cannot protect a machine left switched on and unlocked."
      : vault === "unavailable"
        ? "This browser cannot encrypt (no Web Crypto) — records are stored in the clear. Use a current Chrome or Edge."
        : "NOT encrypted — records are stored in the clear, so anyone with the device or a copied browser profile can read them. " +
          "Turn on Record encryption below, and turn on full-disk encryption (BitLocker / FileVault) too."
  });

  return out;
}

function deployReadyState(checks) {
  var blocked = 0, warn = 0;
  for (var i = 0; i < checks.length; i++) {
    if (checks[i].state === "blocked") blocked++;
    else if (checks[i].state === "warn") warn++;
  }
  return { blocked: blocked, warn: warn, ready: blocked === 0 };
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM (browser only, admin-gated)                                 */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  var _de = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* Mask a key so the panel confirms WHICH credential is in use without
     printing it in full on a screen a patient might see. */
  function deployMask(v) {
    v = String(v || "");
    if (v.length <= 12) return v ? "••••" : "";
    return v.slice(0, 6) + "…" + v.slice(-4);
  }

  window.deploymentCard = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return "";

    var checks = deployChecks();
    var st = deployReadyState(checks);
    var dot = { ok: "#2e7d32", warn: "#b8860b", blocked: "#c0392b" };
    var rows = "";
    for (var i = 0; i < checks.length; i++) {
      var c = checks[i];
      rows += '<div style="display:flex;gap:7px;align-items:flex-start;padding:4px 0;border-top:1px solid var(--cl)">' +
        '<span style="color:' + dot[c.state] + ';font-weight:700;line-height:1.2">' +
          (c.state === "ok" ? "✓" : c.state === "warn" ? "!" : "✕") + '</span>' +
        '<span style="flex:1"><b style="font-size:.62rem">' + _de(c.label) + '</b>' +
          '<div style="font-size:.58rem;color:var(--sl)">' + _de(c.detail) + '</div></span>' +
      '</div>';
    }

    var banner = st.ready
      ? '<div style="background:#eef4ef;border:1px solid #a9cbb4;color:#1e5e33;padding:6px 8px;border-radius:var(--r);font-size:.62rem">' +
          '✓ No deployment blockers on this device' + (st.warn ? ' — ' + st.warn + ' item(s) still need attention below.' : '.') + '</div>'
      : '<div style="background:#fdecea;border:1px solid #e6a49c;color:#8a2318;padding:6px 8px;border-radius:var(--r);font-size:.62rem">' +
          '✕ <b>' + st.blocked + ' deployment blocker(s)</b> — do not use this terminal for real patients until these are cleared.</div>';

    /* ── backend connection ── */
    var connected = (typeof cloudConfigured === "function") && cloudConfigured();
    var cfg = (typeof CLOUD_CONFIG !== "undefined") ? CLOUD_CONFIG : { url: "", anonKey: "" };
    var backend = connected
      ? '<div style="font-size:.6rem;color:var(--sl)">Project: <code style="font-size:.58rem">' + _de(cfg.url) + '</code><br>' +
          'Anon key: <code style="font-size:.58rem">' + _de(deployMask(cfg.anonKey)) + '</code></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          '<button class="btn btn-s" style="font-size:.6rem" onclick="deployTestBackend()">Test connection</button>' +
          '<button class="btn btn-s" style="font-size:.6rem" onclick="cloudUiDisconnect()">Disconnect</button>' +
        '</div>'
      : '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
          '<input id="deployCfgUrl" placeholder="https://YOUR-PROJECT.supabase.co" style="font-size:.6rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;min-width:230px">' +
          '<input id="deployCfgKey" placeholder="anon public key" style="font-size:.6rem;padding:3px 5px;border:1px solid var(--fg);border-radius:2px;min-width:190px">' +
          '<button class="btn btn-p" style="font-size:.6rem" onclick="deployConnectBackend()">Connect &amp; test</button>' +
        '</div>' +
        '<div style="font-size:.57rem;color:var(--md);margin-top:4px">Supabase dashboard → Project Settings → API. The <b>anon</b> key is a public client key by design; access is enforced by row-level security in the database. Never paste the <b>service_role</b> key here.</div>';

    /* ── clinic mode ── */
    var cmOn = (typeof clinicModeOn === "function") && clinicModeOn();
    var mins = (typeof clinicLockMinutes === "function") ? clinicLockMinutes() : 15;

    return '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">🚀 Deployment readiness</div>' +
        banner + rows +
      '</div>' +

      '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">🏥 Clinic deployment mode</div>' +
        '<div class="home-settings-desc">Turn this on for a terminal that sees real patients. It closes new-account creation (you create staff accounts) and locks the screen after an idle period — saving any exam in progress first, so nothing is lost.</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' +
          '<button class="btn ' + (cmOn ? "btn-s" : "btn-p") + '" style="font-size:.6rem" onclick="deployToggleClinicMode()">' +
            (cmOn ? "Turn OFF clinic mode" : "Turn ON clinic mode") + '</button>' +
          '<label style="font-size:.6rem;color:var(--sl)">Lock after ' +
            '<input id="deployLockMin" type="number" min="1" max="240" value="' + mins + '" style="width:52px;font-size:.6rem;padding:2px 4px;border:1px solid var(--fg);border-radius:2px"> min ' +
            '<button class="btn btn-s" style="font-size:.58rem" onclick="deploySetLockMinutes()">Set</button></label>' +
        '</div>' +
        '<div id="deployCmMsg" class="home-settings-status"></div>' +
      '</div>' +

      (typeof vaultAdminCard === "function" ? vaultAdminCard() : "") +

      '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">☁ Backend connection (Supabase)</div>' +
        '<div class="home-settings-desc">Where this practice\'s backup and multi-device sync live. Entered once per device; the diagnostic engine never depends on it.</div>' +
        backend +
        '<div id="deployBackendMsg" class="home-settings-status"></div>' +
      '</div>' +

      '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">📁 Restore from backup</div>' +
        '<div class="home-settings-desc"><b>Replaces every patient record on this device.</b> A safety snapshot of the current data is downloaded first, so a wrong file can be undone.</div>' +
        '<input type="file" accept=".json" onchange="if(this.files[0])importData(this.files[0])" style="font-size:.62rem">' +
      '</div>';
  };

  window.deployToggleClinicMode = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var on = (typeof clinicModeOn === "function") && clinicModeOn();
    if (!on) {
      if (!window.confirm(
        "Turn ON clinic deployment mode?\n\n" +
        "• New accounts can no longer be created at the sign-in screen — you create staff accounts.\n" +
        "• The session locks after " + ((typeof clinicLockMinutes === "function") ? clinicLockMinutes() : 15) +
        " minutes idle (work in progress is saved first).\n\n" +
        "You can turn it off again here at any time.")) return;
    } else {
      if (!window.confirm(
        "Turn OFF clinic deployment mode?\n\n" +
        "Anyone at this terminal will be able to create an account and open every patient record, " +
        "and the screen will stop locking. Only do this on a teaching or demo device.")) return;
    }
    clinicModeSet(!on);
    if (typeof renderHome === "function") renderHome();
  };

  window.deploySetLockMinutes = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var el = document.getElementById("deployLockMin");
    var msg = document.getElementById("deployCmMsg");
    var ok = (typeof clinicLockMinutesSet === "function") && clinicLockMinutesSet(el ? el.value : 0);
    if (msg) {
      msg.style.color = ok ? "#2e7d32" : "var(--md)";
      msg.textContent = ok ? "Idle lock set to " + clinicLockMinutes() + " minutes."
                           : "Enter a number of minutes between 1 and 240.";
    }
  };

  /* Connect + immediately prove the credentials actually work. A practice
     should never discover at 9am that the key was wrong. */
  window.deployConnectBackend = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var url = (document.getElementById("deployCfgUrl") || {}).value || "";
    var key = (document.getElementById("deployCfgKey") || {}).value || "";
    var msg = document.getElementById("deployBackendMsg");
    if (/service_role/i.test(key)) {
      if (msg) { msg.style.color = "#c0392b"; msg.textContent = "That looks like a service_role key — never put it in the app. Use the anon public key."; }
      return;
    }
    if (typeof configureCloud !== "function" || !configureCloud(url, key)) {
      if (msg) { msg.style.color = "#c0392b"; msg.textContent = "Enter a valid https://….supabase.co URL and the anon public key (20+ characters)."; }
      return;
    }
    if (typeof logAudit === "function") { try { logAudit("backend_connected", "Supabase project connected: " + url, {}); } catch (e) {} }
    if (msg) { msg.style.color = "var(--sl)"; msg.textContent = "Saved. Testing the connection…"; }
    deployTestBackend();
  };

  /* Reachability probe: does this URL+key answer? Uses the REST root, which
     needs no table and no sign-in — a 200/401-class answer proves the project
     and key are real; a network error means the practice would be syncing
     into nothing. */
  window.deployTestBackend = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var msg = document.getElementById("deployBackendMsg");
    var cfg = (typeof CLOUD_CONFIG !== "undefined") ? CLOUD_CONFIG : null;
    if (!cfg || !cfg.url || !cfg.anonKey) {
      if (msg) { msg.style.color = "#c0392b"; msg.textContent = "No project configured yet."; }
      return;
    }
    if (msg) { msg.style.color = "var(--sl)"; msg.textContent = "Testing…"; }
    var done = false;
    var finish = function (colour, text) {
      if (done) return; done = true;
      if (msg) { msg.style.color = colour; msg.textContent = text; }
      if (typeof renderHome === "function") setTimeout(renderHome, 1200);
    };
    setTimeout(function () { finish("#b8860b", "No answer within 10s — check the URL, or that this device is online."); }, 10000);
    try {
      fetch(cfg.url.replace(/\/+$/, "") + "/rest/v1/", {
        method: "GET",
        headers: { apikey: cfg.anonKey, Authorization: "Bearer " + cfg.anonKey }
      }).then(function (res) {
        if (res.status === 401 || res.status === 403) {
          finish("#c0392b", "Reached the project, but the key was rejected (" + res.status + "). Check you pasted the anon public key.");
        } else if (res.ok || res.status === 404) {
          finish("#2e7d32", "✓ Connected — the project answered. Sign in below to start syncing.");
        } else {
          finish("#b8860b", "Project answered with HTTP " + res.status + ". Sync may not work; check the project is active.");
        }
      }).catch(function (e) {
        finish("#c0392b", "Could not reach the project: " + ((e && e.message) || "network error") +
          ". Entopic keeps working offline — nothing is lost.");
      });
    } catch (e) {
      finish("#c0392b", "Could not start the test on this browser.");
    }
  };
}

/* Node/UMD export for tests. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { deployChecks: deployChecks, deployReadyState: deployReadyState };
}
