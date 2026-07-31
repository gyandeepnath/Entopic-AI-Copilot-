/* ═══════════════════════════════════════════════════════════════ */
/* FILE STORE — attachments, quota, and the failure paths           */
/*                                                                  */
/* The test audit named this the highest-value untested file: it     */
/* handles the LARGEST objects the app stores (fundus photos, OCT    */
/* printouts, scanned reports) on the code path most likely to hit   */
/* a storage ceiling.                                                */
/*                                                                  */
/* The clinically important property is not that attaching works —   */
/* it is that a FAILED attach is never reported as a success. An     */
/* attachment listed on a record but not actually stored is a        */
/* documentation-integrity fault: the clinician believes the OCT is  */
/* filed, and it is not there.                                       */
/*                                                                  */
/* IndexedDB, canvas and FileReader do not exist in Node, so the     */
/* sandbox provides controllable fakes. That is the point: it lets   */
/* each failure be injected deliberately rather than hoped for.      */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

/* A fake Blob/File good enough for size arithmetic and identity. */
class FakeBlob {
  constructor(size, type, name) { this.size = size; this.type = type || ""; this.name = name || ""; }
}

/* opts.idb: "ok" | "absent" | "quota"     opts.reader: "ok" | "fail" */
function device(opts) {
  opts = opts || {};
  const idbData = new Map();
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, Date, String, Number, Array, Object, RegExp, Promise, Error,
    isNaN, parseInt, parseFloat, setTimeout,
    navigator: {},
    __idbData: idbData,
    __idbMode: opts.idb || "ok"
  };
  ctx.window = ctx;

  /* Minimal IndexedDB with an injectable failure mode. */
  if (opts.idb !== "absent") {
    ctx.indexedDB = {
      open() {
        const rq = { result: null, error: null };
        setTimeout(() => {
          if (ctx.__idbMode === "openfail") { rq.error = new Error("idb-open"); rq.onerror && rq.onerror(); return; }
          rq.result = {
            objectStoreNames: { contains: () => true },
            close() {},
            transaction() {
              const tx = {};
              const store = {
                put(blob, id) {
                  if (ctx.__idbMode === "quota") {
                    setTimeout(() => { tx.error = new Error("QuotaExceededError"); tx.onerror && tx.onerror(); }, 0);
                    return {};
                  }
                  idbData.set(id, blob);
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                  return {};
                },
                get(id) {
                  const r = { result: idbData.get(id) };
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                  return r;
                },
                delete(id) {
                  idbData.delete(id);
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                  return {};
                }
              };
              tx.objectStore = () => store;
              return tx;
            }
          };
          rq.onsuccess && rq.onsuccess();
        }, 0);
        return rq;
      }
    };
  }

  ctx.URL = {
    createObjectURL: (b) => "blob:fake/" + (b && b.size),
    revokeObjectURL() {}
  };
  ctx.FileReader = class {
    readAsDataURL(blob) {
      setTimeout(() => {
        if (opts.reader === "fail") { this.error = new Error("read-failed"); this.onerror && this.onerror(); }
        else { this.result = "data:" + (blob.type || "application/octet-stream") + ";base64,AAAA"; this.onload && this.onload(); }
      }, 0);
    }
  };
  /* No document/Image: image compression is genuinely unavailable, which is
     itself a path worth exercising (the ingest must still store the original). */
  vm.createContext(ctx);
  vm.runInContext(read("js/file-store.js"), ctx, { filename: "file-store.js" });
  return ctx;
}

const run = (ctx, expr, vars) => { Object.assign(ctx, vars || {}); return vm.runInContext(expr, ctx); };


/* ═══ Pure helpers and their boundaries ═══ */

test("fsHumanSize is exact at every unit boundary", () => {
  const ctx = device();
  const cases = [[0, "0 B"], [1, "1 B"], [1023, "1023 B"], [1024, "1 KB"],
                 [1048575, "1024 KB"], [1048576, "1.0 MB"], [5 * 1048576, "5.0 MB"]];
  for (const [bytes, expected] of cases) {
    assert.strictEqual(run(ctx, "fsHumanSize(" + bytes + ")"), expected, bytes + " bytes");
  }
  assert.strictEqual(run(ctx, "fsHumanSize(null)"), "0 B", "a missing size must not render NaN to a clinician");
  assert.strictEqual(run(ctx, "fsHumanSize(undefined)"), "0 B");
});

test("fsIsImage accepts image types and rejects everything else", () => {
  const ctx = device();
  for (const t of ["image/jpeg", "image/png", "IMAGE/PNG", "image/heic"]) {
    assert.strictEqual(run(ctx, "fsIsImage(" + JSON.stringify(t) + ")"), true, t);
  }
  /* A PDF must never be re-encoded as a JPEG — that would destroy a report. */
  for (const t of ["application/pdf", "text/plain", "", null, undefined, "notimage/jpeg"]) {
    assert.strictEqual(run(ctx, "fsIsImage(" + JSON.stringify(t) + ")"), false, String(t));
  }
});

