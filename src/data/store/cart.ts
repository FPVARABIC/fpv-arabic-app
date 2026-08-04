/**
 * The cart, as pure data.
 *
 * WHY IT LIVES IN THE SHARED CORE AND NOT IN A REACT HOOK
 * -------------------------------------------------------
 * Because the same arithmetic has to run in three places that cannot share a
 * hook: the browser that shows a running total, the server that writes the
 * order, and the test that proves the two agree. A cart implemented inside a
 * component is a cart the server cannot check — and a server that cannot check
 * the total is a server that accepts whatever the browser sends it, which is
 * the oldest hole in online shops.
 *
 * So this module holds no storage, no React and no fetch. It takes a stored
 * cart and a price lookup and returns lines and totals; the surfaces decide
 * where the bytes live.
 *
 * WHAT IT REFUSES TO TRUST
 * ------------------------
 * The stored cart. It is written by a browser, survives in localStorage across
 * versions, and can be edited by hand in ten seconds — so `readCart` validates
 * shape, drops anything malformed, and clamps quantities. And prices are never
 * read from it: they come from the catalogue at the moment the total is
 * computed, so a cart edited to say a drone costs one dollar produces a total
 * that says otherwise.
 */

import { ORDERABLE_AVAILABILITY } from './types';
import type { Availability, CurrencyCode, Minor } from './types';
import { cartTotals, type CartTotals } from './pricing';

/**
 * The cart as it is stored. Ids and quantities only — never prices.
 *
 * WHY THE ID IS A VARIANT AND NOT A PRODUCT
 * -----------------------------------------
 * Because a product is not a thing you can buy. «BetaFPV Cetus Pro» is sold as
 * a bare aircraft and as a full kit at different prices with different contents;
 * a basket line that named only the product would be a line nobody could
 * fulfil. The variant id contains the product id as its prefix, so nothing is
 * lost — a line still knows which product it belongs to.
 */
export interface StoredCart {
  v: number;
  items: { variantId: string; quantity: number }[];
  updatedAt: string;
}

/**
 * Version 2: lines name variants.
 *
 * A version-1 cart is discarded rather than migrated. Its lines name products,
 * and guessing which variant somebody meant is exactly the kind of helpfulness
 * that puts the wrong thing in a box — the default variant of a product is
 * often not the one they were looking at. An empty basket and a browse is a
 * small cost; the wrong aircraft is not.
 */
export const CART_SCHEMA_VERSION = 2;
export const CART_STORAGE_KEY = 'fpv-store-cart-v2';

/** Nobody orders forty of one flight controller; a typo says they did. */
export const MAX_QUANTITY_PER_LINE = 20;
export const MAX_LINES = 40;

export const EMPTY_CART: StoredCart = { v: CART_SCHEMA_VERSION, items: [], updatedAt: '' };

/**
 * Validates a stored cart, dropping whatever does not survive.
 *
 * All-or-nothing was considered and rejected: a customer who has spent ten
 * minutes choosing should not lose the basket because one line refers to a
 * product that was withdrawn. Dropping the bad line and keeping the rest is the
 * behaviour that respects the time they already spent.
 */
export function readCart(raw: unknown): StoredCart {
  if (typeof raw !== 'object' || raw === null) return EMPTY_CART;
  const r = raw as Record<string, unknown>;
  if (r.v !== CART_SCHEMA_VERSION || !Array.isArray(r.items)) return EMPTY_CART;

  const seen = new Set<string>();
  const items: StoredCart['items'] = [];
  for (const entry of r.items) {
    if (typeof entry !== 'object' || entry === null) continue;
    const e = entry as Record<string, unknown>;
    const variantId = e.variantId;
    const quantity = e.quantity;
    if (typeof variantId !== 'string' || !variantId) continue;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) continue;
    // A duplicated line would double-count. Merge rather than drop: the
    // customer asked for both.
    if (seen.has(variantId)) {
      const existing = items.find(i => i.variantId === variantId)!;
      existing.quantity = Math.min(MAX_QUANTITY_PER_LINE, existing.quantity + quantity);
      continue;
    }
    seen.add(variantId);
    items.push({ variantId, quantity: Math.min(MAX_QUANTITY_PER_LINE, quantity) });
    if (items.length >= MAX_LINES) break;
  }
  return { v: CART_SCHEMA_VERSION, items, updatedAt: typeof r.updatedAt === 'string' ? r.updatedAt : '' };
}

export function addToCart(cart: StoredCart, variantId: string, quantity = 1, at = ''): StoredCart {
  const q = Math.max(1, Math.min(MAX_QUANTITY_PER_LINE, Math.floor(quantity)));
  const items = cart.items.map(i => ({ ...i }));
  const existing = items.find(i => i.variantId === variantId);
  if (existing) existing.quantity = Math.min(MAX_QUANTITY_PER_LINE, existing.quantity + q);
  else if (items.length < MAX_LINES) items.push({ variantId, quantity: q });
  return { v: CART_SCHEMA_VERSION, items, updatedAt: at };
}

export function setQuantity(cart: StoredCart, variantId: string, quantity: number, at = ''): StoredCart {
  const q = Math.floor(quantity);
  // Setting a line to zero is how a quantity stepper removes it, so it is a
  // removal rather than an error.
  if (q <= 0) return removeFromCart(cart, variantId, at);
  return {
    v: CART_SCHEMA_VERSION,
    items: cart.items.map(i =>
      i.variantId === variantId
        ? { ...i, quantity: Math.min(MAX_QUANTITY_PER_LINE, q) }
        : { ...i }),
    updatedAt: at,
  };
}

