/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — LOCAL RECORD VAULT (encryption at rest, on the device) */
/*                                                                  */
/* Closes production-readiness blocker B-4: patient records lived in */
/* localStorage in the clear, so a stolen laptop — or a copied       */
/* browser profile — was a full records breach.                      */
/*                                                                  */
/* ── WHY IT IS BUILT THIS WAY ─────────────────────────────────────  */
/* The whole app reads records SYNCHRONOUSLY (loadPatients() returns */
/* an array, right now, in hundreds of places). Web Crypto is async  */
/* only. Rewriting every call site to async would touch the entire   */
/* codebase and risk the clinical path — the opposite of a safe fix. */
/*                                                                  */
/* So: decrypt ONCE on unlock into an in-memory cache. Reads stay     */
/* synchronous and untouched. Writes update the cache synchronously   */
/* (so the next read is instantly correct) and encrypt to disk        */
/* asynchronously, flushed before the page can close.                */
/*                                                                  */
/* ── KEY DESIGN: A FORGOTTEN PASSPHRASE MUST NOT DESTROY RECORDS ──  */
/* This is the part that matters most clinically. Encrypting patient */
/* records badly is WORSE than not encrypting them — a locked-out    */
/* clinic loses its records permanently. So the layout is:           */
/*                                                                  */
/*   random DEK  ──wrapped by──>  passphrase-derived key   (daily)   */
/*               └─wrapped by──>  recovery-code key        (escape)  */
/*                                                                  */
/* Two independent ways to reach the same data key. The recovery     */
/* code is high-entropy, generated once, shown once, and MUST be     */
/* written down and stored off the device. Changing the passphrase   */
/* re-wraps the DEK — it never re-encrypts the records, so it is     */
/* instant and cannot half-fail.                                     */
/*                                                                  */
/* ── WHAT THIS DOES AND DOES NOT PROTECT ──────────────────────────  */
/* Protects: a powered-off or signed-out device, a stolen disk, a    */
/* copied browser profile, a backup of localStorage.                 */
/* Does NOT protect: an unlocked device with the vault open (the     */
/* records are in memory by design — that is what "in use" means),   */
/* or a device with malware. Full-disk encryption is still worth     */
/* having; this is defence in depth, not a replacement.              */
/*                                                                  */
/* Opt-in and REVERSIBLE: an admin turns it on, and can turn it off  */
/* again (records are written back in the clear) with the passphrase.*/
/* Nothing is a one-way door.                                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var VAULT_META_KEY   = "entopic_vault_meta";
var VAULT_TAG        = "entopic-vault-aesgcm256-v1";
var VAULT_PBKDF2_ITERS = 210000;   /* OWASP-current for PBKDF2-SHA-256, 2026 */
var VAULT_CHECK_TEXT = "entopic-vault-check";

/* The stores that hold patient-identifiable or account data. Anything
   listed here is ciphertext on disk once the vault is on. Deliberately
   NOT the knowledge base or UI preferences — encrypting those would cost
   startup time and protect nothing. */
var VAULT_PROTECTED = ["patients", "visits", "audit", "users"];

/* In-memory only. Cleared on lock; never written to disk in raw form. */
var _vaultDek = null;
var _vaultCache = null;      /* {storeKey: plaintextValue} while unlocked */
var _vaultDirty = {};        /* storeKey -> true, awaiting an encrypted write */
var _vaultFlushTimer = null;

function vaultHasCrypto() {
  return !!(typeof crypto !== "undefined" && crypto.subtle && crypto.getRandomValues);
}

function vaultIsProtected(storeKey) {
  return VAULT_PROTECTED.indexOf(storeKey) >= 0;
}

