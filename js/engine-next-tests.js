/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ENGINE STAGE 12: NEXT-TEST RECOMMENDER                 */
/*                                                                  */
/* Split out of js/engine.js as a whole stage, the way stage 8      */
/* (js/engine-exclusions.js) already was: engine.js calls           */
/* computeNextTests() once per run and reads nothing else from here. */
/* Runtime-only dependencies (findCondition, FINDING_TOKEN_MAP,     */
/* TOKEN_REGISTRY); loads straight after engine.js.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════════════════════════════════════════════════ */
/* NEXT-TEST RECOMMENDER — the diagnostic refinement loop           */
/*                                                                  */
/* Entopic does not hand back a single probabilistic "answer": it    */
/* ranks a differential and then tells the clinician what to CHECK    */
/* NEXT to narrow it. Given the current ranked list, this picks the   */
/* findings that would best DISCRIMINATE between the leading          */
/* candidates — confirm the leader, or rule out a close rival. As     */
/* each finding is entered the engine re-runs (nav() re-scores) and   */
/* the suggestions refine: a transparent, glass-box loop. The logic   */
/* is fully deterministic and inspectable — no probabilistic guessing */
/* and no LLM in the diagnostic path.                                 */
/* ═══════════════════════════════════════════════════════════════ */

/* Which exam step a given finding/measurement is entered on. */
var NEXT_TEST_ROUTE_STEP = {
  glaucoma: "iop", retina: "fundus", anterior: "slit_lamp", binocular: "bv",
  neuro: "neuro", refractive: "refraction", lens: "slit_lamp",
  surface: "slit_lamp", urgent: "slit_lamp"
};
var NEXT_TEST_TOKEN_STEP = {
  very_high_iop: "iop", high_iop: "iop", normal_iop: "iop", raised_iop_risk: "iop",
  angle_closure_risk: "gonioscopy", narrow_angle: "gonioscopy", shallow_ac: "gonioscopy",
  pigment_dispersion: "gonioscopy", pxf_material: "gonioscopy", transillumination_defects: "gonioscopy",
  RAPD_positive: "pupil", anisocoria: "pupil", pupil_involvement: "pupil", heterochromia: "pupil",
  macular_screening_needed: "investigations", RNFL_thinning: "investigations",
  cd_asymmetry: "fundus", increased_cd: "fundus", nrr_thinning: "fundus", disc_hemorrhage: "fundus"
};

/* Reverse the finding→token map once: token → human-readable finding name.
   A finding's own canonical token is its LAST entry — map ONLY that, so a
   generic shared token (e.g. sudden_onset, which several findings list as a
   secondary token) is never mislabeled as one specific finding. Tokens with
   no canonical finding fall back to a prettified name. */
var NEXT_TEST_LABELS = null;
function buildNextTestLabels() {
  if (NEXT_TEST_LABELS) return NEXT_TEST_LABELS;
  NEXT_TEST_LABELS = Object.create(null);
  if (typeof FINDING_TOKEN_MAP === "undefined") return NEXT_TEST_LABELS;
  /* Own keys / real token lists only — an inherited one would name a
     finding that does not exist. */
  for (var name in FINDING_TOKEN_MAP) {
    if (!Object.prototype.hasOwnProperty.call(FINDING_TOKEN_MAP, name)) continue;
    var toks = FINDING_TOKEN_MAP[name];
    if (!Array.isArray(toks) || !toks.length) continue;
    var own = toks[toks.length - 1];
    if (!NEXT_TEST_LABELS[own]) NEXT_TEST_LABELS[own] = name;
  }
  return NEXT_TEST_LABELS;
}

function prettyToken(t) {
  return t.replace(/_/g, " ").replace(/\b\w/g, function (m) { return m.toUpperCase(); });
}

/* Onset / course tokens are captured at intake, not "checked next" — they add
   noise to a next-test list, so they never qualify as discriminators. */
var NEXT_TEST_SKIP = {
  sudden_onset: 1, gradual_onset: 1, acute: 1, chronic: 1, subacute: 1,
  acute_bias: 1, chronic_bias: 1, recurrent: 1, progressive: 1, variable: 1,
  intermittent: 1, subacute_onset: 1
};

/* A finding is only worth suggesting if the clinician can actually enter it —
   i.e. it is reachable (has a producing input source) in the token registry. */
function isEnterableToken(t) {
  if (Object.prototype.hasOwnProperty.call(NEXT_TEST_SKIP, t) && NEXT_TEST_SKIP[t]) return false;
  if (typeof TOKEN_REGISTRY === "undefined") return true;
  var e = TOKEN_REGISTRY[t];
  return !!(e && e.reachable !== false);
}

/* Where to send the clinician to record this finding: an explicit override,
   else an exam finding → the related condition's route step, else a
   symptom/history token → chief complaint. */
