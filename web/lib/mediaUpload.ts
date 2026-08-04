'use client';

import { clientStorage } from './firebaseClient';
import {
  uploadMediaWith, uploadVideoWith, deleteMediaWith, compressForUpload,
  type UploadedMedia, type UploadedVideo, type UploadControl,
} from '@core/community/Composer/mediaPipeline';

/**
 * The web surface's binding of the shared media pipeline.
 *
 * The mirror image of `src/components/Community/Composer/MediaUploader.tsx`:
 * that file binds the phone's Firebase Storage instance, this one binds the
 * web's. Everything else — the MIME allow-lists, the size ceilings, the
 * compression targets, the `{uuid}.jpg` / `{uuid}_thumb.jpg` naming that
 * `storage.rules` matches on, the decode verification, the video duration
 * bound, the delete-retry semantics — comes from `mediaPipeline.ts` and is
 * therefore the SAME CODE on both surfaces.
 *
 * That is the whole point. A second uploader would be a second answer to "what
 * may be uploaded", and `storage.rules` only has one. `scripts/testWebCore.ts`
 * asserts this file contains no independent limits of its own.
 */

export type { UploadedMedia, UploadedVideo, UploadControl };

export {
  MAX_MEDIA_SIZE_BYTES,
  MAX_RAW_INPUT_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_VIDEO_DURATION_SECONDS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
  isAllowedImageMimeType,
  isAllowedVideoMimeType,
  verifyImageDecodable,
  decodeVideo,
  MediaUploadTimeoutError,
  MediaUploadCancelledError,
} from '@core/community/Composer/mediaPipeline';

export const uploadImage = (
  file: File,
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | null> =>
  uploadMediaWith(clientStorage(), file, uid, postId, onProgress, control);

/**
 * A product photograph, compressed here and written by the server.
 *
 * Same MIME allow-list, same 1600px/400px targets, same 300KB/40KB budgets,
 * same decode verification and the same EXIF guarantee — all of it from the
 * shared pipeline. What differs is who writes the bytes: the browser hands them
 * to a server action holding `store.editProducts`, rather than writing to
 * Storage itself.
 *
 * That is not extra caution, it is one fewer answer. The panel's permission
 * lives in the capability model; a Storage rule re-deriving it as a role check
 * would be a second answer that drifts. See `uploadAction.ts`.
 */
export const compressProductImage = compressForUpload;

/** Base64 for a blob, the shape the upload action takes. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  // Chunked: `String.fromCharCode(...bytes)` blows the argument limit on
  // anything above a few hundred kilobytes, which is exactly our size range.
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export const uploadVideo = (
  file: File,
  uid: string,
  postId: string,
  onProgress?: (pct: number) => void,
  control?: UploadControl,
): Promise<UploadedVideo | null> =>
  uploadVideoWith(clientStorage(), file, uid, postId, onProgress, control);

export const deleteUploadedMedia = (
  media: Pick<UploadedMedia, 'mediaPath' | 'uuid'> & { ext?: string },
) => deleteMediaWith(clientStorage(), media);
