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
/*               ├─wrapped by──>  recovery-code key        (escape)  */
/*               └─wrapped by──>  master-password key      (escrow,  */
/*                                 opt-in; js/vault-admin-recovery)  */
/* Independent ways to reach the SAME data key. Changing or          */
/* resetting a passphrase re-wraps the DEK — it never re-encrypts    */
/* the records, so it is instant and cannot half-fail.               */
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
/* PBKDF2-HMAC-SHA-256 work factor for every key made FROM NOW ON.
   600,000 is the OWASP Password Storage Cheat Sheet figure for SHA-256
   (checked against the cheat sheet itself, 2026-10-27). The previous value,
   210,000, was annotated here as "OWASP-current for SHA-256"; it is close to
   OWASP's figure for SHA-512, not SHA-256.

   ── THE COUNT TRAVELS WITH EACH KEY ──
   Every wrapping, and every backup file, records the count it was made with,
   and is always opened with THAT count. Before this, derivation read this
   constant directly and ignored the stored `kdf.iters` — so raising it would
   have made every existing vault and every backup file unopenable with the
   correct passphrase. Older keys are re-wrapped at the new strength the next
   time they are opened successfully. */
var VAULT_PBKDF2_ITERS = 600000;
/* What every vault wrapping and backup file used before counts were tracked
   per wrapping. The fallback when a record names no count of its own. */
var VAULT_LEGACY_ITERS = 210000;
/* Bounds on a count read back from a file or the device. A backup file is
   untrusted input, and an absurd count would freeze the browser on open. */
var VAULT_ITERS_MIN = 100000;
var VAULT_ITERS_MAX = 5000000;
var VAULT_CHECK_TEXT = "entopic-vault-check";

/* The stores that hold patient-identifiable or account data. Anything
   listed here is ciphertext on disk once the vault is on. Deliberately
   NOT the knowledge base or UI preferences — encrypting those would cost
   startup time and protect nothing. */
var VAULT_PROTECTED = ["patients", "visits", "audit", "users", "visit_index"];

/* Per-visit record keys (js/visit-store.js writes entopic_visit_<id>). A
   PREFIX, because there is one key per visit and they cannot be listed in
   advance — the only pattern-decided protection in the vault, so it is written
   to FAIL CLOSED and `visit_index` is ALSO listed above, where a change to this
   prefix cannot silently unprotect it. Getting it wrong the other way writes a
   patient's full examination to disk in plaintext on a device whose owner was
   told it is encrypted; tests/local-vault.test.js asserts it rather than
   trusting it. */
var VAULT_PROTECTED_PREFIX = "visit_";
/* The pre-migration snapshot (js/storage-migrations.js) is a full copy of
   whichever stores a migration touches — patients and visits included — and
   was left out, so the first real migration on an encrypted device would have
   written them to disk in plaintext. */
var VAULT_PROTECTED_PREFIXES = [VAULT_PROTECTED_PREFIX, "premigration_"];

/* In-memory only. Cleared on lock; never written to disk in raw form. */
var _vaultDek = null;
var _vaultCache = null;      /* {storeKey: plaintextValue} while unlocked */
var _vaultDirty = {};        /* storeKey -> true, awaiting an encrypted write */
var _vaultFlushTimer = null;

function vaultHasCrypto() {
  return !!(typeof crypto !== "undefined" && crypto.subtle && crypto.getRandomValues);
}

function vaultIsProtected(storeKey) {
  if (VAULT_PROTECTED.indexOf(storeKey) >= 0) return true;
  /* Every per-visit record. See VAULT_PROTECTED_PREFIX above. */
  if (typeof storeKey !== "string") return false;
  for (var i = 0; i < VAULT_PROTECTED_PREFIXES.length; i++) {
    if (storeKey.indexOf(VAULT_PROTECTED_PREFIXES[i]) === 0) return true;
  }
  return false;
}

