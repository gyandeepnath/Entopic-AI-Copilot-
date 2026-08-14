/* ═══════════════════════════════════════════════════════════════ */
/* THE GLASS BOX MUST NOT MISREPRESENT THE ENGINE                   */
/*                                                                  */
/* WHAT THE FOUNDER SAW                                             */
/*                                                                  */
/* He entered essentially nothing and found an occipital-stroke     */
/* hemianopia sitting in the reasoning view, and reasonably asked   */
/* why the engine was suggesting a stroke out of nowhere.           */
/*                                                                  */
/* It was not. The DIFFERENTIAL was correct — the stroke entry is   */
/* deliberately excluded, because only one of its two required      */
/* findings was present. The reasoning view was printing the top 5  */
/* of ENGINE_STATE.results, which is every condition SCORED, with   */
/* no marker separating "in the differential" from "considered and  */
/* rejected".                                                       */
/*                                                                  */
/* The fix is NOT to hide the low scorers. A glass box that only    */
/* shows the conclusions is not a glass box, and "what did you rule */
/* out, and why?" is exactly the question a clinician should be     */
/* able to ask of a decision-support tool. The fix is to say which  */
/* side of the display floor each entry is on, and to say the       */
/* reason in words rather than as "req:1/2".                        */
/*                                                                  */
/* These tests pin that, and pin the two structural properties that */
/* let the bug exist: a single definition of the floor, and         */
/* escaping on a condition name that arrives from an imported KB.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const { createEngine } = require("../tools/lib/load-engine");

/* The flow map needs the engine's globals plus escHtml. Load it on top of a
   real engine context so it reads the REAL ENGINE_STATE, not a fixture. */
function loadFlowmap() {
  const eng = createEngine();
  const ctx = eng.context;
  vm.runInContext(read("js/dom-escape.js"), ctx, { filename: "dom-escape.js" });
  vm.runInContext(read("js/ui-flowmap.js"), ctx, { filename: "ui-flowmap.js" });
  return { eng, ctx };
}

const strip = (html) => String(html).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();


test("the display floor has exactly one definition", () => {
  /* The bug was possible because DX_FLOOR was a local `var` inside the scoring
     pass, so the flow map could not consult it. A second copy would drift, and
     a glass box that disagrees with the engine is worse than none. */
  const engine = read("js/engine.js");
  const decls = engine.match(/\bvar\s+DX_FLOOR\s*=/g) || [];
  assert.strictEqual(decls.length, 1,
    "DX_FLOOR must be declared once, at module scope, so consumers can read it");

  const flowmap = read("js/ui-flowmap.js");
  assert.ok(!/\bvar\s+DX_FLOOR\s*=/.test(flowmap),
    "the flow map must READ the engine's floor, never keep its own copy");

  /* Scoped to the scoring layer: elsewhere in this file 0.15 is an unrelated
     "close rivals" margin, and a whole-file ban would be a false positive. A
     `|| 0.15` fallback here counts as a second copy — it would drift silently
     the moment the founder tuned the real floor. */
  const fn = flowmap.slice(flowmap.indexOf("function renderScoringLayer"),
                           flowmap.indexOf("LAYER 5"));
  assert.ok(fn.length > 200, "sanity: located renderScoringLayer");
  /* Comments stripped: prose may legitimately name the number it is explaining,
     and only executable code can actually drift. */
  const code = fn.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/0\.15/.test(code),
    "renderScoringLayer must not hardcode the floor, not even as a fallback");
  assert.match(fn, /var floor = DX_FLOOR/,
    "it must read the engine's constant directly");
});

test("the flow map's floor and the engine's filter are the same number", () => {
  /* The structural test above stops a literal copy; this one proves the value
     actually agrees at runtime, which is what the reader is being promised. */
  const { eng, ctx } = loadFlowmap();
  eng.runCase({ symptoms: ["field_loss_half"] });
  const engineFloor = vm.runInContext("DX_FLOOR", ctx);
  const marker = strip(vm.runInContext("renderScoringLayer()", ctx));
  assert.strictEqual(typeof engineFloor, "number");
  assert.match(marker, new RegExp("scored under " + Math.round(engineFloor * 100) + "%"),
    "the percentage printed to the clinician must be the engine's actual floor");
});

test("a sub-threshold condition is shown, but marked as NOT in the differential", () => {
  const { eng, ctx } = loadFlowmap();

  /* One symptom. Homonymous Hemianopia matches its single required token and
     belongs in the differential; the occipital-stroke entry needs TWO and is
     correctly excluded. */
  const out = eng.runCase({ symptoms: ["field_loss_half"] });
  const names = out.dxList.map((d) => d.n);
  assert.ok(names.some((n) => /Homonymous Hemianopia/i.test(n)),
    "sanity: the fully-matched condition IS in the differential");
  assert.ok(!names.some((n) => /Occipital Stroke/i.test(n)),
    "sanity: the half-matched urgent condition is NOT in the differential — " +
    "this is the engine behaving correctly, and was never the bug");

  const txt = strip(vm.runInContext("renderScoringLayer()", ctx));
  assert.match(txt, /Occipital Stroke/,
    "it must still be SHOWN — hiding the rejected candidates is not transparency");
  assert.match(txt, /NOT in the differential/,
    "and it must say so, which is the entire fix");
  assert.match(txt, /required finding absent/,
    "the reason must be in words; 'req:1/2' is notation, not an explanation");
});

