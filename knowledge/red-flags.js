/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — RED-FLAG REGISTER  (Phase 2 safety finding CS-04)     */
/*                                                                  */
/* ── THE FINDING ──                                               */
/*                                                                  */
/* "The knowledge base is reviewable by a clinician; the red-flag   */
/*  rules are not. They are `if` statements in js/engine.js. A      */
/*  clinician signing off the knowledge base is not signing off the */
/*  alerts, and cannot see them without reading code. Until then    */
/*  the alerts are trustworthy but UNREVIEWABLE, which is a         */
/*  different thing."                                               */
/*                                                                  */
/* ── WHY THIS IS A REGISTER AND NOT A RULE ENGINE ──              */
/*                                                                  */
/* The obvious fix — move the rules into data and have the engine   */
/* read them — is the wrong one, and the register recommended it    */
/* before this file existed. Red flags are un-suppressible. Making  */
/* them data creates a path by which a corrupt, missing, stale or   */
/* edited file removes one, and that path did not exist before.     */
/* Reviewability is worth a great deal; it is not worth inventing a */
/* way to lose an alert.                                            */
/*                                                                  */
/* So the rules STAY in js/engine.js, where nothing can unload      */
/* them, and this file makes them visible. Both halves are pinned   */
/* together by tests/red-flags.test.js, which fails if the engine   */
/* gains an alert this register does not declare, or loses one it   */
/* does. The register cannot drift silently, and it cannot suppress */
/* anything, because the engine never reads it.                     */
/*                                                                  */
/* ── WHAT THE CLINICIAN IS SIGNING OFF ──                         */
/*                                                                  */
/* For each rule: what fires it, in clinical language; the exact    */
/* words the clinician sees; and its level. Numeric cut-offs live   */
/* in knowledge/clinical-thresholds.js and are referenced by id     */
/* rather than repeated, so a threshold cannot mean one thing to    */
/* the alert and another to the token.                              */
/*                                                                  */
/* Every rule carries status "UNVERIFIED" and no citation, for the  */
/* same reason as the threshold table: a source nobody read stops   */
/* the next reader checking.                                        */
/*                                                                  */
/* Pure data. Nothing loads it at runtime. Load order irrelevant.   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Field meanings:
     id          stable identifier, used by the test that pins this to the code
     fires_when  the trigger in clinical language — what a reviewer judges
     match       a literal fragment of the message as written in js/engine.js;
                 the test looks for it, so it must stay verbatim
     level       "urgent" or "warn", exactly as the engine emits
     uses        clinical-threshold ids this rule compares against, if any
     why         why this is a red flag at all
     status      UNVERIFIED until the founder signs the row off              */

var RED_FLAG_RULES = [

  /* ── SYMPTOM-DRIVEN ─────────────────────────────────────────── */
  {
    id: "sudden_vision_loss",
    fires_when: "The patient reports sudden loss of vision",
    match: "Sudden vision loss — URGENT referral required",
    level: "urgent", uses: [],
    why: "Sudden loss has a short list of causes, several of which lose the eye " +
         "within hours. The alert makes no attempt to say which.",
    status: "UNVERIFIED"
  },
  {
    id: "flashes_floaters",
    fires_when: "Flashes AND floaters are both recorded",
    match: "Flashes + floaters — rule out retinal tear / detachment",
    level: "urgent", uses: [],
    why: "The combination, not either alone. Also drives a decision-tree gate " +
         "that force-surfaces Retinal Detachment regardless of its score.",
    status: "UNVERIFIED"
  },
  {
    id: "curtain_vision",
    fires_when: "The patient describes a curtain or shadow across the vision",
    match: "Curtain / shadow in vision — possible retinal detachment",
    level: "urgent", uses: [],
    why: "A described field defect with a moving edge.",
    status: "UNVERIFIED"
  },
  {
    id: "pain_eye_movement",
    fires_when: "Pain on eye movement is recorded",
    match: "Pain on eye movement — consider optic neuritis workup",
    level: "warn", uses: [],
    why: "Warn rather than urgent: the finding is suggestive, not diagnostic, " +
         "and the recommended action is a workup rather than same-day referral.",
    status: "UNVERIFIED"
  },
  {
    id: "metamorphopsia",
    fires_when: "Distortion is recorded, whether reported or found on Amsler",
    match: "Metamorphopsia — OCT macula to rule out wet AMD / ERM",
    level: "warn", uses: [],
    why: "Points at the macula and names the test rather than the diagnosis.",
    status: "UNVERIFIED"
  },

  /* ── MEASUREMENT-DRIVEN ─────────────────────────────────────── */
  {
    id: "iop_critical",
    fires_when: "IOP in either eye is above the critical threshold",
    match: "IOP critically elevated",
    level: "urgent", uses: ["iop_critical"],
    why: "The highest band. Bands are exclusive — only the highest one that " +
         "applies fires, so a very high pressure produces one alert, not three.",
    status: "UNVERIFIED"
  },
  {
    id: "iop_very_high",
    fires_when: "IOP in either eye is above the markedly-raised threshold, but not critical",
    match: "IOP significantly elevated",
    level: "urgent", uses: ["iop_very_high"],
    why: "Middle band. Shares its number with the `very_high_iop` token, so the " +
         "alert and the differential cannot disagree about what counts as markedly raised.",
    status: "UNVERIFIED"
  },
  {
    id: "iop_high",
    fires_when: "IOP in either eye is above the raised threshold, but not markedly so",
    match: "IOP elevated — glaucoma workup indicated",
    level: "warn", uses: ["iop_high"],
    why: "Lowest band, and the only one that is a warn. It shares its number " +
         "with the `high_iop` token so an alert cannot disagree with the differential.",
    status: "UNVERIFIED"
  },
  {
    id: "rapd",
    fires_when: "A relative afferent pupillary defect is recorded as anything other than None",
    match: "RAPD detected",
    level: "urgent", uses: [],
    why: "An objective sign of asymmetric optic nerve or extensive retinal disease. " +
         "Deliberately not graded: any RAPD fires.",
    status: "UNVERIFIED"
  },
  {
    id: "van_herick_od",
    fires_when: "Van Herick grade in the right eye is at or below the narrow threshold",
    match: "OD — gonioscopy before dilation",
    level: "warn", uses: ["van_herick_narrow"],
    why: "The alert exists to be read BEFORE dilating. Per eye, because the " +
         "clinician may dilate one.",
    status: "UNVERIFIED"
  },
  {
    id: "van_herick_os",
    fires_when: "Van Herick grade in the left eye is at or below the narrow threshold",
    match: "OS — gonioscopy before dilation",
    level: "warn", uses: ["van_herick_narrow"],
    why: "The same rule for the left eye, declared separately because the engine " +
         "raises it separately — a patient can be narrow in one eye only.",
    status: "UNVERIFIED"
  },
  {
    id: "diabetes_no_fundus",
    fires_when: "The patient has diabetes recorded and the fundus step is not marked complete",
    match: "Diabetic patient — dilated fundus examination indicated",
    level: "warn", uses: [],
    why: "The only rule here that fires on something NOT done rather than " +
         "something found.",
    status: "UNVERIFIED"
  },

  /* ── SIGN-DRIVEN ────────────────────────────────────────────── */
  {
    id: "bilateral_disc_swelling",
    fires_when: "Disc swelling is recorded in both eyes",
    match: "Bilateral disc edema — URGENT: rule out raised ICP",
    level: "urgent", uses: [],
    why: "Bilaterality is the point — unilateral disc swelling is a different " +
         "problem and does not fire this rule.",
    status: "UNVERIFIED"
  },
  {
    id: "hypopyon",
    fires_when: "A hypopyon is recorded",
    match: "Hypopyon present — URGENT referral",
    level: "urgent", uses: [],
    why: "A layered sterile or infective infiltrate in the anterior chamber.",
    status: "UNVERIFIED"
  },
  {
    id: "rubeosis",
    fires_when: "Iris neovascularisation is recorded",
    match: "Rubeosis iridis — URGENT: neovascular glaucoma risk",
    level: "urgent", uses: [],
    why: "Names the risk rather than the cause.",
    status: "UNVERIFIED"
  },
  {
    id: "leukocoria",
    fires_when: "A white red-reflex is recorded in either eye in the paediatric module",
    match: "Leukocoria — URGENT referral",
    level: "urgent", uses: [],
    why: "⚠ Alert wording was drafted by engineering, not by a clinician. " +
         "The referral urgency in particular needs the founder's judgement.",
    status: "UNVERIFIED"
  }
];


