/* ═══════════════════════════════════════════════════════════════ */
/* NEW CONDITIONS (2026-07-12 expansion) reach the differential     */
/* Each newly-added condition must be scorable from a plausible      */
/* presentation — an entry the engine can never surface is dead      */
/* weight. These drive the REAL engine end to end.                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const has = (out, name) => out.dxList.some((d) => d.n === name);
const urgent = (out) => out.alerts.some((a) => a.l === "urgent");

test("Orbital Cellulitis surfaces and is urgent", () => {
  const out = eng.runCase({
    symptoms: ["lid_swelling_diffuse", "pain_eye_movement", "proptosis", "restricted_motility", "fever"]
  });
  assert.ok(has(out, "Orbital Cellulitis"), "orbital cellulitis in differential");
  const oc = out.dxList.find((d) => d.n === "Orbital Cellulitis");
  assert.ok(oc.urgent, "flagged urgent");
});

test("Preseptal vs Orbital: orbital signs push preseptal down, orbital never suppressed", () => {
  /* preseptal-only picture → preseptal scores */
  const pre = eng.runCase({ symptoms: ["lid_swelling_diffuse", "redness", "tenderness", "fever"] });
  assert.ok(has(pre, "Preseptal Cellulitis"), "preseptal surfaces on its own picture");
  /* add orbital signs → orbital present and ranked above preseptal */
  const orb = eng.runCase({
    symptoms: ["lid_swelling_diffuse", "pain_eye_movement", "proptosis", "restricted_motility", "fever"]
  });
  assert.ok(has(orb, "Orbital Cellulitis"));
  const io = orb.dxList.findIndex((d) => d.n === "Orbital Cellulitis");
  const ip = orb.dxList.findIndex((d) => d.n === "Preseptal Cellulitis");
  if (ip >= 0) assert.ok(io < ip, "orbital ranks above preseptal when orbital signs present");
});

test("Endophthalmitis surfaces post-op with pain + vision loss + hypopyon", () => {
  const out = eng.runCase({
    symptoms: ["pain_severe", "reduced_vision", "hypopyon_visible", "redness"],
    hxO: { flags: ["surgery"] }
  });
  assert.ok(has(out, "Endophthalmitis"), "endophthalmitis in differential");
});

test("Scleritis (deep boring pain, worse at night) surfaces and outranks episcleritis", () => {
  const out = eng.runCase({
    symptoms: ["deep_boring_pain", "pain_worse_night", "redness", "sectoral_redness", "tenderness"],
    hxM: { autoimmune: true }
  });
  assert.ok(has(out, "Scleritis"), "scleritis in differential");
  const is = out.dxList.findIndex((d) => d.n === "Scleritis");
  const ie = out.dxList.findIndex((d) => d.n === "Episcleritis");
  if (ie >= 0) assert.ok(is < ie, "scleritis outranks episcleritis on a scleritis picture");
});

test("Episcleritis surfaces on a mild sectoral-redness picture", () => {
  const out = eng.runCase({ symptoms: ["sectoral_redness", "redness", "watering"] });
  assert.ok(has(out, "Episcleritis"), "episcleritis in differential");
});

test("Thyroid Eye Disease surfaces with proptosis + thyroid history", () => {
  const out = eng.runCase({
    symptoms: ["proptosis", "lid_retraction", "diplopia", "grittiness"],
    hxM: { thyroid: true }
  });
  assert.ok(has(out, "Thyroid Eye Disease"), "TED in differential");
});

test("Horner Syndrome surfaces with ptosis + anisocoria and is not confused by diplopia", () => {
  const out = eng.runCase({ symptoms: ["ptosis", "anisocoria", "headache"] });
  assert.ok(has(out, "Horner Syndrome"), "Horner in differential");
  /* CN III palsy (ptosis + diplopia) should NOT be beaten by Horner when
     diplopia is present (Horner con:diplopia) */
  const withDiplopia = eng.runCase({ symptoms: ["ptosis", "diplopia", "anisocoria"] });
  const h = withDiplopia.dxList.find((d) => d.n === "Horner Syndrome");
  if (h) {
    const hornerOnly = out.dxList.find((d) => d.n === "Horner Syndrome");
    assert.ok(h.prob <= hornerOnly.prob, "diplopia lowers Horner's score (contradiction)");
  }
});

test("Migraine with Visual Aura surfaces on scintillating scotoma + headache", () => {
  const out = eng.runCase({ symptoms: ["scintillating_scotoma", "headache", "transient_vision_loss"] });
  assert.ok(has(out, "Migraine with Visual Aura"), "migraine aura in differential");
});

test("red flags still fire unchanged after the KB expansion", () => {
  assert.ok(urgent(eng.runCase({ symptoms: ["flashes", "floaters"] })), "flashes+floaters");
  assert.ok(urgent(eng.runCase({ iop: { od: "48", os: "16" } })), "IOP>40");
  assert.ok(urgent(eng.runCase({ pupil: { rapd: "OD" } })), "RAPD");
});
