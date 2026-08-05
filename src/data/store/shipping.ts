import type { Minor } from './types';

/**
 * Shipping, decided by destination.
 *
 * WHY THE COSTS ARE EMPTY AND STAY EMPTY
 * --------------------------------------
 * Not one figure in this file is a price. What a parcel costs depends on the
 * carrier contract the owner signs, the weight bands they negotiate and the
 * insurance they choose — none of which I can know, and a plausible-looking
 * €6.95 would be quietly wrong on every order until somebody noticed. So a zone
 * with no configured cost cannot ship, and the customer is told so plainly
 * rather than being quoted a number nobody stands behind.
 *
 * The COUNTRY LISTS are different in kind: which states are in the European
 * Union is a fact, not a commercial guess, so the zones ship populated and the
 * owner only has to price them.
 *
 * WHY REFUSAL IS A VALUE AND NOT AN EXCEPTION
 * -------------------------------------------
 * «We do not ship there» is an ordinary, expected answer that a checkout has to
 * render well — with a reason, in Arabic, that tells the customer what to do.
 * Modelling it as a thrown error pushes it into a catch block, where every
 * distinct cause collapses into one apology. Every refusal below names itself.
 */

/** ISO-3166 alpha-2, uppercase. The one identifier a country has everywhere. */
export type CountryCode = string;

export interface ShippingZone {
  id: string;
  nameAr: string;
  /** Uppercase alpha-2 codes. A country may appear in exactly one zone. */
  countries: CountryCode[];
  /**
   * What we charge, per order, in minor units.
   *
   * `null` means NOT CONFIGURED — which is not the same as free, and is the
   * state every zone starts in. A zone that cannot quote cannot sell.
   */
  costMinor: Minor | null;
  /** Order value at or above which shipping is free. `null` disables it. */
  freeOverMinor: Minor | null;
  /** An administrative estimate, shown as a range and never as a promise. */
  etaDaysMin: number | null;
  etaDaysMax: number | null;
  enabled: boolean;
  updatedAt: string;
}

/** Rules that apply regardless of zone. */
export interface ShippingRules {
  /** Categories we do not ship at all — batteries are the usual reason. */
  blockedCategoryIds: string[];
  /** Products a human must price by hand before the order can complete. */
  manualReviewProductIds: string[];
}

export const EMPTY_SHIPPING_RULES: ShippingRules = {
  blockedCategoryIds: [],
  manualReviewProductIds: [],
};

/* ── The seed zones ───────────────────────────────────────────────────────── */

/**
 * The four zones the brief asked for, populated with countries and priced with
 * nothing. `costMinor: null` on every one: the owner sets them in the admin
 * panel, and until then the checkout refuses with «الشحن إلى بلدك غير مسعَّر
 * بعد» rather than inventing a figure.
 */
export const SEED_SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'nl', nameAr: 'هولندا', countries: ['NL'],
    costMinor: null, freeOverMinor: null,
    etaDaysMin: null, etaDaysMax: null, enabled: true, updatedAt: '',
  },
  {
    id: 'be', nameAr: 'بلجيكا', countries: ['BE'],
    costMinor: null, freeOverMinor: null,
    etaDaysMin: null, etaDaysMax: null, enabled: true, updatedAt: '',
  },
  {
    id: 'de', nameAr: 'ألمانيا', countries: ['DE'],
    costMinor: null, freeOverMinor: null,
    etaDaysMin: null, etaDaysMax: null, enabled: true, updatedAt: '',
  },
  {
    id: 'eu', nameAr: 'بقية الاتحاد الأوروبي',
    // The remaining 24 member states. Membership is a fact; the price is not.
    countries: [
      'AT', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'GR', 'HU', 'IE',
      'IT', 'LV', 'LT', 'LU', 'MT', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ],
    costMinor: null, freeOverMinor: null,
    etaDaysMin: null, etaDaysMax: null, enabled: true, updatedAt: '',
  },
];

/* ── Resolution ───────────────────────────────────────────────────────────── */

export type ShippingRefusalReason =
  | 'no-zone'
  | 'zone-disabled'
  | 'not-configured'
  | 'blocked-item'
  | 'manual-review';

export type ShippingQuote =
  | {
      ok: true;
      zoneId: string;
      zoneNameAr: string;
      costMinor: Minor;
      /** True when the free-shipping threshold was met. */
      freeApplied: boolean;
      etaDaysMin: number | null;
      etaDaysMax: number | null;
    }
  | {
      ok: false;
      reason: ShippingRefusalReason;
      messageAr: string;
      /** Which lines caused it, for the two item-level refusals. */
      offendingProductIds?: string[];
    };

export interface ShippingLine {
  productId: string;
  categoryId: string;
}

