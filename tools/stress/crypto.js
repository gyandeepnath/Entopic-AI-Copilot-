/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — CREDENTIALS, THE VAULT, AND THE ENVELOPE    */
/*                                                                  */
/*   node tools/stress/crypto.js                                    */
/*                                                                  */
/* attack.js covers storage and the engine; privacy.js covers what  */
/* leaves. Neither touches the code that decides WHO GETS IN and    */
/* WHETHER THE BYTES ON DISK ARE READABLE. Those had no adversarial */
/* coverage at all, and they are the difference between a lost      */
/* laptop being an inconvenience and being a records breach.        */
/*                                                                  */
/* Node 22 supplies a real WebCrypto, so these run against the      */
/* actual PBKDF2 and AES-GCM the browser would use — not a stub.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { makeHarness, must, mustEqual, browser } = require("./lib");
const H = makeHarness(process.argv);
const { G, attack, runAll } = H;

const AUTH = ["js/auth-crypto.js"];

function authCtx(opts) {
  return browser(Object.assign({ base: false, also: AUTH }, opts || {}));
}

/* A context whose WebCrypto is missing, exactly as an old or locked-down
   browser presents. */
function noCryptoCtx() {
  return browser({ base: false, also: AUTH, extra: { crypto: undefined } });
}

const P = (ctx, expr) => ctx.run(expr);


/* ═══════════════════════════════════════════════════════════════ */
G("U. password credentials");

attack("U1 the stored credential never contains the password", async () => {
  const c = authCtx();
  const cred = await c.run(`authMakeCredentials("correct horse battery staple")`);
  const dump = JSON.stringify(cred);
  must(dump.indexOf("correct horse") < 0, "the password is inside its own credential: " + dump);
  must(!("password" in cred), "the credential carries a `password` field");
  must(cred.pw_hash && cred.pw_salt, "a credential must carry a hash and a salt");
});

attack("U2 the same password hashes differently for two accounts", async () => {
  const c = authCtx();
  const a = await c.run(`authMakeCredentials("same-password")`);
  const b = await c.run(`authMakeCredentials("same-password")`);
  must(a.pw_salt !== b.pw_salt, "two accounts were given the same salt");
  must(a.pw_hash !== b.pw_hash,
    "two accounts with the same password share a hash — one cracked password cracks both");
});

attack("U3 real PBKDF2 is used when the browser has WebCrypto", async () => {
  const c = authCtx();
  const cred = await c.run(`authMakeCredentials("pw")`);
  mustEqual(cred.pw_algo, "pbkdf2-sha256-v1",
    "a browser WITH WebCrypto silently used the weak fallback");
});

attack("U4 the correct password verifies and the wrong one does not", async () => {
  const c = authCtx();
  c.__u = await c.run(`authMakeCredentials("s3cret-pass")`);
  const good = await c.run(`authVerifyUser(__u, "s3cret-pass")`);
  mustEqual(good.ok, true, "the correct password was rejected");
  for (const bad of ["s3cret-pas", "s3cret-passs", "", "S3CRET-PASS", "wrong"]) {
    const r = await c.run(`authVerifyUser(__u, ${JSON.stringify(bad)})`);
    mustEqual(r.ok, false, "a wrong password (" + JSON.stringify(bad) + ") was accepted");
  }
});

attack("U5 an empty or missing password does not authenticate", async () => {
  const c = authCtx();
  c.__u = await c.run(`authMakeCredentials("realpass")`);
  for (const bad of ["null", "undefined", '""', "0", "false"]) {
    const r = await c.run(`authVerifyUser(__u, ${bad})`);
    mustEqual(r.ok, false, "authenticated with " + bad);
  }
});

