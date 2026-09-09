/**
 * WHICH CATALOGUE PARTS ARE EVEN IN THE RUNNING
 * =============================================
 *
 * Before anything can be recommended, something has to answer «for a build of
 * THIS type, at THIS voltage, at THIS size, which parts may be considered at
 * all?» — and the answer must be the same one the reachability proof uses,
 * because a recommender that considers a wider pool than the proof searched
 * would happily propose a build the proof already knows is impossible.
 *
 * So this rule lives here, below both, and `scripts/testBuildReachability.ts`
 * imports it rather than keeping its own copy.
 *
 * WHY THIS IS NOT THE WIZARD'S RULE
 * ---------------------------------
 * `BuildWizard.candidatesFor` looks similar and is deliberately different: it
 * filters by drone-type tag ONLY, leaving voltage and size to `checkCandidate`
 * as a visible verdict on the card. It has to — advanced mode must still SHOW
 * a part it refuses, with the reason, so the reader can override it on purpose.
 *
 * That is a DISPLAY rule. This is a SEARCH rule: a pool to walk, where an
 * ineligible part is not a card to render but a branch not worth taking. They
 * were never the same rule and merging them would break the override.
 *
 * WHY «TAGGED, OR ELSE EVERYTHING»
 * --------------------------------
 * `droneTypes` is a curation tag, not a physical fact. A category where NO
 * part carries the tag (batteries are tagged for all four types; some
 * categories are not type-specific at all) must not become an empty pool and
 * strand the build — so an untagged category falls back to its whole list.
 * Where SOME parts carry the tag, the tagged ones are the pool: that is the
 * catalogue's own statement about what belongs in this kind of build.
 */

import type { BasePart, Frame } from '../types';
import { frameMatchesSize } from '../frameSizeMatch';

/** The eight categories a build must fill before the report can be reached. */
export const REQUIRED_BUILD_CATEGORIES = [
  'frames', 'motors', 'propellers', 'escs',
  'flightControllers', 'receivers', 'videoUnits', 'batteries',
] as const;

export type RequiredBuildCategory = typeof REQUIRED_BUILD_CATEGORIES[number];

/**
 * The parts eligible for one category of one build.
 *
 * Order is the catalogue's own — every consumer here is deterministic, and a
 * pool that reordered itself would make a search's «first valid combination»
 * depend on nothing a reader could see.
 */
export function eligibleCandidates(
  category: string,
  all: readonly BasePart[],
  opts: { droneTypeId: string; cellCount: number; sizeInch: number },
): readonly BasePart[] {
  const tagged = all.filter(p => p.compatibilityTags.droneTypes.includes(opts.droneTypeId));
  let pool = tagged.length > 0 ? tagged : all;
  pool = pool.filter(p => p.compatibilityTags.batteryVoltages.includes(opts.cellCount));
  if (category === 'frames') {
    pool = pool.filter(f => frameMatchesSize(f as Frame, opts.sizeInch));
  }
  return pool;
}
