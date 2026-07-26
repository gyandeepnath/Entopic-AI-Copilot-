/* ═══════════════════════════════════════════════════════════════ */
/* CASE REALISM — incomplete, comorbid, and engine-misled cases      */
/*                                                                  */
/* The point of this layer is that the engine can be WRONG in front  */
/* of a student, because a simulator whose engine is never wrong     */
/* teaches automation bias. That is a powerful teaching device and a */
/* dangerous one, so it is fenced by tests:                          */
/*                                                                  */
/*   • Nothing may be invented. Every finding added comes from a     */
/*     real KB condition; a confuser must ALREADY share findings     */
/*     with the truth.                                              */
/*   • The truth must stay reachable. A case the student cannot      */
/*     get right is unfair, not hard.                               */
/*   • A RED FLAG MUST NEVER BE MUTED. Misleading the ranking is     */
/*     allowed; suppressing an urgent alert is not, ever.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
vm.runInContext(`
  globalThis.localStorage = { getItem: function () { return null; }, setItem: function () {},
                              removeItem: function () {}, clear: function () {} };
  globalThis.CU = { username: "student1", role: "student" };
  globalThis.toast = function () {}; globalThis.logAudit = function () {};
  globalThis.V = blankVisit(); globalThis.P = blankPatient();
`, eng.context);

[
  "knowledge/common-conditions.js",
  "knowledge/condition-info.js",
  "js/simulation-progress.js",
  "js/simulation-presentation.js",
  "js/simulation-realism.js",
  "js/simulation.js"
].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), eng.context, { filename: f });
});

const evalIn = (expr) => vm.runInContext(expr, eng.context);
const evalJson = (expr) => JSON.parse(evalIn("JSON.stringify(" + expr + ")"));

/* Build many cases of one realism mode across the KB, keeping only the ones
   that actually came out in that mode (a mode falls back to textbook when it
   cannot be built for a given condition). */
function harvest(mode, limit) {
  return evalJson(`(function () {
    var out = [];
    var pool = KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; });
    for (var i = 0; i < pool.length && out.length < ${limit || 40}; i++) {
      var c = simBuildRealisticCase(pool[i].name, null, { realism: ${JSON.stringify(mode)} });
      if (c && c.realism === ${JSON.stringify(mode)}) out.push(c);
    }
    return out;
  })()`);
}


/* ── Nothing invented ────────────────────────────────────────────── */

test("every finding in a realistic case belongs to some real KB condition", () => {
  const bad = evalJson(`(function () {
    var known = {};
    KNOWLEDGE_ALL.forEach(function (c) {
      (c.req || []).concat(c.sup || [], c.tests || []).forEach(function (t) { known[t] = 1; });
    });
    var hits = [];
    ["incomplete", "comorbid", "discordant"].forEach(function (mode) {
      var pool = KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; });
      for (var i = 0; i < pool.length && hits.length < 5; i += 3) {
        var c = simBuildRealisticCase(pool[i].name, null, { realism: mode });
        if (!c) continue;
        c.present.forEach(function (t) { if (!known[t]) hits.push(mode + ":" + c.condition + ":" + t); });
      }
    });
    return hits;
  })()`);
  assert.deepStrictEqual(bad, [], "a finding appeared that no KB condition asserts");
});

test("a confuser already shares findings with the truth in the KB", () => {
  const cases = harvest("discordant", 25);
  assert.ok(cases.length > 5, `expected discordant cases to be buildable, got ${cases.length}`);
  const bad = [];
  for (const c of cases) {
    const shared = evalIn(`(function () {
      var a = findCondition(${JSON.stringify(c.condition)});
      var b = findCondition(${JSON.stringify(c.misledBy)});
      if (!a || !b) return -1;
      var mine = {};
      (a.req || []).concat(a.sup || []).forEach(function (t) { mine[t] = 1; });
      var n = 0;
      (b.req || []).concat(b.sup || []).forEach(function (t) { if (mine[t]) n++; });
      return n;
    })()`);
    if (shared < 2) bad.push(`${c.condition} vs ${c.misledBy}: ${shared} shared`);
  }
  assert.deepStrictEqual(bad, [], "a confuser was chosen that the KB does not actually confuse");
});


/* ── The truth stays reachable ───────────────────────────────────── */

test("incomplete cases keep every defining finding", () => {
  const cases = harvest("incomplete", 40);
  assert.ok(cases.length > 10, `expected incomplete cases, got ${cases.length}`);
  const bad = [];
  for (const c of cases) {
    const missing = evalJson(`(function () {
      var kb = findCondition(${JSON.stringify(c.condition)});
      var have = ${JSON.stringify(c.present)};
      return (kb.req || []).filter(function (t) { return have.indexOf(t) < 0; });
    })()`);
    if (missing.length) bad.push(`${c.condition}: dropped ${missing}`);
  }
  assert.deepStrictEqual(bad, [], "a defining finding was dropped, making the case unanswerable");
});

test("in a discordant case the truth is still somewhere in the engine's list", () => {
  const cases = harvest("discordant", 25);
  const bad = cases.filter((c) => !(c.truthRank > 0));
  assert.strictEqual(bad.length, 0,
    `truth unreachable in: ${bad.map((c) => c.condition).join(", ")}`);
});

