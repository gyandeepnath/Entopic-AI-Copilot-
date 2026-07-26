/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SIMULATION UI                                          */
/* Case launcher (Study tab) · in-exam examine banner · debrief.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── Launcher, for the student's Study tab ───────────────────────── */

function simLauncherCard() {
  return '<div class="home-settings" style="margin-top:8px">' +
    '<div class="home-settings-title">🩺 Clinical simulation</div>' +
    '<div class="home-settings-desc">' +
      'Work a virtual patient through the real exam. Findings stay <b>hidden until you examine</b> — ' +
      'the engine only sees what you have found, so you learn which test to reach for next, not just the answer. ' +
      'Cases are generated from the knowledge base.' +
    '</div>' +
    '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
      '<button class="btn btn-p" style="font-size:.62rem" onclick="simLaunch(\'common\')">Start — common condition</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="simLaunch(\'all\')">Start — any condition</button>' +
      '<button class="btn btn-s" style="font-size:.62rem" onclick="simLaunch(\'urgent\')">Start — urgent / red flag</button>' +
    '</div>' +
  '</div>';
}

function simLaunch(scope) {
  var c = simRandomCase(scope === "all" ? "" : scope);
  if (!c) { if (typeof toast === "function") toast("No case available for that scope."); return; }
  simStart(c);
}


/* ── In-exam banner: examine this step, or see what you found ────── */

function simBanner() {
  if (!SIM.active || !SIM.theCase) return "";
  var step = V.step;
  var stepHasFindings = (SIM.theCase.byStep[step] || []).length > 0;
  var done = simRevealed(step);
  var examinedCount = Object.keys(SIM.revealed).length;

  var h = '<div style="border:1px solid var(--ink);border-radius:var(--r);padding:10px;margin-bottom:12px;background:var(--sn)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">' +
      '<div style="font-weight:600;font-size:.68rem">🩺 Simulation in progress' +
        '<span style="font-weight:400;color:var(--sv);font-size:.58rem"> · ' + examinedCount + ' section(s) examined</span></div>' +
      '<div style="display:flex;gap:6px">' +
        (SIM.answered ? '' :
          '<button class="btn btn-s" style="font-size:.58rem" onclick="simOpenAnswer()">Commit to a diagnosis</button>') +
        '<button class="btn btn-s" style="font-size:.58rem" onclick="simQuit()">End</button>' +
      '</div>' +
    '</div>';

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

function simQuit() {
  if (!window.confirm("End this simulation? Progress will be discarded.")) return;
  simEnd();
  if (typeof goHome === "function") goHome();
}


/* ── Commit to a diagnosis ───────────────────────────────────────── */

function simOpenAnswer() {
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
  var s = simSubmit(name);
  if (!s) return;
  simShowModal(simDebriefHtml(s));
  if (typeof logAudit === "function") {
    logAudit("simulation_completed", s.truth + " — " + (s.correct ? "correct" : "incorrect"), {});
  }
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
      '<div><b>' + s.stepsExamined + '</b> sections examined</div>' +
      '<div><b>' + s.decisiveFound.length + '/' + s.decisive.length + '</b> key findings uncovered</div>' +
      '<div><b>' + s.seconds + 's</b> taken</div>' +
    '</div>';

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

  h += '<div class="btn-g" style="margin-top:10px">' +
      '<button class="btn btn-p" onclick="simCloseModal();simLaunch(\'common\')">Next case</button>' +
      '<button class="btn btn-s" onclick="simCloseModal();simQuitSilent()">Finish</button>' +
    '</div>';
  return h;
}

function simQuitSilent() { simEnd(); if (typeof goHome === "function") goHome(); }


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
