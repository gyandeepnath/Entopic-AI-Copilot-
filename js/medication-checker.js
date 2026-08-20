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
/* NEGATION, PAST USE AND ALLERGY                                  */
/*                                                                  */
/* "No steroids" used to count as a steroid history. So did         */
/* "denies hydroxychloroquine" and "allergic to doxycycline".       */
/*                                                                  */
/* THE SAFETY RULE THAT SHAPES ALL OF THIS                          */
/* ───────────────────────────────────────                          */
/* Missing a real drug exposure is far worse than reporting one     */
/* that is not there. So this NEVER silently drops a match. Every   */
/* drug the text mentions still appears in the review, labelled     */
/* with how it was read. If the reading is wrong, the clinician     */
/* sees that it was read wrongly — which is not true of code that   */
/* quietly deletes the row.                                         */
/*                                                                  */
/* Only the ENGINE TOKEN is withheld, and only for two statuses:    */
/*                                                                  */
/*   negated  "no steroids", "denies", "nil", "not on"              */
/*            The patient is not taking it. No token.               */
/*   allergy  "allergic to X", "X intolerance"                      */
/*            Not taking it. No token. Still shown, because an      */
/*            allergy is clinically important in its own right.     */
/*                                                                  */
/*   past     "stopped prednisolone", "previously on"               */
/*            TOKEN IS STILL RAISED. This is deliberate and it is   */
/*            the clinically important case: steroid-induced        */
/*            cataract, hydroxychloroquine maculopathy and          */
/*            ethambutol optic neuropathy are all consequences of   */
/*            PAST exposure. A drug that has been stopped is still  */
/*            part of the history. Treating "stopped" as "never"    */
/*            would be the single most dangerous thing this file    */
/*            could do.                                             */
/*                                                                  */
/*   current  everything else. Token raised.                        */
/*                                                                  */
/* SCOPE. A cue only reaches to the end of its clause, so           */
/* "no diabetes, on prednisolone" does not negate the prednisolone. */
/* Clauses break on , ; . / newline, and a positive cue ("on",      */
/* "taking", "started") also cancels a preceding negation, which    */
/* handles "no steroids and taking metformin".                      */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — the founder must confirm this cue list */
/* reads the way clinicians in his setting actually write notes.    */
/* The engineering is testable; the vocabulary is a clinical        */
/* judgement and is not mine to finalise.                           */
/* ═══════════════════════════════════════════════════════════════ */

var MED_NEG_CUES  = ["no", "not", "non", "never", "denies", "denied", "nil",
                     "without", "negative for", "off", "stopped taking", "refused"];
var MED_PAST_CUES = ["stopped", "ceased", "discontinued", "previously", "previous",
                     "former", "formerly", "past", "used to", "ex", "h/o", "history of",
                     "completed", "finished"];
var MED_ALLERGY_CUES = ["allergic to", "allergy to", "allergy", "allergic",
                        "intolerance", "intolerant", "reaction to"];
/* A positive cue cancels a negation that came earlier in the same clause. */
var MED_POS_CUES = ["on", "taking", "takes", "started", "commenced", "continues", "using"];

/* Abbreviations that contain a slash, expanded BEFORE clause splitting.

   MEASURED PROBLEM (tools/stress/clinical.js, Y4). The splitter breaks on "/",
   so "h/o prednisolone" became the clauses ["h", "o prednisolone"] and the
   "h/o" past-use cue was destroyed by the split that was supposed to protect
   it. A drug the notes recorded as HISTORY read as currently prescribed.

   Expanded rather than removed from the split set, because "/" is also the
   ordinary separator in a drug list ("aspirin/clopidogrel") and that split is
   wanted. */
var MED_SLASH_ABBREV = [
  [/\bh\s*\/\s*o\b/g, " history of "],   /* history of */
  [/\bs\s*\/\s*p\b/g, " status post "],  /* status post */
  [/\bc\s*\/\s*o\b/g, " complains of "]  /* complains of */
];

function medExpandAbbrev(text) {
  var t = String(text).toLowerCase();
  for (var i = 0; i < MED_SLASH_ABBREV.length; i++) {
    t = t.replace(MED_SLASH_ABBREV[i][0], MED_SLASH_ABBREV[i][1]);
  }
  return t;
}

/* Split into clauses, keeping it simple and predictable. */
function medClauses(text) {
  return medExpandAbbrev(text).split(/[,;.\n\/]+/);
}

/* Returns {at, end} for the first cue found, or null.
   `end` matters: "not on prednisolone" contains the positive cue "on" INSIDE
   the negation phrase "not on". Without knowing where the negation phrase
   ends, that "on" would cancel the very negation it belongs to. */
function _medCueAt(clause, cues) {
  var best = null;
  for (var i = 0; i < cues.length; i++) {
    var esc = cues[i].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var m = new RegExp("(?:^|[^a-z0-9])" + esc + "(?:$|[^a-z0-9])").exec(clause);
    if (m && (best === null || m.index < best.at)) {
      best = { at: m.index, end: m.index + m[0].length };
    }
  }
  return best;
}

