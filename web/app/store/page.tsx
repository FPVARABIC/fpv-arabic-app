import Link from 'next/link';
import type { Metadata } from 'next';
import { STORE_GROUP_LABEL_AR, STORE_GROUP_BLURB_AR } from '@core/data/store/categories';
import { SERVICES_CATEGORY_ID } from '@core/data/store/services';
import { categoriesInGroup, categoryHref } from '@/lib/store';
import { publishedProducts, sectionCounts } from '@/lib/server/storeCatalogue';
import { STORE_OPENING_SOON } from '@/lib/launchFlags';
import { StoreBanner } from '@/components/store/StorePieces';
import { publicStoreSettings } from '@/lib/server/storeSettings';

export const metadata: Metadata = {
  title: 'المتجر',
  description:
    'متجر FPVARABIC: عدد صغير من المنتجات المختارة في كل قسم، بفارق واضح بينها، '
    + 'ومع كل طلب خدمة الإعداد التي نشرحها في الموسوعة.',
  alternates: { canonical: '/store' },
  openGraph: { type: 'website', title: 'متجر FPVARABIC' },
};

/** See the note on the section page: on-demand revalidation with a floor. */
export const revalidate = 300;

/**
 * The storefront.
 *
 * WHAT MAKES IT DIFFERENT FROM THE SHOPS IT COMPETES WITH
 * -------------------------------------------------------
 * Three to five products per section, chosen to span a real decision, and every
 * section says what to READ before choosing. The large FPV shops sort by part
 * type because that is how a supplier's spreadsheet is sorted; the result is a
 * beginner facing four hundred motors with no way in. Curation is not a smaller
 * catalogue — it is the shop doing the reader's first hour of work for them.
 *
 * WHY AIRCRAFT COME FIRST AND COMPONENTS SECOND
 * ---------------------------------------------
 * Someone who does not know what they need should be able to buy the right
 * aircraft without ever opening a component section. Someone who does know
 * should not have to scroll past aircraft to reach a receiver. Two groups, in
 * that order, answers both.
 */
export default async function StorePage() {
  const settings = await publicStoreSettings();
  const aircraft = categoriesInGroup('aircraft');
  const components = categoriesInGroup('components');

  // Counted from the merged catalogue, so a section the admin emptied says
  // «لا خيارات» rather than advertising four products that are all hidden.
  // Counted through `selectCategory`, so the number on the card is the number
  // of cards the section actually renders — including the products that belong
  // to it as a use case rather than by their own categoryId.
  const [published, counts] = await Promise.all([publishedProducts(), sectionCounts()]);
  // PRODUCTS, not everything published. The services are ours and are always
  // live — counting them here would have the storefront announce «7 منتجاً
  // مختاراً» while every product section stood empty, which is a true number
  // answering a question nobody asked.
  const total = published.filter(p => p.categoryId !== SERVICES_CATEGORY_ID).length;
  const countIn = (categoryId: string) => counts[categoryId] ?? 0;
  // Nothing published yet is a real state and the page says so rather than
  // rendering a grid of «0 خيارات». See the note on the section page: we would
  // rather look unfinished than look finished and not be.
  const stocking = total === 0;

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1100 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> المتجر
      </nav>

      <header style={{ margin: '14px 0 18px' }}>
        <h1 className="page-title" style={{ margin: 0 }}>المتجر</h1>
        {STORE_OPENING_SOON && (
          <p role="note" data-testid="store-opening-soon" className="card-sm" style={{
            marginTop: 12, padding: '11px 14px', fontSize: 13, lineHeight: 1.9,
            color: 'var(--sev-warning)', border: '1px solid rgba(138, 90, 0, 0.25)',
          }}>
            <strong>المتجر يفتتح قريباً.</strong>{' '}
            يمكنك تصفح المنتجات والمعلومات الآن، وسيتم تفعيل الطلب والدفع لاحقاً.
          </p>
        )}
      </header>

      {/* The truthful state of the shop, before anything else on the page.
          Every product is chosen and described; none has cleared the licensing
          gate yet, and pretending otherwise is the one thing this shop will not
          do. A reader who is told plainly comes back. */}
      {stocking && (
        <div className="card-sm" data-testid="store-stocking"
          style={{ padding: '17px 19px', marginBottom: 18, borderColor: 'rgba(252,211,77,0.35)' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 900, color: 'var(--sev-warning)' }}>
            المتجر قيد التجهيز
          </p>
          <p style={{ margin: '9px 0 0', fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 2 }}>
            الأقسام والمنتجات مختارة، والمواصفات تُنقل الآن عن وثائق الشركات الصانعة
            مع تسجيل مصدر كل رقم وتاريخ التحقّق منه. لا يُعرَض منتج للبيع قبل أن تكتمل
            له صورة نملك حق استخدامها، ومواصفات موثّقة، وسعر محسوب من تكلفة مسجَّلة
            لدى مورد. تصفّح الأقسام لترى ما اخترناه.
          </p>
        </div>
      )}

      <StoreBanner settings={settings} />

      <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '16px 0 0' }}>
        <span dir="ltr">{aircraft.length + components.length}</span> قسماً،
        و<span dir="ltr">{total}</span> منتجاً مختاراً. {settings.shippingNoteAr}
      </p>

      {([
        ['aircraft', aircraft] as const,
        ['components', components] as const,
      ]).map(([group, cats]) => (
        <section key={group} className="admin-section" aria-labelledby={`g-${group}`}>
          <h2 id={`g-${group}`}>{STORE_GROUP_LABEL_AR[group]}</h2>
          <p style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '0 0 14px', lineHeight: 1.95 }}>
            {STORE_GROUP_BLURB_AR[group]}
          </p>

          <div style={{ display: 'grid', gap: 11, gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))' }}>
            {cats.map(c => {
              const n = countIn(c.id);
              return (
                <Link key={c.id} href={categoryHref(c.id)} className="card-sm"
                  data-testid={`store-category-${c.id}`}
                  style={{ display: 'block', padding: '14px 16px', minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14.5, fontWeight: 900 }}>{c.titleAr}</span>
                    <span className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                      {c.titleEn}
                    </span>
                  </span>
                  <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-dim)', marginTop: 7, lineHeight: 1.9 }}>
                    {c.blurbAr}
                  </span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-dimmer)', marginTop: 9 }}>
                    {/* «0 خيارات مختارة» is a sentence that tells a reader the
                        section was abandoned. It was not — the products are
                        chosen and waiting on image rights, and the card says
                        that instead. */}
                    {n === 0
                      ? <span style={{ color: 'var(--sev-warning)' }}>قيد التجهيز</span>
                      : <>
                        <span dir="ltr">{n}</span> {n === 1 ? 'خيار' : 'خيارات'} مختارة
                      </>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {settings.regulatoryNoteAr && (
        <p className="card-sm" data-testid="store-regulatory"
          style={{ padding: '13px 15px', marginTop: 28, fontSize: 12.5, color: 'var(--text-dim)', lineHeight: 1.95 }}>
          {settings.regulatoryNoteAr}
        </p>
      )}
    </div>
  );
}
