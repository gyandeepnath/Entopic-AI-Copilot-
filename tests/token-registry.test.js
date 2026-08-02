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


/* ═══ Naming convention (Phase 3 knowledge audit) ═══ */

test("no token uses a space or a hyphen", () => {
  /* Zero do today. Either would break the token as a stable machine
     identifier and would not survive a future graph or terminology binding. */
  const { loadKnowledgeBase } = require("../tools/lib/load-kb");
  const K = loadKnowledgeBase();
  const list = Array.isArray(K) ? K : (K.KNOWLEDGE_ALL || []);
  const bad = new Set();
  list.forEach((c) => ["req", "sup", "con", "temporal", "tests", "exclusions"]
    .forEach((k) => (c[k] || []).forEach((t) => { if (/[\s-]/.test(t)) bad.add(t); })));
  assert.deepStrictEqual([...bad], [],
    "tokens must be machine-safe identifiers:\n  " + [...bad].join("\n  "));
});

test("uppercase appears only in the documented clinical abbreviations", () => {
  /* The convention is lower_snake_case, with capitals kept ONLY for an
     established clinical abbreviation — RAPD is not rapd to a clinician. This
     list is closed: a new uppercase token is either an abbreviation that
     belongs here, or a mistake. Documented in tools/gen-token-registry.js. */
  const ALLOWED = new Set([
    "TBUT_reduced", "RAPD_positive", "CNVM", "OCT_edema", "MLF_lesion_sign",
    "NPC_receded", "reduced_PFV", "high_ACA_ratio", "RNFL_thinning",
    "gonioscopy_NVA", "stellate_KPs", "B_scan_ultrasound", "CT_orbits_imaging"
  ]);
  const { loadKnowledgeBase } = require("../tools/lib/load-kb");
  const K = loadKnowledgeBase();
  const list = Array.isArray(K) ? K : (K.KNOWLEDGE_ALL || []);
  const found = new Set();
  list.forEach((c) => ["req", "sup", "con", "temporal", "tests", "exclusions"]
    .forEach((k) => (c[k] || []).forEach((t) => { if (/[A-Z]/.test(t)) found.add(t); })));

  const unexpected = [...found].filter((t) => !ALLOWED.has(t));
  assert.deepStrictEqual(unexpected, [],
    "new uppercase token(s). If this is a real clinical abbreviation, add it to\n" +
    "the list here AND to the convention block in tools/gen-token-registry.js.\n" +
    "Otherwise use lower_snake_case:\n  " + unexpected.join("\n  "));
});

test("the naming convention is written down where an author would look", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const gen = fs.readFileSync(
    path.resolve(__dirname, "..", "tools/gen-token-registry.js"), "utf8");
  assert.ok(/NAMING CONVENTION/.test(gen),
    "the convention must live in the GENERATOR — the registry itself is " +
    "regenerated and would lose a hand-added comment");
});
