/* ═══════════════════════════════════════════════════════════════ */
/* DE-IDENTIFICATION — THE VOCABULARY GATE                          */
/*                                                                  */
/* Promoted from tools/stress/privacy.js, which found the defect:   */
/*                                                                  */
/* The research corpus's de-identification defence was a whitelist   */
/* of FIELDS. It controlled which keys were copied and said nothing  */
/* about their VALUES, while the module header claimed the kept      */
/* content was "tokens and labels only, never free text".            */
/*                                                                  */
/* Symptom entries, slit-lamp finding labels and the referral        */
/* destination were copied verbatim. A string that never passed      */
/* through the app's dropdowns — from a restored backup, a synced    */
/* record, or a future free-text field — travelled intact into the   */
/* corpus and out through corpusExport().                            */
/*                                                                  */
/* Values are now checked against the same vocabularies the UI       */
/* offers. These tests pin BOTH directions, because the first        */
/* version of the stress harness passed while withholding            */
/* everything: a gate that refuses all input leaks nothing and is    */
/* also useless. Half of what follows is positive control.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Loads the REAL corpus module over the real vocabularies. `withVocab: false`
   simulates the load-order failure the gate must fail closed on. */
function corpus(opts) {
  opts = opts || {};
  const store = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set,
    parseInt, parseFloat, isNaN, isFinite,
    module: { exports: {} },
    APP_VERSION: "1.5.0", KB_VERSION: "1.3.1",
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {},
    loadStore: (k, d) => (Object.prototype.hasOwnProperty.call(store, k) ? JSON.parse(store[k]) : d),
    saveStore: (k, v) => { store[k] = JSON.stringify(v); return true; },
    logAudit: () => {}
  };
  vm.createContext(ctx);
  const files = [];
  if (opts.withVocab !== false) files.push("knowledge/token-registry.js", "js/data-model.js");
  files.push("js/consent.js", "js/research-corpus.js");
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  ctx.run = (e) => vm.runInContext(e, ctx);
  ctx.run(`consentSet("p1", CORPUS_PURPOSE, "granted", "test")`);
  return ctx;
}

const PATIENT = { id: "p1", age: 42, sex: "F" };
function visit(over) {
  return Object.assign({
    id: "v1", date: "2026-03-15T09:00:00.000Z",
    symptoms: ["redness", "distance_blur"],
    sl: { findings: [{ label: "Chalazion", eye: "OD" }] },
    plan: { ref_to: "Retina specialist", ref_urgency: "Routine" },
    dxList: [{ n: "Dry eye", prob: 0.42, icd: "H04.123", urgent: false }]
  }, over || {});
}
function capture(c, over) {
  c.__pt = PATIENT; c.__vs = visit(over);
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  return { res, rec: c.run("corpusLoad().detail[0]") };
}

const LEAK = "ZZFREETEXTZZ";

/* NOTE ON COMPARISONS. Arrays and objects built inside the sandbox carry that
   realm's prototypes, so deepStrictEqual fails on identity even when every
   value matches. Compare by join()/JSON, never by deep equality, across this
   boundary. */


/* ═══ The gate keeps real clinical vocabulary (positive control) ═══ */

test("the vocabularies load, so the tests below are not vacuous", () => {
  const { rec } = capture(corpus());
  assert.strictEqual(rec.vocab_incomplete, false,
    "with no vocabulary the gate withholds everything and every leak test passes for free");
});

test("legitimate symptoms, findings, referral and diagnosis all survive", () => {
  const { rec } = capture(corpus());
  assert.strictEqual((rec.symptoms || []).join(","), "redness,distance_blur");
  assert.strictEqual((rec.findings || []).join(","), "Chalazion");
  assert.strictEqual(rec.referral, "Retina specialist");
  assert.strictEqual(rec.referral_urgency, "Routine");
  assert.strictEqual(rec.dx[0].name, "Dry eye");
  assert.strictEqual(rec.dx[0].icd, "H04.123");
  assert.strictEqual(rec.withheld_values, 0, "a clean visit must report nothing withheld");
});


/* ═══ The gate withholds anything outside the vocabulary ═══ */

test("a symptom that is not a known token is withheld", () => {
  const { rec } = capture(corpus(), { symptoms: ["redness", LEAK] });
  assert.strictEqual((rec.symptoms || []).join(","), "redness");
  assert.strictEqual(rec.withheld_values, 1);
});

test("a finding label that is not in the picker is withheld", () => {
  const { rec } = capture(corpus(), {
    sl: { findings: [{ label: "Chalazion" }, { label: LEAK + " custom" }] }
  });
  assert.strictEqual((rec.findings || []).join(","), "Chalazion");
});

test("a referral destination that never came from the dropdown is withheld", () => {
  const { rec } = capture(corpus(), { plan: { ref_to: LEAK + " Hospital", ref_urgency: "Routine" } });
  assert.strictEqual(rec.referral, "", "free text reached a de-identified export field");
  assert.strictEqual(rec.referral_urgency, "Routine", "the legitimate urgency must survive");
});

