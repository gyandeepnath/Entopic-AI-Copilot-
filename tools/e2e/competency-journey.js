/* ═══════════════════════════════════════════════════════════════ */
/* E2E — THE COMPETENCY JOURNEY (student → supervisor → student)    */
/*                                                                  */
/* WHY THIS FILE EXISTS, IN ONE SENTENCE: the unit suite for this   */
/* feature was green over code nobody could reach.                  */
/*                                                                  */
/* js/competency.js shipped in Phase 2 with sixteen passing tests    */
/* and ZERO call sites. Phase 10 wired it up — and the FIRST wiring  */
/* was also broken: ui-competency.js called can("supervise") but     */
/* "supervise" was not declared in roles.js at all, and an           */
/* undeclared capability is silently false, so the sign-off queue    */
/* was invisible to every non-admin account. The unit tests passed   */
/* because they stub can(). THIS FILE is what caught it.             */
/*                                                                  */
/* So it deliberately drives the real page: it clicks the real       */
/* buttons, reads the real DOM, and reloads the browser to prove     */
/* persistence. A stub here would defeat the entire point.           */
/*                                                                  */
/* Not part of `node --test` (that gate is browserless). Run it      */
/* whenever competency.js, ui-competency.js, roles.js or the Study/  */
/* Teaching surfaces change.                                         */
/*                                                                  */
/*   node tools/e2e/competency-journey.js                            */
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

const FRAMEWORK = {
  name: "Verification Programme", version: "1.0",
  items: [
    { id: "C1", label: "Perform slit-lamp biomicroscopy", domain: "Examination", level: "shows_how" },
    { id: "C2", label: "Interpret visual fields", domain: "Investigations", level: "shows_how" }
  ]
};

