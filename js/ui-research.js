/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CONSENT & INSIGHTS UI                                 */
/*                                                                  */
/* Two surfaces:                                                    */
/*                                                                  */
/*  1. A consent block on the patient record. Deliberately shows    */
/*     the patient the EXACT WORDING they are agreeing to, plus     */
/*     what is and is not included — read off the same data the     */
/*     code enforces, so the promise and the behaviour cannot       */
/*     drift apart. Three buttons: Yes / No / Withdraw.             */
/*                                                                  */
/*  2. An insights panel for whoever has analytics permission       */
/*     (clinician, faculty, researcher, admin), computed offline    */
/*     from the corpus, with denominators and suppression visible   */
/*     rather than hidden.                                          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

if (typeof document !== "undefined") {

  var _re = escHtml;

  /* ── Consent on the patient record ──────────────────────────── */

  window.consentCardHtml = function (patientId) {
    if (typeof CONSENT_PURPOSES === "undefined" || !patientId) return "";
    var pt = null;
    if (typeof loadPatients === "function") {
      var list = loadPatients();
      for (var i = 0; i < list.length; i++) if (list[i].id === patientId) { pt = list[i]; break; }
    }
    if (pt && pt.practice) return "";      /* training records are not people */

    var h = '<div class="home-settings-card cons-card">' +
      '<div class="home-settings-title">Data-use consent</div>' +
      '<div class="cons-intro">Optional, and separate from care. Declining changes nothing about ' +
        'this patient\'s treatment — their record is used to care for them either way. ' +
        'Ask once, record the answer, and it stands until they change it.</div>';

    for (var p = 0; p < CONSENT_PURPOSES.length; p++) {
      var purpose = CONSENT_PURPOSES[p];
      var rec = consentGet(patientId, purpose.id);
      var live = consentAllows(patientId, purpose.id);
      var isStale = rec.state === "granted" && !live;

      h += '<div class="cons-block">' +
        '<div class="cons-label">' + _re(purpose.label) + '</div>' +
        '<div class="cons-text">“' + _re(purpose.text) + '”</div>' +
        '<div class="cons-fields">' +
          '<span class="cons-in"><b>Included:</b> ' + _re(purpose.includes.join(", ")) + '</span>' +
          '<span class="cons-ex"><b>Never included:</b> ' + _re(purpose.excludes.join(", ")) + '</span>' +
        '</div>';

      var stateLabel = {
        granted: "Agreed", refused: "Declined",
        withdrawn: "Withdrawn", not_asked: "Not asked yet"
      }[rec.state] || "Not asked yet";

      h += '<div class="cons-state cons-state-' + _re(rec.state) + '">' + _re(stateLabel) +
        (rec.at ? ' · ' + _re(String(rec.at).slice(0, 10)) : '') +
        (rec.by ? ' · ' + _re(rec.by) : '') +
        (isStale ? ' <b class="cons-stale">— the wording has changed since; please ask again</b>' : '') +
        '</div>';

      h += '<div class="cons-btns">' +
        '<button class="btn ' + (live ? 'btn-p' : 'btn-s') + '" onclick="consentRecord(' +
          escAttrJs(patientId) + ',' + escAttrJs(purpose.id) + ',\'granted\')">Yes, agreed</button>' +
        '<button class="btn ' + (rec.state === "refused" ? 'btn-p' : 'btn-s') + '" onclick="consentRecord(' +
          escAttrJs(patientId) + ',' + escAttrJs(purpose.id) + ',\'refused\')">No</button>' +
        (rec.state === "granted"
          ? '<button class="btn btn-s" onclick="consentRecord(' + escAttrJs(patientId) + ',' +
            escAttrJs(purpose.id) + ',\'withdrawn\')">Withdraw</button>'
          : '') +
        '</div></div>';
    }

    h += '<div class="cons-foot">Withdrawing removes this patient\'s contributions from the ' +
      'research data on this device. Encounters already folded into monthly totals cannot be ' +
      'individually removed from those totals.</div></div>';
    return h;
  };

  window.consentRecord = function (patientId, purposeId, state) {
    if (state === "withdrawn" &&
        !window.confirm("Withdraw consent and delete this patient's contributions to the " +
                        "research data on this device?\n\nThis cannot be undone.")) return;
    var by = (typeof CU !== "undefined" && CU) ? (CU.name || CU.username) : "";
    var rec = consentSet(patientId, purposeId, state, by);
    if (!rec) {
      if (typeof toast === "function") toast("Could not record that — this device may be out of storage.");
      return;
    }
    if (typeof toast === "function") {
      toast(state === "granted" ? "Consent recorded."
        : state === "refused" ? "Declined — recorded."
        : "Withdrawn, and contributions removed.");
    }
    if (typeof renderMain === "function") renderMain();
  };


  /* ── Insights ───────────────────────────────────────────────── */

  function cellHtml(c) {
    if (!c) return "";
    if (c.suppressed) {
      return '<div class="ins-row"><span class="ins-label">' + _re(c.label) + '</span>' +
        '<span class="ins-supp" title="Fewer than the reporting threshold — withheld so an ' +
        'individual cannot be identified">withheld (small number)</span></div>';
    }
    return '<div class="ins-row"><span class="ins-label">' + _re(c.label) + '</span>' +
      '<span class="ins-val"><b>' + c.pct + '%</b> <span class="ins-n">(' + c.n +
      ' of ' + c.denom + ')</span></span></div>';
  }

  window.insightsCardHtml = function () {
    if (typeof insightsReport !== "function" || typeof corpusStats !== "function") return "";
    var stats = corpusStats();

    if (!stats.total) {
      return '<div class="home-settings-card">' +
        '<div class="home-settings-title">Insights</div>' +
        '<div class="home-settings-desc">No consented research data yet. Encounters appear here ' +
          'once patients have agreed to research use on their record — nothing is collected ' +
          'without that.</div></div>';
    }

    var rep = insightsReport();
    var h = '<div class="home-settings-card">' +
      '<div class="home-settings-title">Insights</div>' +
      '<div class="ins-meta"><b>' + stats.total + '</b> consented encounters · ' +
        stats.detail + ' in full detail, ' + stats.rolled_up + ' in monthly totals' +
        (stats.months.length ? ' · ' + _re(stats.months[0]) + ' to ' +
          _re(stats.months[stats.months.length - 1]) : '') + '</div>';

    if (rep.prevalence.kb_versions.mixed) {
      h += '<div class="ins-warn">' + _re(rep.prevalence.kb_versions.note) + '</div>';
    }

    h += '<div class="ins-sec">Most common leading result</div>';
    var lead = rep.prevalence.leading.slice(0, 8);
    for (var i = 0; i < lead.length; i++) h += cellHtml(lead[i]);

    h += '<div class="ins-sec">Care patterns</div>';
    h += cellHtml(rep.care.red_flag_encounters);
    h += cellHtml(rep.care.referred);
    h += cellHtml(rep.care.urgent_not_referred);
    h += '<div class="ins-note">' + _re(rep.care.interpretation_note) + '</div>';

    if (rep.trend && rep.trend.points.length) {
      h += '<div class="ins-sec">' + _re(rep.trend.condition) + ' over time</div>';
      if (!rep.trend.reportable) {
        h += '<div class="ins-note">' + _re(rep.trend.reportable_note) + '</div>';
      }
      for (var t = 0; t < rep.trend.points.length; t++) {
        var pt = rep.trend.points[t];
        h += '<div class="ins-row"><span class="ins-label">' + _re(pt.month) + '</span>' +
          '<span class="ins-val">' +
            (pt.pct === null ? '<span class="ins-supp">withheld</span>'
                             : '<b>' + pt.pct + '%</b> <span class="ins-n">(' + pt.hits +
                               ' of ' + pt.n + ')</span>') +
          '</span></div>';
      }
    }

    h += '<div class="ins-caveat">' + _re(rep.caveat) + '</div>';
    h += '<div class="ins-actions">' +
      '<button class="btn btn-s" onclick="insightsExport()">Export research data</button>' +
      '</div>';
    return h + '</div>';
  };

  window.insightsExport = function () {
    if (typeof corpusExport !== "function") return;
    /* can() is the real permission gate (js/roles.js): role capability AND
       tier. Admin overrides, as everywhere else. */
    if (typeof can === "function" && !can("research_export") &&
        (typeof isAdmin !== "function" || !isAdmin())) {
      if (typeof toast === "function") toast("Your role does not include research export.");
      return;
    }
    var payload = corpusExport();
    if (!payload.detail.length && !payload.rollup.length) {
      window.alert("There is no consented research data to export yet.");
      return;
    }
    dlSaveAs("entopic-research-" + new Date().toISOString().slice(0, 10) + ".json",
             JSON.stringify(payload, null, 2), "application/json");
    if (typeof logAudit === "function") {
      try { logAudit("research_exported",
        "Exported " + payload.detail.length + " de-identified research records", {}); } catch (e) {}
    }
    if (typeof toast === "function") toast(payload.detail.length + " records exported.");
  };
}
