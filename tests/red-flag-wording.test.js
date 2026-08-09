/* ═══════════════════════════════════════════════════════════════ */
/* HAND-WRITTEN RED-FLAG ALERTS FIRE, SPECIFICALLY  (Phase 8, §24)  */
/*                                                                  */
/* FOUND BY MUTATION TESTING.                                        */
/* tools/mutation-test.js disabled the hypopyon alert rule           */
/*                                                                  */
/*   if (tokens.indexOf("hypopyon_visible") >= 0) {                  */
/*       alerts.push({ m: "Hypopyon present — URGENT referral" ... })*/
/*                                                                  */
/* and the whole suite still passed. The reason is subtle and worth  */
/* stating: the differential ALSO surfaces "Hypopyon Uveitis" as an  */
/* urgent condition, which computeDerivedAlerts turns into a generic */
/* "Hypopyon Uveitis — urgent condition in the differential" banner. */
/* The existing golden test matched /hypopyon/i, so a DIFFERENT,     */
/* generic, derived alert satisfied it while the specific,           */
/* hand-authored, better-worded one had been deleted.               */
/*                                                                  */
/* The safety net held — an urgent alert still fired — so this is a  */
/* WORDING/SPECIFICITY hole, not a missed red flag. But the specific */
/* wording is the point: "Hypopyon present — URGENT referral" tells  */
/* a clinician what was seen and what to do; "Hypopyon Uveitis,      */
/* match 76" is a probabilistic differential line wearing an alert's */
/* colour. The hand-written rules are the deterministic, un-gated    */
/* safety layer, and they must be pinned individually.              */
/*                                                                  */
/* THE DISCRIMINATOR: a hand-written alert is NOT `derived`. Every   */
/* assertion below requires a NON-DERIVED urgent alert with the      */
/* exact wording — which a derived fallback can never satisfy.       */
/*                                                                  */
/* Nothing here invents clinical content: every expected string is   */
/* copied verbatim from js/engine.js computeAlerts(), and every      */
/* trigger is an input the engine already maps to that token. This   */
/* holds the safety layer to what it already promises.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

/* The urgent alerts a clinician actually reads: hand-written, deterministic,
   NOT probabilistic differential lines dressed up as alerts. */
function specificUrgent(out) {
  return Array.from(out.alerts)
    .filter((a) => a.l === "urgent" && !a.derived)
    .map((a) => a.m);
}

/* Every hand-written URGENT rule in computeAlerts(), its trigger, and the
   exact wording it must produce. Copied from js/engine.js — if the wording is
   deliberately changed there, this list changes with it; that is the point. */
const RED_FLAGS = [
  ["sudden vision loss",
    { symptoms: ["sudden_vision_loss"] }, { age: "70" },
    "Sudden vision loss — URGENT referral required"],
  ["flashes + floaters",
    { symptoms: ["flashes", "floaters"] }, { age: "62" },
    "Flashes + floaters — rule out retinal tear / detachment"],
  ["curtain / shadow",
    { symptoms: ["curtain_vision"] }, { age: "65" },
    "Curtain / shadow in vision — possible retinal detachment"],
  ["IOP critically elevated",
    { iop: { od: "52" } }, { age: "60" },
    "IOP critically elevated (>40 mmHg) — acute angle closure?"],
  ["IOP significantly elevated",
    { iop: { od: "34" } }, { age: "60" },
    "IOP significantly elevated (>30 mmHg) — urgent assessment"],
  ["RAPD",
    { pupil: { rapd: "OD" } }, { age: "60" },
    "RAPD detected (OD) — neuro-ophthalmic assessment"],
  ["hypopyon",
    { sl: { findings: ["Hypopyon"] } }, { age: "40" },
    "Hypopyon present — URGENT referral"],
  ["rubeosis iridis",
    { sl: { findings: ["Rubeosis iridis"] } }, { age: "60" },
    "Rubeosis iridis — URGENT: neovascular glaucoma risk"],
  ["leukocoria",
    { fun: { findings: ["Leukocoria (white pupillary reflex)"] } }, { age: "3" },
    "Leukocoria — URGENT referral: rule out retinoblastoma / congenital cataract"],
  ["bilateral disc edema",
    { fun: { findings: ["Disc edema — bilateral"] } }, { age: "35" },
    "Bilateral disc edema — URGENT: rule out raised ICP"]
];

for (const [name, visit, patient, wording] of RED_FLAGS) {
  test("the specific hand-written alert fires for " + name, () => {
    const alerts = specificUrgent(eng.runCase(visit, patient));
    assert.ok(alerts.indexOf(wording) >= 0,
      "the specific alert is missing — a generic derived alert must not be allowed to " +
      "stand in for the deterministic safety rule.\n  expected: " + JSON.stringify(wording) +
      "\n  got non-derived urgent: " + JSON.stringify(alerts));
  });
}

/* The invariant behind all of the above, stated once: a hand-written red-flag
   alert must never be silently replaced by a derived one that merely happens
   to share a keyword. A derived alert always carries derived:true and always
   ends in "in the differential (match NN)"; a hand-written one never does. */
test("no hand-written red flag is impersonated by a derived alert", () => {
  const impostors = [];
  for (const [name, visit, patient, wording] of RED_FLAGS) {
    const out = eng.runCase(visit, patient);
    const specific = specificUrgent(out).indexOf(wording) >= 0;
    const derivedShare = Array.from(out.alerts).some(
      (a) => a.derived && a.l === "urgent" &&
             a.m.toLowerCase().indexOf(name.split(" ")[0].toLowerCase()) >= 0);
    if (!specific && derivedShare) impostors.push(name);
  }
  assert.deepStrictEqual(impostors, [],
    "these red flags were represented ONLY by a generic derived alert — the deterministic " +
    "safety wording was gone and a probabilistic line stood in for it:\n  " + impostors.join("\n  "));
});
