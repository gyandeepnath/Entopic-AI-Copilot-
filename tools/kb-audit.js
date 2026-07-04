#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════ */
/* KB AUDIT                                                        */
/* Ground-truth report on the knowledge base + token vocabulary.    */
/* Read-only: loads the KB in a sandbox and measures it. Does not    */
/* modify any app source.                                           */
/*                                                                  */
/* This is the seed of the Phase 1 token-registry validator         */
/* (ARCHITECTURE.md §A.1). Today it REPORTS; it does not yet fail    */
/* the build, because the current KB knowingly violates several      */
/* invariants (that is what this report quantifies). Pass --strict   */
/* to exit non-zero when hard invariants are violated.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { loadKnowledgeBase } = require("./lib/load-kb");

const STRICT = process.argv.includes("--strict");
const JSON_OUT = process.argv.includes("--json");

const kb = loadKnowledgeBase();
const ALL = kb.KNOWLEDGE_ALL || [];
const DOMAINS = kb.KNOWLEDGE_DOMAINS || {};
const DICT = kb.TOKEN_DICTIONARY || {};
const FINDING_MAP = kb.FINDING_TOKEN_MAP || {};

/* ── Helpers ── */
function norm(name) {
  return String(name).toLowerCase();
}
/* Normalize a display name to the snake_case shape exclusion strings use. */
function toToken(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/* ── 1. Condition + domain counts ── */
const domainCounts = {};
let urgentCount = 0;
for (const c of ALL) {
  domainCounts[c._domain] = (domainCounts[c._domain] || 0) + 1;
  if (c.urgent) urgentCount++;
}

/* ── 2. Token reference collection ── */
const REF_FIELDS = ["req", "sup", "con", "temporal", "tests"];
const CORE_FIELDS = ["req", "sup", "con"];
const refAll = new Set();     // every token referenced anywhere
const refCore = new Set();    // req/sup/con only
const refReq = new Set();     // required tokens (must be reachable)
for (const c of ALL) {
  for (const f of REF_FIELDS) {
    (c[f] || []).forEach((t) => refAll.add(t));
  }
  for (const f of CORE_FIELDS) {
    (c[f] || []).forEach((t) => refCore.add(t));
  }
  (c.req || []).forEach((t) => refReq.add(t));
}

/* ── 3. Token producers (reachability sources) ── */
const dictTokens = new Set(Object.keys(DICT));
const findingTokens = new Set();
for (const findings of Object.values(FINDING_MAP)) {
  (findings || []).forEach((t) => findingTokens.add(t));
}

/* Tokens referenced by KB but defined nowhere in the dictionary. */
const undefinedTokens = [...refAll].filter((t) => !dictTokens.has(t)).sort();

/* Required tokens with no known producer (dictionary alias OR finding-map).
   NOTE: measurement/test-result tokens are legitimately produced by the
   engine's auto-derivation block (engine.js), which this KB-only audit
   cannot see — so this is a *candidate* list, not a verdict. */
const reqUnreached = [...refReq]
  .filter((t) => !dictTokens.has(t) && !findingTokens.has(t))
  .sort();

/* ── 4. ICD / code coverage ── */
const withIcd = ALL.filter((c) => c.icd && String(c.icd).trim().length > 0);

/* ── 5. Exclusion resolution ──
   Each exclusion string (e.g. "acute_angle_closure") is meant to name
   another condition. The engine (applyExclusions) matches the normalized
   condition name against the exclusion string, and NEVER suppresses
   urgent-flagged conditions (safety guard). Mirror that here:
     - resolvesByToken: the exclusion string matches >=1 condition name
     - suppressible targets: matched conditions that are not urgent
       (urgent matches resolve but can never actually be suppressed) */
const conditionTokens = ALL.map((c) => ({ name: c.name, token: toToken(c.name), urgent: !!c.urgent }));
const exclusionRules = [];
for (const c of ALL) {
  for (const ex of c.exclusions || []) {
    const hits = conditionTokens.filter((o) => o.token.indexOf(ex) >= 0 && o.name !== c.name);
    const suppressible = hits.filter((h) => !h.urgent);
    exclusionRules.push({
      from: c.name,
      excludes: ex,
      resolvesByToken: hits.length > 0,
      resolvesTo: hits.map((h) => h.name + (h.urgent ? " [urgent: never suppressed]" : "")),
      suppressibleTargets: suppressible.length
    });
  }
}
const exclResolvable = exclusionRules.filter((r) => r.resolvesByToken).length;
const exclEffective = exclusionRules.filter((r) => r.suppressibleTargets > 0).length;
const exclUnresolvable = exclusionRules.filter((r) => !r.resolvesByToken);

/* ── Report ── */
const report = {
  conditions: ALL.length,
  domains: Object.keys(DOMAINS).length,
  domainCounts,
  urgent: urgentCount,
  tokensReferencedAll: refAll.size,
  tokensReferencedCore: refCore.size,
  tokensInDictionary: dictTokens.size,
  tokensFromFindingMap: findingTokens.size,
  findingMapEntries: Object.keys(FINDING_MAP).length,
  undefinedTokenCount: undefinedTokens.length,
  requiredTokens: refReq.size,
  requiredTokensNoLexicalProducer: reqUnreached.length,
  conditionsWithIcd: withIcd.length,
  exclusionRules: exclusionRules.length,
  exclusionsResolvable: exclResolvable,
  exclusionsWithSuppressibleTarget: exclEffective,
  exclusionsUnresolvable: exclUnresolvable.length
};

if (JSON_OUT) {
  console.log(JSON.stringify({ report, undefinedTokens, reqUnreached, exclUnresolvable, exclusionRules }, null, 2));
  process.exit(0);
}

function line() { console.log("─".repeat(64)); }
function pct(n, d) { return d ? ((100 * n) / d).toFixed(0) + "%" : "—"; }

line();
console.log("ENTOPIC — KNOWLEDGE BASE AUDIT");
line();
console.log(`Conditions:            ${report.conditions}  across ${report.domains} domains`);
console.log(`Urgent-flagged:        ${report.urgent}`);
console.log("");
console.log("Conditions per domain:");
Object.entries(domainCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([d, n]) => console.log(`   ${String(n).padStart(3)}  ${d}`));
line();
console.log("TOKEN VOCABULARY");
console.log(`  Distinct tokens referenced (req/sup/con/temporal/tests): ${report.tokensReferencedAll}`);
console.log(`  Distinct tokens referenced (req/sup/con only):           ${report.tokensReferencedCore}`);
console.log(`  Tokens defined in token-dictionary.js:                   ${report.tokensInDictionary}`);
console.log(`  Tokens emitted by finding-token-map.js:                  ${report.tokensFromFindingMap}`);
console.log(`  finding-token-map entries:                               ${report.findingMapEntries}`);
console.log(`  Referenced tokens with NO dictionary entry:              ${report.undefinedTokenCount}`);
console.log("");
console.log(`  Required tokens total:                                   ${report.requiredTokens}`);
console.log(`  ...with no lexical producer (dict or finding-map):       ${report.requiredTokensNoLexicalProducer}`);
console.log(`     (some are legitimately engine-derived measurements —`);
console.log(`      resolving this is Phase 1's token-registry job)`);
line();
console.log("CLINICAL CODING");
console.log(`  Conditions carrying an ICD code: ${report.conditionsWithIcd} / ${report.conditions} (${pct(report.conditionsWithIcd, report.conditions)})`);
line();
console.log("EXCLUSIONS (comorbidity suppression — engine matcher model)");
console.log(`  Total exclusion rules declared:            ${report.exclusionRules}`);
console.log(`  ...resolving to >=1 condition:              ${report.exclusionsResolvable}`);
console.log(`  ...with a suppressible (non-urgent) target: ${report.exclusionsWithSuppressibleTarget}`);
console.log(`  ...unresolvable (target not found):         ${report.exclusionsUnresolvable}`);
if (exclUnresolvable.length) {
  console.log("  Unresolvable exclusion targets:");
  exclUnresolvable.forEach((r) => console.log(`     ${r.from}  →  excludes "${r.excludes}" (no matching condition)`));
}
line();

/* ── Hard invariants (strict mode) ── */
const violations = [];
if (report.exclusionRules > 0 && report.exclusionsResolvable === 0) {
  violations.push("Exclusion rules are declared but NONE resolve to any condition (matcher or naming bug).");
}
if (exclUnresolvable.length > 0) {
  violations.push(`${exclUnresolvable.length} exclusion target(s) do not resolve to any condition.`);
}

if (violations.length) {
  console.log("INVARIANT VIOLATIONS:");
  violations.forEach((v) => console.log(`  ✗ ${v}`));
  line();
  if (STRICT) process.exit(1);
} else {
  console.log("No hard-invariant violations detected.");
  line();
}
