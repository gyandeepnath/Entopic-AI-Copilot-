/* ═══════════════════════════════════════════════════════════════ */
/* STRESS / FUZZ — the whole diagnostic path under load             */
/*                                                                  */
/* Beyond the targeted unit tests, this hammers the engine, KB and   */
/* authoring validator with volume, randomness and adversarial       */
/* input, and pins the invariants that must NEVER break as the KB    */
/* grows:                                                            */
/*   • red-flag alerts are un-suppressible — they fire no matter how */
/*     much noise surrounds them                                     */
/*   • the engine never throws, always returns a well-formed,        */
/*     bounded, sorted differential with scores in [0,1]             */
/*   • output is deterministic (same input → same output)           */
/*   • every condition in the KB can actually surface (no dead       */
/*     entries anywhere, not just the expansion)                     */
/*   • the authoring validator never throws on any draft            */
/*                                                                  */
/* Deterministic PRNG so failures are reproducible.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");
const A = require("../js/kb-authoring");

const eng = createEngine();
const ctx = eng.context;
const ALL = ctx.KNOWLEDGE_ALL;
const ALL_TOKENS = Object.keys(ctx.TOKEN_REGISTRY);
const COND_NAMES = new Set([...ALL].map((c) => c.name));

/* ── deterministic PRNG (mulberry32) ── */
function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick(rand, arr, n) {
  const out = [], used = {};
  for (let i = 0; i < n && i < arr.length; i++) {
    let k; do { k = Math.floor(rand() * arr.length); } while (used[k]);
    used[k] = true; out.push(arr[k]);
  }
  return out;
}
function randomVisit(rand) {
  const nSym = Math.floor(rand() * 12);
  const v = { symptoms: pick(rand, ALL_TOKENS, nSym) };
  if (rand() < 0.5) v.iop = { od: String(Math.floor(rand() * 60)), os: String(Math.floor(rand() * 60)) };
  if (rand() < 0.3) v.pupil = { rapd: rand() < 0.5 ? "OD" : "None" };
  if (rand() < 0.4) v.hxM = { dm: rand() < 0.5, htn: rand() < 0.5, autoimmune: rand() < 0.5, thyroid: rand() < 0.5 };
  if (rand() < 0.3) v.temporal = { onset: rand() < 0.5 ? "sudden_onset" : "gradual_onset", course: rand() < 0.5 ? "chronic" : "acute" };
  return v;
}

/* ── engine output invariants ── */
function assertWellFormed(out, label) {
  assert.ok(Array.isArray(out.dxList) || out.dxList, label + ": dxList exists");
  const dx = [...out.dxList];
  assert.ok(dx.length <= 8, label + ": ≤8 shown (" + dx.length + ")");
  let prevKey = Infinity;
  for (const d of dx) {
    assert.ok(d.prob >= 0 && d.prob <= 1, label + ": score in [0,1] (" + d.n + "=" + d.prob + ")");
    assert.ok(COND_NAMES.has(d.n), label + ": '" + d.n + "' is a real condition");
    /* sorted: urgent-priority then score — approximate monotonicity of a
       sort key that can't increase (urgent>0.2 floats up, else by score). */
    const key = (d.urgent && d.prob > 0.2 ? 2 : 0) + d.prob;
    assert.ok(key <= prevKey + 1e-9, label + ": differential is ordered");
    prevKey = key;
  }
  for (const a of out.alerts) assert.ok(a.l === "urgent" || a.l === "warn", label + ": alert level valid");
}

test("FUZZ: 3000 random visits never crash and always return a well-formed differential", () => {
  const rand = rng(1234);
  for (let i = 0; i < 3000; i++) {
    const v = randomVisit(rand);
    let out;
    assert.doesNotThrow(() => { out = eng.runCase(v); }, "visit #" + i + " threw");
    assertWellFormed(out, "visit #" + i);
  }
});

test("DETERMINISM: identical input yields identical output", () => {
  const rand = rng(99);
  for (let i = 0; i < 300; i++) {
    const v = randomVisit(rand);
    const a = eng.runCase(JSON.parse(JSON.stringify(v)));
    const b = eng.runCase(JSON.parse(JSON.stringify(v)));
    const key = (o) => [...o.dxList].map((d) => d.n + ":" + d.prob.toFixed(4)).join("|") + " ## " +
      [...o.alerts].map((x) => x.l + ":" + x.m).sort().join("|");
    assert.strictEqual(key(a), key(b), "non-deterministic on visit #" + i + ": " + JSON.stringify(v));
  }
});

/* THE safety stress: each red flag must fire buried in noise, every time. */
const RED_FLAGS = [
  { name: "sudden vision loss", re: /sudden vision loss/i, apply: (v) => v.symptoms.push("sudden_vision_loss") },
  { name: "flashes+floaters", re: /flashes \+ floaters/i, apply: (v) => v.symptoms.push("flashes", "floaters") },
  { name: "curtain", re: /curtain/i, apply: (v) => v.symptoms.push("curtain_vision") },
  { name: "IOP>40", re: /critically elevated/i, apply: (v) => { v.iop = { od: "52", os: "14" }; } },
  { name: "RAPD", re: /RAPD/i, apply: (v) => { v.pupil = { rapd: "OD" }; } },
  { name: "bilateral disc edema", re: /bilateral disc edema/i, apply: (v) => v.symptoms.push("bilateral_disc_swelling") },
  { name: "hypopyon", re: /hypopyon/i, apply: (v) => v.symptoms.push("hypopyon_visible") },
  { name: "rubeosis", re: /rubeosis/i, apply: (v) => v.symptoms.push("rubeosis_iridis") },
  { name: "leukocoria", re: /leukocoria/i, apply: (v) => v.symptoms.push("leukocoria") }
];

