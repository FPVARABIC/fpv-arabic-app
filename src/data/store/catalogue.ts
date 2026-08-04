/**
 * The curated catalogue.
 *
 * WHAT IS AND IS NOT WRITTEN HERE
 * -------------------------------
 * Written here: which products are worth recommending, what each one is for,
 * who it suits, who it does NOT suit, and what is in the box. Those are
 * editorial judgements about product classes, and making them is the entire
 * value of a curated shop — a store that will not say «هذا ليس لك» is a store
 * that has nothing to offer beyond a supplier's stock list.
 *
 * NOT written here: prices, stock levels, and numeric specifications.
 *
 * The price comes from the pricing engine, out of a supply record only staff
 * can see. Until that record exists the product is listed, described, and
 * carries no price — which is a true statement, where a placeholder number
 * would be one a customer could act on.
 *
 * The specifications are worse, because a wrong one is invisible. «6S» on a
 * 4S-only board is a sentence that reads perfectly and destroys hardware. So
 * every spec row carries `verified`, nothing is marked verified without a
 * source, and the product page renders an unverified row as awaiting
 * confirmation rather than as a fact. This is the same rule the encyclopedia
 * has followed since the beginning — «لا تخترع Pinout أو UART أو Voltage Rail»
 * — and a shop is the last place to relax it, because here the reader pays
 * before they find out.
 *
 * IMAGES
 * ------
 * None are bundled. Product photography belongs to its manufacturer, and
 * copying it without permission is both what the brief forbade and a real
 * legal exposure. Every product therefore ships with an empty `images` array
 * and renders a typed placeholder; the admin panel attaches real images with
 * their permission recorded, which is why `ProductImage.credit` exists.
 */

import type { ChoicePosition, StoreProduct } from './types';
import type { KbLink } from '../kb/types';

const REVIEWED = '2026-08-04';

/**
 * Builds a product with the fields that are the same for everything.
 *
 * Compact on purpose: what varies between entries is the editorial judgement,
 * and burying it in twenty lines of identical scaffolding is how a catalogue
 * stops being read by the people maintaining it.
 */
function product(p: {
  id: string;
  categoryId: string;
  nameEn: string;
  titleAr: string;
  brandAr: string;
  pos: ChoicePosition;
  summaryAr: string;
  suits: string[];
  notFor: string[];
  highlights: string[];
  inBox: string[];
  collections?: string[];
  related?: string[];
  alternatives?: string[];
  completes?: string[];
  learn?: KbLink[];
}): StoreProduct {
  return {
    id: p.id,
    categoryId: p.categoryId,
    collections: p.collections ?? [],
    nameEn: p.nameEn,
    titleAr: p.titleAr,
    brandAr: p.brandAr,
    choicePosition: p.pos,
    summaryAr: p.summaryAr,
    suitsAr: p.suits,
    notForAr: p.notFor,
    highlightsAr: p.highlights,
    inTheBoxAr: p.inBox,
    // Empty by design — see the note on specifications at the top of this file.
    specs: [],
    images: [],
    priceMinor: null,
    currency: 'USD',
    compareAtMinor: null,
    availability: 'made-to-order',
    published: true,
    relatedProductIds: p.related ?? [],
    alternativeProductIds: p.alternatives ?? [],
    completesProductIds: p.completes ?? [],
    learnLinks: p.learn ?? [],
    reviewedAt: REVIEWED,
  };
}

