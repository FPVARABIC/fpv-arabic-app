/**
 * Pure-Node, no-emulator, no-browser unit test for MediaUploader.tsx's
 * deleteMedia() retry/classification state machine (correction pass, in
 * response to the independent review's finding that deleteMedia's caller
 * ignored per-file deletion failures).
 *
 * A real Storage emulator cannot deterministically produce "transient
 * failure then a successful retry" or "this exact one of two objects fails
 * while the other succeeds" on demand — both objects live under the same
 * owner path and are governed by the same storage.rules branch, so there is
 * no real-infrastructure way to make them diverge in outcome. classifyAndRetryDelete
 * and deriveMediaDeleteResult are exported from MediaUploader.tsx specifically
 * so this state machine can be driven with a fake deleteFn instead — the
 * companion live-Storage evidence (already-missing via a real pre-deleted
 * object, and a genuine cross-user permission denial) lives in
 * scripts/testCommunityE2E.ts's section 14h, which this file does not
 * duplicate.
 *
 * Run with: npx tsx scripts/testMediaDeleteRetry.ts
 */
import assert from 'node:assert/strict';
import { classifyAndRetryDelete, deriveMediaDeleteResult, type MediaDeleteOutcome } from '../src/components/Community/Composer/mediaDeleteRetry';

let passCount = 0;
let failCount = 0;

