/* ═══════════════════════════════════════════════════════════════ */
/* KB LOADER (Node)                                                */
/* Loads the browser-global knowledge base + token layers into a    */
/* sandboxed context so tooling/tests can inspect them in Node,      */
/* without a browser and without modifying any app source.          */
/*                                                                  */
/* The app assembles itself via ordered <script> tags that declare  */
/* `var KB_* = [...]` in global scope. We replicate that load order  */
/* inside a single vm context, then hand back the assembled globals. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const KNOWLEDGE_DIR = path.join(REPO_ROOT, "knowledge");

/* Load order mirrors the <script> ordering in index.html:            */
/* domain files first, then the token layers, then loader.js which    */
/* assembles KNOWLEDGE_ALL and the derived indexes.                   */
const LOAD_ORDER = [
  "surface.js",
  "corneal.js",
  "retina.js",
  "neuro.js",
  "binocular.js",
  "refractive.js",
  "glaucoma.js",
  "anterior.js",
  "lens.js",
  "token-dictionary.js",
  "finding-token-map.js",
  "medications.js",
  "token-registry.js", /* generated — see tools/gen-token-registry.js */
  "icd-map.js",
  "expansion.js",      /* provisional expansion batch (folded in by loader.js) */
  "verified.js",       /* founder sign-offs, applied by loader.js */
  "common-conditions.js",  /* the "common in practice" scope set */
  "age-classification.js", /* age-bracket reclassification, applied by loader.js */
  "loader.js"
];

function loadKnowledgeBase(options) {
  options = options || {};
  const sandbox = {};
  // loader.js logs a summary line; silence it unless caller wants it.
  sandbox.console = options.verbose ? console : { log() {}, warn() {}, error() {} };
  const context = vm.createContext(sandbox);

  for (const file of LOAD_ORDER) {
    const full = path.join(KNOWLEDGE_DIR, file);
    const src = fs.readFileSync(full, "utf8");
    vm.runInContext(src, context, { filename: full });
  }

  return sandbox;
}

module.exports = { loadKnowledgeBase, REPO_ROOT, KNOWLEDGE_DIR, LOAD_ORDER };