test("a referral urgency outside the list is withheld", () => {
  const { rec } = capture(corpus(), { plan: { ref_to: "Retina specialist", ref_urgency: LEAK } });
  assert.strictEqual(rec.referral_urgency, "");
});

test("a malformed ICD code is blanked without dropping the diagnosis", () => {
  const { rec } = capture(corpus(), { dxList: [{ n: "Dry eye", prob: 0.4, icd: LEAK + " not a code" }] });
  assert.strictEqual(rec.dx[0].icd, "");
  assert.strictEqual(rec.dx[0].name, "Dry eye");
});

test("sex is reduced to a bounded value rather than republished free-form", () => {
  const c = corpus();
  const cases = [["Female", "F"], ["male", "M"], ["Other", "O"], [LEAK, "unknown"], ["", "unknown"]];
  cases.forEach(([input, want], i) => {
    c.__pt = { id: "p1", age: 42, sex: input };
    c.__vs = visit({ id: "v" + i });
    c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  });
  const seen = c.run("JSON.stringify(corpusLoad().detail.map(function(r){return r.sex}))");
  for (const v of JSON.parse(seen)) {
    assert.ok(["M", "F", "O", "unknown"].includes(v), "unbounded sex value in the corpus: " + v);
  }
  assert.ok(!c.run("JSON.stringify(corpusLoad())").includes(LEAK));
});

test("no planted marker survives into the export, which is what leaves", () => {
  const c = corpus();
  c.__pt = PATIENT;
  c.__vs = visit({
    symptoms: [LEAK + "_sym"], cc: LEAK, notes: LEAK,
    sl: { findings: [{ label: LEAK }] },
    plan: { ref_to: LEAK, ref_urgency: LEAK },
    dxList: [{ n: "Dry eye", prob: 0.4, icd: LEAK }]
  });
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const out = c.run("JSON.stringify(corpusExport('export-salt'))");
  assert.ok(!out.includes(LEAK), "free text left the device in a research export");
});


/* ═══ Failure modes ═══ */

test("the gate fails CLOSED when the vocabulary is missing", () => {
  /* A load-order change must degrade analytics, never wave values through. */
  const { rec } = capture(corpus({ withVocab: false }));
  assert.strictEqual(rec.vocab_incomplete, true,
    "an incomplete vocabulary must be declared on the record, not hidden");
  assert.strictEqual((rec.symptoms || []).length, 0);
  assert.strictEqual((rec.findings || []).length, 0);
  assert.strictEqual(rec.referral, "");
});

test("the withheld count keeps denominators honest", () => {
  const { rec } = capture(corpus(), { symptoms: ["redness", LEAK + "a", LEAK + "b"] });
  assert.strictEqual(rec.withheld_values, 2,
    "an analyst must be able to tell one symptom from four we refused to publish");
});

test("a hostile visit shape cannot throw into the clinical save path", () => {
  /* corpusCapture runs inside doSave(). If it throws, the PATIENT RECORD fails
     to save — secondary analytics must never be able to do that. */
  const c = corpus();
  const hostile = [
    'null', 'undefined', '{}', '0', '""',
    '{ id: "v", symptoms: "notanarray", dxList: "notanarray" }',
    '{ id: "v", dxList: [null, 0, "x"] }',
    '{ id: "v", sl: { findings: [null, 0, {}, { label: null }] } }',
    '{ id: "v", symptoms: [1, null, {}, []] }',
    '{ id: "v", dxList: [{ n: "x", prob: Infinity }] }'
  ];
  for (const h of hostile) {
    assert.doesNotThrow(
      () => c.run(`corpusCapture(${h}, { id: "p1", age: 40, sex: "F" }, {})`),
      "corpusCapture threw on " + h + " — that would fail the clinical save");
  }
});

test("a non-finite probability never reaches the corpus", () => {
  const { rec } = capture(corpus(), { dxList: [{ n: "Dry eye", prob: Infinity, icd: "H04.123" }] });
  assert.strictEqual(rec.dx[0].prob, null, "Infinity must not be published as a probability");
});

test("the referral vocabulary the corpus checks is the SAME one the UI renders", () => {
  /* Two lists that must agree is the point; one list that agrees with itself
     proves nothing. The UI must render from the canonical constant, not from
     its own inline copy. */
  const ui = read("js/ui-pages-2.js");
  assert.match(ui, /REFERRAL_TARGETS\.map/, "the referral dropdown must render from the constant");
  assert.match(ui, /REFERRAL_URGENCIES\.map/, "the urgency dropdown must render from the constant");
  assert.ok(!/<option[^>]*>Ophthalmologist</.test(ui),
    "an inline referral option list has reappeared and will drift from the corpus vocabulary");
});