/* ── byte helpers (same conventions as cloud-crypto.js) ──────────── */
function vaultToHex(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
  return out;
}
function vaultFromHex(hex) {
  hex = String(hex || "");
  var a = new Uint8Array(Math.floor(hex.length / 2));
  for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function vaultB64(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return (typeof btoa === "function") ? btoa(s) : Buffer.from(bytes).toString("base64");
}
function vaultUnB64(b64) {
  var s = (typeof atob === "function") ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  var a = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

function vaultMeta() {
  try { return JSON.parse(localStorage.getItem(VAULT_META_KEY) || "null"); }
  catch (e) { return null; }
}
/* Persist the key wrapper — and mirror it. The mirror copy is what makes the
   records survivable if localStorage is ever cleared: without the wrapper the
   mirrored ciphertext could never be decrypted again, by anyone, ever. Only
   WRAPPED key material is written, so this adds no exposure. */
function vaultSaveMeta(meta) {
  var json = JSON.stringify(meta);
  localStorage.setItem(VAULT_META_KEY, json);
  if (typeof mirrorPutRaw === "function") {
    try { mirrorPutRaw("vault_meta", json); } catch (e) {}
  }
}

function vaultEnabled() { return !!vaultMeta(); }
function vaultUnlocked() { return !!_vaultDek; }

function vaultState() {
  if (!vaultHasCrypto()) return "unavailable";
  if (!vaultEnabled()) return "off";
  return _vaultDek ? "unlocked" : "locked";
}


/* ── Recovery code ───────────────────────────────────────────────
   25 characters from a 32-symbol alphabet ≈ 125 bits — far beyond
   guessing. Ambiguous glyphs (0/O, 1/I/L) are excluded because a human
   has to copy this onto paper and read it back under pressure. */
var VAULT_RC_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function vaultGenerateRecoveryCode() {
  if (!vaultHasCrypto()) throw new Error("Secure random unavailable");
  var bytes = new Uint8Array(25);
  crypto.getRandomValues(bytes);
  var out = "";
  for (var i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 5 === 0) out += "-";
    out += VAULT_RC_ALPHABET.charAt(bytes[i] % VAULT_RC_ALPHABET.length);
  }
  return out;   /* e.g. K3M9P-QR7TX-... */
}

/* Accept the code however the human typed it back: spaces, dashes,
   lower case, or none of the above. */
function vaultNormalizeRecoveryCode(code) {
  return String(code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}


/* ── Key derivation + DEK wrapping ───────────────────────────────── */
function vaultDeriveKek(secret, saltHex) {
  var enc = new TextEncoder();
  return crypto.subtle
    .importKey("raw", enc.encode(String(secret)), "PBKDF2", false, ["deriveKey"])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: vaultFromHex(saltHex), iterations: VAULT_PBKDF2_ITERS, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    });
}

function vaultRandomHex(n) {
  var b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return vaultToHex(b);
}

/* Wrap the raw DEK bytes under a KEK. */
function vaultWrapDek(rawDek, kek) {
  var iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, kek, rawDek).then(function (ct) {
    return { iv: vaultToHex(iv), ct: vaultB64(new Uint8Array(ct)) };
  });
}

function vaultUnwrapDek(wrapped, kek) {
  return crypto.subtle
    .decrypt({ name: "AES-GCM", iv: vaultFromHex(wrapped.iv) }, kek, vaultUnB64(wrapped.ct))
    .then(function (raw) {
      return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, true, ["encrypt", "decrypt"]);
    });
}


/* ── Value encryption (one store's worth of JSON) ────────────────── */
function vaultIsEnvelope(x) {
  return !!(x && typeof x === "object" && x.__vault === VAULT_TAG && x.iv && x.ct);
}

function vaultEncryptValue(obj, key) {
  var k = key || _vaultDek;
  if (!k) return Promise.reject(new Error("Vault is locked"));
  var iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  var pt = new TextEncoder().encode(JSON.stringify(obj));
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, pt).then(function (ct) {
    return { __vault: VAULT_TAG, iv: vaultToHex(iv), ct: vaultB64(new Uint8Array(ct)) };
  });
}

