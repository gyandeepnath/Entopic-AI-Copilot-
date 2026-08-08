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
  /* Same order as index.html: browser-io (lsSet/lsRemove) first, then
     storage.js (defines STORE_PREFIX and the write-failure banner), then the
     vault. The real browser-io is loaded rather than stubbed so the tests
     exercise the actual write path. */
  vm.runInContext(read("js/browser-io.js"), ctx, { filename: "browser-io.js" });
  vm.runInContext(read("js/data-classification.js"), ctx, { filename: "data-classification.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  vm.runInContext(read("js/storage-backup.js"), ctx, { filename: "storage-backup.js" });
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

/* The genuine MIRROR_KEYS whitelist from js/storage-mirror.js, loaded rather
   than copied, so the survivability test below fails if the vault key wrapper
   is ever dropped from the mirror. */
function realMirrorKeys() {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Date, String, Array, Object,
    indexedDB: undefined, localStorage: undefined
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/storage-mirror.js"), "utf8"),
    ctx, { filename: "storage-mirror.js" });
  return ctx.MIRROR_KEYS || [];
}


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

/* ── survivability: the mirror must carry the key wrapper ────────────
   The IndexedDB mirror exists to survive localStorage being cleared. With
   the vault on it holds CIPHERTEXT, so if the key wrapper is not mirrored
   too, "recovery" restores unreadable rubbish and the records are gone for
   good — passphrase and recovery code both useless. This test replays that
   exact sequence. */
test("RECORDS SURVIVE localStorage BEING WIPED AND RESTORED FROM THE MIRROR", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS, entopic_visits: VISITS });
  const { recoveryCode } = await ctx.vaultEnable(PASS);
  await ctx.vaultFlush();

  /* What the IndexedDB mirror holds: read the REAL whitelist out of
     storage-mirror.js. Hard-coding it here would make this test pass even if
     `vault_meta` were dropped from the mirror — i.e. it would not catch the
     very bug it exists for. */
  const MIRRORED = realMirrorKeys();
  assert.ok(MIRRORED.length, "the mirror whitelist was located in the source");
  const mirror = {};
  for (const k of MIRRORED) {
    const v = ctx.__raw["entopic_" + k];
    if (v !== undefined) mirror["entopic_" + k] = v;
  }

  /* Disaster: the browser clears site storage. */
  for (const k of Object.keys(ctx.__raw)) delete ctx.__raw[k];
  ctx.vaultLock();
  assert.strictEqual(ctx.vaultEnabled(), false, "everything really is gone");

  /* Mirror recovery writes its copies back. */
  for (const k of Object.keys(mirror)) ctx.__raw[k] = mirror[k];

  assert.strictEqual(ctx.vaultEnabled(), true, "the key wrapper came back with the data");
  await ctx.vaultUnlock(PASS);
  assert.strictEqual(JSON.stringify(ctx.loadStore("patients", [])), JSON.stringify(PATIENTS),
    "records are readable again — the clinic is not wiped out");

  /* and the recovery code still works on the restored wrapper */
  ctx.vaultLock();
  await ctx.vaultUnlockWithRecovery(recoveryCode);
  assert.strictEqual(ctx.loadStore("patients", []).length, 2);
});

test("the mirrored key wrapper contains no usable key material", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  const meta = JSON.parse(ctx.__raw["entopic_vault_meta"]);
  const flat = JSON.stringify(meta);
  assert.ok(!/Meera/.test(flat), "no patient data in the wrapper");
  assert.ok(meta.wrapped.pass.ct && meta.wrapped.recovery.ct, "only wrapped copies");
  assert.ok(!meta.dek && !meta.key && !meta.raw, "no raw key field of any name");
  /* A stolen mirror is exactly as useless as stolen localStorage: without the
     passphrase or the recovery code the wrapper cannot be opened. */
  ctx.vaultLock();
  await assert.rejects(() => ctx.vaultUnlock("guess"), /did not open/);
});

/* ── encrypted backup files (audit H-4) ───────────────────────────── */

test("an encrypted backup round-trips and hides everything identifiable", async () => {
  const ctx = makeEnv();
  const payload = { version: "1.0.0", patients: PATIENTS, visits: VISITS, users: [], audit: [] };
  const env = await ctx.backupEncrypt(payload, "a strong backup passphrase");

  const asFile = JSON.stringify(env);
  assert.ok(!/Meera/.test(asFile), "no name in the file");
  assert.ok(!/MRN-4471/.test(asFile), "no MRN in the file");
  assert.ok(!/1978-04-02/.test(asFile), "no date of birth in the file");
  assert.strictEqual(ctx.backupIsEncrypted(env), true);

  const back = await ctx.backupDecrypt(env, "a strong backup passphrase");
  assert.strictEqual(JSON.stringify(back), JSON.stringify(payload), "restores byte-for-byte");
});

