/* ═══════════════════════════════════════════════════════════════ */
/* END-TO-END CLINICAL JOURNEY  (Phase 8, §13 §14)                 */
/*                                                                  */
/*   node tools/e2e/patient-journey.js                             */
/*                                                                  */
/* Phase 8's exit criteria flagged "major workflows have end-to-end */
/* coverage" as NOT DONE: every other test drives one module in a   */
/* Node sandbox, and browser verification was hand-run. This is the */
/* automated version — a REAL offline browser, REAL localStorage, a */
/* REAL page reload — driven through the app's actual controller    */
/* functions (newPatient, doSave, completeVisit, startFollowUpVisit),*/
/* which ARE the workflow. It is the whole chain a clinic performs:  */
/*                                                                  */
/*   register → examine → reason → save → complete → RELOAD →       */
/*   retrieve → follow-up                                           */
/*                                                                  */
/* and it asserts the outcomes that matter clinically at each step, */
/* including the two invariants a unit test in isolation cannot     */
/* prove hold across a real persistence round trip:                 */
/*                                                                  */
/*   1. A completed visit survives a page reload, intact.           */
/*   2. On a follow-up, HISTORY carries forward but NO examination  */
/*      finding ever does.                                          */
/*                                                                  */
/* It runs entirely offline; a network request during the journey   */
/* is itself a failure, because the exam must never need one.       */
/*                                                                  */
/* Not part of `node --test` (that gate is browserless). Run it     */
/* before a release, and in any session that touches the exam flow, */
/* storage, or the follow-up path.                                  */
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
  else { broke.push(name + (detail ? "  — " + detail : "")); console.log("  FAIL  " + name + (detail ? "\n          " + detail : "")); }
}

