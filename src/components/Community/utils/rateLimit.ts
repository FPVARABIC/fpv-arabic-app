import type { Timestamp } from 'firebase/firestore';

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

// Comment rate limiting (Phase 6, corrected) is enforced entirely
// server-side now — see functions/src/index.ts's createComment (rolling
// window + duplicate-fingerprint collapse) and firestore.rules (which
// denies direct client comment creation outright). There is deliberately no
// client-side pre-check/cooldown constant here anymore: that is exactly
// what caused the defect this correction pass fixes — a client-visible
// per-post cooldown that blocked a legitimate second, distinct comment on
// the same post. The server can allow unlimited distinct comments while
// still blocking floods; a client-side timer cannot make that distinction
// without an extra round-trip, so the client no longer tries.
