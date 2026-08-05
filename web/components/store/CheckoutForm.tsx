'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore, useTransition } from 'react';
import { formatPrice } from '@core/data/store/pricing';
import type { PricedProduct } from '@core/data/store/cart';
import { subscribeCart, cartSnapshot, cartServerSnapshot, resolve, cartClear } from '@/lib/cart';
import { cartHref, paymentResultHref } from '@/lib/store';
import { submitOrder, quoteShippingAction } from '@/app/store/cart/checkout/actions';
import { COUNTRY_NAME_AR } from '@core/data/store/shipping';
import type { AddressField } from '@core/data/store/address';

/**
 * The order form.
 *
 * IT POSTS IDS AND QUANTITIES, AND NO PRICES
 * ------------------------------------------
 * Everything monetary is computed on the server from the catalogue. This form
 * shows a running total so the customer knows what they are agreeing to, but
 * that number is a rendering — it is never sent, and the server would ignore it
 * if it were.
 *
 * WHY THE ADDRESS IS STRUCTURED NOW
 * ---------------------------------
 * It used to be a free-text box and a list of Arab countries, on the reasoning
 * that addresses do not follow one shape. The shop's destinations turned out to
 * be the Netherlands, Belgium, Germany and the rest of the EU — where the house
 * number is a field carriers match on, and a one-line address is why parcels
 * come back. So the fields are separate and the postcode is validated per
 * country, permissively: see `validateAddress`.
 *
 * WHY SHIPPING IS A ROUND TRIP AND NOT COMPUTED HERE
 * --------------------------------------------------
 * The zones and their prices live on the server, and the figure that goes on
 * the order is computed there. A second implementation here would be a second
 * source of the same truth, and the day they disagree the customer sees one
 * total and is charged another. So the customer picks a country, the server
 * answers, and the number displayed is the number the order will carry.
 *
 * It is also the honest place for a refusal: «لا نشحن إلى هذا البلد» belongs
 * beside the country field the moment it is chosen, not after a full form-fill.
 */

const FIELDS: {
  name: AddressField;
  labelAr: string;
  autoComplete: string;
  inputMode?: 'text' | 'tel' | 'numeric';
  optional?: boolean;
  wide?: boolean;
}[] = [
  { name: 'fullName', labelAr: 'الاسم الكامل', autoComplete: 'name', wide: true },
  { name: 'phone', labelAr: 'رقم الهاتف', autoComplete: 'tel', inputMode: 'tel' },
  { name: 'postalCode', labelAr: 'الرمز البريدي', autoComplete: 'postal-code' },
  { name: 'street', labelAr: 'الشارع', autoComplete: 'address-line1', wide: true },
  { name: 'houseNumber', labelAr: 'رقم المنزل', autoComplete: 'address-line2' },
  { name: 'addition', labelAr: 'إضافة (شقة، طابق)', autoComplete: 'address-line3', optional: true },
  { name: 'city', labelAr: 'المدينة', autoComplete: 'address-level2', wide: true },
];

type Quote =
  | { ok: true; costMinor: number; zoneNameAr: string; etaAr: string | null }
  | { ok: false; messageAr: string };

