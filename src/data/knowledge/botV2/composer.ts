/**
 * BOT V2 — Template-based answer composer.
 *
 * Rules:
 *  - shortAnswer: max 2 sentences.
 *  - steps: max 6.
 *  - critical answers: cautious + actionable only.
 *  - unmatched: 2–3 clarification chips.
 *  - No external sources in critical safety answers.
 *  - No lesson-body copying — only links/chips.
 */

import { getConceptById, type BotConceptId } from '../botConceptRegistry';
import type { QueryAnalysis } from '../botQueryAnalysis';
import type { BotV2Answer, BotV2Chip, BotV2Link } from './types';
import type { V2SafetyResult } from './safety';
import type { ModeSelection } from './modeSelector';

// ── Build roadmap content (spec-defined) ──────────────────────────────────────

const BUILD_ROADMAP_ANSWER = {
  shortAnswer: 'لبناء كوادكابتر FPV، ابدأ خطوة بخطوة — لا تتعجل ولا تركب المراوح إلا بعد إتمام جميع الاختبارات.',
  steps: [
    'اختر الهدف والحجم (ننصح بـ 5 بوصة للمبتدئ)',
    'افهم القطع الأساسية: FC، ESC، محركات، ريسيفر، VTX',
    'راجع الكهرباء والتوصيل: GND و5V وVBAT وTX/RX',
    'جمّع بدون تركيب المراوح — اختبر الكهرباء أولاً',
    'اختبر عبر Betaflight و Checklist قبل أي طيران',
  ],
  warning: 'لا توصل البطارية قبل استخدام Smoke Stopper. لا تركب المراوح أثناء اختبار المحركات أبداً.',
  chips: [
    { label: 'ابدأ بخريطة الدروس', route: '/roadmap' },
    { label: 'افتح Checklist قبل الشراء', route: '/checklists' },
    { label: 'تعلّم الكهرباء أولاً', route: '/lessons/lesson-8' },
  ] as BotV2Chip[],
  links: [
    { label: 'خريطة البناء', route: '/roadmap' },
  ] as BotV2Link[],
} as const;

// ── Safety templates ──────────────────────────────────────────────────────────

