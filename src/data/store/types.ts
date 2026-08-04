/**
 * The store's data model.
 *
 * WHAT THIS STORE IS
 * ------------------
 * Not a catalogue. A catalogue answers «ما المتوفر»; this answers «أيّها
 * يناسبك». Every section holds three to five products chosen to span a real
 * decision — economy / middle / professional, or drone-only / with-camera /
 * full combo — so a reader who does not yet know what they need can still tell
 * the options apart. A section with twenty products has stopped making that
 * decision on the reader's behalf and handed it back to them.
 *
 * THE ONE STRUCTURAL DECISION EVERYTHING ELSE FOLLOWS FROM
 * --------------------------------------------------------
 * Firestore rules allow or deny a WHOLE DOCUMENT. They cannot hide a field.
 * So a product document that carried `supplierUrl` and `unitCost` would expose
 * both to anyone who can read the price — no rule can prevent it, and a client
 * that reads the document reads all of it.
 *
 * Therefore the supply side lives in its own collection, `storeSupply`, which
 * no non-staff account may read at all. The public product carries the FINAL
 * price and nothing from which the cost can be recovered.
 *
 * The margin is private for the same reason and it is easy to miss: publishing
 * both the price and the margin lets anyone compute the cost by division. A
 * store that leaks its own margins to competitors and customers has published
 * its supplier list in a slightly harder-to-read form.
 *
 * WHY THE PRICE IS STORED RATHER THAN COMPUTED ON READ
 * ----------------------------------------------------
 * Because computing it on read would require the inputs to be readable. The
 * price is computed once, server-side, by whoever is allowed to see the cost,
 * and written onto the public document as a plain number.
 *
 * WHAT MAY NEVER BE WRITTEN INTO THIS FILE
 * ----------------------------------------
 * A price, a stock level, or a specification this platform has not verified.
 * The whole encyclopedia is built on «لا تخترع» — a fabricated voltage in a
 * product's spec sheet is the same failure as a fabricated one in an article,
 * except that this one takes the reader's money first.
 */

import type { KbLink } from '../kb/types';

/* ── Money ────────────────────────────────────────────────────────────────── */

/**
 * Money as integer minor units, never a float.
 *
 * `0.1 + 0.2 !== 0.3` is a curiosity in most code and a wrong invoice here.
 * Every amount in the store is an integer number of cents in its currency, and
 * the only place a decimal point appears is in formatting for display.
 */
export type Minor = number;

export type CurrencyCode = 'USD' | 'SAR' | 'AED' | 'EGP';

export interface CurrencyMeta {
  code: CurrencyCode;
  labelAr: string;
  /** Minor units per major unit — 100 for cents, and not 100 everywhere. */
  minorPerMajor: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: 'USD', labelAr: 'دولار', minorPerMajor: 100 },
  SAR: { code: 'SAR', labelAr: 'ريال', minorPerMajor: 100 },
  AED: { code: 'AED', labelAr: 'درهم', minorPerMajor: 100 },
  EGP: { code: 'EGP', labelAr: 'جنيه', minorPerMajor: 100 },
};

/* ── Categories ───────────────────────────────────────────────────────────── */

/**
 * How a section presents its three-to-five products.
 *
 * The axis is part of the section, not of the product, because it is an
 * editorial decision about what makes the options in THIS section different.
 * Drone sections differ by what is in the box; component sections differ by
 * how much you are spending.
 */
export type ChoiceAxis =
  /** درون فقط · مع الكاميرا · Combo كامل */
  | 'completeness'
  /** اقتصادي · متوسط · احترافي */
  | 'budget'
  /** حسب المنظومة — DJI · Walksnail · HDZero · Analog */
  | 'ecosystem'
  /** حسب الاستخدام — سباق · فريستايل · مدى طويل */
  | 'use-case';

export interface StoreCategory {
  id: string;
  titleAr: string;
  titleEn: string;
  /** One line: what this section is for. Never a marketing sentence. */
  blurbAr: string;
  /** Which of the store's two top-level groups this sits in. */
  group: 'aircraft' | 'components';
  choiceAxis: ChoiceAxis;
  /** Display order inside its group. */
  order: number;
  /**
   * The knowledge module a buyer should read before choosing here.
   *
   * The store's one real advantage over every competitor: it sits on top of an
   * encyclopedia. A section that cannot name what to read before buying is a
   * section that is selling without helping.
   */
  learnLink?: KbLink;
}

