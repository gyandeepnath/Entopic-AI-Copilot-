/* ═══════════════════════════════════════════════════════════════ */
/* PROTOTYPE POLLUTION — THE WHOLE CLASS, NOT A SPOT CHECK          */
/*                                                                  */
/* Promoted from tools/stress/pollution.js.                          */
/*                                                                  */
/* WHY THIS WAS MISSED FOR SO LONG. The stress sandbox injected the  */
/* HOST realm's Object into the vm context. An object literal built  */
/* INSIDE the sandbox inherits the SANDBOX realm's Object.prototype, */
/* so polluting the injected host prototype left `{}` untouched and  */
/* every pollution attack in the repo passed without reaching the    */
/* code under test. Measured:                                        */
/*                                                                  */
/*     injected host Object : ({}).PWN === 1  ->  false   (vacuous)  */
/*     native realm         : ({}).PWN === 1  ->  true    (real)     */
/*                                                                  */
/* Fixing the sandbox exposed four real defects in one pass: a       */
/* student could be granted the competency sign-off capability, any  */
/* signed-in account could be made an administrator, a tier-gated    */
/* capability could be unlocked, and a healthy store could be        */
/* declared corrupt (which blocks every save in the clinic).         */
/*                                                                  */
/* The vulnerable pattern is always the same: read a map, then ask   */
/* `map[key]` about a key that is normally ABSENT. Test 1 is the     */
/* control — if it fails, nothing else here means anything.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* NOTE: this deliberately does NOT pass Object/JSON/Array in. A vm context has
   its own standard built-ins; injecting the host's is what made the original
   attacks vacuous. */
function sandbox(files, extra) {
  const store = {};
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    module: { exports: {} },
    setTimeout: (fn) => { try { fn(); } catch (e) {} return 0; },
    clearTimeout: () => {},
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i] ?? null
    },
    logAudit: () => {}
  }, extra || {});
  vm.createContext(ctx);
  for (const f of files) vm.runInContext(read(f), ctx, { filename: f });
  ctx.run = (e) => vm.runInContext(e, ctx);
  return ctx;
}

/* Pollute inside the sandbox, probe, always clean up. */
function withPollution(ctx, keys, probe) {
  ctx.__keys = keys;
  ctx.run(`__keys.forEach(function (k) { Object.prototype[k] = true; });`);
  try { return probe(); }
  finally { ctx.run(`__keys.forEach(function (k) { delete Object.prototype[k]; });`); }
}


test("CONTROL: pollution is actually visible in this sandbox", () => {
  /* If this fails, every other test in this file passes for free. */
  const c = sandbox([]);
  const seenLiteral = withPollution(c, ["__probe"], () =>
    c.run(`(function () { var o = {}; return o.__probe === true; })()`));
  const seenParsed = withPollution(c, ["__probe"], () =>
    c.run(`JSON.parse("{}").__probe === true`));
  assert.strictEqual(seenLiteral, true,
    "object literals do not inherit the polluted prototype — these tests prove nothing");
  assert.strictEqual(seenParsed, true, "parsed objects do not inherit it either");
});

test("a polluted prototype cannot grant a role capability", () => {
  const c = sandbox(["js/roles.js"]);
  c.run(`CU = { username: "stu", role: "student" }; setActiveRole("student");`);
  assert.strictEqual(c.run(`can("supervise")`), false, "sanity: a student cannot supervise");

  const got = withPollution(c, ["supervise", "kb_authoring", "casebook_publish", "coding"], () => ({
    supervise: c.run(`can("supervise")`),
    authoring: c.run(`can("kb_authoring")`),
    publish: c.run(`can("casebook_publish")`)
  }));
  assert.strictEqual(got.supervise, false,
    "pollution gave a student the competency sign-off capability");
  assert.strictEqual(got.authoring, false, "pollution gave a student KB authoring");
  assert.strictEqual(got.publish, false, "pollution gave a student casebook publishing");
});

test("a polluted prototype cannot make an account an administrator", () => {
  const c = sandbox(["js/roles.js"]);
  c.run(`CU = { username: "u", role: "student" };`);
  assert.strictEqual(c.run("isAdmin()"), false, "sanity");
  assert.strictEqual(withPollution(c, ["admin"], () => c.run("isAdmin()")), false,
    "`CU.admin === true` was satisfied by an INHERITED property");
});

test("a polluted ALWAYS_ON key cannot short-circuit the tier lock", () => {
  const c = sandbox(["js/roles.js"]);
  c.run(`CU = { username: "u", role: "clinician" }; setActiveRole("clinician");`);
  const before = c.run(`can("cloud_sync")`);
  const after = withPollution(c, ["cloud_sync"], () => c.run(`can("cloud_sync")`));
  if (before === false) {
    assert.strictEqual(after, false, "pollution unlocked a tier-gated capability");
  }
});

test("capabilities a role really has still work (positive control)", () => {
  /* The fix must not be "deny everything". */
  const c = sandbox(["js/roles.js"]);
  c.run(`CU = { username: "f", role: "faculty" }; setActiveRole("faculty");`);
  assert.strictEqual(c.run(`can("supervise")`), true, "faculty must still supervise");
  assert.strictEqual(c.run(`can("kb_authoring")`), true, "faculty must still author the KB");
  c.run(`CU = { username: "s", role: "student" }; setActiveRole("student");`);
  assert.strictEqual(c.run(`can("patients")`), true, "a student must still see patients");
});

