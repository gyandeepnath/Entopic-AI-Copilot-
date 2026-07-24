-- ═══════════════════════════════════════════════════════════════
-- Entopic — Backend CORE schema (multi-tenant EMR + cloud KB)
--
-- Run this FIRST on a fresh Supabase project, then 002_profiles_and_invites.sql.
-- Together they reproduce the full Entopic backend on a project YOU own.
--
-- This file was reconstructed faithfully from the reference `entopic`
-- project's live schema so the design is portable to any Supabase project.
-- It is idempotent (create ... if not exists / drop policy if exists), so
-- re-running it is safe.
--
-- What it creates:
--   • private schema + SECURITY DEFINER membership helpers (RLS uses these)
--   • clinics / clinic_members         — tenants + membership & role
--   • patients / visits                — tenant-scoped clinical data (PII + exam)
--   • encounters                       — de-identified analytics (separate from PII)
--   • kb_conditions / kb_versions      — cloud knowledge base + published bundles
--   • kb_editors                       — allow-list for KB writes
--   • Row-Level Security on every table (tenant isolation, server-enforced)
--   • Realtime on patients + visits    — so a second device sees live updates
--
-- Guardrail note: NO diagnostic logic lives in the database. The engine and
-- knowledge base run in the browser, offline. This backend only stores, syncs,
-- authenticates and audits. `kb_conditions` is authoring/distribution data, not
-- a runtime dependency for producing a differential.
-- ═══════════════════════════════════════════════════════════════

-- ── 0. Private helper schema (RLS helpers live here, hidden from the API) ──
create schema if not exists private;
revoke all on schema private from anon, authenticated;

-- ── 1. Tenants + membership ────────────────────────────────────────
create table if not exists public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
  -- join_code is added by 002_profiles_and_invites.sql
);

