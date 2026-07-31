/* ═══════════════════════════════════════════════════════════════ */
/* ERROR BOUNDARY — the safety net, tested                          */
/*                                                                  */
/* This file is what stands between a thrown exception mid-exam and  */
/* a blank panel with a clinician mid-consultation. Nothing verified */
/* that it catches anything.                                         */
/*                                                                  */
/* Three properties matter, in this order:                           */
/*                                                                  */
/*  1. IT MUST NEVER THROW. A safety net that fails takes the app    */
/*     down with it, and does so at the worst possible moment.       */
/*  2. THE CLINICIAN'S DATA MUST SURVIVE. The boundary reports and   */
/*     recovers; it never discards the working copy.                 */
/*  3. IT MUST NOT LEAK PATIENT DATA. Error messages routinely       */
/*     contain the values that caused them. Those go to the audit    */
/*     trail, which is exported in backups — so an unfiltered        */
/*     message writes PHI somewhere it was never meant to be.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* A window with the renderers the boundary wraps, plus a recording audit log. */
function app(opts) {
  opts = opts || {};
  const audit = [];
  const listeners = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, Error,
    __audit: audit,
    __listeners: listeners,
    __rendered: [],
    logAudit: (kind, msg) => { audit.push({ kind, msg }); },
    escHtml: (s) => String(s === null || s === undefined ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  };
  ctx.window = ctx;
  ctx.window.addEventListener = (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); };

  /* Renderers, installed before the boundary loads (as in index.html, where
     error-boundary.js is last). */
  ctx.renderMain = opts.renderMainThrows
    ? function () { throw new Error(opts.renderMainThrows); }
    : function () { ctx.__rendered.push("main"); return "main-ok"; };
  ctx.renderAdvisory = function () { ctx.__rendered.push("advisory"); return "adv-ok"; };
  ctx.renderSidebar = function () { throw new Error("sidebar boom"); };

  if (!opts.noDocument) {
    const nodes = {};
    ctx.document = {
      body: { appendChild(el) { nodes[el.id] = el; } },
      getElementById: (id) => nodes[id] || null,
      createElement: () => ({ style: {}, setAttribute() {}, innerHTML: "", id: "" })
    };
    ctx.__nodes = nodes;
  }
  vm.createContext(ctx);
  vm.runInContext(read("js/error-boundary.js"), ctx, { filename: "error-boundary.js" });
  return ctx;
}
const run = (ctx, expr, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(expr, ctx); };


/* ═══ 1. It must never throw ═══ */

test("safeCall returns the value on the happy path and changes nothing", () => {
  const ctx = app();
  assert.strictEqual(run(ctx, "safeCall(function () { return 42; }, 'x')"), 42);
  assert.strictEqual(run(ctx, "errRecent().length"), 0, "a success must not be logged as a fault");
});

test("safeCall swallows a throw and returns the fallback", () => {
  const ctx = app();
  const out = run(ctx, "safeCall(function () { throw new Error('boom'); }, 'renderX', 'FALLBACK')");
  assert.strictEqual(out, "FALLBACK", "the caller gets something usable instead of an exception");
  const log = run(ctx, "errRecent()");
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].where, "renderX", "the fault names where it happened");
  assert.ok(/boom/.test(log[0].message));
});

test("the boundary survives being handed things that are not Errors", () => {
  /* Real throws include strings, undefined and objects — a boundary that
     assumes err.message crashes on exactly the unusual failure it exists for. */
  const ctx = app();
  for (const thrown of ["'a string'", "undefined", "null", "{code:500}", "42"]) {
    assert.doesNotThrow(
      () => run(ctx, "safeCall(function () { throw " + thrown + "; }, 'w')"),
      "threw while handling: " + thrown
    );
  }
  assert.strictEqual(run(ctx, "errRecent().length"), 5, "and each was still recorded");
  assert.ok(run(ctx, "errRecent()").every((e) => typeof e.message === "string"),
    "every entry has a string message, whatever was thrown");
});

test("the boundary still works when there is no document at all", () => {
  /* Node, a worker, or a teardown mid-unload. Recording must not depend on
     being able to draw a banner. */
  const ctx = app({ noDocument: true });
  assert.doesNotThrow(() => run(ctx, "safeCall(function () { throw new Error('x'); }, 'w')"));
  assert.strictEqual(run(ctx, "errRecent().length"), 1, "the fault is still recorded");
});

test("a failure inside logAudit does not break error recording", () => {
  /* The audit trail is the thing most likely to be broken when the app is
     already in trouble (a full or damaged store). */
  const ctx = app();
  ctx.logAudit = () => { throw new Error("audit store is damaged"); };
  assert.doesNotThrow(() => run(ctx, "safeCall(function () { throw new Error('inner'); }, 'w')"));
  assert.strictEqual(run(ctx, "errRecent().length"), 1);
});


/* ═══ 2. Renderers are wrapped, and data survives ═══ */

test("a throwing renderer is caught and does not propagate", () => {
  const ctx = app({ renderMainThrows: "render exploded" });
  assert.doesNotThrow(() => run(ctx, "renderMain()"),
    "one bad panel must not take down the caller that triggered the redraw");
  const log = run(ctx, "errRecent()");
  assert.strictEqual(log[0].where, "renderMain", "attributed to the renderer that failed");
});

