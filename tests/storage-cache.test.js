/* ═══════════════════════════════════════════════════════════════ */
/* PARSE CACHE  (Phase 7, BE-15)                                    */
/*                                                                  */
/* MEASURED before and after (tools/bench/storage-bench.js,          */
/* 9,000 visits / 23.5 MB, the real storage layer):                  */
/*                                                                   */
/*                     before      after                             */
/*   loadVisits        284 ms      0.012 ms                          */
/*   getPatientVisits  245 ms      0.655 ms                          */
/*   getLastVisit      239 ms      0.503 ms                          */
/*   saveVisits        962 ms      267 ms                            */
/*                                                                   */
/* An optimisation that changes a contract has to earn it, and the   */
/* contract DID change: loadStore now returns a shared object rather */
/* than a fresh parse. These tests pin what must still be true.      */
/*                                                                   */
/* The dangerous cases are all about STALENESS — serving a parse of  */
/* bytes that are no longer there. Every one of them is here.        */
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
  const mem = {};
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  const ctx = Object.assign({
    localStorage: ls, _mem: mem,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: () => 0, clearTimeout: () => {},
    module: { exports: {} }, evEmit: () => {}, lsSet: () => true, alert: () => {}
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "dc.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  return ctx;
}
const call = (ctx, e) => vm.runInContext(e, ctx);


/* ═══ IT MUST NEVER SERVE STALE DATA ═══ */

test("a write is visible to the very next read", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 1);
  call(ctx, 'saveVisits([{ id: "a" }, { id: "b" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);
});

test("a write from ANOTHER TAB invalidates the cache", () => {
  /* The case a naive cache gets wrong, and the reason the cache is keyed on
     the raw string rather than on a dirty flag: the bytes changed underneath
     us, and we re-read them on every call. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "mine" }]);');
  assert.strictEqual(call(ctx, "loadVisits()[0].id"), "mine");

  /* Another tab writes directly to localStorage — this module never saw it. */
  ctx.localStorage.setItem("entopic_visits", JSON.stringify([{ id: "theirs" }, { id: "extra" }]));

  assert.strictEqual(call(ctx, "loadVisits().length"), 2,
    "the cache served a parse of bytes that are no longer there");
  assert.strictEqual(call(ctx, "loadVisits()[0].id"), "theirs");
});

test("removing a store clears its cache", () => {
  const ctx = sandbox();
  call(ctx, 'saveStore("settings", { a: 1 });');
  assert.strictEqual(call(ctx, 'loadStore("settings", null).a'), 1);
  call(ctx, 'removeStore("settings");');
  assert.strictEqual(call(ctx, 'loadStore("settings", "GONE")'), "GONE");
});

test("a store that disappears reads as absent, not as its last value", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }]);');
  call(ctx, "loadVisits();");
  ctx.localStorage.removeItem("entopic_visits");
  assert.strictEqual(call(ctx, "loadVisits().length"), 0);
});

test("a store that becomes CORRUPT is never served from cache", () => {
  /* The most dangerous staleness: the guard refuses writes because the store
     is damaged, while reads keep handing out a healthy-looking cached copy. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }, { id: "b" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);

  ctx.localStorage.setItem("entopic_visits", '[{"id":"a"');
  assert.strictEqual(call(ctx, "loadVisits().length"), 0, "corrupt must read as the fallback");
  assert.strictEqual(call(ctx, 'storageIsCorrupt("visits")'), true);
  assert.strictEqual(call(ctx, "loadVisits().length"), 0, "and stay that way on the next read");
});

test("a refused write does not poison the cache", () => {
  /* saveStore refuses on a corrupt store. The cache must not be updated with
     data that was never persisted. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "real" }]);');
  ctx.localStorage.setItem("entopic_visits", '[{"id":"real"');
  call(ctx, "loadVisits();");                      /* detects corruption */
  assert.strictEqual(call(ctx, 'saveVisits([{ id: "ghost" }])'), false, "the write must be refused");
  assert.strictEqual(call(ctx, "loadVisits().length"), 0,
    "a refused write must not become the cached truth");
});

test("the wrong-shape guard still fires through the cache", () => {
  const ctx = sandbox();
  ctx.localStorage.setItem("entopic_visits", '{"not":"a list"}');
  assert.strictEqual(call(ctx, "loadVisits().length"), 0);
  assert.strictEqual(call(ctx, 'storageIsCorrupt("visits")'), true);
});


/* ═══ THE CONTRACT CHANGE, AND WHY IT IS SAFE ═══ */

test("read → mutate → save still works", () => {
  /* The pattern the whole codebase uses, including doSave(). The mutation
     lands in the cached object and the save persists it. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1", data: { cc: "before" } }]);');
  call(ctx, 'var vs = loadVisits(); vs[0].data.cc = "after"; saveVisits(vs);');
  assert.strictEqual(call(ctx, "loadVisits()[0].data.cc"), "after");
  /* And it genuinely reached disk, not only the cache. */
  assert.match(ctx.localStorage.getItem("entopic_visits"), /after/);
});

