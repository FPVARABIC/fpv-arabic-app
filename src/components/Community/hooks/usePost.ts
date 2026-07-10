import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { postPath, commentsPath } from '../utils/firestorePaths';
import type { Post, Comment, PostWithId, CommentWithId } from '../types';

// Firestore's FirestoreError.code is the raw backend code string (e.g.
// 'permission-denied'), never prefixed with 'firestore/' — confirmed against
// the installed @firebase/firestore 4.16.0 source. Both forms are handled
// defensively in case a future SDK version changes this.
type CommentsErrorType = 'network' | 'permission' | 'index' | 'unknown';

const classifyCommentsError = (err: unknown): CommentsErrorType => {
  const code = (err as { code?: string } | null)?.code ?? '';
  const bare = code.includes('/') ? code.split('/')[1] : code;
  switch (bare) {
    case 'permission-denied':
    case 'unauthenticated':
      return 'permission';
    case 'failed-precondition':
      return 'index';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'network';
    default:
      return 'unknown';
  }
};

// Only the network case gets a distinct message — permission/index/unknown
// share one safe generic string rather than inventing three near-duplicate
// Arabic strings for a distinction that changes no other user-facing behavior.
const commentsErrorMessage = (type: CommentsErrorType): string =>
  type === 'network'
    ? 'تعذّر تحميل التعليقات، تحقق من الاتصال وحاول مرة أخرى.'
    : 'تعذّر تحميل التعليقات حالياً.';

interface UsePostResult {
  post: PostWithId | null;
  comments: CommentWithId[];
  loading: boolean;
  error: string | null;
  commentsLoading: boolean;
  commentsError: string | null;
  commentsErrorType: CommentsErrorType | null;
  // Comments-only refresh for the currently loaded post — used after
  // CommentInput adds a comment, after CommentsList soft-deletes one, and as
  // the comments-failure retry action. Never reloads or clears the post.
  refresh: () => void;
}

// One-time fetch (re-triggerable via refresh()), not a realtime listener —
// no live-update requirement in the locked spec.
export const usePost = (postId: string): UsePostResult => {
  const [post, setPost] = useState<PostWithId | null>(null);
  const [comments, setComments] = useState<CommentWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentsErrorType, setCommentsErrorType] = useState<CommentsErrorType | null>(null);

  const postRequestIdRef = useRef(0);
  const commentsRequestIdRef = useRef(0);

  // Comments-only loader. Each call captures its own request ID so a stale
  // response (an invalidated retry, a superseded refresh, or a request tied
  // to a post that's no longer current) can never overwrite a newer one.
  // `preserveExisting` is what keeps the already-visible list on screen
  // during a same-post refresh instead of clearing it first.
  const loadComments = useCallback((targetPostId: string, preserveExisting: boolean) => {
    const localId = ++commentsRequestIdRef.current;
    if (!preserveExisting) setComments([]);
    setCommentsLoading(true);
    setCommentsError(null);
    setCommentsErrorType(null);

    (async () => {
      try {
        const commentsSnap = await getDocs(
          query(
            collection(firestoreDb, commentsPath(targetPostId)),
            where('status', '==', 'active'),
            orderBy('createdAt', 'asc'),
          ),
        );
        if (localId !== commentsRequestIdRef.current) return;
        setComments(commentsSnap.docs.map(d => ({ id: d.id, ...(d.data() as Comment) })));
        setCommentsLoading(false);
      } catch (err) {
        if (localId !== commentsRequestIdRef.current) return;
        const type = classifyCommentsError(err);
        setCommentsErrorType(type);
        setCommentsError(commentsErrorMessage(type));
        setCommentsLoading(false);
        console.error('[usePost] comments', err);
      }
    })();
  }, []);

  const refresh = useCallback(() => {
    loadComments(postId, true);
  }, [postId, loadComments]);

  useEffect(() => {
    // Invalidate anything left over from a previous postId (both the post
    // request and any in-flight comments request tied to it) before this
    // cycle's own state reset, so a late-arriving stale write is impossible.
    postRequestIdRef.current += 1;
    commentsRequestIdRef.current += 1;
    const localPostId = postRequestIdRef.current;

    setLoading(true);
    setError(null);
    setPost(null);
    setComments([]);
    setCommentsLoading(false);
    setCommentsError(null);
    setCommentsErrorType(null);

    (async () => {
      try {
        const postSnap = await getDoc(doc(firestoreDb, postPath(postId)));
        if (localPostId !== postRequestIdRef.current) return;

        const postData = postSnap.exists() ? (postSnap.data() as Post) : null;
        if (!postData || postData.status !== 'active') {
          setLoading(false);
          return;
        }

        setPost({ id: postSnap.id, ...postData });
        setLoading(false);
        loadComments(postId, false);
      } catch (err) {
        if (localPostId !== postRequestIdRef.current) return;
        setError('تعذّر تحميل المنشور.');
        setLoading(false);
        console.error('[usePost] post', err);
      }
    })();

    // Unmount invalidates anything still in flight — bumping here is the
    // only way to invalidate a request when no subsequent effect run will
    // ever perform the equivalent bump-at-start.
    return () => {
      postRequestIdRef.current += 1;
      commentsRequestIdRef.current += 1;
    };
  }, [postId, loadComments]);

  return { post, comments, loading, error, commentsLoading, commentsError, commentsErrorType, refresh };
};
