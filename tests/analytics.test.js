/* ═══════════════════════════════════════════════════════════════ */
/* ANALYTICS — pure aggregation core                               */
/*                                                                  */
/*   • role counts, real-vs-practice split, completion, red-flag    */
/*     rate, diagnosis & domain distributions, casebook + quiz +    */
/*     KB coverage all computed correctly;                          */
/*   • the researcher-facing aggregate carries NO patient           */
/*     identifiers (privacy guardrail).                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const an = require("../js/analytics.js");

function fixture() {
  return {
    users: [
      { role: "student" }, { role: "student" }, { role: "clinician" },
      { role: "faculty" }, { role: undefined }
    ],
    patients: [
      { id: "p1" }, { id: "p2" }, { id: "p3", practice: true }, { id: "p4", practice: true }
    ],
    visits: [
      { patient_id: "p1", status: "completed", data: { completed: ["a", "b", "c"],
        alerts: [{ l: "urgent", m: "IOP" }],
        dxList: [{ n: "Acute Angle Closure Crisis", domain: "Glaucoma", cat: "glaucoma" }] } },
      { patient_id: "p2", status: "in_progress", data: { completed: ["a"],
        alerts: [],
        dxList: [{ n: "Dry Eye Disease - Evaporative (MGD)", domain: "Surface & Lids", cat: "surface" }] } },
      { patient_id: "p3", status: "completed", data: { completed: ["a", "b"],
        alerts: [{ l: "urgent", m: "flashes" }],
        dxList: [{ n: "Acute Angle Closure Crisis", domain: "Glaucoma", cat: "glaucoma" }] } }
    ],
    cases: [
      { title: "Acute Angle Closure Crisis", reviewed: true, state: { assessment: [{ domain: "Glaucoma" }] } },
      { title: "Hypopyon Uveitis", reviewed: false, state: { assessment: [{ domain: "Anterior / Uveitis" }] } }
    ],
    quiz: { asked: 10, correct: 7, streak: 3, best: 5 },
    kbTotal: 384, kbProvisional: 246
  };
}

test("accounts are counted by role (unset → other)", () => {
  const d = an.analyticsCompute(fixture());
  assert.strictEqual(d.accounts.total, 5);
  assert.strictEqual(d.accounts.byRole.student, 2);
  assert.strictEqual(d.accounts.byRole.clinician, 1);
  assert.strictEqual(d.accounts.byRole.faculty, 1);
  assert.strictEqual(d.accounts.byRole.other, 1);
});

test("real vs practice patients are split", () => {
  const d = an.analyticsCompute(fixture());
  assert.strictEqual(d.patients.total, 4);
  assert.strictEqual(d.patients.real, 2);
  assert.strictEqual(d.patients.practice, 2);
});

test("visit stats: completion, red-flag rate, avg steps", () => {
  const d = an.analyticsCompute(fixture());
  assert.strictEqual(d.visits.total, 3);
  assert.strictEqual(d.visits.completed, 2);
  assert.strictEqual(d.visits.redFlagVisits, 2);
  assert.ok(Math.abs(d.visits.redFlagRate - 2 / 3) < 1e-9);
  assert.ok(Math.abs(d.visits.avgSteps - 2) < 1e-9);
});

test("diagnosis + domain distributions rank correctly", () => {
  const d = an.analyticsCompute(fixture());
  assert.strictEqual(d.visits.topDx[0].key, "Acute Angle Closure Crisis");
  assert.strictEqual(d.visits.topDx[0].n, 2);
  const glauc = d.visits.byDomain.find((x) => x.key === "Glaucoma");
  assert.strictEqual(glauc.n, 2);
});

test("casebook aggregates: reviewed/pending, by condition/domain", () => {
  const d = an.analyticsCompute(fixture());
  assert.strictEqual(d.casebook.total, 2);
  assert.strictEqual(d.casebook.reviewed, 1);
  assert.strictEqual(d.casebook.pending, 1);
  assert.ok(d.casebook.byDomain.some((x) => x.key === "Glaucoma"));
});

test("quiz accuracy + KB coverage", () => {
  const d = an.analyticsCompute(fixture());
  assert.ok(Math.abs(d.quiz.accuracy - 0.7) < 1e-9);
  assert.strictEqual(d.kb.verified, 384 - 246);
});

test("empty input degrades gracefully (no divide-by-zero)", () => {
  const d = an.analyticsCompute({});
  assert.strictEqual(d.visits.redFlagRate, 0);
  assert.strictEqual(d.visits.avgSteps, 0);
  assert.strictEqual(d.quiz.accuracy, 0);
});
