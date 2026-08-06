/**
 * What the platform needs from a backend, said without naming one.
 *
 * WHY PORTS AND NOT «JUST CALL SUPABASE»
 * ======================================
 * The brief is «لا أريد استدعاءات Supabase مبعثرة في الصفحات والمكونات» and
 * «يجب أن تبقى واجهات الاستخدام مستقلة قدر الإمكان عن المزود». Both are the
 * same requirement seen from two ends, and this file is where it is enforced:
 * every type below is a domain shape, and not one of them is imported from an
 * SDK.
 *
 * The reason is not portability for its own sake — it is that this repository
 * has just spent a migration discovering how much code had Firebase's shape
 * baked into it. 53 files import the client SDK, 10 the admin one, and every
 * one of them has to be opened and understood to move. A page that calls
 * `posts.list({ limit })` instead of a query builder does not care which
 * database answers, and the next move costs one folder rather than 63 files.
 *
 * THE CONTRACTS ARE THE EXISTING ONES
 * ===================================
 * `PostSummary`, `CommentSummary`, cursor pagination, minor-unit money — these
 * are what `web/lib/server/community.ts` and the store already return. They are
 * re-declared here rather than invented, so the pages that consume them do not
 * change when the implementation behind them does. «حافظ على نفس العقود
 * الحالية» is a requirement about the CALLERS, and it is met by keeping the
 * shapes identical.
 *
 * FIVE ADAPTERS, AND WHY THE SPLIT IS WHERE IT IS
 * ===============================================
 * The line is not «read vs write». It is WHICH KEY THE CALL CARRIES:
 *
 *   AuthPort      the session — the only one both browser and server hold
 *   ReadPort      anything RLS lets a browser see with the publishable key
 *   WritePort     anything RLS lets a browser change, as itself
 *   AdminPort     everything the secret key is for: money, roles, the audit
 *                 log, supplier cost. NEVER reachable from a browser.
 *   StoragePort   files
 *   RealtimePort  subscriptions
 *
 * `AdminPort` is separate from `WritePort` for exactly one reason: a function
 * that can be imported is a function that will be imported. Keeping the
 * privileged operations in a different object, behind a different module that
 * refuses to load in a browser, makes the mistake a build error instead of a
 * review comment.
 */

/* ── Identity ─────────────────────────────────────────────────────────────── */

export type PlatformRole = 'user' | 'moderator' | 'admin' | 'owner';
export type AccountStatus = 'active' | 'banned';

export interface SessionUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  role: PlatformRole;
  status: AccountStatus;
  displayName: string | null;
  photoURL: string | null;
}

/* ── Community — the shapes the pages already consume ─────────────────────── */

export type ContentStatus = 'active' | 'hidden' | 'deleted';
export type MediaKind = 'none' | 'image' | 'video';

/**
 * The nine category ids, restated rather than imported.
 *
 * `@core/community/types` is where they live. That module used to open with
 * `import type { Timestamp } from 'firebase/firestore'` (it carries a
 * structural Timestamp of its own now), and this file's whole purpose is to
 * name no provider — so it does not import from the community contract at
 * all, and cannot re-acquire a vendor dependency through it later.
 *
 * The duplication is safe because it is CHECKED, not trusted:
 * `scripts/testBackendAdapter.ts` asserts this array equals `ALL_CATEGORY_IDS`
 * element for element, so adding a category in one place and not the other is a
 * failing test rather than a category that silently cannot be posted in.
 */
export const POST_CATEGORIES = [
  'questions', 'parts', 'projects', 'flights', 'betaflight',
  'electronics', 'long-range', 'cinematic', 'freestyle',
] as const;

export type PostCategory = (typeof POST_CATEGORIES)[number];

export interface PostSummary {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  category: PostCategory | null;
  mediaType: MediaKind;
  mediaURL: string | null;
  thumbnailURL: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  mediaDuration: number | null;
  commentsCount: number;
  likesCount: number;
  /** ISO string. A database timestamp cannot cross the server/client boundary. */
  createdAt: string | null;
  editedAt: string | null;
  status: ContentStatus;
}

export interface CommentSummary {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: string | null;
  likesCount: number;
  status: ContentStatus;
}

