/* ═══════════════════════════════════════════════════════════════ */
/* SHARED SCAFFOLDING FOR THE STRESS HARNESSES                      */
/*                                                                  */
/* attack.js grew its own copy of the queue, the scoreboard and the  */
/* fake browser. A second and third harness copying that again      */
/* would be three places to fix a sandbox bug, and a sandbox bug     */
/* makes attacks pass for the wrong reason — the one failure mode a  */
/* stress harness must not have. So it lives here once.             */
/*                                                                  */
/* Same rules as attack.js:                                          */
/*   1. Attack the REAL modules; mock only the browser around them.  */
/*   2. Assert what MUST hold, never what currently does.            */
/*   3. Crashing on garbage is acceptable. Silent wrong answers are  */
/*      not.                                                         */
/*   4. No invented clinical values.                                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..", "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function makeHarness(argv) {
  const ONLY = ((argv || []).find((a) => a.startsWith("--only=")) || "").slice(7);
  let held = 0;
  const broke = [];
  const QUEUE = [];

  const G = (name) => QUEUE.push({ header: name });
  function attack(name, fn) {
    if (ONLY && name.indexOf(ONLY) < 0) return;
    QUEUE.push({ name, fn });
  }

  async function runAll(title) {
    let group = "";
    for (const item of QUEUE) {
      if (item.header) {
        group = item.header;
        console.log("\n── " + group + " " + "─".repeat(Math.max(0, 62 - group.length)));
        continue;
      }
      try {
        await item.fn();
        held++;
        console.log("  held    " + item.name);
      } catch (e) {
        broke.push({ group, name: item.name, why: (e && e.message) || String(e) });
        console.log("  BROKE   " + item.name + "\n            " + ((e && e.message) || e));
      }
    }
    const line = "═".repeat(66);
    console.log("\n" + line);
    console.log((title ? title + " — " : "") + "held: " + held + "    BROKE: " + broke.length);
    console.log(line);
    if (broke.length) {
      for (const b of broke) console.log("  · [" + b.group + "] " + b.name + "\n      " + b.why);
    }
    return broke.length;
  }

  return { G, attack, runAll, get broke() { return broke; } };
}

function must(cond, why) { if (!cond) throw new Error(why); }
function mustEqual(a, b, why) {
  if (a !== b) throw new Error(why + " (got " + JSON.stringify(a) + ", wanted " + JSON.stringify(b) + ")");
}
function mustThrow(fn, why) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(why);
}

/* A hostile-but-honest browser. `budget` makes localStorage throw a real
   QuotaExceededError past N bytes — the failure a clinic actually hits. */
function browser(opts) {
  opts = opts || {};
  const mem = {};
  const audits = [], events = [], errors = [];
  let budget = opts.budget || Infinity;

  function used() {
    let n = 0;
    for (const k in mem) n += k.length + mem[k].length;
    return n;
  }
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => {
      v = String(v);
      const after = used() - (mem[k] ? mem[k].length : 0) + v.length;
      if (after > budget) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
      mem[k] = v;
    },
    removeItem: (k) => { delete mem[k]; }
  };

  const ctx = Object.assign({
    localStorage: ls, sessionStorage: ls,
    _mem: mem, _audits: audits, _events: events, _errors: errors,
    _setBudget: (n) => { budget = n; },
    console: { log() {}, warn() {}, info() {}, error(...a) { errors.push(a.join(" ")); } },
    /* DELIBERATELY NOT injecting Object/JSON/Array/… from the host realm.
       A vm context already has its own standard built-ins, and injecting the
       host's breaks realm identity: an object literal created INSIDE the
       sandbox inherits the sandbox realm's Object.prototype, while the
       injected `Object.prototype` belongs to the host. Polluting the latter
       then leaves `{}` untouched, so every prototype-pollution attack passes
       while proving nothing. Measured:

         injected host Object : ({}).PWN === 1  ->  false   (attack is vacuous)
         native realm         : ({}).PWN === 1  ->  true    (attack is real)

       Only genuinely non-standard globals are supplied below — the things a
       bare vm context does NOT have. */
    TextEncoder, TextDecoder, btoa, atob, structuredClone,
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    queueMicrotask: (fn) => { try { fn(); } catch (e) {} },
    module: { exports: {} },
    logAudit: (a, d) => audits.push({ a, d }),
    evEmit: (n, p) => events.push([n, p]),
    lsSet: (k, v) => { try { ls.setItem(k, v); return true; } catch (e) { return false; } },
    alert: () => {}, confirm: () => true, prompt: () => null,
    crypto: (typeof globalThis.crypto !== "undefined") ? globalThis.crypto : undefined,
    performance: { now: () => Date.now() }
  }, opts.extra || {});
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);

  const files = (opts.base === false ? [] : ["js/data-classification.js", "js/storage.js"])
    .concat(opts.also || []);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  if (opts.base !== false) {
    /* storage.js declares its own logAudit, shadowing the stub above. Put the
       capturing one back or every audit assertion silently passes. */
    vm.runInContext("logAudit = function (a, d) { _audits.push({ a: a, d: d }); };", ctx);
  }
  ctx.run = (expr) => vm.runInContext(expr, ctx);
  ctx.load = (f) => vm.runInContext(read(f), ctx, { filename: f });
  return ctx;
}

module.exports = { ROOT, read, makeHarness, must, mustEqual, mustThrow, browser };
