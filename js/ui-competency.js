/* ═══════════════════════════════════════════════════════════════ */
/* COMPETENCY — THE INTERFACE                                       */
/*                                                                  */
/* WHAT PHASE 10 FOUND                                              */
/*                                                                  */
/* js/competency.js was 310 lines of well-designed, fully-tested     */
/* logic: a framework, evidence claims, supervisor sign-off,        */
/* progress against a target level, and a logbook export that       */
/* deliberately carries no patient identifiers.                     */
/*                                                                  */
/* NOT ONE of its functions was called from anywhere outside its    */
/* own file. Sixteen passing tests, zero user interface. A student  */
/* could not record evidence; a supervisor could not sign anything  */
/* off. The faculty screen offered a "Coming with shared accounts"  */
/* badge instead.                                                   */
/*                                                                  */
/* WHY THE "SHARED ACCOUNTS" DEPENDENCY WAS WRONG                   */
/*                                                                  */
/* Remote review needs a backend. Supervised clinical education     */
/* does not: it happens AT THE CHAIR, with the supervisor standing  */
/* next to the student, on the same machine. That is how optometry  */
/* teaching clinics actually run. Sign-off in that setting needs no */
/* network at all — and it is the moment the judgement is freshest. */
/*                                                                  */
/* So this ships the on-device path now. Cross-account review still */
/* needs the backend, and the UI says so rather than implying it is */
/* already possible.                                                */
/*                                                                  */
/* ── WHAT THIS FILE DELIBERATELY DOES NOT DECIDE ──                */
/*                                                                  */
/* No competency content. No pass mark. No progression rule. No     */
/* minimum case numbers. Those are institutional, they differ by    */
/* university, and inventing them would be exactly the fabrication  */
/* this project forbids. The framework ships EMPTY and is imported  */
/* by the department; this file renders whatever it finds and says  */
/* plainly when it finds nothing.                                   */
/*                                                                  */
/* Load order: after js/competency.js, js/roles.js and              */
/* js/browser-io.js (dlSaveAs), all of which precede it in          */
/* index.html. escHtml/escAttrJs come from js/dom-escape.js, which  */
/* loads earlier still — this file must NOT alias them at load      */
/* time (see the header of dom-escape.js for the bug that caused).  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function _cmpMe() {
  return (typeof CU !== "undefined" && CU) ? (CU.username || CU.name || "") : "";
}

function _cmpHasFramework() {
  return typeof competencyFramework === "function" && competencyFramework().items.length > 0;
}

/* Is this account allowed to sign off another person's evidence?

   CLIENT-SIDE ONLY, and that is stated rather than implied. ADR-010 records
   that authorization is not server-enforced yet, so this hides a control from
   someone who should not use it — it does not stop a determined one. Until the
   backend enforces it, a signed competency is trustworthy because a supervisor
   was standing there, not because the software prevented anything. */
function competencyMaySupervise() {
  if (typeof can === "function") { try { return !!can("supervise"); } catch (e) {} }
  if (typeof effectiveRole === "function") {
    var r = effectiveRole();
    return r === "faculty" || r === "clinician";
  }
  return false;
}

/* Was this encounter a real patient? Two independent markers exist — a
   `practice` patient and a `sim` visit — and either one makes the encounter
   non-real. Defaults to SIMULATED when it cannot tell, because the failure
   modes are not symmetric: mislabelling real work as simulated is a visible
   annoyance, mislabelling simulated work as real puts a false claim of
   clinical experience in front of an examining body. */
function competencyVisitIsSimulated(visit, patient) {
  if (visit && visit.sim) return true;
  if (patient && patient.practice) return true;
  if (visit || patient) return false;
  return true;
}

/* ═══════════════════════════════════════════════════════════════ */
/* STUDENT — record evidence against a completed encounter          */
/* ═══════════════════════════════════════════════════════════════ */