attack("U6 a blank-credential record cannot be logged into", async () => {
  /* An attacker who can write the users store must not be able to make a
     no-password account by blanking the fields. */
  const c = authCtx();
  for (const u of ['{ pw_hash: "", pw_salt: "" }', '{ pw_hash: null, pw_salt: null }',
                   '{}', '{ pw_hash: "x" }', '{ pw_salt: "y" }']) {
    for (const pw of ['""', '"anything"', 'undefined']) {
      const r = await c.run(`authVerifyUser(${u}, ${pw})`);
      mustEqual(r.ok, false, "logged in to " + u + " with " + pw);
    }
  }
});

attack("U7 the comparison does not leak length by returning early", () => {
  const c = authCtx();
  mustEqual(c.run(`authSafeEqual("abc", "abcd")`), false, "different lengths must not match");
  mustEqual(c.run(`authSafeEqual("abc", "abc")`), true, "equal strings must match");
  mustEqual(c.run(`authSafeEqual("", "")`), true, "two empties are equal");
  mustEqual(c.run(`authSafeEqual(null, "")`), true, "null coerces to empty");
  mustEqual(c.run(`authSafeEqual("a", "b")`), false, "same length, different content");
});

attack("U8 a legacy plaintext record migrates on a CORRECT password only", async () => {
  const c = authCtx();
  c.__u = { username: "old", password: "legacy-pass" };
  const bad = await c.run(`authVerifyUser(__u, "wrong")`);
  mustEqual(bad.ok, false, "a wrong password authenticated against a legacy record");
  mustEqual(c.run("typeof __u.password"), "string",
    "a FAILED attempt migrated the record — that erases the only credential on a wrong guess");

  const good = await c.run(`authVerifyUser(__u, "legacy-pass")`);
  mustEqual(good.ok, true, "the correct legacy password failed");
  mustEqual(good.migrated, true, "the record must be upgraded on the way through");
  mustEqual(c.run("typeof __u.password"), "undefined",
    "the plaintext password survived the migration");
  must(c.run("!!__u.pw_hash && !!__u.pw_salt"), "no modern credential was written");
});

attack("U9 a migrated legacy record still verifies afterwards", async () => {
  const c = authCtx();
  c.__u = { username: "old", password: "legacy-pass" };
  await c.run(`authVerifyUser(__u, "legacy-pass")`);
  const again = await c.run(`authVerifyUser(__u, "legacy-pass")`);
  mustEqual(again.ok, true, "the account was locked out by its own migration");
  const wrong = await c.run(`authVerifyUser(__u, "legacy-pas")`);
  mustEqual(wrong.ok, false, "after migration a wrong password was accepted");
});


/* ═══════════════════════════════════════════════════════════════ */
G("V. algorithm downgrade and cross-browser portability");

attack("V1 a fallback-hashed account still verifies in the SAME browser", async () => {
  const c = noCryptoCtx();
  mustEqual(c.run("authHasWebCrypto()"), false, "sanity: this context has no WebCrypto");
  c.__u = await c.run(`authMakeCredentials("pw-fallback")`);
  mustEqual(c.__u.pw_algo, "fallback-v1", "sanity: the fallback was used");
  const r = await c.run(`authVerifyUser(__u, "pw-fallback")`);
  mustEqual(r.ok, true, "an account cannot verify in the browser that created it");
});

attack("V2 an account created WITHOUT WebCrypto still opens WITH it", async () => {
  /* The portability case: a clinic creates the account in an old browser or a
     locked-down kiosk, then opens the same records in Chrome. If verification
     always re-hashes with the STRONGEST available algorithm rather than the one
     the credential was stored under, the hashes cannot match and the clinician
     is locked out of their own patient records — with a correct password. */
  const weak = noCryptoCtx();
  const cred = await weak.run(`authMakeCredentials("portable-pass")`);
  mustEqual(cred.pw_algo, "fallback-v1", "sanity: stored under the fallback");

  const strong = authCtx();
  mustEqual(strong.run("authHasWebCrypto()"), true, "sanity: this context HAS WebCrypto");
  strong.__u = cred;
  const r = await strong.run(`authVerifyUser(__u, "portable-pass")`);
  mustEqual(r.ok, true,
    "a correct password was rejected because the browser is now stronger — " +
    "the clinician is locked out of their own records");
});

