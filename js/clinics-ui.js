/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SPECIALTY CLINIC UI                                    */
/* One generic renderer draws every clinic section from its data     */
/* definition in js/clinics.js, so adding a clinic never needs new   */
/* UI code. Values live under V.clinic[stepId][fieldKey].            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function clinicVal(stepId, key) {
  if (!V.clinic) V.clinic = {};
  if (!V.clinic[stepId]) V.clinic[stepId] = {};
  return V.clinic[stepId][key] || "";
}

function clinicSet(stepId, key, val) {
  if (!V.clinic) V.clinic = {};
  if (!V.clinic[stepId]) V.clinic[stepId] = {};
  V.clinic[stepId][key] = val;
}

/* Render one field from its definition. */
function clinicField(stepId, f) {
  var setter = function (k) {
    return 'clinicSet(\'' + stepId + '\',\'' + k + '\',this.value)';
  };

  if (f.type === "eyes") {
    return ["od", "os"].map(function (e) {
      var k = f.k + "_" + e;
      return '<div class="fi"><label>' + f.l + ' ' + e.toUpperCase() + '</label>' +
        '<input class="e-in" value="' + esc(clinicVal(stepId, k)) + '" oninput="' + setter(k) + '"' +
        ' placeholder="' + esc(f.ph || "") + '"></div>';
    }).join("");
  }

  if (f.type === "select") {
    var cur = clinicVal(stepId, f.k);
    return '<div class="fi"><label>' + f.l + '</label>' +
      '<select oninput="' + setter(f.k) + '">' +
      (f.opts || []).map(function (o) {
        return '<option' + (cur === o ? " selected" : "") + '>' + esc(o) + '</option>';
      }).join("") + '</select></div>';
  }

  if (f.type === "textarea") {
    return '<div class="fi full"><label>' + f.l + '</label>' +
      '<textarea oninput="' + setter(f.k) + '" placeholder="' + esc(f.ph || "") + '">' +
      esc(clinicVal(stepId, f.k)) + '</textarea></div>';
  }

  return '<div class="fi"><label>' + f.l + '</label>' +
    '<input class="e-in" value="' + esc(clinicVal(stepId, f.k)) + '" oninput="' + setter(f.k) + '"' +
    ' placeholder="' + esc(f.ph || "") + '"></div>';
}

/* Render a whole clinic section. */
function pgClinicStep(stepId) {
  var def = clinicStepDef(stepId);
  if (!def) {
    return '<div class="card"><div class="card-t">Section</div>' +
      '<p style="color:var(--sv);margin-top:8px">This clinic section is not available.</p></div>';
  }
  var pack = clinicPack(def.packId);

  var h = '<div class="card">' +
    '<div class="card-t">' + (pack ? pack.icon + " " : "") + esc(def.label) + '</div>' +
    '<div class="card-s">' + esc(pack ? pack.blurb : "") + '</div>' +
    /* What the core exam already holds — shown, not re-asked. */
    ((typeof mlCarryInFor === "function") ? mlCarryInFor(stepId) : "");

  (def.groups || []).forEach(function (g, gi) {
    var gid = "clg_" + stepId + "_" + gi;
    h += '<div class="col-trig" onclick="togCollapse(\'' + gid + '\')">' + esc(g.title) +
        '<span class="col-arrow">▶</span></div>' +
      '<div class="col-body' + (gi === 0 ? " open" : "") + '" id="' + gid + '">' +
        '<div class="fg">' +
          (g.fields || []).map(function (f) { return clinicField(stepId, f); }).join("") +
        '</div>' +
      '</div>';
  });

  h += '<div style="font-size:.54rem;color:var(--sv);margin-top:10px">' +
    'Documentation only — clinic sections record findings and standard categories. ' +
    'No candidacy, treatment or referral thresholds are applied here, and nothing on this page ' +
    'is read by the diagnostic engine.</div>';

  h += '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'diagnosis\')">← Diagnosis</button>' +
      '<button class="btn btn-p" onclick="goNext(\'' + stepId + '\',\'plan\')">Continue →</button>' +
    '</div>' +
  '</div>';
  return h;
}

/* The clinic picker, shown on Demographics under the module chooser. */
function clinicChooser() {
  if (!V.clinics) V.clinics = {};
  var h = '<div class="dv"><span>Specialty clinic</span></div>' +
    '<div style="font-size:.58rem;color:var(--sv);margin-bottom:6px">' +
      'Running a dedicated clinic or a screening camp? Switch it on and its sections join this exam. ' +
      'The core 22 steps stay exactly as they are.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">';
  CLINIC_PACKS.forEach(function (p) {
    var on = !!V.clinics[p.id];
    h += '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.6rem"' +
      ' title="' + esc(p.blurb) + '" onclick="clinicToggle(\'' + p.id + '\')">' +
      (on ? "✓ " : "") + p.icon + " " + esc(p.label) + '</button>';
  });
  return h + '</div>';
}
