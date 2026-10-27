/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — VAULT-PROTECTED SECRETS                                */
/* Split from js/local-vault.js (full audit, 2026-10-27) when the   */
/* vault crossed its module size cap. Load AFTER local-vault.js:    */
/* everything here uses the vault key it holds.                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

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

/* Store a secret string. Returns a promise resolving to whether the value is
   actually on disk — it used to resolve true unconditionally, so a full or
   blocked localStorage lost the secret while reporting success. Writes go
   through lsSet (js/browser-io.js), which surfaces the failure in the same
   banner the record store uses. */
function vaultSecretSet(storageKey, value) {
  if (value === null || value === undefined || value === "") {
    lsRemove(storageKey);
    return Promise.resolve(true);
  }
  var str = String(value);
  if (!vaultSecretUsable()) return Promise.resolve(lsSet(storageKey, str));

  return vaultEncryptValue(str).then(function (env) {
    return lsSet(storageKey, JSON.stringify(env));
  }).catch(function () {
    /* Encryption failed — keep the secret rather than drop it. */
    return lsSet(storageKey, str);
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
/* The cloud PHI key cache (js/cloud-crypto.js, PHI_KEY_CACHE) uses the same
   envelope format. It was left out, so a key cached before the vault was
   turned on stayed on disk in the clear until cloud sync next happened to
   load it — which, on a device that never syncs that session, was never. */
var VAULT_MANAGED_SECRETS = ["entopic_cloud_session", "entopic_apikey", "entopic_cloud_phi_keyhex"];

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

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    vaultSecretSet: vaultSecretSet, vaultSecretGet: vaultSecretGet,
    vaultSecretPresent: vaultSecretPresent, vaultSecretAvailable: vaultSecretAvailable,
    vaultIsWrappedSecret: vaultIsWrappedSecret, vaultRewrapSecrets: vaultRewrapSecrets,
    VAULT_MANAGED_SECRETS: VAULT_MANAGED_SECRETS
  };
}
