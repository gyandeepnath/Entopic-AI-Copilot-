/* ═══════════════════════════════════════════════════════════════ */
/* CONSENT · CORPUS · INSIGHTS                                      */
/*                                                                  */
/* The properties that decide whether this data is an asset or a    */
/* liability:                                                       */
/*                                                                  */
/*  1. Nothing enters the corpus without an explicit, current       */
/*     consent. Silence is refusal.                                 */
/*  2. Withdrawal actually removes the data.                        */
/*  3. No identifier survives de-identification.                    */
/*  4. Figures carry denominators and suppress small cells.         */
/*  5. It stays within the device's storage budget at real scale.   */
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
  const disk = {};
  const audit = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat,
    __disk: disk, __audit: audit,
    APP_VERSION: "1.2.0", KB_VERSION: "1.2.0",
    logAudit: (k, m, meta) => audit.push({ k, m, meta }),
    loadStore: (k, fb) => (Object.prototype.hasOwnProperty.call(disk, k) ? JSON.parse(disk[k]) : fb),
    saveStore: (k, v) => { disk[k] = JSON.stringify(v); return true; }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/consent.js"), ctx, { filename: "consent.js" });
  vm.runInContext(read("js/research-corpus.js"), ctx, { filename: "research-corpus.js" });
  vm.runInContext(read("js/insights.js"), ctx, { filename: "insights.js" });
  return ctx;
}
const run = (ctx, expr, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(expr, ctx); };

function patient(id, over) {
  return Object.assign({ id: id, first_name: "Meera", last_name: "Nair",
    dob: "1978-04-02", mrn: "MRN-4471", phone: "9876543210", age: 47, sex: "F" }, over || {});
}
function visit(id, over) {
  return Object.assign({
    id: id, date: "2026-07-15T10:00:00.000Z",
    symptoms: ["dryness", "burning"],
    sl: { findings: [{ label: "Tear film instability", eye: "OU" }] },
    fun: { findings: [] },
    dxList: [{ n: "Dry Eye Disease", prob: 0.72, icd: "H04.123", urgent: false },
             { n: "Blepharitis", prob: 0.31, icd: "H01.00", urgent: false }],
    alerts: [], plan: { ref_to: "", ref_urgency: "" },
    notes: "Patient Meera Nair reports discomfort since 2026-01-02"
  }, over || {});
}


/* ═══ 1. Consent gates everything ═══ */

test("no consent means no capture — silence is refusal, not permission", () => {
  const ctx = device();
  const res = run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.reason, "no-consent");
  assert.strictEqual(run(ctx, "corpusStats().total"), 0);
});

test("an explicit grant lets the encounter in", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  const res = run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(run(ctx, "corpusStats().total"), 1);
});

test("a refusal blocks capture, and so does a withdrawal", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','refused','Dr Nath')");
  assert.strictEqual(run(ctx, "corpusCapture(__v, __p)",
    { __v: visit("v1"), __p: patient("p1") }).reason, "no-consent");

  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  run(ctx, "consentSet('p1','research_secondary','withdrawn','Dr Nath')");
  assert.strictEqual(run(ctx, "corpusCapture(__v2, __p)",
    { __v2: visit("v2"), __p: patient("p1") }).reason, "no-consent");
});

test("consent given against superseded wording no longer counts", () => {
  /* A patient who agreed to wording v1 has not agreed to wording v2. Without
     this the practice would be relying on an agreement nobody can produce. */
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  assert.strictEqual(run(ctx, "consentAllows('p1','research_secondary')"), true);

  run(ctx, "CONSENT_PURPOSES[0].version = 2");           /* the wording changed */
  assert.strictEqual(run(ctx, "consentAllows('p1','research_secondary')"), false,
    "a stale grant must not be silently reused");
  const stale = run(ctx, "consentStale('p1')");
  assert.strictEqual(stale.length, 1);
  assert.strictEqual(stale[0].agreed_version, 1);
  assert.strictEqual(stale[0].current_version, 2);
});

test("purposes are independent — granting one does not grant another", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','quality_improvement','granted','Dr Nath')");
  assert.strictEqual(run(ctx, "consentAllows('p1','quality_improvement')"), true);
  assert.strictEqual(run(ctx, "consentAllows('p1','research_secondary')"), false,
    "granular means granular");
  assert.strictEqual(run(ctx, "corpusCapture(__v, __p)",
    { __v: visit("v1"), __p: patient("p1") }).reason, "no-consent");
});

test("practice/demo records never enter the corpus", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  const res = run(ctx, "corpusCapture(__v, __p)",
    { __v: visit("v1"), __p: patient("p1", { practice: true }) });
  assert.strictEqual(res.reason, "not-a-patient", "training data must not pollute research data");
});

