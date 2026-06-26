/**
 * BOT V2 — Strict safety classification.
 *
 * Applies a second-pass safety layer on top of the concept registry's
 * safetyLevel. Critical must override everything with no exceptions.
 *
 * Negative guards (must NOT produce critical):
 *   بدون مراوح | لا توجد مراوح | المراوح غير مركبة | without props | no props
 */

import { normalizeArabicQuery, type QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2RiskLevel } from './types';

// ── Hazard types ──────────────────────────────────────────────────────────────

export type SafetyHazard =
  | 'swollen_lipo'
  | 'smoke_fire'
  | 'sparks'
  | 'overheating'
  | 'props_mounted'
  | 'electrical_danger'
  | 'generic_critical';

export interface V2SafetyResult {
  riskLevel: BotV2RiskLevel;
  hazard?: SafetyHazard;
}

// ── V2-specific critical triggers not in concept registry ─────────────────────

const _V2_CRITICAL_RAW: readonly string[] = [
  // Overheating cable (not battery — already covered by lipo_safety)
  'الكابل يسخن', 'يسخن الكابل', 'سخن الكابل',
  // Reverse polarity
  'قطبيه عكسيه', 'قطبيه معكوسه', 'عكس القطبيه',
  'polarity reversed', 'reverse polarity',
  // First power-on after soldering (especially risky without smoke stopper)
  'اول توصيل بطاريه', 'اول مره بطاريه',
  // Wrong VBAT routed to receiver or 5V rails
  'vbat الي receiver', 'vbat الي rx', 'vbat علي receiver', 'vbat علي rx',
  'وصلت vbat للريسيفر', 'vbat الي 5v', 'vbat علي 5v',
];

const _v2CriticalPhrases: readonly string[] =
  _V2_CRITICAL_RAW.map(normalizeArabicQuery);

// ── Propeller danger phrases (props ON = critical) ────────────────────────────

const _PROP_DANGER_RAW: readonly string[] = [
  'مع مراوح', 'مع مروحه',
  'مراوح مركبه', 'المراوح مركبه',
  'مراوح موجوده', 'مراوح مثبته',
  'props on', 'propellers on',
  // Question form: "هل أختبر المحركات مع مراوح..."
  'المحركات مع مراوح',
  'اختبار المحركات مع',
];

const _propDangerPhrases: readonly string[] =
  _PROP_DANGER_RAW.map(normalizeArabicQuery);

// ── Negative guards — presence of ANY cancels prop-critical ───────────────────

const _PROP_NEGATION_RAW: readonly string[] = [
  'بدون مراوح', 'لا توجد مراوح', 'المراوح غير مركبه',
  'without props', 'no props', 'بدون props', 'بدون مروحه',
];

const _propNegations: readonly string[] =
  _PROP_NEGATION_RAW.map(normalizeArabicQuery);

// ── Hazard sub-classification for lipo/fire ───────────────────────────────────

function _lipoHazard(norm: string): SafetyHazard {
  if (norm.includes('انتفخ') || norm.includes('puffed')) return 'swollen_lipo';
  if (
    norm.includes('دخان') || norm.includes('smoke') ||
    norm.includes('حريق') || norm.includes('fire') ||
    norm.includes('اشتعل') || norm.includes('احترق')
  ) return 'smoke_fire';
  if (norm.includes('شراره') || norm.includes('spark')) return 'sparks';
  if (
    norm.includes('يسخن') || norm.includes('تسخن') ||
    norm.includes('ساخن') || norm.includes('overheating')
  ) return 'overheating';
  return 'generic_critical';
}

// ── Public classifier ─────────────────────────────────────────────────────────

/**
 * Classifies V2 risk for the given query analysis.
 *
 * Priority order:
 *   1. V2-specific electrical danger triggers
 *   2. Propeller danger phrases (with negation guard)
 *   3. Concept registry safetyLevel (already has propeller guard from botQueryAnalysis)
 */
export function classifyV2Risk(analysis: QueryAnalysis): V2SafetyResult {
  const norm = analysis.normalizedQuery;

  // 1. V2-specific triggers (reverse polarity, wrong VBAT, first power-on, hot cable)
  for (const phrase of _v2CriticalPhrases) {
    if (phrase.length >= 2 && norm.includes(phrase)) {
      return { riskLevel: 'critical', hazard: 'electrical_danger' };
    }
  }

  // 2. Propeller danger with explicit negative guard (belt-and-suspenders)
  const hasPropDanger = _propDangerPhrases.some(p => p.length >= 2 && norm.includes(p));
  if (hasPropDanger) {
    const hasNegation = _propNegations.some(p => p.length >= 2 && norm.includes(p));
    if (hasNegation) {
      // "اختبر المحركات بدون مراوح" — safe motor test, not critical
      return { riskLevel: 'low' };
    }
    return { riskLevel: 'critical', hazard: 'props_mounted' };
  }

  // 3. Concept registry result (includes botQueryAnalysis propeller guard)
  if (analysis.safetyLevel === 'critical') {
    const hazard = _lipoHazard(norm);
    return { riskLevel: 'critical', hazard };
  }

  if (analysis.safetyLevel === 'informational') {
    return { riskLevel: 'low' };
  }

  return { riskLevel: 'none' };
}
