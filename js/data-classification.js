/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DATA CLASSIFICATION                                   */
/*                                                                  */
/* ONE place that states what every stored thing is and how it must */
/* be protected. Everything else derives from here.                 */
/*                                                                  */
/* Why this file exists                                             */
/* ───────────────────                                              */
/* Protection used to be three hand-maintained lists in three files: */
/* VAULT_PROTECTED in local-vault.js, MIRROR_KEYS in                */
/* storage-mirror.js, and the object literal inside                 */
/* buildBackupPayload() in storage.js. Nothing connected them, so a  */
/* new store got whatever protection its author happened to think of */
/* on the day. That is exactly how the audit trail ended up          */
/* encrypted and backed up but not mirrored, and how consents,       */
/* research_corpus, research_salt and feedback ended up with no      */
/* protection at all — four stores added over three sessions, each   */
/* time by someone editing one list and not the other two.           */
/*                                                                  */
/* Adding a store to this table is now the ONLY thing an author has  */
/* to remember. The mirror and the backup read it directly.          */
/* tests/architecture.test.js fails if a store is protected by any    */
/* mechanism without appearing here.                                 */
/*                                                                  */
/* Fields                                                            */
/* ──────                                                            */
/*  class    what the data IS, for retention and disclosure:         */
/*             phi         identifies a patient or a user            */
/*             legal       evidence — consent, audit, attestation    */
/*             clinical    de-identified clinical content            */
/*             operational configuration and housekeeping            */
/*             derived     reproducible from other stores            */
/*  encrypt  the record vault encrypts it at rest                    */
/*  mirror   copied to the IndexedDB safety mirror                   */
/*  backup   included in the exported backup file                    */
/*  shape    "array" | "object" | "string" — a value of the wrong    */
/*           shape is corrupt even when it parses                    */
/*  why      one line: why this row is set the way it is             */
/*                                                                  */
/* Load order: FIRST of the js/ modules — storage-mirror.js,         */
/* local-vault.js and storage.js all read it.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var DATA_STORES = {
  /* ── Patient-identifying ── */
  patients: {
    class: "phi", encrypt: true, mirror: true, backup: true, shape: "array",
    why: "The records themselves."
  },
  visits: {
    class: "phi", encrypt: true, mirror: true, backup: true, shape: "array",
    why: "The clinical content of every encounter."
  },
  users: {
    class: "phi", encrypt: true, mirror: true, backup: true, shape: "array",
    why: "Named clinicians and students. Credential material is hashed, but the names are still personal data."
  },

  /* Which store migrations this device has applied (backend audit BE-4).
     Backed up and mirrored: restoring records without the ledger would make a
     restored device re-run every migration over already-migrated data. */
  migrations: {
    class: "operational", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The record of which shape changes this device's data has been through. Without it a " +
         "restore cannot tell migrated data from unmigrated, and re-running a migration over " +
         "already-migrated records is how an EMR corrupts itself."
  },

  /* Automatic-backup bookkeeping (backend audit BE-18): which on-device
     snapshots exist, and when a real off-device export last happened. Small,
     no clinical content. Backed up so a restored device does not immediately
     believe it has never been exported and start nagging. */
  autobackup: {
    class: "operational", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The record of when this device was last actually protected. Losing it makes the " +
         "app understate the risk the clinic is carrying, which is the wrong direction to be wrong in."
  },

  /* The archive index (backend audit BE-10): which archive files exist, what
     each holds, and the clinic's retention floor. Not the records themselves —
     those live in the archive FILES the clinic keeps. Backed up, because a
     restored device that did not know an archive existed would show stubs
     pointing at a file nobody knew to look for. */
  archives: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The map from a stub in a patient's chart to the file holding the rest of that visit. " +
         "Losing it does not lose the records, but it loses the ability to find them."
  },

  /* Pending deletes waiting to reach the server (backend audit BE-2).

     The one queue in the system that CANNOT be rebuilt from anything else.
     Every other sync state is derivable — a record's dirtiness is recomputed
     by comparing its `updated` stamp against `_cloud_updated`. A tombstone is
     different: the record it refers to is already gone locally, so if the
     queue is lost there is nothing left to notice the absence, and the next
     pull from another device resurrects the deleted patient.

     It held only ids, never content, so it is not PHI — but an id plus the
     fact of deletion is still clinic data, so it is mirrored and encrypted
     with everything else. NOT backed up: a tombstone is a message in flight,
     and replaying a stale one out of a month-old backup could delete a record
     that has since been legitimately restored. */
  cloud_tombstones: {
    class: "operational", encrypt: false, mirror: true, backup: false, shape: "array",
    why: "Deletes that have not yet reached the server. Unlike every other sync flag this " +
         "cannot be recomputed — the record is already gone — so losing it silently " +
         "resurrects a deleted patient on the next pull. NOT vault-encrypted, and that is " +
         "a decision, not an oversight: it holds opaque client-generated ids and nothing " +
         "else (the same ids the server's audit_log stores in the clear by design), and a " +
         "vault-protected queue could not be written while the vault is locked — which is " +
         "exactly when a queued delete most needs to survive to the next session."
  },

  /* ── Legal / evidentiary ── */
  audit: {
    class: "legal", encrypt: true, mirror: true, backup: true, shape: "array",
    why: "Who opened which record and when. The artefact most likely to be demanded as evidence, " +
         "and the one nobody can reconstruct after the fact."
  },
  consents: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The lawful basis for every entry in the research corpus. Restoring patients without their " +
         "consent state would leave the clinic processing data it can no longer show permission for. " +
         "Not vault-encrypted on purpose: consent must be checkable while the vault is locked."
  },
  kb_signoffs: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "A clinician's review of 394 conditions. Irreplaceable human work; attestations only, no patient data."
  },
  kb_overlays: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "array",
    why: "Clinician-authored conditions. Somebody's own clinical reasoning, written down — " +
         "irreplaceable in the same way a sign-off is. Also evidence of what the engine was " +
         "doing on a given day, which a historical differential may need to explain itself."
  },
  competencies: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The university's own competency framework, imported by faculty. Losing it detaches " +
         "every student's evidence from the standard it was assessed against."
  },
  competency_log: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "array",
    why: "Students' evidence and supervisors' sign-offs. This is assessment evidence an " +
         "examining body may demand years later; it holds no patient identifiers by design."
  },
  age_brackets: {
    class: "legal", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The founder's per-condition decisions about which age band a condition belongs to. " +
         "Clinical judgement, not configuration: nobody else can regenerate it. Was written " +
         "straight to a raw localStorage key from inside knowledge/ until 2026-08-01, so it had " +
         "no protection at all."
  },

  /* ── De-identified clinical ── */
  research_corpus: {
    class: "clinical", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "The accumulating research asset. De-identified at capture, so it is not PHI, but it is " +
         "the one store that grows in value over years and cannot be regenerated from anything else."
  },
  research_salt: {
    class: "operational", encrypt: false, mirror: true, backup: true, shape: "string",
    why: "Makes corpus pseudonyms reproducible. Without it a restored corpus cannot be linked to " +
         "newly captured encounters, so the history silently detaches from the present. " +
         "Travelling in the backup adds no disclosure risk: that same file already carries the " +
         "patients in full, so the salt reveals nothing the file does not already contain."
  },

  /* ── Operational ── */
  feedback: {
    class: "operational", encrypt: false, mirror: true, backup: true, shape: "array",
    why: "Includes clinical-concern reports — the channel by which a clinician says the engine is wrong. " +
         "Losing those loses the safety signal."
  },
  settings: {
    class: "operational", encrypt: false, mirror: true, backup: true, shape: "object",
    why: "Clinic configuration. Cheap to recreate but annoying to lose."
  },
  vault_meta: {
    class: "operational", encrypt: false, mirror: true, backup: false, shape: "object",
    why: "The data key WRAPPED by the passphrase- and recovery-derived keys — never the key itself. " +
         "Mirrored because losing it makes every mirrored record permanently unreadable. " +
         "NOT backed up: a backup must restore onto a machine with no vault, so it carries its own salt instead."
  },

  /* ── Derived ── */
  registry_queue: {
    class: "derived", encrypt: false, mirror: false, backup: false, shape: "array",
    why: "Superseded by research_corpus. Retained only so existing installs can drain it; " +
         "reproducible from visits, so it needs no protection of its own."
  }
};

