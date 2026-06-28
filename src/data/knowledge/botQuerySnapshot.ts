/**
 * BOT PHASE -1 — Baseline Query Snapshot
 *
 * 50 representative queries covering all major concept groups.
 * Recorded BEFORE any Phase 0+ vocabulary / routing changes.
 *
 * DO NOT delete or modify this file when making code changes.
 * Extend it by adding entries; do not mutate existing ones.
 */

export interface BotQuerySnapshot {
  id: string;
  category:
    | 'build'
    | 'esc'
    | 'fc'
    | 'rx'
    | 'vtx'
    | 'safety'
    | 'betaflight'
    | 'vague'
    | 'mixed'
    | 'out_of_domain'
    | 'navigation';
  query: string;
  nluIntent: string;
  isFpv: boolean;
  interceptFires: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'core';
  expectedAnswerMode:
    | 'app_guide'
    | 'clarification_menu'
    | 'safety_halt'
    | 'out_of_domain'
    | 'bank'
    | 'beginner_guidance'
    | 'betaflight_broad'
    | 'general_guidance'
    | 'advanced_technical'
    | 'concept_explanation'
    | 'troubleshooting_core'
    | 'no_match';
  answerShouldContain?: string[];
  answerShouldNotContain?: string[];
  knownIssue?: string;
}

