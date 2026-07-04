/* ═══════════════════════════════════════════════════════════════ */
/* FREE-TEXT COMPLAINT PARSER TESTS                                */
/* parseComplaintText turns the chief-complaint text into engine    */
/* tokens. These tests pin:                                          */
/*   - negation handling ("no pain", "denies flashes")               */
/*   - false-positive fixes ("reduced" ≠ red, "painless" ≠ pain)     */
/*   - that positive phrasing still parses (no lost sensitivity)     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

function parse(text) {
  eng.context.__text = text.toLowerCase(); /* engine lowercases V.cc before parsing */
  return vm.runInContext("parseComplaintText(__text)", eng.context);
}

/* ═══ Negation ═══ */

test('"no pain, blurred vision" → blur only, no pain', () => {
  const t = parse("no pain, blurred vision");
  assert.ok(t.indexOf("blur") >= 0, "blur still parsed");
  assert.ok(t.indexOf("pain") === -1, "negated pain not emitted");
});

test('"denies flashes and floaters" → no flashes token', () => {
  const t = parse("denies flashes and floaters");
  assert.ok(t.indexOf("flashes") === -1, "denied flashes not emitted");
});

test('"red eye but not painful" → redness without pain', () => {
  const t = parse("red eye but not painful");
  assert.ok(t.indexOf("redness") >= 0, "redness before the negation is kept");
  assert.ok(t.indexOf("pain") === -1, "negated pain not emitted");
});

test('"itchy eyes without discharge" → itching without discharge', () => {
  const t = parse("itchy eyes without discharge");
  assert.ok(t.indexOf("itching_dominant") >= 0);
  assert.ok(t.indexOf("purulent_discharge") === -1);
});

test("conservative split: tokens after a new clause boundary survive negation", () => {
  /* "no flashes, floaters since monday" — floaters is a separate clause and
     must still parse (over-alerting is safer than under-alerting). */
  const t = parse("no flashes, floaters since monday");
  assert.ok(t.indexOf("flashes") === -1, "negated flashes dropped");
  assert.ok(t.indexOf("floaters") >= 0, "floaters in next clause kept");
});

/* ═══ False-positive fixes ═══ */

test('"reduced vision" does not emit redness', () => {
  const t = parse("reduced vision for two weeks");
  assert.ok(t.indexOf("redness") === -1, '"reduced" must not match red');
});

test('"sudden painless drop in vision" does not emit pain', () => {
  const t = parse("sudden painless drop in vision");
  assert.ok(t.indexOf("pain") === -1, '"painless" must not match pain');
  assert.ok(t.indexOf("sudden_onset") >= 0, "sudden onset still parsed");
});

/* ═══ Positive controls: sensitivity is not lost ═══ */

test("positive phrasing still parses (sensitivity preserved)", () => {
  const t = parse("sharp pain, red eye, light sensitivity, seeing flashes");
  assert.ok(t.indexOf("pain") >= 0);
  assert.ok(t.indexOf("redness") >= 0);
  assert.ok(t.indexOf("photophobia") >= 0);
  assert.ok(t.indexOf("flashes") >= 0);
});

test("end-to-end: negated red flags in CC do not fire the retinal alert", () => {
  const out = eng.runCase({ cc: "gradual blur, denies flashes or floaters" });
  const retinal = out.alerts.filter((a) => /flashes \+ floaters/i.test(a.m));
  assert.strictEqual(retinal.length, 0, "no retinal red-flag from negated symptoms");
  assert.ok(out.tokens.indexOf("blur") >= 0, "blur token still collected");
});

test("end-to-end: positive red flags in CC still fire the retinal alert", () => {
  const out = eng.runCase({ cc: "sudden flashes and floaters since last night" });
  const retinal = out.alerts.filter((a) => /flashes \+ floaters/i.test(a.m));
  assert.ok(retinal.length > 0, "retinal red-flag fires on positive phrasing");
});
