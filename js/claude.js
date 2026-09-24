/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLAUDE API WRAPPER                                    */
/*                                                                  */
/* CRITICAL DESIGN RULE:                                           */
/* Claude API is used ONLY for:                                    */
/*   1. Interpretive clinical remarks (downstream of engine)       */
/*   2. Speech-to-clinical-data parsing                            */
/*                                                                  */
/* Claude API is NEVER used for:                                   */
/*   - Diagnosis (engine handles this via knowledge base)          */
/*   - Scoring conditions                                         */
/*   - Generating differentials                                    */
/*                                                                  */
/* The diagnostic engine works fully offline without the API.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* CORE API CALL                                                   */
/* Generic wrapper for all Claude API requests                     */
/* ═══════════════════════════════════════════════════════════════ */

/* Preferred transport: a server proxy that holds the key (DD finding H-3).
   When a proxy URL is configured, calls go through it and NO key is present in
   the browser. See server/llm-proxy.example.js for a drop-in Cloudflare Worker
   / Vercel function. Direct-from-browser mode is a fallback only. */
function llmProxyUrl() {
  try { return (typeof localStorage !== "undefined" && localStorage.getItem("entopic_llm_proxy")) || ""; }
  catch (e) { return ""; }
}
function llmModel() {
  try { return (typeof localStorage !== "undefined" && localStorage.getItem("entopic_llm_model")) || "claude-sonnet-5"; }
  catch (e) { return "claude-sonnet-5"; }
}

var _llmDirectWarned = false;

/* ── DE-IDENTIFICATION BEFORE ANYTHING LEAVES ──
   buildClinicalSummary() already leaves the structured identifiers out
   (name, MRN, DOB, contact). But free text goes too — the chief complaint,
   and the speech parser sends what the patient SAID, verbatim — and a
   patient who says "my name is Priya, call me on 98765 43210" put both into
   an LLM API request. CLAUDE.md: no PII to any third-party service without
   de-identification. Every outbound prompt passes through here:
     - the open patient's own name, MRN, phone, email and address;
     - anything shaped like an email address, a phone number (9+ digits,
       no decimal point — a refraction like -3.00/-1.25 x 90 is untouched),
       or a full date (a date of birth).
   Not a guarantee — free text cannot be fully de-identified by pattern —
   but it removes the identifiers that are knowable or recognisable. */
function llmScrubPII(text) {
  var t = String(text === null || text === undefined ? "" : text);
  var pt = (typeof P !== "undefined" && P && typeof P === "object") ? P : {};
  function esc(x) { return String(x).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function drop(val, tag) {
    var v = String(val === null || val === undefined ? "" : val).trim();
    if (v.length < 2) return;
    t = t.replace(new RegExp("(^|[^A-Za-z0-9])" + esc(v) + "(?=$|[^A-Za-z0-9])", "gi"), "$1" + tag);
  }
  t = t.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]");
  t = t.replace(/\+?\(?\d[\d\s()\-]{7,}\d/g, function (m) {
    return (m.replace(/\D/g, "").length >= 9) ? "[phone]" : m;
  });
  t = t.replace(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}[\/.-]\d{1,2}[\/.-](19|20)\d{2}\b/g, "[date]");
  /* the patient's own identifiers, after the generic shapes */
  var full = ((pt.first_name || "") + " " + (pt.last_name || "")).trim();
  if (full.indexOf(" ") > 0) drop(full, "[patient]");
  drop(pt.first_name, "[patient]"); drop(pt.last_name, "[patient]");
  drop(pt.mrn, "[id]"); drop(pt.email, "[email]"); drop(pt.address, "[address]");
  if (pt.phone) drop(pt.phone, "[phone]");
  return t;
}

function callClaudeAPI(systemPrompt, userPrompt, maxTokens, onSuccess, onError) {

  /* The single choke point: nothing reaches the API un-scrubbed. */
  userPrompt = llmScrubPII(userPrompt);

  var proxy = llmProxyUrl();

  var body = {
    model: llmModel(),
    max_tokens: maxTokens || 800,
    system: systemPrompt,
    messages: [
      { role: "user", content: userPrompt }
    ]
  };

  var url, headers;
  if (proxy) {
    /* Key-free path: the proxy injects the key server-side. */
    url = proxy;
    headers = { "Content-Type": "application/json" };
  } else {
    /* Fallback: direct from the browser. This EXPOSES the key to anyone using
       the app — acceptable only for a single-operator local install, never for
       a multi-user or hosted deployment. Warned once, loudly. */
    if (!API_KEY) { if (onError) onError("No API key or proxy configured"); return; }
    if (!_llmDirectWarned) {
      _llmDirectWarned = true;
      console.warn("Entopic: calling Claude directly from the browser — the API key is exposed to this page. " +
        "Configure a server proxy (entopic_llm_proxy) before any multi-user or hosted deployment. See server/llm-proxy.example.js.");
    }
    url = "https://api.anthropic.com/v1/messages";
    headers = {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    };
  }

  fetch(url, { method: "POST", headers: headers, body: JSON.stringify(body) })
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    /* Check for API errors */
    if (data.error) {
      console.error("Claude API error:", data.error);
      if (onError) onError(data.error.message || "API error");
      return;
    }

    /* Extract text from response */
    var text = "";
    if (data.content && data.content.length > 0) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === "text") {
          text += data.content[i].text;
        }
      }
    }

    if (onSuccess) onSuccess(text);
  })
  .catch(function(err) {
    console.error("Claude API fetch error:", err);
    if (onError) onError(err.message || "Network error");
  });
}


