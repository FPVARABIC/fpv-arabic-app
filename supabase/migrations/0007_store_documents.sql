-- ─────────────────────────────────────────────────────────────────────────────
-- 0007 — the store's REAL contracts, learned by migrating the pages
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT. Exercised against a local
-- PostgreSQL 16 by `scripts/testSupabaseRls.ts`, and nowhere else yet.
--
-- WHAT PHASE FIVE DISCOVERED
-- ==========================
-- `0001` sketched the store relationally: products, variants, supply and
-- shipping as fully-normalised rows. Migrating the actual pages showed that
-- the platform's catalogue does not LIVE in a database at all — it lives in
-- reviewed code (`src/data/store/catalogue.ts`, 63 products) merged with
-- per-product JSON overrides the admin edits, plus a handful of JSON settings
-- documents. That model was a deliberate decision made long before this
-- migration («a variant appearing from a database row would be a buyable
-- thing nobody chose»), and «حافظ على نفس العقود الحالية» makes it binding.
--
-- So the database's store job is: hold the DOCUMENTS, the ORDERS and the
-- PAYMENTS. This migration adds those, and removes the relational sketches
-- that nothing writes — a table no code writes is not architecture, it is a
-- trap for the next migration to trip over (two of its foreign keys already
-- pointed at tables that would have refused every real order).
--
-- Kept: `store_products` and `store_variants`. They are the shape a future
-- relational catalogue would take, the read adapter and its tests exercise
-- them, and they cost nothing. Dropped: `store_supply`, `store_decisions`,
-- `shipping_regions` — each is superseded by a document below that matches
-- the real contract field-for-field.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · The document tables
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * One table, keyed (collection, id), holding every store-side JSON document:
 *
 *   storeProducts       per-product admin override (public page content)
 *   storeShippingZones  per-zone pricing patch over the seeded zones
 *   storeSettings       'public' · 'private' · 'shippingRules'
 *   storeSupply         per-variant supplier cost — THE ROW THAT MUST NOT LEAK
 *   storeDecisions      recorded review-queue answers
 *
 * One table rather than five because they are all the same thing — a JSON
 * document with an id — and because visibility is a POLICY question, not a
 * table-layout question. The policy below is the entire public/private map in
 * one place, which is exactly where a reviewer wants to read it.
 */
create table public.store_docs (
  collection text not null,
  id text not null,
  doc jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (collection, id)
);

alter table public.store_docs enable row level security;
alter table public.store_docs force row level security;

/*
 * THE VISIBILITY MAP.
 *
 * Product overrides and zone pricing are the content of public pages — the
 * storefront is server-rendered by an ANONYMOUS client, so `anon` must read
 * them. The public settings document and the shipping rules are equally
 * public facts («we do not ship batteries» is printed at the checkout).
 *
 * `storeSupply` and `storeSettings/private` are named NOWHERE below, so no
 * client reads them in any role: cost ÷ into price is the margin, and the
 * margin is why supply is staff-only in the first place. They are reachable
 * only through the server adapter on the secret key.
 */
create policy store_docs_public_read on public.store_docs
  for select to anon, authenticated
  using (
    collection in ('storeProducts', 'storeShippingZones')
    or (collection = 'storeSettings' and id in ('public', 'shippingRules'))
  );

create policy store_docs_staff_read on public.store_docs
  for select to authenticated
  using (
    public.is_staff()
    and (collection <> 'storeSupply' and not (collection = 'storeSettings' and id = 'private'))
  );

-- No client INSERT/UPDATE/DELETE policy at all: every store-side write is an
-- administrative act, goes through the server adapter with the secret key,
-- and lands in the audit log on the way.
grant select on public.store_docs to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Orders — relational spine, document body
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * The relational columns stay: they are what gets INDEXED, FILTERED and
 * POLICED (a customer reads rows where `user_id = auth.uid()`, the admin
 * queue filters by fulfilment state, payments key off the id). The `doc`
 * column carries the full `StoreOrder` contract — the priced lines with their
 * Arabic titles, the validated address, the flags — because that contract is
 * what every page consumes and it must survive this migration verbatim.
 *
 * One writer (the server adapter) writes both halves in one statement, which
 * is what keeps them from disagreeing.
 */
alter table public.orders add column doc jsonb not null default '{}'::jsonb;

-- The web's fulfilment states are the admin panel's `OrderStatus` values —
-- 0004 introduced the column; the web's order writer fills it from `doc`.

-- The catalogue lives in code, so a foreign key into an unpopulated catalogue
-- table would refuse every real order line. The columns stay as plain text.
alter table public.order_items drop constraint order_items_product_id_fkey;
alter table public.order_items drop constraint order_items_variant_id_fkey;
alter table public.orders drop constraint orders_shipping_region_id_fkey;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Payments — the provider's records, keyed by the provider's reference
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * `payment_attempts` from `0001` is replaced by the shape the payment service
 * actually keeps: one document per provider payment, keyed by the PROVIDER'S
 * id, because that id is what a webhook carries and the lookup that must be
 * fast is «which of our records is this webhook about».
 *
 * NO CLIENT POLICY AT ALL — money movement is a server-side fact. The raw
 * column holds provider payloads only: never a card number, never an API key.
 */
drop table public.payment_attempts;
drop type payment_state;

create table public.store_payments (
  id text primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  state text not null default 'pending',
  doc jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_payments_order_idx on public.store_payments (order_id);

alter table public.store_payments enable row level security;
alter table public.store_payments force row level security;

create trigger store_payments_touch before update on public.store_payments
  for each row execute function public.touch_updated_at();

create trigger store_docs_touch before update on public.store_docs
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · The superseded sketches
-- ─────────────────────────────────────────────────────────────────────────────

-- Each is replaced by a `store_docs` collection above that matches the real
-- contract field-for-field. Dropping them here — before anything is applied
-- anywhere — is what keeps the schema a description of the system rather than
-- a museum of drafts.
drop table public.store_supply;
drop table public.store_decisions;
drop table public.shipping_regions;

commit;
