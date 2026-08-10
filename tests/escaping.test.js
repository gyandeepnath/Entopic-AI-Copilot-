/* ═══════════════════════════════════════════════════════════════ */
/* HTML ESCAPING (XSS guard)                                       */
/* esc() output is dropped into <textarea> bodies and attribute      */
/* values across the exam pages. It MUST neutralise markup — a       */
/* quotes-only escape let free text like "</textarea><img onerror>"  */
/* break out (stored XSS, now reachable via synced remote records).  */
/* These pin the full-escaping behaviour so it can't regress.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

/* Load just the esc/escH helpers from app.js without the whole app. */
const appSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "app.js"), "utf8");
function extractFn(name) {
  const start = appSrc.indexOf("function " + name + "(");
  let i = appSrc.indexOf("{", start), depth = 0;
  for (; i < appSrc.length; i++) {
    if (appSrc[i] === "{") depth++;
    else if (appSrc[i] === "}") { depth--; if (depth === 0) break; }
  }
  return appSrc.slice(start, i + 1);
}
/* esc()/escH() now delegate to the single canonical implementation in
   js/dom-escape.js (see that file for the load-order bug that made seven
   modules silently use a weaker copy). The assertions below are unchanged —
   only where the code lives has moved, so they still pin the same guarantees
   through the public names the app calls. */
const escapeSrc = fs.readFileSync(path.resolve(__dirname, "..", "js", "dom-escape.js"), "utf8");
const sandbox = { module: { exports: {} } };
vm.createContext(sandbox);
vm.runInContext(escapeSrc + "\n" + extractFn("esc") + "\n" + extractFn("escH") +
  "\nthis.esc=esc;this.escH=escH;", sandbox);
const { esc, escH } = sandbox;

test("esc neutralises the </textarea> breakout payload", () => {
  const evil = '</textarea><img src=x onerror="alert(1)"><script>alert(2)</script>';
  const out = esc(evil);
  assert.ok(out.indexOf("<") === -1, "no raw < survives");
  assert.ok(out.indexOf(">") === -1, "no raw > survives");
  assert.ok(out.indexOf("</textarea>") === -1, "cannot close the textarea");
  assert.ok(out.indexOf("&lt;/textarea&gt;") >= 0, "angle brackets are entity-encoded");
});

test("esc escapes all four dangerous characters", () => {
  assert.strictEqual(esc('&<>"'), "&amp;&lt;&gt;&quot;");
});

test("esc encodes & first (no double-encoding of produced entities)", () => {
  /* "<" must become "&lt;" not "&amp;lt;" */
  assert.strictEqual(esc("<"), "&lt;");
  assert.strictEqual(esc("&amp;"), "&amp;amp;", "a literal &amp; in input is treated as text");
});

test("esc handles null/undefined/numbers without throwing", () => {
  assert.strictEqual(esc(null), "");
  assert.strictEqual(esc(undefined), "");
  assert.strictEqual(esc(42), "42");
});

test("escH remains a full escaper too (headers/labels)", () => {
  assert.strictEqual(escH('a<b>"&'), "a&lt;b&gt;&quot;&amp;");
});


/* ═══════════════════════════════════════════════════════════════ */
/* EVERY PATIENT FIELD THAT REACHES innerHTML IS ESCAPED           */
/*                                                                  */
/* Phase 9 found a proven XSS: `age` and `sex` were interpolated    */
/* into innerHTML unescaped in three places — the exam header and   */
/* two report surfaces — while name, MRN, occupation and the chief  */
/* complaint beside them were escaped.                              */
/*                                                                  */
/* Demonstrated in a real browser: a record whose age was           */
/*   5"><img src=x onerror="...">                                   */
/* executed script in the app's own context, which is where every   */
/* patient record and the unlocked vault live.                      */
/*                                                                  */
/* WHY IT LOOKED SAFE, AND WHY THAT REASONING WAS WRONG             */
/*                                                                  */
/* age is <input type="number"> and sex is a <select>, so a         */
/* clinician cannot TYPE markup into them. But the input is not the */
/* only way a value arrives: a restored backup, an imported file    */
/* and a synced record from another device all assign these fields  */
/* directly, and none of those paths validates field TYPES (checked */
/* — validateBackup verifies counts and shape, not scalars).        */
/*                                                                  */
/* So the rule this pins is deliberately blunt: it does not matter  */
/* how constrained a field's INPUT is; if it reaches innerHTML it   */
/* is escaped. Rendering is the last layer that can be certain.     */
/* ═══════════════════════════════════════════════════════════════ */

const PAYLOAD = '5"><img src=x onerror="window.__x=1">';

test("esc/escH neutralise the attribute-breakout payload used in the exploit", () => {
  for (const fn of [esc, escH]) {
    const out = fn(PAYLOAD);
    assert.ok(!/<img/.test(out), "the tag survived escaping: " + out);
    assert.ok(out.indexOf('"') < 0 || !/onerror=/.test(out.replace(/&quot;/g, "")),
      "an event handler survived escaping: " + out);
  }
});

test("the exam header escapes age and sex, not only name and MRN", () => {
  /* Source-level, because updateHdr writes straight to innerHTML and the
     behavioural proof lives in the browser probe. Kept narrow: it asserts
     that the two fields are wrapped, not how the string is assembled. */
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "app.js"), "utf8");
  const fn = /function updateHdr\(\)[\s\S]*?\n}/.exec(src);
  assert.ok(fn, "updateHdr not found");
  const body = fn[0];
  assert.ok(/escH\(P\.age\)/.test(body),
    "P.age reaches innerHTML unescaped in updateHdr — proven XSS in Phase 9");
  assert.ok(/escH\(String\(P\.sex\)/.test(body) || /escH\(P\.sex/.test(body),
    "P.sex reaches innerHTML unescaped in updateHdr");
});

test("the clinical report escapes age and sex on every surface", () => {
  /* A report is printed, exported and sent onward, so an unescaped field
     here does not stay on this device. */
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "ui-report.js"), "utf8");
  const bad = [];
  src.split("\n").forEach((line, i) => {
    if (!/innerHTML|h \+=/.test(line)) return;
    if (!/P\.(age|sex)\b/.test(line)) return;
    /* every P.age / P.sex occurrence on a markup line must be preceded by an escaper */
    for (const m of line.matchAll(/P\.(age|sex)\b/g)) {
      const before = line.slice(Math.max(0, m.index - 16), m.index);
      if (!/\b(escH|esc)\s*\(\s*(String\(\s*)?$/.test(before) && !/escH\([^)]*$/.test(before)) {
        bad.push((i + 1) + ": " + line.trim().slice(0, 90));
      }
    }
  });
  assert.deepStrictEqual(bad, [],
    "unescaped patient age/sex in the report:\n  " + bad.join("\n  "));
});
