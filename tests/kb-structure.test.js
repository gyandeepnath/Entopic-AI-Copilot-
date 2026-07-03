/* ═══════════════════════════════════════════════════════════════ */
/* KB STRUCTURE TESTS                                              */
/* Regression net for the knowledge base. Freezes the current       */
/* shape/counts so later KB or engine changes can't silently drop   */
/* conditions or corrupt structure. Run: `npm test`.                */
/*                                                                  */
/* These are structural invariants only — clinical-content and      */
/* golden-vignette engine tests come next (see CHANGELOG).          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const kb = loadKnowledgeBase();
const ALL = kb.KNOWLEDGE_ALL;

test("knowledge base loads", () => {
  assert.ok(Array.isArray(ALL), "KNOWLEDGE_ALL should be an array");
  assert.ok(ALL.length > 0, "KNOWLEDGE_ALL should be non-empty");
});

test("current counts are frozen (guard against silent drops)", () => {
  assert.strictEqual(ALL.length, 130, "expected 130 conditions");
  assert.strictEqual(Object.keys(kb.KNOWLEDGE_DOMAINS).length, 9, "expected 9 domains");
  const urgent = ALL.filter((c) => c.urgent).length;
  assert.strictEqual(urgent, 17, "expected 17 urgent-flagged conditions");
});

test("every condition is structurally well-formed", () => {
  for (const c of ALL) {
    assert.ok(typeof c.name === "string" && c.name.length > 0, `condition missing name: ${JSON.stringify(c)}`);
    assert.ok(typeof c.route === "string" && c.route.length > 0, `${c.name}: missing route`);
    for (const f of ["req", "sup", "con", "temporal", "tests", "exclusions"]) {
      assert.ok(Array.isArray(c[f]), `${c.name}: field ${f} should be an array`);
      for (const t of c[f]) {
        assert.strictEqual(typeof t, "string", `${c.name}.${f}: token should be a string`);
      }
    }
  }
});

test("condition names are unique", () => {
  const seen = new Set();
  for (const c of ALL) {
    assert.ok(!seen.has(c.name), `duplicate condition name: ${c.name}`);
    seen.add(c.name);
  }
});

test("tokens have no leading/trailing whitespace or spaces (collision guard)", () => {
  const offenders = [];
  for (const c of ALL) {
    for (const f of ["req", "sup", "con"]) {
      for (const t of c[f]) {
        if (t !== t.trim() || /\s/.test(t)) offenders.push(`${c.name}.${f}: "${t}"`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [], "tokens should be whitespace-free snake_case");
});

test("token layers are present and non-empty", () => {
  assert.ok(kb.TOKEN_DICTIONARY && Object.keys(kb.TOKEN_DICTIONARY).length > 0, "TOKEN_DICTIONARY present");
  assert.ok(kb.FINDING_TOKEN_MAP && Object.keys(kb.FINDING_TOKEN_MAP).length > 0, "FINDING_TOKEN_MAP present");
});
