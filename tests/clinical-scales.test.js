/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL SCALES                                                  */
/*                                                                  */
/* Two jobs:                                                        */
/*                                                                  */
/*  1. Prove the implementation reproduces the PUBLISHED table      */
/*     exactly — every score 0-4 and both special rules — so a      */
/*     drift in the evaluator shows up as a red test rather than as */
/*     a wrong risk figure in front of a patient.                   */
/*                                                                  */
/*  2. Prove the data file cannot carry an uncited number. Every    */
/*     risk figure must appear in the `verbatim` quote from the     */
/*     source. This is the structural defence against the defect    */
/*     that got the previous calculator quarantined: a number that  */
/*     nobody can trace to a paper fails CI.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function load() {
  const ctx = { console: { log() {}, warn() {}, error() {} }, JSON, Math, Date, String, Number, Array, Object, RegExp };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "knowledge/clinical-scales.js"), "utf8"), ctx, { filename: "clinical-scales.js" });
  vm.runInContext(fs.readFileSync(path.join(ROOT, "js/clinical-scales.js"), "utf8"), ctx, { filename: "js/clinical-scales.js" });
  return ctx;
}

const ctx = load();

/* A visit with explicit answers for both eyes. */
function visitWith(od, os) {
  return { scales: { areds_simplified: { od: od, os: os } } };
}
const NONE = { large_drusen: false, pigment_abnormality: false, intermediate_drusen: false };
function eye(over) { return Object.assign({}, NONE, over || {}); }

function evaluate(v) {
  ctx.__v = v;
  return vm.runInContext("scaleEvaluate('areds_simplified', __v)", ctx);
}


/* ═══ 1. The published table, reproduced exactly ═══ */

test("AREDS: the published 0-4 risk table is reproduced exactly", () => {
  /* Ferris 2005 (PMID 16286620): 0 factors 0.5%; 1 factor 3%; 2 factors 12%;
     3 factors 25%; 4 factors 50%. Built by adding one risk factor at a time. */
  const cases = [
    { od: eye(), os: eye(), score: 0, risk: "0.5%" },
    { od: eye({ large_drusen: true }), os: eye(), score: 1, risk: "3%" },
    { od: eye({ large_drusen: true }), os: eye({ large_drusen: true }), score: 2, risk: "12%" },
    { od: eye({ large_drusen: true, pigment_abnormality: true }), os: eye({ large_drusen: true }), score: 3, risk: "25%" },
    { od: eye({ large_drusen: true, pigment_abnormality: true }), os: eye({ large_drusen: true, pigment_abnormality: true }), score: 4, risk: "50%" }
  ];

  for (const c of cases) {
    const out = evaluate(visitWith(c.od, c.os));
    assert.strictEqual(out.status, "scored", "should score with all inputs answered");
    assert.strictEqual(out.score, c.score, "score for " + JSON.stringify(c.od) + "/" + JSON.stringify(c.os));
    assert.strictEqual(out.risk_text, c.risk, "risk band for score " + c.score);
  }
});

test("AREDS: pigment abnormality alone scores, in either eye", () => {
  /* One risk factor per eye for pigment abnormality, independent of drusen. */
  assert.strictEqual(evaluate(visitWith(eye({ pigment_abnormality: true }), eye())).score, 1);
  assert.strictEqual(evaluate(visitWith(eye(), eye({ pigment_abnormality: true }))).score, 1);
  assert.strictEqual(
    evaluate(visitWith(eye({ pigment_abnormality: true }), eye({ pigment_abnormality: true }))).score, 2);
});

