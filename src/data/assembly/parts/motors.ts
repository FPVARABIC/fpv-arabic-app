import type { Motor } from '../types';

// Engineering-judgment droneTypes addition (racing, on all 4 entries below):
// stator size (2207/2306-class) and KV range (1700-1860KV) are within the
// commonly-used range for real racing builds — same commodity motor class
// used interchangeably in freestyle and racing quads, not a disqualifying
// low-KV/efficiency-tuned outlier the way genuine long-range motors are.
// A conscious, protocol-adjacent decision, not inferred from prose — none
// of the 4 entries' own research text mentions racing either way.
//
// This judgment does NOT extend to cinematic for these original 4 entries:
// none of their KV values sit in a smoother, less punchy range cinematic
// flight wants, and one entry (motor-emax-eco-ii-2306-budget) explicitly
// disclaims being the "smoother" option in its own notFor.
//
// motor-newbeedrone-smoov-v2-2306-5-1750kv-premium was added as a new,
// dedicated cinematic entry instead: its own real product name is
// "...Cinematic FPV Motor 1750KV" — a direct, first-party claim, same
// evidentiary standard as MEPS SZ5145's "designed for FPV racing" claim
// for the racing propeller gap. Ring-magnet construction is independently
// documented (multiple sources) as reducing vibration/noise vs. standard
// square-magnet motors, reinforcing the cinematic-smoothness claim.
//

