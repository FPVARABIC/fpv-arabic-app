import type {
  CategoryDecision, ProposedBuild, SelectionSource,
} from '@core/data/assembly/recommendation/types';
import type { BasePart } from '@core/data/assembly/types';
import { REQUIRED_BUILD_CATEGORIES } from '@core/data/assembly/recommendation/eligibility';
import {
  OPTIONAL_CATEGORIES, RECOMMENDED_CATEGORIES, summarisePrices, type PriceSummary,
} from '@/lib/build/bomPricing';

/**
 * WHEN «اختيار القطع» IS ACTUALLY FINISHED — AND WHAT FINISHED MEANS
 * ==================================================================
 *
 * Phase 2 had no end. A reader resolved every tie, looked at eight settled
 * cards, and the journey simply stopped: no list to take to a shop, no total,
 * no statement of what was still unknown, and nothing saying the phase was
 * over. The only control at the bottom was «رجوع».
 *
 * This is the model behind that ending. It decides two things and computes
 * nothing else: MAY the review open, and WHAT does it say.
 *
 * THE LINE THIS FILE EXISTS TO HOLD
 * ---------------------------------
 * «اختيار القطع مكتمل» is a claim about PARTS. It is not a claim about
 * safety, and the distance between those two is the whole reason the manual
 * checks survive into this screen instead of being cleared by reaching it.
 *
 * So the eligibility rule deliberately does NOT require `manualChecks` to be
 * empty. A reader whose eight categories are resolved has finished choosing
 * parts; `current-headroom` is still open and will still be open when they
 * start assembling, because no catalogue can close it. Gating the review on it
 * would mean the phase could never end — and worse, it would teach that
 * reaching the end screen is what clears a safety check.
 */

/** Why the review cannot open yet — each one is something the reader can fix. */
export type ReviewBlockReason =
  /** The engine found no complete blocker-free assignment at all. */
  | { kind: 'no-proven-path' }
  /** Categories still waiting on the reader's choice. Named, so they can act. */
  | { kind: 'open-choices'; categories: readonly string[] }
  /** Required categories the catalogue cannot fill under these answers. */
  | { kind: 'unavailable'; categories: readonly string[] }
  /** A required category resolved to nothing at all. */
  | { kind: 'unresolved'; categories: readonly string[] }
  /** The verdict engine raised blockers while searching. */
  | { kind: 'blockers'; findingIds: readonly string[] }
  /** Malformed selection input — the build failed closed. */
  | { kind: 'selection-issues' };

export type ReviewEligibility =
  | { open: true }
  | { open: false; reasons: readonly ReviewBlockReason[] };

/**
 * MAY THE READER SEE THE FINAL REVIEW?
 *
 * Derived from the engine's own output, never from a screen count or a
 * «steps completed» tally — those drift the moment the journey changes shape.
 *
 * Every condition below is about PARTS being settled:
 *
 *   · a proven path exists — the engine found a complete assignment that the
 *     shared verdict engine passed with zero blockers;
 *   · all eight required categories resolved to a real part;
 *   · none is still `choice-required` — a tie is an unanswered question, and
 *     a review of a build with an open question is a review of nothing;
 *   · none is `unavailable`;
 *   · no blocker finding ids;
 *   · no malformed selection input.
 *
 * MANUAL CHECKS ARE NOT IN THAT LIST, ON PURPOSE. See the file header.
 */
export function reviewEligibility(build: ProposedBuild | null): ReviewEligibility {
  if (build === null) return { open: false, reasons: [{ kind: 'no-proven-path' }] };

  const reasons: ReviewBlockReason[] = [];
  if (build.provenPath === null) reasons.push({ kind: 'no-proven-path' });
  if (build.selectionIssues.length > 0) reasons.push({ kind: 'selection-issues' });
  if (build.blockerFindingIds.length > 0) {
    reasons.push({ kind: 'blockers', findingIds: build.blockerFindingIds });
  }

  const byCategory = new Map(build.decisions.map(d => [d.category, d]));
  const open: string[] = [];
  const unavailable: string[] = [];
  const unresolved: string[] = [];
  for (const category of REQUIRED_BUILD_CATEGORIES) {
    const d = byCategory.get(category);
    if (!d) { unresolved.push(category); continue; }
    if (d.status === 'choice-required') { open.push(category); continue; }
    if (d.status === 'unavailable') { unavailable.push(category); continue; }
    // Resolved means a real part, not merely a status that sounds settled.
    if (!d.partId || !build.parts[category]) unresolved.push(category);
  }
  if (open.length > 0) reasons.push({ kind: 'open-choices', categories: open });
  if (unavailable.length > 0) reasons.push({ kind: 'unavailable', categories: unavailable });
  if (unresolved.length > 0) reasons.push({ kind: 'unresolved', categories: unresolved });

  return reasons.length === 0 ? { open: true } : { open: false, reasons };
}

