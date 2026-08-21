/* ═══════════════════════════════════════════════════════════════ */
/* ADVERSARIAL STRESS — SYNC MERGE AND BACKUP ROUND-TRIP           */
/*                                                                  */
/*   node tools/stress/sync.js                                      */
/*                                                                  */
/* The two paths by which a record can silently change without a    */
/* clinician touching it: a row arriving from another device, and   */
/* a backup being restored. Both take JSON that nothing             */
/* re-validates, and both can destroy data rather than merely       */
/* display it wrongly.                                              */
/*                                                                  */
/* The failures that matter here, in order:                         */
/*   1. a record that existed is GONE                               */
/*   2. a record that was deleted COMES BACK                        */
/*   3. one patient's data lands under another patient's id         */
/*   4. a local edit is overwritten without being flagged           */
/* A crash is preferable to any of them.                            */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { makeHarness, must, mustEqual, browser } = require("./lib");
const H = makeHarness(process.argv);
const { G, attack, runAll } = H;

const SYNC_FILES = ["js/cloud-replication.js"];

function syncCtx() {
  const c = browser({
    also: SYNC_FILES,
    extra: {
      CLOUD: { conflicts: [], _suppress: false, queue: [], tombstones: [] },
      CV: null, CP: null,
      cloudEnabled: () => true, cloudSignedIn: () => true,
      cloudRerender: () => {}, cloudPersistQueue: () => {},
      phiArmed: () => false, phiEncrypt: (o) => o, phiDecrypt: (o) => o
    }
  });
  return c;
}

function pt(id, updated, extra) {
  return Object.assign({ id: id, first_name: "A", last_name: "B", mrn: "M-" + id,
                         updated: updated, created: updated }, extra || {});
}
function row(id, updatedAt, data, deleted) {
  return { id: id, updated_at: updatedAt, data: data || null, deleted: !!deleted };
}

/* A tombstone in the shape THIS app actually sends (cloudDrainTombstones):
   `data` carries { id, deleted:true }, not null. A row with data:null means
   "could not be decrypted", and skipping that is correct — see AA11. My first
   version of AA5/AA6 used data:null and reported a bug that was really a
   wrong fixture. */
function tombstone(id, updatedAt) {
  return { id: id, updated_at: updatedAt, data: { id: id, deleted: true }, deleted: true };
}

const T0 = "2026-01-01T00:00:00.000Z";
const T1 = "2026-02-01T00:00:00.000Z";
const T2 = "2026-03-01T00:00:00.000Z";


/* ═══════════════════════════════════════════════════════════════ */
G("AA. the merge — nothing lost, nothing resurrected");

attack("AA1 a brand-new remote record is added", () => {
  const c = syncCtx();
  c.run(`savePatients([]);`);
  c.__rows = [row("p1", T1, pt("p1", T1))];
  const n = c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(n, 1, "a new remote record was not added");
  mustEqual(c.run("loadPatients().length"), 1, "the record is not in the store");
});

attack("AA2 a NEWER remote record replaces an unmodified local one", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "OLD" }))}]);`);
  c.__rows = [row("p1", T1, pt("p1", T1, { first_name: "NEW" }))];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients()[0].first_name"), "NEW",
    "a newer remote version did not replace an untouched local record");
});

attack("AA3 an UNPUSHED local edit is never silently overwritten", () => {
  /* The clinician typed something this device has not sent yet. A remote row
     must not quietly win — it must be surfaced as a conflict. */
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T2, { _cloud_updated: T0, first_name: "LOCAL-EDIT" }))}]);`);
  c.__rows = [row("p1", T1, pt("p1", T1, { first_name: "REMOTE" }))];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients()[0].first_name"), "LOCAL-EDIT",
    "an unpushed local edit was overwritten by a remote row");
  must(c.run("cloudConflicts().length") > 0,
    "the overwrite was avoided but the clinician was never told there was a conflict");
});

attack("AA4 an older remote record never wins", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T2, { _cloud_updated: T2, first_name: "CURRENT" }))}]);`);
  c.__rows = [row("p1", T0, pt("p1", T0, { first_name: "STALE" }))];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients()[0].first_name"), "CURRENT",
    "a stale remote row overwrote a newer local record");
});

attack("AA5 a remote delete is honoured when there are no local edits", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  c.__rows = [tombstone("p1", T1)];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients().length"), 0, "a remote delete was ignored");
});

attack("AA6 a remote delete does NOT destroy an unpushed local edit", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T2, { _cloud_updated: T0, first_name: "LOCAL-EDIT" }))}]);`);
  c.__rows = [tombstone("p1", T1)];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients().length"), 1,
    "a remote delete destroyed a record this device had edited and not yet sent");
  must(c.run("cloudConflicts().length") > 0, "the conflict was not surfaced");
});

attack("AA7 a tombstone for a record we never had is ignored", () => {
  const c = syncCtx();
  c.run(`savePatients([]);`);
  c.__rows = [tombstone("ghost", T1)];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients().length"), 0, "a tombstone created a record");
});

