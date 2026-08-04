import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { allKbModules, getModule, moduleArticles } from '@core/data/kb/registry';
import { dxTreesForModule } from '@core/data/kb/diagnostics/trees';
import { href } from '@/lib/webRoutes';

/**
 * One knowledge module.
 *
 * `generateStaticParams` prerenders every module at build time, so these pages
 * are static HTML a crawler can read with no JavaScript — which is the whole
 * reason the web surface is Next rather than a second Vite SPA.
 *
 * The learning paths and the diagnostic trees are both pulled from the shared
 * core. Nothing about which article belongs to which path, or which tree belongs
 * to which module, is decided here.
 */

export function generateStaticParams() {
  return allKbModules.map(m => ({ moduleId: m.id }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ moduleId: string }> },
): Promise<Metadata> {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  if (!m) return { title: 'غير موجود' };
  return {
    title: m.titleAr,
    description: m.summaryAr,
    alternates: { canonical: href({ kind: 'module', id: m.id }) ?? undefined },
    openGraph: { title: `${m.titleAr} — FPVARABIC`, description: m.summaryAr, type: 'article' },
  };
}

export default async function ModulePage(
  { params }: { params: Promise<{ moduleId: string }> },
) {
  const { moduleId } = await params;
  const m = getModule(moduleId);
  // A real 404 rather than an empty shell — a stale link must say so.
  if (!m) notFound();

  const articles = moduleArticles(m.id);
  const trees = dxTreesForModule(m.id);

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/kb">الموسوعة</Link> <span aria-hidden>/</span> {m.titleAr}
      </nav>

      <header style={{ marginTop: 14 }} className="prose">
        <h1 className="page-title" style={{ fontSize: 30 }}>{m.titleAr}</h1>
        <p className="ltr" style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '5px 0 0' }}>
          {m.titleEn}
        </p>
        <p style={{ fontSize: 15.5, color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 2 }}>
          {m.summaryAr}
        </p>
      </header>

      {/* Two columns on desktop: the articles, and the paths beside them.
          `kb-cols` rather than an inline grid — the inline version had no
          breakpoint, so on a 390px phone the article list and the sidebar were
          squeezed side by side into two unreadable columns. */}
      <div className="kb-cols">
        <section aria-labelledby="articles-h">
          <h2 id="articles-h" style={{ fontSize: 19, fontWeight: 900, margin: '0 0 14px' }}>
            المقالات <span style={{ color: 'var(--text-dimmer)', fontWeight: 700 }} dir="ltr">({articles.length})</span>
          </h2>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {articles.map(a => {
              const to = href({ kind: 'article', id: a.id });
              if (!to) return null;
              return (
                <li key={a.id}>
                  <Link
                    href={to}
                    className="card-sm"
                    data-testid={`kb-article-${a.id}`}
                    style={{ display: 'block', padding: '15px 17px' }}
                  >
                    <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: 0 }}>{a.titleAr}</h3>
                    <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.85 }}>
                      {a.summaryAr}
                    </p>
                    <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '9px 0 0' }}>
                      روجع {a.lastReviewed} · {a.sources.length} مصدراً
                    </p>
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>

        <aside style={{ display: 'grid', gap: 22, position: 'sticky', top: 82 }}>
          {(m.paths?.length ?? 0) > 0 && (
            <section aria-labelledby="paths-h" className="card" style={{ padding: '17px 19px' }}>
              <h2 id="paths-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>
                مسارات التعلّم
              </h2>
              <div style={{ display: 'grid', gap: 14 }}>
                {m.paths.map(p => (
                  <div key={p.id}>
                    <h3 style={{ fontSize: 13.5, fontWeight: 800, margin: 0 }}>{p.titleAr}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-dimmer)', margin: '4px 0 0', lineHeight: 1.8 }}>
                      {p.audienceAr}
                    </p>
                    <ol
                      style={{
                        margin: '8px 0 0', paddingInlineStart: 18, display: 'grid', gap: 4,
                      }}
                    >
                      {p.articleIds.map(id => {
                        const to = href({ kind: 'article', id });
                        return to ? (
                          <li key={id} style={{ fontSize: 12.5 }}>
                            <Link href={to} style={{ color: 'var(--text-dim)' }}>
                              {articles.find(a => a.id === id)?.titleAr ?? id}
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          )}

          {trees.length > 0 && (
            <section aria-labelledby="dx-h" className="card" style={{ padding: '17px 19px' }}>
              <h2 id="dx-h" style={{ fontSize: 15, fontWeight: 900, margin: '0 0 12px' }}>
                تشخيص أعطال هذه المنظومة
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {trees.map(t => {
                  const to = href({ kind: 'dx', id: t.id });
                  return to ? (
                    <li key={t.id}>
                      <Link href={to} style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                        {t.titleAr}
                      </Link>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
