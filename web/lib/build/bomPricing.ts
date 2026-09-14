import type { BasePart } from '@core/data/assembly/types';

/**
 * WHAT A PARTS LIST COSTS — AND THE HALF OF IT WE CANNOT SAY
 * =========================================================
 *
 * The tiers and the price arithmetic, with NOTHING else attached.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * All of this used to live in `bom.ts`, which is where it belongs
 * conceptually — but `bom.ts` imports `draft.ts` for `BuildDraft`, and
 * `draft.ts` imports `saveAssemblyProject` and `loadAndValidateAssemblyProject`
 * from the project store. So importing the BOM's rules pulled the project
 * WRITER in behind them.
 *
 * BUILD V2 promises no persistence at all, and «we do not call it» is a weaker
 * promise than «it is not in the bundle». V2 needs the tiers and the price
 * arithmetic and nothing else, so those move here, where there is nothing to
 * drag along: this module imports one TYPE and no behaviour.
 *
 * `bom.ts` re-exports the constants and delegates the arithmetic, so V1 keeps
 * importing exactly what it always imported and its output is unchanged —
 * `scripts/testWebBuild.ts` pins that against a characterization.
 *
 * AND V2 DOES NOT GET A `BuildDraft`
 * ----------------------------------
 * `computeBom` takes one, and a draft is a PERSISTENCE AND PROGRESS record: a
 * schema version, a step index, gate confirmations, and `externalParts` — the
 * names a reader typed for hardware the catalogue does not stock. V2 has none
 * of those and must not pretend to. Fabricating a draft to reach an API would
 * manufacture ownership the reader never claimed and progress they never made
 * — the same conflation the domain keeps two separate fields apart to prevent,
 * one layer up.
 *
 * So the shared seam is the smallest honest one: a list of parts in, a summary
 * out.
 *
 * THIS FILE STAYS INSIDE THE V1 ISOLATION SWEEP, DELIBERATELY
 * ----------------------------------------------------------
 * `scripts/testReaderSelection.ts` section AD walks every file in
 * `web/components/build/` and `web/lib/build/` and fails if one has learned
 * anything about V2's reader-selection feature. Being shared is not an
 * exemption from that — it is the reason it matters more here. A V2 concept
 * pushed down into this module would reach V1 through `bom.ts`, which is
 * exactly the leak that guard exists to catch. Prices and tiers only.
 */

/**
 * The eight categories a drone cannot fly without.
 *
 * Mirrors the shared core's `MANDATORY_PART_CATEGORIES` — «every part-backed
 * stage except GPS». `scripts/testWebBuild.ts` asserts it stays identical to
 * the ENGINE's own `REQUIRED_BUILD_CATEGORIES`, in order, so the two cannot
 * drift into disagreeing about what a build needs.
 */
export const REQUIRED_CATEGORIES: readonly string[] = [
  'frames', 'motors', 'propellers', 'escs', 'flightControllers',
  'receivers', 'videoUnits', 'batteries',
];

/**
 * Not required, and not optional in the way a GPS is.
 *
 * The catalogue's own safety notes push a capacitor and a buzzer, so calling
 * them «اختيارية» beside a GPS would flatten a real editorial distinction.
 * They are «موصى بها»: a build without one is a build, a build without a
 * frame is not.
 */
export const RECOMMENDED_CATEGORIES: readonly string[] = ['capacitors', 'buzzers', 'tools'];

/** Genuinely optional. A GPS changes what the drone can do, not whether it flies. */
export const OPTIONAL_CATEGORIES: readonly string[] = ['gps'];

/**
 * A price the catalogue can stand behind, and a count of the parts it cannot.
 *
 * `priceRangeUSD` is documented per part or absent. There is no midpoint, no
 * estimate and no «about»: a range is what the data says, and a part outside
 * it is COUNTED rather than guessed at. A summary that silently dropped the
 * unpriced parts would read as a total while being one.
 */
export interface PriceSummary {
  /** Sum of documented minimums, USD. */
  priceMinUSD: number;
  /** Sum of documented maximums, USD. */
  priceMaxUSD: number;
  /** Parts in this list with NO documented price. Never estimated. */
  unpricedCount: number;
  /** Parts that did contribute — so a caller can tell «0 of 8» from «8 of 8». */
  pricedCount: number;
}

/**
 * Sum what is documented; count what is not.
 *
 * Addition only. No currency conversion, no shipping, no tax, no market
 * inference, no midpoint. Every number this returns is a sum of numbers a
 * human wrote into the catalogue.
 *
 * Whatever list it is handed is exactly what it prices — so a caller that
 * wants only the eight required parts passes eight, and a recommended
 * accessory cannot slip into a total by being nearby.
 */
export function summarisePrices(parts: readonly BasePart[]): PriceSummary {
  let priceMinUSD = 0;
  let priceMaxUSD = 0;
  let unpricedCount = 0;
  let pricedCount = 0;

  for (const part of parts) {
    const range = part.priceRangeUSD;
    if (range) {
      priceMinUSD += range[0];
      priceMaxUSD += range[1];
      pricedCount++;
    } else {
      unpricedCount++;
    }
  }

  return { priceMinUSD, priceMaxUSD, unpricedCount, pricedCount };
}
