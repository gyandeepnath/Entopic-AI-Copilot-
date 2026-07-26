/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — OSCE CIRCUIT UI                                        */
/*                                                                  */
/* Two screens, both deliberately austere:                          */
/*                                                                  */
/*   • The STATION BREAK, between stations. Under exam conditions a  */
/*     candidate does not get the answer at the bell — so this shows */
/*     only that the station closed and how far through the circuit  */
/*     they are. Marks and answers are withheld until the circuit    */
/*     ends, which is what stops station 1's feedback from coaching  */
/*     station 2.                                                    */
/*   • The CIRCUIT DEBRIEF, at the end. Everything at once: per      */
/*     marking-domain averages, per-station rows, and the diagnosis  */
/*     for each station they got wrong.                              */
/*                                                                  */
/* Practice only — the pass mark is a teaching default, not a        */
/* certifying standard, and the screens say so.                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function osceBar(v, colour) {
  var pct = Math.round(Math.max(0, Math.min(1, v || 0)) * 100);
  return '<div style="flex:1;height:5px;background:var(--gr);border-radius:3px;overflow:hidden">' +
    '<div style="width:' + pct + '%;height:100%;background:' + (colour || "var(--ink)") + '"></div></div>';
}

function osceDomainRow(label, value, applies) {
  if (!applies) {
    return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.6rem">' +
      '<div style="width:130px">' + esc(label) + '</div>' +
      '<div style="flex:1;color:var(--sv)">not assessed — no red-flag station in this circuit</div></div>';
  }
  var pct = Math.round((value || 0) * 100);
  var colour = pct >= 70 ? "#2e7d32" : (pct >= 50 ? "#b8860b" : "#c0392b");
  return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.6rem">' +
    '<div style="width:130px">' + esc(label) + '</div>' +
    osceBar(value, colour) +
    '<div style="width:38px;text-align:right;font-family:var(--mono)">' + pct + '%</div></div>';
}

/* ── Between stations ────────────────────────────────────────────── */

function osceShowStationBreak() {
  var doneN = OSCE.index;
  var total = OSCE.stations.length;
  var last = OSCE.results[OSCE.results.length - 1];
  var finished = doneN >= total;

  var h = '<div class="modal-title">Station ' + doneN + ' closed</div>' +
    '<div class="modal-desc" style="font-size:.66rem">' +
      (last && last.timedOut
        ? 'The bell went before you committed. That is recorded — running out of time is part of the exercise.'
        : 'Answer submitted. Marks are withheld until the whole circuit is finished, exactly as in a real OSCE.') +
    '</div>' +
    '<div style="display:flex;gap:4px;margin:12px 0">';
  for (var i = 0; i < total; i++) {
    h += '<div style="flex:1;height:6px;border-radius:3px;background:' +
      (i < doneN ? "var(--ink)" : "var(--gr)") + '"></div>';
  }
  h += '</div>' +
    '<div style="font-size:.62rem;color:var(--sl);margin-bottom:10px">' +
      doneN + ' of ' + total + ' stations done' +
      (finished ? '' : ' · next station is ' + Math.round(OSCE_CONFIG.stationSeconds / 60) + ' minutes') +
    '</div>';

  h += '<div class="btn-g">' +
    (finished
      ? '<button class="btn btn-p" onclick="simCloseModal();osceFinish()">See your circuit result</button>'
      : '<button class="btn btn-p" onclick="simCloseModal();osceNextStation()">Next station →</button>' +
        '<button class="btn btn-s" onclick="simCloseModal();osceFinishEarly()">End circuit here</button>') +
    '</div>';
  simShowModal(h);
}

/* Ending early still marks what was completed — the summary is honest about
   how many stations were actually attempted. */
function osceFinishEarly() {
  if (!window.confirm("End the circuit now? The stations you have done will still be marked.")) {
    osceShowStationBreak();
    return;
  }
  osceFinish();
}

/* ── Circuit debrief ─────────────────────────────────────────────── */

