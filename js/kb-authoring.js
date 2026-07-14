/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — KB AUTHORING (compiler + linter)                      */
/*                                                                  */
/* Turns the fields a clinician fills in the Knowledge Base Editor   */
/* into an engine-ready condition object, and lints the draft for    */
/* the problems the founder asked to be warned about:                */
/*   • duplicates and near-duplicates (similar name OR high token     */
/*     overlap with a condition already in the KB)                   */
/*   • contradictory / non-logical entries (a token in both req and   */
/*     con, urgent with no hallmark, acute+chronic clash, …)         */
/*   • "token firing": a required token nothing in the exam produces  */
/*     means the condition can NEVER surface — flagged loudly        */
/*   • unknown tokens, bad routes, self/dead exclusions              */
/*                                                                  */
/* Pure and side-effect-free: every function takes an explicit        */
/* context so it is unit-testable in Node. Thin browser helpers       */
/* (kbBuildContext) read the loaded globals. This same module powers  */
/* both the in-app editor and the bulk provisional seeder, so the     */
/* two can never disagree about what a valid condition is.            */
/*                                                                  */
/* The produced object IS the engine's input format — there is no     */
/* separate "code generation" step to get wrong: the form field is    */
/* the code.                                                          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Canonical route set (matches the engine's route selection stages). */
var KB_KNOWN_ROUTES = ["surface", "anterior", "retina", "neuro",
                       "binocular", "refractive", "glaucoma", "lens", "urgent"];

/* The array fields every condition carries, and which ones are token lists. */
var KB_TOKEN_FIELDS = ["req", "sup", "con", "temporal", "tests"];
var KB_ARRAY_FIELDS = KB_TOKEN_FIELDS.concat(["exclusions"]);

/* ── normalization: form fields → canonical condition object ── */
function kbNormalizeDraft(draft) {
  draft = draft || {};
  var out = {
    name: String(draft.name == null ? "" : draft.name).trim(),
    route: String(draft.route == null ? "" : draft.route).trim(),
    domain: String(draft.domain == null ? "" : draft.domain).trim(),
    urgent: draft.urgent === true || draft.urgent === "true",
    icd: draft.icd ? String(draft.icd).trim() : "",
    icd_label: draft.icd_label ? String(draft.icd_label).trim() : ""
  };
  function cleanList(v) {
    var arr = [];
    if (Array.isArray(v)) arr = v.slice();
    else if (typeof v === "string") arr = v.split(/[,\n]/);
    var seen = {}, res = [];
    for (var i = 0; i < arr.length; i++) {
      var t = String(arr[i]).trim();
      if (!t) continue;
      if (!seen[t]) { seen[t] = true; res.push(t); }
    }
    return res;
  }
  for (var f = 0; f < KB_ARRAY_FIELDS.length; f++) {
    out[KB_ARRAY_FIELDS[f]] = cleanList(draft[KB_ARRAY_FIELDS[f]]);
  }
  /* every authored/edited clinical entry is provisional until verified */
  out.icd_status = "NEEDS_CLINICAL_REVIEW";
  return out;
}

