-- FPVARABIC — the schema, phase one of the move off Firebase.
--
-- WHAT THIS FILE IS AND WHAT IT DELIBERATELY IS NOT
-- =================================================
-- It creates every table the platform needs and turns Row Level Security ON
-- for all of them, with NO policies. That combination is not an oversight: in
-- PostgreSQL, RLS enabled with no policy denies every row to every non-service
-- role. So this migration is safe to apply the moment it lands — nothing is
-- readable or writable by a browser until `0002` grants it, one policy at a
-- time, each with a test.
--
-- The alternative — tables first, security later — leaves a window in which a
-- publishable key can read the supplier cost table. There must not be such a
-- window, so the deny comes with the table, not after it.
--
-- IDS ARE PRESERVED, AND THAT IS A HARD REQUIREMENT
-- =================================================
-- «حافظ قدر الإمكان على المعرفات الحالية للمنتجات والمشاريع والمنشورات حتى لا
-- تنكسر الروابط». Product and project ids are TEXT primary keys carrying the
-- exact slugs already in the catalogue (`svc-binding`, `gps-denied-vio`), not
-- generated uuids, because those strings are in URLs, in the image manifest
-- and in 236 cross-section references inside the project library. A uuid here
-- would silently break every one of them.
--
-- Community posts keep TEXT ids for the same reason: Firestore document ids
-- are strings, and any post already exported carries one.
--
-- WHAT MAPS TO WHAT
-- =================
--   Firestore users          -> profiles (+ auth.users from Supabase Auth)
--   Firestore posts          -> posts
--   posts/{id}/comments      -> comments (a real table with a foreign key,
--                               not a subcollection)
--   Firestore likes          -> post_likes, comment_likes
--   Firestore reports        -> reports
--   Firestore auditLog       -> audit_log
--   Firestore storeProducts  -> store_products / store_variants
--   Firestore storeSupply    -> store_supply        (STAFF ONLY, see 0002)
--   Firestore storeDecisions -> store_decisions
--   Firestore rateLimits     -> rate_limits
--   (new)                    -> orders, order_items, payment_attempts,
--                               shipping_regions, store_settings,
--                               project_overrides, media_objects
--
-- Counters that Cloud Functions maintained (`commentsCount`, `likesCount`,
-- `feedScore`) stay as columns and move to triggers in a later migration —
-- keeping the column shape identical is what lets the web read code change in
-- one place rather than everywhere.

begin;

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────────
-- Identity and authorisation
-- ─────────────────────────────────────────────────────────────────────────────

-- The four roles the platform already has, as a type rather than a string, so
-- a typo is a database error instead of a silent loss of access.
create type platform_role as enum ('user', 'moderator', 'admin', 'owner');

create type account_status as enum ('active', 'banned');

-- One row per authenticated user, keyed to Supabase Auth.
--
-- WHY ROLE LIVES HERE AND NOT IN A JWT CLAIM
-- The web already made this decision for Firebase and it was the right one:
-- the role is re-read from the record on every privileged request, so
-- revoking a moderator takes effect on their next action rather than whenever
-- their token happens to expire. `0002` forbids the client from writing it.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  -- Lower-cased, accent-stripped copy used for uniqueness and search. The
  -- phone app already maintains this; the migration script backfills it.
  display_name_normalized text,
  photo_url text,
  role platform_role not null default 'user',
  status account_status not null default 'active',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_display_name_normalized_key
  on public.profiles (display_name_normalized)
  where display_name_normalized is not null;

create index profiles_role_idx on public.profiles (role) where role <> 'user';

-- ─────────────────────────────────────────────────────────────────────────────
-- Community
-- ─────────────────────────────────────────────────────────────────────────────

create type content_status as enum ('active', 'hidden', 'deleted');
create type media_kind as enum ('none', 'image', 'video');

create table public.posts (
  -- TEXT, not uuid: existing Firestore ids are strings and are already in URLs.
  id text primary key default gen_random_uuid()::text,
  author_id uuid not null references public.profiles(id) on delete cascade,
  -- Denormalised for the same reason Firestore did it: a feed of 12 posts
  -- must not become 12 profile lookups. Kept in step by a trigger later.
  author_name text,
  author_photo text,
  text text not null,
  category text,
  media_type media_kind not null default 'none',
  media_url text,
  thumbnail_url text,
  media_width integer,
  media_height integer,
  media_duration numeric,
  comments_count integer not null default 0,
  likes_count integer not null default 0,
  -- `deleted` is a SOFT delete. Nothing in the platform hard-deletes user
  -- content on the user's action; the media cleanup job is what eventually
  -- removes the file, and it records what it did.
  status content_status not null default 'active',
  feed_score double precision not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  updated_at timestamptz not null default now()
);

create index posts_feed_idx on public.posts (created_at desc, id desc)
  where status = 'active';
create index posts_category_idx on public.posts (category, created_at desc)
  where status = 'active';
create index posts_author_idx on public.posts (author_id, created_at desc);
create index posts_score_idx on public.posts (feed_score desc)
  where status = 'active';

