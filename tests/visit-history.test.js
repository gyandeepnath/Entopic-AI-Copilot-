/* ═══════════════════════════════════════════════════════════════ */
/* CARRY-FORWARD AND TRENDS                                         */
/*                                                                  */
/* Carry-forward already existed as a blanket deep-copy of the       */
/* history sections with nothing on screen to say so — a year-old    */
/* medication list read as today's record. These tests pin the       */
/* replacement: per-field, marked, and history only.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const H = require("../js/visit-history.js");

const blank = () => ({
  hxO: { conditions: "", surgeries: "", glasses_rx: "", cl_type: "", medications: "", last_exam: "", flags: [] },
  hxM: { conditions: "", medications: "", allergies: "", dm: false, htn: false, drug_list: [] },
  hxF: { glaucoma: false, details: "" },
  hxS: { smoking: "", vdu: "", occupation: "" },
  iop: { od: "", os: "" },
  va: { od_un: "", os_un: "" },
  sl: { findings: [] },
  fun: { od: { cd_v: "" }, os: { cd_v: "" }, findings: [] }
});


/* ── What carries, and what must never ─────────────────────────── */

test("history carries forward and is marked as carried", () => {
  const prev = blank();
  prev.hxM.conditions = "Type 2 diabetes";
  prev.hxM.dm = true;
  prev.hxO.surgeries = "Right cataract 2019";

  const now = blank();
  const n = H.carryForward(now, prev);

  assert.ok(n >= 3, "expected several fields carried, got " + n);
  assert.strictEqual(now.hxM.conditions, "Type 2 diabetes");
  assert.strictEqual(now.hxM.dm, true);
  assert.ok(H.isCarried(now, "hxM", "conditions"), "must be MARKED as carried");
  assert.ok(H.isCarried(now, "hxO", "surgeries"));
});

test("NO examination finding is ever carried forward", () => {
  /* The rule that keeps this from being a documentation hazard. Copying last
     visit's IOP into today would manufacture a measurement nobody took. */
  const prev = blank();
  prev.iop.od = "28"; prev.iop.os = "26";
  prev.va.od_un = "6/9";
  prev.fun.od.cd_v = "0.7";
  prev.sl.findings = [{ label: "Cortical cataract", eye: "OD" }];

  const now = blank();
  H.carryForward(now, prev);

  assert.strictEqual(now.iop.od, "", "IOP must NOT carry — it is a measurement");
  assert.strictEqual(now.va.od_un, "", "VA must NOT carry");
  assert.strictEqual(now.fun.od.cd_v, "", "C:D must NOT carry");
  assert.strictEqual(now.sl.findings.length, 0, "slit-lamp findings must NOT carry");
});

test("the carry list contains no examination section", () => {
  /* Generalises the rule so a future edit adding, say, ["iop","od"] fails. */
  const EXAM = ["iop", "va", "sl", "fun", "rx", "bv", "gon", "pupil", "mot", "neuro", "inv", "dil"];
  const all = [...H.CARRY_FIELDS, ...H.CARRY_FLAGS, ...H.CARRY_ARRAYS];
  const bad = all.filter(([sec]) => EXAM.includes(sec)).map((p) => p.join("."));
  assert.deepStrictEqual(bad, [],
    "these examination fields are set to carry forward, which would fabricate\n" +
    "measurements nobody took:\n  " + bad.join("\n  "));
});

test("today's entry is never overwritten by a carried value", () => {
  const prev = blank(); prev.hxM.conditions = "Old text";
  const now = blank();  now.hxM.conditions = "Recorded today";
  H.carryForward(now, prev);
  assert.strictEqual(now.hxM.conditions, "Recorded today");
  assert.ok(!H.isCarried(now, "hxM", "conditions"));
});

test("confirming a carried value makes it this visit's own record", () => {
  const prev = blank(); prev.hxM.conditions = "Asthma";
  const now = blank();
  H.carryForward(now, prev);
  assert.ok(H.isCarried(now, "hxM", "conditions"));

  global.V = now;
  H.confirmCarried("hxM", "conditions");
  assert.ok(!H.isCarried(now, "hxM", "conditions"), "confirmed values stop being carried");
  assert.strictEqual(now.hxM.conditions, "Asthma", "the value itself stays");
  delete global.V;
});

test("a first visit carries nothing and does not crash", () => {
  const now = blank();
  assert.strictEqual(H.carryForward(now, null), 0);
  assert.strictEqual(H.carriedCount(now), 0);
});


