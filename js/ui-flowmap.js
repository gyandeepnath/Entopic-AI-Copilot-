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

var FLOWMAP_VISIBLE = false;


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

  /* Toggle button */
  h += '<button class="btn btn-d" onclick="toggleFlowMap()" style="width:100%;font-size:.58rem;justify-content:center;margin-bottom:8px">' +
    '◇ Hide Diagnostic Reasoning' +
  '</button>';

  /* Flow container */
  h += '<div style="border:1px solid var(--fg);border-radius:var(--rl);overflow:hidden;font-size:.58rem">';


  /* ═══ LAYER 1: ACTIVE TOKENS ═══ */
  h += renderFlowLayer(
    "1. Tokens Collected",
    "#f0f0f0",
    renderTokenLayer()
  );

  /* ═══ LAYER 2: ROUTES ACTIVATED ═══ */
  h += renderFlowLayer(
    "2. Routes Activated",
    "#eef0f2",
    renderRouteLayer()
  );

  /* ═══ LAYER 3: DECISION TREE GATES ═══ */
  h += renderFlowLayer(
    "3. Decision Tree Gates",
    "#f0eef2",
    renderGateLayer()
  );

  /* ═══ LAYER 4: SCORING ═══ */
  h += renderFlowLayer(
    "4. Condition Scoring",
    "#eef2f0",
    renderScoringLayer()
  );

  /* ═══ LAYER 5: EXCLUSIONS ═══ */
  h += renderFlowLayer(
    "5. Exclusions Applied",
    "#f2f0ee",
    renderExclusionLayer()
  );

  /* ═══ LAYER 6: FINAL RESULT ═══ */
  h += renderFlowLayer(
    "6. Final Differential",
    "#eef2ee",
    renderResultLayer()
  );


  h += '</div>'; /* close flow container */

  /* Flow arrows between layers */
  h += '<div style="text-align:center;font-size:.5rem;color:var(--sv);padding:4px 0">Pipeline: COLLECT → NORMALIZE → TEMPORAL → GATE → ROUTE → SCORE → EXCLUDE → RANK</div>';

  h += '</div>'; /* close outer container */

  return h;
}


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
    "high_iop", "IOP_very_high", "normal_iop", "thin_cornea", "narrow_angle", "shallow_ac",
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
    var r = routes[i];
    var bg = routeColors[r] || "#e0e0e0";
    h += '<span style="display:inline-block;padding:2px 8px;background:' + bg + ';border-radius:10px;font-size:.54rem;font-weight:600;color:var(--ink)">' +
      r.toUpperCase() +
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
      h += routes[ri] + ': ' + count + ' conditions';
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

function renderScoringLayer() {
  var results = ENGINE_STATE.results || [];
  if (results.length === 0) return '<div style="color:var(--sv)">No conditions scored</div>';

  /* Show top 5 scored conditions with breakdown */
  var h = '';
  var toShow = Math.min(results.length, 5);

  for (var i = 0; i < toShow; i++) {
    var r = results[i];
    var sd = r._scoreDetail || {};
    var pct = (r.score * 100).toFixed(0);

    h += '<div style="display:flex;align-items:center;gap:4px;padding:2px 0;' + (i < toShow - 1 ? 'border-bottom:1px solid var(--fg);' : '') + '">';

    /* Score bar */
    h += '<div style="width:30px;text-align:right;font-family:var(--mono);font-weight:600;font-size:.56rem">' + pct + '%</div>';
    h += '<div style="width:50px;height:4px;background:var(--fg);border-radius:2px;overflow:hidden">';
    h += '<div style="height:100%;width:' + pct + '%;background:' + (r.urgent ? 'var(--md)' : 'var(--ink)') + ';border-radius:2px"></div>';
    h += '</div>';

    /* Name + breakdown */
    h += '<div style="flex:1">';
    h += '<span style="font-weight:500">' + r.name + '</span>';
    h += '<span style="color:var(--sv)"> req:' + (sd.reqMatched || 0) + '/' + ((sd.reqMatched || 0) + (sd.reqMissing || 0)) + '</span>';
    h += '<span style="color:var(--sv)"> sup:' + (sd.supMatched || 0) + '</span>';
    if (sd.testsMatched) h += '<span style="color:var(--sv)"> tests:' + sd.testsMatched + '</span>';
    if (sd.conMatched > 0) h += '<span style="color:var(--md)"> con:-' + sd.conMatched + '</span>';
    if (sd.tempMatch) h += '<span style="color:var(--sl)"> temp✓</span>';
    if (r._gateReason) h += '<span style="color:var(--md)"> GATED</span>';
    h += '</div>';

    h += '</div>';
  }

  if (results.length > toShow) {
    h += '<div style="font-size:.48rem;color:var(--sv);margin-top:2px">+' + (results.length - toShow) + ' more conditions scored</div>';
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
    h += '<span style="flex:1;font-weight:500">' + d.n + '</span>';
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

/* Override renderAdvisory to append flow map */
renderAdvisory = function() {
  /* Call original */
  if (_originalRenderAdvisory) {
    _originalRenderAdvisory();
  }

  /* Append flow map */
  var advEl = document.getElementById("advEl");
  if (advEl) {
    advEl.innerHTML += renderFlowMap();
  }
};
