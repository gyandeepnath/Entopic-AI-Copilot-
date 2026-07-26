/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SIMULATION UI                                          */
/* Case launcher (Study tab) · in-exam examine banner · debrief.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── Launcher, for the student's Study tab ───────────────────────── */

function simLauncherCard() {
  var pr = (typeof simProgressSummary === "function") ? simProgressSummary() : null;
  var h = '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🩺 Clinical simulation</div>' +
    '<div class="home-settings-desc">' +
      'Work a virtual patient through the real exam. Findings stay <b>hidden until you examine</b>, ' +
      'so you practise deciding <i>what to do next</i> — not just naming the answer.' +
    '</div>';

  /* Progress header — a reason to come back. */
  if (pr && pr.attempts > 0) {
    var pct = Math.round(100 * pr.into / Math.max(1, pr.need));
    h += '<div style="display:flex;gap:14px;flex-wrap:wrap;align-items:center;margin:8px 0;font-size:.62rem">' +
        '<div><b>Level ' + pr.level + '</b> · ' + pr.xp + ' XP</div>' +
        '<div>' + pr.mastered + ' mastered / ' + pr.seen + ' seen</div>' +
        '<div>' + pr.accuracy + '% correct</div>' +
        (pr.streak > 1 ? '<div>🔥 ' + pr.streak + '-day streak</div>' : '') +
      '</div>' +
      '<div style="width:100%;height:4px;background:var(--gr);border-radius:2px;overflow:hidden;margin-bottom:8px">' +
        '<div style="width:' + pct + '%;height:100%;background:var(--ink)"></div></div>';
  }

  /* Difficulty — the tier picker is the pedagogy, so it is explained. */
  h += '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:6px 0 3px">Difficulty</div>' +
    '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:4px">';
  SIM_TIERS.forEach(function (t) {
    if (t.id === "osce") return;   /* OSCE has its own launcher below */
    var on = (SIM.tier || "standard") === t.id;
    h += '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.58rem"' +
      ' title="' + esc(t.blurb) + '" onclick="simSetTier(\'' + t.id + '\')">' + t.icon + " " + t.label + '</button>';
  });
  h += '</div>' +
    '<div style="font-size:.54rem;color:var(--sv);margin-bottom:8px">' + esc(simTier(SIM.tier || "standard").blurb) + '</div>';

  h += '<div style="display:flex;gap:6px;flex-wrap:wrap">' +
      '<button class="btn btn-p" style="font-size:.62rem" onclick="simLaunch(\'common\')">Start a case</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="simLaunch(\'all\')">Any condition</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="simLaunch(\'urgent\')">Red-flag case</button>' +
    '</div>';

  /* Recommendations — what to try next, and why. Cached so the "Go" button
     launches the suggestion the student actually read, not a fresh re-roll. */
  if (typeof simRecommendations === "function") {
    var recs = simRecommendations(3);
    SIM_LAST_RECS = recs;
    if (recs.length) {
      h += '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:10px 0 3px">Suggested next</div>';
      recs.forEach(function (r, i) {
        h += '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;padding:4px 0;border-top:1px solid var(--fg)">' +
          '<div style="font-size:.6rem"><b>' + esc(r.label) + '</b>' +
            '<div style="color:var(--sv);font-size:.54rem">' + esc(r.why) + '</div></div>' +
          '<button class="btn btn-s" style="font-size:.56rem" onclick="simLaunchRec(' + i + ')">Go</button>' +
        '</div>';
      });
    }
  }
  return h + '</div>' + osceLauncherCard() + assignStudentCard();
}

function simSetTier(t) { SIM.tier = t; if (typeof renderHome === "function") renderHome(); }

var SIM_LAST_RECS = [];
function simLaunchRec(i) {
  var recs = SIM_LAST_RECS.length ? SIM_LAST_RECS : simRecommendations(3);
  var r = recs[i];
  if (r && r.kind === "tier") { simSetTier(r.tier); return; }
  var c = simCaseFor(r);
  if (!c) { toast("No case available."); return; }
  if (typeof ASSIGN_ACTIVE !== "undefined") ASSIGN_ACTIVE = null;
  simStart(c, SIM.tier || "standard");
}

