/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE INPUT INTEGRITY  (full audit, 2026-09-24)                 */
/*                                                                  */
/* Every test here reproduces an error the real engine made on an    */
/* ordinary recorded value, found by running it — not by reading it. */
/* Three families:                                                   */
/*                                                                  */
/*   1. A recorded 0 read as "not measured". The most abnormal       */
/*      result a test can give — a closed angle, a tear film that    */
/*      breaks up at once, a dry Schirmer strip, no accommodation —  */
/*      produced nothing, while milder results were flagged.         */
/*   2. One eye blank read as 0, inventing an asymmetry.             */
/*   3. Words read as substrings, negation ignored: "within normal   */
/*      limits" was corneal thinning, "no thinning" was rim thinning. */
/*                                                                  */
/* And the guarantee underneath them all: a malformed record can no  */
/* longer stop the red-flag stage.                                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("node:vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const run = (v, p) => eng.runCase(v, p || { age: "50" });
const has = (out, tok) => out.tokens.indexOf(tok) >= 0;
const alertText = (out) => out.alerts.map((a) => a.m).join(" | ");


/* ═══ 1. ZERO IS A RESULT ═══ */

test("Van Herick grade 0 (closed) is the NARROWEST angle, not an unrecorded one", () => {
  /* The dropdown stored its label, "0 (Closed)", and parseInt(..) || 99 turned
     the 0 into 99: a closed angle raised nothing while grades 1 and 2 warned. */
  for (const vh of ["0 (Closed)", "0"]) {
    const out = run({ sl: { od: { vh: vh }, os: { vh: "" } } }, { age: "65" });
    assert.ok(has(out, "narrow_angle"), "VH " + JSON.stringify(vh) + " gave no narrow-angle token");
    assert.ok(/Van Herick .* OD — gonioscopy before dilation/.test(alertText(out)),
      "VH " + JSON.stringify(vh) + " raised no 'gonioscopy before dilation' warning");
  }
  /* legacy labels for the other grades still read correctly */
  assert.ok(has(run({ sl: { od: { vh: "1 (V.narrow)" } } }), "narrow_angle"));
  assert.ok(!has(run({ sl: { od: { vh: "3 (Open)" } } }), "narrow_angle"));
  assert.ok(!has(run({ sl: { od: { vh: "4" } } }), "narrow_angle"));
  /* and blank is still blank */
  const blank = run({ sl: { od: { vh: "" }, os: { vh: "" } } });
  assert.ok(!has(blank, "narrow_angle"));
  assert.ok(!/Van Herick/.test(alertText(blank)));
});

test("a TBUT of 0 s and a Schirmer of 0 mm are the most abnormal results, not blanks", () => {
  const zero = run({ sl: { od: { but: "0", schirmer: "0" }, os: { but: "", schirmer: "" } } });
  for (const t of ["TBUT_reduced", "tear_film_instability", "schirmer_low", "reduced_tearing"]) {
    assert.ok(has(zero, t), "a recorded 0 lost " + t);
  }
  /* the simulator writes numbers, not strings */
  assert.ok(has(run({ sl: { od: { but: 0 } } }), "TBUT_reduced"), "a numeric 0 was dropped");
  /* a normal result is still normal, and blank is still unmeasured */
  assert.ok(!has(run({ sl: { od: { but: "15", schirmer: "20" } } }), "TBUT_reduced"));
  assert.ok(!has(run({ sl: { od: { but: "", schirmer: "" } } }), "schirmer_low"));
});

test("0 D of accommodation in a young patient is reduced amplitude, not missing data", () => {
  const out = run({ bv: { acc_od: "0" } }, { age: "20" });
  assert.ok(has(out, "reduced_amplitude"), "an amplitude of 0 D was ignored");
  assert.ok(!has(run({ bv: { acc_od: "" } }, { age: "20" }), "reduced_amplitude"));
});

test("accommodative facility is read for BOTH eyes, and 0 cpm counts", () => {
  /* maf_os was recorded on screen and never read by the engine */
  assert.ok(has(run({ bv: { maf_os: "2" } }, { age: "12" }), "reduced_flipper_rate"),
    "the left eye's facility was ignored");
  assert.ok(has(run({ bv: { maf_od: "0" } }, { age: "12" }), "reduced_flipper_rate"),
    "0 cpm (could not clear the flipper) was ignored");
  assert.ok(!has(run({ bv: { maf_od: "12", maf_os: "12" } }, { age: "12" }), "reduced_flipper_rate"));
});

