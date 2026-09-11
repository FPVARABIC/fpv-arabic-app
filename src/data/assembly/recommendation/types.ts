/**
 * WHAT THE RECOMMENDER IS ALLOWED TO SAY
 * ======================================
 *
 * The build section asks a beginner to make twelve technical choices before it
 * will tell them whether the result flies. The eventual answer is «هذا البناء
 * المقترح لك» — but a proposal is only worth reading if the system is honest
 * about WHICH KIND of answer each line is, and the honest kinds are not one.
 *
 * WHO CHOSE IT, AND WHAT KIND OF ANSWER IT IS
 * -------------------------------------------
 * Two separate questions, so two separate fields. Collapsing them is how a
 * model starts lying: an earlier draft of this file marked a part the READER
 * already owned as `recommended`, which claimed the system had weighed it
 * against alternatives and preferred it. It had done nothing of the kind — the
 * reader owned it, so it was kept. `selectionSource` now carries who chose,
 * and `status` carries what kind of answer it is.
 *
 * THE OUTCOMES
 * ------------
 *   recommended      the system chose it, and documented evidence relative to
 *                    what the reader asked for ranked it above the others that
 *                    survived. There is a REASON, and it comes from the
 *                    catalogue.
 *
 *   only-compatible  the system chose it because exactly one candidate
 *                    survived. Never «أفضل خيار» — there is nothing for it to
 *                    be best against. An owner decision, locked.
 *
 *   choice-required  several survived and NOTHING in the data separates them.
 *                    The system does not get to pick. This is the outcome that
 *                    keeps the rest honest: it is always available, so there is
 *                    never a reason to invent a tiebreak.
 *
 *   user-locked      the reader already owns it and it is compatible and
 *                    viable. Kept, not chosen.
 *
 *   user-selected    the reader CHOSE it for this build and it is viable. Not
 *                    a recommendation — the system did not weigh it against
 *                    the others; not `user-locked` — they do not claim to own
 *                    it; not `only-compatible` — others survived too; and not
 *                    `choice-required` — the choice has been made. Every one
 *                    of those four would have been a lie, which is why this
 *                    outcome exists rather than reusing one of them.
 *
 *   unavailable      nothing viable — including the case where the part the
 *                    reader owns is the thing ruling the build out.
 *
 * WHY THERE IS NO `manual-check` STATUS
 * -------------------------------------
 * There used to be, and the engine never emitted it — which made the enum a
 * claim about the model rather than a description of it. The uncertainty it
 * was meant to name is real, but it is not a property of ONE category's
 * selection: `current-headroom` is a relationship between a motor, a
 * propeller, a voltage and an ESC, and it stays unresolved no matter which
 * motor is chosen. Relational uncertainty is carried at the build level, on
 * `ProposedBuild.manualChecks`, where it actually lives.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * There is no confidence percentage. A number like «82%» implies a model that
 * produced it; there is no such model here, and a fabricated number is worse
 * than none because it survives being repeated. Evidence is categorical
 * instead, and each kind says where the claim came from.
 */

import type { BasePart, PartTier } from '../types';
import type { CompatRuleId, CompatRuleStatus } from '../compatibility/rules';

/** What kind of answer this is. See the header for each. */
export type RecommendationStatus =
  | 'recommended'
  | 'only-compatible'
  | 'choice-required'
  | 'user-locked'
  | 'user-selected'
  | 'unavailable';

/**
 * WHO decided. `none` means nobody has — the reader still must.
 *
 * `user-owned` and `user-selected` are BOTH the reader, and they are not the
 * same claim. «I already have this» is a fact about the world; «I want this in
 * this build» is an intention about a proposal. Collapsing them would put
 * hardware in someone's hands that is not there — and would make the engine
 * refuse to reconsider a part they never bought. Kept apart on purpose.
 */
export type SelectionSource = 'system' | 'user-owned' | 'user-selected' | 'none';

