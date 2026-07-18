import { useCallback, useState } from 'react';
import { doc, getDoc, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { userPath, postPath, commentsPath } from '../utils/firestorePaths';
import { ensureCommunityUser } from '../utils/ensureCommunityUser';
import { secondsRemaining, COMMENT_RATE_LIMIT_SECONDS, commentRateLimitMessage } from '../utils/rateLimit';
import type { CommunityUser } from '../types';

export interface CreateCommentResult {
  commentId: string;
  collapsed: boolean;
}

interface UseCommentComposerResult {
  // Resolves to the created comment's id on success, so the caller
  // (CommentInput) can hand it to usePost's appendCreatedComment instead of
  // re-fetching the whole paginated comments list. null on failure.
  createComment: (postId: string, text: string) => Promise<CreateCommentResult | null>;
  submitting: boolean;
  error: string | null;
}

// TEMPORARY REVERT (bridge until Firebase Blaze billing is restored) — back
// to a direct client Firestore write, same shape as the pre-Phase-6 design.
// The createComment Cloud Function (functions/src/index.ts) still exists,
// unchanged, and remains the intended permanent design — firestore.rules'
// comments/{commentId} create rule documents the exact restore steps. This
// hook must be re-wired back to that callable (see git history at commit
// b60405d for the reference implementation) the moment Functions are
// billable again; do not build any further features on top of this direct-
// write path.
//
// `collapsed` is always false here — the duplicate-fingerprint retry-
// collapse the Function provided has no equivalent in a direct client
// write (see rateLimit.ts). The field is kept on the return type only so
// CommentInput.tsx/usePost.ts need no changes during this bridge.
export const useCommentComposer = (): UseCommentComposerResult => {
  const { currentUser } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = useCallback(
    async (postId: string, text: string): Promise<CreateCommentResult | null> => {
      if (!currentUser) {
        setError('يجب تسجيل الدخول للتعليق.');
        return null;
      }
      setSubmitting(true);
      setError(null);

      try {
        const userRef = doc(firestoreDb, userPath(currentUser.uid));
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? (userSnap.data() as CommunityUser) : null;

        if (userData?.status === 'banned') {
          setError('حسابك موقوف عن التعليق حالياً.');
          return null;
        }

        // TEMPORARY client-side pre-check — a UX convenience only, mirroring
        // useComposer.ts's own pattern. The real, unbypassable enforcement is
        // firestore.rules' matching (and much shorter than the pre-Phase-6
        // 15s) cooldown on this same lastCommentAt field.
        if (userData?.lastCommentAt) {
          const remaining = secondsRemaining(userData.lastCommentAt, COMMENT_RATE_LIMIT_SECONDS);
          if (remaining > 0) {
            setError(commentRateLimitMessage(remaining));
            return null;
          }
        }

        // Bootstrap: the create-rule's cooldown check reads the caller's OWN
        // profile doc, which must already exist. Normally already done by
        // useEnsureCommunityUser at Community-entry; this call is a safe,
        // idempotent fallback for the rare case a comment is submitted
        // before that bootstrap has finished.
        if (!userData) {
          await ensureCommunityUser(currentUser.uid, {
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          });
        }

        const authorName = userData?.displayName ?? currentUser.displayName ?? 'مستخدم';
        const authorPhoto = userData?.photoURL ?? currentUser.photoURL ?? null;

        const commentRef = doc(collection(firestoreDb, commentsPath(postId)));
        const postRef = doc(firestoreDb, postPath(postId));

        const batch = writeBatch(firestoreDb);
        batch.set(commentRef, {
          authorId: currentUser.uid,
          authorName,
          authorPhoto,
          text,
          createdAt: serverTimestamp(),
          status: 'active',
          // Matches the schema createComment's Admin SDK write already
          // establishes — comment likes (toggleCommentLike, untouched by
          // this revert) increment this field starting from 0.
          likesCount: 0,
        });
        batch.update(postRef, { commentsCount: increment(1) });
        batch.update(userRef, { lastCommentAt: serverTimestamp() });

        await batch.commit();
        return { commentId: commentRef.id, collapsed: false };
      } catch (err) {
        console.error('[useCommentComposer]', err);
        setError('تعذر إضافة التعليق. حاول مرة أخرى.');
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser],
  );

  return { createComment, submitting, error };
};
