'use server';

import { placeOrder } from '@/lib/server/storeOrders';
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
