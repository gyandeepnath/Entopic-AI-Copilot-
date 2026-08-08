/* ═══════════════════════════════════════════════════════════════ */
/* READING TELLS YOU WHAT IS ON DISK                                */
/*                                                                  */
/* Was tests/storage-cache.test.js, and it pinned the opposite       */
/* contract. A parse cache lived in storage.js and handed callers    */
/* the SHARED parsed object; it measured 284 ms -> 0.012 ms on       */
/* loadVisits() and it was removed, because the adversarial harness  */
/* showed what the sharing cost:                                     */
/*                                                                   */
/*   save a visit -> the write fails on quota -> loadVisits() STILL  */
/*   RETURNS IT, because the caller's array IS the cache's array.    */
/*                                                                   */
/* That is the one moment this product must not be wrong: the        */
/* clinician is being told "this device has stopped saving", and     */
/* every check of what actually persisted was reading the unsaved    */
/* value instead.                                                    */
/*                                                                   */
/* The safe version was measured too and is simply slower —          */
/* structuredClone 753 ms vs JSON.parse 645 ms at 9,000 visits. And  */
/* the size it optimised cannot occur: localStorage exhausts at      */
/* ~1,900 visits, where an uncached parse is ~30 ms.                 */
/*                                                                   */
/* So these tests pin ONE property, which every storage guarantee in */
/* the codebase rests on:                                            */
/*                                                                   */
/*     a read reflects the bytes on disk, and nothing else.          */
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
  let budget = Infinity;
  const used = () => Object.keys(mem).reduce((n, k) => n + k.length + mem[k].length, 0);
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      v = String(v);
      if (used() - (mem[k] ? mem[k].length : 0) + v.length > budget) {
        const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
      }
      mem[k] = v;
    },
    removeItem: (k) => { delete mem[k]; }
  };
  const ctx = Object.assign({
    localStorage: ls, _mem: mem, _setBudget: (n) => { budget = n; },
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


/* ═══ 1. THE PROPERTY THE CACHE BROKE ═══ */

test("a write that failed does not leave its data readable", () => {
  /* tools/stress/attack.js A1, promoted. This is the whole reason the cache
     is gone: a record that is not on disk must not read back as though it is,
     because a reload, a second tab, or tomorrow morning will not see it. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1", data: {} }]);');
  ctx._setBudget(2000);

  const ok = call(ctx, 'var vs = loadVisits(); vs.push({ id: "v2", data: { pad: "x".repeat(50000) } }); saveVisits(vs);');
  assert.strictEqual(ok, false, "the oversized write must be refused");

  assert.strictEqual(call(ctx, "loadVisits().length"), 1,
    "loadVisits() returned a visit that never reached disk");
});

test("mutating a loaded store without saving does not change what is stored", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1", data: { cc: "real" } }]);');
  call(ctx, 'var a = loadVisits(); a[0].data.cc = "TAMPERED"; a.push({ id: "ghost" });');
  assert.strictEqual(call(ctx, "loadVisits().length"), 1, "a ghost record became readable");
  assert.strictEqual(call(ctx, "loadVisits()[0].data.cc"), "real",
    "an unsaved edit became readable as stored data");
});

test("mutating the object AFTER saving it does not change what is stored", () => {
  /* doSave() assigns the live visit V into the array it saves, and the
     clinician keeps typing into V afterwards. With a shared cache those
     keystrokes read back as persisted; they are not. */
  const ctx = sandbox();
  call(ctx, '__v = [{ id: "v1", data: { cc: "saved" } }]; saveVisits(__v);');
  call(ctx, '__v[0].data.cc = "typed after the save";');
  assert.strictEqual(call(ctx, "loadVisits()[0].data.cc"), "saved");
});

test("one reader cannot see another reader's uncommitted edit", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1", data: { cc: "real" } }]);');
  const seen = call(ctx, 'var a = loadVisits(), b = loadVisits(); a[0].data.cc = "X"; b[0].data.cc;');
  assert.strictEqual(seen, "real", "two readers shared one object");
});

test("loadStore hands back a fresh object every time", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1" }]);');
  assert.strictEqual(call(ctx, "loadVisits() === loadVisits()"), false,
    "two reads returned the same object — the shared-parse contract is back");
});


/* ═══ 2. AND ALL THE OLD STALENESS PROPERTIES STILL HOLD ═══ */

