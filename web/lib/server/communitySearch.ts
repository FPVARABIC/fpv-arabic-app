import 'server-only';

import { serverSupabase } from '../backend/supabase/server';
import { tokenizeRaw } from '@core/community/utils/searchTokens';
import { expandToken } from '@core/community/utils/searchSynonyms';
import type { RetrievalResult } from '@core/platform/retrieval';

/**
 * Community results — a SEPARATE channel, on purpose.
 *
 * WHY THIS IS NOT PART OF THE INDEX
 * ---------------------------------
 * A member's post is not knowledge. It has no review date, no source, and no
 * one checked it. Merging it into the ranked list would make the distinction
 * a matter of which badge a component happened to render — one refactor later
 * somebody's guess about a voltage rail sits beside a manufacturer's
 * datasheet. Keeping it in its own function, returning its own array, into
 * its own field, means treating a post as documentation requires someone to
 * write code that visibly does that.
 *
 * WHAT IT REUSES
 * --------------
 * The community's own tokenizer and synonym expander — the same two functions
 * that WROTE `search_tokens` onto every post when it was created (`0006`, and
 * the write adapter). Using anything else here would mean queries tokenised
 * one way against tokens stored another, which is a search that quietly
 * misses. This is also why the column is queried with an array overlap rather
 * than PostgreSQL full-text search: `to_tsvector` normalises Arabic
 * differently from the shared tokenizer, and the shared tokenizer was there
 * first, on both surfaces.
 *
 * WHAT CHANGED WITH THE MIGRATION
 * -------------------------------
 * The Firestore version was capped at ten tokens by `array-contains-any`;
 * PostgreSQL's `&&` has no such limit, but the cap is KEPT — a query's tail
 * tokens add noise faster than recall, and keeping the number keeps the two
 * surfaces' behaviour comparable. Status filtering moved from an explicit
 * `where` into `posts_read_active`, where it cannot be forgotten.
 */

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
 * Posts matching a query, most-matched first, newest first among equals.
 *
 * Returns an empty array — never throws — when Supabase is unconfigured or
 * unreachable. A search page whose official results rendered fine must not
 * 500 because the community half was slow: the reader gets the knowledge they
 * asked for and a quiet absence where opinions would have been.
 */
export async function searchCommunity(
  rawQuery: string,
  opts: { limit?: number } = {},
): Promise<CommunitySearchResult[]> {
  const sb = await serverSupabase();
  if (!sb) return [];

  const tokens = Array.from(new Set(tokenizeRaw(rawQuery).flatMap(expandToken)))
    .slice(0, MAX_QUERY_TOKENS);
  if (tokens.length === 0) return [];

  try {
    const { data, error } = await sb
      .from('posts')
      .select('id, text, author_name, created_at, likes_count, comments_count, search_tokens')
      .overlaps('search_tokens', tokens)
      .order('created_at', { ascending: false })
      .limit(opts.limit ?? DEFAULT_LIMIT);

    if (error || !data) return [];

    const tokenSet = new Set(tokens);

    return data.map(d => {
      const postTokens: string[] = Array.isArray(d.search_tokens) ? d.search_tokens : [];
      const matched = postTokens.filter(t => tokenSet.has(t));

      // A post has no title — the model is deliberately a body of text, the
      // way people actually write. So the first line becomes the heading and
      // the rest the summary, rather than inventing a title field the
      // composer never asked anyone to fill in.
      const text = typeof d.text === 'string' ? d.text : '';
      const firstLine = text.split('\n')[0].trim();
      const heading = firstLine.length > 90 ? `${firstLine.slice(0, 90)}…` : firstLine;
      const createdAtMs = typeof d.created_at === 'string' ? Date.parse(d.created_at) : 0;

      return {
        id: `community-post:${d.id}`,
        type: 'community-post' as const,
        titleAr: heading || 'منشور بلا نص',
        summaryAr: text.length > firstLine.length ? text.slice(firstLine.length).trim().slice(0, 160) : undefined,
        // The destination is built by the caller from `postId`: a community
        // post is not a `Destination` kind, because the phone and the web
        // reach it through different screens and the resolver models content,
        // not rows.
        destination: null,
        postId: String(d.id),
        provenance: 'community' as const,
        // The score orders posts among THEMSELVES. It is deliberately on a
        // different scale from the official ranker's and is never compared
        // with it — the two lists are rendered apart and never merged.
        score: matched.length,
        reasons: [{ kind: 'keyword' as const, terms: matched }],
        matchedTerms: matched,
        authorNameAr: typeof d.author_name === 'string' ? d.author_name : 'عضو',
        createdAtMs: Number.isFinite(createdAtMs) ? createdAtMs : 0,
        likesCount: typeof d.likes_count === 'number' ? d.likes_count : 0,
        commentsCount: typeof d.comments_count === 'number' ? d.comments_count : 0,
      };
    }).sort((a, b) => (b.score - a.score) || (b.createdAtMs - a.createdAtMs));
  } catch {
    // Deliberately swallowed. See the doc comment: the official half of the
    // page is the part that must not fail.
    return [];
  }
}
