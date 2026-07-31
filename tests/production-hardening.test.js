/* ═══════════════════════════════════════════════════════════════ */
/* PRODUCTION HARDENING — audit fixes, pinned                       */
/*                                                                  */
/* Covers the safe fixes made after the production-readiness audit   */
/* of 2026-07-30:                                                    */
/*   • clinic deployment mode: signup gate + login throttling        */
/*   • deployment readiness checks                                   */
/*   • backup validation (a truncated/wrong file must NOT be able to */
/*     silently replace a clinic's records)                          */
/*   • cloud retry/backoff policy for 429 + 5xx + offline            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(file, stubs) {
  const store = {};
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    JSON, Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat,
    isNaN, setTimeout, module: { exports: {} }
  }, stubs || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), ctx, { filename: file });
  return ctx;
}


/* ── clinic-mode: signup gate ─────────────────────────────────────── */

test("self-signup is open normally, and closed in clinic mode once an account exists", () => {
  const ctx = load("js/clinic-mode.js");
  const m = ctx.module.exports;

  assert.strictEqual(m.signupAllowed(5), true, "teaching/demo install: signup stays open");

  m.clinicModeSet(true);
  assert.strictEqual(m.signupAllowed(0), true, "first account must always be creatable, or the device is unusable");
  assert.strictEqual(m.signupAllowed(1), false, "clinic mode closes signup once staff accounts exist");
  assert.strictEqual(m.signupAllowed(50), false);

  m.clinicModeSet(false);
  assert.strictEqual(m.signupAllowed(5), true, "turning it off restores open signup");
});

test("idle lock minutes are bounded and default sensibly", () => {
  const ctx = load("js/clinic-mode.js");
  const m = ctx.module.exports;
  assert.strictEqual(m.clinicLockMinutes(), 15, "default");
  assert.strictEqual(m.clinicLockMinutesSet(0), false, "zero rejected");
  assert.strictEqual(m.clinicLockMinutesSet(-5), false, "negative rejected");
  assert.strictEqual(m.clinicLockMinutesSet(999), false, "absurd value rejected");
  assert.strictEqual(m.clinicLockMinutesSet(5), true);
  assert.strictEqual(m.clinicLockMinutes(), 5);
});


/* ── clinic-mode: login throttling ────────────────────────────────── */

test("login throttling only bites after repeated failures, then backs off", () => {
  const ctx = load("js/clinic-mode.js");
  const m = ctx.module.exports;

  assert.strictEqual(m.throttleDelayMs(0), 0, "a first attempt is never delayed");
  assert.strictEqual(m.throttleDelayMs(4), 0, "a typo or two costs nothing");
  assert.ok(m.throttleDelayMs(5) > 0, "sustained guessing starts costing time");
  assert.ok(m.throttleDelayMs(8) > m.throttleDelayMs(6), "delay grows");
  assert.ok(m.throttleDelayMs(100) <= 15 * 60 * 1000, "delay is capped, never permanent lockout");
});

test("failures are counted per username and cleared on success", () => {
  const ctx = load("js/clinic-mode.js");
  const m = ctx.module.exports;
  const t0 = 1000000;

  for (let i = 0; i < m.CLINIC_LOCKOUT_AFTER; i++) m.loginRecordFailure("drsmith", t0);
  assert.ok(m.loginBlockedFor("drsmith", t0) > 0, "guessed account is now delayed");
  assert.strictEqual(m.loginBlockedFor("drjones", t0), 0, "a different account is unaffected");

  assert.strictEqual(m.loginBlockedFor("drsmith", t0 + 60 * 60 * 1000), 0, "the delay expires with time");

  m.loginClearFailures("drsmith");
  assert.strictEqual(m.loginBlockedFor("drsmith", t0), 0, "a correct password clears the counter");
});

