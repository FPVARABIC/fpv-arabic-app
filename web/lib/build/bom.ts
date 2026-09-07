/**
 * The bill of materials — what a finished parts list actually says.
 *
 * WHAT IS REQUIRED AND WHAT IS RECOMMENDED
 * ----------------------------------------
 * Required mirrors the shared core's own definition: `MANDATORY_PART_
 * CATEGORIES` in the phone's BuildFlow is «every part-backed stage except
 * GPS». The web adds no category of its own and removes none — it only
 * PARTITIONS the optional set, because a capacitor and a buzzer are not
 * optional in the same sense a GPS is: the catalogue's own safety notes push
 * both. That editorial distinction («موصى بها» vs «اختيارية») lives here, in
 * data, where the test can see it.
 *
 * PRICES ARE RANGES OR ABSENT — NEVER A NUMBER WE MADE UP
 * -------------------------------------------------------
 * `priceRangeUSD` is documented per part or missing. The BOM sums the
 * documented ranges and COUNTS the gaps, and its total says both: a range,
 * and how many parts are outside it.
 */

import { PART_CATEGORY_MAP } from '@core/data/project/store';
import type { BasePart } from '@core/data/assembly/types';
import type { BuildDraft } from './draft';
import { draftParts } from './draft';

export const REQUIRED_CATEGORIES: readonly string[] = [
  'frames', 'motors', 'propellers', 'escs', 'flightControllers',
  'receivers', 'videoUnits', 'batteries',
];

export const RECOMMENDED_CATEGORIES: readonly string[] = ['capacitors', 'buzzers', 'tools'];

export const OPTIONAL_CATEGORIES: readonly string[] = ['gps'];

export type BomStatus = 'chosen' | 'external' | 'missing-required' | 'missing-recommended' | 'skipped-optional';

export interface BomLine {
  category: string;
  status: BomStatus;
  part?: BasePart;
  externalName?: string;
}

export interface BomSummary {
  lines: BomLine[];
  /** Sum of documented price ranges, USD. */
  priceMinUSD: number;
  priceMaxUSD: number;
  /** Chosen parts with no documented price — counted, never guessed. */
  unpricedCount: number;
  missingRequiredCount: number;
}

export function computeBom(draft: BuildDraft): BomSummary {
  const parts = draftParts(draft);
  const lines: BomLine[] = [];
  let priceMinUSD = 0;
  let priceMaxUSD = 0;
  let unpricedCount = 0;
  let missingRequiredCount = 0;

  const push = (category: string, requiredness: BomStatus) => {
    const part = parts[category];
    const externalName = draft.externalParts[category];
    if (part) {
      lines.push({ category, status: 'chosen', part });
      if (part.priceRangeUSD) {
        priceMinUSD += part.priceRangeUSD[0];
        priceMaxUSD += part.priceRangeUSD[1];
      } else {
        unpricedCount++;
      }
      return;
    }
    if (externalName) {
      lines.push({ category, status: 'external', externalName });
      return;
    }
    lines.push({ category, status: requiredness });
    if (requiredness === 'missing-required') missingRequiredCount++;
  };

  for (const c of REQUIRED_CATEGORIES) push(c, 'missing-required');
  for (const c of RECOMMENDED_CATEGORIES) push(c, 'missing-recommended');
  for (const c of OPTIONAL_CATEGORIES) push(c, 'skipped-optional');

  // Sanity: the three lists must cover the catalogue exactly — a category
  // added to the shared core without a BOM home is a silent gap.
  const covered = new Set([...REQUIRED_CATEGORIES, ...RECOMMENDED_CATEGORIES, ...OPTIONAL_CATEGORIES]);
  for (const category of Object.keys(PART_CATEGORY_MAP)) {
    if (!covered.has(category)) {
      lines.push({ category, status: parts[category] ? 'chosen' : 'skipped-optional', part: parts[category] });
    }
  }

  return { lines, priceMinUSD, priceMaxUSD, unpricedCount, missingRequiredCount };
}
