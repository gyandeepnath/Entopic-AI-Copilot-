/* ═══════════════════════════════════════════════════════════════ */
/* MUTATION TESTING  (Phase 8, §24)                                 */
/*                                                                  */
/*   node tools/mutation-test.js [--target engine] [--limit 40]     */
/*                                                                  */
/* A passing suite proves the tests pass. It does not prove they    */
/* would NOTICE a bug. This breaks the production code on purpose,  */
/* one small change at a time, and runs the tests against each      */
/* broken version.                                                  */
/*                                                                  */
/*   KILLED    — a test failed. The suite would catch that bug.     */
/*   SURVIVED  — every test still passed. THE SUITE HAS A HOLE.     */
/*                                                                  */
/* A survivor is the finding. It means production could contain     */
/* exactly that defect and the build would stay green.              */
/*                                                                  */
/* The mutations are the ones Phase 8 names, and they are the ones  */
/* that matter clinically: a reversed comparison turns "IOP above   */
/* 21" into "below"; an altered threshold moves the line at which a */
/* red flag fires; a removed condition disables a safety gate; a    */
/* flipped sort puts the wrong diagnosis first.                     */
/*                                                                  */
/* NOTHING IS WRITTEN TO THE REPO. Each mutant is applied to a      */
/* scratch copy of the tree, run, and discarded.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const arg = (name, dflt) => {
  const i = process.argv.indexOf("--" + name);
  return i >= 0 ? process.argv[i + 1] : dflt;
};
const LIMIT = parseInt(arg("limit", "60"), 10);
const TARGET = arg("target", "engine");

/* What to break, and which tests must notice.

   The test subset is deliberately NOT the whole suite: a full run per mutant
   would take hours, and the question here is whether the tests that CLAIM to
   cover this behaviour actually do. If a mutation survives its own subset,
   that subset has a hole regardless of what the rest of the suite does. */
const TARGETS = {
  engine: {
    files: ["js/engine.js", "js/engine-exclusions.js"],
    /* EVERY engine-behaviour test, not a hand-picked subset.

       The first version of this list omitted engine-reachability.test.js, and
       the omission produced a FALSE HOLE: disabling the route-activation loop
       (engine.js ~1022) was reported as a survivor because none of the chosen
       tests exercised it — yet engine-reachability catches it decisively. A
       mutation tool that runs an incomplete subset manufactures holes that do
       not exist, which is the same false confidence, inverted. The subset is
       now the full clinical-engine surface. Slower per mutant; honest. */
    tests: ["tests/engine-golden.test.js", "tests/engine-exclusions.test.js",
            "tests/engine-reachability.test.js", "tests/engine-new-conditions.test.js",
            "tests/engine-structured-fields.test.js", "tests/engine-problem-foci.test.js",
            "tests/engine-freetext.test.js", "tests/engine-next-tests.test.js",
            "tests/common-conditions.test.js", "tests/derived-alerts.test.js",
            "tests/clinical-contradictions.test.js", "tests/evidence-gate.test.js",
            "tests/red-flags.test.js", "tests/red-flag-wording.test.js",
            "tests/alert-specificity.test.js", "tests/engine-history.test.js"]
  },
  storage: {
    files: ["js/storage.js", "js/visit-store.js"],
    tests: ["tests/storage-read-isolation.test.js", "tests/visit-store.test.js",
            "tests/corruption-recovery.test.js", "tests/backend-integrity.test.js",
            "tests/concurrent-writers.test.js"]
  },
  archive: {
    files: ["js/storage-archive.js", "js/storage-archive-auto.js"],
    tests: ["tests/storage-archive.test.js", "tests/storage-archive-auto.test.js"]
  }
};

const spec = TARGETS[TARGET];
if (!spec) {
  console.error("unknown target " + TARGET + "; choose one of " + Object.keys(TARGETS).join(", "));
  process.exit(2);
}

/* ── the mutation catalogue ─────────────────────────────────────── */

/* Each returns a list of {line, from, to, kind} for one source file.
   Comments and strings are skipped — mutating a comment proves nothing, and
   mutating a clinician-facing string is a different (worthwhile) test. */
