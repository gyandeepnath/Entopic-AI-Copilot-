/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — HTML ESCAPING (the single canonical implementation)    */
/*                                                                  */
/* WHY THIS FILE EXISTS — a real bug, not tidiness.                 */
/*                                                                  */
/* `escH`/`esc` live in app.js, which is loaded LAST (everything     */
/* else depends on it, so it goes at the bottom). Seven UI modules   */
/* wanted to be defensive about that and wrote:                     */
/*                                                                  */
/*     var _e = (typeof escH === "function") ? escH : fallback;     */
/*                                                                  */
/* That line runs at MODULE LOAD time — before app.js exists — so    */
/* the check was always false and every one of them permanently      */
/* bound its inline fallback. The fallback escaped & < > but NOT     */
/* the double quote, and those modules interpolate names into HTML   */
/* ATTRIBUTES (data-name="…", onclick="fn('…')"). A knowledge-base   */
/* condition name containing a quote therefore broke out of the      */
/* attribute and injected a real one — verified in a browser, where  */
/* a crafted name produced a live `onmouseover` handler on the       */
/* element. Condition names arrive from the KB editor and from       */
/* published cloud KB bundles, so the input is not purely local.     */
/*                                                                  */
/* The defensive alias did not just duplicate an abstraction — it    */
/* silently replaced the correct one with a weaker one. The fix is   */
/* one implementation, loaded BEFORE its consumers, with no          */
/* fallback to drift from.                                          */
/*                                                                  */
/* SEMANTICS (deliberately identical to the old escH/esc, so this    */
/* is a pure bug-fix and not a behaviour change):                    */
/*   &  <  >  "   are escaped.                                       */
/*   '  is NOT escaped — on purpose. Many call sites build           */
/*   onclick="fn('…')" and do their own .replace(/'/g,"\\'") to      */
/*   escape the quote for the JavaScript string. Emitting &#39;      */
/*   here would be decoded by the HTML parser before JS ever saw it, */
/*   turning a defence into a new injection. Attribute-safety for    */
/*   single quotes belongs to those call sites (and better still, to */
/*   replacing inline handlers with delegated listeners — tracked    */
/*   separately as the CSP 'unsafe-inline' item).                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Escape a string that is about to be embedded inside a single-quoted
   JavaScript string inside an HTML attribute — the onclick="fn('…')"
   pattern used throughout the UI. Escapes the JS string delimiters and
   backslash first, then the HTML metacharacters, in that order (doing it
   the other way round would escape the backslashes we just added).

   New call sites should prefer this over hand-rolled
   `escHtml(x).replace(/'/g, "\\'")`, which is easy to get subtly wrong. */
function escAttrJs(s) {
  return escHtml(String(s == null ? "" : s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'"));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { escHtml: escHtml, escAttrJs: escAttrJs };
}
