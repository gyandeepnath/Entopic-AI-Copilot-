/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — OPTIONAL EXAM MODULES                                  */
/* Paediatric · Low Vision · Contact Lens                           */
/*                                                                  */
/* These were the sections the founder called "almost negligible".   */
/* They are built as OPTIONAL modules rather than new core steps so  */
/* the 22-step flow is unchanged for a routine adult exam — switch a */
/* module on for a patient and its section appears in the sidebar.   */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — these record findings and internationally*/
/* used descriptive categories. They carry NO thresholds, normal      */
/* ranges, eligibility criteria or interpretation: magnification,     */
/* registration categories, amblyopia management and lens selection   */
/* are clinical decisions and remain the clinician's. Nothing here is */
/* fed to the diagnostic engine.                                     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Field helpers bound to a visit sub-object (V.paed / V.lv / V.cl). */
function modIn(obj, key, label, ph, hint) {
  return '<div class="fi"><label>' + label + '</label>' +
    '<input class="e-in" value="' + esc((V[obj] && V[obj][key]) || "") + '"' +
    ' oninput="V.' + obj + '[\'' + key + '\']=this.value" placeholder="' + (ph || "") + '">' +
    (hint ? '<div class="fi-hint">' + hint + '</div>' : '') + '</div>';
}
function modSel(obj, key, label, opts) {
  return '<div class="fi"><label>' + label + '</label>' +
    '<select oninput="V.' + obj + '[\'' + key + '\']=this.value">' +
    opts.map(function (o) {
      return '<option' + (((V[obj] && V[obj][key]) || "") === o ? " selected" : "") + '>' + o + '</option>';
    }).join("") + '</select></div>';
}
function modArea(obj, key, label, ph) {
  return '<div class="fi full"><label>' + label + '</label>' +
    '<textarea oninput="V.' + obj + '[\'' + key + '\']=this.value" placeholder="' + (ph || "") + '">' +
    esc((V[obj] && V[obj][key]) || "") + '</textarea></div>';
}
function modPair(obj, k1, k2, label, ph) {
  return '<div class="fi"><label>' + label + ' OD</label>' +
      '<input class="e-in" value="' + esc((V[obj] && V[obj][k1]) || "") + '" oninput="V.' + obj + '[\'' + k1 + '\']=this.value" placeholder="' + (ph || "") + '"></div>' +
    '<div class="fi"><label>' + label + ' OS</label>' +
      '<input class="e-in" value="' + esc((V[obj] && V[obj][k2]) || "") + '" oninput="V.' + obj + '[\'' + k2 + '\']=this.value" placeholder="' + (ph || "") + '"></div>';
}


/* ── The module switcher (shown on Demographics) ─────────────────── */

function moduleToggle(id) {
  if (!V.modules) V.modules = { paediatric: false, low_vision: false, contact_lens: false };
  V.modules[id] = !V.modules[id];
  renderSidebar();
  renderMain();
  if (typeof toast === "function") {
    toast(V.modules[id] ? "Module added to this exam." : "Module removed.");
  }
}

