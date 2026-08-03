/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ADVISORY PANEL RENDERER                               */
/* Clinical alerts, differential diagnoses with evidence trails,   */
/* nudge suggestions, medication alerts, engine status              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* What the copilot column shows while it is deliberately withheld. Kept
   informative rather than blank, so it reads as a mode, not a fault. */
function advisoryHiddenPanel() {
  var tier = (typeof simTier === "function") ? simTier(SIM.tier) : { label: "Challenge", icon: "🔒" };
  var found = (V.symptoms || []).length;
  return '<div class="adv-h"><h3>Advisory</h3><span class="adv-badge">Hidden</span></div>' +
    '<div style="margin-top:12px;padding:12px;border:1px dashed var(--ms);border-radius:var(--r);text-align:center">' +
      '<div style="font-size:1.4rem;line-height:1">' + tier.icon + '</div>' +
      '<div style="font-size:.66rem;font-weight:600;margin-top:6px">Copilot off — ' + esc(tier.label) + ' tier</div>' +
      '<div style="font-size:.58rem;color:var(--sv);margin-top:4px;line-height:1.5">' +
        'The differential is withheld so the reasoning is yours. Keep examining, then commit — ' +
        'the engine\'s own ranking is revealed in the debrief so you can compare it against your thinking.' +
      '</div>' +
      '<div style="font-size:.58rem;color:var(--sl);margin-top:8px">' +
        '<b>' + found + '</b> finding(s) recorded so far</div>' +
      '<button class="btn btn-p" style="font-size:.6rem;margin-top:8px" onclick="simOpenAnswer()">Commit to a diagnosis</button>' +
    '</div>' +
    '<div style="font-size:.52rem;color:var(--sv);margin-top:8px;text-align:center">' +
      'Teaching mode on a simulated patient. The engine is running normally on real exams.</div>';
}

