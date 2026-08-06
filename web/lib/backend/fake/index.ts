/**
 * A complete backend, in memory, with no network and no SDK.
 *
 * WHY THIS EXISTS
 * ===============
 * «اجعل كل Adapter قابلاً للاختبار بمزود وهمي» — and the reason that
 * requirement is worth meeting is that the alternative is untested code. The
 * real adapters need a URL, a key, a project and a network; a test that needs
 * all four is a test that gets skipped in CI and stops being run.
 *
 * What this provider makes testable is not the Supabase SDK — that is
 * Supabase's job — but everything AROUND it that is ours: the cursor and its
 * off-by-one, the soft-delete semantics, the clamps, the «an author sees their
 * own deleted post but a stranger does not» rule, the fact that a draft order
 * cannot carry a price, the forward-only fulfilment lifecycle. Every one of
 * those is a decision this repository made and can therefore get wrong.
 *
 * IT ENFORCES THE POLICIES, RATHER THAN IGNORING THEM
 * ===================================================
 * This is the design decision that makes the difference between a useful fake
 * and a decorative one. `0002` is not simulated away here: `listPosts` hides
 * `hidden` and `deleted` rows from a stranger and shows an author their own
 * `deleted` one; `deleteOwnPost` refuses somebody else's post; `myOrders`
 * returns only the caller's. Those are the same rules `scripts/testSupabaseRls.ts`
 * proves in SQL, restated here in TypeScript.
 *
 * TWO STATEMENTS OF ONE RULE IS NORMALLY A SMELL, AND HERE IT IS THE POINT.
 * The SQL copy is the enforcement — it runs in production and a client cannot
 * get around it. This copy exists so that a caller written against the port
 * meets the same refusals in a test that it will meet in production. A fake
 * that let everything through would make every caller look correct right up
 * until the day RLS said no.
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * ================================
 * It is not a database. No transactions, no concurrency, no constraint engine,
 * no query planner. Where the real thing would enforce something structurally
 * — a unique index, a foreign key — this either checks it by hand or does not
 * check it at all, and a test that depends on such a check belongs in
 * `testSupabaseRls.ts` against real PostgreSQL, where there is one.
 */

import { decodeCursor, encodeCursor } from '../../cursor';
import {
  COMMENTS_PAGE_DEFAULT, COMMENTS_PAGE_MAX, POSTS_PAGE_DEFAULT, POSTS_PAGE_MAX,
  type AccountStatus, type AdminPort, type AuthPort, type Backend, type BucketName,
  type CommentPage, type CommentSummary, type ContentStatus, type DraftOrderInput,
  type FulfilmentState, type OrderSummary, type PaymentState, type PlatformRole,
  type PostPage, type PostSummary, type ReadPort, type RealtimePort, type SessionUser,
  type StoragePort, type StoreProductSummary, type StoreVariantSummary, type SupplyRecord,
  type UploadInput, type WritePort,
} from '../ports';

/* ── The store ────────────────────────────────────────────────────────────── */

export interface FakeProfile {
  id: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoURL: string | null;
  bio: string | null;
  role: PlatformRole;
  status: AccountStatus;
  password?: string;
}

export interface FakeState {
  profiles: FakeProfile[];
  posts: PostSummary[];
  comments: Array<CommentSummary & { postId: string }>;
  postLikes: Array<{ postId: string; userId: string }>;
  products: StoreProductSummary[];
  variants: StoreVariantSummary[];
  supply: SupplyRecord[];
  shipping: Array<{ id: string; baseMinor: number; freeOverMinor: number | null; active: boolean }>;
  orders: OrderSummary[];
  orderItems: Array<{ orderId: string; productId: string; variantId: string | null; nameAr: string; unitPriceMinor: number; quantity: number; lineTotalMinor: number }>;
  reports: Array<{ id: string; targetType: string; targetId: string; reporterId: string; reason: string; detail: string | null; state: string; createdAt: string | null }>;
  audit: Array<{ actorId: string | null; action: string; targetType: string; targetId: string | null; summary: string | null; metadata: Record<string, unknown> }>;
  objects: Array<{ bucket: BucketName; path: string; contentType: string; ownerId: string | null }>;
  projectOverrides: Record<string, { published?: boolean; patch: Record<string, unknown> }>;
  /** Who is signed in. `null` is an anonymous visitor, which is a real case. */
  currentUserId: string | null;
}

