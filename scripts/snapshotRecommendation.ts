/**
 * FREEZE WHAT `proposeBuild` RETURNS, SO A LATER PHASE CANNOT MOVE IT QUIETLY
 * ==========================================================================
 *
 * `scripts/fixtures/proposeBuild.pre2d.json` was written ONCE, from canonical,
 * before Phase 2D's reader-selection work existed. The commit it came from is
 * recorded inside it, and `scripts/testReaderSelection.ts` compares every case
 * against it field for field.
 *
 * WHY THIS SCRIPT REFUSES TO OVERWRITE IT
 * ---------------------------------------
 * Regenerating the snapshot from the current engine would make that comparison
 * a tautology — «the engine agrees with the engine» — and it would do so
 * silently, on a green run, which is the worst possible way for a guarantee to
 * disappear. A baseline that can be regenerated from the thing it is a
 * baseline for is not a baseline. Pass `--force` only if you mean to establish
 * a NEW baseline and have said so out loud.
 *
 * The inputs file beside it is safe to rewrite: it is the questions, not the
 * answers, and the test needs it to ask them again.
 *
 * Run: npx tsx scripts/snapshotRecommendation.ts [--force]
 */
import { writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { proposeBuild } from '../src/data/assembly/recommendation/proposeBuild';
import type { RecommendationInput } from '../src/data/assembly/recommendation/types';
import { PART_CATEGORY_MAP } from '../src/data/project/store';

const pick = (cat: string, i = 0) => PART_CATEGORY_MAP[cat][i];
const rx = (protocol: string) => PART_CATEGORY_MAP.receivers
  .find(r => (r as unknown as { specs: { protocol: string } }).specs.protocol === protocol)!;

/**
 * A spread of readers, not a spread of code paths: every drone type the
 * catalogue stocks, every budget answer including none, both radio
 * ecosystems, two goggle ecosystems, and owned hardware on its own and in
 * combination — plus the three ways a build can fail to exist at all.
 */
const CASES: [string, Record<string, unknown>][] = [
  ['freestyle-6S-mid', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: {} }],
  ['freestyle-6S-budget', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'budget', owned: {} }],
  ['freestyle-6S-premium', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'premium', owned: {} }],
  ['freestyle-6S-nopref', { droneTypeId: 'freestyle', cellCount: 6, owned: {} }],
  ['freestyle-4S-mid', { droneTypeId: 'freestyle', cellCount: 4, budgetTier: 'mid', owned: {} }],
  ['freestyle-4S-nopref', { droneTypeId: 'freestyle', cellCount: 4, owned: {} }],
  ['freestyle-noVoltage-mid', { droneTypeId: 'freestyle', budgetTier: 'mid', owned: {} }],
  ['cinematic-6S-mid', { droneTypeId: 'cinematic', cellCount: 6, budgetTier: 'mid', owned: {} }],
  ['cinematic-6S-nopref', { droneTypeId: 'cinematic', cellCount: 6, owned: {} }],
  ['cinematic-4S-budget', { droneTypeId: 'cinematic', cellCount: 4, budgetTier: 'budget', owned: {} }],
  ['longrange-mid', { droneTypeId: 'long-range', budgetTier: 'mid', owned: {} }],
  ['longrange-nopref', { droneTypeId: 'long-range', owned: {} }],
  ['longrange-premium', { droneTypeId: 'long-range', budgetTier: 'premium', owned: {} }],
  ['cinewhoop-mid', { droneTypeId: 'cinewhoop', cellCount: 4, budgetTier: 'mid', owned: {} }],
  ['racing-mid', { droneTypeId: 'racing', cellCount: 6, budgetTier: 'mid', owned: {} }],
  ['unknown-type', { droneTypeId: 'no-such-type', owned: {} }],
  ['freestyle-6S-mid-elrs', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { rcSystem: 'ExpressLRS' } }],
  ['freestyle-6S-mid-crossfire', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { rcSystem: 'Crossfire' } }],
  ['freestyle-6S-mid-dji', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { videoSystem: 'DJI' } }],
  ['freestyle-6S-mid-walksnail', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { videoSystem: 'Walksnail' } }],
  ['freestyle-6S-nopref-dji-elrs', { droneTypeId: 'freestyle', cellCount: 6, owned: { videoSystem: 'DJI', rcSystem: 'ExpressLRS' } }],
  ['longrange-mid-elrs', { droneTypeId: 'long-range', budgetTier: 'mid', owned: { rcSystem: 'ExpressLRS' } }],
  ['freestyle-6S-mid-ownedFrame', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { parts: { frames: pick('frames') } } }],
  ['freestyle-6S-mid-ownedMotors', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { parts: { motors: pick('motors') } } }],
  ['freestyle-6S-mid-ownedFrameMotors', { droneTypeId: 'freestyle', cellCount: 6, budgetTier: 'mid', owned: { parts: { frames: pick('frames'), motors: pick('motors') } } }],
  ['freestyle-6S-nopref-ownedReceiver-elrs', { droneTypeId: 'freestyle', cellCount: 6, owned: { rcSystem: 'ExpressLRS', parts: { receivers: rx('ExpressLRS') } } }],
  ['freestyle-6S-nopref-ownedReceiver-conflict', { droneTypeId: 'freestyle', cellCount: 6, owned: { rcSystem: 'ExpressLRS', parts: { receivers: rx('Crossfire') } } }],
];

const SNAPSHOT = 'scripts/fixtures/proposeBuild.pre2d.json';
const INPUTS = 'scripts/fixtures/proposeBuild.pre2d.inputs.json';
const force = process.argv.includes('--force');

writeFileSync(INPUTS, `${JSON.stringify(Object.fromEntries(CASES), null, 1)}\n`);
console.log(`inputs → ${INPUTS} (${CASES.length} cases)`);

if (existsSync(SNAPSHOT) && !force) {
  console.log(`snapshot ← ${SNAPSHOT} LEFT ALONE.`);
  console.log('  It is the pre-Phase-2D baseline. Regenerating it from the current');
  console.log('  engine would make the compatibility test compare the engine to');
  console.log('  itself. Pass --force only to establish a deliberate new baseline.');
  process.exit(0);
}

const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
writeFileSync(SNAPSHOT, `${JSON.stringify({
  __: 'BASELINE — written once, from the commit below. Never regenerate it from a later '
    + 'engine: that turns scripts/testReaderSelection.ts section P into a tautology.',
  commit: sha,
  cases: Object.fromEntries(
    CASES.map(([name, input]) => [name, proposeBuild(input as unknown as RecommendationInput)]),
  ),
}, null, 1)}\n`);
console.log(`snapshot → ${SNAPSHOT} at ${sha.slice(0, 7)}`);
