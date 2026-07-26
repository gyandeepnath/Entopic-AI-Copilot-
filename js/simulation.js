/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL SIMULATION                                    */
/*                                                                  */
/* The quiz asks "what is this?" from a finished vignette. A         */
/* simulation asks the harder, more useful question: "how would you  */
/* FIND OUT?" — the student works a virtual patient through the real */
/* 22-step interface, and each finding stays HIDDEN until they       */
/* actually perform that part of the examination.                    */
/*                                                                  */
/* Because the live engine reacts only to what has been revealed,    */
/* the student watches the differential narrow as they examine, and  */
/* learns the thing that is hardest to teach from a textbook: which  */
/* test to reach for next, and why.                                  */
/*                                                                  */
/* CASES ARE DERIVED FROM THE KNOWLEDGE BASE, never invented. A      */
/* case's ground truth is the condition's own req/sup tokens (present)*/
/* and con tokens (explicitly absent), so a simulation can never     */
/* contain a clinical claim the KB does not already make — and it    */
/* inherits the KB's NEEDS_CLINICAL_REVIEW status.                   */
/*                                                                  */
/* Teaching only. Simulated patients are never mixed with real       */
/* records: they are flagged `sim: true` and excluded from patient   */
/* lists, analytics and export in the same way practice records are. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var SIM_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Which exam step reveals a given token. Falls back through the engine's own
   next-test routing so the mapping stays consistent with the live "check
   next" suggestions the student sees. */
function simStepForToken(tok) {
  /* A measured finding belongs where the measurement is taken, and the
     presentation rule already knows: TBUT and Schirmer are slit-lamp tests, a
     van Herick grade comes from gonioscopy. Without this they inherited the
     next-test routing of the SYMPTOM they imply, which put "TBUT 6 s" under
     Chief Complaint and made dry-eye cases answerable from one screen. */
  if (typeof SIM_MEASURED !== "undefined" && SIM_MEASURED[tok] && SIM_MEASURED[tok].step) {
    return SIM_MEASURED[tok].step;
  }
  if (typeof NEXT_TEST_TOKEN_STEP !== "undefined" && NEXT_TEST_TOKEN_STEP[tok]) {
    return NEXT_TEST_TOKEN_STEP[tok];
  }
  /* Symptom chips are volunteered in the history. */
  if (typeof SYM_CATS !== "undefined") {
    for (var cat in SYM_CATS) if (SYM_CATS[cat][tok]) return "chief_complaint";
  }
  /* Slit-lamp / fundus findings are found by looking. */
  if (typeof FINDING_TOKEN_MAP !== "undefined") {
    for (var label in FINDING_TOKEN_MAP) {
      if (FINDING_TOKEN_MAP[label].indexOf(tok) >= 0) {
        if (typeof FUN_FINDINGS !== "undefined") {
          for (var sec in FUN_FINDINGS) {
            if (FUN_FINDINGS[sec].indexOf(label) >= 0) return "fundus";
          }
        }
        return "slit_lamp";
      }
    }
  }
  if (/iop|tonometry/.test(tok)) return "iop";
  if (/rapd|pupil|anisocoria/.test(tok)) return "pupil";
  if (/disc|macula|retina|vessel|drusen|haemorrhage|hemorrhage/.test(tok)) return "fundus";
  if (/va_|acuity|blur|vision/.test(tok)) return "va";
  if (/sph|cyl|axis|myopia|hyperopia|astigmat/.test(tok)) return "refraction";
  if (/diplopia|motility|nystagmus|squint|phoria|tropia/.test(tok)) return "motility";
  if (/colour|color|field|amsler/.test(tok)) return "neuro";
  return "chief_complaint";
}

