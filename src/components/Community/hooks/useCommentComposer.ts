import { useCallback, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { functionsErrorMessage } from '../utils/functionsError';

export interface CreateCommentResult {
  commentId: string;
  collapsed: boolean;
}

interface UseCommentComposerResult {
  // Resolves to the created (or duplicate-collapsed) comment's id on
  // success, so the caller (CommentInput) can hand it to
  // usePost's appendCreatedComment instead of re-fetching the whole
  // paginated comments list. null on failure.
  createComment: (postId: string, text: string) => Promise<CreateCommentResult | null>;
  submitting: boolean;
  error: string | null;
}

// Comment creation (Phase 6, corrected) — the ONLY write path, via the
// createComment callable (functions/src/index.ts). There is no client-side
// cooldown pre-check anymore: the previous two-layer client guard (3s
// global + 15s per-post) is exactly what made a second, distinct comment on
// the same post wait for no real reason. All anti-spam/anti-flood
// enforcement now lives server-side (Admin SDK, trusted uid, rolling
// window + duplicate-fingerprint collapse) — see that file's comments for
// the authoritative rules. The only thing this hook still does locally is
// disable the submit action while a call is in flight, so a user can't
// double-tap the same submission before the first round-trip resolves.
const createCommentCallable = httpsCallable<{ postId: string; text: string }, CreateCommentResult>(
  firebaseFunctions,
  'createComment',
);

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
        const res = await createCommentCallable({ postId, text });
        return res.data;
      } catch (err) {
        console.error('[useCommentComposer]', err);
        setError(functionsErrorMessage(err, 'تعذر إضافة التعليق. حاول مرة أخرى.'));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser],
  );

  return { createComment, submitting, error };
};
