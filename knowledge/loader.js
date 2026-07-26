/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE — LOADER                                         */
/* Assembles all domain files into unified data structures          */
/* Must be loaded AFTER all domain .js files                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* DOMAIN REGISTRY                                                 */
/* Each domain → its conditions array                              */
/* ═══════════════════════════════════════════════════════════════ */

var KNOWLEDGE_DOMAINS = {};

/* Register each domain if its variable exists */
if (typeof KB_SURFACE    !== "undefined") KNOWLEDGE_DOMAINS["Surface & Lids"]     = KB_SURFACE;
if (typeof KB_CORNEAL    !== "undefined") KNOWLEDGE_DOMAINS["Cornea"]             = KB_CORNEAL;
if (typeof KB_RETINA     !== "undefined") KNOWLEDGE_DOMAINS["Retina"]             = KB_RETINA;
if (typeof KB_NEURO      !== "undefined") KNOWLEDGE_DOMAINS["Neuro-Ophthalmic"]   = KB_NEURO;
if (typeof KB_BINOCULAR  !== "undefined") KNOWLEDGE_DOMAINS["Binocular Vision"]   = KB_BINOCULAR;
if (typeof KB_REFRACTIVE !== "undefined") KNOWLEDGE_DOMAINS["Refractive"]         = KB_REFRACTIVE;
if (typeof KB_GLAUCOMA   !== "undefined") KNOWLEDGE_DOMAINS["Glaucoma"]           = KB_GLAUCOMA;
if (typeof KB_ANTERIOR   !== "undefined") KNOWLEDGE_DOMAINS["Anterior / Uveitis"] = KB_ANTERIOR;
if (typeof KB_LENS       !== "undefined") KNOWLEDGE_DOMAINS["Lens"]               = KB_LENS;


/* ═══════════════════════════════════════════════════════════════ */
/* UNIFIED CONDITIONS ARRAY                                        */
/* All conditions from all domains in one flat array               */
/* Engine iterates over this for scoring                           */
/* ═══════════════════════════════════════════════════════════════ */

var KNOWLEDGE_ALL = [];

/* Fold in the provisional expansion batch (knowledge/expansion.js), if
   present, by each entry's own `domain`. Kept in a separate file so the
   curated original conditions stay pristine and the AI-drafted,
   review-flagged batch is easy to audit or remove. Loads before this file. */
if (typeof KB_EXPANSION !== "undefined") {
  for (var _xi = 0; _xi < KB_EXPANSION.length; _xi++) {
    var _xc = KB_EXPANSION[_xi];
    var _xd = _xc.domain || "Expanded";
    /* Runtime review flag — the whole expansion batch is AI-drafted and
       provisional until the clinician verifies it. The KB editor's Review
       Queue reads this; a founder "mark verified" is saved as a local edit,
       which replays AFTER this loader runs and so overrides the stamp. */
    if (!_xc.review_status) _xc.review_status = "NEEDS_CLINICAL_REVIEW";
    if (!KNOWLEDGE_DOMAINS[_xd]) KNOWLEDGE_DOMAINS[_xd] = [];
    KNOWLEDGE_DOMAINS[_xd].push(_xc);
  }
}

