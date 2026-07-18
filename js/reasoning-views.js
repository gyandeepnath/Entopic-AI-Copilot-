/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — REASONING VIEWS                                       */
/*                                                                  */
/* "One reasoning state → many rendered views."                    */
/* (Vision moves 1 + 4: documentation-as-exhaust + living casebook)*/
/*                                                                  */
/*   buildExamState()      canonical, DOM-free snapshot of THIS     */
/*                         encounter's reasoning (captured findings */
/*                         + the engine's differential + evidence   */
/*                         trail + next tests). The single source   */
/*                         every view below renders.                */
/*   stateToNoteText()     SOAP clinical note (Move 1) — a faithful */
/*                         projection of the reasoning, not a        */
/*                         reconstruction. Renders ONLY what was     */
/*                         captured; never fabricates normals.       */
/*   deidentifyState()     strips PII so a real encounter can become */
/*                         a teaching case (Move 4).                 */
/*   casebook*()           save / load / delete de-identified cases  */
/*                         to a local, offline casebook.             */
/*                                                                  */
/* GUARDRAILS honoured here:                                        */
/*  • Diagnosis stays in engine.js. These are display-only VIEWS of */
/*    what the deterministic engine already computed — no scoring,  */
/*    no differential generation, nothing feeds back into the       */
/*    engine. The firewall is intact.                               */
/*  • No LLM, no network — pure deterministic templating, offline.  */
/*  • Anti-fabrication: a field that was never entered is OMITTED,  */
/*    never rendered as an assumed "normal". Absent = absent.       */
/*  • Advisory-only framing is stamped on every rendered artifact.  */
/*  • Casebook entries are de-identified before they are stored.    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* Advisory framing stamped on every generated artifact. */
var RV_ADVISORY =
  "Advisory clinical decision support — not a diagnosis. " +
  "All findings and impressions require clinical correlation by the examining clinician.";

/* localStorage key (via storage.js loadStore/saveStore). */
var RV_CASEBOOK_KEY = "casebook";
var RV_CASEBOOK_MAX = 200;   /* keep the local casebook bounded */


/* ── small value guards ──────────────────────────────────────────
   "present" = the clinician actually entered something. We treat "",
   null, undefined and the em-dash placeholder as absent so the note
   never documents a finding that was not examined. */
function rvHas(x) {
  if (x === 0 || x === "0") return false;      /* "0" cells/flare = quiet, not a finding */
  return !!(x && String(x).trim() && String(x).trim() !== "—");
}
function rvClone(o) { return JSON.parse(JSON.stringify(o)); }


