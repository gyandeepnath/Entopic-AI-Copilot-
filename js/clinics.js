/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — SPECIALTY CLINIC PACKS                                 */
/*                                                                  */
/* A "clinic pack" is a cluster of extra sections switched on for a  */
/* particular kind of session — an oculoplasty list, a dry-eye       */
/* clinic, a school-screening camp — so the exam matches the work    */
/* actually being done, instead of one generic form for everything.  */
/*                                                                  */
/* The core 22-step exam is untouched. Turning a pack on adds its    */
/* sections to the sidebar; turning it off removes them. Packs are   */
/* pure DATA — every section is a list of field groups rendered by   */
/* one generic renderer — so a new clinic is a data edit, not new    */
/* UI code, and the founder can add or reword one without a rewrite. */
/*                                                                  */
/* ⚠ NEEDS_CLINICAL_REVIEW — these record findings and standard      */
/* descriptive categories only. No thresholds, normal ranges,        */
/* candidacy criteria or treatment rules are encoded anywhere here:  */
/* who is a LASIK candidate, which myopia-control option to use, and */
/* what a screening referral threshold should be are clinical and    */
/* regional decisions that stay with the clinician. Nothing in a     */
/* clinic pack is fed to the diagnostic engine.                      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var CLINIC_REVIEW_STATUS = "NEEDS_CLINICAL_REVIEW";

/* field: { k, l, type: text|num|select|textarea|eyes, opts?, ph? }
   type "eyes" renders an OD/OS pair from k + "_od" / k + "_os". */
