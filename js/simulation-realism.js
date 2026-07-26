/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CASE REALISM                                           */
/*                                                                  */
/* A textbook case is a teaching aid, not a patient. Measured across */
/* the whole knowledge base, a case built straight from a condition's */
/* own tokens put the correct answer 1st or 2nd in the engine's list */
/* 132 times out of 132. It could not do otherwise: the case was     */
/* built from the very tokens the engine ranks with. A simulator     */
/* whose engine is never wrong teaches one lesson — trust the engine */
/* — which is the opposite of what an advisory-only product exists   */
/* to teach.                                                        */
/*                                                                  */
/* This file makes cases behave like patients, in three ways that    */
/* real patients differ from textbooks:                             */
/*                                                                  */
/*   INCOMPLETE — not every supporting feature is present, or the    */
/*     patient cannot articulate it.                                 */
/*   COMORBID   — the patient has a second, unrelated problem, whose */
/*     findings pull on the differential. Both problems are true, so */
/*     naming either is accepted and the debrief names both. This is */
/*     the product's own "multiple independent problems" idea, used  */
/*     for teaching.                                                 */
/*   DISCORDANT — the engine's top answer is deliberately NOT the    */
/*     truth. This is the most valuable case in the whole simulator  */
/*     and the only honest way to teach decision support: the        */
/*     student sees the ranking be wrong, and the debrief explains   */
/*     which findings misled it and which one discriminates.         */
/*                                                                  */
/* NOTHING HERE IS INVENTED. Every finding added or removed already  */
/* belongs to some condition in the knowledge base; a confuser is    */
/* only ever a condition that ALREADY shares findings with the       */
/* truth. No new clinical claim is created, and each case is         */
/* VERIFIED by running the real engine over it before it is used —   */
/* a case that does not actually behave as intended is discarded     */
/* rather than shown.                                                */
/*                                                                  */
/* ── SAFETY ────────────────────────────────────────────────────── */
/* A discordant case may mislead the RANKING. It may never suppress  */
/* a RED FLAG. The truth keeps all of its defining findings, and a   */
/* discordant case built on an urgent condition is only accepted if  */
/* the engine still raises its urgent alert. That makes the strongest */
/* teaching point in the product: the ranking was wrong and the      */
/* safety alert was still there — which is exactly why alerts are    */
/* never ranked, never scored, and never suppressed.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var SIM_REALISM = [
  { id: "textbook", label: "Textbook", chip: "📘",
    blurb: "The classic picture, every feature present. Learn the pattern." },
  { id: "incomplete", label: "Incomplete", chip: "◐",
    blurb: "Some supporting features absent — as patients often are." },
  { id: "comorbid", label: "Two problems", chip: "⧉",
    blurb: "The patient has a second, separate problem pulling on the picture." },
  { id: "discordant", label: "Engine misled", chip: "⚠",
    blurb: "The copilot's top answer is wrong. Work out why." }
];

function simRealism(id) {
  for (var i = 0; i < SIM_REALISM.length; i++) if (SIM_REALISM[i].id === id) return SIM_REALISM[i];
  return SIM_REALISM[0];
}

/* Which kinds of case a tier serves. A beginner meets the classic picture
   first; the harder tiers are where patients stop cooperating. */
var SIM_TIER_REALISM = {
  guided:    ["textbook"],
  standard:  ["textbook", "textbook", "incomplete"],
  challenge: ["incomplete", "comorbid", "discordant"],
  osce:      ["textbook", "incomplete", "comorbid", "discordant"]
};

function simPickRealism(tierId) {
  var pool = SIM_TIER_REALISM[tierId] || SIM_TIER_REALISM.standard;
  return pool[Math.floor(Math.random() * pool.length)];
}


/* ── Running the engine on a candidate without disturbing the exam ─ */

/* Score a token set through the REAL engine on a scratch visit. Returns the
   ranked list and any alerts, so a candidate case can be checked against what
   the engine will actually do rather than what we hope it will do. */
function simTrialRun(tokens, age) {
  if (typeof blankVisit !== "function" || typeof runDiagnosticEngine !== "function") return null;
  var savedV = (typeof V !== "undefined") ? V : null;
  var savedP = (typeof P !== "undefined") ? P : null;
  try {
    V = blankVisit();
    P = (typeof blankPatient === "function") ? blankPatient() : {};
    P.age = age || "";
    V.symptoms = tokens.slice();
    runDiagnosticEngine();
    return {
      dx: (V.dxList || []).map(function (d) { return { n: d.n, prob: d.prob, evidence: d.evidence }; }),
      alerts: (V.alerts || []).map(function (a) { return { l: a.l, m: a.m }; })
    };
  } catch (e) {
    return null;
  } finally {
    if (savedV) V = savedV;
    if (savedP) P = savedP;
  }
}

