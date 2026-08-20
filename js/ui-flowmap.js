/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DIAGNOSTIC FLOW MAP                                   */
/*                                                                  */
/* Visual trace of the engine's reasoning process.                 */
/* Shows: Tokens → Routes → Scoring → Exclusions → Results        */
/* Toggleable from the advisory panel via "Show Reasoning" button  */
/*                                                                  */
/* Reads from: ENGINE_STATE, V.dxList, V.alerts                   */
/* Injected into: advisory panel (appended by renderAdvisory)      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* STATE                                                           */
/* ═══════════════════════════════════════════════════════════════ */

/* Visible by DEFAULT — the live reasoning map is core to Entopic's identity
   (the "glass box"): the clinician should see the engine think, not have to
   ask it to. It re-renders on every data entry (nav()/renderAdvisory), so it
   tracks the exam in real time. Toggle only hides it for a wider notes view. */
var FLOWMAP_VISIBLE = true;


/* ═══════════════════════════════════════════════════════════════ */
/* TOGGLE                                                          */
/* Called from advisory panel button                               */
/* ═══════════════════════════════════════════════════════════════ */

function toggleFlowMap() {
  FLOWMAP_VISIBLE = !FLOWMAP_VISIBLE;
  renderAdvisory();
}


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER FLOW MAP HTML                                            */
/* Returns HTML string to be appended inside advisory panel        */
/* ═══════════════════════════════════════════════════════════════ */

