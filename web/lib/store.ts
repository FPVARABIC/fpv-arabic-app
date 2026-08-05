import { STORE_PRODUCTS } from '@core/data/store/catalogue';
import { STORE_CATEGORIES, storeCategory, categoriesInGroup } from '@core/data/store/categories';
import { INITIAL_PUBLIC_SETTINGS } from '@core/data/store/settings';
import { formatPrice } from '@core/data/store/pricing';
import type { StoreProduct, StorePublicSettings } from '@core/data/store/types';
import { SECTION_ROUTES } from './webRoutes';

/**
 * The web's view of the store — an adapter, not a second catalogue.
 *
 * WHY THE SEED CATALOGUE IS THE FALLBACK AND NOT THE SOURCE
 * ---------------------------------------------------------
 * Products are meant to live in Firestore so the admin panel can edit them
 * without a deployment. Until a product has been written there, the seed
 * catalogue in the shared core is what the storefront shows — so the shop is
 * browsable from the first minute, and every product the admin later edits
 * replaces its seed rather than sitting beside it.
 *
 * The seeds carry no price. That is deliberate and it is the honest state: a
 * price exists only once somebody has recorded what we pay for the thing, and
 * a number invented to fill the gap is one a customer can act on.
 *
 * WHY THE SEED LOOKUPS ARE NOT RE-EXPORTED FROM HERE
 * --------------------------------------------------
 * `storeProduct`, `productsInCategory` and `categoryProductCount` used to be,
 * and every one of them answers from the seeds — which is to say, from what was
 * true when the code was built. A page that imported one of those rendered a
 * shop that ignored its own admin panel. Merged reads live in
 * `lib/server/storeCatalogue.ts` and are async because they are a database
 * read; making that inconvenient to bypass is the point.
 *
 * `STORE_PRODUCTS` stays, for `generateStaticParams` alone: the set of ROUTES
 * comes from the seeds, and it should. A product's page exists because somebody
 * added it in a reviewed commit, not because a database row appeared.
 */

export {
  STORE_PRODUCTS,
  STORE_CATEGORIES, storeCategory, categoriesInGroup, formatPrice,
};

/** Where the basket opens. */
export function cartHref(): string {
  return `${SECTION_ROUTES.store}/cart`;
}

/**
 * The settings the storefront renders with — the SEED ones.
 *
 * Kept for the two places that legitimately need a synchronous answer and
 * cannot await: nothing today. Every page reads `publicStoreSettings()` from
 * `lib/server/storeSettings.ts`, which returns what the admin panel wrote and
 * falls back to this. A page that called this directly would render a banner
 * the settings screen cannot change, which is the bug the whole seed/override
 * arrangement exists to prevent.
 */
export function seedPublicSettings(): StorePublicSettings {
  return INITIAL_PUBLIC_SETTINGS;
}

/** Where a product opens. Never written by hand in a component. */
export function productHref(productId: string): string {
  return `${SECTION_ROUTES.store}/p/${encodeURIComponent(productId)}`;
}

/** Where a section opens. */
export function categoryHref(categoryId: string): string {
  return `${SECTION_ROUTES.store}/${encodeURIComponent(categoryId)}`;
}

/**
 * How a product's price should be presented.
 *
 * Three states, and the middle one is the one that matters. A product with no
 * supply record has no price — not zero, not «اتصل بنا», not a guess. It is
 * listed and described and cannot be ordered, and saying so plainly is what
 * separates a shop that is still being stocked from one that is misleading you.
 */
export type PriceState =
  | { kind: 'priced'; textAr: string; compareTextAr?: string }
  | { kind: 'unpriced'; textAr: string }
  | { kind: 'unavailable'; textAr: string };

export function priceState(p: StoreProduct): PriceState {
  if (p.availability === 'out-of-stock') {
    return { kind: 'unavailable', textAr: 'غير متوفر حالياً' };
  }
  if (p.priceMinor === null || p.priceMinor <= 0) {
    return { kind: 'unpriced', textAr: 'السعر قيد التحديث' };
  }
  return {
    kind: 'priced',
    textAr: formatPrice(p.priceMinor, p.currency),
    ...(p.compareAtMinor && p.compareAtMinor > p.priceMinor
      ? { compareTextAr: formatPrice(p.compareAtMinor, p.currency) }
      : {}),
  };
}

/** Whether this product can be put in a basket right now. */
export function isOrderable(p: StoreProduct): boolean {
  return priceState(p).kind === 'priced'
    && p.published
    && p.availability !== 'out-of-stock'
    && p.availability !== 'coming-soon';
}

/**
 * The checkout, and the page the payment provider returns the customer to.
 *
 * Helpers rather than literals for the same reason every other store route is:
 * a path typed into a component is a second routing table, and
 * `scripts/testStore.ts` fails the build when one appears. The return URL in
 * particular is built in THREE places — the payment service, the result page
 * and the form — and three copies of one string is how a rename half-lands.
 */
export function checkoutHref(): string {
  return `${SECTION_ROUTES.store}/cart/checkout`;
}

export function paymentResultHref(orderId: string): string {
  return `${checkoutHref()}/done?order=${encodeURIComponent(orderId)}`;
}

/**
 * «فشل الدفع، ماذا أفعل؟»
 *
 * A helper rather than a literal for the same reason every other store route
 * is one — and `scripts/testStore.ts` caught the literal within a minute of my
 * writing it, which is the guard working exactly as intended. It is linked
 * from two places on the result page and indexed by the platform search, so
 * three copies of the string were already in play.
 */
export function paymentHelpHref(): string {
  return `${SECTION_ROUTES.store}/payment-help`;
}
