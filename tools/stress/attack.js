/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS HARNESS                                      */
/*                                                                  */
/*   node tools/stress/attack.js                                   */
/*                                                                  */
/* The test suite asks "does it do what it is supposed to do".      */
/* This asks the opposite question: given everything the seven      */
/* audits taught us about where the seams are, what happens when    */
/* something deliberately hostile arrives there?                    */
/*                                                                  */
/* Rules this file follows:                                         */
/*                                                                  */
/*  1. It attacks the REAL modules. No reimplementations, no mocks  */
/*     of the thing under test — only of the browser around it.     */
/*  2. Every attack states what MUST hold, not what currently does. */
/*     An attack that passes because it asserts the bug is worse    */
/*     than no attack at all.                                       */
/*  3. Crashing is an acceptable outcome for garbage input. SILENT  */
/*     WRONG ANSWERS ARE NOT. A thrown error a clinician sees beats */
/*     a differential computed from a corrupted record.             */
/*  4. Nothing here is clinical knowledge. Every value is either    */
/*     structurally absurd on purpose or drawn from the repo.       */
/*                                                                  */
/* Findings get promoted into tests/ once fixed, so the suite keeps */
/* them fixed. This file stays as the place to break things next.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);

/* ── the scoreboard ─────────────────────────────────────────────── */
let held = 0;
const broke = [];

/* Attacks are QUEUED, not run at definition time, so that an attack may be
   async (archiveRun returns a promise) without the summary racing ahead of
   it — an attack that "passes" because nobody waited for it is worse than
   no attack at all. */
const QUEUE = [];
function G(name) { QUEUE.push({ header: name }); }

function attack(name, fn) {
  if (ONLY && name.indexOf(ONLY) < 0) return;
  QUEUE.push({ name: name, fn: fn });
}

async function runAll() {
  let group = "";
  for (const item of QUEUE) {
    if (item.header) {
      group = item.header;
      console.log("\n── " + group + " " + "─".repeat(Math.max(0, 62 - group.length)));
      continue;
    }
    try {
      await item.fn();
      held++;
      console.log("  held    " + item.name);
    } catch (e) {
      broke.push({ group: group, name: item.name, why: (e && e.message) || String(e) });
      console.log("  BROKE   " + item.name + "\n            " + ((e && e.message) || e));
    }
  }
}

function must(cond, why) { if (!cond) throw new Error(why); }
function mustEqual(a, b, why) { if (a !== b) throw new Error(why + " (got " + JSON.stringify(a) + ", wanted " + JSON.stringify(b) + ")"); }

/* ── the browser, as hostile as we need it to be ────────────────── */
/*
   `budget` makes localStorage throw a real QuotaExceededError past N bytes,
   which is the failure a clinic actually hits and the one every storage
   guarantee in this codebase is written against.
*/
function browser(opts) {
  opts = opts || {};
  const mem = {};
  const audits = [], events = [], errors = [];
  let budget = opts.budget || Infinity;

  function used() {
    let n = 0;
    for (const k in mem) n += k.length + mem[k].length;
    return n;
  }
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      v = String(v);
      const after = used() - (mem[k] ? mem[k].length : 0) + v.length;
      if (after > budget) {
        const e = new Error("quota");
        e.name = "QuotaExceededError";
        throw e;
      }
      mem[k] = v;
    },
    removeItem: (k) => { delete mem[k]; }
  };

  const ctx = Object.assign({
    localStorage: ls, _mem: mem, _audits: audits, _events: events, _errors: errors,
    _setBudget: (n) => { budget = n; },
    console: { log() {}, warn() {}, info() {}, error(...a) { errors.push(a.join(" ")); } },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Map, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean, encodeURIComponent, decodeURIComponent,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    module: { exports: {} },
    logAudit: (a, d) => audits.push({ a, d }),
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { try { ls.setItem(k, v); return true; } catch (e) { return false; } },
    alert: () => {}
  }, opts.extra || {});
  vm.createContext(ctx);

  const files = ["js/data-classification.js", "js/storage.js"].concat(opts.also || []);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  /* storage.js declares its own logAudit, which shadows the stub above.
     Put the capturing one back or every audit assertion silently passes. */
  vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", ctx);
  ctx.run = (expr) => vm.runInContext(expr, ctx);
  return ctx;
}

const DAY = 86400000;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();

function visit(id, pid, dateIso, extra) {
  return Object.assign({
    id, patient_id: pid, date: dateIso, status: "completed",
    data: { id, final_dx: "Dry eye", alerts: [],
            engine_provenance: { kb_version: "1.1.0", shown_top: [{ name: "Dry eye" }] } }
  }, extra || {});
}


/* ═══════════════════════════════════════════════════════════════ */
/* A. THE PARSE CACHE                                              */
/*                                                                  */
/* The newest and most contract-changing code in the repo, so it    */
/* is attacked first and hardest. It changed loadStore() from       */
/* "returns a fresh parse" to "returns a shared object". Anything   */
/* that reads the store to find out WHAT IS ON DISK is now reading  */
/* something else, and the whole storage-failure story depends on   */
/* that distinction being true.                                     */
/* ═══════════════════════════════════════════════════════════════ */
G("A. parse cache");

