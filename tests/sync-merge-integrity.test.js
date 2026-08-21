/* ═══════════════════════════════════════════════════════════════ */
/* SYNC MERGE — NOTHING LOST, NOTHING RESURRECTED, NOTHING SWAPPED  */
/*                                                                  */
/* Promoted from tools/stress/sync.js.                              */
/*                                                                  */
/* cloudMergeRows is the only place in the product where a patient  */
/* record changes without a clinician touching it. Rows arrive as   */
/* JSON from another device and nothing re-validates them, so the   */
/* failures that matter are, in order:                              */
/*                                                                  */
/*   1. a record that existed is GONE                               */
/*   2. a record that was deleted COMES BACK                        */
/*   3. one patient's data lands under another patient's id         */
/*   4. a local edit is overwritten without being flagged           */
/*                                                                  */
/* Three defects were found and are pinned here. The worst was (3): */
/* a row whose envelope id disagreed with its payload id wrote one  */
/* patient's record into another patient's slot.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function ctx() {
  const store = {};
  const c = {
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} },
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] ?? null
    },
    logAudit: () => {}, evEmit: () => {},
    CLOUD: { conflicts: [], _suppress: false, queue: [], tombstones: [] },
    CV: null, CP: null,
    cloudEnabled: () => true, cloudSignedIn: () => true,
    cloudRerender: () => {}, cloudPersistQueue: () => {},
    phiArmed: () => false
  };
  vm.createContext(c);
  for (const f of ["js/data-classification.js", "js/storage.js", "js/cloud-replication.js"]) {
    vm.runInContext(read(f), c, { filename: f });
  }
  vm.runInContext("logAudit = function () {};", c);
  c.run = (e) => vm.runInContext(e, c);
  return c;
}

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-02-01T00:00:00.000Z";
const T2 = "2026-03-01T00:00:00.000Z";
const pt = (id, updated, extra) => Object.assign(
  { id, first_name: "A", last_name: "B", mrn: "M-" + id, updated, created: updated }, extra || {});


test("a hostile record id cannot crash the merge or stop the rest of the batch", () => {
  /* The index is keyed by record id and asked about ids that are usually
     absent, so on a plain object "__proto__" / "constructor" / "toString"
     returned something that is not an index. The crash aborted the WHOLE
     batch, so one hostile id stopped every legitimate record syncing. */
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  c.__rows = [
    { id: "__proto__", updated_at: T1, data: pt("__proto__", T1) },
    { id: "constructor", updated_at: T1, data: pt("constructor", T1) },
    { id: "toString", updated_at: T1, data: pt("toString", T1) },
    { id: "p1", updated_at: T1, data: pt("p1", T1, { first_name: "STILL-MERGED" }) }
  ];
  assert.doesNotThrow(() => c.run(`cloudMergeRows("patients", __rows)`),
    "a hostile record id crashed the sync merge");
  const names = JSON.parse(c.run(`JSON.stringify(loadPatients().map(function(p){return p.first_name}))`));
  assert.ok(names.includes("STILL-MERGED"),
    "a hostile id in the batch stopped a legitimate record merging");
  assert.strictEqual(c.run("({}).id === undefined"), true, "the merge polluted Object.prototype");
});

test("a row addressed to one patient cannot overwrite another patient", () => {
  /* THE WORST OUTCOME IN THIS FILE. The envelope id is what the row is
     addressed to; rec.id is what the payload claims to be. When they disagree
     the row is not stale, it is wrong. */
  const c = ctx();
  c.run(`savePatients([
    ${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "PATIENT-ONE" }))},
    ${JSON.stringify(pt("p2", T0, { _cloud_updated: T0, first_name: "PATIENT-TWO" }))}
  ]);`);
  c.__rows = [{ id: "p1", updated_at: T2, data: pt("p2", T2, { first_name: "IMPOSTOR" }) }];
  c.run(`cloudMergeRows("patients", __rows)`);

  const all = JSON.parse(c.run("JSON.stringify(loadPatients())"));
  const p2 = all.filter((p) => p.id === "p2");
  assert.strictEqual(p2.length, 1, "the id mismatch duplicated a patient");
  assert.strictEqual(p2[0].first_name, "PATIENT-TWO",
    "one patient's data was written into another patient's record");
  assert.ok(c.run("cloudConflicts().length") > 0,
    "the mismatch was refused but never surfaced to anyone");
});

