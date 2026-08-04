import 'server-only';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import { priceFrom, realisedMarginPercent, type PriceBreakdown } from '@core/data/store/pricing';
import { INITIAL_PRIVATE_SETTINGS } from '@core/data/store/settings';
import type { StoreSupply } from '@core/data/store/types';

/**
 * The supply side — read and written only on the server.
 *
 * `storeSupply` is closed to every client by the rules, so this module is the
 * only path to it. That is not defence in depth; it is the boundary. A browser
 * that could read this collection would know what the shop pays and what it
 * makes on every item.
 */

const SUPPLY = 'storeSupply';

/**
 * One product's supply record, or null.
 *
 * Used by the publication gate, which asks about one product at a time. Reading
 * the whole collection to answer that would work and would cost the whole
 * collection on every publish.
 */
export async function supplyFor(productId: string): Promise<StoreSupply | null> {
  if (!isAdminConfigured()) return null;
  try {
    const doc = await adminDb().collection(SUPPLY).doc(productId).get();
    if (!doc.exists) return null;
    return { productId, ...(doc.data() as Omit<StoreSupply, 'productId'>) };
  } catch {
    return null;
  }
}

export async function readAllSupply(): Promise<Record<string, StoreSupply>> {
  if (!isAdminConfigured()) return {};
  try {
    const snap = await adminDb().collection(SUPPLY).get();
    const out: Record<string, StoreSupply> = {};
    for (const d of snap.docs) out[d.id] = { productId: d.id, ...(d.data() as Omit<StoreSupply, 'productId'>) };
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