/* ── Products ─────────────────────────────────────────────────────────────── */

/** Where a product sits on its section's axis, so the three read as a choice. */
export type ChoicePosition = 'entry' | 'middle' | 'pro' | 'variant';

export const CHOICE_POSITION_LABEL_AR: Record<ChoiceAxis, Record<ChoicePosition, string>> = {
  completeness: { entry: 'الطائرة فقط', middle: 'مع الكاميرا', pro: 'Combo كامل', variant: 'خيار آخر' },
  budget: { entry: 'اقتصادي', middle: 'متوسط', pro: 'احترافي', variant: 'خيار آخر' },
  ecosystem: { entry: 'تناظري', middle: 'رقمي', pro: 'رقمي متقدّم', variant: 'منظومة أخرى' },
  'use-case': { entry: 'مبتدئ', middle: 'متوسط', pro: 'متقدّم', variant: 'استخدام آخر' },
};

/**
 * Where a technical claim came from, ranked.
 *
 * The order is the order of authority, and it is not a formality: a wheelbase
 * from the manufacturer's own page and a wheelbase from a marketplace title are
 * not the same claim, and a shop that treats them the same will eventually sell
 * somebody the wrong frame. `reseller` exists for COMMERCIAL facts — what is in
 * the box of a particular bundle, what a supplier actually ships — where the
 * reseller is the authority and the manufacturer is not.
 */
export type SpecSourceKind =
  /** The manufacturer's own product page. */
  | 'manufacturer-page'
  /** The manufacturer's manual or datasheet. Beats the page when they differ. */
  | 'manufacturer-manual'
  /** A reseller's listing. Authoritative for what a bundle contains, not for physics. */
  | 'reseller'
  /** A named independent review. Used only to CORROBORATE, never as the sole source. */
  | 'independent-review';

export const SPEC_SOURCE_LABEL_AR: Record<SpecSourceKind, string> = {
  'manufacturer-page': 'صفحة الشركة الرسمية',
  'manufacturer-manual': 'الدليل الرسمي',
  reseller: 'المورد',
  'independent-review': 'مراجعة مستقلة',
};

export interface SpecSource {
  kind: SpecSourceKind;
  /** What the page is, so a dead link is still traceable. */
  titleAr: string;
  url: string;
  /** When a human last opened it. */
  checkedAt: string;
}

/**
 * What we know about a claim, as three states rather than a boolean.
 *
 * `disputed` is the one that had to exist. Sources DO disagree — a marketplace
 * says 80mm and the manufacturer says 80.8mm — and the two ways a shop usually
 * handles that are both wrong: pick one silently, or average them. Recording
 * the disagreement and showing the official figure is the third option, and it
 * is the only one that survives somebody checking.
 */
export type SpecStatus = 'verified' | 'pending' | 'disputed';

export const SPEC_STATUS_LABEL_AR: Record<SpecStatus, string> = {
  verified: 'مؤكَّدة',
  pending: 'بانتظار التأكيد',
  disputed: 'المصادر مختلفة',
};

/**
 * A specification row.
 *
 * Nothing here is written from memory. A row is `verified` only when somebody
 * opened the source in `source` on the date in `source.checkedAt` and read the
 * value off it; anything else is `pending` and renders as such.
 *
 * WHY THE UNIT IS SEPARATE FROM THE VALUE
 * ---------------------------------------
 * Because «80.8» and «mm» belong to different languages. The value is a Latin
 * numeral that must render left-to-right inside a right-to-left sentence, and
 * the unit is Arabic prose. Concatenating them produces the bidirectional mess
 * that every Arabic spec table has, and separating them lets the page mark each
 * one's direction correctly.
 */
export interface ProductSpec {
  labelAr: string;
  /** The figure itself, as the source states it. Rendered LTR. */
  valueAr: string;
  /** «مم», «غرام», «كيلوفولت». Rendered RTL beside the value. */
  unitAr?: string;
  status: SpecStatus;
  /** Required whenever `status` is «verified». */
  source?: SpecSource;
  /** What the other source said. Required whenever `status` is «disputed». */
  disagreementAr?: string;
  /**
   * Set when the figure differs between variants.
   *
   * A 1S whoop and its 2S sibling do not weigh the same, and a spec table that
   * shows one weight for both is wrong for one of them.
   */
  variantId?: string;
}

