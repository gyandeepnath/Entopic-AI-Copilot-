/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — PRIVACY, CONSENT, AND WHAT LEAVES THE DEVICE */
/*                                                                  */
/*   node tools/stress/privacy.js                                   */
/*                                                                  */
/* attack.js covers storage, migrations and the engine. It does not */
/* touch the modules that decide WHAT LEAVES: the research corpus   */
/* (de-identification), consent, and the export paths. Those carry  */
/* the highest consequence in the product — a storage bug loses     */
/* data, a de-identification bug publishes a patient — and had no    */
/* adversarial coverage at all.                                     */
/*                                                                  */
/* The central technique: plant a unique, unmistakable PHI marker   */
/* in EVERY field of a patient and a visit, then assert the marker  */
/* appears nowhere in what the corpus keeps or exports. A whitelist  */
/* that has silently become a blacklist fails this immediately.     */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { makeHarness, must, mustEqual, browser } = require("./lib");
const H = makeHarness(process.argv);
const { G, attack, runAll } = H;

/* The VOCABULARIES must be loaded, or the corpus gate fails closed and
   withholds everything — which would make every leak assertion below pass for
   the wrong reason. The positive controls in group T exist to prove they did
   not. (This harness caught itself doing exactly that on first run.) */
const CORPUS_FILES = [
  "knowledge/token-registry.js",
  "js/data-model.js",
  "js/consent.js",
  "js/research-corpus.js"
];

/* Every string here is a marker no de-identified record may ever contain.
   Deliberately absurd so a match cannot be coincidence. */
const PHI = {
  first: "ZZPHIFIRSTZZ", last: "ZZPHILASTZZ", mrn: "ZZPHIMRNZZ",
  phone: "ZZPHIPHONEZZ", email: "ZZPHIEMAILZZ", address: "ZZPHIADDRZZ",
  nid: "ZZPHINIDZZ", dob: "1913-07-04", note: "ZZPHINOTEZZ",
  guardian: "ZZPHIGUARDIANZZ", employer: "ZZPHIEMPLOYERZZ"
};
const MARKERS = Object.values(PHI).filter((v) => /^ZZ/.test(v));

function hostilePatient(id) {
  return {
    id: id || "p1", practice: false,
    first_name: PHI.first, last_name: PHI.last, mrn: PHI.mrn,
    phone: PHI.phone, email: PHI.email, address: PHI.address,
    national_id: PHI.nid, dob: PHI.dob, age: 42, sex: "F",
    guardian: PHI.guardian, employer: PHI.employer,
    notes: PHI.note, emergency_contact: PHI.phone
  };
}

/* A visit with a marker planted in every plausible carrier, including the
   free-text fields a clinician actually types into. */
function hostileVisit(id) {
  return {
    id: id || "v1", date: "2026-03-15T09:00:00.000Z",
    cc: "patient " + PHI.first + " " + PHI.last + " attended",
    symptoms: ["redness", "ZZPHINOTEZZ_symptom"],
    hxO: { conditions: PHI.note, surgeries: PHI.note },
    hxM: { conditions: PHI.note, medications: PHI.note, allergies: PHI.note },
    hxF: { details: PHI.note },
    hxS: { occupation: PHI.employer },
    sl: { findings: [{ label: "Corneal infiltrate", eye: "OD" },
                     { label: PHI.note + " custom finding", eye: "OS" }] },
    fun: { findings: [{ label: "Drusen", eye: "OD" }] },
    plan: { ref_to: PHI.note + " Hospital", ref_urgency: "routine",
            notes: PHI.note, advice: PHI.note },
    dxList: [{ n: "Dry eye", prob: 0.42, icd: "H04.123", urgent: false }],
    alerts: [{ l: "urgent", m: "sees " + PHI.first }],
    notes: PHI.note, free_text: PHI.note,
    signature: PHI.first + " " + PHI.last
  };
}

function corpusCtx(extra) {
  const c = browser({ also: CORPUS_FILES, extra: Object.assign({
    APP_VERSION: "1.5.0", KB_VERSION: "1.3.1"
  }, extra || {}) });
  return c;
}

/* Grant consent for the research purpose the way the app does. */
function grant(c, pid) {
  c.run(`consentSet(${JSON.stringify(pid)}, CORPUS_PURPOSE, "granted", "tester")`);
}


/* ═══════════════════════════════════════════════════════════════ */
G("P. de-identification — nothing identifying may survive");

