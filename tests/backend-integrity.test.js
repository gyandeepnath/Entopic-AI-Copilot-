/* ═══════════════════════════════════════════════════════════════ */
/* BACKEND INTEGRITY  (Phase 5 backend audit)                       */
/*                                                                  */
/* Four defects, all found by measurement rather than by reading:    */
/*                                                                  */
/*  BE-1  doSave() announced "visit:saved" whatever the storage      */
/*        layer said. Corrupt the visit store, keep typing, save —   */
/*        the write is correctly REFUSED and the app still flashed   */
/*        the saved indicator. The records survived; the clinician's */
/*        belief that their work was captured did not deserve to.    */
/*                                                                  */
/*  BE-2  The delete queue lived only in memory. Close the tab       */
/*        between deleting a patient and the 800 ms drain and the    */
/*        delete never reached the server, so the next pull from     */
/*        another device brought the patient back.                   */
/*                                                                  */
/*  BE-3  A successful tombstone push cleared every pending delete   */
/*        of that kind — including ones enqueued while the request   */
/*        was in flight, which the server never heard about.         */
/*                                                                  */
/*  BE-4  No migration mechanism existed at all. Nothing recorded    */
/*        which shape a device's data was in.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* A sandbox with a working localStorage and the real storage layer. */
function sandbox(extra) {
  const mem = {};
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; },
    clear: () => { for (const k of Object.keys(mem)) delete mem[k]; }
  };
  const events = [];
  const ctx = Object.assign({
    localStorage: ls, _mem: mem, _events: events,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise,
    parseInt, parseFloat, isNaN, isFinite, Boolean, Error,
    setTimeout: (fn) => { events.push(["timer"]); return 0; },
    clearTimeout: () => {},
    module: { exports: {} },
    evEmit: (name, payload) => { events.push([name, payload]); },
    lsSet: (k, v) => { try { ls.setItem(k, v); return true; } catch (e) { return false; } },
    alert: () => {}
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "data-classification.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  vm.runInContext(read("js/storage-migrations.js"), ctx, { filename: "storage-migrations.js" });
  return ctx;
}

const emitted = (ctx, name) => ctx._events.filter((e) => e[0] === name);


/* ═══ BE-1 · A SAVE THAT DID NOT HAPPEN IS NOT ANNOUNCED ═══ */

function examSandbox() {
  const ctx = sandbox();
  ctx.CP = "p1"; ctx.CV = "v1";
  ctx.P = { id: "p1", first_name: "A", last_name: "B" };
  ctx.V = { id: "v1", cc: "initial" };
  vm.runInContext('savePatients([{ id: "p1", first_name: "A", last_name: "B" }]);' +
                  'saveVisits([{ id: "v1", patient_id: "p1", data: { id: "v1" }, status: "in_progress" }]);', ctx);
  return ctx;
}

test("a normal save announces visit:saved and reports ok", () => {
  const ctx = examSandbox();
  const res = vm.runInContext("doSave()", ctx);
  assert.strictEqual(res.ok, true, res.reason);
  assert.strictEqual(emitted(ctx, "visit:saved").length, 1);
  assert.strictEqual(emitted(ctx, "visit:save-failed").length, 0);
});

test("a refused write is reported as a failure, never as a save", () => {
  const ctx = examSandbox();
  /* Exactly what a truncated write leaves behind. */
  ctx.localStorage.setItem("entopic_visits", '[{"id":"v1"');
  vm.runInContext("STORE_CORRUPT = {}; loadVisits();", ctx);
  assert.strictEqual(vm.runInContext('storageIsCorrupt("visits")', ctx), true,
    "the corrupt-store guard must have engaged — the rest of this test depends on it");

  ctx._events.length = 0;
  ctx.V.cc = "typed after the store was damaged";
  const res = vm.runInContext("doSave()", ctx);

  assert.strictEqual(res.ok, false);
  assert.strictEqual(emitted(ctx, "visit:saved").length, 0,
    "announcing a save here is the whole defect");
  assert.strictEqual(emitted(ctx, "visit:save-failed").length, 1);
  assert.match(emitted(ctx, "visit:save-failed")[0][1].reason, /damaged/);
});

test("a visit that is no longer in the store cannot report a save", () => {
  /* Happens when the store was unreadable and handed back the empty fallback,
     or another device's delete removed the record while it was open here. The
     loop found nothing and the array went back untouched — silently. */
  const ctx = examSandbox();
  vm.runInContext("saveVisits([]);", ctx);
  ctx._events.length = 0;
  const res = vm.runInContext("doSave()", ctx);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.visit_found, false);
  assert.match(res.reason, /no longer in the record store/);
  assert.strictEqual(emitted(ctx, "visit:saved").length, 0);
});

