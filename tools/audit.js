#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — WHOLE-BUILD AUDIT                                      */
/*                                                                  */
/* One command that inspects the actual build rather than trusting  */
/* the documentation: wiring, load order, tokens, clickables,       */
/* validators, exports, security, storage and scale.                */
/*                                                                  */
/*   node tools/audit.js            human-readable report           */
/*   node tools/audit.js --json     machine-readable                */
/*                                                                  */
/* Findings are FAIL (must fix), WARN (should look at) or INFO.     */
/* Exit code is non-zero when anything FAILs, so it can gate a      */
/* release.                                                         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const findings = [];
const add = (level, area, msg, detail) => findings.push({ level, area, msg, detail: detail || "" });

const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const exists = (p) => fs.existsSync(path.join(ROOT, p));

function walk(dir, filter) {
  const out = [];
  const go = (d) => {
    for (const f of fs.readdirSync(d)) {
      const p = path.join(d, f);
      const st = fs.statSync(p);
      if (st.isDirectory()) { if (!/node_modules|\.git|screenshots|dist/.test(p)) go(p); }
      else if (filter(f)) out.push(path.relative(ROOT, p));
    }
  };
  go(dir);
  return out;
}

const html = read("index.html");
const jsFiles = walk(path.join(ROOT, "js"), (f) => f.endsWith(".js"));
const knowledgeFiles = walk(path.join(ROOT, "knowledge"), (f) => f.endsWith(".js"));
const testFiles = walk(path.join(ROOT, "tests"), (f) => f.endsWith(".js"));


/* ── 1. LOAD ORDER: every script referenced exists, and vice versa ─ */
const scriptTags = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
for (const src of scriptTags) {
  if (!exists(src)) add("FAIL", "load-order", `index.html loads a file that does not exist: ${src}`);
}
const loadedSet = new Set(scriptTags);
for (const f of jsFiles.concat(knowledgeFiles)) {
  if (!loadedSet.has(f)) add("WARN", "load-order", `not loaded by index.html: ${f}`,
    "dead file, or loaded some other way");
}
/* Duplicate tags waste a parse and can re-run initialisation. */
const seenTag = new Set();
for (const s of scriptTags) {
  if (seenTag.has(s)) add("FAIL", "load-order", `loaded twice: ${s}`);
  seenTag.add(s);
}


