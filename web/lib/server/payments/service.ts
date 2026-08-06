import 'server-only';
import {
  getOrderDoc, updateOrderDoc, getPaymentDoc, setPaymentDoc, mergePaymentDoc,
  listPaymentDocsForOrder, isServiceConfigured,
} from '../../backend/supabase/adminData';
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
  if (!isServiceConfigured()) return { ok: false, errorAr: 'الدفع غير متاح حالياً.' };

  const provider = paymentProvider();
  if (!provider) {
    return { ok: false, errorAr: 'الدفع الإلكتروني غير مفعّل بعد على هذا الموقع.' };
  }

  const session = await getSession();
  if (!session) return { ok: false, errorAr: 'سجّل الدخول أولاً.' };

  const row = await getOrderDoc(orderId).catch(() => null);
  if (!row) return { ok: false, errorAr: 'لا يوجد طلب بهذا الرقم.' };
  const order = { id: row.id, ...row.doc } as StoreOrder;

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
  await setPaymentDoc(created.providerRef, orderId, 'pending',
    payment as unknown as Record<string, unknown>);

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
  if (!isServiceConfigured()) return { ok: false, errorAr: 'غير متاح.' };

  const provider = paymentProvider();
  if (!provider) return { ok: false, errorAr: 'الدفع غير مفعّل.' };

  // Signature verification lives here, for providers that sign.
  const parsed = provider.parseWebhook(headers, rawBody);
  if (!parsed.ok) return { ok: false, errorAr: parsed.errorAr };

  const ref = parsed.providerRef;

  // The payment must be one WE created. An unknown reference is somebody
  // POSTing ids at the endpoint; it is recorded and refused.
  const doc = await getPaymentDoc(ref).catch(() => null);
  if (!doc) {
    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: ref,
      result: 'denied',
      error: 'webhook for an unknown payment reference',
    });
    return { ok: false, errorAr: 'غير معروف.' };
  }
  const payment = { id: ref, ...doc } as OrderPayment;

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

  // AND THE CURRENCY MUST MATCH TOO.
  // Checking only the amount is a hole with a number in it: 250 in a currency
  // worth a fraction of the euro passes an equality test on the integer and is
  // not the price. Currency is half of what an amount means.
  if (state.status === 'paid' && state.currency !== payment.currency) {
    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      result: 'error',
      error: 'paid currency does not match the order',
      meta: { expected: payment.currency, received: state.currency, providerRef: ref },
    });
    return { ok: false, errorAr: 'تعارض في العملة.' };
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
    await mergePaymentDoc(ref, {
      status: state.status,
      method: state.method ?? null,
      refundedMinor: state.refundedMinor ?? 0,
      failureReason: state.failureReason ?? null,
      updatedAt: new Date().toISOString(),
    }, state.status);

    await logAudit(SYSTEM_ACTOR, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      before: payment.status,
      after: state.status,
      meta: { providerRef: ref, method: state.method ?? null, testMode: payment.testMode },
    });

    await advanceOrderForPayment(payment.orderId, state.status);
  }

  return { ok: true, providerRef: ref, status: state.status, changed };
}

/**
 * The ONE place a payment moves an order's own status.
 *
 * THE POLICY, STATED RATHER THAN SCATTERED
 * ----------------------------------------
 *   paid                    → `received` becomes `confirmed`, once.
 *   failed / cancelled      → NOTHING. The order stays where it is.
 *   refunded / partial      → NOTHING automatic.
 *
 * The two «nothing»s are the interesting ones and both were asked for
 * explicitly.
 *
 * A failed or cancelled payment must not delete or cancel the order: the
 * customer's basket, address and choices are still valid and they will very
 * often pay again with another method. Cancelling on their behalf destroys work
 * they did and a sale that was still live.
 *
 * A refund must not silently walk the order backwards. Money returning is a new
 * event, not the undoing of an old one — the parcel may already have shipped,
 * and an order that flips from `shipped` back to `received` because a refund
 * arrived is a record that has started lying about what happened. Whether to
 * cancel after a refund is a human decision, taken in the admin panel, audited.
 *
 * Forward-only and idempotent: it only ever acts on `received`, so a repeated
 * `paid` webhook cannot re-advance an order somebody has since moved on.
 */
async function advanceOrderForPayment(orderId: string, status: PaymentStatus): Promise<void> {
  if (status !== 'paid') return;

  const row = await getOrderDoc(orderId).catch(() => null);
  if (!row) return;

  const current = (row.doc as unknown as StoreOrder).status;
  if (current !== 'received') return;

  // The document and the relational spine move together, and the payment
  // column records that money settled — the axis 0004 exists for.
  await updateOrderDoc(orderId,
    { status: 'confirmed', updatedAt: new Date().toISOString() },
    { fulfilment: 'confirmed', payment_state: 'paid' });

  await logAudit(SYSTEM_ACTOR, newRequestId(), {
    action: 'store.order.status',
    targetType: 'order',
    targetId: orderId,
    before: current,
    after: 'confirmed',
    meta: { reason: 'payment settled' },
  });
}