var CLINIC_PACKS = [
  /* ── Anterior / surface ─────────────────────────────────────── */
  {
    id: "dry_eye", label: "Dry Eye Clinic", icon: "💧",
    blurb: "Structured ocular-surface workup — symptoms score, tear film, glands, staining, and the management ladder.",
    steps: [{
      id: "cl_dryeye", label: "Dry Eye Workup", groups: [
        { title: "Symptoms & impact", fields: [
          { k: "osdi", l: "OSDI score (from Chief Complaint)", type: "text" },
          { k: "sande", l: "SANDE / other symptom score", type: "text" },
          { k: "triggers", l: "Triggers", type: "text", ph: "Screens, air-con, wind, reading" },
          { k: "impact", l: "Impact on daily life", type: "textarea" }
        ]},
        { title: "Tear film & volume", fields: [
          { k: "tbut", l: "TBUT (s)", type: "eyes" },
          { k: "nibut", l: "Non-invasive BUT (s)", type: "eyes" },
          { k: "schirmer", l: "Schirmer I (mm/5 min)", type: "eyes" },
          { k: "schirmer_anaes", l: "Schirmer with anaesthetic", type: "eyes" },
          { k: "meniscus", l: "Tear meniscus height (mm)", type: "eyes" },
          { k: "osmolarity", l: "Osmolarity (mOsm/L)", type: "eyes" },
          { k: "mmp9", l: "MMP-9 (InflammaDry)", type: "select", opts: ["", "Negative", "Positive", "Not done"] }
        ]},
        { title: "Lids & meibomian glands", fields: [
          { k: "gland_express", l: "Meibum on expression", type: "select", opts: ["", "Clear", "Cloudy", "Granular", "Toothpaste-like", "No expression"] },
          { k: "gland_count", l: "Expressible glands (of 15)", type: "eyes" },
          { k: "meibography", l: "Meibography / gland dropout", type: "eyes" },
          { k: "lid_margin", l: "Lid margin", type: "text", ph: "Telangiectasia, notching, capping, rounding" },
          { k: "blink", l: "Blink rate / completeness", type: "text" },
          { k: "demodex", l: "Collarettes / Demodex", type: "select", opts: ["", "None", "Present", "Marked"] },
          { k: "lwe", l: "Lid wiper epitheliopathy", type: "select", opts: ["", "None", "Mild", "Moderate", "Severe"] }
        ]},
        { title: "Ocular surface staining", fields: [
          { k: "cornea_stain", l: "Corneal staining (grade + pattern)", type: "eyes" },
          { k: "conj_stain", l: "Conjunctival staining", type: "eyes" },
          { k: "stain_scale", l: "Grading scale used", type: "select", opts: ["", "Oxford", "NEI/CLEK", "Efron", "van Bijsterveld", "Other"] },
          { k: "lissamine", l: "Lissamine green findings", type: "textarea" }
        ]},
        { title: "Classification & management", fields: [
          { k: "subtype", l: "Predominant subtype", type: "select", opts: ["", "Evaporative (MGD)", "Aqueous deficient", "Mixed", "Neuropathic pain component", "Not classified"] },
          { k: "severity", l: "Severity recorded as", type: "text" },
          { k: "systemic", l: "Relevant systemic / drugs", type: "textarea", ph: "Sjögren, rosacea, thyroid, antihistamines, isotretinoin…" },
          { k: "current_tx", l: "Current treatment & adherence", type: "textarea" },
          { k: "plan", l: "Plan", type: "textarea", ph: "Lubricants, lid hygiene, warm compress, IPL, punctal occlusion, anti-inflammatory, referral…" }
        ]}
      ]
    }]
  },

  {
    id: "refractive_surgery", label: "Refractive Surgery", icon: "⚡",
    blurb: "LASIK / PRK / SMILE / phakic IOL workup and post-op follow-up — biometry, topography, stability and counselling.",
    steps: [{
      id: "cl_refsurg", label: "Refractive Surgery", groups: [
        { title: "Intent & history", fields: [
          { k: "procedure", l: "Procedure considered / performed", type: "select", opts: ["", "LASIK", "Femto-LASIK", "PRK / surface ablation", "LASEK", "SMILE", "Phakic IOL (ICL)", "Refractive lens exchange", "Enhancement / retreatment"] },
          { k: "status", l: "Stage", type: "select", opts: ["", "Pre-operative assessment", "Day 1 post-op", "Week 1 post-op", "1 month post-op", "3 months post-op", "6 months+ post-op"] },
          { k: "eye_treated", l: "Eye(s)", type: "select", opts: ["", "OD", "OS", "OU"] },
          { k: "motivation", l: "Patient motivation / occupation", type: "textarea" },
          { k: "stability", l: "Refractive stability", type: "text", ph: "Change over the last 12–24 months" },
          { k: "cl_holiday", l: "Contact lens holiday observed", type: "text", ph: "Type and duration before measurement" }
        ]},
        { title: "Keratometry & topography", fields: [
          { k: "k1", l: "K1 (D @ axis)", type: "eyes" },
          { k: "k2", l: "K2 (D @ axis)", type: "eyes" },
          { k: "kmax", l: "Kmax (D)", type: "eyes" },
          { k: "astig_type", l: "Astigmatism pattern", type: "text", ph: "Regular / irregular, symmetry, skew" },
          { k: "topo_device", l: "Topographer / tomographer", type: "text" },
          { k: "ectasia_screen", l: "Ectasia screening indices reported", type: "textarea", ph: "Record the indices and the reporting clinician's conclusion" }
        ]},
        { title: "Pachymetry & anatomy", fields: [
          { k: "cct", l: "Central corneal thickness (µm)", type: "eyes" },
          { k: "thinnest", l: "Thinnest point (µm)", type: "eyes" },
          { k: "pupil_scotopic", l: "Scotopic pupil (mm)", type: "eyes" },
          { k: "wtw", l: "White-to-white (mm)", type: "eyes" },
          { k: "acd", l: "ACD (mm)", type: "eyes" },
          { k: "endothelium", l: "Endothelial cell density", type: "eyes" }
        ]},
        { title: "Refraction", fields: [
          { k: "manifest", l: "Manifest refraction", type: "eyes" },
          { k: "cyclo", l: "Cycloplegic refraction", type: "eyes" },
          { k: "bcva", l: "BCVA", type: "eyes" },
          { k: "ucva", l: "UCVA", type: "eyes" },
          { k: "dominance", l: "Ocular dominance", type: "text" },
          { k: "target", l: "Target / monovision plan", type: "text" }
        ]},
        { title: "Surgical record & follow-up", fields: [
          { k: "flap", l: "Flap / cap details", type: "textarea", ph: "Thickness, diameter, hinge, or ablation depth for surface" },
          { k: "ablation", l: "Ablation depth / optic zone", type: "text" },
          { k: "residual_bed", l: "Residual stromal bed (µm)", type: "eyes" },
          { k: "intraop", l: "Intra-operative events", type: "textarea" },
          { k: "postop_findings", l: "Post-op findings", type: "textarea", ph: "Interface, epithelial healing, haze, DLK, striae, dry eye" },
          { k: "haze", l: "Haze grade (if surface ablation)", type: "eyes" },
          { k: "meds", l: "Post-op medication & taper", type: "textarea" },
          { k: "counselling", l: "Counselling / consent recorded", type: "textarea", ph: "Risks discussed, night vision, dry eye, regression, enhancement policy" }
        ]}
      ]
    }]
  },

  {
    id: "myopia", label: "Myopia Clinic", icon: "📉",
    blurb: "Myopia progression tracking — axial length, cycloplegic refraction, risk factors, control option and review.",
    steps: [{
      id: "cl_myopia", label: "Myopia Management", groups: [
        { title: "Progression record", fields: [
          { k: "onset_age", l: "Age at onset", type: "text" },
          { k: "cyclo_se", l: "Cycloplegic spherical equivalent (D)", type: "eyes" },
          { k: "prev_se", l: "Previous SE (D)", type: "eyes" },
          { k: "interval", l: "Interval since last", type: "text" },
          { k: "axial", l: "Axial length (mm)", type: "eyes" },
          { k: "prev_axial", l: "Previous axial length (mm)", type: "eyes" },
          { k: "k_avg", l: "Mean keratometry (D)", type: "eyes" }
        ]},
        { title: "Risk factors", fields: [
          { k: "parent_myopia", l: "Parental myopia", type: "select", opts: ["", "Neither", "One parent", "Both parents", "Unknown"] },
          { k: "outdoor", l: "Outdoor time", type: "text", ph: "Hours/day" },
          { k: "near_work", l: "Near work / screen time", type: "text", ph: "Hours/day, working distance" },
          { k: "bv_status", l: "Binocular / accommodative status", type: "text", ph: "Lag, phoria, AC/A — from the BV section" },
          { k: "ethnicity_note", l: "Other relevant background", type: "text" }
        ]},
        { title: "Management", fields: [
          { k: "option", l: "Control option in use", type: "select", opts: ["", "Single vision only (monitoring)", "Ortho-K", "Soft multifocal / dual-focus CL", "Spectacle lens designed for myopia control", "Low-dose atropine", "Combination", "Other"] },
          { k: "option_detail", l: "Details of the option", type: "textarea", ph: "Lens design / concentration / regimen as prescribed" },
          { k: "adherence", l: "Adherence", type: "select", opts: ["", "Good", "Partial", "Poor"] },
          { k: "side_effects", l: "Side effects / tolerance", type: "textarea" },
          { k: "counselling", l: "Counselling given", type: "textarea", ph: "Expected course, why control was chosen, outdoor time, review interval" },
          { k: "review", l: "Review interval", type: "text" }
        ]}
      ]
    }]
  },

  /* ── Oculoplasty / prosthesis ───────────────────────────────── */
  {
    id: "oculoplasty", label: "Oculoplasty", icon: "🔧",
    blurb: "Lids, orbit and lacrimal — measurements, function, lesions and surgical planning.",
    steps: [{
      id: "cl_oculoplasty", label: "Oculoplasty", groups: [
        { title: "Lid measurements", fields: [
          { k: "mrd1", l: "MRD1 (mm)", type: "eyes" },
          { k: "mrd2", l: "MRD2 (mm)", type: "eyes" },
          { k: "aperture", l: "Palpebral aperture (mm)", type: "eyes" },
          { k: "levator", l: "Levator function (mm)", type: "eyes" },
          { k: "crease", l: "Lid crease height (mm)", type: "eyes" },
          { k: "lagophthalmos", l: "Lagophthalmos (mm)", type: "eyes" },
          { k: "bells", l: "Bell's phenomenon", type: "select", opts: ["", "Good", "Fair", "Poor", "Absent"] }
        ]},
        { title: "Lid position & function", fields: [
          { k: "ptosis", l: "Ptosis", type: "select", opts: ["", "None", "Aponeurotic", "Myogenic", "Neurogenic", "Mechanical", "Congenital", "Pseudoptosis"] },
          { k: "retraction", l: "Lid retraction", type: "text" },
          { k: "malposition", l: "Malposition", type: "select", opts: ["", "None", "Ectropion", "Entropion", "Trichiasis", "Distichiasis", "Epiblepharon"] },
          { k: "laxity", l: "Lid laxity (snap-back / distraction)", type: "text" },
          { k: "orbicularis", l: "Orbicularis / facial nerve function", type: "text" },
          { k: "fatigue", l: "Fatigability / Cogan's twitch", type: "text" }
        ]},
        { title: "Orbit & lacrimal", fields: [
          { k: "exoph", l: "Exophthalmometry (mm)", type: "eyes" },
          { k: "base", l: "Hertel base (mm)", type: "text" },
          { k: "resistance", l: "Retropulsion / resistance", type: "text" },
          { k: "globe_disp", l: "Globe displacement", type: "text" },
          { k: "syringing", l: "Lacrimal syringing", type: "eyes" },
          { k: "regurg", l: "Regurgitation on pressure", type: "select", opts: ["", "None", "Mucoid", "Mucopurulent", "Blood-stained"] },
          { k: "sac", l: "Sac / punctum findings", type: "textarea" }
        ]},
        { title: "Lesion & plan", fields: [
          { k: "lesion_site", l: "Lesion site & size", type: "textarea", ph: "Lid, position, mm, margin involvement, lash loss" },
          { k: "lesion_features", l: "Features", type: "textarea", ph: "Ulceration, telangiectasia, pearly edge, pigmentation, induration, fixation" },
          { k: "lymph", l: "Regional lymph nodes", type: "text" },
          { k: "photo_ref", l: "Clinical photographs taken", type: "text" },
          { k: "biopsy", l: "Biopsy / histology", type: "textarea" },
          { k: "plan", l: "Surgical plan / consent", type: "textarea" }
        ]}
      ]
    }]
  },

  {
    id: "prosthesis", label: "Ocular Prosthesis", icon: "👁",
    blurb: "Ocularistry — socket assessment, prosthesis fit, cosmesis, hygiene and review.",
    steps: [{
      id: "cl_prosthesis", label: "Ocular Prosthesis", groups: [
        { title: "Background", fields: [
          { k: "reason", l: "Reason for prosthesis", type: "select", opts: ["", "Enucleation", "Evisceration", "Exenteration", "Phthisical eye (shell)", "Congenital anophthalmos", "Microphthalmos", "Disfigured but seeing eye (shell)"] },
          { k: "date_surgery", l: "Date of surgery / loss", type: "text" },
          { k: "implant", l: "Orbital implant", type: "text", ph: "Type and size, if known" },
          { k: "current_pros", l: "Current prosthesis", type: "text", ph: "Type, age, who made it" },
          { k: "wear_hx", l: "Wearing pattern", type: "text" }
        ]},
        { title: "Socket assessment", fields: [
          { k: "socket_health", l: "Socket lining", type: "select", opts: ["", "Healthy", "Mild conjunctivitis", "Giant papillary reaction", "Discharge", "Granuloma", "Contracted"] },
          { k: "fornices", l: "Fornices", type: "select", opts: ["", "Deep and well formed", "Shallow superior", "Shallow inferior", "Both shallow", "Contracted socket"] },
          { k: "discharge", l: "Discharge", type: "text" },
          { k: "implant_status", l: "Implant status", type: "text", ph: "Centred, migrated, exposed, extruding" },
          { k: "socket_notes", l: "Other socket findings", type: "textarea" }
        ]},
        { title: "Prosthesis fit & cosmesis", fields: [
          { k: "fit", l: "Fit", type: "select", opts: ["", "Good", "Loose", "Tight", "Rotating", "Tipping"] },
          { k: "motility", l: "Prosthesis motility", type: "text" },
          { k: "lid_position", l: "Lid position with prosthesis", type: "text", ph: "Ptosis, lower lid sag, deep superior sulcus" },
          { k: "colour_match", l: "Colour / iris match", type: "select", opts: ["", "Excellent", "Good", "Fair", "Poor"] },
          { k: "size", l: "Size / volume adequacy", type: "text" },
          { k: "comfort", l: "Comfort", type: "select", opts: ["", "Comfortable", "Mild discomfort", "Painful"] },
          { k: "patient_sat", l: "Patient satisfaction", type: "textarea" }
        ]},
        { title: "Care & plan", fields: [
          { k: "hygiene", l: "Hygiene routine & advice given", type: "textarea", ph: "Cleaning frequency, handling, lubrication, when not to remove" },
          { k: "polish", l: "Polishing / servicing due", type: "text" },
          { k: "plan", l: "Plan", type: "textarea", ph: "Refit, remake, socket treatment, referral to ocularist / oculoplastic surgeon" },
          { k: "review", l: "Review interval", type: "text" }
        ]}
      ]
    }]
  },

  /* ── Performance ────────────────────────────────────────────── */
  {
    id: "sports_vision", label: "Sports Vision", icon: "🏅",
    blurb: "Visual performance for sport — dynamic acuity, reaction, tracking, depth, and protective eyewear.",
    steps: [{
      id: "cl_sports", label: "Sports Vision", groups: [
        { title: "Sport & demands", fields: [
          { k: "sport", l: "Sport / position", type: "text" },
          { k: "level", l: "Level", type: "select", opts: ["", "Recreational", "Club", "Regional", "National", "Professional"] },
          { k: "demands", l: "Key visual demands", type: "textarea", ph: "Ball tracking, peripheral awareness, low light, glare, distance judgement" },
          { k: "environment", l: "Playing environment", type: "text", ph: "Indoor / outdoor, lighting, water, dust" },
          { k: "current_correction", l: "Current correction in sport", type: "text" }
        ]},
        { title: "Performance measures", fields: [
          { k: "static_va", l: "Static VA", type: "eyes" },
          { k: "dynamic_va", l: "Dynamic visual acuity", type: "text" },
          { k: "contrast", l: "Contrast sensitivity", type: "text" },
          { k: "stereo", l: "Stereoacuity (sec arc)", type: "text" },
          { k: "reaction", l: "Reaction / response time", type: "text", ph: "Device and result" },
          { k: "peripheral", l: "Peripheral awareness", type: "text" },
          { k: "tracking", l: "Pursuits / saccades", type: "text" },
          { k: "hand_eye", l: "Hand-eye coordination", type: "text" },
          { k: "accom_facility", l: "Accommodative facility (cpm)", type: "eyes" },
          { k: "vergence_facility", l: "Vergence facility (cpm)", type: "text" },
          { k: "dominance", l: "Ocular / hand dominance", type: "text" }
        ]},
        { title: "Plan", fields: [
          { k: "correction_plan", l: "Correction recommended", type: "textarea", ph: "Sports spectacles, CL, tint, prescription for the sport" },
          { k: "protection", l: "Protective eyewear advised", type: "textarea", ph: "Standard / impact rating discussed" },
          { k: "training", l: "Vision training plan", type: "textarea" },
          { k: "review", l: "Review", type: "text" }
        ]}
      ]
    }]
  },

  /* ── Theatre ────────────────────────────────────────────────── */
  {
    id: "theatre", label: "Operation Theatre", icon: "🏥",
    blurb: "Surgical record — consent, WHO checklist, biometry, procedure, and immediate post-op instructions.",
    steps: [{
      id: "cl_theatre", label: "Theatre Record", groups: [
        { title: "Pre-operative", fields: [
          { k: "procedure", l: "Planned procedure", type: "text" },
          { k: "eye", l: "Operative eye", type: "select", opts: ["", "OD", "OS"] },
          { k: "consent", l: "Consent taken", type: "select", opts: ["", "Yes — signed", "Verbal (documented)", "Not yet"] },
          { k: "consent_risks", l: "Risks discussed", type: "textarea" },
          { k: "site_marked", l: "Site marked", type: "select", opts: ["", "Yes", "No", "Not applicable"] },
          { k: "checklist", l: "WHO surgical safety checklist", type: "select", opts: ["", "Completed", "Not completed"] },
          { k: "allergies", l: "Allergies", type: "text" },
          { k: "anticoag", l: "Anticoagulants / antiplatelets", type: "text" },
          { k: "fasting", l: "Fasting status", type: "text" },
          { k: "biometry_ref", l: "Biometry / IOL selected", type: "textarea", ph: "AL, K, formula, IOL model and power, target" }
        ]},
        { title: "Procedure", fields: [
          { k: "date_time", l: "Date & time", type: "text" },
          { k: "surgeon", l: "Surgeon", type: "text" },
          { k: "assistant", l: "Assistant / scrub", type: "text" },
          { k: "anaesthesia", l: "Anaesthesia", type: "select", opts: ["", "Topical", "Topical + intracameral", "Sub-Tenon", "Peribulbar", "Retrobulbar", "General"] },
          { k: "steps", l: "Operative steps", type: "textarea" },
          { k: "implant_used", l: "Implant / device used", type: "textarea", ph: "Model, serial / batch number" },
          { k: "complications", l: "Intra-operative complications", type: "textarea" },
          { k: "duration", l: "Duration", type: "text" }
        ]},
        { title: "Post-operative", fields: [
          { k: "immediate", l: "Immediate post-op findings", type: "textarea" },
          { k: "meds", l: "Post-op medication", type: "textarea" },
          { k: "instructions", l: "Instructions given", type: "textarea", ph: "Shield, activity, hygiene, red-flag symptoms and who to contact" },
          { k: "review", l: "Review appointment", type: "text" },
          { k: "specimen", l: "Specimen sent", type: "text" }
        ]}
      ]
    }]
  },

  /* ── Screening ──────────────────────────────────────────────── */
  {
    id: "screening", label: "Screening / Camp", icon: "📋",
    blurb: "Fast, high-volume screening — community camps, school screening and quick triage. Minimal fields, clear referral outcome.",
    steps: [{
      id: "cl_screening", label: "Screening", groups: [
        { title: "Session", fields: [
          { k: "type", l: "Screening type", type: "select", opts: ["", "Community / camp", "School screening", "Workplace", "Diabetic screening", "Quick triage", "Follow-up camp"] },
          { k: "site", l: "Site / school / camp name", type: "text" },
          { k: "date", l: "Date", type: "text" },
          { k: "screener", l: "Screened by", type: "text" },
          { k: "class_group", l: "Class / group / batch", type: "text" }
        ]},
        { title: "Rapid findings", fields: [
          { k: "va_un", l: "VA unaided", type: "eyes" },
          { k: "va_aided", l: "VA with current correction", type: "eyes" },
          { k: "wears_specs", l: "Wears spectacles", type: "select", opts: ["", "No", "Yes — brought", "Yes — not brought", "Yes — broken / lost"] },
          { k: "torch", l: "Torch / external exam", type: "select", opts: ["", "Normal", "Abnormal — see notes"] },
          { k: "squint", l: "Squint on cover test", type: "select", opts: ["", "No", "Yes", "Not assessed"] },
          { k: "colour", l: "Colour vision", type: "select", opts: ["", "Normal", "Defective", "Not tested"] },
          { k: "complaint", l: "Reported complaint", type: "text" },
          { k: "notes", l: "Notes", type: "textarea" }
        ]},
        { title: "Outcome", fields: [
          { k: "outcome", l: "Outcome", type: "select", opts: ["", "No action — normal", "Spectacles prescribed / refracted on site", "Refer for refraction", "Refer to ophthalmology", "Refer urgently", "Re-screen later"] },
          { k: "referred_to", l: "Referred to", type: "text" },
          { k: "urgency", l: "Urgency", type: "select", opts: ["", "Routine", "Soon", "Urgent", "Same day"] },
          { k: "informed", l: "Parent / guardian / patient informed", type: "select", opts: ["", "Yes", "No", "Slip issued"] },
          { k: "followup", l: "Follow-up mechanism", type: "text" }
        ]}
      ]
    }]
  }
];

