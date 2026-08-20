/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — PROTOTYPE POLLUTION, SWEPT                  */
/*                                                                  */
/*   node tools/stress/pollution.js                                 */
/*                                                                  */
/* WHY THIS FILE EXISTS AS ITS OWN SWEEP.                           */
/*                                                                  */
/* The stress sandbox used to inject the HOST realm's Object into    */
/* the vm context. An object literal built inside the sandbox        */
/* inherits the SANDBOX realm's Object.prototype, so polluting the   */
/* injected one left `{}` untouched and every pollution attack in    */
/* the repo passed without reaching the code. Fixing the sandbox     */
/* immediately exposed a real one: a polluted prototype answered     */
/* every question in a published risk scale and produced a risk      */
/* figure for a patient nobody had assessed.                         */
/*                                                                  */
/* So the whole class gets swept, not spot-checked. The pattern      */
/* that is vulnerable is always the same: read a map out of stored   */
/* data or a literal, then ask `map[key]` about a key that was       */
/* never set. Every such lookup is a place where an attacker who     */
/* can land one polluted key gets to answer a question on the        */
/* clinician's behalf.                                               */
/*                                                                  */
/* Group Z0 is the control: it proves pollution is actually visible  */
/* in this sandbox. If Z0 ever fails, every other result here is     */
/* meaningless.                                                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { makeHarness, must, mustEqual, browser } = require("./lib");
const H = makeHarness(process.argv);
const { G, attack, runAll } = H;

/* Pollute inside the sandbox, run the probe, always clean up. */
function polluted(c, keys, fn) {
  c.__keys = keys;
  c.run(`__keys.forEach(function (k) { Object.prototype[k] = true; });`);
  try { return fn(); }
  finally { c.run(`__keys.forEach(function (k) { delete Object.prototype[k]; });`); }
}


/* ═══════════════════════════════════════════════════════════════ */
G("Z0. the control — pollution must actually be visible here");

attack("Z0 a plain object literal in the sandbox inherits the polluted prototype", () => {
  const c = browser({ base: false });
  const seen = polluted(c, ["__sweep_probe"], () =>
    c.run(`(function () { var o = {}; return o.__sweep_probe === true; })()`));
  mustEqual(seen, true,
    "pollution is invisible in this sandbox — every attack in this file proves nothing");
});