test("throttling is case-insensitive so DrSmith cannot dodge it", () => {
  const ctx = load("js/clinic-mode.js");
  const m = ctx.module.exports;
  const t0 = 2000000;
  for (let i = 0; i < m.CLINIC_LOCKOUT_AFTER; i++) m.loginRecordFailure("DrSmith", t0);
  assert.ok(m.loginBlockedFor("drsmith", t0) > 0);
});


/* ── deployment readiness ─────────────────────────────────────────── */

test("deployChecks flags an un-hardened terminal as blocked, a hardened one as ready", () => {
  const ctx = load("js/ui-deployment.js");
  const m = ctx.module.exports;

  const bad = m.deployChecks({ clinicMode: false, adminLegacy: true, plaintextCount: 2, cloudConfigured: false, phiArmed: false });
  const badState = m.deployReadyState(bad);
  assert.strictEqual(badState.ready, false);
  assert.ok(badState.blocked >= 2, "clinic mode off + default admin password are both blockers");

  const good = m.deployChecks({ clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true, vaultState: "unlocked" });
  const goodState = m.deployReadyState(good);
  assert.strictEqual(goodState.ready, true, "a hardened, connected terminal has no blockers");
});

test("at-rest encryption is reported truthfully for this device", () => {
  const ctx = load("js/ui-deployment.js");
  const m = ctx.module.exports;
  const off = m.deployChecks({ clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true, vaultState: "off" });
  const atRestOff = off.find((c) => c.id === "at_rest");
  assert.ok(atRestOff, "local-storage-at-rest state must always be stated");
  assert.strictEqual(atRestOff.state, "blocked", "unencrypted records are a deployment blocker, never a soft warning");

  const on = m.deployChecks({ clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true, vaultState: "unlocked" });
  assert.strictEqual(on.find((c) => c.id === "at_rest").state, "ok", "with the vault on it is genuinely encrypted");

  const noCrypto = m.deployChecks({ clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true, vaultState: "unavailable" });
  assert.strictEqual(noCrypto.find((c) => c.id === "at_rest").state, "blocked", "a browser that cannot encrypt must never look ready");
});


/* ── backup validation ────────────────────────────────────────────── */

function loadStorage() {
  return load("js/storage.js", {
    STORE_VERSION: "1.0.0",
    alert: () => {}, confirm: () => true,
    document: { createElement: () => ({ click() {}, style: {} }), body: { appendChild() {}, removeChild() {} } },
    Blob: function () {}, URL: { createObjectURL: () => "blob:", revokeObjectURL() {} },
    mirrorStore: () => {}, mirrorRemove: () => {}
  });
}

test("validateBackup rejects files that are not Entopic backups", () => {
  const s = loadStorage();
  assert.strictEqual(s.validateBackup(null).ok, false);
  assert.strictEqual(s.validateBackup("nope").ok, false);
  assert.strictEqual(s.validateBackup({}).ok, false, "no patient/visit lists");
  assert.strictEqual(s.validateBackup({ patients: [], visits: "x" }).ok, false, "visits must be a list");
});

test("validateBackup rejects a backup written by a NEWER Entopic", () => {
  const s = loadStorage();
  const res = s.validateBackup({ version: "2.0.0", patients: [], visits: [] });
  assert.strictEqual(res.ok, false);
  assert.ok(res.errors.join(" ").includes("NEWER"), "must say why, in words the founder can act on");
});

test("validateBackup rejects records missing ids (corrupt file)", () => {
  const s = loadStorage();
  const res = s.validateBackup({ version: "1.0.0", patients: [{ name: "x" }], visits: [] });
  assert.strictEqual(res.ok, false);
});

test("validateBackup accepts a good backup but warns about an empty one", () => {
  const s = loadStorage();
  const ok = s.validateBackup({ version: "1.0.0", patients: [{ id: "p1" }], visits: [{ id: "v1" }], audit: [] });
  assert.strictEqual(ok.ok, true);
  assert.strictEqual(ok.counts.patients, 1);

  const empty = s.validateBackup({ version: "1.0.0", patients: [], visits: [], audit: [] });
  assert.strictEqual(empty.ok, true, "an empty backup is legal…");
  assert.ok(empty.warnings.join(" ").includes("NO patients"), "…but the clinic must be told before it replaces live data");
});