/* Build a simulated case from a KB condition. */
function simBuildCase(condName, opts) {
  opts = opts || {};
  var c = (typeof findCondition === "function") ? findCondition(condName) : null;
  if (!c) return null;

  /* A case may only contain findings that can actually be put on a chart.
     `req` is kept whole regardless — those define the condition and dropping
     one would make the case unanswerable — but supporting findings and test
     results are filtered, because the KB's `tests` arrays mix real results
     (RNFL_thinning) with the NAME of a procedure (lid_position_exam,
     clinical_exam). Revealing a procedure name as a finding taught nothing and
     padded the case. */
  var canShow = (typeof simIsPresentable === "function")
    ? simIsPresentable
    : function () { return true; };

  var present = [];
  (c.req || []).forEach(function (t) { if (present.indexOf(t) < 0) present.push(t); });
  (c.sup || []).filter(canShow).slice(0, opts.supCount || 4)
    .forEach(function (t) { if (present.indexOf(t) < 0) present.push(t); });
  /* The condition's OBJECTIVE signs matter most for teaching: they are what
     spreads a case across the slit lamp, IOP, fundus and the rest, so the
     student has to actually work through the examination rather than read a
     symptom list and answer. */
  (c.tests || []).filter(canShow)
    .forEach(function (t) { if (present.indexOf(t) < 0) present.push(t); });

  /* Where two findings come off ONE measurement, keep only the broader one.
     A visual field with MD -9 dB satisfies both `visual_field_defect` and
     `field_defect`; presenting both wrote the field twice, in two different
     sections, with different numbers — the second silently invalidating what
     the student had already been shown. */
  if (typeof SIM_MEASURED !== "undefined") {
    var subsumed = {};
    present.forEach(function (t) {
      var r = SIM_MEASURED[t];
      if (r && r.subsumes) r.subsumes.forEach(function (s) { subsumed[s] = true; });
    });
    present = present.filter(function (t) {
      /* never drop a defining finding, even if something else implies it */
      return !subsumed[t] || (c.req || []).indexOf(t) >= 0;
    });
  }

  /* Group the ground truth by the step that would uncover it. */
  var byStep = {};
  present.forEach(function (t) {
    var st = simStepForToken(t);
    (byStep[st] = byStep[st] || []).push(t);
  });

  /* Age hint from the condition's own demographic token, so the vignette is
     internally consistent with the KB rather than invented. */
  /* ⚠ NEEDS_CLINICAL_REVIEW — the KB's `young_age` means "under 18" (the
     engine's own rule), and several conditions use it where "young adult"
     is arguably meant. Until the KB distinguishes the two, the simulator
     draws from the UPPER part of the band so a case does not present, say,
     optic neuritis in a five-year-old. This changes no clinical claim; it
     only picks which age inside the KB's own bracket to show. */
  var age = "";
  if (present.indexOf("young_age") >= 0) age = String(12 + Math.floor(Math.random() * 6));
  else if (present.indexOf("older_age") >= 0) age = String(62 + Math.floor(Math.random() * 20));
  else age = String(24 + Math.floor(Math.random() * 35));

  var info = (typeof resolveConditionInfo === "function" && typeof findCondition === "function")
    ? resolveConditionInfo(condName, findCondition, function (t) { return String(t).replace(/_/g, " "); })
    : null;

  return {
    id: "sim_" + condName.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_" + Date.now().toString(36),
    condition: condName,
    domain: c.domain || "",
    route: c.route || "",
    urgent: !!c.urgent,
    age: age,
    present: present,
    absent: (c.con || []).slice(0, 6),
    byStep: byStep,
    /* the finding(s) without which this condition cannot be reached */
    decisive: (c.req || []).slice(),
    teaching: (info && info.summary) ? info.summary : "",
    realism: "textbook",
    review_status: SIM_REVIEW_STATUS
  };
}

/* Build a case and make it behave like a patient rather than a textbook. */
function simBuildRealisticCase(condName, tierId, opts) {
  var c = simBuildCase(condName, opts);
  if (!c) return null;
  if (typeof simApplyRealism !== "function") return c;
  var mode = (opts && opts.realism) || simPickRealism(tierId || SIM.tier || "standard");
  return simApplyRealism(c, mode);
}

/* Answers this case will accept. Normally just the truth; a case where the
   patient genuinely has two problems accepts either, because marking a student
   wrong for spotting the second one teaches them not to look. */
function simAcceptableAnswers(theCase) {
  if (!theCase) return [];
  return (theCase.acceptable && theCase.acceptable.length)
    ? theCase.acceptable.slice()
    : [theCase.condition];
}

/* Pick a case at random, optionally scoped. */
function simRandomCase(scope) {
  var pool = (typeof KNOWLEDGE_ALL !== "undefined") ? KNOWLEDGE_ALL.slice() : [];
  if (scope === "common" && typeof KB_COMMON_SET !== "undefined") {
    pool = pool.filter(function (c) { return KB_COMMON_SET[c.name]; });
  }
  if (scope === "urgent") pool = pool.filter(function (c) { return c.urgent; });
  /* only conditions whose required findings can actually be uncovered */
  pool = pool.filter(function (c) { return (c.req || []).length > 0; });
  if (!pool.length) return null;
  return simBuildRealisticCase(pool[Math.floor(Math.random() * pool.length)].name, SIM.tier);
}


/* ── Session state ──────────────────────────────────────────────── */

var SIM = {
  active: false,
  theCase: null,
  tier: "standard",     /* guided | standard | challenge | osce */
  revealed: {},         /* step id -> true */
  started: null,
  deadline: null,       /* epoch ms, OSCE only */
  answered: false,
  guess: "",
  confidence: "",       /* Low | Moderate | High — drives calibration feedback */
  score: null,
  osce: null            /* set when running inside an OSCE circuit */
};