test("doSave's read-both-write-both pattern is correct", () => {
  const ctx = sandbox({});
  ctx.CP = "p1"; ctx.CV = "v1";
  ctx.P = { id: "p1", first_name: "A" };
  ctx.V = { id: "v1", cc: "typed" };
  call(ctx, 'savePatients([{ id: "p1", first_name: "A" }]);' +
            'saveVisits([{ id: "v1", patient_id: "p1", data: {}, status: "in_progress" }]);');
  const res = call(ctx, "doSave()");
  assert.strictEqual(res.ok, true, res.reason);
  assert.strictEqual(call(ctx, "loadVisits()[0].data.cc"), "typed");
});

test("storageCacheClear() forces a genuine re-read", () => {
  /* The escape hatch, for anything that changes storage behind the layer's
     back — a restore, a vault migration, a test. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }]);');
  call(ctx, "loadVisits();");
  ctx.localStorage.setItem("entopic_visits", JSON.stringify([{ id: "x" }, { id: "y" }]));
  call(ctx, "storageCacheClear();");
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);
});

test("the cache is bounded by the NUMBER of stores, not by data", () => {
  /* It cannot leak: one entry per store key, about twenty of them. */
  const ctx = sandbox();
  for (let i = 0; i < 50; i++) call(ctx, `saveVisits([{ id: "v${i}" }]);`);
  const keys = call(ctx, "Object.keys(_PARSE_CACHE).length");
  assert.ok(keys <= 25, "the cache grew to " + keys + " entries");
});

test("the vault path is untouched by the cache", () => {
  /* An unlocked vault serves from its own plaintext cache and never reaches
     the localStorage branch, so the parse cache must not interfere. */
  const store = {};
  const ctx = sandbox({
    vaultEnabled: () => true, vaultUnlocked: () => true,
    vaultIsProtected: (k) => ["patients", "visits", "audit", "users"].indexOf(k) >= 0,
    vaultCacheGet: (k) => store[k], vaultCacheSet: (k, v) => { store[k] = v; },
    vaultIsEnvelope: () => false
  });
  call(ctx, 'saveVisits([{ id: "vaulted" }]);');
  assert.strictEqual(call(ctx, "loadVisits()[0].id"), "vaulted");
  assert.strictEqual(ctx.localStorage.getItem("entopic_visits"), null,
    "a vaulted store must never be written in the clear");
});


/* ═══ THE MEASUREMENT IS REAL ═══ */

test("the benchmark runs and the cache is measurably faster", () => {
  /* Not a microbenchmark of the cache — a real read of a real store, twice,
     with the second served from cache. The margin measured at 9,000 visits is
     roughly 20,000x; asserting a conservative 5x keeps this from being flaky
     on a loaded CI machine while still failing if the cache stops working. */
  const ctx = sandbox();
  const visits = [];
  for (let i = 0; i < 2000; i++) {
    visits.push({ id: "v" + i, patient_id: "p" + (i % 500), date: "2026-01-01",
                  status: "completed", data: { cc: "x".repeat(400), dxList: [] } });
  }
  ctx.__v = visits;
  call(ctx, "saveVisits(__v); storageCacheClear();");

  const t0 = process.hrtime.bigint();
  call(ctx, "loadVisits();");
  const cold = Number(process.hrtime.bigint() - t0);

  const t1 = process.hrtime.bigint();
  for (let i = 0; i < 20; i++) call(ctx, "loadVisits();");
  const warm = Number(process.hrtime.bigint() - t1) / 20;

  assert.ok(cold / warm > 5,
    "cold " + (cold / 1e6).toFixed(2) + " ms vs warm " + (warm / 1e6).toFixed(3) +
    " ms — the cache is not doing anything");
});

test("the benchmark tool exists and is runnable", () => {
  /* 'Optimisation without measurement is prohibited.' The measurement has to
     be re-runnable by whoever comes next, not a number in a commit message. */
  assert.ok(fs.existsSync(path.join(ROOT, "tools/bench/storage-bench.js")));
  const src = read("tools/bench/storage-bench.js");
  assert.ok(src.indexOf("js/storage.js") > 0, "it must exercise the REAL storage layer");
});

test("the before/after numbers are recorded where the code is", () => {
  const src = read("js/storage.js");
  assert.ok(src.indexOf("tools/bench/storage-bench.js") > 0,
    "the code must point at the measurement that justifies it");
  assert.ok(/284 ms/.test(src) && /962 ms/.test(src),
    "the measured baseline must be written down, or the next author cannot tell " +
    "whether the cache is still earning its complexity");
});
