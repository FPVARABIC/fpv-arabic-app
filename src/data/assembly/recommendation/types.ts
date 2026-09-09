/**
 * WHAT THE RECOMMENDER IS ALLOWED TO SAY
 * ======================================
 *
 * The build section asks a beginner to make twelve technical choices before it
 * will tell them whether the result flies. The eventual answer is «هذا البناء
 * المقترح لك» — but a proposal is only worth reading if the system is honest
 * about WHICH KIND of answer each line is, and the honest kinds are not one.
 *
 * Five outcomes, and the distinctions between them are the whole point:
 *
 *   RECOMMENDED       documented evidence, relative to what the reader said
 *                     they wanted, supports this part over the others that
 *                     survived. There has to be a REASON, and the reason has
 *                     to come from the catalogue.
 *
 *   ONLY_COMPATIBLE   exactly one candidate survived the filters. This is not
 *                     a recommendation and must never be shown as «أفضل خيار»
 *                     — the catalogue simply has nothing else to offer. An
 *                     owner decision, locked: «الخيار الوحيد المتوافق في
 *                     الكتالوج».
 *
 *   CHOICE_REQUIRED   several candidates survived and NOTHING in the data
 *                     separates them. The system does not get to pick. This
 *                     is the outcome that keeps the engine honest: it is
 *                     always available, so there is never a reason to invent
 *                     a tiebreak.
 *
 *   MANUAL_CHECK      compatibility cannot be confirmed from documented data.
 *                     `current-headroom` is the standing example — motor draw
 *                     with a given propeller at a given voltage is not in this
 *                     catalogue and is not derivable from KV or stator size,
 *                     so the report already refuses to judge it. The
 *                     recommender refuses too, rather than ranking on a number
 *                     it would have to invent.
 *
 *   UNAVAILABLE       no valid candidate exists at all.
 *
 * WHAT IS DELIBERATELY ABSENT
 * ---------------------------
 * There is no confidence percentage. A number like «82%» implies a model that
 * produced it; there is no such model here, and a fabricated number is worse
 * than none because it survives being repeated. Evidence is categorical
 * instead, and each kind says where the claim came from.
 */

import type { BasePart } from '../types';
import type { CompatRuleId } from '../compatibility/rules';

/** The five things the engine may conclude about one category. */
export type RecommendationStatus =
  | 'recommended'
  | 'only-compatible'
  | 'choice-required'
  | 'manual-check'
  | 'unavailable';

/**
 * WHERE A CLAIM CAME FROM — the honest replacement for a confidence score.
 *
 *   documented     a typed spec or a documented rule decided it (the Phase 1
 *                  shared compatibility rules, a voltage tag on the part).
 *   catalogue-tag  an editorial curation field decided it (tier, drone-type
 *                  tag, ecosystem string). True, and authored rather than
 *                  measured — so it ranks, but it never overrides physics.
 *   manual-required  nothing in the data decides it; a human must check.
 */
export type EvidenceKind = 'documented' | 'catalogue-tag' | 'manual-required';

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
  | 'videoSystem'
  | 'rcProtocol'
  | 'existingParts';

/** One sentence of why, plus what produced it. */
export interface DecisionReason {
  /**
   * What this sentence is doing:
   *   filter       why candidates were excluded
   *   ranking      why the chosen one was preferred over the rest
   *   tie          why no choice could be made
   *   no-candidate why nothing survived
   *   manual       why a judgement is being refused
   */
  kind: 'filter' | 'ranking' | 'tie' | 'no-candidate' | 'manual';
  evidence: EvidenceKind;
  /** One sentence, for a reader. */
  ar: string;
  /** The reader's answer this rests on, when it rests on one. */
  inputKey?: RecommendationInputKey;
  /** The shared compatibility rule this rests on, when it rests on one. */
  ruleId?: CompatRuleId;
}

/** What the engine concluded about one category. */
export interface CategoryDecision {
  category: string;
  status: RecommendationStatus;
  /**
   * Set ONLY for `recommended` and `only-compatible` — the two statuses that
   * mean «the system has a part for you». Every other status leaves this
   * undefined, so a caller cannot render a selection the engine did not make.
   */
  partId?: string;
  /**
   * Everything that survived the hard filters, in the catalogue's own order.
   * Present for every status: a `choice-required` line is useless without the
   * choices, and an `only-compatible` line is only checkable against its own.
   */
  candidateIds: readonly string[];
  reasons: readonly DecisionReason[];
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
  sizeInch?: number;
  cellCount?: number;
  /** One per category the engine considered, in build order. */
  decisions: readonly CategoryDecision[];
  /** The parts the engine actually selected, keyed by category. */
  parts: Readonly<Record<string, BasePart>>;
  /** Required categories still waiting on the reader. */
  unresolved: readonly string[];
  /** Finding ids the data cannot settle — carried, never silently dropped. */
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
   * With it, «here is what I propose» always comes with «and here is a whole
   * build it completes into».
   */
  provenPath: Readonly<Record<string, string>> | null;
  /**
   * Blocker finding ids seen while searching, when NO clean assignment exists.
   * Empty whenever `provenPath` is set — a proven path has no blockers by
   * construction.
   */
  blockerFindingIds: readonly string[];
}

/** What the reader told us. Everything except the goal is optional. */
export interface RecommendationInput {
  droneTypeId: string;
  sizeInch?: number;
  cellCount?: number;
  /** Lightweight preference; only used where the catalogue justifies it. */
  budgetTier?: 'budget' | 'mid' | 'premium';
  /** Goggle ecosystem, matched against `protocolOrSystem` on video units. */
  videoSystem?: string;
  /** Radio protocol, matched against receivers. */
  rcProtocol?: string;
  /**
   * Parts the reader already owns, by category. A locked input: an existing
   * part is never silently replaced. If it is compatible it stays; if it is
   * not, the build says so and stays incomplete.
   */
  existingParts?: Readonly<Record<string, BasePart>>;
}
