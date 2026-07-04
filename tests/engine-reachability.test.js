/* ═══════════════════════════════════════════════════════════════ */
/* CONDITION REACHABILITY GUARD                                    */
/* Every condition must be *self-reachable*: when all of its own     */
/* required + supportive evidence is present, it must appear in the  */
/* differential. A condition that can't surface even with full       */
/* evidence is silently un-diagnosable — the exact bug that hid      */
/* Hypopyon Uveitis, Wet AMD, Conjunctival Hyperemia, and ~50 others */
/* until routing was made data-driven.                               */
/*                                                                   */
/* This guards against re-introducing a route/scoring gap as the KB  */
/* grows (a new condition whose route never activates would fail).   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const ALL = eng.context.KNOWLEDGE_ALL;

test("every condition is self-reachable when its own evidence is present", () => {
  const unreachable = [];
  for (const cond of ALL) {
    const toks = [...(cond.req || []), ...(cond.sup || [])];
    const temporal = cond.temporal && cond.temporal[0] ? { onset: cond.temporal[0] } : {};
    const out = eng.runCase({ symptoms: toks, temporal });
    if (!out.dxList.some((d) => d.n === cond.name)) {
      unreachable.push(`${cond.name} [${cond.route}] req=${JSON.stringify(cond.req)}`);
    }
  }
  assert.strictEqual(
    unreachable.length,
    0,
    "conditions unreachable even with full evidence:\n  " + unreachable.join("\n  ")
  );
});

test("a condition's route activates when all its required tokens are present", () => {
  /* spot-check the mechanism directly on a previously-broken case */
  const out = eng.runCase({ symptoms: ["redness"] });
  assert.ok(out.routes.indexOf("surface") >= 0, "redness activates the surface route");
  assert.ok(out.dxList.some((d) => d.n.indexOf("Conjunctival Hyperemia") >= 0),
    "Conjunctival Hyperemia (req: redness) surfaces");
});
