/**
 * BOT CONCEPT REGISTRY — Phase 0
 *
 * Stable Concept IDs for the FPV bot's internal reference model.
 *
 * IMPORTANT — read before editing:
 *
 *  1. Concept IDs (BotConceptId) are the ONLY stable references used by the
 *     bot internally. All routing rules, bank entries, and lesson links should
 *     eventually reference a concept ID, not a raw Arabic string.
 *
 *  2. Arabic labels and synonyms MAY change as the vocabulary evolves.
 *     Concept IDs MUST NOT change — renaming an ID is a breaking change that
 *     requires updating every reference across all bot files.
 *
 *  3. Safety-critical concepts (safetyLevel: "critical") require manual review
 *     before any synonym or anchor modifications. Never reduce safety coverage
 *     without an explicit QA pass.
 *
 *  4. Phase 0 only: This file is standalone. It is NOT yet imported by
 *     botKnowledgeRules.ts or searchKnowledge.ts. Future phases will migrate
 *     synonymGroups and intentKeywords to derive from this registry.
 *
 *  5. Arabic-English mixed synonyms are intentional and required — users write
 *     "ال FC", "وصلت ESC", "DSHOT شو هو" regularly. Include both scripts.
 */

// ── Concept ID union ──────────────────────────────────────────────────────────
// Only add to this union — never remove or rename existing members.

export type BotConceptId =
  // Core build & hardware
  | 'drone_build_basics'
  | 'motor_basic'
  | 'esc_basic'
  | 'flight_controller_basic'
  | 'receiver_basic'
  | 'vtx_basic'
  | 'propeller_basic'
  | 'wiring_basics'
  // Power & safety
  | 'power_battery'
  | 'lipo_safety'
  // Radio link
  | 'tx_rx_rule'
  // Firmware
  | 'betaflight_basics'
  // Navigation / positioning
  | 'gps_basics'
  // App navigation (meta)
  | 'app_navigation';

// ── Safety level ──────────────────────────────────────────────────────────────

export type SafetyLevel = 'none' | 'informational' | 'critical';

// ── Core concept type ─────────────────────────────────────────────────────────

export type BotConcept = {
  /**
   * Stable snake_case identifier. Must not change after first commit.
   * Used as the key for routing rules, bank entry tags, and lesson links.
   */
  id: BotConceptId;

  /**
   * Primary Arabic display label shown in user-facing chips and headings.
   * May be updated freely without breaking internal references.
   */
  labelAr: string;

  /**
   * All Arabic and English surface forms that refer to this concept.
   * Includes colloquial, abbreviated, and Arabic-English mixed variants.
   * Matched after normalizeArabicQuery() is applied.
   *
   * Include "ال" prefixed forms (ال FC, ال ESC) as separate entries
   * since the normalizer does not strip the definite article.
   */
  synonyms: string[];

  /**
   * If present, at least ONE of these anchors should be present in the query
   * for this concept to be considered an active match. Used to avoid false
   * positives for ambiguous synonyms (e.g. "tx" alone could mean transmitter
   * or wiring without additional context).
   *
   * Phase 0: this field is inert — no runtime code reads it yet.
   */
  requiredAnchors?: string[];

  /**
   * Safety classification for this concept.
   * critical — must never be modified without a QA pass; bot must always
   *            surface a warning before any other content.
   * informational — mild safety note appropriate; bot may proceed normally.
   * none — no safety concern.
   */
  safetyLevel: SafetyLevel;

  /**
   * One-sentence Arabic definition shown to beginners when no bank entry
   * matches but the concept is identified with high confidence.
   */
  shortDefinition?: string;

  /**
   * If present, overrides the standard answer path for beginner queries.
   * Used to redirect beginners to a lesson or roadmap instead of theory.
   */
  beginnerOverride?: string;

  /**
   * Simple adjacency list of directly related concept IDs.
   * Not a graph engine — just a flat array for follow-up chip generation.
   * Resolves to follow-up suggestions in the answer response.
   */
  relatedConcepts?: BotConceptId[];
};

// ── Registry ──────────────────────────────────────────────────────────────────

