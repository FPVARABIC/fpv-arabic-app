'use server';

import { placeOrder } from '@/lib/server/storeOrders';
import { startPayment, type StartPaymentResult } from '@/lib/server/payments/service';
import { quoteShippingFor } from '@/lib/server/storeShipping';
import { cartProductViews } from '@/lib/server/storeCatalogue';
import type { OrderSubmission } from '@core/data/store/types';

/**
 * The one way an order is created.
 *
 * A server action rather than a route handler because the form is the only
 * caller and the boundary is the same either way: everything inside
 * `placeOrder` re-checks the session, re-prices the basket from the catalogue,
 * and refuses anything it cannot honour. Nothing here trusts what arrived.
 */
export async function submitOrder(submission: OrderSubmission) {
  return placeOrder(submission);
}

/**
 * Begin paying for an order that already exists.
 *
 * NOTE WHAT THIS SIGNATURE DOES NOT ACCEPT: an amount, a currency, a line, or
 * a basket. It takes an order id, and the server reads what that order costs
 * from the order it wrote itself. A checkout action that accepted a total would
 * be a shop whose prices are suggestions — see `payments/service.ts`.
 *
 * Returns the URL rather than redirecting, so the caller can render a real
 * error in place when the provider is unreachable or payment is not configured.
 * A redirect swallows that distinction.
 */
export async function beginPayment(orderId: string): Promise<StartPaymentResult> {
  if (typeof orderId !== 'string' || !orderId.trim()) {
    return { ok: false, errorAr: 'رقم الطلب غير صالح.' };
  }
  return startPayment(orderId.trim());
}

/**
 * What shipping costs to a country, for the checkout to display.
 *
 * The SAME function `placeOrder` uses, so the figure shown and the figure
 * charged cannot drift apart — that is the whole reason this is a round trip
 * rather than a calculation in the browser.
 *
 * It takes the basket's variant ids and re-reads their categories on the
 * server: the category decides whether a line is shippable at all, and a
 * browser-supplied category would let somebody ship a blocked item by relabelling
 * it.
 */
export async function quoteShippingAction(
  country: string,
  itemsTotalMinor: number,
  variantIds: string[],
): Promise<
  | { ok: true; costMinor: number; zoneNameAr: string; etaAr: string | null }
  | { ok: false; messageAr: string }
> {
  if (typeof country !== 'string' || !/^[A-Za-z]{2}$/.test(country.trim())) {
    return { ok: false, messageAr: 'اختر بلد الشحن.' };
  }
  if (!Number.isInteger(itemsTotalMinor) || itemsTotalMinor < 0) {
    return { ok: false, messageAr: 'تعذّر حساب الشحن.' };
  }

  const views = await cartProductViews();
  const byId = new Map(views.map(v => [v.id, v]));
  const lines = (Array.isArray(variantIds) ? variantIds : [])
    .slice(0, 100)
    .map(id => byId.get(id))
    .filter((v): v is NonNullable<typeof v> => !!v)
    .map(v => ({ productId: v.productId, categoryId: v.categoryId ?? '' }));

  const q = await quoteShippingFor(country.trim().toUpperCase(), itemsTotalMinor, lines);
  if (!q.ok) return { ok: false, messageAr: q.messageAr };

  const etaAr = q.etaDaysMin !== null && q.etaDaysMax !== null
    ? `التوصيل خلال ${q.etaDaysMin}–${q.etaDaysMax} يوماً`
    : null;

  return { ok: true, costMinor: q.costMinor, zoneNameAr: q.zoneNameAr, etaAr };
}
