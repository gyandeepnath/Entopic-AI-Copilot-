/* ═══════════════════════════════════════════════════════════════ */
/* MEDICATION — OCULAR SIDE EFFECTS DATABASE                       */
/* Maps systemic medications to known ocular complications         */
/* Used by: medication checker, alert system                       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var MEDICATION_OCULAR_EFFECTS = [

  /* ── CORTICOSTEROIDS ── */
  {
    drug: "Prednisolone",
    aliases: ["prednisone", "prednisolone", "steroid", "corticosteroid", "methylprednisolone", "dexamethasone"],
    effects: [
      { condition: "PSC Cataract", risk: "high", onset: "months-years", action: "Monitor lens — annual slit lamp" },
      { condition: "IOP elevation", risk: "high", onset: "weeks", action: "Check IOP every visit — steroid responder risk" },
      { condition: "Central Serous Chorioretinopathy", risk: "moderate", onset: "weeks-months", action: "Ask about distortion/metamorphopsia" }
    ]
  },

  /* ── ANTIMALARIALS ── */
  {
    drug: "Hydroxychloroquine",
    aliases: ["hydroxychloroquine", "plaquenil", "HCQ"],
    effects: [
      { condition: "Macular toxicity (Bull's eye)", risk: "moderate", onset: "years (>5 years use)", action: "Annual OCT macula + 10-2 VF after 5 years. Dose <5mg/kg/day." },
      { condition: "Corneal deposits", risk: "low", onset: "months", action: "Usually asymptomatic — monitor" }
    ]
  },

  {
    drug: "Chloroquine",
    aliases: ["chloroquine"],
    effects: [
      { condition: "Macular toxicity", risk: "high", onset: "years", action: "Higher risk than HCQ — annual screening from year 1" }
    ]
  },

  /* ── ALPHA BLOCKERS ── */
  {
    drug: "Tamsulosin",
    aliases: ["tamsulosin", "flomax", "alpha blocker", "urimax"],
    effects: [
      { condition: "Intraoperative Floppy Iris Syndrome (IFIS)", risk: "high", onset: "during surgery", action: "CRITICAL: Document in records. Inform surgeon before ANY cataract surgery." }
    ]
  },

  /* ── TOPIRAMATE ── */
  {
    drug: "Topiramate",
    aliases: ["topiramate", "topamax"],
    effects: [
      { condition: "Acute angle closure", risk: "moderate", onset: "weeks", action: "Ciliary body edema mechanism — not pupil block. Check AC depth." },
      { condition: "Acute myopia", risk: "moderate", onset: "days-weeks", action: "Transient — resolves on stopping drug" }
    ]
  },

  /* ── AMIODARONE ── */
  {
    drug: "Amiodarone",
    aliases: ["amiodarone", "cordarone"],
    effects: [
      { condition: "Corneal verticillata (whorl deposits)", risk: "high", onset: "months", action: "Almost universal — usually asymptomatic. Monitor." },
      { condition: "Optic neuropathy", risk: "low", onset: "months-years", action: "Rare but serious — check VA and color vision" }
    ]
  },

  /* ── BISPHOSPHONATES ── */
  {
    drug: "Alendronate",
    aliases: ["alendronate", "fosamax", "risedronate", "bisphosphonate"],
    effects: [
      { condition: "Anterior uveitis / scleritis", risk: "low", onset: "days-weeks", action: "Rare — consider if new onset uveitis in bisphosphonate user" }
    ]
  },

  /* ── ISOTRETINOIN ── */
  {
    drug: "Isotretinoin",
    aliases: ["isotretinoin", "accutane", "roaccutane"],
    effects: [
      { condition: "Dry eye / MGD", risk: "high", onset: "weeks", action: "Meibomian gland dysfunction — may be permanent. Lubricants." },
      { condition: "Contact lens intolerance", risk: "high", onset: "weeks", action: "Advise against CL wear during treatment" },
      { condition: "Night vision decrease", risk: "moderate", onset: "weeks", action: "May affect dark adaptation" }
    ]
  },

  /* ── ETHAMBUTOL ── */
  {
    drug: "Ethambutol",
    aliases: ["ethambutol"],
    effects: [
      { condition: "Optic neuritis (toxic)", risk: "moderate", onset: "months", action: "Baseline VA + color vision. Monthly monitoring. Stop if color vision drops." }
    ]
  },

  /* ── RIFABUTIN ── */
  {
    drug: "Rifabutin",
    aliases: ["rifabutin"],
    effects: [
      { condition: "Anterior uveitis", risk: "moderate", onset: "weeks-months", action: "Hypopyon uveitis reported — monitor for AC cells" }
    ]
  },

  /* ── SILDENAFIL ── */
  {
    drug: "Sildenafil",
    aliases: ["sildenafil", "viagra", "tadalafil", "cialis", "PDE5 inhibitor"],
    effects: [
      { condition: "Blue tinge / chromatopsia", risk: "moderate", onset: "hours", action: "Transient — resolves. PDE6 cross-reactivity." },
      { condition: "NAION", risk: "low", onset: "hours", action: "Rare but reported — ask about sudden vision loss" }
    ]
  },

  /* ── TETRACYCLINES ── */
  {
    drug: "Doxycycline",
    aliases: ["doxycycline", "tetracycline", "minocycline"],
    effects: [
      { condition: "Intracranial hypertension (pseudotumor)", risk: "low", onset: "weeks", action: "Check for papilledema if headaches develop" }
    ]
  },

  /* ── VIGABATRIN ── */
  {
    drug: "Vigabatrin",
    aliases: ["vigabatrin", "sabril"],
    effects: [
      { condition: "Peripheral visual field constriction", risk: "high", onset: "months-years", action: "Irreversible — baseline VF and 6-monthly monitoring mandatory" }
    ]
  },

  /* ── ANTICOAGULANTS ── */
  {
    drug: "Warfarin",
    aliases: ["warfarin", "coumadin", "anticoagulant", "blood thinner", "apixaban", "rivaroxaban"],
    effects: [
      { condition: "Subconjunctival hemorrhage", risk: "moderate", onset: "any time", action: "Usually benign — check INR if recurrent" },
      { condition: "Retinal/vitreous hemorrhage risk", risk: "low", onset: "any time", action: "Higher bleed risk — relevant for surgical planning" }
    ]
  },

  /* ── ANTIDEPRESSANTS ── */
  {
    drug: "SSRIs",
    aliases: ["sertraline", "fluoxetine", "paroxetine", "citalopram", "escitalopram", "SSRI", "antidepressant"],
    effects: [
      { condition: "Dry eye", risk: "moderate", onset: "weeks-months", action: "Anticholinergic effect — assess tear film" },
      { condition: "Mydriasis risk", risk: "low", onset: "variable", action: "Caution in narrow angles" }
    ]
  },

  /* ── ANTICHOLINERGICS ── */
  {
    drug: "Anticholinergics",
    aliases: ["oxybutynin", "tolterodine", "solifenacin", "anticholinergic", "benztropine", "atropine systemic"],
    effects: [
      { condition: "Dry eye", risk: "high", onset: "weeks", action: "Reduced tear secretion — lubricants" },
      { condition: "Angle closure risk", risk: "moderate", onset: "variable", action: "Mydriasis — check AC depth in hyperopes" },
      { condition: "Accommodation impairment", risk: "moderate", onset: "days", action: "Cycloplegic effect — near blur" }
    ]
  }
];