// specs.maxFrameSizeInch on motor-emax-eco-ii-2306-budget (5.5) rests on
// real textual evidence: its own whyChoose states "يدعم مراوح 5-5.5 إنش" —
// an explicit 5.5" claim. None of the other 3 motors make this claim (they
// only say "5 إنش"), so none of them get this field — a real gap, not
// silently extended by similarity to the EMAX entry.
//
// motor-emax-e3-2808-1300kv-premium was added as a new, dedicated
// long-range entry: its own real product text states it is "designed for
// long-range and cinematic FPV drones... ideal for 7\" prop setups" — a
// direct, first-party claim. frameSizeInch: 7 is an exact match against
// the long-range frame's (GEPRC MOZ7 V2) own sizeInch: 7, not a tolerance
// case. Its documented 56A peak current at 6S is the same real figure
// that justified adding a dedicated long-range ESC (SEQURE Blueson A2
// 65A) rather than extending the existing 3 ESCs' tags.
export const motors: Motor[] = [
  {
    id: 'motor-emax-eco-ii-2306-budget',
    tier: 'budget',
    nameAr: 'محرك 2306 - اقتصادي',
    nameEn: 'EMAX ECO II 2306 1700KV',
    brand: 'EMAX',
    priceRangeUSD: [13, 20],
    specs: { kv: 1700, statorSize: '2306', compatibleVoltages: [6], maxFrameSizeInch: 5.5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'محرك اقتصادي 2306 موثق بوزن ~30.4g بدون السلك ويدعم مراوح 5-5.5 إنش؛ مناسب لـ5 إنش 6S عند اختيار KV الصحيح.',
    notFor: 'لا تختاره إذا أردت أخف وزن أو أعلى نعومة؛ الخطأ الشائع استخدام KV عالي مع 6S دون فهم.',
    upgradePath: 'iFlight XING2 2207 1750KV',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'اقتصادي خفيف (~30.4g) — يدعم مراوح 5-5.5 إنش',
      noteTag: 'ليس الأخف ولا الأنعم — انتبه لاختيار KV مع 6S',
      noteTagSource: 'notFor',
    },
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
    quickTags: {
      whyTag: 'T-Motor موثوق لـ5 إنش 6S — ذروة ~34.6A',
      noteTag: 'وزنه (~37.3g) أعلى من بعض المنافسين',
      noteTagSource: 'notFor',
    },
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
    quickTags: {
      whyTag: 'متوازن جداً لـ5 إنش 6S — خفيف (30.5g)',
      noteTag: 'ليس الأرخص — وانتبه لضيق الفريم على أسلاكه',
      noteTagSource: 'notFor',
    },
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
    quickTags: {
      whyTag: 'قوي وخفيف نسبياً (1860KV) للطيران الحر',
      noteTag: 'ليس لميزانية محدودة أو ESC ضعيف',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['اختيار ترقية ممتاز بعد فهم إدارة الحرارة والـ prop load.'],
    safetyNotes: ['راقب حرارة المحرك بعد تغييرات المراوح أو الـ tune.'],
    buildNotes: [
      'مع 6S وProp عدواني قد يطلب تياراً عالياً؛ اجعله مع 55A ESC على الأقل في بناء قوي.',
      'الوزن: ~30.5g بسلك 3cm حسب المواصفات المنشورة؛ بعض البائعين يذكرون ~33g حسب طول السلك/النسخة.',
      'ملاحظة جهد: النص المصدري "5S-6S" — نطاق مذكور مباشرة لهذا الصف.',
    ],
  },
  {
    id: 'motor-newbeedrone-smoov-v2-2306-5-1750kv-premium',
    tier: 'premium',
    nameAr: 'محرك 2306.5 - احترافي',
    nameEn: 'NewBeeDrone 2306.5 Smoov V2 Ring Magnet Cinematic FPV Motor 1750KV',
    brand: 'NewBeeDrone',
    specs: { kv: 1750, statorSize: '2306.5', weightG: 37, shaftDiameterMm: 5, compatibleVoltages: [6] },
    compatibilityTags: { droneTypes: ['cinematic'], batteryVoltages: [6], frameSizeInch: 5 },
    whyChoose: 'المسمى الرسمي من الشركة المصنعة هو "Cinematic FPV Motor"؛ تصميم Ring Magnet (بدل المغناطيس المربع التقليدي) موثق كمقلل لاهتزاز/ضوضاء المحرك، هيكل 7075 ألمنيوم أحادي القطعة (unibell)، 1750KV، 6S، تيار 30-60A، عمود M5، 14 قطباً (مرجع لضبط RPM filter في Betaflight).',
    notFor: 'لا تختاره إذا لا تحتاج مزايا Ring Magnet الإضافية (تقليل الاهتزاز) ولا يهمك سعره غير المؤكد مقارنة ببدائل أرخص موثقة السعر في القاعدة.',
    upgradePath: 'لا يوجد حالياً بديل آخر مخصص لهذا الاستخدام موثق في القاعدة.',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'Ring Magnet لاهتزاز أقل — "Cinematic" رسمياً',
      noteTag: 'سعره غير مؤكد — وبدائل أرخص موثقة السعر متاحة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ليست الخيار الأول لأول تجربة؛ الميزة الأساسية (Ring Magnet) تفيد تحديداً من يريد نعومة تصوير أعلى، لا بناء بسيط عام.'],
    safetyNotes: ['استخدم عزم ربط مناسباً لبراغي M5 ولا تفرط في الشد؛ اختبر اتجاه الدوران بدون مراوح أولاً.'],
    buildNotes: [
      'مقاس التركيب: قطر ستاتور 23mm، ارتفاع 6mm — من نفس فئة تركيب 2207/2306 الشائعة (M3، نمط 16×16mm) حسب الاصطلاح الصناعي الشائع لهذه الفئة؛ لم يُعثر على تأكيد صريح لهذا المقاس تحديداً من مصدر المنتج نفسه، وهذا استنتاج هندسي معتمد على الاصطلاح الصناعي الواسع لا نص مباشر.',
      'الوزن: 37g مع الكابل حسب مصدرين مستقلين على الأقل.',
      'عدد الأقطاب: 14 قطباً — مرجع لازم لضبط RPM filter في Betaflight بدقة.',
      'ملاحظة مروحة: النص المصدري يذكر توافقاً حتى مراوح 6 إنش (مع ضبط Motor Output Limit في Betaflight) — أكبر من مروحة Cinematic الحالية في القاعدة (Ethix S5، 5 إنش). لا يمنع هذا استخدام المحرك مع مروحة 5 إنش؛ 1750KV هي الأساس الفعلي لملاءمته لبناء تصويري 5 إنش، لا تصنيف المروحة الأقصى المذكور.',
      'ملاحظة سعر: لم يُعثر على سعر مؤكد من أي مصدر رغم عدة محاولات بحث؛ تُرك priceRangeUSD فارغاً بدل اختراع رقم.',
    ],
  },
  {
    id: 'motor-emax-e3-2808-1300kv-premium',
    tier: 'premium',
    nameAr: 'محرك 2808 - احترافي',
    nameEn: 'EMAX E3 Series 2808 Motor 1300KV',
    brand: 'EMAX',
    specs: { kv: 1300, statorSize: '2808', weightG: 53.6, shaftDiameterMm: 5, compatibleVoltages: [3, 4, 5, 6] },
    // batteryVoltages: [4, 6] — matches this exact entry's own already-
    // authored specs.compatibleVoltages: [3, 4, 5, 6] above; the category
    // tag (used for stage-level filtering) was under-populated relative to
    // the spec field (used by validateMotorBattery for final compatibility
    // checks) for this same motor. A data-consistency fix, not a new
    // performance or KV claim — no other motor in this file has a
    // multi-voltage spec, so no other motor's tag changes.
    compatibilityTags: { droneTypes: ['long-range'], batteryVoltages: [4, 6], frameSizeInch: 7 },
    whyChoose: 'المسمى الرسمي من الشركة المصنعة: "مصمم لطائرات FPV مدى طويل...، مثالي لإعدادات مراوح 7 إنش" — ادعاء مباشر من الشركة نفسها. مغناطيس N52SH قوسي، محامل NSK يابانية، جسم ألمنيوم، 12N14P (12 سن ستاتور/14 قطباً)، عمود 5mm.',
    notFor: 'لا تختاره لبناء 5 إنش عادي؛ 1300KV منخفض جداً لهذا الحجم ومصمم خصيصاً لمراوح 6-7 إنش.',
    upgradePath: 'لا يوجد حالياً بديل مدى طويل آخر موثق في القاعدة.',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'مصمم رسمياً للمدى الطويل — مثالي لمراوح 7 إنش',
      noteTag: '1300KV منخفض جداً لبناء 5 إنش عادي',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ليس اختياراً لأول بناء؛ يفترض فهم مشاريع مدى طويل ومراوح 7 إنش تحديداً.'],
    safetyNotes: ['راقب حرارة المحرك عند الرحلات الطويلة المستمرة؛ ذروة تيار 56A عند 6S تحتاج ESC بهامش حقيقي.'],
    buildNotes: [
      'مقاس التركيب: 19×19mm — ملاحظة: إطار GEPRC MOZ7 V2 (المُتاح حالياً لمدى طويل) لا يوثّق مقاس تركيب المحرك في بياناته الحالية؛ هذا المقاس حقيقي لهذا المحرك تحديداً وليس تأكيداً متبادلاً مع الإطار.',
      'الأبعاد: Ø34.8×37mm. الوزن: 53.6g بدون أسلاك.',
      'ذروة تيار 56A عند 6S — نفس الرقم المعتمد في قرار إضافة SEQURE Blueson A2 65A كـESC مدى طويل.',
      'ملاحظة سعر: سعر رسمي واحد فقط من EMAX مباشرة ($23.99) تكرر عبر عدة عمليات بحث دون نطاق حقيقي من مصادر متعددة مختلفة السعر؛ تُرك priceRangeUSD فارغاً بدل افتراض نطاق.',
    ],
  },
];