test("an infant recorded as age 0 is paediatric", () => {
  const out = run({ symptoms: ["leukocoria"] }, { age: "0" });
  assert.ok(has(out, "paediatric_age"), "age 0 produced no paediatric token");
  assert.ok(!has(run({ symptoms: ["blur"] }, { age: "" }), "paediatric_age"), "a blank age must stay unknown");
});


/* ═══ 2. A BLANK EYE IS NOT A ZERO ═══ */

test("one exophthalmometry reading does not invent an asymmetry", () => {
  /* OD 16 mm (normal), OS blank: the blank read as 0, a 16 mm "asymmetry",
     proptosis → Thyroid Eye Disease 0.67. */
  const one = run({ orbit: { exoph_od: "16", exoph_os: "" } });
  assert.ok(!has(one, "proptosis"), "a single normal reading produced proptosis");
  assert.ok(!one.dxList.some((d) => /thyroid/i.test(d.n)));
  assert.ok(has(run({ orbit: { exoph_od: "16", exoph_os: "19" } }), "proptosis"), "a real 3 mm asymmetry");
  assert.ok(has(run({ orbit: { exoph_od: "23", exoph_os: "" } }), "proptosis"), "one reading above the absolute limit");
});

test("refracting one eye first does not produce anisometropia", () => {
  const one = run({ rx: { od_sph: "-3.00", os_sph: "", os_cyl: "" } });
  assert.ok(!has(one, "unequal_refractive_error"), "OD refracted, OS not yet — reported as anisometropia");
  assert.ok(has(run({ rx: { od_sph: "-3.00", os_sph: "-0.50" } }), "unequal_refractive_error"));
  /* a pure astigmat counts as refracted */
  assert.ok(has(run({ rx: { od_sph: "", od_cyl: "-1.00", os_sph: "+1.50" } }), "unequal_refractive_error"));
});

test("an add of 0.00 is not an add", () => {
  assert.ok(!has(run({ rx: { od_sph: "-1.00", od_add: "0.00" } }), "add_required"));
  assert.ok(has(run({ rx: { od_sph: "-1.00", od_add: "+2.00" } }), "add_required"));
});

test("'improves with correction' means BETTER, not merely different", () => {
  const worse = run({ va: { od_un: "6/6", od_bva: "6/9" } });
  assert.ok(!has(worse, "improves_with_correction"), "a corrected VA WORSE than unaided was scored as improving");
  assert.ok(!has(run({ va: { od_un: "20/20", od_bva: "6/6" } }), "improves_with_correction"),
    "the same acuity in two notations");
  assert.ok(has(run({ va: { od_un: "6/24", od_bva: "6/6" } }), "improves_with_correction"));
  assert.ok(has(run({ va: { od_un: "HM", od_bva: "6/60" } }), "improves_with_correction"));
  assert.ok(!has(run({ va: { od_un: "0.5", od_bva: "0.1", chart: "Snellen" } }), "improves_with_correction"),
    "a bare number on a non-logMAR chart is ambiguous (decimal vs logMAR) and must not be guessed");
});


/* ═══ 3. WORDS, NOT SUBSTRINGS — AND NEGATION ═══ */

test("'within normal limits' is not corneal THINning", () => {
  for (const s of ["within normal limits", "nothing abnormal detected", "clear and within limits"]) {
    assert.ok(!has(run({ sl: { od: { cornea: s } } }), "corneal_thinning"), JSON.stringify(s));
  }
  assert.ok(has(run({ sl: { od: { cornea: "inferior thinning" } } }), "corneal_thinning"));
  /* every occurrence is checked: the second, un-negated one still counts */
  assert.ok(has(run({ sl: { od: { cornea: "no scar centrally, scar inferiorly" } } }), "corneal_scar"));
});

test("the neuroretinal rim and disc boxes honour negation", () => {
  for (const s of ["no thinning", "no notching", "within normal limits", "healthy, no notch"]) {
    assert.ok(!has(run({ fun: { od: { nrr: s } } }), "nrr_thinning"), "NRR " + JSON.stringify(s) + " was read as rim thinning");
  }
  assert.ok(has(run({ fun: { od: { nrr: "inferior notch" } } }), "nrr_thinning"));
  assert.ok(!has(run({ fun: { od: { disc: "pink, no edema" } } }), "disc_edema"));
  assert.ok(!has(run({ fun: { od: { disc: "not pale" } } }), "pale_disc"));
  assert.ok(has(run({ fun: { od: { disc: "temporal pallor" } } }), "pale_disc"), "'pallor' is how disc colour is written");
  assert.ok(has(run({ fun: { od: { disc: "oedema" } } }), "disc_edema"), "British spelling");
});

