/* ═══════════════════════════════════════════════════════════════ */
/* GENERATED-PATTERN CONTRACTS                                     */
/*                                                                  */
/* Entopic has no build step: modules are ordered <script> tags     */
/* sharing one global scope. Because a missing global is a          */
/* ReferenceError, sessions defensively wrote                       */
/*                                                                  */
/*     if (typeof doThing === "function") doThing(x);               */
/*                                                                  */
/* 450 times across 186 distinct names. That guard is correct when  */
/* the dependency really is optional. It is a silent bug when the   */
/* dependency is required, because a rename, a deleted function or  */
/* a wrong <script> order turns the call into a no-op that logs     */
/* nothing and fails no test. Two real defects in this repo were    */
/* exactly that: escaping that stopped escaping (stored XSS), and   */
/* a session token read back as ciphertext.                         */
/*                                                                  */
/* This file makes the pattern safe without deleting 450 guards:    */
/* every guarded name must resolve to something in the load path,   */
/* so a rename or deletion turns a silent no-op into a red test.    */
/*                                                                  */
/* It also pins the two shared primitives that had drifted into     */
/* multiple copies — HTML escaping and file download — to exactly   */
/* one implementation each.                                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

const SCRIPTS = [...html.matchAll(/<script\s+src="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => s.endsWith(".js"));

/* Comments contain example code (and documentation of these very patterns),
   so they must not count as definitions or as guards. */
function stripComments(s) {
  return s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

const SOURCE = SCRIPTS.map((s) => ({
  file: s,
  base: path.basename(s),
  code: stripComments(fs.readFileSync(path.join(ROOT, s), "utf8"))
}));

/* Host globals. Guarding these is legitimate: they genuinely vary by browser,
   by file:// vs https://, and between the browser and the Node test sandbox. */
const HOST_GLOBALS = new Set([
  "alert", "confirm", "prompt", "fetch", "atob", "btoa",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame",
  "structuredClone", "queueMicrotask", "reportError",
  /* Browser APIs that are legitimately feature-detected because an older or
     restricted environment may not have them. MutationObserver drives the
     accessibility bridge (js/ui-a11y.js); without it the page still works,
     it simply does not re-wire controls added after load. */
  "MutationObserver", "IntersectionObserver", "ResizeObserver"
]);

/* Every name defined at global scope anywhere in the load path. */
function globalDefinitions() {
  const defined = new Set();
  for (const { code } of SOURCE) {
    for (const m of code.matchAll(/^\s*function\s+([A-Za-z0-9_$]+)/gm)) defined.add(m[1]);
    for (const m of code.matchAll(/^\s*(?:var|let|const)\s+([A-Za-z0-9_$]+)\s*=/gm)) defined.add(m[1]);
    for (const m of code.matchAll(/window\.([A-Za-z0-9_$]+)\s*=/g)) defined.add(m[1]);
  }
  return defined;
}

/* Parameter names declared anywhere in a file. condition-info.js deliberately
   takes its collaborators as arguments (findCond, prettify) so it stays
   dependency-free — that is the GOOD pattern and must not be flagged. */
function parameterNames(code) {
  const names = new Set();
  for (const m of code.matchAll(/function\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/g)) {
    m[1].split(",").forEach((p) => {
      const n = p.trim();
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n)) names.add(n);
    });
  }
  return names;
}

test("every typeof-function guard names something that exists", () => {
  const defined = globalDefinitions();
  const offenders = [];

  for (const { base, code } of SOURCE) {
    const params = parameterNames(code);
    for (const m of code.matchAll(/typeof\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*===\s*"function"/g)) {
      const name = m[1];
      if (HOST_GLOBALS.has(name) || defined.has(name) || params.has(name)) continue;
      offenders.push(name + "  guarded in " + base);
    }
  }

  assert.deepStrictEqual(
    [...new Set(offenders)].sort(), [],
    "these guards can never be true, so the call they protect is a silent no-op.\n" +
    "Either the function was renamed/deleted, or its <script> is missing:\n  " +
    [...new Set(offenders)].sort().join("\n  ")
  );
});

test("HTML escaping has exactly one implementation", () => {
  /* R-1 was a stored-XSS hole caused by two escaping helpers, one of which
     silently fell back to identity. There is now one: escHtml in dom-escape.js.
     Every other esc* is a one-line delegate to it. */
  const impls = [];
  for (const { base, code } of SOURCE) {
    for (const m of code.matchAll(/function\s+(esc[A-Za-z0-9_$]*)\s*\(([^)]*)\)\s*\{([\s\S]{0,200}?)\n\s*\}/g)) {
      const body = m[3];
      const delegates = /\bescHtml\s*\(|\bescAttrJs\s*\(/.test(body);
      const isCanonical = base === "dom-escape.js";
      if (!delegates && !isCanonical) impls.push(base + ": " + m[1] + "()");
    }
  }
  assert.deepStrictEqual(
    impls, [],
    "escaping helpers that do NOT delegate to dom-escape.js — a second, drifting\n" +
    "implementation is how R-1 (stored XSS) happened:\n  " + impls.join("\n  ")
  );
});

test("file download has exactly one implementation", () => {
  /* Four copies had drifted (different revoke timing, one never attached the
     anchor, only one logged the audit entry). dlSaveAs in browser-io.js is it. */
  const offenders = [];
  for (const { base, code } of SOURCE) {
    if (base === "browser-io.js") continue;
    if (/\.download\s*=/.test(code)) offenders.push(base);
  }
  assert.deepStrictEqual(
    [...new Set(offenders)], [],
    "these modules build their own download anchor instead of calling dlSaveAs():\n  " +
    [...new Set(offenders)].join("\n  ")
  );
});

test("browser-io is loaded before anything that uses it", () => {
  const order = SCRIPTS.map((s) => path.basename(s));
  const io = order.indexOf("browser-io.js");
  assert.ok(io >= 0, "js/browser-io.js is not loaded by index.html");

  const users = SOURCE
    .filter(({ code }) => /\b(lsSet|lsGet|lsRemove|dlSaveAs)\s*\(/.test(code))
    .map(({ base }) => base)
    .filter((b) => b !== "browser-io.js");

  const tooEarly = users.filter((b) => order.indexOf(b) < io);
  assert.deepStrictEqual(
    tooEarly, [],
    "these load before browser-io.js but call its helpers:\n  " + tooEarly.join("\n  ")
  );
});
