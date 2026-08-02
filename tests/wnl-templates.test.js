/* ═══════════════════════════════════════════════════════════════ */
/* "NORMAL (WNL)" QUICK-FILL TEMPLATES                              */
/*                                                                  */
/* The governing rule: a template may assert a normal RESULT; it     */
/* must not invent a MEASUREMENT. Writing "IOP 15 mmHg" into a       */
/* record where nobody measured the pressure puts a fabricated       */
/* number in a medical record — the same defect as the prescription  */
/* that printed "plano" for an unmeasured refraction.                */
/*                                                                  */
/* Three templates PREDATE that rule and do write numbers. They are  */
/* grandfathered WITH their exact values, so the test fails if they  */
/* change or if a NEW template starts inventing numbers. That is the */
/* ratchet: the problem cannot spread while the founder decides      */
/* what to do about the three that exist (Safety Register CS-01).    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Templates known to write a numeric measurement, with the value each writes.
   This list must only ever SHRINK. */
const GRANDFATHERED_NUMERIC = {
  /* CONTINUOUS MEASUREMENTS — the real problem. You cannot know these without
     performing the test, so writing one asserts an examination happened. */
  va: ["6/6"],
  iop: ["15"],
  fundus: ["0.3"],

  /* CATEGORICAL GRADES that happen to be written as numbers, which is a
     different thing and defensible. Anterior-chamber cells and flare are
     graded on an ordinal scale whose normal grade IS "0"; "0 cells" is the
     result of looking, not a substitute for looking, in the same way that
     "Orthophoria" is. Listed here so the ratchet still notices if the values
     change, but distinguished from the three above because they are NOT part
     of the CS-01 decision. */
  slit_lamp: ["0"]
};

function loadTemplates(visit) {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object,
    module: { exports: {} },
    V: visit
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/wnl-templates.js"), ctx, { filename: "wnl-templates.js" });
  return ctx;
}

const blank = () => ({
  va: { od_un: "", os_un: "" },
  iop: { od: "", os: "", method: "" },
  sl: { od: { lids: "", conj: "", cornea: "", cells: "", flare: "", iris: "" },
        os: { lids: "", conj: "", cornea: "", cells: "", flare: "", iris: "" } },
  pupil: { rapd: "", notes: "" },
  mot: { versions: "", ductions: "" },
  gon: { od: { s: "" }, os: { s: "" } },
  fun: { od: { cd_v: "" }, os: { cd_v: "" } },
  neuro: { color_od: "", notes: "" },
  bv: { ct_type_d: "", ct_type_n: "", comitancy: "", w4d: "", w4n: "",
        correspondence: "", stereo: "", npc_b: "", npc_r: "", bo_d_bl: "", acc_od: "" }
});

/* Every value a template writes, flattened. */
function valuesWritten(step) {
  const v = blank();
  const ctx = loadTemplates(v);
  const tpl = ctx.WNL_TEMPLATES[step];
  if (!tpl) return null;
  tpl.call(ctx);
  const out = [];
  (function walk(o) {
    for (const k in o) {
      const x = o[k];
      if (x && typeof x === "object") walk(x);
      else if (x !== "" && x !== undefined && x !== null) out.push(String(x));
    }
  })(v);
  return out;
}

const looksNumeric = (s) => /^[\d.]+$/.test(s) || /^\d+\/\d+$/.test(s);


test("NO NEW template invents a measurement", () => {
  /* The ratchet. Only va, iop and fundus may write a number, and only the
     exact numbers they already write. */
  const ctx = loadTemplates(blank());
  const offenders = [];

  for (const step of Object.keys(ctx.WNL_TEMPLATES)) {
    const written = valuesWritten(step);
    const numeric = written.filter(looksNumeric);
    if (!numeric.length) continue;

    const allowed = GRANDFATHERED_NUMERIC[step];
    if (!allowed) {
      offenders.push(step + " writes " + JSON.stringify(numeric) +
        " — a template may assert a normal RESULT, never invent a MEASUREMENT");
      continue;
    }
    const unexpected = numeric.filter((n) => !allowed.includes(n));
    if (unexpected.length) {
      offenders.push(step + " writes new numeric value(s) " + JSON.stringify(unexpected));
    }
  }

  assert.deepStrictEqual(offenders, [],
    "see js/wnl-templates.js and Safety Register CS-01:\n  " + offenders.join("\n  "));
});

test("the grandfathered list only shrinks", () => {
  /* If a template stops writing numbers, its entry must be removed here — so
     the list is an accurate statement of the remaining problem, not a
     permanent excuse. */
  const stale = [];
  for (const step of Object.keys(GRANDFATHERED_NUMERIC)) {
    const written = valuesWritten(step);
    if (written === null) { stale.push(step + " (template no longer exists)"); continue; }
    if (!written.some(looksNumeric)) stale.push(step + " (no longer writes a number — delete this entry)");
  }
  assert.deepStrictEqual(stale, [], "stale entries:\n  " + stale.join("\n  "));
});

test("the binocular-vision template writes categorical results only", () => {
  /* Added after the rule existed, so it is the worked example. Orthophoria and
     fusion are RESULTS of a test that was performed. A stereo threshold in
     seconds of arc or an NPC break in centimetres is a number somebody
     obtained. */
  const v = blank();
  const ctx = loadTemplates(v);
  ctx.WNL_TEMPLATES.bv.call(ctx);

  assert.strictEqual(v.bv.ct_type_d, "Orthophoria");
  assert.strictEqual(v.bv.comitancy, "Comitant");
  assert.strictEqual(v.bv.w4d, "Fusion (4 dots)");

  for (const numericField of ["stereo", "npc_b", "npc_r", "bo_d_bl", "acc_od"]) {
    assert.strictEqual(v.bv[numericField], "",
      "bv template must not invent " + numericField + " — that is a measurement");
  }
});

test("a template never overwrites something already recorded", () => {
  const v = blank();
  v.iop.od = "31";
  const ctx = loadTemplates(v);
  ctx.WNL_TEMPLATES.iop.call(ctx);
  assert.strictEqual(v.iop.od, "31", "a real measurement must survive the quick-fill");
});

test("the rule is written where the next author will read it", () => {
  const src = read("js/wnl-templates.js");
  assert.ok(/MEASUREMENT/.test(src) && /RESULT/.test(src),
    "the measurement-versus-result rule must be stated in the file itself");
  assert.ok(/CS-01/.test(src), "the open founder decision must be referenced");
});