(function assembleKnowledgeBase() {
  var totalConditions = 0;
  var totalUrgent = 0;
  var domainCount = 0;

  for (var domain in KNOWLEDGE_DOMAINS) {
    if (!KNOWLEDGE_DOMAINS.hasOwnProperty(domain)) continue;

    var conditions = KNOWLEDGE_DOMAINS[domain];
    domainCount++;

    for (var i = 0; i < conditions.length; i++) {
      var cond = conditions[i];

      /* Ensure every condition has all required fields */
      if (!cond.req)        cond.req = [];
      if (!cond.sup)        cond.sup = [];
      if (!cond.con)        cond.con = [];
      if (!cond.temporal)   cond.temporal = [];
      if (!cond.tests)      cond.tests = [];
      if (!cond.exclusions) cond.exclusions = [];

      /* De-duplicate token lists. A duplicate token would be counted twice by
         the scorer (inflating a condition's evidence), and duplicates can
         arise from KB editing or synonym remapping. Keep first occurrence. */
      (function dedupeFields() {
        var fields = ["req", "sup", "con", "temporal", "tests", "exclusions"];
        for (var f = 0; f < fields.length; f++) {
          var arr = cond[fields[f]], seen = {}, out = [];
          for (var k = 0; k < arr.length; k++) {
            if (!seen[arr[k]]) { seen[arr[k]] = true; out.push(arr[k]); }
          }
          cond[fields[f]] = out;
        }
      })();

      /* Backfill ICD-10 code from the (provisional, review-flagged) map.
         The engine and coding page read cond.icd directly; keep any code
         already present on the condition. */
      if (typeof ICD_MAP !== "undefined" && ICD_MAP[cond.name]) {
        var icdEntry = ICD_MAP[cond.name];
        if (!cond.icd) cond.icd = icdEntry.icd10;
        cond.icd_label = icdEntry.label;
        cond.icd_status = icdEntry.status;
      }

      /* Apply the founder's exported clinical sign-offs (knowledge/verified.js).
         A baked-in attestation overrides the provisional stamp so verified
         conditions stop showing as provisional on every device this build
         ships to. Review flags only — content is untouched. */
      if (typeof KB_VERIFIED !== "undefined" && KB_VERIFIED[cond.name]) {
        cond.review_status = "VERIFIED_BY_CLINICIAN";
        cond.icd_status = "VERIFIED_BY_CLINICIAN";
        cond.review_verified_on = KB_VERIFIED[cond.name].on || "";
        cond.review_verified_by = KB_VERIFIED[cond.name].by || "";
      }

      /* Tag with domain for traceability */
      cond._domain = domain;
      cond._index = totalConditions;

      /* PUBLIC domain field. The nine curated KB files carry their domain
         implicitly — it is the registry key above, never a property on the
         condition — while the expansion batch carries `domain` inline. That
         split meant `cond.domain` was undefined for 137 of 394 conditions,
         including the most common ones in practice (dry eye, the
         conjunctivitides, blepharitis, stye, chalazion), so anything reading
         `cond.domain` silently bucketed a third of the KB as "Other":
         domain-scoped assignments, the study recommendations, OSCE station
         labels and analytics.
         Normalising here fixes every reader at once, including ones not yet
         written, and keeps `_domain` for the code that already reads it. */
      if (!cond.domain) cond.domain = domain;

      KNOWLEDGE_ALL.push(cond);
      totalConditions++;

      if (cond.urgent) totalUrgent++;
    }
  }

  console.log(
    "Knowledge Base loaded: " + totalConditions + " conditions across " +
    domainCount + " domains (" + totalUrgent + " urgent)"
  );
})();


/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE BASE METADATA                                         */
/* Version info for display and update tracking                    */
/* ═══════════════════════════════════════════════════════════════ */

var KB_META = {
  version: "1.1.0",
  date: "2026-07-12",
  conditions: KNOWLEDGE_ALL.length,
  domains: Object.keys(KNOWLEDGE_DOMAINS).length,
  author: "Entopic Clinical Team",
  source: "bundled"
};


/* ═══════════════════════════════════════════════════════════════ */
/* ROUTE REGISTRY                                                  */
/* All unique routes used across the knowledge base                */
/* ═══════════════════════════════════════════════════════════════ */

var KB_ROUTES = {};

/* (Re)built inside rebuildKbIndexes() below, so a KB that is grown or
   reloaded at runtime refreshes this alongside the performance indexes. */
