import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
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

const rankedConstraints = (afterCursor: QueryDocumentSnapshot<DocumentData> | null): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'active'),
    orderBy('feedScore', 'desc'),
    orderBy('createdAt', 'desc'),
  ];
  if (afterCursor) constraints.push(startAfter(afterCursor));
  constraints.push(limit(CANDIDATE_PAGE_SIZE));
  return constraints;
};

const chronologicalConstraints = (category: PostCategory, afterCursor: QueryDocumentSnapshot<DocumentData> | null): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'active'),
    where('category', '==', category),
    orderBy('createdAt', 'desc'),
  ];
  if (afterCursor) constraints.push(startAfter(afterCursor));
  constraints.push(limit(PAGE_SIZE));
  return constraints;
};

// A sentinel distinct from any real FeedCategory value ('all' or a
// PostCategory) — used only so the reset-effect below can tell "this is the
// very first run" apart from "category is genuinely still 'all'".
const RESET_SENTINEL = Symbol('feed-reset-sentinel');

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
// REAL-TIME (Phase 10): only the FIRST page (both paths) is live — see the
// `active`-keyed effect below. Every page after that (loadMore) is fetched
// exactly as before: a plain one-shot getDocs, cursor-advanced from wherever
// the live first page currently stands. This deliberately does NOT make the
// whole paginated feed live: a live listener re-fires on every matching
// write, which would otherwise reflow/reorder pages the user has already
// scrolled past (a correctness/UX regression, not an improvement) and would
// let a feedScore mutation retroactively rewrite a diversity assembly whose
// caps are only meant to apply "per displayed 10-post page" at the moment
// it was assembled. See docs/KNOWN_ISSUES.md's existing "feed pagination can
// skip a post" entry for the closely related, already-accepted limitation
// this design deliberately does not attempt to fully solve either.
//
// KNOWN, DISCLOSED LIMITATION (narrower than the one above, introduced by
// going live): the live first-page listener never re-checks its own fresh
// batch against `seenIdsRef` (doing so would incorrectly hide a post that
// simply hasn't changed since the last snapshot — the common, steady-state
// case). It only ever ADDS to `seenIdsRef` (so a later one-shot `loadMore`
// page correctly skips anything already shown live on page 1). In the rare
// case a post's `feedScore` moves enough to jump from an already-loaded
// later page back into live page 1's window mid-session, it can briefly
// appear in both places until the user does a fresh pull-to-refresh. Given
// this app's current stage (a single internal tester, ~2 total posts, no
// realistic multi-page session), this is accepted rather than solved with a
// cross-page reconciliation mechanism nobody asked for.
export const useFeed = (category: FeedCategory, active: boolean): UseFeedResult => {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  // Bumped by refresh() to force the reset-effect below to re-run even when
  // `category` itself hasn't changed (an explicit pull-to-refresh).
  const [refreshTick, setRefreshTick] = useState(0);

  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Ranked-path only: candidates that lost out to a diversity cap on a
  // prior window, carried forward (not discarded) to compete again against
  // the next freshly-fetched window.
  const carryOverRef = useRef<PostWithId[]>([]);
  // Cross-page dedup safeguard (see the KNOWN LIMITATION comment above) —
  // every post id ever displayed in the CURRENT session, across both the
  // live first page and any one-shot later page. Reset on refresh()/category
  // change. Filtering happens before diversity assembly so an already-shown
  // post never consumes a diversity slot it would just be discarded from
  // anyway.
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Guards against re-entrant/concurrent loadMore calls.
  const isFetchingRef = useRef(false);
  // Bumped on every reset (category change or an explicit refresh()) — lets
  // a loadMore request that was already in flight detect it's stale and
  // discard its own result instead of writing the wrong generation's posts
  // into state.
  const requestIdRef = useRef(0);
  // True from the moment loadMore is first called for the current
  // generation onward. Before this point, the live first-page listener owns
  // cursorRef/carryOverRef/hasMore and the ENTIRE `posts` array. Once locked,
  // those become owned by the one-shot loadMore chain (exactly like before
  // this feature existed) and the live listener is only ever allowed to
  // rewrite the FRONT `liveDisplayedCountRef.current` items of `posts` —
  // never anything loadMore has already appended. Locked synchronously at
  // the very start of loadMore's fetch (before the async getDocs call) so
  // there is no window where a live update and an in-flight loadMore could
  // race to set inconsistent cursor/carryOver state.
  const paginationLockedRef = useRef(false);
  const liveDisplayedCountRef = useRef(0);
  // Tracks the `${category}:${refreshTick}` key the reset-effect last reset
  // for — lets that effect tell "category or an explicit refresh changed"
  // (full reset) apart from "only `active` changed" (attach/detach only,
  // preserving already-loaded pages and scroll position).
  const lastResetKeyRef = useRef<string | typeof RESET_SENTINEL>(RESET_SENTINEL);

  const loadRankedPage = useCallback(async (localRequestId: number) => {
    const snap = await getDocs(query(collection(firestoreDb, POSTS_COLLECTION), ...rankedConstraints(cursorRef.current)));
    if (localRequestId !== requestIdRef.current) return;

    const freshBatch = snap.docs.map(toPostWithId);
    const carryOver = carryOverRef.current;
    // mergeCandidateStream resolves a same-call collision between a stale
    // carryOver copy and a freshly re-matched copy of the same post (see
    // its own doc comment in feedDiversity.ts — independent review
    // correction, 2026-07-17). Dedup safeguard against seenIdsRef then
    // catches the separate cross-page case — see the KNOWN LIMITATION
    // comment above.
    const combinedStream = mergeCandidateStream(carryOver, freshBatch).filter(p => !seenIdsRef.current.has(p.id));

    const { displayed, deferred } = assemblePageWithDiversity(combinedStream);

    carryOverRef.current = deferred;
    cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
    for (const p of displayed) seenIdsRef.current.add(p.id);

    setHasMore(snap.docs.length === CANDIDATE_PAGE_SIZE || deferred.length > 0);
    setPosts(prev => [...prev, ...displayed]);
  }, []);

  const loadChronologicalPage = useCallback(async (localRequestId: number) => {
    const snap = await getDocs(
      query(collection(firestoreDb, POSTS_COLLECTION), ...chronologicalConstraints(category as PostCategory, cursorRef.current)),
    );
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
    setPosts(prev => [...prev, ...page]);
  }, [category]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore || isFetchingRef.current) return;
    isFetchingRef.current = true;
    // Lock BEFORE the async fetch starts (not after it resolves) — closes
    // the race window where a live first-page update could otherwise fire
    // mid-flight and rewrite cursorRef/carryOverRef out from under a
    // one-shot fetch that already committed to the pre-lock values.
    paginationLockedRef.current = true;
    const localRequestId = requestIdRef.current;
    setLoadMoreError(null);
    // Reused, dual-purpose flag (unchanged from before this feature): true
    // both while the live first page awaits its initial snapshot AND while
    // a loadMore fetch is in flight — FeedList.tsx's bottom "جارٍ التحميل..."
    // indicator relies on this same shared boolean covering both cases.
    setLoading(true);

    (async () => {
      try {
        if (category === 'all') {
          await loadRankedPage(localRequestId);
        } else {
          await loadChronologicalPage(localRequestId);
        }
      } catch (err) {
        if (localRequestId !== requestIdRef.current) return;
        setLoadMoreError('تعذّر تحميل المزيد من المنشورات.');
        console.error('[useFeed:loadMore]', err);
      } finally {
        if (localRequestId === requestIdRef.current) setLoading(false);
        isFetchingRef.current = false;
      }
    })();
  }, [category, loading, hasMore, loadRankedPage, loadChronologicalPage]);

  const refresh = useCallback(() => {
    setRefreshTick(t => t + 1);
  }, []);

  // Reset (on category change or explicit refresh()) + live first-page
  // attach/detach (on `active` change) — deliberately ONE effect, not two,
  // so a category change and an active-flip can never race each other into
  // attaching two listeners at once. `active`-only changes skip the reset
  // block entirely (see lastResetKeyRef comment above): leaving the feed
  // screen and coming back preserves already-loaded pages and scroll
  // position, only pausing/resuming the live connection itself.
  useEffect(() => {
    const resetKey = `${category}:${refreshTick}`;
    if (lastResetKeyRef.current !== resetKey) {
      lastResetKeyRef.current = resetKey;
      requestIdRef.current += 1;
      isFetchingRef.current = false;
      cursorRef.current = null;
      carryOverRef.current = [];
      seenIdsRef.current = new Set();
      paginationLockedRef.current = false;
      liveDisplayedCountRef.current = 0;
      setPosts([]);
      setHasMore(true);
      setError(null);
      setLoadMoreError(null);
      setLoading(true);
    }

    if (!active) return undefined;

    // `cancelled` (not just the returned unsubscribe) guards against a
    // snapshot callback that was already queued from a PREVIOUS effect run
    // landing after this run's cleanup has fired — onSnapshot's own
    // unsubscribe is synchronous, but a microtask/callback already in
    // flight at the moment of cleanup is not retroactively cancelled by
    // calling it. Safe under rapid category/active changes (fast
    // navigation) for exactly this reason.
    let cancelled = false;

    const q =
      category === 'all'
        ? query(collection(firestoreDb, POSTS_COLLECTION), ...rankedConstraints(null))
        : query(collection(firestoreDb, POSTS_COLLECTION), ...chronologicalConstraints(category as PostCategory, null));

    const unsubscribe = onSnapshot(
      q,
      snap => {
        if (cancelled) return;
        const freshBatch = snap.docs.map(toPostWithId);

        if (category === 'all') {
          // No incoming carryOver here (unlike loadRankedPage's loadMore
          // path) — this call always represents the CURRENT top-of-feed
          // window from scratch, exactly what a "reset" always meant
          // before this feature existed. Deliberately NOT filtered against
          // seenIdsRef — see the KNOWN, DISCLOSED LIMITATION comment above.
          fetchNewestActivePost().then(newestCandidate => {
            if (cancelled) return;
            const { displayed: greedyDisplayed, deferred } = assemblePageWithDiversity(freshBatch);
            const { displayed, evicted } = applyNewestPostGuarantee(greedyDisplayed, freshBatch, newestCandidate);
            const nextCarryOver = evicted ? [evicted, ...deferred] : deferred;

            setPosts(prev =>
              paginationLockedRef.current ? [...displayed, ...prev.slice(liveDisplayedCountRef.current)] : displayed,
            );
            // REPLACE, never accumulate, while unlocked — a burst of writes
            // can make several different posts pass through the live top-N
            // window in succession (each briefly "seen" before being pushed
            // back out by a newer one). Accumulating every id ever
            // transiently seen (an earlier version of this code did
            // `.add()` on every snapshot) meant a post pushed out of the
            // window could never be re-surfaced by loadMore's one-shot
            // fetch, even though it was no longer displayed anywhere —
            // seenIdsRef only needs to reflect what's on page 1 AT THE
            // MOMENT loadMore locks it, not the historical union of every
            // snapshot along the way.
            if (!paginationLockedRef.current) seenIdsRef.current = new Set(displayed.map(p => p.id));
            // The live-prefix length must be tracked on EVERY update, locked
            // or not — it's the splice boundary between the live prefix and
            // the one-shot tail in `posts`, which shifts every time this
            // batch's own size changes, independent of whether cursorRef/
            // carryOverRef/hasMore are still being updated. Freezing this
            // count entirely at lock time (an earlier version of this code)
            // was a real bug: a SECOND post-lock update would then slice
            // `prev` at a stale index, corrupting the boundary.
            liveDisplayedCountRef.current = displayed.length;
            if (!paginationLockedRef.current) {
              cursorRef.current = snap.docs[snap.docs.length - 1] ?? null;
              carryOverRef.current = nextCarryOver;
              setHasMore(snap.docs.length === CANDIDATE_PAGE_SIZE || nextCarryOver.length > 0);
            }
            setLoading(false);
            setError(null);
          }).catch(err => {
            if (cancelled) return;
            setError('تعذّر تحميل المنشورات. حاول مرة أخرى.');
            setLoading(false);
            console.error('[useFeed:live:newestCandidate]', err);
          });
        } else {
          setPosts(prev =>
            paginationLockedRef.current ? [...freshBatch, ...prev.slice(liveDisplayedCountRef.current)] : freshBatch,
          );
          // REPLACE, never accumulate, while unlocked — see the ranked-path
          // comment above for why (a burst of writes can churn several
          // different posts through the live window before this line
          // freezes at lock time).
          if (!paginationLockedRef.current) seenIdsRef.current = new Set(freshBatch.map(p => p.id));
          // See the ranked-path comment above: this must update every time,
          // locked or not — it's the live/one-shot splice boundary, not a
          // pagination-chain value.
          liveDisplayedCountRef.current = freshBatch.length;
          if (!paginationLockedRef.current) {
            cursorRef.current = snap.docs[snap.docs.length - 1] ?? null;
            setHasMore(snap.docs.length === PAGE_SIZE);
          }
          setLoading(false);
          setError(null);
        }
      },
      err => {
        if (cancelled) return;
        setError('تعذّر تحميل المنشورات. حاول مرة أخرى.');
        setLoading(false);
        console.error('[useFeed:live]', err);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [category, active, refreshTick]);

  return { posts, loading, hasMore, error, loadMoreError, loadMore, refresh };
};
