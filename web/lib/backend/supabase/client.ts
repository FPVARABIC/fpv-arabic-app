import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { decodeCursor, encodeCursor } from '../../cursor';
import { normalizeDisplayName } from '@core/community/utils/userSearch';
import { NOT_CONFIGURED_AR, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, isSupabaseConfigured } from './env';
import { makeAuth } from './auth';
import { makeRealtime } from './realtime';
import { makeStorage } from './storage';
import {
  clampLimit, keysetFilter, toCommentSummary, toIso, toOrderSummary,
  toPostSummary, toProductSummary, toVariantSummary, type Row,
} from './rows';
import {
  COMMENTS_PAGE_DEFAULT, COMMENTS_PAGE_MAX, POSTS_PAGE_DEFAULT, POSTS_PAGE_MAX,
  type Backend, type CommentPage, type ListPostsInput, type PostPage, type ReadPort, type WritePort,
} from '../ports';

/**
 * The CLIENT adapter — every operation the PUBLISHABLE key may perform.
 *
 * WHAT «CLIENT» MEANS HERE, AND WHY IT IS NOT «BROWSER»
 * =====================================================
 * The split between this file and `server.ts` is not «runs in a browser» versus
 * «runs on a server». It is WHICH KEY THE CALL CARRIES.
 *
 * Everything below runs under the publishable key and is therefore subject to
 * row-level security exactly as written in `0002` — whether the call happens in
 * a browser or during server rendering. `server.ts` reuses these same factories
 * with a client bound to the request's cookies, so a server-rendered page sees
 * precisely what the signed-in visitor is allowed to see, no more. `admin.ts`
 * is the other key, and it is a different file for that reason alone.
 *
 * WHY RLS IS THE FILTER AND NOT A `WHERE` CLAUSE
 * ==============================================
 * This is the single largest change from the Firebase layer, and it is worth
 * being explicit about.
 *
 * `lib/server/community.ts` reads through the Admin SDK, which BYPASSES
 * Firestore rules — so every query in it has to restate `status == 'active'`
 * by hand, and a query that forgets publishes moderator-hidden and
 * author-deleted posts. That file says so itself, and `testWebCommunity.ts`
 * exists to assert the restatement is present in every query.
 *
 * Here the policy IS the filter. `posts_read_active` in `0002` already says
 * `status = 'active' or (author_id = auth.uid() and status = 'deleted')`, and
 * the 58 assertions in `scripts/testSupabaseRls.ts` prove it against a real
 * PostgreSQL. A `.eq('status', 'active')` below would be a second copy of that
 * rule, in a second language, that can drift from the first. So the queries
 * name what they WANT, not what they are permitted, and the database decides.
 *
 * The one exception is ordering and pagination, which are not authorisation and
 * do belong here.
 *
 * NOTHING IN THIS FILE THROWS
 * ===========================
 * Reads return empty, writes return `{ ok: false, errorAr }`. A read that
 * throws reached production once as a twenty-one byte `Internal Server Error`
 * with no indication of which pillar had failed; the reason belongs in the
 * function log, and the page belongs on the screen.
 */

/* ── The browser client ───────────────────────────────────────────────────── */

let browserClient: SupabaseClient | null = null;

/**
 * The one browser client, created lazily.
 *
 * Lazy so that importing this module from a component that never queries does
 * not open a connection. Memoised because `createBrowserClient` installs auth
 * state listeners and a token-refresh timer: a second instance would refresh
 * the same session twice and race itself writing the cookie back.
 *
 * Returns `null` rather than throwing when the environment has no project
 * attached — the site must build and run in a development checkout with no
 * Supabase, and every adapter below already treats `null` as «not connected».
 */
export function browserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  }
  return browserClient;
}

/* ── Reads ────────────────────────────────────────────────────────────────── */

const EMPTY_POSTS: PostPage = { posts: [], nextCursor: null };
const EMPTY_COMMENTS: CommentPage = { comments: [], nextCursor: null };

