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
const { CONDITION_INFO, getConditionInfo, buildConditionProfile, resolveConditionInfo } =
  require(path.resolve(__dirname, "..", "knowledge", "condition-info.js"));

/* Real condition names, pulled from the loaded KB. */
const eng = createEngine();
const KB = eng.context.KNOWLEDGE_ALL;
const NAMES = new Set(KB.map((c) => c.name));
const findCond = (name) => eng.context.findCondition(name);
const prettify = (t) => String(t).replace(/_/g, " ");

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

/* ── Derived profiles: 100% coverage without fabrication ── */

test("EVERY KB condition resolves to non-empty content (authored or derived)", () => {
  const empty = [];
  for (const c of KB) {
    const info = resolveConditionInfo(c.name, findCond, prettify);
    if (!info || !info.summary || info.summary.length < 15) empty.push(c.name);
  }
  assert.deepStrictEqual(empty, [], "conditions with no resolvable content: " + empty.slice(0, 10).join(", "));
});

test("resolveConditionInfo is authored for the curated set, derived otherwise", () => {
  const authored = resolveConditionInfo("Anterior Uveitis (Acute)", findCond, prettify);
  assert.strictEqual(authored.kind, "authored");
  const derived = KB.find((c) => !CONDITION_INFO[c.name]);
  const d = resolveConditionInfo(derived.name, findCond, prettify);
  assert.strictEqual(d.kind, "derived", derived.name + " should be derived");
  assert.ok(d.facts.length >= 1, "derived profile has facts");
});

test("derived profile is a faithful restatement of the condition's own tokens", () => {
  const cond = findCond("Nuclear Sclerotic Cataract");
  const prof = buildConditionProfile(cond, prettify);
  assert.ok(prof.derived === true);
  const blob = [prof.summary].concat(prof.facts).join(" ").toLowerCase();
  // Its required token (gradual_blur) must appear, prettified.
  assert.ok(blob.includes("gradual blur"), "req token surfaced in profile");
  // Nothing quantitative invented (same guard as authored prose).
  const BANNED = /(\d+\s?%|\d+\s?mmhg|\d+\s?mg|\d+\s?ml|\bLR[+-]?\s?\d|\bp\s?<\s?0)/i;
  assert.ok(!BANNED.test(blob), "no fabricated figures in derived profile");
});

test("buildConditionProfile handles a bare condition without throwing", () => {
  const prof = buildConditionProfile({ name: "X", req: [], sup: [], con: [] }, prettify);
  assert.ok(prof && prof.summary.indexOf("X is") === 0);
  assert.strictEqual(buildConditionProfile(null, prettify), null);
});