test("a visit whose data did not save is NOT marked complete", () => {
  /* A record asserting the consultation is finished, missing everything typed
     after writes started failing, with an audit entry claiming completion, is
     the worst artefact this system can produce. */
  const ctx = examSandbox();
  ctx.localStorage.setItem("entopic_visits", '[{"id":"v1"');
  vm.runInContext("STORE_CORRUPT = {}; loadVisits();", ctx);
  ctx._events.length = 0;

  const res = vm.runInContext("completeVisit()", ctx);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(emitted(ctx, "visit:complete-failed").length, 1);
  /* And the visit is genuinely still in progress, not half-completed. */
  vm.runInContext('storageAcceptCorruptLoss("visits");', ctx);
});

test("saveStore reports a boolean on every path, including the vault path", () => {
  /* It used to return undefined when the vault was on, which is why every
     caller in the codebase is written `!== false` rather than `if (...)`. */
  const ctx = sandbox({
    vaultUnlocked: () => true,
    vaultCacheSet: () => {}, vaultCacheGet: () => undefined,
    vaultIsEnvelope: () => false
  });
  ctx.VAULT = { on: true };
  assert.strictEqual(vm.runInContext('saveStore("visits", [])', ctx), true);
  assert.strictEqual(vm.runInContext('savePatients([])', ctx), true);
  assert.strictEqual(vm.runInContext('saveVisits([])', ctx), true);
  assert.strictEqual(vm.runInContext('saveUsers([])', ctx), true);
});

test("the banner module surfaces the failure and clears it only on a real save", () => {
  const src = read("js/ui-storage-banners.js");
  assert.ok(src.indexOf('evOn("visit:save-failed"') > 0, "the failure must reach the user");
  assert.ok(src.indexOf('evOn("visit:complete-failed"') > 0);
  assert.ok(src.indexOf('removeBanner("visitSaveFailBanner")') > 0,
    "and must clear when writes work again, not on a timer");
});


/* ═══ BE-2 / BE-3 · A DELETE THAT SURVIVES A CRASH ═══ */

function syncSandbox() {
  const ctx = sandbox();
  ctx.CLOUD_CONFIG = { url: "https://x.test", anonKey: "k" };
  ctx.CLOUD_MAX_RETRIES = 3;
  ctx.fetch = () => Promise.reject(new Error("offline in tests"));
  ctx.WebSocket = undefined;
  ctx.window = {};
  vm.runInContext(read("js/cloud-sync.js"), ctx, { filename: "cloud-sync.js" });
  vm.runInContext(read("js/cloud-replication.js"), ctx, { filename: "cloud-replication.js" });
  vm.runInContext('CLOUD.session = { access_token: "t", refresh_token: "r" };' +
                  'CLOUD.clinicId = "c1";' +
                  'cloudEnabled = function () { return true; };' +
                  'cloudSignedIn = function () { return true; };', ctx);
  return ctx;
}

test("a queued delete is written down, not just held in memory", () => {
  const ctx = syncSandbox();
  vm.runInContext('cloudEnqueueDelete("patients", "p-gone");', ctx);
  const stored = JSON.parse(ctx.localStorage.getItem("entopic_cloud_tombstones"));
  assert.strictEqual(stored.length, 1);
  assert.strictEqual(stored[0].id, "p-gone");
  assert.ok(stored[0].at, "a tombstone records when it was raised");
});

test("a delete queued in a previous session is picked up at start-up", () => {
  const ctx = syncSandbox();
  ctx.localStorage.setItem("entopic_cloud_tombstones",
    JSON.stringify([{ kind: "patients", id: "p-from-last-session", at: "2026-08-01T00:00:00Z" }]));
  vm.runInContext("cloudTombstonesRestore();", ctx);
  assert.strictEqual(ctx.CLOUD.tombstones.length, 1);
  assert.strictEqual(ctx.CLOUD.tombstones[0].id, "p-from-last-session");
});

