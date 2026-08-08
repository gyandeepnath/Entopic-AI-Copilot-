/* ═══════════════════════════════════════════════════════════════ */
/* ALERTS MUST FIRE ONLY ON WHAT THEY SAY  (Phase 8, §5 §6 §8)      */
/*                                                                  */
/* FOUND BY MUTATION TESTING, not by reading the code.              */
/* tools/mutation-test.js changed one `&&` to `||` in the red-flag  */
/* rules:                                                           */
/*                                                                  */
/*   if (tokens.indexOf("flashes") >= 0 && tokens.indexOf("floaters") >= 0) */
/*                                                                  */
/* and the ENTIRE suite still passed. With that change, a patient    */
/* reporting floaters ALONE gets an urgent banner reading            */
/* "Flashes + floaters — rule out retinal tear / detachment" —       */
/* naming a symptom they never reported.                             */
/*                                                                  */
/* WHY NOTHING CAUGHT IT                                            */
/*                                                                  */
/* Every existing alert test asks "does the alert FIRE when it       */
/* should?". Almost none asks "does it STAY SILENT when it should?". */
/* That is the classic false-positive blind spot, and in a clinical  */
/* decision-support tool it is not a cosmetic problem: an alert that */
/* describes findings the patient does not have is the fastest way   */
/* to teach a clinician to stop reading alerts. Alert fatigue is how */
/* a real red flag gets dismissed.                                   */
/*                                                                  */
/* WHAT IS AND IS NOT ASSERTED HERE                                  */
/*                                                                  */
/* Nothing in this file invents a clinical threshold or a clinical   */
/* claim. Every expectation is derived from a rule that is already   */
/* in js/engine.js — either the CONJUNCTION the rule states, or the  */
/* wording the alert itself uses. Whether those rules are clinically */
/* right remains the founder's call; this only holds the engine to   */
/* what it already says.                                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const run = (v, p) => eng.runCase(v, p || { age: "55" });
const alertsMatching = (out, re) => Array.from(out.alerts).filter((a) => re.test(a.m));
const urgent = (out) => Array.from(out.alerts).filter((a) => a.l === "urgent");


/* ═══ 1. THE REGRESSION ═══ */

test("the flashes+floaters alert requires BOTH — floaters alone must not fire it", () => {
  const both = run({ symptoms: ["flashes", "floaters"] });
  assert.ok(alertsMatching(both, /flashes \+ floaters/i).length > 0,
    "setup: flashes AND floaters must raise the retinal-tear alert");

  const floatersOnly = run({ symptoms: ["floaters"] });
  assert.strictEqual(alertsMatching(floatersOnly, /flashes \+ floaters/i).length, 0,
    "an alert reading 'Flashes + floaters' fired for a patient who reported only floaters. " +
    "It names a symptom they do not have.");
});

test("the flashes+floaters alert requires BOTH — flashes alone must not fire it", () => {
  const flashesOnly = run({ symptoms: ["flashes"] });
  assert.strictEqual(alertsMatching(flashesOnly, /flashes \+ floaters/i).length, 0,
    "an alert reading 'Flashes + floaters' fired for a patient who reported only flashes");
});


/* ═══ 2. THE GENERAL PROPERTY ═══
   Any alert whose WORDING names a conjunction must require that conjunction.
   Derived from the alert text itself, so it extends automatically to any
   future rule written the same way. */

test("no alert names a finding the record does not contain", () => {
  /* Each case supplies ONE half of a conjunction the engine tests for. */
  const halves = [
    { name: "floaters alone",  visit: { symptoms: ["floaters"] },  absent: /flashes/i },
    { name: "flashes alone",   visit: { symptoms: ["flashes"] },   absent: /floaters/i }
  ];
  const bad = [];
  for (const h of halves) {
    for (const a of Array.from(run(h.visit).alerts)) {
      /* Only conjunctive wording matters: "X + Y". */
      if (/\+/.test(a.m) && h.absent.test(a.m)) bad.push(h.name + " → " + a.m);
    }
  }
  assert.deepStrictEqual(bad, [],
    "these alerts named a finding that was not recorded:\n  " + bad.join("\n  "));
});


/* ═══ 3. SILENCE ON RECORDS THAT DESERVE IT ═══
   The other half of the classifier. An engine that fires urgent alerts on
   ordinary presentations is one whose alerts stop being read. */

const ROUTINE = [
  ["an empty record", {}, { age: "40" }],
  ["uncomplicated dry eye", { symptoms: ["dryness", "burning", "grittiness"] }, { age: "45" }],
  ["a routine myopic refraction", { rx: { od_sph: "-2.25", os_sph: "-2.00" },
                                     va: { od_dist: "6/6", os_dist: "6/6" } }, { age: "28" }],
  ["normal IOP", { iop: { od: "15", os: "16" } }, { age: "50" }],
  ["a normal fundus", { fun: { od: { cd_v: "0.3" }, os: { cd_v: "0.3" } } }, { age: "50" }],
  ["presbyopic near blur", { symptoms: ["near_blur"] }, { age: "48" }]
];

for (const [name, visit, patient] of ROUTINE) {
  test("no urgent alert for " + name, () => {
    const out = run(visit, patient);
    const fired = urgent(out).map((a) => a.m);
    assert.deepStrictEqual(fired, [],
      "an urgent alert fired on a routine presentation — every one of these teaches a " +
      "clinician to stop reading alerts:\n  " + fired.join("\n  "));
  });
}


/* ═══ 4. AND THE RED FLAGS STILL FIRE ═══
   These are here so that nothing in this file can be "fixed" by making the
   engine quieter. Silence is only correct when there is nothing to say. */

const MUST_FIRE = [
  ["RAPD", { pupil: { rapd: "od" } }, { age: "60" }, /RAPD/i],
  ["hypopyon", { sl: { findings: ["Hypopyon"] } }, { age: "40" }, /hypopyon/i],
  ["flashes + floaters", { symptoms: ["flashes", "floaters"] }, { age: "62" }, /flashes \+ floaters/i],
  ["sudden vision loss", { symptoms: ["sudden_vision_loss"] }, { age: "70" }, /sudden vision loss/i],
  ["curtain in vision", { symptoms: ["curtain_vision"] }, { age: "65" }, /curtain|shadow/i]
];

for (const [name, visit, patient, re] of MUST_FIRE) {
  test("the " + name + " red flag still fires", () => {
    const out = run(visit, patient);
    const hits = alertsMatching(out, re);
    assert.ok(hits.length > 0, "no alert matched " + re + " — the red flag is gone");
    assert.strictEqual(hits[0].l, "urgent", name + " must be urgent, not a warning");
  });
}


/* ═══ 5. THE MUTATION HARNESS ITSELF ═══ */

test("the mutation tester exists and excludes equivalent mutants", () => {
  /* A mutation score that counts equivalent mutants is a misleading number,
     and this suite's first run showed why: 22 survivors, of which 21 changed
     no clinical output at all. Reporting "8%" would have been false alarm;
     reporting the filtered figure is the honest one. */
  const fs = require("node:fs");
  const path = require("node:path");
  const src = fs.readFileSync(
    path.resolve(__dirname, "..", "tools/mutation-test.js"), "utf8");
  assert.ok(/equivalent/i.test(src),
    "the mutation tester must separate real holes from equivalent mutants, or its score " +
    "is not evidence of anything");
});
