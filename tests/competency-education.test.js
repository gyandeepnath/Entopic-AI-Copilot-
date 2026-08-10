/* ═══════════════════════════════════════════════════════════════ */
/* COMPETENCY — PHASE 10: FEEDBACK, SIMULATION, AND THE INTERFACE   */
/*                                                                  */
/* Phase 10 found js/competency.js had sixteen passing tests and    */
/* ZERO call sites: a student could not record evidence and a       */
/* supervisor could not sign anything off. Green tests over an      */
/* unreachable feature.                                             */
/*                                                                  */
/* These tests cover the three things that were added, and the one  */
/* that matters most is the SIMULATION boundary: Entopic can        */
/* produce simulated cases and practice patients, and a logbook     */
/* that cannot tell those from a real patient would let a student   */
/* present simulated work to an examining body as clinical          */
/* experience. That is a misrepresentation the software would have  */
/* caused, so it is tested here as a safety property, not a nicety. */
/*                                                                  */
/* What is deliberately NOT tested, because it is deliberately not  */
/* implemented: any pass mark, weighting, minimum case count or     */
/* progression rule. Those are institutional and inventing them is  */
/* the fabrication this project forbids.                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Loads the logic layer only. `role` decides what can("supervise") answers so
   the UI's client-side gate can be exercised without pulling in roles.js. */
function load(user, opts) {
  opts = opts || {};
  const store = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Set,
    parseInt, isFinite, encodeURIComponent,
    module: { exports: {} },
    CU: user === undefined ? { username: "stu1", name: "Student One" } : user,
    audit: [],
    loadStore: (k, d) => (Object.prototype.hasOwnProperty.call(store, k) ? JSON.parse(store[k]) : d),
    saveStore: (k, v) => { store[k] = JSON.stringify(v); return true; },
    can: (cap) => (cap === "supervise" ? !!opts.supervise : false)
  };
  ctx.logAudit = (a, d) => ctx.audit.push({ a, d });
  ctx._store = store;
  vm.createContext(ctx);
  vm.runInContext(read("js/competency.js"), ctx, { filename: "competency.js" });
  if (opts.ui) {
    vm.runInContext(read("js/dom-escape.js"), ctx, { filename: "dom-escape.js" });
    vm.runInContext(read("js/ui-competency.js"), ctx, { filename: "ui-competency.js" });
  }
  return ctx;
}

const FRAMEWORK = {
  name: "Test BOptom Programme", version: "1.0", source: "Faculty of Optometry",
  items: [
    { id: "C1", label: "Perform slit-lamp biomicroscopy", domain: "Examination", level: "shows_how" },
    { id: "C2", label: "Interpret visual fields", domain: "Investigations", level: "shows_how" }
  ]
};

/* Claim + sign off in one step, as the UI does. */
function signed(c, competencyId, claimOpts, signOpts) {
  const claim = c.competencyClaim(competencyId, claimOpts || {});
  const student = c.CU;
  c.CU = { username: "sup1", name: "Dr Supervisor" };
  const ok = c.competencySignOff(claim.id, (signOpts || {}).decision || "accepted", signOpts || {});
  c.CU = student;
  return { claim, ok };
}


/* ═══ 1. THE SIMULATION BOUNDARY (the safety property) ═══════════ */

test("a claim records whether its encounter was simulated", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  assert.strictEqual(c.competencyClaim("C1", { simulated: true }).simulated, true);
  assert.strictEqual(c.competencyClaim("C1", { simulated: false }).simulated, false);
  assert.strictEqual(c.competencyClaim("C1", {}).simulated, false,
    "a claim with no flag must default to real — the UI resolves it, and a silent " +
    "`true` here would mislabel every genuine encounter");
});

