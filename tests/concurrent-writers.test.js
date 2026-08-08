/* ═══════════════════════════════════════════════════════════════ */
/* CONCURRENT WRITERS — TWO WINDOWS ON ONE CLINIC MACHINE           */
/*                                                                  */
/* The test-suite audit found no concurrency tests at all (the only */
/* "concurrent" in the suite referred to concurrent clinical        */
/* PROBLEMS, not concurrent writers). The gap hid silent clinical   */
/* data loss.                                                       */
/*                                                                  */
/* MEASURED, one browser profile, two tabs on the same visit:       */
/*   tab A records IOP 24/22 and saves                              */
/*   tab B, holding its own copy, records a fundus finding, saves   */
/*   stored: the finding; IOP blank; no record that it ever existed  */
/*                                                                  */
/* This is an everyday clinic situation — the front desk and the    */
/* consulting room, or one clinician with a second tab open.        */
/*                                                                  */
/* Automatically merging two clinical records is not something      */
/* software should do unsupervised, so the fix does the one thing   */
/* that is unambiguously right: the overwritten version is NEVER    */
/* destroyed. It is preserved in full on the record, attributed,    */
/* and the clinician is told.                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function load() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/clinical-record.js"), ctx, { filename: "clinical-record.js" });
  return ctx;
}
const ctx = load();
const run = (expr, vars) => {
  Object.assign(ctx, vars || {});
  return vm.runInContext(expr, ctx);
};

function storedVisit(over) {
  return Object.assign({
    id: "v1", patient_id: "p1", status: "in_progress",
    date: "2026-07-31T09:00:00.000Z",
    updated: "2026-07-31T09:05:00.000Z",
    updated_by: "Dr A",
    data: { iop: { od: 24, os: 22 }, fun: { findings: [] } }
  }, over || {});
}


/* ═══ Detection ═══ */

test("a save with the stamp we last saw is not a conflict", () => {
  const v = storedVisit();
  const c = run("recDetectConflict(__v, __seen)", { __v: v, __seen: v.updated });
  assert.strictEqual(c, null, "the ordinary single-window case must stay silent");
});

test("a save after another window wrote is detected, naming who", () => {
  const v = storedVisit();
  const c = run("recDetectConflict(__v, __seen)",
    { __v: v, __seen: "2026-07-31T09:00:00.000Z" });   /* opened before A saved */
  assert.ok(c, "a changed stamp is a conflict");
  assert.strictEqual(c.by, "Dr A", "the clinician who wrote in between is named");
  assert.strictEqual(c.found, "2026-07-31T09:05:00.000Z");
});

test("no stamp to compare against is not treated as a conflict", () => {
  /* A visit created in this tab has never been read from disk. Flagging that
     as a conflict would cry wolf on every first save and train the warning
     away — which is worse than not having it. */
  const v = storedVisit();
  assert.strictEqual(run("recDetectConflict(__v, null)", { __v: v }), null);
  assert.strictEqual(run("recDetectConflict(__v, '')", { __v: v }), null);
  assert.strictEqual(run("recDetectConflict(null, 'x')", {}), null);
});


/* ═══ The data must survive ═══ */

test("the overwritten version is preserved in full, not discarded", () => {
  /* The whole point. Tab A's IOP must still exist somewhere after tab B saves. */
  const v = storedVisit();
  const c = run("recDetectConflict(__v, __seen)",
    { __v: v, __seen: "2026-07-31T09:00:00.000Z" });
  run("recPreserveOverwritten(__v, __c)", { __v: v, __c: c });

  assert.strictEqual(v.conflicts.length, 1);
  assert.strictEqual(v.had_conflict, true, "the record says two windows wrote it");
  assert.strictEqual(v.conflicts[0].data.iop.od, 24,
    "tab A's IOP measurement survives — this is the reading that used to vanish");
  assert.strictEqual(v.conflicts[0].overwritten_by, "Dr A", "attributed to who took it");
  assert.ok(v.conflicts[0].at, "and when it was displaced");
});

