// Community feed ranking (Phase 2, approved design sections K/L/M) — pure
// page-assembly logic, deliberately split out of useFeed.ts with NO
// Firebase imports at all, so it's testable in complete isolation (no
// emulator, no import.meta.env, no React) and so useFeed.ts's own Firebase
// coupling never leaks into this file's reasoning.
import type { PostWithId } from '../types';

export const PAGE_SIZE = 10;
export const AUTHOR_DIVERSITY_CAP = 2; // max posts from one authorId per displayed 10-post page
export const CATEGORY_DIVERSITY_CAP = 4; // max posts from one category per displayed 10-post page
// Section K's "guaranteed newest-post slot" target index — near-top, not
// always literally #1 (avoids "the newest, possibly-zero-engagement post
// is always the very first thing shown" feeling).
export const NEWEST_POST_GUARANTEE_SLOT = 5;

const diversityKey = (post: PostWithId, kind: 'author' | 'category'): string =>
  kind === 'author' ? post.authorId : (post.category ?? '__uncategorized__');

// Merge-level dedup (independent review correction, 2026-07-17): a
// carry-over post can be re-matched by the SAME fetch that produced
// freshBatch if its feedScore moved enough to cross back over the frozen
// startAfter cursor boundary — this collision happens BEFORE either copy
// is ever added to the caller's seenIdsRef, so a seenIdsRef check alone
// cannot catch it (neither copy has been displayed yet). When the same
// post id appears in both arrays, the freshBatch copy wins (it reflects
// live field values) and the stale carryOver copy is dropped entirely,
// rather than displaying both.
export function mergeCandidateStream(carryOver: PostWithId[], freshBatch: PostWithId[]): PostWithId[] {
  const freshIds = new Set(freshBatch.map(p => p.id));
  const dedupedCarryOver = carryOver.filter(p => !freshIds.has(p.id));
  return [...dedupedCarryOver, ...freshBatch];
}

// Greedily fills a page of at most PAGE_SIZE posts from `streamPosts`
// (already in score order — carried-over deferrals first, then the
// freshly fetched batch), respecting both diversity caps. Anything skipped
// for exceeding a cap is returned as `deferred`, in original relative
// order, to be retried against a FUTURE window rather than discarded
// outright (Sections L/M).
export function assemblePageWithDiversity(
  streamPosts: PostWithId[],
): { displayed: PostWithId[]; deferred: PostWithId[] } {
  const authorCounts = new Map<string, number>();
  const categoryCounts = new Map<string, number>();
  const displayed: PostWithId[] = [];
  const deferred: PostWithId[] = [];

  for (const post of streamPosts) {
    if (displayed.length >= PAGE_SIZE) {
      deferred.push(post);
      continue;
    }
    const authorKey = diversityKey(post, 'author');
    const categoryKeyValue = diversityKey(post, 'category');
    const authorCount = authorCounts.get(authorKey) ?? 0;
    const categoryCount = categoryCounts.get(categoryKeyValue) ?? 0;
    if (authorCount >= AUTHOR_DIVERSITY_CAP || categoryCount >= CATEGORY_DIVERSITY_CAP) {
      deferred.push(post);
      continue;
    }
    displayed.push(post);
    authorCounts.set(authorKey, authorCount + 1);
    categoryCounts.set(categoryKeyValue, categoryCount + 1);
  }

  return { displayed, deferred };
}

// Section K's guaranteed-slot mechanism. `combinedStream` is the FULL
// candidate stream (carry-over + fresh batch) this page was assembled
// from — the newest post is looked for there first (it may simply have
// been deferred by a diversity cap, in which case it's promoted rather
// than re-fetched) before falling back to the caller-supplied
// `newestCandidate` (a direct, separate query result) if it isn't present
// in this window at all.
export function applyNewestPostGuarantee(
  displayed: PostWithId[],
  combinedStream: PostWithId[],
  newestCandidate: PostWithId | null,
): { displayed: PostWithId[]; evicted: PostWithId | null } {
  if (!newestCandidate) return { displayed, evicted: null };
  if (displayed.some(p => p.id === newestCandidate.id)) return { displayed, evicted: null };
  if (displayed.length === 0) return { displayed, evicted: null };

  const fromStream = combinedStream.find(p => p.id === newestCandidate.id);
  const toInsert = fromStream ?? newestCandidate;

  const nextDisplayed = displayed.slice();
  const evicted = nextDisplayed.pop() ?? null; // lowest-score admitted item, evicted to keep page size fixed
  const insertAt = Math.min(NEWEST_POST_GUARANTEE_SLOT, nextDisplayed.length);
  nextDisplayed.splice(insertAt, 0, toInsert);
  return { displayed: nextDisplayed, evicted };
}
