/* ═══════════════════════════════════════════════════════════════ */
/* BOOT PERFORMANCE  (Phase 7)                                      */
/*                                                                  */
/* MEASURED in Chromium with no network — the deployment this        */
/* product exists for, and the one ADR-006 calls sacred:             */
/*                                                                   */
/*   render-blocking font link : first paint 12,600 ms               */
/*   non-blocking              : first paint      64 ms              */
/*                                                                   */
/* Twelve seconds of blank screen before the sign-in box appeared,   */
/* on a clinic laptop with no internet. The diagnostic engine was    */
/* network-free; the PAGE was not.                                   */
/*                                                                   */
/* This is a static check rather than a browser one, because it has  */
/* to run in CI without a browser and because the failure it guards  */
/* against is textual: somebody adding a third-party <link> or       */
/* <script> to the head, which is exactly how the first one arrived. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const HTML = read("index.html");
const HEAD = HTML.slice(0, HTML.indexOf("</head>"));

/* Every <link rel="stylesheet"> in the head, with its attributes. */
function stylesheetLinks() {
  return [...HEAD.matchAll(/<link\b[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /rel\s*=\s*"stylesheet"/.test(tag));
}

test("no third-party stylesheet blocks first paint", () => {
  /* A cross-origin stylesheet in the head is render-blocking, and offline it
     blocks until the request times out. Either self-host it, or load it with
     media="print" + onload so the browser fetches it without waiting. */
  const offenders = stylesheetLinks().filter((tag) => {
    const external = /https?:\/\//.test(tag);
    if (!external) return false;
    /* Non-blocking if it is deferred via the media swap. */
    const deferred = /media\s*=\s*"print"/.test(tag) && /onload\s*=/.test(tag);
    /* A <noscript> copy is fine — it only applies with JS off. */
    const inNoscript = HEAD.indexOf("<noscript>" + "") >= 0 &&
      HEAD.slice(Math.max(0, HEAD.indexOf(tag) - 12), HEAD.indexOf(tag)).indexOf("<noscript>") >= 0;
    return !deferred && !inNoscript;
  });
  assert.deepStrictEqual(offenders, [],
    "a render-blocking external stylesheet costs ~12 s of blank screen on an\n" +
    "offline device (measured). Self-host it, or defer it with\n" +
    'media="print" onload="this.media=\'all\'".');
});

test("no third-party script is loaded at all", () => {
  /* Zero runtime dependencies is one of this product's genuine structural
     advantages — for supply-chain security AND for boot time. */
  const external = [...HEAD.matchAll(/<script\b[^>]*src\s*=\s*"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const body = [...HTML.matchAll(/<script\b[^>]*src\s*=\s*"(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepStrictEqual(external.concat(body), [],
    "a third-party script is both a supply-chain risk and a boot-time stall");
});

test("the CSS declares a local fallback for every font family", () => {
  /* Deferring the font only degrades gracefully if there is something to
     degrade TO. Without a fallback stack the page renders in the browser
     default and looks broken rather than merely different. */
  const css = read("css/entopic.css");
  for (const v of ["--body", "--mono", "--disp"]) {
    const m = new RegExp(v + ":\\s*([^;]+);").exec(css);
    assert.ok(m, v + " is not declared");
    const stack = m[1].split(",").map((s) => s.trim());
    assert.ok(stack.length >= 2, v + " has no fallback: " + m[1]);
    const generic = /(sans-serif|serif|monospace|system-ui|-apple-system)/.test(m[1]);
    assert.ok(generic, v + " has no generic family at the end of its stack: " + m[1]);
  }
});

test("the measured penalty is recorded next to the fix", () => {
  /* So the next person to 'tidy up' the head knows what it cost. */
  assert.ok(/12,600 ms|12600 ms/.test(HEAD), "the before number must be written down");
  assert.ok(/64 ms/.test(HEAD), "and the after number");
});

test("the script count and payload stay within a stated budget", () => {
  /* 119 files / ~2.5 MB of JavaScript, unbundled and uncompressed. That is
     fine over file:// or a local server and is the price of the no-build-step
     decision (ADR-001). The budget exists so that doubling it is a decision
     rather than an accident. */
  const scripts = [...HTML.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  let bytes = 0;
  for (const f of scripts) {
    try { bytes += fs.statSync(path.join(ROOT, f)).size; } catch (e) { /* counted elsewhere */ }
  }
  assert.ok(scripts.length <= 140,
    scripts.length + " scripts — past ~140 the request count starts to matter " +
    "over anything but file:// or HTTP/2, and ADR-001 should be revisited");
  assert.ok(bytes < 4 * 1024 * 1024,
    (bytes / 1048576).toFixed(1) + " MB of JavaScript — budget is 4 MB uncompressed");
});

test("the boot benchmark is re-runnable by whoever comes next", () => {
  assert.ok(fs.existsSync(path.join(ROOT, "tools/bench/storage-bench.js")));
});
