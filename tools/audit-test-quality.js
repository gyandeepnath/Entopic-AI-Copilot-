/* ═══════════════════════════════════════════════════════════════ */
/* TEST QUALITY AUDIT  (Phase 8)                                    */
/*                                                                  */
/*   node tools/audit-test-quality.js [--verbose]                           */
/*                                                                  */
/* A test count is not evidence. This looks for the specific ways a */
/* suite creates FALSE CONFIDENCE — tests that pass whether or not  */
/* the feature works:                                               */
/*                                                                  */
/*   • no assertion at all — it only checks nothing threw           */
/*   • assertions with no message, so a failure says "false !== true"*/
/*   • truthiness-only assertions on a value that is always truthy  */
/*   • source scraping: a regex over production text, which fails   */
/*     on a rename and passes on a reintroduced bug                 */
/*   • timing dependence, which is where flakiness comes from       */
/*   • module-level shared state, which makes order matter          */
/*                                                                  */
/* It reports, it does not judge: several patterns here are correct */
/* in the right place (a source scrape is the only way to assert a  */
/* load order). The output is a list to READ, not a score to chase. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TESTS = path.join(ROOT, "tests");
const VERBOSE = process.argv.includes("--verbose");

/* Split a file into its test() blocks by brace matching.

   The brace matcher MUST skip strings, comments and regex literals. A first
   version did not skip regexes, and this suite is full of tests that scrape
   production source with patterns like /function foo\([\s\S]*?\n}/ — the `}`
   inside the pattern closed the block early, truncating the body before its
   assertions. The tool then reported six tests as having no assertion at all,
   every one of which was fine.

   That is the same class of error this tool exists to find, so it is worth
   naming: an analysis that is confidently wrong is worse than no analysis.
   Every finding below was hand-checked against the file before being acted on. */