test("the preserved copy is a snapshot, not a live reference", () => {
  /* A shared reference would be mutated by the very save that displaced it,
     so the "preserved" version would silently become the overwriting one. */
  const v = storedVisit();
  const c = run("recDetectConflict(__v, __seen)", { __v: v, __seen: v.date });
  run("recPreserveOverwritten(__v, __c)", { __v: v, __c: c });

  v.data.iop.od = 99;                       /* the incoming save lands */
  assert.strictEqual(v.conflicts[0].data.iop.od, 24,
    "the preserved copy must be unaffected by later writes");
});

test("preserved versions are capped, keeping the earliest divergence", () => {
  /* Unbounded full-visit snapshots would become their own storage problem.
     The OLDEST are kept: the earliest divergence is the hardest to
     reconstruct from what remains. */
  const v = storedVisit();
  for (let i = 0; i < 9; i++) {
    v.data.iop.od = i;
    run("recPreserveOverwritten(__v, {found:'s" + i + "', by:'Dr " + i + "'})", { __v: v });
  }
  assert.strictEqual(v.conflicts.length, 5, "capped at REC_MAX_CONFLICTS");
  assert.strictEqual(v.conflicts[0].overwritten_by, "Dr 0", "the earliest is kept");
  assert.strictEqual(v.conflicts[4].overwritten_by, "Dr 4");
});


/* ═══ The wiring that makes it real ═══ */

/* Behavioural, not a source scrape.

   This used to regex `doSave()`'s text for the ORDER of two identifiers, and
   it broke the moment that logic moved into _doSaveApply during the per-visit
   storage split — while the behaviour it cared about was completely intact. A
   test that fails on a refactor and would pass on a re-introduced bug is worse
   than no test: it trains whoever comes next to adjust the regex.

   So: run two writers against the real storage layer and assert what actually
   matters — the version being overwritten survives, in full, on the record. */
function saveSandbox() {
  const mem = {};
  const audits = [], events = [];
  const c = {
    localStorage: {
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: (k) => { delete mem[k]; }
    },
    _mem: mem, _audits: audits, _events: events,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {},
    module: { exports: {} },
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { mem[k] = String(v); return true; }, alert: () => {}
  };
  c.window = c;
  vm.createContext(c);
  for (const f of ["js/data-classification.js", "js/clinical-record.js",
                   "js/storage.js", "js/visit-store.js"]) {
    vm.runInContext(read(f), c, { filename: f });
  }
  vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", c);
  return c;
}

