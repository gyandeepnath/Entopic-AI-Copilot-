/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE — WHAT COUNTS AS EVIDENCE                                 */
/*                                                                  */
/* The rules that decide which recorded tokens can support a        */
/* condition, and how much. Split out of js/engine.js (2026-10-27)   */
/* when the second engine audit added two of them; together they    */
/* are one concern, and the scorer is easier to read without them:  */
/*                                                                  */
/*  - CONTEXT-ONLY tokens (age, background history) sharpen a        */
/*    differential but never create one;                            */
/*  - each finding is counted ONCE, in its strongest class;          */
/*  - a finding most of the knowledge base lists is too common to    */
/*    establish any one condition by itself;                         */
/*  - a finding only a few conditions list is distinctive — enough   */
/*    for a half-matched urgent condition to raise its banner;       */
/*  - which findings a diagnosis should account for;                 */
/*  - when a finding belongs to a second, separate problem and so is */
/*    not evidence against the first.                                */
/*                                                                  */
/* Load order: after knowledge/clinical-thresholds.js (reads         */
/* scoreThreshold) and before js/engine.js, which calls all of it.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════════════════════════════════════════════════ */
/* CONTEXT-ONLY TOKENS                                              */
/*                                                                  */
/* These describe WHO the patient is, or their background risk —    */
/* not what is wrong with the eye. They legitimately sharpen a       */
/* differential that real findings have already raised, but a        */
/* condition must NEVER enter the differential on them alone.        */
/* Typing an age, or ticking "diabetic", is not a clinical finding:  */
/* before this rule, entering age 6 and nothing else put             */
/* Retinoblastoma in the differential on `young_age` with its        */
/* required `leukocoria` still missing.                              */
/*                                                                  */
/* Temporal descriptors (acute/chronic/…) are deliberately absent —  */
/* they are handled separately and never count as evidence either.   */
/* ═══════════════════════════════════════════════════════════════ */
var CONTEXT_ONLY_TOKENS = {
  /* demographics */
  young_age: 1, older_age: 1, age_related: 1, age_over_40: 1,
  /* background / risk history */
  family_history: 1,
  diabetes_history: 1, hypertension_history: 1, autoimmune_history: 1,
  thyroid_history: 1, eczema_history: 1, ra_history: 1, sle_history: 1,
  ms_history: 1, migraine_history: 1,
  blepharitis_history: 1, contact_lens_history: 1, trauma_history: 1,
  steroid_history: 1, stress_history: 1,
  recent_viral_history: 1, history_trauma_or_infection: 1
};

/* Own property only — an inherited one answering here would make EVERY token
   context-only at once, draining every condition's evidence (kbMap(), loader.js). */
function isContextOnlyToken(t) {
  return Object.prototype.hasOwnProperty.call(CONTEXT_ONLY_TOKENS, t) && !!CONTEXT_ONLY_TOKENS[t];
}


/* How many clinical facts an encounter holds, for the sparse-evidence rule.
   Demographic and background-risk tokens are not facts about the eye
   (CONTEXT_ONLY_TOKENS). The onset and course descriptors count once
   between them: one "sudden" selection emits sudden_onset, acute and
   acute_bias, which is one thing the patient said, not three. */
var TEMPORAL_DESCRIPTOR_TOKENS = {
  acute: 1, subacute: 1, chronic: 1, sudden_onset: 1, gradual_onset: 1,
  subacute_onset: 1, acute_bias: 1, chronic_bias: 1, progressive: 1,
  intermittent: 1, recurrent: 1, variable: 1, stable: 1, seasonal: 1,
  gradual: 1, constant: 1, episodic: 1
};
function engineFactCount(tokens) {
  var n = 0, temporal = false;
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (isContextOnlyToken(t)) continue;
    if (Object.prototype.hasOwnProperty.call(TEMPORAL_DESCRIPTOR_TOKENS, t)) { temporal = true; continue; }
    n++;
  }
  return n + (temporal ? 1 : 0);
}

