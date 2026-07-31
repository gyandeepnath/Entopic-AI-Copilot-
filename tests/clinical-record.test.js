/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL RECORD INTEGRITY                                        */
/*   • attribution + amendment trail (CL-3)                         */
/*   • duplicate patient detection  (CL-4)                          */
/*   • the continuous clinical record                               */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const R = require("../js/clinical-record.js");

/* ── attribution + amendments ─────────────────────────────────────── */

test("the first save records who wrote the note and when", () => {
  const v = { id: "v1", date: "2026-07-30T09:00:00Z" };
  R.recStampVisit(v, { id: "u1", name: "Dr Nair" }, "2026-07-30T09:05:00Z");
  assert.strictEqual(v.authored_by, "Dr Nair");
  assert.strictEqual(v.entries.length, 1);
  assert.strictEqual(v.entries[0].kind, "created");
  assert.strictEqual(R.recIsAmended(v), false, "writing a note is not amending it");
});

test("repeated saves during the same sitting do NOT spam the trail", () => {
  const v = { id: "v1", date: "2026-07-30T09:00:00Z" };
  const u = { id: "u1", name: "Dr Nair" };
  for (let i = 0; i < 40; i++) R.recStampVisit(v, u, "2026-07-30T09:" + String(10 + i).padStart(2, "0") + ":00Z");
  assert.strictEqual(v.entries.length, 1, "one consultation is one entry, not forty");
  assert.strictEqual(R.recIsAmended(v), false);
  assert.ok(v.updated > v.authored_at, "but the timestamp still moves");
});

test("editing on a LATER DAY is recorded as an amendment", () => {
  const v = { id: "v1", date: "2026-07-30T09:00:00Z" };
  const u = { id: "u1", name: "Dr Nair" };
  R.recStampVisit(v, u, "2026-07-30T09:05:00Z");
  R.recStampVisit(v, u, "2026-08-04T11:00:00Z");

  assert.strictEqual(R.recIsAmended(v), true, "a record changed days later is not contemporaneous");
  const am = R.recAmendments(v);
  assert.strictEqual(am.length, 1);
  assert.strictEqual(am[0].by, "Dr Nair");
  assert.ok(/later day/.test(am[0].note));
});

test("editing by ANOTHER clinician is recorded as an amendment, same day or not", () => {
  const v = { id: "v1", date: "2026-07-30T09:00:00Z" };
  R.recStampVisit(v, { id: "u1", name: "Dr Nair" }, "2026-07-30T09:05:00Z");
  R.recStampVisit(v, { id: "u2", name: "Dr Rao" }, "2026-07-30T16:00:00Z");
  const am = R.recAmendments(v);
  assert.strictEqual(am.length, 1);
  assert.strictEqual(am[0].by, "Dr Rao");
  assert.ok(/another clinician/.test(am[0].note));
  assert.strictEqual(v.authored_by, "Dr Nair", "the original author is never overwritten");
});

test("a second clinician's continued editing does not create one entry per keystroke", () => {
  const v = { id: "v1", date: "2026-07-30T09:00:00Z" };
  R.recStampVisit(v, { id: "u1", name: "Dr Nair" }, "2026-07-30T09:05:00Z");
  for (let i = 0; i < 20; i++) R.recStampVisit(v, { id: "u2", name: "Dr Rao" }, "2026-08-01T10:" + String(10 + i).padStart(2, "0") + ":00Z");
  assert.strictEqual(R.recAmendments(v).length, 1, "one amending session, one entry");
});


/* ── duplicate detection ──────────────────────────────────────────── */

const EXISTING = [
  { id: "p1", first_name: "Meera", last_name: "Nair", dob: "1978-04-02", mrn: "EP-001", phone: "+91 98765 43210", age: "48" },
  { id: "p2", first_name: "Arun",  last_name: "Das",  dob: "1990-11-19", mrn: "EP-002", phone: "9000000001", age: "35" },
  { id: "p3", first_name: "Sunil", last_name: "Rao",  dob: "",           mrn: "EP-003", phone: "",           age: "60" },
  { id: "p9", first_name: "Meera", last_name: "Nair", dob: "1978-04-02", mrn: "PR-9", practice: true, age: "48" }
];

test("the same person re-registered is caught on name + date of birth", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Meera", last_name: "Nair", dob: "1978-04-02" }, EXISTING);
  assert.ok(d.length >= 1);
  assert.strictEqual(d[0].id, "p1");
  assert.strictEqual(d[0].level, "likely");
  assert.ok(/date of birth/.test(d[0].reasons[0]), "and the clinician is told WHY");
});

test("name order and punctuation do not defeat the check", () => {
  /* a registration desk will type "Nair, Meera" as readily as "Meera Nair" */
  const d = R.recFindDuplicates({ id: "new", first_name: "NAIR,", last_name: "meera", dob: "1978-04-02" }, EXISTING);
  assert.strictEqual(d[0] && d[0].id, "p1");
});

test("phone formatting does not defeat the check", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Meera", last_name: "Nair", phone: "09876543210" }, EXISTING);
  assert.strictEqual(d[0].id, "p1");
  assert.strictEqual(d[0].level, "likely", "same name + same number");
});

test("a shared family phone is flagged as POSSIBLE, not likely — it is often a relative", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Ravi", last_name: "Nair", phone: "9876543210" }, EXISTING);
  assert.strictEqual(d[0].id, "p1");
  assert.strictEqual(d[0].level, "possible");
  assert.ok(/family member/.test(d[0].reasons[0]), "and says so, so the clinician is not misled");
});