/**
 * WHERE A CLAIM CAME FROM — the honest replacement for a confidence score.
 *
 *   documented     a typed spec or a documented rule decided it (the Phase 1
 *                  shared compatibility rules, a voltage tag on the part).
 *   catalogue-tag  an editorial curation field decided it (tier, drone-type
 *                  tag, ecosystem string). True, and authored rather than
 *                  measured — so it ranks, but it never overrides physics.
 *   manual-required  nothing in the data decides it; a human must check.
 *   user-input     the READER said so. Not evidence about the world at all —
 *                  evidence about what they asked for. It is separate because
 *                  labelling a reader's choice `documented` would dress an
 *                  intention up as a spec, and a later screen reading
 *                  «documented» would present it as something the catalogue
 *                  established.
 */
export type EvidenceKind =
  'documented' | 'catalogue-tag' | 'manual-required' | 'user-input';

/**
 * The inputs a reader can give. Named as a type rather than left as loose
 * strings so a decision can point at the answer that caused it — «this part is
 * here because you said 6S», which is the question the future UI has to be
 * able to answer for every automatic choice.
 */
export type RecommendationInputKey =
  | 'droneTypeId'
  | 'sizeInch'
  | 'cellCount'
  | 'budgetTier'
  | 'ownedVideoSystem'
  | 'ownedRcSystem'
  | 'ownedParts'
  | 'selectedParts';

/** One sentence of why, plus what produced it. */
export interface DecisionReason {
  /**
   * What this sentence is doing:
   *   filter       why candidates were excluded
   *   ranking      why the chosen one was preferred over the rest
   *   tie          why no choice could be made
   *   no-candidate why nothing survived
   *   manual       why a judgement is being refused
   *   selection    the reader chose this part. Not a filter (nothing was
   *                excluded), not a ranking (nothing was compared), not a tie
   *                (the tie is over) — a direct choice, and the only reason
   *                kind whose authority is the reader rather than the data.
   */
  kind: 'filter' | 'ranking' | 'tie' | 'no-candidate' | 'manual' | 'selection';
  evidence: EvidenceKind;
  /** One sentence, for a reader. */
  ar: string;
  /** The reader's answer this rests on, when it rests on one. */
  inputKey?: RecommendationInputKey;
  /** The shared compatibility rule this rests on, when it rests on one. */
  ruleId?: CompatRuleId;
}

/**
 * A shared compatibility rule this part was actually measured against.
 *
 * ONLY rules that genuinely applied appear here. A rule that returns null for
 * this part — because the input it compares was absent — is OMITTED rather
 * than recorded as a pass. A fabricated «✓ frame-size» on a build with no
 * declared size would be exactly the kind of unearned reassurance the whole
 * verdict engine exists to avoid.
 */
export interface CompatibilityEvidence {
  ruleId: CompatRuleId;
  status: CompatRuleStatus;
}

/**
 * A READER SELECTION THE ENGINE COULD NOT EVEN CONSIDER.
 *
 * WHY THIS EXISTS AT ALL — it is the one thing `ProposedBuild` could not say.
 *
 * Everything else the engine reports is an outcome for a category of the
 * build, carried on `CategoryDecision`. A selection can be malformed in ways
 * that have no category to report against: it can name a shelf the catalogue
 * does not stock, or a shelf that is not part of a build at all (`gps`), and
 * then there IS no decision to hang the answer on. It can also name an id
 * that does not resolve in the category it was filed under — and `partId` is
 * defined as «the part this decision is ABOUT», so putting a phantom or a
 * foreign id there would be a lie of exactly the kind Phase 2C spent four
 * rounds removing: a frame's id under «المحركات» resolves globally and
 * renders.
 *
 * So malformed selection input gets its own channel, and the build FAILS
 * CLOSED — no proven path, nothing complete, no manufactured parts map.
 * Silently dropping a bad entry would leave the reader looking at a
 * recommendation while believing they had chosen something.
 *
 * This is NOT the channel for a selection that is real but unusable — an
 * ineligible part, one that breaks a shared rule, one that contradicts the
 * owned ecosystem, or one that cannot appear in any clean build. Those have a
 * category and a resolvable id, so they are reported where they belong: on
 * that category's decision, as `unavailable` with `selectionSource:
 * 'user-selected'` and the id intact.
 *
 * And it is NOT `blockerFindingIds`: those are verdict-engine finding ids, and
 * a malformed input is not a finding about a drone.
 */
