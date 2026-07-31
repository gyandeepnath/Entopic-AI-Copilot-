/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — GLOBAL ERROR BOUNDARY (DD finding H-4)                 */
/*                                                                  */
/* The app renders by replacing whole panels with innerHTML strings. */
/* Before this file there was no window.onerror and no try/catch     */
/* around the renderers: a single exception mid-exam left a blank or */
/* half-drawn panel with no recovery path and no telemetry — for a   */
/* tool a clinician leans on chairside, that is a reliability fault. */
/*                                                                  */
/* This installs:                                                   */
/*   • global error + unhandledrejection handlers that record the    */
/*     fault (a small in-memory ring buffer, surfaced to the admin)  */
/*     and show a NON-BLOCKING recovery banner — never an alert that  */
/*     traps the clinician;                                          */
/*   • defensive wrappers around the top-level render functions, so   */
/*     one bad render is caught, logged, and does not cascade. The    */
/*     working copy (V/P) is never discarded by the boundary, so the  */
/*     clinician's data survives the error.                          */
/*                                                                  */
/* Loaded LAST so it can wrap the render functions after they are    */
/* defined. It changes no behaviour on the happy path.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var ERR_LOG = [];            /* ring buffer of recent faults (memory only) */
var ERR_LOG_MAX = 25;
var ERR_MSG_MAX = 200;

/* ── Scrubbing ────────────────────────────────────────────────────
   An error message routinely quotes the value that caused it, and in this
   app that value is a patient record:

     Unexpected token in {"first_name":"Meera","dob":"1978-04-02",…}

   That string used to be written verbatim to logAudit, and the audit trail
   is exported with every backup — so a rendering bug copied PHI into a file
   that travels on a USB stick.

   The honest position: you cannot reliably DETECT personal data in free
   text, so this does not try to. It removes the STRUCTURES that carry a
   payload — objects, arrays, quoted values, long digit runs, and
   LETTERS-DIGITS identifiers like an MRN — and keeps the part that helps a
   developer: what failed and where. Anything it cannot classify is dropped
   by the length cap rather than kept on the optimistic reading.

   Defence in depth, not the primary control. The primary control is that
   the audit entry names the location and never carries a free-text payload
   the app did not construct itself. */
function errScrub(s) {
  var t = String((s === null || s === undefined) ? "" : s);
  t = t.replace(/\{[\s\S]*?\}/g, "{…}");            /* JSON-ish object payloads */
  t = t.replace(/\[[\s\S]*?\]/g, "[…]");            /* arrays */
  t = t.replace(/"[^"]*"/g, '"…"');                 /* quoted values */
  t = t.replace(/'[^']*'/g, "'…'");
  t = t.replace(/\b[A-Za-z]{2,}[-_]\d[\w-]*/g, "…");/* MRN-4471, EP-1A2B, id_9931 */
  t = t.replace(/\b\d{4}-\d{2}-\d{2}\b/g, "…");     /* dates of birth */
  t = t.replace(/\b[\d][\d\s().+-]{5,}\d\b/g, "…"); /* phone / long number runs */
  return t.slice(0, ERR_MSG_MAX);
}

function errRecord(where, err) {
  var raw = (err && (err.message || err.reason)) || err;
  var entry = {
    at: new Date().toISOString(),
    where: where || "unknown",
    /* Scrubbed in the in-memory log too: the admin fault list renders it, and
       a screenshot of that panel travels as easily as a backup does. */
    message: errScrub(raw === undefined || raw === null ? "error" : raw) || "error",
    /* The FRAMES are file/function/line and carry no patient data, so they are
       kept — they are the most useful thing for diagnosing a fault.

       But the first line of a V8 stack is "Error: <the message>", so keeping
       the stack whole re-leaked every value the scrub above had just removed.
       Drop that line: the message is already stored, scrubbed, beside it. */
    stack: (err && err.stack)
      ? String(err.stack).split("\n").slice(1, 5).map(errScrub).join(" | ").trim()
      : ""
  };
  ERR_LOG.push(entry);
  if (ERR_LOG.length > ERR_LOG_MAX) ERR_LOG.shift();
  try {
    if (typeof logAudit === "function") logAudit("app_error", entry.where + ": " + entry.message, {});
  } catch (e) {}
  return entry;
}

