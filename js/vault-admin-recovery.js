/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ADMINISTRATOR VAULT RECOVERY (key escrow)             */
/*                                                                  */
/* Split out of local-vault.js: the vault's job is to encrypt and   */
/* decrypt; this file's job is to answer "who else may open it?".   */
/* They are different questions with different risk profiles, and   */
/* keeping the escrow path in its own file means a reviewer can     */
/* read the entire trust decision in one place.                     */
/*                                                                  */
/* Load order: immediately after js/local-vault.js.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* ADMINISTRATOR RESET  (founder decision, 2026-08-07)             */
/*                                                                  */
/* "If a user loses the vault passphrase, the admin can reset it on */
/*  request with a master password; the user then sets their own    */
/*  passphrase again."                                              */
/*                                                                  */
/* ── HOW IT WORKS ──                                              */
/*                                                                  */
/* The data encryption key (DEK) is generated once and never        */
/* changes. What changes is who can UNWRAP it. Enrolling an admin   */
/* adds a third wrapping of the same DEK:                           */
/*                                                                  */
/*     DEK ──wrapped by── PBKDF2(user passphrase, salt)             */
/*         ──wrapped by── PBKDF2(recovery code, recovery_salt)      */
/*         ──wrapped by── PBKDF2(master password, admin_salt)  ←NEW */
/*                                                                  */
/* A reset unwraps the DEK with the master password and re-wraps it */
/* under a new passphrase. **No patient record is re-encrypted, so  */
/* a reset is instant and cannot half-finish.** That property is    */
/* why envelope encryption is the right shape here: the alternative */
/* — re-encrypting every record — would be a long, interruptible    */
/* operation on exactly the data you are trying to rescue.          */
/*                                                                  */
/* ── WHAT THIS COSTS, STATED PLAINLY ──                           */
/*                                                                  */
/* This is KEY ESCROW. Once enrolled, whoever holds the master      */
/* password can decrypt every record on that device. The promise    */
/* changes from "only you can read this" to "you and your clinic's  */
/* administrator can read this", and that is a real reduction in    */
/* confidentiality, not a technicality.                             */
/*                                                                  */
/* So it is enforced to be honest rather than convenient:           */
/*                                                                  */
/*   • OPT-IN per device. A vault without enrolment behaves exactly */
/*     as before; nothing is escrowed silently.                     */
/*   • Enrolment requires the CURRENT passphrase, so a user cannot  */
/*     have escrow imposed on them without unlocking their own      */
/*     vault. An attacker with admin rights but no passphrase       */
/*     cannot enrol themselves after the fact.                      */
/*   • The master password must be at least 16 characters — it now  */
/*     protects every record on every enrolled device, so it must   */
/*     be stronger than the passphrase it can override.             */
/*   • Every enrolment, every reset and every failed reset attempt  */
/*     is audited, and the record says who and when.                */
/*   • After a reset the vault is flagged `must_change`, so the     */
/*     user is required to set their own passphrase — the           */
/*     administrator's temporary one is not allowed to persist.     */
/*   • Withdrawing enrolment is one call and needs only the         */
/*     passphrase, so consent is revocable.                         */
/*                                                                  */
/* ── WHAT IT DOES NOT DO ──                                       */
/*                                                                  */
/* It does not send anything anywhere. The admin wrapping lives in  */
/* the same device-local meta blob as the other two; there is no    */
/* server-side escrow, no key held by Entopic, and a reset requires */
/* physical or remote access to the device itself.                  */
/* ═══════════════════════════════════════════════════════════════ */

var VAULT_MASTER_MIN = 16;

/* Is an administrator able to reset this device's vault? */
function vaultAdminEnrolled() {
  var m = vaultMeta();
  return !!(m && m.wrapped && m.wrapped.admin && m.kdf && m.kdf.admin_salt);
}

/* When, and by whom — for the UI to show the user what they agreed to. */
function vaultAdminEnrolment() {
  var m = vaultMeta();
  if (!vaultAdminEnrolled()) return null;
  return { at: m.admin_enrolled_at || "", by: m.admin_enrolled_by || "" };
}

/* Does the user have to choose a new passphrase before continuing?
   Set by a reset, cleared by vaultChangePassphrase. */
function vaultMustChangePassphrase() {
  var m = vaultMeta();
  return !!(m && m.must_change);
}

/* Enrol an administrator. Needs the CURRENT passphrase — this is the consent
   gate, and it is why an admin cannot quietly add themselves later. */
function vaultAdminEnrol(passphrase, masterPassword, adminName) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  if (!vaultHasCrypto()) return Promise.reject(new Error("This browser cannot encrypt (no Web Crypto)."));
  if (!masterPassword || String(masterPassword).length < VAULT_MASTER_MIN) {
    return Promise.reject(new Error("The master password must be at least " + VAULT_MASTER_MIN +
      " characters. It can decrypt every record on this device, so it has to be stronger " +
      "than the passphrase it overrides."));
  }
  if (String(masterPassword) === String(passphrase)) {
    return Promise.reject(new Error("The master password must be different from the vault passphrase — " +
      "otherwise the reset path adds risk without adding recovery."));
  }
  var adminSalt = vaultRandomHex(16);
  return vaultDeriveKek(passphrase, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) {
      /* Prove the key is right before writing a wrapping of it. */
      return vaultDecryptValue(meta.check, dek).then(function (v) {
        if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
        return crypto.subtle.exportKey("raw", dek);
      });
    })
    .then(function (rawDek) {
      return vaultDeriveKek(masterPassword, adminSalt).then(function (aKek) {
        return vaultWrapDek(new Uint8Array(rawDek), aKek);
      });
    })
    .then(function (wrapped) {
      meta = vaultMeta();                       /* re-read: never save a stale copy */
      meta.kdf.admin_salt = adminSalt;
      meta.wrapped.admin = wrapped;
      meta.admin_enrolled_at = new Date().toISOString();
      meta.admin_enrolled_by = String(adminName || "");
      vaultSaveMeta(meta);
      if (typeof logAudit === "function") {
        try { logAudit("vault_admin_enrolled",
          "An administrator was enrolled for vault recovery on this device" +
          (adminName ? " (" + adminName + ")" : "") +
          ". They can now decrypt every record on it.", {}); } catch (e) {}
      }
      return true;
    })
    .catch(function (e) {
      if (e && /master password/.test(e.message || "")) throw e;
      throw new Error("That passphrase was not correct — no administrator was enrolled.");
    });
}