function mutationsFor(src) {
  const lines = src.split("\n");
  const out = [];
  let inBlockComment = false;

  const push = (i, from, to, kind) => out.push({ line: i, from, to, kind });

  for (let i = 0; i < lines.length; i++) {
    let L = lines[i];

    if (inBlockComment) { if (L.indexOf("*/") >= 0) inBlockComment = false; continue; }
    const bc = L.indexOf("/*");
    if (bc >= 0 && L.indexOf("*/", bc) < 0) { inBlockComment = true; continue; }
    if (/^\s*(\/\/|\/\*|\*)/.test(L)) continue;
    /* Strip trailing comments and string contents so we do not mutate prose. */
    const code = L.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(["'`]).*?\1/g, '""');
    if (!code.trim()) continue;

    /* 1. REVERSED COMPARISONS — "IOP above 21" becomes "below". */
    for (const [a, b] of [[">=", "<"], ["<=", ">"], [" > ", " < "], [" < ", " > "]]) {
      if (code.indexOf(a) >= 0) { push(i, a, b, "comparison"); break; }
    }

    /* 2. ALTERED THRESHOLDS — the line at which a rule fires moves. */
    const num = /(?<![\w.])(\d+(?:\.\d+)?)(?![\w.])/.exec(code);
    if (num && !/^\s*(?:var|let|const)?\s*(?:for|while)\b/.test(code)) {
      const v = parseFloat(num[1]);
      /* 0 and 1 are usually structural (indexes, flags), not clinical lines. */
      if (v !== 0 && v !== 1 && v < 100000) {
        push(i, num[1], String(v > 2 ? v - 1 : v + 1), "threshold");
      }
    }

    /* 3. REMOVED CONDITION — a guard or safety gate stops applying.

       Prefixing `false && ` only disables a condition that has no top-level
       `||`: JavaScript binds && tighter than ||, so `if (false && !v || !v.id)`
       is `(false && !v) || !v.id` — the guard still fires, the mutant is
       equivalent by construction, and it shows up as a survivor that means
       nothing. Two visit-store guards were reported that way before this was
       noticed. Skipping them is honest; reporting them is noise. */
    if (/^\s*if\s*\(/.test(code) && !/\breturn\b.*\bfunction\b/.test(code) &&
        code.indexOf("||") < 0) {
      push(i, "if (", "if (false && ", "removed-condition");
    }

    /* 4. NEGATED CONDITION — the guard applies exactly backwards. */
    if (/^\s*if\s*\(!/.test(code)) push(i, "if (!", "if (", "negated-condition");

    /* 5. FLIPPED RANKING — the differential comes back in the wrong order. */
    if (/\.sort\(/.test(code)) push(i, ".sort(", ".reverse().sort(", "ranking");

    /* 6. WEAKENED BOOLEAN — && becomes ||, so one condition suffices. */
    if (code.indexOf("&&") >= 0) push(i, "&&", "||", "boolean");
  }
  return out;
}

/* ── the runner ─────────────────────────────────────────────────── */

const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "entopic-mut-"));
process.on("exit", () => { try { fs.rmSync(scratch, { recursive: true, force: true }); } catch (e) {} });

/* Copy the tree once; each mutant only rewrites the one file it changes. */
function copyTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const s = path.join(from, e.name), d = path.join(to, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else fs.copyFileSync(s, d);
  }
}
copyTree(ROOT, scratch);

const originals = {};
for (const f of spec.files) originals[f] = fs.readFileSync(path.join(ROOT, f), "utf8");

function runTests() {
  try {
    execFileSync(process.execPath, ["--test", ...spec.tests],
      { cwd: scratch, stdio: "pipe", timeout: 180000 });
    return true;      /* everything passed — the mutant SURVIVED */
  } catch (e) {
    return false;     /* something failed — the mutant was KILLED */
  }
}

/* Sanity: the unmutated tree must pass, or every result is meaningless. */
process.stdout.write("baseline… ");
if (!runTests()) {
  console.error("FAILED. The chosen tests do not pass on unmodified source; " +
                "mutation results would be noise. Fix the suite first.");
  process.exit(2);
}
console.log("green\n");

/* Collect and sample the mutants deterministically — a fixed stride rather
   than Math.random(), so a run is reproducible and a survivor can be
   re-checked by anyone. */
let all = [];
for (const f of spec.files) {
  for (const m of mutationsFor(originals[f])) all.push({ file: f, ...m });
}
const stride = Math.max(1, Math.floor(all.length / LIMIT));
const chosen = all.filter((_, i) => i % stride === 0).slice(0, LIMIT);

console.log("target: " + TARGET);
console.log(spec.files.join(", ") + " — " + all.length + " possible mutations, testing " +
            chosen.length + " (stride " + stride + ")");
console.log(spec.tests.length + " test files per mutant\n");

const survivors = [];
let killed = 0, invalid = 0;

chosen.forEach((m, n) => {
  const lines = originals[m.file].split("\n");
  const before = lines[m.line];
  if (before.indexOf(m.from) < 0) { invalid++; return; }
  lines[m.line] = before.replace(m.from, m.to);
  fs.writeFileSync(path.join(scratch, m.file), lines.join("\n"));

  const survived = runTests();
  fs.writeFileSync(path.join(scratch, m.file), originals[m.file]);   /* restore */

  const tag = m.file + ":" + (m.line + 1);
  if (survived) {
    survivors.push({ ...m, code: before.trim() });
    console.log("  SURVIVED  " + tag + "  [" + m.kind + "]  " + before.trim().slice(0, 84));
  } else {
    killed++;
    if (process.argv.includes("--verbose")) console.log("  killed    " + tag + "  [" + m.kind + "]");
  }
  if ((n + 1) % 10 === 0) process.stdout.write("    … " + (n + 1) + "/" + chosen.length + "\n");
});

const tested = killed + survivors.length;

/* ── STAGE 2: which survivors actually MATTER ──

   A raw mutation score is a misleading number, and reporting one without this
   stage would be exactly the false confidence Phase 8 exists to find. Many
   survivors are EQUIVALENT MUTANTS: the change compiles, runs, and produces
   identical output, so no test could possibly have caught it and none should.

   Measured here rather than argued: the first engine run scored 8%, and of the
   four most safety-relevant survivors, three turned out to be equivalent —
   removing the zero-token guard, removing an urgent-route `break`, and
   loosening the context-only lookup all left every probe case byte-identical.
   The fourth was a genuine hole.

   So each survivor is re-run against clinical probe cases. If the output moves,
   it is a REAL HOLE: production could contain that defect with a green build.
   If nothing moves, it is noise and is reported separately. */
const probeSurvivors = (TARGET === "engine" || TARGET === "storage") &&
                       !process.argv.includes("--no-probe");
const realHoles = [], equivalent = [];

/* ── STORAGE PROBE ──
   Parallel to the engine probe: run a battery of storage OPERATIONS against
   baseline and against each mutant, and classify a survivor as a real hole
   only if an observable outcome changed. Each scenario runs in its OWN fresh
   sandbox because several of them corrupt or exhaust the store on purpose and
   must not bleed into the next. The signatures are exactly the things a
   clinician's data safety depends on: what reads back, whether corruption is
   caught, whether a refused write stays refused. */
if (probeSurvivors && TARGET === "storage" && survivors.length) {
  console.log("\nchecking which survivors change storage behaviour…");
  const vm = require("vm");

  function makeCtx(overrideFile, overrideSrc, budget) {
    const mem = {};
    let used = () => Object.keys(mem).reduce((n, k) => n + k.length + mem[k].length, 0);
    const ctx = {
      localStorage: {
        get length() { return Object.keys(mem).length; },
        key: (i) => Object.keys(mem)[i] ?? null,
        getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
        setItem: (k, v) => {
          v = String(v);
          if (budget && used() - (mem[k] ? mem[k].length : 0) + v.length > budget) {
            const e = new Error("quota"); e.name = "QuotaExceededError"; throw e;
          }
          mem[k] = v;
        },
        removeItem: (k) => { delete mem[k]; }
      },
      console: { log() {}, warn() {}, info() {}, error() {} },
      JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
      parseInt, parseFloat, isNaN, isFinite, Boolean,
      setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; }, clearTimeout: () => {},
      module: { exports: {} }, evEmit: () => {}, lsSet: (k, v) => { try { mem[k] = String(v); return true; } catch (e) { return false; } },
      alert: () => {}, logAudit: () => {}
    };
    vm.createContext(ctx);
    for (const f of ["js/data-classification.js", "js/storage.js", "js/visit-store.js"]) {
      const s = (f === overrideFile) ? overrideSrc : fs.readFileSync(path.join(ROOT, f), "utf8");
      vm.runInContext(s, ctx, { filename: f });
    }
    vm.runInContext("logAudit = function () {};", ctx);
    return ctx;
  }
  const SEED = `saveVisits([
    {id:"v1",patient_id:"p1",date:"2026-03-01",status:"completed",updated:"2026-03-01",data:{id:"v1",final_dx:"A"}},
    {id:"v2",patient_id:"p1",date:"2026-01-01",status:"completed",updated:"2026-01-01",data:{id:"v2",final_dx:"B"}},
    {id:"v3",patient_id:"p2",date:"2026-02-01",status:"completed",updated:"2026-02-01",data:{id:"v3",final_dx:"C"}}]);
    savePatients([{id:"p1",first_name:"Ann",updated:"2026-01-01"},{id:"p2",first_name:"Bob",updated:"2026-01-01"}]);`;

  /* Each scenario: a fresh ctx (optionally with a budget), a script, and a
     signature expression. Named so a real hole says which behaviour moved. */
  const SCENARIOS = {
    "round-trip": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED); r("visitStoreSplitNow();");
      const n = r("loadVisits().length");
      const pv1 = r('getPatientVisits("p1").map(function(v){return v.id;}).join(",")');
      const last1 = r('(getLastVisit("p1")||{}).id'), last2 = r('(getLastVisit("p2")||{}).id');
      /* Corruption is checked IMMEDIATELY after a chart read, with NO
         intervening index read. storageNoteReadOk clears the flag on the next
         clean read, so a trailing loadVisits() would MASK a &&->|| mutation
         (line 230) that spuriously flags corruption on a healthy read. The
         probe first missed exactly this, reporting 100% falsely. The
         observable consequence is a write refused right after opening a chart. */
      r('getPatientVisits("p1");');
      const corruptAfterChart = r('storageIsCorrupt("visit_index")');
      r('getPatientVisits("p1");');
      const writeAfterChart = r('saveVisits(loadVisits())');
      return "n=" + n + " pv1=" + pv1 + " last1=" + last1 + " last2=" + last2 +
             " corruptAfterChart=" + corruptAfterChart + " writeAfterChart=" + writeAfterChart; } },
    "do-save": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED); r("visitStoreSplitNow();");
      r('CP="p1";CV="v1";P={id:"p1",first_name:"Ann"};V={id:"v1",final_dx:"A",cc:"typed here"};setVisitSeenStamp(null);');
      const ds = r("doSave()");
      return "ok=" + ds.ok + " reason=" + (ds.reason||"") +
             " saved=" + r('(getPatientVisits("p1").filter(function(v){return v.id==="v1";})[0]||{data:{}}).data.cc'); } },
    /* Adds a BRAND-NEW visit through visitRecordSave — the at<0 index branch.
       This scenario was ADDED after the probe's first run reported 100% while
       a hand-check found a real hole here: a probe that never exercises a
       branch cannot classify a mutation of it, exactly as an incomplete test
       subset cannot (V8-12). */
    "new-record": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED); r("visitStoreSplitNow();");
      let ok; try { ok = r('visitRecordSave({id:"vNEW",patient_id:"p1",date:"2026-06-01",status:"completed",data:{id:"vNEW"}})'); }
      catch (e) { ok = "THREW"; }
      return "ok=" + ok + " n=" + r("loadVisits().length") +
             " indexed=" + r('(visitIndexLoad()||[]).some(function(e){return e.id==="vNEW";})') +
             " inChart=" + r('getPatientVisits("p1").some(function(v){return v.id==="vNEW";})'); } },
    "corrupt-index": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED); r("visitStoreSplitNow();");
      r('localStorage.setItem("entopic_visit_index","[{bad");'); r("loadVisits();");
      return "corrupt=" + r('storageIsCorrupt("visit_index")') +
             " n=" + r("loadVisits().length") +
             " writeRefused=" + r('saveVisits([{id:"x",patient_id:"p1",data:{}}])'); } },
    "missing-record": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED); r("visitStoreSplitNow();");
      r('localStorage.removeItem("entopic_visit_v2");');
      const n = r("loadVisits().length");
      return "n=" + n + " corrupt=" + r('storageIsCorrupt("visit_index")'); } },
    "quota": { budget: 2600, run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      let seeded; try { seeded = r('saveVisits([{id:"v1",patient_id:"p1",date:"2026-01-01",status:"completed",data:{id:"v1"}}]);'); } catch (e) { seeded = "threw"; }
      let ok; try { ok = r('saveVisits(loadVisits().concat([{id:"big",patient_id:"p1",data:{pad:"x".repeat(50000)}}]));'); } catch (e) { ok = "threw"; }
      return "seeded=" + seeded + " oversize=" + ok + " n=" + r("loadVisits().length") +
             " failFlag=" + (r("storageWriteFailure()") ? "set" : "null"); } },
    "corrupt-patients": { run: (c) => {
      const r = (e) => vm.runInContext(e, c);
      r(SEED);
      r('localStorage.setItem("entopic_patients","{not a list");'); r("loadPatients();");
      return "corrupt=" + r('storageIsCorrupt("patients")') + " n=" + r("loadPatients().length"); } }
  };

  function sigFor(overrideFile, overrideSrc) {
    const out = {};
    for (const k of Object.keys(SCENARIOS)) {
      const sc = SCENARIOS[k];
      try {
        const ctx = makeCtx(overrideFile, overrideSrc, sc.budget);
        out[k] = sc.run(ctx);
      } catch (e) { out[k] = "THREW:" + (e.message || e); }
    }
    return out;
  }

  const baseSig = sigFor(null, null);
  for (const s of survivors) {
    const L = originals[s.file].split("\n");
    L[s.line] = L[s.line].replace(s.from, s.to);
    let mutSig;
    try { mutSig = sigFor(s.file, L.join("\n")); }
    catch (e) { realHoles.push({ ...s, why: "the mutant fails to load and no test noticed" }); continue; }
    const moved = Object.keys(baseSig).filter((k) => baseSig[k] !== mutSig[k]);
    if (moved.length) realHoles.push({ ...s, why: "changes: " + moved.join(", ") });
    else equivalent.push(s);
  }
}

