/**
 * BOT V2 — Public types.
 *
 * Isolated from live runtime. Not imported by any UI or bot service code.
 */

import type { ContextualWarningKind, WarningSeverity } from './contextualWarning';

// ── Answer modes ──────────────────────────────────────────────────────────────

export type BotV2AnswerMode =
  | 'definition'          // "what is X?" — uses concept shortDefinition
  | 'direct_short_answer' // general concept answer (max 2 sentences + steps)
  | 'build_roadmap'       // beginner build guide with ordered steps
  | 'troubleshooting'     // "X لا يعمل" — diagnostic steps
  | 'clarification_menu'  // vague or out-of-domain — ask user to clarify
  | 'safety_first'        // critical hazard — safety before anything else
  | 'app_navigation'      // user asking about app sections / next step
  | 'source_assisted'     // reserved for future web-search-backed answers
  | 'lesson_redirect';    // reserved for deep lesson linking

// ── Risk level ────────────────────────────────────────────────────────────────

export type BotV2RiskLevel = 'none' | 'low' | 'medium' | 'critical';

// ── Chip and link placeholders ────────────────────────────────────────────────

export interface BotV2Link {
  label: string;
  route: string;
}

export interface BotV2Chip {
  label: string;
  /** Sends this text as a follow-up query when tapped. */
  query?: string;
  /** Navigates to this app route when tapped. */
  route?: string;
}

// ── Debug payload ─────────────────────────────────────────────────────────────

export interface BotV2Debug {
  normalizedQuery: string;
  conceptId: string | undefined;
  matchedTerms: string[];
  /** Raw safetyLevel from botQueryAnalysis concept registry. */
  safetyLevel: string;
  /** V2-computed risk level (may differ from safetyLevel). */
  v2RiskLevel: BotV2RiskLevel;
  confidence: 'matched' | 'unmatched';
  isFpvDomain: boolean;
  modeReason: string;
  /** Resolved Intent for this turn, after context continuation/topic-switch
   *  resolution — used by tests and by the "تجريبي" debug surface. */
  resolvedIntent: string;
  /** Whether this turn's context change was a topic switch (family
   *  changed) vs. a continuation. */
  topicChanged: boolean;
}

// ── Answer ────────────────────────────────────────────────────────────────────

export interface BotV2Answer {
  mode: BotV2AnswerMode;
  /** Resolved concept from query analysis. undefined for OOD or vague queries. */
  conceptId?: string;
  riskLevel: BotV2RiskLevel;
  /** Max 2 sentences. */
  shortAnswer: string;
  /** Max 6 items. */
  steps?: string[];
  /**
   * Single-authority warning result from contextualWarning.ts (already
   * deduplication-adjusted by engine.ts), present on EVERY answer regardless
   * of mode. warningSeverity is always set; `warning`/`warningKind` are set
   * together or both omitted. Both UI consumers must render based on
   * warningSeverity alone via getWarningCardProps() and must never
   * independently decide whether to show this content.
   */
  warning?: string;
  warningSeverity: WarningSeverity;
  warningKind?: ContextualWarningKind;
  chips: BotV2Chip[];
  links: BotV2Link[];
  debug: BotV2Debug;
}
