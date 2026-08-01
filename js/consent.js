/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CONSENT LEDGER                                        */
/*                                                                  */
/* WHAT THIS IS FOR                                                */
/*                                                                  */
/* Entopic accumulates de-identified encounters so that, once there */
/* is enough of it, the data can support prevalence work, trends    */
/* and research. That is a legitimate and valuable goal — but only  */
/* if the consent behind it is sound, because:                      */
/*                                                                  */
/*   Research data with weak consent provenance is not an asset.    */
/*   It cannot be published, cannot be licensed, cannot survive an  */
/*   ethics review, and cannot be defended if challenged. Vague or  */
/*   buried consent does not increase what you may do with data —   */
/*   it destroys the option of ever doing anything with it.         */
/*                                                                  */
/* So this ledger is deliberately strict, and that strictness is    */
/* what preserves future optionality rather than limiting it:       */
/*                                                                  */
/*   · EXPLICIT.    Nothing is inferred. Silence is refusal.        */
/*   · GRANULAR.    Separate purposes, consented separately, so a   */
/*                  patient can allow one and decline another.      */
/*   · VERSIONED.   Each grant records WHICH WORDING was agreed to. */
/*                  When the wording changes, old grants are marked */
/*                  stale rather than silently reused.              */
/*   · ATTRIBUTED.  Who recorded it, and when.                      */
/*   · REVOCABLE.   Withdrawal purges the contributions, it does    */
/*                  not merely stop new ones. A revocation that     */
/*                  leaves the data behind is not a revocation.     */
/*                                                                  */
/* PRIMARY CARE USE IS NOT IN HERE. Documenting an exam to treat    */
/* the patient in front of you does not require a research consent, */
/* and gating it on one would be clinically wrong. This ledger      */
/* governs SECONDARY uses only.                                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CONSENT_STORE = "consents";

/* The purposes a patient can be asked about, each with the exact wording
   shown. Changing `text` REQUIRES bumping `version` — a stale grant is one
   given against wording nobody can now reproduce, which is worth nothing. */
var CONSENT_PURPOSES = [
  {
    id: "research_secondary",
    version: 1,
    label: "Research and population insights",
    text: "My de-identified examination data may be used for research, and to " +
          "study how common eye conditions are and how they change over time. " +
          "My name, date of birth and contact details are never included.",
    /* What actually leaves the record if this is granted. Shown to the
       patient verbatim, so the promise and the code cannot drift apart. */
    includes: ["age band", "sex", "symptoms and signs recorded", "the engine's differential",
               "referral category", "visit month"],
    excludes: ["name", "date of birth", "MRN", "address", "phone", "e-mail", "free-text notes"]
  },
  {
    id: "quality_improvement",
    version: 1,
    label: "Quality improvement in this practice",
    text: "My de-identified examination data may be used inside this practice to " +
          "review and improve the quality of care.",
    includes: ["the same de-identified fields as above, kept within this practice"],
    excludes: ["name", "date of birth", "MRN", "address", "phone", "e-mail", "free-text notes"]
  },
  {
    id: "product_improvement",
    version: 1,
    label: "Improving Entopic itself",
    text: "My de-identified examination data may be used to test and improve the " +
          "software's clinical knowledge base and its suggestions.",
    includes: ["the same de-identified fields as above"],
    excludes: ["name", "date of birth", "MRN", "address", "phone", "e-mail", "free-text notes"]
  }
];

var CONSENT_STATES = ["granted", "refused", "withdrawn", "not_asked"];

function consentPurpose(id) {
  for (var i = 0; i < CONSENT_PURPOSES.length; i++) {
    if (CONSENT_PURPOSES[i].id === id) return CONSENT_PURPOSES[i];
  }
  return null;
}


/* ── Ledger ──────────────────────────────────────────────────────
   { patientId: { purposeId: {state, at, by, text_version, note} } }   */

/* MEASURED: consentAllows() is on the hot path — it is asked once per visit
   save, and the corpus asks it for every capture. Reading through to the
   store meant a full JSON.parse of every patient's consent record on each
   call: profiled at 5.4 s for 5,000 checks against 1,200 patients, which was
   the single largest cost in the whole capture path.

   Cached in memory, invalidated on every write. Consent is small, read
   constantly, and written rarely — exactly the shape a cache is for. Writes
   still go straight through to the store, so durability is unchanged. */
var _consentCache = null;

