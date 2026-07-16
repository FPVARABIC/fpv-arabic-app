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
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { createHash } from 'node:crypto';

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

// Firestore's own hard limit on write operations per batch.
const LIKES_CLEANUP_BATCH_SIZE = 500;

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

    const likesRef = change.after.ref.collection('likes');
    let deletedCount = 0;
    // Bounded, looped batched deletes — handles arbitrarily many likes
    // without ever exceeding Firestore's per-batch write limit. A comment
    // with zero likes exits on the very first (empty) page — a true no-op,
    // not a special case.
    for (;;) {
      const page = await likesRef.limit(LIKES_CLEANUP_BATCH_SIZE).get();
      if (page.empty) break;
      const batch = db.batch();
      for (const likeDoc of page.docs) batch.delete(likeDoc.ref);
      await batch.commit();
      deletedCount += page.size;
      if (page.size < LIKES_CLEANUP_BATCH_SIZE) break; // that page was the last one
    }

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
