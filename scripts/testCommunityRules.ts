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
  query, where, runTransaction, getCountFromServer, serverTimestamp, Timestamp, increment,
} from 'firebase/firestore';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';
import { normalizeDisplayName } from '../src/components/Community/utils/userSearch';

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

const validUserDoc = (overrides: Record<string, unknown> = {}) => {
  // Guards against a deliberately-bad-typed displayName override in a
  // negative test (e.g. B10's displayName: 12345) — normalizeDisplayName()
  // itself assumes a real string, so a non-string override must never reach
  // it here; that value's own rejection is what the negative test is
  // actually proving, not this field.
  const nameForNormalization = typeof overrides.displayName === 'string' ? overrides.displayName : 'Pilot';
  return {
    displayName: 'Pilot',
    photoURL: null,
    joinedAt: serverTimestamp(),
    postsCount: 0,
    role: 'user',
    status: 'active',
    lastPostAt: null,
    lastCommentAt: null,
    displayNameNormalized: normalizeDisplayName(nameForNormalization),
    ...overrides,
  };
};

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
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(postDoc)) {
    if (key !== 'category') rest[key] = value;
  }
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
  mediaWidth: null,
  mediaHeight: null,
  commentsCount: 0,
  likesCount: 0,
  createdAt: serverTimestamp(),
  status: 'active',
  searchTokens: ['منشور', 'تجريبي'],
  // Feed ranking (Phase 2) — every ALLOW-case post create must now include
  // this exact constant, or the new rule denies it outright. Included here
  // in the shared default so every pre-existing ALLOW test in this file
  // keeps working unchanged; overrides below intentionally omit/replace it
  // to test the new validation branch itself.
  feedScore: 100,
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

  await record('P2 valid image post create (mediaSize under cap, correct uid-scoped mediaPath, real dimensions)', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-p2'), validPostDoc('uidA', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 400 * 1024,
      mediaPath: 'community/posts/uidA/post-p2',
      mediaWidth: 1600,
      mediaHeight: 1000,
    })));

  // Correction pass — image-only publish: an image post's text may be
  // completely empty (the image itself is valid content on its own), which
  // requires a genuinely different rule branch than P2 above (P2 still
  // carries validPostDoc's own default non-empty text). This is the exact
  // server-side counterpart to PostComposer.tsx's canSubmit fix.
  await record('P2b image post with EMPTY text is allowed — image-only publishing', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-p2b-image-only'), validPostDoc('uidA', {
      text: '',
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 400 * 1024,
      mediaPath: 'community/posts/uidA/post-p2b-image-only',
      mediaWidth: 1600,
      mediaHeight: 1000,
    })));

  await record('P2c image post with a non-empty caption is allowed (image + optional text together)', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-p2c-image-caption'), validPostDoc('uidA', {
      text: 'أي نوع من الموتورات هذا؟',
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 400 * 1024,
      mediaPath: 'community/posts/uidA/post-p2c-image-caption',
      mediaWidth: 1600,
      mediaHeight: 1000,
    })));

  // TEMPORARY (bridge until Firebase Blaze billing is restored — see
  // docs/KNOWN_ISSUES.md's "Comment creation temporarily reverted..."
  // entry) — comment creation is back to a direct, Rules-validated client
  // write; a well-formed comment create is allowed again (uidA has no
  // lastCommentAt yet at this point in the suite, so the new 5s cooldown
  // does not block it). REVERT this assertion back to 'deny' (Cloud-
  // Function-only) once the permanent re-migration happens. See section 16
  // below for the full set of direct-write proofs (allow + rate-limit deny)
  // across every caller identity.
  await record('P3 direct client comment create (valid shape) is ALLOWED again (TEMPORARY revert)', 'allow', () =>
    setDoc(doc(asA.firestore(), 'posts/post-existing/comments/comment-p3'), {
      authorId: 'uidA', authorName: 'Pilot A', authorPhoto: null,
      text: 'تعليق صالح', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    }));

  await record('P4 owner reads own savedPosts entry', 'allow', () =>
    getDoc(doc(asA.firestore(), 'users/uidA/savedPosts/post-existing')));

  await record('P4b owner creates a new savedPosts entry', 'allow', () =>
    setDoc(doc(asA.firestore(), 'users/uidA/savedPosts/post-p1'), {
      postId: 'post-p1', savedAt: serverTimestamp(),
    }));

  await record('P5 valid Storage image upload (own uid-scoped path, UUID filename, under 2MB)', 'allow', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('P5b unauthenticated Storage upload is denied', 'deny', () =>
    uploadBytes(
      ref(testEnv.unauthenticatedContext().storage(), 'community/posts/uidA/post-p2/f47ac10b-58cc-4372-a567-0e02b2c3d479.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('P5c a DIFFERENT active user cannot write into uidA\'s own path (Phase 9 fix — the previous scheme had no per-author path scoping at all)', 'deny', () =>
    uploadBytes(
      ref(asB.storage(), 'community/posts/uidA/post-p2/9d3f1e60-2c1a-4b5e-9f0a-1234567890ab.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('P5d a banned user cannot write even into their OWN uid-matching path (the active-status gate is preserved, not merely replaced by path scoping)', 'deny', () =>
    uploadBytes(
      ref(asBanned.storage(), 'community/posts/uidBanned/post-banned-media/2b3c4d5e-6f70-4819-9a2b-3c4d5e6f7081.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('P5e oversized upload (over the 2MB physical cap) is denied', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/6ba7b810-9dad-11d1-80b4-00c04fd430c8.jpg'),
      new Uint8Array(2 * 1024 * 1024 + 1),
      { contentType: 'image/jpeg' },
    ));

  await record('P5f a disallowed MIME type (image/svg+xml — an XML/script-capable payload, not a raster image) is denied even with a .jpg-named path', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/7c9e6679-7425-40de-944b-e07fc1f90ae7.jpg'),
      new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
      { contentType: 'image/svg+xml' },
    ));

  await record('P5g a disallowed MIME type (image/gif) is denied', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/16fd2706-8baf-433b-82eb-8c7fada847da.jpg'),
      new Uint8Array([0x47, 0x49, 0x46, 0x38]),
      { contentType: 'image/gif' },
    ));

  await record('P5h the owner CAN delete their own uploaded file (required for useComposer.ts\'s client-side orphan cleanup)', 'allow', () =>
    deleteObject(ref(asA.storage(), 'community/posts/uidA/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpg')));

  await testEnv.withSecurityRulesDisabled(async ctx => {
    await uploadBytes(
      ref(ctx.storage(), 'community/posts/uidA/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    );
  });

  await record('P5i a DIFFERENT user cannot delete uidA\'s uploaded file', 'deny', () =>
    deleteObject(ref(asB.storage(), 'community/posts/uidA/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.jpg')));

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

  console.log('\n=== 4b. Empty/whitespace-only text — image-only publish correction pass ===');

  await record('reject a completely empty post (mediaType none, text empty) — no image and no text is not valid content', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-empty'), validPostDoc('uidB', { text: '' })));

  await record('reject a text-only post whose text is whitespace-only (a single space) — meaningless content, not merely "non-zero length"', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-whitespace-only'), validPostDoc('uidB', { text: ' ' })));

  await record('reject a text-only post whose text is multiple whitespace characters (spaces/tabs/newlines only)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-whitespace-only-2'), validPostDoc('uidB', { text: '   \t\n  ' })));

  // Uses asB, not asA — uidA was deliberately rate-limited by the "Rate-limit
  // distance" section above (its lastPostAt was bumped to simulate "just
  // posted"), and this is an ALLOW case that must not collide with an
  // unrelated, already-tested rate-limit denial.
  await record('allow a text-only post whose text has LEADING/TRAILING whitespace around real content (the content itself is meaningful; Rules only reject ALL-whitespace text)', 'allow', () =>
    setDoc(doc(asB.firestore(), 'posts/post-p2d-padded-text'), validPostDoc('uidB', { text: '  محتوى حقيقي  ' })));

  console.log('\n=== 5. Wrong mediaPath ===');

  await record('reject image post whose mediaPath does not match its own postId', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-wrong-path'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/uidB/SOME-OTHER-POST-ID',
      mediaWidth: 800, mediaHeight: 600,
    })));

  await record('reject image post whose mediaPath uses another user\'s uid segment (spoofing authorship of the media)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-wrong-uid-path'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/uidA/post-wrong-uid-path',
      mediaWidth: 800, mediaHeight: 600,
    })));

  await record('reject image post using the OLD pre-Phase-9 mediaPath shape (no uid segment at all)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-old-path-shape'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/post-old-path-shape',
      mediaWidth: 800, mediaHeight: 600,
    })));

  console.log('\n=== 5b. Invalid/missing media dimensions (Phase 9) ===');

  await record('reject image post with mediaWidth missing (field omitted entirely)', 'deny', () => {
    const doc_ = validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/uidB/post-no-width',
      mediaHeight: 600,
    });
    const { mediaWidth: _omit, ...withoutWidth } = doc_;
    void _omit;
    return setDoc(doc(asB.firestore(), 'posts/post-no-width'), withoutWidth);
  });

  await record('reject image post with mediaWidth <= 0', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-zero-width'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/uidB/post-zero-width',
      mediaWidth: 0, mediaHeight: 600,
    })));

  await record('reject image post with a nonsensical mediaHeight (over the 10000px ceiling)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-huge-height'), validPostDoc('uidB', {
      mediaType: 'image',
      mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
      thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
      mediaSize: 100 * 1024,
      mediaPath: 'community/posts/uidB/post-huge-height',
      mediaWidth: 800, mediaHeight: 999999,
    })));

  console.log('\n=== 6. Bad UUID filename ===');

  await record('reject Storage upload with a non-matching filename', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/not a valid name!.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]),
      { contentType: 'image/jpeg' },
    ));

  await record('reject Storage upload with the wrong extension', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/3f2504e0-4f89-11d3-9a0c-0305e82c3301.png'),
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
      mediaPath: 'community/posts/uidB/post-oversized-media',
      mediaWidth: 800, mediaHeight: 600,
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
      const displayName = identity.displayName ?? 'مستخدم';
      tx.set(userRef, {
        displayName,
        photoURL: identity.photoURL ?? null,
        joinedAt: serverTimestamp(),
        postsCount: 0,
        role: 'user',
        status: 'active',
        lastPostAt: null,
        lastCommentAt: null,
        displayNameNormalized: normalizeDisplayName(displayName),
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

  console.log('\n=== 16. Comment creation — TEMPORARY direct-client-write bridge (Blaze billing) ===');
  console.log('    (TEMPORARY — see docs/KNOWN_ISSUES.md\'s "Comment creation temporarily');
  console.log('    reverted..." entry. Direct client comment create is allowed again, gated by a');
  console.log('    short 5s global-per-user cooldown on users/{uid}.lastCommentAt, enforced right');
  console.log('    here in firestore.rules — NOT server-side anymore. createComment/');
  console.log('    functions/src/index.ts still exists and is exercised by');
  console.log('    scripts/testCommunityFunctions.ts, but is unreachable from the client while');
  console.log('    this bridge is live. REVERT this section back to "Cloud-Function-only, direct');
  console.log('    client bypass proofs" (all-deny) once the permanent re-migration happens.)');

  const asDirectA = testEnv.authenticatedContext('uidDirectCommentA');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidDirectCommentA'), validUserDoc({ displayName: 'Direct Comment Pilot' }));
    await setDoc(doc(db, 'posts/post-direct-comment'), validPostDoc('uidA', { text: 'target for direct-create bypass proofs' }));
  });

  await record('R1 direct client comment create (valid shape, active user) is ALLOWED again (TEMPORARY revert)', 'allow', () =>
    setDoc(doc(asDirectA.firestore(), 'posts/post-direct-comment/comments/comment-direct-1'), {
      authorId: 'uidDirectCommentA', authorName: 'Direct Comment Pilot', authorPhoto: null,
      text: 'محاولة إنشاء مباشر', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    }));

  // Mirror the real client's batch pairing (useCommentComposer.ts writes
  // commentsCount/lastCommentAt in the SAME batch as the comment itself) so
  // R4 below is evaluated against a real lastCommentAt bump, not a stale
  // null — a raw setDoc alone (as R1 above does) never touches the user
  // doc, so without this the rate limit below could never actually engage.
  await updateDoc(doc(asDirectA.firestore(), 'posts/post-direct-comment'), { commentsCount: increment(1) });
  await updateDoc(doc(asDirectA.firestore(), 'users/uidDirectCommentA'), { lastCommentAt: serverTimestamp() });

  await record('R2 direct client comment create by a guest is denied', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'posts/post-direct-comment/comments/comment-direct-2'), {
      authorId: 'uidGuestDirect', authorName: 'Guest', authorPhoto: null,
      text: 'محاولة زائر', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    }));

  await record('R3 direct client comment create by a banned user is denied', 'deny', () =>
    setDoc(doc(asBanned.firestore(), 'posts/post-direct-comment/comments/comment-direct-3'), {
      authorId: 'uidBanned', authorName: 'Banned Pilot', authorPhoto: null,
      text: 'محاولة محظور', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    }));

  // TEMPORARY (see docs/KNOWN_ISSUES.md) — a second, DISTINCT direct attempt
  // on the same post, immediately after R1's, is now denied by the new 5s
  // global-per-user cooldown on lastCommentAt (just bumped above), NOT
  // because the path is Cloud-Function-only anymore. REVERT this back to
  // asserting total denial (no time-gating reason at all) once the
  // permanent re-migration happens.
  await record('R4 a second, DISTINCT direct comment create attempt on the same post is denied by the new 5s cooldown (TEMPORARY)', 'deny', () =>
    setDoc(doc(asDirectA.firestore(), 'posts/post-direct-comment/comments/comment-direct-4'), {
      authorId: 'uidDirectCommentA', authorName: 'Direct Comment Pilot', authorPhoto: null,
      text: 'تعليق مختلف تماماً بمحتوى آخر', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    }));

  await record('R5 the rateLimits bookkeeping subcollection is fully closed to every client read/write, even the owner (Admin-SDK-only, defense-in-depth)', 'deny', () =>
    getDoc(doc(asDirectA.firestore(), 'users/uidDirectCommentA/rateLimits/comments')));

  console.log('\n=== 17. Comment likes (Phase 6, corrected) — Cloud-Function-only, direct client bypass proofs ===');
  console.log('    (real concurrent like/unlike behavior now lives server-side in');
  console.log('    toggleCommentLike and is exercised in scripts/testCommunityFunctions.ts.)');

  const asLikeA = testEnv.authenticatedContext('uidLikeA');
  const asLikeB = testEnv.authenticatedContext('uidLikeB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidLikeA'), validUserDoc({ displayName: 'Like Pilot A' }));
    await setDoc(doc(db, 'users/uidLikeB'), validUserDoc({ displayName: 'Like Pilot B' }));
    await setDoc(doc(db, 'posts/post-like-target'), validPostDoc('uidA', { text: 'post with a likeable comment' }));
    await setDoc(doc(db, 'posts/post-like-target/comments/comment-like-target'), {
      authorId: 'uidA', authorName: 'Pilot A', authorPhoto: null,
      text: 'علّق عليّ', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    });
  });

  await record('K1 direct client like create (own uid) is denied — like creation is Cloud-Function-only now', 'deny', () =>
    setDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA'), { createdAt: serverTimestamp() }));

  await record('K2 direct client like create at another user\'s uid path (spoofing another user\'s like) is denied', 'deny', () =>
    setDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeB'), { createdAt: serverTimestamp() }));

  await record('K3 a guest cannot create a like', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidGuestLike'), { createdAt: serverTimestamp() }));

  await record('K4 a direct +1 likesCount update is denied — no client write to this field remains in ANY shape now (closes the gap the previous pass explicitly accepted as a risk)', 'deny', () =>
    updateDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target'), { likesCount: increment(1) }));

  await record('K5 a direct arbitrary likesCount write is denied', 'deny', () =>
    updateDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target'), { likesCount: 9999 }));

  // Seed a real like document (rules disabled, simulating one already
  // created by toggleCommentLike) so K6/K7 can prove delete is ALSO closed
  // to the client, not merely create.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA'), { createdAt: serverTimestamp() });
  });

  await record('K6 the like\'s own owner cannot directly delete it — unlike is Cloud-Function-only too', 'deny', () =>
    deleteDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  await record('K7 a different user cannot delete uidLikeA\'s like either', 'deny', () =>
    deleteDoc(doc(asLikeB.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  await record('K8 anyone (including a guest) CAN still read a like — likes remain public, only writes moved server-side', 'allow', () =>
    getDoc(doc(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  console.log('\n=== 18. Concurrent DIRECT bypass attempts (Phase 6, corrected) ===');
  console.log('    Real concurrency correctness (5 different users liking at once, one user');
  console.log('    rapidly toggling) is now a Cloud Function / Admin-SDK-transaction property,');
  console.log('    proven against the Functions Emulator in scripts/testCommunityFunctions.ts.');
  console.log('    This suite\'s job is narrower: prove that even MANY simultaneous direct');
  console.log('    client bypass attempts are ALL denied, none slipping through under race.');

  const concurrentBypassLikers = ['uidBypassA', 'uidBypassB', 'uidBypassC', 'uidBypassD', 'uidBypassE'];
  await testEnv.withSecurityRulesDisabled(async ctx => {
    for (const uid of concurrentBypassLikers) {
      await setDoc(doc(ctx.firestore(), 'users', uid), validUserDoc({ displayName: uid }));
    }
  });

  const concurrentBypassResults = await Promise.allSettled(
    concurrentBypassLikers.map(uid =>
      setDoc(
        doc(testEnv.authenticatedContext(uid).firestore(), `posts/post-like-target/comments/comment-like-target/likes/${uid}`),
        { createdAt: serverTimestamp() },
      ),
    ),
  );
  assertValue(
    'C1 all 5 concurrent DIRECT like-create bypass attempts from 5 different users are rejected (none succeed)',
    concurrentBypassResults.filter(r => r.status === 'fulfilled').length,
    0,
  );

  const likeDocsAfterBypassAttempt = await getDocs(
    collection(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes'),
  );
  assertValue(
    'C2 zero like documents exist after the concurrent bypass attempt (only the one seeded directly via withSecurityRulesDisabled for K6/K7 remains)',
    likeDocsAfterBypassAttempt.docs.length,
    1,
  );

  console.log('\n=== 19. Field-injection / privacy regression locks (Phase 6) ===');

  await record('E1 email field injection into a NEW user bootstrap document is rejected', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidEmailInject1').firestore(), 'users/uidEmailInject1'), {
      ...validUserDoc({ displayName: 'Email Injector' }),
      email: 'leaked@example.com',
    }));

  await record('E2 user bootstrap create is rejected when displayNameNormalized is missing entirely', 'deny', () => {
    const { displayNameNormalized: _omit, ...withoutNormalized } = validUserDoc({ displayName: 'No Normalized Field' });
    void _omit;
    return setDoc(doc(testEnv.authenticatedContext('uidNoNormalized').firestore(), 'users/uidNoNormalized'), withoutNormalized);
  });

  // Phase 8: a narrow, owner-only, displayNameNormalized-ONLY update is now
  // allowed (the backfill shape ensureCommunityUser.ts uses for a
  // pre-existing account missing/stale on this field) — Rules validate
  // shape/type only, the same client-trust model already accepted for its
  // value at creation. displayName ITSELF and every other field remain
  // completely locked from any client update path.
  await record('E3 a narrow displayNameNormalized-only update (the backfill shape) is allowed for the owner', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { displayNameNormalized: normalizeDisplayName('Pilot') }));

  await record('E3b displayName itself still cannot be changed via any update path', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { displayName: 'Forged New Name' }));

  await record('E3c combining a displayNameNormalized change with any other field in the SAME update is still denied (the backfill shape must be single-field only)', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { displayNameNormalized: 'x', photoURL: 'https://forged.example.invalid/x.jpg' }));

  await record('E3d a non-owner cannot backfill another user\'s displayNameNormalized', 'deny', () =>
    updateDoc(doc(asB.firestore(), 'users/uidA'), { displayNameNormalized: normalizeDisplayName('Pilot') }));

  await record('E4 email field injection into a post create is rejected (pre-existing hasOnly() allow-list, regression-locked here)', 'deny', () =>
    setDoc(doc(asB.firestore(), 'posts/post-email-inject'), {
      ...validPostDoc('uidB'),
      email: 'leaked@example.com',
    }));

  // TEMPORARY (see docs/KNOWN_ISSUES.md) — comment creation is no longer
  // denied outright (section 16), so this now genuinely tests the
  // hasOnly(['authorId', 'authorName', 'authorPhoto', 'text', 'createdAt',
  // 'status', 'likesCount']) allow-list on the reverted create rule: an
  // injected `email` field is rejected because it isn't in that list, not
  // because comment creation is Cloud-Function-only. REVERT this comment
  // back to describing total denial once the permanent re-migration
  // happens.
  await record('E5 direct client comment create with an injected email field is denied by the hasOnly() allow-list', 'deny', () =>
    setDoc(doc(asA.firestore(), 'posts/post-existing/comments/comment-email-inject'), {
      authorId: 'uidA', authorName: 'Pilot A', authorPhoto: null,
      text: 'محاولة تسريب', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
      email: 'leaked@example.com',
    }));

  await record('E6 email field injection into a public-profile-adjacent field via update is rejected (users/{uid} update only ever allows the two narrow paired-write shapes)', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { email: 'leaked@example.com' }));

  await record('E7 a fake "provider" field injection into a new user bootstrap document is rejected (hasOnly() allow-list, same mechanism as E1)', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidProviderInject').firestore(), 'users/uidProviderInject'), {
      ...validUserDoc({ displayName: 'Provider Injector' }),
      provider: 'google.com',
    }));

  await record('E8 a fake private-settings field injection into a new user bootstrap document is rejected', 'deny', () =>
    setDoc(doc(testEnv.authenticatedContext('uidSettingsInject').firestore(), 'users/uidSettingsInject'), {
      ...validUserDoc({ displayName: 'Settings Injector' }),
      privateSettings: { notificationsEnabled: true },
    }));

  console.log('\n=== 20. Post likes (Phase 7) — Cloud-Function-only, direct client bypass proofs ===');
  console.log('    (real concurrent like/unlike behavior now lives server-side in');
  console.log('    togglePostLike and is exercised in scripts/testCommunityFunctions.ts.)');

  const asPostLikeA = testEnv.authenticatedContext('uidPostLikeA');
  const asPostLikeB = testEnv.authenticatedContext('uidPostLikeB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidPostLikeA'), validUserDoc({ displayName: 'Post Like Pilot A' }));
    await setDoc(doc(db, 'users/uidPostLikeB'), validUserDoc({ displayName: 'Post Like Pilot B' }));
    await setDoc(doc(db, 'posts/post-like-target-post'), validPostDoc('uidA', { text: 'a likeable post' }));
  });

  await record('PL1 direct client post-like create (own uid) is denied — like creation is Cloud-Function-only', 'deny', () =>
    setDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA'), { createdAt: serverTimestamp() }));

  await record('PL2 direct client post-like create at another user\'s uid path (spoofing) is denied', 'deny', () =>
    setDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeB'), { createdAt: serverTimestamp() }));

  await record('PL3 a guest cannot create a post like', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'posts/post-like-target-post/likes/uidGuestPostLike'), { createdAt: serverTimestamp() }));

  await record('PL4 a direct +1 post likesCount update is denied', 'deny', () =>
    updateDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post'), { likesCount: increment(1) }));

  await record('PL5 a direct arbitrary post likesCount write is denied', 'deny', () =>
    updateDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post'), { likesCount: 9999 }));

  // Seed a real like document (rules disabled, simulating one already
  // created by togglePostLike) so PL6/PL7 can prove delete is ALSO closed
  // to the client, not merely create.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA'), { createdAt: serverTimestamp() });
  });

  await record('PL6 the like\'s own owner cannot directly delete it — unlike is Cloud-Function-only too', 'deny', () =>
    deleteDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA')));

  await record('PL7 a different user cannot delete uidPostLikeA\'s like either', 'deny', () =>
    deleteDoc(doc(asPostLikeB.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA')));

  await record('PL8 anyone (including a guest) CAN still read a post like — likes remain public, only writes moved server-side', 'allow', () =>
    getDoc(doc(asGuest.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA')));

  console.log('\n=== 21. Post creation likesCount field lock (Phase 7) ===');

  // Fresh, never-posted uids — uidB has already successfully created a post
  // earlier in this suite (section 12), so reusing it here would risk the
  // 60s rate-limit denial masking the specific check this section exists to
  // prove; a fresh uid guarantees the denial below is actually caused by
  // the likesCount validation, not an incidental rate-limit collision.
  const asPostCreateLikesCountA = testEnv.authenticatedContext('uidPostCreateLikesCountA');
  const asPostCreateLikesCountB = testEnv.authenticatedContext('uidPostCreateLikesCountB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidPostCreateLikesCountA'), validUserDoc({ displayName: 'Post Create LikesCount Pilot A' }));
    await setDoc(doc(db, 'users/uidPostCreateLikesCountB'), validUserDoc({ displayName: 'Post Create LikesCount Pilot B' }));
  });

  await record('PC1 post create with likesCount != 0 is rejected', 'deny', () =>
    setDoc(doc(asPostCreateLikesCountA.firestore(), 'posts/post-likescount-forged'), validPostDoc('uidPostCreateLikesCountA', {
      authorName: 'Post Create LikesCount Pilot A', likesCount: 5,
    })));

  await record('PC2 post create with likesCount missing entirely is rejected', 'deny', () => {
    const { likesCount: _omit, ...withoutLikesCount } = validPostDoc('uidPostCreateLikesCountB', { authorName: 'Post Create LikesCount Pilot B' });
    void _omit;
    return setDoc(doc(asPostCreateLikesCountB.firestore(), 'posts/post-likescount-missing'), withoutLikesCount);
  });

  console.log('\n=== 22. Feed ranking (Phase 2) — feedScore/feedScoreComputedAt/feedScoreFrozen validation ===');

  // Fresh, never-posted uids per the same rationale as section 21 — a
  // shared uid across many create attempts would risk the real, correct
  // 60s rate limit masking the SPECIFIC feedScore validation this section
  // exists to prove.
  const asFeedScoreA = testEnv.authenticatedContext('uidFeedScoreA');
  const asFeedScoreB = testEnv.authenticatedContext('uidFeedScoreB');
  const asFeedScoreC = testEnv.authenticatedContext('uidFeedScoreC');
  const asFeedScoreD = testEnv.authenticatedContext('uidFeedScoreD');
  const asFeedScoreE = testEnv.authenticatedContext('uidFeedScoreE');
  const asFeedScoreF = testEnv.authenticatedContext('uidFeedScoreF');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    for (const [uid, name] of [
      ['uidFeedScoreA', 'FeedScore Pilot A'], ['uidFeedScoreB', 'FeedScore Pilot B'],
      ['uidFeedScoreC', 'FeedScore Pilot C'], ['uidFeedScoreD', 'FeedScore Pilot D'],
      ['uidFeedScoreE', 'FeedScore Pilot E'], ['uidFeedScoreF', 'FeedScore Pilot F'],
    ]) {
      await setDoc(doc(db, `users/${uid}`), validUserDoc({ displayName: name }));
    }
  });

  await record('FS1 post create with feedScore != 100 (a forged client-computed value) is rejected', 'deny', () =>
    setDoc(doc(asFeedScoreA.firestore(), 'posts/post-feedscore-forged'), validPostDoc('uidFeedScoreA', {
      authorName: 'FeedScore Pilot A', feedScore: 999,
    })));

  await record('FS2 post create with feedScore missing entirely is rejected', 'deny', () => {
    const { feedScore: _omit, ...withoutFeedScore } = validPostDoc('uidFeedScoreB', { authorName: 'FeedScore Pilot B' });
    void _omit;
    return setDoc(doc(asFeedScoreB.firestore(), 'posts/post-feedscore-missing'), withoutFeedScore);
  });

  await record('FS3 post create with a forged non-null feedScoreComputedAt is rejected', 'deny', () =>
    setDoc(doc(asFeedScoreC.firestore(), 'posts/post-feedscorecomputedat-forged'), validPostDoc('uidFeedScoreC', {
      authorName: 'FeedScore Pilot C', feedScoreComputedAt: serverTimestamp(),
    })));

  await record('FS4 post create with feedScoreComputedAt explicitly null (the only legitimate value at creation) is allowed', 'allow', () =>
    setDoc(doc(asFeedScoreD.firestore(), 'posts/post-feedscorecomputedat-null'), validPostDoc('uidFeedScoreD', {
      authorName: 'FeedScore Pilot D', feedScoreComputedAt: null,
    })));

  await record('FS5 post create with a forged feedScoreFrozen=true is rejected', 'deny', () =>
    setDoc(doc(asFeedScoreE.firestore(), 'posts/post-feedscorefrozen-forged'), validPostDoc('uidFeedScoreE', {
      authorName: 'FeedScore Pilot E', feedScoreFrozen: true,
    })));

  await record('FS6 post create with feedScoreFrozen explicitly false (the only legitimate value at creation) is allowed', 'allow', () =>
    setDoc(doc(asFeedScoreF.firestore(), 'posts/post-feedscorefrozen-false'), validPostDoc('uidFeedScoreF', {
      authorName: 'FeedScore Pilot F', feedScoreFrozen: false,
    })));

  // Update-path proof — feedScore has NO client-writable update path at
  // all (firestore.rules' own comment on the update rule): every one of
  // its three OR-branches is an explicit hasOnly() allow-list that does
  // not include feedScore, so a diff touching it is denied by
  // construction, exactly like likesCount. This directly exercises that
  // real behavior rather than just trusting the comment.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-feedscore-update-target'), validPostDoc('uidFeedScoreA', { authorName: 'FeedScore Pilot A' }));
  });
  await record('FS7 a direct client update attempting to change feedScore post-creation is rejected (no client update path exists)', 'deny', () =>
    updateDoc(doc(asFeedScoreA.firestore(), 'posts/post-feedscore-update-target'), { feedScore: 500 }));

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

  await testEnv.cleanup();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
