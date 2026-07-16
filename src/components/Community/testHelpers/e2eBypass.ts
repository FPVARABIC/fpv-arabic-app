/**
 * E2E-test-only helper — dynamically imported by scripts/testCommunityE2E.ts,
 * same convention/rationale as e2eAuth.ts in this directory: no application
 * code imports this file, so it is never part of the production bundle.
 *
 * Attempts a DIRECT client-SDK Firestore write using the app's own,
 * already-authenticated `firestoreDb`/`firebaseAuth` instances — i.e. proving
 * the REAL signed-in browser session (not a synthetic rules-testing
 * context) cannot bypass createComment/toggleCommentLike and write these
 * paths directly. firestore.rules denies both outright (see that file);
 * this is the end-to-end proof from inside a real page.
 */
import { doc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { firestoreDb, firebaseAuth } from '../../../lib/firebase';

export interface BypassResult {
  ok: boolean;
  code?: string;
}

export async function e2eAttemptDirectCommentCreate(postId: string, commentId: string, text: string): Promise<BypassResult> {
  const uid = firebaseAuth.currentUser?.uid ?? 'unknown';
  try {
    await setDoc(doc(firestoreDb, 'posts', postId, 'comments', commentId), {
      authorId: uid, authorName: 'Bypass Attempt', authorPhoto: null,
      text, createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

export async function e2eAttemptDirectLikeCreate(postId: string, commentId: string): Promise<BypassResult> {
  const uid = firebaseAuth.currentUser?.uid ?? 'unknown';
  try {
    await setDoc(doc(firestoreDb, 'posts', postId, 'comments', commentId, 'likes', uid), {
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

export async function e2eAttemptDirectLikesCountBump(postId: string, commentId: string): Promise<BypassResult> {
  try {
    await updateDoc(doc(firestoreDb, 'posts', postId, 'comments', commentId), {
      likesCount: increment(1),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

export async function e2eAttemptDirectLikeDelete(postId: string, commentId: string, likerUid: string): Promise<BypassResult> {
  try {
    await deleteDoc(doc(firestoreDb, 'posts', postId, 'comments', commentId, 'likes', likerUid));
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

export async function e2eAttemptDirectPostLikeCreate(postId: string, likerUid: string): Promise<BypassResult> {
  try {
    await setDoc(doc(firestoreDb, 'posts', postId, 'likes', likerUid), {
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

export async function e2eAttemptDirectPostLikesCountBump(postId: string): Promise<BypassResult> {
  try {
    await updateDoc(doc(firestoreDb, 'posts', postId), {
      likesCount: increment(1),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}
