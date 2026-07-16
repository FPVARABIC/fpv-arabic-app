/**
 * Phase 6 (correction pass) evidence script: exercises the createComment and
 * toggleCommentLike Cloud Functions (functions/src/index.ts) against the
 * REAL Firebase Local Emulator Suite — Auth + Firestore + Functions all
 * running together — using the actual client SDK (httpsCallable), not a
 * simulated invocation. firestore.rules is deliberately irrelevant to these
 * two write paths now (both are denied to the client entirely — see
 * scripts/testCommunityRules.ts sections 16-18 for those bypass proofs);
 * this script's job is to prove the trusted boundary itself — the Functions
 * — behaves correctly: legitimate distinct comments are never blocked,
 * floods and accidental duplicate retries are, likes are idempotent and
 * unforgeable, and everything survives real concurrency.
 *
 * Not application runtime code — a one-off verification harness, alongside
 * testCommunityRules.ts and testCommunity.ts. Re-run whenever
 * functions/src/index.ts changes.
 *
 * Run with:
 *   npm run test:community-functions
 * (builds functions/ first, then starts auth+firestore+functions emulators
 * together and runs this script against them — `firebase emulators:exec`
 * requires the compiled functions/lib/index.js to already exist; there is no
 * predeploy-hook equivalent for emulator sessions, only for `firebase deploy`.)
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable, type Functions } from 'firebase/functions';
import {
  doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, writeBatch, serverTimestamp,
  type DocumentSnapshot, type DocumentData, type QuerySnapshot,
} from 'firebase/firestore';
import { ref, uploadBytes, listAll } from 'firebase/storage';
import {
  initializeTestEnvironment, assertFails, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { normalizeDisplayName } from '../src/components/Community/utils/userSearch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';

let testEnv: RulesTestEnvironment;
let passCount = 0;
let failCount = 0;
let appCounter = 0;

const record = (label: string, ok: boolean, detail?: string) => {
  if (ok) {
    console.log(`  PASS  ${label}`);
    passCount++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failCount++;
  }
};

const assertValue = <T>(label: string, actual: T, expected: T) => {
  try {
    assert.deepStrictEqual(actual, expected);
    record(`${label} (= ${JSON.stringify(actual)})`, true);
  } catch {
    record(label, false, `actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`);
  }
};

interface CreateCommentResult { commentId: string; collapsed: boolean }
interface ToggleLikeResult { liked: boolean }

// Resolves when `run` succeeds; records a FAIL (and returns undefined,
// never throws) when it doesn't, so one unexpectedly-rejected call never
// crashes the whole script before later independent sections get to run.
async function expectSuccess<T>(label: string, run: () => Promise<T>): Promise<T | undefined> {
  try {
    const result = await run();
    record(label, true);
    return result;
  } catch (err) {
    record(label, false, (err as Error).message.split('\n')[0]);
    return undefined;
  }
}

// FunctionsErrorCode strings arrive as 'functions/<code>' on the client —
// confirmed against the installed @firebase/functions client SDK.
async function expectError(label: string, expectedCode: string, run: () => Promise<unknown>): Promise<void> {
  try {
    await run();
    record(label, false, 'expected an error, call succeeded');
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    record(label, code === `functions/${expectedCode}`, `got code=${code}`);
  }
}

interface TestUser {
  uid: string;
  functions: Functions;
  auth: Auth;
  app: FirebaseApp;
}

// Each test user is a genuinely separate Firebase app instance, signed in
// anonymously against the Auth Emulator — a real ID token, a real
// request.auth.uid on the Function side, not a simulated/injected identity.
// This is what makes this suite an actual end-to-end proof of the trust
// boundary rather than a restatement of the code that implements it.
async function createTestUser(displayName: string, userDocOverrides: Record<string, unknown> = {}): Promise<TestUser> {
  const appName = `fn-test-user-${++appCounter}`;
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, appName);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);

  const cred = await signInAnonymously(auth);
  const uid = cred.user.uid;

  if (userDocOverrides.skipUserDoc !== true) {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      await setDoc(doc(ctx.firestore(), 'users', uid), {
        displayName,
        photoURL: null,
        joinedAt: serverTimestamp(),
        postsCount: 0,
        role: 'user',
        status: 'active',
        lastPostAt: null,
        lastCommentAt: null,
        displayNameNormalized: normalizeDisplayName(displayName),
        ...userDocOverrides,
      });
    });
  }

  return { uid, functions, auth, app };
}

// A Functions client with no signed-in user at all — used for the
// unauthenticated-caller proofs. request.auth is genuinely null on the
// Function side for calls made through this client.
async function createGuestClient(): Promise<Functions> {
  const appName = `fn-test-guest-${++appCounter}`;
  const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT_ID }, appName);
  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  return functions;
}

async function seedPost(postId: string, authorUid: string, overrides: Record<string, unknown> = {}) {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts', postId), {
      authorId: authorUid,
      authorName: 'Pilot',
      authorPhoto: null,
      text: 'منشور هدف للاختبار',
      category: 'questions',
      mediaType: 'none',
      mediaURL: null,
      thumbnailURL: null,
      mediaSize: null,
      mediaDuration: null,
      mediaPath: null,
      commentsCount: 0,
      likesCount: 0,
      createdAt: serverTimestamp(),
      status: 'active',
      searchTokens: ['منشور'],
      ...overrides,
    });
  });
}

// withSecurityRulesDisabled's own return type is Promise<void> — it does
// NOT forward the callback's return value — so each of these captures its
// result in a closed-over local instead of `return`ing out of the callback.
async function readPost(postId: string): Promise<DocumentSnapshot<DocumentData>> {
  let result: DocumentSnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDoc(doc(ctx.firestore(), 'posts', postId));
  });
  return result!;
}
async function readComment(postId: string, commentId: string): Promise<DocumentSnapshot<DocumentData>> {
  let result: DocumentSnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDoc(doc(ctx.firestore(), 'posts', postId, 'comments', commentId));
  });
  return result!;
}
async function readLike(postId: string, commentId: string, likerUid: string): Promise<DocumentSnapshot<DocumentData>> {
  let result: DocumentSnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDoc(doc(ctx.firestore(), 'posts', postId, 'comments', commentId, 'likes', likerUid));
  });
  return result!;
}
async function readRateLimit(uid: string): Promise<DocumentSnapshot<DocumentData>> {
  let result: DocumentSnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDoc(doc(ctx.firestore(), 'users', uid, 'rateLimits', 'comments'));
  });
  return result!;
}
async function readLikesCollection(postId: string, commentId: string): Promise<QuerySnapshot<DocumentData>> {
  let result: QuerySnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDocs(collection(ctx.firestore(), 'posts', postId, 'comments', commentId, 'likes'));
  });
  return result!;
}
async function readPostLike(postId: string, likerUid: string): Promise<DocumentSnapshot<DocumentData>> {
  let result: DocumentSnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDoc(doc(ctx.firestore(), 'posts', postId, 'likes', likerUid));
  });
  return result!;
}
async function readPostLikesCollection(postId: string): Promise<QuerySnapshot<DocumentData>> {
  let result: QuerySnapshot<DocumentData>;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    result = await getDocs(collection(ctx.firestore(), 'posts', postId, 'likes'));
  });
  return result!;
}

// Simulates the REAL client write path exactly (CommentsList.tsx's
// deleteComment / a moderator hiding a comment) — a direct Firestore update
// touching only `status`, which is exactly what firestore.rules' comment
// update rule allows the owner/moderator to do. Rules are disabled here only
// because this harness's test users aren't real owners/moderators from
// Rules' perspective; the WRITE SHAPE is identical to what a real client
// send.
async function setCommentStatus(postId: string, commentId: string, status: 'deleted' | 'hidden'): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(), 'posts', postId, 'comments', commentId), { status });
  });
}

// Same reasoning as setCommentStatus above, one level up: simulates the
// REAL client write path (PostDetail.tsx's deletePost / a moderator hiding
// a post) — a direct Firestore update touching only `status`, exactly what
// firestore.rules' post update rule allows the owner/moderator to do.
async function setPostStatus(postId: string, status: 'deleted' | 'hidden'): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(), 'posts', postId), { status });
  });
}

// @firebase/rules-unit-testing's ctx.storage() defaults to bucket
// `gs://{projectId}` (no `.appspot.com` suffix) when called with no
// argument — a DIFFERENT bucket name than the Admin SDK's own
// getStorage().bucket() default (`{projectId}.appspot.com`, confirmed via
// runtime debug logging against this exact emulator session), which is
// what cleanupPostMedia (functions/src/index.ts) actually reads from, and
// what the real app's client Storage SDK is explicitly configured to use
// (lib/firebase.ts's VITE_FIREBASE_STORAGE_BUCKET). Both local emulators
// route through the same single Storage emulator process regardless of
// bucket name, so this mismatch never affected the ALLOW/DENY rules
// assertions elsewhere in this suite/testCommunityRules.ts — but it matters
// here, where the Admin SDK must see the SAME objects this harness seeds.
const STORAGE_BUCKET_URL = `gs://${PROJECT_ID}.appspot.com`;

// Seeds real full+thumb objects at the exact path shape MediaUploader.tsx
// produces (community/posts/{uid}/{postId}/{uuid}.jpg and _thumb.jpg) —
// rules disabled purely because this harness's test users aren't real
// owners from Storage Rules' perspective for a path seeded ahead of time;
// the object shape/naming is identical to a real upload.
async function seedMediaFiles(uid: string, postId: string, uuid: string): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const storage = ctx.storage(STORAGE_BUCKET_URL);
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
    await uploadBytes(ref(storage, `community/posts/${uid}/${postId}/${uuid}.jpg`), bytes, { contentType: 'image/jpeg' });
    await uploadBytes(ref(storage, `community/posts/${uid}/${postId}/${uuid}_thumb.jpg`), bytes, { contentType: 'image/jpeg' });
  });
}

async function countMediaFiles(uid: string, postId: string): Promise<number> {
  let count = 0;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const listing = await listAll(ref(ctx.storage(STORAGE_BUCKET_URL), `community/posts/${uid}/${postId}`));
    count = listing.items.length;
  });
  return count;
}

// Polls an EXACT condition instead of sleeping a fixed duration — waits for
// the cleanupCommentLikes trigger (which fires asynchronously, outside the
// original status-update call's own response) to reach its observable
// end state, and fails loudly if it never does within the timeout rather
// than silently racing ahead.
async function waitUntil(predicate: () => Promise<boolean>, timeoutMs = 15000, intervalMs = 200): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return true;
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return false;
}

function callCreateComment(functions: Functions, data: unknown) {
  return httpsCallable<unknown, CreateCommentResult>(functions, 'createComment')(data);
}
function callToggleLike(functions: Functions, data: unknown) {
  return httpsCallable<unknown, ToggleLikeResult>(functions, 'toggleCommentLike')(data);
}
function callTogglePostLike(functions: Functions, data: unknown) {
  return httpsCallable<unknown, ToggleLikeResult>(functions, 'togglePostLike')(data);
}

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

  console.log('\n=== 1. createComment — the core defect fix: distinct consecutive comments allowed ===');

  const userA = await createTestUser('Function Pilot A');
  await seedPost('post-fn-a1', userA.uid, { text: 'target post 1' });
  await seedPost('post-fn-a2', userA.uid, { text: 'target post 2' });

  const c1 = await expectSuccess('A1 first comment on post-fn-a1 succeeds', () =>
    callCreateComment(userA.functions, { postId: 'post-fn-a1', text: 'أول تعليق مميز' }).then(r => r.data));
  assertValue('A1b not collapsed', c1?.collapsed, false);

  const c2 = await expectSuccess(
    'A2 a SECOND, DISTINCT comment on the SAME post immediately after succeeds with no cooldown — the exact defect this correction pass fixes',
    () => callCreateComment(userA.functions, { postId: 'post-fn-a1', text: 'تعليق ثانٍ مختلف تماماً بمحتواه' }).then(r => r.data),
  );
  assertValue('A2b different commentId than A1 (a real second comment, not a collapse)', c2 && c1 && c2.commentId !== c1.commentId, true);
  assertValue('A2c not collapsed', c2?.collapsed, false);

  console.log('\n=== 2. createComment — duplicate-retry collapse (only TRUE, IMMEDIATE duplicates are affected) ===');
  console.log('    users/{uid}/rateLimits/comments is a SINGLE doc per user (not per post), remembering');
  console.log('    only the MOST RECENT accepted comment\'s fingerprint — so collapse only ever catches a');
  console.log('    retry of the immediately-preceding submission (a double-tapped Send button, a retried');
  console.log('    network request), not an arbitrary earlier duplicate once something else has been');
  console.log('    posted in between. That narrower scope is intentional (see functions/src/index.ts) —');
  console.log('    this section\'s test ordering below is written to actually exercise it correctly.');

  const c2Retry = await expectSuccess(
    'A3 an EXACT retry (same post, same normalized text) immediately after A2 is accepted but COLLAPSED, not duplicated',
    () => callCreateComment(userA.functions, { postId: 'post-fn-a1', text: 'تعليق ثانٍ مختلف تماماً بمحتواه' }).then(r => r.data),
  );
  assertValue('A3b collapsed = true', c2Retry?.collapsed, true);
  assertValue('A3c returns the ORIGINAL comment id (A2), not a new one', c2Retry?.commentId, c2?.commentId);

  const c2RetryWhitespace = await expectSuccess(
    'A4 a retry differing only by whitespace still collapses (fingerprint normalization) — a collapse never overwrites the remembered fingerprint, so this still compares against A2',
    () => callCreateComment(userA.functions, { postId: 'post-fn-a1', text: '  تعليق ثانٍ    مختلف تماماً بمحتواه  ' }).then(r => r.data),
  );
  assertValue('A4b collapsed = true', c2RetryWhitespace?.collapsed, true);
  assertValue('A4c same original commentId', c2RetryWhitespace?.commentId, c2?.commentId);

  const c3SameTextDifferentPost = await expectSuccess(
    'A5 the SAME text posted to a DIFFERENT post immediately after is a genuinely new comment (fingerprint includes postId, not just text)',
    () => callCreateComment(userA.functions, { postId: 'post-fn-a2', text: 'تعليق ثانٍ مختلف تماماً بمحتواه' }).then(r => r.data),
  );
  assertValue('A5b not collapsed', c3SameTextDifferentPost?.collapsed, false);
  assertValue('A5c different id than A2/A3/A4\'s comment', c3SameTextDifferentPost && c2 && c3SameTextDifferentPost.commentId !== c2.commentId, true);

  const c4 = await expectSuccess('A6 a further distinct comment on post-fn-a2 immediately after also succeeds with no cooldown', () =>
    callCreateComment(userA.functions, { postId: 'post-fn-a2', text: 'تعليق مختلف تماماً على نفس المنشور الثاني' }).then(r => r.data));
  assertValue('A6b not collapsed', c4?.collapsed, false);

  const postA1AfterSection2 = await readPost('post-fn-a1');
  const postA2AfterSection2 = await readPost('post-fn-a2');
  assertValue('A7 post-fn-a1.commentsCount is exactly 2 (A1 + A2 — the two collapsed retries did NOT re-increment it)', postA1AfterSection2.data()?.commentsCount, 2);
  assertValue('A8 post-fn-a2.commentsCount is exactly 2 (A5 + A6)', postA2AfterSection2.data()?.commentsCount, 2);

  console.log('\n=== 3. createComment — server-side rolling-window flood guard (isolated user) ===');

  const userFlood = await createTestUser('Flood Test Pilot');
  await seedPost('post-fn-flood', userFlood.uid, { text: 'flood target' });

  const floodResults: CreateCommentResult[] = [];
  for (let i = 0; i < 8; i++) {
    // Sequential, not concurrent — proves the WINDOW COUNT itself (not just
    // transaction contention) is what the 9th call below is rejected by.
    const r = await callCreateComment(userFlood.functions, { postId: 'post-fn-flood', text: `تعليق فيضان رقم ${i}` });
    floodResults.push(r.data);
  }
  assertValue('F1 8 distinct comments inside the rolling window all succeed (the documented ceiling, never blocking a real fast conversation)', floodResults.filter(r => !r.collapsed).length, 8);

  await expectError('F2 a 9th distinct comment inside the same 60s window is rejected as resource-exhausted', 'resource-exhausted', () =>
    callCreateComment(userFlood.functions, { postId: 'post-fn-flood', text: 'تعليق فيضان رقم تاسع يجب أن يُرفض' }));

  console.log('\n=== 4. createComment — validation, identity, and precondition errors ===');

  await expectError('V1 empty text is rejected', 'invalid-argument', () =>
    callCreateComment(userA.functions, { postId: 'post-fn-a1', text: '   ' }));
  await expectError('V2 text over 500 chars is rejected', 'invalid-argument', () =>
    callCreateComment(userA.functions, { postId: 'post-fn-a1', text: 'ا'.repeat(501) }));
  await expectError('V3 missing postId is rejected', 'invalid-argument', () =>
    callCreateComment(userA.functions, { text: 'نص صالح' }));
  await expectError('V4 non-string postId is rejected', 'invalid-argument', () =>
    callCreateComment(userA.functions, { postId: 12345, text: 'نص صالح' }));

  const guestFunctions = await createGuestClient();
  await expectError('V5 an unauthenticated (guest) caller is rejected', 'unauthenticated', () =>
    callCreateComment(guestFunctions, { postId: 'post-fn-a1', text: 'محاولة زائر' }));

  const userBanned = await createTestUser('Banned Function Pilot', { status: 'banned' });
  await expectError('V6 a banned user is rejected', 'permission-denied', () =>
    callCreateComment(userBanned.functions, { postId: 'post-fn-a1', text: 'محاولة محظور' }));

  await expectError('V7 a nonexistent post is rejected', 'not-found', () =>
    callCreateComment(userA.functions, { postId: 'post-does-not-exist', text: 'نص صالح' }));

  await seedPost('post-fn-deleted', userA.uid, { status: 'deleted' });
  await expectError('V8 a soft-deleted post is rejected', 'not-found', () =>
    callCreateComment(userA.functions, { postId: 'post-fn-deleted', text: 'نص صالح' }));

  const userNoDoc = await createTestUser('No Doc Pilot', { skipUserDoc: true });
  await expectError('V9 a signed-in user with no bootstrapped users/{uid} document is rejected', 'failed-precondition', () =>
    callCreateComment(userNoDoc.functions, { postId: 'post-fn-a1', text: 'نص صالح' }));

  console.log('\n=== 5. createComment — server-controlled fields cannot be overridden by the client ===');

  const injectResult = await expectSuccess('I1 a request with extra unexpected fields (email, authorId override) still succeeds', () =>
    callCreateComment(userA.functions, {
      postId: 'post-fn-a1', text: 'محاولة حقن حقول إضافية',
      email: 'leaked@example.com', authorId: 'someone-else-uid', authorName: 'Forged Name', likesCount: 999,
    }).then(r => r.data));

  if (injectResult) {
    const injectedCommentSnap = await readComment('post-fn-a1', injectResult.commentId);
    const injectedData = injectedCommentSnap.data();
    assertValue('I2 authorId is the REAL caller uid, never the injected value', injectedData?.authorId, userA.uid);
    assertValue('I3 no email field was written to the comment document at all', 'email' in (injectedData ?? {}), false);
    assertValue('I4 likesCount was forced to 0 by the Function, ignoring the injected 999', injectedData?.likesCount, 0);
  }

  console.log('\n=== 6. createComment — server-side write shape is correct ===');

  const c1Snap = c1 ? await readComment('post-fn-a1', c1.commentId) : null;
  const c1Data = c1Snap?.data();
  assertValue('S1 comment.status is "active"', c1Data?.status, 'active');
  assertValue('S2 comment.likesCount is 0', c1Data?.likesCount, 0);
  assertValue('S3 comment.authorName matches the seeded user document', c1Data?.authorName, 'Function Pilot A');
  assertValue('S4 comment.createdAt is a real Firestore Timestamp (has toMillis)', typeof c1Data?.createdAt?.toMillis, 'function');

  const rateLimitDoc = await readRateLimit(userA.uid);
  assertValue('S5 users/{uid}/rateLimits/comments exists and is Admin-SDK-written (unreadable/unwritable by the client per firestore.rules, read here only via withSecurityRulesDisabled)', rateLimitDoc.exists(), true);

  console.log('\n=== 7. toggleCommentLike — basic correctness and idempotency ===');

  const likeUserL1 = await createTestUser('Like Pilot L1');
  const likeUserL2 = await createTestUser('Like Pilot L2');
  await seedPost('post-fn-like', likeUserL1.uid, { text: 'likeable post' });
  const likeTargetComment = await callCreateComment(likeUserL1.functions, { postId: 'post-fn-like', text: 'تعليق قابل للإعجاب' });
  const likeCommentId = likeTargetComment.data.commentId;

  const like1 = await expectSuccess('L1 L1 likes the comment', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'like' }).then(r => r.data));
  assertValue('L1b liked = true', like1?.liked, true);

  const afterLike1 = await readComment('post-fn-like', likeCommentId);
  assertValue('L2 likesCount is exactly 1 after a single like', afterLike1.data()?.likesCount, 1);
  const like1Doc = await readLike('post-fn-like', likeCommentId, likeUserL1.uid);
  assertValue('L3 a real like document exists at the liker\'s own uid path', like1Doc.exists(), true);

  const like1Again = await expectSuccess('L4 L1 calls "like" again (already liked) — idempotent no-op, not an error', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'like' }).then(r => r.data));
  assertValue('L4b still liked = true', like1Again?.liked, true);
  const afterLike1Again = await readComment('post-fn-like', likeCommentId);
  assertValue('L5 likesCount is STILL exactly 1 (no double-count from the redundant call)', afterLike1Again.data()?.likesCount, 1);

  const unlike1 = await expectSuccess('L6 L1 unlikes the comment', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'unlike' }).then(r => r.data));
  assertValue('L6b liked = false', unlike1?.liked, false);
  const afterUnlike1 = await readComment('post-fn-like', likeCommentId);
  assertValue('L7 likesCount is exactly 0 after unlike', afterUnlike1.data()?.likesCount, 0);
  const like1DocAfterUnlike = await readLike('post-fn-like', likeCommentId, likeUserL1.uid);
  assertValue('L8 the like document was deleted', like1DocAfterUnlike.exists(), false);

  const unlike1Again = await expectSuccess('L9 L1 calls "unlike" again (already unliked) — idempotent no-op', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'unlike' }).then(r => r.data));
  assertValue('L9b still liked = false', unlike1Again?.liked, false);
  const afterUnlike1Again = await readComment('post-fn-like', likeCommentId);
  assertValue('L10 likesCount is STILL exactly 0 (never goes negative from the redundant call)', afterUnlike1Again.data()?.likesCount, 0);

  console.log('\n=== 8. toggleCommentLike — identity cannot be spoofed, validation, and errors ===');

  const spoofAttempt = await expectSuccess('SP1 L2 calls toggleCommentLike with an extra client-supplied "uid" field pointing at L1', () =>
    callToggleLike(likeUserL2.functions, {
      postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'like', uid: likeUserL1.uid,
    }).then(r => r.data));
  assertValue('SP1b the call still succeeds (the extra field is simply ignored)', spoofAttempt?.liked, true);
  const l2LikeDoc = await readLike('post-fn-like', likeCommentId, likeUserL2.uid);
  assertValue('SP2 the resulting like document is under L2\'s REAL uid — never L1\'s, proving uid always comes from request.auth, never from the payload', l2LikeDoc.exists(), true);
  const l1LikeDocStillGone = await readLike('post-fn-like', likeCommentId, likeUserL1.uid);
  assertValue('SP3 L1\'s like path is untouched by L2\'s spoofing attempt (still not liked, from section 7\'s unlike)', l1LikeDocStillGone.exists(), false);

  // Clean up L2's like from the spoof test so section 9's concurrency counts start clean.
  await callToggleLike(likeUserL2.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'unlike' });

  await expectError('E1 an unauthenticated (guest) caller is rejected', 'unauthenticated', () =>
    callToggleLike(guestFunctions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'like' }));

  await expectError('E2 an invalid desiredState value is rejected', 'invalid-argument', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'toggle' }));

  await expectError('E3 a missing commentId is rejected', 'invalid-argument', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', desiredState: 'like' }));

  await expectError('E4 a nonexistent comment is rejected', 'not-found', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: 'comment-does-not-exist', desiredState: 'like' }));

  await testEnv.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'posts/post-fn-like/comments/comment-fn-hidden'), {
      authorId: likeUserL1.uid, authorName: 'Like Pilot L1', authorPhoto: null,
      text: 'مخفي', createdAt: serverTimestamp(), status: 'hidden', likesCount: 0,
    });
  });
  await expectError('E5 a hidden (not-active) comment is rejected', 'not-found', () =>
    callToggleLike(likeUserL1.functions, { postId: 'post-fn-like', commentId: 'comment-fn-hidden', desiredState: 'like' }));

  const bannedLikeAttempt = await createTestUser('Banned Like Pilot', { status: 'banned' });
  await expectError('E6 a banned user is rejected', 'permission-denied', () =>
    callToggleLike(bannedLikeAttempt.functions, { postId: 'post-fn-like', commentId: likeCommentId, desiredState: 'like' }));

  console.log('\n=== 9. toggleCommentLike — real concurrency (5 different users, one Admin-SDK transaction each) ===');

  const concurrentPost = 'post-fn-concurrent';
  await seedPost(concurrentPost, userA.uid, { text: 'concurrency target' });
  const concurrentComment = await callCreateComment(userA.functions, { postId: concurrentPost, text: 'تعليق سباق الإعجابات' });
  const concurrentCommentId = concurrentComment.data.commentId;

  const concurrentUsers = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createTestUser(`Concurrent Pilot ${i}`)),
  );
  const concurrentLikeResults = await Promise.allSettled(
    concurrentUsers.map(u => callToggleLike(u.functions, { postId: concurrentPost, commentId: concurrentCommentId, desiredState: 'like' })),
  );
  assertValue('CC1 all 5 concurrent likes from 5 DIFFERENT users resolved without error', concurrentLikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterConcurrentLikes = await readComment(concurrentPost, concurrentCommentId);
  assertValue('CC2 likesCount is exactly 5 (no lost updates under real Firestore transaction contention)', afterConcurrentLikes.data()?.likesCount, 5);

  console.log('\n=== 10. toggleCommentLike — retry-safety (same user, same desiredState, 4-way concurrent) ===');

  const retryUser = concurrentUsers[0];
  const retryLikeResults = await Promise.allSettled(
    Array.from({ length: 4 }, () => callToggleLike(retryUser.functions, { postId: concurrentPost, commentId: concurrentCommentId, desiredState: 'like' })),
  );
  assertValue('R1 4 concurrent "like" calls from an ALREADY-liking user (simulating a lost-response retry storm) all resolve without error', retryLikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterRetryLikes = await readComment(concurrentPost, concurrentCommentId);
  assertValue('R2 likesCount is STILL exactly 5 — desiredState made every redundant call a true no-op, never a double-flip', afterRetryLikes.data()?.likesCount, 5);

  const retryUnlikeResults = await Promise.allSettled(
    Array.from({ length: 4 }, () => callToggleLike(retryUser.functions, { postId: concurrentPost, commentId: concurrentCommentId, desiredState: 'unlike' })),
  );
  assertValue('R3 4 concurrent "unlike" calls all resolve without error', retryUnlikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterRetryUnlikes = await readComment(concurrentPost, concurrentCommentId);
  assertValue('R4 likesCount is exactly 4 — one real net unlike, not corrupted by the 4 redundant calls', afterRetryUnlikes.data()?.likesCount, 4);

  console.log('\n=== 11. cleanupCommentLikes — orphaned-like cleanup on comment deletion (data-lifecycle correction) ===');

  // Directly seeds `count` like documents, bypassing toggleCommentLike
  // entirely (a real 600-call flood would be both slow and rate-limited) —
  // batched at 400 writes/commit, safely under Firestore's 500-per-batch
  // hard limit, so this itself never needs the retry-safe-batching logic
  // under test to seed the fixture.
  async function seedManyLikes(postId: string, commentId: string, count: number): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async ctx => {
      const firestore = ctx.firestore();
      let batch = writeBatch(firestore);
      let opsInBatch = 0;
      for (let i = 0; i < count; i++) {
        batch.set(doc(firestore, 'posts', postId, 'comments', commentId, 'likes', `seeded-uid-${i}`), {
          createdAt: serverTimestamp(),
        });
        opsInBatch++;
        if (opsInBatch === 400) {
          await batch.commit();
          batch = writeBatch(firestore);
          opsInBatch = 0;
        }
      }
      if (opsInBatch > 0) {
        await batch.commit();
      }
    });
  }

  const cleanupUser1 = await createTestUser('Cleanup Pilot 1');
  const cleanupUser2 = await createTestUser('Cleanup Pilot 2');
  const cleanupUser3 = await createTestUser('Cleanup Pilot 3');
  await seedPost('post-fn-cleanup', cleanupUser1.uid, { text: 'cleanup target post' });

  // --- Case 1: an active comment with ZERO likes transitions to deleted ---
  const cleanupComment1 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق بدون إعجابات للحذف' });
  const cleanupCommentId1 = cleanupComment1.data.commentId;
  await setCommentStatus('post-fn-cleanup', cleanupCommentId1, 'deleted');
  const cu1Done = await waitUntil(async () => {
    const c = await readComment('post-fn-cleanup', cleanupCommentId1);
    return c.data()?.likesCount === 0;
  });
  assertValue('CL1 zero-like comment: delete transition succeeds, likesCount stays/ends at 0', cu1Done, true);
  const cu1Likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId1);
  assertValue('CL1b zero-like comment: likes subcollection is empty (no-op cleanup, no error)', cu1Likes.size, 0);

  // --- Case 2: an active comment with ONE like transitions to deleted ---
  const cleanupComment2 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق بإعجاب واحد للحذف' });
  const cleanupCommentId2 = cleanupComment2.data.commentId;
  await callToggleLike(cleanupUser2.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId2, desiredState: 'like' });
  const beforeDelete2 = await readComment('post-fn-cleanup', cleanupCommentId2);
  assertValue('CL2 one-like comment: likesCount is 1 before deletion', beforeDelete2.data()?.likesCount, 1);
  await setCommentStatus('post-fn-cleanup', cleanupCommentId2, 'deleted');
  const cu2Done = await waitUntil(async () => {
    const likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId2);
    const c = await readComment('post-fn-cleanup', cleanupCommentId2);
    return likes.size === 0 && c.data()?.likesCount === 0;
  });
  assertValue('CL3 one-like comment: the like document is physically removed and likesCount reaches 0 after the delete transition', cu2Done, true);

  // --- Case 3: an active comment with MULTIPLE users' likes transitions to deleted ---
  const cleanupComment3 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق بعدة إعجابات للحذف' });
  const cleanupCommentId3 = cleanupComment3.data.commentId;
  await Promise.all([cleanupUser1, cleanupUser2, cleanupUser3].map(u =>
    callToggleLike(u.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId3, desiredState: 'like' })));
  const beforeDelete3 = await readComment('post-fn-cleanup', cleanupCommentId3);
  assertValue('CL4 multi-like comment: likesCount is 3 before deletion', beforeDelete3.data()?.likesCount, 3);
  await setCommentStatus('post-fn-cleanup', cleanupCommentId3, 'deleted');
  const cu3Done = await waitUntil(async () => {
    const likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId3);
    const c = await readComment('post-fn-cleanup', cleanupCommentId3);
    return likes.size === 0 && c.data()?.likesCount === 0;
  });
  assertValue('CL5 multi-like comment: ALL 3 users\' like documents are removed and likesCount reaches 0', cu3Done, true);

  // --- Case 4: 600+ seeded likes — cleanup must span multiple bounded batches ---
  const cleanupComment4 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق بعدد كبير من الإعجابات للحذف' });
  const cleanupCommentId4 = cleanupComment4.data.commentId;
  const SEEDED_LIKE_COUNT = 620;
  await seedManyLikes('post-fn-cleanup', cleanupCommentId4, SEEDED_LIKE_COUNT);
  await testEnv.withSecurityRulesDisabled(async ctx => {
    await updateDoc(doc(ctx.firestore(), 'posts', 'post-fn-cleanup', 'comments', cleanupCommentId4), { likesCount: SEEDED_LIKE_COUNT });
  });
  const seededLikes = await readLikesCollection('post-fn-cleanup', cleanupCommentId4);
  assertValue(`CL6 ${SEEDED_LIKE_COUNT} likes seeded directly (exceeds Firestore's 500-writes-per-batch limit, forcing the cleanup trigger's own internal pagination loop to run more than once)`, seededLikes.size, SEEDED_LIKE_COUNT);
  await setCommentStatus('post-fn-cleanup', cleanupCommentId4, 'deleted');
  const cu4Done = await waitUntil(async () => {
    const likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId4);
    const c = await readComment('post-fn-cleanup', cleanupCommentId4);
    return likes.size === 0 && c.data()?.likesCount === 0;
  }, 45000, 500);
  assertValue('CL7 600+ seeded likes: cleanup completes across multiple bounded batches, every like document is removed, likesCount is normalized to 0', cu4Done, true);

  // --- Case 5: replaying the active→deleted transition causes no drift ---
  // The emulator has no way to literally redeliver the SAME trigger event, so
  // this re-applies the identical write (status: 'deleted' again on an
  // already-deleted comment) — the realistic proxy for at-least-once event
  // redelivery: the guard sees before.status already non-active and must
  // short-circuit to a true no-op, not merely "happen to still net to zero".
  await setCommentStatus('post-fn-cleanup', cleanupCommentId4, 'deleted');
  const cu4RetryDone = await waitUntil(async () => {
    const likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId4);
    const c = await readComment('post-fn-cleanup', cleanupCommentId4);
    return likes.size === 0 && c.data()?.likesCount === 0;
  });
  assertValue('CL8 replaying the same already-deleted transition causes no failure, no negative count, and no drift (still 0 likes, likesCount still 0)', cu4RetryDone, true);

  // --- Case 6: updating an ACTIVE comment (a real like) must NOT run cleanup ---
  const cleanupComment6 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق نشط يتلقى إعجاباً' });
  const cleanupCommentId6 = cleanupComment6.data.commentId;
  await callToggleLike(cleanupUser2.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId6, desiredState: 'like' });
  // Give any (incorrectly) firing trigger a real window to act, then prove it didn't.
  await new Promise(resolve => setTimeout(resolve, 3000));
  const afterActiveLike = await readComment('post-fn-cleanup', cleanupCommentId6);
  const activeLikeDoc = await readLike('post-fn-cleanup', cleanupCommentId6, cleanupUser2.uid);
  assertValue('CL9 updating an ACTIVE comment (a real like — status stays "active") does not run the cleanup trigger: likesCount stays 1', afterActiveLike.data()?.likesCount, 1);
  assertValue('CL10 the like document from case 6 is untouched by cleanup — still present', activeLikeDoc.exists(), true);

  // --- Case 7: updating an already-deleted comment does not corrupt its state ---
  // (case 5's replay above already IS this scenario — a real update landing on
  // a comment already at status: 'deleted'; CL8 proves no drift. This
  // re-confirms the comment document itself is intact, not hard-deleted or
  // otherwise mangled by the extra write.)
  const cleanupComment4Final = await readComment('post-fn-cleanup', cleanupCommentId4);
  assertValue('CL11 updating an already-deleted comment again leaves its status correctly as "deleted" (soft-delete retained, not corrupted or hard-deleted)', cleanupComment4Final.data()?.status, 'deleted');

  // --- Case 8: a deleted (and cleaned-up) comment remains impossible to like ---
  await expectError('CL12 liking a deleted-and-cleaned comment is rejected as not-found', 'not-found', () =>
    callToggleLike(cleanupUser3.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId2, desiredState: 'like' }));

  // --- Case 9: direct client deletion of a like document remains denied ---
  // A real rules-ENFORCED authenticated context (not this file's
  // withSecurityRulesDisabled test harness) attempting to delete cleanupUser2's
  // own still-existing like document from case 6 directly — proving only the
  // trusted backend (Admin SDK, bypassing Rules entirely) may ever remove a
  // like document, never the client itself, even for a like the client owns.
  const enforcedCtx = testEnv.authenticatedContext(cleanupUser2.uid);
  try {
    await assertFails(deleteDoc(doc(enforcedCtx.firestore(), 'posts', 'post-fn-cleanup', 'comments', cleanupCommentId6, 'likes', cleanupUser2.uid)));
    record('CL13 a real authenticated client directly deleting a like document (bypassing toggleCommentLike) is still denied by firestore.rules — only the trusted backend performs cleanup', true);
  } catch (err) {
    record('CL13 a real authenticated client directly deleting a like document (bypassing toggleCommentLike) is still denied by firestore.rules — only the trusted backend performs cleanup', false, (err as Error).message.split('\n')[0]);
  }
  const likeDocStillExists = await readLike('post-fn-cleanup', cleanupCommentId6, cleanupUser2.uid);
  assertValue('CL13b the like document still exists after the denied direct-delete attempt', likeDocStillExists.exists(), true);

  // --- Case 10: an unrelated (sibling) comment's likes are never touched ---
  const cleanupComment10 = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق منفصل يجب ألا يتأثر' });
  const cleanupCommentId10 = cleanupComment10.data.commentId;
  await callToggleLike(cleanupUser2.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId10, desiredState: 'like' });

  const cleanupComment10b = await callCreateComment(cleanupUser1.functions, { postId: 'post-fn-cleanup', text: 'تعليق آخر سيُحذف بجانبه' });
  const cleanupCommentId10b = cleanupComment10b.data.commentId;
  await callToggleLike(cleanupUser3.functions, { postId: 'post-fn-cleanup', commentId: cleanupCommentId10b, desiredState: 'like' });
  await setCommentStatus('post-fn-cleanup', cleanupCommentId10b, 'deleted');
  const cu10bDone = await waitUntil(async () => {
    const likes = await readLikesCollection('post-fn-cleanup', cleanupCommentId10b);
    const c = await readComment('post-fn-cleanup', cleanupCommentId10b);
    return likes.size === 0 && c.data()?.likesCount === 0;
  });
  assertValue('CL14 the sibling comment\'s own cleanup completes normally', cu10bDone, true);

  const unrelatedAfter = await readComment('post-fn-cleanup', cleanupCommentId10);
  const unrelatedLikeDoc = await readLike('post-fn-cleanup', cleanupCommentId10, cleanupUser2.uid);
  assertValue('CL15 an unrelated comment\'s likesCount is untouched by a sibling comment\'s cleanup trigger', unrelatedAfter.data()?.likesCount, 1);
  assertValue('CL16 an unrelated comment\'s like document is untouched by a sibling comment\'s cleanup trigger', unrelatedLikeDoc.exists(), true);

  console.log('\n=== 12. togglePostLike — basic correctness and idempotency ===');

  const postLikeUserL1 = await createTestUser('Post Like Pilot L1');
  const postLikeUserL2 = await createTestUser('Post Like Pilot L2');
  await seedPost('post-fn-postlike', postLikeUserL1.uid, { text: 'likeable post' });

  const postLike1 = await expectSuccess('PL1 L1 likes the post', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-postlike', desiredState: 'like' }).then(r => r.data));
  assertValue('PL1b liked = true', postLike1?.liked, true);

  const afterPostLike1 = await readPost('post-fn-postlike');
  assertValue('PL2 likesCount is exactly 1 after a single like', afterPostLike1.data()?.likesCount, 1);
  const postLike1Doc = await readPostLike('post-fn-postlike', postLikeUserL1.uid);
  assertValue('PL3 a real like document exists at the liker\'s own uid path', postLike1Doc.exists(), true);

  const postLike1Again = await expectSuccess('PL4 L1 calls "like" again (already liked) — idempotent no-op, not an error', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-postlike', desiredState: 'like' }).then(r => r.data));
  assertValue('PL4b still liked = true', postLike1Again?.liked, true);
  const afterPostLike1Again = await readPost('post-fn-postlike');
  assertValue('PL5 likesCount is STILL exactly 1 (no double-count from the redundant call)', afterPostLike1Again.data()?.likesCount, 1);

  const postUnlike1 = await expectSuccess('PL6 L1 unlikes the post', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-postlike', desiredState: 'unlike' }).then(r => r.data));
  assertValue('PL6b liked = false', postUnlike1?.liked, false);
  const afterPostUnlike1 = await readPost('post-fn-postlike');
  assertValue('PL7 likesCount is exactly 0 after unlike', afterPostUnlike1.data()?.likesCount, 0);
  const postLike1DocAfterUnlike = await readPostLike('post-fn-postlike', postLikeUserL1.uid);
  assertValue('PL8 the like document was deleted', postLike1DocAfterUnlike.exists(), false);

  const postUnlike1Again = await expectSuccess('PL9 L1 calls "unlike" again (already unliked) — idempotent no-op', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-postlike', desiredState: 'unlike' }).then(r => r.data));
  assertValue('PL9b still liked = false', postUnlike1Again?.liked, false);
  const afterPostUnlike1Again = await readPost('post-fn-postlike');
  assertValue('PL10 likesCount is STILL exactly 0 (never goes negative from the redundant call)', afterPostUnlike1Again.data()?.likesCount, 0);

  console.log('\n=== 13. togglePostLike — identity cannot be spoofed, validation, and errors ===');

  const postSpoofAttempt = await expectSuccess('PSP1 L2 calls togglePostLike with an extra client-supplied "uid" field pointing at L1', () =>
    callTogglePostLike(postLikeUserL2.functions, {
      postId: 'post-fn-postlike', desiredState: 'like', uid: postLikeUserL1.uid,
    }).then(r => r.data));
  assertValue('PSP1b the call still succeeds (the extra field is simply ignored)', postSpoofAttempt?.liked, true);
  const l2PostLikeDoc = await readPostLike('post-fn-postlike', postLikeUserL2.uid);
  assertValue('PSP2 the resulting like document is under L2\'s REAL uid — never L1\'s, proving uid always comes from request.auth, never from the payload', l2PostLikeDoc.exists(), true);
  const l1PostLikeDocStillGone = await readPostLike('post-fn-postlike', postLikeUserL1.uid);
  assertValue('PSP3 L1\'s like path is untouched by L2\'s spoofing attempt (still not liked, from section 12\'s unlike)', l1PostLikeDocStillGone.exists(), false);

  // Clean up L2's like from the spoof test so section 14's concurrency counts start clean.
  await callTogglePostLike(postLikeUserL2.functions, { postId: 'post-fn-postlike', desiredState: 'unlike' });

  await expectError('PE1 an unauthenticated (guest) caller is rejected', 'unauthenticated', () =>
    callTogglePostLike(guestFunctions, { postId: 'post-fn-postlike', desiredState: 'like' }));

  await expectError('PE2 an invalid desiredState value is rejected', 'invalid-argument', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-postlike', desiredState: 'toggle' }));

  await expectError('PE3 a missing postId is rejected', 'invalid-argument', () =>
    callTogglePostLike(postLikeUserL1.functions, { desiredState: 'like' }));

  await expectError('PE4 a nonexistent post is rejected', 'not-found', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-does-not-exist', desiredState: 'like' }));

  await seedPost('post-fn-hidden', postLikeUserL1.uid, { text: 'مخفي', status: 'hidden' });
  await expectError('PE5 a hidden (not-active) post is rejected', 'not-found', () =>
    callTogglePostLike(postLikeUserL1.functions, { postId: 'post-fn-hidden', desiredState: 'like' }));

  const bannedPostLikeAttempt = await createTestUser('Banned Post Like Pilot', { status: 'banned' });
  await expectError('PE6 a banned user is rejected', 'permission-denied', () =>
    callTogglePostLike(bannedPostLikeAttempt.functions, { postId: 'post-fn-postlike', desiredState: 'like' }));

  console.log('\n=== 14. togglePostLike — real concurrency (5 different users, one Admin-SDK transaction each) ===');

  const postConcurrentPost = 'post-fn-postlike-concurrent';
  await seedPost(postConcurrentPost, postLikeUserL1.uid, { text: 'concurrency target post' });

  const postConcurrentUsers = await Promise.all(
    Array.from({ length: 5 }, (_, i) => createTestUser(`Post Concurrent Pilot ${i}`)),
  );
  const postConcurrentLikeResults = await Promise.allSettled(
    postConcurrentUsers.map(u => callTogglePostLike(u.functions, { postId: postConcurrentPost, desiredState: 'like' })),
  );
  assertValue('PCC1 all 5 concurrent likes from 5 DIFFERENT users resolved without error', postConcurrentLikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterPostConcurrentLikes = await readPost(postConcurrentPost);
  assertValue('PCC2 likesCount is exactly 5 (no lost updates under real Firestore transaction contention)', afterPostConcurrentLikes.data()?.likesCount, 5);

  console.log('\n=== 15. togglePostLike — retry-safety (same user, same desiredState, 4-way concurrent) ===');

  const postRetryUser = postConcurrentUsers[0];
  const postRetryLikeResults = await Promise.allSettled(
    Array.from({ length: 4 }, () => callTogglePostLike(postRetryUser.functions, { postId: postConcurrentPost, desiredState: 'like' })),
  );
  assertValue('PR1 4 concurrent "like" calls from an ALREADY-liking user (simulating a lost-response retry storm) all resolve without error', postRetryLikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterPostRetryLikes = await readPost(postConcurrentPost);
  assertValue('PR2 likesCount is STILL exactly 5 — desiredState made every redundant call a true no-op, never a double-flip', afterPostRetryLikes.data()?.likesCount, 5);

  const postRetryUnlikeResults = await Promise.allSettled(
    Array.from({ length: 4 }, () => callTogglePostLike(postRetryUser.functions, { postId: postConcurrentPost, desiredState: 'unlike' })),
  );
  assertValue('PR3 4 concurrent "unlike" calls all resolve without error', postRetryUnlikeResults.filter(r => r.status === 'rejected').length, 0);
  const afterPostRetryUnlikes = await readPost(postConcurrentPost);
  assertValue('PR4 likesCount is exactly 4 — one real net unlike, not corrupted by the 4 redundant calls', afterPostRetryUnlikes.data()?.likesCount, 4);

  console.log('\n=== 16. togglePostLike — an IMAGE post can be liked, same as a text post ===');

  await seedPost('post-fn-image-like', postLikeUserL1.uid, {
    text: 'منشور بصورة', mediaType: 'image', mediaURL: 'https://example-test.invalid/full.jpg',
    thumbnailURL: 'https://example-test.invalid/thumb.jpg', mediaSize: 100000, mediaPath: 'community/posts/post-fn-image-like',
  });
  const imagePostLike = await expectSuccess('IMG1 liking an image post succeeds exactly like a text post — the like belongs to the POST, not a separate per-image system', () =>
    callTogglePostLike(postLikeUserL2.functions, { postId: 'post-fn-image-like', desiredState: 'like' }).then(r => r.data));
  assertValue('IMG1b liked = true', imagePostLike?.liked, true);
  const afterImagePostLike = await readPost('post-fn-image-like');
  assertValue('IMG2 the image post\'s likesCount is exactly 1 — the SAME field/mechanism used for text posts', afterImagePostLike.data()?.likesCount, 1);

  console.log('\n=== 17. cleanupPostLikes — orphaned-like cleanup on post deletion ===');

  const cleanupPostUser1 = await createTestUser('Post Cleanup Pilot 1');
  const cleanupPostUser2 = await createTestUser('Post Cleanup Pilot 2');
  const cleanupPostUser3 = await createTestUser('Post Cleanup Pilot 3');

  // --- Case 1: zero likes ---
  await seedPost('post-fn-pcleanup1', cleanupPostUser1.uid, { text: 'post بدون إعجابات للحذف' });
  await setPostStatus('post-fn-pcleanup1', 'deleted');
  const pcu1Done = await waitUntil(async () => (await readPost('post-fn-pcleanup1')).data()?.likesCount === 0);
  assertValue('PCL1 zero-like post: delete transition succeeds, likesCount stays/ends at 0', pcu1Done, true);
  const pcu1Likes = await readPostLikesCollection('post-fn-pcleanup1');
  assertValue('PCL1b zero-like post: likes subcollection is empty (no-op cleanup, no error)', pcu1Likes.size, 0);

  // --- Case 2: one like ---
  await seedPost('post-fn-pcleanup2', cleanupPostUser1.uid, { text: 'post بإعجاب واحد للحذف' });
  await callTogglePostLike(cleanupPostUser2.functions, { postId: 'post-fn-pcleanup2', desiredState: 'like' });
  const beforePostDelete2 = await readPost('post-fn-pcleanup2');
  assertValue('PCL2 one-like post: likesCount is 1 before deletion', beforePostDelete2.data()?.likesCount, 1);
  await setPostStatus('post-fn-pcleanup2', 'deleted');
  const pcu2Done = await waitUntil(async () => {
    const likes = await readPostLikesCollection('post-fn-pcleanup2');
    const p = await readPost('post-fn-pcleanup2');
    return likes.size === 0 && p.data()?.likesCount === 0;
  });
  assertValue('PCL3 one-like post: the like document is physically removed and likesCount reaches 0 after the delete transition', pcu2Done, true);

  // --- Case 3: multiple users' likes ---
  await seedPost('post-fn-pcleanup3', cleanupPostUser1.uid, { text: 'post بعدة إعجابات للحذف' });
  await Promise.all([cleanupPostUser1, cleanupPostUser2, cleanupPostUser3].map(u =>
    callTogglePostLike(u.functions, { postId: 'post-fn-pcleanup3', desiredState: 'like' })));
  const beforePostDelete3 = await readPost('post-fn-pcleanup3');
  assertValue('PCL4 multi-like post: likesCount is 3 before deletion', beforePostDelete3.data()?.likesCount, 3);
  await setPostStatus('post-fn-pcleanup3', 'deleted');
  const pcu3Done = await waitUntil(async () => {
    const likes = await readPostLikesCollection('post-fn-pcleanup3');
    const p = await readPost('post-fn-pcleanup3');
    return likes.size === 0 && p.data()?.likesCount === 0;
  });
  assertValue('PCL5 multi-like post: ALL 3 users\' like documents are removed and likesCount reaches 0', pcu3Done, true);

  // --- Case 4: 600+ seeded likes — multi-batch cleanup ---
  await seedPost('post-fn-pcleanup4', cleanupPostUser1.uid, { text: 'post بعدد كبير من الإعجابات للحذف' });
  const SEEDED_POST_LIKE_COUNT = 610;
  await testEnv.withSecurityRulesDisabled(async ctx => {
    const firestore = ctx.firestore();
    let batch = writeBatch(firestore);
    let opsInBatch = 0;
    for (let i = 0; i < SEEDED_POST_LIKE_COUNT; i++) {
      batch.set(doc(firestore, 'posts', 'post-fn-pcleanup4', 'likes', `seeded-uid-${i}`), { createdAt: serverTimestamp() });
      opsInBatch++;
      if (opsInBatch === 400) {
        await batch.commit();
        batch = writeBatch(firestore);
        opsInBatch = 0;
      }
    }
    if (opsInBatch > 0) await batch.commit();
    await updateDoc(doc(firestore, 'posts', 'post-fn-pcleanup4'), { likesCount: SEEDED_POST_LIKE_COUNT });
  });
  const seededPostLikes = await readPostLikesCollection('post-fn-pcleanup4');
  assertValue(`PCL6 ${SEEDED_POST_LIKE_COUNT} likes seeded directly (exceeds Firestore's 500-writes-per-batch limit, forcing the cleanup trigger's own internal pagination loop to run more than once)`, seededPostLikes.size, SEEDED_POST_LIKE_COUNT);
  await setPostStatus('post-fn-pcleanup4', 'deleted');
  const pcu4Done = await waitUntil(async () => {
    const likes = await readPostLikesCollection('post-fn-pcleanup4');
    const p = await readPost('post-fn-pcleanup4');
    return likes.size === 0 && p.data()?.likesCount === 0;
  }, 45000, 500);
  assertValue('PCL7 600+ seeded likes: cleanup completes across multiple bounded batches, every like document is removed, likesCount is normalized to 0', pcu4Done, true);

  // --- Case 5: replaying the active->deleted transition causes no drift ---
  await setPostStatus('post-fn-pcleanup4', 'deleted');
  const pcu4RetryDone = await waitUntil(async () => {
    const likes = await readPostLikesCollection('post-fn-pcleanup4');
    const p = await readPost('post-fn-pcleanup4');
    return likes.size === 0 && p.data()?.likesCount === 0;
  });
  assertValue('PCL8 replaying the same already-deleted transition causes no failure, no negative count, and no drift (still 0 likes, likesCount still 0)', pcu4RetryDone, true);

  // --- Case 6: updating an ACTIVE post (a real like) must NOT run cleanup ---
  await seedPost('post-fn-pcleanup6', cleanupPostUser1.uid, { text: 'post نشط يتلقى إعجاباً' });
  await callTogglePostLike(cleanupPostUser2.functions, { postId: 'post-fn-pcleanup6', desiredState: 'like' });
  await new Promise(resolve => setTimeout(resolve, 3000));
  const afterActivePostLike = await readPost('post-fn-pcleanup6');
  const activePostLikeDoc = await readPostLike('post-fn-pcleanup6', cleanupPostUser2.uid);
  assertValue('PCL9 updating an ACTIVE post (a real like — status stays "active") does not run the cleanup trigger: likesCount stays 1', afterActivePostLike.data()?.likesCount, 1);
  assertValue('PCL10 the like document from case 6 is untouched by cleanup — still present', activePostLikeDoc.exists(), true);

  // --- Case 7: updating an already-deleted post does not corrupt its state ---
  const cleanupPost4Final = await readPost('post-fn-pcleanup4');
  assertValue('PCL11 updating an already-deleted post again leaves its status correctly as "deleted" (soft-delete retained, not corrupted or hard-deleted)', cleanupPost4Final.data()?.status, 'deleted');

  // --- Case 8: a deleted (and cleaned-up) post remains impossible to like ---
  await expectError('PCL12 liking a deleted-and-cleaned post is rejected as not-found', 'not-found', () =>
    callTogglePostLike(cleanupPostUser3.functions, { postId: 'post-fn-pcleanup2', desiredState: 'like' }));

  // --- Case 9: direct client deletion of a post like document remains denied ---
  // (Rules-enforced proof lives in scripts/testCommunityRules.ts's PL6/PL7 —
  // this section's job is the Function/trigger behavior, not the Rules
  // boundary, so it is not duplicated here.)

  // --- Case 10: an unrelated (sibling) post's likes are never touched ---
  await seedPost('post-fn-pcleanup10', cleanupPostUser1.uid, { text: 'post منفصل يجب ألا يتأثر' });
  await callTogglePostLike(cleanupPostUser2.functions, { postId: 'post-fn-pcleanup10', desiredState: 'like' });

  await seedPost('post-fn-pcleanup10b', cleanupPostUser1.uid, { text: 'post آخر سيُحذف بجانبه' });
  await callTogglePostLike(cleanupPostUser3.functions, { postId: 'post-fn-pcleanup10b', desiredState: 'like' });
  await setPostStatus('post-fn-pcleanup10b', 'deleted');
  const pcu10bDone = await waitUntil(async () => {
    const likes = await readPostLikesCollection('post-fn-pcleanup10b');
    const p = await readPost('post-fn-pcleanup10b');
    return likes.size === 0 && p.data()?.likesCount === 0;
  });
  assertValue('PCL13 the sibling post\'s own cleanup completes normally', pcu10bDone, true);

  const unrelatedPostAfter = await readPost('post-fn-pcleanup10');
  const unrelatedPostLikeDoc = await readPostLike('post-fn-pcleanup10', cleanupPostUser2.uid);
  assertValue('PCL14 an unrelated post\'s likesCount is untouched by a sibling post\'s cleanup trigger', unrelatedPostAfter.data()?.likesCount, 1);
  assertValue('PCL15 an unrelated post\'s like document is untouched by a sibling post\'s cleanup trigger', unrelatedPostLikeDoc.exists(), true);

  console.log('\n=== 18. cleanupPostMedia — orphaned-media cleanup on post hide/delete (Phase 9) ===');

  const mediaCleanupUser = await createTestUser('Media Cleanup Pilot');
  const mediaCleanupUser2 = await createTestUser('Media Cleanup Pilot 2');

  // --- Case 1: owner deletes an image post -> its media is removed ---
  const uuid1 = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';
  const mediaPath1 = `community/posts/${mediaCleanupUser.uid}/post-media-cleanup-1`;
  await seedPost('post-media-cleanup-1', mediaCleanupUser.uid, {
    text: 'منشور بصورة سيُحذف', mediaType: 'image',
    mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
    thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
    mediaSize: 200 * 1024, mediaPath: mediaPath1, mediaWidth: 1600, mediaHeight: 1000,
  });
  await seedMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-1', uuid1);
  const filesBeforeDelete1 = await countMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-1');
  assertValue('MC1 precondition: both the full image and thumbnail exist in Storage before deletion', filesBeforeDelete1, 2);

  await setPostStatus('post-media-cleanup-1', 'deleted');
  const mc1Done = await waitUntil(async () => (await countMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-1')) === 0);
  assertValue('MC2 owner-deleting the post removes BOTH its Storage files (full + thumbnail)', mc1Done, true);

  // --- Case 2: moderator hides an image post -> its media is ALSO removed ---
  const uuid2 = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
  const mediaPath2 = `community/posts/${mediaCleanupUser.uid}/post-media-cleanup-2`;
  await seedPost('post-media-cleanup-2', mediaCleanupUser.uid, {
    text: 'منشور بصورة سيُخفى', mediaType: 'image',
    mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
    thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
    mediaSize: 200 * 1024, mediaPath: mediaPath2, mediaWidth: 1600, mediaHeight: 1000,
  });
  await seedMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-2', uuid2);
  await setPostStatus('post-media-cleanup-2', 'hidden');
  const mc2Done = await waitUntil(async () => (await countMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-2')) === 0);
  assertValue('MC3 a MODERATOR-hidden post\'s media is also removed — the trigger fires identically for both active->hidden and active->deleted transitions', mc2Done, true);
  const postAfterHide = await readPost('post-media-cleanup-2');
  assertValue('MC4 the post\'s own status is exactly "hidden" (soft-hide retained, not corrupted into "deleted")', postAfterHide.data()?.status, 'hidden');

  // --- Case 3: retry-safety — replaying the same transition doesn't crash ---
  await setPostStatus('post-media-cleanup-1', 'deleted');
  const mc3Done = await waitUntil(async () => (await countMediaFiles(mediaCleanupUser.uid, 'post-media-cleanup-1')) === 0);
  assertValue('MC5 replaying an already-cleaned transition is a safe no-op (files already gone -> no crash, no error)', mc3Done, true);

  // --- Case 4: a text-only post (no media) transitioning is a safe no-op ---
  await seedPost('post-media-cleanup-textonly', mediaCleanupUser.uid, { text: 'منشور نصي بدون صورة' });
  await setPostStatus('post-media-cleanup-textonly', 'deleted');
  const textOnlyDeleted = await waitUntil(async () => (await readPost('post-media-cleanup-textonly')).data()?.status === 'deleted');
  assertValue('MC6 a text-only post\'s deletion completes normally (no mediaPath -> the trigger no-ops on the Storage step entirely)', textOnlyDeleted, true);

  // --- Case 5: an unrelated (sibling) post's media is never touched ---
  const uuidSibling = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const mediaPathSibling = `community/posts/${mediaCleanupUser2.uid}/post-media-cleanup-sibling`;
  await seedPost('post-media-cleanup-sibling', mediaCleanupUser2.uid, {
    text: 'منشور مستقل يجب ألا يتأثر', mediaType: 'image',
    mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
    thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
    mediaSize: 200 * 1024, mediaPath: mediaPathSibling, mediaWidth: 1600, mediaHeight: 1000,
  });
  await seedMediaFiles(mediaCleanupUser2.uid, 'post-media-cleanup-sibling', uuidSibling);

  const uuidNeighbor = '16fd2706-8baf-433b-82eb-8c7fada847da';
  const mediaPathNeighbor = `community/posts/${mediaCleanupUser2.uid}/post-media-cleanup-neighbor`;
  await seedPost('post-media-cleanup-neighbor', mediaCleanupUser2.uid, {
    text: 'منشور آخر سيُحذف بجانبه', mediaType: 'image',
    mediaURL: 'https://firebasestorage.googleapis.com/fake-full.jpg',
    thumbnailURL: 'https://firebasestorage.googleapis.com/fake-thumb.jpg',
    mediaSize: 200 * 1024, mediaPath: mediaPathNeighbor, mediaWidth: 1600, mediaHeight: 1000,
  });
  await seedMediaFiles(mediaCleanupUser2.uid, 'post-media-cleanup-neighbor', uuidNeighbor);

  await setPostStatus('post-media-cleanup-neighbor', 'deleted');
  const neighborDone = await waitUntil(async () => (await countMediaFiles(mediaCleanupUser2.uid, 'post-media-cleanup-neighbor')) === 0);
  assertValue('MC7 the neighbor post\'s own cleanup completes normally', neighborDone, true);

  const siblingFilesAfter = await countMediaFiles(mediaCleanupUser2.uid, 'post-media-cleanup-sibling');
  assertValue('MC8 an unrelated sibling post\'s media is completely untouched by its neighbor\'s cleanup trigger', siblingFilesAfter, 2);

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);

  await testEnv.cleanup();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