function rebuildRouteRegistry() {
  KB_ROUTES = {};
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var route = KNOWLEDGE_ALL[i].route;
    if (!KB_ROUTES[route]) {
      KB_ROUTES[route] = [];
    }
    KB_ROUTES[route].push(KNOWLEDGE_ALL[i].name);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN COVERAGE REPORT                                           */
/* Used by: KB info modal, completeness checking                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_TOKEN_STATS = {};

/* (Re)built inside rebuildKbIndexes() below. */
function rebuildTokenStats() {
  var allReq = {};
  var allSup = {};
  var allCon = {};

  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];

    c.req.forEach(function(t) {
      if (!allReq[t]) allReq[t] = [];
      allReq[t].push(c.name);
    });

    c.sup.forEach(function(t) {
      if (!allSup[t]) allSup[t] = [];
      allSup[t].push(c.name);
    });

    c.con.forEach(function(t) {
      if (!allCon[t]) allCon[t] = [];
      allCon[t].push(c.name);
    });
  }

  KB_TOKEN_STATS = {
    required: allReq,
    supportive: allSup,
    contradicting: allCon,
    totalRequired: Object.keys(allReq).length,
    totalSupportive: Object.keys(allSup).length,
    totalContradicting: Object.keys(allCon).length
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* PERFORMANCE INDEXES (scale to 100x+ conditions)                 */
/*                                                                  */
/* The engine runs on every keystroke. Linear scans of KNOWLEDGE_ALL */
/* are fine at 130 conditions but O(N) per run becomes the wall at   */
/* thousands. These precomputed indexes let the engine touch only    */
/* the conditions relevant to the current evidence.                  */
/*                                                                  */
/*  KB_ROUTE_INDEX      route → conditions[] (KB order preserved)    */
/*  KB_REQ_FIRST_INDEX  first required token → conditions[] that     */
/*                      require it (drives fast route activation)    */
/* Both are rebuilt by rebuildKbIndexes(), so cloud-loaded / grown   */
/* knowledge bases can refresh them.                                */
/* ═══════════════════════════════════════════════════════════════ */

var KB_ROUTE_INDEX = {};       /* route → conditions[] */
var KB_REQ_FIRST_INDEX = {};   /* first required token → conditions[] */
var KB_REQ_TOKEN_INDEX = {};   /* ANY required token → conditions[] */
var KB_NOREQ_CONDS = [];       /* conditions with no required token (rare) */
var KB_NAME_INDEX = {};        /* condition name → condition (O(1) lookup) */

function rebuildKbIndexes() {
  KB_ROUTE_INDEX = {};
  KB_REQ_FIRST_INDEX = {};
  KB_REQ_TOKEN_INDEX = {};
  KB_NOREQ_CONDS = [];
  KB_NAME_INDEX = {};
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    KB_NAME_INDEX[c.name] = c;
    if (!KB_ROUTE_INDEX[c.route]) KB_ROUTE_INDEX[c.route] = [];
    KB_ROUTE_INDEX[c.route].push(c);
    if (c.req && c.req.length > 0) {
      var t = c.req[0];
      if (!KB_REQ_FIRST_INDEX[t]) KB_REQ_FIRST_INDEX[t] = [];
      KB_REQ_FIRST_INDEX[t].push(c);
      for (var r = 0; r < c.req.length; r++) {
        var rt = c.req[r];
        if (!KB_REQ_TOKEN_INDEX[rt]) KB_REQ_TOKEN_INDEX[rt] = [];
        KB_REQ_TOKEN_INDEX[rt].push(c);
      }
    } else {
      /* A condition with no required token can score from supportive
         evidence alone; it must always be considered on its route. */
      KB_NOREQ_CONDS.push(c);
    }
  }
  /* Derived registries the engine and UI read must refresh together with
     the performance indexes — a grown/cloud-loaded KB with a stale
     exclusion map would apply outdated clinical exclusion rules.
     (Function declarations hoist, so these are callable here.) */
  rebuildRouteRegistry();
  rebuildTokenStats();
  rebuildExclusionMap();
}
/* NOTE: the initial rebuildKbIndexes() call is at the END of this file —
   it must run after every `var X = {}` declaration it populates, or the
   later initializers would wipe the built registries (var hoisting). */


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Get conditions by route                                 */
/* ═══════════════════════════════════════════════════════════════ */

function getConditionsByRoute(route) {
  /* Use the index when available (O(1) lookup vs O(N) filter). */
  if (typeof KB_ROUTE_INDEX !== "undefined" && KB_ROUTE_INDEX[route]) {
    return KB_ROUTE_INDEX[route].slice();
  }
  return KNOWLEDGE_ALL.filter(function(c) {
    return c.route === route;
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Get urgent conditions                                   */
/* ═══════════════════════════════════════════════════════════════ */

function getUrgentConditions() {
  return KNOWLEDGE_ALL.filter(function(c) {
    return c.urgent === true;
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Find condition by name                                  */
/* ═══════════════════════════════════════════════════════════════ */

function findCondition(name) {
  /* O(1) via the name index when available (built by rebuildKbIndexes). */
  if (typeof KB_NAME_INDEX !== "undefined" && KB_NAME_INDEX[name] !== undefined) {
    return KB_NAME_INDEX[name];
  }
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    if (KNOWLEDGE_ALL[i].name === name) return KNOWLEDGE_ALL[i];
  }
  return null;
}


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Get all conditions that require a specific token        */
/* ═══════════════════════════════════════════════════════════════ */

function conditionsRequiringToken(token) {
  return KNOWLEDGE_ALL.filter(function(c) {
    return c.req.indexOf(token) >= 0;
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Get all exclusion rules                                 */
/* Builds a map: conditionName → [conditions it excludes]          */
/* ═══════════════════════════════════════════════════════════════ */

var KB_EXCLUSION_MAP = {};

/* (Re)built inside rebuildKbIndexes(). */
function rebuildExclusionMap() {
  KB_EXCLUSION_MAP = {};
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    if (c.exclusions && c.exclusions.length > 0) {
      KB_EXCLUSION_MAP[c.name] = c.exclusions.slice();
    }
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* INITIAL BUILD                                                    */
/* Must stay at the very end of this file: it populates registries   */
/* whose `var X = {}` declarations appear above — running it any      */
/* earlier lets a later initializer wipe what it built.               */
/* ═══════════════════════════════════════════════════════════════ */
rebuildKbIndexes();
