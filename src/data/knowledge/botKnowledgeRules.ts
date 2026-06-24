// Terms that confirm the query is about FPV / drones — used by domain guard.
export const domainKeywords: string[] = [
  // Arabic drone/FPV terms
  'fpv', 'درون', 'طائره', 'طائرة', 'كواد', 'كوادكابتر', 'كوادكوبتر', 'كوادروتور',
  'مسيره', 'مسيرة', 'مسيرات', 'بناء', 'تجميع',
  // Components
  'محرك', 'محركات', 'موتور', 'موتورات',
  'مروحه', 'مروحة', 'مراوح', 'بروب', 'prop', 'props', 'propeller',
  'بطاريه', 'بطارية', 'ليبو', 'lipo', 'battery',
  'esc', 'إيسك', 'بيدفلايت', 'betaflight', 'بيتافلايت', 'بتافلاي', 'بيتا فلايت', 'بيتفلايت',
  'flight controller', 'fc', 'متحكم طيران', 'متحكم الطيران',
  'فريم', 'هيكل', 'frame',
  'ريسيفر', 'رسيفر', 'receiver', 'rx', 'tx',
  'transmitter', 'جهاز التحكم', 'رادار', 'remote',
  'vtx', 'vrx', 'fpv camera', 'كاميرا',
  'pid', 'osd', 'blackbox', 'failsafe', 'uart', 'gps',
  'arm', 'arming', 'تسليح', 'تشغيل المحركات',
  'وصل', 'توصيل', 'ربط', 'لحام', 'لحم', 'سولدر',
  'طيران', 'اقلاع', 'هبوط', 'تحليق',
  'motor', 'motors', 'esc', 'solder', 'sbus', 'crsf', 'elrs',
  'smoke stopper', 'سموك ستوبر',
  'rpm', 'kv', 'مول', 'amp', 'volt', 'امبير', 'فولت',
  'دي شوت', 'dshot', 'oneshot', 'multishot',
  'accelerometer', 'gyro', 'imu', 'barometer',
  'tune', 'tuning', 'ضبط', 'معايرة', 'calibration',
  'betaflight configurator', 'configurator',
  // Flight-related
  'flip', 'انقلاب', 'ينقلب', 'رول', 'roll', 'pitch', 'yaw',
  'throttle', 'gas', 'الغاز',
];

// ── Conversation Playbook — style-only data ──────────────────────────────────
// These are intro/outro phrases and behavior controls.
// NO technical facts, specs, or setup steps here — those live in KB entries.

export const mentorPhrases: Record<string, string> = {
  beginner_intro: 'يسعدني أساعدك تبني أول كواد! إليك ما يقوله المرجع:',
  beginner_followup: 'ما الجانب الذي تريد تفاصيل أكثر عنه؟ (القطع / التوصيل / Betaflight / الطيران)',
  betaflight_broad_intro: 'Betaflight هو برنامج التحكم الأساسي لكواد FPV. إليك نظرة عامة من المرجع:',
  betaflight_broad_followup: 'ما الجانب الذي تريد تفاصيل أكثر عنه؟ (الاتصال / المنافذ / المحركات / Failsafe / PID)',
  medium_prefix: 'يبدو سؤالك متعلقاً بـ',
  no_match: 'لا أجد إجابة مؤكدة في المرجع الحالي، لكن أستطيع مساعدتك بخطوات فحص آمنة إذا وصفت المشكلة أكثر.',
  troubleshoot_intro: 'دعنا نفحص هذا معاً.',
  concept_followup: 'هل تريد مثالاً عملياً أو شرحاً أعمق؟',
  general_followup: 'هل تريد تفاصيل عن جزء معين؟',
  advanced_followup: 'هل تريد تفاصيل إضافية عن هذا الموضوع؟',
};

