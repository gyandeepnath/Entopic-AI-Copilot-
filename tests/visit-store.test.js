/* ═══════════════════════════════════════════════════════════════ */
/* PER-VISIT STORAGE  (approved on-disk change, 2026-08-08)         */
/*                                                                  */
/* Every visit used to live in one JSON array. Saving one field     */
/* re-serialised the entire clinic: MEASURED 104.5 ms per           */
/* keystroke-save at the 1,900-visit ceiling, against 0.021 ms with */
/* one key per visit.                                               */
/*                                                                  */
/* This is the most dangerous change made to this codebase. It      */
/* MOVES EVERY PATIENT RECORD. So these tests are not about speed —  */
/* not one of them measures anything. They are about the three ways */
/* a storage split loses records:                                   */
/*                                                                  */
/*   1. The conversion drops a visit.                               */
/*   2. The conversion half-succeeds and leaves the device in a     */
/*      state neither layout can read.                              */
/*   3. A record goes missing later and the app reports a patient   */
/*      with fewer visits instead of an error.                      */
/*                                                                  */
/* (3) is the worst, because it looks like a clinical fact.         */
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

function sandbox(opts) {
  opts = opts || {};
  const mem = {};
  let budget = opts.budget || Infinity;
  const used = () => Object.keys(mem).reduce((n, k) => n + k.length + mem[k].length, 0);
  const audits = [], events = [];
  const ctx = Object.assign({
    localStorage: {
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
    },
    _mem: mem, _audits: audits, _events: events,
    _setBudget: (n) => { budget = n; },
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {},
    module: { exports: {} },
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { mem[k] = String(v); return true; }, alert: () => {}
  }, opts.extra || {});
  vm.createContext(ctx);
  for (const f of ["js/data-classification.js", "js/storage.js", "js/visit-store.js"]
                    .concat(opts.also || [])) {
    vm.runInContext(read(f), ctx, { filename: f });
  }
  vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", ctx);
  ctx.run = (e) => vm.runInContext(e, ctx);
  return ctx;
}

function visit(id, pid, date, extra) {
  return Object.assign({
    id, patient_id: pid, date, status: "completed",
    updated: date,
    data: { id, final_dx: "Dry eye", iop: { od: "16" }, alerts: [] }
  }, extra || {});
}

function seed(c, visits) {
  c.run(`saveVisits(${JSON.stringify(visits)})`);
  return visits;
}


/* ═══ 1. THE CONVERSION MUST NOT LOSE A VISIT ═══ */

test("every visit survives the split, byte for byte", () => {
  const c = sandbox();
  const vs = [];
  for (let i = 0; i < 40; i++) vs.push(visit("v" + i, "p" + (i % 7), ago(i * 10)));
  seed(c, vs);
  const before = c.run("JSON.stringify(loadVisits())");

  const r = c.run("visitStoreSplitNow()");
  assert.strictEqual(r.ok, true, r.reason);
  assert.strictEqual(r.migrated, 40);

  const after = c.run("JSON.stringify(loadVisits())");
  assert.strictEqual(after, before,
    "the reassembled collection is not identical to what was there before the split");
});

test("a second split is a no-op, not a second copy", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p1", ago(2))]);
  c.run("visitStoreSplitNow()");
  const r2 = c.run("visitStoreSplitNow()");
  assert.strictEqual(r2.ok, true);
  assert.strictEqual(r2.migrated, 0);
  assert.strictEqual(c.run("loadVisits().length"), 2, "visits were duplicated by a re-run");
});

