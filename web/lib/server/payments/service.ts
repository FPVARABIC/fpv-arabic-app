import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, isAdminConfigured } from '../firebaseAdmin';
import { getSession } from '../session';
import { logAudit, newRequestId, actorFromSession, type AuditActor } from '../audit';
import { paymentProvider } from './index';
import { PaymentProviderError } from './provider';
import {
  canTransitionPayment, isTerminalPayment, paymentIdempotencyKey,
  type OrderPayment, type PaymentStatus,
} from '@core/data/store/payment';
import type { StoreOrder } from '@core/data/store/types';

/**
 * Everything that happens between «pay» and «paid».
 *
 * THE THREE RULES THIS FILE EXISTS TO ENFORCE
 * -------------------------------------------
 * 1. The amount is read from the ORDER, on the server. A browser cannot supply,
 *    influence, or round it. The checkout form posts an order id and nothing
 *    else about money.
 * 2. An order can have at most one payment in flight. A second attempt while
 *    one is open returns the existing checkout URL rather than creating another
 *    — which is what stops a double-clicked button becoming two charges.
 * 3. A status is written only after asking the provider directly. Not from a
 *    webhook body, and never from the customer's redirect.
 *
 * WHY THE REDIRECT IS IGNORED ENTIRELY
 * ------------------------------------
 * `/store/cart/checkout/done` receives the customer back from the provider and
 * writes NOTHING. It reads the order and reports what the server already knows.
 * Anyone can open that URL — it is a GET in a browser — and if arriving there
 * marked an order paid, the shop would give away hardware to whoever guessed a
 * URL. The redirect exists to reassure a human; the webhook exists to move
 * money's state.
 */

const ORDERS = 'storeOrders';
const PAYMENTS = 'storePayments';

export type StartPaymentResult =
  | { ok: true; checkoutUrl: string; testMode: boolean }
  | { ok: false; errorAr: string };

/** The system's own actor, for state changes no human initiated. */
const SYSTEM_ACTOR: AuditActor = {
  uid: 'system:payments',
  role: 'owner',
  email: null,
};

/**
 * Begin paying for an order.
 *
 * Refuses, with a sentence the customer can act on, in every case where taking
 * money would be wrong.
 */
export async function startPayment(orderId: string): Promise<StartPaymentResult> {
  if (!isAdminConfigured()) return { ok: false, errorAr: 'الدفع غير متاح حالياً.' };

  const provider = paymentProvider();
  if (!provider) {
    return { ok: false, errorAr: 'الدفع الإلكتروني غير مفعّل بعد على هذا الموقع.' };
  }

  const session = await getSession();
  if (!session) return { ok: false, errorAr: 'سجّل الدخول أولاً.' };

  const snap = await adminDb().collection(ORDERS).doc(orderId).get();
  if (!snap.exists) return { ok: false, errorAr: 'لا يوجد طلب بهذا الرقم.' };
  const order = { id: snap.id, ...snap.data() } as StoreOrder;

  // OWNERSHIP. Paying somebody else's order is the attack this line stops, and
  // it is checked before anything else is read or written.
  if (order.customerUid !== session.uid) {
    await logAudit(actorFromSession(session), newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: orderId,
      result: 'denied',
      error: 'attempted to pay an order belonging to another account',
    });
    return { ok: false, errorAr: 'لا يوجد طلب بهذا الرقم.' };
  }

  if (order.status === 'cancelled') {
    return { ok: false, errorAr: 'هذا الطلب ملغى.' };
  }

  // ALREADY PAID, OR ALREADY PAYING.
  const existing = await activePaymentFor(orderId);
  if (existing?.status === 'paid') {
    return { ok: false, errorAr: 'هذا الطلب مدفوع بالفعل.' };
  }
  if (existing && !isTerminalPayment(existing.status) && existing.checkoutUrl) {
    // The same attempt, resumed — not a second charge.
    return { ok: true, checkoutUrl: existing.checkoutUrl, testMode: existing.testMode };
  }

  // THE AMOUNT. From the order document, which the server wrote from the
  // catalogue. Nothing here reads a request body.
  const amountMinor = order.totalMinor;
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, errorAr: 'قيمة الطلب غير صالحة. تواصل معنا.' };
  }

  const attempt = await countPayments(orderId);
  const idempotencyKey = paymentIdempotencyKey(orderId, attempt + 1);
  const origin = requiredOrigin();

  let created;
  try {
    created = await provider.createCheckout({
      orderId,
      amountMinor,
      currency: order.currency,
      descriptionAr: `طلب ${orderId}`,
      returnUrl: `${origin}/store/cart/checkout/done?order=${encodeURIComponent(orderId)}`,
      webhookUrl: `${origin}/api/payments/webhook`,
      idempotencyKey,
      preferredMethods: ['ideal', 'card'],
      locale: 'nl_NL',
    });
  } catch (e) {
    const err = e instanceof PaymentProviderError ? e : null;
    console.error('[payments] createCheckout failed', e);
    return { ok: false, errorAr: err?.customerMessageAr ?? 'تعذّر بدء الدفع الآن. حاول بعد قليل.' };
  }

  const now = new Date().toISOString();
  const payment: Omit<OrderPayment, 'id'> = {
    orderId,
    provider: provider.id,
    providerRef: created.providerRef,
    testMode: created.testMode,
    status: 'pending',
    amountMinor,
    currency: order.currency,
    idempotencyKey,
    checkoutUrl: created.checkoutUrl,
    createdAt: now,
    updatedAt: now,
  };
  await adminDb().collection(PAYMENTS).doc(created.providerRef).set(payment);

  await logAudit(actorFromSession(session), newRequestId(), {
    action: 'store.order.status',
    targetType: 'order',
    targetId: orderId,
    after: 'payment:pending',
    meta: {
      provider: provider.id,
      testMode: created.testMode,
      amountMinor,
      currency: order.currency,
    },
  });

  return { ok: true, checkoutUrl: created.checkoutUrl, testMode: created.testMode };
}

