/**
 * Community feed ranking (Phase 2) — pure formula plus the scheduled batch
 * job that applies it. Split out of index.ts deliberately: every constant
 * and function below is pure arithmetic with no Admin SDK dependency,
 * independently unit-testable without an emulator, unlike the rest of
 * index.ts's Firestore-transaction-heavy callables/triggers.
 *
 * Approved design reference (Phase 1 proposal, sections F–J):
 *   feedScore = freshness(ageHours)
 *             + engagementScore(likes, comments) * decayMultiplier(ageHours)
 *             + velocityBonus(recentLikes, recentComments)
 *   capped at SCORE_CAP.
 */
import type { Firestore, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';

// ─── Section G: freshness ───────────────────────────────────────────────
// 100 at ageHours=0, smoothly fading to exactly 0 at ageHours=40. The ^1.5
// exponent is front-loaded steeper than a linear fade (already down to
// ~35% by the halfway point, hour 20) rather than staying flat until a
// late cliff — verified pointwise against the approved, corrected Section G
// table (hour 0/2/10/20/30/35/38/39/40).
export const MOMENTUM_WINDOW_HOURS = 40;
const FRESH_MAX = 100;

export function freshness(ageHours: number): number {
  const remaining = Math.max(0, 1 - ageHours / MOMENTUM_WINDOW_HOURS);
  return FRESH_MAX * Math.pow(remaining, 1.5);
}

// ─── Section H: 40-hour decay of the engagement term itself ────────────
// Full strength (1.0) for the entire momentum window; then a linear fade
// to a permanent floor of 0.15 over the following 168 hours (7 days), held
// at that floor forever after — engagement is discounted, never zeroed.
const DECAY_TAIL_HOURS = 168;
const DECAY_FLOOR = 0.15;

export function decayMultiplier(ageHours: number): number {
  if (ageHours <= MOMENTUM_WINDOW_HOURS) return 1.0;
  const decayed = 1.0 - 0.85 * ((ageHours - MOMENTUM_WINDOW_HOURS) / DECAY_TAIL_HOURS);
  return Math.max(DECAY_FLOOR, decayed);
}

// ─── Section I: engagement weights ──────────────────────────────────────
// Square-root, not linear — each additional like/comment is worth strictly
// less than the previous one (the primary anti-gaming lever: a brigade of
// 200 fake likes contributes 6*sqrt(200)≈85 points, not 6*200=1200). The
// 18-vs-6 weighting makes one comment worth roughly 9 likes of marginal
// signal at typical (10-50) engagement scale, reflecting a comment's much
// higher effort/retention value.
const ENGAGE_LIKE_WEIGHT = 6;
const ENGAGE_COMMENT_WEIGHT = 18;

export function engagementScore(likesCount: number, commentsCount: number): number {
  return ENGAGE_LIKE_WEIGHT * Math.sqrt(Math.max(0, likesCount))
    + ENGAGE_COMMENT_WEIGHT * Math.sqrt(Math.max(0, commentsCount));
}

// ─── Section J: velocity (recent-rate) bonus ────────────────────────────
// Counts of likes/comments whose OWN createdAt falls within the last 2
// hours — a hard-cliff window (not smoothed) deliberately, since it's
// meant to represent "happening right now." Capped so a single short-term
// spike can't dominate the whole score budget.
export const VELOCITY_WINDOW_MS = 2 * 60 * 60 * 1000;
const VELOCITY_WEIGHT = 12;
const VELOCITY_CAP = 150;

export function velocityBonus(recentLikes: number, recentComments: number): number {
  const raw = VELOCITY_WEIGHT * Math.sqrt(Math.max(0, recentLikes) + 4 * Math.max(0, recentComments));
  return Math.min(VELOCITY_CAP, raw);
}

// ─── Section F: the combined formula ────────────────────────────────────
const SCORE_CAP = 1000;

export function computeFeedScore(
  ageHours: number,
  likesCount: number,
  commentsCount: number,
  recentLikes: number,
  recentComments: number,
): number {
  const raw = freshness(ageHours)
    + engagementScore(likesCount, commentsCount) * decayMultiplier(ageHours)
    + velocityBonus(recentLikes, recentComments);
  return Math.min(SCORE_CAP, raw);
}

// The fixed constant the CLIENT writes at post creation — exactly
// freshness(0), Rules-validated (firestore.rules requires
// request.resource.data.feedScore == 100 on create). Exported so both the
// client-facing Rules comment and any test asserting this constant derive
// from the same single source of truth rather than a duplicated magic
// number.
export const INITIAL_FEED_SCORE = freshness(0);

// Recompute horizon (Section P/V): 40h momentum window + 168h decay tail +
// a 1-day buffer past the point the floor is reached = 9 days total. Posts
// older than this never change score again, so the scheduled function's own
// candidate query (feedScoreFrozen == false) can permanently exclude them
// instead of re-touching every post ever created on every run.
export const RECOMPUTE_HORIZON_MS = 9 * 24 * 60 * 60 * 1000;

// Firestore's own hard limit on write operations per batch — same bound
// already used by deleteAllDocsInBatches in index.ts.
const FEED_SCORE_BATCH_SIZE = 500;

export interface RecomputeResult {
  updatedCount: number;
  frozenCount: number;
}

// The actual batch job — a plain, Firestore-parametrized async function
// (not the onSchedule wrapper itself) so a test can call it directly
// against an emulator-connected Admin SDK Firestore instance, with an
// injectable `now`, without needing to trigger Cloud Scheduler at all.
// Idempotent: re-running it before the next real interval simply
// recomputes the same posts again with a (very slightly) later `now`,
// never double-applies anything, since every write is a full overwrite of
// the three feedScore* fields, never an increment.
export async function recomputeFeedScoresBatch(
  firestore: Firestore,
  now: Date = new Date(),
): Promise<RecomputeResult> {
  let updatedCount = 0;
  let frozenCount = 0;
  let lastDocId: string | undefined;

  for (;;) {
    let q = firestore
      .collection('posts')
      .where('status', '==', 'active')
      .where('feedScoreFrozen', '==', false)
      .orderBy('__name__')
      .limit(FEED_SCORE_BATCH_SIZE);
    if (lastDocId) q = q.startAfter(lastDocId);

    const snap = await q.get();
    if (snap.empty) break;

    const velocityCutoff = new Date(now.getTime() - VELOCITY_WINDOW_MS);

    const computed = await Promise.all(snap.docs.map(async doc => {
      const data = doc.data();
      const createdAt = data.createdAt as AdminTimestamp | undefined;
      // Defensive: a malformed/legacy doc missing createdAt must never
      // crash the whole batch — skip it, leave its feedScore untouched.
      if (!createdAt) return null;

      const ageMs = now.getTime() - createdAt.toMillis();
      const ageHours = Math.max(0, ageMs / (60 * 60 * 1000));
      const likesCount = (data.likesCount as number | undefined) ?? 0;
      const commentsCount = (data.commentsCount as number | undefined) ?? 0;

      const [likesRecentSnap, commentsRecentSnap] = await Promise.all([
        doc.ref.collection('likes').where('createdAt', '>', velocityCutoff).count().get(),
        doc.ref.collection('comments').where('createdAt', '>', velocityCutoff).count().get(),
      ]);
      const recentLikes = likesRecentSnap.data().count;
      const recentComments = commentsRecentSnap.data().count;

      const score = computeFeedScore(ageHours, likesCount, commentsCount, recentLikes, recentComments);
      const frozen = ageMs >= RECOMPUTE_HORIZON_MS;
      return { ref: doc.ref, score, frozen };
    }));

    const batch = firestore.batch();
    for (const item of computed) {
      if (!item) continue;
      batch.update(item.ref, {
        feedScore: item.score,
        feedScoreComputedAt: FieldValue.serverTimestamp(),
        feedScoreFrozen: item.frozen,
      });
      updatedCount++;
      if (item.frozen) frozenCount++;
    }
    await batch.commit();

    lastDocId = snap.docs[snap.docs.length - 1].id;
    if (snap.docs.length < FEED_SCORE_BATCH_SIZE) break;
  }

  return { updatedCount, frozenCount };
}
