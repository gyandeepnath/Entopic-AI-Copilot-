/* ═══════════════════════════════════════════════════════════════ */
/* ATTACHMENT VALIDATION  (security audit SEC-5)                    */
/*                                                                  */
/* The file input carries accept="image/*,application/pdf". That is  */
/* a UI hint and nothing more: drag-and-drop ignores it, and so does */
/* anything calling fsIngest directly. Measured — fsIngest checked   */
/* size and emptiness and never looked at the type at all.           */
/*                                                                   */
/* The risk is NOT code execution: attachments are stored as blobs   */
/* and rendered through an object URL, never evaluated. It is a      */
/* clinic's storage filling with things that are not clinical        */
/* documents, and onward transmission — an attachment travels in a   */
/* backup, to the cloud, and sometimes to a referral.                */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const F = require("../js/file-store.js");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

const file = (name, type) => ({ name, type, size: 1000 });


/* ═══ THE ALLOW-LIST ═══ */

test("clinical document types are accepted", () => {
  for (const t of ["image/jpeg", "image/png", "image/tiff", "application/pdf", "image/heic"]) {
    assert.strictEqual(F.fsTypeAllowed(file("scan", t)), true, t + " must be accepted");
  }
});

test("everything else is refused", () => {
  const refused = [
    "text/html", "application/javascript", "text/javascript",
    "application/x-msdownload", "application/zip", "application/x-sh",
    "text/csv", "application/vnd.ms-excel", "video/mp4", "audio/mpeg"
  ];
  for (const t of refused) {
    assert.strictEqual(F.fsTypeAllowed(file("thing", t)), false, t + " must be refused");
  }
});

test("it is an ALLOW-list, not a deny-list", () => {
  /* A deny-list of dangerous extensions is a list you are always one entry
     behind on. An unknown future type must default to refused. */
  assert.strictEqual(F.fsTypeAllowed(file("x", "application/some-new-thing-2030")), false);
  assert.strictEqual(F.fsTypeAllowed(file("x", "")), false, "no type and no usable name → refused");
});

test("a browser that reports no MIME type falls back to the extension", () => {
  /* Common for TIFF from imaging devices and HEIC on some platforms. */
  assert.strictEqual(F.fsTypeAllowed({ name: "oct.tif", type: "", size: 10 }), true);
  assert.strictEqual(F.fsTypeAllowed({ name: "field.PDF", type: "", size: 10 }), true);
  assert.strictEqual(F.fsTypeAllowed({ name: "payload.exe", type: "", size: 10 }), false);
  assert.strictEqual(F.fsTypeAllowed({ name: "notes.html", type: "", size: 10 }), false);
});

test("a MIME type with parameters is still matched", () => {
  assert.strictEqual(F.fsTypeAllowed(file("x", "image/jpeg; charset=binary")), true);
  assert.strictEqual(F.fsTypeAllowed(file("x", "IMAGE/PNG")), true);
});

test("a double extension does not sneak past", () => {
  /* "report.pdf.html" — the browser reports text/html, which is refused; and
     with no type at all the regex is anchored to the END of the name. */
  assert.strictEqual(F.fsTypeAllowed(file("report.pdf.html", "text/html")), false);
  assert.strictEqual(F.fsTypeAllowed({ name: "report.pdf.html", type: "", size: 10 }), false);
});


/* ═══ CONTENT SNIFFING — the file's own account of itself ═══ */

/* A minimal fake File: the browser derives `type` from the extension, so both
   the name and the type are the uploader's word for it. The bytes are not. */
function fakeFile(name, type, bytes) {
  const buf = Uint8Array.from(bytes);
  return {
    name, type, size: buf.length,
    slice: () => ({ __buf: buf })
  };
}

/* Node has no FileReader; provide the minimum fsSniff uses. */
function withFileReader(fn) {
  const had = global.FileReader;
  global.FileReader = class {
    readAsArrayBuffer(slice) {
      this.result = slice.__buf.buffer;
      setImmediate(() => this.onload && this.onload());
    }
  };
  return Promise.resolve(fn()).finally(() => {
    if (had === undefined) delete global.FileReader; else global.FileReader = had;
  });
}

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37];      /* %PDF-1.7 */
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const HTML = [0x3c, 0x21, 0x44, 0x4f, 0x43, 0x54, 0x59, 0x50];      /* <!DOCTYP */

