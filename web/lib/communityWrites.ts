'use client';

import { browserBackend } from '@/lib/backend/supabase/client';
import {
  uploadImage, uploadVideo, deleteUploadedMedia,
  isAllowedImageMimeType, isAllowedVideoMimeType,
  MediaUploadCancelledError, MediaUploadTimeoutError,
  MAX_RAW_INPUT_BYTES, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_DURATION_SECONDS,
  type UploadedMedia, type UploadedVideo, type UploadControl,
} from './mediaUpload';

/**
 * Every community MUTATION, through the write port.
 *
 * WHAT CHANGED UNDERNEATH AND WHAT DID NOT
 * ----------------------------------------
 * The Firebase version's principle was «the rules are the single authority on
 * who may write what, and this file only shapes writes the rules will
 * accept». That principle SURVIVES with the database swapped: row-level
 * security is the authority now — ownership, banned accounts, the posting
 * cooldowns, the column allow-lists and the impersonation defence all live in
 * `supabase/migrations/0002` and `0006` and are proven by 74 assertions
 * against a real PostgreSQL. Everything here remains best-effort UX: if any
 * of these functions were bypassed and a raw insert attempted, the policies
 * would still refuse it.
 *
 * Three jobs Firestore made the CLIENT do are now the DATABASE's, and this
 * file simply stopped doing them:
 *
 *   the author's name    a trigger copies it from the profile — a spoofed
 *                        value is overwritten, not validated
 *   the counters         triggers maintain them; there is no increment to
 *                        forget and no batch to get wrong
 *   the rate-limit arm   the cooldown is IN the insert policy; there is no
 *                        `lastPostAt` stamp whose omission would disarm it
 *
 * The courtesy cooldown check below keeps the «انتظر…» message — it reads a
 * localStorage stamp this browser wrote, which is exactly as trustworthy as
 * it needs to be for a message. The policy is the enforcement.
 */

export const POST_TEXT_MAX = 2000;
/**
 * 500, because that is what the database enforces for a comment. A limit the
 * UI advertises must be the limit the database actually applies — the
 * mismatch was a real defect once: an 800-character comment failed AFTER the
 * person had done all the work.
 */
export const COMMENT_TEXT_MAX = 500;

/**
 * The anti-spam windows `0006`'s insert policies enforce, restated so the UI
 * can explain a refusal instead of surfacing a raw policy error. Changing
 * either number here does NOT change the limit — the policies do that.
 */
export const POST_COOLDOWN_MS = 60_000;
export const COMMENT_COOLDOWN_MS = 5_000;

const POST_STAMP_KEY = 'fpv-web:lastPostAt';
const COMMENT_STAMP_KEY = 'fpv-web:lastCommentAt';

