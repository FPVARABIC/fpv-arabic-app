import imageCompression from 'browser-image-compression';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { firebaseStorage } from '../../../lib/firebase';
import { mediaFolderPath } from '../utils/firestorePaths';
import { classifyAndRetryDelete, deriveMediaDeleteResult, type MediaDeleteResult } from './mediaDeleteRetry';
export type { MediaDeleteOutcome, MediaDeleteResult } from './mediaDeleteRetry';

// Firestore Rules' honest metadata ceiling (C2 amendment) — the real
// physical enforcement is Storage Rules' 2MB cap on actual uploaded bytes;
// this is the pre-write client-side check so a failed-to-compress-enough
// image never even reaches a write attempt.
const MAX_MEDIA_SIZE_BYTES = 500 * 1024;

// Pre-compression input ceiling (Phase 9) — distinct from
// MAX_MEDIA_SIZE_BYTES above, which caps the COMPRESSED output. A modern
// phone photo can legitimately be 10-15MB before compression, so this only
// exists to reject truly unreasonable inputs (a mis-selected video file
// renamed to .jpg, a multi-hundred-MB image) before wasting a
// main-thread-adjacent Web Worker cycle compressing something no real photo
// would ever be.
export const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

// Exact allow-list, not a wildcard — matches storage.rules' own allow-list
// exactly (Phase 9 hardening: the previous `image/.*` pattern on both sides
// would have accepted image/svg+xml, whose payload is XML/script-capable,
// and image/gif, never audited for animation/size/cost implications).
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const isAllowedImageMimeType = (type: string): type is AllowedImageMimeType =>
  (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);

// Verifies the file is genuinely a decodable raster image, not merely a
// file whose declared MIME type/extension claims so — a renamed non-image
// file (or a corrupt one) fails to decode and is rejected before any
// compression/upload work begins. createImageBitmap is the standard
// browser-native way to do this without a full <img> DOM round-trip; the
// resulting bitmap is immediately closed since only the yes/no answer (and,
// as a side benefit, real dimensions) are needed here.
export const verifyImageDecodable = async (file: Blob): Promise<{ width: number; height: number } | null> => {
  try {
    const bitmap = await createImageBitmap(file);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return null;
  }
};

export interface UploadedMedia {
  mediaURL: string;
  thumbnailURL: string;
  mediaSize: number;
  mediaPath: string;
  width: number;
  height: number;
  // The UUID this upload's filenames share ({uuid}.jpg / {uuid}_thumb.jpg,
  // see uploadMedia below) — kept alongside the resolved download URLs so
  // deleteMedia can reconstruct both object refs directly from mediaPath +
  // uuid, without ever needing to parse a download URL's token/query-string
  // shape (an implementation detail this code should not depend on).
  uuid: string;
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
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
): Promise<UploadedMedia | null> => {
  if (!isAllowedImageMimeType(file.type)) {
    throw new Error('NOT_AN_ALLOWED_IMAGE_TYPE');
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

  // Real dimensions of the actual served asset (post-compression, which may
  // have resized the original down via maxWidthOrHeight) — not the
  // original file's dimensions, which the compressed output may no longer
  // match. Canvas-based re-encoding (which imageCompression performs
  // internally) never carries EXIF data forward into its output blob, so
  // this also structurally guarantees the uploaded file carries no
  // EXIF/GPS metadata — nothing to strip because the re-encode never wrote
  // any in the first place.
  const dims = await verifyImageDecodable(fullBlob);
  if (!dims) return null;

  const uuid = crypto.randomUUID();
  const folder = mediaFolderPath(uid, postId);
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

  return { mediaURL, thumbnailURL, mediaSize: fullBlob.size, mediaPath: folder, width: dims.width, height: dims.height, uuid };
};

// Best-effort orphan cleanup (Phase 9) — called from useComposer.ts's catch
// block when Storage upload succeeded but the paired Firestore post-create
// write subsequently failed (e.g. a rate-limit race lost between two
// concurrent submissions from the same user). Never throws: a failed
// cleanup attempt must never mask or replace the ORIGINAL error the caller
// is already handling. Per-file failures are independent — one object's
// delete failing never prevents the other from being attempted — and the
// STRUCTURED result below lets the caller distinguish full success from a
// partial leak instead of silently assuming success either way.
export const deleteMedia = async (media: Pick<UploadedMedia, 'mediaPath' | 'uuid'>): Promise<MediaDeleteResult> => {
  const fullRef = ref(firebaseStorage, `${media.mediaPath}/${media.uuid}.jpg`);
  const thumbRef = ref(firebaseStorage, `${media.mediaPath}/${media.uuid}_thumb.jpg`);

  const [full, thumbnail] = await Promise.all([
    classifyAndRetryDelete(() => deleteObject(fullRef), 'full image', fullRef.fullPath),
    classifyAndRetryDelete(() => deleteObject(thumbRef), 'thumbnail', thumbRef.fullPath),
  ]);

  return deriveMediaDeleteResult(full, thumbnail);
};