attack("A1 a write that failed on quota does not leave its data readable", () => {
  const c = browser({ budget: 60000 });
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  mustEqual(c.run("loadVisits().length"), 1, "baseline");

  /* Exactly what the app does: read, append, save. The save fails. */
  const okAfter = c.run(`
    var vs = loadVisits();
    vs.push({ id: "v2", patient_id: "p1", date: "` + ago(0) + `", status: "completed",
              data: { id: "v2", pad: "x".repeat(200000) } });
    saveVisits(vs);
  `);
  mustEqual(okAfter, false, "the oversized write must be refused");
  must(c.run("storageWriteFailure() !== null"), "the failure must be recorded");

  /* THE ASSERTION. A record that is not on disk must not be readable as
     though it were. Anything that reloads — a browser refresh, a second
     tab, tomorrow morning — sees one visit. So must this. */
  mustEqual(c.run("loadVisits().length"), 1,
    "loadVisits() returned a visit that never reached disk");
});

attack("A2 mutating a loaded store without saving does not alter what is stored", () => {
  const c = browser();
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  c.run(`var a = loadVisits(); a[0].data.final_dx = "TAMPERED"; a.push({ id: "ghost" });`);
  mustEqual(c.run("loadVisits().length"), 1, "a ghost record became readable");
  mustEqual(c.run("loadVisits()[0].data.final_dx"), "Dry eye",
    "an unsaved edit became readable as stored data");
});

attack("A3 the object handed to saveVisits cannot be mutated into the store afterwards", () => {
  const c = browser();
  c.run(`__v = [${JSON.stringify(visit("v1", "p1", ago(1)))}]; saveVisits(__v);`);
  c.run(`__v[0].data.final_dx = "AFTER THE FACT";`);
  mustEqual(c.run("loadVisits()[0].data.final_dx"), "Dry eye",
    "post-save mutation of the caller's object changed what reads back");
});

attack("A4 another tab's write wins over the cache", () => {
  const c = browser();
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  c.run("loadVisits();");                             /* warm */
  /* Another tab writes the same key directly, as it would. */
  c.run(`localStorage.setItem("entopic_visits", JSON.stringify([
      { id: "other", patient_id: "p9", date: "2020-01-01", status: "completed", data: {} }]));`);
  mustEqual(c.run("loadVisits()[0].id"), "other", "the cache served stale bytes");
});

attack("A5 a store that goes corrupt is not still served from cache", () => {
  const c = browser();
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  c.run("loadVisits();");
  c.__truncated = '[{"id":"v1"';
  c.run('localStorage.setItem("entopic_visits", __truncated);');
  mustEqual(c.run("loadVisits().length"), 0, "corrupt bytes still read back as records");
  must(c.run('storageIsCorrupt("visits")'), "corruption was not detected");
});

attack("A6 a removed store does not read back from cache", () => {
  const c = browser();
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  c.run("loadVisits(); removeStore('visits');");
  mustEqual(c.run("loadVisits().length"), 0, "a deleted store still read back");
});

attack("A7 two readers cannot corrupt each other", () => {
  const c = browser();
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  const same = c.run("var a = loadVisits(), b = loadVisits(); a[0].data.final_dx = 'X'; b[0].data.final_dx;");
  mustEqual(same, "Dry eye", "one reader's edit was visible to another reader");
});


/* ═══════════════════════════════════════════════════════════════ */
/* B. HOSTILE DATA THROUGH THE STORE                               */
/* ═══════════════════════════════════════════════════════════════ */
G("B. hostile data through the store");

attack("B1 __proto__ in restored JSON does not pollute Object.prototype", () => {
  const c = browser();
  c.run(`localStorage.setItem("entopic_visits",
    '[{"id":"v1","__proto__":{"polluted":"YES"},"data":{}}]');`);
  c.run("loadVisits();");
  mustEqual(c.run("({}).polluted"), undefined, "Object.prototype was polluted through a restored store");
  mustEqual(c.run("[].polluted"), undefined, "Array.prototype was polluted");
});

attack("B2 constructor.prototype in restored JSON does not pollute", () => {
  const c = browser();
  c.run(`localStorage.setItem("entopic_patients",
    '[{"id":"p1","constructor":{"prototype":{"pwn":1}}}]');`);
  c.run("loadPatients();");
  mustEqual(c.run("({}).pwn"), undefined, "prototype polluted via constructor key");
});

attack("B3 null bytes and lone surrogates in a record id survive a round trip", () => {
  const c = browser();
  /* Written as escapes, not literals: a lone surrogate in a source file is
     not valid UTF-8 and some toolchains silently replace it. */
  const nasty = "v" + String.fromCharCode(0) + String.fromCharCode(0xD800) +
                String.fromCharCode(0xDFFF) + String.fromCharCode(0x7f) + "1";
  c.__id = nasty;
  c.run(`saveVisits([{ id: __id, patient_id: "p1", date: "${ago(1)}", status: "completed", data: {} }]);`);
  mustEqual(c.run("loadVisits().length"), 1, "a record with a hostile id was lost");
  mustEqual(c.run("loadVisits()[0].id === __id"), true, "the id did not survive the round trip");
  must(!c.run('storageIsCorrupt("visits")'), "a hostile id was misread as corruption");
});

attack("B4 a 5 MB single field is refused, not silently truncated", () => {
  const c = browser({ budget: 2000000 });
  const ok = c.run(`saveVisits([{ id: "v1", patient_id: "p1", date: "${ago(1)}",
    status: "completed", data: { cc: "x".repeat(5000000) } }]);`);
  mustEqual(ok, false, "an over-budget write reported success");
  mustEqual(c.run("loadVisits().length"), 0, "a refused write left readable data");
});

