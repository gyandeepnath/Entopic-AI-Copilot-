/* ═══════════════════════════════════════════════════════════════ */
/* FEEDBACK & ISSUE REPORTING                                       */
/*                                                                  */
/* This is the only inbound channel from clinics you cannot see, so  */
/* the properties that matter are:                                   */
/*                                                                  */
/*  1. A clinical concern is never buried under feature requests.    */
/*  2. No patient data travels in a report.                          */
/*  3. A report that was not saved is never reported as sent.        */
/*  4. It works offline and queues for later.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function device() {
  const disk = {}, audit = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp,
    __disk: disk, __audit: audit,
    logAudit: (k, m) => audit.push({ k, m }),
    loadStore: (k, fb) => (Object.prototype.hasOwnProperty.call(disk, k) ? JSON.parse(disk[k]) : fb),
    saveStore: (k, v) => { disk[k] = JSON.stringify(v); return true; },
    buildInfo: () => ({ app_version: "1.2.0", kb_version: "1.2.0", commit: "abc1234", ua: "Chrome/140" })
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/feedback.js"), ctx, { filename: "feedback.js" });
  return ctx;
}
const run = (ctx, expr, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(expr, ctx); };
const USER = { name: "Dr Nath", role: "clinician" };

function submit(ctx, over) {
  return run(ctx, "feedbackSubmit(__i, __u)", {
    __i: Object.assign({ category: "bug", severity: "minor", subject: "S",
                         body: "Something went wrong when I saved." }, over || {}),
    __u: USER
  });
}


/* ═══ 1. Clinical concerns come first ═══ */

test("a clinical concern outranks everything else, however old", () => {
  const ctx = device();
  submit(ctx, { category: "feature", severity: "blocking", subject: "Dark mode",
                body: "Please add a dark mode for evening clinics." });
  submit(ctx, { category: "bug", severity: "blocking", subject: "Crash",
                body: "It crashed when opening the report page." });
  submit(ctx, { category: "clinical", severity: "minor", subject: "Missed flag",
                body: "Flashes and floaters did not raise the retinal alert I expected." });

  const q = run(ctx, "feedbackQueue()");
  assert.strictEqual(q[0].category, "clinical",
    "a safety report queued behind feature requests is a safety report nobody read");
});

test("open reports outrank resolved ones regardless of category", () => {
  const ctx = device();
  const clin = submit(ctx, { category: "clinical", body: "Something clinical happened here." }).report;
  submit(ctx, { category: "usability", body: "This screen is confusing to use." });
  run(ctx, "feedbackSetStatus(__id,'resolved','admin','fixed')", { __id: clin.id });

  const q = run(ctx, "feedbackQueue()");
  assert.strictEqual(q[0].category, "usability", "the still-open item is on top");
  assert.strictEqual(q[1].status, "resolved");
});

test("within a category, blocking beats major beats minor", () => {
  const ctx = device();
  submit(ctx, { category: "bug", severity: "minor", subject: "m", body: "A minor annoyance here." });
  submit(ctx, { category: "bug", severity: "blocking", subject: "b", body: "Completely blocked from working." });
  submit(ctx, { category: "bug", severity: "major", subject: "j", body: "A major problem in the exam." });
  const q = run(ctx, "feedbackQueue({ category: 'bug' })");
  assert.deepStrictEqual(q.map((r) => r.severity), ["blocking", "major", "minor"]);
});

test("counts single out open clinical and blocking reports for the dashboard badge", () => {
  const ctx = device();
  submit(ctx, { category: "clinical", body: "A clinical concern to look at." });
  submit(ctx, { category: "bug", severity: "blocking", body: "Blocking bug in the exam flow." });
  const done = submit(ctx, { category: "clinical", body: "Another clinical concern here." }).report;
  run(ctx, "feedbackSetStatus(__id,'resolved','admin','')", { __id: done.id });

  const c = run(ctx, "feedbackCounts()");
  assert.strictEqual(c.total, 3);
  assert.strictEqual(c.open, 2);
  assert.strictEqual(c.clinical_open, 1, "resolved clinical reports do not keep the badge lit");
  assert.strictEqual(c.blocking_open, 1);
});


/* ═══ 2. No patient data travels ═══ */

test("identifiers are stripped from the report body", () => {
  /* Reports go to a backend, into exports, onto a support desk. */
  const ctx = device();
  const r = submit(ctx, {
    category: "clinical",
    subject: "Wrong result for MRN-4471",
    body: "Patient MRN-4471, born 1978-04-02, phone 9876543210, meera@example.com — " +
          "the engine did not flag the raised pressure."
  }).report;

  const text = JSON.stringify(r);
  for (const leak of ["MRN-4471", "1978-04-02", "9876543210", "meera@example.com"]) {
    assert.ok(text.indexOf(leak) === -1, "report must not carry '" + leak + "': " + text);
  }
  assert.ok(/did not flag the raised pressure/.test(r.body),
    "but the clinically useful sentence survives — scrubbing must not destroy the report");
});

