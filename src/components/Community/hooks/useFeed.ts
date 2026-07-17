import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { POSTS_COLLECTION } from '../utils/firestorePaths';
import type { Post, PostWithId, PostCategory } from '../types';
import { assemblePageWithDiversity, applyNewestPostGuarantee, mergeCandidateStream } from '../utils/feedDiversity';

const PAGE_SIZE = 10;

export type FeedCategory = PostCategory | 'all';

export interface UseFeedResult {
  posts: PostWithId[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  loadMore: () => void;
  refresh: () => void;
}

// Feed ranking (Phase 2, approved design sections F-M/T) — applies ONLY to
// the unfiltered "all" view. A category filter is an explicit request to
// see ONLY that category, undiluted by ranking/diversity mixing (Section
// M) — that path (below) is untouched from the original pure
// createdAt-desc implementation. The diversity/newest-post-guarantee
// algorithm itself lives in utils/feedDiversity.ts (a Firebase-free pure
// module), so it stays unit-testable without pulling in lib/firebase.ts's
// import.meta.env dependency at all.
const CANDIDATE_PAGE_SIZE = 30; // 3x PAGE_SIZE, approved in Phase 2 (not the 20-candidate alternative)

const toPostWithId = (d: QueryDocumentSnapshot<DocumentData>): PostWithId => ({ id: d.id, ...(d.data() as Post) });

async function fetchNewestActivePost(): Promise<PostWithId | null> {
  const snap = await getDocs(
    query(collection(firestoreDb, POSTS_COLLECTION), where('status', '==', 'active'), orderBy('createdAt', 'desc'), limit(1)),
  );
  return snap.docs.length > 0 ? toPostWithId(snap.docs[0]) : null;
}

// Cursor-paginated, never loads the whole collection (D2). Category filter
// re-queries from the start; "loadMore" advances the same category's cursor.
// A passed QueryDocumentSnapshot cursor already gets an implicit document-ID
// tiebreaker from Firestore, so equal createdAt timestamps across posts
// cannot cause a skipped or duplicated page boundary — no secondary orderBy
// is needed for the category-filtered path.
//
// The unfiltered "all" path (Phase 2) instead orders by feedScore desc with
// createdAt desc as an EXPLICIT, required tiebreaker (not optional) — many
// posts legitimately share an identical feedScore (every fresh post starts
// at exactly 100; every fully-aged post settles at the same decay floor),
// so pagination determinism depends on that second sort key.
//
// KNOWN LIMITATION (documented, not fixed — see docs/KNOWN_ISSUES.md and
// docs/PRE_LAUNCH_CHECKLIST.md): `cursorRef`/`startAfter` use the feedScore
// value FROZEN inside the fetched QueryDocumentSnapshot at fetch time, not
// a live re-read. If a post's feedScore changes (a scheduled recompute, or
// a like/comment landing) WHILE a user's feed session is open across
// several page fetches, two things can happen: (1) a post that scores
// higher AFTER being skipped past by the cursor may never surface in that
// session at all until a full refresh(); (2) in principle, a post held in
// `carryOverRef` (deferred by a diversity cap) could also be independently
// re-matched by a LATER fresh query if its score changed enough to fall
// into that later query's range. `seenIdsRef` below closes (2) — the
// actual duplicate-rendering risk — by never displaying the same post id
// twice within one session, regardless of why it reappeared. It does NOT
// close (1): a post that becomes newly eligible only surfaces on a fresh
// pull-to-refresh, not mid-scroll. Accepted for the current stage: single
// internal tester, ~2 total posts, no realistic multi-page session yet — a
// full pagination-mutation E2E test is deferred to the pre-public-launch
// checklist, not built as part of this phase.
export const useFeed = (category: FeedCategory): UseFeedResult => {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Ranked-path only: candidates that lost out to a diversity cap on a
  // prior window, carried forward (not discarded) to compete again against
  // the next freshly-fetched window.
  const carryOverRef = useRef<PostWithId[]>([]);
  // Cross-page dedup safeguard (see the KNOWN LIMITATION comment above) —
  // every post id ever displayed in the CURRENT session, across both the
  // ranked and chronological paths. Reset on refresh()/category change.
  // Filtering happens before diversity assembly so an already-shown post
  // never consumes a diversity slot it would just be discarded from anyway.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Guards against re-entrant/concurrent loadPage calls within the same
  // category generation (see requestIdRef below for cross-category safety).
  // loadMore's reference changes on every loading/hasMore update, which
  // re-triggers the IntersectionObserver-creating effect in FeedList — and
  // IntersectionObserver fires its callback immediately if the sentinel is
  // already visible, which otherwise cascades into overlapping fetches of
  // the same page using the same stale cursor (same fix as useSavedPosts.ts).
  const isFetchingRef = useRef(false);
  // Bumped on every reset (category change or an explicit refresh()) — lets
  // a request that was already in flight detect it's stale and discard its
  // own result instead of writing the wrong generation's posts into state.
  const requestIdRef = useRef(0);

  const loadRankedPage = useCallback(async (reset: boolean, localRequestId: number) => {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'active'),
      orderBy('feedScore', 'desc'),
      orderBy('createdAt', 'desc'),
    ];
    const afterCursor = reset ? null : cursorRef.current;
    if (afterCursor) constraints.push(startAfter(afterCursor));
    constraints.push(limit(CANDIDATE_PAGE_SIZE));

    const [snap, newestCandidate] = await Promise.all([
      getDocs(query(collection(firestoreDb, POSTS_COLLECTION), ...constraints)),
      reset ? fetchNewestActivePost() : Promise.resolve(null),
    ]);
    if (localRequestId !== requestIdRef.current) return;

    const freshBatch = snap.docs.map(toPostWithId);
    const carryOver = reset ? [] : carryOverRef.current;
    // mergeCandidateStream resolves a same-call collision between a stale
    // carryOver copy and a freshly re-matched copy of the same post (see
    // its own doc comment in feedDiversity.ts — independent review
    // correction, 2026-07-17). Dedup safeguard against seenIdsRef then
    // catches the separate cross-page case — see the KNOWN LIMITATION
    // comment above.
    const combinedStream = mergeCandidateStream(carryOver, freshBatch).filter(p => !seenIdsRef.current.has(p.id));

    const { displayed: greedyDisplayed, deferred } = assemblePageWithDiversity(combinedStream);
    const { displayed, evicted } = applyNewestPostGuarantee(greedyDisplayed, combinedStream, newestCandidate);

    const nextCarryOver = evicted ? [evicted, ...deferred] : deferred;
    carryOverRef.current = nextCarryOver;
    cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
    for (const p of displayed) seenIdsRef.current.add(p.id);

    setHasMore(snap.docs.length === CANDIDATE_PAGE_SIZE || nextCarryOver.length > 0);
    setPosts(prev => (reset ? displayed : [...prev, ...displayed]));
  }, []);

  const loadChronologicalPage = useCallback(async (reset: boolean, localRequestId: number) => {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'active'),
      where('category', '==', category as PostCategory),
      orderBy('createdAt', 'desc'),
    ];
    const afterCursor = reset ? null : cursorRef.current;
    if (afterCursor) constraints.push(startAfter(afterCursor));
    constraints.push(limit(PAGE_SIZE));

    const snap = await getDocs(query(collection(firestoreDb, POSTS_COLLECTION), ...constraints));
    if (localRequestId !== requestIdRef.current) return;

    // Dedup safeguard (defense-in-depth): this path's single-field
    // createdAt cursor doesn't share the ranked path's feedScore-mutation
    // risk (createdAt never changes after creation), but the same
    // seenIdsRef is applied here too for one consistent guarantee across
    // both paths, at effectively zero cost.
    const page = snap.docs.map(toPostWithId).filter(p => !seenIdsRef.current.has(p.id));
    cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
    for (const p of page) seenIdsRef.current.add(p.id);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setPosts(prev => (reset ? page : [...prev, ...page]));
  }, [category]);

  const loadPage = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const localRequestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      if (category === 'all') {
        await loadRankedPage(reset, localRequestId);
      } else {
        await loadChronologicalPage(reset, localRequestId);
      }
    } catch (err) {
      if (localRequestId !== requestIdRef.current) return;
      if (reset) {
        setError('تعذّر تحميل المنشورات. حاول مرة أخرى.');
      } else {
        setLoadMoreError('تعذّر تحميل المزيد من المنشورات.');
      }
      console.error('[useFeed]', err);
    } finally {
      if (localRequestId === requestIdRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [category, loadRankedPage, loadChronologicalPage]);

  const refresh = useCallback(() => {
    requestIdRef.current += 1;
    isFetchingRef.current = false;
    cursorRef.current = null;
    carryOverRef.current = [];
    seenIdsRef.current = new Set();
    setPosts([]);
    setHasMore(true);
    setError(null);
    setLoadMoreError(null);
    loadPage(true);
  }, [loadPage]);

  useEffect(() => {
    refresh();
  }, [category, refresh]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadPage(false);
  }, [loading, hasMore, loadPage]);

  return { posts, loading, hasMore, error, loadMoreError, loadMore, refresh };
};
