/* ═══════════════════════════════════════════════════════════════ */
/* UI WIRING — no dead buttons, no orphaned features                */
/*                                                                  */
/* The founder asked whether "everything is connected and wired".   */
/* Two objective guards, run over the actual UI source:             */
/*   1. Every inline event handler (onclick/onchange/…) must call a  */
/*      function that is actually DEFINED — no dead buttons.         */
/*   2. Substantial feature panels that were once built-but-orphaned */
/*      (no entry point) must stay REFERENCED somewhere in the UI —  */
/*      so a feature can't silently become unreachable again.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
function jsAndHtml() {
  const out = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const s = fs.statSync(p);
      if (s.isDirectory()) { if (!/node_modules|\.git|screenshots/.test(p)) walk(p); }
      else if (/\.(js|html)$/.test(f) && !/token-registry/.test(f)) out.push(p);
    }
  };
  walk(path.join(ROOT, "js"));
  out.push(path.join(ROOT, "index.html"));
  return out;
}

const files = jsAndHtml();
const allText = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");

/* Collect every defined function / assigned callable name. */
const defined = new Set();
for (const f of files) {
  const t = fs.readFileSync(f, "utf8");
  let m;
  const pats = [
    /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g,
    /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g,
    /\bwindow\.([A-Za-z_$][\w$]*)\s*=/g,
    /\b(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*\([^)]*\)\s*=>/g
  ];
  for (const re of pats) while ((m = re.exec(t))) defined.add(m[1]);
}

/* JS keywords / builtins that legitimately appear as `onclick="if(...)"` etc. */
const NOT_FUNCTIONS = new Set(["if", "for", "while", "function", "return", "var", "let",
  "const", "event", "this", "alert", "confirm", "prompt", "void", "window", "document", "true", "false"]);

/* Strip comments before scanning for handlers. A comment that DOCUMENTS the
   `onclick="fn('…')"` pattern is prose, not a dead button — without this,
   writing documentation about the UI's own conventions fails the build (which
   is exactly what happened when dom-escape.js explained the pattern it guards).
   Deliberately conservative: only strips /* … *​/ and // … to end of line. */
function stripComments(t) {
  return t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

test("every inline event handler calls a DEFINED function (no dead buttons)", () => {
  const handlerRe = /on(?:click|change|input|keydown|keyup|keypress|submit|focus|blur|mousedown|mouseup|dblclick)\s*=\s*\\?["']?\s*([A-Za-z_$][\w$]*)\s*\(/g;
  const missing = {};
  for (const f of files) {
    const t = stripComments(fs.readFileSync(f, "utf8"));
    let m;
    handlerRe.lastIndex = 0;
    while ((m = handlerRe.exec(t))) {
      const fn = m[1];
      if (NOT_FUNCTIONS.has(fn) || defined.has(fn)) continue;
      (missing[fn] = missing[fn] || new Set()).add(path.basename(f));
    }
  }
  const offenders = Object.keys(missing).map((k) => k + "() ← " + [...missing[k]].join(", "));
  assert.deepStrictEqual(offenders, [], "handlers calling undefined functions:\n  " + offenders.join("\n  "));
});

test("previously-orphaned feature panels stay reachable (referenced in the UI)", () => {
  /* Each of these substantial panels must be CALLED from somewhere other than
     its own definition, or it becomes a built-but-unreachable feature again.
     (renderRiskCalculators / renderMedicationReview are intentionally NOT here
     yet — pending founder clinical verification — see CHANGELOG.) */
  const mustBeWired = ["renderSpectacleAdvisor", "osdiTool", "renderOSDI"];
  const orphaned = mustBeWired.filter((fn) => {
    const refs = (allText.match(new RegExp("\\b" + fn + "\\b", "g")) || []).length;
    return refs <= 1; /* only its own definition */
  });
  assert.deepStrictEqual(orphaned, [], "feature functions defined but not wired to any entry point:\n  " + orphaned.join("\n  "));
});
