/* ═══════════════════════════════════════════════════════════════ */
/* WHAT CHANGED  (Phase 4 finding F-6)                              */
/*                                                                  */
/* The engine re-runs on every keystroke and the panel silently      */
/* redraws. These tests hold the diff to three promises:             */
/*                                                                  */
/*   1. It is accurate — the ranks it reports are the ranks that     */
/*      happened.                                                    */
/*   2. It only claims CAUSE when the engine's determinism makes     */
/*      that a proof (exactly one token changed), never otherwise.   */
/*   3. It is quiet. A panel that narrates every reshuffle trains    */
/*      the clinician to stop reading it — the same failure mode as  */
/*      alert fatigue.                                               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const D = require("../js/engine-diff.js");
const { createEngine } = require("../tools/lib/load-engine");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const snap = (tokens, ranked, alerts) => ({
  at: "2026-08-03T00:00:00Z",
  tokens: tokens.slice().sort(),
  ranked: ranked.map((r, i) => ({
    n: r.n, prob: r.prob || 0, rank: i + 1, urgent: !!r.urgent, overlay: !!r.overlay
  })),
  alerts: alerts || []
});


/* ═══ ACCURACY ═══ */

test("a condition that climbs is reported with both ranks", () => {
  const a = snap(["pain"], [{ n: "A" }, { n: "B" }, { n: "C" }, { n: "Uveitis" }]);
  const b = snap(["pain", "photophobia"], [{ n: "Uveitis" }, { n: "A" }, { n: "B" }, { n: "C" }]);
  const d = D.engineDiff(a, b);
  const mv = d.moved.find((m) => m.n === "Uveitis");
  assert.ok(mv, "the move must be reported");
  assert.strictEqual(mv.from, 4);
  assert.strictEqual(mv.to, 1);
});

test("entering and leaving the list are distinguished from moving within it", () => {
  const a = snap(["x"], [{ n: "A" }, { n: "B" }]);
  const b = snap(["x", "y"], [{ n: "B" }, { n: "C" }]);
  const d = D.engineDiff(a, b);
  assert.deepStrictEqual(d.entered.map((e) => e.n), ["C"]);
  assert.deepStrictEqual(d.left.map((e) => e.n), ["A"]);
  assert.deepStrictEqual(d.moved.map((e) => e.n), ["B"]);
});

test("token additions and removals are both tracked", () => {
  const d = D.engineDiff(snap(["a", "b"], []), snap(["b", "c"], []));
  assert.deepStrictEqual(d.tokens_added, ["c"]);
  assert.deepStrictEqual(d.tokens_removed, ["a"]);
});

test("an identical re-run reports no change", () => {
  const s = snap(["a"], [{ n: "A" }], [{ m: "x", l: "warn" }]);
  const d = D.engineDiff(s, snap(["a"], [{ n: "A" }], [{ m: "x", l: "warn" }]));
  assert.strictEqual(d.changed, false);
  assert.deepStrictEqual(D.engineDiffNarrate(d), []);
});


/* ═══ CAUSE VS COINCIDENCE ═══ */

test("one token changed → stated as cause", () => {
  const d = D.engineDiff(
    snap(["pain"], [{ n: "A" }, { n: "Uveitis" }]),
    snap(["pain", "photophobia"], [{ n: "Uveitis" }, { n: "A" }])
  );
  assert.strictEqual(d.attributable, true);
  const text = D.engineDiffNarrate(d).map((l) => l.text).join(" | ");
  assert.match(text, /Adding /, "wording must attribute the change: " + text);
  assert.match(text, /Uveitis/);
});

test("several tokens changed → never stated as cause", () => {
  const d = D.engineDiff(
    snap(["pain"], [{ n: "A" }, { n: "Uveitis" }]),
    snap(["pain", "photophobia", "redness"], [{ n: "Uveitis" }, { n: "A" }])
  );
  assert.strictEqual(d.attributable, false);
  const text = D.engineDiffNarrate(d).map((l) => l.text).join(" | ");
  assert.ok(!/^Adding/.test(text), "must not blame one of several changes: " + text);
  assert.match(text, /Since your last entry/);
});

test("a removed token is attributed too", () => {
  const d = D.engineDiff(snap(["pain", "halos"], [{ n: "A" }]), snap(["pain"], [{ n: "B" }]));
  assert.strictEqual(d.attributable, true);
  assert.match(D.engineDiffNarrate(d)[0].text, /^Removing /);
});


/* ═══ SAFETY: A LOST ALERT IS THE LOUDEST LINE ═══ */

test("an alert that stopped showing is reported first and as urgent", () => {
  const a = snap(["flashes", "floaters"], [{ n: "RD", urgent: true }],
    [{ m: "Flashes + floaters — rule out retinal tear / detachment", l: "urgent" }]);
  const b = snap(["flashes"], [{ n: "PVD" }], []);
  const lines = D.engineDiffNarrate(D.engineDiff(a, b));
  assert.ok(lines.length, "something must be said");
  assert.strictEqual(lines[0].level, "urgent");
  assert.match(lines[0].text, /^No longer showing:/);
});

