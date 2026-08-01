/* ═══════════════════════════════════════════════════════════════ */
/* AGE BRACKETS — splitting the ambiguous `young_age`                */
/*                                                                  */
/* The KB had one token for "young", which the engine defines as     */
/* UNDER 18. A large number of conditions used it where a young      */
/* ADULT is meant — the simulator exposed this by generating optic   */
/* neuritis in a five-year-old.                                      */
/*                                                                  */
/* The split must not quietly change any differential, and must not  */
/* put a clinical judgement in engineering's hands, so:              */
/*   • `young_age` keeps its exact original rule (under 18).         */
/*   • Only conditions whose NAME literally states infancy/childhood */
/*     are pre-classified, and even those are provisional.           */
/*   • Everything else is untouched and listed for the founder.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createEngine } = require("../tools/lib/load-engine");
const { LOAD_ORDER } = require("../tools/lib/load-kb");

const eng = createEngine();
const run = (age) => eng.runCase({}, { age: String(age) }).tokens;


/* ── The engine's brackets ───────────────────────────────────────── */

test("paediatric_age fires under 18 and not at or above it", () => {
  assert.ok(run(6).includes("paediatric_age"));
  assert.ok(run(17).includes("paediatric_age"));
  assert.ok(!run(18).includes("paediatric_age"));
  assert.ok(!run(45).includes("paediatric_age"));
});

test("young_adult_age fires from 18 to 39 — the bracket that was missing", () => {
  assert.ok(!run(17).includes("young_adult_age"));
  assert.ok(run(18).includes("young_adult_age"));
  assert.ok(run(32).includes("young_adult_age"));
  assert.ok(!run(40).includes("young_adult_age"), "40 belongs to the over-40 bracket");
});

test("the deprecated young_age keeps its ORIGINAL rule, so nothing silently shifts", () => {
  assert.ok(run(6).includes("young_age"), "still under 18");
  assert.ok(!run(25).includes("young_age"), "must NOT have been widened to young adults");
  assert.ok(!run(60).includes("young_age"));
});

test("the brackets do not overlap", () => {
  for (let age = 1; age < 90; age++) {
    const t = run(age);
    const n = ["paediatric_age", "young_adult_age", "age_over_40"].filter((x) => t.includes(x)).length;
    assert.strictEqual(n, 1, `age ${age} landed in ${n} brackets`);
  }
});


/* ── The reclassification is conservative and honest ─────────────── */

test("only conditions whose NAME states infancy or childhood are pre-classified", () => {
  const { KB_AGE_BRACKET } = require("../knowledge/age-classification.js");
  const literal = /\b(congenital|infantile|neonatorum|neonatal|prematurity|juvenile|paediatric|pediatric|amblyopia|childhood)\b/i;
  const overreach = Object.keys(KB_AGE_BRACKET).filter((n) => !literal.test(n));
  assert.deepStrictEqual(overreach, [],
    "a condition was classified on epidemiology rather than on its own name — that is the founder's call");
});

test("every pre-classified condition really did carry young_age", () => {
  const { KB_AGE_BRACKET } = require("../knowledge/age-classification.js");
  const all = eng.context.KNOWLEDGE_ALL;
  const bad = [];
  for (const name of Object.keys(KB_AGE_BRACKET)) {
    const c = all.find((x) => x.name === name);
    if (!c) { bad.push(`${name}: not in the KB`); continue; }
    if (c.age_bracket !== KB_AGE_BRACKET[name]) bad.push(`${name}: bracket not applied`);
  }
  assert.deepStrictEqual(bad, []);
});

test("a reclassified condition no longer carries the deprecated token", () => {
  const all = eng.context.KNOWLEDGE_ALL;
  const c = all.find((x) => x.name === "Congenital Cataract");
  const toks = [].concat(c.req || [], c.sup || [], c.tests || []);
  assert.ok(toks.includes("paediatric_age"));
  assert.ok(!toks.includes("young_age"));
});

test("pre-classified brackets stay provisional until the founder confirms them", () => {
  const all = eng.context.KNOWLEDGE_ALL;
  const c = all.find((x) => x.name === "Congenital Cataract");
  assert.strictEqual(c.age_bracket_status, "NEEDS_CLINICAL_REVIEW");
});

test("unclassified conditions are completely untouched", () => {
  const all = eng.context.KNOWLEDGE_ALL;
  const on = all.find((x) => x.name === "Optic Neuritis");
  const toks = [].concat(on.req || [], on.sup || [], on.tests || []);
  assert.ok(toks.includes("young_age"), "left alone pending the founder's decision");
  assert.strictEqual(on.age_bracket, undefined);
});