function nextTestTarget(token, relCond) {
  if (NEXT_TEST_TOKEN_STEP[token]) return NEXT_TEST_TOKEN_STEP[token];
  var reg = (typeof TOKEN_REGISTRY !== "undefined") ? TOKEN_REGISTRY[token] : null;
  var src = (reg && reg.sources) ? reg.sources : [];
  if (src.indexOf("finding_map") >= 0) return (relCond && NEXT_TEST_ROUTE_STEP[relCond.route]) || "slit_lamp";
  if (src.indexOf("symptom_chip") >= 0 || src.indexOf("dictionary") >= 0) return "chief_complaint";
  return (relCond && NEXT_TEST_ROUTE_STEP[relCond.route]) || "slit_lamp";
}

function computeNextTests(results, tokens) {
  if (!results || results.length < 2) return [];
  var present = Object.create(null);
  for (var pi = 0; pi < tokens.length; pi++) present[tokens[pi]] = true;

  /* Focus = the leader plus close rivals actually in contention. Only worth
     suggesting a discriminating finding when ≥2 candidates compete. */
  var leader = results[0];
  if (!leader || leader.score <= 0) return [];
  var focus = [];
  for (var i = 0; i < results.length && focus.length < 5; i++) {
    var r = results[i];
    if (r.score <= 0) continue;
    if (i === 0 || r.score >= leader.score - 0.30) focus.push(r);
  }
  if (focus.length < 2) return [];

  /* Candidate discriminators = the focus conditions' objective tests +
     supportive + contradicting features, not already present and enterable.
     Track, per token, which focus conditions it would CONFIRM vs argue
     AGAINST (by focus index). */
  var cand = Object.create(null);   /* token-keyed — see kbMap(), loader.js */
  for (var f = 0; f < focus.length; f++) {
    var c = findCondition(focus[f].name);
    if (!c) continue;
    var lists = [
      { arr: c.tests || [], kind: "confirm", isTest: true },
      { arr: c.sup || [], kind: "confirm", isTest: false },
      { arr: c.con || [], kind: "exclude", isTest: false }
    ];
    for (var li = 0; li < lists.length; li++) {
      var arr = lists[li].arr;
      for (var ai = 0; ai < arr.length; ai++) {
        var tok = arr[ai];
        if (present[tok] || !isEnterableToken(tok)) continue;
        if (!cand[tok]) cand[tok] = { confirm: [], exclude: [], isTest: false };
        if (lists[li].kind === "confirm") {
          if (cand[tok].confirm.indexOf(f) < 0) cand[tok].confirm.push(f);
          if (lists[li].isTest) cand[tok].isTest = true;
        } else {
          if (cand[tok].exclude.indexOf(f) < 0) cand[tok].exclude.push(f);
        }
      }
    }
  }

  /* Score by DISCRIMINATION power. A finding shared by every focus condition
     (and ruling none out) tells you nothing — skip it. A finding that lifts
     the leader above some rivals, or clears a competitor, is most useful. */
  var scored = [];
  for (var tok in cand) {
    var info = cand[tok];
    var affected = {};
    for (var x = 0; x < info.confirm.length; x++) affected[info.confirm[x]] = true;
    for (var y = 0; y < info.exclude.length; y++) affected[info.exclude[y]] = true;
    if (Object.keys(affected).length === 0) continue;
    if (info.confirm.length === focus.length && info.exclude.length === 0) continue;

    var value = info.confirm.length * 1.0 + info.exclude.length * 1.2;
    var confirmsLeader = info.confirm.indexOf(0) >= 0;
    var excludesLeader = info.exclude.indexOf(0) >= 0;
    if (confirmsLeader && info.confirm.length < focus.length) value += 1.5;
    if (info.exclude.length > 0 && !excludesLeader) value += 1.5; /* clears a rival */
    if (info.isTest) value += 0.4;                                /* objective > subjective */

    scored.push({ token: tok, value: value, info: info });
  }
  if (!scored.length) return [];
  scored.sort(function (a, b) {
    if (b.value !== a.value) return b.value - a.value;
    return a.token < b.token ? -1 : (a.token > b.token ? 1 : 0);
  });

  var labels = buildNextTestLabels();
  var out = [];
  for (var s = 0; s < scored.length && out.length < 4; s++) {
    var it = scored[s], nfo = it.info;
    var confirmNames = [], excludeNames = [];
    for (var ci = 0; ci < nfo.confirm.length; ci++) confirmNames.push(focus[nfo.confirm[ci]].name);
    for (var ei = 0; ei < nfo.exclude.length; ei++) excludeNames.push(focus[nfo.exclude[ei]].name);
    var relIdx = nfo.confirm.length ? nfo.confirm[0] : nfo.exclude[0];
    var relCond = findCondition(focus[relIdx].name);
    var target = nextTestTarget(it.token, relCond);
    out.push({
      token: it.token,
      label: labels[it.token] || prettyToken(it.token),
      confirms: confirmNames,
      excludes: excludeNames,
      isTest: nfo.isTest,
      target: target
    });
  }
  return out;
}
