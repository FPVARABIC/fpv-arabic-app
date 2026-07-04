import { useCallback, useState } from 'react';
import { doc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { useAuthContext } from '../../../contexts/AuthContext';
import { REPORTS_COLLECTION } from '../utils/firestorePaths';
import type { ReportReason, ReportTargetType } from '../types';

interface SubmitReportInput {
  targetType: ReportTargetType;
  targetId: string;
  postId: string;
  reason: ReportReason;
  note: string | null;
}

interface UseReportResult {
  submitReport: (input: SubmitReportInput) => Promise<boolean>;
  submitting: boolean;
  error: string | null;
}

export const useReport = (): UseReportResult => {
  const { currentUser } = useAuthContext();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitReport = useCallback(
    async ({ targetType, targetId, postId, reason, note }: SubmitReportInput): Promise<boolean> => {
      if (!currentUser) {
        setError('يجب تسجيل الدخول للإبلاغ.');
        return false;
      }
      setSubmitting(true);
      setError(null);
      try {
        await setDoc(doc(collection(firestoreDb, REPORTS_COLLECTION)), {
          targetType,
          targetId,
          postId,
          reporterId: currentUser.uid,
          reason,
          note: reason === 'other' ? note : null,
          resolved: false,
          createdAt: serverTimestamp(),
        });
        return true;
      } catch (err) {
        console.error('[useReport]', err);
        setError('تعذر إرسال البلاغ. حاول مرة أخرى.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [currentUser],
  );

  return { submitReport, submitting, error };
};
