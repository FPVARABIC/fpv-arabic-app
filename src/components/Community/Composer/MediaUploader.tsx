import imageCompression from 'browser-image-compression';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firebaseStorage } from '../../../lib/firebase';
import { mediaFolderPath } from '../utils/firestorePaths';

// Firestore Rules' honest metadata ceiling (C2 amendment) — the real
// physical enforcement is Storage Rules' 2MB cap on actual uploaded bytes;
// this is the pre-write client-side check so a failed-to-compress-enough
// image never even reaches a write attempt.
const MAX_MEDIA_SIZE_BYTES = 500 * 1024;

export interface UploadedMedia {
  mediaURL: string;
  thumbnailURL: string;
  mediaSize: number;
  mediaPath: string;
}

// Generic validate → compress → upload pipeline (D4). Image handler now;
// video is schema-ready only (D4/D9) — this function only ever handles
// images in V1, and is never called for the disabled video button.
//
// EXIF orientation: browser-image-compression auto-detects and corrects
// EXIF orientation by default whenever the `exifOrientation` option is left
// unset (verified against the installed v2.0.2 source — it calls its own
// getExifOrientation()/followExifOrientation() internally in that case).
// This call deliberately does NOT pass `exifOrientation`, so that default
// auto-correction stays active — no custom EXIF-parsing code needed.
export const uploadMedia = async (
  file: File,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
): Promise<UploadedMedia | null> => {
  if (!file.type.startsWith('image/')) {
    throw new Error('NOT_AN_IMAGE');
  }

  const [fullBlob, thumbBlob] = await Promise.all([
    imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: 0.3, useWebWorker: true, fileType: 'image/jpeg' }),
    imageCompression(file, { maxWidthOrHeight: 400, maxSizeMB: 0.04, useWebWorker: true, fileType: 'image/jpeg' }),
  ]);

  // Best-effort library target, not a mathematical guarantee (documented
  // behavior) — verify the real result before ever attempting a write.
  if (fullBlob.size > MAX_MEDIA_SIZE_BYTES) {
    return null;
  }

  const uuid = crypto.randomUUID();
  const folder = mediaFolderPath(postId);
  const fullRef = ref(firebaseStorage, `${folder}/${uuid}.jpg`);
  const thumbRef = ref(firebaseStorage, `${folder}/${uuid}_thumb.jpg`);

  const uploadWithProgress = (storageRef: typeof fullRef, blob: Blob, onPct: (pct: number) => void): Promise<void> =>
    new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });
      task.on(
        'state_changed',
        snapshot => onPct(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        reject,
        () => resolve(),
      );
    });

  await Promise.all([
    uploadWithProgress(fullRef, fullBlob, pct => onProgress?.(pct, 0)),
    uploadWithProgress(thumbRef, thumbBlob, pct => onProgress?.(0, pct)),
  ]);

  const [mediaURL, thumbnailURL] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)]);

  return { mediaURL, thumbnailURL, mediaSize: fullBlob.size, mediaPath: folder };
};