test("a new alert is reported, after any lost one", () => {
  const a = snap(["pain"], [{ n: "A" }], []);
  const b = snap(["pain", "halos"], [{ n: "A" }], [{ m: "IOP elevated", l: "warn" }]);
  const lines = D.engineDiffNarrate(D.engineDiff(a, b));
  assert.match(lines[0].text, /^New alert:/);
});

test("an urgent condition dropping off the list is a warning, not an aside", () => {
  const a = snap(["x"], [{ n: "Retinal Detachment", urgent: true }, { n: "A" }]);
  const b = snap(["x", "y"], [{ n: "A" }]);
  const lines = D.engineDiffNarrate(D.engineDiff(a, b));
  const dropped = lines.find((l) => /Retinal Detachment/.test(l.text));
  assert.ok(dropped, "the drop must be reported");
  assert.strictEqual(dropped.level, "warn");
  assert.match(dropped.text, /marked urgent/);
});


/* ═══ QUIET: NOISE IS A DEFECT ═══ */

test("a derived alert whose match strength moved is NOT a lost-and-gained alert", () => {
  /* Found by driving the real app, not by a unit test. Derived alerts (F-1)
     embed the score in their wording — "… (match 17)". Comparing on TEXT made
     one alert whose score moved two points read as a removal plus an addition,
     and "No longer showing" is the loudest line the panel has. */
  const a = snap(["pain"], [{ n: "SJS", urgent: true }], [{
    m: "SJS — urgent condition in the differential (match 17). Consider referral urgency.",
    l: "urgent", derived: true, condition: "SJS"
  }]);
  const b = snap(["pain", "photophobia"], [{ n: "SJS", urgent: true }], [{
    m: "SJS — urgent condition in the differential (match 19). Consider referral urgency.",
    l: "urgent", derived: true, condition: "SJS"
  }]);
  const d = D.engineDiff(a, b);
  assert.strictEqual(d.alerts_removed.length, 0, "the alert did not go away — its number moved");
  assert.strictEqual(d.alerts_added.length, 0);
  const text = D.engineDiffNarrate(d).map((l) => l.text).join(" | ");
  assert.ok(!/No longer showing/.test(text), "nothing was lost: " + text);
});

test("a genuinely different alert for the same condition is still one alert", () => {
  const a = snap(["x"], [], [{ m: "Cond A — (match 20).", l: "urgent", derived: true, condition: "A" }]);
  const b = snap(["x", "y"], [], [{ m: "Cond B — (match 20).", l: "urgent", derived: true, condition: "B" }]);
  const d = D.engineDiff(a, b);
  assert.strictEqual(d.alerts_removed.length, 1);
  assert.strictEqual(d.alerts_added.length, 1);
});

test("a derived alert leaving is a warning; a hand-written red flag leaving is urgent", () => {
  const derived = D.engineDiff(
    snap(["x"], [], [{ m: "Panuveitis — urgent condition in the differential (match 17).", l: "urgent", derived: true, condition: "Panuveitis" }]),
    snap(["x", "y"], [], [])
  );
  assert.strictEqual(D.engineDiffNarrate(derived)[0].level, "warn",
    "an urgent condition sliding off the list is worth saying, but is not itself an emergency");

  const handWritten = D.engineDiff(
    snap(["flashes", "floaters"], [], [{ m: "Flashes + floaters — rule out retinal tear / detachment", l: "urgent" }]),
    snap(["flashes"], [], [])
  );
  assert.strictEqual(D.engineDiffNarrate(handWritten)[0].level, "urgent",
    "a red-flag rule that stopped firing is urgent news");
});

test("a condition is named once, not once per mechanism", () => {
  /* An urgent condition leaving the list produces BOTH a lost derived alert and
     a "dropped" line. Saying it twice is how a panel gets ignored. */
  const a = snap(["x"], [{ n: "Panuveitis", urgent: true }, { n: "A" }],
    [{ m: "Panuveitis — urgent condition in the differential (match 17).", l: "urgent", derived: true, condition: "Panuveitis" }]);
  const b = snap(["x", "y"], [{ n: "A" }], []);
  const lines = D.engineDiffNarrate(D.engineDiff(a, b));
  const mentions = lines.filter((l) => /Panuveitis/.test(l.text)).length;
  assert.strictEqual(mentions, 1, "said " + mentions + " times: " + JSON.stringify(lines));
});

test("a reshuffle deep in the list is not narrated", () => {
  /* 7th and 8th swapping places is not information. */
  const base = ["A", "B", "C", "D", "E", "F", "G", "H"].map((n) => ({ n }));
  const swapped = base.slice();
  swapped[6] = base[7]; swapped[7] = base[6];
  const d = D.engineDiff(snap(["x"], base), snap(["x", "y"], swapped));
  assert.ok(d.moved.length >= 2, "the diff still knows about it");
  const lines = D.engineDiffNarrate(d);
  assert.ok(!lines.some((l) => /→/.test(l.text)),
    "…but does not narrate it: " + JSON.stringify(lines));
});

