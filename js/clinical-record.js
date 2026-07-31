/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL RECORD INTEGRITY                              */
/*                                                                  */
/* Three things a medical record must do that Entopic did not:      */
/*                                                                  */
/*  1. ATTRIBUTION + AMENDMENT TRAIL (clinical review CL-3)         */
/*     Every save records who wrote it and when. A later edit — by  */
/*     a different clinician, or on a different day — is recorded   */
/*     as an AMENDMENT rather than silently replacing the original. */
/*     This is the founder's model: a continuous, attributed        */
/*     narrative rather than a hard sign-and-lock. It is closer to  */
/*     how paper notes actually work, and it is defensible for the  */
/*     same reason: you can always say who wrote what, when.        */
/*                                                                  */
/*     HONEST LIMIT: this gives attribution and chronology, not     */
/*     cryptographic immutability. It shows THAT a record was       */
/*     amended and by whom; it does not prove the earlier text was  */
/*     never altered. Tamper-evidence needs the append-only server  */
/*     audit log (which exists) or per-save hashing (not built).    */
/*                                                                  */
/*  2. DUPLICATE PATIENT DETECTION (CL-4)                           */
/*     Two records for one person is the classic EMR identity       */
/*     failure: half the history sits in each while the clinician   */
/*     believes they have the whole picture. Detection is           */
/*     deterministic and EXPLAINED — it never merges anything, and  */
/*     it always defaults to creating the new record, because a     */
/*     wrongly-merged pair of patients is far worse than a          */
/*     duplicate.                                                   */
/*                                                                  */
/*  3. CONTINUOUS CLINICAL RECORD                                    */
/*     One scrollable chronological compilation of every visit —    */
/*     normal AND abnormal findings — with the timestamp and        */
/*     clinician between consecutive visits.                        */
/*                                                                  */
/* All pure functions; no DOM, no globals. Rendering lives in the   */
/* UI layer so this stays testable and reusable.                    */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ═══════════════════════════════════════════════════════════════ */
/* 1. ATTRIBUTION + AMENDMENT TRAIL                                */
/* ═══════════════════════════════════════════════════════════════ */

function recDayOf(iso) { return String(iso || "").slice(0, 10); }

function recUserLabel(user) {
  if (!user) return "unknown";
  return user.name || user.username || "unknown";
}

/* Stamp a visit on save.

   First save  → author + created entry.
   Same clinician, same day → the note is still being written; refresh the
     timestamp but do NOT spam the trail with an entry per keystroke-save.
   Different clinician OR a later day → an AMENDMENT entry, because that is a
     change to a record someone may already have relied on.

   Returns the visit (mutated) so callers can persist it. Pure apart from that
   mutation — no storage, no DOM. */
function recStampVisit(visit, user, nowIso) {
  if (!visit) return visit;
  var now = nowIso || new Date().toISOString();
  var who = recUserLabel(user);
  var uid = (user && user.id) || "";

  if (!visit.entries) visit.entries = [];

  if (!visit.authored_by) {
    visit.authored_by = who;
    visit.authored_by_id = uid;
    visit.authored_at = visit.date || now;
    visit.entries.push({ at: visit.authored_at, by: who, by_id: uid, kind: "created" });
    visit.updated = now;
    visit.updated_by = who;
    return visit;
  }

  var sameClinician = (uid && visit.authored_by_id) ? (uid === visit.authored_by_id) : (who === visit.authored_by);
  var sameDay = recDayOf(now) === recDayOf(visit.authored_at);

  if (sameClinician && sameDay) {
    visit.updated = now;
    visit.updated_by = who;
    return visit;                       /* still the original sitting */
  }

  /* A later day, or another clinician: this is an amendment to a record that
     may already have been read, referred from, or relied upon. */
  var last = visit.entries[visit.entries.length - 1];
  var lastWasSameAmendment = last && last.kind === "amended" &&
    last.by === who && recDayOf(last.at) === recDayOf(now);
  if (!lastWasSameAmendment) {
    visit.entries.push({
      at: now, by: who, by_id: uid, kind: "amended",
      note: sameClinician ? "edited on a later day" : "edited by another clinician"
    });
    visit.amended = true;
  }
  visit.updated = now;
  visit.updated_by = who;
  return visit;
}

