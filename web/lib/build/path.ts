/**
 * The build path — the twenty steps from «what do I want» to «first flight».
 *
 * WHY THIS LIST IS DATA AND NOT A COMPONENT
 * -----------------------------------------
 * The wizard, the progress indicator, the «بناءي» summary and the regression
 * suite all need the same answer to "what are the steps and in what order".
 * One array, exported once, is the only way those four cannot drift apart —
 * the same reason `buildStages.ts` exists in the shared core.
 *
 * HOW THIS RELATES TO THE PHONE'S 18 STAGES
 * -----------------------------------------
 * The shared core's `buildStages` is the phone's selection flow: it ends at
 * «فحص التوافق النهائي» with two reserved placeholders («قائمة المشتريات»,
 * «خريطة التركيب» — both rendering «قريباً» on the phone). This path keeps
 * every selection the phone knows, in the order the product brief asked the
 * WEB to teach it, and then continues into the territory the phone reserved:
 * the BOM, the wiring overview, the assembly order, the safety gates, the
 * software setup and the first flight. `phoneStageIndex` maps each web step
 * onto the nearest phone stage so the ONE shared project store (see
 * `draft.ts`) records progress both surfaces can read — the web never invents
 * a second progress vocabulary.
 *
 * WHY SAFETY STEPS ARE A DISTINCT KIND
 * ------------------------------------
 * `gate` steps cannot be skipped by tapping «التالي»: they demand explicit
 * confirmation of the checks that stand between a finished solder joint and a
 * fire. The wizard enforces that mechanically (see BuildWizard), and the test
 * suite asserts the path declares them — a build guide whose safety section
 * is optional prose is not a safety section.
 */

import { buildStages } from '@core/data/assembly/buildStages';

export type BuildStepKind =
  /** Pick one value (drone type, size, voltage). */
  | 'choice'
  /** Pick parts from one or more catalogue categories. */
  | 'parts'
  /** The full-system compatibility report (the verdict engine). */
  | 'report'
  /** The final parts list with everything known about cost and gaps. */
  | 'bom'
  /** Reference content: wiring, assembly order, software, first flight. */
  | 'guide'
  /** A safety checkpoint that must be confirmed item by item. */
  | 'gate';

export interface BuildStep {
  id: string;
  /** 1-based position shown to the reader («الخطوة ٥ من ٢٠»). */
  number: number;
  titleAr: string;
  introAr: string;
  kind: BuildStepKind;
  /**
   * The catalogue categories this step selects from, in display order.
   * Only for `parts` steps. Keys match `PART_CATEGORY_MAP` exactly.
   */
  categories?: readonly string[];
  /**
   * Categories a reader may leave empty and still advance. GPS is the
   * canonical case — the shared core's own stage calls it optional.
   */
  optionalCategories?: readonly string[];
  /**
   * Index into the shared core's `buildStages` that this step corresponds
   * to. Used ONLY to mirror progress into the one shared project store —
   * never for content.
   */
  phoneStageIndex: number;
}

