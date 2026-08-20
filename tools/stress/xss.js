/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — SCRIPT INJECTION, ACROSS EVERY SCREEN      */
/*                                                                  */
/*   node tools/stress/xss.js                                       */
/*                                                                  */
/* This one runs in a REAL BROWSER, because the question is not     */
/* "does the string look escaped" but "did the browser execute it". */
/* A static scan cannot answer that; two separate holes in this     */
/* repo were found by rendering and looking, and the second one     */
/* survived a fix to the first because it lived in a different      */
/* function that also wrote a condition name.                       */
/*                                                                  */
/* METHOD. Plant one unmistakable payload in EVERY string field of  */
/* a patient, a visit, a knowledge-base overlay, an account and a   */
/* casebook entry. Render every screen. Then assert two things:     */
/*                                                                  */
/*   · no element carrying an event handler from the payload ever   */
/*     appears in the DOM, and                                      */
/*   · the payload never executes (window.__xss stays 0).           */
/*                                                                  */
/* WHY THE INPUTS ARE NOT "UNREALISTIC". A clinician cannot type a  */
/* script tag into a number field — but a RESTORED BACKUP, an       */
/* IMPORTED file, a SYNCED record from another device and a         */
/* PUBLISHED knowledge-base bundle all arrive as JSON that nothing  */
/* re-validates. Every one of those is a supported feature.         */
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
function group(t) { console.log("\n── " + t + " " + "─".repeat(Math.max(0, 60 - t.length))); }

/* Four payload shapes, because they break out of different contexts:
   element content, a double-quoted attribute, a single-quoted attribute, and
   an inline handler's JS string. */
