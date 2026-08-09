/* ═══════════════════════════════════════════════════════════════ */
/* FAMILY HISTORY REACHES THE ENGINE  (Phase 8, §24)               */
/*                                                                  */
/* FOUND BY MUTATION TESTING.                                        */
/* Disabling the family-history block entirely —                     */
/*                                                                  */
/*   if (V.hxF) {  →  if (false && V.hxF) {                          */
/*                                                                  */
/* left the full 1,142-test suite passing. Nothing anywhere         */
/* asserted that a recorded family history changes what the engine  */
/* does. A device could ignore every family history a clinician     */
/* entered — of glaucoma, of retinal detachment, of diabetes — and  */
/* the build would stay green.                                      */
/*                                                                  */
/* The clinical effect is real but not dramatic (family history is  */
/* supportive evidence, not a red flag), which is exactly why it    */
/* went untested: the top diagnosis rarely changes, only the        */
/* weighting and the lower-ranked order. But "recorded and ignored" */
/* is a distinct failure from "recorded and weighted lightly", and  */
/* only the first is a bug.                                         */
/*                                                                  */
/* These tests assert BEHAVIOUR — the tokens the engine derives and */
/* the differential it produces — not the source text of the block. */
/* The token names are read from js/engine.js's own mapping; the    */
/* clinical WEIGHT of family history remains the founder's call and */
/* is not asserted here.                                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const tokensFor = (visitOverrides) =>
  Array.from(eng.runCase(visitOverrides, { age: "55" }).tokens);


/* ═══ 1. EACH FAMILY-HISTORY FLAG PRODUCES ITS TOKEN ═══ */

const FH_TOKENS = [
  ["glaucoma",    { glaucoma: true },    ["family_history"]],
  ["AMD",         { amd: true },         ["family_history"]],
  ["retinal detachment", { rd: true },   ["family_history", "risk_detachment"]],
  ["keratoconus", { keratoconus: true }, ["family_history"]],
  ["high myopia", { myopia_high: true }, ["family_history"]],
  ["diabetes",    { dm: true },          ["diabetes_history"]]
];

for (const [name, hxF, expected] of FH_TOKENS) {
  test("family history of " + name + " reaches the token set", () => {
    const toks = tokensFor({ hxF });
    for (const t of expected) {
      assert.ok(toks.indexOf(t) >= 0,
        "family history of " + name + " should produce the token '" + t +
        "', but the engine ignored it. Tokens: " + JSON.stringify(toks));
    }
  });
}

test("no family-history token appears when no family history is recorded", () => {
  const toks = tokensFor({ hxF: {} });
  for (const t of ["family_history", "risk_detachment", "diabetes_history"]) {
    assert.strictEqual(toks.indexOf(t), -1,
      "the engine invented a family-history token ('" + t + "') from an empty history");
  }
});


/* ═══ 2. IT ACTUALLY CHANGES THE DIFFERENTIAL ═══
   A token that is derived but never used is no better than one that is
   ignored. This is the behavioural half: the same glaucoma-suspect case, with
   and without a family history of glaucoma, must not score identically. */

test("a recorded family history of glaucoma changes the glaucoma differential", () => {
  const CASE = { iop: { od: "26" }, fun: { od: { cd_v: "0.7" } }, inv: { vf_md_od: "-4.5" } };
  const withFH = eng.runCase(Object.assign({ hxF: { glaucoma: true } }, CASE), { age: "58" });
  const without = eng.runCase(Object.assign({ hxF: {} }, CASE), { age: "58" });

  const sig = (out) => Array.from(out.dxList, (d) => d.n + "@" + d.prob.toFixed(4)).join(" | ");
  assert.notStrictEqual(sig(withFH), sig(without),
    "the differential was byte-identical with and without a family history of glaucoma — " +
    "the recorded history is being ignored");

  /* And in the clinically expected direction: the glaucoma leader is not
     scored LOWER when a family history of glaucoma is present. */
  const poagWith = withFH.dxList.find((d) => /open angle glaucoma \(poag\)/i.test(d.n));
  const poagWithout = without.dxList.find((d) => /open angle glaucoma \(poag\)/i.test(d.n));
  assert.ok(poagWith && poagWithout, "setup: POAG should be in both differentials");
  assert.ok(poagWith.prob >= poagWithout.prob,
    "a family history of glaucoma lowered the glaucoma score (" +
    poagWithout.prob.toFixed(4) + " -> " + poagWith.prob.toFixed(4) + ")");
});

test("a family history of retinal detachment is not silently dropped", () => {
  /* rd is the one family-history flag that adds a SECOND, distinct token
     (risk_detachment), so it is the clearest test that the block runs to
     completion rather than short-circuiting after the first flag. */
  const toks = tokensFor({ hxF: { rd: true } });
  assert.ok(toks.indexOf("risk_detachment") >= 0,
    "family history of retinal detachment did not add risk_detachment: " + JSON.stringify(toks));
});
