/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SPECTACLE ADVISOR                                     */
/*                                                                  */
/* Recommends lens design, material, coatings based on:            */
/*   - Prescription (sphere, cylinder, add)                        */
/*   - Age                                                         */
/*   - Occupation / visual demands                                 */
/*   - Lifestyle factors                                           */
/*                                                                  */
/* Advisory only — clinician makes final recommendation            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* The refraction actually being dispensed: the FINAL prescription when the
   clinician has written one, otherwise the subjective/working refraction.
   (rxEffectiveStage lives in ui-pages.js; fall back safely if absent.) */
function saRx(eye, part) {
  var stage = (typeof rxEffectiveStage === "function") ? rxEffectiveStage() : "";
  var k = (stage ? stage + "_" : "") + eye + "_" + part;
  return V.rx[k];
}

/* Screen hours, read safely. `V.hxS` is present on every blankVisit(), but a
   visit that arrived from a restored backup or another device need not carry
   it — and `V.hxS.vdu` on an absent hxS threw, taking the whole advisor panel
   down with it (tools/stress/clinical.js, AD2). */
function saVdu() {
  var hxS = (typeof V !== "undefined" && V) ? V.hxS : null;
  return (hxS && hxS.vdu !== undefined) ? (parseFloat(hxS.vdu) || 0) : 0;
}

function saAge() {
  return (typeof P !== "undefined" && P) ? (parseInt(P.age, 10) || 0) : 0;
}

/* ═══════════════════════════════════════════════════════════════ */
/* LENS INDEX RECOMMENDATION                                       */
/* Based on highest sphere + cylinder power                        */
/* ═══════════════════════════════════════════════════════════════ */

function recommendLensIndex() {
  var sphOd = Math.abs(parseFloat(saRx("od","sph")) || 0);
  var sphOs = Math.abs(parseFloat(saRx("os","sph")) || 0);
  var cylOd = Math.abs(parseFloat(saRx("od","cyl")) || 0);
  var cylOs = Math.abs(parseFloat(saRx("os","cyl")) || 0);

  /* Calculate effective power (sphere + half cylinder as proxy) */
  var powerOd = sphOd + (cylOd * 0.5);
  var powerOs = sphOs + (cylOs * 0.5);
  var maxPower = Math.max(powerOd, powerOs);

  if (maxPower <= 2.00) {
    return {
      index: "CR-39 (1.50) or Polycarbonate (1.59)",
      rationale: "Low prescription — standard index sufficient. Polycarbonate if impact resistance needed.",
      thickness: "Standard"
    };
  } else if (maxPower <= 4.00) {
    return {
      index: "Polycarbonate (1.59) or Trivex (1.53)",
      rationale: "Moderate power — mid-index for thinner profile. Trivex for superior optics.",
      thickness: "Moderate reduction"
    };
  } else if (maxPower <= 6.00) {
    return {
      index: "Hi-Index 1.60 or 1.67",
      rationale: "Higher power — high-index recommended for cosmetics and weight reduction.",
      thickness: "Significantly thinner"
    };
  } else if (maxPower <= 8.00) {
    return {
      index: "Hi-Index 1.67",
      rationale: "High power — 1.67 strongly recommended. Consider aspheric design.",
      thickness: "Much thinner"
    };
  } else {
    return {
      index: "Hi-Index 1.74",
      rationale: "Very high power — 1.74 essential for acceptable thickness and cosmetics. Aspheric mandatory.",
      thickness: "Maximum thinness"
    };
  }
}


/* ═══════════════════════════════════════════════════════════════ */
/* LENS DESIGN RECOMMENDATION                                     */
/* Based on add power, age, occupation                             */
/* ═══════════════════════════════════════════════════════════════ */

function recommendLensDesign() {
  var age = saAge();
  var hasAdd = !!(saRx("od","add") || saRx("os","add"));
  var addVal = parseFloat(saRx("od","add")) || parseFloat(saRx("os","add")) || 0;
  var occ = (P.occupation || "").toLowerCase();
  var vdu = saVdu();

  var recommendations = [];

  /* Presbyopic */
  if (hasAdd || (age >= 40 && addVal === 0)) {

    if (addVal <= 1.00 && age < 50) {
      recommendations.push({
        design: "Anti-fatigue / relaxation lens",
        rationale: "Early presbyope — slight boost for near comfort without full progressive.",
        priority: "primary"
      });
      recommendations.push({
        design: "Progressive — freeform/digital",
        rationale: "If patient prefers a single pair for all distances.",
        priority: "alternative"
      });
    } else if (vdu >= 4) {
      recommendations.push({
        design: "Occupational / office progressive",
        rationale: "VDU " + vdu + "hrs/day — enhanced intermediate zone for screen distances.",
        priority: "primary"
      });
      recommendations.push({
        design: "Progressive — freeform/digital",
        rationale: "For general use in addition to occupational pair.",
        priority: "alternative"
      });
    } else if (addVal >= 2.50) {
      recommendations.push({
        design: "Progressive — freeform/digital",
        rationale: "High add — digital freeform for wider corridors and less swim.",
        priority: "primary"
      });
    } else {
      recommendations.push({
        design: "Progressive — standard or freeform",
        rationale: "Standard progressive suitable. Digital upgrade for better adaptation.",
        priority: "primary"
      });
    }

    /* Bifocal option */
    recommendations.push({
      design: "Bifocal — Flat Top D28",
      rationale: "If patient has difficulty adapting to progressives or prefers clear near segment.",
      priority: "alternative"
    });

  } else {
    /* Non-presbyopic */
    recommendations.push({
      design: "Single Vision — distance",
      rationale: "No add required — standard single vision correction.",
      priority: "primary"
    });

    /* Special cases */
    if (vdu >= 6 && age >= 25) {
      recommendations.push({
        design: "Anti-fatigue / blue light lens",
        rationale: "Heavy screen use (" + vdu + "hrs/day) — digital strain reduction.",
        priority: "suggestion"
      });
    }
  }

  return recommendations;
}


