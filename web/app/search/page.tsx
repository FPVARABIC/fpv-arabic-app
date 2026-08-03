import Link from 'next/link';
import type { Metadata } from 'next';
import { search } from '@core/data/kb/search/query';
import { SEARCH_TYPE_LABEL_AR } from '@core/data/kb/search/buildIndex';

export const metadata: Metadata = {
  title: 'البحث',
  description: 'ابحث في الموسوعة والمصطلحات والتشخيص وصفحات Betaflight وExpressLRS وEdgeTX والفيديو.',
  alternates: { canonical: '/search' },
  // A results page has no stable content of its own, and indexing every query
  // string produces thousands of near-duplicate pages. The sections it searches
  // are all individually indexed, which is what actually matters.
  robots: { index: false, follow: true },
};

/**
 * Search — the SAME engine, not a second one.
 *
 * `search()` comes straight from the shared core, which means the ranking, the
 * synonym expansion («شاشة سوداء» → the no-image diagnosis), the Arabic
 * normalisation and the type bias are identical to the phone app's. A user who
 * learns what a query does in one place has learned it in both.
 *
 * IT RUNS ON THE SERVER
 * ---------------------
 * The search index is built from the whole encyclopedia, and shipping it to the
 * browser would mean downloading the entire content corpus just to type a
 * query. Running the search server-side keeps the client bundle tiny and makes
 * a shared result URL render its results as real HTML.
 *
 * KNOWLEDGE IS MARKED APART FROM OPINION
 * --------------------------------------
 * Every result carries its type badge. The requirement was explicit that a
 * user's opinion must never be presented as vetted information — community
 * results, when they join this list, will be visually distinct for that reason,
 * and the badge is the mechanism already in place.
 */

export default async function SearchPage(
  { searchParams }: { searchParams: Promise<{ q?: string }> },
) {
  const { q } = await searchParams;
  const query = (q ?? '').trim();
  const hits = query.length >= 2 ? search(query, { limit: 60 }) : [];

  const byType = hits.reduce<Record<string, number>>((acc, h) => {
    acc[h.doc.type] = (acc[h.doc.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20, maxWidth: 900 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>البحث</h1>

      {/* A plain GET form: works with no JavaScript, and the query lands in the
          URL so a result set can be shared or bookmarked. */}
      <form action="/search" method="get" style={{ marginTop: 18 }} role="search">
        <label htmlFor="q" className="sr-only">ابحث في المنصة</label>
        <div style={{ display: 'flex', gap: 9 }}>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="اكتب مصطلحاً أو عرَضاً: «شاشة سوداء»، «Failsafe»، «الصورة تقطع»…"
            data-testid="search-input"
            style={{
              flex: 1, padding: '12px 15px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'var(--surface-2)',
              color: 'var(--text)', fontSize: 14.5, fontFamily: 'inherit',
            }}
          />
          <button type="submit" className="btn-primary">ابحث</button>
        </div>
      </form>

      {query.length >= 2 && (
        <>
          <p
            data-testid="search-count"
            style={{ fontSize: 13, color: 'var(--text-dimmer)', margin: '18px 0 0' }}
          >
            {hits.length === 0
              ? 'لا نتائج — جرّب الاسم الإنجليزي، أو صِف العرَض بكلماتك.'
              : `${hits.length} نتيجة`}
          </p>

          {hits.length > 0 && (
            <ul
              style={{
                listStyle: 'none', margin: '10px 0 0', padding: 0,
                display: 'flex', flexWrap: 'wrap', gap: 6,
              }}
            >
              {Object.entries(byType).map(([t, n]) => (
                <li
                  key={t}
                  className="card-sm"
                  style={{ padding: '4px 11px', fontSize: 11.5, color: 'var(--text-dim)' }}
                >
                  {SEARCH_TYPE_LABEL_AR[t as keyof typeof SEARCH_TYPE_LABEL_AR] ?? t}{' '}
                  <span dir="ltr">({n})</span>
                </li>
              ))}
            </ul>
          )}

          <ol
            data-testid="search-results"
            style={{ listStyle: 'none', margin: '22px 0 0', padding: 0, display: 'grid', gap: 10 }}
          >
            {hits.map(h => (
              <li key={h.doc.key}>
                <Link
                  href={h.doc.route}
                  className="card-sm"
                  data-testid={`search-result-${h.doc.type}-${h.doc.sourceId}`}
                  style={{ display: 'block', padding: '14px 16px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 10.5, fontWeight: 800, color: 'var(--accent)',
                        border: '1px solid var(--border)', borderRadius: 999, padding: '2px 9px',
                      }}
                    >
                      {SEARCH_TYPE_LABEL_AR[h.doc.type] ?? h.doc.type}
                    </span>
                    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>{h.doc.titleAr}</h2>
                  </div>
                  {h.doc.titleEn && (
                    <p className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '4px 0 0' }}>
                      {h.doc.titleEn}
                    </p>
                  )}
                  {h.doc.subtitle && (
                    <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '7px 0 0', lineHeight: 1.8 }}>
                      {h.doc.subtitle}
                    </p>
                  )}
                  {h.doc.version && (
                    <p style={{ fontSize: 11, color: 'var(--text-dimmer)', margin: '7px 0 0' }}>
                      {h.doc.version}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}

      {query.length < 2 && (
        <section style={{ marginTop: 26 }}>
          <h2 style={{ fontSize: 15, fontWeight: 900, margin: '0 0 10px' }}>البحث يصل إلى</h2>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 7 }}>
            {[
              'مقالات الموسوعة ومصطلحات القاموس',
              'أشجار التشخيص — ابحث بالعرَض كما تصفه أنت',
              'صفحات Betaflight وحقولها بأسمائها الإنجليزية',
              'خطوات ExpressLRS ومشكلاته، ومواضيع EdgeTX وإعداداتها',
              'صفحات برامج الفيديو وأدوات الشركات',
            ].map(t => (
              <li key={t} style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.9 }}>
                — {t}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
