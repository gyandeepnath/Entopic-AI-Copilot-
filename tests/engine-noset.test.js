/* ═══════════════════════════════════════════════════════════════ */
/* SCORING WITHOUT A SHARED TOKEN SET                               */
/* scoreCondition/generateEvidence accept an optional Set for the    */
/* hot loop, but the flow map (ui-flowmap.js renderExclusionLayer)   */
/* calls them with just an array. A regression once made the no-Set  */
/* fallback recurse into itself (instant stack overflow), crashing   */
/* the glass-box flow map. These tests pin both call shapes to       */
/* identical results.                                                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

test("scoreCondition works and agrees with the Set path when called without a Set", () => {
  const eng = createEngine();
  const ctx = eng.context;
  const tokens = ["dryness", "burning", "grittiness", "worse_evening", "chronic"];
  const tokenSet = new Set(tokens);
  let checked = 0;
  for (const cond of ctx.KNOWLEDGE_ALL) {
    /* Must not throw (the old fallback stack-overflowed immediately). */
    const noSet = ctx.scoreCondition(cond, tokens);
    const withSet = ctx.scoreCondition(cond, tokens, tokenSet);
    assert.strictEqual(noSet.score, withSet.score,
      cond.name + ": no-Set and Set paths must score identically");
    assert.strictEqual(noSet.reqMatched, withSet.reqMatched, cond.name + ": reqMatched differs");
    assert.strictEqual(noSet.supMatched, withSet.supMatched, cond.name + ": supMatched differs");
    assert.strictEqual(noSet.conMatched, withSet.conMatched, cond.name + ": conMatched differs");
    checked++;
  }
  assert.ok(checked >= 100, "scored the whole KB (" + checked + ")");
});

test("generateEvidence works and agrees with the Set path when called without a Set", () => {
  const eng = createEngine();
  const ctx = eng.context;
  const tokens = ["flashes", "floaters", "sudden_vision_loss"];
  const tokenSet = new Set(tokens);
  for (const cond of ctx.KNOWLEDGE_ALL.slice(0, 40)) {
    const sr = ctx.scoreCondition(cond, tokens, tokenSet);
    const a = ctx.generateEvidence(cond, tokens, sr);
    const b = ctx.generateEvidence(cond, tokens, sr, tokenSet);
    assert.strictEqual(Array.from(a.matched).join("|"), Array.from(b.matched).join("|"));
    assert.strictEqual(Array.from(a.missing).join("|"), Array.from(b.missing).join("|"));
    assert.strictEqual(Array.from(a.contradicted).join("|"), Array.from(b.contradicted).join("|"));
  }
});
