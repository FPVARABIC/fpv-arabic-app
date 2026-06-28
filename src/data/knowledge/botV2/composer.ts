/**
 * BOT V2 — Knowledge-driven answer composer.
 *
 * Consumes the knowledge layer (knowledgeBase → knowledgeResolver) to compose
 * structured answers. Static template constants have been replaced by knowledge
 * node lookups — one source of truth per concept.
 *
 * Rules:
 *  - shortAnswer: max 2 sentences.
 *  - steps: max 6.
 *  - critical answers: cautious + actionable only.
 *  - unmatched: 2–3 clarification chips.
 *  - No external sources in critical safety answers.
 *  - No lesson-body copying — only links/chips.
 */

import type { BotConceptId } from '../botConceptRegistry';
import type { QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2Answer, BotV2Chip } from './types';
import type { V2SafetyResult } from './safety';
import type { ModeSelection } from './modeSelector';
import type { AklIndexEntry } from './aklLookup';
import {
  getKnowledgeForConcept,
  getKnowledgeChips,
  getKnowledgeLinks,
} from './knowledgeResolver';

// ── Hazard → short answer ─────────────────────────────────────────────────────

const HAZARD_SHORT_ANSWER: Record<string, string> = {
  swollen_lipo:     'بطارية LiPo منتفخة = خطر حريق فوري. أبعدها الآن ولا تشحنها تحت أي ظرف.',
  smoke_fire:       'خطر! دخان أو حريق من الكواد — افصل البطارية فوراً وابتعد عن المنطقة.',
  sparks:           'شرارة تعني اتصال كهربائي خاطئ — افصل البطارية فوراً وافحص التوصيل.',
  overheating:      'سخونة الكابل تعني تيار زائد أو short circuit — افصل البطارية فوراً.',
  props_mounted:    'خطر! اختبار المحركات مع مراوح مركبة يسبب إصابات بالغة. أوقف الآن.',
  electrical_danger:'خطر كهربائي! افصل البطارية الآن وافحص التوصيل والقطبية.',
  generic_critical: 'خطر! أوقف كل شيء وافصل البطارية قبل المتابعة.',
};

// ── Hazard → knowledge concept ────────────────────────────────────────────────

const HAZARD_TO_CONCEPT: Partial<Record<string, BotConceptId>> = {
  swollen_lipo:     'lipo_safety',
  smoke_fire:       'lipo_safety',
  sparks:           'wiring_basics',
  overheating:      'wiring_basics',
  props_mounted:    'propeller_basic',
  electrical_danger:'wiring_basics',
  // generic_critical → no concept; uses inline fallback below
};

// ── Fallback for generic_critical (no knowledge node) ────────────────────────

const _GENERIC_SAFETY_STEPS = [
  'افصل البطارية فوراً',
  'افحص المكونات بصرياً',
  'لا تعيد التشغيل حتى تحدد السبب',
];
const _GENERIC_SAFETY_WARNING =
  'لا تتجاهل تحذيرات الأمان — الكوادكابتر يمكن أن يسبب حريقاً أو إصابة.';
const _GENERIC_SAFETY_CHIPS: BotV2Chip[] = [
  { label: 'Checklist السلامة', route: '/checklists' },
];

// ── Clarification chips ───────────────────────────────────────────────────────

const CLARIFICATION_FPV_CHIPS: BotV2Chip[] = [
  { label: 'أريد أبني درون', query: 'كيف أبني درون' },
  { label: 'مشكلة في القطع', query: 'مشكلة في توصيل القطع' },
  { label: 'إعداد Betaflight', query: 'مشكلة في Betaflight' },
];

const CLARIFICATION_OOD_CHIPS: BotV2Chip[] = [
  { label: 'بناء درون FPV', query: 'كيف أبني درون' },
  { label: 'مشاكل التوصيل', query: 'مشكلة في التوصيل' },
  { label: 'إعداد Betaflight', query: 'كيف أفتح Betaflight' },
];

// ── Troubleshoot fallback (used only when no knowledge node is found) ─────────

const DEFAULT_TROUBLESHOOT_STEPS = [
  'افحص التوصيلات بصرياً أولاً',
  'افصل البطارية ثم أعد التوصيل',
  'افتح Betaflight وراجع الـ Errors أو Arming Flags',
  'راجع قسم استكشاف الأعطال في التطبيق',
];

// ── Main composer ─────────────────────────────────────────────────────────────

