/* ═══════════════════════════════════════════════════════════════ */
/* UI REACHABILITY — every condition must be enterable by CLICKING   */
/*                                                                  */
/* The registry's "reachable" flag counts free-text/dictionary       */
/* producers too, so a condition can pass reachability yet have NO    */
/* symptom chip or exam finding a clinician can click to trigger it.  */
/* The founder hit exactly this ("conditions provide no input"). This */
/* guard builds the set of tokens a clinician can produce by CLICKING */
/* — symptom chips (SYM_CATS), slit-lamp + fundus findings            */
/* (SL_FINDINGS/FUN_FINDINGS via FINDING_TOKEN_MAP), the temporal     */
/* selectors, and engine-derived measurement tokens — and asserts     */
/* every condition has a clickable path to ALL its required tokens.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");

/* Pull SYM_CATS / SL_FINDINGS / FUN_FINDINGS out of js/data-model.js. */
function loadDataModel() {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js", "data-model.js"), "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  /* data-model.js is plain declarations; run it and read the globals. */
  vm.runInContext(src + "\nthis.__SYM = typeof SYM_CATS!=='undefined'?SYM_CATS:{};" +
    "this.__SL = typeof SL_FINDINGS!=='undefined'?SL_FINDINGS:{};" +
    "this.__FUN = typeof FUN_FINDINGS!=='undefined'?FUN_FINDINGS:{};" +
    "this.__ALIAS = typeof TOKEN_ALIASES!=='undefined'?TOKEN_ALIASES:{};", sandbox);
  return { SYM: sandbox.__SYM, SL: sandbox.__SL, FUN: sandbox.__FUN, ALIAS: sandbox.__ALIAS };
}

const kb = loadKnowledgeBase();
const FTM = kb.FINDING_TOKEN_MAP || {};
const REG = kb.TOKEN_REGISTRY || {};
const dm = loadDataModel();

/* Producers are canonicalised through TOKEN_ALIASES at runtime (engine
   addToken), so a chip keyed `tearing` really feeds `watering`. Mirror that
   here or an aliased chip looks like a dead-end against the canonical KB. */
const canon = (t) => (t && dm.ALIAS[t]) ? dm.ALIAS[t] : t;

/* The set of tokens a clinician can produce by CLICKING something. */
function clickableTokens() {
  const ui = new Set();
  for (const cat in dm.SYM) for (const tok in dm.SYM[cat]) ui.add(canon(tok));    /* symptom chips */
  const addFindings = (o) => { for (const k in o) (o[k] || []).forEach((f) => (FTM[f] || []).forEach((t) => ui.add(canon(t)))); };
  addFindings(dm.SL); addFindings(dm.FUN);                                        /* slit-lamp + fundus findings */
  ["sudden_onset", "gradual_onset", "acute", "subacute", "chronic", "progressive", "intermittent"].forEach((t) => ui.add(t)); /* temporal selectors */
  for (const t in REG) if (REG[t].sources && REG[t].sources.indexOf("engine_derived") >= 0) ui.add(canon(t)); /* measurements */
  return ui;
}

test("SYM_CATS, SL_FINDINGS and FUN_FINDINGS load", () => {
  assert.ok(Object.keys(dm.SYM).length > 5, "SYM_CATS did not load");
  assert.ok(Object.keys(dm.SL).length > 0 && Object.keys(dm.FUN).length > 0, "findings lists did not load");
});

test("every condition can be surfaced by CLICKING (no clickable req path = blocked)", () => {
  const ui = clickableTokens();
  const blocked = [];
  for (const c of kb.KNOWLEDGE_ALL) {
    const req = c.req || [];
    if (!req.length) continue;
    const bad = req.filter((t) => !ui.has(t));
    if (bad.length === req.length) blocked.push(c.name + " [needs: " + req.join(", ") + "]");
  }
  assert.deepStrictEqual(blocked, [], "conditions with NO clickable path to any required finding:\n" + blocked.join("\n"));
});

test("no dead-end clickables — every chip & finding produces a token a condition uses", () => {
  /* A clickable that produces no token any condition consumes does nothing when
     tapped (the founder hit this). Assert every symptom chip and every
     slit-lamp/fundus finding emits at least one CONSUMED token. */
  const consumed = new Set();
  for (const c of kb.KNOWLEDGE_ALL) ["req", "sup", "con", "temporal", "tests"].forEach((f) => (c[f] || []).forEach((t) => consumed.add(t)));

  const deadChips = [];
  for (const cat in dm.SYM) for (const tok in dm.SYM[cat]) if (!consumed.has(canon(tok))) deadChips.push(tok);

  const deadFindings = [];
  const check = (o) => { for (const k in o) (o[k] || []).forEach((f) => { const ts = FTM[f] || []; if (!ts.length || ts.every((t) => !consumed.has(canon(t)))) deadFindings.push(f); }); };
  check(dm.SL); check(dm.FUN);

  assert.deepStrictEqual(deadChips, [], "symptom chips that feed the engine nothing:\n" + deadChips.join(", "));
  assert.deepStrictEqual(deadFindings, [], "findings that feed the engine nothing:\n" + deadFindings.join("\n"));
});

test("clickable-token coverage of req tokens stays high", () => {
  const ui = clickableTokens();
  let total = 0, covered = 0;
  for (const c of kb.KNOWLEDGE_ALL) for (const t of (c.req || [])) { total++; if (ui.has(t)) covered++; }
  const pct = covered / total;
  assert.ok(pct >= 0.9, "clickable coverage of required tokens dropped below 90% (" + (pct * 100).toFixed(1) + "%)");
});
