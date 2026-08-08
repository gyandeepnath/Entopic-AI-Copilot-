/* ═══════════════════════════════════════════════════════════════ */
/* ENTOPIC — LOCAL STORE MIGRATIONS  (backend audit BE-4)          */
/*                                                                  */
/* ── THE GAP THIS FILLS ──                                        */
/*                                                                  */
/* There was no migration mechanism at all. `STORE_VERSION` has     */
/* read "1.0.0" since the first commit, is used only to stamp       */
/* backup files, and nothing on a device ever recorded which shape  */
/* its data was in. Measured: `entopic_store_version` was null on a */
/* fully working install.                                           */
/*                                                                  */
/* Every shape change so far has therefore been an ad-hoc, one-off  */
/* patch scattered through the code — age brackets migrated in      */
/* age-brackets.js, password hashes in auth-crypto.js, admin        */
/* credentials in roles.js. Each is individually careful. Together  */
/* they are a pattern with no floor under it: nothing enforces that */
/* a migration runs once, nothing records that it ran, nothing can  */
/* undo one, and nothing stops two of them running in the wrong     */
/* order on a device that skipped three releases.                   */
/*                                                                  */
/* Over ten years of an EMR, that is the defect that eventually     */
/* corrupts somebody's records.                                     */
/*                                                                  */
/* ── WHAT THIS IS ──                                              */
/*                                                                  */
/* A ledger and a runner. Migrations are declared in order, each    */
/* with an id, a reason, an `up`, and a `down`. The runner:         */
/*                                                                  */
/*   • records which have been applied, on the device, by id;       */
/*   • snapshots every store a migration will touch BEFORE it runs; */
/*   • runs them in declared order, once each, ever;                */
/*   • rolls the whole run back from that snapshot if any step      */
/*     throws — a half-migrated record store is the worst outcome   */
/*     available and must not be reachable;                         */
/*   • refuses to run at all if any store it needs is unreadable,   */
/*     or if the vault is locked, because migrating what you cannot */
/*     read means writing a fallback over real data.                */
/*                                                                  */
/* ── IT SHIPS WITH ZERO MIGRATIONS, DELIBERATELY ──               */
/*                                                                  */
/* The current shape IS version 1. Inventing a migration to prove   */
/* the mechanism would change live clinical records to exercise     */
/* test code, which is precisely the trade this file exists to      */
/* refuse. What ships is the mechanism, the recorded version, and   */
/* the tests — so the first real shape change has somewhere safe to */
/* go instead of becoming the fourth ad-hoc patch.                  */
/*                                                                  */
/* Load order: after storage.js (loadStore/saveStore) and before    */
/* app.js boots. Runs once, synchronously, at startup.              */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

var MIGRATION_LEDGER_STORE = "migrations";
var MIGRATION_SNAPSHOT_PREFIX = "premigration_";

/* ═══════════════════════════════════════════════════════════════ */
/* THE MIGRATIONS                                                   */
/*                                                                  */
/* Each entry:                                                      */
/*   id      stable, never reused, never renamed. The ledger keys   */
/*           on it, so changing one re-runs a migration that has    */
/*           already been applied.                                  */
/*   why     one sentence a maintainer three years from now can     */
/*           act on. Not "fix data" — what was wrong and for whom.  */
/*   stores  every store `up` reads or writes. The runner snapshots */
/*           exactly these, so an under-declared list is a          */
/*           correctness bug and the test suite checks for it.      */
/*   up      (data) -> data. PURE: given the stores, return the new */
/*           stores. It must not touch localStorage itself; the     */
/*           runner owns the writes so it can roll them back.       */
/*   down    the inverse, same shape. A migration with no honest    */
/*           inverse declares `down: null` AND says why — that is a */
/*           real answer (dropping a field cannot be undone), and   */
/*           it makes the one-way step visible instead of implied.  */
/* ═══════════════════════════════════════════════════════════════ */

var STORE_MIGRATIONS = [
  /* Example of the shape, kept as documentation and never run:
     {
       id: "0002_visit_laterality_default",
       why: "Visits saved before 1.6 recorded findings with no eye; default them to " +
            "the empty string so the laterality check can tell 'not recorded' from 'absent'.",
       stores: ["visits"],
       up:   function (d) { ...; return d; },
       down: function (d) { ...; return d; }
     }
  */
];


/* ── The ledger: which migrations this device has applied ── */

