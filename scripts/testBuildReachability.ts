/**
 * CAN EVERY BUILD TYPE THE SECTION OFFERS ACTUALLY BE FINISHED?
 * ============================================================
 *
 * `/build/wizard` presented five drone types as equal choices. Two of them
 * could not be completed with the catalogue as it stands, and neither said so:
 *
 *   · «Cinewhoop» — no frame carries the tag, so the size step derived no
 *     options at all. It rendered an EMPTY container with «التالي» disabled
 *     forever, under an intro reading «لا حجم يقود إلى طريق مسدود».
 *   · «سباقات» — every valid combination raises a `stack-mount` blocker, and
 *     the wizard opens step 12 only when `blockers === 0`. The reader spent
 *     ten steps and twelve part choices to reach a locked door whose advice —
 *     «عد إلى الخطوات السابقة وبدّل القطعة المعنيّة» — the catalogue makes
 *     impossible to follow.
 *
 * Both shipped because nothing checked. Structure was asserted, order was
 * asserted, gates were asserted; REACHABILITY was not, and reachability is the
 * one property that depends on the catalogue rather than the code.
 *
 * WHAT THIS SUITE ASSERTS
 * -----------------------
 * That `web/lib/build/availability.ts` — the declaration the entry screen
 * renders — matches what the real catalogue and the real verdict engine say,
 * IN BOTH DIRECTIONS:
 *
 *   1. every type declared AVAILABLE has at least one complete combination
 *      that reaches the compatibility report with zero blockers;
 *   2. every type declared UNAVAILABLE genuinely has none;
 *   3. every type in `droneTypes` is declared at all.
 *
 * Direction 2 is the one that earns its keep over time. Without it, adding a
 * 30.5 racing frame would fix the catalogue and leave «قريبًا» sitting on a
 * type that works — a stale apology nobody would notice. With it, the build
 * fails and names the type to turn back on.
 *
 * NOTHING HERE IS HARD-CODED
 * --------------------------
 * There is no list of "types that fail" in this file. The verdict is derived,
 * every time, from `droneTypes`, the part catalogue, `getAvailableSizeOptions`
 * and `computeFindings`. If the catalogue changes, the answer changes with it.
 *
 * WHY THE SEARCH MODELS THE GUIDED DOOR
 * -------------------------------------
 * A path only counts if a reader could really walk it, so the candidate pools
 * mirror the wizard's own `candidatesFor`: parts tagged for the type, falling
 * back to the whole category when nothing is tagged. They are then narrowed by
 * the two rules the part cards enforce as HARD refusals in the guided modes —
 * battery-voltage tagging, and `frameMatchesSize` for frames. Those filters are
 * a superset of the card layer's blocking rules for the categories that have
 * them, so a zero-blocker combination found here is one the picker would
 * genuinely have allowed; it is never a path that only a test can walk.
 *
 * Run: npx tsx --tsconfig web/tsconfig.json scripts/testBuildReachability.ts
 */

import assert from 'node:assert/strict';
import type { BasePart, Frame } from '../src/data/assembly/types';
import type { ProjectSnapshot } from '../src/data/project/types';

const { droneTypes } = await import('../src/data/assembly/droneTypes');
const { getAvailableSizeOptions, frameMatchesSize } =
  await import('../src/data/assembly/frameSizeMatch');
const { batteryVoltageOptions } = await import('../src/data/assembly/batteryVoltageOptions');
const { buildStages } = await import('../src/data/assembly/buildStages');
const { PART_CATEGORY_MAP } = await import('../src/data/project/store');
const { computeFindings } = await import('../src/data/project/verdicts');
const { BUILD_TYPE_AVAILABILITY } = await import('../web/lib/build/availability');

let passed = 0;
function ok(label: string, cond: boolean) {
  assert.ok(cond, `FAILED: ${label}`);
  console.log(`  ok — ${label}`);
  passed++;
}

/** The eight categories a build must fill before the report can be reached. */
const REQUIRED = [
  'frames', 'motors', 'propellers', 'escs',
  'flightControllers', 'receivers', 'videoUnits', 'batteries',
] as const;

/** The wizard's own rule: tagged for this type, or the whole category if none is. */
function candidatePool(category: string, droneTypeId: string, sCount: number, sizeInch: number) {
  const all = PART_CATEGORY_MAP[category] ?? [];
  const tagged = all.filter(p => p.compatibilityTags.droneTypes.includes(droneTypeId));
  let pool = tagged.length > 0 ? tagged : all;
  pool = pool.filter(p => p.compatibilityTags.batteryVoltages.includes(sCount));
  if (category === 'frames') pool = pool.filter(f => frameMatchesSize(f as Frame, sizeInch));
  return pool;
}

interface Attempt {
  combinationsExplored: number;
  validPath: Record<string, string> | null;
  blockerIds: Set<string>;
}

