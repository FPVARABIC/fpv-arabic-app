import Link from 'next/link';
import type { Metadata } from 'next';
import { kbTerms } from '@core/data/kb/glossary/terms';
import { href } from '@/lib/webRoutes';

export const metadata: Metadata = {
  title: 'القاموس',
  description:
    'قاموس مصطلحات الطيران بالمنظور الأول: المصطلح بالعربية، واسمه الإنجليزي كما يظهر '
    + 'داخل البرامج، وتعريف مبسّط وآخر تقني.',
  alternates: { canonical: '/glossary' },
};

/**
 * The glossary.
 *
 * Every term, its Arabic name, and the English form it actually carries inside
 * Betaflight or a manufacturer's menu. Keeping the Latin name visible is an
 * editorial rule from the shared terminology standard, not a style choice: a
 * reader looking at an English configurator needs the string that is on their
 * screen, and translating it away would make the glossary useless at the exact
 * moment it is needed.
 *
 * Grouped by domain and rendered as static HTML — the whole page is indexable,
 * which matters because a term definition is one of the most-searched kinds of
 * page a technical site has.
 */

const DOMAIN_LABEL_AR: Record<string, string> = {
  'flight-controller': 'متحكم الطيران',
  motors: 'المحركات',
  propellers: 'المراوح',
  esc: 'منظّم السرعة',
  'power-battery': 'الطاقة والبطاريات',
  'radio-control': 'التحكم اللاسلكي',
  video: 'نظام الفيديو',
  'navigation-sensors': 'الملاحة والحساسات',
  frames: 'الهياكل',
  electrical: 'الكهرباء',
  tuning: 'الضبط',
  safety: 'السلامة',
  betaflight: 'Betaflight',
};

export default function GlossaryPage() {
  const domains = [...new Set(kbTerms.map(t => t.domain))].sort((a, b) =>
    (DOMAIN_LABEL_AR[a] ?? a).localeCompare(DOMAIN_LABEL_AR[b] ?? b, 'ar'));

  return (
    <div className="shell" style={{ paddingTop: 36, paddingBottom: 20 }}>
      <nav aria-label="مسار التنقّل" style={{ fontSize: 12.5, color: 'var(--text-dimmer)' }}>
        <Link href="/">الرئيسية</Link> <span aria-hidden>/</span> القاموس
      </nav>

      <h1 className="page-title" style={{ margin: '14px 0 0' }}>القاموس</h1>

      <nav aria-label="المجالات" style={{ marginTop: 22 }}>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {domains.map(d => (
            <li key={d}>
              <a
                href={`#domain-${d}`}
                className="card-sm"
                style={{ display: 'inline-block', padding: '6px 13px', fontSize: 12.5, color: 'var(--text-dim)' }}
              >
                {DOMAIN_LABEL_AR[d] ?? d}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {domains.map(d => {
        const terms = kbTerms
          .filter(t => t.domain === d)
          .sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));
        return (
          <section
            key={d}
            id={`domain-${d}`}
            data-testid={`glossary-domain-${d}`}
            style={{ marginTop: 40, scrollMarginTop: 80 }}
          >
            <h2
              style={{
                fontSize: 20, fontWeight: 900, margin: '0 0 16px',
                paddingBottom: 8, borderBottom: '1px solid var(--border-soft)',
              }}
            >
              {DOMAIN_LABEL_AR[d] ?? d}{' '}
              <span style={{ fontSize: 13, color: 'var(--text-dimmer)', fontWeight: 700 }} dir="ltr">
                ({terms.length})
              </span>
            </h2>
            <div
              style={{
                display: 'grid', gap: 12,
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))',
              }}
            >
              {terms.map(t => (
                <article
                  key={t.id}
                  id={`term-${t.id}`}
                  className="card-sm"
                  data-testid={`glossary-term-${t.id}`}
                  style={{ padding: '15px 17px', scrollMarginTop: 80 }}
                >
                  <h3 style={{ fontSize: 15, fontWeight: 900, margin: 0 }}>
                    {t.ar}
                    <span className="ltr" style={{ fontSize: 12, color: 'var(--accent-ink)', marginInlineStart: 9, fontWeight: 700 }}>
                      {t.en}
                    </span>
                    {t.abbr && (
                      <span className="ltr" style={{ fontSize: 11, color: 'var(--text-dimmer)', marginInlineStart: 7 }}>
                        {t.abbr}
                      </span>
                    )}
                  </h3>
                  <p style={{ fontSize: 13.5, color: 'var(--text-dim)', margin: '9px 0 0', lineHeight: 1.9 }}>
                    {t.short}
                  </p>
                  {t.technical && (
                    <p style={{ fontSize: 12.5, color: 'var(--text-dimmer)', margin: '8px 0 0', lineHeight: 1.85 }}>
                      {t.technical}
                    </p>
                  )}
                  {t.confusedWith.length > 0 && (
                    <p style={{ fontSize: 12, color: 'var(--sev-warning)', margin: '9px 0 0', lineHeight: 1.8 }}>
                      يُخلَط مع: {t.confusedWith.map(c => c.note).join(' · ')}
                    </p>
                  )}
                  {t.articleIds.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {t.articleIds.slice(0, 3).map(id => {
                        const to = href({ kind: 'article', id });
                        return to ? (
                          <li key={id}>
                            <Link href={to} style={{ fontSize: 11.5, color: 'var(--accent-ink)' }}>
                              اقرأ أكثر ←
                            </Link>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
