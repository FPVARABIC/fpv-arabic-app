// TEMPORARY BOT ANSWER PLACEHOLDER
// This file is a Bot V2 presentation-layer placeholder.
// It is NOT the canonical Learning Knowledge Base.
// Phase LKB-1 will define the asset-ready LearningNode schema.
// Phase LKB-2 will migrate this content into the unified Learning Knowledge Base.
// Do not expand this file beyond the initial Bot V2 concept placeholders.

/**
 * BOT V2 — Knowledge base.
 *
 * 14 knowledge nodes — one per BotConceptId. Each node is self-contained and
 * referenced by knowledgeResolver. Do not inline content elsewhere.
 *
 * Authoring rules:
 *  - shortAnswer: max 2 Arabic sentences.
 *  - steps: max 6 entries.
 *  - chips: max 3 entries.
 *  - lipo_safety and propeller_basic: NO sourceSearchHints (critical safety nodes).
 *  - No lesson body text copied — only internal route links.
 */

import type { BotV2KnowledgeNode } from './knowledgeTypes';

export const botKnowledgeBase: BotV2KnowledgeNode[] = [
  // ── drone_build_basics ────────────────────────────────────────────────────

  {
    conceptId: 'drone_build_basics',
    shortAnswer:
      'لبناء كوادكابتر FPV، ابدأ خطوة بخطوة — لا تتعجل ولا تركب المراوح إلا بعد إتمام جميع الاختبارات.',
    beginnerExplanation:
      'الكواد يتكون من هيكل + محركات + ESC + FC + ريسيفر + VTX. ابدأ من قسم البناء في التطبيق — فيه خريطة طريق كاملة.',
    steps: [
      'اختر الهدف والحجم (ننصح بـ 5 بوصة للمبتدئ)',
      'افهم القطع الأساسية: FC، ESC، محركات، ريسيفر، VTX',
      'راجع الكهرباء والتوصيل: GND و5V وVBAT وTX/RX',
      'جمّع بدون تركيب المراوح — اختبر الكهرباء أولاً',
      'اختبر عبر Betaflight وChecklist قبل أي طيران',
    ],
    safetyNotes:
      'لا توصل البطارية قبل استخدام Smoke Stopper. لا تركب المراوح أثناء اختبار المحركات أبداً.',
    relatedConceptIds: [
      'motor_basic',
      'esc_basic',
      'flight_controller_basic',
      'receiver_basic',
      'vtx_basic',
      'wiring_basics',
    ],
    internalLinks: [{ label: 'خريطة البناء', route: '/roadmap' }],
    chips: [
      { label: 'ابدأ بخريطة الدروس', route: '/roadmap' },
      { label: 'افتح Checklist قبل الشراء', route: '/checklists' },
      { label: 'تعلّم الكهرباء أولاً', route: '/lessons/lesson-8' },
    ],
    lessonRedirect: '/roadmap',
  },

  // ── motor_basic ───────────────────────────────────────────────────────────

  {
    conceptId: 'motor_basic',
    shortAnswer:
      'المحركات تحوّل الكهرباء إلى دوران — كل محرك له اتجاه محدد (CW أو CCW) يتناسب مع مروحته.',
    beginnerExplanation:
      'محركات الكواد brushless تعمل بثلاثة أسلاك من الـ ESC. اعكس أي سلكين لتغيير اتجاه الدوران.',
    steps: [
      'افصل البطارية أولاً ثم أزل المراوح',
      'افتح Motors Tab في Betaflight واقبل التحذير',
      'حرك شريط كل موتور لاختبار الدوران',
      'تحقق من اتجاه كل موتور (CW/CCW) حسب مخطط الكواد',
      'اعكس سلكين في الـ ESC أو من Betaflight لتصحيح الاتجاه',
    ],
    relatedConceptIds: ['esc_basic', 'propeller_basic', 'betaflight_basics'],
    internalLinks: [{ label: 'درس المحركات', route: '/lessons/lesson-5' }],
    chips: [
      { label: 'درس الحجم والمحركات', route: '/lessons/lesson-5' },
      { label: 'اختبار في Betaflight', route: '/betaflight' },
    ],
    lessonRedirect: '/lessons/lesson-5',
    sourceSearchHints: ['motor direction FPV quad', 'brushless motor KV rating', 'motor not spinning betaflight'],
  },

  // ── esc_basic ─────────────────────────────────────────────────────────────

  {
    conceptId: 'esc_basic',
    shortAnswer:
      'الـ ESC يتحكم في سرعة كل محرك بناءً على أوامر الـ FC عبر بروتوكول DSHOT.',
    beginnerExplanation:
      'الـ ESC يربط البطارية بالمحرك ويتحكم في السرعة إلكترونياً — اختر ESC يناسب التيار الأقصى لمحركاتك.',
    steps: [
      'افصل البطارية أولاً',
      'تحقق من توصيل VBAT وGND من البطارية للـ ESC',
      'افتح Motors Tab في Betaflight وحدد DSHOT300 أو DSHOT600',
      'اختبر كل موتور بالتسلسل مع إزالة المراوح',
      'افحص أسلاك الموتور على الـ ESC إن كان موتور لا يدور',
    ],
    relatedConceptIds: ['motor_basic', 'flight_controller_basic', 'lipo_safety', 'wiring_basics'],
    internalLinks: [{ label: 'درس التوصيل', route: '/lessons/lesson-8' }],
    chips: [
      { label: 'اختبار المحركات', query: 'كيف أختبر محركاتي' },
      { label: 'درس التوصيل', route: '/lessons/lesson-8' },
    ],
    sourceSearchHints: ['ESC calibration FPV', 'DSHOT protocol setup', 'BLHeli ESC configuration', '4in1 ESC wiring'],
  },

  // ── flight_controller_basic ───────────────────────────────────────────────

  {
    conceptId: 'flight_controller_basic',
    shortAnswer:
      'الـ FC دماغ الكواد — يقرأ من الـ IMU ويصدر أوامر للـ ESC لتحقيق الاتزان.',
    beginnerExplanation:
      'الـ FC يستقبل أوامر الريسيفر ويقيس زاوية الطائرة من الـ gyro، ثم يُعدّل سرعة المحركات باستمرار.',
    steps: [
      'جرب كابل USB آخر (المشكلة الأكثر شيوعاً)',
      'تحقق من تثبيت Drivers على الحاسوب',
      'تحقق من عدم وجود short circuit على الـ FC',
      'جرب DFU Mode إن لم يُتعرف على الـ FC',
      'افحص الـ grommets وتأكد من اتجاه السهم على الـ FC',
    ],
    relatedConceptIds: ['betaflight_basics', 'esc_basic', 'receiver_basic', 'wiring_basics'],
    internalLinks: [{ label: 'قسم Betaflight', route: '/betaflight' }],
    chips: [
      { label: 'فتح Betaflight', route: '/betaflight' },
      { label: 'درس التوصيل', route: '/lessons/lesson-8' },
    ],
    lessonRedirect: '/betaflight',
    sourceSearchHints: ['flight controller not detected USB', 'FC driver install', 'DFU mode betaflight'],
  },

  // ── receiver_basic ────────────────────────────────────────────────────────

  {
    conceptId: 'receiver_basic',
    shortAnswer:
      'الريسيفر يستقبل إشارة جهاز التحكم ويُحوّلها لأوامر للـ FC عبر CRSF أو SBUS.',
    beginnerExplanation:
      'يجب ربط الريسيفر (bind) مع جهاز التحكم أولاً، ثم وصل TX من الريسيفر إلى RX في الـ FC، وتفعيل Serial RX في Betaflight.',
    steps: [
      'تحقق من توصيل 5V وGND للريسيفر',
      'تأكد: TX من الريسيفر → RX في الـ FC (ليس TX→TX)',
      'فعّل Serial RX على UART الصحيح في Betaflight Ports',
      'اختر Protocol الصحيح: CRSF لـ ELRS أو SBUS للأجهزة الأخرى',
      'تأكد من إتمام Binding بين جهاز التحكم والريسيفر',
    ],
    relatedConceptIds: ['tx_rx_rule', 'flight_controller_basic', 'betaflight_basics'],
    internalLinks: [{ label: 'درس TX/RX', route: '/lessons/lesson-9' }],
    chips: [
      { label: 'ربط الريسيفر', route: '/betaflight/receiver' },
      { label: 'قاعدة TX/RX', query: 'كيف أوصل TX و RX' },
    ],
    lessonRedirect: '/lessons/lesson-9',
    sourceSearchHints: ['ELRS binding guide', 'SBUS receiver setup betaflight', 'receiver channels not moving'],
  },

  // ── vtx_basic ─────────────────────────────────────────────────────────────

  {
    conceptId: 'vtx_basic',
    shortAnswer:
      'الـ VTX يرسل صورة حية من الكاميرا إلى نظاراتك — هو ما يحقق تجربة FPV.',
    beginnerExplanation:
      'VTX يحتاج VBAT وGND ومدخل فيديو من الكاميرا. يعمل عادةً على 5.8GHz مع نظارات FPV.',
    steps: [
      'تحقق من توصيل VBAT وGND للـ VTX',
      'وصّل خط Video من الكاميرا إلى مدخل Video In على الـ VTX',
      'تحقق من أن تردد النظارة والـ VTX متطابقان',
      'افحص إعدادات OSD في Betaflight لإضافة البيانات للشاشة',
      'لا تشغّل VTX بدون هوائي — يتلف فوراً',
    ],
    safetyNotes: 'لا تشغّل الـ VTX بدون هوائي متصل — يتلف في ثوانٍ.',
    relatedConceptIds: ['drone_build_basics', 'wiring_basics'],
    internalLinks: [],
    chips: [
      { label: 'توصيل الكهرباء', route: '/lessons/lesson-8' },
      { label: 'إعداد OSD', query: 'كيف أضبط OSD في Betaflight' },
    ],
    sourceSearchHints: ['VTX no signal FPV', 'FPV camera wiring', 'OSD Betaflight setup', 'DJI goggles frequency'],
  },

  // ── propeller_basic ───────────────────────────────────────────────────────
  // CRITICAL SAFETY NODE — sourceSearchHints MUST NOT be set.

  {
    conceptId: 'propeller_basic',
    shortAnswer:
      'المراوح تحوّل دوران المحرك لقوة رفع — يجب إزالتها دائماً قبل أي اختبار للمحركات.',
    beginnerExplanation:
      'مراوح CW تُركّب على المحركات CCW والعكس. اختبر اتجاه المحركات بـ Betaflight قبل تركيب المراوح.',
    steps: [
      'أوقف الاختبار فوراً وافصل البطارية',
      'أزل جميع المراوح قبل أي اختبار',
      'أعد اختبار المحركات عبر Betaflight Motors Tab بدون مراوح',
      'تأكد من إزالة جميع المراوح قبل كل إعادة تشغيل للمحركات',
      'ركّب المراوح فقط بعد اجتياز Checklist كاملاً',
    ],
    safetyNotes:
      'لا تختبر المحركات أبداً مع مراوح مركبة — تسبب إصابة بالغة في الأصابع.',
    relatedConceptIds: ['motor_basic', 'lipo_safety'],
    internalLinks: [{ label: 'Checklist السلامة', route: '/checklists' }],
    chips: [
      { label: 'Checklist السلامة', route: '/checklists' },
      { label: 'اختبار المحركات بدون مراوح', query: 'كيف أختبر المحركات بدون مراوح' },
    ],
    // sourceSearchHints intentionally omitted — critical safety node
  },

  // ── wiring_basics ─────────────────────────────────────────────────────────

  {
    conceptId: 'wiring_basics',
    shortAnswer:
      'التوصيل الصحيح يعني GND مشترك، VBAT للمكونات القوية، و5V للمكونات المنطقية.',
    beginnerExplanation:
      'قبل التوصيل: اعرف خريطة الـ FC، وحدد كل GND/VBAT/5V/TX/RX. استخدم المولتيمتر للتحقق من الاستمرارية والقطبية.',
    steps: [
      'افصل البطارية فوراً',
      'لا تلمس الأسلاك الساخنة — انتظر حتى تبرد',
      'افحص سماكة الكابل وقدرته على التيار (Wire Gauge)',
      'افحص القطبية (+ و-) على كل موصل بالمولتيمتر',
      'افحص short circuit ولحام مفتوح (Solder Bridge) بالمولتيمتر على continuity mode',
      'لا توصل البطارية إلا بعد الإصلاح وباستخدام Smoke Stopper',
    ],
    safetyNotes:
      'القطبية العكسية أو الشرارة أثناء التوصيل تعني short circuit — افصل فوراً. الأسلاك الساخنة تعني تيار زائد — لا تلمسها وافصل البطارية.',
    relatedConceptIds: ['flight_controller_basic', 'esc_basic', 'receiver_basic', 'tx_rx_rule'],
    internalLinks: [{ label: 'درس الكهرباء', route: '/lessons/lesson-8' }],
    chips: [
      { label: 'درس الكهرباء', route: '/lessons/lesson-8' },
      { label: 'Checklist قبل البطارية', route: '/checklists' },
    ],
    lessonRedirect: '/lessons/lesson-8',
  },

  // ── power_battery ─────────────────────────────────────────────────────────

  {
    conceptId: 'power_battery',
    shortAnswer:
      'بطارية LiPo تُختار حسب الخلايا (S) والسعة (mAh) ومعدل التفريغ (C rating).',
    beginnerExplanation:
      'كواد 5 بوصة يحتاج عادةً 4S أو 6S بـ 1300-1800mAh. اشحن دائماً بالقرب منك ولا تترك البطارية بلا رقابة.',
    steps: [
      'اختر خلايا مناسبة للحجم: 4S للمبتدئ، 6S للأداء العالي',
      'اختر mAh مناسب: 1300-1500mAh للكواد الخفيف، 1800mAh للأثقل',
      'استخدم Smoke Stopper عند أول توصيل',
      'اشحن البطارية بعيداً عن المواد القابلة للاشتعال',
      'خزّنها بشحن 3.8V/خلية عند التخزين الطويل',
    ],
    safetyNotes:
      'لا تشحن بطارية منتفخة. لا تترك البطارية بلا رقابة أثناء الشحن.',
    relatedConceptIds: ['lipo_safety', 'wiring_basics', 'esc_basic'],
    internalLinks: [{ label: 'درس البطارية', route: '/lessons/lesson-10' }],
    chips: [
      { label: 'درس البطارية والسلامة', route: '/lessons/lesson-10' },
      { label: 'Checklist قبل التوصيل', route: '/checklists' },
    ],
    lessonRedirect: '/lessons/lesson-10',
  },

  // ── lipo_safety ───────────────────────────────────────────────────────────
  // CRITICAL SAFETY NODE — sourceSearchHints MUST NOT be set.

  {
    conceptId: 'lipo_safety',
    shortAnswer:
      'بطارية LiPo منتفخة أو متضررة خطر حريق فوري — أبعدها الآن ولا تشحنها أبداً.',
    beginnerExplanation:
      'LiPo يمكن أن تشتعل إذا تلفت أو شُحنت بشكل خاطئ. افحص البطارية قبل كل استخدام وخزّنها على 3.8V/خلية.',
    steps: [
      'ابتعد عن الدخان فوراً — هوّد المكان إن كان آمناً للقيام بذلك',
      'لا تستخدم الماء على حريق LiPo — إذا كان هناك حريق حقيقي اتصل بالإسعاف فوراً',
      'افصل البطارية أو أبعدها عن المصدر الكهربائي فوراً إن كان ذلك آمناً',
      'ضعها في مكان مفتوح ومعزول بعيداً عن المواد القابلة للاشتعال',
      'لا تشحن بطارية منتفخة أو متضررة ولا تستخدمها مجدداً',
      'تخلص منها في مركز إعادة تدوير مخصص للبطاريات',
    ],
    safetyNotes:
      'لا تشحن بطارية LiPo منتفخة أو متضررة. لا تستخدم الماء على حريق LiPo — يزيد الاشتعال. إذا كان هناك دخان ابتعد وهوّد المكان. لا تضعها في القمامة العادية.',
    relatedConceptIds: ['power_battery', 'propeller_basic'],
    internalLinks: [{ label: 'درس سلامة البطاريات', route: '/lessons/lesson-10' }],
    chips: [{ label: 'درس سلامة البطاريات', route: '/lessons/lesson-10' }],
    // sourceSearchHints intentionally omitted — critical safety node
  },

  // ── tx_rx_rule ────────────────────────────────────────────────────────────

  {
    conceptId: 'tx_rx_rule',
    shortAnswer:
      'قاعدة TX/RX: TX من طرف → RX في الطرف الآخر. لا تصل TX بـ TX أبداً.',
    beginnerExplanation:
      'UART منفذ تسلسلي يحتوي TX وRX. TX يُرسل وRX يستقبل — لذا TX الريسيفر → RX الـ FC، وRX الريسيفر → TX الـ FC.',
    steps: [
      'TX من الريسيفر → RX في الـ FC',
      'RX من الريسيفر → TX في الـ FC',
      'لا تصل TX بـ TX ولا RX بـ RX أبداً',
      'فعّل Serial RX على نفس الـ UART في Betaflight Ports Tab',
      'اختر CRSF لـ ELRS أو SBUS للأجهزة الأخرى في Receiver Tab',
    ],
    relatedConceptIds: ['receiver_basic', 'flight_controller_basic', 'wiring_basics'],
    internalLinks: [
      { label: 'درس TX/RX', route: '/lessons/lesson-9' },
      { label: 'إعداد Betaflight Ports', route: '/betaflight/ports' },
    ],
    chips: [
      { label: 'درس TX/RX', route: '/lessons/lesson-9' },
      { label: 'Betaflight Ports', route: '/betaflight/ports' },
    ],
    lessonRedirect: '/lessons/lesson-9',
  },

  // ── betaflight_basics ─────────────────────────────────────────────────────

  {
    conceptId: 'betaflight_basics',
    shortAnswer:
      'Betaflight هو firmware الكواد — يُضبط عبر Betaflight Configurator على الحاسوب عبر USB.',
    beginnerExplanation:
      'ابدأ بـ Ports لإعداد الريسيفر، ثم Configuration لاختيار البروتوكول، ثم Motors للاختبار، ثم Modes لـ ARM. اضغط Save دائماً.',
    steps: [
      'جرب كابل USB آخر إن لم يتصل الـ FC (المشكلة الأكثر شيوعاً)',
      'افتح Ports وفعّل Serial RX على UART الريسيفر',
      'افتح Receiver Tab وتحقق من تحرك القنوات',
      'افتح Modes Tab وعيّن switch لـ ARM',
      'اضغط Save بعد كل تغيير',
    ],
    relatedConceptIds: ['flight_controller_basic', 'motor_basic', 'receiver_basic'],
    internalLinks: [{ label: 'قسم Betaflight', route: '/betaflight' }],
    chips: [
      { label: 'قسم Betaflight', route: '/betaflight' },
      { label: 'إعداد Ports', route: '/betaflight/ports' },
      { label: 'إعداد Receiver', route: '/betaflight/receiver' },
    ],
    lessonRedirect: '/betaflight',
    sourceSearchHints: ['Betaflight arming flags', 'motor test betaflight Motors Tab', 'receiver not showing betaflight'],
  },

  // ── gps_basics ────────────────────────────────────────────────────────────

  {
    conceptId: 'gps_basics',
    shortAnswer:
      'GPS يضيف وضع Rescue/RTH لإعادة الكواد تلقائياً — موضوع متقدم يأتي بعد إتقان الأساسيات.',
    beginnerExplanation:
      'GPS يحتاج UART خاص في الـ FC وإعداد في Betaflight. أتقن التوصيل والـ firmware أولاً قبل إضافة GPS.',
    steps: [
      'وصّل GPS على UART فارغ في الـ FC',
      'فعّل GPS في Betaflight Ports Tab على نفس الـ UART',
      'اضبط Baud Rate كما يحدد datasheet الـ GPS',
      'فعّل GPS و Magnetometer في Betaflight Configuration Tab',
      'اختبر في الهواء الطلق — GPS يحتاج وقتاً للتأهيل (Fix)',
    ],
    relatedConceptIds: ['betaflight_basics', 'drone_build_basics'],
    internalLinks: [],
    chips: [
      { label: 'قسم Betaflight', route: '/betaflight' },
      { label: 'أتقن الأساسيات أولاً', query: 'كيف أبدأ في بناء درون' },
    ],
    sourceSearchHints: ['GPS betaflight setup UART', 'GPS rescue mode configuration', 'magnetometer calibration FPV'],
  },

  // ── app_navigation ────────────────────────────────────────────────────────

  {
    conceptId: 'app_navigation',
    shortAnswer:
      'التطبيق يحتوي على أقسام متكاملة — ابدأ من خريطة البناء إذا كنت جديداً.',
    beginnerExplanation:
      'قسم البناء: خطوات التجميع خطوة بخطوة. قسم الدروس: 18 درساً من الأساسيات. Betaflight: إعداد الـ FC. Checklist: تحقق قبل كل مرحلة.',
    steps: [
      'قسم البناء: خريطة طريق كاملة خطوة بخطوة',
      'قسم الدروس: 18 درساً من الأساسيات للطيران',
      'قسم Betaflight: إعداد الـ FC خطوة بخطوة',
      'قسم الـ Checklist: تحقق قبل الشراء والتجميع والطيران',
      'المساعد: اطرح أي سؤال وسأرشدك',
    ],
    relatedConceptIds: ['drone_build_basics', 'betaflight_basics'],
    internalLinks: [
      { label: 'خريطة البناء', route: '/roadmap' },
      { label: 'الدروس', route: '/lessons/lesson-1' },
    ],
    chips: [
      { label: 'ابدأ من خريطة البناء', route: '/roadmap' },
      { label: 'افتح الدروس', route: '/lessons/lesson-1' },
      { label: 'افتح Checklist', route: '/checklists' },
    ],
  },
];
