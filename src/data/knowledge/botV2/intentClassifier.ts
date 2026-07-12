/**
 * BOT V2 — Intent classifier.
 *
 * Adds a small, deterministic, higher-level Intent taxonomy on top of the
 * EXISTING, unmodified botQueryAnalysis.ts / botConceptRegistry.ts concept
 * matching. Does not replace the concept registry — every existing
 * concept/knowledge-node lookup keyed on BotConceptId still works exactly as
 * before. This module only:
 *
 *  1. Assigns one of the 17 Intent values (broader / more workflow-aware
 *     than the old CONCEPT_INTENT map in botQueryAnalysis.ts).
 *  2. Extracts a small, honest set of entities actually present in the raw
 *     query text — never invents a value that was not written by the user.
 *  3. Recognizes the four new troubleshooting-vocabulary domains (flight /
 *     video / radio / GPS) that the existing FPV_DOMAIN_TOKENS list and
 *     concept synonyms do not cover, and suggests a conceptId override so
 *     downstream knowledge lookup can reuse an EXISTING knowledge node
 *     (betaflight_basics / vtx_basic / receiver_basic / gps_basics) rather
 *     than inventing new knowledge-base content — per the "do not rewrite
 *     the knowledge base" constraint.
 *
 * Action-stage intents (first_power_up, motor_test, lipo_charge,
 * lipo_storage, soldering) are DERIVED from the exact same signal detection
 * contextualWarning.ts already uses for the corresponding warning kinds —
 * by calling classifyContextualWarning() with a non-critical safety input —
 * rather than maintaining a second, independently-drifting phrase list.
 * This guarantees a message classified with intent='motor_test' always
 * receives the motor_test warning treatment, and vice versa.
 */

import { normalizeArabicQuery, type QueryAnalysis } from '../botQueryAnalysis';
import type { BotConceptId } from '../botConceptRegistry';
import { classifyContextualWarning } from './contextualWarning';

// ── Intent taxonomy ────────────────────────────────────────────────────────

export type Intent =
  | 'broad_planning'
  | 'component_selection'
  | 'compatibility_check'
  | 'assembly'
  | 'soldering'
  | 'firmware_configuration'
  | 'first_power_up'
  | 'motor_test'
  | 'lipo_charge'
  | 'lipo_storage'
  | 'flight_troubleshooting'
  | 'video_troubleshooting'
  | 'radio_troubleshooting'
  | 'gps_troubleshooting'
  | 'app_navigation'
  | 'definition'
  | 'unknown_or_ambiguous';

export type Confidence = 'high' | 'medium' | 'low';

export type UseCase = 'racing' | 'cinematic' | 'freestyle' | 'long_range' | 'beginner_practice';
export type FrameSize = '2_inch' | '3.5_inch' | '5_inch' | '7_inch';
export type BatteryVoltage = '2S' | '3S' | '4S' | '6S';
export type ComponentType =
  | 'frame' | 'motor' | 'esc' | 'flight_controller' | 'receiver' | 'vtx' | 'camera' | 'propeller' | 'gps';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ExtractedEntities {
  useCase?: UseCase;
  frameSize?: FrameSize;
  batteryVoltage?: BatteryVoltage;
  componentType?: ComponentType;
  budgetAmount?: number;
  budgetCurrency?: string;
  experienceLevel?: ExperienceLevel;
}

export interface IntentResult {
  intent: Intent;
  confidence: Confidence;
  entities: ExtractedEntities;
  requiresClarification: boolean;
  clarificationReason?: string;
  /**
   * Set only when this message's vocabulary identifies a knowledge concept
   * the EXISTING analyzeQuery() missed (the new troubleshooting domains).
   * engine.ts uses this to override analysis.conceptId before any
   * downstream lookup — no new knowledge-base node is required.
   */
  resolvedConceptId?: BotConceptId;
}

// ── Entity extraction (honest — only what the user actually wrote) ───────

const _norm = (arr: readonly string[]): string[] => arr.map(normalizeArabicQuery);

// MSA only: an informal transliteration of "racing" and an ad-hoc coinage
// for "videography" (not real Arabic words) were removed. The freestyle
// and long-range discipline names below are kept — these are established,
// pan-Arab FPV discipline proper names (like "Betaflight"), not regional
// dialect vocabulary.
const USE_CASE_SIGNALS: Record<UseCase, string[]> = {
  racing: _norm(['سباق', 'racing', 'race']),
  cinematic: _norm(['تصوير', 'سينمائي', 'سينمائى', 'cinematic']),
  freestyle: _norm(['فريستايل', 'freestyle']),
  long_range: _norm(['لونج رينج', 'مسافات طويلة', 'long range', 'longrange']),
  beginner_practice: _norm(['تدريب', 'ممارسة', 'practice', 'تعلم الطيران']),
};

