import type { FlightController } from '../types';

// Engineering-judgment droneTypes addition (racing/cinematic on all 4
// entries below): an FC's gyro-read/ESC-command loop doesn't change based
// on airframe purpose — the same board flies a racing or cinematic build
// identically. A conscious engineering decision, not inferred from prose —
// none of the 4 entries' own researched text mentions either type.
//
// Long-range is a two-tier evidence case, not a blanket judgment call, and
// only extends to 2 of the 4 entries:
// - fc-matek-h743-slim-v3-premium: direct textual evidence — its own
//   buildNotes explicitly says "مع مدى طويل ... تعطي مرونة كبيرة", using the
//   literal term itself.
// - fc-holybro-kakute-h7-v2-premium: functional evidence, softer than
//   Matek's — its own buildNotes names the specific GPS+ELRS+O4 peripheral
//   combination, which is functionally tied to long-range needs (same
//   reasoning basis already established for GPS's own softer long-range
//   justification), but never uses the literal term "مدى طويل" the way
//   Matek does. Real evidence, not a judgment call, but calibrated as
//   weaker than Matek's direct term match.
// fc-speedybee-f405-v4-budget and fc-foxeer-f722-v4-mid have no long-range
// evidence of either kind and do NOT get the tag.
export const flightControllers: FlightController[] = [
  {
    id: 'fc-speedybee-f405-v4-budget',
    tier: 'budget',
    nameAr: 'Flight Controller F405 - اقتصادي',
    nameEn: 'SpeedyBee F405 V4 Flight Controller / Stack',
    brand: 'SpeedyBee',
    priceRangeUSD: [35, 70],
    specs: { mcu: 'F4 / STM32F405', uartCount: 6, supportsDjiO4: true, mountingSizeMm: 30.5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'لوحة F405 V4 مع Bluetooth وBlackbox MicroSD وموصل DJI Air Unit؛ 6 UART sets حسب مواصفات SpeedyBee، وقيمة ممتازة لأول بناء 5 إنش. نطاق السعر واسع لأنه يغطي على الأرجح لوحة FC فقط في الطرف الأقل وحزمة Stack كاملة (FC+ESC) في الطرف الأعلى.',
    notFor: 'لا تختارها إذا تحتاج H7 أو مشروع INAV/ArduPilot متقدم جداً مع توسعات كثيرة.',
    upgradePath: 'Holybro Kakute H7 V2',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['ممتاز لأول بناء لأنه يقلل تعقيد التوصيل عند استخدام Stack كامل.'],
    safetyNotes: ['لا تفترض أن كابل DJI/O4 pinout متطابق دائماً؛ راجع مخطط اللوحة والوحدة قبل التشغيل.'],
    buildNotes: [
      'مع DJI O3/O4 استخدم UART/MSP مخصصاً وراجع pinout؛ موصل DJI/O3 الرسمي لا يعني أن كل كابل O4 مطابق دون مراجعة الترتيب.',
      'ملاحظة سعر: النص المصدري يسمي المنتج "Flight Controller / Stack" بنطاق سعر 35-70 دولار دون فصل صريح؛ الطرف الأقل على الأرجح للوحة FC وحدها، والطرف الأعلى لحزمة Stack كاملة مع ESC — المواصفات (MCU، عدد UART، دعم DJI O4) خاصة باللوحة نفسها ولا تتغير حسب طريقة الشراء.',
    ],
  },
  {
    id: 'fc-foxeer-f722-v4-mid',
    tier: 'mid',
    nameAr: 'Flight Controller F722 - متوسط',
    nameEn: 'Foxeer F722 V4 Flight Controller',
    brand: 'Foxeer',
    priceRangeUSD: [55, 90],
    specs: { mcu: 'F7 / STM32F722RET6', uartCount: 6, supportsDjiO4: true, mountingSizeMm: 30.5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic'], batteryVoltages: [4, 6] },
    whyChoose: 'لوحة F7 موثقة بـ6 UART وBlackbox 16MB وBEC قوي، وتوجد نسخ DJI/O4 حسب الإصدار.',
    notFor: 'لا تختارها إذا تحتاج H7 أو micro mounting؛ تأكد من نسخة 30x30 أو mini قبل الشراء.',
    upgradePath: 'Holybro Kakute H7 V2',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسب لمن تجاوز أول بناء ويريد FC أقوى من F405.'],
    safetyNotes: ['خطأ شائع: توصيل TX مع TX أو RX مع RX؛ الصحيح TX إلى RX والعكس.'],
    buildNotes: [
      'مع O4/DJI اترك UART مخصصاً لـMSP ولا تشارك نفس UART مع الريسيفر.',
      'ملاحظة تركيب: المصدر يذكر أكثر من نسخة مقاس (30x30 أو mini)؛ تأكد من النسخة الفعلية قبل الشراء بدل افتراض مقاس واحد.',
    ],
  },
  {
    id: 'fc-holybro-kakute-h7-v2-premium',
    tier: 'premium',
    nameAr: 'Flight Controller H7 - احترافي',
    nameEn: 'Holybro Kakute H7 V2 Flight Controller',
    brand: 'Holybro',
    priceRangeUSD: [90, 125],
    specs: { mcu: 'H7 / STM32H743', uartCount: 6, supportsDjiO4: true, mountingSizeMm: 30.5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'لوحة H7 ممتازة، 6 UART، 128MB flash logging، دعم واسع لـBetaflight/ArduPilot، ومدخل جهد حتى 2S-8S حسب الوثائق.',
    notFor: 'لا تختارها إذا تريد أرخص حل أو لا تحتاج كل هذه المنافذ.',
    upgradePath: 'Matek H743-SLIM V3',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['اختيار قوي لمن يريد بناء قابل للتوسع لاحقاً.'],
    safetyNotes: ['احذر من توزيع UART عشوائياً؛ وثّق كل منفذ قبل اللحام.'],
    buildNotes: [
      'مع GPS وELRS وO4 يبقى لديك هامش UART أفضل من لوحات F4 محدودة.',
      'ملاحظة UART لمدى طويل: 6 UART قد يصبح ضيقاً إذا جمعت GPS وELRS وO4 وأجهزة أخرى معاً في نفس البناء؛ إذا خططت لهذا المزيج تحديداً على مدى طويل، Matek H743-SLIM V3 بـ7 UART يعطي هامشاً إضافياً.',
    ],
  },
  {
    id: 'fc-matek-h743-slim-v3-premium',
    tier: 'premium',
    nameAr: 'Flight Controller H7 - احترافي',
    nameEn: 'Matek H743-SLIM V3 Flight Controller',
    brand: 'Matek',
    priceRangeUSD: [110, 140],
    specs: { mcu: 'H7 / STM32H743VIH6', uartCount: 7, supportsDjiO4: true, mountingSizeMm: 30.5 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'لوحة H7 متقدمة: 2-8S، 7 UART، 2x I2C، CAN، microSD، مناسبة للمتقدمين وINAV/ArduPilot؛ دعم O4/DJI يكون بتوصيل MSP/UART يدوي لا plug-and-play دائماً.',
    notFor: 'لا تختارها لأول بناء FPV بسيط أو إذا تريد موصل DJI جاهز plug-and-play.',
    upgradePath: 'Holybro Kakute H7 V2',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    beginnerNotes: ['مناسب للمتقدمين الذين يفهمون pinout والتوزيع الكهربائي.'],
    safetyNotes: ['لا توصل VBAT/5V عشوائياً؛ راجع جهد كل طرفية قبل التشغيل.'],
    buildNotes: [
      'مع مدى طويل أو GPS/Compass تعطي مرونة كبيرة، لكنها تزيد مسؤولية التخطيط.',
      'ملاحظة DJI O4: الدعم موجود فعلياً (supportsDjiO4=true) لكنه يتطلب توصيل MSP/UART يدوي وليس plug-and-play — القيمة true تعكس القدرة الفعلية، والتحفظ هنا عن سهولة التركيب فقط.',
    ],
  },
];
