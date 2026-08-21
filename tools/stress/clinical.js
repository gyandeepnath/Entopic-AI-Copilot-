/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — THE CLINICAL SAFETY MODULES                */
/*                                                                  */
/*   node tools/stress/clinical.js                                  */
/*                                                                  */
/* attack.js stresses the diagnostic engine and the red flags. It   */
/* does not touch the modules that sit BESIDE the engine and are    */
/* just as capable of misleading a clinician:                       */
/*                                                                  */
/*   · clinical-scales   — published risk figures                   */
/*   · medication-checker — is the patient ON this drug or not      */
/*   · clinical-contradictions / clinical-validators                */
/*                                                                  */
/* The failure that matters here is not a crash. It is a CONFIDENT  */
/* WRONG NUMBER: a risk figure computed from answers nobody gave,   */
/* or a drug counted as taken when the note says the opposite.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { makeHarness, must, mustEqual, browser } = require("./lib");
const H = makeHarness(process.argv);
const { G, attack, runAll } = H;

const SCALE_FILES = ["knowledge/clinical-scales.js", "js/clinical-scales.js"];
const MED_FILES = ["knowledge/medications.js", "js/medication-checker.js"];

function scaleCtx() { return browser({ base: false, also: SCALE_FILES }); }

/* Which scales does the data file actually ship? Everything below is driven
   from that, so nothing here invents a scale or a threshold. */
function anyScaleId(c) {
  return c.run("(typeof CLINICAL_SCALES !== 'undefined' && CLINICAL_SCALES.length) ? CLINICAL_SCALES[0].id : null");
}


/* ═══════════════════════════════════════════════════════════════ */
G("X. clinical scales — never a figure from answers nobody gave");

attack("X0 the scale data file actually loaded", () => {
  const c = scaleCtx();
  const n = c.run("(typeof CLINICAL_SCALES !== 'undefined') ? CLINICAL_SCALES.length : 0");
  must(n > 0, "no scales loaded — every assertion in this group would be vacuous");
});

attack("X1 an untouched visit is INCOMPLETE, never scored", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  mustEqual(r.status, "incomplete",
    "a scale scored a patient whose required inputs were never answered");
  must(r.missing && r.missing.length > 0, "an incomplete result must name what is missing");
});

attack("X2 a PARTIALLY answered scale is still incomplete", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  /* Answer every required input for ONE eye only. */
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    (sc.inputs || []).forEach(function (inp) {
      if (inp.required) scaleSetAnswer(__v, sc.id, "od", inp.id, false);
    });
  `);
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  mustEqual(r.status, "incomplete", "one eye answered was treated as the whole patient");
  must(r.missing.every((m) => m.eye === "OS"), "the missing list must name the unanswered eye");
});

attack("X3 UNRECORDED is never silently read as ABSENT", () => {
  /* The stated safety rule of the module. An unanswered input must block the
     score, not count as a factor that is not present. */
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    var req = (sc.inputs || []).filter(function (i) { return i.required; });
    ["od","os"].forEach(function (eye) {
      req.forEach(function (inp, i) {
        if (i === 0) return;                 /* leave exactly one unanswered */
        scaleSetAnswer(__v, sc.id, eye, inp.id, false);
      });
    });
  `);
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  mustEqual(r.status, "incomplete",
    "a single unanswered input was treated as 'absent' and a risk figure was produced");
});