test("validateBackup warns when the audit trail is absent", () => {
  const s = loadStorage();
  const res = s.validateBackup({ version: "1.0.0", patients: [{ id: "p1" }], visits: [{ id: "v1" }] });
  assert.ok(res.warnings.join(" ").toLowerCase().includes("audit"));
});


/* ── cloud retry policy ───────────────────────────────────────────── */

function loadCloud() {
  return load("js/cloud-sync.js", {
    CLOUD_CONFIG: { enabled: false, url: "", anonKey: "" },
    fetch: () => new Promise(() => {}),
    setInterval: () => 0, clearInterval: () => {},
    navigator: { onLine: true },
    addEventListener: () => {}
  });
}

test("429 and 5xx are retried with growing backoff; 4xx is not", () => {
  const c = loadCloud();
  assert.ok(c.cloudRetryDelayMs(429, 0, null) > 0, "rate limit is retryable");
  assert.ok(c.cloudRetryDelayMs(503, 0, null) > 0, "server fault is retryable");
  assert.ok(c.cloudRetryDelayMs(0, 0, null) > 0, "network failure is retryable");
  assert.strictEqual(c.cloudRetryDelayMs(400, 0, null), -1, "a bad request must NOT be retried");
  assert.strictEqual(c.cloudRetryDelayMs(404, 0, null), -1);
  assert.ok(c.cloudRetryDelayMs(429, 2, null) > c.cloudRetryDelayMs(429, 0, null), "backoff grows");
});

test("retries are bounded, so a down backend cannot loop forever", () => {
  const c = loadCloud();
  assert.strictEqual(c.cloudRetryDelayMs(429, c.CLOUD_MAX_RETRIES, null), -1);
  assert.strictEqual(c.cloudRetryDelayMs(500, 99, null), -1);
});

test("Retry-After from the server is honoured and capped", () => {
  const c = loadCloud();
  assert.strictEqual(c.cloudRetryDelayMs(429, 0, "5"), 5000, "server's wait is respected");
  assert.strictEqual(c.cloudRetryDelayMs(429, 0, "9999"), 60000, "but capped so the app is not stuck for hours");
  assert.ok(c.cloudRetryDelayMs(429, 0, "garbage") > 0, "an unparseable header falls back to backoff");
});


/* ── audit trail truncation must never be silent (audit H-7) ──────── */

test("the audit trail marks its own gap instead of silently dropping history", () => {
  const s = loadStorage();
  /* fill past the cap */
  const many = [];
  for (let i = 0; i < s.AUDIT_MAX_LOCAL + 25; i++) {
    many.push({ ts: "2026-01-" + String((i % 28) + 1).padStart(2, "0") + "T00:00:00Z",
                user: "drsmith", action: "patient_opened", details: "e" + i });
  }
  s.saveAudit(many);
  s.logAudit("patient_opened", "one more", {});

  const after = s.loadAudit();
  assert.ok(after.length <= s.AUDIT_MAX_LOCAL + 1, "the trail stays bounded");

  const marker = after.find((e) => e.action === "audit_truncated");
  assert.ok(marker, "a truncation MARKER is written into the trail itself");
  assert.ok(/not available locally/i.test(marker.details), "the gap is stated in plain words");
  assert.ok(/append-only/.test(marker.details), "and points at the fix");

  const notice = s.auditTruncationNotice();
  assert.strictEqual(notice.truncated, true, "and it is reportable to the admin");
});

test("a trail under the cap reports no gap", () => {
  const s = loadStorage();
  s.saveAudit([{ ts: "2026-01-01T00:00:00Z", user: "drsmith", action: "patient_opened" }]);
  assert.strictEqual(s.auditTruncationNotice().truncated, false);
});

