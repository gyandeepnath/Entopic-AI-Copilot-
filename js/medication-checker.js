/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — MEDICATION CHECKER (Extended)                         */
/*                                                                  */
/* Builds on the MEDICATION_OCULAR_EFFECTS database in             */
/* knowledge/medications.js.                                       */
/*                                                                  */
/* Provides:                                                       */
/*   - Drug list parsing from free text                            */
/*   - Structured medication review for medical history page       */
/*   - Integration with engine tokens for drug-induced conditions  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* PARSE DRUG LIST FROM FREE TEXT                                  */
/* Extracts individual drug names from the medications field       */
/* ═══════════════════════════════════════════════════════════════ */

function parseDrugList(text) {
  if (!text) return [];

  /* Split by common separators */
  var drugs = text
    .replace(/\band\b/gi, ",")
    .replace(/\+/g, ",")
    .replace(/;/g, ",")
    .replace(/\n/g, ",")
    .split(",")
    .map(function(d) { return d.trim(); })
    .filter(function(d) { return d.length > 2; });

  return drugs;
}


/* ═══════════════════════════════════════════════════════════════ */
/* CHECK ALL MEDICATIONS                                           */
/* Returns structured array of matched drugs + their effects       */
/* ═══════════════════════════════════════════════════════════════ */

function checkAllMedications() {
  if (!V.hxM || !V.hxM.medications) return [];
  if (typeof MEDICATION_OCULAR_EFFECTS === "undefined") return [];

  var text = V.hxM.medications.toLowerCase();
  var results = [];

  for (var i = 0; i < MEDICATION_OCULAR_EFFECTS.length; i++) {
    var med = MEDICATION_OCULAR_EFFECTS[i];
    var matched = false;
    var matchedAlias = "";

    for (var a = 0; a < med.aliases.length; a++) {
      if (text.indexOf(med.aliases[a].toLowerCase()) >= 0) {
        matched = true;
        matchedAlias = med.aliases[a];
        break;
      }
    }

    if (matched) {
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

  for (var i = 0; i < checks.length; i++) {
    var med = checks[i];

    h += '<div style="padding:8px 10px;border-bottom:1px solid var(--fg)">';
    h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:4px">' + med.drug + '</div>';

    for (var e = 0; e < med.effects.length; e++) {
      var eff = med.effects[e];
      var riskColor = eff.risk === "high" ? "var(--ink)" : eff.risk === "moderate" ? "var(--md)" : "var(--sv)";

      h += '<div style="padding:3px 0;font-size:.62rem">';
      h += '<span style="font-weight:500;color:' + riskColor + '">';
      h += eff.risk.toUpperCase() + ' RISK</span> — ';
      h += eff.condition;
      h += '<span style="color:var(--sv)"> (onset: ' + eff.onset + ')</span>';
      h += '<div style="font-size:.56rem;color:var(--sl);padding-left:10px;margin-top:1px">';
      h += '→ ' + eff.action;
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