test("a polluted prototype cannot fabricate an answer in a clinical scale", () => {
  /* THE WORST OF THE FOUR. Every required input read back as `true`, the
     incomplete guard was skipped, and the evaluator produced a published risk
     figure for a patient whose scale had never been filled in. */
  const c = sandbox(["knowledge/clinical-scales.js", "js/clinical-scales.js"]);
  const id = c.run("CLINICAL_SCALES[0].id");
  const ids = JSON.parse(c.run(`
    JSON.stringify((scaleById(${JSON.stringify(id)}).inputs || [])
      .filter(function (i) { return i.required; }).map(function (i) { return i.id; }))
  `));
  assert.ok(ids.length > 0, "sanity: the scale has required inputs");

  /* EVERY required id, not one: polluting a single id leaves the others
     legitimately missing, so the guard fires for the right reason and the test
     proves nothing. */
  const status = withPollution(c, ids, () =>
    c.run(`scaleEvaluate(${JSON.stringify(id)}, { id: "v1" }).status`));
  assert.strictEqual(status, "incomplete",
    "a risk figure was produced from answers nobody gave");
});

test("a fully answered scale still scores (positive control)", () => {
  const c = sandbox(["knowledge/clinical-scales.js", "js/clinical-scales.js"]);
  const id = c.run("CLINICAL_SCALES[0].id");
  c.__v = { id: "v1" };
  c.run(`
    var sc = scaleById(${JSON.stringify(id)});
    ["od","os"].forEach(function (eye) {
      (sc.inputs || []).forEach(function (inp) {
        if (inp.required) scaleSetAnswer(__v, sc.id, eye, inp.id, false);
      });
    });
  `);
  assert.strictEqual(c.run(`scaleEvaluate(${JSON.stringify(id)}, __v).status`), "scored",
    "the pollution fix turned the evaluator into one that refuses everything");
});

test("pollution cannot declare a healthy store corrupt", () => {
  /* An availability failure rather than a safety one: STORE_CORRUPT is
     consulted before every write, so a fabricated flag stops a healthy clinic
     saving records and looks exactly like data loss. */
  const c = sandbox(["js/data-classification.js", "js/storage.js"]);
  c.run(`saveVisits([{ id: "v1", patient_id: "p1", date: "2026-01-01", status: "completed", data: {} }]);
         loadVisits();`);
  assert.strictEqual(c.run(`storageIsCorrupt("visits")`), false, "sanity: healthy");
  assert.strictEqual(
    withPollution(c, ["visits", "patients", "audit"], () => c.run(`storageIsCorrupt("visits")`)),
    false, "pollution declared a healthy store corrupt");
});

test("pollution cannot hide a store that really IS corrupt", () => {
  const c = sandbox(["js/data-classification.js", "js/storage.js"]);
  c.run(`localStorage.setItem("entopic_visits", "{not json"); loadVisits();`);
  assert.strictEqual(c.run(`storageIsCorrupt("visits")`), true, "sanity: corruption detected");
  assert.strictEqual(
    withPollution(c, ["visits", "corrupt", "ok"], () => c.run(`storageIsCorrupt("visits")`)),
    true, "pollution hid a corrupt store from the clinician");
});

test("pollution cannot grant research consent", () => {
  const c = sandbox(["js/data-classification.js", "js/storage.js", "js/consent.js"]);
  assert.strictEqual(c.run(`consentAllows("p-never", "research_secondary")`), false, "sanity");
  assert.strictEqual(
    withPollution(c, ["research_secondary", "granted", "state"],
      () => c.run(`consentAllows("p-never", "research_secondary")`)),
    false, "pollution granted consent to share a patient's data");
});

test("pollution cannot fabricate a signed-off competency", () => {
  const c = sandbox(["js/data-classification.js", "js/storage.js", "js/competency.js"]);
  c.run(`competencyFrameworkSet({ name: "F", items: [
    { id: "C1", label: "Do the thing", level: "shows_how" } ] });`);
  assert.strictEqual(c.run(`competencySummary("stu").met`), 0, "sanity");
  assert.strictEqual(
    withPollution(c, ["C1", "accepted", "status", "met", "level_agreed"],
      () => c.run(`competencySummary("stu").met`)),
    0, "pollution marked a competency as achieved");
});

test("the stress sandbox does not inject host realm built-ins", () => {
  /* The root cause, pinned. Re-injecting Object/JSON/Array into
     tools/stress/lib.js would silently disarm every pollution attack in the
     repo again, and nothing else would fail to say so. */
  const lib = read("tools/stress/lib.js");
  const ctxBlock = lib.slice(lib.indexOf("const ctx = Object.assign("),
                             lib.indexOf("ctx.window = ctx;"));
  for (const g of ["Object", "JSON", "Array", "Function"]) {
    assert.ok(!new RegExp("(^|[\\s,{])" + g + "\\s*,").test(ctxBlock),
      "tools/stress/lib.js injects the host realm's " + g +
      ", which makes every prototype-pollution attack vacuous");
  }
});