for (const split of [false, true]) {
  test("a concurrent write is preserved, not destroyed — " +
       (split ? "per-visit storage" : "pre-split storage"), () => {
    const c = saveSandbox();
    const call = (e) => vm.runInContext(e, c);

    call(`saveVisits([{ id: "v1", patient_id: "p1", status: "in_progress",
      date: "2026-07-31T09:00:00.000Z", updated: "2026-07-31T09:05:00.000Z",
      updated_by: "Dr A", data: { iop: { od: 24, os: 22 } } }]);`);
    if (split) {
      const r = call("visitStoreSplitNow()");
      assert.strictEqual(r.ok, true, "setup: split should succeed — " + r.reason);
    }

    /* This tab opened the visit at 09:05 and has been typing since. */
    c.CP = "p1"; c.CV = "v1";
    c.P = { id: "p1", first_name: "A" };
    c.V = { id: "v1", fun: { findings: ["disc haemorrhage OD"] } };
    call('setVisitSeenStamp("2026-07-31T09:05:00.000Z");');

    /* Meanwhile the OTHER window saved: a later stamp, and the IOP this tab
       never saw. Written straight to the store, as a second tab would. */
    const other = {
      id: "v1", patient_id: "p1", status: "in_progress",
      date: "2026-07-31T09:00:00.000Z", updated: "2026-07-31T09:30:00.000Z",
      updated_by: "Dr B", data: { iop: { od: 24, os: 22 }, cc: "typed by the other window" }
    };
    c.__other = other;
    call(split ? "saveStore('visit_v1', __other);" : "saveVisits([__other]);");

    const res = call("doSave()");
    assert.strictEqual(res.ok, true, "the save itself must still succeed: " + res.reason);

    const stored = call("getPatientVisits('p1')")[0];
    assert.ok(stored, "the visit must still exist");

    /* THE ASSERTION: this tab's work landed, AND the other window's version
       was kept on the record rather than silently discarded. */
    assert.deepStrictEqual(
      Array.from(stored.data.fun.findings), ["disc haemorrhage OD"],
      "this tab's finding must be saved");

    const preserved = JSON.stringify(stored.overwritten || stored.amendments || stored);
    assert.ok(/typed by the other window/.test(preserved),
      "the overwritten version was DESTROYED — a clinician's measurement vanished because a " +
      "second tab happened to save later. Stored record: " + JSON.stringify(stored).slice(0, 400));

    assert.ok(c._events.some((e) => e[0] === "visit:conflict"),
      "the clinician must be told that two windows were writing");
    assert.ok(c._audits.some((a) => a.a === "visit_conflict"),
      "and it must be in the audit trail");
  });
}

test("the conflict check runs BEFORE the data is replaced", () => {
  /* The one ordering fact worth pinning in source, because getting it wrong
     produces a test-passing bug: preserving AFTER the replacement preserves
     the overwriting version, which looks correct and saves nothing. */
  const src = read("js/storage.js");
  const fn = /function _doSaveApply\(rec\)[\s\S]*?\n}/.exec(src);
  assert.ok(fn, "_doSaveApply not found — if the save path was restructured again, " +
                "re-point this at wherever the visit wrapper is now updated");
  const detect = fn[0].indexOf("recDetectConflict");
  const replace = fn[0].indexOf("rec.data = V");
  assert.ok(detect >= 0 && replace >= 0, "both steps must be present");
  assert.ok(detect < replace,
    "the check must run BEFORE the data is replaced — afterwards the version " +
    "being preserved is already the overwriting one");
  assert.ok(/recPreserveOverwritten/.test(fn[0]), "and preserve what it is about to replace");
  assert.ok(/VISIT_SEEN_STAMP = /.test(fn[0]), "and refresh the stamp for the next save");
});

test("every path that opens an existing visit records the stamp it saw", () => {
  /* Without this the comparison has nothing to compare against and the
     protection silently does nothing — the failure mode that made my first
     browser reproduction of the fix look like it had not worked. */
  for (const f of ["js/app.js", "js/ui-chart.js"]) {
    const src = read(f);
    const opens = /V = (?:last|ip)\.data \|\| blankVisit\(\)/.test(src);
    if (!opens) continue;
    assert.ok(/setVisitSeenStamp\(/.test(src),
      f + " opens an existing visit but never records the stamp it saw");
  }
});

test("the clinician is told, and the audit trail records it", () => {
  /* storage.js used to build the notice itself. It now emits "visit:conflict"
     and js/ui-storage-banners.js renders it, so the contract spans two files:
     the fact must be announced, and something must be listening. A test that
     only checked the emitter would pass with nobody subscribed — which is
     exactly the failure mode of moving to events. */
  const src = read("js/storage.js");
  assert.ok(/evEmit\("visit:conflict"/.test(src),
    "storage must announce the conflict");
  assert.ok(/logAudit\("visit_conflict"/.test(src),
    "and it is written to the audit trail");

  const ui = read("js/ui-storage-banners.js");
  assert.ok(/evOn\("visit:conflict"/.test(ui),
    "and something must actually render it — an unheard event is a silent failure");
  assert.ok(/visitConflictBanner/.test(ui), "a visible notice exists");
});
