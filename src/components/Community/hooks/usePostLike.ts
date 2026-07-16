import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { firestoreDb, firebaseFunctions } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { postLikePath } from '../utils/firestorePaths';
import { functionsErrorMessage } from '../utils/functionsError';

export interface UsePostLikeResult {
  liked: boolean;
  likedLoading: boolean;
  toggling: boolean;
  toggleError: string | null;
  toggleLike: () => void;
}

interface TogglePostLikeResponse {
  liked: boolean;
}

// togglePostLike (functions/src/index.ts) is the ONLY write path for a post
// like — firestore.rules denies the client SDK create/update/delete on both
// likes/{uid} and the post's likesCount entirely. Same shape and same
// retry-safety guarantee as useCommentLike.ts (desiredState, not a blind
// toggle) — kept as its own hook rather than a shared generic because the
// two target genuinely different documents/collections and Function names;
// a forced abstraction here would only obscure which callable a given
// component is actually invoking.
const togglePostLikeCallable = httpsCallable<
  { postId: string; desiredState: 'like' | 'unlike' },
  TogglePostLikeResponse
>(firebaseFunctions, 'togglePostLike');

const likeStatusKey = (postId: string, uid: string | null): string => `${postId}/${uid ?? 'guest'}`;

// The current user's own like STATE is a single doc read (their own
// likes/{uid} doc, publicly readable) — never a query over every liker. The
// displayed COUNT comes from the post's own denormalized likesCount field
// (already part of the PostWithId the caller already has) — this hook
// deliberately does not fetch or return a count itself.
export const usePostLike = (postId: string): UsePostLikeResult => {
  const { currentUser } = useAuthContext();
  const currentUid = currentUser?.uid ?? null;
  const key = likeStatusKey(postId, currentUid);

  const [result, setResult] = useState<{ key: string; liked: boolean }>({ key, liked: false });
  const [toggling, setToggling] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUid) return; // guests have no "own like" — nothing to fetch, nothing to derive from
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(firestoreDb, postLikePath(postId, currentUid)));
        if (cancelled) return;
        setResult({ key, liked: snap.exists() });
      } catch (err) {
        if (cancelled) return;
        console.error('[usePostLike:status]', err);
        setResult({ key, liked: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [postId, currentUid, key]);

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
        const res = await togglePostLikeCallable({ postId, desiredState });
        setResult({ key, liked: res.data.liked });
      } catch (err) {
        console.error('[usePostLike:toggle]', err);
        setResult({ key, liked: wasLiked }); // rollback the optimistic flip
        setToggleError(functionsErrorMessage(err, 'تعذّر تسجيل الإعجاب. حاول مرة أخرى.'));
      } finally {
        setToggling(false);
      }
    })();
  }, [currentUid, toggling, liked, key, postId]);

  return { liked, likedLoading, toggling, toggleError, toggleLike };
};
