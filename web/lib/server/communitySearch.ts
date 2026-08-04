import 'server-only';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import { tokenizeRaw } from '@core/community/utils/searchTokens';
import { expandToken } from '@core/community/utils/searchSynonyms';
import type { RetrievalResult } from '@core/platform/retrieval';

/**
 * Community results — a SEPARATE channel, on purpose.
 *
 * WHY THIS IS NOT PART OF THE INDEX
 * ---------------------------------
 * Two reasons, and the second is the one that matters.
 *
 * The practical one: posts live in Firestore and change every minute. A static
 * index built at module load could never hold them, and rebuilding one per
 * request would be a second index — precisely what this batch is forbidden to
 * create.
 *
 * The real one: a member's post is not knowledge. It has no review date, no
 * source, and no one checked it. Merging it into the ranked list would make the
 * distinction a matter of which badge a component happened to render, and one
 * refactor later somebody's guess about a voltage rail would be sitting in the
 * same list as a manufacturer's datasheet. Keeping it in its own function,
 * returning its own array, into its own field, means treating a post as
 * documentation requires someone to write code that visibly does that.
 *
 * WHAT IT REUSES
 * --------------
 * The community's own tokenizer and synonym expander — the same two functions
 * that WROTE `searchTokens` onto every post when it was created. Using anything
 * else here would mean queries tokenised one way against tokens stored another,
 * which is a search that quietly misses.
 *
 * WHAT IT WILL NEVER DO
 * ---------------------
 * Rank against official content. It scores posts against each other and nothing
 * else. There is no path by which a post can be compared with an article,
 * because there is no shared scale — and inventing one would be inventing the
 * claim that they are comparable.
 */

/** Firestore caps `array-contains-any` at ten values. Not our choice. */
const MAX_QUERY_TOKENS = 10;
const DEFAULT_LIMIT = 8;

export interface CommunitySearchResult extends RetrievalResult {
  provenance: 'community';
  /** The post's own id, for the destination the caller builds. */
  postId: string;
  authorNameAr: string;
  createdAtMs: number;
  likesCount: number;
  commentsCount: number;
}

/**
 * Posts matching a query, newest first among equals.
 *
 * Returns an empty array — never throws — when the admin SDK is unconfigured or
 * Firestore is unreachable. A search page whose official results rendered fine
 * must not 500 because the community half was slow: the reader gets the
 * knowledge they asked for and a quiet absence where opinions would have been.
 */
export async function searchCommunity(
  rawQuery: string,
  opts: { limit?: number } = {},
): Promise<CommunitySearchResult[]> {
  if (!isAdminConfigured()) return [];

  const tokens = Array.from(new Set(tokenizeRaw(rawQuery).flatMap(expandToken)))
    .slice(0, MAX_QUERY_TOKENS);
  if (tokens.length === 0) return [];

  try {
    const snap = await adminDb()
      .collection('posts')
      .where('status', '==', 'active')
      .where('searchTokens', 'array-contains-any', tokens)
      .orderBy('createdAt', 'desc')
      .limit(opts.limit ?? DEFAULT_LIMIT)
      .get();

    const tokenSet = new Set(tokens);

    return snap.docs.map(doc => {
      const d = doc.data() as Record<string, unknown>;
      const postTokens: string[] = Array.isArray(d.searchTokens) ? d.searchTokens as string[] : [];
      const matched = postTokens.filter(t => tokenSet.has(t));
      const createdAt = d.createdAt as { toMillis?: () => number } | undefined;

      // A post has no title — the model is deliberately a body of text, the way
      // people actually write. So the first line becomes the heading and the
      // rest the summary, rather than inventing a title field the composer
      // never asked anyone to fill in.
      const text = typeof d.text === 'string' ? d.text : '';
      const firstLine = text.split('\n')[0].trim();
      const heading = firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;

      return {
        id: `community-post:${doc.id}`,
        type: 'community-post' as const,
        titleAr: heading || 'منشور بلا نص',
        summaryAr: text.length > firstLine.length ? text.slice(firstLine.length).trim().slice(0, 160) : undefined,
        // The destination is built by the caller from `postId`: a community post
        // is not a `Destination` kind, because the phone and the web reach it
        // through different screens and the resolver models content, not rows.
        destination: null,
        postId: doc.id,
        provenance: 'community' as const,
        // The score orders posts among THEMSELVES. It is deliberately on a
        // different scale from the official ranker's and is never compared with
        // it — the two lists are rendered apart and never merged.
        score: matched.length,
        reasons: [{ kind: 'keyword' as const, terms: matched }],
        matchedTerms: matched,
        authorNameAr: typeof d.authorName === 'string' ? d.authorName : 'عضو',
        createdAtMs: createdAt?.toMillis?.() ?? 0,
        likesCount: typeof d.likesCount === 'number' ? d.likesCount : 0,
        commentsCount: typeof d.commentsCount === 'number' ? d.commentsCount : 0,
      };
    }).sort((a, b) => (b.score - a.score) || (b.createdAtMs - a.createdAtMs));
  } catch {
    // Deliberately swallowed. See the doc comment: the official half of the
    // page is the part that must not fail.
    return [];
  }
}
