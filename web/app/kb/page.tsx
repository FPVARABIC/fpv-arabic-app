import Link from 'next/link';
import type { Metadata } from 'next';
import { allKbModules } from '@core/data/kb/registry';
import { href } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'الموسوعة',
  description:
    'موسوعة الطيران بالمنظور الأول بالعربية: منظومات مشروحة من المبدأ إلى العطل، '
    + 'بمصادر رسمية وإصداراتها وتواريخ مراجعتها.',
  alternates: { canonical: '/kb' },
};

/**
 * The encyclopedia index.
 *
 * Rendered entirely from `allKbModules` — there is no hand-maintained list of
 * sections here. Registering a module in the shared core is the only step
 * needed for it to appear on the web, which is what "one core, two surfaces"
 * has to mean in practice rather than in principle.
 */
export default function KbIndexPage() {
  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> الموسوعة
      </nav>

      <h1 className="page-title" style={{ margin: '14px 0 0' }}>الموسوعة</h1>

      <div
        style={{
          display: 'grid', gap: 16, marginTop: 18,
          gridTemplateColumns: 'repeat(auto-fill, minmax(min(330px, 100%), 1fr))',
        }}
      >
        {allKbModules.map(m => {
          const to = href({ kind: 'module', id: m.id });
          if (!to) return null;
          return (
            <article key={m.id} className="card card-link" style={{ padding: '20px 22px' }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>
                <Link href={to} data-testid={`kb-module-${m.id}`}>{m.titleAr}</Link>
              </h2>
              <p className="ltr" style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '4px 0 0' }}>
                {m.titleEn}
              </p>
              <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '11px 0 0', lineHeight: 1.9 }}>
                {m.summaryAr}
              </p>

              <ul
                style={{
                  listStyle: 'none', margin: '14px 0 0', padding: 0,
                  display: 'flex', flexWrap: 'wrap', gap: 6,
                }}
              >
                {m.articles.slice(0, 4).map(a => {
                  const at = href({ kind: 'article', id: a.id });
                  return at ? (
                    <li key={a.id}>
                      <Link
                        href={at}
                        className="card-sm card-link"
                        style={{ display: 'inline-block', padding: '5px 11px', fontSize: 12, color: 'var(--text-dim)' }}
                      >
                        {a.titleAr}
                      </Link>
                    </li>
                  ) : null;
                })}
                {m.articles.length > 4 && (
                  <li style={{ fontSize: 12, color: 'var(--text-dimmer)', alignSelf: 'center' }}>
                    +{m.articles.length - 4}
                  </li>
                )}
              </ul>

              <p style={{ fontSize: 11.5, color: 'var(--text-dimmer)', margin: '14px 0 0' }}>
                {m.articles.length} مقالاً · {m.paths?.length ?? 0} مسار · روجعت {m.lastReviewed}
              </p>
            </article>
          );
        })}
      </div>

    </div>
  );
}
