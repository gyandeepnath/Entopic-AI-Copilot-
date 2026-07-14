/* ═══════════════════════════════════════════════════════════════ */
/* KB AUTHORING (compiler + linter)                                */
/* This module is the gate the founder's editor runs every draft     */
/* through, and the same gate the bulk seeder uses. If it misses a    */
/* contradiction or a dead ("can never fire") condition, bad clinical */
/* content reaches the engine. These tests pin every check.          */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const A = require("../js/kb-authoring");

/* A small synthetic KB + token vocabulary for deterministic tests. */
const CTX = {
  routes: A.KB_KNOWN_ROUTES,
  conditions: [
    { name: "Dry Eye Disease - Evaporative (MGD)", route: "surface", req: ["dryness"], sup: ["burning", "worse_evening", "fluctuating_blur"], con: ["itching_dominant"] },
    { name: "Allergic Conjunctivitis", route: "surface", req: ["itching_dominant"], sup: ["redness", "watering"], con: [] },
    { name: "Retinal Tear", route: "urgent", req: ["flashes", "floaters"], sup: [], con: [], urgent: true }
  ],
  tokenInfo: {
    dryness: { reachable: true }, burning: { reachable: true }, worse_evening: { reachable: true },
    fluctuating_blur: { reachable: true }, itching_dominant: { reachable: true }, redness: { reachable: true },
    watering: { reachable: true }, flashes: { reachable: true }, floaters: { reachable: true },
    grittiness: { reachable: true },
    /* a token that exists in the vocabulary but nothing produces */
    orphan_sign: { reachable: false }
  }
};

const lint = (draft, extra) => A.kbLintCondition(draft, Object.assign({}, CTX, extra || {}));
const codes = (arr) => arr.map((x) => x.code);

test("normalize coerces comma/newline strings to clean token arrays and de-dupes", () => {
  const c = A.kbNormalizeDraft({ name: "  Test  ", route: "surface", req: "dryness, dryness\nburning", urgent: "true" });
  assert.strictEqual(c.name, "Test");
  assert.deepStrictEqual(Array.from(c.req), ["dryness", "burning"]);
  assert.strictEqual(c.urgent, true);
  assert.strictEqual(c.icd_status, "NEEDS_CLINICAL_REVIEW", "always provisional");
});

test("a clean, novel condition passes with no errors", () => {
  const r = lint({ name: "Filamentary Keratitis", route: "anterior", req: ["dryness"], sup: ["grittiness"], con: [] });
  assert.deepStrictEqual(Array.from(r.errors), [], "no errors: " + JSON.stringify(r.errors));
});

test("duplicate name is an error", () => {
  const r = lint({ name: "allergic  conjunctivitis", route: "surface", req: ["itching_dominant"] });
  assert.ok(codes(r.errors).includes("duplicate"), "exact/case-insensitive dup flagged");
});

test("near-duplicate (high token overlap) is warned, not blocked", () => {
  const r = lint({ name: "MGD Dry Eye", route: "surface", req: ["dryness"], sup: ["burning", "worse_evening", "fluctuating_blur"], con: [] });
  assert.deepStrictEqual(Array.from(r.errors), [], "similar but not identical → not an error");
  assert.ok(codes(r.warnings).includes("near_duplicate"), "warned about similarity");
  assert.ok(r.similar.some((s) => s.name.includes("Evaporative")), "names the similar condition");
});

test("token in both req and con is a hard error", () => {
  const r = lint({ name: "Contradiction A", route: "surface", req: ["dryness"], con: ["dryness"] });
  assert.ok(codes(r.errors).includes("req_and_con"));
});

test("token in both sup and con is a hard error", () => {
  const r = lint({ name: "Contradiction B", route: "surface", req: ["dryness"], sup: ["redness"], con: ["redness"] });
  assert.ok(codes(r.errors).includes("sup_and_con"));
});

test("TOKEN FIRING: a required token nothing produces is warned as never-surfacing", () => {
  const unknown = lint({ name: "Ghost Condition", route: "anterior", req: ["totally_new_token"] });
  assert.ok(codes(unknown.warnings).includes("unknown_req_token"), "unknown req token → can-never-fire warning");
  const orphan = lint({ name: "Orphan Condition", route: "anterior", req: ["orphan_sign"] });
  assert.ok(codes(orphan.warnings).includes("unreachable_req_token"), "known-but-unproduced req token → warning");
});

test("bad route is an error; empty route is an error", () => {
  assert.ok(codes(lint({ name: "X", route: "eyeball" }).errors).includes("bad_route"));
  assert.ok(codes(lint({ name: "X", route: "" }).errors).includes("no_route"));
});

test("acute+chronic temporal clash is warned", () => {
  const r = lint({ name: "Temporal Clash", route: "surface", req: ["dryness"], temporal: ["acute", "chronic"] });
  assert.ok(codes(r.warnings).includes("temporal_clash"));
});

test("urgent with no required token is warned", () => {
  const r = lint({ name: "Vague Emergency", route: "urgent", req: [], urgent: true });
  assert.ok(codes(r.warnings).includes("urgent_no_req"));
  assert.ok(codes(r.warnings).includes("no_required"));
});

test("dead exclusion (matches nothing) and self-exclusion are warned", () => {
  const dead = lint({ name: "Excluder", route: "surface", req: ["dryness"], exclusions: ["nonexistent_condition"] });
  assert.ok(codes(dead.warnings).includes("dead_exclusion"));
  const self = lint({ name: "Allergic Conjunctivitis Redux", route: "surface", req: ["itching_dominant"], exclusions: ["allergic_conjunctivitis_redux"] });
  assert.ok(codes(self.warnings).includes("self_exclude"));
});

test("editing an existing condition (excludeName) does not self-flag as duplicate", () => {
  const r = lint(
    { name: "Allergic Conjunctivitis", route: "surface", req: ["itching_dominant"], sup: ["redness", "watering", "bilateral"] },
    { excludeName: "Allergic Conjunctivitis" }
  );
  assert.ok(!codes(r.errors).includes("duplicate"), "editing self is allowed");
});

test("a valid exclusion by snake_case fragment is accepted (matches engine matcher)", () => {
  const r = lint({ name: "Something", route: "surface", req: ["dryness"], exclusions: ["allergic_conjunctivitis"] });
  assert.ok(!codes(r.warnings).includes("dead_exclusion"), "real target not flagged dead");
});

test("every draft carries the provisional reminder", () => {
  const r = lint({ name: "Anything", route: "surface", req: ["dryness"] });
  assert.ok(codes(r.infos).includes("provisional"));
});
