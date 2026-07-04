import { useCallback, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, increment, collection } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { userPath, postPath, commentsPath } from '../utils/firestorePaths';
import { secondsRemaining, COMMENT_RATE_LIMIT_SECONDS, commentRateLimitMessage } from '../utils/rateLimit';
import type { CommunityUser } from '../types';

interface UseCommentComposerResult {
  createComment: (postId: string, text: string) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
}

export const useCommentComposer = (): UseCommentComposerResult => {
  const { currentUser } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createComment = useCallback(
    async (postId: string, text: string): Promise<boolean> => {
      if (!currentUser) {
        setError('يجب تسجيل الدخول للتعليق.');
        return false;
      }
      setSubmitting(true);
      setError(null);

      try {
        const userRef = doc(firestoreDb, userPath(currentUser.uid));
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? (userSnap.data() as CommunityUser) : null;

        if (userData?.status === 'banned') {
          setError('حسابك موقوف عن التعليق حالياً.');
          return false;
        }

        if (userData?.lastCommentAt) {
          const remaining = secondsRemaining(userData.lastCommentAt, COMMENT_RATE_LIMIT_SECONDS);
          if (remaining > 0) {
            setError(commentRateLimitMessage(remaining));
            return false;
          }
        }

        // Same bootstrap constraint as useComposer: create-rule requires
        // postsCount==0/lastPostAt==null/lastCommentAt==null at creation,
        // which cannot share a batch with the update below.
        if (!userData) {
          await setDoc(userRef, {
            displayName: currentUser.displayName ?? 'مستخدم',
            photoURL: currentUser.photoURL ?? null,
            joinedAt: serverTimestamp(),
            postsCount: 0,
            role: 'user',
            status: 'active',
            lastPostAt: null,
            lastCommentAt: null,
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
        });
        batch.update(postRef, { commentsCount: increment(1) });
        batch.update(userRef, { lastCommentAt: serverTimestamp() });

        await batch.commit();
        return true;
      } catch (err) {
        console.error('[useCommentComposer]', err);
        setError('تعذر إضافة التعليق. حاول مرة أخرى.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser],
  );

  return { createComment, submitting, error };
};
