/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — BACKUP, EXPORT AND RESTORE                            */
/*                                                                  */
/* Split out of storage.js on 2026-08-01. storage.js had grown to   */
/* 1,219 lines holding four separate jobs — store CRUD, corruption  */
/* handling, backup/restore, and the anonymised encounter builder — */
/* and tripped its own complexity budget. Backup/restore was the    */
/* cleanest seam: it is the only part that deals in whole-clinic    */
/* snapshots and files on disk rather than individual records.      */
/*                                                                  */
/* WHAT IS IN A BACKUP is not decided here. It derives from         */
/* js/data-classification.js, so a new store gets backed up by      */
/* being declared, not by somebody remembering to edit this file.   */
/* tests/architecture.test.js checks that everything written to a   */
/* backup is also read back by the restore — a store that is        */
/* exported but never restored is worse than one that is not        */
/* backed up at all, because the file looks complete.               */
/*                                                                  */
/* Two safety properties worth preserving if this is ever touched:  */
/*   1. A restore takes a safety snapshot of the CURRENT data       */
/*      first, and aborts entirely if that snapshot cannot be       */
/*      written. An un-undoable replace is the failure this guards. */
/*   2. kb_signoffs MERGES rather than replaces, so a restore can   */
/*      never destroy clinical verification work done since the     */
/*      backup was taken.                                           */
/*                                                                  */
/* Load order: after storage.js (it uses loadStore/saveStore and    */
/* the named accessors) and after local-vault.js.                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════════════════════════════════════════════════ */
/* DATA EXPORT                                                     */
/* Exports all data as a downloadable JSON file                    */
/* ═══════════════════════════════════════════════════════════════ */

/* Gather everything a backup contains. Separated so it can be encrypted
   before it is written, rather than after it has already hit the disk. */
/* What goes into a backup is declared in js/data-classification.js, not
   decided here. This used to be a hand-written object literal, which is how
   consents, research_corpus, research_salt and feedback ended up absent from
   every backup a clinic ever took: each was added by editing its own module
   and nobody thought to come back and edit this literal too.

   patients/visits/users/settings/audit keep their named accessors because
   those apply vault decryption and legacy migration; everything else is a
   plain store read. */
var BACKUP_READERS = {
  users: function () { return loadUsers(); },
  patients: function () { return loadPatients(); },
  visits: function () { return loadVisits(); },
  settings: function () { return loadSettings(); },
  audit: function () { return loadAudit(); }
};

function buildBackupPayload() {
  var out = { version: STORE_VERSION, exported: new Date().toISOString() };
  var keys = (typeof dataStoresWith === "function")
    ? dataStoresWith("backup")
    : ["users", "patients", "visits", "settings", "audit", "kb_signoffs"];

  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (BACKUP_READERS[k]) { out[k] = BACKUP_READERS[k](); continue; }
    /* Fall back to the store's declared shape so an absent store exports as
       an empty container of the right type rather than as null, which every
       restore path would then have to special-case. */
    var empty = (typeof DATA_STORES !== "undefined" && DATA_STORES[k] && DATA_STORES[k].shape === "array") ? []
              : (typeof DATA_STORES !== "undefined" && DATA_STORES[k] && DATA_STORES[k].shape === "string") ? ""
              : {};
    var val = loadStore(k, empty);
    out[k] = (val === null || val === undefined) ? empty : val;
  }
  return out;
}

function downloadBackupFile(obj, suffix) {
  var name = "entopic-backup-" + new Date().toISOString().slice(0, 10) + (suffix || "") + ".json";
  return dlSaveAs(name, JSON.stringify(obj, null, 2), "application/json");
}

function exportAllData() {
  var data = buildBackupPayload();
  if (typeof logAudit === "function") logAudit("data_exported", "Exported all data (plain JSON backup)", { patient_id: null, visit_id: null });
  downloadBackupFile(data, "");
}

/* Encrypted backup (audit H-4). A backup file travels — USB stick, Downloads
   folder, email — so it is the copy of the records MOST likely to be lost, and
   it was the only one still in plaintext once the device vault landed.

   The file is self-contained: its salt travels with it and the key comes from
   a passphrase, NOT from this device's vault. A backup has to be restorable
   onto a replacement machine that has no vault at all — tying it to the device
   key would make it useless in the exact disaster it exists for. */
function exportEncryptedBackup(passphrase, cb) {
  cb = cb || function () {};
  if (typeof backupEncrypt !== "function") { cb(new Error("Encryption is unavailable in this browser.")); return; }
  backupEncrypt(buildBackupPayload(), passphrase).then(function (env) {
    if (typeof logAudit === "function") {
      logAudit("data_exported_encrypted", "Exported an ENCRYPTED backup", { patient_id: null, visit_id: null });
    }
    downloadBackupFile(env, "-encrypted");
    cb(null);
  }).catch(function (e) { cb(e); });
}


