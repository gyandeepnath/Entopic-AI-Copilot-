/* ═══════════════════════════════════════════════════════════════ */
/* CLOUD PHI — encryption + consent gate + conflict-safe merge       */
/*                                                                  */
/* These guard the fixes for DD findings C-1, C-2, H-2 and H-6:      */
/*   • patient data is encrypted before it can leave the device, and */
/*     a wrong key cannot read it back;                              */
/*   • no record syncs unless consent AND a key are present;         */
/*   • the merge never silently overwrites a locally-edited record,  */
/*     compares timestamps numerically, and honours tombstones.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

function makeContext(extra) {
  const store = {};
  const ctx = {
    crypto: webcrypto,
    TextEncoder, TextDecoder,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (b) => Buffer.from(b, "base64").toString("binary"),
    Promise, JSON, Math, Date, Uint8Array, Error, isNaN, parseInt, String, Object, Array,
    setTimeout: () => 0, clearTimeout: () => {}, clearInterval: () => {}, setInterval: () => 0,
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    logAudit: () => {}
  };
  Object.assign(ctx, extra || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  return ctx;
}

function load(ctx, file) {
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), ctx, { filename: file });
}

const run = (ctx, expr) => vm.runInContext(expr, ctx);


/* ── Encryption round-trip (C-1) ─────────────────────────────────── */

test("a patient blob encrypts to ciphertext and decrypts back with the right key", async () => {
  const ctx = makeContext();
  load(ctx, "js/cloud-crypto.js");
  await run(ctx, 'phiSetPassphrase("clinic-secret-123", "clinicA")');
  const patient = { id: "p1", first_name: "Meera", last_name: "Rao", mrn: "EP-999", dob: "1990-01-01" };
  ctx.__p = patient;
  const env = await run(ctx, "phiEncrypt(__p)");
  assert.ok(env.__phi && env.iv && env.ct, "produced an envelope");
  const serialized = JSON.stringify(env);
  assert.ok(!/Meera|Rao|EP-999|1990-01-01/.test(serialized), "no PII survives in the ciphertext envelope");
  ctx.__env = env;
  const back = await run(ctx, "phiDecrypt(__env)");
  assert.deepStrictEqual(back, patient, "decrypts back to the original");
});

test("a wrong passphrase cannot decrypt another clinic's ciphertext", async () => {
  const a = makeContext(); load(a, "js/cloud-crypto.js");
  await run(a, 'phiSetPassphrase("right-passphrase", "clinicA")');
  a.__p = { mrn: "SECRET" };
  const env = await run(a, "phiEncrypt(__p)");

  const b = makeContext(); load(b, "js/cloud-crypto.js");
  await run(b, 'phiSetPassphrase("wrong-passphrase", "clinicA")');
  b.__env = env;
  await assert.rejects(run(b, "phiDecrypt(__env)"), "wrong key must fail, not silently return garbage");
});

test("the same passphrase on a peer device (same clinic) decrypts — no key exchange", async () => {
  const a = makeContext(); load(a, "js/cloud-crypto.js");
  await run(a, 'phiSetPassphrase("shared-clinic-pass", "clinicX")');
  a.__p = { mrn: "M1", first_name: "Asha" };
  const env = await run(a, "phiEncrypt(__p)");

  const b = makeContext(); load(b, "js/cloud-crypto.js");
  await run(b, 'phiSetPassphrase("shared-clinic-pass", "clinicX")');
  b.__env = env;
  const back = await run(b, "phiDecrypt(__env)");
  assert.strictEqual(back.mrn, "M1");
});

test("a passphrase under 8 chars is refused", async () => {
  const ctx = makeContext(); load(ctx, "js/cloud-crypto.js");
  await assert.rejects(run(ctx, 'phiSetPassphrase("short", "c")'));
});


/* ── Consent gate (C-2) ──────────────────────────────────────────── */

test("phiArmed is false without consent, false with consent but no key, true with both", async () => {
  const ctx = makeContext(); load(ctx, "js/cloud-crypto.js");
  assert.strictEqual(run(ctx, "phiArmed()"), false, "nothing set");
  run(ctx, "phiSetConsent(true)");
  assert.strictEqual(run(ctx, "phiArmed()"), false, "consent but no key");
  await run(ctx, 'phiSetPassphrase("clinic-secret-123", "clinicA")');
  assert.strictEqual(run(ctx, "phiArmed()"), true, "consent + key");
  run(ctx, "phiSetConsent(false)");
  assert.strictEqual(run(ctx, "phiArmed()"), false, "consent revoked");
});


/* ── Conflict-safe merge (H-2, H-6) ──────────────────────────────── */

