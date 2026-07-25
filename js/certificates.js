/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CERTIFICATES                                           */
/*                                                                  */
/* Clinicians are routinely asked to certify things — colour-vision  */
/* status for an employer, low-vision status for a concession, a     */
/* fitness-to-drive opinion, spectacle/CL prescription validity.     */
/* Without a standard format each one is retyped from scratch.       */
/*                                                                  */
/* WHAT THIS IS: a set of MODIFIABLE templates that lay out a        */
/* standard structure and pre-fill the data already recorded in the  */
/* exam (VA, refraction, colour-vision result, fields). Every        */
/* statement line is editable before printing.                       */
/*                                                                  */
/* ⚠ WHAT THIS IS NOT: it does NOT decide whether the patient        */
/* passes. There are no eligibility thresholds, no pass/fail logic,  */
/* and no jurisdiction-specific standards encoded anywhere here —    */
/* those vary by country, employer and licensing authority, and      */
/* inventing them would be unsafe. The clinician writes the opinion  */
/* and signs it; Entopic only formats it and fills in the measured   */
/* findings. Templates are marked NEEDS_CLINICAL_REVIEW so the       */
/* founder can adapt the wording to local requirements.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CERT_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Each template: which findings to pull in, and the editable body lines. */
var CERTIFICATE_TEMPLATES = [
  {
    id: "colour_vision",
    title: "Colour Vision Assessment Certificate",
    blurb: "Records how colour vision was tested and what was found. The opinion line is yours to write.",
    sections: ["identity", "va", "colour"],
    statement:
      "The above-named person was examined on the date shown. Colour vision was assessed using the test " +
      "recorded above and the findings are as stated.\n\n" +
      "Opinion: ____________________________________________\n\n" +
      "Note: any occupational or licensing standard must be applied by the requesting authority; " +
      "this certificate reports examination findings."
  },
  {
    id: "low_vision",
    title: "Low Vision / Visual Impairment Assessment",
    blurb: "Records best-corrected acuity, fields and functional impact for a concession or support application.",
    sections: ["identity", "va", "refraction", "fields", "lowvision"],
    statement:
      "The above-named person was examined on the date shown. Best-corrected visual acuity and visual field " +
      "findings are as stated.\n\n" +
      "Functional impact: ____________________________________________\n\n" +
      "Opinion / category: ____________________________________________\n\n" +
      "Note: certification categories and eligibility thresholds are set by the relevant national or local " +
      "authority and must be applied by them; this certificate reports examination findings."
  },
  {
    id: "fitness_vision",
    title: "Visual Fitness Report",
    blurb: "A general 'vision examined, findings as follows' report for an employer, school or authority.",
    sections: ["identity", "va", "refraction", "colour", "fields"],
    statement:
      "The above-named person underwent an eye examination on the date shown. The findings recorded above " +
      "are a true record of that examination.\n\n" +
      "Remarks: ____________________________________________\n\n" +
      "Note: fitness standards vary by role and authority and are not applied by this report."
  },
  {
    id: "spectacle_rx",
    title: "Spectacle Prescription Certificate",
    blurb: "The issued prescription in a formal, signable layout.",
    sections: ["identity", "refraction_final", "va"],
    statement:
      "The prescription above was determined by examination on the date shown.\n\n" +
      "Recommended review: ____________________________________________"
  },
  {
    id: "contact_lens",
    title: "Contact Lens Specification",
    blurb: "The fitted contact-lens parameters, for supply or for the patient's records.",
    sections: ["identity", "contactlens", "va"],
    statement:
      "The contact lens specification above was determined by fitting and assessment on the date shown.\n\n" +
      "Aftercare interval: ____________________________________________\n\n" +
      "The wearer has been advised on handling, hygiene and the symptoms that require urgent review."
  }
];

function certTemplate(id) {
  for (var i = 0; i < CERTIFICATE_TEMPLATES.length; i++) {
    if (CERTIFICATE_TEMPLATES[i].id === id) return CERTIFICATE_TEMPLATES[i];
  }
  return null;
}

/* Working copy of the certificate being edited. */
var CERT_DRAFT = null;

function certStart(id) {
  var t = certTemplate(id);
  if (!t) return;
  CERT_DRAFT = {
    template: id,
    title: t.title,
    statement: t.statement,
    rows: certGather(t.sections),
    issued: new Date().toISOString().slice(0, 10),
    clinician: (typeof CU !== "undefined" && CU) ? (CU.name || CU.username || "") : "",
    reg_no: "",
    clinic: (typeof CU !== "undefined" && CU) ? (CU.clinic || "") : "",
    purpose: ""
  };
  renderMain();
}