test("a healthy renderer keeps working and keeps its return value", () => {
  const ctx = app();
  assert.strictEqual(run(ctx, "renderAdvisory()"), "adv-ok",
    "wrapping must be transparent on the happy path");
  assert.strictEqual(run(ctx, "errRecent().length"), 0);
});

test("one broken panel does not stop the others rendering", () => {
  /* The cascade this file exists to prevent: the sidebar throws, and the
     clinician loses the exam panel too. */
  const ctx = app();
  run(ctx, "renderSidebar()");                       /* throws internally */
  assert.strictEqual(run(ctx, "renderAdvisory()"), "adv-ok", "the advisory panel still draws");
  assert.strictEqual(run(ctx, "renderMain()"), "main-ok", "and so does the exam panel");
});

test("the working copy is never touched by the boundary", () => {
  /* CLAUDE.md: the clinician's data survives the error. */
  const src = read("js/error-boundary.js");
  assert.ok(!/\bV\s*=/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
    "the boundary must never assign to V — a recovery that discards the exam " +
    "is worse than the error it is recovering from");
  assert.ok(!/\bP\s*=[^=]/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
    "nor to P");
});

test("global handlers are installed for both error and unhandledrejection", () => {
  const ctx = app();
  assert.ok(ctx.__listeners.error && ctx.__listeners.error.length,
    "async failures in timers and callbacks bypass the render wrappers");
  assert.ok(ctx.__listeners.unhandledrejection && ctx.__listeners.unhandledrejection.length,
    "a rejected promise is the most common async failure in this codebase");
});

test("a routine network rejection is logged but does not raise a banner", () => {
  /* Offline-first: a failed optional fetch is expected, not a fault. Crying
     wolf on it would train the clinician to ignore the banner that matters. */
  const ctx = app();
  const before = run(ctx, "errRecent().length");
  ctx.__listeners.unhandledrejection[0]({ reason: new Error("Failed to fetch") });
  assert.strictEqual(run(ctx, "errRecent().length"), before + 1, "still recorded for diagnosis");
  assert.ok(!ctx.__nodes.errBoundaryBanner, "but no banner for an expected offline failure");
});

test("a genuine rejection does raise the banner", () => {
  const ctx = app();
  ctx.__listeners.unhandledrejection[0]({ reason: new Error("cannot read property of undefined") });
  assert.ok(ctx.__nodes.errBoundaryBanner, "a real fault must be visible");
});


/* ═══ 3. The log is bounded, and must not carry PHI ═══ */

test("the fault log is bounded and keeps the most recent", () => {
  /* Unbounded, a render loop failing every frame would exhaust memory during
     a consultation. */
  const ctx = app();
  for (let i = 0; i < 60; i++) run(ctx, "errRecord('w', new Error('e" + i + "'))");
  const log = run(ctx, "errRecent()");
  assert.strictEqual(log.length, 25, "capped at ERR_LOG_MAX");
  assert.ok(/e59/.test(log[0].message), "newest first — the fault being diagnosed now");
  assert.ok(log.every((e) => !/e0\b/.test(e.message)), "the oldest were dropped");
});

test("patient data in an error message never reaches the audit trail", () => {
  /* Error messages routinely quote the value that caused them, and in this app
     that value is a patient record. logAudit writes to the audit store, which
     is exported in every backup — so an unfiltered message copies PHI into a
     file that travels. */
  const ctx = app();
  run(ctx, "errRecord('parseVisit', new Error(" +
    JSON.stringify('Unexpected token in {"first_name":"Meera","last_name":"Nair","dob":"1978-04-02","mrn":"MRN-4471"}') +
    "))");

  const written = ctx.__audit.map((a) => a.msg).join(" ");
  for (const leak of ["Meera", "Nair", "1978-04-02", "MRN-4471"]) {
    assert.ok(written.indexOf(leak) === -1,
      "the audit trail must not contain '" + leak + "' — it is exported with every backup.\n" +
      "Audit line was: " + written);
  }
  assert.ok(/parseVisit/.test(written), "but it must still say WHERE the fault was");
});

test("the in-memory log is also scrubbed, since the admin panel shows it", () => {
  const ctx = app();
  run(ctx, "errRecord('w', new Error('failed on patient Meera Nair mrn MRN-4471'))");
  const shown = JSON.stringify(run(ctx, "errRecent()"));
  assert.ok(shown.indexOf("MRN-4471") === -1,
    "an MRN must not be readable in the admin fault list");
});

test("the banner escapes through the shared escaper, not a private one", () => {
  /* A local replace(/[<>&]/g,"") is a second escaping implementation, which is
     exactly how the stored-XSS hole (R-1) happened. */
  const src = read("js/error-boundary.js").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/replace\(\/\[<>&\]\/g/.test(src),
    "error-boundary must not carry its own escaping — use escHtml from dom-escape.js");
  assert.ok(/escHtml\(/.test(src), "and it must actually call the shared escaper");
});