function vaultDecryptValue(env, key) {
  if (!vaultIsEnvelope(env)) return Promise.resolve(env);   /* not encrypted yet */
  var k = key || _vaultDek;
  if (!k) return Promise.reject(new Error("Vault is locked"));
  return crypto.subtle
    .decrypt({ name: "AES-GCM", iv: vaultFromHex(env.iv) }, k, vaultUnB64(env.ct))
    .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); });
}


/* ── Unlock ──────────────────────────────────────────────────────── */
function _vaultVerifyAndAdopt(dek, meta) {
  /* Prove the key is right before adopting it: decrypt the check blob.
     Without this, a wrong-but-structurally-valid key would surface later
     as unreadable records instead of a clean "wrong passphrase". */
  return vaultDecryptValue(meta.check, dek).then(function (v) {
    if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
    _vaultDek = dek;
    /* Re-wrap any secret still lying in the clear (e.g. stored before the
       vault was enabled). Security review S-1. */
    return vaultHydrate()
      .then(function () { return vaultRewrapSecrets(); })
      .then(function () { return vaultRestoreSecretConsumers(); });
  });
}

/* Hand the now-readable secrets back to the modules that need them. Wired here
   rather than in the unlock UI so EVERY unlock path restores them, not just the
   one the founder happens to click (security review S-1). */
function vaultRestoreSecretConsumers() {
  if (typeof cloudRestoreSession === "function") { try { cloudRestoreSession(); } catch (e) {} }
  if (typeof loadApiKeyAsync === "function") {
    try {
      return loadApiKeyAsync().then(function (k) {
        if (k && typeof window !== "undefined" && typeof window.API_KEY !== "undefined") window.API_KEY = k;
        return true;
      }).catch(function () { return true; });
    } catch (e) {}
  }
  return Promise.resolve(true);
}

function vaultUnlock(passphrase) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot open the vault (no Web Crypto)."));
  return vaultDeriveKek(passphrase, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) { return _vaultVerifyAndAdopt(dek, meta); })
    .then(function () {
      if (typeof logAudit === "function") { try { logAudit("vault_unlocked", "Record vault opened on this device", {}); } catch (e) {} }
      return true;
    })
    .catch(function () { throw new Error("That passphrase did not open the vault."); });
}

function vaultUnlockWithRecovery(code) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  var norm = vaultNormalizeRecoveryCode(code);
  return vaultDeriveKek(norm, meta.kdf.recovery_salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.recovery, kek); })
    .then(function (dek) { return _vaultVerifyAndAdopt(dek, meta); })
    .then(function () {
      if (typeof logAudit === "function") { try { logAudit("vault_recovery_used", "Vault opened with the RECOVERY CODE — set a new passphrase", {}); } catch (e) {} }
      return true;
    })
    .catch(function () { throw new Error("That recovery code did not open the vault."); });
}

/* Lock the vault. Any pending write is flushed first and, because vaultFlush
   captured its own key + cache references, that flush still completes safely
   after the globals below are cleared. Returns a promise for callers that want
   to know the disk is settled; safe to ignore. */
function vaultLock() {
  var pending = vaultFlush();
  _vaultDek = null;
  _vaultCache = null;
  _vaultDirty = {};
  /* Locking must also drop the in-memory copies of wrapped secrets, or the
     cloud token and API key would survive the lock in RAM (security S-1). */
  if (typeof clearApiKeyCache === "function") { try { clearApiKeyCache(); } catch (e) {} }
  if (typeof cloudForgetSessionInMemory === "function") { try { cloudForgetSessionInMemory(); } catch (e) {} }
  if (_vaultFlushTimer) { clearTimeout(_vaultFlushTimer); _vaultFlushTimer = null; }
  return pending;
}


/* ── Hydrate / flush (the sync-read bridge) ──────────────────────── */

