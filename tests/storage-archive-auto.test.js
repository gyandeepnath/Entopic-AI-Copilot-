/* ═══════════════════════════════════════════════════════════════ */
/* AUTOMATIC ARCHIVING                                              */
/*                                                                  */
/* The founder asked for archiving to happen automatically. What    */
/* was built is automatic DETECTION, stopping one click short of    */
/* automatic REMOVAL — because a browser cannot put the archive     */
/* file anywhere, and removing records having written their only    */
/* other copy to a folder nobody chose is not archiving.            */
/*                                                                  */
/* So the two properties worth testing are opposites:               */
/*                                                                  */
/*   • It must fire when a clinic is genuinely running out of room, */
/*     without anyone remembering to look.                          */
/*   • It must never, under any circumstance, remove a record by    */
/*     itself.                                                      */
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
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();

function sandbox(extra) {
  const mem = {};
  const audits = [], events = [];
  const ctx = Object.assign({
    localStorage: {
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }
    },
    _mem: mem, _audits: audits, _events: events,
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Map, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {},
    module: { exports: {} },
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { mem[k] = String(v); return true; }, alert: () => {}
  }, extra || {});
  vm.createContext(ctx);
  for (const f of ["js/data-classification.js", "js/storage.js", "js/visit-store.js",
                   "js/storage-archive.js", "js/storage-archive-auto.js"]) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", ctx);
  ctx.run = (e) => vm.runInContext(e, ctx);
  return ctx;
}

/* A clinic of `n` visits, `oldCount` of them beyond the retention floor.
   `pad` inflates each record so the storage percentage can be driven. */
function clinic(c, n, oldCount, pad) {
  const vs = [];
  for (let i = 0; i < n; i++) {
    const old = i < oldCount;
    vs.push({
      id: "v" + i, patient_id: "p" + Math.floor(i / 4),
      date: old ? ago(2000 + i) : ago(i % 300),
      status: "completed",
      data: { id: "v" + i, final_dx: "Dry eye", alerts: [], filler: "x".repeat(pad || 50) }
    });
  }
  c.run(`saveVisits(${JSON.stringify(vs)})`);
  return vs;
}


/* ═══ 1. IT MUST NEVER REMOVE A RECORD BY ITSELF ═══ */

test("the automatic path never calls archiveRun", () => {
  /* THE ONE THAT MATTERS. Everything else here is about being helpful; this
     is about a clinic not losing records to a background timer. */
  const src = read("js/storage-archive-auto.js");
  assert.ok(!/archiveRun\s*\(/.test(src),
    "storage-archive-auto.js calls archiveRun — automatic detection has become automatic " +
    "REMOVAL, and the archive file it depends on lands wherever the browser chooses");
  assert.ok(!/dlSaveAs|downloadBackupFile/.test(src),
    "the automatic path must not write a file by itself");
});

test("even when it FIRES, the watcher changes no record and removes no key", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);            /* deliberately over the threshold */
  c.run("visitStoreSplitNow()");
  assert.strictEqual(c.run("archiveAutoCheck().prompt"), true,
    "setup: this test is worthless unless the watcher actually fires");

  const before = JSON.parse(JSON.stringify(c._mem));
  c.run("archiveAutoStart({ delayMs: 0 });");
  const after = JSON.parse(JSON.stringify(c._mem));

  const changed = Object.keys(Object.assign({}, before, after))
    .filter((k) => before[k] !== after[k]);
  assert.deepStrictEqual(changed, ["entopic_archive_auto"],
    "the watcher altered storage beyond its own bookkeeping: " + changed.join(", "));

  assert.strictEqual(c.run("loadVisits().length"), 40,
    "visits were removed by a background task");
  assert.strictEqual(c.run("loadVisits().filter(function (v) { return v.archived; }).length"), 0,
    "a visit was stubbed by a background task — its examination content is gone and the " +
    "archive file it went to was never written anywhere anyone chose");
});


/* ═══ 2. IT MUST FIRE WHEN A CLINIC IS ACTUALLY IN TROUBLE ═══ */

test("a clinic near the storage ceiling with archivable records is prompted", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);            /* big records: pushes past 70% */
  c.run("visitStoreSplitNow()");
  const pct = c.run("storageUsage().pct");
  assert.ok(pct >= 70, "setup: expected a full device, got " + pct + "%");

  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, true, "a nearly-full clinic was not warned: " + r.reason);
  assert.ok(r.eligible > 0, "it must name how many visits could move");
  assert.strictEqual(r.trigger, "storage");
});

