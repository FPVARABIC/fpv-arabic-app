'use server';

import { revalidatePath } from 'next/cache';
import { requireCapability } from '@/lib/server/adminRoute';
import { refundPayment, resyncPayment } from '@/lib/server/payments/service';

/**
 * The two payment actions an operator can take, and the capability that gates
 * them.
 *
 * WHY `store.refundPayments` AND NOT `store.manageOrders`
 * -------------------------------------------------------
 * Advancing an order to «shipped» is a daily fulfilment task that a warehouse
 * role should have. Moving money out of the account is not, and giving both to
 * one capability hands the second to whoever needs the first.
 *
 * Re-syncing sits behind the same gate even though it only READS from the
 * provider — because it WRITES the payment's status here, and a status somebody
 * can set by pressing a button needs the same gate as the money it describes.
 *
 * WHY THESE ARE THIN
 * ------------------
 * Every rule — the refund ceiling, the transition check, the amount and
 * currency checks, the audit entry — lives in `payments/service.ts`, so it
 * applies whether the call came from this screen, from a script, or from
 * anywhere else added later. A validation written in a server action protects
 * one caller.
 */

export type PaymentActionResult =
  | { ok: true; messageAr: string }
  | { ok: false; errorAr: string };

export async function resyncPaymentAction(
  providerRef: string,
  orderId: string,
): Promise<PaymentActionResult> {
  const gate = await requireCapability('store.refundPayments');
  if (!gate.ok) return { ok: false, errorAr: gate.errorAr };

  const r = await resyncPayment(providerRef, {
    uid: gate.session.uid,
    role: gate.session.role,
    email: gate.session.email ?? null,
  });

  revalidatePath(`/admin/store/orders/${orderId}`);

  if (!r.ok) return { ok: false, errorAr: r.errorAr };
  return {
    ok: true,
    messageAr: r.changed
      ? `حُدِّثت الحالة إلى: ${r.status}`
      : 'الحالة لم تتغيّر — ما لدينا يطابق ما لدى المزوّد.',
  };
}

export async function refundAction(
  providerRef: string,
  orderId: string,
  amountMinor: number,
): Promise<PaymentActionResult> {
  const gate = await requireCapability('store.refundPayments');
  if (!gate.ok) return { ok: false, errorAr: gate.errorAr };

  // A shape check only. The CEILING — how much is left to refund — is checked
  // in the service against the stored payment, because that is the number a
  // browser must never be able to influence.
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    return { ok: false, errorAr: 'أدخل مبلغاً صحيحاً أكبر من صفر.' };
  }

  const r = await refundPayment(providerRef, amountMinor, {
    uid: gate.session.uid,
    role: gate.session.role,
    email: gate.session.email ?? null,
  });

  revalidatePath(`/admin/store/orders/${orderId}`);

  if (!r.ok) return { ok: false, errorAr: r.errorAr };
  return {
    ok: true,
    messageAr: `نُفِّذ الاسترجاع. الحالة الآن: ${r.status}`,
  };
}
