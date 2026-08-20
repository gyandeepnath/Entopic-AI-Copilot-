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
      { id: "investigations", label: "Investigations" },
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
  {
    id: "researcher",
    label: "Researcher",
    icon: "🔬",
    blurb: "Study de-identified aggregate data — diagnosis distributions, red-flag rates, the teaching corpus. No patient identifiers.",
    landing: "research",
    tabs: [
      { id: "research", label: "Research" },
      { id: "casebook", label: "Casebook" },
      { id: "kb",       label: "Reference" },
      { id: "account",  label: "Account" }
    ]
  },
  {
    id: "technician",
    label: "Investigation unit",
    icon: "🔬",
    blurb: "Perform ordered investigations, record the values and upload the reports back to the clinician.",
    landing: "investigations",
    tabs: [
      { id: "investigations", label: "Investigations" },
      { id: "kb",       label: "Reference" },
      { id: "account",  label: "Account" }
    ]
  },
  /* ── Open for scope (Phase 2 — backend/realtime/governance) ── */
  { id: "demonstrator", label: "Demonstrator", icon: "🧑‍🏫", blurb: "Present interactive reasoning live to a room.", soon: true },
  { id: "multiuser",    label: "Multi-clinician team", icon: "👥", blurb: "Technician → optometrist → ophthalmologist on one shared exam.", soon: true },
  { id: "hospital",     label: "Hospital / Admin", icon: "🏥", blurb: "Manage clinicians, audit, throughput and quality.", soon: true }
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


/* ── Super admin ──────────────────────────────────────────────────
   A pre-set sign-in that unlocks EVERYTHING at full limits (owner /
   founder use). The password is stored as a hash, not plaintext, and
   can be changed from the Admin panel (stored locally).

   HONESTY NOTE: Entopic is currently a fully client-side offline app,
   so this gate is a convenience lock, not real security — anyone with
   the device and the source can bypass it. Real authentication and
   entitlement enforcement arrive with the Phase-2 backend (managed
   auth, hashed credentials server-side — see CLAUDE.md privacy
   guardrail). */
var ADMIN_USERNAME = "entopic-admin";
var ADMIN_PASS_HASH_DEFAULT = "h11mpz38";   /* hash of the initial password */

/* djb2 — a light, deterministic hash so the password never sits in the
   source or the store as plaintext. Not cryptographic; see note above. */
function adminHash(s) {
  var h = 5381;
  s = String(s == null ? "" : s);
  for (var i = 0; i < s.length; i++) { h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; }
  return "h" + h.toString(36);
}

function adminPassHash() {
  if (typeof localStorage !== "undefined") {
    try { var o = localStorage.getItem("entopic_adminhash"); if (o) return o; } catch (e) {}
  }
  return ADMIN_PASS_HASH_DEFAULT;
}

/* ── PBKDF2 admin credential (DD finding H-5) ─────────────────────
   The admin gate used djb2 — a non-cryptographic 32-bit hash, unsalted, with
   the default baked into source. It is now on the SAME PBKDF2-SHA-256 path as
   user passwords (js/auth-crypto.js). The legacy djb2 hash is honoured once,
   at the next admin sign-in, then upgraded and erased — exactly like the user
   migration. `adminHash`/`adminPassHash` are kept ONLY for that one-time
   legacy check. */
var ADMIN_CRED_KEY = "entopic_admin_cred";   /* { salt, hash, algo } */

function adminStoredCred() {
  if (typeof localStorage === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(ADMIN_CRED_KEY) || "null"); } catch (e) { return null; }
}

