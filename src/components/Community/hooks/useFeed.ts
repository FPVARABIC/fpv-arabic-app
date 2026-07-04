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

interface UseFeedResult {
  posts: PostWithId[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
}

// Cursor-paginated, never loads the whole collection (D2). Category filter
// re-queries from the start; "loadMore" advances the same category's cursor.
export const useFeed = (category: FeedCategory): UseFeedResult => {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  // Guards against re-entrant/concurrent loadPage calls. loadMore's reference
  // changes on every loading/hasMore update, which re-triggers the
  // IntersectionObserver-creating effect in FeedList — and IntersectionObserver
  // fires its callback immediately if the sentinel is already visible, which
  // otherwise cascades into overlapping fetches of the same page using the
  // same stale cursor, appending duplicate posts (same fix as useSavedPosts.ts).
  const isFetchingRef = useRef(false);

  const loadPage = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const constraints: QueryConstraint[] = [where('status', '==', 'active')];
      if (category !== 'all') constraints.push(where('category', '==', category));
      constraints.push(orderBy('createdAt', 'desc'));
      const afterCursor = reset ? null : cursorRef.current;
      if (afterCursor) constraints.push(startAfter(afterCursor));
      constraints.push(limit(PAGE_SIZE));

      const snap = await getDocs(query(collection(firestoreDb, POSTS_COLLECTION), ...constraints));
      const page: PostWithId[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as Post) }));

      cursorRef.current = snap.docs[snap.docs.length - 1] ?? cursorRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      setPosts(prev => (reset ? page : [...prev, ...page]));
    } catch (err) {
      setError('تعذّر تحميل المنشورات. حاول مرة أخرى.');
      console.error('[useFeed]', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [category]);

  useEffect(() => {
    cursorRef.current = null;
    setHasMore(true);
    loadPage(true);
  }, [category, loadPage]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadPage(false);
  }, [loading, hasMore, loadPage]);

  return { posts, loading, hasMore, error, loadMore };
};
