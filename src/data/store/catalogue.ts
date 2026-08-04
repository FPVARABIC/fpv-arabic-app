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

import type {
  Availability, BuyerLevel, ChoicePosition, LinkProtocol, PackageKind,
  ProductVariant, StoreProduct, VideoSystem,
} from './types';
import { STORE_SERVICES, serviceAsProduct } from './services';
import { LAUNCH_SPECS } from './launch';
import { withRelationships } from './relationships';
import type { KbLink } from '../kb/types';

const REVIEWED = '2026-08-04';

/**
 * Builds a product with the fields that are the same for everything.
 *
 * Compact on purpose: what varies between entries is the editorial judgement,
 * and burying it in twenty lines of identical scaffolding is how a catalogue
 * stops being read by the people maintaining it.
 */
/**
 * A variant as written in the catalogue: everything else is derived.
 *
 * `id` is a SUFFIX here and becomes «product-id:suffix» — so the file cannot
 * accidentally reuse one product's variant id on another, and a reader can tell
 * at a glance which product a variant belongs to.
 */
interface VariantSeed {
  id: string;
  nameAr: string;
  kind: PackageKind;
  link?: LinkProtocol;
  video?: VideoSystem;
  inBox: string[];
  isDefault?: boolean;
  /** Defaults to true for aircraft packages and false for everything else. */
  freeSetup?: boolean;
  availability?: Availability;
}

/**
 * The variants, with the single-configuration case filled in.
 *
 * A product that names none gets exactly one, inheriting the product's own
 * link, video and box. Free setup defaults by package kind rather than by hand:
 * we can program something that arrives with a flight controller and a
 * receiver, and we cannot program a propeller — and a default that has to be
 * remembered is a default that will be wrong on the fiftieth product.
 */
function buildVariants(p: {
  id: string;
  link?: LinkProtocol;
  video?: VideoSystem;
  inBox: string[];
  variants?: VariantSeed[];
  availability?: Availability;
}): ProductVariant[] {
  const seeds: VariantSeed[] = p.variants ?? [{
    id: 'standard',
    nameAr: 'الخيار الوحيد',
    kind: 'single',
    inBox: p.inBox,
    isDefault: true,
  }];
  return seeds.map((v, i) => ({
    id: `${p.id}:${v.id}`,
    nameAr: v.nameAr,
    packageKind: v.kind,
    linkProtocol: v.link ?? p.link ?? 'none',
    videoSystem: v.video ?? p.video ?? 'none',
    inTheBoxAr: v.inBox,
    availability: v.availability ?? p.availability ?? 'needs-confirmation',
    // No price until a cost is recorded. See the module note.
    priceMinor: null,
    isDefault: v.isDefault ?? i === 0,
    freeSetupEligible: v.freeSetup ?? FREE_SETUP_BY_DEFAULT.includes(v.kind),
  }));
}

/**
 * The package kinds the free setup service can actually be performed on.
 *
 * An aircraft that arrives with a flight controller can be flashed, configured
 * and bound before it ships. A bare frame cannot, and promising otherwise is a
 * promise that gets explained away at the worst moment. `single` is excluded on
 * purpose — a component MAY qualify, and when it does somebody says so on that
 * product rather than the rule assuming it.
 */
const FREE_SETUP_BY_DEFAULT: readonly PackageKind[] = ['pnp', 'bnf', 'rtf', 'combo'];

