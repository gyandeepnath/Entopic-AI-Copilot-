/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — QUIZ / SELF-TEST ("guess the diagnosis")              */
/*                                                                  */
/* Student-mode learning feature. Questions are built ONLY from     */
/* content that already exists in the build:                        */
/*   • the knowledge base (a condition's own required/supportive    */
/*     findings become the vignette — nothing is invented), or      */
/*   • the user's de-identified teaching casebook (real reasoned    */
/*     encounters).                                                 */
/* Explanations come from the hand-authored About notes             */
/* (condition-info.js). Distractors are real KB condition names     */
/* from the same route/domain.                                      */
/*                                                                  */
/* GUARDRAILS: educational only — never touches a live patient      */
/* exam, never feeds the engine, offline, no LLM, no fabricated     */
/* clinical content. Free for every role and tier (ALWAYS_ON).      */
/*                                                                  */
/* Pure core first (Node-testable); DOM wiring guarded at bottom.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── token → clinician-readable label (cached) ── */
var _quizLabels = null;
function quizTokenLabel(t) {
  if (_quizLabels === null) {
    _quizLabels = {};
    if (typeof buildNextTestLabels === "function") {
      try { _quizLabels = buildNextTestLabels() || {}; } catch (e) { _quizLabels = {}; }
    } else if (typeof NEXT_TEST_LABELS !== "undefined" && NEXT_TEST_LABELS) {
      _quizLabels = NEXT_TEST_LABELS;
    }
  }
  return _quizLabels[t] || String(t).replace(/_/g, " ");
}

