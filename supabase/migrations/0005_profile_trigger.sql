-- ─────────────────────────────────────────────────────────────────────────────
-- 0005 — a profile row for every account, made by the database
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT. Exercised against a local
-- PostgreSQL 16 by `scripts/testSupabaseRls.ts`, and nowhere else yet.
--
-- WHY A TRIGGER AND NOT THE CLIENT
-- ================================
-- Phase five moves sign-up onto Supabase Auth, and an account with no
-- `profiles` row is a broken account: `0002`'s helpers read the row to decide
-- every permission, the feed denormalises the display name out of it, and the
-- UI reads it to know who is signed in.
--
-- A client that had to insert its own profile could choose not to — or crash
-- before it did — and either way the platform is left with an authenticated
-- ghost. `firestore.rules` solved this by validating a client-side create;
-- PostgreSQL can do better and remove the client from the transaction
-- entirely: the row is written by the database, in the same transaction that
-- writes `auth.users`, so «an account exists without a profile» is not an
-- error state anybody handles — it is a state that cannot occur.
--
-- SECURITY DEFINER, WITH THE SEARCH PATH PINNED
-- =============================================
-- The trigger fires as the Auth service writes `auth.users`, and that internal
-- role holds no INSERT on `public.profiles` — nor should it gain one, because
-- a grant wide enough for the trigger is a grant something else could use.
-- `security definer` runs the function as its owner instead, and the pinned
-- `search_path` is the standard hygiene that keeps a definer function from
-- resolving a name through a schema an attacker can write to.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  raw_name text;
begin
  raw_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');

  insert into public.profiles (id, display_name, display_name_normalized)
  values (
    new.id,
    raw_name,
    -- The same lower-cased copy the phone app maintains for uniqueness and
    -- search. `unaccent` is not assumed present; the data migration that
    -- imports existing accounts brings their already-normalized values with
    -- them, so this only ever normalizes names created on this platform.
    lower(raw_name)
  )
  -- Defensive: `profiles.id` references `auth.users`, so the auth row always
  -- lands first and a conflict here should be impossible. But the data
  -- migration retries on failure, and a retried auth insert firing this
  -- trigger over an already-imported profile must keep the import rather
  -- than error the retry.
  on conflict (id) do nothing;

  return new;
end $$;

-- Dropped first so re-running the migration in a scratch database cannot fail
-- on «already exists» — `create or replace` covers the function, not the
-- trigger.
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/*
 * A DISPLAY-NAME COLLISION MUST NOT COST THE SIGN-UP.
 *
 * `profiles_display_name_normalized_key` is unique. Two people typing the same
 * name would otherwise turn the second INSERT — and therefore the second
 * ACCOUNT — into an error, because this trigger runs inside the Auth
 * transaction. A partial unique index cannot be deferred and the platform
 * already allows a null display name, so the resolution is: keep the account,
 * drop only the colliding name, and let the person pick another in settings.
 */
create or replace function public.handle_new_user_name_collision()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (
    select 1 from public.profiles
    where display_name_normalized = new.display_name_normalized
      and id <> new.id
  ) then
    new.display_name_normalized := null;
  end if;
  return new;
end $$;

drop trigger if exists profiles_name_collision on public.profiles;

create trigger profiles_name_collision
  before insert on public.profiles
  for each row
  when (new.display_name_normalized is not null)
  execute function public.handle_new_user_name_collision();

commit;
