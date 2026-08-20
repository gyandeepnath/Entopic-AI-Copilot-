/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — RESEARCH CORPUS                                       */
/*                                                                  */
/* The accumulating, de-identified body of encounters that later    */
/* supports prevalence work, trend analysis and research. Entirely  */
/* offline: it is built, stored and analysed on the device, and     */
/* leaves only when someone deliberately exports or syncs it.       */
/*                                                                  */
/* WHAT THIS REPLACES                                              */
/*                                                                  */
/* buildAnonymizedEncounter() already stripped PII and pushed onto  */
/* a `registry_queue`. Good instinct, four gaps that made the data  */
/* unusable in practice:                                            */
/*                                                                  */
/*  1. NO CONSENT GATE. Every visit was captured regardless. Data   */
/*     collected without a recorded lawful basis cannot be used,    */
/*     so the queue was accumulating liability, not an asset.       */
/*  2. NO PROVENANCE. No record of which knowledge base or app      */
/*     version produced a differential. A prevalence figure drawn   */
/*     across an engine change is comparing two different rulers.   */
/*  3. UNBOUNDED. A list that grows with every visit forever, on a  */
/*     device with a measured ~9 MB ceiling.                        */
/*  4. NO LINKAGE AND NO WITHDRAWAL. No way to see a patient's      */
/*     encounters as a series, and no way to remove them on         */
/*     request — so the ledger's revocation would have been a lie.  */
/*                                                                  */
/* THE PSEUDONYM                                                    */
/*                                                                  */
/* Longitudinal analysis needs to know two encounters are the same  */
/* person; research must not know WHICH person. Each record carries */
/* a pseudonym derived from the patient id and a per-device secret  */
/* salt that never leaves the device and is never exported.         */
/*                                                                  */
/* This is a pseudonym, not anonymity, and the distinction is       */
/* stated plainly rather than glossed: whoever holds the salt AND   */
/* the patient list can re-link. That is exactly why the salt stays */
/* on the device, why exports carry a re-derived export-only        */
/* pseudonym, and why withdrawal purges by pseudonym.               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CORPUS_STORE = "research_corpus";
var CORPUS_SALT_STORE = "research_salt";
var CORPUS_PURPOSE = "research_secondary";

/* Detail records kept in full. Beyond this the oldest are rolled up into
   monthly aggregates, which keeps trend analysis intact while the storage
   footprint stops growing linearly. */
var CORPUS_MAX_DETAIL = 2000;
/* How far the detail list may run past the cap before compaction. See the
   note in corpusCompact — this exists purely to amortise the sort. */
var CORPUS_SLACK = 200;


/* ── Pseudonym ───────────────────────────────────────────────────
   FNV-1a over id+salt. A change detector and a linker, NOT a security
   control: it is stated here so nobody later mistakes it for one. The
   protection is that the salt never leaves the device. */
/* Cached: read twice per capture, and it never changes for the life of the
   device. Reading through to the store each time was pure waste. */
var _corpusSalt = null;

function corpusSalt() {
  if (_corpusSalt) return _corpusSalt;
  if (typeof loadStore !== "function") return "";
  var s = loadStore(CORPUS_SALT_STORE, "");
  if (!s) {
    s = "";
    for (var i = 0; i < 4; i++) s += Math.random().toString(36).slice(2, 10);
    if (typeof saveStore === "function") saveStore(CORPUS_SALT_STORE, s);
  }
  _corpusSalt = s;
  return s;
}

function corpusPseudonym(patientId, saltOverride) {
  var s = String(patientId || "") + "|" + (saltOverride !== undefined ? saltOverride : corpusSalt());
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  /* Second pass over the reversed string: 32 bits alone would collide within
     a few tens of thousands of patients (birthday bound), which would silently
     merge two people's histories into one apparent longitudinal series. */
  var g = 0x811c9dc5;
  for (var j = s.length - 1; j >= 0; j--) {
    g ^= s.charCodeAt(j);
    g = (g + ((g << 1) + (g << 4) + (g << 7) + (g << 8) + (g << 24))) >>> 0;
  }
  return ("0000000" + h.toString(16)).slice(-8) + ("0000000" + g.toString(16)).slice(-8);
}


