/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SMART INTAKE                                          */
/*                                                                  */
/* Pre-visit questionnaire system:                                 */
/*   - Plain-language symptom questions                            */
/*   - Auto-population of CC, FOLDARS, symptom tokens              */
/*   - OSDI dry eye questionnaire with scoring                     */
/*   - SPEED dry eye questionnaire                                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* OSDI — OCULAR SURFACE DISEASE INDEX                             */
/* 12 questions, 5-point scale (0-4)                               */
/* Score: 0-12 normal, 13-22 mild, 23-32 moderate, 33-100 severe  */
/* ═══════════════════════════════════════════════════════════════ */

var OSDI_QUESTIONS = [
  /* Section A: Ocular symptoms (past week) */
  {
    section: "Ocular Symptoms (past week)",
    questions: [
      { id: "osdi_1",  text: "Eyes that are sensitive to light?" },
      { id: "osdi_2",  text: "Eyes that feel gritty?" },
      { id: "osdi_3",  text: "Painful or sore eyes?" },
      { id: "osdi_4",  text: "Blurred vision?" },
      { id: "osdi_5",  text: "Poor vision?" }
    ]
  },
  /* Section B: Vision-related function */
  {
    section: "Vision-Related Function",
    questions: [
      { id: "osdi_6",  text: "Problems reading?" },
      { id: "osdi_7",  text: "Problems driving at night?" },
      { id: "osdi_8",  text: "Problems working with a computer or bank machine?" },
      { id: "osdi_9",  text: "Problems watching TV?" }
    ]
  },
  /* Section C: Environmental triggers */
  {
    section: "Environmental Triggers",
    questions: [
      { id: "osdi_10", text: "Eyes uncomfortable in windy conditions?" },
      { id: "osdi_11", text: "Eyes uncomfortable in places with low humidity?" },
      { id: "osdi_12", text: "Eyes uncomfortable in air-conditioned areas?" }
    ]
  }
];

