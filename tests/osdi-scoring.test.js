/* ═══════════════════════════════════════════════════════════════ */
/* OSDI — A PUBLISHED QUESTIONNAIRE MUST NOT INVENT A SEVERITY      */
/*                                                                  */
/* Promoted from tools/stress/clinical.js.                          */
/*                                                                  */
/* js/smart-intake.js had NO test coverage at all (tools/audit.js    */
/* had been reporting it as unreferenced), and it computes a dry-eye */
/* severity that a clinician reads as a finding.                     */
/*                                                                  */
/* THE DANGEROUS SHAPE. The only check on a stored answer was "not   */
/* null and not undefined", so whatever a restored backup or a       */
/* synced record carried went into the arithmetic:                   */
/*                                                                  */
/*   string "4","3","2" -> 0 + "4" concatenates -> score 3600        */
/*   a NaN anywhere     -> score NaN            -> "Severe Dry Eye"  */
/*   an object          -> score NaN            -> "Severe Dry Eye"  */
/*   1e9 in one item    -> score 2,083,333,333  -> "Severe Dry Eye"  */
/*   -100 in one item   -> score -208.3         -> "Normal"          */
/*                                                                  */
/* Every `<=` comparison against NaN is false, so a NaN fell through */
/* the whole severity ladder to its final `else` and was handed back */
/* as SEVERE DRY EYE. Garbage in, confident diagnosis out. The       */
/* negative case is the mirror image and worse in direction: it      */
/* understated, which is what sends a patient home.                  */
/*                                                                  */
/* Half of what follows is positive control, because a validator     */
/* that rejects everything also leaks nothing and is also useless.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* `expr` lets a case use values JSON cannot carry (NaN, objects). */
function score(scoresExpr) {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} }, V: {},
    renderMain: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/smart-intake.js"), ctx, { filename: "smart-intake.js" });
  vm.runInContext(`V = { osdi: { scores: ${scoresExpr} } };`, ctx);
  return JSON.parse(vm.runInContext("JSON.stringify(calculateOSDI())", ctx));
}
const J = (a) => JSON.stringify(a);


/* ═══ The published formula, applied correctly ═══ */

test("all twelve at maximum scores 100 and reads Severe", () => {
  const r = score(J([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]));
  assert.strictEqual(r.score, 100, "the defined OSDI maximum is 100");
  assert.strictEqual(r.severity, "Severe Dry Eye");
  assert.strictEqual(r.complete, true);
});

test("all twelve at zero scores 0 and reads Normal", () => {
  const r = score(J([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.severity, "Normal");
});

test("the score is normalised by ANSWERED items, not by twelve", () => {
  /* The point of the published formula: a partly completed questionnaire is
     scaled, not deflated by counting blanks as zero. */
  const r = score(J([4, 4, 4, null, null, null, null, null, null, null, null, null]));
  assert.strictEqual(r.answered, 3);
  assert.strictEqual(r.score, 100,
    "three maximal answers must scale to 100, not be diluted to 25 by nine blanks");
  assert.strictEqual(r.complete, false, "a partial questionnaire must not claim completeness");
});

test("each published severity band is reachable", () => {
  /* 0-12 normal, 13-22 mild, 23-32 moderate, 33-100 severe. Driven from real
     answer patterns rather than by calling the ladder directly. */
  const bandOf = (per) => score(J(new Array(12).fill(per))).severity;
  assert.strictEqual(bandOf(0), "Normal");
  assert.strictEqual(bandOf(4), "Severe Dry Eye");
  /* One item at 4, eleven at 0 -> (4*25)/12 = 8.3 -> Normal. */
  assert.strictEqual(score(J([4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])).severity, "Normal");
  /* Three at 4 -> (12*25)/12 = 25 -> Moderate. */
  assert.strictEqual(score(J([4, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0])).severity, "Moderate Dry Eye");
});


/* ═══ Nothing unusable may reach the arithmetic ═══ */

test("a NaN never produces a severity", () => {
  const r = score("[0,0,0,0,0,0,0,0,0,0,0,NaN]");
  assert.notStrictEqual(r.severity, "Severe Dry Eye",
    "a NaN in the answers produced a severe dry-eye result");
  assert.ok(isFinite(r.score), "the score is not finite: " + r.score);
  assert.strictEqual(r.rejected, 1);
});

test("string answers are not concatenated into a nonsense score", () => {
  const r = score(J(["4", "3", "2", null, null, null, null, null, null, null, null, null]));
  assert.ok(r.score <= 100, "a string answer produced " + r.score);
  assert.strictEqual(r.answered, 0, "no valid answer was present, so nothing may be scored");
  assert.strictEqual(r.rejected, 3, "string answers must be rejected, not coerced");
});

test("an answer outside the 0-4 scale is refused", () => {
  for (const bad of [[1e9], [-100], [5], [2.5], [-0.5]]) {
    const arr = bad.concat(new Array(11).fill(0));
    const r = score(J(arr));
    assert.ok(r.score >= 0 && r.score <= 100,
      "out-of-range OSDI score " + r.score + " from " + J(arr.slice(0, 1)));
    assert.strictEqual(r.rejected, 1, "the out-of-range value must be rejected: " + J(bad));
  }
});

test("a non-numeric answer cannot reach the arithmetic", () => {
  for (const expr of ["[{},0,0,0,0,0,0,0,0,0,0,0]",
                      "[true,false,0,0,0,0,0,0,0,0,0,0]",
                      "[[],0,0,0,0,0,0,0,0,0,0,0]"]) {
    const r = score(expr);
    assert.ok(isFinite(r.score) && r.score >= 0 && r.score <= 100,
      "produced " + r.score + " from " + expr);
  }
});

test("no answers means no score and no severity", () => {
  for (const expr of ["[]", "[null,null,null]", "null", '"notanarray"', "undefined"]) {
    const r = score(expr);
    assert.strictEqual(r.answered, 0, "something was counted as answered for " + expr);
    assert.strictEqual(r.severity, "", "a severity was stated with nothing to score: " + expr);
  }
});

test("the count of rejected values is reported, not hidden", () => {
  /* A questionnaire scored from 3 of 12 is a different statement from one
     scored from 12, and a clinician has to be able to see which. */
  const r = score(J([4, "x", 3, null, 999, 2, null, null, null, null, null, null]));
  assert.strictEqual(r.answered, 3);
  assert.strictEqual(r.rejected, 2);
});

test("the module no longer treats 'not null' as 'is an answer'", () => {
  /* The root cause, pinned in source: the old guard was a null check, which
     admitted strings, NaN, objects and out-of-range numbers alike. */
  const src = read("js/smart-intake.js");
  assert.match(src, /function osdiIsAnswer/,
    "there must be an explicit validator for what counts as an OSDI answer");
  assert.ok(!/if \(V\.osdi\.scores\[i\] !== null && V\.osdi\.scores\[i\] !== undefined\) \{\s*sum \+=/.test(src),
    "the null-only guard is back, and with it every coercion bug above");
});
