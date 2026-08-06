-- ─────────────────────────────────────────────────────────────────────────────
-- 0006 — what the WEB migration of the community actually needed
--
-- NOT YET APPLIED TO THE REAL SUPABASE PROJECT. Exercised against a local
-- PostgreSQL 16 by `scripts/testSupabaseRls.ts`, and nowhere else yet.
--
-- Phase five is the first phase where real pages call the adapter, and moving
-- them exposed four things Firestore had that the schema did not yet carry.
-- Each section below names the Firestore mechanism it replaces, because every
-- one of these is a CONTROL the phone app has always been subject to — and a
-- migration that quietly dropped a control would be a regression wearing a
-- new database as a disguise.
-- ─────────────────────────────────────────────────────────────────────────────

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · Search tokens                      (replaces: posts.searchTokens array)
-- ─────────────────────────────────────────────────────────────────────────────

-- The SAME token pipeline as the phone app, not PostgreSQL full-text search,
-- and that is a considered refusal: `to_tsvector('simple', …)` does not
-- normalise hamza forms, teh marbuta or Arabic diacritics, while the shared
-- tokenizer in `@core/community/utils` does — and it is the code that built
-- the query side on every surface. Tokens produced by one normaliser and
-- queried by another is a search that quietly misses, so the adapter writes
-- tokens with the shared tokenizer and this column just holds them.
alter table public.posts
  add column search_tokens text[] not null default '{}';

-- `&&` (overlap) is the query the search page runs; GIN is what makes it an
-- index seek instead of a scan over every post ever written.
create index posts_search_tokens_idx on public.posts using gin (search_tokens);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · Author denormalisation             (replaces: rules validating authorName)
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * The feed shows twelve names per page and must not become twelve profile
 * lookups — which is why `author_name` is ON the post, same decision Firestore
 * made. What the database must now guarantee is what `firestore.rules` used to
 * validate: the denormalised name IS the profile's name, not whatever string
 * the client felt like sending.
 *
 * A trigger is stronger than the rule was: the client's value is not checked,
 * it is IGNORED. `security definer` because the writer holds no SELECT beyond
 * RLS on profiles and no business writing other columns — the function's owner
 * does.
 */
create or replace function public.fill_author_denorm()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  select p.display_name, p.photo_url
    into new.author_name, new.author_photo
    from public.profiles p where p.id = new.author_id;
  return new;
end $$;

create trigger posts_author_denorm
  before insert on public.posts
  for each row execute function public.fill_author_denorm();

create trigger comments_author_denorm
  before insert on public.comments
  for each row execute function public.fill_author_denorm();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · Counters                           (replaces: client increments + rules)
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * Firestore had the client bump `commentsCount` and a rule validate the diff;
 * a client that forgot left a stale count. Here the counter is not the
 * client's job at all: the database maintains it, so it cannot be forgotten,
 * forged, or double-counted by a retry.
 *
 * «Visible» for counting purposes means `status = 'active'` — a hidden or
 * deleted comment leaves the count, which is what a reader expects the number
 * beside a thread to mean.
 */
create or replace function public.sync_comments_count()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare delta integer := 0;
begin
  if tg_op = 'INSERT' then
    if new.status = 'active' then delta := 1; end if;
  elsif tg_op = 'UPDATE' then
    if old.status = 'active' and new.status <> 'active' then delta := -1;
    elsif old.status <> 'active' and new.status = 'active' then delta := 1;
    end if;
  elsif tg_op = 'DELETE' then
    if old.status = 'active' then delta := -1; end if;
  end if;

  if delta <> 0 then
    update public.posts
      set comments_count = greatest(0, comments_count + delta)
      where id = coalesce(new.post_id, old.post_id);
  end if;
  return coalesce(new, old);
end $$;

create trigger comments_count_sync
  after insert or update of status or delete on public.comments
  for each row execute function public.sync_comments_count();

