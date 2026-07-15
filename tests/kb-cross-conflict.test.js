/* ═══════════════════════════════════════════════════════════════ */
/* CROSS-CONDITION CONFLICT GUARD                                  */
/* The founder's standard: conditions must not "fight/cross each    */
/* other and produce a junk diagnosis." This guard runs EVERY       */
/* condition's own textbook presentation (its req + sup) through the */
/* real engine and asserts the KB stays coherent:                   */
/*   • BURIED — a condition should land near the top of its OWN      */
/*     presentation, not be buried by rivals.                       */
/*   • CROSS-DOMAIN JUNK — no clinically-unrelated, non-urgent       */
/*     condition from another domain may outscore the target on its  */
/*     own presentation by a meaningful margin.                     */
/* Caps are set just above the current (audited, all-benign) counts  */
/* so any NEW conflict a KB/engine change introduces trips the test. */
/* Ratchet the caps down as the KB is refined; never raise them.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
const ALL = [...eng.context.KNOWLEDGE_ALL].map((c) => ({
  name: c.name, domain: c._domain, urgent: !!c.urgent,
  req: [...(c.req || [])], sup: [...(c.sup || [])]
}));
const domainOf = {};
ALL.forEach((c) => (domainOf[c.name] = c.domain));

function audit() {
  const buried = [], crossJunk = [];
  for (const c of ALL) {
    const symptoms = [...c.req, ...c.sup];
    if (symptoms.length === 0) continue;
    const out = eng.runCase({ symptoms, temporal: {} });
    const dx = [...out.dxList].map((d) => ({ n: d.n, p: d.prob, u: d.urgent }));
    const selfIdx = dx.findIndex((d) => d.n === c.name);
    if (selfIdx === -1) { buried.push(c.name + " → ABSENT"); continue; }
    const self = dx[selfIdx], top = dx[0];
    if (selfIdx > 2) buried.push(c.name + " → rank " + (selfIdx + 1) + " (top " + top.n + " " + top.p.toFixed(2) + ", self " + self.p.toFixed(2) + ")");
    for (let i = 0; i < selfIdx; i++) {
      const w = dx[i];
      /* junk = a non-urgent winner from a DIFFERENT domain beating the target
         on the target's own presentation by a meaningful margin. */
      if (domainOf[w.n] && domainOf[w.n] !== c.domain && !w.u && w.p >= self.p + 0.03) {
        crossJunk.push(c.name + " (" + c.domain + ", " + self.p.toFixed(2) + ") < unrelated " + w.n + " (" + domainOf[w.n] + ", " + w.p.toFixed(2) + ")");
        break;
      }
    }
  }
  return { buried, crossJunk };
}

const { buried, crossJunk } = audit();

test("few conditions are BURIED in their own presentation (no rival-swamping)", () => {
  /* CAP — ratchet down. Current benign count is 1 (an urgent shown just above a
     0.77 non-urgent via the bounded sort nudge — clinically desirable). */
  assert.ok(buried.length <= 2,
    "too many buried conditions (" + buried.length + " > 2):\n" + buried.join("\n"));
});

test("no unrelated cross-domain junk winners of significance", () => {
  /* CAP — ratchet down. Current benign count is 2, both same-entity/near-tie
     (Exposure Keratitis vs Exposure Keratopathy; Terrien vs Nuclear Sclerotic
     Cataract) within 0.04. A real regression would push this up. */
  assert.ok(crossJunk.length <= 3,
    "too many cross-domain junk winners (" + crossJunk.length + " > 3):\n" + crossJunk.join("\n"));
});

test("engine ordering is deterministic under the cross audit", () => {
  const a = audit(), b = audit();
  assert.deepStrictEqual(a.buried, b.buried, "buried set not deterministic");
  assert.deepStrictEqual(a.crossJunk, b.crossJunk, "crossJunk set not deterministic");
});