test("a split that runs out of room changes nothing", () => {
  const c = sandbox();
  const vs = [];
  for (let i = 0; i < 30; i++) vs.push(visit("v" + i, "p1", ago(i), { pad: "x".repeat(400) }));
  seed(c, vs);
  const beforeRaw = c.run('localStorage.getItem("entopic_visits")');

  /* Only enough headroom for a few records. */
  c._setBudget(c.run('localStorage.getItem("entopic_visits").length') + 3000);
  const r = c.run("visitStoreSplitNow()");

  assert.strictEqual(r.ok, false, "a split that could not finish reported success");
  assert.strictEqual(c.run('localStorage.getItem("entopic_visits")'), beforeRaw,
    "the original store was altered by a failed split");
  assert.strictEqual(c.run("visitStoreSplit()"), false, "a partial split was left in place");
  assert.strictEqual(c.run("loadVisits().length"), 30, "the device must still read all 30 visits");

  /* And no half-written records left behind to confuse a later attempt. */
  const strays = Object.keys(c._mem).filter((k) => k.indexOf("entopic_visit_") === 0);
  assert.deepStrictEqual(strays, [], "orphan records survived a failed split: " + strays);
});

test("a split is refused while the store is damaged", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1))]);
  c.run('localStorage.setItem("entopic_visits", "[{"); loadVisits();');
  assert.strictEqual(c.run('storageIsCorrupt("visits")'), true, "setup");
  const r = c.run("visitStoreSplitNow()");
  assert.strictEqual(r.ok, false, "a damaged store was split, writing over recoverable records");
  assert.ok(/damaged/.test(r.reason), r.reason);
});

test("the pre-split store is KEPT until it is proven redundant", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p2", ago(2))]);
  c.run("visitStoreSplitNow()");
  assert.ok(c.run('localStorage.getItem("entopic_visits")'),
    "the only reversible copy was deleted immediately");

  const drop = c.run("visitStoreDropLegacy()");
  assert.strictEqual(drop.ok, true, drop.reason);
  assert.strictEqual(c.run('localStorage.getItem("entopic_visits")'), null);
});

test("the pre-split store is NOT dropped when the new layout is missing a visit", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p2", ago(2))]);
  c.run("visitStoreSplitNow()");
  /* Something removed a visit from the index — a bug, a partial write. */
  c.run('saveStore("visit_index", visitIndexLoad().filter(function (e) { return e.id !== "v2"; }));');
  const drop = c.run("visitStoreDropLegacy()");
  assert.strictEqual(drop.ok, false,
    "the fallback copy was deleted while the new layout was missing a record");
  assert.ok(c.run('localStorage.getItem("entopic_visits")'), "and it must still be there");
});


/* ═══ 2. A MISSING RECORD IS AN ERROR, NOT A SHORTER LIST ═══ */

test("a record named in the index but absent from disk raises corruption", () => {
  /* THE ONE THAT MATTERS. Reading four visits for a patient who has five must
     never look like a patient who has four — that is a clinical fact the
     clinician would act on. */
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p1", ago(30)), visit("v3", "p1", ago(60))]);
  c.run("visitStoreSplitNow()");
  assert.strictEqual(c.run("loadVisits().length"), 3, "setup");

  c.run('localStorage.removeItem("entopic_visit_v2");');

  const got = c.run("loadVisits().length");
  assert.strictEqual(c.run('storageIsCorrupt("visit_index")'), true,
    "a missing visit record was served as a shorter list (" + got + " of 3) with no error — " +
    "this is silent clinical data loss");
});

test("the same is true when reading ONE patient's chart", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p1", ago(30))]);
  c.run("visitStoreSplitNow()");
  c.run('localStorage.removeItem("entopic_visit_v1");');
  c.run('getPatientVisits("p1");');
  assert.strictEqual(c.run('storageIsCorrupt("visit_index")'), true,
    "a chart silently lost a visit");
});


/* ═══ 3. THE COLLECTION API STILL BEHAVES ═══ */

