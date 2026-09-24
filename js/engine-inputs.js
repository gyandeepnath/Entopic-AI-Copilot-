/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ENGINE INPUTS                                          */
/*                                                                  */
/* One job: turn what a clinician RECORDED into values the engine    */
/* can compare — without ever turning "not recorded" into a result,  */
/* or a result into "not recorded".                                  */
/*                                                                  */
/* Split out of js/engine.js (which reads every one of these). Each  */
/* helper here exists because the inline version it replaced made   */
/* a real, reproduced error — the comment on each says which.       */
/*                                                                  */
/* Pure functions; no DOM, no storage, no network. Loads before     */
/* engine.js and after data-model.js (it builds its templates from   */
/* blankVisit() / blankPatient() on first use).                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── SHAPE-SAFE READ VIEW ────────────────────────────────────────
   The engine reads ~150 visit fields and trusted every one to have the
   shape blankVisit() gives it. Saved visits do not always: records from
   older builds lack sub-objects added since, imported and synced records
   come from other versions, and the simulator writes numbers where the UI
   writes strings. Feeding the real engine one wrong-typed field at a time
   (every path in blankVisit() × number/null/{}/[]/true) made it THROW on
   130 of 3,668 runs — and a throw before STAGE 10 means no red-flag alerts
   were computed at all. A missing `symptoms` array was worse: the engine
   returned early and silently, so IOP 45 + RAPD produced no alert.

   So the engine never reads the live visit directly. It reads a view built
   against the blankVisit() template:
     - a missing or wrong-typed sub-object becomes the template's (empty)
       sub-object, so `V.sl.od.vh` can never dereference undefined;
     - a string field holding a finite number becomes that number's string
       (the simulator's TBUT 0 is still a TBUT of 0); any other wrong type
       falls back to the template default, which is always token-neutral;
     - arrays stay arrays; keys the template does not know pass through.
   The view is a copy. The engine's OUTPUTS are still written to the real
   visit by _runDiagnosticEngine — nothing here changes what is saved. */
function _engineIsObj(x) { return !!x && typeof x === "object" && !Array.isArray(x); }

function engineShape(v, tpl) {
  if (_engineIsObj(tpl)) {
    var src = _engineIsObj(v) ? v : {};
    var out = {};
    for (var k in src) {
      if (!Object.prototype.hasOwnProperty.call(src, k) || k === "__proto__") continue;
      out[k] = src[k];
    }
    for (var t in tpl) {
      if (!Object.prototype.hasOwnProperty.call(tpl, t)) continue;
      out[t] = engineShape(src[t], tpl[t]);
    }
    return out;
  }
  if (Array.isArray(tpl)) return Array.isArray(v) ? v.slice() : [];
  if (typeof tpl === "string") {
    if (typeof v === "string") return v;
    if (typeof v === "number" && isFinite(v)) return String(v);
    return tpl;
  }
  if (typeof tpl === "boolean") return (v === undefined || v === null) ? tpl : !!v;
  if (typeof tpl === "number") {
    if (typeof v === "number" || typeof v === "string") return v;
    return tpl;
  }
  return v;   /* null-valued template field: type unknown, pass through */
}

var _ENGINE_VISIT_TPL = null, _ENGINE_PATIENT_TPL = null;
function engineVisitView(visit) {
  var src = (visit !== undefined) ? visit : ((typeof V !== "undefined") ? V : null);
  if (!_ENGINE_VISIT_TPL && typeof blankVisit === "function") _ENGINE_VISIT_TPL = blankVisit();
  return _ENGINE_VISIT_TPL ? engineShape(src, _ENGINE_VISIT_TPL) : (_engineIsObj(src) ? src : {});
}
function enginePatientView(patient) {
  var src = (patient !== undefined) ? patient : ((typeof P !== "undefined") ? P : null);
  if (!_ENGINE_PATIENT_TPL && typeof blankPatient === "function") _ENGINE_PATIENT_TPL = blankPatient("", "");
  return _ENGINE_PATIENT_TPL ? engineShape(src, _ENGINE_PATIENT_TPL) : (_engineIsObj(src) ? src : {});
}

/* A MEASURED number, or null when nothing was recorded.

   The engine used to read measurements as `parseFloat(x) || 999`, which
   turns a recorded 0 into "not measured". For these tests 0 is not a blank:
   it is the most abnormal result the test can give — a tear film that
   breaks up immediately, a Schirmer strip that stays dry, no accommodation
   at all, a flipper lens that cannot be cleared. Every one of them was
   silently dropped while milder results of the same test were flagged.
   Blank / unparseable → null (not measured); any finite number → itself. */