/** The courtesy half of the cooldown: a local stamp, for a specific message. */
function checkCooldown(key: string, windowMs: number, verbAr: string): void {
  try {
    const at = Number(localStorage.getItem(key) ?? 0);
    const waited = Date.now() - at;
    if (at > 0 && waited < windowMs) {
      throw new Error(`انتظر ${Math.ceil((windowMs - waited) / 1000)} ثانية قبل ${verbAr}.`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('انتظر')) throw e;
    // localStorage unavailable (private mode) — the policy still enforces.
  }
}

function stamp(key: string): void {
  try { localStorage.setItem(key, String(Date.now())); } catch { /* policy enforces */ }
}

export interface CreatePostInput {
  text: string;
  category?: string | null;
  /** The picked file, if any. Uploaded by this function — never by the caller. */
  file?: File | null;
  onProgress?: (pct: number) => void;
  control?: UploadControl;
}

/**
 * Create a post — text, or text plus one image or video.
 *
 * THE POST ID IS MINTED BEFORE THE UPLOAD, NOT AFTER.
 *
 * The storage policies only accept an upload under `{uid}/{postId}/…`, so the
 * id has to exist before a single byte moves. The id is minted here, the
 * media lands under it, and the row is inserted carrying the same id — which
 * is why the write port accepts one.
 */
export async function createPost(input: CreatePostInput): Promise<string> {
  const { auth, write } = browserBackend();
  const user = await auth.currentUser();
  if (!user) {
    throw new Error('انتهت جلسة المتصفح. سجّل الخروج ثم الدخول مرة أخرى لمتابعة الكتابة.');
  }

  const text = input.text.trim();
  // Text is required only when there is nothing else — an image or a video is
  // content on its own, and demanding a caption would be this function
  // enforcing a stricter rule than the platform has.
  if (!text && !input.file) throw new Error('اكتب نصّ المنشور أو أرفق ملفاً');
  if (text.length > POST_TEXT_MAX) throw new Error('النص أطول من الحد المسموح');

  checkCooldown(POST_STAMP_KEY, POST_COOLDOWN_MS, 'نشر منشور جديد');

  const postId = crypto.randomUUID();
  const media = input.file
    ? await uploadFor(input.file, user.id, postId, input.onProgress, input.control)
    : null;

  const result = await write.createPost({
    id: postId,
    text,
    category: (input.category ?? null) as Parameters<typeof write.createPost>[0]['category'],
    media: media
      ? {
          type: 'durationSeconds' in media ? 'video' : 'image',
          url: media.mediaURL,
          thumbnailURL: media.thumbnailURL,
          width: media.width,
          height: media.height,
          duration: 'durationSeconds' in media ? (media as UploadedVideo).durationSeconds : undefined,
        }
      : undefined,
  });

  if (!result.ok) {
    // COMPENSATION: the bytes are in Storage but no post references them, so
    // they are an orphan the moment this fails. Deleting them here is the
    // cheapest possible cleanup — while we still know exactly which two
    // objects they are. Best-effort by necessity; the scheduled sweep is the
    // safety net.
    if (media) await deleteUploadedMedia(media).catch(() => { /* the sweep will catch it */ });
    throw new Error(result.errorAr);
  }

  stamp(POST_STAMP_KEY);
  return result.id;
}

/**
 * Pick the right uploader for what the person actually chose, and translate
 * every refusal into something a human can act on. The type checks here are a
 * courtesy so the message is specific; the storage policies are the control.
 */
async function uploadFor(
  file: File,
  uid: string,
  postId: string,
  onProgress?: (pct: number) => void,
  control?: UploadControl,
): Promise<UploadedMedia | UploadedVideo | null> {
  try {
    if (isAllowedImageMimeType(file.type)) {
      if (file.size > MAX_RAW_INPUT_BYTES) {
        throw new Error('الصورة أكبر من الحد المسموح قبل الضغط.');
      }
      const media = await uploadImage(file, uid, postId, (full, thumb) => onProgress?.(Math.max(full, thumb)), control);
      if (!media) throw new Error('تعذّر ضغط الصورة بما يكفي. جرّب صورة أخرى.');
      return media;
    }

    if (isAllowedVideoMimeType(file.type)) {
      if (file.size > MAX_VIDEO_SIZE_BYTES) {
        throw new Error(`الفيديو أكبر من ${Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))} ميغابايت.`);
      }
      const media = await uploadVideo(file, uid, postId, onProgress, control);
      if (!media) throw new Error('تعذّر قراءة هذا الفيديو. جرّب ملفاً بصيغة MP4 أو WebM.');
      return media;
    }

    throw new Error('نوع الملف غير مدعوم. الصور: JPEG أو PNG أو WebP. الفيديو: MP4 أو WebM.');
  } catch (err) {
    if (err instanceof MediaUploadCancelledError) throw err;
    if (err instanceof MediaUploadTimeoutError) {
      throw new Error('استغرق الرفع وقتاً طويلاً. تحقّق من الاتصال وأعد المحاولة.');
    }
    if (err instanceof Error && err.message === 'VIDEO_TOO_LONG') {
      throw new Error(`الفيديو أطول من ${MAX_VIDEO_DURATION_SECONDS} ثانية.`);
    }
    if (err instanceof Error && err.message === 'VIDEO_TOO_LARGE') {
      throw new Error(`الفيديو أكبر من ${Math.round(MAX_VIDEO_SIZE_BYTES / (1024 * 1024))} ميغابايت.`);
    }
    throw err;
  }
}

/** Edit a post's text. Ownership and the column allow-list are the database's. */
export async function editPostText(postId: string, text: string): Promise<void> {
  const trimmed = text.trim();
  if (trimmed.length > POST_TEXT_MAX) throw new Error('النص أطول من الحد المسموح');
  const r = await browserBackend().write.editPost(postId, trimmed);
  if (!r.ok) throw new Error(r.errorAr);
}

/**
 * Soft-delete a post. `status: 'deleted'` only — the platform has never
 * hard-deleted a post, and no client DELETE policy exists at all. Keeping the
 * row preserves comment threads and the moderation record.
 */
export async function softDeletePost(postId: string): Promise<void> {
  const r = await browserBackend().write.deleteOwnPost(postId);
  if (!r.ok) throw new Error(r.errorAr);
}

/**
 * Add a comment. The post's counter is the database's job now — a trigger
 * maintains it, so there is no second write to order carefully and no stale
 * count when one half fails.
 */
export async function createComment(postId: string, text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('اكتب نصّ التعليق');
  if (trimmed.length > COMMENT_TEXT_MAX) throw new Error('التعليق أطول من الحد المسموح');

  checkCooldown(COMMENT_STAMP_KEY, COMMENT_COOLDOWN_MS, 'التعليق مرة أخرى');

  const r = await browserBackend().write.createComment(postId, trimmed);
  if (!r.ok) throw new Error(r.errorAr);
  stamp(COMMENT_STAMP_KEY);
  return r.id;
}

/** Soft-delete one's own comment. Ownership is enforced by the policies. */
export async function softDeleteComment(_postId: string, commentId: string): Promise<void> {
  const r = await browserBackend().write.deleteOwnComment(commentId);
  if (!r.ok) throw new Error(r.errorAr);
}

export type ReportReason = 'spam' | 'abuse' | 'dangerous' | 'other';

/**
 * The longest explanatory note a report carries, and the only reason it
 * carries one for. The UI hides the field for other reasons; this constant is
 * what makes the two agree even if the UI is bypassed.
 */
export const REPORT_NOTE_MAX = 200;
export const REPORT_REASON_WITH_NOTE: ReportReason = 'other';

/**
 * Report a post or comment.
 *
 * The duplicate check is the DATABASE's — `reports_one_open_per_reporter` is
 * a partial unique index, so a second open report from the same person on the
 * same target is refused mechanically and the port translates it to «سبق أن
 * أبلغت». No read-back is needed, which is fortunate, because a reporter
 * cannot read the queue at all: knowing a report is still «open» tells a bad
 * actor a moderator has not acted yet.
 */
export async function reportContent(input: {
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  reason: ReportReason;
  note?: string | null;
}): Promise<void> {
  const note = input.reason === REPORT_REASON_WITH_NOTE && input.note?.trim()
    ? input.note.trim().slice(0, REPORT_NOTE_MAX)
    : undefined;

  const r = await browserBackend().write.report({
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: note,
  });
  if (!r.ok) {
    throw new Error(r.errorAr.includes('سبق') ? 'سبق أن أبلغت عن هذا المحتوى' : r.errorAr);
  }
}
