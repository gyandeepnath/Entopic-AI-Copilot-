/* Certificates — formatted from the exam, never deciding anything. What
   they DO print must be the right numbers for the right patient. */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const read = (f) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");

function load() {
  const ctx = { console, JSON, Math, Date, String, Number, Array, Object, RegExp, renderMain() {} };
  vm.createContext(ctx);
  for (const f of ["js/data-model.js", "js/certificates.js"]) vm.runInContext(read(f), ctx, { filename: f });
  vm.runInContext("function rxStageHasData(st) { return !!(V.rx[st + '_od_sph'] || V.rx[st + '_os_sph']); }", ctx);
  vm.runInContext("var V = blankVisit(); var P = { first_name: 'Asha', last_name: 'K', mrn: 'M1' }; var CV = 'v1', CP = 'p1';", ctx);
  return ctx;
}
const rowsFor = (ctx, secs) => JSON.parse(vm.runInContext("JSON.stringify(certGather(" + JSON.stringify(secs) + "))", ctx));
const row = (rows, l) => (rows.find((r) => r.l === l) || {}).v;

test("spectacle powers are never printed as a contact-lens specification", () => {
  const ctx = load();
  vm.runInContext("V.rx.hab_type = 'Spectacles'; V.rx.hab_od_sph = '-8.00'; V.rx.hab_os_sph = '-7.50';", ctx);
  const r = rowsFor(ctx, ["contactlens"]);
  assert.strictEqual(row(r, "Lens power"), "", "left blank for the fitted power, not filled with spectacle Rx");
  vm.runInContext("V.rx.hab_type = 'Contact lenses';", ctx);
  assert.match(row(rowsFor(ctx, ["contactlens"]), "Lens power"), /-8\.00/);
});

test("an issued prescription with prism prints the prism", () => {
  const ctx = load();
  vm.runInContext("V.rx.fin_od_sph = '+1.00'; V.rx.fin_od_prism = '2'; V.rx.fin_od_base = 'In'; V.rx.fin_os_sph = '+1.00';", ctx);
  assert.match(row(rowsFor(ctx, ["refraction_final"]), "Prescription issued"), /Prism 2 base In/);
});

test("the low-vision certificate offers its blank lines to fill", () => {
  const ctx = load();
  const r = rowsFor(ctx, ["lowvision"]);
  assert.ok(r.some((x) => x.l === "Magnification / aid trialled"), "the rows used to be silently dropped");
});

test("a certificate draft does not follow the clinician to the next patient", () => {
  const ctx = load();
  vm.runInContext("certStart('colour_vision'); CV = 'v2';", ctx);
  assert.strictEqual(vm.runInContext("certDraftForThisVisit()", ctx), null,
    "patient B must not be shown (or print) patient A's certificate");
});

test("the report prints clinic and module sections above the signature, not after it", () => {
  const src = read("js/ui-report.js");
  const sections = src.indexOf("h += mlReportSections()");
  const sign = src.indexOf("print-sign");
  assert.ok(sections > 0 && sign > 0 && sections < sign,
    "content below the signature line is outside what the clinician signed");
});