function renderFlowMap() {

  if (!FLOWMAP_VISIBLE) {
    return '<div style="margin-top:8px">' +
      '<button class="btn btn-d" onclick="toggleFlowMap()" style="width:100%;font-size:.58rem;justify-content:center">' +
        '◆ Show Diagnostic Reasoning' +
      '</button>' +
    '</div>';
  }

  /* Guard: no engine data */
  if (typeof ENGINE_STATE === "undefined" || !ENGINE_STATE.tokens || ENGINE_STATE.tokens.length === 0) {
    return '<div style="margin-top:8px">' +
      '<button class="btn btn-d" onclick="toggleFlowMap()" style="width:100%;font-size:.58rem;justify-content:center">' +
        '◇ Hide Diagnostic Reasoning' +
      '</button>' +
      '<div style="padding:10px;font-size:.6rem;color:var(--sv);text-align:center;border:1px dashed var(--ms);border-radius:var(--r);margin-top:6px">' +
        'No data entered yet — reasoning map will appear as you enter clinical data.' +
      '</div>' +
    '</div>';
  }

  var h = '<div style="margin-top:8px">';

  /* Live header — makes the auto-looping nature explicit. */
  h += '<div class="adv-sec" style="display:flex;align-items:center;gap:6px">' +
    '<span style="width:7px;height:7px;border-radius:50%;background:#27ae60;display:inline-block;box-shadow:0 0 0 0 rgba(39,174,96,.5);animation:entopicPulse 1.6s infinite"></span>' +
    'Diagnostic Engine · live' +
    '<span style="flex:1"></span>' +
    '<button onclick="openEngineMap()" style="background:none;border:none;color:var(--md);font-size:.5rem;cursor:pointer;text-decoration:underline" title="Open the full reasoning map">expand ⤢</button>' +
    '<button onclick="toggleFlowMap()" style="background:none;border:none;color:var(--sv);font-size:.5rem;cursor:pointer;text-decoration:underline">hide</button>' +
    '</div>' +
    '<div style="font-size:.5rem;color:var(--sv);margin:-2px 0 6px">Re-evaluates every time you enter a finding — tokens → matches → differential → what to check next.</div>';

  /* ═══ THE LIVE LOOP (compact node-graph) ═══
     Inputs → leading match → what to check next, connected — the engine's
     current "thought" at a glance. Click a node to jump to where you record it. */
  h += renderInlineGraph();

  /* ═══ PIPELINE DETAIL (the original glass-box layers, collapsible) ═══
     Kept for full provenance — every stage the engine ran, inspectable. */
  h += '<details style="margin-top:8px">' +
    '<summary style="font-size:.52rem;color:var(--sv);cursor:pointer;list-style:none">▸ Pipeline detail (tokens · routes · gates · scoring · exclusions)</summary>';
  h += '<div style="border:1px solid var(--fg);border-radius:var(--rl);overflow:hidden;font-size:.58rem;margin-top:6px">';
  h += renderFlowLayer("1. Tokens Collected", "#f0f0f0", renderTokenLayer());
  h += renderFlowLayer("2. Routes Activated", "#eef0f2", renderRouteLayer());
  h += renderFlowLayer("3. Decision Tree Gates", "#f0eef2", renderGateLayer());
  h += renderFlowLayer("4. Condition Scoring", "#eef2f0", renderScoringLayer());
  h += renderFlowLayer("5. Exclusions Applied", "#f2f0ee", renderExclusionLayer());
  h += renderFlowLayer("6. Final Differential", "#eef2ee", renderResultLayer());
  h += '</div>';
  h += '<div style="text-align:center;font-size:.5rem;color:var(--sv);padding:4px 0">Pipeline: COLLECT → NORMALIZE → TEMPORAL → GATE → ROUTE → SCORE → EXCLUDE → RANK</div>';
  h += '</details>';

  h += '</div>'; /* close outer container */

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* INLINE NODE-GRAPH — the live loop, compact (fits the 310px panel) */
/* Three connected tiers: INPUTS → LEADING MATCH(es) → CHECK NEXT.    */
/* All data is already computed by the engine; this only presents it. */
/* ═══════════════════════════════════════════════════════════════ */

function renderInlineGraph() {
  var tokens = (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.tokens) ? ENGINE_STATE.tokens : [];
  var dx = (V.dxList || []);
  if (tokens.length === 0 || dx.length === 0) {
    return '<div style="padding:10px;font-size:.56rem;color:var(--sv);text-align:center;border:1px dashed var(--ms);border-radius:var(--r)">Enter findings — the live map fills in as evidence arrives.</div>';
  }

  var connector = '<div style="text-align:center;color:var(--ms);font-size:.7rem;line-height:1;margin:1px 0">↓</div>';
  var h = '<div style="border:1px solid var(--fg);border-radius:var(--rl);padding:8px;background:var(--bg2,transparent)">';

  /* — Tier 1: INPUTS — a compact chip cloud of the current tokens — */
  h += '<div style="font-size:.46rem;text-transform:uppercase;letter-spacing:.6px;color:var(--sv);margin-bottom:3px"><b style="color:var(--md)">① What you\'ve entered</b> · ' + tokens.length + ' findings</div>';
  h += '<div style="display:flex;flex-wrap:wrap;gap:2px;max-height:46px;overflow:hidden">';
  for (var i = 0; i < Math.min(tokens.length, 14); i++) {
    h += '<span style="padding:1px 5px;background:var(--fg);border-radius:2px;font-size:.5rem;color:var(--ink)">' + esc(tokens[i].replace(/_/g, " ")) + '</span>';
  }
  if (tokens.length > 14) h += '<span style="padding:1px 5px;font-size:.5rem;color:var(--sv)">+' + (tokens.length - 14) + '</span>';
  h += '</div>';

  h += connector;

  /* — Tier 2: LEADING MATCH — the top candidate as a node with a confidence
       ring, plus up to two close rivals as smaller nodes — */
  var lead = dx[0];
  h += '<div style="font-size:.46rem;text-transform:uppercase;letter-spacing:.6px;color:var(--sv);margin-bottom:3px"><b style="color:var(--md)">② Most likely</b> · by ranking, not a verdict</div>';
  h += '<div style="display:flex;align-items:center;gap:8px;padding:6px;border:1px solid ' + (lead.urgent ? 'var(--ur,#c0392b)' : 'var(--bk,#333)') + ';border-radius:var(--r);background:var(--card,transparent)">';
  h += confRing(lead.prob, lead.urgent);
  h += '<div style="flex:1;min-width:0">';
  h += '<div style="font-weight:600;font-size:.62rem;line-height:1.1">' + esc(lead.n) + (lead.urgent ? ' <span style="color:var(--ur,#c0392b);font-size:.46rem">URGENT</span>' : '') + '</div>';
  var ev = lead.evidence || {};
  if (ev.matched && ev.matched.length) h += '<div style="font-size:.48rem;color:var(--ok,#27ae60);margin-top:1px">✓ ' + esc(ev.matched.slice(0, 3).join(", ")) + (ev.matched.length > 3 ? " +" + (ev.matched.length - 3) : "") + '</div>';
  if (ev.contradicted && ev.contradicted.length) h += '<div style="font-size:.48rem;color:var(--ur,#c0392b)">✕ ' + esc(ev.contradicted.slice(0, 2).join(", ")) + '</div>';
  h += '</div></div>';

  /* close rivals within 0.15 of the leader */
  var rivals = [];
  for (var r = 1; r < dx.length && rivals.length < 2; r++) {
    if (dx[r].prob >= lead.prob - 0.15) rivals.push(dx[r]);
  }
  if (rivals.length) {
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">';
    for (var rv = 0; rv < rivals.length; rv++) {
      h += '<span style="font-size:.5rem;color:var(--sv);border:1px solid var(--fg);border-radius:10px;padding:1px 6px">vs ' + esc(rivals[rv].n) + ' ' + (rivals[rv].prob * 100).toFixed(0) + '%</span>';
    }
    h += '</div>';
  }

  /* — Tier 3: CHECK NEXT — the discriminators that would move the needle — */
  var nt = (V.nextTests || []);
  if (nt.length) {
    h += connector;
    h += '<div style="font-size:.46rem;text-transform:uppercase;letter-spacing:.6px;color:var(--sv);margin-bottom:3px"><b style="color:var(--md)">③ Check next</b> · tap to record it</div>';
    for (var n = 0; n < Math.min(nt.length, 3); n++) {
      var t = nt[n];
      var why = (t.confirms && t.confirms.length ? "supports " + t.confirms[0] : "") +
                (t.excludes && t.excludes.length ? (t.confirms && t.confirms.length ? " · " : "") + "rules out " + t.excludes[0] : "");
      h += '<div onclick="navToField(\'' + t.target + '\',' + esc(JSON.stringify(t.label)) + ',' + esc(JSON.stringify(why)) + ')" style="cursor:pointer;display:flex;align-items:center;gap:5px;padding:4px 6px;border:1px dashed var(--ms);border-radius:var(--r);margin-bottom:3px">' +
        '<span style="font-size:.6rem">🔬</span>' +
        '<span style="flex:1"><span style="font-size:.56rem;font-weight:600">' + esc(t.label) + '</span>' +
        (why ? '<br><span style="font-size:.46rem;color:var(--sv)">' + esc(why) + '</span>' : '') + '</span>' +
        '<span style="font-size:.46rem;color:var(--md)">record →</span>' +
        '</div>';
    }
  } else {
    h += connector;
    h += '<div style="font-size:.5rem;color:var(--sv);text-align:center;padding:2px">Leading diagnosis is clear — no discriminating test needed.</div>';
  }

  h += '</div>';
  return h;
}

/* Small SVG confidence donut. */
function confRing(prob, urgent) {
  var pct = Math.max(0, Math.min(1, prob || 0));
  var R = 15, C = 2 * Math.PI * R;
  var col = urgent ? '#c0392b' : (pct >= 0.6 ? '#27ae60' : pct >= 0.35 ? '#e67e22' : '#999');
  var dash = (pct * C).toFixed(1) + ' ' + C.toFixed(1);
  return '<svg width="40" height="40" viewBox="0 0 40 40" style="flex:none">' +
    '<circle cx="20" cy="20" r="' + R + '" fill="none" stroke="var(--fg,#ddd)" stroke-width="4"/>' +
    '<circle cx="20" cy="20" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="4" stroke-linecap="round" ' +
      'stroke-dasharray="' + dash + '" transform="rotate(-90 20 20)"/>' +
    '<text x="20" y="23" text-anchor="middle" font-size="10" font-weight="700" fill="' + col + '">' + (pct * 100).toFixed(0) + '</text>' +
    '</svg>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* FULL-SCREEN NODE-GRAPH OVERLAY                                   */
/* Inputs (left) → candidate conditions (middle, sized by           */
/* confidence) → next-data (right), with edges coloured green       */
/* (supports) / red (contradicts). Drawn as inline SVG (offline).   */
/* Reachable even when the side panel is hidden (tablet/chairside).  */
/* ═══════════════════════════════════════════════════════════════ */

function openEngineMap() {
  var host = document.getElementById("engineMapOverlay");
  if (!host) {
    host = document.createElement("div");
    host.id = "engineMapOverlay";
    host.className = "engine-map-overlay";
    host.addEventListener("click", function (e) { if (e.target === host) closeEngineMap(); });
    document.body.appendChild(host);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeEngineMap(); });
  }
  host.innerHTML = renderEngineMapInner();
  host.style.display = "flex";
}
function closeEngineMap() {
  var host = document.getElementById("engineMapOverlay");
  if (host) host.style.display = "none";
}
/* navigate from a node, closing the overlay first */
function engineMapNav(step) { closeEngineMap(); if (typeof nav === "function") nav(step); }
/* next-data node → close the map and jump to the exact entry field */
var _engineMapNexts = [];
function engineMapFieldIdx(i) {
  var t = _engineMapNexts[i];
  if (!t) return;
  var why = (t.confirms && t.confirms.length ? "supports " + t.confirms[0] : "") +
            (t.excludes && t.excludes.length ? (t.confirms && t.confirms.length ? " · " : "") + "rules out " + t.excludes[0] : "");
  closeEngineMap();
  if (typeof navToField === "function") navToField(t.target, t.label, why);
}

