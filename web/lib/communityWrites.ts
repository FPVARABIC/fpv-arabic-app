'use client';

import {
  collection, doc, updateDoc, addDoc, writeBatch,
  serverTimestamp, increment, getDoc, query, where, getDocs, limit as qLimit,
} from 'firebase/firestore';
import { clientAuth, clientDb } from './firebaseClient';
import { normalizeDisplayName } from '@core/community/utils/userSearch';
import {
  uploadImage, uploadVideo, deleteUploadedMedia,
  isAllowedImageMimeType, isAllowedVideoMimeType,
  MediaUploadCancelledError, MediaUploadTimeoutError,
  MAX_RAW_INPUT_BYTES, MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_DURATION_SECONDS,
  type UploadedMedia, type UploadedVideo, type UploadControl,
} from './mediaUpload';

/**
 * Every community MUTATION, performed from the browser on the client SDK.
 *
 * WHY THE BROWSER AND NOT A SERVER ROUTE
 * -------------------------------------
 * Because `firestore.rules` is already the authority on who may write what, and
 * it has 234 emulator assertions behind it covering ownership, banned accounts,
 * field allow-lists and forged timestamps. Routing these writes through a
 * server endpoint would mean re-implementing all of that in TypeScript and
 * having TWO answers to "may this user edit this post". The rules are the
 * single enforcement point, exactly as they are for the phone app.
 *
 * Everything here is therefore best-effort UX: it shapes a write so the rules
 * will accept it. If any of these functions were bypassed entirely and a raw
 * write attempted from a console, the rules would still refuse it — which is
 * the property that matters and the one the emulator tests prove.
 *
 * WHAT IS DELIBERATELY NOT SENT
 * -----------------------------
 * `authorId` is taken from the verified Firebase user, never from an argument.
 * `status` is always the literal the rules demand. `createdAt`/`editedAt` are
 * `serverTimestamp()`, never a client clock. `likesCount`, `feedScore` and the
 * moderation fields are either fixed constants at creation or absent entirely —
 * a caller cannot pass them in because no parameter accepts them.
 */

/**
 * Firestore for the browser, from the ONE place that knows whether this
 * environment is talking to the real project or to the local emulator.
 */
const db = clientDb;

/**
 * The signed-in browser user, or a thrown error the UI turns into a message.
 *
 * WHY THIS AWAITS INSTEAD OF READING `currentUser` DIRECTLY
 * --------------------------------------------------------
 * Firebase restores the browser's auth state from IndexedDB ASYNCHRONOUSLY.
 * `auth.currentUser` is `null` until that finishes — not because nobody is
 * signed in, but because the SDK has not looked yet. Every page here is
 * server-rendered from the session cookie and nothing in the tree subscribes to
 * auth state, so there is no other thing forcing that wait: reading
 * `currentUser` synchronously means whoever clicks quickly enough writes as
 * nobody and gets «يلزم تسجيل الدخول» on a page that just greeted them by name.
 *
 * `authStateReady()` is the SDK's own "restoration has settled" promise. It
 * resolves immediately once initialisation is done, so this costs nothing after
 * the first call.
 *
 * THE SECOND CASE IT DISTINGUISHES
 * --------------------------------
 * If restoration settles and there is still no user while the server-rendered
 * page believed there was one, the two halves genuinely disagree: the httpOnly
 * session cookie is valid but the browser's own Firebase credentials are gone
 * (cleared storage, a private window, an eviction). Telling that person to
 * "sign in" while the header shows them signed in is useless, so the message
 * says what actually happened and what fixes it.
 */
async function requireUser() {
  const auth = clientAuth();
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) {
    throw new Error(
      'انتهت جلسة المتصفح. سجّل الخروج ثم الدخول مرة أخرى لمتابعة الكتابة.',
    );
  }
  return user;
}

/**
 * Search tokens, produced the same way the phone app produces them.
 *
 * Imported from the shared core rather than reimplemented: two different
 * tokenisers would make a post findable on one surface and invisible on the
 * other, and the divergence would be silent.
 */
function tokensFor(text: string): string[] {
  return Array.from(new Set(
    normalizeDisplayName(text)
      .split(/\s+/)
      .filter(t => t.length >= 2),
  )).slice(0, 30);
}

export const POST_TEXT_MAX = 2000;
/**
 * 500, because that is what `firestore.rules` enforces for a comment
 * (`text.size() <= 500`). This was 1000 and that was a real defect: the
 * composer let someone write 800 characters, disabled nothing, and then failed
 * the write with a permission error after they had done all the work. A limit
 * the UI advertises must be the limit the database actually applies.
 */
