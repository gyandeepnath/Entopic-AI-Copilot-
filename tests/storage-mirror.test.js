/* ═══════════════════════════════════════════════════════════════ */
/* STORAGE MIRROR — unit tests                                     */
/* IndexedDB itself can't run under Node, so the full disaster-      */
/* recovery path (save → wipe localStorage → reload → restored) is   */
/* verified in headless Chromium during development (see             */
/* tools/README.md). Here we pin the pure decision logic and the     */
/* wiring contract that storage.js relies on.                        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO_ROOT = path.resolve(__dirname, "..");

/* Load storage-mirror.js in a bare sandbox (no indexedDB / localStorage):
   it must define its functions and do nothing harmful. */
const sandbox = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(sandbox);
const src = fs.readFileSync(path.join(REPO_ROOT, "js", "storage-mirror.js"), "utf8");

test("storage-mirror.js loads safely without a browser environment", () => {
  vm.runInContext(src, sandbox, { filename: "storage-mirror.js" });
  assert.strictEqual(typeof sandbox.mirrorStore, "function");
  assert.strictEqual(typeof sandbox.mirrorRemove, "function");
  assert.strictEqual(typeof sandbox.needsMirrorRecovery, "function");
  /* calling the write hooks without indexedDB must be a silent no-op */
  sandbox.mirrorStore("patients", [{ id: 1 }]);
  sandbox.mirrorRemove("patients");
});

test("needsMirrorRecovery: only fires when local data is gone and mirror has content", () => {
  const f = sandbox.needsMirrorRecovery;
  assert.strictEqual(f(false, 3, false), true, "empty local + mirror data → recover");
  assert.strictEqual(f(true, 3, false), false, "local data present → never recover");
  assert.strictEqual(f(false, 0, false), false, "fresh install (empty mirror) → no recovery");
  assert.strictEqual(f(false, 3, true), false, "already recovered this session → no loop");
});

test("storage.js calls the mirror hooks on save and remove", () => {
  const storageSrc = fs.readFileSync(path.join(REPO_ROOT, "js", "storage.js"), "utf8");
  assert.ok(/mirrorStore\(key,\s*data\)/.test(storageSrc), "saveStore wires mirrorStore");
  assert.ok(/mirrorRemove\(key\)/.test(storageSrc), "removeStore wires mirrorRemove");
  assert.ok(/typeof mirrorStore === "function"/.test(storageSrc),
    "hook is guarded so storage.js still works if the mirror script is absent");
});

test("index.html loads the mirror before storage.js", () => {
  const html = fs.readFileSync(path.join(REPO_ROOT, "index.html"), "utf8");
  const mirrorAt = html.indexOf("js/storage-mirror.js");
  const storageAt = html.indexOf("js/storage.js");
  assert.ok(mirrorAt > -1, "mirror script included");
  assert.ok(mirrorAt < storageAt, "mirror loads before storage.js");
});


/* ═══ Disaster recovery with automatic snapshots present (2026-10-27) ═══
   The mirror's IndexedDB store also holds the automatic backup snapshots
   (snap_*), each a copy of the WHOLE clinic. Recovery restored every key it
   found, in key order — and "snap_…" sorts before "users", "vault_meta" and
   "visit_…". The snapshots filled localStorage first, the restore threw part
   way, and the accounts, the vault key and every visit were never put back:
   the safety net failed in the one disaster it exists for. */

function recoveryWorld(entries, quotaBytes) {
  const ls = new Map();
  let used = 0;
  const reloads = [];
  const sorted = Object.keys(entries).sort().map((k) => ({ key: k, json: entries[k] }));
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Object, Array, String, Date,
    localStorage: {
      getItem: (k) => (ls.has(k) ? ls.get(k) : null),
      setItem: (k, v) => {
        const add = String(v).length - (ls.has(k) ? ls.get(k).length : 0);
        if (used + add > quotaBytes) { const e = new Error("quota"); e.name = "QuotaExceededError"; throw e; }
        used += add; ls.set(k, String(v));
      },
      removeItem: (k) => { if (ls.has(k)) { used -= ls.get(k).length; ls.delete(k); } }
    },
    sessionStorage: { getItem: () => null, setItem() {} },
    location: { reload: () => reloads.push(1) },
    indexedDB: {
      open() {
        const req = {};
        setImmediate(() => {
          const db = {
            objectStoreNames: { contains: () => true },
            close() {},
            transaction() {
              return { objectStore() { return { getAll() { const r = {}; setImmediate(() => { r.result = sorted; r.onsuccess && r.onsuccess(); }); return r; } }; } };
            }
          };
          req.onsuccess && req.onsuccess({ target: { result: db } });
        });
        return req;
      }
    }
  };
  ctx.window = ctx;
  return { ctx, ls, reloads };
}

test("recovery restores the records, not the snapshots — even when snapshots would not fit", async () => {
  const clinic = JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ id: "p" + i, first_name: "Patient " + i })));
  const entries = {
    users: JSON.stringify([{ id: "u1", username: "dr" }]),
    patients: clinic,
    vault_meta: JSON.stringify({ v: 1 }),
    visit_index: JSON.stringify([{ id: "v1" }]),
    visit_v1: JSON.stringify({ id: "v1", data: {} })
  };
  for (let i = 0; i < 7; i++) entries["snap_2026-10-0" + i] = JSON.stringify({ patients: JSON.parse(clinic), visits: [] });
  /* room for the records about three times over — but not for seven snapshots */
  const { ctx, ls, reloads } = recoveryWorld(entries, clinic.length * 3);
  vm.createContext(ctx);
  vm.runInContext(src, ctx, { filename: "storage-mirror.js" });
  await new Promise((r) => setTimeout(r, 20));

  assert.ok(ls.has("entopic_users"), "the accounts were not restored");
  assert.ok(ls.has("entopic_vault_meta"), "the vault key wrapper was not restored — every record unreadable");
  assert.ok(ls.has("entopic_visit_v1"), "the visits were not restored");
  assert.ok(![...ls.keys()].some((k) => /snap_/.test(k)), "snapshots are backups, not stores; they stay in IndexedDB");
  assert.strictEqual(reloads.length, 1, "and the app reloads onto the recovered records");
});
