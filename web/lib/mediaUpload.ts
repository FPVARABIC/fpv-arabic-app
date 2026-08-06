'use client';

import imageCompression from 'browser-image-compression';
import { browserBackend } from '@/lib/backend/supabase/client';

/**
 * The web's media pipeline — validate, compress, upload, delete — on the
 * storage port.
 *
 * WHY THIS NO LONGER IMPORTS THE SHARED PIPELINE
 * ----------------------------------------------
 * `@core/community/Composer/mediaPipeline.ts` opens with an import of
 * `firebase/storage`, and importing ANY value from a module executes all of
 * it. One line from that file in the web graph puts the Firebase SDK back in
 * the web bundle — the exact thing phase five removes. The phone app keeps
 * that pipeline untouched (Android is explicitly frozen); the web now carries
 * its own copy of the LIMITS and the same behaviour on a different writer.
 *
 * THE NUMBERS ARE THE PHONE APP'S NUMBERS, ON PURPOSE
 * ---------------------------------------------------
 * Same MIME allow-lists, same 500KB compressed ceiling, same 20MB raw input
 * bound, same 40MB/60s video budget, same 1600px/400px targets, same
 * `{uuid}.jpg` / `{uuid}_thumb.jpg` naming. Two surfaces disagreeing about
 * «what may be uploaded» is the failure the shared pipeline existed to
 * prevent — so `scripts/testWebCommunity.ts` now asserts these constants
 * EQUAL the core file's, by reading it as text rather than importing it.
 * The duplication is checked, not trusted.
 *
 * WHERE ENFORCEMENT ACTUALLY LIVES
 * --------------------------------
 * Everything here is a courtesy so refusals are specific and instant. The
 * control is `supabase/migrations/0003_storage.sql`: bucket-level size and
 * MIME limits, re-checked in the policies, plus the `{uid}/{postId}/…` path
 * ownership — all proven by `npm run test:storage` against a real PostgreSQL.
 */

export const MAX_MEDIA_SIZE_BYTES = 500 * 1024;
export const MAX_RAW_INPUT_BYTES = 20 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export const isAllowedImageMimeType = (type: string): type is AllowedImageMimeType =>
  (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);

export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'] as const;
export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];
export const isAllowedVideoMimeType = (type: string): type is AllowedVideoMimeType =>
  (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(type);

export const MAX_VIDEO_SIZE_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_DURATION_SECONDS = 60;

export const MEDIA_UPLOAD_TIMEOUT_MS = 40_000;
export const VIDEO_UPLOAD_TIMEOUT_MS = 10 * 60_000;

export class MediaUploadTimeoutError extends Error {
  constructor() { super('MEDIA_UPLOAD_TIMEOUT'); this.name = 'MediaUploadTimeoutError'; }
}

/** Thrown when the person pressed «إلغاء». Distinguished so it is never shown as a failure. */
export class MediaUploadCancelledError extends Error {
  constructor() { super('MEDIA_UPLOAD_CANCELLED'); this.name = 'MediaUploadCancelledError'; }
}

/**
 * Verifies the file is genuinely a decodable raster image, not merely a file
 * whose declared MIME type claims so. A renamed or corrupt file fails to
 * decode and is rejected before any compression or upload work begins.
 */
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
 * Proves the browser can DECODE the file — a renamed executable or an
 * unsupported codec never resolves here, so it can never reach Storage. The
 * duration and dimensions are client-produced and treated accordingly: bounded
 * by the picker, never used for an authorisation decision.
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
      // A container the browser opens but cannot progress on must not hang the
      // composer forever.
      setTimeout(() => done(null), 15_000);
      video.src = url;
    });

    if (!meta || !Number.isFinite(meta.duration) || meta.duration <= 0) return null;
    if (meta.width <= 0 || meta.height <= 0) return null;

    const posterBlob = await capturePoster(video, meta).catch(() => null);
    return { width: meta.width, height: meta.height, durationSeconds: meta.duration, posterBlob };
  } finally {
    video.src = '';
    URL.revokeObjectURL(url);
  }
};

async function capturePoster(
  video: HTMLVideoElement,
  meta: { width: number; height: number; duration: number },
): Promise<Blob | null> {
  // Seeked one second in (or to the midpoint of a very short clip), because
  // frame zero of a flight video is usually a blurred takeoff or a black frame.
  const seekTo = Math.min(1, meta.duration / 2);
  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error('seek failed'));
    setTimeout(() => reject(new Error('seek timed out')), 10_000);
    video.currentTime = seekTo;
  });

  // The same 400px box the image thumbnail uses, so a feed row costs the same
  // whichever medium it carries.
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

