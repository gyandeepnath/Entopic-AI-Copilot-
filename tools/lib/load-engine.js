/* ═══════════════════════════════════════════════════════════════ */
/* ENGINE LOADER (Node)                                            */
/* Loads the full diagnostic pipeline — knowledge base, data model,  */
/* and engine — into a sandboxed context so golden clinical          */
/* vignettes can run the REAL engine (not a reimplementation)        */
/* under Node's test runner. No app source is modified.              */
/*                                                                  */
/* The engine reads the globals V (visit) and P (patient) and        */
/* writes V.dxList / V.alerts / V.nudges. runCase() wires a fresh    */
/* blankVisit()/blankPatient(), applies the vignette's overrides,    */
/* runs the pipeline, and returns the outputs.                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/* Mirrors the <script> ordering in index.html for the diagnostic    */
/* path: knowledge → loader → data-model → engine. UI/storage/       */
/* speech/claude files are deliberately NOT loaded — the diagnostic   */
/* engine must be runnable without them (offline-first invariant).   */
const LOAD_ORDER = [
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
  "knowledge/token-registry.js",
  "knowledge/icd-map.js",
  "knowledge/expansion.js",
  "knowledge/loader.js",
  "js/data-model.js",
  "js/medication-checker.js", /* defines getMedicationTokens (engine source 10) */
  "js/engine.js"
];

function createEngine(options) {
  options = options || {};
  const sandbox = {};
  sandbox.console = options.verbose ? console : { log() {}, warn() {}, error() {} };
  const context = vm.createContext(sandbox);

  for (const file of LOAD_ORDER) {
    const full = path.join(REPO_ROOT, file);
    const src = fs.readFileSync(full, "utf8");
    vm.runInContext(src, context, { filename: full });
  }

  /* Deep-merge overrides into a target object (arrays/scalars replace). */
  function merge(target, overrides) {
    for (const key of Object.keys(overrides)) {
      const val = overrides[key];
      if (val && typeof val === "object" && !Array.isArray(val) &&
          target[key] && typeof target[key] === "object" && !Array.isArray(target[key])) {
        merge(target[key], val);
      } else {
        target[key] = val;
      }
    }
    return target;
  }

  /**
   * Run the full diagnostic pipeline on one clinical vignette.
   * @param {object} visitOverrides   fields merged into blankVisit()
   * @param {object} patientOverrides fields merged into blankPatient()
   * @returns {{ dxList, alerts, nudges, tokens, routes, V }}
   */
  function runCase(visitOverrides, patientOverrides) {
    const V = vm.runInContext("blankVisit()", context);
    const P = vm.runInContext('blankPatient("test", "MRN-TEST")', context);
    merge(V, visitOverrides || {});
    merge(P, patientOverrides || {});
    context.V = V;
    context.P = P;
    vm.runInContext("runDiagnosticEngine()", context);
    return {
      dxList: V.dxList,
      alerts: V.alerts,
      nudges: V.nudges,
      nextTests: V.nextTests,
      tokens: context.ENGINE_STATE.tokens.slice(),
      routes: context.ENGINE_STATE.routes.slice(),
      V: V
    };
  }

  return { context, runCase, sandbox };
}

module.exports = { createEngine, LOAD_ORDER };
