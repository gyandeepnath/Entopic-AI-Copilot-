/* ═══════════════════════════════════════════════════════════════ */
/* PERFORMANCE INSTRUMENTATION — A BOUNDED RING OF TIMINGS          */
/*                                                                  */
/* Phase 7, step 10. Observability scored 3/10, and the reason was  */
/* blunt: an engineer asked "why is this device slow?" had NOTHING  */
/* to read. Not a slow answer — no answer. Every performance figure */
/* in the Phase 7 report came from a synthetic benchmark on a       */
/* developer machine, which tells you nothing about the six-year-old*/
/* laptop in the consulting room that is actually struggling.       */
/*                                                                  */
/* WHAT THIS IS                                                     */
/*                                                                  */
/* A ring buffer of durations for the operations that were measured */
/* and found to matter: the engine run, the five storage calls, and */
/* first paint. Median and p95 per operation, computed on demand.   */
/*                                                                  */
/* WHAT THIS IS DELIBERATELY NOT                                    */
/*                                                                  */
/*  • It never leaves the device on its own. It rides along in a    */
/*    backup export, which the clinician initiates and controls.    */
/*    Telemetry that phones home is a different decision and it is  */
/*    the founder's, not mine.                                      */
/*  • It records DURATIONS AND COUNTS ONLY. No patient id, no visit */
/*    id, no token, no condition name, no free text. A performance  */
/*    log that quietly becomes a clinical log is a privacy incident */
/*    wearing a helpful hat — so the recording function physically  */
/*    cannot accept anything but a name and a number.               */
/*  • It is not a profiler and must never become the reason the app */
/*    is slow. Recording one sample is an array write into a fixed  */
/*    slot; the ring never grows.                                   */
/*                                                                  */
/* MEDIAN AND p95, NOT MEAN. A mean hides the exact thing you are   */
/* looking for. The storage benchmark learned this the hard way —   */
/* a single garbage-collection pause inside a mean made saveVisits  */
/* read as 2,552 ms when its real figure was ~600 ms, and that      */
/* wrong number was reported as a measurement.                      */
/*                                                                  */
/* Load order: early, before anything it measures. No dependencies. */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

/* Per operation, a fixed-size ring. 64 samples is enough for a stable median
   and p95 and costs a few kilobytes for the whole table. */
var PERF_RING_SIZE = 64;

/* op -> { buf: Float64Array-like array, n: total ever recorded, i: write head } */
var PERF_RINGS = Object.create(null);

/* The operations worth a name. Anything else is still recorded, but this list
   is what the health panel shows and what the export documents, so a typo in a
   call site shows up as an unknown row rather than silently vanishing. */
var PERF_KNOWN_OPS = [
  "engine_run",         /* runDiagnosticEngine, the one that must stay fast    */
  "load_visits",
  "load_patients",
  "get_patient_visits",
  "save_visits",
  "save_patients",
  "do_save",            /* the whole autosave, which is what a clinician feels */
  "first_paint"
];

function perfEnabled() {
  /* On by default. It is cheap, it is local, and a performance log that has to
     be switched on before it is useful is never on when you need it. */
  if (typeof loadSettings !== "function") return true;
  try {
    var s = loadSettings();
    return !(s && s.perf_metrics === false);
  } catch (e) { return true; }
}

/* Record one duration, in milliseconds.
   NAME AND NUMBER ONLY — see the privacy note above. A non-finite duration is
   dropped rather than stored, because a NaN in this table would poison every
   percentile computed from it. */
function perfRecord(op, durationMs) {
  if (!perfEnabled()) return;
  if (typeof op !== "string" || typeof durationMs !== "number") return;
  if (!isFinite(durationMs) || durationMs < 0) return;

  var r = PERF_RINGS[op];
  if (!r) { r = PERF_RINGS[op] = { buf: [], n: 0, i: 0 }; }
  r.buf[r.i] = durationMs;
  r.i = (r.i + 1) % PERF_RING_SIZE;
  r.n++;
}

/* Time a synchronous function and record it. Returns whatever fn returns, so
   it can wrap a call site without changing its shape.

   The timing must not be able to swallow the operation: if fn throws, the
   sample is still recorded (a slow failing path is worth seeing) and the error
   is rethrown untouched. */
function perfTime(op, fn) {
  if (!perfEnabled()) return fn();
  var t0 = _perfNow();
  try {
    return fn();
  } finally {
    perfRecord(op, _perfNow() - t0);
  }
}

function _perfNow() {
  if (typeof performance !== "undefined" && performance && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

/* Median and p95 for one operation, or null if nothing has been recorded.
   Sorting 64 numbers on demand is cheaper than maintaining order on write, and
   this is only ever called by a panel or an export. */
function perfStats(op) {
  var r = PERF_RINGS[op];
  if (!r || !r.buf.length) return null;
  var s = r.buf.slice().sort(function (a, b) { return a - b; });
  var at = function (q) { return s[Math.min(s.length - 1, Math.floor(s.length * q))]; };
  return {
    op: op,
    samples: s.length,          /* what the percentiles are computed from */
    total_recorded: r.n,        /* how many times it has ever run this session */
    p50: +at(0.5).toFixed(3),
    p95: +at(0.95).toFixed(3),
    worst: +s[s.length - 1].toFixed(3)
  };
}

/* Every operation with samples, known ones first and in declared order, so the
   panel reads the same way every time. */
function perfReport() {
  var out = [];
  var seen = Object.create(null);
  PERF_KNOWN_OPS.forEach(function (op) {
    seen[op] = true;
    var st = perfStats(op);
    if (st) out.push(st);
  });
  Object.keys(PERF_RINGS).forEach(function (op) {
    if (seen[op]) return;
    var st = perfStats(op);
    if (st) { st.unknown_op = true; out.push(st); }
  });
  return out;
}

/* Cleared on demand — before reproducing a complaint, for instance, so the
   numbers describe the thing being reproduced and not the whole morning. */
function perfReset() { PERF_RINGS = Object.create(null); }

/* What rides along in a backup export. Durations and counts; nothing else.
   Carries the shape of the device so the numbers can be read in context —
   a 300 ms save means something different on a 12-visit clinic than on a
   full one. */
function perfExportPayload() {
  var payload = { at: new Date().toISOString(), ops: perfReport() };
  try {
    if (typeof storageUsage === "function") {
      var u = storageUsage();
      payload.store_bytes = u && u.bytes;
      payload.store_pct = u && u.pct;
    }
    if (typeof loadVisits === "function") payload.visit_count = loadVisits().length;
    if (typeof loadPatients === "function") payload.patient_count = loadPatients().length;
  } catch (e) { /* context is a bonus, never a reason to lose the timings */ }
  return payload;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PERF_RING_SIZE: PERF_RING_SIZE, PERF_KNOWN_OPS: PERF_KNOWN_OPS,
    perfRecord: perfRecord, perfTime: perfTime, perfStats: perfStats,
    perfReport: perfReport, perfReset: perfReset,
    perfExportPayload: perfExportPayload, perfEnabled: perfEnabled
  };
}
