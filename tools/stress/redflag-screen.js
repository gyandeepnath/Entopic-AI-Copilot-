/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — DOES A RED FLAG ACTUALLY REACH THE SCREEN? */
/*                                                                  */
/*   node tools/stress/redflag-screen.js                            */
/*                                                                  */
/* attack.js proves the ENGINE fires an urgent alert (F1-F4). That  */
/* is not the same question as whether the CLINICIAN SEES IT.       */
/* Between the engine and the eye there is a render, a panel that   */
/* can be scrolled or collapsed, a differential that can be empty,  */
/* a storage layer that can be broken and a vault that can be       */
/* locked. Any of those could swallow the one output this product   */
/* is least allowed to lose.                                        */
/*                                                                  */
/* CLAUDE.md: "Red flags are un-suppressible. Urgent/safety alerts  */
/* must always fire and must never be gated behind probabilistic    */
/* scoring or exclusion logic." This asks whether that survives all */
/* the way to painted pixels, in a real browser.                    */
/*                                                                  */
/* Every scenario below is driven from knowledge/red-flags.js —     */
/* nothing here invents a threshold or a clinical trigger.          */
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
function group(t) { console.log("\n── " + t + " " + "─".repeat(Math.max(0, 56 - t.length))); }

/* Each scenario sets the visit fields the corresponding rule reads. Values are
   structural triggers, not invented clinical numbers: the IOP figures are the
   thresholds the rules themselves declare. */
/* Each scenario names the RULE it exercises and sets the fields the engine
   ACTUALLY reads (js/engine.js), not the fields the rule's prose suggests.

   Two rounds of my own errors are recorded here because both would have been
   reported as safety failures:
     · I invented triggers — a "Leukocoria" slit-lamp finding, a
       `curtain_shadow` token, a `metamorphopsia` token. The real ones are the
       paediatric red-reflex field, `curtain_vision`, and `V.neuro.amsler`.
     · I asserted every rule must raise an URGENT alert. Two of them declare
       `level: "warn"` in knowledge/red-flags.js and are warnings by design.
   The expected level is now READ FROM THE RULE rather than assumed, so this
   harness cannot disagree with the knowledge base about what a rule is. */