attack("B5 corruption in the MIDDLE of a large store is caught, not partly read", () => {
  const c = browser();
  const many = [];
  for (let i = 0; i < 200; i++) many.push(visit("v" + i, "p" + (i % 20), ago(i)));
  c.run(`saveVisits(${JSON.stringify(many)})`);
  const raw = c.run(`localStorage.getItem("entopic_visits")`);
  /* Damage the STRUCTURE, mid-store. An earlier version of this attack
     replaced three bytes with "@@@", which happened to land inside a string
     value and left the JSON perfectly valid — see the "silent byte damage"
     finding in the report; that case is undetectable without a checksum and
     is not what this attack is about. */
  const half = Math.floor(raw.length / 2);
  const brk = raw.indexOf('"', half);
  c.__damaged = raw.slice(0, brk) + raw.slice(brk + 1);      /* unbalanced quote */
  c.run('localStorage.setItem("entopic_visits", __damaged);');
  mustEqual(c.run("loadVisits().length"), 0, "a damaged store returned a partial record set");
  must(c.run('storageIsCorrupt("visits")'), "mid-store damage went undetected");
  mustEqual(c.run(`saveVisits([{id:"new"}])`), false, "a damaged store accepted a write over it");
});

attack("B6 a store that parses but is the wrong shape is treated as corrupt", () => {
  const c = browser();
  for (const bad of ['{"not":"a list"}', '"a string"', "42", "null", "true"]) {
    const b = browser();
    b.run(`localStorage.setItem("entopic_visits", ${JSON.stringify(bad)});`);
    const n = b.run("loadVisits().length");
    mustEqual(n, 0, "wrong-shape store " + bad + " read back as records");
    if (bad !== "null") {
      must(b.run('storageIsCorrupt("visits")'), "wrong-shape store " + bad + " was not flagged corrupt");
    }
  }
  void c;
});

attack("B7 a quota failure is reported, never swallowed", () => {
  const c = browser({ budget: 40000 });
  c.run(`saveVisits([${JSON.stringify(visit("v1", "p1", ago(1)))}])`);
  c.run(`saveVisits([{ id: "big", data: { pad: "x".repeat(100000) } }]);`);
  const f = c.run("JSON.stringify(storageWriteFailure())");
  must(f && f.indexOf("quota") >= 0, "a QuotaExceededError was not classified as quota: " + f);
  must(c._events.some((e) => e[0] === "storage:write-failed"), "no storage:write-failed event");
});


/* ═══════════════════════════════════════════════════════════════ */
/* C. THE ARCHIVE — deleting clinical records with extra steps     */
/* ═══════════════════════════════════════════════════════════════ */
G("C. archive");

function archiveCtx(extra) {
  return browser({ also: ["js/storage-archive.js"], extra: extra });
}

attack("C1 every visit is accounted for: eligible + held = total, always", () => {
  const c = archiveCtx();
  const vs = [
    visit("a", "p1", ago(2000)), visit("b", "p1", ago(1900)), visit("c", "p1", ago(10)),
    visit("d", "p2", ago(3000), { status: "in_progress" }),
    visit("e", "p2", ago(2500)), visit("f", "p2", "not a date"),
    visit("g", "p3", ""), visit("h", "p3", "9999-12-31T00:00:00.000Z"),
    visit("i", "p3", "+275760-09-13T00:00:00.000Z"),
    visit("j", "p4", "0000-01-01T00:00:00.000Z"),
    visit("k", "p4", "-271821-04-20T00:00:00.000Z")
  ];
  c.run(`saveVisits(${JSON.stringify(vs)})`);
  const n = c.run("var r = archiveCandidates({}); r.eligible.length + r.held.length");
  mustEqual(n, vs.length, "the archive lost track of visits with edge-case dates");
});

attack("C2 a far-future-dated visit is never archived", () => {
  const c = archiveCtx();
  c.run(`saveVisits(${JSON.stringify([
    visit("past", "p1", ago(3000)), visit("future", "p1", "9999-12-31T00:00:00.000Z"),
    visit("keep", "p1", ago(1))
  ])})`);
  const ids = c.run("archiveCandidates({}).eligible.map(function(v){return v.id;}).join(',')");
  must(ids.indexOf("future") < 0, "a visit dated in the year 9999 was archived");
});

attack("C3 the newest visit of every patient survives, however old", () => {
  const c = archiveCtx();
  c.run(`saveVisits(${JSON.stringify([
    visit("old1", "p1", ago(4000)), visit("old2", "p1", ago(3500)),
    visit("only", "p2", ago(5000))
  ])})`);
  const ids = c.run("archiveCandidates({}).eligible.map(function(v){return v.id;}).join(',')");
  must(ids.indexOf("only") < 0, "a patient's only visit was archived, leaving an empty chart");
  must(ids.indexOf("old2") < 0, "a patient's most recent visit was archived");
  mustEqual(ids, "old1", "wrong selection: " + ids);
});

attack("C4 archiving a store where everything is already a stub is a no-op", () => {
  const c = archiveCtx();
  c.run(`saveVisits(${JSON.stringify([
    { id: "s1", patient_id: "p1", date: ago(3000), status: "completed", archived: true, archive_id: "old" },
    { id: "s2", patient_id: "p1", date: ago(2900), status: "completed", archived: true, archive_id: "old" }
  ])})`);
  const r = c.run("archiveCandidates({})");
  mustEqual(r.eligible.length, 0, "a stub was selected for archiving a second time");
  mustEqual(r.held.length, 0, "stubs were reported as held records");
});

