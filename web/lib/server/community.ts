import 'server-only';

import { Timestamp } from 'firebase-admin/firestore';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
// Pure cursor logic lives outside this server-only module so it can be tested
// directly — see lib/cursor.ts for why that split exists.
import { encodeCursor, decodeCursor } from '../cursor';
import type { PostCategory } from '@core/community/types';

/**
 * Reading the community, server-side.
 *
 * WHY READS ARE SERVER-SIDE AND WRITES ARE NOT
 * --------------------------------------------
 * This is the central architectural decision of the community batch, and it is
 * deliberately asymmetric:
 *
 *   READS  go through the Admin SDK here, so a post page is server-rendered
 *          real HTML — shareable, indexable, and fast on a cold visit. The
 *          Admin SDK bypasses Firestore rules, so every query below restates
 *          the rule's own condition (`status == 'active'`) EXPLICITLY. That
 *          mirroring is the risk this file carries, and it is why
 *          `scripts/testWebCommunity.ts` asserts that every query in this file
 *          filters on status.
 *
 *   WRITES stay in the browser on the client SDK, so Firestore rules are the
 *          thing that authorises them — the same rules the phone app has been
 *          audited against, with 234 emulator assertions behind them. Routing
 *          writes through a server endpoint would mean re-implementing
 *          ownership checks in TypeScript and having TWO authorities on who may
 *          edit a post. There must be one.
 *
 * The result: no parallel collection, no second permission model, and the phone
 * app's rules remain the single enforcement point for every mutation.
 *
 * ORDERING AND THE CURSOR
 * -----------------------
 * `createdAt desc, __name__ desc`. The document id is a tiebreaker, not
 * decoration: two posts created in the same millisecond — entirely possible
 * under load, and guaranteed under a seeding script — produce an ambiguous sort
 * on `createdAt` alone, and an ambiguous sort is exactly what makes a cursor
 * skip a document or serve it twice. Paginating on the composite makes the
 * order total, so the cursor is stable.
 *
 * The cursor is the last document's (createdAt, id) rather than an offset.
 * Offsets shift when a new post is created mid-browse, which is precisely the
 * "duplicate or lost post" failure the requirement named.
 */

/** What a list row needs. Deliberately not the whole document. */
export interface PostSummary {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  category: PostCategory | null;
  mediaType: 'none' | 'image' | 'video';
  mediaURL: string | null;
  thumbnailURL: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  // Video only. Absent on every image and text post, and on every post written
  // before video existed — so `null` means "not a video or not recorded", never
  // "zero seconds".
  mediaDuration: number | null;
  commentsCount: number;
  likesCount: number;
  /** ISO string — a Firestore Timestamp cannot cross the server/client boundary. */
  createdAt: string | null;
  editedAt: string | null;
  status: 'active' | 'hidden' | 'deleted';
}

export interface CommentSummary {
  id: string;
  authorId: string;
  authorName: string;
  authorPhoto: string | null;
  text: string;
  createdAt: string | null;
  likesCount: number;
  status: 'active' | 'hidden' | 'deleted';
}

/** Firestore Timestamp → ISO, tolerating documents written before a field existed. */
function toIso(v: unknown): string | null {
  if (v && typeof v === 'object' && 'toDate' in (v as object)) {
    try { return (v as { toDate(): Date }).toDate().toISOString(); } catch { return null; }
  }
  return null;
}

function toPostSummary(id: string, d: FirebaseFirestore.DocumentData): PostSummary {
  return {
    id,
    authorId: typeof d.authorId === 'string' ? d.authorId : '',
    authorName: typeof d.authorName === 'string' ? d.authorName : 'طيّار',
    authorPhoto: typeof d.authorPhoto === 'string' ? d.authorPhoto : null,
    text: typeof d.text === 'string' ? d.text : '',
    category: typeof d.category === 'string' ? (d.category as PostCategory) : null,
    mediaType: d.mediaType === 'image' || d.mediaType === 'video' ? d.mediaType : 'none',
    mediaURL: typeof d.mediaURL === 'string' ? d.mediaURL : null,
    thumbnailURL: typeof d.thumbnailURL === 'string' ? d.thumbnailURL : null,
    mediaWidth: typeof d.mediaWidth === 'number' ? d.mediaWidth : null,
    mediaHeight: typeof d.mediaHeight === 'number' ? d.mediaHeight : null,
    mediaDuration: typeof d.mediaDuration === 'number' ? d.mediaDuration : null,
    // `?? 0` everywhere: these fields were added over time, and a post written
    // before one existed must render rather than show NaN.
    commentsCount: typeof d.commentsCount === 'number' ? d.commentsCount : 0,
    likesCount: typeof d.likesCount === 'number' ? d.likesCount : 0,
    createdAt: toIso(d.createdAt),
    editedAt: toIso(d.editedAt),
    status: d.status === 'hidden' || d.status === 'deleted' ? d.status : 'active',
  };
}

