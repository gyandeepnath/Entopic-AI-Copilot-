/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE — STAGE 8: EXCLUSION RULES                               */
/*                                                                  */
/* Removes conditions that are clinically incompatible with the     */
/* current presentation: when a condition scores high enough to be  */
/* taken seriously, the things IT rules out come off the list.      */
/*                                                                  */
/* Split out of js/engine.js (2026-08-08). Two reasons, in order:   */
/*                                                                  */
/*  1. This is the only stage of the pipeline that DELETES a        */
/*     clinical possibility, and it did so wrongly — a single stray */
/*     property on Object.prototype turned every lookup below into  */
/*     a match, and a differential of 4 correct conditions came     */
/*     back as 1 unrelated one, with no error raised anywhere       */
/*     (tools/stress/attack.js, attack E7). A stage that can remove */
/*     a diagnosis deserves its own file, its own tests, and to be  */
/*     readable end to end without scrolling through 2,300 lines.   */
/*                                                                  */
/*  2. engine.js was at its complexity cap. Shaving the comments    */
/*     that explain the above until it fit would have been the      */
/*     wrong trade.                                                 */
/*                                                                  */
/* Load order: after knowledge/loader.js (reads KB_EXCLUSION_MAP)   */
/* and before js/engine.js, which calls applyExclusions().          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Exclusion strings are snake_case ("acute_angle_closure") while condition
   names are display strings ("Acute Angle Closure Crisis"). Normalise both
   sides before comparing — a raw substring comparison between the two formats
   never matches, so every exclusion rule would silently do nothing. */
function _exclNormName(name) {
  return String(name).toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/* ── DEMOTE, NEVER DELETE (second engine audit, 2026-10-27) ──────────
   An exclusion used to REMOVE its targets outright, whatever their own
   evidence. Matching is by name fragment, so the reach was wide: Allergic
   Conjunctivitis "excludes" 24 conditions containing "keratitis" or "uveitis",
   Acute Anterior Uveitis among them. Measured on the real engine, 12 fully
   presented conditions vanished this way — a fourth-nerve palsy scoring 0.81
   was deleted because Convergence Insufficiency scored 0.5.

   A patient can have two things at once; that is what the problem-foci view
   is for. So an exclusion now says what its author meant — "if A is the
   explanation, B is LESS LIKELY":
     - the target is DEMOTED (score × exclusion_demote_factor) and labelled
       with the condition that argued against it, never removed;
     - only a condition that is BETTER supported than the target can argue
       against it — a weaker one is not the leading explanation;
     - a target with ALL its required findings present is established and is
       not touched — exclusions prune speculative candidates only;
     - urgent conditions are never touched (unchanged). */
function applyExclusions(results, tokens) {
  /* Condition names that scored high enough for their exclusions to apply.

     Object.create(null), not {}. This map is keyed by condition NAME —
     clinician-authored conditions included — and is read below with `for...in`
     and a lookup into KB_EXCLUSION_MAP. With a plain object, every property of
     Object.prototype answered both. One stray global (`Object.prototype.x =
     "yes"` — a sloppy script, a polyfill, a browser extension) made
     KB_EXCLUSION_MAP[anything] return "yes"; the loop below then read that
     string's CHARACTERS as exclusion names and struck out every condition
     whose name contained the letter "e".

     Same clinical input, different differential, nothing thrown, nothing
     logged. See kbMap() in knowledge/loader.js for the same fix applied to
     the knowledge indexes. */
  var highScorers = Object.create(null);
  for (var i = 0; i < results.length; i++) {
    if (results[i].score >= scoreThreshold("exclusion_high_scorer", 0.5)) {
      highScorers[results[i].name] = results[i].score;
    }
  }
  var demote = scoreThreshold("exclusion_demote_factor", 0.5);

  /* Decide every demotion against the ORIGINAL scores first, then apply —
     so the outcome cannot depend on the order the results arrived in. */
  var decided = [];
  for (var k = 0; k < results.length; k++) {
    var r = results[k];
    /* SAFETY: urgent conditions are never touched by exclusion logic.
       A high-scoring chronic condition must not hide an emergency from the
       differential. Red flags stay visible; the clinician decides. */
    if (r.urgent) continue;
    /* A condition whose required findings are ALL present is established on
       its own evidence: exclusions prune speculative candidates, they do not
       overrule one. Halving a complete fourth-nerve palsy (0.82) because
       Convergence Insufficiency scored 0.87 still pushed it off the shown list
       — that is suppression by a different route. Two established conditions
       are two problems, ranked by their evidence. */
    if (r._scoreDetail && r._scoreDetail.reqMissing === 0 && r._scoreDetail.reqMatched > 0) continue;

    var rNorm = _exclNormName(r.name);
    var by = null, byScore = -1;

    for (var condName in highScorers) {
      if (condName === r.name) continue;   /* a condition never excludes itself */
      /* Only a better-supported condition can argue against this one. */
      if (!(highScorers[condName] > r.score)) continue;

      /* Array.isArray, not truthiness. An exclusion rule is a LIST of
         condition names; anything else reaching here is not a rule and must
         not be indexed into as though it were. */
      var exclusions = (typeof KB_EXCLUSION_MAP !== "undefined")
        ? KB_EXCLUSION_MAP[condName] : null;
      if (!Array.isArray(exclusions)) continue;

      for (var ei = 0; ei < exclusions.length; ei++) {
        /* Normalised substring match: "acute_angle_closure" matches
           "acute_angle_closure_crisis".

           An entry that normalises to nothing ("", " ", "-") is skipped: every
           name contains the empty string, so one such entry would have caught
           EVERY non-urgent condition (second full audit, 2026-10-27). */
        var exNorm = _exclNormName(exclusions[ei]);
        if (!exNorm) continue;
        if (rNorm.indexOf(exNorm) >= 0) {
          if (highScorers[condName] > byScore) { by = condName; byScore = highScorers[condName]; }
          break;
        }
      }
    }
    if (by) decided.push({ r: r, by: by });
  }

  /* Once, by the strongest objector — two exclusions do not stack. */
  for (var d = 0; d < decided.length; d++) {
    decided[d].r.score = decided[d].r.score * demote;
    decided[d].r._excludedBy = decided[d].by;
  }
  return results;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { applyExclusions: applyExclusions };
}