function osceShowSummary(sum) {
  if (!sum) { simCloseModal(); if (typeof goHome === "function") goHome(); return; }
  var w = OSCE_CONFIG.weights;
  var pct = Math.round(sum.total * 100);
  var mins = Math.floor(sum.seconds / 60), secs = sum.seconds % 60;

  var h = '<div class="modal-title">OSCE circuit — ' + pct + '%</div>' +
    '<div class="modal-desc" style="font-size:.66rem">' +
      sum.correct + ' of ' + sum.stations + ' stations diagnosed correctly' +
      (sum.timedOut ? ' · ' + sum.timedOut + ' timed out' : '') +
      ' · ' + mins + 'm ' + secs + 's total.' +
    '</div>';

  h += '<div style="margin:10px 0;padding:8px;border:1px solid var(--fg);border-radius:var(--r);' +
       'background:' + (sum.passed ? "rgba(46,125,50,.06)" : "var(--sn)") + '">' +
    '<div style="font-size:.64rem;font-weight:600;margin-bottom:6px">' +
      (sum.passed ? "✓ Above the practice mark" : "Below the practice mark") +
      ' <span style="font-weight:400;color:var(--sv)">(' + Math.round(OSCE_CONFIG.passMark * 100) + '%)</span></div>' +
    osceDomainRow("Data gathering", sum.gathering, true) +
    osceDomainRow("Decisive finding", sum.decisive, true) +
    osceDomainRow("Diagnosis", sum.diagnosis, true) +
    osceDomainRow("Safety", sum.safety, sum.safety !== null) +
    '<div style="font-size:.52rem;color:var(--sv);margin-top:6px">' +
      'Weighted ' + Math.round(w.gathering * 100) + '/' + Math.round(w.decisive * 100) + '/' +
      Math.round(w.diagnosis * 100) + '/' + Math.round(w.safety * 100) + '. ' +
      'You can pass on diagnosis and still fail on safety — they are marked separately on purpose.</div>' +
  '</div>';

  /* Safety is called out on its own, because it is the one that matters most. */
  if (sum.safetyStations && sum.safety !== null && sum.safety < 1) {
    h += '<div style="border-left:3px solid #c0392b;padding:6px 10px;margin-bottom:8px;background:var(--sn)">' +
      '<div style="font-size:.62rem;font-weight:600">Red-flag stations</div>' +
      '<div style="font-size:.6rem;color:var(--md)">' +
        sum.safetyStations + ' station' + (sum.safetyStations === 1 ? '' : 's') +
        ' in this circuit carried an urgent finding, and you did not uncover all of them. ' +
        'Rerun the red-flag circuit — these are the cases where being wrong costs the most.</div>' +
    '</div>';
  }

  /* Per-station rows — the answer is revealed here and only here. */
  h += '<div style="font-size:.62rem;font-weight:600;margin:8px 0 3px">Station by station</div>';
  sum.perStation.forEach(function (r, i) {
    h += '<div style="border-top:1px solid var(--fg);padding:5px 0;font-size:.6rem">' +
      '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">' +
        '<div><b>' + (i + 1) + '. ' + esc(r.station) + '</b>' +
          (r.urgent ? ' <span style="color:#c0392b;font-size:.5rem">· URGENT</span>' : '') + '</div>' +
        '<div style="font-family:var(--mono)">' + Math.round(r.total * 100) + '%</div>' +
      '</div>' +
      '<div style="color:var(--sv);font-size:.56rem">' +
        (r.correct ? '✓ correct' : '✗ you said ' + esc(r.guess || "—")) +
        ' · ' + esc(r.domain) +
        ' · ' + r.seconds + 's' +
        (r.timedOut ? ' · timed out' : '') +
      '</div>' +
    '</div>';
  });

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:10px">' +
    'Practice only. Station timing, weighting and the pass mark are teaching defaults set in the app, ' +
    'not a published examination standard, and nothing here certifies competence. ' +
    'Cases are generated from the knowledge base and inherit its provisional status.</div>';

  h += '<div class="btn-g" style="margin-top:10px">' +
      '<button class="btn btn-p" onclick="simCloseModal();osceStart(\'' + esc(OSCE.scope || "common") + '\')">Another circuit</button>' +
      '<button class="btn btn-s" onclick="simCloseModal();goHome()">Finish</button>' +
    '</div>';
  simShowModal(h);
}
