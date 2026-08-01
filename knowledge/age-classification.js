/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — AGE BRACKET CLASSIFICATION                             */
/*                                                                  */
/* The knowledge base had ONE token for "young": `young_age`, which  */
/* the engine defines as **under 18**. That is a paediatric bracket, */
/* and a large number of conditions were using it where a YOUNG      */
/* ADULT is what the clinician means. The simulator made the problem */
/* visible by generating optic neuritis in a five-year-old.          */
/*                                                                  */
/* Three brackets now exist (rules in js/engine.js):                 */
/*                                                                  */
/*     paediatric_age     age < 18                                   */
/*     young_adult_age    18 <= age < 40                             */
/*     young_age          age < 18   (UNCHANGED — deprecated)        */
/*                                                                  */
/* `young_age` keeps its old rule exactly, so any condition not yet  */
/* reclassified behaves precisely as it did before. There is no      */
/* silent change to a single differential.                           */
/*                                                                  */
/* ── WHO DECIDES ────────────────────────────────────────────────── */
/* Which bracket a condition belongs to is a CLINICAL judgement and  */
/* belongs to the founder, not to this file. So:                     */
/*                                                                  */
/*   • The list below covers only conditions whose NAME literally    */
/*     states that they present in infancy or childhood (congenital, */
/*     infantile, neonatorum, of prematurity, juvenile, amblyopia).  */
/*     Even these are SUGGESTIONS carrying NEEDS_CLINICAL_REVIEW,    */
/*     changeable in one click from the Age Brackets review screen.  */
/*   • Everything else keeps `young_age` and appears in that screen  */
/*     for the founder to classify. Nothing is guessed.              */
/*                                                                   */
/* Deliberately NOT auto-classified, as examples of why this is not  */
/* a text-matching job:                                              */
/*   - Congenital Hypertrophy of the RPE (CHRPE): congenital by      */
/*     name, but a lifelong lesion found at any age.                 */
/*   - Keratoconus, Optic Neuritis, Idiopathic Intracranial          */
/*     Hypertension: widely taught as young-adult presentations, but */
/*     that is an epidemiological claim and is the founder's to make.*/
/*                                                                   */
/* Founder edits made in the review screen are stored locally and    */
/* replay AFTER this file, so they always win.                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* condition name -> bracket token that should replace `young_age` */
var KB_AGE_BRACKET = {
  /* Name states presentation at birth or in infancy */
  "Nasolacrimal Duct Obstruction (Congenital)":                "paediatric_age",
  "Ophthalmia Neonatorum":                                     "paediatric_age",
  "Congenital Ptosis":                                         "paediatric_age",
  "Congenital Hereditary Endothelial Dystrophy (CHED)":        "paediatric_age",
  "Retinopathy of Prematurity (Cicatricial)":                  "paediatric_age",
  "Leber Congenital Amaurosis":                                "paediatric_age",
  "Infantile (Congenital) Nystagmus":                          "paediatric_age",
  "Infantile (Congenital) Esotropia":                          "paediatric_age",
  "Congenital Cataract":                                       "paediatric_age",
  "Primary Congenital Glaucoma":                               "paediatric_age",

  /* Name states a juvenile form */
  "Juvenile Open Angle Glaucoma":                              "paediatric_age",
  "Juvenile Idiopathic Arthritis (JIA) Uveitis":               "paediatric_age",

  /* Amblyopia is a disorder of visual development, i.e. of childhood */
  "Amblyopia (Refractive)":                                    "paediatric_age",
  "Strabismic Amblyopia":                                      "paediatric_age",
  "Anisometropic Amblyopia":                                   "paediatric_age"
};

/* The founder's overrides used to be read and written HERE, straight to
   localStorage under a raw key. That was wrong twice over:

     - knowledge/ is meant to be clinical content, not a layer that persists
       anything. A pure data file had grown an I/O dependency, which is why it
       was the one knowledge file that could not be loaded in a test without a
       localStorage stub.
     - Going straight to localStorage bypassed saveStore, so these overrides had NONE
       of its protection: no corruption check, no mirror, no backup, and a
       failed write was swallowed silently. The founder's clinical
       classification work was one cleared browser away from gone.

   Persistence now lives in js/age-brackets.js and goes through the normal
   store, with `age_brackets` declared in js/data-classification.js.
   This file keeps only what it should have kept: the suggestion table and
   the query for outstanding work. */

/* Every condition still carrying the deprecated token, i.e. the founder's
   outstanding classification work. */
function ageBracketPending() {
  if (typeof KNOWLEDGE_ALL === "undefined") return [];
  return KNOWLEDGE_ALL.filter(function (c) {
    return [].concat(c.req || [], c.sup || [], c.tests || []).indexOf("young_age") >= 0;
  }).map(function (c) {
    return { name: c.name, domain: c.domain || "", suggested: KB_AGE_BRACKET[c.name] || "" };
  });
}

/* Rewrite a condition's token arrays in place.
   PURE: the founder's confirmed overrides are passed in, never read from
   storage here. That is what lets knowledge/ stay portable data.

   Called twice in a normal boot, and it must be safe both times:
     1. knowledge/loader.js, at assembly, with no overrides — every condition
        gets its suggested bracket and stays provisional.
     2. js/age-brackets.js, once storage is available, with the real
        overrides — confirmed conditions are upgraded.

   Hence the idempotence: the token to replace is either the original
   `young_age` or whatever this function put there on the previous pass. A
   naive second run would find no `young_age`, silently do nothing, and the
   founder's confirmed bracket would never reach the engine. */
function applyAgeBracket(cond, overrides) {
  var confirmed = (overrides && overrides[cond.name]) || "";
  var bracket = confirmed || KB_AGE_BRACKET[cond.name] || "";
  if (!bracket) return;

  var prev = cond.age_bracket || "";
  ["req", "sup", "tests"].forEach(function (key) {
    if (!cond[key]) return;
    var i = cond[key].indexOf("young_age");
    if (i < 0 && prev) i = cond[key].indexOf(prev);
    if (i >= 0) cond[key][i] = bracket;
  });
  cond.age_bracket = bracket;
  /* A bracket that has not been confirmed by the founder stays provisional. */
  cond.age_bracket_status = confirmed ? "VERIFIED_BY_CLINICIAN" : "NEEDS_CLINICAL_REVIEW";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    KB_AGE_BRACKET: KB_AGE_BRACKET,
    applyAgeBracket: applyAgeBracket,
    ageBracketPending: ageBracketPending
  };
}