test("a normal read never marks the store corrupt", () => {
  /* FOUND BY MUTATION TESTING (storage target). The guard that raises
     corruption only when records are actually MISSING —

       if (missing.length && typeof storageNoteCorrupt === "function")

     — becomes, under `&&`→`||`, "fire whenever storageNoteCorrupt exists",
     which is always. A perfectly healthy chart read then flags the index as
     corrupt, which BLOCKS ALL WRITES and shows the clinician a red "cannot
     read records" banner on a device where nothing is wrong. An availability
     failure manufactured out of a routine read.

     Both read paths carry the guard (visitStoreForPatient and
     visitStoreLoadAll); this exercises both. */
  const c = sandbox();
  seed(c, [visit("a", "p1", ago(1)), visit("b", "p1", ago(30)), visit("c", "p2", ago(5))]);
  c.run("visitStoreSplitNow()");

  /* Check IMMEDIATELY after a chart read, with NO intervening index read.
     A trailing loadVisits() would call storageNoteReadOk and clear a spurious
     flag before this line saw it — masking exactly the bug under test. That
     masking is real: the flag flickers, and the moment that matters is a WRITE
     landing while it is set. */
  c.run('getPatientVisits("p1");');
  assert.strictEqual(c.run('storageIsCorrupt("visit_index")'), false,
    "opening a patient's chart flagged the visit index as corrupt on a healthy device");

  /* The consequence, stated as the clinician would meet it: a save right after
     opening a chart must not be refused. */
  c.run('getPatientVisits("p1");');
  assert.strictEqual(c.run('saveVisits(loadVisits())'), true,
    "a save immediately after opening a chart was REFUSED — a routine read wrongly marked " +
    "the store corrupt, which blocks writes and alarms the clinician when nothing is wrong");

  /* The whole-collection read path carries the same guard. */
  const c2 = sandbox();
  seed(c2, [visit("a", "p1", ago(1)), visit("b", "p2", ago(5))]);
  c2.run("visitStoreSplitNow()");
  c2.run('loadVisits();');
  assert.strictEqual(c2.run('storageIsCorrupt("visit_index")'), false,
    "a healthy loadVisits() flagged the visit index as corrupt");
});

test("getPatientVisits returns only that patient, newest first", () => {
  const c = sandbox();
  seed(c, [
    visit("a", "p1", ago(10)), visit("b", "p1", ago(1)), visit("c", "p1", ago(100)),
    visit("x", "p2", ago(5))
  ]);
  c.run("visitStoreSplitNow()");
  const ids = c.run('getPatientVisits("p1").map(function (v) { return v.id; }).join(",")');
  assert.strictEqual(ids, "b,a,c", "wrong patient or wrong order: " + ids);
});

test("getLastVisit matches the first of getPatientVisits", () => {
  const c = sandbox();
  seed(c, [visit("a", "p1", ago(10)), visit("b", "p1", ago(1)), visit("z", "p9", ago(0))]);
  c.run("visitStoreSplitNow()");
  assert.strictEqual(c.run('getLastVisit("p1").id'), "b");
  assert.strictEqual(c.run('getLastVisit("nobody")'), null);
});

test("saveVisits removing a visit removes its record too", () => {
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1)), visit("v2", "p1", ago(2))]);
  c.run("visitStoreSplitNow()");
  c.run('saveVisits(loadVisits().filter(function (v) { return v.id !== "v2"; }));');
  assert.strictEqual(c.run("loadVisits().length"), 1);
  assert.strictEqual(c.run('localStorage.getItem("entopic_visit_v2")'), null,
    "an orphan record was left behind, consuming room and recoverable by nothing");
  assert.strictEqual(c.run('storageIsCorrupt("visit_index")'), false,
    "a legitimate removal must not read as corruption");
});

test("visitRecordSave indexes a brand-new visit, not just an existing one", () => {
  /* FOUND BY MUTATION TESTING (storage target). Flipping `if (at < 0)` to
     `if (at > 0)` — the branch that adds a NEW visit to the index — was
     reported as an equivalent mutant by the storage probe, because no
     scenario exercised it. Hand-checked, it is a real hole: with the mutation,
     visitRecordSave on a new id crashes and the visit is never indexed.

     In production this branch is currently unreached — doSave always loads the
     record first, so `at` is never -1 — but visitRecordSave is a public,
     documented function whose contract includes adding a visit, and defensive
     code that is never tested is defensive code that rots. */
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1))]);
  c.run("visitStoreSplitNow()");

  const ok = c.run(`visitRecordSave({ id: "vNEW", patient_id: "p1", date: "${ago(0)}",
    status: "completed", data: { id: "vNEW", final_dx: "a new visit" } })`);
  assert.strictEqual(ok, true, "visitRecordSave returned false for a valid new visit");

  assert.strictEqual(c.run("loadVisits().length"), 2, "the new visit was not added");
  assert.ok(c.run('(visitIndexLoad()||[]).some(function(e){return e.id==="vNEW";})'),
    "the new visit's record was written but never indexed — it is invisible to loadVisits");
  assert.strictEqual(c.run('getPatientVisits("p1").length'), 2,
    "the new visit does not appear in the patient's chart");
});

