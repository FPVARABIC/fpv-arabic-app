import type { Propeller } from '../types';

// Cinematic tag on propeller-hqprop-ethix-s5-mid rests on real textual
// evidence, not engineering judgment: its own whyChoose reads "مناسبة
// لطيران ناعم ومستقر" (suitable for smooth AND STABLE flying) — "مستقر"
// directly echoes the same root word droneTypes.ts itself uses to define
// cinematic ("يركّز على الاستقرار وحمل كاميرا أثقل"). Same standard as the
// "للتصوير" evidence that justified video-unit-dji-o4-air-unit-pro-premium's
// cinematic tag — functionally-equivalent non-forbidden language naming the
// type's own defining characteristic, not an inference.
//
// propeller-gemfan-f3s-5135-budget was considered and excluded: it shares
// similar "ناعم" (smooth) language but without Ethix S5's explicit pairing
// with "مستقر" (stable) as a flight-quality claim — its surrounding text
// (motor load/heat reduction, beginner forgiveness) leans toward but
// doesn't conclusively settle a gear-gentleness reading rather than a
// flight-stability one. A close call, decided on the strength/
// completeness of the evidence, not because the two products mean
// fundamentally different things.
//
// No racing tag added to any of the original 4 entries in this file:
// propeller-gemfan-hurricane-51466-v2-mck-premium was considered as an
// engineering-judgment candidate (aggressive-flying language, paired with
// the same 2207/2306 motors already tagged racing) but rejected —
// real-world competitive racing prop selection often diverges from
// aggressive-freestyle prop selection in ways that don't apply to
// motor/KV choice, so the same judgment basis used for Motors doesn't
// transfer cleanly here. Remains deferred.
//
// propeller-meps-sz5145-budget was added as a new, dedicated racing entry
// instead: its own primary manufacturer description states it is
// "specifically designed for FPV racing" — a direct, product-defining
// claim, not an adjacent descriptor like Hurricane's "aggressive." The
// same manufacturer's broader marketing also positions this exact SKU for
// freestyle and cinematic use in multiple places (not just a secondary
// Q&A aside) — considered and weighed, but the primary claim was judged
// strong enough to stand on its own; cinematic/freestyle were not added.
//
// propeller-hqprop-7x45x2-biblade-budget was added as a new, dedicated
// long-range entry — a softer evidentiary case than the racing addition
// above, documented honestly: no single manufacturer naming states "long
// range," but a second, independent retailer (RaceDayQuads) files this
// exact SKU under its own "long-range-gear" category, corroborating a
// different retailer's product-title use of the phrase. A genuine
// tradeoff (this pitch is more aggressive than other bi-blade options,
// trading efficiency for control) is documented in notFor rather than
// treated as disqualifying.
export const propellers: Propeller[] = [
  {
    id: 'propeller-gemfan-f3s-5135-budget',
    tier: 'budget',
    nameAr: 'مروحة 5.1 إنش - اقتصادية',
    nameEn: 'Gemfan F3S 5135 5.1x3x3',
    brand: 'Gemfan',
    priceRangeUSD: [3, 5],
    specs: { sizeInch: 5.1, pitchInch: 3, bladeCount: 3, weightG: 3.5 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'مروحة Gemfan Freestyle3S/F3S 5.1x3x3: قطر 5.1، Pitch 3، ثلاث شفرات، وزن يقارب 3.5g؛ مناسبة للتعلم والطيران الحر الناعم وكفاءة أفضل.',
    notFor: 'لا تختارها إذا تريد أقصى تسارع أو سباقات؛ الخطأ الشائع اختيار Pitch عالي قبل ضبط الطائرة.',
    upgradePath: 'HQ Ethix S5 5x4x3',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'ناعمة وكفوءة (Pitch 3) — مثالية للتعلم',
      noteTag: 'ليست لأقصى تسارع أو السباقات',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ممتازة لمن يريد طيراناً ناعماً ومغفرة أكبر للمحركات.'],
    safetyNotes: ['لا تختبر المراوح داخل المنزل أو قرب الأشخاص.'],
    buildNotes: [
      'مع محرك قوي ستقلل الحمل والحرارة مقارنة بمراوح 4.6 pitch.',
      'ملاحظة توافق الإطار: النص المصدري يذكر "5 إنش / 5.1 إنش" (توافق مع الحجمين)؛ حقل frameSizeInch تُرك فارغاً بدل تضييق التوافق الحقيقي لحجم واحد فقط.',
    ],
  },
  {
    id: 'propeller-hqprop-ethix-s5-mid',
    tier: 'mid',
    nameAr: 'مروحة 5 إنش - متوسطة',
    nameEn: 'HQProp ETHiX S5 5x4x3',
    brand: 'HQProp',
    priceRangeUSD: [4, 6],
    specs: { sizeInch: 5, pitchInch: 4, bladeCount: 3, material: 'PC', weightG: 3.7 },
    compatibilityTags: { droneTypes: ['freestyle', 'cinematic'], batteryVoltages: [4, 6], frameSizeInch: 5 },
    whyChoose: 'مروحة HQ/Ethix موثقة: 5 إنش، Pitch 4، 3 شفرات، PC، وزن ~3.7g؛ مناسبة لطيران ناعم ومستقر.',
    notFor: 'لا تختارها إذا تريد أقصى punch في سباقات قصيرة.',
    upgradePath: 'Gemfan Hurricane 51466 V2 MCK',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'طيران ناعم ومستقر — Pitch 4 متوازن',
      noteTag: 'ليست لأقصى punch في السباقات القصيرة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['خيار ممتاز لمن يفضّل التحكم الناعم على القفزات العنيفة.'],
    safetyNotes: ['المراوح التالفة تسبب اهتزازاً وتخرب الـ gyro/tune.'],
    buildNotes: [
      'مع 6S و2207 تعطي أداء ناعم دون تحميل مبالغ على ESC.',
    ],
  },
  {
    id: 'propeller-hqprop-dp-v1s-mid',
    tier: 'mid',
    nameAr: 'مروحة 5 إنش - متوسطة',
    nameEn: 'HQProp DP 5x4.3x3 V1S',
    brand: 'HQProp',
    priceRangeUSD: [4, 6],
    specs: { sizeInch: 5, pitchInch: 4.3, bladeCount: 3, material: 'PC', weightG: 3.8 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6], frameSizeInch: 5 },
    whyChoose: 'مروحة Durable V1S موثقة: 5 إنش، Pitch 4.3، 3 شفرات، PC، وزن ~3.8g؛ توازن جيد بين grip والمتانة.',
    notFor: 'لا تختارها إذا كان المحرك يسخن أو البطارية تهبط بسرعة؛ pitch أعلى من S5.',
    upgradePath: 'Gemfan Hurricane 51466 V2 MCK',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'توازن جيد بين grip والمتانة (Pitch 4.3)',
      noteTag: 'Pitch أعلى من S5 — حرارة واستهلاك أعلى',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['تصلح كخطوة بعد مروحة ناعمة عندما تريد تحكم أكثر.'],
    safetyNotes: ['لا تركب مروحة مشقوقة؛ قد تنكسر في الهواء.'],
    buildNotes: [
      'مع محركات 1750KV 6S تعمل جيداً لكن راقب الحرارة والتيار.',
    ],
  },
  {
    id: 'propeller-gemfan-hurricane-51466-v2-mck-premium',
    tier: 'premium',
    nameAr: 'مروحة 5.1 إنش - احترافية',
    nameEn: 'Gemfan Hurricane 51466 V2 MCK',
    brand: 'Gemfan',
    priceRangeUSD: [6, 10],
    specs: { sizeInch: 5.1, pitchInch: 3.6, bladeCount: 3, weightG: 4.2 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'مروحة قوية: قطر ~131.8mm، Pitch 3.6، 3 شفرات، وزن ~4.2g؛ مناسبة لطيران عدواني مع محركات 2207-2306.',
    notFor: 'لا تختارها للمبتدئ أو لمحركات/ESC ضعيفة؛ قد ترفع الحمل والتيار.',
    upgradePath: 'HQProp DP 5x4.3x3 V1S',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'قوية للطيران العدواني مع محركات 2207/2306',
      noteTag: 'ليست للمبتدئ — ترفع الحمل والتيار على المحرك/ESC',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['استخدمها عندما تكون جاهزاً لتحمل استهلاك وحرارة أعلى مقابل استجابة قوية.'],
    safetyNotes: ['راقب حرارة المحرك بعد أول دقيقة طيران عند تغيير المروحة.'],
    buildNotes: [
      'مع 6S ومحركات 2207/2306 قوية تعطي grip أعلى لكن تستهلك أكثر.',
      'ملاحظة توافق الإطار: النص المصدري يذكر "5 إنش / 5.1 إنش" (توافق مع الحجمين)؛ حقل frameSizeInch تُرك فارغاً بدل تضييق التوافق الحقيقي لحجم واحد فقط.',
    ],
  },
  {
    id: 'propeller-meps-sz5145-budget',
    tier: 'budget',
    nameAr: 'مروحة سباق 5.1 إنش - اقتصادية',
    nameEn: 'MEPS SZ5145 5.1x4.5x3 Propeller',
    brand: 'MEPS',
    specs: { sizeInch: 5.1, pitchInch: 4.5, bladeCount: 3, material: 'PC', weightG: 3.7 },
    compatibilityTags: { droneTypes: ['racing'], batteryVoltages: [4, 6] },
    whyChoose: 'مصممة خصيصاً لسباقات الـFPV حسب وصف الشركة المصنعة (MEPS) نفسها؛ قطر 5.1 إنش، Pitch 4.5، 3 شفرات، وزن ~3.7g. الشركة توصي بإقرانها مع محركات MEPS SPACE 2207 السباقية.',
    notFor: 'لا تختارها إذا تحتاج مروحة مقوّاة خصيصاً لتحمل تصادمات شديدة ومتكررة؛ لم يُذكر في المصدر أي مادة مقوّاة غير PC العادي.',
    upgradePath: 'لا يوجد حالياً بديل سباقي أعلى في القاعدة.',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'مصممة خصيصاً للسباق — وفق MEPS نفسها',
      noteTag: 'PC عادية — غير مقوّاة لتصادمات شديدة متكررة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ليست الخيار الأول لأول تجربة سباق؛ تفترض إطاراً وإعداداً سباقياً جاهزاً مثل AOS RC 5R، وليست موجّهة للطيران الحر العام.'],
    safetyNotes: ['لا تختبر المراوح داخل المنزل أو قرب الأشخاص؛ تأكد من إحكام ربط المروحة على عمود الموتور قبل أول طيران.'],
    buildNotes: [
      'قطرها 5.1 إنش يقع ضمن الحد الأقصى لمروحة إطار AOS RC 5R (5.3 إنش)، ويجتاز فحص التوافق بين الإطار والمروحة.',
      'ملاحظة تصنيف: الوصف التسويقي الأساسي يذكرها صراحة كمروحة "مصممة خصيصاً لسباقات الـFPV" — وهذا أساس تصنيفها هنا كسباق فقط. نفس الشركة تسوّقها أيضاً، في مواد تسويقية أخرى غير قسم الأسئلة الثانوي فقط، كخيار مناسب لطيران حر وتصوير أيضاً؛ لم يُعتبر هذا كافياً لإضافة أي تصنيف آخر هنا.',
      'ملاحظة سعر: مصدر واحد فقط (DIYFPV) يذكر سعراً "يبدأ من" 4.90 دولار تقريباً، دون نطاق سعر مؤكد من مصادر متعددة؛ تُرك priceRangeUSD فارغاً بدل افتراض نطاق غير مؤكد.',
      'ملاحظة مادة: PC (بولي كاربونات) مؤكدة من صفحة الشركة المصنعة مباشرة ومصدر ثانٍ مستقل؛ ذكر "carbon fiber" في وصف عام لقائمة أمازون منفصلة لم يُعتمد لأنه على الأرجح نص عام غير خاص بهذا المنتج تحديداً.',
    ],
  },
  {
    id: 'propeller-hqprop-7x45x2-biblade-budget',
    tier: 'budget',
    nameAr: 'مروحة 7 إنش - اقتصادية',
    nameEn: 'HQProp 7x4.5x2 Durable Bi-Blade',
    brand: 'HQProp',
    specs: { sizeInch: 7, pitchInch: 4.5, bladeCount: 2, material: 'PC', weightG: 6.6 },
    // batteryVoltages: [4, 6] — a propeller has no electrical dependency on
    // battery cell count (PropellerSpec has no voltage field, and
    // compatibility/validators.ts only checks propeller-vs-frame size, not
    // propeller-vs-battery); every other propeller in this file already
    // carries [4, 6] for the same reason. This entry was the sole outlier,
    // tagged [6] only; corrected to match the category's own established
    // pattern, not a new claim.
    compatibilityTags: { droneTypes: ['long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'موزّعان مستقلان يربطانها بمشاريع مدى طويل: RaceDayQuads يصنّفها ضمن قسمه الخاص "long-range-gear"، وDroneTheoryFilms يستخدم "Long Range FPV Prop" في عنوان المنتج مباشرة — رغم أن الاسم الأساسي عند معظم المتاجر الأخرى (Pyrodrone، WREKD، وRaceDayQuads نفسها في عنوان المنتج) هو "Durable Bi-Blade" دون ذكر "مدى طويل" صراحة. 7 إنش، Pitch 4.5، شفرتان (bi-blade)، بولي كاربونات، وزن 6.6g.',
    notFor: 'لا تختارها إذا تريد أقصى كفاءة/أطول زمن طيران ممكن ضمن فئة bi-blade تحديداً؛ تقارير مجتمعية تصف Pitch 4.5 هذا بأنه أكثر عدوانية (غطس أسرع، لفات أخف، سرعة قصوى أعلى) من خيارات bi-blade أخف Pitch، بمقايضة كفاءة حقيقية مقابل ذلك.',
    upgradePath: 'لا يوجد حالياً بديل مدى طويل آخر موثق في القاعدة.',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'Bi-blade 7 إنش لمشاريع المدى الطويل',
      noteTag: 'Pitch 4.5 عدواني نسبياً — يقايض بعض الكفاءة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ليست الخيار الأول لأول تجربة؛ مصممة لبناء مدى طويل 7 إنش تحديداً، ومقايضة الكفاءة/السيطرة تحتاج فهماً مسبقاً.'],
    safetyNotes: ['لا تختبر المراوح داخل المنزل أو قرب الأشخاص؛ تأكد من إحكام الربط على عمود الموتور 5mm قبل أول طيران.'],
    buildNotes: [
      'قطرها 7 إنش يقع ضمن الحد الأقصى الموثق لإطار GEPRC MOZ7 V2 (8 إنش)، ويجتاز فحص التوافق الفعلي بين الإطار والمروحة (maxPropSizeInch) في الكود.',
      'ملاحظة تصنيف: لا توجد تسمية موحدة من الشركة المصنعة نفسها لـ"مدى طويل"؛ الدليل هنا من تصنيف/تسمية موزّعين مستقلين، وليس ادعاء مصنّع واحد مباشر.',
      'الوزن: 6.6g، سماكة hub 7.5mm، قطر hub 13.5mm، عمود 5mm.',
      'ملاحظة سعر: سعر واحد فقط موثق (4.99 دولار لعبوة 4 مراوح من WREKD Co.) دون تكرار من مصدر آخر بسعر مختلف؛ تُرك priceRangeUSD فارغاً بدل افتراض نطاق.',
    ],
  },
];
