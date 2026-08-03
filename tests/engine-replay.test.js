/* ═══════════════════════════════════════════════════════════════ */
/* DETERMINISTIC REPLAY                                             */
/*                                                                  */
/* Replay only earns trust if it is boring: same inputs, same KB,    */
/* identical answer, every time. So the first thing tested is that   */
/* a freshly recorded visit reproduces EXACTLY — because if that     */
/* fails, every drift report the feature ever produces is noise.     */
/*                                                                  */
/* The second thing tested is that it leaves nothing behind. Replay  */
/* swaps the V and P globals out from under a live app; a leak would */
/* mean a clinician's open exam quietly becomes someone else's.      */
/*                                                                  */
/* The third is honesty: it must never present drift as history.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createEngine } = require("../tools/lib/load-engine");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Run inside the engine's own realm — replay assigns the V/P globals, so it
   must share a realm with the engine that reads them. */
function ctxCall(eng, expr, arg) {
  eng.context.__arg = arg === undefined ? null : JSON.parse(JSON.stringify(arg));
  return vm.runInContext(expr, eng.context);
}

/* Produce a genuinely recorded visit: run the real engine, then keep what it
   wrote on the visit, exactly as storage would. */
function recordVisit(eng, visitOverrides, patientOverrides) {
  eng.runCase(visitOverrides, patientOverrides);
  const data = JSON.parse(JSON.stringify(eng.context.V));
  return {
    id: "vis-" + Math.random().toString(36).slice(2, 8),
    patient_id: "pat-1",
    status: "completed",
    date: "2026-08-01T09:00:00.000Z",
    data: data
  };
}

function replay(eng, stored, patient) {
  eng.context.__stored = JSON.parse(JSON.stringify(stored));
  eng.context.__pat = patient ? JSON.parse(JSON.stringify(patient)) : null;
  return vm.runInContext("replayVisit(__stored, __pat)", eng.context);
}


/* ═══ 1. A FRESH RECORD REPRODUCES EXACTLY ═══ */

test("a visit recorded by this engine replays faithfully", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, {
    symptoms: ["pain", "photophobia", "redness"],
    temporal: { onset: "sudden_onset" }
  });
  const r = replay(eng, stored);

  assert.strictEqual(r.available, true, r.reason || "");
  assert.strictEqual(r.same_kb, true, "nothing changed between recording and replay");
  assert.strictEqual(r.drift.derivation_changed, false,
    "the same findings must derive the same tokens: " + JSON.stringify(r.drift.derivation));
  assert.strictEqual(r.drift.any, false,
    "a same-session replay that is not identical means the engine is not deterministic");
  assert.strictEqual(r.faithful, true);
});

test("faithful replay is reported as a reproduction, not as drift", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["dryness", "grittiness"] });
  const lines = ctxCall(eng, "replayNarrate(replayVisit(__arg, null))", stored);
  assert.strictEqual(lines.length, 1);
  assert.strictEqual(lines[0].level, "ok");
  assert.match(lines[0].text, /Reproduced exactly/);
});

test("a red-flag visit reproduces its red flags", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, {
    symptoms: ["flashes", "floaters"], temporal: { onset: "sudden_onset" }
  });
  assert.ok(stored.data.alerts.some((a) => a.l === "urgent"), "the fixture must have an urgent alert");
  const r = replay(eng, stored);
  assert.strictEqual(r.drift.alerts_lost.length, 0, "no red flag may be lost on a faithful replay");
  assert.strictEqual(r.drift.alerts_gained.length, 0);
});


/* ═══ 2. IT LEAVES NOTHING BEHIND ═══ */

