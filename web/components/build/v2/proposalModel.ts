import type {
  CategoryDecision, ProposedBuild, RecommendationStatus,
} from '@core/data/assembly/recommendation/types';

/**
 * WHAT THE PROPOSAL SCREEN IS ALLOWED TO SAY — DERIVED, NEVER TYPED
 * ================================================================
 *
 * Phase 2C shows the engine's decisions for the first time. Everything on that
 * screen is a claim about what the system decided and why, so every number and
 * every grouping here comes from `CategoryDecision.status` — nothing is
 * hard-coded, and no count is written into copy.
 *
 * WHY THE GROUPS ARE NOT THE STATUSES
 * -----------------------------------
 * Five statuses, three things a reader has to do about them:
 *
 *   recommended, only-compatible  →  read it, or don't. The system decided.
 *   choice-required               →  YOU decide. This is the actual work.
 *   user-locked                   →  it's yours; nothing to do.
 *   unavailable                   →  something is wrong.
 *
 * An eight-card wall where all eight shout equally is the V1 wizard again. The
 * group that needs the reader gets the room; the group that does not gets a
 * compact row.
 */

export type DecisionGroup = 'needs-you' | 'system-decided' | 'yours' | 'problem';

export const groupOf = (status: RecommendationStatus): DecisionGroup =>
  status === 'choice-required' ? 'needs-you'
    : status === 'user-locked' ? 'yours'
      : status === 'unavailable' ? 'problem'
        : 'system-decided';

export interface DecisionCounts {
  required: number;
  recommended: number;
  onlyCompatible: number;
  choiceRequired: number;
  userLocked: number;
  unavailable: number;
  /** What the system settled on the reader's behalf, by any route. */
  systemDecided: number;
  manualChecks: number;
}

/**
 * HOW STRONG A CLAIM THE HEADLINE MAY MAKE.
 *
 * «هذا البناء المقترح لك» is a real claim, and it is not always true. Answer
 * Freestyle 6S with «لا تفضيل» and the engine recommends NOTHING: the budget
 * tier is its only tiebreaker, so all eight categories come back
 * `choice-required` and the honest headline is that the field is open, not
 * that a build was proposed.
 *
 * Measured, not hypothesised — `scripts/testBuildV2Proposal.ts` prints the
 * decision burden for every representative build.
 */
export type ProposalQuality =
  /** At least one category the system settled. */
  | 'proposed'
  /** A viable build exists, but the system ranked nothing: it is all open. */
  | 'all-open';

export interface ProposalView {
  counts: DecisionCounts;
  quality: ProposalQuality;
  /** Engine order, grouped. A category appears in exactly one group. */
  groups: Readonly<Record<DecisionGroup, readonly CategoryDecision[]>>;
  manualChecks: readonly string[];
  /**
   * A `ready` build containing an unavailable REQUIRED category is a
   * contradiction — the engine proved a complete blocker-free assignment, so
   * no required category can have nothing to offer. The screen refuses to
   * render it as an ordinary card rather than papering over it.
   */
  consistencyError: boolean;
}

export function proposalView(build: ProposedBuild): ProposalView {
  const by = (s: RecommendationStatus) => build.decisions.filter(d => d.status === s);
  const counts: DecisionCounts = {
    required: build.decisions.length,
    recommended: by('recommended').length,
    onlyCompatible: by('only-compatible').length,
    choiceRequired: by('choice-required').length,
    userLocked: by('user-locked').length,
    unavailable: by('unavailable').length,
    systemDecided: by('recommended').length + by('only-compatible').length,
    manualChecks: build.manualChecks.length,
  };

  const groups: Record<DecisionGroup, CategoryDecision[]> = {
    'needs-you': [], 'system-decided': [], yours: [], problem: [],
  };
  for (const d of build.decisions) groups[groupOf(d.status)].push(d);

  return {
    counts,
    quality: counts.systemDecided > 0 ? 'proposed' : 'all-open',
    groups,
    manualChecks: build.manualChecks,
    consistencyError: counts.unavailable > 0,
  };
}

/**
 * THE CANDIDATES A `choice-required` CATEGORY OFFERS — ALL OF THEM, IN ORDER,
 * WITH NONE PREFERRED.
 *
 * This function exists to have somewhere to say that, and somewhere for a test
 * to check it. Three things it must never do:
 *
 *   · treat `candidateIds[0]` as a winner. The order is the catalogue's, and
 *     the catalogue's order is not a ranking.
 *   · mark the `provenPath` part as chosen. `provenPath` proves a complete
 *     blocker-free build EXISTS; it picked one arbitrary member of each tie to
 *     do so. Showing it as «the system's pick» would turn a proof of
 *     existence into a recommendation the engine explicitly refused to make.
 *   · carry a selection at all. The domain has no way to say «the reader chose
 *     this but does not own it» — `owned.parts` means «already in hand» and
 *     produces `user-locked`. Selection waits for that contract.
 */
export const candidatesOf = (d: CategoryDecision): readonly string[] => d.candidateIds;

/**
 * «حسمنا ٦ اختيارات، ونحتاج رأيك في اختيارين.»
 *
 * Assembled from fragments and a real Arabic counter, never a template with a
 * digit typed into it — the engine can return anything from 0 to 8 on either
 * side, and every one of those has to read like a sentence a person wrote.
 */
export function proposalBurdenAr(
  counts: DecisionCounts,
  copy: {
    settledPrefix: string; needYouPrefix: string;
    nothingSettled: string; nothingLeft: string;
  },
  count: (n: number) => string,
): string {
  const settled = counts.systemDecided > 0
    ? `${copy.settledPrefix} ${count(counts.systemDecided)}`
    : copy.nothingSettled;
  const open = counts.choiceRequired > 0
    ? `${copy.needYouPrefix} ${count(counts.choiceRequired)}`
    : copy.nothingLeft;
  return `${settled}، ${open}.`;
}