export const COMMENT_TEXT_MAX = 500;

/**
 * The anti-spam windows `firestore.rules` enforces, restated so the UI can
 * explain a refusal instead of surfacing a raw permission error. Changing
 * either number here does NOT change the limit — the rules do that.
 */
export const POST_COOLDOWN_MS = 60_000;
export const COMMENT_COOLDOWN_MS = 5_000;

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
 * The shape mirrors `firestore.rules`' create allow-list exactly, including the
 * constants it demands (`status: 'active'`, `commentsCount: 0`, `likesCount: 0`,
 * `feedScore: 100`). Those are not this function's opinion — they are what the
 * rules validate, and getting one wrong produces a permission error rather than
 * a bad document, which is the correct failure direction.
 *
 * WHY THE PROFILE IS UPDATED IN THE SAME BATCH
 * --------------------------------------------
 * `firestore.rules` enforces a 60-second anti-spam limit on posting by reading
 * `callerProfile().lastPostAt`, and it is the AUTHOR'S OWN profile write that
 * arms it. A surface that creates the post without bumping `lastPostAt` does
 * not merely forget a counter — it walks straight past a control the phone app
 * has always been subject to, letting a web client post as fast as it can issue
 * requests. This was exactly that bug until the end-to-end test caught it.
 *
 * `writeBatch` rather than two writes, mirroring the phone's composer: the post
 * and the rate-limit stamp land together or not at all, so there is no window
 * in which a post exists with the limit un-armed.
 */
export async function createPost(input: CreatePostInput): Promise<string> {
  const user = await requireUser();
  const text = input.text.trim();
  // Text is required only when there is nothing else. An image or a video is
  // content on its own — `firestore.rules` permits an empty-text post exactly
  // when it carries media — so demanding a caption here would be this function
  // enforcing a stricter rule than the platform has.
  if (!text && !input.file) throw new Error('اكتب نصّ المنشور أو أرفق ملفاً');
  if (text.length > POST_TEXT_MAX) throw new Error('النص أطول من الحد المسموح');

  // authorName/authorPhoto must equal the profile document, because the rules
  // compare them against it. Reading the profile is not a trust decision — the
  // rules re-check it — it is how the write is made acceptable.
  const userRef = doc(db(), 'users', user.uid);
  const profileSnap = await getDoc(userRef);
  const profile = profileSnap.data() ?? {};

  // The same 60s window the rules apply, checked here only so the person gets
  // «انتظر…» instead of an opaque permission error. The rules remain the
  // enforcement; this is the explanation.
  const lastPostAt = profile.lastPostAt as { toMillis?: () => number } | null | undefined;
  if (lastPostAt?.toMillis) {
    const waited = Date.now() - lastPostAt.toMillis();
    if (waited < POST_COOLDOWN_MS) {
      throw new Error(`انتظر ${Math.ceil((POST_COOLDOWN_MS - waited) / 1000)} ثانية قبل نشر منشور جديد.`);
    }
  }

  // THE POST ID IS MINTED BEFORE THE UPLOAD, NOT AFTER.
  //
  // `storage.rules` only accepts writes under
  // `community/posts/{uid}/{postId}/`, and `firestore.rules` only accepts a
  // post whose `mediaPath` equals exactly that string for ITS OWN id. So the id
  // has to exist before a single byte is uploaded. This is also why the file
  // cannot be uploaded by a component ahead of time and handed in: it would not
  // know which folder it belongs in.
  const postRef = doc(collection(db(), 'posts'));
  const media = input.file
    ? await uploadFor(input.file, user.uid, postRef.id, input.onProgress, input.control)
    : null;

  try {
    const batch = writeBatch(db());
    batch.set(postRef, {
      authorId: user.uid,
      authorName: profile.displayName ?? user.displayName ?? 'طيّار',
      authorPhoto: profile.photoURL ?? null,
      text,
      ...(input.category ? { category: input.category } : {}),
      ...mediaFields(media),
      commentsCount: 0,
      likesCount: 0,
      createdAt: serverTimestamp(),
      status: 'active',
      searchTokens: tokensFor(text),
      feedScore: 100,
    });
    batch.update(userRef, { lastPostAt: serverTimestamp(), postsCount: increment(1) });
    await batch.commit();
  } catch (err) {
    // COMPENSATION: the bytes are in Storage but no post references them, so
    // they are an orphan the moment this throws. Deleting them here is the
    // cheapest possible cleanup — it happens while we still know exactly which
    // two objects they are, with no listing, no scheduled job and no delay.
    //
    // It is best-effort by necessity (the tab may be closing, the network may
    // be the very thing that failed), which is why the scheduled sweep
    // described in docs/platform/14-MEDIA-LIFECYCLE.md still has to exist. It
    // is the safety net; this is the common case.
    if (media) {
      await deleteUploadedMedia(media).catch(() => { /* the sweep will catch it */ });
    }
    throw err;
  }

  return postRef.id;
}