test("a non-object payload is skipped rather than throwing", () => {
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  for (const s of ['[{ id: "p1", data: "notanobject" }]', '[{ id: "p1", data: 7 }]',
                   '[{ id: "p1", data: [] }]', '[null]', '[0]', '[{ id: null }]']) {
    assert.doesNotThrow(() => c.run(`cloudMergeRows("patients", ${s})`),
      "the merge threw on " + s);
  }
  assert.ok(c.run("loadPatients().length") >= 1, "a hostile batch emptied the store");
});

test("an unpushed local edit is never silently overwritten", () => {
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T2, { _cloud_updated: T0, first_name: "LOCAL-EDIT" }))}]);`);
  c.__rows = [{ id: "p1", updated_at: T1, data: pt("p1", T1, { first_name: "REMOTE" }) }];
  c.run(`cloudMergeRows("patients", __rows)`);
  assert.strictEqual(c.run("loadPatients()[0].first_name"), "LOCAL-EDIT");
  assert.ok(c.run("cloudConflicts().length") > 0, "the conflict was never surfaced");
});

test("a newer remote record DOES replace an untouched local one (positive control)", () => {
  /* The fixes must not turn the merge into one that refuses everything. */
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "OLD" }))}]);`);
  c.__rows = [{ id: "p1", updated_at: T1, data: pt("p1", T1, { first_name: "NEW" }) }];
  assert.strictEqual(c.run(`cloudMergeRows("patients", __rows)`), 1);
  assert.strictEqual(c.run("loadPatients()[0].first_name"), "NEW");
});

test("a remote delete in the shape this app sends is honoured", () => {
  /* cloudDrainTombstones sends data:{id,deleted:true}. A row with data:null
     means "could not be decrypted", and skipping THAT is correct. */
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  c.__rows = [{ id: "p1", updated_at: T1, data: { id: "p1", deleted: true }, deleted: true }];
  c.run(`cloudMergeRows("patients", __rows)`);
  assert.strictEqual(c.run("loadPatients().length"), 0, "a remote delete was ignored");
});

test("a remote delete does not destroy an unpushed local edit", () => {
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T2, { _cloud_updated: T0, first_name: "LOCAL" }))}]);`);
  c.__rows = [{ id: "p1", updated_at: T1, data: { id: "p1", deleted: true }, deleted: true }];
  c.run(`cloudMergeRows("patients", __rows)`);
  assert.strictEqual(c.run("loadPatients().length"), 1,
    "a remote delete destroyed a record this device had edited and not yet sent");
});

test("an undecryptable row never replaces a real record", () => {
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "REAL" }))}]);`);
  c.run(`cloudMergeRows("patients", [{ id: "p1", updated_at: "${T2}", data: null }])`);
  assert.strictEqual(c.run("loadPatients()[0].first_name"), "REAL");
});

test("an unparseable timestamp loses rather than wins", () => {
  const c = ctx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T1, { _cloud_updated: T1, first_name: "GOOD" }))}]);`);
  c.__rows = [{ id: "p1", updated_at: "not-a-date", data: pt("p1", T2, { first_name: "GARBAGE" }) }];
  c.run(`cloudMergeRows("patients", __rows)`);
  assert.strictEqual(c.run("loadPatients()[0].first_name"), "GOOD",
    "corrupt sync metadata overwrote a good record");
});

test("replaying the same batch does not duplicate records", () => {
  const c = ctx();
  c.run(`savePatients([]);`);
  c.__rows = [{ id: "p1", updated_at: T1, data: pt("p1", T1) },
              { id: "p2", updated_at: T1, data: pt("p2", T1) }];
  c.run(`cloudMergeRows("patients", __rows)`);
  c.run(`cloudMergeRows("patients", __rows)`);
  assert.strictEqual(c.run("loadPatients().length"), 2);
});

test("the visit open in the exam right now is never replaced under the clinician", () => {
  const c = ctx();
  c.run(`CV = "vOpen";
         saveVisits([{ id:"vOpen", patient_id:"p1", date:"${T0}", status:"in_progress",
                       _cloud_updated:"${T0}", data:{ marker:"MINE" } }]);`);
  c.__rows = [{ id: "vOpen", updated_at: T2,
                data: { id: "vOpen", patient_id: "p1", date: T2, status: "completed",
                        data: { marker: "THEIRS" } } }];
  c.run(`cloudMergeRows("visits", __rows)`);
  assert.strictEqual(c.run("loadVisits()[0].data.marker"), "MINE",
    "a visit was overwritten mid-exam from another device");
});