test("restoring merges rather than replaces — this session's deletes survive", () => {
  const ctx = syncSandbox();
  ctx.localStorage.setItem("entopic_cloud_tombstones",
    JSON.stringify([{ kind: "patients", id: "old", at: "2026-08-01T00:00:00Z" }]));
  vm.runInContext('CLOUD.tombstones = [{ kind: "patients", id: "new", at: "2026-08-02T00:00:00Z" }];' +
                  'cloudTombstonesRestore();', ctx);
  const ids = ctx.CLOUD.tombstones.map((t) => t.id).sort();
  assert.strictEqual(ids.join(","), "new,old");   /* .join: sandbox arrays are cross-realm */
});

test("restoring does not duplicate a delete already queued", () => {
  const ctx = syncSandbox();
  ctx.localStorage.setItem("entopic_cloud_tombstones",
    JSON.stringify([{ kind: "patients", id: "same", at: "2026-08-01T00:00:00Z" }]));
  vm.runInContext('CLOUD.tombstones = [{ kind: "patients", id: "same" }];' +
                  'cloudTombstonesRestore(); cloudTombstonesRestore();', ctx);
  assert.strictEqual(ctx.CLOUD.tombstones.length, 1);
});

test("the queue is bounded, and says so when it truncates", () => {
  const ctx = syncSandbox();
  const audits = [];
  ctx.logAudit = (a, d) => audits.push(a);
  vm.runInContext(
    "CLOUD.tombstones = [];" +
    "for (var i = 0; i < CLOUD_TOMBSTONE_MAX + 10; i++) CLOUD.tombstones.push({ kind: 'visits', id: 'v' + i });" +
    "cloudTombstonesPersist();", ctx);
  assert.strictEqual(ctx.CLOUD.tombstones.length, ctx.CLOUD_TOMBSTONE_MAX);
  assert.ok(audits.includes("sync_tombstones_truncated"),
    "dropping a pending delete must never be silent");
  /* The OLDEST go, so the most recent deletes are the ones that survive. */
  assert.strictEqual(ctx.CLOUD.tombstones[ctx.CLOUD.tombstones.length - 1].id,
    "v" + (ctx.CLOUD_TOMBSTONE_MAX + 9));
});

test("a successful push clears only what was sent (BE-3)", () => {
  /* The old code cleared every tombstone of that kind, discarding any delete
     raised while the request was in flight — dropped as though it had
     succeeded. A request takes hundreds of ms; a clinician can delete twice. */
  const ctx = syncSandbox();
  let capturedCb = null;
  vm.runInContext("cloudApi = function (path, opts, cb) { __capture(cb); };", ctx);
  ctx.__capture = (cb) => { capturedCb = cb; };

  vm.runInContext('CLOUD.tombstones = [{ kind: "patients", id: "first" }]; cloudDrainTombstones();', ctx);
  /* A second delete arrives while the first request is still open. */
  vm.runInContext('CLOUD.tombstones.push({ kind: "patients", id: "second" });', ctx);
  capturedCb(null);   /* the first request succeeds */

  const left = ctx.CLOUD.tombstones.map((t) => t.id);
  assert.strictEqual(left.join(","), "second",
    "the in-flight delete must still be queued, not dropped: " + JSON.stringify(left));
});

test("a failed push leaves the queue intact for the next drain", () => {
  const ctx = syncSandbox();
  let cb = null;
  ctx.__capture = (c) => { cb = c; };
  vm.runInContext("cloudApi = function (p, o, c) { __capture(c); };" +
                  'CLOUD.tombstones = [{ kind: "visits", id: "v9" }]; cloudDrainTombstones();', ctx);
  cb(new Error("network down"));
  assert.strictEqual(ctx.CLOUD.tombstones.length, 1, "nothing may be dropped on failure");
});

test("cloud_tombstones is a declared, protected store", () => {
  const D = require("../js/data-classification.js");
  const s = D.DATA_STORES.cloud_tombstones;
  assert.ok(s, "an undeclared store gets no mirror and no corruption checking");
  assert.strictEqual(s.shape, "array");
  assert.strictEqual(s.mirror, true);
  assert.strictEqual(s.backup, false,
    "replaying a stale tombstone out of an old backup could delete a legitimately restored record");
});


/* ═══ BE-4 · MIGRATIONS ═══ */

