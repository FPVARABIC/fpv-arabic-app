import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { STORE_CATEGORIES } from '@core/data/store/categories';
import { CHOICE_POSITION_LABEL_AR } from '@core/data/store/types';
import { storeCategory, publicSettings, categoryHref } from '@/lib/store';
import { publishedInCategory } from '@/lib/server/storeCatalogue';
import { SECTION_ROUTES, webHref } from '@/lib/webRoutes';
import { ProductCard, StoreBanner } from '@/components/store/StorePieces';

export const dynamicParams = false;

/**
 * Rebuilt on demand, and at worst five minutes stale.
 *
 * The admin actions call `revalidatePath` when they change a price or hide a
 * product, so in practice a change is live on the next request. This number is
 * the floor under that — the answer to «what if a revalidate call was lost»,
 * not the mechanism.
 */
export const revalidate = 300;

export function generateStaticParams() {
  return STORE_CATEGORIES.map(c => ({ categoryId: c.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ categoryId: string }> },
): Promise<Metadata> {
  const { categoryId } = await params;
  const c = storeCategory(categoryId);
  if (!c) return { title: 'قسم غير موجود', robots: { index: false, follow: false } };
  return {
    title: `${c.titleAr} — المتجر`,
    description: c.blurbAr,
    alternates: { canonical: categoryHref(c.id) },
    openGraph: { type: 'website', title: `${c.titleAr} — متجر FPV بالعربي`, description: c.blurbAr },
  };
}

/**
 * One section of the shop.
 *
 * THE COMPARISON IS THE PAGE
 * --------------------------
 * A category page in most shops is a grid and a set of filters — useful once
 * you already know what you are looking at, useless before. Here the three to
 * five products are laid out along the section's own axis (economy → middle →
 * professional, or drone-only → with-camera → full combo) and each card says
 * where it sits on it. Someone who cannot yet tell two motors apart can still
 * tell which of these is the cheap one and why.
 *
 * Filters are deliberately absent. A section with four products does not need
 * them, and adding them would be an admission that the curation had failed.
 */
export default async function StoreCategoryPage(
  { params }: { params: Promise<{ categoryId: string }> },
) {
  const { categoryId } = await params;
  const category = storeCategory(categoryId);
  if (!category) notFound();

  // The merged catalogue: seeds with whatever the admin has changed since.
  const products = await publishedInCategory(category.id);
  const settings = publicSettings();
  const learn = category.learnLink
    ? webHref({ kind: category.learnLink.kind, id: category.learnLink.targetId } as Parameters<typeof webHref>[0])
    : null;

  return (
    <div className="shell" style={{ paddingTop: 30, paddingBottom: 46, maxWidth: 1000 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href={SECTION_ROUTES.store}>المتجر</Link> <span aria-hidden>/</span> {category.titleAr}
      </nav>

      <header style={{ margin: '14px 0 6px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, margin: 0 }}>{category.titleAr}</h1>
        <p className="ltr" style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--text-dim)' }}>
          {category.titleEn}
        </p>
      </header>

      <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2, margin: '10px 0 0', maxWidth: 760 }}>
        {category.blurbAr}
      </p>

      {/* The store's one real advantage: it sits on an encyclopedia. */}
      {learn?.href && category.learnLink && (
        <p style={{ margin: '12px 0 0' }}>
          <Link href={learn.href} className="btn-ghost" data-testid="store-category-learn"
            style={{ fontSize: 12.5 }}>
            اقرأ قبل أن تقرّر: {category.learnLink.label} ←
          </Link>
        </p>
      )}

      {/* How to read the row below — the axis, named. */}
      <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '18px 0 10px' }}>
        الخيارات مرتّبة من{' '}
        <strong>{CHOICE_POSITION_LABEL_AR[category.choiceAxis].entry}</strong> إلى{' '}
        <strong>{CHOICE_POSITION_LABEL_AR[category.choiceAxis].pro}</strong>.
      </p>

      <div data-testid="store-products"
        style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        {products.map(p => <ProductCard key={p.id} product={p} axis={category.choiceAxis} />)}
      </div>

      <StoreBanner settings={settings} compact />

      <p style={{ marginTop: 26, fontSize: 13 }}>
        <Link href={SECTION_ROUTES.store} className="btn-ghost">← كل الأقسام</Link>
      </p>
    </div>
  );
}
