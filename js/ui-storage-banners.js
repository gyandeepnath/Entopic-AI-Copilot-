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