/* Offered from a completed visit. A claim REFERENCES the visit; it never
   copies clinical content, so the logbook cannot become a second, unprotected
   store of patient data.

   Returns "" when no framework is loaded. The import prompt belongs on the
   Study and Teaching screens, not on top of a clinical record — a solo
   practitioner who will never use competencies should never see this. */
function competencyClaimCard(visitId, simulated) {
  if (!_cmpHasFramework()) return "";
  var f = competencyFramework();

  var opts = f.items.map(function (it) {
    return '<option value="' + escHtml(it.id) + '">' +
      escHtml((it.domain ? it.domain + " — " : "") + it.label) + '</option>';
  }).join("");

  var levels = (typeof COMPETENCY_LEVELS !== "undefined" ? COMPETENCY_LEVELS : []).map(function (l) {
    return '<option value="' + escHtml(l.id) + '"' + (l.id === "shows_how" ? " selected" : "") + '>' +
      escHtml(l.label) + ' — ' + escHtml(l.hint) + '</option>';
  }).join("");

  var sup = (typeof SUPERVISION_LEVELS !== "undefined" ? SUPERVISION_LEVELS : []).map(function (sv) {
    return '<option value="' + escHtml(sv.id) + '"' + (sv.id === "supervised" ? " selected" : "") + '>' +
      escHtml(sv.label) + '</option>';
  }).join("");

  /* Said before the student fills the form in, not after they submit it. */
  var simNote = simulated
    ? '<div class="home-settings-status" style="color:var(--md)"><b>This is a simulated case.</b> ' +
      'It will be recorded and labelled <b>SIMULATED</b> in your logbook' +
      (typeof competencySimulationCounts === "function" && !competencySimulationCounts()
        ? ' and will not count towards a competency being met — your department decides whether ' +
          'simulated work counts, and on this device it currently does not.'
        : '. Your department has chosen that simulated work counts here.') + '</div>'
    : "";

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🎯 Record competency evidence</div>' +
    '<div class="home-settings-desc">Link this encounter to a competency. Your supervisor reviews it ' +
      'and agrees a level — which may differ from the one you claim, and that difference is the ' +
      'useful part. <b>No patient details are copied</b>: the entry references this visit only.</div>' +
    simNote +
    '<div class="fi" style="margin-top:6px"><label for="cmpSel">Competency</label>' +
      '<select id="cmpSel">' + opts + '</select></div>' +
    '<div class="fi"><label for="cmpLevel">Level you are claiming</label>' +
      '<select id="cmpLevel">' + levels + '</select></div>' +
    '<div class="fi"><label for="cmpSup">How much supervision did this need?</label>' +
      '<select id="cmpSup">' + sup + '</select></div>' +
    '<div class="fi"><label for="cmpRefl">Reflection — what would you do differently?</label>' +
      '<textarea id="cmpRefl" style="min-height:60px" ' +
      'placeholder="The part you were unsure about is more useful here than the part that went well."></textarea></div>' +
    '<button class="btn btn-p" style="font-size:.62rem" onclick="competencyUiClaim(\'' +
      escAttrJs(String(visitId || "")) + '\',' + (simulated ? "true" : "false") + ')">Submit for sign-off</button>' +
    '<div id="cmpMsg" class="home-settings-status"></div>' +
  '</div>';
}