/* ── EVERY protected store actually on this device ──
   (Added 2026-08-08, after the per-visit storage split.)

   enable, disable and hydrate all used to walk VAULT_PROTECTED directly. That
   was correct while the protected set was four fixed keys. After the split it
   was not, and the consequence was measured in a browser rather than reasoned
   about:

     turning encryption ON left every entopic_visit_<id> record — the entire
     clinical content of every examination — sitting on disk IN PLAINTEXT,
     while the device reported itself encrypted. The records then became
     unreadable as well, because loadStore correctly routed them through a
     vault cache that hydrate had never filled.

   Confidentiality failure and availability failure from one static list.

   So the set is now ENUMERATED from what is actually stored. Fails safe in
   the direction that matters: a key nobody remembered to declare is still
   caught by vaultIsProtected, and therefore still encrypted. */
function vaultProtectedKeys() {
  var out = [], seen = Object.create(null);
  /* The declared ones first, in their declared order — patients and visits
     before the per-visit records, so a partial failure leaves the most
     recognisable stores done. */
  VAULT_PROTECTED.forEach(function (k) { if (!seen[k]) { seen[k] = true; out.push(k); } });
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var full = localStorage.key(i);
      if (!full || full.indexOf(STORE_PREFIX) !== 0) continue;
      var k2 = full.slice(STORE_PREFIX.length);
      /* Quarantined copies of damaged stores are deliberately left alone:
         they exist to be recovered by hand and must not be locked away
         behind the key of a vault that is being set up right now. */
      if (k2.indexOf("corrupt_") === 0) continue;
      if (!seen[k2] && vaultIsProtected(k2)) { seen[k2] = true; out.push(k2); }
    }
  } catch (e) { /* storage unavailable — the declared list is still returned */ }
  return out;
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
/* Unlocked = key AND decrypted records in memory. A key alone used to count,
   making every protected store read as empty and writable (vaultHydrate). */
function vaultUnlocked() { return !!_vaultDek && !!_vaultCache; }

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
function vaultCheckIters(n) {
  n = Number(n);
  if (!(Math.floor(n) === n && n >= VAULT_ITERS_MIN && n <= VAULT_ITERS_MAX)) {
    throw new Error("unsupported key-derivation setting (" + String(n) + " iterations)");
  }
  return n;
}

/* The count a given wrapping in `meta` was made with. `kdf.iters` is the
   count every wrapping used before per-wrapping counts existed. */
function vaultKdfIters(meta, which) {
  var kdf = (meta && meta.kdf) || {};
  var own = kdf[which + "_iters"];
  return own || kdf.iters || VAULT_LEGACY_ITERS;
}

/* iters defaults to the CURRENT strength — right for a key being made now,
   wrong for one being opened; callers opening a key pass its stored count. */
function vaultDeriveKek(secret, saltHex, iters) {
  var enc = new TextEncoder();
  var n;
  try { n = vaultCheckIters(iters === undefined ? VAULT_PBKDF2_ITERS : iters); }
  catch (e) { return Promise.reject(e); }
  return crypto.subtle
    .importKey("raw", enc.encode(String(secret)), "PBKDF2", false, ["deriveKey"])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: vaultFromHex(saltHex), iterations: n, hash: "SHA-256" },
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


/* Re-wrap one wrapping at the current strength, after it has just been
   opened with `secret`. Best-effort: a failure leaves the older (still
   working) wrapping in place and never fails the unlock. A fresh salt is
   used, and the meta is re-read immediately before saving. */
var VAULT_WRAP_FIELD = { pass: ["pass", "salt"], recovery: ["recovery", "recovery_salt"],
                         admin: ["admin", "admin_salt"] };