/* Withdraw enrolment. Only the passphrase is needed: consent must be as easy
   to revoke as it was to give. */
function vaultAdminWithdraw(passphrase) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  if (!vaultAdminEnrolled()) return Promise.resolve(true);
  return vaultDeriveKek(passphrase, meta.kdf.salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.pass, kek); })
    .then(function (dek) { return vaultDecryptValue(meta.check, dek); })
    .then(function (v) {
      if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
      meta = vaultMeta();
      delete meta.wrapped.admin;
      delete meta.kdf.admin_salt;
      delete meta.admin_enrolled_at;
      delete meta.admin_enrolled_by;
      vaultSaveMeta(meta);
      if (typeof logAudit === "function") {
        try { logAudit("vault_admin_withdrawn",
          "Administrator recovery was withdrawn for this device. Only the passphrase " +
          "and the recovery code open it now.", {}); } catch (e) {}
      }
      return true;
    })
    .catch(function () { throw new Error("That passphrase was not correct — nothing was changed."); });
}

/* THE RESET. An administrator with the master password sets a new passphrase
   for a user who has lost theirs.

   Deliberately does NOT unlock the vault as a side effect. The admin's job is
   to restore access, not to read the records — so this hands back a working
   passphrase and stops. Anyone who then opens the vault does so as themselves,
   through the ordinary unlock path, which is audited separately. */
function vaultAdminReset(masterPassword, newPassphrase, adminName) {
  var meta = vaultMeta();
  if (!meta) return Promise.reject(new Error("The vault is not set up on this device."));
  if (!vaultAdminEnrolled()) {
    return Promise.reject(new Error("No administrator is enrolled for this device. A reset is only " +
      "possible if an administrator was enrolled while the vault was still open — enrolment " +
      "cannot be added afterwards, by design."));
  }
  if (!newPassphrase || String(newPassphrase).length < 10) {
    return Promise.reject(new Error("Choose a new passphrase of at least 10 characters."));
  }
  /* Throttled on the same counter as the passphrase, so the master password
     cannot be brute-forced faster than the thing it overrides. */
  var wait = vaultThrottleCheck();
  if (wait > 0) {
    var secs = Math.ceil(wait / 1000);
    return Promise.reject(new Error("Too many attempts — wait " +
      (secs >= 60 ? Math.ceil(secs / 60) + " min" : secs + "s") + " before trying again."));
  }

  var newSalt = vaultRandomHex(16);
  return vaultDeriveKek(masterPassword, meta.kdf.admin_salt)
    .then(function (kek) { return vaultUnwrapDek(meta.wrapped.admin, kek); })
    .then(function (dek) {
      return vaultDecryptValue(meta.check, dek).then(function (v) {
        if (v !== VAULT_CHECK_TEXT) throw new Error("bad key");
        return crypto.subtle.exportKey("raw", dek);
      });
    })
    .then(function (rawDek) {
      return vaultDeriveKek(newPassphrase, newSalt).then(function (nKek) {
        return vaultWrapDek(new Uint8Array(rawDek), nKek);
      });
    })
    .then(function (wrapped) {
      meta = vaultMeta();
      meta.kdf.salt = newSalt;
      meta.wrapped.pass = wrapped;
      /* The user must replace the administrator's temporary passphrase. An
         admin-chosen secret is not allowed to become the standing one. */
      meta.must_change = true;
      meta.reset_at = new Date().toISOString();
      meta.reset_by = String(adminName || "");
      vaultSaveMeta(meta);
      vaultThrottleReset();
      if (typeof logAudit === "function") {
        try { logAudit("vault_admin_reset",
          "An administrator reset this device's vault passphrase using the master password" +
          (adminName ? " (" + adminName + ")" : "") +
          ". The user must set a new passphrase on next unlock.", {}); } catch (e) {}
      }
      return true;
    })
    .catch(function (e) {
      if (e && /(Too many attempts|at least 10|No administrator)/.test(e.message || "")) throw e;
      vaultThrottleNoteFailure();
      if (typeof logAudit === "function") {
        try { logAudit("vault_admin_reset_failed",
          "A vault reset was attempted with an incorrect master password.", {}); } catch (e2) {}
      }
      throw new Error("That master password did not work — nothing was changed.");
    });
}



if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VAULT_MASTER_MIN: VAULT_MASTER_MIN,
    vaultAdminEnrolled: vaultAdminEnrolled,
    vaultAdminEnrolment: vaultAdminEnrolment,
    vaultMustChangePassphrase: vaultMustChangePassphrase,
    vaultAdminEnrol: vaultAdminEnrol,
    vaultAdminWithdraw: vaultAdminWithdraw,
    vaultAdminReset: vaultAdminReset
  };
}
