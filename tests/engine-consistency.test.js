/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE CONSISTENCY  (second engine audit, 2026-10-27)            */
/*                                                                  */
/* The founder's report: "some logics are clashing, resulting in    */
/* suppression and misfiring of improper diagnoses". Each test here */
/* pins one mechanism the audit measured and fixed, and each FAILS  */
/* on the engine as it stood before the audit (commit abd21c1) —    */
/* checked by running this file against that copy.                  */
/*                                                                  */
/* No clinical claim is made by the self-consistency checks: the     */
/* ground truth is the knowledge base's own required/supportive      */
/* lists. The named vignettes assert only what the engine should     */
/* NOT do (list a condition with nothing in support of it), never    */
/* what the right diagnosis is.                                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const eng = createEngine();
const K = loadKnowledgeBase();
const ALL = Array.isArray(K) ? K : (K.KNOWLEDGE_ALL || []);
const byName = (n) => ALL.find((c) => c.name === n);

const run = (symptoms, age, extra) =>
  eng.runCase(Object.assign({ symptoms: symptoms }, extra || {}), { age: String(age || 60) });
/* No age at all. An own presentation carries the condition's age tokens, and a
   typed age on top contradicts half of them (a 60-year-old with Congenital
   Ptosis's findings is rightly not led by Congenital Ptosis). */
const runBare = (symptoms) => eng.runCase({ symptoms: symptoms });
const names = (r) => Array.from(r.dxList, (d) => d.n);
/* A condition's own textbook presentation: everything it lists. */
const own = (c) => c.req.concat(c.sup || [], (c.temporal || []).slice(0, 1), c.tests || []);


/* ── 1. A finding is evidence once ── */

test("a finding listed in two evidence classes counts once, in the strongest", () => {
  /* 99 conditions list a token twice (Epiphora: "watering" is required AND
     supportive). It used to earn both credits, so those conditions beat
     neighbours on a finding they shared equally. */
  const base = { con: [], temporal: [], tests: [] };
  eng.context.__a = Object.assign({ name: "A", req: ["watering"], sup: ["watering", "syringing_block"] }, base);
  eng.context.__b = Object.assign({ name: "B", req: ["watering"], sup: ["syringing_block"] }, base);
  const twice = vm.runInContext("scoreCondition(__a, ['watering']).score", eng.context);
  const once = vm.runInContext("scoreCondition(__b, ['watering']).score", eng.context);
  assert.strictEqual(twice, once, "a repeated listing must not add evidence");
});


/* ── 2. A finding most conditions list establishes none of them ── */

test("reduced vision alone puts nothing in the differential", () => {
  /* 212 of 394 conditions list it. It was the only required finding of Optic
     Atrophy, Cortical Visual Impairment and Optic Neuritis, so on its own it
     listed all three. */
  const r = run(["reduced_vision"]);
  assert.strictEqual(r.dxList.length, 0, "got: " + names(r).join(", "));
});

test("gradual blur and glare at 70 lists cataracts, not optic atrophy or CVI", () => {
  const r = run(["gradual_blur", "glare", "reduced_vision"], 70);
  const n = names(r);
  assert.match(n[0], /Cataract/, "lead should be a cataract — got " + n[0]);
  for (const wrong of ["Optic Atrophy", "Cortical Visual Impairment"]) {
    assert.ok(!n.includes(wrong), wrong + " listed with no finding of its own: " + n.join(", "));
  }
});


/* ── 3. A diagnosis should account for what was found ── */

test("a chemical splash leads with Chemical Eye Burn, well clear of conditions that explain less", () => {
  const r = run(["chemical_splash", "pain_severe", "redness", "watering", "photophobia", "reduced_vision"], 30);
  assert.strictEqual(r.dxList[0].n, "Chemical Eye Burn");
  /* Before: four alternatives within 3-5 points, none of which explains the splash. */
  const gap = r.dxList[0].prob - r.dxList[1].prob;
  assert.ok(gap >= 0.1, "lead should be clear of the next by >= 10 points; gap " + gap.toFixed(3));
});

test("one measurement is one finding: IOP 52 is not counted as two", () => {
  /* IOP 52 emits high_iop AND very_high_iop. Counted as tokens, Acute Angle
     Closure "failed to explain" high_iop on its own textbook presentation. */
  const r = run(["pain_severe", "halos", "nausea", "vomiting", "headache", "reduced_vision"], 65,
                { iop: { od: "52", os: "16" } });
  const aacc = r.dxList.find((d) => d.n === "Acute Angle Closure Crisis");
  assert.ok(aacc, "AACC must be listed");
  assert.strictEqual(r.dxList[0].n, "Acute Angle Closure Crisis");
  const ex = aacc.evidence && aacc.evidence.explains;
  assert.ok(ex && ex.n === ex.of, "AACC should account for every finding: " + JSON.stringify(ex));
});


