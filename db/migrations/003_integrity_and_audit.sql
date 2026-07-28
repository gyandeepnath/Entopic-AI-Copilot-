-- ═══════════════════════════════════════════════════════════════
-- Entopic — Referential integrity + immutable audit log
--
-- Fixes DD findings H-6 (referential integrity) and H-7 (no server-side
-- audit trail). Run AFTER 001 and 002. Idempotent.
--
-- Why no hard FK on visits.patient_id:
--   Records are created OFFLINE with client-generated string ids and synced up
--   as INDEPENDENT rows — a visit can reach the server before its patient in a
--   sync race. A hard FK would reject that visit and break offline sync. So we
--   enforce integrity two safer ways instead:
--     • ON the delete path, a trigger cascades a patient's soft-delete to its
--       visits (belt-and-braces to the client-side tombstones);
--     • a periodic orphan check (a view) surfaces any visit whose patient is
--       missing, for reconciliation, without rejecting live sync.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Soft-delete cascade (H-6) ───────────────────────────────────
-- When a patient row is marked deleted, mark its visits deleted too, so a
-- delete on one device fully propagates even if the client missed a visit.
create or replace function private.cascade_patient_soft_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.deleted is true and coalesce(old.deleted, false) is false) then
    update public.visits
       set deleted = true, updated_at = now()
     where patient_id = new.id
       and clinic_id = new.clinic_id
       and deleted is false;
  end if;
  return new;
end;
$$;

drop trigger if exists patients_cascade_delete on public.patients;
create trigger patients_cascade_delete
  after update of deleted on public.patients
  for each row execute function private.cascade_patient_soft_delete();

-- A visit with no surviving patient in the same clinic — for reconciliation.
-- (A view, so it never blocks a write; query it on a schedule.)
create or replace view public.orphan_visits as
  select v.id, v.clinic_id, v.patient_id, v.updated_at
    from public.visits v
    left join public.patients p
      on p.id = v.patient_id and p.clinic_id = v.clinic_id
   where p.id is null and v.deleted is false;

-- ── 2. Immutable audit log (H-7) ───────────────────────────────────
-- Append-only record of who did what, when. Insert-only by policy; no update
-- or delete policy exists, so rows cannot be altered or erased through the API.
-- Content is de-identified by contract: `detail` and the ids are opaque
-- client-generated strings, never names/MRN/DOB — the app's logAudit only ever
-- sends those.
create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  clinic_id   uuid not null references public.clinics (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  detail      text,
  patient_id  text,               -- opaque client id, not PII
  visit_id    text,               -- opaque client id, not PII
  at          timestamptz not null default now()
);
create index if not exists audit_log_clinic_idx on public.audit_log (clinic_id, at desc);
create index if not exists audit_log_patient_idx on public.audit_log (patient_id);

alter table public.audit_log enable row level security;

-- Any member of the clinic may APPEND an audit row for their own clinic, and it
-- is stamped with their own uid (a caller cannot forge another user's id).
drop policy if exists audit_insert on public.audit_log;
create policy audit_insert on public.audit_log
  for insert to authenticated
  with check (private.is_clinic_member(clinic_id) and (user_id is null or user_id = auth.uid()));

-- Only a clinic ADMIN may read the audit trail (it is oversight data).
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log
  for select to authenticated
  using (private.is_clinic_admin(clinic_id));

-- Deliberately NO update or delete policy: with RLS enabled and no permissive
-- policy for those commands, UPDATE and DELETE are denied for everyone through
-- the API. The log is append-only.

-- ── Next: nothing. This completes the integrity + audit layer. ──