export function makeRead(sb: SupabaseClient | null): ReadPort {
  return {
    async listPosts(input: ListPostsInput): Promise<PostPage> {
      if (!sb) return EMPTY_POSTS;
      const limit = clampLimit(input.limit, POSTS_PAGE_DEFAULT, POSTS_PAGE_MAX);
      const cursor = decodeCursor(input.cursor);

      try {
        let q = sb
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          // One extra row to learn whether another page exists, without a
          // second query and without a count that would drift under writes.
          .limit(limit + 1);

        if (input.category) q = q.eq('category', input.category);
        if (cursor) {
          q = q.or(keysetFilter(new Date(cursor.createdAtMs).toISOString(), cursor.id, 'desc'));
        }

        const { data, error } = await q;
        if (error || !data) {
          if (error) console.error('[backend] listPosts failed', error.message);
          return EMPTY_POSTS;
        }
        return pageOf(data as Row[], limit, toPostSummary);
      } catch (e) {
        console.error('[backend] listPosts threw', e);
        return EMPTY_POSTS;
      }
    },

    async getPost(postId) {
      if (!sb || !postId || postId.length > 128) return null;
      try {
        const { data, error } = await sb.from('posts').select('*').eq('id', postId).maybeSingle();
        if (error || !data) return null;
        const post = toPostSummary(data as Row);
        // An author CAN see their own soft-deleted post — `0002` allows it so a
        // «حُذف» state can be rendered instead of a 404 that looks like data
        // loss. A permalink is still a 404 for everyone, including the author:
        // distinguishing «removed» from «never existed» tells anyone holding a
        // saved link that a specific post was moderated, which is not theirs to
        // know.
        return post.status === 'active' ? post : null;
      } catch (e) {
        console.error('[backend] getPost threw', e);
        return null;
      }
    },

    async listComments(postId, input = {}): Promise<CommentPage> {
      if (!sb || !postId) return EMPTY_COMMENTS;
      const limit = clampLimit(input.limit, COMMENTS_PAGE_DEFAULT, COMMENTS_PAGE_MAX);
      const cursor = decodeCursor(input.cursor);

      try {
        // Oldest first: a comment thread is a conversation and reads in order.
        let q = sb
          .from('comments')
          .select('*')
          .eq('post_id', postId)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true })
          .limit(limit + 1);

        if (cursor) {
          q = q.or(keysetFilter(new Date(cursor.createdAtMs).toISOString(), cursor.id, 'asc'));
        }

        const { data, error } = await q;
        if (error || !data) {
          if (error) console.error('[backend] listComments failed', error.message);
          return EMPTY_COMMENTS;
        }
        const page = pageOf(data as Row[], limit, toCommentSummary);
        return { comments: page.posts, nextCursor: page.nextCursor };
      } catch (e) {
        console.error('[backend] listComments threw', e);
        return EMPTY_COMMENTS;
      }
    },

    async listPublishedProducts() {
      if (!sb) return [];
      try {
        const { data, error } = await sb
          .from('store_products')
          .select('*')
          .order('category_id', { ascending: true })
          .order('sort_order', { ascending: true });
        if (error || !data) return [];
        return (data as Row[]).map(toProductSummary);
      } catch (e) {
        console.error('[backend] listPublishedProducts threw', e);
        return [];
      }
    },

    async listVariants(productId) {
      if (!sb || !productId) return [];
      try {
        const { data, error } = await sb
          .from('store_variants')
          .select('*')
          .eq('product_id', productId)
          .order('sort_order', { ascending: true });
        if (error || !data) return [];
        return (data as Row[]).map(toVariantSummary);
      } catch (e) {
        console.error('[backend] listVariants threw', e);
        return [];
      }
    },

    async myOrders() {
      if (!sb) return [];
      try {
        // No `.eq('user_id', …)`. `orders_read_own` is the filter, and adding
        // one here would be a second copy of it — one that keeps working if
        // the policy is ever dropped, which is the worst possible failure mode
        // for this particular table.
        const { data, error } = await sb
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (error || !data) return [];
        return (data as Row[]).map(toOrderSummary);
      } catch (e) {
        console.error('[backend] myOrders threw', e);
        return [];
      }
    },

    async projectOverrides() {
      if (!sb) return {};
      try {
        const { data, error } = await sb.from('project_overrides').select('*');
        if (error || !data) return {};
        const out: Record<string, { published?: boolean; patch: Record<string, unknown> }> = {};
        for (const raw of data as Row[]) {
          const id = typeof raw.id === 'string' ? raw.id : null;
          if (!id) continue;
          out[id] = {
            published: typeof raw.published === 'boolean' ? raw.published : undefined,
            patch: (raw.patch ?? {}) as Record<string, unknown>,
          };
        }
        return out;
      } catch (e) {
        console.error('[backend] projectOverrides threw', e);
        return {};
      }
    },
  };
}

