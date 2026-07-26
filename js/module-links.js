/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — MODULE INTERCONNECTION                                 */
/*                                                                  */
/* Modules and clinic packs must not be islands. Three kinds of link */
/* live here, in one place so they stay inspectable:                 */
/*                                                                  */
/*   1. CARRY-IN  — a module shows what the core exam already        */
/*      recorded instead of asking for it again (dry-eye clinic      */
/*      showing the TBUT from the slit lamp, the OSDI from the chief */
/*      complaint, the refraction from the refraction step…).        */
/*   2. CARRY-ACROSS — a value entered in one place populates the    */
/*      other place that needs it (contact-lens module ⇄ the         */
/*      habitual-CL block on the refraction page).                   */
/*   3. CARRY-OUT — active modules and clinics appear in the report, */
/*      the SOAP note, the certificates and the export, so a         */
/*      paediatric or low-vision encounter reads as one record.      */
/*                                                                  */
/* Engine-facing links live in js/engine.js (SOURCE 11), NOT here —  */
/* everything the engine scores stays in the engine so the           */
/* diagnostic path has a single source of truth.                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Read a dotted path off the visit safely. */
function mlGet(path) {
  var parts = String(path).split(".");
  var o = V;
  for (var i = 0; i < parts.length; i++) {
    if (o === undefined || o === null) return "";
    o = o[parts[i]];
  }
  return (o === undefined || o === null) ? "" : String(o);
}

/* A read-only "already recorded" strip. Shows what the core exam holds and
   offers a jump to the step that owns it — the value is never duplicated
   into the module, so there is exactly one place it can be edited. */
function mlCarryIn(rows) {
  var live = rows.filter(function (r) { return mlGet(r.path) !== ""; });
  if (!live.length) return "";
  return '<div style="border:1px solid var(--fg);border-radius:var(--r);padding:8px 10px;margin-bottom:8px;background:var(--sn)">' +
    '<div style="font-size:.56rem;color:var(--sl);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">' +
      'Already recorded in this exam</div>' +
    live.map(function (r) {
      return '<div style="font-size:.6rem;display:flex;justify-content:space-between;gap:8px;padding:1px 0">' +
        '<span style="color:var(--sl)">' + esc(r.label) + '</span>' +
        '<span><b>' + esc(mlGet(r.path)) + '</b>' +
        (r.step ? ' <a href="#" onclick="nav(\'' + r.step + '\');return false" style="color:var(--md);font-size:.54rem">edit</a>' : '') +
        '</span></div>';
    }).join("") +
  '</div>';
}

/* What each module / clinic section carries in from the core exam. */
var ML_CARRY_IN = {
  cl_dryeye: [
    { label: "OSDI score", path: "osdi.total", step: "chief_complaint" },
    { label: "OSDI severity", path: "osdi.severity", step: "chief_complaint" },
    { label: "TBUT OD (slit lamp)", path: "sl.od.but", step: "slit_lamp" },
    { label: "TBUT OS (slit lamp)", path: "sl.os.but", step: "slit_lamp" },
    { label: "Schirmer OD", path: "sl.od.schirmer", step: "slit_lamp" },
    { label: "Schirmer OS", path: "sl.os.schirmer", step: "slit_lamp" }
  ],
  cl_refsurg: [
    { label: "Subjective OD", path: "rx.od_sph", step: "refraction" },
    { label: "Subjective OS", path: "rx.os_sph", step: "refraction" },
    { label: "BCVA OD", path: "rx.sub_va_od", step: "refraction" },
    { label: "BCVA OS", path: "rx.sub_va_os", step: "refraction" },
    { label: "Pachymetry OD (investigations)", path: "inv.pachymetry_od", step: "investigations" },
    { label: "Pachymetry OS (investigations)", path: "inv.pachymetry_os", step: "investigations" }
  ],
  cl_myopia: [
    { label: "Subjective OD", path: "rx.od_sph", step: "refraction" },
    { label: "Subjective OS", path: "rx.os_sph", step: "refraction" },
    { label: "Cycloplegic ret OD", path: "rx.cyclo_od_sph", step: "refraction" },
    { label: "Cycloplegic ret OS", path: "rx.cyclo_os_sph", step: "refraction" },
    { label: "AC/A", path: "bv.aca", step: "bv" },
    { label: "Accommodative lag OD", path: "bv.mem_od", step: "bv" }
  ],
  cl_oculoplasty: [
    { label: "Exophthalmometry OD", path: "orbit.exoph_od", step: "motility" },
    { label: "Exophthalmometry OS", path: "orbit.exoph_os", step: "motility" }
  ],
  paediatric: [
    { label: "VA unaided OD", path: "va.od_un", step: "va" },
    { label: "VA unaided OS", path: "va.os_un", step: "va" },
    { label: "Cover test (D)", path: "bv.ct_d", step: "bv" },
    { label: "Cover test (N)", path: "bv.ct_n", step: "bv" },
    { label: "Stereoacuity", path: "bv.stereo", step: "bv" },
    { label: "Cycloplegic ret OD", path: "rx.cyclo_od_sph", step: "refraction" }
  ],
  low_vision: [
    { label: "BCVA OD", path: "rx.sub_va_od", step: "refraction" },
    { label: "BCVA OS", path: "rx.sub_va_os", step: "refraction" },
    { label: "Near VA OD", path: "va.od_near", step: "va" },
    { label: "Near VA OS", path: "va.os_near", step: "va" },
    { label: "Confrontation field OD", path: "neuro.cvf_od", step: "neuro" },
    { label: "Confrontation field OS", path: "neuro.cvf_os", step: "neuro" }
  ],
  contact_lens: [
    { label: "Habitual CL power OD", path: "rx.hab_od_sph", step: "refraction" },
    { label: "Habitual CL power OS", path: "rx.hab_os_sph", step: "refraction" },
    { label: "Subjective OD", path: "rx.od_sph", step: "refraction" },
    { label: "Subjective OS", path: "rx.os_sph", step: "refraction" },
    { label: "TBUT OD", path: "sl.od.but", step: "slit_lamp" },
    { label: "TBUT OS", path: "sl.os.but", step: "slit_lamp" }
  ]
};

