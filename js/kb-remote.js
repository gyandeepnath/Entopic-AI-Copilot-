/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — REMOTE KNOWLEDGE BASE UPDATES                          */
/*                                                                  */
/* Lets the build owner publish KB updates (expansions, corrections, */
/* re-wired exclusions/tokens) to the cloud `kb_versions` table and  */
/* have every installation pick them up — no app rebuild, as often   */
/* as needed.                                                        */
/*                                                                  */
/* Design rules (non-negotiable):                                    */
/*  1. OFFLINE-FIRST. The bundled KB always works. A downloaded      */
/*     bundle is cached in localStorage and applied from cache at    */
/*     boot — network is never required to run an exam.              */
/*  2. FAIL-CLOSED. A bundle that fails validation is rejected and   */
/*     the current KB stays. Any error → keep what works.            */
/*  3. NEVER MID-EXAM. A new bundle downloaded while an exam is open */
/*     is cached and applied at the next boot (or from the dashboard */
/*     when no exam is open) — the differential never shifts under    */
/*     the clinician's feet.                                          */
/*  4. SAFETY RAIL. A bundle that DROPS any urgent condition the     */
/*     shipped KB knows is rejected (protects sight-threatening       */
/*     entries from accidental deletion; they can still be EDITED).  */
/*  5. Red-flag alerts and the advisory-only framing live in CODE,   */
/*     not in the KB — no remote bundle can disable them.            */
/*                                                                  */
/* Publishing (owner only): `node tools/seed-cloud-kb.js --version   */
/* X.Y.Z` → apply the SQL. RLS: kb_versions is world-READABLE for    */
/* published rows and has NO client write path.                      */
/*                                                                  */
/* Load order: after knowledge/loader.js (needs KNOWLEDGE_ALL,        */
/* rebuildKbIndexes, KB_META) and after js/cloud-config.js.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var KB_REMOTE = {
  cacheKey: "entopic_kb_bundle",
  minConditions: 100,          /* a real bundle can never be smaller */
  lastCheck: null,
  lastError: null,
  pendingVersion: null,        /* downloaded, deferred (exam was open) */
  appliedVersion: null,        /* remote version currently live */
  checkTimer: null
};

/* Urgent conditions the SHIPPED KB knows — frozen at first load, before
   any remote bundle applies. A bundle missing any of these is rejected. */
var KB_REMOTE_SHIPPED_URGENT = (function () {
  var names = [];
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
      if (KNOWLEDGE_ALL[i].urgent) names.push(KNOWLEDGE_ALL[i].name);
    }
  }
  return names;
})();

/* ── validation (pure; unit-tested) ── */
function validateKbBundle(bundle) {
  var errors = [];
  var count = 0;
  var seen = {};

  function isStrArray(a) {
    if (!a) return true; /* missing → defaulted on apply */
    if (Object.prototype.toString.call(a) !== "[object Array]") return false;
    for (var i = 0; i < a.length; i++) {
      if (typeof a[i] !== "string" || a[i].length === 0) return false;
    }
    return true;
  }

  if (!bundle || typeof bundle !== "object" ||
      Object.prototype.toString.call(bundle) === "[object Array]") {
    return { ok: false, errors: ["bundle must be an object of domain → conditions[]"], count: 0 };
  }

  for (var domain in bundle) {
    if (!bundle.hasOwnProperty(domain)) continue;
    var conds = bundle[domain];
    if (Object.prototype.toString.call(conds) !== "[object Array]") {
      errors.push("domain '" + domain + "' is not an array");
      continue;
    }
    for (var i = 0; i < conds.length; i++) {
      var c = conds[i];
      var where = domain + "[" + i + "]";
      if (!c || typeof c !== "object") { errors.push(where + ": not an object"); continue; }
      if (typeof c.name !== "string" || c.name.length === 0) { errors.push(where + ": missing name"); continue; }
      if (seen[c.name]) errors.push(where + ": duplicate name '" + c.name + "'");
      seen[c.name] = true;
      if (typeof c.route !== "string" || c.route.length === 0) errors.push(c.name + ": missing route");
      var fields = ["req", "sup", "con", "temporal", "tests", "exclusions"];
      for (var f = 0; f < fields.length; f++) {
        if (!isStrArray(c[fields[f]])) errors.push(c.name + ": " + fields[f] + " must be an array of strings");
      }
      if (c.urgent !== undefined && typeof c.urgent !== "boolean") errors.push(c.name + ": urgent must be boolean");
      count++;
    }
  }

  if (count < KB_REMOTE.minConditions) {
    errors.push("bundle has only " + count + " conditions (minimum " + KB_REMOTE.minConditions + ")");
  }
  /* safety rail: shipped urgent conditions must survive (edits allowed) */
  for (var u = 0; u < KB_REMOTE_SHIPPED_URGENT.length; u++) {
    if (!seen[KB_REMOTE_SHIPPED_URGENT[u]]) {
      errors.push("bundle drops shipped urgent condition '" + KB_REMOTE_SHIPPED_URGENT[u] + "'");
    }
  }

  return { ok: errors.length === 0, errors: errors, count: count };
}

