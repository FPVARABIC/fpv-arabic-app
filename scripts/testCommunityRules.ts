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
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc, setDoc, updateDoc, getDoc, serverTimestamp, Timestamp,
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

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

  await testEnv.cleanup();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
