/**
 * Phase 0 evidence script: exercises firestore.rules + storage.rules against
 * the Firebase Local Emulator Suite and asserts specific allow/deny outcomes.
 *
 * Not application runtime code — a one-off verification harness for the
 * Community rules, added to produce the emulator evidence Ahmed asked for in
 * Phase 0 review. Kept in scripts/ alongside the project's other build-time
 * tsx scripts; re-run this whenever firestore.rules/storage.rules change.
 *
 * Run with:
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/testCommunityRules.ts"
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, updateDoc, deleteDoc, getDoc, getDocs, collection, collectionGroup,
  query, where, runTransaction, getCountFromServer, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const PROJECT_ID = 'demo-community-rules-test';

let testEnv: RulesTestEnvironment;
let passCount = 0;
let failCount = 0;

const record = async (label: string, expectation: 'allow' | 'deny', run: () => Promise<unknown>) => {
  try {
    if (expectation === 'allow') {
      await assertSucceeds(run());
    } else {
      await assertFails(run());
    }
    console.log(`  PASS  [${expectation.toUpperCase()}]  ${label}`);
    passCount++;
  } catch (err) {
    console.log(`  FAIL  [${expectation.toUpperCase()}]  ${label}`);
    console.log(`        ${(err as Error).message.split('\n')[0]}`);
    failCount++;
  }
};

// Real, throwing value assertion (node:assert/strict) — participates in the
// same pass/fail totals and exit code as record() above, so an incorrect
// value actually fails the suite instead of merely being printed.
const assertValue = <T>(label: string, actual: T, expected: T) => {
  try {
    assert.strictEqual(actual, expected);
    console.log(`  PASS  [VALUE]  ${label} (= ${String(actual)})`);
    passCount++;
  } catch {
    console.log(`  FAIL  [VALUE]  ${label} (actual=${String(actual)}, expected=${String(expected)})`);
    failCount++;
  }
};

const validUserDoc = (overrides: Record<string, unknown> = {}) => ({
  displayName: 'Pilot',
  photoURL: null,
  joinedAt: serverTimestamp(),
  postsCount: 0,
  role: 'user',
  status: 'active',
  lastPostAt: null,
  lastCommentAt: null,
  ...overrides,
});

const AUTHOR_NAMES: Record<string, string> = {
  uidA: 'Pilot A',
  uidB: 'Pilot B',
  uidBanned: 'Banned Pilot',
};

// Phase 2 (optional category) test helper — removes the category key
// entirely, matching the app's real conditional-spread write shape for an
// uncategorized post (never `category: undefined`, which Firestore rejects
// client-side; never `category: null`/`''`, which the rules must reject).
const withoutCategory = (postDoc: Record<string, unknown>) => {
  const { category, ...rest } = postDoc;
  return rest;
};

const validPostDoc = (authorId: string, overrides: Record<string, unknown> = {}) => ({
  authorId,
  authorName: AUTHOR_NAMES[authorId] ?? 'Pilot',
  authorPhoto: null,
  text: 'منشور تجريبي صالح',
  category: 'questions',
  mediaType: 'none',
  mediaURL: null,
  thumbnailURL: null,
  mediaSize: null,
  mediaDuration: null,
  mediaPath: null,
  commentsCount: 0,
  createdAt: serverTimestamp(),
  status: 'active',
  searchTokens: ['منشور', 'تجريبي'],
  ...overrides,
});

async function main() {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(join(ROOT, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });

  // ── Seed fixtures with rules disabled ────────────────────────────────────
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidA'), validUserDoc({ displayName: 'Pilot A' }));
    await setDoc(doc(db, 'users/uidB'), validUserDoc({ displayName: 'Pilot B' }));
    await setDoc(doc(db, 'users/uidBanned'), validUserDoc({ displayName: 'Banned Pilot', status: 'banned' }));
    await setDoc(doc(db, 'users/uidMod'), validUserDoc({ displayName: 'Moderator', role: 'moderator' }));

    // Existing active post authored by uidA, used for update-path tests.
    await setDoc(doc(db, 'posts/post-existing'), validPostDoc('uidA'));

    // A post uidA has saved, used for the cross-user savedPosts read test.
    await setDoc(doc(db, 'users/uidA/savedPosts/post-existing'), {
      postId: 'post-existing',
      savedAt: serverTimestamp(),
    });
  });

  const asA = testEnv.authenticatedContext('uidA');
  const asB = testEnv.authenticatedContext('uidB');
  const asBanned = testEnv.authenticatedContext('uidBanned');

  console.log('\n=== Positive controls (legitimate operations must still work) ===');

  await record('P1 valid text-only post create', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-p1'), validPostDoc('uidA', { text: 'منشور صالح بدون صورة' })));

  await record('P2 valid image post create (mediaSize under cap, correct mediaPath)', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-p2'), validPostDoc('uidA', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 400 * 1024,
      mediaPath: 'community/posts/post-p2',
    })));

  await record('P3 valid comment create', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-existing/comments/comment-p3'), {
      authorId: 'uidA', authorName: 'Pilot A', authorPhoto: null,
      text: 'تعليق صالح', createdAt: serverTimestamp(), status: 'active',
    }));

  await record('P4 owner reads own savedPosts entry', 'allow', () =>
    getDoc(doc(asA.firestore(), 'users/uidA/savedPosts/post-existing')));

  await record('P4b owner creates a new savedPosts entry', 'allow', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/savedPosts/post-p1'), {
      postId: 'post-p1', savedAt: serverTimestamp(),
    }));

  await record('P5 valid Storage image upload (UUID filename, under 2MB)', 'allow', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  console.log('\n=== 1. Forged role/status ===');

  await record('reject create of a new user doc with role=moderator', 'deny', () =>
    setDoc(doc(asB.firestore(), 'users/uidB'), validUserDoc({ displayName: 'Pilot B', role: 'moderator' })));

  await record('reject owner flipping their own status to banned', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { status: 'banned' }));

  console.log('\n=== 2. lastPostAt reset-to-past ===');

  await record('reject lastPostAt set to a literal past Timestamp (not request.time)', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), {
      lastPostAt: Timestamp.fromMillis(Date.now() - 1000 * 60 * 60),
      postsCount: 1,
    }));

  console.log('\n=== 3. Rate-limit distance ===');

  await record('bump lastPostAt to "now" (simulating a just-created post)', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { lastPostAt: serverTimestamp(), postsCount: 1 }));

  await record('reject a second post created within 60s of the first', 'deny', () =>
    setDoc(doc(asA.firestore(), 'posts/post-rate-limited'), validPostDoc('uidA')));

  console.log('\n=== 4. Oversized text ===');

  await record('reject post text over 2000 chars', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-oversized'), validPostDoc('uidB', { text: 'ا'.repeat(2001) })));

  console.log('\n=== 5. Wrong mediaPath ===');

  await record('reject image post whose mediaPath does not match its own postId', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-wrong-path'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/SOME-OTHER-POST-ID',
    })));

  console.log('\n=== 6. Bad UUID filename ===');

  await record('reject Storage upload with a non-matching filename', 'deny', () =>
    uploadBytes(
      ref(asB.storage(), 'community/posts/post-p2/not a valid name!.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('reject Storage upload with the wrong extension', 'deny', () =>
    uploadBytes(
      ref(asB.storage(), 'community/posts/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.png'),
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      { contentType: 'image/png' },
    ));

  console.log('\n=== 7. Extra-key injection ===');

  await record('reject post create with an extra unrecognized field', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-extra-key'), {
      ...validPostDoc('uidB'),
      isAdmin: true,
    }));

  console.log('\n=== 8. Cross-user savedPosts read ===');

  await record('reject uidB reading uidA\'s savedPosts entry', 'deny', () =>
    getDoc(doc(asB.firestore(), 'users/uidA/savedPosts/post-existing')));

  console.log('\n=== 9. video mediaType rejected ===');

  await record('reject post create with mediaType=video', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-video'), validPostDoc('uidB', {
      mediaType: 'video',
      mediaURL: 'https://firebasestorage.googleapis.com/fake.mp4',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/post-video',
      mediaDuration: 30,
    })));

  console.log('\n=== 10. mediaSize > 500KB rejected ===');

  await record('reject image post with mediaSize over 500KB', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-oversized-media'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 600 * 1024,
      mediaPath: 'community/posts/post-oversized-media',
    })));

  console.log('\n=== 12. Optional category (Phase 2) ===');

  await record('valid post create with no category field', 'allow', () =>
    setDoc(doc(asB.firestore(), 'posts/post-no-category'), withoutCategory(validPostDoc('uidB'))));

  await record('reject post create with category: null', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-null'), validPostDoc('uidB', { category: null })));

  await record('reject post create with category: "" (empty string)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-empty'), validPostDoc('uidB', { category: '' })));

  await record('reject post create with category: "unknown-category"', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-unknown'), validPostDoc('uidB', { category: 'unknown-category' })));

  await record('reject post create with category as a number', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-number'), validPostDoc('uidB', { category: 1 })));

  await record('reject post create with category as an array', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-array'), validPostDoc('uidB', { category: ['questions'] })));

  await record('reject post create with category as a map/object', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-map'), validPostDoc('uidB', { category: { id: 'questions' } })));

  await record('reject post create with category as a boolean', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-category-bool'), validPostDoc('uidB', { category: true })));

  await record('read an uncategorized post', 'allow', () =>
    getDoc(doc(asA.firestore(), 'posts/post-no-category')));

  console.log('\n=== Bonus coverage: reports validation, banned-user writes ===');

  await record('reject banned user creating a post', 'deny', () =>
    setDoc(doc(asBanned.firestore(), 'posts/post-banned'), validPostDoc('uidBanned')));

  await record('valid report with reason=other and a short note', 'allow', () =>
    setDoc(doc(asA.firestore(), 'reports/report-ok'), {
      targetType: 'post', targetId: 'post-existing', postId: 'post-existing',
      reporterId: 'uidA', reason: 'other', note: 'سبب قصير', resolved: false, createdAt: serverTimestamp(),
    }));

  await record('reject report with reason=spam but a non-null note', 'deny', () =>
    setDoc(doc(asB.firestore(), 'reports/report-bad-note'), {
      targetType: 'post', targetId: 'post-existing', postId: 'post-existing',
      reporterId: 'uidB', reason: 'spam', note: 'should not be allowed', resolved: false, createdAt: serverTimestamp(),
    }));

  await record('reject report with reason=other and a note over 200 chars', 'deny', () =>
    setDoc(doc(asB.firestore(), 'reports/report-long-note'), {
      targetType: 'post', targetId: 'post-existing', postId: 'post-existing',
      reporterId: 'uidB', reason: 'other', note: 'ا'.repeat(201), resolved: false, createdAt: serverTimestamp(),
    }));

  console.log('\n=== 11. "dangerous" report reason (Phase 2 amendment to D9/D11) ===');

  await record('valid report with reason=dangerous and null note', 'allow', () =>
    setDoc(doc(asA.firestore(), 'reports/report-dangerous-ok'), {
      targetType: 'post', targetId: 'post-existing', postId: 'post-existing',
      reporterId: 'uidA', reason: 'dangerous', note: null, resolved: false, createdAt: serverTimestamp(),
    }));

  await record('reject report with reason=dangerous but a non-null note', 'deny', () =>
    setDoc(doc(asB.firestore(), 'reports/report-dangerous-bad-note'), {
      targetType: 'post', targetId: 'post-existing', postId: 'post-existing',
      reporterId: 'uidB', reason: 'dangerous', note: 'should not be allowed', resolved: false, createdAt: serverTimestamp(),
    }));

  console.log('\n=== 12. Community-user bootstrap (Phase 5) ===');

  const asBootstrapNew = testEnv.authenticatedContext('uidBootstrapNew');
  const asNoDoc = testEnv.authenticatedContext('uidNoDoc');
  const asGuest = testEnv.unauthenticatedContext();

  async function ensureCommunityUserForTest(db, uid, identity) {
    const userRef = doc(db, 'users', uid);
    return runTransaction(db, async tx => {
      const snap = await tx.get(userRef);
      if (snap.exists()) return;
      tx.set(userRef, {
        displayName: identity.displayName ?? 'مستخدم',
        photoURL: identity.photoURL ?? null,
        joinedAt: serverTimestamp(),
        postsCount: 0,
        role: 'user',
        status: 'active',
        lastPostAt: null,
        lastCommentAt: null,
      });
    });
  }

  await record('B1 signed-in user creates their own default Community user', 'allow', () =>
    ensureCommunityUserForTest(asBootstrapNew.firestore(), 'uidBootstrapNew', { displayName: 'New Pilot', photoURL: null }));

  const b1Doc = await getDoc(doc(asBootstrapNew.firestore(), 'users/uidBootstrapNew'));
  assertValue('B1b bootstrap document exists', b1Doc.exists(), true);
  assertValue('B1c bootstrap postsCount is exactly 0', b1Doc.data()?.postsCount, 0);
  assertValue('B1d bootstrap role is exactly "user"', b1Doc.data()?.role, 'user');
  assertValue('B1e bootstrap status is exactly "active"', b1Doc.data()?.status, 'active');
  assertValue('B1f bootstrap lastPostAt is null', b1Doc.data()?.lastPostAt, null);
  assertValue('B1g bootstrap lastCommentAt is null', b1Doc.data()?.lastCommentAt, null);

  await record('B2 cannot create another uid\'s document', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidBootstrapForged'), validUserDoc({ displayName: 'Forged' })));

  await record('B3 cannot create with role=moderator', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapMod').firestore(), 'users/uidBootstrapMod'), validUserDoc({ role: 'moderator' })));

  await record('B4 cannot create with status=banned', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapBanned').firestore(), 'users/uidBootstrapBanned'), validUserDoc({ status: 'banned' })));

  await record('B5 cannot create with nonzero postsCount', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapCount').firestore(), 'users/uidBootstrapCount'), validUserDoc({ postsCount: 5 })));

  await record('B6 cannot create with non-null lastPostAt', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapLPA').firestore(), 'users/uidBootstrapLPA'), validUserDoc({ lastPostAt: serverTimestamp() })));

  await record('B7 cannot create with non-null lastCommentAt', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapLCA').firestore(), 'users/uidBootstrapLCA'), validUserDoc({ lastCommentAt: serverTimestamp() })));

  await record('B8 unknown keys on bootstrap create rejected', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapExtra').firestore(), 'users/uidBootstrapExtra'), validUserDoc({ extra: 'x' })));

  await record('B9 invalid joinedAt (not request.time) rejected', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapJoined').firestore(), 'users/uidBootstrapJoined'), validUserDoc({ joinedAt: Timestamp.fromDate(new Date('2020-01-01')) })));

  await record('B10 invalid displayName type rejected', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidBootstrapName').firestore(), 'users/uidBootstrapName'), validUserDoc({ displayName: 12345 })));

  await record('B11 re-bootstrapping an existing document is rejected, not overwritten', 'deny', () =>
    setDoc(doc(asBootstrapNew.firestore(), 'users/uidBootstrapNew'), validUserDoc({ displayName: 'New Pilot' })));

  const b11DocAfter = await getDoc(doc(asBootstrapNew.firestore(), 'users/uidBootstrapNew'));
  assertValue('B11b existing document unchanged after rejected re-bootstrap attempt', b11DocAfter.data()?.postsCount, 0);

  await record('B12 two concurrent bootstrap transactions create exactly one unchanged valid document', 'allow', () =>
    Promise.all([
      ensureCommunityUserForTest(testEnv.authenticatedContext('uidBootstrapRace').firestore(), 'uidBootstrapRace', { displayName: 'Racer', photoURL: null }),
      ensureCommunityUserForTest(testEnv.authenticatedContext('uidBootstrapRace').firestore(), 'uidBootstrapRace', { displayName: 'Racer', photoURL: null }),
    ]));
  const raceDoc = await getDoc(doc(testEnv.authenticatedContext('uidBootstrapRace').firestore(), 'users/uidBootstrapRace'));
  assertValue('B12b postsCount after concurrent bootstrap race is exactly 0 (not corrupted)', raceDoc.data()?.postsCount, 0);

  await record('B13 a never-posted user obtains a valid, readable profile after bootstrap', 'allow', () =>
    getDoc(doc(asGuest.firestore(), 'users/uidBootstrapNew')));

  await record('B14 guest cannot bootstrap a user document', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'users/uidGuestBootstrap'), validUserDoc({ displayName: 'Ghost' })));

  console.log('\n=== 13. Follow system (Phase 5) — nested canonical relation model, Option B ===');

  await record('F1 guest create denied', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'users/uidA/following/uidB'), { followedId: 'uidB', createdAt: serverTimestamp() }));

  await record('F2 self-follow denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidA'), { followedId: 'uidA', createdAt: serverTimestamp() }));

  await record('F3 valid active follower to active target allowed', 'allow', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidB'), { followedId: 'uidB', createdAt: serverTimestamp() }));

  await record('F4 missing follower document denied', 'deny', () =>
    setDoc(doc(asNoDoc.firestore(), 'users/uidNoDoc/following/uidB'), { followedId: 'uidB', createdAt: serverTimestamp() }));

  await record('F5 banned follower denied', 'deny', () =>
    setDoc(doc(asBanned.firestore(), 'users/uidBanned/following/uidB'), { followedId: 'uidB', createdAt: serverTimestamp() }));

  await record('F6 missing followed document denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/ghost'), { followedId: 'ghost', createdAt: serverTimestamp() }));

  await record('F7 banned followed user denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidBanned'), { followedId: 'uidBanned', createdAt: serverTimestamp() }));

  await record('F8 writing another user\'s following path denied', 'deny', () =>
    setDoc(doc(asB.firestore(), 'users/uidA/following/uidMod'), { followedId: 'uidMod', createdAt: serverTimestamp() }));

  await record('F9 mismatched followedId field vs. path segment denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidMod'), { followedId: 'uidB', createdAt: serverTimestamp() }));

  await record('F10 unknown key denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidMod'), { followedId: 'uidMod', createdAt: serverTimestamp(), note: 'x' }));

  await record('F11 invalid createdAt denied', 'deny', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/following/uidMod'), { followedId: 'uidMod', createdAt: Timestamp.fromDate(new Date('2020-01-01')) }));

  await record('F12 update denied', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA/following/uidB'), { createdAt: serverTimestamp() }));

  console.log('\n--- Option B read-permission tests ---');

  await record('F13 guest cannot directly read a follow relation', 'deny', () =>
    getDoc(doc(asGuest.firestore(), 'users/uidA/following/uidB')));

  await record('F14 authenticated user CAN directly read a follow relation', 'allow', () =>
    getDoc(doc(asB.firestore(), 'users/uidA/following/uidB')));

  await record('F15 guest cannot list/count a following subcollection directly', 'deny', () =>
    getDocs(collection(asGuest.firestore(), 'users/uidA/following')));

  await record('F16 authenticated user CAN list/count a following subcollection directly', 'allow', () =>
    getDocs(collection(asB.firestore(), 'users/uidA/following')));

  await record('F17 owner delete allowed', 'allow', () =>
    deleteDoc(doc(asA.firestore(), 'users/uidA/following/uidB')));

  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'users/uidA/following/uidB'), { followedId: 'uidB', createdAt: serverTimestamp() });
  });

  await record('F18 followed user cannot delete the relation', 'deny', () =>
    deleteDoc(doc(asB.firestore(), 'users/uidA/following/uidB')));

  await record('F19 third party cannot delete the relation', 'deny', () =>
    deleteDoc(doc(asBanned.firestore(), 'users/uidA/following/uidB')));

  console.log('\n=== 14. Transaction/idempotency (Phase 5) ===');

  async function followForTest(db, followerUid, followedUid) {
    const ref = doc(db, 'users', followerUid, 'following', followedUid);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (snap.exists()) return;
      tx.set(ref, { followedId: followedUid, createdAt: serverTimestamp() });
    });
  }
  async function unfollowForTest(db, followerUid, followedUid) {
    const ref = doc(db, 'users', followerUid, 'following', followedUid);
    return runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      tx.delete(ref);
    });
  }

  await record('T1 duplicate Follow transaction succeeds (idempotent, no error)', 'allow', async () => {
    await followForTest(asA.firestore(), 'uidA', 'uidB');
    await followForTest(asA.firestore(), 'uidA', 'uidB');
  });

  await record('T2 duplicate Unfollow transaction succeeds (idempotent, no error)', 'allow', async () => {
    await unfollowForTest(asA.firestore(), 'uidA', 'uidB');
    await unfollowForTest(asA.firestore(), 'uidA', 'uidB');
  });

  const t3Results = await Promise.allSettled(Array.from({ length: 5 }, () => followForTest(asA.firestore(), 'uidA', 'uidB')));
  assertValue('T3 all 5 concurrent Follow transactions resolved (none rejected)', t3Results.filter(r => r.status === 'rejected').length, 0);
  const t3Doc = await getDoc(doc(asA.firestore(), 'users/uidA/following/uidB'));
  assertValue('T3b exactly one relation exists after 5-way concurrent Follow', t3Doc.exists(), true);
  const t3Listing = await getDocs(collection(asA.firestore(), 'users/uidA/following'));
  assertValue('T3c following subcollection has exactly 1 document (no duplicates from the race)', t3Listing.docs.length, 1);

  const t4Results = await Promise.allSettled(Array.from({ length: 5 }, () => unfollowForTest(asA.firestore(), 'uidA', 'uidB')));
  assertValue('T4 all 5 concurrent Unfollow transactions resolved (none rejected)', t4Results.filter(r => r.status === 'rejected').length, 0);
  const t4Doc = await getDoc(doc(asA.firestore(), 'users/uidA/following/uidB'));
  assertValue('T4b relation gone after 5-way concurrent Unfollow', t4Doc.exists(), false);

  console.log('\n=== 15. Aggregation/query (Phase 5) — deterministic, isolated fixtures ===');

  // Dedicated, never-reused uids/posts for this section only, so counts are
  // exact and do not depend on incidental state from earlier sections.
  const aggF1 = testEnv.authenticatedContext('uidAggFollower1');
  const aggF2 = testEnv.authenticatedContext('uidAggFollower2');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidAggFollower1'), validUserDoc({ displayName: 'Agg Follower 1' }));
    await setDoc(doc(db, 'users/uidAggFollower2'), validUserDoc({ displayName: 'Agg Follower 2' }));
    await setDoc(doc(db, 'users/uidAggTargetA'), validUserDoc({ displayName: 'Agg Target A' }));
    await setDoc(doc(db, 'users/uidAggTargetB'), validUserDoc({ displayName: 'Agg Target B' }));
  });

  await followForTest(aggF1.firestore(), 'uidAggFollower1', 'uidAggTargetA');
  await followForTest(aggF1.firestore(), 'uidAggFollower1', 'uidAggTargetB');
  await followForTest(aggF2.firestore(), 'uidAggFollower2', 'uidAggTargetA');

  const followingCountSnap = await getCountFromServer(collection(aggF1.firestore(), 'users/uidAggFollower1/following'));
  assertValue('Q1 direct following count for uidAggFollower1 equals 2', followingCountSnap.data().count, 2);

  const followersOfTargetA = await getCountFromServer(
    query(collectionGroup(aggF1.firestore(), 'following'), where('followedId', '==', 'uidAggTargetA')));
  assertValue('Q2 collection-group followers count for uidAggTargetA equals 2', followersOfTargetA.data().count, 2);

  const followersOfTargetB = await getCountFromServer(
    query(collectionGroup(aggF1.firestore(), 'following'), where('followedId', '==', 'uidAggTargetB')));
  assertValue('Q3 followers count for uidAggTargetB (a different followedId) equals 1, excludes TargetA\'s followers', followersOfTargetB.data().count, 1);

  const followersOfNobody = await getCountFromServer(
    query(collectionGroup(aggF1.firestore(), 'following'), where('followedId', '==', 'uidAggFollowedByNobody')));
  assertValue('Q4 followers count for a followed-by-nobody target equals 0', followersOfNobody.data().count, 0);

  await record('Q5 guest CANNOT read collection-group followers query (Option B)', 'deny', () =>
    getDocs(query(collectionGroup(asGuest.firestore(), 'following'), where('followedId', '==', 'uidAggTargetA'))));

  await record('Q6 authenticated user CAN read collection-group followers query (Option B)', 'allow', () =>
    getDocs(query(collectionGroup(aggF2.firestore(), 'following'), where('followedId', '==', 'uidAggTargetA'))));

  await record('Q7 guest cannot run collection-group getCountFromServer either', 'deny', () =>
    getCountFromServer(query(collectionGroup(asGuest.firestore(), 'following'), where('followedId', '==', 'uidAggTargetA'))));

  // Dedicated, never-reused authors/posts for the active-post-count fixtures.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidAggAuthorMain'), validUserDoc({ displayName: 'Agg Author Main' }));
    await setDoc(doc(db, 'users/uidAggAuthorOther'), validUserDoc({ displayName: 'Agg Author Other' }));
    await setDoc(doc(db, 'posts/agg-post-1'), validPostDoc('uidAggAuthorMain', { text: 'agg post 1' }));
    await setDoc(doc(db, 'posts/agg-post-2'), validPostDoc('uidAggAuthorMain', { text: 'agg post 2' }));
    await setDoc(doc(db, 'posts/agg-post-other'), validPostDoc('uidAggAuthorOther', { text: 'other author post' }));
    await setDoc(doc(db, 'posts/agg-post-deleted'), validPostDoc('uidAggAuthorMain', { text: 'soft deleted', status: 'deleted' }));
  });

  const activePostsMain = await getCountFromServer(
    query(collection(asGuest.firestore(), 'posts'), where('authorId', '==', 'uidAggAuthorMain'), where('status', '==', 'active')));
  assertValue('Q8 active post count for uidAggAuthorMain equals exactly 2 (excludes the soft-deleted post)', activePostsMain.data().count, 2);

  const activePostsOther = await getCountFromServer(
    query(collection(asGuest.firestore(), 'posts'), where('authorId', '==', 'uidAggAuthorOther'), where('status', '==', 'active')));
  assertValue('Q9 active post count for uidAggAuthorOther equals exactly 1 (excludes uidAggAuthorMain\'s posts)', activePostsOther.data().count, 1);

  await record('Q10 guest CAN read active-post-count aggregation (public)', 'allow', () =>
    getCountFromServer(query(collection(asGuest.firestore(), 'posts'), where('authorId', '==', 'uidAggAuthorMain'), where('status', '==', 'active'))));

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

  await testEnv.cleanup();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
