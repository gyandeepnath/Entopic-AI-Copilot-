/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — CLINICAL RISK CALCULATORS                             */
/*                                                                  */
/* OHTS:   Glaucoma conversion risk                                */
/* ETDRS:  Diabetic retinopathy severity grading                   */
/* AREDS2: AMD progression risk                                    */
/*                                                                  */
/* All calculators use data already in the visit — no extra input  */
/* Results displayed via advisory panel or diagnosis page           */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ═══════════════════════════════════════════════════════════════ */
/* OHTS — OCULAR HYPERTENSION TREATMENT STUDY                      */
/* Estimates 5-year risk of developing POAG                        */
/*                                                                  */
/* Risk factors:                                                    */
/*   - Age                                                         */
/*   - IOP                                                         */
/*   - CCT (central corneal thickness)                             */
/*   - Vertical C/D ratio                                         */
/*   - PSD (pattern standard deviation)                            */
/*                                                                  */
/* Simplified scoring based on published OHTS model                */
/* ═══════════════════════════════════════════════════════════════ */

function calculateOHTSRisk() {
  var result = {
    applicable: false,
    score: 0,
    risk_5yr: "",
    risk_category: "",
    factors: [],
    recommendation: ""
  };

  /* Check if we have the needed data */
  var age = parseInt(P.age) || 0;
  var iopOd = parseFloat(V.iop.od) || 0;
  var iopOs = parseFloat(V.iop.os) || 0;
  var iop = Math.max(iopOd, iopOs);
  var cctOd = parseFloat(V.iop.od_cct) || 0;
  var cctOs = parseFloat(V.iop.os_cct) || 0;
  var cct = 0;
  if (cctOd > 0 && cctOs > 0) cct = Math.min(cctOd, cctOs);
  else if (cctOd > 0) cct = cctOd;
  else if (cctOs > 0) cct = cctOs;
  var cdOd = parseFloat(V.fun.od.cd_v) || 0;
  var cdOs = parseFloat(V.fun.os.cd_v) || 0;
  var cd = Math.max(cdOd, cdOs);
  var psd = 0;
  var psdOd = parseFloat(V.inv.vf_psd_od) || 0;
  var psdOs = parseFloat(V.inv.vf_psd_os) || 0;
  if (psdOd > 0 || psdOs > 0) psd = Math.max(psdOd, psdOs);

  /* Need at minimum IOP to be applicable */
  if (iop <= 0) return result;

  result.applicable = true;
  var points = 0;

  /* Age scoring */
  if (age >= 65) {
    points += 3;
    result.factors.push("Age ≥65: +3");
  } else if (age >= 55) {
    points += 2;
    result.factors.push("Age 55-64: +2");
  } else if (age >= 45) {
    points += 1;
    result.factors.push("Age 45-54: +1");
  } else {
    result.factors.push("Age <45: +0");
  }

  /* IOP scoring */
  if (iop >= 26) {
    points += 3;
    result.factors.push("IOP ≥26: +3");
  } else if (iop >= 24) {
    points += 2;
    result.factors.push("IOP 24-25: +2");
  } else if (iop >= 22) {
    points += 1;
    result.factors.push("IOP 22-23: +1");
  } else {
    result.factors.push("IOP <22: +0");
  }

  /* CCT scoring */
  if (cct > 0) {
    if (cct <= 520) {
      points += 3;
      result.factors.push("CCT ≤520μm: +3");
    } else if (cct <= 555) {
      points += 2;
      result.factors.push("CCT 521-555μm: +2");
    } else if (cct <= 588) {
      points += 1;
      result.factors.push("CCT 556-588μm: +1");
    } else {
      result.factors.push("CCT >588μm: +0");
    }
  } else {
    result.factors.push("CCT: not measured");
  }

  /* C/D scoring */
  if (cd > 0) {
    if (cd >= 0.5) {
      points += 2;
      result.factors.push("C/D ≥0.5: +2");
    } else if (cd >= 0.4) {
      points += 1;
      result.factors.push("C/D 0.4-0.49: +1");
    } else {
      result.factors.push("C/D <0.4: +0");
    }
  } else {
    result.factors.push("C/D: not assessed");
  }

  /* PSD scoring */
  if (psd > 0) {
    if (psd >= 2.0) {
      points += 2;
      result.factors.push("PSD ≥2.0: +2");
    } else if (psd >= 1.5) {
      points += 1;
      result.factors.push("PSD 1.5-1.9: +1");
    } else {
      result.factors.push("PSD <1.5: +0");
    }
  } else {
    result.factors.push("PSD: not tested");
  }

  result.score = points;

  /* Risk stratification (simplified OHTS model) */
  if (points <= 3) {
    result.risk_5yr = "~4%";
    result.risk_category = "Low";
    result.recommendation = "Monitor annually — IOP, disc assessment, baseline VF";
  } else if (points <= 6) {
    result.risk_5yr = "~10%";
    result.risk_category = "Moderate";
    result.recommendation = "Consider treatment if additional risk factors. Monitor every 6 months.";
  } else if (points <= 9) {
    result.risk_5yr = "~20%";
    result.risk_category = "High";
    result.recommendation = "Strongly consider IOP-lowering treatment. 6-monthly monitoring.";
  } else {
    result.risk_5yr = ">30%";
    result.risk_category = "Very High";
    result.recommendation = "Initiate treatment. 3-4 monthly monitoring. Consider referral.";
  }

  return result;
}


