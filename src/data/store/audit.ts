/**
 * Every product in the catalogue, judged before anything is published.
 *
 * WHY THIS IS A FILE AND NOT A DELETION
 * -------------------------------------
 * The instruction was explicit and it is the right one: record the decision
 * before touching the code. A product quietly removed leaves no answer to «why
 * isn't the Mobula8 in here any more», and six months later somebody adds it
 * back and rediscovers the same problem. A decision written down is a decision
 * that only has to be made once.
 *
 * WHAT «APPROVE» DOES AND DOES NOT MEAN
 * -------------------------------------
 * It means the product is real, current, documentable and appropriate to its
 * section — a thing worth selling. It does NOT mean it is publishable: that is
 * decided by `publicationGate`, against licensed images, sourced specifications
 * and a current cost. Approving something is the beginning of the work, not the
 * end of it. Nothing in this file publishes anything.
 *
 * HOW THE JUDGEMENTS WERE MADE
 * ----------------------------
 * `sources: 'official'` means a manufacturer page for this exact model was
 * located and read during this review, and the figures taken from it are in
 * `launch.ts` with their URLs. `sources: 'reseller'` means only retail listings
 * were found — enough to know the product exists and sells, not enough to state
 * a specification. `sources: 'none'` means neither, and that is a product this
 * shop cannot honestly describe.
 *
 * `imagesLicensable` is the honest answer to a legal question, and it is
 * `unknown` almost everywhere. FPV manufacturers publish photographs and almost
 * none publish a licence to use them. Establishing that permission is a human
 * task — an email, a reseller agreement, a media-kit page — and the shop cannot
 * publish a product until somebody has done it. See the note on
 * `ImageLicenceBasis`.
 */

export type AuditKind =
  /** A real, named product that exists and can be documented. */
  | 'real-product'
  /** A slot standing in for a decision nobody has made — «a battery strap». */
  | 'category-placeholder'
  /** Real, but superseded or thinning out in the supply chain. */
  | 'aging'
  /** Real and good, and a bad fit for shipping one at a time from a supplier. */
  | 'not-dropshippable'
  /** Ours. No manufacturer, no photograph to license, no supplier to pay. */
  | 'service'
  /** Several products sold together as one line. */
  | 'bundle'
  /** Real, and listed under the previous generation's name. */
  | 'needs-rename'
  /** The same thing as another entry, under a second id. */
  | 'duplicate'
  /** Real, and in the wrong section. */
  | 'wrong-category'
  /** Real, and sold in versions this catalogue currently flattens into one. */
  | 'needs-variants';

export const AUDIT_KIND_LABEL_AR: Record<AuditKind, string> = {
  'real-product': 'منتج حقيقي موثَّق',
  'category-placeholder': 'قالب يحتاج اختيار منتج',
  aging: 'قديم أو ضعيف التوفّر',
  'not-dropshippable': 'لا يصلح للشحن المباشر',
  service: 'خدمة',
  bundle: 'حزمة مركّبة',
  'needs-rename': 'يحتاج إعادة تسمية',
  duplicate: 'مكرَّر',
  'wrong-category': 'في فئة خاطئة',
  'needs-variants': 'يحتاج تقسيماً إلى خيارات',
};

export type AuditDecision =
  /** Keep it. Worth selling once it clears the publication gate. */
  | 'approve'
  /** Keep the slot, change the product in it. */
  | 'replace'
  /** Keep it listed, do not work on it this round. */
  | 'defer'
  /** Take it out of the shop. Never deleted — orders reference ids. */
  | 'unpublish';

export const AUDIT_DECISION_LABEL_AR: Record<AuditDecision, string> = {
  approve: 'اعتماد',
  replace: 'استبدال',
  defer: 'تأجيل',
  unpublish: 'حجب عن النشر',
};

/** How well the product can be sourced from documents we may quote. */
export type SourceQuality =
  /** A manufacturer page for this exact model was read during this review. */
  | 'official'
  /** Retail listings only: it exists and sells, but no figure may be quoted. */
  | 'reseller'
  /** Neither. This shop cannot describe it honestly. */
  | 'none';

