'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { formatPrice } from '@core/data/store/pricing';
import { MAX_QUANTITY_PER_LINE, storedItemCount } from '@core/data/store/cart';
import type { PricedProduct } from '@core/data/store/cart';
import type { ProductVariant, StoreProduct } from '@core/data/store/types';
import {
  subscribeCart, cartSnapshot, cartServerSnapshot, resolve,
  cartAdd, cartSetQuantity, cartRemove,
} from '@/lib/cart';
import { cartHref, productHref } from '@/lib/store';

/**
 * The cart's interactive parts.
 *
 * All of them read the same external store, so the header badge, the button on
 * a product page and the basket itself can never disagree — which is the bug
 * every hand-rolled cart eventually has, and the one customers notice fastest.
 *
 * WHO NEEDS PRICES AND WHO DOES NOT
 * ---------------------------------
 * Only the basket and the checkout do, and both are server-rendered pages that
 * hand the live catalogue down as a prop. The badge and the add button work
 * from the stored cart alone — which is why the badge, which appears on every
 * page in the site, costs no database read at all.
 */

/** The stored cart, unpriced. Everything the non-money controls need. */
function useStoredCart() {
  return useSyncExternalStore(subscribeCart, cartSnapshot, cartServerSnapshot);
}

/**
 * Add to basket.
 *
 * Renders as a disabled explanation rather than a button when the product
 * cannot be ordered — a control that looks live and refuses is worse than one
 * that says why up front, and in a shop it wastes a decision the customer has
 * already made.
 */