export const STORE_CATALOGUE: StoreProduct[] = [
  /* ── Tiny Whoop ─────────────────────────────────────────────────────────── */
  product({
    id: 'betafpv-cetus-pro',
    categoryId: 'tiny-whoop',
    nameEn: 'BetaFPV Cetus Pro Kit',
    titleAr: 'طقم تدريب كامل للمبتدئ',
    brandAr: 'BetaFPV',
    pos: 'pro',
    summaryAr:
      'طقم كامل مصمَّم للتعلّم: طائرة ووب وجهاز تحكم ونظارة في صندوق واحد، بأوضاع طيران '
      + 'مساعِدة تُمسك الطائرة مكانها حتى تعتاد العصي، ثم تُطفأ تدريجياً حين تستغني عنها.',
    suits: [
      'من لم يطر إطلاقاً ويريد أن يبدأ اليوم بلا تجميع ولا لحام.',
      'من يريد التدرّب داخل البيت في الشتاء أو حين لا يسمح الطقس.',
    ],
    notFor: [
      'من يريد صورة عالية الجودة للتصوير — هذه للتعلّم لا للإنتاج.',
      'من يريد التوسّع لاحقاً: النظارة والجهاز في هذا الطقم محدودان بحدود الطقم نفسه.',
    ],
    highlights: [
      'أوضاع مساعِدة تجعل أول إقلاع ممكناً بلا مدرّب.',
      'مراوح محاطة بالكامل — لا تجرح ولا تخدش الجدران.',
      'قطع غيار متوفّرة ورخيصة، وستحتاجها.',
    ],
    inBox: ['الطائرة', 'جهاز التحكم', 'النظارة', 'بطاريات', 'شاحن', 'مراوح احتياطية'],
    alternatives: ['emax-tinyhawk-3-rtf'],
    learn: [{ kind: 'article', targetId: 'prop-damage-safety', label: 'لماذا الووب أأمن ما تتعلّم عليه' }],
  }),
  product({
    id: 'betafpv-meteor75-pro',
    categoryId: 'tiny-whoop',
    nameEn: 'BetaFPV Meteor75 Pro',
    titleAr: 'ووب تناظري للطيران الحرّ داخل البيت',
    brandAr: 'BetaFPV',
    pos: 'middle',
    summaryAr:
      'ووب مستقلّ يُربط بجهاز تحكم ونظارة تملكهما أصلاً. أخفّ وأرشق من أطقم التعلّم، '
      + 'ومناسب لمن تجاوز مرحلة الأوضاع المساعِدة.',
    suits: [
      'من يملك جهاز تحكم ونظارة ويريد طائرة داخلية فقط.',
      'من يريد التمرّن على الطيران اليدوي في مساحة ضيّقة.',
    ],
    notFor: ['من لا يملك جهاز تحكم أو نظارة — لن يطير بها كما هي.'],
    highlights: ['وزن منخفض يعني ارتطاماً بلا ضرر تقريباً', 'يعمل مع مستقبِلات شائعة'],
    inBox: ['الطائرة', 'بطارية أو أكثر', 'مراوح احتياطية'],
    completes: ['radiomaster-pocket'],
    alternatives: ['happymodel-mobula7'],
  }),
  product({
    id: 'happymodel-mobula7',
    categoryId: 'tiny-whoop',
    nameEn: 'HappyModel Mobula7',
    titleAr: 'ووب اقتصادي واسع الانتشار',
    brandAr: 'HappyModel',
    pos: 'entry',
    summaryAr:
      'من أكثر الووبات انتشاراً في الهواية، ولذلك تجد له شرحاً وقطع غيار في كل مكان — '
      + 'وهو سبب وجيه لاختياره وأنت تتعلّم.',
    suits: ['من يريد أرخص مدخل جادّ إلى الطيران الداخلي.'],
    notFor: ['من يريد أداءً عالياً — هذا مدخل لا نهاية.'],
    highlights: ['انتشار واسع يعني إجابات جاهزة لكل مشكلة', 'قطع غيار رخيصة'],
    inBox: ['الطائرة', 'بطاريات', 'مراوح احتياطية'],
    alternatives: ['betafpv-meteor75-pro'],
  }),

  /* ── 2" / 2.5" / 3" / 3.5" ──────────────────────────────────────────────── */
  product({
    id: 'betafpv-pavo-pico',
    collections: ['cinematic'],
    categoryId: 'size-2',
    nameEn: 'BetaFPV Pavo Pico',
    titleAr: 'سينيووب صغير يحمل كاميرا خارجية',
    brandAr: 'BetaFPV',
    pos: 'entry',
    summaryAr:
      'ووب مغطّى المراوح لكنه أكبر وأقوى، ومصمَّم ليحمل كاميرا تصوير صغيرة — للتصوير '
      + 'الداخلي القريب حيث لا يمكن إدخال طائرة أكبر.',
    suits: ['التصوير داخل الغرف والممرّات الضيّقة.'],
    notFor: ['الطيران في الهواء المفتوح — وزنها ومقاسها ليسا لذلك.'],
    highlights: ['مراوح محاطة تسمح بالاقتراب من الناس والأثاث', 'يحمل كاميرا تصوير خفيفة'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
  }),
  product({
    id: 'geprc-cinelog25',
    collections: ['cinematic'],
    categoryId: 'size-2-5',
    nameEn: 'GEPRC Cinelog25',
    titleAr: 'سينيووب 2.5 إنش للتصوير الناعم',
    brandAr: 'GEPRC',
    pos: 'middle',
    summaryAr:
      'مقاس 2.5 إنش بمراوح محاطة، مبني للّقطات القريبة الناعمة بدل السرعة. يتحمّل الهواء '
      + 'الخفيف بخلاف الووب الأصغر.',
    suits: ['التصوير الداخلي والخارجي القريب.'],
    notFor: ['الفريستايل الحادّ — الحماية حول المراوح تكلّف كفاءة.'],
    highlights: ['ثبات مناسب للتصوير', 'يعمل داخل وخارج البيت'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
  }),
  product({
    id: 'iflight-nazgul-evoque-f3',
    collections: ['freestyle'],
    categoryId: 'size-3',
    nameEn: 'iFlight Nazgul Evoque F3',
    titleAr: 'ثلاث إنشات للفريستايل في مساحة صغيرة',
    brandAr: 'iFlight',
    pos: 'middle',
    summaryAr:
      'يعطي إحساس الفريستايل الحقيقي في حديقة أو ساحة صغيرة، من دون مساحة الخمسة إنشات '
      + 'ولا ضجيجها.',
    suits: ['من يريد فريستايل ولا يملك مساحة واسعة.'],
    notFor: ['المدى الطويل أو الحمولة الثقيلة.'],
    highlights: ['حجم يسمح بالطيران قرب البيت', 'متانة مناسبة للتعلّم على المناورات'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    completes: ['cnhl-black-series-4s'],
  }),
  product({
    id: 'geprc-cinelog35',
    collections: ['cinematic'],
    categoryId: 'size-3-5',
    nameEn: 'GEPRC Cinelog35',
    titleAr: 'ثلاثة ونصف للتصوير مع زمن أطول',
    brandAr: 'GEPRC',
    pos: 'pro',
    summaryAr:
      'يحمل بطارية أكبر من مقاس الثلاثة فيطير أطول، ويبقى صغيراً بما يكفي للتصوير القريب.',
    suits: ['التصوير الذي يحتاج زمن طيران أطول من الووب.'],
    notFor: ['من يريد أخفّ وأصغر ما يمكن.'],
    highlights: ['زمن طيران أطول من المقاسات الأصغر', 'مناسب للتصوير المتحرّك'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
  }),

  /* ── 5" ─────────────────────────────────────────────────────────────────── */
  product({
    id: 'iflight-nazgul5-v3',
    collections: ['freestyle'],
    categoryId: 'size-5',
    nameEn: 'iFlight Nazgul5 V3',
    titleAr: 'خمس إنشات جاهزة للفريستايل',
    brandAr: 'iFlight',
    pos: 'middle',
    summaryAr:
      'من أكثر طائرات الخمسة إنشات الجاهزة انتشاراً: مبنية للفريستايل، ومتينة بما يكفي '
      + 'لتحمّل مرحلة التعلّم على المناورات الحادّة.',
    suits: [
      'من تجاوز المقاسات الصغيرة ويريد المقاس القياسي.',
      'من يريد طائرة جاهزة بدل تجميع أول بناء.',
    ],
    notFor: ['الطيران في المساحات الضيّقة أو داخل البيت.'],
    highlights: [
      'المقاس الذي تجد له أوسع قطع غيار وشرح',
      'متانة تتحمّل ارتطامات التعلّم',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    completes: ['cnhl-black-series-6s', 'radiomaster-boxer'],
    alternatives: ['geprc-mark5'],
    learn: [{ kind: 'article', targetId: 'motor-selection', label: 'ما الذي يجعل محرّكاً مناسباً لهذا المقاس' }],
  }),
  product({
    id: 'geprc-mark5',
    collections: ['freestyle'],
    categoryId: 'size-5',
    nameEn: 'GEPRC MARK5',
    titleAr: 'خمس إنشات بهيكل يسهل إصلاحه',
    brandAr: 'GEPRC',
    pos: 'pro',
    summaryAr:
      'هيكل فريستايل معروف بسهولة استبدال أذرعه، وهو ما يهم فعلاً بعد أول ارتطام جادّ.',
    suits: ['من يطير بقوة ويتوقّع إصلاحات متكرّرة.'],
    notFor: ['من يريد أرخص مدخل إلى المقاس.'],
    highlights: ['أذرع قابلة للاستبدال وحدها', 'تخطيط داخلي يسهل الوصول إليه'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['iflight-nazgul5-v3'],
  }),
  product({
    id: 'tbs-source-one-v5',
    categoryId: 'size-5',
    nameEn: 'TBS Source One V5',
    titleAr: 'هيكل خمس إنشات مفتوح ورخيص',
    brandAr: 'TBS',
    pos: 'entry',
    summaryAr:
      'هيكل فقط، لا طائرة كاملة. تصميم مفتوح المصدر ورخيص، وهو المدخل التقليدي لأول بناء '
      + 'يجمّعه صاحبه بيده.',
    suits: ['من يريد أن يبني بنفسه ويتعلّم من الصفر.'],
    notFor: ['من يريد الطيران اليوم — هذا بداية بناء لا نهايته.'],
    highlights: ['أرخص مدخل جادّ إلى البناء', 'قطع الغيار متوفّرة في كل مكان'],
    inBox: ['ألواح الهيكل', 'براغي ودعامات'],
    learn: [{ kind: 'assembly', targetId: '', label: 'افتح تدفّق البناء خطوة بخطوة' }],
  }),

  /* ── 7" / Long range ────────────────────────────────────────────────────── */
  product({
    id: 'iflight-chimera7-pro',
    collections: ['long-range'],
    categoryId: 'size-7',
    nameEn: 'iFlight Chimera7 Pro',
    titleAr: 'سبع إنشات للمدى الطويل',
    brandAr: 'iFlight',
    pos: 'pro',
    summaryAr:
      'مبنية للكفاءة لا للسرعة: مراوح أكبر وبطارية أكبر تعني زمناً أطول ومدى أبعد — '
      + 'وطاقة مخزَّنة أكبر بكثير، وهو ما يجعل السلامة هنا مسألة مختلفة.',
    suits: ['من يريد رحلات طويلة فوق مساحات مفتوحة.'],
    notFor: [
      'المبتدئ. هذا المقاس يخطئ بعنف.',
      'المساحات المأهولة أو القريبة من الناس.',
    ],
    highlights: ['زمن طيران أطول بكثير من الخمسة', 'كفاءة تسمح بالابتعاد'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'سلامة البطاريات الكبيرة — اقرأ أولاً' }],
  }),

  /* ── RTF ────────────────────────────────────────────────────────────────── */
  product({
    id: 'emax-tinyhawk-3-rtf',
    categoryId: 'rtf',
    nameEn: 'EMAX Tinyhawk III RTF',
    titleAr: 'طقم جاهز بديل',
    brandAr: 'EMAX',
    pos: 'middle',
    summaryAr:
      'طقم كامل آخر في فئة التعلّم: طائرة وجهاز ونظارة. اختيار بينه وبين البدائل مسألة '
      + 'تفضيل أكثر منها مسألة أفضلية واضحة.',
    suits: ['من يريد صندوقاً واحداً يبدأ به.'],
    notFor: ['من يملك جهاز تحكم ونظارة أصلاً — سيدفع ثمنهما مرتين.'],
    highlights: ['كل شيء في صندوق واحد', 'مناسب للتعلّم الداخلي'],
    inBox: ['الطائرة', 'جهاز التحكم', 'النظارة', 'بطاريات', 'شاحن'],
    alternatives: ['betafpv-cetus-pro'],
  }),

  /* ── Radios ─────────────────────────────────────────────────────────────── */
  product({
    id: 'radiomaster-pocket',
    categoryId: 'radios',
    nameEn: 'RadioMaster Pocket',
    titleAr: 'جهاز تحكم اقتصادي كامل الوظائف',
    brandAr: 'RadioMaster',
    pos: 'entry',
    summaryAr:
      'أرخص مدخل جادّ: يشغّل EdgeTX نفسه الذي تشغّله الأجهزة الأغلى، فما تتعلّمه عليه '
      + 'ينتقل معك إلى أي جهاز بعده.',
    suits: ['أول جهاز تحكم', 'جهاز احتياطي أو للسفر'],
    notFor: ['من يريد أفضل إحساس عصي متاح — هنا يظهر فرق السعر.'],
    highlights: ['EdgeTX كامل بلا اختصار', 'حجم يسهل حمله'],
    inBox: ['الجهاز', 'كابل شحن'],
    alternatives: ['radiomaster-boxer'],
    learn: [{ kind: 'edgetx', targetId: '', label: 'مركز EdgeTX' }],
  }),
  product({
    id: 'radiomaster-boxer',
    categoryId: 'radios',
    nameEn: 'RadioMaster Boxer',
    titleAr: 'جهاز التحكم المتوسط الموصى به',
    brandAr: 'RadioMaster',
    pos: 'middle',
    summaryAr:
      'الخيار الذي يوصى به لأغلب الناس: إحساس عصي جيّد وبناء متين، بلا سعر الأجهزة '
      + 'الاحترافية ولا تنازلات الأجهزة الاقتصادية.',
    suits: ['من يريد شراء جهاز واحد يبقى معه سنوات.'],
    notFor: ['من يريد أصغر جهاز ممكن للسفر.'],
    highlights: ['إحساس عصي أفضل بوضوح من الفئة الاقتصادية', 'يشغّل EdgeTX'],
    inBox: ['الجهاز', 'كابل شحن'],
    alternatives: ['radiomaster-tx16s-mk2', 'radiomaster-pocket'],
  }),
  product({
    id: 'radiomaster-tx16s-mk2',
    categoryId: 'radios',
    nameEn: 'RadioMaster TX16S MKII',
    titleAr: 'جهاز التحكم الاحترافي',
    brandAr: 'RadioMaster',
    pos: 'pro',
    summaryAr:
      'جهاز كبير بشاشة كبيرة وعصي قابلة للترقية والتبديل. الخيار الذي لا تحتاج بعده إلى '
      + 'جهاز آخر.',
    suits: ['من يطير كثيراً ويدير نماذج متعدّدة.'],
    notFor: ['من يطير أحياناً — ستدفع مقابل ما لن تستعمله.'],
    highlights: ['شاشة كبيرة تسهّل الضبط', 'قابل للترقية بدل الاستبدال'],
    inBox: ['الجهاز', 'كابل شحن'],
    alternatives: ['radiomaster-boxer'],
  }),

  /* ── Goggles ────────────────────────────────────────────────────────────── */
  product({
    id: 'dji-goggles-n3',
    categoryId: 'goggles',
    nameEn: 'DJI Goggles N3',
    titleAr: 'نظارة رقمية من منظومة DJI',
    brandAr: 'DJI',
    pos: 'middle',
    summaryAr:
      'صورة رقمية نظيفة داخل منظومة مغلقة: تعمل مع وحدات DJI وحدها. الاختيار هنا يقيّد '
      + 'وحدة الفيديو على كل طائرة تبنيها بعده.',
    suits: ['من يريد أوضح صورة بأقل ضبط.'],
    notFor: [
      'من يريد التنقّل بين منظومات — هذه مغلقة.',
      'من يملك طائرات تناظرية ولا يريد استبدال وحداتها.',
    ],
    highlights: ['صورة رقمية بلا تشويش تناظري', 'إعداد بسيط نسبياً'],
    inBox: ['النظارة', 'كابلات', 'حقيبة'],
    completes: ['dji-o3-air-unit'],
    alternatives: ['walksnail-avatar-hd-x', 'hdzero-goggles'],
    learn: [{ kind: 'article', targetId: 'video-analog-vs-digital', label: 'تناظري أم رقمي' }],
  }),
  product({
    id: 'walksnail-avatar-hd-x',
    categoryId: 'goggles',
    nameEn: 'Walksnail Avatar HD Goggles X',
    titleAr: 'نظارة رقمية من منظومة Walksnail',
    brandAr: 'Walksnail',
    pos: 'middle',
    summaryAr: 'منظومة رقمية بديلة بوحدات أصغر وأخف من منافستها، ضمن منظومتها المغلقة أيضاً.',
    suits: ['من يريد وحدات طائرة أصغر وأخف.'],
    notFor: ['من يريد الخلط بين المنظومات.'],
    highlights: ['وحدات طائرة صغيرة', 'صورة رقمية'],
    inBox: ['النظارة', 'كابلات'],
    alternatives: ['dji-goggles-n3', 'hdzero-goggles'],
  }),
  product({
    id: 'hdzero-goggles',
    categoryId: 'goggles',
    nameEn: 'HDZero Goggles',
    titleAr: 'نظارة رقمية بزمن استجابة منخفض',
    brandAr: 'HDZero',
    pos: 'pro',
    summaryAr:
      'منظومة رقمية موجّهة لمن يهمّه تأخير الصورة قبل دقّتها — وهو ما يهمّ في السباق تحديداً.',
    suits: ['السباق ومن يشعر بتأخير الصورة.'],
    notFor: ['من يريد أعلى دقّة صورة ممكنة.'],
    highlights: ['تأخير منخفض', 'يقبل مستقبِلات تناظرية إضافية في بعض التركيبات'],
    inBox: ['النظارة', 'كابلات'],
    alternatives: ['dji-goggles-n3'],
  }),

  /* ── Batteries / chargers ───────────────────────────────────────────────── */
  product({
    id: 'cnhl-black-series-6s',
    categoryId: 'batteries',
    nameEn: 'CNHL Black Series 6S',
    titleAr: 'بطارية 6S لمقاس الخمس إنشات',
    brandAr: 'CNHL',
    pos: 'middle',
    summaryAr:
      'من أكثر البطاريات استعمالاً في مقاس الخمسة. الجهد والسعة والتيار يجب أن تطابق ما '
      + 'بنيته — لا ما توفّر.',
    suits: ['طائرات خمس إنشات تعمل على 6S.'],
    notFor: ['أي بناء لم تتأكّد أنه يقبل 6S — الجهد الخاطئ يُتلف فوراً.'],
    highlights: ['انتشار واسع', 'موصّل شائع يسهل إيجاد ما يطابقه'],
    inBox: ['البطارية'],
    completes: ['isdt-q6-charger'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'الشحن والتخزين والتلف' }],
  }),
  product({
    id: 'cnhl-black-series-4s',
    categoryId: 'batteries',
    nameEn: 'CNHL Black Series 4S',
    titleAr: 'بطارية 4S للمقاسات الصغيرة',
    brandAr: 'CNHL',
    pos: 'entry',
    summaryAr:
      'الجهد الشائع لمقاسات الثلاثة والثلاثة ونصف. تأكّد أن بناءك يقبل 4S قبل الشراء — '
      + 'الجهد الخاطئ لا يُصلَح لاحقاً، ويُتلف ما يوصَل به من أول مرة.',
    suits: ['طائرات 3 و3.5 إنش تعمل على 4S.'],
    notFor: ['أي بناء مصمَّم لجهد آخر.'],
    highlights: ['مناسبة للمقاسات الصغيرة'],
    inBox: ['البطارية'],
    completes: ['isdt-q6-charger'],
  }),
  product({
    id: 'isdt-q6-charger',
    categoryId: 'chargers',
    nameEn: 'ISDT Q6 Nano',
    titleAr: 'شاحن متوازن صغير وموثوق',
    brandAr: 'ISDT',
    pos: 'middle',
    summaryAr:
      'شاحن موازنة صغير يقرأ حالة كل خلية على حدة. الشاحن الرديء يُتلف بطاريات جيدة، '
      + 'وأحياناً يحرق ما حوله — هذه ليست القطعة التي توفّر فيها.',
    suits: ['كل من يملك بطارية LiPo واحدة أو أكثر.'],
    notFor: ['من يشحن عدّة بطاريات دفعة واحدة — سيحتاج أكبر.'],
    highlights: ['موازنة لكل خلية', 'حجم يسهل حمله'],
    inBox: ['الشاحن'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'كيف يُشحن الليبو بأمان' }],
  }),

  /* ── Receivers / antennas ───────────────────────────────────────────────── */
  product({
    id: 'radiomaster-rp1',
    categoryId: 'receivers',
    nameEn: 'RadioMaster RP1',
    titleAr: 'مستقبل ExpressLRS صغير',
    brandAr: 'RadioMaster',
    pos: 'entry',
    summaryAr:
      'مستقبل صغير لنظام ExpressLRS. يجب أن يطابق نظام جهازك ونطاقه — طرفان من نطاقين '
      + 'مختلفين لا يربطان إطلاقاً.',
    suits: ['البناءات الصغيرة التي تعمل بـExpressLRS.'],
    notFor: ['من يستخدم نظام تحكم آخر.'],
    highlights: ['حجم صغير', 'نظام واسع الانتشار'],
    inBox: ['المستقبل', 'هوائي'],
    learn: [{ kind: 'elrs-setup', targetId: '', label: 'إعداد ExpressLRS خطوة بخطوة' }],
  }),
  product({
    id: 'truerc-x-air',
    categoryId: 'antennas',
    nameEn: 'TrueRC X-Air',
    titleAr: 'هوائي فيديو دائري الاستقطاب',
    brandAr: 'TrueRC',
    pos: 'middle',
    summaryAr:
      'أرخص ترقية تُحسّن الصورة والمدى فعلاً. الاستقطاب والموصّل يجب أن يطابقا ما لديك.',
    suits: ['كل بناء تناظري أو رقمي يستخدم هوائياً خارجياً.'],
    notFor: ['من لم يتأكّد من نوع الموصّل على وحدته.'],
    highlights: ['تحسين ملموس مقابل سعر منخفض', 'متانة جيدة'],
    inBox: ['الهوائي'],
  }),
  /* ── Motors / FC / ESC / frames ─────────────────────────────────────────── */
  product({
    id: 'emax-eco-ii-2306',
    categoryId: 'motors',
    nameEn: 'EMAX ECO II 2306',
    titleAr: 'محرّك خمس إنشات اقتصادي',
    brandAr: 'EMAX',
    pos: 'entry',
    summaryAr:
      'محرّك شائع في بناءات الخمسة إنشات الاقتصادية. المقاس والـKV يجب أن يطابقا مقاس '
      + 'مروحتك وجهد بطاريتك — لا تشترِ رقماً لأنه أكبر.',
    suits: ['أول بناء خمس إنشات بميزانية محدودة.'],
    notFor: ['البناءات التي تحتاج أعلى أداء أو أخفّ وزن.'],
    highlights: ['سعر منخفض مقابل أداء معقول', 'قطع غيار متوفّرة'],
    inBox: ['محرّك واحد', 'براغي تثبيت'],
    learn: [{ kind: 'article', targetId: 'motor-kv', label: 'ما معنى KV' }],
  }),
  product({
    id: 'tmotor-f60-pro-v',
    categoryId: 'motors',
    nameEn: 'T-Motor F60 Pro V',
    titleAr: 'محرّك خمس إنشات احترافي',
    brandAr: 'T-Motor',
    pos: 'pro',
    summaryAr: 'خط محرّكات معروف بالاتّساق بين الوحدة والأخرى، وهو ما يظهر في الاهتزاز والضبط.',
    suits: ['من يبني للأداء ويريد اتّساقاً بين المحرّكات الأربعة.'],
    notFor: ['أول بناء — الفرق لن يُلاحَظ قبل أن تتقن الطيران.'],
    highlights: ['اتّساق عالٍ بين الوحدات', 'متانة معروفة'],
    inBox: ['محرّك واحد', 'براغي تثبيت'],
    alternatives: ['emax-eco-ii-2306'],
  }),
  product({
    id: 'speedybee-f405-v4-stack',
    categoryId: 'flight-controllers',
    nameEn: 'SpeedyBee F405 V4 Stack',
    titleAr: 'طقم متحكّم وESC للخمس إنشات',
    brandAr: 'SpeedyBee',
    pos: 'middle',
    summaryAr:
      'متحكّم طيران وESC معاً بمقاس تثبيت قياسي. الطقم يوفّر عناء التأكّد من توافق '
      + 'اللوحتين، وهو أكثر ما يخطئ فيه المبتدئ.',
    suits: ['أول بناء خمس إنشات', 'استبدال لوحة تالفة بطقم متوافق'],
    notFor: ['البناءات الصغيرة جداً — المقاس لا يناسبها.'],
    highlights: ['اللوحتان متوافقتان مسبقاً', 'ضبط عبر التطبيق إضافة إلى الكابل'],
    inBox: ['متحكّم الطيران', 'وحدة ESC', 'كابلات', 'دعامات مطاطية'],
    learn: [{ kind: 'betaflight', targetId: 'ports', label: 'صفحة المنافذ — أول ما ستضبطه' }],
  }),
  product({
    id: 'speedybee-bls-50a',
    categoryId: 'escs',
    nameEn: 'SpeedyBee BLS 50A',
    titleAr: 'وحدة ESC أربعة في واحد',
    brandAr: 'SpeedyBee',
    pos: 'middle',
    summaryAr:
      'أربع قنوات على لوحة واحدة. الرقم الذي يهمّ هو التيار المستمر لا الذروة — والذروة '
      + 'هي ما يُكتب على الصندوق عادةً.',
    suits: ['بناء خمس إنشات على 6S.'],
    notFor: ['من لم يحسب سحب محرّكاته بعد.'],
    highlights: ['لوحة واحدة بدل أربع', 'مقاس تثبيت قياسي'],
    inBox: ['وحدة ESC', 'مكثّف', 'كابلات'],
    learn: [{ kind: 'article', targetId: 'esc-ratings', label: 'كيف تُقرأ تقييمات التيار' }],
  }),
  product({
    id: 'armattan-marmotte',
    categoryId: 'frames',
    nameEn: 'Armattan Marmotte',
    titleAr: 'هيكل خمس إنشات بضمان مدى الحياة',
    brandAr: 'Armattan',
    pos: 'pro',
    summaryAr:
      'هيكل معروف بضمان يغطّي كسر الكربون. في هواية يُكسر فيها الهيكل فعلاً، هذا فرق '
      + 'حقيقي لا وعد تسويقي.',
    suits: ['من يطير بقوة ويكسر أذرعاً بانتظام.'],
    notFor: ['من يريد أرخص هيكل ممكن.'],
    highlights: ['ضمان يغطّي الكسر', 'كربون سميك'],
    inBox: ['ألواح الهيكل', 'براغي ودعامات'],
    alternatives: ['tbs-source-one-v5'],
  }),

  /* ── Cameras / VTX / air units / GPS / accessories ──────────────────────── */
  product({
    id: 'caddx-ratel-2',
    categoryId: 'cameras',
    nameEn: 'Caddx Ratel 2',
    titleAr: 'كاميرا تناظرية قوية في الضوء المنخفض',
    brandAr: 'Caddx',
    pos: 'middle',
    summaryAr:
      'من أشهر الكاميرات التناظرية، ومعروفة بأدائها حين يقلّ الضوء — وهو ما يهمّ أكثر '
      + 'من الدقّة في الطيران الحقيقي.',
    suits: ['البناءات التناظرية', 'الطيران قرب الغروب أو تحت الأشجار'],
    notFor: ['المنظومات الرقمية — تلك تأتي بكاميرتها.'],
    highlights: ['أداء جيّد في الضوء المتغيّر', 'انتشار واسع'],
    inBox: ['الكاميرا', 'كابل', 'براغي'],
  }),
  product({
    id: 'rush-tank-ultimate',
    categoryId: 'vtx',
    nameEn: 'Rush Tank Ultimate',
    titleAr: 'وحدة بثّ تناظرية موثوقة',
    brandAr: 'Rush',
    pos: 'middle',
    summaryAr:
      'وحدة بثّ تناظرية معروفة بحرارتها المنضبطة. لا تُشغَّل أبداً بلا هوائي مركّب — '
      + 'البثّ بلا هوائي يُتلف الوحدة، أحياناً من أول ثانية.',
    suits: ['البناءات التناظرية التي تحتاج مدى موثوقاً.'],
    notFor: ['المنظومات الرقمية.'],
    highlights: ['تحكّم بالقدرة من متحكّم الطيران', 'تبريد معقول'],
    inBox: ['الوحدة', 'كابلات', 'هوائي'],
    completes: ['truerc-x-air'],
    learn: [{ kind: 'betaflight', targetId: 'vtx', label: 'صفحة VTX في Betaflight' }],
  }),
  product({
    id: 'dji-o3-air-unit',
    categoryId: 'air-units',
    nameEn: 'DJI O3 Air Unit',
    titleAr: 'وحدة طائرة رقمية من DJI',
    brandAr: 'DJI',
    pos: 'pro',
    summaryAr:
      'كاميرا وبثّ في وحدة واحدة، وتسجيل داخلي. تعمل مع نظارات DJI وحدها — اختيارها '
      + 'يتبع نظارتك لا العكس.',
    suits: ['من يملك نظارة DJI ويبني طائرة جديدة.'],
    notFor: ['من يملك نظارة من منظومة أخرى — لن تعمل معها.'],
    highlights: ['تسجيل داخلي بجودة أعلى من البثّ', 'صورة رقمية نظيفة'],
    inBox: ['الوحدة', 'الكاميرا', 'كابلات', 'هوائيات'],
    completes: ['dji-goggles-n3'],
  }),
  product({
    id: 'matek-m10-gps',
    categoryId: 'gps',
    nameEn: 'Matek M10 GPS',
    titleAr: 'وحدة GPS صغيرة للمدى الطويل',
    brandAr: 'Matek',
    pos: 'middle',
    summaryAr:
      'تعرف أين هي الطائرة، فتفيد في تسجيل آخر موقع والبحث عنها. لا يجعل هذا أي وضع '
      + 'عودة تلقائية ضماناً.',
    suits: ['بناءات المدى الطويل', 'من يريد تسجيل آخر موقع معروف'],
    notFor: ['من يظنّ أن GPS يعني استرجاعاً مضموناً — ليس كذلك.'],
    highlights: ['حجم صغير', 'شائع الاستخدام مع Betaflight'],
    inBox: ['الوحدة', 'كابل'],
    learn: [{ kind: 'betaflight', targetId: 'gps', label: 'صفحة GPS في Betaflight' }],
  }),
  product({
    id: 'lipo-safe-bag',
    categoryId: 'accessories',
    nameEn: 'LiPo Safe Bag',
    titleAr: 'حقيبة شحن وتخزين مقاوِمة للحريق',
    brandAr: 'عام',
    pos: 'entry',
    summaryAr:
      'أرخص قطعة في المتجر وأكثرها أهمية. بطارية ليبو تالفة يمكن أن تشتعل أثناء الشحن '
      + 'أو التخزين، والحقيبة تحصر ذلك بدل أن يمتدّ.',
    suits: ['كل من يملك بطارية ليبو واحدة.'],
    notFor: ['لا أحد. إن كنت تملك ليبو فأنت تحتاجها.'],
    highlights: ['تحصر الحريق بدل أن يمتدّ', 'رخيصة مقابل ما تحميه'],
    inBox: ['الحقيبة'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'التخزين والشحن الآمن' }],
  }),
];


const productById = new Map(STORE_CATALOGUE.map(p => [p.id, p]));

export function storeProduct(id: string): StoreProduct | undefined {
  return productById.get(id);
}

/**
 * Everything shown in a section — the products that live in it, plus the ones
 * that belong to it as a use case.
 *
 * Ordered along the section's own axis, so the three read as a choice rather
 * than as a list: economy, then middle, then professional.
 */
export function productsInCategory(categoryId: string): StoreProduct[] {
  const order: Record<string, number> = { entry: 0, middle: 1, pro: 2, variant: 3 };
  return STORE_CATALOGUE
    .filter(p => p.published && (p.categoryId === categoryId || p.collections.includes(categoryId)))
    .sort((a, b) => order[a.choicePosition] - order[b.choicePosition]);
}

export function categoryProductCount(categoryId: string): number {
  return productsInCategory(categoryId).length;
}
