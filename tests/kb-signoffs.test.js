/* ═══════════════════════════════════════════════════════════════ */
/* CLINICAL SIGN-OFF DURABILITY                                     */
/*                                                                  */
/* The founder's review of 394 conditions is the most valuable and  */
/* least reproducible work in this project. These tests pin the     */
/* three properties that protect it:                                */
/*                                                                  */
/*  1. DURABILITY — a sign-off survives reload, a fresh install     */
/*     restoring from backup, and a public release. The admin is    */
/*     never asked to re-verify something already verified.         */
/*                                                                  */
/*  2. HONESTY — a sign-off stops applying if the condition's       */
/*     clinical content changes afterwards. A clinician's name must */
/*     never end up attached to text they did not read.             */
/*                                                                  */
/*  3. NON-DESTRUCTION — importing or restoring merges, and never   */
/*     deletes newer verification work.                             */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* A minimal device: a real localStorage-backed store plus the sign-off module.
   storage.js is not loaded (it drags in the whole app); loadStore/saveStore are
   shimmed to the same contract, including saveStore's boolean return. */
function device(seed) {
  const disk = Object.assign({}, seed || {});
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, isNaN,
    __disk: disk,
    __failWrites: false,
    loadStore: (k, fb) => (Object.prototype.hasOwnProperty.call(disk, k) ? JSON.parse(disk[k]) : fb),
    saveStore: function (k, v) {
      if (ctx.__failWrites) return false;
      disk[k] = JSON.stringify(v);
      return true;
    },
    KB_VERSION: "1.4.0"
  };
  ctx.window = ctx;
  ctx.findCondition = function (name) {
    const all = ctx.KNOWLEDGE_ALL || [];
    for (const c of all) if (c.name === name) return c;
    return null;
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/kb-signoffs.js"), ctx, { filename: "kb-signoffs.js" });
  return ctx;
}

function conditions() {
  return [
    { name: "Dry Eye Disease", domain: "surface", route: "surface",
      req: ["dryness"], sup: ["burning"], con: [], temporal: [], tests: ["tbut"],
      exclusions: [], urgent: false, icd: "H04.123", review_status: "NEEDS_CLINICAL_REVIEW" },
    { name: "Retinal Detachment", domain: "retina", route: "retina",
      req: ["flashes", "floaters"], sup: ["field_loss"], con: [], temporal: ["sudden_onset"],
      tests: ["dilated_fundus"], exclusions: [], urgent: true, icd: "H33.20",
      review_status: "NEEDS_CLINICAL_REVIEW" }
  ];
}

function run(ctx, expr) { return vm.runInContext(expr, ctx); }


/* ═══ 1. Durability ═══ */