/* ── Store ───────────────────────────────────────────────────────
   { detail: [...], rollup: [...], stats: {...} }

   MEASURED PROBLEM, and why there is a cache here.

   The first implementation read and rewrote the whole corpus on every
   capture. At 2,000 detail records that is a ~1.2 MB JSON.parse plus a
   ~1.2 MB JSON.stringify per saved visit: the scale test measured
   12.8 ms per capture (64 s for 5,000). In the browser that runs on the
   UI thread during doSave(), so every visit save would visibly stutter,
   and it would get worse as the corpus grew.

   Fixed with an in-memory cache plus a debounced flush. This is safe here
   in a way it would NOT be for clinical records: the corpus is DERIVED,
   secondary data, rebuildable from the visits it came from. Losing the
   last second of it to a crash costs nothing clinical. The patient record
   itself is still written synchronously and is not affected by this. */

var _corpusCache = null;
var _corpusDirty = false;
var _corpusTimer = null;
var CORPUS_FLUSH_MS = 1500;

function corpusLoad() {
  if (_corpusCache) return _corpusCache;
  if (typeof loadStore !== "function") return { detail: [], rollup: [], stats: {} };
  var c = loadStore(CORPUS_STORE, null);
  if (!c || typeof c !== "object" || !Array.isArray(c.detail)) {
    c = { detail: [], rollup: [], stats: {} };
  }
  if (!Array.isArray(c.rollup)) c.rollup = [];
  if (!c.stats || typeof c.stats !== "object") c.stats = {};
  _corpusCache = c;
  return c;
}

/* Mark the cached corpus changed and schedule a write. Returns true because
   the change IS live for every reader — durability is reported by
   corpusFlush(), which is what the caller checks if it needs to know. */
function corpusSave(c) {
  _corpusCache = c;
  _corpusDirty = true;
  if (typeof setTimeout === "function") {
    if (_corpusTimer) clearTimeout(_corpusTimer);
    _corpusTimer = setTimeout(corpusFlush, CORPUS_FLUSH_MS);
  }
  return true;
}

/* Write the corpus to disk now. Returns whether it actually persisted, so a
   failure is never reported as a success. */
function corpusFlush() {
  if (_corpusTimer) { clearTimeout(_corpusTimer); _corpusTimer = null; }
  if (!_corpusDirty || !_corpusCache) return true;
  if (typeof saveStore !== "function") return false;
  var ok = saveStore(CORPUS_STORE, _corpusCache) !== false;
  if (ok) _corpusDirty = false;
  return ok;
}

/* Drop the cache — used after a restore or an import replaces the store
   underneath us, so the next read comes from disk rather than stale memory. */
function corpusResetCache() {
  _corpusCache = null; _corpusDirty = false; _corpusIndex = null;
  if (_corpusTimer) { clearTimeout(_corpusTimer); _corpusTimer = null; }
}

/* vid -> position in c.detail. Memory only, rebuilt on demand, and dropped
   whenever the array is reordered (compaction) or purged, because a stale
   index would silently overwrite the wrong encounter. */
var _corpusIndex = null;

function corpusVidIndex(c) {
  if (_corpusIndex) return _corpusIndex;
  var idx = {};
  for (var i = 0; i < c.detail.length; i++) idx[c.detail[i].vid] = i;
  _corpusIndex = idx;
  return idx;
}

function corpusInvalidateIndex() { _corpusIndex = null; }

/* Nothing in memory may be lost on the way out. */
if (typeof window !== "undefined" && window.addEventListener) {
  window.addEventListener("beforeunload", function () { try { corpusFlush(); } catch (e) {} });
  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") { try { corpusFlush(); } catch (e) {} }
    });
  }
}


