/**
 * EVERY ARABIC SENTENCE THE V2 ENTRY JOURNEY SAYS
 * ===============================================
 *
 * In one file so the copy can be read as PROSE and judged as prose, instead of
 * being audited across eight components. Whoever reviews the Arabic should be
 * able to read this top to bottom without opening a single .tsx.
 *
 * THE RULES THIS COPY FOLLOWS
 * ---------------------------
 * · Arabic first. A technical token appears only where the reader will meet it
 *   again on a product page — «ExpressLRS», «DJI», «4S». Never «ecosystem»,
 *   never «prerequisite», never «compatibility engine».
 * · No sentence claims one option is better than another unless the CATALOGUE
 *   says so. The voltage and size notes are borrowed from `labels.ts`, where
 *   they are already written as «context, not a rule».
 * · No step counting. «الخطوة ٢ من ٨» is the feeling V2 exists to remove.
 * · Short. A question, one line of why, then the choices.
 */

/** The entry screen. */
export const ENTRY = {
  title: 'ابنِ درونك خطوة بخطوة',
  lead:
    'أخبرنا بما تريد بناءه، ونتكفّل نحن بما نستطيع حسمه من القطع المتوافقة — '
    + 'ولا نسألك إلا عمّا نحتاجه فعلًا.',
  reassure:
    'لست مضطرًا لمعرفة كل قطعة الآن. التفاصيل التقنية موجودة متى أردتها.',
  cta: 'ابدأ البناء',
} as const;

/** The three human stages. Not a progress bar — a map. */
export const PHASES = [
  { id: 'parts', titleAr: 'اختيار القطع' },
  { id: 'assembly', titleAr: 'التجميع' },
  { id: 'setup', titleAr: 'الإعداد وأول تشغيل' },
] as const;

export const PHASE_FUTURE_NOTE = 'لاحقًا في هذا المسار';

/** The goal question. */
export const GOAL = {
  question: 'ماذا تريد أن تبني؟',
  help: 'نوع الطيران الذي تريده هو ما يحدّد بقية الاختيارات.',
} as const;

/** Prerequisite questions, keyed by the engine's own input key. */
export const REQUIRED_INPUT = {
  cellCount: {
    question: 'على أي جهد بطارية تبني؟',
    help: 'كلاهما يعمل لهذا البناء، ولا شيء في بياناتنا يرجّح أحدهما — الاختيار لك.',
  },
  sizeInch: {
    question: 'ما مقاس البناء؟',
    help: 'أكثر من مقاس يؤدي إلى بناء سليم هنا، فالاختيار لك.',
  },
} as const;

/** The budget preference. Optional, and honest about what it does. */
export const BUDGET = {
  question: 'ما فئة الميزانية التي تناسبك؟',
  help: 'يساعدنا هذا في ترتيب الخيارات المتوافقة — ولا يتجاوز التوافق أبدًا.',
  options: [
    { value: 'budget', label: 'اقتصادي' },
    { value: 'mid', label: 'متوازن' },
    // NOT «السعر ليس الأولوية» — that is a claim about the reader's wallet.
    // `premium` is a tier the catalogue assigns to a part, nothing more.
    { value: 'premium', label: 'الفئة الأعلى' },
    { value: 'none', label: 'لا تفضيل' },
  ],
  /*
   * NOT «دون ترتيب بالسعر». The engine has never sorted by `priceRangeUSD`;
   * it ranks by the catalogue's `tier` and only when the reader names one. A
   * note promising «no price ordering» describes a feature that does not
   * exist, and quietly tells the reader that the other three answers DO sort
   * by price. Both halves are false.
   */
  noneNote: 'لن نفضّل فئة ميزانية على أخرى.',
} as const;

/** Equipment already on the reader's desk. */
export const OWNED = {
  question: 'هل لديك معدات تريد أن نبني حولها؟',
  help: 'إن كنت تملك جهاز تحكم أو نظارة، فسنقصر الاختيارات على ما يعمل معها.',
  options: [
    { value: 'none', label: 'لا، سأبدأ من الصفر' },
    { value: 'radio', label: 'لدي جهاز تحكم' },
    { value: 'goggles', label: 'لدي نظارة' },
    { value: 'both', label: 'لدي الاثنان' },
  ],
  radioQuestion: 'أي نظام يستخدم جهاز التحكم لديك؟',
  radioHelp: 'المستقبل يجب أن يتحدث لغة جهازك نفسها.',
  gogglesQuestion: 'من أي منظومة نظارتك؟',
  gogglesHelp: 'وحدة الفيديو ونظارتك يجب أن تكونا من المنظومة نفسها.',
  unsure: 'لست متأكدًا',
  unsureNote: 'لا بأس — سنعرض كل المنظومات، ويمكنك تحديدها لاحقًا.',
} as const;

/** The summary — «this is what we understood». */
export const SUMMARY = {
  title: 'هذا ما فهمناه',
  lead: 'راجع ما اخترته وما استنتجه النظام قبل أن ننتقل إلى القطع.',
  chosenBadge: 'اخترته أنت',
  /*
   * The reader ANSWERED this question — the answer was «I don't know». The
   * row exists so «هذا ما فهمناه» cannot silently drop a question they were
   * put through, and the badge stays «اخترته أنت» because choosing this was
   * their decision, not the system's inference.
   */
  unsureValue: 'لست متأكدًا',
  derivedBadge: 'استنتجه النظام',
  derivedNote: 'من القطع المتوفرة لهذا النوع',
  fields: {
    droneType: 'نوع البناء',
    sizeInch: 'المقاس',
    cellCount: 'جهد البطارية',
    budgetTier: 'فئة الميزانية',
    rcSystem: 'نظام التحكم لديك',
    videoSystem: 'منظومة النظارة لديك',
  },
  // Phase 2B stops here on purpose: the parts themselves are 2C.
  nextTitle: 'جاهزون لبناء اقتراح القطع',
  nextBody: 'الخطوة التالية ستعرض القطع المقترحة وسبب كل اختيار.',
} as const;

/** Navigation. */
export const NAV = {
  back: 'رجوع',
  next: 'التالي',
} as const;

/** The preview banner — this is not the product yet, and says so. */
export const PREVIEW_NOTICE = {
  label: 'معاينة',
  body: 'نسخة قيد التطوير من مسار البناء. النسخة الحالية ما زالت المعتمدة.',
  backToV1: 'العودة إلى مسار البناء الحالي',
} as const;