export interface SelectionIssue {
  /** The category key exactly as the input spelled it. */
  category: string;
  /** The part id exactly as the input spelled it. */
  partId: string;
  /**
   *   unknown-category      the catalogue has no such shelf.
   *   not-a-build-category  a real shelf, but not one a build must fill —
   *                         `gps`, `tools`. There is no decision for it.
   *   unknown-part          no part in the catalogue has this id.
   *   foreign-category      the id is real and belongs to a DIFFERENT
   *                         category. Reported apart from `unknown-part`
   *                         because «exists, wrong shelf» is the more
   *                         dangerous bug: it resolves.
   */
  kind: 'unknown-category' | 'not-a-build-category' | 'unknown-part' | 'foreign-category';
  /** One sentence, for a reader. */
  ar: string;
}

/** What the engine concluded about one category. */
export interface CategoryDecision {
  category: string;
  status: RecommendationStatus;
  /** Who decided. `none` iff `partId` is undefined. */
  selectionSource: SelectionSource;
  /**
   * The part this decision is ABOUT, when there is one.
   *
   * Set when the system selected a part (`recommended`, `only-compatible`),
   * when the reader owns one (`user-locked`, or `unavailable` where their own
   * part is the reason), and when the reader SELECTED one (`user-selected`, or
   * `unavailable` where their selection is the reason). `selectionSource` is
   * what tells those three apart — a caller must never read `partId` as «the
   * system chose this».
   *
   * It always resolves inside `category` in the CURRENT catalogue. A selection
   * whose id does not is refused before it reaches here, and reported on
   * `ProposedBuild.selectionIssues` instead.
   */
  partId?: string;
  /**
   * Everything that survived the hard filters AND is globally viable, in the
   * catalogue's own order. Present for every status: a `choice-required` line
   * is useless without the choices, and an `only-compatible` line is only
   * checkable against its own.
   */
  candidateIds: readonly string[];
  /** Shared rules this decision's part was actually measured against. */
  compatibility: readonly CompatibilityEvidence[];
  reasons: readonly DecisionReason[];
}

/**
 * An answer the engine needs before it can compute anything at all.
 *
 * Size and voltage are prerequisites, not outputs. When the catalogue derives
 * exactly one value the engine resolves it silently; when several are equally
 * valid it must ASK, because picking one would be a tiebreak with nothing
 * behind it. `droneTypes.recommendedBatteryVoltages` is `[4, 6]` for freestyle
 * and says nothing about 4S being preferable to 6S — so the engine does not
 * pretend it does.
 */
export interface RequiredInput {
  key: RecommendationInputKey;
  /** The equally-valid values, in the catalogue's own order. */
  options: readonly (string | number)[];
  ar: string;
}

/**
 * A build the system is willing to put its name to — or an honest account of
 * why it cannot.
 *
 * `complete` is deliberately narrow. It means every REQUIRED category resolved
 * to a part AND the assembled build raises no blocker in the shared verdict
 * engine. It does NOT mean the build is verified: `manualChecks` may still
 * hold entries, and while it does, no caller may call this build checked. The
 * two are separate fields precisely so that «complete» cannot be read as
 * «safe».
 */
export interface ProposedBuild {
  droneTypeId: string;
  /** Resolved only when the catalogue derived exactly one, or the reader said. */
  sizeInch?: number;
  cellCount?: number;
  /**
   * Prerequisites the engine could not resolve on its own. While this is
   * non-empty no decisions have been computed — there is nothing to compute
   * against yet, and guessing would be the tiebreak this engine refuses.
   */
  requiredInputs: readonly RequiredInput[];
  /** One per category the engine considered, in build order. */
  decisions: readonly CategoryDecision[];
  /** The parts actually fixed — system-selected and user-owned alike. */
  parts: Readonly<Record<string, BasePart>>;
  /** Required categories still waiting on the reader. */
  unresolved: readonly string[];
  /**
   * Findings the DATA cannot settle, at the level they actually live: a
   * relationship between parts, not a property of one category's selection.
   * `current-headroom` is the standing example.
   */
  manualChecks: readonly string[];
  /** Every required category resolved by the engine — nothing left to ask. */
  complete: boolean;
  /**
   * A COMPLETE assignment, consistent with every decision above, that the
   * shared verdict engine passed with zero blockers — or null when no such
   * assignment exists.
   *
   * This is the receipt for the whole proposal. A part can be locally fine and
   * globally fatal: the racing type's every combination raises `stack-mount`,
   * though each part passes its own card. Without this field a proposal would
   * be a set of independently-filtered lists that may not add up to a drone.
   */
  provenPath: Readonly<Record<string, string>> | null;
  /**
   * Blocker finding ids seen while searching, when NO clean assignment exists.
   * Empty whenever `provenPath` is set — a proven path has no blockers by
   * construction.
   */
  blockerFindingIds: readonly string[];
  /**
   * Reader selections that could not be filed against any category — see
   * `SelectionIssue`. Non-empty means the input was malformed and the build
   * failed closed; empty is the ordinary case, including every build where
   * nothing was selected.
   */
  selectionIssues: readonly SelectionIssue[];
}

