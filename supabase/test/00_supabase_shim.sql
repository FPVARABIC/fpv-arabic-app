-- A local stand-in for the parts of Supabase the policies depend on.
--
-- WHY THIS EXISTS
-- ===============
-- The RLS policies in `0002` are written against `auth.uid()`, `auth.role()`
-- and the `anon` / `authenticated` / `service_role` roles. Those are provided
-- by the hosted platform, not by PostgreSQL — so without them the policies can
-- only be READ, never RUN.
--
-- Reading a policy is not a test. «الطلب لا يرسل السعر من العميل بوصفه حقيقة»
-- is a claim about what happens when a client actually tries it, and the only
-- way to know is to try it. This file makes that possible on a stock
-- PostgreSQL 16, so every policy is exercised as a real role against a real
-- table before it is ever applied to the project.
--
-- IT IS TEST SCAFFOLDING AND IS NEVER APPLIED TO THE PROJECT.
-- It lives under `supabase/test/`, not `supabase/migrations/`, and the suite
-- asserts that separation so it cannot drift into a migration by accident.

create schema if not exists auth;

-- Supabase's own table, reduced to what the schema references.
create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  created_at timestamptz not null default now()
);

-- On Supabase these read the JWT out of the request's GUCs. The GUC names are
-- the real ones, so a policy written here works there unchanged.
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.role() returns text
language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

-- The three roles PostgREST connects as.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    -- `bypassrls` is what makes the secret key able to do server-side work,
    -- and it is exactly why that key must never reach a browser.
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
