/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL VALIDATION WORKSPACE — pure-core contract              */
/*                                                                  */
/* Pins the logic the workspace relies on: plain-English token       */
/* meanings, the "what produces this token" wiring lookup, the       */
/* unfireable-required-token detection, and the status bucketing +   */
/* verified-first sort. Loaded in a VM with small stubs (no full KB) */
/* so the contract is tested in isolation, the same pattern the      */
/* other browser-module tests use.                                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadWorkspace(stubs) {
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat, module: { exports: {} }
  }, stubs || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/ui-validation.js"), "utf8"), ctx, { filename: "ui-validation.js" });
  return ctx.module.exports;
}

/* Shared fixture: two tokens (one reachable via a symptom chip, one that
   nothing produces) and two conditions (one provisional, one verified).
   Closures reference `all` directly (not `this`) so they resolve correctly
   when called from inside the VM realm. */
function fixture() {
  const all = [
    { name: "Dry Eye Disease", domain: "Surface & Lids", urgent: false,
      review_status: "NEEDS_CLINICAL_REVIEW", icd: "H04.123",
      req: ["dryness"], sup: [], con: [], temporal: [], tests: [] },
    { name: "Acute Angle Closure", domain: "Glaucoma", urgent: true,
      review_status: "VERIFIED_BY_CLINICIAN",
      req: ["mystery_sign"], sup: ["dryness"], con: [], temporal: [], tests: [] }
  ];
  return {
    TOKEN_DICTIONARY: {
      dryness: ["dry eyes", "dry", "dried out"],
      mystery_sign: []                       /* known token, no alias */
    },
    TOKEN_REGISTRY: {
      dryness:      { type_hint: "symptom", sources: ["symptom_chip"], reachable: true },
      mystery_sign: { type_hint: "sign", sources: [], reachable: false }
    },
    kbPrettyToken: (t) => String(t).replace(/_/g, " "),
    KNOWLEDGE_ALL: all,
    findCondition: (name) => all.find((c) => c.name === name) || null,
    resolveConditionInfo: (name) => ({ summary: "summary of " + name, facts: ["fact one"] })
  };
}

test("valTokenMeaning prefers the first dictionary alias, falls back to pretty", () => {
  const w = loadWorkspace(fixture());
  assert.strictEqual(w.valTokenMeaning("dryness"), "dry eyes");
  assert.strictEqual(w.valTokenMeaning("mystery_sign"), "mystery sign", "no alias → prettified token");
  assert.strictEqual(w.valTokenMeaning("never_seen"), "never seen", "unknown token → prettified");
});

test("valTokenWiring reports producers and flags tokens nothing produces", () => {
  const w = loadWorkspace(fixture());
  const dry = w.valTokenWiring("dryness");
  assert.strictEqual(dry.reachable, true);
  assert.strictEqual(JSON.stringify(dry.producers), JSON.stringify(["Ticked as a symptom during History"]));

  const dead = w.valTokenWiring("mystery_sign");
  assert.strictEqual(dead.reachable, false, "no source + not reachable → dead");
  assert.strictEqual(dead.producers.length, 0);
});

test("valConditionDetail surfaces required tokens that can never fire", () => {
  const w = loadWorkspace(fixture());
  const dee = w.valConditionDetail("Dry Eye Disease");
  assert.strictEqual(dee.status, "NEEDS_CLINICAL_REVIEW");
  assert.strictEqual(dee.summary, "summary of Dry Eye Disease");
  assert.strictEqual(JSON.stringify(dee.deadRequired), "[]", "reachable required token → nothing dead");

  const aac = w.valConditionDetail("Acute Angle Closure");
  assert.strictEqual(aac.urgent, true);
  assert.strictEqual(JSON.stringify(aac.deadRequired), JSON.stringify(["mystery_sign"]), "required token nothing produces is flagged");
});

test("valStatusOf buckets by review_status", () => {
  const w = loadWorkspace(fixture());
  assert.strictEqual(w.valStatusOf({ review_status: "VERIFIED_BY_CLINICIAN" }), "verified");
  assert.strictEqual(w.valStatusOf({ review_status: "NEEDS_CLINICAL_REVIEW" }), "provisional");
  assert.strictEqual(w.valStatusOf({}), "curated");
});

test("valConditionList counts every bucket and sorts provisional first", () => {
  const w = loadWorkspace(fixture());
  const { items, counts } = w.valConditionList();
  assert.strictEqual(counts.total, 2);
  assert.strictEqual(counts.provisional, 1);
  assert.strictEqual(counts.verified, 1);
  assert.strictEqual(items[0].name, "Dry Eye Disease", "provisional sorts before verified");
});
