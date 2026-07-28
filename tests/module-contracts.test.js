/* ═══════════════════════════════════════════════════════════════ */
/* MODULE CONTRACTS (DD finding M-6)                               */
/*                                                                  */
/* Several data/logic modules had no unit test — they were exercised */
/* only in browser E2E, which is the thinnest part of the safety     */
/* net. This pins the STRUCTURAL invariants of the data-bearing ones */
/* so a malformed clinic pack, a broken certificate template, a bad  */
/* drawing-guide entry, or a loosened cloud-config validator is      */
/* caught in CI rather than in front of a clinician.                 */
/*                                                                  */
/* Each module is browser-global (not module.exports), so it is      */
/* loaded in a VM sandbox with minimal shims — the same pattern the  */
/* other browser-module tests use.                                   */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadModule(file, extraGlobals) {
  const store = {};
  const ctx = Object.assign({
    console: { log() {}, warn() {}, error() {} },
    localStorage: {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; }
    },
    JSON, Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat,
    renderMain: () => {}, renderSidebar: () => {}, toast: () => {}, esc: (s) => s, escH: (s) => s
  }, extraGlobals || {});
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", file), "utf8"), ctx, { filename: file });
  return ctx;
}


/* ── clinics.js — every pack/step/field well-formed ──────────────── */

test("CLINIC_PACKS: every pack, step and field is structurally valid", () => {
  const ctx = loadModule("js/clinics.js");
  const packs = ctx.CLINIC_PACKS;
  assert.ok(Array.isArray(packs) && packs.length >= 5, "several clinic packs exist");

  const validTypes = new Set(["text", "num", "select", "textarea", "eyes", undefined]);
  const ids = new Set();
  const stepIds = new Set();
  for (const p of packs) {
    assert.ok(p.id && p.label, "pack has id + label: " + JSON.stringify(p).slice(0, 60));
    assert.ok(!ids.has(p.id), "pack id is unique: " + p.id);
    ids.add(p.id);
    assert.ok(Array.isArray(p.steps) && p.steps.length, p.id + " has steps");
    for (const s of p.steps) {
      assert.ok(s.id && s.label, p.id + " step has id + label");
      assert.ok(!stepIds.has(s.id), "step id is unique across all packs: " + s.id);
      stepIds.add(s.id);
      assert.ok(Array.isArray(s.groups) && s.groups.length, s.id + " has groups");
      for (const g of s.groups) {
        assert.ok(g.title && Array.isArray(g.fields), s.id + " group has title + fields");
        for (const f of g.fields) {
          assert.ok(f.k && f.l, "field has key + label in " + s.id);
          assert.ok(validTypes.has(f.type), "field type is known (" + f.type + ") in " + s.id);
          if (f.type === "select") assert.ok(Array.isArray(f.opts) && f.opts.length, "select field has options: " + f.k);
        }
      }
    }
  }
  assert.strictEqual(ctx.CLINIC_REVIEW_STATUS, "NEEDS_CLINICAL_REVIEW", "clinic content is flagged provisional");
});

test("clinicPack / clinicStepDef resolve real ids and reject unknown ones", () => {
  const ctx = loadModule("js/clinics.js");
  const first = ctx.CLINIC_PACKS[0];
  assert.strictEqual(ctx.clinicPack(first.id).id, first.id);
  assert.strictEqual(ctx.clinicPack("no-such-pack"), null);
  assert.ok(ctx.clinicStepDef(first.steps[0].id), "known step resolves");
  assert.strictEqual(ctx.clinicStepDef("no-such-step"), null);
});


/* ── certificates.js — templates produce usable drafts ───────────── */

test("CERTIFICATE_TEMPLATES: every template is well-formed and startable", () => {
  const ctx = loadModule("js/certificates.js", { V: {}, P: { first_name: "A", last_name: "B", age: "40" }, CU: { name: "Dr X" } });
  const templates = ctx.CERTIFICATE_TEMPLATES;
  assert.ok(Array.isArray(templates) && templates.length, "templates exist");
  const ids = new Set();
  for (const t of templates) {
    assert.ok(t.id && t.title, "template has id + title");
    assert.ok(!ids.has(t.id), "template id unique: " + t.id);
    ids.add(t.id);
    assert.ok(Array.isArray(t.sections) && t.sections.length, t.id + " declares sections");
    assert.ok(typeof t.statement === "string" && t.statement.length, t.id + " has a statement");
  }
  /* startable without throwing, and produces a draft with gathered rows */
  ctx.certStart(templates[0].id);
  assert.ok(ctx.CERT_DRAFT && Array.isArray(ctx.CERT_DRAFT.rows), "certStart builds a draft with rows");
  assert.strictEqual(ctx.CERT_DRAFT.template, templates[0].id);
  assert.strictEqual(ctx.certTemplate("no-such"), null);
  assert.strictEqual(ctx.CERT_REVIEW_STATUS, "NEEDS_CLINICAL_REVIEW");
});


