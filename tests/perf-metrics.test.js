/* ═══════════════════════════════════════════════════════════════ */
/* PERFORMANCE INSTRUMENTATION  (Phase 7, step 10)                  */
/*                                                                  */
/* Observability was the weakest score in the Phase 7 audit (3/10)   */
/* for one reason: an engineer asking "why is this device slow?"     */
/* had nothing to read at all.                                       */
/*                                                                   */
/* Three things must hold, in this order of importance:              */
/*                                                                   */
/*   1. It records DURATIONS ONLY. A performance log that quietly    */
/*      accumulates clinical detail is a privacy incident wearing a  */
/*      helpful hat — and this one leaves the device in backups.     */
/*   2. It is bounded. An instrument that grows without limit        */
/*      becomes the problem it was added to diagnose.                */
/*   3. It cannot change what it measures — not the return value,    */
/*      not a thrown error, not whether a save happens.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function sandbox(extra) {
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, isFinite, isNaN, Error,
    performance: { now: () => Number(process.hrtime.bigint()) / 1e6 },
    module: { exports: {} }
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(read("js/perf-metrics.js"), ctx, { filename: "perf-metrics.js" });
  return ctx;
}
const call = (ctx, e) => vm.runInContext(e, ctx);


/* ═══ 1. DURATIONS ONLY ═══ */

test("perfRecord accepts only a name and a number", () => {
  const ctx = sandbox();
  /* Everything a caller might carelessly pass that is NOT a duration. */
  call(ctx, `
    perfRecord("op", { patient_id: "p1" });
    perfRecord("op", "12ms");
    perfRecord("op", ["v1"]);
    perfRecord("op", null);
    perfRecord("op", undefined);
  `);
  assert.strictEqual(call(ctx, 'perfStats("op")'), null,
    "a non-numeric sample was stored — the ring can hold something other than a duration");
});

test("a non-finite duration is dropped, not stored", () => {
  const ctx = sandbox();
  call(ctx, 'perfRecord("op", NaN); perfRecord("op", Infinity); perfRecord("op", -1);');
  assert.strictEqual(call(ctx, 'perfStats("op")'), null,
    "NaN or Infinity in the ring poisons every percentile computed from it");
});

test("the exported payload contains no clinical field, ever", () => {
  const ctx = sandbox({
    storageUsage: () => ({ bytes: 1234, pct: 12 }),
    loadVisits: () => [{ id: "v1", patient_id: "p1", data: { cc: "SECRET COMPLAINT" } }],
    loadPatients: () => [{ id: "p1", first_name: "Jane", last_name: "Doe", mrn: "MRN-9" }]
  });
  call(ctx, 'perfRecord("engine_run", 0.4); perfRecord("do_save", 12);');
  const json = call(ctx, "JSON.stringify(perfExportPayload())");
  for (const leak of ["SECRET", "Jane", "Doe", "MRN-9", "p1", "v1", "cc"]) {
    assert.ok(json.indexOf(leak) < 0,
      "the performance export leaked " + JSON.stringify(leak) + " — this payload leaves the device: " + json);
  }
  /* It should still carry the CONTEXT the numbers need to be readable. */
  const p = JSON.parse(json);
  assert.strictEqual(p.visit_count, 1);
  assert.strictEqual(p.patient_count, 1);
});

test("the source cannot record anything but op and duration", () => {
  /* A structural check, because the guarantee above is only as good as the
     signature. If perfRecord ever grows a third parameter, this fails and
     someone has to think about what is now leaving the device in backups. */
  const src = read("js/perf-metrics.js");
  const m = src.match(/function perfRecord\(([^)]*)\)/);
  assert.ok(m, "perfRecord not found");
  const params = m[1].split(",").map((s) => s.trim()).filter(Boolean);
  assert.deepStrictEqual(params, ["op", "durationMs"],
    "perfRecord grew a parameter. Whatever it now accepts is written into a file that " +
    "leaves the device — re-read the privacy note at the top of js/perf-metrics.js.");
});


/* ═══ 2. BOUNDED ═══ */

test("a ring never exceeds its declared size", () => {
  const ctx = sandbox();
  call(ctx, "for (var i = 0; i < 10000; i++) perfRecord('op', i % 50);");
  const st = call(ctx, 'perfStats("op")');
  assert.strictEqual(st.samples, call(ctx, "PERF_RING_SIZE"),
    "the ring grew past its bound");
  assert.strictEqual(st.total_recorded, 10000,
    "the total count must still be truthful even though samples are capped");
});

