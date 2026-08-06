import 'server-only';
import {
  insertOrderDoc, getOrderDoc, listOrderDocs, updateOrderDoc, isServiceConfigured,
} from '../backend/supabase/adminData';
import { getSession } from './session';
import { readCart, resolveCart } from '@core/data/store/cart';
import { freeSetupVariantId } from '@core/data/store/services';
import { cartProductViews } from './storeCatalogue';
import { quoteShippingFor, shippingZones } from './storeShipping';
import { validateAddress } from '@core/data/store/address';
import { shippableCountries } from '@core/data/store/shipping';
import { publicStoreSettings } from './storeSettings';
import { CART_SCHEMA_VERSION } from '@core/data/store/cart';
import { ORDER_STATUS_NEXT } from '@core/data/store/types';
import type { OrderStatus, OrderSubmission, StoreOrder } from '@core/data/store/types';

/**
 * Writing and reading orders — on the server, always.
 *
 * WHY THE BROWSER NEVER SENDS A PRICE
 * -----------------------------------
 * The checkout form posts product ids and quantities and nothing else. This
 * module looks each one up in the catalogue, prices it, and computes the total
 * itself. That is not belt-and-braces; it is the only thing between the shop
 * and a browser that posts `{total: 1}`. A server that trusts a submitted total
 * has no prices at all, only suggestions.
 *
 * WHY THE PRICE IS THEN FROZEN ONTO THE ORDER
 * -------------------------------------------
 * Once written, an order's lines carry their own numbers and never look at the
 * catalogue again. A margin edited tomorrow must not change what a customer
 * agreed to today, and an order that follows the live price is not a record of
 * an agreement — it is a live quote pretending to be one.
 *
 * WHY THE FREE SERVICE IS ADDED HERE TOO
 * --------------------------------------
 * The browser adds it to the basket so the customer sees it while deciding. The
 * server adds it independently, because a basket can be edited and a promise
 * the shop made should not depend on the customer's copy of it surviving.
 */

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; errorAr: string };

/**
 * Places an order from a submission.
 *
 * Every refusal is a sentence a customer can act on. «حدث خطأ» is what a shop
 * says when it has not thought about what could go wrong.
 */
export async function placeOrder(submission: OrderSubmission): Promise<PlaceOrderResult> {
  if (!isServiceConfigured()) return { ok: false, errorAr: 'الطلبات غير متاحة حالياً. حاول لاحقاً.' };

  const session = await getSession();
  if (!session) {
    return { ok: false, errorAr: 'سجّل الدخول أولاً — الطلب يُربط بحسابك حتى تتابعه.' };
  }

  // The address is validated against the countries we can ACTUALLY quote, so a
  // destination that would be refused two steps later is refused here, at the
  // field that caused it.
  const zones = await shippingZones();
  const address = validateAddress(submission.contact, {
    shippableCountries: shippableCountries(zones),
  });
  if (!address.ok) {
    // Every problem at once. A checkout that reveals one error per submission
    // makes somebody submit five times to learn five things the server knew
    // from the first.
    return { ok: false, errorAr: address.errors.map(e => e.messageAr).join(' · ') };
  }

  // Prices come from the catalogue, never from the request.
  const cart = readCart({
    v: CART_SCHEMA_VERSION,
    items: Array.isArray(submission.items) ? submission.items : [],
    updatedAt: '',
  });

  // The merged, live catalogue — the same rows the browser priced from, read
  // again here so a basket assembled against yesterday's prices is repriced
  // against today's before anything is written.
  const [views, settings] = await Promise.all([cartProductViews(), publicStoreSettings()]);
  const byId = new Map(views.map(v => [v.id, v]));

  const freeVariantId = freeSetupVariantId();
  const hasPayable = cart.items.some(i => i.variantId !== freeVariantId);
  if (!hasPayable) return { ok: false, errorAr: 'سلّتك فارغة.' };

  // THE PROMISE, DECIDED HERE AND NOWHERE ELSE
  // ------------------------------------------
  // The browser adds the free service optimistically so the customer sees it
  // while deciding. The server decides whether it was ever earned — and it is
  // earned by an ELIGIBLE line, not by any line. A basket of propellers does
  // not qualify, and a basket that arrives claiming the service without one
  // gets it removed rather than honoured.
  const earnsFreeSetup = cart.items.some(i => byId.get(i.variantId)?.freeSetupEligible === true);
  const items = cart.items.filter(i => i.variantId !== freeVariantId);
  if (earnsFreeSetup && freeVariantId) items.push({ variantId: freeVariantId, quantity: 1 });

  // Priced with zero shipping FIRST, because the shipping quote needs the items
  // total to decide whether a free-shipping threshold is met. Two passes, not a
  // guess.
  const priced = resolveCart({ ...cart, items }, id => byId.get(id), 0);
  if (priced.lines.length === 0) {
    return { ok: false, errorAr: 'لم يعد أي منتج في سلّتك متاحاً للطلب.' };
  }

  // SHIPPING IS COMPUTED HERE, FROM THE ADDRESS, ON THE SERVER.
  //
  // Never taken from the submission. A checkout that accepts a client-supplied
  // shipping cost has exactly the hole that accepting a client-supplied total
  // has — it is merely smaller, and therefore likelier to survive review.
  //
  // A destination we cannot quote REFUSES THE ORDER rather than defaulting to
  // zero. Shipping something for nothing because no rule matched is how a shop
  // discovers its rates by losing money on them.
  const shipping = await quoteShippingFor(
    address.value.country,
    priced.totals.itemsTotalMinor,
    priced.lines.map(l => ({
      productId: l.product.productId,
      categoryId: byId.get(l.product.id)?.categoryId ?? '',
    })),
  );
  if (!shipping.ok) return { ok: false, errorAr: shipping.messageAr };

  const resolved = resolveCart({ ...cart, items }, id => byId.get(id), shipping.costMinor);
  if (resolved.lines.length === 0) {
    return { ok: false, errorAr: 'لم يعد أي منتج في سلّتك متاحاً للطلب.' };
  }
  if (resolved.dropped.length > 0) {
    // Refused rather than silently trimmed: a customer who ordered four things
    // and receives three did not agree to that.
    //
    // And it NAMES what changed. «Something in your basket changed» sends
    // somebody back to a list of four items to work out which — the shop knows,
    // so the shop says.
    const reasons = resolved.dropped
      .map(d => `${byId.get(d.variantId)?.nameEn ?? d.variantId}: ${d.reasonAr}`)
      .join(' · ');
    return {
      ok: false,
      errorAr: `تغيّر توفّر بعض ما في سلّتك — ${reasons} افتح السلة وراجعها ثم أعد المحاولة.`,
    };
  }

  const now = new Date().toISOString();
  const order: Omit<StoreOrder, 'id'> = {
    customerUid: session.uid,
    items: resolved.lines.map(l => ({
      variantId: l.product.id,
      productId: l.product.productId,
      nameEn: l.product.nameEn,
      titleAr: l.product.titleAr,
      variantNameAr: l.product.variantNameAr,
      quantity: l.quantity,
      unitPriceMinor: l.unitPriceMinor,
      lineTotalMinor: l.lineTotalMinor,
    })),
    itemsTotalMinor: resolved.totals.itemsTotalMinor,
    // The figure the server quoted from the address, not from the request.
    shippingMinor: shipping.costMinor,
    totalMinor: resolved.totals.totalMinor,
    // From the shop's own settings. It used to be the literal 'USD' while the
    // shipping zones, the payment provider and the customer were all in euros —
    // a mismatch that would have reached Mollie as a currency it was not asked
    // to charge in.
    currency: settings.currency,
    contact: address.value,
    includesFreeSetup: !!freeVariantId && resolved.lines.some(l => l.product.id === freeVariantId),
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };

  try {
    // One insert writes both halves: the document (the contract every page
    // reads) and the relational spine (`user_id`, the totals, the fulfilment
    // state) that RLS polices — so «طلباتي» is `orders_read_own` doing its
    // job rather than a pointer sub-collection kept manually in step.
    const orderId = await insertOrderDoc({
      ...order,
      customerUid: session.uid,
    });
    return { ok: true, orderId };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الطلب. حاول مرة أخرى.' };
  }
}

