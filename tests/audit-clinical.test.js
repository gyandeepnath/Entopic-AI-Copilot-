/* ═══════════════════════════════════════════════════════════════ */
/* MATERIAL-CHANGE AUDIT  (security audit SEC-9)                    */
/*                                                                  */
/* 65 kinds of event were audited, including who OPENED a chart.     */
/* Nobody CHANGING the clinical content was: not the prescription,   */
/* not the diagnosis, not the plan. Measured — those log calls       */
/* appear zero times in the codebase.                                */
/*                                                                  */
/* For a clinical record that is the wrong way round. Reading is a    */
/* privacy event; changing is an accountability event, and it is the */
/* one a complaint or a coroner actually asks about.                 */
/*                                                                  */
/* Two failure modes to guard equally: recording nothing, and        */
/* recording so much that the real entries are pushed out of a       */
/* 2,000-entry log by exam noise. An audit trail nobody can read is  */
/* not evidence.                                                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const A = require("../js/audit-clinical.js");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const fields = (a, b) => A.auditMaterialDiff(a, b).map((c) => c.field);

/* Capture what auditMaterialChange writes, without a storage layer. */
function capture(before, after, wasCompleted) {
  const out = [];
  global.logAudit = (action, msg, ids) => out.push({ action, msg, ids });
  try { A.auditMaterialChange(before, after, { patient_id: "p1", visit_id: "v1" }, wasCompleted); }
  finally { delete global.logAudit; }
  return out;
}


/* ═══ WHAT COUNTS AS MATERIAL ═══ */

test("a changed prescription is recorded", () => {
  assert.deepStrictEqual(
    fields({ rx: { od_sph: "-2.00" } }, { rx: { od_sph: "-6.00" } }), ["rx"]);
});

test("a changed management plan is recorded", () => {
  assert.deepStrictEqual(
    fields({ plan: { mgmt: "review 6/12" } }, { plan: { mgmt: "refer urgently" } }), ["plan"]);
});

test("a changed recorded diagnosis is recorded", () => {
  assert.deepStrictEqual(
    fields({ final_dx: "Dry eye" }, { final_dx: "Anterior uveitis" }), ["final_dx"]);
});

test("several material fields in one save are one entry, not three", () => {
  /* A save that alters the prescription and the plan together is one clinical
     act. Three entries would be three times the noise for the same event. */
  const log = capture(
    { rx: { od_sph: "-2.00" }, plan: { mgmt: "review" } },
    { rx: { od_sph: "-6.00" }, plan: { mgmt: "refer" } }, false);
  assert.strictEqual(log.length, 1);
  assert.match(log[0].msg, /prescription/);
  assert.match(log[0].msg, /management plan/);
});


/* ═══ WHAT MUST NOT BE RECORDED — noise is a defect ═══ */

test("exam findings changing produce no audit entry", () => {
  /* The engine re-runs and the visit re-saves constantly during a
     consultation. Auditing all of it would push the real entries out of the
     2,000-entry log exactly when somebody needs to read them. */
  assert.strictEqual(
    fields({ iop: { od: "14" }, sl: { findings: [] } },
           { iop: { od: "18" }, sl: { findings: [{ label: "x", eye: "OD" }] } }).length, 0);
});

test("an unchanged save produces nothing", () => {
  const v = { rx: { od_sph: "-2.00" }, plan: { mgmt: "review" }, final_dx: "Dry eye" };
  assert.strictEqual(capture(v, JSON.parse(JSON.stringify(v)), false).length, 0);
});

test("empty-to-empty is not a change a human made", () => {
  assert.strictEqual(fields({}, { rx: {} }).length, 0);
  assert.strictEqual(fields({ rx: {} }, { rx: { od_sph: "" } }).length, 0);
  assert.strictEqual(fields({ plan: null }, { plan: {} }).length, 0);
  assert.strictEqual(fields({ final_dx: "" }, {}).length, 0);
});

