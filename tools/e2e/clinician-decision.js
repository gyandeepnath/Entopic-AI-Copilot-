/* ═══════════════════════════════════════════════════════════════ */
/* WHAT THE CLINICIAN DECIDED IS WHAT GOES OUT  (full audit, 2026-09-24) */
/*                                                                  */
/*   node tools/e2e/clinician-decision.js                           */
/*                                                                  */
/* Two defects, one theme — the paperwork did not say what the       */
/* clinician decided:                                                */
/*                                                                  */
/*  1. The printed spectacle prescription read the SUBJECTIVE fields */
/*     and ignored "④ Final prescription issued". Prescribe anything */
/*     different from the subjective and the optician got the wrong  */
/*     powers.                                                       */
/*  2. There was nowhere to record the clinician's own diagnosis.    */
/*     The report printed the engine's top five as "Assessment"; the */
/*     referral letter sent its top three as the "Provisional        */
/*     Assessment", with no advisory wording at all.                 */
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
  else { broke.push(name); console.log("  FAIL  " + name + (detail ? "\n          " + String(detail).slice(0, 300) : "")); }
}

(async () => {
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME });
  const p = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(APP);
  await p.waitForFunction(() => typeof window.renderHome === "function");
  await p.evaluate(() => { window.alert = () => {}; window.confirm = () => true; window.open = () => null; });
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Clinic"); set("inp_su", "cd_user"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((x) => /Create Account/i.test(x.textContent)).click();
  });
  await p.waitForTimeout(1200);

  const r = await p.evaluate(() => {
    newPatient();
    P.first_name = "Test"; P.last_name = "Child"; P.age = "9";
    V._dupChecked = true;
    V.symptoms = ["dryness", "burning", "grittiness"];
    /* subjective full correction; final = partial correction */
    V.rx.od_sph = "-3.00"; V.rx.os_sph = "-3.25";
    V.rx.fin_od_sph = "-2.50"; V.rx.fin_os_sph = "-2.75";
    nav("prescription");
    const rxSheet = document.getElementById("rxPrint") ? document.getElementById("rxPrint").textContent : "";
    const rxNote = document.getElementById("mainEl").textContent;

    nav("diagnosis");
    const dxPage = document.getElementById("mainEl");
    const hasField = !!dxPage.querySelector("textarea[aria-label=\"Clinician's diagnosis\"]");
    const useBtn = [...dxPage.querySelectorAll("button")].find((b) => /Use/.test(b.textContent));
    const firstDx = V.dxList.length ? V.dxList[0].n : "";
    if (useBtn) useBtn.click();
    const afterUse = V.final_dx;

    V.final_dx = "Evaporative dry eye, both eyes";
    nav("report");
    const report = document.getElementById("mainEl").textContent;
    V.plan.ref_to = REFERRAL_TARGETS[0]; V.plan.ref_urgency = REFERRAL_URGENCIES[0];
    generateReferralLetter();
    const letter = V.plan.ref_letter || "";

    /* engine never writes final_dx */
    const before = V.final_dx;
    runDiagnosticEngine();
    return { rxSheet, rxNote, hasField, firstDx, afterUse, report, letter, engineKept: V.final_dx === before };
  });

  check("the printed prescription carries the FINAL powers (-2.50 / -2.75)", /-2\.50/.test(r.rxSheet) && /-2\.75/.test(r.rxSheet), r.rxSheet);
  check("…and not the subjective (-3.00 / -3.25)", !/-3\.00|-3\.25/.test(r.rxSheet), r.rxSheet);
  check("the screen says which refraction is being printed", /Printing the ④ Final prescription/.test(r.rxNote));
  check("the Diagnosis step has a clinician's-diagnosis field", r.hasField);
  check("'+ Use' copies a suggestion into it, for the clinician to edit", !!r.firstDx && r.afterUse.indexOf(r.firstDx) >= 0, r.afterUse);
  check("the report gives the clinician's diagnosis", /Clinician's diagnosis:\s*Evaporative dry eye, both eyes/.test(r.report), r.report.slice(0, 400));
  check("the report labels the engine list as advisory, not as the assessment", /Decision-support differential \(advisory — not a diagnosis\)/.test(r.report));
  check("the referral letter gives the clinician's impression", /Clinical impression: Evaporative dry eye, both eyes/.test(r.letter), r.letter.slice(0, 500));
  check("the referral letter labels the engine list as advisory", /Decision-support differential \(advisory/.test(r.letter) && !/Provisional Assessment/.test(r.letter), r.letter);
  check("re-running the engine never overwrites the clinician's diagnosis", r.engineKept);
  check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════════════");
  console.log("clinician-decision — held: " + held + "    BROKE: " + broke.length);
  console.log("══════════════════════════════════════════════════════════════════");
  process.exit(broke.length ? 1 : 0);
})();
