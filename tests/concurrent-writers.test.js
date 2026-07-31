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

test("doSave detects the conflict before replacing the visit data", () => {
  const src = read("js/storage.js");
  const fn = /function doSave\(\)[\s\S]*?\n  saveVisits\(visits\);/.exec(src);
  assert.ok(fn, "doSave not found");

  const detect = fn[0].indexOf("recDetectConflict");
  const replace = fn[0].indexOf("visits[i].data = V");
  assert.ok(detect >= 0, "doSave must check for a concurrent write");
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
  const src = read("js/storage.js");
  assert.ok(/storageShowVisitConflict/.test(src), "a visible notice exists");
  assert.ok(/logAudit\("visit_conflict"/.test(src), "and it is written to the audit trail");
});