/* ── similarity helpers ── */
function kbNameTokens(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}
function kbJaccard(a, b) {
  if (!a.length && !b.length) return 0;
  var setB = {}, i, inter = 0;
  for (i = 0; i < b.length; i++) setB[b[i]] = true;
  var seen = {};
  for (i = 0; i < a.length; i++) {
    if (setB[a[i]] && !seen[a[i]]) { inter++; seen[a[i]] = true; }
  }
  var uni = {};
  for (i = 0; i < a.length; i++) uni[a[i]] = true;
  for (i = 0; i < b.length; i++) uni[b[i]] = true;
  var u = 0; for (var k in uni) if (uni.hasOwnProperty(k)) u++;
  return u ? inter / u : 0;
}
/* snake_case-insensitive name key for duplicate detection */
function kbNameKey(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/* ── the linter ──
   ctx = {
     conditions: [ {name, route, req, sup, ...}, ... ],   // existing KB
     tokenInfo:  { token: { reachable:bool, producers:[..], usage:{...} } },
     routes:     [ ...known route strings ]                // optional; defaults to KB_KNOWN_ROUTES
   }
   Returns { normalized, errors:[], warnings:[], infos:[], similar:[] }
   where each finding is { code, msg, field? }. errors block a clean save;
   warnings are advisory (the founder can still save — nothing here is a
   silent auto-reject, this is an authoring aid). */
function kbLintCondition(draft, ctx) {
  ctx = ctx || {};
  var conditions = ctx.conditions || [];
  var tokenInfo = ctx.tokenInfo || {};
  var routes = ctx.routes || KB_KNOWN_ROUTES;
  var c = kbNormalizeDraft(draft);
  var errors = [], warnings = [], infos = [], similar = [];

  function err(code, msg, field) { errors.push({ code: code, msg: msg, field: field }); }
  function warn(code, msg, field) { warnings.push({ code: code, msg: msg, field: field }); }
  function info(code, msg, field) { infos.push({ code: code, msg: msg, field: field }); }

  /* — required structure — */
  if (!c.name) err("no_name", "A condition name is required.", "name");
  if (!c.route) err("no_route", "Pick a route (which part of the exam drives this).", "route");
  else if (routes.indexOf(c.route) === -1)
    err("bad_route", "Route \"" + c.route + "\" is not one of: " + routes.join(", ") + ".", "route");

  /* — duplicate / near-duplicate — */
  var thisKey = kbNameKey(c.name);
  var thisNameTok = kbNameTokens(c.name);
  var thisTokens = c.req.concat(c.sup);
  for (var i = 0; i < conditions.length; i++) {
    var other = conditions[i];
    if (!other || !other.name) continue;
    if (ctx.excludeName && other.name === ctx.excludeName) continue; /* editing self */
    if (kbNameKey(other.name) === thisKey && c.name) {
      err("duplicate", "A condition named \"" + other.name + "\" already exists.", "name");
      continue;
    }
    var nameSim = kbJaccard(thisNameTok, kbNameTokens(other.name));
    var tokSim = kbJaccard(thisTokens, (other.req || []).concat(other.sup || []));
    /* "worth showing as related": a moderate signal on either axis. */
    if (nameSim >= 0.4 || tokSim >= 0.45) {
      similar.push({ name: other.name, nameSimilarity: +nameSim.toFixed(2), tokenOverlap: +tokSim.toFixed(2) });
    }
  }
  if (similar.length) {
    similar.sort(function (a, b) { return (b.tokenOverlap + b.nameSimilarity) - (a.tokenOverlap + a.nameSimilarity); });
    /* Warn when the closest match is genuinely close: strong on one axis, OR
       moderately close on BOTH name and tokens (catches "X Variant" clones of
       a richer existing entry, where neither axis alone crosses a high bar). */
    var top = similar[0];
    var closeEnough = top.tokenOverlap >= 0.7 || top.nameSimilarity >= 0.65 ||
                      (top.nameSimilarity >= 0.5 && top.tokenOverlap >= 0.4);
    if (closeEnough) {
      warn("near_duplicate", "Looks similar to: " +
        similar.slice(0, 3).map(function (s) {
          return "\"" + s.name + "\" (" + Math.round(s.tokenOverlap * 100) + "% token overlap, " +
                 Math.round(s.nameSimilarity * 100) + "% name overlap)";
        }).join(", ") + ". Make sure this is genuinely distinct.");
    }
  }

  /* — contradictory / non-logical — */
  var inReq = {}, inSup = {}, inCon = {};
  c.req.forEach(function (t) { inReq[t] = true; });
  c.sup.forEach(function (t) { inSup[t] = true; });
  c.con.forEach(function (t) { inCon[t] = true; });
  c.req.forEach(function (t) {
    if (inCon[t]) err("req_and_con", "Token \"" + t + "\" is in BOTH required and contradicting — a condition can't both need it and be ruled out by it.");
  });
  c.sup.forEach(function (t) {
    if (inCon[t]) err("sup_and_con", "Token \"" + t + "\" is in BOTH supportive and contradicting — pick one.");
    if (inReq[t]) warn("sup_and_req", "Token \"" + t + "\" is in both required and supportive; the supportive copy is redundant.");
  });
  if (c.temporal.indexOf("acute") >= 0 && c.temporal.indexOf("chronic") >= 0)
    warn("temporal_clash", "Temporal lists both \"acute\" and \"chronic\" — usually a condition is one or the other.");

  /* — required tokens & "token firing" (reachability) — */
  if (c.req.length === 0) {
    warn("no_required", "No required tokens: this will be considered on every visit to its route and can only score from supportive evidence. Add a hallmark token if it has one.");
  } else {
    c.req.forEach(function (t) {
      var ti = tokenInfo[t];
      if (!ti) {
        warn("unknown_req_token", "Required token \"" + t + "\" is not in the vocabulary yet — nothing produces it, so this condition can NEVER surface until you wire an input (a symptom, a finding, or a measurement) that emits it.", "req");
      } else if (ti.reachable === false) {
        warn("unreachable_req_token", "Required token \"" + t + "\" exists but nothing in the exam currently produces it — this condition can't fire until an input emits it.", "req");
      }
    });
  }
  /* unknown sup/con/temporal/test tokens are softer (they only tune score) */
  ["sup", "con", "temporal", "tests"].forEach(function (field) {
    c[field].forEach(function (t) {
      if (!tokenInfo[t]) info("new_token", "New " + field + " token \"" + t + "\" — fine, but it only does something once an input produces it.", field);
    });
  });

  /* — urgency sanity — */
  if (c.urgent && c.route !== "urgent")
    info("urgent_offroute", "Marked urgent but not on the \"urgent\" fast-track route. That's allowed — it will still be un-suppressible and prioritized — but the urgent route also guarantees it's scored on any hallmark match.");
  if (c.urgent && c.req.length === 0)
    warn("urgent_no_req", "Urgent conditions should have a hallmark (required) token so the safety net can reliably surface them.");

  /* — exclusions — */
  var byKey = {};
  for (var j = 0; j < conditions.length; j++) if (conditions[j] && conditions[j].name) byKey[kbNameKey(conditions[j].name)] = conditions[j].name;
  c.exclusions.forEach(function (ex) {
    var exKey = kbNameKey(ex);
    if (exKey === thisKey) { warn("self_exclude", "This condition excludes itself (\"" + ex + "\") — removed at runtime, but check the intent."); return; }
    /* substring match mirrors the engine's exclusion matcher */
    var hit = false;
    for (var kk in byKey) { if (byKey.hasOwnProperty(kk) && (kk.indexOf(exKey) >= 0 || exKey.indexOf(kk) >= 0)) { hit = true; break; } }
    if (!hit) warn("dead_exclusion", "Exclusion \"" + ex + "\" doesn't match any condition in the KB, so it can never fire. Use the exact condition name or a snake_case fragment of it.");
  });

  /* — provisional reminder — */
  if (!c.icd) info("no_icd", "No ICD-10 code yet — that's fine; it'll be flagged for review. Add one from the coding tool when you can.");
  info("provisional", "Saved entries are marked NEEDS_CLINICAL_REVIEW until you verify them.");

  return { normalized: c, errors: errors, warnings: warnings, infos: infos, similar: similar };
}

/* ── browser context builder: reads the loaded globals ── */
function kbBuildContext(excludeName) {
  var conditions = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL : [];
  var tokenInfo = {};
  if (typeof TOKEN_REGISTRY !== "undefined") {
    for (var t in TOKEN_REGISTRY) {
      if (!TOKEN_REGISTRY.hasOwnProperty(t)) continue;
      tokenInfo[t] = {
        reachable: TOKEN_REGISTRY[t].reachable !== false,
        producers: TOKEN_REGISTRY[t].sources || [],
        usage: TOKEN_REGISTRY[t].usage || {}
      };
    }
  }
  return { conditions: conditions, tokenInfo: tokenInfo, routes: KB_KNOWN_ROUTES, excludeName: excludeName };
}

/* ── the known token vocabulary, for editor autocomplete ── */
function kbKnownTokens() {
  var out = {};
  if (typeof TOKEN_REGISTRY !== "undefined") {
    for (var t in TOKEN_REGISTRY) if (TOKEN_REGISTRY.hasOwnProperty(t)) out[t] = true;
  }
  /* also anything already used in the KB (belt and braces) */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
      var c = KNOWLEDGE_ALL[i];
      KB_TOKEN_FIELDS.forEach(function (f) { (c[f] || []).forEach(function (tk) { out[tk] = true; }); });
    }
  }
  return Object.keys(out).sort();
}

/* Node export (browser just defines globals) */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    kbNormalizeDraft: kbNormalizeDraft,
    kbLintCondition: kbLintCondition,
    kbJaccard: kbJaccard,
    kbNameKey: kbNameKey,
    kbNameTokens: kbNameTokens,
    KB_KNOWN_ROUTES: KB_KNOWN_ROUTES
  };
}