function engineMeasured(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  var s = String(v).trim();
  if (!s) return null;
  var n = parseFloat(s);
  return isFinite(n) ? n : null;
}

/* Van Herick grade 0–4, or null when not recorded.

   The dropdown's options had no value attribute, so the browser stored the
   LABEL ("0 (Closed)", "2 (Narrow)") and the engine read it with
   `parseInt(x) || 99`. parseInt("0 (Closed)") is 0, and 0 || 99 is 99: a
   CLOSED angle was read as wide open — no narrow-angle token and no
   "gonioscopy before dilation" warning — while grades 1 and 2 warned
   correctly. Accepts the bare grade and every legacy label. */
function vanHerickGrade(v) {
  if (v === null || v === undefined) return null;
  var m = /^\s*([0-4])(?![0-9.])/.exec(String(v));
  return m ? parseInt(m[1], 10) : null;
}

/* Age in whole years, or null when not recorded. "0" is an infant, not a
   blank — the old `parseInt(age) || 0` + `age > 0` gate gave a child under
   one no paediatric token at all. */
function engineAgeYears(p) {
  var a = (p && typeof p === "object") ? p.age : undefined;
  var n = engineMeasured(a);
  return (n === null || n < 0) ? null : Math.floor(n);
}

/* Visual acuity as logMAR, or null when the entry is not a letter acuity.
   A Snellen fraction in any unit is exact arithmetic — logMAR = log10 of
   the denominator over the numerator ("6/12" → 0.30, "20/40" → 0.30).
   A trailing letter count ("6/9-2") is ignored: the LINE is compared. A
   bare number is read only on a logMAR chart — "0.5" is 6/12 in decimal
   notation and 6/18 in logMAR, so on any other chart it is not guessed. */
function vaLogMAR(s, chart) {
  if (s === null || s === undefined) return null;
  var t = String(s).trim();
  var m = /^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/.exec(t);
  if (m) {
    var num = parseFloat(m[1]), den = parseFloat(m[2]);
    return (num > 0 && den > 0) ? Math.log(den / num) / Math.LN10 : null;
  }
  if (/logmar|etdrs/i.test(String(chart || "")) && /^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) {
    return parseFloat(t);
  }
  return null;
}

/* A horizontal cover-test deviation, or null.

   The field's placeholder says "e.g. 6 exo" and the parser accepted exactly
   that — "8Δ exo", "8^ exophoria", "8 XP" and "10 XT" (the notations most
   clinicians write) all produced nothing. Accepted now, amount either side:
     8 exo · 8exo · 8Δ exo · 8^ exo · 8 pd exo · 8 XP · 10 XT · 10 X(T)
     6 eso · 6 EP · 6 ET · 6 E(T) · exo 8 · XP 8Δ
   X/E abbreviations are the standard exo/eso notation: the letter names the
   direction, P/T/(T) whether it is latent, manifest or intermittent — the
   tokens here are about direction and size only, as before. */
var _CT_DIR = "(exo\\w*|eso\\w*|x\\s?\\(t\\)|xt|xp|e\\s?\\(t\\)|et|ep)";
var _CT_AMT = "(\\d+(?:\\.\\d+)?)\\s*(?:\u0394|\\^|p\\.?d\\.?|pds|prism\\s*d\\w*)?";
var _CT_AMT_FIRST = new RegExp(_CT_AMT + "\\s*" + _CT_DIR + "(?![a-z])", "i");
var _CT_DIR_FIRST = new RegExp("(?:^|[^a-z])" + _CT_DIR + "(?![a-z])\\s*" + _CT_AMT, "i");
function coverTestDeviation(s) {
  if (s === null || s === undefined) return null;
  var t = String(s).toLowerCase();
  var amt, dir;
  var m = _CT_AMT_FIRST.exec(t);
  if (m) { amt = m[1]; dir = m[2]; }
  else if ((m = _CT_DIR_FIRST.exec(t))) { dir = m[1]; amt = m[2]; }
  else return null;
  var n = parseFloat(amt);
  if (!isFinite(n)) return null;
  return { dir: (dir.charAt(0) === "x" || dir.indexOf("exo") === 0) ? "exo" : "eso", amount: n };
}

/* Is an RAPD recorded? The test was `rapd !== "None"`, so an EMPTY value
   (older and imported records) raised "RAPD detected ()" as an urgent red
   flag. Blank or an explicit negative is no; anything else — the
   dropdown's OD/OS, or free text from another system — is yes. A red flag
   errs toward firing, so an unrecognised entry counts as present. */
function rapdPresent(v) {
  var t = String(v === null || v === undefined ? "" : v).trim().toLowerCase();
  if (!t) return false;
  return !/^(none|nil|no|absent|neg|negative|-ve|not\s+(present|seen|detected))\b/.test(t);
}