export const SOURCE_QUALITY_LABEL_AR: Record<SourceQuality, string> = {
  official: 'وثائق الشركة',
  reseller: 'قوائم الموردين فقط',
  none: 'لا مصدر',
};

/** How hard it is to actually get one to a customer. */
export type SupplyEase = 'easy' | 'moderate' | 'hard';

export const SUPPLY_EASE_LABEL_AR: Record<SupplyEase, string> = {
  easy: 'سهل — موردون متعدّدون',
  moderate: 'متوسط',
  hard: 'صعب — مورد واحد أو شحن معقّد',
};

/** Whether we may legally publish a photograph of it. Usually unknown. */
export type ImageLicence = 'available' | 'unknown' | 'blocked';

export const IMAGE_LICENCE_LABEL_AR: Record<ImageLicence, string> = {
  available: 'متاحة بإذن موثّق',
  unknown: 'تحتاج تأكيد الحقوق',
  blocked: 'لا يمكن الحصول عليها',
};

export interface AuditRow {
  productId: string;
  kind: AuditKind;
  sources: SourceQuality;
  supply: SupplyEase;
  imagesLicensable: ImageLicence;
  /** Whether it genuinely belongs in the section it sits in. */
  fitsCategory: boolean;
  decision: AuditDecision;
  /** Why. One sentence, so the decision survives whoever made it. */
  noteAr: string;
  /** In the first launch group — the set worked to completion this round. */
  launchSet?: boolean;
}

/**
 * The audit, in catalogue order.
 *
 * Section, brand and name are deliberately NOT repeated here — they are on the
 * product, and a second copy is a second thing to keep in step. `testStore`
 * asserts that every id below names a real product and that every product has a
 * row, so the two cannot drift apart.
 */
