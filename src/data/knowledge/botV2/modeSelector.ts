/**
 * BOT V2 — Mode selector.
 *
 * Converts QueryAnalysis + V2SafetyResult + this turn's resolved Intent
 * (from intentClassifier.ts, already reconciled with conversation context by
 * sessionContext.ts) into a single BotV2AnswerMode. Does NOT compose answers
 * — that is the composer's job.
 *
 * The old single-shot "_hasBuildSpecificity" keyword check from the
 * previous phase's proposal is superseded entirely by the richer
 * intentClassifier.ts + sessionContext.ts layer: broad-build routing is now
 * driven by the resolved Intent and the session's pendingClarification
 * state, not by re-scanning the current message's keywords alone.
 */

import { normalizeArabicQuery, type QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2AnswerMode } from './types';
import type { V2SafetyResult } from './safety';
import type { Intent } from './intentClassifier';
import type { PendingClarification } from './sessionContext';

// ── Mode selection result ─────────────────────────────────────────────────────

export interface ModeSelection {
  mode: BotV2AnswerMode;
  reason: string;
  isOutOfDomain: boolean;
  /**
   * True only for a 'clarification_menu' answer specifically caused by a
   * broad, unspecific build request still awaiting one of the three
   * progressive clarification answers — distinguishes it from the
   * pre-existing out-of-domain and vague-FPV clarification_menu cases so the
   * composer can ask the next single clarifying question instead of the
   * generic topic-picker chips.
   */
  isBroadBuildIntent: boolean;
}

// ── Pattern lists (pre-normalized at module load) ─────────────────────────────

// MSA only: removed two pairs of regional-dialect interrogatives for
// "what" (Levantine and Gulf/Levantine forms); fixed an alef-maqsura
// spelling issue on "what does it mean".
const _DEFINITION_RAW: readonly string[] = [
  'ما هو ', 'ما هي ', 'ما معنى', 'كيف يعمل', 'كيف تعمل',
  'explain', 'what is', 'what are', 'definition',
];

// MSA only: removed two Gulf/Levantine colloquial phrasings for "not
// working" (using a dialect negation particle, not MSA) and two colloquial
// phrasings for "by mistake" / "something's wrong with it"; fixed hamza
// and taa-marbuta spelling on the remaining MSA words.
const _TROUBLESHOOT_RAW: readonly string[] = [
  'لا يعمل', 'لا تعمل', 'لا يدور', 'لا تدور',
  'لا يظهر', 'لا تظهر', 'لا يحفظ', 'لا تحفظ',
  'لا يتصل', 'لا يرتبط', 'لا أستطيع',
  'مشكلة', 'خطأ',
  'not working', 'problem', 'error', 'doesnt work',
];

const _definitionPhrases = _DEFINITION_RAW.map(normalizeArabicQuery);
const _troubleshootPhrases = _TROUBLESHOOT_RAW.map(normalizeArabicQuery);

function _hasDefinitionPattern(norm: string): boolean {
  return _definitionPhrases.some(p => p.length >= 2 && norm.includes(p));
}

function _hasTroubleshootPattern(norm: string): boolean {
  return _troubleshootPhrases.some(p => p.length >= 2 && norm.includes(p));
}

// ── The four new troubleshooting-vocabulary intents always select the
//    existing 'troubleshooting' mode, regardless of whether the OLDER
//    _TROUBLESHOOT_RAW phrase list (لا يعمل / مشكلة / etc.) happens to also
//    match — "الدرون ينقلب عند الإقلاع" matches none of those older phrases
//    but is unambiguously a troubleshooting report. ──────────────────────────

const TROUBLESHOOTING_INTENTS: ReadonlySet<Intent> = new Set([
  'flight_troubleshooting', 'video_troubleshooting', 'radio_troubleshooting', 'gps_troubleshooting',
]);

// ── Public selector ───────────────────────────────────────────────────────────

