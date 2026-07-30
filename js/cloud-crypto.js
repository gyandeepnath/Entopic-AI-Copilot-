/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLOUD PHI ENCRYPTION (client-side, zero-knowledge)     */
/*                                                                  */
/* THE GUARDRAIL THIS ENFORCES (CLAUDE.md, non-negotiable):         */
/*   "Never send PII to any third-party service without explicit    */
/*    consent and de-identification."                               */
/*                                                                  */
/* Before this file, cloud sync pushed the WHOLE patient/visit       */
/* object — name, MRN, DOB, phone — into Supabase in the clear.      */
/* Now:                                                             */
/*                                                                  */
/*   1. CONSENT GATE. No patient or visit record leaves the device  */
/*      until the clinic explicitly turns PHI sync on. Default OFF.  */
/*      (cloud-sync.js honours phiConsentGiven() as a hard gate.)    */
/*                                                                  */
/*   2. CLIENT-SIDE ENCRYPTION. When consent is on, the `data` blob  */
/*      is encrypted with AES-GCM-256 before it is sent. The server  */
/*      stores CIPHERTEXT. The key is derived from a clinic          */
/*      passphrase via PBKDF2 and NEVER leaves the device — the      */
/*      cloud is zero-knowledge with respect to PHI.                 */
/*                                                                  */
/* Only `data` is encrypted. The sync-metadata columns (id,          */
/* clinic_id, patient_id, updated_at, deleted) stay in clear — none  */
/* is PII (ids are client-generated random strings) and the sync     */
/* mechanics need them.                                             */
/*                                                                  */
/* ── THREAT MODEL, STATED HONESTLY ────────────────────────────────  */
/* This protects the CLOUD COPY and any exported/synced file: a      */
/* database dump, a leaked backup, or Supabase itself never sees     */
/* plaintext PHI or the key. It does NOT protect against someone     */
/* with physical access to an unlocked device — that is out of scope */
/* for a client-only app and is documented as such. The derived key  */
/* is cached on the device so an all-day clinical tool does not      */
/* demand the passphrase on every reload; the local record store is  */
/* already plaintext by design, so caching the key there adds no new */
/* exposure the local data did not already have.                     */
/*                                                                  */
/* Same salt derivation on every device in a clinic (passphrase +    */
/* clinic id) means peers converge on the same key with no key       */
/* exchange — a joining device just needs the shared passphrase.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var PHI_CONSENT_KEY = "entopic_cloud_phi_consent";
var PHI_KEY_CACHE   = "entopic_cloud_phi_keyhex";   /* derived key bytes, device-local */
var PHI_PBKDF2_ITERS = 150000;
var PHI_ENVELOPE_TAG = "entopic-phi-aesgcm256-v1";

/* in-memory CryptoKey, rebuilt from the cached bytes on demand */
var _phiKey = null;

function phiHasWebCrypto() {
  return !!(typeof crypto !== "undefined" && crypto.subtle && crypto.getRandomValues);
}

/* ── Consent (C-2): the hard gate on PHI egress ──────────────────── */
function phiConsentGiven() {
  try { return localStorage.getItem(PHI_CONSENT_KEY) === "yes"; }
  catch (e) { return false; }
}
function phiSetConsent(on) {
  try {
    if (on) localStorage.setItem(PHI_CONSENT_KEY, "yes");
    else localStorage.removeItem(PHI_CONSENT_KEY);
  } catch (e) {}
  if (typeof logAudit === "function") {
    logAudit("phi_consent_" + (on ? "granted" : "revoked"),
      "Cloud PHI sync " + (on ? "enabled" : "disabled") + " for this device", {});
  }
}

