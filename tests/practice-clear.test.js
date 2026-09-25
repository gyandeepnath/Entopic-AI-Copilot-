/* Clearing practice exams — a bulk delete, held to deletePatient's rules:
   every write checked, all or nothing, and the deletes sent to other devices
   as tombstones (practice records sync like any other; without tombstones
   they came back on the next cloud pull). */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

function makeSandbox() {
  const store = new Map();
  const sb = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    Date, JSON, Set, Math, String, Number, Array, Object, RegExp, Promise, parseFloat, parseInt,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getElementById: () => null },
    alerts: [], tombs: [],
    confirm: () => true,
    renderHome: () => {},
    STEPS: [], CV: null, CP: null, V: {}, P: {}
  };
  sb.alert = (m) => sb.alerts.push(String(m));
  sb.cloudEnqueueDelete = (k, id) => sb.tombs.push(k + ":" + id);
  vm.createContext(sb);
  for (const f of ["js/storage.js", "js/ui-patient-list.js", "js/ui-study.js"]) {
    vm.runInContext(read(f), sb, { filename: f });
  }
  sb.savePatients([{ id: "real1" }, { id: "pr1", practice: true }, { id: "pr2", practice: true }]);
  sb.saveVisits([{ id: "v1", patient_id: "real1", data: {} }, { id: "v2", patient_id: "pr1", data: {} },
                 { id: "v3", patient_id: "pr2", data: {} }]);
  return sb;
}

test("clearing practice exams removes only practice records and tells other devices", () => {
  const sb = makeSandbox();
  sb.clearPracticeExams();
  assert.deepStrictEqual(sb.loadPatients().map((p) => p.id).join(), "real1");
  assert.deepStrictEqual(sb.loadVisits().map((v) => v.id).join(), "v1");
  assert.deepStrictEqual(sb.tombs.slice().sort().join(),
    ["patients:pr1", "patients:pr2", "visits:v2", "visits:v3"].join(),
    "every removed record must be tombstoned, or it resurrects from the cloud");
});

test("a refused write deletes nothing and says so", () => {
  const sb = makeSandbox();
  vm.runInContext("savePatients = function () { return false; }", sb);
  sb.clearPracticeExams();
  assert.strictEqual(sb.loadVisits().length, 3, "visits restored — all or nothing");
  assert.strictEqual(sb.tombs.length, 0, "no deletion notices for a delete that did not happen");
  assert.match(sb.alerts.pop() || "", /nothing was deleted/);
});