test("a device with nothing to migrate still records its store version", () => {
  /* A device that has never recorded its shape is indistinguishable from one
     that predates the ledger, and the first real migration would have to guess. */
  const ctx = sandbox();
  const res = vm.runInContext("migrationsRun()", ctx);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.ran.length, 0);
  assert.strictEqual(vm.runInContext("migrationLedger().version", ctx),
    vm.runInContext("STORE_VERSION", ctx));
});

test("a migration runs once, ever", () => {
  const ctx = sandbox();
  vm.runInContext(
    'saveStore("visits", [{ id: "v1", n: 1 }]);' +
    'STORE_MIGRATIONS.push({ id: "t1", why: "test", stores: ["visits"],' +
    '  up: function (d) { d.visits.forEach(function (v) { v.n = (v.n||0) + 1; }); return d; },' +
    '  down: function (d) { d.visits.forEach(function (v) { v.n = v.n - 1; }); return d; } });', ctx);

  assert.strictEqual(vm.runInContext('migrationsRun().ran.join(",")', ctx), "t1");
  assert.strictEqual(vm.runInContext('loadStore("visits", [])[0].n', ctx), 2);

  vm.runInContext("migrationsRun();", ctx);
  vm.runInContext("migrationsRun();", ctx);
  assert.strictEqual(vm.runInContext('loadStore("visits", [])[0].n', ctx), 2,
    "running twice would double-apply the change to real clinical records");
});

test("a failing migration rolls the WHOLE run back", () => {
  /* A half-migrated record store is the worst outcome available. */
  const ctx = sandbox();
  vm.runInContext(
    'saveStore("visits", [{ id: "v1", n: 1 }]);' +
    'saveStore("patients", [{ id: "p1", n: 1 }]);' +
    'STORE_MIGRATIONS.push({ id: "ok1", why: "t", stores: ["visits"],' +
    '  up: function (d) { d.visits[0].n = 99; return d; }, down: null });' +
    'STORE_MIGRATIONS.push({ id: "bad", why: "t", stores: ["patients"],' +
    '  up: function () { throw new Error("boom"); }, down: null });', ctx);

  const res = vm.runInContext("migrationsRun()", ctx);
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.rolled_back, true);
  assert.match(res.reason, /bad/);
  assert.strictEqual(vm.runInContext('loadStore("visits", [])[0].n', ctx), 1,
    "the successful first step must be undone too — the run is the unit, not the step");
});

test("a snapshot is taken before anything is touched, and refusing to write one aborts", () => {
  const ctx = sandbox();
  vm.runInContext('saveStore("visits", [{ id: "v1", n: 1 }]);' +
    'STORE_MIGRATIONS.push({ id: "s1", why: "t", stores: ["visits"],' +
    '  up: function (d) { d.visits[0].n = 5; return d; }, down: null });', ctx);
  vm.runInContext("migrationsRun();", ctx);
  const snaps = vm.runInContext("migrationSnapshots()", ctx);
  assert.ok(snaps.length >= 1, "there must be something to restore from");
  const snap = JSON.parse(ctx.localStorage.getItem(snaps[0].key));
  assert.strictEqual(snap.stores.visits[0].n, 1, "the snapshot holds the PRE-migration data");
});

test("migrations are held — not guessed — when a store is damaged", () => {
  const ctx = sandbox();
  ctx.localStorage.setItem("entopic_visits", '[{"id":"v1"');
  vm.runInContext('loadVisits(); STORE_MIGRATIONS.push({ id: "x", why: "t", stores: ["visits"],' +
    '  up: function (d) { return d; }, down: null });', ctx);
  const res = vm.runInContext("migrationsRun()", ctx);
  assert.strictEqual(res.ok, false);
  assert.match(res.reason, /damaged/);
  assert.strictEqual(vm.runInContext("migrationLedger().applied.length", ctx), 0,
    "migrating a store you cannot read means writing the empty fallback over real data");
});

test("migrations are held while the vault is locked", () => {
  const ctx = sandbox({ vaultEnabled: () => true, vaultUnlocked: () => false });
  vm.runInContext('STORE_MIGRATIONS.push({ id: "y", why: "t", stores: ["visits"],' +
    '  up: function (d) { return d; }, down: null });', ctx);
  const res = vm.runInContext("migrationsRun()", ctx);
  assert.strictEqual(res.ok, false);
  assert.match(res.reason, /vault is locked/);
});