function mlCarryInFor(sectionId) {
  var rows = ML_CARRY_IN[sectionId];
  return rows ? mlCarryIn(rows) : "";
}

/* ── CARRY-ACROSS ────────────────────────────────────────────────
   The contact-lens module and the refraction page's habitual-CL block
   describe the same lenses. Rather than silently mirror (which hides
   which one is authoritative), offer an explicit one-tap copy. */
function mlPullClFromRefraction() {
  if (!V.cl) V.cl = {};
  var moved = 0;
  [["hab_od_sph", "od_power"], ["hab_od_cyl", "od_cyl"], ["hab_od_ax", "od_axis"],
   ["hab_os_sph", "os_power"], ["hab_os_cyl", "os_cyl"], ["hab_os_ax", "os_axis"],
   ["cl_bc", "od_bc"], ["cl_dia", "od_dia"], ["cl_modality", "modality"], ["cl_material", "material"]
  ].forEach(function (pair) {
    var v = V.rx ? V.rx[pair[0]] : "";
    if (v) { V.cl[pair[1]] = v; moved++; }
  });
  if (typeof renderMain === "function") renderMain();
  if (typeof toast === "function") {
    toast(moved ? ("Pulled " + moved + " value(s) from the refraction page.") : "Nothing recorded on the refraction page yet.");
  }
}

function mlClPullButton() {
  return '<div style="margin-bottom:8px">' +
    '<button class="btn btn-s" style="font-size:.58rem" onclick="mlPullClFromRefraction()">' +
      '↓ Pull current lens details from Refraction</button></div>';
}

/* ── CARRY-OUT ───────────────────────────────────────────────────
   Active modules and clinic packs summarised for the report / note. */

function mlActiveSections() {
  var out = [];
  if (typeof EXAM_MODULES !== "undefined" && V.modules) {
    EXAM_MODULES.forEach(function (m) {
      if (V.modules[m.id]) out.push({ kind: "module", id: m.id, label: m.label });
    });
  }
  if (typeof CLINIC_PACKS !== "undefined" && V.clinics) {
    CLINIC_PACKS.forEach(function (p) {
      if (!V.clinics[p.id]) return;
      (p.steps || []).forEach(function (st) {
        out.push({ kind: "clinic", id: st.id, label: p.label + " — " + st.label, packId: p.id });
      });
    });
  }
  return out;
}

/* Pull the non-empty values of one active section as label/value pairs. */
function mlSectionValues(sec) {
  var rows = [];
  var push = function (l, v) { if (v !== undefined && v !== null && String(v).trim() !== "") rows.push([l, String(v)]); };

  if (sec.kind === "clinic") {
    var def = (typeof clinicStepDef === "function") ? clinicStepDef(sec.id) : null;
    var store = (V.clinic && V.clinic[sec.id]) || {};
    if (def) {
      (def.groups || []).forEach(function (g) {
        (g.fields || []).forEach(function (f) {
          if (f.type === "eyes") {
            var od = store[f.k + "_od"], os = store[f.k + "_os"];
            if ((od && od.trim()) || (os && os.trim())) push(f.l, "OD " + (od || "—") + " · OS " + (os || "—"));
          } else push(f.l, store[f.k]);
        });
      });
    }
    return rows;
  }

  /* Modules keep hand-written pages, so pull their objects directly. */
  var map = { paediatric: "paed", low_vision: "lv", contact_lens: "cl" };
  var obj = V[map[sec.id]] || {};
  for (var k in obj) push(k.replace(/_/g, " "), obj[k]);
  return rows;
}

/* Report block for every active module / clinic. */
function mlReportSections() {
  var secs = mlActiveSections();
  if (!secs.length) return "";
  var h = "";
  secs.forEach(function (sec) {
    var rows = mlSectionValues(sec);
    if (!rows.length) return;
    h += '<div style="margin-top:10px"><b>' + esc(sec.label) + '</b>' +
      '<table style="width:100%;border-collapse:collapse;font-size:.62rem;margin-top:3px">' +
      rows.map(function (r) {
        return '<tr><td style="padding:1px 8px 1px 0;color:var(--sl);vertical-align:top;width:42%">' + esc(r[0]) + '</td>' +
          '<td style="padding:1px 0;vertical-align:top">' + esc(r[1]) + '</td></tr>';
      }).join("") + '</table></div>';
  });
  if (!h) return "";
  return '<div style="margin-top:12px;border-top:1px solid var(--ms);padding-top:8px">' +
    '<div style="font-weight:600;font-size:.68rem;margin-bottom:2px">Additional sections</div>' + h + '</div>';
}
