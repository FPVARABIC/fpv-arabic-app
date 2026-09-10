import type { BasePart } from '@core/data/assembly/types';
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
 *   user-selected                 →  you already decided. Also nothing to do,
 *                                    and NOT the same as owning it.
 *   unavailable                   →  something is wrong.
 *
 * An eight-card wall where all eight shout equally is the V1 wizard again. The
 * group that needs the reader gets the room; the group that does not gets a
 * compact row.
 *
 * WHY THIS IS A RECORD AND NOT A CHAIN
 * ------------------------------------
 * It was a chain, and it ended in `: 'system-decided'` — so «anything I have
 * not named is a system decision». Phase 2D added `user-selected`, and that
 * default would have silently filed a READER'S OWN CHOICE under «حسمها
 * النظام»: the system claiming credit for a decision it explicitly refused to
 * make, which is the precise failure this whole module exists to prevent.
 *
 * A `Record` over the union cannot be under-populated. A sixth status will not
 * compile until someone decides, in writing, what a reader is supposed to do
 * about it — the same guarantee `COMPAT_RULE_LABEL_AR` gives for rules.
 */

export type DecisionGroup = 'needs-you' | 'system-decided' | 'yours' | 'chosen' | 'problem';

const GROUP_BY_STATUS: Record<RecommendationStatus, DecisionGroup> = {
  'choice-required': 'needs-you',
  recommended: 'system-decided',
  'only-compatible': 'system-decided',
  'user-locked': 'yours',
  'user-selected': 'chosen',
  unavailable: 'problem',
};

export const groupOf = (status: RecommendationStatus): DecisionGroup => GROUP_BY_STATUS[status];

