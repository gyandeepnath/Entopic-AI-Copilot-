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
