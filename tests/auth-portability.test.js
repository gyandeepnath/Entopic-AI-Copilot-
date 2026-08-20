/* ═══════════════════════════════════════════════════════════════ */
/* CREDENTIALS MUST BE PORTABLE BETWEEN BROWSERS                    */
/*                                                                  */
/* Promoted from tools/stress/crypto.js (V2), which found this:      */
/*                                                                  */
/* Verification always re-hashed with the strongest algorithm the    */
/* CURRENT browser offered. An account created on a device without   */
/* WebCrypto is stored under `fallback-v1`; open the same records in */
/* Chrome and verification used PBKDF2, the digests could not match, */
/* and the clinician was locked out of their own patient records     */
/* while typing the correct password.                                */
/*                                                                  */
/* The fix has to satisfy BOTH directions at once, which is why      */
/* both are pinned here:                                             */
/*   · a weak stored hash must still verify on a strong browser      */
/*     (portability), and                                            */
/*   · a weak hash must NEVER satisfy a strong stored credential     */
/*     (suppressing WebCrypto must not become a downgrade attack).   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* `webcrypto: false` presents the module with the browser an old or
   locked-down device gives it. Everything else is identical. */
function ctx(opts) {
  opts = opts || {};
  const store = {};
  const c = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp,
    parseInt, parseFloat, isNaN, isFinite, Promise, Error,
    Uint8Array, TextEncoder, TextDecoder,
    module: { exports: {} },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    logAudit: () => {}
  };
  if (opts.webcrypto !== false) c.crypto = globalThis.crypto;
  vm.createContext(c);
  for (const f of (opts.files || ["js/auth-crypto.js"])) {
    vm.runInContext(read(f), c, { filename: f });
  }
  c.run = (e) => vm.runInContext(e, c);
  return c;
}

test("a browser WITH WebCrypto stores a real PBKDF2 credential", async () => {
  const c = ctx();
  assert.strictEqual(c.run("authHasWebCrypto()"), true, "sanity: WebCrypto present");
  const cred = await c.run(`authMakeCredentials("pw")`);
  assert.strictEqual(cred.pw_algo, "pbkdf2-sha256-v1");
});

test("a browser WITHOUT WebCrypto stores a fallback credential", async () => {
  const c = ctx({ webcrypto: false });
  assert.strictEqual(c.run("authHasWebCrypto()"), false, "sanity: WebCrypto absent");
  const cred = await c.run(`authMakeCredentials("pw")`);
  assert.strictEqual(cred.pw_algo, "fallback-v1");
});

test("an account created WITHOUT WebCrypto still opens WITH it", async () => {
  /* THE DEFECT. A correct password used to be rejected here, permanently
     locking the clinician out of their own records. */
  const weak = ctx({ webcrypto: false });
  const cred = await weak.run(`authMakeCredentials("portable-pass")`);
  assert.strictEqual(cred.pw_algo, "fallback-v1", "sanity: stored under the fallback");

  const strong = ctx();
  strong.__u = JSON.parse(JSON.stringify(cred));
  const res = await strong.run(`authVerifyUser(__u, "portable-pass")`);
  assert.strictEqual(res.ok, true,
    "a correct password was rejected because the browser is now stronger");
});

test("opening a fallback account on a capable browser UPGRADES it to PBKDF2", async () => {
  const weak = ctx({ webcrypto: false });
  const cred = await weak.run(`authMakeCredentials("upgrade-me")`);
  const strong = ctx();
  strong.__u = JSON.parse(JSON.stringify(cred));
  const res = await strong.run(`authVerifyUser(__u, "upgrade-me")`);

  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.migrated, true, "the caller must be told to persist the upgrade");
  assert.strictEqual(strong.run("__u.pw_algo"), "pbkdf2-sha256-v1",
    "the record must be re-hashed, not left weak");
  assert.notStrictEqual(strong.run("__u.pw_hash"), cred.pw_hash,
    "the record claims PBKDF2 but still holds the fallback digest");
  /* And it must still verify after the upgrade. */
  const again = await strong.run(`authVerifyUser(__u, "upgrade-me")`);
  assert.strictEqual(again.ok, true, "the upgrade locked the account out of itself");
  const wrong = await strong.run(`authVerifyUser(__u, "upgrade-m")`);
  assert.strictEqual(wrong.ok, false, "after the upgrade a wrong password was accepted");
});

test("suppressing WebCrypto does NOT downgrade a PBKDF2 credential", async () => {
  /* The security direction. An attacker who can disable WebCrypto must not get
     the cheap fallback hash accepted against a strong stored credential. */
  const strong = ctx();
  const cred = await strong.run(`authMakeCredentials("downgrade-me")`);
  assert.strictEqual(cred.pw_algo, "pbkdf2-sha256-v1", "sanity");

  const weak = ctx({ webcrypto: false });
  weak.__u = JSON.parse(JSON.stringify(cred));
  const res = await weak.run(`authVerifyUser(__u, "downgrade-me")`);
  assert.strictEqual(res.ok, false,
    "a weak hash satisfied a strong stored credential — that is a downgrade attack");
});

test("a credential with no pw_algo is judged by the shape of its hash", async () => {
  /* Records written before pw_algo existed must not be sent down the wrong
     comparison. 64 hex = PBKDF2; a leading "w" = the fallback; otherwise
     assume the strong path, because guessing "fallback" would send a real
     credential down the weak comparison. */
  const c = ctx();
  assert.strictEqual(c.run(`authCredentialAlgo({ pw_hash: "${"a".repeat(64)}" })`),
    "pbkdf2-sha256-v1");
  assert.strictEqual(c.run(`authCredentialAlgo({ pw_hash: "wabc123" })`), "fallback-v1");
  assert.strictEqual(c.run(`authCredentialAlgo({ pw_hash: "" })`), "pbkdf2-sha256-v1");
  assert.strictEqual(c.run(`authCredentialAlgo({ pw_algo: "fallback-v1", pw_hash: "x" })`),
    "fallback-v1", "an explicit pw_algo wins over the shape guess");
});

test("a legacy no-algo PBKDF2 record still verifies", async () => {
  const c = ctx();
  const cred = await c.run(`authMakeCredentials("legacy-noalgo")`);
  c.__u = { pw_salt: cred.pw_salt, pw_hash: cred.pw_hash };   /* pw_algo deleted */
  const res = await c.run(`authVerifyUser(__u, "legacy-noalgo")`);
  assert.strictEqual(res.ok, true, "a record predating pw_algo was locked out");
});

test("the admin credential is verified under its own stored algorithm too", async () => {
  /* roles.js kept the same defect: adminSetPassword records `algo` and
     adminVerify ignored it, so an admin credential created without WebCrypto
     could never be verified on a browser with it. */
  const roles = read("js/roles.js");
  assert.match(roles, /authHashPasswordAs\(/,
    "adminVerify must hash under the credential's stored algorithm");
  assert.ok(!/return authHashPassword\(password, cred\.salt\)/.test(roles),
    "adminVerify is still re-hashing with the strongest available algorithm");
});

test("the built-in admin password still opens the panel", async () => {
  /* A regression here locks the founder out of their own Admin tab. */
  const c = ctx({ files: ["js/auth-crypto.js", "js/roles.js"] });
  assert.strictEqual(await c.run(`adminVerify("entopic-admin", "Entopic-Admin-2026")`), true);
  assert.strictEqual(await c.run(`adminVerify("entopic-admin", "wrong")`), false);
  assert.strictEqual(await c.run(`adminVerify("someone-else", "Entopic-Admin-2026")`), false,
    "the username must be checked too");
});
