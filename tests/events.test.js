/* ═══════════════════════════════════════════════════════════════ */
/* THE EVENT BUS                                                    */
/*                                                                  */
/* Forty lines, but the storage layer's alerts now depend on it: if */
/* an emit is swallowed, a clinician does not learn that the device */
/* has stopped saving. Worth testing properly.                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Fresh bus per test — handler lists are module state. */
function freshBus() {
  const ctx = { console: { error() {} }, module: { exports: {} } };
  vm.createContext(ctx);
  vm.runInContext(read("js/events.js"), ctx, { filename: "events.js" });
  return ctx;
}

test("a subscriber receives what was emitted", () => {
  const b = freshBus();
  const seen = [];
  b.evOn("thing", (p) => seen.push(p));
  b.evEmit("thing", { a: 1 });
  assert.strictEqual(JSON.stringify(seen), JSON.stringify([{ a: 1 }]));
});

test("emitting to nobody is not an error", () => {
  const b = freshBus();
  assert.strictEqual(b.evEmit("nobody-listening", 1), 0);
});

test("every subscriber runs, in subscription order", () => {
  const b = freshBus();
  const order = [];
  b.evOn("e", () => order.push("first"));
  b.evOn("e", () => order.push("second"));
  assert.strictEqual(b.evEmit("e", null), 2);
  assert.strictEqual(order.join(","), "first,second");
});

test("delivery is synchronous", () => {
  /* Not a style preference. A corrupt-store banner deferred to a microtask is
     a banner the clinician may act before seeing. */
  const b = freshBus();
  let ran = false;
  b.evOn("sync-check", () => { ran = true; });
  b.evEmit("sync-check", null);
  assert.strictEqual(ran, true, "the handler must have run before evEmit returned");
});

test("a throwing subscriber does not stop the others, and does not reach the emitter", () => {
  /* The emitter is usually a save path. A broken banner must never become a
     lost record. */
  const b = freshBus();
  const reached = [];
  b.evOn("boom", () => { throw new Error("handler is broken"); });
  b.evOn("boom", () => reached.push("second ran anyway"));

  assert.doesNotThrow(() => b.evEmit("boom", null),
    "a listener's bug must not propagate into the code that emitted");
  assert.strictEqual(reached.length, 1, "the second handler still ran");
});

test("unsubscribing works, including from inside a handler", () => {
  const b = freshBus();
  const seen = [];
  const off = b.evOn("x", () => { seen.push("a"); off(); });
  b.evOn("x", () => seen.push("b"));

  b.evEmit("x", null);
  b.evEmit("x", null);
  assert.strictEqual(seen.join(","), "a,b,b",
    "a handler that removes itself mid-dispatch must not corrupt the iteration");
});

test("a non-function subscriber is ignored rather than crashing later", () => {
  const b = freshBus();
  b.evOn("y", null);
  b.evOn("y", () => {});
  assert.strictEqual(b.evCount("y"), 1);
  assert.doesNotThrow(() => b.evEmit("y", null));
});


/* ═══ The contract that matters: no event is emitted into the void ═══ */

test("every event emitted in production has at least one subscriber", () => {
  /* Moving from direct calls to events introduces exactly one new failure
     mode, and it is silent: the emitter is renamed or the listener file stops
     being loaded, and the alert simply never appears. Nothing crashes.
     This is the test that catches it. */
  const files = fs.readdirSync(path.join(ROOT, "js"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => "js/" + f);

  const emitted = new Map();   /* event -> file that emits it */
  const heard = new Set();

  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/evEmit\(\s*"([^"]+)"/g)) {
      if (!emitted.has(m[1])) emitted.set(m[1], f);
    }
    for (const m of src.matchAll(/evOn\(\s*"([^"]+)"/g)) heard.add(m[1]);
  }

  assert.ok(emitted.size > 0, "expected production code to emit events");

  const unheard = [...emitted.entries()]
    .filter(([name]) => !heard.has(name))
    .map(([name, f]) => name + "  (emitted by " + f + ")");

  assert.deepStrictEqual(unheard, [],
    "these events are emitted but nothing subscribes to them. An unheard event is a\n" +
    "silent failure — the code runs, nothing breaks, and the user is never told:\n  " +
    unheard.join("\n  "));
});

test("every subscriber is listening for an event something actually emits", () => {
  /* The mirror image: a listener for an event no longer emitted is dead code
     that looks like working safety machinery. */
  const files = fs.readdirSync(path.join(ROOT, "js"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => "js/" + f);

  const emitted = new Set();
  const heard = new Map();

  for (const f of files) {
    const src = read(f);
    for (const m of src.matchAll(/evEmit\(\s*"([^"]+)"/g)) emitted.add(m[1]);
    for (const m of src.matchAll(/evOn\(\s*"([^"]+)"/g)) {
      if (!heard.has(m[1])) heard.set(m[1], f);
    }
  }

  const orphans = [...heard.entries()]
    .filter(([name]) => !emitted.has(name))
    .map(([name, f]) => name + "  (awaited by " + f + ")");

  assert.deepStrictEqual(orphans, [],
    "these subscribers wait for events nothing emits — dead code that looks like\n" +
    "working safety machinery:\n  " + orphans.join("\n  "));
});

test("the banner module is loaded by index.html", () => {
  /* The listeners only exist if the file is loaded. Without this, the previous
     two tests would still pass with the alerts entirely absent from the app. */
  const html = read("index.html");
  assert.ok(/<script src="js\/events\.js">/.test(html), "the bus must be loaded");
  assert.ok(/<script src="js\/ui-storage-banners\.js">/.test(html),
    "the module that renders storage alerts must be loaded, or every alert is silent");

  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/events.js") < order.indexOf("js/ui-storage-banners.js"),
    "events.js must load before anything that subscribes");
  assert.ok(order.indexOf("js/ui-storage-banners.js") < order.indexOf("js/app.js"),
    "the banners must be subscribed before app.js boots, or a problem found during " +
    "boot is discovered with nobody listening");
});