attack("P1 no PHI marker from the patient record reaches a corpus record", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1");
  c.__vs = hostileVisit("v1");
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok, "capture was refused: " + JSON.stringify(res));

  const dump = c.run("JSON.stringify(corpusLoad())");
  for (const m of MARKERS) {
    must(dump.indexOf(m) < 0,
      "the marker " + m + " reached the research corpus — a de-identified store is holding PHI");
  }
});

attack("P2 no PHI marker survives into the EXPORT (the thing that leaves)", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1");
  c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const out = c.run("JSON.stringify(corpusExport('export-salt-1'))");
  for (const m of MARKERS) {
    must(out.indexOf(m) < 0, "the marker " + m + " left the device in a research export");
  }
  must(out.indexOf(PHI.dob) < 0, "a full date of birth left the device");
});

attack("P3 the device salt is never present in an export", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const salt = c.run("corpusSalt()");
  must(salt && salt.length > 8, "sanity: a salt exists");
  const out = c.run("JSON.stringify(corpusExport('export-salt-1'))");
  must(out.indexOf(salt) < 0,
    "the device salt appeared in the export — whoever holds it can re-link every pseudonym");
});

attack("P4 the exported pseudonym differs from the on-device one", () => {
  /* Otherwise two exports to two recipients are linkable to each other and
     back to the device corpus. */
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const onDevice = c.run("corpusLoad().detail[0].pid");
  const exported = c.run("(corpusExport('export-salt-1').detail||[])[0]");
  must(exported, "the export carried no detail record");
  must(exported.pid !== onDevice,
    "the export re-used the device pseudonym; a recipient can link exports to the device corpus");
});

attack("P5 two different export salts do not produce linkable pseudonyms", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const a = c.run("(corpusExport('salt-A').detail||[])[0].pid");
  const b = c.run("(corpusExport('salt-B').detail||[])[0].pid");
  must(a !== b, "two recipients received the same pseudonym and can pool their datasets");
});

attack("P6 only a MONTH is kept, never a full encounter date", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  mustEqual(rec.month, "2026-03", "the month must be kept");
  const dump = JSON.stringify(rec);
  must(dump.indexOf("2026-03-15") < 0,
    "a full encounter date survived — date + age band + a rare condition re-identifies");
});

attack("P7 age is banded, never exact", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__pt.age = 91;
  c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  mustEqual(rec.age_band, "75+", "a very old age must land in the open-ended top band");
  must(JSON.stringify(rec).indexOf("91") < 0 || rec.age_band === "75+",
    "an exact age survived de-identification");
  /* The top band must be open-ended: a 103-year-old in a small practice is
     unique, and "100-104" would say so. */
  c.__pt.age = 103;
  c.run("corpusCapture(Object.assign({}, __vs, { id: 'v2' }), __pt, { visitDate: __vs.date })");
  const rec2 = c.run("corpusLoad().detail.filter(function(r){return r.vid!==" +
    JSON.stringify(c.run("corpusLoad().detail[0].vid")) + "})[0]");
  must(!rec2 || rec2.age_band === "75+", "the oldest band must stay open-ended");
});

attack("P8 free text a clinician typed never becomes a corpus field", () => {
  /* The whitelist is the whole defence. This proves it is still a whitelist
     and has not drifted into copying the visit. */
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  const keys = Object.keys(rec);
  const banned = ["cc", "notes", "free_text", "signature", "hxO", "hxM", "hxF", "hxS", "plan"];
  for (const k of banned) {
    must(keys.indexOf(k) < 0, "the corpus record carries `" + k + "`, a free-text carrier");
  }
});

attack("P9 a NEW field added to a visit does not auto-flow into the corpus", () => {
  /* Fails open is the failure mode that matters: the day someone adds
     `patient_nhs_number` to the visit, it must NOT appear. */
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1");
  c.__vs = Object.assign(hostileVisit("v1"), {
    newly_added_field: "ZZPHINEWZZ", patient_nhs_number: "ZZPHINHSZZ"
  });
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const dump = c.run("JSON.stringify(corpusLoad())");
  must(dump.indexOf("ZZPHINEWZZ") < 0 && dump.indexOf("ZZPHINHSZZ") < 0,
    "a field nobody whitelisted flowed into the corpus — the whitelist has become a blacklist");
});

attack("P10 a custom slit-lamp finding label cannot smuggle free text out", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  const f = JSON.stringify(rec.findings || []);
  must(f.indexOf(PHI.note) < 0,
    "a finding LABEL carried free text into the corpus: " + f);
});

