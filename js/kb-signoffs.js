/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL SIGN-OFFS                                    */
/*                                                                  */
/* A sign-off is a clinician's attestation that they reviewed a     */
/* condition's engine wiring, urgency flag, ICD code and summary,   */
/* and found them correct. It is the most valuable human work in    */
/* this project — 394 conditions, reviewed one at a time — and it   */
/* is irreplaceable: nobody can regenerate it.                      */
/*                                                                  */
/* WHAT WAS WRONG BEFORE (fixed here)                               */
/*                                                                  */
/* 1. DATA LOSS. Sign-offs were written into the KB local-edits     */
/*    overlay, which is not in MIRROR_KEYS and not in the backup    */
/*    payload. A founder who verified 250 conditions and then       */
/*    cleared his browser, changed laptop, or reinstalled lost      */
/*    every one of them with nothing to restore from.               */
/*                                                                  */
/* 2. SIGNING OFF FROZE THE CONTENT. Verifying called               */
/*    kbApplyLocalConditionUpsert() with the WHOLE condition, so    */
/*    the attestation carried a full snapshot of the clinical       */
/*    content with it. A later improvement to that condition in the */
/*    shipped knowledge base would then be silently overwritten by  */
/*    the older local copy. An attestation must record that a       */
/*    review happened; it must not become a competing copy of the   */
/*    knowledge base.                                               */
/*                                                                  */
/* 3. NO WAY TO TELL A STALE ATTESTATION FROM A LIVE ONE. If the    */
/*    content changed after sign-off, the condition still showed as */
/*    verified — so a clinician's signature silently transferred to */
/*    text they had never read. That is the part that matters       */
/*    clinically, and it is what `hash` below exists for.           */
/*                                                                  */
/* THE MODEL                                                        */
/*                                                                  */
/*   { name, on, by, hash, kb_version }                             */
/*                                                                  */
/* `hash` is a fingerprint of the clinically meaningful fields at   */
/* the moment of sign-off. On load:                                 */
/*                                                                  */
/*   hash matches   → VERIFIED_BY_CLINICIAN. Never prompt again,    */
/*                    on this device or any device the sign-offs    */
/*                    reach, before or after a public release.      */
/*   hash differs   → the content changed since it was signed.      */
/*                    Shown as "re-review needed", naming the       */
/*                    previous sign-off. NOT silently verified,     */
/*                    and NOT silently thrown away.                 */
/*                                                                  */
/* The hash is a change detector, not a security control — it is a  */
/* plain synchronous string hash, because it must run over 394      */
/* conditions during boot with no network and no async.             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_SIGNOFF_STORE = "kb_signoffs";

/* The fields a clinician is actually attesting to. review_* is excluded:
   it changes as a RESULT of signing off, so including it would make every
   attestation instantly stale. */
var SIGNOFF_HASHED_FIELDS = [
  "name", "domain", "route", "req", "sup", "con",
  "temporal", "tests", "exclusions", "urgent", "icd"
];


/* ── Fingerprint ─────────────────────────────────────────────────
   Canonical: fields in a fixed order, arrays sorted, so a reordering
   that changes nothing clinically does not invalidate a signature. */

function signoffCanonical(cond) {
  var parts = [];
  for (var i = 0; i < SIGNOFF_HASHED_FIELDS.length; i++) {
    var k = SIGNOFF_HASHED_FIELDS[i];
    var v = cond ? cond[k] : undefined;
    if (Array.isArray(v)) {
      v = v.map(function (x) {
        return (x && typeof x === "object") ? JSON.stringify(x) : String(x);
      }).slice().sort();
    } else if (v === undefined || v === null) {
      v = "";
    }
    parts.push(k + "=" + (typeof v === "object" ? JSON.stringify(v) : String(v)));
  }
  return parts.join("|");
}

/* FNV-1a, 32-bit, hex. Deterministic across browsers and Node, fast enough
   to run over the whole KB at boot. Not a cryptographic hash and not used
   as one: it detects accidental content drift, not adversarial tampering. */
function signoffHash(cond) {
  var s = signoffCanonical(cond);
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8);
}


/* ── Storage ─────────────────────────────────────────────────────
   Its own store key, so sign-offs are mirrored and backed up as
   first-class clinic data rather than riding inside a content overlay.

   DELIBERATELY NOT vault-protected (it is absent from VAULT_PROTECTED in
   js/local-vault.js). A sign-off holds a condition name, a date, a reviewer
   name and a content fingerprint — no patient data — so encrypting it buys
   nothing, while leaving it readable means a locked device still boots with
   the knowledge base correctly marked. If it WERE protected, boot would read
   zero sign-offs behind the lock screen and put every verified condition back
   into the review queue, which is precisely the repeated prompting this
   module exists to prevent. */

function signoffLoad() {
  if (typeof loadStore !== "function") return {};
  var raw = loadStore(KB_SIGNOFF_STORE);
  return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
}

/* Returns whether the sign-offs are actually on disk. A sign-off that was
   not persisted must not be reported as saved. */
function signoffSave(map) {
  if (typeof saveStore !== "function") return false;
  return saveStore(KB_SIGNOFF_STORE, map || {}) !== false;
}

/* Record an attestation. Returns the record, or null if the condition
   is missing. */
function signoffRecord(cond, by, whenIso) {
  if (!cond || !cond.name) return null;
  var map = signoffLoad();
  var rec = {
    name: cond.name,
    on: (whenIso || new Date().toISOString()).slice(0, 10),
    by: by || "",
    hash: signoffHash(cond),
    kb_version: (typeof KB_VERSION !== "undefined") ? KB_VERSION : ""
  };
  map[cond.name] = rec;
  return signoffSave(map) ? rec : null;
}