/* ── 4. Banners only for an urgent condition actually indicated ── */

test("a half-matched urgent condition raises no banner without its hallmark", () => {
  /* Floaters + reduced vision in a non-diabetic raised a Proliferative Diabetic
     Retinopathy banner; three common symptoms raised seven keratitis banners. */
  const pdr = run(["floaters", "reduced_vision"]);
  assert.ok(!(pdr.alerts || []).some((a) => /Proliferative Diabetic/.test(a.m)),
    "PDR banner without diabetes: " + (pdr.alerts || []).map((a) => a.m).join(" | "));
  const ker = run(["pain_severe", "redness", "photophobia"]);
  assert.ok(!(ker.alerts || []).some((a) => /Acanthamoeba/.test(a.m)),
    "Acanthamoeba banner without contact lens use");
  assert.ok((ker.alerts || []).length <= 3, "banner flood: " + (ker.alerts || []).length);
});

test("a distinctive hallmark still raises its banner when the rest is missing", () => {
  /* The other side: a high-speed particle injury is distinctive enough that
     the Intraocular Foreign Body banner must fire before pain is recorded. */
  const r = run(["recent_eye_trauma", "high_speed_particle"]);
  assert.ok((r.alerts || []).some((a) => /Intraocular Foreign Body/.test(a.m)));
});


/* ── 5. Ordering: evidence before label ── */

test("the urgent tie-break cannot outrank a better-matched condition", () => {
  /* An urgent bonus of 0.08 put Retinal Detachment and Wet AMD ahead of a
     fully-presented Hemiretinal Vein Occlusion. */
  const c = byName("Hemiretinal Vein Occlusion");
  assert.strictEqual(runBare(own(c)).dxList[0].n, c.name);
});

test("an equal score is broken by evidence, not by list position", () => {
  /* On its own presentation Anisometropic Amblyopia ties Amblyopia
     (Refractive) at 0.828; the earlier KB entry won on list position alone.
     (The panel still marks the pair as tied — this only decides the order.) */
  const c = byName("Anisometropic Amblyopia");
  const r = runBare(own(c));
  assert.strictEqual(r.dxList[0].n, c.name);
  assert.ok(Math.abs(r.dxList[0].prob - r.dxList[1].prob) < 0.005, "precondition: it is a tie");
});


/* ── 6. Nothing below the floor is promoted ── */

test("one non-specific symptom does not lead with a condition under the display floor", () => {
  /* "headache" alone led with "Terson Syndrome 7%" — a fallback promoted the
     best sub-floor result, which the flow map labelled NOT in the differential. */
  const r = run(["headache"]);
  const floor = vm.runInContext("DX_FLOOR", eng.context);
  for (const d of r.dxList) {
    assert.ok(d.prob >= floor || d.gatedBecause, d.n + " shown at " + d.prob.toFixed(3));
  }
  assert.ok(!names(r).includes("Terson Syndrome"));
});

test("a condition listed only by a safety rule is marked, not shown as 0%", () => {
  const r = run(["flashes", "floaters"]);
  const rd = r.dxList.find((d) => d.n === "Retinal Detachment");
  assert.ok(rd && rd.gatedBecause, "the safety gate must still list Retinal Detachment");
  const floor = vm.runInContext("DX_FLOOR", eng.context);
  for (const d of r.dxList) {
    assert.strictEqual(!!d.safetyOnly, !!d.gatedBecause && d.prob < floor, d.n);
  }
});


/* ── 7. The whole knowledge base, as a ratchet ── */

test("each condition's own presentation ranks it first (self-consistency)", () => {
  /* Before the audit: 367 of 394. After: 391; the three exceptions are pairs
     the KB defines near-identically (Punctal Stenosis / Epiphora, Aniridia /
     Ocular Albinism, Anterior Polar / Nuclear Sclerotic Cataract) — a
     knowledge-base question for the founder, not an engine one. The bar is
     99% so a KB edit can move a pair without failing CI, while any engine
     regression of the kind fixed here (dozens of conditions) still does. */
  let first = 0;
  const miss = [];
  for (const c of ALL) {
    const r = runBare(own(c));
    if (r.dxList.length && r.dxList[0].n === c.name) first++;
    else miss.push(c.name + " → " + (r.dxList[0] ? r.dxList[0].n : "nothing"));
  }
  assert.ok(first / ALL.length >= 0.99,
    first + " of " + ALL.length + " ranked first; not first:\n  " + miss.join("\n  "));
});


/* ── 8. Two problems at once ── */

const pick = (n, withTests) => {
  const c = byName(n);
  return c.req.concat(c.sup || [], withTests ? (c.tests || []) : []);
};

