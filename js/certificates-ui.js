/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CERTIFICATE UI                                         */
/* Picker → editable draft → printable certificate.                 */
/* Every line is editable before printing; nothing is auto-decided.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function certBlock() {
  if (CERT_DRAFT) return certEditor();

  var h = '<div class="dv"><span>Certificates</span></div>' +
    '<div style="font-size:.58rem;color:var(--sv);margin-bottom:8px">' +
      'Standard, editable formats pre-filled from this exam. Entopic formats and fills in the measured ' +
      'findings — <b>the opinion and the signature are yours</b>. No eligibility thresholds or pass/fail ' +
      'rules are applied, because those are set by the requesting authority.' +
    '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">';
  CERTIFICATE_TEMPLATES.forEach(function (t) {
    h += '<button class="btn btn-s" style="font-size:.6rem" onclick="certStart(\'' + t.id + '\')" title="' + esc(t.blurb) + '">' +
      esc(t.title) + '</button>';
  });
  return h + '</div>';
}

function certEditor() {
  var d = CERT_DRAFT;
  var h = '<div class="dv"><span>Certificate — ' + esc(d.title) + '</span></div>' +
    '<div style="font-size:.56rem;color:var(--sv);margin-bottom:8px">' +
      'Edit any line. Blank lines are dropped from the printed certificate.</div>' +

    '<div class="fg" style="margin-bottom:8px">' +
      '<div class="fi"><label>Certificate title</label>' +
        '<input class="e-in" value="' + esc(d.title) + '" oninput="CERT_DRAFT.title=this.value"></div>' +
      '<div class="fi"><label>Issued on</label>' +
        '<input class="e-in" type="date" value="' + esc(d.issued) + '" oninput="CERT_DRAFT.issued=this.value"></div>' +
      '<div class="fi full"><label>Purpose / addressed to</label>' +
        '<input class="e-in" value="' + esc(d.purpose) + '" oninput="CERT_DRAFT.purpose=this.value" placeholder="e.g. For submission to the employer\'s occupational health department"></div>' +
    '</div>' +

    '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:8px 0 4px">Findings</div>';

  d.rows.forEach(function (r, i) {
    h += '<div style="display:flex;gap:6px;margin-bottom:4px;align-items:center">' +
      '<input class="e-in" style="flex:0 0 32%" value="' + esc(r.l) + '" oninput="certSetLabel(' + i + ',this.value)" placeholder="Label">' +
      '<input class="e-in" style="flex:1" value="' + esc(r.v) + '" oninput="certSetRow(' + i + ',this.value)" placeholder="Value">' +
      '<span style="cursor:pointer;color:var(--as,#c0392b);font-size:.6rem" onclick="certRemoveRow(' + i + ')">✕</span>' +
    '</div>';
  });
  h += '<div style="margin:6px 0"><button class="btn btn-s" style="font-size:.58rem" onclick="certAddRow()">+ Add line</button></div>';

  h += '<div class="fi full" style="margin-top:8px"><label>Statement</label>' +
      '<textarea style="min-height:120px" oninput="CERT_DRAFT.statement=this.value">' + esc(d.statement) + '</textarea></div>' +

    '<div class="fg" style="margin-top:8px">' +
      '<div class="fi"><label>Clinician</label>' +
        '<input class="e-in" value="' + esc(d.clinician) + '" oninput="CERT_DRAFT.clinician=this.value"></div>' +
      '<div class="fi"><label>Registration / licence no.</label>' +
        '<input class="e-in" value="' + esc(d.reg_no) + '" oninput="CERT_DRAFT.reg_no=this.value"></div>' +
      '<div class="fi"><label>Practice</label>' +
        '<input class="e-in" value="' + esc(d.clinic) + '" oninput="CERT_DRAFT.clinic=this.value"></div>' +
    '</div>' +

    '<div class="btn-g" style="margin-top:10px">' +
      '<button class="btn btn-s" onclick="certClose()">← Back to certificates</button>' +
      '<button class="btn btn-s" onclick="renderMain()">↻ Refresh preview</button>' +
      '<button class="btn btn-p" onclick="certPrint()">🖨 Print certificate</button>' +
    '</div>' +

    '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin:12px 0 4px">Preview</div>' +
    '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:14px;background:#fff">' + certHtml(d) + '</div>';

  return h;
}

/* The printable certificate body. Kept plain so it prints cleanly. */
function certHtml(d) {
  var rows = d.rows.filter(function (r) { return (r.l || "").trim() || (r.v || "").trim(); });
  var h = '<div style="font-family:Georgia,serif;color:#111;max-width:760px;margin:0 auto">' +
    '<div style="text-align:center;border-bottom:2px solid #111;padding-bottom:8px;margin-bottom:12px">' +
      '<div style="font-size:1.05rem;font-weight:700;letter-spacing:.02em">' + esc(d.title) + '</div>' +
      (d.clinic ? '<div style="font-size:.72rem;margin-top:2px">' + esc(d.clinic) + '</div>' : '') +
    '</div>';

  if (d.purpose) {
    h += '<div style="font-size:.74rem;margin-bottom:10px"><i>' + esc(d.purpose) + '</i></div>';
  }

  h += '<table style="width:100%;border-collapse:collapse;font-size:.78rem;margin-bottom:12px">';
  rows.forEach(function (r) {
    h += '<tr>' +
      '<td style="padding:3px 8px 3px 0;vertical-align:top;width:34%;color:#444">' + esc(r.l) + '</td>' +
      '<td style="padding:3px 0;vertical-align:top;font-weight:600">' + esc(r.v) + '</td>' +
    '</tr>';
  });
  h += '</table>';

  h += '<div style="font-size:.78rem;white-space:pre-wrap;line-height:1.5;margin-bottom:22px">' + esc(d.statement) + '</div>';

  h += '<table style="width:100%;font-size:.74rem;margin-top:26px"><tr>' +
      '<td style="width:55%">' +
        '<div style="border-top:1px solid #111;padding-top:3px">' +
          '<b>' + esc(d.clinician || "Clinician") + '</b>' +
          (d.reg_no ? '<div>Reg. no. ' + esc(d.reg_no) + '</div>' : '') +
        '</div>' +
      '</td>' +
      '<td style="width:45%;vertical-align:bottom">' +
        '<div style="border-top:1px solid #111;padding-top:3px">Date: ' + esc(d.issued) + '</div>' +
      '</td>' +
    '</tr></table>';

  h += '<div style="font-size:.6rem;color:#666;margin-top:18px;border-top:1px solid #ccc;padding-top:6px">' +
    'This certificate reports the findings of the examination named above. Any occupational, licensing or ' +
    'entitlement standard is applied by the requesting authority, not by this document. ' +
    'Prepared with Entopic — advisory clinical decision support; clinical responsibility rests with the signing clinician.' +
  '</div></div>';
  return h;
}

/* Print just the certificate, in its own window, without the app chrome. */
function certPrint() {
  if (!CERT_DRAFT) return;
  var w = window.open("", "_blank");
  if (!w) { alert("Allow pop-ups to print the certificate."); return; }
  w.document.write('<!doctype html><html><head><title>' + esc(CERT_DRAFT.title) +
    '</title><meta charset="utf-8"><style>body{margin:28px;background:#fff}</style></head><body>' +
    certHtml(CERT_DRAFT) + '</body></html>');
  w.document.close();
  if (typeof logAudit === "function") {
    logAudit("certificate_issued", CERT_DRAFT.title,
      { patient_id: (typeof CP !== "undefined" ? CP : null), visit_id: (typeof CV !== "undefined" ? CV : null) });
  }
  setTimeout(function () { try { w.print(); } catch (e) {} }, 300);
}
