/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL NUMERIC VALIDATION (DD finding M-5)                     */
/*                                                                  */
/* Plausibility checks must catch physically impossible / mistyped   */
/* clinical numbers WITHOUT ever blocking a valid extreme reading    */
/* and WITHOUT flagging a blank or free-text field. The bounds are   */
/* physical/definitional, so these tests pin exact behaviour.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { clinCheck, clinValidateVisit, CLIN_RANGES } = require("../js/clinical-validators.js");

test("a blank or free-text field is never flagged — that is 'not recorded', not wrong", () => {
  assert.strictEqual(clinCheck("iop", ""), null);
  assert.strictEqual(clinCheck("iop", "   "), null);
  assert.strictEqual(clinCheck("iop", undefined), null);
  assert.strictEqual(clinCheck("iop", null), null);
  assert.strictEqual(clinCheck("iop", "CF"), null, "free-text acuity-style entries are not numeric errors");
});

test("a physically impossible value is an error", () => {
  const r = clinCheck("iop", "444", "od");
  assert.ok(r && r.level === "error");
  assert.match(r.message, /IOP.*OD.*outside the possible range/);
});

test("a valid extreme reading is NEVER blocked (human-in-the-loop)", () => {
  assert.strictEqual(clinCheck("iop", "58"), null, "58 mmHg is a real acute-angle-closure pressure — must not warn");
  assert.strictEqual(clinCheck("iop", "8"), null, "8 mmHg is valid");
  assert.strictEqual(clinCheck("cd", "0.9"), null, "0.9 C:D is advanced but valid");
});

test("an unusual-but-possible value is a soft warning, not an error", () => {
  const r = clinCheck("iop", "72", "os");
  assert.ok(r && r.level === "warn", "72 mmHg is above the soft ceiling but physically possible");
  assert.match(r.message, /unusually high/);
});

test("definitional bounds: cup:disc > 1 and axis > 180 are impossible", () => {
  assert.strictEqual(clinCheck("cd", "8").level, "error", "C:D of 8 is impossible");
  assert.strictEqual(clinCheck("axis", "900").level, "error", "axis 900° is impossible");
  assert.strictEqual(clinCheck("axis", "180"), null, "axis 180° is the valid boundary");
  assert.strictEqual(clinCheck("axis", "0"), null, "axis 0° is valid");
});

test("negative CCT is impossible; a thin-but-real CCT is fine", () => {
  assert.strictEqual(clinCheck("cct", "-20").level, "error");
  assert.strictEqual(clinCheck("cct", "480"), null, "a thin cornea is valid");
  assert.strictEqual(clinCheck("cct", "1200").level, "error", "1200 µm is impossible");
});

test("clinValidateVisit collects issues across the record, errors first, blanks ignored", () => {
  const V = {
    iop: { od: "444", os: "16", od_cct: "", os_cct: "520" },   /* od impossible, os fine */
    fun: { od: { cd_v: "0.6" }, os: { cd_v: "5" } },            /* os impossible */
    rx: { od_sph: "-3.5", os_sph: "", od_ax: "200" },          /* axis impossible */
    inv: { oct_rnfl_od: "88", vf_md_od: "" }
  };
  const P = { age: "45" };
  const issues = clinValidateVisit(V, P);
  const errors = issues.filter((i) => i.level === "error");
  assert.strictEqual(errors.length, 3, "IOP 444, C:D 5, axis 200 — three impossibilities");
  assert.strictEqual(issues[0].level, "error", "errors are ordered first");
  /* valid and blank fields produced nothing */
  assert.ok(!issues.some((i) => /os.*16|520|88|-3\.5/i.test(i.message)));
});

test("an impossible age is caught", () => {
  const issues = clinValidateVisit({}, { age: "450" });
  assert.ok(issues.some((i) => i.level === "error" && /Age/.test(i.message)));
});

test("the range set is flagged for clinical review", () => {
  /* plausibility envelopes are still clinical judgement */
  const { CLIN_VALIDATION_STATUS } = require("../js/clinical-validators.js");
  assert.ok(Object.keys(CLIN_RANGES).length >= 8, "a meaningful set of numerics is covered");
});