export const CheckoutForm: React.FC<{
  catalogue: readonly PricedProduct[];
  accountEmail: string | null;
  shippableCountries: string[];
}> = ({ catalogue, accountEmail, shippableCountries }) => {
  const cart = useSyncExternalStore(subscribeCart, cartSnapshot, cartServerSnapshot);

  const [country, setCountry] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [placed, setPlaced] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [quoting, startQuote] = useTransition();

  const currency = catalogue[0]?.currency ?? 'EUR';
  const shippingMinor = quote?.ok ? quote.costMinor : 0;

  // The server's quote is fed into the SAME `resolve` the server uses, so
  // `totals.totalMinor` is one computation rather than an addition repeated by
  // hand here. Before a country is chosen the shipping is 0 and the total is
  // shown as «—» rather than as the items total pretending to be final.
  const { lines, totals, orderable } = resolve(cart, catalogue, shippingMinor);

  const onCountry = (next: string) => {
    setCountry(next);
    setQuote(null);
    setError(null);
    if (!next) return;
    startQuote(async () => {
      setQuote(await quoteShippingAction(
        next,
        totals.itemsTotalMinor,
        lines.map(l => l.product.id),
      ));
    });
  };

  // Every gate the server will apply, applied here too so the button explains
  // itself rather than failing on click. The SERVER is still the authority —
  // this only spares the customer a pointless submission.
  const blockedReason =
    !orderable ? 'سلّتك فارغة أو لم يعد فيها منتج قابل للطلب.'
    : shippableCountries.length === 0 ? 'لا توجد مناطق شحن مسعَّرة بعد.'
    : !country ? 'اختر بلد الشحن أولاً.'
    : quoting ? 'جارٍ حساب الشحن…'
    : !quote ? 'اختر بلد الشحن أولاً.'
    : !quote.ok ? quote.messageAr
    : null;

  if (placed) {
    return (
      <div className="card" data-testid="checkout-placed" style={{ padding: '22px 24px' }}>
        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>سُجِّل طلبك</h2>
        <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.95, margin: '10px 0 0' }}>
          رقم الطلب <span className="ltr">{placed}</span>. الخطوة التالية هي الدفع.
        </p>
        <p style={{ margin: '16px 0 0' }}>
          <Link href={paymentResultHref(placed)} className="btn-primary">
            تابع إلى الدفع
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form
      data-testid="checkout-form"
      onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setError(null);
        start(async () => {
          // Ids and quantities, written out. `cart.items` already has this
          // shape, but spelling it at the call site is what lets a reader — and
          // the guard in testStore — see exactly what crosses the boundary.
          // (The note sits ABOVE the call, not inside it: the guard scans the
          // argument text, and a comment mentioning money reads as money.)
          const r = await submitOrder({
            items: lines.map(l => ({ variantId: l.product.id, quantity: l.quantity })),
            contact: {
              fullName: String(fd.get('fullName') ?? ''),
              // A convenience copy. The server reads the session's own email and
              // does not trust this.
              email: accountEmail ?? '',
              phone: String(fd.get('phone') ?? ''),
              country,
              postalCode: String(fd.get('postalCode') ?? ''),
              city: String(fd.get('city') ?? ''),
              street: String(fd.get('street') ?? ''),
              houseNumber: String(fd.get('houseNumber') ?? ''),
              addition: String(fd.get('addition') ?? ''),
              notes: String(fd.get('notes') ?? ''),
            },
          });
          if (r.ok) { cartClear(); setPlaced(r.orderId); return; }
          setError(r.errorAr);
        });
      }}
      style={{ display: 'grid', gap: 18, maxWidth: 640 }}
    >
      <label style={{ display: 'block' }}>
        <span style={LABEL}>بلد الشحن</span>
        <select
          className="admin-field"
          value={country}
          data-testid="checkout-country"
          onChange={e => onCountry(e.target.value)}
          required
        >
          <option value="">— اختر —</option>
          {shippableCountries.map(c => (
            <option key={c} value={c}>{COUNTRY_NAME_AR[c] ?? c}</option>
          ))}
        </select>
        {shippableCountries.length === 0 && (
          <p data-testid="checkout-no-zones" style={NOTE_BAD}>
            لا توجد مناطق شحن مسعَّرة بعد، فلا يمكن إتمام أي طلب الآن. تواصل معنا.
          </p>
        )}
      </label>

      {quoting && <p data-testid="checkout-quoting" style={NOTE}>جارٍ حساب الشحن…</p>}

      {quote && !quote.ok && (
        <p role="alert" data-testid="checkout-shipping-refused" style={NOTE_BAD}>
          {quote.messageAr}
        </p>
      )}

      {quote?.ok && (
        <p data-testid="checkout-shipping-quote" style={NOTE}>
          الشحن إلى {quote.zoneNameAr}:{' '}
          <strong>{quote.costMinor === 0 ? 'مجاني' : formatPrice(quote.costMinor, currency)}</strong>
          {quote.etaAr ? ` · ${quote.etaAr}` : ''}
        </p>
      )}

      <div
        style={{
          display: 'grid', gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        }}
      >
        {FIELDS.map(f => (
          <label key={f.name} style={{ display: 'block', gridColumn: f.wide ? '1 / -1' : undefined }}>
            <span style={LABEL}>
              {f.labelAr}
              {f.optional && (
                <span style={{ color: 'var(--text-dimmer)', fontWeight: 600 }}> — اختياري</span>
              )}
            </span>
            <input
              className="admin-field"
              name={f.name}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              data-testid={`checkout-${f.name}`}
              required={!f.optional}
            />
          </label>
        ))}
      </div>

      {/* The account's email, shown so the customer knows where confirmation
          goes, and not editable: an order whose destination address can be
          retyped is an order-lookup oracle. */}
      <div>
        <span style={LABEL}>البريد الإلكتروني</span>
        <p
          className="card-sm"
          data-testid="checkout-email"
          style={{ padding: '10px 13px', margin: 0, fontSize: 13.5, direction: 'ltr', textAlign: 'start' }}
        >
          {accountEmail ?? '— سجّل الدخول أولاً'}
        </p>
        <p style={NOTE}>من حسابك — غيّره من إعدادات الحساب إن لزم.</p>
      </div>

      <label style={{ display: 'block' }}>
        <span style={LABEL}>ملاحظات للناقل — اختياري</span>
        <textarea className="admin-field" name="notes" rows={3} data-testid="checkout-notes" />
      </label>

      <dl className="admin-kv card-sm" data-testid="checkout-totals" style={{ padding: '15px 17px' }}>
        <div><dt>المنتجات</dt><dd>{formatPrice(totals.itemsTotalMinor, currency)}</dd></div>
        <div>
          <dt>الشحن</dt>
          <dd>
            {quote?.ok
              ? (shippingMinor === 0 ? 'مجاني' : formatPrice(shippingMinor, currency))
              : '— اختر البلد'}
          </dd>
        </div>
        <div>
          <dt>الإجمالي</dt>
          <dd>
            <strong>
              {quote?.ok ? formatPrice(totals.totalMinor, currency) : '—'}
            </strong>
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" data-testid="checkout-error" style={NOTE_BAD}>{error}</p>
      )}

      <div>
        <button
          type="submit"
          className="btn-primary"
          data-testid="checkout-submit"
          disabled={!!blockedReason || pending}
        >
          {pending ? 'جارٍ إنشاء الطلب…' : 'أنشئ الطلب'}
        </button>
        {blockedReason && !pending && (
          <p data-testid="checkout-blocked" style={NOTE}>{blockedReason}</p>
        )}
        {!orderable && (
          <p style={{ margin: '10px 0 0' }}>
            <Link href={cartHref()} className="btn-ghost">افتح السلة</Link>
          </p>
        )}
      </div>
    </form>
  );
};

const LABEL: React.CSSProperties = {
  display: 'block', fontSize: 12.5, fontWeight: 800,
  color: 'var(--text-dim)', marginBottom: 5,
};
const NOTE: React.CSSProperties = {
  margin: '6px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85,
};
const NOTE_BAD: React.CSSProperties = {
  margin: '6px 0 0', fontSize: 12.5, color: 'var(--sev-blocker)', lineHeight: 1.9,
};
