/* ═══════════════════════════════════════════════════════════════ */
/* KB TOKEN HEALTH                                                 */
/* The founder flagged that some conditions had no/limited/irrelevant */
/* tokens. This test makes token quality a permanent, measured        */
/* standard so it can't silently regress:                            */
/*   • no condition may carry a DEAD required token (one no exam      */
/*     input produces) — that condition could never fire             */
/*   • the number of dead supportive/contradicting tokens (evidence   */
/*     that looks meaningful but never activates) is capped and       */
/*     trends down                                                    */
/*   • the number of "thin" conditions (<=3 total req+sup+con tokens) */
/*     is capped and trends down                                      */
/* Tighten these caps as the KB is enriched further.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const kb = loadKnowledgeBase();
const REG = kb.TOKEN_REGISTRY;
const reachable = (t) => REG[t] && REG[t].reachable !== false;
const ALL = [...kb.KNOWLEDGE_ALL];

test("no condition has a DEAD required token (every condition can fire)", () => {
  const dead = [];
  for (const c of ALL) {
    for (const t of (c.req || [])) if (!reachable(t)) dead.push(c.name + " → '" + t + "'");
  }
  assert.deepStrictEqual(dead, [], "required tokens with no producer:\n" + dead.join("\n"));
});

test("dead supportive/contradicting token usages stay capped (currently ~44, trending down)", () => {
  let deadUse = 0;
  const offenders = [];
  for (const c of ALL) {
    const dead = [...(c.sup || []), ...(c.con || [])].filter((t) => !reachable(t));
    if (dead.length) { deadUse += dead.length; offenders.push(c.name + ": " + dead.join(",")); }
  }
  /* CAP — lower this as enrichment continues; do not raise it. */
  assert.ok(deadUse <= 12, "too many dead sup/con tokens (" + deadUse + " > 12):\n" + offenders.join("\n"));
});

test("thin conditions (<=3 total req+sup+con tokens) stay capped (currently ~33, trending down)", () => {
  const thin = ALL.filter((c) => ((c.req || []).length + (c.sup || []).length + (c.con || []).length) <= 3)
                  .map((c) => c.name);
  /* CAP — lower this as enrichment continues; do not raise it. */
  assert.ok(thin.length <= 32, "too many thin conditions (" + thin.length + " > 32):\n" + thin.join("\n"));
});

test("every condition has at least one required token OR is intentionally no-req", () => {
  /* No-req conditions are allowed but rare; none should sneak in unnoticed. */
  const noReq = ALL.filter((c) => !(c.req || []).length).map((c) => c.name);
  assert.ok(noReq.length <= 1, "unexpected no-required-token conditions: " + noReq.join(", "));
});
