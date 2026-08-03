/* ═══════════════════════════════════════════════════════════════ */
/* RED-FLAG REGISTER  (Phase 2 safety finding CS-04)                */
/*                                                                  */
/* The register in knowledge/red-flags.js is only worth anything if  */
/* it cannot drift from the code. The engine never reads it — that   */
/* is deliberate, so no data problem can suppress an alert — which   */
/* means these tests are the ONLY thing keeping the two in step.     */
/*                                                                  */
/* Two directions, both required:                                    */
/*   • every alert the engine can raise is declared, or a rule was   */
/*     added that no clinician has seen;                             */
/*   • every declared rule still exists in the engine, or the        */
/*     register is describing an alert that no longer fires.         */
/*                                                                  */
/* And, separately: the red flags still actually fire. A register    */
/* that documents a broken alert is worse than no register.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../knowledge/red-flags.js");
const T = require("../knowledge/clinical-thresholds.js");
const { createEngine } = require("../tools/lib/load-engine");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const ENGINE_SRC = read("js/engine.js");

/* Every alert the engine can push, as the source writes it. */
function engineAlertPushes() {
  const re = /alerts\.push\(\{\s*m:\s*([\s\S]*?),\s*l:\s*"(urgent|warn)"/g;
  return [...ENGINE_SRC.matchAll(re)].map((m) => ({ expr: m[1], level: m[2] }));
}


/* ═══ THE REGISTER AND THE CODE AGREE ═══ */

test("every alert the engine can raise is declared in the register", () => {
  const declared = R.RED_FLAG_RULES.concat([R.RED_FLAG_DERIVED_RULE, R.RED_FLAG_OVERLAY_RULE]);
  const undeclared = engineAlertPushes().filter((p) =>
    !declared.some((d) => p.expr.indexOf(d.match) >= 0));
  assert.deepStrictEqual(undeclared.map((u) => u.expr.trim()), [],
    "an alert exists that no clinician has been shown. Declare it in\n" +
    "knowledge/red-flags.js so it enters the sign-off workflow.");
});

test("every declared rule still exists in the engine", () => {
  const stale = R.RED_FLAG_RULES.filter((r) => ENGINE_SRC.indexOf(r.match) < 0);
  assert.deepStrictEqual(stale.map((r) => r.id), [],
    "the register describes an alert the engine no longer raises");
  assert.ok(ENGINE_SRC.indexOf(R.RED_FLAG_DERIVED_RULE.match) > 0,
    "the derived-alert rule must still exist");
});

test("declared levels match the levels the engine actually emits", () => {
  const wrong = [];
  for (const r of R.RED_FLAG_RULES) {
    const push = engineAlertPushes().find((p) => p.expr.indexOf(r.match) >= 0);
    if (push && push.level !== r.level) {
      wrong.push(`${r.id}: register says ${r.level}, engine emits ${push.level}`);
    }
  }
  assert.deepStrictEqual(wrong, [],
    "a reviewer signing off 'warn' must not be signing off an urgent banner:\n  " + wrong.join("\n  "));
});

test("every threshold a rule cites exists and is the one the engine uses", () => {
  const bad = [];
  for (const r of R.RED_FLAG_RULES.concat([R.RED_FLAG_DERIVED_RULE, R.RED_FLAG_OVERLAY_RULE])) {
    for (const id of r.uses || []) {
      const known = T.CLINICAL_THRESHOLDS[id] || T.SCORING_THRESHOLDS[id];
      if (!known) bad.push(`${r.id} cites unknown threshold ${id}`);
    }
  }
  assert.deepStrictEqual(bad, [], bad.join("\n  "));
});


/* ═══ THE REGISTER IS REVIEWABLE ═══ */

test("every rule states its trigger in clinical language and says why", () => {
  const bad = [];
  for (const r of R.RED_FLAG_RULES.concat([R.RED_FLAG_DERIVED_RULE, R.RED_FLAG_OVERLAY_RULE])) {
    if (!r.id) bad.push("a rule has no id");
    if (!r.fires_when || r.fires_when.length < 20) bad.push(r.id + ": `fires_when` must be judgeable without reading code");
    if (!r.why || r.why.length < 20) bad.push(r.id + ": `why` missing");
    if (r.level !== "urgent" && r.level !== "warn") bad.push(r.id + ": level must be urgent or warn");
    if (!r.status) bad.push(r.id + ": `status` missing");
  }
  assert.deepStrictEqual(bad, [], bad.join("\n  "));
});

test("no rule claims a citation nobody read", () => {
  const bad = R.RED_FLAG_RULES.concat([R.RED_FLAG_DERIVED_RULE, R.RED_FLAG_OVERLAY_RULE])
    .filter((r) => r.src && r.src.trim() && r.status !== "VERIFIED")
    .map((r) => r.id);
  assert.deepStrictEqual(bad, []);
});

test("ids are unique — the test that pins this to the code depends on it", () => {
  const ids = R.RED_FLAG_RULES.map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test("redFlagsUnverified lists everything still awaiting the founder", () => {
  assert.strictEqual(R.redFlagsUnverified().length, R.RED_FLAG_RULES.length + 2,
    "not one red-flag rule has been clinically signed off yet; if that changes, " +
    "this number changes with it, deliberately");
});


/* ═══ THE RULES STILL FIRE ═══ */

/* Documenting a broken alert is worse than not documenting it. These probe the
   real engine for the rules that can be triggered from visit data alone. */
const eng = createEngine();
const alertsFor = (v, p) => eng.runCase(v, p).alerts;
const fires = (v, fragment, p) => alertsFor(v, p).some((a) => a.m.indexOf(fragment) >= 0);

test("the symptom red flags fire", () => {
  assert.ok(fires({ symptoms: ["sudden_vision_loss"] }, "Sudden vision loss"));
  assert.ok(fires({ symptoms: ["flashes", "floaters"] }, "Flashes + floaters"));
  assert.ok(fires({ symptoms: ["curtain_vision"] }, "Curtain / shadow"));
  assert.ok(fires({ symptoms: ["pain_eye_movement"] }, "Pain on eye movement"));
});

test("the IOP bands fire, and only one at a time", () => {
  const crit = alertsFor({ iop: { od: "48", os: "14" } }).filter((a) => /^IOP/.test(a.m));
  assert.strictEqual(crit.length, 1, "bands must be exclusive: " + JSON.stringify(crit));
  assert.match(crit[0].m, /critically elevated/);

  assert.ok(fires({ iop: { od: "34", os: "14" } }, "significantly elevated"));
  assert.ok(fires({ iop: { od: "24", os: "14" } }, "IOP elevated"));
  assert.ok(!fires({ iop: { od: "16", os: "14" } }, "IOP"), "a normal pressure raises nothing");
});

test("the objective-sign red flags fire", () => {
  assert.ok(fires({ pupil: { rapd: "1+" } }, "RAPD detected"));
  assert.ok(fires({ sl: { od: { vh: "1" } } }, "OD — gonioscopy before dilation"));
  assert.ok(fires({ sl: { os: { vh: "2" } } }, "OS — gonioscopy before dilation"));
  assert.ok(fires({ paed: { red_reflex_od: "White (leukocoria)" } }, "Leukocoria"));
});

test("a routine visit raises no red flag at all", () => {
  /* The register is only credible if the alerts are rare. */
  const routine = alertsFor({
    symptoms: ["dryness", "grittiness"],
    iop: { od: "15", os: "16" },
    sl: { od: { vh: "4" }, os: { vh: "4" } }
  });
  const urgent = routine.filter((a) => a.l === "urgent").map((a) => a.m).join(" | ");
  assert.strictEqual(urgent, "",
    "a dry-eye patient must not be shown an urgent banner: " + urgent);
});


/* ═══ THE ENGINE MUST NOT DEPEND ON THE REGISTER ═══ */

test("the engine never reads the register — a data problem cannot suppress an alert", () => {
  assert.ok(ENGINE_SRC.indexOf("RED_FLAG_RULES") < 0,
    "red flags stay in code precisely so that nothing can unload them");
  const order = require("../tools/lib/kb-load-order").engineOrder();
  assert.ok(order.indexOf("knowledge/red-flags.js") < 0,
    "the register is documentation; loading it into the engine path would imply otherwise");
});