test("fsProfile falls back to the default rather than returning undefined", () => {
  const ctx = device();
  assert.strictEqual(run(ctx, "fsProfile('diagnostic').maxDim"), 2600);
  assert.strictEqual(run(ctx, "fsProfile('nonsense').maxDim"), run(ctx, "fsProfile('standard').maxDim"),
    "an unknown profile must not crash the ingest path");
  assert.strictEqual(run(ctx, "fsProfile(undefined).maxDim"), run(ctx, "fsProfile('standard').maxDim"));
});

test("the diagnostic profile really is the least lossy", () => {
  /* The UI promises "Diagnostic — most detail". If the numbers ever drift so
     that a lower profile keeps more, the promise silently becomes false. */
  const ctx = device();
  const p = run(ctx, "FS_PROFILES");
  assert.ok(p.diagnostic.maxDim > p.standard.maxDim && p.standard.maxDim > p.compact.maxDim,
    "resolution must decrease diagnostic > standard > compact");
  assert.ok(p.diagnostic.quality > p.standard.quality && p.standard.quality > p.compact.quality,
    "quality must decrease in the same order");
});


/* ═══ Ingest: the failure paths ═══ */

test("an oversized file is refused with a message naming the file and both sizes", () => {
  const ctx = device();
  const big = new FakeBlob(60 * 1024 * 1024, "application/pdf", "huge-scan.pdf");
  return run(ctx, "fsIngest(__f)", { __f: big }).then(
    () => assert.fail("a 60 MB file must be refused"),
    (err) => {
      assert.ok(/huge-scan\.pdf/.test(err.message), "names the file");
      assert.ok(/60\.0 MB/.test(err.message), "states its size");
      assert.ok(/40\.0 MB/.test(err.message), "states the limit, so the clinician knows what would fit");
    }
  );
});

test("a PDF is stored byte-for-byte and never re-encoded", () => {
  const ctx = device();
  const pdf = new FakeBlob(500 * 1024, "application/pdf", "OCT-report.pdf");
  return run(ctx, "fsIngest(__f)", { __f: pdf }).then((rec) => {
    assert.strictEqual(rec.type, "application/pdf", "the type is preserved");
    assert.strictEqual(rec.size, 500 * 1024, "the size is unchanged");
    assert.strictEqual(rec.compressed, false, "a clinical report must not be lossily re-encoded");
    assert.strictEqual(rec.store, "idb");
    assert.strictEqual(ctx.__idbData.get(rec.id), pdf, "the exact original bytes are what got stored");
  });
});

test("when IndexedDB is unavailable, a small file falls back to inline and SAYS so", () => {
  const ctx = device({ idb: "absent" });
  const small = new FakeBlob(100 * 1024, "application/pdf", "note.pdf");
  return run(ctx, "fsIngest(__f)", { __f: small }).then((rec) => {
    assert.strictEqual(rec.store, "inline", "the record records where the bytes actually went");
    assert.ok(rec.dataUrl && rec.dataUrl.length > 0, "and carries them");
  });
});

test("when IndexedDB is unavailable, a large file is REFUSED, not silently dropped", () => {
  /* The dangerous outcome would be resolving a record with no bytes: the
     record would list the attachment and the file would not exist. */
  const ctx = device({ idb: "absent" });
  const big = new FakeBlob(3 * 1024 * 1024, "application/pdf", "fundus-set.pdf");
  return run(ctx, "fsIngest(__f)", { __f: big }).then(
    () => assert.fail("must not resolve — there is nowhere to put the bytes"),
    (err) => {
      assert.ok(/fundus-set\.pdf/.test(err.message), "names the file");
      assert.ok(/IndexedDB/i.test(err.message), "explains why this browser cannot take it");
    }
  );
});

test("an IndexedDB quota failure never yields a record claiming the file is stored", () => {
  /* The clinically critical case: the device is full. Either the bytes end up
     inline, or the attach fails loudly. What must NEVER happen is a resolved
     record whose bytes are nowhere. */
  const ctx = device({ idb: "quota" });
  const f = new FakeBlob(300 * 1024, "application/pdf", "vf.pdf");
  return run(ctx, "fsIngest(__f)", { __f: f }).then(
    (rec) => {
      assert.strictEqual(rec.store, "inline",
        "if it resolves, it must have fallen back to inline storage");
      assert.ok(rec.dataUrl, "and the bytes must actually be in the record");
    },
    (err) => { assert.ok(err && err.message, "or it must reject with a reason"); }
  );
});

