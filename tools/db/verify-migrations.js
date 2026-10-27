/* ═══════════════════════════════════════════════════════════════ */
/* VERIFY THE DATABASE MIGRATIONS ON A REAL POSTGRESQL              */
/*                                                                  */
/*   node tools/db/verify-migrations.js                             */
/*                                                                  */
/* tests/db-grants.test.js checks the SQL TEXT, which is all CI can */
/* do. This applies db/migrations/*.sql to a throwaway database on  */
/* a local PostgreSQL (16 — what Supabase runs), with Supabase's    */
/* roles stood in by tools/db/supabase-shim.sql, then acts as an    */
/* anonymous visitor, a member of each clinic, and an outsider, and */
/* checks what each can and cannot do.                              */
/*                                                                  */
/* Needs `psql` and a server it can reach: set PGHOST/PGPORT/PGUSER */
/* as usual. Creates and drops a database named entopic_verify.     */
/* Prints "held / BROKE" like the stress harnesses. Exits 2 if no   */
/* PostgreSQL is reachable (not a failure of the migrations).       */
/* ═══════════════════════════════════════════════════════════════ */
"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..", "..");
const DB = "entopic_verify";
const A = "11111111-0000-0000-0000-00000000000a", B = "22222222-0000-0000-0000-00000000000b";
const ALICE = "aaaaaaaa-0000-0000-0000-000000000001";
const BOB = "bbbbbbbb-0000-0000-0000-000000000002";
const MAL = "cccccccc-0000-0000-0000-000000000003";

function psql(db, sql, file) {
  const args = ["-X", "-q", "-tA", "-v", "ON_ERROR_STOP=1", "-d", db];
  if (file) args.push("-f", file); else args.push("-c", sql);
  try {
    return { ok: true, out: execFileSync("psql", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
  } catch (e) {
    return { ok: false, out: String((e.stderr || e.message || "")).trim() };
  }
}
const as = (who, sql) => psql(DB, who
  ? `set role authenticated; set request.jwt.claim.sub='${who}'; ${sql}`
  : `set role anon; ${sql}`);

let held = 0;
const broke = [];
function check(name, cond, detail) {
  if (cond) { held++; console.log("  held    " + name); }
  else { broke.push(name); console.log("  BROKE   " + name + (detail ? "\n            " + String(detail).slice(0, 300) : "")); }
}

if (!psql("postgres", "select 1").ok) {
  console.log("No reachable PostgreSQL (set PGHOST/PGPORT/PGUSER). Nothing was checked.");
  process.exit(2);
}
psql("postgres", `drop database if exists ${DB}`);
psql("postgres", `create database ${DB}`);
const shim = psql(DB, null, path.join(__dirname, "supabase-shim.sql"));
if (!shim.ok) { console.log("shim failed: " + shim.out); process.exit(1); }

const files = fs.readdirSync(path.join(ROOT, "db", "migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of files) {
  const r = psql(DB, null, path.join(ROOT, "db", "migrations", f));
  check("applies cleanly: " + f, r.ok, r.out);
}
const again = files.every((f) => psql(DB, null, path.join(ROOT, "db", "migrations", f)).ok);
check("every migration can be re-run (idempotent)", again);

psql(DB, `insert into public.clinics (id, name) values ('${A}','Clinic A'), ('${B}','Clinic B');
  insert into public.clinic_members (clinic_id, user_id, role) values ('${A}','${ALICE}','admin'), ('${B}','${BOB}','admin');
  insert into public.patients (id, clinic_id, data) values ('pA1','${A}','{}'), ('pB1','${B}','{}');
  insert into public.visits (id, clinic_id, patient_id, data) values ('vA1','${A}','gone-A','{}'), ('vB1','${B}','gone-B','{}');`);

console.log("\nTenant isolation");
check("Alice sees only Clinic A's patients", as(ALICE, "select string_agg(id, ',') from public.patients").out === "pA1");
check("Bob cannot write into Clinic A", !as(BOB, `insert into public.patients (id, clinic_id, data) values ('x','${A}','{}')`).ok);
check("an outsider sees no patients", as(MAL, "select count(*) from public.patients").out === "0");
check("anon cannot read patients", !as(null, "select 1 from public.patients limit 1").ok || as(null, "select count(*) from public.patients").out === "0");

console.log("\nViews");
check("anon cannot read orphan_visits", !as(null, "select 1 from public.orphan_visits").ok);
check("Bob's orphan_visits shows only Clinic B", as(BOB, "select string_agg(id, ',') from public.orphan_visits").out === "vB1");

console.log("\nJoin codes");
const codes = psql(DB, "select string_agg(length(coalesce(join_code,''))::text, ',') from public.clinics").out;
check("every clinic has a 12-character code", codes.split(",").every((n) => n === "12"), codes);
const fresh = psql(DB, "insert into public.clinics (name) values ('New') returning join_code").out;
check("a clinic created later gets one too", /^[A-HJKMNP-Z2-9]{12}$/.test(fresh), fresh);
let lastErr = "";
for (let i = 0; i < 11; i++) lastErr = as(MAL, `select public.join_clinic_by_code('WRONGCODE${i}')`).out;
check("the 11th wrong guess in an hour is refused", /too many join attempts/.test(lastErr), lastErr);
const codeA = psql(DB, `select join_code from public.clinics where id='${A}'`).out;
check("…even with the right code", /too many join attempts/.test(as(MAL, `select public.join_clinic_by_code('${codeA}')`).out));
const pretty = codeA.toLowerCase().replace(/(....)(....)(....)/, "$1-$2-$3");
check("a member can join with the code, typed with dashes and in lower case",
  as(BOB, `select public.join_clinic_by_code('${pretty}')`).out === A);
check("anon cannot call the join RPC", !as(null, "select public.join_clinic_by_code('X')").ok);

console.log("\nAudit trail");
as(BOB, `insert into public.audit_log (clinic_id, user_id, action) values ('${B}', null, 'forged')`);
check("a row sent as user_id NULL is stamped with the caller",
  psql(DB, "select user_id from public.audit_log where action='forged'").out === BOB);
check("audit rows cannot be deleted", as(ALICE, "delete from public.audit_log returning 1").out === "");
check("only an admin reads the audit trail", as(MAL, "select count(*) from public.audit_log").out === "0");

console.log("\nEntitlement tier");
check("a new profile cannot claim a paid tier",
  !as(MAL, `insert into public.profiles (user_id, app_role, tier) values ('${MAL}','clinician','institutional')`).ok);
as(MAL, `insert into public.profiles (user_id, app_role) values ('${MAL}','student')`);
check("an existing profile cannot be raised", !as(MAL, `update public.profiles set tier='institutional' where user_id='${MAL}'`).ok);
check("the app's own profile upsert still works",
  as(MAL, `insert into public.profiles (user_id, app_role) values ('${MAL}','faculty')
           on conflict (user_id) do update set user_id = excluded.user_id, app_role = excluded.app_role
           returning app_role || '/' || tier`).out === "faculty/free");

psql("postgres", `drop database if exists ${DB}`);
console.log("\n" + "═".repeat(66));
console.log("db-migrations — held: " + held + "    BROKE: " + broke.length);
console.log("═".repeat(66));
process.exit(broke.length ? 1 : 0);
