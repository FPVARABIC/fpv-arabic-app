import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { AVAILABILITY_LABEL_AR, CHOICE_POSITION_LABEL_AR } from '@core/data/store/types';
import type { StoreProduct } from '@core/data/store/types';
import {
  STORE_CATALOGUE, storeProduct, storeCategory, publicSettings,
  productHref, categoryHref, isOrderable,
} from '@/lib/store';
import { SECTION_ROUTES, webHref } from '@/lib/webRoutes';
import { Price, ProductImage, StoreBanner } from '@/components/store/StorePieces';

export const dynamicParams = false;

export function generateStaticParams() {
  return STORE_CATALOGUE.filter(p => p.published).map(p => ({ productId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ productId: string }> },
): Promise<Metadata> {
  const { productId } = await params;
  const p = storeProduct(productId);
  if (!p || !p.published) return { title: 'منتج غير موجود', robots: { index: false, follow: false } };
  return {
    title: `${p.nameEn} — المتجر`,
    description: p.summaryAr.slice(0, 160),
    alternates: { canonical: productHref(p.id) },
    openGraph: { type: 'website', title: `${p.nameEn} — متجر FPV بالعربي`, description: p.summaryAr.slice(0, 160) },
  };
}

/**
 * One product.
 *
 * NOT A LESSON
 * ------------
 * The brief was explicit and it is the right instinct: this is a shop page, not
 * an article. So it answers the six things a buyer needs — what it is, who it
 * suits, who it does NOT, what is in the box, what it costs, and what goes with
 * it — and then links to the encyclopedia instead of becoming it.
 *
 * «WHO IT IS NOT FOR» IS THE SECTION THAT EARNS TRUST
 * ---------------------------------------------------
 * No shop writes it, which is exactly why it works. A page that will tell you
 * not to buy the thing it is selling is a page you can believe about the rest.
 * It is a required field on the model, not an optional one, so a product cannot
 * be added without somebody deciding who should skip it.
 *
 * THE THREE RELATIONSHIPS ARE DIFFERENT QUESTIONS
 * -----------------------------------------------
 * «بدائل» answers "is there a better fit for me?", «يكمله» answers "what else
 * do I need to fly?", and «مرتبط» answers "what else is in this area?". Most
 * shops merge them into one «you may also like» strip, which answers none of
 * them and mostly sells whatever has the best margin.
 */
export default async function ProductPage(
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const product = storeProduct(productId);
  if (!product || !product.published) notFound();

  const category = storeCategory(product.categoryId);
  const settings = publicSettings();
  const orderable = isOrderable(product);

  const group = (ids: string[]) =>
    ids.map(id => storeProduct(id)).filter((p): p is StoreProduct => !!p && p.published);
  const alternatives = group(product.alternativeProductIds);
  const completes = group(product.completesProductIds);
  const related = group(product.relatedProductIds);

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 960 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.store}>المتجر</Link>
        {category && <>
          {' '}<span aria-hidden>/</span>{' '}
          <Link href={categoryHref(category.id)}>{category.titleAr}</Link>
        </>}
      </nav>

      <div style={{
        display: 'grid', gap: 22, marginTop: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      }}>
        <div style={{ minWidth: 0 }}>
          <ProductImage product={product} height={300} />
        </div>

        <div style={{ minWidth: 0 }}>
          <p className="ltr" style={{ margin: 0, fontSize: 12.5, color: 'var(--text-dimmer)' }}>
            {product.brandAr}
          </p>
          <h1 className="ltr" style={{ fontSize: 24, fontWeight: 900, margin: '4px 0 0' }}>
            {product.nameEn}
          </h1>
          <p style={{ margin: '7px 0 0', fontSize: 15, color: 'var(--text-dim)' }}>
            {product.titleAr}
          </p>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '13px 0' }}>
            {category && (
              <span className="admin-badge" style={{ color: 'var(--accent)' }}>
                {CHOICE_POSITION_LABEL_AR[category.choiceAxis][product.choicePosition]}
              </span>
            )}
            <span className="admin-badge" data-testid="product-availability">
              {AVAILABILITY_LABEL_AR[product.availability]}
            </span>
          </div>

          <div style={{ marginTop: 4 }}><Price product={product} large /></div>
          <p style={{ margin: '7px 0 0', fontSize: 12, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
            {settings.shippingNoteAr}
          </p>

          {/*
            No order control ships until the cart and the order flow do.
            A button that looks like it takes an order and does not is the exact
            thing the brief refused, and it is worse in a shop than anywhere
            else — it takes a decision the customer already made and drops it.
          */}
          {orderable ? (
            <p data-testid="product-order-pending" className="card-sm"
              style={{ padding: '12px 14px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
              الطلب من الموقع يُفتح في التحديث القادم. حتى ذلك الحين تواصل معنا
              وسنجهّزه لك مضبوطاً كما هو موضّح أعلى الصفحة.
            </p>
          ) : (
            <p data-testid="product-not-orderable" className="card-sm"
              style={{ padding: '12px 14px', marginTop: 14, fontSize: 12.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
              هذا المنتج غير قابل للطلب حالياً — سعره أو توفّره لم يُحدَّث بعد.
              نعرضه لأنه من الخيارات التي نوصي بها، لا لنبيعه اليوم.
            </p>
          )}
        </div>
      </div>

      <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 2, marginTop: 22 }}>
        {product.summaryAr}
      </p>

      <div style={{
        display: 'grid', gap: 14, marginTop: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
      }}>
        <Block titleAr="يناسبك إن كنت" items={product.suitsAr} testId="product-suits" />
        {/* The section no competitor writes. */}
        <Block titleAr="لا يناسبك إن كنت" items={product.notForAr} testId="product-not-for" tone="warn" />
      </div>

      <Block titleAr="أهم ما فيه" items={product.highlightsAr} testId="product-highlights" />
      <Block titleAr="ما الذي يأتي في الصندوق" items={product.inTheBoxAr} testId="product-in-box" />

      {/* Specs render only once verified — see the note in the catalogue. */}
      {product.specs.length > 0 && (
        <section className="admin-section" aria-labelledby="specs-h">
          <h2 id="specs-h">المواصفات</h2>
          <dl className="admin-kv" data-testid="product-specs">
            {product.specs.map((s, i) => (
              <div key={i}>
                <dt>{s.labelAr}</dt>
                <dd className="ltr">
                  {s.valueAr}
                  {!s.verified && (
                    <span style={{ color: '#fcd34d', fontSize: 11 }}> · بانتظار التأكيد</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {product.learnLinks.length > 0 && (
        <section className="admin-section" aria-labelledby="learn-h">
          <h2 id="learn-h">اقرأ قبل أن تقرّر</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {product.learnLinks.map((l, i) => {
              const web = webHref({ kind: l.kind, id: l.targetId } as Parameters<typeof webHref>[0]);
              if (!web.href) {
                return web.unavailableReasonAr ? (
                  <span key={i} className="admin-badge" style={{ fontWeight: 500 }}>
                    {l.label} — {web.unavailableReasonAr}
                  </span>
                ) : null;
              }
              return (
                <Link key={i} href={web.href} className="btn-ghost"
                  data-testid={`product-learn-${l.targetId || l.kind}`}>
                  {l.label}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Related titleAr="أو هذا بدلاً منه" products={alternatives} testId="product-alternatives" />
      <Related titleAr="وتحتاج معه" products={completes} testId="product-completes" />
      <Related titleAr="مرتبط" products={related} testId="product-related" />

      <StoreBanner settings={settings} compact />

      {category && (
        <p style={{ marginTop: 26, fontSize: 13 }}>
          <Link href={categoryHref(category.id)} className="btn-ghost">
            ← كل خيارات {category.titleAr}
          </Link>
        </p>
      )}
    </div>
  );
}

const Block: React.FC<{
  titleAr: string; items: string[]; testId: string; tone?: 'warn';
}> = ({ titleAr, items, testId, tone }) => {
  if (items.length === 0) return null;
  return (
    <section style={{ marginTop: 16 }} data-testid={testId}>
      <h2 style={{
        margin: 0, fontSize: 13, fontWeight: 900,
        color: tone === 'warn' ? '#fcd34d' : 'var(--text-dimmer)',
      }}>
        {titleAr}
      </h2>
      <ul style={{ margin: '9px 0 0', paddingInlineStart: 20, display: 'grid', gap: 6 }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 13.5, lineHeight: 1.95, color: 'var(--text-dim)' }}>{t}</li>
        ))}
      </ul>
    </section>
  );
};

const Related: React.FC<{
  titleAr: string; products: StoreProduct[]; testId: string;
}> = ({ titleAr, products, testId }) => {
  if (products.length === 0) return null;
  return (
    <section className="admin-section" aria-labelledby={`rel-${testId}`}>
      <h2 id={`rel-${testId}`}>{titleAr}</h2>
      <div data-testid={testId} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {products.map(p => (
          <Link key={p.id} href={productHref(p.id)} className="btn-ghost"
            data-testid={`${testId}-${p.id}`}>
            <span className="ltr">{p.nameEn}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};