/* ═══════════════════════════════════════════════════════════════ */
/* ETDRS — DIABETIC RETINOPATHY SEVERITY                           */
/* Grades DR based on fundus findings                              */
/* ═══════════════════════════════════════════════════════════════ */

function gradeETDRS() {
  var result = {
    applicable: false,
    grade_od: "",
    grade_os: "",
    level_od: 0,
    level_os: 0,
    recommendation: "",
    screening_interval: ""
  };

  /* Check if diabetic */
  if (!V.hxM || !V.hxM.dm) return result;

  result.applicable = true;

  var findings = V.fun ? V.fun.findings : [];
  var findingSet = new Set(findings);

  /* Grade based on findings present */
  var hasMicroaneurysms = findingSet.has("Microaneurysms");
  var hasDotBlot = findingSet.has("Dot-blot hemorrhages");
  var hasFlame = findingSet.has("Flame hemorrhages");
  var hasHardExudates = findingSet.has("Hard exudates");
  var hasCWS = findingSet.has("Cotton wool spots");
  var hasVenousBeading = findingSet.has("Venous beading");
  var hasIRMA = findingSet.has("IRMA");
  var hasNVD = findingSet.has("NVD (neovascularization disc)");
  var hasNVE = findingSet.has("NVE (neovascularization elsewhere)");
  var hasMacEdema = findingSet.has("Macular edema — clinical") || findingSet.has("Cystoid macular edema (CME)");

  /* Determine severity level */
  if (hasNVD || hasNVE) {
    result.grade_od = "Proliferative DR (PDR)";
    result.level_od = 5;
    result.recommendation = "URGENT ophthalmology referral for PRP consideration";
    result.screening_interval = "Immediate referral";
  } else if ((hasVenousBeading && hasIRMA) || (hasCWS && hasIRMA)) {
    result.grade_od = "Severe NPDR";
    result.level_od = 4;
    result.recommendation = "Referral within 2-4 weeks. High risk of progression to PDR.";
    result.screening_interval = "2-3 months";
  } else if (hasCWS || hasVenousBeading || hasIRMA) {
    result.grade_od = "Moderate NPDR";
    result.level_od = 3;
    result.recommendation = "Ophthalmology referral. Monitor closely.";
    result.screening_interval = "3-6 months";
  } else if (hasMicroaneurysms || hasDotBlot || hasFlame || hasHardExudates) {
    result.grade_od = "Mild NPDR";
    result.level_od = 2;
    result.recommendation = "Optimize glycemic control. Annual screening.";
    result.screening_interval = "12 months";
  } else {
    result.grade_od = "No apparent DR";
    result.level_od = 1;
    result.recommendation = "Continue annual diabetic eye screening";
    result.screening_interval = "12 months";
  }

  /* Copy to OS (simplified — in practice, grade each eye separately) */
  result.grade_os = result.grade_od;
  result.level_os = result.level_od;

  /* Macular edema modifier */
  if (hasMacEdema) {
    result.recommendation += " PLUS clinically significant macular edema — OCT macula + ophthalmology referral.";
    result.screening_interval = "Immediate referral";
  }

  return result;
}


/* ═══════════════════════════════════════════════════════════════ */
/* AREDS2 — AMD PROGRESSION RISK                                   */
/* Estimates 5-year risk of progression to advanced AMD             */
/* ═══════════════════════════════════════════════════════════════ */