test("the truncation note names how many events were lost and when", () => {
  const s = loadStorage();
  const dropped = [
    { ts: "2026-01-02T00:00:00Z", action: "a" },
    { ts: "2026-03-09T00:00:00Z", action: "b" }
  ];
  const note = s.auditNoteTruncation(dropped);
  assert.ok(note.includes("2"), "count stated");
  assert.ok(note.includes("2026-01-02") && note.includes("2026-03-09"), "period stated");
});

test("the readiness panel surfaces a truncated trail", () => {
  const ctx = load("js/ui-deployment.js");
  const m = ctx.module.exports;
  const gap = m.deployChecks({ auditTruncated: true, vaultState: "unlocked", clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true });
  assert.strictEqual(gap.find((c) => c.id === "audit_trail").state, "warn");
  const whole = m.deployChecks({ auditTruncated: false, vaultState: "unlocked", clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true });
  assert.strictEqual(whole.find((c) => c.id === "audit_trail").state, "ok");
});


/* ── P-1: a failed write must never look like a successful one ────
   Measured in the scalability review: past ~3,000 patients / 9,000 visits the
   localStorage budget (~9 MB) is exhausted, saveVisits threw, the error was
   swallowed, and the app carried on — 30,000 visits "saved", 0 persisted. */

test("saveStore reports success and failure to its caller", () => {
  const s = loadStorage();
  assert.strictEqual(s.saveStore("patients", [{ id: "p1" }]), true, "a normal write returns true");
  assert.strictEqual(s.storageWriteFailure(), null, "and records no failure");
});

test("a quota failure is recorded, not swallowed", () => {
  const s = loadStorage();
  s.localStorage.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };

  assert.strictEqual(s.saveStore("visits", [{ id: "v1" }]), false,
    "the caller is told the write FAILED — this is what was missing");
  const f = s.storageWriteFailure();
  assert.ok(f, "the failure is recorded");
  assert.strictEqual(f.reason, "quota");
  assert.strictEqual(f.key, "visits");
});

test("the failure state persists until writes work again, then clears itself", () => {
  const s = loadStorage();
  const realSet = s.localStorage.setItem;
  s.localStorage.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  s.saveStore("visits", [{ id: "v1" }]);
  s.saveStore("visits", [{ id: "v2" }]);
  assert.strictEqual(s.storageWriteFailure().count, 2, "repeat failures are counted, not reset");

  s.localStorage.setItem = realSet;
  s.saveStore("visits", [{ id: "v3" }]);
  assert.strictEqual(s.storageWriteFailure(), null, "a successful write clears the alarm");
});

test("the record is mirrored BEFORE localStorage, so a quota failure still captures it", () => {
  const mirrored = [];
  const s = load("js/storage.js", {
    STORE_VERSION: "1.0.0", alert: () => {}, confirm: () => true,
    document: { createElement: () => ({ click() {}, style: {} }), body: { appendChild() {}, removeChild() {} } },
    Blob: function () {}, URL: { createObjectURL: () => "blob:", revokeObjectURL() {} },
    mirrorStore: (k, d) => mirrored.push(k), mirrorRemove: () => {}
  });
  s.localStorage.setItem = () => { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; };
  s.saveStore("visits", [{ id: "v1" }]);
  assert.deepStrictEqual(mirrored, ["visits"],
    "the mirror ran even though localStorage failed — the old order skipped it, " +
    "while the alert claimed the record was safely mirrored");
});

test("readiness reports a device that has stopped saving as BLOCKED", () => {
  const ctx = load("js/ui-deployment.js");
  const m = ctx.module.exports;
  const bad = m.deployChecks({ writeFailure: { key: "visits", reason: "quota" },
    clinicMode: true, adminLegacy: false, plaintextCount: 0, cloudConfigured: true, phiArmed: true, vaultState: "unlocked" });
  const chk = bad.find((c) => c.id === "persistence");
  assert.strictEqual(chk.state, "blocked");
  assert.ok(/FAILING TO SAVE/.test(chk.detail));
  assert.strictEqual(m.deployReadyState(bad).ready, false, "a device that cannot save is not deployable");
});