/* ═══════════════════════════════════════════════════════════════ */
/* INTERPRETIVE REMARKS                                            */
/* Takes the engine's differential and produces clinical language   */
/* explaining the reasoning and suggesting management approaches   */
/* ═══════════════════════════════════════════════════════════════ */

var _interpretTimer = null;

function requestInterpretiveRemarks() {

  /* Guard: need API key and diagnosis results */
  if (!API_KEY) return;
  if (!V.dxList || V.dxList.length === 0) return;

  /* Debounce — wait 2 seconds after last change */
  if (_interpretTimer) clearTimeout(_interpretTimer);
  _interpretTimer = setTimeout(doInterpretiveRequest, 2000);
}

function doInterpretiveRequest() {

  /* Build clinical summary */
  var summary = buildClinicalSummary();
  if (!summary || summary.length < 20) return;

  /* Build differential summary */
  var dxSummary = "";
  for (var i = 0; i < Math.min(V.dxList.length, 5); i++) {
    var d = V.dxList[i];
    dxSummary += (i + 1) + ". " + d.n + " (" + (d.prob * 100).toFixed(0) + "%)";
    if (d.evidence && d.evidence.matched) {
      dxSummary += " — matched: " + d.evidence.matched.join(", ");
    }
    dxSummary += "\n";
  }

  var systemPrompt = "You are an expert ophthalmic clinical advisor. " +
    "The diagnostic engine has already produced a differential diagnosis. " +
    "Your role is to provide interpretive clinical remarks — NOT to diagnose. " +
    "Explain the reasoning, suggest management considerations, and note anything " +
    "the clinician should be aware of. Keep it concise (3-5 sentences). " +
    "Do not repeat the diagnosis list — focus on clinical insight.";

  var userPrompt = "Patient Data:\n" + summary + "\n\n" +
    "Engine Differential:\n" + dxSummary + "\n\n" +
    "Provide brief interpretive clinical remarks.";

  /* Show loading in advisory */
  var advEl = document.getElementById("advEl");
  if (advEl) {
    var existingLoading = document.getElementById("aiRemarkLoading");
    if (existingLoading) existingLoading.remove();

    var loadDiv = document.createElement("div");
    loadDiv.id = "aiRemarkLoading";
    loadDiv.style.cssText = "padding:8px;text-align:center;font-size:.6rem;color:var(--md);font-style:italic;border:1px dashed var(--ms);border-radius:var(--r);margin-top:8px";
    loadDiv.textContent = "Generating clinical remarks...";
    advEl.appendChild(loadDiv);
  }

  callClaudeAPI(
    systemPrompt,
    userPrompt,
    400,
    function(text) {
      /* Remove loading */
      var ld = document.getElementById("aiRemarkLoading");
      if (ld) ld.remove();

      /* Display remarks */
      displayInterpretiveRemarks(text);
    },
    function(error) {
      /* Remove loading */
      var ld = document.getElementById("aiRemarkLoading");
      if (ld) ld.remove();

      console.error("Interpretive remarks error:", error);
    }
  );
}


/* ═══════════════════════════════════════════════════════════════ */
/* DISPLAY INTERPRETIVE REMARKS                                    */
/* ═══════════════════════════════════════════════════════════════ */

function displayInterpretiveRemarks(text) {
  if (!text) return;

  var advEl = document.getElementById("advEl");
  if (!advEl) return;

  /* Remove any existing remarks */
  var existing = document.getElementById("aiRemarks");
  if (existing) existing.remove();

  /* Create remarks section */
  var remarksDiv = document.createElement("div");
  remarksDiv.id = "aiRemarks";
  remarksDiv.style.cssText = "margin-top:8px;padding:8px;border:1px solid var(--fg);border-radius:var(--r);background:var(--wh)";

  remarksDiv.innerHTML =
    '<div style="font-size:.48rem;font-weight:600;letter-spacing:.7px;text-transform:uppercase;color:var(--md);margin-bottom:4px">AI Clinical Remarks</div>' +
    '<div style="font-size:.62rem;line-height:1.5;color:var(--ink)">' + escH(text) + '</div>' +
    '<div style="font-size:.46rem;color:var(--sv);margin-top:4px;font-style:italic">Advisory only — not a diagnosis. Clinical correlation required.</div>';

  advEl.appendChild(remarksDiv);
}


