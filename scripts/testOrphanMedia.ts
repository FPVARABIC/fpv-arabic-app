/**
 * The orphan-detection logic, exercised on the cases where getting it wrong
 * destroys someone's data.
 *
 * A cleanup routine is the most dangerous code in a media pipeline: every other
 * bug shows the wrong thing, this one removes the right thing. So the majority
 * of what follows is not "does it find orphans" — it is "does it refuse to
 * delete a file that is still in use, still arriving, or whose status it could
 * not establish".
 *
 * Pure functions, no emulator, no network: `functions/src/orphanMedia.ts` takes
 * the clock and the post lookup as parameters precisely so this file can drive
 * every branch deterministically.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseMediaFolder, classifyMediaFolder, findOrphanedMediaFolders,
  ORPHAN_GRACE_MS, type PostLookup,
} from '../functions/src/orphanMedia';

let passed = 0;
const failures: string[] = [];
function ok(label: string, condition: boolean) {
  if (condition) { passed++; console.log(`  ok — ${label}`); }
  else { failures.push(label); console.log(`  FAIL — ${label}`); }
}

const NOW = 1_800_000_000_000;
const OLD = NOW - ORPHAN_GRACE_MS - 1;
const FRESH = NOW - 1000;

const folder = (path: string, at: number) => ({ path, newestFileAtMs: at });

console.log('\n[1] Path parsing — the guard against catastrophic over-deletion');
{
  ok('a well-formed folder parses into its uid and post id',
    JSON.stringify(parseMediaFolder('community/posts/uid1/post1')) === JSON.stringify({ uid: 'uid1', postId: 'post1' }));
  ok('a trailing slash is tolerated', parseMediaFolder('community/posts/uid1/post1/') !== null);

  // Each of these, if it parsed, would let the sweep propose deleting a whole
  // user's media or the entire community prefix.
  ok('the user-level prefix does NOT parse', parseMediaFolder('community/posts/uid1') === null);
  ok('the posts prefix does NOT parse', parseMediaFolder('community/posts') === null);
  ok('the root prefix does NOT parse', parseMediaFolder('community') === null);
  ok('a deeper path does NOT parse', parseMediaFolder('community/posts/uid1/post1/extra') === null);
  ok('a different top-level namespace does NOT parse', parseMediaFolder('avatars/uid1/post1') === null);
  ok('an empty uid segment does NOT parse', parseMediaFolder('community/posts//post1') === null);
  ok('an empty string does NOT parse', parseMediaFolder('') === null);

  ok('a malformed path is never orphaned, whatever its age',
    classifyMediaFolder(folder('community/posts/uid1', OLD), { kind: 'missing' }, NOW).orphaned === false);
  ok('…and it says why',
    classifyMediaFolder(folder('community/posts/uid1', OLD), { kind: 'missing' }, NOW).reason === 'malformed-path');
}

console.log('\n[2] The cases that MUST NOT be deleted');
{
  const active: PostLookup = { kind: 'exists', status: 'active' };

  ok('a folder whose post is live is kept',
    classifyMediaFolder(folder('community/posts/u/p', OLD), active, NOW).orphaned === false);
  ok('…for the stated reason',
    classifyMediaFolder(folder('community/posts/u/p', OLD), active, NOW).reason === 'post-active');

  // The upload-in-flight case. This is the one that would delete a photo out
  // from under someone mid-post.
  ok('a folder with no post yet, uploaded seconds ago, is kept',
    classifyMediaFolder(folder('community/posts/u/p', FRESH), { kind: 'missing' }, NOW).orphaned === false);
  ok('…because it is inside the grace period',
    classifyMediaFolder(folder('community/posts/u/p', FRESH), { kind: 'missing' }, NOW).reason === 'within-grace-period');
  ok('a hidden post whose files are fresh is also kept — age is checked first',
    classifyMediaFolder(folder('community/posts/u/p', FRESH), { kind: 'exists', status: 'hidden' }, NOW).orphaned === false);

  // The exact boundary. One millisecond too young must survive.
  ok('a folder exactly at the grace boundary is kept',
    classifyMediaFolder(folder('community/posts/u/p', NOW - ORPHAN_GRACE_MS), { kind: 'missing' }, NOW).orphaned === false);
  ok('a folder one millisecond past it is a candidate',
    classifyMediaFolder(folder('community/posts/u/p', NOW - ORPHAN_GRACE_MS - 1), { kind: 'missing' }, NOW).orphaned === true);

  // An inconclusive lookup must never be read as "no post exists".
  ok('a folder whose post lookup FAILED is kept, not deleted',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'unknown' }, NOW).orphaned === false);
  ok('…and the reason names the failed lookup rather than claiming the post is gone',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'unknown' }, NOW).reason === 'lookup-failed');

  // A clock that has gone backwards must not turn everything into an orphan.
  ok('a file dated in the future is kept',
    classifyMediaFolder(folder('community/posts/u/p', NOW + 60_000), { kind: 'missing' }, NOW).orphaned === false);
}

console.log('\n[3] The cases that genuinely are orphans');
{
  ok('an old folder with no post at all is an orphan',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'missing' }, NOW).orphaned === true);
  ok('…named as post-missing',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'missing' }, NOW).reason === 'post-missing');

  // These are cleanupPostMedia's failures — the trigger that should already
  // have removed them. A sweep exists precisely because triggers can fail.
  ok('an old folder whose post was soft-deleted is an orphan',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'exists', status: 'deleted' }, NOW).orphaned === true);
  ok('an old folder whose post was hidden by a moderator is an orphan',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'exists', status: 'hidden' }, NOW).orphaned === true);
  ok('…both named as post-not-active',
    classifyMediaFolder(folder('community/posts/u/p', OLD), { kind: 'exists', status: 'hidden' }, NOW).reason === 'post-not-active');
}

console.log('\n[4] A whole batch');
{
  const posts: Record<string, PostLookup> = {
    live: { kind: 'exists', status: 'active' },
    gone: { kind: 'missing' },
    hidden: { kind: 'exists', status: 'hidden' },
    flaky: { kind: 'unknown' },
  };

  const decisions = findOrphanedMediaFolders(
    [
      folder('community/posts/u1/live', OLD),
      folder('community/posts/u1/gone', OLD),
      folder('community/posts/u2/hidden', OLD),
      folder('community/posts/u2/flaky', OLD),
      folder('community/posts/u3/gone', FRESH),
      folder('community/posts/u3', OLD),
    ],
    id => posts[id] ?? { kind: 'missing' },
    NOW,
  );

  ok('every folder is accounted for, kept ones included — a sweep must be auditable',
    decisions.length === 6);

  const deletable = decisions.filter(d => d.orphaned).map(d => d.path);
  ok('exactly the two genuine orphans are selected',
    deletable.length === 2
    && deletable.includes('community/posts/u1/gone')
    && deletable.includes('community/posts/u2/hidden'));
  ok('the live post\'s media is not selected', !deletable.includes('community/posts/u1/live'));
  ok('the unresolvable post\'s media is not selected', !deletable.includes('community/posts/u2/flaky'));
  ok('the freshly-uploaded folder is not selected', !deletable.includes('community/posts/u3/gone'));
  ok('the user-level prefix is not selected — the check that prevents wiping an account',
    !deletable.includes('community/posts/u3'));

  ok('every decision carries a reason', decisions.every(d => !!d.reason));
}

console.log('\n[5] The honesty check');
{
  // If a scheduled sweep is ever added, this assertion is what forces the
  // documentation to be updated alongside it rather than after it.
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const index = readFileSync(join(root, 'functions/src/index.ts'), 'utf8');
  const doc = readFileSync(join(root, 'docs/platform/14-MEDIA-LIFECYCLE.md'), 'utf8');

  const scheduledSweepExists = /onSchedule\([^)]*\)[\s\S]{0,400}orphan/i.test(index);
  ok('the lifecycle document does not claim an automatic sweep that is not deployed',
    scheduledSweepExists || /لا يوجد تنظيف تلقائي يعمل اليوم/.test(doc));
  ok('the lifecycle document exists and describes the sweep that would run it',
    /findOrphanedMediaFolders/.test(doc));
}

console.log(`\n${failures.length === 0 ? '✅' : '❌'} testOrphanMedia: ${passed} assertions passed, ${failures.length} failed\n`);
failures.forEach(f => console.log(`   - ${f}`));
assert.equal(failures.length, 0, `${failures.length} assertion(s) failed`);