test("a backup file is self-contained — restorable on a machine with no vault", async () => {
  const source = makeEnv({ entopic_patients: PATIENTS });
  await source.vaultEnable(PASS);
  const env = await source.backupEncrypt(source.buildBackupPayload(), "a strong backup passphrase");

  /* A brand-new machine: no vault, no meta, nothing. This is the disaster case
     a backup exists for, so it must not depend on the old device's key. */
  const fresh = makeEnv();
  assert.strictEqual(fresh.vaultEnabled(), false, "the replacement machine has no vault");
  const back = await fresh.backupDecrypt(env, "a strong backup passphrase");
  assert.strictEqual(back.patients.length, 2, "records recovered onto a clean machine");
  assert.strictEqual(back.patients[0].first_name, "Meera");
});

test("a wrong backup passphrase is refused, and weak ones are rejected up front", async () => {
  const ctx = makeEnv();
  const env = await ctx.backupEncrypt({ patients: [], visits: [] }, "a strong backup passphrase");
  await assert.rejects(() => ctx.backupDecrypt(env, "wrong passphrase here"), /did not open this backup/);
  await assert.rejects(() => ctx.backupEncrypt({}, "short"), /at least 10 characters/);
});

test("plain backups are still recognised, so old files keep restoring", async () => {
  const ctx = makeEnv();
  const plain = { version: "1.0.0", patients: [{ id: "p1" }], visits: [] };
  assert.strictEqual(ctx.backupIsEncrypted(plain), false);
  const passthrough = await ctx.backupDecrypt(plain, "irrelevant");
  assert.strictEqual(JSON.stringify(passthrough), JSON.stringify(plain));
});

test("the knowledge base is deliberately NOT encrypted (no benefit, real cost)", () => {
  const ctx = makeEnv();
  assert.strictEqual(ctx.vaultIsProtected("patients"), true);
  assert.strictEqual(ctx.vaultIsProtected("visits"), true);
  assert.strictEqual(ctx.vaultIsProtected("kb_local_edits"), false);
  assert.strictEqual(ctx.vaultIsProtected("settings"), false);
});


/* ── the cached cloud key must not sit in the clear beside a vault ──
   Closes the residual gap noted in the readiness report: with records
   encrypted locally, a stolen device gives up nothing on disk — but a
   plaintext cloud key beside it would still let a thief decrypt the CLOUD
   copy. These load cloud-crypto.js on top of the vault, as the browser does. */
function makeCloudEnv(seed) {
  const ctx = makeEnv(seed);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/cloud-crypto.js"), "utf8"),
    ctx, { filename: "cloud-crypto.js" });
  return ctx;
}

test("with the vault open, the cached cloud key is stored wrapped, not in the clear", async () => {
  const ctx = makeCloudEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.phiSetPassphrase("a clinic phi passphrase", "clinic-123");

  const stored = ctx.__raw["entopic_cloud_phi_keyhex"];
  assert.ok(stored, "a key is cached");
  assert.ok(stored.charAt(0) === "{", "stored as an envelope, not raw hex");
  assert.ok(!/^[0-9a-f]{64}$/.test(stored), "no bare 32-byte key on disk");
  assert.strictEqual(ctx.vaultIsEnvelope(JSON.parse(stored)), true);
});

test("a locked device reports the cloud key as unavailable rather than pushing", async () => {
  const ctx = makeCloudEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.phiSetPassphrase("a clinic phi passphrase", "clinic-123");
  ctx.phiClearKeyMemoryOnly ? ctx.phiClearKeyMemoryOnly() : null;

  ctx.vaultLock();
  /* drop the in-memory copy the way a page reload would */
  vm.runInContext("_phiKey = null;", ctx);

  assert.strictEqual(ctx.phiKeyReady(), false, "locked: not ready, so sync waits instead of failing");
  const key = await ctx.phiLoadKey();
  assert.strictEqual(key, null, "the wrapped key cannot be opened while the vault is locked");

  await ctx.vaultUnlock(PASS);
  assert.strictEqual(ctx.phiKeyReady(), true, "available again once unlocked");
  assert.ok(await ctx.phiLoadKey(), "and the key really loads");
});