test("a write is visible to the very next read", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 1);
  call(ctx, 'saveVisits([{ id: "a" }, { id: "b" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);
});

test("a write from ANOTHER TAB is seen immediately", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "mine" }]);');
  assert.strictEqual(call(ctx, "loadVisits()[0].id"), "mine");
  ctx.localStorage.setItem("entopic_visits", JSON.stringify([{ id: "theirs" }, { id: "extra" }]));
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);
  assert.strictEqual(call(ctx, "loadVisits()[0].id"), "theirs");
});

test("a removed store reads as absent, not as its last value", () => {
  const ctx = sandbox();
  call(ctx, 'saveStore("settings", { a: 1 });');
  assert.strictEqual(call(ctx, 'loadStore("settings", null).a'), 1);
  call(ctx, 'removeStore("settings");');
  assert.strictEqual(call(ctx, 'loadStore("settings", "GONE")'), "GONE");
});

test("a store that disappears underneath us reads as absent", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }]);');
  call(ctx, "loadVisits();");
  ctx.localStorage.removeItem("entopic_visits");
  assert.strictEqual(call(ctx, "loadVisits().length"), 0);
});

test("a store that becomes CORRUPT reads as corrupt, not as its last good value", () => {
  /* The most dangerous staleness: writes are refused because the store is
     damaged, while reads keep handing out a healthy-looking copy. */
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "a" }, { id: "b" }]);');
  assert.strictEqual(call(ctx, "loadVisits().length"), 2);

  ctx.localStorage.setItem("entopic_visits", '[{"id":"a"');
  assert.strictEqual(call(ctx, "loadVisits().length"), 0, "corrupt must read as the fallback");
  assert.strictEqual(call(ctx, 'storageIsCorrupt("visits")'), true);
  assert.strictEqual(call(ctx, "loadVisits().length"), 0, "and stay that way on the next read");
});

test("a write refused over a corrupt store does not become readable", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "real" }]);');
  ctx.localStorage.setItem("entopic_visits", '[{"id":"real"');
  call(ctx, "loadVisits();");                      /* detects corruption */
  assert.strictEqual(call(ctx, 'saveVisits([{ id: "ghost" }])'), false, "the write must be refused");
  assert.strictEqual(call(ctx, "loadVisits().length"), 0,
    "a refused write must not become readable truth");
});

test("a store that parses but is the wrong shape is corrupt", () => {
  const ctx = sandbox();
  ctx.localStorage.setItem("entopic_visits", '{"not":"a list"}');
  assert.strictEqual(call(ctx, "loadVisits().length"), 0);
  assert.strictEqual(call(ctx, 'storageIsCorrupt("visits")'), true);
});


/* ═══ 3. THE PATTERN THE CODEBASE ACTUALLY USES STILL WORKS ═══ */

test("read → mutate → save still works", () => {
  const ctx = sandbox();
  call(ctx, 'saveVisits([{ id: "v1", data: { cc: "before" } }]);');
  call(ctx, 'var vs = loadVisits(); vs[0].data.cc = "after"; saveVisits(vs);');
  assert.strictEqual(call(ctx, "loadVisits()[0].data.cc"), "after");
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

test("the vault path is unaffected", () => {
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


/* ═══ 4. THE DECISION IS WRITTEN DOWN WHERE THE CODE IS ═══ */

test("no parse cache has crept back in", () => {
  const src = read("js/storage.js");
  assert.ok(!/_PARSE_CACHE/.test(src),
    "a parse cache is back in storage.js. Read the comment at the top of loadStore " +
    "and tools/stress/attack.js A1 before re-adding one: the previous cache made a " +
    "failed write readable as though it had persisted.");
});

test("the reasoning survives for whoever considers adding one again", () => {
  const src = read("js/storage.js");
  assert.ok(/structuredClone/.test(src) && /1,900 visits/.test(src),
    "storage.js must keep the measurements that justify NOT caching — the copy-on-read " +
    "cost and the store size actually reachable — or the next author will re-add it");
});

test("the benchmark tool exists and is runnable", () => {
  /* 'Optimisation without measurement is prohibited' cuts both ways: the
     decision NOT to optimise has to be re-checkable too. */
  assert.ok(fs.existsSync(path.join(ROOT, "tools/bench/storage-bench.js")));
  const src = read("tools/bench/storage-bench.js");
  assert.ok(src.indexOf("js/storage.js") > 0, "it must exercise the REAL storage layer");
});