/* Should the advisory/engine panel be visible right now?
   Hiding it at the higher tiers is the whole pedagogic point: the student
   commits unaided, then compares against the engine in the debrief. */
function simEngineHidden() {
  return !!(SIM.active && !SIM.answered && !simTier(SIM.tier).engine);
}

function simStart(theCase, tierId, opts) {
  if (!theCase) { if (typeof toast === "function") toast("No case available."); return; }
  opts = opts || {};
  SIM.active = true;
  SIM.theCase = theCase;
  SIM.tier = tierId || SIM.tier || "standard";
  SIM.revealed = {};
  SIM.started = Date.now();
  SIM.deadline = opts.limitSeconds ? (Date.now() + opts.limitSeconds * 1000) : null;
  SIM.answered = false;
  SIM.guess = "";
  SIM.confidence = "";
  SIM.score = null;
  SIM.osce = opts.osce || null;

  /* A fresh simulated patient — flagged so it never mixes with real records. */
  if (typeof newPatient === "function") newPatient();
  P.first_name = "Simulated";
  P.last_name = "Patient";
  P.age = theCase.age;
  P.sim = true;
  P.practice = true;   /* reuse the existing exclusion from real patient lists */

  V.sim = { case_id: theCase.id, condition: theCase.condition };
  if (typeof nav === "function") nav("chief_complaint");
  if (typeof toast === "function") toast("Simulation started — examine the patient to uncover findings.");
}

function simEnd() {
  SIM.active = false;
  SIM.theCase = null;
  SIM.revealed = {};
  SIM.answered = false;
  SIM.deadline = null;
  SIM.osce = null;
  /* Repaint, or the exam view keeps showing the simulation banner and the
     "copilot off" panel behind the debrief after the session has ended. */
  if (typeof renderMain === "function") renderMain();
  if (typeof renderAdvisory === "function") renderAdvisory();
  if (typeof renderSidebar === "function") renderSidebar();
}

/* Has this step been examined yet? */
function simRevealed(step) { return !!SIM.revealed[step]; }

/* Perform the examination for the current step: reveal whatever this case
   would show there, feed it into the visit, and let the engine react. */
function simExamine(step) {
  if (!SIM.active || !SIM.theCase) return;
  step = step || V.step;
  if (SIM.revealed[step]) return;
  SIM.revealed[step] = true;

  /* Write what this patient would actually present with onto the chart —
     a number, a recorded sign, or a volunteered symptom — and let the ENGINE
     derive the tokens from it, exactly as in a live exam. The student reads
     "IOP 41 / 16 mmHg" and decides for themselves that it is high; handing
     over the token `high_iop` would be handing over the conclusion.
     Anything with no faithful presentation route falls back to the token, so
     a case is never silently incomplete. */
  var toks = (SIM.theCase.byStep[step] || []).slice();
  /* Apply the broader measurement first where one subsumes another — a C:D of
     0.78 / 0.51 satisfies both `cd_asymmetry` and `increased_cd`, and writing
     the narrower rule second would overwrite the numbers the student was just
     shown. Ordering here means the second token simply finds itself already on
     the chart and records nothing. */
  toks.sort(function (a, b) {
    var sa = (typeof SIM_MEASURED !== "undefined" && SIM_MEASURED[a] && SIM_MEASURED[a].subsumes) ? 0 : 1;
    var sb = (typeof SIM_MEASURED !== "undefined" && SIM_MEASURED[b] && SIM_MEASURED[b].subsumes) ? 0 : 1;
    return sa - sb;
  });
  var recorded = [];
  toks.forEach(function (t) {
    var desc = (typeof simPresentToken === "function") ? simPresentToken(t, step) : null;
    /* "" means the chart already carries this finding — nothing new to show. */
    if (desc === "") return;
    if (desc) { if (recorded.indexOf(desc) < 0) recorded.push(desc); return; }
    if (!V.symptoms) V.symptoms = [];
    if (V.symptoms.indexOf(t) < 0) V.symptoms.push(t);
    recorded.push(String(t).replace(/_/g, " "));
  });
  SIM.recorded = SIM.recorded || {};
  SIM.recorded[step] = recorded;

  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  if (typeof renderMain === "function") renderMain();
  if (typeof renderAdvisory === "function") renderAdvisory();
  if (typeof renderSidebar === "function") renderSidebar();

  if (typeof toast === "function") {
    toast(recorded.length ? recorded.slice(0, 2).join(" · ") : "Nothing abnormal found here.");
  }
}

