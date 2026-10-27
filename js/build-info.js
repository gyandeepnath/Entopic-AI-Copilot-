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

/* 1.5.0 / 1.3.1 (2026-08-01) stood unchanged through two full audits' worth of
   fixes, because CI enforces the bump only on pull requests and none were
   opened — so a clinic on August's build and one on today's reported the same
   version. Bumped 2026-10-27: 1.6.0 for the app; KB 1.4.0 for the engine-
   failure red-flag rules added to knowledge/red-flags.js on 2026-09-24 (no
   condition content changed, so no sign-off goes stale — staleness follows
   each condition's content fingerprint, not this number). */
var APP_VERSION = "1.6.0";
var KB_VERSION = "1.4.0";
var BUILD_COMMIT = "dev";
var BUILD_DATE = "2026-10-27";

/* ONE knowledge-base version. knowledge/loader.js kept its own KB_META.version
   ("1.1.0", July) that nothing bumped, while KB_VERSION here moved on. The
   engine stamps KB_META.version into every visit's provenance, so every visit
   since July claimed KB 1.1.0 and a replay could never show that the KB had
   changed; and the cloud-update check compared a published bundle against
   1.1.0, so an OLDER bundle numbered 1.2.0 would have replaced this newer one
   (second full audit, 2026-10-27). KB_VERSION — the number CI makes us bump —
   is now the one in force, unless a cloud update has replaced the bundled KB. */
if (typeof KB_META !== "undefined" && KB_META && KB_META.source === "bundled") {
  KB_META.version = KB_VERSION;
  KB_META.date = BUILD_DATE;
}

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