if (probeSurvivors && TARGET === "engine" && survivors.length) {
  console.log("\nchecking which survivors change clinical output…");
  const vm = require("vm");
  const { LOAD_ORDER } = require(path.join(ROOT, "tools/lib/load-engine"));

  /* Deliberately broad: red flags, a routine presentation, an empty record,
     and single-symptom cases, because several real holes only show on input
     the golden vignettes never send. */
  const PROBES = {
    "no evidence":      [{}, { age: "50" }],
    "dry eye":          [{ symptoms: ["dryness", "burning", "grittiness"] }, { age: "45" }],
    "flashes only":     [{ symptoms: ["flashes"] }, { age: "60" }],
    "floaters only":    [{ symptoms: ["floaters"] }, { age: "60" }],
    "flashes+floaters": [{ symptoms: ["flashes", "floaters"] }, { age: "60" }],
    "RAPD":             [{ pupil: { rapd: "od" } }, { age: "60" }],
    "high IOP":         [{ iop: { od: "34", os: "31" } }, { age: "62" }],
    "borderline IOP":   [{ iop: { od: "22", os: "21" } }, { age: "62" }],
    "hypopyon":         [{ sl: { findings: ["Hypopyon"] } }, { age: "40" }],
    "glaucoma suspect": [{ iop: { od: "26" }, fun: { od: { cd_v: "0.7" } },
                           inv: { vf_md_od: "-4.5" }, hxF: { glaucoma: true } }, { age: "58" }],
    "cataract":         [{ symptoms: ["gradual_blur", "glare"], sl: { od: { ns: "3" } } }, { age: "70" }],
    "paediatric":       [{ symptoms: ["blur"], va: { od_dist: "6/18" } }, { age: "7" }]
  };

  function engineFrom(overrideFile, overrideSrc) {
    const sb = { console: { log() {}, warn() {}, error() {} } };
    const ctx = vm.createContext(sb);
    for (const f of LOAD_ORDER) {
      const s = (f === overrideFile) ? overrideSrc : fs.readFileSync(path.join(ROOT, f), "utf8");
      vm.runInContext(s, ctx, { filename: f });
    }
    return ctx;
  }
  function outcome(ctx, vo, po) {
    const V = vm.runInContext("blankVisit()", ctx);
    const P = vm.runInContext('blankPatient("t","M")', ctx);
    const merge = (t, o) => {
      for (const k of Object.keys(o)) {
        const v = o[k];
        if (v && typeof v === "object" && !Array.isArray(v) &&
            t[k] && typeof t[k] === "object" && !Array.isArray(t[k])) merge(t[k], v);
        else t[k] = v;
      }
      return t;
    };
    merge(V, vo); merge(P, po);
    ctx.V = V; ctx.P = P;
    vm.runInContext("runDiagnosticEngine()", ctx);
    return Array.from(V.dxList, (d) => d.n + "@" + d.prob.toFixed(3)).join("|") + " ## " +
           Array.from(V.alerts, (a) => a.l + ":" + a.m).join("|");
  }

  const baseCtx = engineFrom(null, null);
  const baseline = {};
  for (const k of Object.keys(PROBES)) baseline[k] = outcome(baseCtx, ...PROBES[k]);

  for (const s of survivors) {
    const L = originals[s.file].split("\n");
    L[s.line] = L[s.line].replace(s.from, s.to);
    let ctx;
    try { ctx = engineFrom(s.file, L.join("\n")); }
    catch (e) { realHoles.push({ ...s, why: "the mutant fails to load and no test noticed" }); continue; }

    const moved = [];
    for (const k of Object.keys(PROBES)) {
      let got;
      try { got = outcome(ctx, ...PROBES[k]); }
      catch (e) { moved.push(k + ": THREW " + (e.message || e)); continue; }
      if (got !== baseline[k]) moved.push(k);
    }
    if (moved.length) realHoles.push({ ...s, why: "changes: " + moved.slice(0, 4).join(", ") });
    else equivalent.push(s);
  }
}

