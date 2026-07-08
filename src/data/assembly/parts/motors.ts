import type { Motor } from '../types';

// Engineering-judgment droneTypes addition (racing, on all 4 entries below):
// stator size (2207/2306-class) and KV range (1700-1860KV) are within the
// commonly-used range for real racing builds — same commodity motor class
// used interchangeably in freestyle and racing quads, not a disqualifying
// low-KV/efficiency-tuned outlier the way genuine long-range motors are.
// A conscious, protocol-adjacent decision, not inferred from prose — none
// of the 4 entries' own research text mentions racing either way.
//
// This judgment does NOT extend to cinematic: none of the 4 KV values sit
// in a smoother, less punchy range cinematic flight wants, and one entry
// (motor-emax-eco-ii-2306-budget) explicitly disclaims being the "smoother"
// option in its own notFor. Cinematic motor support remains a genuine
// research gap, not covered by this decision.
export const motors: Motor[] = [
  {
    id: 'motor-emax-eco-ii-2306-budget',
    tier: 'budget',
    nameAr: 'محرك 2306 - اقتصادي',
    nameEn: 'EMAX ECO II 2306 1700KV',
    brand: 'EMAX',
    priceRangeUSD: [13, 20],
    specs: { kv: 1700, statorSize: '2306', compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'محرك اقتصادي 2306 موثق بوزن ~30.4g بدون السلك ويدعم مراوح 5-5.5 إنش؛ مناسب لـ5 إنش 6S عند اختيار KV الصحيح.',
    notFor: 'لا تختاره إذا أردت أخف وزن أو أعلى نعومة؛ الخطأ الشائع استخدام KV عالي مع 6S دون فهم.',
    upgradePath: 'iFlight XING2 2207 1750KV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['اختيار جيد لأول بناء بشرط اختيار KV مناسب للبطارية.'],
    safetyNotes: ['اختبر اتجاه المحركات بدون مراوح أولاً، ولا تركب مروحة أثناء إعداد Betaflight.'],
    buildNotes: [
      'مع 6S وProp ثقيل قد يصل لتيار مرتفع؛ استخدم ESC بهامش وراقب الحرارة.',
      'الوزن: ~30.4g بدون السلك (حسب التوثيق).',
      'ملاحظة جهد: النص المصدري "6S أساساً لنسخة 1700KV؛ عائلة ECO II 2306 تشمل KV أخرى لجهود مختلفة" — يخص هذا الصف تحديداً نسخة 1700KV وهي 6S؛ الإشارة لعائلة المنتج تخص نسخ KV أخرى غير مدرجة هنا.',
    ],
  },
  {
    id: 'motor-tmotor-velox-v2207-v3-budget',
    tier: 'budget',
    nameAr: 'محرك 2207 - اقتصادي',
    nameEn: 'T-Motor Velox V2207 V3 1750KV',
    brand: 'T-Motor',
    priceRangeUSD: [22, 27],
    specs: { kv: 1750, statorSize: '2207', compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'محرك 2207 من T-Motor بوزن ~37.3g مع الكابل وذروة تيار ~34.6A حسب بيانات 1750KV؛ مناسب للطيران الحر 5 إنش 6S.',
    notFor: 'لا تختاره لمن يريد وزن خفيف جداً؛ وزنه أعلى من بعض المنافسين.',
    upgradePath: 'RCinPower Wasp Major 22.6-6.5 1860KV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسب لمن يريد اسم موثوق وسعر غير مبالغ.'],
    safetyNotes: ['استخدم براغي مناسبة الطول حتى لا تخترق ملفات الستاتور.'],
    buildNotes: [
      'مع مراوح عالية الحمل يحتاج ESC بهامش 45A+، و55A أفضل لبناء قوي.',
      'الوزن: ~37.3g مع الكابل؛ ذروة تيار ~34.6A حسب بيانات 1750KV.',
      'ملاحظة جهد: النص المصدري "6S" — واضح ومباشر لهذا الصف.',
    ],
  },
  {
    id: 'motor-iflight-xing2-2207-mid',
    tier: 'mid',
    nameAr: 'محرك 2207 - متوسط',
    nameEn: 'iFlight XING2 2207 1750KV',
    brand: 'iFlight',
    priceRangeUSD: [24, 30],
    specs: { kv: 1750, statorSize: '2207', compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'محرك 2207 موثق بوزن 30.5g مع السلك، input 25.2V وذروة تيار ~36A، متوازن جداً لخمسة إنش 6S.',
    notFor: 'لا تختاره إذا تريد أرخص قطع ممكنة أو إذا كان الفريم ضيقاً جداً على أسلاك المحرك.',
    upgradePath: 'RCinPower Wasp Major 22.6-6.5 1860KV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['من أفضل خيارات الترقية من محرك اقتصادي إلى مستوى موثوق.'],
    safetyNotes: ['لا تخلط KV مختلف بين المحركات الأربعة.'],
    buildNotes: [
      'مع Prop عالي Pitch سيرفع التيار؛ راقب حرارة المحركات بعد أول طيران.',
      'الوزن: 30.5g مع السلك؛ ذروة تيار ~36A.',
      'ملاحظة جهد: النص المصدري "6S / حتى 25.2V للـ1750KV" — 25.2V هو سقف الشحن الكامل لبطارية 6S (4.2V × 6 خلايا)، وليس الجهد الاسمي (22.2V)؛ كلاهما يؤكد 6S ولا يغيّر الاستنتاج.',
    ],
  },
  {
    id: 'motor-rcinpower-wasp-major-premium',
    tier: 'premium',
    nameAr: 'محرك 22.6x6.5 - احترافي',
    nameEn: 'RCinPower Wasp Major 22.6-6.5 1860KV',
    brand: 'RCinPower',
    priceRangeUSD: [27, 32],
    specs: { kv: 1860, statorSize: '22.6x6.5', compatibleVoltages: [5, 6] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'محرك قوي وخفيف نسبياً للطيران الحر 5 إنش؛ المواصفات المنشورة تذكر 22.6x6.5، وزن ~30.5g بسلك 3cm، وبعض البائعين يذكرون ~33g حسب طول السلك/النسخة.',
    notFor: 'لا تختاره لمبتدئ يبحث عن أقل تكلفة أو لمن يستخدم ESC ضعيف.',
    upgradePath: 'iFlight XING2 2207 1750KV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['اختيار ترقية ممتاز بعد فهم إدارة الحرارة والـ prop load.'],
    safetyNotes: ['راقب حرارة المحرك بعد تغييرات المراوح أو الـ tune.'],
    buildNotes: [
      'مع 6S وProp عدواني قد يطلب تياراً عالياً؛ اجعله مع 55A ESC على الأقل في بناء قوي.',
      'الوزن: ~30.5g بسلك 3cm حسب المواصفات المنشورة؛ بعض البائعين يذكرون ~33g حسب طول السلك/النسخة.',
      'ملاحظة جهد: النص المصدري "5S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
];