/* Order of the non-letter acuities, worst first. Pure ordering — no logMAR
   value is assigned to them (the conventions for that differ). */
var VA_LOW_ORDER = [/^n\.?(p\.?l|l\.?p)/i, /^(p\.?l|l\.?p)/i, /^h\.?m/i, /^c\.?f/i];
function _vaRank(s, chart) {
  if (vaLogMAR(s, chart) !== null) return VA_LOW_ORDER.length;
  var t = String(s === null || s === undefined ? "" : s).trim();
  for (var i = 0; i < VA_LOW_ORDER.length; i++) if (VA_LOW_ORDER[i].test(t)) return i;
  return -1;   /* unrecognised */
}
/* Is acuity `a` strictly better than acuity `b`? False whenever either
   cannot be placed — never a guess. */
function vaBetter(a, b, chart) {
  var ra = _vaRank(a, chart), rb = _vaRank(b, chart);
  if (ra < 0 || rb < 0) return false;
  if (ra !== rb) return ra > rb;
  if (ra < VA_LOW_ORDER.length) return false;          /* same low-vision category */
  return vaLogMAR(a, chart) < vaLogMAR(b, chart) - 1e-9;
}


/* ── STAGE 2: CHIEF-COMPLAINT FREE TEXT → TOKENS ───────────────── */

/* Remove negated phrases before token extraction, so "denies pain" or
   "no flashes" do not emit pain/flashes tokens.
   Strategy: split into clauses at punctuation and contrast conjunctions;
   inside each clause, drop everything from a negation marker to the end
   of the clause. Deliberately conservative — only the negated clause tail
   is dropped, so "no flashes, floaters since Monday" still emits floaters
   (over-alerting is safer than under-alerting for red flags). */
function stripNegatedPhrases(text) {
  var clauses = String(text).split(/[,;.!?]|\bbut\b|\bexcept\b|\bhowever\b/i);
  var NEG = /\b(no|not|denies|denied|denying|deny|without|never|nil)\b/i;
  var kept = [];
  for (var i = 0; i < clauses.length; i++) {
    var clause = clauses[i];
    var m = clause.match(NEG);
    if (m) {
      /* keep any text before the negation marker, drop the rest */
      kept.push(clause.slice(0, m.index));
    } else {
      kept.push(clause);
    }
  }
  return kept.join(", ");
}

