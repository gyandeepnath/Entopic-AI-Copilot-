/* ═══════════════════════════════════════════════════════════════ */
/* SIMULATED PATIENT PRESENTATION — the anti-fabrication guarantee   */
/*                                                                  */
/* js/simulation-presentation.js writes clinical VALUES onto a       */
/* simulated chart (IOP 41 mmHg, C:D 0.78, TBUT 4 s) instead of      */
/* handing the student the engine's conclusion. That is only safe if */
/* every value is an instance of a rule the engine already publishes */
/* — otherwise the simulator would be inventing clinical numbers.    */
/*                                                                  */
/* So the central test here is a ROUND TRIP: apply the rule to a     */
/* blank visit, run the REAL engine over it, and require the token   */
/* to come back out. A rule that does not round-trip is a fabricated */
/* number and fails the build.                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
vm.runInContext(`
  globalThis.localStorage = { getItem: function () { return null; }, setItem: function () {},
                              removeItem: function () {}, clear: function () {} };
  globalThis.CU = { username: "student1", role: "student" };
  globalThis.toast = function () {}; globalThis.logAudit = function () {};
  globalThis.V = blankVisit(); globalThis.P = blankPatient();
`, eng.context);

[
  "knowledge/common-conditions.js",
  "knowledge/condition-info.js",
  "js/simulation-progress.js",
  "js/simulation-presentation.js",
  "js/simulation.js"
].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", f), "utf8"), eng.context, { filename: f });
});

const evalIn = (expr) => vm.runInContext(expr, eng.context);
const evalJson = (expr) => JSON.parse(evalIn("JSON.stringify(" + expr + ")"));


/* ── The round trip ──────────────────────────────────────────────── */

test("every measured rule round-trips: value written → real engine derives the token back", () => {
  const tokens = evalJson("Object.keys(SIM_MEASURED)");
  assert.ok(tokens.length > 20, "a meaningful number of rules exist");

  const failures = [];
  for (const tok of tokens) {
    /* Repeat: values are drawn from a band, so a rule must hold for the whole
       band, not just one lucky draw. */
    for (let i = 0; i < 25; i++) {
      const got = evalIn(`(function () {
        V = blankVisit(); P = blankPatient(); P.age = "45";
        SIM_MEASURED[${JSON.stringify(tok)}].apply(V);
        return collectTokens().indexOf(${JSON.stringify(tok)}) >= 0;
      })()`);
      if (!got) {
        const wrote = evalIn(`(function () {
          V = blankVisit(); P = blankPatient(); P.age = "45";
          return SIM_MEASURED[${JSON.stringify(tok)}].apply(V);
        })()`);
        failures.push(`${tok} — wrote "${wrote}" but the engine did not derive it`);
        break;
      }
    }
  }
  assert.deepStrictEqual(failures, [], failures.join("\n"));
});

test("every measured rule cites the engine rule it inverts", () => {
  const missing = evalJson(`Object.keys(SIM_MEASURED).filter(function (k) {
    return !SIM_MEASURED[k].rule; })`);
  assert.deepStrictEqual(missing, [], "a rule without a citation is an invented number");
});

test("measured values vary — a student cannot memorise one magic number", () => {
  const distinct = evalIn(`(function () {
    var seen = {};
    for (var i = 0; i < 30; i++) {
      V = blankVisit();
      SIM_MEASURED.high_iop.apply(V);
      seen[V.iop.od] = 1;
    }
    return Object.keys(seen).length;
  })()`);
  assert.ok(distinct > 3, `expected a spread of IOP values, got ${distinct} distinct`);
});


/* ── What the student is actually shown ──────────────────────────── */

test("examining a section records values on the chart, not raw tokens", () => {
  const r = evalJson(`(function () {
    var c = simBuildCase("Primary Open Angle Glaucoma (POAG)");
    V = blankVisit(); P = blankPatient();
    SIM.active = true; SIM.theCase = c; SIM.tier = "standard"; SIM.revealed = {};
    SIM.started = Date.now(); SIM.deadline = null; SIM.answered = false; SIM.recorded = {};
    simExamine("iop");
    return { recorded: SIM.recorded.iop || [], iopOd: V.iop.od, symptoms: V.symptoms.slice() };
  })()`);
  assert.ok(/mmHg/.test(r.recorded.join(" ")), `expected a measured IOP, got ${JSON.stringify(r.recorded)}`);
  assert.ok(parseFloat(r.iopOd) > 21, "a real number landed in the IOP field");
  assert.ok(r.symptoms.indexOf("high_iop") < 0, "the conclusion was NOT handed to the student");
});