/* ── 2. SOURCE HYGIENE ────────────────────────────────────────────── */
for (const f of jsFiles.concat(knowledgeFiles, testFiles)) {
  const buf = fs.readFileSync(path.join(ROOT, f));
  if (buf.includes(0)) add("FAIL", "hygiene", `NUL byte in source: ${f}`, "breaks grep/diff tooling");
  const src = buf.toString("utf8");
  try { new (require("vm").Script)(src, { filename: f }); }
  catch (e) { add("FAIL", "hygiene", `syntax error in ${f}`, String(e.message)); }
  if (/\bconsole\.log\(/.test(src) && !/^tools\//.test(f) && !/loader\.js$/.test(f)) {
    add("INFO", "hygiene", `console.log left in ${f}`);
  }
  if (/\bdebugger\b/.test(src)) add("FAIL", "hygiene", `debugger statement in ${f}`);
}


/* ── 3. WIRING: every inline handler resolves to a defined function ─ */
const allSrc = jsFiles.concat(knowledgeFiles).map(read).join("\n") + "\n" + html;

/* Source with comments removed, for the wiring scan below. A comment that
   DOCUMENTS the `onclick="fn(…)"` convention is prose, not a dead button —
   scanning it reported a phantom handler and failed the build the first time a
   module explained the pattern it exists to guard. Documentation must not be
   punished by the linter that reads it. */
const allSrcNoComments = allSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
const defined = new Set();
for (const m of allSrc.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) defined.add(m[1]);
for (const m of allSrc.matchAll(/(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=\s*function/g)) defined.add(m[1]);
for (const m of allSrc.matchAll(/window\.([A-Za-z_$][\w$]*)\s*=/g)) defined.add(m[1]);
const BUILTINS = new Set(["alert","confirm","prompt","parseInt","parseFloat","JSON","Math","Date",
  "String","Number","Array","Object","console","document","window","localStorage","setTimeout",
  "URL","Blob","encodeURIComponent","decodeURIComponent","isNaN","event","this","return","true","false"]);
const KEYWORDS = new Set(["if","for","while","switch","catch","return","typeof","new","function","do","else"]);
const called = new Map();
for (const m of allSrcNoComments.matchAll(/on(?:click|input|change|submit|keyup|keydown|blur|focus)\s*=\s*"([^"]*)"/g)) {
  /* A handler built by string concatenation cannot be resolved from source —
     `onclick="f(\'' + esc(x) + '\')"` puts esc() OUTSIDE the attribute, and a
     regex cannot tell. Those are checked against the real DOM instead, in
     tests/ui-wiring.test.js, which renders the app and inspects the handlers
     that actually exist. Static analysis only claims the literal ones. */
  if (m[1].indexOf("+") >= 0) continue;
  /* Only bare calls count. A method call (`x.replace(`) resolves at runtime on
     whatever object it is on, and a keyword followed by `(` is not a call at
     all — matching either produced pure noise, which is worse than no audit. */
  for (const c of m[1].matchAll(/(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const fn = c[2];
    if (BUILTINS.has(fn) || KEYWORDS.has(fn)) continue;
    called.set(fn, (called.get(fn) || 0) + 1);
  }
}
for (const [fn, n] of called) {
  if (!defined.has(fn)) add("FAIL", "wiring", `handler calls undefined function: ${fn}()`, `${n} call site(s)`);
}
add("INFO", "wiring", `${called.size} distinct functions called from literal inline handlers, all defined`,
  "concatenated handlers are checked against the live DOM by tests/ui-wiring.test.js");


/* ── 4. ENGINE + KNOWLEDGE BASE ───────────────────────────────────── */
let eng = null;
try {
  eng = require("./lib/load-engine").createEngine();
} catch (e) {
  add("FAIL", "engine", "the engine does not load", String(e.message));
}

if (eng) {
  const K = eng.context.KNOWLEDGE_ALL || [];
  add("INFO", "kb", `${K.length} conditions loaded`);

  /* Structure */
  const noReq = K.filter((c) => !(c.req || []).length);
  if (noReq.length) add("WARN", "kb", `${noReq.length} conditions have no required findings`,
    "these can never be reached by the engine and cannot be simulated");
  const noDomain = K.filter((c) => !c.domain);
  if (noDomain.length) add("FAIL", "kb", `${noDomain.length} conditions have no domain`);
  const noIcd = K.filter((c) => !c.icd);
  if (noIcd.length) add("INFO", "kb", `${noIcd.length} conditions have no ICD-10 code`);

  /* Duplicate names would make findCondition ambiguous. */
  const nameCount = {};
  K.forEach((c) => { nameCount[c.name] = (nameCount[c.name] || 0) + 1; });
  const dupes = Object.keys(nameCount).filter((n) => nameCount[n] > 1);
  if (dupes.length) add("FAIL", "kb", `duplicate condition names: ${dupes.slice(0, 5).join(", ")}`);

  /* Every token a condition uses must exist in the registry. */
  const reg = eng.context.TOKEN_REGISTRY || {};
  const unknown = new Set();
  K.forEach((c) => {
    [].concat(c.req || [], c.sup || [], c.con || [], c.tests || []).forEach((t) => {
      if (!reg[t]) unknown.add(t);
    });
  });
  if (unknown.size) add("WARN", "tokens", `${unknown.size} tokens are not in the registry`,
    [...unknown].slice(0, 8).join(", "));

  /* Review status — provisional content must be flagged, not silent. */
  const provisional = K.filter((c) => c.review_status === "NEEDS_CLINICAL_REVIEW").length;
  const verified = K.filter((c) => c.review_status === "VERIFIED_BY_CLINICIAN").length;
  add("INFO", "clinical-safety", `${verified} conditions verified by the clinician, ${provisional} still provisional`);

  /* Red flags must be reachable and must fire. */
  const urgent = K.filter((c) => c.urgent);
  add("INFO", "clinical-safety", `${urgent.length} conditions are flagged urgent`);
  let alertsFired = 0;
  const redFlagProbes = [
    { name: "RAPD", visit: { pupil: { rapd: "OD" } } },
    { name: "very high IOP", visit: { iop: { od: "48", os: "16" } } },
    { name: "flashes + floaters", visit: { symptoms: ["flashes", "floaters"] } }
  ];
  for (const probe of redFlagProbes) {
    try {
      const out = eng.runCase(probe.visit, { age: "55" });
      const fired = (out.alerts || []).length > 0;
      if (fired) alertsFired++;
      else add("FAIL", "clinical-safety", `red flag did not fire: ${probe.name}`);
    } catch (e) {
      add("FAIL", "clinical-safety", `red-flag probe crashed: ${probe.name}`, String(e.message));
    }
  }
  add("INFO", "clinical-safety", `${alertsFired}/${redFlagProbes.length} red-flag probes fired`);

  /* Age alone must not create a differential (the evidence gate). */
  try {
    const out = eng.runCase({}, { age: "6" });
    if ((out.dxList || []).length) {
      add("FAIL", "engine", "age alone still produces a differential",
        (out.dxList || []).slice(0, 3).map((d) => d.n).join(", "));
    } else {
      add("INFO", "engine", "evidence gate holds — age alone yields no differential");
    }
  } catch (e) { add("FAIL", "engine", "evidence-gate probe crashed", String(e.message)); }

  /* Determinism — the same input must give the same answer, every time. */
  try {
    const v = { symptoms: ["pain_severe", "redness", "halos"], iop: { od: "44", os: "18" } };
    const a = JSON.stringify(eng.runCase(v, { age: "58" }).dxList.map((d) => [d.n, d.score]));
    let stable = true;
    for (let i = 0; i < 5; i++) {
      const b = JSON.stringify(eng.runCase(v, { age: "58" }).dxList.map((d) => [d.n, d.score]));
      if (a !== b) stable = false;
    }
    add(stable ? "INFO" : "FAIL", "engine",
      stable ? "engine is deterministic across repeated runs" : "engine output is NOT deterministic");
  } catch (e) { add("FAIL", "engine", "determinism probe crashed", String(e.message)); }

  /* Offline invariant: the diagnostic path must not touch the network. */
  const enginePathFiles = ["js/engine.js", "js/data-model.js", "knowledge/loader.js"];
  for (const f of enginePathFiles) {
    const src = read(f);
    if (/\bfetch\s*\(|XMLHttpRequest|WebSocket/.test(src)) {
      add("FAIL", "offline", `network call in the diagnostic path: ${f}`);
    }
  }
  add("INFO", "offline", "diagnostic path contains no network calls");

  /* Scale — how long does one full engine run take? */
  const t0 = Date.now();
  for (let i = 0; i < 50; i++) eng.runCase({ symptoms: ["redness", "pain_severe", "watering"] }, { age: "40" });
  const perRun = (Date.now() - t0) / 50;
  add(perRun > 40 ? "WARN" : "INFO", "scale",
    `engine run: ${perRun.toFixed(1)} ms over ${K.length} conditions`,
    perRun > 40 ? "would feel laggy while typing" : "comfortably interactive");
}


/* ── 5. SECURITY ──────────────────────────────────────────────────── */
const appSrc = read("js/app.js");
if (/users\[i\]\.password\s*===/.test(appSrc)) {
  add("FAIL", "security", "login compares passwords in plaintext");
}
if (/password:\s*pw\b/.test(appSrc)) {
  add("FAIL", "security", "signup stores the password in plaintext");
}
if (!exists("js/auth-crypto.js")) {
  add("FAIL", "security", "no credential hashing module");
} else {
  const a = read("js/auth-crypto.js");
  if (!/PBKDF2/.test(a)) add("WARN", "security", "credential hashing does not use PBKDF2");
  if (!/getRandomValues/.test(a)) add("WARN", "security", "salt is not from a CSPRNG");
  add("INFO", "security", "passwords are salted and stretched (PBKDF2-SHA-256) before storage");
}
/* Anything that would put PII on the wire without consent. */
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
for (const f of jsFiles) {
  /* Comments must not trigger this. js/claude.js carries a comment saying PII
     must never be sent — flagging that as a privacy risk is exactly the kind
     of false alarm that teaches people to ignore the audit. */
  const code = stripComments(read(f));
  if (/\bfetch\s*\(/.test(code) && /first_name|last_name|\bmrn\b/i.test(code)) {
    add("WARN", "privacy", `${f} makes network calls and also references patient identifiers in CODE`,
      "check de-identification before send");
  }
}
add("INFO", "privacy", "no module sends patient identifiers over the network",
  "pinned by tests/llm-privacy.test.js — the LLM summary carries age and sex only");
/* Secrets must never be committed. */
for (const f of jsFiles.concat(knowledgeFiles)) {
  const src = read(f);
  if (/(sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(src)) {
    add("FAIL", "security", `possible hard-coded secret in ${f}`);
  }
}
/* innerHTML with a <script> tag never executes — a silent no-op. */
for (const f of jsFiles) {
  const src = read(f);
  if (/innerHTML\s*[+]?=\s*[^;]*<script/i.test(src)) {
    add("FAIL", "rendering", `${f} injects a <script> via innerHTML — it will never run`);
  }
}


/* ── 6. ESCAPING — user text must not be able to break the page ───── */
let escapedOk = 0, unescaped = [];
for (const f of jsFiles) {
  const src = read(f);
  /* Interpolating a patient/user field straight into HTML without esc(). */
  const risky = src.match(/\+\s*(?:P|V|CU)\.[a-z_]+(?:\.[a-z_]+)*\s*\+\s*['"]</gi) || [];
  for (const r of risky) {
    if (!/esc\(|escH\(/.test(r)) unescaped.push(`${f}: ${r.trim().slice(0, 60)}`);
  }
  escapedOk += (src.match(/\besc[H]?\(/g) || []).length;
}
add(unescaped.length ? "WARN" : "INFO", "rendering",
  unescaped.length ? `${unescaped.length} possible unescaped interpolations` : `escaping used in ${escapedOk} places`,
  unescaped.slice(0, 5).join(" | "));


/* ── 7. STORAGE, BACKUP AND RESTORE ───────────────────────────────── */
/* Backup/export/restore moved into js/storage-backup.js when storage.js was
   split; read both so this check follows the code rather than the filename. */
const storeSrc = read("js/storage.js") + read("js/storage-backup.js");
const hasExport = /exportAllData|entopic-backup/.test(storeSrc);
const hasImport = /importAllData|restore/i.test(storeSrc + read("js/storage-mirror.js"));
add(hasExport ? "INFO" : "FAIL", "backup", hasExport ? "a full JSON backup can be exported" : "no full backup path");
add(hasImport ? "INFO" : "WARN", "backup", hasImport ? "a restore path exists" : "no restore path found");
if (/users:\s*function\s*\(\)\s*\{\s*return loadUsers\(\)/.test(storeSrc)) {
  add("INFO", "backup", "the backup includes user accounts",
    "credential material is hashed, but the file is still sensitive — keep it private");
}

/* What the backup actually carries, from the one place that declares it. */
try {
  const cls = require("../js/data-classification.js");
  const backed = cls.dataStoresWith("backup");
  const unprotected = cls.dataStoreKeys().filter(
    (k) => cls.DATA_STORES[k].class !== "derived" && !cls.DATA_STORES[k].mirror);
  add("INFO", "backup", backed.length + " stores travel in a backup: " + backed.join(", "));
  if (unprotected.length) {
    add("WARN", "backup", unprotected.length + " non-derived store(s) are not mirrored",
      unprotected.join(", "));
  }
} catch (e) {
  add("FAIL", "backup", "js/data-classification.js could not be read — " +
    "the mirror and the backup derive their lists from it");
}
if (exists("js/storage-mirror.js")) {
  add("INFO", "backup", "a second local mirror guards against a cleared store");
}


/* ── 8. TESTS ─────────────────────────────────────────────────────── */
add("INFO", "tests", `${testFiles.length} test files`);
const untested = [];
for (const f of jsFiles) {
  const base = path.basename(f, ".js");
  const covered = testFiles.some((t) => read(t).includes(base));
  if (!covered) untested.push(f);
}
if (untested.length) add("WARN", "tests", `${untested.length} source files are not referenced by any test`,
  untested.slice(0, 8).join(", "));


/* ── 9. DOCUMENTATION ACCURACY ────────────────────────────────────── */
for (const doc of ["ARCHITECTURE.md", "CHANGELOG.md", "CLAUDE.md"]) {
  if (!exists(doc)) { add("WARN", "docs", `${doc} is missing`); continue; }
  const d = read(doc);
  /* A doc that names a file which no longer exists is actively misleading. */
  const refs = [...d.matchAll(/`((?:js|knowledge|tools|tests|db|docs)\/[\w./-]+\.(?:js|sql|md))`/g)].map((m) => m[1]);
  const missing = [...new Set(refs)].filter((r) => !exists(r));
  if (missing.length) add("WARN", "docs", `${doc} references files that do not exist`, missing.join(", "));
}
if (eng) {
  const stated = (read("ARCHITECTURE.md").match(/(\d{3,4})\s+conditions/) || [])[1];
  const actual = (eng.context.KNOWLEDGE_ALL || []).length;
  if (stated && Math.abs(Number(stated) - actual) > 25) {
    add("WARN", "docs", `ARCHITECTURE.md says ${stated} conditions; the build has ${actual}`);
  }
}


/* ── REPORT ───────────────────────────────────────────────────────── */
const byLevel = { FAIL: [], WARN: [], INFO: [] };
findings.forEach((f) => byLevel[f.level].push(f));

if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ findings, summary: {
    fail: byLevel.FAIL.length, warn: byLevel.WARN.length, info: byLevel.INFO.length } }, null, 2));
} else {
  const areas = [...new Set(findings.map((f) => f.area))];
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  ENTOPIC — BUILD AUDIT   " + new Date().toISOString().slice(0, 16).replace("T", " "));
  console.log("══════════════════════════════════════════════════════════");
  for (const area of areas) {
    console.log("\n── " + area.toUpperCase());
    for (const f of findings.filter((x) => x.area === area)) {
      const tag = f.level === "FAIL" ? "✗ FAIL" : (f.level === "WARN" ? "! WARN" : "· info");
      console.log("  " + tag + "  " + f.msg);
      if (f.detail) console.log("           " + f.detail);
    }
  }
  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  ${byLevel.FAIL.length} FAIL   ${byLevel.WARN.length} WARN   ${byLevel.INFO.length} info`);
  console.log("══════════════════════════════════════════════════════════\n");
}

process.exit(byLevel.FAIL.length ? 1 : 0);