function renderEngineMapInner() {
  var h = '<div class="engine-map-box">';
  h += '<div class="engine-map-head">' +
    '<span style="width:8px;height:8px;border-radius:50%;background:#27ae60;display:inline-block;animation:entopicPulse 1.6s infinite"></span>' +
    '<b>Diagnostic Engine — reasoning map</b>' +
    '<span style="flex:1"></span>' +
    '<span style="font-size:.62rem;color:var(--sv)">Advisory only — clinical correlation required</span>' +
    '<button onclick="closeEngineMap()" class="engine-map-x" aria-label="Close">✕</button>' +
    '</div>';
  h += '<div class="engine-map-legend">' +
    '<span><span class="emk-dot" style="background:#27ae60"></span> supports</span>' +
    '<span><span class="emk-dot" style="background:#c0392b"></span> contradicts</span>' +
    '<span><span class="emk-dot" style="background:#333"></span> candidate (size = confidence)</span>' +
    '<span>🔬 = check next (click to record)</span>' +
    '</div>';
  h += '<div class="engine-map-svgwrap">' + renderEngineMapSVG() + '</div>';
  return h + '</div>';
}

function renderEngineMapSVG() {
  var tokens = (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.tokens) ? ENGINE_STATE.tokens.slice() : [];
  var dx = (V.dxList || []).slice(0, 6);
  var nexts = (V.nextTests || []).slice(0, 5);
  if (!tokens.length || !dx.length) {
    return '<div style="padding:40px;text-align:center;color:var(--sv)">No data yet — enter findings to see the engine reason.</div>';
  }

  /* Which tokens are relevant to the shown conditions (matched or contradicted)?
     Prioritise those; fill up to 14 with the rest so the picture stays readable. */
  var rel = {};
  dx.forEach(function (d) {
    var ev = d.evidence || {};
    (ev.matched || []).forEach(function (t) { rel[t] = true; });
    (ev.contradicted || []).forEach(function (t) { rel[t] = true; });
  });
  var relTokens = tokens.filter(function (t) { return rel[t]; });
  var otherTokens = tokens.filter(function (t) { return !rel[t]; });
  var shownTokens = relTokens.concat(otherTokens).slice(0, 14);

  var W = 960, padY = 44;
  var rows = Math.max(shownTokens.length, dx.length * 2, nexts.length, 4);
  var H = padY * 2 + (rows - 1) * 40 + 20;
  var xTok = 120, xCond = 470, xNext = 720;

  function ys(n, i) { return n <= 1 ? H / 2 : padY + i * ((H - 2 * padY) / (n - 1)); }
  var tokY = {}, condY = {};
  shownTokens.forEach(function (t, i) { tokY[t] = ys(shownTokens.length, i); });
  dx.forEach(function (d, i) { condY[d.n] = ys(dx.length, i) + 0; });

  var edges = "", nodes = "";

  /* token → condition edges (green supports / red contradicts).
     The LEADING candidate's edges are bold + opaque; rivals' edges fade back,
     so the eye follows the current best explanation instead of a hairball. */
  dx.forEach(function (d, di) {
    var ev = d.evidence || {}, cy = condY[d.n], lead = di === 0;
    (ev.matched || []).forEach(function (t) {
      if (tokY[t] === undefined) return;
      edges += '<line x1="' + xTok + '" y1="' + tokY[t] + '" x2="' + (xCond - 34) + '" y2="' + cy + '" stroke="#27ae60" stroke-width="' + (lead ? 1.8 : 1) + '" opacity="' + (lead ? 0.75 : 0.14) + '"/>';
    });
    (ev.contradicted || []).forEach(function (t) {
      if (tokY[t] === undefined) return;
      edges += '<line x1="' + xTok + '" y1="' + tokY[t] + '" x2="' + (xCond - 34) + '" y2="' + cy + '" stroke="#c0392b" stroke-width="' + (lead ? 1.8 : 1) + '" stroke-dasharray="3 2" opacity="' + (lead ? 0.8 : 0.22) + '"/>';
    });
  });
  /* condition → next-data edges */
  nexts.forEach(function (nt, i) {
    var ny = ys(nexts.length, i);
    (nt.confirms || []).forEach(function (nm) { if (condY[nm] !== undefined) edges += '<line x1="' + (xCond + 34) + '" y1="' + condY[nm] + '" x2="' + xNext + '" y2="' + ny + '" stroke="#27ae60" stroke-width="1" opacity="0.45"/>'; });
    (nt.excludes || []).forEach(function (nm) { if (condY[nm] !== undefined) edges += '<line x1="' + (xCond + 34) + '" y1="' + condY[nm] + '" x2="' + xNext + '" y2="' + ny + '" stroke="#c0392b" stroke-width="1" stroke-dasharray="3 2" opacity="0.5"/>'; });
  });

  /* token nodes */
  shownTokens.forEach(function (t) {
    var y = tokY[t];
    nodes += '<circle cx="' + xTok + '" cy="' + y + '" r="3.5" fill="#7a7a7a"/>';
    nodes += '<text x="' + (xTok - 8) + '" y="' + (y + 3) + '" text-anchor="end" font-size="11" fill="var(--ink,#222)">' + esc(clip(t.replace(/_/g, " "), 22)) + '</text>';
  });
  /* column headers with a plain-language sub-label */
  nodes += '<text x="' + xTok + '" y="16" text-anchor="end" font-size="11" font-weight="700" fill="#888">① WHAT YOU ENTERED</text>';
  nodes += '<text x="' + xTok + '" y="28" text-anchor="end" font-size="8.5" fill="#aaa">findings so far</text>';
  nodes += '<text x="' + xCond + '" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#888">② POSSIBLE DIAGNOSES</text>';
  nodes += '<text x="' + xCond + '" y="28" text-anchor="middle" font-size="8.5" fill="#aaa">bigger = more likely</text>';
  nodes += '<text x="' + xNext + '" y="16" text-anchor="start" font-size="11" font-weight="700" fill="#888">③ CHECK NEXT</text>';
  nodes += '<text x="' + xNext + '" y="28" text-anchor="start" font-size="8.5" fill="#aaa">tap to record →</text>';

  /* condition nodes */
  dx.forEach(function (d, i) {
    var y = condY[d.n], pct = d.prob, isLead = i === 0;
    var rr = 12 + pct * 20;
    var col = d.urgent ? '#c0392b' : (pct >= 0.6 ? '#27ae60' : pct >= 0.35 ? '#e67e22' : '#999');
    nodes += '<circle cx="' + xCond + '" cy="' + y + '" r="' + rr.toFixed(1) + '" fill="' + col + '" fill-opacity="0.14" stroke="' + col + '" stroke-width="' + (isLead ? 3 : 1.5) + '"/>';
    nodes += '<text x="' + xCond + '" y="' + (y + 4) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + col + '">' + (pct * 100).toFixed(0) + '%</text>';
    nodes += '<text x="' + xCond + '" y="' + (y + rr + 12) + '" text-anchor="middle" font-size="10.5" font-weight="' + (isLead ? 700 : 400) + '" fill="var(--ink,#222)">' + esc(clip(d.n, 30)) + (d.urgent ? ' ⚠' : '') + '</text>';
  });

  /* next-data nodes (clickable → jump to the exact entry field) */
  _engineMapNexts = nexts;
  nexts.forEach(function (nt, i) {
    var y = ys(nexts.length, i);
    nodes += '<g style="cursor:pointer" onclick="engineMapFieldIdx(' + i + ')">';
    nodes += '<rect x="' + xNext + '" y="' + (y - 11) + '" width="' + (W - xNext - 12) + '" height="22" rx="5" fill="#f3f3f3" stroke="#ccc"/>';
    nodes += '<text x="' + (xNext + 8) + '" y="' + (y + 4) + '" font-size="11" fill="#222">🔬 ' + esc(clip(nt.label, 24)) + '</text>';
    nodes += '</g>';
  });

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" preserveAspectRatio="xMidYMid meet" style="min-width:640px">' +
    edges + nodes + '</svg>';
}