/** A spec is only publishable as a fact when it says where it came from. */
export function isSpecVerified(s: ProductSpec): boolean {
  return s.status === 'verified' && !!s.source?.url && !!s.source?.checkedAt;
}

/**
 * Whether we can actually get one.
 *
 * A supplier having a page is not stock. These seven states exist because the
 * difference between «we have checked and it ships» and «there is a listing and
 * we assume» is the difference between a shop and a catalogue of hopes — and
 * the customer finds out which it was three weeks later.
 */
export type Availability =
  | 'in-stock'
  /** Confirmed, but the supplier's quantity is low enough to run out mid-order. */
  | 'limited'
  /** Ordered from the supplier when you order it. Longer, and honest about it. */
  | 'made-to-order'
  /**
   * Listed, but nobody has confirmed stock recently.
   *
   * Orderable is a POLICY decision, not a data one — see `canOrder`. The state
   * exists so «we are not sure» is expressible without pretending either way.
   */
  | 'needs-confirmation'
  | 'out-of-stock'
  /** The manufacturer stopped making it. Not coming back; replace the listing. */
  | 'discontinued'
  /** Listed, described, and deliberately not yet purchasable. */
  | 'coming-soon';

export const AVAILABILITY_LABEL_AR: Record<Availability, string> = {
  'in-stock': 'متوفر',
  limited: 'توفر محدود',
  'made-to-order': 'يُطلب من المورد',
  'needs-confirmation': 'يحتاج تأكيداً',
  'out-of-stock': 'غير متوفر حالياً',
  discontinued: 'متوقف',
  'coming-soon': 'قريباً',
};

/** The states in which a customer may actually place an order. */
export const ORDERABLE_AVAILABILITY: readonly Availability[] = [
  'in-stock', 'limited', 'made-to-order',
];

/**
 * Who a product is for, in one word.
 *
 * Kept to three because a shop is not a syllabus. «متقدّم» on a 7-inch build
 * is a warning, not a compliment, and that is the whole job of this field.
 */
export type BuyerLevel = 'beginner' | 'intermediate' | 'advanced';

export const BUYER_LEVEL_LABEL_AR: Record<BuyerLevel, string> = {
  beginner: 'مناسب للمبتدئ',
  intermediate: 'يحتاج خبرة متوسطة',
  advanced: 'للمتقدّمين',
};

/**
 * The control link a product speaks, named the way a buyer names it.
 *
 * Deliberately coarse. The requirement was explicit: do not drag a shopper
 * through Targets and firmware versions while they are deciding what to buy.
 * «ExpressLRS» is what they need to know to tell whether it will bind to the
 * radio they own; which Target to flash is a question for after it arrives, and
 * the software centre already answers it.
 */
export type LinkProtocol = 'elrs' | 'crossfire' | 'tracer' | 'ghost' | 'frsky' | 'dji' | 'none';

export const LINK_PROTOCOL_LABEL_AR: Record<LinkProtocol, string> = {
  elrs: 'ExpressLRS',
  crossfire: 'TBS Crossfire',
  tracer: 'TBS Tracer',
  ghost: 'ImmersionRC Ghost',
  frsky: 'FrSky',
  dji: 'جهاز تحكم DJI',
  none: 'لا ينطبق',
};

/** The video system a product belongs to — same coarseness, same reason. */
export type VideoSystem = 'analog' | 'dji' | 'walksnail' | 'hdzero' | 'none';

export const VIDEO_SYSTEM_LABEL_AR: Record<VideoSystem, string> = {
  analog: 'تناظري',
  dji: 'DJI',
  walksnail: 'Walksnail',
  hdzero: 'HDZero',
  none: 'لا ينطبق',
};

