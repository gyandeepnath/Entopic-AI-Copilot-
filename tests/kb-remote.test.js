/* ═══════════════════════════════════════════════════════════════ */
/* REMOTE KB UPDATES                                                */
/* The build owner publishes KB bundles to the cloud; installations   */
/* validate, cache, and apply them. These tests pin the pieces that   */
/* protect clinical integrity:                                        */
/*   - validation rejects malformed / gutted / urgent-dropping        */
/*     bundles (fail-closed)                                          */
/*   - version comparison and the apply/defer/skip decision           */
/*   - applying a bundle swaps the KB in place, rebuilds every        */
/*     index, and the REAL engine keeps working                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createEngine } = require("../tools/lib/load-engine");

const REPO = path.resolve(__dirname, "..");
const kbRemoteSrc = fs.readFileSync(path.join(REPO, "js", "kb-remote.js"), "utf8");

/* Engine sandbox + kb-remote loaded on top (no window → no timers/boot fetch). */
function makeCtx() {
  const eng = createEngine();
  vm.runInContext(kbRemoteSrc, eng.context, { filename: "kb-remote.js" });
  return eng;
}

/* Export the live KB as a publishable bundle (same shape the seed tool emits). */
function exportBundle(ctx) {
  const bundle = {};
  for (const c of ctx.KNOWLEDGE_ALL) {
    const domain = c._domain || "Other";
    if (!bundle[domain]) bundle[domain] = [];
    const { _domain, _index, ...rest } = c;
    bundle[domain].push(JSON.parse(JSON.stringify(rest)));
  }
  return bundle;
}

test("validator accepts the real KB exported as a bundle", () => {
  const eng = makeCtx();
  const v = eng.context.validateKbBundle(exportBundle(eng.context));
  assert.deepStrictEqual(Array.from(v.errors), [], "no errors expected");
  assert.strictEqual(v.ok, true);
  assert.ok(v.count >= 100);
});

test("validator fails closed on malformed bundles", () => {
  const { context: ctx } = makeCtx();
  assert.strictEqual(ctx.validateKbBundle(null).ok, false);
  assert.strictEqual(ctx.validateKbBundle([1, 2, 3]).ok, false);
  assert.strictEqual(ctx.validateKbBundle({ Surface: "nope" }).ok, false);
  /* a tiny bundle can't replace the whole KB */
  const tiny = { Surface: [{ name: "Only One", route: "surface", req: ["x"] }] };
  const v = ctx.validateKbBundle(tiny);
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some((e) => e.indexOf("minimum") >= 0), "minimum-size rail fires");
});

test("validator rejects a bundle that silently drops a shipped urgent condition", () => {
  const eng = makeCtx();
  const bundle = exportBundle(eng.context);
  /* remove one urgent condition from wherever it lives */
  let removed = null;
  for (const d in bundle) {
    const i = bundle[d].findIndex((c) => c.urgent);
    if (i >= 0) { removed = bundle[d][i].name; bundle[d].splice(i, 1); break; }
  }
  assert.ok(removed, "test setup: found an urgent condition to drop");
  const v = eng.context.validateKbBundle(bundle);
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some((e) => e.indexOf(removed) >= 0), "names the dropped urgent condition");
});

test("validator rejects duplicates and bad fields", () => {
  const eng = makeCtx();
  const bundle = exportBundle(eng.context);
  const first = Object.keys(bundle)[0];
  bundle[first].push(JSON.parse(JSON.stringify(bundle[first][0])));          /* duplicate */
  bundle[first].push({ name: "Bad Req", route: "surface", req: [42] });      /* non-string token */
  const v = eng.context.validateKbBundle(bundle);
  assert.strictEqual(v.ok, false);
  assert.ok(v.errors.some((e) => e.indexOf("duplicate") >= 0));
  assert.ok(v.errors.some((e) => e.indexOf("Bad Req") >= 0));
});

test("version compare: numeric, segment-wise", () => {
  const { context: ctx } = makeCtx();
  assert.strictEqual(ctx.kbVersionNewer("1.1.0", "1.0.0"), true);
  assert.strictEqual(ctx.kbVersionNewer("1.10.0", "1.9.9"), true);
  assert.strictEqual(ctx.kbVersionNewer("1.0.0", "1.0.0"), false);
  assert.strictEqual(ctx.kbVersionNewer("1.0.0", "1.0.1"), false);
  assert.strictEqual(ctx.kbVersionNewer("2.0", "1.9.9"), true);
  assert.strictEqual(ctx.kbVersionNewer("", "1.0.0"), false);
});

