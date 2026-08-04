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
 * A specification row.
 *
 * `verified` is the field that keeps this honest. A spec the platform has
 * checked against the manufacturer's own documentation renders as a fact; one
 * that has not is rendered as «بانتظار التأكيد» and is never presented as
 * though somebody had confirmed it. Nothing here is written from memory.
 */
export interface ProductSpec {
  labelAr: string;
  valueAr: string;
  /** True only when checked against the manufacturer's own documentation. */
  verified: boolean;
  /** Where it was checked. Required whenever `verified` is true. */
  sourceUrl?: string;
}

export type Availability =
  | 'in-stock'
  | 'made-to-order'
  | 'out-of-stock'
  /** Listed, described, and deliberately not yet purchasable. */
  | 'coming-soon';

export const AVAILABILITY_LABEL_AR: Record<Availability, string> = {
  'in-stock': 'متوفر',
  'made-to-order': 'يُطلب من المورد',
  'out-of-stock': 'غير متوفر حالياً',
  'coming-soon': 'قريباً',
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
  altAr: string;
  /** Who owns it. An image with no stated permission is not published. */
  credit?: { ownerAr: string; permissionAr: string; sourceUrl?: string };
}

/**
 * The public half of a product. Everything here is readable by anyone.
 *
 * `priceMinor` is a stored number, computed by the pricing engine from inputs
 * this document does not contain and cannot be used to recover.
 */
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

  specs: ProductSpec[];
  images: ProductImage[];

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
  /** Hidden from the storefront entirely when false. */
  published: boolean;

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
  /** Same id as the product it belongs to. */
  productId: string;
  supplierNameAr: string;
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
}

export const INITIAL_DEFAULT_MARGIN_PERCENT = 10;

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
