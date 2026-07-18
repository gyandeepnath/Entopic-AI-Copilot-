/* ═══════════════════════════════════════════════════════════════ */
/* ROLES / MODES / TIERS — core logic                              */
/*                                                                  */
/* Verifies the DOM-free core of js/roles.js: role catalogue,       */
/* active-role switching, tier defaults, the free-tier SAVE caps    */
/* (learning is never capped), and capability visibility (role ×    */
/* tier). Loaded via require() — the browser DOM-wiring is skipped.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const roles = require("../js/roles.js");

function fresh() { roles._reset(); return roles; }


test("live catalogue is Student / Clinician / Faculty; more are 'coming'", () => {
  const live = roles.activeRoleCatalogue().map((r) => r.id);
  assert.deepStrictEqual(live, ["student", "clinician", "faculty"]);
  const all = roles.ENTOPIC_ROLES.map((r) => r.id);
  assert.ok(all.includes("hospital") && all.includes("researcher"), "future roles present but flagged soon");
  assert.ok(roles.roleDef("hospital").soon === true);
});

test("default role is clinician (preserves today's behaviour) until one is chosen", () => {
  fresh();
  assert.strictEqual(roles.getActiveRole(), null);
  assert.strictEqual(roles.effectiveRole(), "clinician");
});

test("setActiveRole switches; a 'soon' role is rejected", () => {
  fresh();
  assert.strictEqual(roles.setActiveRole("student"), true);
  assert.strictEqual(roles.getActiveRole(), "student");
  assert.strictEqual(roles.effectiveRole(), "student");
  assert.strictEqual(roles.setActiveRole("hospital"), false, "cannot switch to a not-yet-live role");
  assert.strictEqual(roles.getActiveRole(), "student", "unchanged after rejected switch");
});

test("tier defaults to Free", () => {
  fresh();
  assert.strictEqual(roles.getTier(), "free");
  assert.strictEqual(roles.tierLabel(), "Free");
});


/* ── Free tier limits SAVING, never LEARNING ── */

test("free tier caps saved patients and cases, with a clear remaining count", () => {
  fresh();
  assert.strictEqual(roles.saveCap("patients"), 15);
  assert.strictEqual(roles.saveCap("cases"), 40);

  let r = roles.canSave("patients", 14);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.remaining, 1);

  r = roles.canSave("patients", 15);
  assert.strictEqual(r.ok, false, "at the cap, saving is blocked");

  r = roles.canSave("cases", 40);
  assert.strictEqual(r.ok, false);
});

test("learning capabilities are ALWAYS on — for every role, every tier", () => {
  fresh();
  const learning = ["engine", "safety", "advisory", "offline", "kb", "casebook_study", "quiz", "present"];
  ["student", "clinician", "faculty"].forEach((role) => {
    roles.setActiveRole(role);
    learning.forEach((cap) => {
      assert.strictEqual(roles.can(cap), true, role + " must always have " + cap);
    });
  });
});


/* ── Capability visibility by role ── */

test("role shapes which non-learning capabilities show", () => {
  fresh();
  roles.setActiveRole("student");
  assert.strictEqual(roles.can("coding"), false, "students don't see billing/coding");
  assert.strictEqual(roles.can("rx_print"), false, "students don't print real Rx");

  roles.setActiveRole("clinician");
  assert.strictEqual(roles.can("coding"), true, "clinicians code");
  assert.strictEqual(roles.can("rx_print"), true, "clinicians prescribe");

  roles.setActiveRole("faculty");
  assert.strictEqual(roles.can("kb_authoring"), true, "faculty author the KB");
});

test("tier locks gate collaboration/backup features regardless of role", () => {
  fresh();
  roles.setActiveRole("clinician");
  /* free clinician: cloud_sync is a paid unlock */
  assert.strictEqual(roles.tierUnlocksCap("cloud_sync"), false);
  /* a free capability is unlocked */
  assert.strictEqual(roles.tierUnlocksCap("soap_note"), true);
});

test("practice records (student mock exams) are NEVER capped — learning is unrestricted", () => {
  fresh();
  assert.strictEqual(roles.saveCap("practice"), Infinity);
  const r = roles.canSave("practice", 5000);
  assert.strictEqual(r.ok, true, "even thousands of practice exams stay saveable");
});

test("roleSessionReset clears the in-page role so accounts never inherit each other's mode", () => {
  fresh();
  roles.setActiveRole("faculty");
  assert.strictEqual(roles.getActiveRole(), "faculty");
  roles.roleSessionReset();
  /* after reset, no in-page role; (CU/localStorage absent in this harness) */
  assert.strictEqual(roles.getActiveRole(), null);
  assert.strictEqual(roles.effectiveRole(), "clinician", "falls back to the safe default");
});