function signoffRemove(name) {
  var map = signoffLoad();
  if (!map[name]) return false;
  delete map[name];
  return signoffSave(map);
}


/* ── State of one condition ──────────────────────────────────────
   "verified"   signed off, content unchanged since
   "stale"      signed off, but the content has changed since
   "unsigned"   never signed off                                    */

function signoffState(cond, map) {
  map = map || signoffLoad();
  if (!cond || !cond.name) return { state: "unsigned" };
  var rec = map[cond.name];
  if (!rec) return { state: "unsigned" };
  if (rec.hash && rec.hash !== signoffHash(cond)) {
    return { state: "stale", record: rec, reason: "The content changed after this sign-off." };
  }
  return { state: "verified", record: rec };
}

/* Apply every sign-off to the live knowledge base. Called once at boot,
   after the KB is assembled and after the baked-in knowledge/verified.js
   overlay. Returns a summary so the admin panel can report it. */
function signoffApplyAll(all) {
  all = all || (typeof KNOWLEDGE_ALL !== "undefined" ? KNOWLEDGE_ALL : []);
  var map = signoffLoad();
  var applied = 0, stale = 0;

  for (var i = 0; i < all.length; i++) {
    var cond = all[i];
    var st = signoffState(cond, map);
    if (st.state === "verified") {
      cond.review_status = "VERIFIED_BY_CLINICIAN";
      cond.icd_status = "VERIFIED_BY_CLINICIAN";
      cond.review_verified_on = st.record.on;
      cond.review_verified_by = st.record.by;
      cond.review_stale = false;
      applied++;
    } else if (st.state === "stale") {
      /* Deliberately NOT verified: the clinician signed different text.
         The old attestation is kept and surfaced so the re-review starts
         from "you approved this on <date>, here is what changed". */
      cond.review_status = "NEEDS_CLINICAL_REVIEW";
      cond.review_stale = true;
      cond.review_prev_on = st.record.on;
      cond.review_prev_by = st.record.by;
      stale++;
    }
  }
  return { applied: applied, stale: stale, total: all.length };
}

function signoffStats(all) {
  all = all || (typeof KNOWLEDGE_ALL !== "undefined" ? KNOWLEDGE_ALL : []);
  var map = signoffLoad();
  var verified = 0, staleN = 0, unsigned = 0;
  for (var i = 0; i < all.length; i++) {
    var st = signoffState(all[i], map);
    if (st.state === "verified") verified++;
    else if (st.state === "stale") staleN++;
    else unsigned++;
  }
  return { verified: verified, stale: staleN, unsigned: unsigned, total: all.length };
}


/* ── Portability ─────────────────────────────────────────────────
   The founder is not an engineer. Baking sign-offs into the source
   (knowledge/verified.js) still requires a commit, so it cannot be the
   ONLY route off a device. These two functions let him move his own work
   between machines, and recover it after a reinstall, with a file. */

function signoffExportPayload() {
  var map = signoffLoad();
  var names = Object.keys(map).sort();
  var out = [];
  for (var i = 0; i < names.length; i++) out.push(map[names[i]]);
  return {
    format: "entopic-signoffs",
    version: 1,
    exported_at: new Date().toISOString(),
    kb_version: (typeof KB_VERSION !== "undefined") ? KB_VERSION : "",
    count: out.length,
    signoffs: out
  };
}

/* Merge an exported payload into this device. Merge, never replace: two
   clinicians reviewing different halves on different machines must combine,
   and importing an older file must not delete newer work.

   Returns {ok, added, updated, skipped, stale, error}. `stale` counts
   sign-offs that import cleanly but whose condition text has since changed —
   they are imported and flagged, not silently accepted as current. */
function signoffImportPayload(payload) {
  if (!payload || payload.format !== "entopic-signoffs" || !Array.isArray(payload.signoffs)) {
    return { ok: false, error: "This is not an Entopic sign-off file." };
  }
  var map = signoffLoad();
  var added = 0, updated = 0, skipped = 0, stale = 0;

  for (var i = 0; i < payload.signoffs.length; i++) {
    var rec = payload.signoffs[i];
    if (!rec || !rec.name || !rec.hash) { skipped++; continue; }
    var existing = map[rec.name];
    if (existing) {
      /* Keep the LATER attestation. Equal dates keep what is already here. */
      if (String(rec.on || "") > String(existing.on || "")) { map[rec.name] = rec; updated++; }
      else skipped++;
    } else {
      map[rec.name] = rec;
      added++;
    }
    var cond = (typeof findCondition === "function") ? findCondition(rec.name) : null;
    if (cond && rec.hash !== signoffHash(cond)) stale++;
  }

  if (!signoffSave(map)) {
    return { ok: false, error: "Could not save the imported sign-offs — this device's storage is full." };
  }
  signoffApplyAll();
  return { ok: true, added: added, updated: updated, skipped: skipped, stale: stale };
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    KB_SIGNOFF_STORE: KB_SIGNOFF_STORE,
    signoffCanonical: signoffCanonical,
    signoffHash: signoffHash,
    signoffLoad: signoffLoad,
    signoffSave: signoffSave,
    signoffRecord: signoffRecord,
    signoffRemove: signoffRemove,
    signoffState: signoffState,
    signoffApplyAll: signoffApplyAll,
    signoffStats: signoffStats,
    signoffExportPayload: signoffExportPayload,
    signoffImportPayload: signoffImportPayload
  };
}