/* Async: resolves true iff the credentials are the admin's. */
function adminVerify(username, password) {
  if (username !== ADMIN_USERNAME) return Promise.resolve(false);
  var cred = adminStoredCred();
  if (cred && cred.hash && cred.salt && typeof authHashPasswordAs === "function") {
    /* Hash under the algorithm the credential was STORED with, not the
       strongest this browser offers. adminSetPassword records `algo`, and
       verification used to ignore it: an admin credential created on a device
       without WebCrypto could never be verified on one with it, locking the
       founder out of the Admin panel with the correct password. Same defect as
       authVerifyUser (tools/stress/crypto.js, V2). */
    var algo = (typeof authCredentialAlgo === "function")
      ? authCredentialAlgo({ pw_algo: cred.algo, pw_hash: cred.hash })
      : cred.algo;
    return authHashPasswordAs(password, cred.salt, algo).then(function (r) {
      if (!authSafeEqual(r.hash, cred.hash)) return false;
      /* Correct password under a weak hash on a capable browser: re-hash it. */
      if (algo === "fallback-v1" && typeof authHasWebCrypto === "function" && authHasWebCrypto()) {
        return adminSetPassword(password).then(function () { return true; },
                                              function () { return true; });
      }
      return true;
    });
  }
  /* No modern credential yet → verify against the legacy djb2, then upgrade. */
  if (adminHash(password) === adminPassHash()) {
    return adminSetPassword(password).then(function () { return true; }).catch(function () { return true; });
  }
  return Promise.resolve(false);
}

/* Set/replace the admin password as a salted PBKDF2 hash. Returns a Promise. */
function adminSetPassword(newPass) {
  if (!newPass || String(newPass).length < 8) return Promise.reject(new Error("Password must be at least 8 characters."));
  if (typeof authMakeCredentials !== "function") return Promise.reject(new Error("Crypto unavailable."));
  return authMakeCredentials(newPass).then(function (cred) {
    try {
      localStorage.setItem(ADMIN_CRED_KEY, JSON.stringify({ salt: cred.pw_salt, hash: cred.pw_hash, algo: cred.pw_algo }));
      localStorage.removeItem("entopic_adminhash");   /* erase any legacy djb2 hash */
    } catch (e) { throw e; }
    if (typeof logAudit === "function") logAudit("admin_password_changed", "Admin password updated (PBKDF2)", {});
    return true;
  });
}

/* Deprecated synchronous check — kept so any old caller degrades safely to a
   denial rather than throwing. Real checks go through adminVerify (async). */
function adminCheckCredentials() { return false; }

/* Whether the admin credential is still the weak legacy default (surfaced in
   the Admin panel so the founder is nudged to change it). */
function adminUsingLegacyCredential() {
  return !adminStoredCred();
}

function isAdmin() {
  /* An OWN `admin` property, not an inherited one: `CU.admin === true` was
     satisfied by a polluted Object.prototype, which made any signed-in account
     an administrator (tools/stress/pollution.js, Z1c). */
  if (typeof CU === "undefined" || !CU || typeof CU !== "object") return false;
  return Object.prototype.hasOwnProperty.call(CU, "admin") && CU.admin === true;
}

/* Ephemeral admin session user — never written into the users store, so
   no admin credential material is persisted with the accounts. */
function adminSessionUser() {
  return {
    id: "admin",
    username: ADMIN_USERNAME,
    name: "Administrator",
    cred: "Super Admin",
    clinic: "Entopic — Admin",
    admin: true,
    tier: "institutional",
    role: "clinician"   /* lands on the full clinical workspace; switchable */
  };
}


/* ── Entitlement tier ─────────────────────────────────────────────
   Free by default. Real enforcement (account/licence driven) is a
   later, founder-gated phase; today the tier is a local flag and the
   only thing it changes is SAVE limits + a few "🔒 upgrade" hints.
   The super admin is always institutional (everything, full limits). */