/* ═══════════════════════════════════════════════════════════════ */
/* buildExamState() — the canonical snapshot                       */
/*                                                                  */
/* Reads the live globals V (visit), P (patient), CU (clinician)   */
/* and ENGINE_STATE (tokens/provenance). Pure: no DOM, no writes.  */
/* Only blocks with real captured data are included.               */
/* ═══════════════════════════════════════════════════════════════ */
function buildExamState() {
  var v = (typeof V !== "undefined" && V) ? V : {};
  var p = (typeof P !== "undefined" && P) ? P : {};
  var cu = (typeof CU !== "undefined" && CU) ? CU : null;
  var es = (typeof ENGINE_STATE !== "undefined" && ENGINE_STATE) ? ENGINE_STATE : { tokens: [] };

  var state = {
    generatedAt: new Date().toISOString(),
    clinician: cu ? { name: cu.name || "", cred: cu.cred || "", clinic: cu.clinic || "" } : null,
    patient: {
      name: ((p.first_name || "") + " " + (p.last_name || "")).trim(),
      mrn: p.mrn || "",
      age: p.age || "",
      sex: p.sex || "",
      occupation: p.occupation || ""
    },
    subjective: {},
    objective: {},
    assessment: [],
    alerts: [],
    plan: {},
    nextTests: [],
    tokens: (es.tokens || []).slice(),
    deidentified: false
  };

  /* ── Subjective ── */
  if (rvHas(v.cc)) state.subjective.cc = v.cc;
  if (v.symptoms && v.symptoms.length) state.subjective.symptoms = v.symptoms.slice();
  if (v.temporal) {
    var t = [];
    if (rvHas(v.temporal.onset))    t.push("Onset: " + v.temporal.onset);
    if (rvHas(v.temporal.duration)) t.push("Duration: " + v.temporal.duration);
    if (rvHas(v.temporal.course))   t.push("Course: " + v.temporal.course);
    if (t.length) state.subjective.temporal = t;
  }

  /* ── Objective (only entered data) ── */
  var o = state.objective;

  if (v.va && (rvHas(v.va.od_un) || rvHas(v.va.os_un) || rvHas(v.va.od_bva) || rvHas(v.va.os_bva) ||
               rvHas(v.va.od_near) || rvHas(v.va.os_near))) {
    o.va = {
      chart: v.va.chart, dist: v.va.dist,
      od_un: v.va.od_un, os_un: v.va.os_un,
      od_ph: v.va.od_ph, os_ph: v.va.os_ph,
      od_bva: v.va.od_bva, os_bva: v.va.os_bva,
      od_near: v.va.od_near, os_near: v.va.os_near
    };
  }

  if (v.rx && (rvHas(v.rx.od_sph) || rvHas(v.rx.os_sph))) {
    o.rx = rvClone(v.rx);
  }

  if (v.iop && (rvHas(v.iop.od) || rvHas(v.iop.os))) {
    o.iop = { od: v.iop.od, os: v.iop.os, method: v.iop.method, time: v.iop.time };
  }

  if (v.pupil && v.pupil.rapd && v.pupil.rapd !== "None") {
    o.pupil = { rapd: v.pupil.rapd, grade: v.pupil.rapd_grade || "" };
  }

  if (v.sl && v.sl.findings && v.sl.findings.length) {
    o.anterior = v.sl.findings.slice();
  }

  if (v.bv) {
    var bv = [];
    if (rvHas(v.bv.ct_d))  bv.push("CT dist: " + v.bv.ct_d);
    if (rvHas(v.bv.ct_n))  bv.push("CT near: " + v.bv.ct_n);
    if (rvHas(v.bv.npc_b)) bv.push("NPC: " + v.bv.npc_b + " cm");
    if (rvHas(v.bv.stereo)) bv.push("Stereo: " + v.bv.stereo);
    if (bv.length) o.bv = bv;
  }

  if (v.fun) {
    var fun = {};
    if (rvHas(v.fun.od && v.fun.od.cd_v) || rvHas(v.fun.os && v.fun.os.cd_v)) {
      fun.cd = "OD " + ((v.fun.od && v.fun.od.cd_v) || "—") + " · OS " + ((v.fun.os && v.fun.os.cd_v) || "—");
    }
    if (v.fun.findings && v.fun.findings.length) fun.findings = v.fun.findings.slice();
    if (fun.cd || fun.findings) {
      fun.method = v.fun.method; fun.dilated = !!v.fun.dilated;
      o.fundus = fun;
    }
  }

  if (v.mot) {
    var mot = [];
    if (rvHas(v.mot.versions) && v.mot.versions !== "Full")   mot.push("Versions: " + v.mot.versions);
    if (rvHas(v.mot.nystagmus) && v.mot.nystagmus !== "None") mot.push("Nystagmus: " + v.mot.nystagmus);
    if (mot.length) o.motility = mot;
  }

  if (v.orbit && (rvHas(v.orbit.exoph_od) || rvHas(v.orbit.exoph_os) || v.orbit.lid_retraction)) {
    var orb = [];
    if (rvHas(v.orbit.exoph_od) || rvHas(v.orbit.exoph_os))
      orb.push("Exophthalmometry: OD " + (v.orbit.exoph_od || "—") + " / OS " + (v.orbit.exoph_os || "—") + " mm");
    if (v.orbit.lid_retraction) orb.push("Lid retraction present");
    o.orbit = orb;
  }

  /* ── Assessment: the engine's differential + evidence trail ──
     Copied verbatim from V.dxList (which the engine wrote). We do NOT
     re-rank, re-score, or re-derive anything here. */
  var dx = (v.dxList || []);
  for (var i = 0; i < dx.length; i++) {
    var d = dx[i];
    if (d.cat === "system" || d.cat === "error") continue;
    var ev = d.evidence || {};
    state.assessment.push({
      n: d.n,
      icd: d.icd || "",
      icd_label: d.icd_label || "",
      icd_status: d.icd_status || "",
      confidence: ev.confidence || "",
      prob: d.prob,
      urgent: !!d.urgent,
      matched: (ev.matched || []).slice(),
      missing: (ev.missing || []).slice(),
      contradicted: (ev.contradicted || []).slice()
    });
  }

  /* ── Red-flag / safety alerts (un-suppressible; shown verbatim) ── */
  state.alerts = (v.alerts || []).slice();

  /* ── Next discriminating tests (the live narrowing loop) ── */
  state.nextTests = (v.nextTests || []).slice();

  /* ── Plan ── */
  if (v.plan) {
    if (rvHas(v.plan.mgmt))     state.plan.mgmt = v.plan.mgmt;
    if (rvHas(v.plan.followup)) state.plan.followup = v.plan.followup;
    if (rvHas(v.plan.education)) state.plan.education = v.plan.education;
    if (rvHas(v.plan.ref_to))   state.plan.referral = v.plan.ref_to + (v.plan.ref_urgency ? " (" + v.plan.ref_urgency + ")" : "");
  }

  return state;
}