/**
 * `limit + 1` rows → a page and a cursor.
 *
 * The cursor is the LAST RETURNED row's `(created_at, id)` — not the extra
 * probe row's. Using the probe would skip it on the next page, which is the
 * off-by-one this helper exists to make impossible to write twice.
 */
function pageOf<T extends { id: string }>(
  rows: Row[], limit: number, map: (r: Row) => T,
): { posts: T[]; nextCursor: string | null } {
  const kept = rows.slice(0, limit);
  const hasMore = rows.length > limit;
  const lastRow = kept[kept.length - 1];
  const lastIso = lastRow ? toIso(lastRow.created_at) : null;

  return {
    posts: kept.map(map),
    nextCursor: hasMore && lastRow && lastIso
      ? encodeCursor({ createdAtMs: Date.parse(lastIso), id: String(lastRow.id) })
      : null,
  };
}

/* ── Writes ───────────────────────────────────────────────────────────────── */

/**
 * Every write goes through RLS as the signed-in user.
 *
 * There is no ownership check in this file for the same reason there is none in
 * `storage.ts`: `posts_update_own`, `comments_delete_own` and the rest already
 * carry it, they are proven by 58 assertions against a real PostgreSQL, and a
 * second copy here could disagree with the first.
 *
 * What IS here is length validation, and that is not authorisation — it is
 * telling somebody their post is too long before making them wait for a round
 * trip to find out. The database has its own limits; this is the courtesy.
 */
const POST_TEXT_MAX = 2000;
const COMMENT_TEXT_MAX = 500;

/**
 * Search tokens, produced by the SAME pipeline the phone app uses, imported
 * from the shared core rather than reimplemented: two different tokenisers
 * would make a post findable on one surface and invisible on the other, and
 * the divergence would be silent. `0006` stores them; the search page queries
 * them with an array-overlap that a GIN index serves.
 */
function tokensFor(text: string): string[] {
  return Array.from(new Set(
    normalizeDisplayName(text).split(/\s+/).filter(t => t.length >= 2),
  )).slice(0, 30);
}

const DENIED_AR = 'لا تملك صلاحية هذا الإجراء. سجّل الدخول وحاول مرة أخرى.';
const FAILED_AR = 'تعذّر إتمام العملية. حاول مرة أخرى.';

/** A policy refusal reads as denial; anything else reads as a fault. */
function writeErrorAr(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('policy') || m.includes('permission')) {
    return DENIED_AR;
  }
  if (m.includes('cooldown')) {
    return 'على مهل — انتظر قليلاً قبل النشر مرة أخرى.';
  }
  if (m.includes('duplicate') || m.includes('unique')) {
    return 'سبق أن أرسلت هذا. لا حاجة لتكراره.';
  }
  return FAILED_AR;
}

