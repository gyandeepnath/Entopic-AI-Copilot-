/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN REGISTRY VALIDATION                                       */
/* Enforces the Phase 1 invariants (ARCHITECTURE.md §A.1) against   */
/* the generated registry:                                           */
/*   1. the registry file is in sync with the sources (no drift)     */
/*   2. every REQUIRED token is reachable by >= 1 input path         */
/*   3. unreachable supportive/contradicting tokens can only shrink  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const path = require("node:path");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const REPO_ROOT = path.resolve(__dirname, "..");

test("token-registry.js is up to date with the sources", () => {
  /* gen-token-registry --check exits non-zero when the generated file
     no longer matches what the sources produce. */
  execFileSync(process.execPath, [path.join(REPO_ROOT, "tools", "gen-token-registry.js"), "--check"], {
    stdio: "pipe"
  });
});

const kb = loadKnowledgeBase();
const REG = kb.TOKEN_REGISTRY;
const STATS = kb.TOKEN_REGISTRY_STATS;

test("registry loads through the KB loader path", () => {
  assert.ok(REG && Object.keys(REG).length > 0, "TOKEN_REGISTRY present");
  assert.ok(STATS && typeof STATS.total === "number", "TOKEN_REGISTRY_STATS present");
});

test("every REQUIRED token is reachable by at least one input source", () => {
  const offenders = Object.entries(REG)
    .filter(([, e]) => e.usage.req > 0 && !e.reachable)
    .map(([t]) => t);
  assert.deepStrictEqual(offenders, [],
    "required tokens with no producer make their conditions permanently unreachable");
});

test("unreachable supportive/contradicting tokens do not grow (frozen at 70)", () => {
  /* These are evidence tokens that can never accrue — known debt, not yet
     fixed. New KB work must not add more; reducing the number is welcome
     (update the bound downward when it drops). */
  const count = Object.entries(REG)
    .filter(([, e]) => !e.reachable && e.usage.req === 0 &&
      (e.usage.sup > 0 || e.usage.con > 0))
    .length;
  assert.ok(count <= 70, `unreachable sup/con tokens grew to ${count} (bound: 70)`);
});

test("every token the KB matches on (req/sup/con) is declared in the registry", () => {
  const missing = [];
  for (const c of kb.KNOWLEDGE_ALL) {
    for (const f of ["req", "sup", "con"]) {
      for (const t of c[f] || []) {
        if (!REG[t]) missing.push(`${c.name}.${f}: ${t}`);
      }
    }
  }
  assert.deepStrictEqual(missing, [], "undeclared tokens in KB");
});
