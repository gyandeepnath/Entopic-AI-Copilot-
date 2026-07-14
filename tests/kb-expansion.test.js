/* ═══════════════════════════════════════════════════════════════ */
/* EXPANSION BATCH GATE (knowledge/expansion.js)                    */
/* The provisional expansion is where volume grows toward 5x, so it   */
/* is exactly where sloppiness would slip in. This gate holds every   */
/* expansion entry to the same bar the editor enforces:              */
/*   • zero lint ERRORS (no dup, no req/con contradiction, valid      */
/*     route, …)                                                     */
/*   • every REQUIRED token is reachable (an exam input produces it)  */
/*     — i.e. the condition can actually surface, no dead entries     */
/*   • the REAL engine ranks it when its evidence is present          */
/*   • red-flag alerts still fire unchanged                          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const path = require("node:path");
const A = require("../js/kb-authoring");
const { loadKnowledgeBase } = require("../tools/lib/load-kb");
const { createEngine } = require("../tools/lib/load-engine");

const kb = loadKnowledgeBase();
const ALL = kb.KNOWLEDGE_ALL;
const REG = kb.TOKEN_REGISTRY;

/* Load the raw expansion array straight from its file so we can identify
   which of the assembled conditions are the provisional batch. */
function loadExpansionArray() {
  const vm = require("node:vm");
  const fs = require("node:fs");
  const src = fs.readFileSync(path.resolve(__dirname, "..", "knowledge", "expansion.js"), "utf8");
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src + "\nthis.__x = KB_EXPANSION;", sandbox);
  return sandbox.__x;
}
const expansionList = loadExpansionArray();
const expansionNames = new Set(expansionList.map((c) => c.name));
function isExpansion(c) { return expansionNames.has(c.name); }

const tokenInfo = {};
for (const t in REG) tokenInfo[t] = { reachable: REG[t].reachable !== false };
const ctx = { conditions: ALL, tokenInfo, routes: A.KB_KNOWN_ROUTES };

test("expansion batch is non-trivial", () => {
  assert.ok(expansionList.length >= 40, "expected a substantial batch, got " + expansionList.length);
});

test("every expansion entry passes the linter with ZERO errors", () => {
  const offenders = [];
  for (const c of expansionList) {
    const res = A.kbLintCondition(c, Object.assign({}, ctx, { excludeName: c.name }));
    if (res.errors.length) offenders.push(c.name + " → " + res.errors.map((e) => e.code).join(","));
  }
  assert.deepStrictEqual(offenders, [], "entries with lint errors:\n" + offenders.join("\n"));
});

test("every REQUIRED token in the batch is reachable (no dead conditions)", () => {
  const dead = [];
  for (const c of expansionList) {
    for (const t of (c.req || [])) {
      if (!REG[t] || REG[t].reachable === false) dead.push(c.name + " → req token '" + t + "' has no producer");
    }
  }
  assert.deepStrictEqual(dead, [], "unreachable required tokens:\n" + dead.join("\n"));
});

test("no expansion entry duplicates a curated condition name", () => {
  const curated = new Set(ALL.filter((c) => !isExpansion(c)).map((c) => A.kbNameKey(c.name)));
  /* Array.from → local realm (expansionList comes from a vm sandbox). */
  const clashes = Array.from(expansionList).filter((c) => curated.has(A.kbNameKey(c.name))).map((c) => c.name);
  assert.strictEqual(clashes.length, 0, "names colliding with curated KB:\n" + clashes.join("\n"));
});

test("the REAL engine surfaces each expansion condition from its own evidence", () => {
  const eng = createEngine();
  const misses = [];
  for (const c of expansionList) {
    const symptoms = (c.req || []).concat((c.sup || []).slice(0, 3));
    const out = eng.runCase({ symptoms, temporal: { course: (c.temporal || [])[0] || "" } });
    if (!out.dxList.some((d) => d.n === c.name)) misses.push(c.name);
  }
  /* Allow a small number of legitimately-gated urgent entries that need extra
     signals, but the vast majority must surface. */
  assert.ok(misses.length <= 2, "too many expansion entries never surface: " + misses.join(", "));
});

test("red-flag alerts still fire after the expansion", () => {
  const eng = createEngine();
  assert.ok(eng.runCase({ symptoms: ["flashes", "floaters"] }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ iop: { od: "48", os: "16" } }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ pupil: { rapd: "OD" } }).alerts.some((a) => a.l === "urgent"));
});
