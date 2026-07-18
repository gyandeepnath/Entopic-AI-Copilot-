/* ═══════════════════════════════════════════════════════════════ */
/* REASONING VIEWS — SOAP note + de-identified casebook            */
/*                                                                  */
/* Verifies the display-only view layer (js/reasoning-views.js):    */
/*   • the note is a faithful projection of the ENGINE's output     */
/*     (leading dx + evidence trail + red-flag alerts + advisory);  */
/*   • ANTI-FABRICATION: fields never entered are never rendered as */
/*     assumed normals;                                             */
/*   • de-identification strips PII before a case can be stored;    */
/*   • the view layer never mutates engine output (firewall).       */
/*                                                                  */
/* These run the REAL engine (via load-engine) and the REAL view    */
/* code loaded into the same sandbox — no reimplementation.         */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { createEngine } = require("../tools/lib/load-engine");

const eng = createEngine();
/* Load the view layer into the SAME context the engine runs in, so it
   reads the real V / P / ENGINE_STATE globals. document is undefined here,
   so the browser DOM-wiring block is skipped (as intended). */
vm.runInContext(
  fs.readFileSync(path.resolve(__dirname, "..", "js", "reasoning-views.js"), "utf8"),
  eng.context,
  { filename: "js/reasoning-views.js" }
);

/* Run a case, then render the SOAP note string from the resulting state. */
function noteFor(visit, patient) {
  eng.runCase(visit || {}, patient || {});
  return vm.runInContext("stateToNoteText(buildExamState())", eng.context);
}
function stateFor(visit, patient) {
  eng.runCase(visit || {}, patient || {});
  return vm.runInContext("buildExamState()", eng.context);
}
function evalIn(expr) {
  return vm.runInContext(expr, eng.context);
}


/* ═══ The note is a faithful projection of the engine ═══ */

test("SOAP note carries the engine's leading dx, its evidence trail, and the advisory banner", () => {
  const note = noteFor({
    symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"],
    iop: { od: "48", os: "16" }
  }, { first_name: "Test", last_name: "Patient" });

  assert.ok(/CLINICAL NOTE \(SOAP\)/.test(note), "note has a header");
  assert.ok(/A — ASSESSMENT/.test(note), "note has an assessment section");
  assert.ok(/Acute Angle Closure/.test(note), "leading engine dx appears in the note");
  assert.ok(/supported by:/.test(note), "evidence trail (why) is shown, not just the label");
  assert.ok(/require clinical correlation/i.test(note), "advisory framing is stamped on the note");
});

test("red-flag alerts surface in the note and are placed before the assessment", () => {
  const note = noteFor({ iop: { od: "48", os: "16" } });
  assert.ok(/SAFETY ALERTS/.test(note), "safety alert section present");
  assert.ok(/critically elevated/i.test(note), "the IOP red flag is in the note");
  assert.ok(note.indexOf("SAFETY ALERTS") < note.indexOf("A — ASSESSMENT"),
    "safety alerts appear before the assessment (never buried)");
});

test("IOP > 40 alert still appears in the note amid unrelated dry-eye evidence (un-suppressible)", () => {
  const note = noteFor({
    symptoms: ["dryness", "burning", "grittiness"],
    iop: { od: "44", os: "18" }
  });
  assert.ok(/critically elevated/i.test(note), "red flag is not suppressed by other findings");
});


/* ═══ ANTI-FABRICATION: never document what was not examined ═══ */

test("a sparse encounter renders no assumed 'normal' findings", () => {
  /* Only a chief complaint + one symptom entered. The blankVisit()
     defaults (WNL / White and quiet / Clear cornea / ISNT / foveal reflex)
     must NOT appear — they were never actually examined. */
  const note = noteFor({ cc: "watering for two days", symptoms: ["watering"] });

  assert.ok(!/WNL/.test(note), "default lid 'WNL' not fabricated");
  assert.ok(!/White and quiet/.test(note), "default conj not fabricated");
  assert.ok(!/ISNT preserved/.test(note), "default disc not fabricated");
  assert.ok(!/foveal reflex/i.test(note), "default macula not fabricated");
  assert.ok(!/O — OBJECTIVE/.test(note) || !/cornea/i.test(note.split("O — OBJECTIVE")[1].split("A — ASSESSMENT")[0]),
    "no cornea line when the cornea was never recorded");
});

test("entered findings DO appear; unentered ones do not", () => {
  const note = noteFor({ iop: { od: "22", os: "21" }, sl: { findings: ["Corneal ulcer"] } });
  assert.ok(/IOP/.test(note) && /22/.test(note), "entered IOP is documented");
  assert.ok(/Corneal ulcer/.test(note), "entered anterior finding is documented");
  assert.ok(!/Refraction/.test(note), "refraction not documented — none entered");
  assert.ok(!/C\/D/.test(note), "cup:disc not documented — none entered");
});