/* A migration must never share a reference with the live store — see the
   snapshot comment in migrationsRun(). Plain JSON, because every store is
   plain JSON by construction. */
function _migClone(v) {
  if (v === null || v === undefined) return v;
  try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
}

function migrationLedger() {
  if (typeof loadStore !== "function") return { version: null, applied: [] };
  var l = loadStore(MIGRATION_LEDGER_STORE, null);
  if (!l || typeof l !== "object") return { version: null, applied: [] };
  return { version: l.version || null, applied: Array.isArray(l.applied) ? l.applied : [] };
}

function migrationApplied(id) {
  return migrationLedger().applied.indexOf(id) >= 0;
}

function migrationPending() {
  var done = migrationLedger().applied;
  return STORE_MIGRATIONS.filter(function (m) { return done.indexOf(m.id) < 0; });
}

function _migrationLedgerWrite(ledger) {
  if (typeof saveStore !== "function") return false;
  return saveStore(MIGRATION_LEDGER_STORE, ledger) !== false;
}


/* ── Running ──
   Returns { ok, ran:[ids], skipped, reason, rolled_back }. Never throws:
   a migration failure must not stop the app from starting, because a
   clinician with an unmigrated device can still read their records. */

function migrationsRun(opts) {
  opts = opts || {};
  var pending = migrationPending();
  var here = (typeof STORE_VERSION !== "undefined") ? STORE_VERSION : "1.0.0";

  if (!pending.length) {
    /* Record the version even when there is nothing to do. A device that has
       never recorded its shape is indistinguishable from one that predates
       the ledger, and the next migration would have to guess. */
    var l0 = migrationLedger();
    if (l0.version !== here) _migrationLedgerWrite({ version: here, applied: l0.applied });
    return { ok: true, ran: [], skipped: 0, reason: "", rolled_back: false };
  }

  /* Every store any pending migration touches. */
  var touched = {};
  pending.forEach(function (m) { (m.stores || []).forEach(function (s) { touched[s] = true; }); });
  var keys = Object.keys(touched);

  /* REFUSE rather than risk it. Migrating a store we cannot read means
     handing `up` the empty fallback and writing the result over real data —
     the exact failure the corrupt-store guard exists to prevent. */
  for (var i = 0; i < keys.length; i++) {
    if (typeof storageIsCorrupt === "function" && storageIsCorrupt(keys[i])) {
      return { ok: false, ran: [], skipped: pending.length, rolled_back: false,
               reason: "the '" + keys[i] + "' store is damaged; migrations are held until it is restored" };
    }
  }
  if (typeof vaultEnabled === "function" && vaultEnabled() &&
      typeof vaultUnlocked === "function" && !vaultUnlocked()) {
    return { ok: false, ran: [], skipped: pending.length, rolled_back: false,
             reason: "the record vault is locked; migrations run after unlock" };
  }

  /* Snapshot BEFORE anything runs. This is what makes the run reversible even
     for a migration whose own `down` is null.

     DEEP COPIED, and that word is load-bearing. loadStore returns a shared
     object (see the parse cache in storage.js), so a snapshot holding the same
     reference the migration is about to mutate is not a snapshot at all — it
     changes as the migration changes it, and the rollback restores the damage.
     Caught by tests/backend-integrity.test.js the moment the cache landed.

     A snapshot that aliases live data was always fragile; the cache only made
     it fail loudly. */
  var snapshot = {};
  keys.forEach(function (k) { snapshot[k] = _migClone(loadStore(k, null)); });
  var snapKey = MIGRATION_SNAPSHOT_PREFIX + Date.now();
  if (!opts.skipSnapshot && typeof saveStore === "function") {
    if (saveStore(snapKey, { at: new Date().toISOString(), stores: snapshot }) === false) {
      return { ok: false, ran: [], skipped: pending.length, rolled_back: false,
               reason: "could not write a pre-migration snapshot; refusing to migrate without one" };
    }
  }

  function rollback() {
    keys.forEach(function (k) {
      if (snapshot[k] === null || snapshot[k] === undefined) return;
      try { saveStore(k, snapshot[k]); } catch (e) {}
    });
  }

  var ran = [];
  var ledger = migrationLedger();
  for (var mi = 0; mi < pending.length; mi++) {
    var m = pending[mi];
    /* The migration gets its OWN copy too, so a step that throws part-way
       through cannot leave half its mutations in the live store. */
    var before = {};
    (m.stores || []).forEach(function (s) { before[s] = _migClone(loadStore(s, null)); });
    var after;
    try {
      after = m.up(before);
      if (!after || typeof after !== "object") throw new Error("up() returned nothing");
    } catch (e) {
      rollback();
      if (typeof logAudit === "function") {
        try { logAudit("migration_failed", "Migration " + m.id + " failed and the whole run was " +
          "rolled back from the pre-migration snapshot: " + ((e && e.message) || e), {}); } catch (e2) {}
      }
      return { ok: false, ran: ran, skipped: pending.length - ran.length, rolled_back: true,
               reason: "migration " + m.id + " failed: " + ((e && e.message) || e) +
                       " — every store was restored from the snapshot" };
    }
    /* Write each store the migration returned. A refused write is a failure:
       carrying on would leave half the migration applied. */
    var wroteAll = true;
    Object.keys(after).forEach(function (s) {
      if (saveStore(s, after[s]) === false) wroteAll = false;
    });
    if (!wroteAll) {
      rollback();
      return { ok: false, ran: ran, skipped: pending.length - ran.length, rolled_back: true,
               reason: "migration " + m.id + " could not be written; every store was restored" };
    }
    ran.push(m.id);
    ledger.applied.push(m.id);
    ledger.version = here;
    _migrationLedgerWrite(ledger);        /* after EACH step, so a crash resumes correctly */
  }

  if (ran.length && typeof logAudit === "function") {
    try { logAudit("migrations_applied", ran.length + " store migration(s) applied: " +
      ran.join(", ") + ". A pre-migration snapshot was kept at " + snapKey + ".", {}); } catch (e) {}
  }
  return { ok: true, ran: ran, skipped: 0, reason: "", rolled_back: false, snapshot: snapKey };
}