/* A condition's evidence lists with every token in exactly ONE class —
   required, else objective test, else supportive — and no repeats. Cached on
   the condition (keyed to its lists) because scoring runs on every keystroke;
   a KB edit replaces the arrays, which invalidates the cache. */
function engineEvidenceClasses(condition) {
  var req = condition.req || [], sup = condition.sup || [], tests = condition.tests || [];
  var c = condition._evClasses;
  if (c && c.src[0] === req && c.src[1] === sup && c.src[2] === tests) return c;
  var seen = Object.create(null);
  function uniq(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (seen[t]) continue;
      seen[t] = true;
      out.push(t);
    }
    return out;
  }
  var r = uniq(req), x = uniq(tests), s = uniq(sup);
  c = { req: r, tests: x, sup: s, src: [req, sup, tests] };
  try {
    Object.defineProperty(condition, "_evClasses", { value: c, configurable: true, writable: true, enumerable: false });
  } catch (e) { /* a frozen condition is simply not cached */ }
  return c;
}

/* ═══════════════════════════════════════════════════════════════ */
/* HOW DISTINCTIVE A FINDING IS — measured from the knowledge base  */
/*                                                                  */
/* df(t) = how many core conditions list t at all (required,        */
/* supportive or test). Nothing clinical is assumed: it is a count  */
/* over the KB the founder signs off, recomputed when the KB grows.  */
/*                                                                  */
/* Two uses (second engine audit, 2026-10-27):                      */
/*  - NON-DISCRIMINATING: a finding listed by more than half of all  */
/*    conditions points to none of them. "Reduced vision" (212 of    */
/*    394) was the sole required finding of Optic Atrophy, Cortical  */
/*    Visual Impairment and Optic Neuritis, so ANY presentation with  */
/*    reduced vision showed all three at 60% with nothing else in     */
/*    support — a 70-year-old with gradual blur got "Optic Atrophy    */
/*    60%". Like age and background history, it now sharpens a       */
/*    differential but cannot create one by itself.                  */
/*  - DISTINCTIVE: a finding listed by only a few conditions. Lets a  */
/*    half-matched urgent condition still raise its banner when what  */
/*    IS present is its hallmark (a high-speed particle injury).      */
/* ═══════════════════════════════════════════════════════════════ */
var _ENGINE_DF = { key: "", df: null, n: 0 };
function engineTokenDf() {
  var all = (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) ? KNOWLEDGE_ALL : [];
  var key = String(all.length);
  if (_ENGINE_DF.df && _ENGINE_DF.key === key) return _ENGINE_DF;
  var df = Object.create(null);
  for (var i = 0; i < all.length; i++) {
    var c = all[i], seen = Object.create(null);
    var lists = [c.req || [], c.sup || [], c.tests || []];
    for (var l = 0; l < lists.length; l++) {
      for (var j = 0; j < lists[l].length; j++) {
        var t = lists[l][j];
        if (seen[t]) continue;
        seen[t] = true;
        df[t] = (df[t] || 0) + 1;
      }
    }
  }
  _ENGINE_DF = { key: key, df: df, n: all.length };
  return _ENGINE_DF;
}

function isNonDiscriminatingToken(t) {
  var d = engineTokenDf();
  if (!d.n) return false;
  return ((d.df[t] || 0) / d.n) > scoreThreshold("nondiscriminating_share", 0.5);
}

function isDistinctiveToken(t) {
  var d = engineTokenDf();
  var n = d.df[t] || 0;
  return n > 0 && n <= scoreThreshold("derived_alert_partial_df_max", 5);
}

/* The FACTS a diagnosis should account for. collectTokens records what was
   actually entered — one tapped finding, measurement or selector is one fact
   however many tokens it emits (IOP 48 gives high_iop AND very_high_iop) — and
   _engineDifferential registers them for the run's token list. Counting tokens
   instead made Acute Angle Closure "fail to explain" high_iop because it lists
   very_high_iop, on its own textbook presentation. A fact counts only if it
   holds a real, discriminating finding some condition in the KB lists;
   background (history, age, medication) records no facts at all. Without
   registered facts (a direct call with an arbitrary token list) each relevant
   token stands for itself. */