test("an unpersisted consent is not reported as recorded", () => {
  const ctx = device();
  ctx.saveStore = () => false;
  assert.strictEqual(run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')"), null);
});

test("a corpus that cannot be written reports the failure on flush", () => {
  /* Captures land in memory first (for speed — see the note in
     research-corpus.js), so durability is reported by the flush, and a
     failed flush must never look like a success. */
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  ctx.saveStore = () => false;
  assert.strictEqual(run(ctx, "corpusFlush()"), false);
});


/* ═══ 2. Withdrawal actually removes data ═══ */

test("withdrawing consent purges that patient's records", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  run(ctx, "consentSet('p2','research_secondary','granted','Dr Nath')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("a"), __p: patient("p1") });
  run(ctx, "corpusCapture(__v2, __p)", { __v2: visit("b"), __p: patient("p1") });
  run(ctx, "corpusCapture(__v3, __p2)", { __v3: visit("c"), __p2: patient("p2") });
  assert.strictEqual(run(ctx, "corpusStats().total"), 3);

  run(ctx, "consentSet('p1','research_secondary','withdrawn','Dr Nath')");
  assert.strictEqual(run(ctx, "corpusStats().total"), 1,
    "both of p1's records are gone — a revocation that leaves data behind is not a revocation");

  const remaining = run(ctx, "corpusLoad().detail");
  assert.strictEqual(remaining[0].pid, run(ctx, "corpusPseudonym('p2')"), "p2 is untouched");
  assert.ok(ctx.__audit.some((a) => a.k === "research_withdrawn"), "and it is auditable");
});


/* ═══ 3. No identifier survives ═══ */

test("the de-identified record contains nothing that identifies the patient", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','Dr Nath')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  const text = JSON.stringify(run(ctx, "corpusLoad().detail"));

  for (const leak of ["Meera", "Nair", "MRN-4471", "1978-04-02", "9876543210",
                      "discomfort since", "p1", "v1"]) {
    assert.ok(text.indexOf(leak) === -1,
      "the corpus must not contain '" + leak + "' — found in: " + text.slice(0, 300));
  }
});

test("a visit with no date of its own still records a month", () => {
  /* The visit date lives on the stored wrapper, not on the exam data. Reading
     it off the working copy gave "" for every real capture, which silently
     broke every trend. Browser-caught; pinned here. */
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  run(ctx, "corpusCapture(__v, __p, { visitDate: '2026-03-09T08:00:00.000Z' })",
    { __v: visit("v1", { date: undefined }), __p: patient("p1") });
  assert.strictEqual(run(ctx, "corpusLoad().detail")[0].month, "2026-03",
    "the caller's visit date is used");

  const ctx2 = device();
  run(ctx2, "consentSet('p1','research_secondary','granted','x')");
  run(ctx2, "corpusCapture(__v, __p)", { __v: visit("v1", { date: undefined }), __p: patient("p1") });
  assert.ok(/^\d{4}-\d{2}$/.test(run(ctx2, "corpusLoad().detail")[0].month),
    "and with no date anywhere it falls back to now, never to an empty month");
});

test("age is banded and the date is reduced to a month", () => {
  /* An exact age plus an exact date plus a rare condition identifies a person
     in a small practice. */
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1", { age: 47 }) });
  const r = run(ctx, "corpusLoad().detail")[0];
  assert.strictEqual(r.age_band, "45-59");
  assert.strictEqual(r.month, "2026-07", "month only, never the day");
  assert.ok(!("age" in r) && !("dob" in r));
});

test("the same patient links across visits; different patients do not collide", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  run(ctx, "consentSet('p2','research_secondary','granted','x')");
  run(ctx, "corpusCapture(__a, __p1)", { __a: visit("a"), __p1: patient("p1") });
  run(ctx, "corpusCapture(__b, __p1)", { __b: visit("b"), __p1: patient("p1") });
  run(ctx, "corpusCapture(__c, __p2)", { __c: visit("c"), __p2: patient("p2") });

  const d = run(ctx, "corpusLoad().detail");
  assert.strictEqual(d[0].pid, d[1].pid, "longitudinal analysis needs the link");
  assert.notStrictEqual(d[0].pid, d[2].pid, "but different people must stay different");
  assert.notStrictEqual(d[0].vid, d[1].vid, "and each visit is distinct");
});

test("re-saving a visit updates rather than duplicates it", () => {
  /* A visit saved five times must count once, or every rate is inflated. */
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  for (let i = 0; i < 5; i++) {
    run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });
  }
  assert.strictEqual(run(ctx, "corpusStats().total"), 1);
});