export function makeWrite(sb: SupabaseClient | null): WritePort {
  const fail = () => ({ ok: false as const, errorAr: NOT_CONFIGURED_AR });

  return {
    async createPost(input) {
      if (!sb) return fail();
      const text = input.text.trim();
      if (!text) return { ok: false, errorAr: 'اكتب شيئاً قبل النشر.' };
      if (text.length > POST_TEXT_MAX) {
        return { ok: false, errorAr: `النص أطول من ${POST_TEXT_MAX} حرف. اختصره قليلاً.` };
      }

      const user = await currentUserId(sb);
      if (!user) return { ok: false, errorAr: DENIED_AR };

      try {
        const { data, error } = await sb
          .from('posts')
          .insert({
            // The id is the caller's when media forced it to exist early (the
            // storage path needs it before the upload), the database's when
            // not. Either way it is a fresh uuid for the caller's own post.
            ...(input.id ? { id: input.id } : {}),
            // `author_id` is sent because the column is NOT NULL, and
            // `posts_insert_own` in `0002` checks `author_id = auth.uid()` —
            // so sending somebody else's id is refused by the database rather
            // than trusted here.
            author_id: user,
            text,
            search_tokens: tokensFor(text),
            category: input.category ?? null,
            media_type: input.media?.type ?? 'none',
            media_url: input.media?.url ?? null,
            thumbnail_url: input.media?.thumbnailURL ?? null,
            media_width: input.media?.width ?? null,
            media_height: input.media?.height ?? null,
            media_duration: input.media?.duration ?? null,
          })
          .select('id')
          .single();

        if (error || !data) return { ok: false, errorAr: writeErrorAr(error?.message ?? '') };
        return { ok: true, id: String((data as Row).id) };
      } catch (e) {
        console.error('[backend] createPost threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async editPost(postId, text) {
      if (!sb) return fail();
      const t = text.trim();
      if (!t) return { ok: false, errorAr: 'لا يمكن ترك المنشور فارغاً.' };
      if (t.length > POST_TEXT_MAX) {
        return { ok: false, errorAr: `النص أطول من ${POST_TEXT_MAX} حرف. اختصره قليلاً.` };
      }
      // Tokens move with the text — an edited post that kept its old tokens
      // would be findable by words it no longer contains.
      return changed(sb.from('posts')
        .update({ text: t, search_tokens: tokensFor(t), edited_at: new Date().toISOString() })
        .eq('id', postId)
        .select('id'));
    },

    async deleteOwnPost(postId) {
      if (!sb) return fail();
      // SOFT delete. Nothing in this interface hard-deletes user content: the
      // media cleanup job is what eventually removes the file, and it records
      // what it did. A hard delete here would also orphan every comment.
      return changed(sb.from('posts').update({ status: 'deleted' }).eq('id', postId).select('id'));
    },

    async createComment(postId, text) {
      if (!sb) return fail();
      const t = text.trim();
      if (!t) return { ok: false, errorAr: 'اكتب تعليقاً قبل الإرسال.' };
      if (t.length > COMMENT_TEXT_MAX) {
        return { ok: false, errorAr: `التعليق أطول من ${COMMENT_TEXT_MAX} حرف.` };
      }

      const user = await currentUserId(sb);
      if (!user) return { ok: false, errorAr: DENIED_AR };

      try {
        const { data, error } = await sb
          .from('comments')
          .insert({ post_id: postId, author_id: user, text: t })
          .select('id')
          .single();
        if (error || !data) return { ok: false, errorAr: writeErrorAr(error?.message ?? '') };
        return { ok: true, id: String((data as Row).id) };
      } catch (e) {
        console.error('[backend] createComment threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async deleteOwnComment(commentId) {
      if (!sb) return fail();
      return changed(sb.from('comments').update({ status: 'deleted' }).eq('id', commentId).select('id'));
    },

    async togglePostLike(postId) {
      if (!sb) return fail();
      const user = await currentUserId(sb);
      if (!user) return { ok: false, errorAr: DENIED_AR };

      try {
        // Read-then-write rather than an upsert, because the answer the caller
        // needs is «is it liked NOW» and an upsert cannot say. The composite
        // primary key `(post_id, user_id)` is what makes a double-tap
        // idempotent regardless — a race here loses a toggle, never a count.
        const { data: existing } = await sb
          .from('post_likes')
          .select('post_id')
          .eq('post_id', postId)
          .eq('user_id', user)
          .maybeSingle();

        if (existing) {
          const { error } = await sb
            .from('post_likes').delete().eq('post_id', postId).eq('user_id', user);
          if (error) return { ok: false, errorAr: writeErrorAr(error.message) };
          return { ok: true, liked: false };
        }

        const { error } = await sb
          .from('post_likes').insert({ post_id: postId, user_id: user });
        if (error) return { ok: false, errorAr: writeErrorAr(error.message) };
        return { ok: true, liked: true };
      } catch (e) {
        console.error('[backend] togglePostLike threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async report(input) {
      if (!sb) return fail();
      const user = await currentUserId(sb);
      if (!user) return { ok: false, errorAr: DENIED_AR };

      try {
        const { error } = await sb.from('reports').insert({
          target_type: input.targetType,
          target_id: input.targetId,
          reporter_id: user,
          reason: input.reason,
          detail: input.detail ?? null,
        });
        if (error) {
          // `reports_one_open_per_reporter` is a partial unique index: one open
          // report per person per target, because a pile-on is not more signal.
          // Hitting it is not an error the reporter caused.
          if (/duplicate|unique/i.test(error.message)) {
            return { ok: false, errorAr: 'سبق أن أبلغت عن هذا. البلاغ قيد المراجعة.' };
          }
          return { ok: false, errorAr: writeErrorAr(error.message) };
        }
        return { ok: true };
      } catch (e) {
        console.error('[backend] report threw', e);
        return { ok: false, errorAr: FAILED_AR };
      }
    },

    async updateOwnProfile(input) {
      if (!sb) return fail();
      const user = await currentUserId(sb);
      if (!user) return { ok: false, errorAr: DENIED_AR };

      // NOTE WHAT IS NOT SETTABLE: `role` and `status`. They are absent from the
      // interface, absent from this object, and refused by
      // `profiles_update_self`'s `with check`, which requires both to equal
      // their current values. Three layers, and only the last one is load
      // bearing.
      const patch: Row = {};
      if (input.displayName !== undefined) patch.display_name = input.displayName;
      if (input.photoURL !== undefined) patch.photo_url = input.photoURL;
      if (input.bio !== undefined) patch.bio = input.bio;
      if (Object.keys(patch).length === 0) return { ok: true };

      return changed(sb.from('profiles').update(patch).eq('id', user).select('id'));
    },
  };
}

/** The caller's uid, or null. Cheap: the SDK caches the decoded session. */
async function currentUserId(sb: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Did the statement actually change a row?
 *
 * THE DISTINCTION THIS EXISTS FOR: an UPDATE whose rows are all filtered out by
 * a `using` policy SUCCEEDS. No error, no exception — it simply matches nothing
 * and reports zero rows affected. Treating «no error» as success would make
 * every unauthorised edit look like it worked, and the user would watch their
 * change vanish on the next refresh with no message.
 *
 * So the write asks for the rows back and counts them. Zero is a refusal.
 * (The same trap was found and fixed in `scripts/testSupabaseStorage.ts`, where
 * two assertions were passing against a filtered UPDATE that changed nothing.)
 */
async function changed(
  builder: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
): Promise<{ ok: true } | { ok: false; errorAr: string }> {
  try {
    const { data, error } = await builder;
    if (error) return { ok: false, errorAr: writeErrorAr(error.message) };
    return (data?.length ?? 0) > 0 ? { ok: true } : { ok: false, errorAr: DENIED_AR };
  } catch (e) {
    console.error('[backend] write threw', e);
    return { ok: false, errorAr: FAILED_AR };
  }
}

/* ── The composition root for the browser ─────────────────────────────────── */

/**
 * The `Backend` a client component is handed.
 *
 * Note the return type: `Backend`, which has no `admin` key. A component that
 * wants `setUserRole` cannot reach it from here, and reaching it the other way
 * — importing `admin.ts` — fails to compile in a client bundle because that
 * module is `server-only`. The boundary is a build error, not a review comment.
 */
export function browserBackend(): Backend {
  const sb = browserSupabase();
  return {
    auth: makeAuth(sb),
    read: makeRead(sb),
    write: makeWrite(sb),
    storage: makeStorage(sb),
    realtime: makeRealtime(sb),
  };
}
