/* ═══════════════════════════════════════════════════════════════ */
/* CORRUPTED STORE RECOVERY — FAILURE INJECTION                     */
/*                                                                  */
/* The test-suite audit found this whole dimension untested, and    */
/* the gap was hiding a critical data-loss bug. Reproduced in a     */
/* real browser before writing these tests:                         */
/*                                                                  */
/*   create 3 patients                                              */
/*   truncate entopic_patients (what a crash mid-write produces)    */
/*   reload            -> the app shows 0 patients, no warning      */
/*   one ordinary save -> 1 patient stored; the other 3 gone        */
/*                        permanently, and the IndexedDB safety     */
/*                        mirror had been overwritten with the      */
/*                        corrupt bytes too                         */
/*                                                                  */
/* The distinction that fixes it: ABSENT and CORRUPT are different  */
/* states. Absent legitimately reads as empty. Corrupt must block   */
/* writes, keep a copy of the damaged bytes, and say so loudly —    */
/* the same reasoning already applied to a locked vault, which had  */
/* simply never been extended to damaged data.                      */
/*                                                                  */
/* These tests inject the failure rather than assert on tidy code   */
/* paths: each one puts genuinely broken bytes on the fake disk and */
/* checks that real records survive.                                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const REAL_PATIENTS = [
  { id: "p1", first_name: "Meera", last_name: "Nair", dob: "1978-04-02" },
  { id: "p2", first_name: "Arun", last_name: "Das", dob: "1990-11-19" },
  { id: "p3", first_name: "Sara", last_name: "Iqbal", dob: "1965-02-08" }
];

/* A device whose localStorage we can damage at will. */
function device(seedRaw) {
  const disk = Object.assign({}, seedRaw || {});
  const mirrorWrites = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, isNaN, parseInt, parseFloat,
    __disk: disk,
    __mirrorWrites: mirrorWrites,
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(disk, k) ? disk[k] : null),
      setItem: (k, v) => { disk[k] = String(v); },
      removeItem: (k) => { delete disk[k]; },
      get length() { return Object.keys(disk).length; },
      key: (i) => Object.keys(disk)[i]
    },
    /* Record what the mirror is asked to store so we can prove corrupt bytes
       never reach it. */
    mirrorStore: (k, data) => { mirrorWrites.push({ key: k, data: data }); },
    mirrorRemove: () => {}
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/browser-io.js"), ctx, { filename: "browser-io.js" });
  vm.runInContext(read("js/storage.js"), ctx, { filename: "storage.js" });
  return ctx;
}

function run(ctx, expr) { return vm.runInContext(expr, ctx); }

const GOOD = { entopic_patients: JSON.stringify(REAL_PATIENTS) };


/* ═══ Detection ═══ */

test("truncated JSON is detected as corrupt, not read as an empty clinic", () => {
  const whole = JSON.stringify(REAL_PATIENTS);
  const ctx = device({ entopic_patients: whole.slice(0, Math.floor(whole.length * 0.6)) });

  const got = run(ctx, "loadPatients()");
  assert.strictEqual(got.length, 0, "the damaged store cannot yield records");
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), true,
    "and it must be RECORDED as damaged — this is the difference between " +
    "'no patients' and 'cannot read the patients'");
});

test("valid JSON of the wrong shape is corrupt too", () => {
  /* Survives JSON.parse, so it is more dangerous than unreadable bytes: it
     reaches every caller that iterates the list. */
  for (const bad of ['{"oops":1}', '"a string"', '42', 'null']) {
    const ctx = device({ entopic_patients: bad });
    assert.strictEqual(run(ctx, "loadPatients().length"), 0, "yields no records: " + bad);
    assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), true,
      "a non-list in a list store is corrupt: " + bad);
  }
});

test("an absent store is NOT corrupt — a new device must still work", () => {
  const ctx = device({});
  assert.strictEqual(run(ctx, "loadPatients().length"), 0);
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), false,
    "a fresh install has no patients; that is not damage");
  assert.notStrictEqual(run(ctx, "saveStore('patients', [{id:'p1'}])"), false,
    "and writes must proceed normally");
  assert.strictEqual(run(ctx, "loadPatients().length"), 1);
});

test("a healthy store reads back exactly and is not flagged", () => {
  const ctx = device(GOOD);
  assert.strictEqual(run(ctx, "loadPatients().length"), 3);
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), false);
});


/* ═══ The actual data loss ═══ */

test("a corrupt store REFUSES writes, so damaged records are not overwritten", () => {
  /* This is the bug. Without the refusal, the app holds the empty fallback it
     was handed and saves it straight over three real patients. */
  const whole = JSON.stringify(REAL_PATIENTS);
  const damaged = whole.slice(0, Math.floor(whole.length * 0.6));
  const ctx = device({ entopic_patients: damaged });

  run(ctx, "loadPatients()");                        /* app reads: gets [] */
  const ok = run(ctx, "saveStore('patients', [{id:'new', first_name:'New'}])");

  assert.strictEqual(ok, false, "the write must be refused");
  assert.strictEqual(ctx.__disk.entopic_patients, damaged,
    "the damaged bytes must be UNTOUCHED — they are the only remaining copy " +
    "of three real patients and may still be recoverable by hand");
});

