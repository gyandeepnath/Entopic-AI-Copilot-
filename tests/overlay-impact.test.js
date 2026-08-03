/* ═══════════════════════════════════════════════════════════════ */
/* OVERLAY IMPACT PREVIEW                                           */
/*                                                                  */
/* "This would have appeared in 34 of your last 200 differentials,   */
/*  and in 6 it would have outranked what you actually diagnosed."   */
/*                                                                  */
/* The safety feature of the authoring flow, and the reason it is    */
/* tested carefully: a WRONG impact number is worse than none,       */
/* because a clinician would act on it.                              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* A deliberately simple stand-in for scoreCondition: fraction of required
   tokens present, plus a little for supporting ones. The impact module's job
   is to drive the real scorer over stored visits and count honestly — not to
   score — so the stub keeps the test about the counting. */
function load(visits) {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, Set, RegExp, parseInt, isFinite,
    module: { exports: {} },
    loadVisits: () => visits,
    FINDING_TOKEN_MAP: { "Meibomian gland dysfunction": "mgd" },
    scoreCondition: (cond, tokens) => {
      const have = cond.req.filter((t) => tokens.includes(t)).length;
      if (have < cond.req.length) return { score: 0 };
      const sup = (cond.sup || []).filter((t) => tokens.includes(t)).length;
      return { score: Math.min(1, 0.5 + sup * 0.2) };
    }
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/overlay-impact.js"), ctx, { filename: "overlay-impact.js" });
  return ctx;
}

const v = (id, date, toks, dx, dxScore) => ({
  id, patient_id: "p1", status: "completed", date,
  data: { engine_tokens: toks, final_dx: dx,
          dxList: dx ? [{ n: dx, prob: dxScore === undefined ? 0.5 : dxScore }] : [] }
});

const DRAFT = { name: "Mine", req: ["dryness"], sup: ["burning"] };


test("it counts the visits where the condition would have fired", () => {
  const c = load([
    v("1", "2026-01-01", ["dryness", "burning"], "Dry Eye"),
    v("2", "2026-02-01", ["flashes", "floaters"], "PVD"),
    v("3", "2026-03-01", ["dryness"], "Dry Eye")
  ]);
  const r = c.overlayImpact(DRAFT);
  assert.strictEqual(r.available, true);
  assert.strictEqual(r.visits_examined, 3);
  assert.strictEqual(r.fired_count, 2, "fires on the two dryness visits, not the PVD one");
});

test("it counts where it would have OUTRANKED the recorded diagnosis", () => {
  /* The number that matters. Visit 1: mine scores 0.7 vs recorded 0.5 →
     outranked. Visit 3: mine 0.5 vs recorded 0.9 → not. */
  const c = load([
    v("1", "2026-01-01", ["dryness", "burning"], "Dry Eye", 0.5),
    v("3", "2026-03-01", ["dryness"], "Dry Eye", 0.9)
  ]);
  const r = c.overlayImpact(DRAFT);
  assert.strictEqual(r.fired_count, 2);
  assert.strictEqual(r.outranked_count, 1);
  assert.strictEqual(r.outranked[0].visit_id, "1");
});

test("only COMPLETED visits are examined", () => {
  /* An in-progress visit has a partial record; counting it would overstate. */
  const c = load([
    v("1", "2026-01-01", ["dryness", "burning"], "Dry Eye"),
    Object.assign(v("2", "2026-02-01", ["dryness"], "Dry Eye"), { status: "in_progress" })
  ]);
  assert.strictEqual(c.overlayImpact(DRAFT).visits_examined, 1);
});

test("it uses the tokens RECORDED at the visit, not today's derivation", () => {
  /* Re-deriving would use today's knowledge, so the answer would drift as the
     KB changes and would not describe what actually happened. */
  const c = load([v("1", "2026-01-01", ["dryness", "burning"], "Dry Eye")]);
  assert.deepStrictEqual(c.impactTokensOf({ data: { engine_tokens: ["a", "b"] } }), ["a", "b"]);
});

test("a visit saved before tokens were recorded falls back to observable findings only", () => {
  const c = load([]);
  const toks = c.impactTokensOf({ data: {
    symptoms: ["dryness"],
    sl: { findings: [{ label: "Meibomian gland dysfunction" }] }
  } });
  assert.ok(toks.includes("dryness"));
  assert.ok(toks.includes("mgd"), "findings map through FINDING_TOKEN_MAP");
});

test("it is capped so a large clinic cannot stall the UI", () => {
  const many = [];
  for (let i = 0; i < 500; i++) many.push(v("v" + i, "2026-01-01", ["dryness"], "Dry Eye"));
  const r = load(many).overlayImpact(DRAFT);
  assert.strictEqual(r.visits_examined, 200);
  assert.strictEqual(r.visits_total, 500);
  assert.strictEqual(r.capped, true, "and says so, rather than quietly reporting a partial answer");
});

test("a condition with no required finding is refused, not reported as harmless", () => {
  /* It would never fire, so "0 impact" would be true and deeply misleading. */
  const r = load([]).overlayImpact({ name: "X", req: [] });
  assert.strictEqual(r.available, false);
  assert.ok(/required finding/i.test(r.reason));
});

test("it distinguishes a recorded diagnosis from the engine's own leader", () => {
  /* Comparing against what the engine happened to rank first is much weaker
     evidence than comparing against what the clinician wrote down, and the UI
     has to be able to say which it used. */
  const c = load([]);
  assert.strictEqual(c.impactActualDx({ data: { final_dx: "Written down" } }), "Written down");
  assert.strictEqual(c.impactActualDx({ data: { dxList: [{ n: "Engine guess" }] } }), "Engine guess");
});

test("it reports counts and never a verdict", () => {
  /* "Fires 34 times" is a fact. "Fires too often" is a clinical judgement and
     is not the software's to make. */
  const code = read("js/overlay-impact.js").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const word of ["tooOften", "excessive", "unsafe", "recommend", "shouldNot", "warning"]) {
    assert.ok(!new RegExp(word, "i").test(code),
      "the impact module must count, not judge — found '" + word + "'");
  }
});

test("the engine records the tokens each visit was scored from", () => {
  /* Without this the preview has to re-derive, which answers a different
     question. */
  assert.ok(/V\.engine_tokens = tokens\.slice\(\)/.test(read("js/engine.js")),
    "the engine must store its tokens on the visit");
});

test("both modules load, in dependency order", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/engine.js") < order.indexOf("js/overlay-impact.js"),
    "impact needs scoreCondition from engine.js");
  assert.ok(order.indexOf("js/overlay-impact.js") < order.indexOf("js/ui-condition-builder.js"));
});