attack("C5 verification rejects a payload missing a record", () => {
  const c = archiveCtx();
  const expected = [visit("a", "p1", ago(3000)), visit("b", "p1", ago(2900))];
  c.__exp = expected;
  c.__act = { visits: [expected[0]] };
  const r = c.run("archiveVerify(__exp, __act)");
  mustEqual(r.ok, false, "verification accepted an archive that had lost a record");
});

attack("C6 verification rejects a payload with a DUPLICATED id standing in for a missing one", () => {
  const c = archiveCtx();
  const a = visit("a", "p1", ago(3000)), b = visit("b", "p1", ago(2900));
  c.__exp = [a, b];
  c.__act = { visits: [a, JSON.parse(JSON.stringify(a))] };   /* right count, wrong contents */
  const r = c.run("archiveVerify(__exp, __act)");
  mustEqual(r.ok, false, "verification accepted a duplicate in place of a lost record");
});

attack("C7 verification rejects a payload whose contents were altered", () => {
  const c = archiveCtx();
  const a = visit("a", "p1", ago(3000));
  const tampered = JSON.parse(JSON.stringify(a));
  tampered.data.final_dx = "Something else entirely";
  c.__exp = [a];
  c.__act = { visits: [tampered] };
  const r = c.run("archiveVerify(__exp, __act)");
  mustEqual(r.ok, false, "verification accepted an archive whose clinical content had changed");
});

attack("C8 restoring an archive containing null / id-less entries does not corrupt the store", () => {
  const c = archiveCtx();
  c.run(`saveVisits(${JSON.stringify([visit("live", "p1", ago(1))])})`);
  c.__payload = {
    __entopic_archive: "entopic-archive-v1", archive_id: "arc_x",
    visits: [null, undefined, {}, { id: "" }, visit("good", "p1", ago(3000))]
  };
  const r = c.run("archiveRestore(__payload)");
  mustEqual(r.ok, true, "a partly-junk archive was rejected wholesale: " + r.reason);
  mustEqual(r.restored, 1, "wrong restore count");
  const ids = c.run("loadVisits().map(function(v){return v.id;}).sort().join(',')");
  mustEqual(ids, "good,live", "the store was corrupted by the restore: " + ids);
});

attack("C9 restoring never overwrites a LIVE record with an archived one", () => {
  const c = archiveCtx();
  const live = visit("v1", "p1", ago(1));
  live.data.final_dx = "Current truth";
  c.run(`saveVisits(${JSON.stringify([live])})`);
  const stale = visit("v1", "p1", ago(3000));
  stale.data.final_dx = "Stale archived version";
  c.__payload = { __entopic_archive: "entopic-archive-v1", visits: [stale] };
  c.run("archiveRestore(__payload)");
  mustEqual(c.run("loadVisits()[0].data.final_dx"), "Current truth",
    "an archive overwrote a live clinical record");
});

attack("C10 a forged archive file is refused", () => {
  const c = archiveCtx();
  for (const bad of [null, {}, { visits: [] }, { __entopic_archive: "nope", visits: [] },
                     { __entopic_archive: "entopic-archive-v1" }]) {
    c.__p = bad;
    const r = c.run("archiveRestore(__p)");
    if (bad && bad.__entopic_archive === "entopic-archive-v1" && Array.isArray(bad.visits)) continue;
    mustEqual(r.ok, false, "a non-archive was accepted: " + JSON.stringify(bad));
  }
});

attack("C11 a stub keeps the chart honest and leaks nothing extra", () => {
  const c = archiveCtx();
  const v = visit("v1", "p1", ago(3000));
  v.data.rx = { od_sph: "-2.00" };
  v.data.cc = "patient told me something private";
  v.data.alerts = [{ m: "RAPD present", l: "urgent" }];
  c.__v = v;
  const stub = c.run("JSON.stringify(archiveStubOf(__v, 'arc_1'))");
  const s = JSON.parse(stub);
  mustEqual(s.archived, true, "the stub is not marked archived");
  mustEqual(s.summary.leading_impression, "Dry eye", "the chart lost its impression");
  mustEqual(s.summary.had_urgent_alert, true, "the chart lost the fact that an alert had fired");
  must(stub.indexOf("private") < 0, "the stub carried free text it should not");
  must(stub.indexOf("od_sph") < 0, "the stub carried the prescription");
});

attack("C12 archiving is refused outright while any store is damaged", async () => {
  const c = archiveCtx();
  c.run('localStorage.setItem("entopic_patients", "{"); loadPatients();');
  must(c.run('storageIsCorrupt("patients")'), "setup: patients should be corrupt");
  let out = null;
  c.__cap = (r) => { out = JSON.parse(JSON.stringify(r)); };
  c.run("archiveRun({}).then(__cap);");
  await Promise.resolve(); await Promise.resolve();   /* drain the microtasks */
  must(out, "archiveRun never settled");
  mustEqual(out.ok, false, "archiving proceeded while a store was damaged");
});


/* ═══════════════════════════════════════════════════════════════ */
/* D. MIGRATIONS — the code that rewrites every record at once     */
/* ═══════════════════════════════════════════════════════════════ */
G("D. migrations");

