/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CANONICAL KNOWLEDGE-BASE LOAD ORDER (single source)     */
/*                                                                  */
/* One authoritative list of the knowledge-base files, in dependency */
/* order. Both Node loaders (load-kb.js and load-engine.js) derive   */
/* their file lists from THIS, so they can no longer drift apart —   */
/* the drift that once had half the test suite reasoning about a     */
/* differently assembled KB (DD finding M-2).                        */
/*                                                                  */
/* Order matters: domain files → dictionaries/maps → registry →      */
/* icd → expansion/verified/common/age → loader (assembles + applies */
/* the overlays). The browser (index.html <script> tags) mirrors     */
/* this order; a test asserts the browser and these loaders agree.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Paths are repo-relative (what load-engine.js wants). load-kb.js strips the
   "knowledge/" prefix since it resolves inside that directory. */
const KB_FILES = [
  "knowledge/clinical-thresholds.js", /* pure data + clinThreshold(); no deps, must precede engine.js */
  "knowledge/surface.js",
  "knowledge/corneal.js",
  "knowledge/retina.js",
  "knowledge/neuro.js",
  "knowledge/binocular.js",
  "knowledge/refractive.js",
  "knowledge/glaucoma.js",
  "knowledge/anterior.js",
  "knowledge/lens.js",
  "knowledge/token-dictionary.js",
  "knowledge/finding-token-map.js",
  "knowledge/medications.js",
  "knowledge/token-registry.js",   /* generated — see tools/gen-token-registry.js */
  "knowledge/icd-map.js",
  "knowledge/expansion.js",         /* provisional expansion batch (folded in by loader.js) */
  "knowledge/verified.js",          /* founder sign-offs, applied by loader.js */
  "knowledge/common-conditions.js", /* the "common in practice" scope set */
  "knowledge/age-classification.js",/* age-bracket reclassification, applied by loader.js */
  "knowledge/loader.js"             /* assembles KNOWLEDGE_ALL + applies overlays */
];

/* The extra engine-path files load-engine.js appends after the KB. */
const ENGINE_TAIL = [
  "js/data-model.js",
  "js/medication-checker.js",       /* defines getMedicationTokens (engine source 10) */
  "js/engine-exclusions.js",        /* pipeline stage 8 — engine.js calls applyExclusions() */
  "js/engine.js",
  "js/engine-diff.js",              /* records "what changed" — engine.js calls it if present */
  "js/engine-replay.js"             /* deterministic replay — must share the engine's realm */
];

module.exports = {
  KB_FILES: KB_FILES,
  ENGINE_TAIL: ENGINE_TAIL,
  /* what load-kb.js needs: bare filenames under knowledge/ */
  kbBaseNames: function () { return KB_FILES.map(function (p) { return p.replace(/^knowledge\//, ""); }); },
  /* what load-engine.js needs: KB (repo-relative) + engine tail */
  engineOrder: function () { return KB_FILES.concat(ENGINE_TAIL); }
};
