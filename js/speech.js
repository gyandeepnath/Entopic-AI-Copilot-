/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SPEECH ENGINE                                         */
/* Voice-to-text using Web Speech API (Chrome)                     */
/* Live transcription preview during recording                     */
/* AI parsing of spoken complaints into structured tokens          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* STATE                                                           */
/* ═══════════════════════════════════════════════════════════════ */

var _sttRecognizer = null;
var _sttActive = false;
var _sttRawBuffer = "";


/* ═══════════════════════════════════════════════════════════════ */
/* TOGGLE VOICE INPUT                                              */
/* Called by voice button onclick                                  */
/* ═══════════════════════════════════════════════════════════════ */

function togVoice(targetId) {

  /* If already recording, stop */
  if (_sttActive) {
    _sttActive = false;
    var rawText = _sttRawBuffer;

    if (_sttRecognizer) {
      try { _sttRecognizer.stop(); } catch (e) { /* ignore */ }
    }

    updateVoiceBtn(targetId, false);
    finishSpeechInput(targetId, rawText);
    return;
  }

  /* Check browser support */
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Speech Recognition requires Google Chrome.");
    return;
  }

  /* Request microphone permission first */
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        /* Permission granted — release the stream immediately */
        stream.getTracks().forEach(function(track) { track.stop(); });
        startSpeechRecognition(targetId);
      })
      .catch(function(err) {
        alert(
          "Microphone access denied.\n" +
          "Please allow microphone in browser settings.\n\n" +
          "Error: " + err.message
        );
      });
  } else {
    /* Fallback — try starting directly */
    startSpeechRecognition(targetId);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* START SPEECH RECOGNITION                                        */
/* ═══════════════════════════════════════════════════════════════ */

function startSpeechRecognition(targetId) {
  var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recognizer = new SpeechRecognition();

  recognizer.continuous = true;
  recognizer.interimResults = true;
  recognizer.lang = "en-US";

  var el = document.getElementById(targetId);
  _sttRawBuffer = "";

  /* ── On results ── */
  recognizer.onresult = function(event) {
    var interim = "";

    for (var i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        _sttRawBuffer += event.results[i][0].transcript + " ";
      } else {
        interim += event.results[i][0].transcript;
      }
    }

    /* Show live preview */
    if (el) {
      el.value = "[Recording] " + _sttRawBuffer + interim;
    }
  };

  /* ── On error ── */
  recognizer.onerror = function(event) {
    if (event.error !== "no-speech" && event.error !== "aborted") {
      console.error("Speech recognition error:", event.error);
      _sttActive = false;
      updateVoiceBtn(targetId, false);
      if (el && _sttRawBuffer) {
        el.value = _sttRawBuffer.trim();
      }
    }
  };

  /* ── On end (auto-restart if still active) ── */
  recognizer.onend = function() {
    if (_sttActive) {
      try {
        recognizer.start();
      } catch (e) {
        _sttActive = false;
        updateVoiceBtn(targetId, false);
        finishSpeechInput(targetId, _sttRawBuffer);
      }
    }
  };

  /* ── Start ── */
  try {
    recognizer.start();
    _sttRecognizer = recognizer;
    _sttActive = true;
    updateVoiceBtn(targetId, true);

    if (el) {
      el.value = "[Recording — speak now...]";
    }
  } catch (e) {
    alert("Could not start speech recognition: " + e.message);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* FINISH SPEECH INPUT                                             */
/* Called when recording stops. Routes to AI parsing or plain text */
/* ═══════════════════════════════════════════════════════════════ */

function finishSpeechInput(targetId, rawText) {
  var el = document.getElementById(targetId);
  rawText = (rawText || "").trim();

  /* Nothing recorded */
  if (!rawText) {
    if (el) el.value = "";
    return;
  }

  /* If API key available and this is the CC field, parse with AI */
  if (API_KEY && targetId === "ccTA" && rawText.length > 10) {
    if (el) el.value = "[Processing speech with AI...]";
    parseSpeechWithAI(rawText, el);
    return;
  }

  /* No API key — just put raw text */
  if (el) {
    el.value = rawText;
  }

  /* If it's the CC field, update visit data */
  if (targetId === "ccTA") {
    V.cc = rawText;
    if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
    if (typeof renderAdvisory === "function") renderAdvisory();
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* AI SPEECH PARSER                                                */
/* Sends raw speech text to Claude API for structured parsing      */
/* Extracts: chief complaint, symptoms, FOLDARS                   */
/* ═══════════════════════════════════════════════════════════════ */

function parseSpeechWithAI(rawText, targetEl) {

  /* Build list of valid symptom keys for the prompt */
  var validSymptoms = [];
  for (var cat in SYM_CATS) {
    for (var key in SYM_CATS[cat]) {
      validSymptoms.push(key);
    }
  }

  var prompt = 'You are an expert optometric clinical assistant. A patient described their complaint verbally. ' +
    'Analyze and structure their words into clinical data.\n\n' +
    'Patient said: "' + rawText.replace(/"/g, "'") + '"\n\n' +
    'Return ONLY valid JSON with no markdown, no backticks, no explanation:\n' +
    '{\n' +
    '  "chief_complaint": "Properly worded clinical chief complaint",\n' +
    /* the WHOLE list — the prompt used to show only the first 40 of ~150,
       so the model invented the rest */
    '  "symptoms": ["ONLY tokens from this list: ' + validSymptoms.join(",") + '"],\n' +
    '  "foldarq": {"F":"frequency","O":"onset","L":"location","D":"duration","A":"associated","R":"relieving","S":"severity"}\n' +
    '}\n\n' +
    'Rules:\n' +
    '- Only include symptoms clearly mentioned by the patient\n' +
    '- Use empty string for unmentioned FOLDARS fields\n' +
    '- chief_complaint should be in medical terminology';

  if (typeof callClaudeAPI === "function") {
    callClaudeAPI(
      "You are a clinical NLP parser for optometry. Return only valid JSON.",
      prompt,
      600,
      function(response) {
        handleSpeechParseResponse(response, rawText, targetEl);
      },
      function(error) {
        console.error("Speech parse error:", error);
        fallbackSpeechInput(rawText, targetEl);
      }
    );
  } else {
    fallbackSpeechInput(rawText, targetEl);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* HANDLE AI PARSE RESPONSE                                        */
/* ═══════════════════════════════════════════════════════════════ */

function handleSpeechParseResponse(responseText, rawText, targetEl) {
  try {
    var cleaned = String(responseText || "").replace(/```json/g, "").replace(/```/g, "").trim();
    var parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");

    /* The chief complaint is what the PATIENT said. The model's rewording
       into "medical terminology" used to REPLACE it — and the engine then
       parsed the model's wording, so language the patient never used could
       become evidence. The LLM stays downstream: its wording is kept as a
       suggestion the clinician can adopt with one click (V.cc_ai), and the
       engine reads the patient's own words. */
    V.cc = rawText;
    if (targetEl) targetEl.value = V.cc;
    V.cc_ai = (typeof parsed.chief_complaint === "string") ? parsed.chief_complaint.slice(0, 500) : "";

    /* Symptoms: ONLY tokens that are real symptom chips. Anything else the
       model returns — an invented token, a diagnosis, a red-flag token the
       patient never described — is dropped, not pushed into the visit. */
    var valid = {};
    for (var cat in SYM_CATS) {
      if (!Object.prototype.hasOwnProperty.call(SYM_CATS, cat)) continue;
      for (var key in SYM_CATS[cat]) {
        if (Object.prototype.hasOwnProperty.call(SYM_CATS[cat], key)) valid[key] = true;
      }
    }
    if (Array.isArray(parsed.symptoms)) {
      for (var i = 0; i < parsed.symptoms.length; i++) {
        var sym = parsed.symptoms[i];
        if (typeof sym !== "string" || !Object.prototype.hasOwnProperty.call(valid, sym)) continue;
        if (V.symptoms.indexOf(sym) === -1) V.symptoms.push(sym);
      }
    }

    /* FOLDARQ: the seven known letters only, as short strings. */
    if (parsed.foldarq && typeof parsed.foldarq === "object") {
      ["F", "O", "L", "D", "A", "R", "S"].forEach(function (k) {
        var v = parsed.foldarq[k];
        if (typeof v === "string" && v.trim()) V.foldarq[k] = v.slice(0, 200);
      });
    }

    /* Refresh everything */
    if (typeof renderMain === "function") renderMain();
    if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
    if (typeof renderAdvisory === "function") renderAdvisory();
    if (typeof renderSidebar === "function") renderSidebar();

  } catch (e) {
    console.error("Speech parse JSON error:", e);
    fallbackSpeechInput(rawText, targetEl);
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* FALLBACK — just use raw text                                    */
/* ═══════════════════════════════════════════════════════════════ */

function fallbackSpeechInput(rawText, targetEl) {
  if (targetEl) targetEl.value = rawText;
  V.cc = rawText;
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  if (typeof renderAdvisory === "function") renderAdvisory();
}


/* ═══════════════════════════════════════════════════════════════ */
/* UPDATE VOICE BUTTON STATE                                       */
/* ═══════════════════════════════════════════════════════════════ */

function updateVoiceBtn(targetId, isRecording) {
  var buttons = document.querySelectorAll(".vb");
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    if (btn.getAttribute("data-t") === targetId) {
      if (isRecording) {
        btn.classList.add("rec");
        btn.textContent = "⏹ Stop";
      } else {
        btn.classList.remove("rec");
        btn.textContent = "🎤 Voice";
      }
    } else {
      btn.classList.remove("rec");
      btn.textContent = "🎤 Voice";
    }
  }
}