test("a key cached before the vault existed is upgraded in place", async () => {
  const ctx = makeCloudEnv({ entopic_patients: PATIENTS });
  /* legacy state: plain hex key, no vault */
  const legacyHex = "ab".repeat(32);
  ctx.localStorage.setItem("entopic_cloud_phi_keyhex", legacyHex);
  assert.strictEqual(ctx.phiKeyReady(), true, "legacy key still works with the vault off");

  await ctx.vaultEnable(PASS);
  vm.runInContext("_phiKey = null;", ctx);
  await ctx.phiLoadKey();          /* triggers the opportunistic re-wrap */

  const stored = ctx.__raw["entopic_cloud_phi_keyhex"];
  assert.ok(stored.charAt(0) === "{", "the stale plaintext key was wrapped once the vault opened");
  assert.ok(!stored.includes(legacyHex), "the clear copy is gone");
});

test("a locked vault cannot arm cloud sync, so it can never push emptied records", async () => {
  const ctx = makeCloudEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  ctx.phiSetConsent(true);
  await ctx.phiSetPassphrase("a clinic phi passphrase", "clinic-123");
  assert.strictEqual(ctx.phiArmed(), true, "armed while unlocked and consented");

  ctx.vaultLock();
  vm.runInContext("_phiKey = null;", ctx);

  /* This is the property that matters: cloudDrain() is gated on phiArmed(), and
     a locked vault makes loadPatients() return []. If phiArmed() stayed true,
     sync could push that emptiness and wipe the clinic's CLOUD copy too. */
  assert.strictEqual(ctx.loadStore("patients", []).length, 0, "locked reads yield nothing");
  assert.strictEqual(ctx.phiArmed(), false, "so sync must be disarmed — it is");
});


/* ── S-1: credentials that open the CLOUD copy ────────────────────
   Encrypting records is not enough. The Supabase session (access + long-lived
   refresh token) and the Claude API key let a thief reach the clinic's data on
   the SERVER, no local decryption needed. They must be wrapped too. */

test("the cloud session and API key are wrapped by the vault, not left in the clear", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  ctx.localStorage.setItem("entopic_cloud_session",
    JSON.stringify({ access_token: "SECRET-ACCESS", refresh_token: "SECRET-REFRESH" }));
  ctx.localStorage.setItem("entopic_apikey", "sk-ant-SECRETKEY");

  await ctx.vaultEnable(PASS);          /* re-wraps existing plaintext secrets */
  await ctx.vaultFlush();

  const disk = Object.keys(ctx.__raw).map((k) => ctx.__raw[k]).join("|");
  assert.ok(!/SECRET-ACCESS/.test(disk), "no access token on disk");
  assert.ok(!/SECRET-REFRESH/.test(disk), "no refresh token on disk — it is long-lived");
  assert.ok(!/sk-ant-SECRETKEY/.test(disk), "no API key on disk");
});

test("a locked device withholds the cloud token and the API key", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultSecretSet("entopic_cloud_session", JSON.stringify({ access_token: "SECRET-ACCESS" }));
  await ctx.vaultSecretSet("entopic_apikey", "sk-ant-SECRETKEY");

  ctx.vaultLock();
  assert.strictEqual(await ctx.vaultSecretGet("entopic_cloud_session"), "",
    "locked: the token is withheld, so a stolen device cannot reach the cloud");
  assert.strictEqual(await ctx.vaultSecretGet("entopic_apikey"), "");
  assert.strictEqual(ctx.vaultSecretPresent("entopic_cloud_session"), true,
    "…but we can still tell it EXISTS, so the app does not offer to create a new one");
  assert.strictEqual(ctx.vaultSecretAvailable("entopic_cloud_session"), false);

  await ctx.vaultUnlock(PASS);
  assert.ok((await ctx.vaultSecretGet("entopic_cloud_session")).includes("SECRET-ACCESS"),
    "unlocking restores it");
});

test("with the vault off, secrets behave exactly as before (no forced migration)", async () => {
  const ctx = makeEnv();
  await ctx.vaultSecretSet("entopic_apikey", "sk-plain");
  assert.strictEqual(ctx.__raw["entopic_apikey"], "sk-plain", "stored plainly when encryption is off");
  assert.strictEqual(await ctx.vaultSecretGet("entopic_apikey"), "sk-plain");
});

