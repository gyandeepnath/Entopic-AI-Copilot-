/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — INVESTIGATION ORDERS & HAND-OFF                        */
/*                                                                  */
/* The real clinic workflow this implements:                        */
/*   1. A clinician finishes the assessment and ORDERS investigations*/
/*      (with a clinical question and urgency).                     */
/*   2. The patient walks to another part of the hospital. A         */
/*      technician / different clinician opens the INVESTIGATION     */
/*      QUEUE, finds the pending order, performs the test, records   */
/*      the values, uploads the report, and marks it done.           */
/*   3. The patient returns. The ordering clinician sees "results    */
/*      ready", REVIEWS them against the differential, signs off,    */
/*      and finalises the diagnosis and advice.                     */
/*                                                                  */
/* Orders live on the PATIENT (not the visit) so they survive the    */
/* hand-off between people and sessions, but each carries the visit  */
/* it was raised from, so the results come back to the right         */
/* encounter.                                                       */
/*                                                                  */
/* ⚠ CLINICAL CONTENT: the catalogue below records the fields and    */
/* internationally-used descriptive categories of each test (e.g.    */
/* ICROP zone/stage for ROP). It contains NO thresholds, cut-offs,   */
/* normal ranges, or interpretation — those stay with the clinician. */
/* Nothing here diagnoses; results are documentation that the        */
/* clinician reviews. Marked NEEDS_CLINICAL_REVIEW for the founder.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var INV_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* Field types: text | num | select | textarea */
var INVESTIGATION_CATALOGUE = [
  /* ── Imaging / structural ── */
  { code: "OCT_RNFL", name: "OCT — RNFL", cat: "Imaging", eyes: true, fields: [
    { k: "avg", l: "Average RNFL (µm)", type: "num" },
    { k: "sup", l: "Superior (µm)", type: "num" },
    { k: "inf", l: "Inferior (µm)", type: "num" },
    { k: "quality", l: "Signal quality", type: "text" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "OCT_MAC", name: "OCT — Macula", cat: "Imaging", eyes: true, fields: [
    { k: "cst", l: "Central subfield thickness (µm)", type: "num" },
    { k: "volume", l: "Cube volume (mm³)", type: "num" },
    { k: "features", l: "Features seen", type: "text" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "OCT_GCC", name: "OCT — Ganglion cell / ONH", cat: "Imaging", eyes: true, fields: [
    { k: "gcc", l: "GCC / GCIPL (µm)", type: "num" },
    { k: "cdr", l: "Measured C:D", type: "text" },
    { k: "rim", l: "Rim area (mm²)", type: "num" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "OCT_ANT", name: "Anterior segment OCT", cat: "Imaging", eyes: true, fields: [
    { k: "acd", l: "Anterior chamber depth (mm)", type: "num" },
    { k: "angle", l: "Angle appearance", type: "text" },
    { k: "cornea", l: "Corneal findings", type: "textarea" }
  ]},
  { code: "OCTA", name: "OCT angiography", cat: "Imaging", eyes: true, fields: [
    { k: "faz", l: "FAZ appearance", type: "text" },
    { k: "flow", l: "Flow / non-perfusion", type: "textarea" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "FUNDUS_PHOTO", name: "Fundus photography", cat: "Imaging", eyes: true, fields: [
    { k: "field", l: "Fields taken", type: "text" },
    { k: "findings", l: "Findings", type: "textarea" }
  ]},
  { code: "FFA", name: "Fundus fluorescein angiography", cat: "Imaging", eyes: true, fields: [
    { k: "phases", l: "Phases captured", type: "text" },
    { k: "leak", l: "Leakage / staining", type: "textarea" },
    { k: "ischaemia", l: "Non-perfusion", type: "textarea" },
    { k: "adverse", l: "Adverse reaction", type: "text" }
  ]},
  { code: "ICG", name: "Indocyanine green angiography", cat: "Imaging", eyes: true, fields: [
    { k: "findings", l: "Findings", type: "textarea" }
  ]},

  /* ── Ultrasound / biometry ── */
  { code: "A_SCAN", name: "A-scan biometry", cat: "Biometry", eyes: true, fields: [
    { k: "al", l: "Axial length (mm)", type: "num" },
    { k: "k1", l: "K1 (D)", type: "num" },
    { k: "k2", l: "K2 (D)", type: "num" },
    { k: "acd", l: "ACD (mm)", type: "num" },
    { k: "lt", l: "Lens thickness (mm)", type: "num" },
    { k: "wtw", l: "White-to-white (mm)", type: "num" },
    { k: "method", l: "Method", type: "select", opts: ["", "Optical (IOLMaster / Lenstar)", "Immersion ultrasound", "Contact ultrasound"] },
    { k: "formula", l: "IOL formula used", type: "text" },
    { k: "iol", l: "IOL power selected (D)", type: "text" },
    { k: "target", l: "Target refraction (D)", type: "text" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},
  { code: "B_SCAN", name: "B-scan ultrasound", cat: "Biometry", eyes: true, fields: [
    { k: "indication", l: "Indication (media opacity, etc.)", type: "text" },
    { k: "vitreous", l: "Vitreous", type: "textarea" },
    { k: "retina", l: "Retina / choroid", type: "textarea" },
    { k: "mass", l: "Mass lesion / height (mm)", type: "text" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},
  { code: "UBM", name: "Ultrasound biomicroscopy", cat: "Biometry", eyes: true, fields: [
    { k: "angle", l: "Angle / ciliary body", type: "textarea" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},

  /* ── Function ── */
  { code: "VF", name: "Visual field analysis", cat: "Function", eyes: true, fields: [
    { k: "strategy", l: "Strategy / programme", type: "select", opts: ["", "24-2 SITA Fast", "24-2 SITA Standard", "30-2", "10-2", "Esterman", "Goldmann kinetic", "Frequency doubling", "Confrontation only"] },
    { k: "md", l: "MD (dB)", type: "num" },
    { k: "psd", l: "PSD (dB)", type: "num" },
    { k: "vfi", l: "VFI (%)", type: "num" },
    { k: "ght", l: "Glaucoma hemifield test", type: "select", opts: ["", "Within normal limits", "Borderline", "Outside normal limits", "General reduction of sensitivity", "Abnormally high sensitivity", "Not applicable"] },
    { k: "fixloss", l: "Fixation losses", type: "text" },
    { k: "fpos", l: "False positives (%)", type: "text" },
    { k: "fneg", l: "False negatives (%)", type: "text" },
    { k: "reliable", l: "Reliability", type: "select", opts: ["", "Reliable", "Borderline", "Unreliable"] },
    { k: "pattern", l: "Defect pattern described", type: "text" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "CONTRAST", name: "Contrast sensitivity", cat: "Function", eyes: true, fields: [
    { k: "test", l: "Test used", type: "select", opts: ["", "Pelli-Robson", "CSV-1000", "Mars", "Vistech", "Other"] },
    { k: "score", l: "Score / log units", type: "text" },
    { k: "conditions", l: "Lighting / correction used", type: "text" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},
  { code: "COLOUR_FORMAL", name: "Formal colour vision", cat: "Function", eyes: true, fields: [
    { k: "test", l: "Test used", type: "select", opts: ["", "Ishihara", "HRR", "Farnsworth D-15", "Lanthony desaturated D-15", "Farnsworth-Munsell 100 Hue", "City University", "Lantern"] },
    { k: "score", l: "Score", type: "text" },
    { k: "axis", l: "Axis described", type: "select", opts: ["", "None", "Protan", "Deutan", "Tritan", "Mixed"] },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},
  { code: "ERG", name: "Electroretinogram (ERG)", cat: "Electrophysiology", eyes: true, fields: [
    { k: "type", l: "Type", type: "select", opts: ["", "Full-field (ffERG)", "Multifocal (mfERG)", "Pattern (PERG)"] },
    { k: "scotopic", l: "Scotopic responses", type: "textarea" },
    { k: "photopic", l: "Photopic responses", type: "textarea" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "VEP", name: "Visual evoked potential (VEP)", cat: "Electrophysiology", eyes: true, fields: [
    { k: "type", l: "Type", type: "select", opts: ["", "Pattern reversal", "Flash", "Pattern onset"] },
    { k: "p100", l: "P100 latency (ms)", type: "text" },
    { k: "amp", l: "Amplitude (µV)", type: "text" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "EOG", name: "Electro-oculogram (EOG)", cat: "Electrophysiology", eyes: true, fields: [
    { k: "arden", l: "Arden ratio", type: "text" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},

  /* ── Cornea / anterior ── */
  { code: "TOPO", name: "Corneal topography / tomography", cat: "Cornea", eyes: true, fields: [
    { k: "device", l: "Device", type: "text" },
    { k: "k1", l: "K1 (D)", type: "num" },
    { k: "k2", l: "K2 (D)", type: "num" },
    { k: "kmax", l: "Kmax (D)", type: "num" },
    { k: "pattern", l: "Pattern described", type: "text" },
    { k: "thinnest", l: "Thinnest pachymetry (µm)", type: "num" },
    { k: "comment", l: "Reported comment", type: "textarea" }
  ]},
  { code: "PACHY", name: "Pachymetry", cat: "Cornea", eyes: true, fields: [
    { k: "cct", l: "Central corneal thickness (µm)", type: "num" },
    { k: "method", l: "Method", type: "select", opts: ["", "Ultrasound", "Optical / Scheimpflug", "AS-OCT"] }
  ]},
  { code: "SPECULAR", name: "Specular microscopy", cat: "Cornea", eyes: true, fields: [
    { k: "ecd", l: "Endothelial cell density (cells/mm²)", type: "num" },
    { k: "cv", l: "Coefficient of variation (%)", type: "num" },
    { k: "hex", l: "Hexagonality (%)", type: "num" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},
  { code: "TEARFILM", name: "Tear film work-up", cat: "Cornea", eyes: true, fields: [
    { k: "tbut", l: "TBUT (s)", type: "num" },
    { k: "schirmer", l: "Schirmer (mm/5 min)", type: "num" },
    { k: "osmolarity", l: "Osmolarity (mOsm/L)", type: "num" },
    { k: "meibography", l: "Meibography / gland dropout", type: "text" },
    { k: "staining", l: "Ocular surface staining", type: "text" }
  ]},

  /* ── Paediatric ── */
  { code: "ROP_SCREEN", name: "ROP screening", cat: "Paediatric", eyes: true, fields: [
    { k: "ga", l: "Gestational age at birth (weeks)", type: "text" },
    { k: "bw", l: "Birth weight (g)", type: "text" },
    { k: "pma", l: "Post-menstrual age at exam (weeks)", type: "text" },
    { k: "zone", l: "Zone (ICROP)", type: "select", opts: ["", "Zone I", "Zone II", "Zone III", "Not visualised"] },
    { k: "stage", l: "Stage (ICROP)", type: "select", opts: ["", "No ROP", "Stage 1", "Stage 2", "Stage 3", "Stage 4A", "Stage 4B", "Stage 5"] },
    { k: "extent", l: "Extent (clock hours)", type: "text" },
    { k: "plus", l: "Vascular activity", type: "select", opts: ["", "No plus", "Pre-plus", "Plus disease"] },
    { k: "aprop", l: "Aggressive ROP (A-ROP) features", type: "select", opts: ["", "No", "Yes"] },
    { k: "dilated", l: "Adequate dilation / view", type: "text" },
    { k: "next", l: "Interval advised by examiner", type: "text" },
    { k: "comment", l: "Examiner comment", type: "textarea" }
  ]},
  { code: "ORTHOPTIC", name: "Orthoptic assessment", cat: "Paediatric", eyes: false, fields: [
    { k: "cover", l: "Cover test (D / N)", type: "text" },
    { k: "ocular_motility", l: "Motility", type: "textarea" },
    { k: "stereo", l: "Stereoacuity", type: "text" },
    { k: "fusion", l: "Fusion / suppression", type: "text" },
    { k: "comment", l: "Comment", type: "textarea" }
  ]},

  /* ── Systemic / other ── */
  { code: "BLOODS", name: "Blood tests", cat: "Systemic", eyes: false, fields: [
    { k: "requested", l: "Tests requested", type: "text" },
    { k: "results", l: "Results", type: "textarea" },
    { k: "lab", l: "Laboratory / reference", type: "text" }
  ]},
  { code: "NEUROIMAGING", name: "Neuroimaging (CT / MRI)", cat: "Systemic", eyes: false, fields: [
    { k: "modality", l: "Modality", type: "select", opts: ["", "MRI brain", "MRI orbits", "MRI brain + orbits", "CT head", "CT orbits", "CTA / MRA", "Other"] },
    { k: "contrast", l: "Contrast", type: "select", opts: ["", "With", "Without", "With and without"] },
    { k: "report", l: "Radiology report", type: "textarea" },
    { k: "reported_by", l: "Reported by", type: "text" }
  ]},
  { code: "OTHER", name: "Other investigation", cat: "Other", eyes: false, fields: [
    { k: "name", l: "Investigation", type: "text" },
    { k: "result", l: "Result", type: "textarea" }
  ]}
];

function invTest(code) {
  for (var i = 0; i < INVESTIGATION_CATALOGUE.length; i++) {
    if (INVESTIGATION_CATALOGUE[i].code === code) return INVESTIGATION_CATALOGUE[i];
  }
  return null;
}

var INV_URGENCY = ["Routine", "Soon", "Urgent", "Same day"];
var INV_STATUS_LABEL = {
  ordered: "Ordered", in_progress: "In progress", completed: "Results ready",
  reviewed: "Reviewed", cancelled: "Cancelled"
};


/* ── Storage ─────────────────────────────────────────────────────
   Orders live on the patient record so they survive the hand-off.
   ---------------------------------------------------------------- */

function invOrdersOf(pt) {
  if (!pt) return [];
  if (!pt.orders) pt.orders = [];
  return pt.orders;
}

function invSavePatient(pt) {
  var pts = loadPatients();
  for (var i = 0; i < pts.length; i++) {
    if (pts[i].id === pt.id) { pts[i] = pt; break; }
  }
  savePatients(pts);
}

/* Every order across every patient, newest first, with the patient attached. */
function invAllOrders(filter) {
  var pts = loadPatients() || [];
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    var pt = pts[i];
    if (pt.practice) continue;                 /* practice records stay out */
    var orders = pt.orders || [];
    for (var j = 0; j < orders.length; j++) {
      var o = orders[j];
      if (filter && filter !== "all" && o.status !== filter) continue;
      out.push({ order: o, patient: pt });
    }
  }
  out.sort(function (a, b) { return (b.order.created_at || "").localeCompare(a.order.created_at || ""); });
  return out;
}

function invCount(status) { return invAllOrders(status).length; }

/* Roll the order status up from its items. */
function invRecomputeStatus(o) {
  if (o.status === "cancelled" || o.status === "reviewed") return o.status;
  var items = o.items || [];
  var done = 0, started = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].status === "completed") done++;
    else if (items[i].status === "in_progress") started++;
  }
  o.status = !items.length ? "ordered"
    : done === items.length ? "completed"
    : (done || started) ? "in_progress"
    : "ordered";
  return o.status;
}


/* ── Ordering (clinician, from the exam) ─────────────────────────── */

var INV_ORDER_DRAFT = { codes: {}, urgency: "Routine", question: "", note: "" };

function invDraftToggle(code) {
  if (INV_ORDER_DRAFT.codes[code]) delete INV_ORDER_DRAFT.codes[code];
  else INV_ORDER_DRAFT.codes[code] = "OU";
  renderMain();
}
function invDraftEye(code, eye) { INV_ORDER_DRAFT.codes[code] = eye; renderMain(); }

function invCreateOrder() {
  var codes = Object.keys(INV_ORDER_DRAFT.codes);
  if (!codes.length) { toast("Select at least one investigation."); return; }
  if (typeof P === "undefined" || !P || !P.id) { toast("Open a patient first."); return; }

  var order = {
    id: "o" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36),
    patient_id: P.id,
    visit_id: (typeof CV !== "undefined" ? CV : null),
    created_at: new Date().toISOString(),
    created_by: (typeof CU !== "undefined" && CU) ? (CU.username || "") : "",
    urgency: INV_ORDER_DRAFT.urgency,
    question: INV_ORDER_DRAFT.question,
    note: INV_ORDER_DRAFT.note,
    status: "ordered",
    items: codes.map(function (c) {
      var t = invTest(c);
      return {
        code: c, name: t ? t.name : c, eye: INV_ORDER_DRAFT.codes[c],
        status: "ordered", result: {}, files: [],
        performed_by: "", performed_at: "", tech_note: ""
      };
    }),
    reviewed_by: "", reviewed_at: "", review_note: ""
  };

  invOrdersOf(P).push(order);
  invSavePatient(P);
  if (typeof logAudit === "function") {
    logAudit("investigation_ordered",
      order.items.length + " investigation(s) ordered · " + order.urgency,
      { patient_id: P.id, visit_id: order.visit_id });
  }
  INV_ORDER_DRAFT = { codes: {}, urgency: "Routine", question: "", note: "" };
  renderMain();
  toast("Order raised — now in the investigation queue.");
}

function invCancelOrder(orderId) {
  if (!window.confirm("Cancel this investigation order?")) return;
  var found = invFindOrder(orderId);
  if (!found) return;
  found.order.status = "cancelled";
  invSavePatient(found.patient);
  if (typeof logAudit === "function") logAudit("investigation_cancelled", "Order cancelled", { patient_id: found.patient.id });
  invRerender();
}

function invFindOrder(orderId) {
  var pts = loadPatients() || [];
  for (var i = 0; i < pts.length; i++) {
    var orders = pts[i].orders || [];
    for (var j = 0; j < orders.length; j++) if (orders[j].id === orderId) return { order: orders[j], patient: pts[i] };
  }
  return null;
}

function invRerender() {
  if (typeof HOME_TAB !== "undefined" && HOME_TAB === "investigations" && typeof renderHome === "function") renderHome();
  else if (typeof renderMain === "function") renderMain();
}


/* ── Performing (technician / other clinician, from the queue) ───── */

var INV_OPEN_ORDER = null;   /* order id currently open in the queue */

function invOpenOrder(id) { INV_OPEN_ORDER = id; invRerender(); }
function invCloseOrder() { INV_OPEN_ORDER = null; invRerender(); }

function invSetItemField(orderId, idx, key, val) {
  var f = invFindOrder(orderId);
  if (!f) return;
  var it = f.order.items[idx];
  if (!it) return;
  if (!it.result) it.result = {};
  it.result[key] = val;
  invSavePatient(f.patient);
}

function invSetItemNote(orderId, idx, val) {
  var f = invFindOrder(orderId);
  if (!f) return;
  if (f.order.items[idx]) f.order.items[idx].tech_note = val;
  invSavePatient(f.patient);
}

function invMarkItem(orderId, idx, status) {
  var f = invFindOrder(orderId);
  if (!f) return;
  var it = f.order.items[idx];
  if (!it) return;
  it.status = status;
  if (status === "completed") {
    it.performed_by = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
    it.performed_at = new Date().toISOString();
  }
  invRecomputeStatus(f.order);
  invSavePatient(f.patient);
  if (typeof logAudit === "function") {
    logAudit("investigation_" + status, it.name + " marked " + status, { patient_id: f.patient.id });
  }
  invRerender();
}

/* Attach a performed-test report to an order item (uses the file store, so
   images are compressed and blobs land in IndexedDB). */
function invAttachHandle(input, orderId, idx) {
  var files = input.files;
  if (!files || !files.length) return;
  var f = invFindOrder(orderId);
  if (!f) return;
  var it = f.order.items[idx];
  if (!it) return;
  if (!it.files) it.files = [];
  var pending = files.length;
  function done() {
    if (--pending > 0) return;
    invSavePatient(f.patient);
    invRerender();
  }
  for (var i = 0; i < files.length; i++) {
    (function (file) {
      fsIngest(file, { profile: (typeof ATTACH_PROFILE !== "undefined" ? ATTACH_PROFILE : "standard") })
        .then(function (rec) {
          it.files.push(rec);
          if (typeof logAudit === "function") {
            logAudit("file_attached", "Investigation report: " + rec.name, { patient_id: f.patient.id });
          }
          if (typeof fsCloudUpload === "function") { try { fsCloudUpload(rec); } catch (e) {} }
          done();
        })
        .catch(function (e) { alert(String((e && e.message) || e)); done(); });
    })(files[i]);
  }
  input.value = "";
}

function invOpenFile(orderId, idx, fileId) {
  var f = invFindOrder(orderId);
  if (!f) return;
  var it = f.order.items[idx];
  var rec = null;
  for (var i = 0; it && it.files && i < it.files.length; i++) if (it.files[i].id === fileId) rec = it.files[i];
  if (!rec) return;
  fsResolveUrl(rec).then(function (url) {
    if (!url) { alert("The stored file could not be read back from this device."); return; }
    var w = window.open();
    if (w) {
      if (/^image\//.test(rec.type)) w.document.write('<title>' + esc(rec.name) + '</title><img src="' + url + '" style="max-width:100%">');
      else w.location = url;
    }
  });
}


/* ── Review (back with the ordering clinician) ───────────────────── */

function invSetReviewNote(orderId, val) {
  var f = invFindOrder(orderId);
  if (!f) return;
  f.order.review_note = val;
  invSavePatient(f.patient);
}

function invMarkReviewed(orderId) {
  var f = invFindOrder(orderId);
  if (!f) return;
  if (f.order.status !== "completed") {
    if (!window.confirm("Not all tests are marked done. Sign off on the results anyway?")) return;
  }
  f.order.status = "reviewed";
  f.order.reviewed_by = (typeof CU !== "undefined" && CU) ? (CU.username || "") : "";
  f.order.reviewed_at = new Date().toISOString();
  invSavePatient(f.patient);
  if (typeof logAudit === "function") {
    logAudit("investigation_reviewed", "Results reviewed and signed off", { patient_id: f.patient.id });
  }
  invRerender();
  toast("Results reviewed and signed off.");
}