/** Exhaustive until the first clean build — that is all «reachable» claims. */
function searchType(droneTypeId: string): Attempt & { sizes: number[] } {
  const sizes = getAvailableSizeOptions(droneTypeId).map(o => o.sizeInch);
  const result: Attempt = { combinationsExplored: 0, validPath: null, blockerIds: new Set() };
  if (sizes.length === 0) return { ...result, sizes };

  for (const sizeInch of sizes) {
    for (const { sCount } of batteryVoltageOptions) {
      const pools = REQUIRED.map(c => candidatePool(c, droneTypeId, sCount, sizeInch));
      if (pools.some(p => p.length === 0)) continue;

      const chosen: BasePart[] = [];
      const walk = (depth: number): boolean => {
        if (result.validPath) return true;
        if (depth === REQUIRED.length) {
          result.combinationsExplored++;
          const parts = Object.fromEntries(
            REQUIRED.map((c, i) => [c, chosen[i]]),
          ) as Record<string, BasePart>;
          const snapshot: ProjectSnapshot = {
            exists: true,
            droneTypeId,
            droneTypeName: droneTypes.find(t => t.id === droneTypeId)?.primaryName,
            sizeInch,
            cellCount: sCount,
            // The report step; the stage the wizard mirrors when it is reached.
            stageIndex: buildStages.length - 1,
            totalStages: buildStages.length,
            frame: parts.frames as ProjectSnapshot['frame'],
            motor: parts.motors as ProjectSnapshot['motor'],
            esc: parts.escs as ProjectSnapshot['esc'],
            flightController: parts.flightControllers as ProjectSnapshot['flightController'],
            battery: parts.batteries as ProjectSnapshot['battery'],
            propeller: parts.propellers as ProjectSnapshot['propeller'],
            receiver: parts.receivers as ProjectSnapshot['receiver'],
            videoUnit: parts.videoUnits as ProjectSnapshot['videoUnit'],
            gps: undefined,
            parts,
          };
          const blockers = computeFindings(snapshot).filter(f => f.severity === 'blocker');
          if (blockers.length === 0) {
            result.validPath = Object.fromEntries(
              REQUIRED.map((c, i) => [c, chosen[i].id]),
            );
            return true;
          }
          for (const b of blockers) result.blockerIds.add(b.id);
          return false;
        }
        for (const part of pools[depth]) {
          chosen[depth] = part;
          if (walk(depth + 1)) return true;
        }
        return false;
      };
      walk(0);
      if (result.validPath) return { ...result, sizes };
    }
  }
  return { ...result, sizes };
}

console.log('\n[1] Reachability, derived from the live catalogue and the live engine\n');

const derived = new Map<string, ReturnType<typeof searchType>>();
for (const type of droneTypes) {
  const r = searchType(type.id);
  derived.set(type.id, r);
  const declared = BUILD_TYPE_AVAILABILITY[type.id];
  console.log(`  ${type.id} — «${type.primaryName}»`);
  console.log(`      sizes offered            : ${r.sizes.length ? r.sizes.join(', ') + '"' : 'NONE'}`);
  console.log(`      combinations explored    : ${r.combinationsExplored}`);
  console.log(`      complete blocker-free    : ${r.validPath ? 'YES' : 'NO'}`);
  if (r.validPath) {
    console.log(`      representative path      : ${Object.values(r.validPath).join('  +  ')}`);
  } else if (r.sizes.length === 0) {
    console.log('      why not                  : no size option — no frame carries this type\'s tag');
  } else {
    console.log(`      blockers seen            : ${[...r.blockerIds].join(', ') || '(no complete combination existed)'}`);
  }
  console.log(`      declared availability    : ${declared ? (declared.available ? 'available' : 'قريبًا') : 'UNDECLARED'}`);
  console.log('');
}

console.log('[2] The entry screen\'s declaration matches derived truth\n');

for (const type of droneTypes) {
  ok(`«${type.primaryName}» (${type.id}) is declared in BUILD_TYPE_AVAILABILITY`,
    BUILD_TYPE_AVAILABILITY[type.id] !== undefined);
}

for (const type of droneTypes) {
  const declared = BUILD_TYPE_AVAILABILITY[type.id];
  const r = derived.get(type.id)!;
  if (!declared) continue;

  if (declared.available) {
    // THE HEADLINE ASSERTION. An enabled type with no complete path is the
    // Racing defect, and it must never reach production again.
    assert.ok(
      r.validPath,
      `FAILED: «${type.primaryName}» (${type.id}) is offered as available but NO complete `
      + `blocker-free build exists — ${r.combinationsExplored} combinations explored, blockers seen: `
      + `${[...r.blockerIds].join(', ') || 'none (no combination could even be assembled)'}. `
      + 'Either add the catalogue parts that close this gap, or mark the type unavailable '
      + 'in web/lib/build/availability.ts with the reason.',
    );
    console.log(`  ok — «${type.primaryName}» is available AND completable`);
    passed++;
  } else {
    // The other direction: a withdrawn type that has quietly become buildable.
    assert.ok(
      !r.validPath,
      `FAILED: «${type.primaryName}» (${type.id}) is marked «قريبًا» but a complete `
      + `blocker-free build now EXISTS (${Object.values(r.validPath ?? {}).join(' + ')}). `
      + 'The catalogue has caught up — set available: true in web/lib/build/availability.ts.',
    );
    ok(`«${type.primaryName}» is «قريبًا» AND genuinely has no complete build`, true);
    ok(`«${type.primaryName}» tells the reader why`,
      !!declared.reasonAr && declared.reasonAr.length > 30);
    ok(`«${type.primaryName}» records the catalogue fact behind the reason`,
      !!declared.evidenceAr);
  }
}

console.log('\n[3] At least one type is available — the section is not entirely closed\n');
ok('at least one drone type is available',
  droneTypes.some(t => BUILD_TYPE_AVAILABILITY[t.id]?.available));
ok('every available type derives at least one size option',
  droneTypes
    .filter(t => BUILD_TYPE_AVAILABILITY[t.id]?.available)
    .every(t => derived.get(t.id)!.sizes.length > 0));

console.log(`\n[reachability] ${passed} assertions passed\n`);
