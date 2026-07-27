/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CREDENTIAL HASHING                                     */
/*                                                                  */
/* User passwords were stored in the local store as PLAINTEXT and    */
/* compared with ===. They are now salted and stretched with         */
/* PBKDF2-SHA-256 (Web Crypto), which is available on file:// —      */
/* a local page is a secure context, so this works fully offline     */
/* with no network and no dependency.                                */
/*                                                                  */
/* ── BE HONEST ABOUT WHAT THIS DOES AND DOES NOT DO ───────────────  */
/* Entopic is a client-side app. Anyone holding the device and       */
/* willing to edit the source can still bypass the sign-in screen.   */
/* Hashing does not change that, and this is NOT a claim of real     */
/* authentication — that arrives with the Phase-2 backend, where     */
/* verification happens server-side.                                 */
/*                                                                  */
/* What it DOES buy, and why it was worth doing now:                 */
/*   • A copied local store, an exported backup, or a synced file no */
/*     longer hands over the user's actual password. People reuse    */
/*     passwords across services; leaking one in plaintext is a real */
/*     harm to that person well beyond this app.                     */
/*   • Per-user random salt, so two users with the same password do  */
/*     not share a hash and one cannot be cracked from the other.    */
/*   • Constant-time comparison, so a stored hash cannot be guessed  */
/*     byte-by-byte from timing.                                     */
/*                                                                   */
/* Existing accounts are migrated on their next successful sign-in:  */
/* the plaintext is verified once, replaced with a hash, and erased. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var AUTH_PBKDF2_ITERATIONS = 120000;   /* ~100ms on a modest device */
var AUTH_HASH_VERSION = "pbkdf2-sha256-v1";

function authHasWebCrypto() {
  return !!(typeof crypto !== "undefined" && crypto.subtle && crypto.getRandomValues);
}

function authRandomSalt() {
  if (authHasWebCrypto()) {
    var a = new Uint8Array(16);
    crypto.getRandomValues(a);
    return authBytesToHex(a);
  }
  /* Fallback only — see authHashPassword. */
  var s = "";
  for (var i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

function authBytesToHex(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
  return out;
}

function authHexToBytes(hex) {
  var a = new Uint8Array(Math.floor(String(hex).length / 2));
  for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}

/* Weak fallback for a browser with no Web Crypto. Still far better than
   storing the password itself, and flagged so the app can say so. */
function authFallbackHash(password, salt) {
  var s = String(salt) + "\u0000" + String(password);
  var h1 = 5381, h2 = 52711;
  for (var round = 0; round < 5000; round++) {
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      h1 = ((h1 << 5) + h1 + c + round) >>> 0;
      h2 = ((h2 << 5) + h2 ^ c) >>> 0;
    }
  }
  return "w" + h1.toString(36) + h2.toString(36);
}

/* Returns a Promise of the hash string. */
function authHashPassword(password, salt) {
  if (!authHasWebCrypto()) {
    return Promise.resolve({ hash: authFallbackHash(password, salt), algo: "fallback-v1" });
  }
  var enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"])
    .then(function (key) {
      return crypto.subtle.deriveBits({
        name: "PBKDF2",
        salt: enc.encode(String(salt)),
        iterations: AUTH_PBKDF2_ITERATIONS,
        hash: "SHA-256"
      }, key, 256);
    })
    .then(function (bits) {
      return { hash: authBytesToHex(new Uint8Array(bits)), algo: AUTH_HASH_VERSION };
    })
    .catch(function () {
      return { hash: authFallbackHash(password, salt), algo: "fallback-v1" };
    });
}

/* Comparison that does not leak how much of the hash matched. */
function authSafeEqual(a, b) {
  a = String(a == null ? "" : a);
  b = String(b == null ? "" : b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return diff === 0;
}

/* Build the credential fields for a NEW account. Promise of an object to
   merge onto the user record — note there is no `password` field. */
function authMakeCredentials(password) {
  var salt = authRandomSalt();
  return authHashPassword(password, salt).then(function (r) {
    return { pw_salt: salt, pw_hash: r.hash, pw_algo: r.algo };
  });
}

/* Verify a password against a user record, migrating a legacy plaintext
   record on the way. Resolves { ok, migrated, user }. */
function authVerifyUser(user, password) {
  if (!user) return Promise.resolve({ ok: false, migrated: false, user: user });

  /* Modern record. */
  if (user.pw_hash && user.pw_salt) {
    return authHashPassword(password, user.pw_salt).then(function (r) {
      return { ok: authSafeEqual(r.hash, user.pw_hash), migrated: false, user: user };
    });
  }

  /* Legacy plaintext record — verify once, then upgrade and erase. */
  if (typeof user.password === "string") {
    if (!authSafeEqual(user.password, String(password))) {
      return Promise.resolve({ ok: false, migrated: false, user: user });
    }
    return authMakeCredentials(password).then(function (cred) {
      user.pw_salt = cred.pw_salt;
      user.pw_hash = cred.pw_hash;
      user.pw_algo = cred.pw_algo;
      delete user.password;
      return { ok: true, migrated: true, user: user };
    });
  }

  return Promise.resolve({ ok: false, migrated: false, user: user });
}

/* How many stored accounts still hold a plaintext password. Surfaced in the
   Admin panel so the state is visible rather than assumed. */
function authPlaintextCount() {
  if (typeof loadUsers !== "function") return 0;
  try {
    return loadUsers().filter(function (u) { return typeof u.password === "string"; }).length;
  } catch (e) { return 0; }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    authHashPassword: authHashPassword,
    authSafeEqual: authSafeEqual,
    authMakeCredentials: authMakeCredentials,
    authVerifyUser: authVerifyUser
  };
}
