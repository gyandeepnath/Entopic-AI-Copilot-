/* ═══════════════════════════════════════════════════════════════ */
/* STRESS — unique features under adversarial input                */
/*                                                                  */
/* Hammers the quiz, casebook, analytics, roles and de-identify     */
/* logic with malformed / hostile / extreme inputs and asserts they */
/* never crash and stay correct. These guard the interfaces the     */
/* founder exercised by hand.                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");
const roles = require("../js/roles.js");
const an = require("../js/analytics.js");

const eng = createEngine();
["knowledge/condition-info.js", "knowledge/common-conditions.js", "js/reasoning-views.js", "js/ui-quiz.js"].forEach(function (f) {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), eng.context, { filename: f });
});
function evalIn(expr) { return vm.runInContext(expr, eng.context); }
evalIn("globalThis.__rng = function (s) { s = s>>>0; return function(){ s=(s*1664525+1013904223)>>>0; return s/4294967296; }; }");


/* ── ROLES ── */
test("roles: garbage / null role inputs never crash and fall back safely", () => {
  roles._reset();
  assert.strictEqual(roles.setActiveRole(null), false);
  assert.strictEqual(roles.setActiveRole("not-a-role"), false);
  assert.strictEqual(roles.setActiveRole(""), false);
  assert.strictEqual(roles.effectiveRole(), "clinician", "safe default");
  assert.strictEqual(roles.can("totally_unknown_cap"), false);
  assert.strictEqual(roles.roleShowsCap("engine"), true, "learning always on");
});

test("roles: save caps handle negative / huge / unknown kinds", () => {
  roles._reset();
  assert.strictEqual(roles.canSave("patients", -5).ok, true);
  assert.strictEqual(roles.canSave("patients", 1e9).ok, false);
  assert.strictEqual(roles.canSave("nonexistent_kind", 1e9).ok, true, "unknown kind uncapped");
  assert.strictEqual(roles.saveCap("practice"), Infinity);
});

test("roles: rapid switching between every live role is stable", () => {
  roles._reset();
  var live = roles.activeRoleCatalogue().map(function (r) { return r.id; });
  for (var i = 0; i < 200; i++) {
    var r = live[i % live.length];
    assert.strictEqual(roles.setActiveRole(r), true);
    assert.strictEqual(roles.effectiveRole(), r);
  }
});


/* ── ANALYTICS ── */
test("analytics: malformed / null-laden data never throws", () => {
  const junk = {
    users: [null, {}, { role: "student" }, { role: 123 }],
    patients: [null, { practice: true }, {}],
    visits: [
      null, {}, { data: null }, { data: { dxList: null } },
      { data: { dxList: [null] } }, { data: { dxList: [{}] } },
      { status: "completed", data: { completed: null, alerts: null,
        dxList: [{ n: "X", domain: "Retina", cat: "retina" }] } }
    ],
    cases: [null, {}, { title: null }, { reviewed: true, state: { assessment: [{ domain: "Glaucoma" }] } }],
    quiz: null, kbTotal: 0, kbProvisional: 0
  };
  let d;
  assert.doesNotThrow(() => { d = an.analyticsCompute(junk); });
  assert.ok(d.accounts.total === 4);
  assert.ok(d.visits.total === 7);
  assert.ok(Number.isFinite(d.visits.redFlagRate));
  assert.ok(Number.isFinite(d.visits.avgSteps));
});

test("analytics: scales to thousands of visits without error", () => {
  const visits = [];
  for (let i = 0; i < 5000; i++) {
    visits.push({ status: i % 2 ? "completed" : "in_progress",
      data: { completed: ["a", "b"], alerts: i % 3 ? [] : [{ l: "urgent", m: "x" }],
        dxList: [{ n: "Cond " + (i % 40), domain: "Retina", cat: "retina" }] } });
  }
  const d = an.analyticsCompute({ visits: visits });
  assert.strictEqual(d.visits.total, 5000);
  assert.ok(d.visits.topDx.length <= 8, "top list is bounded");
  assert.ok(d.visits.topDx[0].n >= d.visits.topDx[d.visits.topDx.length - 1].n, "sorted desc");
});


