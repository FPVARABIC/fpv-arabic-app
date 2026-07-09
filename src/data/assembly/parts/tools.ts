import type { Tool } from '../types';

// Engineering-judgment droneTypes additions (racing/cinematic/long-range on
// all 3 entries below): these are build/maintenance tools (soldering iron,
// multimeter, hex drivers), not flight hardware — the physical act of
// soldering an ESC or checking continuity is identical regardless of the
// airframe's flight purpose. A conscious engineering decision, not inferred
// from prose — none of the 3 entries' own researched text mentions any of
// these three drone types.
export const tools: Tool[] = [
  {
    id: 'tool-starter-fpv-tool-kit-budget',
    tier: 'budget',
    nameAr: 'حزمة أدوات البداية - اقتصادية',
    nameEn: 'Starter FPV Tool Kit',
    priceRangeUSD: [50, 80],
    specs: { isMandatory: true, usedForStages: ['stage-15'] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'حزمة دخول تكفي لأول build إذا كانت الكاوية حقيقية وليست ضعيفة جداً.',
    notFor: 'لا تختار kit رخيص بلا Smoke Stopper أو كاوية لا تضبط الحرارة.',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    // whyTag's Smoke Stopper clause drawn from the buildNotes contents list
    // (not whyChoose) per the broadened whyTag rule — decision-valuable
    // contrast against the premium kit, whose defining gap is missing it.
    quickTags: {
      whyTag: 'حزمة دخول كاملة لأول build — تشمل Smoke Stopper',
      noteTag: 'تأكد أن الكاوية تضبط الحرارة فعلياً قبل الشراء',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['حزمة دخول جيدة لأول تجميع كامل.'],
    safetyNotes: ['تحقق أن الكاوية تضبط الحرارة فعلياً ولا تعتمد على نوع رخيص جداً.'],
    buildNotes: [
      'الأدوات المرفقة: كاوية 60W قابلة للضبط؛ قصدير 63/37؛ فلكس؛ ملقط؛ مفكات hex 1.5/2/2.5mm؛ شرنك؛ قاطع أسلاك؛ Smoke Stopper.',
    ],
  },
  {
    id: 'tool-reliable-builder-kit-mid',
    tier: 'mid',
    nameAr: 'حزمة البناء الموثوقة - متوسطة',
    nameEn: 'Reliable Builder Kit',
    priceRangeUSD: [100, 160],
    specs: { isMandatory: true, usedForStages: ['stage-15'] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'حزمة ممتازة لمن سيبني أكثر من درون واحد ويحتاج لحام نظيف.',
    notFor: 'لا تختارها إذا ستشتري كل أداة مرة واحدة بدون معرفة استخدامها.',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'لمن سيبني أكثر من درون — لحام أنظف وأدوات أدق',
      noteTag: 'ليست لمن سيبني مرة واحدة دون خطة استمرار',
      noteTagSource: 'notFor',
    },
    beginnerNotes: ['مناسبة لمن تجاوز أول build ويريد أدوات أدق وأوثق.'],
    safetyNotes: ['تعلّم استخدام multimeter للفحص قبل كل توصيل بطارية جديد.'],
    buildNotes: [
      'الأدوات المرفقة: Pinecil/TS101 class soldering iron؛ PSU USB-C قوي؛ multimeter؛ quality hex drivers؛ helping hands؛ solder wick؛ flux pen؛ smoke stopper؛ heat shrink.',
    ],
  },
  {
    id: 'tool-workshop-fpv-kit-premium',
    tier: 'premium',
    nameAr: 'حزمة الورشة الاحترافية - احترافية',
    nameEn: 'Workshop FPV Kit',
    priceRangeUSD: [220, 400],
    specs: { isMandatory: true, usedForStages: ['stage-15'] },
    compatibilityTags: { droneTypes: ['freestyle', 'racing', 'cinematic', 'long-range'], batteryVoltages: [4, 6] },
    whyChoose: 'لمن يريد ورشة حقيقية وصيانة مستمرة لا مجرد build واحد. تنبيه هام: هذه الحزمة لا تتضمن Smoke Stopper — يجب إضافته بشكل منفصل قبل أول تشغيل.',
    notFor: 'لا تختارها كمبتدئ قبل أن تثبت أنك ستستمر في الهواية.',
    lastReviewed: '2026-07',
    confidence: 'تجربة مجتمع',
    quickTags: {
      whyTag: 'ورشة حقيقية للصيانة المستمرة لا build واحد',
      noteTag: 'لا تتضمن Smoke Stopper — أضفه منفصلاً قبل أول تشغيل',
      noteTagSource: 'safety',
    },
    beginnerNotes: ['حزمة متقدمة، ليست ضرورية لأول تجميع بسيط.'],
    safetyNotes: [
      'تحتاج لإضافة Smoke Stopper بشكل منفصل — هذه الحزمة لا تتضمنه، وأول تشغيل بدونه غير آمن.',
    ],
    buildNotes: [
      'الأدوات المرفقة: Soldering station؛ hot air optional؛ bench PSU؛ multimeter جيد؛ MIP/Wiha hex؛ crimp tools؛ conformal coating؛ threadlocker؛ spare wires/connectors؛ LiPo safety bag.',
      'ملاحظة تدقيق: النص المصدري لقائمة أدوات هذه الحزمة تحديداً لا يذكر Smoke Stopper، خلافاً للحزمتين الاقتصادية والمتوسطة اللتين تتضمنانه صراحة — هذا تناقض حقيقي مع قاعدة المشروع المقفلة بأن Smoke Stopper إلزامي في كل مستوى؛ تمت الإشارة إليه بوضوح في whyChoose وsafetyNotes بدل تجاهله.',
    ],
  },
];
