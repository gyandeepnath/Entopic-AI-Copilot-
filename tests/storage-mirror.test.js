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