export const CATALOGUE_AUDIT: AuditRow[] = [
  // ── Tiny whoop: the strongest section, and the launch set's core ──────────
  {
    productId: 'betafpv-cetus-pro', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'الطقم الأشهر للمبتدئ، ووثائقه الرسمية كاملة. حجر الأساس لقسم الووب.',
  },
  {
    productId: 'betafpv-meteor75-pro', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'الخطوة بعد الطقم: طائرة وحدها بمواصفات موثّقة ونسخ متعدّدة حقيقية.',
  },
  {
    productId: 'happymodel-mobula7', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'المنافس المباشر لـMeteor75 بسعر أقل. وجوده يجعل القسم اختياراً لا توصية.',
  },

  // ── 2 inch ────────────────────────────────────────────────────────────────
  {
    productId: 'betafpv-pavo-pico', kind: 'aging', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته الرسمية. صُحّح وصفه: كان مكتوباً أنه «يحمل كاميرا تصوير صغيرة» '
      + 'وهو في الحقيقة سينيووب يُباع بلا نظام فيديو ويُبنى حول وحدة رقمية تشتريها '
      + 'معه — ووزنه يتغيّر بتغيّرها. تنبيه: BetaFPV تعرض الآن Pavo Pico II بدعم '
      + 'وحدات DJI O4، وهو المرشّح لاستبداله عند الجولة القادمة.',
  },
  {
    productId: 'betafpv-cetus-x', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته الرسمية وسُجّلت مواصفاته الثمان. يُباع بنسختَي بروتوكول '
      + '(ExpressLRS وFrSky D8) وبنسخة HD — والبروتوكول ليس تفضيلاً: جهاز نسخة '
      + 'ExpressLRS لا يبِنّ مستقبِل FrSky. أُضيفت النسخ الثلاث كخيارات شراء.',
  },
  {
    productId: 'happymodel-mobula8', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'رُفع التأجيل. Happymodel تنشر صفحة لكل نسخة، وقد قُرئت: 85 مم، 43 '
      + 'غراماً، محرّكات EX1103 بسرعة 11000. أُضيفت أربع نسخ شراء لأن '
      + 'المستقبِل هنا قرار شراء لا إعداد — لوحة FlySky المدمجة لن تربط جهاز '
      + 'ExpressLRS أبداً.',
  },

  // ── 2.5 inch ──────────────────────────────────────────────────────────────
  {
    productId: 'geprc-cinelog25', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته الرسمية: الطراز المعروض حالياً «Cinelog25 V2» لا «Cinelog25»، '
      + 'ويُباع بثلاث نسخ فيديو مختلفة (تماثلي · O3 · Wasp) بأسعار ومكوّنات مختلفة. '
      + 'أُضيفت النسخ الثلاث كخيارات شراء، وسُجّلت مواصفاته الموثّقة. الاسم يحتاج '
      + 'تصحيحاً إلى V2 وهو تعديل كتالوج.',
  },
  {
    productId: 'betafpv-pavo25', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم كان جيلاً كاملاً وراء الواقع: BetaFPV تبيع Pavo25 V2 بمحرّكات '
      + 'LAVA 1506 ومتحكّم F722. وصُحّح ما هو أهمّ: يُباع بلا نظام فيديو، '
      + 'وهذا لم يكن مكتوباً.',
  },
  {
    productId: 'geprc-cinebot25', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الجيل الحالي Cinebot25 V2 بوحدة DJI O4 Air Unit Pro ووزن 219 غراماً. '
      + 'صُحّح الاسم وأُضيفت نسختا الفيديو، وسُجّلت مواصفاته من صفحة الشركة.',
  },

  // ── 3 inch ────────────────────────────────────────────────────────────────
  {
    productId: 'geprc-smart35', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'حلّ محلّ «iFlight Nazgul Evoque F3». ذلك المنتج لا وجود له: عائلة Evoque '
      + 'عند iFlight هي 4 و5 و6 إنشات، وثلاث عمليات بحث مستقلّة في متجرها لم تجد '
      + 'أي Evoque بمقاس ثلاث إنشات. اسم لا يبيعه أحد لا يُصحَّح بل يُسحب. '
      + 'SMART35 منتج حقيقي قُرئت صفحته، ويجيب السؤال نفسه: أصغر آلة فريستايل '
      + 'يمكن أن تُطار قرب البيت، وتحت حدّ 250 غراماً.',
  },
  {
    productId: 'geprc-cinelog30', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'كان جيلين وراء الواقع: GEPRC تبيع Cinelog30 V3. نقل مواصفات V3 تحت '
      + 'الاسم القديم كان سيكون الخطأ الذي وُجدت هذه المراجعة لالتقاطه.',
  },
  {
    productId: 'geprc-domain36', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'حلّ محلّ «iFlight Nazgul Evoque F3D» — التوأم الرقمي لمنتج لم يوجد أصلاً. '
      + 'DoMain3.6 حقيقي وقُرئت صفحته: قطر 170 مم، ومحرّكات SPEEDX2 2105.5 وهي '
      + 'محرّكات مقاس الخمسة على مروحة 3.6، ووزن 279 غراماً بالنسخة التماثلية. '
      + 'أُضيفت نسخ الفيديو الثلاث كخيارات شراء.',
  },

  // ── 3.5 inch ──────────────────────────────────────────────────────────────
  {
    productId: 'geprc-cinelog35', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الجيل الحالي CineLog35 V3 بوحدة DJI O4 Air Unit Pro تسجّل 4K عند 120 '
      + 'إطاراً. صُحّح الاسم ونظام الفيديو — كان مسجَّلاً تماثلياً وهو رقمي.',
  },
  {
    productId: 'geprc-cinebot30', kind: 'wrong-category', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'كان في قسم 3.5 إنش وهو يدور مراوح HQProp T76mm — أي ثلاث إنشات. '
      + 'صُنّف بالرقم في اسمه لا بالمروحة التي يحملها. نُقل إلى قسم الثلاث '
      + 'إنشات وأُضيفت نسخه الثلاث.',
  },
  {
    productId: 'iflight-nazgul-evoque-f4', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'حقيقي — وهو الوحيد من عائلة Evoque الذي كان في الكتالوج بالاسم '
      + 'الصحيح. قطره 185 مم ويُباع بهيكلَين: F4X على شكل X وF4D على شكل '
      + 'DeadCat يُبعد المراوح عن الكاميرا. أُضيفا كخيارَي شراء، وصُحّح نظام '
      + 'فيديوه إلى الرقمي.',
  },

  // ── 5 inch: the second launch anchor ──────────────────────────────────────
  {
    productId: 'iflight-nazgul5-v3', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'أكثر الخمس إنشات مبيعاً، ووثائقه كاملة، ونسخه التماثلية والرقمية مختلفة فعلاً.',
  },
  {
    productId: 'geprc-mark5', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'المنافس المباشر، وله دليل استخدام رسمي منشور — أقوى مصدر في الكتالوج كلّه.',
  },
  {
    productId: 'tbs-source-one-v5', kind: 'duplicate', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr:
      'ظهر دليل جديد يغيّر قرارك المعلَّق: TBS تبيع فعلاً منتجَين مختلفَين '
      + '— الهيكل مفرداً، وطقم RTF/BNF مبنيّاً. فالسجلّان قد لا يكونان '
      + 'تكراراً أصلاً. سُجّل هذا في صفحة قراراتك ولم يُحسم. الاسم الرسمي '
      + 'V5.1 ولا يوجد «V5» مجرَّد.',
  },

  // ── 7 inch and long range ─────────────────────────────────────────────────
  {
    productId: 'iflight-chimera7-pro', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الجيل الحالي Chimera7 Pro V2. سُجّلت أرقامه: 327 مم، وXING2 2809 '
      + 'بسرعة 1250، و725 غراماً بلا بطارية. أُضيفت ثلاث نسخ فيديو.',
  },
  {
    productId: 'geprc-crocodile7', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي «Crocodile 7 PRO». سُجّلت مواصفاته: 315 مم بين '
      + 'المحرّكات، ومحرّكات GR2306 بسرعة 1600، وزمن طيران معلَن سبع دقائق '
      + 'ببطارية 6S سعة 2200.',
  },
  {
    productId: 'iflight-chimera7-eco', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي «Chimera7 ECO 6S». الاكتشاف المهمّ: وحدة تحديد الموقع '
      + 'لا تأتي مركّبة وتُطلب مسبقاً — وطائرة مدى طويل بلا GPS مشكلة سلامة '
      + 'لا نقص ميزة. كُتب ذلك في محتوى الصندوق وفي «لا يناسبك».',
  },

  // ── ready to fly ──────────────────────────────────────────────────────────
  {
    productId: 'emax-tinyhawk-3-rtf', kind: 'aging', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: F4 بمسرّع 5A، ومحرّكات 15000، وكاميرا RunCam Nano 4. '
      + 'كُتب الفرق الحقيقي عن أطقم BetaFPV صراحةً: بروتوكول FrSky D8 لا '
      + 'ExpressLRS. ملاحظة: EMAX تعرض الآن Tinyhawk III Plus بنسخة '
      + 'ExpressLRS.',
  },
  {
    productId: 'betafpv-cetus-lite', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته. أُضيف ما كان ناقصاً وهو جوهري: محرّكاته مكنَّسة لا '
      + 'عديمة المكانس. هذا يفسّر السعر ويفسّر أنه يُستهلك — وإخفاؤه بيعٌ '
      + 'ناقص المعلومة.',
  },
  {
    productId: 'radiomaster-pocket-combo', kind: 'bundle', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: false,
    decision: 'unpublish',
    noteAr:
      'لم يتغيّر: لا يبيع أحد «جهاز ومحاكي» كصندوق واحد. جهاز Pocket موجود '
      + 'مفرداً في قسم الأجهزة، والمحاكي برنامج لا يُشحن. القرار قرارك وهو في '
      + 'صفحتها.',
  },

  // ── radios: complete, documented, and the easiest section to sell ─────────
  {
    productId: 'radiomaster-pocket', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'أفضل مدخل إلى جهاز تحكّم حقيقي، ونسختا ELRS وCC2500 اختيار يفهمه المشتري.',
  },
  {
    productId: 'radiomaster-boxer', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'الوسط المعقول: عصي كاملة الحجم بسعر أقل من TX16S.',
  },
  {
    productId: 'radiomaster-tx16s-mk2', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'المرجع في فئته، وشاشته اللمسية تختصر الإعداد على المبتدئ أكثر ممّا يظنّ.',
  },

  // ── goggles ───────────────────────────────────────────────────────────────
  {
    productId: 'dji-goggles-n3', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'أرخص مدخل إلى الصورة الرقمية، ومواصفاته منشورة بالكامل عند الشركة.',
  },
  {
    productId: 'walksnail-avatar-hd-x', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: 1080p عند مئة إطار، وزاوية 50 درجة، و290 غراماً، ومدخل '
      + 'HDMI. رُبط بوحدة الطائرة من نظامه لأن النظام مغلق والربط هنا ليس '
      + 'اقتراحاً بل شرطاً.',
  },
  {
    productId: 'hdzero-goggles', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      '«HDZero Goggles» فئة لا منتج. المنتج هو «HDZero Goggle 2»، وفيه '
      + 'مستقبِل تماثلي مدمج يجعله يقرأ الطائرات القديمة — وهذه ميزة شراء لم '
      + 'تكن مكتوبة.',
  },

  // ── digital systems ───────────────────────────────────────────────────────
  {
    productId: 'dji-o3-air-unit', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'صفحة مواصفات رسمية مفصّلة. أوضح منتج رقمي يمكن توثيقه في الكتالوج.',
  },
  {
    productId: 'walksnail-avatar-hd-pro', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: مستشعر Sony Starvis II مقاس 1/1.8 إنش، وتأخير 22 مللي '
      + 'ثانية، وتسجيل داخلي 8 غيغابايت.',
  },
  {
    productId: 'hdzero-freestyle-v2', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته، وفيها أمران يغيّران قرار الشراء: الكاميرا ليست في '
      + 'الصندوق، والوحدة محدودة عند 200 ميلي واط من المصنع لا 1 واط. كُتب '
      + 'الاثنان صراحةً.',
  },

  // ── components ────────────────────────────────────────────────────────────
  {
    productId: 'speedybee-f405-v4-stack', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'أشهر طقم متحكّم في السوق، ومواصفاته منشورة رسمياً بالتفصيل.',
  },
  {
    productId: 'speedybee-f7-v3-fc', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'حلّ محلّ «SpeedyBee F405 V4 (FC only)» — وهو ليس منتجاً: SpeedyBee لا تبيع '
      + 'لوحة F405 V4 مفردة إطلاقاً، بل ضمن طقم فقط، واللوحة المفردة التي كانت '
      + 'موجودة هي F405 V3 وصفحتها تقول إنها متوقّفة. F7 V3 هو متحكّمها المفرد '
      + 'الحالي ويجيب الحاجة نفسها. ملاحظة: صفحته تذكر معالجاً من عائلة F4 على لوح '
      + 'اسمه F7 — تناقض لم يُنقل، فلم تُسجَّل مواصفة المعالج.',
  },
  {
    productId: 'holybro-kakute-h7', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الجيل الحالي Kakute H7 V2. وسُجّل تفصيل عملي: أحد منافذ UART الستّة '
      + 'مشغول بالبلوتوث، فالمتاح خمسة — وهذا هو الرقم الذي يبني عليه '
      + 'المشتري.',
  },
  {
    productId: 'speedybee-bls-50a', kind: 'aging', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي يحمل بادئة F405. لم يُستبدل: ما زال يُباع، وسُجّل أن '
      + 'نسخة 60 أمبير هي الأحدث في الخطّ بدل حذفه.',
  },
  {
    productId: 'hobbywing-xrotor-g2', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم القديم «XRotor Micro G2» دمج خطَّين مختلفَين عند Hobbywing: '
      + '«XRotor Micro» و«XRotor FPV G2». المقصود هو الثاني، وله ورقة بيانات '
      + 'منشورة — وهذا نادر. أُضيفت نسختا 45 و65 أمبير كخيارَي شراء، والفرق '
      + 'بينهما ليس القوّة بل مخرج الجهد.',
  },
  {
    productId: 'tmotor-f55a-pro-ii', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: 55 أمبير مستمر و75 ذروة ومخرج 10 فولت. تعارض مسجَّل: '
      + 'عنوان الصفحة يقول AM32 ونصّها يقول BLHeli32 — سُجّل التعارض ولم '
      + 'يُعتمد أيّهما.',
  },
  {
    productId: 'emax-eco-ii-2306', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'سرعات الدوران الثلاث أُضيفت كخيارات شراء، لأن 2400 لبطارية 4S و1700 '
      + 'لـ6S — واختيار الرقم الأكبر على الجهد الأعلى يحرق المسرّعات. سُجّل '
      + 'أن ECO III أحدث.',
  },
  {
    productId: 'tmotor-f60-pro-v', kind: 'real-product', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي «F60PRO V» بمقاس 2207.5. سُجّل وزنه ونسخته الأخفّ LV.',
  },
  {
    productId: 'iflight-xing2-2207', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'صفحته تنشر جدولاً كاملاً بجيلَين: القديم 1855 و2755، والحالي 1750 '
      + 'و2050 و2750. أُضيفت سرعات الجيل الحالي كخيارات شراء.',
  },
  {
    productId: 'armattan-marmotte', kind: 'not-dropshippable', sources: 'official',
    supply: 'hard', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته على المتجر الرسمي — وهو armattanquads.com لا '
      + 'armattanproductions. 236 مم، و115 غراماً، ولوح 4 مم. الضمان حقيقي '
      + 'ومكتوب. يبقى صعب الشحن المباشر، وهذا سبب تجاري لا سبب جودة.',
  },
  {
    productId: 'tbs-source-one-v5-frame', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي «V5.1»، وهناك V6 يخلفه. سُجّل الاثنان. هذا السجلّ هو '
      + 'الهيكل مفرداً، وسجلّ قسم الخمس إنشات هو الطقم المبنيّ — راجع قرارك '
      + 'المعلَّق.',
  },
  {
    productId: 'impulserc-apex', kind: 'needs-rename', sources: 'official',
    supply: 'hard', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'خطّ Apex انتقل إلى EVO. بيع «Apex» مجرَّداً بيعُ جيل تجاوزته الشركة. '
      + 'صُحّح إلى ApexDC EVO مقاس 5 إنش. يبقى صعب الشحن المباشر.',
  },
  {
    productId: 'cnhl-black-series-4s', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'البطارية ليست منتجاً واحداً: السعة والموصّل يختلفان. أُضيفت السعتان '
      + 'الشائعتان كخيارَي شراء، وكُتب أن سعة 5000 بموصّل XT90 لا XT60. '
      + 'النسخة الثانية 130C.',
  },
  {
    productId: 'cnhl-black-series-6s', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'ثلاث سعات كخيارات شراء. وكُتب تحذير عملي: سعة 5000 لا تدخل هيكل خمس '
      + 'إنشات عادياً.',
  },
  {
    productId: 'tattu-r-line-v5-6s', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي «Version 5.0». الأوزان المنشورة تُظهر لماذا السعة ليست '
      + 'تفصيلاً: 145 غراماً عند 850 و346 عند 2200. أُضيفت ثلاث سعات كخيارات '
      + 'شراء.',
  },
  {
    productId: 'isdt-q6-charger', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئ دليله الرسمي: 200 واط بدخل من 10 إلى 24 فولت. أُضيف ما كان '
      + 'ناقصاً: يحتاج مصدر طاقة خارجياً، فهو ليس قطعة واحدة كالشاحن الآخر.',
  },
  {
    productId: 'isdt-608ac', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئ دليله الرسمي، وفيه فرق كان مخفياً: 50 واط من الكهرباء مباشرة '
      + 'و200 واط من مصدر مستمرّ. بيعه بـ«200 واط» دون هذا التفصيل تضليل.',
  },
  {
    productId: 'hota-d6-pro', kind: 'real-product', sources: 'none',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr:
      'المنتج حقيقي ويُباع في كل مكان، لكن لم يُعثر على صفحة رسمية للشركة '
      + 'لهذا الطراز — وما عند الباعة معلومة تجارية لا مواصفة. تُرك بلا '
      + 'مواصفات، وكُتب ذلك على صفحته صراحةً بدل نقل أرقام غير موثّقة.',
  },
  {
    productId: 'caddx-ratel-2', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته الرسمية وسُجّلت مواصفاته الستّ. أشهر كاميرا تماثلية في السوق '
      + 'وأكثرها استعمالاً في التركيبات الجاهزة.',
  },
  {
    productId: 'runcam-phoenix-2', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته ودليله: مستشعر 1/2 إنش، و1000 خط، و9 غرامات، ومن 5 إلى '
      + '36 فولت. من أكمل الصفحات التي قُرئت في هذه الدفعة.',
  },
  {
    productId: 'foxeer-razer-micro', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'ترتيب الكلمات كان خاطئاً: الاسم الرسمي «Foxeer Micro Razer» لا '
      + '«Razer Micro». الترتيب يهمّ لأن «Razer Mini» و«Razer Nano» منتجات '
      + 'أخرى. سُجّل أن خطّ Razer Mini أحدث منه.',
  },
  {
    productId: 'rush-tank-ultimate', kind: 'needs-rename', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'موقع الشركة rushfpv.net لا rushfpv.com، ولا يوجد منتج اسمه «Rush '
      + 'Tank Ultimate» مجرَّداً: الخطّ هو TANK II و TANK III ULTIMATE '
      + 'وULTIMATE PLUS وMINI II. صُحّح إلى TANK II ULTIMATE وسُجّل أن الثالث '
      + 'متاح.',
  },
  {
    productId: 'tbs-unify-pro32-nano', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي يحمل «5G8 V1.1». سُجّلت مستويات الطاقة الأربعة ومخرج 5 '
      + 'فولت بتيّار أمبيرين — وهو سبب شراء لم يكن مكتوباً.',
  },
  {
    productId: 'foxeer-reaper-extreme', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'كان اسماً بلا نسخة، وFoxeer تبيع خمس نسخ بطاقات ونطاقات مختلفة. '
      + 'صُحّح إلى V3 وسُجّلت النسخ. وكُتب تحذير النطاق الممتدّ: ليس مسموحاً '
      + 'في كل مكان.',
  },
  {
    productId: 'matek-m10-gps', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته الرسمية وسُجّلت مواصفاته. تنبيه: الطراز المعروض حالياً '
      + '«M10Q-5883»، بينما «M10-5883» موسوم عند Matek بأنه أُوقف. الاسم في '
      + 'الكتالوج يحتاج تصحيحاً حتى لا يطلب المشتري طرازاً متوقّفاً.',
  },
  {
    productId: 'holybro-m10-gps', kind: 'wrong-category', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      '«M10 GPS» عند Holybro وحدة طيّار آلي: فيها صافرة ومفتاح أمان وكابل '
      + 'عشاري لا يستعملها متحكّم Betaflight. المنتج الصحيح لهذا المتجر '
      + '«Micro M10 GPS». صُحّح.',
  },
  {
    productId: 'flywoo-goku-gm10-pro', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الاسم الرسمي يحمل V3. صفحته من أكمل ما قُرئ: الشريحة والبوصلة والوزن '
      + 'والأبعاد والحساسية ومعدّل التحديث كلّها منشورة.',
  },
  {
    productId: 'radiomaster-rp1', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الجيل الحالي «RP1 V2». أُضيفت ميزة عملية لم تكن مكتوبة: واي فاي مدمج '
      + 'يُحدَّث ويُضبط من المتصفّح بلا فكّ الطائرة.',
  },
  {
    productId: 'happymodel-ep1-elrs', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: 0.41 غرام بلا هوائي، و10 × 10 × 6 مم، ومعدّل من 25 إلى '
      + '500 هرتز. سُجّل أخواه EP2 وEP1 Dual لأنهما إجابتان مختلفتان لسؤالين '
      + 'مختلفين.',
  },
  {
    productId: 'betafpv-superd-elrs', kind: 'needs-variants', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'صُحّح الوصف: هذا تنوّع حقيقي بسلسلتَي استقبال كاملتين، لا مبدّل بين '
      + 'هوائيين — وكان مكتوباً أنه «يختار بينهما». أُضيف النطاقان كخيارَي '
      + 'شراء لأنهما لا يرتبطان.',
  },
  {
    productId: 'truerc-x-air', kind: 'wrong-category', sources: 'official',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'أخطر تصنيف في هذه الدفعة: كان معروضاً كهوائي عام «لكل بناء تماثلي أو '
      + 'رقمي». وهو هوائي استقبال اتجاهي بكسب عشرة ديسيبل وحزمة 120 درجة، '
      + 'تصنّفه الشركة نفسها ضمن هوائيات الاستقبال. تركيبه على طائرة يفقد '
      + 'الصورة كلّما ابتعدت بزاوية. صُحّح.',
  },
  {
    productId: 'lumenier-axii-2', kind: 'needs-variants', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الموصّل والاستقطاب خياران يجب أن يُختارا قبل الطلب لا بعده. أُضيفت '
      + 'أربعة خيارات شراء، وكُتب صراحةً أن الاستقطاب يجب أن يطابق الطرف '
      + 'الآخر.',
  },
  {
    productId: 'foxeer-lollipop-4', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'قُرئت صفحته: كسب 2.6 ديسيبل ومتعدّد الاتجاهات. صُحّح محتوى الصندوق '
      + 'إلى هوائيَين لأنه يُباع بعبوة زوجية.',
  },
  {
    productId: 'gemfan-hurricane-51466', kind: 'needs-rename', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr:
      'الطراز الحالي «51466 V2». صفحته تنشر كل ما يلزم: ثلاث شفرات، وخطوة '
      + '3.6 إنش، وقرص 131.8 مم، و4.2 غرام، وفتحة M5. وكُتب أن المحرّك يجب أن '
      + 'يكون 2207 فما فوق.',
  },
  {
    productId: 'lipo-safe-bag', kind: 'category-placeholder', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'replace',
    noteAr:
      'لم يتغيّر: «حقيبة ليبو» فئة لا منتج، ولا مصنّع ولا طراز. القرار '
      + 'قرارك وهو في صفحة القرارات — إمّا اختيار طراز بعينه أو حجبه.',
  },
  {
    productId: 'battery-strap-set', kind: 'category-placeholder', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'replace',
    noteAr:
      'لم يتغيّر: «طقم أحزمة» فئة لا منتج. القرار قرارك وهو في صفحة '
      + 'القرارات.',
  },
];

/** The products worked to completion this round. */
export function launchSetIds(): string[] {
  return CATALOGUE_AUDIT.filter(r => r.launchSet).map(r => r.productId);
}

export function auditFor(productId: string): AuditRow | undefined {
  return CATALOGUE_AUDIT.find(r => r.productId === productId);
}

/** A tally for the admin panel, so the shape of the backlog is one glance. */
export function auditSummary() {
  const by = <K extends string>(pick: (r: AuditRow) => K): Record<K, number> => {
    const out = {} as Record<K, number>;
    for (const r of CATALOGUE_AUDIT) out[pick(r)] = (out[pick(r)] ?? 0) + 1;
    return out;
  };
  return {
    total: CATALOGUE_AUDIT.length,
    byDecision: by(r => r.decision),
    byKind: by(r => r.kind),
    bySources: by(r => r.sources),
    launchSet: CATALOGUE_AUDIT.filter(r => r.launchSet).length,
    // The number that matters: nothing publishes without a licensed image, and
    // right now nothing has one.
    imagesPending: CATALOGUE_AUDIT.filter(r => r.imagesLicensable !== 'available').length,
  };
}
