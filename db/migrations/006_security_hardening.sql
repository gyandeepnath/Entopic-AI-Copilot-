-- ═══════════════════════════════════════════════════════════════
-- Entopic — 006: security hardening (second full audit, 2026-10-27)
--
-- Run after 005. Idempotent: safe to re-run. Adds no clinical data and
-- changes no existing rows EXCEPT rotating weak clinic join codes (item 2).
--
-- 1. orphan_visits showed every clinic's ids to anyone.
--    A view in `public` runs with its OWNER's rights unless it is declared
--    security_invoker, so RLS on visits/patients did not apply to it, and
--    Supabase grants SELECT on new public views to `anon` and `authenticated`.
--    Anyone holding the project's public anon key could list every clinic's
--    orphaned visit ids, clinic ids and patient ids. The view now runs with
--    the caller's rights (RLS applies) and anon cannot read it at all.
--
-- 2. Join codes: guessable, and missing for every new clinic.
--    002 back-filled a 6-hex-character code (16.7 million possibilities) for
--    clinics that existed at the time, gave new clinics none, and the join RPC
--    had no limit on attempts. A signed-in stranger guessing codes would join a
--    clinic with full write access to its records — enough to mark every patient
--    deleted, which every device then applies locally.
--    Now: every clinic gets a 12-character code from an unambiguous 31-symbol
--    alphabet (about 59 bits) when it is created; existing short codes are
--    rotated; and a user who fails 10 times in an hour is refused further
--    attempts.
--
-- 3. Audit rows could be written as "nobody".
--    audit_insert accepted user_id NULL, so a member could append unattributed
--    rows. The server now stamps the caller's own id on every row.
--
-- 4. A user could grant themselves a paid tier.
--    profiles_update_own allowed any column, including `tier`. 002 noted this
--    should be closed before licensing; it is closed now, while nothing yet
--    depends on it. The client never writes `tier`.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. orphan_visits: caller's rights, no anonymous access ─────────
create or replace view public.orphan_visits
  with (security_invoker = true) as
  select v.id, v.clinic_id, v.patient_id, v.updated_at
    from public.visits v
    left join public.patients p
      on p.id = v.patient_id and p.clinic_id = v.clinic_id
   where p.id is null
     and v.deleted is false
     and coalesce(v.patient_id, '') <> '';
revoke all on public.orphan_visits from anon, public;
grant select on public.orphan_visits to authenticated;
-- orphan_visit_count (005) is SECURITY DEFINER and checks membership itself,
-- so it keeps working unchanged.


-- ── 2. Strong join codes ───────────────────────────────────────────
-- gen_random_uuid() is drawn from the server's cryptographic random source
-- (core PostgreSQL 13+, no extension needed). Bytes 6 and 8 of a v4 uuid carry
-- the version/variant bits, so they are skipped.
create or replace function private.new_join_code()
returns text language plpgsql volatile set search_path = pg_catalog as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  hex  text := '';
  code text := '';
  b    int;
  i    int;
  u    text;
begin
  while length(hex) < 24 loop
    u := replace(gen_random_uuid()::text, '-', '');
    -- bytes 0-5 and 9-15 of each uuid (12 + 14 hex chars of full entropy)
    hex := hex || substr(u, 1, 12) || substr(u, 19, 14);
  end loop;
  for i in 0..11 loop
    b := ('x' || substr(hex, i * 2 + 1, 2))::bit(8)::int;
    code := code || substr(alphabet, (b % 31) + 1, 1);
  end loop;
  return code;
end;
$$;
revoke all on function private.new_join_code() from public, anon, authenticated;

create or replace function private.clinics_set_join_code()
returns trigger language plpgsql security definer set search_path = public, private as $$
begin
  if new.join_code is null or length(new.join_code) < 12 then
    new.join_code := private.new_join_code();
  end if;
  return new;
end;
$$;

drop trigger if exists clinics_join_code on public.clinics;
create trigger clinics_join_code
  before insert on public.clinics
  for each row execute function private.clinics_set_join_code();

-- Rotate the short (guessable) codes. Nobody could see them in the app — no
-- screen ever displayed a code — so this invalidates nothing in practice.
update public.clinics
   set join_code = private.new_join_code()
 where join_code is null or length(join_code) < 12;

-- Failed join attempts, per user, for throttling. Private: no API access.
create table if not exists private.join_attempts (
  user_id uuid not null,
  at      timestamptz not null default now()
);
create index if not exists join_attempts_user_at_idx on private.join_attempts (user_id, at);

-- Returns the clinic id, or NULL for a code that matches nothing. It must
-- RETURN rather than raise on a bad code: raising would roll back the very
-- row that records the failed attempt, and the throttle would never engage.
create or replace function private.join_clinic_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_clinic uuid;
  v_fails  int;
  v_code   text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select count(*) into v_fails from private.join_attempts
   where user_id = auth.uid() and at > now() - interval '1 hour';
  if v_fails >= 10 then
    raise exception 'too many join attempts — try again in an hour';
  end if;

  select id into v_clinic from public.clinics where join_code = v_code;

  if v_clinic is null then
    insert into private.join_attempts (user_id) values (auth.uid());
    return null;
  end if;

  insert into public.clinic_members (clinic_id, user_id, role)
  values (v_clinic, auth.uid(), 'optometrist')
  on conflict (clinic_id, user_id) do nothing;

  return v_clinic;
end;
$$;
revoke all on function private.join_clinic_by_code(text) from public, anon;
grant execute on function private.join_clinic_by_code(text) to authenticated;
-- public.join_clinic_by_code (002) wraps this one and is unchanged.


-- ── 3. Audit rows are always attributed to the caller ──────────────
create or replace function private.audit_stamp_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.at := now();
  return new;
end;
$$;

drop trigger if exists audit_log_stamp_user on public.audit_log;
create trigger audit_log_stamp_user
  before insert on public.audit_log
  for each row execute function private.audit_stamp_user();


-- ── 4. Tier is not self-serviceable ────────────────────────────────
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid() and tier = 'free');

revoke update on public.profiles from authenticated, anon;
grant update (user_id, display_name, app_role) on public.profiles to authenticated;


-- ── 5. Verify, before trusting any of the above ────────────────────
-- Run by hand on a scratch project:
--   1. as anon:            select * from orphan_visits          ⇒ permission denied
--   2. as a member of A:   select * from orphan_visits          ⇒ only clinic A rows
--   3. insert into clinics (name) values ('x') returning join_code
--                                                             ⇒ 12 characters
--   4. as a signed-in user, call join_clinic_by_code('WRONG') 10 times, then an
--      11th time                                              ⇒ 'too many join attempts'
--   5. insert into audit_log (clinic_id, user_id, action) values (<A>, null, 'x')
--                                                             ⇒ user_id = the caller
--   6. update profiles set tier = 'institutional' where user_id = auth.uid()
--                                                             ⇒ permission denied
--
-- ── Next: nothing. ──