test("simulated evidence does NOT count towards a competency by default", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  assert.strictEqual(c.competencySimulationCounts(), false,
    "the conservative default: over-counting asserts a competence nobody assessed on a patient");

  signed(c, "C1", { simulated: true, level: "shows_how" }, { level: "shows_how" });
  const p = c.competencyProgress("stu1").find((x) => x.id === "C1");
  assert.strictEqual(p.met, false, "simulated work must not mark a competency met by default");
  assert.strictEqual(p.evidence_accepted, 0, "it must not count as accepted evidence");
  assert.strictEqual(p.evidence_simulated, 1,
    "but it must still be VISIBLE — a student needs to see the work they did and see it not counting");
});

test("a department can turn simulated counting on, and it is then honoured", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { simulated: true, level: "shows_how" }, { level: "shows_how" });

  assert.strictEqual(c.competencyProgress("stu1").find((x) => x.id === "C1").met, false);
  c.competencySimulationCountsSet(true);
  const p = c.competencyProgress("stu1").find((x) => x.id === "C1");
  assert.strictEqual(p.met, true, "with the switch on, the same evidence counts");
  assert.strictEqual(p.simulated_counts, true, "and the progress row says which rule it was scored under");
});

test("real evidence counts regardless of the simulation setting", () => {
  for (const on of [false, true]) {
    const c = load();
    c.competencyFrameworkSet(FRAMEWORK);
    c.competencySimulationCountsSet(on);
    signed(c, "C1", { simulated: false, level: "shows_how" }, { level: "shows_how" });
    assert.strictEqual(c.competencyProgress("stu1").find((x) => x.id === "C1").met, true,
      `real evidence must count with the simulation switch ${on ? "on" : "off"}`);
  }
});

test("the logbook labels every entry as real or simulated, in words", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { simulated: true }, {});
  signed(c, "C2", { simulated: false }, {});

  const book = c.competencyLogbook("stu1");
  assert.strictEqual(book.entries.length, 2);
  /* Field-by-field, not deepStrictEqual: this object was constructed inside the
     VM realm, so its prototype is not this realm's Object.prototype and
     deepStrictEqual fails on identity even when every value matches. */
  assert.strictEqual(book.encounter_counts.real, 1,
    "the header must state the split so a reader who skims cannot miss it");
  assert.strictEqual(book.encounter_counts.simulated, 1);

  const sim = book.entries.find((e) => e.competency === "C1");
  const real = book.entries.find((e) => e.competency === "C2");
  assert.match(sim.encounter_type, /SIMULATED/,
    "spelled out in words — a boolean alone is too easy to skim past");
  assert.strictEqual(sim.simulated, true);
  assert.strictEqual(real.encounter_type, "real patient");
  assert.strictEqual(real.simulated, false);
});

test("the logbook and the review queue print labels, not storage ids", () => {
  /* An exported logbook is read by an examining body. "does · independent" is
     what the record stores; it is not English, and a document that reads like
     a database dump invites the reader to guess. */
  const c = load(undefined, { ui: true, supervise: true });
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { level: "does", supervision: "independent" }, { level: "does" });

  const e = c.competencyLogbook("stu1").entries[0];
  assert.strictEqual(e.level_agreed, "does", "the machine-readable id is still there");
  assert.strictEqual(e.level_agreed_label, "Does");
  assert.strictEqual(e.supervision_label, "Performed independently");

  c.competencyClaim("C2", { level: "shows_how", supervision: "assisted" });
  const queue = c.competencyReviewCard();
  assert.match(queue, /claims <b>Shows how<\/b> · Performed with help/);
  assert.ok(!/claims <b>shows_how/.test(queue), "no raw id may reach the screen");
});

test("an unknown level or supervision id falls back to itself, never to blank", () => {
  const c = load();
  assert.strictEqual(c.competencyLevelLabel("does"), "Does");
  assert.strictEqual(c.competencyLevelLabel("invented_level"), "invented_level",
    "a renamed or imported value must stay visible rather than disappearing");
  assert.strictEqual(c.competencySupervisionLabel(""), "");
});