test("AREDS: bilateral intermediate drusen counts ONE factor, and only with no large drusen", () => {
  /* "For persons with no large drusen, presence of intermediate drusen in both
     eyes is counted as 1 risk factor." — one total, not one per eye. */
  const both = evaluate(visitWith(
    eye({ intermediate_drusen: true }), eye({ intermediate_drusen: true })));
  assert.strictEqual(both.score, 1, "bilateral intermediate drusen = 1 factor total, not 2");
  assert.strictEqual(both.risk_text, "3%");

  /* Unilateral intermediate drusen is not a risk factor under this scale. */
  assert.strictEqual(
    evaluate(visitWith(eye({ intermediate_drusen: true }), eye())).score, 0,
    "unilateral intermediate drusen scores 0");

  /* The rule is conditioned on NO large drusen in EITHER eye. */
  const withLarge = evaluate(visitWith(
    eye({ large_drusen: true, intermediate_drusen: true }),
    eye({ intermediate_drusen: true })));
  assert.strictEqual(withLarge.score, 1, "large drusen present → intermediate rule must not fire");
});

test("AREDS: the score is bounded to the published 0-4 range", () => {
  const max = evaluate(visitWith(
    eye({ large_drusen: true, pigment_abnormality: true, intermediate_drusen: true }),
    eye({ large_drusen: true, pigment_abnormality: true, intermediate_drusen: true })));
  assert.strictEqual(max.score, 4, "cannot exceed the published maximum");
  assert.strictEqual(max.risk_text, "50%");
});


/* ═══ 2. Refusal to guess ═══ */

test("AREDS: refuses to produce a risk when any required input is unanswered", () => {
  /* This is the RX-1 lesson: unrecorded is not normal. A patient whose macula
     was never assessed must not be shown "0.5%". */
  const out = evaluate(visitWith(eye({ large_drusen: true }), {}));
  assert.strictEqual(out.status, "incomplete", "must not score on partial data");
  assert.ok(!("risk_text" in out), "an incomplete evaluation must carry no risk figure");
  assert.strictEqual(out.missing.length, 3, "all three OS inputs are outstanding");
  assert.ok(out.missing.every((m) => m.eye === "OS"));
  assert.ok(out.missing.every((m) => typeof m.question === "string" && m.question.length > 0),
    "each missing item names the question to ask the clinician");
});

test("AREDS: an empty visit is incomplete, not zero-risk", () => {
  const out = evaluate({});
  assert.strictEqual(out.status, "incomplete");
  assert.strictEqual(out.missing.length, 6, "3 inputs x 2 eyes");
});

test("a false answer is a real answer; only undefined is missing", () => {
  /* Guards against a truthiness bug turning "clinician said no" into "unknown". */
  const out = evaluate(visitWith(eye(), eye()));
  assert.strictEqual(out.status, "scored");
  assert.strictEqual(out.score, 0);
});

test("an unknown scale id is refused, not silently scored", () => {
  ctx.__v = {};
  const out = vm.runInContext("scaleEvaluate('does_not_exist', __v)", ctx);
  assert.strictEqual(out.status, "unavailable");
});


/* ═══ 3. Suggestions never score by themselves ═══ */

test("recorded findings suggest answers but never score on their own", () => {
  /* The clinician's explicit yes/no is what scores. A finding pre-fills the
     control; it must not substitute for the answer. */
  const v = { fun: { findings: [{ label: "Drusen — large (>125μm)", eye: "OD" }] } };
  const out = evaluate(v);
  assert.strictEqual(out.status, "incomplete", "a finding alone must not produce a score");

  ctx.__v = v;
  const sugg = vm.runInContext("scaleSuggestions(scaleById('areds_simplified'), __v)", ctx);
  assert.strictEqual(sugg.od.large_drusen, "present", "OD suggestion picked up from the finding");
  assert.strictEqual(sugg.os.large_drusen, "not_suggested", "OS has no such finding");
});

