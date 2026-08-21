/* ═══════════════════════════════════════════════════════════════ */
/* THE SPECTACLE ADVISOR — NO ADVICE FOR AN EYE NOBODY MEASURED     */
/*                                                                  */
/* js/spectacle-advisor.js had no test reference at all             */
/* (tools/audit.js has been reporting it). It produces a DISPENSING */
/* recommendation — lens material, design, coatings — which someone */
/* orders lenses from.                                              */
/*                                                                  */
/* The defect it did have was robustness, not advice: V.hxS.vdu was */
/* read unguarded. Every blankVisit() carries hxS, but a visit from */
/* a restored backup or another device need not, and the read threw, */
/* taking the whole advisor panel down.                             */
/*                                                                  */
/* What it did NOT have, which I checked before changing anything:  */
/* the RX-1 defect of treating an unrefracted eye as a measured     */
/* plano. The render path refuses when no sphere is recorded, and   */
/* the only cross-eye arithmetic is Math.max, so an unmeasured      */
/* fellow eye cannot drag a recommendation down. Both are pinned    */
/* here so a later change cannot introduce what is currently absent. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function advisor(rx, extra) {
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} },
    V: { rx: rx || {} },
    P: { age: 40 },
    escH: (s) => String(s == null ? "" : s)
  }, extra || {});
  vm.createContext(ctx);
  vm.runInContext(read("js/spectacle-advisor.js"), ctx, { filename: "spectacle-advisor.js" });
  ctx.run = (e) => vm.runInContext(e, ctx);
  return ctx;
}

test("with no refraction the advisor refuses to recommend anything", () => {
  const out = advisor({}).run("renderSpectacleAdvisor()");
  assert.match(out, /Enter refraction/i,
    "a dispensing recommendation was produced for a patient nobody refracted");
  assert.ok(!/CR-39|Polycarbonate|Hi-Index/i.test(out),
    "a lens material was named with no prescription recorded");
});

test("with a real refraction it does advise (positive control)", () => {
  const out = advisor({ od_sph: "-6.00", os_sph: "-6.00" }).run("renderSpectacleAdvisor()");
  assert.match(out, /Hi-Index|Polycarbonate|CR-39/i,
    "the guard has become one that refuses everything");
});

test("the recommendation tracks the power actually recorded", () => {
  const low = advisor({ od_sph: "-1.00", os_sph: "-1.00" }).run("JSON.stringify(recommendLensIndex())");
  const high = advisor({ od_sph: "-9.00", os_sph: "-9.00" }).run("JSON.stringify(recommendLensIndex())");
  assert.notStrictEqual(low, high, "-1.00 and -9.00 produced the same recommendation");
  assert.match(low, /CR-39|1\.50/, "a low prescription should reach the standard-index band");
});

test("an unrecorded fellow eye does not drag a high prescription down", () => {
  /* Only the maximum power drives the material, so an unmeasured second eye
     must not make a -9.00 look low. */
  const out = advisor({ od_sph: "-9.00" }).run("JSON.stringify(recommendLensIndex())");
  assert.match(out, /1\.67|1\.74|Hi-Index/i,
    "a -9.00 in one eye was advised as if it were low powered: " + out);
});

test("a visit with no social history does not take the panel down", () => {
  /* THE DEFECT. V.hxS.vdu on an absent hxS threw. */
  const ctx = advisor({ od_sph: "-3.00", os_sph: "-3.00" });
  ctx.run("delete V.hxS;");
  assert.doesNotThrow(() => ctx.run("renderSpectacleAdvisor()"),
    "the advisor threw on a visit with no hxS — a restored or synced record has none");
  assert.doesNotThrow(() => ctx.run("recommendLensDesign()"));
  assert.doesNotThrow(() => ctx.run("recommendCoatings()"));
});

test("a missing patient age does not take the panel down", () => {
  const ctx = advisor({ od_sph: "-3.00", os_sph: "-3.00" }, { P: {} });
  assert.doesNotThrow(() => ctx.run("renderSpectacleAdvisor()"));
});

test("hostile refraction values neither crash nor produce a nonsense band", () => {
  for (const rx of [{ od_sph: "abc" }, { od_sph: null }, { od_sph: "1e9" },
                    { od_sph: "-Infinity" }, { od_sph: "NaN" }, { od_sph: "  " }]) {
    const ctx = advisor(rx);
    let out;
    assert.doesNotThrow(() => { out = ctx.run("JSON.stringify(recommendLensIndex())"); },
      "the advisor threw on " + JSON.stringify(rx));
    assert.match(out, /index/, "no recommendation shape returned for " + JSON.stringify(rx));
  }
});

test("the module says it is advisory", () => {
  /* CLAUDE.md: the advisory framing is not decoration. Someone orders lenses
     from this. */
  assert.match(read("js/spectacle-advisor.js"), /Advisory only/i,
    "the advisor no longer states that the clinician makes the final call");
});
