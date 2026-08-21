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

function sandbox(opts) {
  opts = opts || {};
  const mem = Object.create(null);
  /* KEY ACCESS MUST BE O(1), AS IT IS IN A BROWSER.

     This used to be `Object.keys(mem)[i]`, which rebuilds the whole key array
     on every call. storageUsage() walks localStorage by index on every save,
     so an O(n) key() turned an O(n) scan into O(n^2) and the whole benchmark
     into O(n^3) — and the numbers it printed were the harness, not Entopic.

     Measured, same code, same data, 2,000 visits:
         O(n) key()  ->  visit-store split 443,971 ms   (7.4 minutes)
         O(1) key()  ->  visit-store split       667 ms

     I nearly reported the first figure as a startup defect. A benchmark whose
     own storage is asymptotically unlike the real thing does not measure the
     product; it measures itself. */
  const keys = [];
  const ls = {
    get length() { return keys.length; },
    key: (i) => (i >= 0 && i < keys.length ? keys[i] : null),
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      if (!Object.prototype.hasOwnProperty.call(mem, k)) keys.push(k);
      mem[k] = String(v);
    },
    removeItem: (k) => {
      if (Object.prototype.hasOwnProperty.call(mem, k)) {
        delete mem[k];
        const i = keys.indexOf(k);
        if (i >= 0) keys.splice(i, 1);
      }
    }
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

  /* MEASURE WHAT SHIPS.

     This harness used to load storage.js and stop. getPatientVisits and
     getLastVisit both delegate to js/visit-store.js when it is present, and
     fall back to scanning the whole `visits` array when it is not — so without
     that file every figure in this table described the LEGACY path, not
     Entopic. The per-visit store was the whole point of the Phase 8 storage
     work, and the benchmark was quietly reporting as though it did not exist.

     `withVisitStore: false` keeps the old behaviour available, because the
     fallback is real code that still runs on a device mid-migration and its
     cost is worth knowing. It is now a labelled comparison rather than an
     accident. */
  if (opts.withVisitStore !== false) {
    vm.runInContext(read("js/visit-store.js"), ctx, { filename: "visit-store.js" });
  }
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

/* ── MEDIAN, NOT MEAN, AND THE SPREAD ALONGSIDE IT ──
   (Changed 2026-08-08.)

   This used to total N iterations and divide. One garbage-collection pause
   inside the loop then moved the whole figure, and it did: a single run
   reported saveVisits at 9,000 visits as 2,552 ms and getPatientVisits as
   1,492 ms. Neither reproduced — the stable values are ~600 ms and ~146 ms.
   Those outliers were quoted to the founder as measurements.

   Phase 7's own rule is "predictability is more important than benchmarks".
   A number that swings 4x between runs is not a measurement, and a mean hides
   exactly that. Each iteration is now timed separately; we report the MEDIAN
   (what actually happens) and p95 (how bad the tail is), so a noisy result
   announces itself instead of being averaged into something plausible. */
function ms(fn, iterations) {
  /* Warm up: the first pass through a code path in V8 is not representative,
     and it is never what a clinician experiences either. */
  const warm = Math.max(1, Math.floor(iterations / 10));
  for (let i = 0; i < warm; i++) fn(i);

  const samples = [];
  for (let i = 0; i < iterations; i++) {
    const t0 = process.hrtime.bigint();
    fn(i);
    samples.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const at = (q) => samples[Math.min(samples.length - 1, Math.floor(samples.length * q))];
  const r = { p50: at(0.5), p95: at(0.95) };
  r.toFixed = (d) => r.p50.toFixed(d);          /* callers print the median */
  return r;
}

/* With the store split there is no single `entopic_visits` blob any more, so
   size has to be summed across the per-visit keys. */
function totalVisitBytes(ctx) {
  let total = 0;
  for (const k in ctx._mem) {
    if (k.indexOf("entopic_visit_") === 0 || k === "entopic_visits") total += ctx._mem[k].length;
  }
  return total;
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

  /* SPLIT, exactly as the app does on every boot (js/app.js, after
     migrationsRun). Seeding through saveVisits() alone leaves the per-visit
     index empty, and visitStoreForPatient then falls back to scanning the
     whole array — so the table was reporting the pre-Phase-8 path while the
     shipped app has been split since first launch. `split` records whether it
     actually happened, so a silent failure cannot masquerade as a measurement. */
  let split = { ok: false, migrated: 0 };
  if (vm.runInContext("typeof visitStoreSplitNow === 'function'", ctx)) {
    try { split = vm.runInContext("visitStoreSplitNow()", ctx); } catch (e) { split = { ok: false, reason: String(e) }; }
  }

  const bytes = (ctx._mem["entopic_visits"] || "").length + ctx._mem["entopic_patients"].length;
  const iters = n > 2000 ? 25 : 100;

  const lv = ms(() => vm.runInContext("loadVisits();", ctx), iters);
  const lp = ms(() => vm.runInContext("loadPatients();", ctx), iters);
  const gpv = ms(() => vm.runInContext('getPatientVisits("p3");', ctx), iters);
  const glv = ms(() => vm.runInContext('getLastVisit("p3");', ctx), iters);
  const sv = ms(() => vm.runInContext("saveVisits(loadVisits());", ctx), Math.max(10, iters / 2));

  return {
    n,
    bytes,
    kb_per_visit: +(((ctx._mem["entopic_visits"] || "").length || totalVisitBytes(ctx)) / n / 1024).toFixed(2),
    split_ok: !!split.ok,
    split_migrated: split.migrated || 0,
    loadVisits_ms: +lv.p50.toFixed(3),
    loadPatients_ms: +lp.p50.toFixed(3),
    getPatientVisits_ms: +gpv.p50.toFixed(3),
    getLastVisit_ms: +glv.p50.toFixed(3),
    saveVisits_ms: +sv.p50.toFixed(3),
    /* The tail, reported separately. A p95 far above the median means the
       figure on the left is not what a clinician will always see. */
    p95: { loadVisits: +lv.p95.toFixed(3), getPatientVisits: +gpv.p95.toFixed(3),
           getLastVisit: +glv.p95.toFixed(3), saveVisits: +sv.p95.toFixed(3) }
  };
}

const arg = process.argv.find((a) => a.startsWith("--n="));
const sizes = arg ? arg.slice(4).split(",").map(Number) : [100, 500, 1000, 3000, 9000];

console.log("Entopic storage benchmark — real storage layer, synthetic clinic");
console.log("All figures are MEDIAN of a warmed run; the p95 tail is printed below.\n");
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

console.log("\np95 tail (how bad it gets, not how it usually is):");
for (const r of rows) {
  console.log("  " + String(r.n).padStart(6) + " | loadVisits " + (r.p95.loadVisits + " ms").padStart(10) +
    " | getPatientVisits " + (r.p95.getPatientVisits + " ms").padStart(10) +
    " | saveVisits " + (r.p95.saveVisits + " ms").padStart(10));
}

const first = rows[0], last = rows[rows.length - 1];
const growth = (last.loadVisits_ms / first.loadVisits_ms) / (last.n / first.n);
console.log("\nloadVisits scaling factor vs linear: " + growth.toFixed(2) +
  "  (1.0 = exactly O(n))");
console.log("Projected localStorage exhaustion (~5 MB budget): ~" +
  Math.round(5 * 1048576 / (last.bytes / last.n)) + " visits");
if (process.env.BENCH_JSON) console.log("\nJSON " + JSON.stringify(rows));
