/* ═══════════════════════════════════════════════════════════════ */
/* DERIVED ALERTS  (Phase 4 finding F-1)                            */
/*                                                                  */
/* 63 conditions carry urgent:true. computeAlerts() is 17           */
/* hand-written rules. Nothing connected them, so only 12 urgent    */
/* conditions raised a banner and 51 did not — including Chemical   */
/* Eye Burn, Open Globe Injury and Retinal Detachment.              */
/*                                                                  */
/* These tests pin BOTH sides of the fix. Closing the gap is easy;  */
/* closing it without drowning routine clinic in red banners is     */
/* the part that needed care, because an alert that fires on every  */
/* visit gets dismissed along with the one that matters.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { createEngine } = require("../tools/lib/load-engine");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const eng = createEngine();
const K = loadKnowledgeBase();
const ALL = Array.isArray(K) ? K : (K.KNOWLEDGE_ALL || []);
const URGENT = ALL.filter((c) => c.urgent);

const run = (symptoms, age) => eng.runCase({ symptoms: symptoms }, { age: String(age || 60) });


/* ── The gap is closed ── */

test("EVERY urgent condition can raise an alert", () => {
  /* The measurement that produced the finding, re-run as a contract: feed each
     urgent condition exactly its own required findings and demand a banner. */
  const silent = [];
  for (const c of URGENT) {
    const r = run((c.req || []).slice());
    if (!(r.alerts || []).length) silent.push(c.name);
  }
  assert.deepStrictEqual(silent, [],
    "these urgent conditions reach the differential with NO alert banner:\n  " +
    silent.join("\n  "));
});

test("the specific cases that were silent now alert", () => {
  for (const [symptoms, expect] of [
    [["chemical_splash"], "Chemical Eye Burn"],
    [["recent_eye_trauma", "high_speed_particle"], "Foreign Body"],
    [["flashes", "floaters"], "Retinal"]
  ]) {
    const r = run(symptoms);
    assert.ok((r.alerts || []).length > 0,
      "no alert for " + JSON.stringify(symptoms));
    assert.ok((r.alerts || []).some((a) => new RegExp(expect, "i").test(a.m)),
      JSON.stringify(symptoms) + " should mention " + expect +
      " — got: " + (r.alerts || []).map((a) => a.m).join(" | "));
  }
});


/* ── ...without creating alert fatigue ── */

test("routine presentations raise NO urgent banner", () => {
  /* The other half of the fix, and the harder half. An alert on every routine
     visit is dismissed reflexively, and then so is the one that matters
     (Phase 2, CS-06). */
  const routine = [
    [["dryness", "burning", "grittiness"], 58, "dry eye"],
    [["blurred_distance"], 35, "refractive"],
    [["itching", "tearing"], 24, "allergy"],
    [["headache", "eyestrain"], 41, "asthenopia"],
    [["redness", "discharge"], 30, "red eye"]
  ];
  const noisy = [];
  for (const [symptoms, age, label] of routine) {
    const alerts = (run(symptoms, age).alerts || []).filter((a) => a.l === "urgent");
    if (alerts.length) noisy.push(label + ": " + alerts.map((a) => a.m).join(" | "));
  }
  assert.deepStrictEqual(noisy, [],
    "routine clinic must not produce urgent banners:\n  " + noisy.join("\n  "));
});


/* ── It ADDS; it never replaces ── */

test("the 17 hand-written rules still fire, and come first", () => {
  /* They fire on a SYMPTOM, before any condition is scored — earlier, and
     better worded. The derived floor sits beneath them. */
  const r = run(["sudden_vision_loss"], 72);
  const alerts = r.alerts || [];
  assert.ok(alerts.length >= 2, "expected the hand-written rule plus derived ones");
  assert.ok(!alerts[0].derived, "a hand-written alert must come first");
  assert.ok(/Sudden vision loss/i.test(alerts[0].m));
  assert.ok(alerts.some((a) => a.derived), "and derived ones follow");
});