attack("Z0b JSON.parse output also inherits it", () => {
  const c = browser({ base: false });
  const seen = polluted(c, ["__sweep_probe"], () =>
    c.run(`JSON.parse("{}").__sweep_probe === true`));
  mustEqual(seen, true, "parsed objects do not see pollution — restore paths are untested");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Z1. capabilities — pollution must not grant permission");

attack("Z1 a polluted prototype cannot grant a role capability", () => {
  /* roleShowsCap does `ROLE_CAPS[effectiveRole()] || {}` then `!!caps[cap]`.
     A polluted key would hand a student every capability the UI gates on —
     including `supervise`, which is the competency sign-off gate. */
  const c = browser({ base: false, also: ["js/roles.js"] });
  c.run(`CU = { username: "stu", role: "student" }; setActiveRole("student");`);
  mustEqual(c.run(`can("supervise")`), false, "sanity: a student cannot supervise");

  const got = polluted(c, ["supervise", "kb_authoring", "casebook_publish"], () => ({
    supervise: c.run(`can("supervise")`),
    authoring: c.run(`can("kb_authoring")`)
  }));
  mustEqual(got.supervise, false,
    "prototype pollution gave a student the competency sign-off capability");
  mustEqual(got.authoring, false,
    "prototype pollution gave a student knowledge-base authoring");
});

attack("Z1b a polluted prototype cannot unlock a paid tier capability", () => {
  const c = browser({ base: false, also: ["js/roles.js"] });
  c.run(`CU = { username: "u", role: "clinician" }; setActiveRole("clinician");`);
  const before = c.run(`can("cloud_sync")`);
  const after = polluted(c, ["cloud_sync", "pro", "institutional"], () => c.run(`can("cloud_sync")`));
  if (before === false) {
    mustEqual(after, false, "pollution unlocked a tier-gated capability");
  }
});

attack("Z1c a polluted prototype cannot make an account an admin", () => {
  const c = browser({ base: false, also: ["js/roles.js"] });
  c.run(`CU = { username: "u", role: "student" };`);
  mustEqual(c.run("isAdmin()"), false, "sanity");
  const after = polluted(c, ["admin"], () => c.run("isAdmin()"));
  mustEqual(after, false, "prototype pollution made an ordinary account an administrator");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Z2. data protection — pollution must not unprotect a store");

attack("Z2 a polluted prototype cannot make an unknown store look declared", () => {
  /* dataShapeOk / dataStoreClass do `DATA_STORES[key]`. If pollution makes an
     UNKNOWN key resolve to a spec, corrupt data could pass a shape check. */
  const c = browser({ base: false, also: ["js/data-classification.js"] });
  mustEqual(c.run(`dataStoreClass("no_such_store")`), null, "sanity");
  const after = polluted(c, ["no_such_store"], () => c.run(`dataStoreClass("no_such_store")`));
  must(after === null || after === undefined,
    "pollution made an undeclared store resolve to a classification: " + after);
});

attack("Z2b a polluted prototype cannot flip a store's encryption flag", () => {
  const c = browser({ base: false, also: ["js/data-classification.js"] });
  const before = c.run(`JSON.stringify(DATA_STORES.patients)`);
  const after = polluted(c, ["encrypt", "mirror", "backup"], () =>
    c.run(`JSON.stringify({ e: DATA_STORES.patients.encrypt, m: DATA_STORES.patients.mirror })`));
  const parsed = JSON.parse(after);
  mustEqual(parsed.e, true, "patients must stay encrypted");
  must(before.indexOf('"encrypt":true') >= 0, "sanity: patients is declared encrypted");
});

attack("Z2c pollution cannot add stores to the mirror or backup list", () => {
  const c = browser({ base: false, also: ["js/data-classification.js"] });
  const before = c.run("dataStoresWith('backup').length");
  const after = polluted(c, ["backup", "mirror", "phi"], () => c.run("dataStoresWith('backup').length"));
  mustEqual(after, before, "pollution changed which stores travel in a backup");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Z3. consent and competency — pollution must not fabricate a record");

attack("Z3 pollution cannot grant research consent", () => {
  const c = browser({ also: ["js/consent.js"] });
  mustEqual(c.run(`consentAllows("p-never", "research_secondary")`), false, "sanity");
  const after = polluted(c, ["research_secondary", "granted", "state"], () =>
    c.run(`consentAllows("p-never", "research_secondary")`));
  mustEqual(after, false, "prototype pollution granted consent to share a patient's data");
});

attack("Z3b pollution cannot fabricate a signed-off competency", () => {
  const c = browser({ also: ["js/competency.js"] });
  c.run(`competencyFrameworkSet({ name: "F", items: [
    { id: "C1", label: "Do the thing", level: "shows_how" } ] });`);
  mustEqual(c.run(`competencySummary("stu").met`), 0, "sanity: nothing met");
  const after = polluted(c, ["C1", "accepted", "status", "met", "level_agreed"], () =>
    c.run(`competencySummary("stu").met`));
  mustEqual(after, 0, "prototype pollution marked a competency as achieved");
});

attack("Z3c pollution cannot turn on the simulated-counts policy", () => {
  const c = browser({ also: ["js/competency.js"] });
  mustEqual(c.run("competencySimulationCounts()"), false, "sanity: off by default");
  const after = polluted(c, ["competency_sim_policy"], () => c.run("competencySimulationCounts()"));
  mustEqual(after, false, "pollution changed how a student's evidence is scored");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Z4. the engine and the knowledge base");

attack("Z4 pollution cannot invent a token on a record", () => {
  const c = browser({ base: false, also: [
    "knowledge/token-registry.js", "js/data-model.js"] });
  const after = polluted(c, ["rapd", "hypopyon", "flashes", "redness"], () =>
    c.run(`(function () {
      var v = blankVisit();
      return JSON.stringify({ sym: (v.symptoms || []).length,
                              slf: ((v.sl && v.sl.findings) || []).length });
    })()`));
  const p = JSON.parse(after);
  mustEqual(p.sym, 0, "pollution put symptoms on a blank visit");
  mustEqual(p.slf, 0, "pollution put slit-lamp findings on a blank visit");
});

attack("Z4b pollution cannot make a de-identified record carry a value", () => {
  const c = browser({ also: [
    "knowledge/token-registry.js", "js/data-model.js",
    "js/consent.js", "js/research-corpus.js"],
    extra: { APP_VERSION: "1", KB_VERSION: "1" } });
  c.run(`consentSet("p1", CORPUS_PURPOSE, "granted", "t")`);
  const after = polluted(c, ["redness", "Chalazion", "Retina specialist", "ref_to"], () => {
    c.run(`corpusCapture({ id: "v1", date: "2026-03-15T00:00:00.000Z",
                           dxList: [{ n: "Dry eye", prob: 0.4 }] },
                         { id: "p1", age: 40, sex: "F" },
                         { visitDate: "2026-03-15T00:00:00.000Z" })`);
    return c.run("JSON.stringify(corpusLoad().detail[0])");
  });
  const rec = JSON.parse(after);
  mustEqual((rec.symptoms || []).length, 0, "pollution added a symptom to a research record");
  mustEqual((rec.findings || []).length, 0, "pollution added a finding to a research record");
  mustEqual(rec.referral || "", "", "pollution added a referral to a research record");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Z5. storage — pollution must not resurrect or hide a record");

attack("Z5 pollution cannot make a missing store read as data", () => {
  const c = browser();
  const after = polluted(c, ["entopic_patients", "patients", "visits"], () =>
    c.run("JSON.stringify({ p: loadPatients().length, v: loadVisits().length })"));
  const p = JSON.parse(after);
  mustEqual(p.p, 0, "pollution produced patients on an empty device");
  mustEqual(p.v, 0, "pollution produced visits on an empty device");
});

attack("Z5b pollution cannot suppress a corruption flag", () => {
  const c = browser();
  c.run(`localStorage.setItem("entopic_visits", "{not json");`);
  /* The flag is raised BY a load attempt — it is not a property of the bytes
     sitting there. Reading first is what a clinician's session does anyway. */
  c.run("loadVisits();");
  mustEqual(c.run(`storageIsCorrupt("visits")`), true, "sanity: corruption detected");
  const after = polluted(c, ["visits", "corrupt", "ok"], () => c.run(`storageIsCorrupt("visits")`));
  mustEqual(after, true, "pollution hid a corrupt store from the clinician");
});

attack("Z5c pollution cannot raise a FALSE corruption alarm on a healthy store", () => {
  /* The other direction, and it is an availability problem rather than a
     safety one: STORE_CORRUPT is consulted before writes, so a fabricated flag
     would stop a healthy clinic saving records and look like data loss. */
  const c = browser();
  c.run(`saveVisits([{ id: "v1", patient_id: "p1", date: "2026-01-01", status: "completed", data: {} }]);`);
  c.run("loadVisits();");
  mustEqual(c.run(`storageIsCorrupt("visits")`), false, "sanity: the store is healthy");
  const after = polluted(c, ["visits", "patients", "audit"], () =>
    c.run(`storageIsCorrupt("visits")`));
  mustEqual(after, false,
    "pollution declared a healthy store corrupt, which blocks every save in the clinic");
});

runAll("pollution").then((n) => process.exit(n ? 1 : 0));
