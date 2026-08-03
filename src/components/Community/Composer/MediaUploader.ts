import { firebaseStorage } from '../../../lib/firebase';
import {
  uploadMediaWith, deleteMediaWith,
  type UploadedMedia, type UploadControl,
} from './mediaPipeline';
import type { MediaDeleteResult } from './mediaDeleteRetry';

/**
 * The phone app's binding of the shared media pipeline.
 *
 * A `.ts` file, not `.tsx`: it contains no JSX and never did. Under the `.tsx`
 * extension ESLint's react-refresh rule treats its capitalised error-class
 * re-exports as components and then objects to every function beside them —
 * five errors describing a fast-refresh boundary that does not exist in a file
 * with no components in it.
 *
 * Everything that decides WHAT may be uploaded — the MIME allow-lists, the size
 * ceilings, the compression targets, the UUID naming that `storage.rules`
 * matches on, the decode verification, the delete-retry semantics — lives in
 * `mediaPipeline.ts` and is shared verbatim with the web surface. This file
 * supplies the one thing that genuinely differs between the two: which Firebase
 * Storage instance to talk to.
 *
 * The exported names and signatures below are IDENTICAL to what this module
 * exported before that split, so `useComposer.ts`, `PostComposer.tsx` and
 * `testHelpers/e2eMediaOrphanCleanup.ts` are untouched by it.
 *
 * `uploadVideo` is deliberately NOT re-exported here. The phone has no video
 * composer, so binding it would be speculative API — and, because a re-export
 * is a live reference, it would drag the video decode/poster-capture path into
 * the phone bundle for code nothing calls. When the phone gains a video
 * composer, one line brings it back.
 */

export type { MediaDeleteOutcome, MediaDeleteResult } from './mediaDeleteRetry';
export type { UploadedMedia, UploadControl } from './mediaPipeline';
export {
  MAX_MEDIA_SIZE_BYTES,
  MAX_RAW_INPUT_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  isAllowedImageMimeType,
  verifyImageDecodable,
  MediaUploadTimeoutError,
  MediaUploadCancelledError,
  type AllowedImageMimeType,
} from './mediaPipeline';

export const uploadMedia = (
  file: File,
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | null> =>
  uploadMediaWith(firebaseStorage, file, uid, postId, onProgress, control);

export const deleteMedia = (
  media: Pick<UploadedMedia, 'mediaPath' | 'uuid'> & { ext?: string },
): Promise<MediaDeleteResult> => deleteMediaWith(firebaseStorage, media);
