/* ═══════════════════════════════════════════════════════════════ */
/* SECTION STATUS — "not assessed" as a clinical statement          */
/*                                                                  */
/* An empty field used to mean three things at once: examined and    */
/* normal, deliberately skipped, or forgotten. In glaucoma           */
/* follow-up "gonioscopy not performed" and "gonioscopy normal" are  */
/* very different statements, and the record could not tell them     */
/* apart. Safety Register CS-05, Human Factors HF-02.                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* The module reads stepHasData / STEPS / CU / logAudit from globals. Stub the
   ones that are not under test so the logic itself is what is exercised. */
function load(opts) {
  opts = opts || {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, parseInt,
    module: { exports: {} },
    STEPS: [
      { id: "va", l: "Visual Acuity" }, { id: "iop", l: "IOP / Tonometry" },
      { id: "gonioscopy", l: "Gonioscopy" }, { id: "fundus", l: "Fundus / Posterior" },
      { id: "slit_lamp", l: "Slit Lamp" }, { id: "refraction", l: "Refraction" },
      { id: "dilation", l: "Dilation" }, { id: "pupil", l: "Pupils" },
      { id: "motility", l: "Ocular Motility" }, { id: "bv", l: "Binocular Vision" },
      { id: "neuro", l: "Neuro-Ophthalmology" }, { id: "investigations", l: "Investigations" }
    ],
    CU: { name: "Dr Test" },
    audit: [],
    stepHasData: opts.hasData || (() => false)
  };
  ctx.logAudit = (a, d) => ctx.audit.push({ a, d });
  vm.createContext(ctx);
  vm.runInContext(read("js/section-status.js"), ctx, { filename: "section-status.js" });
  vm.runInContext("var V = " + JSON.stringify(opts.visit || { step: "va" }) + ";", ctx);
  return ctx;
}


/* ── The four states ───────────────────────────────────────────── */

test("an untouched section reads as untouched, not as normal", () => {
  const c = load();
  assert.strictEqual(c.sectionStatus(c.V, "gonioscopy"), "",
    "silence must never be read as a normal result");
});

test("a section can be recorded as deliberately not assessed, with a reason", () => {
  const c = load();
  c.V.step = "gonioscopy";
  assert.strictEqual(c.sectionStatusSet("gonioscopy", "not_done", "Patient declined"), true);
  assert.strictEqual(c.sectionStatus(c.V, "gonioscopy"), "not_done");
  assert.strictEqual(c.sectionStatusReason(c.V, "gonioscopy"), "Patient declined");
});

test("marking a section not assessed is written to the audit trail", () => {
  /* Choosing not to examine something is a clinical decision and belongs in
     the record of the encounter alongside everything else. */
  const c = load();
  c.sectionStatusSet("gonioscopy", "not_done", "Unable to cooperate");
  assert.strictEqual(c.audit.length, 1, "expected one audit entry");
  assert.strictEqual(c.audit[0].a, "section_not_assessed");
  assert.ok(/gonioscopy/.test(c.audit[0].d));
});

test("a normal result is distinct from an untouched section", () => {
  const c = load();
  c.sectionStatusSet("iop", "normal");
  assert.strictEqual(c.sectionStatus(c.V, "iop"), "normal");
  assert.strictEqual(c.sectionStatus(c.V, "va"), "");
});


/* ── The rule that makes it safe: data outranks the flag ───────── */

test("real findings override a stale not-assessed flag", () => {
  /* The dangerous failure would be a flag hiding data that is genuinely in the
     record. Data always wins. */
  const c = load({ hasData: (step) => step === "fundus" });
  c.sectionStatusSet("fundus", "not_done", "Patient declined");
  assert.strictEqual(c.sectionStatus(c.V, "fundus"), "abnormal",
    "a section holding findings must never report as not assessed");
});

test("a section claimed abnormal but holding no data says nothing", () => {
  const c = load({ hasData: () => false });
  c.sectionStatusSet("fundus", "abnormal");
  assert.strictEqual(c.sectionStatus(c.V, "fundus"), "",
    "an unsupported claim of abnormality must not be reported as fact");
});