// Clarification question menus — behavior only, not technical content.
export const clarificationMenus: Record<string, string[]> = {
  vague_problem: [
    'ما القطعة أو الجزء اللي عنده مشكلة؟ (محرك / ESC / FC / ريسيفر / بطارية / Betaflight)',
    'متى تظهر المشكلة؟ (عند التوصيل / عند التشغيل / في الجو)',
    'ما الذي يحصل بالضبط؟ (لا يشتغل / ينقلب / يسخن / رسالة خطأ)',
    'هل جديد هذا المكون أم كان يعمل قبل؟',
  ],
};

// Phrase patterns that signal a common wiring/safety misconception.
// anyPhrase: if any phrase found in normalized query → apply correction.
// Written in natural Arabic; detectCorrection() normalizes before matching.
export const correctionTriggers: { anyPhrase: string[]; key: string }[] = [
  {
    anyPhrase: ['tx إلى tx', 'tx الى tx', 'tx على tx', 'tx مع tx', 'tx to tx', 'توصل tx tx', 'اوصل tx tx'],
    key: 'tx_to_tx',
  },
  {
    anyPhrase: ['gnd لا يهم', 'gnd مش مهم', 'gnd غير مهم', 'gnd مو مهم', 'الأرضي لا يهم', 'الارضي مش مهم'],
    key: 'gnd_matters',
  },
  {
    anyPhrase: ['ريسيفر على vbat', 'receiver على vbat', 'ريسيفر vbat', 'receiver vbat', 'rx على vbat', 'rx vbat'],
    key: 'receiver_on_vbat',
  },
  {
    anyPhrase: [
      'مراوح مركبة motors tab', 'اختبار محركات مراوح مركبة',
      'props on motors tab', 'motors tab مراوح مركبة',
      'اختبر المحركات والمراوح', 'اختبر المحرك والمراوح',
      'اختبار المحركات والمراوح', 'هل اختبر المراوح مركبه',
    ],
    key: 'props_on_test',
  },
];

// Correction answers and safety notes.
// Short factual corrections only — extended explanation comes from KB search results.
export const correctionMessages: Record<string, { answer: string; safetyNote: string }> = {
  tx_to_tx: {
    answer: 'تصحيح: TX لا يتصل بـ TX. القاعدة الصحيحة: TX من طرف يذهب إلى RX في الطرف الآخر.',
    safetyNote: 'TX = إرسال، RX = استقبال. توصيل TX إلى TX يعني لا إشارة من الأساس.',
  },
  gnd_matters: {
    answer: 'تصحيح: GND (الأرضي) ضروري لإكمال الدائرة الكهربائية ولا يمكن تجاهله.',
    safetyNote: 'بدون GND مشترك لن تعمل أي قطعة حتى لو كان الجهد صحيحاً.',
  },
  receiver_on_vbat: {
    answer: 'تصحيح: الريسيفر يتوصل على 5V أو 3.3V من FC — ليس على VBAT مباشرة.',
    safetyNote: 'توصيل الريسيفر مباشرة على VBAT (جهد البطارية الكامل) سيتلفه فوراً.',
  },
  props_on_test: {
    answer: 'تنبيه: اختبار المحركات في Motors Tab يجب دائماً أن يكون بدون مراوح مركبة.',
    safetyNote: 'المراوح المركبة أثناء اختبار Motors Tab خطر شديد. أزل المراوح أولاً.',
  },
};

export const outOfDomainMessage =
  'أنا مخصص فقط لأسئلة الطائرات FPV والكواد — البناء، التوصيل، Betaflight، المحركات، والطيران. هل عندك سؤال عن هذه المواضيع؟';

// Technical/advanced terms — presence signals advanced_technical mode.
export const advancedTerms: string[] = [
  'pid', 'filter', 'cutoff', 'frequency', 'تردد', 'فلتر', 'd-term', 'gyro filter',
  'blackbox', 'cli', 'dshot', 'notch', 'biquad', 'rates', 'expo',
  'rpm filter', 'dynamic filter', 'p term', 'i term', 'anti gravity',
];