// 'توثبيك'/'toothpick' kept — an established international FPV frame-size
// class name, not regional dialect.
const FRAME_SIZE_SIGNALS: Record<FrameSize, string[]> = {
  '2_inch': _norm(['2 بوصة', '2 inch', 'توثبيك', 'toothpick']),
  '3.5_inch': _norm(['3.5 بوصة', '3.5 inch']),
  '5_inch': _norm(['5 بوصة', '5 inch']),
  '7_inch': _norm(['7 بوصة', '7 inch']),
};

const BATTERY_VOLTAGE_SIGNALS: Record<BatteryVoltage, string[]> = {
  '2S': _norm(['2s']),
  '3S': _norm(['3s']),
  '4S': _norm(['4s']),
  '6S': _norm(['6s']),
};

// MSA only: dropped ad-hoc phonetic Arabic-script transliterations of
// English acronyms/words that already have a correct MSA technical term
// available ('فريم'→'هيكل'; 'موتور'/'موتورات'→'محرك'/'محركات';
// 'الاسك'/'اسك'/'إيسك'→'منظم السرعة'; 'فلايت كنترولر'→'متحكم الطيران';
// 'ريسيفر'/'رسيفر'→'جهاز الاستقبال'). 'كاميرا' and 'جي بي اس' are kept —
// both are standard MSA-dictionary loanword renderings of an already
// English-whitelisted technical term (camera, GPS), not regional dialect.
const COMPONENT_TYPE_SIGNALS: Record<ComponentType, string[]> = {
  frame: _norm(['هيكل', 'frame']),
  motor: _norm(['محرك', 'محركات', 'motor', 'motors']),
  esc: _norm(['esc', 'منظم السرعة']),
  flight_controller: _norm(['fc', 'متحكم الطيران', 'flight controller']),
  receiver: _norm(['جهاز الاستقبال', 'receiver', 'rx']),
  vtx: _norm(['vtx', 'نظام الفيديو', 'مرسل الفيديو', 'كاميرا', 'camera']),
  camera: _norm(['كاميرا', 'camera']),
  propeller: _norm(['مروحة', 'مراوح', 'propeller', 'props', 'prop']),
  gps: _norm(['gps', 'جي بي اس']),
};

const EXPERIENCE_SIGNALS: Record<ExperienceLevel, string[]> = {
  beginner: _norm(['مبتدئ', 'مبتدي', 'جديد', 'أول مرة لي', 'beginner', 'new to this']),
  intermediate: _norm(['متوسط', 'لدي خبرة بسيطة', 'intermediate']),
  advanced: _norm(['محترف', 'خبير', 'advanced', 'experienced']),
};

function _hasAny(norm: string, signals: readonly string[]): boolean {
  return signals.some(s => s.length >= 2 && norm.includes(s));
}

function _matchFirst<T extends string>(norm: string, table: Record<T, string[]>): T | undefined {
  for (const key of Object.keys(table) as T[]) {
    if (_hasAny(norm, table[key])) return key;
  }
  return undefined;
}

// ── Budget extraction — strict, currency-required ──────────────────────────
// A bare number is NEVER treated as a budget by this pure classifier — only
// a number paired with an explicit currency/budget word is. This prevents
// misclassifying "2207" (a motor size), "2025" (a year), or any other bare
// digit sequence as a budget amount. The one narrow exception — a bare
// number accepted specifically because the conversation is currently
// waiting for the budget answer — is handled in sessionContext.ts's
// resolveTurn(), which has access to the prior turn's pendingClarification
// state; this module deliberately has no conversation context and must
// never guess.

const CURRENCY_WORDS: Record<string, string[]> = {
  USD: _norm(['دولار', 'دولارات', 'usd', 'dollar', 'dollars', '$']),
  SAR: _norm(['ريال', 'ريالات', 'sar', 'rial']),
  AED: _norm(['درهم', 'dirham', 'aed']),
};

function _extractBudget(rawQuery: string): { amount?: number; currency?: string } {
  const match = rawQuery.match(/(\d{2,6})/);
  if (!match) return {};
  const norm = normalizeArabicQuery(rawQuery);
  for (const [code, words] of Object.entries(CURRENCY_WORDS)) {
    if (_hasAny(norm, words)) return { amount: Number(match[1]), currency: code };
  }
  // No currency/budget word present — do not record a budget amount.
  return {};
}

