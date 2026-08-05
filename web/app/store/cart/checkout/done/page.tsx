import Link from 'next/link';
import type { Metadata } from 'next';
import { getSession } from '@/lib/server/session';
import { getOrder } from '@/lib/server/storeOrders';
import { activePaymentFor, paymentsFor } from '@/lib/server/payments/service';
import {
  PAYMENT_STATUS_LABEL_AR, isTerminalPayment, type PaymentStatus,
} from '@core/data/store/payment';
import { ORDER_STATUS_LABEL_AR } from '@core/data/store/types';
import { RetryPaymentButton } from '@/components/store/RetryPaymentButton';
import { paymentHelpHref } from '@/lib/store';

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
 * So it READS and reports. The belief itself is only ever changed by
 * `/api/payments/webhook`, which asks the provider directly.
 *
 * WHY EVERY STATE GETS ITS OWN SENTENCE
 * -------------------------------------
 * Because «حدث خطأ» is what a shop says when it has not thought about what
 * could go wrong, and the states here mean genuinely different things to the
 * person reading them. «Cancelled» is something they did and can undo;
 * «failed» is something their bank did and they should try differently;
 * «pending» is nothing at all and the worst possible moment to alarm them.
 * Collapsing the ten into two would be a smaller page and a worse shop.
 *
 * THE MOST IMPORTANT ONE IS «NOT YET»
 * -----------------------------------
 * The customer usually arrives BEFORE the webhook does — the redirect is a
 * browser hop, the webhook is a server-to-server call. Telling somebody who has
 * just paid that we have no payment would be a lie with their money already
 * gone, so that window is reported as verification-in-progress, with what
 * happens next.
 */

interface StateCopy {
  headlineAr: string;
  bodyAr: string;
  tone: 'ok' | 'wait' | 'warn' | 'bad';
  /** Whether paying again is a sensible thing to offer. */
  canRetry: boolean;
}

/**
 * The full set. `null` means no payment record exists at all — the customer
 * placed an order and has not started paying, or is here by a stray link.
 */
function copyFor(status: PaymentStatus | null): StateCopy {
  switch (status) {
    case 'paid':
      return {
        headlineAr: 'وصلت دفعتك',
        bodyAr: 'أكّد مزوّد الدفع العملية. سنبدأ التجهيز، وتصلك رسالة عند الشحن.',
        tone: 'ok', canRetry: false,
      };
    case 'pending':
      return {
        headlineAr: 'الدفع ما زال مفتوحاً',
        bodyAr:
          'بدأت عملية الدفع ولم تكتمل بعد. إن كنت قد أتممتها للتوّ فالتأكيد يصل من '
          + 'مزوّد الدفع إلى خادمنا مباشرةً — لا عبر متصفّحك — وقد يتأخّر دقيقة. '
          + 'لا تدفع مرّة أخرى قبل أن تتحقّق.',
        tone: 'wait', canRetry: false,
      };
    case 'requires_action':
      return {
        headlineAr: 'الدفع يحتاج خطوة أخيرة منك',
        bodyAr:
          'بنكك يطلب تأكيداً إضافياً — عادةً في تطبيق البنك أو برسالة. أكمل الخطوة '
          + 'هناك، ثم عُد إلى هذه الصفحة.',
        tone: 'wait', canRetry: false,
      };
    case 'failed':
      return {
        headlineAr: 'لم تنجح عملية الدفع',
        bodyAr:
          'رفض مزوّد الدفع العملية. طلبك محفوظ كما هو ولم يُلغَ — جرّب وسيلة دفع '
          + 'أخرى، أو تواصل مع بنكك إن تكرّر الرفض.',
        tone: 'bad', canRetry: true,
      };
    case 'cancelled':
      return {
        headlineAr: 'أُلغيت عملية الدفع',
        bodyAr:
          'أُلغيت العملية أو انتهت مهلتها قبل إتمامها. طلبك ما زال محفوظاً '
          + 'بمحتوياته وعنوانه — يمكنك الدفع متى شئت.',
        tone: 'warn', canRetry: true,
      };
    case 'refunded':
      return {
        headlineAr: 'استُرجع المبلغ بالكامل',
        bodyAr:
          'أعدنا كامل المبلغ إلى وسيلة الدفع نفسها. قد يستغرق ظهوره في حسابك '
          + 'أياماً قليلة حسب بنكك.',
        tone: 'warn', canRetry: false,
      };
    case 'partially_refunded':
      return {
        headlineAr: 'استُرجع جزء من المبلغ',
        bodyAr:
          'أعدنا جزءاً من المبلغ إلى وسيلة الدفع نفسها. التفصيل أدناه، وقد يستغرق '
          + 'ظهوره أياماً قليلة.',
        tone: 'warn', canRetry: false,
      };
    default:
      return {
        headlineAr: 'طلبك مسجَّل',
        bodyAr:
          'لم تبدأ عملية دفع لهذا الطلب بعد. محتويات الطلب وعنوانه محفوظة، '
          + 'ويمكنك الدفع الآن.',
        tone: 'wait', canRetry: true,
      };
  }
}

const TONE_COLOR: Record<StateCopy['tone'], string> = {
  ok: 'var(--sev-ok)',
  wait: 'var(--accent-ink)',
  warn: 'var(--sev-warning)',
  bad: 'var(--sev-blocker)',
};