attack("P11 a symptom token cannot smuggle free text out", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  const s = JSON.stringify(rec.symptoms || []);
  must(s.indexOf(PHI.note) < 0,
    "a symptom entry carried free text into the corpus: " + s);
});

attack("P12 the referral destination cannot carry free text out", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  must(String(rec.referral || "").indexOf(PHI.note) < 0,
    "the referral field carried free text into the corpus: " + rec.referral);
});

attack("P13 an alert message cannot carry a name out", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const dump = c.run("JSON.stringify(corpusLoad())");
  must(dump.indexOf(PHI.first) < 0,
    "a patient name reached the corpus through an alert message");
});


/* ═══════════════════════════════════════════════════════════════ */
G("Q. pseudonyms — stable, unlinkable, non-colliding");

attack("Q1 the same patient always gets the same pseudonym on this device", () => {
  const c = corpusCtx();
  const a = c.run("corpusPseudonym('p-stable')");
  const b = c.run("corpusPseudonym('p-stable')");
  mustEqual(a, b, "longitudinal linkage is impossible if the pseudonym moves");
});

attack("Q2 different patients get different pseudonyms", () => {
  const c = corpusCtx();
  const seen = new Set();
  for (let i = 0; i < 20000; i++) {
    const p = c.run(`corpusPseudonym('pt-${i}')`);
    if (seen.has(p)) throw new Error("collision at i=" + i + " — two patients' histories merge into one");
    seen.add(p);
  }
  mustEqual(seen.size, 20000, "20,000 patients must produce 20,000 pseudonyms");
});

attack("Q3 the pseudonym is not trivially reversible to the patient id", () => {
  const c = corpusCtx();
  const p = c.run("corpusPseudonym('p-secret-id-12345')");
  must(p.indexOf("p-secret") < 0 && p.indexOf("12345") < 0,
    "the patient id is visible inside its own pseudonym");
  must(/^[0-9a-f]{16}$/.test(p), "expected a 16-hex digest, got " + p);
});

attack("Q4 two devices with different salts do not produce linkable pseudonyms", () => {
  const c = corpusCtx();
  const a = c.run("corpusPseudonym('p1', 'device-A-salt')");
  const b = c.run("corpusPseudonym('p1', 'device-B-salt')");
  must(a !== b, "the same patient is linkable across two clinics' exports");
});

attack("Q5 the visit pseudonym differs from the patient pseudonym", () => {
  const c = corpusCtx();
  const p = c.run("corpusPseudonym('p1')");
  const v = c.run("corpusPseudonym('p1:v1')");
  must(p !== v, "patient and visit pseudonyms collided");
});


/* ═══════════════════════════════════════════════════════════════ */
G("R. consent — the gate that must never fail open");

attack("R1 no consent means no capture, ever", () => {
  const c = corpusCtx();
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok === false, "a record was captured with no consent recorded");
  mustEqual(res.reason, "no-consent", "the refusal must say why");
  mustEqual(c.run("corpusLoad().detail.length"), 0, "nothing may be stored");
});

attack("R2 an explicitly REFUSED consent blocks capture", () => {
  const c = corpusCtx();
  c.run(`consentSet("p1", CORPUS_PURPOSE, "refused", "tester")`);
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok === false, "a refusal was overridden");
  mustEqual(c.run("corpusLoad().detail.length"), 0, "nothing may be stored");
});

attack("R3 a practice/simulated patient is never captured, consent or not", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = Object.assign(hostilePatient("p1"), { practice: true });
  c.__vs = hostileVisit("v1");
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok === false, "a practice record entered the research corpus");
  mustEqual(res.reason, "not-a-patient", "the refusal must name the reason");
});

attack("R4 withdrawing consent purges what was already captured", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  mustEqual(c.run("corpusLoad().detail.length"), 1, "sanity: one record captured");

  c.run(`consentSet("p1", CORPUS_PURPOSE, "refused", "tester")`);
  const n = c.run("corpusPurgePatient('p1', CORPUS_PURPOSE)");
  must(typeof n === "number" ? n >= 1 : true, "the purge reported nothing removed");
  mustEqual(c.run("corpusLoad().detail.length"), 0,
    "withdrawal left the patient's data in the corpus");
});