function moduleChooser() {
  if (!V.modules) V.modules = { paediatric: false, low_vision: false, contact_lens: false };
  var h = '<div class="dv"><span>Optional modules for this exam</span></div>' +
    '<div style="font-size:.58rem;color:var(--sv);margin-bottom:6px">' +
      'Switch on what this patient needs — the section appears in the sidebar. The core 22-step exam is unchanged.</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:6px">';
  EXAM_MODULES.forEach(function (m) {
    var on = !!V.modules[m.id];
    h += '<button class="btn ' + (on ? "btn-p" : "btn-s") + '" style="font-size:.6rem"' +
      ' title="' + esc(m.blurb) + '" onclick="moduleToggle(\'' + m.id + '\')">' +
      (on ? "✓ " : "+ ") + esc(m.label) + '</button>';
  });
  return h + '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* PAEDIATRIC MODULE                                                */
/* ═══════════════════════════════════════════════════════════════ */

function pgPaed() {
  if (!V.paed) V.paed = {};
  return '<div class="card">' +
    '<div class="card-t">Paediatric Assessment</div>' +
    '<div class="card-s">Age-appropriate acuity, fixation behaviour, squint and amblyopia work-up</div>' +
    ((typeof mlCarryInFor === "function") ? mlCarryInFor("paediatric") : "") +

    '<div class="dv"><span>Birth &amp; developmental history</span></div>' +
    '<div class="fg">' +
      modIn("paed", "ga", "Gestational age at birth", "weeks") +
      modIn("paed", "bw", "Birth weight", "g") +
      modIn("paed", "birth_hx", "Birth / neonatal history", "SCBU, oxygen, jaundice…") +
      modIn("paed", "milestones", "Developmental milestones", "Age appropriate / delayed") +
      modArea("paed", "systemic", "Relevant systemic / syndromic history", "Prematurity, Down syndrome, cerebral palsy, craniofacial…") +
    '</div>' +

    '<div class="dv"><span>Fixation behaviour</span></div>' +
    '<div class="fg">' +
      modSel("paed", "fix_od", "Fix &amp; follow OD", ["", "Central, steady, maintained", "Central, steady, not maintained", "Unsteady", "Not central", "Unable to assess"]) +
      modSel("paed", "fix_os", "Fix &amp; follow OS", ["", "Central, steady, maintained", "Central, steady, not maintained", "Unsteady", "Not central", "Unable to assess"]) +
      modIn("paed", "csm_od", "CSM notation OD", "e.g. CSM") +
      modIn("paed", "csm_os", "CSM notation OS", "e.g. CSM") +
      modSel("paed", "fix_ou", "Objection to occlusion", ["", "Equal either eye", "Objects to occluding OD", "Objects to occluding OS", "Not assessed"]) +
    '</div>' +

    '<div class="dv"><span>Objective / preferential-looking acuity</span></div>' +
    '<div class="fg">' +
      modSel("paed", "objective_test", "Test used", ["", "Teller acuity cards", "Cardiff cards", "Keeler cards", "Lea gratings", "Kay pictures", "Lea symbols", "HOTV", "Sheridan-Gardiner", "Snellen / LogMAR"]) +
      modPair("paed", "objective_od", "objective_os", "Result", "cy/deg or Snellen equiv") +
    '</div>' +

    '<div class="dv"><span>Red reflex &amp; cycloplegia</span></div>' +
    '<div class="fg">' +
      modSel("paed", "red_reflex_od", "Red reflex OD", ["", "Normal / symmetrical", "Dull", "Absent", "White (leukocoria)", "Not assessed"]) +
      modSel("paed", "red_reflex_os", "Red reflex OS", ["", "Normal / symmetrical", "Dull", "Absent", "White (leukocoria)", "Not assessed"]) +
      modSel("paed", "cycloplegic_done", "Cycloplegic refraction", ["", "Performed", "Not performed", "Deferred"]) +
      modIn("paed", "cyclo_agent", "Cycloplegic agent used", "Cyclopentolate 1%…") +
    '</div>' +
    '<div style="font-size:.56rem;color:var(--sv);margin-bottom:6px">' +
      'A white or absent red reflex is a red-flag appearance — record it here and act on it clinically; ' +
      'the finding is documentation, not a diagnosis.</div>' +

    '<div class="dv"><span>Squint</span></div>' +
    '<div class="fg">' +
      modSel("paed", "squint_present", "Squint present", ["", "No", "Yes", "Suspected"]) +
      modSel("paed", "squint_type", "Type", ["", "Esotropia", "Exotropia", "Hypertropia", "Hypotropia", "Mixed", "Pseudostrabismus"]) +
      modSel("paed", "squint_onset", "Onset", ["", "Congenital / infantile", "Acquired", "Unknown"]) +
      modSel("paed", "squint_constancy", "Constancy", ["", "Constant", "Intermittent", "Alternating"]) +
    '</div>' +

    '<div class="dv"><span>Amblyopia</span></div>' +
    '<div class="fg">' +
      modSel("paed", "amblyopia_suspected", "Amblyopia", ["", "No", "Suspected", "Present"]) +
      modSel("paed", "amblyopia_type", "Type", ["", "Refractive (anisometropic)", "Refractive (isoametropic)", "Strabismic", "Mixed", "Deprivation"]) +
      modIn("paed", "amblyopia_density", "Interocular acuity difference", "e.g. 3 lines") +
      modIn("paed", "occlusion_hx", "Occlusion / atropine history", "Hours per day, duration") +
      modSel("paed", "compliance", "Compliance", ["", "Good", "Partial", "Poor", "Not applicable"]) +
    '</div>' +

    '<div class="dv"><span>Context &amp; onward care</span></div>' +
    '<div class="fg">' +
      modIn("paed", "school_perf", "School / near-work performance", "") +
      modIn("paed", "screening_referral", "Source of referral", "School screening, health visitor, parent…") +
      modArea("paed", "notes", "Notes", "Cooperation, parental concern, plan discussed with carer…") +
    '</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'prescription\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'paediatric\',\'diagnosis\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* LOW VISION MODULE                                                */
/* ═══════════════════════════════════════════════════════════════ */

function pgLowVision() {
  if (!V.lv) V.lv = {};
  return '<div class="card">' +
    '<div class="card-t">Low Vision Assessment</div>' +
    '<div class="card-s">Function, magnification, aids and support — driven by what the patient wants to do</div>' +
    ((typeof mlCarryInFor === "function") ? mlCarryInFor("low_vision") : "") +

    '<div class="dv"><span>Goals &amp; background</span></div>' +
    '<div class="fg">' +
      modArea("lv", "goals", "What the patient wants to be able to do", "Read post, read a newspaper, see faces, cook, use a phone, continue work…") +
      modIn("lv", "diagnosis", "Underlying diagnosis", "") +
      modIn("lv", "onset", "Onset / duration of impairment", "") +
    '</div>' +

    '<div class="dv"><span>Measured function</span></div>' +
    '<div class="fg">' +
      modPair("lv", "va_dist_od", "va_dist_os", "Distance VA", "6/…") +
      modPair("lv", "va_near_od", "va_near_os", "Near VA", "N…") +
      modIn("lv", "va_best_binoc", "Best binocular VA", "") +
      modSel("lv", "near_chart", "Near chart used", ["", "N-notation", "M-notation", "LogMAR near", "Bailey-Lovie near", "MNRead"]) +
      modIn("lv", "working_dist", "Working distance used", "cm") +
    '</div>' +
    '<div class="fg">' +
      modSel("lv", "contrast_test", "Contrast sensitivity test", ["", "Pelli-Robson", "Mars", "CSV-1000", "Not tested"]) +
      modIn("lv", "contrast_score", "Contrast score", "log units") +
      modIn("lv", "reading_speed", "Reading speed / fluency", "words per minute, or descriptive") +
    '</div>' +

    '<div class="dv"><span>Visual field &amp; glare</span></div>' +
    '<div class="fg">' +
      modSel("lv", "field_status", "Functional field", ["", "Full", "Central loss", "Peripheral constriction", "Hemianopia", "Patchy / scotomata", "Not assessed"]) +
      modArea("lv", "field_notes", "Field notes", "Where the usable island of vision is, scanning strategy…") +
      modSel("lv", "glare", "Glare / photophobia", ["", "None", "Mild", "Moderate", "Severe"]) +
      modIn("lv", "lighting_pref", "Lighting preference", "Task lamp, position, level") +
      modIn("lv", "tint_trialled", "Tint / filter trialled", "") +
    '</div>' +

    '<div class="dv"><span>Magnification &amp; aids</span></div>' +
    '<div class="fg">' +
      modIn("lv", "mag_required", "Magnification that worked", "e.g. ×4") +
      modIn("lv", "mag_calc", "Basis for that figure", "How it was arrived at with this patient") +
      modArea("lv", "aids_trialled", "Aids trialled and how each performed", "Hand magnifier, stand magnifier, telescope, electronic magnifier, tablet zoom, screen reader…") +
      modIn("lv", "aid_issued", "Aid issued / recommended", "") +
      modSel("lv", "aid_outcome", "Outcome with the chosen aid", ["", "Goal achieved", "Partially achieved", "Not achieved", "For review"]) +
    '</div>' +
    '<div style="font-size:.56rem;color:var(--sv);margin-bottom:6px">' +
      'Magnification and aid selection are clinical judgements made with the patient — Entopic records them, it does not calculate or prescribe them.</div>' +

    '<div class="dv"><span>Training &amp; support</span></div>' +
    '<div class="fg">' +
      modSel("lv", "eccentric_viewing", "Eccentric viewing", ["", "Not required", "Taught", "Already using", "For training"]) +
      modArea("lv", "training_given", "Training / advice given", "Eccentric viewing, lighting, contrast, scanning, use of the aid…") +
      modIn("lv", "mobility", "Mobility / independence", "") +
      modIn("lv", "registration", "Certification / registration discussed", "") +
      modIn("lv", "support_referral", "Onward referral / support services", "Rehab officer, charity, social services, education…") +
      modIn("lv", "driving_discussed", "Driving discussed", "") +
      modArea("lv", "notes", "Notes", "") +
    '</div>' +
    '<div style="font-size:.56rem;color:var(--sv);margin-bottom:6px">' +
      'Certification / registration categories and driving standards are set by the relevant authority and are applied by them, not by Entopic.</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'prescription\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'low_vision\',\'diagnosis\')">Continue →</button>' +
    '</div>' +
  '</div>';
}


/* ═══════════════════════════════════════════════════════════════ */
/* CONTACT LENS MODULE                                              */
/* ═══════════════════════════════════════════════════════════════ */

function pgContactLens() {
  if (!V.cl) V.cl = {};

  function clRow(eye) {
    var e = eye.toLowerCase();
    var f = function (k, ph, w) {
      var key = e + "_" + k;
      return '<td><input class="e-in" value="' + esc(V.cl[key] || "") + '"' +
        ' oninput="V.cl[\'' + key + '\']=this.value" placeholder="' + ph + '" style="width:' + w + 'px"></td>';
    };
    return '<tr><td class="e-l">' + eye + '</td>' +
      f("bc", "BC", 50) + f("dia", "Dia", 48) + f("power", "Power", 58) +
      f("cyl", "Cyl", 52) + f("axis", "Axis", 44) + f("add", "Add", 48) + '</tr>';
  }

  return '<div class="card">' +
    '<div class="card-t">Contact Lens</div>' +
    '<div class="card-s">Fitting, assessment and aftercare</div>' +
    ((typeof mlCarryInFor === "function") ? mlCarryInFor("contact_lens") : "") +
    ((typeof mlClPullButton === "function") ? mlClPullButton() : "") +

    '<div class="dv"><span>Indication &amp; wearing history</span></div>' +
    '<div class="fg">' +
      modSel("cl", "indication", "Indication", ["", "Refractive / cosmetic", "Sport / occupational", "High ametropia", "Anisometropia", "Keratoconus / irregular cornea", "Post-surgical", "Therapeutic / bandage", "Prosthetic", "Myopia management", "Aphakia"]) +
      modIn("cl", "wear_hx", "Wearing history", "New wearer / years of wear") +
      modIn("cl", "previous_lens", "Current / previous lens", "Brand and parameters") +
      modIn("cl", "wear_time", "Typical wearing time", "hours/day, days/week") +
    '</div>' +

    '<div class="dv"><span>Pre-fitting measurements</span></div>' +
    '<div class="fg">' +
      modPair("cl", "k_od_1", "k_os_1", "K1 (D @ axis)", "") +
      modPair("cl", "k_od_2", "k_os_2", "K2 (D @ axis)", "") +
      modPair("cl", "hvid_od", "hvid_os", "HVID (mm)", "") +
      modPair("cl", "tbut_od", "tbut_os", "TBUT (s)", "") +
    '</div>' +

    '<div class="dv"><span>Lens selected</span></div>' +
    '<div class="fg" style="margin-bottom:6px">' +
      modSel("cl", "lens_type", "Lens type", ["", "Soft spherical", "Soft toric", "Soft multifocal", "RGP spherical", "RGP toric", "Scleral", "Mini-scleral", "Hybrid", "Ortho-K", "Bandage / therapeutic", "Prosthetic"]) +
      modSel("cl", "material", "Material", ["", "Silicone hydrogel", "Hydrogel", "RGP (high Dk)", "RGP (mid Dk)", "PMMA", "Hybrid"]) +
      modSel("cl", "modality", "Replacement", ["", "Daily disposable", "Two-weekly", "Monthly", "Quarterly", "Six-monthly", "Annual / custom"]) +
      modIn("cl", "brand", "Brand / design", "") +
    '</div>' +
    '<table style="width:100%;border-collapse:collapse;font-size:.72rem">' +
      '<thead><tr>' +
        '<th style="text-align:left;padding:4px;font-size:.56rem;color:var(--sl);text-transform:uppercase">Eye</th>' +
        ['BC', 'Dia', 'Power', 'Cyl', 'Axis', 'Add'].map(function (c) {
          return '<th style="padding:4px;font-size:.56rem;color:var(--sl);text-transform:uppercase">' + c + '</th>';
        }).join("") +
      '</tr></thead><tbody>' + clRow("OD") + clRow("OS") + '</tbody></table>' +

    '<div class="dv"><span>Fit assessment</span></div>' +
    '<div class="fg">' +
      modPair("cl", "centration_od", "centration_os", "Centration", "Central / decentred") +
      modPair("cl", "movement_od", "movement_os", "Movement / lag", "mm on blink") +
      modArea("cl", "fluorescein_od", "Fluorescein pattern OD", "Apical clearance / touch, edge lift, bearing…") +
      modArea("cl", "fluorescein_os", "Fluorescein pattern OS", "") +
      modPair("cl", "over_ref_od", "over_ref_os", "Over-refraction", "") +
      modPair("cl", "va_od", "va_os", "VA with lens", "6/…") +
      modSel("cl", "comfort", "Comfort", ["", "Excellent", "Good", "Acceptable", "Poor"]) +
    '</div>' +

    '<div class="dv"><span>Teaching, care &amp; aftercare</span></div>' +
    '<div class="fg">' +
      modSel("cl", "handling_taught", "Handling taught", ["", "Insertion &amp; removal taught and demonstrated back", "Partially — further session needed", "Already competent", "Not applicable"]) +
      modIn("cl", "solution", "Care system", "") +
      modIn("cl", "replacement", "Replacement schedule agreed", "") +
      modArea("cl", "hygiene_advice", "Hygiene &amp; safety advice given", "Hand washing, no water contact, no overnight wear unless prescribed, when to remove and seek help…") +
      modIn("cl", "aftercare", "Aftercare interval", "") +
      modArea("cl", "complications", "Complications / adverse findings", "Staining, neovascularisation, papillae, infiltrates…") +
      modArea("cl", "notes", "Notes", "") +
    '</div>' +

    '<div class="btn-g">' +
      '<button class="btn btn-s" onclick="nav(\'prescription\')">← Back</button>' +
      '<button class="btn btn-p" onclick="goNext(\'contact_lens\',\'diagnosis\')">Continue →</button>' +
    '</div>' +
  '</div>';
}