test("a reversible migration can be undone; a one-way one says so instead", () => {
  const ctx = sandbox();
  vm.runInContext('saveStore("visits", [{ id: "v1", n: 1 }]);' +
    'STORE_MIGRATIONS.push({ id: "rev", why: "t", stores: ["visits"],' +
    '  up: function (d) { d.visits[0].n = 2; return d; },' +
    '  down: function (d) { d.visits[0].n = 1; return d; } });' +
    'migrationsRun();', ctx);
  assert.strictEqual(vm.runInContext("migrationsRollback().ok", ctx), true);
  assert.strictEqual(vm.runInContext('loadStore("visits", [])[0].n', ctx), 1);
  assert.strictEqual(vm.runInContext("migrationLedger().applied.length", ctx), 0,
    "an undone migration must be able to run again");

  const ctx2 = sandbox();
  vm.runInContext('saveStore("visits", []);' +
    'STORE_MIGRATIONS.push({ id: "oneway", why: "t", down_why: "the dropped field cannot be recovered",' +
    '  stores: ["visits"], up: function (d) { return d; }, down: null });' +
    'migrationsRun();', ctx2);
  const r2 = vm.runInContext("migrationsRollback()", ctx2);
  assert.strictEqual(r2.ok, false);
  assert.match(r2.reason, /one-way/,
    "a one-way step must be named, not half-undone");
});

test("every declared migration is well formed", () => {
  /* Guards the file itself as migrations accumulate over ten years. */
  const M = require("../js/storage-migrations.js");
  const seen = new Set();
  for (const m of M.STORE_MIGRATIONS) {
    assert.ok(m.id && /^\d{4}_[a-z0-9_]+$/.test(m.id), "id must be NNNN_snake_case: " + m.id);
    assert.ok(!seen.has(m.id), "duplicate migration id " + m.id);
    seen.add(m.id);
    assert.ok(m.why && m.why.length > 20, m.id + ": `why` must say what was wrong and for whom");
    assert.ok(Array.isArray(m.stores) && m.stores.length,
      m.id + ": `stores` drives the snapshot; an under-declared list is a correctness bug");
    assert.strictEqual(typeof m.up, "function");
    assert.ok(m.down === null || typeof m.down === "function", m.id + ": down must be a function or null");
    if (m.down === null) {
      assert.ok(m.down_why, m.id + ": a one-way migration must say why it cannot be reversed");
    }
  }
});

test("the runner is loaded before the app boots and is actually called", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/storage-migrations.js") > order.indexOf("js/storage.js"));
  assert.ok(order.indexOf("js/storage-migrations.js") < order.indexOf("js/app.js"));
  assert.ok(read("js/app.js").indexOf("migrationsRun()") > 0,
    "a migration runner nothing calls is not a migration runner");
});


/* ═══ BE-5 · THE SILENT PAGINATION CEILING ═══ */

/* The old pull asked for every row with no limit and no cursor. PostgREST caps
   the response at the project's db-max-rows; past that the server returns the
   first page and the client never learns there is more. A clinic that grows
   past the cap stops receiving its own records — no error, no banner, two
   devices quietly diverging. */

function pullSandbox(rowsByKind) {
  const ctx = sandbox();
  ctx.CLOUD_CONFIG = { url: "https://x.test", anonKey: "k" };
  ctx.CLOUD_MAX_RETRIES = 3;
  ctx.fetch = () => Promise.reject(new Error("no network in tests"));
  ctx.WebSocket = undefined;
  ctx._requests = [];
  vm.runInContext(read("js/cloud-sync.js"), ctx, { filename: "cloud-sync.js" });
  vm.runInContext(read("js/cloud-replication.js"), ctx, { filename: "cloud-replication.js" });
  vm.runInContext('CLOUD.session = { access_token: "t" }; CLOUD.clinicId = "c1";' +
                  'cloudSignedIn = function () { return true; };' +
                  'cloudEnabled = function () { return true; };' +
                  'cloudDecryptRows = function (rows, cb) { cb(rows); };' +
                  'cloudRerender = function () {};', ctx);
  /* A fake PostgREST that honours order/limit/gte exactly as the server does. */
  ctx.__serve = (path) => {
    ctx._requests.push(path);
    const kind = path.indexOf("/visits") >= 0 ? "visits" : "patients";
    const all = (rowsByKind[kind] || []).slice()
      .sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
    const lim = parseInt((path.match(/limit=(\d+)/) || [])[1] || "1000000", 10);
    const gteM = path.match(/updated_at=gte\.([^&]+)/);
    const gte = gteM ? decodeURIComponent(gteM[1]) : null;
    const filtered = gte ? all.filter((r) => String(r.updated_at) >= gte) : all;
    return filtered.slice(0, lim);
  };
  vm.runInContext("cloudApi = function (path, opts, cb) { cb(null, __serve(path)); };", ctx);
  return ctx;
}

