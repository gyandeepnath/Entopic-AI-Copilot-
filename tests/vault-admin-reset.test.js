/* ═══════════════════════════════════════════════════════════════ */
/* ADMINISTRATOR VAULT RESET  (founder decision, 2026-08-07)        */
/*                                                                  */
/* "If a user loses the vault passphrase, the admin can reset it on  */
/*  request with a master password; the user then sets their own     */
/*  passphrase again."                                               */
/*                                                                  */
/* This is KEY ESCROW, and these tests exist because escrow that is  */
/* slightly wrong is worse than no escrow. Three things must hold:   */
/*                                                                  */
/*   1. It works — a reset genuinely restores access to the SAME     */
/*      records, without re-encrypting any of them.                  */
/*   2. It cannot be imposed. Enrolment requires the user's own      */
/*      passphrase, so an administrator cannot quietly add           */
/*      themselves to a vault they could not already open.           */
/*   3. It cannot be abused quietly. Every enrolment, reset and      */
/*      failed attempt is audited, and the admin's temporary         */
/*      passphrase cannot become the standing one.                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const PASS = "correct horse battery staple";
const MASTER = "clinic master password 2026!";

function vaultSandbox() {
  const mem = {};
  const ls = {
    get length() { return Object.keys(mem).length; },
    key: (i) => Object.keys(mem)[i] ?? null,
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  const audits = [];
  const ctx = {
    localStorage: ls, _mem: mem, _audits: audits,
    crypto: webcrypto, TextEncoder, TextDecoder, btoa, atob, Buffer,
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set, Promise, Error,
    Uint8Array, parseInt, parseFloat, isNaN, isFinite, Boolean,
    setTimeout, clearTimeout,
    module: { exports: {} },
    STORE_PREFIX: "entopic_",
    logAudit: (a, d) => audits.push({ a, d })
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/local-vault.js"), ctx, { filename: "local-vault.js" });
  /* Escrow lives in its own module now; both are needed. */
  vm.runInContext(read("js/vault-admin-recovery.js"), ctx, { filename: "vault-admin-recovery.js" });
  return ctx;
}

/* Set up an enabled vault holding one recognisable record. */
async function enabledVault() {
  const ctx = vaultSandbox();
  ctx.localStorage.setItem("entopic_patients",
    JSON.stringify([{ id: "p1", first_name: "Recoverable", mrn: "MRN-1" }]));
  await vm.runInContext(`vaultEnable(${JSON.stringify(PASS)})`, ctx);
  return ctx;
}

const call = (ctx, expr) => vm.runInContext(expr, ctx);
const audited = (ctx, action) => ctx._audits.filter((x) => x.a === action);


/* ═══ 1. THE RECOVERY THAT ALREADY EXISTED ═══ */

test("a recovery code is issued when the vault is enabled, and it opens the vault", async () => {
  /* Correcting the Phase 5 report, which stated there was NO recovery
     mechanism. There is, and it predates this work: enabling the vault
     dual-wraps the key under the passphrase AND a 125-bit printed code. */
  const ctx = vaultSandbox();
  const res = await call(ctx, `vaultEnable(${JSON.stringify(PASS)})`);
  assert.ok(res.recoveryCode, "a recovery code must be issued at enable time");
  assert.ok(res.recoveryCode.length >= 25, "125 bits, grouped for a human to copy");

  call(ctx, "vaultLock()");
  assert.strictEqual(call(ctx, "vaultUnlocked()"), false);
  await call(ctx, `vaultUnlockWithRecovery(${JSON.stringify(res.recoveryCode)})`);
  assert.strictEqual(call(ctx, "vaultUnlocked()"), true);
});


/* ═══ 2. ENROLMENT CANNOT BE IMPOSED ═══ */

test("a fresh vault has no administrator enrolled", async () => {
  const ctx = await enabledVault();
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), false,
    "escrow must never be the default — nothing is escrowed silently");
  assert.strictEqual(call(ctx, "vaultAdminEnrolment()"), null);
});

test("enrolment requires the user's own passphrase", async () => {
  /* The consent gate. An administrator who does not already have the user's
     passphrase cannot add themselves to a vault they could not open. */
  const ctx = await enabledVault();
  await assert.rejects(
    () => call(ctx, `vaultAdminEnrol("wrong passphrase", ${JSON.stringify(MASTER)}, "Dr Admin")`),
    /passphrase was not correct/);
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), false);
});