test("an export re-keys the pseudonyms and never carries the device salt", () => {
  const ctx = device();
  run(ctx, "consentSet('p1','research_secondary','granted','x')");
  run(ctx, "corpusCapture(__v, __p)", { __v: visit("v1"), __p: patient("p1") });

  const devicePid = run(ctx, "corpusLoad().detail")[0].pid;
  const ex = run(ctx, "corpusExport('export-salt-1')");
  const ex2 = run(ctx, "corpusExport('export-salt-2')");

  assert.notStrictEqual(ex.detail[0].pid, devicePid, "export pseudonyms differ from device ones");
  assert.notStrictEqual(ex.detail[0].pid, ex2.detail[0].pid,
    "two exports cannot be joined to each other");
  const text = JSON.stringify(ex);
  assert.ok(text.indexOf(run(ctx, "corpusSalt()")) === -1, "the device salt never leaves");
  assert.ok(ex.note.length > 50, "and the export states what it is and its limits");
});


/* ═══ 4. Honest figures ═══ */

function seed(ctx, n, over) {
  for (let i = 0; i < n; i++) {
    const pOver = over && over.patient ? over.patient(i) : {};
    const pid = pOver.id || ("p" + i);
    run(ctx, "consentSet(" + JSON.stringify(pid) + ",'research_secondary','granted','x')");
    run(ctx, "corpusCapture(__v, __p)", {
      __v: visit("v" + i, over && over.visit ? over.visit(i) : {}),
      __p: patient(pid, pOver)
    });
  }
}

test("every figure carries its denominator", () => {
  const ctx = device();
  seed(ctx, 20);
  const prev = run(ctx, "insightPrevalence(corpusLoad())");
  assert.strictEqual(prev.denominator, 20);
  for (const cell of prev.leading) {
    assert.ok("denom" in cell && cell.denom === 20,
      "a percentage without an n is how small samples get published as trends");
  }
});

test("small cells are suppressed rather than reported", () => {
  const ctx = device();
  /* 19 dry eye, 1 rare condition — the single case must not be reportable. */
  seed(ctx, 20, {
    visit: (i) => i === 19
      ? { dxList: [{ n: "Ocular Surface Squamous Neoplasia", prob: 0.4, urgent: false }] }
      : {}
  });
  const prev = run(ctx, "insightPrevalence(corpusLoad())");
  const rare = prev.leading.filter((c) => c.label.indexOf("Squamous") >= 0)[0];
  assert.ok(rare, "the condition still appears");
  assert.strictEqual(rare.suppressed, true, "but its count is withheld");
  assert.strictEqual(rare.n, null, "no number that could identify the patient");

  const common = prev.leading.filter((c) => c.label === "Dry Eye Disease")[0];
  assert.strictEqual(common.suppressed, false);
  assert.strictEqual(common.n, 19);
});

test("results are labelled as clinic attendance and as advisory, not diagnosis", () => {
  /* The single most likely misuse of this data. */
  const ctx = device();
  seed(ctx, 10);
  const rep = run(ctx, "insightsReport(corpusLoad())");
  assert.ok(/NOT population/i.test(rep.caveat));
  assert.ok(/advisory/i.test(rep.caveat) && /not a confirmed diagnosis/i.test(rep.caveat));
  assert.ok(/suppressed/i.test(rep.caveat));
});

test("a selection spanning knowledge-base versions says so", () => {
  /* Comparing a differential from KB 1.1 against KB 1.4 is comparing rulers. */
  const ctx = device();
  seed(ctx, 6);
  run(ctx, "KB_VERSION = '1.3.0'");
  seed(ctx, 6, { patient: (i) => ({ id: "q" + i }) });

  const prev = run(ctx, "insightPrevalence(corpusLoad())");
  assert.strictEqual(prev.kb_versions.mixed, true);
  assert.ok(prev.kb_versions.note.indexOf("not like-for-like") >= 0);
});

test("a trend needs at least three reportable months before it is a trend", () => {
  const ctx = device();
  seed(ctx, 12, { visit: () => ({ date: "2026-07-15T10:00:00.000Z" }) });
  const t = run(ctx, "insightTrend(corpusLoad(), 'Dry Eye Disease')");
  assert.strictEqual(t.reportable, false, "one month is not a direction of travel");
  assert.ok(t.reportable_note.length > 10);
});

