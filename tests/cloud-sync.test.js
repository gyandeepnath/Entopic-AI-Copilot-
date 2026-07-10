/* ═══════════════════════════════════════════════════════════════ */
/* CLOUD SYNC — pure-logic unit tests                              */
/* The network paths (auth, REST push/pull, realtime WS) require a   */
/* browser + live Supabase and are covered by the manual runbook     */
/* (docs/CLOUD_SETUP.md) and server-side RLS proof. Here we pin the   */
/* offline-testable logic that governs data correctness:             */
/*   - last-writer-wins merge                                        */
/*   - the open exam visit is never clobbered by a remote change     */
/*   - the outbox only queues clinic data, and never while applying  */
/*     remote changes (no echo loop)                                 */
/*   - status/gating reflect config + session state                 */
/* cloud-sync.js is loaded in a sandbox with minimal browser stubs.  */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..");

function makeSandbox(opts) {
  opts = opts || {};
  const store = new Map();
  const patients = opts.patients || [];
  const visits = opts.visits || [];
  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {},
    Date, JSON, Set, Math, String, Number, encodeURIComponent,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    /* in-memory clinic store the sync layer reads/writes */
    _patients: patients, _visits: visits,
    loadPatients: function () { return sandbox._patients; },
    savePatients: function (a) { sandbox._patients = a; },
    loadVisits: function () { return sandbox._visits; },
    saveVisits: function (a) { sandbox._visits = a; },
    CLOUD_CONFIG: opts.config || { enabled: true, url: "https://x.supabase.co", anonKey: "k" },
    /* fetch stub: presence makes cloudEnabled() true; never actually called
       in these pure-logic tests (no drain/pull is triggered). */
    fetch: function () { return { then: function () { return { catch: function () {} }; } }; },
    document: { getElementById: () => null }
  };
  if ("CV" in opts) sandbox.CV = opts.CV;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(REPO, "js", "cloud-sync.js"), "utf8"), sandbox, { filename: "cloud-sync.js" });
  return sandbox;
}

test("cloud-sync loads in a bare environment and defines its API", () => {
  const sb = makeSandbox();
  for (const fn of ["cloudMergeRows", "cloudEnqueue", "cloudStatus", "cloudEnabled", "cloudSignedIn"]) {
    assert.strictEqual(typeof sb[fn], "function", fn + " defined");
  }
});

test("merge adds a new remote patient", () => {
  const sb = makeSandbox();
  const n = sb.cloudMergeRows("patients", [{ id: "p1", data: { id: "p1", first_name: "Asha" }, updated_at: "2026-07-05T10:00:00Z" }]);
  assert.strictEqual(n, 1);
  assert.strictEqual(sb._patients.length, 1);
  assert.strictEqual(sb._patients[0].first_name, "Asha");
});

test("last-writer-wins: newer remote replaces, older is ignored", () => {
  const sb = makeSandbox({ patients: [{ id: "p1", first_name: "Old", _cloud_updated: "2026-07-05T10:00:00Z" }] });
  /* older timestamp → ignored */
  let n = sb.cloudMergeRows("patients", [{ id: "p1", data: { id: "p1", first_name: "Older" }, updated_at: "2026-07-05T09:00:00Z" }]);
  assert.strictEqual(n, 0, "older change ignored");
  assert.strictEqual(sb._patients[0].first_name, "Old");
  /* newer timestamp → applied */
  n = sb.cloudMergeRows("patients", [{ id: "p1", data: { id: "p1", first_name: "Newer" }, updated_at: "2026-07-05T11:00:00Z" }]);
  assert.strictEqual(n, 1, "newer change applied");
  assert.strictEqual(sb._patients[0].first_name, "Newer");
});

test("the visit open in the current exam is never clobbered by a remote change", () => {
  const sb = makeSandbox({ CV: "v1", visits: [{ id: "v1", patient_id: "p1", note: "local-edits" }] });
  const n = sb.cloudMergeRows("visits", [{ id: "v1", data: { id: "v1", patient_id: "p1", note: "remote-overwrite" }, updated_at: "2999-01-01T00:00:00Z" }]);
  assert.strictEqual(n, 0, "open visit protected even against a far-future remote timestamp");
  assert.strictEqual(sb._visits[0].note, "local-edits");
});

test("a different (not-open) visit still merges normally", () => {
  const sb = makeSandbox({ CV: "v1", visits: [{ id: "v1", note: "open" }] });
  const n = sb.cloudMergeRows("visits", [{ id: "v2", data: { id: "v2", note: "from other device" }, updated_at: "2026-07-05T10:00:00Z" }]);
  assert.strictEqual(n, 1);
  assert.ok(sb._visits.some((v) => v.id === "v2"));
});

test("enqueue only flags clinic data, and never while applying remote changes", () => {
  const sb = makeSandbox();
  sb.cloudEnqueue("apikey"); /* not clinic data */
  sb.cloudEnqueue("settings"); /* not synced */
  assert.ok(!sb.CLOUD.dirty.patients && !sb.CLOUD.dirty.visits);
  sb.cloudEnqueue("patients");
  assert.strictEqual(sb.CLOUD.dirty.patients, true);
  /* while suppressed (applying a remote change) enqueue is a no-op → no echo loop */
  sb.CLOUD.dirty.visits = false;
  sb.CLOUD._suppress = true;
  sb.cloudEnqueue("visits");
  assert.ok(!sb.CLOUD.dirty.visits, "suppressed enqueue does not re-queue a remote change");
});

test("disabled config → sync fully dormant", () => {
  const sb = makeSandbox({ config: { enabled: false } });
  assert.strictEqual(sb.cloudEnabled(), false);
  assert.strictEqual(sb.cloudStatus().state, "disabled");
  sb.cloudEnqueue("patients");
  assert.ok(!sb.CLOUD.dirty.patients, "disabled → nothing queued");
});

test("status reflects signed-out and no-clinic states", () => {
  const sb = makeSandbox();
  assert.strictEqual(sb.cloudStatus().state, "signedout");
  sb.CLOUD.session = { access_token: "t", user_id: "u", email: "d@e.f" };
  assert.strictEqual(sb.cloudStatus().state, "noclinic");
  sb.CLOUD.clinicId = "c1";
  assert.ok(["polling", "live"].indexOf(sb.cloudStatus().state) >= 0);
  assert.ok(sb.cloudSignedIn(), "signed in once session + clinic are set");
});