function record(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  PASS  ${label}`);
    passCount++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
}

function assertValue<T>(label: string, actual: T, expected: T) {
  try {
    assert.deepStrictEqual(actual, expected);
    record(`${label} (= ${JSON.stringify(actual)})`, true);
  } catch {
    record(label, false, `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`);
  }
}

function storageError(code: string): Error & { code: string } {
  const err = new Error(`Simulated Storage error: ${code}`) as Error & { code: string };
  err.code = code;
  return err;
}

// A fake deleteFn that fails with `failCode` on its first `failTimes` calls,
// then succeeds (or, if failTimes is Infinity, fails forever). Records the
// real call count so tests can assert exactly how many attempts were made —
// the whole point of a bounded retry is that it does NOT retry forever, and
// does NOT retry codes that were never meant to be retried.
function makeFakeDelete(failCode: string | null, failTimes: number): { fn: () => Promise<void>; callCount: () => number } {
  let calls = 0;
  const fn = async () => {
    calls++;
    if (failCode && calls <= failTimes) throw storageError(failCode);
  };
  return { fn, callCount: () => calls };
}

async function main() {
  console.log('\n=== 1. classifyAndRetryDelete — outcome classification ===');

  {
    const { fn, callCount } = makeFakeDelete(null, 0);
    const outcome = await classifyAndRetryDelete(fn, 'full image', 'community/posts/u/p/x.jpg');
    assertValue('DR1 an immediately-succeeding delete is classified "deleted"', outcome, 'deleted' as MediaDeleteOutcome);
    assertValue('DR1b a succeeding delete is called exactly once (no wasted retries)', callCount(), 1);
  }

  {
    const { fn, callCount } = makeFakeDelete('storage/object-not-found', Infinity);
    const outcome = await classifyAndRetryDelete(fn, 'thumbnail', 'community/posts/u/p/x_thumb.jpg');
    assertValue('DR2 object-not-found is classified "already-missing", not "failed" — idempotent cleanup, not an error', outcome, 'already-missing' as MediaDeleteOutcome);
    assertValue('DR2b object-not-found short-circuits immediately — no retry is wasted on a permanently-absent object', callCount(), 1);
  }

  {
    const { fn, callCount } = makeFakeDelete('storage/unauthorized', Infinity);
    const outcome = await classifyAndRetryDelete(fn, 'full image', 'community/posts/u/p/x.jpg');
    assertValue('DR3 a permissions denial (storage/unauthorized) is classified "failed"', outcome, 'failed' as MediaDeleteOutcome);
    assertValue('DR3b a non-retryable error code is NOT retried — a denied delete fails fast in exactly 1 call', callCount(), 1);
  }

  console.log('\n=== 2. classifyAndRetryDelete — bounded retry behavior ===');

  {
    // Fails twice with a retryable code, succeeds on the 3rd attempt —
    // exactly the "transient failure then a successful retry" case the
    // review asked to be covered.
    const { fn, callCount } = makeFakeDelete('storage/retry-limit-exceeded', 2);
    const outcome = await classifyAndRetryDelete(fn, 'full image', 'community/posts/u/p/x.jpg');
    assertValue('DR4 a transient error that clears within the retry budget eventually reports "deleted"', outcome, 'deleted' as MediaDeleteOutcome);
    assertValue('DR4b exactly 3 attempts were made (2 failures + 1 success), proving the retry genuinely ran', callCount(), 3);
  }

  {
    // Always fails with a retryable code — must give up, not loop forever.
    const { fn, callCount } = makeFakeDelete('storage/unknown', Infinity);
    const outcome = await classifyAndRetryDelete(fn, 'thumbnail', 'community/posts/u/p/x_thumb.jpg');
    assertValue('DR5 a retryable error that never clears eventually reports "failed" (gives up, does not loop forever)', outcome, 'failed' as MediaDeleteOutcome);
    assertValue('DR5b the retry loop is bounded to exactly DELETE_MAX_RETRIES+1 = 3 attempts, never more', callCount(), 3);
  }

  console.log('\n=== 3. deriveMediaDeleteResult — the full outcome matrix, no false success claims ===');

  {
    const r = deriveMediaDeleteResult('deleted', 'deleted');
    assertValue('DM1 both genuinely deleted -> fullySucceeded', r.fullySucceeded, true);
    assertValue('DM1b both deleted -> not partiallyFailed', r.partiallyFailed, false);
    assertValue('DM1c both deleted -> not fullyFailed', r.fullyFailed, false);
  }
  {
    const r = deriveMediaDeleteResult('already-missing', 'already-missing');
    assertValue('DM2 both already-missing -> STILL fullySucceeded (idempotent cleanup counts as success)', r.fullySucceeded, true);
  }
  {
    const r = deriveMediaDeleteResult('deleted', 'already-missing');
    assertValue('DM3 one deleted + one already-missing (mixed success states) -> fullySucceeded', r.fullySucceeded, true);
  }
  {
    const r = deriveMediaDeleteResult('deleted', 'failed');
    assertValue('DM4 full succeeds / thumbnail fails -> partiallyFailed, NOT a false fullySucceeded claim', r.partiallyFailed, true);
    assertValue('DM4b full succeeds / thumbnail fails -> fullySucceeded is false', r.fullySucceeded, false);
    assertValue('DM4c full succeeds / thumbnail fails -> not fullyFailed (the full image genuinely was removed)', r.fullyFailed, false);
  }
  {
    const r = deriveMediaDeleteResult('failed', 'deleted');
    assertValue('DM5 thumbnail succeeds / full fails -> partiallyFailed', r.partiallyFailed, true);
    assertValue('DM5b thumbnail succeeds / full fails -> fullySucceeded is false', r.fullySucceeded, false);
  }
  {
    const r = deriveMediaDeleteResult('failed', 'failed');
    assertValue('DM6 both fail -> fullyFailed, never silently reported as success', r.fullyFailed, true);
    assertValue('DM6b both fail -> fullySucceeded is false', r.fullySucceeded, false);
    assertValue('DM6c both fail -> not partiallyFailed (it is a FULL failure, a distinct state)', r.partiallyFailed, false);
  }
  {
    const r = deriveMediaDeleteResult('already-missing', 'failed');
    assertValue('DM7 already-missing + failed -> partiallyFailed (one object genuinely never got cleaned up)', r.partiallyFailed, true);
  }

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