/* Was this record changed after the day it was written? Surfaced in the UI so
   a reader is never misled about what is contemporaneous. */
function recIsAmended(visit) {
  return !!(visit && visit.entries && visit.entries.some(function (e) { return e.kind === "amended"; }));
}

function recAmendments(visit) {
  if (!visit || !visit.entries) return [];
  return visit.entries.filter(function (e) { return e.kind === "amended"; });
}


/* ═══════════════════════════════════════════════════════════════ */
/* 2. DUPLICATE PATIENT DETECTION                                  */
/* ═══════════════════════════════════════════════════════════════ */

/* Normalise a name for comparison: case, punctuation, extra spaces, and word
   ORDER — "Nair, Meera" and "Meera Nair" are the same human being, and a
   registration desk will enter both. */
function recNormName(first, last) {
  var s = String((first || "") + " " + (last || "")).toLowerCase();
  s = s.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.split(" ").sort().join(" ");
}

/* Digits only — "+91 98765 43210" and "9876543210" are one number. Compared on
   the last 10 digits so a country code does not defeat the match. */
function recNormPhone(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}

function recNormDob(dob) { return String(dob || "").slice(0, 10); }

/* Compare one candidate against one existing record.
   Returns {level, reasons[]} where level is:
     "certain"  — the same MRN; this IS the record
     "likely"   — name + DOB, or name + phone
     "possible" — phone alone, or name + close age
   Deterministic and fully explained: the clinician is shown WHY, never just a
   score, because they are the one deciding whether it is the same person. */
function recComparePatients(cand, other) {
  var reasons = [];
  if (!cand || !other) return { level: null, reasons: reasons };

  var cMrn = String(cand.mrn || "").trim().toUpperCase();
  var oMrn = String(other.mrn || "").trim().toUpperCase();
  if (cMrn && oMrn && cMrn === oMrn) {
    return { level: "certain", reasons: ["same MRN (" + oMrn + ")"] };
  }

  var cName = recNormName(cand.first_name, cand.last_name);
  var oName = recNormName(other.first_name, other.last_name);
  var nameSame = !!cName && cName === oName;

  var cDob = recNormDob(cand.dob), oDob = recNormDob(other.dob);
  var dobSame = !!cDob && cDob === oDob;

  var cPh = recNormPhone(cand.phone), oPh = recNormPhone(other.phone);
  var phoneSame = cPh.length >= 7 && cPh === oPh;

  var cAge = parseInt(cand.age, 10), oAge = parseInt(other.age, 10);
  var ageClose = !isNaN(cAge) && !isNaN(oAge) && Math.abs(cAge - oAge) <= 1;

  if (nameSame && dobSame) { reasons.push("same name and date of birth"); return { level: "likely", reasons: reasons }; }
  if (nameSame && phoneSame) { reasons.push("same name and phone number"); return { level: "likely", reasons: reasons }; }
  if (phoneSame && !nameSame) { reasons.push("same phone number, different name (family member?)"); return { level: "possible", reasons: reasons }; }
  if (nameSame && ageClose) { reasons.push("same name and a similar age"); return { level: "possible", reasons: reasons }; }
  if (nameSame) { reasons.push("same name"); return { level: "possible", reasons: reasons }; }
  return { level: null, reasons: reasons };
}

/* Find every existing record that might be this same person.
   Practice/teaching records are excluded — matching a real patient against a
   student's practice case would be noise, and worse, confusing. */
function recFindDuplicates(cand, patients) {
  var out = [];
  if (!cand || !patients) return out;
  var rank = { certain: 0, likely: 1, possible: 2 };
  for (var i = 0; i < patients.length; i++) {
    var o = patients[i];
    if (!o || o.id === cand.id) continue;
    if (o.practice !== cand.practice) continue;        /* never mix real and practice */
    if (o.deleted) continue;
    var r = recComparePatients(cand, o);
    if (!r.level) continue;
    out.push({
      id: o.id, level: r.level, reasons: r.reasons,
      name: ((o.first_name || "") + " " + (o.last_name || "")).trim(),
      mrn: o.mrn || "", dob: o.dob || "", age: o.age || "", phone: o.phone || "",
      created: o.created || ""
    });
  }
  out.sort(function (a, b) { return rank[a.level] - rank[b.level]; });
  return out;
}