test("no patient or visit id is ever attached", () => {
  const ctx = device();
  const r = submit(ctx, { context: "step:iop for visit v9x2" }).report;
  const keys = Object.keys(r);
  assert.ok(keys.indexOf("patient_id") === -1 && keys.indexOf("visit_id") === -1,
    "a report is about a pattern, never about a person");
});

test("build context is attached automatically", () => {
  /* A report that does not say which build it came from usually cannot be
     acted on. Asking the reporter for it does not work. */
  const ctx = device();
  const r = submit(ctx).report;
  assert.strictEqual(r.build.app_version, "1.2.0");
  assert.strictEqual(r.build.kb_version, "1.2.0");
  assert.strictEqual(r.build.commit, "abc1234");
  assert.ok(r.build.ua);
});


/* ═══ 3. Never claim a report was sent when it was not ═══ */

test("a report that could not be saved returns an error, not a success", () => {
  const ctx = device();
  ctx.saveStore = () => false;
  const res = submit(ctx);
  assert.ok(!res.ok, "must not report success");
  assert.ok(/could not save/i.test(res.error), "and must say what happened");
  assert.ok(/administrator directly/i.test(res.error),
    "and tell the reporter what to do instead — a clinical concern must not vanish");
});

test("an empty or too-short report is refused with a reason", () => {
  const ctx = device();
  for (const body of ["", "   ", "broken"]) {
    const res = run(ctx, "feedbackSubmit(__i, __u)",
      { __i: { category: "bug", body: body }, __u: USER });
    assert.ok(!res.ok, "refused: " + JSON.stringify(body));
    assert.ok(res.error.length > 10);
  }
});

test("an unknown category is refused rather than silently defaulted", () => {
  const ctx = device();
  const res = run(ctx, "feedbackSubmit(__i, __u)",
    { __i: { category: "nonsense", body: "A long enough description here." }, __u: USER });
  assert.ok(!res.ok);
});

test("an invalid status change is rejected", () => {
  const ctx = device();
  const r = submit(ctx).report;
  assert.strictEqual(run(ctx, "feedbackSetStatus(__id,'exploded','a','')", { __id: r.id }), null);
  assert.strictEqual(run(ctx, "feedbackSetStatus('no-such-id','resolved','a','')"), null);
});


/* ═══ 4. Triage and offline behaviour ═══ */

test("triage records who changed the status, when, and why", () => {
  const ctx = device();
  const r = submit(ctx, { category: "clinical", body: "The engine missed something here." }).report;
  run(ctx, "feedbackSetStatus(__id,'acknowledged','Admin','Looking into it')", { __id: r.id });
  const after = run(ctx, "feedbackSetStatus(__id,'resolved','Admin','Fixed in KB 1.3')", { __id: r.id });

  assert.strictEqual(after.status, "resolved");
  assert.strictEqual(after.notes.length, 2, "the whole trail is kept, not just the latest");
  assert.strictEqual(after.notes[0].status, "acknowledged");
  assert.strictEqual(after.notes[1].by, "Admin");
  assert.ok(/KB 1\.3/.test(after.notes[1].note));
});

test("every role can report, and the queue can be filtered by role", () => {
  const ctx = device();
  for (const role of ["clinician", "student", "faculty", "researcher", "technician"]) {
    run(ctx, "feedbackSubmit(__i, __u)", {
      __i: { category: "usability", body: "Reporting as a " + role + " user here." },
      __u: { name: "User", role: role }
    });
  }
  assert.strictEqual(run(ctx, "feedbackQueue()").length, 5, "no role is excluded from reporting");
  assert.strictEqual(run(ctx, "feedbackQueue({ role: 'student' })").length, 1);
});

test("reports queue offline and can be marked synced without losing any", () => {
  const ctx = device();
  submit(ctx, { subject: "one" });
  submit(ctx, { subject: "two" });
  assert.strictEqual(run(ctx, "feedbackUnsynced().length"), 2, "queued, with no network involved");

  const ids = run(ctx, "feedbackUnsynced().map(function (r) { return r.id; })");
  assert.strictEqual(run(ctx, "feedbackMarkSynced(__ids)", { __ids: ids }), 2);
  assert.strictEqual(run(ctx, "feedbackUnsynced().length"), 0);
  assert.strictEqual(run(ctx, "feedbackLoad().length"), 2, "syncing does not delete the local copy");
});

test("submitting is written to the audit trail", () => {
  const ctx = device();
  submit(ctx, { category: "clinical", body: "A clinical concern worth auditing." });
  assert.ok(ctx.__audit.some((a) => a.k === "feedback_submitted"));
});

test("every category carries a hint telling the reporter what to write", () => {
  /* The hint on the clinical category is what keeps patient data out of the
     body in the first place — scrubbing is the backstop, not the plan. */
  const ctx = device();
  const cats = run(ctx, "FEEDBACK_CATEGORIES");
  const clinical = cats.filter((c) => c.id === "clinical")[0];
  assert.ok(/not the patient/i.test(clinical.hint),
    "the clinical category must tell reporters to describe the pattern, not the patient");
  assert.strictEqual(clinical.priority, 0, "and it must sort first");
});