var _ENGINE_FACTS = { facts: null, tokens: null };
function engineSetFacts(facts, tokens) {
  _ENGINE_FACTS = { facts: Array.isArray(facts) ? facts : null, tokens: tokens || null };
}

var _ENGINE_PF = { tokens: null, facts: null, key: "", list: [] };
function enginePresentationFacts(tokens) {
  var d = engineTokenDf();
  var facts = (_ENGINE_FACTS.facts && _ENGINE_FACTS.tokens === tokens) ? _ENGINE_FACTS.facts : null;
  if (_ENGINE_PF.tokens === tokens && _ENGINE_PF.facts === facts && _ENGINE_PF.key === d.key) return _ENGINE_PF.list;
  var present = Object.create(null);
  for (var i = 0; i < (tokens || []).length; i++) present[tokens[i]] = true;
  function relevant(t) { return present[t] && (d.df[t] || 0) > 0 && isSubstantiveToken(t); }
  var list = [];
  if (facts) {
    for (var f = 0; f < facts.length; f++) {
      var g = facts[f].filter(relevant);
      if (g.length) list.push(g);
    }
  } else {
    for (var t in present) if (relevant(t)) list.push([t]);
  }
  _ENGINE_PF = { tokens: tokens, facts: facts, key: d.key, list: list };
  return list;
}

/* Which of the presentation's facts a condition accounts for — one boolean per
   fact, true when the condition lists any token of it. Cached per run (the
   token list is a new array every run) because stage 7b asks pairwise. */
var _ENGINE_XF = { tokens: null, facts: null, map: null };
function engineExplainedFacts(condition, tokens) {
  var pf = enginePresentationFacts(tokens);
  if (_ENGINE_XF.tokens !== tokens || _ENGINE_XF.facts !== pf) _ENGINE_XF = { tokens: tokens, facts: pf, map: new Map() };
  var hit = _ENGINE_XF.map.get(condition);
  if (hit) return hit;
  var cls = engineEvidenceClasses(condition), own = Object.create(null);
  cls.req.concat(cls.sup, cls.tests).forEach(function (t) { own[t] = true; });
  hit = pf.map(function (f) { return f.some(function (t) { return own[t]; }); });
  _ENGINE_XF.map.set(condition, hit);
  return hit;
}

/* A match that counts as a real, discriminating clinical finding. */
function isSubstantiveToken(t) {
  return !isContextOnlyToken(t) && !isNonDiscriminatingToken(t);
}

/* ═══════════════════════════════════════════════════════════════ */
/* A SECOND PROBLEM'S FINDINGS ARE NOT EVIDENCE AGAINST THE FIRST    */
/*                                                                  */
/* A contradiction says "if it were THIS, you would not see that".   */
/* True of one problem — but a patient can have two. Allergic        */
/* conjunctivitis lists photophobia against it; uveitis lists         */
/* itching. Present both, fully, and each was cut to 55% by the       */
/* other's findings while a thin entry with no contradictions        */
/* (Traumatic Iritis, required finding "pain") led the list with no   */
/* trauma recorded. Measured over 621 such two-problem presentations  */
/* (second engine audit, 2026-10-27): the contradicted condition was  */
/* shown 157 times, and in 454 of the 464 misses the contradiction    */
/* alone kept it off.                                                 */
/*                                                                  */
/* So a contradicting finding is set aside — not counted, and named   */
/* in the evidence trail — only when ALL of these hold:              */
/*  - another condition that lists it has every required finding     */
/*    present, and                                                   */
/*  - EACH of the two explains at least k recorded findings the other */
/*    does not, the contested finding not counted — two separate      */
/*    pictures, not one picture with a stray finding. "Itchy, red,    */
/*    painful, light-sensitive eye" is one picture: the itch still    */
/*    counts against uveitis.                                        */
/* The condition named is the one that accounts for most of the     */
/* other picture. Never for who the patient is, when it started,     */
/* which eye, or a NORMAL result: no second disease produces those.   */
/* A common finding (reduced vision) CAN be explained by the second   */
/* problem — that is exactly the cataract beside the blepharitis.     */
/* ═══════════════════════════════════════════════════════════════ */
var NON_ATTRIBUTABLE_TOKENS = { bilateral: 1, unilateral: 1 };
function isAttributableToken(t) {
  return !isContextOnlyToken(t) && !/^normal_/.test(t) &&
    !Object.prototype.hasOwnProperty.call(TEMPORAL_DESCRIPTOR_TOKENS, t) &&
    !Object.prototype.hasOwnProperty.call(NON_ATTRIBUTABLE_TOKENS, t);
}