test("the damaged bytes are quarantined under a separate key", () => {
  const whole = JSON.stringify(REAL_PATIENTS);
  const ctx = device({ entopic_patients: whole.slice(0, 40) });
  run(ctx, "loadPatients()");

  const info = run(ctx, "storageCorruptStores()")[0];
  assert.ok(info.quarantine, "a copy is kept under its own key");
  const kept = ctx.__disk[info.quarantine];
  assert.strictEqual(kept, whole.slice(0, 40),
    "byte-identical, so nothing is lost even if the main key is later replaced");
  assert.ok(/Meera/.test(kept), "and it still contains recoverable patient data");
});

test("corruption is reported, with the reason and which store", () => {
  const ctx = device({ entopic_patients: "{not json", entopic_visits: '"wrong shape"' });
  run(ctx, "loadPatients()");
  run(ctx, "loadVisits()");

  const stores = run(ctx, "storageCorruptStores()");
  const keys = stores.map((s) => s.key).sort();
  assert.deepStrictEqual(keys, ["patients", "visits"]);
  for (const s of stores) {
    assert.ok(s.reason && s.reason.length, "each names why it could not be read");
    assert.ok(s.at, "and when it was noticed");
  }
});

test("other stores keep working while one is damaged", () => {
  /* A damaged patient list must not take the whole app down — the clinician
     still needs to reach Admin and restore a backup. */
  const ctx = device({ entopic_patients: "{broken", entopic_settings: '{"clinic":"Entopic"}' });
  run(ctx, "loadPatients()");
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), true);
  assert.strictEqual(run(ctx, "storageIsCorrupt('settings')"), false);
  assert.strictEqual(run(ctx, "loadStore('settings', {}).clinic"), "Entopic");
  assert.notStrictEqual(run(ctx, "saveStore('settings', {clinic:'X'})"), false,
    "an undamaged store still saves");
  assert.strictEqual(run(ctx, "loadStore('settings', {}).clinic"), "X");
});

test("recovery: replacing the damaged bytes with good data clears the block", () => {
  const ctx = device({ entopic_patients: "{broken" });
  run(ctx, "loadPatients()");
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), true);

  /* What a restore-from-backup does. */
  ctx.__disk.entopic_patients = JSON.stringify(REAL_PATIENTS);
  assert.strictEqual(run(ctx, "loadPatients().length"), 3, "records are back");
  assert.strictEqual(run(ctx, "storageIsCorrupt('patients')"), false,
    "a successful read clears the flag");
  assert.notStrictEqual(run(ctx, "saveStore('patients', [])"), false,
    "and writes are allowed again");
});

test("an operator can explicitly accept the loss, and only then", () => {
  /* Nothing calls this automatically. Giving up on the records is a decision
     a person makes, having been told what is being given up. */
  const ctx = device({ entopic_patients: "{broken" });
  run(ctx, "loadPatients()");
  assert.strictEqual(run(ctx, "saveStore('patients', [{id:'x'}])"), false);

  assert.strictEqual(run(ctx, "storageAcceptCorruptLoss('patients')"), true);
  run(ctx, "saveStore('patients', [{id:'x'}])");
  assert.strictEqual(run(ctx, "loadPatients().length"), 1, "writes proceed after acceptance");
  assert.strictEqual(run(ctx, "storageAcceptCorruptLoss('nothing_wrong')"), false,
    "and it is a no-op for a healthy store");
});


/* ═══ The safety mirror must not inherit the damage ═══ */

test("corrupt bytes are never copied over the mirror's good copy", () => {
  /* The mirror exists to survive exactly this. Seeding it from a damaged
     localStorage destroyed the safety net at the moment it was needed. */
  const mirrorSrc = read("js/storage-mirror.js");
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Object, Array, String, Date,
    indexedDB: null,
    __put: []
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(mirrorSrc, ctx, { filename: "storage-mirror.js" });

  const valid = (k, raw) => vm.runInContext("mirrorRawLooksValid", ctx)(k, raw);

  assert.strictEqual(valid("patients", JSON.stringify(REAL_PATIENTS)), true, "good list mirrors");
  assert.strictEqual(valid("patients", '[{"id":"p1"}'), false, "truncated does not");
  assert.strictEqual(valid("patients", '{"oops":1}'), false, "wrong shape does not");
  assert.strictEqual(valid("patients", 'null'), false, "null does not");
  assert.strictEqual(valid("settings", '{"clinic":"Entopic"}'), true,
    "object stores still mirror — settings is legitimately an object");
  assert.strictEqual(valid("patients", '{"ct":"…","iv":"…"}'), true,
    "an encrypted envelope is opaque by design and must still mirror");
});

test("the mirror seeder consults that check rather than copying blindly", () => {
  const src = read("js/storage-mirror.js");
  const fn = /function mirrorSeedFromLocalStorage[\s\S]*?\n}/.exec(src);
  assert.ok(fn, "mirrorSeedFromLocalStorage not found");
  assert.ok(/mirrorRawLooksValid\(/.test(fn[0]),
    "the seeder must validate before overwriting the mirror — copying raw bytes " +
    "unconditionally is how the safety net inherited the corruption");
});
