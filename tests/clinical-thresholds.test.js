/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL THRESHOLDS  (Phase 4 finding F-4)                       */
/*                                                                  */
/* 129 numeric comparisons lived in js/engine.js. The clinical ones  */
/* — 21 mmHg, 520 µm, −6 dB — decide which conditions appear in a    */
/* differential, and a clinician signing off 394 conditions was not  */
/* signing those off and could not see them.                         */
/*                                                                  */
/* Three things have to hold for the fix to be worth anything:       */
/*                                                                  */
/*   1. The table and the engine's fallback literals must agree.     */
/*      Two numbers for one rule is worse than one hidden number.    */
/*   2. Behaviour must not have changed. This was a relocation, not  */
/*      a revision — no clinical judgement was made here.            */
/*   3. New clinical thresholds must not be hardcodable. Without a   */
/*      ratchet the engine simply re-accumulates them.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const T = require("../knowledge/clinical-thresholds.js");
const { createEngine } = require("../tools/lib/load-engine");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
/* Every js/ file on the diagnostic path, concatenated — NOT js/engine.js
   alone. When stage 8 moved into js/engine-exclusions.js this scanner stopped
   seeing scoreThreshold("exclusion_high_scorer") and reported the threshold as
   dead: a reviewer would have been told a live clinical number does nothing.
   Deriving the list from the real load order means the next split cannot
   blind it either. */
const ENGINE_SRC = require("../tools/lib/kb-load-order").engineOrder()
  .filter((f) => f.startsWith("js/"))
  .map(read)
  .join("\n");


/* ═══ 1. THE TABLE AND THE ENGINE CANNOT DRIFT APART ═══ */

/* Every clinThreshold("id", N) / scoreThreshold("id", N) call site in the
   engine, with the fallback literal it was written with. */
function callSites(fnName) {
  const re = new RegExp(fnName + '\\(\\s*"([a-z0-9_]+)"\\s*,\\s*(-?[0-9.]+)\\s*\\)', "g");
  return [...ENGINE_SRC.matchAll(re)].map((m) => ({ id: m[1], fallback: parseFloat(m[2]) }));
}

test("every threshold the engine asks for exists in the table", () => {
  const missing = [];
  for (const c of callSites("clinThreshold")) {
    if (!T.CLINICAL_THRESHOLDS[c.id]) missing.push("CLINICAL_THRESHOLDS." + c.id);
  }
  for (const c of callSites("scoreThreshold")) {
    if (!T.SCORING_THRESHOLDS[c.id]) missing.push("SCORING_THRESHOLDS." + c.id);
  }
  assert.deepStrictEqual(missing, [],
    "the engine reads thresholds that are not declared:\n  " + missing.join("\n  "));
});

test("every fallback literal equals its table value", () => {
  /* This is the whole point. The fallback exists so a missing knowledge file
     degrades instead of crashing — but a fallback that disagrees with the
     table is a second, invisible rule, which is exactly the defect F-4 was. */
  const drift = [];
  for (const c of callSites("clinThreshold")) {
    const row = T.CLINICAL_THRESHOLDS[c.id];
    if (row && row.v !== c.fallback) {
      drift.push(`${c.id}: table ${row.v}, engine fallback ${c.fallback}`);
    }
  }
  for (const c of callSites("scoreThreshold")) {
    const row = T.SCORING_THRESHOLDS[c.id];
    if (row && row.v !== c.fallback) {
      drift.push(`${c.id}: table ${row.v}, engine fallback ${c.fallback}`);
    }
  }
  assert.deepStrictEqual(drift, [],
    "a threshold changed in one place and not the other:\n  " + drift.join("\n  "));
});

test("no declared threshold is dead — each one is read by the engine", () => {
  const used = new Set(callSites("clinThreshold").map((c) => c.id));
  const unused = Object.keys(T.CLINICAL_THRESHOLDS).filter((id) => !used.has(id));
  assert.deepStrictEqual(unused, [],
    "declared but never read — a reviewer would sign off a number that does nothing:\n  " +
    unused.join("\n  "));
});

test("scoring thresholds are all read too", () => {
  const used = new Set(callSites("scoreThreshold").map((c) => c.id));
  const unused = Object.keys(T.SCORING_THRESHOLDS).filter((id) => !used.has(id));
  assert.deepStrictEqual(unused, []);
});


/* ═══ 2. EVERY ROW IS REVIEWABLE BY A HUMAN ═══ */

test("every row states what it means, what it emits and where it applies", () => {
  const bad = [];
  for (const [id, r] of Object.entries(T.CLINICAL_THRESHOLDS)) {
    if (typeof r.v !== "number" || !isFinite(r.v)) bad.push(id + ": v is not a number");
    if (!r.what || r.what.length < 20) bad.push(id + ": `what` must be a sentence a clinician can judge");
    if (!r.unit && r.unit !== "") bad.push(id + ": `unit` missing");
    if (!r.op) bad.push(id + ": `op` missing — the reader cannot tell < from <=");
    if (!Array.isArray(r.emits)) bad.push(id + ": `emits` must be an array (empty is fine)");
    if (!r.where) bad.push(id + ": `where` missing");
    if (!r.status) bad.push(id + ": `status` missing");
  }
  assert.deepStrictEqual(bad, [], bad.join("\n  "));
});