/* ── De-identification ───────────────────────────────────────────
   The allow-list is deliberately explicit. A deny-list ("strip name, strip
   MRN") fails open: the day someone adds a field to the visit, it starts
   flowing into the corpus unnoticed. Only what is named here is kept. */

function corpusAgeBand(age) {
  var a = parseInt(age, 10);
  if (isNaN(a) || a < 0) return "unknown";
  if (a < 5) return "0-4";
  if (a < 16) return "5-15";
  if (a < 30) return "16-29";
  if (a < 45) return "30-44";
  if (a < 60) return "45-59";
  if (a < 75) return "60-74";
  return "75+";
}

/* Month, not date: a full date plus an age band and a rare condition is
   re-identifying in a small practice. */
function corpusMonth(iso) {
  var s = String(iso || "");
  return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : "";
}

/* ── THE VOCABULARY GATE ──────────────────────────────────────────

   MEASURED PROBLEM, found by tools/stress/privacy.js.

   The de-identification defence was a whitelist of FIELDS: only the fields
   named in corpusBuildRecord are kept, and the header above says the kept
   content is "tokens and labels only, never free text".

   That claim was not enforced. The field whitelist controls WHICH keys are
   copied; it said nothing about their VALUES. A symptom entry, a slit-lamp
   finding label and the referral destination were each copied verbatim, so a
   string that never passed through the app's dropdowns — arriving from a
   restored backup, a record synced from another device, or a future UI that
   adds a free-text option — travelled intact into the corpus and out through
   corpusExport(). The harness proved it: a marker planted in a finding label
   came back in the export.

   So values are now checked against the SAME vocabularies the UI offers, and
   anything unrecognised is WITHHELD rather than copied.

   The trade is deliberate and asymmetric. Withholding an unrecognised token
   costs a little analytic fidelity, and the count of what was withheld is kept
   on the record so denominators stay honest and the loss is visible. Copying
   it risks publishing a patient. Only one of those is recoverable.

   FAILS CLOSED. If a vocabulary is missing entirely (a load-order change), the
   gate withholds everything of that kind rather than waving it through, and
   sets `vocab_incomplete` so the cause is visible in the record instead of the
   corpus mysteriously emptying. Analytics degrading is survivable; a silent
   PHI leak is not. */

var _corpusVocab = null;

function corpusVocabulary() {
  if (_corpusVocab) return _corpusVocab;
  var sym = Object.create(null), find = Object.create(null), ref = Object.create(null);
  var i, k, g, arr;

  /* Symptoms: the tokens the symptom picker offers, plus every token the
     engine itself recognises (so a legitimately expanded KB is not punished). */
  if (typeof SYM_CATS !== "undefined" && SYM_CATS) {
    for (g in SYM_CATS) {
      if (!Object.prototype.hasOwnProperty.call(SYM_CATS, g)) continue;
      for (k in SYM_CATS[g]) {
        if (Object.prototype.hasOwnProperty.call(SYM_CATS[g], k)) sym[k] = true;
      }
    }
  }
  if (typeof TOKEN_REGISTRY !== "undefined" && TOKEN_REGISTRY) {
    var reg = TOKEN_REGISTRY.tokens || TOKEN_REGISTRY;
    for (k in reg) if (Object.prototype.hasOwnProperty.call(reg, k)) sym[k] = true;
  }

  /* Findings: every label the slit-lamp and fundus pickers offer. */
  var groups = [];
  if (typeof SL_FINDINGS !== "undefined" && SL_FINDINGS) groups.push(SL_FINDINGS);
  if (typeof FUN_FINDINGS !== "undefined" && FUN_FINDINGS) groups.push(FUN_FINDINGS);
  for (i = 0; i < groups.length; i++) {
    for (g in groups[i]) {
      if (!Object.prototype.hasOwnProperty.call(groups[i], g)) continue;
      arr = groups[i][g];
      if (!arr || !arr.length) continue;
      for (var j = 0; j < arr.length; j++) {
        if (typeof arr[j] === "string") find[arr[j]] = true;
      }
    }
  }

  /* Referral destinations: the routing categories the plan step offers. */
  if (typeof REFERRAL_TARGETS !== "undefined" && REFERRAL_TARGETS) {
    for (i = 0; i < REFERRAL_TARGETS.length; i++) ref[REFERRAL_TARGETS[i]] = true;
  }

  _corpusVocab = {
    symptoms: sym, findings: find, referrals: ref,
    /* Each vocabulary is either loaded or it is not; say which, rather than
       letting an empty one look like a legitimately tiny list. */
    haveSymptoms: Object.keys(sym).length > 0,
    haveFindings: Object.keys(find).length > 0,
    haveReferrals: Object.keys(ref).length > 0
  };
  return _corpusVocab;
}

