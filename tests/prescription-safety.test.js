/* ═══════════════════════════════════════════════════════════════ */
/* PRESCRIPTION SAFETY (clinical review RX-1)                       */
/*                                                                  */
/* An empty refraction field used to print as "plano" on a          */
/* print-ready, patient-named, legal prescription. "Plano" is a     */
/* positive clinical assertion — no correction needed — and a       */
/* dispensing optician acts on it by grinding zero-power lenses.    */
/* An unmeasured eye printing plano turns MISSING DATA into a       */
/* clinical instruction. If that eye needed -3.00, the patient gets */
/* useless glasses.                                                 */
/*                                                                  */
/* These pin: absence prints as absence; a GENUINE plano still      */
/* prints plano; and a visit with no refraction produces no         */
/* prescription document at all.                                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadRx() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat, isNaN,
    escH: (s) => String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"),
    esc: (s) => String(s == null ? "" : s),
    P: {}, V: { rx: {} }, CU: null, CV: null,
    loadVisits: () => []
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/ui-report.js"), "utf8"),
    ctx, { filename: "ui-report.js" });
  return ctx;
}

test("an unmeasured field prints as ABSENT, never as plano", () => {
  const c = loadRx();
  const out = c.rxCell("");
  assert.ok(/not recorded/.test(out), "empty must say so");
  assert.ok(!/plano/i.test(out), "empty must NEVER read as a zero-power lens");
  assert.ok(/not recorded/.test(c.rxCell(null)) && /not recorded/.test(c.rxCell(undefined)));
  assert.ok(/not recorded/.test(c.rxCell("   ")), "whitespace is still absence");
});

test("a GENUINE plano still prints plano — a real zero-power Rx is valid", () => {
  const c = loadRx();
  for (const v of ["0", "0.00", "+0.00", "-0.00", "plano", "PLANO", "pl"]) {
    assert.strictEqual(c.rxCell(v), "plano", v + " is an explicit plano");
  }
});

test("real powers print unchanged and are escaped", () => {
  const c = loadRx();
  assert.strictEqual(c.rxCell("-3.00"), "-3.00");
  assert.strictEqual(c.rxCell("+2.25"), "+2.25");
  assert.ok(!/</.test(c.rxCell("<script>")), "values are escaped");
});

test("a visit with no refraction at all has nothing to prescribe", () => {
  const c = loadRx();
  assert.strictEqual(c.rxHasAnyRefraction({}), false);
  assert.strictEqual(c.rxHasAnyRefraction({ od_sph: "", os_sph: "  " }), false);
  assert.strictEqual(c.rxHasAnyRefraction({ od_sph: "-1.00" }), true);
  assert.strictEqual(c.rxHasAnyRefraction({ os_add: "+2.00" }), true, "an add alone still counts");
});

test("an eye with no sphere is reported as unfillable", () => {
  const c = loadRx();
  const bad = c.rxIncompleteEyes({ od_sph: "-3.00", os_sph: "" });
  assert.strictEqual(bad.length, 1);
  assert.strictEqual(bad[0].eye, "OS");
  assert.ok(/no sphere/.test(bad[0].problems[0]));
});

test("a cylinder without an axis is unfillable, and so is an axis without a cylinder", () => {
  const c = loadRx();
  const a = c.rxIncompleteEyes({ od_sph: "-1.00", od_cyl: "-0.50", od_ax: "", os_sph: "-1.00" });
  assert.ok(a.some((x) => x.eye === "OD" && /cylinder without an axis/.test(x.problems.join())));

  const b = c.rxIncompleteEyes({ od_sph: "-1.00", od_ax: "90", od_cyl: "", os_sph: "-1.00" });
  assert.ok(b.some((x) => x.eye === "OD" && /axis without a cylinder/.test(x.problems.join())));
});

test("a complete prescription raises no complaint", () => {
  const c = loadRx();
  /* Compared by value: the array is created inside the VM realm, so
     deepStrictEqual fails on prototype identity rather than content. */
  assert.strictEqual(
    JSON.stringify(c.rxIncompleteEyes({ od_sph: "-3.00", od_cyl: "-0.75", od_ax: "180", os_sph: "0.00" })), "[]",
    "sphere-only OS plano plus a full OD is perfectly dispensable");
});