function mergeContext(localPatients) {
  let saved = localPatients.slice();
  const ctx = makeContext({
    loadPatients: () => saved.map((x) => Object.assign({}, x)),
    savePatients: (arr) => { saved = arr; },
    loadVisits: () => [], saveVisits: () => {},
    CV: null, WebSocket: undefined, fetch: undefined,
    document: { getElementById: () => null },
    renderHome: () => {}
  });
  load(ctx, "js/cloud-crypto.js");
  load(ctx, "js/cloud-sync.js");
  load(ctx, "js/cloud-replication.js");
  ctx.__saved = () => saved;
  return ctx;
}

test("a brand-new remote record is added", () => {
  const ctx = mergeContext([]);
  ctx.__rows = [{ id: "p1", data: { id: "p1", first_name: "New" }, updated_at: "2026-07-26T10:00:00.000Z" }];
  const changed = run(ctx, 'cloudMergeRows("patients", __rows)');
  assert.strictEqual(changed, 1);
  assert.strictEqual(ctx.__saved().length, 1);
});

test("a remote record newer than a CLEAN local one overwrites it", () => {
  const ctx = mergeContext([{ id: "p1", first_name: "Old", updated: "2026-07-26T09:00:00.000Z", _cloud_updated: "2026-07-26T09:00:00.000Z" }]);
  ctx.__rows = [{ id: "p1", data: { id: "p1", first_name: "Newer" }, updated_at: "2026-07-26T11:00:00.000Z" }];
  const changed = run(ctx, 'cloudMergeRows("patients", __rows)');
  assert.strictEqual(changed, 1);
  assert.strictEqual(ctx.__saved()[0].first_name, "Newer");
});

test("a remote record NEVER overwrites a locally-edited (unpushed) record — it becomes a conflict", () => {
  /* local edited at 10:30, last synced at 09:00 → unpushed local edits exist */
  const ctx = mergeContext([{ id: "p1", first_name: "LocalEdit", updated: "2026-07-26T10:30:00.000Z", _cloud_updated: "2026-07-26T09:00:00.000Z" }]);
  ctx.__rows = [{ id: "p1", data: { id: "p1", first_name: "RemoteEdit" }, updated_at: "2026-07-26T11:00:00.000Z" }];
  const changed = run(ctx, 'cloudMergeRows("patients", __rows)');
  assert.strictEqual(changed, 0, "no silent overwrite");
  assert.strictEqual(ctx.__saved()[0].first_name, "LocalEdit", "the clinician's edit is preserved");
  assert.strictEqual(JSON.stringify(run(ctx, "cloudConflicts()")), JSON.stringify(["patients:p1"]), "the conflict is surfaced, not swallowed");
});

test("timestamps are compared numerically, not lexicographically (millis vs no-millis)", () => {
  /* '...11:00:00Z' (no millis) must count as newer than '...09:00:00.000Z' */
  const ctx = mergeContext([{ id: "p1", first_name: "Old", updated: "2026-07-26T09:00:00.000Z", _cloud_updated: "2026-07-26T09:00:00.000Z" }]);
  ctx.__rows = [{ id: "p1", data: { id: "p1", first_name: "Newer" }, updated_at: "2026-07-26T11:00:00Z" }];
  const changed = run(ctx, 'cloudMergeRows("patients", __rows)');
  assert.strictEqual(changed, 1);
  assert.strictEqual(ctx.__saved()[0].first_name, "Newer");
});

test("a tombstone deletes a clean local record but spares a locally-edited one", () => {
  const ctx = mergeContext([
    { id: "clean", updated: "2026-07-26T09:00:00.000Z", _cloud_updated: "2026-07-26T09:00:00.000Z" },
    { id: "dirty", updated: "2026-07-26T10:30:00.000Z", _cloud_updated: "2026-07-26T09:00:00.000Z" }
  ]);
  ctx.__rows = [
    { id: "clean", data: { id: "clean", deleted: true }, updated_at: "2026-07-26T11:00:00.000Z", deleted: true },
    { id: "dirty", data: { id: "dirty", deleted: true }, updated_at: "2026-07-26T11:00:00.000Z", deleted: true }
  ];
  run(ctx, 'cloudMergeRows("patients", __rows)');
  const ids = ctx.__saved().map((x) => x.id);
  assert.ok(!ids.includes("clean"), "clean record honoured the remote delete");
  assert.ok(ids.includes("dirty"), "locally-edited record was spared and flagged");
  assert.strictEqual(JSON.stringify(run(ctx, "cloudConflicts()")), JSON.stringify(["patients:dirty"]));
});

test("undecryptable rows (data=null) are skipped, never stored as ciphertext", () => {
  const ctx = mergeContext([]);
  ctx.__rows = [{ id: "p1", data: null, updated_at: "2026-07-26T10:00:00.000Z" }];
  const changed = run(ctx, 'cloudMergeRows("patients", __rows)');
  assert.strictEqual(changed, 0);
  assert.strictEqual(ctx.__saved().length, 0);
});
