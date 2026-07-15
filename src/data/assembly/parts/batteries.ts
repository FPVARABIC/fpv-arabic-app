import type { Battery } from '../types';

// Engineering-judgment droneTypes additions (racing/cinematic/long-range on
// the entries below): battery cell count, capacity, and C-rating are
// electrical facts that don't change based on flight philosophy — the same
// pack works identically regardless of build purpose. These specific tags
// were added by conscious engineering decision, NOT because the product's
// own researched text (whyChoose/notFor/buildNotes) mentions these drone
// types — unlike every other droneTypes tag in this file and project,
// which rests on actual researched prose evidence. Flagged here so this
// distinction stays traceable.
//
// The 4S entry (battery-tattu-rline-1550-4s-budget) originally excluded
// long-range as a genuine engineering judgment call, not settled physics —
// long-range builds conventionally pair lower-KV motors with higher
// voltage (6S) for efficient cruising thrust. That original comment
// flagged this exclusion for revisit "if dedicated long-range motor
// research later suggests otherwise" — which is exactly what happened:
// motor-emax-e3-2808-1300kv-premium (motors.ts, the long-range motor) has
// its own already-authored specs.compatibleVoltages: [3, 4, 5, 6], i.e.
// genuine documented 4S support from that motor's own real spec data, not
// a new assumption. droneTypes now includes 'long-range' below on that
// basis — the same real 4S-capable motor (plus the matching ESC/frame/
// propeller category-tag fixes made alongside it) is what makes a 4S
// long-range build genuinely, not just nominally, selectable end-to-end.
export const batteries: Battery[] = [
  {
    id: 'battery-cnhl-black-series-v2-1300-6s-budget',
    tier: 'budget',
    nameAr: 'بطارية 6S 1300mAh - اقتصادية',
    nameEn: 'CNHL Black Series V2 1300mAh 6S 130C XT60',
    brand: 'CNHL',
    priceRangeUSD: [23, 30],
    specs: { sCount: 6, capacityMah: 1300, cRating: 130, burstCRating: 260, connector: 'XT60' },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [6] },
    whyChoose: 'بطارية 6S شائعة؛ سعة 1300mAh، 22.2V، وزن حوالي 223g وأبعاد 48x33x77mm حسب مصادر بيع موثوقة.',
    notFor: 'لا تختارها إذا تريد أخف وزن طويل المدى أو إذا فريمك مصمم لـ4S.',
    upgradePath: 'Tattu R-Line V6 1300mAh 6S',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: '6S 1300mAh شائعة — 130C بسعر اقتصادي',
      noteTag: 'الأثقل نسبياً (~223g) — ليست لأخف وزن',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسبة كبداية 6S إذا كان البناء كله مصممًا لـ6S.'],
    safetyNotes: ['اشحن داخل LiPo bag ولا تترك البطارية مشحونة بالكامل لأيام.'],
    buildNotes: [
      'مع محركات 1750KV تعطي punch قوي؛ وزن 220g+ يؤثر على الإحساس مقارنة بـ1100mAh.',
      'الوزن: حوالي 223g والأبعاد 48x33x77mm حسب مصادر بيع موثوقة.',
    ],
  },
  {
    id: 'battery-gnb-1100-6s-mid',
    tier: 'mid',
    nameAr: 'بطارية 6S 1100mAh - متوسطة',
    nameEn: 'GNB 1100mAh 6S 120C XT60',
    brand: 'GNB',
    priceRangeUSD: [28, 33],
    specs: { sCount: 6, capacityMah: 1100, cRating: 120, connector: 'XT60' },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [6] },
    whyChoose: 'بطارية 6S أخف من 1300mAh؛ يوجد نسختان شائعتان: LiPo 22.2V بوزن ~190g وأبعاد 38x35x76mm، وLiHV 22.8V بوزن ~173g وأبعاد قريبة حسب النسخة.',
    notFor: 'لا تختارها إذا تريد زمن طيران أطول أو تحمل كاميرا أكشن ثقيلة.',
    upgradePath: 'CNHL Black Series V2 1300mAh 6S',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'أخف من 1300mAh — استجابة أفضل لبناء خفيف',
      noteTag: 'نسختان مختلفتان فعلياً (LiPo/LiHV) — تأكد أيّهما تشتري',
      noteTagSource: 'build',
    },
    beginnerNotes: ['جيد لمن يريد تقليل الوزن بعد فهم استهلاك طائرته.'],
    safetyNotes: ['راقب الهبوط في الجهد؛ لا تطير حتى تفريغ عميق.'],
    buildNotes: [
      'مع بناء خفيف 5 إنش يعطي استجابة ممتازة لكن زمن الطيران أقصر.',
      'ملاحظة وزن/كيمياء: هذا المنتج له نسختان حقيقيتان مختلفتان — LiPo عادي (22.2V، ~190g) وLiHV عالي الجهد (22.8V، ~173g) — الوزن لا يُختزل في رقم واحد لأن النسختين تختلفان فعلياً في الجهد والوزن، لذا تُرك حقل weightG فارغاً بدل اختيار إحدى النسختين تعسفياً.',
    ],
  },
  {
    id: 'battery-tattu-rline-v6-1300-6s-premium',
    tier: 'premium',
    nameAr: 'بطارية 6S 1300mAh - احترافية',
    nameEn: 'Tattu R-Line V6 1300mAh 6S 160C XT60',
    brand: 'Tattu',
    priceRangeUSD: [35, 45],
    specs: { sCount: 6, capacityMah: 1300, cRating: 160, connector: 'XT60 / XT60U-F' },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [6] },
    whyChoose: 'بطارية أداء عالية: 1300mAh، 22.2V، 160C، وزن حوالي 197g وأبعاد 76x39x33mm حسب GensAce/Tattu.',
    notFor: 'لا تختارها لأول تدريب إذا كنت ستكسر بطاريات كثيرًا؛ سعرها أعلى.',
    upgradePath: 'CNHL Black Series V2 1300mAh 6S',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'أداء عالٍ — 160C بوزن ~197g',
      noteTag: 'ليست للتدريب الأول — كسرها مكلف',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ترقية ممتازة بعد التأكد من أن الدرون مضبوط ولا يستهلك بشكل غير طبيعي.'],
    safetyNotes: ['لا تشحن بطارية منتفخة أو تالفة؛ تخلص منها بطريقة آمنة.'],
    buildNotes: [
      'مع محركات قوية ومراوح Pitch عالي تعطي استجابة أفضل لكن لا تمنع سخونة النظام.',
      'الوزن: حوالي 197g والأبعاد 76x39x33mm حسب GensAce/Tattu.',
    ],
  },
  {
    id: 'battery-tattu-rline-1550-4s-budget',
    tier: 'budget',
    nameAr: 'بطارية 4S 1550mAh - اقتصادية',
    nameEn: 'Tattu R-Line 1550mAh 4S 95C XT60',
    brand: 'Tattu',
    priceRangeUSD: [25, 35],
    specs: { sCount: 4, capacityMah: 1550, cRating: 95, connector: 'XT60' },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4] },
    whyChoose: 'بطارية 4S كلاسيكية: 1550mAh، 14.8V، وزن حوالي 192-193g وموصل XT60، مناسبة لبناء 4S 5 إنش.',
    notFor: 'لا تختارها مع محركات KV منخفضة مخصصة غالباً لـ6S؛ الأداء سيكون ضعيفاً.',
    upgradePath: 'CNHL/Tattu 1300mAh 6S عند الانتقال لـ6S',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: '4S كلاسيكية 1550mAh لبناء 5 إنش',
      noteTag: 'لا تناسب محركات KV المنخفضة المخصصة لـ6S',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسب إذا قررت بناء 4S أبسط وأقل حدة.'],
    safetyNotes: ['لا تخلط بطاريات 4S و6S على نفس إعدادات المحرك دون فهم KV.'],
    buildNotes: [
      'مع 4S تحتاج KV أعلى من 6S عادة، وإلا يصبح الدرون بطيئاً.',
      'ملاحظة وزن: النص المصدري يذكر نطاقاً ضيقاً "192-193g" وليس رقماً واحداً؛ تُرك حقل weightG فارغاً بدل اختيار طرف من النطاق تعسفياً.',
    ],
  },
];
