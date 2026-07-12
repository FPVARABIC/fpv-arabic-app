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
 *  - warning / warningSeverity / warningKind are NEVER decided in this file
 *    — every branch below spreads the SAME contextualWarning result computed
 *    once in engine.ts (already deduplication-adjusted).
 *  - Progressive broad-build clarification asks exactly ONE question per
 *    turn (session-context driven), never the old four-questions-at-once
 *    text block.
 */

import type { BotConceptId } from '../botConceptRegistry';
import type { QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2Answer, BotV2Chip } from './types';
import type { V2SafetyResult } from './safety';
import type { ContextualWarningResult } from './contextualWarning';
import type { ModeSelection } from './modeSelector';
import type { AklIndexEntry } from './aklLookup';
import type { Intent } from './intentClassifier';
import type { AssistantSessionContext } from './sessionContext';
import {
  getKnowledgeForConcept,
  getKnowledgeChips,
  getKnowledgeLinks,
} from './knowledgeResolver';

// ── Hazard → short answer (main response body for safety_first — distinct
//    from the warning card text, which comes entirely from
//    contextualWarning.ts) ──────────────────────────────────────────────────

const HAZARD_SHORT_ANSWER: Record<string, string> = {
  swollen_lipo:     'بطارية LiPo منتفخة = خطر حريق فوري. أبعدها الآن ولا تشحنها تحت أي ظرف.',
  smoke_fire:       'خطر! دخان أو حريق من الكواد — افصل البطارية فوراً وابتعد عن المنطقة.',
  sparks:           'شرارة تعني اتصال كهربائي خاطئ — افصل البطارية فوراً وافحص التوصيل.',
  overheating:      'سخونة الكابل تعني تيار زائد أو short circuit — افصل البطارية فوراً.',
  props_mounted:    'خطر! اختبار المحركات مع مراوح مركبة يسبب إصابات بالغة. أوقف الآن.',
  electrical_danger:'خطر كهربائي! افصل البطارية الآن وافحص التوصيل والقطبية.',
  generic_critical: 'خطر! أوقف كل شيء وافصل البطارية قبل المتابعة.',
};

// ── Hazard → knowledge concept (steps/chips/links only — warning text for
//    this same mapping lives in contextualWarning.ts) ────────────────────────

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
const _GENERIC_SAFETY_CHIPS: BotV2Chip[] = [
  { label: 'Checklist السلامة', route: '/checklists' },
];

// ── Clarification chips (out-of-domain / vague-FPV — unchanged) ──────────────

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

// ── Progressive broad-build clarification (one question per turn) ────────────

const USE_CASE_LABEL_AR: Record<string, string> = {
  racing: 'سباق', cinematic: 'تصوير سينمائي', freestyle: 'فريستايل',
  long_range: 'مسافات طويلة', beginner_practice: 'تدريب للمبتدئين',
};
const EXPERIENCE_LABEL_AR: Record<string, string> = {
  beginner: 'مبتدئ', intermediate: 'متوسط الخبرة', advanced: 'محترف',
};

const CLARIFY_USE_CASE_CHIPS: BotV2Chip[] = [
  { label: 'سباق', query: 'سباق' },
  { label: 'تصوير سينمائي', query: 'تصوير سينمائي' },
  { label: 'فريستايل', query: 'فريستايل' },
];
const CLARIFY_BUDGET_CHIPS: BotV2Chip[] = [
  { label: 'حوالي 300$', query: '300 دولار' },
  { label: 'حوالي 600$', query: '600 دولار' },
];
const CLARIFY_EXPERIENCE_CHIPS: BotV2Chip[] = [
  { label: 'مبتدئ', query: 'أنا مبتدئ' },
  { label: 'لدي خبرة سابقة', query: 'لدي خبرة سابقة في الطيران' },
];

