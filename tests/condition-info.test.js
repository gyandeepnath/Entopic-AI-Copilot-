/* ═══════════════════════════════════════════════════════════════ */
/* CONDITION-INFO INTEGRITY                                         */
/* The "About this condition" toggle reads knowledge/condition-info. */
/* These guards keep that reference content honest and wired:        */
/*   1. every key matches a REAL condition name (a typo'd key would   */
/*      silently never display);                                     */
/*   2. every entry has the required shape (summary + facts + review);*/
/*   3. provisional entries are flagged (review:true) so the UI can   */
/*      show the "pending clinician verification" badge — nothing     */
/*      unverified is presented as settled fact;                     */
/*   4. no invented quantitative claims leak in (no %/ratio/mmHg/     */
/*      dose figures) — the no-fabrication guardrail for AI-authored  */
/*      clinical prose.                                              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("path");
const { createEngine } = require("../tools/lib/load-engine");
const { CONDITION_INFO, getConditionInfo } = require(path.resolve(__dirname, "..", "knowledge", "condition-info.js"));

/* Real condition names, pulled from the loaded KB. */
const eng = createEngine();
const NAMES = new Set(eng.context.KNOWLEDGE_ALL.map((c) => c.name));

test("every condition-info key matches a real KB condition name", () => {
  const orphans = Object.keys(CONDITION_INFO).filter((k) => !NAMES.has(k));
  assert.deepStrictEqual(orphans, [], "condition-info keys with no matching condition: " + orphans.join(", "));
});

test("every entry has a summary, non-empty facts, and a review flag", () => {
  for (const [name, info] of Object.entries(CONDITION_INFO)) {
    assert.ok(typeof info.summary === "string" && info.summary.length > 20, name + " needs a real summary");
    assert.ok(Array.isArray(info.facts) && info.facts.length >= 1, name + " needs at least one fact");
    info.facts.forEach((f) => assert.ok(typeof f === "string" && f.length > 5, name + " has an empty fact"));
    assert.ok(typeof info.review === "boolean", name + " needs an explicit review flag");
  }
});

test("AI-authored entries are flagged provisional (review:true)", () => {
  /* Until the founder verifies them, all entries must be provisional so the UI
     shows the verification badge. This test will legitimately change only when
     he verifies specific entries and we set review:false deliberately. */
  const notFlagged = Object.entries(CONDITION_INFO).filter(([, v]) => v.review !== true).map(([k]) => k);
  assert.deepStrictEqual(notFlagged, [], "entries not flagged provisional: " + notFlagged.join(", "));
});

test("no fabricated quantitative claims (no %, ratios, mmHg, or doses)", () => {
  /* Guardrail: AI-authored prose must stay qualitative — no invented statistics,
     thresholds, likelihood ratios, or drug doses. Flag any numeric-with-unit or
     ratio pattern for review. Ordinary words are fine; this only catches figures. */
  const BANNED = /(\d+\s?%|\d+\s?mmhg|\d+\s?mg|\d+\s?ml|\d+\s?mm\b|\b\d+\s?:\s?\d+\b|\bLR[+-]?\s?\d|\bp\s?<\s?0)/i;
  const hits = [];
  for (const [name, info] of Object.entries(CONDITION_INFO)) {
    const blob = [info.summary].concat(info.facts).join(" ");
    if (BANNED.test(blob)) hits.push(name + " → " + (blob.match(BANNED) || [])[0]);
  }
  assert.deepStrictEqual(hits, [], "possible fabricated figures: " + hits.join(" | "));
});

test("getConditionInfo returns the entry or null (never fabricates)", () => {
  assert.ok(getConditionInfo("Anterior Uveitis (Acute)"), "known condition returns an entry");
  assert.strictEqual(getConditionInfo("Totally Made Up Condition XYZ"), null, "unknown returns null");
  assert.strictEqual(getConditionInfo(""), null);
  assert.strictEqual(getConditionInfo(null), null);
});