test("a genuine PDF passes the content check", () => withFileReader(async () => {
  const r = await F.fsSniff(fakeFile("scan.pdf", "application/pdf", PDF));
  assert.strictEqual(r.ok, true, r.reason);
}));

test("HTML renamed to .pdf is caught by the content check", () => withFileReader(async () => {
  /* A renamed file passes both the extension check and the MIME check,
     because the browser derives the type from the name. */
  const r = await F.fsSniff(fakeFile("report.pdf", "application/pdf", HTML));
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /do not match/);
}));

test("HTML renamed to .png is caught too", () => withFileReader(async () => {
  const r = await F.fsSniff(fakeFile("photo.png", "image/png", HTML));
  assert.strictEqual(r.ok, false);
}));

test("a genuine PNG passes", () => withFileReader(async () => {
  const r = await F.fsSniff(fakeFile("photo.png", "image/png", PNG));
  assert.strictEqual(r.ok, true, r.reason);
}));

test("a format with no checkable signature is accepted, not refused", () => withFileReader(async () => {
  /* Deliberately advisory-shaped. Refusing a legitimate scan from an unusual
     device is a worse failure in a clinic than accepting an odd file. */
  const r = await F.fsSniff(fakeFile("oct.tif", "image/tiff", [0x49, 0x49, 0x2a, 0x00]));
  assert.strictEqual(r.ok, true);
}));

test("no FileReader means no refusal", () => {
  /* Fails OPEN. A browser without FileReader must not lose the ability to
     attach a scan. */
  return F.fsSniff(fakeFile("x.pdf", "application/pdf", PDF)).then((r) => {
    assert.strictEqual(r.ok, true);
  });
});


/* ═══ WIRING — the checks must actually be in the ingest path ═══ */

test("the type check runs before anything is stored", () => {
  const src = read("js/file-store.js");
  const body = src.slice(src.indexOf("function fsIngest"), src.indexOf("function fsResolveUrl"));
  const typeAt = body.indexOf("fsTypeAllowed(file)");
  const putAt = body.indexOf("fsPut(");
  assert.ok(typeAt > 0, "fsIngest must check the type");
  assert.ok(typeAt < putAt, "and must do it before the bytes are stored");
});

test("the content check gates the store, not merely the message", () => {
  const src = read("js/file-store.js");
  const body = src.slice(src.indexOf("function fsIngest"), src.indexOf("function fsResolveUrl"));
  assert.ok(/gate\.then\([\s\S]{0,300}sniff\.ok[\s\S]{0,300}throw/.test(body),
    "a failed sniff must throw before fsPut, not just log");
  assert.ok(body.indexOf("gate.then") < body.indexOf("fsPut("));
});

test("the size and emptiness guards are still there", () => {
  const src = read("js/file-store.js");
  assert.ok(src.indexOf("FS_ABS_MAX") > 0, "the per-file ceiling must survive");
  assert.ok(/is empty \(0 B\)/.test(src), "the zero-byte guard must survive");
});

test("the refusal explains what a clinical record holds", () => {
  /* A refusal a clinician cannot act on is a support ticket. */
  const src = read("js/file-store.js");
  assert.ok(/scans, photographs/.test(src), "say what IS accepted, not only what is not");
});


/* ═══════════════════════════════════════════════════════════════ */
/* THE DEFAULT EXPORT IS ENCRYPTED  (security audit SEC-3)          */
/*                                                                  */
/* A backup file travels: a USB stick, a Downloads folder, an email  */
/* to whoever is helping. It is the copy of the records most likely  */
/* to leave the building, and it was the one with no protection —    */
/* the encrypted export existed, and it was the second button.       */
/* ═══════════════════════════════════════════════════════════════ */

const vm = require("node:vm");

function backupSandbox(answers) {
  const calls = { plain: 0, encrypted: [], audits: [], prompts: [], confirms: [] };
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, Promise, Error,
    parseInt, isFinite, Boolean,
    module: { exports: {} },
    STORE_VERSION: "1.0.0",
    DATA_STORES: {}, dataStoresWith: () => [],
    loadStore: () => null, saveStore: () => true,
    loadUsers: () => [], loadPatients: () => [], loadVisits: () => [],
    loadSettings: () => ({}), loadAudit: () => [],
    dlSaveAs: () => { calls.plain++; return true; },
    logAudit: (a, d) => calls.audits.push({ a, d }),
    backupEncrypt: (payload, pass) => { calls.encrypted.push(pass); return Promise.resolve({ ct: "x" }); },
    prompt: (msg) => { calls.prompts.push(msg); return answers.pass; },
    confirm: (msg) => { calls.confirms.push(msg); return answers.confirm !== false; },
    alert: () => {}
  };
  vm.createContext(ctx);
  vm.runInContext(read("js/storage-backup.js"), ctx, { filename: "storage-backup.js" });
  ctx._calls = calls;
  return ctx;
}

