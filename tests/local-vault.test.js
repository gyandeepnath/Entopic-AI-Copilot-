/* ═══════════════════════════════════════════════════════════════ */
/* LOCAL RECORD VAULT — encryption at rest                          */
/*                                                                  */
/* This is the module where a bug means a clinic loses its patient   */
/* records permanently, so these tests run REAL Web Crypto (Node's   */
/* webcrypto) against a real localStorage stand-in — no mocked       */
/* encryption, no faked round-trips.                                 */
/*                                                                  */
/* The properties that matter most, in order:                        */
/*   1. records survive the round trip byte-for-byte                 */
/*   2. a forgotten passphrase is RECOVERABLE (recovery code)        */
/*   3. a failed migration leaves the records exactly as they were   */
/*   4. a locked vault can never overwrite real records with empties */
/*   5. what lands on disk is genuinely unreadable                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

/* A vault + storage pair sharing one localStorage, as in the browser. */
function makeEnv(seed) {
  const store = Object.create(null);
  if (seed) for (const k of Object.keys(seed)) store[k] = JSON.stringify(seed[k]);

  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i) => Object.keys(store)[i]
    },
    crypto: webcrypto, TextEncoder, TextDecoder, Buffer,
    JSON, Math, Date, String, Number, Array, Object, RegExp, Promise, Error,
    Uint8Array, parseInt, parseFloat, isNaN, setTimeout, clearTimeout,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
    module: { exports: {} }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  const read = (f) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
  /* storage.js first (defines STORE_PREFIX), then the vault, then re-export */
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  vm.runInContext(read("js/local-vault.js"), ctx, { filename: "local-vault.js" });
  ctx.__raw = store;
  return ctx;
}

const PATIENTS = [
  { id: "p1", first_name: "Meera", last_name: "Nair", dob: "1978-04-02", mrn: "MRN-4471" },
  { id: "p2", first_name: "Arun", last_name: "Das", dob: "1990-11-19", mrn: "MRN-9002" }
];
const VISITS = [{ id: "v1", patient_id: "p1", data: { iop: { od: "18", os: "17" } } }];

const PASS = "correct horse battery staple";


test("vault is off by default and records are readable as before", () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  assert.strictEqual(ctx.vaultState(), "off");
  assert.strictEqual(ctx.loadStore("patients", []).length, 2);
});

test("enabling encrypts records at rest, and they still read back correctly", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS, entopic_visits: VISITS });

  const res = await ctx.vaultEnable(PASS);
  assert.ok(res.recoveryCode, "a recovery code is issued");
  assert.strictEqual(ctx.vaultState(), "unlocked");

  /* the app's normal synchronous read path still works */
  const back = ctx.loadStore("patients", []);
  assert.strictEqual(JSON.stringify(back), JSON.stringify(PATIENTS), "records survive byte-for-byte");
  assert.strictEqual(ctx.loadStore("visits", []).length, 1);
});

test("what actually lands on disk is unreadable ciphertext", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();

  const onDisk = ctx.__raw["entopic_patients"];
  assert.ok(!/Meera/.test(onDisk), "no patient name on disk");
  assert.ok(!/MRN-4471/.test(onDisk), "no MRN on disk");
  assert.ok(!/1978-04-02/.test(onDisk), "no date of birth on disk");
  const env = JSON.parse(onDisk);
  assert.strictEqual(ctx.vaultIsEnvelope(env), true, "stored as an encryption envelope");
});

test("the raw data key is never written to disk", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();
  const everything = Object.keys(ctx.__raw).map((k) => ctx.__raw[k]).join("|");
  assert.ok(!/"dek"/.test(everything), "no unwrapped key material is persisted");
  const meta = JSON.parse(ctx.__raw["entopic_vault_meta"]);
  assert.ok(meta.wrapped.pass.ct && meta.wrapped.recovery.ct, "only WRAPPED copies of the key are stored");
});