/* How is this drug mentioned? Returns "current" | "past" | "negated" | "allergy". */
function medMentionStatus(text, alias) {
  var clauses = medClauses(text);
  var best = null;

  for (var c = 0; c < clauses.length; c++) {
    var clause = clauses[c];
    if (!medAliasMatches(clause, alias)) continue;

    var esc = String(alias).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    var hit = new RegExp("(?:^|[^a-z0-9])" + esc).exec(clause);
    var drugAt = hit ? hit.index : 0;
    var before = clause.slice(0, drugAt);

    var allergy = _medCueAt(before, MED_ALLERGY_CUES);
    var neg     = _medCueAt(before, MED_NEG_CUES);
    var past    = _medCueAt(before, MED_PAST_CUES);
    var pos     = _medCueAt(before, MED_POS_CUES);

    /* A cue that TRAILS the drug name.

       MEASURED PROBLEM (tools/stress/clinical.js, Y3). Cues were only ever
       looked for BEFORE the drug, so "penicillin allergy" — the ordinary way
       an allergy is written down — read as a current prescription. The app
       both invented a drug exposure and lost the allergy.

       Deliberately narrow, because the module's safety bias is that missing a
       real exposure is worse than reporting one. A trailing cue is honoured
       only when nothing AFTER the drug looks like it is actually being taken:
       no dose, no positive cue. So "prednisolone allergy" is an allergy, while
       "on prednisolone 5mg allergy to penicillin" stays a current steroid. */
    var after = clause.slice(drugAt + (hit ? hit[0].length : 0));
    var looksTaken = /\d\s*(mg|mcg|g|ml|%|units?|drops?|od|bd|tds|qds|nocte|daily)\b/.test(after) ||
                     !!_medCueAt(after, MED_POS_CUES);
    if (!looksTaken) {
      if (!allergy) allergy = _medCueAt(after, MED_ALLERGY_CUES);
      if (!past)    past    = _medCueAt(after, MED_PAST_CUES);
    }

    /* A positive cue only cancels a negation if it sits AFTER the whole
       negation phrase. In "not on prednisolone" the "on" is part of "not on",
       so it cancels nothing. */
    var posCancels = !!(neg && pos && pos.at >= neg.end);

    var status = "current";
    if (allergy) status = "allergy";
    else if (neg && !posCancels) status = "negated";
    else if (past) status = "past";

    /* If the same drug appears more than once, the most clinically
       significant reading wins: an exposure anywhere outranks a denial. */
    var rank = { current: 3, past: 2, allergy: 1, negated: 0 };
    if (best === null || rank[status] > rank[best]) best = status;
  }
  return best || "current";
}

/* Does a mention with this status count as a drug exposure for the engine? */
function medStatusCountsAsExposure(status) {
  return status === "current" || status === "past";
}


/* ═══════════════════════════════════════════════════════════════ */
/* CHECK ALL MEDICATIONS                                           */
/* Returns every drug the text mentions, each with a `status`.     */
/* Nothing is dropped — see the safety rule above.                 */
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
      var status = medMentionStatus(text, matchedAlias);
      results.push({
        drug: med.drug,
        matchedOn: matchedAlias,
        status: status,
        counts: medStatusCountsAsExposure(status),
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

  var counted = checks.filter(function (c) { return c.counts; }).length;

  var h = '<div style="margin-top:12px;border:1px solid var(--fg);border-radius:var(--rl);overflow:hidden">';

  h += '<div style="padding:8px 10px;background:var(--sn);border-bottom:1px solid var(--fg)">';
  h += '<div style="font-weight:600;font-size:.72rem">💊 Medication — Ocular Side Effects</div>';
  h += '<div style="font-size:.56rem;color:var(--sv)">' + counted + ' of ' + checks.length +
       ' medication(s) mentioned are read as an exposure. Advisory — check the wording against the note.</div>';
  h += '</div>';

  /* How each mention was read. Shown rather than hidden: if the software has
     misread "no steroids" or "stopped prednisolone", the clinician can see
     that it misread it. Silently dropping the row would hide the mistake. */
  var STATUS_LABEL = {
    current: { text: "",                       tone: "" },
    past:    { text: "PAST USE — still counts", tone: "var(--md)" },
    negated: { text: "recorded as NOT taking",  tone: "var(--sv)" },
    allergy: { text: "ALLERGY — not taking",    tone: "var(--sv)" }
  };

  /* Escaped even though this text comes from the knowledge base: the KB is
     editable in the admin KB editor, so it is not a trusted constant. */
  for (var i = 0; i < checks.length; i++) {
    var med = checks[i];
    var lab = STATUS_LABEL[med.status] || STATUS_LABEL.current;
    var muted = !med.counts;

    h += '<div style="padding:8px 10px;border-bottom:1px solid var(--fg)' +
         (muted ? ';opacity:.62' : '') + '">';
    h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:4px">' + escHtml(med.drug);
    if (lab.text) {
      h += ' <span style="font-weight:500;font-size:.55rem;color:' + lab.tone + '">(' +
           escHtml(lab.text) + ')</span>';
    }
    h += '</div>';

    for (var e = 0; e < med.effects.length; e++) {
      var eff = med.effects[e];
      var riskColor = eff.risk === "high" ? "var(--ink)" : eff.risk === "moderate" ? "var(--md)" : "var(--sv)";

      h += '<div style="padding:3px 0;font-size:.62rem">';
      h += '<span style="font-weight:500;color:' + (muted ? "var(--sv)" : riskColor) + '">';
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
  /* Only mentions read as a real exposure reach the engine. "No steroids" and
     "allergic to doxycycline" are still SHOWN in the review, but they must not
     push the differential toward a drug-induced condition. Past use DOES count
     — see the note above medMentionStatus. */
  var checks = checkAllMedications().filter(function (c) { return c.counts; });

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
