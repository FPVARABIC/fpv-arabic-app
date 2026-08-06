-- FPVARABIC — Row Level Security, phase two.
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT. Proven against a local
-- PostgreSQL 16 by `scripts/testSupabaseRls.ts`, and nowhere else yet.
--
-- `0001` left every table with RLS enabled and no policy, which denies
-- everything. This file opens the doors that must be open, one at a time. Each
-- one is exercised as a real role in `supabase/test/rls_spec.sql`.
--
-- THE RULE THAT DECIDES EVERY POLICY BELOW
-- ========================================
-- A policy exists only where a BROWSER needs the access. Anything a browser
-- does not need is left denied, and the server adapter reaches it with the
-- secret key. That is not caution for its own sake: every policy is a rule
-- somebody must keep correct forever, and the cheapest policy to get right is
-- the one that was never written.
--
-- So: no client INSERT on orders, no client anything on store_supply, on
-- audit_log, on payment_attempts, on rate_limits or on cleanup_runs.
--
-- ROLES ARE READ FROM THE TABLE, NOT FROM THE TOKEN
-- =================================================
-- `is_staff()` reads `profiles.role` on every call rather than trusting a JWT
-- claim. It costs a lookup, and it buys the thing that matters: revoking a
-- moderator takes effect on their next request instead of whenever their token
-- happens to expire. The web already made this decision for Firebase, and the
-- reasoning has not changed.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helpers. SECURITY DEFINER so they can read `profiles` without the caller
-- needing a policy that would itself leak the role column.
--
-- `search_path` is pinned on every one of them. A SECURITY DEFINER function
-- with a mutable search_path is a privilege-escalation primitive: anybody who
-- can create a schema can shadow `public.profiles` and be an owner.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.current_role_of()
returns platform_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_active()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select status = 'active' from public.profiles where id = auth.uid()),
    false)
$$;

-- Moderator and up. Deliberately NOT «anyone with a role», because the whole
-- point of the enum is that `user` is a role too.
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select role in ('moderator', 'admin', 'owner') and status = 'active'
     from public.profiles where id = auth.uid()),
    false)
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select role in ('admin', 'owner') and status = 'active'
     from public.profiles where id = auth.uid()),
    false)
$$;

create or replace function public.is_owner()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select role = 'owner' and status = 'active'
     from public.profiles where id = auth.uid()),
    false)
$$;

revoke execute on function public.current_role_of() from public;
grant execute on function public.current_role_of, public.is_active,
  public.is_staff, public.is_admin, public.is_owner to authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- A public profile is public: the community shows author names and avatars.
create policy profiles_read_all on public.profiles
  for select to anon, authenticated using (true);

-- You may create only your own row, and only as a plain user. Writing
-- `role: 'owner'` into your own insert is the first thing anybody tries.
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid() and role = 'user' and status = 'active');

/*
 * THE ROLE COLUMN IS NOT WRITABLE BY ANY CLIENT, INCLUDING ITS OWNER.
 *
 * PostgreSQL policies cannot say «every column except this one», so the
 * WITH CHECK re-states the invariant: after your update, your role and status
 * must still equal what they were. An UPDATE that changes either is refused
 * even though you own the row.
 *
 * Staff promotion happens through the server adapter with the secret key, and
 * it writes an audit_log row. There is no client path to it at all — which is
 * what «الأدوار لا يمكن تعديلها من العميل» has to mean to be worth stating.
 */
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- posts
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * Everyone reads active posts. The interesting half is what the AUTHOR sees.
 *
 * `hidden` and `deleted` are not the same secret:
 *
 *   deleted — the author did it. Hiding it from them protects nothing, and
 *             hiding it BREAKS soft delete outright (see below).
 *   hidden  — a moderator did it. The author must not be able to tell that
 *             from «this is gone», or the moderation queue becomes readable
 *             one post at a time.
 *
 * WHY THIS IS NOT A STYLE CHOICE
 * ------------------------------
 * The first version denied the author BOTH, and soft delete then failed with
 * `new row violates row-level security policy`. PostgreSQL requires the NEW
 * row of an UPDATE to be visible under the SELECT policies when the table has
 * any — so «you may set status to deleted» and «you may not see a deleted row
 * of your own» are contradictory instructions, and the database refuses the
 * update rather than the policy.
 *
 * Found by running it, not by reading it: the WITH CHECK explicitly lists
 * 'deleted' and the statement still failed.
 */
