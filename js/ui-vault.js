/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — RECORD VAULT UI                                        */
/*                                                                  */
/* Two surfaces for js/local-vault.js:                              */
/*                                                                  */
/*  1. The UNLOCK screen at boot. When the vault is on, EVERY        */
/*     protected store — including the list of user accounts — is    */
/*     ciphertext, so the device must be unlocked before anyone can  */
/*     even sign in. This is deliberate: it is the device that is    */
/*     locked, and the clinician signs in afterwards.                */
/*                                                                  */
/*  2. The ADMIN controls: turn encryption on (which shows the       */
/*     recovery code once, and refuses to proceed until it has been  */
/*     acknowledged), change the passphrase, re-issue a recovery     */
/*     code, or turn encryption off again.                           */
/*                                                                  */
/* The recovery code is the safety net that makes encrypting         */
/* clinical records responsible rather than reckless, so the UI      */
/* treats losing it as the serious event it is.                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

if (typeof document !== "undefined") {

  var _vue = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* ── Boot gate ─────────────────────────────────────────────────
     Called from init(). Returns true if the vault took over the screen,
     in which case the normal "do any users exist?" logic must NOT run —
     with a locked vault it would read zero accounts and wrongly offer to
     create one. */
  window.vaultUiBootGate = function () {
    if (typeof vaultEnabled !== "function" || !vaultEnabled()) return false;
    if (vaultUnlocked()) return false;
    vaultUiShowLock();
    return true;
  };

  window.vaultUiShowLock = function () {
    var ids = ["loginView", "setupView", "vaultView"];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.style.display = (ids[i] === "vaultView") ? "block" : "none";
    }
    var rb = document.getElementById("vaultRecoveryBox");
    if (rb) rb.style.display = "none";
    if (typeof showPage === "function") showPage("pgLogin");
    var f = document.getElementById("inp_vp");
    if (f) { f.value = ""; try { f.focus(); } catch (e) {} }
  };

  function vaultUiErr(text) {
    var el = document.getElementById("vaultErr");
    if (el) { el.textContent = text || ""; el.style.display = text ? "block" : "none"; }
  }

  /* After a successful unlock the app carries on exactly as it does on a
     normal start: show sign-in, or the first-run setup if there are genuinely
     no accounts (now that we can actually read them). */
  function vaultUiAfterUnlock() {
    vaultUiErr("");
    var vv = document.getElementById("vaultView");
    if (vv) vv.style.display = "none";
    var users = (typeof loadUsers === "function") ? loadUsers() : [];
    if (users.length === 0) { if (typeof showView === "function") showView("setupView", "loginView"); }
    else { if (typeof showView === "function") showView("loginView", "setupView"); }
    if (typeof toast === "function") toast("Records unlocked on this device.");
  }

  window.vaultUiUnlock = function () {
    var el = document.getElementById("inp_vp");
    var pass = el ? el.value : "";
    if (!pass) { vaultUiErr("Enter the clinic passphrase."); return; }
    vaultUiErr("Unlocking…");
    vaultUnlock(pass).then(function () {
      if (el) el.value = "";
      vaultUiAfterUnlock();
    }).catch(function (e) { vaultUiErr((e && e.message) || "Could not unlock."); });
  };

  window.vaultUiShowRecovery = function () {
    var rb = document.getElementById("vaultRecoveryBox");
    if (rb) rb.style.display = (rb.style.display === "none") ? "block" : "none";
  };

  window.vaultUiRecover = function () {
    var el = document.getElementById("inp_vrc");
    var code = el ? el.value : "";
    if (!code) { vaultUiErr("Enter the recovery code."); return; }
    vaultUiErr("Checking the recovery code…");
    vaultUnlockWithRecovery(code).then(function () {
      if (el) el.value = "";
      vaultUiAfterUnlock();
      /* Using the recovery code means the passphrase is lost — say so, loudly,
         because the clinic now has no day-to-day way in until it is reset. */
      window.alert("Unlocked with the recovery code.\n\n" +
        "The clinic passphrase is still unknown, so set a new one now:\n" +
        "Admin → Record encryption → Change passphrase.\n\n" +
        "Then issue a fresh recovery code — the one you just used should be treated as spent.");
    }).catch(function (e) { vaultUiErr((e && e.message) || "Could not unlock."); });
  };


  /* ── Admin card ───────────────────────────────────────────────── */
  window.vaultAdminCard = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return "";
    var state = (typeof vaultState === "function") ? vaultState() : "unavailable";

    if (state === "unavailable") {
      return '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">🔒 Record encryption</div>' +
        '<div class="home-settings-desc" style="color:#b9770e">This browser does not provide Web Crypto, so records cannot be encrypted here. ' +
        'Use a current Chrome or Edge, and rely on full-disk encryption meanwhile.</div></div>';
    }

    if (state === "off") {
      return '<div class="home-settings" style="margin-top:8px">' +
        '<div class="home-settings-title">🔒 Record encryption — <span style="color:#c0392b">OFF</span></div>' +
        '<div class="home-settings-desc">Patient records are stored on this device <b>in the clear</b>. Anyone with the machine, or a copy of the browser profile, can read them. ' +
        'Turning encryption on scrambles patients, visits, the audit trail and accounts so they are unreadable without the clinic passphrase.' +
        '<br><br><b>You will be given a recovery code.</b> Write it down and keep it somewhere safe and separate — it is the only way back in if the passphrase is forgotten.</div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">' +
          '<input id="vaultNewPass" type="password" placeholder="new clinic passphrase (10+ chars)" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px;min-width:210px">' +
          '<input id="vaultNewPass2" type="password" placeholder="repeat" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
          '<button class="btn btn-p" style="font-size:.6rem" onclick="vaultUiEnable()">Turn on encryption</button>' +
        '</div>' +
        '<div id="vaultAdminMsg" class="home-settings-status"></div></div>';
    }

    /* enabled (unlocked, since an admin is signed in) */
    var meta = (typeof vaultMeta === "function") ? vaultMeta() : null;
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🔒 Record encryption — <span style="color:#2e7d46">ON</span></div>' +
      '<div class="home-settings-desc">Patients, visits, the audit trail and accounts are stored encrypted (AES-GCM-256) on this device' +
        (meta && meta.created ? ', since ' + _vue(String(meta.created).slice(0, 10)) : '') + '. ' +
        'They are unreadable without the clinic passphrase or the recovery code.' +
        '<br><span style="color:var(--sv)">This protects a lost or stolen device. It cannot protect a device that is switched on, unlocked and unattended — keep full-disk encryption and the idle lock on as well.</span></div>' +

      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">' +
        '<input id="vaultCurPass" type="password" placeholder="current passphrase" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
        '<input id="vaultNextPass" type="password" placeholder="new passphrase" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="vaultUiChangePass()">Change passphrase</button>' +
      '</div>' +
      '<div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px">' +
        '<input id="vaultRcPass" type="password" placeholder="passphrase" style="font-size:.62rem;padding:3px 6px;border:1px solid var(--fg);border-radius:2px">' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="vaultUiReissue()">Issue a new recovery code</button>' +
        '<button class="btn btn-s" style="font-size:.6rem" onclick="vaultUiDisable()">Turn encryption OFF…</button>' +
      '</div>' +
      '<div id="vaultAdminMsg" class="home-settings-status"></div></div>';
  };

  function vaultAdminMsg(text, colour) {
    var el = document.getElementById("vaultAdminMsg");
    if (el) { el.style.color = colour || "var(--sl)"; el.textContent = text; }
  }

  /* Show the recovery code and refuse to move on until it is acknowledged.
     A code the clinic never wrote down is the same as no code at all. */
  function vaultUiPresentRecovery(code) {
    var typed = window.prompt(
      "RECOVERY CODE — write this down NOW and store it somewhere safe,\n" +
      "separate from this device (a locked drawer, a password manager).\n\n" +
      "    " + code + "\n\n" +
      "If the clinic passphrase is ever forgotten, this code is the ONLY way\n" +
      "back into your patient records. Entopic cannot recover them without it.\n\n" +
      "Type YES to confirm you have written it down:", "");
    if (String(typed || "").trim().toUpperCase() !== "YES") {
      window.alert("Encryption is ON, but you did not confirm the recovery code.\n\n" +
        "Go to Admin → Record encryption → \"Issue a new recovery code\" and record it before " +
        "this device is used for patients.");
    }
  }

  window.vaultUiEnable = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var a = (document.getElementById("vaultNewPass") || {}).value || "";
    var b = (document.getElementById("vaultNewPass2") || {}).value || "";
    if (a !== b) { vaultAdminMsg("The two passphrases do not match.", "#c0392b"); return; }
    if (a.length < 10) { vaultAdminMsg("Choose a passphrase of at least 10 characters.", "#c0392b"); return; }
    if (!window.confirm(
      "Turn ON record encryption for this device?\n\n" +
      "• Patients, visits, the audit trail and accounts become unreadable without the passphrase.\n" +
      "• Everyone using this device will need the passphrase to unlock it at start-up.\n" +
      "• You will be shown a recovery code — write it down before continuing.\n\n" +
      "Your records are verified after encrypting; if anything fails, nothing is changed.")) return;

    vaultAdminMsg("Encrypting records… do not close this tab.", "var(--sl)");
    vaultEnable(a).then(function (res) {
      vaultUiPresentRecovery(res.recoveryCode);
      vaultAdminMsg("Encryption is ON.", "#2e7d46");
      if (typeof renderHome === "function") renderHome();
    }).catch(function (e) {
      vaultAdminMsg((e && e.message) || "Could not turn on encryption.", "#c0392b");
    });
  };

  window.vaultUiChangePass = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var cur = (document.getElementById("vaultCurPass") || {}).value || "";
    var next = (document.getElementById("vaultNextPass") || {}).value || "";
    vaultAdminMsg("Changing…", "var(--sl)");
    vaultChangePassphrase(cur, next).then(function () {
      vaultAdminMsg("Passphrase changed. Everyone using this device needs the new one.", "#2e7d46");
      if (typeof renderHome === "function") renderHome();
    }).catch(function (e) { vaultAdminMsg((e && e.message) || "Could not change it.", "#c0392b"); });
  };

  window.vaultUiReissue = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var p = (document.getElementById("vaultRcPass") || {}).value || "";
    if (!window.confirm("Issue a new recovery code?\n\nThe previous code will STOP working immediately.")) return;
    vaultAdminMsg("Issuing…", "var(--sl)");
    vaultRegenerateRecoveryCode(p).then(function (res) {
      vaultUiPresentRecovery(res.recoveryCode);
      vaultAdminMsg("A new recovery code was issued. The old one no longer works.", "#2e7d46");
    }).catch(function (e) { vaultAdminMsg((e && e.message) || "Could not issue a code.", "#c0392b"); });
  };

  window.vaultUiDisable = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return;
    var p = (document.getElementById("vaultRcPass") || {}).value || "";
    if (!p) { vaultAdminMsg("Enter the passphrase in the box on the left to turn encryption off.", "#c0392b"); return; }
    if (!window.confirm(
      "Turn record encryption OFF?\n\n" +
      "Patient records will be written back to this device IN THE CLEAR. " +
      "Anyone with the machine will be able to read them.\n\nContinue?")) return;
    vaultAdminMsg("Decrypting records…", "var(--sl)");
    vaultDisable(p).then(function () {
      vaultAdminMsg("Encryption is OFF. Records are stored in the clear again.", "#b9770e");
      if (typeof renderHome === "function") renderHome();
    }).catch(function (e) { vaultAdminMsg((e && e.message) || "Could not turn it off.", "#c0392b"); });
  };
}