/* OSCE launcher. */
function osceLauncherCard() {
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">⏱ OSCE circuit</div>' +
    '<div class="home-settings-desc">' +
      OSCE_CONFIG.stations + ' timed stations, ' + Math.round(OSCE_CONFIG.stationSeconds / 60) + ' minutes each, ' +
      '<b>engine hidden</b>. Marked separately on data gathering, finding the decisive sign, the diagnosis, and safety — ' +
      'so you can pass on diagnosis and still be told you missed a red flag.' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
      '<button class="btn btn-p" style="font-size:.62rem" onclick="osceStart(\'common\')">Start circuit — common</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="osceStart(\'urgent\')">Circuit — red flags</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="osceStart(\'\')">Circuit — anything</button>' +
    '</div>' +
    '<div style="font-size:.52rem;color:var(--sv);margin-top:5px">Practice only — timing and weighting are teaching defaults, not a certifying standard.</div>' +
  '</div>';
}

/* Assignments visible to this student. */
function assignStudentCard() {
  if (typeof assignForUser !== "function") return "";
  var u = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
  var list = assignForUser(u);
  if (!list.length) return "";
  var h = '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">📌 Assigned to you</div>';
  list.forEach(function (a) {
    var p = assignProgress(a, u);
    h += '<div style="border-top:1px solid var(--fg);padding:6px 0">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<div style="font-size:.64rem;font-weight:600">' + esc(a.title) +
          (a.mode === "osce" ? ' <span style="font-weight:400;color:var(--sv)">· OSCE</span>' : '') +
          (p.complete ? ' <span style="color:#2e7d32">✓ complete</span>' :
            (p.overdue ? ' <span style="color:#c0392b">overdue</span>' : '')) + '</div>' +
        '<button class="btn ' + (p.complete ? "btn-s" : "btn-p") + '" style="font-size:.58rem"' +
          ' onclick="assignStart(\'' + a.id + '\')">' + (p.complete ? "Practise again" : "Continue") + '</button>' +
      '</div>' +
      '<div style="font-size:.56rem;color:var(--sv)">' + p.done + ' of ' + p.target + ' done' +
        (p.attempts ? ' · ' + p.accuracy + '% correct' : '') +
        (a.due ? ' · due ' + esc(a.due) : '') + '</div>' +
      (a.note ? '<div style="font-size:.54rem;color:var(--sl);margin-top:2px">' + esc(a.note) + '</div>' : '') +
    '</div>';
  });
  return h + '</div>';
}

function simLaunch(scope) {
  var c = simRandomCase(scope === "all" ? "" : scope);
  if (!c) { if (typeof toast === "function") toast("No case available for that scope."); return; }
  /* Free practice — nothing here should be credited to an assignment the
     student happened to be working on earlier. */
  if (typeof ASSIGN_ACTIVE !== "undefined") ASSIGN_ACTIVE = null;
  simStart(c, SIM.tier || "standard");
}


/* ── In-exam banner: examine this step, or see what you found ────── */