function product(p: {
  id: string;
  categoryId: string;
  nameEn: string;
  titleAr: string;
  brandAr: string;
  pos: ChoicePosition;
  /** Who it is for. Required — «للمتقدّمين» on a 7-inch is a warning. */
  level: BuyerLevel;
  /** Defaults to «لا ينطبق»: a battery has no control link and no video. */
  link?: LinkProtocol;
  video?: VideoSystem;
  weightGrams?: number;
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
  /**
   * How this thing is sold.
   *
   * Omitted means one way — a single unnamed configuration built from the
   * product's own link, video and box. That keeps a battery from carrying
   * ceremony it does not need, while every surface still reads `variants` and
   * none of them needs a special case for «the simple kind».
   */
  variants?: VariantSeed[];
  /** Overridden where the seed already knows better than «يُطلب من المورد». */
  availability?: Availability;
}): StoreProduct {
  const variants = buildVariants(p);
  return {
    id: p.id,
    categoryId: p.categoryId,
    collections: p.collections ?? [],
    nameEn: p.nameEn,
    titleAr: p.titleAr,
    brandAr: p.brandAr,
    choicePosition: p.pos,
    level: p.level,
    linkProtocol: p.link ?? 'none',
    videoSystem: p.video ?? 'none',
    ...(p.weightGrams ? { weightGrams: p.weightGrams } : {}),
    summaryAr: p.summaryAr,
    suitsAr: p.suits,
    notForAr: p.notFor,
    highlightsAr: p.highlights,
    inTheBoxAr: p.inBox,
    // Empty by design — see the note on specifications at the top of this file.
    specs: [],
    images: [],
    variants,
    priceMinor: null,
    currency: 'USD',
    compareAtMinor: null,
    availability: p.availability ?? 'needs-confirmation',
    // Seeded as NOT published. Publication is an act, gated on having a
    // licensed image, a sourced spec set and a current cost — see
    // `publication.ts`. A catalogue that ships published-by-default is a
    // catalogue that publishes whatever anybody adds.
    published: false,
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
    level: 'beginner',
    link: 'elrs',
    video: 'analog',
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
    alternatives: ['betafpv-cetus-x', 'betafpv-cetus-lite', 'emax-tinyhawk-3-rtf'],
    learn: [{ kind: 'article', targetId: 'prop-damage-safety', label: 'لماذا الووب أأمن ما تتعلّم عليه' }],
    availability: 'in-stock',
    // BetaFPV sells the Cetus Pro as a complete kit and as the aircraft alone.
    // Two prices, two boxes, two different customers — and the free setup
    // applies to both because both arrive with a flight controller.
    variants: [
      {
        id: 'rtf', nameAr: 'الطقم الكامل — طائرة وجهاز تحكّم ونظّارة',
        kind: 'rtf', isDefault: true,
        inBox: ['الطائرة', 'جهاز التحكّم LiteRadio 2 SE', 'النظّارة VR02',
          'بطاريات 1S', 'شاحن', 'مراوح احتياطية'],
      },
      {
        id: 'bnf', nameAr: 'الطائرة وحدها — لمن يملك جهازاً ونظّارة',
        kind: 'bnf',
        inBox: ['الطائرة', 'بطاريات 1S', 'مراوح احتياطية'],
      },
    ],
  }),
  product({
    id: 'betafpv-meteor75-pro',
    level: 'beginner',
    link: 'elrs',
    video: 'analog',
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
    alternatives: ['happymodel-mobula7', 'happymodel-mobula8', 'betafpv-cetus-x'],
    availability: 'in-stock',
    // The analog and the digital Meteor75 Pro are different aircraft in the way
    // that matters: they show in different goggles. A buyer who owns analog
    // goggles cannot use the digital one at all, so they are never one listing.
    variants: [
      {
        id: 'elrs-analog', nameAr: 'ExpressLRS + فيديو تماثلي',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'بطارية LAVA II 1S 580mAh', 'مراوح احتياطية'],
      },
      {
        id: 'elrs-hd', nameAr: 'ExpressLRS + فيديو رقمي',
        kind: 'bnf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بوحدة فيديو رقمية', 'بطارية 1S', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),
  product({
    id: 'happymodel-mobula7',
    level: 'beginner',
    link: 'elrs',
    video: 'analog',
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
    alternatives: ['betafpv-meteor75-pro', 'happymodel-mobula8', 'betafpv-cetus-pro'],
    availability: 'in-stock',
    variants: [
      {
        id: 'elrs-bnf', nameAr: 'ExpressLRS مع مستقبِل — تماثلي',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'مراوح احتياطية', 'كابل شحن'],
      },
      {
        id: 'pnp', nameAr: 'بلا مستقبِل — تركّب مستقبِلك',
        kind: 'pnp', link: 'none', video: 'analog',
        inBox: ['الطائرة بلا مستقبِل', 'مراوح احتياطية'],
      },
    ],
  }),

  /* ── 2" / 2.5" / 3" / 3.5" ──────────────────────────────────────────────── */
  product({
    id: 'betafpv-pavo-pico',
    level: 'intermediate',
    link: 'elrs',
    video: 'analog',
    collections: ['cinematic'],
    categoryId: 'size-2',
    nameEn: 'BetaFPV Pavo Pico',
    titleAr: 'سينيووب صغير مبني حول وحدة فيديو رقمية تشتريها معه',
    brandAr: 'BetaFPV',
    pos: 'entry',
    summaryAr:
      'أصغر سينيووب يحمل وحدة فيديو رقمية كاملة تحت مئة غرام. يُباع بلا نظام '
      + 'فيديو: تشتري الوحدة التي تناسب نظّارتك وتركّبها، ووزنه يتغيّر بتغيّرها — '
      + '71.2 غراماً مع DJI O3 و66 مع Vista. للتصوير الداخلي القريب حيث لا تدخل '
      + 'طائرة أكبر.',
    suits: [
      'التصوير داخل الغرف والممرّات الضيّقة.',
      'من يملك نظّارة رقمية بالفعل ويريد أصغر هيكل يحمل وحدتها.',
    ],
    notFor: [
      'الطيران في الهواء المفتوح — وزنه ومقاسه ليسا لذلك.',
      'من لا يملك وحدة فيديو رقمية: لا تأتي معه، وشراؤها يضاعف الكلفة تقريباً.',
      'من يبحث عن الأحدث — BetaFPV تعرض الآن Pavo Pico II الذي يدعم وحدات DJI O4.',
    ],
    highlights: [
      'مراوح محاطة تسمح بالاقتراب من الناس والأثاث',
      'يقبل وحدات DJI O3 وVista وAvatar — تختار ما يناسب نظّارتك',
      'أقلّ من مئة غرام في كل التركيبات المذكورة',
    ],
    inBox: ['الطائرة بلا نظام فيديو', 'مراوح احتياطية'],
    // Across sections on purpose: the alternative to «smallest digital
    // cinewhoop» is another cinewhoop, and they live in the 2.5-inch section.
    alternatives: ['betafpv-pavo25', 'geprc-cinelog25'],
  }),
  product({
    id: 'geprc-cinelog25',
    level: 'intermediate',
    link: 'elrs',
    video: 'analog',
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
    availability: 'needs-confirmation',
    // Three video versions, read off GEPRC's own product pages. They are three
    // different purchases — different cameras, different transmitters,
    // different goggles required — not one product with a colour option.
    variants: [
      {
        id: 'analog', nameAr: 'تماثلي', kind: 'bnf',
        link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'مراوح احتياطية', 'أدوات'],
      },
      {
        id: 'hd-o3', nameAr: 'رقمي بوحدة DJI O3', kind: 'bnf',
        link: 'elrs', video: 'dji',
        inBox: ['الطائرة بوحدة O3', 'مراوح احتياطية', 'أدوات'],
      },
      {
        id: 'hd-wasp', nameAr: 'رقمي بنظام Walksnail', kind: 'bnf',
        link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بوحدة Walksnail', 'مراوح احتياطية', 'أدوات'],
      },
    ],
  }),
  // Replaced «iFlight Nazgul Evoque F3». That product does not exist: iFlight's
  // Evoque line is 4, 5 and 6 inch, and three separate searches of their own
  // shop found no 3-inch Evoque at all. A name nobody sells cannot be corrected
  // — only withdrawn. GEPRC's SMART35 is the real product that answers the same
  // question: the smallest freestyle machine somebody can fly near a house.
  product({
    id: 'geprc-smart35',
    level: 'intermediate',
    link: 'elrs',
    video: 'analog',
    collections: ['freestyle'],
    categoryId: 'size-3-5',
    nameEn: 'GEPRC SMART35',
    titleAr: 'فريستايل تحت 250 غراماً',
    brandAr: 'GEPRC',
    pos: 'entry',
    summaryAr:
      'أخفّ مدخل جدّي إلى الفريستايل: هيكل توثبيك بمقاس 3.5 إنش يبقى تحت 250 غراماً، '
      + 'وهو حدّ يغيّر ما يُسمح لك به في كثير من البلدان. يُباع بنظام تماثلي بطاقة '
      + '600 ميلي واط أو بنظام رقمي.',
    suits: [
      'من يريد مناورات حقيقية في حديقة أو ساحة، لا في ملعب.',
      'من يهمّه حدّ 250 غراماً في بلده.',
    ],
    notFor: [
      'من يريد ثبات الخمس إنشات في الهواء — هذا المقاس ينحرف بالرياح.',
      'حمل كاميرا ثقيلة: الوزن كلّه محسوب هنا.',
    ],
    highlights: [
      'يبقى تحت 250 غراماً — وهذا سبب شرائه الأول',
      'نسختان: تماثلية بطاقة 600 ميلي واط، ورقمية',
      'محرّكات 1404 بسرعة 3850 دورة لكل فولت',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    availability: 'needs-confirmation',
    alternatives: ['geprc-domain36', 'iflight-nazgul-evoque-f4', 'geprc-cinebot30'],
    completes: ['cnhl-black-series-4s', 'radiomaster-pocket', 'lipo-safe-bag'],
    variants: [
      {
        id: 'analog', nameAr: 'نسخة تماثلية بطاقة 600 ميلي واط',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة بنظام تماثلي', 'مراوح احتياطية'],
      },
      {
        id: 'hd', nameAr: 'نسخة رقمية',
        kind: 'bnf', link: 'elrs', video: 'dji',
        inBox: ['الطائرة بوحدة فيديو رقمية', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),
  product({
    id: 'geprc-cinelog35',
    level: 'intermediate',
    link: 'elrs',
    video: 'dji',
    collections: ['cinematic'],
    categoryId: 'size-3-5',
    // The catalogue carried the bare «Cinelog35». GEPRC is on the third
    // generation and sells it only as V3 — quoting V3's motors under the old
    // name would have been the exact error this review exists to catch.
    nameEn: 'GEPRC CineLog35 V3',
    titleAr: 'سينيووب 3.5 إنش بنظام رقمي من الجيل الرابع',
    brandAr: 'GEPRC',
    pos: 'pro',
    summaryAr:
      'الجيل الثالث من CineLog35، مبنيّ حول وحدة DJI O4 Air Unit Pro التي تسجّل بدقّة '
      + '4K عند 120 إطاراً في الثانية. مراوح محاطة تسمح بالاقتراب، وبطارية أكبر من '
      + 'مقاس الثلاثة فيطير أطول.',
    suits: [
      'التصوير الداخلي والقريب حيث يجب أن تكون المراوح محاطة.',
      'من يريد أعلى دقّة تسجيل متاحة في هذا المقاس.',
    ],
    notFor: [
      'من يملك نظّارة تماثلية — هذه النسخة رقمية بالكامل.',
      'من يريد أخفّ وأصغر ما يمكن: المراوح المحاطة تضيف وزناً.',
    ],
    highlights: [
      'وحدة DJI O4 Air Unit Pro بتسجيل 4K عند 120 إطاراً',
      'محرّكات SPEEDX2 2105.5 بسرعة 2650 دورة لكل فولت',
      'مراوح HQProp D-T90 ثلاثية الشفرات',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['geprc-cinebot30', 'betafpv-pavo25', 'geprc-cinelog30'],
    variants: [
      {
        id: 'o4-pro', nameAr: 'نسخة DJI O4 Air Unit Pro',
        kind: 'bnf', link: 'elrs', video: 'dji', isDefault: true,
        inBox: ['الطائرة بوحدة DJI O4 Air Unit Pro', 'مراوح احتياطية'],
      },
      {
        id: 'wtfpv', nameAr: 'نسخة WTFPV',
        kind: 'bnf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بنظام WTFPV', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),

  /* ── 5" ─────────────────────────────────────────────────────────────────── */
  product({
    id: 'iflight-nazgul5-v3',
    level: 'intermediate',
    link: 'elrs',
    video: 'analog',
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
    availability: 'in-stock',
    variants: [
      {
        id: 'elrs-analog', nameAr: 'ExpressLRS + فيديو تماثلي',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'مراوح احتياطية', 'أدوات'],
      },
      {
        id: 'crossfire-analog', nameAr: 'Crossfire + فيديو تماثلي',
        kind: 'bnf', link: 'crossfire', video: 'analog',
        inBox: ['الطائرة', 'مراوح احتياطية', 'أدوات'],
        availability: 'needs-confirmation',
      },
      {
        id: 'pnp', nameAr: 'بلا مستقبِل',
        kind: 'pnp', link: 'none', video: 'analog',
        inBox: ['الطائرة بلا مستقبِل', 'مراوح احتياطية', 'أدوات'],
      },
    ],
  }),
  product({
    id: 'geprc-mark5',
    level: 'advanced',
    link: 'elrs',
    video: 'analog',
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
    availability: 'in-stock',
    variants: [
      {
        id: 'elrs24-analog', nameAr: 'ExpressLRS 2.4 + فيديو تماثلي',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'مراوح احتياطية', 'أدوات وقطع تثبيت'],
      },
      {
        id: 'elrs915-analog', nameAr: 'ExpressLRS 915 + فيديو تماثلي',
        kind: 'bnf', link: 'elrs', video: 'analog',
        inBox: ['الطائرة', 'مراوح احتياطية', 'أدوات وقطع تثبيت'],
        availability: 'needs-confirmation',
      },
      {
        id: 'pnp', nameAr: 'بلا مستقبِل',
        kind: 'pnp', link: 'none', video: 'analog',
        inBox: ['الطائرة بلا مستقبِل', 'مراوح احتياطية', 'أدوات'],
      },
    ],
  }),
  product({
    id: 'tbs-source-one-v5',
    level: 'advanced',
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
    level: 'advanced',
    link: 'elrs',
    video: 'analog',
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
    level: 'beginner',
    link: 'frsky',
    video: 'analog',
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
    level: 'beginner',
    link: 'elrs',
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
    availability: 'in-stock',
    // The RF module is the whole decision here: an ELRS radio does not talk to
    // a FrSky receiver and no amount of configuration changes that. Two
    // variants, and the picker asks in those words.
    variants: [
      {
        id: 'elrs', nameAr: 'نسخة ExpressLRS',
        kind: 'single', link: 'elrs', isDefault: true,
        inBox: ['الجهاز', 'العصي القابلة للفكّ', 'كابل USB-C'],
      },
      {
        id: 'cc2500', nameAr: 'نسخة متعدّدة البروتوكولات (CC2500)',
        kind: 'single', link: 'frsky',
        inBox: ['الجهاز', 'العصي القابلة للفكّ', 'كابل USB-C'],
      },
    ],
  }),
  product({
    id: 'radiomaster-boxer',
    level: 'beginner',
    link: 'elrs',
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
    availability: 'in-stock',
    variants: [
      {
        id: 'elrs', nameAr: 'نسخة ExpressLRS',
        kind: 'single', link: 'elrs', isDefault: true,
        inBox: ['الجهاز', 'حامل بطاريتَي 18650', 'كابل شحن'],
      },
      {
        id: 'multi', nameAr: 'نسخة متعدّدة البروتوكولات (4-in-1)',
        kind: 'single', link: 'frsky',
        inBox: ['الجهاز', 'حامل بطاريتَي 18650', 'كابل شحن'],
      },
    ],
  }),
  product({
    id: 'radiomaster-tx16s-mk2',
    level: 'intermediate',
    link: 'elrs',
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
    availability: 'in-stock',
    variants: [
      {
        id: 'elrs', nameAr: 'نسخة ExpressLRS',
        kind: 'single', link: 'elrs', isDefault: true,
        inBox: ['الجهاز', 'حقيبة', 'كابل USB-C'],
      },
      {
        id: 'multi', nameAr: 'نسخة متعدّدة البروتوكولات (4-in-1)',
        kind: 'single', link: 'frsky',
        inBox: ['الجهاز', 'حقيبة', 'كابل USB-C'],
      },
    ],
  }),

  /* ── Goggles ────────────────────────────────────────────────────────────── */
  product({
    id: 'dji-goggles-n3',
    level: 'beginner',
    video: 'dji',
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
    availability: 'in-stock',
  }),
  product({
    id: 'walksnail-avatar-hd-x',
    level: 'intermediate',
    video: 'walksnail',
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
    level: 'advanced',
    video: 'hdzero',
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
    level: 'intermediate',
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
    level: 'beginner',
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
    level: 'beginner',
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
    level: 'intermediate',
    link: 'elrs',
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
    level: 'beginner',
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
    level: 'intermediate',
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
    level: 'advanced',
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
    level: 'intermediate',
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
    availability: 'in-stock',
  }),
  product({
    id: 'speedybee-bls-50a',
    level: 'intermediate',
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
    level: 'advanced',
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
    level: 'intermediate',
    video: 'analog',
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
    level: 'intermediate',
    video: 'analog',
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
    level: 'intermediate',
    video: 'dji',
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
    availability: 'in-stock',
  }),
  product({
    id: 'matek-m10-gps',
    level: 'advanced',
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
    level: 'beginner',
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
  // ── Depth, added once the shop needed to be sellable rather than legible ──
  //
  // The rule is three to five per section, and it is not decoration: two
  // options is a coin toss and one is not a shop. Everything below is a
  // product that actually sells in this market — chosen for being widely used
  // and widely recommended, not for filling a slot.
  //
  // WHAT IS DELIBERATELY ABSENT FROM EVERY ONE OF THEM
  // -------------------------------------------------
  // A specification. Not a thrust figure, not a KV, not a current rating.
  // Those are on the model, they render when present, and they are left empty
  // here because a number nobody checked against the manufacturer's own
  // documentation is exactly the thing this project refuses to publish. The
  // admin panel takes them, one at a time, with the source recorded — and until
  // then the page says what the product IS and who it suits, which is what a
  // buyer needs first and what most shops never write.

  // ── 2 inch ──────────────────────────────────────────────────────────────
  product({
    id: 'betafpv-cetus-x',
    level: 'beginner',
    link: 'elrs',
    video: 'analog',
    collections: ['rtf'],
    categoryId: 'size-2',
    nameEn: 'BetaFPV Cetus X',
    titleAr: 'طقم كامل بمقاس إنشين للانتقال بعد الووب',
    brandAr: 'BetaFPV',
    pos: 'entry',
    summaryAr:
      'الخطوة التالية بعد ووب المبتدئين: نفس فكرة الطقم الجاهز — طائرة وجهاز تحكّم '
      + 'ونظّارة في صندوق واحد — لكن بمقاس ومحرّكات تسمح بالطيران خارج البيت.',
    suits: ['من تعلّم داخل البيت ويريد الخروج دون شراء نظام كامل من الصفر.'],
    notFor: ['من يملك نظّارة وجهاز تحكّم بالفعل — ستدفع ثمنهما مرّتين.'],
    highlights: ['طقم كامل يطير من الصندوق', 'أقوى من ووب المبتدئين'],
    inBox: ['الطائرة', 'جهاز التحكّم', 'النظّارة', 'بطاريات', 'مراوح احتياطية'],
    availability: 'in-stock',
    // BetaFPV sells the Cetus X kit with two different radio protocols and, in
    // the HD kit, with a digital video system. The protocol is not a
    // preference: an ExpressLRS kit's radio will not bind a FrSky receiver, and
    // somebody who already owns one of the two must pick the matching one.
    variants: [
      {
        id: 'elrs', nameAr: 'طقم ExpressLRS — تماثلي',
        kind: 'rtf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة', 'جهاز التحكّم LiteRadio 3', 'النظّارة VR03',
          'بطاريات 2S', 'شاحن', 'مراوح احتياطية'],
      },
      {
        id: 'frsky', nameAr: 'طقم FrSky D8 — تماثلي',
        kind: 'rtf', link: 'frsky', video: 'analog',
        inBox: ['الطائرة', 'جهاز التحكّم LiteRadio 3', 'النظّارة VR03',
          'بطاريات 2S', 'شاحن', 'مراوح احتياطية'],
      },
      {
        id: 'hd', nameAr: 'طقم HD — فيديو رقمي',
        kind: 'rtf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بوحدة فيديو رقمية', 'جهاز التحكّم', 'نظّارة رقمية',
          'بطاريات 2S', 'شاحن', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
    // Real alternatives, chosen across sections rather than within one: the
    // question a buyer is asking here is «which beginner kit», and the answer
    // spans «ووب» and «أطقم جاهزة». Same-section-only would have offered them
    // two more 2-inch aircraft they are not shopping for.
    alternatives: ['betafpv-cetus-pro', 'betafpv-cetus-lite', 'emax-tinyhawk-3-rtf'],
  }),
  product({
    id: 'happymodel-mobula8',
    level: 'intermediate',
    link: 'elrs',
    video: 'analog',
    categoryId: 'size-2',
    nameEn: 'HappyModel Mobula8',
    titleAr: 'ووب إنشين خفيف يقبل بطاريتين',
    brandAr: 'HappyModel',
    pos: 'middle',
    summaryAr:
      'أكبر من Mobula7 وأقوى منه، ويطير على 1S أو 2S حسب ما تركّبه. مناسب لمن تجاوز '
      + 'الووب الصغير ولا يريد بعد الانتقال إلى مقاس 3 إنشات.',
    suits: ['من يطير داخل البيت وفي الحديقة، ويريد قوة أعلى من الووب الصغير.'],
    notFor: ['من يريد الطيران في الهواء المفتوح — وزنه لا يكفي لمقاومة الرياح.'],
    highlights: ['يقبل 1S و2S', 'مراوح محاطة تسمح بالاصطدام الخفيف'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['betafpv-pavo-pico'],
  }),

  // ── 2.5 inch ────────────────────────────────────────────────────────────
  product({
    id: 'betafpv-pavo25',
    level: 'intermediate',
    link: 'elrs',
    video: 'dji',
    collections: ['cinematic'],
    categoryId: 'size-2-5',
    // BetaFPV sells the V2. The old name was carrying the new generation's
    // reputation without its parts.
    nameEn: 'BetaFPV Pavo25 V2',
    titleAr: 'سينيووب 2.5 إنش يُباع بلا نظام فيديو',
    brandAr: 'BetaFPV',
    pos: 'entry',
    summaryAr:
      'سينيووب بمراوح محاطة، مبنيّ حول متحكّم F722 يقبل من 2S إلى 6S ووحدة فيديو '
      + 'رقمية تختارها أنت. كما في Pavo Pico: الوحدة ليست في الصندوق، وهي شراء '
      + 'ثانٍ يجب أن يطابق نظّارتك.',
    suits: [
      'التصوير الداخلي القريب حيث يجب أن تكون المراوح محاطة.',
      'من يملك وحدة فيديو رقمية بالفعل ويريد هيكلاً يحملها.',
    ],
    notFor: [
      'من يملك نظّارة تماثلية فقط — هذا الهيكل مبنيّ لوحدة رقمية.',
      'من لا يملك وحدة رقمية: شراؤها يضاعف الكلفة تقريباً.',
    ],
    highlights: [
      'محرّكات LAVA 1506 بسرعة 4200 دورة لكل فولت',
      'متحكّم F722 35A مدمج بستّة منافذ UART ويقبل من 2S إلى 6S',
      'مراوح GF D63 ثلاثية الشفرات',
    ],
    inBox: ['الطائرة بلا نظام فيديو', 'مراوح احتياطية'],
    alternatives: ['geprc-cinelog25', 'geprc-cinebot25', 'betafpv-pavo-pico'],
  }),
  product({
    id: 'geprc-cinebot25',
    level: 'advanced',
    link: 'elrs',
    video: 'dji',
    categoryId: 'size-2-5',
    nameEn: 'GEPRC Cinebot25 V2',
    titleAr: 'سينيووب 2.5 إنش بوحدة DJI O4 Air Unit Pro',
    brandAr: 'GEPRC',
    pos: 'pro',
    summaryAr:
      'الجيل الثاني من Cinebot25، وهو الطرف الأعلى في مقاس 2.5: محرّكات 1404 بسرعة '
      + '4600 دورة لكل فولت ووحدة DJI O4 Air Unit Pro مركّبة، لللقطات التي تحتاج '
      + 'تسارعاً ومتابعة لا مجرّد تحليق ثابت. وزنه 219 غراماً تقريباً بنسخة ExpressLRS.',
    suits: [
      'من يصوّر مشاهد متحرّكة داخل مساحات ضيّقة.',
      'من يملك نظّارة DJI ويريد أعلى أداء في هذا المقاس.',
    ],
    notFor: [
      'المبتدئ — القوة الزائدة في مساحة ضيّقة تعني اصطدامات أغلى.',
      'من يملك نظّارة تماثلية: هذه النسخة رقمية.',
    ],
    highlights: [
      'وحدة DJI O4 Air Unit Pro مركّبة',
      'متحكّم TAKER F722 35A بمعالج STM32F722RET6',
      'يقبل بطارية LiHV بجهد 4S وسعة 750 إلى 1100 ميلي أمبير/ساعة',
    ],
    inBox: ['الطائرة بوحدة DJI O4 Air Unit Pro', 'مراوح احتياطية'],
    alternatives: ['geprc-cinelog25', 'betafpv-pavo25', 'geprc-cinelog30'],
    variants: [
      {
        id: 'o4-pro', nameAr: 'نسخة DJI O4 Air Unit Pro',
        kind: 'bnf', link: 'elrs', video: 'dji', isDefault: true,
        inBox: ['الطائرة بوحدة DJI O4 Air Unit Pro', 'مراوح احتياطية'],
      },
      {
        id: 'wtfpv', nameAr: 'نسخة WTFPV',
        kind: 'bnf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بنظام WTFPV', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),

  // ── 3 inch ──────────────────────────────────────────────────────────────
  product({
    id: 'geprc-cinelog30',
    level: 'intermediate',
    link: 'elrs',
    video: 'dji',
    collections: ['cinematic'],
    categoryId: 'size-3',
    // Two generations behind. GEPRC ships V3.
    nameEn: 'GEPRC Cinelog30 V3',
    titleAr: 'سينيووب 3 إنش بزمن طيران معلَن يتجاوز ثماني دقائق',
    brandAr: 'GEPRC',
    pos: 'entry',
    summaryAr:
      'الجيل الثالث من Cinelog30: مراوح محاطة وثبات للتصوير، ووحدة DJI O4 Air Unit '
      + 'Pro. الشركة تعلن زمن طيران يصل إلى ثماني دقائق وعشر ثوانٍ ببطارية LiHV بجهد '
      + '4S وسعة 720 ميلي أمبير/ساعة — وهو رقمها لا رقمنا.',
    suits: [
      'التصوير الذي يحتاج دقائق أطول في الجوّ.',
      'الاقتراب من الناس والأثاث بمراوح محاطة.',
    ],
    notFor: [
      'المساحات الضيّقة جداً — المقاس الأكبر يحدّ أين يمكن أن تدخل.',
      'من يملك نظّارة تماثلية.',
    ],
    highlights: [
      'وحدة DJI O4 Air Unit Pro مركّبة',
      'محرّكات 1404 بسرعة 3850 دورة لكل فولت',
      'متحكّم TAKER F722 45A ثنائي وثلاثون بت',
    ],
    inBox: ['الطائرة بوحدة DJI O4 Air Unit Pro', 'مراوح احتياطية'],
    alternatives: ['geprc-cinebot30', 'geprc-cinelog25', 'geprc-cinelog35'],
    variants: [
      {
        id: 'o4-pro', nameAr: 'نسخة DJI O4 Air Unit Pro',
        kind: 'bnf', link: 'elrs', video: 'dji', isDefault: true,
        inBox: ['الطائرة بوحدة DJI O4 Air Unit Pro', 'مراوح احتياطية'],
      },
      {
        id: 'wtfpv', nameAr: 'نسخة WTFPV',
        kind: 'bnf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بنظام WTFPV', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),
  // Moved here from the 3.5-inch section. The Cinebot30 flies 3-inch props
  // (HQProp T76mm), so it belonged in this section all along — it was filed by
  // the number in its name rather than by the propeller it turns.
  product({
    id: 'geprc-cinebot30',
    level: 'intermediate',
    link: 'elrs',
    video: 'dji',
    collections: ['cinematic'],
    categoryId: 'size-3',
    nameEn: 'GEPRC Cinebot30',
    titleAr: 'طائرة تصوير 3 إنش بمراوح مكشوفة',
    brandAr: 'GEPRC',
    pos: 'middle',
    summaryAr:
      'ليست سينيووب: مراوحها مكشوفة، فهي أكفأ وأخفّ من Cinelog30 بنفس المقاس — '
      + 'مقابل أنها لا تُقارَب من الناس ولا من الأثاث. وزنها بلا بطارية 209 غرامات '
      + 'بالنسخة التماثلية و235 غراماً بنسخة DJI O3.',
    suits: [
      'التصوير في الهواء المفتوح حيث لا حاجة لحماية المراوح.',
      'من يريد أخفّ وزن ممكن في هذا المقاس.',
    ],
    notFor: [
      'التصوير الداخلي أو قرب الناس — لا حماية حول المراوح.',
      'من يريد سينيووب فعلاً: راجع Cinelog30.',
    ],
    highlights: [
      'مراوح HQProp T76mm ثلاثية الشفرات — أي ثلاث إنشات',
      'أخفّ من السينيووب في نفس المقاس',
      'متحكّم GEP-F722-45A AIO النسخة الثانية',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['geprc-cinelog30', 'geprc-smart35', 'geprc-cinelog35'],
    variants: [
      {
        id: 'analog', nameAr: 'نسخة تماثلية', kind: 'bnf',
        link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة بنظام تماثلي', 'مراوح احتياطية'],
      },
      {
        id: 'hd-o3', nameAr: 'نسخة DJI O3', kind: 'bnf',
        link: 'elrs', video: 'dji',
        inBox: ['الطائرة بوحدة DJI O3', 'مراوح احتياطية'],
      },
      {
        id: 'hd-wasp', nameAr: 'نسخة RunCam Link Wasp', kind: 'bnf',
        link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بنظام Wasp الرقمي', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),

  // ── 3.5 – 4 inch ────────────────────────────────────────────────────────
  // Replaced «iFlight Nazgul Evoque F3D» — the digital twin of a product that
  // never existed. GEPRC's DoMain3.6 is the real answer to the same question:
  // a freestyle machine smaller than five inches with a digital video system.
  product({
    id: 'geprc-domain36',
    level: 'advanced',
    link: 'elrs',
    video: 'dji',
    collections: ['freestyle'],
    categoryId: 'size-3-5',
    nameEn: 'GEPRC DoMain3.6',
    titleAr: 'فريستايل 3.6 إنش بمحرّكات مقاس الخمسة',
    brandAr: 'GEPRC',
    pos: 'pro',
    summaryAr:
      'هيكل فريستايل بقطر 170 مم يحمل محرّكات SPEEDX2 2105.5 — وهي محرّكات مقاس '
      + 'الخمس إنشات على مروحة 3.6. هذا يعني تسارعاً حادّاً في مساحة أصغر. يُباع '
      + 'بنسخة تماثلية وزنها 279 غراماً، وبنسخة DJI O3، وبنسخة WTFPV.',
    suits: [
      'من يطير فريستايل في مساحة لا تكفي لخمس إنشات.',
      'من يريد تسارعاً حادّاً لا زمن طيران طويلاً.',
    ],
    notFor: [
      'المبتدئ — هذه قوّة أكبر من أن تُتعلَّم عليها.',
      'التصوير الهادئ: راجع Cinelog30 أو Cinebot30.',
    ],
    highlights: [
      'محرّكات SPEEDX2 2105.5 بسرعة 2650 دورة لكل فولت',
      'وصلات ألومنيوم 7075 في مواضع الشدّ',
      'ثلاث نسخ فيديو: تماثلية وDJI O3 وWTFPV',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    availability: 'needs-confirmation',
    alternatives: ['geprc-smart35', 'iflight-nazgul-evoque-f4', 'iflight-nazgul5-v3'],
    completes: ['cnhl-black-series-6s', 'radiomaster-pocket', 'lipo-safe-bag'],
    variants: [
      {
        id: 'analog', nameAr: 'نسخة تماثلية بكاميرا RunCam Phoenix 2',
        kind: 'bnf', link: 'elrs', video: 'analog', isDefault: true,
        inBox: ['الطائرة بكاميرا RunCam Phoenix 2', 'مراوح احتياطية'],
      },
      {
        id: 'hd-o3', nameAr: 'نسخة DJI O3',
        kind: 'bnf', link: 'elrs', video: 'dji',
        inBox: ['الطائرة بوحدة DJI O3', 'مراوح احتياطية'],
      },
      {
        id: 'wtfpv', nameAr: 'نسخة WTFPV',
        kind: 'bnf', link: 'elrs', video: 'walksnail',
        inBox: ['الطائرة بنظام WTFPV', 'مراوح احتياطية'],
        availability: 'needs-confirmation',
      },
    ],
  }),
  product({
    id: 'iflight-nazgul-evoque-f4',
    level: 'advanced',
    link: 'elrs',
    video: 'dji',
    collections: ['freestyle'],
    categoryId: 'size-3-5',
    nameEn: 'iFlight Nazgul Evoque F4',
    titleAr: 'أربع إنشات بهيكلَين مختلفَين — X أو DeadCat',
    brandAr: 'iFlight',
    pos: 'middle',
    summaryAr:
      'أربع إنشات بقطر 185 مم على بطارية 6S: أخفّ وأرشق من الخمس إنشات في المساحات '
      + 'المتوسّطة. يُباع بهيكلَين ليسا تفضيلاً شكلياً — F4X على شكل X مضغوط، وF4D '
      + 'على شكل DeadCat يُبعد المراوح عن مجال الكاميرا لتصوير خالٍ منها.',
    suits: [
      'من يجد الخمس إنشات كبيرة على مكانه والثلاث ضعيفة عليه.',
      'من يريد لقطة خالية من المراوح: اختر هيكل F4D.',
    ],
    notFor: [
      'المبتدئ — هذا مقاس يُختار بعد معرفة ما ينقصك.',
      'المدى الطويل: أربع إنشات ليست مقاس الكفاءة.',
    ],
    highlights: [
      'قطر 185 مم على بطارية 6S',
      'هيكلان: X مضغوط أو DeadCat يخفي المراوح عن الكاميرا',
      'يُباع بوحدة DJI O3 الرقمية',
    ],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['geprc-domain36', 'geprc-smart35', 'iflight-nazgul5-v3'],
    variants: [
      {
        id: 'f4x-o3', nameAr: 'هيكل F4X — X مضغوط، وحدة DJI O3',
        kind: 'bnf', link: 'elrs', video: 'dji', isDefault: true,
        inBox: ['الطائرة بهيكل F4X ووحدة DJI O3', 'مراوح احتياطية'],
      },
      {
        id: 'f4d-o3', nameAr: 'هيكل F4D — DeadCat، وحدة DJI O3',
        kind: 'bnf', link: 'elrs', video: 'dji',
        inBox: ['الطائرة بهيكل F4D ووحدة DJI O3', 'مراوح احتياطية'],
      },
    ],
  }),

  // ── 7 inch and long range ───────────────────────────────────────────────
  product({
    id: 'geprc-crocodile7',
    level: 'advanced',
    link: 'elrs',
    video: 'analog',
    collections: ['long-range'],
    categoryId: 'size-7',
    nameEn: 'GEPRC Crocodile 7',
    titleAr: 'سبع إنشات للمسافات الطويلة',
    brandAr: 'GEPRC',
    pos: 'entry',
    summaryAr:
      'مبنية للمدى: مقاس كبير ومراوح كبيرة تعني كفاءة عالية وزمن طيران طويل. تطير '
      + 'بهدوء وثبات، ولا تُطار كما تُطار طائرة فريستايل.',
    suits: ['الطيران الطويل فوق مساحات مفتوحة.'],
    notFor: ['الفريستايل أو المساحات الضيّقة — الحجم والقصور الذاتي ضدّك.'],
    highlights: ['زمن طيران طويل', 'مصمَّمة للمدى لا للحركات'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    learn: [{ kind: 'article', targetId: 'prop-sizing', label: 'كيف يغيّر المقاس سلوك الطائرة' }],
  }),
  product({
    id: 'iflight-chimera7-eco',
    level: 'advanced',
    link: 'elrs',
    video: 'analog',
    collections: ['long-range'],
    categoryId: 'size-7',
    nameEn: 'iFlight Chimera7 ECO',
    titleAr: 'النسخة الاقتصادية من سبع إنشات',
    brandAr: 'iFlight',
    pos: 'middle',
    summaryAr:
      'نفس فكرة Chimera7 بمكوّنات أقلّ كلفة. تطير المهمّة نفسها بمدى أقصر قليلاً، '
      + 'وهي المدخل المعقول لمن لم يجرّب هذا المقاس بعد.',
    suits: ['أوّل تجربة مع مقاس سبع إنشات دون دفع ثمن النسخة الكاملة.'],
    notFor: ['من يحتاج أقصى مدى ممكن — ادفع فرق النسخة الأعلى.'],
    highlights: ['مدخل أرخص إلى المدى الطويل', 'قطع غيار مشتركة مع النسخة الأعلى'],
    inBox: ['الطائرة', 'مراوح احتياطية'],
    alternatives: ['iflight-chimera7-pro'],
  }),

  // ── ready to fly ────────────────────────────────────────────────────────
  product({
    id: 'betafpv-cetus-lite',
    level: 'beginner',
    link: 'frsky',
    video: 'analog',
    categoryId: 'rtf',
    nameEn: 'BetaFPV Cetus Lite',
    titleAr: 'أرخص طقم كامل للتعلّم داخل البيت',
    brandAr: 'BetaFPV',
    pos: 'entry',
    summaryAr:
      'أقلّ ما تحتاجه لتبدأ فعلاً: طائرة ونظّارة وجهاز تحكّم في صندوق واحد. مخصّص '
      + 'للتعلّم داخل البيت، ووضع الثبات فيه يسامح أخطاء الأسبوع الأول.',
    suits: ['أوّل شهر من التعلّم، داخل البيت، بأقلّ كلفة ممكنة.'],
    notFor: ['من يريد الطيران خارجاً — الوزن والقوة ليسا لذلك.'],
    highlights: ['كل ما يلزم في صندوق واحد', 'أوضاع طيران تسامح المبتدئ'],
    inBox: ['الطائرة', 'جهاز التحكّم', 'النظّارة', 'بطاريات'],
  }),
  product({
    id: 'radiomaster-pocket-combo',
    level: 'beginner',
    link: 'elrs',
    video: 'none',
    categoryId: 'rtf',
    nameEn: 'RadioMaster Pocket + Simulator',
    titleAr: 'جهاز تحكّم ومحاكي — الطريق الأرخص للتعلّم',
    brandAr: 'RadioMaster',
    pos: 'variant',
    summaryAr:
      'ليس طائرة، وهذا هو المقصود: أرخص وأسرع طريقة للتعلّم هي جهاز تحكّم حقيقي '
      + 'ومحاكي على الحاسوب. تتحطّم مئة مرّة بلا كلفة، ثم تشتري طائرة وأنت تعرف الطيران.',
    suits: ['من يريد أن يتعلّم قبل أن يدفع ثمن طائرة يحطّمها.'],
    notFor: ['من يريد الطيران في الخارج هذا الأسبوع — هذا ليس طائرة.'],
    highlights: ['جهاز تحكّم يبقى معك بعد المحاكي', 'لا كلفة للتحطّم'],
    inBox: ['جهاز التحكّم', 'كابل الحاسوب'],
    completes: ['radiomaster-pocket'],
  }),

  // ── motors ──────────────────────────────────────────────────────────────
  product({
    id: 'iflight-xing2-2207',
    level: 'intermediate',
    categoryId: 'motors',
    nameEn: 'iFlight XING2 2207',
    titleAr: 'محرّك خمس إنشات — اختر سرعة الدوران بجهد بطاريتك',
    brandAr: 'iFlight',
    pos: 'middle',
    summaryAr:
      'من أكثر محرّكات الخمس إنشات استعمالاً، ويأتي مركّباً في كثير من الطائرات '
      + 'الجاهزة. النسخة الحالية تُباع بثلاث سرعات دوران: 1750 و2050 لبطارية 6S، '
      + 'و2750 لبطارية 4S. الرقم ليس تفضيلاً — سرعة عالية على جهد عالٍ تحرق المسرّعات.',
    suits: [
      'بناء أو إصلاح طائرة خمس إنشات للفريستايل.',
      'من يريد محرّكاً تجد له شرحاً وتجارب جاهزة.',
    ],
    notFor: [
      'المقاسات الصغيرة — هذا محرّك خمس إنشات.',
      'من لم يحسم جهد بطاريته بعد: سرعة الدوران تُختار على أساسه.',
    ],
    highlights: [
      'تكوين 12N14P بمحامل NSK ومغانط N52H منحنية',
      'محور 5 مم وفتحات تثبيت 16 × 16 مم',
      'وزن 30.5 غراماً بالسلك في النسخة الحالية',
    ],
    inBox: ['المحرّك', 'براغي'],
    alternatives: ['emax-eco-ii-2306', 'tmotor-f60-pro-v'],
    learn: [{ kind: 'article', targetId: 'motor-kv', label: 'ما معنى KV' }],
    variants: [
      {
        id: 'kv1750', nameAr: '1750KV — لبطارية 6S', kind: 'single', isDefault: true,
        inBox: ['المحرّك', 'براغي'],
      },
      { id: 'kv2050', nameAr: '2050KV — لبطارية 6S', kind: 'single', inBox: ['المحرّك', 'براغي'] },
      { id: 'kv2750', nameAr: '2750KV — لبطارية 4S', kind: 'single', inBox: ['المحرّك', 'براغي'] },
    ],
  }),

  // ── flight controllers ──────────────────────────────────────────────────
  // Replaced «SpeedyBee F405 V4 (FC only)». SpeedyBee does not sell the F405 V4
  // board on its own — it ships only as a stack — and the standalone board that
  // did exist, the F405 V3, is marked discontinued on their own site. The F7 V3
  // is their current standalone flight controller and answers the same need.
  product({
    id: 'speedybee-f7-v3-fc',
    level: 'intermediate',
    categoryId: 'flight-controllers',
    nameEn: 'SpeedyBee F7 V3',
    titleAr: 'متحكّم طيران مفرد بلا مسرّعات',
    brandAr: 'SpeedyBee',
    pos: 'entry',
    summaryAr:
      'متحكّم يُباع وحده، لا ضمن طقم. للحالة التي احترق فيها المتحكّم والمسرّعات '
      + 'سليمة — وهي أشيع ممّا يتوقّع الناس — ولمن يبني بمسرّعات اختارها بنفسه. '
      + 'ينزّل الصندوق الأسود عبر البلوتوث أو الواي فاي بلا كابل.',
    suits: [
      'استبدال متحكّم تالف دون شراء طقم كامل.',
      'بناء بمسرّعات مختارة على حدة.',
    ],
    notFor: [
      'بناء جديد بسيط — الطقم عادةً أرخص من القطعتين منفصلتين.',
      'البناءات الضيّقة التي تحتاج مقاس 20 × 20 مم.',
    ],
    highlights: [
      'مخرجان مستقلّان: 9 فولت بتيار 4 أمبير و5 فولت بتيار 2 أمبير',
      'الصندوق الأسود يُنزَّل لاسلكياً في نحو عشرين ثانية',
      'فتحة كاميرا 22 مم للبناءات الضيّقة',
    ],
    inBox: ['المتحكّم', 'كابلات', 'قواعد عازلة'],
    availability: 'needs-confirmation',
    alternatives: ['speedybee-f405-v4-stack', 'holybro-kakute-h7'],
    completes: ['hobbywing-xrotor-g2', 'radiomaster-rp1'],
    learn: [{ kind: 'betaflight', targetId: 'ports', label: 'صفحة Ports في Betaflight' }],
  }),
  product({
    id: 'holybro-kakute-h7',
    level: 'advanced',
    categoryId: 'flight-controllers',
    nameEn: 'Holybro Kakute H7 V2',
    titleAr: 'متحكّم H7 بستّة منافذ UART',
    brandAr: 'Holybro',
    pos: 'pro',
    summaryAr:
      'معالج STM32H743 بتردّد 480 ميغاهرتز وستّة منافذ UART — وهذا هو الفرق العملي: '
      + 'عدد المنافذ هو ما يحدّ عادةً كم قطعة تركّب على طائرة واحدة. انتبه أن المنفذ '
      + 'الثاني مشغول بالبلوتوث، فالمتاح لك خمسة فعلياً إن أردت البلوتوث.',
    suits: [
      'تركيبة تحتاج مستقبِلاً وGPS ووحدة فيديو رقمية معاً.',
      'من يريد ذاكرة صندوق أسود كبيرة بلا بطاقة ذاكرة.',
    ],
    notFor: [
      'تركيبة بسيطة — ستدفع ثمن منافذ لن تستعملها.',
      'من يحتاج المنافذ الستّة كلّها: البلوتوث يأخذ أحدها.',
    ],
    highlights: [
      'معالج STM32H743 بتردّد 480 ميغاهرتز',
      'ذاكرة 128 ميغابايت مدمجة للصندوق الأسود',
      'مفتاح إطفاء لخطّ 9 فولت يقطع مرسل الفيديو',
    ],
    inBox: ['المتحكّم', 'كابلات', 'قواعد عازلة'],
    alternatives: ['speedybee-f405-v4-stack', 'speedybee-f7-v3-fc'],
    learn: [{ kind: 'betaflight', targetId: 'ports', label: 'كيف تُوزَّع منافذ UART' }],
  }),

  // ── ESCs ────────────────────────────────────────────────────────────────
  // Renamed from «Hobbywing XRotor Micro G2» — a name that merged two separate
  // Hobbywing lines. «XRotor Micro» and «XRotor FPV G2» are different products;
  // the one this shop wants is the FPV G2, and it is sold by current rating.
  product({
    id: 'hobbywing-xrotor-g2',
    level: 'intermediate',
    categoryId: 'escs',
    nameEn: 'Hobbywing XRotor FPV G2 4in1',
    titleAr: 'مسرّعات رباعية بورقة بيانات منشورة',
    brandAr: 'Hobbywing',
    pos: 'entry',
    summaryAr:
      'لوحة مسرّعات رباعية من شركة قديمة في هذا المجال، وتنشر ورقة بيانات كاملة — '
      + 'وهذا نادر. تُباع بتيّارَين: 45 أمبير مستمر بلا مخرج جهد، و65 أمبير مستمر '
      + 'مع مخرج 5 فولت. الفرق ليس في القوّة وحدها: نسخة 45 لن تغذّي مستقبِلك.',
    suits: [
      'بناء يريد مسرّعات لا يفكّر فيها بعد التركيب.',
      'من يريد أرقاماً موثّقة لا وعوداً على الصندوق.',
    ],
    notFor: [
      'من يحتاج مخرج جهد من المسرّعات: اختر نسخة 65 أمبير.',
      'البناءات الصغيرة — هذه لوحة مقاس 30.5 مم.',
    ],
    highlights: [
      'نسخة 45 أمبير: 12 غراماً و40 × 33 × 5 مم',
      'نسخة 65 أمبير: 15 غراماً ومخرج 5 فولت بتيار 0.6 أمبير',
      'معالج ثنائي وثلاثون بت بتردّد نبضات من 48 إلى 96 كيلوهرتز',
    ],
    inBox: ['اللوحة', 'كابلات', 'مكثّف'],
    alternatives: ['speedybee-bls-50a', 'tmotor-f55a-pro-ii'],
    learn: [{ kind: 'article', targetId: 'esc-what-is', label: 'ما وظيفة المسرّع' }],
    variants: [
      {
        id: 'a45', nameAr: '45 أمبير — بلا مخرج جهد', kind: 'single', isDefault: true,
        inBox: ['اللوحة', 'كابلات', 'مكثّف'],
      },
      {
        id: 'a65', nameAr: '65 أمبير — بمخرج 5 فولت', kind: 'single',
        inBox: ['اللوحة', 'كابلات', 'مكثّف'],
      },
    ],
  }),
  product({
    id: 'tmotor-f55a-pro-ii',
    level: 'advanced',
    categoryId: 'escs',
    nameEn: 'T-Motor F55A Pro II',
    titleAr: 'مسرّعات 55 أمبير بمخرج 10 فولت',
    brandAr: 'T-Motor',
    pos: 'pro',
    summaryAr:
      'خمسة وخمسون أمبيراً مستمرّة وخمسة وسبعون ذروة على 3 إلى 6S، ومخرج 10 فولت '
      + 'بتيّار أمبيرين — وهذا المخرج هو سبب شرائها غالباً: مرسلات الفيديو القوية '
      + 'تريد 10 فولت لا 5.',
    suits: [
      'تركيبة 6S بمحرّكات قوية أو مقاس أكبر من خمس إنشات.',
      'بناء بمرسل فيديو يحتاج 10 فولت.',
    ],
    notFor: [
      'تركيبة صغيرة — طاقة زائدة ووزن زائد بلا فائدة.',
      'من يريد ضبط برنامج المسرّع بنفسه: راجع الملاحظة على برنامجه في المواصفات.',
    ],
    highlights: [
      '55 أمبير مستمر و75 ذروة',
      'مخرج 10 فولت بتيّار 2 أمبير لمرسل الفيديو',
      'يقبل من 3S إلى 6S',
    ],
    inBox: ['اللوحة', 'كابلات', 'مكثّف'],
    alternatives: ['hobbywing-xrotor-g2', 'speedybee-bls-50a'],
  }),

  // ── frames ──────────────────────────────────────────────────────────────
  product({
    id: 'tbs-source-one-v5-frame',
    level: 'beginner',
    categoryId: 'frames',
    // TBS's own page is «V5.1», and a V6 now sits beside it. The bare «V5»
    // was a name they never used.
    nameEn: 'TBS Source One V5.1 Frame',
    titleAr: 'هيكل خمس إنشات مفتوح المصدر',
    brandAr: 'Team BlackSheep',
    pos: 'entry',
    summaryAr:
      'أرخص مدخل معقول إلى بناء طائرة خمس إنشات. الشركة تبرّعت بالتصميم للمجتمع '
      + 'ونشرت ملفّاته، ولهذا تُصنَّع قطعه على نطاق واسع وتُباع مفردة — فذراع مكسورة '
      + 'تكلّف ثمن ذراع لا ثمن هيكل. الجيل التالي V6 متاح أيضاً بأذرعه المستقلّة.',
    suits: [
      'أوّل عملية بناء، حيث ستُكسر أذرع كثيرة.',
      'من يريد قطع غيار يجدها بعد سنوات.',
    ],
    notFor: [
      'من يريد أخفّ وأمتن هيكل ممكن — هذا هيكل اقتصادي.',
      'من يريد ضماناً على الكربون: راجع Marmotte.',
    ],
    highlights: [
      'شكل X واسع المسافة للفريستايل',
      'تصميم مفتوح وملفّاته منشورة — قطعه تُصنَّع في كل مكان',
      'الجيل التالي V6 متاح بأذرع بديلة مستقلّة',
    ],
    inBox: ['ألواح الهيكل', 'براغي'],
    alternatives: ['armattan-marmotte', 'impulserc-apex'],
  }),
  product({
    id: 'impulserc-apex',
    level: 'advanced',
    categoryId: 'frames',
    // The Apex line moved to EVO. Selling «Apex» plain is selling a generation
    // that the manufacturer has moved past.
    nameEn: 'ImpulseRC ApexDC EVO 5"',
    titleAr: 'هيكل فريستايل بأذرع أمامية وخلفية مختلفة',
    brandAr: 'ImpulseRC',
    pos: 'pro',
    summaryAr:
      'هيكل يُشترى لسبب واحد: أن يبقى سليماً بعد ما يكسر غيره. نسخة DC من الجيل '
      + 'الحالي تستعمل أذرعاً أمامية بمقاس 5 إنشات وخلفية بمقاس 6 — وهذا ما يُبعد '
      + 'المراوح عن مجال الكاميرا. أغلى بوضوح، ومن يشتريه يحسبه على أذرع لن يستبدلها.',
    suits: [
      'من يطير فريستايل ويصطدم كثيراً.',
      'من يريد لقطة أنظف بأذرع خلفية أطول.',
    ],
    notFor: [
      'أوّل عملية بناء — ادفع الفرق بعد أن تعرف ماذا تريد.',
      'من يبحث عن أرخص هيكل: راجع Source One.',
    ],
    highlights: [
      'أذرع أمامية 5 إنشات وخلفية 6 إنشات في نسخة DC',
      'نسخة Micro Apex بوزن 67 غراماً للكربون والمسامير',
      'نسخة ApexLR للمدى الطويل بأذرع 5.5 مم',
    ],
    inBox: ['ألواح الهيكل', 'براغي'],
    availability: 'needs-confirmation',
    alternatives: ['armattan-marmotte', 'tbs-source-one-v5-frame'],
  }),

  // ── batteries ───────────────────────────────────────────────────────────
  product({
    id: 'tattu-r-line-v5-6s',
    level: 'advanced',
    categoryId: 'batteries',
    nameEn: 'Tattu R-Line Version 5.0 6S',
    titleAr: 'بطارية سباق 6S بمعدّل تفريغ 150C',
    brandAr: 'Tattu',
    pos: 'pro',
    summaryAr:
      'بطارية تُشترى للأداء تحت الحمل العالي لا للسعر. الفرق يظهر في آخر ثلاثين '
      + 'ثانية من الطيران. السعة ليست تفصيلاً: 850 ميلي أمبير/ساعة تزن 145 غراماً '
      + 'و2200 تزن 346 — وهذا فرق يغيّر إحساس الطائرة كلّه، لا زمن طيرانها فقط.',
    suits: [
      'السباق والفريستايل الحادّ حيث يظهر فرق البطارية.',
      'من يعرف السعة التي يريدها ويريد أفضل ما فيها.',
    ],
    notFor: [
      'الطيران العادي — ستدفع فرقاً لن تشعر به.',
      'من لم يقس مكان البطارية في هيكله: الأبعاد تختلف كثيراً بين السعات.',
    ],
    highlights: [
      'معدّل تفريغ 150C على كل السعات',
      'ثماني سعات من 850 إلى 2200 ميلي أمبير/ساعة',
      'سعة 850 بموصّل XT30U-F لا XT60',
    ],
    inBox: ['البطارية'],
    alternatives: ['cnhl-black-series-6s', 'cnhl-black-series-4s'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'التخزين والشحن الآمن' }],
    variants: [
      {
        id: 'mah1050', nameAr: '1050 ميلي أمبير/ساعة — 186 غراماً', kind: 'single',
        isDefault: true, inBox: ['البطارية'],
      },
      { id: 'mah1400', nameAr: '1400 ميلي أمبير/ساعة', kind: 'single', inBox: ['البطارية'] },
      {
        id: 'mah2200', nameAr: '2200 ميلي أمبير/ساعة — 346 غراماً', kind: 'single',
        inBox: ['البطارية'],
      },
    ],
  }),

  // ── chargers ────────────────────────────────────────────────────────────
  product({
    id: 'isdt-608ac',
    level: 'beginner',
    categoryId: 'chargers',
    nameEn: 'ISDT 608AC',
    titleAr: 'شاحن يعمل من الكهرباء مباشرة',
    brandAr: 'ISDT',
    pos: 'entry',
    summaryAr:
      'شاحن بمنفذ كهرباء مدمج — لا يحتاج مزوّد طاقة منفصلاً، وهذا هو الفرق العملي '
      + 'للمبتدئ: قطعة واحدة بدل قطعتين. لكن انتبه للرقم: من الكهرباء مباشرة يعطي '
      + '50 واط فقط، ولا يبلغ 200 واط إلّا من مصدر مستمرّ خارجي.',
    suits: [
      'أوّل شاحن، حيث كل قطعة إضافية عائق.',
      'شحن بطارية أو بطاريتين في المساء لا أسطول بطاريات.',
    ],
    notFor: [
      'من يشحن عدّة بطاريات في وقت واحد — راجع الخيار المزدوج.',
      'من يريد 200 واط من مقبس الحائط: هذا الرقم لمصدر مستمرّ.',
    ],
    highlights: [
      '50 واط من الكهرباء مباشرة، و200 واط من مصدر مستمرّ',
      'خرج من 2 إلى 30 فولت بتيّار حتى 5 أمبير',
      'جهد كل خليّة ومقاومتها لا يظهران إلّا في وضع الموازنة',
    ],
    inBox: ['الشاحن', 'كابل الكهرباء'],
    alternatives: ['isdt-q6-charger', 'hota-d6-pro'],
    learn: [{ kind: 'article', targetId: 'battery-safety', label: 'الشحن الآمن' }],
  }),
  product({
    id: 'hota-d6-pro',
    level: 'intermediate',
    categoryId: 'chargers',
    nameEn: 'HOTA D6 Pro',
    titleAr: 'شاحن مزدوج لبطاريتين معاً',
    brandAr: 'HOTA',
    pos: 'pro',
    summaryAr:
      'قناتان تشحنان بطاريتين في وقت واحد. من يملك ست بطاريات ويطير يوماً كاملاً '
      + 'يعرف لماذا هذا فرق حقيقي وليس رفاهية. ملاحظة صريحة: لم نعثر على صفحة رسمية '
      + 'للشركة لهذا الطراز، فلا مواصفة هنا موثّقة — وما تجده عند الباعة لم نَنقله.',
    suits: [
      'من يملك عدّة بطاريات ويطير جلسات طويلة.',
      'من يشحن أنواعاً مختلفة من البطاريات لا الليبو وحدها.',
    ],
    notFor: [
      'من يملك بطاريتين — القناة الواحدة تكفيك.',
      'من يريد مواصفات موثّقة من المصنّع قبل الشراء: هذه ليست متاحة لهذا الطراز.',
    ],
    highlights: [
      'قناتان مستقلّتان تشحنان معاً',
      'يشحن أنواعاً مختلفة من البطاريات',
      'مواصفاته غير موثّقة من المصنّع — راجع الشريط أدناه',
    ],
    inBox: ['الشاحن', 'كابلات'],
    alternatives: ['isdt-q6-charger', 'isdt-608ac'],
  }),

  // ── cameras ─────────────────────────────────────────────────────────────
  product({
    id: 'runcam-phoenix-2',
    level: 'intermediate',
    video: 'analog',
    categoryId: 'cameras',
    nameEn: 'RunCam Phoenix 2',
    titleAr: 'كاميرا تماثلية شائعة في الفريستايل',
    brandAr: 'RunCam',
    pos: 'entry',
    summaryAr:
      'من أكثر الكاميرات التماثلية استعمالاً. تُشترى لأنها معروفة السلوك: كثيرون '
      + 'يطيرون بها، فما تراه في مقاطعهم هو ما سترى.',
    suits: ['بناء تماثلي جديد أو استبدال كاميرا تالفة.'],
    notFor: ['من يطير بنظام رقمي — الكاميرا جزء من وحدة الفيديو هناك.'],
    highlights: ['شائعة فسلوكها معروف', 'قطع تركيب متوفّرة'],
    inBox: ['الكاميرا', 'كابل', 'براغي'],
    learn: [{ kind: 'article', targetId: 'video-cameras', label: 'كيف تختار كاميرا الطيران' }],
  }),
  product({
    id: 'foxeer-razer-micro',
    level: 'beginner',
    video: 'analog',
    categoryId: 'cameras',
    nameEn: 'Foxeer Razer Micro',
    titleAr: 'كاميرا تماثلية اقتصادية',
    brandAr: 'Foxeer',
    pos: 'entry',
    summaryAr:
      'الخيار الاقتصادي المعقول. لن تتفوّق على الكاميرات الأعلى في الإضاءة الصعبة، '
      + 'لكنها تفعل ما يلزم — وهي القطعة الأولى التي تُكسر في الاصطدام.',
    suits: ['أوّل بناء، أو استبدال متكرّر بعد الاصطدامات.'],
    notFor: ['التصوير في إضاءة صعبة — ادفع فرق الكاميرا الأعلى.'],
    highlights: ['سعر منخفض لقطعة تُكسر كثيراً', 'تركيب قياسي'],
    inBox: ['الكاميرا', 'كابل', 'براغي'],
  }),

  // ── VTX ─────────────────────────────────────────────────────────────────
  product({
    id: 'tbs-unify-pro32-nano',
    level: 'intermediate',
    video: 'analog',
    categoryId: 'vtx',
    nameEn: 'TBS Unify Pro32 Nano',
    titleAr: 'مرسل فيديو صغير معروف الثبات',
    brandAr: 'Team BlackSheep',
    pos: 'entry',
    summaryAr:
      'مرسل صغير يُستعمل في المقاسات الضيّقة. يُشترى لثباته: مرسل يغيّر قناته '
      + 'من تلقاء نفسه هو مشكلة لكلّ من يطير معك، لا لك وحدك.',
    suits: ['بناء صغير أو متوسّط يحتاج مرسلاً موثوقاً.'],
    notFor: ['من يحتاج أقصى طاقة إرسال — راجع الخيار الأعلى.'],
    highlights: ['حجم صغير', 'ضبط القناة من Betaflight'],
    inBox: ['المرسل', 'كابل'],
    learn: [{ kind: 'video', targetId: 'bf-vtx-tables', label: 'جداول VTX في Betaflight' }],
  }),
  product({
    id: 'foxeer-reaper-extreme',
    level: 'advanced',
    video: 'analog',
    categoryId: 'vtx',
    nameEn: 'Foxeer Reaper Extreme',
    titleAr: 'مرسل فيديو عالي الطاقة للمدى الطويل',
    brandAr: 'Foxeer',
    pos: 'pro',
    summaryAr:
      'طاقة إرسال عالية للمسافات الطويلة. الطاقة العالية ليست مجّانية: حرارة أعلى، '
      + 'واستهلاك أعلى، وقيود قانونية تختلف من بلد إلى بلد — تحقّق قبل الشراء.',
    suits: ['الطيران الطويل حيث تفقد الصورة قبل أن تفقد التحكّم.'],
    notFor: ['الطيران القريب — طاقة زائدة تشوّش على من حولك.'],
    highlights: ['طاقة إرسال عالية', 'مستويات طاقة قابلة للضبط'],
    inBox: ['المرسل', 'كابل'],
    learn: [{ kind: 'video', targetId: 'bf-vtx-tables', label: 'ضبط مستويات الطاقة' }],
  }),

  // ── digital air units ───────────────────────────────────────────────────
  product({
    id: 'walksnail-avatar-hd-pro',
    level: 'intermediate',
    video: 'walksnail',
    categoryId: 'air-units',
    nameEn: 'Walksnail Avatar HD Pro Kit',
    titleAr: 'وحدة فيديو رقمية بديلة عن نظام DJI',
    brandAr: 'Walksnail',
    pos: 'entry',
    summaryAr:
      'نظام رقمي كامل من شركة أخرى. المهمّ قبل الشراء: النظام الرقمي مغلق — الوحدة '
      + 'تعمل مع نظّارة النظام نفسه فقط، لا مع أي نظّارة أخرى.',
    suits: ['من يريد صورة رقمية ولا يريد الارتباط بنظام DJI.'],
    notFor: ['من يملك نظّارة DJI أو HDZero — الأنظمة لا تتبادل.'],
    highlights: ['نظام رقمي كامل', 'وحدة أصغر من بعض البدائل'],
    inBox: ['الوحدة', 'الكاميرا', 'الهوائي', 'كابلات'],
  }),
  product({
    id: 'hdzero-freestyle-v2',
    level: 'advanced',
    video: 'hdzero',
    categoryId: 'air-units',
    nameEn: 'HDZero Freestyle V2 VTX',
    titleAr: 'وحدة رقمية بزمن تأخير منخفض',
    brandAr: 'HDZero',
    pos: 'middle',
    summaryAr:
      'نظام رقمي يركّز على قصر زمن التأخير أكثر من دقّة الصورة — وهو المقايضة التي '
      + 'يختارها من يسابق. مغلق كغيره: يحتاج نظّارة النظام نفسه.',
    suits: ['السباق والفريستايل السريع حيث التأخير أهمّ من الدقّة.'],
    notFor: ['من يريد أوضح صورة ممكنة للتصوير.'],
    highlights: ['زمن تأخير منخفض', 'يعمل مع نظّارات النظام نفسه'],
    inBox: ['الوحدة', 'الكاميرا', 'كابلات'],
    alternatives: ['dji-o3-air-unit'],
  }),

  // ── GPS ─────────────────────────────────────────────────────────────────
  product({
    id: 'holybro-m10-gps',
    level: 'intermediate',
    categoryId: 'gps',
    nameEn: 'Holybro M10 GPS',
    titleAr: 'وحدة GPS من جيل حديث',
    brandAr: 'Holybro',
    pos: 'entry',
    summaryAr:
      'وحدة GPS للطائرات الصغيرة. تُركَّب عادةً لتسجيل مكان السقوط — وهذا وحده يبرّر '
      + 'ثمنها لمن يطير فوق مساحات واسعة.',
    suits: ['الطيران الطويل، وإيجاد الطائرة بعد السقوط.'],
    notFor: ['الطيران داخل البيت — لا إشارة ولا فائدة.'],
    highlights: ['حجم صغير', 'يعمل مع Betaflight'],
    inBox: ['الوحدة', 'كابل'],
    learn: [{ kind: 'betaflight', targetId: 'gps', label: 'إعداد GPS في Betaflight' }],
  }),
  product({
    id: 'flywoo-goku-gm10-pro',
    level: 'advanced',
    categoryId: 'gps',
    nameEn: 'Flywoo GOKU GM10 Pro',
    titleAr: 'وحدة GPS مدمجة مع بوصلة',
    brandAr: 'Flywoo',
    pos: 'pro',
    summaryAr:
      'GPS وبوصلة في وحدة واحدة. البوصلة تلزم بعض وظائف العودة التلقائية، ودمجها '
      + 'يوفّر قطعة وكابلاً على طائرة ضيّقة المساحة.',
    suits: ['تركيبة تحتاج بوصلة ولا تملك مكاناً لقطعتين.'],
    notFor: ['تركيبة لا تستعمل وظائف تحتاج بوصلة.'],
    highlights: ['GPS وبوصلة في قطعة واحدة', 'يوفّر مساحة وكابلاً'],
    inBox: ['الوحدة', 'كابل'],
    learn: [{ kind: 'betaflight', targetId: 'gps', label: 'صفحة GPS' }],
  }),

  // ── receivers ───────────────────────────────────────────────────────────
  product({
    id: 'happymodel-ep1-elrs',
    level: 'beginner',
    link: 'elrs',
    categoryId: 'receivers',
    nameEn: 'HappyModel EP1 (ExpressLRS)',
    titleAr: 'مستقبِل ExpressLRS صغير ورخيص',
    brandAr: 'HappyModel',
    pos: 'entry',
    summaryAr:
      'من أكثر مستقبِلات ExpressLRS انتشاراً في المقاسات الصغيرة. يُشترى غالباً '
      + 'أكثر من واحد: المستقبِل من القطع التي تُفقد مع الطائرة.',
    suits: ['أي بناء صغير يعمل بـ ExpressLRS.'],
    notFor: ['من يستعمل نظام تحكّم آخر — المستقبِل يجب أن يطابق مرسلك.'],
    highlights: ['حجم صغير جداً', 'شائع فالدعم متوفّر'],
    inBox: ['المستقبِل', 'هوائي'],
    learn: [{ kind: 'elrs-setup', targetId: 'binding', label: 'كيف يتمّ الربط' }],
  }),
  product({
    id: 'betafpv-superd-elrs',
    level: 'advanced',
    link: 'elrs',
    categoryId: 'receivers',
    nameEn: 'BetaFPV SuperD (ExpressLRS)',
    titleAr: 'مستقبِل بهوائيين لتغطية أفضل',
    brandAr: 'BetaFPV',
    pos: 'pro',
    summaryAr:
      'مستقبِل بهوائيين يختار بينهما — يقلّل انقطاع الإشارة حين تدور الطائرة بحيث '
      + 'يحجب جسمها هوائياً واحداً. للطيران الطويل أو خلف العوائق.',
    suits: ['المدى الطويل، والطيران حيث يحجب جسم الطائرة الإشارة.'],
    notFor: ['البناء الصغير — أكبر وأثقل ممّا يلزم.'],
    highlights: ['هوائيان لتغطية أفضل', 'يقلّل الانقطاع المفاجئ'],
    inBox: ['المستقبِل', 'هوائيان'],
    learn: [{ kind: 'elrs-setup', targetId: 'binding', label: 'الربط والإعداد' }],
  }),

  // ── antennas ────────────────────────────────────────────────────────────
  product({
    id: 'lumenier-axii-2',
    level: 'beginner',
    video: 'analog',
    categoryId: 'antennas',
    nameEn: 'Lumenier AXII 2',
    titleAr: 'هوائي فيديو معروف ومتين',
    brandAr: 'Lumenier',
    pos: 'entry',
    summaryAr:
      'هوائي دائري الاستقطاب من أكثر ما يُستعمل. الهوائي أرخص قطعة تحسّن الصورة، '
      + 'وأوّل ما يُكسر في الاصطدام — فاشترِ اثنين.',
    suits: ['أي نظام تماثلي، على الطائرة أو على النظّارة.'],
    notFor: ['الأنظمة الرقمية — لها هوائياتها الخاصّة.'],
    highlights: ['شائع ومتين', 'يحسّن الصورة بأقلّ كلفة'],
    inBox: ['الهوائي'],
  }),
  product({
    id: 'foxeer-lollipop-4',
    level: 'beginner',
    video: 'analog',
    categoryId: 'antennas',
    nameEn: 'Foxeer Lollipop 4',
    titleAr: 'هوائي فيديو خفيف ومرن',
    brandAr: 'Foxeer',
    pos: 'entry',
    summaryAr:
      'خفيف ومرن، فيتحمّل الانثناء بدل أن ينكسر. الخيار المعتاد لمن يصطدم كثيراً '
      + 'ولا يريد استبدال هوائي بعد كلّ جلسة.',
    suits: ['الفريستايل والتعلّم، حيث الاصطدام متكرّر.'],
    notFor: ['من يبحث عن أقصى مدى ممكن — راجع الهوائيات الاتجاهية.'],
    highlights: ['خفيف ومرن', 'سعر منخفض'],
    inBox: ['الهوائي'],
    alternatives: ['lumenier-axii-2'],
  }),

  // ── accessories ─────────────────────────────────────────────────────────
  product({
    id: 'gemfan-hurricane-51466',
    level: 'beginner',
    categoryId: 'accessories',
    nameEn: 'Gemfan Hurricane 51466',
    titleAr: 'مراوح خمس إنشات — القطعة الأكثر استهلاكاً',
    brandAr: 'Gemfan',
    pos: 'middle',
    summaryAr:
      'المراوح هي ما تكسره في كلّ جلسة تقريباً، وتُباع بالطقم لهذا السبب. مروحة '
      + 'مشروخة تسبّب اهتزازاً يُفسد الطيران قبل أن تنكسر تماماً — فافحصها بعد كلّ سقوط.',
    suits: ['كل من يطير خمس إنشات. اشترِ أكثر ممّا تظنّ.'],
    notFor: ['المقاسات الأخرى — المروحة يجب أن تطابق المقاس.'],
    highlights: ['تُباع بالطقم', 'المقاس الأكثر شيوعاً'],
    inBox: ['طقم مراوح'],
    learn: [{ kind: 'article', targetId: 'prop-damage-safety', label: 'متى تُستبدل المروحة' }],
  }),
  product({
    id: 'battery-strap-set',
    level: 'beginner',
    categoryId: 'accessories',
    nameEn: 'Battery Strap Set',
    titleAr: 'أحزمة تثبيت البطارية',
    brandAr: 'عام',
    pos: 'entry',
    summaryAr:
      'قطعة صغيرة يُستهان بها: حزام تالف يعني بطارية تنفلت في الجوّ. تتمدّد '
      + 'بالاستعمال وتفقد قبضتها تدريجياً، فتُستبدل دورياً لا عند انقطاعها.',
    suits: ['كل طائرة تُثبَّت بطاريتها بحزام.'],
    notFor: ['لا أحد. تُستهلك وتُستبدل.'],
    highlights: ['تُستبدل قبل أن تنقطع', 'رخيصة مقابل ما تمنعه'],
    inBox: ['أحزمة'],
  }),
];


/**
 * Services appear in the catalogue as products.
 *
 * Appended rather than written inline so their definition stays in
 * `services.ts` with what they actually include — but from here on the cart,
 * the order and the admin panel see them as ordinary products, which is the
 * whole reason for modelling them this way.
 */
export const STORE_PRODUCTS: StoreProduct[] = withRelationships([
  // Specifications are attached here rather than written inline above, because
  // they have a different lifecycle: the catalogue says what a product IS and
  // changes when the shop's selection changes, while `launch.ts` records what a
  // manufacturer page said on a particular day and changes when somebody
  // re-reads it. Keeping them apart means a re-verification round touches one
  // file and reviews as one diff.
  ...STORE_CATALOGUE.map(p => (LAUNCH_SPECS[p.id] ? { ...p, specs: LAUNCH_SPECS[p.id] } : p)),
  ...STORE_SERVICES.map(svc => serviceAsProduct(svc, REVIEWED)),
  // «أو هذا بدلاً منه» and «ستحتاج أيضاً», derived from the sections rather
  // than hand-written per product — see `relationships.ts` for why, and for the
  // line between «this section's other options» and a compatibility claim this
  // shop cannot make.
]);

const productById = new Map(STORE_PRODUCTS.map(p => [p.id, p]));

export function storeProduct(id: string): StoreProduct | undefined {
  return productById.get(id);
}

/**
 * Everything shown in a section — the products that live in it, plus the ones
 * that belong to it as a use case.
 *
 * Ordered along the section's own axis, so the three read as a choice rather
 * than as a list: economy, then middle, then professional.
 *
 * WHY IT TAKES THE LIST RATHER THAN READING THE CATALOGUE
 * -------------------------------------------------------
 * Because the web renders a MERGED catalogue — the seeds with the admin's
 * changes applied — and it has to select from that list by the same two rules
 * this function encodes. An earlier version of the web's section page
 * reimplemented the filter as `p.categoryId === id` and silently lost both the
 * `collections` membership and the axis ordering: «الطائرات السينمائية» went to
 * zero products and every other section fell out of order. One rule, one
 * function, given whichever list the caller has.
 */
export function sectionMembers<P extends {
  categoryId: string; collections: string[]; choicePosition: string;
}>(products: readonly P[], categoryId: string): P[] {
  const order: Record<string, number> = { entry: 0, middle: 1, pro: 2, variant: 3 };
  return products
    .filter(p => p.categoryId === categoryId || p.collections.includes(categoryId))
    .sort((a, b) => order[a.choicePosition] - order[b.choicePosition]);
}

/**
 * A section's members that a customer may actually see.
 *
 * SEPARATE FROM `sectionMembers`, AND THE SEPARATION IS THE POINT
 * ---------------------------------------------------------------
 * Curation and publication are different questions. «Does this section offer a
 * real choice» is about what the catalogue CONTAINS — three to five products
 * spanning a decision — and it is answered by `sectionMembers`. «What may a
 * customer see today» is about what has cleared the publication gate, and it is
 * answered here. Conflating them produced a test that said the shop was
 * well-curated because everything happened to be published, and would have said
 * it was badly curated the moment somebody hid a product for a week.
 */
export function selectCategory<P extends {
  categoryId: string; collections: string[]; choicePosition: string; published: boolean;
}>(products: readonly P[], categoryId: string): P[] {
  return sectionMembers(products, categoryId).filter(p => p.published);
}

/** Everything the catalogue puts in a section, published or not. */
export function productsInCategory(categoryId: string): StoreProduct[] {
  return sectionMembers(STORE_PRODUCTS, categoryId);
}

export function categoryProductCount(categoryId: string): number {
  return productsInCategory(categoryId).length;
}
