'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import { formatPrice } from '@core/data/store/pricing';
import type { PricedProduct } from '@core/data/store/cart';
import { subscribeCart, cartSnapshot, cartServerSnapshot, resolve, cartClear } from '@/lib/cart';
import { cartHref } from '@/lib/store';
import { submitOrder } from '@/app/store/cart/checkout/actions';

/**
 * The order form.
 *
 * IT POSTS IDS AND QUANTITIES, AND NO PRICES
 * ------------------------------------------
 * Everything monetary is computed on the server from the catalogue. This form
 * shows a running total so the customer knows what they are agreeing to, but
 * that number is a rendering — it is never sent, and the server would ignore it
 * if it were. A checkout that submits its own total has no prices, only
 * suggestions.
 *
 * WHY THE COUNTRY IS A SHORT LIST AND THE ADDRESS IS FREE TEXT
 * ------------------------------------------------------------
 * The country decides shipping and customs, so it has to be structured. The
 * address does not follow one shape across the Arab world, and a form that
 * rejects a real address because it wanted a postcode is a form that loses the
 * sale. Length caps, no format rules.
 */

const COUNTRIES = [
  'السعودية', 'الإمارات', 'الكويت', 'قطر', 'البحرين', 'عُمان',
  'مصر', 'الأردن', 'العراق', 'المغرب', 'الجزائر', 'تونس', 'ليبيا',
  'لبنان', 'فلسطين', 'السودان', 'اليمن', 'أخرى',
];

export const CheckoutForm: React.FC<{ catalogue: readonly PricedProduct[] }> = ({ catalogue }) => {
  const cart = useSyncExternalStore(subscribeCart, cartSnapshot, cartServerSnapshot);
  // The live catalogue, handed down by the server. The total shown here is a
  // rendering of it; the total that is charged is recomputed server-side.
  const { lines, totals, orderable } = resolve(cart, catalogue);

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);

  if (placed) {
    return (
      <div className="card" data-testid="order-placed" style={{ padding: '20px 22px', marginTop: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 900, color: '#6ee7b7' }}>وصل طلبك</h2>
        <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          رقم الطلب <span className="ltr" data-testid="order-id">{placed}</span>. سنتواصل معك
          لتأكيد التوفّر وتكلفة الشحن قبل أي دفع.
        </p>
        <p style={{ margin: '14px 0 0' }}>
          <Link href="/store" className="btn-ghost">عد إلى المتجر</Link>
        </p>
      </div>
    );
  }

  if (!orderable) {
    return (
      <div className="card-sm" data-testid="checkout-empty" style={{ padding: '16px 18px', marginTop: 20 }}>
        <p style={{ margin: 0, fontSize: 14 }}>لا يوجد في سلّتك ما يمكن طلبه.</p>
        <p style={{ margin: '12px 0 0' }}>
          <Link href={cartHref()} className="btn-ghost">افتح السلة</Link>
        </p>
      </div>
    );
  }

  return (
    <form
      data-testid="checkout-form"
      onSubmit={async e => {
        e.preventDefault();
        setPending(true);
        setError(null);
        const fd = new FormData(e.currentTarget);
        const result = await submitOrder({
          // Ids and quantities only. See the note above.
          items: cart.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
          contact: {
            fullNameAr: String(fd.get('fullName') ?? ''),
            phone: String(fd.get('phone') ?? ''),
            country: String(fd.get('country') ?? ''),
            cityAr: String(fd.get('city') ?? ''),
            addressAr: String(fd.get('address') ?? ''),
            notesAr: String(fd.get('notes') ?? ''),
          },
        });
        setPending(false);
        if (result.ok) { cartClear(); setPlaced(result.orderId); }
        else setError(result.errorAr);
      }}
      style={{ marginTop: 20, display: 'grid', gap: 14 }}
    >
      {/* What is being ordered, so nobody agrees to something they cannot see. */}
      <section className="card-sm" data-testid="checkout-summary" style={{ padding: '14px 16px' }}>
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 900 }}>ما ستطلبه</h2>
        <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
          {lines.map(l => (
            <li key={l.product.id} style={{
              display: 'flex', gap: 10, justifyContent: 'space-between',
              fontSize: 12.5, flexWrap: 'wrap',
            }}>
              <span className="ltr" style={{ minWidth: 0 }}>
                {l.product.nameEn} <span dir="ltr">× {l.quantity}</span>
              </span>
              <span style={{ whiteSpace: 'nowrap' }}>
                {l.unitPriceMinor === 0
                  ? <span style={{ color: '#6ee7b7' }}>مجاناً</span>
                  : formatPrice(l.lineTotalMinor, l.product.currency)}
              </span>
            </li>
          ))}
        </ul>
        <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 900 }}>
          الإجمالي قبل الشحن: <span className="ltr">{formatPrice(totals.totalMinor, 'USD')}</span>
        </p>
        <p style={{ margin: '5px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>
          الشحن يُحتسب بعد معرفة الوجهة ويُبلَّغ لك قبل أي دفع.
        </p>
      </section>

      <Field name="fullName" labelAr="الاسم الكامل" required autoComplete="name" />
      <Field name="phone" labelAr="رقم الهاتف" required type="tel" autoComplete="tel"
        hintAr="نحتاجه للتواصل بشأن الشحن." />

      <label style={{ display: 'grid', gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 800 }}>بلد الشحن</span>
        <select name="country" required data-testid="field-country"
          defaultValue=""
          style={{
            padding: '11px 13px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'var(--surface-2)',
            color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
          }}>
          <option value="" disabled>اختر البلد</option>
          {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <Field name="city" labelAr="المدينة" required autoComplete="address-level2" />
      <Field name="address" labelAr="العنوان" required textarea autoComplete="street-address"
        hintAr="بتفصيل يكفي لوصول الشحنة — الحي والشارع وأي علامة مميّزة." />
      <Field name="notes" labelAr="ملاحظات (اختياري)" textarea
        hintAr="أخبرنا بجهاز التحكّم والنظارة اللذين تملكهما حتى نضبط ما تشتريه ليعمل معهما." />

      {error && (
        <p data-testid="checkout-error" role="alert" className="card-sm"
          style={{ padding: '12px 14px', margin: 0, fontSize: 13, color: '#fca5a5', lineHeight: 1.9 }}>
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={pending}
        data-testid="checkout-submit"
        style={{ padding: '13px 20px', fontSize: 15 }}>
        {pending ? 'جارٍ الإرسال…' : 'أرسل الطلب'}
      </button>

      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
        بإرسال الطلب أنت تطلب منّا تجهيزه — لا يُخصم منك شيء الآن.
      </p>
    </form>
  );
};

const Field: React.FC<{
  name: string;
  labelAr: string;
  required?: boolean;
  type?: string;
  textarea?: boolean;
  hintAr?: string;
  autoComplete?: string;
}> = ({ name, labelAr, required, type = 'text', textarea, hintAr, autoComplete }) => {
  const style: React.CSSProperties = {
    padding: '11px 13px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 14, fontFamily: 'inherit', width: '100%',
  };
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 13, fontWeight: 800 }}>{labelAr}</span>
      {textarea ? (
        <textarea name={name} required={required} rows={3} data-testid={`field-${name}`}
          autoComplete={autoComplete} style={style} />
      ) : (
        <input name={name} type={type} required={required} data-testid={`field-${name}`}
          autoComplete={autoComplete} style={style} />
      )}
      {hintAr && (
        <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.8 }}>{hintAr}</span>
      )}
    </label>
  );
};