// Main-thread compression, as on the phone: the worker variant builds its
// Worker from a blob: URL, which a strict CSP without worker-src silently
// blocks — a bug this project has already paid for once.
const IMAGE_COMPRESSION_OPTIONS = { useWebWorker: false } as const;

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new MediaUploadTimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
};

export interface UploadedMedia {
  mediaURL: string;
  thumbnailURL: string;
  mediaSize: number;
  /** The folder within the bucket — `{uid}/{postId}` — so deletion can rebuild the refs. */
  mediaPath: string;
  width: number;
  height: number;
  uuid: string;
}

/** A video upload's result. Same shape plus the two fields only video has. */
export interface UploadedVideo extends UploadedMedia {
  durationSeconds: number;
  ext: 'mp4' | 'webm';
}

/**
 * A cancellation handle handed to the caller.
 *
 * Passed IN rather than returned, because the caller needs it the instant the
 * upload starts. Supabase uploads are single PUTs, not resumable tasks, so
 * «cancel» here means «stop waiting and remove whatever landed» — the wait is
 * abandoned immediately and the cleanup is best-effort.
 */
export interface UploadControl {
  onStart?: (cancel: () => void) => void;
}

const BUCKET = 'community-media' as const;

/** One cancellable wrapper for both media kinds. */
function cancellable<T>(work: Promise<T>, control?: UploadControl): Promise<T> {
  let cancelled = false;
  const gate = new Promise<never>((_, reject) => {
    control?.onStart?.(() => { cancelled = true; reject(new MediaUploadCancelledError()); });
  });
  return Promise.race([
    work.then(v => { if (cancelled) throw new MediaUploadCancelledError(); return v; }),
    gate,
  ]);
}

/**
 * Compress and upload one image as `{uid}/{postId}/{uuid}.jpg` + `_thumb.jpg`.
 *
 * Progress is coarser than the Firebase version's byte-level events — the
 * Supabase upload is a single PUT — so the callback reports the three real
 * stages instead of pretending to a granularity the transport no longer has.
 */
