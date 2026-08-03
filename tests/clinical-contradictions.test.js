/* ═══════════════════════════════════════════════════════════════ */
/* CONTRADICTION DETECTION  (Phase 4 finding F-2)                   */
/*                                                                  */
/* Two individually-plausible values that cannot both be true. The   */
/* per-field validator cannot see these: a cylinder of −1.25 is      */
/* plausible, a blank axis is plausible, and a cylinder with no      */
/* axis is not a prescription.                                       */
/*                                                                  */
/* The tests that matter most are the NEGATIVE ones. A checker that  */
/* flags every visit is worse than none, because it trains the       */
/* clinician to ignore it — the same failure as alert fatigue.       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const C = require("../js/clinical-contradictions.js");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const ids = (v, p) => C.clinContradictions(v, p).map((x) => x.id);


/* ── CERTAIN: definitional, reported as errors ── */

test("a cylinder with no axis is an error — it cannot be dispensed", () => {
  const r = C.clinContradictions({ rx: { od_cyl: "-1.25", od_ax: "" } }, null);
  assert.strictEqual(r.length, 1);
  assert.strictEqual(r[0].id, "rx_cyl_no_axis");
  assert.strictEqual(r[0].level, "error");
  assert.strictEqual(r[0].certain, true, "this is a fact, not an opinion");
});

test("an axis with no cylinder is the same defect the other way round", () => {
  assert.deepStrictEqual(ids({ rx: { os_ax: "90", os_cyl: "" } }, null), ["rx_axis_no_cyl"]);
});

test("prism with no base direction is an error", () => {
  assert.deepStrictEqual(ids({ rx: { od_prism: "2", od_base: "" } }, null), ["rx_prism_no_base"]);
});

test("a section recorded normal cannot also carry findings", () => {
  /* Both statements are in the record and they cannot both be true — usually a
     "Normal" quick-fill applied after findings were entered. */
  const r = C.clinContradictions({
    sl: { od: { cornea: "Clear", lids: "WNL" }, findings: [{ label: "Corneal ulcer", eye: "OD" }] }
  }, null);
  assert.strictEqual(r[0].id, "sl_wnl_with_findings");
  assert.strictEqual(r[0].level, "error");
  assert.ok(/quick-fill/.test(r[0].why), "and explains the likely cause");
});

test("an OU finding contradicts a normal record in either eye", () => {
  const r = C.clinContradictions({
    sl: { od: { cornea: "Clear" }, os: { cornea: "Clear" },
          findings: [{ label: "Injection", eye: "OU" }] }
  }, null);
  assert.strictEqual(r.length, 2, "both eyes are contradicted by an OU finding");
});

test("acute onset with a chronic course is flagged, and suggests the resolution", () => {
  const r = C.clinContradictions({ temporal: { onset: "acute", course: "chronic" } }, null);
  assert.strictEqual(r[0].id, "temporal_conflict");
  assert.ok(/acute-on-chronic/i.test(r[0].message),
    "must name the common legitimate case rather than just objecting");
});


/* ── CLINICAL: questions, never verdicts ── */

test("a reading add in a young patient ASKS rather than asserts", () => {
  /* Unusual, not impossible — accommodative esotropia and accommodative
     insufficiency are legitimate reasons. */
  const r = C.clinContradictions({ rx: { od_add: "2.00" } }, { age: "12" });
  assert.strictEqual(r[0].id, "add_young");
  assert.strictEqual(r[0].level, "question");
  assert.strictEqual(r[0].certain, false);
  assert.ok(/\?/.test(r[0].message), "phrased as a question");
  assert.ok(/accommodative/i.test(r[0].message), "and names the legitimate reasons");
});

test("a reading add at a presbyopic age is NOT flagged", () => {
  assert.strictEqual(ids({ rx: { od_add: "2.00" } }, { age: "55" }).length, 0);
});

test("pinhole improving with no gain in best-corrected is questioned", () => {
  const r = ids({ va: { ph_improves: "Yes", od_un: "6/12", od_bva: "6/12" } }, null);
  assert.deepStrictEqual(r, ["ph_improves_no_bcva_gain"]);
});

test("identical values across both eyes are questioned, not asserted wrong", () => {
  /* Genuine symmetry exists. This is what a copy-paste also looks like. */
  const r = C.clinContradictions({ rx: {
    od_sph: "-2.00", os_sph: "-2.00", od_cyl: "-0.50", os_cyl: "-0.50",
    od_ax: "180", os_ax: "180" } }, null);
  assert.strictEqual(r[0].id, "rx_eyes_identical");
  assert.strictEqual(r[0].level, "question");
});


/* ── NEGATIVE: the half that keeps it usable ── */

test("a complete, ordinary prescription raises nothing", () => {
  assert.strictEqual(ids({
    rx: { od_sph: "-2.00", od_cyl: "-1.00", od_ax: "180",
          os_sph: "-1.75", os_cyl: "-0.75", os_ax: "175" }
  }, { age: "50" }).length, 0);
});