test("the marker sits between the two groups, not on the whole list", () => {
  const { eng, ctx } = loadFlowmap();
  eng.runCase({ symptoms: ["field_loss_half"] });
  const txt = strip(vm.runInContext("renderScoringLayer()", ctx));

  const cut = txt.indexOf("NOT in the differential");
  assert.ok(cut > 0, "the band header must be present");
  assert.ok(/Homonymous Hemianopia/.test(txt.slice(0, cut)),
    "a condition that IS in the differential must appear ABOVE the marker");
  assert.ok(/Occipital Stroke/.test(txt.slice(cut)),
    "the excluded one must appear BELOW it");
});

test("nothing is marked excluded when everything cleared the floor", () => {
  const { eng, ctx } = loadFlowmap();
  /* A well-evidenced dry-eye presentation: the top candidates all score high. */
  eng.runCase({
    cc: "gritty burning eyes worse in the evening",
    symptoms: ["dryness", "burning", "grittiness", "foreign_body_sensation"],
    temporal: { onset: "gradual", duration: "months", course: "stable" }
  });
  const html = vm.runInContext("renderScoringLayer()", ctx);
  const txt = strip(html);
  const results = vm.runInContext("(ENGINE_STATE.results||[]).length", ctx);
  const above = vm.runInContext(
    "(ENGINE_STATE.results||[]).filter(function(r){return r.score>=DX_FLOOR||r._gateReason}).length", ctx);

  assert.ok(results > 0, "sanity: conditions were scored");
  if (results === above) {
    assert.ok(!/NOT in the differential/.test(txt),
      "with nothing below the floor there must be no exclusion band at all");
  } else {
    assert.match(txt, /NOT in the differential/,
      "if anything fell below the floor it must be labelled");
  }
});

test("every condition in the differential appears in the reasoning view", () => {
  /* The old code printed a flat top-5 of the raw scored list. On a rich
     encounter that could truncate the shown differential — the reasoning view
     would omit a condition the clinician was actually being shown. */
  const { eng, ctx } = loadFlowmap();
  const out = eng.runCase({
    cc: "sudden flashes and floaters with a curtain",
    symptoms: ["flashes", "floaters", "curtain_shadow"],
    temporal: { onset: "acute", duration: "hours", course: "worsening" }
  });
  const txt = strip(vm.runInContext("renderScoringLayer()", ctx));
  const cut = txt.indexOf("NOT in the differential");
  const shownPart = cut > 0 ? txt.slice(0, cut) : txt;

  assert.ok(out.dxList.length > 0, "sanity: there is a differential");
  for (const d of out.dxList) {
    /* Overlay entries are appended by a different path; only assert on core. */
    if (d._overlay) continue;
    assert.ok(shownPart.includes(d.n),
      '"' + d.n + '" is in the differential but missing from the reasoning view ' +
      "above the exclusion line");
  }
});

test("a condition name cannot inject markup into the reasoning view", () => {
  /* Condition names are NOT purely local: they arrive from KB overlays and
     published bundles. Every other interpolation in ui-flowmap.js escapes;
     this one did not. */
  const { ctx } = loadFlowmap();
  vm.runInContext(`
    ENGINE_STATE.results = [{
      name: '<img src=x onerror="window.__pwn=1">',
      score: 0.9, urgent: false,
      _scoreDetail: { reqMatched: 1, reqMissing: 0, supMatched: 0 }
    }];
  `, ctx);
  const html = String(vm.runInContext("renderScoringLayer()", ctx));
  assert.ok(!html.includes("onerror=\""), "no event handler may reach the DOM");
  assert.ok(!html.includes("<img"), "the tag must not survive as markup");
  assert.match(html, /&lt;img/, "it must render as visible text instead");
});

test("an empty encounter produces no differential and no scored conditions", () => {
  /* The founder's literal question — "why is it there without anything?" The
     answer must be that with nothing entered, there is nothing. */
  const { eng, ctx } = loadFlowmap();
  const out = eng.runCase({});
  assert.strictEqual(out.dxList.length, 0, "a blank exam must produce no differential");
  assert.strictEqual(out.tokens.length, 0, "and no tokens");
  const txt = strip(vm.runInContext("renderScoringLayer()", ctx));
  assert.match(txt, /No conditions scored/,
    "the reasoning view must say so plainly rather than showing an empty frame");
});