/**
 * WHAT THE READER TOLD US.
 *
 * Two different kinds of answer, kept apart because they behave differently:
 *
 *   `budgetTier` is a PREFERENCE. It ranks; it never excludes. A reader who
 *   says «اقتصادي» has not said they refuse to see anything else.
 *
 *   everything under `owned` is a CONSTRAINT. It is hardware already in the
 *   reader's hands. A DJI goggle owner cannot use a Walksnail air unit, and no
 *   amount of budget agreement changes that — so ecosystem ownership FILTERS
 *   rather than ranking. An earlier draft scored ownership as «+1 preference»,
 *   which let a cheaper incompatible unit outrank a compatible one. That is
 *   the bug this split exists to prevent.
 *
 * A reader who owns no goggles and no radio leaves `owned` empty, and then
 * nothing is constrained: they are free to buy into any ecosystem.
 */
export interface RecommendationInput {
  droneTypeId: string;
  sizeInch?: number;
  cellCount?: number;
  /** Soft: ranks among viable candidates, never excludes any. */
  budgetTier?: PartTier;
  owned?: {
    /** Goggle ecosystem already owned — matched against `protocolOrSystem`. */
    videoSystem?: string;
    /**
     * Radio system already owned. The CANONICAL value from
     * `receivers[].specs.protocol` — «ExpressLRS» or «Crossfire» — never a
     * display string and never «CRSF», which is the serial protocol between
     * receiver and flight controller and is shared by both ecosystems.
     */
    rcSystem?: string;
    /**
     * Parts already in hand, by category. Hard locks: an owned part is never
     * silently replaced. If it is compatible and viable it stays; if it is
     * not, the build says so and stays incomplete.
     */
    parts?: Readonly<Record<string, BasePart>>;
  };
  /**
   * PARTS THE READER CHOSE FOR THIS BUILD — category → catalogue part id.
   *
   * A THIRD kind of answer, and it is deliberately not under `owned`.
   *
   * `owned.parts` means «already in my hands», and the engine treats it as a
   * fact about the world: it is never replaced, it constrains what else can
   * be proposed, and a reason attached to it says «قطعة تملكها بالفعل». Using
   * that channel to carry a wizard click would tell a reader they own
   * hardware they have not bought, and would make the engine defend a part
   * they never had. That is the bug this field exists to prevent.
   *
   * WHAT A SELECTION IS
   *   · a HARD CHOICE for this proposal until it is changed or cleared —
   *     budget is a preference and a preference does not outrank a choice;
   *   · NOT ownership, and NOT a system recommendation;
   *   · subject to every normal check: eligibility, the shared compatibility
   *     rules, the owned ecosystem, and global viability alongside every
   *     other lock. Selecting a part does not make it work.
   *
   * IDS, NOT PARTS. The choice is an identity in the CURRENT catalogue, and
   * an id is the whole of it. `owned.parts` carries `BasePart` objects
   * because owned hardware may outlive a catalogue entry; a selection cannot
   * — a reader cannot choose something that is not on the shelf. Accepting
   * arbitrary objects here would let a caller invent a part.
   *
   * Absent or empty means nothing was chosen, and every output below is
   * exactly what it was before this field existed.
   */
  selectedParts?: Readonly<Record<string, string>>;
}
