-- ═══════════════════════════════════════════════════════════════
-- Entopic — 005: sync integrity + the indexes the paginated pull needs
--
-- Closes backend-audit findings BE-6, BE-8 and BE-17. Run after 004.
-- Idempotent: safe to re-run.
--
-- ── BE-17 · THE DEVICE CLOCK WAS THE ARBITER (the important one) ──
--
-- `updated_at` was stamped CLIENT-side and the merge trusts it absolutely:
-- whichever side has the higher timestamp wins. So a clinic laptop whose clock
-- is an hour slow produced records that LOSE every conflict to an older remote
-- version — silently, with no error anywhere, and no way for the clinician to
-- notice. Clock skew is not exotic; a machine that has been off for a week, a
-- VM restored from a snapshot, or a manually-set date all produce it.
--
-- The server has now() and was not using it. After this migration the server
-- stamps `updated_at` on every insert and update, so the ordering that decides
-- which version of a patient record survives comes from ONE clock instead of
-- from every device independently.
--
-- Compatibility: clients still SEND updated_at. The trigger overwrites it, so
-- an old client is not broken — it simply stops being trusted. That is the
-- point, and it is why this needs no client release to take effect.
--
-- What this deliberately does NOT do: change the client's merge rule. A device
-- still keeps its own unpushed edits and records a conflict rather than losing
-- them. This only fixes WHOSE clock decides "newer".
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Server-authoritative updated_at (BE-17) ─────────────────────
create or replace function private.stamp_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Deliberately unconditional. Honouring a client-supplied value "when it
  -- looks reasonable" would reintroduce exactly the ambiguity this removes.
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists patients_stamp_updated_at on public.patients;
create trigger patients_stamp_updated_at
  before insert or update on public.patients
  for each row execute function private.stamp_updated_at();

drop trigger if exists visits_stamp_updated_at on public.visits;
create trigger visits_stamp_updated_at
  before insert or update on public.visits
  for each row execute function private.stamp_updated_at();


-- ── 2. The indexes the paginated pull needs (BE-6) ─────────────────
-- The client now pages with:
--     ?order=updated_at.asc&limit=500&updated_at=gte.<cursor>
-- filtered by RLS on clinic_id. Without a matching composite index every page
-- is a sort of the clinic's whole partition — invisible at 500 visits, a
-- full-partition sort per page at 50,000.
--
-- CONCURRENTLY cannot run inside a transaction block, and the Supabase SQL
-- editor wraps statements in one, so these are plain CREATE INDEX. On a live
-- database with a large visits table this takes a brief write lock; run it in
-- a quiet window, or run the CONCURRENTLY variants from psql instead.
create index if not exists patients_clinic_updated_idx
  on public.patients (clinic_id, updated_at);
create index if not exists visits_clinic_updated_idx
  on public.visits (clinic_id, updated_at);

-- Live rows are what the pull asks for; soft-deleted rows are handled by
-- tombstones. A partial index keeps the working set small as deletions build up.
create index if not exists patients_clinic_live_idx
  on public.patients (clinic_id, updated_at) where deleted = false;
create index if not exists visits_clinic_live_idx
  on public.visits (clinic_id, updated_at) where deleted = false;


-- ── 3. Visit tombstones no longer look like orphans (BE-8) ─────────
-- cloudDrainTombstones wrote `patient_id: ''` for a visit tombstone, because
-- the column is NOT NULL and the client no longer holds the record. Those rows
-- then appear in the orphan_visits reconciliation view as false positives —
-- harmless today, and guaranteed to confuse whoever first uses that view
-- during an incident.
--
-- The view now excludes soft-deleted rows AND rows with no patient_id at all,
-- so what it reports is only ever a genuine integrity problem: a LIVE visit
-- whose patient is missing from the same clinic.
create or replace view public.orphan_visits as
  select v.id, v.clinic_id, v.patient_id, v.updated_at
    from public.visits v
    left join public.patients p
      on p.id = v.patient_id and p.clinic_id = v.clinic_id
   where p.id is null
     and v.deleted is false
     and coalesce(v.patient_id, '') <> '';

-- A count an admin panel can show without pulling the rows themselves.
-- SECURITY DEFINER + an explicit membership check: a caller can ask about
-- THEIR clinic and no other.
create or replace function public.orphan_visit_count(cid uuid)
returns integer language plpgsql stable security definer set search_path = public as $$
begin
  if not private.is_clinic_member(cid) then
    raise exception 'not a member of that clinic';
  end if;
  return (select count(*)::int from public.orphan_visits where clinic_id = cid);
end;
$$;
revoke all on function public.orphan_visit_count(uuid) from public, anon;
grant execute on function public.orphan_visit_count(uuid) to authenticated;


-- ── 4. Verify, before trusting any of the above ────────────────────
-- Run these by hand on a scratch project. Each must behave as stated.
--
--   1. insert a patient with updated_at = '1999-01-01'
--        → select updated_at  ⇒ today, not 1999.  (BE-17)
--   2. explain analyze
--        select id from visits where clinic_id = '<id>' and updated_at >= now() - interval '1 day'
--        order by updated_at asc limit 500
--        → Index Scan using visits_clinic_live_idx, not Seq Scan.  (BE-6)
--   3. insert a visit tombstone (deleted = true, patient_id = '')
--        → select * from orphan_visits  ⇒ it does NOT appear.  (BE-8)
--   4. as a member of clinic A, select orphan_visit_count('<clinic B id>')
--        → raises 'not a member of that clinic'.
--
-- ── Next: nothing. This completes the sync-integrity layer. ──