function vaultUpgradeWrap(which, secret, dek) {
  var meta = vaultMeta();
  if (!meta || !dek || vaultKdfIters(meta, which) >= VAULT_PBKDF2_ITERS) return Promise.resolve(false);
  var f = VAULT_WRAP_FIELD[which];
  var salt = vaultRandomHex(16);
  return crypto.subtle.exportKey("raw", dek).then(function (rawDek) {
    return vaultDeriveKek(secret, salt).then(function (kek) {
      return vaultWrapDek(new Uint8Array(rawDek), kek);
    });
  }).then(function (wrapped) {
    var m = vaultMeta();
    if (!m || !m.wrapped || !m.wrapped[f[0]]) return false;
    m.wrapped[f[0]] = wrapped;
    m.kdf[f[1]] = salt;
    m.kdf[which + "_iters"] = VAULT_PBKDF2_ITERS;
    vaultSaveMeta(m);
    return true;
  }).catch(function () { return false; });
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

/* Raw bytes (attachments, js/file-store.js): same key, no JSON round trip. */
function vaultIsBytesEnvelope(x) { return !!(x && x.__vaultbytes === VAULT_TAG && x.iv && x.ct); }
function vaultEncryptBytes(buf, key) {
  var k = key || _vaultDek, iv = new Uint8Array(12);
  if (!k) return Promise.reject(new Error("Vault is locked"));
  crypto.getRandomValues(iv);
  return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, k, buf)
    .then(function (ct) { return { __vaultbytes: VAULT_TAG, iv: iv, ct: ct }; });
}
function vaultDecryptBytes(env, key) {
  var k = key || _vaultDek;
  if (!k) return Promise.reject(new Error("Vault is locked"));
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: env.iv }, k, env.ct);
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

/* The key was right; something AFTER that failed. Kept apart from a wrong
   passphrase so the clinician is never told "wrong passphrase" for the right
   one (they would keep retrying, burn the throttle, and conclude the records
   are gone). */
function VaultOpenError(message) { this.name = "VaultOpenError"; this.message = message; }
VaultOpenError.prototype = Object.create(Error.prototype);

function _vaultVerifyAndAdopt(dek, meta) {
  /* Prove the key is right before adopting it: decrypt the check blob.
     Without this, a wrong-but-structurally-valid key would surface later
     as unreadable records instead of a clean "wrong passphrase". */
  return vaultDecryptValue(meta.check, dek).then(function (v) {
    if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
    return vaultHydrate(dek).catch(function (e) {
      throw new VaultOpenError("The passphrase was correct, but the records could not be loaded (" +
        ((e && e.message) || "unknown error") + "). Nothing was changed.");
    });
  }).then(function () {
    /* Re-wrap any secret still lying in the clear (e.g. stored before the
       vault was enabled). Security review S-1. js/vault-secrets.js. */
    return (typeof vaultRewrapSecrets === "function") ? vaultRewrapSecrets() : true;
  }).then(function () {   /* snapshots + attachments (js/vault-secrets.js) */
    return (typeof vaultSealSideStores === "function") ? vaultSealSideStores() : true;
  }).then(function () { return vaultRestoreSecretConsumers(); });
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

/* ── Unlock throttling (security review S-3) ────────────────────
   PBKDF2 at 210k iterations already makes each guess expensive, and an
   attacker holding the device can attack the stored ciphertext offline
   regardless — so this is NOT the primary defence and is not presented as
   one. What it does stop is the realistic opportunistic case: someone at
   the keyboard of an unattended locked terminal trying likely passphrases.
   In-memory only (a page reload clears it), because persisting it would
   let an attacker lock the clinic out of its own records by burning
   attempts — availability matters as much as confidentiality here. */
var _vaultFails = 0;
var _vaultLastFail = 0;
var VAULT_THROTTLE_AFTER = 5;

function vaultUnlockDelayMs(fails, nowMs, lastFailMs) {
  if (fails < VAULT_THROTTLE_AFTER) return 0;
  var wait = Math.min(2000 * Math.pow(2, Math.min(fails - VAULT_THROTTLE_AFTER, 8)), 5 * 60 * 1000);
  var remain = (lastFailMs + wait) - nowMs;
  return remain > 0 ? remain : 0;
}

function vaultThrottleCheck() {
  return vaultUnlockDelayMs(_vaultFails, Date.now(), _vaultLastFail);
}
function vaultThrottleNoteFailure() { _vaultFails++; _vaultLastFail = Date.now(); }
function vaultThrottleReset() { _vaultFails = 0; _vaultLastFail = 0; }

function vaultUnlock(passphrase) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  var wait = vaultThrottleCheck();
  if (wait > 0) {
    var secs = Math.ceil(wait / 1000);
    return Promise.reject(new Error("Too many attempts — wait " +
      (secs >= 60 ? Math.ceil(secs / 60) + " min" : secs + "s") + " before trying again."));
  }
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot open the vault (no Web Crypto)."));
  var opened = null;
  return vaultDeriveKek(passphrase, meta.kdf.salt, vaultKdfIters(meta, "pass"))
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) { opened = dek; return _vaultVerifyAndAdopt(dek, meta); })
    .then(function () { return vaultUpgradeWrap("pass", passphrase, opened); })
    .then(function () {
      vaultThrottleReset();
      if (typeof logAudit === "function") { try { logAudit("vault_unlocked", "Record vault opened on this device", {}); } catch (e) {} }
      return true;
    })
    .catch(function (e) {
      if (e && /Too many attempts/.test(e.message || "")) throw e;
      if (e instanceof VaultOpenError) throw e;     /* right passphrase — no throttle */
      vaultThrottleNoteFailure();
      throw new Error("That passphrase did not open the vault.");
    });
}