test("an OU finding suggests for both eyes; a legacy bare-string finding is treated as OU", () => {
  ctx.__v = { fun: { findings: [{ label: "RPE changes", eye: "OU" }] } };
  let s = vm.runInContext("scaleSuggestions(scaleById('areds_simplified'), __v)", ctx);
  assert.strictEqual(s.od.pigment_abnormality, "present");
  assert.strictEqual(s.os.pigment_abnormality, "present");

  /* Visits recorded before laterality (CL-2) stored a bare string. */
  ctx.__v = { fun: { findings: ["RPE changes"] } };
  s = vm.runInContext("scaleSuggestions(scaleById('areds_simplified'), __v)", ctx);
  assert.strictEqual(s.od.pigment_abnormality, "present", "legacy finding still surfaces");
  assert.strictEqual(s.os.pigment_abnormality, "present");
});

test("the scale only offers itself when a relevant finding is recorded", () => {
  /* A routine exam with a clear macula must not be interrupted by a nudge. */
  ctx.__v = { fun: { findings: [{ label: "Macular hole", eye: "OD" }] } };
  let rel = vm.runInContext("scalesRelevant(__v).map(function (s) { return s.id; })", ctx);
  assert.strictEqual(JSON.stringify(rel), JSON.stringify([]), "irrelevant finding must not trigger the scale");

  ctx.__v = { fun: { findings: [{ label: "Drusen — medium (63-125μm)", eye: "OU" }] } };
  rel = vm.runInContext("scalesRelevant(__v).map(function (s) { return s.id; })", ctx);
  assert.strictEqual(JSON.stringify(rel), JSON.stringify(["areds_simplified"]));
});


/* ═══ 4. The data file cannot carry an uncited number ═══ */

test("every risk figure in every scale appears verbatim in its cited source quote", () => {
  const scales = vm.runInContext("CLINICAL_SCALES", ctx);
  assert.ok(scales.length > 0, "there is at least one scale");

  for (let i = 0; i < scales.length; i++) {
    const s = scales[i];
    assert.ok(s.source && s.source.citation && s.source.doi && s.source.pmid,
      s.id + " must carry a full citation with DOI and PMID");
    assert.ok(typeof s.verbatim === "string" && s.verbatim.length > 50,
      s.id + " must quote the source text its numbers came from");

    for (let b = 0; b < s.bands.length; b++) {
      const risk = s.bands[b].risk_text;
      assert.ok(s.verbatim.indexOf(risk) >= 0,
        s.id + ": risk figure \"" + risk + "\" does not appear in the quoted source text. " +
        "Every number must be traceable to the paper — this is the check that would have " +
        "caught the fabricated OHTS/AREDS2 percentages.");
    }
  }
});

test("every scale ships provisional until a clinician verifies it", () => {
  const scales = vm.runInContext("CLINICAL_SCALES", ctx);
  for (const s of scales) {
    assert.ok(s.review_status === "NEEDS_CLINICAL_REVIEW" || s.review_status === "VERIFIED_BY_CLINICIAN",
      s.id + " has an invalid review_status: " + s.review_status);
  }
});

test("a scored result declares whether the scale is still provisional", () => {
  const out = evaluate(visitWith(eye(), eye()));
  assert.strictEqual(out.provisional, true,
    "until the founder signs AREDS off, every result must say so");
  assert.ok(out.source && out.source.pmid === "16286620", "the result carries its citation");
});

test("scales that cannot be reproduced from published material are recorded, not guessed", () => {
  const un = vm.runInContext("UNIMPLEMENTABLE_SCALES", ctx);
  const ohts = un.filter((s) => s.id === "ohts_egps_poag_5yr");
  assert.strictEqual(ohts.length, 1, "OHTS must stay on the record as deliberately unimplemented");
  assert.ok(ohts[0].reason.length > 50, "with the reason stated");
  assert.ok(ohts[0].source.pmid === "17095090", "and its citation");

  /* And it must NOT have leaked into the implemented list. */
  const ids = vm.runInContext("CLINICAL_SCALES.map(function (s) { return s.id; })", ctx);
  assert.ok(ids.indexOf("ohts_egps_poag_5yr") === -1,
    "OHTS must not appear as an implemented scale without its coefficients");
});