/* results: scored candidates (score, _scoreDetail); condOf(name) → condition.
   Returns { conditionName: { token: nameOfConditionItIsAttributedTo } }. */
function engineAttributeContradictions(results, tokens, condOf) {
  var out = Object.create(null);
  var pf = enginePresentationFacts(tokens);
  var k = scoreThreshold("second_problem_min_findings", 2);
  if (pf.length < 2 * k + 1) return out;
  var present = Object.create(null);
  for (var i = 0; i < tokens.length; i++) present[tokens[i]] = true;

  function lists(c, t) {
    var cls = engineEvidenceClasses(c);
    return cls.req.indexOf(t) >= 0 || cls.sup.indexOf(t) >= 0 || cls.tests.indexOf(t) >= 0;
  }

  /* Conditions able to account for a finding: every required finding present. */
  var anchors = results.filter(function (r) {
    var d = r._scoreDetail;
    return r.score > 0 && d && d.reqMissing === 0 && d.reqMatched > 0 && condOf(r.name);
  }).sort(function (a, b) { return b.score - a.score; });

  for (var ri = 0; ri < results.length; ri++) {
    var r = results[ri];
    if (!r._scoreDetail || !r._scoreDetail.conMatched) continue;
    var cA = condOf(r.name);
    if (!cA || !cA.con) continue;
    for (var ci = 0; ci < cA.con.length; ci++) {
      var t = cA.con[ci];
      if (!present[t] || !isAttributableToken(t)) continue;
      var best = null, bestOnly = 0;
      for (var bi = 0; bi < anchors.length; bi++) {
        var cB = condOf(anchors[bi].name);
        if (cB === cA || !lists(cB, t)) continue;
        var fa = engineExplainedFacts(cA, tokens), fb = engineExplainedFacts(cB, tokens), aOnly = 0, bOnly = 0;
        for (var f = 0; f < pf.length; f++) {
          if (fa[f] && !fb[f]) aOnly++;
          else if (fb[f] && !fa[f] && pf[f].indexOf(t) < 0) bOnly++;
        }
        /* anchors run highest score first, so a tie keeps the better-scored */
        if (aOnly >= k && bOnly >= k && bOnly > bestOnly) { best = cB; bestOnly = bOnly; }
      }
      if (best) (out[r.name] = out[r.name] || Object.create(null))[t] = best.name;
    }
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONTEXT_ONLY_TOKENS: CONTEXT_ONLY_TOKENS, isContextOnlyToken: isContextOnlyToken,
    engineFactCount: engineFactCount, engineEvidenceClasses: engineEvidenceClasses,
    engineTokenDf: engineTokenDf, isNonDiscriminatingToken: isNonDiscriminatingToken,
    isDistinctiveToken: isDistinctiveToken, isSubstantiveToken: isSubstantiveToken,
    enginePresentationFacts: enginePresentationFacts, engineSetFacts: engineSetFacts,
    isAttributableToken: isAttributableToken, engineExplainedFacts: engineExplainedFacts,
    engineAttributeContradictions: engineAttributeContradictions
  };
}