function vaultUnlockWithRecovery(code) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  var norm = vaultNormalizeRecoveryCode(code);
  var opened = null;
  return vaultDeriveKek(norm, meta.kdf.recovery_salt, vaultKdfIters(meta, "recovery"))
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.recovery, kek); })
    .then(function (dek) { opened = dek; return _vaultVerifyAndAdopt(dek, meta); })
    .then(function () { return vaultUpgradeWrap("recovery", norm, opened); })
    .then(function () {
      vaultThrottleReset();
      if (typeof logAudit === "function") { try { logAudit("vault_recovery_used", "Vault opened with the RECOVERY CODE — set a new passphrase", {}); } catch (e) {} }
      return true;
    })
    .catch(function (e) {
      if (e instanceof VaultOpenError) throw e;
      throw new Error("That recovery code did not open the vault.");
    });
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

/* Decrypt every protected store into memory, then adopt the key and the
   cache TOGETHER. Called once per unlock.

   ── TWO DEFECTS THIS CLOSES (full audit, 2026-10-27) ──

   1. ONE damaged record locked the clinic out. A single visit whose
      ciphertext was damaged (a write cut off by a crash or a full disk) made
      the whole decrypt chain reject, so the CORRECT passphrase was reported
      as "did not open the vault". Worse, the key had already been adopted
      before the records were read: the app then counted as unlocked with no
      records in memory, read every store as empty, and the next save
      encrypted that empty list over the real one. Measured: 2 patients ->
      one damaged visit -> unlock -> one save -> 1 patient.

   2. The damaged-store protection did not apply with the vault on. With the
      vault off, a store that cannot be read is quarantined and every write to
      it is refused (storage.js, storageNoteCorrupt). With the vault on, an
      unreadable store was simply left out of the cache, read back as EMPTY,
      and overwritten by the next save — the exact loss that protection was
      written to prevent, reintroduced for the clinics that chose encryption.

   Now each store is read on its own. A store that cannot be parsed, cannot
   be decrypted, or has the wrong shape is reported through the same
   storageNoteCorrupt path (quarantined copy, writes blocked, banner) and the
   rest of the records open normally. The key and the cache are adopted in
   one step, only after every store has been read — never one without the
   other. */
function vaultHydrate(dekArg) {
  var dek = dekArg || _vaultDek;
  if (!dek) return Promise.reject(new Error("Vault is locked"));
  var cache = Object.create(null);
  var damaged = [];
  var expectArray = (typeof STORE_EXPECTED_ARRAY !== "undefined") ? STORE_EXPECTED_ARRAY : [];
  function shapeOk(k, v) { return expectArray.indexOf(k) < 0 || Array.isArray(v); }
  var chain = Promise.resolve();
  vaultProtectedKeys().forEach(function (k) {
    chain = chain.then(function () {
      var raw = null;
      try { raw = localStorage.getItem(STORE_PREFIX + k); } catch (e) {}
      if (raw === null) return;
      var parsed;
      try { parsed = JSON.parse(raw); } catch (e) {
        damaged.push({ key: k, raw: raw, reason: "unreadable (" + ((e && e.message) || "parse error") + ")" });
        return;
      }
      return vaultDecryptValue(parsed, dek).then(function (v) {
        if (!shapeOk(k, v)) {
          damaged.push({ key: k, raw: raw, reason: "expected a list, found " + (v === null ? "null" : typeof v) });
          return;
        }
        cache[k] = v;
      }, function () {
        damaged.push({ key: k, raw: raw, reason: "the encrypted record is damaged and could not be decrypted" });
      });
    });
  });
  return chain.then(function () {
    _vaultDek = dek;
    _vaultCache = cache;
    /* Reported AFTER adoption, so the audit entry storageNoteCorrupt writes
       lands in the (now open) encrypted audit store. */
    damaged.forEach(function (d) {
      if (typeof storageNoteCorrupt === "function") storageNoteCorrupt(d.key, d.raw, d.reason);
    });
    return true;
  });
}