create or replace function public.sync_post_likes_count()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.posts
    set likes_count = greatest(0, likes_count + (case tg_op when 'INSERT' then 1 else -1 end))
    where id = coalesce(new.post_id, old.post_id);
  return coalesce(new, old);
end $$;

create trigger post_likes_count_sync
  after insert or delete on public.post_likes
  for each row execute function public.sync_post_likes_count();

create or replace function public.sync_comment_likes_count()
returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.comments
    set likes_count = greatest(0, likes_count + (case tg_op when 'INSERT' then 1 else -1 end))
    where id = coalesce(new.comment_id, old.comment_id);
  return coalesce(new, old);
end $$;

create trigger comment_likes_count_sync
  after insert or delete on public.comment_likes
  for each row execute function public.sync_comment_likes_count();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · Anti-spam cooldowns                (replaces: rules on lastPostAt / lastCommentAt)
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * `firestore.rules` armed a 60-second posting window and a 5-second comment
 * window off the profile's own timestamps, and the web walking past that
 * control was a REAL bug once already — caught by the end-to-end suite.
 *
 * Here the windows live in the INSERT policies, which is one mechanism
 * simpler: no timestamp to arm, nothing for a surface to forget. The helpers
 * are `security definer` because the author's own hidden posts are invisible
 * to them under RLS, and a cooldown that a moderator's hide RESETS would let
 * exactly the account being moderated post faster.
 *
 * The UI shows «انتظر…» from its own courtesy check; these are the
 * enforcement, and they hold with the UI bypassed entirely.
 */
create or replace function public.post_cooldown_ok()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(max(created_at), '-infinity'::timestamptz)
       < now() - interval '60 seconds'
    from public.posts where author_id = auth.uid()
$$;

create or replace function public.comment_cooldown_ok()
returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(max(created_at), '-infinity'::timestamptz)
       < now() - interval '5 seconds'
    from public.comments where author_id = auth.uid()
$$;

grant execute on function public.post_cooldown_ok, public.comment_cooldown_ok
  to authenticated;

drop policy posts_insert_own on public.posts;
create policy posts_insert_own on public.posts
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active()
    and status = 'active'
    and public.post_cooldown_ok()
  );

drop policy comments_insert_own on public.comments;
create policy comments_insert_own on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_active()
    and status = 'active'
    and exists (select 1 from public.posts p where p.id = post_id and p.status = 'active')
    and public.comment_cooldown_ok()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · Column-narrowed UPDATE grants      (replaces: rules' hasOnly() allow-lists)
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * `firestore.rules` constrained an edit to `hasOnly(['text','searchTokens',
 * 'editedAt'])`. RLS policies filter ROWS and cannot allow-list columns — but
 * the GRANT system can, and the two are ANDed. Without this, an author could
 * UPDATE their own post's `likes_count` to 999 or its `feed_score` to the
 * moon, because `posts_update_own` only checks ownership and status.
 *
 * After this section, naming any other column in an UPDATE is a permission
 * error before any policy is consulted. The counter triggers above are not
 * affected: a trigger assigning to NEW inside the original statement needs no
 * separate column grant, and the counter functions run as their owner anyway.
 */
revoke update on public.posts from authenticated;
grant update (text, search_tokens, edited_at, status) on public.posts to authenticated;

revoke update on public.comments from authenticated;
grant update (text, edited_at, status) on public.comments to authenticated;

revoke update on public.profiles from authenticated;
grant update (display_name, display_name_normalized, photo_url, bio)
  on public.profiles to authenticated;

-- Reports: `reports_update_staff` lets a moderator work the queue on the
-- publishable key, and the queue work is exactly four columns. A reporter
-- holds the same GRANT but no policy row — the AND of the two is «staff may
-- move a report through its lifecycle, nobody may rewrite what was reported».
revoke update on public.reports from authenticated;
grant update (state, handled_by, handled_at, resolution_note)
  on public.reports to authenticated;

commit;
