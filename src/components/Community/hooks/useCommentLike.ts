import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { commentLikePath, commentPath, userPath, notificationsPath } from '../utils/firestorePaths';
import type { CommunityUser } from '../types';

export interface UseCommentLikeResult {
  liked: boolean;
  likedLoading: boolean;
  toggling: boolean;
  toggleError: string | null;
  toggleLike: () => void;
}

const likeStatusKey = (postId: string, commentId: string, uid: string | null): string =>
  `${postId}/${commentId}/${uid ?? 'guest'}`;

// TEMPORARY REVERT (bridge until Firebase Blaze billing is restored) — back
// to a direct client Firestore batch write, same reasoning and same
// accepted-risk model as usePostLike.ts's own revert (see that file's
// comment for the full rationale — no prior direct-write version of this
// hook ever existed either; toggleCommentLike was Cloud-Function-only from
// the moment this hook was first introduced). toggleCommentLike (functions/
// src/index.ts) is left in place, unchanged, just unreachable from the
// client while this path is live — re-wire this hook back to that callable
// the moment Functions are billable again; firestore.rules'
// comments/{commentId}/likes/{likerUid} block documents the exact restore
// steps.
export const useCommentLike = (postId: string, commentId: string, authorId: string): UseCommentLikeResult => {
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
    // Optimistic flip — rolled back in the catch block below if the write
    // fails, so a denied/offline request never leaves the UI showing a
    // state the server didn't actually accept.
    setResult({ key, liked: !wasLiked });

    (async () => {
      try {
        const likeRef = doc(firestoreDb, commentLikePath(postId, commentId, currentUid));
        const commentRef = doc(firestoreDb, commentPath(postId, commentId));
        const batch = writeBatch(firestoreDb);
        if (wasLiked) {
          batch.delete(likeRef);
          batch.update(commentRef, { likesCount: increment(-1) });
        } else {
          batch.set(likeRef, { createdAt: serverTimestamp() });
          batch.update(commentRef, { likesCount: increment(1) });
        }
        await batch.commit();
        setResult({ key, liked: !wasLiked });

        // Notifications (Phase 1) — a SEPARATE write, issued only after the
        // like batch above has actually committed, never inside that same
        // batch: firestore.rules' anti-forgery check requires exists() on
        // the just-committed like doc, and Rules cannot see writes still
        // pending within the same batch, only already-committed state.
        // Never fires on unlike, and never fires when liking your own
        // comment. ACCEPTED TRADE-OFF (same disclosure discipline as the
        // commentsCount/likesCount accepted risks elsewhere in this
        // codebase): if THIS write fails after the like itself already
        // succeeded, the like is NOT rolled back — only the notification
        // silently fails to appear.
        if (!wasLiked && authorId !== currentUid) {
          try {
            const ownProfileSnap = await getDoc(doc(firestoreDb, userPath(currentUid)));
            const ownProfile = ownProfileSnap.exists() ? (ownProfileSnap.data() as CommunityUser) : null;
            if (ownProfile) {
              const notifRef = doc(collection(firestoreDb, notificationsPath(authorId)));
              await setDoc(notifRef, {
                type: 'like_comment',
                actorId: currentUid,
                actorName: ownProfile.displayName,
                actorPhoto: ownProfile.photoURL,
                targetType: 'comment',
                targetId: commentId,
                postId,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.error('[useCommentLike:notify]', err);
          }
        }
      } catch (err) {
        console.error('[useCommentLike:toggle]', err);
        setResult({ key, liked: wasLiked }); // rollback the optimistic flip
        setToggleError('تعذّر تسجيل الإعجاب. حاول مرة أخرى.');
      } finally {
        setToggling(false);
      }
    })();
  }, [currentUid, toggling, liked, key, postId, commentId, authorId]);

  return { liked, likedLoading, toggling, toggleError, toggleLike };
};
