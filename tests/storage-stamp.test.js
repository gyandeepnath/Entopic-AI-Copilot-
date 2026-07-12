/* ═══════════════════════════════════════════════════════════════ */
/* PER-RECORD UPDATE STAMPS (doSave)                                */
/* Cloud LWW correctness depends on doSave stamping `updated` on the */
/* patient ONLY when the record actually changed. Stamping on every   */
/* autosave would make an untouched patient look freshly edited and   */
/* let this device overwrite another device's newer edit.             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..");

function makeSandbox() {
  const store = new Map();
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    Date, JSON, Set, Math, String, Number, parseFloat, parseInt,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getElementById: () => null },
    alert: () => {},
    STEPS: [],
    CV: null, CP: null, V: {}, P: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(REPO, "js", "storage.js"), "utf8"), sandbox, { filename: "storage.js" });
  return sandbox;
}

test("doSave stamps patient.updated only when the record actually changed", () => {
  const sb = makeSandbox();
  const oldStamp = "2026-07-01T00:00:00.000Z";
  sb.savePatients([{ id: "p1", first_name: "Asha", updated: oldStamp }]);
  sb.saveVisits([{ id: "v1", patient_id: "p1", data: {}, updated: oldStamp }]);
  sb.CP = "p1"; sb.CV = "v1";

  /* No change: P mirrors the stored record exactly. */
  sb.P = { id: "p1", first_name: "Asha", updated: oldStamp };
  sb.V = {};
  sb.doSave();
  assert.strictEqual(sb.loadPatients()[0].updated, oldStamp,
    "untouched patient keeps its old stamp (no silent 'newest' claim)");

  /* Real change: stamp must advance, and P must carry the same stamp so
     the next unchanged save does not re-stamp. */
  sb.P = { id: "p1", first_name: "Asha EDITED", updated: oldStamp };
  sb.doSave();
  const stamped = sb.loadPatients()[0].updated;
  assert.notStrictEqual(stamped, oldStamp, "edited patient gets a fresh stamp");
  assert.strictEqual(sb.P.updated, stamped, "in-memory P carries the new stamp");

  /* Following save with no further edits: stamp stays put. */
  sb.doSave();
  assert.strictEqual(sb.loadPatients()[0].updated, stamped,
    "no re-stamp on the next unchanged save");
});

test("doSave always refreshes the open visit's updated stamp", () => {
  const sb = makeSandbox();
  sb.savePatients([{ id: "p1" }]);
  sb.saveVisits([{ id: "v1", patient_id: "p1", data: {}, updated: "2026-07-01T00:00:00.000Z" }]);
  sb.CP = "p1"; sb.CV = "v1";
  sb.P = { id: "p1" };
  sb.V = { cc: "new complaint" };
  sb.doSave();
  const v = sb.loadVisits()[0];
  assert.notStrictEqual(v.updated, "2026-07-01T00:00:00.000Z", "open visit is stamped on save");
  assert.deepStrictEqual(JSON.parse(JSON.stringify(v.data)), { cc: "new complaint" });
});
