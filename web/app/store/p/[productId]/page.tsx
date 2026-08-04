import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  CHOICE_POSITION_LABEL_AR, BUYER_LEVEL_LABEL_AR, SPEC_SOURCE_LABEL_AR,
} from '@core/data/store/types';
import type { StoreProduct } from '@core/data/store/types';
import {
  STORE_PRODUCTS, storeCategory, productHref, categoryHref,
} from '@/lib/store';
import { resolvedProduct, publishedProducts } from '@/lib/server/storeCatalogue';
import { SECTION_ROUTES, webHref } from '@/lib/webRoutes';
import { ProductGallery, StoreBanner } from '@/components/store/StorePieces';
import { VariantPicker } from '@/components/store/VariantPicker';
import { publicStoreSettings } from '@/lib/server/storeSettings';
import { NEED_CAVEAT_AR } from '@core/data/store/relationships';

export const dynamicParams = false;

/** See the note on the section page: on-demand revalidation with a floor. */
export const revalidate = 300;

export function generateStaticParams() {
  return STORE_PRODUCTS.filter(p => p.published).map(p => ({ productId: p.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ productId: string }> },
): Promise<Metadata> {
  const { productId } = await params;
  const p = await resolvedProduct(productId);
  if (!p || !p.published) return { title: 'منتج غير موجود', robots: { index: false, follow: false } };
  return {
    title: `${p.nameEn} — المتجر`,
    description: p.summaryAr.slice(0, 160),
    alternates: { canonical: productHref(p.id) },
    openGraph: { type: 'website', title: `${p.nameEn} — متجر FPVARABIC`, description: p.summaryAr.slice(0, 160) },
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
  const product = await resolvedProduct(productId);
  if (!product || !product.published) notFound();

  const category = storeCategory(product.categoryId);
  const settings = await publicStoreSettings();

  // The related strips resolve against the merged catalogue too, so a product
  // the admin hid this morning stops being recommended by its neighbours —
  // rather than staying linked from three pages that never heard about it.
  const all = await publishedProducts();
  const group = (ids: string[]) =>
    ids.map(id => all.find(p => p.id === id)).filter((p): p is StoreProduct => !!p);
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
          <ProductGallery product={product} />
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
              <span className="admin-badge" style={{ color: 'var(--accent-ink)' }}>
                {CHOICE_POSITION_LABEL_AR[category.choiceAxis][product.choicePosition]}
              </span>
            )}
            <span className="admin-badge" data-testid="product-level">
              {BUYER_LEVEL_LABEL_AR[product.level]}
            </span>
          </div>

          {/* Package, control link, video system, price, stock and the basket —
              all of it per variant, because all of it differs per variant. The
              badges above are what is true of the product whichever one you
              pick. */}
          <VariantPicker product={product} shippingNoteAr={settings.shippingNoteAr} />
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

      {(product.weightGrams || product.dimensionsMm) && (
        <dl className="admin-kv card-sm" data-testid="product-physical"
          style={{ padding: '13px 15px', marginTop: 18 }}>
          {product.weightGrams && (
            <div><dt>الوزن</dt><dd className="ltr">{product.weightGrams} g</dd></div>
          )}
          {product.dimensionsMm && (
            <div>
              <dt>الأبعاد</dt>
              <dd className="ltr">
                {product.dimensionsMm.length} × {product.dimensionsMm.width} × {product.dimensionsMm.height} mm
              </dd>
            </div>
          )}
        </dl>
      )}

      {/*
        The specification table, with where every figure came from.
        A buyer who wants to check one can; a buyer who does not is not made to
        read a citation — the source is a small link, not a paragraph.
      */}
      {product.specs.length > 0 && (
        <section className="admin-section" aria-labelledby="specs-h">
          <h2 id="specs-h">المواصفات</h2>
          <dl className="admin-kv" data-testid="product-specs">
            {product.specs.map((sp, i) => (
              <div key={i}>
                <dt>{sp.labelAr}</dt>
                <dd>
                  {/* The figure is Latin and reads left to right; the unit is
                      Arabic. Marked separately or the line scrambles. */}
                  <span className="ltr">{sp.valueAr}</span>
                  {sp.unitAr && <span> {sp.unitAr}</span>}
                  {sp.status === 'verified' && sp.source && (
                    <a href={sp.source.url} target="_blank" rel="noopener noreferrer nofollow"
                      data-testid={`spec-source-${i}`}
                      style={{ fontSize: 10.5, marginInlineStart: 8, color: 'var(--text-dimmer)' }}>
                      {SPEC_SOURCE_LABEL_AR[sp.source.kind]} ↗
                    </a>
                  )}
                  {sp.status === 'pending' && (
                    <span style={{ color: 'var(--sev-warning)', fontSize: 11 }}> · بانتظار التأكيد</span>
                  )}
                  {sp.status === 'disputed' && (
                    <span style={{ color: 'var(--sev-warning)', fontSize: 11 }} data-testid={`spec-disputed-${i}`}>
                      {' '}· المصادر مختلفة: {sp.disagreementAr}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <p style={{ margin: '11px 0 0', fontSize: 11, color: 'var(--text-dimmer)', lineHeight: 1.85 }}>
            المواصفات منقولة عن وثائق الشركة الصانعة بتاريخ التحقّق المذكور في كل
            مصدر. زمن الطيران وما شابهه تقديري ويختلف باختلاف البطارية وأسلوب الطيران.
          </p>
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

      <Related titleAr="أو هذا بدلاً منه" products={alternatives} testId="product-alternatives"
        noteAr="خيارات هذا القسم الأخرى. اختلافها في الموضع لا في الجودة." />

      {/*
        «ستحتاج أيضاً», not «متوافق مع».
        The links point at each section's entry-level option because that is a
        CATEGORY-level need — «a drone needs a battery» — and never a claim that
        this exact battery fits this exact bay. This shop does not have the data
        to make that claim, and the caveat under each link says what the buyer
        must check themselves.
      */}
      <Related titleAr="ستحتاج أيضاً" products={completes} testId="product-completes"
        noteAr="هذه احتياجات عامة لهذا النوع، لا قائمة توافق. تحقّق من التفاصيل أدناه قبل الشراء."
        caveats={completes.map(c => NEED_CAVEAT_AR[c.categoryId]).filter(Boolean)} />

      <Related titleAr="مرتبط" products={related} testId="product-related" />

      {/* The promise, only where it is true. A banner offering free setup on a
          spare propeller is a promise somebody has to explain their way out of
          later — see `freeSetupEligible` on the variant. */}
      {product.variants.some(v => v.freeSetupEligible) && (
        <StoreBanner settings={settings} compact />
      )}

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
        color: tone === 'warn' ? 'var(--sev-warning)' : 'var(--text-dimmer)',
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
  titleAr: string;
  products: StoreProduct[];
  testId: string;
  /** What the group means, so a link is not read as more than it claims. */
  noteAr?: string;
  /** Per-section warnings — voltage, connector, video system. */
  caveats?: string[];
}> = ({ titleAr, products, testId, noteAr, caveats }) => {
  if (products.length === 0) return null;
  const unique = [...new Set(caveats ?? [])];
  return (
    <section className="admin-section" aria-labelledby={`rel-${testId}`}>
      <h2 id={`rel-${testId}`}>{titleAr}</h2>
      {noteAr && (
        <p style={{ margin: '0 0 11px', fontSize: 11.5, color: 'var(--text-dimmer)', lineHeight: 1.9 }}>
          {noteAr}
        </p>
      )}
      <div data-testid={testId} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {products.map(p => (
          <Link key={p.id} href={productHref(p.id)} className="btn-ghost"
            data-testid={`${testId}-${p.id}`}>
            <span className="ltr">{p.nameEn}</span>
          </Link>
        ))}
      </div>
      {unique.length > 0 && (
        <ul data-testid={`${testId}-caveats`}
          style={{ margin: '11px 0 0', paddingInlineStart: 20, display: 'grid', gap: 5 }}>
          {unique.map((c, i) => (
            <li key={i} style={{ fontSize: 11.5, color: 'var(--sev-warning)', lineHeight: 1.9 }}>{c}</li>
          ))}
        </ul>
      )}
    </section>
  );
};
