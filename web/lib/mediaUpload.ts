'use client';

import { clientStorage } from './firebaseClient';
import {
  uploadMediaWith, uploadVideoWith, deleteMediaWith,
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