function migCtx() {
  return browser({ also: ["js/storage-migrations.js"] });
}

attack("D1 a one-way migration is refused a rollback rather than half-undone", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1))])})`);
  /* No `down`. The runner must say so plainly instead of pretending. */
  c.run(`STORE_MIGRATIONS.push({
      id: "9999_identity", what: "returns its input, mutated", stores: ["visits"],
      up: function (s) { s.visits[0].data.final_dx = "MUTATED"; return s; }
  });`);
  must(JSON.parse(c.run("JSON.stringify(migrationsRun({}))")).ok, "setup: it should apply");
  mustEqual(c.run("loadVisits()[0].data.final_dx"), "MUTATED", "setup: it should take effect");
  const r = JSON.parse(c.run('JSON.stringify(migrationsRollback(""))'));
  mustEqual(r.ok, false, "a migration with no inverse claimed to roll back");
  must(/one-way|snapshot/.test(r.reason || ""), "unhelpful reason: " + r.reason);
});

attack("D2 a migration that deletes every record is recoverable from its snapshot", () => {
  const c = migCtx();
  const vs = [visit("v1", "p1", ago(1)), visit("v2", "p1", ago(2))];
  c.run(`saveVisits(${JSON.stringify(vs)})`);
  c.run(`STORE_MIGRATIONS.push({ id: "9998_wipe", what: "deletes everything",
      stores: ["visits"],
      up: function (s) { return { visits: [] }; } });`);
  const run = JSON.parse(c.run("JSON.stringify(migrationsRun({}))"));
  must(run.ok, "setup: it should apply");
  mustEqual(c.run("loadVisits().length"), 0, "setup: it should have wiped the store");
  must(run.snapshot, "no snapshot key was returned to recover from");

  c.__snap = run.snapshot;
  const rest = JSON.parse(c.run("JSON.stringify(migrationSnapshotRestore(__snap))"));
  mustEqual(rest.ok, true, "the snapshot could not be restored: " + rest.reason);
  mustEqual(c.run("loadVisits().length"), 2, "a destructive migration was not recoverable");
  mustEqual(c.run("loadVisits().map(function(v){return v.id;}).join(',')"), "v1,v2",
    "the restored records are not the originals");
});

attack("D2c restoring a snapshot makes the undone migration PENDING again", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1))])})`);
  c.run(`STORE_MIGRATIONS.push({ id: "9994_ledger", what: "wipes", stores: ["visits"],
      up: function (s) { return { visits: [] }; } });`);
  const run = JSON.parse(c.run("JSON.stringify(migrationsRun({}))"));
  mustEqual(c.run('migrationApplied("9994_ledger")'), true, "setup: it should be recorded");
  c.__snap = run.snapshot;
  c.run("migrationSnapshotRestore(__snap);");
  /* If the data is back but the ledger still says "applied", this migration
     will never run again — old-format records, new-format code, silently. */
  mustEqual(c.run('migrationApplied("9994_ledger")'), false,
    "the records were restored but the ledger still claims the migration ran");
});

attack("D2d a snapshot restore refuses to write over a damaged store", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1))])})`);
  c.run(`STORE_MIGRATIONS.push({ id: "9993_wipe2", what: "wipes", stores: ["visits"],
      up: function (s) { return { visits: [] }; } });`);
  const run = JSON.parse(c.run("JSON.stringify(migrationsRun({}))"));
  /* The store becomes unreadable AFTER the migration — a disk error during
     the very recovery. Writing over it would destroy the only damaged copy. */
  c.run('localStorage.setItem("entopic_visits", "[{"); loadVisits();');
  must(c.run('storageIsCorrupt("visits")'), "setup: visits should be corrupt");
  c.__snap = run.snapshot;
  const rest = JSON.parse(c.run("JSON.stringify(migrationSnapshotRestore(__snap))"));
  mustEqual(rest.ok, false, "a restore wrote over a damaged store");
  must(/damaged/.test(rest.reason || ""), "unhelpful reason: " + rest.reason);
});

attack("D2b a migration cannot write a store it did not declare", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1)), visit("v2", "p1", ago(2))])})`);
  c.run(`savePatients([{ id: "p1", name: "A" }]);`);
  /* Declares "visits", quietly returns "patients" too. `patients` is outside
     the pre-migration snapshot, so if this is allowed to write there is no
     copy left to roll back to — the records are simply gone. */
  c.run(`STORE_MIGRATIONS.push({ id: "9995_undeclared", what: "writes an undeclared store",
      stores: ["visits"],
      up: function (s) { return { visits: s.visits, patients: [] }; } });`);
  const r = JSON.parse(c.run("JSON.stringify(migrationsRun({}))"));
  mustEqual(r.ok, false, "a migration was allowed to write an undeclared store");
  must(/did not declare/.test(r.reason || ""), "unhelpful reason: " + r.reason);
  mustEqual(c.run("loadPatients().length"), 1, "the undeclared store was wiped anyway");
  mustEqual(c.run("loadVisits().length"), 2, "the declared store was left half-migrated");
});

