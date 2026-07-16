// Pure Storage-SDK-independent retry/classification logic for
// MediaUploader.tsx's deleteMedia(), split into its own module (correction
// pass) so scripts/testMediaDeleteRetry.ts can unit-test it in plain Node
// without initializing a real Firebase app (MediaUploader.tsx itself pulls
// in lib/firebase.ts, which reads import.meta.env.VITE_FIREBASE_* — only
// populated inside a real Vite process, not plain `tsx`). Nothing in this
// file touches Firebase Storage directly; MediaUploader.tsx supplies the
// actual `deleteObject(ref)` call as an injected `deleteFn`.

// Per-object outcome of a single delete attempt. 'already-missing' is
// deliberately distinct from 'deleted' (not merged into a single "ok"
// value) so a caller/log can tell "we deleted a real object" apart from
// "there was nothing here to delete" — but both count as successful,
// idempotent cleanup: a StorageError with code storage/object-not-found
// means the object is already gone, which is exactly the end state
// deleteMedia is trying to reach, not a failure to reach it.
export type MediaDeleteOutcome = 'deleted' | 'already-missing' | 'failed';

export interface MediaDeleteResult {
  full: MediaDeleteOutcome;
  thumbnail: MediaDeleteOutcome;
  // Convenience flags derived from full/thumbnail above — callers that only
  // care about the aggregate (e.g. "should I log a warning?") don't need to
  // re-derive this from the two individual outcomes themselves.
  fullySucceeded: boolean;
  partiallyFailed: boolean;
  fullyFailed: boolean;
}

// Error codes worth a short, bounded retry — transient/server-side hiccups
// where the object plausibly still exists and a second attempt has a real
// chance of succeeding. Deliberately excludes storage/object-not-found
// (short-circuited to 'already-missing' below, retrying it would be
// pointless) and storage/unauthorized (a permissions problem a retry cannot
// fix — matches storage.rules' owner-only delete rule; retrying a denied
// delete just wastes two more round trips before reporting the same denial).
const RETRYABLE_STORAGE_ERROR_CODES = new Set([
  'storage/retry-limit-exceeded',
  'storage/server-file-wrong-size',
  'storage/unknown',
]);

export const DELETE_MAX_RETRIES = 2;
export const DELETE_RETRY_DELAY_MS = 300;

// The retry/classification state machine, factored out behind an injected
// `deleteFn` rather than calling deleteObject(storageRef) directly — purely
// so scripts/testMediaDeleteRetry.ts can drive it deterministically with a
// fake that fails/succeeds on command (a real Storage emulator cannot
// deterministically produce "transient failure then a successful retry" or
// "this exact one of the two objects fails" on demand, since both objects
// share the same owner path and the same storage.rules branch).
// `pathForLog` is the Storage object's own internal path (e.g.
// "community/posts/{uid}/{postId}/{uuid}.jpg"), not a filesystem path and
// not a download URL — it carries no access token and is safe to write to
// a developer console log; mediaURL/thumbnailURL (which DO carry a bearer
// token in their query string) are never logged from this module.
export async function classifyAndRetryDelete(
  deleteFn: () => Promise<void>,
  label: 'full image' | 'thumbnail',
  pathForLog: string,
): Promise<MediaDeleteOutcome> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= DELETE_MAX_RETRIES; attempt++) {
    try {
      await deleteFn();
      return 'deleted';
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === 'storage/object-not-found') {
        return 'already-missing';
      }
      lastErr = err;
      if (attempt < DELETE_MAX_RETRIES && code && RETRYABLE_STORAGE_ERROR_CODES.has(code)) {
        await new Promise(resolve => setTimeout(resolve, DELETE_RETRY_DELAY_MS));
        continue;
      }
      break;
    }
  }
  console.error(
    `[deleteMedia] failed to delete ${label} object at path "${pathForLog}" after retries`,
    (lastErr as { code?: string } | null)?.code ?? lastErr,
  );
  return 'failed';
}

// Pure aggregation of the two per-object outcomes into the caller-facing
// MediaDeleteResult — factored out so scripts/testMediaDeleteRetry.ts can
// assert the full/thumbnail -> fullySucceeded/partiallyFailed/fullyFailed
// matrix directly, without needing two real Storage objects in two
// different states at once.
export function deriveMediaDeleteResult(full: MediaDeleteOutcome, thumbnail: MediaDeleteOutcome): MediaDeleteResult {
  const failedCount = [full, thumbnail].filter(outcome => outcome === 'failed').length;
  return {
    full,
    thumbnail,
    fullySucceeded: failedCount === 0,
    partiallyFailed: failedCount === 1,
    fullyFailed: failedCount === 2,
  };
}
