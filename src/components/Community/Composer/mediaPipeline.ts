import imageCompression from 'browser-image-compression';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
  type FirebaseStorage, type UploadTask,
} from 'firebase/storage';
import { mediaFolderPath } from '../utils/firestorePaths';
import { classifyAndRetryDelete, deriveMediaDeleteResult, type MediaDeleteResult } from './mediaDeleteRetry';

/**
 * The community's media pipeline — validate, compress, upload, delete.
 *
 * WHY THIS FILE EXISTS SEPARATELY FROM MediaUploader.tsx
 * -----------------------------------------------------
 * All of this logic used to live in `MediaUploader.tsx`, which imported the
 * phone app's `firebaseStorage` singleton directly. That single import was the
 * only thing tying an otherwise surface-agnostic pipeline to the phone: Next.js
 * cannot import it (it is initialised from `import.meta.env.VITE_*`), so the web
 * would have had to reimplement compression limits, MIME allow-lists, UUID
 * naming, progress plumbing and delete-retry semantics.
 *
 * Two implementations of "what may be uploaded" is precisely the failure this
 * project forbids: `storage.rules` is written against ONE naming and typing
 * scheme, and a second uploader that drifted from it would produce files the
 * rules reject — or worse, files they accept for the wrong reasons.
 *
 * So the storage handle is now a PARAMETER. `MediaUploader.tsx` binds the
 * phone's instance and re-exports everything with its original signatures, so
 * no phone call site changed. `web/lib/mediaUpload.ts` binds the web's. Both
 * run this code.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * Anything React. This module is plain TypeScript so it can be imported by a
 * Vite client component, a Next client component, and a test script alike.
 */

// Firestore Rules' honest metadata ceiling (C2 amendment) — the real
// physical enforcement is Storage Rules' 2MB cap on actual uploaded bytes;
// this is the pre-write client-side check so a failed-to-compress-enough
// image never even reaches a write attempt.
export const MAX_MEDIA_SIZE_BYTES = 500 * 1024;

// Pre-compression input ceiling (Phase 9) — distinct from
// MAX_MEDIA_SIZE_BYTES above, which caps the COMPRESSED output. A modern
// phone photo can legitimately be 10-15MB before compression, so this only
// exists to reject truly unreasonable inputs (a mis-selected video file
// renamed to .jpg, a multi-hundred-MB image) before wasting a main-thread
// compression pass on something no real photo would ever be.
export const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

// Exact allow-list, not a wildcard — matches storage.rules' own allow-list
// exactly (Phase 9 hardening: the previous `image/.*` pattern on both sides
// would have accepted image/svg+xml, whose payload is XML/script-capable,
// and image/gif, never audited for animation/size/cost implications).
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export const isAllowedImageMimeType = (type: string): type is AllowedImageMimeType =>
  (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);

/**
 * Video, web Batch 3.
 *
 * Only formats a browser can play with no server-side transcoding, because
 * this project has no transcoding infrastructure and will not pretend
 * otherwise. A file the browser cannot decode is rejected when it is picked,
 * not accepted and left unplayable for everyone else.
 */