test("a weak master password is refused, with the reason", async () => {
  const ctx = await enabledVault();
  await assert.rejects(
    () => call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, "short", "Dr Admin")`),
    /at least 16 characters/);
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), false);
});

test("the master password may not equal the passphrase it overrides", async () => {
  const ctx = await enabledVault();
  await assert.rejects(
    () => call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(PASS)}, "Dr Admin")`),
    /must be different/);
});

test("enrolment records who and when, and says what it means", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), true);
  const e = call(ctx, "vaultAdminEnrolment()");
  assert.strictEqual(e.by, "Dr Admin");
  assert.ok(e.at, "the user must be able to see when they agreed to this");

  const a = audited(ctx, "vault_admin_enrolled");
  assert.strictEqual(a.length, 1);
  assert.match(a[0].d, /decrypt every record/,
    "the audit entry must state the consequence, not just the event");
});


/* ═══ 3. THE RESET ═══ */

test("an administrator can restore access, and the SAME records come back", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");

  /* The user has forgotten the passphrase and lost the printed code. */
  await assert.rejects(() => call(ctx, 'vaultUnlock("the passphrase they misremember")'));

  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "a brand new passphrase", "Dr Admin")`);
  await call(ctx, 'vaultUnlock("a brand new passphrase")');
  assert.strictEqual(call(ctx, "vaultUnlocked()"), true);

  const patients = call(ctx, 'vaultCacheGet("patients")');
  assert.strictEqual(patients.length, 1);
  assert.strictEqual(patients[0].first_name, "Recoverable",
    "the records must be the ORIGINAL ones — the key was re-wrapped, not regenerated");
});

test("no record is re-encrypted by a reset — the stored ciphertext is untouched", async () => {
  /* This is why envelope encryption is the right shape: re-encrypting every
     record would be a long, interruptible operation on exactly the data you
     are trying to rescue. */
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  const before = ctx.localStorage.getItem("entopic_patients");
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "another new passphrase", "Dr Admin")`);
  assert.strictEqual(ctx.localStorage.getItem("entopic_patients"), before,
    "a reset must be instant and unable to half-finish");
});

test("the old passphrase stops working after a reset", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "replacement passphrase", "Dr Admin")`);
  await assert.rejects(() => call(ctx, `vaultUnlock(${JSON.stringify(PASS)})`),
    /did not open the vault/);
});

test("a reset does NOT unlock the vault as a side effect", async () => {
  /* The administrator's job is to restore access, not to read the records.
     Anyone who then opens the vault does so as themselves, through the
     ordinary unlock path, which is audited separately. */
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "yet another passphrase", "Dr Admin")`);
  assert.strictEqual(call(ctx, "vaultUnlocked()"), false,
    "restoring access and taking access are different acts and must stay different");
});

test("a wrong master password changes nothing, and is audited", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  await assert.rejects(
    () => call(ctx, 'vaultAdminReset("not the master password at all", "an attempted passphrase", "Someone")'),
    /did not work/);
  /* The original passphrase still opens it — nothing was altered. */
  await call(ctx, `vaultUnlock(${JSON.stringify(PASS)})`);
  assert.strictEqual(call(ctx, "vaultUnlocked()"), true);
  assert.strictEqual(audited(ctx, "vault_admin_reset_failed").length, 1,
    "a failed reset attempt is exactly the event a breach investigation looks for");
});

test("a reset is impossible where no administrator was enrolled", async () => {
  const ctx = await enabledVault();
  call(ctx, "vaultLock()");
  await assert.rejects(
    () => call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "new one", "Dr Admin")`),
    /No administrator is enrolled/);
});

test("a reset is audited, naming the administrator", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "audited passphrase", "Dr Admin")`);
  const a = audited(ctx, "vault_admin_reset");
  assert.strictEqual(a.length, 1);
  assert.match(a[0].d, /Dr Admin/);
});


/* ═══ 4. THE ADMIN'S PASSPHRASE MUST NOT PERSIST ═══ */

