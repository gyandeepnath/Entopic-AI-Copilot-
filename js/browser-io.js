/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — BROWSER I/O PRIMITIVES                                */
/*                                                                  */
/* Two things every module needs and four modules had each grown    */
/* their own slightly-different copy of: "save this to a file" and  */
/* "write this to localStorage".                                    */
/*                                                                  */
/* WHY THIS FILE EXISTS (AI-generated-code review, 2026-07-31):     */
/*                                                                  */
/* There were FOUR near-identical download helpers — in             */
/* data-export.js, kb-review.js, storage.js and ui-age-brackets.js  */
/* — written in four different sessions. Each was correct-looking   */
/* but they had drifted: one revoked the object URL synchronously,  */
/* one after 1s, two after 2s; one never attached the anchor to the */
/* document; only one logged an audit entry. Nothing was shared, so */
/* nothing could be fixed in one place.                             */
/*                                                                  */
/* Separately, 18 localStorage.setItem calls were wrapped in a bare */
/* `try { ... } catch (e) {}`. A silent write failure is exactly    */
/* the P-1 defect already fixed for the main record store: the app  */
/* reports success while the data is gone. lsSet() returns a        */
/* boolean and routes failures into the SAME banner the record      */
/* store uses, so one storage ceiling produces one visible warning. */
/*                                                                  */
/* Loaded second, right after dom-escape.js, so every later module  */
/* can rely on it. Its one cross-module reference                   */
/* (storageNoteWriteFailure, defined in storage.js) is covered by   */
/* tests/generated-patterns.test.js, which fails if the name is     */
/* ever renamed or removed.                                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── localStorage ────────────────────────────────────────────────
   Reads never throw: a blocked or full store reads as "not there",
   which every caller already handles. Writes DO report failure —
   that is the whole point. */

function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

/* Returns true if the value is actually on disk, false if it is not.
   Callers that hold clinical data must check the result. */
function lsSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
    if (typeof storageNoteWriteOk === "function") storageNoteWriteOk(key);
    return true;
  } catch (e) {
    var reason = (e && e.name === "QuotaExceededError")
      ? "This device's local storage is full."
      : ((e && e.message) || "Could not write to local storage.");
    if (typeof storageNoteWriteFailure === "function") storageNoteWriteFailure(key, reason);
    return false;
  }
}

function lsRemove(key) {
  try { localStorage.removeItem(key); return true; } catch (e) { return false; }
}


/* ── File download ───────────────────────────────────────────────
   One implementation. `content` may be a string or a Blob.
   The anchor is attached to the document before clicking (Firefox
   has historically ignored clicks on detached anchors) and the
   object URL is revoked on a timer, never synchronously — a
   synchronous revoke can race the download in some browsers. */

function dlSaveAs(filename, content, mime) {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  var blob;
  try {
    blob = (typeof Blob !== "undefined" && content instanceof Blob)
      ? content
      : new Blob([content], { type: (mime || "text/plain") + ";charset=utf-8" });
  } catch (e) { return false; }

  var url = URL.createObjectURL(blob);
  try {
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } catch (e) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  return true;
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = { lsGet: lsGet, lsSet: lsSet, lsRemove: lsRemove, dlSaveAs: dlSaveAs };
}
