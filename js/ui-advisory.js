/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ADVISORY PANEL RENDERER                               */
/* Clinical alerts, differential diagnoses with evidence trails,   */
/* nudge suggestions, medication alerts, engine status              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


function renderAdvisory() {
  var el = document.getElementById("advEl");
  if (!el) return;

  var h = '';

  /* ═══ HEADER ═══ */
  h += '<div class="adv-h">';
  h += '<h3>Advisory</h3>';
  h += '<span class="adv-badge">Evidence-Based</span>';
  h += '</div>';


  /* ═══ CLINICAL ALERTS (always visible — safety never hides) ═══ */
  if (V.alerts && V.alerts.length > 0) {
    h += '<div class="adv-sec">Clinical Alerts</div>';
    for (var ai = 0; ai < V.alerts.length; ai++) {
      h += '<div class="alert-box ' + V.alerts[ai].l + '">' + V.alerts[ai].m + '</div>';
    }
  }

  /* ═══ MEDICATION ALERTS (always visible) ═══ */
  if (typeof MEDICATION_OCULAR_EFFECTS !== "undefined" && V.hxM && V.hxM.medications) {
    var medAlerts = checkMedicationAlerts(V.hxM.medications);
    if (medAlerts.length > 0) {
      h += '<div class="adv-sec">Medication Alerts</div>';
      for (var mi = 0; mi < medAlerts.length; mi++) {
        var ma = medAlerts[mi];
        h += '<div class="alert-box warn" style="font-size:.6rem"><b>' + ma.drug + '</b>: ' + ma.effect +
          (ma.action ? '<br><span style="color:var(--sl)">' + ma.action + '</span>' : '') + '</div>';
      }
    }
  }

  if (!V.dxList || V.dxList.length === 0) {
    h += '<div style="color:var(--sv);font-size:.64rem;margin-top:12px;padding:10px;border:1px dashed var(--ms);border-radius:var(--r);text-align:center;line-height:1.5">' +
      'Enter symptoms and clinical data to generate diagnostic suggestions</div>';
    el.innerHTML = h;
    return;
  }

  /* ═══ LEADING IMPRESSION (always visible — the headline answer) ═══ */
  var lead = V.dxList[0];
  var leadPct = (lead.prob * 100).toFixed(0);
  var leadConf = (lead.evidence && lead.evidence.confidence) ? lead.evidence.confidence : "";
  h += '<div class="adv-sec">Leading Impression</div>';
  h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:3px;padding:6px 8px;border:1px solid var(--fg);border-radius:var(--r)' +
    (lead.urgent ? ';border-left:3px solid var(--ur,#c0392b)' : '') + '">';
  h += '<div style="display:flex;align-items:center;gap:6px">';
  h += '<div class="dx-n" style="flex:1;font-weight:600">' + lead.n + (lead.urgent ? ' <span style="color:var(--ur,#c0392b);font-size:.5rem">· URGENT</span>' : '') + '</div>';
  h += '<div class="dx-pct">' + leadPct + '%</div>';
  h += '</div>';
  if (leadConf) h += '<div style="font-size:.5rem;color:var(--sv)">' + leadConf + ' confidence · most likely by ranking</div>';
  h += '<div style="font-size:.5rem;color:var(--sv);font-style:italic">Advisory only — clinical correlation required. Not a definitive diagnosis.</div>';
  h += '</div>';

  /* ═══ TAB BAR — show ONE focused view at a time (less overwhelming) ═══ */
  var ntCount = (V.nextTests || []).length;
  h += '<div class="adv-tabs">' +
    advTabBtn("dx", "Differentials", V.dxList.length) +
    advTabBtn("next", "Check next", ntCount) +
    advTabBtn("map", "Reasoning", 0) +
    '</div>';

  h += '<div class="adv-tabpane">';

  /* ── TAB: DIFFERENTIALS (+ working problems) ── */
  if (ADV_TAB === "dx") {
    if (V.problemFoci && V.problemFoci.length > 1) {
      h += '<div class="adv-sec">Working Problems <span style="color:var(--sv);font-weight:400">· ' + V.problemFoci.length + ' independent</span></div>';
      for (var pf = 0; pf < V.problemFoci.length; pf++) {
        var foc = V.problemFoci[pf];
        h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:2px;padding:6px 0' +
          (foc.urgent ? ';border-left:2px solid var(--ur,#c0392b);padding-left:6px' : '') + '">';
        h += '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1">' +
          '<div style="font-size:.5rem;text-transform:uppercase;letter-spacing:.04em;color:var(--sv)">' + foc.focus + (foc.urgent ? ' · URGENT' : '') + '</div>' +
          '<div class="dx-n">' + foc.lead + '</div></div>' +
          '<div class="dx-pct">' + (foc.confidence * 100).toFixed(0) + '%</div></div>';
        if (foc.candidates.length > 1) {
          var alts = [];
          for (var ca = 1; ca < foc.candidates.length; ca++) alts.push(foc.candidates[ca].n + ' ' + (foc.candidates[ca].prob * 100).toFixed(0) + '%');
          h += '<div class="dx-evidence"><span class="missing">vs ' + alts.join(' · ') + '</span></div>';
        }
        h += '</div>';
      }
    }
    h += '<div class="adv-sec">Differentials <span style="color:var(--sv);font-weight:400">· ranked</span></div>';
    var maxToShow = Math.min(V.dxList.length, 6);
    for (var di = 0; di < maxToShow; di++) {
      var d = V.dxList[di];
      var pct = (d.prob * 100).toFixed(0);
      var ev = d.evidence || {};
      h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:2px;padding:6px 0">';
      h += '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1">' +
        '<div class="dx-n">' + d.n + '</div><div class="dx-icd">' + d.icd + (d.domain ? ' · ' + d.domain : '') + '</div></div>';
      h += '<div class="dx-bar"><div class="dx-bar-fill" style="width:' + pct + '%"></div></div>';
      h += '<div class="dx-pct">' + pct + '%</div></div>';
      if (ev.matched && ev.matched.length > 0) {
        h += '<div class="dx-evidence"><span class="matched">' + ev.matched.slice(0, 4).join(", ") + '</span>' +
          (ev.matched.length > 4 ? '<span class="matched"> +' + (ev.matched.length - 4) + '</span>' : '') +
          (ev.missing && ev.missing.length > 0 ? ' · <span class="missing">need: ' + ev.missing.slice(0, 3).join(", ") + '</span>' : '') + '</div>';
      }
      h += '</div>';
    }
    if (V.dxList.length > maxToShow) {
      h += '<div style="font-size:.54rem;color:var(--sv);text-align:center;padding:4px">+' + (V.dxList.length - maxToShow) + ' more — see Diagnosis page</div>';
    }
  }

  /* ── TAB: CHECK NEXT (the refinement loop + accuracy nudges) ── */
  if (ADV_TAB === "next") {
    if (V.nextTests && V.nextTests.length > 0) {
      h += '<div class="adv-sec">Check next <span style="color:var(--sv);font-weight:400">· tap to record</span></div>';
      for (var nt = 0; nt < V.nextTests.length; nt++) {
        var t = V.nextTests[nt];
        var ntWhy = (t.confirms && t.confirms.length ? "supports " + t.confirms[0] : "") +
                    (t.excludes && t.excludes.length ? (t.confirms && t.confirms.length ? " · " : "") + "rules out " + t.excludes[0] : "");
        h += '<div class="nudge" style="display:flex;flex-direction:column;align-items:stretch;gap:2px" onclick="navToField(\'' + t.target + '\',' + esc(JSON.stringify(t.label)) + ',' + esc(JSON.stringify(ntWhy)) + ')">';
        h += '<div style="display:flex;align-items:center;gap:6px"><span style="flex:1">🔬 ' + t.label + '</span>' +
          '<span style="font-size:.48rem;color:var(--sv);text-transform:uppercase">record →</span></div>';
        var impact = '';
        if (t.confirms && t.confirms.length) impact += '<span class="matched">supports ' + t.confirms[0] + (t.confirms.length > 1 ? ' +' + (t.confirms.length - 1) : '') + '</span>';
        if (t.excludes && t.excludes.length) impact += (impact ? ' · ' : '') + '<span class="missing">argues against ' + t.excludes[0] + (t.excludes.length > 1 ? ' +' + (t.excludes.length - 1) : '') + '</span>';
        if (impact) h += '<div style="font-size:.5rem">' + impact + '</div>';
        h += '</div>';
      }
    } else {
      h += '<div style="font-size:.6rem;color:var(--sv);padding:8px;text-align:center">Leading diagnosis is clear — no discriminating test needed right now.</div>';
    }
    if (V.nudges && V.nudges.length > 0) {
      h += '<div class="adv-sec">Improve Accuracy</div>';
      for (var ni = 0; ni < V.nudges.length; ni++) {
        h += '<div class="nudge" onclick="nav(\'' + V.nudges[ni].t + '\')">→ ' + V.nudges[ni].m + '</div>';
      }
    }
  }

  /* ── TAB: REASONING — the live node-graph map is appended here by
        ui-flowmap.js (renderAdvisory wrapper), only when this tab is active. ── */


  /* ═══ ENGINE STATUS (only under the Reasoning tab) ═══ */
  if (ADV_TAB === "map") {
    var tokenCount = (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.tokens) ? ENGINE_STATE.tokens.length : 0;
    h += '<div style="margin-top:8px;padding:6px;border-top:1px solid var(--fg);font-size:.48rem;color:var(--sv)">Tokens: ' + tokenCount;
    if (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.routes && ENGINE_STATE.routes.length > 0) h += ' · Routes: ' + ENGINE_STATE.routes.join(", ");
    if (typeof KNOWLEDGE_ALL !== "undefined") h += ' · KB: ' + KNOWLEDGE_ALL.length + ' conditions';
    h += '</div>';
  }

  h += '</div>'; /* close .adv-tabpane */

  el.innerHTML = h;
}

