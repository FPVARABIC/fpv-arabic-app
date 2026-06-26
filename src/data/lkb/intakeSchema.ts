/**
 * LKB — Knowledge Intake Schema.
 *
 * KnowledgeIntakeRecord is the single intake shape for all knowledge sources.
 * Every source — book chapter, official doc, authored content, lesson — must
 * be normalized into this shape before entering the LKB as a LearningNode.
 *
 * Brave API results are NOT ingested as LearningNodes. They are transient
 * enrichments routed at query time via ProviderHint on the matching LearningNode.
 *
 * Inert — no runtime code.
 */

import type { ContentSource, ProviderHint } from './types.ts';

/**
 * The single intake door for all knowledge entering the LKB.
 *
 * The intake pipeline normalizes any source into this shape, then
 * a factory (Phase LKB-2) converts it into a LearningNode with
 * typed value objects, review flags, and resolver-ready fields.
 */
export interface KnowledgeIntakeRecord {
  /** The origin type of this knowledge. */
  sourceType: ContentSource;

  /**
   * Specific location within the source.
   * Examples: 'chapter01/section2', 'betaflight/arming-flags', 'lesson-8/wiring'
   */
  sourceRef: string;

  /** Target concept identifier in the LKB. */
  conceptId: string;

  /**
   * Distilled definition text (Arabic). Max 2 sentences.
   * Must be a human-authored summary — not a copied paragraph.
   */
  definitionText: string;

  /** Optional English variant of the definition. */
  definitionTextEn?: string;

  /**
   * Full body text from the source document (chapter, lesson, doc page).
   * Stored in LearningNode.body. Never served to the bot.
   */
  bodyText?: string;

  /** Ordered step texts (Arabic). Max 6 for bot consumption. */
  steps?: string[];

  /** Safety note text (Arabic). */
  safetyText?: string;

  /** Severity of the safety note. Required when safetyText is set. */
  safetySeverity?: 'warning' | 'critical';

  /**
   * Whether this node carries critical safety content.
   * When true: external providers are blocked; content requires review before serving.
   */
  criticalSafety?: boolean;

  /**
   * Provider routing hints for source_assisted mode.
   * Priority is assigned by the intake factory, not the intake record.
   * Must not be set when criticalSafety is true.
   */
  providerHints?: Omit<ProviderHint, 'priority'>[];

  /**
   * Whether a human has reviewed this intake record.
   * Defaults to false if omitted. Unreviewed content cannot be served by the bot.
   */
  reviewed?: boolean;

  /** App route for the corresponding lesson. */
  lessonRoute?: string;

  /** App route for the corresponding checklist. */
  checklistRoute?: string;
}