export function emptyState(): FakeState {
  return {
    profiles: [], posts: [], comments: [], postLikes: [], products: [], variants: [],
    supply: [], shipping: [], orders: [], orderItems: [], reports: [], audit: [],
    objects: [], projectOverrides: {}, currentUserId: null,
  };
}

/**
 * A deterministic clock and id source.
 *
 * `Date.now()` in a fake makes a test that passes on a fast machine and fails
 * on a slow one, because two rows created in the same millisecond tie on the
 * sort key — which is the exact condition the cursor's id tiebreaker exists to
 * handle and which a test must therefore be able to PRODUCE on purpose.
 */
export class FakeClock {
  private t: number;
  private n = 0;
  constructor(startMs = Date.parse('2026-01-01T00:00:00.000Z')) { this.t = startMs; }
  /** Advance and return an ISO stamp. */
  tick(ms = 1000): string { this.t += ms; return new Date(this.t).toISOString(); }
  /** The SAME instant again — for building the tie the cursor must survive. */
  same(): string { return new Date(this.t).toISOString(); }
  id(prefix: string): string { this.n += 1; return `${prefix}-${String(this.n).padStart(4, '0')}`; }
}

/* ── Errors, worded exactly as the real adapters word them ────────────────── */

const DENIED_AR = 'لا تملك صلاحية هذا الإجراء. سجّل الدخول وحاول مرة أخرى.';
const POST_TEXT_MAX = 2000;
const COMMENT_TEXT_MAX = 500;

/**
 * Module scope, not a method, for the reason `admin.ts` moved `appendAudit` out
 * of its port: `this.publicUrl(…)` works until somebody writes
 * `const { upload } = backend.storage`, and destructuring a port is a
 * completely reasonable thing to do.
 */
function fakePublicUrl(bucket: BucketName, path: string): string {
  return `https://fake.supabase.test/storage/v1/object/public/${bucket}/${path}`;
}