function competencyUiClaim(visitId, simulated) {
  var sel = document.getElementById("cmpSel");
  var msg = document.getElementById("cmpMsg");
  if (!sel) return;
  var entry = competencyClaim(sel.value, {
    visit_id: visitId || null,
    simulated: !!simulated,
    level: (document.getElementById("cmpLevel") || {}).value,
    supervision: (document.getElementById("cmpSup") || {}).value,
    reflection: (document.getElementById("cmpRefl") || {}).value
  });
  if (msg) {
    msg.textContent = entry
      ? "Submitted — waiting for a supervisor to sign it off. It counts towards nothing until they do."
      : "Could not record that. Check that a framework is loaded and this device can save.";
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/* STUDENT — where am I, and what was I asked to work on?           */
/* ═══════════════════════════════════════════════════════════════ */

function competencyProgressCard(student) {
  if (typeof competencyProgress !== "function" || !_cmpHasFramework()) return "";
  var who = student || _cmpMe();
  var sum = competencySummary(who);
  var prog = competencyProgress(who);

  /* Grouped by domain, because a flat list of forty competencies is a wall a
     student stops reading. */
  var byDomain = Object.create(null);
  prog.forEach(function (p) {
    var d = p.domain || "Other";
    (byDomain[d] = byDomain[d] || []).push(p);
  });

  var simTotal = 0;
  var rows = Object.keys(byDomain).sort().map(function (d) {
    var items = byDomain[d].map(function (p) {
      simTotal += p.evidence_simulated || 0;
      var mark = p.met ? "✓" : (p.evidence_pending ? "⏳" : (p.evidence_accepted ? "◐" : "·"));
      var state = p.met ? "met"
        : (p.evidence_pending ? p.evidence_pending + " awaiting sign-off"
          : (p.evidence_accepted ? "in progress" : "no evidence"));
      if (!p.met && !p.evidence_accepted && p.evidence_simulated && !p.simulated_counts) {
        state = p.evidence_simulated + " simulated (not counted)";
      }
      return '<div style="display:flex;gap:6px;font-size:.6rem;padding:2px 0">' +
        '<span style="width:12px;color:' + (p.met ? "var(--sl)" : "var(--sv)") + '">' + mark + '</span>' +
        '<span style="flex:1">' + escHtml(p.label) + '</span>' +
        '<span style="color:var(--sv);font-size:.55rem">' + escHtml(state) + '</span></div>';
    }).join("");
    return '<div style="margin-top:6px"><b style="font-size:.58rem;color:var(--sv)">' +
      escHtml(d) + '</b>' + items + '</div>';
  }).join("");

  var simLine = simTotal
    ? ' <span style="color:var(--md)">' +
      (simTotal === 1
        ? "1 signed-off entry is simulated"
        : simTotal + " signed-off entries are simulated") +
      (competencySimulationCounts()
        ? ", and your department has chosen that simulated work counts."
        : (simTotal === 1 ? ", so it does not count." : ", so they do not count.")) +
      '</span>'
    : "";

  /* Only the four buckets that PARTITION the framework go in the headline, and
     only the non-zero ones — "0 awaiting sign-off" is noise, and a line whose
     numbers do not add up to the total is worse than a shorter one. */
  var parts = [];
  if (sum.in_progress)    parts.push(sum.in_progress + " in progress");
  if (sum.awaiting_only)  parts.push(sum.awaiting_only + " awaiting sign-off");
  if (sum.simulated_only) parts.push(sum.simulated_only + " simulated only");
  if (sum.not_started)    parts.push(sum.not_started + " not started");

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🎯 My competencies</div>' +
    '<div class="home-settings-desc">' +
      '<b>' + sum.met + '</b> of <b>' + sum.total + '</b> met' +
      (parts.length ? ' · ' + parts.join(" · ") : '') + '. ' +
      '<span style="color:var(--sv)">Only evidence a supervisor has accepted counts.</span>' + simLine +
    '</div>' + rows +
    '<button class="btn btn-s" style="font-size:.6rem;margin-top:6px" ' +
      'onclick="competencyUiExportLogbook()">Export my logbook (JSON)</button>' +
  '</div>';
}

/* What was I actually asked to work on? The single most useful thing a student
   can read, and it was previously buried one comment at a time inside
   individual sign-offs. */
function competencyFeedbackCard(student) {
  if (typeof competencyFeedbackTrend !== "function") return "";
  var who = student || _cmpMe();
  var trend = competencyFeedbackTrend(who).filter(function (t) { return t.rated > 0; });
  var actions = competencyActions(who).slice(0, 6);
  if (!trend.length && !actions.length) return "";

  function ratingLabel(id) {
    var r = (typeof COMPETENCY_FEEDBACK_RATINGS !== "undefined" ? COMPETENCY_FEEDBACK_RATINGS : []);
    for (var i = 0; i < r.length; i++) if (r[i].id === id) return r[i].label;
    return id;
  }

  var tRows = trend.map(function (t) {
    /* Three separate facts, and running them together with "·" made them read
       as one contradictory sentence ("Needs attention · too few to say ·
       recurring"). The direction is only stated when there IS one; otherwise
       the row says how much evidence it rests on, which is the honest answer
       to "why does this not say improving or declining?". */
    var direction = (t.trend === "too few to say" || t.trend === "no evidence")
      ? "from " + t.rated + " sign-off" + (t.rated === 1 ? "" : "s")
      : t.trend + " over " + t.rated;
    var tag = t.recurring
      ? '<span style="color:var(--md);font-weight:600"> · flagged ' + t.concerns + '×</span>'
      : "";
    return '<div style="display:flex;gap:6px;font-size:.6rem;padding:2px 0">' +
      '<span style="flex:1">' + escHtml(t.label) + '</span>' +
      '<span style="color:var(--sv);font-size:.55rem">' + escHtml(ratingLabel(t.latest)) +
        ' · ' + escHtml(direction) + tag + '</span></div>';
  }).join("");

  var aRows = actions.map(function (a) {
    return '<div style="font-size:.6rem;padding:2px 0">• ' + escHtml(a.action) +
      ' <span style="color:var(--sv);font-size:.54rem">— ' + escHtml(a.by || "supervisor") +
      '</span></div>';
  }).join("");

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">💬 Feedback over time</div>' +
    '<div class="home-settings-desc">Across every signed-off encounter, not one at a time. ' +
      '"Recurring" means it was flagged on more than one occasion — a single off day is not a gap.</div>' +
    tRows +
    (aRows ? '<div style="margin-top:6px"><b style="font-size:.58rem;color:var(--sv)">Asked to work on</b>' +
             aRows + '</div>' : "") +
  '</div>';
}

function competencyUiExportLogbook() {
  if (typeof competencyLogbook !== "function" || typeof dlSaveAs !== "function") return;
  var book = competencyLogbook(_cmpMe());
  dlSaveAs("entopic-logbook-" + new Date().toISOString().slice(0, 10) + ".json",
           JSON.stringify(book, null, 2), "application/json");
  if (typeof toast === "function") {
    toast(book.entries.length + " signed-off entries exported (" +
          book.encounter_counts.real + " real, " + book.encounter_counts.simulated + " simulated).");
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/* SUPERVISOR — the review queue                                    */
/* ═══════════════════════════════════════════════════════════════ */

function competencyReviewCard() {
  if (typeof competencyPending !== "function") return "";
  if (!competencyMaySupervise() || !_cmpHasFramework()) return "";

  var pending = competencyPending();

  if (!pending.length) {
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🎓 Competency sign-off</div>' +
      '<div class="home-settings-desc">Nothing waiting. Evidence a student submits on this device ' +
      'appears here for you to review at the chair. Reviewing across accounts and sites needs the ' +
      'shared backend (not yet built); this is the on-device path.</div>' +
    '</div>';
  }

  var rows = pending.slice(0, 10).map(function (c) {
    var item = competencyById(c.competency_id);
    return '<div style="border-top:1px solid var(--ms);padding:6px 0">' +
      '<div style="font-size:.62rem"><b>' + escHtml(item ? item.label : c.competency_id) + '</b>' +
        ' <span style="color:var(--sv)">— ' + escHtml(c.student_name || c.student || "unnamed") + '</span>' +
        (c.simulated ? ' <span class="practice-chip">simulated</span>' : '') + '</div>' +
      '<div style="font-size:.56rem;color:var(--sv)">claims <b>' +
        escHtml(competencyLevelLabel(c.level_claimed)) + '</b> · ' +
        escHtml(competencySupervisionLabel(c.supervision)) + ' · ' +
        escHtml(String(c.claimed_at).slice(0, 10)) + '</div>' +
      (c.reflection ? '<div style="font-size:.58rem;margin-top:3px"><i>' +
        escHtml(c.reflection) + '</i></div>' : "") +
      '<button class="btn btn-s" style="font-size:.58rem;margin-top:4px" onclick="competencyUiOpen(\'' +
        escAttrJs(c.id) + '\')">Review &amp; sign off</button>' +
    '</div>';
  }).join("");

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🎓 Competency sign-off · ' + pending.length + ' waiting</div>' +
    '<div class="home-settings-desc">Evidence submitted on this device. Reviewing across accounts and ' +
      'sites needs the shared backend; this is the at-the-chair path, which is where the judgement ' +
      'is freshest anyway.</div>' + rows +
    '<div id="cmpReviewPanel"></div>' +
  '</div>';
}

/* The structured sign-off form. This is the part that stops feedback being
   "Good" — every dimension is a specific, separately-rated axis, and the
   improvement actions are what the student sees aggregated later. */
function competencyUiOpen(claimId) {
  var host = document.getElementById("cmpReviewPanel");
  if (!host) return;
  var claim = null;
  var log = competencyLog();
  for (var i = 0; i < log.length; i++) if (log[i].id === claimId) { claim = log[i]; break; }
  if (!claim) return;

  var dims = competencyFeedbackDimensions();
  var ratings = (typeof COMPETENCY_FEEDBACK_RATINGS !== "undefined") ? COMPETENCY_FEEDBACK_RATINGS : [];

  var dimRows = dims.map(function (d) {
    var opts = '<option value="">— not assessed —</option>' + ratings.map(function (r) {
      return '<option value="' + escHtml(r.id) + '">' + escHtml(r.label) + '</option>';
    }).join("");
    var fid = "cmpdim_" + escHtml(d.id);
    return '<div class="fi"><label for="' + fid + '">' + escHtml(d.label) +
      (d.hint ? ' <span style="color:var(--sv);font-weight:400">— ' + escHtml(d.hint) + '</span>' : "") +
      '</label><select id="' + fid + '" data-cmpdim="' + escHtml(d.id) + '">' + opts + '</select></div>';
  }).join("");

  var levels = (typeof COMPETENCY_LEVELS !== "undefined" ? COMPETENCY_LEVELS : []).map(function (l) {
    return '<option value="' + escHtml(l.id) + '"' +
      (l.id === claim.level_claimed ? " selected" : "") + '>' + escHtml(l.label) + '</option>';
  }).join("");

  host.innerHTML =
    '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:8px;margin-top:8px">' +
    '<div style="font-size:.62rem;margin-bottom:4px"><b>Signing off:</b> ' +
      escHtml(claim.student_name || claim.student || "unnamed") + ' — claims <b>' +
      escHtml(competencyLevelLabel(claim.level_claimed)) + '</b>, ' +
      escHtml(competencySupervisionLabel(claim.supervision).toLowerCase()) +
      (claim.simulated ? ' · <b style="color:var(--md)">SIMULATED CASE</b>' : '') + '</div>' +
    dimRows +
    '<div class="fi"><label for="cmpAgree">Level you agree</label>' +
      '<select id="cmpAgree">' + levels + '</select>' +
      '<div class="fi-hint">Agreeing a lower level is not a rejection — it is the assessment, ' +
      'and the student sees the difference.</div></div>' +
    '<div class="fi"><label for="cmpStrength">What was done well</label>' +
      '<input id="cmpStrength" placeholder="Specific, not &quot;good&quot;"></div>' +
    '<div class="fi"><label for="cmpAction">One thing to work on before next time</label>' +
      '<input id="cmpAction" placeholder="An action they can actually take"></div>' +
    '<div class="fi"><label for="cmpComment">Anything else</label>' +
      '<textarea id="cmpComment" style="min-height:44px"></textarea></div>' +
    '<button class="btn btn-p" style="font-size:.6rem" onclick="competencyUiSign(\'' +
      escAttrJs(claimId) + '\',\'accepted\')">Accept</button> ' +
    '<button class="btn btn-s" style="font-size:.6rem" onclick="competencyUiSign(\'' +
      escAttrJs(claimId) + '\',\'declined\')">Not yet</button>' +
    '<div id="cmpSignMsg" class="home-settings-status"></div></div>';
}

function competencyUiSign(claimId, decision) {
  var host = document.getElementById("cmpReviewPanel");
  var ratings = Object.create(null);
  if (host) {
    var sels = host.querySelectorAll("[data-cmpdim]");
    for (var i = 0; i < sels.length; i++) {
      if (sels[i].value) ratings[sels[i].getAttribute("data-cmpdim")] = sels[i].value;
    }
  }
  var action = (document.getElementById("cmpAction") || {}).value || "";
  var ok = competencySignOff(claimId, decision, {
    level: (document.getElementById("cmpAgree") || {}).value,
    comment: (document.getElementById("cmpComment") || {}).value,
    feedback: {
      ratings: ratings,
      strengths: (document.getElementById("cmpStrength") || {}).value || "",
      actions: action ? [action] : []
    }
  });
  var msg = document.getElementById("cmpSignMsg");
  if (msg) {
    msg.textContent = ok ? "Signed off."
      : "Could not sign that off — it may already have been reviewed, or this device cannot save.";
  }
  if (ok) {
    if (typeof toast === "function") toast("Competency " + decision + ".");
    if (typeof renderHome === "function") renderHome();
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/* SETUP — the department's own framework, never an invented one    */
/* ═══════════════════════════════════════════════════════════════ */

/* Shown on Study and Teaching. `who` is "faculty" or "student": the import
   controls are offered only to whoever can supervise, because a student
   silently importing their own framework would make the record meaningless. */
function competencySetupCard() {
  var has = _cmpHasFramework();
  var may = competencyMaySupervise();
  if (has && !may) return "";

  var f = has ? competencyFramework() : null;

  var body = has
    ? '<div class="home-settings-desc">Loaded: <b>' + escHtml(f.name || "unnamed framework") + '</b>' +
      (f.version ? ' v' + escHtml(f.version) : '') + ' — ' + f.items.length + ' competencies' +
      (f.imported_at ? ', imported ' + escHtml(String(f.imported_at).slice(0, 10)) : '') + '.</div>'
    : '<div class="home-settings-desc">No competency framework is loaded on this device. ' +
      '<b>Entopic deliberately ships none.</b> Competency requirements differ by university and ' +
      'regulator, and a fabricated framework would be worse than none — a programme would map its ' +
      'teaching to it and assess students against a standard nobody accredited. ' +
      (may ? 'Import your department\'s own.' : 'Ask your course lead to import your department\'s own.') +
      '</div>';

  if (!may) {
    return '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🎯 Competency logbook</div>' + body + '</div>';
  }

  /* The one institutional switch this file exposes — and it is a switch, not a
     default we invented. See competencySimulationCounts in competency.js. */
  var simOn = typeof competencySimulationCounts === "function" && competencySimulationCounts();
  var simRow =
    '<div class="home-settings-status" style="margin-top:6px">' +
      'Simulated and practice encounters: <b>' + (simOn ? "count" : "do not count") +
      '</b> towards a competency being met. They are always recorded and always labelled ' +
      'either way. <b>Entopic does not decide this</b> — your programme does. ' +
      '<a href="#" onclick="competencyUiToggleSim();return false" style="color:var(--md)">' +
      (simOn ? "stop counting them" : "count them") + '</a></div>';

  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🎯 Competency framework</div>' + body +
    '<button class="btn btn-' + (has ? 's' : 'p') + '" style="font-size:.6rem" ' +
      'onclick="competencyUiImport()">' + (has ? 'Replace framework' : 'Import a framework') + '</button> ' +
    '<button class="btn btn-s" style="font-size:.6rem" onclick="competencyUiTemplate()">' +
      'Download a blank template</button>' +
    (has ? simRow : '') +
    '<input type="file" id="cmpFrameworkFile" accept="application/json,.json" ' +
      'style="display:none" onchange="competencyUiFilePicked(this)">' +
  '</div>';
}

function competencyUiToggleSim() {
  if (typeof competencySimulationCountsSet !== "function") return;
  var now = competencySimulationCounts();
  if (!now && typeof confirm === "function") {
    if (!confirm("Count simulated and practice encounters towards competencies being met?\n\n" +
                 "Only do this if your programme has decided that simulated work is acceptable " +
                 "evidence. Entries stay labelled SIMULATED in the logbook either way.")) return;
  }
  competencySimulationCountsSet(!now);
  if (typeof renderHome === "function") renderHome();
}

/* A blank template — SHAPE only. `items` is empty on purpose: a template
   pre-filled with plausible-looking competencies is exactly how an invented
   standard gets adopted by accident. competencyFrameworkSet() rejects an empty
   items array, so this file cannot be imported until a human has filled it in,
   which is the intended behaviour and is stated in the file itself. */
function competencyUiTemplate() {
  if (typeof dlSaveAs !== "function") return;
  var tpl = {
    _readme: "Fill in `items` with YOUR programme's competencies, then import this file. " +
      "Entopic ships no competency content and will not invent any. This file cannot be " +
      "imported while `items` is empty.",
    _item_shape: {
      id: "a stable short id, e.g. ANT-03",
      label: "what the student must be able to do",
      domain: "grouping heading, e.g. Anterior segment",
      level: "one of: " + (typeof COMPETENCY_LEVELS !== "undefined"
        ? COMPETENCY_LEVELS.map(function (l) { return l.id; }).join(", ") : ""),
      description: "optional longer wording"
    },
    name: "",
    version: "",
    source: "the document this was transcribed from",
    items: []
  };
  dlSaveAs("entopic-competency-template.json", JSON.stringify(tpl, null, 2), "application/json");
}

function competencyUiImport() {
  var f = document.getElementById("cmpFrameworkFile");
  if (f) { f.value = ""; f.click(); }
}

function competencyUiFilePicked(input) {
  var file = input && input.files && input.files[0];
  if (!file || typeof FileReader === "undefined") return;
  var reader = new FileReader();
  reader.onload = function () {
    var parsed;
    try { parsed = JSON.parse(String(reader.result)); }
    catch (e) { window.alert("That file is not valid JSON."); return; }

    var existing = competencyFramework();
    if (existing.items.length && typeof confirm === "function") {
      if (!confirm("Replace the framework already on this device (" + existing.items.length +
                   " competencies)?\n\nEvidence students have already recorded is NOT deleted, but " +
                   "entries pointing at competencies the new framework does not contain will stop " +
                   "showing in progress.")) return;
    }

    var ok = competencyFrameworkSet(parsed);
    window.alert(ok
      ? "Framework imported — " + competencyFramework().items.length +
        " competencies. Students can now record evidence against it."
      : "Nothing was imported. The file needs a non-empty `items` array, each entry with an `id` " +
        "and a `label`.");
    if (ok && typeof renderHome === "function") renderHome();
  };
  reader.readAsText(file);
}

/* ═══════════════════════════════════════════════════════════════ */
/* SURFACE ENTRY POINTS — one call per screen, so app.js stays thin */
/* ═══════════════════════════════════════════════════════════════ */

function competencyStudyCard() {
  return competencySetupCard() + competencyProgressCard() + competencyFeedbackCard();
}

function competencyTeachingCard() {
  return competencySetupCard() + competencyReviewCard();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    competencyMaySupervise: competencyMaySupervise,
    competencyVisitIsSimulated: competencyVisitIsSimulated,
    competencyClaimCard: competencyClaimCard,
    competencyProgressCard: competencyProgressCard,
    competencyFeedbackCard: competencyFeedbackCard,
    competencyReviewCard: competencyReviewCard,
    competencySetupCard: competencySetupCard,
    competencyStudyCard: competencyStudyCard,
    competencyTeachingCard: competencyTeachingCard
  };
}