/* Decrypt every protected store into memory. Called once per unlock. */
function vaultHydrate() {
  if (!_vaultDek) return Promise.reject(new Error("Vault is locked"));
  var cache = {};
  var chain = Promise.resolve();
  VAULT_PROTECTED.forEach(function (k) {
    chain = chain.then(function () {
      var raw = null;
      try { raw = localStorage.getItem(STORE_PREFIX + k); } catch (e) {}
      if (raw === null) { cache[k] = undefined; return; }
      var parsed;
      try { parsed = JSON.parse(raw); } catch (e) { cache[k] = undefined; return; }
      return vaultDecryptValue(parsed).then(function (v) { cache[k] = v; });
    });
  });
  return chain.then(function () { _vaultCache = cache; return true; });
}

/* Synchronous read used by loadStore(). undefined = "not present". */
function vaultCacheGet(storeKey) {
  if (!_vaultCache) return undefined;
  return _vaultCache[storeKey];
}

/* Synchronous write used by saveStore(): memory now, disk shortly. */
function vaultCacheSet(storeKey, value) {
  if (!_vaultCache) _vaultCache = {};
  _vaultCache[storeKey] = value;
  _vaultDirty[storeKey] = true;
  if (_vaultFlushTimer) return;
  _vaultFlushTimer = setTimeout(function () { _vaultFlushTimer = null; vaultFlush(); }, 250);
}

/* Write every dirty store out as ciphertext. Returns a promise, but is
   also safe to call in a page-teardown handler. */
function vaultFlush() {
  /* Capture the key and the cache SYNCHRONOUSLY. The chain below resolves
     asynchronously, and vaultLock() may clear the globals in between — if the
     callbacks read the globals they would throw and, worse, silently drop the
     pending write. Holding local references means a flush that has started
     always finishes with the data and key it started with. */
  var dek = _vaultDek;
  var cache = _vaultCache;
  if (!dek || !cache) return Promise.resolve(false);
  var keys = Object.keys(_vaultDirty);
  if (!keys.length) return Promise.resolve(true);
  _vaultDirty = {};
  var chain = Promise.resolve();
  keys.forEach(function (k) {
    chain = chain.then(function () {
      var v = cache[k];
      if (v === undefined) return;
      return vaultEncryptValue(v, dek).then(function (env) {
        try {
          localStorage.setItem(STORE_PREFIX + k, JSON.stringify(env));
          /* The IndexedDB safety mirror must hold CIPHERTEXT too — mirroring
             plaintext would quietly undo the whole point of the vault. */
          if (typeof mirrorStore === "function") mirrorStore(k, env);
        } catch (e) {
          _vaultDirty[k] = true;   /* keep it pending rather than lose it */
        }
      });
    });
  });
  return chain.then(function () { return true; });
}