function composeClarificationStep(pending: 'intended_use' | 'budget' | 'experience_level'): {
  shortAnswer: string;
  chips: BotV2Chip[];
} {
  switch (pending) {
    case 'intended_use':
      return { shortAnswer: 'ما الاستخدام المقصود للدرون؟ (سباق، تصوير سينمائي، فريستايل، مسافات طويلة)', chips: CLARIFY_USE_CASE_CHIPS };
    case 'budget':
      return { shortAnswer: 'ما الميزانية التقريبية؟', chips: CLARIFY_BUDGET_CHIPS };
    case 'experience_level':
      return { shortAnswer: 'هل أنت مبتدئ أم لديك خبرة سابقة؟', chips: CLARIFY_EXPERIENCE_CHIPS };
  }
}

function composeBuildRecommendationIntro(context: AssistantSessionContext): string {
  const parts: string[] = [];
  if (context.intendedUse) parts.push(USE_CASE_LABEL_AR[context.intendedUse] ?? context.intendedUse);
  if (context.budgetAmount !== undefined) {
    parts.push(`ميزانية ${context.budgetAmount}${context.budgetCurrency ? ' ' + context.budgetCurrency : ''}`);
  }
  if (context.experienceLevel) parts.push(EXPERIENCE_LABEL_AR[context.experienceLevel] ?? context.experienceLevel);
  const summary = parts.length > 0 ? `(${parts.join('، ')})` : '';
  return `بناءً على إجابتك ${summary}، إليك خطوات البناء:`.trim();
}

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
  contextualWarning: ContextualWarningResult,
  resolvedIntent: Intent,
  context: AssistantSessionContext,
  aklEntry?: AklIndexEntry,
): BotV2Answer {
  const { mode, isOutOfDomain, isBroadBuildIntent } = modeSelection;
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
    resolvedIntent,
    topicChanged: false, // overwritten by engine.ts with the real value after compose
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
      ...contextualWarning,
      chips: node?.chips ? [...node.chips] : _GENERIC_SAFETY_CHIPS,
      links: node?.internalLinks ? [...node.internalLinks] : [],
      debug,
    };
  }

  // ── build_roadmap ─────────────────────────────────────────────────────────
  if (mode === 'build_roadmap') {
    const node = getKnowledgeForConcept('drone_build_basics');
    const shortAnswer =
      resolvedIntent === 'broad_planning'
        ? composeBuildRecommendationIntro(context)
        : node?.shortAnswer ?? 'لبناء كوادكابتر FPV، ابدأ خطوة بخطوة.';
    return {
      mode,
      conceptId,
      riskLevel: safety.riskLevel,
      shortAnswer,
      steps: node?.steps ? [...node.steps] : [],
      ...contextualWarning,
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
      ...contextualWarning,
      chips: getKnowledgeChips('app_navigation'),
      links: getKnowledgeLinks('app_navigation'),
      debug,
    };
  }

  // ── clarification_menu ────────────────────────────────────────────────────
  if (mode === 'clarification_menu') {
    if (isBroadBuildIntent) {
      const pending = context.pendingClarification ?? 'intended_use';
      const step = composeClarificationStep(pending);
      return {
        mode,
        conceptId,
        riskLevel: 'none',
        shortAnswer: step.shortAnswer,
        ...contextualWarning,
        chips: step.chips,
        links: [],
        debug,
      };
    }
    if (isOutOfDomain) {
      return {
        mode,
        conceptId,
        riskLevel: 'none',
        shortAnswer: 'هذا التطبيق مخصص للـ FPV فقط. هل سؤالك عن بناء الدرون أو الطيران؟',
        ...contextualWarning,
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
      ...contextualWarning,
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
      ...contextualWarning,
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
      ...contextualWarning,
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
    ...contextualWarning,
    chips: conceptId ? getKnowledgeChips(conceptId) : CLARIFICATION_FPV_CHIPS,
    links: conceptId ? getKnowledgeLinks(conceptId) : [],
    debug,
  };
}
