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
    productId: 'betafpv-pavo-pico', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'حقيقي ومناسب، لكن لم تُقرأ صفحته الرسمية في هذه الجولة. لا مواصفة تُنشر قبل ذلك.',
  },
  {
    productId: 'betafpv-cetus-x', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'طقم انتقالي معقول. يحتاج قراءة الصفحة الرسمية قبل الاعتماد.',
  },
  {
    productId: 'happymodel-mobula8', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'موجود ويُباع. مؤجَّل إلى جولة توثيق ثانية.',
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
    productId: 'betafpv-pavo25', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'مرشّح قوي للجولة الثانية — نسخه تختلف باختلاف نظام الفيديو اختلافاً حقيقياً.',
  },
  {
    productId: 'geprc-cinebot25', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'يتداخل مع Cinelog25 أكثر ممّا ينبغي. راجع إن كان القسم يحتاجهما معاً.',
  },

  // ── 3 inch ────────────────────────────────────────────────────────────────
  {
    productId: 'iflight-nazgul-evoque-f3', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'ثلاث إنشات مناسب للقسم. أُجّل لصالح الخمس إنشات في هذه الجولة.',
  },
  {
    productId: 'geprc-cinelog30', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم الثلاث إنشات.',
  },
  {
    productId: 'iflight-nazgul-evoque-f3d', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'النسخة الرقمية من الذي فوقه. الأصحّ أن يكونا Variants لمنتج واحد لا منتجين.',
  },

  // ── 3.5 inch ──────────────────────────────────────────────────────────────
  {
    productId: 'geprc-cinelog35', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'سينيووب معروف، مؤجَّل إلى جولة التوثيق الثانية.',
  },
  {
    productId: 'geprc-cinebot30', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مكشوف المراوح في قسم يغلب عليه السينيووب — راجع انتماءه قبل الاعتماد.',
  },
  {
    productId: 'iflight-nazgul-evoque-f4', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مقاس أربع إنشات في قسم 3.5 — راجع الانتماء قبل الاعتماد.',
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
    productId: 'tbs-source-one-v5', kind: 'wrong-category', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: false,
    decision: 'replace',
    noteAr:
      'مُدرَج كطائرة كاملة وهو هيكل. يتعارض مع tbs-source-one-v5-frame في قسم الهياكل. '
      + 'استبدله بطائرة اقتصادية حقيقية، أو ادمج الاثنين في منتج هيكل واحد.',
  },

  // ── 7 inch and long range ─────────────────────────────────────────────────
  {
    productId: 'iflight-chimera7-pro', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'مدى طويل حقيقي. مؤجَّل: القسم يحتاج مراجعة قانونية للمدى قبل الترويج له.',
  },
  {
    productId: 'geprc-crocodile7', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم السبع إنشات.',
  },
  {
    productId: 'iflight-chimera7-eco', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'تأكّد أن هذه النسخة ما تزال تُنتَج قبل اعتمادها — الأسماء الاقتصادية تتغيّر بسرعة.',
  },

  // ── ready to fly ──────────────────────────────────────────────────────────
  {
    productId: 'emax-tinyhawk-3-rtf', kind: 'aging', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'خطّ Tinyhawk أقدم من بدائله. تحقّق من استمرار الإنتاج قبل الاعتماد.',
  },
  {
    productId: 'betafpv-cetus-lite', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'النسخة الأرخص من الطقم المعتمد. توثَّق في الجولة الثانية.',
  },
  {
    productId: 'radiomaster-pocket-combo', kind: 'bundle', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: false,
    decision: 'unpublish',
    noteAr:
      'ليس منتجاً بل فكرة: «جهاز تحكّم ومحاكي» لا يُشترى كصندوق واحد من أي مورد. '
      + 'إمّا أن نجمّعه بأنفسنا ونسعّره كحزمة، أو يُحجب. لا يُنشر كما هو.',
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
    productId: 'walksnail-avatar-hd-x', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'يحتاج قراءة صفحة Walksnail الرسمية قبل الاعتماد.',
  },
  {
    productId: 'hdzero-goggles', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. تحقّق أيضاً أي جيل هو المعروض حالياً.',
  },

  // ── digital systems ───────────────────────────────────────────────────────
  {
    productId: 'dji-o3-air-unit', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'صفحة مواصفات رسمية مفصّلة. أوضح منتج رقمي يمكن توثيقه في الكتالوج.',
  },
  {
    productId: 'walksnail-avatar-hd-pro', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية منظومة Walksnail.',
  },
  {
    productId: 'hdzero-freestyle-v2', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. تأكّد من الجيل المعروض.',
  },

  // ── components ────────────────────────────────────────────────────────────
  {
    productId: 'speedybee-f405-v4-stack', kind: 'real-product', sources: 'official',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'approve', launchSet: true,
    noteAr: 'أشهر طقم متحكّم في السوق، ومواصفاته منشورة رسمياً بالتفصيل.',
  },
  {
    productId: 'speedybee-f405-v4-fc', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'الأصحّ أن يكون Variant من الطقم لا منتجاً ثانياً. أعِد النظر في البنية.',
  },
  {
    productId: 'holybro-kakute-h7', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. Holybro تنشر وثائق جيدة — مرشّح قوي للجولة الثانية.',
  },
  {
    productId: 'speedybee-bls-50a', kind: 'aging', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'replace',
    noteAr: 'مسرّع الجيل السابق. استبدله بالمعروض حالياً عند SpeedyBee.',
  },
  {
    productId: 'hobbywing-xrotor-g2', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'Hobbywing تنشر وثائق مقتضبة لهذا الخطّ. يحتاج مصدراً رسمياً أوضح قبل الاعتماد.',
  },
  {
    productId: 'tmotor-f55a-pro-ii', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. تحقّق من الجيل المعروض حالياً.',
  },
  {
    productId: 'emax-eco-ii-2306', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'المحرّكات تُباع بالطقم عادةً لا بالمفرد — راجع كيف نبيعها قبل الاعتماد.',
  },
  {
    productId: 'tmotor-f60-pro-v', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم المحرّكات.',
  },
  {
    productId: 'iflight-xing2-2207', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم المحرّكات.',
  },
  {
    productId: 'armattan-marmotte', kind: 'not-dropshippable', sources: 'reseller',
    supply: 'hard', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr:
      'هيكل ممتاز، لكن Armattan تبيع مباشرة بضمان مدى الحياة يُدار عبرها — بيعه بالشحن '
      + 'المباشر يضع المشتري بيننا وبين ضمان لا نملكه. أعِد النظر في طريقة عرضه.',
  },
  {
    productId: 'tbs-source-one-v5-frame', kind: 'duplicate', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'ادمجه مع tbs-source-one-v5 — أحدهما مكرَّر.',
  },
  {
    productId: 'impulserc-apex', kind: 'not-dropshippable', sources: 'reseller',
    supply: 'hard', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'توفّره متذبذب ودُفعاته محدودة. غير مناسب للشحن المباشر الآن.',
  },
  {
    productId: 'cnhl-black-series-4s', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'البطاريات تحتاج مراجعة قيود شحن الليثيوم جوّاً قبل عرضها للبيع.',
  },
  {
    productId: 'cnhl-black-series-6s', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'كسابقتها: قيود الشحن أولاً.',
  },
  {
    productId: 'tattu-r-line-v5-6s', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'كسابقتها: قيود الشحن أولاً.',
  },
  {
    productId: 'isdt-q6-charger', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. الشواحن تحتاج توضيح مزوّد الطاقة المطلوب.',
  },
  {
    productId: 'isdt-608ac', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'تحقّق من فولطية الكهرباء والقابس لكل بلد قبل العرض.',
  },
  {
    productId: 'hota-d6-pro', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم الشواحن.',
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
    productId: 'runcam-phoenix-2', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل مع بقية قسم الكاميرات.',
  },
  {
    productId: 'foxeer-razer-micro', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. تحقّق من المقاس المعروض (Micro/Nano/Full).',
  },
  {
    productId: 'rush-tank-ultimate', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'مرسلات الفيديو تحتاج مراجعة حدود الطاقة المسموحة في كل بلد قبل عرضها.',
  },
  {
    productId: 'tbs-unify-pro32-nano', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'كسابقه: حدود الطاقة أولاً.',
  },
  {
    productId: 'foxeer-reaper-extreme', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer',
    noteAr: 'طاقة عالية — الأكثر عرضة لقيود قانونية. لا يُنشر قبل حسم ذلك.',
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
    productId: 'holybro-m10-gps', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'Holybro تنشر وثائق ممتازة، لكن أسماء طرازات M10 متقاربة — تأكّد من الطراز بالضبط.',
  },
  {
    productId: 'flywoo-goku-gm10-pro', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'يحتاج تأكيد أنه يجمع GPS وبوصلة فعلاً في الطراز المعروض حالياً.',
  },
  {
    productId: 'radiomaster-rp1', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. مرشّح قوي — يكمّل أجهزة التحكّم المعتمدة.',
  },
  {
    productId: 'happymodel-ep1-elrs', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'يُباع بنسخ هوائي مختلفة تُغيّر السعر — يجب فصلها كـVariants قبل الاعتماد.',
  },
  {
    productId: 'betafpv-superd-elrs', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'أكبر من أن يناسب البناء الصغير، وقسم المستقبِلات يحتاج خياراً وسطاً قبله.',
  },
  {
    productId: 'truerc-x-air', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. تأكّد من نوع الموصل المعروض (SMA/RP-SMA/U.FL).',
  },
  {
    productId: 'lumenier-axii-2', kind: 'real-product', sources: 'reseller',
    supply: 'moderate', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. الموصل والاستقطاب يجب أن يكونا Variants.',
  },
  {
    productId: 'foxeer-lollipop-4', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. كسابقه: الموصل Variant لا وصف.',
  },
  {
    productId: 'gemfan-hurricane-51466', kind: 'real-product', sources: 'reseller',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'defer', noteAr: 'مؤجَّل. اللون والكمية Variants.',
  },
  {
    productId: 'lipo-safe-bag', kind: 'category-placeholder', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'replace',
    noteAr:
      'ليس منتجاً بل فئة: «حقيبة ليبو» بلا شركة ولا موديل. لا صفحة رسمية ولا مواصفة '
      + 'ولا صورة يمكن ترخيصها. اختر موديلاً محدَّداً من شركة معروفة.',
  },
  {
    productId: 'battery-strap-set', kind: 'category-placeholder', sources: 'none',
    supply: 'easy', imagesLicensable: 'unknown', fitsCategory: true,
    decision: 'replace',
    noteAr: 'كسابقه: قالب بلا شركة ولا موديل. يحتاج منتجاً حقيقياً.',
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
