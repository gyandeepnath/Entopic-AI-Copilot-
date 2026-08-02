/* ═══════════════════════════════════════════════════════════════ */
/* COMPETENCY FRAMEWORK AND SUPERVISOR SIGN-OFF                     */
/*                                                                  */
/* The two things Phase 2 identified as blocking university         */
/* adoption. The most important property tested here is that the    */
/* framework ships EMPTY: a fabricated competency list would be     */
/* worse than none, because a programme would assess students       */
/* against a standard that corresponds to nothing.                  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function load(user) {
  const store = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, parseInt, isFinite,
    module: { exports: {} },
    CU: user || { username: "stu1", name: "Student One" },
    audit: [],
    loadStore: (k, d) => (Object.prototype.hasOwnProperty.call(store, k) ? JSON.parse(store[k]) : d),
    saveStore: (k, v) => { store[k] = JSON.stringify(v); return true; }
  };
  ctx.logAudit = (a, d) => ctx.audit.push({ a, d });
  vm.createContext(ctx);
  vm.runInContext(read("js/competency.js"), ctx, { filename: "competency.js" });
  return ctx;
}

const FRAMEWORK = {
  name: "Test BOptom Programme", version: "1.0", source: "Faculty of Optometry",
  items: [
    { id: "C1", label: "Perform slit-lamp biomicroscopy", domain: "Examination", level: "does" },
    { id: "C2", label: "Interpret visual fields", domain: "Investigations", level: "shows_how" },
    { id: "C3", label: "Manage acute red eye", domain: "Management", level: "does" }
  ]
};


/* ── The thing that matters most ───────────────────────────────── */

test("the framework ships EMPTY — no competency list is invented", () => {
  /* I do not know the NCAHP list or any particular university's curriculum.
     Shipping a fabricated one would mean programmes assessing students against
     a standard that corresponds to nothing they are accredited against. */
  const c = load();
  const f = c.competencyFramework();
  assert.strictEqual(f.items.length, 0, "no competencies may ship by default");

  const src = read("js/competency.js");
  assert.ok(!/NCAHP|ASCO|OCANZ|GOC\b/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
    "no real accreditation body's framework may be hard-coded");
});

test("faculty import their own framework and it becomes theirs", () => {
  const c = load({ username: "fac1", name: "Prof Faculty" });
  assert.strictEqual(c.competencyFrameworkSet(FRAMEWORK), true);
  const f = c.competencyFramework();
  assert.strictEqual(f.name, "Test BOptom Programme");
  assert.strictEqual(f.items.length, 3);
  assert.strictEqual(f.imported_by, "Prof Faculty");
  assert.ok(c.audit.some((a) => a.a === "competency_framework_imported"));
});

test("an empty or malformed framework is refused", () => {
  const c = load();
  assert.strictEqual(c.competencyFrameworkSet({ name: "x", items: [] }), false);
  assert.strictEqual(c.competencyFrameworkSet(null), false);
  assert.strictEqual(c.competencyFrameworkSet({ name: "x", items: [{ nope: 1 }] }), false);
});


/* ── Claims are not achievements ───────────────────────────────── */

test("a student's claim starts unsigned and does NOT count as achieved", () => {
  /* The distinction the whole model rests on: claiming competence and being
     assessed as competent are different things and are never merged. */
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C2", { level: "shows_how", supervision: "supervised" });
  assert.ok(claim, "the claim should be created");
  assert.strictEqual(claim.status, "pending");

  const p = c.competencyProgress("stu1").find((x) => x.id === "C2");
  assert.strictEqual(p.evidence_pending, 1);
  assert.strictEqual(p.evidence_accepted, 0);
  assert.strictEqual(p.met, false, "an unsigned claim must not meet the competency");
});

test("a claim against an unknown competency is refused", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  assert.strictEqual(c.competencyClaim("NOT_A_REAL_ID", {}), null);
});

test("a supervisor's sign-off is what makes it count", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C2", { level: "shows_how" });

  c.CU = { username: "sup1", name: "Dr Supervisor" };
  assert.strictEqual(c.competencySignOff(claim.id, "accepted", { level: "shows_how" }), true);

  const p = c.competencyProgress("stu1").find((x) => x.id === "C2");
  assert.strictEqual(p.evidence_accepted, 1);
  assert.strictEqual(p.met, true);
  assert.strictEqual(p.achieved_level, "shows_how");
});

