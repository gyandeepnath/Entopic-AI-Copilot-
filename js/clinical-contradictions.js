/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CONTRADICTION DETECTION  (Phase 4 finding F-2)        */
/*                                                                  */
/* js/clinical-validators.js checks each value on its own: is this  */
/* IOP plausible, is this axis in range. What nothing checked was   */
/* whether two individually-plausible values can both be true.      */
/*                                                                  */
/* A cylinder of −1.25 is plausible. An axis field left blank is    */
/* plausible. A cylinder WITH NO AXIS is not a prescription — it is */
/* an incomplete one that will be dispensed wrongly, and neither    */
/* value looks wrong on its own.                                    */
/*                                                                  */
/* Ten years of clinical software says the most valuable thing a    */
/* system can do with contradictory data is SAY SO. The engine      */
/* previously scored straight through it.                           */
/*                                                                  */
/* ── TWO CLASSES, AND THE DIFFERENCE MATTERS ──                    */
/*                                                                  */
/*   CERTAIN   Logically or definitionally impossible. A cylinder   */
/*             without an axis is not a matter of opinion. These I  */
/*             can assert, and they are reported as errors.         */
/*                                                                  */
/*   CLINICAL  Probably wrong, but a clinician might have a reason. */
/*             A reading add on a 12-year-old is unusual, not       */
/*             impossible. These are reported as questions, marked  */
/*             NEEDS_CLINICAL_REVIEW, and the founder decides       */
/*             whether each is worth raising at all.                */
/*                                                                  */
/* ── WHAT THIS NEVER DOES ──                                       */
/*                                                                  */
/* It never blocks entry, never changes a value, never alters the   */
/* differential, and never reaches the engine. A contradiction is   */
/* information for the clinician, not a decision. The clinician may */
/* be right and the checker wrong — that is why it asks rather than */
/* corrects.                                                        */
/*                                                                  */
/* Load order: after data-model.js. Pure — no DOM, no storage.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

function _cnum(x) {
  if (x === undefined || x === null || x === "") return null;
  var n = parseFloat(x);
  return isFinite(n) ? n : null;
}
function _cfilled(x) { return x !== undefined && x !== null && String(x).trim() !== ""; }

/* One finding. `certain` separates fact from opinion. */
function _contra(id, level, message, certain, why) {
  return { id: id, level: level, message: message, certain: !!certain, why: why || "" };
}

