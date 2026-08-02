/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — BUILD IDENTITY                                        */
/*                                                                  */
/* WHY THIS EXISTS                                                  */
/*                                                                  */
/* Entopic ships as static files that a clinic loads and then runs  */
/* offline for days. There is no server to ask "which version is    */
/* this clinic on?" — the answer lives only on their device. Until  */
/* this file, the answer did not exist at all: nothing in the app   */
/* recorded which build it was, KB_VERSION was referenced in two    */
/* places and defined in none, and a support call began with an     */
/* unanswerable question.                                           */
/*                                                                  */
/* For a nationally deployed client-side app that is the single     */
/* most important operational fact. Every other diagnosis depends   */
/* on it: whether a clinic has the fix, whether two clinics         */
/* disagreeing are even running the same logic, whether a rollback  */
/* actually reached anyone.                                         */
/*                                                                  */
/* HOW IT IS MAINTAINED                                             */
/*                                                                  */
/* There is no build step (deliberately — it keeps the app openable */
/* from a file:// URL on a clinic laptop), so these values are      */
/* committed by hand and checked by CI:                             */
/*                                                                  */
/*   - APP_VERSION must change whenever js/ or index.html changes   */
/*   - KB_VERSION must change whenever knowledge/ changes           */
/*                                                                  */
/* Both are semver. KB_VERSION is separate because the knowledge    */
/* base can be updated independently of the application, and a      */
/* clinician needs to know which KB their sign-offs were made       */
/* against (see js/kb-signoffs.js).                                 */
/*                                                                  */
/* BUILD_COMMIT is filled in by the release process. It stays       */
/* "dev" in a working tree, which is itself useful information: a   */
/* clinic reporting "dev" is running an unreleased build.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var APP_VERSION = "1.5.0";
var KB_VERSION = "1.3.1";
var BUILD_COMMIT = "dev";
var BUILD_DATE = "2026-08-01";

/* One string for a support call, a bug report, or an error banner.
   Deliberately contains no patient data and no device identifier — it is
   safe to read aloud over the phone or paste into an e-mail. */
function buildLabel() {
  return "Entopic " + APP_VERSION + " · KB " + KB_VERSION +
         " · " + BUILD_COMMIT + " · " + BUILD_DATE;
}

/* Structured form for the deployment panel and for diagnostics. */
function buildInfo() {
  return {
    app_version: APP_VERSION,
    kb_version: KB_VERSION,
    commit: BUILD_COMMIT,
    built: BUILD_DATE,
    released: BUILD_COMMIT !== "dev",
    /* What the browser is, without anything that identifies a person.
       Genuinely needed: half the failure reports in this app are
       browser-specific (IndexedDB absent, Web Crypto absent on http://). */
    ua: (typeof navigator !== "undefined" && navigator.userAgent)
      ? String(navigator.userAgent).slice(0, 160) : "",
    offline_capable: (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL.length > 0),
    kb_conditions: (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.length : 0
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    APP_VERSION: APP_VERSION, KB_VERSION: KB_VERSION,
    BUILD_COMMIT: BUILD_COMMIT, BUILD_DATE: BUILD_DATE,
    buildLabel: buildLabel, buildInfo: buildInfo
  };
}
