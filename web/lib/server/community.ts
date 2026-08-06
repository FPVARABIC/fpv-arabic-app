import 'server-only';

import { serverSupabase } from '../backend/supabase/server';
import { makeRead } from '../backend/supabase/client';
import type { PostSummary as PortPostSummary, CommentSummary } from '../backend/ports';
import type { PostCategory } from '@core/community/types';

/**
 * Reading the community, server-side — now through the adapter.
 *
 * THE ASYMMETRY THAT DEFINED THIS FILE IS GONE, AND THAT IS THE NEWS
 * ------------------------------------------------------------------
 * The Firebase version read through the Admin SDK, which BYPASSES the rules —
 * so every query here had to restate `status == 'active'` by hand, a test
 * existed solely to check the restatements were present, and forgetting one
 * would have published moderator-hidden posts.
 *
 * The Supabase server client carries the VISITOR'S OWN session and the
 * publishable key, so `posts_read_active` applies to these reads exactly as
 * it applies to a browser. There is nothing to restate and nothing to forget;
 * that entire category of bug no longer compiles into existence. The pages
 * still get server-rendered HTML — shareable, indexable, fast on a cold
 * visit — which was the reason reads were server-side in the first place.
 *
 * THE CONTRACTS ARE UNCHANGED
 * ---------------------------
 * `PostSummary`, `CommentSummary`, `{ posts, nextCursor }`,
 * `{ comments, nextCursor }` — same names, same shapes, same cursor
 * behaviour, same «never throws» posture. The pages that consume them did not
 * change, which was the point of building the adapter before touching them.
 */

/** What a list row needs. Deliberately not the whole document. */
export interface PostSummary extends Omit<PortPostSummary, 'category'> {
  category: PostCategory | null;
}

export type { CommentSummary };
export type { PageCursor } from '../cursor';

export interface PostPage {
  posts: PostSummary[];
  nextCursor: string | null;
}

/**
 * One page of the public feed.
 *
 * No status filter — `posts_read_active` IS the filter, and 74 assertions
 * against a real PostgreSQL are what say so.
 */
export async function listPosts(opts: {
  cursor?: string | null;
  limit?: number;
  category?: string | null;
}): Promise<PostPage> {
  const read = makeRead(await serverSupabase());
  return read.listPosts({
    cursor: opts.cursor,
    limit: opts.limit,
    category: (opts.category ?? null) as PostCategory | null,
  });
}

/**
 * One post, or null.
 *
 * Null for a hidden or deleted post as well as a missing one. The caller
 * renders a 404 for all three, which is deliberate: distinguishing «removed»
 * from «never existed» tells anyone who saved a link that a specific post was
 * moderated, which is not theirs to know.
 */
export async function getPost(postId: string): Promise<PostSummary | null> {
  const read = makeRead(await serverSupabase());
  return read.getPost(postId);
}

/**
 * Comments on a post, oldest first — a comment thread is a conversation and
 * reads in order. Same composite ordering and cursor rules as posts.
 */
export async function listComments(postId: string, opts: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<{ comments: CommentSummary[]; nextCursor: string | null }> {
  const read = makeRead(await serverSupabase());
  return read.listComments(postId, opts);
}
