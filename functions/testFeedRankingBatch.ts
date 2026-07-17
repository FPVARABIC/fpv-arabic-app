/**
 * Integration test for recomputeFeedScoresBatch (Phase 2) against the REAL
 * Firestore emulator via the Admin SDK — the same trust boundary the real
 * scheduled Function uses. Lives inside functions/ (not scripts/)
 * deliberately: this package already depends on firebase-admin; the root
 * project's scripts/ deliberately does not (see
 * scripts/migrateDisplayNameNormalized.ts's own header for why that
 * boundary is intentional).
 *
 * All timestamps are explicit, fake, Admin-SDK-written values — no real
 * sleeps anywhere in this file. Every "2 hours ago" / "10 days ago" is a
 * literal computed Date passed straight into a document write.
 *
 * Run with (from the repo root):
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     --only firestore "npx tsx functions/testFeedRankingBatch.ts"
 */
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { recomputeFeedScoresBatch, computeFeedScore, RECOMPUTE_HORIZON_MS } from './src/feedRanking';

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('[testFeedRankingBatch] Refusing to run: FIRESTORE_EMULATOR_HOST is not set.');
  console.error('This script is EMULATOR-ONLY by design. Run via: npm run test:feed-ranking-batch (root package.json)');
  process.exit(1);
}

const PROJECT_ID = 'demo-community-rules-test';
initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

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