test("the founder still has a real decision list, and it is surfaced", () => {
  const pending = eng.context.ageBracketPending();
  assert.ok(pending.length > 50, `expected a substantial review list, got ${pending.length}`);
  assert.ok(pending.every((p) => p.name && typeof p.suggested === "string"));
  assert.ok(pending.some((p) => p.name === "Optic Neuritis"));
  assert.ok(pending.some((p) => p.name === "Keratoconus"));
});


/* ── The two KB loaders must not drift apart again ───────────────── */

test("both knowledge-base loaders load the same files", () => {
  /* The test harness has two loaders — tools/lib/load-kb.js (KB only) and
     tools/lib/load-engine.js (KB + engine). They drifted: load-kb.js was
     missing age-classification.js, so one half of the suite saw a differently
     assembled knowledge base from the other. */
  const engineSrc = fs.readFileSync(path.resolve(__dirname, "..", "tools", "lib", "load-engine.js"), "utf8");
  const engineFiles = (engineSrc.match(/"knowledge\/[a-z0-9-]+\.js"/g) || [])
    .map((s) => s.replace(/"|knowledge\//g, ""));
  const missing = engineFiles.filter((f) => LOAD_ORDER.indexOf(f) < 0);
  assert.deepStrictEqual(missing, [],
    "load-kb.js is missing knowledge files that load-engine.js loads");
});

test("index.html loads age-classification BEFORE the loader that applies it", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  const a = html.indexOf("knowledge/age-classification.js");
  const b = html.indexOf("knowledge/loader.js");
  assert.ok(a > 0, "age-classification.js is loaded by the app");
  assert.ok(a < b, "it must load before loader.js, which applies it");
});


/* ═══ Persistence moved out of knowledge/ (2026-08-01) ═══ */

test("recording a bracket decision also puts it into effect", () => {
  /* Found by a browser probe, not by a unit test: the decision was written to
     the store correctly and never reached the knowledge base, because only the
     admin screen remembered to re-apply. Any other caller — a restore, a sync,
     a future screen — would have stored a clinical decision that did nothing.
     Storing and applying must be one operation. */
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js/age-brackets.js"), "utf8");
  const setFn = /function ageBracketSet\([\s\S]*?\n}/.exec(src);
  assert.ok(setFn, "ageBracketSet not found");
  assert.ok(/ageBracketApplyAll\(\)/.test(setFn[0]),
    "ageBracketSet must apply the decision, not rely on its caller to remember");
});

test("applyAgeBracket is pure — it takes overrides, it does not read storage", () => {
  /* This is what lets knowledge/ stay portable data. */
  const raw = fs.readFileSync(
    path.resolve(__dirname, "..", "knowledge/age-classification.js"), "utf8");
  /* Comments stripped: the file explains at length why it no longer does this,
     and the explanation naturally names the thing it stopped doing. */
  const kb = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
  assert.ok(!/localStorage/.test(kb),
    "knowledge/age-classification.js must not touch localStorage — persistence " +
    "belongs in js/age-brackets.js");
  assert.ok(/function applyAgeBracket\(cond, overrides\)/.test(kb),
    "overrides must be injected, not fetched");
});

test("applyAgeBracket is idempotent — the second pass still lands", () => {
  /* It runs twice in a normal boot: once at KB assembly with suggestions only,
     once after storage is available with the founder's confirmed overrides. A
     naive second run finds no `young_age` left to replace and silently does
     nothing, so a confirmed bracket would never reach the engine. */
  const { applyAgeBracket } = require("../knowledge/age-classification.js");
  const cond = { name: "Test Condition", req: ["young_age", "pain"], sup: [], tests: [] };

  applyAgeBracket(cond, {});                                   /* pass 1: suggestion only */
  const afterFirst = cond.req.slice();

  applyAgeBracket(cond, { "Test Condition": "young_adult_age" }); /* pass 2: confirmed */
  assert.ok(cond.req.includes("young_adult_age"),
    "the confirmed bracket must replace whatever the first pass left: " +
    JSON.stringify(afterFirst) + " -> " + JSON.stringify(cond.req));
  assert.ok(!cond.req.includes("young_age"), "the deprecated token must be gone");
  assert.strictEqual(cond.age_bracket_status, "VERIFIED_BY_CLINICIAN");

  /* And a third pass with the same override must not corrupt anything. */
  applyAgeBracket(cond, { "Test Condition": "young_adult_age" });
  assert.strictEqual(cond.req.filter((t) => t === "young_adult_age").length, 1,
    "re-applying must not duplicate the token");
});