function renderAdvisory() {
  var el = document.getElementById("advEl");
  if (!el) return;

  /* ═══ SIMULATION: engine hidden at the harder teaching tiers ═══
     This is the pedagogic point of Challenge/OSCE — the student commits on
     their own reasoning and only then compares it against the engine. It is
     a TEACHING mode on a simulated patient (P.sim), never a real exam: the
     gate is driven by simEngineHidden(), which is false whenever a simulation
     is not running. Red-flag alerts are not suppressed here — they are simply
     not generated for the student, because in this mode the alert IS the
     answer being examined. */
  if (typeof simEngineHidden === "function" && simEngineHidden()) {
    el.innerHTML = advisoryHiddenPanel();
    return;
  }

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

  /* ═══ DATA CHECK (M-5) — plausibility of entered numerics, advisory ═══
     Shown whether or not there is a differential yet, so a mistyped IOP or an
     impossible axis is caught early. Never blocks entry. */
  if (typeof clinValidateVisit === "function") {
    var dataIssues = clinValidateVisit(V, typeof P !== "undefined" ? P : null);
    if (dataIssues.length) {
      h += '<div class="adv-sec">Data check</div>';
      for (var di = 0; di < dataIssues.length; di++) {
        var iss = dataIssues[di];
        h += '<div class="alert-box ' + (iss.level === "error" ? "warn" : "info") + '" style="font-size:.58rem">' +
          (iss.level === "error" ? "⚠ " : "") + escH(iss.message) + '</div>';
      }
    }
  }

  /* ═══ CONTRADICTIONS (Phase 4 F-2) ═══
     Two individually-plausible values that cannot both be true. Shown beside
     the per-field data check because they are the same kind of help, but
     separated because a contradiction is a stronger statement than an
     implausible value — and because the CERTAIN ones are facts while the
     others are questions. Never blocks entry. */
  if (typeof clinContradictions === "function") {
    var contras = clinContradictions(V, typeof P !== "undefined" ? P : null);
    if (contras.length) {
      h += '<div class="adv-sec">Contradictions</div>';
      for (var cx = 0; cx < contras.length; cx++) {
        var ct = contras[cx];
        h += '<div class="alert-box ' + (ct.level === "error" ? "warn" : "info") +
          '" style="font-size:.58rem">' +
          (ct.level === "error" ? "⚠ " : "? ") + escH(ct.message) +
          (ct.why ? '<div style="color:var(--sl);margin-top:2px">' + escH(ct.why) + '</div>' : '') +
          '</div>';
      }
    }
  }

  /* ═══ WHAT CHANGED (Phase 4 F-6) ═══
     The engine re-runs on every keystroke and the list below silently
     redraws. This says what your last entry did to it — and, because the
     engine is deterministic over its tokens, when exactly one finding
     changed it can say so as cause rather than coincidence.

     Placed ABOVE the differential deliberately: an urgent alert that stopped
     showing is reported here, and that must be read before the new list. */
  if (typeof engineLastDiff === "function" && typeof engineDiffNarrate === "function") {
    var _lines = engineDiffNarrate(engineLastDiff());
    if (_lines.length) {
      h += '<div class="adv-sec">What changed</div>';
      for (var wc = 0; wc < _lines.length && wc < 6; wc++) {
        var _ln = _lines[wc];
        h += '<div class="alert-box ' +
          (_ln.level === "urgent" ? "urgent" : (_ln.level === "warn" ? "warn" : "info")) +
          '" style="font-size:.58rem">' + escH(_ln.text) + '</div>';
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
  var leadPct = (lead.prob * 100).toFixed(0);   /* match strength, not probability — see the note under the list */
  var leadConf = (lead.evidence && lead.evidence.confidence) ? lead.evidence.confidence : "";
  h += '<div class="adv-sec">Leading Impression</div>';
  h += '<div class="dx-row" style="flex-direction:column;align-items:stretch;gap:3px;padding:6px 8px;border:1px solid var(--fg);border-radius:var(--r)' +
    (lead.urgent ? ';border-left:3px solid var(--ur,#c0392b)' : '') + '">';
  h += '<div style="display:flex;align-items:center;gap:6px">';
  h += '<div class="dx-n" style="flex:1;font-weight:600">' + lead.n + (lead.urgent ? ' <span style="color:var(--ur,#c0392b);font-size:.5rem">· URGENT</span>' : '') + '</div>';
  h += '<div class="dx-pct" title="Match strength (0-100), not a probability">' + leadPct + '</div>';
  h += '</div>';
  if (leadConf) h += '<div style="font-size:.5rem;color:var(--sv)">' + leadConf + ' confidence · best match, not most likely</div>';
  h += '<div style="font-size:.5rem;color:var(--sv);font-style:italic">Advisory only — clinical correlation required. Not a definitive diagnosis.</div>';
  h += dxInfoToggle(lead.n, "lead", lead);
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

    /* KNOWLEDGE-BASE VERIFICATION STATE, stated once, here.
       (Added 2026-08-01 after an independent review found that a clinician
       had no way to know how much of the knowledge base a clinician had
       actually checked — the answer today is none of it.)

       Deliberately ONE line at the top rather than a badge on every row:
       with 394 of 394 entries unverified, per-row marking is noise that gets
       tuned out within a day, and alert fatigue on a safety marker is worse
       than no marker. When the verified share rises this becomes genuinely
       informative rather than uniform. */
    if (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL.length) {
      var _kbVer = 0;
      for (var _kv = 0; _kv < KNOWLEDGE_ALL.length; _kv++) {
        if (KNOWLEDGE_ALL[_kv].review_status === "VERIFIED_BY_CLINICIAN") _kbVer++;
      }
      if (_kbVer < KNOWLEDGE_ALL.length) {
        h += '<div style="font-size:.5rem;line-height:1.4;color:var(--md);background:var(--sn);' +
          'border-radius:var(--r);padding:4px 6px;margin-bottom:5px">' +
          '<b>' + _kbVer + ' of ' + KNOWLEDGE_ALL.length + '</b> knowledge-base entries have been ' +
          'verified by a clinician. The rest are drafted and unreviewed — weigh them accordingly.' +
          '</div>';
      }
    }
    var maxToShow = Math.min(V.dxList.length, 6);

    /* Which entries are tied with their neighbour.

       A routine dry-eye case returns three conditions all scoring exactly the
       same, and rendering them as an ordered list made the first read as "most
       likely". The engine is saying the opposite — that it cannot tell them
       apart — so an ordered list manufactures confidence it does not have.
       Ties are now shown as ties. (Safety Register CS-07 / HF-03.) */
    var tiedWithPrev = [];
    for (var ti = 0; ti < maxToShow; ti++) {
      tiedWithPrev[ti] = (ti > 0 && Math.abs(V.dxList[ti].prob - V.dxList[ti - 1].prob) < 0.005);
    }

    for (var di = 0; di < maxToShow; di++) {
      var d = V.dxList[di];
      var pct = (d.prob * 100).toFixed(0);
      var ev = d.evidence || {};
      var tiedNext = (di + 1 < maxToShow && tiedWithPrev[di + 1]);
      var inTie = tiedWithPrev[di] || tiedNext;

      h += '<div class="dx-row' + (inTie ? ' dx-tied' : '') +
        '" style="flex-direction:column;align-items:stretch;gap:2px;padding:6px 0">';
      if (tiedWithPrev[di]) {
        h += '<div class="dx-tie-note">= equal match — the engine cannot separate this from the one above</div>';
      }
      h += '<div style="display:flex;align-items:center;gap:6px"><div style="flex:1">' +
        '<div class="dx-n">' + d.n + '</div><div class="dx-icd">' + d.icd + (d.domain ? ' · ' + d.domain : '') + '</div></div>';
      h += '<div class="dx-bar"><div class="dx-bar-fill" style="width:' + pct + '%"></div></div>';
      h += '<div class="dx-pct" title="Match strength — how much of this condition\'s expected evidence is present. NOT a probability of having it.">' + pct + '</div></div>';
      /* Why it was force-surfaced. Shown ABOVE the evidence line and styled
         distinctly, because "you recorded flashes and floaters, so this is on
         the list whatever it scored" is the most useful sentence the engine
         can say — and it was previously appended to the end of a string
         nobody reads (Phase 4 F-5). */
      if (d.gatedBecause) {
        h += '<div class="dx-gated">Shown because: ' + escH(d.gatedBecause) + '</div>';
      }
      if (ev.matched && ev.matched.length > 0) {
        h += '<div class="dx-evidence"><span class="matched">' + ev.matched.slice(0, 4).join(", ") + '</span>' +
          (ev.matched.length > 4 ? '<span class="matched"> +' + (ev.matched.length - 4) + '</span>' : '') +
          (ev.missing && ev.missing.length > 0 ? ' · <span class="missing">need: ' + ev.missing.slice(0, 3).join(", ") + '</span>' : '') + '</div>';
      }
      h += dxInfoToggle(d.n, "d" + di, d);
      h += '</div>';
    }
    if (V.dxList.length > maxToShow) {
      h += '<div style="font-size:.54rem;color:var(--sv);text-align:center;padding:4px">+' + (V.dxList.length - maxToShow) + ' more — see Diagnosis page</div>';
    }
    /* What the number means. It is a match score — how much of the condition's
       expected evidence is present — and nothing has calibrated it against
       outcomes. Displayed bare as "75" rather than "75%" so it is not read as
       "75% likely", which is a frequency claim nobody has earned. */
    h += '<div class="dx-scale-note">Match strength (0–100): how much of each ' +
      'condition\'s expected evidence is present. <b>Not a probability</b> — ' +
      'it has not been calibrated against outcomes.</div>';
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
    /* Published clinical scales that the recorded findings make relevant.
       The scale asks the clinician for the few inputs it needs rather than
       inferring them, and shows no risk figure until they are answered. */
    if (typeof scalesRelevant === "function" && typeof scaleCardHtml === "function") {
      var relScales = scalesRelevant(V);
      for (var rs = 0; rs < relScales.length; rs++) h += scaleCardHtml(relScales[rs].id);
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
/* "ⓘ ABOUT THIS CONDITION" TOGGLE                                  */
/* A per-diagnosis disclosure that expands a plain-language reference */
/* summary from knowledge/condition-info.js. This is REFERENCE prose  */
/* only — it never feeds the engine. Provisional AI-authored entries  */
/* carry a visible "pending clinician verification" badge so the       */
/* founder can tell verified from unverified content at a glance.      */
/* Conditions without an entry show a neutral "no summary yet" state   */
/* — nothing is fabricated on the fly (no-fabrication guardrail).      */
/* ═══════════════════════════════════════════════════════════════ */
var DX_INFO_OPEN = {}; /* keyed by row id ("lead", "d0"…) → bool */

function toggleDxInfo(rowId) {
  DX_INFO_OPEN[rowId] = !DX_INFO_OPEN[rowId];
  renderAdvisory();
}

function dxInfoToggle(name, rowId, dx) {
  var open = !!DX_INFO_OPEN[rowId];
  var h = '<div class="dx-info-wrap">';
  h += '<button class="dx-info-btn' + (open ? ' open' : '') + '" onclick="event.stopPropagation();toggleDxInfo(\'' + rowId + '\')" ' +
    'aria-expanded="' + (open ? 'true' : 'false') + '">' +
    '<span class="dx-info-i">ⓘ</span> About this condition <span class="dx-info-caret">' + (open ? '▾' : '▸') + '</span></button>';
  if (open) {
    /* Best available content: hand-authored rich summary, else a profile derived
       from the KB definition (so every condition has real, non-fabricated text). */
    var findFn = (typeof findCondition === "function") ? findCondition : null;
    var prettyFn = (typeof kbPrettyToken === "function") ? kbPrettyToken : null;
    var info = (typeof resolveConditionInfo === "function") ? resolveConditionInfo(name, findFn, prettyFn) : null;

    h += '<div class="dx-info-body">';
    if (info) {
      h += '<div class="dx-info-summary">' + escH(info.summary) + '</div>';
      if (info.facts && info.facts.length) {
        h += '<ul class="dx-info-facts">';
        for (var i = 0; i < info.facts.length; i++) h += '<li>' + escH(info.facts[i]) + '</li>';
        h += '</ul>';
      }
      /* Provenance line — verified prose vs. auto-derived from the definition.
         A founder sign-off in the Clinical Review Queue flips the live
         condition to VERIFIED_BY_CLINICIAN, which replaces the provisional
         warning with the attestation line. */
      var _verified = (typeof kbConditionVerified === "function") && kbConditionVerified(name);
      if (_verified && info.kind === "authored") {
        var _vc = (typeof findCondition === "function") ? findCondition(name) : null;
        h += '<div class="dx-info-verified">✓ Clinically verified' +
          (_vc && _vc.review_verified_on ? ' on ' + escH(_vc.review_verified_on) : '') +
          (_vc && _vc.review_verified_by ? ' by ' + escH(_vc.review_verified_by) : '') + '</div>';
      } else if (info.kind === "authored" && info.review) {
        h += '<div class="dx-info-review">⚠ Provisional reference summary — pending clinician verification. ' +
          'Not a source of clinical thresholds, doses, or statistics.</div>';
      } else if (info.kind === "derived") {
        h += '<div class="dx-info-derived">Auto-generated from this condition\'s definition in the knowledge base' +
          (info.icdStatus === "NEEDS_CLINICAL_REVIEW" ? ' · ICD code pending clinical review' : '') +
          '. A fuller written summary can be added in the KB editor.</div>';
      }
    } else {
      h += '<div class="dx-info-none">No information available for this condition.</div>';
    }

    /* ── ENGINE-CONNECTED: how THIS patient's findings map onto the condition ──
       Uses the live evidence the engine already computed for this differential.
       Display-only — the reference text never feeds scoring; this is the engine
       explaining itself, tying the reference card to the actual exam. */
    h += dxInfoInPatient(dx);

    h += '</div>';
  }
  h += '</div>';
  return h;
}

/* The "In this patient" block — engine evidence for one differential. */
function dxInfoInPatient(dx) {
  if (!dx || !dx.evidence) return '';
  var ev = dx.evidence;
  var pretty = (typeof kbPrettyToken === "function") ? kbPrettyToken : function (t) { return String(t).replace(/_/g, " "); };
  function chips(arr, cls, cap) {
    var out = '';
    for (var i = 0; i < arr.length && i < (cap || 6); i++) out += '<span class="dxip-chip ' + cls + '">' + escH(pretty(arr[i])) + '</span>';
    if (arr.length > (cap || 6)) out += '<span class="dxip-chip ' + cls + '">+' + (arr.length - (cap || 6)) + '</span>';
    return out;
  }
  var matched = ev.matched || [], missing = ev.missing || [], contra = ev.contradicted || [];
  if (!matched.length && !missing.length && !contra.length) return '';

  var h = '<div class="dxip">';
  h += '<div class="dxip-h">In this patient' +
    (typeof dx.prob === "number" ? ' <span class="dxip-prob">' + (dx.prob * 100).toFixed(0) + '% now</span>' : '') + '</div>';
  if (matched.length) h += '<div class="dxip-row"><span class="dxip-lbl matched">observed</span>' + chips(matched, "matched") + '</div>';
  if (missing.length) h += '<div class="dxip-row"><span class="dxip-lbl missing">would support</span>' + chips(missing, "missing") + '</div>';
  if (contra.length) h += '<div class="dxip-row"><span class="dxip-lbl contra">argues against</span>' + chips(contra, "contra") + '</div>';
  h += '<div class="dxip-foot">These are the engine\'s matched / missing / contradicting findings for the current exam — advisory only.</div>';
  h += '</div>';
  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* MEDICATION ALERT CHECKER                                        */
/* Scans free-text medications field against MEDICATION database   */
/*                                                                  */
/* This was a second, independently written copy of the alias       */
/* matching in js/medication-checker.js — and it carried the same   */
/* bug: a bare indexOf matched "chloroquine" inside                 */
/* "hydroxychloroquine", so a patient on one drug raised alerts for */
/* two. Fixing the first copy would have left this one wrong, which */
/* is exactly why the matching rule now lives in ONE function that  */
/* both callers use.                                                */
/* ═══════════════════════════════════════════════════════════════ */

function checkMedicationAlerts(medicationText) {
  if (!medicationText || typeof MEDICATION_OCULAR_EFFECTS === "undefined") return [];

  var text = String(medicationText).toLowerCase();
  var alerts = [];

  for (var i = 0; i < MEDICATION_OCULAR_EFFECTS.length; i++) {
    var med = MEDICATION_OCULAR_EFFECTS[i];

    var found = false;
    for (var a = 0; a < med.aliases.length; a++) {
      /* medAliasMatches lives in js/medication-checker.js, which loads first.
         Guarded so this panel still renders if that module is absent. */
      var hit = (typeof medAliasMatches === "function")
        ? medAliasMatches(text, med.aliases[a])
        : text.indexOf(String(med.aliases[a]).toLowerCase()) >= 0;
      if (hit) { found = true; break; }
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