const SAFETY_TEMPLATES: Record<string, {
  shortAnswer: string;
  steps: string[];
  warning: string;
  chips: BotV2Chip[];
}> = {
  swollen_lipo: {
    shortAnswer: 'بطارية LiPo منتفخة = خطر حريق فوري. أبعدها الآن ولا تشحنها تحت أي ظرف.',
    steps: [
      'لا تشحنها ولا تستخدمها أبداً',
      'أبعدها فوراً عن المواد القابلة للاشتعال',
      'ضعها في مكان مفتوح ومعزول (خارج المنزل)',
      'انتظر 30–60 دقيقة ثم تخلص منها في مركز إعادة تدوير',
    ],
    warning: 'لا تترك بطارية LiPo منتفخة بلا رقابة. لا تضعها في القمامة العادية.',
    chips: [{ label: 'درس سلامة البطاريات', route: '/lessons/lesson-10' }],
  },
  smoke_fire: {
    shortAnswer: 'خطر! دخان أو حريق من الكواد — افصل البطارية فوراً وابتعد عن المنطقة.',
    steps: [
      'افصل البطارية فوراً إن كان آمناً',
      'ابتعد عن المنطقة',
      'لا تستخدم ماءً على بطارية LiPo',
      'اتصل بالإسعاف إن كان هناك حريق فعلي',
      'لا تعد للجهاز حتى تتأكد من الأمان الكامل',
    ],
    warning: 'الدخان من LiPo سام. ابتعد وهوّد المكان فوراً.',
    chips: [{ label: 'درس السلامة', route: '/lessons/lesson-10' }],
  },
  sparks: {
    shortAnswer: 'شرارة تعني اتصال كهربائي خاطئ — افصل البطارية فوراً وافحص التوصيل.',
    steps: [
      'افصل البطارية فوراً',
      'افحص القطبية (+ و-) قبل إعادة التوصيل',
      'افحص أي short circuit بالمولتيمتر',
      'لا تعيد التوصيل حتى تتأكد من السبب',
    ],
    warning: 'الشرارة المتكررة تعني وجود short circuit — تالف المكونات أو خطر حريق.',
    chips: [{ label: 'Checklist قبل البطارية', route: '/checklists' }],
  },
  overheating: {
    shortAnswer: 'سخونة الكابل تعني تيار زائد أو short circuit — افصل البطارية فوراً.',
    steps: [
      'افصل البطارية فوراً',
      'انتظر حتى يبرد الكابل تماماً',
      'افحص سماكة الكابل وقدرته على التيار',
      'افحص أي solder bridge أو short circuit',
    ],
    warning: 'الكابل الساخن خلال دقائق يعني مشكلة خطيرة في الكهرباء.',
    chips: [{ label: 'درس التوصيل', route: '/lessons/lesson-8' }],
  },
  props_mounted: {
    shortAnswer: 'خطر! اختبار المحركات مع مراوح مركبة يسبب إصابات بالغة. أوقف الآن.',
    steps: [
      'أوقف الاختبار فوراً',
      'افصل البطارية',
      'أزل جميع المراوح',
      'أعد الاختبار بدون مراوح عبر Betaflight Motors Tab',
      'ركب المراوح فقط بعد اجتياز Checklist كامل',
    ],
    warning: 'لا تختبر المحركات أبداً وهي مراوح مركبة — تسبب إصابة بالغة في الأصابع.',
    chips: [{ label: 'Checklist السلامة', route: '/checklists' }],
  },
  electrical_danger: {
    shortAnswer: 'خطر كهربائي! افصل البطارية الآن وافحص التوصيل والقطبية.',
    steps: [
      'افصل البطارية فوراً',
      'افحص القطبية (+ و-) على كل موصل',
      'افحص سخونة الأسلاك',
      'لا توصل البطارية حتى تصحح المشكلة',
    ],
    warning: 'القطبية العكسية أو VBAT على مدخل 5V يتلف المكونات بشكل دائم.',
    chips: [{ label: 'درس الكهرباء', route: '/lessons/lesson-8' }],
  },
  generic_critical: {
    shortAnswer: 'خطر! أوقف كل شيء وافصل البطارية قبل المتابعة.',
    steps: [
      'افصل البطارية فوراً',
      'افحص المكونات بصرياً',
      'لا تعيد التشغيل حتى تحدد السبب',
    ],
    warning: 'لا تتجاهل تحذيرات الأمان — الكوادكابتر يمكن أن يسبب حريقاً أو إصابة.',
    chips: [{ label: 'Checklist السلامة', route: '/checklists' }],
  },
};

// ── Troubleshooting steps per concept ─────────────────────────────────────────