export type RefundResult =
  | { ok: true; status: PaymentStatus; refundedMinor: number }
  | { ok: false; errorAr: string };

/**
 * Send money back. Staff only, server only.
 *
 * WHY THE CEILING IS CHECKED HERE AND NOT ONLY AT THE PROVIDER
 * ------------------------------------------------------------
 * The provider will refuse to over-refund, but by then the request has been
 * made and the failure is a provider error somebody has to interpret. Checking
 * against our own record turns «refund exceeds the amount paid» into a sentence
 * in Arabic before any money moves — and it means a provider that DIDN'T check
 * could not be used to over-refund through us.
 */
export async function refundPayment(
  providerRef: string,
  amountMinor: number,
  actor: AuditActor,
): Promise<RefundResult> {
  if (!isServiceConfigured()) return { ok: false, errorAr: 'غير متاح.' };

  const provider = paymentProvider();
  if (!provider) return { ok: false, errorAr: 'الدفع غير مفعّل.' };
  if (!provider.refund) {
    return { ok: false, errorAr: 'مزوّد الدفع الحالي لا يدعم الاسترجاع من هنا.' };
  }

  const doc = await getPaymentDoc(providerRef).catch(() => null);
  if (!doc) return { ok: false, errorAr: 'لا توجد عملية دفع بهذا المعرّف.' };
  const payment = { id: providerRef, ...doc } as OrderPayment;

  if (payment.status !== 'paid' && payment.status !== 'partially_refunded') {
    return { ok: false, errorAr: 'لا يمكن استرجاع عملية غير مدفوعة.' };
  }

  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, errorAr: 'أدخل مبلغاً صحيحاً أكبر من صفر.' };
  }

  const already = payment.refundedMinor ?? 0;
  const remaining = payment.amountMinor - already;
  if (amountMinor > remaining) {
    return {
      ok: false,
      errorAr: `المبلغ يتجاوز المتبقّي القابل للاسترجاع (${remaining / 100}).`,
    };
  }

  let state;
  try {
    state = await provider.refund(providerRef, amountMinor);
  } catch (e) {
    console.error('[payments] refund failed', e);
    await logAudit(actor, newRequestId(), {
      action: 'store.order.status',
      targetType: 'order',
      targetId: payment.orderId,
      result: 'error',
      error: 'refund call failed',
      meta: { providerRef },
    });
    return { ok: false, errorAr: 'تعذّر تنفيذ الاسترجاع الآن.' };
  }

  await mergePaymentDoc(providerRef, {
    status: state.status,
    refundedMinor: state.refundedMinor ?? already + amountMinor,
    updatedAt: new Date().toISOString(),
  }, state.status);

  await logAudit(actor, newRequestId(), {
    action: 'store.order.status',
    targetType: 'order',
    targetId: payment.orderId,
    before: payment.status,
    after: state.status,
    meta: { providerRef, refundedMinor: amountMinor, testMode: payment.testMode },
  });

  return { ok: true, status: state.status, refundedMinor: state.refundedMinor ?? 0 };
}

/**
 * Ask the provider again, on demand.
 *
 * For the case a webhook was lost — a deploy mid-flight, an outage, a URL that
 * was wrong for an hour. Without this the only repair is waiting for a provider
 * retry that may never come, and an order sits unpaid while the money is in the
 * account.
 *
 * It routes through the SAME `applyPaymentWebhook` rather than writing directly,
 * so a manual resync obeys every rule an automatic one does: the transition
 * check, the amount check, the currency check and the audit entry.
 */
export async function resyncPayment(
  providerRef: string,
  actor: AuditActor,
): Promise<WebhookResult> {
  const provider = paymentProvider();
  if (!provider) return { ok: false, errorAr: 'الدفع غير مفعّل.' };

  await logAudit(actor, newRequestId(), {
    action: 'store.order.status',
    targetType: 'order',
    targetId: providerRef,
    meta: { reason: 'manual resync requested' },
  });

  const body = new URLSearchParams({ id: providerRef }).toString();
  return applyPaymentWebhook(new Headers(), body);
}

/** The payment a customer is currently on, if any. */
export async function activePaymentFor(orderId: string): Promise<OrderPayment | null> {
  const all = (await listPaymentDocsForOrder(orderId))
    .map(d => ({ ...d } as unknown as OrderPayment));
  return all.find(p => p.status === 'paid')
    ?? all.find(p => !isTerminalPayment(p.status))
    ?? null;
}

/** Every payment attached to an order, newest first. For the admin panel. */
export async function paymentsFor(orderId: string): Promise<OrderPayment[]> {
  return (await listPaymentDocsForOrder(orderId))
    .map(d => ({ ...d } as unknown as OrderPayment))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function countPayments(orderId: string): Promise<number> {
  return (await listPaymentDocsForOrder(orderId)).length;
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