test("a discordant case really does put the wrong condition first", () => {
  const cases = harvest("discordant", 20);
  assert.ok(cases.length > 3, "discordant cases are buildable");
  const bad = [];
  for (const c of cases) {
    const top = evalIn(`(function () {
      var t = simTrialRun(${JSON.stringify(c.present)}, ${JSON.stringify(c.age)});
      return (t && t.dx.length) ? t.dx[0].n : "";
    })()`);
    if (top !== c.misledBy) bad.push(`${c.condition}: expected ${c.misledBy} first, engine said ${top}`);
  }
  assert.deepStrictEqual(bad, [], "a case claimed to mislead the engine but does not");
});

test("a comorbid case keeps BOTH problems reachable and accepts either answer", () => {
  const cases = harvest("comorbid", 25);
  assert.ok(cases.length > 3, `expected comorbid cases, got ${cases.length}`);
  for (const c of cases) {
    assert.ok(c.comorbid, "the second problem is named");
    assert.ok(c.acceptable.indexOf(c.condition) >= 0 && c.acceptable.indexOf(c.comorbid) >= 0,
      "both diagnoses are accepted");
    const ranks = evalJson(`(function () {
      var t = simTrialRun(${JSON.stringify(c.present)}, ${JSON.stringify(c.age)});
      return [simRankOf(t, ${JSON.stringify(c.condition)}), simRankOf(t, ${JSON.stringify(c.comorbid)})];
    })()`);
    assert.ok(ranks[0] > 0 && ranks[1] > 0, `both problems must be reachable, got ranks ${ranks}`);
  }
});

test("a comorbid condition is a separate problem, not a near-miss or an emergency", () => {
  const cases = harvest("comorbid", 25);
  const bad = [];
  for (const c of cases) {
    const info = evalJson(`(function () {
      var a = findCondition(${JSON.stringify(c.condition)});
      var b = findCondition(${JSON.stringify(c.comorbid)});
      return { sameDomain: (a.domain || "") === (b.domain || ""), urgent: !!b.urgent };
    })()`);
    if (info.sameDomain) bad.push(`${c.comorbid} shares a domain with ${c.condition}`);
    if (info.urgent) bad.push(`${c.comorbid} is urgent — the simulator must not invent an emergency`);
  }
  assert.deepStrictEqual(bad, []);
});


/* ── SAFETY: a red flag is never muted ───────────────────────────── */

test("a discordant case built on an urgent condition still raises its red flag", () => {
  const bad = evalJson(`(function () {
    var hits = [];
    var urgent = KNOWLEDGE_ALL.filter(function (c) { return c.urgent && (c.req || []).length > 0; });
    for (var i = 0; i < urgent.length; i++) {
      var c = simBuildRealisticCase(urgent[i].name, null, { realism: "discordant" });
      if (!c || c.realism !== "discordant") continue;
      var t = simTrialRun(c.present, c.age);
      if (!simHasUrgentAlert(t)) hits.push(c.condition + " (misled by " + c.misledBy + ")");
    }
    return hits;
  })()`);
  assert.deepStrictEqual(bad, [],
    "misleading the RANKING is allowed; muting an urgent ALERT never is");
});

test("no realism mode ever contradicts the truth's own exclusions", () => {
  const bad = evalJson(`(function () {
    var hits = [];
    ["incomplete", "comorbid", "discordant"].forEach(function (mode) {
      var pool = KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; });
      for (var i = 0; i < pool.length && hits.length < 8; i += 2) {
        var c = simBuildRealisticCase(pool[i].name, null, { realism: mode });
        if (!c || c.realism !== mode) continue;
        var kb = findCondition(c.condition);
        (kb.con || []).forEach(function (t) {
          if (c.present.indexOf(t) >= 0) hits.push(mode + " " + c.condition + " contradicted by " + t);
        });
      }
    });
    return hits;
  })()`);
  assert.deepStrictEqual(bad, [], "a case carried a finding that rules out its own answer");
});


/* ── Tiers serve the right kind of case ──────────────────────────── */

test("Guided only ever shows the textbook picture; Challenge never does", () => {
  assert.deepStrictEqual(evalJson("SIM_TIER_REALISM.guided"), ["textbook"]);
  const challenge = evalJson("SIM_TIER_REALISM.challenge");
  assert.ok(challenge.indexOf("textbook") < 0, "Challenge should not serve textbook cases");
  assert.ok(challenge.indexOf("discordant") >= 0, "Challenge is where the engine can be wrong");
});

test("a case that cannot be made realistic falls back to textbook, never to nothing", () => {
  const r = evalJson(`(function () {
    var out = { nulls: 0, built: 0 };
    var pool = KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; });
    for (var i = 0; i < pool.length; i += 4) {
      var c = simBuildRealisticCase(pool[i].name, "challenge");
      if (!c) out.nulls++; else out.built++;
    }
    return out;
  })()`);
  assert.strictEqual(r.nulls, 0, "a student must always get a usable case");
  assert.ok(r.built > 50);
});

test("a discordant case always shows the student something that separates the two", () => {
  /* Without a discriminator on the chart the case is unfair, not hard: nothing
     the student saw could have told the conditions apart, and the debrief would
     have no lesson beyond "the engine was wrong". */
  const cases = harvest("discordant", 30);
  const bad = cases.filter((c) => !c.discriminators || !c.discriminators.length);
  assert.strictEqual(bad.length, 0,
    `no discriminating finding in: ${bad.map((c) => c.condition).join(", ")}`);
  for (const c of cases) {
    const shown = c.discriminators.every((t) => c.present.indexOf(t) >= 0);
    assert.ok(shown, `${c.condition}: a discriminator was not actually presented`);
  }
});
