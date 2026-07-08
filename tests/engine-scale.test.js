/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE SCALE / PERFORMANCE                                      */
/* The KB is meant to grow ~100x. These tests prove the indexed     */
/* engine (a) stays correct when the KB is inflated with thousands  */
/* of unrelated conditions, and (b) stays fast (cost scales with    */
/* the evidence, not the KB size).                                  */
/*                                                                   */
/* We inflate the real KB with namespaced clones (distinct tokens/  */
/* routes) so the patient's evidence still matches ONLY the real    */
/* conditions — modelling a large KB where any one encounter        */
/* touches a small slice.                                           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { createEngine } = require("../tools/lib/load-engine");

/* Inflate KNOWLEDGE_ALL inside an engine sandbox to `mult`x with clones
   whose tokens/routes are namespaced so they can never match real evidence,
   then rebuild the indexes. Clone 0 is the untouched real KB. */
function inflate(eng, mult) {
  const ctx = eng.context;
  const ns = (arr, k) => arr.map((t) => t + "__k" + k);
  const base = ctx.KNOWLEDGE_ALL.slice();
  const big = base.slice();
  for (let k = 1; k < mult; k++) {
    for (const c of base) {
      const cl = JSON.parse(JSON.stringify(c));
      cl.name = c.name + " #" + k;
      cl.req = ns(c.req, k); cl.sup = ns(c.sup, k); cl.con = ns(c.con, k);
      cl.route = c.route + "_k" + k;
      big.push(cl);
    }
  }
  ctx.KNOWLEDGE_ALL.length = 0;
  big.forEach((c, i) => { c._index = i; ctx.KNOWLEDGE_ALL.push(c); });
  vm.runInContext("rebuildKbIndexes()", ctx);
  return ctx.KNOWLEDGE_ALL.length;
}

const CASE = {
  symptoms: ["dryness", "burning", "worse_evening", "grittiness", "near_strain", "asthenopia"],
  iop: { od: "26", os: "27" }, fun: { od: { cd_v: "0.7" }, os: { cd_v: "0.5" } },
  inv: { vf_md_od: "-4.5" }, hxF: { glaucoma: true },
  bv: { npc_b: "12", ct_n: "10 exo" }, temporal: { duration: "months" }
};

test("results are identical whether the KB is 1x or 100x (index is behaviour-preserving)", () => {
  const small = createEngine();
  const before = small.runCase(CASE, { age: "58" });
  /* Array.from into the test realm (sandbox arrays are cross-realm). */
  const beforeDx = Array.from(before.dxList, (d) => d.n + "@" + d.prob.toFixed(4)).join(" | ");

  const big = createEngine();
  const n = inflate(big, 100); // ~13,000 conditions
  assert.ok(n >= 13000, "KB inflated to 100x");
  const after = big.runCase(CASE, { age: "58" });
  const afterDx = Array.from(after.dxList, (d) => d.n + "@" + d.prob.toFixed(4)).join(" | ");

  assert.strictEqual(afterDx, beforeDx,
    "differential (names + scores + order) must be identical at 100x scale");
  assert.strictEqual(after.V.problemFoci.length, before.V.problemFoci.length,
    "problem foci unchanged at scale");
});

test("a red-flag case still fires correctly inside a 100x KB", () => {
  const big = createEngine();
  inflate(big, 100);
  const out = big.runCase({ symptoms: ["flashes", "floaters"], temporal: { onset: "sudden_onset" } });
  assert.ok(out.alerts.some((a) => /flashes \+ floaters/i.test(a.m)),
    "retinal red-flag alert fires regardless of KB size");
  assert.ok(out.dxList.some((d) => d.n.indexOf("Retinal Tear") >= 0));
});

test("engine stays fast at 100x KB (cost scales with evidence, not KB size)", () => {
  const big = createEngine();
  inflate(big, 100); // ~13,000 conditions
  /* warm */
  big.runCase(CASE, { age: "58" });
  const iters = 30;
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) big.runCase(CASE, { age: "58" });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / iters;
  /* Generous ceiling for CI variance; observed ~4 ms locally (was ~144 ms
     before indexing). This guards against a regression to full-KB scans. */
  assert.ok(ms < 40, `100x KB run took ${ms.toFixed(1)} ms/run (ceiling 40 ms)`);
});