// Follow-up questions keyed by response mode.
export const followUpQuestions: Record<string, string> = {
  beginner_guidance: 'ما الجانب الذي تريد تفاصيل أكثر عنه؟ (القطع / التوصيل / Betaflight / الطيران)',
  general_guidance: 'هل تريد تفاصيل عن جزء معين من هذا الموضوع؟',
  concept_explanation: 'هل تريد مثالاً عملياً أو شرحاً أعمق؟',
  troubleshooting: 'هل المشكلة مستمرة بعد هذه الخطوات؟ أخبرني ماذا يحصل.',
  advanced_technical: 'هل تريد تفاصيل إضافية أو مقارنة بين الخيارات؟',
  betaflight_broad: 'ما الجانب الذي تريد تفاصيل أكثر عنه؟ (الاتصال / المنافذ / المحركات / Failsafe / PID)',
};

export const safetyKeywords: string[] = [
  'بطارية', 'battery', 'lipo',
  'محرك', 'محركات', 'motor', 'motors',
  'مروحة', 'مراوح', 'prop', 'props', 'propeller',
  'esc',
  'smoke stopper', 'سموك ستوبر',
  'failsafe', 'فيل سيف',
  'arm', 'disarm',
  'motors tab',
  'vbat',
  '5v',
  'gnd', 'ground',
  'tx', 'rx',
  'betaflight',
  'first power', 'أول تشغيل',
  'لحام', 'soldering',
  'تيار', 'current',
  'شرارة', 'spark',
];

export const criticalSafetyTerms: string[] = [
  'مراوح مركبة', 'props on', 'propellers on',
  'motors tab', 'تبويب motors',
  'smoke stopper', 'سموك ستوبر',
  'failsafe', 'فيل سيف',
  'first power', 'أول تشغيل', 'أول توصيل',
  'vbat', 'esc', 'battery',
  'arm', 'تشغيل المحركات',
];

// Words too common/generic to carry scoring signal — filtered from query word matching.
// Applied after normalization (أإآ→ا, ة→ه, ى→ي).
export const stopwords = new Set<string>([
  // Question words
  'ما', 'هو', 'هي', 'هل', 'كيف', 'لماذا', 'ماذا', 'متي', 'اين',
  // Conjunctions / prepositions
  'او', 'في', 'من', 'الي', 'علي', 'عن', 'مع', 'عند',
  // Common particles
  'ان', 'اذا', 'حتي', 'قد', 'لا', 'لم', 'لن', 'ثم',
  // Demonstratives / relatives
  'هذا', 'هذه', 'ذلك', 'تلك', 'الذي', 'التي', 'هناك', 'هنا',
  // Copulas / pronouns
  'كان', 'يكون', 'هم', 'انت', 'انا', 'نحن',
  // Generic filler that causes false-positive matches
  'سوال', 'غير', 'معروف', 'تماما', 'مجهول', 'بعض', 'جميع',
]);