attack("AA8 the visit open in the exam right now is never replaced under the clinician", () => {
  const c = syncCtx();
  c.run(`CV = "vOpen";
         saveVisits([{ id: "vOpen", patient_id: "p1", date: "${T0}", status: "in_progress",
                       _cloud_updated: "${T0}", data: { marker: "MINE" } }]);`);
  c.__rows = [row("vOpen", T2, { id: "vOpen", patient_id: "p1", date: T2,
                                 status: "completed", data: { marker: "THEIRS" } })];
  c.run(`cloudMergeRows("visits", __rows)`);
  mustEqual(c.run("loadVisits()[0].data.marker"), "MINE",
    "the visit being examined right now was overwritten mid-exam from another device");
});

attack("AA9 a row whose id is __proto__ cannot corrupt the merge", () => {
  /* The index is a plain object keyed by record id. A record whose id is a
     prototype key makes the lookup return something that is not an index. */
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  c.__rows = [row("__proto__", T1, pt("__proto__", T1)),
              row("constructor", T1, pt("constructor", T1)),
              row("toString", T1, pt("toString", T1)),
              row("p1", T1, pt("p1", T1, { first_name: "STILL-MERGED" }))];
  let threw = null;
  try { c.run(`cloudMergeRows("patients", __rows)`); } catch (e) { threw = e; }
  must(!threw, "a hostile record id crashed the sync merge: " + threw);
  /* The legitimate row in the same batch must still have been applied. */
  const names = c.run(`JSON.stringify(loadPatients().map(function(p){return p.first_name}))`);
  must(names.indexOf("STILL-MERGED") >= 0,
    "a hostile id in the batch stopped a legitimate record merging: " + names);
  mustEqual(c.run("({}).id === undefined"), true, "Object.prototype was polluted by the merge");
});

attack("AA10 a row whose envelope id disagrees with its payload id cannot overwrite another record", () => {
  const c = syncCtx();
  c.run(`savePatients([
    ${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "PATIENT-ONE" }))},
    ${JSON.stringify(pt("p2", T0, { _cloud_updated: T0, first_name: "PATIENT-TWO" }))}
  ]);`);
  /* Envelope says p1; the record inside claims to be p2. */
  c.__rows = [row("p1", T2, pt("p2", T2, { first_name: "IMPOSTOR" }))];
  c.run(`cloudMergeRows("patients", __rows)`);
  const dump = c.run("JSON.stringify(loadPatients())");
  const two = JSON.parse(dump).filter((p) => p.id === "p2");
  must(two.length === 1, "the id mismatch duplicated or removed a patient: " + dump);
  must(two[0].first_name === "PATIENT-TWO",
    "a row addressed to p1 overwrote p2's record — one patient's data under another's id");
});

attack("AA11 an undecryptable row is skipped, never stored as ciphertext", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0, first_name: "REAL" }))}]);`);
  c.__rows = [row("p1", T2, null)];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients()[0].first_name"), "REAL",
    "a row that could not be decrypted replaced a real record");
});

attack("AA12 hostile row shapes do not crash the merge", () => {
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T0, { _cloud_updated: T0 }))}]);`);
  const shapes = ['[null]', '[undefined]', '[0]', '["x"]', '[{}]',
                  '[{ id: null }]', '[{ id: "p1" }]',
                  '[{ id: "p1", updated_at: "not-a-date", data: { id: "p1" } }]',
                  '[{ id: "p1", updated_at: null, data: { id: "p1" } }]',
                  '[{ id: "p1", data: "notanobject" }]'];
  for (const s of shapes) {
    let threw = null;
    try { c.run(`cloudMergeRows("patients", ${s})`); } catch (e) { threw = e; }
    must(!threw, "the merge threw on " + s + ": " + threw);
  }
  must(c.run("loadPatients().length") >= 1, "a hostile batch emptied the store");
});

attack("AA13 an unparseable timestamp is treated as oldest, never as newest", () => {
  /* cloudEpoch returns 0 for a bad date. A remote row with a garbage stamp
     must therefore lose, not win — otherwise corrupt metadata overwrites
     good records. */
  const c = syncCtx();
  c.run(`savePatients([${JSON.stringify(pt("p1", T1, { _cloud_updated: T1, first_name: "GOOD" }))}]);`);
  c.__rows = [row("p1", "not-a-date", pt("p1", T2, { first_name: "GARBAGE-STAMP" }))];
  c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(c.run("loadPatients()[0].first_name"), "GOOD",
    "a row with an unparseable timestamp overwrote a good record");
});

