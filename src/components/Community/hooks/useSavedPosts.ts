import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { postPath } from '../utils/firestorePaths';
import type { Post, PostWithId } from '../types';
import { useSavedPostIds } from './useSavedPostIds';

const PAGE_SIZE = 10;

export interface SavedPostEntry {
  postId: string;
  // null => unavailable: hidden/deleted (Firestore Rules deny read entirely
  // for non-active posts, so a hidden/deleted saved post's getDoc call
  // fails with permission-denied rather than returning its real status —
  // that failure itself is what signals "unavailable" here).
  post: PostWithId | null;
}

interface UseSavedPostsResult {
  entries: SavedPostEntry[];
  loading: boolean;
  hasMore: boolean;
  totalSavedCount: number;
  loadMore: () => void;
  removeFromSaved: (postId: string) => Promise<void>;
}

// Resolves the already-fetched (small, cheap) saved-ID list into full post
// documents, PAGE_SIZE at a time — accepted N+1 pattern for V1 scale (D2).
// Never loads the whole savedPosts subcollection's post CONTENT unbounded;
// the ID list itself is small and fetched once by useSavedPostIds.
export const useSavedPosts = (): UseSavedPostsResult => {
  const { savedIds, toggleSaved } = useSavedPostIds();
  const [entries, setEntries] = useState<SavedPostEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const cursorRef = useRef(0);
  // Guards against re-entrant/concurrent loadPage calls — an unstable
  // loadMore reference re-creating the IntersectionObserver (which fires
  // immediately if the sentinel is already visible) can otherwise trigger
  // overlapping fetches of the same page, appending duplicate entries.
  const isFetchingRef = useRef(false);

  const idsArray = Array.from(savedIds);

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setLoading(true);
      const start = reset ? 0 : cursorRef.current;
      const pageIds = idsArray.slice(start, start + PAGE_SIZE);

      const page: SavedPostEntry[] = await Promise.all(
        pageIds.map(async postId => {
          try {
            const snap = await getDoc(doc(firestoreDb, postPath(postId)));
            const data = snap.exists() ? (snap.data() as Post) : null;
            return { postId, post: data ? { id: postId, ...data } : null };
          } catch {
            // Permission-denied (hidden/deleted) or any other read failure —
            // treat identically as "unavailable", never silently dropped.
            return { postId, post: null };
          }
        }),
      );

      cursorRef.current = start + pageIds.length;
      setEntries(prev => (reset ? page : [...prev, ...page]));
      setLoading(false);
      isFetchingRef.current = false;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [savedIds],
  );

  useEffect(() => {
    cursorRef.current = 0;
    loadPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedIds]);

  const loadMore = useCallback(() => {
    if (!loading && cursorRef.current < idsArray.length) loadPage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, loadPage]);

  const removeFromSaved = useCallback(
    async (postId: string) => {
      await toggleSaved(postId);
      setEntries(prev => prev.filter(e => e.postId !== postId));
    },
    [toggleSaved],
  );

  return {
    entries,
    loading,
    hasMore: cursorRef.current < idsArray.length,
    totalSavedCount: savedIds.size,
    loadMore,
    removeFromSaved,
  };
};
