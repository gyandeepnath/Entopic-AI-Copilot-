/* ═══════════════════════════════════════════════════════════════ */
/* NEXT-TEST RECOMMENDER — the diagnostic refinement loop           */
/* Entopic doesn't return a bare probabilistic answer; it ranks a    */
/* differential and tells the clinician what to CHECK NEXT to narrow  */
/* it. These tests pin the behaviour that makes that loop trustworthy:*/
/*   • it only suggests findings that can actually be ENTERED         */
/*     (reachable) — a suggestion you can't act on is useless         */
/*   • it stays quiet when one diagnosis already DOMINATES            */
/*   • it fires when candidates genuinely COMPETE, and the top        */
/*     suggestion is a real discriminator (confirms leader / rules    */
/*     out a rival)                                                   */
/*   • it is DETERMINISTIC (same input → same suggestions)            */
/*   • suggested targets are valid exam steps                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const REG = eng.context.TOKEN_REGISTRY;
const VALID_STEPS = new Set([
  "demographics", "chief_complaint", "hx_ocular", "hx_medical", "hx_family",
  "va", "refraction", "dilation", "slit_lamp", "iop", "pupil", "motility",
  "bv", "gonioscopy", "fundus", "neuro", "investigations", "diagnosis", "plan"
]);

test("every suggested next-test token is reachable (clinician can actually enter it)", () => {
  const presentations = [
    ["pain", "photophobia", "redness"],
    ["redness", "itching_dominant", "watering"],
    ["flashes", "floaters"],
    ["gradual_blur", "reduced_vision", "older_age"],
    ["distortion", "central_blur", "older_age"],
    ["diplopia", "headache"]
  ];
  const bad = [];
  for (const symptoms of presentations) {
    const out = eng.runCase({ symptoms });
    for (const t of (out.nextTests || [])) {
      if (!REG[t.token] || REG[t.token].reachable === false) bad.push(symptoms.join("+") + " → " + t.token);
    }
  }
  assert.deepStrictEqual(bad, [], "unenterable next-test suggestions:\n" + bad.join("\n"));
});

test("never suggests a finding that is already present", () => {
  const symptoms = ["pain", "photophobia", "redness"];
  const out = eng.runCase({ symptoms });
  const present = new Set(out.tokens);
  for (const t of (out.nextTests || [])) {
    assert.ok(!present.has(t.token), "suggested an already-present token: " + t.token);
  }
});

test("stays quiet when a single diagnosis dominates the differential", () => {
  /* Classic nuclear sclerotic cataract — one candidate far ahead of the rest;
     there is nothing to discriminate, so no next-tests. */
  const out = eng.runCase({ symptoms: ["gradual_blur", "reduced_vision", "older_age"] });
  assert.ok(out.dxList[0].prob >= 0.75, "expected a dominant leader");
  const rivalClose = out.dxList.slice(1).some((d) => d.prob >= out.dxList[0].prob - 0.30);
  if (!rivalClose) {
    assert.strictEqual((out.nextTests || []).length, 0,
      "should not suggest next-tests when the leader dominates");
  }
});

test("fires with real discriminators when candidates genuinely compete", () => {
  /* Painful photophobic red eye: iritis vs herpetic vs conjunctivitis all
     compete; there MUST be a discriminating finding to check next. */
  const out = eng.runCase({ symptoms: ["pain", "photophobia", "redness"] });
  const competing = out.dxList.filter((d) => d.prob >= out.dxList[0].prob - 0.30).length;
  assert.ok(competing >= 2, "expected competing candidates");
  assert.ok((out.nextTests || []).length > 0, "expected next-test suggestions");
  /* Each suggestion must actually discriminate — confirm and/or exclude at
     least one focus condition. */
  for (const t of out.nextTests) {
    assert.ok((t.confirms.length + t.excludes.length) > 0, t.token + " discriminates nothing");
  }
  /* AC cells is the canonical iritis/uveitis discriminator and should surface. */
  assert.ok(out.nextTests.some((t) => t.token === "cells_present"),
    "expected AC cells among suggestions for a painful photophobic red eye");
});

test("does not offer onset/course tokens as next-tests (captured at intake)", () => {
  const skip = new Set(["sudden_onset", "gradual_onset", "acute", "chronic", "subacute", "recurrent", "progressive"]);
  for (const symptoms of [["flashes", "floaters"], ["pain", "photophobia", "redness"]]) {
    const out = eng.runCase({ symptoms });
    for (const t of (out.nextTests || [])) {
      assert.ok(!skip.has(t.token), "offered an onset/course token: " + t.token);
    }
  }
});

test("every suggested target is a valid exam step", () => {
  for (const symptoms of [["pain", "photophobia", "redness"], ["flashes", "floaters"], ["redness", "itching_dominant", "watering"]]) {
    const out = eng.runCase({ symptoms });
    for (const t of (out.nextTests || [])) {
      assert.ok(VALID_STEPS.has(t.target), "invalid target step '" + t.target + "' for " + t.token);
    }
  }
});

test("next-test suggestions are deterministic", () => {
  const symptoms = ["redness", "itching_dominant", "watering"];
  const a = eng.runCase({ symptoms }).nextTests.map((t) => t.token + ":" + t.target);
  const b = eng.runCase({ symptoms }).nextTests.map((t) => t.token + ":" + t.target);
  assert.deepStrictEqual(a, b, "next-test order/targets not deterministic");
});

test("entering a suggested finding refines the loop (leader separates from rivals)", () => {
  /* Simulate one turn of the loop: take the painful red eye, apply the top
     confirming discriminator, and confirm the leader's lead widens. */
  const base = eng.runCase({ symptoms: ["pain", "photophobia", "redness"] });
  const confirm = (base.nextTests || []).find((t) => t.confirms.length > 0);
  assert.ok(confirm, "expected a confirming discriminator to apply");
  const after = eng.runCase({ symptoms: ["pain", "photophobia", "redness", confirm.token] });
  const leadGapBefore = base.dxList.length > 1 ? base.dxList[0].prob - base.dxList[1].prob : 1;
  const leadGapAfter = after.dxList.length > 1 ? after.dxList[0].prob - after.dxList[1].prob : 1;
  /* the discriminator should not SHRINK the leader's separation (it confirms
     the top candidate), and the leader should still be well-formed. */
  assert.ok(after.dxList[0].prob >= base.dxList[0].prob - 1e-9, "leader confidence should not drop after a confirming finding");
  assert.ok(leadGapAfter >= leadGapBefore - 1e-9, "confirming discriminator should not reduce the leader's separation");
});
