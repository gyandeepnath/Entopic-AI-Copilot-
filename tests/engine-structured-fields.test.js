/* ═══════════════════════════════════════════════════════════════ */
/* STRUCTURED EXAM FIELDS → ENGINE                                 */
/* The founder found that graded slit-lamp/fundus dropdowns and the  */
/* free-text exam fields were clickable but fed the engine nothing.  */
/* This guard asserts each structured field now emits the expected   */
/* token so recording it drives the live differential.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
function blankEye() { return { lids: "", conj: "", cornea: "", cells: "0", flare: "0", iris: "", ns: "0", c: "0", psc: "0", but: "", schirmer: "" }; }
function blankFun() { return { cd_v: "", cd_h: "", nrr: "", disc: "", margin: "", mac: "", vessels: "", periph: "", vit: "" }; }
function toks(v) { return eng.runCase(v).tokens; }

test("AC cells & flare dropdowns emit cells_present/flare_present + grade", () => {
  const t = toks({ sl: { od: Object.assign(blankEye(), { cells: "3+", flare: "2+" }), os: blankEye(), findings: [] } });
  assert.ok(t.includes("cells_present"), "cells_present from cells dropdown");
  assert.ok(t.includes("cells_3"), "graded cells_3");
  assert.ok(t.includes("flare_present"), "flare_present from flare dropdown");
});

test("LOCS lens grades emit cataract tokens", () => {
  const t = toks({ sl: { od: Object.assign(blankEye(), { ns: "3", c: "2", psc: "2" }), os: blankEye(), findings: [] } });
  assert.ok(t.includes("nuclear_sclerosis_grade_3"), "NS grade token");
  assert.ok(t.includes("cortical_opacity"), "cortical opacity");
  assert.ok(t.includes("psc_opacity"), "PSC opacity");
  assert.ok(t.includes("gradual_blur"), "cataract drives gradual_blur");
});

test("free-text cornea/conj/lids get keyword-parsed", () => {
  assert.ok(toks({ sl: { od: Object.assign(blankEye(), { cornea: "central stromal edema" }), os: blankEye(), findings: [] } }).includes("corneal_edema"));
  assert.ok(toks({ sl: { od: Object.assign(blankEye(), { conj: "diffuse injection + follicles" }), os: blankEye(), findings: [] } }).includes("follicles"));
  assert.ok(toks({ sl: { od: Object.assign(blankEye(), { lids: "anterior blepharitis" }), os: blankEye(), findings: [] } }).includes("blepharitis_anterior"));
});

test("fundus free-text (macula/vessels/periphery/vitreous) get parsed", () => {
  assert.ok(toks({ fun: { od: Object.assign(blankFun(), { vessels: "cotton wool spots, microaneurysms, hard exudates" }), os: blankFun(), findings: [] } }).includes("cotton_wool_spots"));
  assert.ok(toks({ fun: { od: Object.assign(blankFun(), { periph: "horseshoe retinal tear" }), os: blankFun(), findings: [] } }).includes("retinal_break"));
  assert.ok(toks({ fun: { od: Object.assign(blankFun(), { vit: "vitreous hemorrhage" }), os: blankFun(), findings: [] } }).includes("vitreous_hemorrhage"));
  assert.ok(toks({ fun: { od: Object.assign(blankFun(), { mac: "large drusen" }), os: blankFun(), findings: [] } }).includes("drusen_medium_63_125_m"));
});

test("gonioscopy narrow grade and motility feed the engine", () => {
  const g = toks({ gon: { od: { s: "1", n: "1", i: "2", t: "2", pig: "" }, os: { s: "", n: "", i: "", t: "", pig: "" } } });
  assert.ok(g.includes("narrow_angle"), "narrow angle from gonio grade 1");
  const m = toks({ mot: { versions: "Full", ductions: "Full", nystagmus: "Present — horizontal", notes: "limited abduction OD" } });
  assert.ok(m.includes("nystagmus_other_eye"), "nystagmus token");
  assert.ok(m.includes("limited_abduction"), "abduction deficit from notes");
});

test("normal exam values do NOT emit sign tokens (no false positives)", () => {
  const t = toks({ sl: { od: { lids: "WNL", conj: "White and quiet", cornea: "Clear", cells: "0", flare: "0", ns: "0", c: "0", psc: "0" }, os: { lids: "WNL", conj: "White and quiet", cornea: "Clear", cells: "0", flare: "0", ns: "0", c: "0", psc: "0" }, findings: [] } });
  ["cells_present", "flare_present", "corneal_edema", "nuclear_sclerosis_grade_2"].forEach((x) => assert.ok(!t.includes(x), "normal exam should not emit " + x));
});
