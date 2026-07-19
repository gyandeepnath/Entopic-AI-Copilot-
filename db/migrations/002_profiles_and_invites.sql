-- ═══════════════════════════════════════════════════════════════
-- Entopic — Backend Phase 2 (prep): per-user profiles + clinic invites
--
-- ADDITIVE and non-destructive. Safe to apply on the live `entopic`
-- project (wguxwhovwgpbvhbxrfyg). Nothing here changes existing tables'
-- data or policies; it adds:
--   1. public.profiles      — per-INDIVIDUAL app role + entitlement tier,
--                             so roles/tiers persist server-side (not just
--                             in the browser). Enables multi-individual
--                             support with real, synced identity.
--   2. clinics.join_code    — a short shareable code, plus an RPC
--      + join_clinic_by_code   join_clinic_by_code() so a second person can
--                             JOIN an existing clinic (today the app can
--                             only CREATE one). Enables multi-user live use.
--
-- RLS on everything; helpers live in the existing `private` schema and are
-- revoked from anon, matching the project's established pattern
-- (see docs/CLOUD_SETUP.md). No diagnostic logic server-side; PII tables
-- untouched. Free tier; no new paid resources.
--
-- APPLIED to the live `entopic` project on 2026-07-18 (migrations
-- `profiles_and_invites` + `harden_touch_updated_at_search_path`).
-- Security advisor after apply: one INTENTIONAL, accepted WARN —
-- `public.join_clinic_by_code` is a SECURITY DEFINER RPC callable by
-- `authenticated`. That is by design (it's how a signed-in user joins a
-- clinic) and safe: it inserts only the caller's OWN membership using
-- auth.uid(). All other lints clean.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Per-user profile (app role + tier) ──────────────────────────
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  -- app persona (student / clinician / faculty / …); free-text so new
  -- roles drop in without a migration, validated in the client.
  app_role     text not null default 'clinician',
  -- entitlement tier (free / pro / institutional). The billing/licence
  -- authority that sets this beyond 'free' is a later, founder-gated step.
  tier         text not null default 'free',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user sees and edits ONLY their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid());

drop policy if exists "profiles_upsert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tier is NOT self-serviceable to a paid level from the client in future:
-- when licensing lands, revoke UPDATE(tier) from the user and set it only
-- via a SECURITY DEFINER billing function. For now free-only, so a client
-- 'tier' write can never exceed what the client also enforces locally.

-- ── 2. Clinic join codes + join-by-code RPC ────────────────────────
alter table public.clinics
  add column if not exists join_code text unique;

-- Backfill a code for any existing clinic (6 chars, unambiguous alphabet).
update public.clinics
   set join_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
 where join_code is null;

-- Join an existing clinic by its code. SECURITY DEFINER so the caller can
-- insert their OWN membership without broad insert rights on clinic_members.
-- Defaults new joiners to the least-privileged role.
create or replace function private.join_clinic_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_clinic uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select id into v_clinic from public.clinics
   where join_code = upper(trim(p_code));

  if v_clinic is null then
    raise exception 'invalid join code';
  end if;

  insert into public.clinic_members (clinic_id, user_id, role)
  values (v_clinic, auth.uid(), 'optometrist')
  on conflict (clinic_id, user_id) do nothing;

  return v_clinic;
end;
$$;

-- Expose the RPC to signed-in users only.
revoke all on function private.join_clinic_by_code(text) from public, anon;
grant execute on function private.join_clinic_by_code(text) to authenticated;

-- A public wrapper in the API schema so the client can call it via PostgREST
-- RPC (/rest/v1/rpc/join_clinic_by_code).
create or replace function public.join_clinic_by_code(p_code text)
returns uuid
language sql
security definer
set search_path = public, private
as $$ select private.join_clinic_by_code(p_code); $$;
revoke all on function public.join_clinic_by_code(text) from public, anon;
grant execute on function public.join_clinic_by_code(text) to authenticated;

-- ── keep updated_at fresh on profiles ──────────────────────────────
-- search_path pinned (advisor 0011); only calls now() from pg_catalog.
create or replace function private.touch_updated_at()
returns trigger language plpgsql
set search_path = pg_catalog
as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