function certClose() { CERT_DRAFT = null; renderMain(); }

function certSetRow(i, val) { if (CERT_DRAFT && CERT_DRAFT.rows[i]) CERT_DRAFT.rows[i].v = val; }
function certAddRow() {
  if (!CERT_DRAFT) return;
  CERT_DRAFT.rows.push({ l: "", v: "" });
  renderMain();
}
function certRemoveRow(i) { if (CERT_DRAFT) { CERT_DRAFT.rows.splice(i, 1); renderMain(); } }
function certSetLabel(i, val) { if (CERT_DRAFT && CERT_DRAFT.rows[i]) CERT_DRAFT.rows[i].l = val; }

/* Pull the findings already recorded in this exam into label/value rows.
   Everything remains editable afterwards. */
function certGather(sections) {
  var rows = [];
  var add = function (l, v) { if (v !== undefined && v !== null && String(v).trim() !== "") rows.push({ l: l, v: String(v) }); };
  var eyePair = function (l, od, os) {
    if ((od && String(od).trim()) || (os && String(os).trim())) {
      rows.push({ l: l, v: "OD " + (od || "—") + "   ·   OS " + (os || "—") });
    }
  };

  for (var i = 0; i < sections.length; i++) {
    var sec = sections[i];

    if (sec === "identity") {
      add("Name", ((P.first_name || "") + " " + (P.last_name || "")).trim());
      add("Age / Sex", (P.age ? P.age + "y" : "") + (P.sex ? " / " + P.sex : ""));
      add("Record no.", P.mrn || P.id || "");
    }

    if (sec === "va" && V.va) {
      eyePair("Unaided VA", V.va.od_un, V.va.os_un);
      eyePair("Best-corrected VA", V.rx && V.rx.sub_va_od ? V.rx.sub_va_od : V.va.od_bva,
                                    V.rx && V.rx.sub_va_os ? V.rx.sub_va_os : V.va.os_bva);
      eyePair("Near VA", V.va.od_near, V.va.os_near);
    }

    if ((sec === "refraction" || sec === "refraction_final") && V.rx) {
      var stage = (typeof rxStageHasData === "function" && rxStageHasData("fin")) ? "fin" : "";
      var pw = function (eye) {
        var k = function (s) { return V.rx[(stage ? stage + "_" : "") + eye + "_" + s] || ""; };
        var p = [k("sph"), k("cyl"), k("ax") ? "x " + k("ax") : "", k("add") ? "Add " + k("add") : ""]
          .filter(function (x) { return x; }).join(" / ");
        return p;
      };
      eyePair(stage === "fin" ? "Prescription issued" : "Refraction", pw("od"), pw("os"));
      add("Lens type", V.rx.fin_lens_type);
      add("Wearing advice", V.rx.fin_advice);
    }

    if (sec === "colour" && V.neuro) {
      var cv = V.neuro.cv || {};
      if (cv.status) {
        add("Colour vision result", cv.status);
        add("Test used", cv.test);
        eyePair("Colour vision score", cv.od_score, cv.os_score);
        if (cv.status === "Defective") {
          add("Axis described", cv.axis);
          add("Severity", cv.severity);
          add("Nature", cv.nature);
        }
      } else {
        eyePair("Colour vision", V.neuro.color_od, V.neuro.color_os);
      }
    }

    if (sec === "fields") {
      if (V.neuro) eyePair("Confrontation fields", V.neuro.cvf_od, V.neuro.cvf_os);
      if (V.inv) {
        eyePair("Visual field MD (dB)", V.inv.vf_md_od, V.inv.vf_md_os);
        add("Field defect pattern", V.inv.vf_pattern);
      }
    }

    if (sec === "lowvision") {
      add("Magnification / aid trialled", "");
      add("Reading performance with aid", "");
      add("Mobility / functional notes", "");
    }

    if (sec === "contactlens" && V.rx) {
      var cl = function (eye) {
        var k = function (s) { return V.rx["hab_" + eye + "_" + s] || ""; };
        return [k("sph"), k("cyl"), k("ax") ? "x " + k("ax") : ""].filter(function (x) { return x; }).join(" / ");
      };
      eyePair("Lens power", cl("od"), cl("os"));
      add("Base curve", V.rx.cl_bc);
      add("Diameter", V.rx.cl_dia);
      add("Modality", V.rx.cl_modality);
      add("Material", V.rx.cl_material);
      eyePair("VA with lenses", V.rx.hab_va_od, V.rx.hab_va_os);
    }
  }
  return rows;
}
