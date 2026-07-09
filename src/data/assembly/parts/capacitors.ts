import type { Capacitor } from '../types';

// Engineering-judgment droneTypes additions (racing/cinematic/long-range on
// all 3 entries below): a capacitor's job — suppressing voltage spikes at a
// 4-in-1 ESC — is purely a function of battery voltage, not airframe
// purpose. The same 1000uF/35V or /50V part protects an ESC identically
// whether it's driving a racing, cinematic, or long-range build. A
// conscious engineering decision, not inferred from prose — none of the 3
// entries' own researched text mentions any of these three drone types.
export const capacitors: Capacitor[] = [
  {
    id: 'capacitor-generic-1000uf-35v-budget',
    // Note for future maintainers: this 35V rating is fine for today's
    // 6S-max battery data, but this specific capacitor should be
    // re-evaluated if an 8S+ battery is ever added for Long-Range
    // specifically — see this capacitor's own notFor warning against 8S+
    // use below. No battery above 6S exists in this project today, so this
    // is not a live gap, only a forward-looking note.
    tier: 'budget',
    nameAr: 'كاباستور 1000uF 35V - اقتصادي',
    nameEn: 'Low ESR Capacitor 1000uF 35V (Rubycon/Panasonic/Nichicon equivalent)',
    priceRangeUSD: [1, 3],
    specs: { capacitanceUf: 1000, voltageRating: 35 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'مكثف مناسب لمعظم Builds 4S/6S التقليدية مع ESC 4in1 لتقليل voltage spikes.',
    notFor: 'لا تختاره لـ8S أو أنظمة أعلى من 6S؛ الجهد 35V لا يعطي هامشاً كافياً هناك.',
    upgradePath: 'Panasonic FR 1000uF 50V',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'مناسب لمعظم بنايات 4S/6S التقليدية',
      noteTag: '35V — هامش غير كافٍ فوق 6S',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['ركّبه مباشرة على أطراف بطارية ESC وبأقصر أطراف ممكنة.'],
    safetyNotes: ['انتبه للقطبية؛ عكس القطبية قد يسبب فرقعة أو انفجار المكثف.'],
    buildNotes: [
      'مع 6S يعمل عادة لأن 6S مشحون بالكامل 25.2V، لكن 50V يعطي هامشاً أعلى.',
      'مواصفة إضافية: Low ESR / 105°C / قطبية (polarized).',
    ],
  },
  {
    id: 'capacitor-rubycon-zlh-1000uf-35v-mid',
    tier: 'mid',
    nameAr: 'كاباستور Rubycon ZLH 1000uF 35V - متوسط',
    nameEn: 'Rubycon ZLH 1000uF 35V Low Impedance Capacitor',
    brand: 'Rubycon',
    priceRangeUSD: [1, 3],
    specs: { capacitanceUf: 1000, voltageRating: 35 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'مكثف Rubycon ZLH 1000uF 35V موثق كـlow impedance و10,000h @105°C، مناسب لتقليل الضوضاء في 5 إنش.',
    notFor: 'لا تختاره إذا كان المكان ضيقاً أو إذا تحتاج 50V لهامش أكبر.',
    upgradePath: 'Panasonic FR 1000uF 50V',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'Low impedance موثق — عمر 10,000h @105°C',
      noteTag: '35V — للهامش الأكبر اختر نسخة 50V',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['اختيار جيد إذا كان متوفرًا محلياً بسعر مناسب.'],
    safetyNotes: [
      'لا تترك أرجل المكثف طويلة؛ هذا يقلل فعاليته.',
      'انتبه للقطبية؛ عكس القطبية قد يسبب فرقعة أو انفجار المكثف — هذا مكثف مستقطب (polarized) حسب مواصفة المصدر.',
    ],
    buildNotes: [
      'مع 6S وESC قوي يظل مفيداً لكنه لا يعالج لحاماً سيئاً أو أسلاك بطارية طويلة جداً.',
      'مواصفة إضافية: Low impedance / 105°C / قطبية (polarized).',
    ],
  },
  {
    id: 'capacitor-panasonic-fr-1000uf-50v-premium',
    tier: 'premium',
    nameAr: 'كاباستور Panasonic FR 1000uF 50V - احترافي',
    nameEn: 'Panasonic FR 1000uF 50V Low ESR Capacitor',
    brand: 'Panasonic',
    priceRangeUSD: [2, 5],
    specs: { capacitanceUf: 1000, voltageRating: 50 },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'يعطي هامش جهد أعلى لأنظمة 6S القوية، وسلسلة FR موثقة كـLow ESR وعمر طويل عند 105°C.',
    notFor: 'لا تختاره إذا كان حجمه يسبب تماساً مع الكربون أو المكونات داخل فريم ضيق.',
    upgradePath: 'Rubycon ZLH 1000uF 35V عند ضيق المساحة',
    lastReviewed: '2026-07',
    confidence: 'مؤكد',
    quickTags: {
      whyTag: 'هامش جهد أعلى (50V) لأنظمة 6S القوية',
      noteTag: 'حجمه أكبر — انتبه للتماس داخل فريم ضيق',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مفيد في بناء قوي أو عند استخدام محركات/ESC عالية الأداء.'],
    safetyNotes: [
      'اعزل جسم المكثف وثبته جيداً حتى لا يتقطع أثناء التصادم.',
      'انتبه للقطبية؛ عكس القطبية قد يسبب فرقعة أو انفجار المكثف — هذا مكثف مستقطب (polarized) حسب مواصفة المصدر.',
    ],
    buildNotes: [
      'مع 6S عالي التيار يعطي ثقة أكبر ضد voltage spikes من 35V.',
      'مواصفة إضافية: Low ESR / 105°C / قطبية (polarized).',
    ],
  },
];
