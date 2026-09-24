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


/* ═══ FREE TEXT IS DE-IDENTIFIED TOO  (full audit, 2026-09-24) ═══
   The structured identifiers were already kept out, but the chief complaint
   and the SPEECH parser's verbatim transcript went to the API as typed or
   spoken — "my name is Priya, call me on 98765 43210" included. */
test("every outbound LLM prompt is scrubbed of the patient's identifiers", () => {
  const sb = makeSandbox();
  sb.P = { first_name: "Priya", last_name: "Sharma", mrn: "EP-7781", phone: "98765 43210",
           email: "priya@example.com", address: "12 Lake Road" };
  let sent = "";
  sb.fetch = (url, opts) => { sent = opts.body; return { then: () => ({ then: () => ({ catch() {} }) }) }; };
  sb.API_KEY = "k";
  vm.runInContext("callClaudeAPI('sys', " + JSON.stringify(
    "Patient said: my name is Priya Sharma, MRN EP-7781, call 98765 43210 or +44 20 7946 0958, " +
    "email priya@example.com, born 14/03/1975, lives at 12 Lake Road. Rx -3.00/-1.25 x 90, VA 6/12, IOP 15 16."
  ) + ", 100, function(){}, function(){})", sb);
  for (const pii of ["Priya", "Sharma", "EP-7781", "98765", "7946", "priya@example.com", "14/03/1975", "12 Lake Road"]) {
    assert.strictEqual(sent.indexOf(pii), -1, "sent to the LLM API: " + pii);
  }
  /* clinical numbers survive */
  for (const keep of ["-3.00/-1.25 x 90", "6/12", "IOP 15 16"]) {
    assert.ok(sent.indexOf(keep) >= 0, "de-identification destroyed clinical data: " + keep);
  }
});

test("the speech parser keeps the patient's words and accepts only real symptom tokens", () => {
  const ctx = { console: { log() {}, warn() {}, error() {} }, SYM_CATS: { vision: { blur: "Blur", flashes: "Flashes" } },
                V: { cc: "", symptoms: [], foldarq: {} } };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(REPO, "js", "speech.js"), "utf8"), ctx);
  const reply = JSON.stringify({
    chief_complaint: "Acute retinal detachment with macula-off vision loss",
    symptoms: ["blur", "sudden_vision_loss", "retinal_detachment", 7, null],
    foldarq: { O: "two days ago", __proto__: { polluted: true }, X: "no" }
  });
  vm.runInContext("handleSpeechParseResponse(" + JSON.stringify(reply) + ", 'my vision is a bit blurry', null)", ctx);
  assert.strictEqual(ctx.V.cc, "my vision is a bit blurry", "the engine must read what the patient said");
  assert.ok(/retinal detachment/i.test(ctx.V.cc_ai), "the model's wording is offered, not applied");
  assert.strictEqual(ctx.V.symptoms.join(","), "blur", "an invented or red-flag token from the model entered the visit");
  assert.strictEqual(ctx.V.foldarq.O, "two days ago");
  assert.strictEqual(ctx.V.foldarq.X, undefined);
});
