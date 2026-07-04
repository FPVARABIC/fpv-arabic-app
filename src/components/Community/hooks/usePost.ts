import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { postPath, commentsPath } from '../utils/firestorePaths';
import type { Post, Comment, PostWithId, CommentWithId } from '../types';

interface UsePostResult {
  post: PostWithId | null;
  comments: CommentWithId[];
  loading: boolean;
  error: string | null;
  // Re-fetches post + comments — used after CommentInput adds a new comment,
  // and after own-content soft delete, rather than a realtime listener.
  refresh: () => void;
}

// One-time fetch (re-triggerable via refresh()), not a realtime listener —
// no live-update requirement in the locked spec.
export const usePost = (postId: string): UsePostResult => {
  const [post, setPost] = useState<PostWithId | null>(null);
  const [comments, setComments] = useState<CommentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const postSnap = await getDoc(doc(firestoreDb, postPath(postId)));
        const postData = postSnap.exists() ? (postSnap.data() as Post) : null;

        if (!postData || postData.status !== 'active') {
          if (!cancelled) {
            setPost(null);
            setComments([]);
            setLoading(false);
          }
          return;
        }

        const commentsSnap = await getDocs(
          query(
            collection(firestoreDb, commentsPath(postId)),
            where('status', '==', 'active'),
            orderBy('createdAt', 'asc'),
          ),
        );

        if (cancelled) return;
        setPost({ id: postSnap.id, ...postData });
        setComments(commentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Comment) })));
      } catch (err) {
        if (!cancelled) {
          setError('تعذّر تحميل المنشور.');
          console.error('[usePost]', err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, refreshToken]);

  return { post, comments, loading, error, refresh };
};