export const uploadImage = async (
  file: File,
  uid: string,
  postId: string,
  onProgress?: (fullPct: number, thumbPct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | null> => {
  if (!isAllowedImageMimeType(file.type)) throw new Error('NOT_AN_ALLOWED_IMAGE_TYPE');

  return withTimeout(cancellable((async () => {
    onProgress?.(5, 5);
    const [fullBlob, thumbBlob] = await Promise.all([
      imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: 0.3, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
      imageCompression(file, { maxWidthOrHeight: 400, maxSizeMB: 0.04, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
    ]);

    // Best-effort library target, not a mathematical guarantee — verify the
    // real result before handing it to anything that will store it.
    if (fullBlob.size > MAX_MEDIA_SIZE_BYTES) return null;

    // Real dimensions of the actual served asset. Canvas re-encoding never
    // carries EXIF forward, so the upload structurally carries no GPS metadata
    // — nothing to strip because the re-encode never wrote any.
    const dims = await verifyImageDecodable(fullBlob);
    if (!dims) return null;
    onProgress?.(40, 40);

    const uuid = crypto.randomUUID();
    const folder = `${uid}/${postId}`;
    const { storage } = browserBackend();

    const full = await storage.upload({
      bucket: BUCKET, path: `${folder}/${uuid}.jpg`, file: fullBlob, contentType: 'image/jpeg',
    });
    if (!full.ok) throw new Error(full.errorAr);
    onProgress?.(80, 40);

    const thumb = await storage.upload({
      bucket: BUCKET, path: `${folder}/${uuid}_thumb.jpg`, file: thumbBlob, contentType: 'image/jpeg',
    });
    if (!thumb.ok) {
      // No half-pair: a post card that has a full image but no thumbnail
      // renders badly forever. Remove the full and report the failure.
      await storage.remove(BUCKET, `${folder}/${uuid}.jpg`).catch(() => {});
      throw new Error(thumb.errorAr);
    }
    onProgress?.(100, 100);

    return {
      mediaURL: full.url, thumbnailURL: thumb.url, mediaSize: fullBlob.size,
      mediaPath: folder, width: dims.width, height: dims.height, uuid,
    };
  })(), control), MEDIA_UPLOAD_TIMEOUT_MS);
};

/**
 * Upload one video plus a poster frame captured from it.
 *
 * The poster is not decoration: without it a feed row would fetch part of a
 * 40MB file to paint a first frame. If the capture fails, the upload is
 * REFUSED rather than proceeding posterless — a video the feed cannot
 * represent is worse than no video.
 */
export const uploadVideo = async (
  file: File,
  uid: string,
  postId: string,
  onProgress?: (pct: number) => void,
  control?: UploadControl,
): Promise<UploadedVideo | null> => {
  if (!isAllowedVideoMimeType(file.type)) throw new Error('NOT_AN_ALLOWED_VIDEO_TYPE');
  if (file.size > MAX_VIDEO_SIZE_BYTES) throw new Error('VIDEO_TOO_LARGE');

  return withTimeout(cancellable((async () => {
    const decoded = await decodeVideo(file);
    if (!decoded) return null;
    if (decoded.durationSeconds > MAX_VIDEO_DURATION_SECONDS) throw new Error('VIDEO_TOO_LONG');
    if (!decoded.posterBlob) return null;
    onProgress?.(10);

    const uuid = crypto.randomUUID();
    const ext: 'mp4' | 'webm' = file.type === 'video/webm' ? 'webm' : 'mp4';
    const folder = `${uid}/${postId}`;
    const { storage } = browserBackend();

    // Poster first and separately: it is tiny, so if the person cancels during
    // the long transfer the wasted work is negligible.
    const poster = await storage.upload({
      bucket: BUCKET, path: `${folder}/${uuid}_thumb.jpg`,
      file: decoded.posterBlob, contentType: 'image/jpeg',
    });
    if (!poster.ok) throw new Error(poster.errorAr);
    onProgress?.(20);

    const video = await storage.upload({
      bucket: BUCKET, path: `${folder}/${uuid}.${ext}`, file, contentType: file.type,
    });
    if (!video.ok) {
      await storage.remove(BUCKET, `${folder}/${uuid}_thumb.jpg`).catch(() => {});
      throw new Error(video.errorAr);
    }
    onProgress?.(100);

    return {
      mediaURL: video.url, thumbnailURL: poster.url, mediaSize: file.size,
      mediaPath: folder, width: decoded.width, height: decoded.height,
      durationSeconds: Math.round(decoded.durationSeconds), uuid, ext,
    };
  })(), control), VIDEO_UPLOAD_TIMEOUT_MS);
};

/* ── The store's photographs — compressed here, WRITTEN by the server ─────── */

export interface CompressedImage {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

/**
 * Compress, verify, and hand back the bytes — without uploading them.
 *
 * The shop's photographs are written by the SERVER through the admin adapter,
 * because the panel's authority is a verified session holding
 * `store.editProducts` — not a storage policy re-deriving that as a role
 * check. So the browser does what only the browser can do — resize and
 * re-encode a file the user just picked — and the server does the write.
 * Same targets and budgets as a community image; canvas re-encoding
 * guarantees no EXIF survives.
 */
export const compressProductImage = async (file: File): Promise<CompressedImage | null> => {
  if (!isAllowedImageMimeType(file.type)) throw new Error('NOT_AN_ALLOWED_IMAGE_TYPE');
  const [full, thumb] = await Promise.all([
    imageCompression(file, { maxWidthOrHeight: 1600, maxSizeMB: 0.3, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
    imageCompression(file, { maxWidthOrHeight: 400, maxSizeMB: 0.04, fileType: 'image/jpeg', ...IMAGE_COMPRESSION_OPTIONS }),
  ]);
  if (full.size > MAX_MEDIA_SIZE_BYTES) return null;
  const dims = await verifyImageDecodable(full);
  if (!dims) return null;
  return { full, thumb, width: dims.width, height: dims.height };
};

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

/**
 * Best-effort orphan cleanup, called when the upload succeeded but the post
 * insert then failed. Never throws — a failed cleanup must never mask the
 * ORIGINAL error the caller is already handling. The scheduled sweep is the
 * safety net; this is the common case.
 */
export const deleteUploadedMedia = async (
  media: Pick<UploadedMedia, 'mediaPath' | 'uuid'> & { ext?: string },
): Promise<void> => {
  const { storage } = browserBackend();
  await Promise.all([
    storage.remove(BUCKET, `${media.mediaPath}/${media.uuid}.${media.ext ?? 'jpg'}`).catch(() => {}),
    storage.remove(BUCKET, `${media.mediaPath}/${media.uuid}_thumb.jpg`).catch(() => {}),
  ]);
};