test("care patterns surface urgent alerts with no recorded referral", () => {
  const ctx = device();
  seed(ctx, 10, {
    visit: () => ({ alerts: [{ m: "IOP critically elevated", l: "urgent" }],
                    plan: { ref_to: "", ref_urgency: "" } })
  });
  const care = run(ctx, "insightCarePatterns(corpusLoad())");
  assert.strictEqual(care.red_flag_encounters.n, 10);
  assert.strictEqual(care.urgent_not_referred.n, 10);
  assert.ok(/prompt to look, not a finding/i.test(care.interpretation_note),
    "it must be framed as a question for the practice, not a judgement");
});


/* ═══ 5. It has to survive real scale ═══ */

test("PERFORMANCE: 5,000 encounters stay bounded and analyse fast", () => {
  const ctx = device();
  const t0 = Date.now();
  for (let i = 0; i < 5000; i++) {
    const pid = "p" + (i % 1200);                      /* ~1,200 patients, repeat visits */
    if (i < 1200) run(ctx, "consentSet(" + JSON.stringify(pid) + ",'research_secondary','granted','x')");
    run(ctx, "corpusCapture(__v, __p)", {
      __v: visit("v" + i, { date: "2026-" + String((i % 12) + 1).padStart(2, "0") + "-10T09:00:00Z" }),
      __p: patient(pid, { age: 20 + (i % 60) })
    });
  }
  const captureMs = Date.now() - t0;

  /* Captures land in memory; flush before measuring what is actually stored. */
  const tf = Date.now();
  assert.strictEqual(run(ctx, "corpusFlush()"), true, "the corpus must persist");
  const flushMs = Date.now() - tf;

  const stats = run(ctx, "corpusStats()");
  assert.strictEqual(stats.total, 5000, "every encounter is accounted for");
  assert.ok(stats.detail <= run(ctx, "CORPUS_MAX_DETAIL + CORPUS_SLACK"),
    "detail is capped at " + run(ctx, "CORPUS_MAX_DETAIL") + ", got " + stats.detail);
  assert.ok(stats.rolled_up > 0, "the overflow was rolled up, not dropped");

  /* Storage budget: the measured device ceiling is ~9 MB for EVERYTHING. */
  const bytes = ctx.__disk.research_corpus.length;
  assert.ok(bytes < 3 * 1024 * 1024,
    "corpus is " + (bytes / 1048576).toFixed(2) + " MB — must stay well inside the ~9 MB device budget");

  const t1 = Date.now();
  const rep = run(ctx, "insightsReport(corpusLoad())");
  const reportMs = Date.now() - t1;

  assert.ok(rep.prevalence.denominator > 0);
  assert.ok(reportMs < 2000, "a full report took " + reportMs + "ms — it must feel instant offline");

  /* The number that decides whether saving a visit stutters. This runs inside
     doSave() on the UI thread, so it has to be small and stay small. */
  const perCapture = captureMs / 5000;
  assert.ok(perCapture < 1.0,
    "capture is " + perCapture.toFixed(2) + "ms per visit — it runs on the UI thread " +
    "during doSave() and must not be felt");

  console.log("      5,000 encounters: capture " + captureMs + "ms (" + perCapture.toFixed(3) +
              "ms each), flush " + flushMs + "ms, report " + reportMs + "ms, store " +
              (bytes / 1024).toFixed(0) + " KB, detail " + stats.detail +
              " + rolled-up " + stats.rolled_up);
});

test("compaction preserves the denominator and the trend line", () => {
  /* Roll-ups must not create a hole in history, or every long-run figure is
     silently wrong. */
  const ctx = device();
  const N = run(ctx, "CORPUS_MAX_DETAIL") + 500;
  for (let i = 0; i < N; i++) {
    const pid = "p" + i;
    run(ctx, "consentSet(" + JSON.stringify(pid) + ",'research_secondary','granted','x')");
    run(ctx, "corpusCapture(__v, __p)", {
      __v: visit("v" + i, { date: (i < 500 ? "2026-01" : "2026-07") + "-10T09:00:00Z" }),
      __p: patient(pid)
    });
  }
  assert.strictEqual(run(ctx, "corpusStats().total"), N, "nothing was lost in compaction");

  const t = run(ctx, "insightTrend(corpusLoad(), 'Dry Eye Disease')");
  const jan = t.points.filter((p) => p.month === "2026-01")[0];
  assert.ok(jan && jan.n > 0, "the compacted month still appears in the trend");
});

test("a large patient set produces no pseudonym collisions", () => {
  /* A collision merges two people's histories into one apparent series —
     silently wrong, and the reason the pseudonym uses two passes. */
  const ctx = device();
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    seen.add(run(ctx, "corpusPseudonym('patient-" + i + "')"));
  }
  assert.strictEqual(seen.size, 20000, "20,000 patients must yield 20,000 distinct pseudonyms");
});
