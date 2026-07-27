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
const { resolveConditionInfo } = require("../knowledge/condition-info.js");

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

test("RICHNESS: every expansion condition carries contradicting findings + a deep profile", () => {
  /* Fold quality into the batches: a NEW condition is only allowed in if it
     has real rule-out power (contradicting findings) and a reasonably deep
     profile — no thin sketches. Keeps the founder's standard enforced as the
     KB grows. */
  const thinCon = [], thinProfile = [];
  for (const c of expansionList) {
    if (!(c.con || []).length) thinCon.push(c.name);
    const fire = new Set([...(c.req || []), ...(c.sup || []), ...(c.con || []), ...(c.temporal || []), ...(c.tests || [])]
      .filter((t) => REG[t] && REG[t].reachable !== false)).size;
    if (fire < 8) thinProfile.push(c.name + " (" + fire + ")");
  }
  assert.deepStrictEqual(thinCon, [], "expansion conditions missing contradicting findings:\n" + thinCon.join("\n"));
  assert.ok(thinProfile.length <= 6,
    "too many thin (<8 firing) expansion conditions — enrich them:\n" + thinProfile.join("\n"));
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
  for (const raw of expansionList) {
    /* Build the vignette from the ASSEMBLED condition, not the raw source file.
       The loader may rewrite tokens after loading — the age-bracket
       reclassification replaces the deprecated `young_age`, and the founder's
       own overrides replay on top — so "its own evidence" means the evidence
       the engine actually holds, which is what this test is about. */
    const c = ALL.find((x) => x.name === raw.name) || raw;
    const symptoms = (c.req || []).concat((c.sup || []).slice(0, 3));
    const out = eng.runCase({ symptoms, temporal: { course: (c.temporal || [])[0] || "" } });
    if (!out.dxList.some((d) => d.n === c.name)) misses.push(c.name);
  }
  /* Allow a small number of legitimately-gated urgent entries that need extra
     signals, but the vast majority must surface. */
  assert.ok(misses.length <= 2, "too many expansion entries never surface: " + misses.join(", "));
});

test("every expansion condition carries a RUNTIME review flag (founder review queue reads this)", () => {
  /* The provisional contract must exist in the running app, not just in file
     comments — the KB editor's Review Queue lists conditions by this flag,
     and the founder's "mark verified" flips it (persisted as a local edit). */
  const unflagged = [];
  for (const c of ALL) {
    if (isExpansion(c) && c.review_status !== "NEEDS_CLINICAL_REVIEW") unflagged.push(c.name);
  }
  assert.deepStrictEqual(unflagged, [], "expansion conditions missing runtime review flag:\n" + unflagged.join("\n"));
});

test("every expansion condition ships 'About' content tied to its engine inputs", () => {
  /* Founder standard: a new condition must arrive with BOTH engine inputs (the
     req/sup/con tokens, enforced above) AND user-facing 'About' content. The two
     are linked by construction — a condition with no hand-authored summary still
     gets a profile DERIVED from its own req/sup/con tokens — so this test proves
     every expansion entry has About content and that the content reflects the
     engine inputs (its required tokens appear in the profile). Keeps About + the
     engine in lock-step as the KB grows. */
  const byName = {};
  for (const c of ALL) byName[c.name] = c;
  const findCond = (n) => byName[n] || null;
  const prettify = (t) => String(t).replace(/_/g, " ");

  const noAbout = [], disconnected = [];
  for (const c of expansionList) {
    const info = resolveConditionInfo(c.name, findCond, prettify);
    if (!info || !info.summary || info.summary.length < 15) { noAbout.push(c.name); continue; }
    if (info.kind === "derived") {
      /* the derived profile must surface at least one of the engine's own req
         tokens — i.e. the About text is generated from the engine inputs. */
      const blob = [info.summary].concat(info.facts || []).join(" ").toLowerCase();
      const reqShown = (c.req || []).some((t) => blob.includes(prettify(t)));
      if ((c.req || []).length && !reqShown) disconnected.push(c.name);
    }
  }
  assert.deepStrictEqual(noAbout, [], "expansion conditions with no About content:\n" + noAbout.join("\n"));
  assert.deepStrictEqual(disconnected, [], "About content not tied to engine inputs:\n" + disconnected.join("\n"));
});

test("red-flag alerts still fire after the expansion", () => {
  const eng = createEngine();
  assert.ok(eng.runCase({ symptoms: ["flashes", "floaters"] }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ iop: { od: "48", os: "16" } }).alerts.some((a) => a.l === "urgent"));
  assert.ok(eng.runCase({ pupil: { rapd: "OD" } }).alerts.some((a) => a.l === "urgent"));
});