test("the logbook records which scoring rule produced its numbers", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  c.competencySimulationCountsSet(true);
  assert.strictEqual(c.competencyLogbook("stu1").simulated_counts_towards_progress, true,
    "a summary of 'met' means nothing without the rule it was computed under");
});

test("the logbook still carries no patient identifiers", () => {
  /* Regression guard on the original design property, re-asserted because
     Phase 10 added fields to every entry. */
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { visit_id: "v-secret-123", patient_ref: "MRN-99", simulated: false }, {});
  const json = JSON.stringify(c.competencyLogbook("stu1"));
  assert.ok(!json.includes("v-secret-123"), "no visit id may leave in a logbook");
  assert.ok(!json.includes("MRN-99"), "no patient reference may leave in a logbook");
});

test("the simulation policy is classified, mirrored, backed up and restored", () => {
  const cls = require("../js/data-classification.js");
  const spec = cls.DATA_STORES.competency_sim_policy;
  assert.ok(spec, "the policy must be a declared store, not a stray key");
  assert.strictEqual(spec.mirror, true, "it must survive a cleared browser");
  assert.strictEqual(spec.backup, true, "it must travel with the evidence it governs");
  assert.strictEqual(spec.shape, "boolean");

  const backup = read("js/storage-backup.js");
  assert.match(backup, /typeof data\.competency_sim_policy === "boolean"/,
    "restore must use a typeof check — `false` is a real setting here, and a truthiness " +
    "test would silently drop it and re-score every restored logbook");
});


test("the summary buckets partition the framework exactly", () => {
  /* FOUND BY LOOKING AT A SCREENSHOT, not by reading the code. The student's
     header read "1 of 8 met · 1 in progress · 5 not started" — which is seven.
     A competency whose only signed-off evidence was simulated fell through
     every bucket and simply vanished from the count. A summary that silently
     loses a row is worse than one with an awkward extra category. */
  const c = load();
  c.competencyFrameworkSet({
    name: "F", items: [
      { id: "A", label: "met", level: "shows_how" },
      { id: "B", label: "in progress", level: "does" },
      { id: "C", label: "simulated only", level: "shows_how" },
      { id: "D", label: "awaiting", level: "shows_how" },
      { id: "E", label: "untouched", level: "shows_how" }
    ]
  });
  signed(c, "A", { simulated: false }, { level: "shows_how" });   /* met */
  signed(c, "B", { simulated: false }, { level: "knows" });       /* accepted, below target */
  signed(c, "C", { simulated: true },  { level: "shows_how" });   /* simulated only */
  c.competencyClaim("D", {});                                     /* awaiting sign-off */

  const s = c.competencySummary("stu1");
  assert.strictEqual(s.total, 5);
  assert.strictEqual(s.met, 1);
  assert.strictEqual(s.in_progress, 1);
  assert.strictEqual(s.simulated_only, 1,
    "signed-off simulated work must be its own visible category, not lost");
  assert.strictEqual(s.awaiting_only, 1);
  assert.strictEqual(s.not_started, 1);
  assert.strictEqual(s.met + s.in_progress + s.simulated_only + s.awaiting_only + s.not_started,
    s.total, "the four buckets must sum to the total — a student reads this as a whole");

  assert.strictEqual(s.pending_signoff, 1,
    "pending_signoff counts CLAIMS, not competencies, so it stays outside the partition");
});

test("the partition holds for an empty and an untouched framework", () => {
  const c = load();
  const empty = c.competencySummary("stu1");
  assert.strictEqual(empty.total, 0);
  assert.strictEqual(empty.met + empty.in_progress + empty.simulated_only +
    empty.awaiting_only + empty.not_started, 0);

  c.competencyFrameworkSet(FRAMEWORK);
  const fresh = c.competencySummary("stu1");
  assert.strictEqual(fresh.not_started, 2, "an untouched framework is entirely not-started");
  assert.strictEqual(fresh.met + fresh.in_progress + fresh.simulated_only +
    fresh.awaiting_only + fresh.not_started, fresh.total);
});

