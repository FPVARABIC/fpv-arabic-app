import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { storeCategory } from '@core/data/store/categories';
import { SUPPLIERS } from '@core/data/store/suppliers';
import { privateStoreSettings } from '@/lib/server/storeSettings';
import { resolvedProducts } from '@/lib/server/storeCatalogue';
import { AdminShell } from '@/components/admin/AdminShell';
import { SupplyRow } from '@/components/admin/SupplyRow';
import { readAllSupply } from '@/lib/server/storeSupply';

export const metadata: Metadata = {
  title: 'التسعير والموردون — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Where prices come from.
 *
 * Every product in the shop is listed here with its supply record, and a
 * product with no record has no price on the storefront — which is why this
 * page exists before any product-editing screen does. Nothing else in the store
 * can function until somebody has said what we pay.
 *
 * WHAT IS SHOWN THAT A CUSTOMER NEVER SEES
 * ----------------------------------------
 * The supplier, the unit cost, the inbound shipping, the margin, and the
 * arithmetic between them — including the margin actually realised after
 * rounding, which is not the one that was typed. A shop owner setting a margin
 * needs the number they will get, not the number they asked for.
 *
 * This page requires `store.viewSupply`, which is separate from
 * `store.viewOrders` on purpose: fulfilling orders is a daily job, and seeing
 * what we pay suppliers is not something it should require.
 */
export default async function AdminSupply() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewSupply')) redirect('/');

  const [supply, settings, products] = await Promise.all([
    readAllSupply(), privateStoreSettings(), resolvedProducts(),
  ]);
  const canEdit = sessionCan(session, 'store.editProducts');

  // One row per VARIANT, because that is what a cost belongs to: an RTF kit and
  // the bare aircraft come from the same supplier at different prices, and one
  // row for both was how every variant ended up unpriced while the panel
  // reported a price.
  const rows = products.flatMap(p => p.variants.map(v => ({
    variantId: v.id,
    nameEn: p.nameEn,
    variantNameAr: p.variants.length > 1 ? v.nameAr : p.titleAr,
    categoryAr: storeCategory(p.categoryId)?.titleAr ?? p.categoryId,
    supply: supply[v.id] ?? null,
  })));
  const priced = rows.filter(r => r.supply);
  const unpriced = rows.filter(r => !r.supply);

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/supply" titleAr="التسعير والموردون">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 4px', lineHeight: 1.95 }}>
        <span dir="ltr">{priced.length}</span> خياراً مسعَّراً من{' '}
        <span dir="ltr">{rows.length}</span>. الخيار بلا سجلّ توريد يظهر في
        المتجر بلا سعر ولا يمكن طلبه — وهذا مقصود، لأن رقماً مخترَعاً أسوأ من
        غياب الرقم.
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '0 0 16px' }}>
        هامش الربح الافتراضي حالياً{' '}
        <span dir="ltr">{settings.defaultMarginPercent}%</span>، ويُطبَّق على
        التكلفة الواصلة (الوحدة + الشحن الداخل) لا على سعر الوحدة وحده.
      </p>

      {/* The suppliers this shop buys from — a list, not an assumption. */}
      <section className="admin-section" aria-labelledby="suppliers-h">
        <h2 id="suppliers-h">الموردون</h2>
        <div data-testid="supplier-list"
          style={{ display: 'grid', gap: 9, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          {SUPPLIERS.map(s => (
            <div key={s.id} className="card-sm" data-testid={`supplier-${s.id}`}
              style={{ padding: '12px 14px', minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13.5, fontWeight: 900 }}>{s.nameAr}</span>
                <span className="admin-badge">{s.shipsFromAr}</span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                <span dir="ltr">{s.leadTimeDays.min}–{s.leadTimeDays.max}</span> يوماً
              </p>
              {s.avoidForAr.length > 0 && (
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#fcd34d', lineHeight: 1.8 }}>
                  لا تشترِ منه: {s.avoidForAr[0]}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="admin-section" aria-labelledby="pricing-h">
        <h2 id="pricing-h">المنتجات</h2>
        <ul data-testid="supply-rows" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
          {rows.map(r => (
            <SupplyRow
              key={r.variantId}
              variantId={r.variantId}
              nameEn={r.nameEn}
              variantNameAr={r.variantNameAr}
              categoryAr={r.categoryAr}
              supply={r.supply}
              defaultMarginPercent={settings.defaultMarginPercent}
              canEdit={canEdit}
            />
          ))}
        </ul>
      </section>

      {unpriced.length > 0 && (
        <p className="card-sm" data-testid="supply-unpriced-note"
          style={{ padding: '13px 15px', marginTop: 18, fontSize: 12.5, color: '#fcd34d', lineHeight: 1.95 }}>
          <span dir="ltr">{unpriced.length}</span> خياراً ينتظر إدخال الإدارة. حتى
          تُدخل تكلفته لن يظهر بسعر في المتجر ولن يُضاف إلى أي سلة.
        </p>
      )}
    </AdminShell>
  );
}
