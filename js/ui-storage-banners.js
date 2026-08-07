/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — STORAGE ALERT BANNERS                                 */
/*                                                                  */
/* The three things the storage layer can discover that a clinician */
/* must be told about immediately:                                  */
/*                                                                  */
/*   storage:write-failed   this device has stopped saving          */
/*   storage:corrupt        this device cannot READ what it has     */
/*   visit:conflict         another window saved this visit too     */
/*                                                                  */
/* This code used to live inside storage.js, which meant the        */
/* persistence layer built DOM nodes and wrote copy. Storage now    */
/* emits a fact and this module decides how to say it.              */
/*                                                                  */
/* Every one of these is a STICKY banner rather than an alert().    */
/* An alert is dismissed reflexively mid-consultation and then the  */
/* clinician carries on believing records are saving. Only the      */
/* conflict notice is dismissible, because it reports something     */
/* that already resolved safely.                                    */
/*                                                                  */
/* Load order: after events.js and after dom-escape.js. Subscribes  */
/* at load, so it must be loaded for the banners to appear at all — */
/* tests/architecture.test.js checks every <script src> resolves.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

(function () {
  /* Node/test harnesses load this file without a DOM. Nothing to subscribe. */
  if (typeof document === "undefined" || !document.createElement) return;
  if (typeof evOn !== "function") return;

  function banner(id, css) {
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement("div");
      el.id = id;
      el.setAttribute("role", "alert");
      el.style.cssText = css;
      document.body.appendChild(el);
    }
    return el;
  }

  function removeBanner(id) {
    var el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  /* ── The save indicator ──
     Moved out of doSave() in storage.js, which used to reach into the DOM by
     element id to flash it. */
  evOn("visit:saved", function () {
    var el = document.getElementById("saveInd");
    if (!el) return;
    el.classList.add("show");
    setTimeout(function () { el.classList.remove("show"); }, 1200);
  });

  /* ── The save did NOT happen (backend audit BE-1) ──
     The counterpart of the indicator above, and the more important half. The
     app used to flash "saved" whatever the storage layer said, so a clinician
     working on a device whose writes were blocked was actively reassured. A
     persistent banner, not a toast: this does not go away by itself because
     the condition does not go away by itself. */
  evOn("visit:save-failed", function (ev) {
    var el = banner("visitSaveFailBanner",
      "position:fixed;left:0;right:0;bottom:0;z-index:10000;" +
      "background:#8a2318;color:#fff;padding:10px 14px;font-size:.72rem;line-height:1.45;" +
      "box-shadow:0 -2px 10px rgba(0,0,0,.25)");
    /* escHtml, not a private copy: a second escaper drifts from the first and
       weakens silently. js/dom-escape.js is the only one. */
    var why = (typeof escHtml === "function")
      ? escHtml(String((ev && ev.reason) || "the record store refused the write"))
      : "";
    el.innerHTML =
      '<b>THIS VISIT IS NOT BEING SAVED.</b> ' + why + '.<br>' +
      'Everything you type from now on is held only in this browser tab and will be lost if ' +
      'it closes. <b>Export a backup now</b> (Account → Data), then reload. Your existing ' +
      'records have not been altered — the write was refused precisely so they could not be.';
  });

  /* Writes are working again — the only thing that clears the banner. */
  evOn("visit:saved", function () { removeBanner("visitSaveFailBanner"); });

  /* ── A visit could not be marked complete ── */
  evOn("visit:complete-failed", function (ev) {
    if (typeof alert !== "function") return;
    alert("This visit was NOT marked complete.\n\n" +
      ((ev && ev.reason) || "the record store refused the write") + ".\n\n" +
      "It has been left in progress deliberately: a visit signed off as finished, whose data " +
      "did not save, is a worse record than an unfinished one. Export a backup, fix the " +
      "storage problem, then complete it.");
  });

  /* ── An on-device snapshot was taken (backend audit BE-18) ──
     Silent by design. This is housekeeping, not news, and a clinic that is
     told about its backups every morning stops reading the messages that
     matter. It is recorded so the health panel can show it. */
  evOn("backup:snapshot", function (ev) {
    if (typeof console !== "undefined" && console.info) {
      console.info("Entopic: on-device snapshot taken (" + ((ev && ev.bytes) || 0) + " bytes).");
    }
  });

  /* ── No OFF-DEVICE copy for a week or more ──
     The one backup message worth interrupting for. A snapshot on this device
     protects against a bad write; it protects against nothing at all if the
     device is lost, stolen or dropped, and that distinction is the whole
     reason this banner exists rather than a reassuring green tick. */
  evOn("backup:export-stale", function (ev) {
    var days = ev && ev.days;
    var el = banner("backupStaleBanner",
      "position:fixed;left:0;right:0;bottom:0;z-index:9998;" +
      "background:#8a6d18;color:#fff;padding:9px 14px;font-size:.7rem;line-height:1.45;" +
      "box-shadow:0 -2px 10px rgba(0,0,0,.2)");
    el.innerHTML =
      '<b>No backup has left this device' +
      (days === null || days === undefined ? ' — ever' : ' for ' + days + ' days') + '.</b> ' +
      'Automatic snapshots are being kept here, and they survive a bad write or a mistaken ' +
      'deletion — they do <b>not</b> survive this device being lost, stolen or broken. ' +
      'Account → Data → <b>Export all</b>, and put the file somewhere else. ' +
      '<span style="cursor:pointer;text-decoration:underline" onclick="this.closest(\'div\').remove()">Dismiss for now</span>';
  });

  /* ── Sync brought in changes from another device ──
     cloud-sync.js used to call renderHome() by name, which made the
     synchronisation layer depend on a specific screen of the UI. It now says
     what happened and this decides what to repaint. Home is repainted only
     when it is the page actually on screen. */
  evOn("sync:applied", function () {
    var home = document.getElementById("pgHome");
    if (home && home.classList.contains("active") && typeof renderHome === "function") renderHome();
  });

  /* ── This device has stopped saving ── */
  evOn("storage:write-failed", function (state) {
    var el = banner("storageFailBanner",
      "position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
      "background:#8a2318;color:#fff;padding:10px 14px;font-size:.72rem;line-height:1.45;" +
      "box-shadow:0 -2px 10px rgba(0,0,0,.25)");
    var full = state && state.reason === "quota";
    el.innerHTML =
      '<b>⚠ THIS DEVICE HAS STOPPED SAVING RECORDS.</b> ' +
      (full
        ? 'Its local storage is full. Work you do now may not be kept. '
        : 'A save failed (' + escHtml(state && state.reason) + '). ') +
      'Your existing records are intact, and this device keeps a second copy, but ' +
      '<b>do not continue seeing patients on this device until it is resolved</b>.' +
      '<br>Fix now: Admin → Backup (download a backup), then connect cloud sync or archive older records. ' +
      'This message clears itself once saving works again.';
  });

  evOn("storage:write-ok", function () {
    removeBanner("storageFailBanner");
  });

  /* ── Another window saved this visit ──
     The other version is preserved on the record, so this is information,
     not an error — but the clinician must know two people were writing, or
     they will not know to check what the other one entered. */
  evOn("visit:conflict", function (conflict) {
    var el = banner("visitConflictBanner",
      "position:fixed;left:0;right:0;top:0;z-index:9998;" +
      "background:#b9770e;color:#fff;padding:9px 14px;font-size:.7rem;line-height:1.45;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.22)");
    el.onclick = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    el.innerHTML =
      '<b>Another window saved this visit while you had it open</b> (' +
      escHtml(conflict && conflict.by) + '). Your save went through, and ' +
      '<b>their version was kept on the record</b> rather than discarded — ' +
      'but check the exam for anything they entered that is not showing here. ' +
      '<span style="opacity:.8">(Tap to dismiss.)</span>';
  });

  /* ── This device cannot READ what it has ──
     A different and worse failure than "cannot write". Reading zero patients
     must never be allowed to look like a clinic that has zero patients, so
     this one is sticky, red, and says stop. */
  evOn("storage:corrupt", function (ev) {
    var key = ev && ev.key;
    var info = ev && ev.info;
    var el = banner("storageCorruptBanner",
      "position:fixed;left:0;right:0;top:0;z-index:10000;" +
      "background:#6b0f0f;color:#fff;padding:10px 14px;font-size:.72rem;line-height:1.45;" +
      "box-shadow:0 2px 10px rgba(0,0,0,.3)");
    var friendly = { patients: "patient list", visits: "visit records",
                     users: "user accounts", audit: "access log",
                     consents: "consent ledger", feedback: "feedback reports" }[key] || key;
    el.innerHTML =
      '<b>⚠ THIS DEVICE CANNOT READ ITS ' + escHtml(String(friendly).toUpperCase()) + '.</b> ' +
      'The stored data is damaged (' + escHtml(info && info.reason) + '), so the app is showing ' +
      'none of it. <b>What you see is not what is on this device.</b>' +
      '<br>Writing to it has been blocked so the damaged data cannot be overwritten — ' +
      'it may still be recoverable' +
      (info && info.quarantine ? ' (a copy was kept)' : '') + '.' +
      '<br><b>Do not see patients on this device.</b> Restore from your most recent backup, ' +
      'or from another device, before continuing.';
  });
})();