/* ── Enable (first-time migration, plaintext → ciphertext) ───────── */
function vaultEnable(passphrase) {
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot encrypt (no Web Crypto)."));
  if (vaultEnabled()) return Promise.reject(new Error("The vault is already set up on this device."));
  if (!passphrase || String(passphrase).length < 10) {
    return Promise.reject(new Error("Choose a passphrase of at least 10 characters."));
  }

  var recoveryCode = vaultGenerateRecoveryCode();
  var saltHex = vaultRandomHex(16);
  var recSaltHex = vaultRandomHex(16);
  var rawDek = new Uint8Array(32);
  crypto.getRandomValues(rawDek);

  var dek = null, meta = null;
  var snapshot = {};   /* plaintext held so a failed migration can roll back */

  return crypto.subtle.importKey("raw", rawDek, { name: "AES-GCM" }, true, ["encrypt", "decrypt"])
    .then(function (k) {
      dek = k;
      return Promise.all([
        vaultDeriveKek(passphrase, saltHex),
        vaultDeriveKek(vaultNormalizeRecoveryCode(recoveryCode), recSaltHex)
      ]);
    })
    .then(function (keks) {
      return Promise.all([
        vaultWrapDek(rawDek, keks[0]),
        vaultWrapDek(rawDek, keks[1]),
        vaultEncryptValue(VAULT_CHECK_TEXT, dek)
      ]);
    })
    .then(function (parts) {
      meta = {
        v: 1, tag: VAULT_TAG,
        kdf: { iters: VAULT_PBKDF2_ITERS, salt: saltHex, recovery_salt: recSaltHex, hash: "SHA-256" },
        wrapped: { pass: parts[0], recovery: parts[1] },
        check: parts[2],
        created: new Date().toISOString()
      };

      /* Encrypt each protected store, then READ IT BACK AND DECRYPT IT before
         moving on. A migration that writes ciphertext it cannot itself read
         would destroy a clinic's records; verifying each store is the whole
         difference between safe and catastrophic. */
      var chain = Promise.resolve();
      VAULT_PROTECTED.forEach(function (k) {
        chain = chain.then(function () {
          var raw = null;
          try { raw = localStorage.getItem(STORE_PREFIX + k); } catch (e) {}
          if (raw === null) return;
          var plain;
          try { plain = JSON.parse(raw); } catch (e) { return; }
          if (vaultIsEnvelope(plain)) return;      /* already encrypted */
          snapshot[k] = raw;
          return vaultEncryptValue(plain, dek).then(function (env) {
            localStorage.setItem(STORE_PREFIX + k, JSON.stringify(env));
            var back = JSON.parse(localStorage.getItem(STORE_PREFIX + k));
            return vaultDecryptValue(back, dek).then(function (rt) {
              if (JSON.stringify(rt) !== JSON.stringify(plain)) {
                throw new Error("verification failed for " + k);
              }
              if (typeof mirrorStore === "function") mirrorStore(k, env);
            });
          });
        });
      });
      return chain;
    })
    .then(function () {
      vaultSaveMeta(meta);
      _vaultDek = dek;
      return vaultHydrate().then(function () { return vaultRewrapSecrets(); });
    })
    .then(function () {
      if (typeof logAudit === "function") {
        try { logAudit("vault_enabled", "Local record encryption turned ON for this device", {}); } catch (e) {}
      }
      return { recoveryCode: recoveryCode };
    })
    .catch(function (err) {
      /* Roll every store back to the plaintext we captured, so a failed
         migration leaves the clinic exactly where it started. */
      Object.keys(snapshot).forEach(function (k) {
        try { localStorage.setItem(STORE_PREFIX + k, snapshot[k]); } catch (e) {}
      });
      try { localStorage.removeItem(VAULT_META_KEY); } catch (e) {}
      _vaultDek = null; _vaultCache = null; _vaultDirty = {};
      throw new Error("Encryption was NOT turned on and your records are unchanged. (" +
        ((err && err.message) || "unknown error") + ")");
    });
}


/* ── Change passphrase (re-wrap only — records are never touched) ── */
function vaultChangePassphrase(currentPass, newPass) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  if (!newPass || String(newPass).length < 10) {
    return Promise.reject(new Error("Choose a passphrase of at least 10 characters."));
  }
  var newSalt = vaultRandomHex(16);
  return vaultDeriveKek(currentPass, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return crypto.subtle.exportKey("raw", dek).then(function (rawDek) {
        return vaultDeriveKek(newPass, newSalt).then(function (newKek) {
          return vaultWrapDek(new Uint8Array(rawDek), newKek);
        });
      });
    })
    .then(function (wrapped) {
      meta.kdf.salt = newSalt;
      meta.wrapped.pass = wrapped;
      vaultSaveMeta(meta);
      if (typeof logAudit === "function") { try { logAudit("vault_passphrase_changed", "Vault passphrase changed", {}); } catch (e) {} }
      return true;
    })
    .catch(function (e) {
      if (e && /at least 10/.test(e.message)) throw e;
      throw new Error("The current passphrase was not correct — nothing was changed.");
    });
}

/* Re-issue a recovery code (e.g. the paper copy was lost). Needs the
   passphrase, and invalidates the old code. */