test("no source is claimed that nobody read", () => {
  /* The standing rule: a citation nobody read is worse than none, because it
     stops the reader checking. If `src` is ever filled in, `status` must have
     moved off UNVERIFIED in the same edit — and vice versa. */
  const bad = [];
  for (const [table, rows] of [["clinical", T.CLINICAL_THRESHOLDS], ["scoring", T.SCORING_THRESHOLDS]]) {
    for (const [id, r] of Object.entries(rows)) {
      const hasSrc = !!(r.src && r.src.trim());
      const verified = r.status === "VERIFIED";
      if (hasSrc !== verified) {
        bad.push(`${table}.${id}: src=${JSON.stringify(r.src)} but status=${r.status}`);
      }
    }
  }
  assert.deepStrictEqual(bad, [],
    "a row claims a source without a sign-off, or a sign-off without a source:\n  " + bad.join("\n  "));
});

test("thresholdsUnverified() lists everything still awaiting the founder", () => {
  const open = T.thresholdsUnverified();
  const total = Object.keys(T.CLINICAL_THRESHOLDS).length + Object.keys(T.SCORING_THRESHOLDS).length;
  assert.strictEqual(open.length, total,
    "as of this commit not one threshold has been clinically verified — " +
    "if that changes, this number should change with it, deliberately");
});


/* ═══ 3. THE ACCESSORS FAIL SAFE ═══ */

test("a missing table returns the caller's fallback, not undefined", () => {
  assert.strictEqual(T.clinThreshold("no_such_threshold_at_all", 42), 42);
  assert.strictEqual(T.scoreThreshold("no_such_threshold_at_all", 0.5), 0.5);
});

test("a known threshold returns the table value, not the fallback", () => {
  assert.strictEqual(T.clinThreshold("iop_high", 999), T.CLINICAL_THRESHOLDS.iop_high.v);
});

test("the engine still runs with the threshold file absent", () => {
  /* ADR-006: the exam must work with no network, ever. That extends to a
     knowledge file failing to load — it must degrade, not crash. */
  const vm = require("node:vm");
  const order = require("../tools/lib/kb-load-order").engineOrder()
    .filter((f) => f !== "knowledge/clinical-thresholds.js");
  const sandbox = { console: { log() {}, warn() {}, error() {} } };
  const ctx = vm.createContext(sandbox);
  for (const f of order) vm.runInContext(read(f), ctx, { filename: f });

  const V = vm.runInContext("blankVisit()", ctx);
  V.iop = { od: "34", os: "34" };
  ctx.V = V;
  ctx.P = vm.runInContext('blankPatient("t", "M")', ctx);
  vm.runInContext("runDiagnosticEngine()", ctx);

  assert.ok(ctx.ENGINE_STATE.tokens.indexOf("high_iop") >= 0,
    "the fallback literal must still produce the same token");
  assert.ok(ctx.ENGINE_STATE.tokens.indexOf("very_high_iop") >= 0);
});


/* ═══ 4. BEHAVIOUR IS UNCHANGED — THIS WAS A RELOCATION ═══ */

const eng = createEngine();
const tokensFor = (v, p) => eng.runCase(v, p).tokens;

test("IOP bands land exactly where they did", () => {
  assert.ok(tokensFor({ iop: { od: "22", os: "16" } }).includes("high_iop"));
  assert.ok(!tokensFor({ iop: { od: "21", os: "16" } }).includes("high_iop"), "21 is not >21");
  assert.ok(tokensFor({ iop: { od: "21", os: "16" } }).includes("normal_iop"));
  assert.ok(tokensFor({ iop: { od: "31", os: "16" } }).includes("very_high_iop"));
  assert.ok(!tokensFor({ iop: { od: "30", os: "16" } }).includes("very_high_iop"));
});

test("age brackets abut with no gap and no overlap", () => {
  /* age_paediatric_max and age_young_adult_max/age_over_40 are separate rows.
     If one is edited and the other is not, some age falls into no bracket —
     this is the test that says so. */
  for (let age = 1; age <= 100; age++) {
    const t = tokensFor({}, { age: String(age) });
    const brackets = ["paediatric_age", "young_adult_age", "age_over_40"].filter((b) => t.includes(b));
    assert.strictEqual(brackets.length, 1,
      `age ${age} matched ${brackets.length} brackets (${brackets.join(", ")}) — expected exactly 1`);
  }
});