export const synonymGroups: Record<string, string[]> = {
  battery: ['بطارية', 'بطاريه', 'battery', 'lipo', 'ليبو', 'خلية', 'خلايا', 'cells', 'cell'],
  motor: ['محرك', 'محركات', 'محركه', 'motor', 'motors', 'موتور', 'موتورات'],
  propeller: ['مروحة', 'مراوح', 'مروحه', 'prop', 'props', 'propeller', 'propellers', 'جناح', 'أجنحة'],
  // Flipping / takeoff
  flip: ['ينقلب', 'انقلب', 'انقلاب', 'يقلب', 'تقلب', 'flip', 'flips', 'flipped', 'roll over', 'اقلاع', 'اول طيران', 'takeoff'],
  receiver: ['ريسيفر', 'رسيفر', 'receiver', 'rx', 'جهاز الاستقبال', 'استقبال'],
  // Betaflight with common typos / alternate spellings
  betaflight: ['بيتافلايت', 'betaflight', 'bf', 'فيرموير', 'firmware', 'بتافلاي', 'بيتا فلايت', 'بيتفلايت', 'بيدفلايت', 'betaflight configurator'],
  failsafe: ['فيل سيف', 'failsafe', 'fail safe', 'فقدان الإشارة', 'signal loss'],
  smokestopper: ['smoke stopper', 'سموك ستوبر', 'smoke-stopper', 'حماية', 'protection'],
  esc: ['esc', 'إيسك', 'electronic speed controller', 'تحكم السرعة'],
  fc: ['flight controller', 'fc', 'متحكم طيران', 'متحكم الطيران', 'flight control'],
  gps: ['gps', 'جي بي إس', 'navigation', 'ملاحة'],
  uart: ['tx', 'rx', 'uart', 'serial', 'توصيل', 'serial port', 'منفذ', 'اوصل', 'أوصل', 'وصل', 'اربط', 'ربط'],
  gnd: ['gnd', 'ground', 'أرضي', 'ارضي', 'أرض'],
  voltage5v: ['5v', 'five volt', 'خمسة فولت', 'regulated'],
  vbat: ['vbat', 'battery voltage', 'جهد البطارية', 'جهد'],
  arm: ['arm', 'armed', 'arming', 'تسليح', 'تشغيل', 'تشغيل المحركات', 'تفعيل'],
  motorstab: ['motors tab', 'تبويب motors', 'motor tab', 'اختبار المحركات'],
  pid: ['pid', 'p term', 'd term', 'i term', 'تحكم', 'ضبط', 'tuning'],
  filters: ['filter', 'filters', 'فلتر', 'فلاتر', 'فلترة', 'noise', 'ضجيج'],
  imu: ['imu', 'inertial measurement', 'وحدة القياس'],
  gyro: ['gyro', 'gyroscope', 'جيروسكوب', 'جيرو', 'دوران', 'rotation'],
  accelerometer: ['accelerometer', 'accel', 'أكسيليرومتر', 'تسارع', 'acceleration'],
  osd: ['osd', 'on screen display', 'عرض البيانات', 'شاشة'],
  blackbox: ['blackbox', 'black box', 'سجل', 'تسجيل', 'بيانات الطيران', 'flight log'],
  // Quadcopter / drone generic terms
  quadcopter: ['كواد', 'كواد كاتر', 'كوادكابتر', 'كوادكوبتر', 'كوادروتور', 'quadcopter', 'quad', 'درون', 'drone', 'طائره', 'مسيره', 'مسيرة'],
  // Build / assembly
  build: ['بناء', 'تجميع', 'تركيب', 'build', 'assemble', 'assembly', 'ابني', 'بني'],
  // Wiring generic
  wiring: ['توصيل', 'اوصل', 'وصل', 'اربط', 'ربط', 'لحام', 'لحم', 'wiring', 'solder'],
};