test("a supervisor may agree a DIFFERENT level from the one claimed", () => {
  /* That disagreement is the substance of the assessment, not a rejection, and
     both sides are kept so the student can see the gap. */
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C1", { level: "does" });

  c.CU = { username: "sup1", name: "Dr Supervisor" };
  c.competencySignOff(claim.id, "accepted", { level: "shows_how", comment: "Needs more reps" });

  const entry = c.competencyLog()[0];
  assert.strictEqual(entry.level_claimed, "does");
  assert.strictEqual(entry.level_agreed, "shows_how");
  assert.strictEqual(entry.supervisor_comment, "Needs more reps");

  const p = c.competencyProgress("stu1").find((x) => x.id === "C1");
  assert.strictEqual(p.met, false, "target was 'does', agreed was 'shows_how'");
});

test("a declined claim counts for nothing but is not deleted", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C3", { level: "does" });
  c.CU = { username: "sup1", name: "Dr S" };
  c.competencySignOff(claim.id, "declined", { comment: "Not observed" });

  const p = c.competencyProgress("stu1").find((x) => x.id === "C3");
  assert.strictEqual(p.evidence_accepted, 0);
  assert.strictEqual(p.met, false);
  assert.strictEqual(c.competencyLog().length, 1, "the record of the decision stays");
});

test("a claim cannot be silently re-signed", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C2", {});
  c.CU = { username: "sup1", name: "Dr S" };
  assert.strictEqual(c.competencySignOff(claim.id, "accepted", {}), true);
  assert.strictEqual(c.competencySignOff(claim.id, "declined", {}), false,
    "an already-signed claim must not be overwritten");
});

test("sign-off is written to the audit trail", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C2", {});
  c.CU = { username: "sup1", name: "Dr S" };
  c.competencySignOff(claim.id, "accepted", {});
  assert.ok(c.audit.some((a) => a.a === "competency_signed"));
});

test("the supervisor's queue is oldest first", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  c.competencyClaim("C1", {});
  c.competencyClaim("C2", {});
  const q = c.competencyPending();
  assert.strictEqual(q.length, 2);
  assert.ok(String(q[0].claimed_at) <= String(q[1].claimed_at));
});


/* ── The logbook an examining body would accept ────────────────── */

test("the logbook carries NO patient identifiers", () => {
  /* A logbook travels outside the clinic. It has to prove what the student
     did, not who it was done to. */
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C2", { visit_id: "v123", patient_ref: "p456",
                                          reflection: "Learned to check reliability indices" });
  c.CU = { username: "sup1", name: "Dr S" };
  c.competencySignOff(claim.id, "accepted", {});

  const book = c.competencyLogbook("stu1");
  const json = JSON.stringify(book);
  assert.ok(!/v123/.test(json), "visit id must not appear in a logbook");
  assert.ok(!/p456/.test(json), "patient reference must not appear in a logbook");
  assert.ok(/reliability indices/.test(json), "the student's reflection should travel");
});

test("the logbook contains only accepted evidence", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const a = c.competencyClaim("C1", {});
  c.competencyClaim("C2", {});                         /* left pending */
  c.CU = { username: "sup1", name: "Dr S" };
  c.competencySignOff(a.id, "accepted", {});

  const book = c.competencyLogbook("stu1");
  assert.strictEqual(book.entries.length, 1, "pending claims are not achievements");
  assert.strictEqual(book.framework.name, "Test BOptom Programme");
});

test("the summary adds up", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  const a = c.competencyClaim("C1", { level: "does" });
  c.competencyClaim("C2", {});
  c.CU = { username: "sup1", name: "Dr S" };
  c.competencySignOff(a.id, "accepted", { level: "does" });

  const s = c.competencySummary("stu1");
  assert.strictEqual(s.total, 3);
  assert.strictEqual(s.met, 1);
  assert.strictEqual(s.pending_signoff, 1);
  assert.strictEqual(s.not_started, 1);
});

test("one student's evidence is not counted toward another's", () => {
  const c = load({ username: "stuA", name: "A" });
  c.competencyFrameworkSet(FRAMEWORK);
  c.competencyClaim("C1", {});
  assert.strictEqual(c.competencySummary("stuB").pending_signoff, 0);
  assert.strictEqual(c.competencySummary("stuA").pending_signoff, 1);
});


/* ── Wiring ────────────────────────────────────────────────────── */

test("both stores are classified, mirrored and backed up", () => {
  const cls = require("../js/data-classification.js");
  for (const k of ["competencies", "competency_log"]) {
    assert.ok(cls.DATA_STORES[k], k + " must be classified");
    assert.strictEqual(cls.DATA_STORES[k].mirror, true, k + " must survive a cleared browser");
    assert.strictEqual(cls.DATA_STORES[k].backup, true, k + " must travel in a backup");
  }
  const backup = read("js/storage-backup.js");
  assert.ok(/data\.competencies/.test(backup) && /data\.competency_log/.test(backup),
    "both must be read back by the restore");
});