console.log("\n" + "═".repeat(66));
console.log("mutants: " + tested + "   killed: " + killed + "   survived: " + survivors.length +
            (invalid ? "   (skipped " + invalid + " unapplicable)" : ""));

if (probeSurvivors && survivors.length) {
  const meaningful = killed + realHoles.length;
  console.log("of the survivors: " + realHoles.length + " change clinical output (REAL HOLES), " +
              equivalent.length + " are equivalent mutants (no test could catch them)");
  if (meaningful) {
    console.log("\nmutation score, equivalent mutants excluded: " +
                Math.round(100 * killed / meaningful) + "%   (" + killed + " of " + meaningful + ")");
  }
  if (realHoles.length) {
    console.log("\n── REAL HOLES ── production could contain these with a green build:\n");
    realHoles.forEach((s, i) => {
      console.log("  " + (i + 1) + ". " + s.file + ":" + (s.line + 1) + "  [" + s.kind + "]  " +
                  JSON.stringify(s.from) + " -> " + JSON.stringify(s.to));
      console.log("     " + s.code.slice(0, 96));
      console.log("     " + s.why + "\n");
    });
  }
} else if (tested) {
  console.log("mutation score: " + Math.round(100 * killed / tested) +
              "%  (equivalent mutants NOT excluded — treat as a lower bound)");
  survivors.forEach((s, i) => {
    console.log("  " + (i + 1) + ". " + s.file + ":" + (s.line + 1) + "  [" + s.kind + "]  " +
                s.code.slice(0, 90));
  });
}
console.log("═".repeat(66));