/* ═══════════════════════════════════════════════════════════════ */
/* 3. CONTINUOUS CLINICAL RECORD                                   */
/*                                                                  */
/* One chronological narrative for a patient: every visit, with the */
/* findings actually recorded — normal AND abnormal, because "IOP   */
/* 14/15, discs healthy" is a clinical statement, not an absence of */
/* one, and a record that only lists abnormalities cannot show what */
/* was checked and found well.                                      */
/* ═══════════════════════════════════════════════════════════════ */

function recVal(v) {
  if (v === null || v === undefined) return "";
  var s = String(v).trim();
  return s;
}
function recPair(od, os, unit) {
  od = recVal(od); os = recVal(os);
  if (!od && !os) return "";
  return "OD " + (od || "—") + " / OS " + (os || "—") + (unit ? " " + unit : "");
}

/* Compile one visit into labelled sections. Pure: returns data, not HTML. */
function recVisitSections(visit) {
  var d = (visit && visit.data) || {};
  var S = [];
  function add(label, value, flag) {
    if (!value) return;
    S.push({ label: label, value: value, flag: flag || null });
  }

  /* Presenting complaint */
  if (d.cc) add("Complaint", recVal(d.cc));
  if (d.symptoms && d.symptoms.length) {
    add("Symptoms", d.symptoms.map(function (s) { return String(s).replace(/_/g, " "); }).join(", "));
  }
  if (d.temporal && (d.temporal.onset || d.temporal.duration)) {
    add("Onset / duration", [recVal(d.temporal.onset), recVal(d.temporal.duration)].filter(Boolean).join(", "));
  }

  /* Vision + refraction */
  if (d.va) {
    add("Visual acuity (aided)", recPair(d.va.od_aided, d.va.os_aided));
    add("Visual acuity (unaided)", recPair(d.va.od_unaided, d.va.os_unaided));
    add("Pinhole", recPair(d.va.od_ph, d.va.os_ph));
  }
  if (d.rx && (d.rx.od_sph || d.rx.os_sph)) {
    var rxOd = [recVal(d.rx.od_sph), recVal(d.rx.od_cyl), recVal(d.rx.od_ax)].filter(Boolean).join(" / ");
    var rxOs = [recVal(d.rx.os_sph), recVal(d.rx.os_cyl), recVal(d.rx.os_ax)].filter(Boolean).join(" / ");
    add("Refraction", "OD " + (rxOd || "—") + "  OS " + (rxOs || "—") +
      (d.rx.add ? "  add " + recVal(d.rx.add) : ""));
  }

  /* Pressures — flagged, because this is the number that carries risk */
  if (d.iop && (d.iop.od || d.iop.os)) {
    var hi = Math.max(parseFloat(d.iop.od) || 0, parseFloat(d.iop.os) || 0);
    add("IOP", recPair(d.iop.od, d.iop.os, "mmHg"),
      hi > 30 ? "abnormal" : (hi > 21 ? "borderline" : "normal"));
  }

  /* Anterior segment */
  if (d.sl) {
    if (d.sl.findings && d.sl.findings.length) {
      add("Slit lamp findings", d.sl.findings.map(recFindingText).join(", "), "abnormal");
    }
    var vh = recPair(d.sl.od && d.sl.od.vh, d.sl.os && d.sl.os.vh);
    if (vh) add("Van Herick", vh);
    var tb = recPair(d.sl.od && d.sl.od.tbut, d.sl.os && d.sl.os.tbut, "s");
    if (tb) add("TBUT", tb);
  }

  /* Pupils */
  if (d.pupil && d.pupil.rapd && d.pupil.rapd !== "None") {
    add("RAPD", recVal(d.pupil.rapd), "abnormal");
  }

  /* Posterior segment */
  if (d.fun) {
    if (d.fun.findings && d.fun.findings.length) {
      add("Fundus findings", d.fun.findings.map(recFindingText).join(", "), "abnormal");
    }
    var cd = recPair(d.fun.od && d.fun.od.cd, d.fun.os && d.fun.os.cd);
    if (cd) add("Cup:disc", cd);
  }

  /* Impression as it was SHOWN at the time (provenance), falling back to the
     stored list. Never recomputed — a record must show what was seen. */
  var pv = d.engine_provenance;
  if (pv && pv.shown_top && pv.shown_top.length) {
    add("Engine impression (as shown)", pv.shown_top.slice(0, 3).map(function (x) {
      return x.name + " " + (x.prob != null ? Math.round(x.prob * 100) + "%" : "");
    }).join("; "));
  } else if (d.dxList && d.dxList.length) {
    add("Engine impression", d.dxList.slice(0, 3).map(function (x) {
      return x.n + (typeof x.prob === "number" ? " " + Math.round(x.prob * 100) + "%" : "");
    }).join("; "));
  }
  if (d.alerts && d.alerts.length) {
    var urgent = d.alerts.filter(function (a) { return a.l === "urgent"; });
    if (urgent.length) add("Red flags raised", urgent.map(function (a) { return a.m; }).join(" · "), "urgent");
  }

  /* Management */
  if (d.plan) {
    add("Management", recVal(d.plan.mgmt));
    add("Follow-up", recVal(d.plan.followup));
    if (d.plan.ref_to) add("Referral", recVal(d.plan.ref_to) + (d.plan.ref_urgency ? " (" + recVal(d.plan.ref_urgency) + ")" : ""), "referral");
  }

  return S;
}

