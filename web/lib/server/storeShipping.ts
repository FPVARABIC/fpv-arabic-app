import 'server-only';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import {
  SEED_SHIPPING_ZONES, EMPTY_SHIPPING_RULES, quoteShipping,
  type ShippingZone, type ShippingRules, type ShippingQuote, type ShippingLine,
} from '@core/data/store/shipping';

/**
 * Shipping zones, as the admin panel has them.
 *
 * WHY THE SEEDS ARE A FLOOR AND NOT A DEFAULT PRICE
 * -------------------------------------------------
 * A zone that has never been touched reads back with `costMinor: null`, which
 * refuses to quote. So a fresh deployment ships with the four zones present and
 * priced at nothing — the checkout says «غير مسعَّر بعد» and no order completes.
 * That is the correct failure: a shop that quotes a made-up rate loses real
 * money on every parcel until somebody notices, and nobody notices quickly.
 *
 * The FIRESTORE copy wins wherever it exists. The seeds only supply the zone's
 * identity and its country list, which are facts rather than commercial
 * decisions.
 */

const ZONES = 'storeShippingZones';
const RULES_DOC = 'storeSettings/shippingRules';

export async function shippingZones(): Promise<ShippingZone[]> {
  if (!isAdminConfigured()) return SEED_SHIPPING_ZONES;
  try {
    const snap = await adminDb().collection(ZONES).get();
    if (snap.empty) return SEED_SHIPPING_ZONES;
    const stored = new Map(snap.docs.map(d => [d.id, d.data() as Partial<ShippingZone>]));
    return SEED_SHIPPING_ZONES.map(seed => {
      const s = stored.get(seed.id);
      if (!s) return seed;
      return {
        ...seed,
        // Countries stay with the seed: which states are in the EU is not an
        // admin decision, and an editable list is one typo away from a country
        // silently falling out of every zone.
        costMinor: s.costMinor ?? null,
        freeOverMinor: s.freeOverMinor ?? null,
        etaDaysMin: s.etaDaysMin ?? null,
        etaDaysMax: s.etaDaysMax ?? null,
        enabled: s.enabled ?? seed.enabled,
        updatedAt: s.updatedAt ?? seed.updatedAt,
      };
    });
  } catch {
    // Same posture as the catalogue: degraded and honest beats a 500. Every
    // zone reverts to unpriced, so the shop refuses to quote rather than
    // quoting from a stale guess.
    return SEED_SHIPPING_ZONES;
  }
}

export async function shippingRules(): Promise<ShippingRules> {
  if (!isAdminConfigured()) return EMPTY_SHIPPING_RULES;
  try {
    const doc = await adminDb().doc(RULES_DOC).get();
    if (!doc.exists) return EMPTY_SHIPPING_RULES;
    const d = doc.data() as Partial<ShippingRules>;
    return {
      blockedCategoryIds: d.blockedCategoryIds ?? [],
      manualReviewProductIds: d.manualReviewProductIds ?? [],
    };
  } catch {
    return EMPTY_SHIPPING_RULES;
  }
}

/**
 * The shipping cost for an order, computed on the SERVER.
 *
 * The browser may show an estimate while somebody types their address; this is
 * the figure that goes on the order and into the payment. A checkout that
 * accepted a client-computed shipping cost has the same hole as one that
 * accepts a client-computed total, only smaller and harder to spot.
 */
export async function quoteShippingFor(
  country: string,
  itemsTotalMinor: number,
  lines: readonly ShippingLine[],
): Promise<ShippingQuote> {
  const [zones, rules] = await Promise.all([shippingZones(), shippingRules()]);
  return quoteShipping({ country, itemsTotalMinor, lines, zones, rules });
}

export async function saveShippingZone(
  zoneId: string,
  patch: Pick<ShippingZone, 'costMinor' | 'freeOverMinor' | 'etaDaysMin' | 'etaDaysMax' | 'enabled'>,
): Promise<void> {
  await adminDb().collection(ZONES).doc(zoneId).set(
    { ...patch, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}