test("British spellings reach the same tokens", () => {
  assert.ok(has(run({ fun: { od: { vessels: "dot blot haemorrhages" } } }), "dot_blot_hemorrhages"),
    "'haemorrhage' never matched the 'hemorrhage' keyword");
  assert.ok(has(run({ fun: { od: { mac: "macular oedema" } } }), "macular_edema_clinical"));
  assert.ok(has(run({ sl: { od: { cornea: "stromal oedema" } } }), "corneal_edema"));
});

test("motility notes need a DEFICIT, not a mention", () => {
  for (const s of ["abduction full", "no abduction deficit", "full abduction and adduction"]) {
    const out = run({ mot: { notes: s } });
    assert.ok(!has(out, "limited_abduction") && !has(out, "adduction_deficit"), JSON.stringify(s));
  }
  assert.ok(has(run({ mot: { notes: "limited abduction OS" } }), "limited_abduction"));
  assert.ok(has(run({ mot: { notes: "abduction -2 OD" } }), "limited_abduction"));
  assert.ok(!has(run({ mot: { notes: "without restriction, looks down normally" } }), "eye_down_out"),
    "'down' and 'out' (in 'without') anywhere in the note were read as a third-nerve palsy");
  assert.ok(has(run({ mot: { notes: "eye down and out, ptosis" } }), "eye_down_out"));
});

test("gonioscopy: negation, the notes box, and typed pigment grades", () => {
  assert.ok(!has(run({ gon: { od: { s: "open, not narrow" } } }), "narrow_angle"));
  assert.ok(has(run({ gon: { od: { s: "Slit" } } }), "narrow_angle"));
  /* NVA written in the notes box — its placeholder says "PAS, NVA..." */
  const nva = run({ gon: { od: { notes: "NVA 360 degrees" } } });
  assert.ok(has(nva, "rubeosis_iridis"), "NVA in the notes was never read");
  assert.ok(/Rubeosis iridis — URGENT/.test(alertText(nva)), "and so raised no rubeosis red flag");
  assert.ok(!has(run({ gon: { od: { notes: "no NVA, no PAS" } } }), "rubeosis_iridis"));
  /* the box asks for 0-4; only "3+"/"4+" used to register */
  assert.ok(has(run({ gon: { od: { pig: "4" } } }), "pigment_dispersion"));
  assert.ok(has(run({ gon: { od: { pig: "3+" } } }), "pigment_dispersion"));
  assert.ok(!has(run({ gon: { od: { pig: "1" } } }), "pigment_dispersion"));
});

test("cover test: the notations clinicians write", () => {
  const dev = (s) => vm.runInContext("coverTestDeviation(" + JSON.stringify(s) + ")", eng.context);
  for (const [s, dir, n] of [["8 exo", "exo", 8], ["8Δ exo", "exo", 8], ["8^ exophoria", "exo", 8],
                             ["8 XP", "exo", 8], ["10 X(T)", "exo", 10], ["6 ET", "eso", 6],
                             ["exo 12", "exo", 12], ["XP 8Δ", "exo", 8]]) {
    const d = dev(s);
    assert.ok(d && d.dir === dir && d.amount === n, JSON.stringify(s) + " → " + JSON.stringify(d));
  }
  for (const s of ["ortho", "", "text 7", "next 5"]) assert.strictEqual(dev(s), null, JSON.stringify(s));
  assert.ok(has(run({ bv: { ct_n: "10Δ XP" } }), "exo_near"), "'10Δ XP' produced nothing");
});

test("an EMPTY RAPD field is not an RAPD", () => {
  /* rapd !== "None" made "" an urgent 'RAPD detected ()' banner */
  const out = run({ pupil: { rapd: "" } });
  assert.ok(!has(out, "RAPD_positive"));
  assert.ok(!/RAPD/.test(alertText(out)));
  for (const r of ["OD", "OS", "Present — left"]) {
    assert.ok(/RAPD detected/.test(alertText(run({ pupil: { rapd: r } }))), JSON.stringify(r) + " must still fire");
  }
});


/* ═══ 4. NOTHING IN THE RECORD CAN STOP THE RED FLAGS ═══ */