/* ── version compare (semver-ish; pure) ── */
function kbVersionNewer(candidate, current) {
  if (typeof candidate !== "string" || candidate.length === 0) return false;
  if (typeof current !== "string" || current.length === 0) return true;
  var a = candidate.split(".");
  var b = current.split(".");
  var n = Math.max(a.length, b.length);
  for (var i = 0; i < n; i++) {
    var x = parseInt(a[i], 10); if (isNaN(x)) x = 0;
    var y = parseInt(b[i], 10); if (isNaN(y)) y = 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/* ── decision: apply now, defer, or skip (pure; unit-tested) ── */
function kbRemoteDecision(candidateVersion, currentVersion, examOpen, valid) {
  if (!valid) return "reject";
  if (!kbVersionNewer(candidateVersion, currentVersion)) return "skip";
  return examOpen ? "defer" : "apply";
}

/* ── apply a validated bundle to the live KB ── */
function kbApplyBundle(bundle, version, notes) {
  var newAll = [];
  var idx = 0;
  /* mutate the existing globals in place so every holder of a reference
     (engine loops, KB info modal) sees the new content */
  for (var d in KNOWLEDGE_DOMAINS) {
    if (KNOWLEDGE_DOMAINS.hasOwnProperty(d)) delete KNOWLEDGE_DOMAINS[d];
  }
  for (var domain in bundle) {
    if (!bundle.hasOwnProperty(domain)) continue;
    var conds = bundle[domain];
    var domainList = [];
    for (var i = 0; i < conds.length; i++) {
      var c = conds[i];
      if (!c.req)        c.req = [];
      if (!c.sup)        c.sup = [];
      if (!c.con)        c.con = [];
      if (!c.temporal)   c.temporal = [];
      if (!c.tests)      c.tests = [];
      if (!c.exclusions) c.exclusions = [];
      /* ICD backfill for entries that don't carry a code (same rule as
         the loader: keep any code already present) */
      if (typeof ICD_MAP !== "undefined" && ICD_MAP[c.name]) {
        if (!c.icd) c.icd = ICD_MAP[c.name].icd10;
        if (!c.icd_label) c.icd_label = ICD_MAP[c.name].label;
        if (!c.icd_status) c.icd_status = ICD_MAP[c.name].status;
      }
      c._domain = domain;
      c._index = idx++;
      domainList.push(c);
      newAll.push(c);
    }
    KNOWLEDGE_DOMAINS[domain] = domainList;
  }
  KNOWLEDGE_ALL.length = 0;
  for (var k = 0; k < newAll.length; k++) KNOWLEDGE_ALL.push(newAll[k]);
  rebuildKbIndexes();

  if (typeof KB_META !== "undefined") {
    KB_META.version = version;
    KB_META.conditions = KNOWLEDGE_ALL.length;
    KB_META.domains = Object.keys(KNOWLEDGE_DOMAINS).length;
    KB_META.source = "remote update";
    if (notes) KB_META.notes = notes;
  }
  KB_REMOTE.appliedVersion = version;
  KB_REMOTE.pendingVersion = null;
  return KNOWLEDGE_ALL.length;
}

/* ── cache (localStorage; survives offline restarts) ── */
function kbRemoteReadCache() {
  if (typeof localStorage === "undefined") return null;
  try {
    var raw = localStorage.getItem(KB_REMOTE.cacheKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}
function kbRemoteWriteCache(version, notes, bundle) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KB_REMOTE.cacheKey, JSON.stringify({
      version: version, notes: notes || "", bundle: bundle,
      cached_at: new Date().toISOString()
    }));
  } catch (e) {
    /* quota — a huge KB may not fit next to clinic data; not fatal */
    KB_REMOTE.lastError = "cache write failed: " + (e && e.message);
  }
}

/* ── background check against the cloud (never blocks anything) ── */
function kbRemoteCheck(cb) {
  if (typeof CLOUD_CONFIG === "undefined" || !CLOUD_CONFIG.enabled ||
      typeof fetch !== "function") { cb && cb(null, "disabled"); return; }
  var url = CLOUD_CONFIG.url +
    "/rest/v1/kb_versions?select=version,notes,bundle,created_at" +
    "&published=eq.true&order=created_at.desc&limit=1";
  fetch(url, {
    headers: { "apikey": CLOUD_CONFIG.anonKey, "Authorization": "Bearer " + CLOUD_CONFIG.anonKey }
  }).then(function (res) { return res.json(); }).then(function (rows) {
    KB_REMOTE.lastCheck = new Date().toISOString();
    if (!rows || !rows.length || !rows[0].bundle) { cb && cb(null, "none"); return; }
    var row = rows[0];
    var current = (typeof KB_META !== "undefined" && KB_META.version) || "0";
    var v = validateKbBundle(row.bundle);
    var examOpen = (typeof CV !== "undefined") && !!CV;
    var decision = kbRemoteDecision(row.version, current, examOpen, v.ok);
    if (decision === "reject") {
      KB_REMOTE.lastError = "bundle " + row.version + " rejected: " + v.errors.slice(0, 3).join("; ");
      console.warn("Entopic KB update rejected:", v.errors);
      cb && cb(null, "rejected");
      return;
    }
    if (decision === "skip") { cb && cb(null, "current"); return; }
    kbRemoteWriteCache(row.version, row.notes, row.bundle);
    if (decision === "defer") {
      KB_REMOTE.pendingVersion = row.version;
      cb && cb(null, "deferred");
      return;
    }
    kbApplyBundle(row.bundle, row.version, row.notes);
    /* keep any local edits not yet in the published bundle */
    try { kbReplayLocalEdits(); } catch (e3) {}
    console.log("Entopic KB updated remotely to " + row.version +
      " (" + KNOWLEDGE_ALL.length + " conditions)");
    try {
      var home = typeof document !== "undefined" && document.getElementById("pgHome");
      if (home && home.classList.contains("active") &&
          typeof renderHome === "function") renderHome();
    } catch (e) { /* rendering must never break the update */ }
    cb && cb(null, "applied");
  }).catch(function (err) {
    KB_REMOTE.lastError = String(err && err.message || err);
    cb && cb(err, "error");
  });
}

/* ═══════════════════════════════════════════════════════════════ */
/* LOCAL AUTHORING SUPPORT                                          */
/* Conditions the owner authors in the editor are applied to the     */
/* running KB immediately and cached here so they survive a reload    */
/* AND are re-applied after a remote bundle loads (a remote bundle    */
/* replaces KNOWLEDGE_ALL wholesale, which would otherwise drop       */
/* not-yet-published local edits). Once an edit appears in a          */
/* published bundle, it's redundant here and can be cleared.          */
/* ═══════════════════════════════════════════════════════════════ */
var KB_LOCAL_EDITS_KEY = "entopic_kb_local_edits";

function kbLocalEditsLoad() {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KB_LOCAL_EDITS_KEY) || "[]") || []; }
  catch (e) { return []; }
}
/* Returns whether the edits are actually persisted. This used to swallow the
   failure, so a clinician's KB edit could vanish on the next reload while the
   editor reported it saved — the same class of silent loss as P-1. */