test("an identical MRN is reported as CERTAIN", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Someone", last_name: "Else", mrn: "ep-001" }, EXISTING);
  assert.strictEqual(d[0].level, "certain");
});

test("a genuinely different patient produces NO false match", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Priya", last_name: "Sharma", dob: "2001-01-01", phone: "9111111111" }, EXISTING);
  assert.deepStrictEqual(d, [], "a new patient must register without friction");
});

test("real records are never matched against practice/teaching records", () => {
  const d = R.recFindDuplicates({ id: "new", first_name: "Meera", last_name: "Nair", dob: "1978-04-02" }, EXISTING);
  assert.ok(!d.some((x) => x.id === "p9"), "a student's practice case is not a duplicate of a real patient");
});

test("matches are ordered strongest first", () => {
  const many = EXISTING.concat([{ id: "p8", first_name: "Meera", last_name: "Nair", mrn: "EP-777", age: "48" }]);
  const d = R.recFindDuplicates({ id: "new", first_name: "Meera", last_name: "Nair", dob: "1978-04-02", age: "48" }, many);
  assert.strictEqual(d[0].level, "likely", "the strongest evidence is presented first");
});


/* ── the continuous record ────────────────────────────────────────── */

const VISITS = [
  { id: "v1", patient_id: "pA", date: "2026-01-10T09:00:00Z", visit_type: "initial", status: "completed",
    authored_by: "Dr Nair", authored_at: "2026-01-10T09:00:00Z", entries: [{ kind: "created", at: "2026-01-10T09:00:00Z", by: "Dr Nair" }],
    data: { cc: "Blurred vision", symptoms: ["dryness"], iop: { od: "16", os: "15" },
            fun: { od: { cd: "0.4" }, os: { cd: "0.4" } },
            engine_provenance: { kb_version: "1.1.0", shown_top: [{ name: "Dry Eye Disease", prob: 0.84 }] },
            plan: { mgmt: "Lubricants", followup: "3 months" } } },
  { id: "v2", patient_id: "pA", date: "2026-04-14T10:00:00Z", visit_type: "follow_up", status: "completed",
    authored_by: "Dr Rao", authored_at: "2026-04-14T10:00:00Z",
    entries: [{ kind: "created", at: "2026-04-14T10:00:00Z", by: "Dr Rao" },
              { kind: "amended", at: "2026-04-20T08:00:00Z", by: "Dr Nair", note: "edited by another clinician" }],
    data: { iop: { od: "34", os: "31" }, pupil: { rapd: "OD 1+" },
            alerts: [{ l: "urgent", m: "IOP significantly elevated (>30 mmHg) — urgent assessment" }] } },
  { id: "vX", patient_id: "pB", date: "2026-02-01T09:00:00Z", data: {} }
];

test("the record is one chronological narrative for THAT patient only", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  assert.strictEqual(rec.length, 2, "another patient's visit is not included");
  assert.strictEqual(rec[0].type, "Initial");
  assert.strictEqual(rec[1].type, "Follow-up");
  assert.ok(rec[0].date < rec[1].date, "oldest first — the order a chart is read in");
});

test("the interval between consecutive visits is stated", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  assert.strictEqual(rec[0].gap_days, null, "there is no gap before the first visit");
  assert.strictEqual(rec[1].gap_days, 94, "94 days between visits is clinical context");
});

test("each entry carries its clinician and an amendment is declared", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  assert.strictEqual(rec[0].author, "Dr Nair");
  assert.strictEqual(rec[0].amended, false);
  assert.strictEqual(rec[1].author, "Dr Rao");
  assert.strictEqual(rec[1].amended, true, "a later edit must never read as contemporaneous");
  assert.strictEqual(rec[1].amendments[0].by, "Dr Nair");
});

test("NORMAL findings are recorded, not only abnormal ones", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  const iop = rec[0].sections.find((s) => s.label === "IOP");
  assert.ok(iop, "a normal IOP still appears — 'checked and normal' is a clinical statement");
  assert.strictEqual(iop.flag, "normal");
  assert.ok(/16/.test(iop.value) && /15/.test(iop.value));
});

test("abnormal values are flagged, and red flags are carried into the record", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  const iop = rec[1].sections.find((s) => s.label === "IOP");
  assert.strictEqual(iop.flag, "abnormal", "IOP 34 is not filed as routine");
  assert.ok(rec[1].sections.some((s) => s.flag === "urgent"), "the red flag that fired is part of the record");
  assert.ok(rec[1].sections.some((s) => s.label === "RAPD"), "and so is the RAPD");
});

test("the impression is shown AS IT WAS at the time, from provenance", () => {
  const rec = R.recBuildContinuous("pA", VISITS);
  const imp = rec[0].sections.find((s) => /as shown/.test(s.label));
  assert.ok(imp, "the differential is recorded as presented, not recomputed today");
  assert.ok(/Dry Eye Disease/.test(imp.value) && /84%/.test(imp.value));
  assert.strictEqual(rec[0].kb_version, "1.1.0", "with the knowledge base that produced it");
});

test("an empty visit produces an entry with no invented content", () => {
  const rec = R.recBuildContinuous("pB", VISITS);
  assert.strictEqual(rec.length, 1);
  assert.strictEqual(rec[0].sections.length, 0, "nothing recorded means nothing shown");
});