test("a sign-off persists to its own store and re-applies on the next boot", () => {
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();

  const rec = run(ctx, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");
  assert.ok(rec && rec.hash, "an attestation is returned with a content fingerprint");
  assert.ok(ctx.__disk.kb_signoffs, "written to the kb_signoffs store, not the content overlay");

  /* A new boot: same disk, fresh KB objects straight from source. */
  const boot2 = device(ctx.__disk);
  boot2.KNOWLEDGE_ALL = conditions();
  const summary = run(boot2, "signoffApplyAll(KNOWLEDGE_ALL)");
  assert.strictEqual(summary.applied, 1);
  assert.strictEqual(summary.stale, 0);
  assert.strictEqual(boot2.KNOWLEDGE_ALL[0].review_status, "VERIFIED_BY_CLINICIAN",
    "the admin must not be asked to verify this again");
  assert.strictEqual(boot2.KNOWLEDGE_ALL[0].review_verified_by, "Dr Nath");
  assert.strictEqual(boot2.KNOWLEDGE_ALL[1].review_status, "NEEDS_CLINICAL_REVIEW",
    "unsigned conditions are untouched");
});

test("a sign-off does NOT freeze the condition's clinical content", () => {
  /* The old implementation persisted the whole condition, so a later KB
     improvement was silently overwritten by the snapshot the signature
     carried. Only the attestation should be stored. */
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  run(ctx, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");

  const stored = JSON.parse(ctx.__disk.kb_signoffs)["Dry Eye Disease"];
  assert.deepStrictEqual(Object.keys(stored).sort(), ["by", "hash", "kb_version", "name", "on"],
    "a sign-off stores an attestation only — no req/sup/con/icd content");
});

test("a sign-off is only reported when it actually reached the disk", () => {
  /* Silent write failure is the P-1 defect. Reporting a verification that was
     not saved would lose the founder's work while telling him it was safe. */
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  ctx.__failWrites = true;
  const rec = run(ctx, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");
  assert.strictEqual(rec, null, "an unpersisted sign-off must not be returned as recorded");
});


/* ═══ 2. Honesty — content drift invalidates a signature ═══ */

test("changing the clinical content after sign-off requires re-review", () => {
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  run(ctx, "signoffRecord(findCondition('Retinal Detachment'), 'Dr Nath')");

  /* A later release changes what the condition actually requires. */
  const boot2 = device(ctx.__disk);
  boot2.KNOWLEDGE_ALL = conditions();
  boot2.KNOWLEDGE_ALL[1].req = ["flashes", "floaters", "curtain"];

  const summary = run(boot2, "signoffApplyAll(KNOWLEDGE_ALL)");
  assert.strictEqual(summary.applied, 0);
  assert.strictEqual(summary.stale, 1);
  const c = boot2.KNOWLEDGE_ALL[1];
  assert.strictEqual(c.review_status, "NEEDS_CLINICAL_REVIEW",
    "a clinician's signature must not transfer to text they never read");
  assert.strictEqual(c.review_stale, true, "flagged as stale, not silently unsigned");
  assert.strictEqual(c.review_prev_by, "Dr Nath", "the previous sign-off is preserved for context");
  assert.ok(c.review_prev_on, "with its date");
});

test("changing the urgency flag invalidates a signature", () => {
  /* Urgency is the safety-critical field. Flipping it must never inherit an
     old approval. */
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  run(ctx, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");

  const boot2 = device(ctx.__disk);
  boot2.KNOWLEDGE_ALL = conditions();
  boot2.KNOWLEDGE_ALL[0].urgent = true;
  const summary = run(boot2, "signoffApplyAll(KNOWLEDGE_ALL)");
  assert.strictEqual(summary.stale, 1, "an urgency change must force re-review");
});

test("cosmetic reordering does NOT invalidate a signature", () => {
  /* Otherwise every KB tidy-up would dump hundreds of conditions back into the
     queue and the honesty check would be trained away as noise. */
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  run(ctx, "signoffRecord(findCondition('Retinal Detachment'), 'Dr Nath')");

  const boot2 = device(ctx.__disk);
  boot2.KNOWLEDGE_ALL = conditions();
  boot2.KNOWLEDGE_ALL[1].req = ["floaters", "flashes"];   /* same set, different order */
  const summary = run(boot2, "signoffApplyAll(KNOWLEDGE_ALL)");
  assert.strictEqual(summary.applied, 1, "reordering is not a content change");
  assert.strictEqual(summary.stale, 0);
});

test("the review_* fields are excluded from the fingerprint", () => {
  /* Including them would make every attestation stale the instant it was made. */
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  const before = run(ctx, "signoffHash(findCondition('Dry Eye Disease'))");
  ctx.KNOWLEDGE_ALL[0].review_status = "VERIFIED_BY_CLINICIAN";
  ctx.KNOWLEDGE_ALL[0].review_verified_by = "Dr Nath";
  const after = run(ctx, "signoffHash(findCondition('Dry Eye Disease'))");
  assert.strictEqual(before, after);
});


/* ═══ 3. Portability and non-destruction ═══ */

test("export/import moves sign-offs to a fresh device", () => {
  /* The founder is not an engineer: he must be able to carry his own work to a
     new machine without anyone committing a file for him. */
  const source = device();
  source.KNOWLEDGE_ALL = conditions();
  run(source, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");
  run(source, "signoffRecord(findCondition('Retinal Detachment'), 'Dr Nath')");
  const payload = run(source, "signoffExportPayload()");
  assert.strictEqual(payload.count, 2);
  assert.strictEqual(payload.format, "entopic-signoffs");

  const fresh = device();
  fresh.KNOWLEDGE_ALL = conditions();
  fresh.__payload = JSON.parse(JSON.stringify(payload));
  const res = run(fresh, "signoffImportPayload(__payload)");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.added, 2);
  assert.strictEqual(res.stale, 0);
  assert.strictEqual(fresh.KNOWLEDGE_ALL[0].review_status, "VERIFIED_BY_CLINICIAN");
  assert.strictEqual(fresh.KNOWLEDGE_ALL[1].review_status, "VERIFIED_BY_CLINICIAN");
});

test("import merges and never deletes newer local work", () => {
  const local = device();
  local.KNOWLEDGE_ALL = conditions();
  run(local, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Local', '2026-07-30')");
  run(local, "signoffRecord(findCondition('Retinal Detachment'), 'Dr Local', '2026-07-30')");

  /* An OLDER file naming one of the same conditions, plus nothing new. */
  local.__payload = {
    format: "entopic-signoffs", version: 1, signoffs: [
      { name: "Dry Eye Disease", on: "2026-01-01", by: "Dr Older",
        hash: run(local, "signoffHash(findCondition('Dry Eye Disease'))") }
    ]
  };
  const res = run(local, "signoffImportPayload(__payload)");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.skipped, 1, "the older attestation must not overwrite the newer one");

  const map = JSON.parse(local.__disk.kb_signoffs);
  assert.strictEqual(map["Dry Eye Disease"].by, "Dr Local", "newer local sign-off retained");
  assert.ok(map["Retinal Detachment"], "sign-offs absent from the file are not deleted");
});

test("import flags sign-offs whose content has since changed", () => {
  const source = device();
  source.KNOWLEDGE_ALL = conditions();
  run(source, "signoffRecord(findCondition('Retinal Detachment'), 'Dr Nath')");
  const payload = run(source, "signoffExportPayload()");

  const other = device();
  other.KNOWLEDGE_ALL = conditions();
  other.KNOWLEDGE_ALL[1].urgent = false;   /* this device has different content */
  other.__payload = JSON.parse(JSON.stringify(payload));
  const res = run(other, "signoffImportPayload(__payload)");
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.stale, 1, "imported but flagged — not silently accepted as current");
  assert.strictEqual(other.KNOWLEDGE_ALL[1].review_status, "NEEDS_CLINICAL_REVIEW");
});

test("a junk file is refused with a plain-language reason, changing nothing", () => {
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  run(ctx, "signoffRecord(findCondition('Dry Eye Disease'), 'Dr Nath')");
  const beforeDisk = ctx.__disk.kb_signoffs;

  for (const junk of ['null', '{}', '{"format":"something-else","signoffs":[]}',
                      '{"format":"entopic-signoffs"}']) {
    ctx.__payload = JSON.parse(junk);
    const res = run(ctx, "signoffImportPayload(__payload)");
    assert.strictEqual(res.ok, false, "refused: " + junk);
    assert.ok(res.error && res.error.length > 10, "with a readable reason");
  }
  assert.strictEqual(ctx.__disk.kb_signoffs, beforeDisk, "nothing was written");
});

test("import reports failure when the device cannot persist", () => {
  const ctx = device();
  ctx.KNOWLEDGE_ALL = conditions();
  ctx.__payload = { format: "entopic-signoffs", version: 1,
    signoffs: [{ name: "Dry Eye Disease", on: "2026-07-31", by: "Dr Nath", hash: "deadbeef" }] };
  ctx.__failWrites = true;
  const res = run(ctx, "signoffImportPayload(__payload)");
  assert.strictEqual(res.ok, false);
  assert.ok(/full/i.test(res.error), "the reason names the actual problem");
});


/* ═══ 4. The wiring that makes durability real ═══ */

test("sign-offs are mirrored and included in the backup payload", () => {
  /* Both were missing, which is how the work could be destroyed with nothing
     to restore from. Read from the real sources so this cannot pass by
     copying a list into the test. */
  const mirror = read("js/storage-mirror.js");
  const keys = /var MIRROR_KEYS = \[([^\]]*)\]/.exec(mirror);
  assert.ok(keys, "MIRROR_KEYS not found");
  assert.ok(keys[1].indexOf("kb_signoffs") >= 0,
    "kb_signoffs must be mirrored — otherwise a cleared browser destroys every sign-off");

  const storage = read("js/storage.js");
  const payload = /function buildBackupPayload\(\)[\s\S]*?\n}/.exec(storage);
  assert.ok(payload, "buildBackupPayload not found");
  assert.ok(/kb_signoffs/.test(payload[0]),
    "the backup must carry sign-offs — a restore that drops them loses irreplaceable review work");

  assert.ok(/data\.kb_signoffs/.test(storage),
    "the restore path must read kb_signoffs back");
});

test("verifying records a sign-off rather than a content upsert", () => {
  const src = read("js/kb-review.js");
  const fn = /function kbRapidVerify[\s\S]*?\n}/.exec(src);
  assert.ok(fn, "kbRapidVerify not found");
  assert.ok(/signoffRecord\(/.test(fn[0]), "must record an attestation");
  assert.ok(!/kbApplyLocalConditionUpsert\(/.test(fn[0]),
    "must NOT write the whole condition into the content overlay — that froze the KB " +
    "content at sign-off time and shadowed later improvements");
});

test("boot applies sign-offs to the knowledge base", () => {
  const app = read("js/app.js");
  assert.ok(/signoffApplyAll\(KNOWLEDGE_ALL\)/.test(app),
    "init() must apply sign-offs, or every verified condition returns to the queue on reload");
});