/* The whole record for one patient, oldest first — the order a clinician
   reads a chart in. */
function recBuildContinuous(patientId, visits) {
  var mine = (visits || []).filter(function (v) { return v && v.patient_id === patientId && !v.deleted; });
  mine.sort(function (a, b) { return String(a.date || "").localeCompare(String(b.date || "")); });
  return mine.map(function (v, i) {
    return {
      id: v.id,
      index: i + 1,
      date: v.date || "",
      type: v.visit_type === "follow_up" ? "Follow-up" : (v.visit_type === "initial" ? "Initial" : "Visit"),
      status: v.status || "",
      author: v.authored_by || v.updated_by || "",
      authored_at: v.authored_at || v.date || "",
      updated: v.updated || "",
      updated_by: v.updated_by || "",
      amended: recIsAmended(v),
      amendments: recAmendments(v),
      kb_version: (v.data && v.data.engine_provenance && v.data.engine_provenance.kb_version) || "",
      sections: recVisitSections(v),
      /* the gap since the previous visit — clinically meaningful context */
      gap_days: i === 0 ? null : recDayGap(mine[i - 1].date, v.date)
    };
  });
}

function recDayGap(a, b) {
  var t1 = Date.parse(a), t2 = Date.parse(b);
  if (isNaN(t1) || isNaN(t2)) return null;
  return Math.round((t2 - t1) / 86400000);
}



/* ═══════════════════════════════════════════════════════════════ */
/* 4. FINDING LATERALITY (clinical review CL-2)                    */
/*                                                                  */
/* Ophthalmology is a bilateral speciality: "Hypopyon" without an   */
/* eye is an incomplete record. It weakens the referral letter and  */
/* makes follow-up comparison impossible ("has the OD hypopyon      */
/* resolved?"). 85 of the 202 clickable findings are inherently     */
/* one-eye, and only one label encoded laterality.                  */
/*                                                                  */
/* MIGRATION SAFETY: a finding is now {label, eye}, but a bare      */
/* string is still accepted everywhere and treated as "laterality   */
/* not recorded". Existing records are NEVER rewritten — a record   */
/* must not gain a laterality it never had. Engine behaviour is     */
/* unchanged: the token comes from the LABEL either way, so red     */
/* flags fire exactly as before.                                    */
/* ═══════════════════════════════════════════════════════════════ */

var REC_EYES = ["OD", "OS", "OU"];

/* The finding's label, whichever shape it is stored in. */
function recFindingLabel(f) {
  if (f && typeof f === "object") return String(f.label == null ? "" : f.label);
  return String(f == null ? "" : f);
}

