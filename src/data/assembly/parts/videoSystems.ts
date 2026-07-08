import type { VideoSystem } from '../types';

// Cinematic tag on video-system-dji-o4-premium rests on real textual
// evidence: its own whyChoose reads "أفضل خيار جودة صورة وتجربة جاهزة
// لكثير من المستخدمين" — an explicit, direct superiority claim on image
// quality, the exact attribute cinematic exists to prioritize. Same
// evidentiary standard already used for video-unit-dji-o4-air-unit-pro-
// premium's cinematic tag (its own "للتصوير" claim).
//
// The other 3 systems were considered and excluded, not silently skipped:
//
// - video-system-analog-58ghz-budget: explicitly disqualified, twice over.
//   notFor: "لا تختاره إذا تريد جودة صورة HD أو تسجيل عالي داخل الوحدة."
//   beginnerNotes: "ممتاز للتعلم لكنه لا يعطي أعلى جودة صورة ممكنة." Both
//   directly state this system does not deliver high image quality.
//
// - video-system-hdzero-mid: explicitly disqualified, three times over.
//   whyChoose positions it as prioritizing response time "أكثر من أعلى
//   جودة صورة ممكنة من DJI"; notFor: "لا تختاره إذا تريد أفضل جودة
//   تسجيل داخلية مثل DJI O4 Pro"; upgradePath itself points to DJI O4
//   "إذا تريد جودة صورة أعلى" — all three frame this system as image-
//   quality-inferior to DJI by its own account.
//
// - video-system-walksnail-avatar-hd-mid: considered but excluded. Its
//   beginnerNotes ("جيد لمن يريد HD بدون دفع سعر DJI الكامل") is real
//   evidence, but frames the product around VALUE/cost-relative-to-DJI,
//   not image quality as a defining characteristic in itself — a
//   different axis than the one cinematic's tag requires. Same pattern
//   as the propeller-gemfan-f3s-5135-budget exclusion: real language,
//   serving an adjacent but distinct purpose than the type's own goal.
//
// Long-range: no evidence found anywhere in this file, for any of the 4
// systems, in either direction. Remains a full, undecided research gap —
// not a judgment-call candidate.
export const videoSystems: VideoSystem[] = [
  {
    id: 'video-system-analog-58ghz-budget',
    tier: 'budget',
    nameAr: 'نظام فيديو Analog - اقتصادي',
    nameEn: 'Analog 5.8GHz System',
    priceRangeUSD: [40, 120],
    protocolOrSystem: 'Analog',
    specs: { systemType: 'analog', frequencyBand: '5.8GHz' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'أفضل خيار رخيص للتعلم والسباقات والتجارب الخشنة.',
    notFor: 'لا تختاره إذا تريد جودة صورة HD أو تسجيل عالي داخل الوحدة.',
    upgradePath: 'HDZero إذا تريد latency منخفض مع HD',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['ممتاز للتعلم لكنه لا يعطي أعلى جودة صورة ممكنة.'],
    safetyNotes: ['احترم قوانين القدرة والتردد ولا تشغل VTX بدون هوائي.'],
    buildNotes: [
      'مع VTX قوي بدون تبريد قد تحرق الوحدة على الطاولة.',
      'مواصفة إضافية: أقل latency وأسهل إصلاحاً؛ يتطلب كاميرا Analog + VTX + نظارة analog/receiver.',
    ],
  },
  {
    id: 'video-system-hdzero-mid',
    tier: 'mid',
    nameAr: 'نظام فيديو HDZero - متوسط',
    nameEn: 'HDZero Digital System',
    priceRangeUSD: [170, 600],
    protocolOrSystem: 'HDZero',
    specs: { systemType: 'digital' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'اختيار قوي لمن يهمه زمن الاستجابة أكثر من أعلى جودة صورة ممكنة من DJI.',
    notFor: 'لا تختاره إذا تريد أفضل جودة تسجيل داخلية مثل DJI O4 Pro.',
    upgradePath: 'DJI O4 إذا تريد جودة صورة أعلى',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسب للطيار الذي يعرف الفرق بين latency وجودة الصورة.'],
    safetyNotes: ['لا ترفع القدرة فوق المسموح قانونياً.'],
    buildNotes: [
      'مع Freestyle V2 تأكد من التبريد والهوائي وترخيص القدرة العالية.',
      'الدقة: 720p/1080p حسب VTX/كاميرا. مواصفة إضافية: مناسب للسباق والطيران الحر مع latency منخفض.',
    ],
  },
  {
    id: 'video-system-walksnail-avatar-hd-mid',
    tier: 'mid',
    nameAr: 'نظام فيديو Walksnail - متوسط',
    nameEn: 'Walksnail Avatar HD System',
    priceRangeUSD: [150, 550],
    protocolOrSystem: 'Walksnail',
    specs: { systemType: 'digital' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'حل وسط قوي بين السعر والجودة ومرونة الكاميرات.',
    notFor: 'لا تختاره إذا تريد ecosystem DJI أو latency سباقات صارم جداً.',
    upgradePath: 'DJI O4 Air Unit',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['جيد لمن يريد HD بدون دفع سعر DJI الكامل.'],
    safetyNotes: ['لا تترك VTX يعمل بلا تبريد على الطاولة.'],
    buildNotes: [
      'مع 6S مباشر تأكد من حماية كهربائية وتبريد جيد.',
      'الدقة: 1080p/60 أو 720p/120 حسب kit. مواصفة إضافية: 6V-25.2V في Pro Kit، ذاكرة داخلية حسب النسخة.',
    ],
  },
  {
    id: 'video-system-dji-o4-premium',
    tier: 'premium',
    nameAr: 'نظام فيديو DJI O4 - احترافي',
    nameEn: 'DJI O4 System',
    priceRangeUSD: [109, 650],
    protocolOrSystem: 'DJI',
    specs: { systemType: 'digital' },
    compatibilityTags: { droneTypes: ['freestyle', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'أفضل خيار جودة صورة وتجربة جاهزة لكثير من المستخدمين.',
    notFor: 'لا تختاره إذا تريد نظام مفتوح أو أرخص قطع أو إصلاح أسهل.',
    upgradePath: 'Walksnail أو HDZero حسب الأولوية',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['ممتاز لكن تأكد من توافق النظارات والراديو/الريسيفر.'],
    safetyNotes: ['تبريد O4 مهم جداً على الطاولة.'],
    buildNotes: [
      'O4 Lite/O4 Pro تختلف جذرياً في الوزن والحجم والكاميرا.',
      'الدقة: 1080p live view / recording حسب الوحدة. مواصفة إضافية: يتطلب نظارات DJI متوافقة مثل Goggles 3/N3 حسب الدعم.',
    ],
  },
];