/* ── Undo, for an operator ──
   Runs the declared `down` of each applied migration in reverse order. Refuses
   if any of them is one-way, naming it, rather than doing half the job. */
function migrationsRollback(toId) {
  var applied = migrationLedger().applied.slice();
  var toUndo = [];
  for (var i = applied.length - 1; i >= 0; i--) {
    if (toId && applied[i] === toId) break;
    var m = null;
    for (var j = 0; j < STORE_MIGRATIONS.length; j++) if (STORE_MIGRATIONS[j].id === applied[i]) m = STORE_MIGRATIONS[j];
    if (!m) return { ok: false, reason: "migration " + applied[i] + " is applied but no longer declared; " +
                     "cannot undo what is not described" };
    if (!m.down) return { ok: false, reason: "migration " + m.id + " is one-way (" +
                          (m.down_why || "no inverse declared") + "); restore from the pre-migration " +
                          "snapshot or a backup instead" };
    toUndo.push(m);
  }
  if (!toUndo.length) return { ok: true, undone: [], reason: "" };

  var undone = [];
  for (var k = 0; k < toUndo.length; k++) {
    var mm = toUndo[k];
    var before = {};
    (mm.stores || []).forEach(function (s) { before[s] = _migClone(loadStore(s, null)); });
    var after;
    try { after = mm.down(before); } catch (e) {
      return { ok: false, undone: undone, reason: "undo of " + mm.id + " failed: " + ((e && e.message) || e) };
    }
    Object.keys(after || {}).forEach(function (s) { saveStore(s, after[s]); });
    undone.push(mm.id);
  }
  var led = migrationLedger();
  led.applied = led.applied.filter(function (id) { return undone.indexOf(id) < 0; });
  _migrationLedgerWrite(led);
  return { ok: true, undone: undone, reason: "" };
}

/* Pre-migration snapshots left on the device, newest first — what an operator
   restores from when a migration went wrong in a way `down` cannot express. */
function migrationSnapshots() {
  var out = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (!k || k.indexOf(STORE_PREFIX + MIGRATION_SNAPSHOT_PREFIX) !== 0) continue;
      out.push({ key: k, at: k.slice((STORE_PREFIX + MIGRATION_SNAPSHOT_PREFIX).length) });
    }
  } catch (e) { /* storage unavailable */ }
  return out.sort(function (a, b) { return b.at.localeCompare(a.at); });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORE_MIGRATIONS: STORE_MIGRATIONS,
    MIGRATION_LEDGER_STORE: MIGRATION_LEDGER_STORE,
    migrationLedger: migrationLedger, migrationApplied: migrationApplied,
    migrationPending: migrationPending, migrationsRun: migrationsRun,
    migrationsRollback: migrationsRollback, migrationSnapshots: migrationSnapshots
  };
}