attack("X4 a fully answered scale DOES score (positive control)", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    ["od","os"].forEach(function (eye) {
      (sc.inputs || []).forEach(function (inp) {
        if (inp.required) scaleSetAnswer(__v, sc.id, eye, inp.id, false);
      });
    });
  `);
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  mustEqual(r.status, "scored",
    "a completely answered scale refused to score — the guard is refusing everything");
  must(typeof r.risk_text === "string" && r.risk_text.length > 0,
    "a scored result must carry the published risk text");
});

attack("X5 prototype pollution cannot fabricate an answer", () => {
  /* scaleAnswers returns plain {} objects, which inherit Object.prototype.
     A polluted prototype would make every unanswered input read as `true`:
     the scale would skip the incomplete guard AND count factors nobody
     recorded, producing a confident risk figure from nothing.

     EVERY required id is polluted, not one. Polluting a single id leaves the
     others legitimately missing, so the evaluator returns "incomplete" for the
     right reason and the attack passes while proving nothing. */
  const c = scaleCtx();
  const id = anyScaleId(c);
  const ids = JSON.parse(c.run(`
    JSON.stringify((scaleById(${JSON.stringify(id)}).inputs || [])
      .filter(function (i) { return i.required; })
      .map(function (i) { return i.id; }))
  `));
  must(ids.length > 0, "sanity: the scale has required inputs");

  c.__ids = ids;
  c.run(`__ids.forEach(function (k) { Object.prototype[k] = true; });`);
  let r, threw = null;
  try {
    c.__v = { id: "v1" };
    r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  } catch (e) { threw = e; }
  finally { c.run(`__ids.forEach(function (k) { delete Object.prototype[k]; });`); }

  must(!threw, "scaleEvaluate threw under a polluted prototype: " + threw);
  mustEqual(r.status, "incomplete",
    "a polluted prototype answered EVERY question nobody was asked, and the scale " +
    "produced a risk figure from it");
});

attack("X5b the pollution attack is real (control): it does reach the answers", () => {
  /* Proves X5 is testing something. Without a guard, a polluted prototype IS
     visible through the {} that scaleAnswers hands back — so if X5 holds, it
     holds because the code defends itself, not because the attack missed. */
  const c = scaleCtx();
  c.run(`Object.prototype.__probe_marker = true;`);
  const leaks = c.run(`(function () { var o = {}; return o.__probe_marker === true; })()`);
  c.run(`delete Object.prototype.__probe_marker;`);
  mustEqual(leaks, true,
    "a plain object in this sandbox does not inherit from Object.prototype, so X5 proves nothing");
});

attack("X6 a non-boolean answer does not count as an answer", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    __v.scales = {}; __v.scales[sc.id] = { od: {}, os: {} };
    (sc.inputs || []).forEach(function (inp) {
      if (!inp.required) return;
      __v.scales[sc.id].od[inp.id] = "yes";      /* a string, not a boolean */
      __v.scales[sc.id].os[inp.id] = 1;          /* a number, not a boolean */
    });
  `);
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  mustEqual(r.status, "incomplete",
    "a truthy non-boolean was accepted as a recorded clinical answer");
});

attack("X7 a hostile visit shape does not crash the evaluator", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  const shapes = ["null", "undefined", "{}", "0", '""',
                  '{ scales: null }', '{ scales: "x" }',
                  `{ scales: { ${JSON.stringify(id)}: null } }`,
                  `{ scales: { ${JSON.stringify(id)}: { od: null, os: null } } }`,
                  `{ scales: { ${JSON.stringify(id)}: { od: "x", os: 7 } } }`];
  for (const s of shapes) {
    let threw = null;
    try { c.run(`scaleEvaluate(${JSON.stringify(id)}, ${s})`); } catch (e) { threw = e; }
    must(!threw, "scaleEvaluate threw on " + s + ": " + threw);
  }
});

attack("X8 an unknown scale id is refused, never improvised", () => {
  const c = scaleCtx();
  const r = c.run(`scaleEvaluate("no-such-scale-at-all", { id: "v" })`);
  mustEqual(r.status, "unavailable", "an unknown scale produced something other than a refusal");
});

