/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — UI PAGE RENDERERS (Part 1 of 2)                       */
/* Pages 01-13: Demographics through Binocular Vision              */
/* Each function returns an HTML string injected into mainEl       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* MASTER RENDERER — dispatches to the correct page function       */
/* ═══════════════════════════════════════════════════════════════ */

function renderMain() {
  var fn = {
    demographics:     pgDemo,
    chief_complaint:  pgCC,
    hx_ocular:        pgHxO,
    hx_medical:       pgHxM,
    hx_family:        pgHxF,
    va:               pgVA,
    refraction:       pgRx,
    dilation:         pgDil,
    slit_lamp:        pgSL,
    iop:              pgIOP,
    pupil:            pgPup,
    motility:         pgMot,
    bv:               pgBV,
    gonioscopy:       pgGon,
    fundus:           pgFun,
    neuro:            pgNeu,
    investigations:   pgInv,
    diagnosis:        pgDx,
    plan:             pgPlan,
    coding:           pgCode,
    report:           pgRpt,
    prescription:     pgRxP
  }[V.step];

  var el = document.getElementById("mainEl");
  if (!el) return;

  if (fn) {
    el.innerHTML = fn();
  } else {
    el.innerHTML = '<div class="card"><div class="card-t">Section</div>' +
      '<p style="color:var(--sv);margin-top:8px">This section is under development.</p></div>';
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* HELPER: vaField — generates a VA input with click-to-select     */
/* ═══════════════════════════════════════════════════════════════ */

function vaField(id, path, ph, fmt) {
  var parts = path.split(".");
  var val = V;
  for (var i = 0; i < parts.length; i++) {
    if (val === undefined || val === null) break;
    val = val[parts[i]];
  }
  val = val || "";

  return '<input class="e-in" id="' + id + '" value="' + esc(val) + '" placeholder="' + ph + '"' +
    ' onclick="showVA(\'' + id + '\',\'' + (fmt || 'metric') + '\')"' +
    ' oninput="var p=\'' + path + '\'.split(\'.\');var o=V;for(var i=0;i<p.length-1;i++)o=o[p[i]];o[p[p.length-1]]=this.value"' +
    ' autocomplete="off">';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 01: DEMOGRAPHICS                                           */
/* ═══════════════════════════════════════════════════════════════ */

function pgDemo() {
  return '<div class="card">' +
    '<div class="card-t">Patient Demographics</div>' +
    '<div class="card-s">Registration and identification</div>' +
    '<div class="fg">' +

    '<div class="fi">' +
      '<label>MRN</label>' +
      '<input value="' + esc(P.mrn) + '" disabled style="background:var(--sn)">' +
    '</div>' +

    '<div class="fi">' +
      '<label>First Name *</label>' +
      '<input value="' + esc(P.first_name) + '" oninput="P.first_name=this.value;updateHdr()" placeholder="First name">' +
    '</div>' +

    '<div class="fi">' +
      '<label>Last Name *</label>' +
      '<input value="' + esc(P.last_name) + '" oninput="P.last_name=this.value;updateHdr()" placeholder="Last name">' +
    '</div>' +

    '<div class="fi">' +
      '<label>Age *</label>' +
      '<input type="number" value="' + esc(P.age) + '" oninput="P.age=this.value;updateHdr()" placeholder="Years" min="0" max="120">' +
    '</div>' +

    '<div class="fi">' +
      '<label>Sex *</label>' +
      '<select oninput="P.sex=this.value;updateHdr()">' +
        '<option value="">Select</option>' +
        '<option' + (P.sex === "Male" ? " selected" : "") + '>Male</option>' +
        '<option' + (P.sex === "Female" ? " selected" : "") + '>Female</option>' +
        '<option' + (P.sex === "Other" ? " selected" : "") + '>Other</option>' +
      '</select>' +
    '</div>' +

    '<div class="fi">' +
      '<label>DOB</label>' +
      '<input type="date" value="' + esc(P.dob) + '" oninput="P.dob=this.value">' +
    '</div>' +

    '<div class="fi">' +
      '<label>Occupation</label>' +
      '<input value="' + esc(P.occupation) + '" oninput="P.occupation=this.value" placeholder="Visual demands">' +
    '</div>' +

    '<div class="fi">' +
      '<label>Phone</label>' +
      '<input value="' + esc(P.phone) + '" oninput="P.phone=this.value">' +
    '</div>' +

    '<div class="fi full">' +
      '<label>Referred By</label>' +
      '<input value="' + esc(P.referred_by) + '" oninput="P.referred_by=this.value">' +
    '</div>' +

    '</div>' + /* close .fg */

    '<div class="btn-g">' +
      '<button class="btn btn-p" onclick="goNext(\'demographics\',\'chief_complaint\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 02: CHIEF COMPLAINT                                        */
/* Includes: free-text, FOLDARS, temporal selector, symptom chips  */
/* ═══════════════════════════════════════════════════════════════ */

function pgCC() {
  var h = '<div class="card">' +
    '<div class="card-t">Chief Complaint</div>' +
    '<div class="card-s">Presenting complaint with structured history</div>';

  /* Free-text with voice button */
  h += '<div class="fi full" style="margin-bottom:12px">' +
    '<label>Free-Text Complaint ' +
      '<span class="vb" data-t="ccTA" onclick="togVoice(\'ccTA\')">🎤 Voice</span>' +
    '</label>' +
    '<textarea id="ccTA" oninput="V.cc=this.value;runDiagnosticEngine();renderAdvisory();renderSidebar()" ' +
    'placeholder="Describe the presenting complaint...">' + esc(V.cc) + '</textarea>' +
  '</div>';

  /* Temporal pattern selectors */
  h += '<div class="dv"><span>Onset & Pattern</span></div>';

  /* Onset */
  h += '<div style="margin-bottom:6px"><div style="font-size:.56rem;font-weight:600;color:var(--sl);text-transform:uppercase;margin-bottom:3px">Onset</div>';
  h += '<div class="temporal-row">';
  for (var oi = 0; oi < TEMPORAL_ONSET.length; oi++) {
    var to = TEMPORAL_ONSET[oi];
    var toSel = V.temporal && V.temporal.onset === to.key;
    h += '<span class="temporal-opt' + (toSel ? ' sel' : '') + '" onclick="togTemporal(\'onset\',\'' + to.key + '\')">' + to.label + '</span>';
  }
  h += '</div></div>';

  /* Duration */
  h += '<div style="margin-bottom:6px"><div style="font-size:.56rem;font-weight:600;color:var(--sl);text-transform:uppercase;margin-bottom:3px">Duration</div>';
  h += '<div class="temporal-row">';
  for (var di = 0; di < TEMPORAL_DURATION.length; di++) {
    var td = TEMPORAL_DURATION[di];
    var tdSel = V.temporal && V.temporal.duration === td.key;
    h += '<span class="temporal-opt' + (tdSel ? ' sel' : '') + '" onclick="togTemporal(\'duration\',\'' + td.key + '\')">' + td.label + '</span>';
  }
  h += '</div></div>';

  /* Course */
  h += '<div style="margin-bottom:12px"><div style="font-size:.56rem;font-weight:600;color:var(--sl);text-transform:uppercase;margin-bottom:3px">Course</div>';
  h += '<div class="temporal-row">';
  for (var ci = 0; ci < TEMPORAL_COURSE.length; ci++) {
    var tc = TEMPORAL_COURSE[ci];
    var tcSel = V.temporal && V.temporal.course === tc.key;
    h += '<span class="temporal-opt' + (tcSel ? ' sel' : '') + '" onclick="togTemporal(\'course\',\'' + tc.key + '\')">' + tc.label + '</span>';
  }
  h += '</div></div>';

  /* FOLDARS — only show if CC has content */
  if (V.cc && V.cc.length > 5) {
    h += '<div class="dv"><span>FOLDARS — Structured History</span></div>';
    var prompts = [
      { l: "F", q: "Frequency?", k: "F", ph: "Constant / intermittent" },
      { l: "O", q: "Onset?",     k: "O", ph: "Sudden / gradual / date" },
      { l: "L", q: "Location?",  k: "L", ph: "OD / OS / OU" },
      { l: "D", q: "Duration?",  k: "D", ph: "Seconds / hours / days" },
      { l: "A", q: "Associated?",k: "A", ph: "Pain, redness, headache..." },
      { l: "R", q: "Relieving?", k: "R", ph: "Rest, drops, closing eyes..." },
      { l: "S", q: "Severity?",  k: "S", ph: "1-10 / mild / moderate / severe" }
    ];
    for (var pi = 0; pi < prompts.length; pi++) {
      var pr = prompts[pi];
      var prVal = V.foldarq[pr.k] || "";
      h += '<div class="fq' + (prVal ? " done" : "") + '">' +
        '<span class="lt">' + pr.l + '</span>' +
        '<span class="qt">' + pr.q + '</span>' +
        '<input value="' + esc(prVal) + '" placeholder="' + pr.ph + '" oninput="V.foldarq[\'' + pr.k + '\']=this.value">' +
        '<span class="st">' + (prVal ? "✓" : "○") + '</span>' +
      '</div>';
    }
  }

  /* Optional validated dry-eye score (collapsed by default). */
  if (typeof osdiTool === "function") h += osdiTool();

  /* Symptom chips — expanded 12-group layout */
  h += '<div class="dv"><span>Select Symptoms</span></div>';
  h += '<input class="search-box" placeholder="Search symptoms..." oninput="filterSymptoms(this.value)">';

  for (var cat in SYM_CATS) {
    var syms = SYM_CATS[cat];
    var catId = "sc_" + cat.replace(/[^a-zA-Z]/g, "");
    var selCount = 0;
    for (var sk in syms) {
      if (V.symptoms.indexOf(sk) >= 0) selCount++;
    }

    h += '<div class="col-trig" onclick="togCollapse(\'' + catId + '\')">' +
      cat + (selCount > 0 ? ' <b>(' + selCount + ')</b>' : '') +
      '<span class="col-arrow">▶</span>' +
    '</div>';

    h += '<div class="col-body' + (selCount > 0 ? " open" : "") + '" id="' + catId + '">';
    h += '<div class="chips">';
    for (var sk2 in syms) {
      var isSel = V.symptoms.indexOf(sk2) >= 0;
      h += '<span class="chip' + (isSel ? " sel" : "") + '" data-sym="' + sk2 + '" onclick="togSym(\'' + sk2 + '\')">' + syms[sk2] + '</span>';
    }
    h += '</div></div>';
  }

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'demographics\')">← Back</button>' +
    '<button class="btn btn-p" onclick="goNext(\'chief_complaint\',\'hx_ocular\')">Continue →</button>' +
  '</div></div>';

  return h;
}

/* Symptom search filter */
function filterSymptoms(query) {
  var lq = query.toLowerCase();
  var chips = document.querySelectorAll("[data-sym]");
  for (var i = 0; i < chips.length; i++) {
    var text = chips[i].textContent.toLowerCase();
    var token = chips[i].getAttribute("data-sym").toLowerCase();
    var match = text.indexOf(lq) >= 0 || token.indexOf(lq) >= 0;

    /* Also search token dictionary aliases */
    if (!match && typeof TOKEN_DICTIONARY !== "undefined" && TOKEN_DICTIONARY[token]) {
      var aliases = TOKEN_DICTIONARY[token];
      for (var a = 0; a < aliases.length; a++) {
        if (aliases[a].toLowerCase().indexOf(lq) >= 0) {
          match = true;
          break;
        }
      }
    }

    chips[i].style.display = match ? "" : "none";
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 03: OCULAR HISTORY                                         */
/* ═══════════════════════════════════════════════════════════════ */

function pgHxO() {
  var h = '<div class="card">' +
    '<div class="card-t">Ocular History</div>' +
    '<div class="card-s">Previous conditions, correction, and ocular health</div>';

  /* Structured flags */
  h += '<div class="dv"><span>Quick Flags</span></div>';
  h += '<div class="chips" style="margin-bottom:12px">';
  for (var fi = 0; fi < OCULAR_HISTORY_FLAGS.length; fi++) {
    var flag = OCULAR_HISTORY_FLAGS[fi];
    var flagSel = V.hxO.flags && V.hxO.flags.indexOf(flag.key) >= 0;
    h += '<span class="chip' + (flagSel ? " sel" : "") + '" onclick="togOcFlag(\'' + flag.key + '\')">' + flag.label + '</span>';
  }
  h += '</div>';

  h += '<div class="fg">' +
    '<div class="fi full"><label>Past Ocular Conditions</label>' +
      '<textarea oninput="V.hxO.conditions=this.value">' + esc(V.hxO.conditions) + '</textarea></div>' +
    '<div class="fi full"><label>Ocular Surgeries</label>' +
      '<textarea oninput="V.hxO.surgeries=this.value">' + esc(V.hxO.surgeries) + '</textarea></div>' +
    '<div class="fi"><label>Current Glasses Rx</label>' +
      '<input value="' + esc(V.hxO.glasses_rx) + '" oninput="V.hxO.glasses_rx=this.value"></div>' +
    '<div class="fi"><label>Last Eye Exam</label>' +
      '<input value="' + esc(V.hxO.last_exam) + '" oninput="V.hxO.last_exam=this.value"></div>' +
    '<div class="fi"><label>CL Type</label>' +
      '<input value="' + esc(V.hxO.cl_type) + '" oninput="V.hxO.cl_type=this.value" placeholder="Soft / RGP / Scleral"></div>' +
    '<div class="fi full"><label>Eye Medications</label>' +
      '<textarea oninput="V.hxO.medications=this.value">' + esc(V.hxO.medications) + '</textarea></div>' +
  '</div>';

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'chief_complaint\')">← Back</button>' +
    '<button class="btn btn-p" onclick="goNext(\'hx_ocular\',\'hx_medical\')">Continue →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 04: MEDICAL / SYSTEMIC HISTORY                             */
/* ═══════════════════════════════════════════════════════════════ */

function pgHxM() {
  var h = '<div class="card">' +
    '<div class="card-t">Medical / Systemic History</div>' +
    '<div class="card-s">Conditions with ocular implications</div>';

  /* Medical flags */
  h += '<div class="chips" style="margin-bottom:12px">';
  for (var mi = 0; mi < MED_FLAGS.length; mi++) {
    var mf = MED_FLAGS[mi];
    var mfSel = V.hxM[mf.key] === true;
    h += '<span class="chip' + (mfSel ? " sel" : "") + '" onclick="togMedFlag(\'' + mf.key + '\')">' + mf.label + '</span>';
  }
  h += '</div>';

  h += '<div class="fg">' +
    '<div class="fi full"><label>Other Conditions</label>' +
      '<textarea oninput="V.hxM.conditions=this.value">' + esc(V.hxM.conditions) + '</textarea></div>' +
    '<div class="fi"><label>Current Medications</label>' +
      '<textarea oninput="V.hxM.medications=this.value" placeholder="List all systemic medications">' + esc(V.hxM.medications) + '</textarea></div>' +
    '<div class="fi"><label>Allergies</label>' +
      '<textarea oninput="V.hxM.allergies=this.value">' + esc(V.hxM.allergies) + '</textarea></div>' +
  '</div>';

  /* Medication checker hint */
  if (V.hxM.medications && V.hxM.medications.length > 3) {
    h += '<div style="margin-top:8px;padding:8px;border:1px solid var(--fg);border-radius:var(--r);font-size:.62rem;color:var(--sl)">' +
      '💊 Medication checker will flag ocular side effects in the Advisory panel.' +
    '</div>';
  }

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'hx_ocular\')">← Back</button>' +
    '<button class="btn btn-p" onclick="goNext(\'hx_medical\',\'hx_family\')">Continue →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 05: FAMILY & SOCIAL HISTORY                                */
/* ═══════════════════════════════════════════════════════════════ */

function pgHxF() {
  var h = '<div class="card">' +
    '<div class="card-t">Family & Social History</div>';

  /* Family flags */
  h += '<div class="chips" style="margin:12px 0">';
  for (var fi = 0; fi < FAMILY_FLAGS.length; fi++) {
    var ff = FAMILY_FLAGS[fi];
    var ffSel = V.hxF[ff.key] === true;
    h += '<span class="chip' + (ffSel ? " sel" : "") + '" onclick="togFamFlag(\'' + ff.key + '\')">' + ff.label + '</span>';
  }
  h += '</div>';

  h += '<div class="fi full"><label>Details</label>' +
    '<textarea oninput="V.hxF.details=this.value">' + esc(V.hxF.details) + '</textarea></div>';

  h += '<div class="fg" style="margin-top:10px">' +
    '<div class="fi"><label>Smoking</label>' +
      '<select oninput="V.hxS.smoking=this.value">' +
        '<option value="">Select</option>' +
        '<option' + (V.hxS.smoking === "Never" ? " selected" : "") + '>Never</option>' +
        '<option' + (V.hxS.smoking === "Former" ? " selected" : "") + '>Former</option>' +
        '<option' + (V.hxS.smoking === "Current" ? " selected" : "") + '>Current</option>' +
      '</select></div>' +
    '<div class="fi"><label>VDU Hours/Day</label>' +
      '<input type="number" value="' + esc(V.hxS.vdu) + '" oninput="V.hxS.vdu=this.value" min="0" max="24"></div>' +
    '<div class="fi"><label>Occupation</label>' +
      '<input value="' + esc(V.hxS.occupation) + '" oninput="V.hxS.occupation=this.value" placeholder="Visual demands"></div>' +
  '</div>';

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'hx_medical\')">← Back</button>' +
    '<button class="btn btn-p" onclick="goNext(\'hx_family\',\'va\')">Continue →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 06: VISUAL ACUITY                                          */
/* Age-adaptive chart recommendations shown                        */
/* ═══════════════════════════════════════════════════════════════ */

function pgVA() {
  /* Age-adaptive chart recommendation */
  var chartRec = "";
  var age = parseInt(P.age) || 0;
  if (age > 0) {
    var ageKey = age < 2 ? "0-2" : age < 4 ? "2-4" : age < 7 ? "4-7" : age < 16 ? "7-16" : "16+";
    var recommended = AGE_CHART_MAP[ageKey];
    if (recommended) {
      chartRec = '<div style="font-size:.58rem;color:var(--sl);margin-bottom:8px;padding:4px 8px;background:var(--sn);border-radius:var(--r)">' +
        'Recommended for age ' + age + ': ' + recommended.join(", ") +
      '</div>';
    }
  }

  return '<div class="card">' +
    '<div class="card-t">Visual Acuity</div>' +
    '<div class="card-s">Click fields for pre-set values (metric + imperial)</div>' +
    chartRec +

    '<div class="fg" style="margin-bottom:12px">' +
      '<div class="fi"><label>Chart</label>' +
        '<select oninput="V.va.chart=this.value">' +
          CHART_TYPES.map(function(c) { return '<option' + (V.va.chart === c ? ' selected' : '') + '>' + c + '</option>'; }).join("") +
        '</select></div>' +
      '<div class="fi"><label>Distance</label>' +
        '<select oninput="V.va.dist=this.value">' +
          ["6m", "5m", "4m", "3m", "20ft", "10ft"].map(function(d) { return '<option' + (V.va.dist === d ? ' selected' : '') + '>' + d + '</option>'; }).join("") +
        '</select></div>' +
    '</div>' +

    '<div class="dv"><span>Distance VA</span></div>' +
    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">Unaided</div>' + vaField("vaOdUn", "va.od_un", "6/...") + vaField("vaOsUn", "va.os_un", "6/...") +
      '<div class="e-l">Aided</div>'   + vaField("vaOdAid", "va.od_aid", "6/...") + vaField("vaOsAid", "va.os_aid", "6/...") +
      '<div class="e-l">Pinhole</div>' + vaField("vaOdPh", "va.od_ph", "6/...")  + vaField("vaOsPh", "va.os_ph", "6/...") +
      '<div class="e-l">BVA</div>'     + vaField("vaOdBva", "va.od_bva", "6/...") + vaField("vaOsBva", "va.os_bva", "6/...") +
    '</div>' +

    '<div class="dv"><span>Near VA</span></div>' +
    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">Near</div>' + vaField("vaOdNr", "va.od_near", "N6", "near") + vaField("vaOsNr", "va.os_near", "N6", "near") +
    '</div>' +

    /* Pinhole interpretation + free remarks — what the clinician concludes
       from the pinhole is the clinically meaningful part, not just the number.
       Improvement points to an uncorrected refractive cause; no improvement
       points away from it (this is recorded, not scored). */
    '<div class="dv"><span>Interpretation &amp; Remarks</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Pinhole</label>' +
        '<select oninput="V.va.ph_improves=this.value">' +
          ["", "Improves", "No improvement", "Partial improvement", "Not tested"].map(function (o) {
            return '<option' + (V.va.ph_improves === o ? " selected" : "") + '>' + o + '</option>';
          }).join("") +
        '</select></div>' +
      '<div class="fi full"><label>Remarks</label>' +
        '<textarea oninput="V.va.remarks=this.value" placeholder="Fixation, cooperation, eccentric viewing, chart/distance used, crowding, tested with/without correction…">' + esc(V.va.remarks || "") + '</textarea></div>' +
    '</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'hx_family\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'va\',\'refraction\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 07: REFRACTION                                             */
/* ═══════════════════════════════════════════════════════════════ */

/* ── Refraction helpers ─────────────────────────────────────────────
   Every refraction stage stores its powers under the same suffixes
   (_sph/_cyl/_ax/_add/_prism/_base) behind a stage prefix, so one row
   builder and one copy function serve all four stages:
     ""      → subjective / working refraction (engine-facing, unchanged)
     "hab"   → habitual (current spectacles / CL)
     "ar"    → autorefractor
     "ret"   → retinoscopy (dry)
     "cyclo" → post-cycloplegic retinoscopy
     "fin"   → final prescription issued
   ------------------------------------------------------------------ */

function rxKey(stage, eye, suffix) {
  return (stage ? stage + "_" : "") + eye + "_" + suffix;
}

/* One OD/OS power row. opts: {add, prism, live} */
function rxPowerRow(eyeLabel, stage, opts) {
  opts = opts || {};
  var e = eyeLabel.toLowerCase();
  function cell(suffix, ph, w) {
    var k = rxKey(stage, e, suffix);
    return '<td><input class="e-in" value="' + esc(V.rx[k] || "") + '"' +
      ' oninput="V.rx[\'' + k + '\']=this.value' +
      (opts.live ? ';runDiagnosticEngine();renderAdvisory()' : '') + '"' +
      ' placeholder="' + ph + '" style="width:' + w + 'px" autocomplete="off"></td>';
  }
  var h = '<tr><td class="e-l">' + eyeLabel + '</td>' +
    cell("sph", "Sph", 58) + cell("cyl", "Cyl", 58) + cell("ax", "Ax", 45);
  if (opts.add) h += cell("add", "Add", 52);
  if (opts.prism) h += cell("prism", "Δ", 38) + cell("base", "Base", 45);
  return h + '</tr>';
}

/* A titled power table for one stage. */
function rxPowerTable(stage, opts) {
  opts = opts || {};
  var heads = ["Sph", "Cyl", "Ax"];
  if (opts.add) heads.push("Add");
  if (opts.prism) heads.push("Prism", "Base");
  return '<table style="width:100%;border-collapse:collapse;font-size:.72rem">' +
    '<thead><tr><th style="text-align:left;padding:4px;font-size:.56rem;color:var(--sl);text-transform:uppercase">Eye</th>' +
      heads.map(function (c) {
        return '<th style="padding:4px;font-size:.56rem;color:var(--sl);text-transform:uppercase">' + c + '</th>';
      }).join("") +
    '</tr></thead><tbody>' +
      rxPowerRow("OD", stage, opts) + rxPowerRow("OS", stage, opts) +
    '</tbody></table>';
}

/* Carry powers from one stage to another (only non-empty values move, so a
   copy never blanks work already done). Re-runs the engine because the
   subjective stage is engine-facing. */
function rxCopyStage(from, to) {
  var parts = ["sph", "cyl", "ax", "add", "prism", "base"];
  var moved = 0;
  ["od", "os"].forEach(function (e) {
    parts.forEach(function (p) {
      var src = V.rx[rxKey(from, e, p)];
      if (src !== undefined && src !== "") { V.rx[rxKey(to, e, p)] = src; moved++; }
    });
  });
  if (!moved) { toast("Nothing to copy — that stage is empty."); return; }
  if (typeof runDiagnosticEngine === "function") runDiagnosticEngine();
  renderMain();
  if (typeof renderAdvisory === "function") renderAdvisory();
  toast("Copied " + rxStageName(from) + " → " + rxStageName(to) + ".");
}

function rxStageName(s) {
  return { "": "subjective", hab: "current Rx", ar: "autorefraction",
           ret: "retinoscopy", cyclo: "cycloplegic retinoscopy", fin: "final Rx" }[s] || s;
}

/* True when a stage has any power recorded. */
function rxStageHasData(stage) {
  var parts = ["sph", "cyl", "ax", "add"];
  for (var i = 0; i < 2; i++) {
    var e = ["od", "os"][i];
    for (var j = 0; j < parts.length; j++) {
      var v = V.rx[rxKey(stage, e, parts[j])];
      if (v !== undefined && v !== "") return true;
    }
  }
  return false;
}

/* Stamp the cycloplegic instillation time (the "hold" starts now). */
function rxCycloNow() {
  var d = new Date();
  V.rx.cyclo_instilled = ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  renderMain();
}

/* Minutes elapsed since instillation, or null if not started / unparseable. */
function rxCycloElapsed() {
  var t = (V.rx.cyclo_instilled || "").trim();
  var m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  var now = new Date();
  var then = new Date(now);
  then.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  var mins = Math.floor((now - then) / 60000);
  if (mins < 0) mins += 24 * 60; /* instilled just before midnight */
  return mins;
}

/* The refraction actually issued: final if written, else subjective. */
function rxEffectiveStage() { return rxStageHasData("fin") ? "fin" : ""; }


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 07: REFRACTION                                             */
/* Staged to follow the clinical sequence a clinician actually      */
/* works through: current correction → objective (AR, retinoscopy,  */
/* dry or cycloplegic with a hold) → subjective → final Rx issued.  */
/* ═══════════════════════════════════════════════════════════════ */

function pgRx() {
  var isCyclo = V.rx.ret_state === "Cycloplegic";
  var elapsed = rxCycloElapsed();
  var waitMin = parseInt(V.rx.cyclo_wait, 10) || 30;

  /* ── ① Current correction ── */
  var habType = V.rx.hab_type || "None";
  var habSec =
    '<div class="dv"><span>① Current correction (habitual)</span></div>' +
    '<div class="fg" style="margin-bottom:8px">' +
      '<div class="fi"><label>Wearing</label>' +
        '<select oninput="V.rx.hab_type=this.value;renderMain()">' +
          ["None", "Spectacles", "Contact lenses"].map(function (t) {
            return '<option' + (habType === t ? " selected" : "") + '>' + t + '</option>';
          }).join("") +
        '</select></div>' +
      (habType !== "None"
        ? '<div class="fi"><label>Age of current Rx</label><input class="e-in" value="' + esc(V.rx.hab_age) + '" oninput="V.rx.hab_age=this.value" placeholder="e.g. 2 years"></div>'
        : '') +
    '</div>';

  if (habType !== "None") {
    habSec +=
      rxPowerTable("hab", { add: true }) +
      '<div class="fg" style="margin-top:6px">' +
        '<div class="fi"><label>VA with current OD</label><input class="e-in" value="' + esc(V.rx.hab_va_od) + '" oninput="V.rx.hab_va_od=this.value" placeholder="6/..."></div>' +
        '<div class="fi"><label>VA with current OS</label><input class="e-in" value="' + esc(V.rx.hab_va_os) + '" oninput="V.rx.hab_va_os=this.value" placeholder="6/..."></div>' +
      '</div>';
    if (habType === "Contact lenses") {
      habSec +=
        '<div class="fg" style="margin-top:6px">' +
          '<div class="fi"><label>Base curve</label><input class="e-in" value="' + esc(V.rx.cl_bc) + '" oninput="V.rx.cl_bc=this.value" placeholder="8.6"></div>' +
          '<div class="fi"><label>Diameter</label><input class="e-in" value="' + esc(V.rx.cl_dia) + '" oninput="V.rx.cl_dia=this.value" placeholder="14.2"></div>' +
          '<div class="fi"><label>Modality</label><input class="e-in" value="' + esc(V.rx.cl_modality) + '" oninput="V.rx.cl_modality=this.value" placeholder="Daily / Monthly"></div>' +
          '<div class="fi"><label>Material</label><input class="e-in" value="' + esc(V.rx.cl_material) + '" oninput="V.rx.cl_material=this.value" placeholder="SiHy"></div>' +
        '</div>';
    }
    habSec +=
      '<div style="margin-top:6px"><button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'hab\',\'\')">Copy current → subjective (start point)</button></div>';
  }

  /* ── ② Objective ── */
  var objSec =
    '<div class="dv"><span>② Objective refraction</span></div>' +

    '<div style="font-size:.58rem;color:var(--sl);text-transform:uppercase;letter-spacing:.04em;margin:6px 0 3px">Autorefractor</div>' +
    rxPowerTable("ar", {}) +
    '<div style="margin:4px 0 10px"><button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'ar\',\'\')">Copy AR → subjective</button></div>' +

    '<div style="font-size:.58rem;color:var(--sl);text-transform:uppercase;letter-spacing:.04em;margin:6px 0 3px">Retinoscopy</div>' +
    '<div class="fg" style="margin-bottom:6px">' +
      '<div class="fi"><label>State</label>' +
        '<select oninput="V.rx.ret_state=this.value;renderMain()">' +
          ["Dry", "Cycloplegic"].map(function (t) {
            return '<option' + (V.rx.ret_state === t ? " selected" : "") + '>' + t + '</option>';
          }).join("") +
        '</select></div>' +
      '<div class="fi"><label>Working distance</label><input class="e-in" value="' + esc(V.rx.ret_wd) + '" oninput="V.rx.ret_wd=this.value" placeholder="0.67 m"></div>' +
    '</div>' +
    rxPowerTable("ret", {}) +
    '<div style="margin:4px 0 6px"><button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'ret\',\'\')">Copy retinoscopy → subjective</button></div>';

  /* Cycloplegic sub-block — instil, hold, repeat. */
  if (isCyclo) {
    var holdState;
    if (elapsed === null) {
      holdState = '<span style="color:var(--sv)">Not started — record the instillation time to begin the hold.</span>';
    } else if (elapsed < waitMin) {
      holdState = '<span style="color:var(--wr,#b8860b);font-weight:600">⏳ Holding — ' + elapsed + ' of ' + waitMin +
        ' min elapsed.</span> <span style="color:var(--sv)">Exam paused for cycloplegia; repeat retinoscopy when ready.</span>';
    } else {
      holdState = '<span style="color:#2e7d32;font-weight:600">✓ ' + elapsed + ' min elapsed — ready to repeat retinoscopy.</span>';
    }

    objSec +=
      '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:10px;margin:8px 0;background:var(--sn)">' +
        '<div style="font-weight:600;font-size:.68rem;margin-bottom:6px">Cycloplegia</div>' +
        '<div class="fg">' +
          '<div class="fi"><label>Agent</label>' +
            '<select oninput="V.rx.cyclo_agent=this.value">' +
              ['', 'Cyclopentolate 1%', 'Cyclopentolate 0.5%', 'Tropicamide 1%', 'Homatropine 2%', 'Atropine 1%', 'Other'].map(function (a) {
                return '<option' + (V.rx.cyclo_agent === a ? " selected" : "") + '>' + a + '</option>';
              }).join("") +
            '</select></div>' +
          '<div class="fi"><label>Drops</label><input class="e-in" value="' + esc(V.rx.cyclo_drops) + '" oninput="V.rx.cyclo_drops=this.value" placeholder="2"></div>' +
          '<div class="fi"><label>Instilled at</label><input class="e-in" value="' + esc(V.rx.cyclo_instilled) + '" oninput="V.rx.cyclo_instilled=this.value" placeholder="HH:MM"></div>' +
          '<div class="fi"><label>Hold (min)</label><input class="e-in" value="' + esc(V.rx.cyclo_wait) + '" oninput="V.rx.cyclo_wait=this.value" placeholder="30"></div>' +
        '</div>' +
        '<div style="margin:6px 0"><button class="btn btn-s" style="font-size:.58rem" onclick="rxCycloNow()">⏱ Instilled now</button> ' +
          '<button class="btn btn-s" style="font-size:.58rem" onclick="renderMain()">↻ Refresh timer</button></div>' +
        '<div style="font-size:.6rem;margin-bottom:8px">' + holdState + '</div>' +
        '<div style="font-size:.58rem;color:var(--sl);text-transform:uppercase;letter-spacing:.04em;margin-bottom:3px">Post-cycloplegic retinoscopy</div>' +
        rxPowerTable("cyclo", {}) +
        '<div style="margin-top:4px"><button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'cyclo\',\'\')">Copy cycloplegic → subjective</button></div>' +
        '<div class="fi full" style="margin-top:6px"><label>Cycloplegia notes</label>' +
          '<textarea oninput="V.rx.cyclo_notes=this.value" placeholder="Reaction, residual accommodation, post-cyclo advice given…">' + esc(V.rx.cyclo_notes) + '</textarea></div>' +
      '</div>';
  }

  /* ── ③ Subjective (engine-facing) ── */
  var subSec =
    '<div class="dv"><span>③ Subjective refraction</span></div>' +
    '<div style="font-size:.58rem;color:var(--sv);margin-bottom:4px">This is the working refraction the diagnostic engine reads.</div>' +
    rxPowerTable("", { add: true, prism: true, live: true }) +
    '<div class="fg" style="margin-top:6px">' +
      '<div class="fi"><label>BCVA OD</label><input class="e-in" value="' + esc(V.rx.sub_va_od) + '" oninput="V.rx.sub_va_od=this.value" placeholder="6/6"></div>' +
      '<div class="fi"><label>BCVA OS</label><input class="e-in" value="' + esc(V.rx.sub_va_os) + '" oninput="V.rx.sub_va_os=this.value" placeholder="6/6"></div>' +
      '<div class="fi"><label>Binocular balance</label><input class="e-in" value="' + esc(V.rx.sub_balance) + '" oninput="V.rx.sub_balance=this.value" placeholder="Balanced / prism-dissociated"></div>' +
    '</div>';

  /* ── ④ Final prescription ── */
  var finSec =
    '<div class="dv"><span>④ Final prescription issued</span></div>' +
    '<div style="margin-bottom:6px">' +
      '<button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'\',\'fin\')">Copy subjective → final</button> ' +
      (habType !== "None" ? '<button class="btn btn-s" style="font-size:.58rem" onclick="rxCopyStage(\'hab\',\'fin\')">Keep current Rx unchanged</button>' : '') +
    '</div>' +
    rxPowerTable("fin", { add: true, prism: true }) +
    '<div class="fg" style="margin-top:6px">' +
      '<div class="fi"><label>Lens type</label><input class="e-in" value="' + esc(V.rx.fin_lens_type) + '" oninput="V.rx.fin_lens_type=this.value" placeholder="Single vision / Progressive / Bifocal"></div>' +
      '<div class="fi"><label>Wearing advice</label><input class="e-in" value="' + esc(V.rx.fin_advice) + '" oninput="V.rx.fin_advice=this.value" placeholder="Constant / near only / driving"></div>' +
      '<div class="fi full"><label>Prescription notes</label>' +
        '<textarea oninput="V.rx.fin_notes=this.value" placeholder="Adaptation advice, prism, tint, review interval…">' + esc(V.rx.fin_notes) + '</textarea></div>' +
    '</div>';

  return '<div class="card">' +
    '<div class="card-t">Refraction</div>' +
    '<div class="card-s">Current correction → objective → subjective → final prescription</div>' +

    '<div class="fg" style="margin-bottom:12px">' +
      '<div class="fi"><label>Method</label>' +
        '<select oninput="V.rx.method=this.value">' +
          RX_METHODS.map(function (m) { return '<option' + (V.rx.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join("") +
        '</select></div>' +
      '<div class="fi"><label>PD Type</label>' +
        '<select oninput="V.rx.pd_type=this.value;renderMain()">' +
          '<option' + (V.rx.pd_type === "binocular" ? " selected" : "") + ' value="binocular">Binocular</option>' +
          '<option' + (V.rx.pd_type === "monocular" ? " selected" : "") + ' value="monocular">Monocular</option>' +
          '<option' + (V.rx.pd_type === "both" ? " selected" : "") + ' value="both">Both</option>' +
        '</select></div>' +
    '</div>' +

    (V.rx.pd_type === "binocular" || V.rx.pd_type === "both"
      ? '<div class="fi" style="max-width:180px;margin-bottom:8px"><label>PD Binocular (mm)</label><input class="e-in" value="' + esc(V.rx.pd_bi) + '" oninput="V.rx.pd_bi=this.value"></div>'
      : '') +

    (V.rx.pd_type === "monocular" || V.rx.pd_type === "both"
      ? '<div class="fg" style="margin-bottom:8px"><div class="fi"><label>PD OD (mm)</label><input class="e-in" value="' + esc(V.rx.pd_od) + '" oninput="V.rx.pd_od=this.value"></div><div class="fi"><label>PD OS (mm)</label><input class="e-in" value="' + esc(V.rx.pd_os) + '" oninput="V.rx.pd_os=this.value"></div></div>'
      : '') +

    habSec + objSec + subSec + finSec +

    /* Spectacle-lens guidance — reads the issued Rx (final if written, else
       subjective). Standard optical practice; self-gates until a power exists. */
    '<div class="dv"><span>Spectacle Lens Guidance</span></div>' +
    (typeof renderSpectacleAdvisor === "function" ? renderSpectacleAdvisor() :
      '<div style="font-size:.62rem;color:var(--sv);padding:8px">Enter refraction to generate lens recommendations.</div>') +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'va\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'refraction\',\'dilation\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 08: DILATION                                               */
/* ═══════════════════════════════════════════════════════════════ */

function pgDil() {
  return '<div class="card">' +
    '<div class="card-t">Dilation</div>' +
    '<div class="card-s">Cycloplegic / mydriatic documentation</div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Drug</label>' +
        '<select oninput="V.dil.drug=this.value">' +
          DIL_DRUGS.map(function(d) { return '<option value="' + d + '"' + (V.dil.drug === d ? ' selected' : '') + '>' + (d || "Not dilated") + '</option>'; }).join("") +
        '</select></div>' +
      '<div class="fi"><label>Time</label>' +
        '<input type="time" value="' + esc(V.dil.time) + '" oninput="V.dil.time=this.value"></div>' +
      '<div class="fi"><label>Eye</label>' +
        '<select oninput="V.dil.eye=this.value">' +
          '<option' + (V.dil.eye === "OU" ? " selected" : "") + '>OU</option>' +
          '<option' + (V.dil.eye === "OD" ? " selected" : "") + '>OD</option>' +
          '<option' + (V.dil.eye === "OS" ? " selected" : "") + '>OS</option>' +
        '</select></div>' +
      '<div class="fi"><label>Drops</label>' +
        '<input type="number" value="' + (V.dil.drops || 1) + '" oninput="V.dil.drops=this.value" min="1" max="4"></div>' +
    '</div>' +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'refraction\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'dilation\',\'slit_lamp\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 09: SLIT LAMP                                              */
/* Per-eye fields + selectable findings with search                */
/* ═══════════════════════════════════════════════════════════════ */

function pgSL() {

  function slEye(eye) {
    var s = V.sl[eye];
    var p = "V.sl." + eye + ".";

    return '<div class="dv"><span>' + (eye === "od" ? "OD — Right Eye" : "OS — Left Eye") + '</span></div>' +
      '<div class="fg">' +
        '<div class="fi"><label>Lids</label><input value="' + esc(s.lids) + '" oninput="' + p + 'lids=this.value;runDiagnosticEngine();renderAdvisory()"></div>' +
        '<div class="fi"><label>Conjunctiva</label><input value="' + esc(s.conj) + '" oninput="' + p + 'conj=this.value;runDiagnosticEngine();renderAdvisory()"></div>' +
        '<div class="fi"><label>Cornea</label><input value="' + esc(s.cornea) + '" oninput="' + p + 'cornea=this.value;runDiagnosticEngine();renderAdvisory()"></div>' +
        '<div class="fi"><label>Van Herick</label>' +
          '<select oninput="' + p + 'vh=this.value;runDiagnosticEngine();renderAdvisory()">' +
            '<option value="">—</option>' +
            '<option' + (s.vh === "4" ? " selected" : "") + '>4 (Wide)</option>' +
            '<option' + (s.vh === "3" ? " selected" : "") + '>3 (Open)</option>' +
            '<option' + (s.vh === "2" ? " selected" : "") + '>2 (Narrow)</option>' +
            '<option' + (s.vh === "1" ? " selected" : "") + '>1 (V.narrow)</option>' +
            '<option' + (s.vh === "0" ? " selected" : "") + '>0 (Closed)</option>' +
          '</select></div>' +
        '<div class="fi"><label>AC Cells (SUN)</label>' +
          '<select oninput="' + p + 'cells=this.value;runDiagnosticEngine();renderAdvisory()">' +
            '<option>0</option>' +
            '<option' + (s.cells === "0.5+" ? " selected" : "") + '>0.5+</option>' +
            '<option' + (s.cells === "1+" ? " selected" : "") + '>1+</option>' +
            '<option' + (s.cells === "2+" ? " selected" : "") + '>2+</option>' +
            '<option' + (s.cells === "3+" ? " selected" : "") + '>3+</option>' +
            '<option' + (s.cells === "4+" ? " selected" : "") + '>4+</option>' +
          '</select></div>' +
        '<div class="fi"><label>AC Flare (SUN)</label>' +
          '<select oninput="' + p + 'flare=this.value;runDiagnosticEngine();renderAdvisory()">' +
            '<option>0</option>' +
            '<option' + (s.flare === "1+" ? " selected" : "") + '>1+</option>' +
            '<option' + (s.flare === "2+" ? " selected" : "") + '>2+</option>' +
            '<option' + (s.flare === "3+" ? " selected" : "") + '>3+</option>' +
            '<option' + (s.flare === "4+" ? " selected" : "") + '>4+</option>' +
          '</select></div>' +
        '<div class="fi"><label>Lens NS (LOCS)</label>' +
          '<select oninput="' + p + 'ns=this.value;runDiagnosticEngine();renderAdvisory()">' +
            [0,1,2,3,4,5,6].map(function(n) { return '<option' + (parseInt(s.ns) === n ? " selected" : "") + '>' + n + '</option>'; }).join("") +
          '</select></div>' +
        '<div class="fi"><label>Lens C</label>' +
          '<select oninput="' + p + 'c=this.value;runDiagnosticEngine();renderAdvisory()">' +
            [0,1,2,3,4,5].map(function(n) { return '<option' + (parseInt(s.c) === n ? " selected" : "") + '>' + n + '</option>'; }).join("") +
          '</select></div>' +
        '<div class="fi"><label>Lens PSC</label>' +
          '<select oninput="' + p + 'psc=this.value;runDiagnosticEngine();renderAdvisory()">' +
            [0,1,2,3,4,5].map(function(n) { return '<option' + (parseInt(s.psc) === n ? " selected" : "") + '>' + n + '</option>'; }).join("") +
          '</select></div>' +
        '<div class="fi"><label>TBUT (s)</label><input type="number" value="' + esc(s.but) + '" oninput="' + p + 'but=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="seconds"></div>' +
        '<div class="fi"><label>Schirmer (mm/5min)</label><input type="number" value="' + esc(s.schirmer) + '" oninput="' + p + 'schirmer=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="mm"></div>' +
        '<div class="fi full"><label>Notes</label><textarea oninput="' + p + 'notes=this.value">' + esc(s.notes) + '</textarea></div>' +
      '</div>';
  }

  /* Findings panel */
  var fh = '<div class="dv"><span>Select Findings</span></div>';
  fh += '<input class="search-box" placeholder="Search findings..." oninput="filterFinds(this.value,\'slf_\')">';

  /* Drawing button */
  fh += '<div style="margin-bottom:8px"><button class="btn btn-d" onclick="openDrawing(\'slit_lamp\')">✏ Draw Anterior Segment</button></div>';

  for (var sec in SL_FINDINGS) {
    var items = SL_FINDINGS[sec];
    var sid = "slf_" + sec.replace(/[^a-zA-Z]/g, "");
    var cnt = 0;
    for (var ci = 0; ci < items.length; ci++) {
      if (V.sl.findings.indexOf(items[ci]) >= 0) cnt++;
    }

    fh += '<div class="col-trig" onclick="togCollapse(\'' + sid + '\')">' +
      sec + (cnt > 0 ? ' <b>(' + cnt + ')</b>' : '') +
      '<span class="col-arrow">▶</span></div>';

    fh += '<div class="col-body' + (cnt > 0 ? " open" : "") + '" id="' + sid + '">';
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var isSel = V.sl.findings.indexOf(item) >= 0;
      fh += '<span class="fn' + (isSel ? " sel" : "") + '" onclick="togSlFind(\'' + item.replace(/'/g, "\\'") + '\')">' + item + '</span>';
    }
    fh += '</div>';
  }

  return '<div class="card">' +
    '<div class="card-t">Slit Lamp Examination</div>' +
    '<div class="card-s">Anterior segment — SUN grading & LOCS III</div>' +
    slEye("od") + slEye("os") + fh +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'dilation\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'slit_lamp\',\'iop\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 10: IOP                                                    */
/* ═══════════════════════════════════════════════════════════════ */

function pgIOP() {
  return '<div class="card">' +
    '<div class="card-t">Intraocular Pressure</div>' +

    '<div class="fg" style="margin-bottom:12px">' +
      '<div class="fi"><label>Method</label>' +
        '<select oninput="V.iop.method=this.value">' +
          IOP_METHODS.map(function(m) { return '<option' + (V.iop.method === m ? ' selected' : '') + '>' + m + '</option>'; }).join("") +
        '</select></div>' +
      '<div class="fi"><label>Time</label>' +
        '<input type="time" value="' + esc(V.iop.time) + '" oninput="V.iop.time=this.value"></div>' +
    '</div>' +

    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">IOP</div>' +
        '<input class="e-in" type="number" value="' + esc(V.iop.od) + '" oninput="V.iop.od=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="mmHg">' +
        '<input class="e-in" type="number" value="' + esc(V.iop.os) + '" oninput="V.iop.os=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="mmHg">' +
      '<div class="e-l">CCT</div>' +
        '<input class="e-in" type="number" value="' + esc(V.iop.od_cct) + '" oninput="V.iop.od_cct=this.value" placeholder="μm">' +
        '<input class="e-in" type="number" value="' + esc(V.iop.os_cct) + '" oninput="V.iop.os_cct=this.value" placeholder="μm">' +
    '</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'slit_lamp\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'iop\',\'pupil\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 11: PUPILS                                                 */
/* ═══════════════════════════════════════════════════════════════ */

function pgPup() {
  var h = '<div class="card">' +
    '<div class="card-t">Pupils</div>' +
    '<div class="card-s">Size, reactions, RAPD</div>' +

    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">Light</div>' +
        '<input class="e-in" value="' + esc(V.pupil.od_l) + '" oninput="V.pupil.od_l=this.value" placeholder="mm">' +
        '<input class="e-in" value="' + esc(V.pupil.os_l) + '" oninput="V.pupil.os_l=this.value" placeholder="mm">' +
      '<div class="e-l">Dark</div>' +
        '<input class="e-in" value="' + esc(V.pupil.od_dk) + '" oninput="V.pupil.od_dk=this.value" placeholder="mm">' +
        '<input class="e-in" value="' + esc(V.pupil.os_dk) + '" oninput="V.pupil.os_dk=this.value" placeholder="mm">' +
      '<div class="e-l">Direct</div>' +
        '<input class="e-in" value="' + esc(V.pupil.od_dir) + '" oninput="V.pupil.od_dir=this.value">' +
        '<input class="e-in" value="' + esc(V.pupil.os_dir) + '" oninput="V.pupil.os_dir=this.value">' +
      '<div class="e-l">Consens.</div>' +
        '<input class="e-in" value="' + esc(V.pupil.od_cons) + '" oninput="V.pupil.od_cons=this.value">' +
        '<input class="e-in" value="' + esc(V.pupil.os_cons) + '" oninput="V.pupil.os_cons=this.value">' +
    '</div>' +

    '<div class="dv"><span>RAPD</span></div>' +
    '<div class="fi" style="max-width:280px;margin-bottom:8px">' +
      '<label>RAPD</label>' +
      '<select oninput="V.pupil.rapd=this.value;runDiagnosticEngine();renderMain();renderAdvisory()">' +
        '<option' + (V.pupil.rapd === "None" ? " selected" : "") + '>None</option>' +
        '<option' + (V.pupil.rapd === "OD" ? " selected" : "") + '>OD</option>' +
        '<option' + (V.pupil.rapd === "OS" ? " selected" : "") + '>OS</option>' +
      '</select>' +
    '</div>';

  /* RAPD grade — only show when RAPD detected */
  if (V.pupil.rapd !== "None") {
    h += '<div class="fi" style="max-width:380px">' +
      '<label>RAPD Grade</label>' +
      '<select oninput="V.pupil.rapd_grade=this.value">' +
        '<option value="">Select grade</option>' +
        '<option' + (V.pupil.rapd_grade === "1" ? " selected" : "") + '>1 — Weak initial constriction then dilation</option>' +
        '<option' + (V.pupil.rapd_grade === "2" ? " selected" : "") + '>2 — Stall then dilation</option>' +
        '<option' + (V.pupil.rapd_grade === "3" ? " selected" : "") + '>3 — Immediate dilation</option>' +
        '<option' + (V.pupil.rapd_grade === "4" ? " selected" : "") + '>4 — Amaurotic — no constriction</option>' +
        '<option' + (V.pupil.rapd_grade === "5" ? " selected" : "") + '>5 — Amaurotic + no consensual</option>' +
      '</select>' +
    '</div>';
  }

  h += '<div class="fi full" style="margin-top:8px">' +
    '<label>Notes</label>' +
    '<textarea oninput="V.pupil.notes=this.value">' + esc(V.pupil.notes) + '</textarea>' +
  '</div>';

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'iop\')">← Back</button>' +
    '<button class="btn btn-p" onclick="goNext(\'pupil\',\'motility\')">Continue →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 12: OCULAR MOTILITY                                        */
/* ═══════════════════════════════════════════════════════════════ */

function pgMot() {
  return '<div class="card">' +
    '<div class="card-t">Ocular Motility</div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Versions</label>' +
        '<select oninput="V.mot.versions=this.value;runDiagnosticEngine();renderAdvisory()">' +
          '<option' + (V.mot.versions === "Full" ? " selected" : "") + '>Full</option>' +
          '<option' + (V.mot.versions === "Limited" ? " selected" : "") + '>Limited</option>' +
        '</select></div>' +
      '<div class="fi"><label>Ductions</label>' +
        '<select oninput="V.mot.ductions=this.value;runDiagnosticEngine();renderAdvisory()">' +
          '<option' + (V.mot.ductions === "Full" ? " selected" : "") + '>Full</option>' +
          '<option' + (V.mot.ductions === "Limited" ? " selected" : "") + '>Limited</option>' +
        '</select></div>' +
      '<div class="fi"><label>Saccades</label>' +
        '<select oninput="V.mot.saccades=this.value"><option>Normal</option><option>Hypometric</option><option>Hypermetric</option></select></div>' +
      '<div class="fi"><label>Pursuits</label>' +
        '<select oninput="V.mot.pursuits=this.value"><option>Normal</option><option>Jerky</option><option>Restricted</option></select></div>' +
      '<div class="fi"><label>Hirschberg</label>' +
        '<input value="' + esc(V.mot.hirsch) + '" oninput="V.mot.hirsch=this.value" placeholder="Ortho / ET / XT"></div>' +
      '<div class="fi"><label>Nystagmus</label>' +
        '<select oninput="V.mot.nystagmus=this.value;runDiagnosticEngine();renderAdvisory()"><option>None</option><option>Present — horizontal</option><option>Present — vertical</option><option>Present — rotary</option></select></div>' +
      '<div class="fi full"><label>Notes</label><textarea oninput="V.mot.notes=this.value;runDiagnosticEngine();renderAdvisory()">' + esc(V.mot.notes) + '</textarea></div>' +
    '</div>' +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'pupil\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'motility\',\'bv\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 13: BINOCULAR VISION                                       */
/* Morgan's norms, Hofstetter, vergence ranges                     */
/* ═══════════════════════════════════════════════════════════════ */

function pgBV() {
  var age = parseInt(P.age) || 25;
  var hof = hofstetter(age);

  return '<div class="card">' +
    '<div class="card-t">Binocular Vision</div>' +
    '<div class="card-s">Morgan\'s norms shown for reference</div>' +

    /* Cover Test */
    '<div class="dv"><span>Cover Test</span></div>' +
    '<div class="eg4">' +
      '<div></div><div class="e-h">Value</div><div class="e-h">Normal</div><div class="e-h">SD</div>' +
      '<div class="e-l">Dist</div>' +
        '<input class="e-in" value="' + esc(V.bv.ct_d) + '" oninput="V.bv.ct_d=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="e.g. 1 exo">' +
        '<div class="e-r">' + MORGANS.ph_d + '</div><div></div>' +
      '<div class="e-l">Near</div>' +
        '<input class="e-in" value="' + esc(V.bv.ct_n) + '" oninput="V.bv.ct_n=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="e.g. 6 exo">' +
        '<div class="e-r">' + MORGANS.ph_n + '</div><div></div>' +
    '</div>' +

    /* NPC */
    '<div class="dv"><span>NPC</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Break (cm)</label>' +
        '<input value="' + esc(V.bv.npc_b) + '" oninput="V.bv.npc_b=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="Normal ≤5cm">' +
        '<div class="fi-hint">CITT: ≥6cm abnormal</div></div>' +
      '<div class="fi"><label>Recovery (cm)</label>' +
        '<input value="' + esc(V.bv.npc_r) + '" oninput="V.bv.npc_r=this.value"></div>' +
    '</div>' +

    /* Vergence ranges */
    '<div class="dv"><span>Vergence Ranges (Blur / Break / Recovery)</span></div>' +
    ['BO Dist:bo_d:' + MORGANS.bo_d, 'BI Dist:bi_d:' + MORGANS.bi_d, 'BO Near:bo_n:' + MORGANS.bo_n, 'BI Near:bi_n:' + MORGANS.bi_n].map(function(r) {
      var p = r.split(":");
      return '<div class="eg5">' +
        '<div style="font-size:.66rem;font-weight:500">' + p[0] + '</div>' +
        '<input class="e-in" value="' + esc(V.bv[p[1] + "_bl"]) + '" oninput="V.bv[\'' + p[1] + '_bl\']=this.value" placeholder="Blur">' +
        '<input class="e-in" value="' + esc(V.bv[p[1] + "_bk"]) + '" oninput="V.bv[\'' + p[1] + '_bk\']=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="Break">' +
        '<input class="e-in" value="' + esc(V.bv[p[1] + "_r"]) + '" oninput="V.bv[\'' + p[1] + '_r\']=this.value" placeholder="Rec">' +
        '<div class="e-r">' + p[2] + '</div>' +
      '</div>';
    }).join("") +

    /* Accommodation */
    '<div class="dv"><span>Accommodation</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>AC/A</label><input value="' + esc(V.bv.aca) + '" oninput="V.bv.aca=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="3:1 to 5:1"></div>' +
      '<div class="fi"><label>Accom OD (D)</label><input value="' + esc(V.bv.acc_od) + '" oninput="V.bv.acc_od=this.value;runDiagnosticEngine();renderAdvisory()">' +
        '<div class="fi-hint">Hofstetter min: ' + (hof.min !== null ? hof.min + 'D' : '—') + '</div></div>' +
      '<div class="fi"><label>Accom OS (D)</label><input value="' + esc(V.bv.acc_os) + '" oninput="V.bv.acc_os=this.value"></div>' +
      '<div class="fi"><label>MAF OD (cpm)</label><input value="' + esc(V.bv.maf_od) + '" oninput="V.bv.maf_od=this.value;runDiagnosticEngine();renderAdvisory()">' +
        '<div class="fi-hint">Normal ≥12 cpm (monocular)</div></div>' +
      '<div class="fi"><label>MAF OS (cpm)</label><input value="' + esc(V.bv.maf_os) + '" oninput="V.bv.maf_os=this.value"></div>' +
      '<div class="fi"><label>BAF OD (cpm)</label><input value="' + esc(V.bv.baf_od) + '" oninput="V.bv.baf_od=this.value">' +
        '<div class="fi-hint">Normal ≥8 cpm (binocular)</div></div>' +
      '<div class="fi"><label>NRA</label><input value="' + esc(V.bv.nra) + '" oninput="V.bv.nra=this.value" placeholder="+2.00 to +2.50"></div>' +
      '<div class="fi"><label>PRA</label><input value="' + esc(V.bv.pra) + '" oninput="V.bv.pra=this.value" placeholder="-2.00 to -2.50"></div>' +
      '<div class="fi"><label>MEM OD</label><input value="' + esc(V.bv.mem_od) + '" oninput="V.bv.mem_od=this.value" placeholder="+0.25 to +0.75"></div>' +
      '<div class="fi"><label>MEM OS</label><input value="' + esc(V.bv.mem_os) + '" oninput="V.bv.mem_os=this.value"></div>' +
    '</div>' +

    /* Sensory */
    '<div class="dv"><span>Sensory</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Stereopsis</label><input value="' + esc(V.bv.stereo) + '" oninput="V.bv.stereo=this.value" placeholder="e.g. 40 sec arc"></div>' +
      '<div class="fi"><label>Worth 4-Dot Dist</label>' +
        '<select oninput="V.bv.w4d=this.value"><option value="">—</option><option>Fusion</option><option>Diplopia</option><option>Suppression OD</option><option>Suppression OS</option></select></div>' +
      '<div class="fi"><label>Worth 4-Dot Near</label>' +
        '<select oninput="V.bv.w4n=this.value"><option value="">—</option><option>Fusion</option><option>Diplopia</option><option>Suppression OD</option><option>Suppression OS</option></select></div>' +
    '</div>' +

    '<div class="fi full" style="margin-top:8px"><label>BV Notes</label>' +
      '<textarea oninput="V.bv.notes=this.value">' + esc(V.bv.notes) + '</textarea></div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'motility\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'bv\',\'gonioscopy\')">Continue →</button>' +
    '</div>' +
  '</div>';
}