function getTier() {
  if (isAdmin()) return "institutional";
  if (_roleState.tier) return _roleState.tier;
  if (typeof CU !== "undefined" && CU && CU.tier) return CU.tier;
  return "free";
}
function tierLabel() {
  if (isAdmin()) return "Institutional · Admin";
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
/* `supervise` gates the competency sign-off queue (js/ui-competency.js).
   Clinician as well as faculty, because on a practice-based placement the
   person standing next to the student is a registered optometrist, not
   university staff — restricting it to faculty would hide the control from the
   people who actually do the supervising.

   NOT a security boundary (ADR-010): it decides what a screen shows, not what
   the data layer permits. Server-enforced authorization is still outstanding. */
var ROLE_CAPS = {
  student:    { patients: 1, soap_note: 1, rx_print: 0, coding: 0, kb_authoring: 0, casebook_publish: 0, analytics: 1, supervise: 0 },
  clinician:  { patients: 1, soap_note: 1, rx_print: 1, coding: 1, kb_authoring: 0, casebook_publish: 0, analytics: 1, supervise: 1 },
  faculty:    { patients: 1, soap_note: 1, rx_print: 1, coding: 0, kb_authoring: 1, casebook_publish: 1, analytics: 1, supervise: 1 },
  researcher: { patients: 0, soap_note: 0, rx_print: 0, coding: 0, kb_authoring: 0, casebook_publish: 0, analytics: 1, research_export: 1, supervise: 0 },
  technician: { patients: 0, soap_note: 0, rx_print: 0, coding: 0, kb_authoring: 0, casebook_publish: 0, analytics: 0, investigations: 1, supervise: 0 }
};

/* Capabilities that a paid tier unlocks (absent = free). */
var TIER_LOCKS = {
  cloud_sync:       ["pro", "institutional"],
  casebook_publish: ["institutional"],
  multiuser:        ["institutional"],
  org_admin:        ["institutional"],
  research_export:  ["institutional"]
};

/* OWN-PROPERTY lookups only.

   MEASURED PROBLEM (tools/stress/pollution.js, Z1/Z1b/Z1c). Every gate here
   asked `map[cap]` about a key that was usually absent, and an absent key on a
   plain object falls through to Object.prototype. One polluted key therefore
   granted the capability outright: a student obtained `supervise` — the
   competency sign-off gate — and `kb_authoring`, and a polluted ALWAYS_ON key
   short-circuited the tier check as well.

   This is a UI-visibility gate, not a server-enforced boundary (ADR-010), so
   the consequence is a control appearing where it should not rather than a
   data breach. It is still wrong, it is cheap to close, and the same lookup
   shape is what will guard the real thing once the backend enforces it.

   The pollution has to come from somewhere — a crafted JSON payload in a
   restored backup or a synced record — which is exactly the input this app
   accepts, and why the other side of that door is already hardened. */
function roleHas(map, key) {
  return !!map && Object.prototype.hasOwnProperty.call(map, key) && !!map[key];
}

function roleShowsCap(cap) {
  if (isAdmin()) return true;             /* admin sees everything */
  if (roleHas(ALWAYS_ON, cap)) return true;
  var caps = ROLE_CAPS[effectiveRole()];
  return roleHas(caps, cap);
}
function tierUnlocksCap(cap) {
  if (isAdmin()) return true;             /* admin unlocks everything */
  if (roleHas(ALWAYS_ON, cap)) return true;
  if (!Object.prototype.hasOwnProperty.call(TIER_LOCKS, cap)) return true;  /* free */
  var need = TIER_LOCKS[cap];
  if (!need || typeof need.indexOf !== "function") return true;
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
    ROLE_CAPS: ROLE_CAPS, TIER_LOCKS: TIER_LOCKS,
    adminHash: adminHash, adminCheckCredentials: adminCheckCredentials,
    adminVerify: adminVerify, adminSetPassword: adminSetPassword,
    adminUsingLegacyCredential: adminUsingLegacyCredential,
    adminSessionUser: adminSessionUser, isAdmin: isAdmin,
    ADMIN_USERNAME: ADMIN_USERNAME,
    _reset: function () { _roleState = { active: null, tier: null }; }
  };
}