function vaultRegenerateRecoveryCode(passphrase) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  var code = vaultGenerateRecoveryCode();
  var newSalt = vaultRandomHex(16);
  return vaultDeriveKek(passphrase, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return crypto.subtle.exportKey("raw", dek).then(function (rawDek) {
        return vaultDeriveKek(vaultNormalizeRecoveryCode(code), newSalt).then(function (rKek) {
          return vaultWrapDek(new Uint8Array(rawDek), rKek);
        });
      });
    })
    .then(function (wrapped) {
      meta.kdf.recovery_salt = newSalt;
      meta.wrapped.recovery = wrapped;
      vaultSaveMeta(meta);
      if (typeof logAudit === "function") { try { logAudit("vault_recovery_reissued", "A new vault recovery code was issued (the old one no longer works)", {}); } catch (e) {} }
      return { recoveryCode: code };
    })
    .catch(function () { throw new Error("That passphrase was not correct — the recovery code is unchanged."); });
}


/* ── Disable (decrypt back to plaintext) ─────────────────────────── */
function vaultDisable(passphrase) {
  var meta = vaultMeta();
  if (!meta) return Promise.resolve(true);
  return vaultDeriveKek(passphrase, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return vaultDecryptValue(meta.check, dek).then(function (v) {
        if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
        return dek;
      });
    })
    .then(function (dek) {
      var chain = Promise.resolve();
      VAULT_PROTECTED.forEach(function (k) {
        chain = chain.then(function () {
          var raw = null;
          try { raw = localStorage.getItem(STORE_PREFIX + k); } catch (e) {}
          if (raw === null) return;
          var parsed;
          try { parsed = JSON.parse(raw); } catch (e) { return; }
          if (!vaultIsEnvelope(parsed)) return;
          return vaultDecryptValue(parsed, dek).then(function (plain) {
            localStorage.setItem(STORE_PREFIX + k, JSON.stringify(plain));
            if (typeof mirrorStore === "function") mirrorStore(k, plain);
          });
        });
      });
      return chain;
    })
    .then(function () {
      try { localStorage.removeItem(VAULT_META_KEY); } catch (e) {}
      _vaultDek = null; _vaultCache = null; _vaultDirty = {};
      if (typeof logAudit === "function") {
        try { logAudit("vault_disabled", "Local record encryption turned OFF — records are stored in the clear again", {}); } catch (e) {}
      }
      return true;
    })
    .catch(function (e) {
      if (e && /not correct/.test(e.message || "")) throw e;
      throw new Error("That passphrase was not correct — encryption is still on and nothing changed.");
    });
}


/* ═══════════════════════════════════════════════════════════════ */
/* PROTECTED SECRETS (security review S-1)                         */
/*                                                                  */
/* Encrypting the RECORDS is not enough. A device also holds keys   */
/* that open the records held elsewhere:                            */
/*                                                                  */
/*   • the Supabase session — an access token AND a long-lived      */
/*     refresh token, which together let anyone holding them sign   */
/*     in as that clinician and pull the whole clinic's data from   */
/*     the SERVER, no local decryption required;                    */
/*   • the Claude API key — a billable credential.                  */
/*                                                                  */
/* Both sat in localStorage in the clear, so a stolen laptop with   */
/* the vault ON still gave up the cloud copy. That made the vault's */
/* promise partly false, which is worse than an honest gap.         */
/*                                                                  */
/* These helpers wrap any small secret with the vault key when the  */
/* vault is open, fall back to plain storage when it is off (the    */
/* previous behaviour, so nothing changes for an install that has   */
/* not enabled encryption), and refuse to hand anything back while  */
/* the vault is LOCKED — a locked device must not be able to reach  */
/* the cloud on the thief's behalf.                                 */
/* ═══════════════════════════════════════════════════════════════ */

function vaultSecretUsable() {
  return vaultEnabled() && vaultUnlocked();
}

