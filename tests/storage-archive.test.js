/* ═══════════════════════════════════════════════════════════════ */
/* RECORD ARCHIVAL  (backend audit BE-10)                           */
/*                                                                  */
/* localStorage exhausts at roughly 3,000 patients. A busy practice  */
/* reaches that in about four years and then the app stops saving —  */
/* the one failure mode with no recovery path, because there was     */
/* nowhere for old records to go.                                    */
/*                                                                   */
/* Archiving is deleting with extra steps, and deleting clinical     */
/* records is the most dangerous thing this codebase does. So the    */
/* tests that matter are not "does it free space" but:               */
/*                                                                   */
/*   • nothing is removed until the archive is VERIFIED;             */
/*   • a chart never grows a silent hole;                            */
/*   • it is reversible.                                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const DAY = 86400000;
const iso = (daysAgo) => new Date(Date.now() - daysAgo * DAY).toISOString();

function sandbox(extra) {
  const mem = {};
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  const audits = [], events = [];
  const ctx = Object.assign({
    localStorage: ls, _mem: mem, _audits: audits, _events: events,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {},
    module: { exports: {} },
    logAudit: (a, d) => audits.push({ a, d }),
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { ls.setItem(k, v); return true; }
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "data-classification.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  vm.runInContext(read("js/storage-archive.js"), ctx, { filename: "storage-archive.js" });
  /* storage.js defines its own logAudit, which shadows the sandbox stub. Put
     the capturing one back so the audit assertions see anything at all. */
  vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", ctx);
  return ctx;
}

/* A clinic with a spread of visits. `old` are 4 years back, `recent` 30 days. */
function clinic(ctx, spec) {
  const visits = [];
  (spec || []).forEach((s) => {
    visits.push({
      id: s.id, patient_id: s.pid, date: s.date,
      status: s.status || "completed",
      data: { id: s.id, final_dx: s.dx || "Dry eye",
              alerts: s.urgent ? [{ m: "x", l: "urgent" }] : [],
              engine_provenance: { kb_version: "1.1.0", shown_top: [{ name: s.dx || "Dry eye" }] },
              filler: "x".repeat(2000) }
    });
  });
  vm.runInContext(`saveVisits(${JSON.stringify(visits)})`, ctx);
  return visits;
}

const call = (ctx, expr) => vm.runInContext(expr, ctx);
const audited = (ctx, a) => ctx._audits.filter((x) => x.a === a);

/* An injected file round-trip: write to a fake disk, read the same bytes back. */
function goodIO(ctx) {
  ctx.__disk = {};
  return `{ writeFile: function (n, j) { __disk[n] = j; return Promise.resolve(true); },
            readBack: function (n) { return Promise.resolve(JSON.parse(__disk[n])); } }`;
}


/* ═══ SELECTION — what may and may not be archived ═══ */

test("only completed visits past the retention floor are eligible", () => {
  const ctx = sandbox();
  clinic(ctx, [
    { id: "old1", pid: "p1", date: iso(365 * 5) },
    { id: "old2", pid: "p1", date: iso(365 * 4) },
    { id: "new1", pid: "p1", date: iso(30) },
    { id: "wip", pid: "p2", date: iso(365 * 5), status: "in_progress" },
    { id: "o3", pid: "p2", date: iso(365 * 6) },
    { id: "n2", pid: "p2", date: iso(10) }
  ]);
  const c = call(ctx, "archiveCandidates({ years: 3 })");
  const ids = c.eligible.map((v) => v.id).sort().join(",");
  assert.strictEqual(ids, "o3,old1,old2", "got: " + ids);
});

test("an in-progress visit is never archived, however old", () => {
  const ctx = sandbox();
  clinic(ctx, [
    { id: "wip", pid: "p1", date: iso(365 * 9), status: "in_progress" },
    { id: "keep", pid: "p1", date: iso(1) }
  ]);
  const c = call(ctx, "archiveCandidates({ years: 1 })");
  assert.strictEqual(c.eligible.length, 0);
  assert.ok(c.held.some((h) => h.id === "wip" && /still in progress/.test(h.why)));
});

