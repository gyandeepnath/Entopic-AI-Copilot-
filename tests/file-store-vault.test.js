/* ═══════════════════════════════════════════════════════════════ */
/* ATTACHMENTS UNDER THE VAULT, AND IN THE CLOUD                     */
/*                                                                  */
/* Second full audit, 2026-10-27. Two defects:                       */
/*  1. With the record vault ON, attached files (scans, photos,      */
/*     referral PDFs — often bearing the patient's name) were still  */
/*     stored in IndexedDB as raw files: the one part of the record  */
/*     a stolen laptop still gave up.                                */
/*  2. fsCloudUpload sent the file itself, in the clear, under a     */
/*     path containing its original filename, as soon as anyone was  */
/*     signed in — bypassing the consent gate and the client-side    */
/*     encryption every patient record goes through.                 */
/* Real AES-GCM (Node webcrypto) and real Blobs; a Map stands in for */
/* IndexedDB, with the cursor the seal-existing pass needs.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { webcrypto } = require("node:crypto");

const read = (f) => fs.readFileSync(path.resolve(__dirname, "..", f), "utf8");

function fakeIndexedDB(data) {
  const later = (f) => setTimeout(f, 0);
  return {
    open() {
      const rq = {};
      later(() => {
        rq.result = {
          objectStoreNames: { contains: () => true },
          close() {},
          transaction() {
            const tx = {};
            const store = {
              put(v, k) { data.set(k, v); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
              get(k) { const r = { result: data.get(k) }; later(() => tx.oncomplete && tx.oncomplete()); return r; },
              delete(k) { data.delete(k); later(() => tx.oncomplete && tx.oncomplete()); return {}; },
              openCursor() {
                const keys = Array.from(data.keys());
                let i = 0;
                const rq2 = {};
                const step = () => {
                  if (i < keys.length) {
                    const k = keys[i++];
                    rq2.result = { key: k, value: data.get(k), continue: () => later(step) };
                  } else {
                    rq2.result = null;
                    later(() => tx.oncomplete && tx.oncomplete());
                  }
                  rq2.onsuccess && rq2.onsuccess();
                };
                later(step);
                return rq2;
              }
            };
            tx.objectStore = () => store;
            return tx;
          }
        };
        rq.onsuccess && rq.onsuccess();
      });
      return rq;
    }
  };
}

async function device(opts) {
  opts = opts || {};
  const data = new Map();
  const key = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const phiKey = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const vault = { on: !!opts.vault, unlocked: true };
  const uploads = [];
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    Blob, Uint8Array, ArrayBuffer, Promise, JSON, Math, Date, String, Number, Array, Object, RegExp, Error,
    setTimeout, crypto: webcrypto, navigator: {},
    indexedDB: fakeIndexedDB(data),
    URL: { createObjectURL: (b) => b, revokeObjectURL() {} },
    vaultEnabled: () => vault.on,
    vaultUnlocked: () => vault.unlocked,
    vaultEncryptBytes: (buf, k) => {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      return webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, k || key, buf)
        .then((ct) => ({ __vaultbytes: "t", iv, ct }));
    },
    vaultDecryptBytes: (env, k) => webcrypto.subtle.decrypt({ name: "AES-GCM", iv: env.iv }, k || key, env.ct),
    cloudConfigured: () => true,
    CLOUD: { session: { access_token: "tok" } },
    CLOUD_CONFIG: { url: "https://x.supabase.co", anonKey: "anon" },
    phiArmed: () => !!opts.phiArmed,
    phiEncryptBytes: (buf) => {
      const iv = webcrypto.getRandomValues(new Uint8Array(12));
      return webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, phiKey, buf).then((ct) => {
        const out = new Uint8Array(12 + ct.byteLength); out.set(iv, 0); out.set(new Uint8Array(ct), 12); return out;
      });
    },
    fetch: async (url, init) => { uploads.push({ url, init }); return { ok: true, status: 200 }; }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(read("js/file-store.js"), ctx, { filename: "file-store.js" });
  ctx.__data = data; ctx.__vault = vault; ctx.__key = key; ctx.__uploads = uploads;
  return ctx;
}

const SECRET = "%PDF-1.4 Patient: Meera Nair MRN-4471";
const pdf = () => { const b = new Blob([SECRET], { type: "application/pdf" }); b.name = "Meera_Nair_OCT.pdf"; return b; };
async function bytesOf(v) {
  if (v && typeof v.arrayBuffer === "function") return Buffer.from(await v.arrayBuffer()).toString("latin1");
  if (v && v.env) return Buffer.from(v.env.ct).toString("latin1");
  return "";
}

test("with the vault on, an attachment is stored sealed — and still opens", async () => {
  const ctx = await device({ vault: true });
  const rec = await ctx.fsIngest(pdf(), { skipSniff: true, compress: false });
  const stored = ctx.__data.get(rec.id);
  assert.doesNotMatch(await bytesOf(stored), /Meera Nair/, "the file sat on disk in the clear beside an encrypted vault");
  assert.strictEqual(rec.sealed, true);
  const opened = await ctx.fsResolveUrl(rec);
  assert.match(await bytesOf(opened), /Meera Nair/, "a sealed attachment must still open");
  ctx.__vault.unlocked = false;
  assert.strictEqual(await ctx.fsResolveUrl(rec), "", "but not while the vault is locked");
});

test("with the vault off, attachments are stored as before", async () => {
  const ctx = await device({ vault: false });
  const rec = await ctx.fsIngest(pdf(), { skipSniff: true, compress: false });
  assert.match(await bytesOf(ctx.__data.get(rec.id)), /Meera Nair/);
});

test("attachments stored before the vault are sealed when it opens, and unsealed before it is turned off", async () => {
  const ctx = await device({ vault: false });
  const rec = await ctx.fsIngest(pdf(), { skipSniff: true, compress: false });
  ctx.__vault.on = true;
  assert.strictEqual(await ctx.fsSealExisting(), 1);
  assert.doesNotMatch(await bytesOf(ctx.__data.get(rec.id)), /Meera Nair/);
  assert.strictEqual(await ctx.fsUnsealExisting(ctx.__key), 1);
  assert.match(await bytesOf(ctx.__data.get(rec.id)), /Meera Nair/,
    "a file sealed under a key that is about to be discarded would be lost");
});

test("an attachment never reaches the cloud without patient-data consent", async () => {
  const ctx = await device({ vault: false, phiArmed: false });
  const rec = await ctx.fsIngest(pdf(), { skipSniff: true, compress: false });
  const r = await ctx.fsCloudUpload(rec);
  assert.strictEqual(r.skipped, "patient-data-sync-off");
  assert.strictEqual(ctx.__uploads.length, 0, "signed in is not the same as consented");
});

test("with consent, the cloud receives ciphertext under an opaque path — no filename, no name", async () => {
  const ctx = await device({ vault: true, phiArmed: true });
  const rec = await ctx.fsIngest(pdf(), { skipSniff: true, compress: false });
  const r = await ctx.fsCloudUpload(rec);
  assert.strictEqual(r.ok, true, JSON.stringify(r));
  const up = ctx.__uploads[0];
  assert.doesNotMatch(up.url, /Meera|Nair|OCT|\.pdf/i, "the path carried the original filename");
  assert.doesNotMatch(await bytesOf(up.init.body), /Meera Nair/, "the file was uploaded in the clear");
  assert.strictEqual(rec.cloud_encrypted, true);
});