/* Store a secret string. Returns a promise; wrapped when the vault is open. */
function vaultSecretSet(storageKey, value) {
  if (value === null || value === undefined || value === "") {
    try { localStorage.removeItem(storageKey); } catch (e) {}
    return Promise.resolve(true);
  }
  var str = String(value);
  if (!vaultSecretUsable()) {
    try { localStorage.setItem(storageKey, str); } catch (e) {}
    return Promise.resolve(true);
  }
  return vaultEncryptValue(str).then(function (env) {
    try { localStorage.setItem(storageKey, JSON.stringify(env)); } catch (e) {}
    return true;
  }).catch(function () {
    /* Never silently drop a secret we were asked to keep. */
    try { localStorage.setItem(storageKey, str); } catch (e) {}
    return true;
  });
}

/* Read a secret back, handling both shapes. Resolves "" when the value is
   wrapped but the vault is locked — the caller must treat that as
   "unavailable", never as "absent, so create a new one". */
function vaultSecretGet(storageKey) {
  var raw = "";
  try { raw = localStorage.getItem(storageKey) || ""; } catch (e) {}
  if (!raw) return Promise.resolve("");
  if (!vaultIsWrappedSecret(raw)) return Promise.resolve(raw);      /* plain (vault off / legacy) */
  if (!vaultSecretUsable()) return Promise.resolve("");             /* locked → withheld */
  var env;
  try { env = JSON.parse(raw); } catch (e) { return Promise.resolve(""); }
  return vaultDecryptValue(env).then(function (v) { return String(v == null ? "" : v); })
                               .catch(function () { return ""; });
}

/* Is the stored blob one of our envelopes rather than a raw secret? */
function vaultIsWrappedSecret(raw) {
  if (!raw || raw.charAt(0) !== "{") return false;
  try { return vaultIsEnvelope(JSON.parse(raw)); } catch (e) { return false; }
}

/* Is a secret present at all (wrapped or not)? Distinguishes "nothing stored"
   from "stored but currently locked", which callers need to tell apart. */
function vaultSecretPresent(storageKey) {
  var raw = "";
  try { raw = localStorage.getItem(storageKey) || ""; } catch (e) {}
  return !!raw;
}
function vaultSecretAvailable(storageKey) {
  var raw = "";
  try { raw = localStorage.getItem(storageKey) || ""; } catch (e) {}
  if (!raw) return false;
  if (!vaultIsWrappedSecret(raw)) return true;
  return vaultSecretUsable();
}

/* Re-wrap every plaintext secret the moment the vault becomes available.
   Called after a successful unlock and after enabling the vault, so secrets
   stored before encryption was turned on do not stay in the clear. */
var VAULT_MANAGED_SECRETS = ["entopic_cloud_session", "entopic_apikey"];

function vaultRewrapSecrets() {
  if (!vaultSecretUsable()) return Promise.resolve(false);
  var chain = Promise.resolve();
  VAULT_MANAGED_SECRETS.forEach(function (k) {
    chain = chain.then(function () {
      var raw = "";
      try { raw = localStorage.getItem(k) || ""; } catch (e) {}
      if (!raw || vaultIsWrappedSecret(raw)) return;      /* absent or already wrapped */
      return vaultSecretSet(k, raw);
    });
  });
  return chain.then(function () { return true; });
}


/* ═══════════════════════════════════════════════════════════════ */
/* ENCRYPTED BACKUP FILES (audit H-4)                              */
/*                                                                  */
/* Records are encrypted on the device, but the exported backup was */
/* plaintext JSON holding every name, DOB and MRN — so the weekly   */
/* backup routine was quietly the weakest link. A backup file       */
/* travels (USB stick, Downloads folder, email), which is exactly   */
/* where it needs protection most.                                  */
/*                                                                  */
/* These files are SELF-CONTAINED: the salt travels with the file   */
/* and the key comes from a passphrase, not from this device's      */
/* vault. That matters for disaster recovery — a backup must be     */
/* restorable onto a NEW machine that has no vault at all.          */
/* ═══════════════════════════════════════════════════════════════ */
var BACKUP_TAG = "entopic-backup-aesgcm256-v1";