function rows(kind, n, tsFn) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: kind + i, data: { id: kind + i },
               updated_at: tsFn ? tsFn(i) : new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0) + i * 1000).toISOString(),
               deleted: false });
  }
  return out;
}

test("a pull asks for a bounded page, in a defined order", () => {
  const ctx = pullSandbox({ patients: rows("p", 3), visits: [] });
  vm.runInContext("cloudPull();", ctx);
  const req = ctx._requests.find((r) => r.indexOf("/patients") >= 0);
  assert.match(req, /limit=\d+/, "an unbounded request inherits whatever the server's cap is");
  assert.match(req, /order=updated_at\.asc/, "keyset paging needs a defined order");
});

test("every record is fetched when there are more than one page", () => {
  /* 1,250 visits at a 500-row page: the old code would have received whatever
     one page the server chose and silently stopped. */
  const ctx = pullSandbox({ patients: [], visits: rows("v", 1250) });
  vm.runInContext("cloudPull();", ctx);
  const stored = JSON.parse(ctx.localStorage.getItem("entopic_visits"));
  assert.strictEqual(stored.length, 1250,
    "got " + stored.length + " of 1250 — the rest are invisible to this device");
});

test("no record is fetched twice, and none is skipped at a page boundary", () => {
  const ctx = pullSandbox({ patients: [], visits: rows("v", 1001) });
  vm.runInContext("cloudPull();", ctx);
  const stored = JSON.parse(ctx.localStorage.getItem("entopic_visits"));
  assert.strictEqual(new Set(stored.map((v) => v.id)).size, 1001);
});

test("records sharing a timestamp across a page boundary are not lost", () => {
  /* The reason the cursor is `gte` with id de-duplication rather than `gt`:
     two rows can share a millisecond, and `gt` would drop the rest of the tie
     when a page boundary landed inside it. */
  const ctx = pullSandbox({
    patients: [],
    visits: rows("v", 700, (i) => new Date(Date.UTC(2026, 0, 1) + Math.floor(i / 100) * 1000).toISOString())
  });
  vm.runInContext("cloudPull();", ctx);
  const stored = JSON.parse(ctx.localStorage.getItem("entopic_visits"));
  assert.strictEqual(stored.length, 700, "a tie spanning a page boundary lost records");
});

test("a page of identical timestamps stops the loop and says so", () => {
  /* Degenerate but reachable: a bulk import stamps 500+ rows the same
     millisecond. The cursor cannot advance without skipping them, so looping
     forever or truncating silently are both wrong answers. */
  const ctx = pullSandbox({
    patients: [], visits: rows("v", 600, () => "2026-01-01T00:00:00.000Z")
  });
  vm.runInContext("cloudPull();", ctx);
  assert.ok(ctx._requests.length < 50, "must not loop: made " + ctx._requests.length + " requests");
  assert.match(String(ctx.CLOUD.lastError), /share one timestamp/,
    "an incomplete sync must never look like a complete one");
});

test("a mid-pagination failure keeps the pages already fetched", () => {
  /* A partial pull is not a failed pull. Discarding fetched rows would let an
     unreliable network keep a device permanently behind. */
  const ctx = pullSandbox({ patients: [], visits: rows("v", 1200) });
  vm.runInContext(
    "var __n = 0;" +
    "cloudApi = function (path, opts, cb) { __n++; if (__n > 2) return cb(new Error('network')); cb(null, __serve(path)); };" +
    "cloudPull();", ctx);
  const stored = JSON.parse(ctx.localStorage.getItem("entopic_visits") || "[]");
  assert.ok(stored.length >= 500, "kept " + stored.length + " — fetched rows must not be thrown away");
  assert.ok(stored.length < 1200, "and the pull genuinely did not finish");
});
