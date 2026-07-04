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


  /* ═══ CLINICAL ALERTS ═══ */
  if (V.alerts && V.alerts.length > 0) {
    h += '<div class="adv-sec">Clinical Alerts</div>';

    for (var ai = 0; ai < V.alerts.length; ai++) {
      var alert = V.alerts[ai];
      h += '<div class="alert-box ' + alert.l + '">';
      h += alert.m;
      h += '</div>';
    }
  }


  /* ═══ MEDICATION ALERTS ═══ */
  if (typeof MEDICATION_OCULAR_EFFECTS !== "undefined" && V.hxM && V.hxM.medications) {
    var medAlerts = checkMedicationAlerts(V.hxM.medications);
    if (medAlerts.length > 0) {
      h += '<div class="adv-sec">Medication Alerts</div>';
      for (var mi = 0; mi < medAlerts.length; mi++) {
        var ma = medAlerts[mi];
        h += '<div class="alert-box warn" style="font-size:.6rem">';
        h += '<b>' + ma.drug + '</b>: ' + ma.effect;
        if (ma.action) {
          h += '<br><span style="color:var(--sl)">' + ma.action + '</span>';
        }
        h += '</div>';
      }
    }
  }


  /* ═══ WORKING PROBLEMS (concurrent independent foci) ═══ */
  if (V.problemFoci && V.problemFoci.length > 1) {
    h += '<div class="adv-sec">Working Problems <span style="color:var(--sv);font-weight:400">· ' + V.problemFoci.length + ' independent</span></div>';
    for (var pf = 0; pf < V.problemFoci.length; pf++) {
      var foc = V.problemFoci[pf];
      var fpct = (foc.confidence * 100).toFixed(0);
      h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:2px;padding:6px 0' +
        (foc.urgent ? ';border-left:2px solid var(--ur,#c0392b);padding-left:6px' : '') + '">';
      h += '<div style="display:flex;align-items:center;gap:6px">';
      h += '<div style="flex:1">';
      h += '<div style="font-size:.5rem;text-transform:uppercase;letter-spacing:.04em;color:var(--sv)">' +
        foc.focus + (foc.urgent ? ' · URGENT' : '') + '</div>';
      h += '<div class="dx-n">' + foc.lead + '</div>';
      h += '</div>';
      h += '<div class="dx-pct">' + fpct + '%</div>';
      h += '</div>';
      /* other candidates competing WITHIN this problem */
      if (foc.candidates.length > 1) {
        var alts = [];
        for (var ca = 1; ca < foc.candidates.length; ca++) {
          alts.push(foc.candidates[ca].n + ' ' + (foc.candidates[ca].prob * 100).toFixed(0) + '%');
        }
        h += '<div class="dx-evidence"><span class="missing">vs ' + alts.join(' · ') + '</span></div>';
      }
      if (foc.needs && foc.needs.length > 0) {
        h += '<div class="dx-evidence"><span class="missing">next: ' + foc.needs.join(", ") + '</span></div>';
      }
      h += '</div>';
    }
  }


  /* ═══ DIFFERENTIAL DIAGNOSES ═══ */
  if (V.dxList && V.dxList.length > 0) {
    h += '<div class="adv-sec">Differentials</div>';

    var maxToShow = Math.min(V.dxList.length, 6);

    for (var di = 0; di < maxToShow; di++) {
      var d = V.dxList[di];
      var pct = (d.prob * 100).toFixed(0);
      var ev = d.evidence || {};

      h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:2px;padding:6px 0">';

      /* Title row */
      h += '<div style="display:flex;align-items:center;gap:6px">';
      h += '<div style="flex:1">';
      h += '<div class="dx-n">' + d.n + '</div>';
      h += '<div class="dx-icd">' + d.icd;
      if (d.domain) h += ' · ' + d.domain;
      h += '</div>';
      h += '</div>';

      /* Confidence bar */
      h += '<div class="dx-bar"><div class="dx-bar-fill" style="width:' + pct + '%"></div></div>';
      h += '<div class="dx-pct">' + pct + '%</div>';
      h += '</div>';

      /* Evidence trail (compact) */
      if (ev.matched && ev.matched.length > 0) {
        h += '<div class="dx-evidence">';
        h += '<span class="matched">' + ev.matched.slice(0, 4).join(", ") + '</span>';
        if (ev.matched.length > 4) {
          h += '<span class="matched"> +' + (ev.matched.length - 4) + '</span>';
        }
        if (ev.missing && ev.missing.length > 0) {
          h += ' · <span class="missing">need: ' + ev.missing.slice(0, 3).join(", ") + '</span>';
        }
        h += '</div>';
      }

      h += '</div>'; /* close dx-row */
    }

    if (V.dxList.length > maxToShow) {
      h += '<div style="font-size:.54rem;color:var(--sv);text-align:center;padding:4px">+' + (V.dxList.length - maxToShow) + ' more — see Diagnosis page</div>';
    }

  } else {
    /* Empty state */
    h += '<div style="color:var(--sv);font-size:.64rem;margin-top:12px;padding:10px;border:1px dashed var(--ms);border-radius:var(--r);text-align:center;line-height:1.5">';
    h += 'Enter symptoms and clinical data to generate diagnostic suggestions';
    h += '</div>';
  }


  /* ═══ NUDGE SUGGESTIONS ═══ */
  if (V.nudges && V.nudges.length > 0) {
    h += '<div class="adv-sec">Improve Accuracy</div>';

    for (var ni = 0; ni < V.nudges.length; ni++) {
      var nudge = V.nudges[ni];
      h += '<div class="nudge" onclick="nav(\'' + nudge.t + '\')">';
      h += '→ ' + nudge.m;
      h += '</div>';
    }
  }


  /* ═══ ENGINE STATUS ═══ */
  h += '<div style="margin-top:12px;padding:6px;border-top:1px solid var(--fg);font-size:.48rem;color:var(--sv)">';

  /* Token count */
  var tokenCount = (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.tokens) ? ENGINE_STATE.tokens.length : 0;
  h += 'Tokens: ' + tokenCount;

  /* Route info */
  if (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE.routes && ENGINE_STATE.routes.length > 0) {
    h += ' · Routes: ' + ENGINE_STATE.routes.join(", ");
  }

  /* KB info */
  if (typeof KNOWLEDGE_ALL !== "undefined") {
    h += ' · KB: ' + KNOWLEDGE_ALL.length + ' conditions';
  }

  h += '</div>';


  el.innerHTML = h;
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
