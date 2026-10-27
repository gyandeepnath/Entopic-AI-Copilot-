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

/* Since 2026-10-27 an exclusion DEMOTES its target and labels it; it never
   removes it. Deleting by name fragment hid fully-presented conditions — a
   fourth-nerve palsy scoring 0.81 vanished because Convergence Insufficiency
   scored 0.5, and Allergic Conjunctivitis reached 24 keratitis/uveitis
   entries including Acute Anterior Uveitis. */
const DEMOTE = vm.runInContext("scoreThreshold('exclusion_demote_factor', 0.5)", eng.context);

test("normalized matching fires: a high scorer demotes a non-urgent target, never removes it", () => {
  /* Dry Eye (Evaporative) excludes "allergic_conjunctivitis"; the display
     name is "Allergic Conjunctivitis" — only matches after normalization. */
  const results = [
    { name: "Dry Eye Disease - Evaporative (MGD)", score: 0.8, urgent: false },
    { name: "Allergic Conjunctivitis", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  const ac = out.find((r) => r.name === "Allergic Conjunctivitis");
  assert.ok(ac, "the target is still in the list");
  assert.ok(Math.abs(ac.score - 0.3 * DEMOTE) < 1e-9, "and demoted: " + ac.score);
  assert.strictEqual(ac._excludedBy, "Dry Eye Disease - Evaporative (MGD)", "labelled with what argued against it");
  assert.strictEqual(out.length, 2);
});

test("renamed exclusion resolves: Divergence Insufficiency demotes Sixth CN Palsy", () => {
  const results = [
    { name: "Divergence Insufficiency", score: 0.7, urgent: false },
    { name: "Sixth Cranial Nerve Palsy", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  const p6 = out.find((r) => r.name === "Sixth Cranial Nerve Palsy");
  assert.ok(p6 && p6._excludedBy === "Divergence Insufficiency",
    "sixth_cranial_nerve_palsy exclusion should resolve and apply");
  assert.ok(p6.score < 0.3);
});

test("a condition better supported than its objector is not demoted at all", () => {
  /* An exclusion means "if A is the explanation, B is less likely". A weaker A
     is not the leading explanation. Measured case: a fourth-nerve palsy at
     0.81 was deleted by Convergence Insufficiency at 0.5. */
  const out = applyExclusions([
    { name: "Convergence Insufficiency", score: 0.55, urgent: false },
    { name: "Fourth Cranial Nerve Palsy", score: 0.81, urgent: false }
  ]);
  const p4 = out.find((r) => r.name === "Fourth Cranial Nerve Palsy");
  assert.strictEqual(p4.score, 0.81);
  assert.strictEqual(p4._excludedBy, undefined);
});

test("a condition with ALL its required findings present is never demoted", () => {
  const out = applyExclusions([
    { name: "Convergence Insufficiency", score: 0.87, urgent: false },
    { name: "Fourth Cranial Nerve Palsy", score: 0.82, urgent: false,
      _scoreDetail: { reqMatched: 1, reqMissing: 0 } }
  ]);
  const p4 = out.find((r) => r.name === "Fourth Cranial Nerve Palsy");
  assert.strictEqual(p4.score, 0.82, "an established condition is not overruled");
  /* ...while a partly supported one still is. */
  const partial = applyExclusions([
    { name: "Convergence Insufficiency", score: 0.87, urgent: false },
    { name: "Fourth Cranial Nerve Palsy", score: 0.30, urgent: false,
      _scoreDetail: { reqMatched: 0, reqMissing: 1 } }
  ]).find((r) => r.name === "Fourth Cranial Nerve Palsy");
  assert.ok(partial.score < 0.30 && partial._excludedBy === "Convergence Insufficiency");
});

test("one objector demotes once; two objectors do not stack", () => {
  const out = applyExclusions([
    { name: "Dry Eye Disease - Evaporative (MGD)", score: 0.8, urgent: false },
    { name: "Bacterial Conjunctivitis", score: 0.7, urgent: false },
    { name: "Allergic Conjunctivitis", score: 0.4, urgent: false }
  ]);
  const ac = out.find((r) => r.name === "Allergic Conjunctivitis");
  assert.ok(Math.abs(ac.score - 0.4 * DEMOTE) < 1e-9, "demoted once, not twice: " + ac.score);
  assert.strictEqual(ac._excludedBy, "Dry Eye Disease - Evaporative (MGD)", "named after the strongest objector");
});

test("end-to-end: a fully presented fourth-nerve palsy is not deleted by Convergence Insufficiency", () => {
  /* Measured on the real engine before the fix: present both conditions'
     own pictures, and the palsy (own score 0.81) disappeared entirely. */
  const pick = (n) => vm.runInContext("(function(){var c=findCondition(" + JSON.stringify(n) +
    ");return c.req.concat(c.sup, (c.temporal||[]).slice(0,1))})()", eng.context);
  const out = eng.runCase({ symptoms: pick("Convergence Insufficiency").concat(pick("Fourth Cranial Nerve Palsy")) });
  const names = out.dxList.map((d) => d.n);
  assert.ok(names.indexOf("Fourth Cranial Nerve Palsy") >= 0, "the palsy was removed: " + names.join(", "));
});

test("end-to-end: a fully presented condition stays in the differential beside its objector", () => {
  /* Allergic conjunctivitis + acute anterior uveitis signs: the uveitis must
     still be on the list (it used to be deleted by the "uveitis" fragment). */
  const ac = vm.runInContext("(function(){var c=findCondition('Allergic Conjunctivitis');return c.req.concat(c.sup)})()", eng.context);
  const au = vm.runInContext("(function(){var c=findCondition('Anterior Uveitis (Acute)');return c.req.concat(c.sup, c.tests||[])})()", eng.context);
  const out = eng.runCase({ symptoms: ac.concat(au) });
  const names = out.dxList.map((d) => d.n);
  assert.ok(names.indexOf("Anterior Uveitis (Acute)") >= 0, "uveitis is still shown: " + names.join(", "));
});

test("low scorers exclude nothing", () => {
  const results = [
    { name: "Dry Eye Disease - Evaporative (MGD)", score: 0.49, urgent: false },
    { name: "Allergic Conjunctivitis", score: 0.3, urgent: false }
  ];
  const out = applyExclusions(results);
  assert.strictEqual(out.length, 2, "below the 0.5 threshold nothing is suppressed");
});

test("an exclusion entry that is blank or punctuation removes nothing", () => {
  /* Every name contains the empty string, so "" or "-" in one condition's list
     deleted every non-urgent condition whenever that condition scored >= 0.5. */
  const saved = vm.runInContext("JSON.stringify(KB_EXCLUSION_MAP['Divergence Insufficiency'])", eng.context);
  vm.runInContext("KB_EXCLUSION_MAP['Divergence Insufficiency'] = ['', ' ', '-', '()'];", eng.context);
  try {
    const out = applyExclusions([
      { name: "Divergence Insufficiency", score: 0.9, urgent: false },
      { name: "Allergic Conjunctivitis", score: 0.3, urgent: false },
      { name: "Presbyopia", score: 0.3, urgent: false }
    ]);
    assert.strictEqual(out.length, 3, "removed: " + JSON.stringify(out.map((r) => r.name)));
  } finally {
    vm.runInContext("KB_EXCLUSION_MAP['Divergence Insufficiency'] = " + saved + ";", eng.context);
  }
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
  /* Re-authored 2026-10-27: "halos" is a POAG contradictor, and once the
     engine weighed how much of a presentation each condition explains, POAG
     could no longer reach 0.5 beside it (0.499) — so the vignette stopped
     exercising the exclusion, as the precondition below warns. Without halos
     the acute picture is still severe pain, vomiting and IOP 46 (and
     "nausea_vomiting" was never a real token; "vomiting" is). */
  const out = eng.runCase(
    {
      symptoms: ["pain_severe", "vomiting"],
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


/* ═══ DECISION-TREE GATES NAME REAL CONDITIONS ═══
   A gate surfaces conditions BY NAME. Two names matched nothing — "PVD" (the
   entry is "Posterior Vitreous Detachment (PVD)") and "Keratitis" (there are
   fourteen, none called that) — so those parts of the safety gates silently did
   nothing, and no test noticed. */
test("every condition a decision-tree gate names exists in the knowledge base", () => {
  const vm = require("node:vm");
  const src = require("node:fs").readFileSync(require("node:path").resolve(__dirname, "..", "js/engine.js"), "utf8");
  const a = src.indexOf("function applyDecisionTree"), b = src.indexOf("function selectRoutes");
  assert.ok(a > 0 && b > a, "applyDecisionTree must exist for this check to mean anything");
  const names = [...src.slice(a, b).matchAll(/conditions:\s*\[([^\]]*)\]/g)]
    .flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  assert.ok(names.length >= 8, "expected the gate condition lists, found " + names.length);
  const eng2 = require("../tools/lib/load-engine").createEngine();
  const missing = names.filter((n) => !vm.runInContext("findCondition(" + JSON.stringify(n) + ")", eng2.context));
  assert.deepStrictEqual(missing, [], "a safety gate names a condition that does not exist:\n  " + missing.join("\n  "));
});
