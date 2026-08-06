-- ─────────────────────────────────────────────────────────────────────────────
-- 0004 — the fulfilment axis of an order
--
-- WHY THIS EXISTS AS A SEPARATE MIGRATION
-- =======================================
-- `0001` gave `public.orders` a single `state` column of type `order_state`
-- — draft, awaiting_payment, paid, cancelled, expired, refunded, failed. That
-- is the PAYMENT axis, and it is correct as far as it goes.
--
-- Building the backend adapter is what showed it does not go far enough. The
-- admin panel this platform already has drives a different lifecycle
-- entirely — `ORDER_STATUS_NEXT` in `src/data/store/types.ts`:
--
--     received → confirmed → ordered-from-supplier → shipped → delivered
--                       ↘ cancelled (until it ships)
--
-- Those are not the same states seen twice. They are two independent facts
-- about one order:
--
--   • A PAID order can sit unshipped for a week. Payment says nothing about
--     whether a box has moved.
--   • An order CANCELLED before payment never had a supplier order to cancel,
--     while one cancelled after payment needs a refund. Collapsing them means
--     «cancelled» tells the shop nothing about whether money must go back.
--   • A REFUND is a payment event that happens to an order that was already
--     delivered. On one column it would erase the delivery.
--
-- One column cannot carry both, and a shop that tries ends up with two screens
-- that disagree about what «cancelled» means. So: two columns, each with its
-- own enum, each moving on its own trigger — the provider webhook moves
-- payment, a person moves fulfilment.
--
-- WHY APPENDED RATHER THAN EDITED INTO 0001
-- =========================================
-- Nothing here has been applied to the real project yet, so amending `0001`
-- would work. It is still the wrong habit: a migration that already exists in
-- somebody's checkout must not change under them, and the history of WHY a
-- column was added is worth more than a tidier first file. This comment is
-- the record that the gap was found by writing the adapter, which is what the
-- adapter phase is for.
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- The six values are `OrderStatus` in `src/data/store/types.ts`, verbatim,
-- hyphens included. Renaming one here to look more like SQL would mean a
-- translation table between the database and the admin panel, and a
-- translation table is a place for the two to drift.
create type order_fulfilment as enum (
  'received',
  'confirmed',
  'ordered-from-supplier',
  'shipped',
  'delivered',
  'cancelled'
);

-- `received` is the honest default: the row exists, so the shop has it.
alter table public.orders
  add column fulfilment order_fulfilment not null default 'received';

-- Renamed for the same reason the two enums are separate — after this
-- migration `orders` has two state columns, and one of them being called
-- plain `state` invites every future reader to assume it is «the» state.
alter table public.orders rename column state to payment_state;

-- The queue the admin panel opens on: what has been paid for and not yet
-- shipped, newest first.
create index orders_fulfilment_idx
  on public.orders (fulfilment, created_at desc)
  where payment_state = 'paid';

-- `0001`'s index was built on the old name; PostgreSQL follows the rename, but
-- the index NAME then lies about its column. Renaming it costs nothing and
-- keeps `\d orders` readable.
alter index orders_state_idx rename to orders_payment_state_idx;

/*
 * NO NEW POLICIES ARE NEEDED, AND THAT IS WORTH STATING RATHER THAN ASSUMING.
 *
 * `0002` gives `orders` exactly two SELECT policies — `orders_read_own`
 * (`user_id = auth.uid()`) and `orders_read_staff` (`is_staff()`) — and NO
 * client INSERT, UPDATE or DELETE policy whatsoever. Both are row predicates
 * that name no column of the order's body, so a new column is covered by them
 * the moment it exists: a customer sees their own order's fulfilment, a
 * stranger sees no row at all, and nobody can write either column from a
 * browser.
 *
 * That last part is the point. `fulfilment` is a claim about what the shop has
 * done; a customer who could set it to `delivered` could close their own
 * dispute. It moves only through the admin adapter, on the secret key.
 */

commit;
