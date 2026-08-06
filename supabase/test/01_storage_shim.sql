-- The `storage` schema, reduced to what the policies in `0003` touch.
--
-- Supabase Storage authorises with ORDINARY PostgreSQL RLS on
-- `storage.objects`, so the policies can be exercised on stock PostgreSQL as
-- long as the table, the two path helpers and the bucket registry exist. That
-- is what this file supplies.
--
-- Column names and the shape of `metadata` follow the real schema, so a policy
-- proven here is the same policy there. `path_tokens` is generated exactly as
-- Supabase generates it.
--
-- TEST SCAFFOLDING. NEVER APPLIED TO THE PROJECT.

create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null unique,
  owner uuid,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets(id),
  name text,
  owner uuid,
  owner_id text,
  -- `{"size": 1234, "mimetype": "image/webp"}` — the Storage API fills this,
  -- and the policies read both keys.
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/')) stored,
  version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now()
);

create unique index if not exists objects_bucket_name_key
  on storage.objects (bucket_id, name);

-- Supabase's own helpers. `foldername` returns the path WITHOUT the final
-- segment, so `a/b/c.png` gives `{a,b}` and element 1 is the owner folder.
create or replace function storage.foldername(name text)
returns text[] language plpgsql immutable as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[1 : array_length(parts, 1) - 1];
end $$;

create or replace function storage.filename(name text)
returns text language plpgsql immutable as $$
declare parts text[];
begin
  parts := string_to_array(name, '/');
  return parts[array_length(parts, 1)];
end $$;

-- Same posture as every public table: on, forced, and no policy until `0003`
-- writes one.
alter table storage.objects enable row level security;
alter table storage.objects force row level security;
alter table storage.buckets enable row level security;
alter table storage.buckets force row level security;

grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
