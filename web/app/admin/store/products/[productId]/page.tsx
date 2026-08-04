import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSession, sessionCan } from '@/lib/server/session';
import { storeCategory } from '@core/data/store/categories';
import { CHOICE_POSITION_LABEL_AR } from '@core/data/store/types';
import { formatPrice } from '@core/data/store/pricing';
import { AdminShell } from '@/components/admin/AdminShell';
import { ProductEditor } from '@/components/admin/ProductEditor';
import { PublishToggle } from '@/components/admin/PublishToggle';
import { resolvedProduct } from '@/lib/server/storeCatalogue';
import { productHref } from '@/lib/store';

export const metadata: Metadata = {
  title: 'تعديل منتج — الإدارة',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

/**
 * One product, editable.
 *
 * WHAT THE HEADER SHOWS AND WHY IT IS NOT EDITABLE
 * ------------------------------------------------
 * The id, the section, and where the product sits on that section's axis. All
 * three are what the routes and the comparison grid are built from, so they
 * live in a reviewed commit rather than in a form — a section whose «الاقتصادي»
 * slot could be reassigned from a text field is a section whose comparison
 * stops meaning anything.
 *
 * The price is shown and not editable for the same reason it is absent from the
 * editor: it is a consequence of cost and margin, computed on the supply
 * screen. Showing it here is how somebody notices it is missing.
 */
export default async function AdminProductEdit(
  { params }: { params: Promise<{ productId: string }> },
) {
  const session = await getSession();
  if (!session || !sessionCan(session, 'store.viewProducts')) redirect('/');

  const { productId } = await params;
  const product = await resolvedProduct(productId);
  if (!product) notFound();

  const category = storeCategory(product.categoryId);
  const canEdit = sessionCan(session, 'store.editProducts');

  return (
    <AdminShell role={session.role} actorName={session.displayName}
      current="/admin/store/products" titleAr="تعديل منتج" ownTitle>
      <p style={{ fontSize: 12.5, margin: '0 0 12px' }}>
        <Link href="/admin/store/products" className="btn-ghost" style={{ fontSize: 12 }}>
          ← كل المنتجات
        </Link>
      </p>

      {/* The product's own name, not «تعديل منتج» — the shell's title says
          what the screen is, and repeating it here would be two headings for
          one document. `AdminShell` is told to render none for this route. */}
      <h1 className="ltr" style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{product.nameEn}</h1>
      <p style={{ margin: '5px 0 0', fontSize: 14, color: 'var(--text-dim)' }}>{product.titleAr}</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 18px', alignItems: 'center' }}>
        <span className="admin-badge ltr" data-testid="admin-product-id">{product.id}</span>
        {category && (
          <>
            <span className="admin-badge">{category.titleAr}</span>
            <span className="admin-badge">
              {CHOICE_POSITION_LABEL_AR[category.choiceAxis][product.choicePosition]}
            </span>
          </>
        )}
        <span className="admin-badge" data-testid="admin-product-price">
          {product.priceMinor === null
            ? 'بلا سعر — أدخل التكلفة في «التسعير والموردون»'
            : formatPrice(product.priceMinor, product.currency)}
        </span>
        {!product.published && (
          <span className="admin-badge" style={{ color: '#fcd34d' }}>مخفي من المتجر</span>
        )}
        <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {canEdit && <PublishToggle productId={product.id} published={product.published} />}
          {product.published && (
            <Link href={productHref(product.id)} className="btn-ghost" style={{ fontSize: 12 }}
              data-testid="admin-product-view">
              اعرضه في المتجر ↗
            </Link>
          )}
          <Link href="/admin/store/supply" className="btn-ghost" style={{ fontSize: 12 }}>
            التكلفة والمورد
          </Link>
        </span>
      </div>

      {canEdit
        ? <ProductEditor product={product} />
        : (
          <p className="card-sm" data-testid="product-editor-readonly"
            style={{ padding: '13px 15px', fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.95 }}>
            لديك صلاحية العرض فقط. تحتاج <span className="ltr">store.editProducts</span> للتعديل.
          </p>
        )}
    </AdminShell>
  );
}