/* ═══════════════════════════════════════════════════════════════ */
/* COATING RECOMMENDATIONS                                         */
/* ═══════════════════════════════════════════════════════════════ */

function recommendCoatings() {
  var coatings = [];
  var vdu = saVdu();
  var occ = (P.occupation || "").toLowerCase();

  /* MAR — always recommended */
  coatings.push({
    coating: "Anti-reflective (MAR/AR)",
    rationale: "Reduces reflections, improves clarity and cosmetics. Recommended for all prescriptions.",
    priority: "essential"
  });

  /* Blue light — for screen users */
  if (vdu >= 3) {
    coatings.push({
      coating: "Blue light filter",
      rationale: "VDU " + vdu + "hrs/day — reduces digital eye strain and blue light exposure.",
      priority: "recommended"
    });
  }

  /* UV — always */
  coatings.push({
    coating: "UV 400 protection",
    rationale: "Blocks harmful UV. Usually included with AR coating.",
    priority: "essential"
  });

  /* Photochromic */
  if (occ.indexOf("outdoor") >= 0 || occ.indexOf("driv") >= 0 || occ.indexOf("field") >= 0) {
    coatings.push({
      coating: "Photochromic (Transitions)",
      rationale: "Outdoor exposure — adaptive tinting for comfort.",
      priority: "recommended"
    });
  }

  /* Scratch resistant */
  coatings.push({
    coating: "Scratch resistant (hard coat)",
    rationale: "Extends lens life. Essential for polycarbonate.",
    priority: "essential"
  });

  /* Hydrophobic */
  coatings.push({
    coating: "Hydrophobic + oleophobic",
    rationale: "Repels water and fingerprints. Easier cleaning.",
    priority: "recommended"
  });

  return coatings;
}


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER SPECTACLE ADVISOR                                        */
/* Returns HTML with all recommendations                           */
/* ═══════════════════════════════════════════════════════════════ */

function renderSpectacleAdvisor() {
  /* Check if Rx data exists */
  if (!saRx("od","sph") && !saRx("os","sph")) {
    return '<div style="font-size:.62rem;color:var(--sv);padding:8px">Enter refraction data to generate lens recommendations.</div>';
  }

  var h = '';

  /* Lens Index */
  var indexRec = recommendLensIndex();
  h += '<div style="padding:8px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
  h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:3px">Lens Material</div>';
  h += '<div style="font-size:.66rem;font-weight:500">' + indexRec.index + '</div>';
  h += '<div style="font-size:.56rem;color:var(--sl);margin-top:2px">' + indexRec.rationale + '</div>';
  h += '</div>';

  /* Lens Design */
  var designRecs = recommendLensDesign();
  h += '<div style="padding:8px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
  h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:3px">Lens Design</div>';

  for (var di = 0; di < designRecs.length; di++) {
    var dr = designRecs[di];
    var priorityLabel = dr.priority === "primary" ? "★ PRIMARY" : dr.priority === "alternative" ? "ALTERNATIVE" : "SUGGESTION";
    var priorityColor = dr.priority === "primary" ? "var(--ink)" : "var(--sv)";

    h += '<div style="padding:4px 0;' + (di > 0 ? 'border-top:1px solid var(--fg);margin-top:4px;' : '') + '">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center">';
    h += '<span style="font-size:.66rem;font-weight:500">' + dr.design + '</span>';
    h += '<span style="font-size:.46rem;font-weight:600;color:' + priorityColor + ';letter-spacing:.5px">' + priorityLabel + '</span>';
    h += '</div>';
    h += '<div style="font-size:.54rem;color:var(--sl);margin-top:1px">' + dr.rationale + '</div>';
    h += '</div>';
  }
  h += '</div>';

  /* Coatings */
  var coatingRecs = recommendCoatings();
  h += '<div style="padding:8px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
  h += '<div style="font-weight:600;font-size:.7rem;margin-bottom:3px">Coatings</div>';

  for (var ci = 0; ci < coatingRecs.length; ci++) {
    var cr = coatingRecs[ci];
    var cpLabel = cr.priority === "essential" ? "ESSENTIAL" : "RECOMMENDED";
    var cpColor = cr.priority === "essential" ? "var(--ink)" : "var(--md)";

    h += '<div style="padding:2px 0;font-size:.62rem">';
    h += '<span style="font-weight:500">' + cr.coating + '</span>';
    h += ' <span style="font-size:.46rem;font-weight:600;color:' + cpColor + '">' + cpLabel + '</span>';
    h += '<div style="font-size:.52rem;color:var(--sl)">' + cr.rationale + '</div>';
    h += '</div>';
  }
  h += '</div>';

  return h;
}
