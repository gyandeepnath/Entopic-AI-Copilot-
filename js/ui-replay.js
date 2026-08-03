/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — KNOWLEDGE DRIFT SCREEN  (deterministic replay)        */
/*                                                                  */
/* One question, asked of the whole practice at once:               */
/*                                                                  */
/*   "The knowledge base changed. Did that change anything for      */
/*    patients I have already seen?"                                */
/*                                                                  */
/* Before replay existed there was no way to ask it, and so a KB    */
/* update was an act of faith. The answer that matters most is not  */
/* the count of reshuffled differentials — it is whether any past   */
/* visit would no longer raise a red flag it raised at the time.    */
/* That number is shown first and on its own.                       */
/*                                                                  */
/* ── EXPLICITLY NOT A RE-DIAGNOSIS ──                             */
/*                                                                  */
/* Nothing here changes a stored record, and nothing here is a      */
/* clinical recommendation about a patient. A drifted visit is a    */
/* prompt to look, not a finding. The wording says so, because a    */
/* screen that lists patients under a heading like "missed" would   */
/* be read as one whatever the small print said.                    */
/*                                                                  */
/* ── COST ──                                                      */
/*                                                                  */
/* Each visit is two full engine runs. At ~1 ms a run, 100 visits   */
/* is a fifth of a second — so it runs on demand behind a button,   */
/* never on page load, and is capped.                               */
/*                                                                  */
/* Load order: after engine-replay.js.                              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var _replayResult = null;
var _replayBusy = false;

function replayScreen() {
  if (typeof replayRecent !== "function") return "";

  var body;
  if (_replayBusy) {
    body = '<div style="font-size:.62rem;color:var(--sv);padding:8px 0">Replaying…</div>';
  } else if (!_replayResult) {
    body = '<div style="font-size:.6rem;color:var(--sv);padding:6px 0">' +
      'Nothing has been replayed yet.</div>';
  } else if (!_replayResult.available) {
    body = '<div style="font-size:.6rem;color:var(--sv);padding:6px 0">' +
      escH(_replayResult.reason || "Replay unavailable.") + '</div>';
  } else {
    body = replayResultHtml(_replayResult);
  }

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">⏱ Knowledge drift — replay past visits</div>' +
    '<div class="home-settings-desc">' +
      'Re-runs completed visits through today\'s engine and knowledge base, using the findings ' +
      'that were recorded at the time, and reports what would come out differently. ' +
      '<b>Nothing is changed and no record is rewritten.</b>' +
      '<br><span style="color:var(--sv)">A drifted visit is a prompt to look, not a finding about ' +
      'that patient. The engine has never diagnosed anyone and does not start here.</span>' +
    '</div>' +
    '<button class="btn btn-s" style="font-size:.62rem" onclick="replayRun()">' +
      (_replayResult ? "Replay again" : "Replay recent visits") + '</button>' +
    '<div id="replayOut">' + body + '</div>' +
  '</div>';
}

function replayResultHtml(r) {
  var h = '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:8px 0;font-size:.62rem">' +
    '<div><b>' + r.examined + '</b> replayed' + (r.capped ? ' of ' + r.total : '') + '</div>' +
    '<div><b>' + r.drifted + '</b> would read differently</div>' +
    '<div style="color:' + (r.alerts_lost_total ? "#c0392b" : "#2e7d32") + '"><b>' +
      r.alerts_lost_total + '</b> red flag(s) that would no longer be raised</div>' +
    (r.not_replayable ? '<div style="color:var(--sv)"><b>' + r.not_replayable +
      '</b> too old to replay</div>' : '') +
  '</div>';

  /* The one line that changes what a clinician does next. */
  if (r.alerts_lost_total) {
    h += '<div class="alert-box urgent" style="font-size:.6rem">' +
      r.alerts_lost_total + ' alert(s) raised at the time would not be raised by today\'s ' +
      'knowledge base. Open those visits below before accepting the update.</div>';
  } else if (r.examined) {
    h += '<div class="alert-box info" style="font-size:.6rem">' +
      'No visit loses a red flag under today\'s knowledge base.</div>';
  }

  var interesting = r.rows.filter(function (x) { return x.drifted; });
  if (!interesting.length) {
    h += '<div style="font-size:.6rem;color:var(--sv);padding:6px 0">' +
      'Every replayed visit reproduces exactly.</div>';
    return h;
  }

  h += '<div style="max-height:340px;overflow:auto;border:1px solid var(--fg);border-radius:var(--r);margin-top:6px">' +
    interesting.map(function (x) {
      var why = [];
      if (x.derivation_changed) why.push("derivation");
      if (x.knowledge_changed) why.push("knowledge");
      return '<div style="display:flex;justify-content:space-between;gap:8px;padding:5px 8px;' +
          'border-bottom:1px solid var(--fg);flex-wrap:wrap;font-size:.6rem">' +
        '<div style="flex:1;min-width:150px">' + escH(x.date || "(no date)") +
          '<span style="color:var(--sv)"> · visit ' + escH(String(x.visit_id || "")) + '</span></div>' +
        '<div style="color:var(--sv)">' + (why.join(" + ") || "ranking") + '</div>' +
        (x.alerts_lost
          ? '<div style="color:#c0392b">−' + x.alerts_lost + ' alert</div>' : '') +
        (x.alerts_gained
          ? '<div style="color:#b8860b">+' + x.alerts_gained + ' alert</div>' : '') +
      '</div>';
    }).join("") + '</div>';

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:6px">' +
    '<b>derivation</b> means the same recorded findings now produce different engine tokens — ' +
    'an engine rule or a clinical threshold moved. <b>knowledge</b> means the tokens are the same ' +
    'and the conditions changed. They are separated because only the first is a change you made ' +
    'to the software.</div>';
  return h;
}

function replayRun() {
  if (_replayBusy) return;
  _replayBusy = true;
  var out = document.getElementById("replayOut");
  if (out) out.innerHTML = '<div style="font-size:.62rem;color:var(--sv);padding:8px 0">Replaying…</div>';

  /* Yield first so the "Replaying…" line actually paints before a run that
     can take a fifth of a second on a large practice. */
  setTimeout(function () {
    try {
      _replayResult = replayRecent();
    } catch (e) {
      _replayResult = { available: false, reason: "Replay failed: " + (e && e.message ? e.message : e) };
    }
    _replayBusy = false;
    var el = document.getElementById("replayOut");
    if (el) {
      el.innerHTML = _replayResult.available
        ? replayResultHtml(_replayResult)
        : '<div style="font-size:.6rem;color:var(--sv);padding:6px 0">' +
          escH(_replayResult.reason || "Replay unavailable.") + '</div>';
    }
  }, 0);
}
