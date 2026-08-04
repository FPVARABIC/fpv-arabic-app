import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { AVAILABILITY_LABEL_AR } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';
import { AdminShell } from '@/components/admin/AdminShell';
import { PublishToggle } from '@/components/admin/PublishToggle';
import { resolvedProducts } from '@/lib/server/storeCatalogue';

export const metadata: Metadata = {
  title: 'المنتجات — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * Every product, as the shop currently has it.
 *
 * GROUPED BY SECTION RATHER THAN LISTED FLAT
 * ------------------------------------------
 * Because the shop's promise is three to five products per section spanning a
 * real decision, and a flat list of forty rows hides the moment a section drops
 * to one option or grows to nine. The count next to each heading is the thing
 * being managed; the products are how it is managed.
 *
 * WHAT IS DELIBERATELY NOT HERE
 * -----------------------------
 * A price field, and a delete button. Prices are computed on the supply screen
 * from cost and margin so that none can exist that nobody can explain; deleting
 * would orphan the orders that reference a product, so hiding is the operation
 * and it is reversible.
 */
export default async function AdminProducts() {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewProducts')) redirect('/');

  const products = await resolvedProducts();
  const canEdit = sessionCan(session, 'store.editProducts');

  const hidden = products.filter(p => !p.published).length;
  const unpriced = products.filter(p => p.priceMinor === null).length;
  const withoutImages = products.filter(p => p.images.length === 0).length;

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/products" titleAr="المنتجات">
      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '0 0 16px', lineHeight: 1.95 }}>
        <span dir="ltr">{products.length}</span> منتجاً في{' '}
        <span dir="ltr">{STORE_CATEGORIES.length}</span> قسماً.
        {hidden > 0 && <> <span dir="ltr">{hidden}</span> مخفي.</>}
        {unpriced > 0 && <> <span dir="ltr">{unpriced}</span> بلا سعر.</>}
        {withoutImages > 0 && <> <span dir="ltr">{withoutImages}</span> بلا صورة.</>}
      </p>

      {!canEdit && (
        <p className="card-sm" style={{ padding: '12px 14px', margin: '0 0 16px', fontSize: 12.5, color: 'var(--text-dimmer)' }}>
          لديك صلاحية العرض فقط.
        </p>
      )}

      {STORE_CATEGORIES.map(cat => {
        const inCat = products.filter(p => p.categoryId === cat.id);
        if (inCat.length === 0) return null;
        const shown = inCat.filter(p => p.published).length;
        return (
          <section key={cat.id} className="admin-section" aria-labelledby={`cat-${cat.id}`}>
            <h2 id={`cat-${cat.id}`}>
              {cat.titleAr}{' '}
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-dimmer)' }}>
                <span dir="ltr">{shown}</span> معروض
                {shown !== inCat.length && <> من <span dir="ltr">{inCat.length}</span></>}
              </span>
            </h2>
            <ul data-testid={`admin-products-${cat.id}`}
              style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 9 }}>
              {inCat.map(p => (
                <li key={p.id} className="card-sm" data-testid={`admin-product-${p.id}`}
                  style={{ padding: '12px 14px', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <span className="ltr" style={{ fontSize: 13.5, fontWeight: 900 }}>{p.nameEn}</span>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-dim)' }}>{p.titleAr}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 900, whiteSpace: 'nowrap' }}>
                      {p.priceMinor === null
                        ? <span style={{ color: '#fcd34d', fontSize: 11.5, fontWeight: 500 }}>بلا سعر</span>
                        : <span className="ltr">{formatPrice(p.priceMinor, p.currency)}</span>}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span className="admin-badge">{AVAILABILITY_LABEL_AR[p.availability]}</span>
                    {!p.published && (
                      <span className="admin-badge" style={{ color: '#fcd34d' }}>مخفي</span>
                    )}
                    {p.images.length === 0 && (
                      <span className="admin-badge" style={{ color: '#fcd34d' }}>بلا صورة</span>
                    )}
                    {p.images.some(i => i.credit?.needsReplacement) && (
                      <span className="admin-badge" style={{ color: '#fcd34d' }}>صورة مؤقّتة</span>
                    )}
                    {p.specs.some(s => !s.verified) && (
                      <span className="admin-badge">مواصفة بانتظار التأكيد</span>
                    )}
                    <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                      {canEdit && <PublishToggle productId={p.id} published={p.published} />}
                      <Link href={`/admin/store/products/${encodeURIComponent(p.id)}`}
                        className="btn-ghost" data-testid={`admin-product-edit-${p.id}`}
                        style={{ fontSize: 12 }}>
                        {canEdit ? 'عدّل' : 'اعرض'}
                      </Link>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </AdminShell>
  );
}