test("first entry of a value reads as 'recorded', not 'changed'", () => {
  const log = capture({}, { rx: { od_sph: "-2.00" } }, false);
  assert.strictEqual(log.length, 1);
  assert.match(log[0].msg, /recorded$/, log[0].msg);
  assert.ok(!/changed/.test(log[0].msg));
});


/* ═══ PRIVACY: THE ENTRY MUST NOT BE A SECOND COPY OF THE RECORD ═══ */

test("the entry names the field and never the values", () => {
  /* "OD sphere changed from -2.00 to -6.00" would be a second copy of the
     clinical record, living in a store with different access rules and a
     different retention period. The previous values are already preserved on
     the record itself, where the access controls are correct. */
  const log = capture(
    { rx: { od_sph: "-2.00" }, final_dx: "Dry eye" },
    { rx: { od_sph: "-6.00" }, final_dx: "Anterior uveitis" }, false);
  const text = JSON.stringify(log);
  assert.ok(text.indexOf("-6.00") < 0, "a prescription value leaked into the audit log");
  assert.ok(text.indexOf("-2.00") < 0);
  assert.ok(text.indexOf("Anterior uveitis") < 0, "a diagnosis leaked into the audit log");
  assert.ok(text.indexOf("Dry eye") < 0);
});

test("the entry carries the ids a reader needs to find the record", () => {
  const log = capture({}, { final_dx: "x" }, false);
  assert.strictEqual(log[0].ids.patient_id, "p1");
  assert.strictEqual(log[0].ids.visit_id, "v1");
});


/* ═══ THE ONE THAT MATTERS MOST ═══ */

test("changing a COMPLETED visit is recorded as an amendment, and says so", () => {
  /* A completed visit has been signed off, may have been referred from, and
     may already have been relied upon. Altering it afterwards is the single
     event most likely to matter later. */
  const log = capture({ rx: { od_sph: "-2.00" } }, { rx: { od_sph: "-6.00" } }, true);
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].action, "record_amended");
  assert.match(log[0].msg, /AMENDED AFTER COMPLETION/);
});

test("an in-progress change is a plain change, not an amendment", () => {
  const log = capture({ rx: { od_sph: "-2.00" } }, { rx: { od_sph: "-6.00" } }, false);
  assert.strictEqual(log[0].action, "record_changed");
  assert.ok(!/AMENDED/.test(log[0].msg));
});


/* ═══ WIRING ═══ */

test("doSave captures the previous version BEFORE replacing it", () => {
  /* Afterwards the previous payload is gone from the array and there is
     nothing left to diff against. */
  const src = read("js/storage.js");
  const i = src.indexOf("auditMaterialChange");
  const j = src.indexOf("visits[i].data = V;");
  assert.ok(i > 0, "doSave must call it");
  assert.ok(i < j, "it must run before the payload is replaced");
});

test("it passes whether the visit was already completed", () => {
  assert.ok(/auditMaterialChange\([\s\S]{0,200}status === "completed"/.test(read("js/storage.js")),
    "without this, an amendment to a signed-off record reads as an ordinary edit");
});

test("a missing audit module cannot break a save", () => {
  /* Clinical work must never fail because logging failed. */
  const src = read("js/storage.js");
  assert.ok(/if \(typeof auditMaterialChange === "function"\)/.test(src));
  assert.ok(/auditMaterialChange[\s\S]{0,300}catch \(e\) \{\}/.test(src));
});

test("every material field says why it is on the list", () => {
  /* The temptation with an audit list is always to add more, and every
     addition dilutes the entries that matter. */
  for (const f of A.AUDIT_MATERIAL_FIELDS) {
    assert.ok(f.path && f.label, "a field needs a path and a human label");
    assert.ok(f.why && f.why.length > 30, f.path + ": `why` must justify the noise it adds");
  }
});

test("loaded in the browser after the storage layer it hooks", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/audit-clinical.js") > order.indexOf("js/storage.js"));
});
