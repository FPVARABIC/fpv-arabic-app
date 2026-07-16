import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestoreDb, firebaseFunctions } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { commentLikePath } from '../utils/firestorePaths';
import { functionsErrorMessage } from '../utils/functionsError';

export interface UseCommentLikeResult {
  liked: boolean;
  likedLoading: boolean;
  toggling: boolean;
  toggleError: string | null;
  toggleLike: () => void;
}

interface ToggleCommentLikeResponse {
  liked: boolean;
}

// toggleCommentLike (functions/src/index.ts) is the ONLY write path for a
// comment like — firestore.rules denies the client SDK create/update/delete
// on both likes/{uid} and the comment's likesCount entirely, so a like can
// no longer be forged by an isolated ±1 write without a real paired like
// document. desiredState (not a blind toggle) is what makes the call
// genuinely retry-safe: a lost-response retry of the SAME desired state is
// a true no-op, never a double-flip.
const toggleCommentLikeCallable = httpsCallable<
  { postId: string; commentId: string; desiredState: 'like' | 'unlike' },
  ToggleCommentLikeResponse
>(firebaseFunctions, 'toggleCommentLike');

const likeStatusKey = (postId: string, commentId: string, uid: string | null): string =>
  `${postId}/${commentId}/${uid ?? 'guest'}`;

// The current user's own like STATE is a single doc read (their own
// likes/{uid} doc, publicly readable) — never a query over every liker. The
// displayed COUNT comes from the comment's own denormalized likesCount
// field (already part of the CommentWithId the caller already has from
// usePost.ts) — this hook deliberately does not fetch or return a count
// itself, so it can never be tempted into an unbounded "count every liker"
// read.
export const useCommentLike = (postId: string, commentId: string): UseCommentLikeResult => {
  const { currentUser } = useAuthContext();
  const currentUid = currentUser?.uid ?? null;
  const key = likeStatusKey(postId, commentId, currentUid);

  // Keyed by (postId, commentId, uid) so "is a fetch for the CURRENT key
  // still in flight" is a plain derived comparison (result.key !== key)
  // computed during render, not its own piece of state kept in sync with a
  // synchronous setState call inside the effect body. The effect below only
  // ever calls setState from inside the async result — a genuine side
  // effect (network I/O) — never synchronously in the effect body itself,
  // which is what a cleaner implementation of this pattern looks like
  // (avoiding the react-hooks/set-state-in-effect trap the previous version
  // fell into with its synchronous setLiked/setLikedLoading calls).
  const [result, setResult] = useState<{ key: string; liked: boolean }>({ key, liked: false });
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUid) return; // guests have no "own like" — nothing to fetch, nothing to derive from
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestoreDb, commentLikePath(postId, commentId, currentUid)));
        if (cancelled) return;
        setResult({ key, liked: snap.exists() });
      } catch (err) {
        if (cancelled) return;
        console.error('[useCommentLike:status]', err);
        setResult({ key, liked: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, commentId, currentUid, key]);

  const likedLoading = currentUid !== null && result.key !== key;
  const liked = currentUid !== null && result.key === key && result.liked;

  const toggleLike = useCallback(() => {
    if (!currentUid || toggling) return;
    setToggling(true);
    setToggleError(null);
    const wasLiked = liked;
    const desiredState: 'like' | 'unlike' = wasLiked ? 'unlike' : 'like';
    // Optimistic flip — rolled back in the catch block below if the call
    // fails, so a denied/offline request never leaves the UI showing a
    // state the server didn't actually accept.
    setResult({ key, liked: !wasLiked });

    (async () => {
      try {
        const res = await toggleCommentLikeCallable({ postId, commentId, desiredState });
        setResult({ key, liked: res.data.liked });
      } catch (err) {
        console.error('[useCommentLike:toggle]', err);
        setResult({ key, liked: wasLiked }); // rollback the optimistic flip
        setToggleError(functionsErrorMessage(err, 'تعذّر تسجيل الإعجاب. حاول مرة أخرى.'));
      } finally {
        setToggling(false);
      }
    })();
  }, [currentUid, toggling, liked, key, postId, commentId]);

  return { liked, likedLoading, toggling, toggleError, toggleLike };
};