test("a patient's most recent visit stays, however old", () => {
  /* It is the clinical baseline the next consultation is compared against.
     Archiving it would leave the chart with nothing to compare to. */
  const ctx = sandbox();
  clinic(ctx, [
    { id: "a", pid: "p1", date: iso(365 * 9) },  /* older */
    { id: "b", pid: "p1", date: iso(365 * 8) }   /* newest for p1, still ancient */
  ]);
  const c = call(ctx, "archiveCandidates({ years: 1 })");
  assert.strictEqual(c.eligible.map((v) => v.id).join(","), "a");
  assert.ok(c.held.some((h) => h.id === "b" && /most recent/.test(h.why)),
    "the NEWEST visit is the baseline, however old it is: " + JSON.stringify(c.held));
});

test("every held visit says WHY it was held", () => {
  const ctx = sandbox();
  clinic(ctx, [
    { id: "a", pid: "p1", date: iso(365 * 9) },
    { id: "b", pid: "p1", date: iso(10) },
    { id: "c", pid: "p2", date: "", status: "completed" }
  ]);
  const c = call(ctx, "archiveCandidates({ years: 3 })");
  for (const h of c.held) assert.ok(h.why && h.why.length > 5, h.id + " held with no reason");
  assert.ok(c.held.some((h) => /no usable date/.test(h.why)));
});

test("the retention floor cannot be set below a year", () => {
  /* Retention periods are a legal and clinical matter, not an engineering
     one, and in some jurisdictions disposal is forbidden outright. */
  const ctx = sandbox();
  assert.strictEqual(call(ctx, "archiveSetYears(0)"), false);
  assert.strictEqual(call(ctx, 'archiveSetYears("nonsense")'), false);
  assert.strictEqual(call(ctx, "archiveSetYears(7)"), true);
  assert.strictEqual(call(ctx, "archiveState().years"), 7);
  assert.strictEqual(audited(ctx, "archive_policy_changed").length, 1);
});


/* ═══ THE ORDER OF OPERATIONS — the whole design ═══ */

test("a verified archive prunes; the records become stubs", async () => {
  const ctx = sandbox();
  clinic(ctx, [
    { id: "old", pid: "p1", date: iso(365 * 5), dx: "Anterior uveitis", urgent: true },
    { id: "new", pid: "p1", date: iso(5) }
  ]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  assert.strictEqual(r.ok, true, r.reason);
  assert.strictEqual(r.archived, 1);

  const visits = call(ctx, "loadVisits()");
  const stub = visits.find((v) => v.id === "old");
  assert.strictEqual(stub.archived, true);
  assert.strictEqual(stub.archive_id, r.archive_id);
  assert.ok(!stub.data, "the payload must actually be gone, or nothing was freed");
});

test("a FAILED verification prunes nothing at all", async () => {
  /* The single most important test in the file. */
  const ctx = sandbox();
  clinic(ctx, [
    { id: "old", pid: "p1", date: iso(365 * 5) },
    { id: "new", pid: "p1", date: iso(5) }
  ]);
  const before = JSON.stringify(call(ctx, "loadVisits()"));
  const r = await call(ctx,
    `archiveRun({ years: 3,
       writeFile: function () { return Promise.resolve(true); },
       readBack: function () { return Promise.resolve({ __entopic_archive: "entopic-archive-v1", visits: [] }); } })`);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /Nothing was removed/);
  assert.strictEqual(JSON.stringify(call(ctx, "loadVisits()")), before,
    "a record was removed despite the archive failing verification");
  assert.strictEqual(audited(ctx, "archive_aborted").length, 1);
});

test("a corrupted read-back prunes nothing", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const before = JSON.stringify(call(ctx, "loadVisits()"));
  const r = await call(ctx,
    `archiveRun({ years: 3,
       writeFile: function () { return Promise.resolve(true); },
       readBack: function () { return Promise.resolve(null); } })`);
  assert.strictEqual(r.ok, false);
  assert.strictEqual(JSON.stringify(call(ctx, "loadVisits()")), before);
});

test("an archive whose CONTENT differs prunes nothing", () => {
  /* A file that is merely the right length is not a verified archive. */
  const ctx = sandbox();
  const expected = { __entopic_archive: "entopic-archive-v1",
    visits: [{ id: "a", data: { x: 1 } }, { id: "b", data: { x: 2 } }] };
  const tampered = { __entopic_archive: "entopic-archive-v1",
    visits: [{ id: "a", data: { x: 1 } }, { id: "b", data: { x: 999 } }] };
  ctx.__e = expected; ctx.__t = tampered;
  const v = call(ctx, "archiveVerify(__e, __t)");
  assert.strictEqual(v.ok, false);
  assert.match(v.reason, /does not match what was written/);
});