export const botQuerySnapshot: BotQuerySnapshot[] = [
  // ── Category: build ────────────────────────────────────────────────────────

  {
    id: 'BL-BUILD-01',
    category: 'build',
    query: 'كيف أصنع درون؟',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    answerShouldNotContain: ['نظام ديناميكي', 'قوى وعزوم'],
    knownIssue:
      'Gap 1+6: "أصنع" absent from INTENT_RULES and synonymGroups.build → intent stays unclear; ch01 physics text returned via encyclopedia.',
  },
  {
    id: 'BL-BUILD-02',
    category: 'build',
    query: 'أريد أصنع كوادكابتر',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: 'Gap 1: "أصنع" not classified as build_help; falls to encyclopedia.',
  },
  {
    id: 'BL-BUILD-03',
    category: 'build',
    query: 'أريد أبني درون',
    nluIntent: 'build_help',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    answerShouldContain: ['بناء', 'كواد'],
    knownIssue:
      'Gap 6: build_help intent fires but no BUILD_ROADMAP mode exists; falls to formatGeneralGuidanceMode which may return encyclopedia text.',
  },
  {
    id: 'BL-BUILD-04',
    category: 'build',
    query: 'كيف أبني درون من الصفر؟',
    nluIntent: 'build_help',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    answerShouldContain: ['بناء'],
  },
  {
    id: 'BL-BUILD-05',
    category: 'build',
    query: 'خطوات تجميع الكواد',
    nluIntent: 'build_help',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
  },
  {
    id: 'BL-BUILD-06',
    category: 'build',
    query: 'تركيب الدرون',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"تركيب" not in INTENT_RULES → unclear; may return clarification or encyclopedia.',
  },
  {
    id: 'BL-BUILD-07',
    category: 'build',
    query: 'بناء كوادكابتر للمبتدئين',
    nluIntent: 'beginner_start',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'beginner_guidance',
    answerShouldContain: ['مبتدئ'],
  },

  // ── Category: esc ──────────────────────────────────────────────────────────

  {
    id: 'BL-ESC-01',
    category: 'esc',
    query: 'كيف أوصل ESC؟',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['ESC', 'توصيل'],
  },
  {
    id: 'BL-ESC-02',
    category: 'esc',
    query: 'ال ESC لا يعمل',
    nluIntent: 'esc',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'troubleshooting_core',
  },
  {
    id: 'BL-ESC-03',
    category: 'esc',
    query: 'وصلت ESC بالغلط',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"وصلت" not in INTENT_RULES; no correction trigger for ESC-specific mis-wiring.',
  },
  {
    id: 'BL-ESC-04',
    category: 'esc',
    query: 'dshot شو هو؟',
    nluIntent: 'motors',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'advanced_technical',
    answerShouldNotContain: ['قوى', 'نموذج'],
    knownIssue:
      'Gap 3: "dshot" in advancedTerms → bank bypassed; encyclopedia returned instead of practical KB-ESC-003.',
  },
  {
    id: 'BL-ESC-05',
    category: 'esc',
    query: 'ما هو ESC؟',
    nluIntent: 'definition',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'concept_explanation',
    answerShouldContain: ['ESC', 'سرعة'],
  },

  // ── Category: fc ───────────────────────────────────────────────────────────

  {
    id: 'BL-FC-01',
    category: 'fc',
    query: 'كيف أوصل FC؟',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['FC', 'توصيل'],
  },
  {
    id: 'BL-FC-02',
    category: 'fc',
    query: 'ال FC لا يتصل ببيتافلايت',
    nluIntent: 'betaflight',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'troubleshooting_core',
  },
  {
    id: 'BL-FC-03',
    category: 'fc',
    query: 'الفلايت كنترولر كيف أعيّنه؟',
    nluIntent: 'flight_controller',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
  },
  {
    id: 'BL-FC-04',
    category: 'fc',
    query: 'flight controller إعداد',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"flight controller" has no direct INTENT_RULES entry; only "fc" token maps there.',
  },

  // ── Category: rx ───────────────────────────────────────────────────────────

  {
    id: 'BL-RX-01',
    category: 'rx',
    query: 'كيف أوصل الريسيفر؟',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['ريسيفر', 'توصيل'],
  },
  {
    id: 'BL-RX-02',
    category: 'rx',
    query: 'TX/RX كيف أوصلهم؟',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['TX', 'RX'],
  },
  {
    id: 'BL-RX-03',
    category: 'rx',
    query: 'ELRS إعداد',
    nluIntent: 'receiver',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['ELRS'],
  },
  {
    id: 'BL-RX-04',
    category: 'rx',
    query: 'UART شو هو؟',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    knownIssue:
      'Gap-dialect: "شو هو" (Gulf dialect for "ما هو") not mapped to definition intent; ' +
      'classified as wiring → bank searched for UART. ' +
      'Desired future mode: concept_explanation (requires definition intent fix).',
  },
  {
    id: 'BL-RX-05',
    category: 'rx',
    query: 'وصلت TX إلى TX',
    nluIntent: 'tx_rx',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['TX', 'RX', 'تصحيح'],
  },

  // ── Category: vtx ──────────────────────────────────────────────────────────

  {
    id: 'BL-VTX-01',
    category: 'vtx',
    query: 'كيف أركب VTX؟',
    nluIntent: 'vtx_video',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['VTX'],
  },
  {
    id: 'BL-VTX-02',
    category: 'vtx',
    query: 'لا توجد صورة في النظارة',
    nluIntent: 'vtx_video',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'troubleshooting_core',
  },
  {
    id: 'BL-VTX-03',
    category: 'vtx',
    query: 'نظام الفيديو FPV',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"نظام الفيديو" not in INTENT_RULES or synonym groups; classified unclear.',
  },

  // ── Category: safety ───────────────────────────────────────────────────────

  {
    id: 'BL-SAFE-01',
    category: 'safety',
    query: 'البطارية انتفخت',
    nluIntent: 'lipo_safety',
    isFpv: true,
    interceptFires: 'E',
    expectedAnswerMode: 'safety_halt',
    answerShouldContain: ['بطارية', 'أمان'],
    answerShouldNotContain: ['كوادكابتر', 'نموذج'],
  },
  {
    id: 'BL-SAFE-02',
    category: 'safety',
    query: 'دخان من الدرون',
    nluIntent: 'safety_warning',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'no_match',
    knownIssue:
      'safety_warning intent has no dedicated intercept (only lipo_safety has intercept E); falls to core which may not produce a safety halt.',
  },
  {
    id: 'BL-SAFE-03',
    category: 'safety',
    query: 'كيف أشحن LiPo بأمان؟',
    nluIntent: 'power_battery',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['LiPo', 'شحن'],
  },
  {
    id: 'BL-SAFE-04',
    category: 'safety',
    query: 'هل أختبر المحركات مع مراوح مركبة؟',
    nluIntent: 'safety_warning',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['مراوح', 'بدون'],
  },
  {
    id: 'BL-SAFE-05',
    category: 'safety',
    query: 'الكابل يسخن عند التوصيل',
    nluIntent: 'safety_warning',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'no_match',
    knownIssue: 'Gap 1: "يسخن" in INTENT_RULES fires safety_warning but no intercept handles it.',
  },

  // ── Category: betaflight ───────────────────────────────────────────────────

  {
    id: 'BL-BF-01',
    category: 'betaflight',
    query: 'كيف أفتح بيتافلايت؟',
    nluIntent: 'betaflight',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'betaflight_broad',
    answerShouldContain: ['Betaflight'],
  },
  {
    id: 'BL-BF-02',
    category: 'betaflight',
    query: 'betaflight لا يحفظ الإعدادات',
    nluIntent: 'betaflight',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'troubleshooting_core',
    answerShouldContain: ['Betaflight', 'حفظ'],
  },
  {
    id: 'BL-BF-03',
    category: 'betaflight',
    query: 'ضبط PID',
    nluIntent: 'betaflight',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'advanced_technical',
    knownIssue:
      'Gap 3: "pid" in advancedTerms → bank bypassed → encyclopedia ch07 returned (theoretical, not practical).',
  },
  {
    id: 'BL-BF-04',
    category: 'betaflight',
    query: 'CLI في betaflight',
    nluIntent: 'betaflight',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'advanced_technical',
    knownIssue: 'Gap 3: "cli" in advancedTerms → bank bypassed.',
  },
  {
    id: 'BL-BF-05',
    category: 'betaflight',
    query: 'Motor Test بدون مراوح',
    nluIntent: 'motors',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'clarification_menu',
    answerShouldContain: ['مراوح'],
  },

  // ── Category: vague ────────────────────────────────────────────────────────

  {
    id: 'BL-VAGUE-01',
    category: 'vague',
    query: 'الدرون لا يطير',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"لا يطير" not in INTENT_RULES; classified unclear → no clarification menu fires.',
  },
  {
    id: 'BL-VAGUE-02',
    category: 'vague',
    query: 'عندي مشكلة',
    nluIntent: 'troubleshooting',
    isFpv: false,
    interceptFires: 'C',
    expectedAnswerMode: 'out_of_domain',
    knownIssue:
      'Intercept C fires: non-FPV troubleshooting → buildNoDomainProblemResponse. If user meant FPV, domain was lost.',
  },
  {
    id: 'BL-VAGUE-03',
    category: 'vague',
    query: 'درون',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'B',
    expectedAnswerMode: 'clarification_menu',
    answerShouldContain: ['ما الذي تريد'],
  },
  {
    id: 'BL-VAGUE-04',
    category: 'vague',
    query: 'مشكلة!!!',
    nluIntent: 'troubleshooting',
    isFpv: false,
    interceptFires: 'C',
    expectedAnswerMode: 'out_of_domain',
  },

  // ── Category: mixed (Arabic-English) ──────────────────────────────────────

  {
    id: 'BL-MIXED-01',
    category: 'mixed',
    query: 'ال FC وين أوصله',
    nluIntent: 'flight_controller',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    knownIssue:
      '"وين أوصله" (Gulf: where do I connect it) not in wiring patterns; fc intent fires instead of wiring.',
  },
  {
    id: 'BL-MIXED-02',
    category: 'mixed',
    query: 'وصلت ESC على VBAT',
    nluIntent: 'power_battery',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    knownIssue:
      'correctionTriggers only covers "ريسيفر على vbat", not "esc على vbat" — no correction fires for this mis-wiring.',
  },
  {
    id: 'BL-MIXED-03',
    category: 'mixed',
    query: 'TX/RX غلط فيه',
    nluIntent: 'unclear',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'general_guidance',
    knownIssue: '"TX/RX غلط" not in correctionTriggers or tx_rx INTENT_RULES patterns.',
  },
  {
    id: 'BL-MIXED-04',
    category: 'mixed',
    query: 'ESC DSHOT شو هو',
    nluIntent: 'motors',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'advanced_technical',
    knownIssue: '"dshot" in advancedTerms → bank bypassed; encyclopedia returned.',
  },
  {
    id: 'BL-MIXED-05',
    category: 'mixed',
    query: 'UART TX2 كيف أفعّله',
    nluIntent: 'wiring',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'bank',
    answerShouldContain: ['UART'],
  },

  // ── Category: out_of_domain ────────────────────────────────────────────────

  {
    id: 'BL-OOD-01',
    category: 'out_of_domain',
    query: 'ما هي عاصمة فرنسا؟',
    nluIntent: 'definition',
    isFpv: false,
    interceptFires: 'core',
    expectedAnswerMode: 'out_of_domain',
    answerShouldContain: ['FPV', 'مخصص'],
  },
  {
    id: 'BL-OOD-02',
    category: 'out_of_domain',
    query: 'كيف أطبخ رز؟',
    nluIntent: 'unclear',
    isFpv: false,
    interceptFires: 'core',
    expectedAnswerMode: 'out_of_domain',
    answerShouldContain: ['FPV', 'مخصص'],
  },
  {
    id: 'BL-OOD-03',
    category: 'out_of_domain',
    query: 'الطقس اليوم',
    nluIntent: 'out_of_domain',
    isFpv: false,
    interceptFires: 'D',
    expectedAnswerMode: 'out_of_domain',
    answerShouldContain: ['FPV', 'مخصص'],
  },
  {
    id: 'BL-OOD-04',
    category: 'out_of_domain',
    query: 'أخبرني عن الذكاء الاصطناعي',
    nluIntent: 'unclear',
    isFpv: false,
    interceptFires: 'core',
    expectedAnswerMode: 'out_of_domain',
    answerShouldContain: ['FPV', 'مخصص'],
  },

  // ── Category: navigation ───────────────────────────────────────────────────

  {
    id: 'BL-NAV-01',
    category: 'navigation',
    query: 'من أين أبدأ؟',
    nluIntent: 'app_guide',
    isFpv: false,
    interceptFires: 'A',
    expectedAnswerMode: 'app_guide',
    answerShouldContain: ['البناء', 'الدروس'],
  },
  {
    id: 'BL-NAV-02',
    category: 'navigation',
    query: 'ما الخطوة التالية؟',
    nluIntent: 'next_step',
    isFpv: false,
    interceptFires: 'G',
    expectedAnswerMode: 'app_guide',
    answerShouldContain: ['مرحلة'],
  },
  {
    id: 'BL-NAV-03',
    category: 'navigation',
    query: 'أنا جديد على FPV',
    nluIntent: 'beginner_start',
    isFpv: true,
    interceptFires: 'core',
    expectedAnswerMode: 'beginner_guidance',
    answerShouldContain: ['مبتدئ', 'البداية'],
  },
];

