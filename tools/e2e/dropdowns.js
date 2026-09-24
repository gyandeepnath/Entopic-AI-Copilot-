/* ═══════════════════════════════════════════════════════════════ */
/* EVERY DROPDOWN SHOWS WHAT WAS CHOSEN  (full audit, 2026-09-24)   */
/*                                                                  */
/*   node tools/e2e/dropdowns.js                                    */
/*                                                                  */
/* For every <select> on every exam step: choose each option, let   */
/* the app re-render the step, and check the dropdown still shows   */
/* the option that was chosen.                                      */
/*                                                                  */
/* The first run found 7 dropdowns (21 options) that reverted on     */
/* screen while the record kept the value — nystagmus showed "None" */
/* for a recorded nystagmus, saccades and pursuits "Normal", the     */
/* fundus lens "90D" — and Van Herick, which stored its LABEL, so    */
/* the engine read a closed angle as open. A clinician re-reading    */
/* the screen would believe it and could "correct" it back.          */
/*                                                                  */
/* Also checks that records saved BEFORE the fix (labels, not codes) */
/* still re-select, and the conditional RAPD-grade dropdown.         */
/* Needs Chromium (Playwright); offline.                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const PW = "/opt/node22/lib/node_modules/playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const APP = "file://" + path.resolve(__dirname, "..", "..", "index.html");

let held = 0;
const broke = [];
function check(name, cond, detail) {
  if (cond) { held++; console.log("  ok    " + name); }
  else { broke.push(name); console.log("  FAIL  " + name + (detail ? "\n          " + detail : "")); }
}

(async () => {
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(APP);
  await p.waitForFunction(() => typeof window.renderHome === "function");
  await p.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });
  await p.evaluate(() => window.showSignup && window.showSignup());
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Clinic"); set("inp_su", "dd_user"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((x) => /Create Account/i.test(x.textContent)).click();
  });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { window.newPatient(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    V.modules = V.modules || {};
    ["paediatric", "low_vision", "contact_lens", "paed", "lv", "cl", "orthoptic", "dispensing"].forEach((k) => { V.modules[k] = true; });
  });

  const keyOf = "(x) => x.getAttribute('oninput') || x.getAttribute('onchange') || x.id || ''";
  async function roundTrip(step, key) {
    const n = await p.evaluate(({ key, keyOf }) => {
      const kf = eval(keyOf);
      const el = [...document.querySelectorAll("select")].find((x) => kf(x) === key);
      return el ? el.options.length : 0;
    }, { key, keyOf });
    const bad = [];
    for (let oi = 0; oi < n; oi++) {
      const r = await p.evaluate(({ key, oi, keyOf }) => {
        const kf = eval(keyOf);
        const find = () => [...document.querySelectorAll("select")].find((x) => kf(x) === key);
        let el = find(); if (!el) return { gone: true };
        el.selectedIndex = oi;
        const chosen = el.options[oi].text;
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        try { renderMain(); } catch (e) { return { threw: String(e) }; }
        el = find(); if (!el) return { gone: true };
        return { chosen, shown: el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : "", idx: el.selectedIndex };
      }, { key, oi, keyOf });
      if (r.threw) bad.push("option " + oi + " threw " + r.threw);
      else if (!r.gone && r.idx !== oi) bad.push(JSON.stringify(r.chosen) + " → shows " + JSON.stringify(r.shown));
    }
    return { n, bad };
  }

  const steps = await p.evaluate(() => (window.STEPS || []).map((s) => s.id));
  let selects = 0, options = 0;
  for (const step of steps) {
    await p.evaluate((s) => { V._dupChecked = true; nav(s); }, step);
    await p.waitForTimeout(40);
    const keys = await p.evaluate((keyOf) => {
      const kf = eval(keyOf);
      return [...document.querySelectorAll("select")].filter((el) => el.offsetParent !== null).map(kf).filter(Boolean);
    }, keyOf);
    for (const key of keys) {
      const r = await roundTrip(step, key);
      if (!r.n) continue;
      selects++; options += r.n;
      if (r.bad.length) check(step + ": " + key.slice(0, 60), false, r.bad.slice(0, 3).join("; "));
      await p.evaluate(({ key, keyOf }) => {
        const kf = eval(keyOf);
        const el = [...document.querySelectorAll("select")].find((x) => kf(x) === key);
        if (el) { el.selectedIndex = 0; el.dispatchEvent(new Event("input", { bubbles: true })); el.dispatchEvent(new Event("change", { bubbles: true })); }
      }, { key, keyOf });
    }
  }
  check("every option of every exam dropdown re-selects after a re-render (" + selects + " dropdowns, " + options + " options)",
    broke.length === 0 && selects > 60);

  /* The conditional RAPD-grade dropdown only exists once an RAPD is recorded. */
  await p.evaluate(() => { V.pupil.rapd = "OD"; nav("pupil"); });
  const g = await roundTrip("pupil", "V.pupil.rapd_grade=this.value");
  check("RAPD grade re-selects (" + g.n + " options)", g.n >= 5 && g.bad.length === 0, g.bad.join("; "));
  const stored = await p.evaluate(() => V.pupil.rapd_grade);
  check("RAPD grade stores the grade, not the label", /^[1-5]?$/.test(String(stored)), JSON.stringify(stored));

  /* Records saved before the fix hold LABELS. They must still show. */
  const legacy = await p.evaluate(() => {
    V.sl.od.vh = "0 (Closed)"; V.pupil.rapd = "OS"; V.pupil.rapd_grade = "3 — Immediate dilation";
    nav("slit_lamp");
    const vh = [...document.querySelectorAll("select")].find((x) => (x.getAttribute("oninput") || "").indexOf("V.sl.od.vh=") === 0);
    const vhShown = vh ? vh.options[vh.selectedIndex].text : "(missing)";
    const alerts = (V.alerts || []).map((a) => a.m).join(" | ");
    nav("pupil");
    const gr = [...document.querySelectorAll("select")].find((x) => (x.getAttribute("oninput") || "").indexOf("V.pupil.rapd_grade=") === 0);
    return { vhShown, alerts, grShown: gr ? gr.options[gr.selectedIndex].text : "(missing)" };
  });
  check("a Van Herick saved as '0 (Closed)' still shows as closed", /0 \(Closed\)/.test(legacy.vhShown), legacy.vhShown);
  check("…and still raises the gonioscopy-before-dilation warning", /Van Herick .* OD — gonioscopy before dilation/.test(legacy.alerts), legacy.alerts);
  check("an RAPD grade saved as its full label still shows", /^3 —/.test(legacy.grShown), legacy.grShown);

  /* Choosing the blank gonioscopy option stores blank, not "—". */
  const gon = await p.evaluate(() => {
    nav("gonioscopy");
    const el = [...document.querySelectorAll("select")].find((x) => (x.getAttribute("oninput") || "").indexOf("V.gon.od.s=") === 0);
    el.selectedIndex = 0; el.dispatchEvent(new Event("input", { bubbles: true }));
    return V.gon.od.s;
  });
  check("the blank gonioscopy grade stores blank, not a dash", gon === "", JSON.stringify(gon));

  check("no page errors", errs.length === 0, [...new Set(errs)].slice(0, 3).join(" | "));
  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("dropdowns — held: " + held + "    BROKE: " + broke.length);
  console.log("══════════════════════════════════════════════════════════════════");
  process.exit(broke.length ? 1 : 0);
})();
