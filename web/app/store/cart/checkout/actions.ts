'use server';

import { placeOrder } from '@/lib/server/storeOrders';
import { startPayment, type StartPaymentResult } from '@/lib/server/payments/service';
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