create policy posts_read_active on public.posts
  for select to anon, authenticated
  using (status = 'active' or (author_id = auth.uid() and status = 'deleted'));

create policy posts_read_staff on public.posts
  for select to authenticated using (public.is_staff());

/*
 * «المستخدم ينشئ منشوراً باسمه فقط» AND «لا ينتحل معرف مستخدم آخر».
 *
 * `author_id = auth.uid()` is the whole impersonation defence, and it is
 * enforced by the database rather than by the form that submits it. A banned
 * account cannot post at all: `is_active()` is checked here, not in the UI.
 */
create policy posts_insert_own on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active()
    and status = 'active'
  );

-- An author edits their own post's text, and cannot reassign it or resurrect a
-- moderated one by flipping `status` back to active.
create policy posts_update_own on public.posts
  for update to authenticated
  using (author_id = auth.uid() and status = 'active')
  with check (author_id = auth.uid() and status in ('active', 'deleted'));

-- Moderation. `using` is unrestricted so a moderator can reach a hidden post;
-- the ownership row above cannot do that.
create policy posts_update_staff on public.posts
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- NO DELETE POLICY, FOR ANYBODY.
-- Deletion is the `status` column. A hard delete would orphan the media in
-- Storage and erase the moderation record, so it is not reachable from a
-- client at all.

-- ─────────────────────────────────────────────────────────────────────────────
-- comments
-- ─────────────────────────────────────────────────────────────────────────────

-- Same split as posts, and for the same reason: an author may see what THEY
-- deleted (and must, or the soft delete cannot be written at all), and never
-- what a moderator hid.
create policy comments_read_active on public.comments
  for select to anon, authenticated
  using (status = 'active' or (author_id = auth.uid() and status = 'deleted'));

create policy comments_read_staff on public.comments
  for select to authenticated using (public.is_staff());

-- You may comment as yourself, on a post that still exists and is active.
-- The subquery is the difference between «commenting» and «commenting on a
-- post a moderator has already hidden».
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active()
    and status = 'active'
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'active')
  );

create policy comments_update_own on public.comments
  for update to authenticated
  using (author_id = auth.uid() and status = 'active')
  with check (author_id = auth.uid() and status in ('active', 'deleted'));

create policy comments_update_staff on public.comments
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- likes
-- ─────────────────────────────────────────────────────────────────────────────

create policy post_likes_read on public.post_likes
  for select to anon, authenticated using (true);
create policy post_likes_insert_own on public.post_likes
  for insert to authenticated with check (user_id = auth.uid() and public.is_active());
create policy post_likes_delete_own on public.post_likes
  for delete to authenticated using (user_id = auth.uid());

create policy comment_likes_read on public.comment_likes
  for select to anon, authenticated using (true);
create policy comment_likes_insert_own on public.comment_likes
  for insert to authenticated with check (user_id = auth.uid() and public.is_active());
create policy comment_likes_delete_own on public.comment_likes
  for delete to authenticated using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- reports
-- ─────────────────────────────────────────────────────────────────────────────

-- You may file a report as yourself. You may NOT read the queue, or your own
-- past reports: knowing a report is «open» tells you a moderator has not acted
-- yet, which is exactly what a bad actor wants to know.
create policy reports_insert_own on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_active());

create policy reports_read_staff on public.reports
  for select to authenticated using (public.is_staff());
create policy reports_update_staff on public.reports
  for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────────────
-- Store — public half
-- ─────────────────────────────────────────────────────────────────────────────

-- The shop is readable by anyone, but only what is actually on sale. A draft
-- product is as invisible as a hidden post.
create policy store_products_read_published on public.store_products
  for select to anon, authenticated
  using (published = true and suspended_reason_ar is null);

create policy store_products_read_staff on public.store_products
  for select to authenticated using (public.is_staff());

-- Editing the catalogue is an admin act and goes through the server adapter.
-- Admins get UPDATE here so the panel can work without the secret key for
-- ordinary edits; publishing gates on price, which is server-side logic.
create policy store_products_write_admin on public.store_products
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy store_variants_read_public on public.store_variants
  for select to anon, authenticated
  using (exists (
    select 1 from public.store_products p
    where p.id = product_id and p.published = true and p.suspended_reason_ar is null));