test("an empty secret is removed rather than stored as an empty envelope", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  await ctx.vaultSecretSet("entopic_apikey", "sk-x");
  await ctx.vaultSecretSet("entopic_apikey", "");
  assert.strictEqual(ctx.vaultSecretPresent("entopic_apikey"), false);
});


/* ── S-3: unlock throttling ───────────────────────────────────────
   Not the primary defence (PBKDF2 at 210k iterations is, and an attacker with
   the device can attack the ciphertext offline anyway) — this stops someone at
   the keyboard of an unattended locked terminal. */
test("vault unlock throttles after repeated wrong passphrases", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  ctx.vaultLock();

  for (let i = 0; i < ctx.VAULT_THROTTLE_AFTER; i++) {
    await assert.rejects(() => ctx.vaultUnlock("wrong one"), /did not open the vault/);
  }
  await assert.rejects(() => ctx.vaultUnlock("wrong again"), /Too many attempts/,
    "further guesses are made to wait");

  /* the delay is bounded — a clinic must never be permanently locked out */
  assert.ok(ctx.vaultUnlockDelayMs(100, 1000, 1000) <= 5 * 60 * 1000);
  /* and it expires with time */
  assert.strictEqual(ctx.vaultUnlockDelayMs(6, 10 * 60 * 1000, 0), 0);
});

test("a correct passphrase clears the throttle", async () => {
  const ctx = makeEnv({ entopic_patients: PATIENTS });
  await ctx.vaultEnable(PASS);
  ctx.vaultLock();
  for (let i = 0; i < 3; i++) await assert.rejects(() => ctx.vaultUnlock("nope"));
  await ctx.vaultUnlock(PASS);
  assert.strictEqual(ctx.vaultThrottleCheck(), 0, "counter reset on success");
});

test("throttle state is in memory only, so it cannot lock a clinic out of its records", () => {
  const ctx = makeEnv();
  ctx.vaultThrottleNoteFailure();
  const persisted = Object.keys(ctx.__raw).some((k) => /fail|attempt|throttle/i.test(k));
  assert.strictEqual(persisted, false,
    "persisting attempts would let an attacker burn them and deny the clinic its own data");
});


/* ═══════════════════════════════════════════════════════════════ */
/* PER-VISIT RECORDS MUST BE ENCRYPTED TOO                          */
/*                                                                  */
/* REGRESSION. js/visit-store.js split the visit array into one key */
/* per visit (entopic_visit_<id>). vaultEnable, vaultDisable and    */
/* vaultHydrate each walked the STATIC list VAULT_PROTECTED, which  */
/* names none of them. Measured in a browser, on the real code:     */
/*                                                                  */
/*   turning encryption ON left every visit record — the entire     */
/*   clinical content of every examination — on disk IN PLAINTEXT,  */
/*   while the device reported itself encrypted. The records also   */
/*   became unreadable, because loadStore correctly routed them     */
/*   through a vault cache that hydrate had never filled.           */
/*                                                                  */
/* A confidentiality failure and an availability failure from one   */
/* hard-coded list. These tests use REAL crypto and the REAL split. */
/* ═══════════════════════════════════════════════════════════════ */

function makeSplitEnv() {
  const ctx = makeEnv();
  const read = (f) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");
  vm.runInContext(read("js/visit-store.js"), ctx, { filename: "visit-store.js" });
  vm.runInContext(`
    savePatients(${JSON.stringify(PATIENTS)});
    saveVisits([{ id: "v1", patient_id: "p1", date: "2026-01-01", status: "completed",
                  data: { id: "v1", final_dx: "CONFIDENTIAL DIAGNOSIS",
                          cc: "SECRET COMPLAINT TEXT", iop: { od: "18" } } },
                { id: "v2", patient_id: "p2", date: "2026-02-01", status: "completed",
                  data: { id: "v2", final_dx: "ANOTHER PRIVATE FINDING" } }]);
    visitStoreSplitNow();
  `, ctx);
  return ctx;
}

const SECRETS = /CONFIDENTIAL DIAGNOSIS|SECRET COMPLAINT|ANOTHER PRIVATE FINDING|Meera|MRN-4471/;

test("vaultProtectedKeys enumerates the per-visit records actually on the device", () => {
  const ctx = makeSplitEnv();
  const keys = vm.runInContext("vaultProtectedKeys()", ctx);
  for (const k of ["patients", "visits", "visit_index", "visit_v1", "visit_v2"]) {
    assert.ok(keys.includes(k), k + " is not in the protected set — it will be left in plaintext");
  }
  assert.ok(!keys.includes("settings"), "settings must not be swept into the vault");
});