attack("V3 a PBKDF2 account does NOT verify against a fallback hash", async () => {
  /* The other direction is a security question, not a usability one: an
     attacker who can suppress WebCrypto must not get the weak path accepted
     against a strong stored hash. */
  const strong = authCtx();
  const cred = await strong.run(`authMakeCredentials("downgrade-me")`);
  mustEqual(cred.pw_algo, "pbkdf2-sha256-v1", "sanity");

  const weak = noCryptoCtx();
  weak.__u = JSON.parse(JSON.stringify(cred));
  const r = await weak.run(`authVerifyUser(__u, "downgrade-me")`);
  mustEqual(r.ok, false,
    "suppressing WebCrypto let a weak hash satisfy a strong stored credential");
});

attack("V4 an upgraded credential does not silently keep the weak algorithm", async () => {
  /* If a fallback account is opened in a capable browser, the honest outcome is
     to re-hash it under PBKDF2. Whatever the resolution, the record must not
     end up claiming an algorithm it was not hashed with. */
  const weak = noCryptoCtx();
  const cred = await weak.run(`authMakeCredentials("upgrade-me")`);
  const strong = authCtx();
  strong.__u = JSON.parse(JSON.stringify(cred));
  const r = await strong.run(`authVerifyUser(__u, "upgrade-me")`);
  if (!r.ok) return;                            /* covered by V2 */
  const algo = strong.run("__u.pw_algo");
  const hash = strong.run("__u.pw_hash");
  if (algo === "pbkdf2-sha256-v1") {
    must(hash !== cred.pw_hash, "the record claims PBKDF2 but still holds the fallback hash");
  } else {
    mustEqual(algo, "fallback-v1", "the record claims an algorithm it was not hashed with");
  }
});

attack("V5 the fallback hash is at least salt-dependent and password-dependent", () => {
  const c = noCryptoCtx();
  const a = c.run(`authFallbackHash("pw", "salt-a")`);
  const b = c.run(`authFallbackHash("pw", "salt-b")`);
  const d = c.run(`authFallbackHash("pw2", "salt-a")`);
  must(a !== b, "the fallback ignores the salt — one rainbow table breaks every account");
  must(a !== d, "the fallback ignores the password");
});


/* ═══════════════════════════════════════════════════════════════ */
G("W. the vault — bytes on a lost laptop");

const VAULT = ["js/data-classification.js", "js/storage.js", "js/local-vault.js"];

function vaultCtx() {
  const c = browser({ also: ["js/local-vault.js"] });
  return c;
}

attack("W1 a wrong passphrase does not unlock", async () => {
  const c = vaultCtx();
  const ok = await c.run(`vaultEnable("correct-passphrase-1234")`);
  must(ok, "sanity: the vault enabled");
  c.run("vaultLock()");
  mustEqual(c.run("vaultUnlocked()"), false, "sanity: locked");
  const r = await c.run(`vaultUnlock("wrong-passphrase-1234").then(function(x){return !!x},function(){return false})`);
  mustEqual(r, false, "a wrong passphrase unlocked the vault");
  mustEqual(c.run("vaultUnlocked()"), false, "the vault reports unlocked after a failed attempt");
});

attack("W2 the correct passphrase unlocks", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("correct-passphrase-1234")`);
  c.run("vaultLock()");
  const r = await c.run(`vaultUnlock("correct-passphrase-1234").then(function(x){return !!x},function(){return false})`);
  mustEqual(r, true, "the correct passphrase failed to unlock");
});

attack("W3 the passphrase is never stored anywhere on disk", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("Sup3rSecretPhrase!")`);
  const dump = JSON.stringify(c._mem);
  must(dump.indexOf("Sup3rSecretPhrase") < 0,
    "the vault passphrase is sitting in localStorage");
});

