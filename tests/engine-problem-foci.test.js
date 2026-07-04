/* ═══════════════════════════════════════════════════════════════ */
/* PROBLEM FOCI (concurrent independent problems)                  */
/* computeProblemFoci partitions the scored differential into        */
/* independent clinical problems by domain, so co-existing           */
/* conditions don't compete for one slot. It is a presentation       */
/* layer: it must NOT change V.dxList or scoring.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

test("no evidence → no problem foci", () => {
  const out = eng.runCase({});
  assert.strictEqual(out.V.problemFoci.length, 0);
});

test("a multi-problem patient yields multiple independent foci in different domains", () => {
  /* Dry eye (surface) + glaucoma picture (glaucoma) + convergence
     insufficiency (binocular) — three genuinely independent problems. */
  const out = eng.runCase(
    {
      symptoms: ["dryness", "burning", "worse_evening", "grittiness", "near_strain", "asthenopia"],
      sl: { od: { but: "4" }, os: { but: "5" } },
      iop: { od: "26", os: "27" },
      fun: { od: { cd_v: "0.7" }, os: { cd_v: "0.5" } },
      inv: { vf_md_od: "-4.5" },
      hxF: { glaucoma: true },
      bv: { npc_b: "12", ct_n: "10 exo" },
      temporal: { duration: "months" }
    },
    { age: "58" }
  );
  const foci = out.V.problemFoci;
  const domains = foci.map((f) => f.focus);
  assert.ok(foci.length >= 2, "at least two independent problems surface");
  /* domains are distinct — problems are not collapsed into one list */
  assert.strictEqual(new Set(domains).size, domains.length, "each focus is a distinct domain");
  /* the glaucoma and surface problems each lead their own focus */
  assert.ok(domains.some((d) => /Glaucoma/i.test(d)), "glaucoma problem present");
  assert.ok(domains.some((d) => /Surface/i.test(d)), "surface problem present");
});

test("each focus carries its own lead, confidence band, and candidates", () => {
  const out = eng.runCase({
    symptoms: ["dryness", "burning", "worse_evening", "grittiness"],
    sl: { od: { but: "4" }, os: { but: "5" } },
    temporal: { duration: "months" }
  });
  assert.ok(out.V.problemFoci.length >= 1);
  const f = out.V.problemFoci[0];
  assert.strictEqual(typeof f.lead, "string");
  assert.ok(f.confidence > 0 && f.confidence <= 1);
  assert.strictEqual(typeof f.band, "string");
  assert.ok(Array.isArray(f.candidates) && f.candidates.length >= 1);
});

test("urgent problems sort ahead of non-urgent ones", () => {
  /* Retinal emergency (urgent) alongside a chronic surface complaint. */
  const out = eng.runCase({
    symptoms: ["flashes", "floaters", "dryness", "burning", "grittiness", "worse_evening"],
    sl: { od: { but: "4" }, os: { but: "5" } },
    temporal: { duration: "months" }
  });
  const foci = out.V.problemFoci;
  assert.ok(foci.length >= 2);
  assert.ok(foci[0].urgent, "an urgent focus leads the list");
});

test("foci are a view over dxList — they do not change the differential", () => {
  const overrides = {
    symptoms: ["dryness", "burning", "grittiness"],
    temporal: { duration: "months" }
  };
  const a = eng.runCase(overrides);
  const namesA = a.dxList.map((d) => d.n);
  /* run again — dxList identical, foci derived from it */
  const b = eng.runCase(overrides);
  assert.deepStrictEqual(b.dxList.map((d) => d.n), namesA);
  /* every focus lead is a member of dxList */
  for (const f of b.V.problemFoci) {
    assert.ok(namesA.indexOf(f.lead) >= 0, "focus lead comes from dxList");
  }
});

test("low-noise conditions do not manufacture a problem focus", () => {
  /* a single weak token should not spawn a confident problem */
  const out = eng.runCase({ symptoms: ["glare"] });
  for (const f of out.V.problemFoci) {
    assert.ok(f.confidence >= 0.15, "every surfaced focus clears the evidence floor");
  }
});
