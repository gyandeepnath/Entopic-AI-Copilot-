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

/* Local founder overrides, applied on top of the suggestions above. */
var KB_AGE_BRACKET_KEY = "entopic_age_brackets";

function ageBracketOverrides() {
  try {
    if (typeof localStorage === "undefined") return {};
    return JSON.parse(localStorage.getItem(KB_AGE_BRACKET_KEY) || "{}");
  } catch (e) { return {}; }
}

function ageBracketSet(conditionName, token) {
  var o = ageBracketOverrides();
  if (token) o[conditionName] = token; else delete o[conditionName];
  try { localStorage.setItem(KB_AGE_BRACKET_KEY, JSON.stringify(o)); } catch (e) {}
}

/* The bracket in force for a condition: founder override, then suggestion,
   then nothing (condition keeps `young_age` and its exact old behaviour). */
function ageBracketFor(conditionName) {
  var o = ageBracketOverrides();
  if (o[conditionName]) return o[conditionName];
  return KB_AGE_BRACKET[conditionName] || "";
}

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

/* Rewrite a condition's token arrays in place. Called by the loader. */
function applyAgeBracket(cond) {
  var bracket = ageBracketFor(cond.name);
  if (!bracket) return;
  ["req", "sup", "tests"].forEach(function (key) {
    if (!cond[key]) return;
    var i = cond[key].indexOf("young_age");
    if (i >= 0) cond[key][i] = bracket;
  });
  cond.age_bracket = bracket;
  /* A bracket that has not been confirmed by the founder stays provisional. */
  if (!ageBracketOverrides()[cond.name]) cond.age_bracket_status = "NEEDS_CLINICAL_REVIEW";
  else cond.age_bracket_status = "VERIFIED_BY_CLINICIAN";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { KB_AGE_BRACKET: KB_AGE_BRACKET };
}
