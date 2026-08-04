'use client';

import { useState } from 'react';
import {
  AVAILABILITY_LABEL_AR, PACKAGE_LABEL_AR,
  LINK_PROTOCOL_LABEL_AR, VIDEO_SYSTEM_LABEL_AR,
} from '@core/data/store/types';
import type { StoreProduct, ProductVariant } from '@core/data/store/types';
import { canOrder } from '@core/data/store/publication';
import { formatPrice } from '@core/data/store/pricing';
import { AddVariantToCart } from './CartControls';

/**
 * Choosing which version of a thing to buy.
 *
 * THE THREE QUESTIONS, AND THE ONES THAT ARE NOT ASKED
 * ----------------------------------------------------
 * What is in the box, what radio it binds to, what goggles it shows in. Every
 * one of them is answerable by somebody looking at the equipment they already
 * own. A buyer is never asked for a Target, a firmware version, a build option
 * or a bind phrase — those are setup decisions, they are what the free service
 * exists to handle, and a checkout that asks them is a checkout that loses
 * somebody who had already decided to buy.
 *
 * WHY THE UNAVAILABLE VARIANTS STAY VISIBLE
 * -----------------------------------------
 * Because «the ELRS one is out of stock» is information, and hiding it makes
 * the page look like the ELRS one does not exist — so the customer goes and
 * buys it somewhere else rather than waiting a week. Disabled, labelled, and
 * still there.
 *
 * WHY THE PRICE IS BESIDE EACH OPTION
 * -----------------------------------
 * A picker where the price changes after you choose makes you click three
 * times to compare three numbers. They differ by tens of dollars here; showing
 * them at once is the whole reason the variants are separate records.
 */
export const VariantPicker: React.FC<{
  product: StoreProduct;
  shippingNoteAr: string;
}> = ({ product, shippingNoteAr }) => {
  const variants = product.variants;
  const initial = variants.find(v => v.isDefault) ?? variants[0];
  const [chosenId, setChosenId] = useState(initial?.id ?? '');
  const chosen = variants.find(v => v.id === chosenId) ?? initial;

  if (!chosen) return null;

  const orderable = canOrder(product, chosen);
  const many = variants.length > 1;

  return (
    <div data-testid="variant-picker" style={{ marginTop: 14 }}>
      {many && (
        <>
          <h2 style={{ margin: '0 0 9px', fontSize: 13, fontWeight: 900, color: 'var(--text-dimmer)' }}>
            اختر النسخة
          </h2>
          <div role="radiogroup" aria-label="نسخ المنتج"
            style={{ display: 'grid', gap: 8, marginBottom: 15 }}>
            {variants.map(v => {
              const buyable = canOrder(product, v);
              const active = v.id === chosenId;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-testid={`variant-${v.id}`}
                  onClick={() => setChosenId(v.id)}
                  style={{
                    textAlign: 'start', padding: '11px 13px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                    background: active ? 'rgba(56,189,248,0.07)' : 'var(--surface-2)',
                    color: 'var(--text)', font: 'inherit', cursor: 'pointer',
                    display: 'grid', gap: 5,
                  }}
                >
                  <span style={{ display: 'flex', gap: 9, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13.5, fontWeight: 800 }}>{v.nameAr}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 900, whiteSpace: 'nowrap' }}>
                      {v.priceMinor === null
                        ? <span style={{ color: 'var(--text-dimmer)', fontSize: 11.5, fontWeight: 500 }}>
                          السعر قيد التحديث
                        </span>
                        : <span className="ltr">{formatPrice(v.priceMinor, product.currency)}</span>}
                    </span>
                  </span>
                  <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span className="admin-badge" style={{ fontSize: 10.5 }}>
                      {PACKAGE_LABEL_AR[v.packageKind]}
                    </span>
                    {!buyable && (
                      <span className="admin-badge" style={{ fontSize: 10.5, color: 'var(--sev-warning)' }}>
                        {AVAILABILITY_LABEL_AR[v.availability]}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* What the chosen one actually is. Rendered from the variant, never from
          the product — the whole point of separating them. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <span className="admin-badge" data-testid="variant-package">
          {PACKAGE_LABEL_AR[chosen.packageKind]}
        </span>
        <span className="admin-badge" data-testid="variant-availability">
          {AVAILABILITY_LABEL_AR[chosen.availability]}
        </span>
        {chosen.linkProtocol !== 'none' && (
          <span className="admin-badge" data-testid="variant-protocol">
            يبِنّ مع: {LINK_PROTOCOL_LABEL_AR[chosen.linkProtocol]}
          </span>
        )}
        {chosen.videoSystem !== 'none' && (
          <span className="admin-badge" data-testid="variant-video">
            يظهر في نظّارة: {VIDEO_SYSTEM_LABEL_AR[chosen.videoSystem]}
          </span>
        )}
      </div>

      <p style={{ margin: 0, fontSize: 22, fontWeight: 900 }} data-testid="variant-price">
        {chosen.priceMinor === null
          ? <span style={{ fontSize: 14, color: 'var(--text-dimmer)', fontWeight: 700 }}>
            السعر قيد التحديث
          </span>
          : <span className="ltr">{formatPrice(chosen.priceMinor, product.currency)}</span>}
      </p>
      <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
        {shippingNoteAr}
      </p>

      {chosen.freeSetupEligible && (
        <p data-testid="variant-free-setup" style={{
          margin: '11px 0 0', fontSize: 12.5, color: 'var(--sev-ok)', lineHeight: 1.9,
        }}>
          يشمل خدمة البرمجة والإعداد مجاناً قبل الشحن.
        </p>
      )}

      <AddVariantToCart product={product} variant={chosen} orderable={orderable} />

      <section style={{ marginTop: 18 }} data-testid="variant-in-box">
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 900, color: 'var(--text-dimmer)' }}>
          ما يأتي في هذه النسخة
        </h2>
        <ul style={{ margin: '9px 0 0', paddingInlineStart: 20, display: 'grid', gap: 6 }}>
          {chosen.inTheBoxAr.map((t, i) => (
            <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{t}</li>
          ))}
        </ul>
      </section>
    </div>
  );
};

/** Exported for the comparison table, which needs the same label logic. */
export function variantSummaryAr(v: ProductVariant): string {
  const bits = [PACKAGE_LABEL_AR[v.packageKind]];
  if (v.linkProtocol !== 'none') bits.push(LINK_PROTOCOL_LABEL_AR[v.linkProtocol]);
  if (v.videoSystem !== 'none') bits.push(VIDEO_SYSTEM_LABEL_AR[v.videoSystem]);
  return bits.join(' · ');
}
