/* ═══════════════════════════════════════════════════════════════ */
/* KNOWLEDGE OVERLAYS — clinician-authored conditions               */
/*                                                                  */
/* The tests that matter here are the SAFETY ones. The feature is    */
/* easy; the danger is that a clinician's own condition buries a     */
/* red flag. These pin the guarantee that it cannot.                 */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");

function load(user) {
  const store = {};
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    JSON, Math, String, Number, Array, Object, Date, RegExp, parseInt, isFinite, Boolean,
    module: { exports: {} },
    CU: user || { username: "doc1", name: "Dr One" },
    KB_VERSION: "1.3.1",
    KNOWLEDGE_ALL: [{ name: "Retinal Detachment" }, { name: "Dry Eye Disease - Evaporative (MGD)" }],
    audit: [],
    loadStore: (k, d) => (Object.prototype.hasOwnProperty.call(store, k) ? JSON.parse(store[k]) : d),
    saveStore: (k, v) => { store[k] = JSON.stringify(v); return true; }
  };
  ctx.logAudit = (a, d) => ctx.audit.push({ a, d });
  vm.createContext(ctx);
  /* The REAL generated token registry: overlayValidate refuses a required
     finding the engine cannot produce, and a stub would not test that. */
  vm.runInContext(read("knowledge/token-registry.js"), ctx, { filename: "token-registry.js" });
  vm.runInContext(read("js/kb-overlay.js"), ctx, { filename: "kb-overlay.js" });
  return ctx;
}

const DRAFT = { name: "Evening Dryness — my pattern", req: ["dryness"], sup: ["burning"] };


/* ═══ THE SAFETY GUARANTEE ═══ */

test("the engine scores overlays in a SEPARATE pass, never appended to core", () => {
  /* This is the whole safety model. If overlay conditions were pushed into
     `results` and re-sorted, a personal condition requiring flashes+floaters
     could out-score Retinal Detachment and push it below the fold. */
  const eng = read("js/engine.js");
  assert.ok(/STAGE 8b: OVERLAY PASS/.test(eng), "the separate pass must exist");
  assert.ok(/var overlayResults = \[\]/.test(eng), "overlays score into their own array");
  assert.ok(!/results\.push\(orec\)/.test(eng),
    "overlay results must NEVER be pushed into the core results array");
});