export interface DecisionCounts {
  required: number;
  recommended: number;
  onlyCompatible: number;
  choiceRequired: number;
  userLocked: number;
  /** Chosen by the READER. Never counted as settled by the system. */
  userSelected: number;
  unavailable: number;
  /**
   * What the system settled on the reader's behalf, by any route.
   *
   * `user-locked` and `user-selected` are both excluded on purpose: the
   * headline built from this number says «حسمنا N اختيارات», and neither a
   * part someone already owns nor one they picked themselves was settled by
   * us.
   */
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

/**
 * SOMETHING THE SCREEN CANNOT HONESTLY RENDER.
 *
 * Every one of these used to have a fallback, and every fallback put a
 * database string in front of the reader: an unresolvable part became its own
 * id as a product name, a manual check with no copy became its finding id.
 * A missing presentation mapping is a developer defect; printing the key is
 * not a graceful degradation, it is the defect made visible to the wrong
 * person.
 *
 * So they are collected, the proposal is refused, and the ids live in test
 * hooks and machine state — never in a sentence.
 */
export type ProposalDefect =
  /** A proven build cannot contain a required category with nothing to offer. */
  | { kind: 'unavailable-required'; category: string }
  /**
   * `CategoryDecision.category` is a `string`, and the catalogue has no such
   * shelf. Nothing downstream would necessarily notice: a decision with no
   * `partId` and no candidates trips none of the id checks, and the card's
   * heading falls back to printing the key.
   */
  | { kind: 'unknown-category'; category: string; id: null }
  /** A real category the reader-facing vocabulary has no Arabic name for. */
  | { kind: 'unlabelled-category'; category: string; id: null }
  /** `decision.partId` names a part the catalogue does not have. */
  | { kind: 'unresolved-part'; category: string; id: string }
  /** `build.parts[category]` is not the part the decision says was selected. */
  | { kind: 'part-mismatch'; category: string; id: string }
  /** A surviving candidate the catalogue cannot resolve. */
  | { kind: 'unresolved-candidate'; category: string; id: string }
  /**
   * A part that EXISTS — in a different category.
   *
   * Its own kind, because the diagnosis is not the same as «missing». A
   * missing id is a stale catalogue; a foreign one is a decision pointing at
   * the wrong shelf, and it is the more dangerous of the two: it resolves, it
   * renders, and it looks like a real answer.
   */
  | { kind: 'foreign-category'; category: string; id: string }
  /** A manual check the UI has no reader-facing description for. */
  | { kind: 'unlabelled-manual-check'; category: null; id: string };

export type ProposalDefectKind = ProposalDefect['kind'];

export interface ProposalView {
  counts: DecisionCounts;
  quality: ProposalQuality;
  /** Engine order, grouped. A category appears in exactly one group. */
  groups: Readonly<Record<DecisionGroup, readonly CategoryDecision[]>>;
  manualChecks: readonly string[];
  /** Everything that makes this proposal unrenderable. Empty is the norm. */
  defects: readonly ProposalDefect[];
  /**
   * Shorthand for «do not draw a proposal». Historically this meant only the
   * unavailable-required contradiction; it now covers every defect above,
   * because a card naming a part that does not exist is no more renderable
   * than a build that cannot exist.
   */
  consistencyError: boolean;
}

/**
 * What the view needs from outside itself to check its own integrity.
 *
 * Passed in rather than imported so the model stays pure: the catalogue and
 * the copy file are both someone else's business, and a test can hand this
 * function a deliberately broken world without touching either.
 */
export interface ProposalContext {
  /**
   * Resolve an id WITHIN a category — never across the catalogue.
   *
   * The first version took the id alone and looked it up in one flat map. It
   * confirmed the part exists and stopped there, which is a weaker guarantee
   * than it reads as: a frame's id in the receivers' candidate list resolved
   * cleanly, and a `motors` decision selecting a frame passed every check and
   * rendered «إطار 5.1 إنش» under «المحركات» — with no spec rows at all,
   * because `partFacts('motors', frame)` finds no motor keys in a frame.
   *
   * Nothing failed. It just quietly showed the wrong product under the right
   * heading, with the right decision's reasons attached to it.
   */
  resolvePart: (category: string, id: string) => BasePart | undefined;
  /** Does this id exist ANYWHERE? Only used to tell «missing» from «foreign». */
  existsInAnyCategory: (id: string) => boolean;
  /** Is this a real catalogue category — a shelf that exists? */
  hasCategory: (category: string) => boolean;
  /**
   * The reader-facing Arabic name of a category, or undefined.
   *
   * STRICT. `partLabelAr()` answers the same question with a fallback to the
   * key itself, which is the graceful degradation this whole class of fix
   * exists to remove — it may keep that shape for older surfaces, but the
   * proposal must never reach it.
   */
  categoryLabel: (category: string) => string | undefined;
  hasManualLabel: (id: string) => boolean;
}

/**
 * PRESENTATION INTEGRITY — NOT A SECOND RECOMMENDATION ENGINE.
 *
 * This re-decides nothing and re-checks no compatibility. It asks only whether
 * the decisions the engine returned can be RENDERED without inventing
 * anything: does every id it names exist, and does the part the card is about
 * to show match the part the decision actually selected.
 *
 * That last one matters more than it looks. The card reads
 * `build.parts[category]` while the decision carries `partId`; nothing forced
 * those to agree, so a mismatch would have shown one part under another
 * decision's reasons and compatibility evidence — a wrong explanation attached
 * to a real product, which is worse than no explanation.
 */
export function proposalDefects(
  build: ProposedBuild,
  ctx: ProposalContext,
): readonly ProposalDefect[] {
  const defects: ProposalDefect[] = [];

  for (const d of build.decisions) {
    if (d.status === 'unavailable') {
      defects.push({ kind: 'unavailable-required', category: d.category });
    }

    /*
     * THE CATEGORY ITSELF, BEFORE ANYTHING IN IT.
     *
     * Every check below asks a question OF a category — «is this part on this
     * shelf», «is this candidate on this shelf». None of them can answer
     * anything useful when the shelf does not exist, and asking anyway
     * produces a misleading diagnosis: `resolvePart('probe-category', id)`
     * returns undefined for a perfectly good id, and it gets reported as
     * `foreign-category` when the id was never the problem.
     *
     * So a bad category is recorded and the decision is skipped. One defect,
     * naming the actual fault.
     */
    if (!ctx.hasCategory(d.category)) {
      defects.push({ kind: 'unknown-category', category: d.category, id: null });
      continue;
    }
    if (ctx.categoryLabel(d.category) === undefined) {
      defects.push({ kind: 'unlabelled-category', category: d.category, id: null });
      continue;
    }

    if (d.partId !== undefined) {
      if (ctx.resolvePart(d.category, d.partId) === undefined) {
        defects.push({
          kind: ctx.existsInAnyCategory(d.partId) ? 'foreign-category' : 'unresolved-part',
          category: d.category,
          id: d.partId,
        });
      }
      const shown = build.parts[d.category];
      if (shown === undefined || shown.id !== d.partId) {
        defects.push({ kind: 'part-mismatch', category: d.category, id: d.partId });
      }
    }

    for (const id of d.candidateIds) {
      if (ctx.resolvePart(d.category, id) === undefined) {
        defects.push({
          kind: ctx.existsInAnyCategory(id) ? 'foreign-category' : 'unresolved-candidate',
          category: d.category,
          id,
        });
      }
    }
  }

  for (const id of build.manualChecks) {
    if (!ctx.hasManualLabel(id)) {
      defects.push({ kind: 'unlabelled-manual-check', category: null, id });
    }
  }

  return defects;
}

export function proposalView(build: ProposedBuild, ctx: ProposalContext): ProposalView {
  const by = (s: RecommendationStatus) => build.decisions.filter(d => d.status === s);
  const counts: DecisionCounts = {
    required: build.decisions.length,
    recommended: by('recommended').length,
    onlyCompatible: by('only-compatible').length,
    choiceRequired: by('choice-required').length,
    userLocked: by('user-locked').length,
    userSelected: by('user-selected').length,
    unavailable: by('unavailable').length,
    systemDecided: by('recommended').length + by('only-compatible').length,
    manualChecks: build.manualChecks.length,
  };

  const groups: Record<DecisionGroup, CategoryDecision[]> = {
    'needs-you': [], 'system-decided': [], yours: [], chosen: [], problem: [],
  };
  for (const d of build.decisions) groups[groupOf(d.status)].push(d);

  const defects = proposalDefects(build, ctx);

  return {
    counts,
    quality: counts.systemDecided > 0 ? 'proposed' : 'all-open',
    groups,
    manualChecks: build.manualChecks,
    defects,
    consistencyError: defects.length > 0,
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
