import 'server-only';
import { cache } from 'react';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import {
  STORE_PRODUCTS, storeProduct as seedProduct, selectCategory,
} from '@core/data/store/catalogue';
import { mergeCatalogue, applyOverride, type ProductOverride } from '@core/data/store/overrides';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import type { PricedProduct } from '@core/data/store/cart';
import type { StoreProduct } from '@core/data/store/types';

/**
 * The catalogue the storefront actually renders.
 *
 * The seeds in the shared core say what a product IS; the `storeProducts`
 * collection says what the admin has changed about it since. This is where the
 * two meet, and it is the only place they meet — a component that imported the
 * seeds directly would render a shop that ignores its own admin panel, which is
 * the state this module exists to end.
 *
 * WHY IT IS CACHED PER REQUEST AND NOT PER PROCESS
 * ------------------------------------------------
 * `cache()` deduplicates within one render, so a page that shows a section
 * grid, a related strip and a cart badge reads Firestore once instead of three
 * times. It deliberately does NOT survive the request: an admin who marks
 * something out of stock expects the next page load to say so, and a process-
 * level cache would decide otherwise for however long it felt like.
 *
 * WHY A FAILED READ RETURNS THE SEEDS RATHER THAN AN ERROR
 * --------------------------------------------------------
 * A shop that 500s because the override collection is unreachable is a shop
 * that is down. A shop that falls back to its seeds is a shop showing last
 * known-good data with no prices on the products that never had one — degraded,
 * honest, and still browsable. The one thing this must never do is invent.
 */

const PRODUCTS = 'storeProducts';

export const productOverrides = cache(async (): Promise<Record<string, ProductOverride>> => {
  if (!isAdminConfigured()) return {};
  try {
    const snap = await adminDb().collection(PRODUCTS).get();
    const out: Record<string, ProductOverride> = {};
    for (const d of snap.docs) {
      out[d.id] = { productId: d.id, ...(d.data() as Omit<ProductOverride, 'productId'>) };
    }
    return out;
  } catch {
    return {};
  }
});

/** Every product, merged. Includes unpublished ones — callers filter. */
export const resolvedProducts = cache(async (): Promise<StoreProduct[]> =>
  mergeCatalogue(STORE_PRODUCTS, await productOverrides()));

/** Only what a customer may see. */
export async function publishedProducts(): Promise<StoreProduct[]> {
  return (await resolvedProducts()).filter(p => p.published);
}

export async function resolvedProduct(productId: string): Promise<StoreProduct | undefined> {
  const seed = seedProduct(productId);
  if (!seed) return undefined;
  return applyOverride(seed, (await productOverrides())[productId]);
}

/**
 * A section's products, merged and ordered along the section's own axis.
 *
 * Delegates to the core's `selectCategory` rather than filtering here. A
 * previous version of this function did filter here — `p.categoryId === id` —
 * and lost the `collections` membership, which took the cinematic, freestyle
 * and long-range sections to zero products each. The rule belongs in one place
 * and this is not it.
 */
export async function publishedInCategory(categoryId: string): Promise<StoreProduct[]> {
  return selectCategory(await resolvedProducts(), categoryId);
}

/**
 * How many options every section offers, in one pass.
 *
 * The storefront advertises a count on each section card, and that count has to
 * be the number of cards the section actually renders — which is not
 * `categoryId === c.id`, because a product can belong to a section as a use
 * case. Returned as a map so the home page needs no import from the seed module
 * at all: a page that imports the catalogue for its selection rule is one
 * keystroke away from importing it for its data.
 */
export async function sectionCounts(): Promise<Record<string, number>> {
  const products = await resolvedProducts();
  const out: Record<string, number> = {};
  for (const c of STORE_CATEGORIES) out[c.id] = selectCategory(products, c.id).length;
  return out;
}

/**
 * The lean projection the browser needs to price a basket.
 *
 * One row per BUYABLE VARIANT, not per product — because a basket line names a
 * variant and a lookup that answered per product could not price it. The cart
 * runs in the browser, so it needs prices; it does not need Arabic prose, spec
 * tables and image credits to multiply two numbers. This sends the nine fields
 * `resolveCart` reads and nothing else.
 *
 * It is not a security boundary — every field here is on the public product
 * page already. It is a size boundary.
 */
export type CartProductView = PricedProduct;

export async function cartProductViews(): Promise<CartProductView[]> {
  return (await resolvedProducts()).flatMap(p => p.variants.map(v => ({
    id: v.id,
    productId: p.id,
    nameEn: p.nameEn,
    titleAr: p.titleAr,
    variantNameAr: p.variants.length > 1 ? v.nameAr : '',
    priceMinor: v.priceMinor,
    currency: p.currency,
    availability: v.availability,
    // A variant of an unpublished product is not buyable, whatever its own
    // stock says. This is what stops a guessed variant id from selling a draft.
    published: p.published && !p.suspendedReasonAr,
    freeSetupEligible: v.freeSetupEligible,
  })));
}

/** One variant, resolved. The server's own lookup when it re-prices a basket. */
export async function variantView(variantId: string): Promise<CartProductView | undefined> {
  return (await cartProductViews()).find(v => v.id === variantId);
}