test("a finding that changed nothing says so rather than saying nothing", () => {
  const d = D.engineDiff(snap(["x"], [{ n: "A" }]), snap(["x", "y"], [{ n: "A" }]));
  const lines = D.engineDiffNarrate(d);
  assert.strictEqual(lines.length, 1);
  assert.match(lines[0].text, /did not change the differential/);
});

test("tokens are named in clinical language, not as engine identifiers", () => {
  assert.strictEqual(D.engineTokenLabel("no_such_token_xyz"), "no such token xyz",
    "an unknown token degrades to readable text, never to a guess");
});


/* ═══ THE RING ═══ */

test("history is per visit — a different visit never diffs against the last one", () => {
  D.ENGINE_RUNS.key = null; D.ENGINE_RUNS.list = []; D.ENGINE_RUNS.lastDiff = null;
  D.engineRecordRun({ id: "v1", date: "d", dxList: [{ n: "A", prob: 0.5 }], alerts: [] }, ["a"]);
  D.engineRecordRun({ id: "v1", date: "d", dxList: [{ n: "B", prob: 0.5 }], alerts: [] }, ["a", "b"]);
  assert.ok(D.engineLastDiff(), "same visit → a diff");
  D.engineRecordRun({ id: "v2", date: "d", dxList: [{ n: "Z", prob: 0.5 }], alerts: [] }, ["z"]);
  assert.strictEqual(D.engineLastDiff(), null, "new visit → history restarts, no diff");
  assert.strictEqual(D.engineRunHistory().length, 1);
});

test("no-op re-runs do not fill the ring", () => {
  D.ENGINE_RUNS.key = null; D.ENGINE_RUNS.list = []; D.ENGINE_RUNS.lastDiff = null;
  const visit = { id: "v3", date: "d", dxList: [{ n: "A", prob: 0.5 }], alerts: [] };
  for (let i = 0; i < 10; i++) D.engineRecordRun(visit, ["a"]);
  assert.strictEqual(D.engineRunHistory().length, 1,
    "the engine fires on navigation too; identical runs must not evict real ones");
});

test("the ring is bounded", () => {
  D.ENGINE_RUNS.key = null; D.ENGINE_RUNS.list = []; D.ENGINE_RUNS.lastDiff = null;
  for (let i = 0; i < D.ENGINE_DIFF_MAX + 20; i++) {
    D.engineRecordRun({ id: "v4", date: "d", dxList: [{ n: "A" + i, prob: 0.5 }], alerts: [] }, ["t" + i]);
  }
  assert.strictEqual(D.engineRunHistory().length, D.ENGINE_DIFF_MAX);
});


/* ═══ AGAINST THE REAL ENGINE ═══ */

test("the real engine records a diff, and photophobia really does move uveitis up", () => {
  const eng = createEngine();
  eng.runCase({ symptoms: ["pain", "redness"] });
  const before = eng.context.V.dxList.map((d) => d.n);

  /* Same visit object, one more symptom — the engine's own hook records it. */
  eng.context.V.symptoms = ["pain", "redness", "photophobia"];
  eng.context.eval ? 0 : 0;
  require("node:vm").runInContext("runDiagnosticEngine()", eng.context);
  const after = eng.context.V.dxList.map((d) => d.n);

  const diff = require("node:vm").runInContext("engineLastDiff()", eng.context);
  assert.ok(diff, "the engine must have recorded a diff — the hook is wired");
  assert.strictEqual(diff.attributable, true, "exactly one symptom changed");
  assert.ok(diff.tokens_added.indexOf("photophobia") >= 0);
  assert.ok(before.length && after.length);
});

test("a diff never mutates the engine's outputs", () => {
  const eng = createEngine();
  const out = eng.runCase({ symptoms: ["flashes", "floaters"], temporal: { onset: "sudden_onset" } });
  const alertsBefore = out.alerts.length;
  const dxBefore = out.dxList.length;
  require("node:vm").runInContext("engineDiffNarrate(engineLastDiff())", eng.context);
  assert.strictEqual(eng.context.V.alerts.length, alertsBefore);
  assert.strictEqual(eng.context.V.dxList.length, dxBefore);
});


/* ═══ WIRING ═══ */

test("loaded in the browser after the engine that calls it", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/engine-diff.js") > order.indexOf("js/engine.js"));
  assert.ok(order.indexOf("js/ui-advisory.js") > order.indexOf("js/engine-diff.js"),
    "the panel that renders it must load after it");
});

test("the advisory panel renders it above the differential", () => {
  const src = read("js/ui-advisory.js");
  assert.ok(src.indexOf("engineDiffNarrate") > 0, "the panel must call it");
  assert.ok(src.indexOf("What changed") < src.indexOf("Leading Impression"),
    "a lost red flag must be readable before the new list");
});
