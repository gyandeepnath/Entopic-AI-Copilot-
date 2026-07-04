/* ═══════════════════════════════════════════════════════════════ */
/* GOLDEN CLINICAL VIGNETTES                                       */
/* Runs the REAL diagnostic engine (loaded from js/engine.js — not  */
/* a reimplementation) against labeled clinical presentations and   */
/* asserts:                                                          */
/*   1. Safety alerts (red flags) ALWAYS fire — un-suppressible.     */
/*   2. Expected conditions appear in the differential.              */
/*   3. Zero evidence produces zero output (no guessing).            */
/*                                                                   */
/* Every KB or engine change must keep this suite green.             */
/* Expectations were verified against engine behavior AND clinical   */
/* plausibility at authoring time; if a change legitimately shifts   */
/* behavior, update the vignette WITH a CHANGELOG entry saying why.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();

/* ── helpers ── */
function dxNames(out) {
  return out.dxList.map((d) => d.n);
}
function hasDx(out, name) {
  return dxNames(out).some((n) => n.indexOf(name) >= 0);
}
function urgentAlerts(out) {
  return out.alerts.filter((a) => a.l === "urgent");
}
function alertMatching(out, re) {
  return out.alerts.filter((a) => re.test(a.m));
}

/* ═══ Invariant: zero evidence = zero output ═══ */

test("empty visit produces no diagnoses, no alerts, no nudges", () => {
  const out = eng.runCase({});
  /* length checks, not deepStrictEqual: sandbox arrays are cross-realm */
  assert.strictEqual(out.dxList.length, 0);
  assert.strictEqual(out.alerts.length, 0);
  assert.strictEqual(out.nudges.length, 0);
});

/* ═══ Red-flag vignettes: safety alerts must ALWAYS fire ═══ */

test("flashes + floaters → urgent retinal alert + tear/RD/PVD surfaced", () => {
  const out = eng.runCase({
    symptoms: ["flashes", "floaters"],
    temporal: { onset: "sudden_onset" }
  });
  assert.ok(alertMatching(out, /flashes \+ floaters/i).length > 0, "retinal red-flag alert must fire");
  assert.ok(urgentAlerts(out).length > 0);
  assert.ok(hasDx(out, "Retinal Tear"), "Retinal Tear in differential");
  assert.ok(hasDx(out, "Posterior Vitreous Detachment"), "PVD in differential");
  assert.ok(hasDx(out, "Retinal Detachment"), "RD surfaced by gate even at low score");
});

test("IOP > 40 → critical IOP alert fires", () => {
  const out = eng.runCase({ iop: { od: "48", os: "16" } });
  assert.ok(alertMatching(out, /critically elevated/i).length > 0);
  assert.strictEqual(alertMatching(out, /critically elevated/i)[0].l, "urgent");
});

test("acute angle closure presentation → AACC tops differential + urgent IOP alert", () => {
  const out = eng.runCase({
    symptoms: ["pain_severe", "halos", "nausea_vomiting", "reduced_vision"],
    iop: { od: "48", os: "16" }
  });
  assert.ok(out.dxList.length > 0);
  assert.ok(out.dxList[0].n.indexOf("Acute Angle Closure") >= 0, "AACC should rank first");
  assert.ok(out.dxList[0].prob > 0.8, "AACC confidence should be high");
  assert.ok(out.dxList[0].urgent, "AACC flagged urgent");
  assert.ok(alertMatching(out, /critically elevated/i).length > 0);
});

test("RAPD → urgent neuro alert fires even with no other findings", () => {
  const out = eng.runCase({ pupil: { rapd: "OD" } });
  assert.ok(alertMatching(out, /RAPD detected/i).length > 0);
  assert.strictEqual(alertMatching(out, /RAPD/i)[0].l, "urgent");
});

test("sudden vision loss → urgent alert + vascular emergencies gated in", () => {
  const out = eng.runCase({ symptoms: ["sudden_vision_loss"] });
  assert.ok(alertMatching(out, /sudden vision loss/i).length > 0);
  assert.ok(hasDx(out, "Central Retinal Artery Occlusion"), "CRAO gated into differential");
  assert.ok(hasDx(out, "Ischemic Optic Neuropathy"), "AION gated into differential");
});

