/* ═══════════════════════════════════════════════════════════════ */
/* EVIDENCE GATE — context never creates a differential             */
/*                                                                  */
/* The founder: "for obvious reasons, just entering age should not   */
/* relate to a disease being fired in the diagnostic engine. Always  */
/* should satisfy min. requirements and conditions in order to get   */
/* triggered."                                                       */
/*                                                                  */
/* Before this rule, entering age 6 and nothing else put             */
/* Retinoblastoma in the differential — matched on `young_age`, with */
/* its required `leukocoria` still missing. Demographics and         */
/* background risk (family history, diabetes, contact-lens wear…)    */
/* may SHARPEN a differential that real findings raised, but must    */
/* never create one.                                                 */
/*                                                                  */
/* What an age SHOULD do is prompt the right documentation, which is */
/* asserted here too.                                                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

test("age alone never produces a differential", () => {
  ["2", "6", "14", "45", "72", "90"].forEach((age) => {
    const out = eng.runCase({}, { age: age });
    assert.strictEqual((out.dxList || []).length, 0,
      "age " + age + " alone produced: " + (out.dxList || []).map((d) => d.n).join(", "));
  });
});

test("background risk history alone never produces a differential", () => {
  /* Being diabetic / hypertensive / a contact-lens wearer is context, not a
     finding. Each of these used to be enough to seed a condition. */
  const cases = [
    { hxM: { dm: true } },
    { hxM: { htn: true } },
    { hxM: { thyroid: true } },
    { hxF: { glaucoma: true } },
    { hxO: { cl_type: "Monthly soft" } }
  ];
  cases.forEach((v, i) => {
    const out = eng.runCase(v, { age: "50" });
    assert.strictEqual((out.dxList || []).length, 0,
      "case " + i + " produced: " + (out.dxList || []).map((d) => d.n).join(", "));
  });
});

test("one real finding is enough to raise a differential", () => {
  const out = eng.runCase({ symptoms: ["leukocoria"] }, { age: "6" });
  assert.ok((out.dxList || []).length > 0, "a real sign must still raise conditions");
  const names = out.dxList.map((d) => d.n);
  assert.ok(names.indexOf("Retinoblastoma") >= 0,
    "leukocoria in a child must still surface retinoblastoma — got: " + names.join(", "));
});

test("context still sharpens a differential that findings raised", () => {
  /* Same finding, different ages — age must still be able to influence rank
     once a genuine finding is present. */
  const young = eng.runCase({ symptoms: ["leukocoria"] }, { age: "3" });
  assert.ok(young.dxList.length > 0);
  const matched = (young.dxList[0].evidence || {}).matched || [];
  assert.ok(matched.length > 0, "the leading condition must show its matched evidence");
});

test("an age prompts DOCUMENTATION, not a diagnosis", () => {
  const out = eng.runCase({}, { age: "6" });
  assert.strictEqual((out.dxList || []).length, 0, "still no differential");
  const msgs = (out.nudges || []).map((n) => n.m).join(" ");
  assert.match(msgs, /Paediatric/i, "a child should prompt the paediatric section / birth history");
});

test("red-flag alerts are unaffected by the evidence gate", () => {
  assert.ok(eng.runCase({ symptoms: ["flashes", "floaters"] }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ iop: { od: "48", os: "16" } }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ pupil: { rapd: "OD" } }).alerts.some((a) => a.l === "urgent"));
});
