/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — DATA MODEL                                            */
/* Constants, blank visit, exam steps, symptom categories,         */
/* clinical reference values                                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── EXAM STEPS (22 steps, sidebar navigation) ── */

var STEPS = [
  { id: "demographics",     l: "Demographics",        c: "Registration",    n: "01" },
  { id: "chief_complaint",  l: "Chief Complaint",     c: "Registration",    n: "02" },
  { id: "hx_ocular",        l: "Ocular History",      c: "History",         n: "03" },
  { id: "hx_medical",       l: "Medical / Systemic",  c: "History",         n: "04" },
  { id: "hx_family",        l: "Family & Social",     c: "History",         n: "05" },
  { id: "va",               l: "Visual Acuity",       c: "Examination",     n: "06" },
  { id: "refraction",       l: "Refraction",          c: "Examination",     n: "07" },
  { id: "dilation",         l: "Dilation",            c: "Examination",     n: "08" },
  { id: "slit_lamp",        l: "Slit Lamp",           c: "Examination",     n: "09" },
  { id: "iop",              l: "IOP / Tonometry",     c: "Examination",     n: "10" },
  { id: "pupil",            l: "Pupils",              c: "Examination",     n: "11" },
  { id: "motility",         l: "Ocular Motility",     c: "Examination",     n: "12" },
  { id: "bv",               l: "Binocular Vision",    c: "Examination",     n: "13" },
  { id: "gonioscopy",       l: "Gonioscopy",          c: "Examination",     n: "14" },
  { id: "fundus",           l: "Fundus / Posterior",   c: "Examination",     n: "15" },
  { id: "neuro",            l: "Neuro-Ophthalmology",  c: "Examination",     n: "16" },
  { id: "investigations",   l: "Investigations",      c: "Investigations",  n: "17" },
  { id: "diagnosis",        l: "Diagnosis / DDx",     c: "Assessment",      n: "18" },
  { id: "plan",             l: "Plan / Management",   c: "Management",      n: "19" },
  { id: "coding",           l: "ICD-10 Coding",       c: "Documentation",   n: "20" },
  { id: "report",           l: "Report",              c: "Documentation",   n: "21" },
  { id: "prescription",     l: "Prescription",        c: "Documentation",   n: "22" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* VISUAL ACUITY CONSTANTS                                         */
/* ═══════════════════════════════════════════════════════════════ */

/* Metric (Snellen 6m) */
var VA_M = [
  "6/4", "6/5", "6/6", "6/7.5", "6/9", "6/12", "6/15",
  "6/18", "6/24", "6/36", "6/60", "3/60", "1/60",
  "HM", "PL+", "PL-", "NPL"
];

/* Imperial (Snellen 20ft) — parallel to VA_M for display */
var VA_I = [
  "20/13", "20/16", "20/20", "20/25", "20/30", "20/40", "20/50",
  "20/60", "20/80", "20/120", "20/200", "20/400", "20/1200",
  "HM", "PL+", "PL-", "NPL"
];

/* Near VA (N-notation) */
var VA_N = [
  "N4", "N5", "N6", "N8", "N10", "N12",
  "N14", "N18", "N24", "N36", "N48"
];

/* LogMAR equivalents */
var VA_LOG = [
  "-0.10", "-0.08", "0.00", "0.10", "0.18", "0.30", "0.40",
  "0.48", "0.60", "0.78", "1.00", "1.30", "1.78",
  "2.00", "2.30", "2.60", "3.00"
];

/* Chart types */
var CHART_TYPES = [
  "Snellen",
  "LogMAR/ETDRS",
  "Sheridan-Gardiner",
  "Kay Pictures",
  "Lea Symbols",
  "Teller Acuity Cards",
  "HOTV",
  "Cardiff Cards",
  "Preferential Looking",
  "Custom"
];

/* Age-adaptive chart recommendations */
var AGE_CHART_MAP = {
  "0-2":   ["Preferential Looking", "Teller Acuity Cards", "Cardiff Cards"],
  "2-4":   ["Kay Pictures", "Lea Symbols", "Cardiff Cards"],
  "4-7":   ["Lea Symbols", "HOTV", "Sheridan-Gardiner", "Kay Pictures"],
  "7-16":  ["Snellen", "LogMAR/ETDRS", "Sheridan-Gardiner"],
  "16+":   ["Snellen", "LogMAR/ETDRS"]
};


/* ═══════════════════════════════════════════════════════════════ */
/* REFRACTION CONSTANTS                                            */
/* ═══════════════════════════════════════════════════════════════ */

var RX_METHODS = [
  "Subjective",
  "Cycloplegic",
  "Static retinoscopy",
  "Dynamic retinoscopy (MEM)",
  "Autorefractor only",
  "Autorefractor + subjective",
  "Trial frame",
  "Phoropter",
  "Over-refraction (CL)"
];

/* Sphere values for dropdown */
var RX_SPH_VALUES = [];
(function() {
  for (var i = -20; i <= 20; i += 0.25) {
    var v = i.toFixed(2);
    if (i > 0) v = "+" + v;
    RX_SPH_VALUES.push(v);
  }
})();

/* Cylinder values */
var RX_CYL_VALUES = [];
(function() {
  for (var i = -8; i <= 0; i += 0.25) {
    RX_CYL_VALUES.push(i.toFixed(2));
  }
})();

/* Axis values */
var RX_AX_VALUES = [];
(function() {
  for (var i = 1; i <= 180; i++) {
    RX_AX_VALUES.push(i);
  }
})();

/* Add values */
var RX_ADD_VALUES = [];
(function() {
  for (var i = 0.25; i <= 4.00; i += 0.25) {
    RX_ADD_VALUES.push("+" + i.toFixed(2));
  }
})();


/* ═══════════════════════════════════════════════════════════════ */
/* DILATION DRUGS                                                  */
/* ═══════════════════════════════════════════════════════════════ */

var DIL_DRUGS = [
  "",
  "Tropicamide 0.5%",
  "Tropicamide 1%",
  "Cyclopentolate 0.5%",
  "Cyclopentolate 1%",
  "Phenylephrine 2.5%",
  "Phenylephrine 10%",
  "Atropine 0.5%",
  "Atropine 1%",
  "Tropicamide + Phenylephrine",
  "Cyclopentolate + Tropicamide",
  "Cyclopentolate + Phenylephrine"
];


/* ═══════════════════════════════════════════════════════════════ */
/* BINOCULAR VISION — MORGAN'S NORMS                               */
/* ═══════════════════════════════════════════════════════════════ */

var MORGANS = {
  ph_d:    "1 exo ±2Δ",
  ph_n:    "3 exo ±3Δ",
  bo_d:    "9/19/10",
  bi_d:    "—/7/4",
  bo_n:    "17/21/11",
  bi_n:    "13/21/13",
  npc:     "≤5 cm",
  aca:     "3:1 to 5:1",
  nra:     "+2.00 to +2.50",
  pra:     "-2.00 to -2.50",
  baf:     "≥8 cpm",
  maf:     "≥12 cpm",
  stereo:  "≤40 sec arc"
};


/* ═══════════════════════════════════════════════════════════════ */
/* TONOMETRY METHODS                                               */
/* ═══════════════════════════════════════════════════════════════ */

var IOP_METHODS = [
  "GAT (Goldmann)",
  "NCT (Non-contact)",
  "iCare (Rebound)",
  "Tono-Pen",
  "Perkins",
  "Dynamic Contour (DCT)",
  "Ocular Response Analyzer"
];


/* ═══════════════════════════════════════════════════════════════ */
/* TEMPORAL PATTERN OPTIONS                                        */
/* ═══════════════════════════════════════════════════════════════ */

var TEMPORAL_ONSET = [
  { key: "acute",        label: "Sudden" },
  { key: "gradual",      label: "Gradual" },
  { key: "progressive",  label: "Progressive" },
  { key: "recurrent",    label: "Recurrent" },
  { key: "intermittent", label: "Intermittent" },
  { key: "seasonal",     label: "Seasonal" },
  { key: "chronic",      label: "Chronic" }
];

var TEMPORAL_DURATION = [
  { key: "hours",   label: "Hours" },
  { key: "days",    label: "Days" },
  { key: "weeks",   label: "Weeks" },
  { key: "months",  label: "Months" },
  { key: "years",   label: "Years" }
];

var TEMPORAL_COURSE = [
  { key: "improving",  label: "Improving" },
  { key: "stable",     label: "Stable" },
  { key: "worsening",  label: "Worsening" },
  { key: "variable",   label: "Variable" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* EXPANDED SYMPTOM CATEGORIES                                     */
/* 12 groups, 150+ symptoms — each maps to engine tokens           */
/* ═══════════════════════════════════════════════════════════════ */

var SYM_CATS = {

  /* ── 1. VISION — DISTANCE ── */
  "Vision — Distance": {
    distance_blur:       "Blurred distance vision",
    squinting:           "Squinting to see far",
    better_near:         "Better near than far",
    clear_near:          "Clear near vision",
    reduced_vision:      "Reduced overall vision"
  },

  /* ── 2. VISION — NEAR ── */
  "Vision — Near": {
    near_blur:           "Blurred near vision",
    blur_near:           "Difficulty focusing near",
    difficulty_reading:  "Difficulty reading",
    holding_far:         "Holding things far to read",
    near_strain:         "Strain during near work",
    losing_place_reading: "Losing place while reading"
  },

  /* ── 3. VISION — QUALITY ── */
  "Vision — Quality": {
    variable_blur:       "Variable / fluctuating blur",
    fluctuating_blur:    "Vision comes and goes",
    distortion:          "Distortion / metamorphopsia",
    ghosting:            "Ghosting / shadow images",
    shadowing:           "Shadow around objects",
    glare:               "Glare / dazzle",
    halos:               "Halos around lights",
    micropsia:           "Objects appear smaller",
    central_blur:        "Central vision blurred",
    central_scotoma:     "Dark spot in center",
    color_vision_loss:   "Colour vision change",
    reduced_contrast:    "Reduced contrast / washed out",
    night_blindness:     "Difficulty seeing at dark / night",
    morning_blur:        "Blurred vision on waking"
  },

  /* ── 4. VISION — FIELD LOSS ── */
  "Vision — Field Loss": {
    field_loss:          "Part of vision missing",
    curtain_vision:      "Curtain / shadow across vision",
    peripheral_field_loss: "Side vision missing",
    tunnel_vision:       "Tunnel vision",
    field_loss_half:     "Half of vision gone",
    temporal_field_loss: "Outer (temporal) vision lost",
    quadrant_field_loss: "Quarter of vision gone",
    sectoral_blur:       "Blurred in one area only",
    transient_vision_loss: "Temporary complete vision loss"
  },

  /* ── 5. VISION — SUDDEN ── */
  "Vision — Sudden Changes": {
    sudden_vision_loss:  "Sudden complete vision loss",
    progressive_vision_loss: "Progressively worsening vision",
    vision_loss:         "General vision loss",
    rapid_change:        "Rapid change in vision"
  },

  /* ── 6. PAIN & DISCOMFORT ── */
  "Pain & Discomfort": {
    pain:                "Eye pain (general)",
    pain_acute:          "Sharp / sudden pain",
    pain_severe:         "Severe pain",
    pain_moderate:       "Moderate pain",
    pain_morning:        "Pain on waking",
    pain_eye_movement:   "Pain on eye movement",
    burning:             "Burning / stinging",
    fb_sensation:        "Foreign body sensation",
    grittiness:          "Gritty / sandy feeling",
    asthenopia:          "Eye strain / fatigue",
    eye_strain:          "Tired eyes",
    headache:            "Headache",
    headache_near:       "Headache after near work",
    tenderness:          "Tenderness around eye",
    photophobia:         "Light sensitivity",
    photophobia_mild:    "Mild light sensitivity",
    contact_lens_discomfort: "Discomfort with contact lenses"
  },

  /* ── 7. EXTERNAL / SURFACE ── */
  "External & Surface": {
    redness:             "Redness",
    chronic_redness:     "Persistent redness",
    dryness:             "Dryness",
    itching_dominant:    "Itching (main symptom)",
    itching_lashes:      "Itching at lash line",
    tearing:             "Excess tearing",
    watering:            "Watery eyes",
    excess_tearing:      "Overflowing tears",
    purulent_discharge:  "Thick yellow/green discharge",
    watery_discharge:    "Clear watery discharge",
    ropy_discharge:      "Stringy / ropy discharge",
    stringy_mucus:       "Stringy mucus",
    discharge:           "Discharge (general)",
    lid_crusting:        "Crusting on lids",
    lid_sticking_morning: "Lids stuck together on waking",
    morning_stickiness:  "Morning stickiness",
    irritation:          "General irritation",
    chronic_irritation:  "Persistent irritation"
  },

  /* ── 8. LID & PERIOCULAR ── */
  "Lid & Periocular": {
    localized_lid_swelling: "Localized lid lump / swelling",
    lid_swelling_diffuse:   "Diffuse lid swelling",
    painless_lid_nodule:    "Painless lid nodule",
    medial_canthus_swelling: "Swelling near nose bridge",
    ptosis:                 "Drooping eyelid",
    fever:                  "Fever (systemic)",
    cracking_skin:          "Cracking skin at lid corners",
    localized_swelling:     "Localized swelling"
  },

  /* ── 9. FLOATERS & FLASHES ── */
  "Floaters & Flashes": {
    floaters:            "Floaters",
    sudden_floaters:     "Sudden onset of new floaters",
    flashes:             "Flashes of light",
    dark_spots:          "Dark spots in vision",
    vision_hazy:         "Hazy / smoky vision"
  },

  /* ── 10. DIPLOPIA & ALIGNMENT ── */
  "Diplopia & Alignment": {
    diplopia:            "Double vision (general)",
    double_vision_near:  "Double vision at near",
    horizontal_diplopia: "Horizontal double vision",
    vertical_diplopia:   "Vertical double vision",
    distance_diplopia:   "Double vision at distance",
    intermittent_diplopia: "Intermittent double vision",
    closing_one_eye:     "Closing one eye to see",
    intermittent_eye_out: "Eye drifting outward",
    eye_inward:          "Eye turning inward",
    constant_deviation:  "Constant eye turn"
  },

  /* ── 11. ACCOMMODATION & FOCUS ── */
  "Accommodation & Focus": {
    difficulty_focusing:    "Difficulty focusing",
    difficulty_relaxing_focus: "Difficulty relaxing focus",
    difficulty_focus_change:  "Slow to change focus distance",
    slow_focus_shift:       "Slow focus shift near↔far",
    difficulty_sustaining_focus: "Cannot sustain focus",
    reduced_stamina:        "Visual stamina reduced",
    spasm:                  "Eyes locking / spasm",
    fatigue:                "Visual fatigue",
    reduced_amplitude:      "Reduced focusing ability"
  },

  /* ── 12. FUNCTIONAL & ENVIRONMENTAL ── */
  "Functional & Environmental": {
    worse_evening:           "Symptoms worse by evening",
    screen_use_exacerbation: "Worse with screen use",
    contact_lens_intolerance: "Contact lens intolerance",
    reduced_wear_time:       "Reduced CL wearing time",
    worse_distance:          "Worse at distance",
    distance_problem:        "Problems at distance",
    reduced_tearing:         "Reduced tear production",
    unequal_vision:          "Vision different each eye",
    suppression:             "Ignoring one eye",
    vomiting:                "Nausea / vomiting",
    visual_disturbance:      "General visual disturbance"
  }
};


/* ═══════════════════════════════════════════════════════════════ */
/* SLIT LAMP FINDINGS (expanded for knowledge base coverage)       */
/* ═══════════════════════════════════════════════════════════════ */

var SL_FINDINGS = {

  "Lids & Adnexa": [
    "Blepharitis — anterior",
    "Blepharitis — posterior",
    "Chalazion",
    "Hordeolum (stye)",
    "Ptosis",
    "Entropion",
    "Ectropion",
    "Trichiasis",
    "Madarosis (lash loss)",
    "Meibomian gland plugging",
    "Meibomian gland dropout",
    "Lid edema — localized",
    "Lid edema — diffuse",
    "Lagophthalmos",
    "Incomplete blink",
    "Lid margin irregularity",
    "Cylindrical dandruff (Demodex)",
    "Collarettes",
    "Lash debris",
    "Lateral canthus inflammation",
    "Medial canthus swelling"
  ],

  "Conjunctiva": [
    "Diffuse injection",
    "Sectoral injection",
    "Ciliary flush",
    "Papillae",
    "Giant papillae",
    "Follicles",
    "Chemosis",
    "Subconjunctival hemorrhage",
    "Pinguecula",
    "Pterygium",
    "Conjunctival cyst",
    "Conjunctival foreign body",
    "Conjunctival edema",
    "Preauricular lymph node",
    "Cobblestone papillae"
  ],

  "Cornea": [
    "Epithelial defect",
    "Punctate staining (SPK)",
    "Dendritic ulcer",
    "Stromal infiltrate",
    "Corneal edema",
    "Corneal opacity — central",
    "Corneal opacity — peripheral",
    "Corneal opacity — band",
    "Corneal scar",
    "Guttata",
    "Descemet folds",
    "Pannus",
    "Fleischer ring",
    "Vogt striae",
    "Krukenberg spindle",
    "Corneal neovascularization",
    "Corneal foreign body",
    "Corneal thinning — central",
    "Corneal thinning — inferior",
    "Corneal thinning — generalized",
    "Irregular corneal surface",
    "Subepithelial nodules",
    "Bullae / blisters",
    "Limbal nodule",
    "Peripheral corneal ring (arcus)",
    "Reduced corneal sensation"
  ],

  "Anterior Chamber": [
    "Shallow AC",
    "Cells — 0.5+",
    "Cells — 1+",
    "Cells — 2+",
    "Cells — 3+",
    "Cells — 4+",
    "Flare — 1+",
    "Flare — 2+",
    "Flare — 3+",
    "Flare — 4+",
    "Hypopyon",
    "Hyphema",
    "Fibrin",
    "Pigment dispersion"
  ],

  "Iris": [
    "Posterior synechiae",
    "Anterior synechiae",
    "Rubeosis iridis",
    "Transillumination defects",
    "Heterochromia",
    "Koeppe nodules",
    "Busacca nodules",
    "Iris atrophy"
  ],

  "Lens": [
    "Nuclear sclerosis — Grade 1",
    "Nuclear sclerosis — Grade 2",
    "Nuclear sclerosis — Grade 3",
    "Nuclear sclerosis — Grade 4+",
    "Cortical opacity",
    "PSC opacity",
    "PXF material",
    "Phacodonesis",
    "Subluxation",
    "IOL — in bag",
    "IOL — sulcus",
    "IOL — decentered",
    "PCO",
    "Aphakia",
    "White cataract",
    "Leukocoria (white pupillary reflex)"
  ],

  "Tear Film": [
    "TBUT reduced (<10s)",
    "TBUT severely reduced (<5s)",
    "Tear meniscus low",
    "Tear meniscus absent",
    "Meibum quality poor — thick/paste",
    "Meibum quality poor — granular",
    "Schirmer reduced (<10mm)",
    "Schirmer severely reduced (<5mm)",
    "Tear film debris",
    "Tear film foamy"
  ]
};


/* ═══════════════════════════════════════════════════════════════ */
/* FUNDUS FINDINGS (expanded for knowledge base coverage)          */
/* ═══════════════════════════════════════════════════════════════ */

var FUN_FINDINGS = {

  "Optic Disc": [
    "Increased C/D ratio",
    "C/D asymmetry >0.2",
    "NRR thinning",
    "NRR notching",
    "ISNT rule violation",
    "Disc hemorrhage",
    "Disc pallor — partial",
    "Disc pallor — total",
    "Disc edema — unilateral",
    "Disc edema — bilateral",
    "NVD (neovascularization disc)",
    "Peripapillary atrophy — alpha zone",
    "Peripapillary atrophy — beta zone",
    "Optic pit",
    "Tilted disc"
  ],

  "Macula": [
    "Drusen — small (<63μm)",
    "Drusen — medium (63-125μm)",
    "Drusen — large (>125μm)",
    "RPE changes",
    "Geographic atrophy",
    "Subretinal hemorrhage / CNV",
    "Subretinal fluid",
    "Macular edema — clinical",
    "Cystoid macular edema (CME)",
    "ERM / macular pucker",
    "Macular hole",
    "Foveal reflex absent",
    "Macular star",
    "Cherry red spot"
  ],

  "Vasculature": [
    "Microaneurysms",
    "Dot-blot hemorrhages",
    "Flame hemorrhages",
    "Hard exudates",
    "Cotton wool spots",
    "Venous beading",
    "Venous looping",
    "IRMA",
    "NVE (neovascularization elsewhere)",
    "AV nicking",
    "Arteriolar narrowing",
    "Silver/copper wiring",
    "Dilated tortuous veins",
    "Sectoral hemorrhage"
  ],

  "Peripheral Retina": [
    "Lattice degeneration",
    "Retinal break",
    "Retinal tear — horseshoe",
    "Retinal tear — operculated",
    "Retinal detachment — partial",
    "Retinal detachment — total",
    "Retinoschisis",
    "Pavingstone degeneration",
    "White without pressure"
  ],

  "Vitreous": [
    "PVD / Weiss ring",
    "Vitreous hemorrhage",
    "Vitreous cells",
    "Shafer sign (tobacco dust)",
    "Asteroid hyalosis",
    "Vitreous opacity"
  ],

  "Choroid": [
    "Choroidal nevus — flat",
    "Choroidal lesion — elevated",
    "Choroidal folds",
    "Choroidal rupture"
  ]
};


/* ═══════════════════════════════════════════════════════════════ */
/* MEDICAL HISTORY — STRUCTURED FLAGS                              */
/* ═══════════════════════════════════════════════════════════════ */

var MED_FLAGS = [
  { key: "dm",          label: "Diabetes Mellitus" },
  { key: "htn",         label: "Hypertension" },
  { key: "autoimmune",  label: "Autoimmune Disease" },
  { key: "thyroid",     label: "Thyroid Disease" },
  { key: "asthma",      label: "Asthma / Atopy" },
  { key: "eczema",      label: "Eczema / Dermatitis" },
  { key: "ra",          label: "Rheumatoid Arthritis" },
  { key: "sle",         label: "SLE / Lupus" },
  { key: "ms",          label: "Multiple Sclerosis" },
  { key: "migraine",    label: "Migraine" }
];

var FAMILY_FLAGS = [
  { key: "glaucoma",    label: "Glaucoma" },
  { key: "amd",         label: "AMD" },
  { key: "rd",          label: "Retinal Detachment" },
  { key: "strabismus",  label: "Strabismus / Amblyopia" },
  { key: "dm",          label: "Diabetes" },
  { key: "keratoconus", label: "Keratoconus" },
  { key: "myopia_high", label: "High Myopia" }
];

var OCULAR_HISTORY_FLAGS = [
  { key: "cl_wear",       label: "Contact Lens Wearer" },
  { key: "cl_soft",       label: "CL — Soft" },
  { key: "cl_rgp",        label: "CL — RGP" },
  { key: "cl_scleral",    label: "CL — Scleral" },
  { key: "trauma",        label: "Ocular Trauma History" },
  { key: "surgery",       label: "Previous Eye Surgery" },
  { key: "blepharitis",   label: "History of Blepharitis" },
  { key: "uveitis",       label: "History of Uveitis" },
  { key: "herpes",        label: "History of Herpes (HSV/HZV)" },
  { key: "amblyopia",     label: "History of Amblyopia" }
];


/* ═══════════════════════════════════════════════════════════════ */
/* BLANK VISIT DATA                                                */
/* Every field the visit tracks. This is the master schema.        */
/* ═══════════════════════════════════════════════════════════════ */

function blankVisit() {
  return {

    /* Current step */
    step: "demographics",

    /* Chief Complaint */
    cc: "",
    foldarq: { F: "", O: "", L: "", D: "", A: "", R: "", S: "" },
    symptoms: [],
    temporal: { onset: "", duration: "", course: "" },

    /* History */
    hxO: {
      conditions: "", surgeries: "", glasses_rx: "", cl_type: "",
      medications: "", last_exam: "", flags: []
    },
    hxM: {
      conditions: "", medications: "", allergies: "",
      dm: false, htn: false, autoimmune: false, thyroid: false,
      asthma: false, eczema: false, ra: false, sle: false, ms: false, migraine: false,
      drug_list: []
    },
    hxF: {
      glaucoma: false, amd: false, rd: false, strabismus: false,
      dm: false, keratoconus: false, myopia_high: false,
      details: ""
    },
    hxS: { smoking: "", vdu: "", occupation: "" },

    /* Visual Acuity */
    va: {
      chart: "Snellen", dist: "6m",
      near_chart: "N-notation", near_dist: "40cm",
      od_un: "", os_un: "", ou_un: "",
      od_aid: "", os_aid: "",
      od_ph: "", os_ph: "",
      od_bva: "", os_bva: "",
      od_near: "", os_near: ""
    },

    /* Refraction */
    rx: {
      method: "Subjective",
      pd_type: "binocular", pd_bi: "", pd_od: "", pd_os: "",
      od_sph: "", od_cyl: "", od_ax: "", od_add: "", od_prism: "", od_base: "",
      os_sph: "", os_cyl: "", os_ax: "", os_add: "", os_prism: "", os_base: "",
      ret_od: "", ret_os: "",
      ar_od: "", ar_os: ""
    },

    /* Dilation */
    dil: { drug: "", time: "", eye: "OU", drops: 1 },

    /* Slit Lamp */
    sl: {
      od: {
        lids: "WNL", conj: "White and quiet", cornea: "Clear",
        vh: "", cells: "0", flare: "0", iris: "Normal",
        ns: "0", c: "0", psc: "0",
        but: "", schirmer: "", notes: ""
      },
      os: {
        lids: "WNL", conj: "White and quiet", cornea: "Clear",
        vh: "", cells: "0", flare: "0", iris: "Normal",
        ns: "0", c: "0", psc: "0",
        but: "", schirmer: "", notes: ""
      },
      findings: [],
      drawings: []
    },

    /* IOP */
    iop: {
      od: "", os: "",
      method: "GAT (Goldmann)",
      time: "",
      od_cct: "", os_cct: "",
      od_corrected: "", os_corrected: "",
      diurnal: []
    },

    /* Pupils */
    pupil: {
      od_l: "", os_l: "",
      od_dk: "", os_dk: "",
      od_dir: "Brisk", os_dir: "Brisk",
      od_cons: "Brisk", os_cons: "Brisk",
      rapd: "None", rapd_grade: "",
      notes: ""
    },

    /* Motility */
    mot: {
      versions: "Full", ductions: "Full",
      saccades: "Normal", pursuits: "Normal",
      hirsch: "Ortho",
      nystagmus: "None",
      notes: ""
    },

    /* Binocular Vision */
    bv: {
      ct_d: "", ct_n: "",
      npc_b: "", npc_r: "",
      bo_d_bl: "", bo_d_bk: "", bo_d_r: "",
      bi_d_bl: "", bi_d_bk: "", bi_d_r: "",
      bo_n_bl: "", bo_n_bk: "", bo_n_r: "",
      bi_n_bl: "", bi_n_bk: "", bi_n_r: "",
      aca: "",
      acc_od: "", acc_os: "",
      maf_od: "", maf_os: "",
      baf_od: "", baf_os: "",
      nra: "", pra: "",
      mem_od: "", mem_os: "",
      stereo: "",
      w4d: "", w4n: "",
      notes: ""
    },

    /* Gonioscopy */
    gon: {
      od: { s: "", n: "", i: "", t: "", pig: "", notes: "" },
      os: { s: "", n: "", i: "", t: "", pig: "", notes: "" }
    },

    /* Fundus */
    fun: {
      method: "90D", dilated: false,
      od: {
        media: "Clear",
        cd_v: "", cd_h: "",
        nrr: "ISNT preserved", disc: "Pink", margin: "Well-defined",
        mac: "Normal foveal reflex", vessels: "Normal A/V ratio",
        periph: "Flat, no breaks", vit: "Clear",
        notes: ""
      },
      os: {
        media: "Clear",
        cd_v: "", cd_h: "",
        nrr: "ISNT preserved", disc: "Pink", margin: "Well-defined",
        mac: "Normal foveal reflex", vessels: "Normal A/V ratio",
        periph: "Flat, no breaks", vit: "Clear",
        notes: ""
      },
      findings: [],
      drawings: []
    },

    /* Neuro-Ophthalmology */
    neuro: {
      color_od: "", color_os: "",
      cvf_od: "", cvf_os: "",
      amsler: "Normal",
      notes: ""
    },

    /* Investigations */
    inv: {
      oct_rnfl_od: "", oct_rnfl_os: "",
      oct_cst_od: "", oct_cst_os: "",
      oct_ganglion_od: "", oct_ganglion_os: "",
      vf_md_od: "", vf_md_os: "",
      vf_psd_od: "", vf_psd_os: "",
      vf_pattern: "",
      topo_od: "", topo_os: "",
      pachymetry_od: "", pachymetry_os: "",
      photos: [],
      notes: ""
    },

    /* OSDI Questionnaire */
    osdi: {
      scores: [],
      total: null,
      severity: ""
    },

    /* Plan */
    plan: {
      mgmt: "", followup: "", education: "",
      ref_to: "", ref_urgency: "",
      ref_letter: ""
    },

    /* Tracking */
    completed: [],
    dxList: [],
    alerts: [],
    nudges: [],
    sugTests: [],
    engineLog: [],

    /* Anonymized encounter data (for registry opt-in) */
    encounter: {
      age_bracket: "",
      sex: "",
      region: "",
      symptom_tokens: [],
      finding_tokens: [],
      diagnosis_tokens: [],
      treatment_category: "",
      referral_type: ""
    }
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* BLANK PATIENT                                                   */
/* ═══════════════════════════════════════════════════════════════ */

function blankPatient(pid, mrn) {
  return {
    id: pid,
    mrn: mrn,
    first_name: "",
    last_name: "",
    dob: "",
    age: "",
    sex: "",
    phone: "",
    email: "",
    occupation: "",
    address: "",
    referred_by: "",
    created: new Date().toISOString()
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* HOFSTETTER'S FORMULA (age-based accommodation norms)            */
/* ═══════════════════════════════════════════════════════════════ */

function hofstetter(age) {
  if (!age || age < 5) return { min: null, avg: null, max: null };
  return {
    min: parseFloat((15 - 0.25 * age).toFixed(2)),
    avg: parseFloat((18.5 - 0.30 * age).toFixed(2)),
    max: parseFloat((25 - 0.40 * age).toFixed(2))
  };
}


/* ═══════════════════════════════════════════════════════════════ */
/* AGE BRACKET (for anonymized encounter data)                     */
/* ═══════════════════════════════════════════════════════════════ */

function getAgeBracket(age) {
  age = parseInt(age) || 0;
  if (age < 5) return "0-4";
  if (age < 13) return "5-12";
  if (age < 18) return "13-17";
  if (age < 30) return "18-29";
  if (age < 45) return "30-44";
  if (age < 60) return "45-59";
  if (age < 75) return "60-74";
  return "75+";
}