test("hypopyon finding → urgent alert fires", () => {
  const out = eng.runCase({ sl: { findings: ["Hypopyon"] } });
  assert.ok(alertMatching(out, /hypopyon/i).length > 0);
  assert.strictEqual(alertMatching(out, /hypopyon/i)[0].l, "urgent");
});

test("bilateral disc swelling → papilledema urgent alert + gate", () => {
  const out = eng.runCase({ fun: { findings: ["Disc edema — bilateral"] } });
  assert.ok(alertMatching(out, /bilateral disc edema/i).length > 0, "raised-ICP alert must fire");
  assert.ok(hasDx(out, "Papilledema"), "Papilledema surfaced");
});

/* ═══ Un-suppressibility: red flags fire regardless of other data ═══ */

test("red-flag alerts are not suppressed by abundant unrelated evidence", () => {
  /* A chronic dry-eye picture PLUS critical IOP: the IOP alert must
     still fire even though the differential is dominated by surface
     disease. Safety is independent of scoring. */
  const out = eng.runCase({
    symptoms: ["dryness", "burning", "worse_evening", "grittiness", "foreign_body_sensation"],
    sl: { od: { but: "4" }, os: { but: "5" } },
    temporal: { duration: "months" },
    iop: { od: "44", os: "18" },
    pupil: { rapd: "OS" }
  });
  assert.ok(alertMatching(out, /critically elevated/i).length > 0, "IOP>40 alert fires");
  assert.ok(alertMatching(out, /RAPD detected/i).length > 0, "RAPD alert fires");
});

/* ═══ Diagnostic vignettes: expected problems surface ═══ */

test("chronic dry eye presentation → dry eye disease in differential, no urgent alerts", () => {
  const out = eng.runCase({
    symptoms: ["dryness", "burning", "worse_evening", "grittiness"],
    sl: { od: { but: "4" }, os: { but: "5" } },
    temporal: { duration: "months" }
  });
  assert.ok(hasDx(out, "Dry Eye Disease"), "DED in differential");
  assert.strictEqual(urgentAlerts(out).length, 0, "no urgent alerts for benign surface disease");
  assert.ok(out.routes.indexOf("surface") >= 0, "surface route active");
});

test("POAG presentation → POAG tops differential with elevated-IOP warning", () => {
  const out = eng.runCase(
    {
      iop: { od: "26", os: "27" },
      fun: { od: { cd_v: "0.7" }, os: { cd_v: "0.5" } },
      inv: { vf_md_od: "-4.5" },
      hxF: { glaucoma: true },
      temporal: { duration: "years", course: "worsening" }
    },
    { age: "62" }
  );
  assert.ok(out.dxList.length > 0);
  assert.ok(out.dxList[0].n.indexOf("Primary Open Angle Glaucoma") >= 0, "POAG ranks first");
  assert.ok(alertMatching(out, /IOP elevated/i).length > 0, "IOP warning fires");
});

test("convergence insufficiency presentation → CI in differential", () => {
  const out = eng.runCase(
    {
      symptoms: ["near_strain", "asthenopia"],
      bv: { npc_b: "12", ct_n: "10 exo" }
    },
    { age: "24" }
  );
  assert.ok(hasDx(out, "Convergence Insufficiency"), "CI in differential");
  assert.ok(out.tokens.indexOf("NPC_receded") >= 0, "NPC auto-derivation works");
  assert.ok(out.tokens.indexOf("exo_near") >= 0, "cover-test parsing works");
});

/* ═══ Auto-derivation spot checks (measurement → token) ═══ */

test("measurement auto-derivation produces the expected tokens", () => {
  const out = eng.runCase(
    {
      iop: { od: "33", os: "18", od_cct: "505", os_cct: "540" },
      fun: { od: { cd_v: "0.8" }, os: { cd_v: "0.4" } }
    },
    { age: "70" }
  );
  const t = out.tokens;
  assert.ok(t.indexOf("high_iop") >= 0, "IOP>21 → high_iop");
  assert.ok(t.indexOf("IOP_very_high") >= 0, "IOP>30 → IOP_very_high");
  assert.ok(t.indexOf("thin_cornea") >= 0, "CCT<520 → thin_cornea");
  assert.ok(t.indexOf("increased_cd") >= 0, "C/D≥0.6 → increased_cd");
  assert.ok(t.indexOf("cd_asymmetry") >= 0, "C/D diff>0.2 → cd_asymmetry");
  assert.ok(t.indexOf("older_age") >= 0, "age≥60 → older_age");
});