export interface ProductImage {
  /**
   * Where the image lives.
   *
   * Deliberately a plain path rather than a bundled import: images are
   * replaced far more often than code, and the requirement was that they stay
   * easy to swap. A product with no image renders a typed placeholder rather
   * than a broken frame.
   */
  url: string;
  /**
   * A smaller copy, produced by the same upload.
   *
   * The section page shows eight of these; the product page shows one full
   * image. Without it a grid of eight cards downloads eight full-size
   * photographs, which on a phone is the difference between a shop that opens
   * and one that is still opening.
   */
  thumbnailUrl?: string;
  altAr: string;
  /** Position in the gallery. The first is the one a card shows. */
  order: number;
  /**
   * Where it came from and on what terms.
   *
   * Required to publish. Product photography belongs to its manufacturer, and
   * an image with no recorded permission is one nobody can defend later — so
   * the model refuses to treat it as publishable rather than leaving that to
   * whoever is uploading in a hurry.
   */
  credit?: ImageCredit;
}

/**
 * The legal basis for using someone else's photograph — a CLOSED set.
 *
 * It used to be free text, and free text is how «من موقع الشركة» ends up
 * recorded as permission. It is not permission; it is a description of where
 * the file was taken from. Every value below names a thing that either exists
 * or does not, and `evidenceUrl` is where somebody can go and see that it does.
 *
 * There is deliberately no «fair use», no «promotional», and no «other». A
 * basis nobody can point at is the absence of a basis, and the honest way to
 * record that is to have no image.
 */
export type ImageLicenceBasis =
  /** The manufacturer publishes a press or media kit with a usage grant. */
  | 'manufacturer-media-kit'
  /** A supplier supplies images to resellers for resale listings. */
  | 'supplier-reseller-pack'
  /** Somebody asked and has the reply. `evidenceUrl` points at the record. */
  | 'written-permission'
  /** We took the photograph. The only basis that needs nobody else. */
  | 'own-photography';

export const IMAGE_BASIS_LABEL_AR: Record<ImageLicenceBasis, string> = {
  'manufacturer-media-kit': 'ملف إعلامي رسمي من الشركة',
  'supplier-reseller-pack': 'صور يوفّرها المورد لإعادة البيع',
  'written-permission': 'إذن مكتوب محفوظ',
  'own-photography': 'تصوير من عندنا',
};

export interface ImageCredit {
  ownerAr: string;
  basis: ImageLicenceBasis;
  /**
   * Where the grant itself can be read.
   *
   * Not where the image is — where the PERMISSION is. A link to the product
   * page proves the photo exists, which was never in doubt.
   */
  evidenceUrl: string;
  /** Where the file was obtained, when that differs from the evidence. */
  sourceUrl?: string;
  /** True when it comes from the manufacturer's own material. */
  official: boolean;
  /** When the permission and the link were last checked. */
  reviewedAt: string;
  /** Set when this is a stand-in that must be replaced with a better one. */
  needsReplacement?: boolean;
}

/**
 * How many photographs one product may carry.
 *
 * Eight is more than any product page usefully shows and few enough that a
 * section grid of eight products never loads sixty-four files. On the model
 * rather than in the action because it is a fact about a product, and because
 * a `'use server'` module may export nothing but async functions.
 */
export const MAX_PRODUCT_IMAGES = 8;

/**
 * Whether an image may be shown to the public.
 *
 * The whole gate is here, in four lines, so that every surface asks the same
 * question. A stand-in marked `needsReplacement` still publishes — it is a real
 * licensed image that we would rather improve — but one with no basis and no
 * evidence never does, however urgently somebody wants the page to look
 * finished.
 */
export function isImagePublishable(img: ProductImage): boolean {
  const c = img.credit;
  return !!c && !!c.ownerAr && !!c.evidenceUrl && !!c.reviewedAt
    && (IMAGE_BASIS_LABEL_AR as Record<string, string>)[c.basis] !== undefined;
}

/**
 * The public half of a product. Everything here is readable by anyone.
 *
 * `priceMinor` is a stored number, computed by the pricing engine from inputs
 * this document does not contain and cannot be used to recover.
 */
/**
 * How a thing is sold — which is not the same question as what it is.
 *
 * The same aircraft ships in four or five packages at four or five prices, and
 * a shop that flattens them into one listing is a shop where somebody expecting
 * a radio in the box receives a bare quadcopter. These are the names the
 * industry actually uses, kept in English on the badge because that is how they
 * appear on every supplier's listing the buyer will cross-check against.
 */