test("replay restores the live visit, patient and engine state", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain"] });

  /* Set up a "live" exam the way the app would. */
  eng.runCase({ symptoms: ["itching_dominant"] });
  const liveV = eng.context.V;
  const liveP = eng.context.P;
  const liveTokens = eng.context.ENGINE_STATE.tokens.slice();
  const liveRunCount = eng.context.ENGINE_STATE.runCount;
  const liveDx = liveV.dxList.map((d) => d.n).join("|");

  replay(eng, stored);

  assert.strictEqual(eng.context.V, liveV, "V must be the same object it was");
  assert.strictEqual(eng.context.P, liveP, "P must be the same object it was");
  assert.strictEqual(eng.context.V.dxList.map((d) => d.n).join("|"), liveDx,
    "the live differential must be untouched");
  assert.strictEqual(eng.context.ENGINE_STATE.tokens.join(","), liveTokens.join(","));
  assert.strictEqual(eng.context.ENGINE_STATE.runCount, liveRunCount,
    "a replay is not a run of the clinician's exam and must not count as one");
});

test("replay does not pollute the 'what changed' history", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain", "halos"] });
  eng.runCase({ symptoms: ["itching_dominant"] });
  const before = vm.runInContext("engineRunHistory().length", eng.context);
  replay(eng, stored);
  const after = vm.runInContext("engineRunHistory().length", eng.context);
  assert.strictEqual(after, before,
    "the clinician's next 'what changed' must not describe a replay they never did");
});

test("replay never writes to the stored visit", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain", "photophobia"] });
  const before = JSON.stringify(stored);
  replay(eng, stored);
  assert.strictEqual(JSON.stringify(stored), before,
    "a record is evidence; replay reads it and must never rewrite it");
});


/* ═══ 3. IT DETECTS THE TWO KINDS OF DRIFT, SEPARATELY ═══ */

test("derivation drift is reported when the same findings now yield different tokens", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain", "photophobia"] });
  /* Simulate an engine whose derivation has since changed: the record claims a
     token today's derivation does not produce, and lacks one it does. */
  stored.data.engine_tokens = stored.data.engine_tokens
    .filter((t) => t !== "photophobia")
    .concat(["a_token_no_longer_derived"]);

  const r = replay(eng, stored);
  assert.strictEqual(r.drift.derivation_changed, true);
  assert.ok(r.drift.derivation.added.indexOf("photophobia") >= 0,
    "a token now derived but not recorded is an addition");
  assert.ok(r.drift.derivation.removed.indexOf("a_token_no_longer_derived") >= 0,
    "a token recorded but no longer derived is a removal");

  const lines = ctxCall(eng, "replayNarrate(replayVisit(__arg, null))", stored);
  const text = lines.map((l) => l.text).join(" | ");
  assert.match(text, /derivation rules or a clinical threshold/,
    "the narration must point at the engine, not at the knowledge base: " + text);
});

test("knowledge drift is reported when the same tokens now rank differently", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain", "photophobia", "redness"] });
  /* Simulate a knowledge base that has since changed: the record says a
     condition led that today's KB does not produce from those tokens. */
  stored.data.engine_provenance.shown_top = [
    { name: "A Condition That No Longer Exists", prob: 0.9, icd: "", icd_status: "", urgent: false }
  ];

  const r = replay(eng, stored);
  assert.strictEqual(r.drift.knowledge.comparable, true,
    "the visit recorded its tokens, so knowledge drift is separable");
  assert.ok(r.drift.knowledge.left.some((x) => /No Longer Exists/.test(x.n)),
    "the departed condition must be named: " + JSON.stringify(r.drift.knowledge));
  assert.strictEqual(r.faithful, false);
});

test("a lost alert is the first and loudest thing said", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["dryness"] });
  stored.data.alerts = [{ m: "Sudden vision loss — URGENT referral required", l: "urgent" }];

  const lines = ctxCall(eng, "replayNarrate(replayVisit(__arg, null))", stored);
  const lost = lines.find((l) => /NO LONGER raise/.test(l.text));
  assert.ok(lost, "the lost alert must be reported: " + JSON.stringify(lines));
  assert.strictEqual(lost.level, "urgent");
});


/* ═══ 4. HONESTY ABOUT WHAT IT CANNOT DO ═══ */

test("a different KB version is labelled drift, never history", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain"] });
  stored.data.engine_provenance.kb_version = "0.9.0-ancient";

  const r = replay(eng, stored);
  assert.strictEqual(r.same_kb, false);
  assert.strictEqual(r.faithful, false,
    "faithful may never be true when the knowledge base is not the one that produced the record");

  const text = ctxCall(eng, "replayNarrate(replayVisit(__arg, null))", stored)
    .map((l) => l.text).join(" | ");
  assert.match(text, /it is not what the clinician saw/,
    "the reader must be told this is today's reading, not the record: " + text);
});

