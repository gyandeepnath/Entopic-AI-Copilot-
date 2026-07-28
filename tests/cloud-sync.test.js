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
    setTimeout: (f)=>{ if(typeof f==="function") setImmediate(f); return 0; }, clearTimeout: () => {}, setInterval: () => 0, clearInterval: () => {}, setImmediate: (f)=>setImmediate(f),
    Date, JSON, Set, Math, String, Number, encodeURIComponent, Promise, Array, Object, isNaN, parseInt,
    /* PHI gate stubs: armed + a passthrough "encrypt" so drain proceeds and the
       stamp/metadata under test is still inspectable. Real encryption is
       covered by tests/cloud-phi.test.js. */
    phiArmed: () => true,
    phiEncrypt: (o) => Promise.resolve({ __phi: "entopic-phi-aesgcm256-v1", iv: "00", ct: "stub" }),
    phiIsEnvelope: (x) => !!(x && x.__phi),
    phiDecrypt: (x) => Promise.resolve(x),
    phiConsentGiven: () => true, phiKeyReady: () => true,
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

test("drain pushes each record's OWN stamp — never 'now' for untouched records", async () => {
  /* If drain stamped every record with the current time, any save on one
     device would make ALL its records look "newest" and silently overwrite
     other devices' unpushed edits (LWW data loss). Drain is now async
     (records are encrypted before send), so we await a couple of microtasks
     for the encrypt→POST chain to run. */
  const calls = [];
  const sb = makeSandbox({
    patients: [
      { id: "p1", first_name: "A", updated: "2026-07-01T08:00:00.000Z" },
      { id: "p2", first_name: "B", created: "2026-06-01T08:00:00.000Z" }, /* legacy: no updated */
      { id: "p3", first_name: "C" } /* no stamps at all */
    ],
    visits: [
      { id: "v1", patient_id: "p1", updated: "2026-07-02T09:00:00.000Z" },
      { id: "v2", patient_id: "p1", date: "2026-07-03T10:00:00.000Z" } /* legacy: date only */
    ]
  });
  sb.fetch = function (url, opts) {
    calls.push({ url, body: JSON.parse(opts.body) });
    return Promise.resolve({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([]) });
  };
  sb.CLOUD.session = { access_token: "t", refresh_token: "r", user_id: "u", email: "e" };
  sb.CLOUD.clinicId = "c1";
  sb.CLOUD.dirty = { patients: true, visits: true };
  sb.cloudDrain();
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));

  const pats = calls.find((c) => c.url.indexOf("/patients") >= 0).body;
  assert.strictEqual(pats[0].updated_at, "2026-07-01T08:00:00.000Z", "uses record.updated");
  assert.strictEqual(pats[1].updated_at, "2026-06-01T08:00:00.000Z", "falls back to created");
  assert.strictEqual(pats[2].updated_at, new Date(0).toISOString(), "stampless legacy record gets epoch (never claims to be newest)");
  /* and the payload is CIPHERTEXT, never the plaintext patient (C-1) */
  assert.ok(pats[0].data && pats[0].data.__phi, "record data is an encryption envelope, not plaintext");
  assert.strictEqual(pats[0].first_name, undefined, "no plaintext PII field on the pushed row");
  const vis = calls.find((c) => c.url.indexOf("/visits") >= 0).body;
  assert.strictEqual(vis[0].updated_at, "2026-07-02T09:00:00.000Z", "visit uses updated");
  assert.strictEqual(vis[1].updated_at, "2026-07-03T10:00:00.000Z", "visit falls back to date");
});

test("delta push: only records changed since their last push are sent (M-3)", async () => {
  const calls = [];
  const sb = makeSandbox({
    patients: [
      { id: "p1", first_name: "A", updated: "2026-07-01T08:00:00.000Z", _cloud_updated: "2026-07-01T08:00:00.000Z" }, /* synced, clean */
      { id: "p2", first_name: "B", updated: "2026-07-02T09:00:00.000Z", _cloud_updated: "2026-07-01T00:00:00.000Z" }, /* edited since push */
      { id: "p3", first_name: "C", updated: "2026-07-03T10:00:00.000Z" }                                             /* never pushed */
    ]
  });
  sb.fetch = function (url, opts) { calls.push({ url, body: JSON.parse(opts.body) }); return Promise.resolve({ ok: true, status: 200, headers: { get: () => "application/json" }, json: () => Promise.resolve([]) }); };
  sb.CLOUD.session = { access_token: "t", user_id: "u", email: "e" };
  sb.CLOUD.clinicId = "c1";
  sb.CLOUD.dirty = { patients: true, visits: false };
  sb.cloudDrain();
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const push = calls.find((c) => c.url.indexOf("/patients") >= 0);
  const ids = push.body.map((r) => r.id).sort();
  assert.deepStrictEqual(ids, ["p2", "p3"], "the clean, already-synced record (p1) is NOT re-sent");
  /* after a successful push the touched records are marked synced */
  await new Promise((r) => setImmediate(r));
  const marked = sb._patients.filter((p) => p._cloud_updated === p.updated).map((p) => p.id).sort();
  assert.ok(marked.includes("p2") && marked.includes("p3"), "pushed records are stamped as synced");
});

test("drain pushes NOTHING when PHI is not armed (consent gate, C-2)", async () => {
  const calls = [];
  const sb = makeSandbox({ patients: [{ id: "p1", first_name: "A", updated: "2026-07-01T08:00:00.000Z" }] });
  sb.phiArmed = () => false;               /* no consent / no key */
  sb.fetch = function (url, opts) { calls.push({ url }); return Promise.resolve({ ok: true, status: 200, headers: { get: () => "" }, json: () => Promise.resolve([]) }); };
  sb.CLOUD.session = { access_token: "t", user_id: "u", email: "e" };
  sb.CLOUD.clinicId = "c1";
  sb.CLOUD.dirty = { patients: true, visits: true };
  sb.cloudDrain();
  await new Promise((r) => setImmediate(r));
  assert.strictEqual(calls.length, 0, "no patient/visit POST while PHI sync is off");
  assert.strictEqual(sb.CLOUD.dirty.patients, true, "dirty flag held so it flushes once armed");
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