/**
 * Returns the answer mode and a human-readable reason for debugging.
 *
 * Rules in priority order:
 *  1. critical safety → safety_first
 *  2. one of the four troubleshooting intents → troubleshooting
 *  3. app_navigation intent/concept → app_navigation
 *  4. broad_planning intent, clarification still pending → clarification_menu
 *  5. broad_planning intent, all three clarifications answered → build_roadmap
 *  6. out-of-domain (no FPV, no match, no resolved intent) → clarification_menu
 *  7. in-FPV-domain vague query → clarification_menu
 *  8. definition-style query → definition
 *  9. troubleshooting-style query (older phrase list) → troubleshooting
 *  10. default → direct_short_answer
 */
export function selectV2Mode(
  analysis: QueryAnalysis,
  safety: V2SafetyResult,
  resolvedIntent: Intent,
  pendingClarification: PendingClarification | undefined,
): ModeSelection {
  const norm = analysis.normalizedQuery;

  // 1. Critical safety overrides everything
  if (safety.riskLevel === 'critical') {
    return {
      mode: 'safety_first',
      reason: 'critical safety hazard: ' + (safety.hazard ?? 'unknown'),
      isOutOfDomain: false,
      isBroadBuildIntent: false,
    };
  }

  // 2. New troubleshooting-vocabulary intents.
  if (TROUBLESHOOTING_INTENTS.has(resolvedIntent)) {
    return {
      mode: 'troubleshooting',
      reason: 'troubleshooting intent: ' + resolvedIntent,
      isOutOfDomain: false,
      isBroadBuildIntent: false,
    };
  }

  // 3. App navigation. Checked on resolvedIntent alone — NOT on
  //    analysis.conceptId directly, because a session-context continuation
  //    (e.g. answering "experience_level" with "أنا مبتدئ") can carry a raw
  //    conceptId of 'app_navigation' (the word "مبتدئ" is also an
  //    app_navigation synonym) while sessionContext.ts has correctly kept
  //    resolvedIntent as the ongoing 'broad_planning' continuation. Only
  //    intentClassifier's own resolution — which already covers a standalone
  //    app_navigation message via analysis.conceptId — may decide this.
  if (resolvedIntent === 'app_navigation') {
    return { mode: 'app_navigation', reason: 'app navigation', isOutOfDomain: false, isBroadBuildIntent: false };
  }

  // 4 / 5. Broad build planning — progressive clarification vs. ready to guide.
  if (resolvedIntent === 'broad_planning') {
    if (pendingClarification !== undefined) {
      return {
        mode: 'clarification_menu',
        reason: 'broad build intent, pending: ' + pendingClarification,
        isOutOfDomain: false,
        isBroadBuildIntent: true,
      };
    }
    return {
      mode: 'build_roadmap',
      reason: 'broad build intent, all clarifications answered',
      isOutOfDomain: false,
      isBroadBuildIntent: false,
    };
  }

  // 6. Out of domain — not FPV at all, and nothing else resolved it.
  if (!analysis.isFpvDomain && analysis.confidence === 'unmatched' && resolvedIntent === 'unknown_or_ambiguous') {
    return { mode: 'clarification_menu', reason: 'out of FPV domain', isOutOfDomain: true, isBroadBuildIntent: false };
  }

  // 7. In FPV domain but no concept matched — ask for clarification.
  if (analysis.confidence === 'unmatched' && resolvedIntent === 'unknown_or_ambiguous') {
    return { mode: 'clarification_menu', reason: 'FPV domain but no concept matched', isOutOfDomain: false, isBroadBuildIntent: false };
  }

  // 8. Definition-style query.
  if (_hasDefinitionPattern(norm)) {
    return { mode: 'definition', reason: 'definition pattern detected', isOutOfDomain: false, isBroadBuildIntent: false };
  }

  // 9. Troubleshooting-style query (older phrase list — motor/ESC/etc.
  //    faults phrased with لا يعمل / مشكلة / etc.).
  if (_hasTroubleshootPattern(norm)) {
    return { mode: 'troubleshooting', reason: 'troubleshooting pattern detected', isOutOfDomain: false, isBroadBuildIntent: false };
  }

  // 10. Default.
  return { mode: 'direct_short_answer', reason: 'general FPV concept query', isOutOfDomain: false, isBroadBuildIntent: false };
}
