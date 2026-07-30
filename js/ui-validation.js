/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL VALIDATION WORKSPACE                         */
/*                                                                  */
/* One discoverable place where the founder (clinical authority)     */
/* can open any condition, SEE the engine logic wired behind it in   */
/* plain language, verify it, or jump straight to editing its        */
/* tokens/logic. It consolidates two things that already existed but */
/* were buried and shallow:                                          */
/*   • the rapid review/verify queue (js/kb-review.js)               */
/*   • the full token editor          (js/ui-kb-editor.js)          */
/* and adds the piece neither had: a WIRING VIEW — for every token   */
/* in a condition it shows (a) what the token means in plain words,  */
/* (b) which exam action produces it, and (c) a warning when NOTHING */
/* in the exam produces it (a required token nothing feeds = the     */
/* condition can never surface).                                     */
/*                                                                  */
/* This is a read / verify / navigate layer. It changes no engine    */
/* logic, invents no clinical content, and every deep edit is handed */
/* off to the existing KB editor (which re-stamps entries provisional*/
/* as it must). It feeds the existing sign-off → export → publish    */
/* pipeline unchanged, so it is also the front door for the upcoming */
/* KB expansion and the online push of verified updates to users.    */
/*                                                                  */
/* Pure, Node-testable core first; DOM wiring guarded at the bottom. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── PLAIN-ENGLISH PRODUCER LABELS ───────────────────────────────
   The token registry (knowledge/token-registry.js, generated) records,
   for every token, which input paths PRODUCE it. Those keys are terse;
   these are how we say them to a clinician. Descriptive only — no clinical
   claims — so this is safe to hand-write. */
var VAL_PRODUCER_LABELS = {
  symptom_chip:   "Ticked as a symptom during History",
  finding_map:    "Recorded as an exam finding / sign",
  engine_derived: "Computed by the engine from measured values",
  temporal:       "From the onset / timeline (acute, chronic, …)",
  dictionary:     "Recognised from free-text or speech (token dictionary)",
  medication:     "From the medications recorded",
  free_text:      "Parsed from free-text notes"
};

/* Plain-language meaning of a token: prefer the first natural-language alias
   from the token dictionary (that IS the human phrasing the app already
   understands), else fall back to the prettified token. Never fabricates. */
function valTokenMeaning(tok) {
  if (typeof TOKEN_DICTIONARY !== "undefined" && TOKEN_DICTIONARY && TOKEN_DICTIONARY[tok] &&
      TOKEN_DICTIONARY[tok].length) {
    return String(TOKEN_DICTIONARY[tok][0]);
  }
  if (typeof kbPrettyToken === "function") return kbPrettyToken(tok);
  return String(tok).replace(/_/g, " ");
}

/* How this token gets into a visit: {producers:[labels], reachable:bool}.
   reachable=false means nothing in the current exam can generate it — the
   single most important thing to surface, because a required token that is
   unreachable makes the whole condition unfireable. */
function valTokenWiring(tok) {
  var reg = (typeof TOKEN_REGISTRY !== "undefined" && TOKEN_REGISTRY) ? TOKEN_REGISTRY[tok] : null;
  var sources = (reg && reg.sources) ? reg.sources : [];
  var producers = [];
  for (var i = 0; i < sources.length; i++) {
    producers.push(VAL_PRODUCER_LABELS[sources[i]] || String(sources[i]).replace(/_/g, " "));
  }
  /* Known to the registry and either flagged reachable or having a producer. */
  var reachable = !!(reg && (reg.reachable || producers.length));
  return { producers: producers, reachable: reachable, known: !!reg };
}

/* One token row's worth of display data (pure). */
function valTokenRow(tok) {
  var w = valTokenWiring(tok);
  return {
    token: tok,
    pretty: (typeof kbPrettyToken === "function") ? kbPrettyToken(tok) : String(tok).replace(/_/g, " "),
    meaning: valTokenMeaning(tok),
    producers: w.producers,
    reachable: w.reachable
  };
}

/* Everything the detail panel needs for one condition (pure). Returns null
   if the condition isn't in the live KB. */