/* Recent faults, newest first — surfaced in the Admin panel so the state is
   visible rather than lost to the console. */
function errRecent() { return ERR_LOG.slice().reverse(); }

/* A dismissible banner. Deliberately not an alert(): a modal dialog mid-exam
   is itself a hazard. Says the data is safe, offers a reload. */
function errShowBanner(message) {
  try {
    if (typeof document === "undefined") return;
    var el = document.getElementById("errBoundaryBanner");
    if (!el) {
      el = document.createElement("div");
      el.id = "errBoundaryBanner";
      el.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:99999;" +
        "background:#4a1010;color:#fff;padding:10px 14px;border-radius:8px;max-width:520px;" +
        "font:400 .72rem/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.4)";
      document.body.appendChild(el);
    }
    /* escHtml (js/dom-escape.js), NOT a local replace(/[<>&]/g,"") — a private
       escaping implementation is exactly how the stored-XSS hole (R-1)
       happened. Scrubbed as well, since an error message can carry patient
       data and this banner is on screen in front of whoever is in the room. */
    el.innerHTML =
      '<b>Something went wrong on screen.</b> Your entered data is saved. ' +
      (message ? '<span style="opacity:.75">(' + escHtml(errScrub(message).slice(0, 120)) + ')</span> ' : "") +
      '<button onclick="location.reload()" style="margin-left:8px;background:#fff;color:#4a1010;border:0;' +
      'border-radius:5px;padding:3px 10px;font-weight:600;cursor:pointer">Reload</button>' +
      '<button onclick="this.parentNode.remove()" style="margin-left:6px;background:transparent;color:#fff;' +
      'border:1px solid rgba(255,255,255,.4);border-radius:5px;padding:3px 8px;cursor:pointer">Dismiss</button>';
    el.style.display = "block";
  } catch (e) { /* the boundary must never throw */ }
}

/* Run fn, catching and reporting any throw. Returns fn's value, or `fallback`
   on failure. Used to wrap renderers so a bad panel cannot cascade. */
function safeCall(fn, where, fallback) {
  try { return fn(); }
  catch (err) { errRecord(where, err); errShowBanner(err && err.message); return fallback; }
}

/* Wrap the top-level render entry points in place. Each keeps its own name and
   signature; on a throw it records the fault and returns safely instead of
   propagating. */
(function installRenderGuards() {
  if (typeof window === "undefined") return;
  var names = ["renderMain", "renderAdvisory", "renderSidebar", "renderHome",
               "renderExamHeader", "renderChart", "renderReport"];
  names.forEach(function (name) {
    var orig = window[name];
    if (typeof orig !== "function") return;
    window[name] = function () {
      var args = arguments, self = this;
      return safeCall(function () { return orig.apply(self, args); }, name, undefined);
    };
  });
})();

/* Global handlers — catch what the wrappers miss (async callbacks, timers). */
if (typeof window !== "undefined") {
  window.addEventListener("error", function (e) {
    errRecord("window.onerror", (e && (e.error || e.message)) || e);
    errShowBanner(e && (e.message || (e.error && e.error.message)));
  });
  window.addEventListener("unhandledrejection", function (e) {
    errRecord("unhandledrejection", (e && (e.reason)) || e);
    /* rejections are often benign (a failed optional fetch); log always, banner
       only when it looks like a real fault, to avoid crying wolf */
    var msg = (e && e.reason && (e.reason.message || String(e.reason))) || "";
    if (!/abort|network|Failed to fetch|401|timeout/i.test(msg)) errShowBanner(msg);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { safeCall: safeCall, errRecord: errRecord, errRecent: errRecent };
}
