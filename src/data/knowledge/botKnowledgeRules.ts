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
  // Flipping / takeoff — maps query forms (ينقلب) to entry forms (انقلاب) and related topics
  flip: ['ينقلب', 'انقلب', 'انقلاب', 'يقلب', 'تقلب', 'flip', 'flips', 'flipped', 'roll over', 'اقلاع', 'اول طيران', 'takeoff'],
  receiver: ['ريسيفر', 'receiver', 'rx', 'جهاز الاستقبال', 'استقبال'],
  betaflight: ['بيتافلايت', 'betaflight', 'bf', 'فيرموير', 'firmware'],
  failsafe: ['فيل سيف', 'failsafe', 'fail safe', 'فقدان الإشارة', 'signal loss'],
  smokestopper: ['smoke stopper', 'سموك ستوبر', 'smoke-stopper', 'حماية', 'protection'],
  esc: ['esc', 'إيسك', 'electronic speed controller', 'تحكم السرعة'],
  fc: ['flight controller', 'fc', 'متحكم طيران', 'متحكم الطيران', 'flight control'],
  gps: ['gps', 'جي بي إس', 'navigation', 'ملاحة'],
  uart: ['tx', 'rx', 'uart', 'serial', 'توصيل', 'serial port', 'منفذ'],
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
};

export const intentKeywords: Record<string, string[]> = {
  explanation: [
    'ما هو', 'ما هي', 'ماذا يعني', 'ماذا تعني', 'اشرح', 'شرح',
    'الفرق بين', 'ما الفرق', 'ما معنى', 'كيف يعمل', 'كيف تعمل',
    'what is', 'explain', 'definition', 'meaning',
  ],
  troubleshooting: [
    'لا يعمل', 'لا تعمل', 'مشكلة', 'مشاكل', 'ينقلب', 'تنقلب',
    'يسخن', 'تسخن', 'لا يحفظ', 'لا يدور', 'لا تدور', 'لا يستجيب',
    'لا تستجيب', 'خطأ', 'error', 'problem', 'not working', 'overheating',
    'يدور بشكل خاطئ', 'يرتجف', 'اهتزاز', 'vibration',
  ],
  safety: [
    'هل أستطيع', 'هل آمن', 'آمن', 'خطر', 'قبل البطارية', 'قبل الطيران',
    'اختبار آمن', 'safe', 'safety', 'danger', 'risk',
    'هل يجوز', 'هل يمكن', 'تحذير', 'warning',
  ],
  setup: [
    'كيف أضبط', 'كيف أوصل', 'كيف أعد', 'كيف أربط', 'إعداد',
    'ضبط', 'توصيل', 'ports', 'receiver', 'modes', 'configuration',
    'setup', 'configure', 'connect', 'binding', 'ربط',
  ],
  selection: [
    'أختار', 'اختيار', 'شراء', 'مناسب', 'أفضل', 'أنسب',
    'أفضل حجم', 'أنصح', 'choose', 'selection', 'buy', 'recommend',
    'ما الذي', 'أي نوع', 'أي حجم',
  ],
};
