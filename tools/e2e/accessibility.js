/* ═══════════════════════════════════════════════════════════════ */
/* E2E — ACCESSIBILITY, ACROSS EVERY SCREEN                         */
/*                                                                  */
/*   node tools/e2e/accessibility.js                                */
/*                                                                  */
/* Phase 9 reported unlabelled controls 9 -> 0 and keyboard-         */
/* inaccessible elements 31 -> 0. That was true of the app AS IT WAS */
/* THEN. Everything added since — the competency cards, the          */
/* regrouped Study tab, the referral selects rebuilt from data —     */
/* was outside that measurement, and js/ui-a11y.js fixes things at   */
/* RUNTIME, so a new surface is only covered if the bridge reaches   */
/* it.                                                              */
/*                                                                  */
/* This walks the real signed-in app across every screen and counts  */
/* two things: controls with no accessible name of any kind, and     */
/* elements that respond to a click but cannot be reached by         */
/* keyboard. Both must be zero.                                      */
/*                                                                  */
/* WHAT THIS IS NOT. It is a structural check, not a usability one.  */
/* No assistive technology has been used against Entopic, and that   */
/* remains the largest unverified accessibility claim in the repo.   */
/* A label that exists is not the same as a label that makes sense   */
/* when read aloud.                                                  */
/* ═══════════════════════════════════════════════════════════════ */
/* Re-run the Phase 9 accessibility checks over the whole app INCLUDING the
   surfaces added since (the competency cards, the regrouped Study tab, the
   changed referral selects). Phase 9 reported unlabelled 9 -> 0 and
   keyboard-inaccessible 31 -> 0; those numbers are only true of the app as it
   was then. */
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const URL = "file:///home/user/Entopic-AI-Copilot-/index.html";

(async () => {
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const p = await b.newPage({ viewport: { width: 1400, height: 950 } });
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto(URL);
  await p.waitForFunction(() => typeof window.renderHome === "function");
  await p.evaluate(() => { window.alert = () => {}; window.confirm = () => true; });

  /* Sign in for real so the app paints its actual screens. */
  await p.evaluate(() => window.showSignup && window.showSignup());
  await p.waitForTimeout(200);
  await p.evaluate(() => {
    const set = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
    set("inp_sn", "Dr Test"); set("inp_scl", "Clinic");
    set("inp_su", "a11y_user"); set("inp_sp", "password123");
    [...document.querySelectorAll("button")].find((x) => /Create Account/i.test(x.textContent)).click();
  });
  await p.waitForTimeout(1300);

  /* Load a competency framework so those cards render with real controls. */
  await p.evaluate(() => {
    window.setActiveRole("faculty");
    window.competencyFrameworkSet({
      name: "F", version: "1",
      items: [{ id: "C1", label: "Do the thing", domain: "Examination", level: "shows_how" }]
    });
  });

  const SCREENS = [
    ["patients", () => { window.setActiveRole("clinician"); window.HOME_TAB = "patients"; window.renderHome(); }],
    ["study", () => { window.setActiveRole("student"); window.HOME_TAB = "study"; window.renderHome(); }],
    ["teaching", () => { window.setActiveRole("faculty"); window.HOME_TAB = "teaching"; window.renderHome(); }],
    ["account", () => { window.setActiveRole("clinician"); window.HOME_TAB = "account"; window.renderHome(); }],
    ["exam", () => { window.newPatient(); if (window.openExam) window.openExam(); }]
  ];

  let totalUnlabelled = 0, totalUnreachable = 0;
  for (const [name, fn] of SCREENS) {
    await p.evaluate(fn);
    await p.waitForTimeout(300);
    const r = await p.evaluate(() => {
      const visible = (el) => {
        const cs = getComputedStyle(el);
        return cs.display !== "none" && cs.visibility !== "hidden" && el.offsetHeight > 0;
      };
      /* Controls with no accessible name at all. */
      const controls = [...document.querySelectorAll("input,select,textarea")].filter(visible);
      const unlabelled = controls.filter((c) => {
        if (c.labels && c.labels.length) return false;
        if (c.getAttribute("aria-label") || c.getAttribute("aria-labelledby")) return false;
        if (c.getAttribute("title") || c.getAttribute("placeholder")) return false;
        if (c.type === "hidden") return false;
        return true;
      });
      /* Things that respond to a click but cannot be reached by keyboard. */
      const clickables = [...document.querySelectorAll("[onclick]")].filter(visible);
      const unreachable = clickables.filter((el) => {
        const tag = el.tagName.toLowerCase();
        if (tag === "button" || tag === "a" || tag === "input" ||
            tag === "select" || tag === "textarea") return false;
        const ti = el.getAttribute("tabindex");
        return ti === null;
      });
      return {
        controls: controls.length,
        unlabelled: unlabelled.map((c) => c.id || c.name || c.tagName + "." + (c.className || "")),
        clickables: clickables.length,
        unreachable: unreachable.map((e) => (e.tagName + "." + String(e.className || "").split(" ")[0]).slice(0, 40))
      };
    });
    totalUnlabelled += r.unlabelled.length;
    totalUnreachable += r.unreachable.length;
    console.log(
      name.padEnd(9) + " controls " + String(r.controls).padStart(3) +
      "  unlabelled " + String(r.unlabelled.length).padStart(2) +
      "  |  clickable " + String(r.clickables).padStart(3) +
      "  keyboard-unreachable " + String(r.unreachable.length).padStart(2));
    if (r.unlabelled.length) console.log("            unlabelled: " + r.unlabelled.slice(0, 6).join(", "));
    if (r.unreachable.length) console.log("            unreachable: " + [...new Set(r.unreachable)].slice(0, 6).join(", "));
  }

  console.log("\n" + "=".repeat(66));
  console.log("TOTAL unlabelled: " + totalUnlabelled +
              "   keyboard-unreachable: " + totalUnreachable);
  console.log("=".repeat(66));
  console.log(errs.length ? "page errors: " + [...new Set(errs)].slice(0, 3).join(" | ") : "no page errors");
  await b.close();
  process.exit((totalUnlabelled + totalUnreachable + errs.length) ? 1 : 0);
})();
