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
import type { Post, PostWithId } from '../types';

const PAGE_SIZE = 10;

export interface UsePublicProfilePostsResult {
  posts: PostWithId[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMoreError: string | null;
  loadMore: () => void;
  refresh: () => void;
}

// Cursor-paginated posts authored by a single profile (Phase 5). Mirrors
// useFeed.ts's proven request-generation/cursor/error-separation pattern
// exactly, scoped to authorId instead of category — kept as an independent
// hook rather than a shared generic abstraction (the two query shapes differ
// enough that forcing a shared utility would add indirection for a
// two-caller-only benefit).
//
// Lifecycle safety: requestIdRef is invalidated both on profileUid change
// AND on unmount (the effect below returns a cleanup that bumps it), so a
// slow in-flight page-one request from a previous profile or from a
// since-unmounted instance can never write into a newer profile's state.
export const usePublicProfilePosts = (profileUid: string): UsePublicProfilePostsResult => {
  const [posts, setPosts] = useState<PostWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const isFetchingRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(async (reset: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const localRequestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    setLoadMoreError(null);
    try {
      const constraints: QueryConstraint[] = [
        where('authorId', '==', profileUid),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
      ];
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
      console.error('[usePublicProfilePosts]', err);
    } finally {
      if (localRequestId === requestIdRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [profileUid]);

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
    return () => {
      requestIdRef.current += 1;
    };
  }, [profileUid, refresh]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) loadPage(false);
  }, [loading, hasMore, loadPage]);

  return { posts, loading, hasMore, error, loadMoreError, loadMore, refresh };
};
