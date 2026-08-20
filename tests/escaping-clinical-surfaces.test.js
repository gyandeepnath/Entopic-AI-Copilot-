/* ═══════════════════════════════════════════════════════════════ */
/* SCRIPT INJECTION ON THE CLINICAL SURFACES                        */
/*                                                                  */
/* Promoted from tools/stress/xss.js, which renders the real page   */
/* in a real browser and found five separate holes that a static    */
/* read had missed — including one in the URGENT ALERT BOX, the one */
/* element in this product that is never allowed to be suppressed.  */
/*                                                                  */
/* PROVEN, not theorised: a crafted condition name set window.__xss */
/* from the advisory panel. The same class as the Phase 9 P.age     */
/* hole (js/dom-escape.js documents that one).                      */
/*                                                                  */
/* WHY THESE INPUTS ARE REACHABLE. A clinician cannot type a script */
/* tag into a dropdown — but a RESTORED BACKUP, an IMPORTED file, a */
/* SYNCED record and a PUBLISHED knowledge-base bundle all arrive   */
/* as JSON that nothing re-validates, and condition names, alert    */
/* text and drug effects all come from the knowledge base.          */
/*                                                                  */
/* These are source-level assertions. The browser proof lives in    */
/* tools/stress/xss.js; this file is what keeps CI honest, because  */
/* the browser sweep is not part of `node --test`.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
/* Comments legitimately describe the pattern they guard against. */
const code = (f) => read(f).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");

/* Every place a knowledge-base condition name is written into HTML. */
const NAME_SURFACES = [
  ["js/ui-advisory.js", "the advisory panel — the most-viewed clinical surface"],
  ["js/ui-flowmap.js", "the glass-box reasoning map"],
  ["js/ui-pages-2.js", "the diagnosis and coding steps"]
];

for (const [file, why] of NAME_SURFACES) {
  test("condition names are escaped in " + file + " (" + why + ")", () => {
    const src = code(file);
    /* `+ d.n +` or `+ lead.n +` with no escaper around it. */
    const raw = [...src.matchAll(/\+\s*((?:d|lead|foc|r|dx)\.(?:n|name|lead|icd|domain|cat))\s*\+/g)]
      .map((m) => m[1]);
    assert.deepStrictEqual([...new Set(raw)], [],
      file + " writes a knowledge-base value into HTML unescaped: " + [...new Set(raw)].join(", ") +
      " — a crafted condition name executes in the app, where the patient records " +
      "and the unlocked vault live");
  });
}

test("the clinical alert message is escaped", () => {
  /* The alert box is the one surface that must never be suppressed, which
     makes it the highest-value place in the app to inject. */
  const src = code("js/ui-advisory.js");
  assert.ok(!/\+\s*V\.alerts\[\w+\]\.m\s*\+/.test(src),
    "an alert MESSAGE is written into HTML unescaped");
  assert.match(src, /escH\(\s*_al\.m\s*\)|escH\(V\.alerts/,
    "the alert message must go through the canonical escaper");
});

test("the alert LEVEL is constrained, not merely interpolated into a class", () => {
  /* A class attribute is not free text: an unescaped quote breaks straight out
     into a new attribute, which is how an event handler gets added. */
  const src = code("js/ui-advisory.js");
  assert.ok(!/'<div class="alert-box '\s*\+\s*V\.alerts\[\w+\]\.l\s*\+/.test(src),
    "the alert level is written raw into a class attribute");
  assert.match(src, /ALERT_LEVELS/,
    "the level should be checked against the known set rather than trusted");
});

test("medication alert text is escaped", () => {
  const src = code("js/ui-advisory.js");
  for (const f of ["ma.drug", "ma.effect", "ma.action"]) {
    assert.ok(!new RegExp("\\+\\s*" + f.replace(".", "\\.") + "\\s*\\+").test(src),
      f + " is written into HTML unescaped — the medications file is extensible " +
      "by a published bundle");
  }
});

test("route names are escaped and looked up by own property", () => {
  const src = code("js/ui-flowmap.js");
  assert.ok(!/\+\s*r\.toUpperCase\(\)\s*\+/.test(src),
    "a route name is written into HTML unescaped");
  assert.ok(!/routeColors\[r\]\s*\|\|/.test(src),
    "the route colour is read with a prototype-reachable lookup and then written " +
    "into a style attribute");
});

test("the canonical escaper is what these surfaces use", () => {
  /* Guards against someone 'fixing' a finding with a hand-rolled escape that
     misses the double quote — the exact bug js/dom-escape.js was created for. */
  for (const [file] of NAME_SURFACES) {
    const src = code(file);
    assert.ok(/\besc(H|Html)\s*\(/.test(src),
      file + " does not use the canonical escaper at all");
    assert.ok(!/\.replace\(\/&\/g[\s\S]{0,200}?\.replace\(\/</.test(src),
      file + " has a hand-rolled escaper; use escHtml from js/dom-escape.js");
  }
});

test("the browser sweep exists and covers the surfaces that broke", () => {
  /* The source assertions above are proxies. The real proof is the browser
     run; this makes sure it is still there and still aimed at these screens. */
  const sweep = read("tools/stress/xss.js");
  for (const needle of ["renderAdvisory", "renderFlowMap", "kbOverlay",
                        "competencyFrameworkSet", "viewPastVisit"]) {
    assert.ok(sweep.includes(needle),
      "tools/stress/xss.js no longer exercises " + needle);
  }
  assert.match(sweep, /window\.__xss/, "the sweep must assert on actual execution");
});
