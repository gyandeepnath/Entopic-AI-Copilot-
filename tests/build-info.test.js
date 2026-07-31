/* ═══════════════════════════════════════════════════════════════ */
/* BUILD IDENTITY                                                   */
/*                                                                  */
/* Entopic ships as static files that a clinic loads and then runs   */
/* offline for days. There is no server to ask which version they    */
/* are on — the answer exists only on their device, and until        */
/* js/build-info.js it did not exist at all.                         */
/*                                                                  */
/* For a nationally deployed client-side app that is the first       */
/* question of every support call and every incident. These tests    */
/* keep the answer present, correct, and safe to read aloud.         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function load(extra) {
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp
  }, extra || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/build-info.js"), ctx, { filename: "build-info.js" });
  return ctx;
}
const SEMVER = /^\d+\.\d+\.\d+$/;

test("both versions are present and semver", () => {
  const ctx = load();
  assert.ok(SEMVER.test(ctx.APP_VERSION), "APP_VERSION must be semver, got " + ctx.APP_VERSION);
  assert.ok(SEMVER.test(ctx.KB_VERSION), "KB_VERSION must be semver, got " + ctx.KB_VERSION);
});

test("KB_VERSION is actually defined — it was referenced in two places and defined in none", () => {
  /* js/kb-signoffs.js stamps every clinical sign-off with the KB version it
     was made against. While KB_VERSION was undefined, every attestation
     recorded an empty string, so nobody could tell which knowledge base a
     clinician had actually reviewed. */
  const ctx = load();
  assert.strictEqual(typeof ctx.KB_VERSION, "string");
  assert.ok(ctx.KB_VERSION.length > 0);

  const signoffs = read("js/kb-signoffs.js");
  assert.ok(/KB_VERSION/.test(signoffs), "sign-offs stamp the KB version");
});

test("buildLabel is one line, safe to read aloud, and names the build", () => {
  const ctx = load();
  const label = ctx.buildLabel();
  assert.ok(label.indexOf("\n") === -1, "one line — it gets read down a phone");
  assert.ok(label.indexOf(ctx.APP_VERSION) >= 0 && label.indexOf(ctx.KB_VERSION) >= 0,
    "carries both versions");
  assert.ok(label.length < 120, "short enough to dictate");
});

test("build info carries no patient data and no device identifier", () => {
  /* It is copied to a clipboard and pasted into e-mails and tickets. */
  const ctx = load({
    navigator: { userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140" },
    KNOWLEDGE_ALL: [{ name: "Dry Eye Disease" }, { name: "Retinal Detachment" }]
  });
  const info = ctx.buildInfo();
  const asText = JSON.stringify(info);

  const forbidden = ["patient", "mrn", "first_name", "dob", "device_id", "session"];
  for (const f of forbidden) {
    assert.ok(asText.toLowerCase().indexOf(f) === -1,
      "build info must not contain '" + f + "' — it is pasted into support tickets");
  }
  assert.strictEqual(info.kb_conditions, 2, "but it does report how much KB loaded");
  assert.ok(info.ua.length > 0, "and the browser, which drives half the failure reports");
});

test("an unreleased working tree says so", () => {
  /* A clinic reporting "dev" is running something that never went through the
     release process — which is itself the answer to the support call. */
  const ctx = load();
  const info = ctx.buildInfo();
  assert.strictEqual(info.released, ctx.BUILD_COMMIT !== "dev");
  assert.ok(ctx.buildLabel().indexOf(ctx.BUILD_COMMIT) >= 0, "the commit is in the label");
});

test("the user agent is bounded, so a hostile UA cannot flood a ticket", () => {
  const ctx = load({ navigator: { userAgent: "x".repeat(5000) } });
  assert.ok(ctx.buildInfo().ua.length <= 160);
});

test("build info works before the knowledge base has loaded", () => {
  /* Its whole purpose is to be answerable when things are broken. */
  const ctx = load();                       /* no KNOWLEDGE_ALL, no navigator */
  const info = ctx.buildInfo();
  assert.strictEqual(info.kb_conditions, 0);
  assert.strictEqual(info.offline_capable, false,
    "and it reports honestly that the offline engine is NOT ready");
  assert.strictEqual(info.ua, "");
});

test("the build is loaded by the app and shown to the administrator", () => {
  const html = read("index.html");
  assert.ok(/<script src="js\/build-info\.js">/.test(html), "index.html loads it");

  /* dom-escape.js must stay the first script; build-info goes straight after. */
  const order = [...html.matchAll(/<script src="js\/([^"]+)"/g)].map((m) => m[1]);
  assert.strictEqual(order[0], "dom-escape.js", "the canonical escaper stays first");
  assert.strictEqual(order[1], "build-info.js", "build identity is next, so everything after can name the build");

  const panel = read("js/ui-deployment.js");
  assert.ok(/buildLabel\(\)/.test(panel), "the deployment panel shows the build");
  assert.ok(/deployCopyBuild/.test(panel), "with a one-click copy for support");
});
