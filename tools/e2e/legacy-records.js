/* ═══════════════════════════════════════════════════════════════ */
/* A VISIT FROM AN EARLIER BUILD CAN STILL BE EXAMINED               */
/*   node tools/e2e/legacy-records.js                               */
/*                                                                  */
/* Opens visits whose saved data lacks sections (as older builds,    */
/* older backups and older synced devices save them) and walks every */
/* exam step, saves, and renders the report.                         */
/*                                                                  */
/* Before the fix every page reading a missing section threw. The    */
/* render guard (js/error-boundary.js) caught it, so there was no    */
/* page error to see — the clinician just got a stale panel on every */
/* step. That is why this checks the app's own FAULT LOG, not only   */
/* browser page errors: a harness that only listened for pageerror   */
/* reported this as clean.                                           */
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
  const pageErrs = [];
  p.on("pageerror", (e) => pageErrs.push(String(e).slice(0, 160)));
  await p.goto(APP);
  await p.waitForFunction(() => typeof window.renderHome === "function");
  await p.evaluate(() => { window.alert = () => {}; window.confirm = () => true; window.prompt = () => null; });
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Clinic"); set("inp_su", "legacy_user"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((x) => /Create Account/i.test(x.textContent)).click();
  });
  await p.waitForTimeout(1200);

  const SHAPES = {
    "a visit saved as { cc } only": { cc: "blurry left eye" },
    "a visit with no symptoms list": { cc: "red eye", va: { od_un: "6/9" } },
    "an empty visit object": {},
    "sections saved as null": { symptoms: [], va: null, rx: null, sl: null, fun: null, iop: null, pupil: null, bv: null, gon: null, mot: null, neuro: null },
    "sections without their eyes": { symptoms: [], sl: { findings: [] }, fun: { findings: [] }, gon: {} },
    "a section holding the wrong type": { symptoms: ["blur"], iop: "15/16", va: "6/6" }
  };
  for (const [label, data] of Object.entries(SHAPES)) {
    const r = await p.evaluate((d) => {
      const faultsBefore = (typeof errRecent === "function" ? errRecent() : []).length;
      newPatient();
      const pid = CP;
      const visits = loadVisits();
      visits.push({ id: "vlegacy" + Math.random().toString(36).slice(2, 8), patient_id: pid,
                    data: JSON.parse(JSON.stringify(d)), status: "in_progress",
                    date: new Date(Date.now() + 60000).toISOString(), updated: new Date().toISOString() });
      saveVisits(visits);
      openChart(pid);
      continueInProgress();
      const blankSteps = [];
      STEPS.forEach((s) => {
        V._dupChecked = true;
        nav(s.id);
        const el = document.getElementById("mainEl");
        if (!el || !el.querySelector(".card, .card-t")) blankSteps.push(s.id);
      });
      const direct = [];
      try { if (typeof doSave === "function") doSave(); } catch (e) { direct.push("doSave: " + e.message); }
      let rpt = "";
      try { rpt = (typeof pgRpt === "function") ? pgRpt() : ""; } catch (e) { direct.push("report: " + e.message); }
      const faults = (typeof errRecent === "function" ? errRecent() : []).slice(faultsBefore)
        .map((f) => f.where + ": " + f.message).concat(direct);
      return { faults, blankSteps, rptLen: rpt.length, legacy: V._legacy_values || null, cc: V.cc };
    }, data);
    check(label + " — every step renders, no faults", r.faults.length === 0 && r.blankSteps.length === 0,
      r.faults.slice(0, 3).join(" | ") + (r.blankSteps.length ? " blank: " + r.blankSteps.join(",") : ""));
    if (data.cc) check(label + " — what was recorded is kept", r.cc === data.cc, JSON.stringify(r.cc));
    if (label === "a section holding the wrong type") {
      check("…and the value that did not fit is kept, not discarded",
        r.legacy && r.legacy.iop === "15/16" && r.legacy.va === "6/6", JSON.stringify(r.legacy));
    }
  }
  check("no page errors", pageErrs.length === 0, pageErrs.slice(0, 3).join(" | "));
  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("legacy-records — held: " + held + "    BROKE: " + broke.length);
  console.log("══════════════════════════════════════════════════════════════════");
  process.exit(broke.length ? 1 : 0);
})();
