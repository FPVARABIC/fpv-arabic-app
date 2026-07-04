import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { collection, doc, getDocs, orderBy, query, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { savedPostsPath, savedPostPath } from '../utils/firestorePaths';

interface SavedPostIdsContextValue {
  // Ordered (savedAt desc at initial fetch — newly toggled saves append at
  // the end until next reload; accepted V1 simplification, not re-sorted
  // live). JS Sets preserve insertion order, so Array.from(savedIds) is safe.
  savedIds: Set<string>;
  loading: boolean;
  isSaved: (postId: string) => boolean;
  toggleSaved: (postId: string) => Promise<void>;
}

const SavedPostIdsContext = createContext<SavedPostIdsContextValue | undefined>(undefined);

// Fetches the user's saved post IDs ONCE per session (a single small query —
// nobody saves thousands of posts), so PostCard can check membership with a
// local Set lookup instead of a per-card Firestore read. This is distinct
// from SavedPostsScreen's own N+1 (resolving those IDs into full post docs,
// paginated) — that stays exactly as previously approved, unchanged.
export const SavedPostIdsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuthContext();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      setSavedIds(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    getDocs(query(collection(firestoreDb, savedPostsPath(currentUser.uid)), orderBy('savedAt', 'desc')))
      .then(snap => {
        if (cancelled) return;
        setSavedIds(new Set(snap.docs.map(d => d.id)));
      })
      .catch(err => console.error('[useSavedPostIds]', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const isSaved = useCallback((postId: string) => savedIds.has(postId), [savedIds]);

  const toggleSaved = useCallback(
    async (postId: string) => {
      if (!currentUser) return; // callers must login-gate before invoking this
      const ref = doc(firestoreDb, savedPostPath(currentUser.uid, postId));
      if (savedIds.has(postId)) {
        await deleteDoc(ref);
        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await setDoc(ref, { postId, savedAt: serverTimestamp() });
        setSavedIds(prev => new Set(prev).add(postId));
      }
    },
    [currentUser, savedIds],
  );

  return (
    <SavedPostIdsContext.Provider value={{ savedIds, loading, isSaved, toggleSaved }}>
      {children}
    </SavedPostIdsContext.Provider>
  );
};

export const useSavedPostIds = (): SavedPostIdsContextValue => {
  const ctx = useContext(SavedPostIdsContext);
  if (!ctx) throw new Error('useSavedPostIds must be used within SavedPostIdsProvider');
  return ctx;
};