test("enabling the vault leaves NO visit content in plaintext on disk", async () => {
  const ctx = makeSplitEnv();
  const before = Object.keys(ctx.__raw).filter((k) => k.indexOf("entopic_visit_") === 0);
  assert.ok(before.length >= 3, "setup: expected split records, got " + before.join(","));

  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);

  const leaks = Object.keys(ctx.__raw).filter((k) => SECRETS.test(ctx.__raw[k] || ""));
  assert.deepStrictEqual(leaks, [],
    "clinical content is readable on disk after enabling encryption: " + leaks.join(", "));

  /* Not merely "not matching the regex" — each record must be a real envelope. */
  for (const k of before) {
    const parsed = JSON.parse(ctx.__raw[k]);
    assert.strictEqual(vm.runInContext("vaultIsEnvelope", ctx)(parsed), true,
      k + " was not encrypted");
  }
});

test("and the records are still readable through the unlocked vault", async () => {
  const ctx = makeSplitEnv();
  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);
  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 2,
    "the visits became unreadable the moment they were encrypted");
  assert.strictEqual(
    vm.runInContext('getPatientVisits("p1")[0].data.final_dx', ctx), "CONFIDENTIAL DIAGNOSIS");
  assert.strictEqual(vm.runInContext('getLastVisit("p2").data.final_dx', ctx),
    "ANOTHER PRIVATE FINDING");
});

test("lock, then unlock, and every visit comes back", async () => {
  const ctx = makeSplitEnv();
  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);
  vm.runInContext("vaultLock()", ctx);

  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 0,
    "a locked vault must report nothing available, not the records");
  assert.strictEqual(vm.runInContext('saveVisits([{ id: "x" }])', ctx), false,
    "a locked vault must refuse writes, or the empty fallback overwrites real records");

  await vm.runInContext(`vaultUnlock(${JSON.stringify(PASS)})`, ctx);
  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 2, "records did not come back");
  assert.strictEqual(
    vm.runInContext('getPatientVisits("p1")[0].data.final_dx', ctx), "CONFIDENTIAL DIAGNOSIS");
});

test("saving one visit while encrypted writes ciphertext, not plaintext", async () => {
  const ctx = makeSplitEnv();
  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);

  vm.runInContext(`
    var v = visitRecordLoad("v1");
    v.data.final_dx = "A NEWLY TYPED PRIVATE DIAGNOSIS";
    visitRecordSave(v);
  `, ctx);
  await vm.runInContext("vaultFlush()", ctx);

  const leaks = Object.keys(ctx.__raw).filter((k) => /A NEWLY TYPED PRIVATE/.test(ctx.__raw[k] || ""));
  assert.deepStrictEqual(leaks, [],
    "a visit saved while the vault was on landed on disk in the clear: " + leaks.join(", "));
  assert.strictEqual(vm.runInContext('visitRecordLoad("v1").data.final_dx', ctx),
    "A NEWLY TYPED PRIVATE DIAGNOSIS", "and it must still read back");
});

test("turning the vault OFF returns every visit to readable plaintext", async () => {
  /* The reverse of the same bug: disable that walks a static list would leave
     the visit records as unreadable ciphertext with the key thrown away. */
  const ctx = makeSplitEnv();
  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);
  await vm.runInContext(`vaultDisable(${JSON.stringify(PASS)})`, ctx);

  assert.strictEqual(vm.runInContext("vaultEnabled()", ctx), false, "setup: vault should be off");
  assert.strictEqual(vm.runInContext("loadVisits().length", ctx), 2,
    "visits were left as ciphertext nobody can decrypt");
  assert.strictEqual(
    vm.runInContext('getPatientVisits("p1")[0].data.final_dx', ctx), "CONFIDENTIAL DIAGNOSIS");
});

test("no vault loop walks the static list any more", () => {
  /* The static list is still the DECLARATION; it must no longer be the thing
     enable/disable/hydrate iterate, or the next store added by prefix is
     silently left in the clear again. */
  const src = fs.readFileSync(path.resolve(__dirname, "..", "js/local-vault.js"), "utf8");
  const loops = src.match(/VAULT_PROTECTED\.forEach/g) || [];
  assert.strictEqual(loops.length, 1,
    "expected exactly one VAULT_PROTECTED.forEach (inside vaultProtectedKeys); found " +
    loops.length + ". enable, disable and hydrate must enumerate what is actually stored.");
});
