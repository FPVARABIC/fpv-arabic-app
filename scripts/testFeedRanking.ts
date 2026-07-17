/**
 * Pure unit tests for the Community feed ranking formula (Phase 2,
 * functions/src/feedRanking.ts) — no emulator, no Firestore, no network.
 * Every value below is checked against the exact, hand-verified reference
 * table from the approved Phase 1 proposal (corrected Section G) so a
 * future edit to the formula can't silently drift from what was actually
 * approved.
 *
 * Run with: npx tsx scripts/testFeedRanking.ts
 */
import assert from 'node:assert/strict';
import {
  freshness, decayMultiplier, engagementScore, velocityBonus, computeFeedScore,
  INITIAL_FEED_SCORE, MOMENTUM_WINDOW_HOURS, RECOMPUTE_HORIZON_MS, VELOCITY_WINDOW_MS,
} from '../functions/src/feedRanking';

let passCount = 0;
let failCount = 0;

function assertClose(label: string, actual: number, expected: number, tolerance = 0.01) {
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    console.log(`  PASS  ${label} (= ${actual.toFixed(4)}, expected ${expected.toFixed(4)})`);
    passCount++;
  } else {
    console.log(`  FAIL  ${label} — actual=${actual}, expected=${expected} (diff=${diff})`);
    failCount++;
  }
}

function assertValue<T>(label: string, actual: T, expected: T) {
  try {
    assert.deepStrictEqual(actual, expected);
    console.log(`  PASS  ${label} (= ${JSON.stringify(actual)})`);
    passCount++;
  } catch {
    console.log(`  FAIL  ${label} — actual=${JSON.stringify(actual)}, expected=${JSON.stringify(expected)}`);
    failCount++;
  }
}

console.log('\n=== 1. Section G — freshness(ageHours), reference table (corrected) ===');
assertClose('G0 freshness(0) == 100.0%', freshness(0), 100.0);
assertClose('G2 freshness(2) == 92.6% (hand-verified: 0.95^1.5)', freshness(2), 92.59, 0.05);
assertClose('G10 freshness(10) == 65.0%', freshness(10), 64.95, 0.05);
assertClose('G20 freshness(20) == 35.4% (already past half-gone by the halfway point)', freshness(20), 35.36, 0.05);
assertClose('G30 freshness(30) == 12.5%', freshness(30), 12.5, 0.05);
assertClose('G35 freshness(35) == 4.42%', freshness(35), 4.42, 0.05);
assertClose('G38 freshness(38) == 1.12% (the corrected value — NOT the original report\'s wrong "~5%")', freshness(38), 1.118, 0.02);
assertClose('G39 freshness(39) == 0.40%', freshness(39), 0.395, 0.02);
assertValue('G40 freshness(40) == exactly 0', freshness(40), 0);
assertValue('G41 freshness beyond the window stays exactly 0 (never negative)', freshness(41), 0);
assertValue('G-const MOMENTUM_WINDOW_HOURS == 40', MOMENTUM_WINDOW_HOURS, 40);

console.log('\n=== 2. Section H — decayMultiplier(ageHours) ===');
assertValue('H1 full strength (1.0) at ageHours=0', decayMultiplier(0), 1.0);
assertValue('H2 full strength (1.0) still at exactly the 40h boundary', decayMultiplier(40), 1.0);
assertClose('H3 partway through the 168h tail (ageHours=124, i.e. 40+84) is roughly halfway decayed', decayMultiplier(124), 1.0 - 0.85 * 0.5, 0.01);
assertClose('H4 at the end of the tail (ageHours=208, i.e. 40+168) reaches exactly the 0.15 floor', decayMultiplier(208), 0.15, 0.001);
assertValue('H5 far beyond the tail (ageHours=1000) stays clamped at the 0.15 floor, never below', decayMultiplier(1000), 0.15);

console.log('\n=== 3. Section I — engagementScore(likes, comments): sqrt-dampened, comment-weighted ===');
assertValue('I1 zero engagement -> zero score', engagementScore(0, 0), 0);
assertClose('I2 100 likes alone', engagementScore(100, 0), 6 * 10, 0.01);
assertClose('I3 a single comment is worth roughly 3x a single like (18 vs 6, both sqrt(1))', engagementScore(0, 1) / engagementScore(1, 0), 3.0, 0.01);
assertValue('I4-anti-gaming a 200-fake-like brigade scores FAR below 200x a single real like (sqrt dampening)', engagementScore(200, 0) < engagementScore(1, 0) * 200, true);
assertClose('I5-anti-gaming exact brigade check: 200 likes = 6*sqrt(200), not 6*200', engagementScore(200, 0), 6 * Math.sqrt(200), 0.01);
assertValue('I6 more likes always score at least as much (monotonic, never decreases)', engagementScore(50, 0) < engagementScore(51, 0), true);

console.log('\n=== 4. Section J — velocityBonus(recentLikes, recentComments): capped, hard 2h window ===');
assertValue('J1 zero recent activity -> zero bonus', velocityBonus(0, 0), 0);
assertClose('J2 formula check: 10 recent likes only', velocityBonus(10, 0), Math.min(150, 12 * Math.sqrt(10)), 0.01);
assertValue('J3-cap an enormous recent spike is capped at VELOCITY_CAP=150, never unbounded', velocityBonus(100000, 100000), 150);
assertValue('J-const VELOCITY_WINDOW_MS == 2 hours in ms', VELOCITY_WINDOW_MS, 2 * 60 * 60 * 1000);

console.log('\n=== 5. Section F — computeFeedScore: the combined, capped formula ===');
assertValue('F1 a brand-new post with zero engagement/velocity scores exactly freshness(0)=100', computeFeedScore(0, 0, 0, 0, 0), 100);
assertValue('F2-const INITIAL_FEED_SCORE (what the client writes at creation) == exactly freshness(0)', INITIAL_FEED_SCORE, 100);
assertValue('F3 score never exceeds the 1000 cap even for an absurd combination of every term maxed', computeFeedScore(0, 1_000_000, 1_000_000, 1_000_000, 1_000_000) <= 1000, true);
assertValue('F4 a fresh post already beats a fully-aged, moderately-engaged old post (Section K\'s passive guarantee)', computeFeedScore(0, 0, 0, 0, 0) > computeFeedScore(300, 50, 5, 0, 0), true);
assertValue('F5 score is never negative for any non-negative inputs', computeFeedScore(500, 0, 0, 0, 0) >= 0, true);

console.log('\n=== 6. Section V — recompute horizon constant ===');
assertValue('V1 RECOMPUTE_HORIZON_MS == 9 days exactly', RECOMPUTE_HORIZON_MS, 9 * 24 * 60 * 60 * 1000);
assertValue('V2 a post right at the horizon boundary would score at (or extremely near) the permanent floor', computeFeedScore(RECOMPUTE_HORIZON_MS / (60 * 60 * 1000), 100, 10, 0, 0) < computeFeedScore(41, 100, 10, 0, 0), true);

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===`);
process.exit(failCount > 0 ? 1 : 0);