/* ═══ Route reachability: hallmark evidence must reach scoring ═══ */

test("leukocoria finding → urgent alert + congenital cataract scored", () => {
  const out = eng.runCase(
    { sl: { findings: ["Leukocoria (white pupillary reflex)"] } },
    { age: "2" }
  );
  assert.ok(alertMatching(out, /leukocoria/i).length > 0, "leukocoria red-flag alert fires");
  assert.strictEqual(alertMatching(out, /leukocoria/i)[0].l, "urgent");
  assert.ok(hasDx(out, "Congenital Cataract"), "lens route activates on leukocoria");
});

test("hypopyon finding → hypopyon uveitis tops the differential", () => {
  const out = eng.runCase({ sl: { findings: ["Hypopyon"] } });
  assert.ok(hasDx(out, "Hypopyon Uveitis"),
    "urgent route activates on hypopyon_visible (was: alert with empty differential)");
});

test("rubeosis + elevated IOP → neovascular glaucoma scored", () => {
  const out = eng.runCase({ sl: { findings: ["Rubeosis iridis"] }, iop: { od: "38", os: "16" } });
  assert.ok(hasDx(out, "Neovascular Glaucoma"), "urgent route activates on rubeosis_iridis");
  assert.ok(alertMatching(out, /rubeosis/i).length > 0, "rubeosis alert fires");
});

test("acute metamorphopsia in a 72-year-old → wet AMD scored", () => {
  const out = eng.runCase(
    { symptoms: ["distortion", "central_blur"], temporal: { onset: "acute" } },
    { age: "72" }
  );
  assert.ok(hasDx(out, "Age-related Macular Degeneration (Wet)"),
    "urgent route activates on distortion (wet AMD was unreachable by routing)");
  assert.ok(alertMatching(out, /metamorphopsia/i).length > 0, "OCT-macula alert fires");
});

test("RAPD + pain on eye movement → optic neuritis scored via neuro route", () => {
  const out = eng.runCase({
    pupil: { rapd: "OD" },
    cc: "pain when moving the eye, colors look faded"
  });
  assert.ok(hasDx(out, "Optic Neuritis"), "neuro route activates on RAPD_positive");
});

/* ═══ Medication bridge (engine source 10) ═══ */

test("systemic steroid use → steroid_history token → steroid cataract reachable", () => {
  const out = eng.runCase(
    {
      hxM: { medications: "prednisolone 10mg daily" },
      symptoms: ["glare", "near_blur"],
      sl: { od: { psc: "2" }, os: { psc: "1" } },
      temporal: { duration: "months" }
    },
    { age: "48" }
  );
  assert.ok(out.tokens.indexOf("steroid_history") >= 0,
    "medication checker feeds steroid_history into the engine");
  assert.ok(hasDx(out, "Drug-induced Cataract"),
    "steroid-induced cataract appears in the differential");
});

test("engine still runs when medication module data is absent", () => {
  const out = eng.runCase({ symptoms: ["glare"] });
  assert.ok(out.dxList.length >= 0, "no crash without medications");
});

/* ═══ Output contract: dxList shape the UI depends on ═══ */

test("dxList entries carry the fields the advisory panel renders", () => {
  const out = eng.runCase({ symptoms: ["dryness", "burning"] });
  assert.ok(out.dxList.length > 0);
  for (const d of out.dxList) {
    assert.strictEqual(typeof d.n, "string");
    assert.ok(d.prob >= 0 && d.prob <= 1, "prob within [0,1]");
    assert.ok(d.evidence && Array.isArray(d.evidence.matched), "evidence trail present");
    assert.strictEqual(typeof d.reasoning, "string");
  }
  assert.ok(out.dxList.length <= 8, "differential capped at 8");
});
