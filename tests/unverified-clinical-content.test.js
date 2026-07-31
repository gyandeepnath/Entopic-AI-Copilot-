/* ═══════════════════════════════════════════════════════════════ */
/* UNVERIFIED CLINICAL CONTENT — LOAD-PATH GUARD                    */
/*                                                                  */
/* The hardest guardrail in CLAUDE.md is "never fabricate clinical  */
/* content — no invented sensitivity/specificity, likelihood        */
/* ratios, guideline claims, drug effects, or thresholds".          */
/*                                                                  */
/* On 2026-07-31 an AI-generated-code review found js/risk-calc.js: */
/* 369 lines, loaded on every page, called by nothing, containing a */
/* home-made point score presented as the OHTS model plus nine      */
/* invented 5-year risk percentages. It survived because it was     */
/* unreachable — nobody looked at code that never rendered.         */
/*                                                                  */
/* These tests make that class of content impossible to ship        */
/* silently again:                                                  */
/*                                                                  */
/*   1. quarantine/ is never in the load path.                      */
/*   2. Nothing in the load path prints a bare risk percentage.     */
/*   3. Every script tag in index.html points at a file that exists */
/*      (so quarantining a file can't leave a 404 behind).          */
/*                                                                  */
/* Test 2 is deliberately narrow: it looks for a percentage being   */
/* ASSIGNED to a risk/probability-shaped field, which is what a     */
/* fabricated calculator does. Percentages in prose, in CSS, or in  */
/* progress/usage readouts are not clinical claims and are ignored. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

/* Every js file index.html actually loads, in order. */
function loadedScripts() {
  const out = [];
  const re = /<script\s+src="([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

test("quarantined clinical content is never in the load path", () => {
  const scripts = loadedScripts();
  const quarantined = scripts.filter((s) => /(^|\/)quarantine\//.test(s));
  assert.deepStrictEqual(
    quarantined, [],
    "index.html loads a quarantined file:\n  " + quarantined.join("\n  ")
  );

  /* And the specific file that started this: it must stay out of js/. */
  assert.ok(
    !fs.existsSync(path.join(ROOT, "js", "risk-calc.js")),
    "js/risk-calc.js is back. It contains unsourced OHTS/AREDS2 percentages — " +
    "see quarantine/risk-calc.UNVERIFIED.js before restoring it."
  );
});

test("every script index.html loads actually exists", () => {
  const missing = loadedScripts().filter((s) => !fs.existsSync(path.join(ROOT, s)));
  assert.deepStrictEqual(
    missing, [],
    "index.html references files that are not on disk:\n  " + missing.join("\n  ")
  );
});

test("no loaded module assigns a bare risk percentage to a clinical field", () => {
  /* e.g.  result.risk_5yr = "~20%";   or   progression_risk: "30-50%"
     A real calculator computes a number; a fabricated one hard-codes a string. */
  const CLAIM = /\b\w*(?:risk|progression|conversion|prevalence|sensitivity|specificity|likelihood)\w*\s*[:=]\s*["'][^"']*\d\s*%/i;

  const offenders = [];
  for (const src of loadedScripts()) {
    if (!src.endsWith(".js")) continue;
    const text = fs.readFileSync(path.join(ROOT, src), "utf8");
    text.split("\n").forEach((line, i) => {
      if (CLAIM.test(line)) offenders.push(src + ":" + (i + 1) + "  " + line.trim());
    });
  }

  assert.deepStrictEqual(
    offenders, [],
    "hard-coded clinical risk percentages in the load path — these must be\n" +
    "sourced or marked NEEDS_CLINICAL_REVIEW and quarantined:\n  " +
    offenders.join("\n  ")
  );
});

test("the quarantine file still carries its NEEDS_CLINICAL_REVIEW header", () => {
  const p = path.join(ROOT, "quarantine", "risk-calc.UNVERIFIED.js");
  assert.ok(fs.existsSync(p), "the quarantined calculator was deleted — that loses the record of what was wrong with it");
  const head = fs.readFileSync(p, "utf8").slice(0, 3000);
  assert.ok(/NEEDS_CLINICAL_REVIEW/.test(head), "quarantine header lost its NEEDS_CLINICAL_REVIEW marker");
  assert.ok(/NOT LOADED BY THE APP/.test(head), "quarantine header no longer says the file is unloaded");
});