/* The eye, or "" when it was never recorded (legacy or deliberately blank). */
function recFindingEye(f) {
  if (f && typeof f === "object" && f.eye) return String(f.eye);
  return "";
}

/* How a finding should read in a note. */
function recFindingText(f) {
  var lab = recFindingLabel(f), eye = recFindingEye(f);
  if (!lab) return "";
  return eye ? lab + " (" + eye + ")" : lab;
}

/* Cycle a finding through: absent -> OD -> OS -> OU -> absent.

   One tap per state is the fastest thing possible at the chair, and it means
   laterality cannot be forgotten separately from the finding itself — you
   cannot record the finding WITHOUT passing through an eye. Returns a NEW
   array; callers assign it, so this stays pure and testable. */
function recCycleFinding(list, label) {
  var out = (list || []).slice();
  var idx = -1;
  for (var i = 0; i < out.length; i++) {
    if (recFindingLabel(out[i]) === label) { idx = i; break; }
  }
  if (idx < 0) { out.push({ label: label, eye: "OD" }); return out; }

  var cur = recFindingEye(out[idx]);
  var next = REC_EYES[REC_EYES.indexOf(cur) + 1];
  if (cur === "") next = "OD";              /* legacy string -> start the cycle */
  if (!next) { out.splice(idx, 1); return out; }   /* past OU -> clear it */
  out[idx] = { label: label, eye: next };
  return out;
}

