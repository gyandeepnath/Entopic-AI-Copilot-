/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — UI PAGE RENDERERS (Part 2 of 2)                       */
/* Pages 14-22: Gonioscopy through Prescription                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 14: GONIOSCOPY                                             */
/* ═══════════════════════════════════════════════════════════════ */

function pgGon() {

  function gonEye(eye) {
    var g = V.gon[eye];
    var gradeOpts = function(sel) {
      return ["", "4", "3", "2", "1", "Slit", "0"].map(function(v) {
        return '<option' + (g[sel] === v ? ' selected' : '') + '>' + (v || "—") + '</option>';
      }).join("");
    };

    return '<div class="dv"><span>' + eye.toUpperCase() + '</span></div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">' +
        '<div class="fi"><label>Superior</label><select oninput="V.gon.' + eye + '.s=this.value">' + gradeOpts("s") + '</select></div>' +
        '<div class="fi"><label>Nasal</label><select oninput="V.gon.' + eye + '.n=this.value">' + gradeOpts("n") + '</select></div>' +
        '<div class="fi"><label>Inferior</label><select oninput="V.gon.' + eye + '.i=this.value">' + gradeOpts("i") + '</select></div>' +
        '<div class="fi"><label>Temporal</label><select oninput="V.gon.' + eye + '.t=this.value">' + gradeOpts("t") + '</select></div>' +
      '</div>' +
      '<div class="fg" style="margin-top:4px">' +
        '<div class="fi"><label>Pigmentation</label><input value="' + esc(g.pig) + '" oninput="V.gon.' + eye + '.pig=this.value" placeholder="0-4"></div>' +
        '<div class="fi"><label>Notes</label><input value="' + esc(g.notes) + '" oninput="V.gon.' + eye + '.notes=this.value" placeholder="PAS, NVA..."></div>' +
      '</div>';
  }

  return '<div class="card">' +
    '<div class="card-t">Gonioscopy</div>' +
    '<div class="card-s">Shaffer grading: 4=Wide open, 3=Open, 2=Narrow (20°), 1=Very narrow (10°), Slit, 0=Closed</div>' +
    gonEye("od") + gonEye("os") +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'bv\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'gonioscopy\',\'fundus\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 15: FUNDUS                                                 */
/* ═══════════════════════════════════════════════════════════════ */

function pgFun() {

  function funEye(eye) {
    var f = V.fun[eye];
    var p = "V.fun." + eye + ".";

    return '<div class="dv"><span>' + eye.toUpperCase() + '</span></div>' +
      '<div class="fg">' +
        '<div class="fi"><label>C/D Vertical</label>' +
          '<input class="e-in" value="' + esc(f.cd_v) + '" oninput="' + p + 'cd_v=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="0.0-1.0"></div>' +
        '<div class="fi"><label>C/D Horizontal</label>' +
          '<input class="e-in" value="' + esc(f.cd_h) + '" oninput="' + p + 'cd_h=this.value"></div>' +
        '<div class="fi"><label>NRR</label>' +
          '<input value="' + esc(f.nrr) + '" oninput="' + p + 'nrr=this.value;runDiagnosticEngine();renderAdvisory()"></div>' +
        '<div class="fi"><label>Disc</label>' +
          '<input value="' + esc(f.disc) + '" oninput="' + p + 'disc=this.value;runDiagnosticEngine();renderAdvisory()"></div>' +
        '<div class="fi"><label>Disc Margin</label>' +
          '<input value="' + esc(f.margin) + '" oninput="' + p + 'margin=this.value"></div>' +
        '<div class="fi"><label>Macula</label>' +
          '<input value="' + esc(f.mac) + '" oninput="' + p + 'mac=this.value"></div>' +
        '<div class="fi"><label>Vessels</label>' +
          '<input value="' + esc(f.vessels) + '" oninput="' + p + 'vessels=this.value"></div>' +
        '<div class="fi"><label>Periphery</label>' +
          '<input value="' + esc(f.periph) + '" oninput="' + p + 'periph=this.value"></div>' +
        '<div class="fi"><label>Vitreous</label>' +
          '<input value="' + esc(f.vit) + '" oninput="' + p + 'vit=this.value"></div>' +
        '<div class="fi full"><label>Notes</label>' +
          '<textarea oninput="' + p + 'notes=this.value">' + esc(f.notes) + '</textarea></div>' +
      '</div>';
  }

  /* Findings panel */
  var fh = '<div class="dv"><span>Select Findings</span></div>';
  fh += '<input class="search-box" placeholder="Search fundus findings..." oninput="filterFinds(this.value,\'fdf_\')">';

  /* Drawing button */
  fh += '<div style="margin-bottom:8px"><button class="btn btn-d" onclick="openDrawing(\'fundus\')">✏ Draw Fundus</button></div>';

  for (var sec in FUN_FINDINGS) {
    var items = FUN_FINDINGS[sec];
    var sid = "fdf_" + sec.replace(/[^a-zA-Z]/g, "");
    var cnt = 0;
    for (var ci = 0; ci < items.length; ci++) {
      if (V.fun.findings.indexOf(items[ci]) >= 0) cnt++;
    }

    fh += '<div class="col-trig" onclick="togCollapse(\'' + sid + '\')">' +
      sec + (cnt > 0 ? ' <b>(' + cnt + ')</b>' : '') +
      '<span class="col-arrow">▶</span></div>';

    fh += '<div class="col-body' + (cnt > 0 ? " open" : "") + '" id="' + sid + '">';
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii];
      var isSel = V.fun.findings.indexOf(item) >= 0;
      fh += '<span class="fn' + (isSel ? " sel" : "") + '" onclick="togFunFind(\'' + item.replace(/'/g, "\\'") + '\')">' + item + '</span>';
    }
    fh += '</div>';
  }

  return '<div class="card">' +
    '<div class="card-t">Fundus Examination</div>' +
    '<div class="fg" style="margin-bottom:10px">' +
      '<div class="fi"><label>Method</label>' +
        '<select oninput="V.fun.method=this.value"><option>90D</option><option>78D</option><option>BIO + 20D</option><option>Direct</option></select></div>' +
      '<div class="fi"><label>Dilated</label>' +
        '<select oninput="V.fun.dilated=this.value===\'Yes\'">' +
          '<option' + (V.fun.dilated ? ' selected' : '') + '>Yes</option>' +
          '<option' + (!V.fun.dilated ? ' selected' : '') + '>No</option>' +
        '</select></div>' +
    '</div>' +
    funEye("od") + funEye("os") + fh +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'gonioscopy\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'fundus\',\'neuro\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 16: NEURO-OPHTHALMOLOGY                                    */
/* ═══════════════════════════════════════════════════════════════ */

function pgNeu() {
  return '<div class="card">' +
    '<div class="card-t">Neuro-Ophthalmology</div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Colour Vision OD (Ishihara)</label>' +
        '<input value="' + esc(V.neuro.color_od) + '" oninput="V.neuro.color_od=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="e.g. 14/14"></div>' +
      '<div class="fi"><label>Colour Vision OS (Ishihara)</label>' +
        '<input value="' + esc(V.neuro.color_os) + '" oninput="V.neuro.color_os=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="e.g. 12/14"></div>' +
      '<div class="fi"><label>Confrontation VF OD</label>' +
        '<input value="' + esc(V.neuro.cvf_od) + '" oninput="V.neuro.cvf_od=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="Full / Defect"></div>' +
      '<div class="fi"><label>Confrontation VF OS</label>' +
        '<input value="' + esc(V.neuro.cvf_os) + '" oninput="V.neuro.cvf_os=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="Full / Defect"></div>' +
      '<div class="fi"><label>Amsler Grid</label>' +
        '<select oninput="V.neuro.amsler=this.value;runDiagnosticEngine();renderAdvisory()">' +
          '<option' + (V.neuro.amsler === "Normal" ? " selected" : "") + '>Normal</option>' +
          '<option' + (V.neuro.amsler === "Distortion" ? " selected" : "") + '>Distortion</option>' +
          '<option' + (V.neuro.amsler === "Scotoma" ? " selected" : "") + '>Scotoma</option>' +
        '</select></div>' +
      '<div class="fi full"><label>Neuro Notes</label>' +
        '<textarea oninput="V.neuro.notes=this.value">' + esc(V.neuro.notes) + '</textarea></div>' +
    '</div>' +
    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'fundus\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'neuro\',\'investigations\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 17: INVESTIGATIONS                                         */
/* OCT, Visual Fields, Topography, Pachymetry                     */
/* ═══════════════════════════════════════════════════════════════ */

function pgInv() {
  return '<div class="card">' +
    '<div class="card-t">Investigations</div>' +

    '<div class="dv"><span>OCT</span></div>' +
    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">RNFL (μm)</div>' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_rnfl_od) + '" oninput="V.inv.oct_rnfl_od=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="μm">' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_rnfl_os) + '" oninput="V.inv.oct_rnfl_os=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="μm">' +
      '<div class="e-l">CST (μm)</div>' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_cst_od) + '" oninput="V.inv.oct_cst_od=this.value" placeholder="μm">' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_cst_os) + '" oninput="V.inv.oct_cst_os=this.value" placeholder="μm">' +
      '<div class="e-l">GCC (μm)</div>' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_ganglion_od) + '" oninput="V.inv.oct_ganglion_od=this.value" placeholder="μm">' +
        '<input class="e-in" type="number" value="' + esc(V.inv.oct_ganglion_os) + '" oninput="V.inv.oct_ganglion_os=this.value" placeholder="μm">' +
    '</div>' +

    '<div class="dv"><span>Visual Field</span></div>' +
    '<div class="eg">' +
      '<div></div><div class="e-h">OD</div><div class="e-h">OS</div>' +
      '<div class="e-l">MD (dB)</div>' +
        '<input class="e-in" type="number" step="0.01" value="' + esc(V.inv.vf_md_od) + '" oninput="V.inv.vf_md_od=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="dB">' +
        '<input class="e-in" type="number" step="0.01" value="' + esc(V.inv.vf_md_os) + '" oninput="V.inv.vf_md_os=this.value;runDiagnosticEngine();renderAdvisory()" placeholder="dB">' +
      '<div class="e-l">PSD (dB)</div>' +
        '<input class="e-in" type="number" step="0.01" value="' + esc(V.inv.vf_psd_od) + '" oninput="V.inv.vf_psd_od=this.value" placeholder="dB">' +
        '<input class="e-in" type="number" step="0.01" value="' + esc(V.inv.vf_psd_os) + '" oninput="V.inv.vf_psd_os=this.value" placeholder="dB">' +
    '</div>' +
    '<div class="fi" style="margin-top:6px"><label>VF Pattern</label>' +
      '<input value="' + esc(V.inv.vf_pattern) + '" oninput="V.inv.vf_pattern=this.value" placeholder="Arcuate, nasal step, altitudinal..."></div>' +

    '<div class="dv"><span>Corneal Topography</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Topography OD</label><input value="' + esc(V.inv.topo_od) + '" oninput="V.inv.topo_od=this.value" placeholder="Pattern / Kmax"></div>' +
      '<div class="fi"><label>Topography OS</label><input value="' + esc(V.inv.topo_os) + '" oninput="V.inv.topo_os=this.value" placeholder="Pattern / Kmax"></div>' +
    '</div>' +

    '<div class="dv"><span>Pachymetry</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Pachymetry OD (μm)</label><input type="number" value="' + esc(V.inv.pachymetry_od) + '" oninput="V.inv.pachymetry_od=this.value" placeholder="μm"></div>' +
      '<div class="fi"><label>Pachymetry OS (μm)</label><input type="number" value="' + esc(V.inv.pachymetry_os) + '" oninput="V.inv.pachymetry_os=this.value" placeholder="μm"></div>' +
    '</div>' +

    '<div class="fi full" style="margin-top:8px"><label>Investigation Notes</label>' +
      '<textarea oninput="V.inv.notes=this.value">' + esc(V.inv.notes) + '</textarea></div>' +

    '<div class="dv"><span>Attachments — scans, PDFs, images (OCT / VF / topography)</span></div>' +
    (typeof attachBlock === "function" ? attachBlock("visit") : "") +

    '<div class="btn-g" style="margin-top:12px">' +
      '<button class="btn btn-s" onclick="nav(\'neuro\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'investigations\',\'diagnosis\')">Diagnosis →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 18: DIAGNOSIS / DIFFERENTIAL                               */