/* ═══════════════════════════════════════════════════════════════ */
/* stateToNoteText() — SOAP clinical note (Move 1)                 */
/*                                                                  */
/* A faithful plain-text projection of the reasoning state. Pure.  */
/* Only present blocks appear (anti-fabrication). The Assessment    */
/* carries the engine's evidence trail so the note explains WHY,    */
/* not just WHAT — documentation as a by-product of reasoning.      */
/* ═══════════════════════════════════════════════════════════════ */
function stateToNoteText(state) {
  var L = [];
  var line = function (s) { L.push(s == null ? "" : s); };
  var rule = function () { line("─".repeat(56)); };

  /* Header */
  if (state.clinician) {
    if (state.clinician.clinic) line(state.clinician.clinic);
    if (state.clinician.name) line(state.clinician.name + (state.clinician.cred ? ", " + state.clinician.cred : ""));
  }
  line("CLINICAL NOTE (SOAP)");
  var dateStr = new Date(state.generatedAt);
  line("Date: " + (isNaN(dateStr) ? state.generatedAt : dateStr.toLocaleString()));
  rule();

  /* Patient identity (omitted entirely on a de-identified note) */
  if (!state.deidentified) {
    var idbits = [];
    if (state.patient.name) idbits.push("Patient: " + state.patient.name);
    if (state.patient.mrn)  idbits.push("MRN: " + state.patient.mrn);
    if (state.patient.age !== "") idbits.push("Age: " + state.patient.age);
    if (state.patient.sex)  idbits.push("Sex: " + state.patient.sex);
    if (idbits.length) { line(idbits.join("  |  ")); rule(); }
  } else {
    var db = [];
    if (state.patient.age !== "") db.push("Age: " + state.patient.age);
    if (state.patient.sex)  db.push("Sex: " + state.patient.sex);
    if (state.patient.occupation) db.push("Occupation: " + state.patient.occupation);
    line("De-identified teaching case" + (db.length ? "  —  " + db.join("  |  ") : ""));
    rule();
  }

  /* Red flags first — safety is never buried. */
  if (state.alerts && state.alerts.length) {
    line("⚠ SAFETY ALERTS");
    for (var a = 0; a < state.alerts.length; a++) {
      line("  • " + state.alerts[a].m + (state.alerts[a].l === "urgent" ? "  [URGENT]" : ""));
    }
    line("");
  }

  /* S — Subjective */
  var s = state.subjective, sLines = [];
  if (s.cc) sLines.push("Chief complaint: " + s.cc);
  if (s.symptoms && s.symptoms.length) sLines.push("Symptoms: " + s.symptoms.join(", "));
  if (s.temporal && s.temporal.length) sLines.push("Pattern: " + s.temporal.join(" · "));
  if (sLines.length) { line("S — SUBJECTIVE"); for (var si = 0; si < sLines.length; si++) line("  " + sLines[si]); line(""); }

  /* O — Objective */
  var o = state.objective, oLines = [];
  if (o.va) {
    var va = o.va, vparts = [];
    if (rvHas(va.od_un) || rvHas(va.os_un))   vparts.push("Unaided OD " + (va.od_un || "—") + " OS " + (va.os_un || "—"));
    if (rvHas(va.od_bva) || rvHas(va.os_bva)) vparts.push("BCVA OD " + (va.od_bva || "—") + " OS " + (va.os_bva || "—"));
    if (rvHas(va.od_near) || rvHas(va.os_near)) vparts.push("Near OD " + (va.od_near || "—") + " OS " + (va.os_near || "—"));
    oLines.push("VA (" + va.chart + " @ " + va.dist + "): " + vparts.join("; "));
  }
  if (o.rx) {
    oLines.push("Refraction (" + o.rx.method + "): " +
      "OD " + (o.rx.od_sph || "plano") + " / " + (o.rx.od_cyl || "DS") + (o.rx.od_ax ? " x" + o.rx.od_ax : "") + (o.rx.od_add ? " Add " + o.rx.od_add : "") + "; " +
      "OS " + (o.rx.os_sph || "plano") + " / " + (o.rx.os_cyl || "DS") + (o.rx.os_ax ? " x" + o.rx.os_ax : "") + (o.rx.os_add ? " Add " + o.rx.os_add : ""));
  }
  if (o.iop) oLines.push("IOP (" + o.iop.method + "): OD " + (o.iop.od || "—") + " OS " + (o.iop.os || "—") + " mmHg" + (o.iop.time ? " @ " + o.iop.time : ""));
  if (o.pupil) oLines.push("Pupils: RAPD " + o.pupil.rapd + (o.pupil.grade ? " grade " + o.pupil.grade : ""));
  if (o.anterior) oLines.push("Anterior segment: " + o.anterior.join(", "));
  if (o.bv) oLines.push("Binocular vision: " + o.bv.join(" · "));
  if (o.fundus) {
    var f = "Fundus (" + o.fundus.method + (o.fundus.dilated ? ", dilated" : "") + "): ";
    var fb = [];
    if (o.fundus.cd) fb.push("C/D " + o.fundus.cd);
    if (o.fundus.findings) fb.push(o.fundus.findings.join(", "));
    oLines.push(f + fb.join("; "));
  }
  if (o.motility) oLines.push("Motility: " + o.motility.join("; "));
  if (o.orbit) oLines.push("Orbit: " + o.orbit.join("; "));
  if (oLines.length) { line("O — OBJECTIVE"); for (var oi = 0; oi < oLines.length; oi++) line("  " + oLines[oi]); line(""); }

  /* A — Assessment (with the engine's reasoning trail) */
  line("A — ASSESSMENT" + (state.assessment.length ? " (advisory differential)" : ""));
  if (state.assessment.length) {
    for (var ai = 0; ai < state.assessment.length && ai < 5; ai++) {
      var d = state.assessment[ai];
      var head = "  " + (ai + 1) + ". " + d.n + (d.icd ? " [" + d.icd + (d.icd_status && /review/i.test(d.icd_status) ? " · provisional" : "") + "]" : "");
      if (d.confidence) head += " — " + d.confidence;
      if (d.urgent) head += "  [URGENT]";
      line(head);
      if (d.matched && d.matched.length)         line("       supported by: " + d.matched.join(", "));
      if (d.contradicted && d.contradicted.length) line("       against: " + d.contradicted.join(", "));
      if (d.missing && d.missing.length)         line("       not yet confirmed: " + d.missing.join(", "));
    }
  } else {
    line("  No differential yet — insufficient clinical evidence entered.");
  }
  line("");

  /* Next discriminating tests — the narrowing loop, in the note. */
  if (state.nextTests && state.nextTests.length) {
    line("  Suggested next tests to narrow the differential:");
    for (var ni = 0; ni < state.nextTests.length && ni < 4; ni++) {
      var nt = state.nextTests[ni];
      line("       • " + (nt.label || nt.test || nt.n || nt));
    }
    line("");
  }

  /* P — Plan */
  var p = state.plan, pLines = [];
  if (p.mgmt) pLines.push("Management: " + p.mgmt);
  if (p.followup) pLines.push("Follow-up: " + p.followup);
  if (p.education) pLines.push("Patient education: " + p.education);
  if (p.referral) pLines.push("Referral: " + p.referral);
  if (pLines.length) { line("P — PLAN"); for (var pi = 0; pi < pLines.length; pi++) line("  " + pLines[pi]); line(""); }

  rule();
  line(RV_ADVISORY);

  return L.join("\n");
}