test("saving one visit does not rewrite the index unless an indexed field changed", () => {
  /* The whole point of the split. Rewriting a 150 KB index on every keystroke
     would put back most of the cost this change exists to remove. */
  const c = sandbox();
  seed(c, [visit("v1", "p1", ago(1))]);
  c.run("visitStoreSplitNow()");
  const idxBefore = c.run('localStorage.getItem("entopic_visit_index")');

  c.run('var v = visitRecordLoad("v1"); v.data.iop.od = "22"; visitRecordSave(v);');
  assert.strictEqual(c.run('localStorage.getItem("entopic_visit_index")'), idxBefore,
    "the index was rewritten for a change it does not hold");
  assert.strictEqual(c.run('visitRecordLoad("v1").data.iop.od'), "22", "but the record did change");

  /* A status change IS in the index and must land there. */
  c.run('var v2 = visitRecordLoad("v1"); v2.status = "completed"; v2.updated = "2027-01-01"; visitRecordSave(v2);');
  assert.notStrictEqual(c.run('localStorage.getItem("entopic_visit_index")'), idxBefore,
    "an indexed field changed and the index did not follow");
});


/* ═══ 4. A DEVICE THAT HAS NOT SPLIT YET STILL WORKS ═══ */

test("every accessor works before the split", () => {
  const c = sandbox();
  seed(c, [visit("a", "p1", ago(10)), visit("b", "p1", ago(1))]);
  assert.strictEqual(c.run("visitStoreSplit()"), false, "setup: not split");
  assert.strictEqual(c.run("loadVisits().length"), 2);
  assert.strictEqual(c.run('getPatientVisits("p1").length'), 2);
  assert.strictEqual(c.run('getLastVisit("p1").id'), "b");
  assert.strictEqual(c.run("visitStoreCount()"), 2);
});

test("storage.js alone, without visit-store.js, is unchanged", () => {
  /* Several Node harnesses load storage.js by itself. The split must be
     additive — a missing script must not become a broken save. */
  const mem = {};
  const ctx = {
    localStorage: {
      get length() { return Object.keys(mem).length; },
      key: (i) => Object.keys(mem)[i] ?? null,
      getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; }
    },
    console: { log() {}, warn() {}, info() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout: () => 0, clearTimeout: () => {}, module: { exports: {} },
    evEmit: () => {}, lsSet: () => true, alert: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx);
  vm.runInContext(read("js/storage.js"), ctx);
  assert.strictEqual(vm.runInContext("typeof visitStoreLoadAll", ctx), "undefined", "setup");
  assert.strictEqual(vm.runInContext('saveVisits([{ id: "v1", patient_id: "p1" }])', ctx), true);
  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 1);
  assert.strictEqual(vm.runInContext('getPatientVisits("p1").length', ctx), 1);
});


/* ═══ 5. THE VAULT MUST COVER THE NEW KEYS ═══ */