export type WebhookResult =
  | { ok: true; providerRef: string; status: PaymentStatus; changed: boolean }
  | { ok: false; errorAr: string };

/**
 * Apply an incoming webhook.
 *
 * IDEMPOTENT BY CONSTRUCTION
 * --------------------------
 * Providers deliver the same webhook more than once — on retry, on their own
 * schedule, sometimes days later. So this re-reads the authoritative status and
 * applies it; applying `paid` to an already-paid payment writes nothing and
 * returns `changed: false`. There is no counter, no dedupe table, and no window
 * during which a duplicate does damage.
 *
 * OUT-OF-ORDER DELIVERY IS REFUSED, NOT APPLIED
 * ---------------------------------------------
 * A late `pending` arriving after `paid` is not a state change, it is a stale
 * message. `canTransitionPayment` rejects it and the record keeps the truth.
 */
export async function applyPaymentWebhook(
  headers: Headers,
  rawBody: string,
): Promise<WebhookResult> {
  if (!isAdminConfigured()) return { ok: false, errorAr: 'غير متاح.' };

  const provider = paymentProvider();
  if (!provider) return { ok: false, errorAr: 'الدفع غير مفعّل.' };

  // Signature verification lives here, for providers that sign.
  const parsed = provider.parseWebhook(headers, rawBody);
  if (!parsed.ok) return { ok: false, errorAr: parsed.errorAr };

  const ref = parsed.providerRef;

  // The payment must be one WE created. An unknown reference is somebody
  // POSTing ids at the endpoint; it is recorded and refused.
  const doc = await adminDb().collection(PAYMENTS).doc(ref).get();
  if (!doc.exists) {
    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: ref,
      result: 'denied',
      error: 'webhook for an unknown payment reference',
    });
    return { ok: false, errorAr: 'غير معروف.' };
  }
  const payment = { id: doc.id, ...doc.data() } as OrderPayment;

  // THE ONLY SOURCE OF TRUTH: the provider, asked directly.
  let state;
  try {
    state = await provider.fetchStatus(ref);
  } catch (e) {
    console.error('[payments] fetchStatus failed', e);
    // A 5xx tells the provider to retry, which is what we want — the payment's
    // real state is unchanged and unknown to us, and guessing it is worse than
    // being asked again.
    return { ok: false, errorAr: 'تعذّر التحقّق الآن.' };
  }

  // THE AMOUNT MUST MATCH WHAT WE ASKED FOR.
  // A payment that settled for a different figure than the order is either a
  // provider bug or a tampered checkout, and in both cases shipping goods on it
  // would be wrong. It is flagged rather than accepted.
  if (state.status === 'paid' && state.amountMinor !== payment.amountMinor) {
    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      result: 'error',
      error: 'paid amount does not match the order',
      meta: { expected: payment.amountMinor, received: state.amountMinor, providerRef: ref },
    });
    return { ok: false, errorAr: 'تعارض في المبلغ.' };
  }

  if (!canTransitionPayment(payment.status, state.status)) {
    // Stale or impossible. Recorded, refused, and NOT an error to the provider:
    // returning 200 stops it retrying a message we have correctly ignored.
    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      result: 'denied',
      before: payment.status,
      after: state.status,
      error: 'refused an impossible or out-of-order payment transition',
    });
    return { ok: true, providerRef: ref, status: payment.status, changed: false };
  }

  const changed = payment.status !== state.status
    || (state.refundedMinor ?? 0) !== (payment.refundedMinor ?? 0);

  if (changed) {
    await adminDb().collection(PAYMENTS).doc(ref).update({
      status: state.status,
      method: state.method ?? FieldValue.delete(),
      refundedMinor: state.refundedMinor ?? 0,
      failureReason: state.failureReason ?? FieldValue.delete(),
      updatedAt: new Date().toISOString(),
    });

    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      before: payment.status,
      after: state.status,
      meta: { providerRef: ref, method: state.method ?? null, testMode: payment.testMode },
    });
  }

  return { ok: true, providerRef: ref, status: state.status, changed };
}

/** The payment a customer is currently on, if any. */
export async function activePaymentFor(orderId: string): Promise<OrderPayment | null> {
  const snap = await adminDb().collection(PAYMENTS)
    .where('orderId', '==', orderId)
    .get();
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as OrderPayment));
  return all.find(p => p.status === 'paid')
    ?? all.find(p => !isTerminalPayment(p.status))
    ?? null;
}

/** Every payment attached to an order, newest first. For the admin panel. */
export async function paymentsFor(orderId: string): Promise<OrderPayment[]> {
  const snap = await adminDb().collection(PAYMENTS).where('orderId', '==', orderId).get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as OrderPayment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function countPayments(orderId: string): Promise<number> {
  const snap = await adminDb().collection(PAYMENTS).where('orderId', '==', orderId).get();
  return snap.size;
}

/**
 * The public origin, which the provider must be able to reach.
 *
 * Required rather than defaulted: a webhook URL pointing at `localhost` is a
 * webhook that never arrives, and the resulting order sits unpaid with no
 * indication why. Failing here says so immediately.
 */
function requiredOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  throw new PaymentProviderError(
    'NEXT_PUBLIC_SITE_URL must be set for payments — the provider needs a reachable webhook URL',
  );
}
