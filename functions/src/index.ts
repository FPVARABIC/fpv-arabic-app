/**
 * Trusted server-side boundary for Community comment creation and comment
 * likes (Phase 6). These are the ONLY two write paths that create a
 * `posts/{postId}/comments/{commentId}` document or touch a comment's
 * `likesCount` — firestore.rules denies both operations to the client SDK
 * entirely (see that file's own comments), so every write here uses the
 * Admin SDK, which bypasses Security Rules by design. The trust boundary is
 * this file, not the rules file, for these two operations specifically.
 *
 * Deliberately narrow in scope: two callables, nothing else. Post creation,
 * saved posts, following, and moderation reports remain exactly as they
 * were — direct, Rules-governed client writes — because nothing in this
 * task asked for those to change, and moving them here without cause would
 * be unjustified architectural churn.
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { createHash } from 'node:crypto';
import { recomputeFeedScoresBatch } from './feedRanking';

initializeApp();
const db = getFirestore();

const MAX_COMMENT_LENGTH = 500;

// Rolling-window flood guard: generous enough that a real, fast-moving human
// conversation is never blocked (8 distinct comments inside any 60-second
// window), while still stopping obvious automated/bot-speed flooding. These
// numbers are a documented, disclosed judgment call, not a formally derived
// constant — re-tune here if real usage proves them wrong in either
// direction.
const ROLLING_WINDOW_MS = 60_000;
const MAX_COMMENTS_PER_WINDOW = 8;

// A retried/duplicate submission of the EXACT SAME (post, normalized text)
// within this window is collapsed into the original comment (the original
// commentId is returned again, no second document is created) rather than
// rejected outright — this is what lets a flaky network retry succeed
// safely without the user seeing an error OR getting a duplicate comment.
const DUPLICATE_FINGERPRINT_WINDOW_MS = 15_000;

function normalizeForFingerprint(text: string): string {
  // Deliberately simple (trim + collapse whitespace + lowercase) — this
  // exists to catch "the exact same submission happened twice," not to be a
  // general-purpose Arabic text normalizer. It never needs to match
  // src/components/Community/utils/searchTokens.ts's normalization, which
  // solves a different problem (search matching, not retry-collapse).
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function fingerprintFor(postId: string, text: string): string {
  return createHash('sha256').update(`${postId}:${normalizeForFingerprint(text)}`, 'utf8').digest('hex');
}

interface CreateCommentRequest {
  postId: string;
  text: string;
}

interface CreateCommentResponse {
  commentId: string;
  collapsed: boolean;
}

export const createComment = onCall<CreateCommentRequest, Promise<CreateCommentResponse>>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول للتعليق.');
  const uid = request.auth.uid;

  const postId = request.data?.postId;
  const rawText = request.data?.text;
  if (typeof postId !== 'string' || postId.length === 0) {
    throw new HttpsError('invalid-argument', 'معرّف المنشور غير صالح.');
  }
  if (typeof rawText !== 'string') {
    throw new HttpsError('invalid-argument', 'نص التعليق غير صالح.');
  }
  const text = rawText.trim();
  if (text.length === 0) throw new HttpsError('invalid-argument', 'التعليق لا يمكن أن يكون فارغاً.');
  if (text.length > MAX_COMMENT_LENGTH) throw new HttpsError('invalid-argument', 'التعليق طويل جداً.');

  const userRef = db.doc(`users/${uid}`);
  const postRef = db.doc(`posts/${postId}`);
  const rateLimitRef = userRef.collection('rateLimits').doc('comments');
  const commentRef = postRef.collection('comments').doc();
  const fingerprint = fingerprintFor(postId, text);

  return db.runTransaction(async tx => {
    const [userSnap, postSnap, rateLimitSnap] = await Promise.all([
      tx.get(userRef), tx.get(postRef), tx.get(rateLimitRef),
    ]);

    if (!userSnap.exists) throw new HttpsError('failed-precondition', 'يجب إكمال إعداد الحساب أولاً.');
    const userData = userSnap.data()!;
    if (userData.status !== 'active') throw new HttpsError('permission-denied', 'حسابك موقوف عن التعليق حالياً.');

    if (!postSnap.exists || postSnap.data()!.status !== 'active') {
      throw new HttpsError('not-found', 'هذا المنشور لم يعد متاحاً.');
    }

    const now = Date.now();
    const rl = rateLimitSnap.exists ? rateLimitSnap.data()! : null;

    // Idempotent duplicate-retry collapse — same (post, normalized text)
    // within the short window returns the ORIGINAL comment, not a new one,
    // and does not consume flood-window budget.
    if (rl && rl.lastFingerprint === fingerprint && typeof rl.lastAcceptedAtMs === 'number' && now - rl.lastAcceptedAtMs < DUPLICATE_FINGERPRINT_WINDOW_MS) {
      return { commentId: rl.lastCommentId as string, collapsed: true };
    }

    let windowStartMs: number = typeof rl?.windowStartMs === 'number' ? rl.windowStartMs : now;
    let windowCount: number = typeof rl?.windowCount === 'number' ? rl.windowCount : 0;
    if (now - windowStartMs > ROLLING_WINDOW_MS) {
      windowStartMs = now;
      windowCount = 0;
    }
    if (windowCount >= MAX_COMMENTS_PER_WINDOW) {
      throw new HttpsError('resource-exhausted', 'عدد التعليقات مرتفع جداً خلال وقت قصير. حاول لاحقاً.');
    }

    tx.set(commentRef, {
      authorId: uid,
      authorName: userData.displayName ?? 'مستخدم',
      authorPhoto: userData.photoURL ?? null,
      text,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      likesCount: 0,
    });
    tx.update(postRef, { commentsCount: FieldValue.increment(1) });
    tx.set(rateLimitRef, {
      windowStartMs,
      windowCount: windowCount + 1,
      lastFingerprint: fingerprint,
      lastCommentId: commentRef.id,
      lastAcceptedAtMs: now,
    });
    // merge:true — this document already exists (bootstrapped by
    // ensureCommunityUser.ts) and this write must never touch any other
    // field on it (role/status/displayName/etc).
    tx.set(userRef, { lastCommentAt: FieldValue.serverTimestamp() }, { merge: true });

    return { commentId: commentRef.id, collapsed: false };
  });
});

interface ToggleCommentLikeRequest {
  postId: string;
  commentId: string;
  desiredState: 'like' | 'unlike';
}

interface ToggleCommentLikeResponse {
  liked: boolean;
}

// desiredState (not a blind toggle) is what makes this genuinely
// retry-safe: a lost-response retry of the SAME desired state is a true
// no-op, never a flip in the wrong direction. A blind "just invert
// whatever it currently is" toggle would double-flip on exactly the retry
// scenario this function needs to survive.
export const toggleCommentLike = onCall<ToggleCommentLikeRequest, Promise<ToggleCommentLikeResponse>>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول للإعجاب.');
  const uid = request.auth.uid;

  const postId = request.data?.postId;
  const commentId = request.data?.commentId;
  const desiredState = request.data?.desiredState;
  if (typeof postId !== 'string' || !postId) throw new HttpsError('invalid-argument', 'معرّف المنشور غير صالح.');
  if (typeof commentId !== 'string' || !commentId) throw new HttpsError('invalid-argument', 'معرّف التعليق غير صالح.');
  if (desiredState !== 'like' && desiredState !== 'unlike') {
    throw new HttpsError('invalid-argument', 'حالة الإعجاب غير صالحة.');
  }

  const userRef = db.doc(`users/${uid}`);
  const commentRef = db.doc(`posts/${postId}/comments/${commentId}`);
  const likeRef = commentRef.collection('likes').doc(uid);

  return db.runTransaction(async tx => {
    const [userSnap, commentSnap, likeSnap] = await Promise.all([
      tx.get(userRef), tx.get(commentRef), tx.get(likeRef),
    ]);

    if (!userSnap.exists || userSnap.data()!.status !== 'active') {
      throw new HttpsError('permission-denied', 'حسابك موقوف حالياً.');
    }
    if (!commentSnap.exists || commentSnap.data()!.status !== 'active') {
      throw new HttpsError('not-found', 'هذا التعليق لم يعد متاحاً.');
    }

    const alreadyLiked = likeSnap.exists;

    if (desiredState === 'like') {
      if (alreadyLiked) return { liked: true }; // idempotent no-op — already in the desired state
      tx.set(likeRef, { createdAt: FieldValue.serverTimestamp() });
      tx.update(commentRef, { likesCount: FieldValue.increment(1) });
      return { liked: true };
    } else {
      if (!alreadyLiked) return { liked: false }; // idempotent no-op — already in the desired state
      tx.delete(likeRef);
      tx.update(commentRef, { likesCount: FieldValue.increment(-1) });
      return { liked: false };
    }
  });
});

interface TogglePostLikeRequest {
  postId: string;
  desiredState: 'like' | 'unlike';
}

interface TogglePostLikeResponse {
  liked: boolean;
}

// Post likes (Phase 7) — same trusted-server model as toggleCommentLike
// above: posts/{postId}/likes/{uid} deterministic per-liker document, paired
// atomically with the post's likesCount inside one transaction. desiredState
// (not a blind toggle) is what makes the call genuinely retry-safe — a
// lost-response retry of the SAME desired state is a true no-op, never a
// double-flip. firestore.rules denies the client SDK create/update/delete on
// both paths entirely, so a like can never be forged by an isolated ±1
// write without a real paired like document.
export const togglePostLike = onCall<TogglePostLikeRequest, Promise<TogglePostLikeResponse>>(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول للإعجاب.');
  const uid = request.auth.uid;

  const postId = request.data?.postId;
  const desiredState = request.data?.desiredState;
  if (typeof postId !== 'string' || !postId) throw new HttpsError('invalid-argument', 'معرّف المنشور غير صالح.');
  if (desiredState !== 'like' && desiredState !== 'unlike') {
    throw new HttpsError('invalid-argument', 'حالة الإعجاب غير صالحة.');
  }

  const userRef = db.doc(`users/${uid}`);
  const postRef = db.doc(`posts/${postId}`);
  const likeRef = postRef.collection('likes').doc(uid);

  return db.runTransaction(async tx => {
    const [userSnap, postSnap, likeSnap] = await Promise.all([
      tx.get(userRef), tx.get(postRef), tx.get(likeRef),
    ]);

    if (!userSnap.exists || userSnap.data()!.status !== 'active') {
      throw new HttpsError('permission-denied', 'حسابك موقوف حالياً.');
    }
    if (!postSnap.exists || postSnap.data()!.status !== 'active') {
      throw new HttpsError('not-found', 'هذا المنشور لم يعد متاحاً.');
    }

    const alreadyLiked = likeSnap.exists;

    if (desiredState === 'like') {
      if (alreadyLiked) return { liked: true }; // idempotent no-op — already in the desired state
      tx.set(likeRef, { createdAt: FieldValue.serverTimestamp() });
      tx.update(postRef, { likesCount: FieldValue.increment(1) });
      return { liked: true };
    } else {
      if (!alreadyLiked) return { liked: false }; // idempotent no-op — already in the desired state
      tx.delete(likeRef);
      tx.update(postRef, { likesCount: FieldValue.increment(-1) });
      return { liked: false };
    }
  });
});

// Firestore's own hard limit on write operations per batch.
const LIKES_CLEANUP_BATCH_SIZE = 500;

// Bounded, looped batched deletes — handles arbitrarily many documents in
// `collectionRef` without ever exceeding Firestore's per-batch write limit.
// An empty collection exits on the very first (empty) page — a true no-op,
// not a special case. Shared by cleanupCommentLikes and cleanupPostLikes
// below, which are otherwise identical in every respect except which
// collection they clean and which field they normalize.
async function deleteAllDocsInBatches(
  collectionRef: FirebaseFirestore.CollectionReference,
): Promise<number> {
  let deletedCount = 0;
  for (;;) {
    const page = await collectionRef.limit(LIKES_CLEANUP_BATCH_SIZE).get();
    if (page.empty) break;
    const batch = db.batch();
    for (const doc of page.docs) batch.delete(doc.ref);
    await batch.commit();
    deletedCount += page.size;
    if (page.size < LIKES_CLEANUP_BATCH_SIZE) break; // that page was the last one
  }
  return deletedCount;
}

// Orphaned-likes cleanup (Phase 6, correction). A comment leaving the
// 'active' state — via either client path Firestore Rules allow for
// posts/{postId}/comments/{commentId}'s `status` field (the author's own
// soft-delete to 'deleted', or a moderator's hide to 'hidden' — both are
// direct client writes governed by the SAME rule, both only ever touch
// `status`, see firestore.rules' own comments) — makes the comment
// unreadable (`allow read: if resource.data.status == 'active'`) and
// un-likeable (toggleCommentLike above requires status=='active') to every
// client, but never removes its nested likes/{uid} documents: Firestore
// never cascades subcollection deletes on its own, and no client write path
// has ever been permitted to touch that subcollection directly (create/
// update/delete are all `if false`). This trigger is the only thing that
// ever removes them, for both transitions — leaving the moderator-hide path
// unfixed would just relocate the identical bug, not close it, since it is
// the same underlying event (a comment leaving 'active') through a
// different door.
export const cleanupCommentLikes = onDocumentUpdated(
  { document: 'posts/{postId}/comments/{commentId}', timeoutSeconds: 120 },
  async (event) => {
    const change = event.data;
    if (!change) return;
    const before = change.before.data();
    const after = change.after.data();

    // Fires ONLY on a genuine active -> non-active transition. This is also
    // what makes the function inherently non-recursive without needing a
    // separate guard field: the only write this function itself performs
    // (the likesCount normalization below) lands on a document whose status
    // is ALREADY non-active, so the echo event that write produces always
    // has before.status !== 'active' and returns right here, before ever
    // reaching the delete loop again.
    if (before.status !== 'active' || after.status === 'active') return;

    const deletedCount = await deleteAllDocsInBatches(change.after.ref.collection('likes'));

    // Retry-safe by construction: this SETS the honest final value (never
    // increments/decrements), so replaying this event — whether after a
    // crash mid-cleanup or as a genuine at-least-once redelivery of an
    // already-fully-processed event — converges to the same correct
    // likesCount: 0 every time, never drifts negative or double-counts.
    if (after.likesCount !== 0) {
      await change.after.ref.set({ likesCount: 0 }, { merge: true });
    }

    // Safe identifiers only — path segments and a count, never comment
    // text, author name/photo, email, or any other user-identifying data.
    console.log(`[cleanupCommentLikes] postId=${event.params.postId} commentId=${event.params.commentId} deletedLikes=${deletedCount}`);
  },
);

// Orphaned post-likes cleanup (Phase 7) — identical reasoning and mechanics
// to cleanupCommentLikes above, one level up: a post leaving 'active' (owner
// soft-delete, or moderator hide) makes it unreadable and un-likeable
// (togglePostLike above requires status=='active') to every client, but
// never removes its nested posts/{postId}/likes/{uid} documents on its own.
// Scoped to `posts/{postId}` specifically (not `posts/{postId}/{path=**}`),
// so it fires once per post-status-transition and is never re-triggered by
// writes to that post's comments or their likes, which live at deeper paths
// this trigger is not registered against.
export const cleanupPostLikes = onDocumentUpdated(
  { document: 'posts/{postId}', timeoutSeconds: 120 },
  async (event) => {
    const change = event.data;
    if (!change) return;
    const before = change.before.data();
    const after = change.after.data();

    // Same self-terminating guard as cleanupCommentLikes: the only write
    // this function performs (the likesCount normalization below) never
    // changes `status`, so its own echo event always has before.status
    // already non-active and returns here immediately — no recursion.
    if (before.status !== 'active' || after.status === 'active') return;

    const deletedCount = await deleteAllDocsInBatches(change.after.ref.collection('likes'));

    if (after.likesCount !== 0) {
      await change.after.ref.set({ likesCount: 0 }, { merge: true });
    }

    // Safe identifiers only — path segment and a count, never post text,
    // author name/photo, media URLs, email, or any other user-identifying
    // data.
    console.log(`[cleanupPostLikes] postId=${event.params.postId} deletedLikes=${deletedCount}`);
  },
);

// Orphaned-media cleanup (Phase 9). A post leaving the 'active' state — via
// either client path firestore.rules allows for posts/{postId}'s `status`
// field (the author's own soft-delete to 'deleted', or a moderator's hide
// to 'hidden' — both direct client writes governed by the same rule, both
// only ever touch `status`) — makes the post unreadable
// (`allow read: if resource.data.status == 'active'`) to every client, but
// never removes its Storage media: nothing else ever does, since
// storage.rules only grants delete to the media's own owner (a client-side
// permission for the orphan-cleanup-on-failed-post-create path in
// useComposer.ts, an entirely different scenario from this one), and no
// client write path was ever going to reach into Storage on a hide/delete
// it didn't initiate itself. This trigger is the only thing that ever
// removes the files for both transitions, using the Admin SDK (bypasses
// Storage Rules by design, so it needs no permission grant there).
//
// Idempotent and retry-safe: bucket.getFiles({ prefix }) below treats "no
// files match" as a normal empty result, not an error — replaying this
// trigger (a genuine Cloud Functions retry, or this event simply firing
// again for any reason) after the files are already gone is a safe no-op,
// not a crash. (Deletion itself is a getFiles({ prefix }) listing followed
// by an individual, error-swallowed file.delete() per match — not a single
// bucket.deleteFiles({ prefix }) call — because per-file errors need to be
// caught independently so one bad object never aborts the rest of the
// batch; see the try block below for the actual calls.) Scoped strictly to
// the ONE post's own mediaPath (read
// directly off that post's own document, which firestore.rules already
// validated at creation time to equal exactly
// 'community/posts/{authorUid}/{postId}') — structurally incapable of
// touching any other post's or user's media.
export const cleanupPostMedia = onDocumentUpdated(
  { document: 'posts/{postId}', timeoutSeconds: 120 },
  async (event) => {
    const change = event.data;
    if (!change) return;
    const before = change.before.data();
    const after = change.after.data();

    // Same self-terminating guard as cleanupPostLikes — this function never
    // writes anything back to the post document at all, so there is no
    // echo-event risk, but the guard is kept identical for consistency and
    // because it is the correct condition regardless: act only on a genuine
    // active -> non-active transition, never on any other update.
    if (before.status !== 'active' || after.status === 'active') return;

    const mediaPath = after.mediaPath as string | null | undefined;
    if (!mediaPath) return; // text-only post — nothing to clean up

    try {
      const [files] = await getStorage().bucket().getFiles({ prefix: `${mediaPath}/` });
      await Promise.all(files.map(file => file.delete().catch(() => {})));
      console.log(`[cleanupPostMedia] postId=${event.params.postId} deletedFiles=${files.length}`);
    } catch (err) {
      // A missing bucket/prefix or a transient Storage error must never
      // crash this trigger — the post's Firestore status change has
      // already succeeded and is the source of truth; a failed media
      // cleanup is a leaked-storage cost concern, not a correctness one,
      // and this trigger will naturally get another chance if Cloud
      // Functions retries it.
      console.error(`[cleanupPostMedia] postId=${event.params.postId} failed`, err);
    }
  },
);

// Community feed ranking (Phase 2) — recomputes every active, not-yet-
// frozen post's feedScore on a fixed schedule (see feedRanking.ts for the
// formula and batch job itself; this export is only the thin scheduling
// wrapper). NOT deployed to production yet per this phase's explicit
// instruction — build/test locally and against the emulator only, until
// the project's billing plan upgrade completes. The exported
// recomputeFeedScoresBatch function is what tests call directly (passing
// an emulator-connected Firestore instance and an injectable `now`),
// bypassing the need to actually trigger Cloud Scheduler at all.
export const recomputeFeedScores = onSchedule('every 10 minutes', async () => {
  const result = await recomputeFeedScoresBatch(db);
  console.log(`[recomputeFeedScores] updated=${result.updatedCount} frozen=${result.frozenCount}`);
});
