/* ═══════════════════════════════════════════════════════════════ */
/* SIMULATION · OSCE · ASSIGNMENTS — the teaching logic             */
/*                                                                  */
/* These modules decide what a student is shown, how they are       */
/* scored, and when the copilot is withheld. Three things must hold: */
/*                                                                  */
/*   1. ANTI-FABRICATION — a simulated case can only contain tokens  */
/*      the knowledge base already asserts for that condition. No    */
/*      clinical claim may originate in the teaching layer.          */
/*   2. THE SCORING MUST BE HONEST — brute-forcing every section     */
/*      cannot score the same as examining the ones that mattered,   */
/*      and OSCE safety must be marked separately from diagnosis so  */
/*      a student can pass on the name and still fail on the flag.   */
/*   3. THE ENGINE GATE IS TEACHING-ONLY — simEngineHidden() must be  */
/*      false whenever a simulation is not running, so a real exam    */
/*      can never lose its advisory panel.                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

/* Minimal browser-ish shims the teaching modules touch. */
vm.runInContext(`
  var __ls = {};
  globalThis.localStorage = {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(__ls, k) ? __ls[k] : null; },
    setItem: function (k, v) { __ls[k] = String(v); },
    removeItem: function (k) { delete __ls[k]; },
    clear: function () { __ls = {}; }
  };
  globalThis.CU = { username: "student1", role: "student" };
  globalThis.toast = function () {};
  globalThis.logAudit = function () {};
  /* The engine harness builds V/P per run; the teaching layer reads the live
     globals, so give it a visit and a patient to work against. */
  globalThis.V = blankVisit();
  globalThis.P = blankPatient();
`, eng.context);

[
  "knowledge/common-conditions.js",
  "knowledge/condition-info.js",
  "js/simulation-progress.js",
  "js/simulation.js",
  "js/osce.js",
  "js/assignments.js"
].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), eng.context, { filename: f });
});

function evalIn(expr) { return vm.runInContext(expr, eng.context); }
/* Values cross a VM realm boundary, so structural comparison must go through
   JSON rather than deepStrictEqual (whose prototypes differ across realms). */
function evalJson(expr) { return JSON.parse(evalIn("JSON.stringify(" + expr + ")")); }
function reset() { evalIn("localStorage.clear(); ASSIGN_ACTIVE = null;"); }


/* ── 1. Cases come from the KB, nothing is invented ──────────────── */

test("a simulated case contains only tokens the KB asserts for that condition", () => {
  const names = evalIn("KNOWLEDGE_ALL.filter(function(c){return (c.req||[]).length>0;}).map(function(c){return c.name;})");
  /* Check a broad sample rather than one lucky case. */
  const sample = names.filter((_, i) => i % 17 === 0);
  assert.ok(sample.length > 5, "sample is meaningful");

  for (const name of sample) {
    const ok = evalIn(`(function () {
      var c = findCondition(${JSON.stringify(name)});
      var s = simBuildCase(${JSON.stringify(name)});
      if (!s) return "no case built";
      var allowed = {};
      (c.req || []).concat(c.sup || [], c.tests || []).forEach(function (t) { allowed[t] = true; });
      for (var i = 0; i < s.present.length; i++) {
        if (!allowed[s.present[i]]) return "invented token: " + s.present[i];
      }
      /* every present token must be reachable through some exam step */
      for (var j = 0; j < s.present.length; j++) {
        if (!simStepForToken(s.present[j])) return "unroutable token: " + s.present[j];
      }
      return true;
    })()`);
    assert.strictEqual(ok, true, `${name}: ${ok}`);
  }
});

test("every case's decisive findings are exactly the condition's required tokens", () => {
  const ok = evalIn(`(function () {
    var c = findCondition("Acute Angle Closure Crisis");
    var s = simBuildCase("Acute Angle Closure Crisis");
    return JSON.stringify(s.decisive) === JSON.stringify(c.req);
  })()`);
  assert.strictEqual(ok, true);
});

test("cases carry the KB's provisional review status", () => {
  assert.strictEqual(evalIn('simBuildCase("Acute Angle Closure Crisis").review_status'), "NEEDS_CLINICAL_REVIEW");
});


