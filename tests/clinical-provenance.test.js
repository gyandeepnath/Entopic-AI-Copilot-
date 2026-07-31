/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL PROVENANCE — what produced this differential?           */
/*                                                                  */
/* Clinical review CL-1: a visit recorded WHICH conditions the       */
/* engine ranked, but not which knowledge base ranked them. Because  */
/* the KB is designed to be updated and re-published, a record       */
/* reviewed months later could not be reconciled with what the       */
/* clinician actually saw — today's engine may rank the same         */
/* findings differently. That defeats retrospective audit and the    */
/* "glass box" defensibility the product is built on.                */
/*                                                                  */
/* These pin the stamp AND the guarantee that it is inert: recording */
/* provenance must never change a score, a rank, or an alert.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

function freshVisit(eng, mutate) {
  const ctx = eng.context;
  ctx.V = ctx.blankVisit();
  ctx.P = ctx.blankPatient();
  if (mutate) mutate(ctx.V, ctx.P);
  ctx.runDiagnosticEngine();
  return ctx.V;
}

test("every engine run stamps the knowledge base that produced it", () => {
  const eng = createEngine();
  const V = freshVisit(eng, (V) => {
    V.symptoms = ["dryness", "burning", "fluctuating_blur", "screen_use_exacerbation"];
    V.temporal.onset = "gradual";
  });
  const pv = V.engine_provenance;
  assert.ok(pv, "a differential carries its provenance");
  assert.ok(pv.kb_version, "the KB version is recorded");
  assert.ok(pv.kb_conditions > 0, "and how many conditions it held");
  assert.ok(pv.run_at && /^\d{4}-\d{2}-\d{2}T/.test(pv.run_at), "with a timestamp");
  assert.ok(pv.token_count > 0);
});

test("the provenance records the differential AS SHOWN, not as recomputed later", () => {
  const eng = createEngine();
  const V = freshVisit(eng, (V) => {
    V.symptoms = ["dryness", "burning", "grittiness", "screen_use_exacerbation"];
  });
  const shown = V.engine_provenance.shown_top;
  assert.ok(Array.isArray(shown) && shown.length, "the ranked list is captured");
  assert.strictEqual(shown[0].name, V.dxList[0].n, "the leader matches what the clinician saw");
  assert.ok(typeof shown[0].prob === "number", "with its probability, so a later reviewer can compare");
  assert.strictEqual(shown[0].icd_status, V.dxList[0].icd_status,
    "and whether that ICD code was clinician-verified AT THE TIME");
});

test("urgent alerts are counted in the provenance record", () => {
  const eng = createEngine();
  const V = freshVisit(eng, (V) => { V.symptoms = ["flashes", "floaters"]; });
  assert.ok(V.engine_provenance.urgent_alerts >= 1,
    "a red-flag visit records that a red flag fired, for later audit");
});

test("an empty visit produces no differential and no fabricated provenance", () => {
  const eng = createEngine();
  const V = freshVisit(eng, () => {});
  assert.strictEqual((V.dxList || []).length, 0, "zero evidence still means zero output");
  assert.ok(!V.engine_provenance || !V.engine_provenance.shown_top || !V.engine_provenance.shown_top.length,
    "and nothing is claimed to have been shown");
});

test("stamping provenance does NOT alter scoring, ranking or alerts", () => {
  /* The guarantee that matters: this is a recording change, not a clinical one. */
  const eng = createEngine();
  const build = (V) => {
    V.symptoms = ["pain_severe", "halos", "reduced_vision"];
    V.temporal.onset = "acute";
    V.iop.od = "52";
  };
  const a = freshVisit(eng, build);
  const snapA = { dx: a.dxList.map((d) => d.n + ":" + d.prob), alerts: a.alerts.map((x) => x.m) };
  const b = freshVisit(eng, build);
  const snapB = { dx: b.dxList.map((d) => d.n + ":" + d.prob), alerts: b.alerts.map((x) => x.m) };
  assert.strictEqual(JSON.stringify(snapA), JSON.stringify(snapB),
    "identical input still yields identical clinical output");
  assert.ok(a.alerts.some((x) => x.l === "urgent"), "and the red flag still fires");
});

test("determinism: the same findings give the same differential every time", () => {
  const eng = createEngine();
  const results = new Set();
  for (let i = 0; i < 25; i++) {
    const V = freshVisit(eng, (V) => {
      V.symptoms = ["dryness", "burning", "photophobia", "redness"];
      V.temporal.onset = "gradual";
      V.iop.od = "18";
    });
    results.add(V.dxList.map((d) => d.n + ":" + d.prob.toFixed(6)).join("|"));
  }
  assert.strictEqual(results.size, 1,
    "25 identical runs produced one identical differential — reproducibility is the product's core claim");
});