function testBlocks(src) {
  const out = [];
  const re = /^test\((["'`])([\s\S]*?)\1\s*,\s*(async\s*)?\(\s*\)\s*=>\s*\{/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length;
    let depth = 1, i = start;
    while (i < src.length && depth > 0) {
      const c = src[i];

      if (c === "/" && src[i + 1] === "/") {                    /* line comment */
        while (i < src.length && src[i] !== "\n") i++;
        continue;
      }
      if (c === "/" && src[i + 1] === "*") {                    /* block comment */
        i += 2;
        while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) i++;
        i += 2;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {                /* string */
        const q = c; i++;
        while (i < src.length && src[i] !== q) { if (src[i] === "\\") i++; i++; }
        i++;
        continue;
      }
      if (c === "/" && _regexPosition(src, i)) {                /* regex literal */
        i++;
        let inClass = false;
        while (i < src.length) {
          if (src[i] === "\\") { i += 2; continue; }
          if (src[i] === "[") inClass = true;
          else if (src[i] === "]") inClass = false;
          else if (src[i] === "/" && !inClass) break;
          else if (src[i] === "\n") break;                      /* not a regex after all */
          i++;
        }
        i++;
        continue;
      }

      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    out.push({ name: m[2], body: src.slice(start, i - 1), line: src.slice(0, m.index).split("\n").length });
  }
  return out;
}

/* Is the `/` at position i the start of a regex literal rather than division?
   Decided by what precedes it — the standard heuristic, and sufficient here. */
function _regexPosition(src, i) {
  let j = i - 1;
  while (j >= 0 && /\s/.test(src[j])) j--;
  if (j < 0) return true;
  const p = src[j];
  if ("(,=:[!&|?{};+-*%^~<>".indexOf(p) >= 0) return true;
  /* `return /re/`, `typeof /re/`, `case /re/` */
  const word = /(\w+)$/.exec(src.slice(Math.max(0, j - 12), j + 1));
  return !!(word && ["return", "typeof", "case", "in", "of", "do", "else", "yield"]
                      .includes(word[1]));
}

const ASSERT = /\bassert\b/;
const ASSERT_CALL = /assert(?:\.\w+)?\s*\(/g;

function auditFile(file) {
  const src = fs.readFileSync(path.join(TESTS, file), "utf8");
  const blocks = testBlocks(src);
  const findings = [];

  /* Module-level mutable state shared across tests → order dependence. */
  const topLevel = src.split(/^test\(/m)[0];
  if (/^(?:const|let|var)\s+\w+\s*=\s*(?:makeEnv|sandbox|load|createEngine)\s*\(/m.test(topLevel)) {
    findings.push({ kind: "shared-fixture", test: "(file level)", line: 1,
      note: "one fixture is built once and shared by every test in the file — a test that " +
            "mutates it changes the others, and the suite depends on execution order" });
  }

  for (const b of blocks) {
    const asserts = (b.body.match(ASSERT_CALL) || []).length;

    if (!ASSERT.test(b.body)) {
      findings.push({ kind: "no-assertion", test: b.name, line: b.line,
        note: "no assertion — this passes whenever the code does not throw" });
      continue;
    }

    /* assert.ok(...) / assert(...) with no message. The message IS the
       specification; without it a failure reads "false !== true". */
    const bare = (b.body.match(/assert(?:\.ok)?\(\s*[^,)]+\)\s*[;\n]/g) || []).length;
    if (bare > 0 && bare === asserts) {
      findings.push({ kind: "unmessaged", test: b.name, line: b.line,
        note: bare + " assertion(s), none with a message — a failure will not say what broke" });
    }

    /* An assertion that cannot fail.

       NOTE the exact comparisons. `length > 0` is a real assertion — an empty
       result fails it — and an earlier version of this rule matched it via a
       sloppy `>=?`, flagging the LLM-privacy and knowledge-base tests as
       vacuous when both are sound. Only `>= 0` (always true for a length) and
       `!== undefined` on a typeof (always true, since typeof returns a string)
       genuinely cannot fail. */
    const cannotFail = [
      /assert\.ok\(\s*\w[\w.]*\.length\s*>=\s*0\s*[,)]/,      /* length >= 0 */
      /assert\.ok\(\s*true\s*[,)]/,
      /assert\.ok\(\s*typeof\s+[\w.]+\s*(?:[,)])/,            /* typeof x — a non-empty string */
      /assert\.notStrictEqual\(\s*typeof\s+[\w.]+\s*,\s*undefined/
    ];
    if (cannotFail.some((re) => re.test(b.body)) && asserts <= 2) {
      findings.push({ kind: "vacuous", test: b.name, line: b.line,
        note: "an assertion that cannot fail, and few others to carry the test" });
    }

    /* Source scraping. Legitimate for load order and for ordering facts that
       only exist in source — but it fails on a rename and passes on a
       reintroduced bug, so every instance should be a deliberate choice. */
    if (/read\(["'`]js\/|readFileSync[\s\S]{0,80}js\//.test(b.body) &&
        /\.test\(|\.exec\(|indexOf\(/.test(b.body)) {
      findings.push({ kind: "source-scrape", test: b.name, line: b.line,
        note: "asserts against the TEXT of production code — breaks on a refactor, and can " +
              "pass while the behaviour is wrong" });
    }

    /* Timing. */
    if (/setTimeout\(\s*[^,]+,\s*[1-9]\d{2,}/.test(b.body) || /Date\.now\(\)\s*[-+]/.test(b.body)) {
      if (/assert/.test(b.body) && /\b(ms|took|elapsed|duration)\b/.test(b.body)) {
        findings.push({ kind: "timing", test: b.name, line: b.line,
          note: "asserts on wall-clock time — will flake on a loaded machine" });
      }
    }

    /* Randomness without a seed. */
    if (/Math\.random\(\)/.test(b.body)) {
      findings.push({ kind: "random", test: b.name, line: b.line,
        note: "uses Math.random() — a failure may not reproduce" });
    }

    /* Mocking the thing under test: a stub whose name matches the file. */
    const subject = file.replace(/\.test\.js$/, "").replace(/-/g, "");
    const stubbed = (b.body.match(/^\s*(\w+)\s*:\s*(?:\(\)|function)/gm) || [])
      .map((s) => s.trim().split(":")[0].toLowerCase());
    for (const s of stubbed) {
      if (s.length > 4 && subject.includes(s)) {
        findings.push({ kind: "mocks-subject", test: b.name, line: b.line,
          note: "stubs `" + s + "`, which is what this file is meant to be testing" });
        break;
      }
    }
  }

  return { file, tests: blocks.length, findings };
}

const files = fs.readdirSync(TESTS).filter((f) => f.endsWith(".test.js")).sort();
const results = files.map(auditFile);

const byKind = {};
let totalTests = 0, totalFindings = 0;
for (const r of results) {
  totalTests += r.tests;
  totalFindings += r.findings.length;
  for (const f of r.findings) (byKind[f.kind] = byKind[f.kind] || []).push({ file: r.file, ...f });
}

console.log("Entopic test-quality audit");
console.log(files.length + " files, " + totalTests + " tests, " + totalFindings + " observations\n");

const ORDER = ["no-assertion", "mocks-subject", "vacuous", "timing", "random",
               "unmessaged", "source-scrape", "shared-fixture"];
const SEVERITY = {
  "no-assertion":  "SERIOUS  — passes whether or not the feature works",
  "mocks-subject": "SERIOUS  — the behaviour under test was replaced by a stub",
  "vacuous":       "SERIOUS  — the assertion cannot fail",
  "timing":        "FLAKY    — depends on machine load",
  "random":        "FLAKY    — a failure may not reproduce",
  "unmessaged":    "WEAK     — a failure will not say what broke",
  "source-scrape": "BRITTLE  — breaks on a rename, may pass on a real bug",
  "shared-fixture":"ORDER    — tests can affect each other"
};

for (const kind of ORDER) {
  const list = byKind[kind] || [];
  if (!list.length) continue;
  console.log("── " + kind + "  (" + list.length + ")  " + SEVERITY[kind]);
  const show = VERBOSE ? list : list.slice(0, 8);
  for (const f of show) {
    console.log("   " + f.file + ":" + f.line + "  " + f.test.slice(0, 68));
    if (VERBOSE) console.log("      " + f.note);
  }
  if (!VERBOSE && list.length > show.length) console.log("   … " + (list.length - show.length) + " more (--verbose)");
  console.log("");
}

const serious = ["no-assertion", "mocks-subject", "vacuous"].reduce(
  (n, k) => n + (byKind[k] || []).length, 0);
console.log("═".repeat(60));
console.log("tests that may pass while the feature is broken: " + serious);
console.log("═".repeat(60));
process.exit(serious > 0 ? 1 : 0);
