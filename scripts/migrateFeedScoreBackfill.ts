/**
 * Backfill utility (Phase 2): computes and writes feedScore (+
 * feedScoreComputedAt + feedScoreFrozen) for every posts/{postId} document
 * that predates the feed-ranking rollout — existing posts have none of
 * these three fields at all, since they were created before this schema
 * change. Per the approved Phase 1 design (Section V), this backfill must
 * run to completion BEFORE useFeed.ts's ranked query ships to any real
 * user — otherwise old posts (missing feedScore entirely) would sort
 * unpredictably against newly-created posts (which start at feedScore=100).
 *
 * Uses the FULL formula (freshness + decayed engagement + velocity), not
 * just the fresh-post 100 shortcut — these posts already have real
 * age/engagement, exactly like every subsequent scheduled
 * recomputeFeedScores pass would compute for them. Imports the same pure
 * formula functions functions/src/feedRanking.ts exports (freshness,
 * decayMultiplier, engagementScore, velocityBonus, computeFeedScore,
 * RECOMPUTE_HORIZON_MS, VELOCITY_WINDOW_MS) — a single source of truth, so
 * this one-time backfill can never silently drift from what the ongoing
 * scheduled Function computes for the exact same inputs.
 *
 * ============================================================================
 * SCOPE — EMULATOR-ONLY BY DESIGN, DELIBERATELY, NOT AS A TEMPORARY GAP
 * ============================================================================
 * Same posture as migrateDisplayNameNormalized.ts: targets ONLY the local
 * Firebase emulator (PROJECT_ID below), bypasses Security Rules via
 * withSecurityRulesDisabled, and cannot reach a real production project —
 * root package.json has no firebase-admin dependency and no service-account
 * credential handling. Fails CLOSED at startup (the FIRESTORE_EMULATOR_HOST
 * check below), not merely by omission.
 *
 * ============================================================================
 * PRODUCTION MIGRATION RUNBOOK (for whenever a real backfill is actually
 * needed — not executed by this script, not executed by this session)
 * ============================================================================
 * 1. Dependency/credentials/IAM: identical guidance to
 *    migrateDisplayNameNormalized.ts's own runbook — firebase-admin as a
 *    devDependency inside functions/ (already present, ^13.10.0) or a
 *    dedicated admin-tools/ sub-package; Application Default Credentials
 *    preferred over a committed service-account key;
 *    roles/datastore.user is sufficient.
 *
 * 2. MUST run to completion before useFeed.ts's ranked query is deployed —
 *    this is a hard ordering constraint (Section V), not a suggestion. A
 *    production rollout sequence: (a) deploy this backfill and let it
 *    finish, (b) deploy the updated firestore.rules + the new indexes, (c)
 *    deploy the recomputeFeedScores scheduled Function, (d) only then
 *    deploy the frontend build that queries orderBy('feedScore', ...).
 *
 * 3. Scale/batching: this emulator version's single unbounded
 *    `getDocs(collection(db, 'posts'))` is fine for a test fixture, NOT how
 *    the production version should read a real post collection. Production
 *    should page through `posts` in bounded chunks (e.g.
 *    `.orderBy('__name__').limit(500)` + `startAfter(cursor)`), same
 *    guidance already given for the displayNameNormalized backfill, and
 *    should use `admin.firestore().bulkWriter()` rather than one
 *    `updateDoc` call per document in a tight loop. The per-post recent-
 *    likes/recent-comments count() queries should be parallelized per page
 *    (Promise.all), matching feedRanking.ts's own recomputeFeedScoresBatch
 *    pattern, not run serially post-by-post.
 *
 * 4. Rollback/verification: additive only — never overwrites a post that
 *    already has a numeric feedScore (idempotent skip, same as the
 *    displayName migration), so there is no data-loss risk. Verification is
 *    re-running in dry-run mode afterward and confirming "0 missing" in the
 *    summary line.
 *
 * 5. Trust boundary warning: identical to migrateDisplayNameNormalized.ts —
 *    the Admin SDK bypasses Firestore Security Rules entirely by design;
 *    this script's own correctness (only ever touching the three feedScore*
 *    fields, only ever on documents genuinely missing feedScore) is the
 *    only thing standing between it and a much more destructive accidental
 *    write.
 * ============================================================================
 *
 * Idempotent: skips any document that already has a numeric feedScore, so
 * re-running is always safe and touches only what's actually missing.
 *
 * Dry-run by default — pass --apply to actually write.
 *
 * Run with:
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/migrateFeedScoreBackfill.ts"          # dry run
 *   npx firebase emulators:exec --project demo-community-rules-test \
 *     "npx tsx scripts/migrateFeedScoreBackfill.ts --apply"  # writes
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  collection, doc, getDocs, updateDoc, query, where, getCountFromServer, Timestamp,
} from 'firebase/firestore';
import {
  computeFeedScore, RECOMPUTE_HORIZON_MS, VELOCITY_WINDOW_MS,
} from '../functions/src/feedRanking';
import type { Post } from '../src/components/Community/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const PROJECT_ID = 'demo-community-rules-test';

const APPLY = process.argv.includes('--apply');

// Fail CLOSED — same rationale as migrateDisplayNameNormalized.ts: this
// script has no admin credential path at all, so it could never actually
// reach a real project even without this check, but requiring the
// emulator's own marker env var makes that limitation an explicit, checked
// precondition rather than an implicit property a future edit could erode.
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('[migrateFeedScoreBackfill] Refusing to run: FIRESTORE_EMULATOR_HOST is not set.');
  console.error('This script is EMULATOR-ONLY by design (see the file header for the production runbook).');
  console.error('Run it via: npm run migrate:feed-score-backfill');
  process.exit(1);
}

async function main() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(join(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });

  let scanned = 0;
  let missing = 0;
  let written = 0;
  const now = new Date();

  await testEnv.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    const snap = await getDocs(collection(db, 'posts'));
    scanned = snap.docs.length;

    for (const postDoc of snap.docs) {
      const data = postDoc.data() as Post;
      if (typeof data.feedScore === 'number') continue; // already migrated — idempotent skip
      missing++;

      const createdAt = data.createdAt;
      if (!createdAt) {
        console.log(`  SKIP  posts/${postDoc.id}  — no createdAt, cannot compute an age-based score`);
        continue;
      }
      const ageMs = now.getTime() - createdAt.toMillis();
      const ageHours = Math.max(0, ageMs / (60 * 60 * 1000));
      const likesCount = data.likesCount ?? 0;
      const commentsCount = data.commentsCount ?? 0;

      const velocityCutoff = Timestamp.fromMillis(now.getTime() - VELOCITY_WINDOW_MS);
      const [likesRecentSnap, commentsRecentSnap] = await Promise.all([
        getCountFromServer(query(collection(db, 'posts', postDoc.id, 'likes'), where('createdAt', '>', velocityCutoff))),
        getCountFromServer(query(collection(db, 'posts', postDoc.id, 'comments'), where('createdAt', '>', velocityCutoff))),
      ]);
      const recentLikes = likesRecentSnap.data().count;
      const recentComments = commentsRecentSnap.data().count;

      const score = computeFeedScore(ageHours, likesCount, commentsCount, recentLikes, recentComments);
      const frozen = ageMs >= RECOMPUTE_HORIZON_MS;

      console.log(`  ${APPLY ? 'WRITE' : 'DRY-RUN'}  posts/${postDoc.id}  ageHours=${ageHours.toFixed(1)} likes=${likesCount} comments=${commentsCount} recentLikes=${recentLikes} recentComments=${recentComments}  ->  feedScore=${score.toFixed(2)} frozen=${frozen}`);

      if (APPLY) {
        await updateDoc(doc(db, 'posts', postDoc.id), {
          feedScore: score,
          feedScoreComputedAt: Timestamp.fromDate(now),
          feedScoreFrozen: frozen,
        });
        written++;
      }
    }
  });

  console.log(`\n=== Scanned ${scanned} post documents. ${missing} missing feedScore. ${APPLY ? `${written} written.` : 'Dry run — nothing written. Re-run with --apply to write.'} ===\n`);

  await testEnv.cleanup();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
