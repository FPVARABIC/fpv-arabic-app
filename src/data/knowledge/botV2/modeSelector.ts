/**
 * BOT V2 — Mode selector.
 *
 * Converts QueryAnalysis + V2SafetyResult into a single BotV2AnswerMode.
 * Does NOT compose answers — that is the composer's job.
 */

import { normalizeArabicQuery, type QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2AnswerMode } from './types';
import type { V2SafetyResult } from './safety';

// ── Mode selection result ─────────────────────────────────────────────────────

export interface ModeSelection {
  mode: BotV2AnswerMode;
  reason: string;
  isOutOfDomain: boolean;
}

// ── Pattern lists (pre-normalized at module load) ─────────────────────────────

const _DEFINITION_RAW: readonly string[] = [
  'ما هو ', 'ما هي ', 'شو هو', 'شو هي',
  'يعني ايش', 'يعني شو', 'ما معني', 'كيف يعمل', 'كيف تعمل',
  'explain', 'what is', 'what are', 'definition',
];

const _TROUBLESHOOT_RAW: readonly string[] = [
  'لا يعمل', 'لا تعمل', 'لا يدور', 'لا تدور',
  'لا يظهر', 'لا تظهر', 'لا يحفظ', 'لا تحفظ',
  'لا يتصل', 'لا يرتبط', 'لا استطيع',
  'مشكله', 'خطا', 'بالغلط', 'غلط فيه',
  'not working', 'problem', 'error', 'doesnt work',
  // Gulf forms
  'مايشتغل', 'مو شغال',
];

// These extend what the concept registry already provides via drone_build_basics synonyms,
// specifically catching verb forms that may not have matched any concept synonym.
const _BUILD_EXTRA_RAW: readonly string[] = [
  'كيف ابني', 'كيف اصنع', 'كيف اركب',
  'ابدا الدرون', 'بناء درون', 'بناء كواد',
  'كيف ابني كواد', 'كيف ابدا',
];

const _definitionPhrases = _DEFINITION_RAW.map(normalizeArabicQuery);
const _troubleshootPhrases = _TROUBLESHOOT_RAW.map(normalizeArabicQuery);
const _buildExtraPhrases = _BUILD_EXTRA_RAW.map(normalizeArabicQuery);

function _hasDefinitionPattern(norm: string): boolean {
  return _definitionPhrases.some(p => p.length >= 2 && norm.includes(p));
}

function _hasTroubleshootPattern(norm: string): boolean {
  return _troubleshootPhrases.some(p => p.length >= 2 && norm.includes(p));
}

function _hasBuildExtra(norm: string): boolean {
  return _buildExtraPhrases.some(p => p.length >= 3 && norm.includes(p));
}

// ── Public selector ───────────────────────────────────────────────────────────

/**
 * Returns the answer mode and a human-readable reason for debugging.
 *
 * Rules in priority order:
 *  1. critical safety → safety_first
 *  2. app_navigation concept matched → app_navigation (bypasses FPV/confidence gates)
 *  3. out-of-domain (no FPV, no match) → clarification_menu
 *  4. vague FPV (in domain, no match) → clarification_menu
 *  5. build intent → build_roadmap
 *  6. app / navigation intent → app_navigation
 *  7. definition-style query → definition
 *  8. troubleshooting-style query → troubleshooting
 *  9. default → direct_short_answer
 */
export function selectV2Mode(
  analysis: QueryAnalysis,
  safety: V2SafetyResult,
): ModeSelection {
  const norm = analysis.normalizedQuery;

  // 1. Critical safety overrides everything
  if (safety.riskLevel === 'critical') {
    return { mode: 'safety_first', reason: 'critical safety hazard: ' + (safety.hazard ?? 'unknown'), isOutOfDomain: false };
  }

  // 2. App navigation concept matched — bypass FPV domain and confidence gates.
  // Navigation queries like "من أين أبدأ؟" carry no FPV tokens but are always
  // in-app queries; routing them to clarification_menu would be wrong.
  if (analysis.conceptId === 'app_navigation') {
    return { mode: 'app_navigation', reason: 'app navigation concept matched', isOutOfDomain: false };
  }

  // 3. Out of domain — not FPV at all
  if (!analysis.isFpvDomain && analysis.confidence === 'unmatched') {
    return { mode: 'clarification_menu', reason: 'out of FPV domain', isOutOfDomain: true };
  }

  // 4. In FPV domain but no concept matched — ask for clarification
  if (analysis.confidence === 'unmatched') {
    return { mode: 'clarification_menu', reason: 'FPV domain but no concept matched', isOutOfDomain: false };
  }

  // 5. Build intent (from concept registry OR extra build patterns).
  // Build-extra patterns ("كيف أركب", "كيف أصنع", …) only fire when no specific
  // component concept was matched — otherwise "كيف أركب VTX؟" would incorrectly
  // promote a component installation query to build_roadmap.
  const _buildExtraApplicable =
    analysis.conceptId === undefined || analysis.conceptId === 'drone_build_basics';
  if (
    analysis.intent === 'build_help' ||
    analysis.conceptId === 'drone_build_basics' ||
    (_buildExtraApplicable && _hasBuildExtra(norm))
  ) {
    return { mode: 'build_roadmap', reason: 'build intent: concept=' + analysis.conceptId, isOutOfDomain: false };
  }

  // 6. App navigation (fallback for intent='app_guide' when conceptId differs)
  if (analysis.intent === 'app_guide') {
    return { mode: 'app_navigation', reason: 'app navigation intent', isOutOfDomain: false };
  }

  // 7. Definition-style query
  if (_hasDefinitionPattern(norm)) {
    return { mode: 'definition', reason: 'definition pattern detected', isOutOfDomain: false };
  }

  // 8. Troubleshooting-style query
  if (_hasTroubleshootPattern(norm)) {
    return { mode: 'troubleshooting', reason: 'troubleshooting pattern detected', isOutOfDomain: false };
  }

  // 9. Default
  return { mode: 'direct_short_answer', reason: 'general FPV concept query', isOutOfDomain: false };
}
