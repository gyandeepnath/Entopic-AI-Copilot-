/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SIMULATION PROGRESSION, DIFFICULTY & RECOMMENDATION    */
/*                                                                  */
/* Product intent: a student should open Entopic on day 1 and find  */
/* a reason to come back on day 2. That means three things, and     */
/* this file owns all three so the logic is inspectable:            */
/*                                                                  */
/*   1. DIFFICULTY THAT TEACHES. The tiers are not cosmetic — the    */
/*      pedagogic move is switching the ENGINE OFF. At Guided the    */
/*      copilot reasons alongside you; at Challenge and OSCE it is   */
/*      hidden and you must commit unaided, then compare your        */
/*      reasoning against the engine's in the debrief. That contrast */
/*      is the lesson.                                               */
/*   2. HONEST SCORING. Examining every section must not be free, or */
/*      the optimal strategy is to brute-force. Accuracy, efficiency */
/*      and calibration are scored separately and shown separately,  */
/*      so a student can see *which* skill is weak.                  */
/*   3. A REASON TO EXPLORE. Recommendations point at the domains a  */
/*      student has never touched and the conditions they got wrong, */
/*      instead of serving random cases forever.                     */
/*                                                                  */
/* Progress is per-user and local. It is learning telemetry, never   */
/* clinical data, and is kept apart from patient storage entirely.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var SIM_TIERS = [
  { id: "guided",    label: "Guided",    icon: "🧭",
    blurb: "The copilot reasons alongside you — differentials and next-test hints stay visible.",
    engine: true,  hints: true,  answerList: true,  timed: false },
  { id: "standard",  label: "Standard",  icon: "🩺",
    blurb: "Engine visible, no hints. Work the case and commit when you are ready.",
    engine: true,  hints: false, answerList: true,  timed: false },
  { id: "challenge", label: "Challenge", icon: "🔒",
    blurb: "Engine hidden. Reason unaided, then see how your thinking compared.",
    engine: false, hints: false, answerList: false, timed: false },
  { id: "osce",      label: "OSCE",      icon: "⏱",
    blurb: "Timed station, engine hidden, structured marking — exam conditions.",
    engine: false, hints: false, answerList: false, timed: true }
];

function simTier(id) {
  for (var i = 0; i < SIM_TIERS.length; i++) if (SIM_TIERS[i].id === id) return SIM_TIERS[i];
  return SIM_TIERS[1];
}


/* ── Progress store (per user, local, learning-only) ─────────────── */

function simProgressKey() {
  var u = (typeof CU !== "undefined" && CU) ? (CU.username || "anon") : "anon";
  return "entopic_sim_progress_" + u;
}

function simLoadProgress() {
  try {
    var raw = localStorage.getItem(simProgressKey());
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { conditions: {}, domains: {}, xp: 0, streak: 0, best_streak: 0, lastDay: "", attempts: 0, correct: 0 };
}

function simSaveProgress(p) {
  try { localStorage.setItem(simProgressKey(), JSON.stringify(p)); } catch (e) {}
}

function simTodayKey() { return new Date().toISOString().slice(0, 10); }

/* Record an attempt and return the updated progress plus what changed, so the
   debrief can celebrate something specific rather than a generic "well done". */
function simRecordAttempt(result, theCase, tierId) {
  var p = simLoadProgress();
  var name = theCase.condition;
  var dom = theCase.domain || "Other";

  if (!p.conditions[name]) p.conditions[name] = { attempts: 0, correct: 0, last: "" };
  if (!p.domains[dom]) p.domains[dom] = { attempts: 0, correct: 0 };

  p.conditions[name].attempts++;
  p.domains[dom].attempts++;
  p.attempts++;
  if (result.correct) {
    p.conditions[name].correct++;
    p.domains[dom].correct++;
    p.correct++;
  }
  p.conditions[name].last = simTodayKey();

  /* XP rewards the harder tiers and the skills we want to build, not volume. */
  var tier = simTier(tierId);
  var gained = 0;
  if (result.correct) {
    gained += { guided: 10, standard: 15, challenge: 25, osce: 30 }[tier.id] || 10;
    if (result.efficiency >= 0.8) gained += 5;      /* found it without brute force */
    if (result.calibration === "well-calibrated") gained += 5;
  } else {
    gained += 3;                                     /* attempting still counts */
  }
  p.xp += gained;

  /* Daily streak. */
  var today = simTodayKey();
  if (p.lastDay !== today) {
    var y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    p.streak = (p.lastDay === y) ? (p.streak + 1) : 1;
    p.lastDay = today;
    if (p.streak > p.best_streak) p.best_streak = p.streak;
  }

  simSaveProgress(p);
  return { progress: p, xpGained: gained };
}

/* Level from XP — deliberately gentle and unbounded. */
function simLevel(xp) {
  var lvl = 1, need = 100, spent = 0;
  while (xp - spent >= need) { spent += need; lvl++; need = Math.round(need * 1.35); }
  return { level: lvl, into: xp - spent, need: need };
}

/* Mastery of a condition: needs repeat success, not one lucky guess. */
function simMastered(rec) {
  return !!(rec && rec.correct >= 2 && rec.correct / Math.max(1, rec.attempts) >= 0.66);
}

function simProgressSummary() {
  var p = simLoadProgress();
  var seen = Object.keys(p.conditions).length;
  var mastered = 0;
  for (var k in p.conditions) if (simMastered(p.conditions[k])) mastered++;
  var total = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.length : 0;
  var lv = simLevel(p.xp);
  return {
    xp: p.xp, level: lv.level, into: lv.into, need: lv.need,
    streak: p.streak, best_streak: p.best_streak,
    seen: seen, mastered: mastered, total: total,
    attempts: p.attempts, correct: p.correct,
    accuracy: p.attempts ? Math.round(100 * p.correct / p.attempts) : 0
  };
}


/* ── Recommendations: the "what should I try next" engine ────────── */

/* Domains present in the KB, with the student's record against each. */
function simDomainStats() {
  var p = simLoadProgress();
  var doms = {};
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    KNOWLEDGE_ALL.forEach(function (c) {
      var d = c.domain || "Other";
      if (!doms[d]) doms[d] = { total: 0, attempts: 0, correct: 0 };
      doms[d].total++;
    });
  }
  for (var d in p.domains) {
    if (!doms[d]) doms[d] = { total: 0, attempts: 0, correct: 0 };
    doms[d].attempts = p.domains[d].attempts;
    doms[d].correct = p.domains[d].correct;
  }
  return doms;
}