attack("D3 a migration that throws leaves the store exactly as it was", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1))])})`);
  const before = c.run(`localStorage.getItem("entopic_visits")`);
  c.run(`STORE_MIGRATIONS.push({ id: "9997_throws", what: "explodes", stores: ["visits"],
      up: function (s) { s.visits.length = 0; throw new Error("boom"); } });`);
  c.run("migrationsRun({});");
  mustEqual(c.run(`localStorage.getItem("entopic_visits")`), before,
    "a throwing migration left the store altered");
  mustEqual(c.run('migrationApplied("9997_throws")'), false,
    "a failed migration was recorded as applied");
});

attack("D4 a migration is never applied twice", () => {
  const c = migCtx();
  c.run(`saveVisits(${JSON.stringify([visit("v1", "p1", ago(1))])})`);
  c.run(`STORE_MIGRATIONS.push({ id: "9996_append", what: "appends a marker", stores: ["visits"],
      up: function (s) { s.visits.forEach(function (v) { v.data.final_dx += "!"; }); return s; } });`);
  c.run("migrationsRun({}); migrationsRun({}); migrationsRun({});");
  mustEqual(c.run("loadVisits()[0].data.final_dx"), "Dry eye!",
    "a migration ran more than once");
});


/* ═══════════════════════════════════════════════════════════════ */
/* E. THE ENGINE — hostile clinical input                          */
/*                                                                  */
/* The engine is the one part of this product a clinician trusts    */
/* to be deterministic. These attacks care about exactly two        */
/* outcomes: it must not produce a nonsense NUMBER, and it must not */
/* fail to fire an alert it would otherwise have fired.             */
/* ═══════════════════════════════════════════════════════════════ */
G("E. engine under hostile input");

const { createEngine } = require("../lib/load-engine");

function probsSane(r) {
  const bad = [];
  for (const d of r.dxList) {
    if (typeof d.prob !== "number" || !isFinite(d.prob)) bad.push(d.n + "=" + d.prob);
    else if (d.prob < 0 || d.prob > 1) bad.push(d.n + "=" + d.prob);
  }
  if (bad.length) throw new Error("non-finite or out-of-range probability: " + bad.join(", "));
}

function noNaNText(r) {
  const txt = Array.from(r.alerts, (a) => (a.m || "") + " " + (a.d || "")).join(" | ") +
              " " + Array.from(r.dxList, (d) => d.reasoning || "").join(" | ");
  if (/NaN|Infinity|undefined/.test(txt)) {
    throw new Error("a computed non-value leaked into clinician-facing text: " +
      txt.slice(0, 200));
  }
}

attack("E1 Infinity / NaN / 1e400 in measurements produce no nonsense number", () => {
  const eng = createEngine();
  const r = eng.runCase({
    iop: { od: "Infinity", os: "NaN" },
    fun: { od: { cd_v: "1e400" }, os: { cd_v: "-0" } },
    inv: { vf_md_od: "-Infinity", pachy_od: "NaN" },
    va: { od_dist: "1e999" },
    symptoms: ["blur"]
  }, { age: "60" });
  probsSane(r);
  noNaNText(r);
});

attack("E2 a red flag still fires when the record is full of garbage", () => {
  const clean = createEngine().runCase({ pupil: { rapd: "od" }, symptoms: ["vision_loss"] }, { age: "60" });
  const cleanUrgent = Array.from(clean.alerts).filter((a) => a.l === "urgent").length;
  must(cleanUrgent > 0, "setup: RAPD must produce an urgent alert");

  const dirty = createEngine().runCase({
    pupil: { rapd: "od" }, symptoms: ["vision_loss"],
    iop: { od: "NaN", os: "Infinity" },
    cc: "x".repeat(100000),
    sl: { od: { ns: "not a number" }, findings: [{ label: "((((", eye: "OD" }] }
  }, { age: "NaN" });
  const dirtyUrgent = Array.from(dirty.alerts).filter((a) => a.l === "urgent").length;
  must(dirtyUrgent >= cleanUrgent,
    "garbage elsewhere in the record suppressed a red flag (" + cleanUrgent + " -> " + dirtyUrgent + ")");
});

attack("E3 10,000 findings on one visit does not hang or crash the engine", () => {
  const eng = createEngine();
  const findings = [];
  for (let i = 0; i < 10000; i++) findings.push({ label: "finding number " + i, eye: i % 2 ? "OD" : "OS" });
  const t0 = Date.now();
  const r = eng.runCase({ sl: { findings }, fun: { findings: findings.slice(0, 5000) }, symptoms: ["blur"] },
                        { age: "50" });
  const took = Date.now() - t0;
  probsSane(r);
  must(took < 15000, "10,000 findings took " + took + " ms");
});

attack("E4 10,000 symptoms does not hang or produce a broken differential", () => {
  const eng = createEngine();
  const symptoms = [];
  for (let i = 0; i < 10000; i++) symptoms.push("synthetic_symptom_" + i);
  symptoms.push("blur", "pain");
  const t0 = Date.now();
  const r = eng.runCase({ symptoms }, { age: "50" });
  const took = Date.now() - t0;
  probsSane(r);
  must(took < 15000, "10,000 symptoms took " + took + " ms");
});

attack("E5 EVERY registered token fired at once produces a sane, ordered differential", () => {
  const eng = createEngine();
  const all = Object.keys(eng.context.TOKEN_REGISTRY);
  must(all.length > 400, "setup: expected the full registry, got " + all.length);
  /* The maximally contradictory patient, who cannot exist. Every token goes
     in through V.symptoms, which the engine adds verbatim (collectTokens
     SOURCE 1), so this runs the whole real pipeline rather than reaching
     inside it. */
  const t0 = Date.now();
  const r = createEngine().runCase({ symptoms: all.slice() }, { age: "50" });
  const took = Date.now() - t0;
  probsSane(r);
  noNaNText(r);

  /* The list is NOT in plain probability order, deliberately: an urgent
     condition gets a bounded sort nudge (URGENT_SORT_BONUS = 0.08 in
     engine.js) so a safety-relevant near-tie is shown first. The invariant
     that must hold is that the nudge stays BOUNDED and applies only to
     urgent conditions — not that the list is monotonic. Asserting monotonic
     order here would be asserting that a safety feature is a bug. */
  const BONUS = 0.08;
  const rows = Array.from(r.dxList, (d) => ({ n: d.n, prob: d.prob, urgent: !!d.urgent }));
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1], cur = rows[i];
    if (cur.prob <= prev.prob + 1e-9) continue;              /* in order */
    must(prev.urgent && !cur.urgent,
      "a non-urgent condition was floated above a better-scoring one: " +
      prev.n + " (" + prev.prob.toFixed(4) + ") over " + cur.n + " (" + cur.prob.toFixed(4) + ")");
    must(cur.prob - prev.prob <= BONUS + 1e-9,
      "the urgent sort nudge exceeded its bound: " + prev.n + " floated over " + cur.n +
      " across a gap of " + (cur.prob - prev.prob).toFixed(4) + " (cap " + BONUS + ")");
  }
  /* Each class must still be internally ordered — the nudge reorders across
     the urgent/non-urgent boundary and nowhere else. */
  for (const cls of [true, false]) {
    const only = rows.filter((x) => x.urgent === cls);
    for (let i = 1; i < only.length; i++) {
      must(only[i].prob <= only[i - 1].prob + 1e-9,
        (cls ? "urgent" : "non-urgent") + " conditions are out of order among themselves at " + i);
    }
  }

  must(Array.from(r.alerts).filter((a) => a.l === "urgent").length > 0,
    "every red flag in the vocabulary fired at once and not one urgent alert appeared");
  must(took < 15000, "all-tokens scoring took " + took + " ms");
  void eng;
});

attack("E6 regex metacharacters in free text neither crash nor stall the parser", () => {
  const bombs = [
    "(((((((((((((((((((((((((a",
    "a".repeat(5000) + "!",
    "(a+)+$" + "a".repeat(60),
    "[[[[[[[[[[",
    "\\\\\\\\\\\\\\\\",
    "*?+.^$|(){}[]",
    "x".repeat(1000000)
  ];
  for (const b of bombs) {
    const eng = createEngine();
    const t0 = Date.now();
    const r = eng.runCase({
      cc: b, hpi: b,
      sl: { od: { note: b }, findings: [{ label: b, eye: "OD" }] },
      meds: [{ name: b }],
      symptoms: ["blur"]
    }, { age: "50" });
    const took = Date.now() - t0;
    probsSane(r);
    must(took < 5000, "free-text bomb took " + took + " ms: " + b.slice(0, 30));
  }
});

attack("E7 a polluted prototype cannot invent a clinical finding", () => {
  const eng = createEngine();
  const before = eng.runCase({ symptoms: ["blur"] }, { age: "50" });
  const beforeN = before.dxList.length;
  /* The engine reads plain objects all over. If any read is an unguarded
     `for in` or an unguarded property lookup, this changes the answer. */
  vm.runInContext(`Object.prototype.__attack_marker = "yes";`, eng.context);
  try {
    const after = eng.runCase({ symptoms: ["blur"] }, { age: "50" });
    mustEqual(after.dxList.length, beforeN, "prototype pollution changed the differential length");
    const names = Array.from(after.dxList, (d) => d.n).join("|");
    must(names.indexOf("__attack_marker") < 0, "a prototype key appeared as a condition");
    must(Array.from(after.tokens).indexOf("__attack_marker") < 0,
      "a prototype key became a clinical token");
  } finally {
    vm.runInContext("delete Object.prototype.__attack_marker;", eng.context);
  }
});

attack("E8 the engine is deterministic: the same record scores identically 20 times", () => {
  const CASE = {
    symptoms: ["dryness", "burning", "grittiness", "blur"],
    iop: { od: "26", os: "27" }, fun: { od: { cd_v: "0.7" }, os: { cd_v: "0.5" } },
    inv: { vf_md_od: "-4.5" }, hxF: { glaucoma: true }
  };
  let first = null;
  for (let i = 0; i < 20; i++) {
    const r = createEngine().runCase(CASE, { age: "58" });
    const sig = Array.from(r.dxList, (d) => d.n + "@" + d.prob.toFixed(6)).join("|") +
                "##" + Array.from(r.alerts, (a) => a.l + ":" + a.m).join("|");
    if (first === null) first = sig;
    else mustEqual(sig, first, "run " + i + " differed from run 0");
  }
});

attack("E9 a hostile patient age cannot produce a nonsense probability", () => {
  for (const age of ["-5", "NaN", "Infinity", "1e400", "0", "999", "", "abc", "12.5.6"]) {
    const r = createEngine().runCase({ symptoms: ["blur", "pain"], iop: { od: "30" } }, { age });
    probsSane(r);
    noNaNText(r);
  }
});


/* ═══════════════════════════════════════════════════════════════ */
/* F. RED FLAGS UNDER PRESSURE                                     */
/*                                                                  */
/* The single guardrail with no acceptable failure mode. Every      */
/* other assertion in this file is about data integrity; these are  */
/* about whether a patient gets sent to hospital.                   */
/* ═══════════════════════════════════════════════════════════════ */
G("F. red flags under pressure");

/* The input paths are the REAL ones: a slit-lamp finding is a label the
   clinician ticks (knowledge/finding-token-map.js turns it into tokens), not
   a boolean field. An earlier version of this file invented
   `sl.od.hypopyon = true`, got no alert, and reported a red-flag failure that
   did not exist — a reminder that an attack asserting the wrong input path
   manufactures a false alarm as easily as it finds a real one. */
const RED_FLAG_CASES = [
  ["RAPD", { pupil: { rapd: "od" } }, { age: "60" }],
  ["IOP over 40", { iop: { od: "52", os: "18" } }, { age: "60" }],
  ["hypopyon", { sl: { findings: ["Hypopyon"] } }, { age: "40" }],
  ["flashes and floaters", { symptoms: ["flashes", "floaters"] }, { age: "62" }],
  ["sudden vision loss", { symptoms: ["sudden_vision_loss"] }, { age: "70" }]
];

attack("F1 every red-flag case fires an urgent alert on its own", () => {
  const missing = [];
  for (const [name, v, p] of RED_FLAG_CASES) {
    const r = createEngine().runCase(v, p);
    const urgent = Array.from(r.alerts).filter((a) => a.l === "urgent").length;
    if (!urgent) missing.push(name);
  }
  must(missing.length === 0, "no urgent alert for: " + missing.join(", "));
});

attack("F2 no amount of contradicting evidence suppresses a red flag", () => {
  /* Everything a scoring system might use to argue the patient is fine. */
  const reassuring = {
    symptoms: ["no_pain", "vision_stable"],
    va: { od_dist: "6/6", os_dist: "6/6" },
    iop: { od: "14", os: "14" },
    fun: { od: { cd_v: "0.2" }, os: { cd_v: "0.2" } },
    inv: { vf_md_od: "0.0", vf_md_os: "0.0" }
  };
  const failed = [];
  for (const [name, v, p] of RED_FLAG_CASES) {
    const merged = JSON.parse(JSON.stringify(reassuring));
    for (const k of Object.keys(v)) {
      merged[k] = Object.assign(merged[k] && typeof merged[k] === "object" ? merged[k] : {}, v[k]);
    }
    if (v.symptoms) merged.symptoms = reassuring.symptoms.concat(v.symptoms);
    const r = createEngine().runCase(merged, p);
    if (!Array.from(r.alerts).filter((a) => a.l === "urgent").length) failed.push(name);
  }
  must(failed.length === 0, "reassuring findings suppressed: " + failed.join(", "));
});

attack("F3 a user-authored overlay condition cannot suppress a red flag", () => {
  const eng = createEngine();
  const base = eng.runCase({ pupil: { rapd: "od" } }, { age: "60" });
  const baseUrgent = Array.from(base.alerts).filter((a) => a.l === "urgent").length;
  must(baseUrgent > 0, "setup");
  /* A hostile personal condition: contradicts everything, scores enormously. */
  vm.runInContext(`
    KNOWLEDGE_ALL.push({
      name: "ZZZ Overlay", cat: "user", route: "user_route",
      req: [], sup: [], con: ["RAPD_positive"],
      _index: KNOWLEDGE_ALL.length, weightBoost: 9999
    });
    rebuildKbIndexes();
  `, eng.context);
  const after = eng.runCase({ pupil: { rapd: "od" } }, { age: "60" });
  const afterUrgent = Array.from(after.alerts).filter((a) => a.l === "urgent").length;
  must(afterUrgent >= baseUrgent,
    "a user-authored condition removed an urgent alert (" + baseUrgent + " -> " + afterUrgent + ")");
});

attack("F4 red flags fire even when the KB is inflated 50x", () => {
  const eng = createEngine();
  const ctx = eng.context;
  const base = ctx.KNOWLEDGE_ALL.slice();
  const big = base.slice();
  for (let k = 1; k < 50; k++) {
    for (const c of base) {
      const cl = JSON.parse(JSON.stringify(c));
      cl.name = c.name + " #" + k;
      cl.req = c.req.map((t) => t + "__k" + k);
      cl.sup = c.sup.map((t) => t + "__k" + k);
      cl.con = c.con.map((t) => t + "__k" + k);
      cl.route = c.route + "_k" + k;
      big.push(cl);
    }
  }
  ctx.KNOWLEDGE_ALL.length = 0;
  big.forEach((c, i) => { c._index = i; ctx.KNOWLEDGE_ALL.push(c); });
  vm.runInContext("rebuildKbIndexes()", ctx);
  const r = eng.runCase({ pupil: { rapd: "od" } }, { age: "60" });
  must(Array.from(r.alerts).filter((a) => a.l === "urgent").length > 0,
    "an urgent alert was lost in a 50x knowledge base");
});


/* ═══════════════════════════════════════════════════════════════ */
runAll().then(() => {
  console.log("\n" + "═".repeat(66));
  console.log("held: " + held + "    BROKE: " + broke.length);
  if (broke.length) {
    console.log("\nWhat broke:");
    broke.forEach((b, i) => console.log("  " + (i + 1) + ". [" + b.group + "] " + b.name + "\n     " + b.why));
  }
  console.log("═".repeat(66));
  process.exit(broke.length ? 1 : 0);
});
