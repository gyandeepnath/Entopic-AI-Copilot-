/* ═══════════════════════════════════════════════════════════════ */
/* DOCUMENTATION CONTRACTS                                          */
/*                                                                  */
/* Phase 1 found ARCHITECTURE.md claiming v1.1 and 72 files against */
/* an actual v1.4.0 and 97, with six shipped modules absent from it  */
/* entirely. Stale documentation is worse than none: it is read and  */
/* believed. These are the few checks that can be automated.         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

test("the ADR index lists every ADR file, and every listed ADR exists", () => {
  const dir = path.join(ROOT, "docs/adr");
  const files = fs.readdirSync(dir).filter((f) => /^\d{3}-.*\.md$/.test(f)).sort();
  const index = read("docs/adr/README.md");

  const missing = files.filter((f) => !index.includes("(" + f + ")"));
  assert.deepStrictEqual(missing, [],
    "these ADRs exist but are not in the index, so nobody will find them:\n  " +
    missing.join("\n  "));

  const linked = [...index.matchAll(/\((\d{3}-[a-z0-9-]+\.md)\)/g)].map((m) => m[1]);
  const broken = linked.filter((f) => !files.includes(f));
  assert.deepStrictEqual(broken, [],
    "the index links to ADRs that do not exist:\n  " + broken.join("\n  "));
});

test("every ADR states a status and when to revisit it", () => {
  const dir = path.join(ROOT, "docs/adr");
  const files = fs.readdirSync(dir).filter((f) => /^\d{3}-/.test(f));
  const incomplete = [];
  for (const f of files) {
    const src = read("docs/adr/" + f);
    if (!/\*\*Status:\*\*/.test(src)) incomplete.push(f + " (no Status)");
    if (!/## Revisit when/.test(src)) incomplete.push(f + " (no 'Revisit when')");
    if (!/## Consequences/.test(src)) incomplete.push(f + " (no Consequences)");
  }
  assert.deepStrictEqual(incomplete, [],
    "an ADR without consequences or a revisit trigger is a note, not a decision:\n  " +
    incomplete.join("\n  "));
});

test("ARCHITECTURE.md states the build it was verified against", () => {
  const doc = read("ARCHITECTURE.md");
  const m = /\*\*Covers build:\*\* Entopic v([0-9.]+)/.exec(doc);
  assert.ok(m, "ARCHITECTURE.md must name the version it describes");

  const app = /var APP_VERSION = "([^"]+)"/.exec(read("js/build-info.js"));
  assert.ok(app, "APP_VERSION not found");
  assert.strictEqual(m[1], app[1],
    "ARCHITECTURE.md says it covers v" + m[1] + " but the build is v" + app[1] +
    ". Update the header and the counts, or it will be believed and be wrong.");
});

test("ARCHITECTURE.md's file count matches reality", () => {
  const doc = read("ARCHITECTURE.md");
  const claimed = /([0-9]+) loaded files/.exec(doc);
  assert.ok(claimed, "the header must state how many files are loaded");

  const actual = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].length;
  assert.strictEqual(Number(claimed[1]), actual,
    "ARCHITECTURE.md claims " + claimed[1] + " loaded files; index.html loads " + actual);
});

test("every module index.html loads appears in ARCHITECTURE.md's inventory", () => {
  /* Not "every module is documented" — that would be unmaintainable. The
     inventory appendix is regenerated from index.html, so it must be complete. */
  const doc = read("ARCHITECTURE.md");
  const loaded = [...read("index.html").matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);
  const absent = loaded.filter((f) => !doc.includes("`" + f + "`"));
  assert.deepStrictEqual(absent, [],
    "these loaded modules appear nowhere in ARCHITECTURE.md's inventory:\n  " +
    absent.join("\n  "));
});