create policy store_variants_read_staff on public.store_variants
  for select to authenticated using (public.is_staff());
create policy store_variants_write_admin on public.store_variants
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy shipping_regions_read on public.shipping_regions
  for select to anon, authenticated using (active = true);
create policy shipping_regions_write_admin on public.shipping_regions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy store_settings_read_staff on public.store_settings
  for select to authenticated using (public.is_staff());
create policy store_settings_write_admin on public.store_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy store_decisions_read_staff on public.store_decisions
  for select to authenticated using (public.is_staff());
create policy store_decisions_write_admin on public.store_decisions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- store_supply — SUPPLIER, COST, MARGIN
-- ─────────────────────────────────────────────────────────────────────────────
--
-- THERE IS EXACTLY ONE POLICY AND IT IS ADMIN-ONLY. Read it as the answer to
-- «المستخدم العادي لا يقرأ بيانات الموردين أو التكلفة أو الهامش».
--
-- Note what is NOT here: a moderator policy. `is_staff()` includes moderators
-- and they moderate CONTENT; commercial terms are not theirs. This is the one
-- table where the difference between `is_staff` and `is_admin` is the whole
-- security property, and using the wrong helper would be invisible in review.
--
-- Margin is inside the same row as cost on purpose: price ÷ margin = cost, so
-- «expose margin but not cost» is not a thing that can be done.
create policy store_supply_admin_only on public.store_supply
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Orders
-- ─────────────────────────────────────────────────────────────────────────────
--
-- «الطلب لا يرسل السعر من العميل بوصفه حقيقة» · «السعر والشحن يعاد حسابهما
-- خادمياً» · «عمليات الإدارة والمال تمر من الخادم فقط».
--
-- The mechanical form of all three is the same: THERE IS NO CLIENT INSERT OR
-- UPDATE POLICY ON ORDERS. A browser cannot create an order at all, so it
-- cannot send a total. It calls a server action, the server prices the basket
-- from `store_variants` and `shipping_regions`, and the server writes the row
-- with the secret key.
--
-- A client may READ its own order, because it has to see what it bought.
create policy orders_read_own on public.orders
  for select to authenticated using (user_id = auth.uid());

create policy orders_read_staff on public.orders
  for select to authenticated using (public.is_admin());

create policy order_items_read_own on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

create policy order_items_read_staff on public.order_items
  for select to authenticated using (public.is_admin());

-- payment_attempts, audit_log, rate_limits, cleanup_runs, media_objects:
-- NO CLIENT POLICY AT ALL. Money movement, the moderation record, the abuse
-- counters and the media lifecycle are server-side facts. Their absence from
-- this file is the policy.

-- ─────────────────────────────────────────────────────────────────────────────
-- Projects
-- ─────────────────────────────────────────────────────────────────────────────

create policy project_overrides_read on public.project_overrides
  for select to anon, authenticated using (true);
create policy project_overrides_write_admin on public.project_overrides
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- Grants. RLS filters ROWS; it does not grant the verb.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Without these, every policy above is unreachable and the whole file is
-- decoration. With them and no policy, access is still denied — the two are
-- ANDed, which is why the grants can be broad and the policies narrow.

grant select on public.profiles, public.posts, public.comments,
  public.post_likes, public.comment_likes, public.store_products,
  public.store_variants, public.shipping_regions, public.project_overrides
  to anon, authenticated;

grant insert, update on public.profiles to authenticated;
grant insert, update on public.posts, public.comments to authenticated;
grant insert, delete on public.post_likes, public.comment_likes to authenticated;
grant insert on public.reports to authenticated;
grant select, update on public.reports to authenticated;
grant select, insert, update, delete on public.store_products,
  public.store_variants, public.store_supply, public.store_settings,
  public.store_decisions, public.shipping_regions, public.project_overrides
  to authenticated;
grant select on public.orders, public.order_items to authenticated;

-- Never granted to anon or authenticated, in any form:
--   audit_log · payment_attempts · rate_limits · cleanup_runs · media_objects
-- and no INSERT/UPDATE/DELETE on orders or order_items.

commit;