function extractEntities(rawQuery: string, norm: string): ExtractedEntities {
  const entities: ExtractedEntities = {};
  const useCase = _matchFirst(norm, USE_CASE_SIGNALS);
  if (useCase) entities.useCase = useCase;
  const frameSize = _matchFirst(norm, FRAME_SIZE_SIGNALS);
  if (frameSize) entities.frameSize = frameSize;
  const batteryVoltage = _matchFirst(norm, BATTERY_VOLTAGE_SIGNALS);
  if (batteryVoltage) entities.batteryVoltage = batteryVoltage;
  const componentType = _matchFirst(norm, COMPONENT_TYPE_SIGNALS);
  if (componentType) entities.componentType = componentType;
  const experienceLevel = _matchFirst(norm, EXPERIENCE_SIGNALS);
  if (experienceLevel) entities.experienceLevel = experienceLevel;
  const budget = _extractBudget(rawQuery);
  if (budget.amount !== undefined) entities.budgetAmount = budget.amount;
  if (budget.currency !== undefined) entities.budgetCurrency = budget.currency;
  return entities;
}

// ── New troubleshooting vocabulary ─────────────────────────────────────────
// Each domain maps to an EXISTING knowledge concept for content lookup — no
// new knowledgeBase.ts node is introduced.

// MSA only: an ad-hoc transliteration of "oscillation" was replaced by
// "تذبذب" (the correct MSA technical term).
const FLIGHT_TROUBLESHOOT_RAW: readonly string[] = [
  'ينقلب عند الإقلاع', 'يقلب عند الإقلاع', 'ينقلب', 'يقلب',
  'اهتزازات', 'اهتزاز', 'تذبذب', 'oscillation', 'oscillating',
];
// MSA only: fixed 'يقطع'→'ينقطع' (correct MSA intransitive "gets cut off"),
// consolidated the hamza-spelling variants of "الإشارة ضعيفة".
const VIDEO_TROUBLESHOOT_RAW: readonly string[] = [
  'الفيديو ينقطع', 'الصورة تنقطع', 'الإشارة ضعيفة', 'weak signal', 'video cuts out',
];
// MSA only: removed an ad-hoc phonetic Arabic-script transliteration of
// the English feature name "failsafe" (an established Betaflight/FPV
// firmware term, kept as-is); fixed the hamza spelling on "الإشارة".
const RADIO_TROUBLESHOOT_RAW: readonly string[] = [
  'failsafe', 'فقدت الإشارة', 'فقدان الإشارة', 'lost signal', 'link loss',
];
const GPS_TROUBLESHOOT_RAW: readonly string[] = [
  'gps rescue لا يعمل', 'rescue لا يعمل', 'rescue mode لا يعمل', 'gps لا يعمل',
];
// Motor troubleshooting phrasing that isn't itself a "motor_test" ACTION
// (removing props / running a test), but a report of a fault — still
// routes to the existing motor_basic knowledge node via troubleshooting mode.
const MOTOR_FAULT_RAW: readonly string[] = [
  'محرك لا يدور', 'محرك يدور بالعكس',
];

const _flightPhrases = _norm(FLIGHT_TROUBLESHOOT_RAW);
const _videoPhrases = _norm(VIDEO_TROUBLESHOOT_RAW);
const _radioPhrases = _norm(RADIO_TROUBLESHOOT_RAW);
const _gpsPhrases = _norm(GPS_TROUBLESHOOT_RAW);
const _motorFaultPhrases = _norm(MOTOR_FAULT_RAW);

// ── Public classifier ──────────────────────────────────────────────────────

/**
 * Pure function of the current message + the existing QueryAnalysis. Has NO
 * dependency on conversation context — multi-turn continuation is entirely
 * sessionContext.ts's responsibility, applied AFTER this function runs.
 */
