/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL THRESHOLD REVIEW SCREEN  (Phase 4 F-4)       */
/*                                                                  */
/* Moving the numbers out of js/engine.js and into                  */
/* knowledge/clinical-thresholds.js only makes them reviewable if   */
/* the reviewer can actually see them. This is that screen.          */
/*                                                                  */
/* ── DELIBERATELY READ-ONLY ──                                    */
/*                                                                  */
/* There is no "edit" button, and that is a decision, not an        */
/* omission. Changing 21 mmHg to 24 mmHg silently re-scores every   */
/* past and future visit in the practice. That belongs in a source  */
/* edit that is reviewed, committed, and shipped with a version     */
/* number the visit record can point at — the same governance the   */
/* rest of the knowledge base has. A text box on a settings page    */
/* would give a load-bearing clinical constant less ceremony than   */
/* renaming a condition.                                            */
/*                                                                  */
/* What the screen IS for: seeing every number that decides a       */
/* differential, in one list, in clinical language, with the        */
/* caveats attached — so the founder can find the wrong ones.       */
/*                                                                  */
/* Load order: after knowledge/clinical-thresholds.js. Read-only —  */
/* touches no storage.                                              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var _thrFilter = "";
var _thrShowScoring = false;

function thresholdScreen() {
  if (typeof CLINICAL_THRESHOLDS === "undefined") return "";

  var open = (typeof thresholdsUnverified === "function") ? thresholdsUnverified().length : 0;
  var total = Object.keys(CLINICAL_THRESHOLDS).length +
              (typeof SCORING_THRESHOLDS !== "undefined" ? Object.keys(SCORING_THRESHOLDS).length : 0);

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">📐 Clinical thresholds — review</div>' +
    '<div class="home-settings-desc">' +
      'These are the numbers the engine compares your measurements against. ' +
      'Until now they were JavaScript literals inside the engine: signing off 394 conditions ' +
      'never signed off <b>any</b> of them, and there was no way to look at them. ' +
      'Every value here is exactly what the engine already did — nothing was changed, ' +
      'only moved into the open.' +
      '<br><span style="color:var(--sv)">Read-only on purpose. Changing one re-scores every ' +
      'visit in the practice, so it goes through a source edit that ships with a version number, ' +
      'not a text box on a settings page.</span>' +
    '</div>' +
    '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;font-size:.62rem">' +
      '<div><b>' + total + '</b> declared</div>' +
      '<div><b style="color:' + (open ? "#b8860b" : "#2e7d32") + '">' + open + '</b> awaiting your sign-off</div>' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">' +
      '<input class="e-in" id="thrFilter" placeholder="Filter by measurement, token or unit…" ' +
        'value="' + esc(_thrFilter) + '" oninput="thresholdFilter(this.value)" style="flex:1;min-width:180px">' +
      '<button class="btn ' + (_thrShowScoring ? "btn-p" : "btn-s") + '" style="font-size:.58rem" ' +
        'onclick="thresholdToggleScoring()">Scoring constants</button>' +
    '</div>' +
    '<div id="thrList">' + thresholdRows() + '</div>' +
    '<div style="font-size:.54rem;color:var(--sv);margin-top:8px">' +
      'No source is cited on any row. Several of these are numbers you would recognise, ' +
      'and it would be easy to attach a plausible guideline name to each — that is exactly ' +
      'the mistake this project has already made once. A citation nobody read is worse than ' +
      'none, because it stops the next reader checking. A source appears here when you read ' +
      'one and write it in <code>knowledge/clinical-thresholds.js</code>.' +
    '</div>' +
  '</div>';
}

function thresholdRows() {
  var q = _thrFilter.toLowerCase();
  var table = _thrShowScoring
    ? ((typeof SCORING_THRESHOLDS !== "undefined") ? SCORING_THRESHOLDS : {})
    : CLINICAL_THRESHOLDS;

  var ids = Object.keys(table).filter(function (id) {
    if (!q) return true;
    var r = table[id];
    var hay = [id, r.what || "", r.unit || "", r.where || "", (r.emits || []).join(" ")].join(" ").toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  if (!ids.length) {
    return '<div style="font-size:.6rem;color:var(--sv);padding:8px 0">Nothing matches that filter.</div>';
  }

  return '<div style="max-height:460px;overflow:auto;border:1px solid var(--fg);border-radius:var(--r)">' +
    ids.map(function (id) {
      var r = table[id];
      var verified = r.status === "VERIFIED";
      /* The comparison as the engine writes it, so what is on screen is what runs. */
      var rule = '<code style="font-size:.62rem">' + esc(String(r.op || "")) + " " +
                 '<b>' + esc(String(r.v)) + '</b>' + (r.unit ? " " + esc(r.unit) : "") + '</code>';

      return '<div style="padding:6px 8px;border-bottom:1px solid var(--fg)">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap">' +
          '<div style="font-size:.62rem;flex:1;min-width:200px">' + esc(r.what || id) + '</div>' +
          '<div>' + rule + '</div>' +
        '</div>' +
        '<div style="font-size:.54rem;color:var(--sv);margin-top:2px">' +
          esc(id) +
          (r.where ? ' · ' + esc(r.where) : '') +
          ((r.emits && r.emits.length)
            ? ' · emits <code>' + r.emits.map(esc).join('</code> <code>') + '</code>' : '') +
          ' · <b style="color:' + (verified ? "#2e7d32" : "#b8860b") + '">' +
            esc(verified ? "verified" : "unverified") + '</b>' +
        '</div>' +
        (r.note
          ? '<div style="font-size:.54rem;color:' + (/^⚠/.test(r.note) ? "#c0392b" : "var(--sv)") +
            ';margin-top:3px;font-style:italic">' + esc(r.note) + '</div>'
          : '') +
      '</div>';
    }).join("") + '</div>';
}

function thresholdFilter(v) {
  _thrFilter = v || "";
  var el = document.getElementById("thrList");
  if (el) el.innerHTML = thresholdRows();
}

function thresholdToggleScoring() {
  _thrShowScoring = !_thrShowScoring;
  if (typeof renderMain === "function") renderMain();
  else {
    var el = document.getElementById("thrList");
    if (el) el.innerHTML = thresholdRows();
  }
}
