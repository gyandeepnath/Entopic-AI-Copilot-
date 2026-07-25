/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN SYNONYM INTEGRITY                                          */
/*                                                                  */
/* The founder caught a real risk: two inputs that mean the SAME    */
/* clinical thing mapped to DIFFERENT tokens (e.g. "Watery eyes" vs */
/* "Overflowing tears"), so the differential fragmented on phrasing. */
/* The fix is TOKEN_ALIASES (js/data-model.js): every producer is    */
/* canonicalised, and the KB is authored against canonical tokens.   */
/*                                                                  */
/* These guards keep it that way:                                   */
/*   1. No alias KEY may be consumed by the KB (it must be migrated  */
/*      to its canonical form, or it silently never matches).        */
/*   2. No NEW word-order / plural synonym pair may appear among the */
/*      reachable, KB-consumed vocabulary without being aliased —    */
/*      catching the next "high_iop vs IOP_high" before it ships.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

function loadAliases() {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "data-model.js"), "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src + "\nthis.__A = typeof TOKEN_ALIASES!=='undefined'?TOKEN_ALIASES:{};", sandbox);
  return sandbox.__A;
}

const kb = loadKnowledgeBase();
const REG = kb.TOKEN_REGISTRY || {};
const ALIASES = loadAliases();

/* Tokens the KB actually matches on. */
const consumed = {};
for (const c of kb.KNOWLEDGE_ALL)
  for (const f of ["req", "sup", "con", "temporal", "tests"])
    for (const t of (c[f] || [])) consumed[t] = (consumed[t] || 0) + 1;

test("TOKEN_ALIASES is well-formed (no chains, no self-maps)", () => {
  for (const k in ALIASES) {
    assert.notStrictEqual(k, ALIASES[k], "alias maps to itself: " + k);
    assert.ok(!(ALIASES[k] in ALIASES),
      "alias chain: " + k + " → " + ALIASES[k] + " → " + ALIASES[ALIASES[k]] + " (point directly at the canonical token)");
  }
});

test("no alias KEY is consumed by the KB (all migrated to canonical)", () => {
  const leaked = Object.keys(ALIASES).filter((k) => consumed[k]);
  assert.deepStrictEqual(leaked, [],
    "alias tokens still used in the KB (migrate to canonical):\n" +
    leaked.map((k) => "  " + k + " → " + ALIASES[k] + "  (×" + consumed[k] + ")").join("\n"));
});

test("no un-aliased word-order / plural synonym pair in the matching vocabulary", () => {
  /* Normalise a token to a bag-of-stems so word-order and simple plural/tense
     variants collide; any collision cluster among REACHABLE consumed tokens is
     a candidate synonym split that must be either aliased or consciously kept. */
  const norm = (t) => t.toLowerCase().split(/[_\s]+/).map((w) => w.replace(/(ing|ed|s)$/, "")).sort().join("_");
  const reachable = (t) => REG[t] && REG[t].reachable !== false;
  const groups = {};
  for (const t of Object.keys(consumed)) {
    if (!reachable(t)) continue;
    (groups[norm(t)] = groups[norm(t)] || []).push(t);
  }
  const clusters = Object.values(groups).filter((g) => g.length > 1).map((g) => g.join(" ≈ "));
  assert.deepStrictEqual(clusters, [],
    "synonym-split token clusters (alias them in TOKEN_ALIASES, or rename):\n  " + clusters.join("\n  "));
});
