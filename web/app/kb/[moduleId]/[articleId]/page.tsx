import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  allKbModules, getArticle, getModule, articleNeighbours,
} from '@core/data/kb/registry';
import { KB_LAYER_ORDER, KB_LAYER_LABEL_AR, type KbLayerId } from '@core/data/kb/types';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { BlockRenderer } from '@/components/kb/BlockRenderer';
import { href, isSafeExternalUrl } from '@/lib/webRoutes';
import { ContentLink } from '@/components/ContentLink';

/**
 * One article — the deepest public page on the site, and the one SEO cares
 * about most.
 *
 * WHAT THE DESKTOP LAYOUT ADDS
 * ----------------------------
 * The phone shows one layer at a time in a 390px column. Here the layers are
 * stacked as real `<section>`s with a sticky table of contents beside them, so
 * a reader can see the article's shape before reading it and jump within it.
 * That is the requirement's «فهرس مقال» — and it costs nothing in content,
 * because the layers already exist in the data.
 *
 * WHAT IT DOES NOT ADD
 * --------------------
 * Not one word. Every paragraph, list, table, warning, source and link comes
 * from `getArticle(id)` in the shared core. There is no web copy of any article
 * anywhere in this repository, and `scripts/testWebCore.ts` asserts it.
 *
 * SOURCES ARE PART OF THE PAGE, NOT A FOOTNOTE
 * --------------------------------------------
 * Every article renders its sources with their version and review date, because
 * that is the platform's central editorial promise. It is also, incidentally,
 * exactly what a search engine needs to treat the page as authoritative.
 */

export function generateStaticParams() {
  return allKbModules.flatMap(m =>
    m.articles.map(a => ({ moduleId: m.id, articleId: a.id })));
}

export async function generateMetadata(
  { params }: { params: Promise<{ moduleId: string; articleId: string }> },
): Promise<Metadata> {
  const { moduleId, articleId } = await params;
  const a = getArticle(articleId);
  if (!a || a.moduleId !== moduleId) return { title: 'غير موجود' };
  return {
    title: a.titleAr,
    description: a.summaryAr,
    keywords: [...a.keywordsAr, ...a.keywordsEn],
    alternates: { canonical: href({ kind: 'article', id: a.id }) ?? undefined },
    openGraph: {
      type: 'article',
      title: `${a.titleAr} — FPVARABIC`,
      description: a.summaryAr,
      modifiedTime: a.lastReviewed,
    },
  };
}