/* ═══════════════════════════════════════════════════════════════ */
/* deidentifyState() — strip PII for teaching use (Move 4)         */
/*                                                                  */
/* Removes direct identifiers, caps age at 90+ (HIPAA safe-harbour  */
/* convention), and scrubs the patient's own name out of free-text  */
/* fields (chief complaint, plan). Clinical content is preserved.   */
/* Returns a NEW object; the source state is untouched.             */
/* ═══════════════════════════════════════════════════════════════ */
function deidentifyState(state) {
  var d = rvClone(state);
  var fullName = (state.patient && state.patient.name) ? state.patient.name : "";

  d.clinician = null;              /* clinician is an identifier too */
  d.patient = {
    name: "", mrn: "",
    age: (state.patient && state.patient.age !== "" && Number(state.patient.age) > 89) ? "90+" : (state.patient ? state.patient.age : ""),
    sex: state.patient ? state.patient.sex : "",
    occupation: state.patient ? state.patient.occupation : ""
  };
  d.deidentified = true;

  /* Light deterministic name-scrub of free text: replace the patient's
     first/last name (and full name) with a placeholder. Not a substitute
     for review, but removes the most common direct leak. */
  function scrub(txt) {
    if (!txt) return txt;
    var out = txt;
    var parts = fullName.split(/\s+/).filter(function (x) { return x.length >= 3; });
    parts.push(fullName);
    for (var i = 0; i < parts.length; i++) {
      var pn = parts[i].trim();
      if (!pn) continue;
      var re = new RegExp(pn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      out = out.replace(re, "[patient]");
    }
    return out;
  }
  if (d.subjective && d.subjective.cc) d.subjective.cc = scrub(d.subjective.cc);
  if (d.plan) {
    if (d.plan.mgmt) d.plan.mgmt = scrub(d.plan.mgmt);
    if (d.plan.education) d.plan.education = scrub(d.plan.education);
    if (d.plan.followup) d.plan.followup = scrub(d.plan.followup);
  }
  return d;
}


/* ═══════════════════════════════════════════════════════════════ */
/* CASEBOOK (Move 4) — de-identified, offline, local               */
/*                                                                  */
/* A living casebook of real reasoned encounters. Every entry is    */
/* de-identified BEFORE it is stored. Storage goes through          */
/* storage.js (loadStore/saveStore) so it participates in the same  */
/* offline persistence + safety mirror as the rest of the app.      */
/* ═══════════════════════════════════════════════════════════════ */
function casebookLoad() {
  if (typeof loadStore === "function") return loadStore(RV_CASEBOOK_KEY, []) || [];
  return [];
}

function casebookSave(list) {
  if (typeof saveStore === "function") saveStore(RV_CASEBOOK_KEY, list);
}

/* Build a de-identified case object from the CURRENT encounter. Pure
   except for reading globals; does not persist. `annotation` is the
   clinician/faculty teaching note. */
function buildCase(annotation) {
  var raw = buildExamState();
  var deid = deidentifyState(raw);
  var lead = (deid.assessment && deid.assessment.length) ? deid.assessment[0].n : "Undiagnosed / pending";
  return {
    id: "case_" + Date.now() + "_" + Math.floor(Math.random() * 1e6),
    savedAt: new Date().toISOString(),
    title: lead,
    teachingNote: annotation || "",
    state: deid
  };
}

/* Persist a de-identified case to the local casebook (newest first,
   bounded). Returns the saved entry. DOM-free. */
function casebookAdd(annotation) {
  var entry = buildCase(annotation);
  var list = casebookLoad();
  list.unshift(entry);
  if (list.length > RV_CASEBOOK_MAX) list = list.slice(0, RV_CASEBOOK_MAX);
  casebookSave(list);
  return entry;
}

function casebookDelete(id) {
  var list = casebookLoad().filter(function (e) { return e.id !== id; });
  casebookSave(list);
  return list;
}


/* ═══════════════════════════════════════════════════════════════ */
/* DOM WIRING (browser only — guarded so Node tests can load this)  */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  /* Escaping helper (app.js defines escH; fall back if loaded early). */
  var _esc = (typeof escH === "function") ? escH : function (s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  };

  /* ── SOAP note modal (Move 1) ── */
  window.showClinicalNote = function () {
    var note = stateToNoteText(buildExamState());
    var box = document.getElementById("noteContent");
    if (box) { box.textContent = note; }
    var m = document.getElementById("modalNote");
    if (m) m.style.display = "flex";
  };

  window.copyClinicalNote = function () {
    var box = document.getElementById("noteContent");
    if (!box) return;
    var txt = box.textContent || "";
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { _rvFlash("copyNoteBtn", "Copied ✓"); });
    } else {
      var ta = document.createElement("textarea");
      ta.value = txt; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); _rvFlash("copyNoteBtn", "Copied ✓"); } catch (e) {}
      document.body.removeChild(ta);
    }
  };

  /* ── Save current encounter as a teaching case (Move 4) ── */
  window.saveTeachingCase = function () {
    var note = (typeof prompt === "function")
      ? prompt("Teaching note for this case (optional — what should a learner take away?):", "")
      : "";
    if (note === null) return;   /* cancelled */
    var entry = casebookAdd(note);
    _rvFlash("saveCaseBtn", "Saved to casebook ✓");
    if (document.getElementById("modalCasebook") &&
        document.getElementById("modalCasebook").style.display === "flex") {
      window.showCasebook();
    }
    return entry;
  };

  /* ── Casebook browser modal (Move 4) ── */
  window.showCasebook = function () {
    var list = casebookLoad();
    var h = "";
    if (!list.length) {
      h = '<div style="padding:16px;color:var(--sv);font-size:.78rem">' +
          'No teaching cases yet. Open a completed exam and use ' +
          '<b>“Save as teaching case”</b> on the report to add a de-identified case here.</div>';
    } else {
      h += '<div style="font-size:.66rem;color:var(--sv);margin-bottom:8px">' +
           list.length + ' de-identified case' + (list.length === 1 ? '' : 's') +
           ' · stored locally · no patient identifiers</div>';
      for (var i = 0; i < list.length; i++) {
        h += _rvCaseCard(list[i]);
      }
    }
    var box = document.getElementById("casebookContent");
    if (box) box.innerHTML = h;
    var m = document.getElementById("modalCasebook");
    if (m) m.style.display = "flex";
  };

  window.casebookToggle = function (id) {
    var el = document.getElementById("casebody_" + id);
    if (el) el.style.display = (el.style.display === "none" ? "block" : "none");
  };

  window.casebookRemove = function (id) {
    if (typeof confirm === "function" && !confirm("Delete this teaching case?")) return;
    casebookDelete(id);
    window.showCasebook();
  };

  function _rvCaseCard(entry) {
    var s = entry.state || {};
    var when = new Date(entry.savedAt);
    var meta = [];
    if (s.patient && s.patient.age !== "") meta.push("Age " + s.patient.age);
    if (s.patient && s.patient.sex) meta.push(_esc(s.patient.sex));
    var body = stateToNoteText(s);
    var teaching = entry.teachingNote
      ? '<div style="margin-top:8px;padding:8px;background:var(--hl,#fff8e1);border-left:3px solid var(--ac,#c8a200);border-radius:4px;font-size:.72rem"><b>Teaching note:</b> ' + _esc(entry.teachingNote) + '</div>'
      : '';
    return '<div style="border:1px solid var(--ms);border-radius:var(--r);margin-bottom:8px;overflow:hidden">' +
      '<div style="padding:8px 10px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:8px" onclick="casebookToggle(\'' + entry.id + '\')">' +
        '<div><b style="font-size:.8rem">' + _esc(entry.title) + '</b>' +
        '<div style="font-size:.62rem;color:var(--sv)">' + (isNaN(when) ? "" : when.toLocaleDateString()) + (meta.length ? " · " + meta.join(" · ") : "") + '</div></div>' +
        '<span style="font-size:.62rem;color:var(--sv)">▼ view</span>' +
      '</div>' +
      '<div id="casebody_' + entry.id + '" style="display:none;padding:0 10px 10px">' +
        teaching +
        '<pre style="white-space:pre-wrap;font-family:var(--mono,monospace);font-size:.66rem;line-height:1.5;background:var(--wh,#fff);border:1px solid var(--ms);border-radius:4px;padding:10px;margin-top:8px;overflow-x:auto">' + _esc(body) + '</pre>' +
        '<div class="btn-g" style="margin-top:6px"><button class="btn btn-s" onclick="casebookRemove(\'' + entry.id + '\')" style="font-size:.62rem">Delete case</button></div>' +
      '</div>' +
    '</div>';
  }

  function _rvFlash(btnId, msg) {
    var b = document.getElementById(btnId);
    if (!b) return;
    var old = b.textContent;
    b.textContent = msg;
    setTimeout(function () { b.textContent = old; }, 1400);
  }
}