function kbLocalEditsSave(arr) {
  if (typeof localStorage === "undefined") return false;
  return lsSet(KB_LOCAL_EDITS_KEY, JSON.stringify(arr || []));
}

/* Upsert one condition into the live KB by name, rebuild all indexes, and
   (unless replayOnly) persist it to the local-edits cache. Returns the KB
   size. The condition object is the engine's native format (from the
   authoring compiler). */
function kbApplyLocalConditionUpsert(cond, replayOnly) {
  if (!cond || !cond.name) return (typeof KNOWLEDGE_ALL !== "undefined" ? KNOWLEDGE_ALL.length : 0);
  if (!cond.req) cond.req = [];
  if (!cond.sup) cond.sup = [];
  if (!cond.con) cond.con = [];
  if (!cond.temporal) cond.temporal = [];
  if (!cond.tests) cond.tests = [];
  if (!cond.exclusions) cond.exclusions = [];
  var domain = cond._domain || cond.domain || "Authored";
  cond._domain = domain;
  /* ICD backfill (same rule as the loader) */
  if (typeof ICD_MAP !== "undefined" && ICD_MAP[cond.name]) {
    if (!cond.icd) cond.icd = ICD_MAP[cond.name].icd10;
    if (!cond.icd_label) cond.icd_label = ICD_MAP[cond.name].label;
    if (!cond.icd_status) cond.icd_status = ICD_MAP[cond.name].status;
  }

  /* replace in KNOWLEDGE_ALL by name, else append */
  var replaced = false, i;
  for (i = 0; i < KNOWLEDGE_ALL.length; i++) {
    if (KNOWLEDGE_ALL[i].name === cond.name) { cond._index = KNOWLEDGE_ALL[i]._index; KNOWLEDGE_ALL[i] = cond; replaced = true; break; }
  }
  if (!replaced) { cond._index = KNOWLEDGE_ALL.length; KNOWLEDGE_ALL.push(cond); }

  /* keep the domain buckets consistent (used by the KB info modal) */
  if (typeof KNOWLEDGE_DOMAINS !== "undefined") {
    for (var d in KNOWLEDGE_DOMAINS) {
      if (!KNOWLEDGE_DOMAINS.hasOwnProperty(d)) continue;
      var list = KNOWLEDGE_DOMAINS[d];
      for (var j = list.length - 1; j >= 0; j--) if (list[j].name === cond.name) list.splice(j, 1);
    }
    if (!KNOWLEDGE_DOMAINS[domain]) KNOWLEDGE_DOMAINS[domain] = [];
    KNOWLEDGE_DOMAINS[domain].push(cond);
  }

  if (typeof rebuildKbIndexes === "function") rebuildKbIndexes();

  if (!replayOnly) {
    var edits = kbLocalEditsLoad();
    var found = false;
    for (i = 0; i < edits.length; i++) if (edits[i].name === cond.name) { edits[i] = cond; found = true; break; }
    if (!found) edits.push(cond);
    kbLocalEditsSave(edits);
  }
  return KNOWLEDGE_ALL.length;
}

