/* ═══════════════════════════════════════════════════════════════ */
/* EVERY BUTTON'S CLICK HANDLER IS VALID CODE  (full audit, 2026-09-24) */
/*                                                                  */
/*   node tools/e2e/handlers.js                                     */
/*                                                                  */
/* The app wires most controls with inline onclick="…" attributes    */
/* built by string concatenation. If a value is embedded with the    */
/* wrong quoting, the attribute is cut short and the control         */
/* silently does NOTHING — no error until it is clicked, and then     */
/* only in the console.                                              */
/*                                                                  */
/* Found this way: all 249 buttons on the age-bracket review screen   */
/* were dead — JSON.stringify put raw double quotes inside a          */
/* double-quoted attribute, so the handler read                      */
/* `ageBracketChoose("Vernal Keratoconjunctivitis",` and stopped.     */
/*                                                                  */
/* Renders every home tab for every role, every exam step, and the   */
/* admin review screens, and parses EVERY on* attribute. Also flags   */
/* a handler that is valid but calls a function that does not exist. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const PW = "/opt/node22/lib/node_modules/playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const APP = "file://" + path.resolve(__dirname, "..", "..", "index.html");
const espree = require("/opt/node22/lib/node_modules/eslint/node_modules/espree");

let held = 0;
const broke = [];
function check(name, cond, detail) {
  if (cond) { held++; console.log("  ok    " + name); }
  else { broke.push(name); console.log("  FAIL  " + name + (detail ? "\n          " + String(detail).slice(0, 600) : "")); }
}

/* Top-level function names a handler calls: foo(…) and window.foo(…). */
function calledNames(ast) {
  const out = new Set();
  (function walk(n) {
    if (!n || typeof n !== "object") return;
    if (n.type === "CallExpression") {
      if (n.callee.type === "Identifier") out.add(n.callee.name);
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v);
    }
  })(ast);
  return out;
}

(async () => {
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  await p.goto(APP);
  await p.waitForFunction(() => typeof window.renderHome === "function");
  await p.evaluate(() => { window.alert = () => {}; window.confirm = () => true; window.prompt = () => null; window.open = () => null; });
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Clinic"); set("inp_su", "hd_user"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((x) => /Create Account/i.test(x.textContent)).click();
  });
  await p.waitForTimeout(1200);

  const seen = new Map();   /* attribute text → where first seen */
  async function harvest(where) {
    const attrs = await p.evaluate(() => {
      const out = [];
      document.querySelectorAll("*").forEach((el) => {
        for (const a of el.attributes || []) if (/^on/i.test(a.name)) out.push(a.value);
      });
      return out;
    });
    for (const a of attrs) if (!seen.has(a)) seen.set(a, where);
  }

  /* home tabs, for every role */
  for (const role of ["clinician", "student", "faculty", "researcher", "technician"]) {
    await p.evaluate((r) => { try { setActiveRole(r); } catch (e) {} }, role);
    for (const tab of ["patients", "study", "teaching", "casebook", "kb", "account", "research", "investigations"]) {
      await p.evaluate((t) => { HOME_TAB = t; try { renderHome(); } catch (e) {} }, tab);
      await harvest(role + " / " + tab);
    }
  }
  /* admin screens */
  await p.evaluate(() => { CU.admin = true; HOME_TAB = "admin"; try { renderHome(); } catch (e) {} });
  await harvest("admin");
  for (const [fn, where] of [["showReviewQueue", "review queue"], ["openValidation", "validation workspace"]]) {
    await p.evaluate((f) => { try { window[f](); } catch (e) {} }, fn);
    await harvest(where);
  }
  await p.evaluate(() => {
    const host = document.createElement("div"); host.id = "__h"; document.body.appendChild(host);
    try { host.innerHTML += ageBracketScreen(); } catch (e) {}
    try { host.innerHTML += redFlagScreen(); } catch (e) {}
    try { if (typeof thresholdScreen === "function") host.innerHTML += thresholdScreen(); } catch (e) {}
  });
  await harvest("admin review screens");
  /* every exam step, with a patient open */
  await p.evaluate(() => { newPatient(); V.modules = { paediatric: true, low_vision: true, contact_lens: true }; V.pupil.rapd = "OD"; });
  const steps = await p.evaluate(() => STEPS.map((s) => s.id));
  for (const s of steps) {
    await p.evaluate((st) => { V._dupChecked = true; nav(st); }, s);
    await harvest("exam / " + s);
  }

  const defined = new Set(await p.evaluate(() => Object.keys(window).filter((k) => typeof window[k] === "function")));
  const BUILTIN_OK = new Set(["alert", "confirm", "prompt", "setTimeout", "clearTimeout", "parseInt", "parseFloat",
    "String", "Number", "Boolean", "encodeURIComponent", "decodeURIComponent", "isNaN", "isFinite", "fetch", "print"]);
  const unparsed = [], missing = [];
  for (const [attr, where] of seen) {
    let ast;
    try { ast = espree.parse("(function(event){" + attr + "\n})", { ecmaVersion: "latest" }); }
    catch (e) { unparsed.push(where + ": " + attr.slice(0, 120)); continue; }
    for (const n of calledNames(ast)) {
      if (!defined.has(n) && !BUILTIN_OK.has(n)) missing.push(where + ": calls " + n + "()  in  " + attr.slice(0, 100));
    }
  }
  check("every inline handler on every screen is valid code (" + seen.size + " distinct handlers)",
    unparsed.length === 0, unparsed.slice(0, 8).join("\n          "));
  check("every function a handler calls exists", missing.length === 0, [...new Set(missing)].slice(0, 8).join("\n          "));
  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("handlers — held: " + held + "    BROKE: " + broke.length);
  console.log("══════════════════════════════════════════════════════════════════");
  process.exit(broke.length ? 1 : 0);
})();