function valConditionDetail(name) {
  var find = (typeof findCondition === "function") ? findCondition : null;
  var c = find ? find(name) : null;
  if (!c) return null;
  var pretty = (typeof kbPrettyToken === "function") ? kbPrettyToken : function (t) { return String(t).replace(/_/g, " "); };
  var info = (typeof resolveConditionInfo === "function") ? resolveConditionInfo(name, find, pretty) : null;

  function rows(arr) { return (arr || []).map(valTokenRow); }
  var reqRows = rows(c.req);
  /* count required tokens that nothing produces — the unfireable warning */
  var deadReq = reqRows.filter(function (r) { return !r.reachable; });

  return {
    name: c.name,
    domain: c._domain || c.domain || "",
    route: c.route || "",
    urgent: !!c.urgent,
    icd: c.icd || "",
    icd_label: c.icd_label || "",
    status: c.review_status || "",            /* VERIFIED_BY_CLINICIAN | NEEDS_CLINICAL_REVIEW | "" */
    verified_on: c.review_verified_on || "",
    verified_by: c.review_verified_by || "",
    summary: (info && info.summary) || "",
    facts: (info && info.facts) || [],
    req: reqRows,
    sup: rows(c.sup),
    con: rows(c.con),
    temporal: rows(c.temporal),
    tests: rows(c.tests),
    exclusions: (c.exclusions || []).slice(),
    deadRequired: deadReq.map(function (r) { return r.token; })
  };
}

/* Status bucket for a live condition: verified | provisional | curated. */
function valStatusOf(c) {
  if (c.review_status === "VERIFIED_BY_CLINICIAN") return "verified";
  if (c.review_status === "NEEDS_CLINICAL_REVIEW") return "provisional";
  return "curated";
}