test("a visit too old to replay says so instead of guessing", () => {
  const eng = createEngine();
  const r = replay(eng, { id: "old", date: "2024-01-01", status: "completed", data: { symptoms: [] } });
  assert.strictEqual(r.available, false);
  assert.match(r.reason, /predates token recording/);
});

test("an unchanged KB with a changed result is flagged as an inconsistency", () => {
  const eng = createEngine();
  const stored = recordVisit(eng, { symptoms: ["pain", "redness"] });
  stored.data.engine_tokens = stored.data.engine_tokens.concat(["fabricated_token"]);
  const text = ctxCall(eng, "replayNarrate(replayVisit(__arg, null))", stored)
    .map((l) => l.text).join(" | ");
  assert.match(text, /version is unchanged/,
    "same KB + different answer is a record-integrity finding and must read as one: " + text);
});


/* ═══ 5. THE PRACTICE-WIDE SWEEP ═══ */

test("replayRecent counts drifted visits and is bounded", () => {
  const eng = createEngine();
  const good = recordVisit(eng, { symptoms: ["dryness", "grittiness"] });
  const drifted = recordVisit(eng, { symptoms: ["pain", "photophobia"] });
  drifted.data.engine_provenance.shown_top = [
    { name: "Gone From The KB", prob: 0.9, icd: "", icd_status: "", urgent: false }
  ];
  const tooOld = { id: "old", patient_id: "pat-1", status: "completed", date: "2024-01-01", data: {} };

  eng.context.__visits = JSON.parse(JSON.stringify([good, drifted, tooOld]));
  vm.runInContext("var loadVisits = function () { return __visits; };" +
                  "var loadPatients = function () { return []; };", eng.context);

  const out = vm.runInContext("replayRecent()", eng.context);
  assert.strictEqual(out.available, true);
  assert.strictEqual(out.examined, 3);
  assert.strictEqual(out.not_replayable, 1, "the pre-token visit is counted, not silently dropped");
  assert.strictEqual(out.drifted, 1);
  assert.strictEqual(out.rows.length, 2);

  const capped = vm.runInContext("replayRecent({ limit: 1 })", eng.context);
  assert.strictEqual(capped.examined, 1);
  assert.strictEqual(capped.capped, true);
});

test("replayRecent reports honestly when there is nothing to read", () => {
  const eng = createEngine();
  const out = vm.runInContext("replayRecent()", eng.context);
  assert.strictEqual(out.available, false);
  assert.match(out.reason, /unavailable/i);
});


/* ═══ 6. WIRING ═══ */

test("loaded after the engine it replays, in both load paths", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/engine-replay.js") > order.indexOf("js/engine.js"));
  assert.ok(order.indexOf("js/ui-replay.js") > order.indexOf("js/engine-replay.js"));

  const nodeOrder = require("../tools/lib/kb-load-order").engineOrder();
  assert.ok(nodeOrder.indexOf("js/engine-replay.js") > nodeOrder.indexOf("js/engine.js"));
});

test("there is no second scoring implementation hiding in the replay module", () => {
  /* A replay that disagreed with the engine would be worse than none, because
     a clinician would believe it. The only way to guarantee agreement is to
     have exactly one scorer. */
  const src = read("js/engine-replay.js");
  assert.ok(src.indexOf("runDiagnosticEngine()") > 0, "it must run the real engine");
  assert.ok(!/SCORE_WEIGHTS|function\s+scoreCondition|reqMatched/.test(src),
    "replay must not re-implement scoring");
});

test("the drift screen never presents a drifted visit as a clinical finding", () => {
  const src = read("js/ui-replay.js");
  assert.match(src, /prompt to look, not a finding/,
    "the framing is load-bearing: this screen lists patients and must not read as a recall list");
  assert.match(src, /Nothing is changed and no record is rewritten/);
});
