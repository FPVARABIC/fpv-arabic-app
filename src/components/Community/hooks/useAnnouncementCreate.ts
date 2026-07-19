import { useCallback, useState } from 'react';
import { doc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestoreDb } from '../../../lib/firebase';
import { ANNOUNCEMENTS_COLLECTION } from '../utils/firestorePaths';

interface CreateAnnouncementInput {
  title: string;
  body: string;
  ctaLink: string | null;
}

interface UseAnnouncementCreateResult {
  submitting: boolean;
  error: string | null;
  createAnnouncement: (input: CreateAnnouncementInput) => Promise<boolean>;
}

// Admin dashboard (Phase 2) — writes directly into the existing
// announcements/{announcementId} collection built for Notifications Phase 1.
// No schema or Rules changes: this hook's write shape matches
// firestore.rules' announcements create rule exactly (title/body/ctaLink/
// createdAt, nothing else).
export const useAnnouncementCreate = (): UseAnnouncementCreateResult => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAnnouncement = useCallback(async ({ title, body, ctaLink }: CreateAnnouncementInput): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      await setDoc(doc(collection(firestoreDb, ANNOUNCEMENTS_COLLECTION)), {
        title, body, ctaLink, createdAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('[useAnnouncementCreate]', err);
      setError('تعذّر نشر الإعلان. حاول مرة أخرى.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, createAnnouncement };
};
