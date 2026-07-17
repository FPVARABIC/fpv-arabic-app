/**
 * Pure unit tests for Assembly Stage 2 size <-> frame matching (Phase 3) —
 * src/components/Assembly/utils/frameSizeMatch.ts. No React, no browser,
 * no localStorage: a plain function over real Frame objects from the
 * actual catalog, so the exact tolerance behavior is verified against real
 * data, not synthetic fixtures alone.
 *
 * Run with: npx tsx scripts/testFrameSizeMatch.ts
 */
import { frameMatchesSize, FRAME_SIZE_TOLERANCE_INCH, getAvailableSizeOptions } from '../src/components/Assembly/utils/frameSizeMatch';
import { frames } from '../src/data/assembly/parts/frames';
import { droneSizeOptions } from '../src/data/assembly/droneSizeOptions';
import type { Frame } from '../src/data/assembly/types';

let passCount = 0;
let failCount = 0;
function record(label: string, ok: boolean, detail?: string) {
  if (ok) { console.log(`  PASS  ${label}`); passCount++; }
  else { console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`); failCount++; }
}

function makeFrame(sizeInch: number): Frame {
  return {
    id: `frame-fixture-${sizeInch}`, tier: 'mid', nameAr: 'fixture', nameEn: 'fixture',
    specs: { sizeInch },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    beginnerNotes: [], safetyNotes: [], buildNotes: [],
  };
}

console.log('\n=== 1. FRAME_SIZE_TOLERANCE_INCH matches the exact value already established in compatibility/validators.ts ===');
{
  record('T1 tolerance is exactly 0.15" (the same value validateFrameMotor already uses)', FRAME_SIZE_TOLERANCE_INCH === 0.15);
}

console.log('\n=== 2. Exact and within-tolerance matches ===');
{
  record('M1 an exact match (5 vs 5) is compatible', frameMatchesSize(makeFrame(5), 5));
  record('M2 a real 5.1" frame matches a nominal "5 إنش" selection (within 0.15 tolerance)', frameMatchesSize(makeFrame(5.1), 5));
  // 5.15/4.85 deliberately avoided here: floating-point subtraction lands
  // at 0.15000000000000036 (not exactly 0.15), an inherent binary-float
  // representation quirk of the boundary value itself, not a real
  // precision case any actual frame data ever hits — 5.14/4.86 tests the
  // same "just inside tolerance" behavior without that ambiguity.
  record('M3 just inside the tolerance boundary (5.14 vs 5) is still compatible', frameMatchesSize(makeFrame(5.14), 5));
  record('M4 the boundary is symmetric (4.86 vs 5) is still compatible', frameMatchesSize(makeFrame(4.86), 5));
}

console.log('\n=== 3. Out-of-tolerance mismatches ===');
{
  record('X1 a 5.5" frame does NOT match a nominal "5 إنش" selection (0.5" gap, beyond tolerance)', !frameMatchesSize(makeFrame(5.5), 5));
  record('X2 just past the boundary (5.16 vs 5) does NOT match', !frameMatchesSize(makeFrame(5.16), 5));
  record('X3 a 7" frame does not match a "3.5 إنش" selection', !frameMatchesSize(makeFrame(7), 3.5));
  record('X4 a 7" frame does not match a "5 إنش" selection', !frameMatchesSize(makeFrame(7), 5));
}

console.log('\n=== 4. Real catalog data — every currently-buildable size actually has at least one matching frame, and 3.5" currently has none ===');
{
  const matchesFor = (sizeInch: number) => frames.filter(f => frameMatchesSize(f, sizeInch));
  record('R1 "5 إنش" matches at least one real frame (the two 5.1"-tagged freestyle frames plus the exact-5" ones)', matchesFor(5).length > 0);
  record('R2 "7 إنش" matches exactly the one real 7" long-range frame', matchesFor(7).length === 1 && matchesFor(7)[0].id === 'frame-geprc-moz7-v2-premium');
  record('R3 "3.5 إنش" currently matches zero real frames (an honest, real data gap, not a bug — see the empty-state message)', matchesFor(3.5).length === 0);
  record('R4 the two real 5.1" freestyle frames are included in "5 إنش"\'s matches (the exact reason for the tolerance)', ['frame-speedybee-mario5-budget', 'frame-aos5-evo-mid'].every(id => matchesFor(5).some(f => f.id === id)));
}

console.log('\n=== 5. getAvailableSizeOptions — per-drone-type reachable sizes (pre-launch correction), derived from the real catalog ===');
{
  record('A1 long-range: only 7" is reachable', getAvailableSizeOptions('long-range').map(o => o.sizeInch).join(',') === '7');
  record('A2 freestyle: only 5" is reachable (no freestyle frame is within tolerance of 7")', getAvailableSizeOptions('freestyle').map(o => o.sizeInch).join(',') === '5');
  record('A3 cinematic: only 5" is reachable', getAvailableSizeOptions('cinematic').map(o => o.sizeInch).join(',') === '5');
  record('A4 racing: only 5" is reachable', getAvailableSizeOptions('racing').map(o => o.sizeInch).join(',') === '5');
  record('A5 an unknown/nonexistent drone type id reachably returns an empty list, not a crash', getAvailableSizeOptions('not-a-real-type').length === 0);

  // The helper must only ever return a subset of droneSizeOptions (same
  // labels/order), never invent or reorder entries of its own.
  record('A6 every returned option for every real drone type is a genuine droneSizeOptions entry (same object identity)',
    ['long-range', 'freestyle', 'cinematic', 'racing'].every(id => getAvailableSizeOptions(id).every(o => droneSizeOptions.includes(o))));

  // The exact reason each result holds: independently re-derived here from
  // frameMatchesSize + each frame's own compatibilityTags.droneTypes, not
  // copied from the helper's own internals.
  const reachable = (droneTypeId: string) => droneSizeOptions.filter(o => frames.some(f => f.compatibilityTags.droneTypes.includes(droneTypeId) && frameMatchesSize(f, o.sizeInch)));
  record('A7 getAvailableSizeOptions matches an independent re-derivation for every real drone type',
    ['long-range', 'freestyle', 'cinematic', 'racing'].every(id => JSON.stringify(getAvailableSizeOptions(id)) === JSON.stringify(reachable(id))));
}

console.log(`\n=== Results: ${passCount} passed, ${failCount} failed (${passCount + failCount} total) ===\n`);
process.exit(failCount > 0 ? 1 : 0);
