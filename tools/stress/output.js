/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — WHAT LEAVES THE CLINIC ON PAPER            */
/*                                                                  */
/*   node tools/stress/output.js                                    */
/*                                                                  */
/* A prescription, a referral letter and a certificate are the      */
/* only Entopic outputs that a patient, a pharmacist, another       */
/* clinician or an employer will read WITHOUT the app in front of   */
/* them. Nothing on those pages can be clarified later by clicking. */
/*                                                                  */
/* Three failure modes, in order of consequence:                    */
/*                                                                  */
/*  1. A MISSING value printed as a real one. "Plano" is a positive */
/*     clinical assertion — no refractive error — and lenses get    */
/*     ground from it. An unmeasured eye printing plano turns       */
/*     missing data into a wrong prescription (RX-1).               */
/*  2. An official-looking document produced from nothing.          */
/*  3. The advisory framing lost, so a ranked differential reads as */
/*     a diagnosis. CLAUDE.md requires that framing to survive into */
/*     any generated report; this checks that it does.              */
/*                                                                  */
/* Runs in a real browser, because these are rendered pages.        */
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
function group(t) { console.log("\n── " + t + " " + "─".repeat(Math.max(0, 58 - t.length))); }

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof window.rxCell === "function");
  await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

  /* Sign in for real. Without a session the app paints the auth screen, and
     every assertion below would be reading the login form rather than the
     document under test — which is exactly what the first run of this harness
     did, reporting "the referral letter omits an urgent finding" when the
     letter had never been rendered at all. */
  await page.evaluate(() => { if (typeof window.showSignup === "function") window.showSignup(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Test Clinic");
    set("inp_su", "drtest_out"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((b) => /Create Account/i.test(b.textContent)).click();
  });
  await page.waitForTimeout(1300);
  const signedIn = await page.evaluate(() => !!(window.CU && window.CU.username));
  ok("signed in, so the pages below are the real documents", signedIn);

  const ev = (fn, arg) => page.evaluate(fn, arg);

  /* ═══════════════════════════════════════════════════════════ */
  group("The prescription — absence must never print as a lens");

  const cells = await ev(() => {
    const cases = ["", "   ", null, undefined, "0", "0.00", "+0.00", "-0.00", "plano", "PL",
                   "-2.25", "+1.50", "0.0", "+0", "-0", "abc", "<img src=x onerror=1>"];
    const out = {};
    cases.forEach((c) => { out[JSON.stringify(c)] = String(window.rxCell(c)); });
    return out;
  });
  ok("an EMPTY sphere never prints as plano",
    !/plano/i.test(cells['""']) && !/plano/i.test(cells['"   "']),
    JSON.stringify({ empty: cells['""'], spaces: cells['"   "'] }));
  ok("a null / undefined sphere never prints as plano",
    !/plano/i.test(cells["null"]) && !/plano/i.test(cells[undefined] || ""),
    JSON.stringify({ nul: cells["null"] }));
  ok("an empty value says it was not recorded",
    /not recorded|—|-/.test(cells['""']), "got " + cells['""']);
  ok("an EXPLICIT zero still prints plano (a genuine plano is valid)",
    /plano/i.test(cells['"0"']) && /plano/i.test(cells['"0.00"']),
    JSON.stringify({ zero: cells['"0"'], zero2: cells['"0.00"'] }));
  ok("a real power prints as itself",
    cells['"-2.25"'].indexOf("-2.25") >= 0, "got " + cells['"-2.25"']);

  const incomplete = await ev(() => ({
    nothing: window.rxIncompleteEyes({}),
    cylNoAxis: window.rxIncompleteEyes({ od_sph: "-1.00", od_cyl: "-0.75", os_sph: "-1.00" }),
    axisNoCyl: window.rxIncompleteEyes({ od_sph: "-1.00", od_ax: "180", os_sph: "-1.00" }),
    complete: window.rxIncompleteEyes({ od_sph: "-1.00", os_sph: "-1.00" })
  }));
  ok("an eye with no sphere is reported unfillable", incomplete.nothing.length === 2);
  ok("a cylinder without an axis is reported unfillable",
    incomplete.cylNoAxis.length === 1 &&
    JSON.stringify(incomplete.cylNoAxis).indexOf("axis") >= 0);
  ok("an axis without a cylinder is reported unfillable",
    incomplete.axisNoCyl.length === 1 &&
    JSON.stringify(incomplete.axisNoCyl).indexOf("cylinder") >= 0);
  ok("a complete pair is not flagged (positive control)", incomplete.complete.length === 0);

  ok("a visit with no refraction at all has nothing to prescribe",
    await ev(() => window.rxHasAnyRefraction({}) === false &&
                   window.rxHasAnyRefraction({ od_sph: "" }) === false &&
                   window.rxHasAnyRefraction({ od_sph: "-1.00" }) === true));

  const rxPage = await ev(() => {
    window.P = window.blankPatient("p1", "M1");
    window.P.first_name = "Test"; window.P.last_name = "Patient";
    window.V = window.blankVisit();
    /* Only the right eye was refracted. */
    window.V.rx.od_sph = "-2.00";
    /* pgRxP RETURNS the page HTML; it does not paint the body. Reading
       document.body here is how the first run of this harness ended up
       asserting against the patient list. */
    try { return { html: String(window.pgRxP() || "") }; }
    catch (e) { return { error: String(e) }; }
  });
  ok("a half-refracted prescription page renders", !rxPage.error, rxPage.error);
  if (!rxPage.error) {
    ok("the unmeasured eye is NOT presented as plano",
      !/plano/i.test(rxPage.html) || /not recorded/i.test(rxPage.html),
      rxPage.html.slice(0, 200));
    ok("the page says an eye is unfillable as written",
      /not recorded|cannot|incomplete|unfillable|missing/i.test(rxPage.html),
      rxPage.html.slice(0, 200));
  }

  const rxEmpty = await ev(() => {
    window.P = window.blankPatient("p2", "M2");
    window.V = window.blankVisit();
    try { return { html: String(window.pgRxP() || "") }; }
    catch (e) { return { error: String(e) }; }
  });
  ok("with NO refraction the page refuses to produce a print-ready prescription",
    !rxEmpty.error && !/print/i.test((rxEmpty.html || "").slice(0, 400)) ||
      /nothing to prescribe|no refraction|not been refracted/i.test(rxEmpty.html || ""),
    (rxEmpty.html || "").slice(0, 200));

  /* ═══════════════════════════════════════════════════════════ */
  group("The referral letter");

  const ref = await ev(() => {
    window.P = window.blankPatient("p3", "MRN-3");
    window.P.first_name = "Ref"; window.P.last_name = "Patient"; window.P.age = 62;
    window.V = window.blankVisit();
    window.V.cc = "sudden loss of vision";
    window.V.symptoms = ["sudden_vision_loss"];
    window.V.pupil = { rapd: "od" };
    window.V.plan = { ref_to: "Ophthalmologist", ref_urgency: "Emergency (same day)" };
    try { window.runDiagnosticEngine(); } catch (e) {}
    /* The letter is stored on the visit (V.plan.ref_letter) and displayed;
       it is not returned. window.open is stubbed so a popup cannot swallow it. */
    window.open = function () {
      return { document: { write: function () {}, title: "" } };
    };
    try {
      window.generateReferralLetter();
      return { text: String((window.V.plan && window.V.plan.ref_letter) || "") };
    } catch (e) { return { error: String(e) }; }
  });
  if (ref.error) {
    ok("the referral letter generates", false, ref.error);
  } else {
    ok("the referral letter generates", true);
    ok("it names the patient it is about",
      /Ref/.test(ref.text) && /Patient/.test(ref.text), ref.text.slice(0, 160));
    ok("it carries the urgency the clinician chose",
      /emergency|same day/i.test(ref.text), ref.text.slice(0, 200));
    ok("an urgent finding is not omitted from the letter",
      /rapd|afferent|urgent|sudden/i.test(ref.text), ref.text.slice(0, 240));
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("The advisory framing must survive onto paper");

  const framing = await ev(() => {
    window.P = window.blankPatient("p4", "MRN-4");
    window.V = window.blankVisit();
    window.V.symptoms = ["redness"];
    try { window.runDiagnosticEngine(); } catch (e) {}
    const out = {};
    try { out.report = String(window.pgRpt() || ""); } catch (e) { out.reportErr = String(e); }
    return out;
  });
  if (framing.reportErr) {
    ok("the visit report renders", false, framing.reportErr);
  } else {
    ok("the visit report renders", true);
    ok("the report frames the engine output as advisory, not as a diagnosis",
      /advisor|clinical correlation|not a diagnosis|support|decision support|judgement|judgment/i
        .test(framing.report),
      "no advisory framing found in the printed report");
    ok("the report does not present a ranked match as a probability of disease",
      !/probability of having/i.test(framing.report));
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("Certificates — no fabricated clinical content");

  const cert = await ev(() => {
    const t = window.CERTIFICATE_TEMPLATES || [];
    return {
      count: t.length,
      allFlagged: t.every((x) => !x.review_status || x.review_status === window.CERT_REVIEW_STATUS ||
                                 x.review_status === "NEEDS_CLINICAL_REVIEW"),
      status: window.CERT_REVIEW_STATUS,
      titles: t.map((x) => x.title || x.name || x.id)
    };
  });
  ok("certificate templates exist", cert.count > 0);
  ok("certificate templates are marked as needing clinical review",
    cert.status === "NEEDS_CLINICAL_REVIEW",
    "review status is " + cert.status);

  const certDraft = await ev(() => {
    const t = (window.CERTIFICATE_TEMPLATES || [])[0];
    if (!t) return { skip: true };
    window.P = window.blankPatient("p5", "MRN-5");
    window.V = window.blankVisit();
    try { window.certStart(t.id); } catch (e) { return { error: String(e) }; }
    const d = window.CERT_DRAFT;
    return { rows: (d && d.rows) ? d.rows.length : 0,
             prefilled: (d && d.rows) ? d.rows.filter((r) => String(r.v || "").trim() !== "").length : 0,
             values: (d && d.rows) ? d.rows.map((r) => r.v) : [] };
  });
  if (!certDraft.skip && !certDraft.error) {
    ok("a certificate starts with fields, not with invented answers",
      certDraft.rows > 0);
    ok("no certificate field is pre-filled with a clinical claim the clinician did not make",
      certDraft.values.every((v) => {
        const s = String(v == null ? "" : v).trim();
        return s === "" || /^(od|os|ou|—|-|n\/a)$/i.test(s) ||
               /Test|MRN|p5|^\d{4}-\d{2}-\d{2}$/.test(s);
      }),
      JSON.stringify(certDraft.values).slice(0, 200));
  } else if (certDraft.error) {
    ok("a certificate can be started", false, certDraft.error);
  }

  await browser.close();
  console.log("\n" + "═".repeat(66));
  console.log("output — held: " + held + "    BROKE: " + broke);
  console.log("═".repeat(66));
  if (errs.length) {
    console.log("page errors seen:");
    [...new Set(errs)].slice(0, 6).forEach((e) => console.log("  · " + e.slice(0, 130)));
  }
  process.exit(broke ? 1 : 0);
})();
