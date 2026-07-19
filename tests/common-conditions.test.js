/* ═══════════════════════════════════════════════════════════════ */
/* COMMON-CONDITIONS LIST + QUIZ SCOPE                             */
/*                                                                  */
/*   • every name in the common list matches a real KB condition    */
/*     (no typos, no drift) — critical, else "Common" quiz silently  */
/*     drops entries;                                               */
/*   • the list is non-trivial and flagged for founder review;      */
/*   • quiz "common" scope only ever answers with common conditions;*/
/*   • "all" scope can reach beyond the common set;                 */
/*   • scope never breaks question well-formedness.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
["knowledge/condition-info.js", "js/reasoning-views.js", "js/ui-quiz.js"].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), eng.context, { filename: f });
});
function evalIn(expr) { return vm.runInContext(expr, eng.context); }
evalIn("globalThis.__mkRng = function (seed) { var s = seed>>>0; return function(){s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }");


test("every common-list name matches a real KB condition (no drift/typos)", () => {
  const missing = evalIn(
    "KB_COMMON_CONDITIONS.filter(function(n){return !KNOWLEDGE_ALL.some(function(c){return c.name===n;});})"
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(missing)), [],
    "these common names are not in the KB: " + JSON.stringify(missing));
});

test("common list is substantial and carries a review flag", () => {
  assert.ok(evalIn("KB_COMMON_CONDITIONS.length") >= 50, "a meaningful common set");
  assert.strictEqual(evalIn("KB_COMMON_REVIEW_STATUS"), "NEEDS_CLINICAL_REVIEW",
    "commonness is a clinical judgement — flagged for founder review");
});

test("quiz 'common' scope only ever answers with a common condition", () => {
  evalIn("quizSetScope('common')");
  for (let seed = 1; seed <= 40; seed++) {
    const q = evalIn("quizBuildQuestionFromKB(__mkRng(" + seed + "))");
    assert.ok(q, "question built");
    assert.strictEqual(evalIn("isCommonCondition(" + JSON.stringify(q.answer) + ")"), true,
      "answer '" + q.answer + "' must be in the common list under common scope");
    assert.strictEqual(q.options.length, 4);
  }
});

test("'all' scope can reach conditions outside the common set", () => {
  evalIn("quizSetScope('all')");
  let sawUncommon = false;
  for (let seed = 1; seed <= 80 && !sawUncommon; seed++) {
    const q = evalIn("quizBuildQuestionFromKB(__mkRng(" + seed + "))");
    if (q && !evalIn("isCommonCondition(" + JSON.stringify(q.answer) + ")")) sawUncommon = true;
  }
  assert.ok(sawUncommon, "all-scope should surface at least one uncommon condition across 80 draws");
});

test("scope + difficulty compose; questions stay well-formed", () => {
  evalIn("quizSetScope('common')");
  const q = evalIn("quizBuildQuestionFromKB(__mkRng(3), null, 'hard')");
  assert.strictEqual(q.options.length, 4);
  assert.strictEqual(new Set(q.options).size, 4);
  assert.ok(q.options.indexOf(q.answer) >= 0);
  evalIn("quizSetScope('all')");   /* leave a clean default */
});

test("scope setter rejects unknown values", () => {
  assert.strictEqual(evalIn("quizSetScope('common')"), true);
  assert.strictEqual(evalIn("quizSetScope('nonsense')"), false);
  assert.strictEqual(evalIn("quizGetScope()"), "common", "bad value ignored");
});
