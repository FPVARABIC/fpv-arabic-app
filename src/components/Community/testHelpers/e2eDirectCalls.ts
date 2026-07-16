/**
 * E2E-test-only helper — dynamically imported by scripts/testCommunityE2E.ts,
 * same convention as e2eAuth.ts/e2eBypass.ts in this directory: no
 * application code imports this file, never part of the production bundle.
 *
 * Calls the REAL createComment callable directly (the exact same
 * httpsCallable path useCommentComposer.ts uses) — used to simulate a
 * genuine network-level retry race (two near-simultaneous calls for the
 * SAME submission), which is what the duplicate-fingerprint collapse in
 * functions/src/index.ts actually defends against. This is deliberately
 * NOT the same thing as a UI double-click: CommentInput's submit button is
 * disabled the instant a submission starts, so a real double-click can
 * never reach the network layer twice — that guard is verified separately,
 * directly against the DOM, in the test script itself.
 */
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from '../../../lib/firebase';

interface CreateCommentResult {
  commentId: string;
  collapsed: boolean;
}

export async function e2eCreateCommentTwiceConcurrently(
  postId: string,
  text: string,
): Promise<[CreateCommentResult, CreateCommentResult]> {
  const call = httpsCallable<{ postId: string; text: string }, CreateCommentResult>(firebaseFunctions, 'createComment');
  const [a, b] = await Promise.all([call({ postId, text }), call({ postId, text })]);
  return [a.data, b.data];
}

interface ToggleLikeResult { liked: boolean }

// Calls the REAL toggleCommentLike callable directly, bypassing the UI —
// needed once a comment has been deleted (CommentsList.tsx removes it from
// the DOM entirely, so there is no like button left to click), to prove the
// backend itself still rejects liking it, independent of the UI ever
// offering the option.
export async function e2eToggleLikeDirect(
  postId: string,
  commentId: string,
  desiredState: 'like' | 'unlike',
): Promise<{ ok: boolean; liked?: boolean; code?: string }> {
  const call = httpsCallable<{ postId: string; commentId: string; desiredState: string }, ToggleLikeResult>(firebaseFunctions, 'toggleCommentLike');
  try {
    const res = await call({ postId, commentId, desiredState });
    return { ok: true, liked: res.data.liked };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}

// Calls the REAL togglePostLike callable directly, bypassing the UI — used
// once a post has been deleted/hidden (its like button is no longer
// rendered anywhere reachable), to prove the backend itself still rejects
// liking it, and to prove a client-supplied "uid" field in the payload
// never overrides the real request.auth.uid.
export async function e2eTogglePostLikeDirect(
  postId: string,
  desiredState: 'like' | 'unlike',
  extraPayload: Record<string, unknown> = {},
): Promise<{ ok: boolean; liked?: boolean; code?: string }> {
  const call = httpsCallable<{ postId: string; desiredState: string }, ToggleLikeResult>(firebaseFunctions, 'togglePostLike');
  try {
    const res = await call({ postId, desiredState, ...extraPayload });
    return { ok: true, liked: res.data.liked };
  } catch (err) {
    return { ok: false, code: (err as { code?: string } | null)?.code };
  }
}
