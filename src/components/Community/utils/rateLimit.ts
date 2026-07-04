import type { Timestamp } from 'firebase/firestore';

// Shared client-side rate-limit pre-check (D11: 60s/post, 15s/comment). Used
// to show a friendly Arabic message BEFORE attempting a write, rather than
// parsing Firestore's generic PERMISSION_DENIED (which can't distinguish
// "rate limited" from any other rule failure).
export const secondsRemaining = (lastAt: Timestamp | null, windowSeconds: number): number => {
  if (!lastAt) return 0;
  const elapsedMs = Date.now() - lastAt.toMillis();
  const remainingMs = windowSeconds * 1000 - elapsedMs;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
};

export const POST_RATE_LIMIT_SECONDS = 60;
export const COMMENT_RATE_LIMIT_SECONDS = 15;

export const postRateLimitMessage = (seconds: number): string =>
  `الرجاء الانتظار ${seconds} ثانية قبل نشر منشور آخر`;

export const commentRateLimitMessage = (seconds: number): string =>
  `الرجاء الانتظار ${seconds} ثانية قبل إضافة تعليق آخر`;