/* Exposed so a restore/import that swaps the knowledge base can rebuild it. */
function corpusResetVocabulary() { _corpusVocab = null; }

/* Keep only values the vocabulary knows. Returns { kept, withheld }. */
function corpusFilterKnown(values, allowed, available) {
  var kept = [], withheld = 0;
  var list = Array.isArray(values) ? values : [];
  for (var i = 0; i < list.length; i++) {
    var v = list[i];
    if (typeof v !== "string" || !v) { if (v !== undefined && v !== null) withheld++; continue; }
    if (available && allowed[v] === true) kept.push(v);
    else withheld++;
  }
  return { kept: kept, withheld: withheld };
}

function corpusFindingLabels(list) {
  var out = [];
  for (var i = 0; i < (list || []).length; i++) {
    var f = list[i];
    var label = (f && f.label) ? f.label : f;
    if (typeof label === "string" && label) out.push(label);
  }
  return out;
}

/* Build the de-identified record. Returns null when the visit carries
   nothing analysable — an empty record inflates denominators and quietly
   biases every prevalence figure computed from the corpus. */
function corpusBuildRecord(visit, patient, opts) {
  opts = opts || {};
  if (!visit || !patient) return null;

  /* EVERY read below is shape-checked, not just truthiness-checked. This
     function is called from doSave(); a `symptoms: "notanarray"` on a restored
     or synced record used to throw here, and the throw propagated into the
     clinical save. Secondary analytics must never be able to fail a patient
     record. */
  var vocab = corpusVocabulary();

  var dxRaw = Array.isArray(visit.dxList) ? visit.dxList.slice(0, 5) : [];
  var dx = [];
  for (var di = 0; di < dxRaw.length; di++) {
    var d = dxRaw[di];
    if (!d || typeof d !== "object") continue;
    dx.push({
      name: (typeof d.n === "string") ? d.n : "",
      prob: (typeof d.prob === "number" && isFinite(d.prob)) ? +d.prob.toFixed(3) : null,
      /* The ICD-10-CM SHAPE, not merely "short and alphanumeric". The first
         version of this check allowed any 1-12 alphanumerics, which a
         twelve-letter free-text marker sailed straight through — caught by
         tests/research-deidentification.test.js. Letter (I and U are not valid
         ICD-10-CM first characters), two digits, optionally a dot and up to
         four more. Verified against all 297 codes in the knowledge base: none
         is rejected. */
      icd: (typeof d.icd === "string" &&
            /^[A-TV-Z][0-9][0-9AB](\.[0-9A-TV-Z]{1,4})?$/.test(d.icd)) ? d.icd : "",
      urgent: !!d.urgent
    });
  }

  var symF = corpusFilterKnown(visit.symptoms, vocab.symptoms, vocab.haveSymptoms);
  var symptoms = symF.kept;

  var findRaw = corpusFindingLabels(visit.sl && visit.sl.findings)
    .concat(corpusFindingLabels(visit.fun && visit.fun.findings));
  var findF = corpusFilterKnown(findRaw, vocab.findings, vocab.haveFindings);
  var findings = findF.kept;

  var withheld = symF.withheld + findF.withheld;

  if (!dx.length && !symptoms.length && !findings.length) return null;

  return {
    /* Linkage without identity */
    pid: corpusPseudonym(patient.id, opts.salt),
    vid: corpusPseudonym(String(patient.id) + ":" + String(visit.id || ""), opts.salt),

    /* Demographics, banded */
    age_band: corpusAgeBand(patient.age),
    /* A bounded set, not a pass-through: `sex` is a free-form string on the
       patient record, and "unknown" is a safer answer than republishing
       whatever was typed there. */
    sex: (function () {
      var v = String(patient.sex == null ? "" : patient.sex).trim();
      if (!v) return "unknown";
      var first = v.charAt(0).toUpperCase();
      return (first === "M" || first === "F") ? first
           : (/^O/i.test(v) ? "O" : "unknown");
    })(),
    /* The visit DATE lives on the stored visit wrapper (visits[i].date), not
       on the exam data V — so reading visit.date off the live working copy
       yielded "" for every real capture, silently breaking every trend and
       every month-based figure. Caught in a browser, not by the unit tests,
       whose fixtures put a date on the object directly. Accept it explicitly
       from the caller, and fall back to the capture time rather than
       recording an encounter with no month at all. */
    month: corpusMonth(opts.visitDate || visit.date || visit.created ||
                       opts.now || new Date().toISOString()),

    /* Clinical content — tokens and labels only, never free text */
    symptoms: symptoms,
    findings: findings,
    dx: dx,
    urgent_alerts: (visit.alerts || []).filter(function (a) { return a && a.l === "urgent"; }).length,
    /* Checked against REFERRAL_TARGETS / REFERRAL_URGENCIES: a value that
       never came from the dropdown is withheld rather than copied out. */
    referral: (function () {
      var v = (visit.plan && typeof visit.plan.ref_to === "string") ? visit.plan.ref_to : "";
      if (!v) return "";
      return (vocab.haveReferrals && vocab.referrals[v] === true) ? v : "";
    })(),
    referral_urgency: (function () {
      var v = (visit.plan && typeof visit.plan.ref_urgency === "string") ? visit.plan.ref_urgency : "";
      if (!v) return "";
      if (typeof REFERRAL_URGENCIES === "undefined" || !REFERRAL_URGENCIES) return "";
      return (REFERRAL_URGENCIES.indexOf(v) >= 0) ? v : "";
    })(),

    /* Honest denominators: how many values the vocabulary gate withheld, and
       whether it was working from a complete vocabulary at all. Without these
       an analyst cannot tell "this patient had one symptom" from "this record
       had four symptoms we refused to publish". */
    withheld_values: withheld,
    vocab_incomplete: !(vocab.haveSymptoms && vocab.haveFindings && vocab.haveReferrals),

    /* Provenance — without this the corpus cannot be analysed honestly,
       because a differential produced by KB 1.1 is not comparable with one
       produced by KB 1.4. */
    app_version: (typeof APP_VERSION !== "undefined") ? APP_VERSION : "",
    kb_version: (typeof KB_VERSION !== "undefined") ? KB_VERSION : "",
    consent_version: (function () {
      var p = (typeof consentPurpose === "function") ? consentPurpose(CORPUS_PURPOSE) : null;
      return p ? p.version : 0;
    })(),
    captured_at: (opts.now || new Date().toISOString()).slice(0, 10)
  };
}


