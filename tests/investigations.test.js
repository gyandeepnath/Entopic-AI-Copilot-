/* ═══════════════════════════════════════════════════════════════ */
/* INVESTIGATION ORDERS — the hand-off must survive the exam         */
/*                                                                  */
/* An order is raised in the exam, performed from the shared queue  */
/* (often by someone else, often on another device), and signed off */
/* back in the exam. Each of those writes has to land, stay landed, */
/* and reach the other device.                                      */
/*                                                                  */
/* MEASURED before this file existed:                               */
/*   • cancel an order from the exam → the next autosave undid it,  */
/*     and the button looked dead (the block re-rendered from the   */
/*     exam's stale copy of the patient)                            */
/*   • results / sign-off recorded while a patient was open in       */
/*     another window → rolled back by that window's next autosave  */
/*   • no order change moved the patient's `updated` stamp, so cloud */
/*     sync never pushed it: the technician's results never reached */
/*     the ordering clinician's device                              */
/*   • a report uploaded while results were being typed wiped the   */
/*     typing (the upload wrote back a copy read before it began)   */
/*   • "Order raised" was announced even when the write was refused */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const REPO = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(REPO, f), "utf8");

function makeSandbox() {
  const store = new Map();
  const toasts = [], alerts = [];
  const sb = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 0, clearTimeout: () => {},
    Date, JSON, Set, Math, String, Number, Array, Object, RegExp, Promise, parseFloat, parseInt,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    document: { getElementById: () => null },
    alert: (m) => alerts.push(String(m)),
    toast: (m) => toasts.push(String(m)),
    renderMain: () => {}, renderHome: () => {},
    STEPS: [],
    CV: null, CP: null, V: {}, P: {}, CU: { username: "tech1" },
    __toasts: toasts, __alerts: alerts
  };
  sb.window = sb;
  sb.window.confirm = () => true;
  vm.createContext(sb);
  for (const f of ["js/storage.js", "js/dom-escape.js", "js/file-store.js",
                   "js/investigations.js", "js/investigations-ui.js"]) {
    vm.runInContext(read(f), sb, { filename: f });
  }
  vm.runInContext("function esc(s) { return escHtml(s); }", sb);
  return sb;
}

const OLD = "2026-07-01T00:00:00.000Z";
const clone = (x) => JSON.parse(JSON.stringify(x));

/* A patient open in the exam, already synced once. */
function openExam(sb, over) {
  const pt = Object.assign({ id: "p1", first_name: "Asha", updated: OLD, _cloud_updated: OLD }, over || {});
  sb.savePatients([pt]);
  sb.saveVisits([{ id: "v1", patient_id: "p1", data: {}, updated: OLD }]);
  sb.CP = "p1"; sb.CV = "v1";
  sb.P = clone(pt);
  sb.V = {};
}

function raise(sb, codes) {
  sb.INV_ORDER_DRAFT.codes = {};
  (codes || ["OCT_RNFL"]).forEach((c) => { sb.INV_ORDER_DRAFT.codes[c] = "OU"; });
  sb.invCreateOrder();
  return sb.loadPatients()[0].orders.slice(-1)[0];
}

const stored = (sb) => sb.loadPatients()[0];


test("an order raised in the exam is stored, and the exam sees it", () => {
  const sb = makeSandbox();
  openExam(sb);
  const o = raise(sb);
  assert.ok(o && o.status === "ordered", "the order reached the store");
  assert.strictEqual(sb.P.orders.length, 1, "the exam's copy shows it");
  assert.match(sb.__toasts.pop(), /now in the investigation queue/);
});

test("cancelling from the exam survives the next autosave", () => {
  const sb = makeSandbox();
  openExam(sb);
  const o = raise(sb);
  sb.invCancelOrder(o.id);
  assert.strictEqual(sb.P.orders[0].status, "cancelled",
    "the exam's own list must show the cancel — it looked like a dead button");
  sb.doSave();
  assert.strictEqual(stored(sb).orders[0].status, "cancelled",
    "the autosave must not restore the order the clinician just cancelled");
});

test("results and sign-off recorded elsewhere are not rolled back by an open exam", () => {
  const sb = makeSandbox();
  openExam(sb);
  const o = raise(sb);
  const staleExam = clone(sb.P);           /* a second window, opened before the results */

  sb.invSetItemField(o.id, 0, "avg", "78");
  sb.invMarkItem(o.id, 0, "completed");
  sb.invSetReviewNote(o.id, "Inferior thinning OD — discussed");
  sb.invMarkReviewed(o.id);
  assert.strictEqual(stored(sb).orders[0].status, "reviewed");

  sb.P = staleExam;                        /* that window autosaves */
  sb.P.first_name = "Asha K";              /* with a real demographic edit */
  sb.doSave();

  const s = stored(sb);
  assert.strictEqual(s.first_name, "Asha K", "the exam's own edit still saves");
  assert.strictEqual(s.orders[0].status, "reviewed", "the sign-off survives");
  assert.strictEqual(s.orders[0].items[0].result.avg, "78", "the recorded value survives");
  assert.strictEqual(sb.P.orders[0].status, "reviewed", "and the exam's copy is refreshed from the store");
});