function backupIsEncrypted(x) {
  return !!(x && typeof x === "object" && x.__backup === BACKUP_TAG && x.iv && x.ct && x.kdf);
}

function backupEncrypt(dataObj, passphrase) {
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot encrypt (no Web Crypto)."));
  if (!passphrase || String(passphrase).length < 10) {
    return Promise.reject(new Error("Choose a backup passphrase of at least 10 characters."));
  }
  var salt = vaultRandomHex(16);
  return vaultDeriveKek(passphrase, salt).then(function (key) {
    var iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    var pt = new TextEncoder().encode(JSON.stringify(dataObj));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, pt).then(function (ct) {
      return {
        __backup: BACKUP_TAG,
        exported: new Date().toISOString(),
        note: "Entopic encrypted backup. Restore it from Admin → Restore from backup; you will need the backup passphrase.",
        kdf: { alg: "PBKDF2-SHA-256", iters: VAULT_PBKDF2_ITERS, salt: salt },
        iv: vaultToHex(iv),
        ct: vaultB64(new Uint8Array(ct))
      };
    });
  });
}

function backupDecrypt(envelope, passphrase) {
  if (!backupIsEncrypted(envelope)) return Promise.resolve(envelope);
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot decrypt (no Web Crypto)."));
  return vaultDeriveKek(passphrase, envelope.kdf.salt)
    .then(function (key) {
      return crypto.subtle.decrypt(
        { name: "AES-GCM", iv: vaultFromHex(envelope.iv) }, key, vaultUnB64(envelope.ct));
    })
    .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); })
    .catch(function () { throw new Error("That passphrase did not open this backup file."); });
}


/* ── Page teardown: never let a pending write die with the tab ───── */
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeunload", function () { try { vaultFlush(); } catch (e) {} });
  if (typeof document !== "undefined" && document.addEventListener) {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { try { vaultFlush(); } catch (e) {} }
    });
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VAULT_PROTECTED: VAULT_PROTECTED,
    vaultHasCrypto: vaultHasCrypto, vaultIsProtected: vaultIsProtected,
    vaultState: vaultState, vaultEnabled: vaultEnabled, vaultUnlocked: vaultUnlocked,
    vaultGenerateRecoveryCode: vaultGenerateRecoveryCode,
    vaultNormalizeRecoveryCode: vaultNormalizeRecoveryCode,
    vaultEnable: vaultEnable, vaultUnlock: vaultUnlock,
    vaultUnlockWithRecovery: vaultUnlockWithRecovery, vaultLock: vaultLock,
    vaultChangePassphrase: vaultChangePassphrase,
    vaultRegenerateRecoveryCode: vaultRegenerateRecoveryCode,
    vaultDisable: vaultDisable,
    vaultEncryptValue: vaultEncryptValue, vaultDecryptValue: vaultDecryptValue,
    vaultIsEnvelope: vaultIsEnvelope,
    backupEncrypt: backupEncrypt, backupDecrypt: backupDecrypt,
    backupIsEncrypted: backupIsEncrypted,
    vaultSecretSet: vaultSecretSet, vaultSecretGet: vaultSecretGet,
    vaultSecretPresent: vaultSecretPresent, vaultSecretAvailable: vaultSecretAvailable,
    vaultIsWrappedSecret: vaultIsWrappedSecret, vaultRewrapSecrets: vaultRewrapSecrets,
    VAULT_MANAGED_SECRETS: VAULT_MANAGED_SECRETS,
    vaultHydrate: vaultHydrate, vaultFlush: vaultFlush,
    vaultCacheGet: vaultCacheGet, vaultCacheSet: vaultCacheSet
  };
}