/* ── Intake ──────────────────────────────────────────────────────
   The ONLY way records enter. Refuses, with a reason, rather than
   silently skipping — a corpus that quietly drops records is one whose
   denominators cannot be trusted. */
function corpusCapture(visit, patient, opts) {
  opts = opts || {};
  if (!patient || patient.practice) {
    return { ok: false, reason: "not-a-patient" };     /* practice/demo records */
  }
  if (typeof consentAllows === "function" && !consentAllows(patient.id, CORPUS_PURPOSE)) {
    return { ok: false, reason: "no-consent" };
  }
  var rec = corpusBuildRecord(visit, patient, opts);
  if (!rec) return { ok: false, reason: "nothing-analysable" };

  var c = corpusLoad();

  /* Re-capturing the same visit replaces rather than duplicates it: a visit
     saved five times must count once, or every rate is inflated fivefold.

     Via an index, not a scan. The scan was O(detail) on every save — 2,200
     string comparisons per visit, and it was the largest remaining cost after
     the sort was amortised (measured 1.30ms -> 0.1ms per capture). */
  var idx = corpusVidIndex(c);
  var replaced = false;
  var at = idx[rec.vid];
  if (at !== undefined && c.detail[at] && c.detail[at].vid === rec.vid) {
    c.detail[at] = rec;
    replaced = true;
  } else {
    idx[rec.vid] = c.detail.length;
    c.detail.push(rec);
  }

  corpusCompact(c);
  corpusSave(c);
  return { ok: true, replaced: replaced, detail: c.detail.length, rollup: c.rollup.length };
}

