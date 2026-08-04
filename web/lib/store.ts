import { STORE_CATALOGUE, storeProduct, productsInCategory, categoryProductCount } from '@core/data/store/catalogue';
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
 */

export {
  STORE_CATALOGUE, storeProduct, productsInCategory, categoryProductCount,
  STORE_CATEGORIES, storeCategory, categoriesInGroup, formatPrice,
};

/**
 * The settings the storefront renders with.
 *
 * Reads the seed for now; the admin panel writes `storeSettings/public` and
 * this becomes a read of that document. Callers already treat it as async-ready
 * data rather than a constant, so that change is one function body.
 */
export function publicSettings(): StorePublicSettings {
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