test("a clinic with plenty of room is left alone", () => {
  const c = sandbox();
  clinic(c, 10, 5, 50);
  c.run("visitStoreSplitNow()");
  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, false, "a small clinic was nagged");
  assert.ok(/plenty of room/.test(r.reason), r.reason);
});

test("a clinic that is full but has NOTHING archivable is not given a useless alarm", () => {
  /* Every record inside the retention floor. Telling this clinic to archive
     would be an alarm with no action behind it — and the next one gets
     ignored too. Only lowering the floor would help, and that is clinical. */
  const c = sandbox();
  clinic(c, 40, 0, 60000);
  c.run("visitStoreSplitNow()");
  assert.ok(c.run("storageUsage().pct") >= 70, "setup");

  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, false, "an alarm was raised that the clinician cannot act on");
  assert.strictEqual(r.needs_founder, true,
    "and the case must be marked as needing a human retention decision");
});

test("a clinic with many visits is prompted even below the byte threshold", () => {
  const c = sandbox();
  clinic(c, 1300, 900, 20);            /* many, but small */
  c.run("visitStoreSplitNow()");
  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, true, "a clinic with 1,300 visits was not warned: " + r.reason);
  assert.strictEqual(r.trigger, "count");
});


/* ═══ 3. IT MUST NOT BECOME NOISE ═══ */

test("it does not prompt twice in the same week", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);
  c.run("visitStoreSplitNow()");

  assert.strictEqual(c.run("archiveAutoCheck().prompt"), true, "setup");
  c.run("archiveAutoStart({ delayMs: 0 });");
  assert.strictEqual(c.run("archiveAutoCheck().prompt"), false,
    "the same warning was raised twice — a banner that appears every morning is one a " +
    "clinician learns to dismiss without reading");

  /* But it must come back once the quiet period has passed. */
  const later = new Date(Date.now() + 8 * DAY).toISOString();
  assert.strictEqual(c.run("archiveAutoCheck(" + JSON.stringify(later) + ").prompt"), true,
    "the warning never returned — the condition has not gone away");
});

test("it emits exactly one event when it fires", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);
  c.run("visitStoreSplitNow()");
  c.run("archiveAutoStart({ delayMs: 0 });");
  const due = c._events.filter((e) => e[0] === "archive:due");
  assert.strictEqual(due.length, 1, "expected one archive:due event, got " + due.length);
  assert.ok(due[0][1].eligible > 0, "the event must carry what the banner needs to say");
});


/* ═══ 4. IT MUST STAY SILENT WHEN THE CLINICIAN COULD NOT ACT ═══ */

test("no prompt while a record store is damaged", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);
  c.run("visitStoreSplitNow()");
  c.run('localStorage.setItem("entopic_patients", "{"); loadPatients();');
  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, false,
    "a clinic was told to archive on a device where archiveRun would refuse");
  assert.ok(/damaged/.test(r.reason), r.reason);
});

test("no prompt while the vault is locked", () => {
  const c = sandbox({ vaultEnabled: () => true, vaultUnlocked: () => false,
                      vaultIsProtected: () => false });
  clinic(c, 40, 30, 60000);
  const r = c.run("archiveAutoCheck()");
  assert.strictEqual(r.prompt, false, "prompted while the records were unreadable");
});

test("it can be switched off, and says so in the audit trail", () => {
  const c = sandbox();
  clinic(c, 40, 30, 60000);
  c.run("visitStoreSplitNow()");
  assert.strictEqual(c.run("archiveAutoCheck().prompt"), true, "setup");

  c.run("archiveAutoSetEnabled(false);");
  assert.strictEqual(c.run("archiveAutoCheck().prompt"), false);
  assert.ok(c._audits.some((a) => a.a === "archive_auto_changed"),
    "turning off a storage-exhaustion warning must be recorded");
});

test("it is ON by default", () => {
  /* Opt-out, not opt-in: a clinic that never switches this on is exactly the
     clinic that hits the wall. */
  const c = sandbox();
  assert.strictEqual(c.run("archiveAutoState().enabled"), true);
});