export const AddVariantToCart: React.FC<{
  product: StoreProduct;
  variant: ProductVariant;
  /** Decided by `canOrder` on the server's data — see `VariantPicker`. */
  orderable: boolean;
}> = ({ product, variant, orderable }) => {
  // The stored cart, not a resolved one: this button needs to know whether the
  // customer already added THIS VARIANT, and the server already told it the
  // price by handing over the resolved variant itself.
  const inCart = useStoredCart().items.find(i => i.variantId === variant.id);

  if (!orderable) {
    return (
      <p data-testid="add-to-cart-unavailable" className="card-sm"
        style={{ padding: '12px 14px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
        {variant.priceMinor === null
          ? 'سعر هذه النسخة قيد التحديث، فلا يمكن طلبها بعد. نعرضها لأنها من الخيارات التي نوصي بها.'
          : product.suspendedReasonAr
            ? 'أوقفنا بيع هذا المنتج مؤقّتاً.'
            : 'هذه النسخة غير متاحة للطلب حالياً.'}
      </p>
    );
  }

  if (inCart) {
    return (
      <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <QuantityStepper variantId={variant.id} quantity={inCart.quantity} />
        <Link href={cartHref()} className="btn-ghost" data-testid="go-to-cart">
          في السلة — افتحها ←
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="btn-primary"
      data-testid="add-to-cart"
      onClick={() => cartAdd(variant.id, 1)}
      style={{ marginTop: 14, width: '100%', padding: '12px 16px', fontSize: 14.5 }}
    >
      أضف إلى السلة
    </button>
  );
};

/** A quantity control that can also remove the line, because zero means gone. */
export const QuantityStepper: React.FC<{ variantId: string; quantity: number }> = ({
  variantId, quantity,
}) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
    <button type="button" className="btn-ghost" aria-label="أنقص الكمية"
      data-testid={`qty-down-${variantId}`}
      onClick={() => cartSetQuantity(variantId, quantity - 1)}
      style={{ padding: '6px 12px', fontSize: 15 }}>−</button>
    <span data-testid={`qty-${variantId}`} aria-live="polite"
      style={{ minWidth: 34, textAlign: 'center', fontSize: 14, fontWeight: 800 }}>
      <span dir="ltr">{quantity}</span>
    </span>
    <button type="button" className="btn-ghost" aria-label="زد الكمية"
      data-testid={`qty-up-${variantId}`}
      disabled={quantity >= MAX_QUANTITY_PER_LINE}
      onClick={() => cartSetQuantity(variantId, quantity + 1)}
      style={{ padding: '6px 12px', fontSize: 15 }}>+</button>
  </span>
);

/**
 * The header badge. Renders nothing at all when the basket is empty.
 *
 * Counts what is stored rather than what resolves, so a line that went out of
 * stock still shows — the customer put three things in and the badge says
 * three. They learn about the third inside the basket, where there is room to
 * explain it, instead of by noticing a number that quietly disagrees with them.
 */
export const CartBadge: React.FC = () => {
  const count = storedItemCount(useStoredCart());
  if (count === 0) return null;
  return (
    <Link href={cartHref()} className="btn-ghost" data-testid="cart-badge"
      style={{ flexShrink: 0, fontSize: 12.5, padding: '6px 11px', whiteSpace: 'nowrap' }}>
      السلة <span dir="ltr">({count})</span>
    </Link>
  );
};

/**
 * The basket itself.
 *
 * A client island because the cart lives in the browser, which also means it
 * never reaches the server-rendered HTML — the same privacy property the
 * project workspace has.
 */
export const CartContents: React.FC<{ catalogue: readonly PricedProduct[] }> = ({ catalogue }) => {
  const { lines, dropped, totals, orderable } = resolve(useStoredCart(), catalogue);

  if (lines.length === 0 && dropped.length === 0) {
    return (
      <div className="card-sm" data-testid="cart-empty" style={{ padding: '18px 20px', marginTop: 18 }}>
        <p style={{ margin: 0, fontSize: 14.5, fontWeight: 800 }}>سلّتك فارغة.</p>
        <p style={{ margin: '9px 0 0', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          كل قسم في المتجر فيه ثلاثة إلى خمسة خيارات فقط، مرتّبة بحيث يظهر الفرق
          بينها بسرعة.
        </p>
        <p style={{ margin: '13px 0 0' }}>
          <Link href="/store" className="btn-primary" data-testid="cart-browse">تصفّح الأقسام</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      {/* What could not be honoured, and why. Silently shortening a basket is
          how a customer loses something and never finds out. */}
      {dropped.length > 0 && (
        <div className="card-sm" data-testid="cart-dropped"
          style={{ padding: '13px 15px', marginBottom: 14, borderColor: 'rgba(252,211,77,0.35)' }}>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 900, color: '#fcd34d' }}>
            أُزيلت من سلّتك
          </p>
          <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
            {dropped.map(d => (
              <li key={d.variantId} style={{ fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                {d.reasonAr}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul data-testid="cart-lines" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {lines.map(l => (
          <li key={l.product.id} className="card-sm"
            data-testid={`cart-line-${l.product.id}`}
            style={{ padding: '14px 16px', display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <Link href={productHref(l.product.productId)} className="ltr"
                  style={{ fontSize: 13.5, fontWeight: 900 }}>
                  {l.product.nameEn}
                </Link>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: 'var(--text-dim)' }}>
                  {l.product.variantNameAr || l.product.titleAr}
                </p>
              </div>
              <span data-testid={`cart-line-total-${l.product.id}`}
                style={{ fontSize: 14, fontWeight: 900, whiteSpace: 'nowrap' }}>
                {/* A line given away shows what it was worth, struck through:
                    a customer should SEE what they received, not merely fail to
                    be charged for it. */}
                {l.unitPriceMinor === 0
                  ? <span style={{ color: '#6ee7b7' }}>مجاناً</span>
                  : formatPrice(l.lineTotalMinor, l.product.currency)}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {l.unitPriceMinor === 0 ? (
                <span style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                  تُضاف تلقائياً مع أي طلب
                </span>
              ) : (
                <>
                  <QuantityStepper variantId={l.product.id} quantity={l.quantity} />
                  <button type="button" className="btn-ghost"
                    data-testid={`cart-remove-${l.product.id}`}
                    onClick={() => cartRemove(l.product.id)}
                    style={{ fontSize: 12 }}>
                    إزالة
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <dl className="admin-kv card-sm" data-testid="cart-totals"
        style={{ padding: '15px 17px', marginTop: 16 }}>
        <div>
          <dt>المنتجات</dt>
          <dd className="ltr">{formatPrice(totals.itemsTotalMinor, 'USD')}</dd>
        </div>
        <div>
          <dt>الشحن</dt>
          {/* Not zero — unknown. Quoting zero shipping and charging for it at
              the end is the single most complained-about pattern in online
              shops, and it is a choice rather than a limitation. */}
          <dd style={{ color: 'var(--text-dimmer)' }}>يُحتسب بعد العنوان</dd>
        </div>
        <div>
          <dt style={{ fontWeight: 900 }}>الإجمالي حتى الآن</dt>
          <dd className="ltr" style={{ fontWeight: 900 }}>
            {formatPrice(totals.totalMinor, 'USD')}
          </dd>
        </div>
      </dl>

      {orderable && (
        <p style={{ marginTop: 16 }}>
          <Link href={`${cartHref()}/checkout`} className="btn-primary"
            data-testid="cart-checkout"
            style={{ display: 'inline-block', padding: '12px 20px', fontSize: 14.5 }}>
            أكمل الطلب ←
          </Link>
        </p>
      )}
    </div>
  );
};
