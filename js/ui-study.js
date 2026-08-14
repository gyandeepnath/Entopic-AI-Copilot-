/* ═══════════════════════════════════════════════════════════════ */
/* THE STUDENT'S STUDY TAB                                          */
/*                                                                  */
/* Split out of app.js so that file keeps one job. The Study tab    */
/* had grown to nine cards of equal visual weight — a wall a        */
/* student stops reading. This groups them into three named         */
/* sections (Practise / My progress / Learn & reference) and shows  */
/* one clear "start here" to a brand-new student that disappears    */
/* the moment they have any history.                                */
/*                                                                  */
/* Renders whatever the other modules provide (simLauncherCard,     */
/* competencyStudyCard, analyticsRoleCard, homeCardKB, …); it owns  */
/* the LAYOUT of the Study tab, not the cards themselves. All its   */
/* dependencies are globals resolved at call time, so load order    */
/* only requires this to sit before app.js (which calls it).        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function homeSecStudy() {
  /* My practice exams — resumable, uncapped, manageable (learning is free). */
  var practice = practicePatients().reverse();
  var pvisits = loadVisits();
  function pStatus(pid) {
    var v = pvisits.filter(function (x) { return x.patient_id === pid; })
      .sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); })[0];
    return v && v.status === "completed" ? "completed" : "in progress";
  }
  var practiceHtml = "";
  if (practice.length) {
    practiceHtml = '<div class="p-list" style="margin-top:8px">' +
      '<div class="p-list-h"><span>My practice exams</span>' +
      '<span style="font-size:.58rem;color:var(--sv)">' + practice.length + ' · uncounted · <a href="#" onclick="clearPracticeExams();return false" style="color:var(--md)">clear all</a></span></div>';
    for (var i = 0; i < Math.min(practice.length, 12); i++) {
      var pt = practice[i];
      practiceHtml += '<div class="p-row" onclick="openPatient(\'' + pt.id + '\')">' +
        '<div><b>' + escH((pt.first_name || "Practice") + " " + (pt.last_name || "case")) + '</b> ' +
          '<span class="practice-chip">' + pStatus(pt.id) + '</span></div>' +
        '<span style="font-family:var(--mono);color:var(--sv);font-size:.6rem">' + escH(pt.mrn || "") + '</span>' +
      '</div>';
    }
    practiceHtml += '</div>';
  }

  var quizLine = (typeof quizStatsSummary === "function") ? quizStatsSummary()
    : "Guess-the-diagnosis practice drawn from the knowledge base and your casebook.";

  var caseCount = (typeof casebookLoad === "function") ? casebookLoad().length : 0;

  /* ── Where to start ──
     The Study tab is nine cards. Grouped (below) it is scannable, but a student
     opening it for the first time still needs one clear first move rather than
     a menu. This detects "brand new" — nothing practised, no sim attempts — and
     shows a single prominent starting point. It disappears the moment they have
     any history, so it never nags a returning student. */
  var simPr = (typeof simProgressSummary === "function") ? simProgressSummary() : null;
  var brandNew = practice.length === 0 && (!simPr || simPr.attempts === 0);
  var startHere = brandNew
    ? '<div class="study-hero" style="border-color:var(--ink);background:var(--sn)">' +
        '<div style="font-weight:700;font-size:.8rem;margin-bottom:2px">New here? Start with a guided simulation.</div>' +
        'You work a virtual patient through a real exam, the findings stay hidden until you examine — ' +
        'so you practise <i>deciding what to do next</i>, not just naming an answer. Nothing you do here ' +
        'is a real patient record, and nothing counts against you.' +
        '<div style="margin-top:8px"><button class="btn btn-p" style="font-size:.64rem" ' +
          'onclick="simSetTier(\'guided\');simLaunch(\'common\')">▶ Start my first guided case</button></div>' +
      '</div>'
    : '';

  return '<div class="home-hd"><h1>Study</h1></div>' +
    '<div class="study-hero">Learn by reasoning. The full diagnostic engine, glass-box "why", knowledge base and casebook are open and free — no restrictions on learning.</div>' +
    startHere +

    /* ── GROUP 1: PRACTISE ── the "do" cards, together and first. */
    studySectionHead("Practise", "Work through cases and get instant feedback") +
    /* Simulation: work a virtual patient with findings hidden until examined.
       (This card also carries the OSCE circuit and any set assignments.) */
    ((typeof simLauncherCard === "function") ? simLauncherCard() : "") +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🧠 Quiz — guess the diagnosis</div>' +
      '<div class="home-settings-desc">' + escH(quizLine) + ' A continuous session — answer with 1–4, Enter for the next.</div>' +
      '<button class="btn btn-p" onclick="startQuiz()" style="font-size:.62rem">Start quiz session</button>' +
    '</div>' +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">🩺 Full practice exam</div>' +
      '<div class="home-settings-desc">Run a whole mock exam through the live engine and watch the reasoning build, step by step. Practice records are clearly labelled and never count against a save limit.</div>' +
      '<button class="btn btn-s" onclick="newPatient()" style="font-size:.62rem">Start a practice exam</button>' +
    '</div>' +
    practiceHtml +

    /* ── GROUP 2: MY PROGRESS ── everything that tracks the student over time. */
    studySectionHead("My progress", "What you have done, and what to work on next") +
    /* Competency logbook: progress, longitudinal feedback, logbook export. */
    ((typeof competencyStudyCard === "function") ? competencyStudyCard() : "") +
    (typeof analyticsRoleCard === "function" ? analyticsRoleCard() : "") +

    /* ── GROUP 3: LEARN & REFERENCE ── read-and-study material, not drills. */
    studySectionHead("Learn & reference", "Worked cases and the full condition library") +
    '<div class="home-settings" style="margin-top:8px">' +
      '<div class="home-settings-title">📚 Study casebook</div>' +
      '<div class="home-settings-desc">' + (caseCount ? caseCount + ' worked cases to study — grouped by condition, filterable by sign.' : 'Load a ready-made library of example cases (one per common condition) to study, or save your own.') + '</div>' +
      '<button class="btn btn-p" onclick="seedExampleCases()" style="font-size:.62rem">Load example cases</button> ' +
      '<button class="btn btn-s" onclick="showCasebook()" style="font-size:.62rem">Open casebook</button>' +
    '</div>' +
    homeCardKB();
}

/* A lightweight section divider for the Study tab. The tab grew to nine cards
   of equal visual weight — scannable only if they fall into a few named groups.
   Deliberately plain: a heading and a one-line "what this group is for", so a
   student can find the right shelf without reading every card. */
function studySectionHead(title, sub) {
  return '<div style="margin:20px 0 2px;padding-bottom:3px;border-bottom:2px solid var(--ink)">' +
    '<span style="font-size:.82rem;font-weight:700">' + escH(title) + '</span>' +
    (sub ? '<span style="font-size:.6rem;color:var(--sv);margin-left:8px">' + escH(sub) + '</span>' : '') +
  '</div>';
}

/* Delete all practice records + their visits (student housekeeping). */
function clearPracticeExams() {
  var practice = practicePatients();
  if (!practice.length) return;
  if (!confirm("Delete all " + practice.length + " practice exams? (Your real records and casebook are untouched.)")) return;
  var ids = {}; for (var i = 0; i < practice.length; i++) ids[practice[i].id] = true;
  savePatients(loadPatients().filter(function (p) { return !p.practice; }));
  saveVisits(loadVisits().filter(function (v) { return !ids[v.patient_id]; }));
  renderHome();
}
