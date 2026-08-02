/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SECTION STATUS UI                                     */
/*                                                                  */
/* The screen half of js/section-status.js: the "⊘ Not assessed"    */
/* header button, the reason picker, the banner shown on a section  */
/* that has been declined, and the completeness summary that goes   */
/* on the report.                                                   */
/*                                                                  */
/* Load order: after section-status.js and dom-escape.js.           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Show the button only where "not assessed" is a meaningful statement.
   Called from nav(), alongside updateWNLButton(). */
function updateNotDoneButton() {
  var btn = document.getElementById("hdrNotDone");
  if (!btn) return;
  var applies = (typeof V !== "undefined" && V && typeof sectionStatusApplies === "function" &&
                 sectionStatusApplies(V.step));
  btn.style.display = applies ? "" : "none";
  if (!applies) return;

  /* If it is already marked not-done, the button becomes the way to undo it. */
  var cur = sectionStatus(V, V.step);
  if (cur === "not_done") {
    btn.textContent = "⊘ Not assessed — undo";
    btn.classList.add("is-on");
  } else {
    btn.textContent = "⊘ Not assessed";
    btn.classList.remove("is-on");
  }
}

/* Ask why, then record it. A reason is what turns "not done" into a clinical
   decision rather than an omission, so it is asked for rather than optional —
   but "Other" accepts free text and an empty answer still records the state,
   because refusing to save the statement would be worse than saving it bare. */
function sectionUiAskNotDone() {
  if (typeof V === "undefined" || !V || typeof sectionStatusSet !== "function") return;
  var step = V.step;

  if (sectionStatus(V, step) === "not_done") {
    sectionStatusSet(step, "");
    sectionUiAfterChange();
    return;
  }

  if (typeof stepHasData === "function" && stepHasData(step, V)) {
    alert("This section already has findings recorded, so it cannot be marked " +
          "as not assessed.\n\nClear the findings first if that is what you meant.");
    return;
  }

  var list = NOT_DONE_REASONS.map(function (r, i) { return (i + 1) + ". " + r; }).join("\n");
  var ans = window.prompt(
    "Record " + sectionLabel(step) + " as NOT ASSESSED.\n\n" +
    "This is stored as a deliberate clinical decision and appears on the report.\n\n" +
    "Why?\n" + list + "\n\nEnter a number, or type your own reason:", "");
  if (ans === null) return;               /* cancelled — change nothing */

  var reason = String(ans).trim();
  var n = parseInt(reason, 10);
  if (n >= 1 && n <= NOT_DONE_REASONS.length && String(n) === reason) {
    reason = NOT_DONE_REASONS[n - 1];
  }

  sectionStatusSet(step, "not_done", reason);
  sectionUiAfterChange();
}

function sectionUiAfterChange() {
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  if (typeof renderSidebar === "function") renderSidebar();
  if (typeof renderMain === "function") renderMain();
  if (typeof renderAdvisory === "function") renderAdvisory();
  updateNotDoneButton();
}

/* Banner prepended to a section that has been declined, so the state is
   visible where the clinician is working rather than only on the report. */
function sectionNotDoneBanner(step) {
  if (typeof V === "undefined" || !V || typeof sectionStatus !== "function") return "";
  if (sectionStatus(V, step) !== "not_done") return "";
  var reason = sectionStatusReason(V, step);
  return '<div class="sec-notdone" role="note">' +
    '<b>⊘ Not assessed</b> — recorded as a deliberate decision' +
    (reason ? ': ' + escHtml(reason) : '') + '. ' +
    'This appears on the report. Entering any finding below clears it.' +
    '</div>';
}

/* The completeness block for the report. Three lists, because a reader needs
   all three: what was examined, what was deliberately declined, and what
   nobody said anything about. The third is the one that is normally invisible
   and is the reason this exists. */
function sectionStatusReportBlock(visit) {
  var v = visit || (typeof V !== "undefined" ? V : null);
  if (!v || typeof sectionStatusSummary !== "function") return "";
  var s = sectionStatusSummary(v);
  var notDone = sectionStatusNotDone(v);
  var untouched = sectionStatusUntouched(v);

  var h = '<div class="rpt-sec"><div class="rpt-sec-t">Examination completeness</div>';
  h += '<div class="rpt-line">' + (s.assessed + s.normal) + ' of ' +
       STATUS_SECTIONS.length + ' sections assessed' +
       (s.not_done ? ', ' + s.not_done + ' deliberately not assessed' : '') +
       (s.untouched ? ', ' + s.untouched + ' not recorded' : '') + '.</div>';

  if (notDone.length) {
    h += '<div class="rpt-line"><b>Deliberately not assessed:</b><ul>';
    notDone.forEach(function (x) {
      h += '<li>' + escHtml(x.label) + (x.reason ? ' — ' + escHtml(x.reason) : '') + '</li>';
    });
    h += '</ul></div>';
  }

  if (untouched.length) {
    /* Deliberately plain. This is not an accusation; it is what the record
       actually says, and a reader is entitled to know it. */
    h += '<div class="rpt-line"><b>No record either way:</b> ' +
         untouched.map(function (x) { return escHtml(x.label); }).join(", ") + '.</div>';
  }

  h += '</div>';
  return h;
}