/* Which eye is this label currently recorded as? "" = not present at all. */
function recFindingState(list, label) {
  for (var i = 0; i < (list || []).length; i++) {
    if (recFindingLabel(list[i]) === label) return recFindingEye(list[i]) || "?";
  }
  return "";
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    recStampVisit: recStampVisit, recIsAmended: recIsAmended, recAmendments: recAmendments,
    recNormName: recNormName, recNormPhone: recNormPhone,
    recComparePatients: recComparePatients, recFindDuplicates: recFindDuplicates,
    recVisitSections: recVisitSections, recBuildContinuous: recBuildContinuous,
    recDayGap: recDayGap,
    recFindingLabel: recFindingLabel, recFindingEye: recFindingEye,
    recFindingText: recFindingText, recCycleFinding: recCycleFinding,
    recFindingState: recFindingState, REC_EYES: REC_EYES
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* UI (browser only)                                               */
/* ═══════════════════════════════════════════════════════════════ */
if (typeof document !== "undefined") {

  /* ── Duplicate check at registration ───────────────────────────
     Called once the clinician has entered enough identity to check. Shows
     candidates and lets them OPEN the existing record instead of creating a
     second one. It never merges and never auto-selects: choosing the wrong
     person is far worse than a duplicate, so the human decides. */
  window.recCheckDuplicates = function (draft, onProceed) {
    var pts = (typeof loadPatients === "function") ? loadPatients() : [];
    var dupes = recFindDuplicates(draft, pts);
    if (!dupes.length) { onProceed(); return; }

    var lines = dupes.slice(0, 5).map(function (d, i) {
      return (i + 1) + ". " + d.name + (d.mrn ? "  [" + d.mrn + "]" : "") +
        (d.dob ? "  DOB " + d.dob : (d.age ? "  age " + d.age : "")) +
        "\n     — " + d.reasons.join("; ");
    }).join("\n");

    var certain = dupes[0].level === "certain";
    var msg =
      (certain ? "A record with this MRN ALREADY EXISTS.\n\n"
               : "This may already be a registered patient.\n\n") +
      "Possible match" + (dupes.length > 1 ? "es" : "") + ":\n" + lines + "\n\n" +
      "Press OK to OPEN the first matching record instead of creating a new one.\n" +
      "Press Cancel to create a NEW, separate record.\n\n" +
      "(Nothing is merged either way — two records for one person can be exported and " +
      "reconciled later, but a wrongly merged pair cannot be safely undone.)";

    if (window.confirm(msg)) {
      if (typeof logAudit === "function") {
        logAudit("duplicate_avoided", "Opened existing record instead of creating a duplicate (" +
          dupes[0].reasons.join("; ") + ")", { patient_id: dupes[0].id });
      }
      if (typeof openChart === "function") openChart(dupes[0].id);
      else if (typeof openPatient === "function") openPatient(dupes[0].id);
      return;
    }
    if (typeof logAudit === "function") {
      logAudit("duplicate_overridden", "Created a new record despite a possible match (" +
        dupes[0].reasons.join("; ") + ")", {});
    }
    onProceed();
  };


  /* ── Continuous clinical record ────────────────────────────────
     One scrollable chronological narrative for a patient: every visit, the
     findings recorded (normal AND abnormal), with the timestamp, clinician
     and interval between consecutive visits. This is what a clinician
     continuing a patient actually needs to read. */
  window.recContinuousHtml = function (patientId) {
    var visits = (typeof loadVisits === "function") ? loadVisits() : [];
    var rec = recBuildContinuous(patientId, visits);
    if (!rec.length) return '<div style="padding:12px;font-size:.72rem;color:var(--md)">No visits recorded yet.</div>';

    var flagColour = { urgent: "#c0392b", abnormal: "#b9770e", borderline: "#b9770e",
                       referral: "#2e7d46", normal: "var(--sl)" };
    var h = '<div class="rec-continuous">';
    rec.forEach(function (v) {
      /* Between-visit separator: the interval is clinical context in itself. */
      if (v.gap_days !== null) {
        h += '<div style="text-align:center;font-size:.58rem;color:var(--md);margin:10px 0 6px">' +
             '— ' + v.gap_days + ' day' + (v.gap_days === 1 ? "" : "s") + ' later —</div>';
      }
      h += '<div style="border:1px solid var(--fg);border-radius:var(--rl);padding:10px 12px;margin-bottom:8px;background:var(--wh)">';
      h += '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;border-bottom:1px solid var(--cl);padding-bottom:5px;margin-bottom:6px">' +
           '<b style="font-size:.76rem">' + escHtml(v.type) + ' ' + escHtml(v.index) + '</b>' +
           '<span style="font-family:var(--mono);font-size:.62rem;color:var(--sl)">' +
             escHtml(String(v.date).replace("T", " ").slice(0, 16)) + '</span>' +
           (v.author ? '<span style="font-size:.62rem;color:var(--sl)">by <b>' + escHtml(v.author) + '</b></span>' : '') +
           (v.status === "completed" ? '<span style="font-size:.58rem;color:#2e7d46">✓ completed</span>'
                                     : '<span style="font-size:.58rem;color:var(--md)">● in progress</span>') +
           (v.kb_version ? '<span style="font-size:.55rem;color:var(--sv)">KB v' + escHtml(v.kb_version) + '</span>' : '') +
           '</div>';

      /* Amendments are stated plainly — a reader must never mistake a later
         edit for contemporaneous documentation. */
      if (v.amended) {
        h += '<div style="background:#fff4e5;border:1px solid #f0c58a;border-radius:var(--r);padding:5px 7px;font-size:.6rem;color:#8a5200;margin-bottom:6px">' +
             '⚠ This entry was amended after the day it was written:' +
             v.amendments.map(function (a) {
               return '<br>· ' + escHtml(String(a.at).replace("T", " ").slice(0, 16)) + ' by <b>' + escHtml(a.by) + '</b>' +
                      (a.note ? ' — ' + escHtml(a.note) : '');
             }).join("") + '</div>';
      }

      if (!v.sections.length) {
        h += '<div style="font-size:.66rem;color:var(--md)">Nothing recorded in this visit.</div>';
      } else {
        v.sections.forEach(function (s) {
          var c = s.flag ? (flagColour[s.flag] || "var(--ink)") : "var(--ink)";
          h += '<div style="display:flex;gap:8px;font-size:.68rem;padding:2px 0;border-top:1px solid var(--cl)">' +
               '<span style="flex:0 0 150px;color:var(--sl)">' + escHtml(s.label) + '</span>' +
               '<span style="flex:1;color:' + c + (s.flag === "urgent" ? ";font-weight:600" : "") + '">' +
                 escHtml(s.value) + '</span></div>';
        });
      }
      h += '</div>';
    });
    h += '</div>';
    return h;
  };
}
