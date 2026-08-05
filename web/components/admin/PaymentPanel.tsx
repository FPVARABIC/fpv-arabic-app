'use client';

import { useState, useTransition } from 'react';
import { refundAction, resyncPaymentAction } from '@/app/admin/store/orders/[orderId]/actions';

/**
 * The payment, and the two things an operator can do to it.
 *
 * WHY THE REFUND FIELD IS PRE-FILLED WITH THE REMAINDER
 * -----------------------------------------------------
 * Because a full refund is the common case and typing an amount to achieve it
 * is an opportunity to typo. The field stays editable for a partial one, and
 * the SERVER re-checks the ceiling against the stored payment regardless — this
 * default is a convenience, never the control.
 *
 * WHY A CONFIRMATION STEP
 * -----------------------
 * A refund is irreversible and moves real money. One click is the right cost
 * for «resync» and the wrong cost for «send €129.95 back». The confirmation
 * shows the amount so the thing being confirmed is the thing being done.
 */

const money = (minor: number, currency: string) =>
  `${(minor / 100).toFixed(2)} ${currency}`;

export const PaymentPanel: React.FC<{
  orderId: string;
  payment: {
    providerRef: string;
    provider: string;
    status: string;
    statusLabelAr: string;
    amountMinor: number;
    currency: string;
    refundedMinor: number;
    methodLabelAr: string | null;
    testMode: boolean;
    createdAt: string;
    updatedAt: string;
    failureReason: string | null;
  };
  canRefund: boolean;
}> = ({ orderId, payment, canRefund }) => {
  const remaining = payment.amountMinor - payment.refundedMinor;
  const refundable =
    (payment.status === 'paid' || payment.status === 'partially_refunded') && remaining > 0;

  const [notice, setNotice] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: true; messageAr: string } | { ok: false; errorAr: string }>) => {
    setNotice(null);
    start(async () => {
      const r = await fn();
      setNotice(r.ok ? { tone: 'ok', text: r.messageAr } : { tone: 'bad', text: r.errorAr });
      if (r.ok) setConfirming(false);
    });
  };

  return (
    <div className="card" data-testid="admin-payment-panel" style={{ padding: '17px 19px' }}>
      <dl className="admin-kv" style={{ margin: 0 }}>
        <div><dt>المزوّد</dt><dd><span className="ltr">{payment.provider}</span></dd></div>
        <div>
          <dt>معرّف العملية</dt>
          <dd><span className="ltr" data-testid="admin-payment-ref">{payment.providerRef}</span></dd>
        </div>
        <div>
          <dt>الحالة</dt>
          <dd data-testid="admin-payment-status">{payment.statusLabelAr}</dd>
        </div>
        <div><dt>المبلغ</dt><dd><span dir="ltr">{money(payment.amountMinor, payment.currency)}</span></dd></div>
        <div><dt>العملة</dt><dd><span className="ltr">{payment.currency}</span></dd></div>
        {payment.refundedMinor > 0 && (
          <div>
            <dt>المُسترجَع</dt>
            <dd data-testid="admin-payment-refunded">
              <span dir="ltr">{money(payment.refundedMinor, payment.currency)}</span>
            </dd>
          </div>
        )}
        {payment.methodLabelAr && (
          <div><dt>الوسيلة</dt><dd>{payment.methodLabelAr}</dd></div>
        )}
        <div>
          <dt>آخر مزامنة</dt>
          <dd><span dir="ltr">{payment.updatedAt.slice(0, 16).replace('T', ' ')}</span></dd>
        </div>
        {payment.failureReason && (
          <div>
            <dt>سبب الرفض</dt>
            <dd style={{ color: 'var(--sev-blocker)' }}>{payment.failureReason}</dd>
          </div>
        )}
        {payment.testMode && (
          <div><dt>الوضع</dt><dd style={{ color: 'var(--sev-warning)' }}>اختبار</dd></div>
        )}
      </dl>

      {notice && (
        <p
          role={notice.tone === 'bad' ? 'alert' : 'status'}
          data-testid="admin-payment-notice"
          className={`admin-badge ${notice.tone === 'ok' ? 'admin-badge-ok' : 'admin-badge-bad'}`}
          style={{ display: 'block', padding: '10px 13px', marginTop: 14 }}
        >
          {notice.text}
        </p>
      )}

      {canRefund && (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          <div>
            <button
              type="button"
              className="btn-ghost"
              data-testid="admin-payment-resync"
              disabled={pending}
              onClick={() => run(() => resyncPaymentAction(payment.providerRef, orderId))}
            >
              {pending ? 'جارٍ…' : 'أعد مزامنة الحالة من المزوّد'}
            </button>
            <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '6px 0 0', lineHeight: 1.85 }}>
              يسأل المزوّد مباشرةً ويطبّق ما يقوله عبر نفس مسار الـWebhook — بنفس
              فحوص المبلغ والعملة والانتقال. لفقدان إشعار، لا لتغيير حالة يدوياً.
            </p>
          </div>

          {refundable && !confirming && (
            <div>
              <button
                type="button"
                className="admin-danger"
                data-testid="admin-payment-refund-open"
                onClick={() => setConfirming(true)}
              >
                استرجاع
              </button>
              <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '6px 0 0' }}>
                المتبقّي القابل للاسترجاع:{' '}
                <span dir="ltr">{money(remaining, payment.currency)}</span>
              </p>
            </div>
          )}

          {refundable && confirming && (
            <div className="card-sm" style={{ padding: '14px 16px' }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 5 }}>
                  المبلغ المراد استرجاعه
                </span>
                <input
                  className="admin-field"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  inputMode="decimal"
                  data-testid="admin-payment-refund-amount"
                  style={{ direction: 'ltr', maxWidth: 200 }}
                />
              </label>
              <p style={{ fontSize: 12, color: 'var(--sev-warning)', margin: '10px 0 0', lineHeight: 1.9 }}>
                لا يمكن التراجع عن الاسترجاع. الحدّ الأقصى{' '}
                <span dir="ltr">{money(remaining, payment.currency)}</span> — وما فوقه
                يرفضه الخادم.
              </p>
              <div style={{ display: 'flex', gap: 9, marginTop: 12, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-danger"
                  data-testid="admin-payment-refund-confirm"
                  disabled={pending}
                  onClick={() => {
                    const normalised = amount.trim().replace(',', '.');
                    if (!/^\d+(\.\d{1,2})?$/.test(normalised)) {
                      setNotice({ tone: 'bad', text: 'أدخل مبلغاً صحيحاً مثل 12.50' });
                      return;
                    }
                    const [w, f = ''] = normalised.split('.');
                    const minor = Number(w) * 100 + Number(f.padEnd(2, '0'));
                    run(() => refundAction(payment.providerRef, orderId, minor));
                  }}
                >
                  {pending ? 'جارٍ التنفيذ…' : `أكّد استرجاع ${amount}`}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  data-testid="admin-payment-refund-cancel"
                  onClick={() => { setConfirming(false); setNotice(null); }}
                >
                  تراجع
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!canRefund && (
        <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '14px 0 0', lineHeight: 1.85 }}>
          المزامنة والاسترجاع يحتاجان صلاحية أعلى.
        </p>
      )}
    </div>
  );
};