/**
 * A page of results.
 *
 * Cursor, not offset — the same decision the Firestore layer made and for the
 * same reason: an offset shifts when somebody posts mid-browse, which is
 * precisely the «duplicate or lost post» failure.
 *
 * WHY THIS IS NOT A GENERIC `Page<T>`
 * -----------------------------------
 * A `{ items, nextCursor }` envelope would be tidier, and it would be wrong.
 * `lib/server/community.ts` returns `{ posts, nextCursor }` and
 * `{ comments, nextCursor }` today, and every page and component that consumes
 * them destructures those names. «حافظ على نفس العقود الحالية» is a requirement
 * about the CALLERS: the point of this layer is that swapping Firebase for
 * Supabase changes nothing above it. A prettier envelope would mean touching
 * every consumer to rename a field, which is the migration cost this whole
 * file exists to avoid paying.
 */
export interface PostPage {
  posts: PostSummary[];
  nextCursor: string | null;
}

export interface CommentPage {
  comments: CommentSummary[];
  nextCursor: string | null;
}

export interface ListPostsInput {
  cursor?: string | null;
  limit?: number;
  /**
   * `PostCategory`, not `string`.
   *
   * A category that is not one of the nine has no Arabic label and no chip, so
   * filtering by one can only ever return nothing. Typing it narrowly turns
   * «the filter silently shows an empty feed» into a compile error at the call
   * site that built the wrong value.
   */
  category?: PostCategory | null;
}

/** The clamps `lib/server/community.ts` already applies, named once. */
export const POSTS_PAGE_DEFAULT = 12;
export const POSTS_PAGE_MAX = 50;
export const COMMENTS_PAGE_DEFAULT = 20;
export const COMMENTS_PAGE_MAX = 100;

/* ── Store ────────────────────────────────────────────────────────────────── */

/** Minor units — cents. Never a float: money in a float disagrees with itself. */
export type Minor = number;

export interface StoreProductSummary {
  id: string;
  nameAr: string;
  nameEn: string | null;
  brand: string | null;
  categoryId: string;
  published: boolean;
  suspendedReasonAr: string | null;
}

export interface StoreVariantSummary {
  id: string;
  productId: string;
  labelAr: string;
  priceMinor: Minor | null;
  currency: string;
  isDefault: boolean;
}

/**
 * An order moves along TWO independent axes, and conflating them loses money.
 *
 * `paymentState` is what the payment provider says. `fulfilmentState` is what
 * the shop has done about it. A paid order can sit unshipped for a week; a
 * cancelled-before-payment order never had a supplier order to cancel. One
 * column cannot say both, and a shop that tries ends up with «cancelled»
 * meaning «refunded» to one screen and «never paid» to another.
 *
 * The existing admin panel already drives the fulfilment axis
 * (`ORDER_STATUS_NEXT` in `@core/data/store/types`); the payment axis is new
 * with Mollie. Both names below are the existing ones, verbatim.
 */
export type PaymentState =
  | 'draft' | 'awaiting_payment' | 'paid' | 'cancelled' | 'expired' | 'refunded' | 'failed';

export type FulfilmentState =
  | 'received' | 'confirmed' | 'ordered-from-supplier' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderSummary {
  id: string;
  reference: string;
  userId: string | null;
  subtotalMinor: Minor;
  shippingMinor: Minor;
  totalMinor: Minor;
  currency: string;
  paymentState: PaymentState;
  fulfilmentState: FulfilmentState;
  createdAt: string | null;
}

/**
 * What a browser is allowed to say about an order it wants.
 *
 * NOTE WHAT IS ABSENT: any price, any total, any shipping cost. The client
 * names products and quantities; the server prices them. That is «الطلب لا
 * يرسل السعر من العميل بوصفه حقيقة» expressed as a TYPE, so sending a total is
 * not a policy violation to be caught later — it is a thing that cannot be
 * written down.
 */
export interface DraftOrderInput {
  items: Array<{ productId: string; variantId: string | null; quantity: number }>;
  shippingRegionId: string | null;
  email: string;
  phone?: string;
  shipTo: Record<string, string>;
  noteAr?: string;
}

/* ── Ports ────────────────────────────────────────────────────────────────── */