export const botConceptRegistry: BotConcept[] = [
  // ── drone_build_basics ────────────────────────────────────────────────────

  {
    id: 'drone_build_basics',
    labelAr: 'بناء الكوادكابتر',
    synonyms: [
      // Arabic build verbs — all common forms
      'بناء', 'أبني', 'ابني', 'أصنع', 'اصنع', 'يصنع', 'صنع', 'نصنع',
      'أعمل درون', 'اعمل درون', 'أركب', 'اركب',
      // Assembly nouns
      'تجميع', 'تركيب', 'تصنيع',
      // Object variants
      'بناء درون', 'ابني درون', 'أبني درون',
      'بناء كواد', 'ابني كواد', 'أبني كواد',
      'بناء كوادكابتر', 'تجميع كوادكابتر', 'تجميع درون',
      'تركيب الدرون', 'تركيب كواد',
      // English
      'build', 'assemble', 'assembly', 'build guide', 'how to build',
      // Step-related
      'خطوات البناء', 'خطوات التجميع', 'من الصفر',
    ],
    safetyLevel: 'none',
    shortDefinition: 'بناء الكوادكابتر يعني تجميع الهيكل والمحركات والـ ESC والـ FC والريسيفر ونظام الفيديو خطوة بخطوة.',
    beginnerOverride: 'ابدأ من قسم البناء في التطبيق — فيه خارطة طريق كاملة خطوة بخطوة.',
    relatedConcepts: [
      'motor_basic',
      'esc_basic',
      'flight_controller_basic',
      'receiver_basic',
      'vtx_basic',
      'wiring_basics',
    ],
  },

  // ── motor_basic ───────────────────────────────────────────────────────────

  {
    id: 'motor_basic',
    labelAr: 'المحركات',
    synonyms: [
      // Arabic
      'محرك', 'محركات', 'محركه', 'موتور', 'موتورات',
      // Torque / direction
      'اتجاه الدوران', 'دوران المحرك', 'CW', 'CCW',
      // KV rating
      'kv', 'kv موتور', 'كيلوفولت',
      // Testing
      'اختبار المحركات', 'Motor Test', 'موتورز تاب',
      // English
      'motor', 'motors',
    ],
    safetyLevel: 'informational',
    shortDefinition: 'المحركات تحوّل الطاقة الكهربائية إلى دوران لتحريك المراوح ورفع الطائرة.',
    beginnerOverride: 'ابدأ بدرس تركيب المحركات في التطبيق — ركز على اتجاه الدوران والبراغي الصحيحة.',
    relatedConcepts: ['esc_basic', 'propeller_basic', 'betaflight_basics'],
  },

  // ── esc_basic ─────────────────────────────────────────────────────────────

  {
    id: 'esc_basic',
    labelAr: 'ESC — منظم السرعة',
    synonyms: [
      // English / mixed
      'ESC', 'ال ESC', 'esc',
      // Arabic colloquial
      'الاسك', 'إيسك', 'اسك',
      // Full names
      'electronic speed controller', 'منظم السرعة', 'متحكم السرعة', 'تحكم السرعة',
      // Stack form
      '4in1', 'four in one', 'esc stack',
      // Protocols — included so "dshot" routes here, not to advancedTerms bypass
      'DSHOT', 'dshot', 'دي شوت', 'oneshot', 'multishot', 'besc',
      // Wiring context
      'وصل ESC', 'توصيل ESC', 'ربط ESC',
    ],
    safetyLevel: 'informational',
    shortDefinition: 'الـ ESC يتحكم في سرعة المحرك بناءً على أوامر الـ FC، ويحوّل جهد البطارية إلى إشارات للمحرك.',
    relatedConcepts: ['motor_basic', 'flight_controller_basic', 'lipo_safety', 'wiring_basics'],
  },

  // ── flight_controller_basic ───────────────────────────────────────────────

  {
    id: 'flight_controller_basic',
    labelAr: 'فلايت كنترولر (FC)',
    synonyms: [
      // English / mixed — all "ال" prefixed forms required
      'FC', 'ال FC', 'الـ FC',
      'flight controller', 'flight control',
      // Arabic names
      'الفلايت كنترولر', 'فلايت كنترولر', 'فلاي كنترولر',
      'متحكم الطيران', 'متحكم طيران',
      'كنترولر الطيران', 'لوحة الطيران', 'لوحة التحكم',
      // Colloquial
      'الطيار',
      // Orientation
      'اتجاه FC', 'orientation', 'grommets',
    ],
    safetyLevel: 'none',
    shortDefinition: 'الـ FC هو "دماغ" الكوادكابتر — يقرأ من الـ IMU والريسيفر ويرسل أوامر للـ ESC.',
    beginnerOverride: 'راجع درس تركيب الـ FC في التطبيق — ركز على الـ grommets واتجاه السهم.',
    relatedConcepts: ['betaflight_basics', 'esc_basic', 'receiver_basic', 'wiring_basics'],
  },

  // ── receiver_basic ────────────────────────────────────────────────────────

  {
    id: 'receiver_basic',
    labelAr: 'الريسيفر (RX)',
    synonyms: [
      // Arabic colloquial
      'ريسيفر', 'رسيفر', 'جهاز الاستقبال', 'الاستقبال',
      // English / mixed
      'RX', 'receiver',
      // Protocols
      'ELRS', 'ExpressLRS', 'expresslrs', 'CRSF', 'crsf', 'SBUS', 'sbus',
      // Binding
      'ربط الريسيفر', 'bind', 'باند', 'ربط جهاز التحكم',
      // Troubleshoot
      'الريسيفر لا يظهر', 'القنوات لا تتحرك', 'لا يرتبط',
    ],
    safetyLevel: 'none',
    shortDefinition: 'الريسيفر يستقبل الإشارة من جهاز التحكم ويرسلها إلى الـ FC عبر ELRS أو CRSF أو SBUS.',
    relatedConcepts: ['tx_rx_rule', 'flight_controller_basic', 'betaflight_basics'],
  },

  // ── vtx_basic ─────────────────────────────────────────────────────────────

  {
    id: 'vtx_basic',
    labelAr: 'نظام الفيديو (VTX)',
    synonyms: [
      // English
      'VTX', 'vtx', 'VRX', 'vrx',
      // Arabic
      'نظام الفيديو', 'ارسال الفيديو', 'إرسال الفيديو', 'نظام إرسال الفيديو',
      // Camera
      'كاميرا', 'camera', 'FPV camera', 'fpv camera',
      // Goggles
      'نظارة', 'نظارات', 'نظارات FPV', 'goggles',
      // OSD
      'OSD', 'osd', 'on screen display', 'عرض البيانات',
      // DJI
      'DJI O4', 'dji o4', 'DJI', 'dji',
      // Troubleshoot
      'لا توجد صورة', 'لا يوجد فيديو', 'الصورة سوداء',
    ],
    safetyLevel: 'none',
    shortDefinition: 'الـ VTX يرسل صورة حية من الكاميرا إلى نظارات الطيار — هو ما يجعل الطيران FPV ممكناً.',
    relatedConcepts: ['drone_build_basics', 'wiring_basics'],
  },

  // ── propeller_basic ───────────────────────────────────────────────────────

  {
    id: 'propeller_basic',
    labelAr: 'المراوح (Propellers)',
    synonyms: [
      // Arabic
      'مروحة', 'مراوح', 'مروحه',
      'جناح', 'أجنحة', 'شفرات',
      // English / mixed
      'prop', 'props', 'propeller', 'propellers',
      'بروب', 'بروبس',
      // Safety context — important: "مراوح مركبة" triggers safety_warning
      'مراوح مركبة', 'مراوح مركبه', 'props on',
      // Direction
      'CW prop', 'CCW prop', 'مروحة CW', 'مروحة CCW',
    ],
    safetyLevel: 'critical',
    shortDefinition: 'المراوح تحوّل دوران المحرك إلى قوة رفع. يجب إزالتها قبل أي اختبار للمحركات.',
    relatedConcepts: ['motor_basic', 'lipo_safety'],
  },

  // ── wiring_basics ─────────────────────────────────────────────────────────

  {
    id: 'wiring_basics',
    labelAr: 'التوصيل والأسلاك',
    synonyms: [
      // Wiring actions
      'توصيل', 'اوصل', 'أوصل', 'وصل', 'وصلت',
      'ربط', 'اربط', 'أربط',
      // Soldering
      'لحام', 'لحم', 'سولدر', 'solder', 'soldering', 'لحمت',
      // Wire types
      'سلك', 'أسلاك', 'اسلاك', 'كابل', 'كبل',
      // Connectors / ports
      'XT60', 'xt60', 'UART', 'uart',
      // Power rails
      'GND', 'gnd', 'أرضي', 'ارضي', 'Ground', 'ground',
      '5V', '5v', 'خمسة فولت',
      'VBAT', 'vbat', 'جهد البطارية',
      // Gulf dialect wiring phrases
      'وين أوصله', 'وين اوصله', 'وصلت بالغلط',
      // TX/RX in wiring context — combined with tx_rx_rule
      'TX', 'tx', 'RX', 'rx',
    ],
    safetyLevel: 'informational',
    shortDefinition: 'التوصيل هو ربط مكونات الكواد بالأسلاك الصحيحة مع الانتباه لـ GND و5V وVBAT وTX/RX.',
    relatedConcepts: ['flight_controller_basic', 'esc_basic', 'receiver_basic', 'tx_rx_rule'],
  },

  // ── power_battery ─────────────────────────────────────────────────────────

  {
    id: 'power_battery',
    labelAr: 'البطارية والطاقة',
    synonyms: [
      // Battery names
      'بطارية', 'بطاريه', 'battery',
      'LiPo', 'lipo', 'ليبو',
      // Cell counts
      '4S', '4s', '6S', '6s', '3S', '3s',
      // Connectors
      'XT60', 'xt60',
      // Power concepts
      'فولت', 'volt', 'voltage', 'جهد',
      'امبير', 'amp', 'amps', 'ampere', 'تيار',
      'mAh', 'mah',
      // Charging / storage
      'شحن', 'شحن البطارية', 'تخزين البطارية', 'تفريغ',
      'storage voltage', 'storage charge',
      // Rails
      'VBAT', 'vbat', 'جهد البطارية',
      // Protection
      'Smoke Stopper', 'smoke stopper', 'سموك ستوبر', 'حماية الكهرباء',
    ],
    safetyLevel: 'informational',
    shortDefinition: 'البطارية LiPo هي مصدر الطاقة — اختر الخلايا والـ mAh المناسبين للحجم والهدف.',
    relatedConcepts: ['lipo_safety', 'wiring_basics', 'esc_basic'],
  },

  // ── lipo_safety ───────────────────────────────────────────────────────────

  {
    id: 'lipo_safety',
    labelAr: 'سلامة بطارية LiPo',
    synonyms: [
      // Swollen battery — critical trigger
      'بطارية منتفخة', 'بطاريه منتفخه', 'انتفخت', 'انتفاخ', 'puffed', 'puffed battery',
      // Fire / smoke
      'دخان', 'smoke', 'حريق', 'fire', 'اشتعل', 'يشتعل',
      // Spark
      'شرارة', 'شراره', 'spark',
      // Overheating
      'يسخن', 'تسخن', 'ساخن', 'سخونة', 'سخونه', 'overheating',
      'الكابل يسخن', 'البطارية تسخن',
      // Damage
      'احترق', 'يحترق', 'تالف', 'محترق',
      // Safe practices
      'قبل توصيل البطارية', 'قبل الشحن', 'تخزين آمن',
    ],
    requiredAnchors: ['بطاريه', 'lipo', 'ليبو', 'انتفخت', 'دخان', 'شراره', 'يسخن'],
    safetyLevel: 'critical',
    shortDefinition: 'بطارية LiPo المنتفخة أو المتضررة خطر حريق حقيقي — أبعدها فوراً ولا تشحنها.',
    relatedConcepts: ['power_battery', 'propeller_basic'],
  },

  // ── tx_rx_rule ────────────────────────────────────────────────────────────

  {
    id: 'tx_rx_rule',
    labelAr: 'قاعدة TX/RX',
    synonyms: [
      // The rule itself
      'TX', 'tx', 'RX', 'rx',
      'UART', 'uart',
      'TX/RX', 'tx/rx', 'TX RX',
      // Common mistake forms (must detect and correct)
      'TX إلى TX', 'tx الى tx', 'tx مع tx', 'tx على tx',
      'TX الى TX', 'TX مع TX',
      // Correct forms
      'TX إلى RX', 'tx الى rx', 'tx مع rx',
      // Wiring context
      'توصيل TX', 'وصل TX', 'توصيل UART',
      // Ports
      'serial port', 'منفذ serial', 'UART port',
      // Gulf mixed
      'TX/RX غلط', 'TX RX غلط', 'وصلت TX بالغلط',
    ],
    requiredAnchors: ['tx', 'rx', 'uart'],
    safetyLevel: 'informational',
    shortDefinition: 'القاعدة: TX من طرف يذهب إلى RX في الطرف الآخر — لا تصل TX بـ TX أبداً.',
    relatedConcepts: ['receiver_basic', 'flight_controller_basic', 'wiring_basics'],
  },

  // ── betaflight_basics ─────────────────────────────────────────────────────

  {
    id: 'betaflight_basics',
    labelAr: 'Betaflight',
    synonyms: [
      // All common spellings / typos
      'Betaflight', 'betaflight', 'بيتافلايت', 'بيتفلايت', 'بتافلاي',
      'بيتا فلايت', 'بيدفلايت', 'bf',
      // Configurator
      'Betaflight Configurator', 'betaflight configurator', 'configurator',
      // Key tabs
      'ports tab', 'motors tab', 'Modes tab', 'Receiver tab', 'Configuration tab',
      'بورتات', 'تبويب المحركات', 'تبويب Ports',
      // Features
      'PID', 'pid', 'rates', 'Expo', 'expo',
      'Blackbox', 'blackbox', 'سجل الطيران',
      'Failsafe', 'failsafe', 'فيل سيف',
      'CLI', 'cli',
      'OSD', 'osd',
      'ARM', 'arm', 'arming', 'تسليح',
      // Filters — note: these were in advancedTerms but also describe Betaflight
      'filter', 'filters', 'فلتر', 'فلاتر',
      // Actions
      'ضبط Betaflight', 'إعداد Betaflight', 'فتح Betaflight',
      'حفظ الإعدادات', 'save and reboot',
    ],
    safetyLevel: 'none',
    shortDefinition: 'Betaflight هو برنامج الـ firmware الذي يتحكم في سلوك الكوادكابتر — يُضبط عبر Betaflight Configurator.',
    beginnerOverride: 'افتح قسم Betaflight في التطبيق — فيه دليل خطوة بخطوة للمبتدئين.',
    relatedConcepts: ['flight_controller_basic', 'motor_basic', 'receiver_basic'],
  },

  // ── gps_basics ────────────────────────────────────────────────────────────

  {
    id: 'gps_basics',
    labelAr: 'GPS والملاحة',
    synonyms: [
      'GPS', 'gps', 'جي بي إس', 'جي بي اس',
      'بوصلة', 'compass',
      'Rescue mode', 'rescue mode', 'وضع الإنقاذ',
      'Return to Home', 'return to home', 'RTH', 'rth',
      'ملاحة', 'navigation',
      'موقع GPS', 'إحداثيات',
    ],
    safetyLevel: 'none',
    shortDefinition: 'GPS يتيح للكوادكابتر معرفة موقعه وتفعيل وظائف مثل Return-to-Home — موضوع متقدم نسبياً للمبتدئين.',
    beginnerOverride: 'GPS موضوع متقدم — أتقن التوصيل والـ Betaflight أولاً ثم ارجع لهذا الموضوع.',
    relatedConcepts: ['betaflight_basics', 'drone_build_basics'],
  },

  // ── app_navigation ────────────────────────────────────────────────────────

  {
    id: 'app_navigation',
    labelAr: 'التنقل في التطبيق',
    synonyms: [
      // "Where to start" in all forms
      'من أين أبدأ', 'من اين ابدا', 'ابدأ من أين', 'ابدا من اين',
      'كيف أبدأ', 'كيف ابدا', 'أبدأ من', 'ابدا من',
      // App sections
      'افتح قسم البناء', 'قسم البناء',
      'افتح قسم الدروس', 'قسم الدروس',
      'افتح قسم Betaflight', 'قسم بيتافلايت',
      'افتح قسم التقدم', 'قسم التقدم',
      'افتح قسم المساعد',
      // Next step
      'الخطوة التالية', 'الخطوه التاليه',
      'ما الخطوة التالية', 'ما الخطوه التاليه',
      'ماذا بعد', 'ماذا أفعل بعد',
      // Beginner entry
      'أنا جديد', 'انا جديد',
      'مبتدئ', 'مبتدي', 'للمبتدئين',
      'أول مرة', 'اول مره',
    ],
    safetyLevel: 'none',
    shortDefinition: 'التطبيق يحتوي على: قسم البناء، الدروس، Betaflight، التقدم، والمساعد.',
    relatedConcepts: ['drone_build_basics', 'betaflight_basics'],
  },
];

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getConceptById(id: BotConceptId): BotConcept | undefined {
  return botConceptRegistry.find(c => c.id === id);
}

export function getCriticalSafetyConcepts(): BotConcept[] {
  return botConceptRegistry.filter(c => c.safetyLevel === 'critical');
}

export function getRelatedConcepts(id: BotConceptId): BotConcept[] {
  const concept = getConceptById(id);
  if (!concept?.relatedConcepts) return [];
  return concept.relatedConcepts
    .map(relId => getConceptById(relId))
    .filter((c): c is BotConcept => c !== undefined);
}
