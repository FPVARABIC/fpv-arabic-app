import 'server-only';
import { getStoreDoc, listStoreDocs, isServiceConfigured } from '../backend/supabase/adminData';
import { priceFrom, realisedMarginPercent, type PriceBreakdown } from '@core/data/store/pricing';
import { INITIAL_PRIVATE_SETTINGS } from '@core/data/store/settings';
import type { StoreSupply } from '@core/data/store/types';

/**
 * The supply side — read and written only on the server.
 *
 * `storeSupply` is named in NO select policy in `0007` — closed to every
 * client in every role — so this module, on the service key, is the only path
 * to it. That is not defence in depth; it is the boundary. A browser
 * that could read this collection would know what the shop pays and what it
 * makes on every item.
 */

/**
 * One product's supply record, or null.
 *
 * Used by the publication gate, which asks about one product at a time. Reading
 * the whole collection to answer that would work and would cost the whole
 * collection on every publish.
 */
export async function supplyForVariant(variantId: string): Promise<StoreSupply | null> {
  if (!isServiceConfigured()) return null;
  try {
    const doc = await getStoreDoc('storeSupply', variantId);
    if (!doc) return null;
    return { variantId, ...(doc as Omit<StoreSupply, 'variantId'>) };
  } catch {
    return null;
  }
}

/**
 * The freshest supply record among a product's variants.
 *
 * The publication gate asks one question per product — «is there a current
 * cost behind this listing» — and a product with three variants has up to three
 * records. The newest is the right answer: it is the one that says how recently
 * anybody looked at this product's economics at all.
 */
export async function supplyFor(productId: string): Promise<StoreSupply | null> {
  const all = await readAllSupply();
  const mine = Object.values(all).filter(s => s.variantId.startsWith(`${productId}:`));
  if (mine.length === 0) return null;
  return mine.reduce((a, b) => (a.updatedAt >= b.updatedAt ? a : b));
}

export async function readAllSupply(): Promise<Record<string, StoreSupply>> {
  if (!isServiceConfigured()) return {};
  try {
    const docs = await listStoreDocs('storeSupply');
    const out: Record<string, StoreSupply> = {};
    for (const [id, doc] of Object.entries(docs)) {
      out[id] = { variantId: id, ...(doc as Omit<StoreSupply, 'variantId'>) };
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * The price a supply record produces, with the arithmetic shown.
 *
 * Returned whole rather than as a number so the admin panel can display what
 * produced it — a wrong price is then traceable to the input that caused it
 * instead of being re-derived by hand.
 */
export function breakdownFor(
  supply: StoreSupply,
  defaultMarginPercent = INITIAL_PRIVATE_SETTINGS.defaultMarginPercent,
): (PriceBreakdown & { realisedPercent: number }) | null {
  const b = priceFrom(supply, { defaultMarginPercent });
  return b ? { ...b, realisedPercent: realisedMarginPercent(b) } : null;
}
