/* ═══════════════════════════════════════════════════════════════ */
/* E2E — THE STUDENT STUDY TAB IS EASY TO UNDERSTAND               */
/*                                                                  */
/* The founder's note: "improve the UI for students … should be     */
/* easy to understand." The Study tab had grown to nine cards of    */
/* equal weight with no grouping and no starting point — scannable  */
/* only if you read every card.                                     */
/*                                                                  */
/* The change groups the cards into three named sections (Practise, */
/* My progress, Learn & reference) and shows a single "start here"  */
/* banner to a brand-new student that disappears once they have any */
/* history. This drives the REAL page and checks all of that, plus  */
/* the one behaviour that would make the banner worse than useless: */
/* its button must actually start a case.                           */
/*                                                                  */
/*   node tools/e2e/student-ui.js                                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const path = require("path");
const PW = "/opt/node22/lib/node_modules/playwright";
const CHROME = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const URL = "file://" + path.resolve(__dirname, "..", "..", "index.html");
const { chromium } = require(PW);

let held = 0, broke = 0;
function ok(name, cond, detail) {
  if (cond) { held++; console.log("  held    " + name); }
  else { broke++; console.log("  BROKE   " + name + (detail ? "\n            " + detail : "")); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof window.renderHome === "function");
  await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

  /* A REAL student account, created through the app's own signup form — because
     renderHome() gates on a genuine authenticated session and paints a login
     stub without one. This is the same "sign in for real, then test" shape the
     other e2e files use; it also means every render below hits the real
     scaffold the simulation launcher needs. */
  await page.evaluate(() => { if (typeof window.showSignup === "function") window.showSignup(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Stu Dent"); set("inp_scl", "Uni Clinic");
    set("inp_su", "stud_e2e"); set("inp_sp", "password123");
    const sr = document.getElementById("inp_sr");
    if (sr) for (const o of sr.options) if (/student/i.test(o.textContent)) sr.value = o.value;
    [...document.querySelectorAll("button")].find((b) => /Create Account/i.test(b.textContent)).click();
  });
  await page.waitForTimeout(1200);

  /* With a real session established, land on the Study tab and let the app
     paint it. No hand-injected innerHTML — an e2e must exercise the real paint. */
  function asStudent() {
    return page.evaluate(() => {
      window.setActiveRole("student");
      window.HOME_TAB = "study";
      window.renderHome();
      return document.body.innerText;
    });
  }

  console.log("\n── a brand-new student ──");
  /* Clear any practice/sim history this browser might carry. */
  await page.evaluate(() => {
    try {
      window.savePatients((window.loadPatients() || []).filter((p) => !p.practice));
      Object.keys(localStorage).forEach((k) => { if (/sim_progress/.test(k)) localStorage.removeItem(k); });
    } catch (e) {}
  });
  let text = await asStudent();

  ok("the three groups are all present and named",
    ["Practise", "My progress", "Learn & reference"].every((g) => text.includes(g)),
    text.slice(0, 200));
  ok("a brand-new student is shown a single clear starting point",
    /New here\? Start with a guided simulation/.test(text));
  ok("the starting point promises the work is safe (no real records, nothing counts)",
    /nothing counts against you/i.test(text));

  ok("the group order is Practise → My progress → Learn & reference",
    await page.evaluate(() => {
      const t = document.body.innerText;
      return t.indexOf("Practise") < t.indexOf("My progress") &&
             t.indexOf("My progress") < t.indexOf("Learn & reference");
    }));

  ok("the practise cards sit under the Practise heading, not elsewhere",
    await page.evaluate(() => {
      const t = document.body.innerText;
      const practise = t.indexOf("Practise"), progress = t.indexOf("My progress");
      const quiz = t.indexOf("Quiz");
      return quiz > practise && quiz < progress;
    }));

  ok("the knowledge base sits under Learn & reference, last",
    await page.evaluate(() => {
      const t = document.body.innerText;
      return t.indexOf("Knowledge Base") > t.indexOf("Learn & reference");
    }));

  console.log("\n── the starting point actually starts something ──");
  /* The Study tab is already painted by asStudent(); just click the banner. */
  const started = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")]
      .find((b) => /Start my first guided case/.test(b.textContent));
    if (!btn) return { clicked: false };
    btn.click();
    return {
      clicked: true,
      simActive: !!(window.SIM && window.SIM.active),
      tier: window.SIM && window.SIM.tier
    };
  });
  await page.waitForTimeout(200);
  ok("the banner has a working first-case button", started.clicked, JSON.stringify(started));
  ok("clicking it launches a real simulation", started.simActive === true,
    JSON.stringify(started));
  ok("and it launches the GUIDED tier the banner promised", started.tier === "guided",
    "tier was " + started.tier);

  /* Quit the sim BEFORE the next render, so the app is back on a clean home. */
  await page.evaluate(() => {
    if (typeof window.simQuitSilent === "function") { try { window.simQuitSilent(); } catch (e) {} }
  });
  await page.waitForTimeout(150);

  console.log("\n── a returning student ──");
  await page.evaluate(() => {
    const pts = window.loadPatients();
    pts.push({ id: "pp_ret", practice: true, first_name: "Practice", last_name: "Case",
               mrn: "EP-RET", created: Date.now() });
    window.savePatients(pts);
  });
  text = await asStudent();
  ok("the start-here banner is gone once there is any history",
    !/New here\? Start with a guided simulation/.test(text));
  ok("but the three groups remain",
    ["Practise", "My progress", "Learn & reference"].every((g) => text.includes(g)));
  ok("the student's own practice exams are listed",
    /My practice exams/.test(text));

  ok("no uncaught page error occurred", errors.length === 0, errors.join("\n"));

  await browser.close();
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("held: " + held + "    BROKE: " + broke);
  console.log("══════════════════════════════════════════════════════════");
  process.exit(broke ? 1 : 0);
})();