export type PackageKind =
  /** The aircraft, no receiver, no radio, no goggles. */
  | 'drone-only'
  /** Plug and Play: no receiver — you fit your own. */
  | 'pnp'
  /** Bind and Fly: a receiver is fitted; you bring the radio. */
  | 'bnf'
  /** Ready to Fly: radio and usually goggles included. */
  | 'rtf'
  /** A deliberate bundle of separate products sold together. */
  | 'combo'
  /** Not an aircraft — a component, a service, an accessory. */
  | 'single';

export const PACKAGE_LABEL_AR: Record<PackageKind, string> = {
  'drone-only': 'الطائرة فقط',
  pnp: 'بلا مستقبِل (PNP)',
  bnf: 'مع مستقبِل (BNF)',
  rtf: 'طقم كامل (RTF)',
  combo: 'حزمة كاملة',
  single: 'قطعة مفردة',
};

/**
 * One buyable configuration of a product.
 *
 * WHY THIS IS NOT JUST «OPTIONS»
 * ------------------------------
 * Because the differences are not cosmetic. An ELRS variant and a Crossfire
 * variant have different receivers, different prices, different suppliers, and
 * bind to different radios — they are different things that happen to share a
 * frame. Modelling them as one product with a dropdown means one price and one
 * supply record for two products, and the price will be wrong for one of them.
 *
 * WHAT A BUYER IS ASKED, AND WHAT THEY ARE NOT
 * --------------------------------------------
 * Package, control link, video system. Three questions a buyer can answer
 * about equipment they already own. Never a Target, never a firmware version,
 * never a build option — those are setup decisions, they belong to the free
 * setup service, and putting them in a checkout is how a shop loses a customer
 * who was ready to buy.
 */
export interface ProductVariant {
  /** Stable and globally unique — «product-id:elrs-analog». Never regenerated. */
  id: string;
  /** What the buyer picks, in their terms. «ExpressLRS + تماثلي». */
  nameAr: string;
  packageKind: PackageKind;
  linkProtocol: LinkProtocol;
  videoSystem: VideoSystem;
  /** What this specific package contains. The commonest bad surprise. */
  inTheBoxAr: string[];
  availability: Availability;
  /** Priced independently: see the note above. */
  priceMinor: Minor | null;
  /** The one shown first. Exactly one variant per product must set it. */
  isDefault: boolean;
  /**
   * Whether buying this earns the free setup service.
   *
   * Per VARIANT, not per product, because it genuinely differs: we can program
   * a BNF aircraft before it ships and we cannot program a spare frame. A shop
   * that promises «برمجة مجانية» on a battery has made a promise it will have
   * to explain its way out of.
   */
  freeSetupEligible: boolean;
}

export interface StoreProduct {
  id: string;
  /** The one section it lives in — its size or its part type. */
  categoryId: string;
  /**
   * Use-case sections it ALSO belongs to.
   *
   * «فريستايل» and «مدى طويل» are not sizes, they are answers to «لماذا أطير»,
   * and the same 5-inch aircraft is honestly the answer to one of them. The
   * alternative was a duplicate product per section, which means two records to
   * price, two to keep in stock, and eventually two that disagree. A product
   * has one identity and appears wherever it genuinely belongs.
   */
  collections: string[];
  /** The manufacturer's own name. Never translated — it is how you search. */
  nameEn: string;
  /** What it is, in Arabic. Not a translation of the name. */
  titleAr: string;
  brandAr: string;
  choicePosition: ChoicePosition;

  /** One paragraph: what it is for and who it suits. */
  summaryAr: string;
  /** Who should buy this one rather than its neighbours in the section. */
  suitsAr: string[];
  /** Who should NOT. The sentence a shop that wants your trust writes. */
  notForAr: string[];
  highlightsAr: string[];
  /** Everything in the box, itemised. The commonest source of a bad surprise. */
  inTheBoxAr: string[];

  /** Who it is for. Rendered as a badge, and as a warning where it should be. */
  level: BuyerLevel;
  /**
   * The control link and video system, for the two questions every buyer of an
   * aircraft actually has: will it bind to my radio, and will it show in my
   * goggles. `none` where the question does not apply — a battery has neither.
   */
  linkProtocol: LinkProtocol;
  videoSystem: VideoSystem;
  /** Grams, when the manufacturer states it. Never estimated. */
  weightGrams?: number;
  /** Millimetres, when stated. Never estimated. */
  dimensionsMm?: { length: number; width: number; height: number };

