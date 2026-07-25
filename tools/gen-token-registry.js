#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN REGISTRY GENERATOR                                        */
/* Builds knowledge/token-registry.js — the single source of truth  */
/* for the engine's token vocabulary (ARCHITECTURE.md §A.1).         */
/*                                                                  */
/* Everything here is MEASURED from the actual sources, never        */
/* invented:                                                         */
/*   producers — which input path can emit each token                */
/*     symptom_chip   keys of SYM_CATS categories (data-model.js)    */
/*     dictionary     keys of TOKEN_DICTIONARY (aliases; free-text/  */
/*                    speech/search can resolve these)               */
/*     finding_map    values of FINDING_TOKEN_MAP                    */
/*     free_text      t.push("...") literals in parseComplaintText   */
/*     engine_derived addToken("...") literals in collectTokens      */
/*                    (history flags + measurement thresholds)       */
/*     temporal       temporal vocab + engine temporal mapping       */
/*     medication     tokens.push("...") in getMedicationTokens      */
/*   usage — how often the KB references each token (req/sup/con/    */
/*     temporal/tests)                                               */
/*   reachable — token has >= 1 producer                             */
/*                                                                  */
/* type_hint is inferred mechanically from the producing source and  */
/* is PROVISIONAL engineering metadata — not verified clinical       */
/* classification.                                                   */
/*                                                                  */
/* Usage: node tools/gen-token-registry.js [--check]                 */
/*   --check: exit 1 if knowledge/token-registry.js is out of date   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const { createEngine } = require("./lib/load-engine");

const REPO_ROOT = path.resolve(__dirname, "..");
const OUT_FILE = path.join(REPO_ROOT, "knowledge", "token-registry.js");
const CHECK = process.argv.includes("--check");

const eng = createEngine();
const ctx = eng.context;

/* ── Extract string literals pushed inside a function's source ── */
function extractFunctionSource(fileText, fnName) {
  const start = fileText.indexOf("function " + fnName);
  if (start < 0) return "";
  /* walk braces to find the end of the function */
  let i = fileText.indexOf("{", start);
  let depth = 0;
  for (; i < fileText.length; i++) {
    if (fileText[i] === "{") depth++;
    else if (fileText[i] === "}") { depth--; if (depth === 0) break; }
  }
  return fileText.slice(start, i + 1);
}
function literalsIn(src, callPattern) {
  const re = new RegExp(callPattern + '\\(\\s*"([^"]+)"\\s*\\)', "g");
  const out = new Set();
  let m;
  while ((m = re.exec(src))) out.add(m[1]);
  return out;
}

const engineSrc = fs.readFileSync(path.join(REPO_ROOT, "js", "engine.js"), "utf8");
const medSrc = fs.readFileSync(path.join(REPO_ROOT, "js", "medication-checker.js"), "utf8");

/* ── Producers ── */
/* Canonicalise every producer through the same alias map the engine uses,
   so a chip keyed `tearing` is recorded as producing `watering` — the alias
   source tokens then never appear in the registry (no producer, no consumer). */
const ALIASES = ctx.TOKEN_ALIASES || {};
const canon = (t) => (t && ALIASES[t]) ? ALIASES[t] : t;
const producers = {}; /* token → Set(sources) */
function addProducer(token, source) {
  token = canon(token);
  if (!producers[token]) producers[token] = new Set();
  producers[token].add(source);
}

/* 1. Symptom chips: SYM_CATS is { category: { token: label } } */
for (const cat of Object.values(ctx.SYM_CATS)) {
  for (const token of Object.keys(cat)) addProducer(token, "symptom_chip");
}

/* 2. Dictionary aliases */
for (const token of Object.keys(ctx.TOKEN_DICTIONARY)) addProducer(token, "dictionary");

/* 3. Finding map outputs */
for (const tokens of Object.values(ctx.FINDING_TOKEN_MAP)) {
  for (const token of tokens) addProducer(token, "finding_map");
}

/* 4. Free-text parser */
const parseSrc = extractFunctionSource(engineSrc, "parseComplaintText");
for (const token of literalsIn(parseSrc, "t\\.push")) addProducer(token, "free_text");

/* 5. Engine derivation (history flags + measurements) in collectTokens */
const collectSrc = extractFunctionSource(engineSrc, "collectTokens");
for (const token of literalsIn(collectSrc, "addToken")) addProducer(token, "engine_derived");

/* 6. Temporal: onset keys are stored directly as tokens; duration/course map
      to fixed categories; applyTemporalWeight injects bias tokens */
for (const o of ctx.TEMPORAL_ONSET) addProducer(o.key, "temporal");
for (const token of ["acute", "subacute", "chronic", "progressive", "intermittent"]) {
  addProducer(token, "temporal");
}
const temporalSrc = extractFunctionSource(engineSrc, "applyTemporalWeight");
for (const token of literalsIn(temporalSrc, "t\\.push")) addProducer(token, "temporal");