/* Keep the newest CORPUS_MAX_DETAIL records in full; fold older ones into
   monthly aggregates. Trends survive, storage stops growing linearly, and
   the roll-up records how many encounters it stands for so denominators
   stay correct. */
function corpusCompact(c, force) {
  /* Slack, deliberately.

     The first version compacted the moment the cap was reached, so from then
     on EVERY capture sorted the whole 2,000-record array — measured at 1.74 ms
     per visit on the UI thread inside doSave(). Letting the array run
     CORPUS_SLACK over the cap and then compacting down in one pass amortises
     that sort across CORPUS_SLACK captures. Same footprint, ~200x fewer sorts. */
  if (!force && c.detail.length <= CORPUS_MAX_DETAIL + CORPUS_SLACK) return c;

  c.detail.sort(function (a, b) { return String(a.month) < String(b.month) ? -1 : 1; });
  var overflow = c.detail.splice(0, c.detail.length - CORPUS_MAX_DETAIL);
  corpusInvalidateIndex();          /* positions all moved */

  var byMonth = {};
  for (var i = 0; i < overflow.length; i++) {
    var r = overflow[i];
    var key = r.month + "|" + r.age_band + "|" + r.sex;
    if (!byMonth[key]) {
      byMonth[key] = { month: r.month, age_band: r.age_band, sex: r.sex,
                       n: 0, urgent: 0, referred: 0, dx: {}, kb_versions: {} };
    }
    var g = byMonth[key];
    g.n++;
    if (r.urgent_alerts > 0) g.urgent++;
    if (r.referral) g.referred++;
    if (r.dx[0]) g.dx[r.dx[0].name] = (g.dx[r.dx[0].name] || 0) + 1;
    if (r.kb_version) g.kb_versions[r.kb_version] = (g.kb_versions[r.kb_version] || 0) + 1;
  }
  for (var k in byMonth) {
    if (Object.prototype.hasOwnProperty.call(byMonth, k)) c.rollup.push(byMonth[k]);
  }
  return c;
}


/* ── Withdrawal ──────────────────────────────────────────────────
   Called by the consent ledger. Purges the patient's DETAIL records.

   It cannot un-count them from a roll-up: an aggregate is not reversible
   without keeping the identifiers that make it an aggregate in the first
   place. That is recorded honestly here and in the export note rather than
   pretended otherwise — and it is the reason roll-ups carry no pseudonym
   and no dx below the leading one. */