/* ── 2. The engine gate is teaching-only ─────────────────────────── */

test("simEngineHidden() is false when no simulation is running", () => {
  reset();
  assert.strictEqual(evalIn("SIM.active = false; simEngineHidden()"), false);
});

test("the engine is visible at Guided/Standard and hidden at Challenge/OSCE", () => {
  const check = (tier) => evalIn(`(function () {
    SIM.active = true; SIM.answered = false; SIM.tier = ${JSON.stringify(tier)};
    return simEngineHidden();
  })()`);
  assert.strictEqual(check("guided"), false);
  assert.strictEqual(check("standard"), false);
  assert.strictEqual(check("challenge"), true);
  assert.strictEqual(check("osce"), true);
});

test("committing an answer reveals the engine again, so the debrief can compare", () => {
  const shown = evalIn(`(function () {
    SIM.active = true; SIM.tier = "challenge"; SIM.answered = true;
    return simEngineHidden();
  })()`);
  assert.strictEqual(shown, false);
  evalIn("SIM.active = false; SIM.answered = false;");
});


/* ── 3. Scoring is honest ────────────────────────────────────────── */

/* Drive a case without the DOM: reveal chosen steps, then submit. */
function runCase(condition, opts) {
  const o = Object.assign({ tier: "standard", examineAll: false, steps: null, guess: null, confidence: "" }, opts || {});
  return evalIn(`(function () {
    var c = simBuildCase(${JSON.stringify(condition)});
    SIM.active = true; SIM.theCase = c; SIM.tier = ${JSON.stringify(o.tier)};
    SIM.revealed = {}; SIM.started = Date.now(); SIM.deadline = null;
    SIM.answered = false; SIM.guess = ""; SIM.confidence = ""; SIM.score = null; SIM.osce = null;
    V.symptoms = [];

    var steps = ${o.steps ? JSON.stringify(o.steps) : "null"};
    if (steps === null) steps = Object.keys(c.byStep);
    steps.forEach(function (st) {
      SIM.revealed[st] = true;
      (c.byStep[st] || []).forEach(function (t) { if (V.symptoms.indexOf(t) < 0) V.symptoms.push(t); });
    });
    ${o.examineAll ? 'STEPS.forEach(function (s) { SIM.revealed[s.id] = true; });' : ''}

    var guess = ${o.guess === null ? "c.condition" : JSON.stringify(o.guess)};
    return simSubmit(guess, ${JSON.stringify(o.confidence)});
  })()`);
}

test("thoroughness is NOT punished — a full systematic exam scores like a focused one", () => {
  /* The old `efficiency` score gave a complete systematic examination 16% and
     knowing-where-to-look 100%, i.e. it scored anchoring and premature closure
     as skill. Examining a section that turns out normal is a negative finding,
     not waste, and must never cost a student marks. */
  reset();
  const focused = runCase("Acute Angle Closure Crisis");
  const thorough = runCase("Acute Angle Closure Crisis", { examineAll: true });
  assert.strictEqual(focused.correct, true);
  assert.strictEqual(thorough.correct, true);
  assert.strictEqual(thorough.evidence, focused.evidence,
    "opening extra sections changes nothing about the evidence held");
  assert.strictEqual(typeof focused.efficiency, "undefined", "the old score is gone");
});

test("evidence measures what was uncovered before committing", () => {
  reset();
  const withEvidence = runCase("Acute Angle Closure Crisis");
  assert.strictEqual(withEvidence.evidence, 1);
  assert.strictEqual(withEvidence.prematureClosure, false);

  const blind = runCase("Acute Angle Closure Crisis", { steps: [] });
  assert.strictEqual(blind.evidence, 0, "committed having uncovered nothing");
  assert.strictEqual(blind.prematureClosure, true, "a right answer on no evidence is a lucky guess");
  assert.strictEqual(blind.correct, true);
});

test("missing a section with findings is reported, not silently forgiven", () => {
  reset();
  const s = runCase("Acute Angle Closure Crisis", { steps: [] });
  assert.ok(s.missedSteps.length > 0, "unexamined sections are listed");
  assert.ok(s.decisiveMissed.length > 0, "undiscovered required findings are listed");
  assert.strictEqual(s.decisiveFound.length, 0);
});