attack("X9 every shipped scale's bands cover every reachable score", () => {
  /* A score with no band makes the evaluator refuse — correct, but it means a
     clinician who answered everything gets nothing. That is a DATA defect and
     it should be caught here, not at the chair. */
  const c = scaleCtx();
  const gaps = c.run(`
    (function () {
      var out = [];
      for (var i = 0; i < CLINICAL_SCALES.length; i++) {
        var sc = CLINICAL_SCALES[i];
        var per = (sc.scoring && sc.scoring.per_eye_factors) || [];
        var extra = 0;
        ((sc.scoring && sc.scoring.special_rules) || []).forEach(function (r) {
          extra += (typeof r.add === "number" ? r.add : 0);
        });
        var max = (sc.scoring && typeof sc.scoring.max === "number")
          ? sc.scoring.max : (per.length * 2 + extra);
        var min = (sc.scoring && typeof sc.scoring.min === "number") ? sc.scoring.min : 0;
        var banded = {};
        (sc.bands || []).forEach(function (b) { banded[b.score] = true; });
        for (var s = min; s <= max; s++) if (!banded[s]) out.push(sc.id + " score " + s);
      }
      return JSON.stringify(out);
    })()
  `);
  const list = JSON.parse(gaps);
  must(list.length === 0,
    "a reachable score has no published risk band, so a fully-answered patient gets nothing: " +
    list.join(", "));
});

