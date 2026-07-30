/* ═══════════════════════════════════════════════════════════════ */
/* DATABASE GRANTS — tenant isolation must remain OPERABLE          */
/*                                                                  */
/* The production-readiness audit (2026-07-30) found that applying   */
/* 001–003 to a clean project produced a backend where every request */
/* failed with "permission denied for function is_clinic_member":    */
/* the RLS helpers were revoked from PUBLIC (which is where the      */
/* `authenticated` role inherited EXECUTE from) and never granted    */
/* back. Cloud sync was dead on arrival. 004 fixes it.               */
/*                                                                  */
/* CI cannot run PostgreSQL, so this pins the invariant at the SQL   */
/* text level: every helper an RLS policy calls must be granted to   */
/* `authenticated` somewhere in the migration set, and must stay     */
/* revoked from `anon`. It is a coarse guard, but it is the one that */
/* would have caught this bug before a clinic depended on it.        */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const DIR = path.resolve(__dirname, "..", "db", "migrations");
const SQL = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()
  .map((f) => fs.readFileSync(path.join(DIR, f), "utf8")).join("\n")
  .toLowerCase();

/* The helpers the RLS policies call. If a new one is added to a policy
   without a matching grant, the backend breaks the same way again. */
const HELPERS = [
  "private.is_clinic_member",
  "private.is_clinic_admin",
  "private.clinic_member_count",
  "private.is_kb_editor"
];

test("every RLS helper used by a policy is granted to authenticated", () => {
  for (const fn of HELPERS) {
    const bare = fn.split(".")[1];
    const usedInPolicy = SQL.includes(fn + "(") || SQL.includes(bare + "(");
    if (!usedInPolicy) continue;
    const granted = new RegExp(
      "grant\\s+execute\\s+on\\s+function\\s+" + fn.replace(/\./g, "\\.") + "\\s*\\([^)]*\\)\\s*to\\s+[^;]*authenticated"
    ).test(SQL);
    assert.ok(granted, fn + " is called by an RLS policy but never granted to authenticated — " +
      "every query against the protected tables will fail with 'permission denied for function'");
  }
});

test("the private schema is usable by authenticated and closed to anon", () => {
  assert.ok(/grant\s+usage\s+on\s+schema\s+private\s+to\s+[^;]*authenticated/.test(SQL),
    "authenticated needs USAGE on the private schema to call the RLS helpers");
  assert.ok(/revoke\s+all\s+on\s+schema\s+private\s+from\s+[^;]*anon/.test(SQL),
    "anon (signed-out) must stay locked out of the private schema");
});

test("no RLS helper is granted to anon", () => {
  for (const fn of HELPERS) {
    const grantedToAnon = new RegExp(
      "grant\\s+execute\\s+on\\s+function\\s+" + fn.replace(/\./g, "\\.") + "\\s*\\([^)]*\\)\\s*to\\s+[^;]*\\banon\\b"
    ).test(SQL);
    assert.strictEqual(grantedToAnon, false, fn + " must never be executable by anon");
  }
});

test("row-level security is enabled on every table holding clinical data", () => {
  for (const t of ["patients", "visits", "clinics", "clinic_members", "encounters", "audit_log", "profiles"]) {
    assert.ok(new RegExp("alter\\s+table\\s+(public\\.)?" + t + "\\s+enable\\s+row\\s+level\\s+security").test(SQL),
      t + " must have RLS enabled");
  }
});

test("the audit log is append-only (no update/delete policy)", () => {
  assert.ok(!/create\s+policy[^;]*on\s+public\.audit_log[^;]*for\s+(update|delete)/.test(SQL),
    "audit_log must carry no UPDATE or DELETE policy — it is the tamper-evidence record");
});