/**
 * Pick the right uploader for what the person actually chose, and translate
 * every refusal into something a human can act on.
 *
 * The type checks here are a courtesy so the message is specific; they are not
 * the control. `storage.rules` refuses a disallowed content type outright, and
 * `firestore.rules` refuses a post whose media fields do not match what was
 * uploaded — both proven in the emulator suite.
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

/**
 * The media half of a post document.
 *
 * Every field is written on every post, present or absent, because
 * `firestore.rules` validates the WHOLE set as one shape: a text post must have
 * all of them null, and a media post must have all of them populated
 * consistently. Omitting a key rather than nulling it would fail the create.
 *
 * `mediaPath` is not passed through from the uploader by accident — it is the
 * uploader's own computed folder, which the rules then re-derive from
 * `request.auth.uid` and the post id and compare. A client that made one up
 * would be refused.
 */
function mediaFields(media: UploadedMedia | UploadedVideo | null) {
  if (!media) {
    return {
      mediaType: 'none' as const,
      mediaURL: null, thumbnailURL: null, mediaSize: null,
      mediaDuration: null, mediaPath: null, mediaWidth: null, mediaHeight: null,
    };
  }
  const isVideo = 'durationSeconds' in media;
  return {
    mediaType: (isVideo ? 'video' : 'image') as 'video' | 'image',
    mediaURL: media.mediaURL,
    thumbnailURL: media.thumbnailURL,
    mediaSize: media.mediaSize,
    mediaDuration: isVideo ? (media as UploadedVideo).durationSeconds : null,
    mediaPath: media.mediaPath,
    mediaWidth: media.width,
    mediaHeight: media.height,
  };
}

/**
 * Edit a post's text.
 *
 * Sends exactly the three fields the new rules branch permits. Anything else in
 * this object would make the whole write fail `hasOnly()` — which is the point:
 * an edit is structurally incapable of changing ownership, status or ranking.
 */
export async function editPostText(postId: string, text: string): Promise<void> {
  await requireUser();
  const trimmed = text.trim();
  if (trimmed.length > POST_TEXT_MAX) throw new Error('النص أطول من الحد المسموح');

  await updateDoc(doc(db(), 'posts', postId), {
    text: trimmed,
    searchTokens: tokensFor(trimmed),
    editedAt: serverTimestamp(),
  });
}

/**
 * Soft-delete a post.
 *
 * `status: 'deleted'` only — the platform has never hard-deleted a post, and
 * the rules forbid it outright (`allow delete: if false`). Keeping the document
 * preserves comment threads and the moderation record.
 */
export async function softDeletePost(postId: string): Promise<void> {
  await requireUser();
  await updateDoc(doc(db(), 'posts', postId), { status: 'deleted' });
}

/**
 * Add a comment, and bump the post's counter.
 *
 * Two writes, because the counter lives on the post document and the rules
 * validate the increment as its own narrow diff. The comment is written FIRST:
 * if the counter write then fails, the comment still exists and the count is
 * merely low — the reverse order would show a count for a comment nobody can
 * read, which is worse.
 */
