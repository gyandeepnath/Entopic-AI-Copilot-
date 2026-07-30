/* ═══════════════════════════════════════════════════════════════ */
/* HTML ESCAPING — one implementation, no drifting copies           */
/*                                                                  */
/* Background (architecture review, 2026-07-30): seven UI modules    */
/* each carried their own `(typeof escH === "function") ? escH :     */
/* fallback` alias. Because escH lives in app.js — loaded LAST —     */
/* the check was always false and every module permanently bound a   */
/* fallback that did NOT escape the double quote. Those modules      */
/* interpolate knowledge-base names into HTML attributes, so a       */
/* condition name containing a quote injected a live event handler   */
/* (reproduced in a browser). Duplication did not just repeat an     */
/* abstraction — it silently replaced the correct one.               */
/*                                                                  */
/* These tests pin the behaviour AND the structural property that    */
/* prevents the pattern returning.                                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const { escHtml, escAttrJs } = require("../js/dom-escape.js");

test("escHtml escapes every character that can break out of markup or an attribute", () => {
  assert.strictEqual(escHtml('<script>'), "&lt;script&gt;");
  assert.strictEqual(escHtml('a & b'), "a &amp; b");
  assert.strictEqual(escHtml('say "hi"'), "say &quot;hi&quot;");
  /* the exact payload that injected a live handler before the fix */
  const attack = 'Name" onmouseover="steal()" x="';
  assert.ok(!/[^&]"/.test(escHtml(attack).replace(/&quot;/g, "")),
    "no bare double quote survives — an attribute cannot be broken out of");
});

test("escHtml handles null, undefined and non-strings without throwing or dropping data", () => {
  assert.strictEqual(escHtml(null), "");
  assert.strictEqual(escHtml(undefined), "");
  assert.strictEqual(escHtml(0), "0", "0 must not vanish — the old escH returned '' for it");
  assert.strictEqual(escHtml(false), "false");
  assert.strictEqual(escHtml(42), "42");
});

test("escHtml escapes the ampersand FIRST, so escapes are not double-escaped", () => {
  assert.strictEqual(escHtml("&lt;"), "&amp;lt;",
    "already-escaped input is escaped once more, not mangled into &lt;lt;");
});

test("escHtml deliberately leaves the single quote alone", () => {
  /* Documented decision: call sites build onclick="fn('…')" and do their own
     JS-string escaping. Emitting &#39; here would be decoded by the HTML
     parser before JS saw it, turning a defence into a new injection. */
  assert.strictEqual(escHtml("it's"), "it's");
});

test("escAttrJs makes a value safe inside onclick=\"fn('…')\"", () => {
  assert.strictEqual(escAttrJs("it's"), "it\\'s", "the JS string delimiter is escaped");
  assert.strictEqual(escAttrJs('a"b'), "a&quot;b", "the HTML attribute delimiter is escaped");
  assert.strictEqual(escAttrJs("back\\slash"), "back\\\\slash", "backslash escaped before the quote");
  /* order matters: escaping HTML first would then escape our own backslashes */
  assert.strictEqual(escAttrJs("x'\\"), "x\\'\\\\");
});


/* ── the structural guard ─────────────────────────────────────────
   This is the test that actually stops the bug recurring: no module may
   define its own escaping fallback again. */
test("no module carries a private HTML-escaping fallback", () => {
  const dir = path.resolve(__dirname, "..", "js");
  const offenders = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".js"))) {
    if (f === "dom-escape.js") continue;                 /* the one canonical home */
    const src = fs.readFileSync(path.join(dir, f), "utf8");
    /* a local re-implementation of the escape rules */
    if (/replace\(\s*\/&\/g\s*,\s*["']&amp;["']\s*\)/.test(src)) offenders.push(f);
    /* the load-order-fragile alias that caused the original bug */
    if (/typeof\s+escH\s*===\s*["']function["']\s*\)\s*\?\s*escH\s*:/.test(src)) offenders.push(f + " (escH fallback alias)");
  }
  assert.deepStrictEqual(offenders, [],
    "escaping must live only in js/dom-escape.js — a private copy WILL drift from it and weaken silently");
});

test("dom-escape.js is loaded before every module that renders text", () => {
  const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
  const order = [...html.matchAll(/<script src="js\/([^"]+)"><\/script>/g)].map((m) => m[1]);
  const idx = order.indexOf("dom-escape.js");
  assert.ok(idx >= 0, "dom-escape.js is loaded");
  assert.strictEqual(idx, 0,
    "it must be the FIRST js module — anything loaded earlier could capture it before it exists, " +
    "which is precisely the failure mode this replaced");
});
