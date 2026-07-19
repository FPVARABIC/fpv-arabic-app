import { useCallback, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { userPath } from '../utils/firestorePaths';
import type { UserStatus } from '../types';

interface UseUserStatusResult {
  submitting: boolean;
  error: string | null;
  setUserStatus: (uid: string, status: UserStatus) => Promise<boolean>;
}

// Admin dashboard (Phase 2) ban/unban — writes ONLY `status` on another
// user's users/{uid} doc, via the new isModerator() branch in
// firestore.rules (status-only, never role, never self-targeting — see that
// rule's own comment for the full justification). This hook has no
// knowledge of who's a moderator or whose own uid this is; the caller
// (UserManagementScreen) is responsible for disabling the button in the
// self/other-moderator cases, and Rules independently reject it either way
// regardless of what the UI does.
export const useUserStatus = (): UseUserStatusResult => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setUserStatus = useCallback(async (uid: string, status: UserStatus): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(firestoreDb, userPath(uid)), { status });
      return true;
    } catch (err) {
      console.error('[useUserStatus]', err);
      setError('تعذّر تحديث حالة الحساب. حاول مرة أخرى.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, setUserStatus };
};