function simRankOf(trial, name) {
  if (!trial) return -1;
  for (var i = 0; i < trial.dx.length; i++) if (trial.dx[i].n === name) return i + 1;
  return -1;
}

function simHasUrgentAlert(trial) {
  return !!(trial && trial.alerts.some(function (a) { return a.l === "urgent"; }));
}


/* ── INCOMPLETE ──────────────────────────────────────────────────── */

/* Drop some supporting findings. Defining findings (`req`) are never touched:
   without them the case is not answerable and the exercise becomes a guess. */
function simMakeIncomplete(theCase, kb) {
  var req = (kb.req || []);
  var optional = theCase.present.filter(function (t) { return req.indexOf(t) < 0; });
  if (optional.length < 2) return null;

  var drop = {};
  var nDrop = Math.max(1, Math.floor(optional.length * (0.35 + Math.random() * 0.3)));
  for (var i = 0; i < nDrop; i++) {
    drop[optional[Math.floor(Math.random() * optional.length)]] = true;
  }
  var kept = theCase.present.filter(function (t) { return !drop[t]; });

  var trial = simTrialRun(kept, theCase.age);
  /* Still answerable? The truth must remain reachable, or we have built an
     unfair case rather than an incomplete one. */
  if (simRankOf(trial, theCase.condition) < 0) return null;

  theCase.present = kept;
  theCase.realism = "incomplete";
  theCase.omitted = Object.keys(drop);
  return theCase;
}


/* ── COMORBID ────────────────────────────────────────────────────── */

/* A second, genuinely separate problem. Chosen from a DIFFERENT domain so it
   is a second diagnosis rather than a near-miss, non-urgent so the simulator
   never manufactures an emergency, and non-contradictory in both directions. */