/* ═══════════════════════════════════════════════════════════════ */
/* DATA IMPORT                                                     */
/* Imports from a JSON backup file                                 */
/* ═══════════════════════════════════════════════════════════════ */

/* Validate a parsed backup before it is allowed to replace live records.
   Pure, so the rules are testable. Returns {ok, errors[], warnings[], counts}.

   Production-readiness audit (H-1): the old check was `data.patients &&
   data.visits` — an empty array passes that, so restoring a truncated or
   wrong-shaped file silently wiped a clinic's records with a success message.
   Version is checked too: a backup from a future STORE_VERSION may carry
   fields this build does not understand. */
/* Compare two store versions. STORE_VERSION is a semver STRING ("1.0.0"), but
   older exports may carry a plain number, so handle both: -1 / 0 / 1, or null
   when either side is unusable. (Naive Number() comparison silently yields NaN
   on "1.0.0" and would let a future backup through — pinned by a test.) */
function compareStoreVersion(a, b) {
  function parts(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!/^\d+(\.\d+)*$/.test(s)) return null;
    return s.split(".").map(function (n) { return parseInt(n, 10); });
  }
  var pa = parts(a), pb = parts(b);
  if (!pa || !pb) return null;
  for (var i = 0; i < Math.max(pa.length, pb.length); i++) {
    var x = pa[i] || 0, y = pb[i] || 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

function validateBackup(data) {
  var errors = [], warnings = [];
  if (!data || typeof data !== "object") {
    return { ok: false, errors: ["The file is not an Entopic backup (not a JSON object)."], warnings: [], counts: null };
  }
  if (!Array.isArray(data.patients)) errors.push("No patient list in this file — it is not an Entopic backup.");
  if (!Array.isArray(data.visits))   errors.push("No visit list in this file — it is not an Entopic backup.");
  if (errors.length) return { ok: false, errors: errors, warnings: warnings, counts: null };

  /* Shape-check a sample rather than every record: enough to catch a wrong
     file, cheap on a large backup. */
  var sample = data.patients.slice(0, 25);
  for (var i = 0; i < sample.length; i++) {
    if (!sample[i] || typeof sample[i] !== "object" || !sample[i].id) {
      errors.push("Patient records in this file are missing their id — the file looks corrupt.");
      break;
    }
  }
  var vs = data.visits.slice(0, 25);
  for (var j = 0; j < vs.length; j++) {
    if (!vs[j] || typeof vs[j] !== "object" || !vs[j].id) {
      errors.push("Visit records in this file are missing their id — the file looks corrupt.");
      break;
    }
  }

  var here = (typeof STORE_VERSION !== "undefined") ? STORE_VERSION : null;
  if (data.version == null) {
    warnings.push("No version stamp — this backup predates version tracking.");
  } else {
    var cmp = compareStoreVersion(data.version, here);
    if (cmp === 1) {
      errors.push("This backup was written by a NEWER version of Entopic (v" + data.version +
                  " vs v" + here + "). Update Entopic before restoring it, or data could be lost.");
    } else if (cmp === null) {
      warnings.push("The version stamp in this file (\"" + data.version + "\") could not be read.");
    }
  }
  if (!data.patients.length) warnings.push("This backup contains NO patients.");
  if (!Array.isArray(data.audit)) warnings.push("No audit trail in this backup — the access history will not be restored.");

  return {
    ok: errors.length === 0,
    errors: errors,
    warnings: warnings,
    counts: { patients: data.patients.length, visits: data.visits.length,
              users: Array.isArray(data.users) ? data.users.length : 0 }
  };
}

function importData(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var data;
    try {
      data = JSON.parse(e.target.result);
    } catch (err) {
      alert("Failed to parse backup file: " + err.message);
      return;
    }

    /* An encrypted backup has to be opened before it can be validated. */
    if (typeof backupIsEncrypted === "function" && backupIsEncrypted(data)) {
      var pass = window.prompt(
        "This backup is encrypted.\n\nEnter the backup passphrase to open it:", "");
      if (!pass) return;
      backupDecrypt(data, pass).then(function (plain) {
        _importDecoded(plain);
      }).catch(function (err) {
        alert((err && err.message) || "Could not open this backup file.\n\nYour current records are untouched.");
      });
      return;
    }
    _importDecoded(data);
  };
  reader.readAsText(file);
}