/* 7. Medication bridge */
const medFnSrc = extractFunctionSource(medSrc, "getMedicationTokens");
for (const token of literalsIn(medFnSrc, "tokens\\.push")) addProducer(token, "medication");

/* ── Consumers: KB usage counts ── */
const usage = {}; /* token → {req,sup,con,temporal,tests} */
function addUsage(token, field) {
  if (!usage[token]) usage[token] = { req: 0, sup: 0, con: 0, temporal: 0, tests: 0 };
  usage[token][field]++;
}
for (const c of ctx.KNOWLEDGE_ALL) {
  for (const f of ["req", "sup", "con", "temporal", "tests"]) {
    for (const token of c[f] || []) addUsage(token, f);
  }
}

/* ── Assemble registry ── */
const allTokens = new Set([...Object.keys(producers), ...Object.keys(usage)]);
const TYPE_HINT = {
  symptom_chip: "symptom",
  finding_map: "sign",
  engine_derived: "derived_measurement_or_history",
  temporal: "temporal",
  medication: "risk_factor",
  free_text: "symptom",
  dictionary: "lexical"
};

const registry = {};
for (const token of [...allTokens].sort()) {
  const src = producers[token] ? [...producers[token]].sort() : [];
  const use = usage[token] || { req: 0, sup: 0, con: 0, temporal: 0, tests: 0 };
  /* type hint: first non-lexical producer's hint, else lexical, else unknown */
  let hint = "unknown";
  for (const s of src) {
    if (s !== "dictionary") { hint = TYPE_HINT[s]; break; }
  }
  if (hint === "unknown" && src.includes("dictionary")) hint = "lexical";
  registry[token] = {
    type_hint: hint,
    sources: src,
    usage: use,
    reachable: src.length > 0
  };
}

/* ── Stats ── */
const tokens = Object.keys(registry);
const stats = {
  total: tokens.length,
  reachable: tokens.filter((t) => registry[t].reachable).length,
  unreachable_required: tokens
    .filter((t) => !registry[t].reachable && registry[t].usage.req > 0)
    .sort(),
  unreachable_supportive: tokens
    .filter((t) => !registry[t].reachable && registry[t].usage.req === 0 &&
      (registry[t].usage.sup > 0 || registry[t].usage.con > 0))
    .sort(),
  /* tokens only referenced in `tests` arrays are display labels, not
     matchable evidence — tracked separately, reachability not required */
  test_label_only: tokens.filter((t) => {
    const u = registry[t].usage;
    return !registry[t].reachable && u.req === 0 && u.sup === 0 && u.con === 0 &&
      u.temporal === 0 && u.tests > 0;
  }).length,
  produced_never_consumed: tokens.filter((t) => {
    const u = registry[t].usage;
    return registry[t].reachable &&
      u.req === 0 && u.sup === 0 && u.con === 0 && u.temporal === 0 && u.tests === 0;
  }).length
};

/* ── Emit ── */
const banner =
  "/* ═══════════════════════════════════════════════════════════════ */\n" +
  "/* TOKEN REGISTRY — GENERATED FILE, DO NOT EDIT BY HAND            */\n" +
  "/* Regenerate with: node tools/gen-token-registry.js               */\n" +
  "/*                                                                  */\n" +
  "/* Single source of truth for the engine token vocabulary:          */\n" +
  "/* every token's producers (input paths), KB usage counts, and      */\n" +
  "/* reachability. type_hint is mechanically inferred and PROVISIONAL */\n" +
  "/* — not verified clinical classification.                          */\n" +
  "/* ═══════════════════════════════════════════════════════════════ */\n" +
  '"use strict";\n\n';

const body =
  "var TOKEN_REGISTRY = " + JSON.stringify(registry, null, 2) + ";\n\n" +
  "var TOKEN_REGISTRY_STATS = " + JSON.stringify(stats, null, 2) + ";\n";

const content = banner + body;

if (CHECK) {
  const existing = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";
  if (existing !== content) {
    console.error("token-registry.js is OUT OF DATE. Run: node tools/gen-token-registry.js");
    process.exit(1);
  }
  console.log("token-registry.js is up to date.");
  process.exit(0);
}

fs.writeFileSync(OUT_FILE, content);
console.log("Wrote " + path.relative(REPO_ROOT, OUT_FILE));
console.log("  tokens total:            " + stats.total);
console.log("  reachable:               " + stats.reachable);
console.log("  UNREACHABLE required:    " + stats.unreachable_required.length +
  (stats.unreachable_required.length ? "  → " + stats.unreachable_required.join(", ") : ""));
console.log("  unreachable sup/con:     " + stats.unreachable_supportive.length);
console.log("  test-label-only tokens:  " + stats.test_label_only);
console.log("  produced, never consumed:" + stats.produced_never_consumed);