export const baselineKnownIssues = [
  {
    gapId: 'Gap-1',
    description: '"أصنع/صنع/يصنع" absent from INTENT_RULES and synonymGroups.build',
    affectedIds: ['BL-BUILD-01', 'BL-BUILD-02'],
    severity: 'critical' as const,
  },
  {
    gapId: 'Gap-3',
    description: '"dshot", "pid", "cli" in advancedTerms over-block practical bank entries',
    affectedIds: ['BL-ESC-04', 'BL-BF-03', 'BL-BF-04', 'BL-MIXED-04'],
    severity: 'medium' as const,
  },
  {
    gapId: 'Gap-6',
    description: 'No BUILD_ROADMAP answer mode — build_help falls to general/encyclopedia',
    affectedIds: ['BL-BUILD-03', 'BL-BUILD-04', 'BL-BUILD-05'],
    severity: 'high' as const,
  },
  {
    gapId: 'Gap-dialect',
    description: '"شو هو" (Gulf dialect for ما هو) not mapped to definition intent',
    affectedIds: ['BL-RX-04'],
    severity: 'low' as const,
  },
  {
    gapId: 'Gap-safety-vtx',
    description: '"safety_warning" intent has no dedicated intercept; only lipo_safety does (intercept E)',
    affectedIds: ['BL-SAFE-02', 'BL-SAFE-05'],
    severity: 'medium' as const,
  },
  {
    gapId: 'Gap-mixed-wiring',
    description: 'Gulf wiring phrases ("وين أوصله", "وصلت...بالغلط") not in patterns',
    affectedIds: ['BL-MIXED-01', 'BL-MIXED-02', 'BL-MIXED-03'],
    severity: 'low' as const,
  },
];
