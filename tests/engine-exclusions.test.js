/* ═══════════════════════════════════════════════════════════════ */
/* EXCLUSION MATCHER TESTS                                         */
/* The original applyExclusions compared snake_case exclusion       */
/* strings against display names by raw substring — which never     */
/* matched — so comorbidity suppression silently no-oped (audit:     */
/* 16 rules declared, 2 accidental fires). These tests pin the       */
/* fixed behavior:                                                   */
/*   - normalized name matching actually fires                       */
/*   - urgent conditions are NEVER suppressed (safety guardrail)     */
/*   - no self-exclusion                                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

/* Run applyExclusions inside the sandbox on a synthetic results array. */
function applyExclusions(results) {
  eng.context.__results = results;
  return vm.runInContext("applyExclusions(__results, [])", eng.context);
}

test("POAG at high score suppresses nothing urgent — AACC survives (safety guard)", () => {
  const results = [
    { name: "Primary Open Angle Glaucoma (POAG)", score: 0.72, urgent: false },
    { name: "Acute Angle Closure Crisis", score: 0.3, urgent: true }
  ];
  const out = applyExclusions(results);
  const names = out.map((r) => r.name);
  assert.ok(names.indexOf("Acute Angle Closure Crisis") >= 0,
    "urgent condition must never be removed by exclusion logic");
});

test("normalized matching fires: high scorer excludes a non-urgent target", () => {
  /* Dry Eye (Evaporative) excludes "allergic_conjunctivitis"; the display
     name is "Allergic Conjunctivitis" — only matches after normalization. */
  const results = [
    { name: "Dry Eye Disease - Evaporative (MGD)", score: 0.8, urgent: false },
    { name: "Allergic Conjunctivitis", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  const names = out.map((r) => r.name);
  assert.ok(names.indexOf("Allergic Conjunctivitis") === -1,
    "allergic conjunctivitis should be suppressed by high-scoring MGD");
  assert.ok(names.indexOf("Dry Eye Disease - Evaporative (MGD)") >= 0);
});

test("renamed exclusion resolves: Divergence Insufficiency suppresses Sixth CN Palsy", () => {
  const results = [
    { name: "Divergence Insufficiency", score: 0.7, urgent: false },
    { name: "Sixth Cranial Nerve Palsy", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  const names = out.map((r) => r.name);
  assert.ok(names.indexOf("Sixth Cranial Nerve Palsy") === -1,
    "sixth_cranial_nerve_palsy exclusion should now resolve and fire");
});

test("low scorers exclude nothing", () => {
  const results = [
    { name: "Dry Eye Disease - Evaporative (MGD)", score: 0.49, urgent: false },
    { name: "Allergic Conjunctivitis", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  assert.strictEqual(out.length, 2, "below the 0.5 threshold nothing is suppressed");
});

test("a condition never excludes itself", () => {
  /* Allergic Conjunctivitis's own exclusion list contains "uveitis" etc.;
     self-match must be impossible even when it is the high scorer. */
  const results = [{ name: "Allergic Conjunctivitis", score: 0.9, urgent: false }];
  const out = applyExclusions(results);
  assert.strictEqual(out.length, 1);
});

test("end-to-end: high-scoring POAG cannot suppress Acute Angle Closure Crisis", () => {
  /* The life-critical scenario the urgent guard exists for: a chronic
     glaucoma picture scores POAG >= 0.5 (whose exclusion list contains
     "acute_angle_closure") at the same time as an acute angle-closure
     presentation. The fixed matcher WOULD now match — the urgent guard
     must keep the emergency visible in the differential. */
  const out = eng.runCase(
    {
      symptoms: ["pain_severe", "halos", "nausea_vomiting"],
      iop: { od: "46", os: "24" },
      /* glaucomatous disc findings so POAG scores >=0.5 even after the KB
         enrichment added `halos` (an angle-closure symptom) as a POAG
         contradictor — this keeps the vignette exercising the exclusion. */
      fun: { od: { cd_v: "0.7", findings: ["NRR thinning", "Disc hemorrhage"] }, os: { cd_v: "0.5" }, findings: ["NRR thinning", "Disc hemorrhage"] },
      inv: { vf_md_od: "-4.5" },
      hxF: { glaucoma: true },
      temporal: { course: "worsening" }
    },
    { age: "62" }
  );
  const poag = out.dxList.find((d) => d.n.indexOf("Primary Open Angle Glaucoma") >= 0);
  const aacc = out.dxList.find((d) => d.n.indexOf("Acute Angle Closure") >= 0);
  assert.ok(poag && poag.prob >= 0.5,
    "vignette must keep POAG >= 0.5 (else it no longer exercises the exclusion; re-author)");
  assert.ok(aacc, "Acute Angle Closure Crisis must survive exclusion by high-scoring POAG");
  assert.ok(aacc.urgent, "AACC is urgent-flagged");
});