const TROUBLESHOOT_STEPS: Partial<Record<BotConceptId, string[]>> = {
  receiver_basic: [
    'تحقق من توصيل 5V وGND للريسيفر',
    'تأكد: TX من الريسيفر → RX في الـ FC (ليس TX→TX)',
    'فعّل Serial RX على UART الصحيح في Betaflight Ports',
    'اختر Protocol الصحيح (CRSF لـ ELRS / SBUS للأجهزة الأخرى)',
    'تأكد من إتمام Binding بين جهاز التحكم والريسيفر',
  ],
  tx_rx_rule: [
    'TX من الريسيفر → RX في الـ FC',
    'RX من الريسيفر → TX في الـ FC',
    'لا تصل TX بـ TX ولا RX بـ RX أبداً',
    'فعّل Serial RX في Betaflight Ports Tab',
    'اختر CRSF لـ ELRS أو SBUS للأجهزة الأخرى',
  ],
  esc_basic: [
    'افصل البطارية أولاً',
    'افحص أسلاك البطارية للـ ESC (VBAT وGND)',
    'افتح Motors Tab في Betaflight وافق على التحذير',
    'تحقق من Motor Protocol (DSHOT300 أو DSHOT600)',
    'افحص اللحام على أسلاك الموتور',
  ],
  motor_basic: [
    'افصل البطارية أولاً ثم أزل المراوح',
    'افتح Motors Tab في Betaflight وحرك شريط الموتور',
    'تحقق من اتجاه دوران كل موتور (CW/CCW)',
    'افحص أسلاك الموتور على الـ ESC',
    'تحقق من DSHOT Protocol في Configuration Tab',
  ],
  flight_controller_basic: [
    'جرب كابل USB آخر (المشكلة الأكثر شيوعاً)',
    'تحقق من تثبيت Drivers على الحاسوب',
    'تحقق من عدم وجود قصيرة على الـ FC',
    'حاول DFU Mode إن لم يُتعرف على الـ FC',
  ],
  betaflight_basics: [
    'اضغط Save بعد كل تغيير (ليس فقط Apply)',
    'جرب كابل USB آخر إن لم يتصل الـ FC',
    'تحقق من Serial RX في Ports لمشاكل الريسيفر',
    'تحقق من Motor Protocol لمشاكل المحركات',
    'راجع Arming Flags في Status Tab للـ Arm',
  ],
  vtx_basic: [
    'تحقق من توصيل VBAT وGND للـ VTX',
    'تحقق من تردد النظارة والـ VTX (مثلاً 5.8GHz)',
    'تحقق من إعدادات OSD في Betaflight',
    'افحص الكاميرا وكابل الفيديو',
  ],
  wiring_basics: [
    'افحص GND المشترك بين جميع المكونات',
    'تحقق من القطبية على كل موصل بالمولتيمتر',
    'افحص continuity بالمولتيمتر بين VBAT وGND',
    'تحقق من TX/RX مع الريسيفر والـ FC',
  ],
};

const DEFAULT_TROUBLESHOOT_STEPS = [
  'افحص التوصيلات بصرياً أولاً',
  'افصل البطارية ثم أعد التوصيل',
  'افتح Betaflight وراجع الـ Errors أو Arming Flags',
  'راجع قسم استكشاف الأعطال في التطبيق',
];

// ── App navigation templates ──────────────────────────────────────────────────

const APP_NAV_ANSWER = {
  shortAnswer: 'التطبيق يحتوي على أقسام مترابطة — ابدأ بالبناء والدروس ثم Betaflight.',
  steps: [
    'قسم البناء: خريطة طريق كاملة خطوة بخطوة',
    'قسم الدروس: 18 درساً من الأساسيات للطيران',
    'قسم Betaflight: إعداد الـ FC خطوة بخطوة',
    'قسم الـ Checklist: تحقق قبل الشراء والتجميع والطيران',
    'المساعد: اطرح أي سؤال وسأرشدك',
  ],
  chips: [
    { label: 'ابدأ من خريطة البناء', route: '/roadmap' },
    { label: 'افتح الدروس', route: '/lessons/lesson-1' },
    { label: 'افتح Checklist', route: '/checklists' },
  ] as BotV2Chip[],
  links: [
    { label: 'خريطة البناء', route: '/roadmap' },
    { label: 'الدروس', route: '/lessons/lesson-1' },
  ] as BotV2Link[],
};

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

// ── Direct answer helpers ─────────────────────────────────────────────────────

function _shortAnswerForConcept(conceptId: BotConceptId | undefined): string {
  if (!conceptId) return 'لم أجد إجابة محددة. جرب صياغة سؤالك بشكل مختلف.';
  const concept = getConceptById(conceptId);
  return concept?.shortDefinition ?? 'يُرجى الرجوع إلى قسم التطبيق المناسب.';
}