export function removeFromCart(cart: StoredCart, variantId: string, at = ''): StoredCart {
  return {
    v: CART_SCHEMA_VERSION,
    items: cart.items.filter(i => i.variantId !== variantId).map(i => ({ ...i })),
    updatedAt: at,
  };
}

export function clearCart(at = ''): StoredCart {
  return { v: CART_SCHEMA_VERSION, items: [], updatedAt: at };
}

/**
 * How many things are in the basket, counted from storage alone.
 *
 * The header badge uses this rather than the resolved total, and the difference
 * matters: a badge that quietly drops an out-of-stock line reads «2» when the
 * customer put three things in, and they find out by counting. Telling them
 * «3» and explaining the third inside the basket is the honest order — and it
 * means the badge, which is on every page, needs no catalogue and no read.
 */
export function storedItemCount(cart: StoredCart): number {
  return cart.items.reduce((n, i) => n + i.quantity, 0);
}

/**
 * The least a thing must be for a basket to price it.
 *
 * Not `StoreProduct`, on purpose. The browser prices the basket too, and
 * sending it forty products' worth of Arabic prose, spec tables and image
 * credits so it can multiply two numbers is a payload nobody needs. The server
 * sends the seven fields below, the seed catalogue satisfies the same shape,
 * and one function prices both.
 */
export interface PricedProduct {
  /** The VARIANT id. What a basket line names and what an order records. */
  id: string;
  /** The product it belongs to, for links and for grouping. */
  productId: string;
  nameEn: string;
  titleAr: string;
  /** «مع مستقبِل ExpressLRS». Empty for a product sold exactly one way. */
  variantNameAr: string;
  priceMinor: Minor | null;
  currency: CurrencyCode;
  availability: Availability;
  published: boolean;
  /** Whether buying this earns the free setup service. */
  freeSetupEligible: boolean;
}

/** One resolved line: the stored quantity joined to the live product. */
export interface ResolvedLine<P extends PricedProduct = PricedProduct> {
  product: P;
  quantity: number;
  unitPriceMinor: Minor;
  lineTotalMinor: Minor;
}

export interface ResolvedCart<P extends PricedProduct = PricedProduct> {
  lines: ResolvedLine<P>[];
  /**
   * Lines that could not be honoured, and why.
   *
   * Shown rather than silently dropped: a customer whose chosen drone went out
   * of stock between adding it and opening the basket needs to be told, not to
   * find a shorter list than they remember.
   */
  dropped: { variantId: string; reasonAr: string }[];
  totals: CartTotals;
  /** True when every line has a price and the order could actually be placed. */
  orderable: boolean;
}

/**
 * Joins a stored cart to live products and computes the totals.
 *
 * Prices come from `lookup`, never from the stored cart — which is what makes a
 * hand-edited basket produce an honest total. The same function runs in the
 * browser for display and on the server before an order is written, so the two
 * cannot disagree.
 */
export function resolveCart<P extends PricedProduct = PricedProduct>(
  cart: StoredCart,
  lookup: (productId: string) => P | undefined,
  shippingMinor = 0,
): ResolvedCart<P> {
  const lines: ResolvedLine<P>[] = [];
  const dropped: ResolvedCart<P>['dropped'] = [];

  for (const item of cart.items) {
    const product = lookup(item.variantId);
    if (!product || !product.published) {
      dropped.push({ variantId: item.variantId, reasonAr: 'لم يعد هذا المنتج معروضاً.' });
      continue;
    }
    if (!ORDERABLE_AVAILABILITY.includes(product.availability)) {
      dropped.push({
        variantId: item.variantId,
        reasonAr: product.availability === 'discontinued'
          ? 'توقّف إنتاج هذه النسخة.'
          : 'لم تعد هذه النسخة متاحة للطلب.',
      });
      continue;
    }
    if (product.priceMinor === null) {
      dropped.push({ variantId: item.variantId, reasonAr: 'سعر هذه النسخة قيد التحديث.' });
      continue;
    }
    lines.push({
      product,
      quantity: item.quantity,
      unitPriceMinor: product.priceMinor,
      lineTotalMinor: product.priceMinor * item.quantity,
    });
  }

  const totals = cartTotals(
    lines.map(l => ({
      productId: l.product.id,
      quantity: l.quantity,
      unitPriceMinor: l.unitPriceMinor,
    })),
    shippingMinor,
  );

  return { lines, dropped, totals, orderable: lines.length > 0 };
}

/**
 * The cart with the free service added, when there is anything to give it with.
 *
 * Applied here rather than at checkout so the customer sees it in the basket
 * while deciding, which is when a free service actually influences a purchase.
 * It is removed automatically when the basket empties, so the promise can never
 * appear on an order that bought nothing.
 */
export function withIncludedService(
  cart: StoredCart,
  freeServiceVariantId: string | undefined,
  at = '',
  /**
   * Which lines actually qualify.
   *
   * Omitted means «any other line», which is the browser's optimistic guess
   * before it has the catalogue. The server passes a real predicate, and the
   * server is the one that decides — because the promise is about eligible
   * products and a basket of propellers is not one.
   */
  isEligible?: (variantId: string) => boolean,
): StoredCart {
  if (!freeServiceVariantId) return cart;
  const qualifies = (id: string) =>
    id !== freeServiceVariantId && (isEligible ? isEligible(id) : true);

  const hasQualifying = cart.items.some(i => qualifies(i.variantId));
  const hasService = cart.items.some(i => i.variantId === freeServiceVariantId);

  if (hasQualifying && !hasService) return addToCart(cart, freeServiceVariantId, 1, at);
  if (!hasQualifying && hasService) return removeFromCart(cart, freeServiceVariantId, at);
  return cart;
}
