/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — ROLES, MODES & ACCESS TIERS                           */
/*                                                                  */
/* Two orthogonal axes (see docs/ROLES_AND_MODES.md):              */
/*   • ROLE  — a switchable persona/mode that shapes the UI &       */
/*     workflow (Student / Clinician / Faculty …). One account can  */
/*     switch freely between roles.                                 */
/*   • TIER  — the entitlement that decides what is unlocked        */
/*     (free / pro / institutional). Comes from the account, not    */
/*     the role.                                                    */
/*                                                                  */
/* GUARDRAILS: learning is NEVER gated. The diagnostic engine,      */
/* red-flag safety, the glass-box reasoning, the knowledge base and */
/* the casebook (for study) are on for every role and every tier —  */
/* including free students. The free tier only limits *saving*      */
/* (how many real records/cases persist) and practice-running &     */
/* collaboration features. No payment/paywall is implemented here.  */
/*                                                                  */
/* This core is DOM-free and reads/writes role state through small  */
/* guarded hooks, so it runs under Node tests too.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";


/* ── Role catalogue ──────────────────────────────────────────────
   `soon:true` roles are shown as "coming" — the model is deliberately
   open for scope (multi-clinician, hospital, researcher, conference)
   so new modes drop in without a rewrite. */
var ENTOPIC_ROLES = [
  {
    id: "student",
    label: "Student / Trainee",
    icon: "🎓",
    blurb: "Learn clinical reasoning, study real cases, self-test. Everything for learning is free and open.",
    landing: "study",
    tabs: [
      { id: "study",    label: "Study" },
      { id: "casebook", label: "Casebook" },
      { id: "kb",       label: "Reference" },
      { id: "account",  label: "Account" }
    ]
  },
  {
    id: "clinician",
    label: "Clinician / Doctor",
    icon: "🩺",
    blurb: "Run real exams with live decision support, document, prescribe, refer.",
    landing: "patients",
    tabs: [
      { id: "patients", label: "Patients" },
      { id: "casebook", label: "Casebook" },
      { id: "kb",       label: "Reference" },
      { id: "account",  label: "Account" }
    ]
  },
  {
    id: "faculty",
    label: "Faculty / Educator",
    icon: "📚",
    blurb: "Teach with real reasoned cases, curate the casebook, refine the knowledge base.",
    landing: "teaching",
    tabs: [
      { id: "teaching", label: "Teaching" },
      { id: "casebook", label: "Casebook" },
      { id: "kb",       label: "Reference" },
      { id: "account",  label: "Account" }
    ]
  },
  /* ── Open for scope (Phase 2 — backend/realtime/governance) ── */
  { id: "demonstrator", label: "Demonstrator", icon: "🧑‍🏫", blurb: "Present interactive reasoning live to a room.", soon: true },
  { id: "multiuser",    label: "Multi-clinician team", icon: "👥", blurb: "Technician → optometrist → ophthalmologist on one shared exam.", soon: true },
  { id: "hospital",     label: "Hospital / Admin", icon: "🏥", blurb: "Manage clinicians, audit, throughput and quality.", soon: true },
  { id: "researcher",   label: "Researcher", icon: "🔬", blurb: "Study de-identified, consented aggregate data.", soon: true }
];

/* Roles that are live (selectable and fully wired) this phase. */
function activeRoleCatalogue() {
  return ENTOPIC_ROLES.filter(function (r) { return !r.soon; });
}
function roleDef(id) {
  for (var i = 0; i < ENTOPIC_ROLES.length; i++) if (ENTOPIC_ROLES[i].id === id) return ENTOPIC_ROLES[i];
  return null;
}
var DEFAULT_ROLE = "clinician";   /* preserves today's behaviour if unset */


/* ── Active-role state ────────────────────────────────────────────
   Priority: explicit in-session override → signed-in account (CU.role)
   → localStorage → null (caller decides whether to prompt). Setting a
   role persists it on the account and locally. */
var _roleState = { active: null, tier: null };

function getActiveRole() {
  if (_roleState.active) return _roleState.active;
  if (typeof CU !== "undefined" && CU && CU.role) return CU.role;
  if (typeof localStorage !== "undefined") {
    try { var r = localStorage.getItem("entopic_activeRole"); if (r) return r; } catch (e) {}
  }
  return null;
}

/* The role we actually render with (never null — falls back sensibly). */
function effectiveRole() {
  var r = getActiveRole();
  return (r && roleDef(r) && !roleDef(r).soon) ? r : DEFAULT_ROLE;
}

/* Clear in-page role state on login/logout so a role chosen by one account
   never silently leaks into another account on the same device. (CU.role is
   the durable source once signed in.) */
function roleSessionReset() {
  _roleState.active = null;
  _roleState.tier = null;
}

