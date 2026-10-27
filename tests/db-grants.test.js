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


/* ═══ Second full audit (2026-10-27) — each of these was demonstrated on a
   real PostgreSQL 16 with Supabase's roles before it was fixed; the live
   check is tools/db/verify-migrations.js. ═══ */

test("every public view runs with the caller's rights (RLS applies to it)", () => {
  /* A view runs with its OWNER's rights unless declared security_invoker,
     so RLS on the tables beneath it does not apply. orphan_visits let anyone
     holding the public anon key list every clinic's ids. Only the LAST
     definition of each view counts. */
  const defs = {};
  const re = /create\s+(?:or\s+replace\s+)?view\s+public\.(\w+)([\s\S]*?)\bas\b/g;
  let m;
  while ((m = re.exec(SQL))) defs[m[1]] = m[2];
  assert.ok(Object.keys(defs).length > 0, "sanity: views were found");
  for (const [name, head] of Object.entries(defs)) {
    assert.match(head, /security_invoker\s*=\s*true/,
      "public." + name + " is not security_invoker — it bypasses row-level security");
  }
});

test("clinic join codes are generated server-side, long, and throttled", () => {
  assert.match(SQL, /create trigger clinics_join_code\s+before insert on public\.clinics/,
    "a new clinic must get a code when it is created (it used to get none)");
  assert.match(SQL, /for i in 0\.\.11 loop/, "12 characters");
  assert.match(SQL, /private\.join_attempts/, "failed attempts are counted");
  assert.match(SQL, /v_fails >= 10/, "and limited");
});

test("audit rows are attributed by the server, not the caller", () => {
  assert.match(SQL, /new\.user_id := auth\.uid\(\)/);
  assert.match(SQL, /create trigger audit_log_stamp_user\s+before insert on public\.audit_log/);
});

test("a user cannot raise their own entitlement tier", () => {
  assert.match(SQL, /with check \(user_id = auth\.uid\(\) and tier = 'free'\)/);
  assert.match(SQL, /revoke update on public\.profiles from authenticated/);
  assert.doesNotMatch(SQL.split("revoke update on public.profiles from authenticated").pop(),
    /grant update \([^)]*\btier\b/, "tier must not be re-granted");
});