test("every order change moves the patient's sync stamp", () => {
  const sb = makeSandbox();
  openExam(sb);
  const steps = [
    ["raise", () => raise(sb)],
    ["record a value", () => sb.invSetItemField(stored(sb).orders[0].id, 0, "avg", "80")],
    ["mark done", () => sb.invMarkItem(stored(sb).orders[0].id, 0, "completed")],
    ["sign off", () => sb.invMarkReviewed(stored(sb).orders[0].id)]
  ];
  let last = Date.parse(OLD);
  for (const [what, fn] of steps) {
    /* pretend the previous state was pushed */
    const pts = sb.loadPatients(); pts[0]._cloud_updated = pts[0].updated; sb.savePatients(pts);
    const before = Date.parse(stored(sb).updated);
    const t0 = Date.now(); while (Date.now() === t0) { /* next millisecond */ }
    fn();
    const after = Date.parse(stored(sb).updated);
    assert.ok(after > before && after > last,
      what + ": the stamp must advance, or cloud sync never sends the change");
    assert.ok(after > Date.parse(stored(sb)._cloud_updated), what + ": the record reads as dirty to sync");
    last = after;
  }
});

test("a refused write is reported, never announced as done", () => {
  const sb = makeSandbox();
  openExam(sb);
  vm.runInContext("savePatients = function () { return false; }", sb);
  sb.INV_ORDER_DRAFT.codes = { VF: "OU" };
  sb.invCreateOrder();
  assert.ok(!sb.__toasts.some((t) => /Order raised/.test(t)), "no success toast for an order that was not saved");
  assert.match(sb.__alerts.pop() || "", /NOT saved/);
  assert.ok(sb.INV_ORDER_DRAFT.codes.VF, "the draft is kept so the clinician can try again");
});

test("an order for a patient missing from the store is refused, not dropped silently", () => {
  const sb = makeSandbox();
  openExam(sb);
  sb.savePatients([]);                     /* deleted on another device */
  sb.INV_ORDER_DRAFT.codes = { VF: "OU" };
  sb.invCreateOrder();
  assert.match(sb.__alerts.pop() || "", /NOT saved/);
});

test("a practice patient's order does not claim to be in the shared queue", () => {
  const sb = makeSandbox();
  openExam(sb, { practice: true });
  sb.P.practice = true;
  raise(sb);
  const t = sb.__toasts.pop();
  assert.doesNotMatch(t, /now in the investigation queue/);
  assert.match(t, /practice/i);
  assert.strictEqual(sb.invAllOrders("all").length, 0, "and it indeed stays out of the queue");
});

test("an order that is under way cannot be cancelled; a cancelled one cannot be signed off", () => {
  const sb = makeSandbox();
  openExam(sb);
  const o = raise(sb);
  sb.invMarkItem(o.id, 0, "in_progress");
  sb.invCancelOrder(o.id);
  assert.strictEqual(stored(sb).orders[0].status, "in_progress", "work in progress is not hidden by a cancel");

  const o2 = raise(sb, ["VF"]);
  sb.invCancelOrder(o2.id);
  sb.invMarkReviewed(o2.id);
  assert.strictEqual(stored(sb).orders[1].status, "cancelled", "a cancelled order stays cancelled");
});

test("a report that finishes uploading does not erase results typed meanwhile", async () => {
  const sb = makeSandbox();
  openExam(sb);
  const o = raise(sb);
  let finish;
  sb.fsIngest = () => new Promise((res) => { finish = res; });
  sb.invAttachHandle({ files: [{ name: "oct.pdf" }], value: "x" }, o.id, 0);
  sb.invSetItemField(o.id, 0, "avg", "81");          /* typed while uploading */
  finish({ id: "f1", name: "oct.pdf", type: "application/pdf", size: 10 });
  await new Promise((r) => setImmediate(r));
  const it = stored(sb).orders[0].items[0];
  assert.strictEqual(it.files.length, 1, "the report is linked");
  assert.strictEqual(it.result.avg, "81", "the value typed during the upload survives");
});

test("hostile order records neither crash the queue nor inject markup", () => {
  const sb = makeSandbox();
  const X = '<img src=x onerror="window.__x=1">';
  sb.savePatients([{ id: "p1", first_name: X, orders: [
    null,
    { id: "o1", status: "constructor", created_at: "2026-01-01", urgency: X, question: X,
      items: [null, { code: "OCT_RNFL", name: X, eye: X, status: X, result: { avg: X },
                      files: [{ id: "f1", name: X, type: "image/png", size: X, thumb: 'x" onerror="window.__x=1' }] }] },
    { id: "o2", status: "completed", items: "not-a-list" }
  ] }]);
  sb.P = null;
  const html = [];
  sb.INV_QUEUE_FILTER = "all";
  html.push(sb.homeSecInvestigations());
  html.push(sb.invOrderDetail("o1"));
  sb.P = stored(sb);
  html.push(sb.invOrderBlock());
  html.push(sb.invReviewBlock());
  const all = html.join("\n");
  assert.ok(!/<img src=x/.test(all), "record text is escaped");
  assert.ok(!/onerror="window/.test(all), "no live handler from a thumbnail or a label");
  assert.ok(!/function Object/.test(all), "a status of 'constructor' is not looked up on the prototype");
});


/* ═══ Opening a file ═══ */

test("opening an investigation report goes through the validated opener", () => {
  const src = read("js/investigations.js");
  const body = /function invOpenFile[\s\S]*?\n}\n/.exec(src)[0];
  assert.match(body, /attachOpenRecord\(rec\)/, "one opener for both attachment surfaces");
  assert.doesNotMatch(body, /document\.write|\.location\s*=/, "no second, unvalidated copy");
});
