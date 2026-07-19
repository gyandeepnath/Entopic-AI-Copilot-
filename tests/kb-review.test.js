/* ═══════════════════════════════════════════════════════════════ */
/* RAPID CLINICAL REVIEW QUEUE — core logic                        */
/*                                                                  */
/* Verifies js/kb-review.js against the REAL loaded KB:             */
/*   • the queue lists exactly the provisional conditions, with      */
/*     everything the attestation covers (ICD, urgency, findings,    */
/*     summary), urgent entries first;                               */
/*   • kbRapidVerify flips review + ICD status on the LIVE condition */
/*     and records who/when — and only works once;                   */
/*   • verification never alters clinical content (tokens, ICD code, */
/*     urgency), only the review flags.                              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
["knowledge/condition-info.js", "js/kb-review.js"].forEach((f) => {
  vm.runInContext(
    fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"),
    eng.context,
    { filename: f }
  );
});
function evalIn(expr) { return vm.runInContext(expr, eng.context); }


test("queue lists exactly the provisional conditions, with attestation fields", () => {
  const items = evalIn("kbReviewItems()");
  const expected = evalIn(
    "KNOWLEDGE_ALL.filter(function(c){return c.review_status==='NEEDS_CLINICAL_REVIEW';}).length"
  );
  assert.strictEqual(items.length, expected, "queue matches the provisional count");
  assert.ok(items.length > 0, "there are provisional entries to review");
  const it = items[0];
  assert.ok(it.name && it.domain, "row carries name + domain");
  assert.ok(Array.isArray(it.req), "row carries the required findings");
  assert.strictEqual(typeof it.summary, "string");
});

test("urgent entries come first (their flags are the riskiest to leave unreviewed)", () => {
  const items = evalIn("kbReviewItems()");
  let seenNonUrgent = false;
  for (const it of items) {
    if (!it.urgent) seenNonUrgent = true;
    else assert.ok(!seenNonUrgent, "an urgent entry appeared after non-urgent ones");
  }
});

test("kbRapidVerify flips review + ICD status, records who/when, and works only once", () => {
  const name = evalIn("kbReviewItems()[0].name");
  const before = evalIn("kbReviewItems().length");

  const c = evalIn("kbRapidVerify(" + JSON.stringify(name) + ", 'Dr Founder')");
  assert.ok(c, "verification succeeded");
  assert.strictEqual(c.review_status, "VERIFIED_BY_CLINICIAN");
  assert.strictEqual(c.icd_status, "VERIFIED_BY_CLINICIAN", "the sign-off covers the displayed ICD code");
  assert.strictEqual(c.review_verified_by, "Dr Founder");
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(c.review_verified_on), "dated");

  assert.strictEqual(evalIn("kbReviewItems().length"), before - 1, "queue shrinks");
  assert.strictEqual(evalIn("kbConditionVerified(" + JSON.stringify(name) + ")"), true);
  assert.strictEqual(evalIn("kbRapidVerify(" + JSON.stringify(name) + ", 'x')"), null,
    "already-verified entries cannot be re-verified");
});

test("verification changes review flags ONLY — clinical content is untouched", () => {
  const name = evalIn("kbReviewItems()[0].name");
  const before = evalIn(
    "(function(){var c=findCondition(" + JSON.stringify(name) + ");" +
    "return {req:c.req.slice(),sup:(c.sup||[]).slice(),icd:c.icd,urgent:!!c.urgent,route:c.route};})()"
  );
  evalIn("kbRapidVerify(" + JSON.stringify(name) + ", 'Dr Founder')");
  const after = evalIn(
    "(function(){var c=findCondition(" + JSON.stringify(name) + ");" +
    "return {req:c.req.slice(),sup:(c.sup||[]).slice(),icd:c.icd,urgent:!!c.urgent,route:c.route};})()"
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(after)), JSON.parse(JSON.stringify(before)),
    "tokens, ICD code, urgency and route are byte-identical after sign-off");
});

test("kbConditionVerified is false for unknown or unreviewed conditions", () => {
  assert.strictEqual(evalIn("kbConditionVerified('No Such Condition')"), false);
  const stillProvisional = evalIn("kbReviewItems()[0].name");
  assert.strictEqual(evalIn("kbConditionVerified(" + JSON.stringify(stillProvisional) + ")"), false);
});


/* ═══ EXPORT SIGN-OFFS: verify → export → bake → fresh boot round trip ═══ */

test("kbBuildVerifiedExport produces valid, ready-to-commit verified.js source", () => {
  const name = evalIn("kbReviewItems()[0].name");
  evalIn("kbRapidVerify(" + JSON.stringify(name) + ", 'Dr Founder')");
  const out = evalIn("kbBuildVerifiedExport()");
  assert.ok(out.count >= 1, "counts the verified entries");
  assert.ok(out.source.indexOf(JSON.stringify(name)) >= 0, "includes the verified condition");
  /* the generated file must be valid JS that defines KB_VERIFIED */
  const sandbox = {};
  vm.runInNewContext(out.source, sandbox);
  assert.ok(sandbox.KB_VERIFIED && sandbox.KB_VERIFIED[name], "parses back to KB_VERIFIED");
  assert.strictEqual(sandbox.KB_VERIFIED[name].by, "Dr Founder");
});

test("a baked verified.js makes the sign-off permanent on a fresh boot (loader applies it)", () => {
  /* Verify one condition in the current context and export the file. */
  const name = evalIn("kbReviewItems()[0].name");
  evalIn("kbRapidVerify(" + JSON.stringify(name) + ", 'Dr Founder')");
  const exported = evalIn("kbBuildVerifiedExport()").source;

  /* Boot a brand-new sandbox with the exported file substituted for
     knowledge/verified.js — simulating the founder committing it. */
  const { LOAD_ORDER } = require("../tools/lib/load-engine");
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  const ctx = vm.createContext(sandbox);
  for (const f of LOAD_ORDER) {
    const src = (f === "knowledge/verified.js")
      ? exported
      : fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
    vm.runInContext(src, ctx, { filename: f });
  }
  const check = vm.runInContext(
    "(function(){for(var i=0;i<KNOWLEDGE_ALL.length;i++){if(KNOWLEDGE_ALL[i].name===" +
    JSON.stringify(name) + ")return {rs:KNOWLEDGE_ALL[i].review_status,by:KNOWLEDGE_ALL[i].review_verified_by};}return null;})()",
    ctx
  );
  assert.ok(check, "condition present on the fresh boot");
  assert.strictEqual(check.rs, "VERIFIED_BY_CLINICIAN", "sign-off survives via the baked file");
  assert.strictEqual(check.by, "Dr Founder", "attribution carried through");
});