test("locking then unlocking with the passphrase restores access", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();

  ctx.vaultLock();
  assert.strictEqual(ctx.vaultState(), "locked");

  await ctx.vaultUnlock(PASS);
  assert.strictEqual(JSON.stringify(ctx.loadStore("patients", [])), JSON.stringify(PATIENTS));
});

test("a wrong passphrase is refused cleanly", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  ctx.vaultLock();
  await assert.rejects(() => ctx.vaultUnlock("not the passphrase"), /did not open the vault/);
  assert.strictEqual(ctx.vaultState(), "locked", "a failed attempt leaves it locked, not half-open");
});

test("A FORGOTTEN PASSPHRASE IS RECOVERABLE — the recovery code opens the vault", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  const { recoveryCode } = await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();
  ctx.vaultLock();

  await ctx.vaultUnlockWithRecovery(recoveryCode);
  assert.strictEqual(JSON.stringify(ctx.loadStore("patients", [])), JSON.stringify(PATIENTS),
    "records come back in full — the clinic is never locked out of its own data");
});

test("the recovery code is accepted however a human retypes it", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  const { recoveryCode } = await ctx.vaultEnable(PASS);
  ctx.vaultLock();
  const messy = "  " + recoveryCode.toLowerCase().replace(/-/g, " ") + "  ";
  await ctx.vaultUnlockWithRecovery(messy);
  assert.strictEqual(ctx.vaultState(), "unlocked");
});

test("a wrong recovery code is refused", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  ctx.vaultLock();
  await assert.rejects(() => ctx.vaultUnlockWithRecovery("AAAAA-BBBBB-CCCCC-DDDDD-EEEEE"),
    /did not open the vault/);
});

test("recovery codes are unguessable and unique", () => {
  const ctx = makeEnv();
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(ctx.vaultGenerateRecoveryCode());
  assert.strictEqual(seen.size, 200, "no repeats");
  const one = ctx.vaultGenerateRecoveryCode();
  assert.strictEqual(ctx.vaultNormalizeRecoveryCode(one).length, 25, "25 symbols ≈ 125 bits");
  assert.ok(!/[01ILO]/.test(one), "ambiguous glyphs excluded — a human has to copy this by hand");
});

test("changing the passphrase keeps the data and invalidates the old one", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();

  await ctx.vaultChangePassphrase(PASS, "a different long passphrase");
  ctx.vaultLock();

  await assert.rejects(() => ctx.vaultUnlock(PASS), /did not open/, "the old passphrase stops working");
  await ctx.vaultUnlock("a different long passphrase");
  assert.strictEqual(JSON.stringify(ctx.loadStore("patients", [])), JSON.stringify(PATIENTS),
    "records are untouched by a passphrase change");
});

test("a wrong current passphrase cannot change the passphrase", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await assert.rejects(() => ctx.vaultChangePassphrase("wrong", "another long passphrase"),
    /not correct/);
  ctx.vaultLock();
  await ctx.vaultUnlock(PASS);   /* original still works */
});

test("re-issuing a recovery code invalidates the old one", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  const first = (await ctx.vaultEnable(PASS)).recoveryCode;
  const second = (await ctx.vaultRegenerateRecoveryCode(PASS)).recoveryCode;
  assert.notStrictEqual(first, second);
  ctx.vaultLock();
  await assert.rejects(() => ctx.vaultUnlockWithRecovery(first), /did not open/);
  await ctx.vaultUnlockWithRecovery(second);
});

test("disabling writes records back in the clear (nothing is a one-way door)", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();

  await ctx.vaultDisable(PASS);
  assert.strictEqual(ctx.vaultState(), "off");
  assert.strictEqual(JSON.stringify(JSON.parse(ctx.__raw["entopic_patients"])), JSON.stringify(PATIENTS));
  assert.strictEqual(ctx.loadStore("patients", []).length, 2, "the normal read path works again");
});

test("a wrong passphrase cannot disable encryption", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await assert.rejects(() => ctx.vaultDisable("wrong"), /not correct/);
  assert.strictEqual(ctx.vaultEnabled(), true, "still encrypted");
});