attack("AA14 merging the same batch twice changes nothing the second time", () => {
  const c = syncCtx();
  c.run(`savePatients([]);`);
  c.__rows = [row("p1", T1, pt("p1", T1)), row("p2", T1, pt("p2", T1))];
  const first = c.run(`cloudMergeRows("patients", __rows)`);
  const second = c.run(`cloudMergeRows("patients", __rows)`);
  mustEqual(first, 2, "the first merge should apply both rows");
  mustEqual(c.run("loadPatients().length"), 2,
    "replaying the same batch duplicated records");
  mustEqual(second, 0, "a replayed batch reported changes it did not make");
});

attack("AA15 a large batch merges without loss", () => {
  const c = syncCtx();
  c.run(`savePatients([]);`);
  c.run(`
    var rows = [];
    for (var i = 0; i < 2000; i++) {
      rows.push({ id: "p" + i, updated_at: "${T1}",
                  data: { id: "p" + i, first_name: "N" + i, updated: "${T1}" }, deleted: false });
    }
    __big = rows;
  `);
  const t0 = Date.now();
  c.run(`cloudMergeRows("patients", __big)`);
  const ms = Date.now() - t0;
  mustEqual(c.run("loadPatients().length"), 2000, "records were lost in a large merge");
  must(ms < 15000, "2,000 rows took " + ms + "ms to merge");
});


/* ═══════════════════════════════════════════════════════════════ */
G("AB. backup and restore — a round trip must not change anything");

const BACKUP_FILES = ["js/storage-backup.js"];

function backupCtx() {
  /* dlSaveAs belongs to js/browser-io.js and triggers a real download. This
     harness wants the PAYLOAD, so it stubs the download and uses the same
     builder/importer the app uses (buildBackupPayload / _importDecoded). */
  return browser({ also: BACKUP_FILES, extra: {
    CU: { username: "u", name: "U" },
    dlSaveAs: () => true,
    APP_VERSION: "1.5.0", KB_VERSION: "1.3.1"
  } });
}

/* _importDecoded takes a safety snapshot first and finishes the restore in a
   promise chain, so the store is still empty on the next synchronous line.
   Awaiting a real tick is the difference between testing the restore and
   testing how fast this harness reads. */
const tick = () => new Promise((r) => setTimeout(r, 0));

attack("AB1 a full round trip preserves every patient and visit", async () => {
  const c = backupCtx();
  c.run(`
    savePatients([{ id:"p1", first_name:"A", last_name:"B", mrn:"M1", age:40, sex:"F" },
                  { id:"p2", first_name:"C", last_name:"D", mrn:"M2", age:50, sex:"M" }]);
    saveVisits([{ id:"v1", patient_id:"p1", date:"${T1}", status:"completed",
                  data:{ cc:"gritty eyes", final_dx:"Dry eye" } }]);
  `);
  const before = c.run("JSON.stringify({ p: loadPatients(), v: loadVisits() })");
  const blob = c.run("JSON.stringify(buildBackupPayload())");
  c.run(`savePatients([]); saveVisits([]);`);
  c.__blob = JSON.parse(blob);
  c.run(`_importDecoded(__blob)`);
  await tick(); await tick();
  const after = c.run("JSON.stringify({ p: loadPatients(), v: loadVisits() })");
  mustEqual(after, before, "a backup round trip changed the records");
});

attack("AB2 restoring does not silently drop a visit's clinical content", async () => {
  const c = backupCtx();
  c.run(`
    savePatients([{ id:"p1", first_name:"A", last_name:"B", mrn:"M1" }]);
    saveVisits([{ id:"v1", patient_id:"p1", date:"${T1}", status:"completed",
      data:{ cc:"c", symptoms:["redness"], sl:{ findings:[{label:"Chalazion",eye:"OD"}] },
             dxList:[{ n:"Dry eye", prob:0.4 }], alerts:[{ l:"urgent", m:"x" }] } }]);
  `);
  const blob = c.run("JSON.stringify(buildBackupPayload())");
  c.run(`savePatients([]); saveVisits([]);`);
  c.__blob = JSON.parse(blob);
  c.run(`_importDecoded(__blob)`);
  await tick(); await tick();
  const v = c.run("JSON.stringify(loadVisits()[0] && loadVisits()[0].data)");
  must(v.indexOf("Chalazion") >= 0, "a slit-lamp finding was lost in the round trip: " + v);
  must(v.indexOf("Dry eye") >= 0, "the differential was lost in the round trip");
  must(v.indexOf("urgent") >= 0, "an alert was lost in the round trip");
});

attack("AB3 a truncated backup file is refused, not partly applied", () => {
  const c = backupCtx();
  c.run(`savePatients([{ id:"p1", first_name:"REAL", last_name:"B", mrn:"M1" }]);`);
  let threw = null;
  try {
    c.run(`_importDecoded({ patients: "truncated" })`);
  } catch (e) { threw = e; }
  const still = c.run("loadPatients().length");
  must(still >= 1, "a malformed backup wiped the existing records (threw: " + threw + ")");
  mustEqual(c.run("loadPatients()[0].first_name"), "REAL",
    "a malformed backup replaced a real record");
});

runAll("sync").then((n) => process.exit(n ? 1 : 0));