export const BUILD_PATH: readonly BuildStep[] = [
  {
    id: 'goal', number: 1, kind: 'choice', phoneStageIndex: 0,
    titleAr: 'تحديد الهدف',
    introAr: 'نوع الطيران الذي تريده يحدد كل اختيار بعده — الحجم والقطع والميزانية.',
  },
  {
    id: 'size', number: 2, kind: 'choice', phoneStageIndex: 1,
    titleAr: 'حجم الدرون',
    introAr: 'الأحجام المعروضة مشتقة من القطع المتوفرة فعلاً لنوعك — لا حجم يقود إلى طريق مسدود.',
  },
  {
    id: 'frame', number: 3, kind: 'parts', phoneStageIndex: 4,
    categories: ['frames'],
    titleAr: 'اختيار الإطار (Frame)',
    introAr: 'الهيكل الذي يحمل كل شيء. مقاسه يقيد المراوح، ونمط تثبيته يقيد الـFC.',
  },
  {
    id: 'power', number: 4, kind: 'choice', phoneStageIndex: 3,
    categories: ['batteries'],
    optionalCategories: ['batteries'],
    titleAr: 'جهد البطارية',
    introAr: 'اختر الفولتية (4S أو 6S) أولاً — فهي تحدد أي محركات وESC يمكن أصلاً النظر فيها. اختيار منتج البطارية نفسه يمكن تأجيله.',
  },
  {
    id: 'propulsion', number: 5, kind: 'parts', phoneStageIndex: 12,
    categories: ['motors', 'propellers'],
    titleAr: 'المحركات والمراوح معاً',
    introAr: 'المحرك والمروحة منظومة واحدة: يُختاران معاً على نفس الجهد ونفس مقاس الإطار.',
  },
  {
    id: 'esc', number: 6, kind: 'parts', phoneStageIndex: 6,
    categories: ['escs'],
    titleAr: 'منظّم سرعة المحركات (ESC)',
    introAr: 'يغذّي المحركات ويتحكم بسرعتها — كل قناة يجب أن تتحمل تيار محركها مع المروحة والجهد المختارين؛ وعند غياب بيانات موثقة راجع جدول اختبار الشركة المصنّعة.',
  },
  {
    id: 'fc', number: 7, kind: 'parts', phoneStageIndex: 7,
    categories: ['flightControllers'],
    titleAr: 'متحكّم الطيران (Flight Controller)',
    introAr: 'دماغ الطائرة. منافذ UART فيه هي مقاعد أجهزتك: المستقبل والفيديو وGPS يحتاج كلٌّ منها مقعداً.',
  },
  {
    id: 'rc', number: 8, kind: 'parts', phoneStageIndex: 8,
    categories: ['receivers'],
    titleAr: 'المستقبل (Receiver)',
    introAr: 'بروتوكول جهاز تحكمك أولاً — ELRS أو Crossfire — ثم المنتج: المستقبل يسمع لغة جهازك فقط.',
  },
  {
    id: 'video', number: 9, kind: 'parts', phoneStageIndex: 2,
    categories: ['videoUnits'],
    titleAr: 'نظام الفيديو (VTX)',
    introAr: 'منظومة نظارتك أولاً ثم المنتج — DJI وWalksnail وHDZero وAnalog لا تتخاطب فيما بينها.',
  },
  {
    id: 'extras', number: 10, kind: 'parts', phoneStageIndex: 14,
    categories: ['gps', 'buzzers', 'capacitors', 'tools'],
    optionalCategories: ['gps', 'buzzers', 'capacitors', 'tools'],
    titleAr: 'GPS والملحقات الاختيارية',
    introAr: 'GPS للعودة والتتبع، وBuzzer لإيجاد الدرون، وCapacitor لتنقية الطاقة، وأدوات اللحام والتجميع.',
  },
  {
    id: 'compat', number: 11, kind: 'report', phoneStageIndex: 15,
    titleAr: 'فحص التوافق الكهربائي والميكانيكي',
    introAr: 'المحرك يقرأ قطعك ويحكم عليها: ما يعمل معاً، وما يمنع، وما ينقص للحكم — بالسبب والدليل.',
  },
  {
    id: 'bom', number: 12, kind: 'bom', phoneStageIndex: 16,
    titleAr: 'قائمة القطع النهائية (BOM)',
    introAr: 'كل ما اخترته وما ينقصك، في قائمة واحدة قابلة للمراجعة قبل الشراء.',
  },
  {
    id: 'wiring', number: 13, kind: 'guide', phoneStageIndex: 17,
    titleAr: 'مخطط التوصيلات',
    introAr: 'مَن يتصل بمن: مسار الطاقة ومسارات الإشارة بين قطعك — والمصدر النهائي لكل Pinout هو دليل الشركة.',
  },
  {
    id: 'assembly', number: 14, kind: 'guide', phoneStageIndex: 17,
    titleAr: 'ترتيب التجميع واللحام',
    introAr: 'المراحل العملية بالترتيب الآمن: التدريب على اللحام، ثم الإطار، فالمحركات، فالإلكترونيات.',
  },
  {
    id: 'prebattery', number: 15, kind: 'gate', phoneStageIndex: 17,
    titleAr: 'فحوص ما قبل توصيل البطارية',
    introAr: 'البوابة الأولى: لا بطارية قبل تأكيد كل بند هنا — هذه الفحوص هي الفرق بين بناء يعمل وقطع تحترق.',
  },
  {
    id: 'software', number: 16, kind: 'guide', phoneStageIndex: 17,
    titleAr: 'الإعداد البرمجي',
    introAr: 'Betaflight والريسيفر والفيديو — صفحات الإعداد في مركز البرامج مربوطة بقطعك أنت.',
  },
  {
    id: 'motortest', number: 17, kind: 'gate', phoneStageIndex: 17,
    titleAr: 'اختبار المحركات',
    introAr: 'البوابة الثانية: المراوح منزوعة قبل أي دوران — ثم اتجاه كل محرك وترتيبه.',
  },
  {
    id: 'failsafe', number: 18, kind: 'gate', phoneStageIndex: 17,
    titleAr: 'الريسيفر وFailsafe والأوضاع',
    introAr: 'البوابة الثالثة: ماذا يفعل الدرون حين تنقطع الإشارة؟ يُضبط ويُختبر قبل أي طيران.',
  },
  {
    id: 'preflight', number: 19, kind: 'gate', phoneStageIndex: 17,
    titleAr: 'قائمة ما قبل أول طيران',
    introAr: 'البوابة الأخيرة: قائمة الفحص الكاملة — نفس القائمة الموثقة في المنصة، بنداً بنداً.',
  },
  {
    id: 'firstflight', number: 20, kind: 'guide', phoneStageIndex: 17,
    titleAr: 'أول تشغيل وأول طيران',
    introAr: 'مكان مفتوح، وضع Angle، وارتفاع منخفض — وماذا تفعل بعد أول بطارية ناجحة.',
  },
];

