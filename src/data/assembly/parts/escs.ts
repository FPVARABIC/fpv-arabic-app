import type { Esc } from '../types';

// Engineering-judgment droneTypes addition (racing/cinematic on all 3
// entries below): a 4-in-1 ESC's current-switching function doesn't change
// based on airframe purpose — the same 55A/60A stack drives a racing or
// cinematic build identically. A conscious engineering decision, not
// inferred from prose — none of the 3 entries' own researched text
// mentions either type.
//
// Long-range deliberately excluded — a genuine, undecided research gap,
// not a judgment call: these are 55-60A stacks sized for punchy freestyle/
// racing current draw, and no dedicated long-range-appropriate ESC has
// been researched (same standard as Motors' long-range exclusion — no
// 7"-appropriate motor was researched either). Revisit only if dedicated
// long-range ESC research is done, not by stretching this file's existing
// judgment basis to cover it.
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
    beginnerNotes: ['اختيار مناسب لمن يريد تقليل خطر احتراق ESC في بناء قوي.'],
    safetyNotes: ['لا تختبر المحركات بمراوح مركبة داخل المنزل.'],
    buildNotes: [
      'مع محركات عالية KV و6S يعطي هامش أمان جيد، لكنه لا يعوض tune سيئ أو تبريد ضعيف.',
      'لم يُذكر burst rating منفصل لهذا المنتج في المصدر — فقط "60A مستمر"؛ تُرك الحقل فارغاً بدل تقدير رقم.',
      'ملاحظة جهد: النص المصدري "3S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
];