function simBanner() {
  if (!SIM.active || !SIM.theCase) return "";
  var step = V.step;
  var stepHasFindings = (SIM.theCase.byStep[step] || []).length > 0;
  var done = simRevealed(step);
  var examinedCount = Object.keys(SIM.revealed).length;

  var tier = simTier(SIM.tier);
  var left = simSecondsLeft();
  var clock = "";
  if (left !== null) {
    var mm = Math.floor(left / 60), ss = left % 60;
    clock = '<span id="simClock" style="font-family:var(--mono);font-weight:600;color:' +
      (left <= 60 ? "#c0392b" : "var(--ink)") + '">' + mm + ":" + (ss < 10 ? "0" : "") + ss + '</span>';
  }

  var h = '<div style="border:1px solid var(--ink);border-radius:var(--r);padding:10px;margin-bottom:12px;background:var(--sn)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<div style="font-weight:600;font-size:.68rem">' + tier.icon + ' ' +
        (SIM.osce ? 'OSCE — station ' + (SIM.osce.index + 1) + ' of ' + SIM.osce.total : tier.label + ' simulation') +
        '<span style="font-weight:400;color:var(--sv);font-size:.58rem"> · ' + examinedCount + ' section(s) examined</span>' +
        (clock ? ' · ' + clock : '') + '</div>' +
      '<div style="display:flex;gap:6px">' +
        (SIM.answered ? '' :
          '<button class="btn btn-s" style="font-size:.58rem" onclick="simOpenAnswer()">Commit to a diagnosis</button>') +
        '<button class="btn btn-s" style="font-size:.58rem" onclick="simQuit()">End</button>' +
      '</div>' +
    '</div>';

  if (!tier.engine) {
    h += '<div style="margin-top:6px;font-size:.58rem;color:#b8860b">' +
      '🔒 Copilot hidden for this tier — commit on your own reasoning. You will see what the engine made of it in the debrief.</div>';
  }
  if (tier.hints && SIM.theCase) {
    var pending = simMissedSteps();
    if (pending.length) {
      h += '<div style="margin-top:6px;font-size:.58rem;color:var(--sl)">' +
        '🧭 Hint — there is still something to find in: <b>' +
        pending.slice(0, 2).map(function (st) {
          if (typeof STEPS !== "undefined") {
            for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === st) return esc(STEPS[i].l);
          }
          return esc(st);
        }).join(", ") + '</b></div>';
    }
  }

  if (!done) {
    h += '<div style="margin-top:6px;font-size:.6rem;color:var(--sl)">' +
        'This section has not been examined yet. Findings appear only once you perform it.</div>' +
      '<div style="margin-top:6px">' +
        '<button class="btn btn-p" style="font-size:.62rem" onclick="simExamine()">Examine this section</button>' +
      '</div>';
  } else {
    h += '<div style="margin-top:6px;font-size:.6rem;color:#2e7d32">✓ Examined' +
      (stepHasFindings ? ' — findings from this section are now in the record and feeding the engine.'
                       : ' — nothing abnormal in this section.') + '</div>';
  }
  return h + '</div>';
}

/* Update just the clock text each second without re-rendering the page. */
function simRefreshClock(left) {
  var el = document.getElementById("simClock");
  if (!el) return;
  var mm = Math.floor(left / 60), ss = left % 60;
  el.textContent = mm + ":" + (ss < 10 ? "0" : "") + ss;
  if (left <= 60) el.style.color = "#c0392b";
}

function simQuit() {
  /* Inside a circuit, "End" means abandon the whole OSCE — but the stations
     already completed are still marked rather than thrown away. */
  if (typeof OSCE !== "undefined" && OSCE.active) {
    if (!window.confirm("Leave the OSCE circuit? Stations you have already finished will still be marked.")) return;
    if (OSCE.results.length) { osceFinish(); } else { osceAbort(); }
    return;
  }
  if (!window.confirm("End this simulation? Progress will be discarded.")) return;
  simEnd();
  if (typeof goHome === "function") goHome();
}


/* ── Commit to a diagnosis ───────────────────────────────────────── */

/* Step 1 of committing: how sure are you? Calibration is a real skill and
   asking first stops it being rationalised after the reveal. */
function simOpenAnswer() {
  if (!SIM.confidence) {
    simShowModal('<div class="modal-title">How confident are you?</div>' +
      '<div class="modal-desc" style="font-size:.66rem">Answer before you see the result — knowing how sure you are is part of the skill.</div>' +
      '<div style="display:flex;gap:6px;margin:10px 0;flex-wrap:wrap">' +
        ["Low", "Moderate", "High"].map(function (c) {
          return '<button class="btn btn-s" style="font-size:.64rem" onclick="simSetConfidence(\'' + c + '\')">' + c + '</button>';
        }).join("") +
      '</div>');
    return;
  }
  simOpenAnswerList();
}

function simSetConfidence(c) { SIM.confidence = c; simOpenAnswerList(); }