const FULFILMENT_NEXT: Record<FulfilmentState, readonly FulfilmentState[]> = {
  received: ['confirmed', 'cancelled'],
  confirmed: ['ordered-from-supplier', 'cancelled'],
  'ordered-from-supplier': ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/* ── The provider ─────────────────────────────────────────────────────────── */

export interface FakeBackend extends Backend {
  admin: AdminPort;
  state: FakeState;
  clock: FakeClock;
  /** Sign in without a password — the test's equivalent of holding a cookie. */
  signInAs(userId: string | null): void;
}

export function createFakeBackend(
  seed: Partial<FakeState> = {},
  clock: FakeClock = new FakeClock(),
): FakeBackend {
  const state: FakeState = { ...emptyState(), ...seed };

  const me = (): FakeProfile | null =>
    state.profiles.find(p => p.id === state.currentUserId) ?? null;

  /**
   * The effective role — `banned` collapses to `user`.
   *
   * The same collapse `is_staff()` performs in SQL (`role in (…) and status =
   * 'active'`) and the same one `makeAuth` performs in TypeScript. Three
   * copies, because the fake must refuse what production refuses.
   */
  const isStaff = (): boolean => {
    const p = me();
    return !!p && p.status === 'active' && ['moderator', 'admin', 'owner'].includes(p.role);
  };

  /* ── auth ───────────────────────────────────────────────────────────── */

  const auth: AuthPort = {
    async currentUser(): Promise<SessionUser | null> {
      const p = me();
      if (!p) return null;
      return {
        id: p.id,
        email: p.email,
        emailVerified: p.emailVerified,
        role: p.status === 'banned' ? 'user' : p.role,
        status: p.status,
        displayName: p.displayName,
        photoURL: p.photoURL,
      };
    },

    async signInWithPassword(email, password) {
      const p = state.profiles.find(x => x.email === email && x.password === password);
      // The same single sentence for both failures the real adapter uses:
      // distinguishing them turns the form into an address-discovery tool.
      if (!p) return { ok: false, errorAr: 'البريد أو كلمة المرور غير صحيحة.' };
      state.currentUserId = p.id;
      return { ok: true };
    },

    async signUpWithPassword(email, password, displayName) {
      if (state.profiles.some(x => x.email === email)) {
        return {
          ok: false,
          errorAr: 'هذا البريد مسجَّل بالفعل. سجّل الدخول بدلاً من إنشاء حساب.',
        };
      }
      const p: FakeProfile = {
        id: clock.id('user'), email, emailVerified: false, displayName,
        photoURL: null, bio: null, role: 'user', status: 'active', password,
      };
      state.profiles.push(p);
      state.currentUserId = p.id;
      return { ok: true };
    },

    async signInWithProvider(_provider, redirectTo) {
      return { ok: true, url: redirectTo };
    },

    async signOut() { state.currentUserId = null; },
  };

  /* ── read ───────────────────────────────────────────────────────────── */

  /**
   * `posts_read_active`, in TypeScript.
   *
   * `status = 'active' or (author_id = auth.uid() and status = 'deleted')`.
   *
   * Note what is NOT here: an author does not see their own HIDDEN post. That
   * asymmetry is deliberate and was hard-won — a moderator hiding a post and
   * the author seeing it still there is how an argument starts, while an author
   * seeing their own deletion is how «حُذف» renders instead of a blank.
   */
  const visiblePost = (p: PostSummary): boolean =>
    p.status === 'active' || (p.status === 'deleted' && p.authorId === state.currentUserId);

  const visibleComment = (c: CommentSummary): boolean =>
    c.status === 'active' || (c.status === 'deleted' && c.authorId === state.currentUserId);

  const clamp = (raw: number | undefined, fallback: number, max: number): number => {
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return fallback;
    return Math.min(Math.max(Math.trunc(raw), 1), max);
  };

  const read: ReadPort = {
    async listPosts(input): Promise<PostPage> {
      const limit = clamp(input.limit, POSTS_PAGE_DEFAULT, POSTS_PAGE_MAX);
      const cursor = decodeCursor(input.cursor);

      let rows = state.posts.filter(visiblePost);
      if (input.category) rows = rows.filter(p => p.category === input.category);

      // `created_at desc, id desc` — the composite that makes the order TOTAL.
      rows = [...rows].sort((a, b) => {
        const t = Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? '');
        return t !== 0 ? t : (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
      });

      if (cursor) {
        rows = rows.filter(p => {
          const t = Date.parse(p.createdAt ?? '');
          if (t < cursor.createdAtMs) return true;
          // STRICTLY after, including on the tie. `<=` here would serve the
          // cursor row itself again at the top of every page.
          return t === cursor.createdAtMs && p.id < cursor.id;
        });
      }

      const kept = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      const last = kept[kept.length - 1];
      return {
        posts: kept,
        // The cursor is the LAST KEPT row, never the probe row beyond it.
        nextCursor: hasMore && last?.createdAt
          ? encodeCursor({ createdAtMs: Date.parse(last.createdAt), id: last.id })
          : null,
      };
    },

    async getPost(postId) {
      if (!postId || postId.length > 128) return null;
      const p = state.posts.find(x => x.id === postId);
      // A permalink 404s for hidden and deleted alike, and for the author too:
      // saying «this was removed» tells a link-holder that a specific post was
      // moderated, which is not theirs to know.
      return p && p.status === 'active' ? p : null;
    },

    async listComments(postId, input = {}): Promise<CommentPage> {
      const limit = clamp(input.limit, COMMENTS_PAGE_DEFAULT, COMMENTS_PAGE_MAX);
      const cursor = decodeCursor(input.cursor);

      // Oldest first — a thread is a conversation.
      let rows = state.comments
        .filter(c => c.postId === postId && visibleComment(c))
        .sort((a, b) => {
          const t = Date.parse(a.createdAt ?? '') - Date.parse(b.createdAt ?? '');
          return t !== 0 ? t : (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        });

      if (cursor) {
        rows = rows.filter(c => {
          const t = Date.parse(c.createdAt ?? '');
          if (t > cursor.createdAtMs) return true;
          return t === cursor.createdAtMs && c.id > cursor.id;
        });
      }

      const kept = rows.slice(0, limit);
      const hasMore = rows.length > limit;
      const last = kept[kept.length - 1];
      return {
        comments: kept.map(({ postId: _p, ...c }) => c),
        nextCursor: hasMore && last?.createdAt
          ? encodeCursor({ createdAtMs: Date.parse(last.createdAt), id: last.id })
          : null,
      };
    },

    async listPublishedProducts() {
      // `store_products_read_published` — a draft or suspended product is not
      // visible to a client at all, staff excepted.
      return state.products.filter(p => isStaff() || (p.published && !p.suspendedReasonAr));
    },

    async listVariants(productId) {
      return state.variants.filter(v => v.productId === productId);
    },

    async myOrders() {
      // `orders_read_own`. An anonymous caller has no orders — not «all of
      // them», which is what a missing filter would produce.
      if (!state.currentUserId) return [];
      return state.orders.filter(o => o.userId === state.currentUserId);
    },

    async projectOverrides() { return state.projectOverrides; },
  };

  /* ── change notification ────────────────────────────────────────────── */

  /*
   * The fake emits its own events, which is what makes `RealtimePort` testable
   * at all. A fake whose subscriptions never fire proves only that subscribing
   * does not crash.
   *
   * It reports an ID and nothing else, exactly as `realtime.ts` does, so a
   * subscriber written against this provider is a subscriber that must re-read
   * through `ReadPort` — and therefore one that goes on working when the real
   * WAL payload turns out to carry only a primary key on DELETE.
   */
  type PostHandler = (e: { kind: 'insert' | 'update' | 'delete'; postId: string }) => void;
  type CommentHandler = (e: { kind: 'insert' | 'update' | 'delete'; commentId: string }) => void;
  const postSubs = new Set<PostHandler>();
  const commentSubs = new Map<string, Set<CommentHandler>>();

  const emitPost = (kind: 'insert' | 'update' | 'delete', postId: string) => {
    for (const h of postSubs) h({ kind, postId });
  };
  const emitComment = (kind: 'insert' | 'update' | 'delete', postId: string, commentId: string) => {
    for (const h of commentSubs.get(postId) ?? []) h({ kind, commentId });
  };

  /* ── write ──────────────────────────────────────────────────────────── */

  const write: WritePort = {
    async createPost(input) {
      const p = me();
      if (!p) return { ok: false, errorAr: DENIED_AR };
      // A banned account keeps a session and loses every write. `0002` enforces
      // this with `is_active()`; the fake must refuse it too or a caller that
      // never handles the refusal will look correct.
      if (p.status === 'banned') return { ok: false, errorAr: DENIED_AR };

      const text = input.text.trim();
      if (!text) return { ok: false, errorAr: 'اكتب شيئاً قبل النشر.' };
      if (text.length > POST_TEXT_MAX) {
        return { ok: false, errorAr: `النص أطول من ${POST_TEXT_MAX} حرف. اختصره قليلاً.` };
      }

      const id = clock.id('post');
      state.posts.push({
        id,
        authorId: p.id,
        authorName: p.displayName ?? 'طيّار',
        authorPhoto: p.photoURL,
        text,
        category: input.category ?? null,
        mediaType: input.media?.type ?? 'none',
        mediaURL: input.media?.url ?? null,
        thumbnailURL: input.media?.thumbnailURL ?? null,
        mediaWidth: input.media?.width ?? null,
        mediaHeight: input.media?.height ?? null,
        mediaDuration: input.media?.duration ?? null,
        commentsCount: 0,
        likesCount: 0,
        createdAt: clock.tick(),
        editedAt: null,
        status: 'active',
      });
      emitPost('insert', id);
      return { ok: true, id };
    },

    async editPost(postId, text) {
      const p = me();
      if (!p) return { ok: false, errorAr: DENIED_AR };
      const t = text.trim();
      if (!t) return { ok: false, errorAr: 'لا يمكن ترك المنشور فارغاً.' };
      if (t.length > POST_TEXT_MAX) {
        return { ok: false, errorAr: `النص أطول من ${POST_TEXT_MAX} حرف. اختصره قليلاً.` };
      }
      const post = state.posts.find(x => x.id === postId);
      // `posts_update_own` — and the refusal is IDENTICAL for «not yours» and
      // «does not exist», so a probe cannot enumerate ids.
      if (!post || post.authorId !== p.id) return { ok: false, errorAr: DENIED_AR };
      post.text = t;
      post.editedAt = clock.tick();
      emitPost('update', postId);
      return { ok: true };
    },

    async deleteOwnPost(postId) {
      const p = me();
      if (!p) return { ok: false, errorAr: DENIED_AR };
      const post = state.posts.find(x => x.id === postId);
      if (!post || post.authorId !== p.id) return { ok: false, errorAr: DENIED_AR };
      // SOFT. The row stays, the media cleanup job is what eventually removes
      // the file, and the comments keep their parent.
      post.status = 'deleted';
      // `update`, not `delete`: the row is still there. A subscriber that
      // re-reads gets `null` from `getPost` and removes the card — which is the
      // same outcome by the honest route.
      emitPost('update', postId);
      return { ok: true };
    },

    async createComment(postId, text) {
      const p = me();
      if (!p || p.status === 'banned') return { ok: false, errorAr: DENIED_AR };
      const t = text.trim();
      if (!t) return { ok: false, errorAr: 'اكتب تعليقاً قبل الإرسال.' };
      if (t.length > COMMENT_TEXT_MAX) {
        return { ok: false, errorAr: `التعليق أطول من ${COMMENT_TEXT_MAX} حرف.` };
      }
      const post = state.posts.find(x => x.id === postId && x.status === 'active');
      if (!post) return { ok: false, errorAr: DENIED_AR };

      const id = clock.id('comment');
      state.comments.push({
        id, postId, authorId: p.id, authorName: p.displayName ?? 'طيّار',
        authorPhoto: p.photoURL, text: t, createdAt: clock.tick(),
        likesCount: 0, status: 'active',
      });
      post.commentsCount += 1;
      emitComment('insert', postId, id);
      return { ok: true, id };
    },

    async deleteOwnComment(commentId) {
      const p = me();
      if (!p) return { ok: false, errorAr: DENIED_AR };
      const c = state.comments.find(x => x.id === commentId);
      if (!c || c.authorId !== p.id) return { ok: false, errorAr: DENIED_AR };
      c.status = 'deleted';
      const post = state.posts.find(x => x.id === c.postId);
      if (post) post.commentsCount = Math.max(0, post.commentsCount - 1);
      emitComment('update', c.postId, commentId);
      return { ok: true };
    },

    async togglePostLike(postId) {
      const p = me();
      if (!p || p.status === 'banned') return { ok: false, errorAr: DENIED_AR };
      const post = state.posts.find(x => x.id === postId && x.status === 'active');
      if (!post) return { ok: false, errorAr: DENIED_AR };

      const i = state.postLikes.findIndex(l => l.postId === postId && l.userId === p.id);
      if (i >= 0) {
        state.postLikes.splice(i, 1);
        post.likesCount = Math.max(0, post.likesCount - 1);
        return { ok: true, liked: false };
      }
      state.postLikes.push({ postId, userId: p.id });
      post.likesCount += 1;
      return { ok: true, liked: true };
    },

    async report(input) {
      const p = me();
      if (!p || p.status === 'banned') return { ok: false, errorAr: DENIED_AR };
      // `reports_one_open_per_reporter`: one open report per person per target,
      // because a pile-on is not more signal.
      const dup = state.reports.some(r =>
        r.reporterId === p.id && r.targetType === input.targetType
        && r.targetId === input.targetId && ['open', 'reviewing'].includes(r.state));
      if (dup) return { ok: false, errorAr: 'سبق أن أبلغت عن هذا. البلاغ قيد المراجعة.' };

      state.reports.push({
        id: clock.id('report'), targetType: input.targetType, targetId: input.targetId,
        reporterId: p.id, reason: input.reason, detail: input.detail ?? null,
        state: 'open', createdAt: clock.tick(),
      });
      return { ok: true };
    },

    async updateOwnProfile(input) {
      const p = me();
      if (!p) return { ok: false, errorAr: DENIED_AR };
      // `role` and `status` are absent from the input TYPE, so there is nothing
      // to filter out here — which is the point of them being absent.
      if (input.displayName !== undefined) p.displayName = input.displayName;
      if (input.photoURL !== undefined) p.photoURL = input.photoURL;
      if (input.bio !== undefined) p.bio = input.bio;
      return { ok: true };
    },
  };

  /* ── storage ────────────────────────────────────────────────────────── */

  /**
   * `storage_path_is_own()` and `storage_name_is_safe()`, restated.
   *
   * The traversal checks look paranoid for an in-memory array that could not be
   * traversed anyway. They are here because the thing under test is the CALLER:
   * a component that builds `${uid}/../${otherUid}/x.png` should fail in a test
   * for the same reason it fails in production, and a permissive fake would
   * pass it.
   */
  const pathIsOwn = (path: string, uid: string | null): boolean =>
    !!uid && path.split('/')[0] === uid;

  const nameIsSafe = (path: string): boolean => {
    if (!path || path.length < 3 || path.length > 512) return false;
    if (path.includes('..') || path.startsWith('/') || path.includes('//')) return false;
    // eslint-disable-next-line no-control-regex -- the control range IS the check
    if (path.includes('\\') || /[\u0000-\u001f\u007f]/.test(path)) return false;
    const file = path.slice(path.lastIndexOf('/') + 1);
    return (file.match(/\./g) ?? []).length === 1;
  };

  /** Which buckets a browser may write to, and as whom. Mirrors `0003`. */
  const mayWrite = (bucket: BucketName, path: string): boolean => {
    const uid = state.currentUserId;
    if (!uid) return false;
    switch (bucket) {
      case 'avatars':
        return pathIsOwn(path, uid);
      case 'community-media':
        // Exactly two folder segments: `{uid}/{postId}/file.ext`.
        return pathIsOwn(path, uid) && path.split('/').length === 3;
      case 'store-products':
      case 'project-images': {
        // `is_admin()`, NOT `is_staff()`. A moderator moderates the community;
        // they do not publish product photography.
        const p = me();
        return !!p && p.status === 'active' && ['admin', 'owner'].includes(p.role);
      }
    }
  };

  const storage: StoragePort = {
    async upload(input: UploadInput) {
      if (!nameIsSafe(input.path)) {
        return { ok: false, errorAr: 'اسم الملف غير صالح.' };
      }
      if (!mayWrite(input.bucket, input.path)) {
        return { ok: false, errorAr: 'لا تملك صلاحية الرفع هنا. سجّل الدخول وحاول مرة أخرى.' };
      }
      if (state.objects.some(o => o.bucket === input.bucket && o.path === input.path)) {
        // No upsert, ever — see `storage.ts`. A duplicate path is an error
        // somebody sees, not a photo somebody lost.
        return { ok: false, errorAr: 'يوجد ملف بنفس الاسم. أعد المحاولة — سيُعطى الملف اسماً جديداً.' };
      }
      state.objects.push({
        bucket: input.bucket, path: input.path,
        contentType: input.contentType, ownerId: state.currentUserId,
      });
      return { ok: true, url: fakePublicUrl(input.bucket, input.path) };
    },

    async remove(bucket, path) {
      const i = state.objects.findIndex(o => o.bucket === bucket && o.path === path);
      if (i < 0) return { ok: false, errorAr: 'تعذّر حذف الملف. حاول مرة أخرى.' };
      // A moderator may delete community media without being able to upload it
      // — the asymmetry `0003` grants on purpose, so abuse can be taken down.
      const canDelete = mayWrite(bucket, path)
        || (bucket === 'community-media' && isStaff());
      if (!canDelete) return { ok: false, errorAr: 'تعذّر حذف الملف. حاول مرة أخرى.' };
      state.objects.splice(i, 1);
      return { ok: true };
    },

    publicUrl: fakePublicUrl,
  };

  const realtime: RealtimePort = {
    onPostsChanged(handler) {
      postSubs.add(handler);
      return () => { postSubs.delete(handler); };
    },
    onCommentsChanged(postId, handler) {
      const set = commentSubs.get(postId) ?? new Set<CommentHandler>();
      set.add(handler);
      commentSubs.set(postId, set);
      return () => { set.delete(handler); };
    },
  };

  /* ── admin ──────────────────────────────────────────────────────────── */

  const audit = (
    actorId: string | null, action: string, targetType: string,
    targetId?: string, summary?: string, metadata?: Record<string, unknown>,
  ) => {
    state.audit.push({
      actorId, action, targetType, targetId: targetId ?? null,
      summary: summary ?? null, metadata: metadata ?? {},
    });
  };

  const adminPort: AdminPort = {
    async createOrder(draft: DraftOrderInput, userId: string | null) {
      const items = draft.items.filter(i => i.quantity > 0 && i.productId);
      if (items.length === 0) return { ok: false, errorAr: 'السلة فارغة.' };
      if (items.length > 50) return { ok: false, errorAr: 'عدد الأصناف في السلة كبير جداً.' };

      let subtotal = 0;
      let currency = 'EUR';
      const lines: FakeState['orderItems'] = [];

      for (const item of items) {
        const product = state.products.find(p => p.id === item.productId);
        if (!product || !product.published || product.suspendedReasonAr) {
          return { ok: false, errorAr: 'أحد المنتجات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى.' };
        }
        const variant = item.variantId
          ? state.variants.find(v => v.id === item.variantId)
          : undefined;
        if (item.variantId && (!variant || variant.productId !== item.productId)) {
          return { ok: false, errorAr: 'أحد الخيارات لم يعد متاحاً. حدّث السلة وحاول مرة أخرى.' };
        }
        // The catalogue is the price. There is no number in `draft` to compare
        // it against, which is the whole point of `DraftOrderInput`'s shape.
        const unit = variant?.priceMinor ?? null;
        if (unit === null) {
          return { ok: false, errorAr: 'أحد المنتجات بلا سعر محدد. تواصل معنا لإتمام الطلب.' };
        }
        if (variant) currency = variant.currency;

        const quantity = Math.min(Math.trunc(item.quantity), 99);
        const lineTotal = unit * quantity;
        subtotal += lineTotal;
        lines.push({
          orderId: '', productId: item.productId, variantId: item.variantId,
          nameAr: variant?.labelAr ?? product.nameAr,
          unitPriceMinor: unit, quantity, lineTotalMinor: lineTotal,
        });
      }

      const region = draft.shippingRegionId
        ? state.shipping.find(r => r.id === draft.shippingRegionId && r.active)
        : undefined;
      // `null` region means «we have never worked out what a parcel there
      // costs», and quoting zero would have the shop find out by losing money.
      if (!region) return { ok: false, errorAr: 'لا نشحن إلى هذه المنطقة حالياً.' };
      const shipping = region.freeOverMinor !== null && subtotal >= region.freeOverMinor
        ? 0 : region.baseMinor;

      const id = clock.id('order');
      const order: OrderSummary = {
        id,
        reference: `FPV-${id.toUpperCase()}`,
        userId,
        subtotalMinor: subtotal,
        shippingMinor: shipping,
        totalMinor: subtotal + shipping,
        currency,
        paymentState: 'draft',
        fulfilmentState: 'received',
        createdAt: clock.tick(),
      };
      state.orders.push(order);
      for (const l of lines) state.orderItems.push({ ...l, orderId: id });
      audit(userId, 'order.create', 'order', id, undefined,
        { total_minor: order.totalMinor, lines: lines.length });
      return { ok: true, order };
    },

    async setPaymentState(orderId, state_: PaymentState, actorId) {
      const o = state.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, errorAr: 'تعذّر إتمام العملية. حاول مرة أخرى.' };
      o.paymentState = state_;
      audit(actorId, 'order.payment_state', 'order', orderId, state_);
      return { ok: true };
    },

    async setFulfilmentState(orderId, next, actorId) {
      const o = state.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, errorAr: 'الطلب غير موجود.' };
      const from = o.fulfilmentState;
      // Forward only. A delivered order cannot return to «received»: an order's
      // history is a record of what happened, not a field to be edited.
      if (from !== next && !FULFILMENT_NEXT[from].includes(next)) {
        return { ok: false, errorAr: 'هذا الانتقال غير مسموح من الحالة الحالية للطلب.' };
      }
      o.fulfilmentState = next;
      audit(actorId, 'order.fulfilment', 'order', orderId, `${from} → ${next}`);
      return { ok: true };
    },

    async setUserRole(userId, role, actorId) {
      const target = state.profiles.find(p => p.id === userId);
      if (!target) return { ok: false, errorAr: 'الحساب غير موجود.' };
      if (target.role === 'owner' && role !== 'owner') {
        const owners = state.profiles.filter(p => p.role === 'owner').length;
        // A platform whose last owner demotes themselves has no way back in
        // short of a SQL console.
        if (owners <= 1) return { ok: false, errorAr: 'لا يمكن إزالة آخر مالك للمنصة.' };
      }
      const from = target.role;
      target.role = role;
      audit(actorId, 'role.change', 'profile', userId, `${from} → ${role}`);
      return { ok: true };
    },

    async setUserStatus(userId, status, actorId) {
      const target = state.profiles.find(p => p.id === userId);
      if (!target) return { ok: false, errorAr: 'الحساب غير موجود.' };
      target.status = status;
      audit(actorId, status === 'banned' ? 'user.ban' : 'user.unban', 'profile', userId);
      return { ok: true };
    },

    async moderateContent(input) {
      const row: { status: ContentStatus } | undefined = input.kind === 'post'
        ? state.posts.find(p => p.id === input.id)
        : state.comments.find(c => c.id === input.id);
      if (!row) return { ok: false, errorAr: 'تعذّر إتمام العملية. حاول مرة أخرى.' };
      row.status = input.status;
      audit(input.actorId, `${input.kind}.${input.status}`, input.kind, input.id, input.reasonAr);
      return { ok: true };
    },

    async supplyFor(productId) {
      const mine = state.supply.filter(s => s.productId === productId);
      if (mine.length === 0) return null;
      // The freshest, because the question is «has anybody looked at this
      // product's economics recently».
      return mine.reduce((a, b) => ((a.updatedAt ?? '') >= (b.updatedAt ?? '') ? a : b));
    },

    async appendAudit(entry) {
      audit(entry.actorId, entry.action, entry.targetType,
        entry.targetId, entry.summary, entry.metadata);
    },

    async listReports(reportState) {
      return state.reports
        .filter(r => !reportState || r.state === reportState)
        .map(r => ({
          id: r.id, targetType: r.targetType, targetId: r.targetId,
          reason: r.reason, state: r.state, createdAt: r.createdAt,
        }));
    },
  };

  return {
    auth, read, write, storage, realtime,
    admin: adminPort,
    state,
    clock,
    signInAs(userId) { state.currentUserId = userId; },
  };
}