function consentLoadAll() {
  if (_consentCache) return _consentCache;
  if (typeof loadStore !== "function") return {};
  var raw = loadStore(CONSENT_STORE, {});
  _consentCache = (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
  return _consentCache;
}

function consentSaveAll(map) {
  if (typeof saveStore !== "function") return false;
  var ok = saveStore(CONSENT_STORE, map || {}) !== false;
  /* On success the cache IS the saved map; on failure drop it so the next
     read comes from the store rather than from a change that never landed. */
  _consentCache = ok ? (map || {}) : null;
  return ok;
}

/* Drop the cache — after a restore or an import replaces the store. */
function consentResetCache() { _consentCache = null; }

/* The recorded answer, or "not_asked". NEVER defaults to granted — the whole
   point is that silence is not consent. */
function consentGet(patientId, purposeId) {
  if (!patientId || !purposeId) return { state: "not_asked" };
  var rec = (consentLoadAll()[patientId] || {})[purposeId];
  if (!rec) return { state: "not_asked" };
  return rec;
}

/* Is this purpose currently usable for this patient?

   False when: never asked, refused, withdrawn, OR granted against wording
   that has since changed. That last case is the one people get wrong — a
   patient who agreed to wording A has not agreed to wording B. */
function consentAllows(patientId, purposeId) {
  var rec = consentGet(patientId, purposeId);
  if (rec.state !== "granted") return false;
  var p = consentPurpose(purposeId);
  if (!p) return false;
  return rec.text_version === p.version;
}

/* Grants given against superseded wording. Surfaced so the practice can
   re-ask, rather than the data quietly falling out of the corpus. */
function consentStale(patientId) {
  var mine = consentLoadAll()[patientId] || {};
  var out = [];
  for (var id in mine) {
    if (!Object.prototype.hasOwnProperty.call(mine, id)) continue;
    var p = consentPurpose(id);
    if (mine[id].state === "granted" && p && mine[id].text_version !== p.version) {
      out.push({ purpose: id, agreed_version: mine[id].text_version, current_version: p.version });
    }
  }
  return out;
}

/* Record an answer. `state` must be granted / refused / withdrawn.
   Returns the record, or null if it could not be persisted — an unrecorded
   consent must never be reported as recorded. */
function consentSet(patientId, purposeId, state, by, nowIso) {
  if (!patientId) return null;
  var p = consentPurpose(purposeId);
  if (!p) return null;
  if (["granted", "refused", "withdrawn"].indexOf(state) === -1) return null;

  var all = consentLoadAll();
  all[patientId] = all[patientId] || {};
  var rec = {
    state: state,
    at: nowIso || new Date().toISOString(),
    by: by || "",
    text_version: p.version
  };
  all[patientId][purposeId] = rec;
  if (!consentSaveAll(all)) return null;

  if (typeof logAudit === "function") {
    try {
      logAudit("consent_" + state,
        "Consent for “" + p.label + "” recorded as " + state + " (wording v" + p.version + ")",
        { patient_id: patientId });
    } catch (e) {}
  }

  /* Withdrawal is not just "stop collecting". Anything already contributed
     under this purpose has to go, or the withdrawal is cosmetic. */
  if (state === "withdrawn" && typeof corpusPurgePatient === "function") {
    try { corpusPurgePatient(patientId, purposeId); } catch (e) {}
  }
  return rec;
}

/* Every patient still owing an answer on a purpose — the practice's worklist. */
function consentOutstanding(patients, purposeId) {
  var out = [];
  for (var i = 0; i < (patients || []).length; i++) {
    var pt = patients[i];
    if (!pt || pt.practice) continue;          /* practice records are not people */
    var rec = consentGet(pt.id, purposeId);
    if (rec.state === "not_asked") out.push(pt.id);
  }
  return out;
}

/* Practice-wide counts, for the admin and researcher views. */
function consentSummary(patients, purposeId) {
  var counts = { granted: 0, refused: 0, withdrawn: 0, not_asked: 0, stale: 0, total: 0 };
  for (var i = 0; i < (patients || []).length; i++) {
    var pt = patients[i];
    if (!pt || pt.practice) continue;
    counts.total++;
    var rec = consentGet(pt.id, purposeId);
    var st = CONSENT_STATES.indexOf(rec.state) >= 0 ? rec.state : "not_asked";
    counts[st]++;
    if (st === "granted" && !consentAllows(pt.id, purposeId)) counts.stale++;
  }
  return counts;
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CONSENT_STORE: CONSENT_STORE, CONSENT_PURPOSES: CONSENT_PURPOSES,
    consentPurpose: consentPurpose, consentGet: consentGet, consentSet: consentSet,
    consentAllows: consentAllows, consentStale: consentStale,
    consentOutstanding: consentOutstanding, consentSummary: consentSummary,
    consentLoadAll: consentLoadAll, consentResetCache: consentResetCache
  };
}