create table if not exists public.clinic_members (
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'optometrist'
             check (role in ('admin','optometrist','ophthalmologist','technician')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

-- ── 2. Tenant-scoped clinical data (PII + exam) ────────────────────
-- Client-generated string IDs (offline-first: rows are created on-device and
-- synced up), so `id` is text, not a server uuid.
create table if not exists public.patients (
  id         text primary key,
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted    boolean not null default false
);
create index if not exists patients_clinic_idx on public.patients (clinic_id);

create table if not exists public.visits (
  id         text primary key,
  clinic_id  uuid not null references public.clinics (id) on delete cascade,
  patient_id text not null,
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  deleted    boolean not null default false
);
create index if not exists visits_clinic_idx  on public.visits (clinic_id);
create index if not exists visits_patient_idx on public.visits (patient_id);

-- ── 3. De-identified analytics registry (kept SEPARATE from PII) ────
create table if not exists public.encounters (
  id         uuid primary key default gen_random_uuid(),
  clinic_id  uuid references public.clinics (id) on delete set null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists encounters_clinic_idx on public.encounters (clinic_id);

-- ── 4. Cloud knowledge base (authoring + published bundles) ────────
create table if not exists public.kb_conditions (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique,
  domain        text not null,
  route         text not null,
  req           jsonb not null default '[]'::jsonb,
  sup           jsonb not null default '[]'::jsonb,
  con           jsonb not null default '[]'::jsonb,
  temporal      jsonb not null default '[]'::jsonb,
  tests         jsonb not null default '[]'::jsonb,
  exclusions    jsonb not null default '[]'::jsonb,
  urgent        boolean not null default false,
  icd10         text,
  icd_label     text,
  review_status text not null default 'NEEDS_CLINICAL_REVIEW'
                check (review_status in ('NEEDS_CLINICAL_REVIEW','VERIFIED','REJECTED')),
  provenance    jsonb not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);
create index if not exists kb_conditions_domain_idx on public.kb_conditions (domain);
create index if not exists kb_conditions_route_idx  on public.kb_conditions (route);
create index if not exists kb_conditions_review_idx on public.kb_conditions (review_status);

create table if not exists public.kb_versions (
  id         uuid primary key default gen_random_uuid(),
  version    text not null unique,
  notes      text,
  bundle     jsonb,
  published  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Allow-list of users permitted to write the cloud KB (KB push authors).
create table if not exists public.kb_editors (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  email    text,
  added_at timestamptz not null default now()
);

-- ── 5. RLS membership helpers (SECURITY DEFINER; used by policies) ──
-- SECURITY DEFINER + a fixed search_path lets a policy check membership
-- without giving the caller broad read rights on clinic_members (avoids
-- recursive-policy problems). Revoked from anon.
create or replace function private.is_clinic_member(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from clinic_members where clinic_id = cid and user_id = auth.uid());
$$;

create or replace function private.is_clinic_admin(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from clinic_members where clinic_id = cid and user_id = auth.uid() and role = 'admin');
$$;

create or replace function private.clinic_member_count(cid uuid)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from clinic_members where clinic_id = cid;
$$;

create or replace function private.is_kb_editor()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.kb_editors e where e.user_id = (select auth.uid()));
$$;

revoke all on function private.is_clinic_member(uuid)   from public, anon;
revoke all on function private.is_clinic_admin(uuid)    from public, anon;
revoke all on function private.clinic_member_count(uuid) from public, anon;
revoke all on function private.is_kb_editor()           from public, anon;

-- ── 6. Row-Level Security ──────────────────────────────────────────
alter table public.clinics        enable row level security;
alter table public.clinic_members enable row level security;
alter table public.patients       enable row level security;
alter table public.visits         enable row level security;
alter table public.encounters     enable row level security;
alter table public.kb_conditions  enable row level security;
alter table public.kb_versions    enable row level security;
alter table public.kb_editors     enable row level security;

-- clinics: a member can see their clinic; any signed-in user can create one.
drop policy if exists clinics_select on public.clinics;
create policy clinics_select on public.clinics
  for select using (private.is_clinic_member(id));
drop policy if exists clinics_insert on public.clinics;
create policy clinics_insert on public.clinics
  for insert with check (auth.uid() is not null);

-- clinic_members: members see the roster; you may add YOURSELF as the first
-- member of an empty clinic (the creator), otherwise only an admin may add;
-- admins or the member themselves may remove.
drop policy if exists cm_select on public.clinic_members;
create policy cm_select on public.clinic_members
  for select using (private.is_clinic_member(clinic_id));
drop policy if exists cm_insert on public.clinic_members;
create policy cm_insert on public.clinic_members
  for insert with check (
    ((user_id = auth.uid()) and (private.clinic_member_count(clinic_id) = 0))
    or private.is_clinic_admin(clinic_id)
  );
drop policy if exists cm_delete on public.clinic_members;
create policy cm_delete on public.clinic_members
  for delete using (private.is_clinic_admin(clinic_id) or (user_id = auth.uid()));

-- patients + visits: full access limited to members of the owning clinic.
drop policy if exists patients_all on public.patients;
create policy patients_all on public.patients
  for all using (private.is_clinic_member(clinic_id))
  with check (private.is_clinic_member(clinic_id));
drop policy if exists visits_all on public.visits;
create policy visits_all on public.visits
  for all using (private.is_clinic_member(clinic_id))
  with check (private.is_clinic_member(clinic_id));

-- encounters (de-identified): members read + write their clinic's rows.
drop policy if exists encounters_select on public.encounters;
create policy encounters_select on public.encounters
  for select using (private.is_clinic_member(clinic_id));
drop policy if exists encounters_insert on public.encounters;
create policy encounters_insert on public.encounters
  for insert with check (private.is_clinic_member(clinic_id));

-- kb_conditions: world-readable (the KB is shared), writable only by editors.
drop policy if exists kb_conditions_read on public.kb_conditions;
create policy kb_conditions_read on public.kb_conditions
  for select using (true);
drop policy if exists kb_conditions_editor_insert on public.kb_conditions;
create policy kb_conditions_editor_insert on public.kb_conditions
  for insert to authenticated with check (private.is_kb_editor());
drop policy if exists kb_conditions_editor_update on public.kb_conditions;
create policy kb_conditions_editor_update on public.kb_conditions
  for update to authenticated using (private.is_kb_editor()) with check (private.is_kb_editor());

-- kb_versions: PUBLISHED bundles are world-readable (this is the update-push
-- mechanism); editors see drafts and write.
drop policy if exists kb_versions_read on public.kb_versions;
create policy kb_versions_read on public.kb_versions
  for select using (published = true);
drop policy if exists kb_versions_editor_read on public.kb_versions;
create policy kb_versions_editor_read on public.kb_versions
  for select to authenticated using (private.is_kb_editor());
drop policy if exists kb_versions_editor_insert on public.kb_versions;
create policy kb_versions_editor_insert on public.kb_versions
  for insert to authenticated with check (private.is_kb_editor());
drop policy if exists kb_versions_editor_update on public.kb_versions;
create policy kb_versions_editor_update on public.kb_versions
  for update to authenticated using (private.is_kb_editor()) with check (private.is_kb_editor());

-- kb_editors: a user may read only their OWN editor row.
drop policy if exists kb_editors_read_self on public.kb_editors;
create policy kb_editors_read_self on public.kb_editors
  for select to authenticated using (auth.uid() = user_id);

-- ── 7. Realtime (live multi-device sync) ───────────────────────────
-- Full replica identity so RLS-filtered realtime can evaluate old-row values
-- on UPDATE/DELETE.
alter table public.patients replica identity full;
alter table public.visits   replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='patients') then
    alter publication supabase_realtime add table public.patients;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='visits') then
    alter publication supabase_realtime add table public.visits;
  end if;
end $$;

-- ── Next: run 002_profiles_and_invites.sql (profiles, join codes, RPC). ──