function calculateAREDS2Risk() {
  var result = {
    applicable: false,
    category: 0,
    category_name: "",
    risk_5yr: "",
    supplement_indicated: false,
    recommendation: ""
  };

  /* Check for AMD-related findings */
  var findings = V.fun ? V.fun.findings : [];
  var findingSet = new Set(findings);

  var hasSmallDrusen = findingSet.has("Drusen — small (<63μm)");
  var hasMedDrusen = findingSet.has("Drusen — medium (63-125μm)");
  var hasLargeDrusen = findingSet.has("Drusen — large (>125μm)");
  var hasRPE = findingSet.has("RPE changes");
  var hasGA = findingSet.has("Geographic atrophy");
  var hasCNV = findingSet.has("Subretinal hemorrhage / CNV");

  /* No AMD-related findings */
  if (!hasSmallDrusen && !hasMedDrusen && !hasLargeDrusen && !hasRPE && !hasGA && !hasCNV) {
    return result;
  }

  result.applicable = true;

  /* AREDS categories */
  if (hasCNV) {
    result.category = 5;
    result.category_name = "Neovascular AMD (one eye)";
    result.risk_5yr = "~45% fellow eye";
    result.supplement_indicated = true;
    result.recommendation = "URGENT referral for anti-VEGF evaluation. AREDS2 supplements for fellow eye. Monthly monitoring.";
  } else if (hasGA) {
    result.category = 4;
    result.category_name = "Advanced dry AMD (GA)";
    result.risk_5yr = "~30-50%";
    result.supplement_indicated = true;
    result.recommendation = "AREDS2 supplements. Home Amsler grid monitoring. Refer if new symptoms. 6-monthly review.";
  } else if (hasLargeDrusen || (hasMedDrusen && hasRPE)) {
    result.category = 3;
    result.category_name = "Intermediate AMD (AREDS 3)";
    result.risk_5yr = "~18-25%";
    result.supplement_indicated = true;
    result.recommendation = "AREDS2 supplements recommended. Amsler grid monitoring at home. OCT macula baseline. 6-12 monthly review.";
  } else if (hasMedDrusen) {
    result.category = 2;
    result.category_name = "Early AMD (AREDS 2)";
    result.risk_5yr = "~1-5%";
    result.supplement_indicated = false;
    result.recommendation = "Monitor annually. UV protection. Smoking cessation. Healthy diet. Supplements NOT yet indicated.";
  } else {
    result.category = 1;
    result.category_name = "Normal aging (small drusen only)";
    result.risk_5yr = "<1%";
    result.supplement_indicated = false;
    result.recommendation = "Normal aging changes. Standard follow-up. No supplements needed.";
  }

  return result;
}


/* ═══════════════════════════════════════════════════════════════ */
/* RENDER RISK CALCULATORS                                         */
/* Called from the diagnosis page or advisory panel                 */
/* Returns HTML string for display                                 */
/* ═══════════════════════════════════════════════════════════════ */

function renderRiskCalculators() {
  var h = "";

  /* OHTS */
  var ohts = calculateOHTSRisk();
  if (ohts.applicable) {
    h += '<div style="padding:10px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
    h += '<div style="font-weight:600;font-size:.72rem;margin-bottom:4px">OHTS Glaucoma Risk Calculator</div>';
    h += '<div style="font-size:.62rem;color:var(--sl);margin-bottom:6px">5-year risk of developing POAG</div>';

    for (var oi = 0; oi < ohts.factors.length; oi++) {
      h += '<div style="font-size:.58rem;color:var(--md);padding:1px 0">' + ohts.factors[oi] + '</div>';
    }

    h += '<div style="margin-top:6px;padding:6px;background:var(--wh);border-radius:var(--r);font-family:var(--mono)">';
    h += '<div style="font-size:.72rem;font-weight:600">Score: ' + ohts.score + ' — ' + ohts.risk_category + ' Risk</div>';
    h += '<div style="font-size:.62rem;color:var(--sl)">5-year conversion: ' + ohts.risk_5yr + '</div>';
    h += '<div style="font-size:.58rem;color:var(--md);margin-top:3px">' + ohts.recommendation + '</div>';
    h += '</div></div>';
  }

  /* ETDRS */
  var etdrs = gradeETDRS();
  if (etdrs.applicable) {
    h += '<div style="padding:10px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
    h += '<div style="font-weight:600;font-size:.72rem;margin-bottom:4px">ETDRS DR Severity</div>';

    h += '<div style="margin-top:4px;padding:6px;background:var(--wh);border-radius:var(--r);font-family:var(--mono)">';
    h += '<div style="font-size:.72rem;font-weight:600">' + etdrs.grade_od + '</div>';
    h += '<div style="font-size:.62rem;color:var(--sl)">Screening interval: ' + etdrs.screening_interval + '</div>';
    h += '<div style="font-size:.58rem;color:var(--md);margin-top:3px">' + etdrs.recommendation + '</div>';
    h += '</div></div>';
  }

  /* AREDS2 */
  var areds = calculateAREDS2Risk();
  if (areds.applicable) {
    h += '<div style="padding:10px;border:1px solid var(--fg);border-radius:var(--r);margin-bottom:8px;background:var(--sn)">';
    h += '<div style="font-weight:600;font-size:.72rem;margin-bottom:4px">AREDS2 AMD Risk</div>';

    h += '<div style="margin-top:4px;padding:6px;background:var(--wh);border-radius:var(--r);font-family:var(--mono)">';
    h += '<div style="font-size:.72rem;font-weight:600">Category ' + areds.category + ': ' + areds.category_name + '</div>';
    h += '<div style="font-size:.62rem;color:var(--sl)">5-year progression: ' + areds.risk_5yr + '</div>';
    if (areds.supplement_indicated) {
      h += '<div style="font-size:.62rem;color:var(--ink);font-weight:500;margin-top:2px">✓ AREDS2 supplements indicated</div>';
    }
    h += '<div style="font-size:.58rem;color:var(--md);margin-top:3px">' + areds.recommendation + '</div>';
    h += '</div></div>';
  }

  return h;
}
