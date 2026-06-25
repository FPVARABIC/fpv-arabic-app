// Arabic NLU layer for FPV bot — matching only, never displayed.

// ── Types ────────────────────────────────────────────────────────────────────

export type BotIntent =
  | 'beginner_start'
  | 'app_guide'
  | 'definition'
  | 'build_help'
  | 'parts_buying'
  | 'wiring'
  | 'power_battery'
  | 'lipo_safety'
  | 'tx_rx'
  | 'motors'
  | 'esc'
  | 'flight_controller'
  | 'receiver'
  | 'vtx_video'
  | 'gps'
  | 'betaflight'
  | 'troubleshooting'
  | 'safety_warning'
  | 'brave_source_request'
  | 'next_step'
  | 'out_of_domain'
  | 'unclear';

export interface ClarificationMenu {
  title: string;
  choices: string[];
}

// ── Normalization ─────────────────────────────────────────────────────────────
// For matching only — never display normalized text to the user.

export function normalizeArabicQuery(input: string): string {
  let s = input.trim().toLowerCase();

  // Remove Arabic diacritics (tashkeel) and tatweel
  s = s.replace(/[ً-ٰٟـ]/g, '');

  // Normalize Alef variants → ا
  s = s.replace(/[أإآٱ]/g, 'ا');

  // Normalize ى → ي, ة → ه (for matching only)
  s = s.replace(/ى/g, 'ي');
  s = s.replace(/ة/g, 'ه');

  // Normalize ؤ → و, ئ → ي
  s = s.replace(/ؤ/g, 'و');
  s = s.replace(/ئ/g, 'ي');

  // Remove Arabic punctuation and repeated marks
  s = s.replace(/[؟?!،؛:.،,؍]/g, ' ');

  // Reduce excessive repeated letters (3+ → 2) for Arabic elongation
  s = s.replace(/(.)\1{2,}/g, '$1$1');

  // Collapse repeated spaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

export function tokenizeQuery(query: string): string[] {
  const normalized = normalizeArabicQuery(query);
  return normalized
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
}

// ── FPV domain detection ──────────────────────────────────────────────────────

const FPV_DOMAIN_TOKENS: string[] = [
  // Arabic drone/quadcopter terms
  'درون', 'الدرون', 'كواد', 'كوادكابتر', 'كوادكوبتر', 'كواد كوبتر',
  'طائره', 'طائره رباعيه', 'مسيره', 'مسيرات',
  // English drone terms
  'fpv', 'quad', 'drone', 'quadcopter',
  // Component keywords Arabic
  'محرك', 'محركات', 'موتور', 'موتورات',
  'مروحه', 'مراوح', 'بروب', 'بروبس',
  'بطاريه', 'ليبو',
  'ريسيفر', 'رسيفر', 'ريموت',
  'فلايت', 'كنترولر',
  'سموك', 'لحام', 'لحم', 'سولدر',
  'بيتافلايت', 'بيتفلايت', 'بتافلاي',
  'اسك', 'اوصل', 'توصيل',
  'نظاره', 'نظارات',
  'فريم', 'هيكل',
  // English technical tokens
  'betaflight', 'fc', 'esc', 'vtx', 'rx', 'tx', 'lipo', 'gps', 'elrs',
  'vbat', 'gnd', '5v', 'uart', 'dshot', 'sbus', 'crsf', 'osd', 'pid',
  'blackbox', 'failsafe', 'arm', 'arming', 'motors', 'motor', 'prop',
  'props', 'propeller', 'quad', 'drone', 'o4', 'dji', 'expresslrs',
  'smoke stopper', 'bf', 'cli', 'xt60',
];

const _normalizedFpvTokens = FPV_DOMAIN_TOKENS.map(t => normalizeArabicQuery(t));

export function detectFpvDomain(query: string): boolean {
  const norm = normalizeArabicQuery(query);
  return _normalizedFpvTokens.some(t => t.length >= 2 && norm.includes(t));
}

// ── Synonym expansion ─────────────────────────────────────────────────────────

const SYNONYM_GROUPS: Record<string, string[]> = {
  quadcopter: [
    'درون', 'الدرون', 'كواد', 'كوادكابتر', 'كواد كوبتر', 'طائره fpv',
    'طائره رباعيه', 'quad', 'quadcopter', 'drone', 'fpv drone', 'مسيره',
  ],
  motors: [
    'محرك', 'محركات', 'موتور', 'موتورات', 'motor', 'motors',
    'prop', 'props', 'مروحه', 'مراوح', 'بروب', 'بروبس', 'propeller',
  ],
  flight_controller: [
    'flight controller', 'fc', 'فلايت كنترولر', 'فلاي كنترولر',
    'كنترولر الطيران', 'لوحه الطيران', 'لوحه التحكم', 'متحكم طيران',
    'متحكم الطيران',
  ],
  esc: [
    'esc', 'اسك', 'متحكم السرعه', 'منظم السرعه', '4in1', 'four in one',
    'electronic speed controller', 'تحكم السرعه',
  ],
  receiver: [
    'receiver', 'rx', 'ريسيفر', 'رسيفر', 'مستقبل', 'elrs', 'expresslrs',
    'sbus', 'crsf', 'جهاز الاستقبال',
  ],
  transmitter: [
    'ريموت', 'راديو', 'كنترولر', 'transmitter', 'radio', 'controller',
    'tx', 'جهاز التحكم',
  ],
  vtx_video: [
    'vtx', 'نظام الفيديو', 'ارسال الفيديو', 'إرسال الفيديو', 'كاميرا',
    'camera', 'o4', 'dji o4', 'goggles', 'نظاره', 'نظارات', 'vrx',
    'fpv camera',
  ],
  battery: [
    'بطاريه', 'ليبو', 'lipo', '4s', '6s', '3s', 'xt60', 'vbat', 'gnd',
    '5v', 'دخان', 'شراره', 'سخونه', 'انتفاخ', 'شحن',
    'smoke stopper', 'سموك ستوبر', 'بطاريه منتفخه', 'battery',
  ],
  betaflight: [
    'بيتافلايت', 'betaflight', 'bf', 'configurator', 'بورتات', 'ports',
    'cli', 'save and reboot', 'save', 'reboot', 'modes', 'receiver tab',
    'motors tab', 'بيتفلايت', 'بتافلاي', 'بيدفلايت',
  ],
  wiring: [
    'توصيل', 'اسلاك', 'اسلاك', 'سلك', 'لحام', 'solder', 'soldering',
    'uart', 'tx', 'rx', 'gnd', '5v', 'vbat', 'وصل', 'اوصل', 'ربط',
  ],
  gps: [
    'gps', 'جي بي اس', 'بوصله', 'compass', 'rescue', 'return to home',
    'rth', 'ملاحه',
  ],
};

const _normalizedSynonymGroups: Record<string, string[]> = Object.fromEntries(
  Object.entries(SYNONYM_GROUPS).map(([k, v]) => [k, v.map(t => normalizeArabicQuery(t))]),
);

export function expandFpvSynonyms(query: string): string[] {
  const norm = normalizeArabicQuery(query);
  const expanded = new Set<string>([norm]);

  for (const group of Object.values(_normalizedSynonymGroups)) {
    const hit = group.some(t => t.length >= 2 && norm.includes(t));
    if (hit) {
      group.forEach(t => expanded.add(t));
    }
  }

  return Array.from(expanded);
}

// ── Intent classification ─────────────────────────────────────────────────────

// Each entry: [pattern, intent, priority] — higher priority wins ties.
// Patterns are matched against normalized query.
const INTENT_RULES: [string, BotIntent, number][] = [
  // Safety-first — must be highest priority
  ['مراوح مركبه', 'safety_warning', 100],
  ['props on', 'safety_warning', 100],
  ['بطاريه منتفخه', 'lipo_safety', 100],
  ['انتفخت', 'lipo_safety', 100],
  ['انتفاخ', 'lipo_safety', 100],
  ['دخان', 'safety_warning', 100],
  ['شراره', 'safety_warning', 100],
  ['احترق', 'safety_warning', 100],
  ['يحترق', 'safety_warning', 100],
  ['سخونه', 'safety_warning', 90],
  ['ساخن', 'safety_warning', 90],
  ['يسخن', 'safety_warning', 90],

  // TX/RX wiring safety
  ['tx مع tx', 'tx_rx', 95],
  ['tx الي tx', 'tx_rx', 95],
  ['tx الى tx', 'tx_rx', 95],
  ['tx مع rx', 'tx_rx', 85],
  ['rx مع tx', 'tx_rx', 85],
  ['وصل tx', 'tx_rx', 80],
  ['tx rx غلط', 'tx_rx', 80],
  ['توصيل tx', 'tx_rx', 75],

  // Explicit source request
  ['اعرض مصادر', 'brave_source_request', 90],
  ['ابحث في الانترنت', 'brave_source_request', 90],
  ['ابحث عن', 'brave_source_request', 85],
  ['مصادر خارجيه', 'brave_source_request', 85],

  // Beginner / app guide
  ['انا جديد', 'beginner_start', 85],
  ['جديد علي fpv', 'beginner_start', 85],
  ['اول مره', 'beginner_start', 85],
  ['مبتدئ', 'beginner_start', 85],
  ['مبتدي', 'beginner_start', 85],
  ['من اين ابدا', 'beginner_start', 85],
  ['كيف ابدا', 'beginner_start', 85],
  ['ابدا من', 'beginner_start', 80],
  ['للمبتدئين', 'beginner_start', 80],
  ['للمبتدئ', 'beginner_start', 80],
  ['اول خطوه', 'beginner_start', 80],
  ['تعلم بناء', 'beginner_start', 75],
  ['علمني من الصفر', 'beginner_start', 75],

  ['كيف استخدم التطبيق', 'app_guide', 85],
  ['من اين ابدا', 'app_guide', 87],
  ['ابدا من اين', 'app_guide', 87],
  ['ما هو التطبيق', 'app_guide', 80],
  ['شرح التطبيق', 'app_guide', 80],
  ['ماذا يفعل التطبيق', 'app_guide', 80],
  ['ما الخطوه التاليه', 'next_step', 80],
  ['الخطوه التاليه', 'next_step', 75],
  ['ماذا افعل بعد', 'next_step', 75],

  // Definition
  ['ما هو', 'definition', 75],
  ['ما هي', 'definition', 75],
  ['ما معني', 'definition', 75],
  ['ماذا يعني', 'definition', 75],
  ['الفرق بين', 'definition', 75],
  ['ما الفرق', 'definition', 75],
  ['كيف يعمل', 'definition', 70],
  ['اشرح', 'definition', 70],
  ['ما هو dshot', 'definition', 85],
  ['ما هو esc', 'definition', 85],
  ['ما هو pid', 'definition', 85],
  ['ما هو uart', 'definition', 85],
  ['ما هو elrs', 'definition', 85],
  ['ما هو crsf', 'definition', 85],
  ['ما هو sbus', 'definition', 85],
  ['ما هو vtx', 'definition', 85],
  ['ما هو gps', 'definition', 85],
  ['ما هو failsafe', 'definition', 85],
  ['ما هو blackbox', 'definition', 85],
  ['ما هو cli', 'definition', 85],
  ['ما هو osd', 'definition', 85],

  // Build/parts
  ['اريد بناء', 'build_help', 80],
  ['ابني درون', 'build_help', 80],
  ['ابني كواد', 'build_help', 80],
  ['بناء درون', 'build_help', 80],
  ['بناء كواد', 'build_help', 80],
  ['تجميع', 'build_help', 75],
  ['خطوات البناء', 'build_help', 80],
  ['قائمه القطع', 'build_help', 75],
  ['ما القطع', 'build_help', 75],
  ['القطع الاساسيه', 'build_help', 75],

  ['اشتري', 'parts_buying', 75],
  ['شراء', 'parts_buying', 75],
  ['افضل قطع', 'parts_buying', 75],
  ['انصحني', 'parts_buying', 70],
  ['توصيتك', 'parts_buying', 70],
  ['اقترح', 'parts_buying', 70],
  ['ما افضل', 'parts_buying', 70],

  // Wiring
  ['كيف اوصل', 'wiring', 80],
  ['كيف اربط', 'wiring', 80],
  ['ما معني gnd', 'wiring', 85],
  ['ما الفرق بين 5v', 'wiring', 85],
  ['اين اوصل', 'wiring', 80],
  ['uart', 'wiring', 75],
  ['لحام', 'wiring', 70],
  ['solder', 'wiring', 70],

  // Battery/power
  ['بطاريه', 'power_battery', 70],
  ['ليبو', 'power_battery', 70],
  ['lipo', 'power_battery', 70],
  ['شحن', 'power_battery', 65],
  ['vbat', 'power_battery', 70],
  ['xt60', 'power_battery', 70],

  // Motors
  ['المحركات لا تدور', 'motors', 90],
  ['الموتورات لا تدور', 'motors', 90],
  ['محرك لا يعمل', 'motors', 90],
  ['موتور لا يعمل', 'motors', 90],
  ['المحركات تدور', 'motors', 80],
  ['اتجاه الدوران', 'motors', 80],
  ['dshot', 'motors', 75],
  ['motor', 'motors', 65],
  ['motors', 'motors', 65],
  ['محرك', 'motors', 65],
  ['موتور', 'motors', 65],

  // ESC
  ['esc ساخن', 'esc', 90],
  ['esc لا يعمل', 'esc', 90],
  ['اسك', 'esc', 75],

  // Flight controller
  ['fc', 'flight_controller', 70],
  ['فلايت كنترولر', 'flight_controller', 75],
  ['متحكم الطيران', 'flight_controller', 75],

  // Receiver
  ['الريسيفر لا يعمل', 'receiver', 90],
  ['الريسيفر لا يظهر', 'receiver', 90],
  ['القنوات لا تتحرك', 'receiver', 85],
  ['ريسيفر', 'receiver', 70],
  ['رسيفر', 'receiver', 70],
  ['elrs', 'receiver', 70],
  ['crsf', 'receiver', 70],
  ['sbus', 'receiver', 70],

  // VTX/video
  ['لا توجد صوره', 'vtx_video', 85],
  ['لا يوجد فيديو', 'vtx_video', 85],
  ['vtx', 'vtx_video', 75],
  ['نظاره', 'vtx_video', 70],
  ['nظارات', 'vtx_video', 70],
  ['dji o4', 'vtx_video', 80],

  // GPS
  ['gps', 'gps', 75],
  ['rth', 'gps', 75],
  ['rescue mode', 'gps', 75],
  ['return to home', 'gps', 75],
  ['جي بي اس', 'gps', 75],

  // Betaflight
  ['betaflight لا يحفظ', 'betaflight', 90],
  ['لا يحفظ الاعدادات', 'betaflight', 90],
  ['betaflight', 'betaflight', 75],
  ['بيتافلايت', 'betaflight', 75],
  ['configurator', 'betaflight', 70],
  ['ports tab', 'betaflight', 75],
  ['motors tab', 'betaflight', 75],
  ['arm', 'betaflight', 65],
  ['arming', 'betaflight', 65],
  ['failsafe', 'betaflight', 70],
  ['blackbox', 'betaflight', 70],
  ['cli', 'betaflight', 70],
  ['pid', 'betaflight', 65],

  // Troubleshooting (lower priority so specific intents win)
  ['لا يعمل', 'troubleshooting', 60],
  ['لا يشتغل', 'troubleshooting', 60],
  ['لا تعمل', 'troubleshooting', 60],
  ['مشكله', 'troubleshooting', 55],
  ['مشكلة', 'troubleshooting', 55],
  ['لم يعمل', 'troubleshooting', 60],
  ['ما يشتغل', 'troubleshooting', 60],
  ['ما يعمل', 'troubleshooting', 60],
  ['لا يستجيب', 'troubleshooting', 60],
  ['لا يرد', 'troubleshooting', 60],
  ['خطا', 'troubleshooting', 55],
  ['error', 'troubleshooting', 55],
  ['ساعدني', 'troubleshooting', 50],
  ['لم افهم', 'troubleshooting', 45],
  ['لا اعرف', 'troubleshooting', 40],
  ['رساله خطا', 'troubleshooting', 65],
  ['يرتجف', 'troubleshooting', 65],
  ['ينقلب', 'troubleshooting', 65],

  // Out of domain (low priority so FPV context always wins)
  ['الطقس', 'out_of_domain', 50],
  ['اخبار', 'out_of_domain', 50],
  ['السياسه', 'out_of_domain', 50],
  ['الرياضه', 'out_of_domain', 50],
  ['الطبخ', 'out_of_domain', 50],
  ['الهاتف', 'out_of_domain', 50],
  ['السياره', 'out_of_domain', 50],
];

export function classifyBotIntent(query: string): BotIntent {
  const norm = normalizeArabicQuery(query);

  let bestIntent: BotIntent = 'unclear';
  let bestPriority = -1;

  for (const [pattern, intent, priority] of INTENT_RULES) {
    const normPattern = normalizeArabicQuery(pattern);
    if (norm.includes(normPattern)) {
      if (priority > bestPriority) {
        bestPriority = priority;
        bestIntent = intent;
      }
    }
  }

  // If out_of_domain was detected but there is also FPV domain context,
  // demote to unclear so domain guard can handle it properly.
  if (bestIntent === 'out_of_domain' && detectFpvDomain(query)) {
    return 'unclear';
  }

  return bestIntent;
}

// ── Clarification menus ───────────────────────────────────────────────────────

const CLARIFICATION_MENUS: Record<string, ClarificationMenu> = {
  vague_problem: {
    title: 'قد تكون المشكلة من أكثر من جهة. اختر الحالة الأقرب حتى أوجهك بدقة:',
    choices: [
      'لا يعمل بعد توصيل البطارية',
      'لا يظهر في Betaflight',
      'المحركات لا تدور',
      'الريموت أو الريسيفر لا يستجيب',
      'ظهر دخان أو سخونة',
    ],
  },
  motors: {
    title: 'حدِّد حالة المحركات بدقة:',
    choices: [
      'المحركات لا تدور داخل Betaflight',
      'المحركات لا تستجيب من الريموت',
      'المحركات تدور في اتجاه خاطئ',
      'محرك واحد فقط لا يعمل',
      'هل المراوح مركبة؟',
    ],
  },
  parts_buying: {
    title: 'حتى أقترح لك مسار اختيار القطع، أحتاج معرفة الهدف:',
    choices: [
      'أول درون للتعلّم',
      'درون 5 إنش للتدريب',
      'درون صغير للأماكن الضيقة',
      'درون مدى أطول',
      'أريد قائمة توافق القطع',
    ],
  },
  betaflight: {
    title: 'ما المشكلة الأقرب في Betaflight؟',
    choices: [
      'لا يحفظ الإعدادات',
      'لا يظهر الريسيفر',
      'المحركات لا تعمل في Motors tab',
      'لا أجد Ports الصحيحة',
      'مشكلة في ARM أو Failsafe',
    ],
  },
  build_help: {
    title: 'ما مرحلة البناء التي تحتاج مساعدة فيها؟',
    choices: [
      'اختيار القطع وتوافقها',
      'توصيل الأسلاك والمكونات',
      'إعداد Betaflight',
      'أول تشغيل وفحص السلامة',
    ],
  },
  unclear_fpv: {
    title: 'أحتاج تحديد المقصود حتى لا أعطيك إجابة غير دقيقة:',
    choices: [
      'مشكلة توصيل',
      'مشكلة Betaflight',
      'مشكلة محركات',
      'اختيار قطع',
      'سلامة البطارية',
    ],
  },
  drone_generic: {
    title: 'ما الذي تريد معرفته أو فعله؟',
    choices: [
      'أريد بناء درون',
      'عندي مشكلة في الدرون',
      'أريد تعلّم Betaflight',
      'أريد اختيار القطع',
      'سؤال عن السلامة',
    ],
  },
  receiver: {
    title: 'ما مشكلة الريسيفر بالتحديد؟',
    choices: [
      'الريسيفر لا يظهر في Betaflight',
      'القنوات لا تتحرك عند تحريك العصا',
      'الريسيفر لا يرتبط بالريموت',
      'لا أعرف كيف أوصل ELRS',
    ],
  },
};

export function getClarificationMenu(
  intent: BotIntent,
  query: string,
): ClarificationMenu | null {
  const norm = normalizeArabicQuery(query);

  // Safety-critical — no clarification needed, go straight to answer
  if (intent === 'safety_warning' || intent === 'lipo_safety') return null;

  // Route by intent
  if (intent === 'troubleshooting') {
    // Narrow troubleshooting if we can detect sub-topic
    if (norm.includes('محرك') || norm.includes('موتور') || norm.includes('motor')) {
      return CLARIFICATION_MENUS.motors;
    }
    if (norm.includes('betaflight') || norm.includes('بيتافلايت') || norm.includes('بتافلاي')) {
      return CLARIFICATION_MENUS.betaflight;
    }
    if (norm.includes('ريسيفر') || norm.includes('رسيفر') || norm.includes('receiver') || norm.includes('rx')) {
      return CLARIFICATION_MENUS.receiver;
    }
    return CLARIFICATION_MENUS.vague_problem;
  }

  if (intent === 'motors') return CLARIFICATION_MENUS.motors;
  if (intent === 'betaflight') return null; // betaflight usually has enough context
  if (intent === 'parts_buying') return CLARIFICATION_MENUS.parts_buying;
  if (intent === 'build_help') return CLARIFICATION_MENUS.build_help;
  if (intent === 'receiver') return CLARIFICATION_MENUS.receiver;

  if (intent === 'unclear') {
    if (detectFpvDomain(query)) {
      // Short single-word/two-word FPV query → open-ended "what do you want?" menu
      const tokens = tokenizeQuery(query);
      if (tokens.length <= 2) return CLARIFICATION_MENUS.drone_generic;
      return CLARIFICATION_MENUS.unclear_fpv;
    }
    return null;
  }

  // Single-word FPV term without other context (reached via non-unclear intents)
  const tokens = tokenizeQuery(query);
  if (tokens.length <= 2 && detectFpvDomain(query)) {
    return CLARIFICATION_MENUS.drone_generic;
  }

  return null;
}

// ── Follow-up suggestions ─────────────────────────────────────────────────────

const FOLLOW_UP_MAP: Record<BotIntent, string[]> = {
  beginner_start: [
    'كيف أبدأ البناء؟',
    'ما القطع الأساسية؟',
    'افتح قسم الدروس',
    'افتح قسم البناء',
  ],
  app_guide: [
    'افتح قسم البناء',
    'افتح قسم الدروس',
    'ما الخطوة التالية؟',
  ],
  definition: [
    'اشرح لي السبب المحتمل',
    'هل تريد مثالاً عملياً؟',
    'اعرض مصادر خارجية موثوقة',
  ],
  build_help: [
    'ما القطع الأساسية؟',
    'كيف أختار الحجم المناسب؟',
    'افتح قسم البناء',
  ],
  parts_buying: [
    'ما القطعة المناسبة للمبتدئ؟',
    'ما الفرق بين 3 إنش و5 إنش؟',
    'اعرض مصادر خارجية موثوقة',
  ],
  wiring: [
    'افحص التوصيل خطوة بخطوة',
    'كيف أتأكد من TX/RX؟',
    'ما معنى GND؟',
  ],
  power_battery: [
    'كيف أفحص البطارية بأمان؟',
    'هل أحتاج Smoke Stopper؟',
    'ما هو VBAT؟',
  ],
  lipo_safety: [
    'كيف أتعامل مع البطارية المنتفخة؟',
  ],
  tx_rx: [
    'افحص التوصيل خطوة بخطوة',
    'كيف أتأكد من TX/RX؟',
  ],
  motors: [
    'كيف أختبر المحركات بأمان؟',
    'ما اتجاه دوران المحركات الصحيح؟',
    'افتح قسم Betaflight',
  ],
  esc: [
    'كيف أعرف أن ESC يعمل؟',
    'افتح قسم البناء',
  ],
  flight_controller: [
    'افتح قسم Betaflight',
    'كيف أوصل FC؟',
    'ما الخطوة التالية؟',
  ],
  receiver: [
    'كيف أربط ELRS؟',
    'كيف أتأكد من TX/RX؟',
    'افتح قسم Betaflight',
  ],
  vtx_video: [
    'كيف أركب VTX؟',
    'اعرض مصادر خارجية موثوقة',
  ],
  gps: [
    'ما هو Rescue mode؟',
    'أين أركب GPS؟',
    'اعرض مصادر خارجية موثوقة',
  ],
  betaflight: [
    'افتح قسم Betaflight',
    'ما الخطوة التالية؟',
    'اشرح لي السبب المحتمل',
  ],
  troubleshooting: [
    'افحص التوصيل خطوة بخطوة',
    'اشرح لي السبب المحتمل',
    'ما الخطوة التالية؟',
  ],
  safety_warning: [],
  brave_source_request: [],
  next_step: [
    'ما الخطوة التالية؟',
    'افتح قسم البناء',
    'افتح قسم الدروس',
  ],
  out_of_domain: [],
  unclear: [
    'مشكلة توصيل',
    'مشكلة Betaflight',
    'مشكلة محركات',
  ],
};

export function getFollowUpSuggestions(intent: BotIntent, _query: string): string[] {
  return (FOLLOW_UP_MAP[intent] ?? []).slice(0, 4);
}
