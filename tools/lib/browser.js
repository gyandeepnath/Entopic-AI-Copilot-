/* Where the browser harnesses find Playwright and Chromium.

   Every harness used to hard-code /opt/pw-browsers/chromium-1194/…, so when
   the installed Chromium moved on (1194 -> 1243) EVERY browser check failed
   before it opened a page — the XSS sweep, the red-flag-to-pixels check, the
   patient journey, all of them (second full audit, 2026-10-27). One lookup
   now, in order:
     ENTOPIC_CHROME / ENTOPIC_PLAYWRIGHT  explicit override
     /opt/pw-browsers/chromium            the stable symlink, when present
     /opt/pw-browsers/chromium-<n>/…      the newest installed build
     (none)                               let Playwright use its own browser

   The same happened to espree, the JavaScript parser the XSS sweep and the
   handler check use to read inline on* handlers: it was required from inside
   a global ESLint install, the container hoisted it elsewhere, and both gates
   died with "Cannot find module" — so it is located here too (ENTOPIC_ESPREE,
   a local install, ESLint's own dependency, then the known global folders). */
"use strict";

const fs = require("node:fs");
const path = require("node:path");

function findPlaywright() {
  if (process.env.ENTOPIC_PLAYWRIGHT) return process.env.ENTOPIC_PLAYWRIGHT;
  try { return path.dirname(require.resolve("playwright/package.json")); } catch (e) { /* not local */ }
  return "/opt/node22/lib/node_modules/playwright";
}

function findChrome() {
  if (process.env.ENTOPIC_CHROME) return process.env.ENTOPIC_CHROME;
  const root = "/opt/pw-browsers";
  const link = path.join(root, "chromium");
  try { if (fs.statSync(link).isFile()) return link; } catch (e) { /* absent */ }
  let dirs = [];
  try { dirs = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)); } catch (e) { return undefined; }
  dirs.sort((a, b) => Number(b.split("-")[1]) - Number(a.split("-")[1]));
  for (const d of dirs) {
    for (const sub of ["chrome-linux64", "chrome-linux"]) {
      const exe = path.join(root, d, sub, "chrome");
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined;
}

function findEspree() {
  const tries = [process.env.ENTOPIC_ESPREE, "espree"];
  try { tries.push(path.join(path.dirname(require.resolve("eslint/package.json")), "node_modules", "espree")); } catch (e) { /* no local eslint */ }
  tries.push("/opt/node-tools/node_modules/espree", "/opt/node22/lib/node_modules/eslint/node_modules/espree",
             "/opt/node22/lib/node_modules/espree");
  for (const t of tries.filter(Boolean)) {
    try { return require.resolve(t); } catch (e) { /* try the next place */ }
  }
  throw new Error("espree (the JavaScript parser) was not found. Install it (npm i -D espree) " +
                  "or point ENTOPIC_ESPREE at it.");
}

module.exports = {
  PW: findPlaywright(), CHROME: findChrome(),
  /* A getter, so the harnesses that never parse JavaScript don't need espree. */
  get ESPREE() { return findEspree(); }
};