attack("X10 a provisional scale says so", () => {
  const c = scaleCtx();
  const id = anyScaleId(c);
  c.__v = { id: "v1" };
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    ["od","os"].forEach(function (eye) {
      (sc.inputs || []).forEach(function (inp) {
        if (inp.required) scaleSetAnswer(__v, sc.id, eye, inp.id, false);
      });
    });
  `);
  const r = c.run(`scaleEvaluate(${JSON.stringify(id)}, __v)`);
  must(typeof r.provisional === "boolean",
    "a scored result must state whether a clinician has verified the scale");
  must(r.source, "a published risk figure must carry the source it came from");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Y. medication history — a denial is not a prescription");

function medCtx(medText) {
  const c = browser({ base: false, also: MED_FILES,
    extra: { V: { hxM: { medications: medText } } } });
  return c;
}

function statusOf(text, alias) {
  const c = browser({ base: false, also: MED_FILES });
  return c.run(`medMentionStatus(${JSON.stringify(text)}, ${JSON.stringify(alias)})`);
}

attack("Y0 the medication data file actually loaded", () => {
  const c = browser({ base: false, also: MED_FILES });
  const n = c.run("(typeof MEDICATION_OCULAR_EFFECTS !== 'undefined') ? MEDICATION_OCULAR_EFFECTS.length : 0");
  must(n > 0, "no medications loaded — every assertion in this group would be vacuous");
});

attack("Y1 a plain mention counts as current (positive control)", () => {
  mustEqual(statusOf("prednisolone 5mg daily", "prednisolone"), "current",
    "a straightforwardly documented drug was not counted");
});

attack("Y2 a negation is not counted as an exposure", () => {
  const negations = [
    "not on prednisolone", "no prednisolone", "denies prednisolone",
    "never prednisolone", "nil prednisolone", "patient denied prednisolone",
    "negative for prednisolone", "without prednisolone"
  ];
  for (const t of negations) {
    const s = statusOf(t, "prednisolone");
    must(!["current"].includes(s),
      '"' + t + '" was read as CURRENT exposure (got ' + s + ")");
    mustEqual(c_exposure(s), false, '"' + t + '" counted as a drug exposure');
  }
});

function c_exposure(status) {
  const c = browser({ base: false, also: MED_FILES });
  return c.run(`medStatusCountsAsExposure(${JSON.stringify(status)})`);
}

attack("Y3 an allergy is never read as the patient taking the drug", () => {
  for (const t of ["allergic to prednisolone", "allergy to prednisolone",
                   "prednisolone allergy", "intolerant of prednisolone",
                   "reaction to prednisolone"]) {
    const s = statusOf(t, "prednisolone");
    mustEqual(s, "allergy", '"' + t + '" was read as ' + s + ", not an allergy");
    mustEqual(c_exposure(s), false, "an allergy counted as an exposure");
  }
});

attack("Y4 past use is recorded as past, and still counts as exposure", () => {
  /* Past exposure matters clinically — hydroxychloroquine years ago still
     matters — so it must be KEPT, just not called current. */
  for (const t of ["stopped prednisolone", "previously on prednisolone",
                   "h/o prednisolone", "history of prednisolone",
                   "used to take prednisolone"]) {
    const s = statusOf(t, "prednisolone");
    must(s === "past" || s === "negated",
      '"' + t + '" was read as ' + s);
    if (s === "past") {
      mustEqual(c_exposure(s), true, "past exposure must still count as exposure");
    }
  }
});

attack("Y5 the most significant reading wins when a drug appears twice", () => {
  /* "denies steroids, on prednisolone" must not be read as a denial. */
  const s = statusOf("denies prednisolone. on prednisolone 5mg", "prednisolone");
  mustEqual(s, "current",
    "an explicit current prescription was overridden by an earlier denial");
});

attack("Y6 a negation does not leak across a clause boundary", () => {
  /* "no aspirin, prednisolone 5mg" — the negation belongs to aspirin only. */
  const s = statusOf("no aspirin, prednisolone 5mg daily", "prednisolone");
  mustEqual(s, "current",
    "a negation about a different drug suppressed this one");
});

attack("Y7 a positive cue INSIDE a negation does not cancel it", () => {
  /* "not on prednisolone" — the "on" is part of "not on". */
  const s = statusOf("not on prednisolone", "prednisolone");
  must(s !== "current", '"not on X" was read as current exposure');
});

attack("Y8 a drug name inside a longer word is not matched", () => {
  const c = browser({ base: false, also: MED_FILES });
  const hit = c.run(`medAliasMatches("nonprednisolonergic", "prednisolone")`);
  /* Either it must not match, or if it does the status must not be current —
     a substring inside an invented word is not a prescription. */
  if (hit) {
    const s = statusOf("nonprednisolonergic", "prednisolone");
    must(s !== "current", "a drug name embedded in another word counted as a prescription");
  }
});

attack("Y9 hostile free text neither crashes nor stalls the parser", () => {
  const c = browser({ base: false, also: MED_FILES });
  const nasty = [
    "(".repeat(5000), "a".repeat(200000),
    "prednisolone ".repeat(20000),
    "[](){}*+?^$|\\\\", "\\u0000\\u0001", ",,,,,,,,,,;;;;;....",
    "no no no no not not not on on on prednisolone"
  ];
  for (const t of nasty) {
    const t0 = Date.now();
    let threw = null;
    try { c.run(`medMentionStatus(${JSON.stringify(t)}, "prednisolone")`); }
    catch (e) { threw = e; }
    const ms = Date.now() - t0;
    must(!threw, "the parser threw on hostile text: " + threw);
    must(ms < 5000, "the parser took " + ms + "ms on hostile text — that is a UI freeze");
  }
});

attack("Y10 nothing is dropped: an ambiguous mention still surfaces", () => {
  /* The module's stated safety rule. A mention the parser cannot classify must
     still be reported, not silently discarded. */
  const c = browser({ base: false, also: MED_FILES,
    extra: { V: { hxM: { medications: "prednisolone (unclear if still taking)" } } } });
  const out = c.run("JSON.stringify(checkAllMedications().map(function(r){return r.drug}))");
  must(JSON.parse(out).length > 0,
    "a mention the parser could not classify was dropped from the review entirely");
});

attack("Y11 an empty or missing medication history yields nothing, not a crash", () => {
  for (const v of ["undefined", "null", "{}", '{ hxM: null }', '{ hxM: { medications: null } }',
                   '{ hxM: { medications: "" } }', '{ hxM: { medications: 12345 } }']) {
    const c = browser({ base: false, also: MED_FILES, extra: {} });
    c.run(`V = ${v};`);
    let threw = null, out = null;
    try { out = c.run("checkAllMedications()"); } catch (e) { threw = e; }
    must(!threw, "checkAllMedications threw on V = " + v + ": " + threw);
    must(Array.isArray(out) || out === undefined, "expected an array for V = " + v);
  }
});

/* ═══════════════════════════════════════════════════════════════ */
G("AC. OSDI — a published questionnaire must not invent a severity");

const INTAKE = ["js/smart-intake.js"];
function osdi(scores) {
  const c = browser({ base: false, also: INTAKE, extra: { V: {} } });
  c.run(`V = { osdi: { scores: ${JSON.stringify(scores)} } };`);
  return JSON.parse(c.run("JSON.stringify(calculateOSDI())"));
}
/* Values JSON cannot carry are set by expression instead. */
function osdiExpr(expr) {
  const c = browser({ base: false, also: INTAKE, extra: { V: {} } });
  c.run(`V = { osdi: { scores: ${expr} } };`);
  return JSON.parse(c.run("JSON.stringify(calculateOSDI())"));
}

attack("AC1 the published formula is applied correctly (positive control)", () => {
  /* OSDI = (sum of scores x 25) / number of questions ANSWERED.
     All twelve at 4 is the defined maximum, 100. All twelve at 0 is 0. */
  const worst = osdi([4,4,4,4,4,4,4,4,4,4,4,4]);
  mustEqual(worst.score, 100, "the maximum OSDI score must be 100");
  mustEqual(worst.severity, "Severe Dry Eye", "100 must land in the top band");
  mustEqual(worst.complete, true, "twelve answers is a complete questionnaire");

  const best = osdi([0,0,0,0,0,0,0,0,0,0,0,0]);
  mustEqual(best.score, 0, "the minimum OSDI score must be 0");
  mustEqual(best.severity, "Normal", "0 must land in the normal band");
});

attack("AC2 the score is normalised by ANSWERED items, not by twelve", () => {
  /* This is the whole point of the published formula: a partially completed
     questionnaire is scaled, not deflated by counting blanks as zero. */
  const partial = osdi([4,4,4,null,null,null,null,null,null,null,null,null]);
  mustEqual(partial.answered, 3, "three items were answered");
  mustEqual(partial.score, 100,
    "three maximal answers must scale to 100, not be diluted to 25 by nine blanks");
  mustEqual(partial.complete, false, "a partial questionnaire must not claim to be complete");
});

attack("AC3 a NaN never produces a diagnosis", () => {
  /* THE DANGEROUS SHAPE. Every `<=` comparison against NaN is false, so a NaN
     fell straight through the severity ladder to its final `else` — and handed
     back SEVERE DRY EYE for a questionnaire full of garbage. */
  const r = osdiExpr("[0,0,0,0,0,0,0,0,0,0,0,NaN]");
  must(r.severity !== "Severe Dry Eye",
    "a NaN in the answers produced a severe dry-eye result");
  must(isFinite(r.score), "the score is not a finite number: " + r.score);
  mustEqual(r.rejected, 1, "the unusable value must be counted as rejected");
});

attack("AC4 string answers are not concatenated into a nonsense score", () => {
  /* `sum += "4"` concatenates: 0 + "4" + "3" + "2" became "0432", and
     "0432" * 25 / 3 gave 3600 — labelled Severe. */
  const r = osdi(["4","3","2",null,null,null,null,null,null,null,null,null]);
  must(r.score <= 100, "a string answer produced an out-of-range score: " + r.score);
  mustEqual(r.rejected, 3, "string answers must be rejected, not coerced");
  mustEqual(r.answered, 0, "no valid answer was present, so nothing may be scored");
});

attack("AC5 an out-of-range answer cannot exist on a 0-4 scale", () => {
  for (const bad of [[1e9,0,0,0,0,0,0,0,0,0,0,0], [-100,0,0,0,0,0,0,0,0,0,0,0],
                     [5,0,0,0,0,0,0,0,0,0,0,0], [2.5,0,0,0,0,0,0,0,0,0,0,0]]) {
    const r = osdi(bad);
    must(r.score >= 0 && r.score <= 100,
      "an OSDI score outside 0-100 was produced: " + r.score + " from " + JSON.stringify(bad));
    mustEqual(r.rejected, 1, "the out-of-range value must be rejected: " + JSON.stringify(bad));
  }
});

attack("AC6 a non-numeric answer cannot reach the arithmetic", () => {
  for (const expr of ["[{},0,0,0,0,0,0,0,0,0,0,0]", "[true,false,0,0,0,0,0,0,0,0,0,0]",
                      '[[],0,0,0,0,0,0,0,0,0,0,0]']) {
    const r = osdiExpr(expr);
    must(isFinite(r.score), "a non-numeric answer produced " + r.score + " from " + expr);
    must(r.score >= 0 && r.score <= 100, "out of range from " + expr);
  }
});

attack("AC7 no answers means no score and no severity", () => {
  for (const r of [osdi([]), osdi([null,null,null]), osdiExpr("null"),
                   osdiExpr('"notanarray"')]) {
    mustEqual(r.answered, 0, "something was counted as answered");
    mustEqual(r.severity, "", "a severity was stated with nothing to score");
  }
});

attack("AC8 the number of rejected values is reported, not hidden", () => {
  /* A questionnaire scored from 3 of 12 is a different statement from one
     scored from 12, and a clinician has to be able to see which. */
  const r = osdi([4,"x",3,null,999,2,null,null,null,null,null,null]);
  mustEqual(r.answered, 3, "three real answers");
  mustEqual(r.rejected, 2, "two unusable values must be reported");
});


/* ═══════════════════════════════════════════════════════════════ */
G("AD. the spectacle advisor — no advice for an eye nobody measured");

const SPEC = ["js/spectacle-advisor.js"];
function specCtx(rx) {
  return browser({ base: false, also: SPEC,
    extra: { V: { rx: rx || {} }, P: { age: 40 } } });
}

attack("AD1 with NO refraction the advisor refuses to recommend", () => {
  const c = specCtx({});
  const out = c.run("renderSpectacleAdvisor()");
  must(/Enter refraction/i.test(out),
    "a dispensing recommendation was produced for a patient nobody refracted: " +
    String(out).slice(0, 160));
  must(!/CR-39|Polycarbonate|Hi-Index/i.test(out),
    "a lens material was named with no prescription recorded");
});

attack("AD2 with a real refraction it DOES advise (positive control)", () => {
  const c = specCtx({ od_sph: "-6.00", os_sph: "-6.00" });
  const out = c.run("renderSpectacleAdvisor()");
  must(/Hi-Index|Polycarbonate|CR-39/i.test(out),
    "a high prescription produced no lens material recommendation");
});

attack("AD3 the recommendation tracks the power actually recorded", () => {
  const low = specCtx({ od_sph: "-1.00", os_sph: "-1.00" }).run("JSON.stringify(recommendLensIndex())");
  const high = specCtx({ od_sph: "-9.00", os_sph: "-9.00" }).run("JSON.stringify(recommendLensIndex())");
  must(low !== high, "a -1.00 and a -9.00 produced the same lens recommendation");
  must(/CR-39|1\.50/.test(low), "a low prescription should reach the standard-index band");
});

attack("AD4 an unrecorded second eye does not drag the recommendation down", () => {
  /* Only the max power drives the material, so an unmeasured fellow eye must
     not make a high prescription look low. */
  const oneEye = specCtx({ od_sph: "-9.00" }).run("JSON.stringify(recommendLensIndex())");
  must(/1\.67|1\.74|Hi-Index/i.test(oneEye),
    "a -9.00 in one eye was advised as if it were low powered: " + oneEye);
});

attack("AD5 hostile refraction values do not crash or produce a nonsense band", () => {
  for (const rx of [{ od_sph: "abc" }, { od_sph: null }, { od_sph: {} },
                    { od_sph: "1e9" }, { od_sph: "-Infinity" }, { od_sph: "NaN" }]) {
    const c = specCtx(rx);
    let threw = null, out = null;
    try { out = c.run("JSON.stringify(recommendLensIndex())"); } catch (e) { threw = e; }
    must(!threw, "the advisor threw on " + JSON.stringify(rx) + ": " + threw);
    must(typeof out === "string" && out.indexOf("index") >= 0,
      "no recommendation shape returned for " + JSON.stringify(rx));
  }
});

runAll("clinical").then((n) => process.exit(n ? 1 : 0));