function assertClose(label: string, actual: number, expected: number, tolerance = 0.05) {
  const diff = Math.abs(actual - expected);
  record(`${label} (actual=${actual.toFixed(4)}, expected=${expected.toFixed(4)})`, diff <= tolerance);
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

async function seedPost(id: string, overrides: Record<string, unknown>) {
  await db.collection('posts').doc(id).set({
    authorId: 'uidRankingBatch',
    authorName: 'Ranking Batch Pilot',
    authorPhoto: null,
    text: `post ${id}`,
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
    status: 'active',
    searchTokens: [],
    feedScore: 100,
    feedScoreComputedAt: null,
    feedScoreFrozen: false,
    ...overrides,
  });
}

async function main() {
  const now = new Date('2026-01-01T00:00:00.000Z'); // fixed reference "now" — deterministic, no real clock dependency

  console.log('\n=== Seeding fixture posts with explicit, fake timestamps (no real sleeps) ===');

  // 1. A fresh post, 1 hour old, zero engagement.
  await seedPost('fresh-1h', { createdAt: Timestamp.fromDate(new Date(now.getTime() - 1 * HOUR_MS)) });

  // 2. A post with real likes/comments, some inside the 2h velocity window,
  // some outside it — proves the window boundary is honored, not just "any
  // likes count as recent."
  await seedPost('with-velocity', {
    createdAt: Timestamp.fromDate(new Date(now.getTime() - 5 * HOUR_MS)),
    likesCount: 3,
    commentsCount: 1,
  });
  await db.collection('posts').doc('with-velocity').collection('likes').doc('recent1').set({ createdAt: Timestamp.fromDate(new Date(now.getTime() - 30 * 60 * 1000)) });
  await db.collection('posts').doc('with-velocity').collection('likes').doc('recent2').set({ createdAt: Timestamp.fromDate(new Date(now.getTime() - 90 * 60 * 1000)) });
  await db.collection('posts').doc('with-velocity').collection('likes').doc('stale1').set({ createdAt: Timestamp.fromDate(new Date(now.getTime() - 3 * HOUR_MS)) }); // OUTSIDE the 2h window — must not count
  await db.collection('posts').doc('with-velocity').collection('comments').doc('recentC1').set({ createdAt: Timestamp.fromDate(new Date(now.getTime() - 45 * 60 * 1000)) });

  // 3. A post already past the 9-day recompute horizon, not yet marked
  // frozen — must be picked up ONE more time and correctly frozen.
  await seedPost('about-to-freeze', {
    createdAt: Timestamp.fromDate(new Date(now.getTime() - (RECOMPUTE_HORIZON_MS + 1 * HOUR_MS))),
    likesCount: 20,
    commentsCount: 2,
  });

  // 4. A post already marked frozen — the batch's own query must exclude
  // it entirely; if it were touched, its score would change (it has real
  // likes), so any change here is proof of a query-filter bug.
  await seedPost('already-frozen', {
    createdAt: Timestamp.fromDate(new Date(now.getTime() - 30 * DAY_MS)),
    likesCount: 500,
    commentsCount: 50,
    feedScore: 12.34, // a deliberately arbitrary sentinel value
    feedScoreFrozen: true,
  });

  // 5. A hidden (non-active) post — must be excluded by the status filter
  // even though it's otherwise a perfectly normal, unfrozen candidate.
  await seedPost('hidden-post', {
    createdAt: Timestamp.fromDate(new Date(now.getTime() - 1 * HOUR_MS)),
    status: 'hidden',
    feedScore: 55.55, // sentinel — must be untouched
  });

  console.log('\n=== Running recomputeFeedScoresBatch (first pass) ===');
  const result1 = await recomputeFeedScoresBatch(db, now);
  console.log(`  updatedCount=${result1.updatedCount} frozenCount=${result1.frozenCount}`);

  record('R1 exactly the 3 eligible active, unfrozen posts were updated (fresh-1h, with-velocity, about-to-freeze)', result1.updatedCount === 3, `actual=${result1.updatedCount}`);
  record('R2 exactly 1 post (about-to-freeze) was newly frozen this pass', result1.frozenCount === 1, `actual=${result1.frozenCount}`);

  const freshDoc = await db.collection('posts').doc('fresh-1h').get();
  const expectedFresh = computeFeedScore(1, 0, 0, 0, 0);
  assertClose('R3 fresh-1h\'s written feedScore matches computeFeedScore(ageHours=1, 0,0,0,0) exactly', freshDoc.data()!.feedScore, expectedFresh);
  record('R4 fresh-1h\'s feedScoreComputedAt was actually written (non-null)', freshDoc.data()!.feedScoreComputedAt !== null);
  record('R5 fresh-1h remains unfrozen (well within the recompute horizon)', freshDoc.data()!.feedScoreFrozen === false);

  const velocityDoc = await db.collection('posts').doc('with-velocity').get();
  // 2 likes (recent1, recent2) + 1 comment (recentC1) inside the 2h window; stale1 (3h ago) must NOT count.
  const expectedVelocityScore = computeFeedScore(5, 3, 1, 2, 1);
  assertClose('R6 with-velocity\'s score reflects EXACTLY 2 recent likes + 1 recent comment (stale1 correctly excluded by the 2h window)', velocityDoc.data()!.feedScore, expectedVelocityScore);

  const frozenNowDoc = await db.collection('posts').doc('about-to-freeze').get();
  record('R7 about-to-freeze is now marked feedScoreFrozen=true after crossing the horizon', frozenNowDoc.data()!.feedScoreFrozen === true);
  const expectedFrozenScore = computeFeedScore((RECOMPUTE_HORIZON_MS + 1 * HOUR_MS) / HOUR_MS, 20, 2, 0, 0);
  assertClose('R8 about-to-freeze\'s final score was still computed correctly on the pass that froze it', frozenNowDoc.data()!.feedScore, expectedFrozenScore);

  const alreadyFrozenDoc = await db.collection('posts').doc('already-frozen').get();
  record('R9 already-frozen post was NOT touched at all — sentinel feedScore value unchanged', alreadyFrozenDoc.data()!.feedScore === 12.34);

  const hiddenDoc = await db.collection('posts').doc('hidden-post').get();
  record('R10 a hidden (non-active) post was NOT touched — sentinel feedScore value unchanged', hiddenDoc.data()!.feedScore === 55.55);

  console.log('\n=== Running recomputeFeedScoresBatch a SECOND time (idempotency check) ===');
  const result2 = await recomputeFeedScoresBatch(db, now);
  record('R11 the second pass (same `now`) updates only the still-unfrozen posts (fresh-1h, with-velocity) — about-to-freeze is now excluded', result2.updatedCount === 2, `actual=${result2.updatedCount}`);
  record('R12 the second pass freezes nothing new (about-to-freeze was already frozen last pass)', result2.frozenCount === 0, `actual=${result2.frozenCount}`);

  const freshDocAgain = await db.collection('posts').doc('fresh-1h').get();
  assertClose('R13 re-running with the identical `now` reproduces the identical score (no drift from re-application)', freshDocAgain.data()!.feedScore, expectedFresh);

  console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