export function composeV2Answer(
  analysis: QueryAnalysis,
  safety: V2SafetyResult,
  modeSelection: ModeSelection,
  aklEntry?: AklIndexEntry,
): BotV2Answer {
  const { mode, isOutOfDomain } = modeSelection;
  const conceptId = analysis.conceptId;

  const debug = {
    normalizedQuery: analysis.normalizedQuery,
    conceptId,
    matchedTerms: analysis.matchedTerms,
    safetyLevel: analysis.safetyLevel,
    v2RiskLevel: safety.riskLevel,
    confidence: analysis.confidence,
    isFpvDomain: analysis.isFpvDomain,
    modeReason: modeSelection.reason,
  };

  // ── safety_first ──────────────────────────────────────────────────────────
  if (mode === 'safety_first') {
    const hazard = safety.hazard ?? 'generic_critical';
    const shortAnswer = HAZARD_SHORT_ANSWER[hazard] ?? HAZARD_SHORT_ANSWER.generic_critical;
    const nodeConceptId = HAZARD_TO_CONCEPT[hazard];
    const node = nodeConceptId ? getKnowledgeForConcept(nodeConceptId) : undefined;
    return {
      mode,
      conceptId,
      riskLevel: 'critical',
      shortAnswer,
      steps: node?.steps ?? _GENERIC_SAFETY_STEPS,
      warning: node?.safetyNotes ?? _GENERIC_SAFETY_WARNING,
      chips: node?.chips ? [...node.chips] : _GENERIC_SAFETY_CHIPS,
      links: node?.internalLinks ? [...node.internalLinks] : [],
      debug,
    };
  }

  // ── build_roadmap ─────────────────────────────────────────────────────────
  if (mode === 'build_roadmap') {
    const node = getKnowledgeForConcept('drone_build_basics');
    return {
      mode,
      conceptId,
      riskLevel: safety.riskLevel,
      shortAnswer: node?.shortAnswer ?? 'لبناء كوادكابتر FPV، ابدأ خطوة بخطوة.',
      steps: node?.steps ? [...node.steps] : [],
      warning: node?.safetyNotes,
      chips: getKnowledgeChips('drone_build_basics'),
      links: getKnowledgeLinks('drone_build_basics'),
      debug,
    };
  }

  // ── app_navigation ────────────────────────────────────────────────────────
  if (mode === 'app_navigation') {
    const node = getKnowledgeForConcept('app_navigation');
    return {
      mode,
      conceptId,
      riskLevel: 'none',
      shortAnswer: node?.shortAnswer ?? 'التطبيق يحتوي على أقسام مترابطة — ابدأ بالبناء والدروس.',
      steps: node?.steps ? [...node.steps] : [],
      chips: getKnowledgeChips('app_navigation'),
      links: getKnowledgeLinks('app_navigation'),
      debug,
    };
  }

  // ── clarification_menu ────────────────────────────────────────────────────
  if (mode === 'clarification_menu') {
    if (isOutOfDomain) {
      return {
        mode,
        conceptId,
        riskLevel: 'none',
        shortAnswer: 'هذا التطبيق مخصص للـ FPV فقط. هل سؤالك عن بناء الدرون أو الطيران؟',
        chips: CLARIFICATION_OOD_CHIPS,
        links: [],
        debug,
      };
    }
    return {
      mode,
      conceptId,
      riskLevel: 'none',
      shortAnswer: 'سؤالك عن FPV — اختر ما يناسبك:',
      chips: CLARIFICATION_FPV_CHIPS,
      links: [],
      debug,
    };
  }

  // ── definition ────────────────────────────────────────────────────────────
  if (mode === 'definition') {
    const node = conceptId ? getKnowledgeForConcept(conceptId) : undefined;
    const shortAnswer =
      aklEntry?.shortAnswer ??
      node?.shortAnswer ??
      'لم أجد تعريفاً محدداً لهذا المصطلح في قاعدة المعرفة.';
    const steps = aklEntry?.explanation
      ? [aklEntry.explanation]
      : node?.beginnerExplanation
      ? [node.beginnerExplanation]
      : undefined;
    return {
      mode,
      conceptId,
      riskLevel: safety.riskLevel,
      shortAnswer,
      steps,
      chips: conceptId ? getKnowledgeChips(conceptId) : CLARIFICATION_FPV_CHIPS,
      links: conceptId ? getKnowledgeLinks(conceptId) : [],
      debug,
    };
  }

  // ── troubleshooting ───────────────────────────────────────────────────────
  if (mode === 'troubleshooting') {
    const node = conceptId ? getKnowledgeForConcept(conceptId) : undefined;
    const steps = node?.steps ?? DEFAULT_TROUBLESHOOT_STEPS;
    return {
      mode,
      conceptId,
      riskLevel: safety.riskLevel,
      shortAnswer: 'إليك خطوات التحقق من المشكلة:',
      steps: steps.slice(0, 6),
      chips: conceptId ? getKnowledgeChips(conceptId) : CLARIFICATION_FPV_CHIPS,
      links: conceptId ? getKnowledgeLinks(conceptId) : [],
      debug,
    };
  }

  // ── direct_short_answer (default) ─────────────────────────────────────────
  const node = conceptId ? getKnowledgeForConcept(conceptId) : undefined;
  return {
    mode: 'direct_short_answer',
    conceptId,
    riskLevel: safety.riskLevel,
    shortAnswer:
      node?.shortAnswer ??
      aklEntry?.shortAnswer ??
      'لم أجد إجابة محددة. جرب صياغة سؤالك بشكل مختلف.',
    chips: conceptId ? getKnowledgeChips(conceptId) : CLARIFICATION_FPV_CHIPS,
    links: conceptId ? getKnowledgeLinks(conceptId) : [],
    debug,
  };
}
