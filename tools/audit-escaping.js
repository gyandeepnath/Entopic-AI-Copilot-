#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════ */
/* ESCAPING AUDIT — every value interpolated into HTML             */
/*                                                                  */
/*   node tools/audit-escaping.js            summary               */
/*   node tools/audit-escaping.js --verbose  every site            */
/*                                                                  */
/* Phase 9 found an XSS hole by spot-checking one field (P.age) and */
/* Phase 11 found another by reading one function (ui-flowmap's     */
/* condition name). Both were found by looking. This looks at ALL   */
/* of them at once.                                                 */
/*                                                                  */
/* WHAT IT LOOKS FOR. The app builds HTML by string concatenation,  */
/* so the risky shape is always the same: a fragment that opens     */
/* markup, then `+ something +`, where `something` is not passed    */
/* through the canonical escaper. It reports each such site with    */
/* the expression, so a human can decide.                           */
/*                                                                  */
/* IT IS ADVISORY, NOT A GATE. A source that is provably a number   */
/* or a literal is safe, and this cannot always tell. The point is  */
/* to make the list SHORT and REVIEWED rather than unknown — an     */
/* unreviewed list of 400 is the same as no list at all.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const VERBOSE = process.argv.includes("--verbose");

/* Expressions that cannot carry markup. */
const SAFE = [
  /^esc(H|Html|Attr|AttrJs)?\s*\(/,        /* the canonical escapers */
  /^Number\s*\(/, /^parseInt\s*\(/, /^parseFloat\s*\(/,
  /^Math\./,                                /* arithmetic */
  /^\d+(\.\d+)?$/,                          /* numeric literals */
  /\.length\b\s*$/,                         /* counts */
  /^JSON\.stringify\s*\(/,                  /* still risky in attrs, see below */
  /toFixed\s*\(\s*\d*\s*\)\s*$/,
  /^\(?\s*i\s*\+\s*1\s*\)?$/,               /* loop indices */
  /^(true|false|null)$/
];

/* Anything whose NAME says it is already escaped or already HTML. */
const SAFE_NAME = /^(h|html|out|rows?|body|inner|card|cards|frag|markup|_h|s|str)$/i;

/* ── WHAT COUNTS AS RISKY ──
   The first version of this scanner reported 828 sites, which by its own
   standard is the same as reporting nothing: nobody reviews 828 lines, so the
   real one hides among them.

   The narrowing is by SOURCE, not by shape. A value is only dangerous if an
   attacker can influence it, and in this app that means it came out of stored
   data, an imported file, or a synced record — patient and visit fields, KB
   condition names, user names, overlay content. A loop counter or a local
   string built two lines above cannot carry markup no matter how it is
   concatenated.

   So: flag an interpolation only when the expression reads a PROPERTY off
   something that holds record data. Everything else is left to the runtime
   sweep in tools/stress/xss.js, which proves exploitability instead of
   guessing at it. */
const RISKY_SOURCE = [
  /\b[PV]\.[a-z_]/i,                       /* the live patient / visit */
  /\bCU\.[a-z_]/i,                          /* the signed-in user */
  /\b(pt|patient|visit|v|p|u|user|rec|record|entry|item|row|c|cond|condition|d|dx)\./i,
  /\.(name|label|title|text|value|note|notes|comment|reason|why|desc|description|first_name|last_name|mrn|username|by|author|id)\b/,
  /\bloadStore\s*\(/, /\bload[A-Z]/        /* straight out of storage */
];
function isRiskySource(e) { return RISKY_SOURCE.some((re) => re.test(e)); }

function isSafeExpr(e) {
  const t = e.trim();
  if (!t) return true;
  if (SAFE.some((re) => re.test(t))) return true;
  if (SAFE_NAME.test(t)) return true;
  if (/\besc(H|Html|Attr|AttrJs)\s*\(/.test(t)) return true;
  if (/^[^?]*\?\s*['"][^'"]*['"]\s*:\s*['"][^'"]*['"]$/.test(t)) return true;
  if (/^[A-Za-z_$][\w$]*(Card|Html|HTML|Markup|Row|Rows|Panel|Layer|Bar|Head)\s*\(/.test(t)) return true;
  if (/^render[A-Z]/.test(t)) return true;
  return false;
}

/* Does the literal immediately before the `+` leave us inside markup? */
function opensMarkup(lit) {
  /* Inside a tag/attribute, or immediately after a `>` that opened content. */
  return /[<>]/.test(lit) || /=\s*["']$/.test(lit) || /["']\s*>$/.test(lit);
}

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    const st = fs.statSync(p);
    if (st.isDirectory()) { if (!/node_modules|\.git/.test(p)) walk(p); }
    else if (/\.js$/.test(f)) files.push(p);
  }
})(path.join(ROOT, "js"));

const findings = [];

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  /* Strip block and line comments so documentation about the pattern is not
     reported as the pattern. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
                  .replace(/(^|[^:\\])\/\/[^\n]*/g, (m, p1) => p1 + "");
  const lines = code.split("\n");

  lines.forEach((line, i) => {
    /* Match:  '<...literal...' + EXPR +      (and the "..." variant) */
    const re = /(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*\+\s*([^+]+?)\s*\+/g;
    let m;
    while ((m = re.exec(line))) {
      const lit = m[2];
      const expr = m[3];
      if (!opensMarkup(lit)) continue;
      if (isSafeExpr(expr)) continue;
      if (!isRiskySource(expr)) continue;
      findings.push({
        file: path.relative(ROOT, file),
        line: i + 1,
        expr: expr.length > 70 ? expr.slice(0, 70) + "…" : expr,
        ctx: lit.slice(-40)
      });
    }
  });
}

/* Group by file so the report is actionable. */
const byFile = {};
for (const f of findings) (byFile[f.file] = byFile[f.file] || []).push(f);
const names = Object.keys(byFile).sort((a, b) => byFile[b].length - byFile[a].length);

console.log("═".repeat(66));
console.log("UNESCAPED INTERPOLATIONS INTO HTML — advisory");
console.log("═".repeat(66));
for (const n of names) {
  console.log("\n" + n + "  (" + byFile[n].length + ")");
  const show = VERBOSE ? byFile[n] : byFile[n].slice(0, 6);
  for (const f of show) console.log("  " + String(f.line).padStart(5) + "  " + f.expr);
  if (!VERBOSE && byFile[n].length > show.length) {
    console.log("        … " + (byFile[n].length - show.length) + " more (--verbose)");
  }
}
console.log("\n" + "═".repeat(66));
console.log("sites needing review: " + findings.length + " across " + names.length + " files");
console.log("═".repeat(66));