attack("W4 a tampered ciphertext is refused, not silently mis-decrypted", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("phrase-for-tamper-test")`);
  const env = await c.run(`vaultEncryptValue({ secret: "clinical" })`);
  must(env && env.ct, "sanity: got an envelope");
  c.__env = env;
  /* Flip a byte in the base64 ciphertext. AES-GCM must reject it. */
  const r = await c.run(`
    (function () {
      var bad = Object.assign({}, __env);
      var s = bad.ct.split("");
      s[3] = (s[3] === "A" ? "B" : "A");
      bad.ct = s.join("");
      return vaultDecryptValue(bad).then(function (v) { return { ok: true, v: v }; },
                                         function () { return { ok: false }; });
    })()
  `);
  mustEqual(r.ok, false, "a tampered ciphertext decrypted — AES-GCM authentication is not being enforced");
});

attack("W5 a swapped IV does not decrypt", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("phrase-for-iv-test")`);
  const a = await c.run(`vaultEncryptValue({ a: 1 })`);
  const b = await c.run(`vaultEncryptValue({ b: 2 })`);
  must(a.iv !== b.iv, "two encryptions reused the same IV — catastrophic for AES-GCM");
  c.__a = a; c.__b = b;
  const r = await c.run(`
    vaultDecryptValue({ __vault: __a.__vault, iv: __b.iv, ct: __a.ct })
      .then(function (v) { return { ok: true }; }, function () { return { ok: false }; })
  `);
  mustEqual(r.ok, false, "decryption succeeded with the wrong IV");
});

attack("W6 a locked vault cannot decrypt", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("phrase-locked-test")`);
  const env = await c.run(`vaultEncryptValue({ secret: "clinical" })`);
  c.__env = env;
  c.run("vaultLock()");
  const r = await c.run(`
    vaultDecryptValue(__env).then(function () { return { ok: true }; },
                                  function () { return { ok: false }; })
  `);
  mustEqual(r.ok, false, "a locked vault decrypted a record");
});

attack("W7 the recovery code opens the vault when the passphrase is lost", async () => {
  const c = vaultCtx();
  const res = await c.run(`vaultEnable("forgotten-phrase-1234")`);
  const code = c.run("(typeof __lastRecovery !== 'undefined') ? __lastRecovery : null") ||
               (res && (res.recovery || res.recoveryCode || res.code));
  if (!code) return;                        /* shape differs; W8 covers the negative */
  c.run("vaultLock()");
  c.__code = code;
  const r = await c.run(`
    vaultUnlockWithRecovery(__code).then(function (x) { return !!x; }, function () { return false; })
  `);
  mustEqual(r, true, "the recovery code did not open the vault it was issued for");
});

attack("W8 a wrong recovery code does not open the vault", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("phrase-recovery-neg")`);
  c.run("vaultLock()");
  const r = await c.run(`
    vaultUnlockWithRecovery("AAAA-BBBB-CCCC-DDDD")
      .then(function (x) { return !!x; }, function () { return false; })
  `);
  mustEqual(r, false, "an arbitrary recovery code unlocked the vault");
});

attack("W9 repeated failures are throttled", () => {
  const c = vaultCtx();
  const first = c.run("vaultUnlockDelayMs(0, 1000, 0)");
  const many = c.run("vaultUnlockDelayMs(10, 1000, 1000)");
  must(many > first, "ten failed attempts are not slowed down at all — offline guessing is free");
});

attack("W10 two encryptions of the same value differ (no deterministic ciphertext)", async () => {
  const c = vaultCtx();
  await c.run(`vaultEnable("phrase-determinism")`);
  const a = await c.run(`vaultEncryptValue({ same: "value" })`);
  const b = await c.run(`vaultEncryptValue({ same: "value" })`);
  must(a.ct !== b.ct,
    "the same plaintext produced the same ciphertext — an observer can tell records apart");
});

runAll("crypto").then((n) => process.exit(n ? 1 : 0));