export default async function ArticlePage(
  { params }: { params: Promise<{ moduleId: string; articleId: string }> },
) {
  const { moduleId, articleId } = await params;
  const a = getArticle(articleId);
  // The module segment must agree with the article's real owner, so a
  // hand-edited URL cannot render an article under a module it does not belong
  // to — that would create a second, duplicate URL for one piece of content.
  if (!a || a.moduleId !== moduleId) notFound();

  const m = getModule(a.moduleId);
  const { prev, next } = articleNeighbours(a.id);
  const layers = KB_LAYER_ORDER.filter(l => (a.layers[l]?.length ?? 0) > 0);
  const moduleHref = href({ kind: 'module', id: a.moduleId });
  const terms = a.glossaryIds
    .map(id => kbTerms.find(t => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  /**
   * Structured data — an article with a review date and named sources is
   * exactly what `TechArticle` describes. Emitted only for real values; no
   * invented author, publisher logo or rating.
   */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: a.titleAr,
    description: a.summaryAr,
    inLanguage: 'ar',
    dateModified: a.lastReviewed,
    keywords: [...a.keywordsAr, ...a.keywordsEn].join(', '),
    isPartOf: { '@type': 'Collection', name: m?.titleAr ?? 'الموسوعة' },
    citation: a.sources.map(s => ({
      '@type': 'CreativeWork',
      name: s.title,
      ...(s.url ? { url: s.url } : {}),
      version: s.version,
    })),
  };

  return (
    <div className="shell" style={{ paddingTop: 32, paddingBottom: 20 }}>
      <script
        type="application/ld+json"
        // Serialised from values authored in this repository, never from user
        // input, and `<` is escaped so the JSON can never close the tag early.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />

      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span>{' '}
        <Link href="/kb">الموسوعة</Link> <span aria-hidden>/</span>{' '}
        <Link href={moduleHref ?? '/kb'}>{m?.titleAr ?? a.moduleId}</Link>{' '}
        <span aria-hidden>/</span> {a.titleAr}
      </nav>

      <div
        style={{
          display: 'grid', gap: 34, marginTop: 18,
          gridTemplateColumns: 'minmax(0, 1fr) 250px',
          alignItems: 'start',
        }}
      >
        {/* ── The article ───────────────────────────────────────────────── */}
        <article style={{ minWidth: 0, maxWidth: 780 }}>
          <header>
            <h1 style={{ fontSize: 30, fontWeight: 900, margin: 0, lineHeight: 1.45 }}>
              {a.titleAr}
            </h1>
            {a.titleEn && (
              <p className="ltr" style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '6px 0 0' }}>
                {a.titleEn}
              </p>
            )}
            <p style={{ fontSize: 16, color: 'var(--text-dim)', margin: '14px 0 0', lineHeight: 2 }}>
              {a.summaryAr}
            </p>
            <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '12px 0 0' }}>
              روجع {a.lastReviewed} · {a.reviewStatus === 'reviewed' ? 'مُراجَع' : 'مسوّدة'}
            </p>
          </header>

          {a.objectives.length > 0 && (
            <section className="card" style={{ padding: '16px 18px', marginTop: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 900, margin: '0 0 10px' }}>
                ماذا ستعرف بعد هذا المقال
              </h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
                {a.objectives.map((o, i) => (
                  <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                    <span
                      aria-hidden
                      style={{
                        width: 5, height: 5, borderRadius: 999, background: 'var(--accent-ink)',
                        marginTop: 10, flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>{o}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {layers.map(layer => (
            <section
              key={layer}
              id={`layer-${layer}`}
              data-testid={`article-layer-${layer}`}
              style={{ marginTop: 40, scrollMarginTop: 80 }}
            >
              <h2
                style={{
                  fontSize: 20, fontWeight: 900, margin: '0 0 16px',
                  paddingBottom: 9, borderBottom: '1px solid var(--border-soft)',
                }}
              >
                {KB_LAYER_LABEL_AR[layer as KbLayerId]}
              </h2>
              <BlockRenderer blocks={a.layers[layer]!} />
            </section>
          ))}

          {a.links.length > 0 && (
            <section style={{ marginTop: 40 }} aria-labelledby="links-h">
              <h2 id="links-h" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>
                اذهب من هنا
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {/* Content never carries a path. The route is derived — but by
                    the WEB adapter, which knows that lessons, the assembly flow,
                    the roadmap and the checklists exist only in the app and says
                    so, instead of linking to routes this surface lacks. */}
                {a.links.map((l, i) => (
                  <ContentLink key={`${l.kind}-${l.targetId ?? i}`} link={l} testIdPrefix="article-link" index={i} />
                ))}
              </ul>
            </section>
          )}

          <section style={{ marginTop: 40 }} aria-labelledby="sources-h">
            <h2 id="sources-h" style={{ fontSize: 20, fontWeight: 900, margin: '0 0 14px' }}>
              المصادر
            </h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {a.sources.map((s, i) => (
                <li key={i} className="card-sm" style={{ padding: '12px 15px' }}>
                  <p style={{ margin: 0, fontSize: 13.5, fontWeight: 700 }}>{s.title}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 11.5, color: 'var(--text-dimmer)' }}>
                    {s.version} · روجِع {s.reviewedAt}
                  </p>
                  {s.url && isSafeExternalUrl(s.url) && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="ltr"
                      style={{ fontSize: 11.5, color: 'var(--accent-ink)', marginTop: 4 }}
                    >
                      {s.url}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <nav
            aria-label="التنقّل بين المقالات"
            style={{ display: 'flex', gap: 12, marginTop: 40 }}
          >
            {prev && href({ kind: 'article', id: prev.id }) && (
              <Link href={href({ kind: 'article', id: prev.id })!} className="card-sm" style={{ flex: 1, padding: '12px 15px' }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)' }}>السابق</span>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{prev.titleAr}</span>
              </Link>
            )}
            {next && href({ kind: 'article', id: next.id }) && (
              <Link href={href({ kind: 'article', id: next.id })!} className="card-sm" style={{ flex: 1, padding: '12px 15px' }}>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dimmer)' }}>التالي</span>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{next.titleAr}</span>
              </Link>
            )}
          </nav>
        </article>

        {/* ── The sticky index — what the wide screen buys ───────────────── */}
        <aside style={{ position: 'sticky', top: 82, display: 'grid', gap: 20 }}>
          <nav aria-labelledby="toc-h" className="card" style={{ padding: '15px 17px' }}>
            <h2 id="toc-h" style={{ fontSize: 13, fontWeight: 900, margin: '0 0 10px' }}>
              محتويات المقال
            </h2>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
              {layers.map(l => (
                <li key={l}>
                  <a href={`#layer-${l}`} style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                    {KB_LAYER_LABEL_AR[l as KbLayerId]}
                  </a>
                </li>
              ))}
              <li>
                <a href="#sources-h" style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>المصادر</a>
              </li>
            </ol>
          </nav>

          {terms.length > 0 && (
            <section aria-labelledby="terms-h" className="card" style={{ padding: '15px 17px' }}>
              <h2 id="terms-h" style={{ fontSize: 13, fontWeight: 900, margin: '0 0 10px' }}>
                مصطلحات هذا المقال
              </h2>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
                {terms.map(t => {
                  const to = href({ kind: 'glossary', id: t.id });
                  return to ? (
                    <li key={t.id}>
                      <Link href={to} style={{ fontSize: 12.5, color: 'var(--text-dim)' }}>
                        {t.ar} <span className="ltr" style={{ color: 'var(--text-dimmer)' }}>{t.en}</span>
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