function setActiveRole(id) {
  if (!roleDef(id) || roleDef(id).soon) return false;
  _roleState.active = id;
  if (typeof CU !== "undefined" && CU) CU.role = id;
  if (typeof localStorage !== "undefined") {
    try { localStorage.setItem("entopic_activeRole", id); } catch (e) {}
  }
  /* Persist onto the stored account so it survives re-login. */
  if (typeof CU !== "undefined" && CU && typeof loadUsers === "function" && typeof saveUsers === "function") {
    try {
      var users = loadUsers();
      for (var i = 0; i < users.length; i++) {
        if (users[i].id === CU.id) { users[i].role = id; break; }
      }
      saveUsers(users);
    } catch (e2) {}
  }
  return true;
}


/* ── Entitlement tier ─────────────────────────────────────────────
   Free by default. Real enforcement (account/licence driven) is a
   later, founder-gated phase; today the tier is a local flag and the
   only thing it changes is SAVE limits + a few "🔒 upgrade" hints. */
function getTier() {
  if (_roleState.tier) return _roleState.tier;
  if (typeof CU !== "undefined" && CU && CU.tier) return CU.tier;
  return "free";
}
function tierLabel() {
  var t = getTier();
  return t === "pro" ? "Pro" : t === "institutional" ? "Institutional" : "Free";
}


/* ── Save limits (free tier limits SAVING, never LEARNING) ────────
   Generous, honest caps — enough to try the product for real, capped
   so a practice needs a paid tier. Learning paths never call this. */
var SAVE_LIMITS = {
  /* `practice` records are LEARNING (student mock exams) — never capped,
     on any tier. Only real practice-running records are limited on free. */
  free:          { patients: 15, cases: 40, practice: Infinity },
  pro:           { patients: Infinity, cases: Infinity, practice: Infinity },
  institutional: { patients: Infinity, cases: Infinity, practice: Infinity }
};

function saveCap(kind) {
  var t = getTier();
  var caps = SAVE_LIMITS[t] || SAVE_LIMITS.free;
  return (caps[kind] != null) ? caps[kind] : Infinity;
}

/* Returns { ok, cap, remaining, kind }. `currentCount` = how many of
   that kind already exist. */
function canSave(kind, currentCount) {
  var cap = saveCap(kind);
  currentCount = currentCount || 0;
  if (currentCount < cap) {
    return { ok: true, cap: cap, remaining: (cap === Infinity ? Infinity : cap - currentCount), kind: kind };
  }
  return { ok: false, cap: cap, remaining: 0, kind: kind };
}


/* ── Capability visibility (role × tier) ──────────────────────────
   `roleShowsCap` = is this feature relevant to the current role's UI?
   `tierUnlocksCap` = is it included in the current tier?
   `can` = both. Learning capabilities are always shown & unlocked. */
var ALWAYS_ON = {
  engine: 1, safety: 1, advisory: 1, offline: 1, kb: 1, casebook_study: 1, quiz: 1, present: 1
};

/* Which capabilities each live role surfaces in its UI. */
var ROLE_CAPS = {
  student:   { patients: 1, soap_note: 1, rx_print: 0, coding: 0, kb_authoring: 0, casebook_publish: 0 },
  clinician: { patients: 1, soap_note: 1, rx_print: 1, coding: 1, kb_authoring: 0, casebook_publish: 0 },
  faculty:   { patients: 1, soap_note: 1, rx_print: 1, coding: 0, kb_authoring: 1, casebook_publish: 1 }
};

/* Capabilities that a paid tier unlocks (absent = free). */
var TIER_LOCKS = {
  cloud_sync:       ["pro", "institutional"],
  casebook_publish: ["institutional"],
  multiuser:        ["institutional"],
  org_admin:        ["institutional"],
  research_export:  ["institutional"]
};

function roleShowsCap(cap) {
  if (ALWAYS_ON[cap]) return true;
  var caps = ROLE_CAPS[effectiveRole()] || {};
  return !!caps[cap];
}
function tierUnlocksCap(cap) {
  if (ALWAYS_ON[cap]) return true;
  var need = TIER_LOCKS[cap];
  if (!need) return true;                 /* free */
  return need.indexOf(getTier()) >= 0;
}
function can(cap) { return roleShowsCap(cap) && tierUnlocksCap(cap); }


/* Node test harness hook (no-op in browser). */
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ENTOPIC_ROLES: ENTOPIC_ROLES, roleDef: roleDef, activeRoleCatalogue: activeRoleCatalogue,
    getActiveRole: getActiveRole, effectiveRole: effectiveRole, setActiveRole: setActiveRole,
    roleSessionReset: roleSessionReset,
    getTier: getTier, tierLabel: tierLabel, canSave: canSave, saveCap: saveCap,
    can: can, roleShowsCap: roleShowsCap, tierUnlocksCap: tierUnlocksCap,
    _reset: function () { _roleState = { active: null, tier: null }; }
  };
}
