import 'server-only';
import { adminDb, isAdminConfigured } from './firebaseAdmin';
import { getSession } from './session';
import { readCart, resolveCart } from '@core/data/store/cart';
import { freeSetupVariantId } from '@core/data/store/services';
import { cartProductViews } from './storeCatalogue';
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

const ORDERS = 'storeOrders';

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
  if (!isAdminConfigured()) return { ok: false, errorAr: 'الطلبات غير متاحة حالياً. حاول لاحقاً.' };

  const session = await getSession();
  if (!session) {
    return { ok: false, errorAr: 'سجّل الدخول أولاً — الطلب يُربط بحسابك حتى تتابعه.' };
  }

  const contact = validateContact(submission.contact);
  if ('errorAr' in contact) return { ok: false, errorAr: contact.errorAr };

  // Prices come from the catalogue, never from the request.
  const cart = readCart({
    v: CART_SCHEMA_VERSION,
    items: Array.isArray(submission.items) ? submission.items : [],
    updatedAt: '',
  });

  // The merged, live catalogue — the same rows the browser priced from, read
  // again here so a basket assembled against yesterday's prices is repriced
  // against today's before anything is written.
  const views = await cartProductViews();
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

  const resolved = resolveCart({ ...cart, items }, id => byId.get(id), 0);
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
    // Quoted after the address is known, and recorded as unset rather than as
    // zero — zero is a price, and it is not the one we are offering.
    shippingMinor: 0,
    totalMinor: resolved.totals.totalMinor,
    currency: 'USD',
    contact: contact.value,
    includesFreeSetup: !!freeVariantId && resolved.lines.some(l => l.product.id === freeVariantId),
    status: 'received',
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await adminDb().collection(ORDERS).add(order);
    // A pointer under the customer's own document, so «طلباتي» is one scoped
    // read rather than a query across everybody's orders.
    await adminDb().doc(`users/${session.uid}/orderRefs/${ref.id}`)
      .set({ orderId: ref.id, createdAt: now, status: 'received' });
    return { ok: true, orderId: ref.id };
  } catch {
    return { ok: false, errorAr: 'تعذّر حفظ الطلب. حاول مرة أخرى.' };
  }
}

type ContactResult =
  | { value: StoreOrder['contact'] }
  | { errorAr: string };

/**
 * Validates contact details.
 *
 * Length caps rather than format rules for the name and address: Arabic
 * addresses do not follow one shape, and a regex that rejects a real address
 * is worse than a field that accepts an odd one. The phone is checked only for
 * having enough digits to be a phone at all.
 */
function validateContact(raw: OrderSubmission['contact']): ContactResult {
  if (typeof raw !== 'object' || raw === null) return { errorAr: 'بيانات التواصل ناقصة.' };

  const str = (v: unknown, max: number) =>
    typeof v === 'string' ? v.trim().slice(0, max) : '';

  const fullNameAr = str(raw.fullNameAr, 120);
  const phone = str(raw.phone, 32);
  const country = str(raw.country, 60);
  const cityAr = str(raw.cityAr, 80);
  const addressAr = str(raw.addressAr, 400);
  const notesAr = str(raw.notesAr, 600);

  if (fullNameAr.length < 3) return { errorAr: 'اكتب اسمك كاملاً.' };
  if ((phone.match(/\d/g) ?? []).length < 7) {
    return { errorAr: 'اكتب رقم هاتف صحيحاً — نحتاجه للتواصل بشأن الشحن.' };
  }
  if (!country) return { errorAr: 'اختر بلد الشحن.' };
  if (cityAr.length < 2) return { errorAr: 'اكتب المدينة.' };
  if (addressAr.length < 10) return { errorAr: 'اكتب العنوان بتفصيل يكفي لوصول الشحنة.' };

  return {
    value: {
      fullNameAr, phone, country, cityAr, addressAr,
      ...(notesAr ? { notesAr } : {}),
    },
  };
}

/** Orders, newest first. Staff only — the caller checks the capability. */
export async function listOrders(opts: { status?: OrderStatus; limit?: number } = {}) {
  if (!isAdminConfigured()) return [];
  let q = adminDb().collection(ORDERS).orderBy('createdAt', 'desc');
  if (opts.status) q = q.where('status', '==', opts.status) as typeof q;
  const snap = await q.limit(opts.limit ?? 50).get();
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<StoreOrder, 'id'>) }));
}

export async function getOrder(orderId: string): Promise<StoreOrder | null> {
  if (!isAdminConfigured()) return null;
  const doc = await adminDb().collection(ORDERS).doc(orderId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...(doc.data() as Omit<StoreOrder, 'id'>) };
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
  await adminDb().collection(ORDERS).doc(orderId).update({ status: next, updatedAt: now });
  await adminDb().doc(`users/${order.customerUid}/orderRefs/${orderId}`)
    .set({ status: next, updatedAt: now }, { merge: true });
  return { ok: true };
}
