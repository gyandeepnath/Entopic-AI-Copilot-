/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — REPORT & PRESCRIPTION RENDERERS                       */
/* pgRpt: Clinical examination report (print-ready)               */
/* pgRxP: Spectacle prescription (print-ready)                    */
/* Referral letter generator                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 21: CLINICAL REPORT                                        */
/* ═══════════════════════════════════════════════════════════════ */

function pgRpt() {
  var nm = (P.first_name || "") + " " + (P.last_name || "");
  var dx = V.dxList || [];

  var h = '<div class="card">' +
    '<div class="card-t">Clinical Report</div>' +
    '<div class="card-s">Formatted for print — all entered data summarized</div>';

  /* Report content */
  h += '<div id="reportContent" style="font-family:var(--mono);font-size:.7rem;line-height:1.65;background:var(--wh);border:1px solid var(--ms);padding:24px;border-radius:var(--r);max-height:500px;overflow-y:auto">';

  /* Print header (hidden on screen, visible in print) */
  h += '<div class="print-only print-header">';
  h += '<div class="clinic-name">' + (CU ? escH(CU.clinic) : "") + '</div>';
  h += '<div class="clinic-info">' + (CU ? escH(CU.name) + ", " + escH(CU.cred) : "") + '</div>';
  h += '</div>';

  /* Report title */
  h += '<div style="text-align:center;font-weight:600;font-size:.85rem;margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--bk)">CLINICAL EXAMINATION REPORT</div>';

  /* Clinician + Date */
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:10px;font-size:.68rem">';
  h += '<span>Clinician: ' + (CU ? escH(CU.name) + ", " + escH(CU.cred) : "—") + '</span>';
  h += '<span>Date: ' + new Date().toLocaleDateString() + '</span>';
  h += '</div>';

  /* Patient info box */
  h += '<div style="border:1px solid var(--ms);padding:8px;border-radius:var(--r);margin-bottom:12px">';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:.68rem">';
  h += '<div><b>Name:</b> ' + escH(nm.trim()) + '</div>';
  h += '<div><b>MRN:</b> ' + escH(P.mrn) + '</div>';
  h += '<div><b>Age:</b> ' + (P.age || "—") + '</div>';
  h += '<div><b>Sex:</b> ' + (P.sex || "—") + '</div>';
  if (P.occupation) h += '<div><b>Occupation:</b> ' + escH(P.occupation) + '</div>';
  h += '</div></div>';

  /* Chief Complaint */
  if (V.cc) {
    h += '<div class="report-section"><b>Chief Complaint:</b> ' + escH(V.cc) + '</div>';
  }

  /* Temporal */
  if (V.temporal && (V.temporal.onset || V.temporal.duration || V.temporal.course)) {
    var temp = [];
    if (V.temporal.onset) temp.push("Onset: " + V.temporal.onset);
    if (V.temporal.duration) temp.push("Duration: " + V.temporal.duration);
    if (V.temporal.course) temp.push("Course: " + V.temporal.course);
    h += '<div class="report-section"><b>Pattern:</b> ' + temp.join(" · ") + '</div>';
  }

  /* Visual Acuity */
  if (V.va.od_un || V.va.od_bva) {
    h += '<div class="report-section"><b>Visual Acuity</b> (' + V.va.chart + ' @ ' + V.va.dist + ')<br>';
    h += '<table style="border-collapse:collapse;width:100%;margin-top:4px">';
    h += '<tr style="border-bottom:1px solid var(--ms)"><th style="text-align:left;padding:3px 8px;width:100px"></th><th style="padding:3px 8px">OD</th><th style="padding:3px 8px">OS</th></tr>';
    if (V.va.od_un || V.va.os_un) {
      h += '<tr><td style="padding:3px 8px">Unaided</td><td style="text-align:center;padding:3px 8px">' + (V.va.od_un || "—") + '</td><td style="text-align:center;padding:3px 8px">' + (V.va.os_un || "—") + '</td></tr>';
    }
    if (V.va.od_ph || V.va.os_ph) {
      h += '<tr><td style="padding:3px 8px">Pinhole</td><td style="text-align:center;padding:3px 8px">' + (V.va.od_ph || "—") + '</td><td style="text-align:center;padding:3px 8px">' + (V.va.os_ph || "—") + '</td></tr>';
    }
    if (V.va.od_bva || V.va.os_bva) {
      h += '<tr><td style="padding:3px 8px">BVA</td><td style="text-align:center;padding:3px 8px">' + (V.va.od_bva || "—") + '</td><td style="text-align:center;padding:3px 8px">' + (V.va.os_bva || "—") + '</td></tr>';
    }
    if (V.va.od_near || V.va.os_near) {
      h += '<tr><td style="padding:3px 8px">Near</td><td style="text-align:center;padding:3px 8px">' + (V.va.od_near || "—") + '</td><td style="text-align:center;padding:3px 8px">' + (V.va.os_near || "—") + '</td></tr>';
    }
    h += '</table></div>';
  }

  /* Refraction */
  if (V.rx.od_sph) {
    h += '<div class="report-section"><b>Refraction</b> (' + V.rx.method + ')<br>';
    h += '<table style="border-collapse:collapse;width:100%;margin-top:4px">';
    h += '<tr style="border-bottom:1px solid var(--ms)"><th style="text-align:left;padding:3px 6px">Eye</th><th style="padding:3px 6px">Sph</th><th style="padding:3px 6px">Cyl</th><th style="padding:3px 6px">Axis</th><th style="padding:3px 6px">Add</th><th style="padding:3px 6px">Prism</th></tr>';
    h += '<tr><td style="padding:3px 6px">OD</td><td style="text-align:center">' + (V.rx.od_sph || "—") + '</td><td style="text-align:center">' + (V.rx.od_cyl || "—") + '</td><td style="text-align:center">' + (V.rx.od_ax || "—") + '</td><td style="text-align:center">' + (V.rx.od_add || "—") + '</td><td style="text-align:center">' + (V.rx.od_prism || "—") + '</td></tr>';
    h += '<tr><td style="padding:3px 6px">OS</td><td style="text-align:center">' + (V.rx.os_sph || "—") + '</td><td style="text-align:center">' + (V.rx.os_cyl || "—") + '</td><td style="text-align:center">' + (V.rx.os_ax || "—") + '</td><td style="text-align:center">' + (V.rx.os_add || "—") + '</td><td style="text-align:center">' + (V.rx.os_prism || "—") + '</td></tr>';
    h += '</table>';
    var pd = V.rx.pd_bi ? ("PD: " + V.rx.pd_bi + " mm") : (V.rx.pd_od ? ("PD: OD " + V.rx.pd_od + " / OS " + V.rx.pd_os + " mm") : "");
    if (pd) h += '<div style="margin-top:4px">' + pd + '</div>';
    h += '</div>';
  }

  /* IOP */
  if (V.iop.od || V.iop.os) {
    h += '<div class="report-section"><b>IOP</b> (' + V.iop.method + '): OD ' + (V.iop.od || "—") + ' mmHg · OS ' + (V.iop.os || "—") + ' mmHg';
    if (V.iop.time) h += ' @ ' + V.iop.time;
    h += '</div>';
  }

  /* Pupils */
  if (V.pupil.rapd !== "None") {
    h += '<div class="report-section"><b>Pupils:</b> RAPD ' + V.pupil.rapd;
    if (V.pupil.rapd_grade) h += ' Grade ' + V.pupil.rapd_grade;
    h += '</div>';
  }

  /* Slit Lamp */
  if (V.sl.findings.length > 0) {
    h += '<div class="report-section"><b>Anterior Segment:</b> ' + V.sl.findings.join(", ") + '</div>';
  }

  /* BV Summary */
  if (V.bv.npc_b || V.bv.ct_n) {
    var bvSummary = [];
    if (V.bv.ct_d) bvSummary.push("CT Dist: " + V.bv.ct_d);
    if (V.bv.ct_n) bvSummary.push("CT Near: " + V.bv.ct_n);
    if (V.bv.npc_b) bvSummary.push("NPC: " + V.bv.npc_b + " cm");
    if (V.bv.acc_od) bvSummary.push("Acc OD: " + V.bv.acc_od + " D");
    h += '<div class="report-section"><b>Binocular Vision:</b> ' + bvSummary.join(" · ") + '</div>';
  }

  /* Fundus */
  if (V.fun.od.cd_v || V.fun.findings.length > 0) {
    h += '<div class="report-section"><b>Fundus</b> (' + V.fun.method + (V.fun.dilated ? ', dilated' : '') + '):<br>';
    if (V.fun.od.cd_v) h += 'C/D: OD ' + V.fun.od.cd_v + ' · OS ' + (V.fun.os.cd_v || "—") + '<br>';
    if (V.fun.findings.length > 0) h += 'Findings: ' + V.fun.findings.join(", ");
    h += '</div>';
  }

  /* Assessment */
  h += '<div style="margin-top:12px;border-top:1px solid var(--ms);padding-top:8px">';
  h += '<b>Assessment:</b><br>';
  if (dx.length > 0 && dx[0].cat !== "system" && dx[0].cat !== "error") {
    for (var di = 0; di < Math.min(dx.length, 5); di++) {
      h += (di + 1) + '. ' + dx[di].n + ' (' + dx[di].icd + ')';
      if (dx[di].evidence && dx[di].evidence.confidence) {
        h += ' — ' + dx[di].evidence.confidence;
      }
      h += '<br>';
    }
  } else {
    h += 'Pending further evaluation<br>';
  }
  h += '</div>';

  /* Plan */
  h += '<div class="report-section"><b>Plan:</b><br>' + escH(V.plan.mgmt || "—") + '<br>';
  if (V.plan.followup) h += 'Follow-up: ' + escH(V.plan.followup) + '<br>';
  if (V.plan.ref_to) h += 'Referral: ' + escH(V.plan.ref_to) + ' (' + escH(V.plan.ref_urgency) + ')';
  h += '</div>';

  /* Signature (print only) */
  h += '<div class="print-only print-sign"><div>Clinician Signature</div><div>Date</div></div>';

  /* Footer */
  h += '<div style="margin-top:12px;border-top:1px solid var(--ms);padding-top:6px;font-size:.54rem;color:var(--sv);text-align:center">';
  h += 'Generated by Entopic — Advisory clinical decision support. All diagnoses require clinical correlation.';
  h += '</div>';

  h += '</div>'; /* close reportContent */

  /* Buttons */
  h += '<div class="btn-g no-print">';
  h += '<button class="btn btn-s" onclick="nav(\'coding\')">← Back</button>';
  h += '<button class="btn btn-p" onclick="window.print()">🖨 Print Report</button>';
  h += '<button class="btn btn-s" onclick="generateReferralLetter()">📄 Referral Letter</button>';
  h += '<button class="btn btn-p" onclick="nav(\'prescription\')">Prescription →</button>';
  h += '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAGE 22: SPECTACLE PRESCRIPTION                                 */
/* ═══════════════════════════════════════════════════════════════ */

function pgRxP() {
  var nm = (P.first_name || "") + " " + (P.last_name || "");

  var h = '<div class="card">' +
    '<div class="card-t">Prescription</div>' +
    '<div class="card-s">Spectacle prescription — print-ready</div>';

  h += '<div id="rxPrint">';

  /* Print header */
  h += '<div class="print-only print-header">';
  h += '<div class="clinic-name">' + (CU ? escH(CU.clinic) : "") + '</div>';
  h += '<div class="clinic-info">' + (CU ? escH(CU.name) + ", " + escH(CU.cred) : "") + '</div>';
  h += '</div>';

  /* Title */
  h += '<div style="text-align:center;font-weight:600;font-size:1rem;margin:12px 0 8px;padding-bottom:8px;border-bottom:2px solid var(--bk)">SPECTACLE PRESCRIPTION</div>';

  /* Patient info */
  h += '<table style="width:100%;margin-bottom:14px;font-size:.74rem"><tr>';
  h += '<td><b>Patient:</b> ' + escH(nm.trim()) + '</td>';
  h += '<td><b>Age/Sex:</b> ' + (P.age || "—") + '/' + (P.sex ? P.sex.charAt(0) : "—") + '</td>';
  h += '<td><b>Date:</b> ' + new Date().toLocaleDateString() + '</td>';
  h += '<td><b>MRN:</b> ' + escH(P.mrn) + '</td>';
  h += '</tr></table>';

  /* Rx table */
  h += '<table class="rx-table">';
  h += '<thead><tr>';
  h += '<th style="text-align:left;width:50px">Eye</th>';
  h += '<th>Sphere</th><th>Cylinder</th><th>Axis</th><th>Add</th><th>Prism</th><th>Base</th>';
  h += '</tr></thead><tbody>';

  /* OD */
  h += '<tr>';
  h += '<td style="font-weight:700;text-align:left">OD</td>';
  h += '<td>' + (V.rx.od_sph || "plano") + '</td>';
  h += '<td>' + (V.rx.od_cyl || "—") + '</td>';
  h += '<td>' + (V.rx.od_ax ? V.rx.od_ax + "°" : "—") + '</td>';
  h += '<td>' + (V.rx.od_add || "—") + '</td>';
  h += '<td>' + (V.rx.od_prism || "—") + '</td>';
  h += '<td>' + (V.rx.od_base || "—") + '</td>';
  h += '</tr>';

  /* OS */
  h += '<tr>';
  h += '<td style="font-weight:700;text-align:left">OS</td>';
  h += '<td>' + (V.rx.os_sph || "plano") + '</td>';
  h += '<td>' + (V.rx.os_cyl || "—") + '</td>';
  h += '<td>' + (V.rx.os_ax ? V.rx.os_ax + "°" : "—") + '</td>';
  h += '<td>' + (V.rx.os_add || "—") + '</td>';
  h += '<td>' + (V.rx.os_prism || "—") + '</td>';
  h += '<td>' + (V.rx.os_base || "—") + '</td>';
  h += '</tr></tbody></table>';

  /* PD */
  var pdText = V.rx.pd_bi
    ? (V.rx.pd_bi + " mm (binocular)")
    : (V.rx.pd_od ? ("OD: " + V.rx.pd_od + " mm / OS: " + V.rx.pd_os + " mm") : "—");
  h += '<div style="font-size:.78rem;margin-bottom:14px"><b>Interpupillary Distance (PD):</b> ' + pdText + '</div>';

  /* Lens specifications (screen only) */
  h += '<div class="no-print">';
  h += '<div class="dv"><span>Lens Specifications</span></div>';
  h += '<div class="fg">';

  h += '<div class="fi"><label>Lens Type</label>' +
    '<select><option>Single Vision</option><option>Bifocal — Flat Top D28</option><option>Bifocal — Round Segment</option>' +
    '<option>Progressive — Standard</option><option>Progressive — Digital/Freeform</option><option>Occupational / Office</option></select></div>';

  h += '<div class="fi"><label>Material</label>' +
    '<select><option>CR-39 (1.50)</option><option>Polycarbonate (1.59)</option><option>Trivex (1.53)</option>' +
    '<option>Hi-Index 1.60</option><option>Hi-Index 1.67</option><option>Hi-Index 1.74</option><option>Glass</option></select></div>';

  h += '<div class="fi"><label>Coatings</label>' +
    '<select><option>Anti-reflective (MAR)</option><option>Blue Light Filter</option><option>Photochromic / Transitions</option>' +
    '<option>UV 400 Protection</option><option>Scratch Resistant</option><option>Hydrophobic + Oleophobic</option></select></div>';

  h += '<div class="fi"><label>Tint</label>' +
    '<select><option>None / Clear</option><option>Polarized Grey</option><option>Polarized Brown</option>' +
    '<option>Gradient Grey</option><option>Fixed Grey 50%</option><option>Fixed Brown 50%</option></select></div>';

  h += '</div></div>'; /* close .fg + .no-print */

  /* Signature (print only) */
  h += '<div class="print-only" style="margin-top:48px">';
  h += '<div style="display:flex;justify-content:space-between;padding:0 20px">';
  h += '<div style="text-align:center"><div style="border-top:1px solid #000;width:200px;padding-top:6px;font-size:9pt">Prescriber Signature</div></div>';
  h += '<div style="text-align:center"><div style="border-top:1px solid #000;width:140px;padding-top:6px;font-size:9pt">Date</div></div>';
  h += '<div style="text-align:center"><div style="border-top:1px solid #000;width:120px;padding-top:6px;font-size:9pt">License / Reg. No.</div></div>';
  h += '</div>';
  h += '<div style="text-align:center;margin-top:20px;font-size:8pt;color:#666">This prescription is valid for 12 months from date of issue unless otherwise specified.</div>';
  h += '</div>';

  h += '</div>'; /* close rxPrint */

  /* Buttons */
  h += '<div class="btn-g no-print">';
  h += '<button class="btn btn-s" onclick="nav(\'report\')">← Back</button>';
  h += '<button class="btn btn-p" onclick="window.print()">🖨 Print Prescription</button>';
  h += '<button class="btn btn-p" onclick="completeVisit()" style="background:var(--ch)">Complete Visit ✓</button>';
  h += '</div></div>';

  return h;
}


/* ═══════════════════════════════════════════════════════════════ */
/* REFERRAL LETTER GENERATOR                                       */
/* Auto-drafts a referral letter from visit data                   */
/* ═══════════════════════════════════════════════════════════════ */

function generateReferralLetter() {
  var nm = (P.first_name || "") + " " + (P.last_name || "");
  var dx = V.dxList || [];

  if (!V.plan.ref_to) {
    alert("No referral specified. Set a referral in the Plan section first.");
    return;
  }

  var letter = "";

  /* Header */
  letter += "REFERRAL LETTER\n";
  letter += "═".repeat(40) + "\n\n";

  /* From */
  letter += "From: " + (CU ? CU.name + ", " + CU.cred : "—") + "\n";
  letter += "Clinic: " + (CU ? CU.clinic : "—") + "\n";
  letter += "Date: " + new Date().toLocaleDateString() + "\n\n";

  /* To */
  letter += "To: " + V.plan.ref_to + "\n";
  letter += "Urgency: " + (V.plan.ref_urgency || "Routine") + "\n\n";

  /* Patient */
  letter += "RE: " + nm.trim() + "\n";
  letter += "Age: " + (P.age || "—") + " | Sex: " + (P.sex || "—") + " | MRN: " + P.mrn + "\n\n";

  /* Body */
  letter += "Dear Colleague,\n\n";
  letter += "I am referring the above patient for your expert opinion and management.\n\n";

  /* CC */
  if (V.cc) {
    letter += "Presenting Complaint: " + V.cc + "\n\n";
  }

  /* Key findings */
  letter += "Key Clinical Findings:\n";
  if (V.va.od_bva || V.va.od_un) {
    letter += "  VA: OD " + (V.va.od_bva || V.va.od_un || "—") + "  OS " + (V.va.os_bva || V.va.os_un || "—") + "\n";
  }
  if (V.iop.od || V.iop.os) {
    letter += "  IOP: OD " + (V.iop.od || "—") + "  OS " + (V.iop.os || "—") + " mmHg (" + V.iop.method + ")\n";
  }
  if (V.sl.findings.length > 0) {
    letter += "  Anterior: " + V.sl.findings.join(", ") + "\n";
  }
  if (V.fun.od.cd_v) {
    letter += "  C/D: OD " + V.fun.od.cd_v + "  OS " + (V.fun.os.cd_v || "—") + "\n";
  }
  if (V.fun.findings.length > 0) {
    letter += "  Fundus: " + V.fun.findings.join(", ") + "\n";
  }
  if (V.pupil.rapd !== "None") {
    letter += "  RAPD: " + V.pupil.rapd + "\n";
  }
  letter += "\n";

  /* Provisional diagnosis */
  if (dx.length > 0 && dx[0].cat !== "system") {
    letter += "Provisional Assessment:\n";
    for (var di = 0; di < Math.min(dx.length, 3); di++) {
      letter += "  " + (di + 1) + ". " + dx[di].n + " (" + dx[di].icd + ")\n";
    }
    letter += "\n";
  }

  /* Reason */
  letter += "Reason for Referral: " + (V.plan.mgmt || "Further evaluation and management") + "\n\n";

  /* Sign off */
  letter += "Thank you for seeing this patient.\n\n";
  letter += "Yours sincerely,\n\n\n";
  letter += (CU ? CU.name + "\n" + CU.cred : "—") + "\n";
  letter += "═".repeat(40) + "\n";

  /* Store in visit */
  V.plan.ref_letter = letter;

  /* Display */
  var content = document.getElementById("reportContent");
  if (content) {
    content.style.whiteSpace = "pre-wrap";
    content.textContent = letter;
  } else {
    /* Create a temporary display */
    var w = window.open("", "_blank", "width=700,height=900");
    w.document.write("<pre style='font-family:monospace;padding:24px;line-height:1.6'>" + escH(letter) + "</pre>");
    w.document.title = "Referral Letter — " + nm.trim();
  }
}
