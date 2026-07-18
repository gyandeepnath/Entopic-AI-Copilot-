/* ═══════════════════════════════════════════════════════════════ */
/* QUIZ / SELF-TEST — pure question builders                       */
/*                                                                  */
/* Verifies the educational quiz (js/ui-quiz.js) against the REAL   */
/* knowledge base loaded in the engine harness:                     */
/*   • questions are well-formed (4 unique options incl. the answer)*/
/*   • ANTI-FABRICATION: every finding shown comes from the         */
/*     condition's own req/sup tokens — nothing invented            */
/*   • distractors are real KB condition names                      */
/*   • casebook-sourced questions work end-to-end                   */
/*   • the stats/streak loop counts correctly                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
/* Quiz reads condition-info (explanations), reasoning-views (casebook) */
["knowledge/condition-info.js", "js/reasoning-views.js", "js/ui-quiz.js"].forEach((f) => {
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"),
    eng.context,
    { filename: f }
  );
});

function evalIn(expr) { return vm.runInContext(expr, eng.context); }

/* Deterministic rng for reproducible questions. */
evalIn("globalThis.__mkRng = function (seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }");


test("KB question is well-formed: 4 unique options including the answer, findings present", () => {
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(42))");
  assert.ok(q, "a question is produced");
  assert.strictEqual(q.options.length, 4);
  assert.strictEqual(new Set(q.options).size, 4, "options are unique");
  assert.ok(q.options.indexOf(q.answer) >= 0, "the answer is among the options");
  assert.ok(q.findings.length >= 3, "vignette has enough findings to be fair");
});

test("ANTI-FABRICATION: every finding in a KB vignette maps to the condition's own req/sup tokens", () => {
  /* Pin a known condition and check the vignette against its KB entry. */
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(7), 'Acute Angle Closure Crisis')");
  assert.ok(q && q.answer === "Acute Angle Closure Crisis");
  const allowed = evalIn(
    "(function(){var c=findCondition('Acute Angle Closure Crisis');" +
    "return [].concat(c.req||[],c.sup||[]).map(quizTokenLabel);})()"
  );
  for (const f of q.findings) {
    assert.ok(allowed.indexOf(f) >= 0, "finding '" + f + "' must come from the condition's own criteria");
  }
});

test("distractors are real KB conditions, never the answer, and prefer the same route", () => {
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(11), 'Acute Angle Closure Crisis')");
  const names = evalIn("KNOWLEDGE_ALL.map(function(c){return c.name;})");
  for (const opt of q.options) {
    assert.ok(names.indexOf(opt) >= 0, "option '" + opt + "' is a real KB condition");
  }
  assert.strictEqual(q.options.filter((o) => o === q.answer).length, 1);
});

test("explanations come from the About notes (condition-info)", () => {
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(3), 'Acute Angle Closure Crisis')");
  assert.ok(typeof q.explanation === "string" && q.explanation.length > 20,
    "hand-authored About summary used as the explanation");
});

test("casebook-sourced question: real de-identified case becomes a quiz item", () => {
  eng.runCase(
    { symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"], iop: { od: "48", os: "16" } },
    { first_name: "Quiz", last_name: "Seed" }
  );
  evalIn("casebookSave([])");                 /* clean slate (mem store) */
  evalIn("casebookAdd('seed case')");
  const q = evalIn("quizNextQuestion(function(){return 0.1;})");  /* rng<0.4 → prefer casebook */
  assert.ok(q, "question produced");
  assert.strictEqual(q.source, "case");
  assert.ok(/Acute Angle Closure/.test(q.answer));
  assert.strictEqual(q.options.length, 4);
  const joined = q.findings.join(" ");
  assert.ok(!/Quiz|Seed/.test(joined), "no patient identifiers in the vignette");
});

/* ── Difficulty tiers (clue count + distractor closeness — never invented
      prevalence) ── */

test("hard mode shows fewer clues than easy mode for the same condition", () => {
  const easy = evalIn("quizBuildQuestionFromKB(__mkRng(5), 'Acute Angle Closure Crisis', 'easy')");
  const hard = evalIn("quizBuildQuestionFromKB(__mkRng(5), 'Acute Angle Closure Crisis', 'hard')");
  assert.ok(easy.findings.length > hard.findings.length, "easy gives more clues than hard");
  const reqLen = evalIn("findCondition('Acute Angle Closure Crisis').req.length");
  const expectedHard = reqLen >= 2 ? reqLen : reqLen + 1;
  assert.strictEqual(hard.findings.length, expectedHard, "hard shows (nearly) only required findings");
});

test("hard-mode findings are still only the condition's own criteria (anti-fabrication holds)", () => {
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(9), 'Acute Angle Closure Crisis', 'hard')");
  const allowed = evalIn(
    "(function(){var c=findCondition('Acute Angle Closure Crisis');" +
    "return [].concat(c.req||[],c.sup||[]).map(quizTokenLabel);})()"
  );
  for (const f of q.findings) assert.ok(allowed.indexOf(f) >= 0, "'" + f + "' from own criteria");
});

test("hard-mode distractors come from the same clinical route when available", () => {
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(13), 'Acute Angle Closure Crisis', 'hard')");
  const route = evalIn("findCondition('Acute Angle Closure Crisis').route");
  const sameRouteCount = evalIn(
    "KNOWLEDGE_ALL.filter(function(c){return c.route==='" + route + "' && c.name!=='Acute Angle Closure Crisis';}).length"
  );
  if (sameRouteCount >= 3) {
    for (const opt of q.options) {
      if (opt === q.answer) continue;
      const r = evalIn("findCondition('" + opt.replace(/'/g, "\\'") + "').route");
      assert.strictEqual(r, route, "distractor '" + opt + "' shares the route (max confusability)");
    }
  }
});

test("difficulty setting persists in-module and rejects unknown values", () => {
  assert.strictEqual(evalIn("quizSetDifficulty('hard')"), true);
  assert.strictEqual(evalIn("quizGetDifficulty()"), "hard");
  assert.strictEqual(evalIn("quizSetDifficulty('impossible')"), false);
  assert.strictEqual(evalIn("quizGetDifficulty()"), "hard", "unknown value ignored");
  evalIn("quizSetDifficulty('standard')");
});

test("stats: streak counts up on correct, resets on wrong, best is kept", () => {
  evalIn("quizSaveStats({asked:0,correct:0,streak:0,best:0})");
  evalIn("quizRecord(true)");
  evalIn("quizRecord(true)");
  let s = evalIn("quizLoadStats()");
  assert.strictEqual(s.asked, 2);
  assert.strictEqual(s.streak, 2);
  evalIn("quizRecord(false)");
  s = evalIn("quizLoadStats()");
  assert.strictEqual(s.streak, 0, "wrong answer resets the streak");
  assert.strictEqual(s.best, 2, "best streak is remembered");
  assert.ok(/2 \/ 3 correct/.test(evalIn("quizStatsSummary()")));
});