export async function createComment(postId: string, text: string): Promise<string> {
  const user = await requireUser();
  const trimmed = text.trim();
  if (!trimmed) throw new Error('اكتب نصّ التعليق');
  if (trimmed.length > COMMENT_TEXT_MAX) throw new Error('التعليق أطول من الحد المسموح');

  const userRef = doc(db(), 'users', user.uid);
  const profileSnap = await getDoc(userRef);
  const profile = profileSnap.data() ?? {};

  // Same story as posting: the rules gate commenting on
  // `callerProfile().lastCommentAt` with a 5-second window, and it is this
  // write that arms it. Omitting it would exempt the web from a limit the
  // phone obeys.
  const lastCommentAt = profile.lastCommentAt as { toMillis?: () => number } | null | undefined;
  if (lastCommentAt?.toMillis) {
    const waited = Date.now() - lastCommentAt.toMillis();
    if (waited < COMMENT_COOLDOWN_MS) {
      throw new Error(`انتظر ${Math.ceil((COMMENT_COOLDOWN_MS - waited) / 1000)} ثانية قبل التعليق مرة أخرى.`);
    }
  }

  const ref = await addDoc(collection(db(), 'posts', postId, 'comments'), {
    authorId: user.uid,
    authorName: profile.displayName ?? user.displayName ?? 'طيّار',
    authorPhoto: profile.photoURL ?? null,
    text: trimmed,
    createdAt: serverTimestamp(),
    status: 'active',
    likesCount: 0,
  });

  // The rate-limit stamp and the post counter follow the comment rather than
  // sharing a batch with it, because the rules validate each as its own narrow
  // single-purpose diff (`hasOnly(['lastCommentAt'])`, `hasOnly(['commentsCount'])`)
  // and a batch does not change how they are evaluated. Order matters though:
  // the comment is written FIRST, so if a later write fails the comment still
  // exists and only a counter is stale — the reverse would show a count for a
  // comment nobody can read.
  await updateDoc(userRef, { lastCommentAt: serverTimestamp() })
    .catch(() => { /* the comment stands; the next one is merely not rate-limited */ });
  await updateDoc(doc(db(), 'posts', postId), { commentsCount: increment(1) })
    .catch(() => { /* the comment exists; a stale count is the lesser fault */ });

  return ref.id;
}

/** Soft-delete one's own comment. Ownership is enforced by the rules. */
export async function softDeleteComment(postId: string, commentId: string): Promise<void> {
  await requireUser();
  await updateDoc(doc(db(), 'posts', postId, 'comments', commentId), { status: 'deleted' });
}

export type ReportReason = 'spam' | 'abuse' | 'dangerous' | 'other';

/**
 * The longest explanatory note `firestore.rules` accepts on a report, and the
 * only reason it accepts one for at all. Both are the rules' constraints, not
 * this file's: a note on any other reason makes the whole write fail.
 */
export const REPORT_NOTE_MAX = 200;
export const REPORT_REASON_WITH_NOTE: ReportReason = 'other';

/**
 * Report a post or comment.
 *
 * `resolved: false` is written as a literal because the rules demand it: a
 * reporter must not be able to file a report that is already marked handled.
 * Only a moderator may flip it, and only through the admin surface.
 *
 * WHY THE NOTE IS DROPPED FOR EVERY REASON BUT «سبب آخر»
 * ------------------------------------------------------
 * `firestore.rules` accepts a note ONLY when `reason == 'other'`, and requires
 * `note == null` otherwise. Sending one anyway does not produce a report with
 * an ignored field — it produces a permission error and no report at all. The
 * UI hides the field for the other reasons for the same reason; this line is
 * what makes the two agree even if the UI is bypassed.
 *
 * THE DUPLICATE CHECK IS REAL, NOT DECORATIVE
 * -------------------------------------------
 * It reads back the caller's OWN reports, which the rules now permit
 * specifically so this can work. Before that it queried a collection the
 * caller could not read, caught the refusal, and carried on — so it always
 * passed and the message it produces was unreachable. It is still a courtesy
 * rather than a security control (a determined client can skip it and file
 * duplicates); what it is not any more is a check that cannot fire.
 */
export async function reportContent(input: {
  targetType: 'post' | 'comment';
  targetId: string;
  postId: string;
  reason: ReportReason;
  note?: string | null;
}): Promise<void> {
  const user = await requireUser();

  const existing = await getDocs(query(
    collection(db(), 'reports'),
    where('reporterId', '==', user.uid),
    where('targetId', '==', input.targetId),
    qLimit(1),
  ));

  if (!existing.empty) {
    throw new Error('سبق أن أبلغت عن هذا المحتوى');
  }

  const note = input.reason === REPORT_REASON_WITH_NOTE && input.note?.trim()
    ? input.note.trim().slice(0, REPORT_NOTE_MAX)
    : null;

  await addDoc(collection(db(), 'reports'), {
    targetType: input.targetType,
    targetId: input.targetId,
    postId: input.postId,
    reporterId: user.uid,
    reason: input.reason,
    note,
    createdAt: serverTimestamp(),
    resolved: false,
  });
}