const SCENARIOS = [
  ["sudden_vision_loss", { symptoms: ["sudden_vision_loss"] }],
  ["flashes_floaters", { symptoms: ["flashes", "floaters"] }],
  ["curtain_vision", { symptoms: ["curtain_vision"] }],
  ["pain_eye_movement", { symptoms: ["pain_eye_movement"] }],
  ["metamorphopsia", { neuro: { amsler: "Distortion" } }],
  ["rapd", { pupil: { rapd: "od" } }],
  ["hypopyon", { sl: { findings: [{ label: "Hypopyon", eye: "OD" }] } }],
  ["rubeosis", { sl: { findings: [{ label: "Rubeosis iridis", eye: "OD" }] } }],
  ["leukocoria", { paed: { red_reflex_od: "White (leukocoria)" } }]
];

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  page.on("pageerror", (e) => errs.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => typeof window.renderAdvisory === "function");
  await page.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

  /* SIGN IN AND OPEN A REAL EXAM.

     #advEl is a child of the exam page. Without navigating there the panel's
     parent is hidden, so every alert paints correctly and every computed style
     reports offsetHeight 0 — which the first run of this harness reported as
     "the alert is not visible" for all nine red flags at once. Twenty failures,
     none of them real. A visibility assertion is only meaningful on a screen
     the clinician could actually be looking at. */
  await page.evaluate(() => { if (typeof window.showSignup === "function") window.showSignup(); });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Test Clinic");
    set("inp_su", "drtest_rf"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((b) => /Create Account/i.test(b.textContent)).click();
  });
  await page.waitForTimeout(1300);
  await page.evaluate(() => { window.newPatient(); if (window.openExam) window.openExam(); });
  await page.waitForTimeout(500);

  const panelReady = await page.evaluate(() => {
    const el = document.getElementById("advEl");
    return !!el && el.offsetHeight > 0;
  });
  ok("the advisory panel is on screen, so visibility assertions mean something",
     panelReady);

  /* Run one scenario and report what the DOM actually shows. */
  async function paint(fields, extraSetup, ruleId) {
    return page.evaluate(({ f, extra, ruleId }) => {
      /* A FRESH VISIT each time. Without this the "What changed" section
         narrates the previous scenario into this one — the first run reported
         a leukocoria case whose panel text read "No longer showing: Rubeosis
         iridis", i.e. the last scenario's alert leaking forward. */
      window.newPatient();
      if (window.openExam) window.openExam();
      window.P.age = 55;
      Object.keys(f).forEach((k) => {
        if (f[k] && typeof f[k] === "object" && !Array.isArray(f[k]) && window.V[k]) {
          Object.assign(window.V[k], f[k]);
        } else { window.V[k] = f[k]; }
      });
      if (extra) { try { new Function(extra)(); } catch (e) {} }
      try { window.runDiagnosticEngine(); } catch (e) { return { error: String(e) }; }
      try { window.renderAdvisory(); } catch (e) { return { renderError: String(e) }; }

      /* What level does the KNOWLEDGE BASE say this rule is? Read it rather
         than assume it, so the harness cannot disagree with the rules file. */
      const rule = (window.RED_FLAG_RULES || []).filter(function (r) { return r.id === ruleId; })[0];
      const level = (rule && rule.level) || "urgent";
      const raised = (window.V.alerts || []).filter((a) => a && a.l === level);
      const el = document.getElementById("advEl") || document.body;
      const boxes = [...el.querySelectorAll(".alert-box." + level)];
      return {
        level: level,
        ruleFound: !!rule,
        engineUrgent: raised.length,
        engineText: raised.map((a) => a.m).join(" | "),
        painted: boxes.length,
        paintedText: boxes.map((b) => b.textContent).join(" | "),
        /* Is it actually visible, not merely present with display:none? */
        visible: boxes.filter((b) => {
          const cs = getComputedStyle(b);
          return cs.display !== "none" && cs.visibility !== "hidden" &&
                 parseFloat(cs.opacity || "1") > 0.05 && b.offsetHeight > 0;
        }).length
      };
    }, { f: fields, extra: extraSetup || null, ruleId: ruleId });
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("Every red flag must be painted, not merely computed");

  for (const [ruleId, fields] of SCENARIOS) {
    const r = await paint(fields, null, ruleId);
    if (r.error || r.renderError) {
      ok(ruleId + " — engine and panel run", false, r.error || r.renderError);
      continue;
    }
    const label = ruleId + " (" + r.level + ")";
    ok(label + " — the rule exists in knowledge/red-flags.js", r.ruleFound);
    ok(label + " — the engine raises an alert at the level the rule declares",
      r.engineUrgent > 0, JSON.stringify(r));
    ok(label + " — the alert is PAINTED into the advisory panel",
      r.painted > 0, "engine had " + r.engineUrgent + ", DOM had " + r.painted);
    ok(label + " — the painted alert is actually visible",
      r.visible > 0, "painted " + r.painted + ", visible " + r.visible);
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("Adverse conditions must not swallow the alert");

  const adverse = [
    ["the reasoning map is hidden", "window.FLOWMAP_VISIBLE = false;"],
    ["the knowledge base is empty", "if (window.KNOWLEDGE_ALL) window.KNOWLEDGE_ALL.length = 0; if (window.rebuildKbIndexes) window.rebuildKbIndexes();"],
    ["a store is corrupt", "localStorage.setItem('entopic_visits', '{not json'); try { loadVisits(); } catch (e) {}"],
    ["the differential is empty", "window.__forceEmpty = true;"],
    ["the record is full of garbage", "window.V.cc = String.fromCharCode(0) + '\\uFFFD'.repeat(500); window.V.hxM = { medications: 'x'.repeat(50000) };"]
  ];

  for (const [label, setup] of adverse) {
    /* RAPD is the cleanest single-finding urgent trigger. */
    const r = await paint({ pupil: { rapd: "od" } }, setup, "rapd");
    if (r.error || r.renderError) {
      ok("RAPD survives: " + label, false, r.error || r.renderError);
      continue;
    }
    ok("RAPD is still PAINTED when " + label,
      r.painted > 0 && r.visible > 0,
      "engine " + r.engineUrgent + ", painted " + r.painted + ", visible " + r.visible);
  }

  /* ═══════════════════════════════════════════════════════════ */
  group("The alert cannot be pushed out of sight");

  const ordering = await page.evaluate(() => {
    window.P = window.blankPatient("p1", "M1");
    window.V = window.blankVisit();
    window.V.pupil = { rapd: "od" };
    window.V.symptoms = ["redness", "dryness", "grittiness", "burning"];
    try { window.runDiagnosticEngine(); window.renderAdvisory(); } catch (e) { return { error: String(e) }; }
    const el = document.getElementById("advEl") || document.body;
    const urgent = el.querySelector(".alert-box.urgent");
    const firstDx = el.querySelector(".dx-n");
    if (!urgent) return { noUrgent: true };
    if (!firstDx) return { urgentTop: true };
    /* The urgent box must come BEFORE the differential in document order. */
    const pos = urgent.compareDocumentPosition(firstDx);
    return { urgentBeforeDx: !!(pos & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  ok("an urgent alert is rendered ABOVE the differential",
    ordering.urgentBeforeDx === true || ordering.urgentTop === true,
    JSON.stringify(ordering));

  /* ═══════════════════════════════════════════════════════════ */
  group("Contradicting evidence must not suppress it");

  const contradicted = await paint({
    pupil: { rapd: "od" },
    symptoms: ["redness", "dryness", "grittiness", "burning", "itching",
               "watering", "foreign_body_sensation", "photophobia"],
    temporal: { onset: "gradual", duration: "years", course: "stable" }
  }, null, "rapd");
  ok("RAPD is still painted when buried under contradicting evidence",
    contradicted.painted > 0 && contradicted.visible > 0,
    JSON.stringify(contradicted));

  await browser.close();
  console.log("\n" + "═".repeat(66));
  console.log("redflag-screen — held: " + held + "    BROKE: " + broke);
  console.log("═".repeat(66));
  if (errs.length) {
    console.log("page errors seen:");
    [...new Set(errs)].slice(0, 5).forEach((e) => console.log("  · " + e.slice(0, 130)));
  }
  process.exit(broke ? 1 : 0);
})();