/* Up to `n` suggestions, each with a reason the student can act on. */
function simRecommendations(n) {
  n = n || 3;
  var p = simLoadProgress();
  var out = [];

  /* 1. Conditions attempted and got wrong — revisit beats re-random. */
  var wrong = Object.keys(p.conditions).filter(function (k) {
    var r = p.conditions[k];
    return r.attempts > 0 && !simMastered(r);
  });
  if (wrong.length) {
    var pick = wrong[Math.floor(Math.random() * wrong.length)];
    out.push({ kind: "revisit", condition: pick,
      label: "Revisit " + pick,
      why: "You have not got this one consistently right yet." });
  }

  /* 2. A domain never touched. */
  var doms = simDomainStats();
  var untouched = Object.keys(doms).filter(function (d) { return doms[d].total > 0 && !doms[d].attempts; });
  if (untouched.length) {
    var d0 = untouched[Math.floor(Math.random() * untouched.length)];
    out.push({ kind: "domain", domain: d0,
      label: "Try " + d0,
      why: "You have not practised anything in this area yet." });
  }

  /* 3. Weakest domain with enough attempts to mean something. */
  var weakest = null, weakestAcc = 1.1;
  for (var d in doms) {
    if (doms[d].attempts >= 3) {
      var acc = doms[d].correct / doms[d].attempts;
      if (acc < weakestAcc) { weakestAcc = acc; weakest = d; }
    }
  }
  if (weakest && weakestAcc < 0.7) {
    out.push({ kind: "domain", domain: weakest,
      label: "Work on " + weakest,
      why: Math.round(weakestAcc * 100) + "% correct so far — your weakest area." });
  }

  /* 4. Push up a tier once the current one is going well. */
  if (p.attempts >= 5 && p.correct / p.attempts >= 0.7) {
    out.push({ kind: "tier", tier: "challenge",
      label: "Step up to Challenge",
      why: "You are scoring well — try it with the engine hidden." });
  }

  /* 5. Always leave a red-flag option on the table. */
  if (out.length < n) {
    out.push({ kind: "scope", scope: "urgent",
      label: "Practise a red-flag case",
      why: "The cases where getting it wrong matters most." });
  }
  return out.slice(0, n);
}

/* Choose a case honouring a recommendation. */
function simCaseFor(rec) {
  if (!rec) return simRandomCase("common");
  if (rec.kind === "revisit" && rec.condition) return simBuildCase(rec.condition);
  if (rec.kind === "domain" && rec.domain && typeof KNOWLEDGE_ALL !== "undefined") {
    var pool = KNOWLEDGE_ALL.filter(function (c) {
      return (c.domain || "Other") === rec.domain && (c.req || []).length > 0;
    });
    if (pool.length) return simBuildCase(pool[Math.floor(Math.random() * pool.length)].name);
  }
  if (rec.kind === "scope") return simRandomCase(rec.scope);
  return simRandomCase("common");
}