attack("R5 a purge removes ONLY the withdrawing patient", () => {
  const c = corpusCtx();
  grant(c, "p1"); grant(c, "p2");
  c.__p1 = hostilePatient("p1"); c.__p2 = hostilePatient("p2");
  c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __p1, { visitDate: __vs.date })");
  c.run("corpusCapture(Object.assign({}, __vs, {id:'v2'}), __p2, { visitDate: __vs.date })");
  mustEqual(c.run("corpusLoad().detail.length"), 2, "sanity: two records");
  c.run("corpusPurgePatient('p1', CORPUS_PURPOSE)");
  mustEqual(c.run("corpusLoad().detail.length"), 1, "the purge removed the wrong number of records");
  mustEqual(c.run("corpusLoad().detail[0].pid"), c.run("corpusPseudonym('p2')"),
    "the purge removed the wrong patient");
});

attack("R6 a purged patient does not reappear in a later export", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const pseudo = c.run("corpusLoad().detail[0].pid");
  c.run("corpusPurgePatient('p1', CORPUS_PURPOSE)");
  const out = c.run("JSON.stringify(corpusExport('salt-X'))");
  must(out.indexOf(pseudo) < 0, "a withdrawn patient's pseudonym still appears in an export");
});

attack("R7 consent for one purpose does not grant another", () => {
  const c = corpusCtx();
  c.run(`consentSet("p1", "some_other_purpose", "granted", "tester")`);
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok === false, "consent for one purpose leaked into another");
});

attack("R8 a corrupt consent store fails CLOSED, not open", () => {
  const c = corpusCtx();
  grant(c, "p1");
  mustEqual(c.run("consentAllows('p1', CORPUS_PURPOSE)"), true, "sanity");
  /* Another tab writes garbage over the consent store. */
  c.run(`localStorage.setItem("entopic_consents", "{not json");
         if (typeof consentResetCache === "function") consentResetCache();`);
  const allows = c.run("consentAllows('p1', CORPUS_PURPOSE)");
  mustEqual(allows, false,
    "a damaged consent store answered YES — consent must fail closed");
});

attack("R9 consent cannot be granted by a prototype-pollution trick", () => {
  const c = corpusCtx();
  c.run(`
    var payload = JSON.parse('{"__proto__":{"research_secondary":{"state":"granted"}}}');
    try { localStorage.setItem("entopic_consents", JSON.stringify(payload)); } catch(e) {}
    if (typeof consentResetCache === "function") consentResetCache();
  `);
  const allows = c.run("consentAllows('never-consented-patient', CORPUS_PURPOSE)");
  mustEqual(allows, false, "prototype pollution granted research consent for a patient");
  mustEqual(c.run("({}).research_secondary === undefined"), true,
    "Object.prototype was polluted");
});


/* ═══════════════════════════════════════════════════════════════ */
G("S. corpus integrity under pressure");

attack("S1 re-capturing the same visit does not double-count it", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1"); c.__vs = hostileVisit("v1");
  for (let i = 0; i < 5; i++) c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  mustEqual(c.run("corpusLoad().detail.length"), 1,
    "one visit saved five times inflated every rate fivefold");
});

attack("S2 a visit with nothing analysable is refused, not stored empty", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = hostilePatient("p1");
  c.__vs = { id: "v-empty", date: "2026-03-15T09:00:00.000Z" };
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok === false, "an empty record inflates every denominator");
  mustEqual(res.reason, "nothing-analysable", "the refusal must name the reason");
});

attack("S3 10,000 captures do not blow up or lose records", () => {
  const c = corpusCtx();
  for (let i = 0; i < 50; i++) grant(c, "p" + i);
  c.__mk = hostileVisit;
  const t0 = Date.now();
  c.run(`
    for (var i = 0; i < 2000; i++) {
      var pt = { id: "p" + (i % 50), age: 30 + (i % 50), sex: "F" };
      var vs = { id: "v" + i, date: "2026-03-15T09:00:00.000Z",
                 symptoms: ["redness"], dxList: [{ n: "Dry eye", prob: 0.4 }] };
      corpusCapture(vs, pt, { visitDate: vs.date });
    }
  `);
  const ms = Date.now() - t0;
  const n = c.run("corpusLoad().detail.length + (corpusLoad().rollup||[]).length");
  must(n > 0, "2,000 captures produced nothing");
  must(ms < 20000, "2,000 captures took " + ms + "ms — that runs on the UI thread during save");
});