test("the engine still reaches the diagnosis from the presented chart", () => {
  const r = evalJson(`(function () {
    var c = simBuildCase("Primary Open Angle Glaucoma (POAG)");
    V = blankVisit(); P = blankPatient(); P.age = c.age;
    SIM.active = true; SIM.theCase = c; SIM.tier = "standard"; SIM.revealed = {};
    SIM.started = Date.now(); SIM.deadline = null; SIM.answered = false; SIM.recorded = {};
    Object.keys(c.byStep).forEach(function (st) { simExamine(st); });
    runDiagnosticEngine();
    return { top: (V.dxList || []).slice(0, 5).map(function (d) { return d.n; }) };
  })()`);
  assert.ok(r.top.indexOf("Primary Open Angle Glaucoma (POAG)") >= 0,
    `the truth must stay reachable from the chart; got ${r.top.join(", ")}`);
});

test("a symptom is still volunteered as a symptom, not converted to a measurement", () => {
  const r = evalJson(`(function () {
    V = blankVisit();
    var d = simPresentToken("pain_severe", "chief_complaint");
    return { desc: d, symptoms: V.symptoms.slice() };
  })()`);
  assert.ok(r.symptoms.indexOf("pain_severe") >= 0, "symptom chips are still ticked");
  assert.ok(r.desc && r.desc.length > 0, "and described in words");
});

test("a slit-lamp sign is recorded as its finding label", () => {
  /* Pick a token the finding map genuinely covers, rather than hard-coding one
     and silently testing the fallback. */
  const tok = evalIn(`(function () {
    for (var label in FINDING_TOKEN_MAP) {
      var t = FINDING_TOKEN_MAP[label][0];
      if (t && !SIM_MEASURED[t] && !simIsSymptomToken(t)) return t;
    }
    return "";
  })()`);
  assert.ok(tok, "the finding map has at least one sign-only token");
  const r = evalJson(`(function () {
    V = blankVisit();
    var d = simPresentToken(${JSON.stringify(tok)}, "slit_lamp");
    return { desc: d, sl: (V.sl.findings || []).slice(), fun: (V.fun.findings || []).slice() };
  })()`);
  assert.ok(r.sl.length > 0 || r.fun.length > 0, `no finding label recorded for ${tok}`);
  assert.ok(r.desc, "and reported back to the student");
});

test("procedure names are never presented as findings", () => {
  const leaked = evalJson(`(function () {
    var bad = ["clinical_exam", "lid_position_exam", "blink_exam", "lash_exam",
               "slitlamp_general", "CT_orbits_imaging", "history_positive"];
    var hits = [];
    KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; })
      .forEach(function (c) {
        var s = simBuildCase(c.name);
        if (!s) return;
        s.present.forEach(function (t) {
          if (bad.indexOf(t) >= 0 && (c.req || []).indexOf(t) < 0) hits.push(c.name + ":" + t);
        });
      });
    return hits.slice(0, 10);
  })()`);
  assert.deepStrictEqual(leaked, [], "a procedure name reached a case as a finding");
});


/* ── Coverage: how much of the KB can be presented faithfully ────── */

test("the great majority of case findings have a faithful presentation route", () => {
  const cov = evalJson(`(function () {
    var toks = {};
    KNOWLEDGE_ALL.filter(function (c) { return (c.req || []).length > 0; })
      .forEach(function (c) {
        var s = simBuildCase(c.name);
        if (s) s.present.forEach(function (t) { toks[t] = 1; });
      });
    return simPresentationCoverage(Object.keys(toks));
  })()`);
  const total = cov.measured.length + cov.finding.length + cov.symptom.length + cov.none.length;
  const covered = total - cov.none.length;
  const pct = Math.round(100 * covered / total);
  assert.ok(pct >= 80,
    `only ${pct}% of case findings can be presented faithfully (${cov.none.length} of ${total} have no route)`);
});

test("the commonest measured findings are all covered", () => {
  const must = ["high_iop", "very_high_iop", "increased_cd", "narrow_angle", "RAPD_positive",
                "visual_field_defect", "RNFL_thinning", "TBUT_reduced", "schirmer_low",
                "myopia", "hyperopia", "astigmatism", "disc_edema", "restricted_motility"];
  const missing = must.filter((t) => !evalIn(`!!SIM_MEASURED[${JSON.stringify(t)}]`));
  assert.deepStrictEqual(missing, [], `no presentation rule for: ${missing}`);
});