test("overlays are appended below core, never interleaved", () => {
  const eng = read("js/engine.js");
  assert.ok(/mergedShown = mergedShown\.concat\(/.test(eng),
    "the merge must CONCAT overlays after core, not sort them together");
  const mergeBlock = /MERGE: core first[\s\S]*?mergedShown = mergedShown\.concat\([\s\S]*?\n  \}/.exec(eng);
  assert.ok(mergeBlock, "merge block not found");
  assert.ok(!/\.sort\(/.test(mergeBlock[0]),
    "the merged list must not be re-sorted — that would let an overlay rise above core");
});

test("core alerts are computed before overlays and are only ever ADDED to", () => {
  const eng = read("js/engine.js");
  assert.ok(/V\.alerts = computeAlerts\(tokens\);/.test(eng), "core alerts computed independently");
  assert.ok(/V\.alerts\.push\(\{/.test(eng), "user alerts are pushed, i.e. appended");
  assert.ok(!/V\.alerts = V\.alerts\.filter|V\.alerts\.splice|V\.alerts = \[\]\.concat\(overlay/.test(eng),
    "nothing may remove or replace a core alert");
});

test("an overlay can NEVER carry exclusions — the only field that removes a condition", () => {
  const c = load();
  const r = c.overlaySave({ name: "Sneaky", req: ["dryness"], exclusions: ["Retinal Detachment"] });
  assert.strictEqual(r.ok, false, "exclusions must be refused outright");
  assert.ok(r.errors.join(" ").includes("Exclusions cannot be used"));

  /* And even if validation were bypassed, the saved record is stripped. */
  const ok = c.overlaySave({ name: "Fine", req: ["dryness"] });
  assert.strictEqual(ok.ok, true);
  /* .length, not deepStrictEqual: arrays built inside the vm realm are never
     reference-equal to one built here, even when identical. */
  assert.strictEqual(ok.record.exclusions.length, 0, "exclusions are stripped on save, always");
  assert.strictEqual(c.overlayConditions()[0].exclusions.length, 0,
    "and are empty in what the engine consumes");
});

test("an overlay cannot take the name of a shipped condition", () => {
  /* A name collision would let an overlay shadow core content in every list
     keyed by name. */
  const c = load();
  const r = c.overlaySave({ name: "Retinal Detachment", req: ["flashes"] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(" ").includes("already a condition in the shipped knowledge base"));
});

test("an overlay is permanently marked as not reviewed", () => {
  /* Not "unverified until someone clicks verify" — while it is an overlay it
     is unreviewed, and review turns it into core content instead. */
  const c = load();
  const r = c.overlaySave(DRAFT);
  assert.strictEqual(r.record.review_status, "USER_AUTHORED_NOT_REVIEWED");
  assert.strictEqual(c.overlayConditions()[0].review_status, "USER_AUTHORED_NOT_REVIEWED");
  assert.ok(c.overlayConditions()[0]._overlay, "and carries the marker the UI renders from");
});


/* ═══ USER-SET URGENT FLAGS (founder decision, 2026-08-02) ═══ */

test("a user CAN mark their own condition urgent", () => {
  const c = load();
  const r = c.overlaySave({ name: "Local emergency pattern", req: ["pain_severe"],
                            urgent: true, urgent_reason: "Seen 3 times, all needed same-day referral" });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.record.urgent, true);
});

test("but an urgent flag requires a stated reason", () => {
  const c = load();
  const r = c.overlaySave({ name: "No reason given", req: ["pain_severe"], urgent: true });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(" ").includes("safety claim"));
});

test("marking urgent auto-submits it for review", () => {
  /* A clinician asserting an emergency pattern is exactly the knowledge that
     should reach everyone if it is right — and be looked at if it is not. */
  const c = load();
  const r = c.overlaySave({ name: "Urgent thing", req: ["pain_severe"],
                            urgent: true, urgent_reason: "because X" });
  assert.strictEqual(r.autoSubmitted, true);
  assert.strictEqual(r.record.state, "submitted");
});

test("a user urgent flag is written to the audit trail with its reason", () => {
  const c = load();
  c.overlaySave({ name: "Urgent thing", req: ["pain_severe"],
                  urgent: true, urgent_reason: "same-day referral needed" });
  const entry = c.audit.find((a) => a.a === "overlay_created");
  assert.ok(entry, "creation must be audited");
  assert.ok(/MARKED URGENT/.test(entry.d) && /same-day referral/.test(entry.d));
});

test("a user alert is attributed and cannot read as reviewed content", () => {
  const eng = read("js/engine.js");
  assert.ok(/YOUR ALERT/.test(eng), "user alerts must be labelled as the user's own");
  assert.ok(/not clinically reviewed/.test(eng), "and marked unreviewed");
});


/* ═══ SCOPE — one clinician's condition is not another's ═══ */

test("a personal condition is invisible to a different user", () => {
  const a = load({ username: "docA", name: "A" });
  a.overlaySave(DRAFT);
  assert.strictEqual(a.overlayActive().length, 1);

  a.CU = { username: "docB", name: "B" };
  assert.strictEqual(a.overlayActive().length, 0,
    "another clinician must not see, or be scored against, someone else's private condition");
});

test("a clinic condition is visible to everyone only once published", () => {
  const c = load({ username: "docA", name: "A" });
  const r = c.overlaySave({ name: "Clinic pattern", req: ["dryness"], scope: "clinic" });
  c.CU = { username: "docB", name: "B" };
  assert.strictEqual(c.overlayActive().length, 0, "unpublished clinic drafts stay private");

  c.CU = { username: "admin", name: "Admin" };
  c.overlayReview(r.record.id, "published", "looks right");
  c.CU = { username: "docB", name: "B" };
  assert.strictEqual(c.overlayActive().length, 1, "published reaches the clinic");
});

test("a declined condition stops being active but is not deleted", () => {
  const c = load();
  const r = c.overlaySave(DRAFT);
  c.overlaySubmit(r.record.id);
  c.overlayReview(r.record.id, "declined", "duplicates an existing condition");
  assert.strictEqual(c.overlayActive().length, 0);
  assert.strictEqual(c.overlayAll().length, 1, "the record of the decision stays");
});

test("deleting is soft — a past differential must stay explainable", () => {
  const c = load();
  const r = c.overlaySave(DRAFT);
  c.overlayDelete(r.record.id);
  assert.strictEqual(c.overlayActive().length, 0);
  assert.strictEqual(c.overlayById(r.record.id).deleted, true);
});


/* ═══ VALIDATION ═══ */

test("a condition with no required finding is refused", () => {
  /* It could never be triggered by anything, so it would silently never
     appear — worse than an error, because the author would think it worked. */
  const c = load();
  const r = c.overlaySave({ name: "Unreachable", req: [], sup: ["dryness"] });
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(" ").includes("REQUIRED finding"));
});

test("a duplicate of your own condition is refused", () => {
  const c = load();
  c.overlaySave(DRAFT);
  const r = c.overlaySave(DRAFT);
  assert.strictEqual(r.ok, false);
  assert.ok(r.errors.join(" ").includes("already have a condition"));
});


/* ═══ PROVENANCE ═══ */

test("every visit records which knowledge produced its differential", () => {
  /* Once knowledge varies per user, "the engine said X" is meaningless
     without this. */
  const c = load();
  c.overlaySave(DRAFT);
  const p = c.overlayProvenance();
  assert.strictEqual(p.core_version, "1.3.1");
  assert.strictEqual(p.overlay_count, 1);
  assert.strictEqual(p.overlay_ids.length, 1);

  const eng = read("js/engine.js");
  assert.ok(/V\.kb_provenance = overlayProvenance\(\)/.test(eng),
    "the engine must stamp provenance onto the visit");
});

test("problem foci are built from core results only", () => {
  /* A working-problem grouping built partly from unreviewed personal
     conditions would present them as established clinical problems. */
  const eng = read("js/engine.js");
  assert.ok(/computeProblemFoci\(V\.dxList\.filter\(function \(d\) \{ return !d\.overlay; \}\)\)/.test(eng),
    "problem foci must exclude overlay conditions");
});


/* ═══ WIRING ═══ */

test("the store is classified, mirrored, backed up and restored", () => {
  const cls = require("../js/data-classification.js");
  assert.ok(cls.DATA_STORES.kb_overlays);
  assert.strictEqual(cls.DATA_STORES.kb_overlays.mirror, true);
  assert.strictEqual(cls.DATA_STORES.kb_overlays.backup, true);
  assert.ok(/data\.kb_overlays/.test(read("js/storage-backup.js")),
    "and must be read back on restore");
});

test("kb-overlay.js loads before engine.js", () => {
  const order = [...read("index.html").matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(order.indexOf("js/kb-overlay.js") >= 0, "must be loaded");
  assert.ok(order.indexOf("js/kb-overlay.js") < order.indexOf("js/engine.js"),
    "the engine reads overlayConditions() — it must exist first");
});


/* ═══════════════════════════════════════════════════════════════ */
/* A CONDITION THAT CAN NEVER FIRE                                  */
/*                                                                  */
/* The token fields are free text. A clinician who types "evening    */
/* dryness" gets `evening_dryness`, which no input path produces —   */
/* so the condition never fires, and nothing said so. They leave     */
/* believing the app is watching that pattern for them. That is      */
/* worse than not having the feature.                                */
/*                                                                  */
/* Found by driving the real app: overlayValidate accepted an        */
/* invented token without comment.                                   */
/* ═══════════════════════════════════════════════════════════════ */

test("a required finding the engine cannot produce is refused", () => {
  const errs = load().overlayValidate({
    name: "My Pattern", req: ["a_finding_that_does_not_exist"], sup: [], con: []
  });
  assert.ok(errs.some((e) => /could never appear/.test(e)),
    "the reason must say why, not just 'invalid': " + JSON.stringify(errs));
});

test("a required finding the engine does produce is accepted", () => {
  const errs = load().overlayValidate({ name: "My Pattern", req: ["dryness"], sup: [], con: [] });
  /* .length, not deepStrictEqual: sandbox arrays are cross-realm. */
  assert.strictEqual(errs.length, 0, errs.join(" | "));
});

test("an unproducible SUPPORTING finding is a note, not a refusal", () => {
  /* The condition still fires on its required findings; the supporting one
     just never contributes. Refusing to save over it would be wrong. */
  const ctx = load();
  const draft = { name: "My Pattern", req: ["dryness"], sup: ["not_a_real_finding"], con: [] };
  assert.strictEqual(ctx.overlayValidate(draft).length, 0);
  const warns = ctx.overlayWarnings(draft);
  assert.strictEqual(warns.length, 1);
  assert.match(warns[0], /never add to or subtract from/);
});

test("the picker offers only findings the engine can actually produce", () => {
  const ctx = load();
  const all = ctx.overlayTokenChoices("", 0);
  assert.ok(all.length > 100, "there should be a real vocabulary to choose from");
  assert.ok(all.every((t) => ctx.overlayTokenReachable(t)),
    "offering an unreachable token would recreate the bug the picker exists to fix");
  assert.ok(all.indexOf("dryness") >= 0);

  const filtered = ctx.overlayTokenChoices("dry", 0);
  assert.ok(filtered.length && filtered.every((t) => t.toLowerCase().includes("dry")));
  assert.ok(filtered.length < all.length);
  assert.strictEqual(filtered.join(","), filtered.slice().sort().join(","), "stable order");
});

test("a missing token registry does not stop a clinician saving their work", () => {
  /* Fail open, not closed: the registry is a generated file. If it is absent,
     refusing every condition would be a worse failure than allowing one that
     might not fire. */
  const ctx = load();
  vm.runInContext("TOKEN_REGISTRY = undefined;", ctx);
  assert.strictEqual(ctx.overlayTokenReachable("anything_at_all"), true);
  assert.strictEqual(
    ctx.overlayValidate({ name: "My Pattern", req: ["anything_at_all"], sup: [], con: [] }).length, 0);
});