function _chipsForConcept(conceptId: BotConceptId | undefined): BotV2Chip[] {
  if (!conceptId) return CLARIFICATION_FPV_CHIPS;
  const concept = getConceptById(conceptId);
  if (!concept?.relatedConcepts?.length) return [];
  return concept.relatedConcepts.slice(0, 3).map(id => ({
    label: getConceptById(id)?.labelAr ?? id,
    query: getConceptById(id)?.labelAr ?? id,
  }));
}

// ── Main composer ─────────────────────────────────────────────────────────────

export function composeV2Answer(
  analysis: QueryAnalysis,
  safety: V2SafetyResult,
  modeSelection: ModeSelection,
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
    const tpl = SAFETY_TEMPLATES[hazard] ?? SAFETY_TEMPLATES.generic_critical;
    return {
      mode,
      riskLevel: 'critical',
      shortAnswer: tpl.shortAnswer,
      steps: tpl.steps,
      warning: tpl.warning,
      chips: tpl.chips,
      links: [],
      debug,
    };
  }

  // ── build_roadmap ─────────────────────────────────────────────────────────
  if (mode === 'build_roadmap') {
    return {
      mode,
      riskLevel: safety.riskLevel,
      shortAnswer: BUILD_ROADMAP_ANSWER.shortAnswer,
      steps: [...BUILD_ROADMAP_ANSWER.steps],
      warning: BUILD_ROADMAP_ANSWER.warning,
      chips: [...BUILD_ROADMAP_ANSWER.chips],
      links: [...BUILD_ROADMAP_ANSWER.links],
      debug,
    };
  }

  // ── app_navigation ────────────────────────────────────────────────────────
  if (mode === 'app_navigation') {
    return {
      mode,
      riskLevel: 'none',
      shortAnswer: APP_NAV_ANSWER.shortAnswer,
      steps: [...APP_NAV_ANSWER.steps],
      chips: [...APP_NAV_ANSWER.chips],
      links: [...APP_NAV_ANSWER.links],
      debug,
    };
  }

  // ── clarification_menu ────────────────────────────────────────────────────
  if (mode === 'clarification_menu') {
    if (isOutOfDomain) {
      return {
        mode,
        riskLevel: 'none',
        shortAnswer: 'هذا التطبيق مخصص للـ FPV فقط. هل سؤالك عن بناء الدرون أو الطيران؟',
        chips: CLARIFICATION_OOD_CHIPS,
        links: [],
        debug,
      };
    }
    return {
      mode,
      riskLevel: 'none',
      shortAnswer: 'سؤالك عن FPV — اختر ما يناسبك:',
      chips: CLARIFICATION_FPV_CHIPS,
      links: [],
      debug,
    };
  }

  // ── definition ────────────────────────────────────────────────────────────
  if (mode === 'definition') {
    const concept = conceptId ? getConceptById(conceptId) : undefined;
    const shortAnswer = concept?.shortDefinition
      ? concept.shortDefinition
      : 'لم أجد تعريفاً محدداً لهذا المصطلح في قاعدة المعرفة.';
    return {
      mode,
      riskLevel: safety.riskLevel,
      shortAnswer,
      chips: _chipsForConcept(conceptId),
      links: [],
      debug,
    };
  }

  // ── troubleshooting ───────────────────────────────────────────────────────
  if (mode === 'troubleshooting') {
    const steps =
      (conceptId && TROUBLESHOOT_STEPS[conceptId]) ?? DEFAULT_TROUBLESHOOT_STEPS;
    return {
      mode,
      riskLevel: safety.riskLevel,
      shortAnswer: 'إليك خطوات التحقق من المشكلة:',
      steps: steps.slice(0, 6),
      chips: _chipsForConcept(conceptId),
      links: [],
      debug,
    };
  }

  // ── direct_short_answer (default) ─────────────────────────────────────────
  return {
    mode: 'direct_short_answer',
    riskLevel: safety.riskLevel,
    shortAnswer: _shortAnswerForConcept(conceptId),
    chips: _chipsForConcept(conceptId),
    links: [],
    debug,
  };
}