test("decision matrix: reject/skip/defer/apply", () => {
  const { context: ctx } = makeCtx();
  assert.strictEqual(ctx.kbRemoteDecision("2.0.0", "1.0.0", false, false), "reject", "invalid always rejects");
  assert.strictEqual(ctx.kbRemoteDecision("1.0.0", "1.0.0", false, true), "skip", "same version skips");
  assert.strictEqual(ctx.kbRemoteDecision("0.9.0", "1.0.0", false, true), "skip", "older skips");
  assert.strictEqual(ctx.kbRemoteDecision("2.0.0", "1.0.0", true, true), "defer", "open exam defers");
  assert.strictEqual(ctx.kbRemoteDecision("2.0.0", "1.0.0", false, true), "apply");
});

test("applying a bundle swaps the KB in place, rebuilds indexes, and the engine still runs", () => {
  const eng = makeCtx();
  const ctx = eng.context;
  const allRef = ctx.KNOWLEDGE_ALL;                 /* engine's captured reference */
  const bundle = exportBundle(ctx);

  /* owner edit 1: correct an existing condition (add a supportive token) */
  const mgd = bundle["Surface & Lids"].find((c) => c.name.indexOf("Evaporative") >= 0);
  mgd.sup.push("remote_added_token");
  /* owner edit 2: add a brand-new condition */
  bundle["Surface & Lids"].push({
    name: "Remote Test Condition", route: "surface",
    req: ["dryness"], sup: ["burning"], con: [], temporal: ["chronic"],
    tests: [], exclusions: [], urgent: false
  });

  const v = ctx.validateKbBundle(bundle);
  assert.strictEqual(v.ok, true, "edited bundle validates: " + v.errors);
  const n = ctx.kbApplyBundle(bundle, "9.9.9", "test");

  assert.strictEqual(ctx.KNOWLEDGE_ALL, allRef, "same array object (in-place swap)");
  assert.strictEqual(ctx.KNOWLEDGE_ALL.length, n);
  assert.ok(ctx.KB_NAME_INDEX["Remote Test Condition"], "name index rebuilt with new condition");
  assert.ok(ctx.KB_REQ_TOKEN_INDEX["dryness"].some((c) => c.name === "Remote Test Condition"),
    "req-token index includes the new condition");
  assert.strictEqual(ctx.KB_META.version, "9.9.9");
  assert.strictEqual(ctx.KB_META.source, "remote update");

  /* the REAL engine runs on the updated KB and finds the new condition */
  const out = eng.runCase({
    symptoms: ["dryness", "burning"],
    temporal: { course: "chronic" }
  });
  assert.ok(out.dxList.some((d) => d.n === "Remote Test Condition"),
    "engine scores the remotely-added condition");

  /* red flags still fire after a remote update (they live in code) */
  const urgent = eng.runCase({ symptoms: ["flashes", "floaters"] });
  assert.ok(urgent.alerts.some((a) => a.l === "urgent"), "red flags unaffected by KB updates");
});

test("PUBLISH/CONSUME CONTRACT: the seed tool's bundle passes the app's validator and applies", () => {
  /* The two halves of the remote-KB pipeline must agree: what
     tools/seed-cloud-kb.js writes to kb_versions.bundle is exactly what
     js/kb-remote.js downloads. If they ever drift, remote updates silently
     stop applying. This proves it offline (no network needed). */
  const { buildBundle } = require("../tools/seed-cloud-kb");
  const published = buildBundle();
  const eng = makeCtx();
  const v = eng.context.validateKbBundle(published);
  assert.deepStrictEqual(Array.from(v.errors), [], "seed bundle must validate cleanly");
  assert.strictEqual(v.ok, true);
  /* and it actually applies + the engine runs on it */
  const n = eng.context.kbApplyBundle(published, "1.1.0", "seed-contract");
  assert.ok(n >= 100);
  const out = eng.runCase({ symptoms: ["flashes", "floaters"] });
  assert.ok(out.alerts.some((a) => a.l === "urgent"), "engine + red flags work on the published bundle");
});

test("ICD backfill applies to bundle entries without codes", () => {
  const eng = makeCtx();
  const ctx = eng.context;
  const bundle = exportBundle(ctx);
  /* strip the code from one condition that the ICD map knows */
  const withIcd = ctx.KNOWLEDGE_ALL.find((c) => c.icd);
  for (const d in bundle) {
    for (const c of bundle[d]) if (c.name === withIcd.name) { delete c.icd; delete c.icd_label; }
  }
  ctx.kbApplyBundle(bundle, "9.9.10", "");
  const after = ctx.KB_NAME_INDEX[withIcd.name];
  assert.strictEqual(after.icd, withIcd.icd, "code restored from ICD_MAP");
});
