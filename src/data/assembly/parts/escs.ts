import type { Esc } from '../types';

// Engineering-judgment droneTypes addition (racing/cinematic on all 3
// entries below): a 4-in-1 ESC's current-switching function doesn't change
// based on airframe purpose — the same 55A/60A stack drives a racing or
// cinematic build identically. A conscious engineering decision, not
// inferred from prose — none of the 3 entries' own researched text
// mentions either type.
//
// Long-range was investigated as a possible extension of the existing 3
// entries' tags (current-headroom argument), but real numbers refuted it:
// a real 7" long-range motor candidate (EMAX E3 2808 1300KV) has a
// documented peak current of 56A at 6S — higher than the existing 5"
// motors' own ~35-36A peak, not lower as initially assumed. Against that
// real 56A figure, 2 of the 3 existing ESCs (both 55A continuous) would
// have negative-to-zero margin, not comfortable headroom — extending
// their tags would have been wrong. A genuine new entry
// (esc-sequre-blueson-a2-65a-premium) was researched and added instead.
export const escs: Esc[] = [
  {
    id: 'esc-speedybee-bls-55a-budget',
    tier: 'budget',
    nameAr: 'ESC رباعي 55A - اقتصادي',
    nameEn: 'SpeedyBee BLS 55A 30x30 4-in-1 ESC',
    brand: 'SpeedyBee',
    priceRangeUSD: [45, 55],
    specs: { currentRatingA: 55, burstCurrentRatingA: 70, firmware: 'BLHeli_S', channels: 4, compatibleVoltages: [3, 4, 5, 6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'ESC اقتصادي قوي لبناء 5 إنش؛ 55A مستمر و70A burst، BLHeli_S J-H-40، DShot300/600، 30.5x30.5mm، ويرفق مكثف 1000uF Low ESR.',
    notFor: 'لا تختاره إذا كنت تحتاج BLHeli_32/AM32 أو telemetry متقدم؛ هو BLHeli_S.',
    upgradePath: 'T-Motor F55A Pro II 55A',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'اقتصادي قوي — 55A مستمر ومكثف Low ESR مرفق',
      noteTag: 'BLHeli_S فقط — لا BLHeli_32/AM32 ولا telemetry متقدم',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسب جداً مع SpeedyBee F405 Stack لأول بناء جاد.'],
    safetyNotes: ['لا تلحم البطارية قبل تركيب مكثف Low ESR وفحص Smoke Stopper.'],
    buildNotes: [
      'مع محركات قوية وProp ثقيل سيعمل، لكن لا تعتبره BLHeli_32/AM32؛ راقب الحرارة ولا تدفعه لأقصى الحدود لفترات طويلة.',
      'مقاس التركيب: 30.5x30.5mm.',
      'ملاحظة جهد: النص المصدري "3S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
  {
    id: 'esc-tmotor-f55a-pro-ii-mid',
    tier: 'mid',
    nameAr: 'ESC رباعي 55A - متوسط',
    nameEn: 'T-Motor F55A Pro II 55A 4-in-1 ESC',
    brand: 'T-Motor',
    priceRangeUSD: [70, 95],
    specs: { currentRatingA: 55, burstCurrentRatingA: 75, channels: 4, compatibleVoltages: [3, 4, 5, 6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'ESC موثوق لـ5 إنش، 55A مستمر و75A burst، وقد يأتي BLHeli_32 أو AM32 حسب SKU/نسخة المنتج.',
    notFor: 'لا تختاره إذا لا تستطيع التأكد من نسخة firmware التي تحتاجها؛ لا تخلط AM32 وBLHeli_32 كأنهما نفس SKU.',
    upgradePath: 'Hobbywing XRotor Micro 60A 4in1',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'موثوق 55A/75A burst لبناء 5 إنش قوي',
      noteTag: 'نسخة firmware تختلف حسب SKU — تأكد قبل الشراء',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['خيار ترقية ممتاز لمن يريد ثباتاً أعلى في التيار.'],
    safetyNotes: ['تأكد من نسخة firmware الفعلية قبل الشراء، لأن صفحات السوق تختلف في تسمية F55A Pro II.'],
    buildNotes: [
      'مع محركات 2207/2306 قوية يعطي هامش أمان أفضل من 35A/40A.',
      'ملاحظة firmware: النص المصدري يذكر صراحة "قد يأتي BLHeli_32 أو AM32 حسب SKU/نسخة المنتج" — لا يوجد قيمة واحدة مؤكدة لهذا المنتج، لذا تُرك حقل firmware فارغاً بدل اختيار قيمة عشوائياً.',
      'ملاحظة جهد: النص المصدري "3S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
  {
    id: 'esc-hobbywing-xrotor-micro-60a-premium',
    tier: 'premium',
    nameAr: 'ESC رباعي 60A - احترافي',
    nameEn: 'Hobbywing XRotor Micro 60A 4in1 BLHeli_32 ESC',
    brand: 'Hobbywing',
    priceRangeUSD: [70, 85],
    specs: { currentRatingA: 60, firmware: 'BLHeli_32', channels: 4, compatibleVoltages: [3, 4, 5, 6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'ESC قوي من Hobbywing، 60A BLHeli_32 DShot1200، مع BEC 5V مدمج (تُذكر 0.5A–0.6A حسب مصدر/إصدار المنتج)، مناسب لبناء 5 إنش قوي.',
    notFor: 'لا تختاره إذا كان الفريم يتطلب 20x20 صغير أو إذا أردت الأرخص.',
    upgradePath: 'T-Motor F55A Pro II 55A',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: '60A BLHeli_32 مع BEC 5V مدمج',
      noteTag: 'لا يناسب فريمات ستاك 20×20 الصغيرة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['اختيار مناسب لمن يريد تقليل خطر احتراق ESC في بناء قوي.'],
    safetyNotes: ['لا تختبر المحركات بمراوح مركبة داخل المنزل.'],
    buildNotes: [
      'مع محركات عالية KV و6S يعطي هامش أمان جيد، لكنه لا يعوض tune سيئ أو تبريد ضعيف.',
      'لم يُذكر burst rating منفصل لهذا المنتج في المصدر — فقط "60A مستمر"؛ تُرك الحقل فارغاً بدل تقدير رقم.',
      'ملاحظة جهد: النص المصدري "3S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
  {
    id: 'esc-sequre-blueson-a2-65a-premium',
    tier: 'premium',
    nameAr: 'ESC رباعي 65A - احترافي',
    nameEn: 'SEQURE Blueson A2 65A 4-in-1 ESC',
    brand: 'SEQURE',
    specs: { currentRatingA: 65, burstCurrentRatingA: 120, firmware: 'AM32', channels: 4, compatibleVoltages: [2, 3, 4, 5, 6], weightG: 17 },
    // batteryVoltages: [4, 6] — matches this exact entry's own already-
    // authored specs.compatibleVoltages: [2, 3, 4, 5, 6] above (sourced
    // "2S-6S", see buildNotes below); the category tag was under-populated
    // relative to the spec field for this same ESC. A data-consistency
    // fix, not a new current/thermal claim.
    compatibilityTags: { droneTypes: ['long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'تصنيف مدى طويل هنا هندسي معتمد على أرقام حقيقية، وليس على نص تسويقي مخصص لمدى طويل (النص المصدري عام: سباق/طيران حر): 65A مستمر و120A ذروة يعطي هامشاً حقيقياً فوق ذروة تيار محرك EMAX E3 2808 1300KV (56A عند 6S حسب مصدرين مستقلين) — بخلاف الـ3 ESCs الأخرى في القاعدة (55A/55A/60A) التي هامشها ضيق أو معدوم أمام هذا المحرك تحديداً. AM32 مفتوح المصدر، مقاس تركيب 30.5×30.5mm، حساس تيار مدمج.',
    notFor: 'لا تختارها إذا كنت تبحث عن نص تسويقي يذكر "مدى طويل" صراحة؛ هذا تصنيف هندسي معتمد على مقارنة أرقام التيار الحقيقية، وليس ادعاءً من الشركة المصنعة.',
    upgradePath: 'لا يوجد حالياً بديل أعلى تياراً موثق في القاعدة.',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: '65A/120A — هامش حقيقي لمحرك المدى الطويل',
      noteTag: 'تصنيف "مدى طويل" هندسي بالأرقام — ليس ادعاء الشركة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ليست الخيار الأول لأول تجربة؛ 65A/120A أعلى مما يحتاجه بناء بسيط، وهامشها الحقيقي مخصص لمحركات مدى طويل عالية التيار تحديداً.'],
    safetyNotes: ['لا تلحم البطارية قبل التأكد من التبريد ومن توافق الجهد (2-6S)؛ راجع إعدادات AM32 قبل أول تشغيل.'],
    buildNotes: [
      'ملاحظة تصنيف: القرار معتمد على مقارنة حقيقية بين ذروة تيار المحرك (EMAX E3 2808 1300KV: 56A عند 6S) وتيار هذا الـESC (65A مستمر/120A ذروة) — هامش حقيقي، بخلاف الـ3 ESCs الأخرى التي هامشها ضيق أو سلبي أمام هذا المحرك تحديداً.',
      'مقاس التركيب: 30.5×30.5mm، الوزن 17g، الأبعاد 45.5×42.5×6mm.',
      'ملاحظة جهد: النص المصدري "2S-6S" — نطاق أوسع من الـ3 ESCs الأخرى في هذا الملف (3S-6S)؛ فرق حقيقي حسب مصدر هذا المنتج تحديداً، وليس خطأ في المطابقة أو عدم اتساق.',
      'ملاحظة سعر: لم يُعثر على سعر مؤكد من أي مصدر رغم عدة محاولات بحث؛ تُرك priceRangeUSD فارغاً بدل اختراع رقم.',
    ],
  },
];