/* ── THE DERIVED RULE (Phase 4 F-1) ──
   Not one of the 16 above: it is a single rule that fires for ANY urgent
   condition reaching the shown differential, which is how alert coverage went
   from 12 of 63 urgent conditions to 63 of 63. Declared separately because a
   reviewer judges it differently — it is a policy, not a clinical trigger. */
var RED_FLAG_DERIVED_RULE = {
  id: "derived_urgent_in_differential",
  fires_when: "Any condition marked urgent in the knowledge base reaches the shown " +
              "differential above the derived-alert score floor, and no hand-written " +
              "rule above already names it",
  match: "urgent condition in the differential",
  level: "urgent",
  uses: ["derived_alert_min"],
  why: "Before this rule, 51 of 63 urgent conditions — including Chemical Eye Burn, " +
       "Open Globe Injury and Microbial Keratitis — appeared in the differential " +
       "marked URGENT but raised no banner. The clinician was not blind, but the " +
       "urgency was one line of small text rather than an alert.",
  status: "UNVERIFIED",
  note: "Clinician-authored conditions are excluded from this rule and alert " +
        "through their own attributed path, so an unreviewed personal condition " +
        "can never produce an alert that reads as reviewed content."
};

/* ── THE CLINICIAN-AUTHORED RULE ──
   The founder decided (2026-08-02) that a clinician may mark their own
   condition urgent. Declared here because the register must account for every
   banner the product can show — including the ones it did not write. */
var RED_FLAG_OVERLAY_RULE = {
  id: "overlay_urgent",
  fires_when: "A condition the clinician wrote themselves, and marked urgent, reaches " +
              "the shown differential above the overlay score floor",
  match: "YOUR ALERT",
  level: "urgent",
  uses: ["overlay_floor"],
  why: "This is the one alert in the product that no reviewer has seen, so it is " +
       "the one that most needs to announce itself. It is APPENDED after the core " +
       "alerts rather than merged into them, and carries the author's name and " +
       "'not clinically reviewed' in the banner text itself. A mistaken personal " +
       "urgent therefore costs an extra line on screen — never a missing red flag.",
  status: "UNVERIFIED",
  note: "Not signed off in the sense the others are: the CONTENT is written by " +
        "whichever clinician authored the condition. What the founder signs off " +
        "is the mechanism and the attribution wording."
};

/* Everything a reviewer still has to sign off. */
function redFlagsUnverified() {
  return RED_FLAG_RULES.concat([RED_FLAG_DERIVED_RULE, RED_FLAG_OVERLAY_RULE])
    .filter(function (r) { return r.status !== "VERIFIED"; });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    RED_FLAG_RULES: RED_FLAG_RULES,
    RED_FLAG_DERIVED_RULE: RED_FLAG_DERIVED_RULE,
    RED_FLAG_OVERLAY_RULE: RED_FLAG_OVERLAY_RULE,
    redFlagsUnverified: redFlagsUnverified
  };
}
