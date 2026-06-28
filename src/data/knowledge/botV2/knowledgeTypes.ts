/**
 * BOT V2 — Knowledge layer type definitions.
 *
 * One BotV2KnowledgeNode per BotConceptId. Consumed by knowledgeResolver
 * and composer; defined in knowledgeBase.
 *
 * Constraints enforced by qaRunner validation:
 *  - shortAnswer: max 2 sentences
 *  - steps: max 6
 *  - chips: max 3
 *  - critical safety nodes (lipo_safety, propeller_basic): NO sourceSearchHints
 */

import type { BotConceptId } from '../botConceptRegistry';

export interface BotV2KnowledgeLink {
  label: string;
  route: string;
}

export interface BotV2KnowledgeChip {
  label: string;
  query?: string;
  route?: string;
}

export type BotV2KnowledgeStep = string;

export interface BotV2CommonMistake {
  description: string;
  correction: string;
}

export interface BotV2KnowledgeNode {
  conceptId: BotConceptId;
  /** Max 2 sentences. Used as the primary answer in direct_short_answer and safety modes. */
  shortAnswer: string;
  /** 1–3 sentences. Surfaced as steps[0] in definition mode. */
  beginnerExplanation: string;
  /** Max 6 action steps. Used in troubleshooting, safety_first, and build_roadmap modes. */
  steps?: BotV2KnowledgeStep[];
  /** Shown as the answer warning field. Required on critical safety nodes. */
  safetyNotes?: string;
  commonMistakes?: BotV2CommonMistake[];
  relatedConceptIds?: BotConceptId[];
  internalLinks?: BotV2KnowledgeLink[];
  /** Max 3 chips. */
  chips?: BotV2KnowledgeChip[];
  /**
   * Hints for external search results. MUST NOT be set on critical safety nodes
   * (lipo_safety, propeller_basic) — critical answers must never surface external links.
   */
  sourceSearchHints?: string[];
  /** Internal route for beginner redirect (lesson or section). */
  lessonRedirect?: string;
}