test("a wrong-typed field anywhere in the visit never stops the red-flag stage", () => {
  /* Every path in blankVisit(), replaced one at a time with a hostile type.
     Before: 130 of 3,668 runs threw, and a throw before stage 10 meant no
     alerts at all. The base case carries IOP 45, which must always alert. */
  const blank = JSON.parse(JSON.stringify(vm.runInContext("blankVisit()", eng.context)));
  const paths = [];
  (function walk(o, pre) {
    for (const k of Object.keys(o)) {
      paths.push(pre.concat(k));
      if (o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) walk(o[k], pre.concat(k));
    }
  })(blank, []);
  const failures = [];
  for (const p of paths) {
    if (p[0] === "iop") continue;
    for (const hv of [7, null, undefined, {}, [], true]) {
      const V = vm.runInContext("blankVisit()", eng.context);
      V.iop.od = "45";
      let o = V;
      for (let i = 0; i < p.length - 1; i++) o = o[p[i]];
      o[p[p.length - 1]] = hv;
      eng.context.V = V;
      eng.context.P = { age: "60" };
      try {
        vm.runInContext("runDiagnosticEngine()", eng.context);
        if (!(V.alerts || []).some((a) => /IOP/.test(a.m))) failures.push(p.join(".") + "=" + JSON.stringify(hv) + " lost the IOP alert");
        const le = vm.runInContext("ENGINE_STATE.lastError", eng.context);
        if (le) failures.push(p.join(".") + "=" + JSON.stringify(hv) + " failed a stage: " + le.stage);
      } catch (e) {
        failures.push(p.join(".") + "=" + JSON.stringify(hv) + " THREW " + e.message);
      }
    }
  }
  assert.ok(paths.length > 300, "expected the whole visit schema, walked " + paths.length);
  assert.deepStrictEqual(failures.slice(0, 20), []);
});

test("a visit without a symptoms array still gets its red flags", () => {
  /* the old guard was `if (!V.symptoms) return;` — silently, IOP 48 + RAPD, no alert */
  const V = vm.runInContext("blankVisit()", eng.context);
  delete V.symptoms;
  V.iop.od = "48"; V.pupil.rapd = "OD";
  eng.context.V = V; eng.context.P = { age: "60" };
  vm.runInContext("runDiagnosticEngine()", eng.context);
  assert.ok(/IOP critically elevated/.test((V.alerts || []).map((a) => a.m).join(" ")));
  assert.ok(/RAPD detected/.test((V.alerts || []).map((a) => a.m).join(" ")));
});

test("if scoring fails, the red flags still fire and the clinician is told", () => {
  const e2 = createEngine();
  vm.runInContext("scoreCondition = function () { throw new Error('injected'); };", e2.context);
  const out = e2.runCase({ iop: { od: "48" }, symptoms: ["flashes", "floaters"] }, { age: "60" });
  const txt = alertText(out);
  assert.ok(/IOP critically elevated/.test(txt) && /Flashes \+ floaters/.test(txt), "red flags lost: " + txt);
  assert.ok(/Entopic could not finish building the differential/.test(txt), "the failure was not announced");
  assert.strictEqual(out.dxList.length, 0, "a stale or partial differential must not be shown as current");
});

test("if the red-flag rules themselves fail, that is an URGENT banner — never an empty box", () => {
  const e2 = createEngine();
  vm.runInContext("computeAlerts = function () { throw new Error('injected'); };", e2.context);
  const out = e2.runCase({ iop: { od: "48" } }, { age: "60" });
  const f = out.alerts.find((a) => /Red-flag checks could not run/.test(a.m));
  assert.ok(f && f.l === "urgent", JSON.stringify(out.alerts));
});

test("a failing suggestion stage does not take the differential or the alerts with it", () => {
  const e2 = createEngine();
  vm.runInContext("computeNextTests = function () { throw new Error('injected'); };" +
                  "computeNudges = function () { throw new Error('injected'); };", e2.context);
  const out = e2.runCase({ iop: { od: "48" } }, { age: "60" });
  assert.ok(out.dxList.length > 0, "the differential was lost to a suggestion-stage failure");
  assert.ok(/IOP critically elevated/.test(alertText(out)));
});

test("hostile symptom-array elements are ignored, real ones still count", () => {
  const out = run({ symptoms: [null, 7, {}, [], "constructor", "__proto__", "flashes", "floaters"] });
  assert.ok(out.tokens.every((t) => typeof t === "string"), "a non-string became a token");
  assert.ok(/Flashes \+ floaters/.test(alertText(out)));
});


/* ═══ 5. AN AGE IS NOT EVIDENCE ═══ */