export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export const isAllowedVideoMimeType = (type: string): type is AllowedVideoMimeType =>
  (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(type);

/**
 * Hard ceilings for video. Deliberately small.
 *
 * A community clip is a 20-second "look what my quad did", not a film. 40MB and
 * 60 seconds keep a single post's storage and egress cost in the same order of
 * magnitude as a handful of images, which is the only footing on which video
 * can be offered at all without a cost model nobody has built yet. Both are
 * re-stated in `storage.rules` (bytes) and `firestore.rules` (declared
 * duration) so neither depends on this file being obeyed.
 */
export const MAX_VIDEO_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 60;

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

export interface DecodedVideo {
  width: number;
  height: number;
  durationSeconds: number;
  /** A real frame, captured from the decoded video — not a placeholder. */
  posterBlob: Blob | null;
}

/**
 * Decode a video far enough to learn what it actually is, and grab a frame.
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT
 * -------------------------------------
 * It proves the browser can DECODE the file: a renamed executable, a corrupt
 * container or a codec no browser supports never resolves here, so it can
 * never reach Storage. That is the same class of check `verifyImageDecodable`
 * already performs for images, and it is the strongest one available without a
 * server-side media pipeline.
 *
 * It does NOT make the returned duration or dimensions trustworthy in a
 * security sense — they are produced in the user's browser and a modified
 * client could report anything. They are treated exactly as image dimensions
 * already are: bounded by `firestore.rules` so a false value cannot be
 * damaging, and never used for an authorisation decision. Server-side
 * re-verification would need a Cloud Function with a media probe, which is
 * documented as outstanding rather than implied.
 *
 * The poster frame is a genuine capture, seeked one second in (or to the
 * midpoint of a very short clip) because frame zero of a flight video is
 * usually a blurred takeoff or a black frame.
 */
export const decodeVideo = async (file: Blob): Promise<DecodedVideo | null> => {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;

  try {
    const meta = await new Promise<{ width: number; height: number; duration: number } | null>(resolve => {
      const done = (v: { width: number; height: number; duration: number } | null) => resolve(v);
      video.onloadedmetadata = () => done({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      video.onerror = () => done(null);
      // A file that never fires either event (a container the browser opens but
      // cannot progress on) must not hang the composer forever.
      setTimeout(() => done(null), 15_000);
      video.src = url;
    });

    if (!meta || !Number.isFinite(meta.duration) || meta.duration <= 0) return null;
    if (meta.width <= 0 || meta.height <= 0) return null;

    const posterBlob = await capturePoster(video, meta).catch(() => null);
    return {
      width: meta.width,
      height: meta.height,
      durationSeconds: meta.duration,
      posterBlob,
    };
  } finally {
    video.src = '';
    URL.revokeObjectURL(url);
  }
};

async function capturePoster(
  video: HTMLVideoElement,
  meta: { width: number; height: number; duration: number },
): Promise<Blob | null> {
  const seekTo = Math.min(1, meta.duration / 2);
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error('seek failed'));
    setTimeout(() => reject(new Error('seek timed out')), 10_000);
    video.currentTime = seekTo;
  });

  // Scaled to the same 400px box the image thumbnail uses, so a feed row costs
  // the same whichever medium it carries.
  const scale = Math.min(1, 400 / Math.max(meta.width, meta.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(meta.width * scale));
  canvas.height = Math.max(1, Math.round(meta.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return new Promise<Blob | null>(resolve => {
    canvas.toBlob(b => resolve(b), 'image/jpeg', 0.72);
  });
}

// browser-image-compression's useWebWorker:true creates its Worker from a
// blob: URL. vercel.json's CSP has no worker-src directive, so per spec that
// falls back to script-src — which allows 'self'/'unsafe-inline'/
// 'unsafe-eval' plus https://apis.google.com, but not blob: — so the browser
// silently blocks the Worker's creation. useWebWorker:false runs compression
// on the main thread instead, sidestepping the CSP gap entirely rather than
// widening the CSP to admit blob: workers.
const IMAGE_COMPRESSION_OPTIONS = { useWebWorker: false } as const;

// With compression now on the main thread and Storage upload subject to
// whatever the user's real network conditions are, neither step had an
// upper bound — a stalled connection (or, before this fix, the CSP-blocked
// Worker silently never resolving) left `submitting` stuck true forever,
// with no feedback and no way to retry short of a full reload. 40s is
// comfortably above what real main-thread compression of a typical phone
// photo (well under 2s even on modest hardware) plus two Storage uploads
// (full + thumbnail, under 1MB combined post-compression) take on a normal
// connection, while still short enough that a genuinely broken connection
// surfaces a retry prompt instead of an indefinitely frozen composer.
export const MEDIA_UPLOAD_TIMEOUT_MS = 40_000;

/**
 * Video gets a far longer budget than an image, because 40MB over a phone
 * connection legitimately takes minutes. The upload is resumable and
 * cancellable, so a slow connection is a progress bar rather than a freeze —
 * this ceiling exists only to stop a permanently dead connection from pinning
 * the composer open forever.
 */
export const VIDEO_UPLOAD_TIMEOUT_MS = 10 * 60_000;

// Thrown only by the timeout race below — lets useComposer.ts's catch block
// show a specific "the image failed to upload" message instead of the
// generic post-publish-failed one, without any other error path changing.
export class MediaUploadTimeoutError extends Error {
  constructor() {
    super('MEDIA_UPLOAD_TIMEOUT');
    this.name = 'MediaUploadTimeoutError';
  }
}

/** Thrown when the person pressed «إلغاء». Distinguished so it is never shown as a failure. */
export class MediaUploadCancelledError extends Error {
  constructor() {
    super('MEDIA_UPLOAD_CANCELLED');
    this.name = 'MediaUploadCancelledError';
  }
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new MediaUploadTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

/** A video upload's result. Same shape plus the two fields only video has. */
export interface UploadedVideo extends UploadedMedia {
  durationSeconds: number;
  /** The file extension actually stored, so deletion can reconstruct the ref. */
  ext: 'mp4' | 'webm';
}

/**
 * A cancellation handle handed to the caller.
 *
 * Passed IN rather than returned, because the caller needs it the instant the
 * upload starts — a handle returned by an awaited promise arrives only once the
 * upload has already finished, which is exactly when cancelling is pointless.
 */
export interface UploadControl {
  /** Called by the pipeline with a function that aborts the in-flight transfer. */
  onStart?: (cancel: () => void) => void;
}

// Generic validate → compress → upload pipeline (D4). Image handler now;
// video is handled by uploadVideoMedia below.
//
// EXIF orientation: browser-image-compression auto-detects and corrects
// EXIF orientation by default whenever the `exifOrientation` option is left
// unset (verified against the installed v2.0.2 source — it calls its own
// getExifOrientation()/followExifOrientation() internally in that case).
// This call deliberately does NOT pass `exifOrientation`, so that default
// auto-correction stays active — no custom EXIF-parsing code needed.
export const uploadMediaWith = async (
  storage: FirebaseStorage,
  file: File,
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | null> => {
  if (!isAllowedImageMimeType(file.type)) {
    throw new Error('NOT_AN_ALLOWED_IMAGE_TYPE');
  }

  return withTimeout(
    uploadMediaInner(storage, file, uid, postId, onProgress, control),
    MEDIA_UPLOAD_TIMEOUT_MS,
  );
};

/**
 * Run an upload task, reporting progress and honouring cancellation.
 *
 * Shared by the image and video paths so "cancel" means the same thing on both:
 * `task.cancel()` aborts the transfer, Firebase rejects the task with
 * `storage/canceled`, and that is translated into `MediaUploadCancelledError`
 * so a caller can tell "the person changed their mind" from "the upload broke".
 */
const runUpload = (
  task: UploadTask,
  onPct: (pct: number) => void,
  control?: UploadControl,
): Promise<void> =>
  new Promise((resolve, reject) => {
    control?.onStart?.(() => task.cancel());
    task.on(
      'state_changed',
      snapshot => onPct(snapshot.totalBytes > 0
        ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        : 0),
      err => reject(
        (err as { code?: string })?.code === 'storage/canceled'
          ? new MediaUploadCancelledError()
          : err,
      ),
      () => resolve(),
    );
  });

const uploadMediaInner = async (
  storage: FirebaseStorage,
  file: File,
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | null> => {
  const [fullBlob, thumbBlob] = await Promise.all([
    imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: 0.3, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
    imageCompression(file, { maxWidthOrHeight: 400, maxSizeMB: 0.04, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
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
  const fullRef = ref(storage, `${folder}/${uuid}.jpg`);
  const thumbRef = ref(storage, `${folder}/${uuid}_thumb.jpg`);

  // Both transfers share one cancel handle, so «إلغاء» stops the pair rather
  // than leaving a half-uploaded thumbnail behind.
  const cancels: (() => void)[] = [];
  const collect: UploadControl = { onStart: c => cancels.push(c) };
  control?.onStart?.(() => cancels.forEach(c => c()));

  await Promise.all([
    runUpload(uploadBytesResumable(fullRef, fullBlob, { contentType: 'image/jpeg' }), pct => onProgress?.(pct, 0), collect),
    runUpload(uploadBytesResumable(thumbRef, thumbBlob, { contentType: 'image/jpeg' }), pct => onProgress?.(0, pct), collect),
  ]);

  const [mediaURL, thumbnailURL] = await Promise.all([getDownloadURL(fullRef), getDownloadURL(thumbRef)]);

  return { mediaURL, thumbnailURL, mediaSize: fullBlob.size, mediaPath: folder, width: dims.width, height: dims.height, uuid };
};

/**
 * Upload one video plus a poster frame captured from it.
 *
 * The poster is not optional decoration: without it a feed row for a video post
 * would either show nothing or force the browser to fetch part of a 40MB file
 * just to paint a first frame. Uploading a real captured frame as an ordinary
 * `{uuid}_thumb.jpg` means a video post costs a feed row exactly what an image
 * post does, and means `cleanupPostMedia`'s prefix delete already removes it
 * with no new code.
 *
 * If the frame capture fails (a codec that decodes but will not paint to a
 * canvas), the upload is REFUSED rather than proceeding posterless — a video
 * the feed cannot represent is worse than no video.
 */
export const uploadVideoWith = async (
  storage: FirebaseStorage,
  file: File,
  uid: string,
  postId: string,
  onProgress?: (pct: number) => void,
  control?: UploadControl,
): Promise<UploadedVideo | null> => {
  if (!isAllowedVideoMimeType(file.type)) {
    throw new Error('NOT_AN_ALLOWED_VIDEO_TYPE');
  }
  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error('VIDEO_TOO_LARGE');
  }

  return withTimeout(
    uploadVideoInner(storage, file, uid, postId, onProgress, control),
    VIDEO_UPLOAD_TIMEOUT_MS,
  );
};

const uploadVideoInner = async (
  storage: FirebaseStorage,
  file: File,
  uid: string,
  postId: string,
  onProgress?: (pct: number) => void,
  control?: UploadControl,
): Promise<UploadedVideo | null> => {
  const decoded = await decodeVideo(file);
  if (!decoded) return null;
  if (decoded.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error('VIDEO_TOO_LONG');
  }
  if (!decoded.posterBlob) return null;

  const uuid = crypto.randomUUID();
  const ext: 'mp4' | 'webm' = file.type === 'video/webm' ? 'webm' : 'mp4';
  const folder = mediaFolderPath(uid, postId);
  const videoRef = ref(storage, `${folder}/${uuid}.${ext}`);
  const posterRef = ref(storage, `${folder}/${uuid}_thumb.jpg`);

  const cancels: (() => void)[] = [];
  const collect: UploadControl = { onStart: c => cancels.push(c) };
  control?.onStart?.(() => cancels.forEach(c => c()));

  // Poster first and separately: it is tiny, so if the person cancels during
  // the long video transfer the wasted work is negligible, and the progress the
  // bar reports is then genuinely the video's own progress rather than a blend
  // of two very differently sized transfers.
  await runUpload(uploadBytesResumable(posterRef, decoded.posterBlob, { contentType: 'image/jpeg' }), () => {}, collect);
  await runUpload(uploadBytesResumable(videoRef, file, { contentType: file.type }), pct => onProgress?.(pct), collect);

  const [mediaURL, thumbnailURL] = await Promise.all([getDownloadURL(videoRef), getDownloadURL(posterRef)]);

  return {
    mediaURL,
    thumbnailURL,
    mediaSize: file.size,
    mediaPath: folder,
    width: decoded.width,
    height: decoded.height,
    durationSeconds: Math.round(decoded.durationSeconds),
    uuid,
    ext,
  };
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
export const deleteMediaWith = async (
  storage: FirebaseStorage,
  media: Pick<UploadedMedia, 'mediaPath' | 'uuid'> & { ext?: string },
): Promise<MediaDeleteResult> => {
  // `ext` defaults to jpg so every existing image call site is unchanged.
  const mainRef = ref(storage, `${media.mediaPath}/${media.uuid}.${media.ext ?? 'jpg'}`);
  const thumbRef = ref(storage, `${media.mediaPath}/${media.uuid}_thumb.jpg`);

  const [full, thumbnail] = await Promise.all([
    classifyAndRetryDelete(() => deleteObject(mainRef), 'full image', mainRef.fullPath),
    classifyAndRetryDelete(() => deleteObject(thumbRef), 'thumbnail', thumbRef.fullPath),
  ]);

  return deriveMediaDeleteResult(full, thumbnail);
};
