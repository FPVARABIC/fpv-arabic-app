/**
 * The store's settings, and the values it starts life with.
 *
 * WHY THESE ARE DEFAULTS AND NOT CONSTANTS
 * ----------------------------------------
 * The requirement was explicit: nothing that can be managed from the admin
 * panel may be fixed in the code. So every value here is a SEED — the state the
 * store has before anyone has configured it, written once into
 * `storeSettings/public` and `storeSettings/private` and never read again.
 *
 * The distinction matters because it is easy to lose. A default that a
 * component reads directly is a constant wearing a default's name: the admin
 * panel changes the database, the page keeps rendering the code, and nobody
 * can work out why the banner will not change. Every reader of these values
 * goes to the database; this module is only what puts them there the first
 * time.
 *
 * THE BANNER IS THE COMMERCIAL ARGUMENT
 * -------------------------------------
 * Free setup and programming with any purchase is not a discount, and it is
 * not marketing copy. It is the one thing this shop can offer that a supplier
 * cannot: the platform already knows how to configure the thing it just sold
 * you. That is why it is a first-class setting rather than a line of text in a
 * component — it will be edited, A/B'd, and withdrawn and reinstated, and none
 * of that should need a deployment.
 */

import type { StorePrivateSettings, StorePublicSettings } from './types';
import { INITIAL_DEFAULT_MARGIN_PERCENT, INITIAL_PRICE_REVIEW_DAYS } from './types';

export const SETTINGS_DOC_PUBLIC = 'public';
export const SETTINGS_DOC_PRIVATE = 'private';

export const INITIAL_PUBLIC_SETTINGS: StorePublicSettings = {
  currency: 'USD',
  banner: {
    enabled: true,
    headlineAr: 'برمجة وإعداد مجاناً مع أي طلب',
    bodyAr:
      'كل ما تشتريه من متجر FPVARABIC يصلك مضبوطاً: الفيرموير، والمنافذ، والمستقبل، '
      + 'والحماية عند فقد الإشارة. ولو احتجت تعديلاً بعد الاستلام، نحن من كتب الشرح أصلاً.',
    link: { kind: 'betaflight', targetId: '', label: 'ما الذي نضبطه بالضبط' },
  },
  shippingNoteAr: 'الشحن يُحتسب حسب الوجهة، ويظهر قبل تأكيد الطلب.',
  regulatoryNoteAr:
    'تسجيل الطائرات وتراخيص الطيران تختلف من بلد إلى آخر، ومسؤوليتها على المشتري. '
    + 'تأكّد من قوانين بلدك قبل الطيران.',
};

export const INITIAL_PRIVATE_SETTINGS: StorePrivateSettings = {
  defaultMarginPercent: INITIAL_DEFAULT_MARGIN_PERCENT,
  priceReviewDays: INITIAL_PRICE_REVIEW_DAYS,
};

/**
 * Validates settings read from the database.
 *
 * The store renders from whatever is in Firestore, and a malformed document
 * would otherwise reach a page as `undefined` and render as «undefined دولار».
 * Anything missing or wrong falls back to the seed — a store with a stale
 * banner is a small problem; a store with a broken price is not.
 */
export function validatePublicSettings(raw: unknown): StorePublicSettings {
  if (typeof raw !== 'object' || raw === null) return INITIAL_PUBLIC_SETTINGS;
  const r = raw as Record<string, unknown>;
  const banner = (typeof r.banner === 'object' && r.banner !== null)
    ? r.banner as Record<string, unknown>
    : {};

  const currency = r.currency;
  return {
    currency: currency === 'USD' || currency === 'SAR' || currency === 'AED' || currency === 'EGP'
      ? currency
      : INITIAL_PUBLIC_SETTINGS.currency,
    banner: {
      enabled: typeof banner.enabled === 'boolean' ? banner.enabled : false,
      headlineAr: typeof banner.headlineAr === 'string' && banner.headlineAr
        ? banner.headlineAr
        : INITIAL_PUBLIC_SETTINGS.banner.headlineAr,
      bodyAr: typeof banner.bodyAr === 'string' && banner.bodyAr
        ? banner.bodyAr
        : INITIAL_PUBLIC_SETTINGS.banner.bodyAr,
      // A link is dropped rather than guessed: a banner with no call to action
      // is fine, a banner whose call to action goes nowhere is not.
      ...(typeof banner.link === 'object' && banner.link !== null
        ? { link: banner.link as StorePublicSettings['banner']['link'] }
        : {}),
    },
    shippingNoteAr: typeof r.shippingNoteAr === 'string' && r.shippingNoteAr
      ? r.shippingNoteAr
      : INITIAL_PUBLIC_SETTINGS.shippingNoteAr,
    ...(typeof r.regulatoryNoteAr === 'string' && r.regulatoryNoteAr
      ? { regulatoryNoteAr: r.regulatoryNoteAr }
      : { regulatoryNoteAr: INITIAL_PUBLIC_SETTINGS.regulatoryNoteAr }),
  };
}

export function validatePrivateSettings(raw: unknown): StorePrivateSettings {
  if (typeof raw !== 'object' || raw === null) return INITIAL_PRIVATE_SETTINGS;
  const r = raw as Record<string, unknown>;
  const m = r.defaultMarginPercent;
  // A negative margin sells at a loss on every product at once. It is refused
  // rather than clamped, because a clamp hides the fact that somebody typed it.
  const d = r.priceReviewDays;
  return {
    defaultMarginPercent: typeof m === 'number' && Number.isFinite(m) && m >= 0 && m <= 500
      ? m
      : INITIAL_PRIVATE_SETTINGS.defaultMarginPercent,
    // Bounded at both ends. Zero would mark every price stale the moment it was
    // entered and stop the shop selling anything; a thousand is the setting
    // switched off while looking as though it is on, which is worse than off.
    priceReviewDays: typeof d === 'number' && Number.isInteger(d) && d >= 1 && d <= 365
      ? d
      : INITIAL_PRIVATE_SETTINGS.priceReviewDays,
  };
}