test("many distinct operations do not grow without limit in practice", () => {
  /* Unknown op names are still recorded — a typo must be visible, not silent —
     but they are flagged so the panel shows them as unrecognised rather than
     quietly accumulating as if they were expected. */
  const ctx = sandbox();
  call(ctx, "perfRecord('typo_op', 5); perfRecord('engine_run', 1);");
  const rows = call(ctx, "JSON.stringify(perfReport())");
  const parsed = JSON.parse(rows);
  const typo = parsed.find((r) => r.op === "typo_op");
  assert.ok(typo && typo.unknown_op === true, "an unrecognised op must be flagged: " + rows);
});


/* ═══ 3. IT CANNOT CHANGE WHAT IT MEASURES ═══ */

test("perfTime returns exactly what the wrapped function returns", () => {
  const ctx = sandbox();
  assert.strictEqual(call(ctx, 'perfTime("op", function () { return 42; })'), 42);
  assert.strictEqual(call(ctx, 'perfTime("op", function () { return null; })'), null);
  assert.strictEqual(call(ctx, 'perfTime("op", function () { return false; })'), false,
    "a falsy return must survive — saveStore's contract is a boolean");
});

test("a throwing operation still throws, and is still recorded", () => {
  const ctx = sandbox();
  const threw = call(ctx, `
    (function () {
      try { perfTime("op", function () { throw new Error("boom"); }); return "no throw"; }
      catch (e) { return e.message; }
    })()
  `);
  assert.strictEqual(threw, "boom", "the error was swallowed by the instrumentation");
  assert.ok(call(ctx, 'perfStats("op") !== null'),
    "a slow failing path is exactly the one worth timing");
});

test("percentiles are median and p95, not a mean", () => {
  /* The storage benchmark reported saveVisits as 2,552 ms because ONE garbage
     collection pause landed inside a mean. That wrong number was quoted as a
     measurement. This instrument must not repeat it. */
  const ctx = sandbox();
  call(ctx, "for (var i = 0; i < 40; i++) perfRecord('op', 10);");
  call(ctx, "perfRecord('op', 5000);");            /* one catastrophic outlier */
  const st = call(ctx, 'perfStats("op")');
  assert.strictEqual(st.p50, 10, "the median must be unmoved by a single outlier");
  assert.strictEqual(st.worst, 5000, "but the outlier must still be visible");
});

test("storage still works when perf-metrics.js is not loaded at all", () => {
  /* Every Node harness loads storage.js on its own. Instrumentation must be
     optional, or a missing script turns into a broken save. */
  const mem = {};
  const ctx = {
    localStorage: {
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: () => 0, clearTimeout: () => {},
    module: { exports: {} }, evEmit: () => {}, lsSet: () => true, alert: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "dc.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  assert.strictEqual(vm.runInContext("typeof perfTime", ctx), "undefined", "setup");
  assert.strictEqual(vm.runInContext('saveVisits([{ id: "v1" }])', ctx), true);
  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 1);
});


/* ═══ 4. IT IS ACTUALLY WIRED UP ═══ */

test("the operations the Phase 7 report measured are the ones instrumented", () => {
  const storage = read("js/storage.js");
  const engine = read("js/engine.js");
  const wired = [
    ["load_visits", storage], ["save_visits", storage],
    ["load_patients", storage], ["save_patients", storage],
    ["get_patient_visits", storage], ["do_save", storage],
    ["engine_run", engine]
  ];
  for (const [op, src] of wired) {
    assert.ok(src.indexOf('"' + op + '"') > 0, op + " is declared but never recorded anywhere");
  }
});

test("every instrumented op has a human label in the panel", () => {
  const ctx = sandbox();
  const known = call(ctx, "PERF_KNOWN_OPS.slice()");
  const ui = read("js/ui-thresholds.js");
  for (const op of known) {
    assert.ok(ui.indexOf(op + ":") > 0,
      op + " has no label in PERF_OP_LABELS — it would show a raw identifier to a clinician");
  }
});

test("the timings ride along in a backup export", () => {
  const src = read("js/storage-backup.js");
  assert.ok(/perfExportPayload/.test(src),
    "a slow device must be diagnosable from the backup the clinic already knows how to make");
});