function _importDecoded(data) {
    var check = validateBackup(data);
    if (!check.ok) {
      alert("This file was NOT restored:\n\n• " + check.errors.join("\n• ") +
            "\n\nYour current records are untouched.");
      return;
    }

    var current = { patients: loadPatients().length, visits: loadVisits().length };
    var msg =
      "RESTORE FROM BACKUP\n\n" +
      "Replacing:  " + current.patients + " patients, " + current.visits + " visits (on this device now)\n" +
      "With:       " + check.counts.patients + " patients, " + check.counts.visits + " visits (from the file)\n" +
      (check.warnings.length ? "\nNote:\n• " + check.warnings.join("\n• ") + "\n" : "") +
      "\nA safety copy of the CURRENT data will be downloaded first so this can be undone.\n\nContinue?";
    if (!confirm(msg)) return;

  /* Safety snapshot before anything is overwritten (audit H-1). If the snapshot
     cannot be produced, stop — an un-undoable replace is exactly the failure
     this guards against.

     When the record vault is on, this snapshot must NOT be written in the
     clear: it holds the same patient data the vault exists to protect, and it
     lands in the Downloads folder. It is encrypted with the device's own vault
     key, so the clinic can open it with the vault passphrase or the recovery
     code — the file is an undo for THIS device, which is exactly its purpose. */
  function takeSafetySnapshot() {
    var vaultOn = (typeof vaultEnabled === "function" && vaultEnabled() &&
                   typeof vaultUnlocked === "function" && vaultUnlocked() &&
                   typeof vaultEncryptValue === "function");
    if (!vaultOn) {
      exportAllData();
      return Promise.resolve("plain");
    }
    return vaultEncryptValue(buildBackupPayload()).then(function (env) {
      downloadBackupFile({
        __backup_vault: true,
        note: "Entopic safety snapshot, encrypted with this device's vault key. " +
              "Open it on this device (or one restored from it) with the clinic passphrase or the recovery code.",
        exported: new Date().toISOString(),
        payload: env
      }, "-safety-encrypted");
      return "encrypted";
    });
  }

  takeSafetySnapshot().then(function (mode) {
    if (data.users) saveUsers(data.users);
    savePatients(data.patients);
    saveVisits(data.visits);
    if (data.settings) saveSettings(data.settings);
    /* Restore the audit trail too — losing the access history on restore
       would break the record the clinic may have to produce. */
    if (Array.isArray(data.audit) && typeof saveAudit === "function") saveAudit(data.audit);

    /* Clinical sign-offs. MERGED, not replaced: a restore must never destroy
       verification work done on this device since the backup was taken. Older
       backups have no kb_signoffs key at all, which is why this is guarded. */
    if (data.kb_signoffs && typeof data.kb_signoffs === "object") {
      var incoming = data.kb_signoffs;
      var have = loadStore("kb_signoffs") || {};
      for (var sn in incoming) {
        if (!Object.prototype.hasOwnProperty.call(incoming, sn)) continue;
        var mine = have[sn];
        if (!mine || String(incoming[sn].on || "") > String(mine.on || "")) have[sn] = incoming[sn];
      }
      saveStore("kb_signoffs", have);
    }

    /* Consents, the research corpus and its salt, and feedback.
       These are REPLACED rather than merged, which is the honest choice for
       three of the four and a deliberate compromise for the fourth:

         consents        A restore rewinds the clinic to the backup's moment.
                         Merging a consent ledger means guessing whether a
                         later withdrawal or a later grant is the true state,
                         and guessing wrong in the permissive direction would
                         mean processing data the patient had withdrawn. If it
                         has to be wrong, it must be wrong in the direction
                         that processes LESS.
         research_salt   Must match the corpus it is restored with, or every
                         pseudonym in that corpus becomes unlinkable. Only
                         written when the file actually carries one.
         research_corpus Replaced alongside its salt, for the same reason —
                         a corpus and a salt from different eras do not
                         reconcile.
         feedback        Replaced. Losing a few local reports is recoverable;
                         a merge would need stable IDs across devices, which
                         feedback entries do not yet have.

       All four are guarded: backups taken before this release carry none of
       these keys, and an absent key must leave the device's own data alone
       rather than wipe it. */
    if (data.consents && typeof data.consents === "object") saveStore("consents", data.consents);
    if (typeof data.research_salt === "string" && data.research_salt) {
      saveStore("research_salt", data.research_salt);
    }
    if (data.research_corpus && typeof data.research_corpus === "object") {
      saveStore("research_corpus", data.research_corpus);
    }
    if (Array.isArray(data.feedback)) saveStore("feedback", data.feedback);

    if (typeof logAudit === "function") {
      try {
        logAudit("data_restored",
          "Restored backup: " + check.counts.patients + " patients, " + check.counts.visits +
          " visits (replaced " + current.patients + "/" + current.visits + ")", {});
      } catch (e3) {}
    }

    alert("Restored " + check.counts.patients + " patients and " + check.counts.visits + " visits.\n\n" +
          "A safety copy of your previous data was downloaded" +
          (mode === "encrypted" ? " (encrypted with this device's vault key)." : " (unencrypted — store it carefully).") +
          "\n\nThe page will now reload.");
    location.reload();
  }).catch(function (err2) {
    alert("Could not save a safety copy of the current data, so NOTHING was replaced.\n\n(" +
          ((err2 && err2.message) || "unknown error") + ")\n\nYour records are untouched.");
  });
}

