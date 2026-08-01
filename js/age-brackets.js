/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — AGE BRACKET OVERRIDES (persistence)                   */
/*                                                                  */
/* Several conditions in the knowledge base still carry the         */
/* deprecated `young_age` token. knowledge/age-classification.js    */
/* holds a SUGGESTION for each; the founder confirms or corrects it */
/* one condition at a time, and those decisions are stored here.    */
/*                                                                  */
/* This is clinical judgement work, not configuration. It is        */
/* irreplaceable in the same way sign-offs are: nobody but the      */
/* founder can regenerate it. Until 2026-08-01 it was written       */
/* straight to a raw localStorage key from inside knowledge/, which */
/* meant no corruption check, no mirror, no backup, and a silently  */
/* swallowed write failure. It now goes through saveStore like      */
/* every other clinical store, and is declared in                   */
/* js/data-classification.js as mirrored and backed up.             */
/*                                                                  */
/* Load order: after storage.js (needs loadStore/saveStore) and     */
/* after knowledge/age-classification.js (reads KB_AGE_BRACKET).    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var AGE_BRACKET_STORE = "age_brackets";
/* The pre-2026-08-01 raw key. Read once, then migrated. */
var AGE_BRACKET_LEGACY_KEY = "entopic_age_brackets";

var _ageBracketMigrated = false;

/* Move any overrides written under the old raw key into the managed store.
   Runs at most once per session, and only ever ADDS: if a name exists in
   both, the managed store wins, because that is the one the founder has been
   editing since. The legacy key is left in place rather than deleted — it
   costs a few hundred bytes and it is the only copy if this goes wrong. */
function ageBracketMigrateLegacy() {
  if (_ageBracketMigrated) return;
  _ageBracketMigrated = true;
  if (typeof localStorage === "undefined" || typeof saveStore !== "function") return;
  var raw;
  try { raw = localStorage.getItem(AGE_BRACKET_LEGACY_KEY); } catch (e) { return; }
  if (!raw) return;

  var legacy;
  try { legacy = JSON.parse(raw); } catch (e) { return; }
  if (!legacy || typeof legacy !== "object" || Array.isArray(legacy)) return;

  var current = loadStore(AGE_BRACKET_STORE, {}) || {};
  var added = 0;
  for (var name in legacy) {
    if (!Object.prototype.hasOwnProperty.call(legacy, name)) continue;
    if (current[name]) continue;
    current[name] = legacy[name];
    added++;
  }
  if (added) {
    saveStore(AGE_BRACKET_STORE, current);
    if (typeof logAudit === "function") {
      try {
        logAudit("age_brackets_migrated",
          "Moved " + added + " age-bracket override(s) into the protected store.", {});
      } catch (e) {}
    }
  }
}

function ageBracketOverrides() {
  if (typeof loadStore !== "function") return {};
  ageBracketMigrateLegacy();
  var o = loadStore(AGE_BRACKET_STORE, {});
  return (o && typeof o === "object" && !Array.isArray(o)) ? o : {};
}

/* Record a decision, and put it into effect.
   Returns false if the write did not stick, so the caller can say so rather
   than showing the founder a decision that was never saved.

   Applying is done HERE rather than left to the caller. A browser probe found
   the decision being stored correctly and never reaching the engine, because
   only the admin screen remembered to re-apply — so a decision recorded any
   other way (a restore, a sync, a future screen) would have been silently
   inert. Storing a clinical decision and acting on it are one operation. */
function ageBracketSet(conditionName, token) {
  if (typeof saveStore !== "function") return false;
  var o = ageBracketOverrides();
  if (token) o[conditionName] = token; else delete o[conditionName];
  if (saveStore(AGE_BRACKET_STORE, o) === false) return false;
  ageBracketApplyAll();
  return true;
}

/* The bracket in force for a condition: founder override, then suggestion,
   then nothing (condition keeps `young_age` and its exact old behaviour). */
function ageBracketFor(conditionName) {
  var o = ageBracketOverrides();
  if (o[conditionName]) return o[conditionName];
  return (typeof KB_AGE_BRACKET !== "undefined" && KB_AGE_BRACKET[conditionName]) || "";
}

/* Overlay the founder's confirmed brackets onto the assembled knowledge base.
   knowledge/loader.js has already applied the SUGGESTED bracket to every
   condition; it runs before this file, so it cannot see the overrides. This
   is the second pass that upgrades confirmed conditions from provisional to
   verified, and it is why applyAgeBracket is written to be idempotent.

   Runs on load, and again after a restore or a KB update swaps KNOWLEDGE_ALL. */
function ageBracketApplyAll() {
  if (typeof KNOWLEDGE_ALL === "undefined" || !KNOWLEDGE_ALL.length) return 0;
  if (typeof applyAgeBracket !== "function") return 0;
  var o = ageBracketOverrides();
  var n = 0;
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    applyAgeBracket(KNOWLEDGE_ALL[i], o);
    if (KNOWLEDGE_ALL[i].age_bracket_status === "VERIFIED_BY_CLINICIAN") n++;
  }
  return n;
}

/* Browser only: in Node the module is required for its functions, and the
   KB may not be assembled at all. */
if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
  try { ageBracketApplyAll(); } catch (e) {
    try { console.error("Entopic: could not apply age-bracket overrides.", e); } catch (e2) {}
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AGE_BRACKET_STORE: AGE_BRACKET_STORE,
    ageBracketApplyAll: ageBracketApplyAll,
    AGE_BRACKET_LEGACY_KEY: AGE_BRACKET_LEGACY_KEY,
    ageBracketOverrides: ageBracketOverrides,
    ageBracketSet: ageBracketSet,
    ageBracketFor: ageBracketFor,
    ageBracketMigrateLegacy: ageBracketMigrateLegacy
  };
}