test("after a reset the user is required to set their own passphrase", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  assert.strictEqual(call(ctx, "vaultMustChangePassphrase()"), false);

  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "temporary from admin", "Dr Admin")`);
  assert.strictEqual(call(ctx, "vaultMustChangePassphrase()"), true,
    "an admin-chosen secret must not become the standing one");

  await call(ctx, 'vaultUnlock("temporary from admin")');
  await call(ctx, 'vaultChangePassphrase("temporary from admin", "the users own choice")');
  assert.strictEqual(call(ctx, "vaultMustChangePassphrase()"), false);

  const a = audited(ctx, "vault_passphrase_changed");
  assert.match(a[a.length - 1].d, /after an administrator reset/,
    "the record should show this change closed out a reset");
});

test("the user can still change their passphrase again afterwards", async () => {
  /* The founder's words: '…then later the user can reset the password again'. */
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "temporary one here", "Dr Admin")`);
  await call(ctx, 'vaultUnlock("temporary one here")');
  await call(ctx, 'vaultChangePassphrase("temporary one here", "second choice here")');
  await call(ctx, 'vaultChangePassphrase("second choice here", "third choice here!")');
  call(ctx, "vaultLock()");
  await call(ctx, 'vaultUnlock("third choice here!")');
  assert.strictEqual(call(ctx, "vaultUnlocked()"), true);
});


/* ═══ 5. CONSENT IS REVOCABLE ═══ */

test("the user can withdraw enrolment with their passphrase alone", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  await call(ctx, `vaultAdminWithdraw(${JSON.stringify(PASS)})`);
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), false);
  assert.strictEqual(audited(ctx, "vault_admin_withdrawn").length, 1);
});

test("after withdrawal the master password no longer resets anything", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  await call(ctx, `vaultAdminWithdraw(${JSON.stringify(PASS)})`);
  call(ctx, "vaultLock()");
  await assert.rejects(
    () => call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "should fail", "Dr Admin")`),
    /No administrator is enrolled/);
  /* And the user's own passphrase still works. */
  await call(ctx, `vaultUnlock(${JSON.stringify(PASS)})`);
  assert.strictEqual(call(ctx, "vaultUnlocked()"), true);
});

test("withdrawal needs the passphrase — it is not a free action", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  await assert.rejects(() => call(ctx, 'vaultAdminWithdraw("wrong")'), /was not correct/);
  assert.strictEqual(call(ctx, "vaultAdminEnrolled()"), true);
});


/* ═══ 6. THE ESCROW KEY IS NEVER STORED IN THE CLEAR ═══ */

test("only wrapped key material is written to disk", async () => {
  const ctx = await enabledVault();
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);
  const meta = ctx.localStorage.getItem("entopic_vault_meta");
  assert.ok(meta.indexOf(MASTER) < 0, "the master password must never be stored");
  assert.ok(meta.indexOf(PASS) < 0, "nor the passphrase");
  const parsed = JSON.parse(meta);
  assert.ok(parsed.wrapped.admin && parsed.wrapped.admin.ct, "only a wrapped key");
  assert.ok(parsed.kdf.admin_salt, "with its own salt, distinct from the others");
  assert.notStrictEqual(parsed.kdf.admin_salt, parsed.kdf.salt);
  assert.notStrictEqual(parsed.kdf.admin_salt, parsed.kdf.recovery_salt);
});

test("all three wrappings open the same key", async () => {
  /* The property the whole design rests on: one data key, three doors. */
  const ctx = vaultSandbox();
  ctx.localStorage.setItem("entopic_patients", JSON.stringify([{ id: "p1", first_name: "Same" }]));
  const res = await call(ctx, `vaultEnable(${JSON.stringify(PASS)})`);
  await call(ctx, `vaultAdminEnrol(${JSON.stringify(PASS)}, ${JSON.stringify(MASTER)}, "Dr Admin")`);

  for (const open of [
    `vaultUnlock(${JSON.stringify(PASS)})`,
    `vaultUnlockWithRecovery(${JSON.stringify(res.recoveryCode)})`
  ]) {
    call(ctx, "vaultLock()");
    await call(ctx, open);
    assert.strictEqual(call(ctx, 'vaultCacheGet("patients")')[0].first_name, "Same");
  }
  call(ctx, "vaultLock()");
  await call(ctx, `vaultAdminReset(${JSON.stringify(MASTER)}, "door number three", "Dr Admin")`);
  await call(ctx, 'vaultUnlock("door number three")');
  assert.strictEqual(call(ctx, 'vaultCacheGet("patients")')[0].first_name, "Same");
});