const PAYLOADS = {
  tag:    '<img src=x onerror="window.__xss=1">',
  attrD:  '" onmouseover="window.__xss=1" x="',
  attrS:  "' onmouseover='window.__xss=1' x='",
  jsStr:  "');window.__xss=1;//"
};

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof window.renderHome === "function");
  await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

  /* Everything the DOM must never contain after a render. */
  async function liveHandlers() {
    return page.evaluate(() => {
      const bad = [];
      document.querySelectorAll("*").forEach((el) => {
        for (const a of el.attributes || []) {
          if (/^on/i.test(a.name) && /__xss/.test(a.value)) {
            bad.push(el.tagName + "[" + a.name + "] in " +
              (el.parentElement ? (el.parentElement.className || el.parentElement.tagName) : "?"));
          }
        }
      });
      /* A <script> that came from data would also be a break-out. */
      document.querySelectorAll("script").forEach((s) => {
        if (/__xss/.test(s.textContent || "")) bad.push("SCRIPT with payload");
      });
      return bad;
    });
  }

  async function sweep(label, setup) {
    /* Reset between sweeps. An injected element that landed in a PREVIOUS
       sweep stays in the DOM, and would then be reported against whichever
       sweep ran next — attributing a real defect to the wrong screen. Reload
       rather than hand-clean, so nothing stale survives anywhere. */
    await page.goto(URL);
    await page.waitForFunction(() => typeof window.renderHome === "function");
    await page.evaluate(() => {
      window.alert = () => {}; window.confirm = () => true;
      window.__xss = 0;
      try { localStorage.clear(); } catch (e) {}
    });
    const err = await page.evaluate(setup);
    await page.waitForTimeout(120);
    const handlers = await liveHandlers();
    const fired = await page.evaluate(() => window.__xss);
    ok(label + " — no live event handler reaches the DOM",
       handlers.length === 0, handlers.slice(0, 3).join(" | "));
    ok(label + " — the payload never executes", fired === 0);
    if (err && err.error) console.log("            (render note: " + err.error + ")");
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("The advisory panel and the glass box");

  for (const [kind, payload] of Object.entries(PAYLOADS)) {
    await sweep("differential, " + kind + " payload", new Function("", `
      var P_ = ${JSON.stringify(payload)};
      try {
        window.P = window.blankPatient("p1", "M1");
        window.V = window.blankVisit();
        window.V.dxList = [{ n: P_, icd: P_, prob: 0.9, domain: P_, cat: P_,
                             reasoning: P_, urgent: true }];
        window.V.alerts = [{ l: "urgent", m: P_, t: P_ }];
        window.V.nudges = [{ t: P_, w: P_ }];
        window.renderAdvisory();
      } catch (e) { return { error: String(e) }; }
      return {};
    `));
  }

  await sweep("the engine flow map, every layer", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      window.P = window.blankPatient("p1","M1");
      window.V = window.blankVisit();
      window.V.symptoms = [P_];
      window.V.dxList = [{ n: P_, icd: P_, prob: 0.5, domain: P_ }];
      window.ENGINE_STATE = window.ENGINE_STATE || {};
      window.ENGINE_STATE.tokens = [P_];
      window.ENGINE_STATE.routes = [P_];
      window.ENGINE_STATE.results = [{ name: P_, score: 0.9, urgent: false,
                                       _scoreDetail: { reqMatched: 1, reqMissing: 0, supMatched: 0 } }];
      var host = document.getElementById("advEl") || document.body;
      host.innerHTML = window.renderFlowMap();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  /* ═══════════════════════════════════════════════════════════ */
  group("Patient records and the chart");

  await sweep("a patient whose every field is hostile", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      var pt = window.blankPatient("pX", P_);
      ["first_name","last_name","mrn","phone","email","address","occupation",
       "sex","age","notes","guardian"].forEach(function (k) { pt[k] = P_; });
      var pts = window.loadPatients().filter(function (p) { return p.id !== "pX"; });
      pts.push(pt); window.savePatients(pts);
      window.CU = { username: "u", name: "U", role: "clinician" };
      window.setActiveRole("clinician");
      window.HOME_TAB = "patients";
      window.renderHome();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("a hostile visit rendered read-only in the chart", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      var v = { id: "vX", patient_id: "pX", date: "2026-01-01T00:00:00.000Z",
                status: "completed", visit_type: "initial",
                data: { cc: P_, final_dx: P_,
                        symptoms: [P_],
                        hxO: { conditions: P_, surgeries: P_, cl_type: P_ },
                        hxM: { conditions: P_, medications: P_, allergies: P_ },
                        hxF: { details: P_ },
                        sl: { findings: [{ label: P_, eye: P_ }], od: { cornea: P_ } },
                        plan: { ref_to: P_, ref_urgency: P_, notes: P_ },
                        va: { od_un: P_, os_un: P_ },
                        rx: { od_sph: P_, os_sph: P_ } } };
      var vs = window.loadVisits().filter(function (x) { return x.id !== "vX"; });
      vs.push(v); window.saveVisits(vs);
      window.CP = "pX";
      if (typeof window.viewPastVisit === "function") window.viewPastVisit("vX");
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  /* ═══════════════════════════════════════════════════════════ */
  group("The knowledge base — overlays and published bundles");

  await sweep("a user-authored KB overlay condition", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      if (typeof window.kbOverlaySave === "function") {
        window.kbOverlaySave({ id: "ovX", name: P_, domain: P_, route: "routine",
                               req: ["redness"], sup: [], con: [], tests: [],
                               icd: P_, notes: P_ });
      } else if (typeof window.KNOWLEDGE_ALL !== "undefined") {
        window.KNOWLEDGE_ALL.push({ name: P_, domain: P_, route: "routine",
          req: ["redness"], sup: [], con: [], tests: [], _index: window.KNOWLEDGE_ALL.length });
        if (typeof window.rebuildKbIndexes === "function") window.rebuildKbIndexes();
      }
      if (typeof window.showKBInfo === "function") window.showKBInfo();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("a hostile condition surfacing through the real engine", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      if (typeof window.KNOWLEDGE_ALL !== "undefined") {
        window.KNOWLEDGE_ALL.push({ name: P_, domain: "Cornea", route: "routine",
          req: ["redness"], sup: [], con: [], tests: [], urgent: false,
          _index: window.KNOWLEDGE_ALL.length });
        if (typeof window.rebuildKbIndexes === "function") window.rebuildKbIndexes();
      }
      window.P = window.blankPatient("p1","M1");
      window.V = window.blankVisit();
      window.V.symptoms = ["redness"];
      window.runDiagnosticEngine();
      window.renderAdvisory();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  /* ═══════════════════════════════════════════════════════════ */
  group("Accounts, competency and the home screens");

  await sweep("a hostile signed-in account across every tab", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      window.CU = { username: P_, name: P_, role: "clinician", clinic: P_, credentials: P_ };
      ["patients","study","teaching","account","casebook","kb"].forEach(function (t) {
        try { window.HOME_TAB = t; window.renderHome(); } catch (e) {}
      });
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("a hostile competency framework and sign-off", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      window.CU = { username: "sup", name: P_, role: "faculty" };
      window.setActiveRole("faculty");
      window.competencyFrameworkSet({ name: P_, version: P_, source: P_,
        items: [{ id: "C1", label: P_, domain: P_, level: "shows_how", description: P_ }] });
      window.competencyClaim("C1", { visit_id: P_, reflection: P_, level: "shows_how" });
      window.HOME_TAB = "teaching"; window.renderHome();
      var host = document.getElementById("homeBody") || document.body;
      host.innerHTML = window.competencyTeachingCard() + window.competencyStudyCard();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  /* ═══════════════════════════════════════════════════════════ */
  group("Storage failure banners and the audit trail");

  await sweep("a hostile corruption reason in the storage banner", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      window.localStorage.setItem("entopic_visits", "{not json" + P_);
      window.loadVisits();
      if (typeof window.renderStorageBanners === "function") window.renderStorageBanners();
      if (typeof window.renderHome === "function") window.renderHome();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await browser.close();

  console.log("\n" + "═".repeat(66));
  console.log("xss — held: " + held + "    BROKE: " + broke);
  console.log("═".repeat(66));
  if (pageErrors.length) {
    console.log("page errors seen (not necessarily failures):");
    [...new Set(pageErrors)].slice(0, 5).forEach((e) => console.log("  · " + e.slice(0, 120)));
  }
  process.exit(broke ? 1 : 0);
})();
