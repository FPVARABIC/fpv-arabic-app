import type { Gps } from '../types';

// Long-range tag on gps-matek-m10q-5883-premium rests on real textual
// evidence, not engineering judgment: its own whyChoose reads "خيار موثوق
// لمشاريع مدى طويل/INAV/ArduPilot" — the literal term appears directly,
// same evidentiary standard as the receiver/flight-controller long-range
// tags elsewhere in this project.
//
// No racing or cinematic tag added anywhere in this file: GPS was placed
// in the strict/evidence-gated category (same standard as Receivers), and
// none of the 5 entries' own text supports either type. gps-hglrc-m100-
// mini-budget's "مناسب لـ 2-7 إنش" claim was considered and rejected —
// broad size-range language, not purpose-specific evidence, same pattern
// already rejected for DJI O4's initial "many users" framing.
export const gps: Gps[] = [
  {
    id: 'gps-hglrc-m100-mini-budget',
    tier: 'budget',
    nameAr: 'وحدة GPS - اقتصادية',
    nameEn: 'HGLRC M100 Mini GPS',
    brand: 'HGLRC',
    priceRangeUSD: [13, 20],
    specs: { chipset: 'M10', hasCompass: false, weightG: 2.7 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'GPS صغير وخفيف مناسب لـ 2-7 إنش، جيد لإضافة Rescue/RTH في Betaflight.',
    notFor: 'لا تختاره إذا تحتاج Compass مدمج أو مشروع INAV/ArduPilot يعتمد على اتجاه مغناطيسي.',
    upgradePath: 'Matek M10Q-5883',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'صغير وخفيف (2.7g) — جيد لـRescue/RTH',
      noteTag: 'بلا Compass — لا يناسب INAV/ArduPilot الاتجاهي',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ممتاز كأول GPS على 5 إنش بشرط فهم أنه لا يحتوي Compass.'],
    safetyNotes: ['GPS لا يعني أن الطائرة آمنة تلقائياً؛ اختبر Rescue/RTH في مكان مفتوح وبحذر.'],
    buildNotes: [
      'مع فريم كربون كثيف أو تركيب قريب من VTX قد يتأخر الحصول على satellites؛ ارفعه بعيداً عن الضجيج.',
      'المواصفات: 15x15x5.2mm / 2.7g / 3.3-5V / GPS+BDS+Galileo / UBLOX.',
    ],
  },
  {
    id: 'gps-hglrc-m100-5883-mid',
    tier: 'mid',
    nameAr: 'وحدة GPS - متوسطة',
    nameEn: 'HGLRC M100-5883 GPS',
    brand: 'HGLRC',
    priceRangeUSD: [20, 30],
    specs: { chipset: 'M10 + QMC5883', hasCompass: true, weightG: 7.73 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'GPS مع Compass مدمج مناسب لمشاريع تحتاج اتجاه مغناطيسي أكثر من Betaflight التقليدي.',
    notFor: 'لا تختاره إذا تريد أخف وزن أو إذا لا تحتاج Compass؛ M100 Mini أبسط وأخف.',
    upgradePath: 'Matek M10Q-5883',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'Compass مدمج لمشاريع الاتجاه المغناطيسي',
      noteTag: 'أثقل (7.7g) — M100 Mini أبسط إن لم تحتج Compass',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['جيد عندما تعرف لماذا تحتاج Compass، وليس فقط لأن اسمه يبدو أفضل.'],
    safetyNotes: ['عاير الـ Compass في النظام الذي يدعمه ولا تفترض أن Betaflight سيستفيد منه مثل INAV.'],
    buildNotes: [
      'مع Compass يجب إبعاده عن أسلاك البطارية والمحركات لتقليل التشويش المغناطيسي.',
      'المواصفات: 21x21x8.02mm / 7.73g / 3.3-5V / GPS+BDS+Galileo+GLONASS.',
    ],
  },
  {
    id: 'gps-matek-m10q-5883-premium',
    tier: 'premium',
    nameAr: 'وحدة GPS - احترافية',
    nameEn: 'Matek M10Q-5883 GNSS & Compass',
    brand: 'Matek',
    priceRangeUSD: [25, 40],
    specs: { chipset: 'u-blox SAM-M10Q + QMC5883L', hasCompass: true, weightG: 8 },
    compatibilityTags: { droneTypes: ['freestyle', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'خيار موثوق لمشاريع مدى طويل/INAV/ArduPilot التي تحتاج GNSS مع Compass مدمج.',
    notFor: 'لا تختاره لأول 5 إنش Betaflight بسيط إذا كان الهدف فقط GPS Rescue؛ سيكون أكبر وأغلى من اللازم.',
    upgradePath: 'HGLRC M100 Mini GPS',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'موثوق لمدى طويل/INAV — GNSS مع Compass',
      noteTag: 'مبالغة لمجرد GPS Rescue — أكبر وأغلى من اللازم',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['اختيار احترافي لمن يخطط لاستخدام Compass فعلاً.'],
    safetyNotes: ['وصل UART للـ GPS وI2C للـ Compass بشكل صحيح؛ الخلط بينهما يسبب فشل قراءة المستشعر.'],
    buildNotes: [
      'مع INAV/ArduPilot يعطي مرونة أكبر لكن يتطلب wiring ومعايرة أدق.',
      'المواصفات: 20x20x12.4mm تقريباً / 8g / 4-9V / UART GNSS + I2C Compass.',
    ],
  },
  {
    id: 'gps-flywoo-goku-gm10-nano-v3-budget',
    tier: 'budget',
    nameAr: 'وحدة GPS - اقتصادية',
    nameEn: 'Flywoo GOKU GM10 Nano V3 GPS',
    brand: 'Flywoo',
    priceRangeUSD: [13, 18],
    specs: { hasCompass: false, weightG: 2.2 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'بديل أخف من HGLRC M100 Mini؛ خفيف جداً ومناسب للبنايات التي لا تتحمل GPS كبير.',
    notFor: 'لا تختاره إذا تحتاج compass أو هوائي أكبر لثبات أعلى.',
    upgradePath: 'HGLRC M100 Mini أو Matek M10Q',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'الأخف في القاعدة (2.2g) لبناء ضيق',
      noteTag: 'بلا Compass — اختر غيره إن أردت هوائياً أكبر',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسب كـ GPS خفيف لـ Betaflight Rescue.'],
    safetyNotes: ['لا تعتمد عليه وحده للطيران بعيداً دون اختبار Rescue.'],
    buildNotes: [
      'مع مدى طويل حقيقي الأفضل GPS أكبر أو مع compass حسب firmware.',
      'المواصفات: 12×16×4.5mm، 1-10Hz (افتراضي 10Hz)، baud 4800-921600 (افتراضي 115200).',
      'ملاحظة تدقيق: عمود الشريحة في المصدر كان نصاً وصفياً "M10050/M10 class / لا Compass"، والعمود المجاور له كان "3.3-5V / 2.2g" بدل حقل Compass المعتاد (نعم/لا) — chipset تُرك فارغاً بدل اختراع اسم شريحة دقيق.',
    ],
  },
  {
    id: 'gps-flywoo-goku-gm10-nano-v3-compass-mid',
    tier: 'mid',
    nameAr: 'وحدة GPS - متوسطة',
    nameEn: 'Flywoo GOKU GM10 Nano V3 GPS w/Compass',
    brand: 'Flywoo',
    priceRangeUSD: [18, 25],
    specs: { hasCompass: true, weightG: 2.6 },
    compatibilityTags: { droneTypes: ['freestyle'], batteryVoltages: [4, 6] },
    whyChoose: 'بديل أخف من HGLRC M100-5883؛ اختيار صغير مع compass لمن يحتاج I2C/compass في build ضيق.',
    notFor: 'لا تختاره إذا لا تحتاج compass؛ النسخة بدون compass أبسط.',
    upgradePath: 'Matek M10Q-5883',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'أخف خيار مع Compass (2.6g) لبناء ضيق',
      noteTag: 'إن لم تحتج Compass فالنسخة بدونه أبسط',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسب لمن يعرف كيف يعاير compass ويبعده عن الضجيج.'],
    safetyNotes: ['لا تضع compass قرب أسلاك البطارية أو ESC.'],
    buildNotes: [
      'الـ compass يتأثر جداً بالكهرباء والتيار العالي.',
      'المواصفات: 12×17×5mm، 6 pins، 1-10Hz، UBLOX/NMEA حسب BF.',
      'ملاحظة تدقيق: عمود الشريحة في المصدر كان نصاً وصفياً "GPS + Compass"، والعمود المجاور له كان "3.3-5V / 2.6g" بدل حقل Compass المعتاد (نعم/لا) — chipset تُرك فارغاً بدل اختراع اسم شريحة دقيق.',
    ],
  },

  // Racing-gap research pass (Assembly Issue 3 follow-up) — until these 2
  // entries, no GPS module in this file was tagged for 'racing' at all (all
  // 5 above are 'freestyle'-only or 'freestyle'+'long-range'). Both entries
  // below are real, currently-sold products whose OWN retailer listing
  // titles explicitly name "Racing" (same evidentiary bar this file's own
  // header comment sets), cross-checked across multiple independent
  // retailers via web search — but every direct manufacturer/retailer page
  // fetch attempt returned HTTP 403 (blocked), so weightG below is drawn
  // from consistently-matching numbers across several independent listings,
  // not a single directly-fetched authoritative spec sheet. confidence is
  // set to 'تجربة مجتمع' rather than 'مؤكد' to reflect this; re-verify
  // directly against a manufacturer page when possible. No genuine
  // 'cinematic' GPS candidate was found — every search result tying GPS to
  // "cinematic" use was generic marketing prose, never a product's own
  // name/description, so cinematic GPS support remains an open data gap
  // rather than being force-filled here.
  {
    id: 'gps-diatone-mamba-m8plus-racing',
    tier: 'budget',
    nameAr: 'وحدة GPS - اقتصادية (سباقات)',
    nameEn: 'Diatone Mamba GPS/Beidou M8PLUS',
    brand: 'Diatone',
    specs: { chipset: 'M8PLUS', hasCompass: false, weightG: 4.9 },
    compatibilityTags: { droneTypes: ['racing'], batteryVoltages: [4, 6] },
    // Explicitly sold "for RC FPV Drone Racing Freestyle Long-Range
    // Flight" — this exact framing repeats across Diatone's own site and
    // multiple independent retailers (NewBeeDrone, SpeedyFPV, BuddyRC,
    // Pyrodrone, MyFPV, Amazon), a real, first-party-adjacent racing claim,
    // not an assumption. Only the 'racing' tag is added here — this file's
    // strict evidence-gated standard for GPS (see the top-of-file comment)
    // means freestyle/long-range are NOT added just because the same
    // listing title also mentions them, since no OTHER researched GPS
    // entry in this file extends its tag set on listing-title text alone.
    whyChoose: 'وحدة GPS مباعة رسمياً "لسباقات/فريستايل/مدى طويل" حسب متاجر Diatone الرسمية ومتاجر مستقلة متعددة — من القليل الموثق بربط صريح بالسباقات في هذا الملف.',
    notFor: 'لا تختارها إذا تحتاج Compass مدمج (لا يوجد compass مؤكد لهذه النسخة) أو تحتاج وزناً مؤكداً من ورقة مواصفات المصنّع مباشرة — لم تُجلب صفحة المنتج مباشرة (حجب 403).',
    upgradePath: 'SEQURE M10-25Q (مع Compass)',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'مباعة رسمياً لسباقات FPV — خفيفة (4.9g)',
      noteTag: 'بلا Compass — ووزنها من مصادر متعددة لا صفحة مصنّع مباشرة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['خيار GPS مخصص للسباقات إذا كان بناؤك من نوع سباقات ولا تحتاج Compass.'],
    safetyNotes: ['GPS لا يعني أن الطائرة آمنة تلقائياً؛ اختبر Rescue/RTH في مكان مفتوح وبحذر.'],
    buildNotes: [
      'مصدر البيانات: نتائج بحث ويب عبر عدة متاجر مستقلة (Diatone الرسمي، NewBeeDrone، SpeedyFPV، BuddyRC، Pyrodrone، MyFPV) تتفق على 18×18×6mm و4.9g وشريحة Beidou M8PLUS مع GPS+BDS — لكن كل محاولة لجلب صفحة المنتج مباشرة أُعيقت (HTTP 403)، فهذه الأرقام مبنية على تطابق عدة مصادر مستقلة لا تحققاً من صفحة واحدة موثوقة مباشرة.',
    ],
  },
  {
    id: 'gps-sequre-m10-25q-racing',
    tier: 'mid',
    nameAr: 'وحدة GPS - متوسطة (سباقات)',
    nameEn: 'SEQURE M10-25Q GPS w/QMC5883L Compass',
    brand: 'SEQURE',
    specs: { chipset: 'M10 + QMC5883L', hasCompass: true, weightG: 12.2 },
    compatibilityTags: { droneTypes: ['racing'], batteryVoltages: [4, 6] },
    // Explicitly marketed "for FPV Racing Drones" in its own Amazon/
    // manufacturer listing title, corroborated across Amazon, Sequremall
    // (manufacturer's own store), manuals.plus, rotorama, and MyFPV —
    // the same first-party-adjacent racing evidence standard as the
    // Diatone entry above, with a genuinely different tier (heavier, more
    // full-featured: integrated compass, higher accuracy) rather than a
    // duplicate of the same option.
    whyChoose: 'وحدة GPS مباعة رسمياً "لطائرات السباقات FPV"، مع Compass QMC5883L مدمج ودقة موقع أعلى — بديل أثقل وأكمل مواصفات من الخيار الاقتصادي أعلاه لمن يحتاج Compass فعلاً.',
    notFor: 'لا تختارها إذا تريد أخف وزن ممكن (12.2g هي الأثقل في عائلة SEQURE M10) أو تحتاج تأكيداً من صفحة المصنّع مباشرة — لم تُجلب صفحة المنتج مباشرة (حجب 403).',
    upgradePath: 'Matek M10Q-5883',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'مباعة رسمياً لسباقات FPV — مع Compass QMC5883L',
      noteTag: 'الأثقل في عائلتها (12.2g) — ووزنها من مصادر متعددة لا صفحة مصنّع مباشرة',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['خيار GPS للسباقات إذا كنت تحتاج Compass مدمج ولا يزعجك الوزن الإضافي.'],
    safetyNotes: ['عاير الـ Compass في النظام الذي يدعمه ولا تفترض أن Betaflight سيستفيد منه مثل INAV.'],
    buildNotes: [
      'مصدر البيانات: نتائج بحث ويب عبر عدة متاجر مستقلة (Amazon، Sequremall، manuals.plus، rotorama، MyFPV) تتفق على 25×25×8mm و12.2g وشريحة M10 مع QMC5883L Compass، دعم GPS/GLONASS/BDS/GALILEO/QZSS، ودقة 10Hz — لكن كل محاولة لجلب صفحة المنتج مباشرة أُعيقت (HTTP 403)، فهذه الأرقام مبنية على تطابق عدة مصادر مستقلة لا تحققاً من صفحة واحدة موثوقة مباشرة.',
    ],
  },
];
