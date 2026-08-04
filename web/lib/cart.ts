'use client';

import {
  CART_STORAGE_KEY, EMPTY_CART, readCart, addToCart, setQuantity,
  removeFromCart, clearCart, withIncludedService, resolveCart,
  type StoredCart, type ResolvedCart, type PricedProduct,
} from '@core/data/store/cart';
import { freeWithPurchaseService } from '@core/data/store/services';

/**
 * The browser's half of the cart.
 *
 * Storage and subscription only — every decision about what a cart MEANS lives
 * in `src/data/store/cart.ts`, so the total this shows and the total the server
 * writes into an order come out of the same function. A cart whose arithmetic
 * lived here could not be checked by anything, and a total the server cannot
 * check is a total the browser gets to choose.
 *
 * WHY IT IS AN EXTERNAL STORE RATHER THAN CONTEXT
 * -----------------------------------------------
 * Because the cart badge in the header, the cart page and the button on a
 * product page are in different parts of the tree and must agree instantly.
 * `useSyncExternalStore` over one module-level value gives that without a
 * provider wrapping the whole application, and it gives the server a defined
 * answer — an empty cart — instead of a hydration mismatch.
 */

let cache: StoredCart = EMPTY_CART;
let cacheRaw = '';
const listeners = new Set<() => void>();

function load(): StoredCart {
  if (typeof window === 'undefined') return EMPTY_CART;
  let raw = '';
  try { raw = window.localStorage.getItem(CART_STORAGE_KEY) ?? ''; } catch { return EMPTY_CART; }
  // Re-parse only when the stored string actually changed: `getSnapshot` is
  // called on every render, and returning a fresh object each time would make
  // React re-render forever.
  if (raw === cacheRaw) return cache;
  cacheRaw = raw;
  try { cache = readCart(JSON.parse(raw)); } catch { cache = EMPTY_CART; }
  return cache;
}

function persist(next: StoredCart): void {
  const withService = withIncludedService(
    next, freeWithPurchaseService()?.id, new Date().toISOString(),
  );
  try {
    const raw = JSON.stringify(withService);
    window.localStorage.setItem(CART_STORAGE_KEY, raw);
    cacheRaw = raw;
    cache = withService;
  } catch { /* storage disabled — the cart simply does not survive the tab */ }
  for (const l of listeners) l();
}

export function subscribeCart(cb: () => void): () => void {
  listeners.add(cb);
  // Another tab is the same customer. A basket that disagrees between two open
  // tabs is a basket that loses whichever change was made second.
  const onStorage = (e: StorageEvent) => {
    if (e.key === CART_STORAGE_KEY) { cacheRaw = ''; for (const fn of listeners) fn(); }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener('storage', onStorage);
  };
}

export function cartSnapshot(): StoredCart { return load(); }
/** The server renders an empty cart — the real one lives in the browser. */
export function cartServerSnapshot(): StoredCart { return EMPTY_CART; }

export function cartAdd(productId: string, quantity = 1): void {
  persist(addToCart(load(), productId, quantity));
}
export function cartSetQuantity(productId: string, quantity: number): void {
  persist(setQuantity(load(), productId, quantity));
}
export function cartRemove(productId: string): void {
  persist(removeFromCart(load(), productId));
}
export function cartClear(): void {
  persist(clearCart(new Date().toISOString()));
}

/**
 * The cart, joined to live products.
 *
 * WHY THE CATALOGUE IS AN ARGUMENT AND NOT AN IMPORT
 * --------------------------------------------------
 * It used to import the seed catalogue, which meant the browser priced a basket
 * from whatever was true when the code was built — so a price the admin set
 * this morning, or a product they marked out of stock, was invisible here. The
 * server now hands down the live projection, and the arithmetic is unchanged:
 * prices still come from the catalogue rather than from storage, which is what
 * makes a hand-edited basket produce an honest total.
 *
 * The server re-prices everything again before writing an order, so this is
 * what the customer SEES, never what they are charged.
 */
export function resolve(
  cart: StoredCart,
  catalogue: readonly PricedProduct[],
  shippingMinor = 0,
): ResolvedCart<PricedProduct> {
  const byId = new Map(catalogue.map(p => [p.id, p]));
  return resolveCart<PricedProduct>(cart, id => byId.get(id), shippingMinor);
}
