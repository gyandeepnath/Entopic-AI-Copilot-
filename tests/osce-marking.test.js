/* ═══════════════════════════════════════════════════════════════ */
/* OSCE MARKING — A STUDENT IS ASSESSED ON THIS                     */
/*                                                                  */
/* Promoted from tools/stress/clinical.js (group AE).               */
/*                                                                  */
/* osceMark turns a station into four domain marks and a total. A   */
/* student reads that as a statement about themselves, so an        */
/* out-of-range or missing mark does more damage than its size       */
/* suggests: it costs confidence in the whole report.               */
/*                                                                  */
/* Two defects were found:                                          */
/*   · a mark could exceed 100% if a domain's numerator outran its   */
/*     denominator                                                   */
/*   · osceMark THREW on a malformed score object, which loses the   */
/*     whole circuit's report — and it runs on stored results and on */
/*     a station closed by the bell, neither of which is guaranteed  */
/*     to be well formed                                             */
/*                                                                  */
/* The most important behaviours here are pedagogical, not numeric:  */
/* safety is only ASSESSED when the case carries a red flag, and it  */
/* is scored SEPARATELY from the diagnosis — so a student can name   */
/* the wrong condition and still be credited for spotting the red    */
/* flag, and be marked down for missing one while naming the right   */
/* condition. That distinction is the point of the circuit.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function osce() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} },
    SIM: {}, OSCE: {},
    setTimeout: () => 0, clearTimeout: () => {},
    assignCredit: () => {}, simCaseFor: () => null
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/osce.js"), ctx, { filename: "osce.js" });
  ctx.run = (e) => vm.runInContext(e, ctx);
  return ctx;
}

function mark(score, theCase) {
  const c = osce();
  c.__s = score; c.__c = theCase;
  return JSON.parse(c.run("JSON.stringify(osceMark(__s, __c))"));
}

/* A flawless station. */
const PERFECT = {
  stepsWithFindings: 4, missedSteps: [],
  decisive: ["a", "b"], decisiveFound: ["a", "b"],
  correct: true, guess: "X", timedOut: false, seconds: 100
};

test("the declared weights sum to 1", () => {
  const w = JSON.parse(osce().run("JSON.stringify(OSCE_CONFIG.weights)"));
  const sum = Object.keys(w).reduce((n, k) => n + w[k], 0);
  assert.ok(Math.abs(sum - 1) < 1e-9,
    "the weights sum to " + sum + ", so a perfect station cannot score 100%");
});

test("a perfect station scores exactly 1 (positive control)", () => {
  assert.strictEqual(+mark(PERFECT, { condition: "X", urgent: false }).total.toFixed(6), 1);
});

test("a station that went entirely wrong scores 0, never below", () => {
  const r = mark({ stepsWithFindings: 4, missedSteps: ["a", "b", "c", "d"],
                   decisive: ["a", "b"], decisiveFound: [], correct: false,
                   guess: "", timedOut: true, seconds: 300 },
                 { condition: "X", urgent: true });
  assert.ok(r.total >= 0, "a negative mark was produced: " + r.total);
  assert.strictEqual(r.diagnosis, 0);
});

test("a mark can never exceed 100%", () => {
  const r = mark(Object.assign({}, PERFECT, {
    decisive: ["a", "b"], decisiveFound: ["a", "a", "b", "b", "c"]
  }), { condition: "X", urgent: true });
  assert.ok(r.decisive <= 1, "a domain scored above full marks: " + r.decisive);
  assert.ok(r.total <= 1, "a station scored above 100%: " + r.total);
});

test("more missed steps than there were steps cannot go negative", () => {
  const r = mark(Object.assign({}, PERFECT, {
    stepsWithFindings: 2, missedSteps: ["a", "b", "c", "d", "e"]
  }), { condition: "X", urgent: false });
  assert.ok(r.gathering >= 0 && r.total >= 0);
});

test("safety is only ASSESSED on a case that carries a red flag", () => {
  assert.strictEqual(mark(PERFECT, { condition: "X", urgent: false }).safetyApplies, false);
  assert.strictEqual(mark(PERFECT, { condition: "X", urgent: true }).safetyApplies, true);
});

test("missing the finding that raises a red flag costs marks", () => {
  const found = mark(PERFECT, { condition: "X", urgent: true });
  const missed = mark(Object.assign({}, PERFECT, { decisiveFound: [] }),
                      { condition: "X", urgent: true });
  assert.ok(missed.safety < found.safety, "missing a red flag cost nothing on safety");
  assert.ok(missed.total < found.total, "and cost nothing overall");
});

test("diagnosis and safety are scored separately", () => {
  /* The point of the circuit: a student can pass on diagnosis and still be
     told they missed a red flag, and vice versa. */
  const rightDxMissedFlag = mark(Object.assign({}, PERFECT, { decisiveFound: [], correct: true }),
                                 { condition: "X", urgent: true });
  const wrongDxCaughtFlag = mark(Object.assign({}, PERFECT, { correct: false }),
                                 { condition: "X", urgent: true });
  assert.strictEqual(rightDxMissedFlag.diagnosis, 1, "a correct diagnosis was not credited");
  assert.ok(rightDxMissedFlag.safety < 1, "a missed red flag was not penalised");
  assert.strictEqual(wrongDxCaughtFlag.safety, 1, "catching the red flag was not credited");
  assert.strictEqual(wrongDxCaughtFlag.diagnosis, 0, "a wrong diagnosis was credited");
});

test("examining a region that turned out normal is not penalised", () => {
  /* A negative finding is data, not waste — the gathering domain measures what
     was UNCOVERED of what was there, not how many sections were opened. */
  const r = mark(Object.assign({}, PERFECT, { stepsWithFindings: 2, missedSteps: [] }),
                 { condition: "X", urgent: false });
  assert.strictEqual(r.gathering, 1);
});

test("a malformed score object does not lose the circuit's report", () => {
  const c = osce();
  const shapes = ["{}", "null", "undefined",
                  "{ decisive: null, decisiveFound: null, missedSteps: null }",
                  '{ stepsWithFindings: "x", missedSteps: [], decisive: [], decisiveFound: [] }',
                  "{ stepsWithFindings: NaN, missedSteps: [], decisive: [], decisiveFound: [] }",
                  "{ stepsWithFindings: -5, missedSteps: [], decisive: [], decisiveFound: [] }"];
  for (const sh of shapes) {
    let out;
    assert.doesNotThrow(() => {
      out = c.run(`JSON.stringify(osceMark(${sh}, { condition: "X", urgent: false }))`);
    }, "osceMark threw on " + sh);
    const r = JSON.parse(out);
    assert.ok(isFinite(r.total), "a non-finite mark from " + sh + ": " + r.total);
    assert.ok(r.total >= 0 && r.total <= 1, "an out-of-range mark from " + sh + ": " + r.total);
  }
});

test("a malformed CASE does not crash the marking either", () => {
  const c = osce();
  for (const sh of ["null", "undefined", "{}", '"x"', "0"]) {
    assert.doesNotThrow(() => c.run(`osceMark(${JSON.stringify(PERFECT)}, ${sh})`),
      "osceMark threw on case " + sh);
  }
});

test("the pass mark is labelled practice guidance, not certification", () => {
  /* Entopic must not assert a certifying standard it has no authority to set. */
  assert.match(read("js/osce.js"), /practice guidance only, not certification/i,
    "the OSCE pass mark no longer states that it is not a certifying standard");
});