function clinicPack(id) {
  for (var i = 0; i < CLINIC_PACKS.length; i++) if (CLINIC_PACKS[i].id === id) return CLINIC_PACKS[i];
  return null;
}

/* Every clinic step across every pack (used to build STEPS + the dispatcher). */
function clinicAllSteps() {
  var out = [];
  CLINIC_PACKS.forEach(function (p) {
    (p.steps || []).forEach(function (s) {
      out.push({ packId: p.id, id: s.id, label: s.label, groups: s.groups });
    });
  });
  return out;
}

function clinicStepDef(stepId) {
  var all = clinicAllSteps();
  for (var i = 0; i < all.length; i++) if (all[i].id === stepId) return all[i];
  return null;
}

/* Is the pack that owns this step switched on for the current visit? */
function clinicStepOn(stepId) {
  var def = clinicStepDef(stepId);
  if (!def) return false;
  return !!(typeof V !== "undefined" && V && V.clinics && V.clinics[def.packId]);
}

function clinicToggle(id) {
  if (!V.clinics) V.clinics = {};
  V.clinics[id] = !V.clinics[id];
  if (typeof renderSidebar === "function") renderSidebar();
  if (typeof renderMain === "function") renderMain();
  if (typeof toast === "function") {
    var p = clinicPack(id);
    toast(V.clinics[id] ? ((p ? p.label : "Clinic") + " added to this exam.") : "Clinic removed.");
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    CLINIC_PACKS: CLINIC_PACKS, clinicPack: clinicPack,
    clinicAllSteps: clinicAllSteps, clinicStepDef: clinicStepDef
  };
}
