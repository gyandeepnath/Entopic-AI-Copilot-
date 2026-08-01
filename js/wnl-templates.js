/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — "NORMAL (WNL)" QUICK-FILL TEMPLATES                   */
/*                                                                  */
/* One click fills a step with its normal result, marks it done and */
/* re-runs the engine, so normal findings become pertinent          */
/* negatives (a normal IOP derives `normal_iop`, which argues       */
/* against glaucoma). The clinician then only stops to type what is */
/* ABNORMAL — which is where the time in a routine exam goes.       */
/*                                                                  */
/* ⚠ THE RULE THESE TEMPLATES MUST FOLLOW                          */
/* ───────────────────────────────────────                          */
/* A template may assert a normal RESULT. It must not invent a      */
/* MEASUREMENT.                                                     */
/*                                                                  */
/* "Orthophoria", "Comitant", "Fusion (4 dots)", "Open (Grade 4)"   */
/* are results — the normal outcome of a test that was performed.   */
/* A stereo threshold in seconds of arc, an NPC break in            */
/* centimetres or a vergence range in prism dioptres is a number    */
/* SOMEBODY OBTAINED. Writing one nobody obtained puts a fabricated */
/* measurement in a medical record — the same defect as the         */
/* prescription that printed "plano" for an unmeasured refraction.  */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — the va, iop and fundus templates       */
/* PREDATE that rule and do write numbers: VA 6/6, IOP 15 mmHg,     */
/* C:D 0.3. Each is a plausible normal, and each records a figure   */
/* the clinician may not have measured. Whether that is acceptable  */
/* documentation shorthand or a defect is a clinical and            */
/* medico-legal judgement for the founder. Raised as CS-01 in the   */
/* Clinical Safety Register and deliberately NOT changed here:      */
/* altering what lands in a patient record is his call, not mine.   */
/*                                                                  */
/* Load order: after data-model.js. Only read on a button press.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var WNL_TEMPLATES = {
  va:        function () { V.va.od_un = V.va.od_un || "6/6"; V.va.os_un = V.va.os_un || "6/6"; },
  iop:       function () { V.iop.od = V.iop.od || "15"; V.iop.os = V.iop.os || "15"; V.iop.method = V.iop.method || "GAT"; },
  slit_lamp: function () {
    ["od", "os"].forEach(function (e) { if (V.sl[e]) { V.sl[e].lids = "WNL"; V.sl[e].conj = "White and quiet"; V.sl[e].cornea = "Clear"; V.sl[e].cells = "0"; V.sl[e].flare = "0"; V.sl[e].iris = "Normal"; } });
  },
  pupil:     function () { V.pupil.rapd = "None"; V.pupil.notes = V.pupil.notes || "PERRL, no RAPD"; },
  motility:  function () { V.mot.versions = "Full"; V.mot.ductions = "Full"; },
  gonioscopy: function () { ["od", "os"].forEach(function (e) { if (V.gon[e]) V.gon[e].s = V.gon[e].s || "Open (Grade 4)"; }); },
  fundus:    function () { ["od", "os"].forEach(function (e) { if (V.fun[e]) { V.fun[e].cd_v = V.fun[e].cd_v || "0.3"; } }); },
  neuro:     function () { V.neuro.color_od = V.neuro.color_od || "Normal"; V.neuro.notes = V.neuro.notes || "Colour, fields, Amsler normal"; },

  /* Binocular vision — the heaviest step in the exam (68 fields, measured).
     A routine BV screen that is entirely unremarkable previously had to be
     left blank, which is indistinguishable in the record from "not assessed".

     CATEGORICAL RESULTS ONLY, per the rule at the top of this file: no stereo
     threshold, no NPC break, no vergence range. Those are measurements. */
  bv:        function () {
    V.bv.ct_type_d = V.bv.ct_type_d || "Orthophoria";
    V.bv.ct_type_n = V.bv.ct_type_n || "Orthophoria";
    V.bv.comitancy = V.bv.comitancy || "Comitant";
    V.bv.w4d = V.bv.w4d || "Fusion (4 dots)";
    V.bv.w4n = V.bv.w4n || "Fusion (4 dots)";
    V.bv.correspondence = V.bv.correspondence || "Normal (NRC)";
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { WNL_TEMPLATES: WNL_TEMPLATES };
}
