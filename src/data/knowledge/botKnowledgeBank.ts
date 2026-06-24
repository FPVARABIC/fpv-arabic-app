export type BotKnowledgeBankCategory =
  | "beginner_qa"
  | "wiring"
  | "motors"
  | "receiver"
  | "receiver_elrs"
  | "betaflight"
  | "safety"
  | "esc"
  | "flight_controller"
  | "power"
  | "gps_vtx"
  | "buying";

export type BotKnowledgeBankAnswerMode =
  | "beginner"
  | "troubleshooting"
  | "informational"
  | "safety"
  | "buying";

export type BotKnowledgeBankEntry = {
  id: string;
  category: BotKnowledgeBankCategory;
  priority: number;
  answerMode: BotKnowledgeBankAnswerMode;
  questionPatterns: string[];
  shortAnswer: string;
  steps: string[];
  safetyNote?: string;
  relatedKnowledgeTopics: string[];
};

export const botKnowledgeBank: BotKnowledgeBankEntry[] = [
  {
    id: "KB-BEGINNER-001",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "أريد أن أتعلم بناء الكوادكابتر",
      "أريد تعلم بناء الكوادكابتر",
      "أريد تعلم بناء الدرون",
      "من أين أبدأ",
      "كيف أبدأ",
      "أريد تعلم fpv",
      "أريد بناء أول درون",
      "علمني من الصفر",
      "أريد أن أتعلم fpv",
    ],
    shortAnswer:
      "إذا كنت مبتدئاً فلا تبدأ بشراء القطع مباشرة. ابدأ بفهم المكونات الأساسية ثم تعلّم الكهرباء والتوصيلات قبل أي عملية شراء أو تركيب.",
    steps: [
      "افهم كيف يعمل الكوادكابتر.",
      "تعرّف على القطع الأساسية.",
      "تعلّم أساسيات الكهرباء.",
      "اختر حجم الدرون المناسب.",
      "ابدأ التخطيط لأول تجميعة.",
    ],
    relatedKnowledgeTopics: ["quadcopter-basics", "fpv-intro"],
  },
  {
    id: "KB-BEGINNER-002",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "ما أول قطعة أشتريها",
      "ماذا أشتري أولاً",
      "أول شيء أشتريه",
      "ما أول مكون أشتريه",
    ],
    shortAnswer:
      "لا تشترِ أي قطعة منفردة قبل اختيار حجم الدرون والهدف منه. جميع القطع يجب أن تكون متوافقة مع بعضها.",
    steps: [
      "حدّد حجم الدرون.",
      "حدّد نوع الاستخدام.",
      "اختر الفريم أولاً.",
      "ابنِ قائمة القطع كاملة.",
      "اشترِ القطع بعد التأكد من التوافق.",
    ],
    relatedKnowledgeTopics: ["component-selection", "frame-size"],
  },
  {
    id: "KB-BEGINNER-003",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "3 إنش أم 5 إنش",
      "أيّهما أفضل 3 أو 5",
      "أفضل حجم للمبتدئ",
      "هل أختار 5 إنش",
    ],
    shortAnswer:
      "بالنسبة لمعظم المبتدئين يعتبر 5 إنش الخيار الأكثر توازناً من حيث الأداء وتوفر القطع وسهولة التعلم.",
    steps: [
      "اختر 3 إنش إذا كنت تريد حجماً صغيراً.",
      "اختر 5 إنش للتعلم والاستخدام العام.",
      "اختر 7 إنش للمدى الطويل فقط.",
      "تجنب تغيير الحجم أثناء اختيار القطع.",
      "تأكد من توافق البطارية والمحركات مع الحجم.",
    ],
    relatedKnowledgeTopics: ["frame-size", "drone-size"],
  },
  {
    id: "KB-BEGINNER-004",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "هل أستطيع بناء درون وحدي",
      "هل البناء صعب",
      "هل fpv صعب",
      "هل أقدر أتعلم fpv",
    ],
    shortAnswer:
      "نعم تستطيع، لكن بشرط أن تتعلم خطوة بخطوة ولا تبدأ بالتوصيل قبل فهم الكهرباء والسلامة.",
    steps: [
      "ابدأ بالمفاهيم الأساسية.",
      "تعلّم الكهرباء البسيطة.",
      "لا تشترِ عشوائياً.",
      "اتبع Checklist قبل التشغيل.",
      "لا تركب المراوح أثناء الاختبار.",
    ],
    relatedKnowledgeTopics: ["quadcopter-basics", "safety", "first-power"],
  },
  {
    id: "KB-BEGINNER-005",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "هل أحتاج لحام",
      "هل لازم soldering",
      "هل أحتاج كاوية لحام",
    ],
    shortAnswer:
      "نعم، في أغلب تجميعات FPV ستحتاج إلى لحام جيد وآمن.",
    steps: [
      "تعلّم اللحام على أسلاك تدريبية.",
      "لا تبدأ مباشرة على Flight Controller.",
      "استخدم قصديراً مناسباً.",
      "افحص كل نقطة لحام.",
      "استخدم Smoke Stopper بعد اللحام.",
    ],
    relatedKnowledgeTopics: ["soldering", "first-power"],
  },
  {
    id: "KB-BEGINNER-006",
    category: "beginner_qa",
    priority: 70,
    answerMode: "safety",
    questionPatterns: [
      "هل أركب المراوح الآن",
      "متى أركب المراوح",
      "اختبار بالمراوح",
      "props on",
    ],
    shortAnswer:
      "لا تركب المراوح أثناء الإعداد أو اختبار المحركات. المراوح تركب فقط قبل الطيران الفعلي وفي مكان آمن.",
    steps: [
      "أزل المراوح أثناء Betaflight.",
      "أزلها أثناء Motor Test.",
      "أزلها أثناء فحص ARM.",
      "ركّبها فقط في مكان طيران آمن.",
      "تأكد من اتجاهها الصحيح قبل الطيران.",
    ],
    safetyNote: "المراوح أخطر جزء أثناء الاختبار.",
    relatedKnowledgeTopics: ["motor-testing", "betaflight-motors-tab"],
  },
  {
    id: "KB-BEGINNER-007",
    category: "beginner_qa",
    priority: 50,
    answerMode: "beginner",
    questionPatterns: [
      "هل أحتاج gps",
      "هل gps ضروري",
      "هل أطير بدون gps",
    ],
    shortAnswer:
      "GPS ليس ضرورياً لأول درون تدريب، لكنه مفيد للمدى الطويل والرجوع التلقائي في بعض الأنظمة.",
    steps: [
      "لا تبدأ بـ GPS إذا كان هدفك التعلم الأساسي.",
      "ركّز على تركيب الدرون وتشغيله بأمان.",
      "تعلّم Betaflight أولاً.",
      "أضف GPS لاحقاً إذا احتجت.",
      "لا تعتمد على GPS كبديل للتعلم.",
    ],
    relatedKnowledgeTopics: ["gps", "navigation"],
  },
  {
    id: "KB-BEGINNER-008",
    category: "beginner_qa",
    priority: 60,
    answerMode: "beginner",
    questionPatterns: [
      "أول طيران",
      "كيف أطير أول مرة",
      "أول تجربة طيران",
      "أخاف أطير الدرون",
    ],
    shortAnswer:
      "أول طيران يجب أن يكون قصيراً وبسيطاً وفي مكان مفتوح، والهدف منه التأكد أن الدرون مستقر وليس الاستعراض.",
    steps: [
      "اختر مكاناً واسعاً.",
      "افحص البطارية والمراوح.",
      "ابدأ بتحليق منخفض.",
      "لا تبتعد.",
      "اهبط فوراً إذا شعرت أن التحكم غير طبيعي.",
    ],
    safetyNote:
      "لا تجرب أول طيران قرب الناس أو السيارات أو داخل المنزل.",
    relatedKnowledgeTopics: ["first-flight", "betaflight"],
  },

  {
    id: "KB-WIRING-001",
    category: "wiring",
    priority: 70,
    answerMode: "informational",
    questionPatterns: [
      "tx rx",
      "rx tx",
      "كيف أوصل الريسيفر",
      "هل أوصل tx مع tx",
      "أوصل tx مع tx",
    ],
    shortAnswer:
      "قاعدة التوصيل الأساسية هي TX إلى RX و RX إلى TX. توصيل TX مع TX أو RX مع RX لن يعمل.",
    steps: [
      "حدّد منفذ TX في أول جهاز.",
      "وصله إلى RX في الجهاز الآخر.",
      "حدّد RX في أول جهاز.",
      "وصله إلى TX في الجهاز الآخر.",
      "تحقق من المخطط قبل التشغيل.",
    ],
    safetyNote: "راجع التوصيلات قبل توصيل البطارية.",
    relatedKnowledgeTopics: ["uart", "tx-rx-wiring"],
  },
  {
    id: "KB-WIRING-002",
    category: "wiring",
    priority: 70,
    answerMode: "informational",
    questionPatterns: [
      "ما هو gnd",
      "ما معنى gnd",
      "سلك gnd",
      "أرضي",
    ],
    shortAnswer:
      "جميع الأجهزة تحتاج أرضياً مشتركاً GND لكي تعمل الإشارات بشكل صحيح.",
    steps: [
      "أوصل GND إلى GND.",
      "لا تخلط بين GND و 5V.",
      "تأكد من ثبات اللحام.",
      "افحص المخطط.",
      "استخدم Smoke Stopper عند أول تشغيل.",
    ],
    relatedKnowledgeTopics: ["gnd", "power-wiring"],
  },
  {
    id: "KB-WIRING-003",
    category: "wiring",
    priority: 70,
    answerMode: "informational",
    questionPatterns: [
      "ما هو vbat",
      "أين أوصل vbat",
      "سلك vbat",
    ],
    shortAnswer:
      "VBAT هو الجهد المباشر القادم من البطارية ويجب التعامل معه بحذر.",
    steps: [
      "تأكد من الجهد المطلوب.",
      "لا توصل VBAT بمنفذ 5V.",
      "راجع المخطط.",
      "افحص القطبية.",
      "استخدم Smoke Stopper عند أول تشغيل.",
    ],
    relatedKnowledgeTopics: ["vbat", "power-wiring"],
  },

  {
    id: "KB-MOTORS-001",
    category: "motors",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "المحركات لا تدور",
      "الموتورات لا تعمل",
      "الدرون لا يدور المحركات",
      "motors not spinning",
    ],
    shortAnswer:
      "غالباً تكون المشكلة في إعدادات الريسيفر أو الـ ESC أو عدم السماح بالتسليح Arming.",
    steps: [
      "افحص صفحة Receiver.",
      "تحقق من وجود إشارة من الراديو.",
      "افحص تبويب Motors.",
      "تأكد من بروتوكول DSHOT.",
      "راجع رسائل التحذير في Betaflight.",
    ],
    safetyNote: "أزل المراوح قبل أي اختبار للمحركات.",
    relatedKnowledgeTopics: ["motors", "betaflight-motors-tab"],
  },
  {
    id: "KB-MOTORS-002",
    category: "motors",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "اتجاه المحركات خطأ",
      "المحركات تدور بالعكس",
      "motor direction",
    ],
    shortAnswer:
      "يمكن تصحيح اتجاه المحركات من Betaflight أو ESC Configurator دون تبديل الأسلاك في أغلب الحالات.",
    steps: [
      "افحص مخطط اتجاه المحركات.",
      "افتح ESC Configurator.",
      "اعكس اتجاه المحرك المطلوب.",
      "احفظ الإعدادات.",
      "أعد الاختبار بدون مراوح.",
    ],
    safetyNote: "أزل المراوح قبل اختبار اتجاه المحركات أو تغيير إعدادات ESC.",
    relatedKnowledgeTopics: ["motor-direction", "esc-configurator"],
  },

  {
    id: "KB-RX-001",
    category: "receiver",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "الريسيفر لا يعمل",
      "receiver لا يعمل",
      "لا أرى القنوات",
      "لا توجد استجابة للراديو",
    ],
    shortAnswer:
      "أغلب مشاكل الريسيفر سببها UART خاطئ أو بروتوكول غير صحيح أو عدم الربط Bind.",
    steps: [
      "تحقق من الربط Bind.",
      "راجع UART الصحيح.",
      "اختر البروتوكول الصحيح.",
      "افحص أسلاك TX و RX.",
      "راقب حركة القنوات في Receiver Tab.",
    ],
    relatedKnowledgeTopics: ["receiver", "uart", "bind"],
  },

  {
    id: "KB-BF-001",
    category: "betaflight",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "betaflight لا يحفظ",
      "الإعدادات لا تحفظ",
      "save لا يعمل",
    ],
    shortAnswer:
      "تأكد من الضغط على Save and Reboot أو استخدام أمر save داخل CLI.",
    steps: [
      "اضغط Save and Reboot.",
      "استخدم save داخل CLI.",
      "أعد الاتصال.",
      "جرّب كابل USB مختلفاً.",
      "تحقق من عدم ظهور أخطاء.",
    ],
    relatedKnowledgeTopics: ["betaflight", "save-settings", "cli"],
  },
  {
    id: "KB-BF-002",
    category: "betaflight",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "لا يتصل betaflight",
      "cannot connect",
      "failed to open serial port",
    ],
    shortAnswer:
      "غالباً تكون المشكلة في تعريفات USB أو المنفذ المستخدم.",
    steps: [
      "جرّب كابل بيانات حقيقي.",
      "أغلق البرامج الأخرى.",
      "تحقق من COM Port.",
      "أعد تشغيل Betaflight.",
      "جرّب منفذاً مختلفاً.",
    ],
    relatedKnowledgeTopics: ["betaflight", "usb-connection", "ports"],
  },
  {
    id: "KB-BF-003",
    category: "betaflight",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "لا يظهر الريسيفر في betaflight",
      "receiver tab لا يتحرك",
      "القنوات لا تتحرك",
    ],
    shortAnswer:
      "إذا لم تتحرك القنوات في Receiver Tab فالمشكلة غالباً في UART أو البروتوكول أو الربط Bind.",
    steps: [
      "تأكد أن الريسيفر مربوط بالراديو.",
      "فعّل Serial RX على UART الصحيح.",
      "اختر البروتوكول الصحيح.",
      "افحص TX/RX.",
      "أعد تشغيل Betaflight.",
    ],
    relatedKnowledgeTopics: ["receiver", "betaflight-receiver-tab", "uart"],
  },
  {
    id: "KB-BF-004",
    category: "betaflight",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "لا يعمل arm",
      "الدرون لا يعمل arm",
      "arming disabled",
      "لا يتسلح الدرون",
    ],
    shortAnswer:
      "إذا لم يعمل ARM فاقرأ سبب المنع في Betaflight بدلاً من التخمين.",
    steps: [
      "افتح Betaflight.",
      "راجع رسائل Arming Disable Flags.",
      "تأكد من وضع ARM في Modes.",
      "افحص القنوات.",
      "لا تختبر مع المراوح.",
    ],
    safetyNote: "لا تحاول حل مشكلة ARM والمراوح مركبة.",
    relatedKnowledgeTopics: ["arming", "betaflight-modes", "safety"],
  },
  {
    id: "KB-BF-005",
    category: "betaflight",
    priority: 70,
    answerMode: "troubleshooting",
    questionPatterns: [
      "modes لا تعمل",
      "arm mode لا يعمل",
      "angle mode لا يعمل",
    ],
    shortAnswer:
      "مشاكل Modes غالباً تكون بسبب Channel Range غير صحيح أو AUX خاطئ.",
    steps: [
      "افتح Receiver Tab.",
      "حرّك أزرار الراديو.",
      "حدّد AUX الصحيح.",
      "اضبط النطاق داخل Modes.",
      "احفظ وجرب مرة أخرى.",
    ],
    relatedKnowledgeTopics: ["betaflight-modes", "aux-channels"],
  },
  {
    id: "KB-BF-006",
    category: "betaflight",
    priority: 70,
    answerMode: "troubleshooting",
    questionPatterns: [
      "gyro يتحرك غلط",
      "النموذج يتحرك بالعكس",
      "betaflight model wrong",
      "الحركة معكوسة",
    ],
    shortAnswer:
      "إذا كان نموذج الدرون في Betaflight يتحرك عكس الواقع، فالمشكلة غالباً في اتجاه Flight Controller.",
    steps: [
      "ضع الدرون على سطح ثابت.",
      "حرّك الدرون بيدك.",
      "راقب النموذج في Betaflight.",
      "عدّل Board Alignment.",
      "احفظ وأعد الاختبار.",
    ],
    relatedKnowledgeTopics: ["board-alignment", "betaflight-configuration"],
  },

  {
    id: "KB-SAFETY-001",
    category: "safety",
    priority: 70,
    answerMode: "safety",
    questionPatterns: [
      "ما هو smoke stopper",
      "لماذا أحتاج smoke stopper",
    ],
    shortAnswer:
      "Smoke Stopper يحمي القطع عند أول تشغيل ويقلل خطر احتراق المكونات بسبب أخطاء التوصيل.",
    steps: [
      "وصله بين البطارية والدرون.",
      "شغّل الدرون لأول مرة عبره.",
      "راقب أي تحذير أو انقطاع.",
      "أصلح الخطأ إن وجد.",
      "أعد الاختبار قبل التشغيل المباشر.",
    ],
    relatedKnowledgeTopics: ["smoke-stopper", "first-power"],
  },
  {
    id: "KB-SAFETY-002",
    category: "safety",
    priority: 100,
    answerMode: "safety",
    questionPatterns: [
      "بطارية منتفخة",
      "lipo منتفخة",
      "هل البطارية آمنة",
    ],
    shortAnswer:
      "بطارية LiPo المنتفخة تعتبر إشارة تحذير ويجب التعامل معها بحذر.",
    steps: [
      "توقف عن استخدامها.",
      "لا تشحنها داخل المنزل دون مراقبة.",
      "ضعها في مكان آمن.",
      "راقب أي ارتفاع في الحرارة.",
      "استبدلها إذا كان الانتفاخ واضحاً.",
    ],
    safetyNote:
      "بطارية LiPo المنتفخة خطر حريق. لا تشحنها ولا تستخدمها، وضعها في مكان آمن بعيداً عن المواد القابلة للاشتعال.",
    relatedKnowledgeTopics: ["lipo-safety", "battery-care"],
  },
  {
    id: "KB-SAFETY-003",
    category: "safety",
    priority: 80,
    answerMode: "safety",
    questionPatterns: [
      "هل أشحن lipo",
      "كيف أشحن lipo",
      "شحن بطارية الدرون",
      "lipo charging",
    ],
    shortAnswer:
      "اشحن LiPo فقط بشاحن مناسب وتحت مراقبة، ولا تتركها تشحن وحدها.",
    steps: [
      "استخدم شاحناً مخصصاً لـ LiPo.",
      "اختر عدد الخلايا الصحيح.",
      "راقب البطارية أثناء الشحن.",
      "لا تشحن بطارية منتفخة.",
      "خزّن البطارية على Storage Voltage.",
    ],
    relatedKnowledgeTopics: ["lipo-charging", "battery-storage"],
  },
  {
    id: "KB-SAFETY-004",
    category: "safety",
    priority: 100,
    answerMode: "safety",
    questionPatterns: [
      "رائحة حرق",
      "دخان من الدرون",
      "احترق شيء",
      "smell burning",
    ],
    shortAnswer:
      "إذا ظهرت رائحة حرق أو دخان، افصل البطارية فوراً ولا تعيد التشغيل قبل معرفة السبب.",
    steps: [
      "افصل البطارية فوراً.",
      "لا تلمس القطع الساخنة مباشرة.",
      "افحص ESC وFC والأسلاك.",
      "ابحث عن قصر أو قطبية خاطئة.",
      "لا تعيد التشغيل إلا بعد الإصلاح.",
    ],
    safetyNote: "الدخان ليس مشكلة إعدادات؛ غالباً مشكلة كهربائية.",
    relatedKnowledgeTopics: ["electrical-safety", "first-power"],
  },

  {
    id: "KB-ESC-001",
    category: "esc",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "esc لا يعمل",
      "الاسك لا يعمل",
      "لا يوجد صوت من esc",
      "esc no beep",
    ],
    shortAnswer:
      "إذا لم يصدر ESC أي صوت عند توصيل البطارية، فابدأ بفحص الطاقة واللحام قبل إعدادات Betaflight.",
    steps: [
      "افصل البطارية فوراً.",
      "افحص لحام أسلاك البطارية.",
      "تأكد من توصيل ESC بالـ Flight Controller.",
      "افحص وجود قصر كهربائي.",
      "جرّب التشغيل عبر Smoke Stopper.",
    ],
    safetyNote:
      "لا تكرر توصيل البطارية إذا لم تسمع صوت ESC قبل فحص التوصيلات.",
    relatedKnowledgeTopics: ["esc", "first-power", "smoke-stopper"],
  },
  {
    id: "KB-ESC-002",
    category: "esc",
    priority: 100,
    answerMode: "safety",
    questionPatterns: [
      "esc يسخن",
      "الاسك يسخن",
      "esc hot",
      "حرارة esc",
    ],
    shortAnswer:
      "سخونة ESC بدون تشغيل المحركات غالباً تعني مشكلة توصيل أو قصر كهربائي.",
    steps: [
      "افصل البطارية.",
      "افحص وجود قصدير زائد.",
      "تأكد من عدم تلامس الأسلاك.",
      "راجع قطبية البطارية.",
      "لا تشغل الدرون مرة أخرى قبل الفحص.",
    ],
    safetyNote: "سخونة ESC علامة خطر وليست شيئاً طبيعياً.",
    relatedKnowledgeTopics: ["esc", "electrical-safety"],
  },
  {
    id: "KB-ESC-003",
    category: "esc",
    priority: 40,
    answerMode: "informational",
    questionPatterns: [
      "esc protocol",
      "dshot",
      "أي بروتوكول esc",
      "motor protocol",
    ],
    shortAnswer:
      "في أغلب التجميعات الحديثة استخدم DSHOT لأنه لا يحتاج معايرة مثل البروتوكولات القديمة.",
    steps: [
      "افتح Betaflight.",
      "اذهب إلى تبويب Motors.",
      "اختر DSHOT مناسباً.",
      "احفظ الإعدادات.",
      "اختبر المحركات بدون مراوح.",
    ],
    relatedKnowledgeTopics: ["dshot", "esc-protocol", "betaflight-motors"],
  },
  {
    id: "KB-ESC-004",
    category: "esc",
    priority: 40,
    answerMode: "informational",
    questionPatterns: [
      "esc calibration",
      "هل أعمل calibration لل esc",
      "معايرة esc",
    ],
    shortAnswer:
      "إذا كنت تستخدم DSHOT فلا تحتاج عادة إلى ESC calibration.",
    steps: [
      "تحقق من البروتوكول المستخدم.",
      "إذا كان DSHOT فلا تعمل معايرة.",
      "إذا كان PWM أو OneShot راجع طريقة المعايرة.",
      "احفظ الإعدادات.",
      "اختبر بدون مراوح.",
    ],
    relatedKnowledgeTopics: ["esc-calibration", "dshot"],
  },

  {
    id: "KB-FC-001",
    category: "flight_controller",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "flight controller لا يعمل",
      "fc لا يعمل",
      "الكنترولر لا يعمل",
      "لا توجد إضاءة في fc",
    ],
    shortAnswer:
      "إذا لم يعمل Flight Controller فابدأ بفحص مصدر الطاقة والكابل واللحام.",
    steps: [
      "جرّب التوصيل عبر USB.",
      "افحص هل تظهر إضاءة.",
      "افحص مدخل 5V.",
      "تأكد من عدم وجود قصر.",
      "لا توصل البطارية قبل الفحص.",
    ],
    relatedKnowledgeTopics: ["flight-controller", "power-supply"],
  },
  {
    id: "KB-FC-002",
    category: "flight_controller",
    priority: 70,
    answerMode: "troubleshooting",
    questionPatterns: [
      "اتجاه flight controller",
      "اتجاه fc",
      "ركبته بالعكس",
      "board alignment",
    ],
    shortAnswer:
      "إذا كان اتجاه Flight Controller مختلفاً عن اتجاه الدرون، يجب تعديل Board Alignment في Betaflight.",
    steps: [
      "حدّد اتجاه السهم على FC.",
      "قارنه باتجاه مقدمة الدرون.",
      "افتح Configuration.",
      "عدّل Board Alignment.",
      "تأكد من حركة النموذج في Betaflight.",
    ],
    relatedKnowledgeTopics: ["board-alignment", "betaflight-configuration"],
  },
  {
    id: "KB-FC-003",
    category: "flight_controller",
    priority: 70,
    answerMode: "troubleshooting",
    questionPatterns: [
      "fc يهتز",
      "flight controller vibration",
      "الجايرو فيه اهتزاز",
      "gyro noise",
    ],
    shortAnswer:
      "اهتزاز Flight Controller يؤثر على قراءة الجايرو وقد يسبب طيراناً غير مستقر.",
    steps: [
      "تأكد من استخدام المطاطات grommets.",
      "لا تشد البراغي بقوة زائدة.",
      "أبعد الأسلاك عن الجايرو.",
      "تأكد من ثبات الفريم.",
      "راقب الاهتزاز بعد أول اختبار آمن.",
    ],
    relatedKnowledgeTopics: ["vibration-isolation", "gyro", "grommets"],
  },

  {
    id: "KB-POWER-001",
    category: "power",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "لا توجد طاقة",
      "الدرون لا يشتغل",
      "لا يعمل بعد توصيل البطارية",
      "no power",
    ],
    shortAnswer:
      "إذا لم يعمل الدرون بعد توصيل البطارية، فابدأ بفحص البطارية والـ XT60 واللحام.",
    steps: [
      "افصل البطارية.",
      "افحص شحن البطارية.",
      "افحص XT60.",
      "افحص أسلاك البطارية على ESC.",
      "استخدم Smoke Stopper عند إعادة التشغيل.",
    ],
    relatedKnowledgeTopics: ["power-supply", "xt60", "battery"],
  },
  {
    id: "KB-POWER-002",
    category: "power",
    priority: 100,
    answerMode: "safety",
    questionPatterns: [
      "شرارة عند توصيل البطارية",
      "spark عند البطارية",
      "شرارة xt60",
    ],
    shortAnswer:
      "شرارة صغيرة قد تحدث أحياناً بسبب شحن المكثفات، لكن الشرارة القوية أو الرائحة علامة خطر.",
    steps: [
      "افصل البطارية.",
      "افحص القطبية.",
      "افحص وجود قصر.",
      "استخدم Smoke Stopper.",
      "لا تكرر التشغيل إذا ظهرت رائحة أو دخان.",
    ],
    safetyNote: "الدخان أو الرائحة يعني توقف فوراً.",
    relatedKnowledgeTopics: ["electrical-safety", "spark", "smoke-stopper"],
  },

  {
    id: "KB-ELRS-001",
    category: "receiver_elrs",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "elrs لا يعمل",
      "expresslrs لا يعمل",
      "receiver elrs",
      "elrs no telemetry",
    ],
    shortAnswer:
      "مشاكل ELRS غالباً تكون من عدم التطابق بين الريسيفر والراديو أو خطأ في UART.",
    steps: [
      "تأكد من نجاح Bind.",
      "تأكد من نفس Binding Phrase.",
      "راجع UART الصحيح.",
      "اختر CRSF في Betaflight.",
      "افحص لمبة الريسيفر.",
    ],
    relatedKnowledgeTopics: ["elrs", "receiver", "uart", "bind"],
  },
  {
    id: "KB-ELRS-002",
    category: "receiver_elrs",
    priority: 70,
    answerMode: "informational",
    questionPatterns: [
      "crsf",
      "ما هو crsf",
      "أختار crsf أم sbus",
      "elrs protocol",
    ],
    shortAnswer:
      "مع ExpressLRS اختر CRSF في Betaflight، وليس SBUS.",
    steps: [
      "افتح Receiver settings.",
      "اختر Serial Receiver.",
      "اختر CRSF.",
      "احفظ الإعدادات.",
      "افحص حركة القنوات.",
    ],
    relatedKnowledgeTopics: ["crsf", "elrs", "betaflight-receiver"],
  },
  {
    id: "KB-ELRS-003",
    category: "receiver_elrs",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "sbus لا يعمل",
      "sbus receiver",
      "اخترت sbus ولا يعمل",
    ],
    shortAnswer:
      "SBUS يحتاج منفذاً مناسباً وإعدادات مختلفة، وليس هو الاختيار الصحيح لـ ELRS.",
    steps: [
      "تأكد من نوع الريسيفر.",
      "إذا كان ELRS استخدم CRSF.",
      "إذا كان SBUS فعلاً، راجع UART المناسب.",
      "فعّل Serial RX.",
      "اختبر القنوات.",
    ],
    relatedKnowledgeTopics: ["sbus", "receiver", "uart"],
  },

  {
    id: "KB-GPS-001",
    category: "gps_vtx",
    priority: 70,
    answerMode: "troubleshooting",
    questionPatterns: [
      "gps لا يعمل",
      "gps لا يظهر",
      "لا توجد أقمار",
      "gps no satellites",
    ],
    shortAnswer:
      "GPS قد يحتاج وقتاً ومكاناً مفتوحاً، لكن يجب أولاً التأكد من UART والباودريت.",
    steps: [
      "ضع الدرون في مكان مفتوح.",
      "انتظر عدة دقائق.",
      "راجع UART الخاص بالـ GPS.",
      "تحقق من Baud Rate.",
      "أبعد GPS عن مصادر التشويش.",
    ],
    relatedKnowledgeTopics: ["gps", "uart", "baud-rate"],
  },
  {
    id: "KB-VTX-001",
    category: "gps_vtx",
    priority: 80,
    answerMode: "troubleshooting",
    questionPatterns: [
      "vtx لا يعمل",
      "لا توجد صورة",
      "dji o4 لا يظهر",
      "no video",
    ],
    shortAnswer:
      "مشاكل الفيديو غالباً تكون من الطاقة أو UART/MSP أو إعدادات النظارة.",
    steps: [
      "تحقق من تغذية VTX.",
      "راجع توصيل GND.",
      "فعّل MSP على UART الصحيح.",
      "تأكد من ربط النظارة.",
      "افحص الكابل والهوائي.",
    ],
    relatedKnowledgeTopics: ["vtx", "video-transmitter", "msp"],
  },

  {
    id: "KB-BUY-001",
    category: "buying",
    priority: 60,
    answerMode: "buying",
    questionPatterns: [
      "ما القطع التي أحتاجها",
      "قائمة قطع درون",
      "مكونات كوادكابتر",
      "ماذا أحتاج لبناء درون",
    ],
    shortAnswer:
      "لبناء كوادكابتر تحتاج منظومة كاملة، وليس قطعة واحدة فقط.",
    steps: [
      "Frame.",
      "Motors.",
      "ESC.",
      "Flight Controller.",
      "Receiver ونظام فيديو وبطارية ومراوح.",
    ],
    relatedKnowledgeTopics: ["component-list", "build-basics"],
  },
  {
    id: "KB-BUY-002",
    category: "buying",
    priority: 60,
    answerMode: "buying",
    questionPatterns: [
      "هل هذه القطع متوافقة",
      "توافق القطع",
      "هل هذا الموتور يناسب",
      "هل هذه البطارية تناسب",
    ],
    shortAnswer:
      "توافق القطع يعتمد على الحجم، الجهد، التيار، ونظام التحكم.",
    steps: [
      "تحقق من حجم الفريم.",
      "تحقق من مقاس المحركات.",
      "تحقق من 4S أو 6S.",
      "تحقق من قدرة ESC.",
      "لا تشتر قبل مراجعة القائمة كاملة.",
    ],
    relatedKnowledgeTopics: ["component-compatibility", "voltage-matching"],
  },
  {
    id: "KB-BUY-003",
    category: "buying",
    priority: 60,
    answerMode: "buying",
    questionPatterns: [
      "4s أم 6s",
      "أختار 4s أو 6s",
      "بطارية 4s",
      "بطارية 6s",
    ],
    shortAnswer:
      "للمبتدئ، المهم ليس اختيار 4S أو 6S فقط، بل توافق البطارية مع المحركات والـ ESC.",
    steps: [
      "لا تخلط قطع 4S و6S عشوائياً.",
      "اقرأ مواصفات المحركات.",
      "اقرأ تحمل ESC.",
      "اختر بطارية مناسبة للتجميعة.",
      "لا تستخدم بطارية أعلى من تحمل القطع.",
    ],
    safetyNote: "استخدام جهد غير مناسب قد يتلف القطع فوراً.",
    relatedKnowledgeTopics: ["battery-voltage", "4s-vs-6s", "lipo-selection"],
  },
  {
    id: "KB-BUY-004",
    category: "buying",
    priority: 60,
    answerMode: "buying",
    questionPatterns: [
      "أي موتور أشتري",
      "أفضل موتور للمبتدئ",
      "motor kv",
      "ما معنى kv",
    ],
    shortAnswer:
      "اختيار المحرك يعتمد على حجم الدرون والبطارية والمراوح، وليس على رقم KV وحده.",
    steps: [
      "حدّد حجم الدرون.",
      "حدّد 4S أو 6S.",
      "اختر مقاس محرك مناسب.",
      "اختر KV مناسب للبطارية.",
      "لا تشتر محركاً قبل اختيار الفريم.",
    ],
    relatedKnowledgeTopics: ["motor-selection", "kv", "battery-voltage"],
  },
  {
    id: "KB-BUY-005",
    category: "buying",
    priority: 60,
    answerMode: "buying",
    questionPatterns: [
      "أي فريم أشتري",
      "أفضل فريم للمبتدئ",
      "frame للمبتدئ",
    ],
    shortAnswer:
      "اختر فريماً منتشراً وسهل التركيب، ولا تبدأ بفريم غريب أو ضيق جداً.",
    steps: [
      "اختر حجم 5 إنش غالباً.",
      "تأكد من مساحة تركيب FC وESC.",
      "تأكد من جودة الذراعين.",
      "تجنب الفريمات المعقدة.",
      "راجع توافق نظام الفيديو.",
    ],
    relatedKnowledgeTopics: ["frame-selection", "frame-size"],
  },
];
