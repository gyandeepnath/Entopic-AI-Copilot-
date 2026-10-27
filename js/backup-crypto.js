/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ENCRYPTED BACKUP FILES                                 */
/* Split from js/local-vault.js (full audit, 2026-10-27). Uses its  */
/* key derivation (vaultDeriveKek, with the count recorded in each  */
/* file) but NOT the device's vault key: a backup must restore onto */
/* a new machine. Load AFTER local-vault.js.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

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
  /* Opened with the count the FILE was made with. A backup made before the
     count was raised must still open; one naming an absurd count is refused
     rather than allowed to freeze the browser. */
  return vaultDeriveKek(passphrase, envelope.kdf.salt, envelope.kdf.iters || VAULT_LEGACY_ITERS)
    .then(function (key) {
      return crypto.subtle.decrypt(
        { name: "AES-GCM", iv: vaultFromHex(envelope.iv) }, key, vaultUnB64(envelope.ct));
    })
    .then(function (pt) { return JSON.parse(new TextDecoder().decode(pt)); })
    .catch(function () { throw new Error("That passphrase did not open this backup file."); });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    backupEncrypt: backupEncrypt, backupDecrypt: backupDecrypt,
    backupIsEncrypted: backupIsEncrypted
  };
}