/* Shows engine results with evidence trails                       */
/* ═══════════════════════════════════════════════════════════════ */

function pgDx() {
  /* Run engine to ensure latest results */
  runDiagnosticEngine();

  var h = '<div class="card">' +
    '<div class="card-t">Diagnosis / Differential</div>' +
    '<div class="card-s">Evidence-based reasoning — only conditions with clinical support shown</div>';

  /* Alerts */
  if (V.alerts && V.alerts.length > 0) {
    h += '<div style="margin-bottom:12px">';
    for (var ai = 0; ai < V.alerts.length; ai++) {
      h += '<div class="alert-box ' + V.alerts[ai].l + '">' + V.alerts[ai].m + '</div>';
    }
    h += '</div>';
  }

  /* Nudges */
  if (V.nudges && V.nudges.length > 0) {
    h += '<div class="dv"><span>Improve Diagnostic Confidence</span></div>';
    for (var ni = 0; ni < V.nudges.length; ni++) {
      h += '<div class="nudge" onclick="nav(\'' + V.nudges[ni].t + '\')">→ ' + V.nudges[ni].m + '</div>';
    }
  }

  /* Differential list */
  h += '<div class="dv"><span>Differential Considerations</span></div>';

  if (!V.dxList || V.dxList.length === 0) {
    h += '<div style="padding:16px;text-align:center;color:var(--sv);border:1px dashed var(--ms);border-radius:var(--r);font-size:.76rem">' +
      'No differential diagnoses yet.<br>Enter symptoms, clinical findings, and examination data to generate evidence-based suggestions.' +
    '</div>';
  } else {
    for (var di = 0; di < V.dxList.length; di++) {
      var d = V.dxList[di];
      var pct = (d.prob * 100).toFixed(0);
      var ev = d.evidence || {};

      h += '<div style="padding:10px 12px;border-left:3px solid ' + (d.urgent ? 'var(--md)' : 'var(--bk)') + ';margin-bottom:6px;background:var(--sn);border-radius:0 var(--r) var(--r) 0">';

      /* Title row */
      h += '<div style="display:flex;justify-content:space-between;align-items:center">';
      h += '<div><div style="font-weight:600;font-size:.8rem">' + d.n + '</div>';
      h += '<div style="font-size:.52rem;color:var(--sv);font-family:var(--mono)">' + d.icd + ' · ' + d.cat + (d.domain ? ' · ' + d.domain : '') + '</div></div>';
      h += '<div style="font-family:var(--mono);font-weight:600;font-size:.92rem">' + pct + '%</div>';
      h += '</div>';

      /* Evidence trail */
      if (ev.matched && ev.matched.length > 0) {
        h += '<div style="font-size:.56rem;color:var(--sl);margin-top:4px">';
        h += '<span style="color:var(--ink)">Matched:</span> ' + ev.matched.join(", ");
        if (ev.missing && ev.missing.length > 0) {
          h += ' · <span style="color:var(--md);font-style:italic">Missing: ' + ev.missing.join(", ") + '</span>';
        }
        if (ev.contradicted && ev.contradicted.length > 0) {
          h += ' · <span style="color:var(--md)">Against: ' + ev.contradicted.join(", ") + '</span>';
        }
        h += '</div>';
      }

      /* Suggested tests */
      if (ev.suggestedTests && ev.suggestedTests.length > 0) {
        h += '<div style="font-size:.54rem;color:var(--md);margin-top:2px">Tests: ' + ev.suggestedTests.join(", ") + '</div>';
      }

      h += '</div>'; /* close dx card */
    }
  }

  /* Engine stats */
  h += '<div style="margin-top:12px;font-size:.52rem;color:var(--sv);text-align:center">' +
    'Engine: ' + ENGINE_STATE.tokens.length + ' tokens · ' + ENGINE_STATE.routes.length + ' routes · ' +
    (typeof KNOWLEDGE_ALL !== "undefined" ? KNOWLEDGE_ALL.length : 0) + ' conditions evaluated' +
  '</div>';

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'investigations\')">← Back</button>' +
    '<button class="btn btn-p" onclick="nav(\'plan\')">Plan →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 19: PLAN / MANAGEMENT                                     */
/* ═══════════════════════════════════════════════════════════════ */

function pgPlan() {
  return '<div class="card">' +
    '<div class="card-t">Plan / Management</div>' +
    '<div class="card-s">Treatment approach — prescribing per scope of practice</div>' +

    '<div class="fi full" style="margin-bottom:10px">' +
      '<label>Management</label>' +
      '<textarea oninput="V.plan.mgmt=this.value" style="min-height:80px" placeholder="Treatment plan...">' + esc(V.plan.mgmt) + '</textarea>' +
    '</div>' +

    /* Quick-add management chips */
    '<div class="chips" style="margin-bottom:12px">' +
      ["PF artificial tears", "Warm compress + lid hygiene", "20-20-20 rule", "UV protection",
       "AREDS2 supplementation", "Vision therapy referral", "Ergonomic advice",
       "Anti-allergy drops", "Lubricant gel at night", "Review in 2 weeks"].map(function(r) {
        return '<span class="chip" onclick="V.plan.mgmt+=(V.plan.mgmt?\'\\n\':\'\')+ \'• ' + r + '\';renderMain()">' + r + '</span>';
      }).join("") +
    '</div>' +

    '<div class="fg">' +
      '<div class="fi"><label>Follow-up</label>' +
        '<input value="' + esc(V.plan.followup) + '" oninput="V.plan.followup=this.value" placeholder="2 weeks, 1 month..."></div>' +
      '<div class="fi"><label>Patient Education</label>' +
        '<input value="' + esc(V.plan.education) + '" oninput="V.plan.education=this.value" placeholder="Key points discussed"></div>' +
    '</div>' +

    '<div class="dv"><span>Referral</span></div>' +
    '<div class="fg">' +
      '<div class="fi"><label>Refer To</label>' +
        '<select oninput="V.plan.ref_to=this.value">' +
          '<option value="">None</option>' +
          '<option' + (V.plan.ref_to === "Ophthalmologist" ? " selected" : "") + '>Ophthalmologist</option>' +
          '<option' + (V.plan.ref_to === "Cornea specialist" ? " selected" : "") + '>Cornea specialist</option>' +
          '<option' + (V.plan.ref_to === "Glaucoma specialist" ? " selected" : "") + '>Glaucoma specialist</option>' +
          '<option' + (V.plan.ref_to === "Retina specialist" ? " selected" : "") + '>Retina specialist</option>' +
          '<option' + (V.plan.ref_to === "Neuro-ophthalmologist" ? " selected" : "") + '>Neuro-ophthalmologist</option>' +
          '<option' + (V.plan.ref_to === "Paediatric ophthalmologist" ? " selected" : "") + '>Paediatric ophthalmologist</option>' +
          '<option' + (V.plan.ref_to === "GP / Physician" ? " selected" : "") + '>GP / Physician</option>' +
          '<option' + (V.plan.ref_to === "Neurologist" ? " selected" : "") + '>Neurologist</option>' +
          '<option' + (V.plan.ref_to === "Endocrinologist" ? " selected" : "") + '>Endocrinologist</option>' +
        '</select></div>' +
      '<div class="fi"><label>Urgency</label>' +
        '<select oninput="V.plan.ref_urgency=this.value">' +
          '<option value="">—</option>' +
          '<option' + (V.plan.ref_urgency === "Routine" ? " selected" : "") + '>Routine</option>' +
          '<option' + (V.plan.ref_urgency === "Soon (within 2 weeks)" ? " selected" : "") + '>Soon (within 2 weeks)</option>' +
          '<option' + (V.plan.ref_urgency === "Urgent (within 48 hours)" ? " selected" : "") + '>Urgent (within 48 hours)</option>' +
          '<option' + (V.plan.ref_urgency === "Emergency (same day)" ? " selected" : "") + '>Emergency (same day)</option>' +
        '</select></div>' +
    '</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'diagnosis\')">← Back</button>' +
      '<button class="btn btn-p" onclick="nav(\'coding\')">Coding →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 20: ICD-10 CODING                                          */
/* Auto-suggested from differential                                */
/* ═══════════════════════════════════════════════════════════════ */

function pgCode() {
  var h = '<div class="card">' +
    '<div class="card-t">ICD-10 Coding</div>' +
    '<div class="card-s">Auto-suggested from differential — select laterality</div>';

  if (!V.dxList || V.dxList.length === 0) {
    h += '<p style="color:var(--sv);padding:12px">No codes available — enter clinical data first.</p>';
  } else {
    var filtered = V.dxList.filter(function(d) { return d.prob > 0.05; }).slice(0, 8);
    var anyProvisional = false;
    for (var ci = 0; ci < filtered.length; ci++) {
      var d = filtered[ci];
      var codeCell = d.icd
        ? '<span style="font-family:var(--mono);font-weight:600" title="' + (d.icd_label || '') + '">' + d.icd + '</span>'
        : '<span style="color:var(--sv);font-style:italic" title="No default code mapped yet">— </span>';
      var flag = '';
      if (d.icd && d.icd_status === 'NEEDS_CLINICAL_REVIEW') {
        anyProvisional = true;
        flag = '<span title="Provisional default (unspecified laterality/stage) — verify before use" ' +
               'style="color:var(--wn,#b8860b);font-size:.6rem;font-weight:600">⚠ verify</span>';
      }
      h += '<div style="display:flex;gap:8px;padding:8px 0;border-bottom:1px solid var(--fg);font-size:.72rem;align-items:center">' +
        '<span style="min-width:60px">' + codeCell + '</span>' +
        '<span style="flex:1">' + d.n + '</span>' +
        flag +
        '<select style="font-size:.62rem;padding:2px 4px;border:1px solid var(--fg);border-radius:2px">' +
          '<option>OU</option><option>OD</option><option>OS</option><option>Unspecified</option>' +
        '</select>' +
        '<span style="font-family:var(--mono);font-size:.62rem;min-width:30px;text-align:right">' + (d.prob * 100).toFixed(0) + '%</span>' +
      '</div>';
    }
    if (anyProvisional) {
      h += '<p style="color:var(--sv);font-size:.6rem;padding:8px 0 0">' +
        '⚠ Codes are provisional ICD-10-CM defaults (unspecified eye/stage) for clinician review. ' +
        'Confirm the code and set laterality/stage before finalizing. Advisory only — not a billing decision.</p>';
    }
  }

  h += '<div class="btn-g">' +
    '<button class="btn btn-s" onclick="nav(\'plan\')">← Back</button>' +
    '<button class="btn btn-p" onclick="nav(\'report\')">Report →</button>' +
  '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGES 21-22: REPORT & PRESCRIPTION                              */
/* Defined in ui-report.js (separate file)                         */
/* Placeholder functions here in case ui-report.js hasn't loaded   */
/* ═══════════════════════════════════════════════════════════════ */

if (typeof pgRpt === "undefined") {
  function pgRpt() {
    return '<div class="card"><div class="card-t">Report</div>' +
      '<p style="color:var(--sv)">Report module loading...</p></div>';
  }
}

if (typeof pgRxP === "undefined") {
  function pgRxP() {
    return '<div class="card"><div class="card-t">Prescription</div>' +
      '<p style="color:var(--sv)">Prescription module loading...</p></div>';
  }
}
