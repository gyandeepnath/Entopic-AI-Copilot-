/* ═══════════════════════════════════════════════════════════════ */
/* STORAGE BENCHMARK  (Phase 7)                                    */
/*                                                                  */
/* "Optimisation without measurement is prohibited." This is the    */
/* measurement. It runs the REAL storage layer against synthetic    */
/* clinics of increasing size and reports where the time goes.      */
/*                                                                  */
/*   node tools/bench/storage-bench.js [--n 100,1000,5000]          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function sandbox() {
  const mem = {};
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  const ctx = {
    localStorage: ls, _mem: mem,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: () => 0, clearTimeout: () => {},
    module: { exports: {} },
    evEmit: () => {}, lsSet: () => true, alert: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "dc.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  return ctx;
}

/* A visit the size of a real completed one (measured: ~4-12 KB serialised). */
function makeVisit(i, pid) {
  return {
    id: "v" + i, patient_id: pid, date: new Date(Date.now() - i * 3600000).toISOString(),
    status: "completed", updated: new Date().toISOString(),
    data: {
      id: "v" + i, cc: "blurred vision, gradual onset over six months",
      symptoms: ["blur", "glare", "gradual_blur", "near_blur"],
      rx: { od_sph: "-2.25", od_cyl: "-0.75", od_ax: "180", os_sph: "-2.00" },
      iop: { od: "16", os: "15" },
      sl: { od: { ns: "2", vh: "3" }, os: { ns: "2", vh: "3" }, findings: [] },
      fun: { od: { cd_v: "0.4" }, os: { cd_v: "0.4" }, findings: [] },
      dxList: Array.from({ length: 8 }, (_, k) => ({
        n: "Condition " + k, prob: 0.8 - k * 0.07, icd: "H00.0",
        reasoning: "Moderate — Matched: blur, glare | Missing: photophobia",
        evidence: { matched: ["blur", "glare"], missing: ["photophobia"], contradicted: [] }
      })),
      alerts: [], engine_tokens: Array.from({ length: 40 }, (_, k) => "token_" + k),
      engine_provenance: { kb_version: "1.1.0", run_at: new Date().toISOString(),
        shown_top: [{ name: "Condition 0", prob: 0.8 }] }
    }
  };
}

function ms(fn, iterations) {
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn(i);
  const t1 = process.hrtime.bigint();
  return Number(t1 - t0) / 1e6 / iterations;
}

function bench(n) {
  const ctx = sandbox();
  const visits = [], patients = [];
  const perPatient = 3;
  for (let i = 0; i < n; i++) {
    const pid = "p" + Math.floor(i / perPatient);
    if (i % perPatient === 0) {
      patients.push({ id: pid, mrn: "MRN" + pid, first_name: "Test", last_name: "Patient " + pid,
                      dob: "1980-01-01", age: "45", updated: new Date().toISOString() });
    }
    visits.push(makeVisit(i, pid));
  }
  ctx.__v = visits; ctx.__p = patients;
  vm.runInContext("saveVisits(__v); savePatients(__p);", ctx);

  const bytes = ctx._mem["entopic_visits"].length + ctx._mem["entopic_patients"].length;
  const iters = n > 2000 ? 20 : 100;

  return {
    n,
    bytes,
    kb_per_visit: +(ctx._mem["entopic_visits"].length / n / 1024).toFixed(2),
    loadVisits_ms: +ms(() => vm.runInContext("loadVisits();", ctx), iters).toFixed(3),
    loadPatients_ms: +ms(() => vm.runInContext("loadPatients();", ctx), iters).toFixed(3),
    getPatientVisits_ms: +ms(() => vm.runInContext('getPatientVisits("p3");', ctx), iters).toFixed(3),
    getLastVisit_ms: +ms(() => vm.runInContext('getLastVisit("p3");', ctx), iters).toFixed(3),
    saveVisits_ms: +ms(() => vm.runInContext("saveVisits(loadVisits());", ctx), Math.max(5, iters / 10)).toFixed(3)
  };
}

const arg = process.argv.find((a) => a.startsWith("--n="));
const sizes = arg ? arg.slice(4).split(",").map(Number) : [100, 500, 1000, 3000, 9000];

console.log("Entopic storage benchmark — real storage layer, synthetic clinic\n");
console.log("visits | store MB | KB/visit | loadVisits | loadPatients | getPatientVisits | getLastVisit | saveVisits");
console.log("-------+----------+----------+------------+--------------+------------------+--------------+-----------");
const rows = [];
for (const n of sizes) {
  const r = bench(n);
  rows.push(r);
  console.log(
    String(r.n).padStart(6) + " | " +
    (r.bytes / 1048576).toFixed(2).padStart(8) + " | " +
    String(r.kb_per_visit).padStart(8) + " | " +
    (r.loadVisits_ms + " ms").padStart(10) + " | " +
    (r.loadPatients_ms + " ms").padStart(12) + " | " +
    (r.getPatientVisits_ms + " ms").padStart(16) + " | " +
    (r.getLastVisit_ms + " ms").padStart(12) + " | " +
    (r.saveVisits_ms + " ms").padStart(10));
}

const first = rows[0], last = rows[rows.length - 1];
const growth = (last.loadVisits_ms / first.loadVisits_ms) / (last.n / first.n);
console.log("\nloadVisits scaling factor vs linear: " + growth.toFixed(2) +
  "  (1.0 = exactly O(n))");
console.log("Projected localStorage exhaustion (~5 MB budget): ~" +
  Math.round(5 * 1048576 / (last.bytes / last.n)) + " visits");
if (process.env.BENCH_JSON) console.log("\nJSON " + JSON.stringify(rows));