/* Which steps hold findings the student has not uncovered yet. */
function simMissedSteps() {
  if (!SIM.theCase) return [];
  var out = [];
  for (var st in SIM.theCase.byStep) {
    if (!SIM.revealed[st] && SIM.theCase.byStep[st].length) out.push(st);
  }
  return out;
}

/* Score the attempt. Deliberately simple and explainable — it reports what
   happened, it does not grade clinical judgement. */
function simSubmit(guess, confidence) {
  if (!SIM.active || !SIM.theCase) return null;
  SIM.guess = guess || "";
  SIM.confidence = confidence || SIM.confidence || "";
  SIM.answered = true;

  var truth = SIM.theCase.condition;
  var accepted = simAcceptableAnswers(SIM.theCase);
  var correct = accepted.indexOf(SIM.guess) >= 0;

  var examined = Object.keys(SIM.revealed).length;
  var withFindings = Object.keys(SIM.theCase.byStep).length;
  var missed = simMissedSteps();

  /* Did they uncover the findings the condition actually requires?
     The engine derives tokens from the chart now, so read them from the
     engine's own view rather than from the symptom list. */
  var found = (V.symptoms || []).slice();
  if (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE && ENGINE_STATE.tokens) {
    ENGINE_STATE.tokens.forEach(function (t) { if (found.indexOf(t) < 0) found.push(t); });
  }
  var decisiveFound = SIM.theCase.decisive.filter(function (t) { return found.indexOf(t) >= 0; });

  /* EVIDENCE AT COMMIT — replaces the old "efficiency" score.
     Efficiency measured productive sections against sections opened, which
     gave a complete systematic examination 16% and knowing-where-to-look
     100%. That rewards going straight to the answer and penalises ruling
     things out — it scored anchoring and premature closure, the two commonest
     serious diagnostic errors, as skill.
     What is actually worth measuring is whether the student HAD the evidence
     when they committed. Thoroughness is reported as a plain fact, not a
     score, because examining a section that turns out to be normal is a
     negative finding, not waste. */
  var evidence = SIM.theCase.decisive.length
    ? (decisiveFound.length / SIM.theCase.decisive.length)
    : 1;
  /* Right answer, incomplete evidence: a lucky guess, and worth naming. */
  var prematureClosure = correct && evidence < 1;

  /* CALIBRATION — knowing how sure you are is a clinical skill in itself. */
  var calibration = "";
  if (SIM.confidence) {
    if (correct && SIM.confidence === "High") calibration = "well-calibrated";
    else if (correct && SIM.confidence === "Low") calibration = "under-confident";
    else if (!correct && SIM.confidence === "High") calibration = "over-confident";
    else if (!correct && SIM.confidence === "Low") calibration = "well-calibrated";
    else calibration = "reasonable";
  }

  SIM.score = {
    correct: correct,
    truth: truth,
    accepted: accepted,
    realism: SIM.theCase.realism || "textbook",
    comorbid: SIM.theCase.comorbid || "",
    misledBy: SIM.theCase.misledBy || "",
    misleadingFindings: SIM.theCase.misleadingFindings || [],
    discriminators: SIM.theCase.discriminators || [],
    guess: SIM.guess,
    tier: SIM.tier,
    confidence: SIM.confidence,
    calibration: calibration,
    evidence: evidence,
    prematureClosure: prematureClosure,
    stepsExamined: examined,
    stepsWithFindings: withFindings,
    missedSteps: missed,
    decisive: SIM.theCase.decisive,
    decisiveFound: decisiveFound,
    decisiveMissed: SIM.theCase.decisive.filter(function (t) { return found.indexOf(t) < 0; }),
    seconds: Math.round((Date.now() - SIM.started) / 1000),
    timedOut: !!(SIM.deadline && Date.now() > SIM.deadline),
    /* engine's own view at the moment of the answer, for the debrief */
    engineTop: (V.dxList || []).slice(0, 5).map(function (d) { return { n: d.n, s: d.score }; })
  };

  /* Learning telemetry (local, per user, never clinical data). */
  if (typeof simRecordAttempt === "function") {
    var rec = simRecordAttempt(SIM.score, SIM.theCase, SIM.tier);
    SIM.score.xpGained = rec.xpGained;
    SIM.score.progress = simProgressSummary();
  }
  return SIM.score;
}

/* Seconds left in a timed station, or null. */
function simSecondsLeft() {
  if (!SIM.deadline) return null;
  return Math.max(0, Math.round((SIM.deadline - Date.now()) / 1000));
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    simBuildCase: simBuildCase, simStepForToken: simStepForToken,
    simRandomCase: simRandomCase
  };
}