/**
 * WHO CHOSE THIS PART — the same four answers the domain gives, unflattened.
 *
 * A straight pass-through of `CategoryDecision.selectionSource`, with the
 * status kept beside it because «the system picked this from several» and
 * «this was the only one that fits» are different sentences and the reader
 * deserves whichever is true. Nothing is re-derived: a review that recomputed
 * provenance could disagree with the card the reader just came from.
 */
export interface ReviewLine {
  category: string;
  part: BasePart;
  /** The engine's own word for who decided. */
  source: SelectionSource;
  /** `recommended` and `only-compatible` are both `system` but read differently. */
  status: CategoryDecision['status'];
}

/** A tier the reader has NOT bought into — named, never auto-added. */
export interface ExtraCategory {
  category: string;
  /** How many the catalogue stocks, so «none chosen» is not «none exist». */
  stocked: number;
}

export interface ReviewView {
  /** The eight, in the engine's own build order. Exactly one line each. */
  lines: readonly ReviewLine[];
  /** Documented USD only, over the eight lines above and nothing else. */
  price: PriceSummary;
  /** Still open. Reaching this screen does not close them. */
  manualChecks: readonly string[];
  /** «موصى بها قبل التجميع» — a capacitor, a buzzer, tools. */
  recommendedExtras: readonly ExtraCategory[];
  /** «اختياري» — a GPS. Separate from the tier above, and never required. */
  optionalExtras: readonly ExtraCategory[];
  /** Shared-rule outcomes actually evaluated for the chosen parts. */
  compatibility: { pass: number; violated: number; unknown: number };
}

/**
 * The review's data, assembled from the engine's answer and nothing else.
 *
 * `stockedIn` is injected rather than imported so this module stays pure and a
 * test can hand it a catalogue with a category emptied — the case where «no
 * capacitor chosen» must not be allowed to read as «no capacitor exists».
 *
 * Call only when `reviewEligibility(build).open` is true. The types assume the
 * eight lines resolve, because eligibility has already proven they do.
 */
export function reviewView(
  build: ProposedBuild,
  stockedIn: (category: string) => number,
): ReviewView {
  const byCategory = new Map(build.decisions.map(d => [d.category, d]));

  const lines: ReviewLine[] = [];
  for (const category of REQUIRED_BUILD_CATEGORIES) {
    const d = byCategory.get(category);
    const part = build.parts[category];
    // Eligibility guarantees both. Skipping rather than inventing a placeholder
    // keeps a broken caller visibly short of eight rather than quietly wrong.
    if (!d || !part) continue;
    lines.push({ category, part, source: d.selectionSource, status: d.status });
  }

  /*
   * PRICED OVER THE EIGHT, AND NOTHING ELSE.
   *
   * The list handed to `summarisePrices` is exactly the required lines, so a
   * recommended accessory cannot reach the total by being adjacent to it. The
   * reader has not chosen one; adding its price would be inventing a purchase.
   */
  const price = summarisePrices(lines.map(l => l.part));

  const compatibility = { pass: 0, violated: 0, unknown: 0 };
  for (const l of lines) {
    for (const ev of byCategory.get(l.category)?.compatibility ?? []) {
      compatibility[ev.status] += 1;
    }
  }

  const extras = (categories: readonly string[]): ExtraCategory[] =>
    categories.map(category => ({ category, stocked: stockedIn(category) }));

  return {
    lines,
    price,
    // Straight through from the engine. Reaching this screen closes nothing.
    manualChecks: build.manualChecks,
    recommendedExtras: extras(RECOMMENDED_CATEGORIES),
    optionalExtras: extras(OPTIONAL_CATEGORIES),
    compatibility,
  };
}