/* ── Backward compatibility ────────────────────────────────────── */

test("visits saved before this feature read as untouched, not as an error", () => {
  const c = load({ visit: { step: "va" } });               /* no sectionStatus map */
  assert.strictEqual(c.sectionStatus(c.V, "iop"), "");
  assert.strictEqual(c.sectionStatusNotDone(c.V).length, 0);
  assert.strictEqual(c.sectionStatusUntouched(c.V).length, c.STATUS_SECTIONS.length);
});


/* ── What the report needs ─────────────────────────────────────── */

test("the summary counts every section exactly once", () => {
  const c = load({ hasData: (s) => s === "slit_lamp" });
  c.sectionStatusSet("iop", "normal");
  c.sectionStatusSet("gonioscopy", "not_done", "Not clinically indicated");
  const s = c.sectionStatusSummary(c.V);
  assert.strictEqual(s.assessed + s.normal + s.not_done + s.untouched,
    c.STATUS_SECTIONS.length, "every section must land in exactly one bucket");
  assert.strictEqual(s.assessed, 1);
  assert.strictEqual(s.normal, 1);
  assert.strictEqual(s.not_done, 1);
});

test("declined sections are listed with their reasons and readable labels", () => {
  const c = load();
  c.sectionStatusSet("gonioscopy", "not_done", "Patient declined");
  const list = c.sectionStatusNotDone(c.V);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0].label, "Gonioscopy", "the report needs a human label");
  assert.strictEqual(list[0].reason, "Patient declined");
});

test("clearing the state returns the section to untouched", () => {
  const c = load();
  c.sectionStatusSet("iop", "not_done", "Time constraint");
  c.sectionStatusSet("iop", "");
  assert.strictEqual(c.sectionStatus(c.V, "iop"), "");
});


/* ── The boundary: this must never reach the engine ────────────── */

test("section status is not consumed by the diagnostic engine", () => {
  /* If "not assessed" became a pertinent negative, the software would turn
     "I didn't look" into "I looked and it was fine" — the exact confusion this
     module exists to remove. */
  const engine = read("js/engine.js");
  for (const name of ["sectionStatus", "sectionStatusRaw", "sectionStatusSet",
                      "NOT_DONE_REASONS", "STATUS_SECTIONS"]) {
    assert.ok(!new RegExp("\\b" + name + "\\b").test(engine),
      "js/engine.js must not read section status — it saw '" + name + "'");
  }
});

test("only sections where the statement is meaningful are offered", () => {
  const c = load();
  assert.ok(c.sectionStatusApplies("gonioscopy"));
  assert.ok(c.sectionStatusApplies("fundus"));
  assert.ok(!c.sectionStatusApplies("report"), "'not assessed' is meaningless for a report");
  assert.ok(!c.sectionStatusApplies("coding"));
  assert.ok(!c.sectionStatusApplies("demographics"));
});

test("an unknown state is refused rather than stored", () => {
  const c = load();
  assert.strictEqual(c.sectionStatusSet("iop", "probably_fine"), false);
  assert.strictEqual(c.sectionStatus(c.V, "iop"), "");
});


/* ── The wiring exists ─────────────────────────────────────────── */

test("the report says what was NOT assessed", () => {
  /* A report listing only findings lets a reader assume everything unmentioned
     was examined and normal. */
  assert.ok(/sectionStatusReportBlock/.test(read("js/ui-report.js")),
    "the report must include the completeness block");
});

test("the button is offered and both modules are loaded", () => {
  const html = read("index.html");
  assert.ok(/id="hdrNotDone"/.test(html), "the header button must exist");
  assert.ok(/<script src="js\/section-status\.js">/.test(html));
  assert.ok(/<script src="js\/ui-section-status\.js">/.test(html));

  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/section-status.js") < order.indexOf("js/ui-section-status.js"),
    "the model must load before its UI");
});