function clip(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }


/* ═══════════════════════════════════════════════════════════════ */
/* FLOW LAYER WRAPPER                                              */
/* Renders a single layer box with title and content               */
/* ═══════════════════════════════════════════════════════════════ */

function renderFlowLayer(title, bgColor, content) {
  return '<div style="padding:8px 10px;background:' + bgColor + ';border-bottom:1px solid var(--fg)">' +
    '<div style="font-size:.48rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--sl);margin-bottom:4px">' + title + '</div>' +
    content +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 1: TOKEN DISPLAY                                          */
/* Groups tokens by source type                                    */
/* ═══════════════════════════════════════════════════════════════ */

function renderTokenLayer() {
  var tokens = ENGINE_STATE.tokens || [];
  if (tokens.length === 0) return '<div style="color:var(--sv)">No tokens</div>';

  /* Categorize tokens by likely source */
  var symptomTokens = [];
  var findingTokens = [];
  var derivedTokens = [];
  var historyTokens = [];
  var temporalTokens = [];

  /* Known auto-derived tokens */
  var autoTokens = [
    "high_iop", "very_high_iop", "normal_iop", "thin_cornea", "narrow_angle", "shallow_ac",
    "NPC_receded", "exo_near", "eso_near", "exo_distance", "eso_distance",
    "high_ACA_ratio", "reduced_amplitude", "low_amplitude", "reduced_flipper_rate",
    "reduced_PFV", "reduced_vergence_ranges", "myopia", "hyperopia", "astigmatism",
    "unequal_refractive_error", "add_required", "improves_with_correction",
    "increased_cd", "cd_asymmetry", "nrr_thinning", "pale_disc", "disc_edema",
    "restricted_motility", "RNFL_thinning", "field_defect", "visual_field_defect",
    "young_age", "older_age", "age_over_40", "age_related", "RAPD_positive",
    "gradual_blur", "glare", "near_blur"
  ];

  var histTokenSet = [
    "diabetes_history", "hypertension_history", "autoimmune_history", "thyroid_history",
    "asthma_atopy", "eczema_history", "ra_history", "sle_history", "ms_history",
    "migraine_history", "contact_lens_use", "contact_lens_history", "trauma_history",
    "post_surgery", "blepharitis_history", "recurrent_episode", "suppression",
    "family_history", "risk_detachment"
  ];

  var tempTokenSet = [
    "acute", "chronic", "progressive", "recurrent", "intermittent", "seasonal",
    "subacute", "acute_bias", "chronic_bias", "sudden_onset", "gradual_onset"
  ];

  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    if (tempTokenSet.indexOf(t) >= 0) {
      temporalTokens.push(t);
    } else if (histTokenSet.indexOf(t) >= 0) {
      historyTokens.push(t);
    } else if (autoTokens.indexOf(t) >= 0) {
      derivedTokens.push(t);
    } else if (V.symptoms && V.symptoms.indexOf(t) >= 0) {
      symptomTokens.push(t);
    } else {
      findingTokens.push(t);
    }
  }

  var h = '';

  if (symptomTokens.length > 0) {
    h += '<div style="margin-bottom:3px"><span style="color:var(--md);font-weight:600">Symptoms:</span> ';
    h += renderTokenTags(symptomTokens, "#e0e0e0");
    h += '</div>';
  }

  if (findingTokens.length > 0) {
    h += '<div style="margin-bottom:3px"><span style="color:var(--md);font-weight:600">Findings:</span> ';
    h += renderTokenTags(findingTokens, "#d8e0e8");
    h += '</div>';
  }

  if (derivedTokens.length > 0) {
    h += '<div style="margin-bottom:3px"><span style="color:var(--md);font-weight:600">Auto-derived:</span> ';
    h += renderTokenTags(derivedTokens, "#e0e8d8");
    h += '</div>';
  }

  if (historyTokens.length > 0) {
    h += '<div style="margin-bottom:3px"><span style="color:var(--md);font-weight:600">History:</span> ';
    h += renderTokenTags(historyTokens, "#e8e0d8");
    h += '</div>';
  }

  if (temporalTokens.length > 0) {
    h += '<div style="margin-bottom:3px"><span style="color:var(--md);font-weight:600">Temporal:</span> ';
    h += renderTokenTags(temporalTokens, "#e0d8e8");
    h += '</div>';
  }

  h += '<div style="color:var(--sv);font-size:.48rem;margin-top:2px">Total: ' + tokens.length + ' tokens</div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* TOKEN TAG RENDERER                                              */
/* Renders tokens as small colored tags                            */
/* ═══════════════════════════════════════════════════════════════ */

function renderTokenTags(tokens, color) {
  var h = '';
  for (var i = 0; i < tokens.length; i++) {
    h += '<span style="display:inline-block;padding:1px 5px;margin:1px;background:' + color + ';border-radius:2px;font-size:.52rem;color:var(--ink)">' +
      tokens[i].replace(/_/g, " ") +
    '</span>';
  }
  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 2: ROUTE DISPLAY                                          */
/* Shows which clinical pathways were activated                    */
/* ═══════════════════════════════════════════════════════════════ */

function renderRouteLayer() {
  var routes = ENGINE_STATE.routes || [];
  if (routes.length === 0) return '<div style="color:var(--sv)">No routes active</div>';

  var routeColors = {
    urgent: "#d4a0a0",
    neuro: "#c0b0d0",
    retina: "#b0c0d0",
    anterior: "#d0c0b0",
    surface: "#b0d0c0",
    binocular: "#c0d0b0",
    refractive: "#d0d0b0",
    glaucoma: "#b0b0d0",
    lens: "#d0b0c0",
    general: "#d0d0d0"
  };

  var h = '<div style="display:flex;flex-wrap:wrap;gap:3px">';
  for (var i = 0; i < routes.length; i++) {
    var r = String(routes[i] == null ? "" : routes[i]);
    /* Own-property lookup, so a polluted prototype cannot supply the value
       that gets written into a style attribute; and escaped, because a route
       name reaches here from knowledge-base content. */
    var bg = Object.prototype.hasOwnProperty.call(routeColors, r) ? routeColors[r] : "#e0e0e0";
    h += '<span style="display:inline-block;padding:2px 8px;background:' + escHtml(bg) + ';border-radius:10px;font-size:.54rem;font-weight:600;color:var(--ink)">' +
      escHtml(r.toUpperCase()) +
    '</span>';
  }
  h += '</div>';

  /* Show how many conditions are on each route */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    h += '<div style="margin-top:3px;font-size:.48rem;color:var(--sv)">';
    for (var ri = 0; ri < routes.length; ri++) {
      var count = 0;
      for (var ki = 0; ki < KNOWLEDGE_ALL.length; ki++) {
        if (KNOWLEDGE_ALL[ki].route === routes[ri]) count++;
      }
      if (ri > 0) h += ' · ';
      h += escHtml(routes[ri]) + ': ' + count + ' conditions';
    }
    h += '</div>';
  }

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 3: DECISION TREE GATES                                    */
/* Shows which hard-coded gates fired                              */
/* ═══════════════════════════════════════════════════════════════ */

function renderGateLayer() {
  var tokens = ENGINE_STATE.tokens || [];
  var gates = applyDecisionTree(tokens);

  if (gates.length === 0) {
    return '<div style="color:var(--sv)">No gates triggered — normal routing</div>';
  }

  var h = '';
  for (var i = 0; i < gates.length; i++) {
    var g = gates[i];
    h += '<div style="padding:3px 0;border-bottom:1px solid var(--fg)">';
    h += '<span style="font-weight:600;color:var(--ink)">' + g.route.toUpperCase() + '</span>';
    h += ' — ' + g.reason;
    h += '<br><span style="color:var(--sl)">Prioritized: ' + g.conditions.join(", ") + '</span>';
    h += '</div>';
  }

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 4: SCORING DETAILS                                        */
/* Shows score breakdown for top conditions                        */
/* ═══════════════════════════════════════════════════════════════ */

/* ── WHY THIS LAYER MARKS THE FLOOR ──
   Shows ENGINE_STATE.results — every condition SCORED, including rejected
   candidates, because a glass box must show its working. But it used to print
   a flat top-5 with no marker, so on one symptom "Occipital Stroke 7%" sat in
   the list looking suggested when it is deliberately BELOW the display floor
   (only one of its two required findings present). Hiding it would make the
   box lie by omission; the fix is to say which side of the floor each is on. */
function renderScoringLayer() {
  var results = ENGINE_STATE.results || [];
  if (results.length === 0) return '<div style="color:var(--sv)">No conditions scored</div>';

  /* The engine owns the floor. Read it directly — no `|| 0.15` fallback,
     because a fallback IS a second copy and it would drift silently the moment
     the founder tuned the real one. engine.js loads first (index.html:600 vs
     :640), so this is a guaranteed dependency, not a hopeful one. */
  var floor = DX_FLOOR;
  var inDx = results.filter(function (r) { return r.score >= floor || r._gateReason; });
  var below = results.filter(function (r) { return !(r.score >= floor || r._gateReason); });

  /* Always show everything that made the differential, then a few of the
     near-misses. Previously this was a flat top-5, so on a rich encounter the
     shown differential could be truncated, and on a sparse one the list was
     padded with near-zero scores. */
  var ordered = inDx.concat(below.slice(0, 4));
  var h = '';
  var toShow = ordered.length;

  for (var i = 0; i < toShow; i++) {
    var r = ordered[i];
    var sd = r._scoreDetail || {};
    var pct = (r.score * 100).toFixed(0);
    var isBelow = below.indexOf(r) >= 0;

    /* The band header, printed once, where the list crosses the floor. */
    if (isBelow && (i === 0 || below.indexOf(ordered[i - 1]) < 0)) {
      h += '<div style="margin:4px 0 2px;padding-top:3px;border-top:1px dashed var(--md);' +
           'font-size:.5rem;color:var(--md);text-transform:uppercase;letter-spacing:.4px">' +
           'Considered and NOT in the differential — scored under ' +
           Math.round(floor * 100) + '%</div>';
    }

    h += '<div style="display:flex;align-items:center;gap:4px;padding:2px 0;' +
         (isBelow ? 'opacity:.6;' : '') +
         (i < toShow - 1 ? 'border-bottom:1px solid var(--fg);' : '') + '">';

    /* Score bar */
    h += '<div style="width:30px;text-align:right;font-family:var(--mono);font-weight:600;font-size:.56rem">' + pct + '%</div>';
    h += '<div style="width:50px;height:4px;background:var(--fg);border-radius:2px;overflow:hidden">';
    h += '<div style="height:100%;width:' + pct + '%;background:' + (r.urgent ? 'var(--md)' : 'var(--ink)') + ';border-radius:2px"></div>';
    h += '</div>';

    /* Name + breakdown */
    h += '<div style="flex:1">';
    /* escHtml, not raw. Every other interpolation in this file escapes; this
       one did not, and condition names are NOT purely local — they arrive from
       KB overlays and published bundles. See the header of js/dom-escape.js
       for the same bug proven exploitable elsewhere. */
    h += '<span style="font-weight:500">' + escHtml(r.name) + '</span>';
    h += '<span style="color:var(--sv)"> req:' + (sd.reqMatched || 0) + '/' + ((sd.reqMatched || 0) + (sd.reqMissing || 0)) + '</span>';
    /* Say WHY in words. "req:1/2" is precise but it is notation, and the
       missing half is the whole reason the condition is not being suggested. */
    if (sd.reqMissing > 0) {
      h += '<span style="color:var(--md)"> — ' + sd.reqMissing + ' required finding' +
           (sd.reqMissing === 1 ? '' : 's') + ' absent</span>';
    }
    h += '<span style="color:var(--sv)"> sup:' + (sd.supMatched || 0) + '</span>';
    if (sd.testsMatched) h += '<span style="color:var(--sv)"> tests:' + sd.testsMatched + '</span>';
    if (sd.conMatched > 0) h += '<span style="color:var(--md)"> con:-' + sd.conMatched + '</span>';
    if (sd.tempMatch) h += '<span style="color:var(--sl)"> temp✓</span>';
    if (r._gateReason) h += '<span style="color:var(--md)"> GATED</span>';
    h += '</div>';

    h += '</div>';
  }

  if (results.length > toShow) {
    h += '<div style="font-size:.48rem;color:var(--sv);margin-top:2px">+' +
         (results.length - toShow) + ' more scored below ' + Math.round(floor * 100) +
         '%, none of them in the differential</div>';
  }

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 5: EXCLUSION DISPLAY                                      */
/* Shows what was excluded and why                                 */
/* ═══════════════════════════════════════════════════════════════ */

function renderExclusionLayer() {
  /* Check if any results were excluded */
  /* We can detect this by comparing ENGINE_STATE.results (pre-exclusion count isn't stored)
     but we can check for _excludedBy flag on filtered results */

  /* Re-run exclusion check to find what was removed */
  var tokens = ENGINE_STATE.tokens || [];
  var allResults = [];

  if (typeof KNOWLEDGE_ALL !== "undefined") {
    var routes = ENGINE_STATE.routes || [];
    for (var ki = 0; ki < KNOWLEDGE_ALL.length; ki++) {
      var cond = KNOWLEDGE_ALL[ki];
      if (routes.indexOf(cond.route) < 0) continue;
      var sr = scoreCondition(cond, tokens);
      if (sr.score > 0) {
        /* Carry `urgent` so this display-only re-run applies the same
           "urgent is never excluded" protection as the real engine pass —
           otherwise the flow map could show an urgent condition as
           excluded when the engine actually kept it. */
        allResults.push({ name: cond.name, score: sr.score, route: cond.route, urgent: cond.urgent || false });
      }
    }
  }

  var afterExclusion = applyExclusions(allResults.slice(), tokens);
  var excluded = allResults.filter(function(r) {
    for (var i = 0; i < afterExclusion.length; i++) {
      if (afterExclusion[i].name === r.name) return false;
    }
    return true;
  });

  if (excluded.length === 0) {
    return '<div style="color:var(--sv)">No conditions excluded</div>';
  }

  var h = '';
  for (var i = 0; i < excluded.length; i++) {
    var ex = excluded[i];
    h += '<div style="padding:2px 0;text-decoration:line-through;color:var(--as)">';
    h += ex.name + ' (' + (ex.score * 100).toFixed(0) + '%)';
    if (ex._excludedBy) h += ' — excluded by ' + ex._excludedBy;
    h += '</div>';
  }

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* LAYER 6: FINAL RESULT                                           */
/* Shows the ranked differential as it appears to the clinician    */
/* ═══════════════════════════════════════════════════════════════ */

function renderResultLayer() {
  var dxList = V.dxList || [];
  if (dxList.length === 0) return '<div style="color:var(--sv)">No diagnoses</div>';

  var h = '';
  for (var i = 0; i < Math.min(dxList.length, 5); i++) {
    var d = dxList[i];
    var pct = (d.prob * 100).toFixed(0);

    h += '<div style="display:flex;align-items:center;gap:6px;padding:2px 0">';

    /* Rank number */
    h += '<span style="font-family:var(--mono);font-weight:700;font-size:.56rem;color:var(--sl);min-width:14px">#' + (i + 1) + '</span>';

    /* Bar */
    h += '<div style="width:40px;height:5px;background:var(--fg);border-radius:2px;overflow:hidden">';
    h += '<div style="height:100%;width:' + pct + '%;background:' + (d.urgent ? 'var(--md)' : 'var(--bk)') + ';border-radius:2px"></div>';
    h += '</div>';

    /* Name + score */
    /* escHtml: KB condition names arrive from overlays and published bundles. */
    h += '<span style="flex:1;font-weight:500">' + escHtml(d.n) + '</span>';
    h += '<span style="font-family:var(--mono);font-weight:700;font-size:.6rem">' + pct + '%</span>';

    h += '</div>';
  }

  /* Confidence summary */
  if (dxList.length > 0) {
    var topConf = dxList[0].evidence ? dxList[0].evidence.confidence : interpretConfidence(dxList[0].prob);
    h += '<div style="font-size:.48rem;color:var(--sv);margin-top:3px">Top diagnosis confidence: ' + topConf + '</div>';
  }

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* INTEGRATION HOOK                                                */
/* Modifies renderAdvisory to include the flow map                 */
/* Called after the original renderAdvisory completes              */
/* ═══════════════════════════════════════════════════════════════ */

/* Store original renderAdvisory */
var _originalRenderAdvisory = typeof renderAdvisory === "function" ? renderAdvisory : null;

/* Override renderAdvisory to append flow map + refresh the header badge */
renderAdvisory = function() {
  /* Call original */
  if (_originalRenderAdvisory) {
    _originalRenderAdvisory();
  }

  /* The map is the engine's reasoning made visible, so it must obey the same
     teaching gate as the panel itself — otherwise the harder simulation tiers
     would hide the differential and then draw it. */
  var hidden = (typeof simEngineHidden === "function") && simEngineHidden();

  /* Append the live reasoning map — only under the "Reasoning" tab, so the
     panel shows one focused view at a time instead of everything at once. */
  var advEl = document.getElementById("advEl");
  if (!hidden && advEl && (typeof ADV_TAB === "undefined" || ADV_TAB === "map")) {
    advEl.innerHTML += renderFlowMap();
  }

  /* Keep the always-visible header engine badge current. */
  updateEngineBadge();
};

/* The header "Engine" control: on a narrow/tablet screen (where the panel is a
   drawer) it slides the copilot in/out; on a wide screen (panel already docked)
   it opens the full-screen reasoning map. Either way the engine is one tap
   away at every size — fixing the old behaviour where it vanished ≤1000px. */
function toggleEngineView() {
  var narrow = window.matchMedia && window.matchMedia("(max-width: 1000px)").matches;
  if (narrow) {
    document.body.classList.toggle("engine-open");
  } else {
    openEngineMap();
  }
}

/* Live confidence badge in the header — leading dx % and any red-flag count. */
function updateEngineBadge() {
  var el = document.getElementById("hdrEngineBadge");
  if (!el) return;
  /* Same teaching gate — a live confidence % in the header would give the
     answer away at the tiers where the copilot is deliberately hidden. */
  if (typeof simEngineHidden === "function" && simEngineHidden()) {
    el.className = "hdr-engine-badge";
    el.textContent = "· 🔒";
    return;
  }
  var dx = (typeof V !== "undefined" && V.dxList) ? V.dxList : [];
  var urgent = (typeof V !== "undefined" && V.alerts) ? V.alerts.filter(function (a) { return a.l === "urgent"; }).length : 0;
  var parts = [];
  if (dx.length) parts.push((dx[0].prob * 100).toFixed(0) + "%");
  el.className = "hdr-engine-badge" + (urgent ? " urgent" : "");
  el.textContent = (parts.length ? "· " + parts[0] : "") + (urgent ? " ⚠" + urgent : "");
}
