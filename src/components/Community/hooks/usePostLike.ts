import { useCallback, useEffect, useState } from 'react';
import { doc, getDoc, setDoc, collection, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { postLikePath, postPath, userPath, notificationsPath } from '../utils/firestorePaths';
import type { CommunityUser } from '../types';

export interface UsePostLikeResult {
  liked: boolean;
  likedLoading: boolean;
  toggling: boolean;
  toggleError: string | null;
  toggleLike: () => void;
}

const likeStatusKey = (postId: string, uid: string | null): string => `${postId}/${uid ?? 'guest'}`;

// TEMPORARY REVERT (bridge until Firebase Blaze billing is restored) — back
// to a direct client Firestore batch write (create-or-delete the
// likes/{uid} doc, paired with a likesCount ±1 update on the post), since no
// prior direct-write version of this hook ever existed (togglePostLike was
// Cloud-Function-only from the moment this hook was first introduced — see
// git history). togglePostLike (functions/src/index.ts) is left in place,
// unchanged, just unreachable from the client while this path is live —
// re-wire this hook back to that callable the moment Functions are billable
// again; firestore.rules' posts/{postId}/likes/{likerUid} block documents
// the exact restore steps.
//
// Accepted-risk model: identical shape to commentsCount's own accepted risk
// (see firestore.rules) — Rules validate the likesCount change is shape-
// correct (exact ±1, active user, post still active, never negative), but
// cannot cryptographically confirm the paired likes/{uid} write actually
// happened in the SAME batch, since Rules have no visibility across
// documents/batches. This is not a new risk introduced here.
//
// Behavior difference from the Function this replaces: a genuine double-
// toggle race (not the common single-click case, which `toggling` below
// already guards) now surfaces as a denied write / toggleError, rather than
// the Function's silent idempotent no-op — see docs/KNOWN_ISSUES.md.
export const usePostLike = (postId: string, authorId: string): UsePostLikeResult => {
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
    // Optimistic flip — rolled back in the catch block below if the write
    // fails, so a denied/offline request never leaves the UI showing a
    // state the server didn't actually accept.
    setResult({ key, liked: !wasLiked });

    (async () => {
      try {
        const likeRef = doc(firestoreDb, postLikePath(postId, currentUid));
        const postRef = doc(firestoreDb, postPath(postId));
        const batch = writeBatch(firestoreDb);
        if (wasLiked) {
          batch.delete(likeRef);
          batch.update(postRef, { likesCount: increment(-1) });
        } else {
          batch.set(likeRef, { createdAt: serverTimestamp() });
          batch.update(postRef, { likesCount: increment(1) });
        }
        await batch.commit();
        setResult({ key, liked: !wasLiked });

        // Notifications (Phase 1) — a SEPARATE write, issued only after the
        // like batch above has actually committed, never inside that same
        // batch: firestore.rules' anti-forgery check requires exists() on
        // the just-committed like doc, and Rules cannot see writes still
        // pending within the same batch, only already-committed state.
        // Never fires on unlike (no "someone unliked you" notification),
        // and never fires when liking your own post. ACCEPTED TRADE-OFF
        // (same disclosure discipline as the commentsCount/likesCount
        // accepted risks elsewhere in this codebase): if THIS write fails
        // after the like itself already succeeded, the like is NOT rolled
        // back — only the notification silently fails to appear.
        if (!wasLiked && authorId !== currentUid) {
          try {
            const ownProfileSnap = await getDoc(doc(firestoreDb, userPath(currentUid)));
            const ownProfile = ownProfileSnap.exists() ? (ownProfileSnap.data() as CommunityUser) : null;
            if (ownProfile) {
              const notifRef = doc(collection(firestoreDb, notificationsPath(authorId)));
              await setDoc(notifRef, {
                type: 'like_post',
                actorId: currentUid,
                actorName: ownProfile.displayName,
                actorPhoto: ownProfile.photoURL,
                targetType: 'post',
                targetId: postId,
                postId,
                read: false,
                createdAt: serverTimestamp(),
              });
            }
          } catch (err) {
            console.error('[usePostLike:notify]', err);
          }
        }
      } catch (err) {
        console.error('[usePostLike:toggle]', err);
        setResult({ key, liked: wasLiked }); // rollback the optimistic flip
        setToggleError('تعذّر تسجيل الإعجاب. حاول مرة أخرى.');
      } finally {
        setToggling(false);
      }
    })();
  }, [currentUid, toggling, liked, key, postId, authorId]);

  return { liked, likedLoading, toggling, toggleError, toggleLike };
};