/**
 * What shipping costs to a country, or why it cannot be quoted.
 *
 * Pure: it takes the zones and rules rather than reading them, so the same
 * function answers for the checkout, for the order, and for a test — and so it
 * cannot accidentally acquire a database call and stop being checkable.
 *
 * ORDER OF CHECKS IS DELIBERATE
 * -----------------------------
 * Item-level refusals come FIRST. A customer in an unpriced zone with a battery
 * in the basket has two problems, and telling them about the zone first sends
 * them to change their address when the parcel would have been refused anyway.
 */
export function quoteShipping(input: {
  country: CountryCode;
  itemsTotalMinor: Minor;
  lines: readonly ShippingLine[];
  zones: readonly ShippingZone[];
  rules?: ShippingRules;
}): ShippingQuote {
  const rules = input.rules ?? EMPTY_SHIPPING_RULES;

  const blocked = input.lines.filter(l => rules.blockedCategoryIds.includes(l.categoryId));
  if (blocked.length > 0) {
    return {
      ok: false,
      reason: 'blocked-item',
      messageAr: 'في سلّتك صنف لا يمكن شحنه بالبريد. احذفه لإتمام الطلب، أو تواصل معنا.',
      offendingProductIds: [...new Set(blocked.map(l => l.productId))],
    };
  }

  const manual = input.lines.filter(l => rules.manualReviewProductIds.includes(l.productId));
  if (manual.length > 0) {
    return {
      ok: false,
      reason: 'manual-review',
      messageAr: 'أحد المنتجات في سلّتك يحتاج تسعير شحن يدوياً. تواصل معنا وسنرسل لك السعر.',
      offendingProductIds: [...new Set(manual.map(l => l.productId))],
    };
  }

  const country = (input.country ?? '').trim().toUpperCase();
  if (!country) {
    return { ok: false, reason: 'no-zone', messageAr: 'اختر بلد الشحن أولاً.' };
  }

  const zone = input.zones.find(z => z.countries.includes(country));
  if (!zone) {
    return {
      ok: false,
      reason: 'no-zone',
      messageAr: 'لا نشحن إلى هذا البلد حالياً. تواصل معنا إن كنت تريد ترتيباً خاصاً.',
    };
  }

  if (!zone.enabled) {
    return {
      ok: false,
      reason: 'zone-disabled',
      messageAr: `الشحن إلى ${zone.nameAr} متوقّف مؤقتاً. تواصل معنا.`,
    };
  }

  if (zone.costMinor === null) {
    // The honest state of a shop that has not set its rates yet.
    return {
      ok: false,
      reason: 'not-configured',
      messageAr: `الشحن إلى ${zone.nameAr} غير مسعَّر بعد. تواصل معنا وسنرسل لك التكلفة.`,
    };
  }

  const freeApplied =
    zone.freeOverMinor !== null && input.itemsTotalMinor >= zone.freeOverMinor;

  return {
    ok: true,
    zoneId: zone.id,
    zoneNameAr: zone.nameAr,
    costMinor: freeApplied ? 0 : zone.costMinor,
    freeApplied,
    etaDaysMin: zone.etaDaysMin,
    etaDaysMax: zone.etaDaysMax,
  };
}

/**
 * Every country the shop can currently quote — for the checkout's country list.
 *
 * Built from the zones rather than from a world list, so the dropdown offers
 * only destinations that will actually resolve. Offering 200 countries and then
 * refusing 196 of them at the last step is a checkout that wastes a form-fill.
 */
export function shippableCountries(zones: readonly ShippingZone[]): CountryCode[] {
  return [...new Set(
    zones.filter(z => z.enabled && z.costMinor !== null).flatMap(z => z.countries),
  )].sort();
}

/**
 * A country in two zones is a bug that shows up as an arbitrary price, because
 * `find` picks whichever was declared first. Exposed so the admin screen and a
 * test can both refuse to let it happen.
 */
export function overlappingCountries(zones: readonly ShippingZone[]): CountryCode[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const z of zones) {
    for (const c of z.countries) {
      if (seen.has(c)) dupes.add(c);
      seen.add(c);
    }
  }
  return [...dupes].sort();
}

/** Arabic names for the countries the shop ships to, for the address form. */
export const COUNTRY_NAME_AR: Record<CountryCode, string> = {
  NL: 'هولندا', BE: 'بلجيكا', DE: 'ألمانيا', AT: 'النمسا', BG: 'بلغاريا',
  HR: 'كرواتيا', CY: 'قبرص', CZ: 'التشيك', DK: 'الدنمارك', EE: 'إستونيا',
  FI: 'فنلندا', FR: 'فرنسا', GR: 'اليونان', HU: 'المجر', IE: 'أيرلندا',
  IT: 'إيطاليا', LV: 'لاتفيا', LT: 'ليتوانيا', LU: 'لوكسمبورغ', MT: 'مالطا',
  PL: 'بولندا', PT: 'البرتغال', RO: 'رومانيا', SK: 'سلوفاكيا', SI: 'سلوفينيا',
  ES: 'إسبانيا', SE: 'السويد',
};
