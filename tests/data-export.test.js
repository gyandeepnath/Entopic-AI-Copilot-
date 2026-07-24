/* ═══════════════════════════════════════════════════════════════ */
/* DATA EXPORT — pure CSV/row builders                            */
/*                                                                  */
/*   • CSV escaping is correct (commas, quotes, newlines);          */
/*   • records export includes REAL records only (no practice);     */
/*   • research export is DE-IDENTIFIED (aggregate only — no name,   */
/*     MRN or per-patient rows).                                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const dx = require("../js/data-export.js");
const an = require("../js/analytics.js");

test("csv escaping handles commas, quotes and newlines", () => {
  const csv = dx.csvFrom(["a", "b"], [["x,y", 'he said "hi"'], ["line\nbreak", "plain"]]);
  const lines = csv.split("\r\n");
  assert.strictEqual(lines[0], "a,b");
  assert.strictEqual(lines[1], '"x,y","he said ""hi"""');
  assert.ok(lines[2].startsWith('"line\nbreak"'));
});

test("records export includes REAL records only, never practice", () => {
  const patients = [
    { id: "p1", mrn: "M1", first_name: "Real", last_name: "One", age: "50", sex: "F" },
    { id: "p2", mrn: "M2", first_name: "Prac", last_name: "Tice", practice: true }
  ];
  const visits = [
    { patient_id: "p1", date: "2026-07-18T10:00:00Z", status: "completed",
      data: { dxList: [{ n: "Cataract", icd: "H25.9" }], alerts: [{ l: "urgent", m: "x" }] } },
    { patient_id: "p2", date: "2026-07-18T11:00:00Z", status: "in_progress",
      data: { dxList: [{ n: "Practice dx" }], alerts: [] } }
  ];
  const rows = dx.exportRecordsRows(patients, visits);
  assert.strictEqual(rows.length, 1, "only the real patient's visit");
  assert.strictEqual(rows[0][0], "M1");
  assert.strictEqual(rows[0][6], "Cataract");
  assert.strictEqual(rows[0][7], "H25.9");
  assert.strictEqual(rows[0][8], "yes", "red flag captured");
  const csv = dx.csvFrom(dx.EXPORT_RECORDS_COLS, rows);
  assert.ok(!/Practice dx|Prac/.test(csv), "no practice data leaks into records export");
});

test("research export is de-identified aggregate — no PII columns or rows", () => {
  const d = an.analyticsCompute({
    patients: [{ id: "p1", first_name: "Secret", last_name: "Name", mrn: "MRN-XYZ" }],
    visits: [{ status: "completed", data: { completed: ["a", "b"], alerts: [{ l: "urgent", m: "x" }],
      dxList: [{ n: "Glaucoma", domain: "Glaucoma", cat: "glaucoma" }] } }],
    cases: [], quiz: null, kbTotal: 10, kbProvisional: 2
  });
  const rows = dx.exportResearchRows(d);
  const flat = rows.map((r) => r.join(",")).join("\n");
  assert.ok(!/Secret|Name|MRN-XYZ/.test(flat), "no identifiers anywhere in the research export");
  assert.ok(/diagnosis,Glaucoma,1/.test(flat), "aggregate diagnosis distribution present");
  assert.ok(/red_flag_rate/.test(flat));
});

test("analytics export rows cover the key sections", () => {
  const d = an.analyticsCompute({ users: [{ role: "student" }], visits: [], cases: [], kbTotal: 100, kbProvisional: 40 });
  const rows = dx.exportAnalyticsRows(d);
  const sections = new Set(rows.map((r) => r[0]));
  ["Accounts", "Visits", "Casebook", "Quiz", "Knowledge base"].forEach((s) =>
    assert.ok(sections.has(s), "section present: " + s));
  const kbVerified = rows.find((r) => r[0] === "Knowledge base" && r[1] === "Verified");
  assert.strictEqual(kbVerified[2], 60);
});

test("casebook export rows carry condition/domain/kind and no identifiers", () => {
  const cases = [
    { title: "Keratoconus", reviewed: true, builtin: false, teachingNote: "cone\ncornea",
      state: { assessment: [{ domain: "Cornea", icd: "H18.6", urgent: false }],
        subjective: { symptoms: ["irregular astigmatism"] }, patient: { age: "22", sex: "M", name: "" } } },
    null
  ];
  const rows = dx.exportCasebookRows(cases);
  assert.strictEqual(rows.length, 1, "null entry skipped");
  assert.strictEqual(rows[0][0], "Keratoconus");
  assert.strictEqual(rows[0][1], "Cornea");
  assert.strictEqual(rows[0][4], "yes", "reviewed");
  assert.ok(!/\n/.test(rows[0][9]), "teaching note newlines flattened for CSV");
});