/* ── Queries. Kept trivial on purpose: this file is a declaration. ── */

function dataStoreKeys() {
  return Object.keys(DATA_STORES);
}

/* Every store with the given protection flag set. The three protection
   lists in the codebase are built from this, so they cannot drift apart. */
function dataStoresWith(flag) {
  return dataStoreKeys().filter(function (k) { return DATA_STORES[k][flag] === true; });
}

/* Every store declared to hold the given shape. */
function dataStoresShaped(shape) {
  return dataStoreKeys().filter(function (k) { return DATA_STORES[k].shape === shape; });
}

function dataStoreClass(key) {
  return DATA_STORES[key] ? DATA_STORES[key].class : null;
}

/* Does a parsed value match what this store is declared to hold?
   Unknown stores pass — this must never block a store the table has not
   caught up with yet. */
function dataShapeOk(key, parsed) {
  var spec = DATA_STORES[key];
  if (!spec) return true;
  if (spec.shape === "array") return Array.isArray(parsed);
  if (spec.shape === "string") return typeof parsed === "string";
  if (spec.shape === "object") return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed);
  return true;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    DATA_STORES: DATA_STORES,
    dataStoreKeys: dataStoreKeys,
    dataStoresWith: dataStoresWith,
    dataStoresShaped: dataStoresShaped,
    dataStoreClass: dataStoreClass,
    dataShapeOk: dataShapeOk
  };
}