function simPickComorbid(kb) {
  if (typeof KNOWLEDGE_ALL === "undefined") return null;
  var primaryTokens = [].concat(kb.req || [], kb.sup || [], kb.tests || []);
  var primaryCon = kb.con || [];

  var pool = KNOWLEDGE_ALL.filter(function (c) {
    if (c.name === kb.name) return false;
    if (c.urgent) return false;
    if ((c.domain || "Other") === (kb.domain || "Other")) return false;
    if (!(c.req || []).length) return false;
    var theirs = [].concat(c.req || [], c.sup || []);
    /* No contradiction in either direction. */
    for (var i = 0; i < theirs.length; i++) if (primaryCon.indexOf(theirs[i]) >= 0) return false;
    for (var j = 0; j < primaryTokens.length; j++) if ((c.con || []).indexOf(primaryTokens[j]) >= 0) return false;
    return true;
  });
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

function simMakeComorbid(theCase, kb) {
  var second = simPickComorbid(kb);
  if (!second) return null;

  var extra = (second.req || []).concat((second.sup || []).slice(0, 2));
  var merged = theCase.present.slice();
  extra.forEach(function (t) { if (merged.indexOf(t) < 0) merged.push(t); });

  var trial = simTrialRun(merged, theCase.age);
  /* Both problems must still be reachable — that IS the teaching point. */
  if (simRankOf(trial, theCase.condition) < 0) return null;
  if (simRankOf(trial, second.name) < 0) return null;

  theCase.present = merged;
  theCase.realism = "comorbid";
  theCase.comorbid = second.name;
  /* Two things are genuinely wrong with this patient, so naming either is a
     defensible answer and the debrief names both. Marking a student wrong for
     spotting the second problem would be teaching them not to look. */
  theCase.acceptable = [theCase.condition, second.name];
  return theCase;
}


/* ── DISCORDANT — the engine's top answer is wrong ───────────────── */

/* A confuser must ALREADY share findings with the truth in the knowledge base.
   That is what keeps this honest: the confusion is one the KB itself contains,
   not a misleading picture invented for the exercise. */
function simPickConfuser(kb) {
  if (typeof KNOWLEDGE_ALL === "undefined") return null;
  var mine = {};
  (kb.req || []).concat(kb.sup || []).forEach(function (t) { mine[t] = true; });

  var scored = [];
  KNOWLEDGE_ALL.forEach(function (c) {
    if (c.name === kb.name || !(c.req || []).length) return;
    var shared = 0;
    (c.req || []).concat(c.sup || []).forEach(function (t) { if (mine[t]) shared++; });
    if (shared >= 2) scored.push({ c: c, shared: shared });
  });
  if (!scored.length) return null;
  scored.sort(function (a, b) { return b.shared - a.shared; });
  /* Pick from the most-overlapping few, so the confusion is a real one. */
  var top = scored.slice(0, 6);
  return top[Math.floor(Math.random() * top.length)].c;
}

function simMakeDiscordant(theCase, kb) {
  var confuser = simPickConfuser(kb);
  if (!confuser) return null;

  var req = (kb.req || []);
  var primaryCon = kb.con || [];

  /* Keep every defining finding of the truth — the student must be ABLE to get
     it right, and (for an urgent condition) the red flag must still be raised.
     Thin the truth's supporting findings, then add the confuser's own, so the
     weight of evidence tips the ranking without the truth becoming unreachable. */
  var kept = theCase.present.filter(function (t) {
    return req.indexOf(t) >= 0 || Math.random() < 0.35;
  });
  var added = [];
  (confuser.req || []).concat((confuser.sup || []).slice(0, 3)).forEach(function (t) {
    if (kept.indexOf(t) >= 0) return;
    if (primaryCon.indexOf(t) >= 0) return;   /* never contradict the truth */
    kept.push(t); added.push(t);
  });
  if (!added.length) return null;

  var trial = simTrialRun(kept, theCase.age);
  if (!trial || !trial.dx.length) return null;

  /* VERIFIED, not hoped for: the engine must actually rank the confuser first,
     and the truth must still be somewhere in the list. */
  if (trial.dx[0].n !== confuser.name) return null;
  var truthRank = simRankOf(trial, theCase.condition);
  if (truthRank < 0) return null;

  /* SAFETY GATE. If the truth is urgent, its red flag must still fire. A case
     that mutes a red flag is never shown, whatever it would teach. */
  if (kb.urgent && !simHasUrgentAlert(trial)) return null;

  /* There must be something that SEPARATES the two, and the student must have
     been shown it. Without a discriminator the case is not hard, it is unfair:
     nothing on the chart could have told them apart, and the debrief would have
     no lesson beyond "the engine was wrong". Reject those. */
  var discriminators = req.filter(function (t) {
    return kept.indexOf(t) >= 0 &&
           (confuser.req || []).indexOf(t) < 0 &&
           (confuser.sup || []).indexOf(t) < 0;
  });
  if (!discriminators.length) return null;

  theCase.present = kept;
  theCase.realism = "discordant";
  theCase.misledBy = confuser.name;
  theCase.misledByRank = 1;
  theCase.truthRank = truthRank;
  /* The findings that pulled the engine the wrong way, and the ones that
     should have held the student to the truth — both from the KB. */
  theCase.misleadingFindings = added;
  theCase.discriminators = discriminators;
  return theCase;
}


/* ── Entry point ─────────────────────────────────────────────────── */

/* Apply a realism mode to a freshly built case. Returns the case (mutated) on
   success, or the untouched textbook case if the mode could not be built for
   this condition — a student always gets a usable case rather than an error. */
function simApplyRealism(theCase, mode) {
  if (!theCase || !mode || mode === "textbook") {
    if (theCase) theCase.realism = "textbook";
    return theCase;
  }
  var kb = (typeof findCondition === "function") ? findCondition(theCase.condition) : null;
  if (!kb) { theCase.realism = "textbook"; return theCase; }

  var snapshot = theCase.present.slice();
  var out = null;
  if (mode === "incomplete") out = simMakeIncomplete(theCase, kb);
  else if (mode === "comorbid") out = simMakeComorbid(theCase, kb);
  else if (mode === "discordant") out = simMakeDiscordant(theCase, kb);

  if (!out) {
    theCase.present = snapshot;
    theCase.realism = "textbook";
    return theCase;
  }
  /* Regroup by exam step — the finding set changed. */
  var byStep = {};
  out.present.forEach(function (t) {
    var st = simStepForToken(t);
    (byStep[st] = byStep[st] || []).push(t);
  });
  out.byStep = byStep;
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SIM_REALISM: SIM_REALISM, SIM_TIER_REALISM: SIM_TIER_REALISM };
}