/* ═══ DE-IDENTIFICATION (Move 4) ═══ */

test("de-identified note removes patient name/MRN and labels itself a teaching case", () => {
  const deidNote = evalIn(
    "stateToNoteText(deidentifyState(buildExamState()))"
  );
  /* buildExamState reads the P set by the previous runCase; set a named one: */
  eng.runCase(
    { cc: "John says his vision is blurry", symptoms: ["reduced_vision"] },
    { first_name: "John", last_name: "Smith", mrn: "MRN-0007", age: "54", sex: "Male" }
  );
  const idNote = evalIn("stateToNoteText(buildExamState())");
  const teachNote = evalIn("stateToNoteText(deidentifyState(buildExamState()))");

  assert.ok(/John/.test(idNote) && /Smith/.test(idNote), "identified note contains the name");
  assert.ok(/MRN-0007/.test(idNote), "identified note contains the MRN");

  assert.ok(!/John/.test(teachNote), "name scrubbed from de-identified note (incl. free text)");
  assert.ok(!/Smith/.test(teachNote), "surname scrubbed from de-identified note");
  assert.ok(!/MRN-0007/.test(teachNote), "MRN removed from de-identified note");
  assert.ok(/De-identified teaching case/.test(teachNote), "de-identified note is labelled as such");
  assert.ok(/Age: 54/.test(teachNote), "clinical age retained (teaching value)");
});

test("age over 89 is capped to 90+ in a teaching case", () => {
  eng.runCase({ symptoms: ["reduced_vision"] }, { age: "93", sex: "Female" });
  const s = evalIn("deidentifyState(buildExamState())");
  assert.strictEqual(s.patient.age, "90+");
  assert.strictEqual(s.patient.name, "");
  assert.strictEqual(s.deidentified, true);
});


/* ═══ CASEBOOK build (de-identified before storage) ═══ */