test("SEC-3 · the default export asks for a passphrase and encrypts", async () => {
  const ctx = backupSandbox({ pass: "a good long passphrase" });
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.ifError(res.e);
  assert.strictEqual(res.o.encrypted, true);
  assert.strictEqual(ctx._calls.encrypted.length, 1);
  assert.strictEqual(ctx._calls.encrypted[0], "a good long passphrase");
});

test("SEC-3 · the prompt says the file cannot be restored without it", () => {
  const ctx = backupSandbox({ pass: null });
  vm.runInContext("exportBackup(function () {});", Object.assign(ctx, { __done: () => {} }));
  assert.match(ctx._calls.prompts[0], /CANNOT be restored without it/);
  assert.match(ctx._calls.prompts[0], /every patient record/);
});

test("SEC-3 · cancelling exports nothing", async () => {
  const ctx = backupSandbox({ pass: null });
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.strictEqual(res.o.cancelled, true);
  assert.strictEqual(ctx._calls.plain, 0);
  assert.strictEqual(ctx._calls.encrypted.length, 0);
});

test("SEC-3 · plaintext stays reachable, but needs a second explicit confirmation", async () => {
  /* A clinic migrating to another system, or an engineer helping at 9 a.m.,
     genuinely needs it. It must not be the path of least resistance. */
  const ctx = backupSandbox({ pass: "", confirm: true });
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.strictEqual(res.o.encrypted, false);
  assert.strictEqual(ctx._calls.plain, 1);
  assert.match(ctx._calls.confirms[0], /in plain text/);
  assert.ok(ctx._calls.audits.some((a) => a.a === "data_exported_unencrypted"),
    "an unencrypted export of every record must be on the audit trail");
});

test("SEC-3 · declining that confirmation exports nothing", async () => {
  const ctx = backupSandbox({ pass: "", confirm: false });
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.strictEqual(res.o.cancelled, true);
  assert.strictEqual(ctx._calls.plain, 0);
});

test("SEC-3 · a weak passphrase is refused rather than quietly accepted", async () => {
  const ctx = backupSandbox({ pass: "short" });
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.ok(res.e);
  assert.match(res.e.message, /at least 10 characters/);
  assert.strictEqual(ctx._calls.encrypted.length, 0);
});

test("SEC-3 · no crypto falls back to exporting rather than refusing to back up", async () => {
  /* An unencrypted backup is far better than none — and the caller is told. */
  const ctx = backupSandbox({ pass: "x" });
  vm.runInContext("backupEncrypt = undefined;", ctx);
  const res = await new Promise((r) => vm.runInContext("exportBackup(function (e, o) { __done(e, o); })",
    Object.assign(ctx, { __done: (e, o) => r({ e, o }) })));
  assert.strictEqual(res.o.encrypted, false);
  assert.match(res.o.reason, /unavailable/);
  assert.strictEqual(ctx._calls.plain, 1);
});

test("SEC-3 · the buttons call the encrypted-by-default path", () => {
  for (const f of ["js/app.js", "js/data-export.js"]) {
    const src = read(f);
    const buttons = [...src.matchAll(/onclick="(export[A-Za-z]*)\(\)"/g)].map((m) => m[1]);
    assert.ok(!buttons.includes("exportAllData"),
      f + " still has a button wired straight to the plaintext export");
  }
});