test("calibration marks confident-and-wrong as over-confident", () => {
  reset();
  const over = runCase("Acute Angle Closure Crisis", { guess: "Dry Eye Disease", confidence: "High" });
  assert.strictEqual(over.correct, false);
  assert.strictEqual(over.calibration, "over-confident");

  const good = runCase("Acute Angle Closure Crisis", { confidence: "High" });
  assert.strictEqual(good.calibration, "well-calibrated");

  const under = runCase("Acute Angle Closure Crisis", { confidence: "Low" });
  assert.strictEqual(under.calibration, "under-confident");
});

test("XP rewards the harder tiers, and a wrong answer still earns something", () => {
  reset();
  const guided = runCase("Acute Angle Closure Crisis", { tier: "guided" });
  reset();
  const challenge = runCase("Acute Angle Closure Crisis", { tier: "challenge" });
  reset();
  const wrong = runCase("Acute Angle Closure Crisis", { guess: "Dry Eye Disease" });

  assert.ok(challenge.xpGained > guided.xpGained, "challenge is worth more than guided");
  assert.ok(wrong.xpGained > 0, "attempting still counts");
  assert.ok(wrong.xpGained < guided.xpGained, "but far less than getting it right");
});

test("mastery needs repeat success, not one lucky guess", () => {
  assert.strictEqual(evalIn("simMastered({ attempts: 1, correct: 1 })"), false);
  assert.strictEqual(evalIn("simMastered({ attempts: 2, correct: 2 })"), true);
  assert.strictEqual(evalIn("simMastered({ attempts: 6, correct: 2 })"), false, "2 of 6 is not mastery");
});

test("recommendations point at what the student has not done", () => {
  reset();
  runCase("Acute Angle Closure Crisis", { guess: "Dry Eye Disease" });
  const recs = evalIn("simRecommendations(3)");
  assert.ok(recs.length > 0);
  assert.ok(recs.every((r) => r.label && r.why), "every suggestion explains itself");
  assert.ok(recs.some((r) => r.kind === "revisit" && r.condition === "Acute Angle Closure Crisis"),
    "the condition they got wrong is offered again");
});


/* ── 4. OSCE marking ─────────────────────────────────────────────── */

test("OSCE weights sum to 1", () => {
  const w = evalIn("OSCE_CONFIG.weights");
  const sum = w.gathering + w.decisive + w.diagnosis + w.safety;
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
});

test("a circuit is built from distinct conditions", () => {
  const names = evalIn("osceBuild('common', 5).map(function (c) { return c.condition; })");
  assert.strictEqual(names.length, 5);
  assert.strictEqual(new Set(names).size, 5, "no station repeats");
});

test("safety is marked separately: right diagnosis, missed red flag still loses safety marks", () => {
  reset();
  /* Uncover nothing, but name the condition anyway — diagnosis full, safety nil. */
  const mark = evalIn(`(function () {
    var c = simBuildCase("Acute Angle Closure Crisis");
    c.urgent = true;
    SIM.active = true; SIM.theCase = c; SIM.tier = "osce";
    SIM.revealed = {}; SIM.started = Date.now(); SIM.deadline = null;
    SIM.answered = false; SIM.score = null; V.symptoms = [];
    var s = simSubmit(c.condition, "High");
    return osceMark(s, c);
  })()`);
  assert.strictEqual(mark.diagnosis, 1, "they named it");
  assert.strictEqual(mark.safetyApplies, true, "this station carries a red flag");
  assert.strictEqual(mark.safety, 0, "but they never uncovered the finding that raises it");
  assert.ok(mark.total < 1, "so the station is not a full pass");
});

test("safety is not assessed on a station with no red flag", () => {
  const mark = evalIn(`(function () {
    var c = simBuildCase("Acute Angle Closure Crisis");
    c.urgent = false;
    SIM.active = true; SIM.theCase = c; SIM.tier = "osce";
    SIM.revealed = {}; SIM.started = Date.now(); SIM.deadline = null;
    SIM.answered = false; SIM.score = null; V.symptoms = [];
    var s = simSubmit(c.condition, "High");
    return osceMark(s, c);
  })()`);
  assert.strictEqual(mark.safetyApplies, false);
});