/* Re-apply all cached local edits (called at boot after any bundle load). */
function kbReplayLocalEdits() {
  var edits = kbLocalEditsLoad();
  for (var i = 0; i < edits.length; i++) kbApplyLocalConditionUpsert(edits[i], true);
  return edits.length;
}

/* Export the CURRENT live KB as a publishable bundle (domain → conditions[]),
   matching the shape validateKbBundle expects and kbApplyBundle consumes. */
function kbExportCurrentBundle() {
  var bundle = {};
  if (typeof KNOWLEDGE_DOMAINS !== "undefined") {
    for (var d in KNOWLEDGE_DOMAINS) {
      if (!KNOWLEDGE_DOMAINS.hasOwnProperty(d)) continue;
      bundle[d] = KNOWLEDGE_DOMAINS[d].map(function (c) {
        var copy = {};
        for (var k in c) { if (c.hasOwnProperty(k) && k !== "_domain" && k !== "_index") copy[k] = c[k]; }
        return copy;
      });
    }
  }
  return bundle;
}

/* ── status for the UI ── */
function kbRemoteStatus() {
  return {
    version: (typeof KB_META !== "undefined" && KB_META.version) || "?",
    source: (typeof KB_META !== "undefined" && KB_META.source) || "bundled",
    conditions: (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.length : 0,
    pending: KB_REMOTE.pendingVersion,
    lastCheck: KB_REMOTE.lastCheck,
    lastError: KB_REMOTE.lastError
  };
}

/* ── boot ──
   1. Apply the cached bundle (if valid and newer than what shipped) —
      synchronous, works fully offline.
   2. Then check the cloud in the background (only when cloud is enabled),
      and re-check twice a day while the tab stays open. */
(function kbRemoteBoot() {
  try {
    var cached = kbRemoteReadCache();
    if (cached && cached.bundle) {
      var current = (typeof KB_META !== "undefined" && KB_META.version) || "0";
      var v = validateKbBundle(cached.bundle);
      if (kbRemoteDecision(cached.version, current, false, v.ok) === "apply") {
        kbApplyBundle(cached.bundle, cached.version, cached.notes);
        console.log("Entopic KB restored from cached remote bundle " + cached.version +
          " (" + KNOWLEDGE_ALL.length + " conditions)");
      }
    }
  } catch (e) {
    console.error("Cached KB bundle apply failed; using bundled KB:", e);
  }
  /* Re-apply the owner's not-yet-published local edits on top of whatever
     KB (bundled or cached-remote) is now live, so authoring survives reloads
     and remote updates. */
  try {
    var replayed = kbReplayLocalEdits();
    if (replayed) console.log("Entopic: re-applied " + replayed + " local KB edit(s).");
  } catch (e2) { console.error("Local KB edit replay failed:", e2); }
  if (typeof window !== "undefined" && typeof setTimeout === "function") {
    setTimeout(function () { kbRemoteCheck(); }, 3000);
    if (typeof setInterval === "function") {
      KB_REMOTE.checkTimer = setInterval(function () { kbRemoteCheck(); }, 12 * 60 * 60 * 1000);
    }
  }
})();