/** Orders, newest first. Staff only — the caller checks the capability. */
export async function listOrders(opts: { status?: OrderStatus; limit?: number } = {}) {
  if (!isServiceConfigured()) return [];
  const rows = await listOrderDocs({ fulfilment: opts.status, limit: opts.limit ?? 50 });
  return rows.map(r => ({ id: r.id, ...(r.doc as unknown as Omit<StoreOrder, 'id'>) }));
}

export async function getOrder(orderId: string): Promise<StoreOrder | null> {
  if (!isServiceConfigured()) return null;
  const row = await getOrderDoc(orderId);
  if (!row) return null;
  return { id: row.id, ...(row.doc as unknown as Omit<StoreOrder, 'id'>) };
}

/** The signed-in customer's own orders, for «طلباتي». */
export async function listOrdersForUser(uid: string): Promise<StoreOrder[]> {
  if (!isServiceConfigured()) return [];
  const rows = await listOrderDocs({ userId: uid, limit: 100 });
  return rows.map(r => ({ id: r.id, ...(r.doc as unknown as Omit<StoreOrder, 'id'>) }));
}

export type UpdateStatusResult = { ok: true } | { ok: false; errorAr: string };

/**
 * Moves an order forward.
 *
 * Refuses any transition the lifecycle does not declare, so a delivered order
 * cannot return to «received». An order's history is a record of what happened,
 * and a record that can move backwards is a record that can be rewritten.
 */
export async function updateOrderStatus(
  orderId: string,
  next: OrderStatus,
): Promise<UpdateStatusResult> {
  const order = await getOrder(orderId);
  if (!order) return { ok: false, errorAr: 'لا يوجد طلب بهذا المعرّف.' };

  const allowed = ORDER_STATUS_NEXT[order.status] ?? [];
  if (!allowed.includes(next)) {
    return { ok: false, errorAr: `لا يمكن الانتقال من «${order.status}» إلى «${next}».` };
  }

  const now = new Date().toISOString();
  // The document and the spine's `fulfilment` column move in one call — the
  // single-writer rule that keeps the two halves from ever disagreeing.
  await updateOrderDoc(orderId, { status: next, updatedAt: now }, { fulfilment: next });
  return { ok: true };
}
