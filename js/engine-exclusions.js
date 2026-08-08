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
      highScorers[results[i].name] = true;
    }
  }

  return results.filter(function (r) {
    /* SAFETY: urgent conditions are never suppressed by exclusion logic.
       A high-scoring chronic condition must not hide an emergency from the
       differential. Red flags stay visible; the clinician decides. */
    if (r.urgent) return true;

    var rNorm = _exclNormName(r.name);

    for (var condName in highScorers) {
      if (condName === r.name) continue;   /* a condition never excludes itself */

      /* Array.isArray, not truthiness. An exclusion rule is a LIST of
         condition names; anything else reaching here is not a rule and must
         not be indexed into as though it were. */
      var exclusions = (typeof KB_EXCLUSION_MAP !== "undefined")
        ? KB_EXCLUSION_MAP[condName] : null;
      if (!Array.isArray(exclusions)) continue;

      for (var ei = 0; ei < exclusions.length; ei++) {
        /* Normalised substring match: "acute_angle_closure" matches
           "acute_angle_closure_crisis". */
        if (rNorm.indexOf(_exclNormName(exclusions[ei])) >= 0) {
          r._excludedBy = condName;
          return false;
        }
      }
    }
    return true;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { applyExclusions: applyExclusions };
}