/* Synchronous read used by loadStore(). undefined = "not present". */
function vaultCacheGet(storeKey) {
  if (!_vaultCache) return undefined;
  return _vaultCache[storeKey];
}

/* Synchronous write used by saveStore(): memory now, disk shortly. */
function vaultCacheSet(storeKey, value) {
  /* Only ever called while unlocked (saveStore checks). Creating a cache here
     would fabricate an "unlocked" vault whose other stores read as empty. */
  if (!_vaultCache) return false;
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
        kdf: { iters: VAULT_PBKDF2_ITERS, pass_iters: VAULT_PBKDF2_ITERS, recovery_iters: VAULT_PBKDF2_ITERS,
               salt: saltHex, recovery_salt: recSaltHex, hash: "SHA-256" },
        wrapped: { pass: parts[0], recovery: parts[1] },
        check: parts[2],
        created: new Date().toISOString()
      };

      /* Encrypt each protected store, then READ IT BACK AND DECRYPT IT before
         moving on. A migration that writes ciphertext it cannot itself read
         would destroy a clinic's records; verifying each store is the whole
         difference between safe and catastrophic. */
      var chain = Promise.resolve();
      vaultProtectedKeys().forEach(function (k) {
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
      return vaultHydrate(dek).then(function () {
        return (typeof vaultRewrapSecrets === "function") ? vaultRewrapSecrets() : true;
      }).then(function () {
        return (typeof vaultSealSideStores === "function") ? vaultSealSideStores() : true;
      });
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
  return vaultDeriveKek(currentPass, meta.kdf.salt, vaultKdfIters(meta, "pass"))
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return crypto.subtle.exportKey("raw", dek).then(function (rawDek) {
        return vaultDeriveKek(newPass, newSalt).then(function (newKek) {
          return vaultWrapDek(new Uint8Array(rawDek), newKek);
        });
      });
    })
    .then(function (wrapped) {
      meta = vaultMeta();                       /* re-read: never save a stale copy */
      meta.kdf.salt = newSalt;
      meta.kdf.pass_iters = VAULT_PBKDF2_ITERS;
      meta.wrapped.pass = wrapped;
      /* Clears the flag an administrator reset set. This is the step that
         takes the admin's temporary passphrase back out of circulation. */
      var wasForced = !!meta.must_change;
      delete meta.must_change;
      vaultSaveMeta(meta);
      if (typeof logAudit === "function") {
        try { logAudit("vault_passphrase_changed",
          wasForced ? "Vault passphrase changed by the user after an administrator reset"
                    : "Vault passphrase changed", {}); } catch (e) {}
      }
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
  return vaultDeriveKek(passphrase, meta.kdf.salt, vaultKdfIters(meta, "pass"))
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return crypto.subtle.exportKey("raw", dek).then(function (rawDek) {
        return vaultDeriveKek(vaultNormalizeRecoveryCode(code), newSalt).then(function (rKek) {
          return vaultWrapDek(new Uint8Array(rawDek), rKek);
        });
      });
    })
    .then(function (wrapped) {
      meta = vaultMeta();                       /* re-read: never save a stale copy */
      meta.kdf.recovery_salt = newSalt;
      meta.kdf.recovery_iters = VAULT_PBKDF2_ITERS;
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
  /* Which stores were already written back in the clear when something
     failed. A failure AFTER the key was proven used to be reported as
     "the passphrase was not correct … nothing changed" — wrong on both
     counts, and it sent the admin hunting for a passphrase problem. */
  var keyOk = false, done = [];
  return vaultDeriveKek(passphrase, meta.kdf.salt, vaultKdfIters(meta, "pass"))
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      return vaultDecryptValue(meta.check, dek).then(function (v) {
        if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
        keyOk = true;
        return dek;
      });
    })
    .then(function (dek) {
      var chain = Promise.resolve();
      vaultProtectedKeys().forEach(function (k) {
        chain = chain.then(function () {
          var raw = null;
          try { raw = localStorage.getItem(STORE_PREFIX + k); } catch (e) {}
          if (raw === null) return;
          var parsed;
          try { parsed = JSON.parse(raw); } catch (e) { return; }
          if (!vaultIsEnvelope(parsed)) return;
          return vaultDecryptValue(parsed, dek).catch(function () {
            /* A damaged record cannot be decrypted. Turning the vault off
               would throw away the only key that could ever read it, so stop
               here with encryption still on. */
            throw new Error("the '" + k + "' record is damaged and could not be decrypted");
          }).then(function (plain) {
            done.push(k);
            localStorage.setItem(STORE_PREFIX + k, JSON.stringify(plain));
            if (typeof mirrorStore === "function") mirrorStore(k, plain);
          });
        });
      });
      /* The wrapped SECRETS too (AI key, cloud sign-in, cloud PHI key). They
         are wrapped with the very key this step throws away; left wrapped,
         they became unreadable forever the moment the vault was turned off —
         the clinic silently lost its cloud sign-in and its cloud encryption
         key. "Turning it off is not a one-way door" has to include them. */
      /* Snapshots and attachments are sealed with this same key. */
      chain = chain.then(function () {
        return (typeof vaultUnsealSideStores === "function") ? vaultUnsealSideStores(dek) : 0;
      });
      var managed = (typeof VAULT_MANAGED_SECRETS !== "undefined") ? VAULT_MANAGED_SECRETS : [];
      managed.forEach(function (sk) {
        chain = chain.then(function () {
          var raw = "";
          try { raw = localStorage.getItem(sk) || ""; } catch (e) {}
          if (!raw || raw.charAt(0) !== "{") return;
          var envS;
          try { envS = JSON.parse(raw); } catch (e) { return; }
          if (!vaultIsEnvelope(envS)) return;
          return vaultDecryptValue(envS, dek).then(function (plain) {
            localStorage.setItem(sk, String(plain == null ? "" : plain));
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
      if (keyOk) {
        throw new Error("Encryption is still ON — " + ((e && e.message) || "an error occurred") + ". " +
          (done.length ? done.length + " record store(s) had already been written back in the clear; " +
                         "they remain readable and will be re-encrypted on the next save. "
                       : "Nothing was changed. ") +
          "No records were lost.");
      }
      throw new Error("That passphrase was not correct — encryption is still on and nothing changed.");
    });
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
    vaultIsEnvelope: vaultIsEnvelope, vaultIsBytesEnvelope: vaultIsBytesEnvelope,
    vaultEncryptBytes: vaultEncryptBytes, vaultDecryptBytes: vaultDecryptBytes,
    vaultUnlockDelayMs: vaultUnlockDelayMs, vaultThrottleCheck: vaultThrottleCheck,
    vaultThrottleNoteFailure: vaultThrottleNoteFailure, vaultThrottleReset: vaultThrottleReset,
    VAULT_THROTTLE_AFTER: VAULT_THROTTLE_AFTER,
    VAULT_PBKDF2_ITERS: VAULT_PBKDF2_ITERS, VAULT_LEGACY_ITERS: VAULT_LEGACY_ITERS,
    vaultKdfIters: vaultKdfIters, vaultUpgradeWrap: vaultUpgradeWrap,
    vaultHydrate: vaultHydrate, vaultFlush: vaultFlush,
    vaultCacheGet: vaultCacheGet, vaultCacheSet: vaultCacheSet
  };
}