export const TOTAL_BUILD_STEPS = BUILD_PATH.length;

/** The four arcs of the journey — one list for the landing AND the header. */
export const BUILD_PHASES: readonly { titleAr: string; from: number; to: number }[] = [
  { titleAr: 'الاختيار', from: 1, to: 10 },
  { titleAr: 'التحقق', from: 11, to: 12 },
  { titleAr: 'التنفيذ', from: 13, to: 16 },
  { titleAr: 'التشغيل الآمن', from: 17, to: 20 },
];

export function phaseForStep(number: number): string {
  return BUILD_PHASES.find(p => number >= p.from && number <= p.to)?.titleAr ?? '';
}

/** The gate steps, exported so the wizard and the test agree on what gates exist. */
export const GATE_STEP_IDS = BUILD_PATH.filter(s => s.kind === 'gate').map(s => s.id);

export function buildStep(id: string): BuildStep {
  const step = BUILD_PATH.find(s => s.id === id);
  if (!step) throw new Error(`[build] unknown step id: ${id}`);
  return step;
}

/**
 * The shared-store stage index that «having completed steps up to and
 * including `stepIndex`» corresponds to. Monotonic max, because the web
 * path deliberately reorders selections (video is step 9 here, stage 3
 * there) and progress must never move backwards when mirrored.
 */
export function phoneStageIndexFor(stepIndex: number): number {
  let max = 0;
  for (let i = 0; i <= Math.min(stepIndex, BUILD_PATH.length - 1); i++) {
    max = Math.max(max, BUILD_PATH[i].phoneStageIndex);
  }
  // Never past the shared flow's own bounds — the store validates the range.
  return Math.min(max, buildStages.length - 1);
}