var OSDI_SCALE = [
  { value: 0, label: "None of the time" },
  { value: 1, label: "Some of the time" },
  { value: 2, label: "Half of the time" },
  { value: 3, label: "Most of the time" },
  { value: 4, label: "All of the time" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* SPEED — STANDARD PATIENT EVALUATION OF EYE DRYNESS             */
/* 8 questions about symptoms + frequency                          */
/* ═══════════════════════════════════════════════════════════════ */

var SPEED_QUESTIONS = [
  { id: "speed_1", text: "Dryness, Grittiness, or Scratchiness" },
  { id: "speed_2", text: "Soreness or Irritation" },
  { id: "speed_3", text: "Burning or Watering" },
  { id: "speed_4", text: "Eye Fatigue" }
];

var SPEED_FREQUENCY = [
  { value: 0, label: "Never" },
  { value: 1, label: "Sometimes" },
  { value: 2, label: "Often" },
  { value: 3, label: "Constant" }
];

var SPEED_SEVERITY = [
  { value: 0, label: "No problem" },
  { value: 1, label: "Tolerable" },
  { value: 2, label: "Uncomfortable" },
  { value: 3, label: "Bothersome" },
  { value: 4, label: "Intolerable" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER OSDI QUESTIONNAIRE                                       */
/* Returns HTML for the OSDI form                                  */
/* ═══════════════════════════════════════════════════════════════ */

function renderOSDI() {
  /* Initialize OSDI scores if needed */
  if (!V.osdi) V.osdi = { scores: [], total: null, severity: "" };
  if (!V.osdi.scores || V.osdi.scores.length === 0) {
    V.osdi.scores = [];
    for (var init = 0; init < 12; init++) {
      V.osdi.scores.push(null);
    }
  }

  var h = '<div class="card">';
  h += '<div class="card-t">OSDI Questionnaire</div>';
  h += '<div class="card-s">Ocular Surface Disease Index — dry eye severity assessment</div>';

  var qIndex = 0;

  for (var si = 0; si < OSDI_QUESTIONS.length; si++) {
    var section = OSDI_QUESTIONS[si];

    h += '<div class="dv"><span>' + section.section + '</span></div>';

    for (var qi = 0; qi < section.questions.length; qi++) {
      var q = section.questions[qi];
      var currentVal = V.osdi.scores[qIndex];

      h += '<div class="quest-q">';
      h += '<div class="quest-text">' + (qIndex + 1) + '. ' + q.text + '</div>';
      h += '<div class="quest-opts">';

      for (var oi = 0; oi < OSDI_SCALE.length; oi++) {
        var opt = OSDI_SCALE[oi];
        var isSel = currentVal === opt.value;
        h += '<span class="quest-opt' + (isSel ? " sel" : "") + '" ';
        h += 'onclick="setOSDIScore(' + qIndex + ',' + opt.value + ')">';
        h += opt.value;
        h += '</span>';
      }

      h += '</div>';
      h += '<div style="font-size:.5rem;color:var(--sv);margin-top:2px">';
      for (var li = 0; li < OSDI_SCALE.length; li++) {
        if (li > 0) h += ' · ';
        h += OSDI_SCALE[li].value + '=' + OSDI_SCALE[li].label;
      }
      h += '</div>';
      h += '</div>';

      qIndex++;
    }
  }

  /* Score display */
  var osdiResult = calculateOSDI();
  h += '<div class="quest-score">';
  if (osdiResult.complete) {
    h += 'OSDI Score: <b>' + osdiResult.score.toFixed(1) + ' / 100</b>';
    h += '<br>Severity: <b>' + osdiResult.severity + '</b>';
  } else {
    h += 'Answer all 12 questions to calculate OSDI score';
    if (osdiResult.answered > 0) {
      h += '<br><span style="font-size:.62rem;color:var(--sv)">' + osdiResult.answered + '/12 answered</span>';
    }
  }
  h += '</div>';

  h += '</div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* SET OSDI SCORE                                                  */
/* ═══════════════════════════════════════════════════════════════ */

function setOSDIScore(index, value) {
  if (!V.osdi) V.osdi = { scores: [], total: null, severity: "" };
  if (!V.osdi.scores) {
    V.osdi.scores = [];
    for (var i = 0; i < 12; i++) V.osdi.scores.push(null);
  }

  /* Toggle — click same value to deselect */
  if (V.osdi.scores[index] === value) {
    V.osdi.scores[index] = null;
  } else {
    V.osdi.scores[index] = value;
  }

  /* Recalculate */
  var result = calculateOSDI();
  V.osdi.total = result.score;
  V.osdi.severity = result.severity;

  /* Inject tokens based on OSDI score */
  if (result.complete && result.score > 12) {
    /* Add dryness token if not already present */
    if (V.symptoms.indexOf("dryness") === -1) {
      /* Don't auto-add — let the clinician decide */
    }
  }

  renderMain();
}


/* ═══════════════════════════════════════════════════════════════ */
/* CALCULATE OSDI SCORE                                            */
/* Formula: (sum of scores × 25) / number of questions answered   */
/* ═══════════════════════════════════════════════════════════════ */

function calculateOSDI() {
  if (!V.osdi || !V.osdi.scores) {
    return { complete: false, score: 0, severity: "", answered: 0 };
  }

  var sum = 0;
  var answered = 0;

  for (var i = 0; i < V.osdi.scores.length; i++) {
    if (V.osdi.scores[i] !== null && V.osdi.scores[i] !== undefined) {
      sum += V.osdi.scores[i];
      answered++;
    }
  }

  if (answered === 0) {
    return { complete: false, score: 0, severity: "", answered: 0 };
  }

  /* OSDI formula */
  var score = (sum * 25) / answered;
  score = Math.round(score * 10) / 10;

  var severity = "";
  if (score <= 12) severity = "Normal";
  else if (score <= 22) severity = "Mild Dry Eye";
  else if (score <= 32) severity = "Moderate Dry Eye";
  else severity = "Severe Dry Eye";

  return {
    complete: answered === 12,
    score: score,
    severity: severity,
    answered: answered
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* SMART INTAKE QUESTIONS                                          */
/* Plain-language questions that map to symptom tokens              */
/* ═══════════════════════════════════════════════════════════════ */

var INTAKE_QUESTIONS = [
  {
    text: "Is your main concern about your distance vision or near vision?",
    options: [
      { label: "Distance",  tokens: ["distance_blur"] },
      { label: "Near",      tokens: ["near_blur", "difficulty_reading"] },
      { label: "Both",      tokens: ["distance_blur", "near_blur"] },
      { label: "Neither",   tokens: [] }
    ]
  },
  {
    text: "Do your eyes feel dry, gritty, or irritated?",
    options: [
      { label: "Yes, often",    tokens: ["dryness", "grittiness", "chronic_irritation"] },
      { label: "Sometimes",     tokens: ["dryness"] },
      { label: "No",            tokens: [] }
    ]
  },
  {
    text: "Do you experience any eye pain?",
    options: [
      { label: "Sharp pain",    tokens: ["pain_acute"] },
      { label: "Dull ache",     tokens: ["pain"] },
      { label: "Strain / tired", tokens: ["asthenopia", "eye_strain"] },
      { label: "No pain",       tokens: [] }
    ]
  },
  {
    text: "Do you see any floaters, flashes of light, or shadows?",
    options: [
      { label: "Floaters",      tokens: ["floaters"] },
      { label: "Flashes",       tokens: ["flashes"] },
      { label: "Shadow/curtain", tokens: ["curtain_vision", "field_loss"] },
      { label: "None",          tokens: [] }
    ]
  },
  {
    text: "Is your vision worse at a particular time of day?",
    options: [
      { label: "Morning",       tokens: ["morning_blur"] },
      { label: "Evening",       tokens: ["worse_evening"] },
      { label: "After screens", tokens: ["screen_use_exacerbation"] },
      { label: "Constant",      tokens: [] }
    ]
  },
  {
    text: "Do you experience double vision?",
    options: [
      { label: "At near",       tokens: ["double_vision_near"] },
      { label: "At distance",   tokens: ["distance_diplopia"] },
      { label: "Both",          tokens: ["diplopia"] },
      { label: "No",            tokens: [] }
    ]
  },
  {
    text: "Is there any redness, discharge, or itching?",
    options: [
      { label: "Redness",       tokens: ["redness"] },
      { label: "Discharge",     tokens: ["purulent_discharge"] },
      { label: "Itching",       tokens: ["itching_dominant"] },
      { label: "None",          tokens: [] }
    ]
  },
  {
    text: "When did the problem start?",
    options: [
      { label: "Hours ago",     tokens: ["acute"] },
      { label: "Days ago",      tokens: ["acute"] },
      { label: "Weeks ago",     tokens: ["subacute"] },
      { label: "Months/years",  tokens: ["chronic"] }
    ]
  }
];


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER SMART INTAKE                                             */
/* Shows plain-language questions with clickable answers            */
/* ═══════════════════════════════════════════════════════════════ */

function renderSmartIntake() {
  var h = '<div class="card">';
  h += '<div class="card-t">Quick Intake</div>';
  h += '<div class="card-s">Answer these questions to pre-populate your chief complaint</div>';

  for (var qi = 0; qi < INTAKE_QUESTIONS.length; qi++) {
    var q = INTAKE_QUESTIONS[qi];

    h += '<div class="quest-q">';
    h += '<div class="quest-text">' + q.text + '</div>';
    h += '<div class="quest-opts">';

    for (var oi = 0; oi < q.options.length; oi++) {
      var opt = q.options[oi];
      /* Check if all tokens from this option are already selected */
      var allSelected = opt.tokens.length > 0;
      for (var ti = 0; ti < opt.tokens.length; ti++) {
        if (V.symptoms.indexOf(opt.tokens[ti]) === -1) {
          allSelected = false;
          break;
        }
      }

      h += '<span class="quest-opt' + (allSelected && opt.tokens.length > 0 ? " sel" : "") + '" ';
      h += 'onclick="applyIntakeAnswer(' + qi + ',' + oi + ')">';
      h += opt.label;
      h += '</span>';
    }

    h += '</div></div>';
  }

  h += '</div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* APPLY INTAKE ANSWER                                             */
/* Adds the tokens from the selected option to symptoms            */
/* ═══════════════════════════════════════════════════════════════ */

function applyIntakeAnswer(questionIndex, optionIndex) {
  var q = INTAKE_QUESTIONS[questionIndex];
  var opt = q.options[optionIndex];

  if (!opt.tokens || opt.tokens.length === 0) return;

  /* Toggle: if all tokens already present, remove them */
  var allPresent = true;
  for (var i = 0; i < opt.tokens.length; i++) {
    if (V.symptoms.indexOf(opt.tokens[i]) === -1) {
      allPresent = false;
      break;
    }
  }

  if (allPresent) {
    /* Remove tokens */
    for (var r = 0; r < opt.tokens.length; r++) {
      var ri = V.symptoms.indexOf(opt.tokens[r]);
      if (ri >= 0) V.symptoms.splice(ri, 1);
    }
  } else {
    /* Add tokens */
    for (var a = 0; a < opt.tokens.length; a++) {
      if (V.symptoms.indexOf(opt.tokens[a]) === -1) {
        V.symptoms.push(opt.tokens[a]);
      }
    }
  }

  /* Re-run engine */
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  if (typeof renderAdvisory === "function") renderAdvisory();
  if (typeof renderSidebar === "function") renderSidebar();
}