test("typing the patient's age does not inflate a one-symptom differential", () => {
  /* The sparse-evidence rule counted TOKENS; an age adds two or three
     demographic ones, so "distortion" alone scored Wet AMD 0.30 without an age
     and 0.60 with one. Demographics are declared context-only elsewhere in
     the engine; this rule now agrees. */
  const top = (p) => run({ symptoms: ["distortion"] }, p).dxList[0];
  const noAge = top({ age: "" }), withAge = top({ age: "55" });
  assert.strictEqual(withAge.n, noAge.n);
  assert.ok(Math.abs(withAge.prob - noAge.prob) < 1e-9,
    "age changed confidence " + noAge.prob.toFixed(2) + " → " + withAge.prob.toFixed(2));
  /* one onset selection is one fact, not three tokens — and two real facts
     are not sparse */
  const twoFacts = run({ symptoms: ["floaters"], temporal: { onset: "acute" } }, { age: "" }).dxList[0];
  const oneFact = run({ symptoms: ["floaters"] }, { age: "" }).dxList[0];
  assert.ok(twoFacts.prob > oneFact.prob, "a symptom plus its onset is two facts");
});


/* ═══ 6. ONE BAD PERSONAL CONDITION CANNOT BLANK THE DIFFERENTIAL ═══ */

test("malformed entries in the personal-condition store are skipped, not fatal", () => {
  /* overlayActive() read `o.deleted` on every stored entry; a null in the list
     (an import, a sync from another version) threw inside the differential
     stage and would have blanked every differential on the device. */
  const e2 = createEngine();
  const fs = require("node:fs"), path = require("node:path");
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/kb-overlay.js"), "utf8"), e2.context);
  e2.context.__store = [null, "x", 7, [],
    { name: "Evening dryness pattern", author: "", state: "draft", scope: "private",
      req: "dryness", sup: {}, con: null, urgent: true },
    { name: 5, author: "", state: "draft", scope: "private", req: ["dryness"] },
    { name: "Screen strain pattern", author: "", state: "draft", scope: "private",
      req: ["dryness"], sup: ["burning", 7, null], con: [] }];
  vm.runInContext("loadStore = function (k, d) { return k === OVERLAY_STORE ? __store : d; };", e2.context);
  const out = e2.runCase({ symptoms: ["dryness", "burning"], iop: { od: "48" } }, { age: "50" });
  assert.strictEqual(vm.runInContext("ENGINE_STATE.lastError", e2.context), null,
    "a malformed personal condition failed a stage");
  assert.ok(out.dxList.some((d) => !d.overlay), "the core differential was lost");
  assert.ok(/IOP critically elevated/.test(alertText(out)));
  const personal = out.dxList.filter((d) => d.overlay).map((d) => d.n);
  assert.ok(personal.indexOf("Screen strain pattern") >= 0, "the well-formed personal condition still scores");
  assert.ok(personal.indexOf("Evening dryness pattern") < 0,
    "a req STRING must not be read character by character as tokens");
});


/* ═══ 7. INPUTS THE KNOWLEDGE BASE WAS WRITTEN FOR ═══ */

test("the Course selector's Variable and Stable reach the conditions that list them", () => {
  /* 11 conditions list `variable` and one lists `stable` in their timing;
     Variable produced only `intermittent` and Stable produced nothing. */
  assert.ok(has(run({ symptoms: ["blur"], temporal: { course: "variable" } }), "variable"));
  assert.ok(has(run({ symptoms: ["blur"], temporal: { course: "variable" } }), "intermittent"), "kept for existing rules");
  assert.ok(has(run({ symptoms: ["blur"], temporal: { course: "stable" } }), "stable"));
});

test("keratic precipitates can be recorded (they were unreachable)", () => {
  assert.ok(has(run({ sl: { od: { cornea: "fine KPs inferiorly" } } }), "keratic_precipitates"));
  assert.ok(has(run({ sl: { od: { cornea: "mutton-fat keratic precipitates" } } }), "keratic_precipitates"));
  assert.ok(!has(run({ sl: { od: { cornea: "no KPs" } } }), "keratic_precipitates"));
});

test("every supportive, contradicting and required token in the KB can be produced by some input", () => {
  const R = eng.context.TOKEN_REGISTRY;
  const bad = Object.keys(R).filter((t) => !R[t].reachable &&
    (R[t].usage.req > 0 || R[t].usage.sup > 0 || R[t].usage.con > 0));
  assert.deepStrictEqual(bad, [], "tokens the KB relies on that no input can produce");
});