export const intentKeywords: Record<string, string[]> = {
  // Definitional / explanatory
  definition: [
    'ما هو', 'ما هي', 'ماذا يعني', 'ماذا تعني', 'اشرح', 'شرح',
    'الفرق بين', 'ما الفرق', 'ما معنى', 'كيف يعمل', 'كيف تعمل',
    'what is', 'explain', 'definition', 'meaning',
  ],
  // New builder / beginner intent
  beginner_start: [
    'من أين أبدأ', 'من اين ابدا', 'كيف أبدأ', 'كيف ابدا', 'أبدأ من', 'ابدا من',
    'مبتدئ', 'مبتدي', 'جديد', 'أول مرة', 'اول مره', 'للمبتدئين', 'للمبتدئ',
    'ابدا المشروع',
    'أريد أن أتعلم', 'تعلم بناء', 'علمني من الصفر', 'علمني',
    'beginner', 'start', 'first time', 'new to fpv',
  ],
  // General build guidance
  build_guidance: [
    'كيف أبني', 'كيف ابني', 'خطوات البناء', 'خطوات التجميع',
    'بناء كواد', 'تجميع طائره', 'تجميع كواد', 'بناء درون',
    'ابني كواد', 'ابني درون', 'ابني الكواد', 'ابني طائره',
    'أريد أبني', 'أريد ابني',
    'ما أحتاج', 'ما احتاج', 'قائمة القطع', 'قائمه القطع',
    'how to build', 'build guide', 'build steps', 'parts list',
  ],
  // Component selection
  component_selection: [
    'أختار', 'اختيار', 'شراء', 'مناسب', 'أفضل', 'أنسب',
    'أفضل حجم', 'أنصح', 'choose', 'selection', 'buy', 'recommend',
    'ما الذي', 'أي نوع', 'أي حجم', 'ما هو أفضل', 'أنصح بـ',
    'توصيتك', 'توصيه', 'اقترح',
    // القطع in component context (not filter/cutoff)
    'القطع المناسبة', 'قطع مناسبة', 'اختيار القطع', 'شراء القطع',
    'قطع الدرون', 'قطع الكواد', 'أجزاء الدرون', 'مكونات الكواد',
    'أحتاجها لبناء', 'ما هي القطع', 'أي قطع',
  ],
  // UART / wiring
  wiring_uart: [
    'كيف أوصل', 'كيف اوصل', 'كيف أربط', 'كيف اربط',
    'توصيل', 'ربط', 'اتصال', 'uart', 'serial', 'tx', 'rx',
    'ports', 'connect', 'wiring', 'wire',
  ],
  // Battery / power
  battery_power: [
    'بطارية', 'بطاريه', 'lipo', 'ليبو', 'شحن', 'تفريغ',
    'فولت', 'امبير', 'خلايا', 'vbat', 'voltage',
    'قبل توصيل البطارية', 'قبل الشحن', 'smoke stopper', 'سموك',
  ],
  // Safety checks
  safety: [
    'هل أستطيع', 'هل آمن', 'آمن', 'خطر', 'قبل البطارية', 'قبل الطيران',
    'اختبار آمن', 'safe', 'safety', 'danger', 'risk',
    'هل يجوز', 'هل يمكن', 'تحذير', 'warning',
  ],
  // Betaflight-specific
  betaflight_setup: [
    'betaflight', 'بيتافلايت', 'بتافلاي', 'بيتا فلايت', 'بيتفلايت', 'bf',
    'configurator', 'ports tab', 'configuration tab', 'motors tab',
    'pid', 'rates', 'filters', 'blackbox', 'osd setup',
    'ضبط betaflight', 'إعداد betaflight', 'فتح betaflight',
  ],
  // Troubleshooting
  troubleshooting: [
    'لا يعمل', 'لا تعمل', 'مشكلة', 'مشاكل', 'ينقلب', 'تنقلب',
    'يسخن', 'تسخن', 'لا يحفظ', 'لا يدور', 'لا تدور', 'لا يستجيب',
    'لا تستجيب', 'خطأ', 'error', 'problem', 'not working', 'overheating',
    'يدور بشكل خاطئ', 'يرتجف', 'اهتزاز', 'vibration',
    'لا يرد', 'غير مستجيب', 'لم يعمل',
    'لا يتصل', 'لا تتصل', 'غير متصل',
  ],
  // Motors and props specific
  motors_props: [
    'محرك', 'محركات', 'موتور', 'مروحة', 'مراوح', 'motor', 'motors', 'prop', 'props',
    'اختبار المحركات', 'motors tab', 'تدوير المحرك', 'تدوير الموتور',
    'kv', 'rpm', 'اتجاه الدوران', 'direction',
  ],
  // Vague / unclear problem
  vague_problem: [
    'مشكلة', 'مشاكل', 'عندي مشكله', 'عندي مشكلة', 'في مشكله', 'مو شغال',
    'ما يشتغل', 'ما يعمل', 'ما شغال', 'مو صح', 'شي غلط',
    'problem', 'issue', 'something wrong', 'not working',
  ],
  // Setup / configuration (kept for backward-compat scoring)
  setup: [
    'كيف أضبط', 'كيف أعد', 'إعداد', 'ضبط', 'modes', 'configuration',
    'setup', 'configure', 'binding', 'ربط', 'receiver setup',
  ],
};