function simOpenAnswerList() {
  var tier = simTier(SIM.tier);
  /* Challenge / OSCE: no list to pick from — search the whole knowledge base,
     which is what makes committing genuinely unaided. */
  if (!tier.answerList) {
    simShowModal('<div class="modal-title">Commit to a diagnosis</div>' +
      '<div class="modal-desc" style="font-size:.66rem">Type the condition you would act on. ' +
      'No shortlist at this tier — search the knowledge base.</div>' +
      '<input id="simSearch" class="e-in" style="width:100%;margin:8px 0" placeholder="Start typing…" ' +
      'oninput="simSearchRender(this.value)" autocomplete="off">' +
      '<div id="simSearchOut" style="max-height:280px;overflow:auto"></div>');
    setTimeout(function () { var e = document.getElementById("simSearch"); if (e) e.focus(); }, 50);
    return;
  }
  simOpenAnswerShortlist();
}

function simSearchRender(q) {
  var out = document.getElementById("simSearchOut");
  if (!out) return;
  q = (q || "").toLowerCase().trim();
  if (q.length < 2) { out.innerHTML = '<div style="font-size:.58rem;color:var(--sv)">Type at least two letters.</div>'; return; }
  var pool = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL : [];
  var hits = pool.filter(function (c) { return c.name.toLowerCase().indexOf(q) >= 0; }).slice(0, 25);
  out.innerHTML = hits.length
    ? hits.map(function (c) {
        return '<button class="btn btn-s" style="display:block;width:100%;text-align:left;font-size:.62rem;margin-bottom:3px"' +
          ' onclick="simAnswer(' + JSON.stringify(c.name).replace(/"/g, "&quot;") + ')">' + esc(c.name) +
          '<span style="color:var(--sv)"> · ' + esc(c.domain || "") + '</span></button>';
      }).join("")
    : '<div style="font-size:.58rem;color:var(--sv)">No match.</div>';
}

function simOpenAnswerShortlist() {
  var top = (V.dxList || []).slice(0, 8).map(function (d) { return d.n; });
  /* Always offer the truth among the options so the exercise is answerable
     even if the student has not uncovered enough to raise it yet. */
  if (SIM.theCase && top.indexOf(SIM.theCase.condition) < 0) top.push(SIM.theCase.condition);
  /* Shuffle so position is not a giveaway. */
  for (var i = top.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = top[i]; top[i] = top[j]; top[j] = t;
  }

  var h = '<div class="modal-title">Commit to a diagnosis</div>' +
    '<div class="modal-desc" style="font-size:.66rem">Choose the diagnosis you would act on. ' +
    'You will then see what the case actually was and what you did or did not uncover.</div>' +
    '<div style="max-height:320px;overflow:auto;margin:8px 0">' +
      top.map(function (n) {
        return '<button class="btn btn-s" style="display:block;width:100%;text-align:left;font-size:.64rem;margin-bottom:4px"' +
          ' onclick="simAnswer(' + JSON.stringify(n).replace(/"/g, "&quot;") + ')">' + esc(n) + '</button>';
      }).join("") +
    '</div>';
  simShowModal(h);
}

function simAnswer(name) {
  var theCase = SIM.theCase;
  var inOsce = !!(typeof OSCE !== "undefined" && OSCE.active);
  var s = simSubmit(name);
  if (!s) return;

  if (typeof logAudit === "function") {
    logAudit("simulation_completed", s.truth + " — " + (s.correct ? "correct" : "incorrect"), {});
  }
  if (inOsce) {
    /* Exam conditions: no per-station debrief, the circuit moves on.
       Assignment credit is handled in osceCompleteStation() so a station that
       runs out of time is credited on exactly the same path. */
    osceCompleteStation();
    return;
  }
  if (typeof assignCredit === "function") assignCredit(s, theCase, "simulation");
  /* Committing reveals the engine again at the hidden tiers, so the student
     can compare their reasoning against it while the debrief is open. */
  if (typeof renderAdvisory === "function") renderAdvisory();
  simShowModal(simDebriefHtml(s));
}

/* One labelled skill bar. Kept plain — this reports what happened, it does
   not grade clinical judgement. */
function simSkillRow(label, value, note) {
  var pct = Math.round(Math.max(0, Math.min(1, value || 0)) * 100);
  var colour = pct >= 70 ? "#2e7d32" : (pct >= 40 ? "#b8860b" : "#c0392b");
  return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:.6rem">' +
    '<div style="width:80px">' + esc(label) + '</div>' +
    '<div style="flex:1;height:5px;background:var(--gr);border-radius:3px;overflow:hidden">' +
      '<div style="width:' + pct + '%;height:100%;background:' + colour + '"></div></div>' +
    '<div style="width:34px;text-align:right;font-family:var(--mono)">' + pct + '%</div>' +
    '<div style="flex:2;color:var(--sv);font-size:.54rem">' + esc(note || "") + '</div>' +
  '</div>';
}

/* Evidence, not speed. Examining a section that turns out normal is a negative
   finding — it is never reported here as waste. */
function simEvidenceNote(s) {
  if (s.evidence >= 1) return "You had every defining finding before you committed.";
  var missing = s.decisiveMissed.length;
  return "You committed without " + missing + " defining finding" + (missing === 1 ? "" : "s") + ".";
}

function simCalibrationRow(s) {
  var msg = {
    "well-calibrated": "Your confidence matched your result.",
    "over-confident": "You were sure and wrong — the most dangerous combination.",
    "under-confident": "You were right but unsure. Trust the finding you uncovered.",
    "reasonable": "Moderate confidence — fair given what you had."
  }[s.calibration] || "";
  var colour = s.calibration === "over-confident" ? "#c0392b"
             : (s.calibration === "well-calibrated" ? "#2e7d32" : "var(--sl)");
  return '<div style="display:flex;align-items:baseline;gap:8px;margin:3px 0;font-size:.6rem">' +
    '<div style="width:80px">Calibration</div>' +
    '<div style="color:' + colour + '"><b>' + esc(s.calibration) + '</b> ' +
      '<span style="color:var(--sv);font-size:.54rem">(said ' + esc(s.confidence) + ') · ' + esc(msg) + '</span></div>' +
  '</div>';
}

/* What kind of patient this was, and — for the discordant cases — the lesson
   the whole rebuild exists to teach: the copilot ranked the wrong condition
   first, here is what pulled it, and here is what should have held you. */
function simRealismBlock(s) {
  var pretty = function (t) { return String(t).replace(/_/g, " "); };
  if (!s.realism || s.realism === "textbook") return "";

  if (s.realism === "comorbid" && s.comorbid) {
    return '<div style="border-left:3px solid var(--ink);padding:6px 10px;margin:8px 0;background:var(--sn)">' +
      '<div style="font-size:.62rem;font-weight:600">⧉ This patient had two problems</div>' +
      '<div style="font-size:.6rem;color:var(--md)">' +
        esc(s.truth) + ' <b>and</b> ' + esc(s.comorbid) + '. Either was a defensible answer — ' +
        'real patients rarely have exactly one thing wrong, and the engine carries them as ' +
        'separate working problems for that reason.</div>' +
    '</div>';
  }

  if (s.realism === "incomplete") {
    return '<div style="border-left:3px solid var(--ms);padding:6px 10px;margin:8px 0;background:var(--sn)">' +
      '<div style="font-size:.62rem;font-weight:600">◐ An incomplete picture</div>' +
      '<div style="font-size:.6rem;color:var(--md)">' +
        'Some supporting features of ' + esc(s.truth) + ' were simply not present in this patient. ' +
        'The textbook picture is the exception, not the rule.</div>' +
    '</div>';
  }

  if (s.realism === "discordant" && s.misledBy) {
    return '<div style="border-left:3px solid #c0392b;padding:8px 10px;margin:8px 0;background:var(--sn)">' +
      '<div style="font-size:.64rem;font-weight:600">⚠ The copilot was wrong on this one</div>' +
      '<div style="font-size:.6rem;color:var(--md);margin-top:3px">' +
        'It ranked <b>' + esc(s.misledBy) + '</b> first. The answer was <b>' + esc(s.truth) + '</b>.</div>' +
      (s.misleadingFindings.length
        ? '<div style="font-size:.58rem;color:var(--md);margin-top:4px"><b>What pulled it:</b> ' +
            s.misleadingFindings.map(pretty).map(esc).join(" · ") +
          ' — findings this patient genuinely had, which ' + esc(s.misledBy) + ' also produces.</div>'
        : '') +
      (s.discriminators.length
        ? '<div style="font-size:.58rem;color:#2e7d32;margin-top:4px"><b>What should have held you:</b> ' +
            s.discriminators.map(pretty).map(esc).join(" · ") +
          ' — required by ' + esc(s.truth) + ', and not by ' + esc(s.misledBy) + '.</div>'
        : '') +
      '<div style="font-size:.56rem;color:var(--sv);margin-top:5px">' +
        'This is why the ranking is advisory and the red-flag alerts are not. The engine weighs ' +
        'evidence; it does not examine the patient. You do.</div>' +
    '</div>';
  }
  return "";
}

function simDebriefHtml(s) {
  var pretty = function (t) { return String(t).replace(/_/g, " "); };
  var stepName = function (id) {
    if (typeof STEPS !== "undefined") {
      for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return STEPS[i].l;
    }
    return id;
  };

  var h = '<div class="modal-title">' + (s.correct ? "✓ Correct" : "Not quite") + '</div>' +
    '<div class="modal-desc" style="font-size:.68rem">' +
      'The case was <b>' + esc(s.truth) + '</b>' +
      (s.correct ? '.' : ' — you answered <b>' + esc(s.guess || "—") + '</b>.') +
    '</div>';

  h += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin:10px 0;font-size:.62rem">' +
      '<div>' + simTier(s.tier).icon + ' <b>' + esc(simTier(s.tier).label) + '</b></div>' +
      '<div><b>' + s.stepsExamined + '</b> sections examined</div>' +
      '<div><b>' + s.decisiveFound.length + '/' + s.decisive.length + '</b> key findings uncovered</div>' +
      '<div><b>' + s.seconds + 's</b> taken</div>' +
      (s.timedOut ? '<div style="color:#c0392b"><b>timed out</b></div>' : '') +
    '</div>';

  /* The three skills, reported separately — a student should be able to see
     WHICH one is weak, not just whether they got it right. */
  h += simSkillRow("Accuracy", s.correct ? 1 : 0,
        s.correct ? "You named the condition." : "You named " + (s.guess || "nothing") + ".") +
    simSkillRow("Evidence", s.evidence, simEvidenceNote(s)) +
    (s.calibration ? simCalibrationRow(s) : "");

  /* Right answer on incomplete evidence is a lucky guess, and saying so is the
     whole point — premature closure is one of the commonest ways a real
     diagnosis goes wrong. */
  if (s.prematureClosure) {
    h += '<div style="border-left:3px solid #b8860b;padding:6px 10px;margin:6px 0;background:var(--sn)">' +
      '<div style="font-size:.62rem;font-weight:600">Right answer, incomplete evidence</div>' +
      '<div style="font-size:.58rem;color:var(--md)">You committed before uncovering ' +
        s.decisiveMissed.map(pretty).map(esc).join(", ") +
        '. On this patient it worked; on the next one it is how a diagnosis gets missed.</div>' +
    '</div>';
  }

  h += simRealismBlock(s);

  if (typeof s.xpGained === "number" && s.progress) {
    var pctInto = Math.round(100 * s.progress.into / Math.max(1, s.progress.need));
    h += '<div style="display:flex;align-items:center;gap:8px;margin:8px 0;font-size:.6rem">' +
        '<div><b>+' + s.xpGained + ' XP</b> · Level ' + s.progress.level + '</div>' +
        '<div style="flex:1;height:5px;background:var(--gr);border-radius:3px;overflow:hidden">' +
          '<div style="width:' + pctInto + '%;height:100%;background:var(--ink)"></div></div>' +
        (s.progress.streak > 1 ? '<div>🔥 ' + s.progress.streak + '-day streak</div>' : '') +
      '</div>';
  }

  if (s.decisiveMissed.length) {
    h += '<div style="border-left:3px solid #b8860b;padding:6px 10px;margin-bottom:8px;background:var(--sn)">' +
      '<div style="font-size:.62rem;font-weight:600">Findings you did not uncover</div>' +
      '<div style="font-size:.6rem;color:var(--md)">' +
        s.decisiveMissed.map(pretty).map(esc).join(" · ") +
      '</div>' +
      '<div style="font-size:.56rem;color:var(--sv);margin-top:2px">These are what this condition is defined by — without them the engine could not reach it.</div>' +
    '</div>';
  } else {
    h += '<div style="font-size:.62rem;color:#2e7d32;margin-bottom:8px">✓ You uncovered every defining finding.</div>';
  }

  if (s.missedSteps.length) {
    h += '<div style="font-size:.62rem;margin-bottom:8px"><b>Sections with findings you never examined:</b> ' +
      s.missedSteps.map(stepName).map(esc).join(", ") + '</div>';
  }

  if (s.engineTop.length) {
    h += '<div style="font-size:.62rem;font-weight:600;margin-bottom:3px">What the engine had, on your evidence</div>' +
      '<div style="font-size:.6rem;color:var(--md);margin-bottom:8px">' +
        s.engineTop.map(function (d) { return esc(d.n); }).join(" · ") + '</div>';
  }

  if (SIM.theCase && SIM.theCase.teaching) {
    h += '<div style="border-top:1px solid var(--fg);padding-top:6px;font-size:.62rem">' +
      '<b>About ' + esc(s.truth) + '</b><br>' + esc(SIM.theCase.teaching) + '</div>';
  }

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:8px">' +
    'Teaching simulation generated from the knowledge base — provisional content, not a substitute for supervised clinical training.</div>';

  /* If this case was set as coursework, keep the student inside it rather than
     dropping them back into random practice. */
  var a = (typeof ASSIGN_ACTIVE !== "undefined") ? ASSIGN_ACTIVE : null;
  if (a) {
    var u = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
    var ap = assignProgress(a, u);
    h += '<div style="border-top:1px solid var(--fg);margin-top:8px;padding-top:6px;font-size:.6rem">' +
      '📌 <b>' + esc(a.title) + '</b> — ' + ap.done + ' of ' + ap.target + ' done' +
      (ap.complete ? ' <span style="color:#2e7d32">✓ complete</span>' : '') + '</div>';
    h += '<div class="btn-g" style="margin-top:10px">' +
        (ap.complete
          ? '<button class="btn btn-p" onclick="simCloseModal();simQuitSilent()">Done — back to Study</button>'
          : '<button class="btn btn-p" onclick="simCloseModal();assignStart(\'' + a.id + '\')">Next case in this assignment</button>') +
        '<button class="btn btn-s" onclick="simCloseModal();simQuitSilent()">Finish for now</button>' +
      '</div>';
    return h;
  }

  h += '<div class="btn-g" style="margin-top:10px">' +
      '<button class="btn btn-p" onclick="simCloseModal();simLaunch(\'common\')">Next case</button>' +
      '<button class="btn btn-s" onclick="simCloseModal();simQuitSilent()">Finish</button>' +
    '</div>';
  return h;
}

function simQuitSilent() {
  if (typeof ASSIGN_ACTIVE !== "undefined") ASSIGN_ACTIVE = null;
  simEnd();
  if (typeof goHome === "function") goHome();
}


/* ── Minimal modal host (reuses the app's overlay styling) ───────── */

function simShowModal(inner) {
  var el = document.getElementById("modalSim");
  if (!el) {
    el = document.createElement("div");
    el.className = "modal-overlay";
    el.id = "modalSim";
    document.body.appendChild(el);
  }
  el.innerHTML = '<div class="modal-box" style="max-width:620px">' + inner + '</div>';
  el.style.display = "flex";
}

function simCloseModal() {
  var el = document.getElementById("modalSim");
  if (el) el.style.display = "none";
}