(async () => {
  const browser = await chromium.launch({
    executablePath: CHROME
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(URL);
  await page.waitForFunction(() => typeof window.renderHome === "function");

  console.log("\n── the feature is reachable at all ──");

  ok("ui-competency.js actually loaded into the page",
    await page.evaluate(() => typeof window.competencyStudyCard === "function"));

  /* Before a framework exists, the Study tab must say so honestly and must NOT
     invent content. */
  const empty = await page.evaluate(() => window.competencyStudyCard());
  ok("with no framework, the student surface explains rather than showing an empty grid",
    /No competency framework is loaded/.test(empty), empty.slice(0, 120));
  ok("and it does not name a single competency",
    !/slit-lamp|visual field/i.test(empty));

  console.log("\n── faculty imports a framework ──");

  await page.evaluate((f) => {
    window.CU = { username: "sup1", name: "Dr Supervisor", role: "faculty" };
    window.setActiveRole("faculty");
    return window.competencyFrameworkSet(f);
  }, FRAMEWORK);

  ok("the framework persisted to storage",
    await page.evaluate(() => window.competencyFramework().items.length === 2));

  ok("it survives a reload (mirrored, not in-memory)",
    await (async () => {
      await page.reload();
      await page.waitForFunction(() => typeof window.competencyFramework === "function");
      return page.evaluate(() => window.competencyFramework().items.length === 2);
    })());

  console.log("\n── a student records evidence ──");

  await page.evaluate(() => { window.CU = { username: "stu1", name: "Student One", role: "student" };
    window.setActiveRole("student"); });

  /* Render the claim card into the live DOM and drive it exactly as a student
     would: pick a competency, pick a level, type a reflection, click submit. */
  const claimed = await page.evaluate(async () => {
    const host = document.createElement("div");
    host.id = "verifyHost";
    host.innerHTML = window.competencyClaimCard("visit-verify-1", false);
    document.body.appendChild(host);
    if (!document.getElementById("cmpSel")) return { error: "no claim form rendered" };

    document.getElementById("cmpSel").value = "C1";
    document.getElementById("cmpLevel").value = "shows_how";
    document.getElementById("cmpSup").value = "supervised";
    document.getElementById("cmpRefl").value = "I was unsure about the angle estimate.";
    document.querySelector("#verifyHost button").click();

    return {
      message: document.getElementById("cmpMsg").textContent,
      log: window.competencyLog().length,
      entry: window.competencyLog()[0]
    };
  });

  ok("clicking Submit actually created a claim", claimed.log === 1, JSON.stringify(claimed));
  ok("the form told the student what happens next",
    /waiting for a supervisor/i.test(claimed.message || ""));
  ok("the reflection the student typed was stored",
    (claimed.entry || {}).reflection === "I was unsure about the angle estimate.");
  ok("the claim is pending, not an achievement",
    (claimed.entry || {}).status === "pending");
  ok("it is recorded against a REAL encounter",
    (claimed.entry || {}).simulated === false);
  ok("no patient content was copied into the claim",
    !JSON.stringify(claimed.entry || {}).includes("patient_ref\":\"MRN"));

  console.log("\n── the student cannot sign off their own work ──");

  const studentSees = await page.evaluate(() => ({
    review: window.competencyReviewCard(),
    maySupervise: window.competencyMaySupervise()
  }));
  ok("a student account is not offered the sign-off queue",
    studentSees.review === "" && studentSees.maySupervise === false);

  console.log("\n── the supervisor signs it off at the chair ──");

  const signed = await page.evaluate(() => {
    window.CU = { username: "sup1", name: "Dr Supervisor", role: "faculty" };
    window.setActiveRole("faculty");
    const host = document.getElementById("verifyHost");
    host.innerHTML = window.competencyReviewCard();
    if (!/1 waiting/.test(host.innerHTML)) return { error: "queue did not show the claim" };

    /* Open the sign-off form the way a supervisor does — by clicking. */
    host.querySelector("button").click();
    const panel = document.getElementById("cmpReviewPanel");
    if (!panel || !panel.innerHTML) return { error: "sign-off form did not open" };

    const dims = panel.querySelectorAll("[data-cmpdim]").length;
    panel.querySelector('[data-cmpdim="reasoning"]').value = "concern";
    panel.querySelector('[data-cmpdim="communication"]').value = "secure";
    document.getElementById("cmpAgree").value = "knows_how";
    document.getElementById("cmpStrength").value = "Explained the plan clearly.";
    document.getElementById("cmpAction").value = "Practise gonioscopy on five eyes.";

    /* Accept is the first button in the panel's own button row. */
    const btns = [...panel.querySelectorAll("button")];
    btns.find((b) => /Accept/.test(b.textContent)).click();

    return { dims, entry: window.competencyLog()[0] };
  });

  ok("the sign-off form offered every feedback dimension",
    signed.dims === 7, "got " + signed.dims);
  ok("the sign-off was recorded",
    (signed.entry || {}).status === "accepted", JSON.stringify(signed).slice(0, 200));
  ok("the supervisor's agreed level was kept, not the claimed one",
    (signed.entry || {}).level_agreed === "knows_how");
  ok("the student's original claim was ALSO kept, so the gap is visible",
    (signed.entry || {}).level_claimed === "shows_how");
  ok("the structured ratings were stored",
    ((signed.entry || {}).feedback || {}).ratings.reasoning === "concern");
  ok("the improvement action was stored",
    (((signed.entry || {}).feedback || {}).actions || [])[0] === "Practise gonioscopy on five eyes.");

  console.log("\n── the student sees what came back ──");

  const back = await page.evaluate(() => {
    window.CU = { username: "stu1", name: "Student One", role: "student" };
    window.setActiveRole("student");
    return {
      progress: window.competencyProgressCard(),
      feedback: window.competencyFeedbackCard()
    };
  });
  ok("the feedback card shows the action the supervisor asked for",
    /Practise gonioscopy on five eyes/.test(back.feedback), back.feedback.slice(0, 200));
  ok("the progress card shows the competency as in progress, not met",
    /Interpret visual fields/.test(back.progress) && /<b>0<\/b> of <b>2<\/b> met/.test(back.progress));

  console.log("\n── the simulation boundary, in the real UI ──");

  const sim = await page.evaluate(() => {
    const card = window.competencyClaimCard("visit-sim-1", true);
    const host = document.getElementById("verifyHost");
    host.innerHTML = card;
    document.getElementById("cmpSel").value = "C2";
    host.querySelector("button").click();

    const entry = window.competencyLog().find((c) => c.visit_id === "visit-sim-1");
    window.CU = { username: "sup1", name: "Dr Supervisor", role: "faculty" };
    window.setActiveRole("faculty");
    window.competencySignOff(entry.id, "accepted", { level: "shows_how" });
    window.CU = { username: "stu1", name: "Student One", role: "student" };
    window.setActiveRole("student");

    const p = window.competencyProgress("stu1").find((x) => x.id === "C2");
    return {
      warned: /simulated case/i.test(card) && /will not count/i.test(card),
      flagged: entry.simulated === true,
      met: p.met,
      visible: p.evidence_simulated,
      progressCard: window.competencyProgressCard(),
      logbook: window.competencyLogbook("stu1")
    };
  });

  ok("the claim form warns BEFORE the student fills it in", sim.warned);
  ok("the claim is flagged simulated", sim.flagged);
  ok("signed-off simulated work does NOT mark the competency met", sim.met === false);
  ok("but the student can still see the work they did", sim.visible === 1);
  ok("and the screen says why it is not counting",
    /simulated/i.test(sim.progressCard) && /do not count/i.test(sim.progressCard));
  ok("the exported logbook labels the simulated entry in words",
    sim.logbook.entries.some((e) => /SIMULATED/.test(e.encounter_type)));
  ok("the exported logbook labels the real entry as a real patient",
    sim.logbook.entries.some((e) => e.encounter_type === "real patient"));
  ok("the logbook header states the split",
    sim.logbook.encounter_counts.real === 1 && sim.logbook.encounter_counts.simulated === 1,
    JSON.stringify(sim.logbook.encounter_counts));
  ok("the logbook leaks no visit id",
    !JSON.stringify(sim.logbook).includes("visit-verify-1"));

  console.log("\n── the Teaching tab no longer says 'coming soon' about this ──");

  const teaching = await page.evaluate(() => {
    window.CU = { username: "sup1", name: "Dr Supervisor", role: "faculty" };
    window.setActiveRole("faculty");
    return { card: window.competencyTeachingCard(), home: window.homeSecTeaching() };
  });
  ok("the teaching surface renders the framework and the queue",
    /Competency framework/.test(teaching.card));
  ok("the Teaching tab actually includes it",
    /Competency framework/.test(teaching.home));
  ok("the remaining 'coming soon' is scoped to cross-account review only",
    /Logbooks across accounts/.test(teaching.home) &&
    !/🎓 Student logbooks<\/div><div class="home-settings-desc">Follow/.test(teaching.home));

  console.log("\n── keyboard and labelling (Phase 9 invariants still hold) ──");

  const a11y = await page.evaluate(() => {
    const host = document.getElementById("verifyHost");
    host.innerHTML = window.competencyClaimCard("visit-a11y", false);
    const controls = [...host.querySelectorAll("select,textarea,input")];
    const unlabelled = controls.filter((c) => {
      if (c.labels && c.labels.length) return false;
      return !c.getAttribute("aria-label");
    });
    return { total: controls.length, unlabelled: unlabelled.map((c) => c.id || c.tagName) };
  });
  ok("every control in the claim form has a real label",
    a11y.unlabelled.length === 0, "unlabelled: " + a11y.unlabelled.join(", "));
  ok("the claim form actually has controls to label", a11y.total >= 4);

  ok("no uncaught page error occurred anywhere in this run",
    errors.length === 0, errors.join("\n"));

  await browser.close();

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`held: ${held}    BROKE: ${broke}`);
  console.log("══════════════════════════════════════════════════════════");
  process.exit(broke ? 1 : 0);
})();
