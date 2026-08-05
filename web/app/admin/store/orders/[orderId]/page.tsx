import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { AdminShell } from '@/components/admin/AdminShell';
import { getOrder } from '@/lib/server/storeOrders';
import { paymentsFor } from '@/lib/server/payments/service';
import { isPaymentConfigured, isPaymentTestMode } from '@/lib/server/payments';
import { PaymentPanel } from '@/components/admin/PaymentPanel';
import { PAYMENT_STATUS_LABEL_AR, PAYMENT_METHOD_LABEL_AR } from '@core/data/store/payment';
import { ORDER_STATUS_LABEL_AR } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';

export const metadata: Metadata = {
  title: 'تفاصيل الطلب — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * One order, with its payments.
 *
 * WHY EVERY ATTEMPT IS SHOWN, NOT JUST THE LAST
 * ---------------------------------------------
 * A customer who tried three times and succeeded on the fourth is a fact worth
 * being able to read back — it is the difference between «their card is fine»
 * and «our checkout is losing people». Showing only the successful attempt
 * hides exactly the pattern that would tell somebody to look.
 *
 * WHY THE REFUND CONTROL IS ABSENT RATHER THAN DISABLED FOR MOST ROLES
 * ---------------------------------------------------------------------
 * A disabled button still tells you the power exists and invites the question
 * of how to enable it. The capability gate is on the SERVER either way — see
 * the action — so this is presentation, but presentation that does not
 * advertise what it is hiding.
 */
export default async function AdminOrderDetail(
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;

  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewOrders')) redirect('/');

  const order = await getOrder(orderId);
  if (!order) notFound();

  const canRefund = sessionCan(session, 'store.refundPayments');
  const payments = await paymentsFor(orderId);
  const active = payments.find(p => p.status === 'paid')
    ?? payments.find(p => p.status !== 'failed' && p.status !== 'cancelled')
    ?? payments[0]
    ?? null;

  const currency = order.currency;

  return (
    <AdminShell
      role={session.role}
      actorName={session.displayName}
      current="/admin/store/orders"
      titleAr="تفاصيل الطلب"
    >
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 16px' }}>
        <Link href="/admin/store/orders">← كل الطلبات</Link>
      </p>

      {/* ── The order itself ────────────────────────────────────────────── */}
      <section className="admin-section" aria-labelledby="order-h">
        <h2 id="order-h">الطلب</h2>
        <dl className="admin-kv card-sm" data-testid="admin-order-summary" style={{ padding: '15px 17px' }}>
          <div><dt>رقم الطلب</dt><dd><span className="ltr">{order.id}</span></dd></div>
          <div><dt>حالة الطلب</dt><dd>{ORDER_STATUS_LABEL_AR[order.status]}</dd></div>
          <div><dt>المنتجات</dt><dd>{formatPrice(order.itemsTotalMinor, currency)}</dd></div>
          <div><dt>الشحن</dt><dd>{formatPrice(order.shippingMinor, currency)}</dd></div>
          <div><dt>الإجمالي</dt><dd><strong>{formatPrice(order.totalMinor, currency)}</strong></dd></div>
          <div><dt>أُنشئ</dt><dd><span dir="ltr">{order.createdAt.slice(0, 16).replace('T', ' ')}</span></dd></div>
          {order.includesFreeSetup && (
            <div><dt>الخدمة المجانية</dt><dd style={{ color: 'var(--sev-ok)' }}>مضافة</dd></div>
          )}
        </dl>

        <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 8 }}>
          {order.items.map(i => (
            <li key={i.variantId} className="card-sm" style={{ padding: '11px 14px', fontSize: 13 }}>
              <span style={{ fontWeight: 800 }}>{i.titleAr}</span>
              {i.variantNameAr && <span style={{ color: 'var(--text-dimmer)' }}> — {i.variantNameAr}</span>}
              <span style={{ float: 'inline-end' }} dir="ltr">
                {i.quantity} × {formatPrice(i.unitPriceMinor, currency)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Payment ─────────────────────────────────────────────────────── */}
      <section className="admin-section" aria-labelledby="payment-h">
        <h2 id="payment-h">الدفع</h2>

        {!isPaymentConfigured() && (
          <p className="card-sm" data-testid="admin-payment-unconfigured"
            style={{ padding: '13px 15px', fontSize: 12.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>
            الدفع الإلكتروني غير مفعّل على هذه البيئة — لا مفتاح مزوّد. الطلبات
            تُسجَّل ويمكن تنفيذها يدوياً، ولا تتوفّر المزامنة ولا الاسترجاع.
          </p>
        )}

        {isPaymentConfigured() && isPaymentTestMode() && (
          <p className="card-sm" data-testid="admin-payment-testmode"
            style={{ padding: '13px 15px', fontSize: 12.5, color: 'var(--sev-warning)', marginBottom: 12 }}>
            وضع الاختبار — لا تتحرّك أموال حقيقية.
          </p>
        )}

        {payments.length === 0 && (
          <p className="card-sm" data-testid="admin-payment-none"
            style={{ padding: '13px 15px', fontSize: 12.5, color: 'var(--text-dim)' }}>
            لا توجد محاولة دفع لهذا الطلب بعد.
          </p>
        )}

        {active && (
          <PaymentPanel
            orderId={order.id}
            payment={{
              providerRef: active.providerRef,
              provider: active.provider,
              status: active.status,
              statusLabelAr: PAYMENT_STATUS_LABEL_AR[active.status],
              amountMinor: active.amountMinor,
              currency: active.currency,
              refundedMinor: active.refundedMinor ?? 0,
              methodLabelAr: active.method ? PAYMENT_METHOD_LABEL_AR[active.method] : null,
              testMode: active.testMode,
              createdAt: active.createdAt,
              updatedAt: active.updatedAt,
              failureReason: active.failureReason ?? null,
            }}
            canRefund={canRefund}
          />
        )}

        {payments.length > 1 && (
          <div className="admin-section" data-testid="admin-payment-attempts">
            <h3 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 10px' }}>
              كل المحاولات (<span dir="ltr">{payments.length}</span>)
            </h3>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>المعرّف</th><th>الحالة</th><th>المبلغ</th><th>أُنشئت</th><th>آخر مزامنة</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.providerRef} data-testid={`admin-payment-attempt-${p.providerRef}`}>
                      <td><span className="ltr">{p.providerRef}</span></td>
                      <td>{PAYMENT_STATUS_LABEL_AR[p.status]}</td>
                      <td><span dir="ltr">{formatPrice(p.amountMinor, p.currency)}</span></td>
                      <td><span dir="ltr">{p.createdAt.slice(0, 16).replace('T', ' ')}</span></td>
                      <td><span dir="ltr">{p.updatedAt.slice(0, 16).replace('T', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '14px 0 0', lineHeight: 1.9 }}>
          كل تغيير على حالة الدفع — تلقائياً من الـWebhook أو يدوياً من هنا —
          مسجَّل في <Link href="/admin/audit">سجلّ التدقيق</Link> باسم من نفّذه.
          حالة الدفع لا تُكتب أبداً من متصفّح العميل.
        </p>
      </section>
    </AdminShell>
  );
}
