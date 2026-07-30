-- ═══════════════════════════════════════════════════════════════
-- Entopic — 004: EXECUTE grants for the RLS helper functions
--
-- DEPLOYMENT BLOCKER FIX (production-readiness audit, 2026-07-30).
--
-- The problem
-- -----------
-- 001 creates the tenant-isolation helpers in the `private` schema and then
-- locks them down:
--
--     revoke all on schema private from anon, authenticated;
--     revoke all on function private.is_clinic_member(uuid) from public, anon;
--
-- `authenticated` never held EXECUTE in its own right — it inherited it from
-- PUBLIC, which the revoke removed — and the schema-level REVOKE also took away
-- USAGE. Every RLS policy on clinics / clinic_members / patients / visits /
-- encounters / kb_* calls one of these helpers, and a policy expression is
-- evaluated with the *querying* role's privileges. So on a project built from
-- 001 + 002 + 003 alone, a signed-in clinician's very first request fails with:
--
--     ERROR:  permission denied for function is_clinic_member
--
-- i.e. cloud sync, multi-device and backup are dead on arrival — not partly
-- degraded, completely non-functional. Reproduced on PostgreSQL 16 (the version
-- Supabase runs) by applying 001–003 to a clean database and querying as the
-- `authenticated` role.
--
-- (The reference project this schema was reconstructed from evidently carried
-- these grants already, which is why the live deployment worked and the gap
-- went unnoticed in the SQL files.)
--
-- The fix
-- -------
-- Give `authenticated` exactly what the policies need and nothing more:
-- USAGE on the schema and EXECUTE on the four helpers. `anon` (a visitor who is
-- not signed in) stays fully locked out, which is what keeps unauthenticated
-- reads impossible. The helpers remain SECURITY DEFINER with a pinned
-- search_path, so being able to CALL one still only ever answers "is the
-- CURRENT user a member of this clinic?" — it grants no data access by itself.
--
-- Safe to run on an existing project: grants are idempotent, and this file adds
-- no tables, columns, policies or triggers. Run it after 003.
--
-- Verified after applying (PostgreSQL 16, roles simulated as Supabase does):
--   • user B of Clinic B sees ONLY Clinic B's patients — not Clinic A's
--   • user B's INSERT into Clinic A is refused by RLS
--   • `anon` is denied outright
-- ═══════════════════════════════════════════════════════════════

-- ── Schema visibility (needed before any function in it can be called) ──
grant usage on schema private to authenticated;

-- ── The four helpers every tenant-isolation policy depends on ──
grant execute on function private.is_clinic_member(uuid)    to authenticated;
grant execute on function private.is_clinic_admin(uuid)     to authenticated;
grant execute on function private.clinic_member_count(uuid) to authenticated;
grant execute on function private.is_kb_editor()            to authenticated;

-- ── Re-assert the lockout for unauthenticated callers ──
-- (Harmless if already revoked; keeps intent explicit and survives a restore
--  from an older dump where the revokes may not have been applied.)
revoke all on schema private from anon;
revoke all on function private.is_clinic_member(uuid)    from anon;
revoke all on function private.is_clinic_admin(uuid)     from anon;
revoke all on function private.clinic_member_count(uuid) from anon;
revoke all on function private.is_kb_editor()            from anon;