/* ── byte helpers ── */
function phiBytesToHex(bytes) {
  var out = "";
  for (var i = 0; i < bytes.length; i++) out += ("0" + bytes[i].toString(16)).slice(-2);
  return out;
}
function phiHexToBytes(hex) {
  hex = String(hex || "");
  var a = new Uint8Array(Math.floor(hex.length / 2));
  for (var i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function phiB64FromBytes(bytes) {
  var s = "";
  for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return (typeof btoa === "function") ? btoa(s) : Buffer.from(bytes).toString("base64");
}
function phiBytesFromB64(b64) {
  var s = (typeof atob === "function") ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  var a = new Uint8Array(s.length);
  for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

/* ── key derivation ──────────────────────────────────────────────
   Salt is derived deterministically from the clinic id, so every device
   in a clinic derives the SAME key from the shared passphrase with no key
   exchange. The clinic id is unique-per-tenant (a server uuid), which is
   exactly what a salt needs to do — stop one clinic's rainbow table helping
   against another. It is not itself secret; the passphrase is. */
function phiDeriveKey(passphrase, clinicId) {
  if (!phiHasWebCrypto()) return Promise.reject(new Error("Web Crypto unavailable"));
  var enc = new TextEncoder();
  var saltStr = "entopic-phi-salt:" + String(clinicId || "no-clinic");
  return crypto.subtle
    .importKey("raw", enc.encode(String(passphrase)), "PBKDF2", false, ["deriveBits", "deriveKey"])
    .then(function (base) {
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: enc.encode(saltStr), iterations: PHI_PBKDF2_ITERS, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        true,               /* extractable — so we can cache the raw bytes on-device */
        ["encrypt", "decrypt"]
      );
    });
}

/* ── Protecting the cached key itself ─────────────────────────────
   The derived key is cached on the device so an all-day clinical tool does
   not demand the passphrase on every reload. Before the record vault existed
   that cost nothing: the local records were plaintext anyway, so the key was
   no weaker than what it protected.

   That is no longer true. With the vault on, a stolen device gives up NOTHING
   locally — but a key sitting beside it in the clear would still let the thief
   decrypt the CLOUD copy. So when the vault is available the cached key is
   itself stored wrapped by the vault, closing that gap. Falls back to the plain
   hex cache when the vault is off, which is exactly the old behaviour. */
function phiVaultReady() {
  return typeof vaultEnabled === "function" && vaultEnabled() &&
         typeof vaultUnlocked === "function" && vaultUnlocked() &&
         typeof vaultEncryptValue === "function";
}

function phiStoreKeyHex(hex) {
  if (!phiVaultReady()) {
    try { localStorage.setItem(PHI_KEY_CACHE, hex); } catch (e) {}
    return Promise.resolve(true);
  }
  return vaultEncryptValue(hex).then(function (env) {
    try { localStorage.setItem(PHI_KEY_CACHE, JSON.stringify(env)); } catch (e) {}
    return true;
  }).catch(function () {
    try { localStorage.setItem(PHI_KEY_CACHE, hex); } catch (e) {}
    return true;
  });
}

/* Read the cached key back, transparently handling both shapes. */
function phiReadKeyHex() {
  var raw = "";
  try { raw = localStorage.getItem(PHI_KEY_CACHE) || ""; } catch (e) {}
  if (!raw) return Promise.resolve("");
  if (raw.charAt(0) !== "{") return Promise.resolve(raw);        /* legacy plain hex */
  var env;
  try { env = JSON.parse(raw); } catch (e) { return Promise.resolve(""); }
  if (typeof vaultDecryptValue !== "function" || !phiVaultReady()) return Promise.resolve("");
  return vaultDecryptValue(env).then(function (hex) { return String(hex || ""); })
                               .catch(function () { return ""; });
}

/* Set the clinic passphrase: derive, cache on device, hold in memory. */
function phiSetPassphrase(passphrase, clinicId) {
  if (!passphrase || String(passphrase).length < 8) {
    return Promise.reject(new Error("Passphrase must be at least 8 characters."));
  }
  return phiDeriveKey(passphrase, clinicId).then(function (key) {
    _phiKey = key;
    return crypto.subtle.exportKey("raw", key).then(function (raw) {
      return phiStoreKeyHex(phiBytesToHex(new Uint8Array(raw))).then(function () {
        if (typeof logAudit === "function") logAudit("phi_key_set", "Clinic encryption passphrase set on this device", {});
        return true;
      });
    });
  });
}

/* Rebuild the in-memory key from the device cache, if present. */
function phiLoadKey() {
  if (_phiKey) return Promise.resolve(_phiKey);
  if (!phiHasWebCrypto()) return Promise.resolve(null);
  return phiReadKeyHex().then(function (hex) {
    if (!hex) return null;
    return crypto.subtle
      .importKey("raw", phiHexToBytes(hex), { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
      .then(function (key) {
        _phiKey = key;
        /* Opportunistic upgrade: a key cached before the vault was turned on is
           still lying in the clear. Now that the vault is open, wrap it — and
           WAIT for that write, so we never report the key as ready while a
           plaintext copy is still sitting on disk. */
        var raw = "";
        try { raw = localStorage.getItem(PHI_KEY_CACHE) || ""; } catch (e) {}
        if (raw && raw.charAt(0) !== "{" && phiVaultReady()) {
          return phiStoreKeyHex(hex).then(function () { return key; });
        }
        return key;
      })
      .catch(function () { return null; });
  });
}

function phiKeyReady() {
  if (_phiKey) return true;
  var raw = "";
  try { raw = localStorage.getItem(PHI_KEY_CACHE) || ""; } catch (e) { return false; }
  if (!raw) return false;
  /* A vault-wrapped key is only usable while the vault is open. Reporting
     "ready" on a locked device would let cloud-sync believe it can push and
     then fail mid-drain; saying not-ready makes it wait quietly instead. */
  if (raw.charAt(0) === "{" && !phiVaultReady()) return false;
  return true;
}

function phiClearKey() {
  _phiKey = null;
  try { localStorage.removeItem(PHI_KEY_CACHE); } catch (e) {}
}

/* Is cloud PHI sync fully armed (consent + a usable key)? cloud-sync.js
   will not push a single record unless this is true. */
function phiArmed() {
  return phiConsentGiven() && phiKeyReady() && phiHasWebCrypto();
}

/* ── encrypt / decrypt one `data` object ─────────────────────────── */
function phiIsEnvelope(x) {
  return !!(x && typeof x === "object" && x.__phi === PHI_ENVELOPE_TAG && x.iv && x.ct);
}

function phiEncrypt(obj) {
  return phiLoadKey().then(function (key) {
    if (!key) throw new Error("No encryption key on this device.");
    var iv = new Uint8Array(12);
    crypto.getRandomValues(iv);
    var enc = new TextEncoder();
    var plaintext = enc.encode(JSON.stringify(obj));
    return crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext).then(function (ct) {
      return { __phi: PHI_ENVELOPE_TAG, iv: phiBytesToHex(iv), ct: phiB64FromBytes(new Uint8Array(ct)) };
    });
  });
}

function phiDecrypt(envelope) {
  if (!phiIsEnvelope(envelope)) return Promise.resolve(envelope); /* already plaintext */
  return phiLoadKey().then(function (key) {
    if (!key) throw new Error("No decryption key on this device.");
    var iv = phiHexToBytes(envelope.iv);
    var ct = phiBytesFromB64(envelope.ct);
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, ct).then(function (pt) {
      return JSON.parse(new TextDecoder().decode(pt));
    });
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    phiConsentGiven: phiConsentGiven, phiSetConsent: phiSetConsent,
    phiSetPassphrase: phiSetPassphrase, phiKeyReady: phiKeyReady,
    phiArmed: phiArmed, phiEncrypt: phiEncrypt, phiDecrypt: phiDecrypt,
    phiIsEnvelope: phiIsEnvelope, phiClearKey: phiClearKey
  };
}
