/* ═══════════════════════════════════════════════════════════════ */
/* LLM PRIVACY FIREWALL                                             */
/* Guardrail: PII must NEVER be sent to the LLM API. The only        */
/* demographics allowed in the interpretive-remarks prompt are age    */
/* and sex. This pins buildClinicalSummary (js/claude.js) to that.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..");

function makeSandbox() {
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    Date, JSON, Math, String, Number,
    document: { getElementById: () => null, createElement: () => ({ style: {}, remove() {} }) },
    fetch: () => ({ then: () => ({ then: () => ({ catch() {} }) }) }),
    API_KEY: "",
    SYM_CATS: {},
    P: {}, V: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(REPO, "js", "claude.js"), "utf8"), sandbox, { filename: "claude.js" });
  return sandbox;
}

test("the LLM prompt summary contains no PII (name, MRN, DOB, contact)", () => {
  const sb = makeSandbox();
  sb.P = {
    id: "p1", mrn: "EP-SECRET42", first_name: "Priya", last_name: "Sharma",
    dob: "1975-03-14", age: 51, sex: "Female",
    phone: "9876543210", email: "priya@example.com", address: "12 Lake Road"
  };
  sb.V = {
    cc: "blurred vision",
    symptoms: [], hxM: {}, hxF: {}, va: {}, rx: {}, iop: {}, sl: null,
    pupil: null, bv: null, fun: null, temporal: null
  };
  const s = sb.buildClinicalSummary();
  assert.ok(s.length > 0, "summary builds");
  for (const pii of ["Priya", "Sharma", "EP-SECRET42", "1975-03-14", "9876543210", "priya@example.com", "12 Lake Road"]) {
    assert.strictEqual(s.indexOf(pii), -1, "summary must not contain PII: " + pii);
  }
  assert.ok(s.indexOf("Age 51") >= 0, "age (clinically needed, de-identified) is present");
  assert.ok(s.indexOf("Female") >= 0, "sex is present");
});