test("a condition already named by a hand-written rule is not alerted twice", () => {
  const r = run(["flashes", "floaters"]);
  const seen = {};
  const dupes = [];
  for (const a of (r.alerts || [])) {
    const key = String(a.m).toLowerCase().replace(/[^a-z]/g, "").slice(0, 25);
    if (seen[key]) dupes.push(a.m);
    seen[key] = true;
  }
  assert.deepStrictEqual(dupes, [], "duplicate alerts:\n  " + dupes.join("\n  "));
});

test("a derived alert states its match strength so it can be triaged", () => {
  /* An alert that says how confident it is fatigues far less than one that
     does not. */
  const r = run(["chemical_splash"]);
  const d = (r.alerts || []).find((a) => a.derived);
  assert.ok(d, "expected a derived alert");
  assert.ok(/match \d+/.test(d.m), "must state the match strength: " + d.m);
  assert.strictEqual(typeof d.score, "number");
});


/* ── Structural guarantees ── */

test("derived alerts never remove or reorder a core alert", () => {
  const src = read("js/engine.js");
  const block = /computeDerivedAlerts\(mergedShown, V\.alerts\);[\s\S]{0,240}/.exec(src);
  assert.ok(block, "derived alert wiring not found");
  assert.ok(/V\.alerts\.push\(_derived\[dv\]\)/.test(block[0]),
    "derived alerts must be PUSHED onto the existing list");
  assert.ok(!/V\.alerts\s*=\s*_derived|V\.alerts\.splice|V\.alerts\.shift/.test(src),
    "nothing may replace, splice or shift the core alert list");
});

test("a user-authored condition never produces a DERIVED alert", () => {
  /* Overlays have their own attributed alert path. Letting them through here
     would produce an unattributed red banner from unreviewed content. */
  const src = read("js/engine.js");
  const fn = /function computeDerivedAlerts[\s\S]*?\n}/.exec(src);
  assert.ok(fn);
  assert.ok(/if \(r\._overlay\) continue;/.test(fn[0]),
    "computeDerivedAlerts must skip overlay conditions");
});

test("the threshold is a named constant, documented as a clinical decision", () => {
  /* It trades alert fatigue against a missed banner. That is a clinical
     judgement, and it must be findable and changeable without reading the
     algorithm. */
  const src = read("js/engine.js");
  assert.ok(/var DERIVED_ALERT_MIN = /.test(src), "must be a named constant");
  assert.ok(/NEEDS_CLINICAL_REVIEW/.test(src) && /THE THRESHOLD IS A CLINICAL CALL/i.test(src),
    "and must be flagged for the founder to set");
});

test("determinism survives the change", () => {
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    seen.add(JSON.stringify((run(["chemical_splash"]).alerts || []).map((a) => a.m)));
  }
  assert.strictEqual(seen.size, 1, "alerts must be identical across runs");
});


/* ═══ Gate reasons surfaced (Phase 4 finding F-5) ═══ */

test("a force-surfaced condition says WHY, as its own field", () => {
  /* The most explanatory thing the engine produces. It was computed, appended
     to the end of a reasoning string, and effectively invisible. */
  const r = run(["flashes", "floaters"], 62);
  const gated = (r.dxList || []).filter((d) => d.gatedBecause);
  assert.ok(gated.length > 0,
    "flashes + floaters must force-surface retinal conditions with a stated reason");
  assert.ok(/flashes/i.test(gated[0].gatedBecause),
    "the reason must name the findings that caused it: " + gated[0].gatedBecause);
});

test("the reason is rendered, not merely computed", () => {
  const ui = read("js/ui-advisory.js");
  assert.ok(/d\.gatedBecause/.test(ui), "the panel must read the field");
  assert.ok(/Shown because:/.test(ui), "and say plainly why the condition is on the list");
});

test("a condition that scored its way in has no gate reason", () => {
  /* The field must distinguish "force-surfaced for safety" from "matched well",
     or it says nothing. */
  const r = run(["dryness", "burning", "grittiness"], 58);
  const gated = (r.dxList || []).filter((d) => d.gatedBecause);
  assert.strictEqual(gated.length, 0,
    "a routine dry-eye differential is scored, not gated");
});