/* ── Trends ────────────────────────────────────────────────────── */

function withVisits(visits) {
  global.getPatientVisits = () => visits;
}

test("a trend returns recorded values in date order", () => {
  withVisits([
    { id: "v2", date: "2026-06-01", data: { iop: { od: "22" } } },
    { id: "v1", date: "2025-06-01", data: { iop: { od: "18" } } },
    { id: "v3", date: "2026-12-01", data: { iop: { od: "26" } } }
  ]);
  const s = H.trendSeries("p1", "iop_od");
  assert.strictEqual(s.length, 3);
  assert.deepStrictEqual(s.map((p) => p.value), [18, 22, 26], "oldest first");
  delete global.getPatientVisits;
});

test("a visit with no measurement is SKIPPED, never plotted as zero", () => {
  /* Plotting a missing IOP as 0 would draw a data point that does not exist —
     and 0 mmHg would look like a catastrophic drop. */
  withVisits([
    { id: "v1", date: "2025-01-01", data: { iop: { od: "18" } } },
    { id: "v2", date: "2025-06-01", data: { iop: { od: "" } } },
    { id: "v3", date: "2026-01-01", data: { iop: { od: "21" } } }
  ]);
  const s = H.trendSeries("p1", "iop_od");
  assert.strictEqual(s.length, 2, "the visit without a measurement must not appear");
  assert.ok(!s.some((p) => p.value === 0));
  delete global.getPatientVisits;
});

test("non-numeric values are skipped rather than becoming NaN", () => {
  withVisits([
    { id: "v1", date: "2025-01-01", data: { iop: { od: "not recorded" } } },
    { id: "v2", date: "2026-01-01", data: { iop: { od: "19" } } }
  ]);
  const s = H.trendSeries("p1", "iop_od");
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].value, 19);
  delete global.getPatientVisits;
});

test("a metric with fewer than two points is not offered as a trend", () => {
  withVisits([{ id: "v1", date: "2025-01-01", data: { iop: { od: "18" } } }]);
  assert.strictEqual(H.trendsAvailable("p1").length, 0,
    "one point is not a trend");
  delete global.getPatientVisits;
});

test("trends make no clinical judgement", () => {
  /* Saying a field is "progressing", computing a rate, or drawing a target
     line would each be a clinical claim requiring evidence this product does
     not have. The check is for judgement LOGIC, not for the words — the user
     note deliberately contains "progressing" while promising not to do it. */
  const code = (read("js/ui-trends.js") + read("js/visit-history.js"))
    .replace(/\/\*[\s\S]*?\*\//g, "")            /* comments */
    .replace(/'[^']*'|"[^"]*"/g, "''");             /* and user-facing strings */

  for (const pattern of [
    /\bslope\b/i, /\bregression\b/i, /\brateOf/i, /\bprogressionRate/i,
    /\bisWorsening/i, /\bisProgressing/i, /\btargetIop/i, /\bnormalRange/i,
    /\bthreshold/i, /evEmit\(/
  ]) {
    assert.ok(!pattern.test(code),
      "trend code must draw the numbers and stop — it must not judge them. Found: " + pattern);
  }
});

test("the chart is drawn without any external library", () => {
  /* Offline-first: a chart that needs a CDN is a chart that fails in a rural
     clinic. */
  const src = read("js/ui-trends.js");
  assert.ok(/<svg/.test(src), "expected inline SVG");
  assert.ok(!/import |require\(|cdn|https?:\/\//i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
    "no external dependency may be introduced");
});

test("both modules are loaded, in dependency order", () => {
  const html = read("index.html");
  const order = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.includes("js/visit-history.js"));
  assert.ok(order.includes("js/ui-trends.js"));
  assert.ok(order.indexOf("js/storage.js") < order.indexOf("js/visit-history.js"),
    "visit-history needs getPatientVisits from storage.js");
  assert.ok(order.indexOf("js/visit-history.js") < order.indexOf("js/ui-trends.js"));
});

test("the follow-up path uses the marked carry, not a blanket copy", () => {
  const src = read("js/ui-chart.js");
  assert.ok(/carryForward\(/.test(src), "startFollowUpVisit must use carryForward");
  assert.ok(!/JSON\.parse\(JSON\.stringify\(prior\.data\[k\]\)\)/.test(src),
    "the old unmarked deep-copy must be gone");
});
