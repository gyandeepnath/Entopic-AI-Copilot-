-- Minimal stand-in for what a fresh Supabase project provides before any
-- Entopic migration runs: the API roles, auth.users, auth.uid() (read from the
-- same setting PostgREST uses), and Supabase's default grants on `public`.
-- Used only by tools/db/verify-migrations.js on a throwaway local database.
-- Roles are cluster-wide, so they may already exist from an earlier run.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
create schema auth;
create table auth.users (id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
insert into auth.users values
 ('aaaaaaaa-0000-0000-0000-000000000001','alice@clinic-a'),
 ('bbbbbbbb-0000-0000-0000-000000000002','bob@clinic-b'),
 ('cccccccc-0000-0000-0000-000000000003','mallory@nowhere');