function quizShuffle(arr, rng) {
  rng = rng || Math.random;
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(rng() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

/* ── Scope: Common (bread-and-butter) vs All conditions ───────────
   "Common" draws only from knowledge/common-conditions.js (a founder-
   reviewable list — NOT invented prevalence data; see that file). */
var QUIZ_SCOPES = ["common", "all"];
var _quizScope = null;

function quizGetScope() {
  if (_quizScope) return _quizScope;
  if (typeof loadStore === "function") {
    var s = loadStore("quizscope", null);
    if (QUIZ_SCOPES.indexOf(s) >= 0) { _quizScope = s; return s; }
  }
  /* default to Common only if the list is actually present */
  return (typeof KB_COMMON_SET !== "undefined") ? "common" : "all";
}
function quizSetScope(s) {
  if (QUIZ_SCOPES.indexOf(s) === -1) return false;
  _quizScope = s;
  if (typeof saveStore === "function") saveStore("quizscope", s);
  return true;
}

/* Conditions rich enough to make a fair vignette (≥1 required and ≥3
   findings overall, so the answer isn't a single-finding giveaway).
   `scope` narrows to the common list when requested (falls back to all
   if that would leave too few to build a 4-option question). */
function quizCandidates(scope) {
  if (typeof KNOWLEDGE_ALL === "undefined" || !KNOWLEDGE_ALL) return [];
  var rich = KNOWLEDGE_ALL.filter(function (c) {
    return c && c.name && c.req && c.req.length >= 1 &&
      ((c.req.length + ((c.sup || []).length)) >= 3);
  });
  scope = scope || quizGetScope();
  if (scope === "common" && typeof KB_COMMON_SET !== "undefined") {
    var common = rich.filter(function (c) { return KB_COMMON_SET[c.name]; });
    if (common.length >= 4) return common;   /* enough to build a question */
  }
  return rich;
}

/* 3 real KB condition names near the answer (same route, then same domain,
   then anywhere) — never invented, always unique. */
function quizDistractors(cond, n, rng) {
  rng = rng || Math.random;
  var seen = {}; seen[cond.name] = true;
  var out = [];
  function take(pool) {
    pool = quizShuffle(pool, rng);
    for (var i = 0; i < pool.length && out.length < n; i++) {
      var c = pool[i];
      if (!c || !c.name || seen[c.name]) continue;
      seen[c.name] = true;
      out.push(c.name);
    }
  }
  if (typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) {
    take(KNOWLEDGE_ALL.filter(function (c) { return c.route === cond.route; }));
    take(KNOWLEDGE_ALL.filter(function (c) { return c._domain && c._domain === cond._domain; }));
    take(KNOWLEDGE_ALL);
  }
  return out;
}

function quizExplanation(name) {
  var summary = "";
  if (typeof getConditionInfo === "function") {
    var info = getConditionInfo(name);
    if (info && info.summary) summary = info.summary;
  }
  return summary;
}

/* ── Difficulty ───────────────────────────────────────────────────
   Difficulty changes HOW MUCH EVIDENCE you get and how confusable the
   distractors are — it does NOT claim which diseases are common/rare
   (that would be inventing prevalence data, which the KB doesn't hold):
     easy     — required findings + up to 4 supportive clues
     standard — required findings + up to 2 supportive clues
     hard     — required findings only (min 2 clues), distractors drawn
                strictly from the same clinical route when possible.   */
var QUIZ_DIFFICULTIES = ["easy", "standard", "hard"];
var _quizDifficulty = null;

function quizGetDifficulty() {
  if (_quizDifficulty) return _quizDifficulty;
  if (typeof loadStore === "function") {
    var d = loadStore("quizdiff", null);
    if (QUIZ_DIFFICULTIES.indexOf(d) >= 0) { _quizDifficulty = d; return d; }
  }
  return "standard";
}
function quizSetDifficulty(d) {
  if (QUIZ_DIFFICULTIES.indexOf(d) === -1) return false;
  _quizDifficulty = d;
  if (typeof saveStore === "function") saveStore("quizdiff", d);
  return true;
}

/* Build a question from the KB. `forceName` (tests) pins the condition;
   `difficulty` overrides the saved setting. */
function quizBuildQuestionFromKB(rng, forceName, difficulty) {
  rng = rng || Math.random;
  difficulty = difficulty || quizGetDifficulty();
  var pool = quizCandidates();
  if (!pool.length) return null;
  var scope = quizGetScope();
  var cond = null;
  if (forceName) {
    for (var i = 0; i < pool.length; i++) if (pool[i].name === forceName) { cond = pool[i]; break; }
  }
  if (!cond) cond = pool[Math.floor(rng() * pool.length)];

  /* The vignette IS the condition's own criteria — its required findings
     plus supportive ones per difficulty. Nothing invented. */
  var supCount = difficulty === "easy" ? 4 : difficulty === "hard" ? (cond.req.length >= 2 ? 0 : 1) : 2;
  var findings = cond.req.map(quizTokenLabel)
    .concat(quizShuffle((cond.sup || []), rng).slice(0, supCount).map(quizTokenLabel));

  /* Hard mode: prefer strictly same-route distractors (most confusable). */
  var distract;
  if (difficulty === "hard" && typeof KNOWLEDGE_ALL !== "undefined" && KNOWLEDGE_ALL) {
    var sameRoute = KNOWLEDGE_ALL.filter(function (c) {
      return c.route === cond.route && c.name !== cond.name;
    });
    if (sameRoute.length >= 3) {
      distract = quizShuffle(sameRoute, rng).slice(0, 3).map(function (c) { return c.name; });
    }
  }
  if (!distract) distract = quizDistractors(cond, 3, rng);

  return {
    source: "kb",
    difficulty: difficulty,
    scope: scope,
    findings: findings,
    answer: cond.name,
    options: quizShuffle([cond.name].concat(distract), rng),
    explanation: quizExplanation(cond.name),
    urgent: !!cond.urgent
  };
}

/* Build a question from a saved (de-identified) teaching case. */
function quizBuildQuestionFromCase(entry, rng) {
  rng = rng || Math.random;
  if (!entry || !entry.state || !entry.title) return null;
  var s = entry.state;
  var findings = [];
  if (s.subjective && s.subjective.symptoms) findings = findings.concat(s.subjective.symptoms.map(quizTokenLabel));
  var o = s.objective || {};
  if (o.anterior) findings = findings.concat(o.anterior);
  if (o.fundus && o.fundus.findings) findings = findings.concat(o.fundus.findings);
  if (o.iop) findings.push("IOP OD " + (o.iop.od || "—") + " / OS " + (o.iop.os || "—") + " mmHg");
  if (o.pupil) findings.push("RAPD " + o.pupil.rapd);
  if (findings.length < 2) return null;   /* too thin to be a fair question */

  var cond = (typeof findCondition === "function") ? findCondition(entry.title) : null;
  var distract = cond ? quizDistractors(cond, 3, rng)
    : quizShuffle(quizCandidates(), rng).slice(0, 3).map(function (c) { return c.name; })
        .filter(function (n) { return n !== entry.title; }).slice(0, 3);

  return {
    source: "case",
    findings: findings,
    answer: entry.title,
    options: quizShuffle([entry.title].concat(distract), rng),
    explanation: quizExplanation(entry.title),
    urgent: !!(s.assessment && s.assessment[0] && s.assessment[0].urgent)
  };
}

/* Next question: mixes the user's own casebook (when it has cases) with
   KB vignettes, so studying feeds the quiz and the quiz drives studying. */
function quizNextQuestion(rng) {
  rng = rng || Math.random;
  var cases = (typeof casebookLoad === "function") ? casebookLoad() : [];
  if (cases.length && rng() < 0.35) {
    var q = quizBuildQuestionFromCase(cases[Math.floor(rng() * cases.length)], rng);
    if (q) return q;
  }
  return quizBuildQuestionFromKB(rng);
}

/* A fresh question that isn't one of the recently-answered ones — keeps a
   long continuous session varied. `recent` is an array of answer names. */
function quizFreshQuestion(recent, rng) {
  rng = rng || Math.random;
  recent = recent || [];
  var q = null;
  for (var tries = 0; tries < 12; tries++) {
    q = quizNextQuestion(rng);
    if (!q) return null;
    if (recent.indexOf(q.answer) === -1) return q;
  }
  return q;   /* give up avoiding repeats after a few tries */
}


/* ── Stats (streaks — the habit loop). storage.js when present,      */
/*    in-memory fallback so the module works anywhere. ── */
var _quizMemStats = null;
function quizLoadStats() {
  if (typeof loadStore === "function") return loadStore("quizstats", null) || { asked: 0, correct: 0, streak: 0, best: 0 };
  return _quizMemStats || { asked: 0, correct: 0, streak: 0, best: 0 };
}
function quizSaveStats(s) {
  if (typeof saveStore === "function") saveStore("quizstats", s);
  else _quizMemStats = s;
}
function quizRecord(correct) {
  var s = quizLoadStats();
  s.asked += 1;
  if (correct) { s.correct += 1; s.streak += 1; if (s.streak > s.best) s.best = s.streak; }
  else s.streak = 0;
  quizSaveStats(s);
  return s;
}
function quizStatsSummary() {
  var s = quizLoadStats();
  if (!s.asked) return "Fresh start — every question comes from the knowledge base or your own casebook.";
  return s.correct + " / " + s.asked + " correct · streak " + s.streak + " (best " + s.best + ")";
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM WIRING (browser only)                                       */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  var _qEsc = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };
  var _quizQ = null;                              /* current question */
  var _quizAnswered = false;                      /* has the current Q been answered? */
  var _quizSession = { count: 0, correct: 0, streak: 0 };  /* this sitting */
  var _quizRecent = [];                           /* recent answers (no-repeat) */

  /* ── the fixed shell: session header + settings + a swappable question ── */
  window.startQuiz = function () {
    _quizSession = { count: 0, correct: 0, streak: 0 };
    _quizRecent = [];
    var box = document.getElementById("quizContent");
    if (box) {
      box.innerHTML =
        '<div id="quizHeader"></div>' +
        '<div id="quizSettings"></div>' +
        '<div id="quizBody"></div>';
    }
    var m = document.getElementById("modalQuiz");
    if (m) m.style.display = "flex";
    _quizRenderSettings();
    window.quizNext();
  };

  window.setQuizDifficulty = function (d) { quizSetDifficulty(d); _quizRenderSettings(); window.quizNext(); };
  window.setQuizScope = function (s) { quizSetScope(s); _quizRenderSettings(); window.quizNext(); };

  function _quizRenderHeader() {
    var el = document.getElementById("quizHeader");
    if (!el) return;
    var s = _quizSession;
    var pct = s.count ? Math.round(s.correct / s.count * 100) : 0;
    var best = quizLoadStats().best || 0;
    el.innerHTML =
      '<div class="quiz-session">' +
        '<span class="quiz-session-q">Question ' + (s.count + (_quizAnswered ? 0 : 1)) + '</span>' +
        '<span class="quiz-session-stat">' + s.correct + '/' + s.count + (s.count ? ' · ' + pct + '%' : '') + '</span>' +
        '<span class="quiz-session-stat">streak ' + s.streak + '</span>' +
        '<span class="quiz-session-stat" style="opacity:.7">best ' + best + '</span>' +
      '</div>';
  }

  function _quizRenderSettings() {
    var el = document.getElementById("quizSettings");
    if (!el) return;
    var cur = quizGetDifficulty(), curScope = quizGetScope();
    var hasCommon = (typeof KB_COMMON_SET !== "undefined");
    var h = "";
    if (hasCommon) {
      h += '<div class="quiz-diff"><span class="quiz-diff-lbl">Scope</span>' +
        '<button class="quiz-diff-btn' + (curScope === "common" ? ' quiz-diff-on' : '') + '" onclick="setQuizScope(\'common\')">Common</button>' +
        '<button class="quiz-diff-btn' + (curScope === "all" ? ' quiz-diff-on' : '') + '" onclick="setQuizScope(\'all\')">All</button></div>';
    }
    h += '<div class="quiz-diff"><span class="quiz-diff-lbl">Level</span>';
    for (var d = 0; d < QUIZ_DIFFICULTIES.length; d++) {
      var dd = QUIZ_DIFFICULTIES[d];
      h += '<button class="quiz-diff-btn' + (dd === cur ? ' quiz-diff-on' : '') +
        '" onclick="setQuizDifficulty(\'' + dd + '\')">' + dd.charAt(0).toUpperCase() + dd.slice(1) + '</button>';
    }
    h += '<span class="quiz-diff-hint">1–4 to answer · Enter for next</span></div>';
    el.innerHTML = h;
  }

  /* Load and render the next question into the body (session continues). */
  window.quizNext = function () {
    _quizQ = quizFreshQuestion(_quizRecent);
    _quizAnswered = false;
    var body = document.getElementById("quizBody");
    if (!body) return;
    if (!_quizQ) { body.innerHTML = '<div class="quiz-expl">No questions available.</div>'; return; }
    _quizRecent.push(_quizQ.answer);
    if (_quizRecent.length > 15) _quizRecent.shift();

    var h = '<div class="quiz-src">' +
      (_quizQ.source === "case" ? "From your casebook (de-identified)" : "From the knowledge base") + '</div>' +
      '<div class="quiz-stem">A patient presents with:</div><ul class="quiz-findings">';
    for (var i = 0; i < _quizQ.findings.length; i++) h += '<li>' + _qEsc(_quizQ.findings[i]) + '</li>';
    h += '</ul><div class="quiz-stem">Most likely diagnosis?</div><div class="quiz-opts">';
    for (var o = 0; o < _quizQ.options.length; o++) {
      h += '<button class="quiz-opt" id="quizOpt' + o + '" onclick="quizAnswer(' + o + ')">' +
        '<span class="quiz-opt-key">' + (o + 1) + '</span>' + _qEsc(_quizQ.options[o]) + '</button>';
    }
    h += '</div><div id="quizReveal"></div>';
    body.innerHTML = h;
    _quizRenderHeader();
  };

  window.quizAnswer = function (idx) {
    if (!_quizQ || _quizAnswered) return;
    if (idx < 0 || idx >= _quizQ.options.length) return;
    _quizAnswered = true;
    var correct = (_quizQ.options[idx] === _quizQ.answer);
    for (var o = 0; o < _quizQ.options.length; o++) {
      var b = document.getElementById("quizOpt" + o);
      if (!b) continue;
      b.disabled = true;
      if (_quizQ.options[o] === _quizQ.answer) b.classList.add("quiz-opt-correct");
      else if (o === idx) b.classList.add("quiz-opt-wrong");
    }
    /* session + lifetime stats */
    _quizSession.count += 1;
    if (correct) { _quizSession.correct += 1; _quizSession.streak += 1; }
    else _quizSession.streak = 0;
    quizRecord(correct);
    _quizRenderHeader();

    var reveal = document.getElementById("quizReveal");
    if (reveal) {
      reveal.innerHTML =
        '<div class="quiz-verdict">' + (correct ? "✓ Correct" : "✗ Not this time — it was <b>" + _qEsc(_quizQ.answer) + "</b>") +
          (_quizQ.urgent ? ' <span class="quiz-urgent">sight-threatening — urgent in real life</span>' : '') + '</div>' +
        (_quizQ.explanation ? '<div class="quiz-expl">' + _qEsc(_quizQ.explanation) + '</div>' : '') +
        '<div class="btn-g"><button class="btn btn-p" id="quizNextBtn" onclick="quizNext()">Next question ▸</button></div>';
      var nb = document.getElementById("quizNextBtn");
      if (nb && nb.focus) nb.focus();
    }
  };

  /* Keyboard: 1–4 answer the current question; Enter/N advance. */
  document.addEventListener("keydown", function (e) {
    var m = document.getElementById("modalQuiz");
    if (!m || m.style.display !== "flex") return;
    if (e.key >= "1" && e.key <= "9" && !_quizAnswered) {
      var idx = parseInt(e.key, 10) - 1;
      if (_quizQ && idx < _quizQ.options.length) { e.preventDefault(); window.quizAnswer(idx); }
    } else if ((e.key === "Enter" || e.key === "n" || e.key === "N") && _quizAnswered) {
      e.preventDefault(); window.quizNext();
    }
  });

  /* Closing the quiz refreshes the Study tab so its stats line stays live. */
  window.closeQuiz = function () {
    var m = document.getElementById("modalQuiz");
    if (m) m.style.display = "none";
    if (typeof HOME_TAB !== "undefined" && HOME_TAB === "study" && typeof renderHome === "function") renderHome();
  };
}
