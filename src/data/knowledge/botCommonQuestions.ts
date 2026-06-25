// Curated common FPV beginner question patterns for boosted matching.
// Each entry maps natural Arabic questions to an intent and concept set.

import type { BotIntent } from './botNlu';

export interface CommonQuestionEntry {
  patterns: string[];
  intent: BotIntent;
  concepts: string[];
  confidenceBoost: number;
  clarificationMenuId?: string;
  suggestedChips?: string[];
}

export const commonQuestions: CommonQuestionEntry[] = [
  // ── Beginner / App ───────────────────────────────────────────────────────
  {
    patterns: [
      'انا جديد', 'أنا جديد', 'جديد على fpv', 'اول مره', 'أول مرة',
      'مبتدئ', 'مبتدي', 'للمبتدئين',
    ],
    intent: 'beginner_start',
    concepts: ['beginner', 'start', 'build'],
    confidenceBoost: 10,
    suggestedChips: ['كيف أبدأ البناء؟', 'ما القطع الأساسية؟', 'افتح قسم الدروس'],
  },
  {
    patterns: [
      'من أين أبدأ', 'من اين ابدا', 'كيف أبدأ', 'كيف ابدا', 'ما أول خطوة',
      'ما اول خطوه', 'ابدا المشروع',
    ],
    intent: 'beginner_start',
    concepts: ['beginner', 'start', 'first_step'],
    confidenceBoost: 10,
    suggestedChips: ['كيف أبدأ البناء؟', 'ما القطع الأساسية؟', 'افتح قسم الدروس'],
  },
  {
    patterns: [
      'كيف استخدم التطبيق', 'كيف أستخدم التطبيق', 'شرح التطبيق',
      'ماذا يفعل التطبيق', 'ما هو التطبيق',
    ],
    intent: 'app_guide',
    concepts: ['app', 'guide', 'navigation'],
    confidenceBoost: 12,
    suggestedChips: ['افتح قسم البناء', 'افتح قسم الدروس', 'ما الخطوة التالية؟'],
  },
  {
    patterns: [
      'ماذا أفعل بعد الدرس', 'ماذا افعل بعد', 'ما الخطوة التالية',
      'ما الخطوه التاليه', 'هل أبدأ بالبناء أم الدروس',
    ],
    intent: 'next_step',
    concepts: ['next_step', 'progression'],
    confidenceBoost: 8,
    suggestedChips: ['افتح قسم البناء', 'افتح قسم الدروس'],
  },

  // ── Drone / Build ────────────────────────────────────────────────────────
  {
    patterns: [
      'ما هو الدرون', 'ما هو الكواد', 'ما هو الكوادكابتر',
      'ما هي الطائرة الرباعية', 'ما هو fpv',
    ],
    intent: 'definition',
    concepts: ['quadcopter', 'drone', 'fpv'],
    confidenceBoost: 8,
  },
  {
    patterns: [
      'أريد بناء أول درون', 'اريد بناء درون', 'كيف أبني درون',
      'كيف ابني درون', 'ابني درون', 'ابني كواد',
    ],
    intent: 'build_help',
    concepts: ['build', 'beginner', 'quadcopter'],
    confidenceBoost: 10,
    clarificationMenuId: 'build_help',
    suggestedChips: ['ما القطع الأساسية؟', 'افتح قسم البناء'],
  },
  {
    patterns: [
      'ما القطع الأساسية', 'ما القطع الاساسيه', 'القطع المطلوبة',
      'قائمة القطع', 'قائمه القطع',
    ],
    intent: 'build_help',
    concepts: ['parts', 'components', 'build'],
    confidenceBoost: 8,
  },
  {
    patterns: [
      'ما الفرق بين 3 إنش و5 إنش', 'الفرق بين 3 انش و5 انش',
      'كيف أختار حجم الدرون', 'كيف اختار حجم الدرون',
      '3 inch vs 5 inch', '5 inch vs 3 inch',
    ],
    intent: 'parts_buying',
    concepts: ['frame', 'size', 'selection'],
    confidenceBoost: 8,
  },
  {
    patterns: [
      'هل أشتري القطع الآن', 'هل اشتري القطع', 'من أين أشتري',
      'أين أشتري', 'هل أشتري',
    ],
    intent: 'parts_buying',
    concepts: ['buying', 'parts'],
    confidenceBoost: 6,
    clarificationMenuId: 'parts_buying',
  },

  // ── Wiring ───────────────────────────────────────────────────────────────
  {
    patterns: [
      'كيف أوصل الأسلاك', 'كيف اوصل الاسلاك', 'توصيل الأسلاك',
      'كيف أربط الأسلاك',
    ],
    intent: 'wiring',
    concepts: ['wiring', 'uart', 'tx', 'rx'],
    confidenceBoost: 8,
    suggestedChips: ['افحص التوصيل خطوة بخطوة', 'كيف أتأكد من TX/RX؟'],
  },
  {
    patterns: ['ما معنى gnd', 'ما هو gnd', 'ما هو الأرضي', 'ما الارضي'],
    intent: 'definition',
    concepts: ['gnd', 'ground', 'wiring'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'ما الفرق بين 5v وvbat', 'الفرق بين 5v vbat',
      'ما الفرق بين vbat و5v', '5v أم vbat',
    ],
    intent: 'definition',
    concepts: ['5v', 'vbat', 'power'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'أين أوصل البطارية', 'اين اوصل البطاريه', 'كيف أوصل البطارية',
    ],
    intent: 'wiring',
    concepts: ['battery', 'vbat', 'xt60'],
    confidenceBoost: 8,
  },
  {
    patterns: [
      'هل أوصل tx مع tx', 'هل اوصل tx مع tx', 'tx الى tx', 'tx مع tx',
      'tx to tx',
    ],
    intent: 'tx_rx',
    concepts: ['tx', 'rx', 'uart', 'wiring_correction'],
    confidenceBoost: 15,
  },
  {
    patterns: [
      'لماذا tx مع rx', 'لماذا tx الي rx', 'tx يذهب الى rx',
      'سبب tx rx',
    ],
    intent: 'tx_rx',
    concepts: ['tx', 'rx', 'uart'],
    confidenceBoost: 10,
  },
  {
    patterns: ['هل gnd مهم', 'هل الارضي مهم', 'لماذا gnd', 'سبب gnd'],
    intent: 'wiring',
    concepts: ['gnd', 'ground'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو uart', 'ما معنى uart', 'uart ما هو'],
    intent: 'definition',
    concepts: ['uart', 'serial', 'wiring'],
    confidenceBoost: 10,
  },

  // ── Battery / Safety ─────────────────────────────────────────────────────
  {
    patterns: [
      'هل أشغل الدرون بعد اللحام', 'هل اشغل بعد اللحام',
      'هل أوصل البطارية بعد اللحام',
    ],
    intent: 'safety_warning',
    concepts: ['first_power', 'smoke_stopper', 'safety'],
    confidenceBoost: 12,
  },
  {
    patterns: [
      'هل أحتاج smoke stopper', 'هل احتاج سموك ستوبر',
      'ما هو smoke stopper', 'ما الفائدة من smoke stopper',
    ],
    intent: 'power_battery',
    concepts: ['smoke_stopper', 'safety', 'first_power'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'البطارية انتفخت', 'البطاريه انتفخت', 'بطارية منتفخة',
      'بطاريه منتفخه', 'lipo منتفخ',
    ],
    intent: 'lipo_safety',
    concepts: ['lipo', 'swollen', 'safety'],
    confidenceBoost: 15,
  },
  {
    patterns: [
      'ظهر دخان', 'طلع دخان', 'دخان من الدرون', 'دخان من الكواد',
      'دخان من esc', 'دخان من المحرك',
    ],
    intent: 'safety_warning',
    concepts: ['smoke', 'safety', 'emergency'],
    confidenceBoost: 15,
  },
  {
    patterns: [
      'ظهرت شرارة', 'طلعت شراره', 'شرارة', 'spark',
    ],
    intent: 'safety_warning',
    concepts: ['spark', 'safety', 'emergency'],
    confidenceBoost: 15,
  },
  {
    patterns: [
      'esc ساخن', 'اسك ساخن', 'esc يسخن', 'esc حار',
    ],
    intent: 'safety_warning',
    concepts: ['esc', 'heat', 'safety'],
    confidenceBoost: 12,
  },
  {
    patterns: [
      'هل أشحن lipo هكذا', 'كيف أشحن lipo', 'كيف اشحن البطاريه',
      'طريقة شحن lipo',
    ],
    intent: 'power_battery',
    concepts: ['lipo', 'charging', 'safety'],
    confidenceBoost: 8,
  },
  {
    patterns: [
      'هل أترك البطارية ممتلئة', 'هل اترك البطاريه ممتلئه',
      'هل أترك البطارية مشحونة', 'تخزين lipo',
    ],
    intent: 'power_battery',
    concepts: ['lipo', 'storage', 'charging'],
    confidenceBoost: 8,
  },

  // ── Betaflight ───────────────────────────────────────────────────────────
  {
    patterns: [
      'betaflight لا يحفظ', 'لا يحفظ الإعدادات', 'لا يحفظ الاعدادات',
      'الإعدادات لا تُحفظ', 'بيتافلايت لا يحفظ',
    ],
    intent: 'betaflight',
    concepts: ['betaflight', 'save', 'settings'],
    confidenceBoost: 12,
  },
  {
    patterns: [
      'الريسيفر لا يظهر في betaflight', 'receiver لا يظهر',
      'الريسيفر لا يظهر', 'لا يظهر الريسيفر',
    ],
    intent: 'betaflight',
    concepts: ['receiver', 'betaflight', 'uart'],
    confidenceBoost: 12,
  },
  {
    patterns: [
      'القنوات لا تتحرك', 'القنوات لا تستجيب',
      'العصا لا تحرك القنوات', 'channels لا تتحرك',
    ],
    intent: 'receiver',
    concepts: ['receiver', 'channels', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'كيف أفعّل arm', 'كيف أفعل arm', 'كيف افعل arm',
      'arm لا يعمل', 'لا أستطيع arm', 'لا يستطيع arm',
    ],
    intent: 'betaflight',
    concepts: ['arm', 'betaflight', 'modes'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'أين أجد motors tab', 'اين motors tab', 'كيف أفتح motors tab',
    ],
    intent: 'betaflight',
    concepts: ['motors_tab', 'betaflight', 'motors'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو cli', 'ما هو الـ cli', 'cli betaflight'],
    intent: 'definition',
    concepts: ['cli', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما معنى save and reboot', 'save and reboot ما هو', 'save reboot'],
    intent: 'definition',
    concepts: ['save_reboot', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'لماذا لا أستطيع arm', 'لماذا لا استطيع arm',
      'الدرون لا يسلح', 'الكواد لا يسلح',
    ],
    intent: 'betaflight',
    concepts: ['arm', 'arming', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'ما هو failsafe', 'ما هو الـ failsafe', 'failsafe كيف يعمل',
    ],
    intent: 'definition',
    concepts: ['failsafe', 'betaflight', 'safety'],
    confidenceBoost: 10,
  },

  // ── Motors / ESC ─────────────────────────────────────────────────────────
  {
    patterns: [
      'المحركات لا تدور', 'الموتورات لا تدور', 'motors لا تدور',
      'المحركات لا تشتغل', 'الموتورات لا تشتغل',
    ],
    intent: 'motors',
    concepts: ['motors', 'troubleshooting', 'betaflight'],
    confidenceBoost: 12,
    clarificationMenuId: 'motors',
    suggestedChips: ['كيف أختبر المحركات بأمان؟', 'افتح قسم Betaflight'],
  },
  {
    patterns: [
      'موتور واحد لا يعمل', 'محرك واحد لا يعمل',
      'محرك واحد فقط', 'موتور واحد فقط',
    ],
    intent: 'motors',
    concepts: ['motors', 'troubleshooting', 'esc'],
    confidenceBoost: 12,
  },
  {
    patterns: [
      'المحركات تدور عكس الاتجاه', 'الموتورات تدور عكس',
      'اتجاه دوران خاطئ', 'motor direction wrong',
    ],
    intent: 'motors',
    concepts: ['motors', 'direction', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'هل أختبر المحركات والمراوح مركبة',
      'اختبار المحركات مراوح مركبه', 'هل المراوح مركبة أثناء الاختبار',
    ],
    intent: 'safety_warning',
    concepts: ['motors', 'props', 'safety'],
    confidenceBoost: 15,
  },
  {
    patterns: ['ما هو dshot', 'ما هو الـ dshot', 'dshot ما هو'],
    intent: 'definition',
    concepts: ['dshot', 'esc', 'motors'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو esc', 'ما هو الـ esc', 'esc ما هو'],
    intent: 'definition',
    concepts: ['esc', 'motors'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'كيف أعرف أن esc يعمل', 'كيف اعرف ان esc يعمل',
      'هل esc يعمل', 'اختبار esc',
    ],
    intent: 'esc',
    concepts: ['esc', 'troubleshooting', 'betaflight'],
    confidenceBoost: 10,
  },

  // ── Receiver / Radio ─────────────────────────────────────────────────────
  {
    patterns: [
      'الريموت لا يستجيب', 'الريموت لا يعمل', 'الريموت لا يتصل',
      'جهاز التحكم لا يعمل',
    ],
    intent: 'receiver',
    concepts: ['transmitter', 'receiver', 'binding'],
    confidenceBoost: 10,
    clarificationMenuId: 'receiver',
  },
  {
    patterns: [
      'الريسيفر لا يعمل', 'الريسيفر لا يستجيب',
      'ريسيفر لا يعمل', 'receiver لا يعمل',
    ],
    intent: 'receiver',
    concepts: ['receiver', 'binding', 'elrs'],
    confidenceBoost: 10,
    clarificationMenuId: 'receiver',
  },
  {
    patterns: ['ما هو elrs', 'ما هو expresslrs', 'elrs ما هو'],
    intent: 'definition',
    concepts: ['elrs', 'receiver', 'transmitter'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'ما الفرق بين rx وtx', 'الفرق بين rx tx',
      'ما الفرق بين tx rx',
    ],
    intent: 'definition',
    concepts: ['tx', 'rx', 'uart'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو crsf', 'crsf ما هو'],
    intent: 'definition',
    concepts: ['crsf', 'elrs', 'receiver'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو sbus', 'sbus ما هو'],
    intent: 'definition',
    concepts: ['sbus', 'receiver'],
    confidenceBoost: 10,
  },

  // ── Video / GPS ──────────────────────────────────────────────────────────
  {
    patterns: [
      'لا توجد صورة في النظارة', 'لا توجد صوره', 'لا يوجد فيديو',
      'النظارة لا تظهر صورة', 'النظاره لا تظهر',
    ],
    intent: 'vtx_video',
    concepts: ['vtx', 'goggles', 'camera'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو vtx', 'vtx ما هو', 'ما هي وحدة الفيديو'],
    intent: 'definition',
    concepts: ['vtx', 'video'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'أين أركب dji o4', 'كيف أركب dji o4', 'dji o4 كيف',
    ],
    intent: 'vtx_video',
    concepts: ['dji', 'o4', 'vtx'],
    confidenceBoost: 10,
  },
  {
    patterns: [
      'هل أحتاج gps', 'لماذا gps', 'هل يجب gps',
    ],
    intent: 'gps',
    concepts: ['gps', 'rescue', 'navigation'],
    confidenceBoost: 8,
  },
  {
    patterns: ['أين أركب gps', 'كيف أركب gps', 'gps أين'],
    intent: 'gps',
    concepts: ['gps', 'mounting'],
    confidenceBoost: 8,
  },
  {
    patterns: ['ما هو rescue mode', 'rescue mode ما هو', 'ما هو وضع الإنقاذ'],
    intent: 'definition',
    concepts: ['rescue', 'gps', 'betaflight'],
    confidenceBoost: 10,
  },
  {
    patterns: ['ما هو rth', 'rth ما هو', 'ما هو return to home'],
    intent: 'definition',
    concepts: ['rth', 'gps', 'rescue'],
    confidenceBoost: 10,
  },

  // ── Generic Troubleshooting ──────────────────────────────────────────────
  {
    patterns: [
      'الدرون لا يعمل', 'الدرون لا يشتغل', 'الكواد لا يعمل',
      'الكواد لا يشتغل', 'الطائره لا تعمل',
    ],
    intent: 'troubleshooting',
    concepts: ['drone', 'troubleshooting'],
    confidenceBoost: 10,
    clarificationMenuId: 'vague_problem',
  },
  {
    patterns: [
      'ساعدني', 'لا أعرف أين الخطأ', 'شيء لا يعمل',
      'لم أفهم', 'ظهرت رسالة خطأ', 'ظهرت رساله خطا',
    ],
    intent: 'troubleshooting',
    concepts: ['troubleshooting', 'help'],
    confidenceBoost: 5,
    clarificationMenuId: 'vague_problem',
  },

  // ── Out of domain ────────────────────────────────────────────────────────
  {
    patterns: ['ما هو الطقس', 'الطقس اليوم'],
    intent: 'out_of_domain',
    concepts: [],
    confidenceBoost: 0,
  },
  {
    patterns: ['أخبار اليوم', 'اخبار اليوم'],
    intent: 'out_of_domain',
    concepts: [],
    confidenceBoost: 0,
  },
  {
    patterns: ['السياسة', 'السياسه'],
    intent: 'out_of_domain',
    concepts: [],
    confidenceBoost: 0,
  },
  {
    patterns: ['الرياضة', 'الرياضه', 'نتائج كرة القدم'],
    intent: 'out_of_domain',
    concepts: [],
    confidenceBoost: 0,
  },
  {
    patterns: ['وصفة طعام', 'وصفه طعام', 'الطبخ'],
    intent: 'out_of_domain',
    concepts: [],
    confidenceBoost: 0,
  },
];

// ── Fast lookup helpers ───────────────────────────────────────────────────────

import { normalizeArabicQuery } from './botNlu';

type MatchResult = {
  entry: CommonQuestionEntry;
  score: number;
};

export function matchCommonQuestions(query: string): MatchResult[] {
  const norm = normalizeArabicQuery(query);
  const results: MatchResult[] = [];

  for (const entry of commonQuestions) {
    let bestScore = 0;
    for (const pattern of entry.patterns) {
      const normPattern = normalizeArabicQuery(pattern);
      if (norm.includes(normPattern)) {
        // Score by pattern specificity (longer = more specific = better)
        const score = entry.confidenceBoost + normPattern.length * 0.5;
        if (score > bestScore) bestScore = score;
      }
    }
    if (bestScore > 0) {
      results.push({ entry, score: bestScore });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function getBestCommonMatch(query: string): MatchResult | null {
  const results = matchCommonQuestions(query);
  return results.length > 0 ? results[0] : null;
}