export interface AuthPort {
  /** The current session, or null. NEVER throws — every failure is «not signed in». */
  currentUser(): Promise<SessionUser | null>;
  signInWithPassword(email: string, password: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  signUpWithPassword(email: string, password: string, displayName: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  signInWithProvider(provider: 'google', redirectTo: string): Promise<{ ok: true; url?: string } | { ok: false; errorAr: string }>;
  /**
   * Sends the reset email — and reports success for an unregistered address
   * too. «هل هذا البريد مسجَّل؟» answered by a reset form is an enumeration
   * oracle, so the honest UI copy is «أُرسل الرابط إن كان البريد مسجَّلاً».
   */
  resetPassword(email: string, redirectTo: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  signOut(): Promise<void>;
}

/**
 * Everything a browser may READ with the publishable key.
 *
 * NOTHING HERE THROWS. Every method returns an empty result when the backend
 * is unreachable or unconfigured, for the reason `lib/server/community.ts`
 * documents at length: an exception out of a data read reached production once
 * as a twenty-one byte `Internal Server Error`, with no error boundary and no
 * clue which pillar had failed. An empty page renders the «غير متصل» state; a
 * throw renders nothing at all.
 */
export interface ReadPort {
  listPosts(input: ListPostsInput): Promise<PostPage>;
  getPost(postId: string): Promise<PostSummary | null>;
  listComments(postId: string, input?: { cursor?: string | null; limit?: number }): Promise<CommentPage>;
  listPublishedProducts(): Promise<StoreProductSummary[]>;
  listVariants(productId: string): Promise<StoreVariantSummary[]>;
  /** Only the caller's own; RLS makes that mechanical rather than a filter here. */
  myOrders(): Promise<OrderSummary[]>;
  projectOverrides(): Promise<Record<string, { published?: boolean; patch: Record<string, unknown> }>>;
}

/** Everything a browser may CHANGE, as itself. */
export interface WritePort {
  /**
   * `id` may be supplied by the caller, and that is not a courtesy — it is how
   * media works at all. The storage policies accept an upload only under
   * `{uid}/{postId}/…`, so the id must exist BEFORE the first byte moves, and
   * the row is inserted after the upload succeeds. An id is the caller's own
   * post either way; uniqueness is the primary key's problem.
   */
  createPost(input: { id?: string; text: string; category?: PostCategory | null; media?: { type: MediaKind; url: string; thumbnailURL?: string; width?: number; height?: number; duration?: number } }): Promise<{ ok: true; id: string } | { ok: false; errorAr: string }>;
  editPost(postId: string, text: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  /** Soft delete. There is no hard delete anywhere in this interface. */
  deleteOwnPost(postId: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  createComment(postId: string, text: string): Promise<{ ok: true; id: string } | { ok: false; errorAr: string }>;
  deleteOwnComment(commentId: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  togglePostLike(postId: string): Promise<{ ok: true; liked: boolean } | { ok: false; errorAr: string }>;
  report(input: { targetType: 'post' | 'comment' | 'user'; targetId: string; reason: string; detail?: string }): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  updateOwnProfile(input: { displayName?: string; photoURL?: string; bio?: string }): Promise<{ ok: true } | { ok: false; errorAr: string }>;
}

/**
 * The privileged half. Server only, secret key, never a browser.
 *
 * Every method here is a thing RLS refuses to a client on purpose: money,
 * roles, the audit log, supplier cost. They are gathered in one object so the
 * boundary is visible in an import statement rather than in a policy file
 * somebody has to go and read.
 */
export interface AdminPort {
  /** Prices the basket from the catalogue. The client's numbers are ignored. */
  createOrder(draft: DraftOrderInput, userId: string | null): Promise<{ ok: true; order: OrderSummary } | { ok: false; errorAr: string }>;
  /** The payment axis. Moved by the provider webhook, never by a person. */
  setPaymentState(orderId: string, state: PaymentState, actorId: string | null): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  /** The fulfilment axis. Forward-only — `ORDER_STATUS_NEXT` is the authority. */
  setFulfilmentState(orderId: string, state: FulfilmentState, actorId: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  setUserRole(userId: string, role: PlatformRole, actorId: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  setUserStatus(userId: string, status: AccountStatus, actorId: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  moderateContent(input: { kind: 'post' | 'comment'; id: string; status: ContentStatus; actorId: string; reasonAr?: string }): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  /**
   * Supplier, cost and margin. The one read that must never reach a browser.
   *
   * Margin is here rather than in `ReadPort` because price ÷ margin = cost:
   * publishing the margin publishes what the shop pays, so the two cannot be
   * split into a public half and a private one.
   */
  supplyFor(productId: string): Promise<SupplyRecord | null>;
  appendAudit(entry: { actorId: string | null; action: string; targetType: string; targetId?: string; summary?: string; metadata?: Record<string, unknown> }): Promise<void>;
  listReports(state?: 'open' | 'reviewing' | 'resolved' | 'dismissed'): Promise<Array<{ id: string; targetType: string; targetId: string; reason: string; state: string; createdAt: string | null }>>;
}

/** Never spread into a client response. Its existence in `AdminPort` is the rule. */
export interface SupplyRecord {
  productId: string;
  variantId: string | null;
  supplierName: string | null;
  supplierUrl: string | null;
  costMinor: Minor | null;
  currency: string;
  marginPct: number | null;
  moq: number | null;
  leadTimeDays: number | null;
  updatedAt: string | null;
}

/* ── Storage ──────────────────────────────────────────────────────────────── */

/**
 * The four buckets, named once.
 *
 * These strings are the primary keys in `supabase/migrations/0003_storage.sql`
 * and appear in every policy in that file. A typo here is a silent upload
 * failure at runtime, so `scripts/testBackendAdapter.ts` reads the migration
 * and asserts the two lists are the same set.
 */
export const BUCKETS = ['avatars', 'community-media', 'store-products', 'project-images'] as const;
export type BucketName = (typeof BUCKETS)[number];

export interface UploadInput {
  bucket: BucketName;
  /**
   * Path WITHIN the bucket.
   *
   * The policies decide whether it is yours — `storage_path_is_own()` compares
   * the first segment to `auth.uid()`. The helper below builds a conforming
   * path, but building it correctly is a convenience, not the check: a client
   * chooses its own path, so a check on the client is a suggestion.
   */
  path: string;
  file: Blob | ArrayBuffer;
  contentType: string;
}

export interface StoragePort {
  upload(input: UploadInput): Promise<{ ok: true; url: string } | { ok: false; errorAr: string }>;
  remove(bucket: BucketName, path: string): Promise<{ ok: true } | { ok: false; errorAr: string }>;
  publicUrl(bucket: BucketName, path: string): string;
}

/**
 * A path the storage policies will accept: `{uid}/…` with one dot in the file
 * name and no traversal.
 *
 * `storage_name_is_safe()` in `0003` rejects `..`, a leading slash, a doubled
 * slash, a backslash, a control character, and more than one dot in the final
 * segment. Those are all rules about a string, so the string is built here
 * once instead of concatenated at each call site — the caller that forgets is
 * the caller whose upload fails in production with a policy error nobody can
 * read.
 *
 * It is a convenience and NOT the enforcement: the database re-checks every
 * one of these conditions, because a path arrives from a browser.
 */
export function ownedPath(uid: string, parts: string[], fileName: string): string {
  const clean = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '-').replace(/-+/g, '-');
  const dot = fileName.lastIndexOf('.');
  const stem = clean(dot > 0 ? fileName.slice(0, dot) : fileName).slice(0, 64) || 'file';
  const ext = clean(dot > 0 ? fileName.slice(dot + 1) : '').toLowerCase().slice(0, 8) || 'bin';
  return [uid, ...parts.map(clean).filter(Boolean), `${stem}.${ext}`].join('/');
}

export interface RealtimePort {
  /** Returns an unsubscribe function. Never a channel object — that is an SDK type. */
  onPostsChanged(handler: (event: { kind: 'insert' | 'update' | 'delete'; postId: string }) => void): () => void;
  onCommentsChanged(postId: string, handler: (event: { kind: 'insert' | 'update' | 'delete'; commentId: string }) => void): () => void;
}

/** What a page or component is handed. Note there is no `AdminPort` here. */
export interface Backend {
  auth: AuthPort;
  read: ReadPort;
  write: WritePort;
  storage: StoragePort;
  realtime: RealtimePort;
}