test("the progress header never prints a bucket that would not add up", () => {
  const c = load(undefined, { ui: true });
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { simulated: true }, { level: "shows_how" });
  const html = c.competencyProgressCard();
  assert.match(html, /simulated only/, "the simulated-only competency must be named in the header");
  assert.ok(!/0 awaiting sign-off/.test(html), "an empty bucket is noise, not information");
  assert.ok(!/entry is simulated, so they do not count/.test(html),
    "singular and plural must agree — this read 'entry is simulated and do not count'");
  assert.match(html, /1 signed-off entry is simulated, so it does not count/);
});


/* ═══ 2. STRUCTURED FEEDBACK ═════════════════════════════════════ */

test("feedback dimensions default to the built-in axes and are replaceable", () => {
  const c = load();
  assert.strictEqual(c.competencyFeedbackDimensions().length, c.COMPETENCY_FEEDBACK_DEFAULT.length);

  assert.strictEqual(c.competencyFeedbackDimensionsSet([]), false,
    "an empty list must be refused — it silently reverts supervisors to free text");
  assert.strictEqual(c.competencyFeedbackDimensionsSet(null), false);
  assert.strictEqual(c.competencyFeedbackDimensionsSet([{ id: "", label: "" }]), false,
    "entries with no id or label are not dimensions");

  assert.strictEqual(c.competencyFeedbackDimensionsSet(
    [{ id: "own", label: "Our own axis" }, { id: "junk" }]), true);
  const dims = c.competencyFeedbackDimensions();
  assert.strictEqual(dims.length, 1, "the malformed entry is dropped, the good one kept");
  assert.strictEqual(dims[0].id, "own");
});

test("sign-off keeps structured feedback alongside the free-text comment", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, {
    comment: "See you next week.",
    feedback: { ratings: { reasoning: "secure", communication: "concern" },
                strengths: "Clear explanation of the diagnosis",
                actions: ["Practise gonioscopy on five eyes"] }
  });
  const e = c.competencyLog()[0];
  assert.strictEqual(e.supervisor_comment, "See you next week.",
    "structured feedback must not replace the comment — a supervisor in a hurry still writes a sentence");
  assert.strictEqual(e.feedback.ratings.reasoning, "secure");
  assert.deepStrictEqual(e.feedback.actions, ["Practise gonioscopy on five eyes"]);
});

test("ratings against dimensions that do not exist are discarded", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  c.competencyFeedbackDimensionsSet([{ id: "reasoning", label: "Clinical reasoning" }]);
  signed(c, "C1", {}, {
    feedback: { ratings: { reasoning: "secure", communication: "concern", nonsense: "secure" } }
  });
  const r = c.competencyLog()[0].feedback.ratings;
  assert.deepStrictEqual(Object.keys(r), ["reasoning"],
    "an orphaned score would later read as a real assessment of something nobody rated");
});

test("an invalid rating value is discarded rather than stored", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "excellent" } } });
  const e = c.competencyLog()[0];
  assert.ok(!e.feedback, "a sign-off with nothing valid in it stores no feedback object at all");
});

test("feedback actions are capped so one sign-off cannot bury the rest", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { actions: ["a", "b", "c", "d", "e", "f", "g"] } });
  assert.strictEqual(c.competencyLog()[0].feedback.actions.length, 5);
});


/* ═══ 3. LONGITUDINAL FEEDBACK ═══════════════════════════════════ */

test("a single concern is not called recurring", () => {
  /* The judgement this encodes: one bad afternoon is not a persistent gap.
     Labelling it as one is unfair, and over time the label gets ignored. */
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "concern" } } });
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning");
  assert.strictEqual(t.concerns, 1);
  assert.strictEqual(t.recurring, false, "one flag is not a pattern");
});

test("two concerns on the same axis are recurring", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "concern" } } });
  signed(c, "C2", {}, { feedback: { ratings: { reasoning: "concern" } } });
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning");
  assert.strictEqual(t.recurring, true);
  assert.strictEqual(t.concerns, 2);
});