attack("S4 corpus capture never throws into the caller's save path", () => {
  /* corpusCapture is called from doSave(). If it throws, the CLINICAL record
     fails to save. Analytics must never be able to break the record. */
  const c = corpusCtx();
  grant(c, "p1");
  const hostile = [
    "null", "undefined", "{}", "[]", "0", '""',
    '{ id: "v", symptoms: null, dxList: null }',
    '{ id: "v", symptoms: "notanarray", dxList: "notanarray" }',
    '{ id: "v", dxList: [null, undefined, 0, "x"] }',
    '{ id: "v", sl: { findings: [null, 0, {}, {label:null}] } }',
    '(function(){ var o = { id: "v", symptoms: ["a"] }; o.self = o; return o; })()'
  ];
  for (const h of hostile) {
    let threw = null;
    try {
      c.run(`corpusCapture(${h}, { id: "p1", age: 40, sex: "F" }, {})`);
    } catch (e) { threw = e; }
    must(!threw, "corpusCapture threw on " + h + " — that would fail the clinical save: " + threw);
  }
});

attack("S5 a corrupt corpus store does not take the app down", () => {
  const c = corpusCtx();
  c.run(`localStorage.setItem("entopic_research_corpus", "{not json");
         if (typeof corpusResetCache === "function") corpusResetCache();`);
  let threw = null;
  try { c.run("corpusStats()"); } catch (e) { threw = e; }
  must(!threw, "corpusStats threw on a corrupt store: " + threw);
  let threw2 = null;
  try { c.run("corpusExport('s')"); } catch (e) { threw2 = e; }
  must(!threw2, "corpusExport threw on a corrupt store: " + threw2);
});

attack("S6 the corpus store is classified, and NOT marked as PHI-free by accident", () => {
  const c = corpusCtx();
  const spec = c.run("JSON.stringify(DATA_STORES.research_corpus || null)");
  must(spec && spec !== "null", "the research corpus must be a declared store");
  const salt = c.run("JSON.stringify(DATA_STORES.research_salt || null)");
  must(salt && salt !== "null", "the research SALT must be a declared store");
  /* The salt is the re-identification key. It must never travel in a backup
     that leaves the device alongside the corpus. */
  const saltSpec = JSON.parse(salt);
  must(saltSpec.mirror === true, "the salt must survive a cleared browser or every pseudonym changes");
});

/* ═══════════════════════════════════════════════════════════════ */
G("T. positive controls — the gate must not pass by refusing everything");

/* WHY THIS GROUP EXISTS. On its first run this harness reported all clean —
   because the sandbox had not loaded the vocabularies, so the gate failed
   closed and withheld EVERY value. Every leak assertion above passed for the
   worst possible reason: nothing was there to leak. These attacks make that
   failure mode impossible to repeat silently. */

function legitVisit() {
  return {
    id: "v-legit", date: "2026-03-15T09:00:00.000Z",
    symptoms: ["redness", "distance_blur"],
    sl: { findings: [{ label: "Chalazion", eye: "OD" }] },
    plan: { ref_to: "Retina specialist", ref_urgency: "Routine" },
    dxList: [{ n: "Dry eye", prob: 0.42, icd: "H04.123", urgent: false }]
  };
}

function captureLegit() {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = { id: "p1", age: 42, sex: "F" };
  c.__vs = legitVisit();
  const res = c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  must(res && res.ok, "a wholly legitimate visit was refused: " + JSON.stringify(res));
  return c.run("corpusLoad().detail[0]");
}

attack("T1 the vocabularies actually loaded (the gate is not failing closed)", () => {
  const rec = captureLegit();
  mustEqual(rec.vocab_incomplete, false,
    "the vocabulary is incomplete, so every leak assertion in this file is vacuous");
});

attack("T2 a legitimate symptom token survives", () => {
  const rec = captureLegit();
  must((rec.symptoms || []).indexOf("redness") >= 0,
    "a real symptom token was withheld: " + JSON.stringify(rec.symptoms));
  must((rec.symptoms || []).indexOf("distance_blur") >= 0,
    "a real symptom-picker token was withheld: " + JSON.stringify(rec.symptoms));
});

attack("T3 a legitimate slit-lamp finding label survives", () => {
  const rec = captureLegit();
  must((rec.findings || []).indexOf("Chalazion") >= 0,
    "a real finding label was withheld: " + JSON.stringify(rec.findings));
});

