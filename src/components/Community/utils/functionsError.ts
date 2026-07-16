import type { FunctionsErrorCode } from 'firebase/functions';

// createComment/toggleCommentLike (functions/src/index.ts) throw
// HttpsError with the user-facing Arabic message already attached — the
// client-side FunctionsError the callable SDK surfaces carries that exact
// string in .message. So the correct behavior here is "show the server's
// message verbatim," not re-derive a message from .code — the fallback
// below only covers transport-level failures (offline, timeout, internal)
// that never reached the function at all and so never got a message.
const CODES_WITH_SERVER_MESSAGE: ReadonlySet<FunctionsErrorCode> = new Set([
  'functions/unauthenticated',
  'functions/invalid-argument',
  'functions/failed-precondition',
  'functions/permission-denied',
  'functions/not-found',
  'functions/resource-exhausted',
]);

function isFunctionsErrorLike(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    (err as { code: string }).code.startsWith('functions/')
  );
}

export function functionsErrorMessage(err: unknown, fallback: string): string {
  if (isFunctionsErrorLike(err) && CODES_WITH_SERVER_MESSAGE.has(err.code as FunctionsErrorCode) && err.message) {
    return err.message;
  }
  return fallback;
}