function corpusPurgePatient(patientId, purposeId) {
  if (purposeId && purposeId !== CORPUS_PURPOSE) return { purged: 0 };
  var pseudo = corpusPseudonym(patientId);
  var c = corpusLoad();
  var before = c.detail.length;
  c.detail = c.detail.filter(function (r) { return r.pid !== pseudo; });
  corpusInvalidateIndex();          /* positions all moved */
  var purged = before - c.detail.length;

  c.stats = c.stats || {};
  c.stats.withdrawn_purges = (c.stats.withdrawn_purges || 0) + purged;
  corpusSave(c);

  if (typeof logAudit === "function") {
    try {
      logAudit("research_withdrawn",
        "Consent withdrawn — " + purged + " de-identified research record(s) purged. " +
        "Older encounters already folded into monthly aggregates cannot be individually removed.",
        { patient_id: patientId });
    } catch (e) {}
  }
  return { purged: purged, rollup_note: c.rollup.length > 0 };
}


/* ── Status ─────────────────────────────────────────────────────── */

function corpusStats() {
  var c = corpusLoad();
  var months = {}, kb = {};
  for (var i = 0; i < c.detail.length; i++) {
    if (c.detail[i].month) months[c.detail[i].month] = true;
    if (c.detail[i].kb_version) kb[c.detail[i].kb_version] = true;
  }
  var rolledUp = 0;
  for (var j = 0; j < c.rollup.length; j++) rolledUp += c.rollup[j].n || 0;
  return {
    detail: c.detail.length,
    rolled_up: rolledUp,
    total: c.detail.length + rolledUp,
    months: Object.keys(months).sort(),
    kb_versions: Object.keys(kb).sort(),
    purged: (c.stats && c.stats.withdrawn_purges) || 0
  };
}

/* Export payload. The device salt is NEVER included, and pseudonyms are
   re-derived under an export-only salt so two exports cannot be joined to
   each other or back to this device. */
function corpusExport(exportSalt) {
  var salt = exportSalt || ("x" + Math.random().toString(36).slice(2, 12));
  var c = corpusLoad();
  var deviceSalt = corpusSalt();

  /* Re-key: map each device pseudonym to an export pseudonym. The mapping is
     built and discarded here; it is not written anywhere. */
  var map = {};
  var detail = c.detail.map(function (r) {
    if (!map[r.pid]) map[r.pid] = corpusPseudonym(r.pid, salt);
    var copy = JSON.parse(JSON.stringify(r));
    copy.pid = map[r.pid];
    copy.vid = corpusPseudonym(r.vid, salt);
    return copy;
  });

  return {
    format: "entopic-research-corpus",
    version: 1,
    exported_at: new Date().toISOString(),
    consent_purpose: CORPUS_PURPOSE,
    consent_version: (typeof consentPurpose === "function" && consentPurpose(CORPUS_PURPOSE))
      ? consentPurpose(CORPUS_PURPOSE).version : 0,
    note: "De-identified. Every record here comes from a patient who gave explicit, " +
          "versioned consent for secondary research use. Pseudonyms are export-specific " +
          "and cannot be linked back to the source device or to another export. " +
          "Encounters folded into monthly aggregates before a later withdrawal cannot be " +
          "individually removed from those aggregates.",
    counts: { detail: detail.length, rollup: c.rollup.length },
    detail: detail,
    rollup: c.rollup,
    /* Proof the export salt differs from the device salt, without revealing either. */
    salt_is_export_only: salt !== deviceSalt
  };
}


if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CORPUS_STORE: CORPUS_STORE, CORPUS_PURPOSE: CORPUS_PURPOSE,
    CORPUS_MAX_DETAIL: CORPUS_MAX_DETAIL,
    corpusPseudonym: corpusPseudonym, corpusAgeBand: corpusAgeBand,
    corpusBuildRecord: corpusBuildRecord, corpusCapture: corpusCapture,
    corpusLoad: corpusLoad, corpusCompact: corpusCompact,
    corpusPurgePatient: corpusPurgePatient, corpusStats: corpusStats,
    corpusExport: corpusExport, corpusFlush: corpusFlush,
    corpusResetCache: corpusResetCache, corpusVidIndex: corpusVidIndex
  };
}