test("buildCase() produces a de-identified entry with a teaching note and a title", () => {
  eng.runCase(
    { symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"], iop: { od: "48", os: "16" } },
    { first_name: "Ada", last_name: "Lovelace", mrn: "MRN-1815" }
  );
  const entry = evalIn("buildCase('Check the fellow eye — bilateral risk in angle closure.')");

  assert.ok(entry.id && /^case_/.test(entry.id), "entry has an id");
  assert.strictEqual(entry.state.patient.name, "", "no name stored in the case");
  assert.strictEqual(entry.state.patient.mrn, "", "no MRN stored in the case");
  assert.strictEqual(entry.state.deidentified, true, "stored state is flagged de-identified");
  assert.ok(entry.teachingNote.length > 0, "teaching note captured");
  assert.ok(/Acute Angle Closure/.test(entry.title), "title reflects the leading impression");
});


/* ═══ FIREWALL: the view layer must not mutate engine output ═══ */

test("buildExamState() does not alter V.dxList / V.alerts (display-only)", () => {
  const out = eng.runCase({
    symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"],
    iop: { od: "48", os: "16" }
  });
  const dxBefore = out.dxList.length;
  const alertsBefore = out.alerts.length;
  evalIn("buildExamState()");
  evalIn("stateToNoteText(buildExamState())");
  assert.strictEqual(out.dxList.length, dxBefore, "dxList unchanged by rendering");
  assert.strictEqual(out.alerts.length, alertsBefore, "alerts unchanged by rendering");
});


/* ═══ Empty encounter degrades gracefully ═══ */

test("empty visit produces a valid note with no fabricated content", () => {
  const note = noteFor({});
  assert.ok(/CLINICAL NOTE \(SOAP\)/.test(note), "still a well-formed note");
  assert.ok(/insufficient clinical evidence/i.test(note), "assessment states there is nothing yet");
  assert.ok(!/WNL|ISNT|White and quiet/.test(note), "nothing fabricated");
});


/* ═══ CASEBOOK organisation: group by condition, filter by facets ═══ */

/* Build a small in-context casebook of distinct cases. */
function seedCasebook() {
  evalIn("globalThis.__cases = []");
  eng.runCase({ symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"], iop: { od: "48", os: "16" } });
  evalIn("__cases.push(buildCase('angle closure — check the fellow eye'))");
  eng.runCase({ symptoms: ["flashes", "floaters"], temporal: { onset: "sudden_onset" } });
  evalIn("__cases.push(buildCase('acute PVD vs tear'))");
  eng.runCase({ sl: { findings: ["Hypopyon"] } });
  evalIn("__cases.push(buildCase('hypopyon — sight-threatening'))");
  return evalIn("__cases.length");
}

test("assessment snapshot carries the specialty domain (for grouping/filtering)", () => {
  eng.runCase({ symptoms: ["pain_severe", "halos", "vomiting", "reduced_vision"], iop: { od: "48", os: "16" } });
  const dom = evalIn("(buildExamState().assessment[0]||{}).domain");
  assert.strictEqual(typeof dom, "string");
  assert.ok(dom.length > 0, "leading dx carries a domain");
});

test("casebookEntryTokens exposes conditions, domains and tokens for an entry", () => {
  seedCasebook();
  const f = evalIn("casebookEntryTokens(__cases[0])");
  assert.ok(f.conditions.length > 0, "conditions extracted");
  assert.ok(f.domains.length > 0, "domain extracted");
  assert.ok(f.tokens.length > 0, "engine tokens extracted");
  assert.ok(/acute angle closure/.test(f.text), "searchable text includes the condition");
});

test("casebook groups by leading condition", () => {
  const total = seedCasebook();
  const groups = evalIn("casebookGroupByCondition(__cases)");
  assert.ok(groups.length >= 1 && groups.length <= total, "grouped, not one-per-nothing");
  /* every entry in a group shares that group's condition title */
  const okTitles = evalIn(
    "casebookGroupByCondition(__cases).every(function(g){return g.entries.every(function(e){return e.title===g.condition;});})"
  );
  assert.strictEqual(okTitles, true);
});

test("casebook filters by search term (condition or sign)", () => {
  seedCasebook();
  assert.ok(evalIn("casebookFilter(__cases,{search:'angle closure'}).length") >= 1, "search by condition name");
  assert.ok(evalIn("casebookFilter(__cases,{search:'hypopyon'}).length") >= 1, "search by a sign/token");
  assert.strictEqual(evalIn("casebookFilter(__cases,{search:'zzz-no-such-thing'}).length"), 0, "no false matches");
});

test("casebook filters by domain facet, and facets aggregate counts", () => {
  const total = seedCasebook();
  const facets = evalIn("casebookFacets(__cases)");
  const domainKeys = Object.keys(facets.domains);
  assert.ok(domainKeys.length >= 1, "at least one domain facet");
  const k = domainKeys[0];
  const n = evalIn("casebookFilter(__cases,{domain:'" + k + "'}).length");
  assert.ok(n >= 1 && n <= total, "domain filter returns a valid subset");
  assert.ok(Object.keys(facets.tokens).length > 0, "token facets aggregated");
});

test("casebookHomeSummary returns a human string", () => {
  const s = evalIn("casebookHomeSummary()");
  assert.strictEqual(typeof s, "string");
  assert.ok(s.length > 0);
});


/* ═══ FACULTY CURATION: annotate + reviewed sign-off ═══ */

test("casebookAdd persists (mem store), casebookAnnotate updates the teaching note", () => {
  evalIn("casebookSave([])");
  eng.runCase({ sl: { findings: ["Hypopyon"] } });
  const id = evalIn("casebookAdd('first note').id");
  assert.strictEqual(evalIn("casebookLoad().length"), 1, "case persisted");
  const updated = evalIn("casebookAnnotate('" + id + "', 'sharper teaching point')");
  assert.strictEqual(updated.teachingNote, "sharper teaching point");
  assert.ok(updated.annotatedAt, "annotation is timestamped");
  assert.strictEqual(evalIn("casebookLoad()[0].teachingNote"), "sharper teaching point", "persisted");
});

test("casebookSetReviewed toggles the faculty sign-off", () => {
  evalIn("casebookSave([])");
  eng.runCase({ sl: { findings: ["Hypopyon"] } });
  const id = evalIn("casebookAdd('to review').id");
  let e = evalIn("casebookSetReviewed('" + id + "', true)");
  assert.strictEqual(e.reviewed, true);
  assert.ok(e.reviewedAt, "sign-off is timestamped");
  e = evalIn("casebookSetReviewed('" + id + "', false)");
  assert.strictEqual(e.reviewed, false);
  assert.strictEqual(e.reviewedAt, null);
});

test("annotate/review on a missing id returns null and changes nothing", () => {
  evalIn("casebookSave([])");
  assert.strictEqual(evalIn("casebookAnnotate('nope', 'x')"), null);
  assert.strictEqual(evalIn("casebookSetReviewed('nope', true)"), null);
  assert.strictEqual(evalIn("casebookLoad().length"), 0);
});
