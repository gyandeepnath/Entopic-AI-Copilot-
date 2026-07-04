/* ═══════════════════════════════════════════════════════════════ */
/* ICD-10 MAP VALIDATION                                           */
/* Guards the provisional ICD-10-CM map:                            */
/*   - well-formed ICD-10-CM codes (billable leaf shape, not a bare */
/*     category header)                                              */
/*   - every mapped condition name actually exists in the KB         */
/*   - every entry is flagged for clinical review + carries         */
/*     provenance (nothing silently authoritative)                   */
/*   - all 17 urgent conditions carry a code                         */
/*   - codes propagate onto conditions and into dxList              */
/*                                                                   */
/* Note: authoritative existence/billability was verified against    */
/* ICD-10-CM 2026 via the ICD-10 MCP at authoring time (see each     */
/* entry's `verified`). Offline tests validate shape + wiring.       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createEngine } = require("../tools/lib/load-engine");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

const kb = loadKnowledgeBase();
const ICD_MAP = kb.ICD_MAP;
const byName = new Map(kb.KNOWLEDGE_ALL.map((c) => [c.name, c]));

/* ICD-10-CM: letter, 2 digits, then optionally "." + 1-4 alphanumerics.
   A billable leaf almost always has characters after the category (the
   3-char stem like "H40" is a header, not billable) — except a handful of
   valid 3-char codes. We require either a subcode after "." OR a known
   3-char billable (none in our map today, so require the dot form). */
const ICD_RE = /^[A-TV-Z][0-9][0-9A-Z](\.[0-9A-Z]{1,4})?$/;

test("every ICD entry is well-formed and looks billable (not a bare header)", () => {
  const bad = [];
  for (const [name, e] of Object.entries(ICD_MAP)) {
    if (!ICD_RE.test(e.icd10)) bad.push(`${name}: malformed "${e.icd10}"`);
    /* our defaults are all sub-category leaves → must contain a dot */
    if (e.icd10.indexOf(".") === -1) bad.push(`${name}: "${e.icd10}" is a category header, not billable`);
  }
  assert.deepStrictEqual(bad, []);
});

test("every mapped condition name exists in the knowledge base", () => {
  const orphans = Object.keys(ICD_MAP).filter((n) => !byName.has(n));
  assert.deepStrictEqual(orphans, [], "ICD map references unknown condition names");
});

test("every ICD entry is review-flagged and carries provenance", () => {
  const bad = [];
  for (const [name, e] of Object.entries(ICD_MAP)) {
    if (e.status !== "NEEDS_CLINICAL_REVIEW") bad.push(`${name}: missing NEEDS_CLINICAL_REVIEW`);
    if (!e.verified) bad.push(`${name}: missing verified provenance`);
    if (!e.label) bad.push(`${name}: missing official label`);
  }
  assert.deepStrictEqual(bad, []);
});

test("all urgent-flagged conditions carry an ICD code", () => {
  /* rebuild into a test-realm array — kb.KNOWLEDGE_ALL is cross-realm (vm) */
  const missing = [...kb.KNOWLEDGE_ALL].filter((c) => c.urgent && !c.icd).map((c) => c.name);
  assert.strictEqual(missing.length, 0, "urgent conditions must be codable: " + missing.join(", "));
});

test("every condition in the knowledge base carries an ICD code", () => {
  const missing = [...kb.KNOWLEDGE_ALL].filter((c) => !c.icd).map((c) => c.name);
  assert.strictEqual(missing.length, 0, "conditions still uncoded: " + missing.join(", "));
});

test("codes backfill onto conditions with review status attached", () => {
  const poag = byName.get("Primary Open Angle Glaucoma (POAG)");
  assert.strictEqual(poag.icd, "H40.1190");
  assert.strictEqual(poag.icd_status, "NEEDS_CLINICAL_REVIEW");
});

test("ICD code propagates into the engine's dxList", () => {
  const eng = createEngine();
  const out = eng.runCase({
    symptoms: ["pain_severe", "halos", "nausea_vomiting"],
    iop: { od: "48", os: "16" }
  });
  const top = out.dxList[0];
  assert.ok(top.n.indexOf("Acute Angle Closure") >= 0);
  assert.strictEqual(top.icd, "H40.219", "AACC ICD code reaches the differential entry");
});
