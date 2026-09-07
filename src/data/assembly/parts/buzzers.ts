import type { Buzzer } from '../types';

// Engineering-judgment droneTypes additions (racing/cinematic/long-range on
// all 3 entries below): a buzzer's function — sounding an alarm on power
// loss or crash — has no dependency on airframe type, size class, or flight
// purpose. A 5V-driven or self-powered buzzer works identically regardless
// of whether it's bolted to a racing, cinematic, or long-range build. A
// conscious engineering decision, not inferred from prose — none of the 3
// entries' own researched text mentions any of these three drone types.
export const buzzers: Buzzer[] = [
  {
    id: 'buzzer-generic-5v-active-budget',
    tier: 'budget',
    nameAr: 'جرس تحديد الموقع - اقتصادي',
    nameEn: 'Generic 5V Active Buzzer',
    priceRangeUSD: [2, 5],
    specs: { hasBuiltInBattery: false },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'أرخص حل لسماع إنذار عند قرب الدرون.',
    notFor: 'لا تختاره إذا تخاف فقدان الدرون بعد فصل البطارية.',
    upgradePath: 'VIFLY Finder 2',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'أرخص حل لإنذار قرب الدرون',
      noteTag: 'يصمت إذا انفصلت البطارية — بلا بطارية داخلية',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مفيد لكن ليس بديلاً عن buzzer ذاتي الطاقة.'],
    safetyNotes: ['لا تعتمد عليه وحده في أماكن عشب كثيف.'],
    buildNotes: [
      'إذا انفصلت البطارية فلن يصدر صوتاً.',
      'يعمل من pads البازر على FC، بلا بطارية داخلية.',
    ],
  },
  {
    id: 'buzzer-vifly-finder-mini-mid',
    tier: 'mid',
    nameAr: 'جرس تحديد الموقع - متوسط',
    nameEn: 'VIFLY Finder Mini',
    brand: 'VIFLY',
    priceRangeUSD: [12, 18],
    specs: { hasBuiltInBattery: true },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'حل جيد عندما تريد self-powered buzzer لكن الوزن مهم.',
    notFor: 'لا تختاره إذا تريد أعلى صوت وأطول مدة تشغيل.',
    upgradePath: 'VIFLY Finder 2',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'ذاتي الطاقة وخفيف — عندما يهم الوزن',
      noteTag: 'ليس الأعلى صوتاً ولا الأطول تشغيلاً',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['جيد للمقاسات من 3 إلى 4 إنش.'],
    safetyNotes: ['تأكد من طريقة التشغيل/الإيقاف حتى لا يزعجك بعد الصيانة.'],
    buildNotes: [
      'في عشب كثيف قد يكون Finder 2 أسهل سماعاً.',
      'نسخة أصغر من Finder 2 حسب توفر السوق، مناسبة للبنايات الصغيرة.',
    ],
  },
  {
    id: 'buzzer-vifly-finder-2-premium',
    tier: 'premium',
    nameAr: 'جرس تحديد الموقع - احترافي',
    nameEn: 'VIFLY Finder 2 Lost Model Buzzer',
    brand: 'VIFLY',
    priceRangeUSD: [15, 20],
    specs: { hasBuiltInBattery: true, weightG: 5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'أفضل قطعة صغيرة لتقليل احتمال ضياع الدرون بعد crash.',
    notFor: 'لا تختاره إذا كل غرام مهم جداً في micro build.',
    upgradePath: 'VIFLY Finder Mini حسب الوزن',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    // whyTag drawn from buildNotes (not whyChoose) per the explicitly
    // broadened rule: the internal-battery persistence mechanism is more
    // specific than whyChoose's generic "best small part" phrasing.
    quickTags: {
      whyTag: 'يصفّر ببطاريته الداخلية حتى بعد فصل البطارية',
      noteTag: 'وزن إضافي (~5g) — ليس لبناء micro يحسب كل غرام',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['أنصح به بقوة للمبتدئ على 5 إنش.'],
    safetyNotes: ['تأكد من شحنه وتوصيله قبل الطيران.'],
    buildNotes: [
      'حتى لو انفصلت البطارية يمكنه الصفير ببطاريته الداخلية.',
      'استراتيجية إضافية: إذا تعطلت البطارية، البازر يساعد؛ إذا بقيت الطاقة، GPS يساعد.',
      'المواصفات: 4.5V-8.5V، 80mAh LiPo، حتى 30h، 24×13×16mm، الوزن 5g تقريباً حسب المصدر وليس رقماً دقيقاً.',
      'ملاحظة صوت: النص المصدري يذكر نطاقاً "105dB-110dB تقريباً" وليس رقماً واحداً؛ تُرك حقل volumeDb فارغاً بدل اختيار طرف من النطاق تعسفياً.',
    ],
  },
];
