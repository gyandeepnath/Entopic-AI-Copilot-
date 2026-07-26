/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — OSCE CIRCUIT                                           */
/*                                                                  */
/* A real OSCE is a CIRCUIT of timed stations under exam conditions, */
/* marked against a structured schedule — not a harder quiz. The     */
/* logic that makes it an OSCE rather than a countdown:              */
/*                                                                  */
/*   • Fixed station time. The bell ends the station whether or not  */
/*     you are finished — running out of time is itself information, */
/*     and it is recorded rather than silently forgiven.             */
/*   • No copilot. The engine is hidden for the whole circuit, so    */
/*     the student's reasoning is their own. It is revealed in the   */
/*     debrief for comparison.                                       */
/*   • A marking schedule with SEPARATE domains — data gathering,    */
/*     identifying the decisive finding, the diagnosis itself, and   */
/*     safety (did you spot the red flag). A student can pass on     */
/*     diagnosis and still fail on safety, which is the point.       */
/*   • No going back. Once a station is submitted it is closed;      */
/*     the circuit moves on.                                         */
/*   • Whole-circuit debrief at the end, per station and per domain, */
/*     so weaknesses show as a pattern rather than one bad case.     */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — station timing and the weighting below  */
/* are teaching defaults chosen by engineering, not a published      */
/* standard. They are all in OSCE_CONFIG for the founder to set to   */
/* whatever the local exam actually uses. Nothing here certifies     */
/* competence; it is practice.                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var OSCE_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Teaching defaults — founder-editable. */
var OSCE_CONFIG = {
  stationSeconds: 300,          /* 5 minutes per station */
  stations: 5,
  weights: {                    /* must sum to 1 */
    gathering: 0.25,            /* did you examine the sections that mattered */
    decisive: 0.25,             /* did you uncover the defining finding(s) */
    diagnosis: 0.35,            /* did you name it */
    safety: 0.15                /* did you catch the red flag when there was one */
  },
  passMark: 0.6                 /* practice guidance only, not certification */
};

var OSCE = {
  active: false,
  stations: [],        /* array of case objects */
  index: 0,
  results: [],         /* one score per completed station */
  scope: "common",
  startedAt: null,
  timerHandle: null
};

/* Build a circuit. Stations are distinct conditions so a circuit never
   repeats itself. */
function osceBuild(scope, count) {
  count = count || OSCE_CONFIG.stations;
  var pool = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.slice() : [];
  pool = pool.filter(function (c) { return (c.req || []).length > 0; });
  if (scope === "common" && typeof KB_COMMON_SET !== "undefined") {
    pool = pool.filter(function (c) { return KB_COMMON_SET[c.name]; });
  }
  if (scope === "urgent") pool = pool.filter(function (c) { return c.urgent; });
  if (!pool.length) return [];

  /* Shuffle, then take distinct conditions. */
  for (var i = pool.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
  }
  return pool.slice(0, Math.min(count, pool.length))
    .map(function (c) { return simBuildCase(c.name); })
    .filter(Boolean);
}

function osceStart(scope, count) {
  var stations = osceBuild(scope, count);
  if (!stations.length) { if (typeof toast === "function") toast("Could not build a circuit."); return; }
  OSCE.active = true;
  OSCE.stations = stations;
  OSCE.index = 0;
  OSCE.results = [];
  OSCE.scope = scope || "common";
  OSCE.startedAt = Date.now();
  osceRunStation();
}

function osceRunStation() {
  if (!OSCE.active) return;
  if (OSCE.index >= OSCE.stations.length) { osceFinish(); return; }
  var theCase = OSCE.stations[OSCE.index];
  simStart(theCase, "osce", {
    limitSeconds: OSCE_CONFIG.stationSeconds,
    osce: { index: OSCE.index, total: OSCE.stations.length }
  });
  osceStartTimer();
}

/* The bell. Checks once a second and force-submits when time runs out. */
function osceStartTimer() {
  osceStopTimer();
  OSCE.timerHandle = setInterval(function () {
    if (!OSCE.active || !SIM.active) { osceStopTimer(); return; }
    var left = simSecondsLeft();
    if (left === null) return;
    /* keep the banner clock live */
    if (typeof simRefreshClock === "function") simRefreshClock(left);
    if (left <= 0) {
      osceStopTimer();
      /* Time's up — submit whatever they have, unanswered. */
      if (!SIM.answered) {
        simSubmit("", SIM.confidence || "");
        if (typeof toast === "function") toast("Time — station closed.");
      }
      osceCompleteStation();
    }
  }, 1000);
}

