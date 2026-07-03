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

      /* Tag with domain for traceability */
      cond._domain = domain;
      cond._index = totalConditions;

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
  version: "1.0.0",
  date: "2026-03-29",
  conditions: KNOWLEDGE_ALL.length,
  domains: Object.keys(KNOWLEDGE_DOMAINS).length,
  author: "Entopic Clinical Team"
};


/* ═══════════════════════════════════════════════════════════════ */
/* ROUTE REGISTRY                                                  */
/* All unique routes used across the knowledge base                */
/* ═══════════════════════════════════════════════════════════════ */

var KB_ROUTES = {};

(function buildRouteRegistry() {
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var route = KNOWLEDGE_ALL[i].route;
    if (!KB_ROUTES[route]) {
      KB_ROUTES[route] = [];
    }
    KB_ROUTES[route].push(KNOWLEDGE_ALL[i].name);
  }
})();


/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN COVERAGE REPORT                                           */
/* Used by: KB info modal, completeness checking                   */
/* ═══════════════════════════════════════════════════════════════ */

var KB_TOKEN_STATS = {};

(function buildTokenStats() {
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
})();


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: Get conditions by route                                 */
/* ═══════════════════════════════════════════════════════════════ */

function getConditionsByRoute(route) {
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

(function buildExclusionMap() {
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    if (c.exclusions && c.exclusions.length > 0) {
      KB_EXCLUSION_MAP[c.name] = c.exclusions.slice();
    }
  }
})();
