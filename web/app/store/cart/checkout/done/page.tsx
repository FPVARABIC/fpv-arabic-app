import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/server/session';
import { getOrder } from '@/lib/server/storeOrders';
import { activePaymentFor } from '@/lib/server/payments/service';
import { PAYMENT_STATUS_LABEL_AR } from '@core/data/store/payment';

export const metadata: Metadata = {
  title: 'حالة الدفع',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Where the payment provider sends the customer back to.
 *
 * THIS PAGE WRITES NOTHING. THAT IS ITS DESIGN.
 * ---------------------------------------------
 * It is a GET in a browser. Anyone can open it, with any order id, as many
 * times as they like — including somebody who never paid. If arriving here
 * marked an order paid, the shop would ship hardware to whoever guessed a URL.
 *
 * So it READS the order and reports what the server already believes. The
 * belief itself is only ever changed by `/api/payments/webhook`, which asks the
 * provider directly. See `docs/store/PAYMENTS.md`.
 *
 * WHY IT CAN STILL SAY «بانتظار التأكيد»
 * --------------------------------------
 * The customer usually arrives here BEFORE the webhook does — the redirect is a
 * browser hop, the webhook is a server-to-server call that may take seconds.
 * Saying «لم يصلنا الدفع» in that window would be a lie told to somebody who
 * has just paid. So an unconfirmed payment is reported honestly as
 * not-yet-confirmed, with what happens next, rather than as a failure.
 */
export default async function PaymentDonePage(
  { searchParams }: { searchParams: Promise<{ order?: string }> },
) {
  const { order: orderId } = await searchParams;
  const session = await getSession();

  const order = orderId && session ? await getOrder(orderId) : null;
  // Somebody else's order is treated exactly as a missing one — the page must
  // not confirm that an order id exists to a stranger who guessed it.
  const mine = order && session && order.customerUid === session.uid ? order : null;
  const payment = mine ? await activePaymentFor(mine.id) : null;

  const settled = payment?.status === 'paid';

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 48, maxWidth: 720 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/store">المتجر</Link> <span aria-hidden>/</span> حالة الدفع
      </nav>

      {!mine && (
        <div className="card" style={{ padding: '22px 24px', marginTop: 20 }}>
          <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>لا نجد هذا الطلب</h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.95, margin: '10px 0 0' }}>
            تأكّد أنك مسجّل الدخول بالحساب الذي طلبت به. الطلبات مربوطة بالحساب،
            ولا تظهر لغيره.
          </p>
          <p style={{ margin: '16px 0 0' }}>
            <Link href="/store" className="btn-ghost">عُد إلى المتجر</Link>
          </p>
        </div>
      )}

      {mine && (
        <div className="card" style={{ padding: '24px 26px', marginTop: 20 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, margin: 0 }}>
            {settled ? 'وصلنا دفعتك' : 'طلبك مسجَّل'}
          </h1>

          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.95, margin: '12px 0 0' }}>
            {settled
              ? 'أكّد مزوّد الدفع العملية. سنبدأ التجهيز، وتصلك رسالة عند الشحن.'
              : 'لم يصلنا تأكيد الدفع بعد. هذا طبيعي في الدقائق الأولى: تأكيد الدفع '
                + 'يصل من مزوّد الدفع إلى خادمنا مباشرةً، لا عبر متصفّحك، وقد يتأخّر قليلاً. '
                + 'لا تدفع مرّة أخرى — افتح صفحة طلباتك بعد قليل.'}
          </p>

          <dl className="admin-kv card-sm" style={{ padding: '15px 17px', marginTop: 18 }}>
            <div><dt>رقم الطلب</dt><dd><span className="ltr">{mine.id}</span></dd></div>
            <div>
              <dt>حالة الدفع</dt>
              <dd>{payment ? PAYMENT_STATUS_LABEL_AR[payment.status] : 'لم تبدأ بعد'}</dd>
            </div>
            {payment?.testMode && (
              <div>
                <dt>وضع الاختبار</dt>
                <dd style={{ color: 'var(--sev-warning)' }}>
                  هذه عملية تجريبية — لم يُخصم أي مبلغ حقيقي.
                </dd>
              </div>
            )}
          </dl>

          <p style={{ margin: '18px 0 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/store" className="btn-primary">تابع التسوّق</Link>
          </p>
        </div>
      )}
    </div>
  );
}