export function classifyIntent(rawQuery: string, analysis: QueryAnalysis): IntentResult {
  const norm = analysis.normalizedQuery;
  const entities = extractEntities(rawQuery, norm);

  // 1. New troubleshooting vocabulary — checked first since it can identify
  //    a concept the existing analyzeQuery() has no domain token for at all.
  if (_hasAny(norm, _flightPhrases)) {
    return {
      intent: 'flight_troubleshooting', confidence: 'high', entities,
      requiresClarification: false, resolvedConceptId: 'betaflight_basics',
    };
  }
  if (_hasAny(norm, _videoPhrases)) {
    return {
      intent: 'video_troubleshooting', confidence: 'high', entities,
      requiresClarification: false, resolvedConceptId: 'vtx_basic',
    };
  }
  if (_hasAny(norm, _radioPhrases)) {
    return {
      intent: 'radio_troubleshooting', confidence: 'high', entities,
      requiresClarification: false, resolvedConceptId: 'receiver_basic',
    };
  }
  if (_hasAny(norm, _gpsPhrases)) {
    return {
      intent: 'gps_troubleshooting', confidence: 'high', entities,
      requiresClarification: false, resolvedConceptId: 'gps_basics',
    };
  }
  if (_hasAny(norm, _motorFaultPhrases)) {
    return {
      intent: 'flight_troubleshooting', confidence: 'high', entities,
      requiresClarification: false, resolvedConceptId: 'motor_basic',
    };
  }

  // 2. Action-stage intents — reuse contextualWarning.ts's own signal
  //    detection (safety forced to 'none' here: the real critical check
  //    already ran earlier in engine.ts and is not re-derived from this
  //    call). This guarantees intent and warning kind can never disagree.
  const warningProbe = classifyContextualWarning(norm, { riskLevel: 'none' });
  if (warningProbe.warningSeverity === 'caution') {
    switch (warningProbe.warningKind) {
      case 'first_power_up':
        return { intent: 'first_power_up', confidence: 'high', entities, requiresClarification: false };
      case 'motor_test':
        return { intent: 'motor_test', confidence: 'high', entities, requiresClarification: false };
      case 'lipo_charge':
        return { intent: 'lipo_charge', confidence: 'high', entities, requiresClarification: false };
      case 'lipo_storage':
        return { intent: 'lipo_storage', confidence: 'high', entities, requiresClarification: false };
      case 'soldering_polarity':
        return { intent: 'soldering', confidence: 'high', entities, requiresClarification: false };
      default:
        break; // vtx_without_antenna has no dedicated top-level Intent — falls through
    }
  }

  // 3. App navigation / definition — reuse existing concept/intent results.
  if (analysis.conceptId === 'app_navigation') {
    return { intent: 'app_navigation', confidence: 'high', entities, requiresClarification: false };
  }

  // 4. Firmware configuration.
  if (analysis.conceptId === 'betaflight_basics') {
    return { intent: 'firmware_configuration', confidence: 'medium', entities, requiresClarification: false };
  }

  // 5. Broad build planning — matches drone_build_basics with no
  //    already-supplied specificity.
  if (analysis.conceptId === 'drone_build_basics' || analysis.intent === 'build_help') {
    const hasSpecificity =
      entities.useCase !== undefined || entities.frameSize !== undefined || entities.componentType !== undefined;
    if (!hasSpecificity) {
      return {
        intent: 'broad_planning', confidence: 'high', entities,
        requiresClarification: true, clarificationReason: 'no intended use, frame size, or component named yet',
      };
    }
    return { intent: 'broad_planning', confidence: 'high', entities, requiresClarification: false };
  }

  // 6. Component selection — a component concept matched, and the message
  //    reads as a selection/compatibility question rather than an assembly
  //    or wiring action.
  const COMPONENT_CONCEPTS: readonly BotConceptId[] = [
    'motor_basic', 'esc_basic', 'flight_controller_basic', 'receiver_basic', 'vtx_basic', 'propeller_basic',
  ];
  if (analysis.conceptId && COMPONENT_CONCEPTS.includes(analysis.conceptId)) {
    // MSA only: removed a colloquial "works with" phrasing that used a
    // dialectal verb for "works".
    const COMPATIBILITY_RAW = ['يتوافق', 'متوافق', 'يناسب', 'compatible', 'fits'];
    if (_hasAny(norm, _norm(COMPATIBILITY_RAW))) {
      return { intent: 'compatibility_check', confidence: 'medium', entities, requiresClarification: false };
    }
    return { intent: 'component_selection', confidence: 'medium', entities, requiresClarification: false };
  }

  // 7. Wiring/assembly (non-soldering-specific).
  if (analysis.conceptId === 'wiring_basics' || analysis.conceptId === 'tx_rx_rule') {
    return { intent: 'assembly', confidence: 'medium', entities, requiresClarification: false };
  }

  // 8. GPS as a concept (not a troubleshooting complaint) — still GPS-related.
  if (analysis.conceptId === 'gps_basics') {
    return { intent: 'gps_troubleshooting', confidence: 'low', entities, requiresClarification: false };
  }

  // 9. Definition-style / any other matched concept with no clearer intent.
  if (analysis.conceptId) {
    return { intent: 'definition', confidence: 'low', entities, requiresClarification: false };
  }

  // 10. Nothing matched at all.
  return { intent: 'unknown_or_ambiguous', confidence: 'low', entities, requiresClarification: false };
}