  specs: ProductSpec[];
  images: ProductImage[];

  /**
   * The ways this product can be bought.
   *
   * Never empty. A product sold exactly one way still has one variant — which
   * means every surface reads variants and none of them needs a special case
   * for «the simple kind». The alternative, an optional array, produces two
   * code paths for pricing and two for the basket, and they drift.
   */
  variants: ProductVariant[];

  /**
   * The selling price, in minor units of `currency`.
   *
   * `null` means no price has been set, which is a real state and not an
   * error: a product whose supply record is incomplete is listed, described,
   * and not purchasable. A store that invents a number to fill the gap is
   * worse than one that says it does not have one yet.
   */
  priceMinor: Minor | null;
  currency: CurrencyCode;
  /** Struck-through reference price, when a real discount exists. */
  compareAtMinor?: Minor | null;

  availability: Availability;
  /**
   * Hidden from the storefront entirely when false.
   *
   * Set only by an admin, and only when `publicationBlockers` is empty — see
   * `publicationGate`. This is the stored fact; the STAGE is derived, because a
   * stored stage is a label somebody typed and a derived one is what is true.
   */
  published: boolean;
  /**
   * Taken down deliberately, for a reason.
   *
   * Distinct from «not yet published»: a suspended product had everything and
   * was pulled anyway — a safety recall, a supplier that stopped answering — and
   * it must not silently return to «ready» when the blockers clear.
   */
  suspendedReasonAr?: string;

  /** Other products in this catalogue. Resolved, never free text. */
  relatedProductIds: string[];
  /** «أو هذا بدلاً منه» — same job, different trade-off. */
  alternativeProductIds: string[];
  /** «وتحتاج معه» — a battery for a drone, a charger for a battery. */
  completesProductIds: string[];

  /** What to read before buying. The encyclopedia, doing its job. */
  learnLinks: KbLink[];

  /** When the description and specs were last checked. */
  reviewedAt: string;
}

/**
 * The private half. Staff only, in a collection nobody else may read.
 *
 * Split from the product for the reason at the top of this file: rules cannot
 * hide a field, so anything the customer must not see cannot be in a document
 * the customer may read.
 */
export interface StoreSupply {
  /**
   * The VARIANT this cost is for — and the document's own id.
   *
   * Per variant rather than per product because an RTF kit and the bare
   * aircraft come from the same supplier at different prices; one cost for both
   * produces a margin that is wrong for at least one of them. The product id is
   * this id's prefix, so a product's records are still one prefix scan away.
   */
  variantId: string;
  /**
   * Which supplier, by id, from `suppliers.ts`.
   *
   * An id rather than a name so moving a product between suppliers is one
   * field, and so the lead time and reliability come from one place instead of
   * being retyped per product. This is what makes AliExpress one row in a table
   * rather than the shape of the store.
   */
  supplierId: string;
  /** The exact listing. Staff-only — never rendered to a customer. */
  supplierUrl: string;
  /** What we pay for the unit. */
  unitCostMinor: Minor;
  /** What we pay to get it here. */
  inboundShippingMinor: Minor;
  costCurrency: CurrencyCode;
  /**
   * Per-product override of the store-wide margin, as a percentage.
   *
   * Absent means "use the store default", which is the case for almost
   * everything — an override exists so a single product can be sold at a
   * different margin without anybody editing code.
   */
  marginPercentOverride?: number;
  /** Free text for whoever manages supply. Never rendered to a customer. */
  notesAr?: string;
  /**
   * Whether the cost was checked against the supplier's live listing.
   *
   * Supplier prices move, and a margin computed from a figure nobody has looked
   * at for a year is a guess. The admin panel shows the age of this date beside
   * the price it produced.
   */
  verified: boolean;
  updatedAt: string;
}

/* ── Store settings ───────────────────────────────────────────────────────── */

/**
 * Settings a customer's browser may read.
 *
 * Deliberately excludes the margin. Publishing the margin alongside the price
 * publishes the cost, because one divides into the other.
 */
export interface StorePublicSettings {
  currency: CurrencyCode;
  /** The promise at the top of the store. Editable, never hard-coded. */
  banner: {
    enabled: boolean;
    headlineAr: string;
    bodyAr: string;
    /** Where «اعرف المزيد» goes. Optional — a banner may be a statement. */
    link?: KbLink;
  };
  /** Shown on the product page beside the price. */
  shippingNoteAr: string;
  /** Regulatory reminder for aircraft sections. Country-dependent. */
  regulatoryNoteAr?: string;
}