/* ── DE-IDENTIFICATION robustness ── */
test("de-identify: regex-special and repeated names are scrubbed everywhere", () => {
  eng.runCase(
    { cc: "a.b*c (the patient) a.b*c reports pain", symptoms: ["pain"],
      plan: { mgmt: "counsel a.b*c and family" } },
    { first_name: "a.b*c", last_name: "(d+e)", mrn: "M[1]" }
  );
  const note = evalIn("stateToNoteText(deidentifyState(buildExamState()))");
  assert.ok(!/a\.b\*c/.test(note), "regex-special first name scrubbed, not treated as a pattern");
  assert.ok(!/M\[1\]/.test(note), "mrn removed");
  assert.ok(/De-identified/.test(note));
});

test("de-identify: empty / whitespace name doesn't wipe the whole note", () => {
  eng.runCase({ cc: "blurred vision at distance", symptoms: ["distance_blur"] }, { first_name: "  ", last_name: "" });
  const note = evalIn("stateToNoteText(deidentifyState(buildExamState()))");
  assert.ok(/blurred vision at distance/.test(note), "clinical free text survives an empty name");
});


/* ── CASEBOOK filters / grouping under junk ── */
test("casebook: filter + group tolerate malformed entries", () => {
  evalIn("casebookSave([])");
  evalIn("casebookSave([null, {}, {title:null,state:null}, {title:'Keratoconus', state:{assessment:[{domain:'Cornea'}], tokens:['irregular_astigmatism']}}])");
  assert.doesNotThrow(() => evalIn("casebookFacets(casebookLoad())"));
  assert.doesNotThrow(() => evalIn("casebookFilter(casebookLoad(), {search:'kerato', domain:'', token:''})"));
  assert.doesNotThrow(() => evalIn("casebookGroupByCondition(casebookLoad())"));
  const n = evalIn("casebookFilter(casebookLoad(), {search:'kerato'}).length");
  assert.ok(n >= 1, "the real entry still matches");
});

test("casebook: example seeding is bounded and idempotent under repeated calls", () => {
  evalIn("casebookSave([])");
  const a = evalIn("casebookSeedExamples(30)");
  const b = evalIn("casebookSeedExamples(30)");
  assert.ok(a >= 1);
  assert.strictEqual(b, 0, "second seed adds nothing");
  assert.strictEqual(evalIn("casebookLoad().length"), a);
});


/* ── QUIZ under tiny pools, determinism, no-repeat ── */
test("quiz: seeded rng is deterministic (reproducible questions)", () => {
  evalIn("casebookSave([])");            /* no casebook → pure KB path */
  evalIn("quizSetScope('all')");
  const q1 = evalIn("JSON.stringify(quizBuildQuestionFromKB(__rng(123)))");
  const q2 = evalIn("JSON.stringify(quizBuildQuestionFromKB(__rng(123)))");
  assert.strictEqual(q1, q2, "same seed → identical question");
});

test("quiz: fresh-question avoids recent answers across a long run", () => {
  evalIn("casebookSave([])");
  evalIn("quizSetScope('all')");
  const rng = "__rng(9)";
  /* simulate a 40-question session tracking a recent-15 ring */
  const repeats = evalIn(
    "(function(){var r=" + rng + ";var recent=[],imm=0;" +
    "for(var i=0;i<40;i++){var q=quizFreshQuestion(recent.slice(-6),r);" +
    "if(recent.slice(-6).indexOf(q.answer)>=0)imm++;recent.push(q.answer);}return imm;})()"
  );
  assert.ok(repeats <= 3, "near-zero immediate repeats over 40 questions (got " + repeats + ")");
});

test("quiz: every generated question is well-formed (4 unique options incl. answer)", () => {
  evalIn("quizSetScope('common')");
  for (let s = 1; s <= 60; s++) {
    const q = evalIn("quizBuildQuestionFromKB(__rng(" + s + "))");
    assert.ok(q, "built");
    assert.strictEqual(q.options.length, 4, "4 options");
    assert.strictEqual(new Set(q.options).size, 4, "unique");
    assert.ok(q.options.indexOf(q.answer) >= 0, "answer present");
  }
  evalIn("quizSetScope('all')");
});

test("quiz: a casebook case too thin to quiz is skipped, KB fills in", () => {
  evalIn("casebookSave([{id:'x', title:'Ghost', state:{subjective:{symptoms:[]}, objective:{}}}])");
  /* rng<0.35 would pick the casebook, but it's too thin → must still return a KB question */
  const q = evalIn("quizNextQuestion(function(){return 0.01;})");
  assert.ok(q && q.options.length === 4, "falls back to a valid KB question");
  evalIn("casebookSave([])");
});
