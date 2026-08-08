import type { Timestamp } from '../types';

// Community's structural Timestamp, not Firestore's class — same reason as
// `timeAgo.ts`: the class additionally demands `isEqual` and `toJSON`, which
// the stored field type does not carry, and `.toMillis()` is all this needs.

// Shared client-side rate-limit pre-check. Used to show a friendly Arabic
// message BEFORE attempting a write, rather than parsing Firestore's generic
// PERMISSION_DENIED (which can't distinguish "rate limited" from any other
// rule failure). These are UX conveniences only — the real, unbypassable
// enforcement lives in firestore.rules, which every value here is kept in
// sync with (see the rules file's own comments for the authoritative
// windows).
export const secondsRemaining = (lastAt: Timestamp | null, windowSeconds: number): number => {
  if (!lastAt) return 0;
  const elapsedMs = Date.now() - lastAt.toMillis();
  const remainingMs = windowSeconds * 1000 - elapsedMs;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

export const POST_RATE_LIMIT_SECONDS = 60;

export const postRateLimitMessage = (seconds: number): string =>
  `الرجاء الانتظار ${seconds} ثانية قبل نشر منشور آخر`;

// TEMPORARY REVERT (bridge until Firebase Blaze billing is restored) —
// comment creation is back to a direct client write (useCommentComposer.ts),
// so a client-side pre-check constant is needed again. This is deliberately
// NOT the old pre-Phase-6 value: that design used a single 15s cooldown,
// GLOBAL PER USER (not per-post — verified via `git log -p`, despite
// firestore.rules' own prior comment describing it as per-post), which
// blocked a normal user's second, DISTINCT comment on ANY post for a full
// 15 real seconds — the actual disclosed defect. 5s keeps the same
// global-per-user shape (a per-post cooldown would need a Firestore read
// per post to check, which Rules can't do cheaply) but short enough that a
// real second comment — which takes a human at least a few seconds to type
// — is essentially never blocked by it in practice. Duplicate-content
// collapse (functions/src/index.ts's fingerprint-based retry-collapse) has
// NO equivalent here — that requires a server read of prior submissions,
// which a direct client write cannot do; this is a disclosed, accepted gap
// for the duration of this bridge, not something approximated here.
// DELETE this constant and its uses once re-migrated back to
// createComment.
export const COMMENT_RATE_LIMIT_SECONDS = 5;

export const commentRateLimitMessage = (seconds: number): string =>
  `الرجاء الانتظار ${seconds} ثانية قبل إضافة تعليق آخر`;
