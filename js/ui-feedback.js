/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — FEEDBACK UI                                           */
/*                                                                  */
/* Two surfaces:                                                    */
/*                                                                  */
/*   1. A report form reachable from EVERY role's home page. One    */
/*      place, same shape for a student and a consultant, because   */
/*      the person most likely to spot a knowledge-base error is    */
/*      whoever happens to be looking at it.                        */
/*                                                                  */
/*   2. An admin queue: filter, triage, notes, and a badge that     */
/*      lights for open clinical concerns.                          */
/*                                                                  */
/* The form deliberately shows the category hint BEFORE the text    */
/* box. Telling a reporter "describe the pattern, not the patient"  */
/* at the moment they are about to type is what keeps patient data  */
/* out; the scrubbing in feedback.js is the backstop, not the plan. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

if (typeof document !== "undefined") {

  var _fbe = escHtml;
  var FB_UI = { category: "", severity: "minor", filter: {}, expanded: null };

  /* ── Reporter form (all roles) ──────────────────────────────── */

  window.feedbackOpen = function (contextLabel) {
    FB_UI.category = "";
    FB_UI.context = contextLabel || "";
    var host = document.getElementById("feedbackModal");
    if (!host) {
      host = document.createElement("div");
      host.id = "feedbackModal";
      host.className = "fb-modal";
      document.body.appendChild(host);
    }
    host.style.display = "flex";
    feedbackRenderForm();
  };

  window.feedbackClose = function () {
    var host = document.getElementById("feedbackModal");
    if (host) host.style.display = "none";
  };

  function feedbackRenderForm(errorMsg) {
    var host = document.getElementById("feedbackModal");
    if (!host) return;
    var cat = (typeof feedbackCategory === "function") ? feedbackCategory(FB_UI.category) : null;

    var cats = "";
    for (var i = 0; i < FEEDBACK_CATEGORIES.length; i++) {
      var c = FEEDBACK_CATEGORIES[i];
      cats += '<button class="fb-cat' + (FB_UI.category === c.id ? ' fb-cat-on' : '') +
        (c.id === "clinical" ? ' fb-cat-clin' : '') + '" onclick="feedbackPickCategory(\'' +
        _fbe(c.id) + '\')">' + _fbe(c.label) + '</button>';
    }

    var sevs = "";
    for (var s = 0; s < FEEDBACK_SEVERITIES.length; s++) {
      var sv = FEEDBACK_SEVERITIES[s];
      sevs += '<button class="fb-sev' + (FB_UI.severity === sv ? ' fb-sev-on' : '') +
        '" onclick="feedbackPickSeverity(\'' + _fbe(sv) + '\')">' +
        _fbe(sv === "blocking" ? "Blocking my work" : sv === "major" ? "Major" : "Minor") + '</button>';
    }

    host.innerHTML =
      '<div class="fb-card">' +
        '<div class="fb-head"><b>Report a problem or suggestion</b>' +
          '<button class="fb-x" onclick="feedbackClose()">✕</button></div>' +
        '<div class="fb-sub">Goes to your administrator. Works offline — it is kept on this ' +
          'device and sent when there is a connection.</div>' +

        '<div class="fb-label">What kind of report is this?</div>' +
        '<div class="fb-cats">' + cats + '</div>' +

        (cat && cat.hint
          ? '<div class="fb-hint">' + _fbe(cat.hint) + '</div>' : '') +

        '<div class="fb-label">How much is it affecting you?</div>' +
        '<div class="fb-sevs">' + sevs + '</div>' +

        '<div class="fb-label">One-line summary</div>' +
        '<input id="fbSubject" class="fb-input" maxlength="120" placeholder="Short summary">' +

        '<div class="fb-label">What happened?</div>' +
        '<textarea id="fbBody" class="fb-text" rows="5" placeholder="' +
          _fbe(cat && cat.id === "clinical"
            ? "Describe the finding pattern and what you expected — not the patient."
            : "What were you doing, and what happened?") + '"></textarea>' +

        '<div class="fb-note">Your Entopic version and browser are attached automatically. ' +
          '<b>Patient details are never sent</b> — anything that looks like a name, MRN, date of ' +
          'birth or phone number is removed before the report is stored.</div>' +

        (errorMsg ? '<div class="fb-err">' + _fbe(errorMsg) + '</div>' : '') +

        '<div class="fb-actions">' +
          '<button class="btn btn-s" onclick="feedbackClose()">Cancel</button>' +
          '<button class="btn btn-p" onclick="feedbackSend()">Send report</button>' +
        '</div>' +
      '</div>';
  }

  window.feedbackPickCategory = function (id) { FB_UI.category = id; feedbackRenderForm(); };
  window.feedbackPickSeverity = function (s) { FB_UI.severity = s; feedbackRenderForm(); };

  window.feedbackSend = function () {
    var subject = (document.getElementById("fbSubject") || {}).value || "";
    var body = (document.getElementById("fbBody") || {}).value || "";
    var res = feedbackSubmit({
      category: FB_UI.category, severity: FB_UI.severity,
      subject: subject, body: body, context: FB_UI.context
    }, (typeof CU !== "undefined" ? CU : null));

    if (!res.ok) { feedbackRenderForm(res.error); return; }
    feedbackClose();
    if (typeof toast === "function") {
      toast(res.report.category === "clinical"
        ? "Clinical concern sent — it goes to the top of the administrator's queue."
        : "Report sent. Thank you.");
    }
    if (typeof renderMain === "function") renderMain();
  };

  /* The entry point every role's home page shows. */
  window.feedbackButtonHtml = function (contextLabel) {
    return '<button class="btn btn-s fb-open" onclick="feedbackOpen(' +
      escAttrJs(contextLabel || "") + ')">Report a problem</button>';
  };


  /* ── Admin queue ────────────────────────────────────────────── */

  window.feedbackAdminCard = function () {
    if (typeof isAdmin !== "function" || !isAdmin()) return "";
    if (typeof feedbackCounts !== "function") return "";
    var c = feedbackCounts();

    var chips = "";
    function chip(label, key, val, n, cls) {
      var on = FB_UI.filter[key] === val;
      return '<button class="fb-chip' + (on ? ' fb-chip-on' : '') + (cls ? ' ' + cls : '') +
        '" onclick="feedbackFilter(\'' + key + '\',' + escAttrJs(val) + ')">' +
        _fbe(label) + ' <b>' + n + '</b></button>';
    }
    chips += chip("Open", "open_only", true, c.open, c.open ? "fb-chip-live" : "");
    chips += chip("Clinical", "category", "clinical", c.by_category.clinical || 0,
                  c.clinical_open ? "fb-chip-clin" : "");
    chips += chip("Blocking", "severity", "blocking", c.blocking_open, "");
    chips += chip("All", "none", "", c.total, "");

    var rows = "";
    var q = feedbackQueue(FB_UI.filter);
    if (!q.length) {
      rows = '<div class="fb-empty">No reports match. Nothing outstanding.</div>';
    }
    for (var i = 0; i < q.length && i < 60; i++) {
      var r = q[i];
      var catDef = feedbackCategory(r.category) || { label: r.category };
      var open = r.status !== "resolved" && r.status !== "declined";
      var expanded = FB_UI.expanded === r.id;

      rows += '<div class="fb-row' + (r.category === "clinical" && open ? ' fb-row-clin' : '') + '">' +
        '<div class="fb-row-head" onclick="feedbackToggle(' + escAttrJs(r.id) + ')">' +
          '<span class="fb-badge fb-badge-' + _fbe(r.severity) + '">' + _fbe(r.severity) + '</span>' +
          '<span class="fb-row-cat">' + _fbe(catDef.label) + '</span>' +
          '<span class="fb-row-sub">' + _fbe(r.subject || "(no summary)") + '</span>' +
          '<span class="fb-row-meta">' + _fbe(r.by_role || "—") + ' · ' +
            _fbe(String(r.at).slice(0, 10)) + '</span>' +
          '<span class="fb-status fb-status-' + _fbe(r.status) + '">' + _fbe(r.status) + '</span>' +
        '</div>';

      if (expanded) {
        rows += '<div class="fb-row-body">' +
          '<div class="fb-quote">' + _fbe(r.body) + '</div>' +
          '<div class="fb-meta">Reported by ' + _fbe(r.by || "unknown") +
            ' (' + _fbe(r.by_role || "—") + ')' +
            (r.build ? ' · Entopic ' + _fbe(r.build.app_version) + ' · KB ' +
              _fbe(r.build.kb_version) + ' · ' + _fbe(r.build.commit) : '') +
            (r.context ? ' · at ' + _fbe(r.context) : '') + '</div>';

        if (r.notes && r.notes.length) {
          rows += '<div class="fb-notes">';
          for (var n = 0; n < r.notes.length; n++) {
            var nt = r.notes[n];
            rows += '<div class="fb-note-row"><b>' + _fbe(nt.status) + '</b> · ' +
              _fbe(nt.by) + ' · ' + _fbe(String(nt.at).slice(0, 10)) +
              (nt.note ? ' — ' + _fbe(nt.note) : '') + '</div>';
          }
          rows += '</div>';
        }

        rows += '<div class="fb-triage">' +
          '<input id="fbNote_' + _fbe(r.id) + '" class="fb-input" placeholder="Note (optional)">' +
          '<div class="fb-triage-btns">';
        var states = ["acknowledged", "in_progress", "resolved", "declined"];
        for (var s2 = 0; s2 < states.length; s2++) {
          rows += '<button class="btn btn-s" onclick="feedbackTriage(' + escAttrJs(r.id) +
            ',\'' + states[s2] + '\')">' + _fbe(states[s2].replace("_", " ")) + '</button>';
        }
        rows += '</div></div></div>';
      }
      rows += '</div>';
    }

    var banner = c.clinical_open
      ? '<div class="fb-alert">⚠ <b>' + c.clinical_open + ' open clinical concern' +
        (c.clinical_open === 1 ? '' : 's') + '</b> — these are reports that the engine or the ' +
        'clinical content may be wrong. Read these first.</div>'
      : '';

    return '<div class="home-settings-card">' +
      '<div class="home-settings-title">Feedback &amp; reports' +
        (c.open ? ' <span class="fb-count">' + c.open + ' open</span>' : '') + '</div>' +
      banner +
      '<div class="fb-chips">' + chips + '</div>' +
      '<div class="fb-list">' + rows + '</div>' +
    '</div>';
  };

  window.feedbackFilter = function (key, val) {
    if (key === "none") FB_UI.filter = {};
    else if (FB_UI.filter[key] === val) delete FB_UI.filter[key];
    else FB_UI.filter[key] = val;
    if (typeof renderMain === "function") renderMain();
  };

  window.feedbackToggle = function (id) {
    FB_UI.expanded = (FB_UI.expanded === id) ? null : id;
    if (typeof renderMain === "function") renderMain();
  };

  window.feedbackTriage = function (id, status) {
    var el = document.getElementById("fbNote_" + id);
    var note = el ? el.value : "";
    var who = (typeof CU !== "undefined" && CU) ? (CU.name || CU.username) : "admin";
    if (!feedbackSetStatus(id, status, who, note)) {
      if (typeof toast === "function") toast("Could not update — this device may be out of storage.");
      return;
    }
    if (typeof toast === "function") toast("Marked " + status.replace("_", " ") + ".");
    if (typeof renderMain === "function") renderMain();
  };
}