export default async function PaymentDonePage(
  { searchParams }: { searchParams: Promise<{ order?: string }> },
) {
  const { order: orderId } = await searchParams;
  const session = await getSession();

  const order = orderId && session ? await getOrder(orderId) : null;
  // Somebody else's order is treated exactly as a missing one — the page must
  // not confirm that an order id exists to a stranger who guessed it.
  const mine = order && session && order.customerUid === session.uid ? order : null;

  // A provider outage while reading is its own state: we genuinely do not know,
  // and saying so is better than defaulting to «unpaid» over somebody's money.
  let payment = null;
  let attempts: Awaited<ReturnType<typeof paymentsFor>> = [];
  let unreadable = false;
  if (mine) {
    try {
      [payment, attempts] = await Promise.all([
        activePaymentFor(mine.id),
        paymentsFor(mine.id),
      ]);
    } catch {
      unreadable = true;
    }
  }

  const copy = copyFor(payment?.status ?? null);
  const showRetry = !!mine && !unreadable && copy.canRetry;

  return (
    <div className="shell" style={{ paddingTop: 40, paddingBottom: 48, maxWidth: 720 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/store">المتجر</Link> <span aria-hidden>/</span> حالة الدفع
      </nav>

      {!mine && (
        <div className="card" data-testid="pay-result-missing" style={{ padding: '22px 24px', marginTop: 20 }}>
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

      {mine && unreadable && (
        <div className="card" data-testid="pay-result-unreadable" style={{ padding: '24px 26px', marginTop: 20 }}>
          <h1 style={{ fontSize: 23, fontWeight: 900, margin: 0, color: 'var(--sev-warning)' }}>
            تعذّر التحقّق الآن
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.95, margin: '12px 0 0' }}>
            لم نستطع قراءة حالة الدفع في هذه اللحظة. هذا خلل مؤقّت عندنا ولا يعني
            أن دفعتك لم تصل — <strong>لا تدفع مرّة أخرى</strong>. أعِد تحميل الصفحة
            بعد قليل، أو تواصل معنا برقم الطلب.
          </p>
          <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '12px 0 0' }} dir="ltr">
            {mine.id}
          </p>
          <p style={{ margin: '14px 0 0' }}>
            <Link href={paymentHelpHref()} data-testid="pay-unreadable-help"
              style={{ fontSize: 13, color: 'var(--accent-ink)', fontWeight: 700 }}>
              خُصم المبلغ ولم يتأكّد الطلب؟ اقرأ ماذا تفعل ←
            </Link>
          </p>
        </div>
      )}

      {mine && !unreadable && (
        <div className="card" data-testid="pay-result" style={{ padding: '24px 26px', marginTop: 20 }}>
          <h1
            style={{ fontSize: 24, fontWeight: 900, margin: 0, color: TONE_COLOR[copy.tone] }}
            data-testid={`pay-state-${payment?.status ?? 'none'}`}
          >
            {copy.headlineAr}
          </h1>

          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.95, margin: '12px 0 0' }}>
            {copy.bodyAr}
          </p>

          <dl className="admin-kv card-sm" style={{ padding: '15px 17px', marginTop: 18 }}>
            <div><dt>رقم الطلب</dt><dd><span className="ltr">{mine.id}</span></dd></div>
            <div>
              <dt>حالة الدفع</dt>
              <dd>{payment ? PAYMENT_STATUS_LABEL_AR[payment.status] : 'لم تبدأ بعد'}</dd>
            </div>
            <div><dt>حالة الطلب</dt><dd>{ORDER_STATUS_LABEL_AR[mine.status]}</dd></div>
            {payment && (
              <div>
                <dt>المبلغ</dt>
                <dd>
                  <span dir="ltr">{(payment.amountMinor / 100).toFixed(2)} {payment.currency}</span>
                </dd>
              </div>
            )}
            {payment && (payment.refundedMinor ?? 0) > 0 && (
              <div>
                <dt>المُسترجَع</dt>
                <dd>
                  <span dir="ltr">
                    {((payment.refundedMinor ?? 0) / 100).toFixed(2)} {payment.currency}
                  </span>
                </dd>
              </div>
            )}
            {attempts.length > 1 && (
              <div>
                <dt>محاولات الدفع</dt>
                <dd><span dir="ltr">{attempts.length}</span></dd>
              </div>
            )}
            {payment?.testMode && (
              <div>
                <dt>وضع الاختبار</dt>
                <dd style={{ color: 'var(--sev-warning)' }}>
                  عملية تجريبية — لم يُخصم أي مبلغ حقيقي.
                </dd>
              </div>
            )}
          </dl>

          <div style={{ margin: '18px 0 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {/* Offered ONLY where the state allows it. A retry button beside a
                paid order is an invitation to pay twice; beside a pending one it
                is an invitation to pay while the first attempt is still live. */}
            {showRetry && <RetryPaymentButton orderId={mine.id} />}
            <Link href="/store" className="btn-ghost">تابع التسوّق</Link>
          </div>

          {/* The general answer, for the states where the reader has a question
              this page deliberately does not try to answer in full. Offered
              rather than pushed: somebody whose order is paid does not need it. */}
          {(!payment || payment.status !== 'paid') && (
            <p style={{ margin: '14px 0 0' }}>
              <Link href={paymentHelpHref()} data-testid="pay-result-help"
                style={{ fontSize: 13, color: 'var(--accent-ink)', fontWeight: 700 }}>
                ماذا تعني هذه الحالة، وهل خُصم المبلغ؟ ←
              </Link>
            </p>
          )}

          {payment && !isTerminalPayment(payment.status) && payment.status !== 'paid' && (
            <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '14px 0 0', lineHeight: 1.85 }}>
              هذه الصفحة تقرأ الحالة فقط ولا تغيّرها. حدّثها بعد دقيقة لترى آخر ما وصلنا.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