export type { PageCursor } from '../cursor';

export interface PostPage {
  posts: PostSummary[];
  nextCursor: string | null;
}

/**
 * One page of the public feed.
 *
 * `status == 'active'` is not optional and not a UI preference — it is this
 * file restating the Firestore read rule, because the Admin SDK does not apply
 * it. Removing it would publish moderator-hidden and author-deleted posts.
 */
export async function listPosts(opts: {
  cursor?: string | null;
  limit?: number;
  category?: string | null;
}): Promise<PostPage> {
  if (!isAdminConfigured()) return { posts: [], nextCursor: null };

  const limit = Math.min(Math.max(opts.limit ?? 12, 1), 50);
  const cursor = decodeCursor(opts.cursor);

  let q = adminDb().collection('posts')
    .where('status', '==', 'active')
    .orderBy('createdAt', 'desc')
    .orderBy('__name__', 'desc');

  if (opts.category) q = q.where('category', '==', opts.category) as typeof q;

  if (cursor) {
    q = q.startAfter(
      Timestamp.fromMillis(cursor.createdAtMs),
      cursor.id,
    ) as typeof q;
  }

  // Fetch one extra row to learn whether another page exists, without a second
  // query and without a count that would drift.
  const snap = await q.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;

  const posts = docs.map(d => toPostSummary(d.id, d.data()));
  const last = docs[docs.length - 1];
  const lastCreated = last ? toIso(last.data().createdAt) : null;

  return {
    posts,
    nextCursor: hasMore && last && lastCreated
      ? encodeCursor({ createdAtMs: Date.parse(lastCreated), id: last.id })
      : null,
  };
}

/**
 * One post, or null.
 *
 * Returns null for a hidden or deleted post as well as a missing one. The
 * caller renders a 404 for all three, which is deliberate: distinguishing
 * "removed" from "never existed" tells anyone who saved a link that a specific
 * post was moderated, which is not theirs to know.
 */
export async function getPost(postId: string): Promise<PostSummary | null> {
  if (!isAdminConfigured()) return null;
  if (!postId || postId.length > 128) return null;

  const snap = await adminDb().collection('posts').doc(postId).get();
  if (!snap.exists) return null;

  const post = toPostSummary(snap.id, snap.data()!);
  return post.status === 'active' ? post : null;
}

/**
 * Comments on a post, oldest first.
 *
 * Oldest-first because a comment thread is a conversation and reads in order.
 * The same composite ordering and cursor rules apply as for posts.
 */
export async function listComments(postId: string, opts: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{ comments: CommentSummary[]; nextCursor: string | null }> {
  if (!isAdminConfigured()) return { comments: [], nextCursor: null };

  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const cursor = decodeCursor(opts.cursor);

  let q = adminDb().collection('posts').doc(postId).collection('comments')
    .where('status', '==', 'active')
    .orderBy('createdAt', 'asc')
    .orderBy('__name__', 'asc');

  if (cursor) {
    q = q.startAfter(Timestamp.fromMillis(cursor.createdAtMs), cursor.id) as typeof q;
  }

  const snap = await q.limit(limit + 1).get();
  const docs = snap.docs.slice(0, limit);
  const hasMore = snap.docs.length > limit;

  const comments: CommentSummary[] = docs.map(d => {
    const c = d.data();
    return {
      id: d.id,
      authorId: typeof c.authorId === 'string' ? c.authorId : '',
      authorName: typeof c.authorName === 'string' ? c.authorName : 'طيّار',
      authorPhoto: typeof c.authorPhoto === 'string' ? c.authorPhoto : null,
      text: typeof c.text === 'string' ? c.text : '',
      createdAt: toIso(c.createdAt),
      likesCount: typeof c.likesCount === 'number' ? c.likesCount : 0,
      status: c.status === 'hidden' || c.status === 'deleted' ? c.status : 'active',
    };
  });

  const last = docs[docs.length - 1];
  const lastCreated = last ? toIso(last.data().createdAt) : null;

  return {
    comments,
    nextCursor: hasMore && last && lastCreated
      ? encodeCursor({ createdAtMs: Date.parse(lastCreated), id: last.id })
      : null,
  };
}