test("refraction thresholds are unchanged, including the deliberate asymmetry", () => {
  assert.ok(tokensFor({ rx: { od_sph: "-0.75" } }).includes("myopia"));
  assert.ok(!tokensFor({ rx: { od_sph: "-0.50" } }).includes("myopia"), "-0.50 is not < -0.50");
  assert.ok(tokensFor({ rx: { od_sph: "+1.00" } }).includes("hyperopia"));
  assert.ok(!tokensFor({ rx: { od_sph: "+0.75" } }).includes("hyperopia"), "+0.75 is not > +0.75");
  assert.ok(tokensFor({ rx: { od_cyl: "-0.75" } }).includes("astigmatism"), "cylinder uses >=, not >");
  assert.ok(tokensFor({ rx: { od_sph: "-1.00", os_sph: "0.00" } }).includes("unequal_refractive_error"));
});

test("investigation thresholds are unchanged", () => {
  assert.ok(tokensFor({ inv: { oct_rnfl_od: "79" } }).includes("RNFL_thinning"));
  assert.ok(!tokensFor({ inv: { oct_rnfl_od: "80" } }).includes("RNFL_thinning"));
  assert.ok(tokensFor({ inv: { vf_md_od: "-4" } }).includes("field_defect"));
  assert.ok(!tokensFor({ inv: { vf_md_od: "-4" } }).includes("visual_field_defect"));
  assert.ok(tokensFor({ inv: { vf_md_od: "-7" } }).includes("visual_field_defect"));
});

test("IOP alert bands quote the same numbers the tokens use", () => {
  /* Before F-4 the alert prose said ">40 mmHg" as a hardcoded string while the
     comparison was a separate literal. Now both come from one row, so the
     message cannot describe a threshold the code does not apply. */
  const out = eng.runCase({ iop: { od: "45", os: "14" } });
  const crit = out.alerts.find((a) => /critically elevated/.test(a.m));
  assert.ok(crit, "critical band must fire at 45");
  assert.ok(crit.m.includes(">" + T.CLINICAL_THRESHOLDS.iop_critical.v + " mmHg"),
    "the message must quote the threshold actually applied: " + crit.m);
});


/* ═══ 5. THE RATCHET — no new hardcoded clinical threshold ═══ */

/* Numbers that are structural, not clinical, and are allowed to stay inline.
   Anything else numeric in the engine's token-derivation region has to come
   from the table. This list is deliberately short and each entry is a fact
   about the code, not about eyes. */
const STRUCTURAL_OK = new Set([
  "0",     /* emptiness, "no value", array index */
  "1",     /* single element, off-by-one */
  "2",     /* pair of eyes, minimum-evidence guard */
  "999",   /* the engine's "not measured" sentinel */
  "99",    /* Van Herick "not measured" sentinel */
  "4",     /* SUN / LOCS grade ceiling used only in Math.min(n, 4) */
  "3",     /* free-text length guard */
  "10",    /* string/array slice lengths */
  "100"
]);

test("the token-derivation stage hardcodes no new clinical number", () => {
  /* Scoped to collectTokens() — the stage where a raw measurement becomes a
     token, and therefore the stage where a hidden number does clinical damage.
     A new threshold added here fails this test until it is declared. */
  const start = ENGINE_SRC.indexOf("function collectTokens");
  assert.ok(start > 0, "collectTokens must exist for this ratchet to mean anything");
  const end = ENGINE_SRC.indexOf("\nfunction ", start + 10);
  const body = ENGINE_SRC.slice(start, end > 0 ? end : ENGINE_SRC.length);

  const offenders = [];
  const lines = body.split("\n");
  lines.forEach((line, i) => {
    if (/^\s*\/[/*]/.test(line) || /^\s*\*/.test(line)) return;      /* comments */
    const stripped = line.replace(/clinThreshold\([^)]*\)/g, "")     /* declared — fine */
                         .replace(/scoreThreshold\([^)]*\)/g, "")
                         .replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
    /* a numeric literal on either side of a comparison operator */
    const cmp = [...stripped.matchAll(/(?:[<>]=?)\s*(-?[0-9]+(?:\.[0-9]+)?)/g)].map((m) => m[1]);
    for (const n of cmp) {
      if (STRUCTURAL_OK.has(n) || STRUCTURAL_OK.has(n.replace(/^-/, ""))) continue;
      offenders.push(`js/engine.js: "${line.trim()}"`);
      break;
    }
  });

  assert.deepStrictEqual(offenders, [],
    "a clinical number is hardcoded in token derivation. Declare it in\n" +
    "knowledge/clinical-thresholds.js and read it with clinThreshold(id, fallback):\n  " +
    offenders.join("\n  "));
});


/* ═══ 6. WIRED INTO BOTH LOAD PATHS ═══ */

test("index.html and the Node loader both load the threshold table before the engine", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  const t = order.indexOf("knowledge/clinical-thresholds.js");
  const e = order.indexOf("js/engine.js");
  assert.ok(t >= 0, "index.html must load knowledge/clinical-thresholds.js");
  assert.ok(t < e, "it must load before the engine that reads it");

  const nodeOrder = require("../tools/lib/kb-load-order").engineOrder();
  assert.ok(nodeOrder.indexOf("knowledge/clinical-thresholds.js") <
            nodeOrder.indexOf("js/engine.js"),
    "the Node loader must agree with the browser");
});