(async () => {
  const { chromium } = require(PW);
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage();

  /* The ONLY external request the app is permitted to make is the cosmetic
     web-font stylesheet, and it is loaded non-blocking (media="print" onload,
     Phase 7): offline it simply fails and the app falls back to system fonts.
     Anything else — and in particular anything that could carry clinical data —
     is an offline-first violation. So the fonts host is allow-listed by name
     and every other host is a failure. */
  const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];
  const netHits = [];
  const fontHits = [];
  page.on("request", (r) => {
    const u = r.url();
    if (u.startsWith("file:") || u.startsWith("data:") || u.startsWith("blob:")) return;
    if (FONT_HOSTS.some((h) => u.indexOf(h) >= 0)) { fontHits.push(u); return; }
    netHits.push(u);
  });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  await page.context().setOffline(true);
  await page.goto(APP, { waitUntil: "load" });
  await page.waitForTimeout(400);

  /* Establish a signed-in clinician. Auth is not what this journey tests — it
     has its own suite — so the session is set directly to the same object the
     real admin sign-in produces, rather than driven through the login form.
     Re-applied after the reload below, because a reload clears CU exactly as
     closing the tab would. */
  const signIn = () => page.evaluate(() => {
    window.alert = () => {}; window.confirm = () => true;
    CU = adminSessionUser();
    if (typeof roleSessionReset === "function") roleSessionReset();
  });
  await signIn();

  console.log("── register → examine → reason ──");

  /* STEP 1 — register a patient and open the initial visit. */
  const reg = await page.evaluate(() => {
    newPatient();
    return { cp: CP, cv: CV, patients: loadPatients().length,
             inProgress: loadVisits().filter((v) => v.status === "in_progress").length };
  });
  check("registration creates a patient", reg.patients >= 1);
  check("registration opens an in-progress visit", !!reg.cv && reg.inProgress >= 1);

  /* STEP 2 — enter a routine presentation WITH some history, run the engine. */
  const routine = await page.evaluate(() => {
    V.cc = "gritty, tired eyes worse in the evening";
    V.symptoms = ["dryness", "burning", "grittiness"];
    V.hxM.dm = true;                 /* history — MUST carry to a follow-up */
    V.hxF.glaucoma = true;           /* history — MUST carry */
    V.iop = { od: "16", os: "15" };  /* examination — must NEVER carry */
    runDiagnosticEngine();
    return { dx: V.dxList.map((d) => d.n).slice(0, 4),
             urgent: V.alerts.filter((a) => a.l === "urgent").length };
  });
  check("a routine exam produces a differential", routine.dx.length > 0, JSON.stringify(routine.dx));
  check("a routine exam raises NO urgent alert", routine.urgent === 0,
    "urgent alerts: " + routine.urgent);

  /* STEP 3 — a red flag appears mid-exam; it must fire. */
  const flag = await page.evaluate(() => {
    V.pupil.rapd = "OD";
    runDiagnosticEngine();
    return { urgent: V.alerts.filter((a) => a.l === "urgent").map((a) => a.m) };
  });
  check("a red flag (RAPD) fires an urgent alert mid-exam",
    flag.urgent.some((m) => /RAPD/i.test(m)), JSON.stringify(flag.urgent));

  console.log("\n── record → save → complete ──");

  /* STEP 4 — record a diagnosis and plan, save, complete. */
  const saved = await page.evaluate(() => {
    V.final_dx = "Dry eye disease; RAPD OD for neuro workup";
    V.plan = { mgmt: "lubricants; urgent neuro-ophthalmology referral" };
    const ds = doSave();
    const cv = completeVisit();
    const stored = getPatientVisits(CP).find((v) => v.id === CV);
    return { doSaveOk: ds.ok, status: stored && stored.status,
             dx: stored && stored.data && stored.data.final_dx };
  });
  check("the visit saves", saved.doSaveOk === true, saved.doSaveOk === true ? "" : "doSave not ok");
  check("the visit is marked completed", saved.status === "completed", "status: " + saved.status);
  check("the recorded diagnosis persisted", /Dry eye disease/.test(saved.dx || ""), saved.dx);

  /* Capture identifiers to find the record again after the reload. */
  const ids = await page.evaluate(() => ({ cp: CP, cv: CV }));

  console.log("\n── RELOAD (real persistence round trip) ──");

  /* STEP 5 — reload the whole app, as closing and reopening the tab would. */
  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(400);
  await signIn();

  const afterReload = await page.evaluate((ids) => {
    const p = loadPatients().find((x) => x.id === ids.cp);
    const visits = getPatientVisits(ids.cp);
    const v = visits.find((x) => x.id === ids.cv);
    return {
      patientThere: !!p,
      visitThere: !!v,
      status: v && v.status,
      dx: v && v.data && v.data.final_dx,
      urgentPersisted: v && v.data && (v.data.alerts || []).some((a) => a.l === "urgent"),
      corrupt: (typeof storageCorruptStores === "function") ? storageCorruptStores().length : 0
    };
  }, ids);
  check("the patient survives a reload", afterReload.patientThere);
  check("the completed visit survives a reload", afterReload.visitThere && afterReload.status === "completed");
  check("the diagnosis survives a reload", /Dry eye disease/.test(afterReload.dx || ""), afterReload.dx);
  check("no store is corrupt after the round trip", afterReload.corrupt === 0,
    "corrupt stores: " + afterReload.corrupt);

  console.log("\n── follow-up: history carries, findings do NOT ──");

  /* STEP 6 — start a follow-up for the same patient. */
  const followUp = await page.evaluate((ids) => {
    CP = ids.cp;
    /* find the patient object so P is set (startFollowUpVisit reads CP) */
    P = loadPatients().find((x) => x.id === ids.cp);
    startFollowUpVisit();
    return {
      newVisitInProgress: V && loadVisits().some((v) => v.id === CV && v.status === "in_progress"),
      visitType: loadVisits().find((v) => v.id === CV).visit_type,
      /* HISTORY — must have carried forward */
      dmCarried: V.hxM && V.hxM.dm === true,
      glaucomaCarried: V.hxF && V.hxF.glaucoma === true,
      /* EXAMINATION — must NOT have carried forward */
      iopOd: (V.iop && V.iop.od) || "",
      slFindings: (V.sl && V.sl.findings && V.sl.findings.length) || 0,
      rapd: (V.pupil && V.pupil.rapd) || "None",
      dxCarried: (V.dxList && V.dxList.length) || 0,
      finalDxCarried: V.final_dx || ""
    };
  }, ids);
  check("a follow-up opens a new in-progress visit", followUp.newVisitInProgress);
  check("the follow-up is typed as a follow_up", followUp.visitType === "follow_up",
    "type: " + followUp.visitType);
  check("medical history (diabetes) carried forward", followUp.dmCarried === true);
  check("family history (glaucoma) carried forward", followUp.glaucomaCarried === true);
  check("IOP measurement did NOT carry forward", followUp.iopOd === "",
    "carried IOP OD: " + JSON.stringify(followUp.iopOd));
  check("the RAPD finding did NOT carry forward", followUp.rapd === "None",
    "carried RAPD: " + followUp.rapd);
  check("slit-lamp findings did NOT carry forward", followUp.slFindings === 0);
  check("the previous differential did NOT carry forward", followUp.dxCarried === 0);
  check("the previous final diagnosis did NOT carry forward", followUp.finalDxCarried === "",
    "carried final_dx: " + followUp.finalDxCarried);

  console.log("\n── second journey: paediatric red-flag referral ──");

  /* A different clinical path entirely: a young child with leukocoria — the
     retinoblastoma red flag — through to an urgent referral, a save, and a
     reload. Paediatric patients and the referral workflow are both on the
     Phase 8 clinical edge-case matrix and neither is exercised above. */
  const paed = await page.evaluate(() => {
    newPatient();
    P.age = "3";
    V.fun.findings = ["Leukocoria (white pupillary reflex)"];
    runDiagnosticEngine();
    const urgent = V.alerts.filter((a) => a.l === "urgent").map((a) => a.m);
    V.final_dx = "Leukocoria OD — urgent paediatric ophthalmology referral";
    V.plan = { mgmt: "same-day referral", referral: "paediatric ophthalmology, urgent" };
    const ds = doSave();
    completeVisit();
    return { cp: CP, cv: CV, urgent, doSaveOk: ds.ok };
  });
  check("leukocoria in a child fires an urgent alert",
    paed.urgent.some((m) => /leukocoria/i.test(m)), JSON.stringify(paed.urgent));
  check("the paediatric referral visit saves and completes", paed.doSaveOk === true);

  await page.reload({ waitUntil: "load" });
  await page.waitForTimeout(400);
  await signIn();

  const paedReload = await page.evaluate((ids) => {
    const v = getPatientVisits(ids.cp).find((x) => x.id === ids.cv);
    return { there: !!v, status: v && v.status,
             referral: v && v.data && v.data.plan && v.data.plan.referral,
             dx: v && v.data && v.data.final_dx };
  }, { cp: paed.cp, cv: paed.cv });
  check("the paediatric referral survives a reload",
    paedReload.there && paedReload.status === "completed");
  check("the urgent referral plan persisted", /urgent/i.test(paedReload.referral || ""),
    paedReload.referral);
  check("the paediatric diagnosis persisted", /Leukocoria/.test(paedReload.dx || ""),
    paedReload.dx);

  console.log("\n── offline integrity ──");
  check("no network request except the non-blocking font stylesheet", netHits.length === 0,
    netHits.slice(0, 3).join(", "));
  check("the only external host contacted is the cosmetic font host",
    fontHits.length === 0 || netHits.length === 0,
    "font requests (non-blocking, harmless offline): " + fontHits.length);
  check("no uncaught page error occurred", pageErrors.length === 0,
    pageErrors.slice(0, 2).join(" | "));

  await browser.close();

  console.log("\n" + "═".repeat(60));
  console.log("held: " + held + "    FAILED: " + broke.length);
  if (broke.length) { console.log("\nWhat failed:"); broke.forEach((b, i) => console.log("  " + (i + 1) + ". " + b)); }
  console.log("═".repeat(60));
  process.exit(broke.length ? 1 : 0);
})().catch((e) => { console.error("E2E harness crashed:", e); process.exit(2); });