/* ═══════════════════════════════════════════════════════════════ */
/* BUILD CLINICAL SUMMARY                                          */
/* Assembles patient + visit data into a text summary for the API */
/* ═══════════════════════════════════════════════════════════════ */

function buildClinicalSummary() {
  var s = "";

  /* Patient — de-identified. PII (name/MRN/DOB/contact) must NEVER be sent
     to the LLM API; age + sex are the only demographics with clinical value
     for interpretive remarks. */
  s += "Patient: Age " + (P.age || "?") + ", Sex " + (P.sex || "?") + "\n";

  /* CC */
  if (V.cc) s += "CC: " + V.cc + "\n";

  /* Symptoms */
  if (V.symptoms && V.symptoms.length > 0) {
    var symLabels = [];
    for (var i = 0; i < V.symptoms.length; i++) {
      /* Find display label */
      var found = false;
      for (var cat in SYM_CATS) {
        if (SYM_CATS[cat][V.symptoms[i]]) {
          symLabels.push(SYM_CATS[cat][V.symptoms[i]]);
          found = true;
          break;
        }
      }
      if (!found) symLabels.push(V.symptoms[i]);
    }
    s += "Symptoms: " + symLabels.join(", ") + "\n";
  }

  /* Temporal */
  if (V.temporal && V.temporal.onset) {
    s += "Pattern: " + V.temporal.onset;
    if (V.temporal.duration) s += ", " + V.temporal.duration;
    if (V.temporal.course) s += ", " + V.temporal.course;
    s += "\n";
  }

  /* Medical history */
  var medFlags = [];
  if (V.hxM.dm) medFlags.push("DM");
  if (V.hxM.htn) medFlags.push("HTN");
  if (V.hxM.autoimmune) medFlags.push("Autoimmune");
  if (V.hxM.thyroid) medFlags.push("Thyroid");
  if (V.hxM.conditions) medFlags.push(V.hxM.conditions);
  if (medFlags.length > 0) s += "MedHx: " + medFlags.join(", ") + "\n";

  /* Family history */
  var famFlags = [];
  if (V.hxF.glaucoma) famFlags.push("Glaucoma");
  if (V.hxF.amd) famFlags.push("AMD");
  if (V.hxF.keratoconus) famFlags.push("Keratoconus");
  if (famFlags.length > 0) s += "FamHx: " + famFlags.join(", ") + "\n";

  /* VA */
  if (V.va.od_un || V.va.od_bva) {
    s += "VA: Un OD:" + (V.va.od_un || "—") + " OS:" + (V.va.os_un || "—");
    s += " BVA OD:" + (V.va.od_bva || "—") + " OS:" + (V.va.os_bva || "—") + "\n";
  }

  /* Rx */
  if (V.rx.od_sph) {
    s += "Rx OD:" + V.rx.od_sph + "/" + (V.rx.od_cyl || "—") + "x" + (V.rx.od_ax || "—");
    s += " OS:" + (V.rx.os_sph || "—") + "/" + (V.rx.os_cyl || "—") + "x" + (V.rx.os_ax || "—") + "\n";
  }

  /* IOP */
  if (V.iop.od || V.iop.os) {
    s += "IOP: OD " + (V.iop.od || "—") + " OS " + (V.iop.os || "—") + " (" + V.iop.method + ")\n";
  }

  /* SL findings */
  if (V.sl && V.sl.findings.length > 0) {
    s += "SL: " + V.sl.findings.join(", ") + "\n";
  }

  /* RAPD */
  if (V.pupil && V.pupil.rapd !== "None") {
    s += "RAPD: " + V.pupil.rapd + (V.pupil.rapd_grade ? " Grade " + V.pupil.rapd_grade : "") + "\n";
  }

  /* BV */
  if (V.bv && (V.bv.ct_n || V.bv.npc_b)) {
    s += "BV: CT near:" + (V.bv.ct_n || "—") + " NPC:" + (V.bv.npc_b || "—") + "cm";
    if (V.bv.acc_od) s += " AccOD:" + V.bv.acc_od;
    s += "\n";
  }

  /* Fundus */
  if (V.fun && V.fun.od.cd_v) {
    s += "C/D: OD " + V.fun.od.cd_v + " OS " + (V.fun.os.cd_v || "—") + "\n";
  }
  if (V.fun && V.fun.findings.length > 0) {
    s += "Fundus: " + V.fun.findings.join(", ") + "\n";
  }

  return s;
}
