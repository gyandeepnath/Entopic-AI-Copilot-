/* ═══════════════════════════════════════════════════════════════ */
/* MEDICATION CHECKER                                               */
/*                                                                  */
/* This module had no tests at all, and it is not cosmetic: its      */
/* output is shown to the clinician as a medication review AND fed   */
/* into the diagnostic engine as risk tokens (engine.js SOURCE 10).  */
/* A wrong match here becomes a wrong differential.                  */
/*                                                                  */
/* The bug that prompted these tests: matching was a bare indexOf,   */
/* so "chloroquine" matched inside "hydroxychloroquine" and a        */
/* patient on one common drug was reported as taking two.            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* Load the real knowledge base and the real checker into one context. */
function load(medicationsText) {
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, RegExp, parseFloat, parseInt,
    escHtml: (s) => String(s === undefined || s === null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;"),
    module: { exports: {} }
  };
  vm.createContext(ctx);
  vm.runInContext(read("knowledge/medications.js"), ctx, { filename: "medications.js" });
  vm.runInContext("var V = { hxM: { medications: " + JSON.stringify(medicationsText || "") + " } };",
    ctx, { filename: "fixture" });
  vm.runInContext(read("js/medication-checker.js"), ctx, { filename: "medication-checker.js" });
  return ctx;
}

const drugsFound = (text) => load(text).checkAllMedications().map((m) => m.drug).sort();


/* ── The bug ───────────────────────────────────────────────────── */

test("hydroxychloroquine is NOT also reported as chloroquine", () => {
  /* The regression that made this file exist. Hydroxychloroquine is common in
     lupus and rheumatoid arthritis, so this was not an edge case — it told
     clinicians their patient was on a drug that appears nowhere in the record.
     Both carry macular toxicity, so the engine token was unaffected; the
     fabricated entry was in what the human read. */
  const found = drugsFound("Hydroxychloroquine 200mg BD");
  assert.ok(found.includes("Hydroxychloroquine"), "the actual drug must match");
  assert.ok(!found.includes("Chloroquine"),
    "a drug the patient is not taking must never appear: got " + JSON.stringify(found));
});

test("chloroquine on its own still matches", () => {
  /* The fix must not overshoot into missing a real exposure. */
  assert.ok(drugsFound("Chloroquine 250mg weekly").includes("Chloroquine"));
});

test("no alias can match inside a longer word", () => {
  /* Generalises the fix: assert the property, not the one example. Any future
     alias that is a substring of another is caught here. */
  const ctx = load("");
  const meds = ctx.MEDICATION_OCULAR_EFFECTS;
  const problems = [];

  for (const a of meds) {
    for (const b of meds) {
      if (a.drug === b.drug) continue;
      for (const longAlias of a.aliases) {
        for (const shortAlias of b.aliases) {
          if (longAlias.toLowerCase() === shortAlias.toLowerCase()) continue;
          if (!longAlias.toLowerCase().includes(shortAlias.toLowerCase())) continue;
          /* Writing the long alias must not drag in the other drug. */
          const found = drugsFound(longAlias);
          if (found.includes(b.drug)) {
            problems.push('"' + longAlias + '" (' + a.drug + ') falsely reports ' + b.drug);
          }
        }
      }
    }
  }
  assert.deepStrictEqual(problems, [],
    "these drug names contain another drug's name and matched it:\n  " + problems.join("\n  "));
});


/* ── Matching behaviour that must be preserved ─────────────────── */

test("plurals still match — clinicians write 'steroids', not 'steroid'", () => {
  /* Requiring a word boundary at the END would have broken this, and MISSING
     a real steroid history is the dangerous direction of error. */
  assert.ok(drugsFound("on long-term steroids").includes("Prednisolone"));
  assert.ok(drugsFound("takes SSRIs").length > 0, "SSRIs must match the SSRI entry");
});

test("hyphens and slashes are word boundaries", () => {
  assert.ok(drugsFound("warfarin/aspirin").length > 0);
  assert.ok(drugsFound("prednisolone-taper").includes("Prednisolone"));
});

test("matching is case-insensitive", () => {
  assert.ok(drugsFound("PREDNISOLONE").includes("Prednisolone"));
  assert.ok(drugsFound("Plaquenil").includes("Hydroxychloroquine"));
});

