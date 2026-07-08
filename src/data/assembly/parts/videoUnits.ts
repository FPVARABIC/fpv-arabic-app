import type { VideoUnit } from '../types';

// Racing tags on video-unit-dji-o4-air-unit-budget and video-unit-hdzero-
// freestyle-v2-vtx-mid rest on real textual evidence, not engineering
// judgment:
// - video-unit-dji-o4-air-unit-budget buildNotes: "مناسبة لـ 2-inch وأصغر
//   أو السباق/التدريب" — explicit, direct racing evidence.
// - video-unit-hdzero-freestyle-v2-vtx-mid beginnerNotes: "مناسب لمن يطير
//   سباقات أو طيران حر ويهتم بالاستجابة" — explicit, direct racing
//   evidence. Its own upgradePath separately names a dedicated "HDZero
//   Race VTX" SKU as a further upgrade step; this doesn't undermine the
//   base unit's own racing suitability claim, same pattern as a budget ESC
//   having a racing-capable upgrade path without disqualifying itself.
//
// Cinematic tag on video-unit-dji-o4-air-unit-pro-premium rests on real
// textual evidence: its own whyChoose reads "أفضل جودة صورة... ومناسب
// للتصوير وللطيران الحر الاحترافي" — "للتصوير" (for filming) is a distinct,
// coordinate use-case named alongside professional freestyle, not an
// adjective modifying something else. Reinforced by notFor (disclaims
// lightweight builds) and beginnerNotes (quality-over-weight framing) —
// both consistent with cinematic's own heavier-payload/quality-priority
// definition, and by this being the heaviest unit with an accompanying
// purpose-claim in the file (32g vs. the budget unit's 8.2g).
//
// Long-range tag on video-unit-tbs-unify-pro32-hv-mmcx-mid rests on real
// textual evidence: its own whyChoose reads "لمشاريع الطيران الحر/مدى طويل
// analog" — a direct coordinate pairing of freestyle and long-range, not
// adjacent language. Reinforced by its 1000+mW power spec.
//
// The other 3 entries (video-unit-walksnail-avatar-hd-pro-kit-mid,
// video-unit-rushfpv-tank-solo-vtx-mid, video-unit-dji-o3-air-unit-mid)
// were checked field-by-field and get no tag for any of the 3 types — no
// racing/cinematic/long-range language exists anywhere in their whyChoose,
// notFor, upgradePath, beginnerNotes, safetyNotes, or buildNotes. Walksnail
// specifically has real language (price-relative-to-DJI, night
// performance) but on a different axis than any of the 3 types' defining
// characteristics — same pattern as the video-system Walksnail exclusion
// and the propeller-gemfan-f3s-5135-budget exclusion elsewhere in this
// project. DJI O3 Air Unit is the heaviest unit in the file (36.4g) but
// has no accompanying purpose-claim, so weight alone doesn't meet the
// evidence bar here.
export const videoUnits: VideoUnit[] = [
  {
    id: 'video-unit-dji-o4-air-unit-budget',
    tier: 'budget',
    nameAr: 'وحدة DJI O4 Air Unit - اقتصادية',
    nameEn: 'DJI O4 Air Unit',
    brand: 'DJI',
    priceRangeUSD: [109, 129],
    protocolOrSystem: 'DJI',
    specs: { weightG: 8.2 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [4, 6] },
    whyChoose: 'أخف وحدة DJI O4، ممتازة عندما تريد وزن أقل وتجربة DJI حديثة.',
    notFor: 'لا تختارها إذا تريد كاميرا Pro أو جودة تسجيل أعلى وأفضل sensor.',
    upgradePath: 'DJI O4 Air Unit Pro',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسبة لمن يريد DJI حديث بأقل وزن.'],
    safetyNotes: ['لا تشغلها مدة طويلة بلا تبريد.'],
    buildNotes: [
      'مع 5 إنش تحتاج تثبيت وتهوية ومكان مناسب للكاميرا الصغيرة.',
      'التركيب: 30×30×6mm، مسافة تثبيت 30×30mm، مناسبة لـ 2-inch وأصغر أو السباق/التدريب.',
      'الوزن: 8.2g تقريباً حسب المصدر، وليس رقماً دقيقاً.',
    ],
  },
  {
    id: 'video-unit-dji-o4-air-unit-pro-premium',
    tier: 'premium',
    nameAr: 'وحدة DJI O4 Air Unit Pro - احترافية',
    nameEn: 'DJI O4 Air Unit Pro',
    brand: 'DJI',
    priceRangeUSD: [209, 229],
    protocolOrSystem: 'DJI',
    specs: { weightG: 32, operatingVoltageRange: '7.4-26.4V' },
    compatibilityTags: { droneTypes: ['freestyle', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'أفضل جودة صورة في قائمة DJI الحالية ومناسب للتصوير وللطيران الحر الاحترافي.',
    notFor: 'لا تختارها لبناء خفيف أو فريم لا يستوعب الكاميرا/الوحدة.',
    upgradePath: 'DJI O4 Air Unit',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['ممتازة إن كانت جودة الفيديو أهم من الوزن.'],
    safetyNotes: ['تبريد إلزامي عند الإعداد على الطاولة.'],
    buildNotes: [
      'مع فريم ضيق قد تحتاج mount خاص وتخطيط حرارة ممتاز.',
      'الأبعاد: وحدة الإرسال 33.5×33.5×13mm، الكاميرا 25.55×20×23.30mm.',
      'الوزن: 32g تقريباً حسب المصدر، وليس رقماً دقيقاً.',
    ],
  },
  {
    id: 'video-unit-walksnail-avatar-hd-pro-kit-mid',
    tier: 'mid',
    nameAr: 'وحدة Walksnail Avatar HD Pro Kit - متوسطة',
    nameEn: 'Walksnail Avatar HD Pro Kit',
    brand: 'Walksnail',
    priceRangeUSD: [145, 180],
    protocolOrSystem: 'Walksnail',
    specs: { sensorType: 'Sony Starvis II', resolution: '1080p/60 أو 720p/120 حسب kit', operatingVoltageRange: '6V-25.2V' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'ممتاز للـ HD بسعر أقل من DJI مع أداء ليلي جيد.',
    notFor: 'لا تختاره إذا كل عتادك DJI أو تريد توافق DJI Goggles فقط.',
    upgradePath: 'DJI O4 Air Unit',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['حل HD جيد للطيار المتوسط.'],
    safetyNotes: ['لا تشغل VTX بلا هوائي أو تبريد.'],
    buildNotes: [
      'مع نظام 6S تأكد من wiring نظيف ومكثف مناسب.',
      'ذاكرة داخلية حسب النسخة.',
      'ملاحظة تدقيق: عمود "الوزن" في المصدر لهذا الصف كان في الواقع نطاق جهد "6V-25.2V" وليس وزناً؛ لا يوجد وزن حقيقي مذكور لهذا المنتج، لذا تُرك weightG فارغاً بدل اختراع رقم.',
    ],
  },
  {
    id: 'video-unit-hdzero-freestyle-v2-vtx-mid',
    tier: 'mid',
    nameAr: 'وحدة HDZero Freestyle V2 VTX - متوسطة',
    nameEn: 'HDZero Freestyle V2 VTX',
    brand: 'HDZero',
    priceRangeUSD: [90, 120],
    protocolOrSystem: 'HDZero',
    specs: { weightG: 22.3 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [4, 6] },
    whyChoose: 'خيار ممتاز لمن يريد HDZero على 3-5 إنش مع latency منخفض.',
    notFor: 'لا تختاره إذا تريد تسجيل بأعلى جودة صورة ممكنة أو نظام DJI جاهز.',
    upgradePath: 'HDZero Race VTX أو DJI O4 حسب الهدف',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسب لمن يطير سباقات أو طيران حر ويهتم بالاستجابة.'],
    safetyNotes: ['لا تستخدم قنوات/قدرة غير مسموحة في بلدك.'],
    buildNotes: [
      'قدرة 1W تحتاج ترخيص/قانون وتبريد وهوائي جيد.',
      'التركيب: 29×30×14mm، 20×20 M2، قدرة 25/200mW و1W عند unlock قانوني.',
      'هذه وحدة VTX فقط بلا كاميرا مدمجة؛ تحتاج كاميرا FPV منفصلة — الكاميرات المستقلة مغطاة ضمن نطاق معدات الطيار (pilotGear)، وليست جزءاً من مرحلة البناء هذه.',
    ],
  },
  {
    id: 'video-unit-tbs-unify-pro32-hv-mmcx-mid',
    tier: 'mid',
    nameAr: 'وحدة TBS Unify Pro32 HV MMCX - متوسطة',
    nameEn: 'TBS Unify Pro32 HV MMCX',
    brand: 'TBS',
    priceRangeUSD: [45, 65],
    protocolOrSystem: 'Analog',
    specs: { weightG: 8.7, operatingVoltageRange: '6-25V' },
    compatibilityTags: { droneTypes: ['freestyle', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'VTX analog قوي وموثوق لمشاريع الطيران الحر/مدى طويل analog.',
    notFor: 'لا تختاره إذا تريد HD أو OSD canvas رقمي.',
    upgradePath: 'Rush Tank Solo أو Foxeer Reaper V2',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['ممتاز إذا أردت analog عالي الجودة.'],
    safetyNotes: ['لا تشغله بدون هوائي أبداً.'],
    buildNotes: [
      'مع قدرة عالية يحتاج تبريد وهوائي جيد.',
      'التردد: 5658-5945MHz. القدرة: 25/100/400/1000+mW. يدعم SmartAudio.',
      'هذه وحدة VTX فقط بلا كاميرا مدمجة؛ تحتاج كاميرا FPV منفصلة — الكاميرات المستقلة مغطاة ضمن نطاق معدات الطيار (pilotGear)، وليست جزءاً من مرحلة البناء هذه.',
    ],
  },
  {
    id: 'video-unit-rushfpv-tank-solo-vtx-mid',
    tier: 'mid',
    nameAr: 'وحدة RushFPV Tank Solo VTX - متوسطة',
    nameEn: 'RushFPV Tank Solo VTX',
    brand: 'RushFPV',
    priceRangeUSD: [40, 55],
    protocolOrSystem: 'Analog',
    specs: { weightG: 12, operatingVoltageRange: '7-36V' },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'VTX قوي ومشهور للطيران الحر analog مع بنية متينة.',
    notFor: 'لا تختاره إذا الوزن أو الحجم مهم جداً.',
    upgradePath: 'TBS Unify Pro32 HV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['اختيار جيد لمن يريد analog قوي وسهل.'],
    safetyNotes: ['لا تشغل القدرة العالية بلا تبريد/هوائي.'],
    buildNotes: [
      'مع فريم صغير قد يكون حجمه مزعجاً.',
      'الوزن بدون الكابل. القنوات: 48CH. القدرة: PIT/25/400/800/MAX mW. الأبعاد: 37×24×6.7mm.',
      'هذه وحدة VTX فقط بلا كاميرا مدمجة؛ تحتاج كاميرا FPV منفصلة — الكاميرات المستقلة مغطاة ضمن نطاق معدات الطيار (pilotGear)، وليست جزءاً من مرحلة البناء هذه.',
    ],
  },
  {
    id: 'video-unit-dji-o3-air-unit-mid',
    tier: 'mid',
    nameAr: 'وحدة DJI O3 Air Unit - متوسطة',
    nameEn: 'DJI O3 Air Unit',
    brand: 'DJI',
    priceRangeUSD: [179, 229],
    protocolOrSystem: 'DJI',
    specs: { weightG: 36.4 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'نظام DJI شائع جداً وموثق، مناسب لمن يملك Goggles/Remote متوافقة مع O3.',
    notFor: 'لا تختاره إذا تبدأ من الصفر وتريد أحدث منظومة DJI أو وزن أخف.',
    upgradePath: 'DJI O4 Air Unit',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['خيار جيد إذا كان متوفراً بسعر منخفض أو لديك عتاد DJI O3 أصلاً.'],
    safetyNotes: ['استخدم 9V/10V BEC مناسب ولا تغذّي الوحدة من مصدر غير موثق.'],
    buildNotes: [
      'مع فريم مصمم لـ O4/O3 تأكد من مقاس الكاميرا ومسار الكابل قبل شراء الفريم.',
      'الوزن: 36.4g تقريباً حسب المصدر، وليس رقماً دقيقاً.',
    ],
  },
];