function clinContradictions(V, P) {
  var out = [];
  if (!V) return out;

  /* ═══ CERTAIN — definitional, not a judgement ═══ */

  /* A cylinder needs an axis and an axis needs a cylinder. Either alone is
     not a prescription; it is one that will be dispensed wrongly, and each
     half looks perfectly normal to a per-field check. */
  if (V.rx) {
    ["od", "os"].forEach(function (eye) {
      var cyl = _cnum(V.rx[eye + "_cyl"]);
      var ax = V.rx[eye + "_ax"];
      var E = eye.toUpperCase();
      if (cyl !== null && cyl !== 0 && !_cfilled(ax)) {
        out.push(_contra("rx_cyl_no_axis", "error",
          E + ": cylinder " + cyl + " recorded with no axis. This cannot be dispensed.",
          true));
      }
      if (_cfilled(ax) && (cyl === null || cyl === 0)) {
        out.push(_contra("rx_axis_no_cyl", "error",
          E + ": axis " + ax + " recorded with no cylinder. One of the two is wrong.",
          true));
      }
      /* Prism without a base direction is the same defect in a different field. */
      if (_cnum(V.rx[eye + "_prism"]) && !_cfilled(V.rx[eye + "_base"])) {
        out.push(_contra("rx_prism_no_base", "error",
          E + ": prism recorded with no base direction.", true));
      }
    });
  }

  /* A section asserted normal cannot also carry findings. Both statements are
     in the record; they cannot both be true. */
  if (V.sl && Array.isArray(V.sl.findings) && V.sl.findings.length) {
    ["od", "os"].forEach(function (eye) {
      var side = V.sl[eye];
      if (!side) return;
      var forThisEye = V.sl.findings.filter(function (f) {
        var e = (f && f.eye) || "";
        return e === eye.toUpperCase() || e === "OU";
      });
      if (!forThisEye.length) return;
      if (String(side.cornea || "").toLowerCase() === "clear" ||
          String(side.lids || "").toUpperCase() === "WNL") {
        out.push(_contra("sl_wnl_with_findings", "error",
          eye.toUpperCase() + ": the slit lamp is recorded as normal, but " +
          forThisEye.length + " finding(s) are also recorded for this eye.",
          true, "One of the two entries is stale — most often a 'Normal' quick-fill " +
                "applied after findings were entered."));
      }
    });
  }

  /* Onset and course cannot be opposites of each other. */
  if (V.temporal) {
    var onset = String(V.temporal.onset || "").toLowerCase();
    var course = String(V.temporal.course || "").toLowerCase();
    if (/acute|sudden/.test(onset) && /chronic|long/.test(course)) {
      out.push(_contra("temporal_conflict", "error",
        "Onset is recorded as acute but the course as chronic. " +
        "An acute-on-chronic presentation is common — if that is what this is, " +
        "record it as such so the engine weighs it correctly.",
        true));
    }
  }

  /* ═══ CLINICAL — a question, not a verdict ═══
     ⚠ NEEDS_CLINICAL_REVIEW: whether each of these is worth raising, and at
     what boundary, is the founder's call. They are deliberately phrased as
     questions because a clinician may have a good reason. */

  /* A reading addition in someone too young to be presbyopic. Unusual, and it
     has legitimate uses (accommodative esotropia, accommodative insufficiency),
     so it asks rather than asserts. */
  var age = P ? _cnum(P.age) : null;
  if (V.rx && age !== null && age < 35) {
    ["od", "os"].forEach(function (eye) {
      if (_cnum(V.rx[eye + "_add"])) {
        out.push(_contra("add_young", "question",
          eye.toUpperCase() + ": a reading addition is recorded at age " + age +
          ". Intended? (Accommodative esotropia and accommodative insufficiency " +
          "are legitimate reasons.)", false));
      }
    });
  }

  /* Pinhole improves the vision, but best-corrected is no better than unaided.
     If pinhole helped, refraction should have helped too — so either the
     refraction is incomplete or the pinhole entry is wrong. */
  if (V.va && String(V.va.ph_improves || "").toLowerCase() === "yes") {
    ["od", "os"].forEach(function (eye) {
      var un = V.va[eye + "_un"], bva = V.va[eye + "_bva"];
      if (_cfilled(un) && _cfilled(bva) && String(un) === String(bva)) {
        out.push(_contra("ph_improves_no_bcva_gain", "question",
          eye.toUpperCase() + ": pinhole is recorded as improving vision, but " +
          "best-corrected acuity equals unaided (" + un + "). Is the refraction complete?",
          false));
      }
    });
  }

  /* Fundus findings that need a dilated view, with no dilation recorded. */
  if (V.fun && Array.isArray(V.fun.findings) && V.fun.findings.length &&
      V.dil && !_cfilled(V.dil.drug) && V.fun.dilated === false) {
    out.push(_contra("fundus_findings_undilated", "question",
      "Peripheral fundus findings are recorded but no dilation is documented. " +
      "Was the view dilated?", false));
  }

  /* Both eyes identical across several independent measurements is possible,
     and is also what a copy-paste looks like. Asked, never asserted. */
  if (V.rx) {
    var same = 0, compared = 0;
    ["sph", "cyl", "ax", "add"].forEach(function (f) {
      var a = V.rx["od_" + f], b = V.rx["os_" + f];
      if (!_cfilled(a) || !_cfilled(b)) return;
      compared++;
      if (String(a) === String(b)) same++;
    });
    if (compared >= 3 && same === compared) {
      out.push(_contra("rx_eyes_identical", "question",
        "Both eyes have identical values across " + compared + " refraction fields. " +
        "Genuinely symmetrical, or copied?", false));
    }
  }

  /* A finding with no eye (Phase 2 safety finding CS-11).

     Findings are stored as {label, eye} but nothing requires the eye, so
     "corneal ulcer" can be recorded against neither eye. On the screen it
     looks complete; in the record and the referral letter it is not, and the
     reader cannot recover which eye it was.

     A question rather than an error: a few findings are genuinely not
     lateralised, and it is not this file's place to decide which. */
  ["sl", "fun"].forEach(function (sec) {
    var f = V[sec] && V[sec].findings;
    if (!Array.isArray(f) || !f.length) return;
    var noEye = f.filter(function (x) {
      return x && x.label && !String(x.eye || "").trim();
    });
    if (!noEye.length) return;
    out.push(_contra("finding_no_eye", "question",
      (sec === "sl" ? "Slit lamp" : "Fundus") + ": " + noEye.length +
      " finding(s) recorded without an eye — " +
      noEye.slice(0, 3).map(function (x) { return x.label; }).join(", ") +
      (noEye.length > 3 ? "…" : "") + ". Which side?",
      false, "The record and any referral letter will carry the finding with no " +
             "laterality, and the reader cannot recover it."));
  });

  /* Errors first — a definitional contradiction outranks a question. */
  out.sort(function (a, b) {
    if (a.level !== b.level) return a.level === "error" ? -1 : 1;
    return 0;
  });
  return out;
}

/* Counts, for a compact indicator. */
function clinContradictionSummary(V, P) {
  var list = clinContradictions(V, P);
  return {
    total: list.length,
    errors: list.filter(function (x) { return x.level === "error"; }).length,
    questions: list.filter(function (x) { return x.level === "question"; }).length
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    clinContradictions: clinContradictions,
    clinContradictionSummary: clinContradictionSummary
  };
}