function osceStopTimer() {
  if (OSCE.timerHandle) { clearInterval(OSCE.timerHandle); OSCE.timerHandle = null; }
}

/* Mark one station against the schedule. */
function osceMark(score, theCase) {
  var w = OSCE_CONFIG.weights;

  var gathering = score.stepsWithFindings
    ? Math.min(1, (score.stepsExamined - score.missedSteps.length) / score.stepsWithFindings)
    : 1;
  gathering = Math.max(0, gathering);

  var decisive = score.decisive.length
    ? score.decisiveFound.length / score.decisive.length
    : 1;

  var diagnosis = score.correct ? 1 : 0;

  /* Safety: only assessed when the case actually carries a red flag. When it
     does, the mark is whether the student uncovered the finding that raises
     it — missing a red flag is scored separately from missing the diagnosis. */
  var safety = 1, safetyApplies = false;
  if (theCase.urgent) {
    safetyApplies = true;
    safety = decisive >= 1 ? 1 : (decisive > 0 ? 0.5 : 0);
  }

  var total = w.gathering * gathering + w.decisive * decisive +
              w.diagnosis * diagnosis + w.safety * safety;

  return {
    station: theCase.condition,
    domain: theCase.domain || "Other",
    urgent: !!theCase.urgent,
    gathering: gathering,
    decisive: decisive,
    diagnosis: diagnosis,
    safety: safety,
    safetyApplies: safetyApplies,
    total: total,
    correct: score.correct,
    guess: score.guess,
    timedOut: score.timedOut,
    seconds: score.seconds
  };
}

/* Called after the student submits, or when the bell goes. */
function osceCompleteStation() {
  osceStopTimer();
  if (!OSCE.active || !SIM.score) return;
  OSCE.results.push(osceMark(SIM.score, SIM.theCase));
  /* Credit here rather than at submit, so a station closed by the bell counts
     toward an assignment exactly like one the student finished. */
  if (typeof assignCredit === "function") assignCredit(SIM.score, SIM.theCase, "osce");
  OSCE.index++;
  if (typeof osceShowStationBreak === "function") osceShowStationBreak();
}

function osceNextStation() {
  if (OSCE.index >= OSCE.stations.length) { osceFinish(); return; }
  osceRunStation();
}

function osceAbort() {
  osceStopTimer();
  OSCE.active = false;
  simEnd();
  if (typeof goHome === "function") goHome();
}

/* Whole-circuit summary, per domain of the marking schedule. */
function osceSummary() {
  var r = OSCE.results;
  if (!r.length) return null;
  var avg = function (key) {
    var n = 0, sum = 0;
    r.forEach(function (x) { if (typeof x[key] === "number") { sum += x[key]; n++; } });
    return n ? sum / n : 0;
  };
  var safetyStations = r.filter(function (x) { return x.safetyApplies; });
  return {
    stations: r.length,
    correct: r.filter(function (x) { return x.correct; }).length,
    timedOut: r.filter(function (x) { return x.timedOut; }).length,
    gathering: avg("gathering"),
    decisive: avg("decisive"),
    diagnosis: avg("diagnosis"),
    safety: safetyStations.length
      ? safetyStations.reduce(function (a, x) { return a + x.safety; }, 0) / safetyStations.length
      : null,
    safetyStations: safetyStations.length,
    total: avg("total"),
    passed: avg("total") >= OSCE_CONFIG.passMark,
    seconds: Math.round((Date.now() - OSCE.startedAt) / 1000),
    perStation: r.slice()
  };
}

function osceFinish() {
  osceStopTimer();
  OSCE.active = false;
  var sum = osceSummary();
  simEnd();
  if (typeof osceShowSummary === "function") osceShowSummary(sum);
  if (typeof logAudit === "function" && sum) {
    logAudit("osce_completed", sum.stations + " stations · " +
      Math.round(sum.total * 100) + "%", {});
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OSCE_CONFIG: OSCE_CONFIG, osceMark: osceMark };
}