test("several drugs in one field are all found", () => {
  const found = drugsFound("Amiodarone 200mg, topiramate, and tamsulosin 400mcg");
  assert.ok(found.includes("Amiodarone"), found.join(","));
  assert.ok(found.includes("Topiramate"), found.join(","));
  assert.ok(found.includes("Tamsulosin"), found.join(","));
});

test("an unrelated drug list matches nothing", () => {
  /* .length rather than deepStrictEqual: the arrays are built inside a vm
     realm, so cross-realm identity makes deepStrictEqual fail on equal data. */
  assert.strictEqual(drugsFound("paracetamol, vitamin D, ramipril").length, 0);
});


/* ── Absent / malformed input must never throw ─────────────────── */

test("no medications, no history, and no visit are all handled", () => {
  assert.strictEqual(load("").checkAllMedications().length, 0);

  const noHx = load("");
  vm.runInContext("V = {};", noHx);
  assert.strictEqual(noHx.checkAllMedications().length, 0, "a visit with no medical history");

  vm.runInContext("V = null;", noHx);
  assert.strictEqual(noHx.checkAllMedications().length, 0,
    "a null visit must return nothing rather than throwing — this runs inside " +
    "collectTokens, so a throw here would take down the whole differential");
});


/* ── The engine contract ───────────────────────────────────────── */

test("drug risks become engine tokens", () => {
  const ctx = load("hydroxychloroquine");
  const tokens = ctx.getMedicationTokens();
  assert.ok(tokens.includes("macular_screening_needed"),
    "hydroxychloroquine must raise macular screening: " + JSON.stringify(tokens));
});

test("steroids raise both the cataract and the pressure token", () => {
  const tokens = load("prednisolone 30mg").getMedicationTokens();
  assert.ok(tokens.includes("steroid_history"), JSON.stringify(tokens));
  assert.ok(tokens.includes("raised_iop_risk"), JSON.stringify(tokens));
});

test("tamsulosin raises the floppy-iris token", () => {
  assert.ok(load("tamsulosin").getMedicationTokens().includes("ifis_risk"));
});

test("no medications means no tokens — not a default risk", () => {
  assert.strictEqual(load("").getMedicationTokens().length, 0);
});

test("every token the checker can emit is a token the knowledge base uses", () => {
  /* A token nothing consumes is a risk that silently does nothing. */
  const src = read("js/medication-checker.js");
  const emitted = [...src.matchAll(/tokens\.push\("([a-z_]+)"\)/g)].map((m) => m[1]);
  assert.ok(emitted.length >= 7, "expected the full token set, found " + emitted.length);

  const kb = fs.readdirSync(path.join(ROOT, "knowledge"))
    .filter((f) => f.endsWith(".js"))
    .map((f) => read("knowledge/" + f)).join("\n");

  const orphans = emitted.filter((t) => !new RegExp('"' + t + '"').test(kb));
  assert.deepStrictEqual(orphans, [],
    "the medication checker emits tokens that no condition requires, so the risk\n" +
    "is computed and then ignored:\n  " + orphans.join("\n  "));
});


/* ── Rendering ─────────────────────────────────────────────────── */

test("the review escapes knowledge-base text", () => {
  /* The KB is editable in the admin editor, so its text is not a trusted
     constant. */
  const ctx = load("prednisolone");
  ctx.MEDICATION_OCULAR_EFFECTS[0].drug = '<img src=x onerror=alert(1)>';
  const html = ctx.renderMedicationReview();
  assert.ok(!/<img/.test(html), "raw markup reached the page: " + html.slice(0, 200));
  assert.ok(/&lt;img/.test(html), "it should appear escaped");
});

test("no medications renders nothing at all", () => {
  assert.strictEqual(load("").renderMedicationReview(), "",
    "an empty panel would take space and imply the check found something");
});


/* ═══════════════════════════════════════════════════════════════ */
/* NEGATION, PAST USE AND ALLERGY                                   */
/*                                                                  */
/* The safety rule: nothing is ever silently dropped. Every drug    */
/* the text mentions still appears, labelled with how it was read.  */
/* Only the ENGINE TOKEN is withheld, and only for negation and     */
/* allergy — never for past use.                                    */
/* ═══════════════════════════════════════════════════════════════ */

const statusOf = (text, drug) => {
  const hit = load(text).checkAllMedications().find((m) => m.drug === drug);
  return hit ? hit.status : null;
};
const tokensFor = (text) => load(text).getMedicationTokens();