test("a trend is not claimed from too few data points", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "concern" } } });
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "secure" } } });
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning");
  assert.strictEqual(t.trend, "too few to say",
    "three ratings cannot support 'improving' — that would be noise presented as a finding");
});

test("a real improvement over enough encounters is reported as improving", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  for (const r of ["concern", "concern", "secure", "secure"]) {
    signed(c, "C1", {}, { feedback: { ratings: { reasoning: r } } });
  }
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning");
  assert.strictEqual(t.trend, "improving");
  assert.strictEqual(t.latest, "secure");
  assert.strictEqual(t.rated, 4);
});

test("a real decline is reported as declining, not softened", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  for (const r of ["secure", "secure", "concern", "concern"]) {
    signed(c, "C1", {}, { feedback: { ratings: { reasoning: r } } });
  }
  assert.strictEqual(
    c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning").trend, "declining");
});

test("an unrated dimension reports no evidence rather than a neutral score", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { ratings: { reasoning: "secure" } } });
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "communication");
  assert.strictEqual(t.rated, 0);
  assert.strictEqual(t.trend, "no evidence");
  assert.strictEqual(t.recurring, false);
});

test("declined and unsigned claims contribute no feedback", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { decision: "declined", feedback: { ratings: { reasoning: "concern" } } });
  c.competencyClaim("C2", {});   /* left pending */
  const t = c.competencyFeedbackTrend("stu1").find((x) => x.id === "reasoning");
  assert.strictEqual(t.rated, 0, "only accepted evidence carries assessed feedback");
});

test("improvement actions come back newest first and only for the right student", () => {
  const c = load();
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", {}, { feedback: { actions: ["older"] } });
  signed(c, "C2", {}, { feedback: { actions: ["newer"] } });

  c.CU = { username: "stu2", name: "Student Two" };
  signed(c, "C1", {}, { feedback: { actions: ["someone else's"] } });

  const mine = c.competencyActions("stu1").map((a) => a.action);
  assert.ok(!mine.includes("someone else's"), "another student's actions must never appear");
  assert.strictEqual(mine.length, 2);
  assert.strictEqual(mine[0], "newer", "newest first — a student reads the top of this list");
  assert.strictEqual(c.competencyActions("stu1")[0].by, "Dr Supervisor",
    "an action is only actionable if the student knows who asked for it");
});


/* ═══ 4. THE INTERFACE — the thing that was missing entirely ═════ */

