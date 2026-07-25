/* ═══════════════════════════════════════════════════════════════ */
/* COLOUR VISION → ENGINE                                           */
/*                                                                  */
/* The founder asked for an explicit "normal" option plus detailed   */
/* per-test entry. Building it exposed a real scoring bug: the engine */
/* fired color_vision_loss for ANY value other than the literal      */
/* string "14/14" — so a normal "17/17", or the word "Normal", was   */
/* scored as a defect — and the OS score was never read at all.      */
/* 15 KB conditions consume this token, so a false positive quietly  */
/* inflated optic-neuropathy differentials.                          */
/*                                                                   */
/* These lock the corrected behaviour in both directions: a normal    */
/* result must stay SILENT, a real defect must FIRE.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const fires = (neuro) => eng.runCase({ neuro: neuro }).tokens.indexOf("color_vision_loss") >= 0;

test("structured result: Normal / Not tested never fire a colour defect", () => {
  assert.strictEqual(fires({ cv: { status: "Normal" } }), false, "explicit Normal must be silent");
  assert.strictEqual(fires({ cv: { status: "Not tested" } }), false, "Not tested must be silent");
  assert.strictEqual(fires({ cv: { status: "" } }), false, "nothing recorded must be silent");
});

test("structured result: a recorded defect fires", () => {
  assert.ok(fires({ cv: { status: "Defective", nature: "Acquired / suspected acquired" } }));
  assert.ok(fires({ cv: { status: "Defective", nature: "Uncertain" } }), "uncertain must still fire (safer default)");
  assert.ok(fires({ cv: { status: "Defective", nature: "" } }), "unqualified defect must fire");
});

test("a KNOWN CONGENITAL defect is documented but not scored as acquired disease", () => {
  /* A lifelong red-green defect is not evidence of an optic neuropathy. This
     is clinician-declared and stated plainly in the UI. */
  assert.strictEqual(fires({ cv: { status: "Defective", nature: "Known congenital" } }), false);
});

test("legacy free-text scores are parsed as fractions, not string-compared", () => {
  /* The old code only recognised the exact string "14/14" as normal. */
  assert.strictEqual(fires({ color_od: "14/14" }), false, "14/14 is a full score");
  assert.strictEqual(fires({ color_od: "17/17" }), false, "17/17 is a full score — the original bug");
  assert.strictEqual(fires({ color_od: "21/21" }), false, "21/21 is a full score");
  assert.ok(fires({ color_od: "12/17" }), "12/17 is a genuine defect");
  assert.ok(fires({ color_od: "6/14" }), "6/14 is a genuine defect");
});

test("legacy free-text words are understood both ways", () => {
  ["Normal", "normal", "Full", "WNL", "NAD", ""].forEach((w) => {
    assert.strictEqual(fires({ color_od: w }), false, "'" + w + "' must be silent");
  });
  ["Protan defect", "deutan", "tritan axis", "defective", "FAIL"].forEach((w) => {
    assert.ok(fires({ color_od: w }), "'" + w + "' must fire");
  });
});

test("the OS eye is read (it was previously ignored entirely)", () => {
  assert.ok(fires({ color_os: "9/17" }), "a defect in OS alone must fire");
  assert.ok(fires({ cv: { status: "Defective" }, color_od: "17/17" }), "structured result wins over legacy text");
});

test("colour vision alone never produces a diagnosis on its own", () => {
  /* Advisory-only discipline: the token is one input among many. */
  const out = eng.runCase({ neuro: { cv: { status: "Defective", nature: "Uncertain" } } });
  const top = out.dxList[0];
  if (top) {
    assert.ok(top.score === undefined || top.score < 0.9,
      "a single colour-vision defect must not yield a near-certain diagnosis");
  }
});