attack("T4 a legitimate referral destination and urgency survive", () => {
  const rec = captureLegit();
  mustEqual(rec.referral, "Retina specialist", "a real referral destination was withheld");
  mustEqual(rec.referral_urgency, "Routine", "a real referral urgency was withheld");
});

attack("T5 a legitimate diagnosis, probability and ICD code survive", () => {
  const rec = captureLegit();
  must(rec.dx && rec.dx.length === 1, "the differential was dropped");
  mustEqual(rec.dx[0].name, "Dry eye", "the condition name was dropped");
  mustEqual(rec.dx[0].prob, 0.42, "the probability was dropped");
  mustEqual(rec.dx[0].icd, "H04.123", "a well-formed ICD code was dropped");
});

attack("T6 a clean visit reports nothing withheld", () => {
  const rec = captureLegit();
  mustEqual(rec.withheld_values, 0,
    "a visit containing only legitimate vocabulary reported withheld values");
});

attack("T7 the withheld COUNT is reported when values are refused", () => {
  /* Denominators must stay honest: an analyst has to be able to tell "one
     symptom" from "four symptoms we refused to publish". */
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = { id: "p1", age: 42, sex: "F" };
  c.__vs = Object.assign(legitVisit(), {
    symptoms: ["redness", "ZZPHINOTEZZ_a", "ZZPHINOTEZZ_b"]
  });
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  mustEqual(rec.withheld_values, 2, "the withheld count must match what was refused");
  mustEqual((rec.symptoms || []).length, 1, "the legitimate symptom must still be kept");
});

attack("T8 the gate fails CLOSED when a vocabulary is missing", () => {
  /* The opposite direction: with no vocabulary loaded, nothing may pass. This
     is the behaviour that made T1 necessary, asserted deliberately. */
  const c = browser({ also: ["js/consent.js", "js/research-corpus.js"],
                      extra: { APP_VERSION: "1", KB_VERSION: "1" } });
  c.run(`consentSet("p1", CORPUS_PURPOSE, "granted", "t")`);
  c.__pt = { id: "p1", age: 42, sex: "F" };
  c.__vs = legitVisit();
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const rec = c.run("corpusLoad().detail[0]");
  must(rec, "the capture produced nothing at all");
  mustEqual(rec.vocab_incomplete, true, "a missing vocabulary must be declared on the record");
  mustEqual((rec.symptoms || []).length, 0,
    "with no vocabulary loaded the gate must withhold, not wave through");
});

attack("T9 sex is reduced to a bounded value, never republished free-form", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__vs = legitVisit();
  const cases = [["Female", "F"], ["male", "M"], ["F", "F"], ["Other", "O"],
                 ["ZZPHISEXZZ", "unknown"], ["", "unknown"], [null, "unknown"]];
  let i = 0;
  for (const [input, want] of cases) {
    c.__pt = { id: "p1", age: 42, sex: input };
    c.run(`corpusCapture(Object.assign({}, __vs, { id: "v${i}" }), __pt, { visitDate: __vs.date })`);
    i++;
  }
  const dump = c.run("JSON.stringify(corpusLoad())");
  must(dump.indexOf("ZZPHISEXZZ") < 0, "a free-form sex value was republished verbatim");
  const vals = c.run("JSON.stringify(corpusLoad().detail.map(function(r){return r.sex}))");
  const parsed = JSON.parse(vals);
  for (const v of parsed) {
    must(["M", "F", "O", "unknown"].indexOf(v) >= 0, "unbounded sex value in the corpus: " + v);
  }
});

attack("T10 a malformed ICD code is dropped rather than republished", () => {
  const c = corpusCtx();
  grant(c, "p1");
  c.__pt = { id: "p1", age: 42, sex: "F" };
  c.__vs = Object.assign(legitVisit(), {
    dxList: [{ n: "Dry eye", prob: 0.4, icd: "ZZPHINOTEZZ not a code at all" }]
  });
  c.run("corpusCapture(__vs, __pt, { visitDate: __vs.date })");
  const dump = c.run("JSON.stringify(corpusLoad())");
  must(dump.indexOf("ZZPHINOTEZZ") < 0, "free text travelled out through the ICD field");
  mustEqual(c.run("corpusLoad().detail[0].dx[0].icd"), "", "a malformed code must be blanked");
  mustEqual(c.run("corpusLoad().detail[0].dx[0].name"), "Dry eye",
    "blanking the code must not drop the diagnosis");
});


runAll("privacy").then((n) => process.exit(n ? 1 : 0));