test("'no steroids' does not become a steroid history", () => {
  assert.strictEqual(statusOf("no steroids", "Prednisolone"), "negated");
  assert.strictEqual(tokensFor("no steroids").length, 0,
    "a denial must not push the differential toward steroid-induced disease");
});

test("the denied drug is still SHOWN, not deleted", () => {
  /* If the software misreads the note, the clinician has to be able to see
     that it misread it. A dropped row hides the mistake. */
  const rows = load("no steroids").checkAllMedications();
  assert.strictEqual(rows.length, 1, "the mention must still appear in the review");
  assert.strictEqual(rows[0].counts, false, "but must not count as an exposure");
});

test("other denial phrasings are understood", () => {
  for (const phrase of ["denies steroid use", "nil steroids", "not on prednisolone",
                        "never took prednisolone", "negative for steroids"]) {
    assert.strictEqual(statusOf(phrase, "Prednisolone"), "negated",
      "failed to read as negated: " + phrase);
  }
});

test("STOPPED is NOT the same as never — past exposure still counts", () => {
  /* The most important test in this file. Steroid-induced cataract,
     hydroxychloroquine maculopathy and ethambutol optic neuropathy are all
     consequences of PAST exposure. Treating "stopped" as "never" would be the
     most dangerous thing this module could do. */
  assert.strictEqual(statusOf("stopped prednisolone 6 months ago", "Prednisolone"), "past");
  assert.ok(tokensFor("stopped prednisolone 6 months ago").includes("steroid_history"),
    "a stopped steroid is still a steroid history");

  assert.strictEqual(statusOf("previously on hydroxychloroquine", "Hydroxychloroquine"), "past");
  assert.ok(tokensFor("previously on hydroxychloroquine").includes("macular_screening_needed"),
    "past hydroxychloroquine still needs macular screening");
});

test("allergy means not taking, and is shown as an allergy", () => {
  assert.strictEqual(statusOf("allergic to doxycycline", "Doxycycline"), "allergy");
  assert.strictEqual(tokensFor("allergic to doxycycline").length, 0);

  const rows = load("allergic to doxycycline").checkAllMedications();
  assert.strictEqual(rows.length, 1, "an allergy is clinically important and must stay visible");
});

test("negation does not leak across a clause boundary", () => {
  /* "no diabetes, on prednisolone" must not negate the prednisolone. This is
     the failure that would make negation handling dangerous. */
  assert.strictEqual(statusOf("no diabetes, on prednisolone 20mg", "Prednisolone"), "current");
  assert.ok(tokensFor("no diabetes, on prednisolone 20mg").includes("steroid_history"));

  assert.strictEqual(statusOf("no known allergies. taking tamsulosin", "Tamsulosin"), "current");
  assert.ok(tokensFor("no known allergies. taking tamsulosin").includes("ifis_risk"));
});

test("a positive cue after a negation cancels it in the same clause", () => {
  assert.strictEqual(statusOf("no steroids but taking amiodarone", "Amiodarone"), "current");
});

test("plain current use is unaffected", () => {
  assert.strictEqual(statusOf("prednisolone 20mg od", "Prednisolone"), "current");
  assert.ok(tokensFor("prednisolone 20mg od").includes("steroid_history"));
  assert.ok(tokensFor("hydroxychloroquine 200mg BD").includes("macular_screening_needed"));
});

test("when a drug is mentioned twice, the exposure reading wins", () => {
  /* "stopped prednisolone, restarted prednisolone" must not resolve to the
     denial. The rule is: any exposure anywhere outranks a denial. */
  assert.strictEqual(statusOf("no prednisolone last year. prednisolone 10mg now", "Prednisolone"),
    "current");
});

test("negation handling never reduces what the clinician sees", () => {
  /* Property test across every drug and every negating phrasing: the row count
     must be identical with and without the negation cue. Only `counts` may
     change. */
  const ctx = load("");
  const drugs = ctx.MEDICATION_OCULAR_EFFECTS.map((m) => m.aliases[0]);
  const losses = [];
  for (const d of drugs) {
    const plain = load(d).checkAllMedications().length;
    for (const cue of ["no ", "denies ", "allergic to ", "stopped "]) {
      const negated = load(cue + d).checkAllMedications().length;
      if (negated < plain) losses.push(cue + d + ": " + plain + " -> " + negated);
    }
  }
  assert.deepStrictEqual(losses, [],
    "these phrasings made a drug mention disappear from the review entirely:\n  " +
    losses.join("\n  "));
});