/* The condition list, with counts, for the master column (pure). */
function valConditionList() {
  if (typeof KNOWLEDGE_ALL === "undefined" || !KNOWLEDGE_ALL) return { items: [], counts: {} };
  var counts = { verified: 0, provisional: 0, curated: 0, total: 0 };
  var items = [];
  for (var i = 0; i < KNOWLEDGE_ALL.length; i++) {
    var c = KNOWLEDGE_ALL[i];
    var st = valStatusOf(c);
    counts[st]++; counts.total++;
    items.push({
      name: c.name,
      domain: c._domain || c.domain || "",
      urgent: !!c.urgent,
      status: st
    });
  }
  items.sort(function (a, b) {
    /* provisional first (needs attention), then verified, then curated;
       within a bucket urgent-first, then domain, then name */
    var order = { provisional: 0, verified: 1, curated: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    if (a.domain !== b.domain) return a.domain < b.domain ? -1 : 1;
    return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0);
  });
  return { items: items, counts: counts };
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM WIRING (browser only, admin-gated)                          */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  /* Canonical escaper (js/dom-escape.js), loaded before this module.
     Previously this captured a weaker inline fallback because escH is
     defined in app.js, which loads LAST — see dom-escape.js. */
  var _ve = escHtml;
  var VALWORK = { selected: null, search: "", domain: "", status: "" };
  window.VALWORK = VALWORK;

  /* Entry point — admin only (clinical authority = the founder). */
  window.openValidation = function (name) {
    if (typeof isAdmin !== "function" || !isAdmin()) {
      if (typeof toast === "function") toast("Clinical validation is for the clinical owner (admin).");
      return;
    }
    if (name) VALWORK.selected = name;
    if (typeof showPage === "function") showPage("pgValidation");
    valRender();
  };
  window.closeValidation = function () {
    if (typeof showPage === "function") showPage("pgHome");
    if (typeof renderHome === "function") renderHome();
  };

  window.valSelect = function (name) { VALWORK.selected = name; valRenderDetail(); valMarkListSelection(); };
  window.valSearch = function (v) { VALWORK.search = (v || "").toLowerCase(); valRenderList(); };
  window.valFilterStatus = function (s) { VALWORK.status = (VALWORK.status === s ? "" : s); valRender(); };
  window.valFilterDomain = function (d) { VALWORK.domain = (VALWORK.domain === d ? "" : d); valRender(); };

  /* Clinical attestation — reuses the exact same path as the rapid queue. */
  window.valVerify = function (name) {
    var by = (typeof CU !== "undefined" && CU && CU.name) ? CU.name : "";
    var c = (typeof kbRapidVerify === "function") ? kbRapidVerify(name, by) : null;
    if (!c) return;
    valRender();
    if (typeof toast === "function") toast("Verified ✓ — " + name);
  };

  /* Hand off to the existing full editor for add / delete / modify tokens. */
  window.valEdit = function (name) {
    if (typeof openKbEditor === "function") openKbEditor(name);
  };

  function _filtered() {
    var lst = valConditionList().items;
    return lst.filter(function (it) {
      if (VALWORK.status && it.status !== VALWORK.status) return false;
      if (VALWORK.domain && it.domain !== VALWORK.domain) return false;
      if (VALWORK.search && (it.name + " " + it.domain).toLowerCase().indexOf(VALWORK.search) === -1) return false;
      return true;
    });
  }

  function valRender() {
    var host = document.getElementById("valContent");
    if (!host) return;
    var data = valConditionList();
    var counts = data.counts;
    var pct = counts.total ? Math.round((counts.verified / counts.total) * 100) : 0;

    /* status filter chips */
    function statChip(key, label, n, cls) {
      return '<button class="val-stat val-stat-' + cls + (VALWORK.status === key ? ' val-stat-on' : '') +
        '" onclick="valFilterStatus(\'' + key + '\')">' + label + ' <b>' + n + '</b></button>';
    }
    /* domain chips */
    var perDomain = {};
    for (var i = 0; i < data.items.length; i++) perDomain[data.items[i].domain] = (perDomain[data.items[i].domain] || 0) + 1;
    var dkeys = Object.keys(perDomain).sort(function (a, b) { return perDomain[b] - perDomain[a]; });
    var domChips = "";
    for (var d = 0; d < dkeys.length; d++) {
      if (!dkeys[d]) continue;
      domChips += '<button class="val-dom' + (VALWORK.domain === dkeys[d] ? ' val-dom-on' : '') +
        '" onclick="valFilterDomain(\'' + _ve(dkeys[d]).replace(/'/g, "\\'") + '\')">' +
        _ve(dkeys[d]) + ' <span>' + perDomain[dkeys[d]] + '</span></button>';
    }

    host.innerHTML =
      '<div class="val-head">' +
        '<div class="val-progress">' +
          '<div class="val-progress-bar"><div class="val-progress-fill" style="width:' + pct + '%"></div></div>' +
          '<div class="val-progress-txt"><b>' + counts.verified + '</b> of ' + counts.total +
            ' conditions clinically verified (' + pct + '%). ' +
            '<span class="val-muted">Click a condition to see its engine wiring, verify it, or edit its logic.</span></div>' +
        '</div>' +
        '<div class="val-stats">' +
          statChip("provisional", "Needs review", counts.provisional, "prov") +
          statChip("verified", "Verified", counts.verified, "ver") +
          statChip("curated", "Curated", counts.curated, "cur") +
        '</div>' +
      '</div>' +
      '<div class="val-facets">' + domChips + '</div>' +
      '<div class="val-grid">' +
        '<div class="val-list-col">' +
          '<input id="valSearch" type="text" placeholder="Search conditions…" oninput="valSearch(this.value)" class="val-search">' +
          '<div id="valList" class="val-list"></div>' +
        '</div>' +
        '<div id="valDetail" class="val-detail"></div>' +
      '</div>';

    var si = document.getElementById("valSearch");
    if (si) si.value = VALWORK.search;
    valRenderList();
    valRenderDetail();
  }

  function valRenderList() {
    var host = document.getElementById("valList");
    if (!host) return;
    var items = _filtered();
    var h = "";
    var badge = { verified: '<span class="val-b val-b-ver">✓</span>',
                  provisional: '<span class="val-b val-b-prov">⚠</span>',
                  curated: '<span class="val-b val-b-cur">·</span>' };
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      h += '<div class="val-item' + (it.name === VALWORK.selected ? ' val-item-on' : '') +
        '" data-name="' + _ve(it.name) + '" onclick="valSelect(\'' + _ve(it.name).replace(/'/g, "\\'") + '\')">' +
        badge[it.status] +
        '<span class="val-item-name">' + _ve(it.name) + '</span>' +
        (it.urgent ? '<span class="val-item-urg" title="carries an urgent flag">⚑</span>' : '') +
        '</div>';
    }
    if (!items.length) h = '<div class="val-empty">No conditions match this filter.</div>';
    host.innerHTML = h;
  }

  function valMarkListSelection() {
    var nodes = document.querySelectorAll("#valList .val-item");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle("val-item-on", nodes[i].getAttribute("data-name") === VALWORK.selected);
    }
  }

  function tokenGroupHtml(title, rows, tone) {
    if (!rows || !rows.length) return "";
    var body = "";
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var wiring = r.reachable
        ? '<span class="val-wire">' + (r.producers.length ? _ve(r.producers.join(" · ")) : "produced during the exam") + '</span>'
        : '<span class="val-wire val-wire-dead" title="Nothing in the exam currently produces this token">⚠ nothing produces this yet</span>';
      body +=
        '<div class="val-tok">' +
          '<div class="val-tok-top"><span class="val-tok-name">' + _ve(r.pretty) + '</span>' +
            '<code class="val-tok-code">' + _ve(r.token) + '</code></div>' +
          '<div class="val-tok-mean">“' + _ve(r.meaning) + '”</div>' +
          '<div class="val-tok-wire">Comes from: ' + wiring + '</div>' +
        '</div>';
    }
    return '<div class="val-group val-group-' + tone + '">' +
      '<div class="val-group-title">' + _ve(title) + ' <span>' + rows.length + '</span></div>' + body + '</div>';
  }

  function valRenderDetail() {
    var host = document.getElementById("valDetail");
    if (!host) return;
    if (!VALWORK.selected) {
      host.innerHTML = '<div class="val-detail-empty">Select a condition on the left to inspect and verify the engine logic wired behind it.</div>';
      return;
    }
    var det = valConditionDetail(VALWORK.selected);
    if (!det) { host.innerHTML = '<div class="val-detail-empty">Condition not found in the live knowledge base.</div>'; return; }

    var statusLine =
      det.status === "VERIFIED_BY_CLINICIAN"
        ? '<span class="val-status val-status-ver">✓ Clinically verified' + (det.verified_on ? " on " + _ve(det.verified_on) : "") +
            (det.verified_by ? " by " + _ve(det.verified_by) : "") + '</span>'
        : det.status === "NEEDS_CLINICAL_REVIEW"
          ? '<span class="val-status val-status-prov">⚠ Provisional — needs your clinical review' + (det.urgent ? " (including its URGENT flag)" : "") + '</span>'
          : '<span class="val-status val-status-cur">Curated entry (original KB)</span>';

    var dead = det.deadRequired.length
      ? '<div class="val-warn">⚠ ' + det.deadRequired.length + ' required token' + (det.deadRequired.length === 1 ? "" : "s") +
        ' that nothing in the exam produces — this condition can never surface until that is wired or the token changed: <b>' +
        _ve(det.deadRequired.join(", ")) + '</b></div>'
      : "";

    var facts = "";
    if (det.facts && det.facts.length) {
      facts = '<ul class="val-facts">';
      for (var f = 0; f < det.facts.length; f++) facts += '<li>' + _ve(det.facts[f]) + '</li>';
      facts += '</ul>';
    }

    var canVerify = det.status === "NEEDS_CLINICAL_REVIEW";

    host.innerHTML =
      '<div class="val-detail-head">' +
        '<div class="val-detail-title">' + _ve(det.name) +
          (det.urgent ? ' <span class="val-detail-urg">⚑ URGENT</span>' : '') + '</div>' +
        '<div class="val-detail-meta">' +
          (det.domain ? '<span>' + _ve(det.domain) + '</span>' : '') +
          (det.route ? '<span>route: ' + _ve(det.route) + '</span>' : '') +
          (det.icd ? '<span>ICD-10: <b>' + _ve(det.icd) + '</b>' + (det.icd_label ? " " + _ve(det.icd_label) : "") + '</span>' : '<span class="val-muted">no ICD code</span>') +
        '</div>' +
        '<div>' + statusLine + '</div>' +
      '</div>' +
      dead +
      (det.summary ? '<div class="val-summary">' + _ve(det.summary) + '</div>' : '') +
      facts +
      '<div class="val-wiring-note">Below is exactly what the engine looks for, in plain language, and where each piece of data comes from during an exam. This is the logic wired into the build — nothing hidden.</div>' +
      tokenGroupHtml("Required — must be present to score", det.req, "req") +
      tokenGroupHtml("Supportive — raise confidence", det.sup, "sup") +
      tokenGroupHtml("Contradicting — lower / rule out", det.con, "con") +
      tokenGroupHtml("Temporal", det.temporal, "tmp") +
      tokenGroupHtml("Objective tests / signs", det.tests, "tst") +
      (det.exclusions.length ? '<div class="val-excl">Supersedes: ' + _ve(det.exclusions.join(", ")) + '</div>' : "") +
      '<div class="val-actions">' +
        (canVerify
          ? '<button class="btn btn-p" onclick="valVerify(\'' + _ve(det.name).replace(/'/g, "\\'") + '\')">Verify ✓ (record my clinical sign-off)</button>'
          : '') +
        '<button class="btn btn-s" onclick="valEdit(\'' + _ve(det.name).replace(/'/g, "\\'") + '\')">Edit logic / tokens…</button>' +
      '</div>' +
      '<div class="val-subnote">Need “any one of these findings” instead of all of them (alternative / substitute tokens)? ' +
        'That is an engine-semantics change flagged for a separate decision — for now, add a synonym in the token dictionary or split the condition. ' +
        'Verifying, editing, and adding/removing tokens above all feed the online KB push once you publish.</div>';

    valMarkListSelection();
  }
}

/* Node/UMD export for tests. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    VAL_PRODUCER_LABELS: VAL_PRODUCER_LABELS,
    valTokenMeaning: valTokenMeaning,
    valTokenWiring: valTokenWiring,
    valTokenRow: valTokenRow,
    valConditionDetail: valConditionDetail,
    valStatusOf: valStatusOf,
    valConditionList: valConditionList
  };
}