test("the competency logic is actually reachable from the app", () => {
  /* The Phase 10 headline finding, pinned so it cannot silently regress:
     16 passing tests over a feature with no call sites. */
  const html = read("index.html");
  assert.match(html, /js\/ui-competency\.js/, "the UI must be loaded by the page");
  assert.ok(html.indexOf("js/competency.js") < html.indexOf("js/ui-competency.js"),
    "the logic must load before its interface");

  const app = read("js/app.js");
  assert.match(app, /competencyStudyCard\(\)/, "the student surface must be rendered");
  assert.match(app, /competencyTeachingCard\(\)/, "the supervisor surface must be rendered");
  assert.match(read("js/ui-chart.js"), /competencyClaimCard\(/,
    "a student must be able to claim evidence from a completed encounter");
});

test("the claim card stays out of the way until a framework is imported", () => {
  const c = load(undefined, { ui: true });
  assert.strictEqual(c.competencyClaimCard("v1", false), "",
    "a practitioner who will never use competencies must not see this on a clinical record");
  c.competencyFrameworkSet(FRAMEWORK);
  assert.match(c.competencyClaimCard("v1", false), /Record competency evidence/);
});

test("the claim card warns, before the student fills it in, that a case is simulated", () => {
  const c = load(undefined, { ui: true });
  c.competencyFrameworkSet(FRAMEWORK);
  const html = c.competencyClaimCard("v1", true);
  assert.match(html, /simulated case/i);
  assert.match(html, /will not count/i,
    "the consequence must be stated up front, not discovered later in the logbook");
  assert.ok(!/simulated case/i.test(c.competencyClaimCard("v1", false)),
    "a real encounter must not be labelled simulated");
});

test("an encounter is treated as simulated when it cannot be identified", () => {
  const c = load(undefined, { ui: true });
  assert.strictEqual(c.competencyVisitIsSimulated({ sim: true }, null), true);
  assert.strictEqual(c.competencyVisitIsSimulated(null, { practice: true }), true,
    "a practice patient is a learning artifact too");
  assert.strictEqual(c.competencyVisitIsSimulated({ id: "v" }, { id: "p" }), false);
  assert.strictEqual(c.competencyVisitIsSimulated(null, null), true,
    "fails towards SIMULATED: mislabelling real work is an annoyance, mislabelling " +
    "simulated work puts a false claim of clinical experience before an examiner");
});

test("`supervise` is a capability roles.js actually declares", () => {
  /* THIS TEST EXISTS BECAUSE THE FIRST VERSION SHIPPED BROKEN.
     ui-competency.js called can("supervise"), but "supervise" was not in
     ROLE_CAPS at all — roleShowsCap returns false for an undeclared capability,
     so the sign-off queue was invisible to every non-admin account. The unit
     tests below pass a STUBBED can(), which is exactly why they did not catch
     it; a real browser run did. This asserts against the real table. */
  const roles = require("../js/roles.js");
  const caps = roles.ROLE_CAPS || {};
  assert.ok(Object.keys(caps).length, "sanity: the role table loaded");
  for (const role of Object.keys(caps)) {
    assert.ok("supervise" in caps[role],
      `role "${role}" does not declare supervise — an undeclared capability is ` +
      `silently false, which hides the control rather than denying it`);
  }
  assert.strictEqual(!!caps.faculty.supervise, true, "faculty supervise");
  assert.strictEqual(!!caps.clinician.supervise, true,
    "on a practice placement the supervisor is a registered optometrist, not university staff");
  assert.strictEqual(!!caps.student.supervise, false, "a student may not sign off their own work");
});

test("the sign-off queue is hidden from an account that cannot supervise", () => {
  const c = load(undefined, { ui: true, supervise: false });
  c.competencyFrameworkSet(FRAMEWORK);
  c.competencyClaim("C1", {});
  assert.strictEqual(c.competencyMaySupervise(), false);
  assert.strictEqual(c.competencyReviewCard(), "", "a student must not see the sign-off controls");

  const s = load(undefined, { ui: true, supervise: true });
  s.competencyFrameworkSet(FRAMEWORK);
  s.competencyClaim("C1", {});
  assert.match(s.competencyReviewCard(), /1 waiting/);
});

test("the interface says its authorization is not a security boundary", () => {
  /* ADR-010: this is client-side only. The comment is load-bearing — a future
     session must not read the role check as enforcement. */
  const src = read("js/ui-competency.js");
  assert.match(src, /CLIENT-SIDE ONLY/);
  assert.match(src, /ADR-010/);
});

test("the setup card refuses to imply Entopic ships a standard", () => {
  const c = load(undefined, { ui: true, supervise: true });
  const html = c.competencySetupCard();
  assert.match(html, /deliberately ships none/i);
  assert.match(html, /Import your department's own/i);
  assert.match(html, /Download a blank template/,
    "faculty need the shape without being handed invented content");
});

test("a student is not offered the framework import", () => {
  const c = load(undefined, { ui: true, supervise: false });
  const html = c.competencySetupCard();
  assert.match(html, /Ask your course lead/,
    "a student silently importing their own framework would make the record meaningless");
  assert.ok(!/competencyUiImport\(\)/.test(html));
});

test("the blank template carries no competency content", () => {
  /* A template pre-filled with plausible-looking competencies is exactly how an
     invented standard gets adopted by accident. */
  const src = read("js/ui-competency.js");
  const tpl = src.slice(src.indexOf("function competencyUiTemplate"),
                        src.indexOf("function competencyUiImport"));
  assert.match(tpl, /items:\s*\[\]/, "the template's items array must ship empty");
  assert.match(tpl, /cannot be\s*\n?\s*"?\s*\+?\s*"?imported while `items` is empty/,
    "and must say so, since competencyFrameworkSet rejects it");
});

test("hostile text in an imported framework cannot inject markup", () => {
  /* A framework arrives as a JSON file from outside this device — the same
     trust level as a published KB bundle, which is where the escaping bug in
     dom-escape.js's header came from. */
  const c = load(undefined, { ui: true, supervise: true });
  c.competencyFrameworkSet({
    name: '<img src=x onerror="alert(1)">', version: "1",
    items: [{ id: 'C"1', label: '<script>alert(1)</script>', domain: '" onmouseover="x', level: "shows_how" }]
  });
  const html = c.competencyClaimCard("v1", false) + c.competencySetupCard();
  assert.ok(!html.includes("<script>"), "a script tag must not survive into the DOM");
  assert.ok(!html.includes('onerror="'), "no event handler may be injected");
  assert.ok(!html.includes('onmouseover="x'), "an attribute break-out must not be possible");
  assert.match(html, /&lt;script&gt;/, "it must appear as visible text instead");
});

test("a hostile claim id cannot break out of the review button's handler", () => {
  const c = load(undefined, { ui: true, supervise: true });
  c.competencyFrameworkSet(FRAMEWORK);
  const claim = c.competencyClaim("C1", {});
  const log = c.competencyLog();
  log[0].id = "x');alert(1);//";
  c.saveStore("competency_log", log);

  const html = c.competencyReviewCard();
  /* The unescaped break-out and the escaped rendering differ only by ONE
     backslash, so a naive `!includes("');alert(1)")` passes on both — the
     escaped form contains that substring too. Assert on the exact handler
     text instead: the closing quote must be preceded by a backslash. */
  assert.ok(!html.includes("competencyUiOpen('x');"),
    "an unescaped quote would close the JS string and run alert(1)");
  assert.ok(html.includes("competencyUiOpen('x\\');alert(1);//'"),
    "the quote must be backslash-escaped inside the handler, not stripped");
  assert.ok(claim, "sanity: the claim was created");
});

test("the student surface shows progress, feedback and an export in one place", () => {
  const c = load(undefined, { ui: true });
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { simulated: false }, { level: "shows_how", feedback: { actions: ["Read up on fields"] } });
  const html = c.competencyStudyCard();
  assert.match(html, /My competencies/);
  assert.match(html, /Read up on fields/, "the feedback card must be part of the student surface");
  assert.match(html, /Export my logbook/);
});

test("the student surface says plainly that simulated entries are not counting", () => {
  const c = load(undefined, { ui: true });
  c.competencyFrameworkSet(FRAMEWORK);
  signed(c, "C1", { simulated: true }, { level: "shows_how" });
  const html = c.competencyProgressCard();
  assert.match(html, /simulated/i);
  assert.match(html, /does not count|do not count/i,
    "a student seeing '0 met' after signed-off work needs to know why");
  assert.match(html, /1 simulated \(not counted\)/,
    "and the row itself must say it, not only the header");
});

test("no pass mark, weighting or progression rule is invented anywhere", () => {
  /* The constraint Phase 10 states outright: where a standard needs domain
     confirmation, build a configurable structure, not a fabricated rule. */
  const src = read("js/competency.js") + read("js/ui-competency.js");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/pass_?mark|passMark|minimum_cases|min_cases|required_count|weighting/i.test(code),
    "no institutional threshold may be hard-coded");
  assert.ok(!/NCAHP|ASCO\b|OCANZ|GOC\b|ACOE/i.test(code),
    "no real accreditation body's standard may be named as if implemented");
});