test("a full-marks station beats a name-only station", () => {
  reset();
  const both = evalIn(`(function () {
    function mark(revealAll) {
      var c = simBuildCase("Acute Angle Closure Crisis");
      c.urgent = true;
      SIM.active = true; SIM.theCase = c; SIM.tier = "osce";
      SIM.revealed = {}; SIM.started = Date.now(); SIM.deadline = null;
      SIM.answered = false; SIM.score = null; V.symptoms = [];
      if (revealAll) {
        Object.keys(c.byStep).forEach(function (st) {
          SIM.revealed[st] = true;
          c.byStep[st].forEach(function (t) { if (V.symptoms.indexOf(t) < 0) V.symptoms.push(t); });
        });
      }
      return osceMark(simSubmit(c.condition, "High"), c);
    }
    return { worked: mark(true), guessed: mark(false) };
  })()`);
  assert.ok(both.worked.total > both.guessed.total,
    `worked ${both.worked.total} should beat guessed ${both.guessed.total}`);
  assert.strictEqual(both.worked.safety, 1);
});


/* ── 5. Assignments ──────────────────────────────────────────────── */

test("an assignment completes on distinct conditions, not repeats of one case", () => {
  reset();
  const p = evalIn(`(function () {
    var a = assignCreate({ title: "Week 1", scope: "common", count: 3 });
    /* same condition three times */
    for (var i = 0; i < 3; i++) assignRecord(a.id, { condition: "Dry Eye Disease", correct: true });
    var repeated = assignProgress(a, "student1");
    assignRecord(a.id, { condition: "Acute Angle Closure Crisis", correct: true });
    assignRecord(a.id, { condition: "Primary Open-Angle Glaucoma", correct: false });
    return { repeated: repeated, spread: assignProgress(a, "student1") };
  })()`);
  assert.strictEqual(p.repeated.done, 1, "three attempts at one case is one condition done");
  assert.strictEqual(p.repeated.complete, false);
  assert.strictEqual(p.spread.done, 3);
  assert.strictEqual(p.spread.complete, true);
});

test("an assignment serves a condition the student has not done yet", () => {
  reset();
  const picked = evalIn(`(function () {
    var a = assignCreate({ title: "Trio", scope: "list",
      conditions: ["Dry Eye Disease", "Acute Angle Closure Crisis", "Primary Open-Angle Glaucoma"] });
    assignRecord(a.id, { condition: "Dry Eye Disease", correct: true });
    var next = assignNextCase(a, "student1");
    return next ? next.condition : null;
  })()`);
  assert.ok(picked && picked !== "Dry Eye Disease", `served ${picked}, not the one already done`);
});

test("assignments target named students, or the whole cohort when nobody is named", () => {
  reset();
  const vis = evalJson(`(function () {
    assignCreate({ title: "Everyone", scope: "common", count: 2 });
    assignCreate({ title: "Just Amy", scope: "common", count: 2, assignedTo: ["amy"] });
    return {
      student1: assignForUser("student1").map(function (a) { return a.title; }),
      amy: assignForUser("amy").map(function (a) { return a.title; })
    };
  })()`);
  assert.deepStrictEqual(vis.student1, ["Everyone"]);
  assert.deepStrictEqual(vis.amy.sort(), ["Everyone", "Just Amy"]);
});

test("an overdue, unfinished assignment is flagged; a finished one is not", () => {
  reset();
  const r = evalIn(`(function () {
    var a = assignCreate({ title: "Late", scope: "common", count: 2, due: "2020-01-01" });
    var before = assignProgress(a, "student1");
    assignRecord(a.id, { condition: "Dry Eye Disease", correct: true });
    assignRecord(a.id, { condition: "Primary Open-Angle Glaucoma", correct: true });
    return { before: before.overdue, after: assignProgress(a, "student1").overdue };
  })()`);
  assert.strictEqual(r.before, true);
  assert.strictEqual(r.after, false, "finishing clears the overdue flag");
});