/** Settings only staff may read. */
export interface StorePrivateSettings {
  /**
   * The default margin, as a percentage of landed cost.
   *
   * Starts at 10 and lives in the database, not here. This constant is the
   * value used the first time the store runs and never again — the requirement
   * was explicit that it be changeable from the admin panel rather than being
   * a number inside the code.
   */
  defaultMarginPercent: number;
  /**
   * How many days a recorded cost stays trustworthy.
   *
   * An admin setting rather than a constant, because the right number depends
   * on the supplier: a manufacturer's own price moves twice a year and a
   * marketplace listing moves weekly. Past it, the product stops accepting
   * orders and the panel says why — selling from a cost nobody has looked at
   * since spring is how a shop discovers its margin went negative by reading
   * its bank statement.
   */
  priceReviewDays: number;
}

export const INITIAL_DEFAULT_MARGIN_PERCENT = 10;

/** Thirty days. Long enough not to be busywork, short enough to catch a move. */
export const INITIAL_PRICE_REVIEW_DAYS = 30;

/* ── Orders ───────────────────────────────────────────────────────────────── */

export type OrderStatus =
  | 'received'
  | 'confirmed'
  | 'ordered-from-supplier'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export const ORDER_STATUS_LABEL_AR: Record<OrderStatus, string> = {
  received: 'وصل الطلب',
  confirmed: 'مؤكَّد',
  'ordered-from-supplier': 'طُلب من المورد',
  shipped: 'شُحن',
  delivered: 'سُلِّم',
  cancelled: 'ملغى',
};

/**
 * The order's forward-only lifecycle.
 *
 * Declared as data so the admin panel offers only the transitions that make
 * sense, and so a delivered order cannot silently return to «received» — an
 * order's history is a record of what happened, and a status that can move
 * backwards is a record that can be rewritten.
 */
export const ORDER_STATUS_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ['confirmed', 'cancelled'],
  confirmed: ['ordered-from-supplier', 'cancelled'],
  'ordered-from-supplier': ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

/**
 * One line of an order, with the price FROZEN at the moment of ordering.
 *
 * Never a reference to the live product price. A price that follows the
 * catalogue means a customer who ordered at one price can be charged another
 * because somebody edited a margin — and it means the order history stops
 * being a record of what was agreed.
 */
export interface OrderItem {
  productId: string;
  /** Copied at order time, so the record survives the product being renamed. */
  nameEn: string;
  titleAr: string;
  quantity: number;
  unitPriceMinor: Minor;
  lineTotalMinor: Minor;
}

/**
 * What a customer submits. The server computes everything else.
 *
 * Deliberately has no prices and no totals. A checkout form that posts its own
 * total is the oldest hole in online shops: the browser is not a trusted
 * source, and the only defence is never to read a number from it. The server
 * takes these ids and quantities, prices them from the catalogue, and writes
 * the order it computed.
 */
export interface OrderSubmission {
  items: { variantId: string; quantity: number }[];
  contact: {
    fullNameAr: string;
    phone: string;
    country: string;
    cityAr: string;
    addressAr: string;
    notesAr?: string;
  };
}

export interface StoreOrder {
  id: string;
  /** The account that placed it. Orders require sign-in. */
  customerUid: string;
  items: OrderItem[];
  itemsTotalMinor: Minor;
  shippingMinor: Minor;
  totalMinor: Minor;
  currency: CurrencyCode;

  /** Contact details, supplied per order — never assumed from the profile. */
  contact: {
    fullNameAr: string;
    phone: string;
    country: string;
    cityAr: string;
    addressAr: string;
    /** What the customer wants us to know. Their words, rendered as text. */
    notesAr?: string;
  };

  /**
   * The free setup service, recorded per order.
   *
   * Stored rather than inferred, because the offer can change: an order placed
   * while it was running keeps it even if it is withdrawn tomorrow.
   */
  includesFreeSetup: boolean;

  status: OrderStatus;
  /** Staff-only. Never shown to the customer. */
  adminNotesAr?: string;
  createdAt: string;
  updatedAt: string;
}
