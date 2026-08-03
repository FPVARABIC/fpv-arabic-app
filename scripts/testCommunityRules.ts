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
  query, where, limit, runTransaction, getCountFromServer, serverTimestamp, Timestamp, increment,
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

  // ── Video in Storage (web Batch 3) ──────────────────────────────────────
  //
  // The image cases above are unchanged and still run; these are the new
  // branch. What matters most here is the NEGATIVE set: a video path must not
  // become a way around the image rules, and the byte ceiling must be the real
  // physical one rather than a number a client reports about itself.
  const VID = new Uint8Array([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]); // ftyp box

  await record('MV1 the owner may upload an mp4 under the size ceiling', 'allow', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/aa11bb22-cc33-4d44-8e55-ff6677889900.mp4'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV2 the owner may upload a webm', 'allow', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/bb22cc33-dd44-4e55-9f66-001122334455.webm'),
      VID, { contentType: 'video/webm' },
    ));

  await record('MV3 an unauthenticated caller cannot upload a video', 'deny', () =>
    uploadBytes(
      ref(testEnv.unauthenticatedContext().storage(), 'community/posts/uidA/post-p2/cc33dd44-ee55-4f66-a077-112233445566.mp4'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV4 a different user cannot upload a video into uidA\'s path', 'deny', () =>
    uploadBytes(
      ref(asB.storage(), 'community/posts/uidA/post-p2/dd44ee55-ff66-4077-b188-223344556677.mp4'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV5 a banned user cannot upload a video into their own path', 'deny', () =>
    uploadBytes(
      ref(asBanned.storage(), 'community/posts/uidBanned/post-banned-media/ee55ff66-0077-4188-9299-334455667788.mp4'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV6 a video over the 40MB physical ceiling is denied', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/ff660077-1188-4299-83aa-445566778899.mp4'),
      new Uint8Array(40 * 1024 * 1024 + 1), { contentType: 'video/mp4' },
    ));

  await record('MV7 a video container the browser cannot play (video/quicktime) is denied', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/00771188-2299-43aa-94bb-556677889900.mp4'),
      VID, { contentType: 'video/quicktime' },
    ));

  // The renamed-payload cases. A file's NAME must never be what decides how it
  // is treated, and its declared type must never be able to launder it into a
  // branch with a laxer limit.
  await record('MV8 an executable declared as video/mp4 under a .mp4 name is still denied by content type shape', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/11882299-33aa-44bb-85cc-6677889900aa.mp4'),
      VID, { contentType: 'application/x-msdownload' },
    ));

  await record('MV9 an image content type under a .mp4 filename is denied (name and type must agree)', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/229933aa-44bb-45cc-96dd-77889900aabb.mp4'),
      VID, { contentType: 'image/jpeg' },
    ));

  await record('MV10 a video content type under a .jpg filename is denied — it would smuggle 40MB past the 2MB image cap', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/33aa44bb-55cc-46dd-a7ee-889900aabbcc.jpg'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV11 an arbitrary extension is denied even with an allowed content type', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/44bb55cc-66dd-47ee-b8ff-9900aabbccdd.mkv'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV12 a path traversal in the filename is denied', 'deny', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/..%2F..%2Fevil.mp4'),
      VID, { contentType: 'video/mp4' },
    ));

  await record('MV13 a video poster is an ordinary _thumb.jpg — governed by the unchanged image branch', 'allow', () =>
    uploadBytes(
      ref(asA.storage(), 'community/posts/uidA/post-p2/aa11bb22-cc33-4d44-8e55-ff6677889900_thumb.jpg'),
      new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), { contentType: 'image/jpeg' },
    ));

  await record('MV14 the owner may delete their own video', 'allow', () =>
    deleteObject(ref(asA.storage(), 'community/posts/uidA/post-p2/aa11bb22-cc33-4d44-8e55-ff6677889900.mp4')));

  await record('MV15 a different user cannot delete uidA\'s video', 'deny', () =>
    deleteObject(ref(asB.storage(), 'community/posts/uidA/post-p2/bb22cc33-dd44-4e55-9f66-001122334455.webm')));

  await record('MV16 a moderator has NO implicit access to another user\'s files — moderation runs through the Admin SDK, not a Storage grant', 'deny', () =>
    deleteObject(ref(testEnv.authenticatedContext('uidMod').storage(), 'community/posts/uidA/post-p2/bb22cc33-dd44-4e55-9f66-001122334455.webm')));

  console.log('\n=== 0b. Video posts in Firestore (web Batch 3) ===');
  {
    // A video post's document, shaped exactly as web/lib/communityWrites.ts
    // writes it. `uidC` is used so these creates are not fighting uidA's
    // 60-second posting rate limit, which the earlier cases already armed.
    const asC = testEnv.authenticatedContext('uidC');
    await testEnv.withSecurityRulesDisabled(async ctx => {
      // The displayName MUST equal what validPostDoc will put in authorName
      // (its `?? 'Pilot'` fallback for a uid absent from AUTHOR_NAMES), because
      // the create rule compares the two. A mismatch here fails every VP case
      // for a reason that has nothing to do with video.
      await setDoc(doc(ctx.firestore(), 'users/uidC'), validUserDoc({ displayName: 'Pilot' }));
    });

    const videoPost = (postId: string, uid: string, overrides: Record<string, unknown> = {}) =>
      validPostDoc(uid, {
        mediaType: 'video',
        mediaURL: 'https://example.test/v.mp4',
        thumbnailURL: 'https://example.test/v_thumb.jpg',
        mediaSize: 12 * 1024 * 1024,
        mediaDuration: 24,
        mediaPath: `community/posts/${uid}/${postId}`,
        mediaWidth: 1920,
        mediaHeight: 1080,
        ...overrides,
      });

    await record('VP1 a well-formed video post is accepted', 'allow', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-1'), videoPost('post-vid-1', 'uidC')));

    // Everything below must be refused. These are the reasons the mediaType
    // allow-list was widened carefully rather than by deleting a condition.
    await record('VP2 a video post whose mediaPath points at ANOTHER user is denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-2'), videoPost('post-vid-2', 'uidC', {
        mediaPath: 'community/posts/uidA/post-vid-2',
      })));

    await record('VP3 a video post whose mediaPath points at a DIFFERENT post id is denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-3'), videoPost('post-vid-3', 'uidC', {
        mediaPath: 'community/posts/uidC/some-other-post',
      })));

    await record('VP4 a video post with no duration is denied — duration is required, unlike for an image', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-4'), videoPost('post-vid-4', 'uidC', { mediaDuration: null })));

    await record('VP5 a video longer than the 60s bound is denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-5'), videoPost('post-vid-5', 'uidC', { mediaDuration: 61 })));

    await record('VP6 a video with a negative duration is denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-6'), videoPost('post-vid-6', 'uidC', { mediaDuration: -1 })));

    await record('VP7 a video declaring more than the 40MB bound is denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-7'), videoPost('post-vid-7', 'uidC', {
        mediaSize: 40 * 1024 * 1024 + 1,
      })));

    await record('VP8 a video post with no poster (thumbnailURL) is denied — the feed could not render it', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-8'), videoPost('post-vid-8', 'uidC', { thumbnailURL: null })));

    await record('VP9 an IMAGE post may still not carry a duration (the image branch is unchanged)', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-9'), validPostDoc('uidC', {
        mediaType: 'image',
        mediaURL: 'https://example.test/i.jpg',
        thumbnailURL: 'https://example.test/i_thumb.jpg',
        mediaSize: 100 * 1024,
        mediaDuration: 10,
        mediaPath: 'community/posts/uidC/post-vid-9',
        mediaWidth: 800, mediaHeight: 600,
      })));

    await record('VP10 a TEXT post may still not carry any media field (the none branch is unchanged)', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-10'), validPostDoc('uidC', {
        mediaType: 'none', mediaDuration: 5,
      })));

    await record('VP11 an unknown mediaType is still denied', 'deny', () =>
      setDoc(doc(asC.firestore(), 'posts/post-vid-11'), videoPost('post-vid-11', 'uidC', { mediaType: 'audio' })));

    await record('VP12 a video post is publicly readable like any other active post', 'allow', () =>
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'posts/post-vid-1')));

    await record('VP13 its author can soft-delete it, and the media fields are untouched by that diff', 'allow', () =>
      updateDoc(doc(asC.firestore(), 'posts/post-vid-1'), { status: 'deleted' }));

    await record('VP14 a soft-deleted video post is no longer publicly readable', 'deny', () =>
      getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'posts/post-vid-1')));
  }

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

  console.log('\n=== 17. Comment likes — TEMPORARY direct-client-write bridge (Blaze billing) ===');
  console.log('    (TEMPORARY — see docs/KNOWN_ISSUES.md\'s "Post/comment likes temporarily');
  console.log('    reverted..." entry. Direct client like create/delete is allowed again,');
  console.log('    paired client-side with a likesCount ±1 update, enforced right here in');
  console.log('    firestore.rules — NOT server-side anymore. toggleCommentLike/');
  console.log('    functions/src/index.ts still exists and is exercised in');
  console.log('    scripts/testCommunityFunctions.ts, but is unreachable from the client while');
  console.log('    this bridge is live. REVERT this section back to "Cloud-Function-only,');
  console.log('    direct client bypass proofs" (all-deny) once the permanent re-migration');
  console.log('    happens.)');

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

  await record('K1 direct client like create (own uid) is ALLOWED again (TEMPORARY revert)', 'allow', () =>
    setDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA'), { createdAt: serverTimestamp() }));

  await record('K2 direct client like create at another user\'s uid path (spoofing another user\'s like) is still denied — isOwner(likerUid) does not depend on the bridge', 'deny', () =>
    setDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeB'), { createdAt: serverTimestamp() }));

  await record('K3 a guest still cannot create a like', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidGuestLike'), { createdAt: serverTimestamp() }));

  // TEMPORARY (see docs/KNOWN_ISSUES.md) — an ISOLATED +1 likesCount update,
  // with no paired likes/{uid} write in the same batch, is now ALLOWED.
  // This is the disclosed, accepted-risk shape shared with commentsCount
  // (see firestore.rules' own comment on this branch) — Rules validate the
  // shape (exact +1, active user, comment still active) but cannot
  // cryptographically confirm a real paired like-doc write happened; that
  // guarantee only existed inside toggleCommentLike's Admin-SDK transaction.
  // REVERT this assertion back to 'deny' once the permanent re-migration
  // happens.
  await record('K4 an isolated +1 likesCount update (no paired like-doc write) is ALLOWED — same accepted risk as commentsCount, not a new one (TEMPORARY)', 'allow', () =>
    updateDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target'), { likesCount: increment(1) }));

  await record('K5 a direct arbitrary (non-±1) likesCount write is still denied', 'deny', () =>
    updateDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target'), { likesCount: 9999 }));

  // Force the like doc back to a known state (rules disabled) regardless of
  // K1's own outcome above, so K6/K7 below are deterministic.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA'), { createdAt: serverTimestamp() });
  });

  await record('K6 the like\'s own owner CAN now directly delete it (TEMPORARY revert) — unlike is a direct write again', 'allow', () =>
    deleteDoc(doc(asLikeA.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  await record('K7 a different user still cannot delete uidLikeA\'s like — isOwner(likerUid) does not depend on the bridge', 'deny', () =>
    deleteDoc(doc(asLikeB.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  await record('K8 anyone (including a guest) CAN still read a like — always public, unaffected by this bridge', 'allow', () =>
    getDoc(doc(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes/uidLikeA')));

  // TEMPORARY (see docs/KNOWN_ISSUES.md) — this section previously proved
  // that concurrent DIRECT bypass attempts were ALL denied (comment likes
  // were Cloud-Function-only). Direct writes are allowed again now, so its
  // purpose is inverted: prove that 5 different users concurrently creating
  // their OWN distinct like — a legitimate scenario now, not a bypass — all
  // succeed independently with no race/interference, each producing exactly
  // one like document. REVERT this section back to "prove concurrent
  // bypass attempts are ALL denied" once the permanent re-migration
  // happens.
  console.log('\n=== 18. Concurrent DISTINCT direct likes — TEMPORARY direct-write bridge ===');
  console.log('    Real concurrency correctness under the PERMANENT design (Admin-SDK');
  console.log('    transactions) is proven against the Functions Emulator in');
  console.log('    scripts/testCommunityFunctions.ts. This suite\'s job here is narrower: prove');
  console.log('    that 5 different users concurrently creating their own distinct like — a');
  console.log('    legitimate action under this TEMPORARY bridge, not a bypass — all succeed');
  console.log('    independently, with no race corrupting the result.');

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
    'C1 all 5 concurrent DISTINCT direct like-creates from 5 different users are ALLOWED (TEMPORARY) — each is a legitimate own-uid create, none conflicts with another',
    concurrentBypassResults.filter(r => r.status === 'fulfilled').length,
    5,
  );

  const likeDocsAfterBypassAttempt = await getDocs(
    collection(asGuest.firestore(), 'posts/post-like-target/comments/comment-like-target/likes'),
  );
  assertValue(
    'C2 exactly 5 like documents exist after the concurrent create burst (TEMPORARY) — uidLikeA\'s own like was already deleted by K6 above, so only the 5 new ones remain',
    likeDocsAfterBypassAttempt.docs.length,
    5,
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

  console.log('\n=== 19c. Preset avatar picker (Part C) — photoURL-only update, constrained to known preset paths ===');

  const PRESET_AVATAR_A = '/assets/avatars/racing-quad.svg';
  const PRESET_AVATAR_B = '/assets/avatars/satellite.svg';

  await record('AV1 a photoURL-only update to a known preset-avatar path is allowed for the owner', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { photoURL: PRESET_AVATAR_A }));

  await record('AV2 a photoURL update to an arbitrary/non-preset string is denied', 'deny', () =>
    updateDoc(doc(asB.firestore(), 'users/uidB'), { photoURL: 'https://forged.example.invalid/not-a-preset.png' }));

  await record('AV3 bundling a preset photoURL change with a role change in the same update is denied', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { photoURL: PRESET_AVATAR_B, role: 'moderator' }));

  await record('AV4 bundling a preset photoURL change with a status change in the same update is denied', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidA'), { photoURL: PRESET_AVATAR_B, status: 'banned' }));

  // Rules never inspect the auth provider — a Google-signed-in user is
  // indistinguishable at the Rules layer from an email/password user (both
  // are just an authenticated uid with an existing users/{uid} doc). uidB
  // stands in for that case explicitly here, proving this update path is
  // provider-agnostic by construction, not merely by omission.
  await record('AV5 a (Google-provider-standing-in) user can successfully change their own preset avatar via the same update path', 'allow', () =>
    updateDoc(doc(asB.firestore(), 'users/uidB'), { photoURL: PRESET_AVATAR_B }));

  await record('AV6 a non-owner cannot change another user\'s preset avatar', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'users/uidB'), { photoURL: PRESET_AVATAR_A }));

  console.log('\n=== 20. Post likes — TEMPORARY direct-client-write bridge (Blaze billing) ===');
  console.log('    (TEMPORARY — see docs/KNOWN_ISSUES.md\'s "Post/comment likes temporarily');
  console.log('    reverted..." entry. Same bridge and same reasoning as comment likes above.');
  console.log('    togglePostLike/functions/src/index.ts still exists and is exercised in');
  console.log('    scripts/testCommunityFunctions.ts, but is unreachable from the client while');
  console.log('    this bridge is live. REVERT this section back to "Cloud-Function-only,');
  console.log('    direct client bypass proofs" (all-deny) once the permanent re-migration');
  console.log('    happens.)');

  const asPostLikeA = testEnv.authenticatedContext('uidPostLikeA');
  const asPostLikeB = testEnv.authenticatedContext('uidPostLikeB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidPostLikeA'), validUserDoc({ displayName: 'Post Like Pilot A' }));
    await setDoc(doc(db, 'users/uidPostLikeB'), validUserDoc({ displayName: 'Post Like Pilot B' }));
    await setDoc(doc(db, 'posts/post-like-target-post'), validPostDoc('uidA', { text: 'a likeable post' }));
  });

  await record('PL1 direct client post-like create (own uid) is ALLOWED again (TEMPORARY revert)', 'allow', () =>
    setDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA'), { createdAt: serverTimestamp() }));

  await record('PL2 direct client post-like create at another user\'s uid path (spoofing) is still denied — isOwner(likerUid) does not depend on the bridge', 'deny', () =>
    setDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeB'), { createdAt: serverTimestamp() }));

  await record('PL3 a guest still cannot create a post like', 'deny', () =>
    setDoc(doc(asGuest.firestore(), 'posts/post-like-target-post/likes/uidGuestPostLike'), { createdAt: serverTimestamp() }));

  // TEMPORARY (see docs/KNOWN_ISSUES.md) — same accepted-risk shape as
  // comment likes' K4 above: an isolated +1 post likesCount update, with no
  // paired like-doc write in the same batch, is now ALLOWED. REVERT this
  // assertion back to 'deny' once the permanent re-migration happens.
  await record('PL4 an isolated +1 post likesCount update (no paired like-doc write) is ALLOWED — same accepted risk as commentsCount, not a new one (TEMPORARY)', 'allow', () =>
    updateDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post'), { likesCount: increment(1) }));

  await record('PL5 a direct arbitrary (non-±1) post likesCount write is still denied', 'deny', () =>
    updateDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post'), { likesCount: 9999 }));

  // Force the like doc back to a known state (rules disabled) regardless of
  // PL1's own outcome above, so PL6/PL7 below are deterministic.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA'), { createdAt: serverTimestamp() });
  });

  await record('PL6 the like\'s own owner CAN now directly delete it (TEMPORARY revert) — unlike is a direct write again', 'allow', () =>
    deleteDoc(doc(asPostLikeA.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA')));

  await record('PL7 a different user still cannot delete uidPostLikeA\'s like — isOwner(likerUid) does not depend on the bridge', 'deny', () =>
    deleteDoc(doc(asPostLikeB.firestore(), 'posts/post-like-target-post/likes/uidPostLikeA')));

  await record('PL8 anyone (including a guest) CAN still read a post like — always public, unaffected by this bridge', 'allow', () =>
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

  console.log('\n=== 23. Notifications system (Phase 1, in-app only) — anti-forgery + read-state + deviceTokens + announcements ===');

  // ── 23a. Follow notifications ──────────────────────────────────────────
  const asFollowNotifA = testEnv.authenticatedContext('uidFollowNotifA');
  const asFollowNotifB = testEnv.authenticatedContext('uidFollowNotifB');
  const asFollowNotifNoRel = testEnv.authenticatedContext('uidFollowNotifNoRel');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidFollowNotifA'), validUserDoc({ displayName: 'Follow Notif Pilot A' }));
    await setDoc(doc(db, 'users/uidFollowNotifB'), validUserDoc({ displayName: 'Follow Notif Pilot B' }));
    await setDoc(doc(db, 'users/uidFollowNotifNoRel'), validUserDoc({ displayName: 'Follow Notif No-Rel Pilot' }));
    // Real, already-committed follow relation — the exact proof the create
    // rule's exists() check demands.
    await setDoc(doc(db, 'users/uidFollowNotifA/following/uidFollowNotifB'), {
      followedId: 'uidFollowNotifB', createdAt: serverTimestamp(),
    });
  });

  await record('N1 real follow notification (actor really follows recipient) is allowed', 'allow', () =>
    setDoc(doc(asFollowNotifA.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-real'), {
      type: 'follow', actorId: 'uidFollowNotifA', actorName: 'Follow Notif Pilot A', actorPhoto: null,
      targetType: 'profile', targetId: 'uidFollowNotifB', postId: null, read: false, createdAt: serverTimestamp(),
    }));

  await record('N2 forged actorId (claims to be someone other than the caller) is denied', 'deny', () =>
    setDoc(doc(asFollowNotifA.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-forged-actor'), {
      type: 'follow', actorId: 'uidFollowNotifNoRel', actorName: 'Follow Notif Pilot A', actorPhoto: null,
      targetType: 'profile', targetId: 'uidFollowNotifB', postId: null, read: false, createdAt: serverTimestamp(),
    }));

  await record('N3 self-notification (writing into your own inbox as if you followed yourself) is denied', 'deny', () =>
    setDoc(doc(asFollowNotifA.firestore(), 'users/uidFollowNotifA/notifications/notif-follow-self'), {
      type: 'follow', actorId: 'uidFollowNotifA', actorName: 'Follow Notif Pilot A', actorPhoto: null,
      targetType: 'profile', targetId: 'uidFollowNotifA', postId: null, read: false, createdAt: serverTimestamp(),
    }));

  await record('N4 no real following relation exists yet — the exists() proof fails, so this is denied', 'deny', () =>
    setDoc(doc(asFollowNotifNoRel.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-norel'), {
      type: 'follow', actorId: 'uidFollowNotifNoRel', actorName: 'Follow Notif No-Rel Pilot', actorPhoto: null,
      targetType: 'profile', targetId: 'uidFollowNotifB', postId: null, read: false, createdAt: serverTimestamp(),
    }));

  await record('N5 forged actorName (does not match the caller\'s real profile displayName) is denied', 'deny', () =>
    setDoc(doc(asFollowNotifA.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-forged-name'), {
      type: 'follow', actorId: 'uidFollowNotifA', actorName: 'Someone Else Entirely', actorPhoto: null,
      targetType: 'profile', targetId: 'uidFollowNotifB', postId: null, read: false, createdAt: serverTimestamp(),
    }));

  // ── 23b. Post-like notifications ───────────────────────────────────────
  const asLikePostNotifA = testEnv.authenticatedContext('uidLikePostNotifA');
  const asLikePostNotifNoLike = testEnv.authenticatedContext('uidLikePostNotifNoLike');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidLikePostNotifA'), validUserDoc({ displayName: 'Like Post Notif Pilot A' }));
    await setDoc(doc(db, 'users/uidLikePostNotifB'), validUserDoc({ displayName: 'Like Post Notif Pilot B' }));
    await setDoc(doc(db, 'users/uidLikePostNotifC'), validUserDoc({ displayName: 'Like Post Notif Pilot C' }));
    await setDoc(doc(db, 'users/uidLikePostNotifNoLike'), validUserDoc({ displayName: 'Like Post Notif No-Like Pilot' }));
    await setDoc(doc(db, 'posts/post-likepostnotif-target'), validPostDoc('uidLikePostNotifB', { authorName: 'Like Post Notif Pilot B' }));
    await setDoc(doc(db, 'posts/post-likepostnotif-target/likes/uidLikePostNotifA'), { createdAt: serverTimestamp() });
  });

  await record('LP1 real post-like notification (actor really liked the post, recipient really is its author) is allowed', 'allow', () =>
    setDoc(doc(asLikePostNotifA.firestore(), 'users/uidLikePostNotifB/notifications/notif-likepost-real'), {
      type: 'like_post', actorId: 'uidLikePostNotifA', actorName: 'Like Post Notif Pilot A', actorPhoto: null,
      targetType: 'post', targetId: 'post-likepostnotif-target', postId: 'post-likepostnotif-target',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LP2 no real like exists for this actor — the exists() proof fails, so this is denied', 'deny', () =>
    setDoc(doc(asLikePostNotifNoLike.firestore(), 'users/uidLikePostNotifB/notifications/notif-likepost-nolike'), {
      type: 'like_post', actorId: 'uidLikePostNotifNoLike', actorName: 'Like Post Notif No-Like Pilot', actorPhoto: null,
      targetType: 'post', targetId: 'post-likepostnotif-target', postId: 'post-likepostnotif-target',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LP3 wrong recipient — the real like exists but this post\'s real author is B, not C — is denied', 'deny', () =>
    setDoc(doc(asLikePostNotifA.firestore(), 'users/uidLikePostNotifC/notifications/notif-likepost-wrongrecipient'), {
      type: 'like_post', actorId: 'uidLikePostNotifA', actorName: 'Like Post Notif Pilot A', actorPhoto: null,
      targetType: 'post', targetId: 'post-likepostnotif-target', postId: 'post-likepostnotif-target',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LP4 forged actorName on an otherwise-real post-like notification is denied', 'deny', () =>
    setDoc(doc(asLikePostNotifA.firestore(), 'users/uidLikePostNotifB/notifications/notif-likepost-forged-name'), {
      type: 'like_post', actorId: 'uidLikePostNotifA', actorName: 'Forged Name', actorPhoto: null,
      targetType: 'post', targetId: 'post-likepostnotif-target', postId: 'post-likepostnotif-target',
      read: false, createdAt: serverTimestamp(),
    }));

  // ── 23c. Comment-like notifications ────────────────────────────────────
  const asLikeCommentNotifA = testEnv.authenticatedContext('uidLikeCommentNotifA');
  const asLikeCommentNotifNoLike = testEnv.authenticatedContext('uidLikeCommentNotifNoLike');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidLikeCommentNotifA'), validUserDoc({ displayName: 'Like Comment Notif Pilot A' }));
    await setDoc(doc(db, 'users/uidLikeCommentNotifB'), validUserDoc({ displayName: 'Like Comment Notif Pilot B' }));
    await setDoc(doc(db, 'users/uidLikeCommentNotifNoLike'), validUserDoc({ displayName: 'Like Comment Notif No-Like Pilot' }));
    await setDoc(doc(db, 'posts/post-likecommentnotif-host'), validPostDoc('uidLikeCommentNotifB', { authorName: 'Like Comment Notif Pilot B' }));
    // Comment authored by B (the recipient of the like notification) — the
    // comment author, not the post author, is who a comment-like notifies.
    await setDoc(doc(db, 'posts/post-likecommentnotif-host/comments/comment-likecommentnotif-target'), {
      authorId: 'uidLikeCommentNotifB', authorName: 'Like Comment Notif Pilot B', authorPhoto: null,
      text: 'تعليق قابل للإعجاب', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    });
    await setDoc(doc(db, 'posts/post-likecommentnotif-host/comments/comment-likecommentnotif-target/likes/uidLikeCommentNotifA'), {
      createdAt: serverTimestamp(),
    });
  });

  await record('LC1 real comment-like notification (actor really liked the comment, recipient really authored it) is allowed', 'allow', () =>
    setDoc(doc(asLikeCommentNotifA.firestore(), 'users/uidLikeCommentNotifB/notifications/notif-likecomment-real'), {
      type: 'like_comment', actorId: 'uidLikeCommentNotifA', actorName: 'Like Comment Notif Pilot A', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-likecommentnotif-target', postId: 'post-likecommentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LC2 no real like exists for this actor on this comment — denied', 'deny', () =>
    setDoc(doc(asLikeCommentNotifNoLike.firestore(), 'users/uidLikeCommentNotifB/notifications/notif-likecomment-nolike'), {
      type: 'like_comment', actorId: 'uidLikeCommentNotifNoLike', actorName: 'Like Comment Notif No-Like Pilot', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-likecommentnotif-target', postId: 'post-likecommentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LC3 wrong recipient — the real like exists but this comment\'s real author is B, not A — is denied', 'deny', () =>
    setDoc(doc(asLikeCommentNotifA.firestore(), 'users/uidLikeCommentNotifA/notifications/notif-likecomment-wrongrecipient'), {
      type: 'like_comment', actorId: 'uidLikeCommentNotifA', actorName: 'Like Comment Notif Pilot A', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-likecommentnotif-target', postId: 'post-likecommentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('LC4 forged actorPhoto on an otherwise-real comment-like notification is denied', 'deny', () =>
    setDoc(doc(asLikeCommentNotifA.firestore(), 'users/uidLikeCommentNotifB/notifications/notif-likecomment-forged-photo'), {
      type: 'like_comment', actorId: 'uidLikeCommentNotifA', actorName: 'Like Comment Notif Pilot A', actorPhoto: 'https://forged.example/photo.jpg',
      targetType: 'comment', targetId: 'comment-likecommentnotif-target', postId: 'post-likecommentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  // ── 23d. Comment notifications ─────────────────────────────────────────
  const asCommentNotifA = testEnv.authenticatedContext('uidCommentNotifA');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidCommentNotifA'), validUserDoc({ displayName: 'Comment Notif Pilot A' }));
    await setDoc(doc(db, 'users/uidCommentNotifB'), validUserDoc({ displayName: 'Comment Notif Pilot B' }));
    await setDoc(doc(db, 'users/uidCommentNotifC'), validUserDoc({ displayName: 'Comment Notif Pilot C' }));
    await setDoc(doc(db, 'posts/post-commentnotif-host'), validPostDoc('uidCommentNotifB', { authorName: 'Comment Notif Pilot B' }));
    // Comment really authored by A (the actor) on B's post.
    await setDoc(doc(db, 'posts/post-commentnotif-host/comments/comment-commentnotif-real'), {
      authorId: 'uidCommentNotifA', authorName: 'Comment Notif Pilot A', authorPhoto: null,
      text: 'تعليق حقيقي', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    });
    // A second comment on the SAME post, but authored by C — used to prove
    // the create rule checks the comment's REAL authorId, not merely
    // whichever actorId the caller claims.
    await setDoc(doc(db, 'posts/post-commentnotif-host/comments/comment-commentnotif-by-c'), {
      authorId: 'uidCommentNotifC', authorName: 'Comment Notif Pilot C', authorPhoto: null,
      text: 'تعليق من مستخدم آخر', createdAt: serverTimestamp(), status: 'active', likesCount: 0,
    });
  });

  await record('CN1 real comment notification (actor really authored the comment, recipient really is the post author) is allowed', 'allow', () =>
    setDoc(doc(asCommentNotifA.firestore(), 'users/uidCommentNotifB/notifications/notif-comment-real'), {
      type: 'comment', actorId: 'uidCommentNotifA', actorName: 'Comment Notif Pilot A', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-commentnotif-real', postId: 'post-commentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('CN2 wrong author — A claims credit for a comment that was really authored by C — is denied', 'deny', () =>
    setDoc(doc(asCommentNotifA.firestore(), 'users/uidCommentNotifB/notifications/notif-comment-wrongauthor'), {
      type: 'comment', actorId: 'uidCommentNotifA', actorName: 'Comment Notif Pilot A', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-commentnotif-by-c', postId: 'post-commentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  await record('CN3 wrong recipient — the comment is real but this post\'s real author is B, not C — is denied', 'deny', () =>
    setDoc(doc(asCommentNotifA.firestore(), 'users/uidCommentNotifC/notifications/notif-comment-wrongrecipient'), {
      type: 'comment', actorId: 'uidCommentNotifA', actorName: 'Comment Notif Pilot A', actorPhoto: null,
      targetType: 'comment', targetId: 'comment-commentnotif-real', postId: 'post-commentnotif-host',
      read: false, createdAt: serverTimestamp(),
    }));

  // ── 23e. Notification read-state updates ───────────────────────────────
  await record('R1 the recipient CAN mark their own notification as read', 'allow', () =>
    updateDoc(doc(asFollowNotifB.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-real'), { read: true }));

  await record('R2 a DIFFERENT user cannot update someone else\'s notification', 'deny', () =>
    updateDoc(doc(asFollowNotifA.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-real'), { read: false }));

  await record('R3 the owner cannot sneak an actorId change in alongside a read-state update (hasOnly() boundary)', 'deny', () =>
    updateDoc(doc(asFollowNotifB.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-real'), {
      read: true, actorId: 'uidFollowNotifB',
    }));

  await record('R4 the owner setting read to a non-boolean value is denied', 'deny', () =>
    updateDoc(doc(asFollowNotifB.firestore(), 'users/uidFollowNotifB/notifications/notif-follow-real'), { read: 'yes' }));

  await record('R5 the owner CAN still read their own notifications list', 'allow', () =>
    getDocs(collection(asFollowNotifB.firestore(), 'users/uidFollowNotifB/notifications')));

  await record('R6 a different user cannot read someone else\'s notifications list', 'deny', () =>
    getDocs(collection(asFollowNotifA.firestore(), 'users/uidFollowNotifB/notifications')));

  // ── 23f. Device tokens ──────────────────────────────────────────────────
  const asDeviceTokenA = testEnv.authenticatedContext('uidDeviceTokenA');
  const asDeviceTokenB = testEnv.authenticatedContext('uidDeviceTokenB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users/uidDeviceTokenA'), validUserDoc({ displayName: 'Device Token Pilot A' }));
    await setDoc(doc(db, 'users/uidDeviceTokenB'), validUserDoc({ displayName: 'Device Token Pilot B' }));
  });

  await record('DT1 the owner can register their own device token', 'allow', () =>
    setDoc(doc(asDeviceTokenA.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-a1'), {
      token: 'fcm-fake-token-a1', platform: 'web', userAgent: 'Mozilla/5.0 (test)', createdAt: serverTimestamp(),
    }));

  await record('DT2 the owner can read their own device tokens', 'allow', () =>
    getDoc(doc(asDeviceTokenA.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-a1')));

  await record('DT3 a different user cannot read someone else\'s device tokens', 'deny', () =>
    getDoc(doc(asDeviceTokenB.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-a1')));

  await record('DT4 a different user cannot register a token into someone else\'s subcollection', 'deny', () =>
    setDoc(doc(asDeviceTokenB.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-spoofed'), {
      token: 'fcm-fake-spoofed', platform: 'web', userAgent: null, createdAt: serverTimestamp(),
    }));

  await record('DT5 an invalid platform value (not \'web\') is rejected', 'deny', () =>
    setDoc(doc(asDeviceTokenA.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-badplatform'), {
      token: 'fcm-fake-token', platform: 'ios', userAgent: null, createdAt: serverTimestamp(),
    }));

  await record('DT6 a token update (patch) is always denied — replace via delete+recreate only', 'deny', () =>
    updateDoc(doc(asDeviceTokenA.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-a1'), {
      token: 'fcm-changed-token',
    }));

  await record('DT7 the owner can delete their own device token', 'allow', () =>
    deleteDoc(doc(asDeviceTokenA.firestore(), 'users/uidDeviceTokenA/deviceTokens/token-a1')));

  // ── 23g. Announcements ──────────────────────────────────────────────────
  const asAnnouncementMod = testEnv.authenticatedContext('uidMod');
  const asAnnouncementUser = testEnv.authenticatedContext('uidAnnouncementUser');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'users/uidAnnouncementUser'), validUserDoc({ displayName: 'Announcement Pilot' }));
  });

  await record('AN1 a moderator can create an announcement', 'allow', () =>
    setDoc(doc(asAnnouncementMod.firestore(), 'announcements/announcement-real'), {
      title: 'تحديث جديد للتطبيق', body: 'أضفنا ميزات جديدة هذا الأسبوع.', createdAt: serverTimestamp(), ctaLink: null,
    }));

  await record('AN2 a regular (non-moderator) user cannot create an announcement', 'deny', () =>
    setDoc(doc(asAnnouncementUser.firestore(), 'announcements/announcement-forged'), {
      title: 'إعلان مزيف', body: 'محاولة انتحال صفة المشرف.', createdAt: serverTimestamp(), ctaLink: null,
    }));

  await record('AN3 any signed-in user can read announcements', 'allow', () =>
    getDoc(doc(asAnnouncementUser.firestore(), 'announcements/announcement-real')));

  await record('AN4 a guest (signed out) cannot read announcements', 'deny', () =>
    getDoc(doc(asGuest.firestore(), 'announcements/announcement-real')));

  await record('AN5 a user mirroring a REAL announcement into their own inbox is allowed', 'allow', () =>
    setDoc(doc(asAnnouncementUser.firestore(), 'users/uidAnnouncementUser/notifications/notif-announcement-real'), {
      type: 'announcement', actorId: null, actorName: null, actorPhoto: null,
      targetType: 'announcement', targetId: 'announcement-real', postId: null,
      read: false, createdAt: serverTimestamp(),
    }));

  await record('AN6 mirroring a NON-EXISTENT announcement id is denied — the exists() proof fails', 'deny', () =>
    setDoc(doc(asAnnouncementUser.firestore(), 'users/uidAnnouncementUser/notifications/notif-announcement-fake'), {
      type: 'announcement', actorId: null, actorName: null, actorPhoto: null,
      targetType: 'announcement', targetId: 'announcement-does-not-exist', postId: null,
      read: false, createdAt: serverTimestamp(),
    }));

  await record('AN7 mirroring a real announcement into a DIFFERENT user\'s inbox is denied — announcement notifications are self-write only', 'deny', () =>
    setDoc(doc(asAnnouncementMod.firestore(), 'users/uidAnnouncementUser/notifications/notif-announcement-cross'), {
      type: 'announcement', actorId: null, actorName: null, actorPhoto: null,
      targetType: 'announcement', targetId: 'announcement-real', postId: null,
      read: false, createdAt: serverTimestamp(),
    }));

  // useAnnouncementMirror.ts's own idempotency safety net — a deterministic
  // per-(uid, announcementId) doc id (`announcement-{announcementId}`) means
  // a SECOND full-shape write to the same id, after the first one already
  // landed, is evaluated as an UPDATE (the doc now exists), not a create —
  // and the update rule above is scoped to hasOnly(['read']) only, so this
  // must be denied even though every field's VALUE is identical to the
  // still-current allow-case AN5/AN6/AN7 above.
  await record('AN8a mirroring into a deterministic per-announcement id succeeds on first write', 'allow', () =>
    setDoc(doc(asAnnouncementUser.firestore(), 'users/uidAnnouncementUser/notifications/announcement-announcement-real'), {
      type: 'announcement', actorId: null, actorName: null, actorPhoto: null,
      targetType: 'announcement', targetId: 'announcement-real', postId: null,
      read: false, createdAt: serverTimestamp(),
    }));

  await record('AN8b a SECOND full-shape write to that SAME deterministic id is denied — evaluated as update once the doc exists, and update is scoped to hasOnly([\'read\']) only', 'deny', () =>
    setDoc(doc(asAnnouncementUser.firestore(), 'users/uidAnnouncementUser/notifications/announcement-announcement-real'), {
      type: 'announcement', actorId: null, actorName: null, actorPhoto: null,
      targetType: 'announcement', targetId: 'announcement-real', postId: null,
      read: false, createdAt: serverTimestamp(),
    }));

  // ── 23h. Admin dashboard (Phase 2) — reports read/resolve, ban/unban ────
  console.log('\n=== Admin dashboard — reports read/resolve, user ban/unban ===');

  const asAdminMod = testEnv.authenticatedContext('uidMod');
  const asAdminA = testEnv.authenticatedContext('uidA');
  const asAdminB = testEnv.authenticatedContext('uidB');
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'users/uidAdminTarget'), validUserDoc({ displayName: 'Admin Target' }));
  });

  // reports/{reportId} — read (uses report-ok, created earlier as
  // resolved: false by asA in the reports-validation section above).
  await record('AD1 a moderator can read a report', 'allow', () =>
    getDoc(doc(asAdminMod.firestore(), 'reports/report-ok')));

  // AD2 CHANGED IN WEB BATCH 2, DELIBERATELY.
  //
  // It previously asserted that a reporter could not read even their OWN
  // report. That made the "you have already reported this" guard impossible to
  // implement from a browser: the query was refused, the client swallowed the
  // refusal, and the duplicate check silently always passed. The rule now
  // permits exactly one extra thing — reading a report whose `reporterId` is
  // the caller — which returns a person only what they themselves wrote. AD3
  // below is the case that actually protects other people's reports, and it is
  // unchanged.
  await record('AD2 a reporter CAN read the report they filed themselves (web Batch 2)', 'allow', () =>
    getDoc(doc(asAdminA.firestore(), 'reports/report-ok')));

  await record('AD3 a non-moderator (not the reporter) cannot read a report', 'deny', () =>
    getDoc(doc(asAdminB.firestore(), 'reports/report-ok')));

  // The exact query the web duplicate-check issues. A getDoc passing does not
  // imply a query passes — Firestore refuses any query it cannot prove is
  // constrained to readable documents — so the shape is tested as written.
  await record('AD3a a reporter can QUERY their own reports by reporterId+targetId', 'allow', () =>
    getDocs(query(
      collection(asAdminA.firestore(), 'reports'),
      where('reporterId', '==', 'uidA'),
      where('targetId', '==', 'post-existing'),
      limit(1),
    )));

  await record('AD3b a user cannot query reports filed by SOMEONE ELSE', 'deny', () =>
    getDocs(query(
      collection(asAdminB.firestore(), 'reports'),
      where('reporterId', '==', 'uidA'),
      limit(1),
    )));

  await record('AD3c a user cannot query the reports collection unfiltered', 'deny', () =>
    getDocs(query(collection(asAdminA.firestore(), 'reports'), limit(5))));

  await record('AD4 a guest cannot read a report', 'deny', () =>
    getDoc(doc(asGuest.firestore(), 'reports/report-ok')));

  // reports/{reportId} — update (resolved-only).
  await record('AD5 a moderator can mark a report resolved (resolved-only update)', 'allow', () =>
    updateDoc(doc(asAdminMod.firestore(), 'reports/report-ok'), { resolved: true }));

  await record('AD6 a moderator cannot flip a report back to unresolved', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'reports/report-ok'), { resolved: false }));

  await record('AD7 a moderator cannot change any OTHER report field, even alongside resolved', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'reports/report-dangerous-ok'), { resolved: true, reason: 'spam' }));

  await record('AD8 a non-moderator cannot update a report at all, even the reporter marking their own report resolved', 'deny', () =>
    updateDoc(doc(asAdminA.firestore(), 'reports/report-dangerous-ok'), { resolved: true }));

  // users/{uid} — status-only moderator branch (ban/unban).
  await record('AD9 a moderator can ban another user (status-only update)', 'allow', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidAdminTarget'), { status: 'banned' }));

  await record('AD10 a moderator can unban that same user again', 'allow', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidAdminTarget'), { status: 'active' }));

  await record('AD11 a moderator cannot change role in the SAME write as status — proves the hasOnly([\'status\']) boundary holds', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidAdminTarget'), { status: 'banned', role: 'moderator' }));

  await record('AD12 a moderator cannot change role alone via this path either — role stays console-only', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidAdminTarget'), { role: 'moderator' }));

  await record('AD13 a moderator cannot set an invalid status value', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidAdminTarget'), { status: 'pending' }));

  await record('AD14 a moderator cannot ban/unban their OWN account via this path (self-targeting guard)', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'users/uidMod'), { status: 'banned' }));

  await record('AD15 a non-moderator cannot change another user\'s status', 'deny', () =>
    updateDoc(doc(asAdminA.firestore(), 'users/uidAdminTarget'), { status: 'banned' }));

  await record('AD16 a non-moderator cannot change their OWN status either — status is not self-writable at all', 'deny', () =>
    updateDoc(doc(asAdminA.firestore(), 'users/uidA'), { status: 'banned' }));

  // ── Post editing (web Batch 2) ─────────────────────────────────────────
  //
  // The audit before this batch found that NO rule permitted a post owner to
  // change their own text: the update rule's branches covered only 'status',
  // 'commentsCount' and 'likesCount'. The phone app has never offered editing,
  // so nothing had ever needed it. These cases prove the new branch grants
  // exactly the edit and nothing adjacent to it.
  console.log('\n=== 24. Post editing by the owner (web Batch 2) ===');

  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'posts/post-edit-a'), validPostDoc('uidA'));
    await setDoc(doc(db, 'posts/post-edit-b'), validPostDoc('uidB'));
    await setDoc(doc(db, 'posts/post-edit-deleted'), validPostDoc('uidA', { status: 'deleted' }));
    await setDoc(doc(db, 'posts/post-edit-hidden'), validPostDoc('uidA', { status: 'hidden' }));
    await setDoc(doc(db, 'posts/post-edit-image'), validPostDoc('uidA', {
      mediaType: 'image',
      mediaURL: 'https://example.invalid/i.jpg',
      thumbnailURL: 'https://example.invalid/t.jpg',
      mediaSize: 1000, mediaPath: 'community/posts/uidA/post-edit-image',
      mediaWidth: 100, mediaHeight: 100,
    }));
    await setDoc(doc(db, 'posts/post-edit-banned'), validPostDoc('uidBanned'));
  });

  await record('PE1 the owner edits their own post text', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ محرَّر', searchTokens: ['نص', 'محرر'], editedAt: serverTimestamp(),
    }));

  await record('PE2 a different user cannot edit someone else\'s post', 'deny', () =>
    updateDoc(doc(asB.firestore(), 'posts/post-edit-a'), {
      text: 'اختطاف', searchTokens: ['اختطاف'], editedAt: serverTimestamp(),
    }));

  await record('PE3 an anonymous caller cannot edit any post', 'deny', () =>
    updateDoc(doc(testEnv.unauthenticatedContext().firestore(), 'posts/post-edit-a'), {
      text: 'مجهول', searchTokens: ['مجهول'], editedAt: serverTimestamp(),
    }));

  await record('PE4 a banned author cannot edit even their own post', 'deny', () =>
    updateDoc(doc(asBanned.firestore(), 'posts/post-edit-banned'), {
      text: 'محظور', searchTokens: ['محظور'], editedAt: serverTimestamp(),
    }));

  // The whole point of hasOnly(): an edit must not be a vehicle for anything else.
  await record('PE5 an edit cannot change authorId', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(), authorId: 'uidB',
    }));

  await record('PE6 an edit cannot change status (no un-deleting, no self-hiding)', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(), status: 'hidden',
    }));

  await record('PE7 an edit cannot inflate likesCount', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(), likesCount: 999,
    }));

  await record('PE8 an edit cannot promote feedScore', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(), feedScore: 9999,
    }));

  await record('PE9 an edit cannot attach media that was never uploaded', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(),
      mediaType: 'image', mediaURL: 'https://evil.invalid/x.jpg',
    }));

  await record('PE10 an edit cannot change the category', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: serverTimestamp(), category: 'flights',
    }));

  // editedAt must be the server's clock, so an edit cannot be hidden.
  await record('PE11 editedAt must be the server timestamp, not a client-chosen one', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'نصّ', searchTokens: ['نص'], editedAt: Timestamp.fromDate(new Date('2020-01-01')),
    }));

  await record('PE12 an edit that omits editedAt is refused (an edit must be recorded)', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'بلا ختم', searchTokens: ['بلا'],
    }));

  // Content validity survives editing.
  await record('PE13 a text-only post cannot be emptied by an edit', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: '   ', searchTokens: [], editedAt: serverTimestamp(),
    }));

  await record('PE14 an IMAGE post may have its text emptied (the image is the content)', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-image'), {
      text: '', searchTokens: [], editedAt: serverTimestamp(),
    }));

  await record('PE15 text over the 2000-character ceiling is refused', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-a'), {
      text: 'ط'.repeat(2001), searchTokens: ['ط'], editedAt: serverTimestamp(),
    }));

  // A removed or hidden post must not be rewritten into something else.
  await record('PE16 a soft-deleted post cannot be edited', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-deleted'), {
      text: 'عودة', searchTokens: ['عودة'], editedAt: serverTimestamp(),
    }));

  await record('PE17 a moderator-hidden post cannot be edited by its author', 'deny', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-edit-hidden'), {
      text: 'تحايل', searchTokens: ['تحايل'], editedAt: serverTimestamp(),
    }));

  // Backward compatibility: a post created before `editedAt` existed must stay
  // readable and editable. This is the "read an old document without the new
  // field" case the requirement asked for explicitly.
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const legacy = validPostDoc('uidA');
    delete (legacy as Record<string, unknown>).likesCount;
    delete (legacy as Record<string, unknown>).feedScore;
    await setDoc(doc(ctx.firestore(), 'posts/post-legacy-noedit'), legacy);
  });

  await record('PE18 a legacy post with no editedAt/likesCount/feedScore is still readable', 'allow', () =>
    getDoc(doc(testEnv.unauthenticatedContext().firestore(), 'posts/post-legacy-noedit')));

  await record('PE19 …and its owner can still edit it, gaining editedAt for the first time', 'allow', () =>
    updateDoc(doc(asA.firestore(), 'posts/post-legacy-noedit'), {
      text: 'تحديث لمنشور قديم', searchTokens: ['تحديث'], editedAt: serverTimestamp(),
    }));

  // The moderator path must be unchanged by any of this.
  await record('PE20 a moderator still cannot edit post TEXT (only hide)', 'deny', () =>
    updateDoc(doc(asAdminMod.firestore(), 'posts/post-edit-b'), {
      text: 'تعديل إشرافي', searchTokens: ['تعديل'], editedAt: serverTimestamp(),
    }));

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

  await testEnv.cleanup();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
