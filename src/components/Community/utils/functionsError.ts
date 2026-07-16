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

// Distinct from CODES_WITH_SERVER_MESSAGE above: these codes mean the
// request never reached a real HttpsError-throwing function body at all —
// the callable endpoint itself was unreachable (a connection-refused/
// timeout/malformed-response-level failure), which is exactly what a
// not-yet-deployed or CSP-blocked Cloud Function produces client-side
// (confirmed empirically: the Functions SDK maps a connection-refused
// callable request to 'functions/internal'). Surfacing a distinct message
// for this class — "couldn't reach the server, try later" — rather than
// lumping it into the fully generic fallback lets a user (and a developer
// reading a bug report) tell "the service is temporarily unreachable" apart
// from "my specific action was rejected."
const BACKEND_UNAVAILABLE_CODES: ReadonlySet<FunctionsErrorCode> = new Set([
  'functions/internal',
  'functions/unavailable',
  'functions/deadline-exceeded',
]);

const BACKEND_UNAVAILABLE_MESSAGE = 'تعذّر الاتصال بالخادم حالياً. تحقق من اتصالك بالإنترنت أو حاول لاحقاً.';

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
  if (isFunctionsErrorLike(err)) {
    if (CODES_WITH_SERVER_MESSAGE.has(err.code as FunctionsErrorCode) && err.message) {
      return err.message;
    }
    if (BACKEND_UNAVAILABLE_CODES.has(err.code as FunctionsErrorCode)) {
      return BACKEND_UNAVAILABLE_MESSAGE;
    }
  }
  return fallback;
}