/* Which advisory tab is active (Differentials / Check next / Reasoning). */
var ADV_TAB = "dx";
function setAdvTab(t) { ADV_TAB = t; renderAdvisory(); }
function advTabBtn(id, label, count) {
  return '<button class="adv-tab' + (ADV_TAB === id ? ' active' : '') + '" onclick="setAdvTab(\'' + id + '\')">' +
    label + (count ? ' <span class="adv-tab-n">' + count + '</span>' : '') + '</button>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* MEDICATION ALERT CHECKER                                        */
/* Scans free-text medications field against MEDICATION database   */
/* ═══════════════════════════════════════════════════════════════ */

function checkMedicationAlerts(medicationText) {
  if (!medicationText || typeof MEDICATION_OCULAR_EFFECTS === "undefined") return [];

  var text = medicationText.toLowerCase();
  var alerts = [];

  for (var i = 0; i < MEDICATION_OCULAR_EFFECTS.length; i++) {
    var med = MEDICATION_OCULAR_EFFECTS[i];

    /* Check if any alias matches */
    var found = false;
    for (var a = 0; a < med.aliases.length; a++) {
      if (text.indexOf(med.aliases[a].toLowerCase()) >= 0) {
        found = true;
        break;
      }
    }

    if (found) {
      /* Add each effect as a separate alert */
      for (var e = 0; e < med.effects.length; e++) {
        var eff = med.effects[e];
        alerts.push({
          drug: med.drug,
          effect: eff.condition + ' (risk: ' + eff.risk + ', onset: ' + eff.onset + ')',
          action: eff.action,
          risk: eff.risk
        });
      }
    }
  }

  /* Sort by risk level */
  var riskOrder = { "high": 0, "moderate": 1, "low": 2 };
  alerts.sort(function(a, b) {
    return (riskOrder[a.risk] || 3) - (riskOrder[b.risk] || 3);
  });

  return alerts;
}