test("a spherical prescription with no cylinder raises nothing", () => {
  /* The commonest prescription there is. Flagging it would be fatal to trust. */
  assert.strictEqual(ids({ rx: { od_sph: "-2.00", od_cyl: "", od_ax: "" } }, { age: "40" }).length, 0);
});

test("a plano cylinder with no axis raises nothing", () => {
  assert.strictEqual(ids({ rx: { od_cyl: "0", od_ax: "" } }, null).length, 0);
});

test("an empty visit raises nothing", () => {
  assert.strictEqual(ids({}, null).length, 0);
  assert.strictEqual(C.clinContradictions(null, null).length, 0);
});

test("only two eyes symmetrical is not enough to question", () => {
  /* Needs three or more matching fields — two is common chance.
     Axes included so the fixture is not itself contradictory: the first
     version of this test omitted them and the checker correctly flagged a
     cylinder with no axis, which is exactly what it is for. */
  assert.strictEqual(ids({ rx: { od_sph: "-2.00", os_sph: "-2.00",
                                 od_cyl: "-0.50", os_cyl: "-0.50",
                                 od_ax: "180", os_ax: "10" } }, null).length, 0);
});

test("findings with a normal record in the OTHER eye raise nothing", () => {
  const r = ids({ sl: { od: { cornea: "Clear" }, os: { cornea: "Hazy" },
                        findings: [{ label: "Ulcer", eye: "OS" }] } }, null);
  assert.strictEqual(r.length, 0, "OD being normal does not contradict an OS finding");
});


/* ── Boundaries the module must respect ── */

test("errors are listed before questions", () => {
  const r = C.clinContradictions({
    rx: { od_cyl: "-1.25", od_ax: "", od_add: "2.00" }
  }, { age: "12" });
  assert.strictEqual(r[0].level, "error");
  assert.strictEqual(r[r.length - 1].level, "question");
});

test("it never blocks, never edits and never reaches the engine", () => {
  const src = read("js/clinical-contradictions.js");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const forbidden of [/V\.\w+\s*=[^=]/, /alert\(/, /confirm\(/, /return false/, /throw /]) {
    assert.ok(!forbidden.test(code),
      "the checker must report, not act — found " + forbidden);
  }
  assert.ok(!/clinContradictions/.test(read("js/engine.js")),
    "the engine must not consume contradictions — they inform the clinician, " +
    "they do not change the differential");
});

test("it is surfaced in the advisory panel and loaded", () => {
  assert.ok(/clinContradictions/.test(read("js/ui-advisory.js")),
    "must be shown to the clinician, not merely computed");
  assert.ok(/<script src="js\/clinical-contradictions\.js">/.test(read("index.html")));
});

test("the clinical checks are flagged for the founder to confirm", () => {
  const src = read("js/clinical-contradictions.js");
  assert.ok(/NEEDS_CLINICAL_REVIEW/.test(src),
    "whether each clinical check is worth raising is not mine to decide");
});


/* ── CS-11: a finding recorded against neither eye ── */

test("a finding with no eye is questioned, not asserted wrong", () => {
  const r = C.clinContradictions({ sl: { findings: [{ label: "Corneal ulcer", eye: "" }] } }, null);
  const f = r.find((x) => x.id === "finding_no_eye");
  assert.ok(f, "the missing laterality must be raised: " + JSON.stringify(r));
  assert.strictEqual(f.level, "question");
  assert.strictEqual(f.certain, false, "a few findings genuinely are not lateralised");
  assert.match(f.message, /Corneal ulcer/);
});

test("findings that carry an eye raise nothing", () => {
  const r = C.clinContradictions({
    sl: { findings: [{ label: "Corneal ulcer", eye: "OD" }] },
    fun: { findings: [{ label: "Drusen", eye: "OU" }] }
  }, null);
  assert.strictEqual(r.filter((x) => x.id === "finding_no_eye").length, 0);
});

test("fundus and slit lamp are reported separately, and counted", () => {
  const r = C.clinContradictions({
    sl: { findings: [{ label: "A", eye: "" }, { label: "B", eye: "" }] },
    fun: { findings: [{ label: "C", eye: "" }] }
  }, null);
  const hits = r.filter((x) => x.id === "finding_no_eye");
  assert.strictEqual(hits.length, 2, "one per section, so the clinician knows where to look");
  assert.ok(hits.some((h) => /Slit lamp: 2 finding/.test(h.message)));
  assert.ok(hits.some((h) => /Fundus: 1 finding/.test(h.message)));
});

test("an empty findings list is not a laterality problem", () => {
  assert.strictEqual(
    C.clinContradictions({ sl: { findings: [] }, fun: {} }, null)
      .filter((x) => x.id === "finding_no_eye").length, 0);
});