test("cohort progress reports every student who has attempted the work", () => {
  reset();
  const rows = evalJson(`(function () {
    var a = assignCreate({ title: "Cohort", scope: "common", count: 2 });
    CU.username = "amy";  assignRecord(a.id, { condition: "Dry Eye Disease", correct: true });
    CU.username = "ben";  assignRecord(a.id, { condition: "Dry Eye Disease", correct: false });
    CU.username = "student1";
    return assignCohortProgress(a);
  })()`);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows.map((r) => r.username).sort(), ["amy", "ben"]);
  assert.strictEqual(rows.find((r) => r.username === "amy").accuracy, 100);
  assert.strictEqual(rows.find((r) => r.username === "ben").accuracy, 0);
});

/* ── 6. Domain integrity (regressions found by stress-testing) ───── */

test("every condition carries a public domain — none silently bucketed as Other", () => {
  const gap = evalIn(`KNOWLEDGE_ALL.filter(function (c) { return !c.domain; }).length`);
  assert.strictEqual(gap, 0, "conditions without a domain would land in 'Other'");
  const mismatch = evalIn(`KNOWLEDGE_ALL.filter(function (c) {
    return c._domain && c.domain !== c._domain;
  }).map(function (c) { return c.name; }).length`);
  assert.strictEqual(mismatch, 0, "public domain must agree with the registry key");
});

test("the common conditions are reachable by domain, not dumped in Other", () => {
  const surface = evalIn(`KNOWLEDGE_ALL.filter(function (c) {
    return c.domain === "Surface & Lids"; }).length`);
  const other = evalIn(`KNOWLEDGE_ALL.filter(function (c) {
    return (c.domain || "Other") === "Other"; }).length`);
  assert.ok(surface > 60, `Surface & Lids should hold its full set, got ${surface}`);
  assert.ok(other < 5, `almost nothing should be domainless, got ${other} in Other`);
});

test("a domain assignment never serves a case from another domain", () => {
  reset();
  const leak = evalIn(`(function () {
    var a = assignCreate({ title: "Glaucoma block", scope: "domain", domain: "Glaucoma", count: 30 });
    var off = [];
    for (var i = 0; i < 30; i++) {
      var c = assignNextCase(a, "student1");
      if (!c) break;
      var kb = findCondition(c.condition);
      if ((kb.domain || "Other") !== "Glaucoma") off.push(c.condition);
      assignRecord(a.id, { condition: c.condition, correct: true });
    }
    return off;
  })()`);
  assert.strictEqual(leak.length, 0, `out-of-domain cases served: ${leak}`);
});

test("a target larger than the scope's pool is clamped, so the work is finishable", () => {
  reset();
  const r = evalIn(`(function () {
    var a = assignCreate({ title: "Too big", scope: "domain", domain: "Glaucoma", count: 500 });
    var pool = assignPoolSize(a);
    var seen = {};
    for (var i = 0; i < 200 && Object.keys(seen).length < pool; i++) {
      var c = assignNextCase(a, "student1");
      if (!c) break;
      seen[c.condition] = true;
      assignRecord(a.id, { condition: c.condition, correct: true });
    }
    var p = assignProgress(a, "student1");
    return { pool: pool, target: p.target, complete: p.complete };
  })()`);
  assert.ok(r.pool > 0 && r.pool < 500);
  assert.strictEqual(r.target, r.pool, "target clamps to what the domain can supply");
  assert.strictEqual(r.complete, true, "the assignment is completable");
});

test("learning progress is stored apart from patient data, per user", () => {
  reset();
  const keys = evalIn(`(function () {
    runCaseKeys = [];
    CU.username = "amy";
    simRecordAttempt({ correct: true, efficiency: 1, calibration: "" },
      { condition: "Dry Eye Disease", domain: "Ocular Surface" }, "standard");
    var amyKey = simProgressKey();
    CU.username = "ben";
    var benKey = simProgressKey();
    CU.username = "student1";
    return { amyKey: amyKey, benKey: benKey, amyXp: JSON.parse(localStorage.getItem(amyKey)).xp,
             benRaw: localStorage.getItem(benKey) };
  })()`);
  assert.notStrictEqual(keys.amyKey, keys.benKey, "progress is namespaced per user");
  assert.ok(keys.amyXp > 0);
  assert.strictEqual(keys.benRaw, null, "one student's progress does not leak into another's");
  assert.ok(!/patient/i.test(keys.amyKey), "progress does not live in patient storage");
});
