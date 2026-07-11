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

// Cursor-paginated, never loads the whole collection (D2). Category filter
// re-queries from the start; "loadMore" advances the same category's cursor.
// A passed QueryDocumentSnapshot cursor already gets an implicit document-ID
// tiebreaker from Firestore, so equal createdAt timestamps across posts
// cannot cause a skipped or duplicated page boundary — no secondary orderBy
// is needed.
export const useFeed = (category: FeedCategory): UseFeedResult => {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
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

  const loadPage = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const localRequestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const constraints: QueryConstraint[] = [where('status', '==', 'active')];
      if (category !== 'all') constraints.push(where('category', '==', category));
      constraints.push(orderBy('createdAt', 'desc'));
      const afterCursor = reset ? null : cursorRef.current;
      if (afterCursor) constraints.push(startAfter(afterCursor));
      constraints.push(limit(PAGE_SIZE));

      const snap = await getDocs(query(collection(firestoreDb, POSTS_COLLECTION), ...constraints));
      if (localRequestId !== requestIdRef.current) return;

      const page: PostWithId[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Post) }));
      cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setPosts(prev => (reset ? page : [...prev, ...page]));
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
  }, [category]);

  const refresh = useCallback(() => {
    requestIdRef.current += 1;
    isFetchingRef.current = false;
    cursorRef.current = null;
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