test("every per-visit key is treated as protected by the vault", () => {
  const ctx = { console: { log() {}, warn() {}, error() {} },
                JSON, Math, Date, String, Number, Array, Object, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(read("js/local-vault.js"), ctx, { filename: "local-vault.js" });
  const isProt = (k) => vm.runInContext("vaultIsProtected(" + JSON.stringify(k) + ")", ctx);

  /* If any of these reads false, a patient's full examination is written to
     disk in plaintext on a device whose owner was told it is encrypted. */
  for (const k of ["visit_index", "visit_v1", "visit_abc-123",
                   "visit_" + "x".repeat(64), "visit_"]) {
    assert.strictEqual(isProt(k), true, k + " is NOT vault-protected");
  }
  for (const k of ["patients", "visits", "users", "audit"]) {
    assert.strictEqual(isProt(k), true, k + " lost its protection");
  }
  /* And it must not over-reach into things that are deliberately unencrypted. */
  for (const k of ["settings", "archives", "migrations", "kb_overlays"]) {
    assert.strictEqual(isProt(k), false, k + " became encrypted unexpectedly");
  }
});

test("every per-visit key is mirrored", () => {
  const ctx = { console: { log() {}, warn() {}, error() {} },
                JSON, Math, Date, String, Number, Array, Object, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(read("js/data-classification.js"), ctx);
  vm.runInContext(read("js/storage-mirror.js"), ctx, { filename: "storage-mirror.js" });
  const wants = (k) => vm.runInContext("mirrorWants(" + JSON.stringify(k) + ")", ctx);
  for (const k of ["visit_index", "visit_v1", "visit_zzz"]) {
    assert.strictEqual(wants(k), true,
      k + " is not mirrored — the safety net has a hole exactly where the records now live");
  }
  assert.strictEqual(wants("apikey"), false, "the API key must stay out of the mirror");
});


/* ═══ 6. BACKUP AND RESTORE STILL ROUND-TRIP ═══ */

/* Both directions, because a clinic will do both: restore an old backup onto a
   converted device, and restore a new backup onto a fresh install that has not
   converted yet. A backup that only comes home one way is not a backup. */
for (const targetSplit of [false, true]) {
  test("a backup restores onto a device that " +
       (targetSplit ? "HAS split" : "has NOT split"), async () => {
    const a = sandbox({ also: ["js/storage-backup.js"] });
    seed(a, [visit("v1", "p1", ago(1)), visit("v2", "p2", ago(30))]);
    a.run('savePatients([{ id: "p1", first_name: "A" }, { id: "p2", first_name: "B" }]);');
    a.run("visitStoreSplitNow()");
    const parsed = JSON.parse(a.run("JSON.stringify(buildBackupPayload())"));

    assert.strictEqual(parsed.visits.length, 2,
      "the backup must carry the reassembled collection, not the per-visit keys");
    assert.strictEqual(parsed.visit_index, undefined,
      "the index must NOT travel in a backup — a restored index that disagreed with the " +
      "records would read as data loss");

    const b = sandbox({ also: ["js/storage-backup.js"],
                        extra: { confirm: () => true, dlSaveAs: () => true } });
    if (targetSplit) {
      seed(b, [visit("old", "p9", ago(500))]);
      b.run("visitStoreSplitNow()");
      assert.strictEqual(b.run("visitStoreSplit()"), true, "setup");
    }

    b.__p = parsed;
    b.run("_importDecoded(__p)");
    /* The restore takes a safety snapshot first and completes in a promise. */
    for (let i = 0; i < 8; i++) await Promise.resolve();

    assert.strictEqual(b.run("loadVisits().length"), 2, "records did not come home");
    assert.strictEqual(b.run('getPatientVisits("p1")[0].data.final_dx'), "Dry eye");
    assert.strictEqual(b.run('getLastVisit("p2").id'), "v2");
    assert.strictEqual(b.run('storageIsCorrupt("visit_index")'), false,
      "the restore left the index disagreeing with the records");
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* BATCH "NEWEST VISIT PER PATIENT"  (Phase 9 performance fix)      */
/*                                                                  */
/* The home screen built one row per patient and each row called    */
/* getLastVisit(), which re-parsed the whole visit index and then   */
/* read a full visit record. MEASURED in a real browser:            */
/*                                                                  */
/*   patients   renderHome   of which getLastVisit                  */
/*         50        6 ms         2.7 ms  (45%)                     */
/*        200       47 ms        38.2 ms  (81%)                     */
/*        500      254 ms       242.8 ms  (95%)                     */
/*                                                                  */
/* Ten times the patients cost forty-two times the render, on the   */
/* screen a clinician returns to all day. After the batch lookup:   */
/* 254 ms -> 16.3 ms at 500 patients, and near-linear.              */
/*                                                                  */
/* The risk in a change like this is that the fast path and the     */
/* slow path disagree — a row showing the wrong visit status is a   */
/* clinical misstatement, not a cosmetic one. So the tests below    */
/* pin EQUIVALENCE with the original per-patient lookup, not just   */
/* that the batch function returns something.                       */
/* ═══════════════════════════════════════════════════════════════ */

function multiPatientClinic(c) {
  seed(c, [
    /* pA: newest is IN PROGRESS, older one completed */
    visit("a1", "pA", ago(300), { status: "completed" }),
    visit("a2", "pA", ago(2), { status: "in_progress" }),
    /* pB: newest is COMPLETED, older one in progress */
    visit("b1", "pB", ago(200), { status: "in_progress" }),
    visit("b2", "pB", ago(1), { status: "completed" }),
    /* pC: a single visit */
    visit("c1", "pC", ago(50), { status: "completed" })
    /* pD deliberately has no visits at all */
  ]);
}

test("the batch lookup agrees with getLastVisit for every patient", () => {
  const c = sandbox();
  multiPatientClinic(c);
  c.run("visitStoreSplitNow()");

  const batch = c.run("visitStoreLastIndexByPatient()");
  for (const pid of ["pA", "pB", "pC"]) {
    const single = c.run(`(getLastVisit(${JSON.stringify(pid)}) || {}).id`);
    const fromBatch = batch[pid] && batch[pid].id;
    assert.strictEqual(fromBatch, single,
      pid + ": the batch lookup and getLastVisit disagree about the newest visit — " +
      "a patient row would show the wrong status");
  }
});

test("the batch lookup carries the STATUS the row renders", () => {
  /* The row only needs status, which is why the batch reads the index and no
     visit records at all. If status were missing the row would silently show
     every patient as not-yet-completed. */
  const c = sandbox();
  multiPatientClinic(c);
  c.run("visitStoreSplitNow()");
  const batch = c.run("visitStoreLastIndexByPatient()");
  assert.strictEqual(batch.pA.status, "in_progress", "pA's newest visit is in progress");
  assert.strictEqual(batch.pB.status, "completed", "pB's newest visit is completed");
  assert.strictEqual(batch.pC.status, "completed");
});

test("a patient with no visits is absent from the batch, not undefined-shaped", () => {
  const c = sandbox();
  multiPatientClinic(c);
  c.run("visitStoreSplitNow()");
  const batch = c.run("visitStoreLastIndexByPatient()");
  assert.ok(!("pD" in batch), "a patient with no visits must simply not be in the map");
});

test("the batch lookup works on a device that has NOT split yet", () => {
  /* Same fallback contract as every other accessor here: a device mid-upgrade,
     or one restored from an older backup, must still render its home screen. */
  const c = sandbox();
  multiPatientClinic(c);
  assert.strictEqual(c.run("visitStoreSplit()"), false, "setup: not split");
  const batch = c.run("visitStoreLastIndexByPatient()");
  assert.strictEqual(batch.pA && batch.pA.id, "a2");
  assert.strictEqual(batch.pB && batch.pB.status, "completed");
});

test("the batch lookup reads the index ONCE regardless of patient count", () => {
  /* The whole point. Counting reads of the index key proves the fix is
     structural rather than incidentally faster on a small fixture. */
  const c = sandbox();
  multiPatientClinic(c);
  c.run("visitStoreSplitNow()");
  c.run(`
    __reads = 0;
    var _origGet = localStorage.getItem.bind(localStorage);
    localStorage.getItem = function (k) {
      if (k === "entopic_visit_index") __reads++;
      return _origGet(k);
    };
    visitStoreLastIndexByPatient();
  `);
  const reads = c.run("__reads");
  assert.strictEqual(reads, 1,
    "the visit index was read " + reads + " times for one batch lookup; it must be read once");
});