create table public.comments (
  id text primary key default gen_random_uuid()::text,
  post_id text not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  author_photo text,
  text text not null,
  likes_count integer not null default 0,
  status content_status not null default 'active',
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Oldest-first, because a comment thread is a conversation. The id tiebreaker
-- is not decoration: two comments in the same millisecond make the sort
-- ambiguous, and an ambiguous sort is what makes a cursor skip or repeat.
create index comments_thread_idx on public.comments (post_id, created_at asc, id asc)
  where status = 'active';

-- Likes as rows rather than counters, so «did I like this» is answerable and
-- a double-tap cannot double-count. The composite primary key IS the
-- idempotency guarantee.
create table public.post_likes (
  post_id text not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table public.comment_likes (
  comment_id text not null references public.comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create type report_target as enum ('post', 'comment', 'user');
create type report_state as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  target_id text not null,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null,
  detail text,
  state report_state not null default 'open',
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  resolution_note text,
  created_at timestamptz not null default now()
);

create index reports_queue_idx on public.reports (state, created_at desc);
-- One open report per person per target: a pile-on is not more signal.
create unique index reports_one_open_per_reporter
  on public.reports (target_type, target_id, reporter_id)
  where state in ('open', 'reviewing');

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit
-- ─────────────────────────────────────────────────────────────────────────────

-- APPEND ONLY, AND CLOSED TO CLIENTS ENTIRELY.
-- An audit log a client can write is a log that can be forged; one a client
-- can read leaks moderation decisions and reporter identities. `0002` grants
-- no client policy at all — it is reachable only through the server adapter.
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role platform_role,
  action text not null,
  target_type text not null,
  target_id text,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_time_idx on public.audit_log (created_at desc);
create index audit_log_target_idx on public.audit_log (target_type, target_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Store — the public half
-- ─────────────────────────────────────────────────────────────────────────────

create table public.store_products (
  -- The catalogue slug, verbatim. It is in URLs and in the image manifest.
  id text primary key,
  name_ar text not null,
  name_en text,
  brand text,
  category_id text not null,
  summary_ar text,
  published boolean not null default false,
  suspended_reason_ar text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_products_public_idx on public.store_products (category_id, sort_order)
  where published = true and suspended_reason_ar is null;

create table public.store_variants (
  id text primary key,
  product_id text not null references public.store_products(id) on delete cascade,
  label_ar text not null,
  package_kind text,
  link_protocol text,
  video_system text,
  is_default boolean not null default false,
  -- Minor units (cents). Never a float: money in a float is money that
  -- disagrees with itself at the fourth order.
  price_minor bigint,
  currency text not null default 'EUR',
  stock_state text,
  sort_order integer not null default 0
);

create index store_variants_product_idx on public.store_variants (product_id, sort_order);
create unique index store_variants_one_default
  on public.store_variants (product_id) where is_default = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- Store — the private half. THIS IS THE TABLE THAT MUST NEVER LEAK.
-- ─────────────────────────────────────────────────────────────────────────────

-- Supplier, cost and margin. `0002` gives it NO client policy whatsoever.
--
-- Margin is private for a reason that is easy to miss: price ÷ margin = cost.
-- Exposing the margin exposes the supplier's price, so the two cannot be
-- separated into «public» and «private» halves — the whole row is staff-only.
create table public.store_supply (
  product_id text not null references public.store_products(id) on delete cascade,
  variant_id text references public.store_variants(id) on delete cascade,
  supplier_name text,
  supplier_url text,
  cost_minor bigint,
  currency text not null default 'EUR',
  margin_pct numeric,
  moq integer,
  lead_time_days integer,
  admin_note text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ONE SUPPLY ROW PER PRODUCT, OR PER VARIANT WHERE VARIANTS DIFFER.
--
-- Expressed as a unique INDEX rather than a primary key because a primary key
-- cannot contain an expression, and `variant_id` is nullable: a product priced
-- as a whole has one row with a null variant, and `null <> null` in a plain
-- unique constraint would let that row be inserted twice. `coalesce` collapses
-- the nulls so the uniqueness actually holds.
create unique index store_supply_scope_key
  on public.store_supply (product_id, coalesce(variant_id, ''));

create table public.store_decisions (
  id text primary key,
  product_id text references public.store_products(id) on delete cascade,
  decision text not null,
  reason_ar text,
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz not null default now()
);

-- Singleton-ish settings, keyed so a future second storefront is possible.
create table public.store_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table public.shipping_regions (
  id text primary key,
  name_ar text not null,
  country_codes text[] not null default '{}',
  -- Minor units again.
  base_minor bigint not null default 0,
  per_kg_minor bigint not null default 0,
  free_over_minor bigint,
  currency text not null default 'EUR',
  active boolean not null default true,
  sort_order integer not null default 0
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────

create type order_state as enum (
  'draft', 'awaiting_payment', 'paid', 'cancelled', 'expired', 'refunded', 'failed'
);

-- WHY EVERY MONEY COLUMN IS RECOMPUTED SERVER-SIDE
-- «الطلب لا يرسل السعر من العميل بوصفه حقيقة» and «السعر والشحن يعاد حسابهما
-- خادمياً». The client sends product ids and quantities and nothing else; the
-- server writes these columns. `0002` gives the client no INSERT policy on
-- this table at all — orders are created through a server-side function, which
-- is the only way that rule can be mechanical rather than remembered.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Human-facing reference, stable and short.
  reference text not null unique,
  user_id uuid references public.profiles(id) on delete set null,
  email text,
  phone text,
  ship_to jsonb not null default '{}'::jsonb,
  shipping_region_id text references public.shipping_regions(id),
  subtotal_minor bigint not null default 0,
  shipping_minor bigint not null default 0,
  total_minor bigint not null default 0,
  currency text not null default 'EUR',
  state order_state not null default 'draft',
  note_ar text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_state_idx on public.orders (state, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.store_products(id) on delete set null,
  variant_id text references public.store_variants(id) on delete set null,
  -- Copied at purchase time, so a later price change does not rewrite history.
  name_ar text not null,
  unit_price_minor bigint not null,
  quantity integer not null check (quantity > 0),
  line_total_minor bigint not null
);

create index order_items_order_idx on public.order_items (order_id);

create type payment_state as enum (
  'pending', 'requires_action', 'paid', 'failed', 'cancelled', 'refunded'
);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_ref text,
  -- The same key must return the same attempt. This is the provider-side half
  -- of duplicate prevention and it belongs in the database, not in a comment.
  idempotency_key text,
  amount_minor bigint not null,
  currency text not null default 'EUR',
  state payment_state not null default 'pending',
  -- Provider payloads only. NEVER a card number, and never an API key.
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index payment_attempts_idempotency
  on public.payment_attempts (provider, idempotency_key)
  where idempotency_key is not null;
create index payment_attempts_order_idx on public.payment_attempts (order_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Projects — admin overrides only
-- ─────────────────────────────────────────────────────────────────────────────

-- The ten projects live in code as seeds and are merged with this table, the
-- same shape the store already uses. The seeds are what makes a fresh
-- deployment non-empty; this is what lets the admin panel change any field
-- without a deploy.
create table public.project_overrides (
  -- The project slug, verbatim: it is in URLs, in the image manifest, and in
  -- 236 cross-section references.
  id text primary key,
  published boolean,
  patch jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Media lifecycle
-- ─────────────────────────────────────────────────────────────────────────────

-- One row per object the platform put in Storage at RUNTIME.
--
-- Static images committed to the repository — `web/public/assets/store/**` and
-- `web/public/assets/projects/**` — are NOT here and must not be: they are
-- version-controlled files with a manifest, and the owner uploads them through
-- GitHub. This table is only for what users and admins upload while the site
-- is running, which is the half that needs an owner, a lifecycle and a
-- cleanup record.
create type media_state as enum ('live', 'orphaned', 'pending_delete', 'deleted');

create table public.media_objects (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  object_path text not null,
  owner_id uuid references public.profiles(id) on delete set null,
  -- What it belongs to, so an orphan is detectable rather than merely suspected.
  ref_type text,
  ref_id text,
  content_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_seconds numeric,
  state media_state not null default 'live',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index media_objects_path_key on public.media_objects (bucket, object_path);
create index media_objects_ref_idx on public.media_objects (ref_type, ref_id);
create index media_objects_state_idx on public.media_objects (state)
  where state <> 'live';

-- What the cleanup job actually did, so «the file is gone» is a record rather
-- than an assumption.
create table public.cleanup_runs (
  id bigint generated always as identity primary key,
  job text not null,
  scanned integer not null default 0,
  deleted integer not null default 0,
  failed integer not null default 0,
  detail jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Abuse throttling, replacing the Firestore `rateLimits` collection.
create table public.rate_limits (
  subject text not null,
  action text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (subject, action, window_start)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DENY EVERYTHING, UNTIL 0002 GRANTS IT
-- ─────────────────────────────────────────────────────────────────────────────
--
-- `enable row level security` with no policy denies all rows to every role
-- except the table owner and `service_role`. `force` closes the remaining gap:
-- without it, the table's OWNER bypasses RLS, and migrations run as the owner.
--
-- So after this migration the database is complete and completely closed. That
-- is the intended state: every policy that opens a door arrives in 0002 with a
-- test that proves the door is the only one open.

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'posts', 'comments', 'post_likes', 'comment_likes', 'reports',
    'audit_log', 'store_products', 'store_variants', 'store_supply',
    'store_decisions', 'store_settings', 'shipping_regions', 'orders',
    'order_items', 'payment_attempts', 'project_overrides', 'media_objects',
    'cleanup_runs', 'rate_limits'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- `updated_at` maintained by the database rather than by every caller
-- remembering to. A caller that forgets is not a bug anybody notices.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'posts', 'comments', 'store_products', 'store_supply',
    'store_settings', 'orders', 'payment_attempts', 'project_overrides'
  ] loop
    execute format(
      'create trigger %I_touch before update on public.%I
         for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

commit;
