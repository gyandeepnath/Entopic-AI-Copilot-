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
const espree = require("/opt/node22/lib/node_modules/eslint/node_modules/espree");

/* Does this inline-handler body EXECUTE the payload? An escaped payload still
   CONTAINS the text "__xss" — inside a string literal passed to an app
   function — so a text match reports correct escaping as a break-out. Parse
   the handler and look for the payload as CODE: any reference to __xss that
   is not inside a string literal. A handler that no longer parses at all is
   reported too: the escaping broke it, even if nothing ran. */
function handlerExecutesPayload(body) {
  let ast;
  try { ast = espree.parse("(function(event){" + body + "\n})", { ecmaVersion: "latest" }); }
  catch (e) { return "handler no longer parses (" + e.message.slice(0, 40) + ")"; }
  let live = false;
  (function walk(n) {
    if (!n || typeof n !== "object" || live) return;
    if (n.type === "Identifier" && n.name === "__xss") { live = true; return; }
    if (n.type === "Literal" || n.type === "TemplateElement") return;
    for (const k of Object.keys(n)) {
      if (k === "parent") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === "string") walk(v);
    }
  })(ast);
  return live ? "payload is live code" : "";
}

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
  jsStr:  "');window.__xss=1;//",
  /* The hand-rolled `escHtml(x).replace(/'/g, "\\'")` escapes the quote but
     not the backslash, so a LEADING backslash turns its added \\' into an
     escaped backslash followed by a real quote. escAttrJs exists for this. */
  jsStrBs: "\\');window.__xss=1;//",
  /* An HTML ENTITY: attribute values are entity-decoded before the handler
     runs, so escaping only the quote CHARACTER (JSON.stringify + a " →
     &quot; swap) lets a name containing the text &quot; decode into a real
     quote inside the handler. */
  entity: "x&quot;);window.__xss=1;//"
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
    const found = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("*").forEach((el) => {
        for (const a of el.attributes || []) {
          if (/^on/i.test(a.name) && /__xss/.test(a.value)) {
            out.push({ where: el.tagName + "[" + a.name + "] in " +
              (el.parentElement ? (el.parentElement.className || el.parentElement.tagName) : "?"), body: a.value });
          }
          /* a javascript: URL in an href/src would also be a break-out */
          if (/^(href|src|action|formaction)$/i.test(a.name) && /^\s*javascript:/i.test(a.value) && /__xss/.test(a.value)) {
            out.push({ where: el.tagName + "[" + a.name + "] javascript: URL", body: "window.__xss=1" });
          }
        }
      });
      /* A <script> that came from data would also be a break-out. */
      document.querySelectorAll("script").forEach((s) => {
        if (/__xss/.test(s.textContent || "")) out.push({ where: "SCRIPT with payload", body: "window.__xss=1" });
      });
      return out;
    });
    return found.map((f) => { const why = handlerExecutesPayload(f.body); return why ? f.where + " — " + why : ""; })
                .filter(Boolean);
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
  group("Full audit (2026-09-24): report, diagnosis, review screens, drawings, ids");

  for (const [kind, payload] of Object.entries(PAYLOADS)) {
    await sweep("the clinical report and the Diagnosis step, " + kind + " payload", new Function("", `
      var P_ = ${JSON.stringify(payload)};
      try {
        window.P = window.blankPatient("p1", "M1");
        window.V = window.blankVisit();
        window.CU = { username: "u", name: P_, cred: P_, clinic: P_ };
        var V = window.V;
        ["od_un","os_un","od_ph","os_ph","od_bva","os_bva","od_near","os_near","chart","dist"].forEach(function (k) { V.va[k] = P_; });
        V.iop.od = P_; V.iop.os = P_; V.iop.method = P_; V.iop.time = P_;
        V.pupil.rapd = P_; V.pupil.rapd_grade = P_;
        V.sl.findings = [{ label: P_, eye: P_ }, P_];
        V.fun.findings = [{ label: P_, eye: P_ }]; V.fun.method = P_; V.fun.od.cd_v = P_;
        V.bv.ct_n = P_; V.bv.npc_b = P_; V.bv.acc_os = P_;
        V.temporal.onset = P_; V.final_dx = P_;
        V.rx.od_sph = P_; V.rx.fin_od_sph = P_; V.rx.method = P_; V.rx.pd_bi = P_;
        V.dxList = [{ n: P_, icd: P_, prob: 0.9, cat: P_, domain: P_, urgent: true,
                      evidence: { matched: [P_], missing: [P_], contradicted: [P_], suggestedTests: [P_], confidence: P_ } }];
        V.alerts = [{ l: P_, m: P_ }];
        V.step = "report"; var host = document.getElementById("mainEl") || document.body;
        host.innerHTML = window.pgRpt();
        host.innerHTML += window.pgDx ? "" : "";
        /* pgDx re-runs the engine; render it with the hostile list restored after */
        var html = (function () { var r = window.runDiagnosticEngine; window.runDiagnosticEngine = function () {}; try { return window.pgDx(); } finally { window.runDiagnosticEngine = r; } })();
        host.innerHTML += html + window.pgRxP();
      } catch (e) { return { error: String(e) }; }
      return {};
    `));
  }

  await sweep("a hostile condition name in the validation workspace and review queue", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.jsStrBs)};
    try {
      var c = JSON.parse(JSON.stringify(window.KNOWLEDGE_ALL[0]));
      c.name = P_; c.domain = P_; c.icd = ""; c.review_status = "NEEDS_CLINICAL_REVIEW";
      window.KNOWLEDGE_ALL.push(c);
      if (typeof window.rebuildKbIndexes === "function") window.rebuildKbIndexes();
      window.CU = { username: "admin", name: "A", admin: true, role: "clinician" };
      if (window.showReviewQueue) window.showReviewQueue();
      if (window.openValidation) window.openValidation(P_);
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("a saved drawing whose image and legend are hostile", new Function("", `
    var P_ = ${JSON.stringify(PAYLOADS.tag)};
    try {
      window.P = window.blankPatient("p1", "M1");
      window.V = window.blankVisit();
      window.V.sl.drawings = [{ id: ${JSON.stringify(PAYLOADS.jsStr)}, eye: P_, by: P_, timestamp: P_,
        data: 'x" onerror="window.__xss=1', legend: [{ value: "red", label: P_, use: P_ }] }];
      window.V.step = "slit_lamp";
      var host = document.getElementById("mainEl") || document.body;
      host.innerHTML = window.pgSL();
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("hostile record ids across the patient list, chart and queues", new Function("", `
    var J_ = ${JSON.stringify(PAYLOADS.jsStr)};
    try {
      window.CU = { username: "u", name: "U", role: "clinician" };
      window.savePatients([{ id: J_, mrn: "M", first_name: "A", last_name: "B", created: new Date().toISOString() }]);
      window.saveVisits([{ id: J_, patient_id: J_, status: "completed", date: new Date().toISOString(),
                           updated: new Date().toISOString(), data: { cc: "x", symptoms: [] } }]);
      window.HOME_TAB = "patients"; window.renderHome();
      if (window.openChart) window.openChart(J_);
    } catch (e) { return { error: String(e) }; }
    return {};
  `));

  await sweep("a hostile condition name in the simulation answer list (entity payload)", new Function("", `
    var N_ = ${JSON.stringify(PAYLOADS.entity)};
    try {
      window.P = window.blankPatient("p1", "M1");
      window.V = window.blankVisit();
      window.V.dxList = [{ n: N_, prob: 0.5 }, { n: "Dry eye", prob: 0.4 }];
      window.SIM.active = true;
      window.SIM.theCase = { condition: N_, decisive: [], byStep: {} };
      window.simOpenAnswerShortlist();
      if (window.simSearchRender) window.simSearchRender("x");
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