test("a zero-byte file is refused rather than filed as a document", () => {
  /* A failed scan or an interrupted upload produces one. Recording it as an
     attachment tells the clinician a document exists when none does. */
  const ctx = device();
  const empty = new FakeBlob(0, "application/pdf", "scan.pdf");
  return run(ctx, "fsIngest(__f)", { __f: empty }).then(
    () => assert.fail("an empty file must not be filed as an attachment"),
    (err) => assert.ok(/empty|0 B|no content/i.test(err.message),
      "the message must say the file is empty, got: " + err.message)
  );
});

test("the record carries the provenance a clinical attachment needs", () => {
  const ctx = device();
  ctx.CU = { username: "dr.nath" };
  const f = new FakeBlob(1000, "application/pdf", "letter.pdf");
  return run(ctx, "fsIngest(__f)", { __f: f }).then((rec) => {
    assert.ok(rec.id, "an id");
    assert.ok(rec.added, "when it was added");
    assert.strictEqual(rec.added_by, "dr.nath", "and who added it");
    assert.strictEqual(rec.orig_size, 1000, "the original size is kept even if stored size differs");
    assert.strictEqual(rec.cloud, "pending", "and its sync state");
  });
});

test("two files ingested together get distinct ids", () => {
  /* Ids are time-plus-random; a collision would make one attachment overwrite
     the other's bytes in IndexedDB. */
  const ctx = device();
  const mk = () => run(ctx, "fsIngest(__f)", { __f: new FakeBlob(10, "application/pdf", "a.pdf") });
  return Promise.all([mk(), mk(), mk(), mk(), mk()]).then((recs) => {
    const ids = new Set(recs.map((r) => r.id));
    assert.strictEqual(ids.size, recs.length, "every attachment needs its own key");
  });
});


/* ═══ Reading back ═══ */

test("a stored file resolves to something openable", () => {
  const ctx = device();
  const f = new FakeBlob(2048, "application/pdf", "report.pdf");
  return run(ctx, "fsIngest(__f)", { __f: f })
    .then((rec) => run(ctx, "fsResolveUrl(__r)", { __r: rec }))
    .then((url) => assert.ok(url && url.length > 0, "the clinician can open what they filed"));
});

test("a record whose bytes are gone resolves to empty, so the caller can warn", () => {
  /* Site data cleared for IndexedDB but not localStorage leaves exactly this:
     a record listing an attachment whose bytes no longer exist. Returning ""
     is what lets both call sites say "could not be read back from this device"
     instead of opening a blank window. */
  const ctx = device();
  const f = new FakeBlob(2048, "application/pdf", "report.pdf");
  return run(ctx, "fsIngest(__f)", { __f: f }).then((rec) => {
    ctx.__idbData.clear();                       /* the bytes vanish */
    return run(ctx, "fsResolveUrl(__r)", { __r: rec });
  }).then((url) => {
    assert.strictEqual(url, "", "missing bytes must be distinguishable from a working attachment");
  });
});

test("both call sites warn the clinician when an attachment cannot be read", () => {
  /* The contract above is only worth anything if the callers act on it. */
  for (const f of ["js/ui-attach.js", "js/investigations.js"]) {
    const src = read(f);
    const m = /fsResolveUrl\([^)]*\)\.then\(function \([^)]*\) \{\s*\n?\s*if \(!url\)/.exec(src);
    assert.ok(m, f + " must check for an empty url before opening a window");
    assert.ok(/could not be read back from this device/.test(src),
      f + " must tell the clinician the file is missing, not open a blank window");
  }
});

test("forgetting a file removes its bytes, and is safe to repeat", () => {
  const ctx = device();
  const f = new FakeBlob(100, "application/pdf", "x.pdf");
  let rec;
  return run(ctx, "fsIngest(__f)", { __f: f })
    .then((r) => { rec = r; assert.strictEqual(ctx.__idbData.size, 1); return run(ctx, "fsForget(__r)", { __r: rec }); })
    .then(() => {
      assert.strictEqual(ctx.__idbData.size, 0, "the bytes are gone");
      return run(ctx, "fsForget(__r)", { __r: rec });      /* again */
    })
    .then(() => assert.ok(true, "deleting twice must not throw — cleanup runs on already-removed records"));
});


/* ═══ The cloud leg must never become a runtime dependency ═══ */

test("upload no-ops cleanly when no cloud project is configured", () => {
  /* Offline-first is a hard guardrail: documenting an exam must never depend
     on the network. */
  const ctx = device();
  ctx.cloudConfigured = () => false;
  return run(ctx, "fsCloudUpload({id:'f1',name:'a.pdf'})").then((res) => {
    assert.strictEqual(res.skipped, "cloud-not-configured");
  });
});

test("upload no-ops when configured but signed out", () => {
  const ctx = device();
  ctx.cloudConfigured = () => true;
  ctx.CLOUD = { session: null };
  return run(ctx, "fsCloudUpload({id:'f1',name:'a.pdf'})").then((res) => {
    assert.strictEqual(res.skipped, "signed-out");
  });
});