test("a write failure prunes nothing", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const before = JSON.stringify(call(ctx, "loadVisits()"));
  const r = await call(ctx,
    `archiveRun({ years: 3, writeFile: function () { return Promise.reject(new Error("disk full")); } })`);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /before anything was removed/);
  assert.strictEqual(JSON.stringify(call(ctx, "loadVisits()")), before);
});

test("archiving is refused while a store is damaged", async () => {
  /* You cannot safely prune what you cannot read. */
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  ctx.localStorage.setItem("entopic_visits", '[{"id":"x"');
  call(ctx, "STORE_CORRUPT = {}; loadVisits();");
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /damaged/);
});

test("archiving is refused while the vault is locked", async () => {
  const ctx = sandbox({ vaultEnabled: () => true, vaultUnlocked: () => false });
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /vault is locked/);
});

test("nothing eligible is a success, not an error", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "new", pid: "p1", date: iso(5) }]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.archived, 0);
});


/* ═══ THE CHART MUST NOT GROW A SILENT HOLE ═══ */

test("a stub keeps the date, the type and the leading impression", () => {
  /* A chart with a three-year hole reads as continuous care where there was
     none. That is a clinically misleading document. */
  const ctx = sandbox();
  const v = { id: "x", patient_id: "p1", date: "2021-03-01T09:00:00Z", status: "completed",
    visit_type: "follow_up", authored_by: "Dr A",
    data: { final_dx: "Anterior uveitis", alerts: [{ m: "urgent thing", l: "urgent" }],
            engine_provenance: { kb_version: "1.0.0" } } };
  ctx.__v = v;
  const stub = call(ctx, 'archiveStubOf(__v, "arc_1")');
  assert.strictEqual(stub.date, v.date);
  assert.strictEqual(stub.visit_type, "follow_up");
  assert.strictEqual(stub.authored_by, "Dr A");
  assert.strictEqual(stub.summary.leading_impression, "Anterior uveitis");
  assert.strictEqual(stub.summary.had_urgent_alert, true,
    "a reader must be able to see that this visit raised a red flag");
  assert.strictEqual(stub.archive_id, "arc_1");
  assert.ok(!stub.data, "but not the payload — that is the point");
});

test("a stub is far smaller than the record it replaces", () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const full = call(ctx, 'loadVisits().find(function(v){return v.id==="old";})');
  ctx.__v = full;
  const stub = call(ctx, 'archiveStubOf(__v, "a")');
  assert.ok(JSON.stringify(stub).length * 4 < JSON.stringify(full).length,
    "the stub must actually buy headroom");
});

test("a stub is never archived again", () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "a", pid: "p1", date: iso(365 * 5) }, { id: "b", pid: "p1", date: iso(365 * 4) },
               { id: "c", pid: "p1", date: iso(5) }]);
  call(ctx, 'saveVisits(loadVisits().map(function (v) {' +
    ' return v.id === "a" ? archiveStubOf(v, "arc_old") : v; }));');
  const c = call(ctx, "archiveCandidates({ years: 3 })");
  assert.strictEqual(c.eligible.map((v) => v.id).join(","), "b");
});


/* ═══ REVERSIBLE ═══ */

test("an archive restores the full records over their stubs", async () => {
  const ctx = sandbox();
  clinic(ctx, [
    { id: "old", pid: "p1", date: iso(365 * 5), dx: "Keratoconus" },
    { id: "new", pid: "p1", date: iso(5) }
  ]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(call(ctx, 'loadVisits().find(function(v){return v.id==="old";}).archived'), true);

  const payload = JSON.parse(ctx.__disk[r.file]);
  ctx.__p = payload;
  const res = call(ctx, "archiveRestore(__p)");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.restored, 1);
  const back = call(ctx, 'loadVisits().find(function(v){return v.id==="old";})');
  assert.ok(!back.archived, "the stub must be replaced by the real record");
  assert.strictEqual(back.data.final_dx, "Keratoconus");
});

