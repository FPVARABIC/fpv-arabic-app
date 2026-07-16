/**
 * E2E-test-only helper — dynamically imported by scripts/testCommunityE2E.ts,
 * same convention as e2eAuth.ts/e2eBypass.ts/e2eDirectCalls.ts in this
 * directory: no application code imports this file, never part of the
 * production bundle.
 *
 * Reproduces useComposer.ts's own upload -> Firestore-write -> (on failure)
 * delete-orphan sequence directly, using the exact same uploadMedia/
 * deleteMedia primitives that hook calls — proves the primitives
 * themselves genuinely upload real files and then genuinely delete them on
 * a Firestore-write failure. The hook's OWN wiring (that it calls
 * deleteMedia from its catch block when upload succeeded) is verified
 * separately by source inspection in scripts/testCommunity.ts's structural
 * suite — this is the live, real-Storage-emulator half of that proof.
 */
import { doc, collection, writeBatch, serverTimestamp } from 'firebase/firestore';
import { firestoreDb, firebaseAuth } from '../../../lib/firebase';
import { uploadMedia, deleteMedia, type UploadedMedia, type MediaDeleteResult } from '../Composer/MediaUploader';

// Uploads a real image and returns the resulting media record without ever
// attempting a (successful or deliberately-failing) Firestore write — a
// smaller, focused primitive alongside e2eProveOrphanCleanup below, added so
// the correction-pass test matrix can drive deleteMedia() directly against
// a real, still-fully-present pair of Storage objects (for the
// already-missing and cross-user-denied structured-result cases), without
// bundling in the orphan-specific Firestore-failure scenario every time.
export async function e2eUploadMediaForTest(file: { name: string; type: string; dataUrl: string }): Promise<{ media: UploadedMedia | null }> {
  const uid = firebaseAuth.currentUser!.uid;
  const res = await fetch(file.dataUrl);
  const blob = await res.blob();
  const realFile = new File([blob], file.name, { type: file.type });
  const postRef = doc(collection(firestoreDb, 'posts'));
  const media = await uploadMedia(realFile, uid, postRef.id);
  return { media };
}

// Thin passthrough so the Node-side test driver can invoke the real
// deleteMedia() primitive (imported here, inside the browser page) and read
// back its full structured MediaDeleteResult — not just a boolean.
export async function e2eDeleteMediaAndReport(media: Pick<UploadedMedia, 'mediaPath' | 'uuid'>): Promise<MediaDeleteResult> {
  return deleteMedia(media);
}

export interface OrphanCleanupTestResult {
  uploadSucceeded: boolean;
  mediaPath: string | null;
  firestoreWriteFailed: boolean;
  deleteRanWithoutThrowing: boolean;
  // The real structured result from deleteMedia() — null only when upload
  // itself never happened (nothing to delete). Kept alongside the older
  // deleteRanWithoutThrowing boolean (still true here, since deleteMedia
  // never throws) so a caller can additionally confirm BOTH objects were
  // genuinely reported as cleaned up, not merely that the call didn't throw.
  deleteResult: MediaDeleteResult | null;
}

// Deliberately writes an INVALID post shape (commentsCount: 1 instead of
// the required 0) so firestore.rules denies the create — the exact failure
// mode useComposer.ts's own try/catch around batch.commit() is written to
// handle, reproduced here with a real image already uploaded to Storage.
export async function e2eProveOrphanCleanup(file: { name: string; type: string; dataUrl: string }): Promise<OrphanCleanupTestResult> {
  const uid = firebaseAuth.currentUser!.uid;
  const res = await fetch(file.dataUrl);
  const blob = await res.blob();
  const realFile = new File([blob], file.name, { type: file.type });

  const postRef = doc(collection(firestoreDb, 'posts'));
  const postId = postRef.id;

  const media = await uploadMedia(realFile, uid, postId);
  if (!media) {
    return { uploadSucceeded: false, mediaPath: null, firestoreWriteFailed: false, deleteRanWithoutThrowing: false, deleteResult: null };
  }

  let firestoreWriteFailed = false;
  try {
    const batch = writeBatch(firestoreDb);
    batch.set(postRef, {
      authorId: uid, authorName: 'Orphan Test', authorPhoto: null,
      text: 'محاولة نشر ستفشل عمداً', mediaType: 'image',
      mediaURL: media.mediaURL, thumbnailURL: media.thumbnailURL,
      mediaSize: media.mediaSize, mediaDuration: null, mediaPath: media.mediaPath,
      mediaWidth: media.width, mediaHeight: media.height,
      commentsCount: 1, // INVALID — firestore.rules requires exactly 0 at creation
      likesCount: 0, createdAt: serverTimestamp(), status: 'active', searchTokens: [],
    });
    await batch.commit();
  } catch {
    firestoreWriteFailed = true;
  }

  let deleteResult: MediaDeleteResult | null = null;
  const deleteRanWithoutThrowing = await deleteMedia(media).then(result => {
    deleteResult = result;
    return true;
  }, () => false);

  return { uploadSucceeded: true, mediaPath: media.mediaPath, firestoreWriteFailed, deleteRanWithoutThrowing, deleteResult };
}