/* ── the destructive-failure cases ────────────────────────────────── */

test("A LOCKED VAULT CANNOT OVERWRITE REAL RECORDS WITH AN EMPTY LIST", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();
  const cipherBefore = ctx.__raw["entopic_patients"];

  ctx.vaultLock();

  /* This is the accident that would destroy a clinic: code reads (gets the
     empty fallback because the vault is locked), appends, and saves back. */
  const asRead = ctx.loadStore("patients", []);
  assert.strictEqual(asRead.length, 0, "a locked vault yields nothing, not partial data");
  ctx.saveStore("patients", asRead.concat([{ id: "p9", first_name: "New" }]));

  assert.strictEqual(ctx.__raw["entopic_patients"], cipherBefore,
    "the write was REFUSED — the real records are untouched");

  await ctx.vaultUnlock(PASS);
  assert.strictEqual(ctx.loadStore("patients", []).length, 2, "both original patients are still there");
});

test("a failed migration rolls back and leaves records exactly as they were", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS, entopic_visits: VISITS });
  const before = ctx.__raw["entopic_patients"];

  /* Force the verification step to fail midway. */
  const realSet = ctx.localStorage.setItem;
  let calls = 0;
  ctx.localStorage.setItem = function (k, v) {
    if (k === "entopic_visits" && calls++ === 0) throw new Error("disk full");
    return realSet.call(this, k, v);
  };

  await assert.rejects(() => ctx.vaultEnable(PASS), /NOT turned on/);
  ctx.localStorage.setItem = realSet;

  assert.strictEqual(ctx.__raw["entopic_patients"], before, "patients restored to plaintext");
  assert.strictEqual(ctx.vaultEnabled(), false, "the vault was not left half-configured");
  assert.strictEqual(ctx.loadStore("patients", []).length, 2, "records readable exactly as before");
});

test("ciphertext is never handed to the app as if it were records", () => {
  /* Vault meta wiped (e.g. a partial profile copy) but the ciphertext remains. */
  const ctx = makeEnv();
  ctx.localStorage.setItem("entopic_patients",
    JSON.stringify({ __vault: "entopic-vault-aesgcm256-v1", iv: "00", ct: "AA" }));
  assert.strictEqual(ctx.vaultEnabled(), false);
  const out = ctx.loadStore("patients", []);
  assert.strictEqual(JSON.stringify(out), "[]", "an envelope must never be mistaken for a patient list");
});

test("writes made while unlocked survive a lock/unlock cycle", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);

  const updated = PATIENTS.concat([{ id: "p3", first_name: "Sunil", last_name: "Rao" }]);
  ctx.saveStore("patients", updated);
  await ctx.vaultFlush();

  ctx.vaultLock();
  await ctx.vaultUnlock(PASS);
  assert.strictEqual(ctx.loadStore("patients", []).length, 3, "the new patient persisted, encrypted");
});

test("the audit trail and accounts are protected too", async () => {
  const ctx = makeEnv({
    entopic_audit: [{ ts: "2026-07-30", user: "drsmith", action: "patient_opened", details: "Meera Nair" }],
    entopic_users: [{ id: "u1", username: "drsmith", pw_hash: "abc" }]
  });
  await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();
  assert.ok(!/Meera Nair/.test(ctx.__raw["entopic_audit"]), "audit details are encrypted");
  assert.ok(!/drsmith/.test(ctx.__raw["entopic_users"]), "account records are encrypted");
});

test("the knowledge base is deliberately NOT encrypted (no benefit, real cost)", () => {
  const ctx = makeEnv();
  assert.strictEqual(ctx.vaultIsProtected("patients"), true);
  assert.strictEqual(ctx.vaultIsProtected("visits"), true);
  assert.strictEqual(ctx.vaultIsProtected("kb_local_edits"), false);
  assert.strictEqual(ctx.vaultIsProtected("settings"), false);
});
