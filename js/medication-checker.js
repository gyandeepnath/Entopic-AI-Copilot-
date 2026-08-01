/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — MEDICATION CHECKER (Extended)                         */
/*                                                                  */
/* Builds on the MEDICATION_OCULAR_EFFECTS database in             */
/* knowledge/medications.js.                                       */
/*                                                                  */
/* Provides:                                                       */
/*   - Structured medication review for medical history page       */
/*   - Integration with engine tokens for drug-induced conditions  */
/*                                                                  */
/* A parseDrugList() helper used to live here, splitting the free   */
/* text on commas and "and". Nothing ever called it — matching runs */
/* against the whole field, which handles "prednisolone 5mg od"     */
/* better than splitting would. Removed rather than left as dead    */
/* code in a module that carries clinical meaning.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* MATCHING A DRUG NAME IN FREE TEXT                               */
/*                                                                  */
/* This used to be a bare indexOf, which reported drugs the patient */
/* was not taking. The case that proved it: "chloroquine" is a      */
/* substring of "hydroxychloroquine", and the two are separate      */
/* entries. A patient on hydroxychloroquine — a very common drug in */
/* lupus and rheumatoid arthritis — had BOTH listed in their        */
/* medication review, so the clinician was shown a drug that did    */
/* not exist in the record. Fabricated clinical information.        */
/*                                                                  */
/* The rule: a drug name must START at a word boundary, but may     */
/* continue. Both halves of that matter.                            */
/*                                                                  */
/*   START boundary is what fixes the bug — in                      */
/*   "hydroxychloroquine" the letter before "chloroquine" is "y",   */
/*   so it is part of a longer word and is not a match. Hyphens and */
/*   slashes count as boundaries, so "co-codamol" still works.      */
/*                                                                  */
/*   NO end boundary is deliberate. Clinicians write "steroids",    */
/*   "SSRIs", "bisphosphonates". Demanding a boundary at the end    */
/*   would silently stop matching the plural, and MISSING a real    */
/*   drug exposure is the more dangerous direction of error.        */
/* ═══════════════════════════════════════════════════════════════ */

function medAliasMatches(text, alias) {
  if (!text || !alias) return false;
  var esc = String(alias).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp("(?:^|[^a-z0-9])" + esc).test(String(text).toLowerCase());
}


/* ═══════════════════════════════════════════════════════════════ */
/* CHECK ALL MEDICATIONS                                           */
/* Returns structured array of matched drugs + their effects       */
/*                                                                  */
/* NOTE for the founder — a known limitation, not a bug:           */
/* negation is NOT understood. "no steroids" or "stopped           */
/* prednisolone" still count as a match. Teaching it to suppress    */
/* on negation would risk hiding a real drug exposure, which is the */
/* dangerous direction, so it is left to the clinician to read the  */
/* note. Flagged in CHANGELOG for a decision.                       */
/* ═══════════════════════════════════════════════════════════════ */

function checkAllMedications() {
  if (typeof V === "undefined" || !V || !V.hxM || !V.hxM.medications) return [];
  if (typeof MEDICATION_OCULAR_EFFECTS === "undefined") return [];

  var text = String(V.hxM.medications).toLowerCase();
  var results = [];

  for (var i = 0; i < MEDICATION_OCULAR_EFFECTS.length; i++) {
    var med = MEDICATION_OCULAR_EFFECTS[i];
    var matchedAlias = "";

    for (var a = 0; a < med.aliases.length; a++) {
      if (medAliasMatches(text, med.aliases[a])) {
        matchedAlias = med.aliases[a];
        break;
      }
    }

    if (matchedAlias) {
      results.push({
        drug: med.drug,
        matchedOn: matchedAlias,
        effects: med.effects.slice()
      });
    }
  }

  return results;
}


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER MEDICATION REVIEW                                        */
/* Returns HTML for a detailed medication review panel              */
/* Can be inserted into medical history page or advisory            */
/* ═══════════════════════════════════════════════════════════════ */

function renderMedicationReview() {
  var checks = checkAllMedications();

  if (checks.length === 0) return "";

  var h = '<div style="margin-top:12px;border:1px solid var(--fg);border-radius:var(--rl);overflow:hidden">';

  h += '<div style="padding:8px 10px;background:var(--sn);border-bottom:1px solid var(--fg)">';
  h += '<div style="font-weight:600;font-size:.72rem">💊 Medication — Ocular Side Effects</div>';
  h += '<div style="font-size:.56rem;color:var(--sv)">' + checks.length + ' medication(s) with known ocular implications detected</div>';
  h += '</div>';

  /* Escaped even though this text comes from the knowledge base: the KB is
     editable in the admin KB editor, so it is not a trusted constant. */
  for (var i = 0; i < checks.length; i++) {
    var med = checks[i];

    h += '<div style="padding:8px 10px;border-bottom:1px solid var(--fg)">';
    h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:4px">' + escHtml(med.drug) + '</div>';

    for (var e = 0; e < med.effects.length; e++) {
      var eff = med.effects[e];
      var riskColor = eff.risk === "high" ? "var(--ink)" : eff.risk === "moderate" ? "var(--md)" : "var(--sv)";

      h += '<div style="padding:3px 0;font-size:.62rem">';
      h += '<span style="font-weight:500;color:' + riskColor + '">';
      h += escHtml(String(eff.risk || "").toUpperCase()) + ' RISK</span> — ';
      h += escHtml(eff.condition);
      h += '<span style="color:var(--sv)"> (onset: ' + escHtml(eff.onset) + ')</span>';
      h += '<div style="font-size:.56rem;color:var(--sl);padding-left:10px;margin-top:1px">';
      h += '→ ' + escHtml(eff.action);
      h += '</div></div>';
    }

    h += '</div>';
  }

  h += '</div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* INJECT MEDICATION TOKENS INTO ENGINE                            */
/* Called by engine to add drug-related tokens                     */
/* ═══════════════════════════════════════════════════════════════ */

function getMedicationTokens() {
  var tokens = [];
  var checks = checkAllMedications();

  for (var i = 0; i < checks.length; i++) {
    var med = checks[i];
    for (var e = 0; e < med.effects.length; e++) {
      var condition = med.effects[e].condition.toLowerCase();

      /* Map drug effects to engine tokens */
      if (condition.indexOf("cataract") >= 0 || condition.indexOf("psc") >= 0) {
        tokens.push("steroid_history");
      }
      if (condition.indexOf("iop") >= 0 || condition.indexOf("pressure") >= 0) {
        tokens.push("raised_iop_risk");
      }
      if (condition.indexOf("dry eye") >= 0 || condition.indexOf("mgd") >= 0) {
        tokens.push("dryness");
      }
      if (condition.indexOf("macular toxicity") >= 0) {
        tokens.push("macular_screening_needed");
      }
      if (condition.indexOf("floppy iris") >= 0 || condition.indexOf("ifis") >= 0) {
        tokens.push("ifis_risk");
      }
      if (condition.indexOf("optic") >= 0 && condition.indexOf("neuritis") >= 0) {
        tokens.push("toxic_optic_risk");
      }
      if (condition.indexOf("angle closure") >= 0) {
        tokens.push("angle_closure_risk");
      }
    }
  }

  return tokens;
}