test("restoring twice is harmless", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  ctx.__p = JSON.parse(ctx.__disk[r.file]);
  call(ctx, "archiveRestore(__p)");
  const second = call(ctx, "archiveRestore(__p)");
  assert.strictEqual(second.restored, 0);
  assert.strictEqual(call(ctx, "loadVisits().length"), 2, "no duplicate was created");
});

test("a restore never overwrites a LIVE record with an archived copy", () => {
  /* The live record is by definition the more recent truth. */
  const ctx = sandbox();
  clinic(ctx, [{ id: "a", pid: "p1", date: iso(10), dx: "Current" }]);
  ctx.__p = { __entopic_archive: "entopic-archive-v1", archive_id: "arc_x",
    visits: [{ id: "a", patient_id: "p1", date: iso(10), status: "completed",
               data: { final_dx: "Stale from the archive" } }] };
  const res = call(ctx, "archiveRestore(__p)");
  assert.strictEqual(res.restored, 0);
  assert.strictEqual(call(ctx, "loadVisits()[0].data.final_dx"), "Current");
});

test("a file that is not an Entopic archive is refused", () => {
  const ctx = sandbox();
  ctx.__p = { some: "other file" };
  const res = call(ctx, "archiveRestore(__p)");
  assert.strictEqual(res.ok, false);
  assert.match(res.reason, /not an Entopic archive/);
});


/* ═══ ACCOUNTABILITY AND WIRING ═══ */

test("archiving is audited, and says nothing was destroyed", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  const a = audited(ctx, "records_archived");
  assert.strictEqual(a.length, 1);
  assert.match(a[0].d, /Nothing was destroyed/);
  assert.match(a[0].d, /restores them/);
});

test("the archive index records where each file went", async () => {
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const r = await call(ctx, `archiveRun(Object.assign({ years: 3 }, ${goodIO(ctx)}))`);
  const list = call(ctx, "archiveList()");
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].id, r.archive_id);
  assert.strictEqual(list[0].count, 1);
  assert.ok(list[0].file);
});

test("the projection tells the clinician what they would gain, before committing", () => {
  const ctx = sandbox();
  const many = [];
  for (let i = 0; i < 20; i++) many.push({ id: "v" + i, pid: "p1", date: iso(365 * 5 + i) });
  many.push({ id: "recent", pid: "p1", date: iso(5) });
  clinic(ctx, many);
  const p = call(ctx, "archiveProjection({ years: 3 })");
  assert.ok(p.eligible >= 19);
  assert.ok(p.freed_bytes > 0);
  assert.ok(p.after_bytes < p.current_bytes);
});

test("the archive payload is self-describing", () => {
  /* A file found in five years must be understandable without this codebase. */
  const ctx = sandbox();
  clinic(ctx, [{ id: "old", pid: "p1", date: iso(365 * 5) }, { id: "new", pid: "p1", date: iso(5) }]);
  const c = call(ctx, "archiveCandidates({ years: 3 })");
  ctx.__c = c;
  const b = call(ctx, "archiveBuild(__c, {})");
  assert.strictEqual(b.__entopic_archive, "entopic-archive-v1");
  assert.ok(b.note && b.note.length > 60, "the file must explain itself in prose");
  assert.ok(b.version && b.created && typeof b.count === "number");
});

test("archives is a declared, backed-up store", () => {
  const D = require("../js/data-classification.js");
  assert.ok(D.DATA_STORES.archives);
  assert.strictEqual(D.DATA_STORES.archives.backup, true,
    "a restored device that did not know an archive existed would show stubs " +
    "pointing at a file nobody knew to look for");
});

test("loaded after the backup layer it depends on", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/storage-archive.js") > order.indexOf("js/storage-backup.js"));
});

test("there is no code path from a candidate straight to a prune", () => {
  /* The safety property is structural: archiveRun cannot reach archivePrune
     without archiveVerify returning ok first. */
  const src = read("js/storage-archive.js");
  const runBody = src.slice(src.indexOf("function archiveRun"), src.indexOf("function archiveRestore"));
  const verifyAt = runBody.indexOf("archiveVerify(");
  const pruneAt = runBody.indexOf("archivePrune(");
  assert.ok(verifyAt > 0 && pruneAt > 0);
  assert.ok(verifyAt < pruneAt, "verification must precede the prune");
  assert.ok(/if \(!v\.ok\)[\s\S]{0,400}return/.test(runBody),
    "a failed verification must return before reaching the prune");
});