/* ── drawing-guide.js — colour guide data + resolver ─────────────── */

test("drawing-guide: sources, charts and rules are well-formed", () => {
  const ctx = loadModule("js/drawing-guide.js");
  assert.ok(Array.isArray(ctx.DRAW_GUIDE_SOURCES) && ctx.DRAW_GUIDE_SOURCES.length >= 3, "cites multiple sources");
  for (const chart of [ctx.DRAW_GUIDE_FUNDUS, ctx.DRAW_GUIDE_ANTERIOR]) {
    assert.ok(Array.isArray(chart) && chart.length, "a chart legend exists");
    for (const entry of chart) {
      assert.ok(entry.colour || entry.color || entry.label, "legend entry has a colour/label");
    }
  }
  for (const rules of [ctx.DRAW_GUIDE_FUNDUS_RULES, ctx.DRAW_GUIDE_ANTERIOR_RULES]) {
    for (const r of rules) {
      assert.ok(!r.status || ["agreed", "varies"].includes(r.status), "rule status is agreed/varies");
    }
  }
  const g = ctx.drawGuideFor("fundus");
  assert.ok(g && Array.isArray(g.colours), "drawGuideFor returns a colour list");
  assert.strictEqual(ctx.DRAW_GUIDE_REVIEW_STATUS, "NEEDS_CLINICAL_REVIEW");
});


/* ── cloud-config.js — the connect validator is not loose ────────── */

test("configureCloud accepts a real Supabase URL + key and rejects junk", () => {
  const ctx = loadModule("js/cloud-config.js");
  assert.strictEqual(ctx.configureCloud("http://evil.example.com", "x".repeat(40)), false, "non-supabase URL rejected");
  assert.strictEqual(ctx.configureCloud("https://proj.supabase.co", "short"), false, "short key rejected");
  assert.strictEqual(ctx.configureCloud("", ""), false, "blank rejected");
  assert.strictEqual(ctx.configureCloud("https://proj.supabase.co", "a".repeat(40)), true, "valid pair accepted");
  assert.strictEqual(ctx.cloudConfigured(), true);
  ctx.disconnectCloud();
  assert.strictEqual(ctx.cloudConfigured(), false, "disconnect clears it");
});


/* ── auth-crypto.js — direct coverage of the hashing contract ────── */

test("auth-crypto: hashing is salted, deterministic per salt, and comparison is length-safe", async () => {
  const { webcrypto } = require("node:crypto");
  const ctx = {
    crypto: webcrypto, TextEncoder, TextDecoder, Promise, Uint8Array, Math, Date, String, JSON, Error, parseInt,
    console: { warn() {}, error() {} }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "..", "js/auth-crypto.js"), "utf8"), ctx, { filename: "auth-crypto.js" });

  ctx.__pw = "correct horse";
  const a = await vm.runInContext('authHashPassword(__pw, "salt1")', ctx);
  const b = await vm.runInContext('authHashPassword(__pw, "salt1")', ctx);
  const c = await vm.runInContext('authHashPassword(__pw, "salt2")', ctx);
  assert.strictEqual(a.hash, b.hash, "same password+salt → same hash");
  assert.notStrictEqual(a.hash, c.hash, "different salt → different hash (no cross-clinic rainbow)");
  assert.ok(a.hash.length === 64, "SHA-256 → 32 bytes hex");
  assert.strictEqual(vm.runInContext('authSafeEqual("abc","abc")', ctx), true);
  assert.strictEqual(vm.runInContext('authSafeEqual("abc","abd")', ctx), false);
  assert.strictEqual(vm.runInContext('authSafeEqual("abc","abcd")', ctx), false, "different lengths are unequal, not an error");
});