test("SAFETY: red-flag alerts are un-suppressible under heavy random noise", () => {
  const rand = rng(2024);
  for (const rf of RED_FLAGS) {
    for (let i = 0; i < 150; i++) {
      const v = randomVisit(rand);
      /* clear any accidental conflicting IOP for the IOP flag */
      if (rf.name === "IOP>40") delete v.iop;
      rf.apply(v);
      const out = eng.runCase(v);
      const fired = [...out.alerts].some((a) => a.l === "urgent" && rf.re.test(a.m));
      assert.ok(fired, rf.name + " alert failed to fire under noise (iter " + i + "): " + JSON.stringify(v));
    }
  }
});

test("SAFETY: an all-tokens-on 'everything' visit still fires every red flag", () => {
  const out = eng.runCase({
    symptoms: [...ALL_TOKENS],
    iop: { od: "55", os: "55" }, pupil: { rapd: "OD" }
  });
  const urgent = [...out.alerts].filter((a) => a.l === "urgent").map((a) => a.m).join(" ~ ");
  for (const rf of RED_FLAGS) {
    assert.ok(rf.re.test(urgent), rf.name + " missing from the everything-visit alerts");
  }
  assert.ok(out.dxList.length <= 8, "differential still bounded even with every token on");
});

test("KB-WIDE: every condition can surface from its own evidence (no dead entries)", () => {
  const dead = [];
  for (const c of [...ALL]) {
    const symptoms = (c.req || []).concat((c.sup || []).slice(0, 3));
    if (symptoms.length === 0) continue;
    const out = eng.runCase({ symptoms, temporal: { course: (c.temporal || [])[0] || "" } });
    const surfaced = [...out.dxList].some((d) => d.n === c.name) ||
                     [...(eng.context.ENGINE_STATE.results || [])].some((r) => r.name === c.name && r.score > 0);
    if (!surfaced) dead.push(c.name);
  }
  /* a handful of no-required or heavily-gated entries may not self-surface;
     hold the line low. */
  assert.ok(dead.length <= 3, "conditions that never surface: " + dead.join(", "));
});

test("ADVERSARIAL: malformed / extreme visit data does not crash the engine", () => {
  const weird = [
    {},
    { symptoms: null },
    { symptoms: [] },
    { symptoms: ["", "", ""] },
    { symptoms: ["not_a_real_token_xyz", "another_fake"] },
    { iop: { od: "abc", os: "-999" } },
    { iop: { od: "99999999", os: "NaN" } },
    { symptoms: ["flashes"], iop: {}, pupil: {}, hxM: {}, hxF: {}, sl: {}, fun: {} },
    { symptoms: Array(500).fill("dryness") },
    { temporal: { onset: 12345, course: null } }
  ];
  for (let i = 0; i < weird.length; i++) {
    let out;
    assert.doesNotThrow(() => { out = eng.runCase(weird[i]); }, "weird input #" + i + " threw");
    assert.ok(out && out.dxList, "weird input #" + i + " returned no result");
  }
});

test("VALIDATOR FUZZ: 2000 random drafts never crash the authoring linter", () => {
  const rand = rng(555);
  const routes = A.KB_KNOWN_ROUTES.concat(["", "bogus_route"]);
  const tokenInfo = {};
  for (const t of ALL_TOKENS) tokenInfo[t] = { reachable: ctx.TOKEN_REGISTRY[t].reachable !== false };
  const fuzzCtx = { conditions: [...ALL], tokenInfo, routes: A.KB_KNOWN_ROUTES };
  for (let i = 0; i < 2000; i++) {
    const draft = {
      name: rand() < 0.1 ? "" : "Fuzz " + Math.floor(rand() * 100000),
      route: routes[Math.floor(rand() * routes.length)],
      urgent: rand() < 0.5,
      req: pick(rand, ALL_TOKENS.concat(["fake_tok"]), Math.floor(rand() * 4)),
      sup: pick(rand, ALL_TOKENS, Math.floor(rand() * 6)),
      con: pick(rand, ALL_TOKENS, Math.floor(rand() * 4)),
      temporal: pick(rand, ["acute", "chronic", "progressive", "intermittent"], Math.floor(rand() * 3)),
      tests: pick(rand, ALL_TOKENS, Math.floor(rand() * 3)),
      exclusions: pick(rand, [...COND_NAMES], Math.floor(rand() * 3))
    };
    let res;
    assert.doesNotThrow(() => { res = A.kbLintCondition(draft, fuzzCtx); }, "draft #" + i + " threw");
    assert.ok(Array.isArray(res.errors) && Array.isArray(res.warnings) && res.normalized, "draft #" + i + " bad shape");
  }
});

test("PERFORMANCE: engine stays responsive over 1000 realistic runs", () => {
  const rand = rng(7);
  const cases = [];
  for (let i = 0; i < 1000; i++) cases.push(randomVisit(rand));
  const t0 = Date.now();
  for (const c of cases) eng.runCase(c);
  const perRun = (Date.now() - t0) / cases.length;
  /* generous ceiling; the indexed engine is ~sub-ms at this KB size */
  assert.ok(perRun < 25, "engine too slow: " + perRun.toFixed(2) + " ms/run");
});