function parseComplaintText(text) {
  var t = [];

  /* Negation handling: strip "no X" / "denies X" phrases up front */
  text = stripNegatedPhrases(text);

  /* WHEN it started is not WHAT it is. "red eye since this morning" dates
     the onset; it is not morning blur, and "since last night" is not
     "worse in the evening". Onset phrases are removed ONLY for the
     time-of-day patterns below — everything else reads the full text. */
  var timeText = text.replace(/\b(?:since|from|started|began|begun|this|last|yesterday|tonight|overnight)\s+(?:this\s+|last\s+|the\s+)?(?:morning|evening|night)s?\b/gi, " ");

  /* Every pattern is anchored at the START of a word (\b). The parser used
     to match substrings, and measured against 38 ordinary complaints it
     produced 21 false tokens: "routine eye tesTING" → burning (sting),
     "eyelid twITCHing" → itching, "KEYBOARD" → distance blur (board),
     "THOUSANDs" → grittiness (sand), "retinal TEAR" → watering,
     "near-sighted" → NEAR blur, "doesn't MATTER" → purulent discharge,
     "welder's FLASH burn" → photopsia. The exclusions below are the
     specific readings those phrases showed to be wrong. */

  /* Vision */
  if (/\bblur|\bfuzzy|\bhaz[ey]/i.test(text))                                 t.push("blur");
  if (/\bdistance\b|\bfar away\b|\b(?:black|white)?board\b|\bdriving\b/i.test(text)) t.push("distance_blur");
  if (/\bnear\b(?![-\s]?sight)|\breading\b|\bclose\b(?!\s+(?:my|his|her|their|both|one|the)?\s*(?:eyes?|lids?|them)\b)|\b(?:smart|cell|i)?phones?\b|\bbooks?\b/i.test(text)) t.push("near_blur");
  if (/\bdouble\b(?![-\s]?check)|\btwo of\b/i.test(text))                    t.push("diplopia");
  if (/\bstrain|\bfatigue|\btired\s+eyes?\b|\beyes?\s+(?:feel\s+|are\s+|get\s+|getting\s+)?tired\b/i.test(text)) t.push("asthenopia");
  if (/\bfluctuat|\bcomes and goes\b|\bvariable\b/i.test(text))              t.push("fluctuating_blur");

  /* Pain */
  /* (?!less) keeps "painless" from emitting pain; a HEADache is not eye pain */
  if (/\bpain(?!less)|\bsore\b|(?<!head)ache\b|\baching\b|\bhurt/i.test(text)) t.push("pain");
  if (/\bburn|\bsting/i.test(text))                                            t.push("burning");
  if (/\bdry\b|\bdryness\b|\bdried\b/i.test(text))                             t.push("dryness");
  if (/\bitch/i.test(text))                                                    t.push("itching_dominant");
  /* \bred\b avoids matching "reduced" */
  if (/\bred\b|\bredness\b|\bbloodshot\b|\bpink\b/i.test(text))               t.push("redness");
  if (/\bgrit|\bsand(?:y|like)?\b|\bsand-like\b|\bscratchy\b|\bscratchiness\b|\bfeels?\s+scratch/i.test(text)) t.push("grittiness");
  if (/\bforeign body\b|\bsomething in\b/i.test(text))                         t.push("foreign_body_sensation");

  /* Light */
  if (/\blight sensitiv|\bphotophob|\bbright lights?\b/i.test(text))           t.push("photophobia");

  /* Retinal — a welder's / arc flash, a flash burn and a hot flash are not
     photopsia, and "flashes + floaters" raises an urgent banner. */
  if (/(?<!(?:welder'?s?|welding|arc|camera|hot)[\s-])\bflash(?:es|ing|y)?\b(?![\s-]*burns?\b)/i.test(text)) t.push("flashes");
  if (/\bfloater|\bspots\b|\bcobweb|\bthreads?\b/i.test(text))                 t.push("floaters");
  if (/\bshadows?\b(?!\s+image)|\bcurtain|\bveil\b/i.test(text))               t.push("field_loss");
  if (/\bmissing\b.*\bvision|\bpart\b.*\bgone\b/i.test(text))                   t.push("field_loss");

  /* Neuro */
  if (/\bcolou?r.*\bchange|\bfaded\b|\bdull colou?r/i.test(text))              t.push("color_vision_loss");
  if (/\bpain.*\bmov|\bhurts?.*\blook|\bmov\w*.*\bpain/i.test(text))           t.push("pain_eye_movement");

  /* Distortion */
  if (/\bdistort|\bwavy\b|\bbent lines?\b|\bmetamorphop/i.test(text))          t.push("distortion");
  if (/\bghost|\bshadow image/i.test(text))                                   t.push("ghosting");

  /* Temporal */
  if (/\bsudden/i.test(text))                                                  t.push("sudden_onset");
  if (/\bgradual|\bslowly\b/i.test(text))                                      t.push("gradual_onset");
  if (/\bmornings?\b/i.test(timeText))                                         t.push("morning_blur");
  if (/\bevenings?\b|\bend of (?:the )?day\b|\bnights?\b(?!\s*(?:blind|vision))/i.test(timeText)) t.push("worse_evening");
  if (/\bworse\b.*\bscreens?\b|\bcomputers?\b|\blaptops?\b|\b(?:smart|cell|i)?phones?\b/i.test(text)) t.push("screen_use_exacerbation");

  /* Additional */
  if (/\bglare|\bdazzl/i.test(text))                                           t.push("glare");
  if (/\bhalos?\b|\brings?\b.*\blights?\b/i.test(text))                        t.push("halos");
  if (/\bheadaches?\b|\bhead\b.*\bpain/i.test(text))                           t.push("headache");
  /* a retinal TEAR is a break, not tears */
  if (/\bwater(?:y|ing|s)?\b|(?<!retinal\s)(?<!retina\s)\btear(?:s|ing|y)?\b(?!\s+(?:in|of)\s+(?:the\s+)?retina)|\blacrim/i.test(text)) t.push("watering");
  /* "matter" / "mattering" is how many patients say discharge — but not in
     "doesn't matter", "no matter", "what's the matter" or "a matter of". */
  if (/\bdischarg|\bpus\b|\bgunk|\bmattering\b|(?<!(?:no|doesn't|does not|don't|do not|what's|what is|the|a)\s)\bmatter\b(?!\s+(?:of|to|what|which|how|much)\b)/i.test(text)) t.push("purulent_discharge");
  if (/\bcrust|\bstuck\b.*\bmorning|\bstuck\s+(?:shut|together)|\bglued\b/i.test(text)) t.push("lid_crusting");
  if (/\bdroop|\bptosis/i.test(text))                                          t.push("ptosis");
  if (/\bnight\b.*\bvision|\bdark\b.*\bsee|\bnight[\s-]?blind/i.test(text))    t.push("night_blindness");

  return t;
}