test("two separate problems are both listed; neither one's findings count against the other", () => {
  /* Allergic conjunctivitis and acute anterior uveitis, both fully presented.
     Before: uveitis 44% in 6th, allergic conjunctivitis off the list, and
     Traumatic Iritis — no trauma recorded — leading. */
  const r = run(pick("Allergic Conjunctivitis").concat(pick("Anterior Uveitis (Acute)", true)), 58);
  const n = names(r);
  assert.strictEqual(n[0], "Anterior Uveitis (Acute)", "got: " + n.join(", "));
  assert.ok(n.indexOf("Allergic Conjunctivitis") >= 0 && n.indexOf("Allergic Conjunctivitis") <= 2,
    "allergic conjunctivitis should be near the top: " + n.join(", "));
  const au = r.dxList[0].evidence;
  assert.deepStrictEqual(Array.from(au.contradicted), []);
  assert.match(au.setAside.join(" "), /itching_dominant \(explained by Allergic Conjunctivitis\)/,
    "the set-aside finding must be named, with what explains it");
});

test("one picture is not split into two: itching still counts against uveitis", () => {
  /* "Itchy, red, painful, light-sensitive eye" — the allergic side explains
     only the itch itself, so there is no second picture to blame it on. */
  /* With "watering" too, the allergic side has ONE finding of its own beyond
     the itch — still not a second picture at second_problem_min_findings 2
     (this case is what fails if that is loosened to 1). */
  for (const symptoms of [["itching_dominant", "redness", "pain", "photophobia"],
                          ["itching_dominant", "watering", "redness", "pain", "photophobia"]]) {
    run(symptoms, 35);
    /* Read the full scored set, so this asserts whether or not it made the list. */
    const ev = vm.runInContext("(ENGINE_STATE.results.filter(function(x){return x.name==='Anterior Uveitis (Acute)'})[0]||{})._evidence", eng.context);
    assert.ok(ev, "uveitis must at least be scored (both its required findings are present)");
    assert.ok(Array.from(ev.contradicted).includes("itching_dominant"), "itching must still count against it: " + symptoms);
    assert.strictEqual(ev.setAside.length, 0);
  }
});

test("who the patient is, when it began, which eye, or a normal result is never blamed on a second problem", () => {
  const attributable = (t) => vm.runInContext("isAttributableToken(" + JSON.stringify(t) + ")", eng.context);
  for (const t of ["older_age", "young_age", "trauma_history", "gradual_onset", "sudden_onset", "normal_iop", "bilateral"]) {
    assert.strictEqual(attributable(t), false, t);
  }
  for (const t of ["itching_dominant", "photophobia", "redness", "reduced_vision"]) {
    assert.strictEqual(attributable(t), true, t);
  }
});

test("two-problem ratchet: a fully presented condition survives a second problem that argues against it", () => {
  /* Measured over 621 two-problem presentations (one condition's findings in
     the other's contradiction list, different domains): shown 157 before,
     595 after. A smaller deterministic sample keeps the suite fast. */
  const dom = (c) => c._domain || c.domain || c.route;
  const own2 = (c) => c.req.concat(c.sup || [], c.tests || []);
  const ctx = (t) => vm.runInContext("isContextOnlyToken(" + JSON.stringify(t) + ")", eng.context);
  const pairs = [];
  for (const a of ALL) for (const b of ALL) {
    if (a === b || dom(a) === dom(b)) continue;
    const ob = own2(b);
    if (!(a.con || []).some((t) => ob.includes(t) && !ctx(t) && !/onset|normal_|bilateral/.test(t) && t !== "reduced_vision")) continue;
    if (own2(a).some((t) => (b.con || []).includes(t))) continue;
    pairs.push([a, b]);
  }
  pairs.sort((x, y) => (x[0].name + x[1].name).localeCompare(y[0].name + y[1].name));
  const step = Math.max(1, Math.floor(pairs.length / 150));
  let shown = 0, total = 0;
  for (let i = 0; i < pairs.length; i += step) {
    const [a, b] = pairs[i];
    total++;
    if (names(runBare(own2(a).concat(own2(b)))).includes(a.name)) shown++;
  }
  assert.ok(shown / total >= 0.9, shown + " of " + total + " shown");
});


/* ── 9. Safety-gated conditions are never cut ── */

test("a safety-gated condition stays on the list however many others outscore it", () => {
  /* The cut to 8 entries dropped Retinal Detachment from 380 of 394
     presentations with flashes and floaters added. */
  let cut = 0;
  for (const c of ALL) {
    const r = runBare(own(c).concat(["flashes", "floaters"]));
    const gated = vm.runInContext("ENGINE_STATE.results.filter(function(x){return x._gateReason}).map(function(x){return x.name})", eng.context);
    const shown = names(r);
    if (Array.from(gated).some((g) => !shown.includes(g))) cut++;
    assert.ok(r.dxList.length <= 8, "the list stays at most 8 long");
  }
  assert.strictEqual(cut, 0, cut + " presentations lost a safety-gated condition");
});
